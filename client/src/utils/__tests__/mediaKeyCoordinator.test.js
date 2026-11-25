import { describe, it, expect } from 'vitest';
import { MediaKeyCoordinator } from '../mediaKeyCoordinator';
import { generateKeyPair, exportPublic, wrapMediaKey, newMediaKey } from '../mediaKeys';

const ROOM_KEY = 'url-fragment-room-key';

// Fake signaling bus mimicking the server's e2ee relay (host-only rekey, hello to everyone else).
function makeBus() {
  const sockets = new Map();
  const mk = (id) => {
    const handlers = {};
    const s = {
      id,
      on: (e, f) => { (handlers[e] ||= []).push(f); },
      off: (e, f) => { handlers[e] = (handlers[e] || []).filter((x) => x !== f); },
      fire: (e, p) => Promise.all((handlers[e] || []).map((f) => f(p))),
      emit: (e, p) => {
        if (e === 'e2ee:hello') for (const [oid, o] of sockets) if (oid !== id) o.fire('e2ee:hello', { from: id, pub: p.pub });
        if (e === 'e2ee:rekey') sockets.get(p.to)?.fire('e2ee:rekey', { from: id, hostPub: p.hostPub, iv: p.iv, ct: p.ct, epoch: p.epoch });
      },
    };
    sockets.set(id, s);
    return s;
  };
  return { mk };
}

const tick = () => new Promise((r) => setTimeout(r, 20));
const until = async (cond) => { for (let i = 0; i < 100 && !cond(); i++) await new Promise((r) => setTimeout(r, 20)); };

async function peer(bus, id, isHost, extra = {}) {
  const socket = bus.mk(id);
  const applied = [];
  const c = new MediaKeyCoordinator({ socket, roomId: 'r', isHost: () => isHost, applyKey: async (k) => applied.push(k), roomKey: ROOM_KEY, ...extra });
  await c.start();
  return { socket, c, applied };
}

describe('MediaKeyCoordinator', () => {
  it('on kick, the host rotates its own key and delivers the same key to every remaining peer', async () => {
    const bus = makeBus();
    const host = await peer(bus, 'host', true);
    const g1 = await peer(bus, 'g1', false);
    const g2 = await peer(bus, 'g2', false);
    await tick();

    await host.socket.fire('room:user-left', {
      kicked: true,
      participants: [{ socketId: 'host' }, { socketId: 'g1' }, { socketId: 'g2' }],
    });
    await until(() => g1.applied.length && g2.applied.length);

    expect(host.applied).toHaveLength(1);
    expect(g1.applied).toEqual(host.applied);
    expect(g2.applied).toEqual(host.applied);
  });

  it('does not rotate when someone leaves voluntarily or when the local user is not host', async () => {
    const bus = makeBus();
    const host = await peer(bus, 'host', true);
    const g1 = await peer(bus, 'g1', false);
    await tick();
    await host.socket.fire('room:user-left', { kicked: false, participants: [{ socketId: 'g1' }] });
    await g1.socket.fire('room:user-left', { kicked: true, participants: [{ socketId: 'host' }] });
    await tick();
    expect(host.applied).toHaveLength(0);
    expect(g1.applied).toHaveLength(0);
  });

  it('a removed peer never receives the rotated key', async () => {
    const bus = makeBus();
    const host = await peer(bus, 'host', true);
    const g1 = await peer(bus, 'g1', false);
    const kicked = await peer(bus, 'bad', false);
    await tick();
    await host.socket.fire('room:user-left', { kicked: true, participants: [{ socketId: 'host' }, { socketId: 'g1' }] });
    await tick();
    expect(g1.applied).toHaveLength(1);
    expect(kicked.applied).toHaveLength(0);
  });

  it('a peer who joins after a rotation gets the current key from the host', async () => {
    const bus = makeBus();
    const host = await peer(bus, 'host', true);
    const g1 = await peer(bus, 'g1', false);
    await tick();
    await host.socket.fire('room:user-left', { kicked: true, participants: [{ socketId: 'g1' }] });
    await tick();
    const late = await peer(bus, 'late', false);
    await until(() => late.applied.length > 0);
    expect(late.applied).toEqual(host.applied);
    expect(g1.applied).toEqual(host.applied);
  });

  it('ignores a rekey it cannot decrypt (wrong recipient) without applying anything', async () => {
    const bus = makeBus();
    const a = await peer(bus, 'a', false);
    await a.socket.fire('e2ee:rekey', { from: 'x', hostPub: 'AAAA', iv: 'AAAA', ct: 'AAAA', epoch: 1 });
    expect(a.applied).toHaveLength(0);
  });

  it('stop() removes its listeners', async () => {
    const bus = makeBus();
    const host = await peer(bus, 'host', true);
    host.c.stop();
    await host.socket.fire('room:user-left', { kicked: true, participants: [{ socketId: 'host' }] });
    expect(host.applied).toHaveLength(0);
  });

  it('start() is idempotent: a reconnect does not double-register listeners', async () => {
    const bus = makeBus();
    const host = await peer(bus, 'host', true);
    await host.c.start();
    await host.c.start();
    await host.socket.fire('room:user-left', { kicked: true, participants: [{ socketId: 'host' }] });
    expect(host.applied).toHaveLength(1);
  });

  it('ignores an older epoch that arrives after a newer one (out-of-order rotations)', async () => {
    const bus = makeBus();
    const g = await peer(bus, 'g', false);
    const hostPair = await generateKeyPair();
    const hostPub = await exportPublic(hostPair.publicKey);
    const [k1, k2] = [newMediaKey(), newMediaKey()];
    const send = async (key, epoch) =>
      g.socket.fire('e2ee:rekey', { from: 'h', hostPub, epoch, ...(await wrapMediaKey(key, hostPair.privateKey, g.c.myPub, ROOM_KEY)) });
    await send(k2, 2);
    await send(k1, 1);
    expect(g.applied).toEqual([k2]);
  });

  it('rejects a key wrapped without the room key (a server that substituted its own keys cannot inject one)', async () => {
    const bus = makeBus();
    const g = await peer(bus, 'g', false);
    const evil = await generateKeyPair();
    const evilPub = await exportPublic(evil.publicKey);
    const w = await wrapMediaKey(newMediaKey(), evil.privateKey, g.c.myPub, 'guessed-key');
    await g.socket.fire('e2ee:rekey', { from: 'h', hostPub: evilPub, epoch: 1, ...w });
    expect(g.applied).toHaveLength(0);
  });

  it('a promoted host that inherited the rotated key and epoch hands it to a late joiner', async () => {
    const bus = makeBus();
    const inherited = newMediaKey();
    const host = await peer(bus, 'newhost', true, { initialKey: inherited, initialEpoch: 3 });
    const late = await peer(bus, 'late', false);
    await until(() => late.applied.length > 0);
    expect(late.applied).toEqual([inherited]);
    expect(host.c.epoch).toBe(3);
  });
});
