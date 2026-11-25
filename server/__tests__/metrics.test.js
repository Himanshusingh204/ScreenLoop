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

  it('health and metrics probes work in production without an Origin header (LB / k8s probes send none)', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      for (const path of ['/healthz', '/health', '/metrics']) expect((await fetch(`${base}${path}`)).status).toBe(200);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('requires a bearer token on /metrics when METRICS_TOKEN is set (healthz stays open)', async () => {
    process.env.METRICS_TOKEN = 's3cret';
    try {
      expect((await fetch(`${base}/metrics`)).status).toBe(401);
      expect((await fetch(`${base}/metrics`, { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
      expect((await fetch(`${base}/metrics`, { headers: { Authorization: 'Bearer s3cret' } })).status).toBe(200);
      expect((await fetch(`${base}/healthz`)).status).toBe(200);
    } finally {
      delete process.env.METRICS_TOKEN;
    }
  });
});
