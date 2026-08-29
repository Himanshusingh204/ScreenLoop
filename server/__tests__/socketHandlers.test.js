// socketHandlers.test.js — handler-level validation, gender pass-through,
// rate limiting, and room lifecycle error messages.
const { registerHandlers } = require('../src/socketHandlers');
const { createRoom, joinRoom, MAX_PARTICIPANTS } = require('../src/roomManager');

/** Build a minimal fake Socket that records what the handlers emit. */
function makeSocket(id, address) {
  const handlers = new Map();
  const socket = {
    id,
    handshake: { address: address || `127.0.0.${Math.floor(Math.random() * 200) + 1}` },
    emits: [],
    roomBroadcasts: [],
    joinedRooms: [],
    on(event, fn) { handlers.set(event, fn); },
    emit(event, payload) { socket.emits.push({ event, payload }); },
    join(roomId) { socket.joinedRooms.push(roomId); },
    to(roomId) {
      return {
        emit: (event, payload) => socket.roomBroadcasts.push({ roomId, event, payload }),
      };
    },
  };
  socket.handlers = handlers;
  return socket;
}

/** Build a minimal fake io.Server. */
function makeIo() {
  const toBroadcasts = [];
  const io = {
    to: (targetId) => ({
      emit: (event, payload) => toBroadcasts.push({ targetId, event, payload }),
    }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
    toBroadcasts,
  };
  return io;
}

/** Invoke a registered handler on a fake socket. */
function invoke(socket, event, payload) {
  const fn = socket.handlers.get(event);
  if (!fn) throw new Error(`No handler registered for "${event}"`);
  fn(payload);
}

describe('room:create', () => {
  it('creates a room and emits room:joined for the host', () => {
    const socket = makeSocket('host-1', '10.0.0.1');
    const io = makeIo();
    registerHandlers(socket, io);

    invoke(socket, 'room:create', { roomId: 'myroom', name: 'Host', gender: 'female' });

    const joined = socket.emits.find((e) => e.event === 'room:joined');
    expect(joined).toBeTruthy();
    expect(joined.payload.isHost).toBe(true);
    expect(joined.payload.hostOnlyControls).toBe(false);
    expect(joined.payload.participants[0].gender).toBe('female');
    expect(socket.joinedRooms).toContain('myroom');
  });

  it('rejects a roomId with special characters', () => {
    const socket = makeSocket('host-1', '10.0.0.2');
    registerHandlers(socket, makeIo());

    invoke(socket, 'room:create', { roomId: 'bad room!', name: 'Host' });
    expect(socket.emits).toHaveLength(0);
  });

  it('rejects an over-length roomId', () => {
    const socket = makeSocket('host-1', '10.0.0.3');
    registerHandlers(socket, makeIo());

    invoke(socket, 'room:create', { roomId: 'x'.repeat(21), name: 'Host' });
    expect(socket.emits).toHaveLength(0);
  });

  it('rejects a missing name', () => {
    const socket = makeSocket('host-1', '10.0.0.4');
    registerHandlers(socket, makeIo());

    invoke(socket, 'room:create', { roomId: 'validroom', name: '' });
    expect(socket.emits).toHaveLength(0);
  });

  it('rejects a duplicate roomId', () => {
    const first = makeSocket('host-1', '10.0.0.5');
    const second = makeSocket('host-2', '10.0.0.6');
    const io = makeIo();
    registerHandlers(first, io);
    registerHandlers(second, io);

    invoke(first, 'room:create', { roomId: 'dup', name: 'Host A' });
    invoke(second, 'room:create', { roomId: 'dup', name: 'Host B' });

    const err = second.emits.find((e) => e.event === 'room:error');
    expect(err.payload.message).toBe('Room already exists.');
  });

  it('rate-limits rapid room creation per IP', () => {
    const socket = makeSocket('host-1', '10.0.0.7');
    registerHandlers(socket, makeIo());

    for (let i = 0; i < 20; i++) {
      invoke(socket, 'room:create', { roomId: `spam-${i}`, name: 'Spam' });
    }
    invoke(socket, 'room:create', { roomId: 'spam-21', name: 'Spam' });

    const err = socket.emits.find((e) => e.event === 'room:error');
    expect(err).toBeTruthy();
    expect(err.payload.message).toContain('Too many requests');
  });
});

describe('room:join', () => {
  it('joins a room, emits room:joined, and triggers a host offer', () => {
    const host = makeSocket('host-1', '10.0.1.1');
    const viewer = makeSocket('viewer-1', '10.0.1.2');
    const io = makeIo();
    registerHandlers(host, io);
    registerHandlers(viewer, io);

    invoke(host, 'room:create', { roomId: 'join-room', name: 'Host' });
    host.emits = [];
    invoke(viewer, 'room:join', { roomId: 'join-room', name: 'Viewer', gender: 'male' });

    const joined = viewer.emits.find((e) => e.event === 'room:joined');
    expect(joined.payload.isHost).toBe(false);
    expect(joined.payload.hostId).toBe('host-1');
    expect(joined.payload.participants.find((p) => p.socketId === 'viewer-1').gender).toBe('male');
    expect(viewer.roomBroadcasts.some((b) => b.event === 'room:user-joined')).toBe(true);
    expect(io.toBroadcasts.some((b) => b.event === 'webrtc:initiate' && b.targetId === 'host-1')).toBe(true);
  });

  it('rejects an invalid roomId format', () => {
    const viewer = makeSocket('viewer-1', '10.0.1.3');
    registerHandlers(viewer, makeIo());

    invoke(viewer, 'room:join', { roomId: 'bad room!', name: 'Viewer' });
    expect(viewer.emits).toHaveLength(0);
  });

  it('reports a missing room', () => {
    const viewer = makeSocket('viewer-1', '10.0.1.4');
    registerHandlers(viewer, makeIo());

    invoke(viewer, 'room:join', { roomId: 'nope', name: 'Viewer' });

    const err = viewer.emits.find((e) => e.event === 'room:error');
    expect(err.payload.message).toBe('Room not found. Check the link and try again.');
  });

  it('rejects an incorrect PIN', () => {
    const host = makeSocket('host-1', '10.0.1.5');
    const viewer = makeSocket('viewer-1', '10.0.1.6');
    const io = makeIo();
    registerHandlers(host, io);
    registerHandlers(viewer, io);

    invoke(host, 'room:create', { roomId: 'pin-room', name: 'Host', pin: '1234' });
    invoke(viewer, 'room:join', { roomId: 'pin-room', name: 'Viewer', pin: '9999' });

    const err = viewer.emits.find((e) => e.event === 'room:error');
    expect(err.payload.message).toBe('Incorrect PIN');
  });

  it('reports a full room with the participant count', () => {
    const room = createRoom('full-room', 'host-1', 'Host');
    for (let i = 0; i < MAX_PARTICIPANTS - 1; i++) {
      joinRoom('full-room', `viewer-${i}`, `Viewer ${i}`);
    }
    expect(room.participants.size).toBe(MAX_PARTICIPANTS);

    const viewer = makeSocket('viewer-late', '10.0.1.7');
    registerHandlers(viewer, makeIo());

    invoke(viewer, 'room:join', { roomId: 'full-room', name: 'Late Viewer' });

    const err = viewer.emits.find((e) => e.event === 'room:error');
    expect(err.payload.message).toBe(`Room is full (${MAX_PARTICIPANTS}/${MAX_PARTICIPANTS}). Try again later.`);
  });
});