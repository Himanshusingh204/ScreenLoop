import { describe, it, expect } from 'vitest';
import { MediaKeyCoordinator } from '../mediaKeyCoordinator';

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
        if (e === 'e2ee:rekey') sockets.get(p.to)?.fire('e2ee:rekey', { from: id, hostPub: p.hostPub, iv: p.iv, ct: p.ct });
      },
    };
    sockets.set(id, s);
    return s;
  };
  return { mk };
}

const tick = () => new Promise((r) => setTimeout(r, 20));

async function peer(bus, id, isHost) {
  const socket = bus.mk(id);
  const applied = [];
  const c = new MediaKeyCoordinator({ socket, roomId: 'r', isHost: () => isHost, applyKey: async (k) => applied.push(k) });
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
    await tick();

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
    await tick();
    expect(late.applied).toEqual(host.applied);
    expect(g1.applied).toEqual(host.applied);
  });

  it('ignores a rekey it cannot decrypt (wrong recipient) without applying anything', async () => {
    const bus = makeBus();
    const a = await peer(bus, 'a', false);
    await a.socket.fire('e2ee:rekey', { from: 'x', hostPub: 'AAAA', iv: 'AAAA', ct: 'AAAA' });
    expect(a.applied).toHaveLength(0);
  });

  it('stop() removes its listeners', async () => {
    const bus = makeBus();
    const host = await peer(bus, 'host', true);
    host.c.stop();
    await host.socket.fire('room:user-left', { kicked: true, participants: [{ socketId: 'host' }] });
    expect(host.applied).toHaveLength(0);
  });
});
