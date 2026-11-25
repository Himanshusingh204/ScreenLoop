// syncValidation.test.js — server-side payload validation for playback,
// pointer, annotation, reaction and host-toggle socket events.
// Client shapes (see client/src): sync:play/pause send {} or {currentTime};
// sync:seek sends {time}; sync:pointer sends {x,y} as 0..1 fractions (or -1 on
// leave); sync:draw sends a single segment object with 0..1 fractions;
// room:reaction sends one of five emoji; room:host-only-toggle sends a boolean.
const { registerHandlers } = require('../src/socketHandlers');

let seq = 0;

/** Build a minimal fake Socket that records what the handlers emit. */
function makeSocket(id, address) {
  const handlers = new Map();
  const socket = {
    id,
    handshake: { address },
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
  return {
    to: (targetId) => ({
      emit: (event, payload) => toBroadcasts.push({ targetId, event, payload }),
    }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
    toBroadcasts,
  };
}

function invoke(socket, event, payload) {
  const fn = socket.handlers.get(event);
  if (!fn) throw new Error(`No handler registered for "${event}"`);
  fn(payload);
}

/** Fresh room with a host socket on a unique IP and room id (avoids shared rate-limit state). */
function setupRoom() {
  seq += 1;
  const ip = `10.42.${Math.floor(seq / 250)}.${(seq % 250) + 1}`;
  const roomId = `syncval${seq}`;
  const host = makeSocket(`host-${seq}`, ip);
  const io = makeIo();
  registerHandlers(host, io);
  invoke(host, 'room:create', { roomId, name: 'Host' });
  return { host, io, roomId };
}

/** Events relayed to the room (socket.to) or broadcast from io.to, filtered by name. */
function relayed(ctx, event) {
  return [
    ...ctx.host.roomBroadcasts.filter((b) => b.event === event),
    ...ctx.io.toBroadcasts.filter((b) => b.event === event),
  ];
}

const BAD_TIMES = [NaN, Infinity, -Infinity, '12', null, {}, true, -1, 1e7 + 1, 1e9];

describe('sync:play', () => {
  it('relays a play with no currentTime (the client sends {})', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:play', { roomId: ctx.roomId });
    const out = relayed(ctx, 'sync:play');
    expect(out).toHaveLength(1);
    expect(out[0].payload.name).toBe('Host');
  });

  it('relays a play with a valid currentTime', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:play', { roomId: ctx.roomId, currentTime: 12.5 });
    const out = relayed(ctx, 'sync:play');
    expect(out).toHaveLength(1);
    expect(out[0].payload.currentTime).toBe(12.5);
  });

  it.each(BAD_TIMES)('does not relay a play with currentTime %p', (bad) => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:play', { roomId: ctx.roomId, currentTime: bad });
    expect(relayed(ctx, 'sync:play')).toHaveLength(0);
  });
});

describe('sync:pause', () => {
  it('relays a pause with no currentTime (the client sends {})', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:pause', { roomId: ctx.roomId });
    expect(relayed(ctx, 'sync:pause')).toHaveLength(1);
  });

  it('relays a pause with a valid currentTime', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:pause', { roomId: ctx.roomId, currentTime: 0 });
    expect(relayed(ctx, 'sync:pause')).toHaveLength(1);
  });

  it.each(BAD_TIMES)('does not relay a pause with currentTime %p', (bad) => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:pause', { roomId: ctx.roomId, currentTime: bad });
    expect(relayed(ctx, 'sync:pause')).toHaveLength(0);
  });
});

describe('sync:seek', () => {
  it('relays a seek to a valid time', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:seek', { roomId: ctx.roomId, time: 42 });
    const out = relayed(ctx, 'sync:seek');
    expect(out).toHaveLength(1);
    expect(out[0].payload.time).toBe(42);
  });

  it.each(BAD_TIMES)('does not relay a seek to time %p', (bad) => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:seek', { roomId: ctx.roomId, time: bad });
    expect(relayed(ctx, 'sync:seek')).toHaveLength(0);
  });

  it('does not relay a seek with no time at all', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:seek', { roomId: ctx.roomId });
    expect(relayed(ctx, 'sync:seek')).toHaveLength(0);
  });
});

describe('sync:pointer', () => {
  it('relays a pointer position given as 0..1 fractions', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:pointer', { roomId: ctx.roomId, x: 0.25, y: 0.75 });
    const out = relayed(ctx, 'sync:pointer');
    expect(out).toHaveLength(1);
    expect(out[0].payload).toEqual({ x: 0.25, y: 0.75 });
  });

  it('relays the -1 sentinel the client sends when the pointer leaves', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:pointer', { roomId: ctx.roomId, x: -1, y: -1 });
    expect(relayed(ctx, 'sync:pointer')).toHaveLength(1);
  });

  it.each([NaN, Infinity, -Infinity, '0.5', null, 1.5, 2, -0.5, -2, 640])(
    'does not relay a pointer coordinate of %p',
    (bad) => {
      const ctx = setupRoom();
      invoke(ctx.host, 'sync:pointer', { roomId: ctx.roomId, x: bad, y: 0.5 });
      invoke(ctx.host, 'sync:pointer', { roomId: ctx.roomId, x: 0.5, y: bad });
      expect(relayed(ctx, 'sync:pointer')).toHaveLength(0);
    }
  );
});

