// Socket.IO load test: ROOMS rooms x PER_ROOM clients, each sends 1 chat msg/s for DURATION s.
// Usage: node socket-join.js [url] [rooms] [perRoom] [durationSec]
// Reports delivery ratio and chat fan-out latency (p50/p95/p99). k6 has no native socket.io, hence Node.
const { io } = require('socket.io-client');

const [url = 'http://localhost:4000', ROOMS = '20', PER_ROOM = '5', DURATION = '30'] = process.argv.slice(2);
const rooms = +ROOMS, perRoom = +PER_ROOM, duration = +DURATION;
const lat = [];
let sent = 0, received = 0, errors = 0, connected = 0;
const sockets = [];

const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client(roomId, idx) {
  return new Promise((resolve) => {
    const s = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(s);
    s.on('connect_error', () => { errors++; resolve(null); });
    s.on('room:error', () => { errors++; resolve(null); });
    s.on('chat:message', (m) => {
      const t = Number(String(m.text || '').split('|')[0]);
      if (t) { received++; lat.push(Date.now() - t); }
    });
    s.on('connect', () => {
      connected++;
      s.emit(idx === 0 ? 'room:create' : 'room:join', { roomId, name: `u${idx}` });
      setTimeout(() => resolve(s), 300);
    });
  });
}

(async () => {
  const all = [];
  const ids = [];
  for (let r = 0; r < rooms; r++) {
    const id = `lt${Date.now().toString(36)}${r}`;
    ids.push(id);
    all.push(await client(id, 0));
    for (let i = 1; i < perRoom; i++) all.push(await client(id, i));
    if (r % 10 === 9) await sleep(50);
  }
  const live = all.map((s, i) => ({ s, room: ids[Math.floor(i / perRoom)] })).filter((x) => x.s);
  console.log(`connected ${connected}/${rooms * perRoom}, errors ${errors}`);
  const timer = setInterval(() => {
    for (const { s, room } of live) { s.emit('chat:message', { roomId: room, text: `${Date.now()}|x` }); sent++; }
  }, 1000);
  await sleep(duration * 1000);
  clearInterval(timer);
  await sleep(1500);
  lat.sort((a, b) => a - b);
  console.log(JSON.stringify({ clients: live.length, sent, received, p50: pct(lat, 0.5), p95: pct(lat, 0.95), p99: pct(lat, 0.99) }));
  sockets.forEach((s) => s.close());
  process.exit(0);
})();
