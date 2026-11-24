// /api/token input validation and PIN protection.
const http = require('http');
const { app } = require('../src/index');
const { createRoom } = require('../src/roomManager');

let server;
let base;
beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const post = (body, raw) =>
  fetch(`${base}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });

describe('POST /api/token', () => {
  it.each([
    [{ participantName: 'Bob' }],
    [{ roomId: 'bad room!', participantName: 'Bob' }],
    [{ roomId: 'x'.repeat(33), participantName: 'Bob' }],
    [{ roomId: 123, participantName: 'Bob' }],
    [{ roomId: 'room1' }],
    [{ roomId: 'room1', participantName: '   ' }],
    [{ roomId: 'room1', participantName: 'n'.repeat(31) }],
    [{ roomId: 'room1', participantName: { a: 1 } }],
  ])('rejects %j with 400', async (body) => {
    expect((await post(body)).status).toBe(400);
  });

  it('mints a token for valid input and sanitizes gender', async () => {
    const res = await post({ roomId: 'room1', participantName: ' Bob ', gender: { evil: 1 } });
    expect(res.status).toBe(200);
    const json = await res.json();
    const payload = JSON.parse(Buffer.from(json.token.split('.')[1], 'base64url').toString());
    expect(JSON.parse(payload.metadata).gender).toBe('neutral');
    expect(payload.name).toBe('Bob');
  });

  it('enforces PIN and locks out repeated wrong guesses', async () => {
    createRoom('pinroom', 'tok-host', 'H', 'secret');
    expect((await post({ roomId: 'pinroom', participantName: 'B', pin: 'secret' })).status).toBe(200);
    for (let i = 0; i < 5; i++) {
      expect((await post({ roomId: 'pinroom', participantName: 'B', pin: 'nope' })).status).toBe(401);
    }
    expect((await post({ roomId: 'pinroom', participantName: 'B', pin: 'secret' })).status).toBe(429);
  });
});
