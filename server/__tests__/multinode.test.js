// Two independent Socket.IO nodes sharing a (mock) Redis must relay room events to each other.
const http = require('http');
const { Server } = require('socket.io');
const { io: ioc } = require('socket.io-client');
const RedisMock = require('ioredis-mock');
const { attachRedisAdapter } = require('../src/redisAdapter');

const nodes = [];
const clients = [];

async function startNode(redisUrl) {
  const srv = http.createServer();
  const io = new Server(srv);
  const attached = redisUrl ? attachRedisAdapter(io, redisUrl, { RedisCtor: RedisMock }) : false;
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  nodes.push({ srv, io });
  return { io, port: srv.address().port, attached };
}
const connect = (port) =>
  new Promise((resolve) => {
    const c = ioc(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew: true });
    clients.push(c);
    c.on('connect', () => resolve(c));
  });

afterEach(async () => {
  clients.splice(0).forEach((c) => c.close());
  await Promise.all(nodes.splice(0).map((n) => new Promise((r) => n.io.close(r))));
});

describe('redis adapter', () => {
  it('is skipped when REDIS_URL is not provided', async () => {
    const a = await startNode(null);
    expect(a.attached).toBe(false);
  });

  it('relays a room broadcast from node A to a client on node B', async () => {
    const a = await startNode('redis://mock');
    const b = await startNode('redis://mock');
    for (const n of [a, b]) n.io.on('connection', (s) => s.on('join', (r) => s.join(r)));
    const [ca, cb] = [await connect(a.port), await connect(b.port)];
    ca.emit('join', 'room1');
    cb.emit('join', 'room1');
    await new Promise((r) => setTimeout(r, 100));
    const got = new Promise((r) => cb.on('hello', r));
    a.io.to('room1').emit('hello', 'from-A');
    expect(await got).toBe('from-A');
  });

  it('a redis error event does not crash the process and local delivery still works', async () => {
    const a = await startNode('redis://mock');
    a.io.on('connection', (s) => s.join('r'));
    const c = await connect(a.port);
    const got = new Promise((r) => c.on('local', r));
    expect(() => a.attached.pub.emit('error', new Error('boom'))).not.toThrow();
    expect(() => a.attached.sub.emit('error', new Error('boom'))).not.toThrow();
    a.io.to('r').emit('local', 'ok');
    expect(await got).toBe('ok');
  });
});
