// metrics.js — Prometheus metrics. Gauges are read at scrape time, so no bookkeeping in hot paths.
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const tokenRequests = new client.Counter({
  name: 'token_requests_total',
  help: 'LiveKit token requests',
  registers: [register],
});

function registerGauges({ countRooms, countMeets, countSockets }) {
  const gauge = (name, help, fn) =>
    new client.Gauge({ name, help, registers: [register], collect() { this.set(fn()); } });
  gauge('rooms_active', 'Active watch rooms', countRooms);
  gauge('meets_active', 'Active meets', countMeets);
  gauge('sockets_connected', 'Connected sockets on this node', countSockets);
}

module.exports = { register, tokenRequests, registerGauges };
