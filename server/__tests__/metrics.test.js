// /healthz and /metrics observability endpoints.
const http = require('http');
const { app } = require('../src/index');

let server;
let base;
beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

describe('observability', () => {
  it('GET /healthz returns ok', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('GET /metrics exposes prometheus gauges and counters', async () => {
    const res = await fetch(`${base}/metrics`);
    expect(res.status).toBe(200);
    const body = await res.text();
    for (const name of ['rooms_active', 'meets_active', 'sockets_connected', 'token_requests_total']) {
      expect(body).toContain(name);
    }
  });

  it('counts token requests', async () => {
    await fetch(`${base}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: 'metr1', participantName: 'Bob' }),
    });
    const body = await (await fetch(`${base}/metrics`)).text();
    expect(body).toMatch(/token_requests_total\s+[1-9]/);
  });
});
