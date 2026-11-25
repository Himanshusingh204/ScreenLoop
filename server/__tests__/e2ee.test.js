// Media-E2EE key relay: the server only forwards wrapped keys; it never sees a media key.
const { registerHandlers } = require('../src/socketHandlers');
const { getParticipants } = require('../src/roomManager');

function makeSocket(id, address) {
  const handlers = new Map();
  const socket = {
    id,
    data: {},
    handshake: { address },
    emits: [],
    roomBroadcasts: [],
    on(event, fn) { handlers.set(event, fn); },
    emit(event, payload) { socket.emits.push({ event, payload }); },
    join() {},
    leave() {},
    to(roomId) {
      return { emit: (event, payload) => socket.roomBroadcasts.push({ roomId, event, payload }) };
    },
  };
  socket.handlers = handlers;
  return socket;
}

function makeIo() {
  const toBroadcasts = [];
  return {
    to: (targetId) => ({ emit: (event, payload) => toBroadcasts.push({ targetId, event, payload }) }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
    toBroadcasts,
  };
}

const only = (arr, event) => arr.filter((b) => b.event === event);
const invoke = (s, e, p) => s.handlers.get(e)(p);
const PUB = 'BPub_key-0123456789abcdefghijklmnopqrstuvwxyz';

function setup(roomId, ip) {
  const io = makeIo();
  const host = makeSocket(`${roomId}-host`, `10.9.${ip}.1`);
  const guest = makeSocket(`${roomId}-guest`, `10.9.${ip}.2`);
  const outsider = makeSocket(`${roomId}-out`, `10.9.${ip}.3`);
  [host, guest, outsider].forEach((s) => registerHandlers(s, io));
  invoke(host, 'room:create', { roomId, name: 'Host' });
  invoke(guest, 'room:join', { roomId, name: 'Guest' });
  return { io, host, guest, outsider, roomId };
}

describe('e2ee:hello', () => {
  it('stores a public key on the participant and relays it to the room', () => {
    const { host, guest, roomId } = setup('e2ee1', 1);
    invoke(guest, 'e2ee:hello', { roomId, pub: PUB });
    expect(getParticipants(roomId).find((p) => p.socketId === guest.id).e2ePub).toBe(PUB);
    const b = only(guest.roomBroadcasts, 'e2ee:hello');
    expect(b).toHaveLength(1);
    expect(b[0].payload).toEqual({ from: guest.id, pub: PUB });
    expect(host.emits.find((e) => e.event === 'e2ee:hello')).toBeUndefined();
  });

  it.each([[123], ['x'.repeat(201)], ['bad key!'], [''], [undefined]])('rejects malformed pub %j', (pub) => {
    const { guest, roomId } = setup(`e2ee${String(pub).length}x`, 2);
    invoke(guest, 'e2ee:hello', { roomId, pub });
    expect(only(guest.roomBroadcasts, 'e2ee:hello')).toHaveLength(0);
  });

  it('ignores a non-member', () => {
    const { outsider, roomId } = setup('e2ee2', 3);
    invoke(outsider, 'e2ee:hello', { roomId, pub: PUB });
    expect(only(outsider.roomBroadcasts, 'e2ee:hello')).toHaveLength(0);
  });
});

describe('e2ee:rekey', () => {
  const msg = (roomId, to) => ({ roomId, to, hostPub: PUB, iv: 'aXY', ct: 'Y3Q' });

  it('relays host -> member only', () => {
    const { io, host, guest, roomId } = setup('e2ee3', 4);
    invoke(host, 'e2ee:rekey', msg(roomId, guest.id));
    expect(only(io.toBroadcasts, 'e2ee:rekey')).toEqual([
      { targetId: guest.id, event: 'e2ee:rekey', payload: { from: host.id, hostPub: PUB, iv: 'aXY', ct: 'Y3Q' } },
    ]);
  });

  it('refuses a rekey from a non-host (a guest cannot push a key to others)', () => {
    const { io, guest, host, roomId } = setup('e2ee4', 5);
    invoke(guest, 'e2ee:rekey', msg(roomId, host.id));
    expect(only(io.toBroadcasts, 'e2ee:rekey')).toHaveLength(0);
  });

  it('refuses a target outside the room and oversize ciphertext', () => {
    const { io, host, outsider, guest, roomId } = setup('e2ee5', 6);
    invoke(host, 'e2ee:rekey', msg(roomId, outsider.id));
    invoke(host, 'e2ee:rekey', { ...msg(roomId, guest.id), ct: 'A'.repeat(400) });
    expect(only(io.toBroadcasts, 'e2ee:rekey')).toHaveLength(0);
  });
});

describe('room:kick', () => {
  it('flags the user-left broadcast as kicked so the host client rotates the media key', () => {
    const { io, host, guest, roomId } = setup('e2ee6', 7);
    io.sockets.sockets.set(guest.id, guest);
    invoke(host, 'room:kick', { roomId, targetId: guest.id });
    const left = io.toBroadcasts.find((b) => b.event === 'room:user-left');
    expect(left.payload.kicked).toBe(true);
  });
});
