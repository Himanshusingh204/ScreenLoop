# Load tests

`node socket-join.js [url] [rooms] [perRoom] [durationSec]`: ROOMS x PER_ROOM Socket.IO clients, each sending 1 chat msg/s.
Start the server with limits raised (they are per-IP/per-node caps, not capacity limits):

    MAX_IP_CONNECTIONS=100000 MAX_ROOMS=100000 SPAM_MAX_EVENTS=100000 MAX_PARTICIPANTS=20 node server/src/index.js

## Baseline: single Node process (Windows dev laptop, generator on the same machine)

| Clients | Rooms | Chat in/s | Deliveries/s | Delivered | p50 | p95 | p99 | Server RSS |
|---|---|---|---|---|---|---|---|---|
| 500 | 100 | 500 | 2,500 | 72,500 / 72,500 (100%) | 163 ms | 372 ms | 474 ms | 157 MB |

Conservative: the load generator competed for the same CPU. Re-run on dedicated hardware before quoting a per-node ceiling.

## Multi-node: nginx LB + 3 signaling nodes + Redis (Docker on the same laptop)

`docker compose -f deploy/docker-compose.scale.yml -f deploy/docker-compose.loadtest.yml up -d --build`, then `node socket-join.js http://localhost:4000 300 5 30`.
The `loadtest` override only raises the per-IP/per-node caps (every client shares the LB address); never use it in production.

| Clients | Rooms | Chat in/s | Deliveries/s | Delivered | p50 | p95 | p99 |
|---|---|---|---|---|---|---|---|
| 1,500 | 300 | 1,450 | 7,250 | 217,500 / 217,500 (100%) | 245 ms | 602 ms | 744 ms |

Caveats: load generator, Docker Desktop networking, nginx, Redis, LiveKit and 3 Node processes all share one laptop, so latency is pessimistic and says nothing about per-node ceilings. 3x the clients of the single-process run at higher latency, so this is a correctness-at-scale check (rooms pinned by `?room=`, Redis relay, no drops), not a scaling-efficiency measurement.

### What running this found
- nginx `events {}` defaulted to 512 connections; each proxied WebSocket takes two, so the LB capped at ~256 users. Now `worker_connections 100000`.
- The server Dockerfile HEALTHCHECK used `localhost`, which busybox resolves to IPv6 `::1`, so every container reported unhealthy. Now `127.0.0.1/healthz`.