describe('sync:draw', () => {
  const segment = {
    fromX: 0.1,
    fromY: 0.2,
    toX: 0.3,
    toY: 0.4,
    color: '#ff0000',
    width: 4,
    tool: 'pen',
  };

  it('relays a valid annotation segment unchanged', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:draw', { roomId: ctx.roomId, stroke: segment });
    const out = relayed(ctx, 'sync:draw');
    expect(out).toHaveLength(1);
    expect(out[0].payload.stroke).toEqual(segment);
  });

  it('relays a segment whose touch coordinates drift slightly past the canvas edge', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:draw', { roomId: ctx.roomId, stroke: { ...segment, toX: 1.02, fromY: -0.01 } });
    expect(relayed(ctx, 'sync:draw')).toHaveLength(1);
  });

  it.each([null, undefined, 'abc', 42, true, ['x']])(
    'does not relay a stroke that is not an object: %p',
    (bad) => {
      const ctx = setupRoom();
      invoke(ctx.host, 'sync:draw', { roomId: ctx.roomId, stroke: bad });
      expect(relayed(ctx, 'sync:draw')).toHaveLength(0);
    }
  );

  it('does not relay a stroke whose JSON exceeds ~8 KB', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:draw', {
      roomId: ctx.roomId,
      stroke: { ...segment, color: 'x'.repeat(9000) },
    });
    expect(relayed(ctx, 'sync:draw')).toHaveLength(0);
  });

  it('does not relay a stroke with ~2000+ points (rejected by the size cap)', () => {
    const ctx = setupRoom();
    const points = Array.from({ length: 2500 }, (_, i) => [i / 2500, 0.5]);
    invoke(ctx.host, 'sync:draw', { roomId: ctx.roomId, stroke: { ...segment, points } });
    expect(relayed(ctx, 'sync:draw')).toHaveLength(0);
  });

  it.each([NaN, Infinity, '0.5', null, 5, -3])(
    'does not relay a segment coordinate of %p',
    (bad) => {
      const ctx = setupRoom();
      invoke(ctx.host, 'sync:draw', { roomId: ctx.roomId, stroke: { ...segment, fromX: bad } });
      invoke(ctx.host, 'sync:draw', { roomId: ctx.roomId, stroke: { ...segment, toY: bad } });
      expect(relayed(ctx, 'sync:draw')).toHaveLength(0);
    }
  );
});

describe('sync:clear-draw', () => {
  it('relays a clear from a room member', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'sync:clear-draw', { roomId: ctx.roomId });
    expect(relayed(ctx, 'sync:clear-draw')).toHaveLength(1);
  });

  it('does not relay a clear from a socket that is not in the room', () => {
    const ctx = setupRoom();
    const outsider = makeSocket('outsider-1', '10.99.0.1');
    registerHandlers(outsider, ctx.io);
    invoke(outsider, 'sync:clear-draw', { roomId: ctx.roomId });
    expect(relayed(ctx, 'sync:clear-draw')).toHaveLength(0);
  });
});

describe('room:reaction', () => {
  it.each(['😂', '😲', '💖', '🍿', '🔥'])('relays the client emoji %s', (emoji) => {
    const ctx = setupRoom();
    invoke(ctx.host, 'room:reaction', { roomId: ctx.roomId, emoji });
    const out = relayed(ctx, 'room:reaction');
    expect(out).toHaveLength(1);
    expect(out[0].payload.emoji).toBe(emoji);
    expect(out[0].payload.name).toBe('Host');
  });

  it.each([
    ['non-string', 123],
    ['null', null],
    ['empty string', ''],
    ['over-long string', 'x'.repeat(11)],
    ['array', ['🔥']],
    ['object', { emoji: '🔥' }],
    ['unknown emoji', '💩'],
    ['arbitrary text', '<script>'],
  ])('does not relay a reaction that is %s', (_label, bad) => {
    const ctx = setupRoom();
    invoke(ctx.host, 'room:reaction', { roomId: ctx.roomId, emoji: bad });
    expect(relayed(ctx, 'room:reaction')).toHaveLength(0);
  });
});

describe('room:host-only-toggle', () => {
  it('applies and broadcasts a strict boolean from the host', () => {
    const ctx = setupRoom();
    invoke(ctx.host, 'room:host-only-toggle', { roomId: ctx.roomId, enabled: true });
    const out = relayed(ctx, 'room:host-only-changed');
    expect(out).toHaveLength(1);
    expect(out[0].payload).toEqual({ enabled: true });
  });

  it.each(['true', 'false', 1, 0, null, undefined, 'yes', {}])(
    'does not apply a non-boolean enabled value %p',
    (bad) => {
      const ctx = setupRoom();
      invoke(ctx.host, 'room:host-only-toggle', { roomId: ctx.roomId, enabled: bad });
      expect(relayed(ctx, 'room:host-only-changed')).toHaveLength(0);
    }
  );

  it('still ignores a valid toggle from a non-host member', () => {
    const ctx = setupRoom();
    const viewer = makeSocket('viewer-1', '10.99.0.2');
    registerHandlers(viewer, ctx.io);
    invoke(viewer, 'room:join', { roomId: ctx.roomId, name: 'Viewer' });
    invoke(viewer, 'room:host-only-toggle', { roomId: ctx.roomId, enabled: true });
    expect(relayed(ctx, 'room:host-only-changed')).toHaveLength(0);
  });
});
