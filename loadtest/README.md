# Load tests

`node socket-join.js [url] [rooms] [perRoom] [durationSec]`: ROOMS x PER_ROOM Socket.IO clients, each sending 1 chat msg/s.
Start the server with limits raised (they are per-IP/per-node caps, not capacity limits):

    MAX_IP_CONNECTIONS=100000 MAX_ROOMS=100000 SPAM_MAX_EVENTS=100000 MAX_PARTICIPANTS=20 node server/src/index.js

## Baseline: single Node process (Windows dev laptop, generator on the same machine)

| Clients | Rooms | Chat in/s | Deliveries/s | Delivered | p50 | p95 | p99 | Server RSS |
|---|---|---|---|---|---|---|---|---|
| 500 | 100 | 500 | 2,500 | 72,500 / 72,500 (100%) | 163 ms | 372 ms | 474 ms | 157 MB |

Conservative: the load generator competed for the same CPU. Re-run on dedicated hardware before quoting a per-node ceiling.
