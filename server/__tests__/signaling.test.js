// webrtc:stop authz, meet:* join/leave, malformed-payload resilience.
const { registerHandlers } = require('../src/socketHandlers');
const { createRoom, joinRoom, getMeet } = require('../src/roomManager');

function makeSocket(id) {
  const handlers = new Map();
  const socket = {
    id,
    handshake: { address: `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    emits: [],
    broadcasts: [],
    on(event, fn) { handlers.set(event, fn); },
    emit(event, payload) { socket.emits.push({ event, payload }); },
    join() {},
    leave() {},
    to(room) { return { emit: (event, payload) => socket.broadcasts.push({ room, event, payload }) }; },
    handlers,
  };
  return socket;
}
function makeIo() {
  const sent = [];
  return {
    to: (t) => ({ emit: (event, payload) => sent.push({ to: t, event, payload }) }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
    sent,
  };
}
const fire = (s, ev, p) => s.handlers.get(ev)(p);

describe('webrtc:stop', () => {
  it('emits stream-end to the room for a member, ignores outsiders and bad payloads', () => {
    const io = makeIo();
    const host = makeSocket('stop-host');
    registerHandlers(host, io);
    fire(host, 'room:create', { roomId: 'stoproom', name: 'H' });

    const outsider = makeSocket('stop-out');
    registerHandlers(outsider, io);
    fire(outsider, 'webrtc:stop', { roomId: 'stoproom' });
    expect(io.sent).toHaveLength(0);

    fire(host, 'webrtc:stop', { roomId: 'otherroom' });
    expect(io.sent).toHaveLength(0);

    expect(() => fire(host, 'webrtc:stop', undefined)).not.toThrow();
    expect(io.sent).toHaveLength(0);

    fire(host, 'webrtc:stop', { roomId: 'stoproom' });
    expect(io.sent).toEqual([
      { to: 'stoproom', event: 'webrtc:stream-end', payload: { roomId: 'stoproom' } },
    ]);
  });

  it('a socket cannot create a second room while in one', () => {
    const io = makeIo();
    const s = makeSocket('dbl');
    registerHandlers(s, io);
    fire(s, 'room:create', { roomId: 'dbl1', name: 'A' });
    s.emits.length = 0;
    fire(s, 'room:create', { roomId: 'dbl2', name: 'A' });
    expect(s.emits).toHaveLength(0);
  });
});

describe('meet events', () => {
  it('first joiner is host, leave notifies, last leave closes the meet', () => {
    const io = makeIo();
    const a = makeSocket('meet-a');
    const b = makeSocket('meet-b');
    registerHandlers(a, io);
    registerHandlers(b, io);

    fire(a, 'meet:join', { meetId: 'm1', name: 'A' });
    expect(a.emits.find((e) => e.event === 'meet:joined').payload.isHost).toBe(true);

    fire(b, 'meet:join', { meetId: 'm1', name: 'B', gender: 'female' });
    expect(b.emits.find((e) => e.event === 'meet:joined').payload.isHost).toBe(false);
    expect(b.broadcasts.find((e) => e.event === 'meet:user-joined').payload.gender).toBe('female');
    expect(getMeet('m1').participants.size).toBe(2);

    fire(b, 'meet:leave');
    expect(io.sent.some((e) => e.event === 'meet:user-left' && e.payload.socketId === 'meet-b')).toBe(true);
    expect(getMeet('m1').participants.size).toBe(1);

    fire(a, 'meet:leave');
    expect(getMeet('m1')).toBeNull();
    expect(io.sent.some((e) => e.event === 'meet:closed')).toBe(true);
  });

  it('rejects invalid ids/names, missing payload and double joins', () => {
    const io = makeIo();
    const s = makeSocket('meet-bad');
    registerHandlers(s, io);
    fire(s, 'meet:join', { meetId: 'bad id!', name: 'A' });
    fire(s, 'meet:join', { meetId: 'okid', name: '' });
    fire(s, 'meet:join', undefined);
    expect(s.emits).toHaveLength(0);
    expect(getMeet('okid')).toBeNull();

    fire(s, 'meet:join', { meetId: 'm2', name: 'A' });
    s.emits.length = 0;
    fire(s, 'meet:join', { meetId: 'm3', name: 'A' });
    expect(s.emits).toHaveLength(0);
    expect(getMeet('m3')).toBeNull();
    fire(s, 'meet:leave');
  });

  it('meet:signal only relays between members; disconnect removes participant', () => {
    const io = makeIo();
    const a = makeSocket('sig-a');
    const b = makeSocket('sig-b');
    const out = makeSocket('sig-out');
    [a, b, out].forEach((s) => registerHandlers(s, io));
    fire(a, 'meet:join', { meetId: 'm4', name: 'A' });
    fire(b, 'meet:join', { meetId: 'm4', name: 'B' });

    fire(out, 'meet:signal', { to: 'sig-a', signalData: { x: 1 } });
    expect(io.sent.filter((e) => e.event === 'meet:signal')).toHaveLength(0);
    fire(a, 'meet:signal', { to: 'sig-b', signalData: { x: 1 } });
    expect(io.sent.filter((e) => e.event === 'meet:signal')).toHaveLength(1);

    fire(b, 'disconnect', 'transport close');
    expect(getMeet('m4').participants.has('sig-b')).toBe(false);
    fire(a, 'disconnect', 'transport close');
    expect(getMeet('m4')).toBeNull();
  });
});

describe('webrtc relay authz', () => {
  it('rejects relay from a socket that is no longer a participant', () => {
    const io = makeIo();
    createRoom('relayroom', 'r-host', 'H');
    joinRoom('relayroom', 'r-view', 'V');
    const stale = makeSocket('r-stale');
    registerHandlers(stale, io);
    stale.data.roomId = 'relayroom'; // stale claim, not in participants
    fire(stale, 'webrtc:offer', { targetId: 'r-view', offer: { sdp: 'x' } });
    expect(io.sent).toHaveLength(0);
  });
});
