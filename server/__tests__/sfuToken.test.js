// sfu:token — LiveKit tokens are issued only to authenticated socket members, with server-decided rights.
const { registerHandlers } = require('../src/socketHandlers');
const { register } = require('../src/metrics');

function makeSocket(id, address, query) {
  const handlers = new Map();
  const socket = {
    id,
    data: {},
    handshake: { address, query },
    emits: [],
    joinedRooms: [],
    on(event, fn) { handlers.set(event, fn); },
    emit(event, payload) { socket.emits.push({ event, payload }); },
    join(r) { socket.joinedRooms.push(r); },
    leave() {},
    to() { return { emit() {} }; },
  };
  socket.handlers = handlers;
  return socket;
}
const makeIo = () => ({
  to: () => ({ emit() {} }),
  sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
});
const invoke = (s, e, ...a) => s.handlers.get(e)(...a);
const ask = (s, payload) => new Promise((resolve) => invoke(s, 'sfu:token', payload, resolve));
const claims = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

describe('sfu:token (watch rooms)', () => {
  function watch(id, ip) {
    const io = makeIo();
    const host = makeSocket(`${id}-h`, `10.8.${ip}.1`);
    const viewer = makeSocket(`${id}-v`, `10.8.${ip}.2`);
    const stranger = makeSocket(`${id}-s`, `10.8.${ip}.3`);
    [host, viewer, stranger].forEach((s) => registerHandlers(s, io));
    invoke(host, 'room:create', { roomId: id, name: 'Host' });
    invoke(viewer, 'room:join', { roomId: id, name: 'View' });
    return { host, viewer, stranger };
  }

  it('gives the host publish rights, identity = socket id, and a w: prefixed LiveKit room', async () => {
    const { host } = watch('tk1', 1);
    const res = await ask(host, { kind: 'watch', roomId: 'tk1' });
    const c = claims(res.token);
    expect(c.sub).toBe(host.id);
    expect(c.video.room).toBe('w:tk1');
    expect(c.video.canPublish).toBe(true);
    expect(res.url).toMatch(/^wss?:\/\//);
  });

  it('viewers can subscribe but never publish (a viewer cannot inject a stream)', async () => {
    const { viewer } = watch('tk2', 2);
    const c = claims((await ask(viewer, { kind: 'watch', roomId: 'tk2' })).token);
    expect(c.video.canSubscribe).toBe(true);
    expect(c.video.canPublish).toBe(false);
    expect(c.video.canPublishData).toBe(false);
  });

  it('refuses a socket that is not a member of the room, and a mismatched room id', async () => {
    const { stranger, viewer } = watch('tk3', 3);
    expect((await ask(stranger, { kind: 'watch', roomId: 'tk3' })).error).toBeTruthy();
    expect((await ask(viewer, { kind: 'watch', roomId: 'other' })).error).toBeTruthy();
  });

  it.each([[undefined], [{}], [{ kind: 'x', roomId: 'tk4' }], [{ kind: 'watch', roomId: 5 }]])('rejects malformed request %j', async (p) => {
    const { host } = watch('tk4', 4);
    expect((await ask(host, p)).error).toBeTruthy();
  });

  it('does not throw when the client sends no ack callback', () => {
    const { host } = watch('tk5', 5);
    expect(() => invoke(host, 'sfu:token', { kind: 'watch', roomId: 'tk5' })).not.toThrow();
  });

  it('counts issued tokens in metrics', async () => {
    const { host } = watch('tk6', 6);
    await ask(host, { kind: 'watch', roomId: 'tk6' });
    expect(await register.getSingleMetricAsString('token_requests_total')).toMatch(/token_requests_total\s+[1-9]/);
  });
});

describe('sfu:token (meets)', () => {
  it('issues an m: prefixed token only to members of that meet', async () => {
    const io = makeIo();
    const a = makeSocket('mt-a', '10.8.20.1');
    const out = makeSocket('mt-b', '10.8.20.2');
    [a, out].forEach((s) => registerHandlers(s, io));
    invoke(a, 'meet:join', { meetId: 'mt1', name: 'Ann', micOn: true, cameraOn: true });
    const c = claims((await ask(a, { kind: 'meet', roomId: 'mt1' })).token);
    expect(c.sub).toBe(a.id);
    expect(c.video.room).toBe('m:mt1');
    expect(c.video.canPublish).toBe(true);
    expect((await ask(out, { kind: 'meet', roomId: 'mt1' })).error).toBeTruthy();
  });

  it('uses a socket.io room namespace that cannot collide with a watch room of the same id', () => {
    const s = makeSocket('mt-c', '10.8.21.1');
    registerHandlers(s, makeIo());
    invoke(s, 'meet:join', { meetId: 'same', name: 'Ann', micOn: true, cameraOn: true });
    expect(s.joinedRooms).toEqual(['meet:same']);
  });
});

describe('handshake room binding (prevents shadow rooms across nodes)', () => {
  const create = (query, roomId, ip) => {
    const s = makeSocket(`bind-${ip}`, `10.8.${ip}.9`, query);
    registerHandlers(s, makeIo());
    invoke(s, 'room:create', { roomId, name: 'H' });
    return s;
  };
  it('rejects room:create when the handshake room differs from the event room', () => {
    expect(create({ room: 'zzz' }, 'victim1', 30).joinedRooms).toEqual([]);
  });
  it('allows a matching handshake room, and legacy sockets with no room in single-node mode', () => {
    expect(create({ room: 'ok1' }, 'ok1', 31).joinedRooms).toEqual(['ok1']);
    expect(create(undefined, 'ok2', 32).joinedRooms).toEqual(['ok2']);
  });
  it('requires the handshake room when running multi-node (REDIS_URL set)', () => {
    process.env.REDIS_URL = 'redis://x';
    try {
      expect(create(undefined, 'ok3', 33).joinedRooms).toEqual([]);
    } finally {
      delete process.env.REDIS_URL;
    }
  });
});
