# System design

## Requirements
**Functional:** zero-account rooms; watch party (1 host → N viewers) and Meet (N↔N); encrypted chat; opt-in on-device captions/recap.
**Non-functional:** ephemeral state OK (a room may end if its node dies); join in < 3 s p95; no media or chat plaintext on any server we operate when the link carries the key; degrade gracefully (SFU down → P2P mesh).

## Architecture
```
Browser ──HTTPS──▶ CDN (static client, immutable hashed assets)
Browser ──WSS────▶ LB (consistent hash on ?room=) ──▶ Signaling node 1..N ──▶ Redis (pub/sub only)
Browser ──WebRTC─▶ LiveKit SFU cluster (media; E2EE ciphertext in watch rooms)
Signaling ──admin API──▶ LiveKit (kick/remove)         Browser ──▶ Hugging Face CDN (caption model, once)
```
- **Signaling is stateless across rooms but stateful within one:** a room lives in one node's memory. The LB hashes on `?room=` so all of a room's sockets reach the same node; Redis relays broadcasts so a stray socket on another node cannot split a room.
- **Authorization is server-side and socket-bound:** LiveKit tokens are issued over the authenticated socket (membership + PIN already enforced), identity = socket id, publish only for the recorded host.
- **Media never touches signaling.** Watch rooms: host uploads once to the SFU (simulcast/dynacast), E2EE frames. Meet: SFU when `VITE_MEET_SFU=true`, mesh fallback.
- **AI runs at the edge (the viewer's device)**, so cost per user is zero and audio stays private.

## Capacity (estimates; only the first row is measured)
| Quantity | Number | Basis |
|---|---|---|
| One Node process | 500 sockets, 2,500 chat deliveries/s, p95 372 ms, 157 MB, ~0.3 core | Measured (`loadtest/README.md`, generator on same machine) |
| Sockets per node (planning) | ~1,500 at 1 msg/s/client; far more at real chat rates | Extrapolated from ~0.3 core per 500 |
| 1 M concurrent users, rooms of ~5 | ~200 k rooms; ~700 nodes at the pessimistic 1 msg/s/client rate, ~100 at 0.1 msg/s | Estimate |
| **Media bandwidth (the real wall)** | 1 M viewers × ~3 Mbps ≈ **3 Tbps egress** | Estimate: signaling is cheap, media is not |

Conclusion: scale signaling with commodity nodes; the cost and engineering limit is SFU egress, so use a multi-region LiveKit deployment (or LiveKit Cloud), regional TURN on 443, and keep P2P as the free fallback. Do not quote "supports millions" until a multi-node load test at that scale has been run.

## Failure modes
| Failure | Behavior |
|---|---|
| Signaling node dies | Its rooms end; clients auto-reconnect and recreate/rejoin (LB rehashes). Accepted: rooms are ephemeral. |
| Redis down | Node keeps serving local sockets; cross-node relay resumes on reconnect. |
| SFU down | Watch: P2P fallback with a toast (and the E2EE indicator is cleared). Meet: automatic mesh fallback; verified live. |
| Host changes | LiveKit reconnects with a new token (new publish rights) and the latest rotated key, never the original fragment key. |
| Share clicked before SFU ready | Waits (up to 15 s) instead of silently choosing P2P. |
| Hostile client | Rate limits, caps, size limits, server-side authz; see `THREAT_MODEL.md`. |
| Probe without Origin header | `/health`, `/healthz`, `/metrics` exempt from CORS (found by running the manifests). |

## Operability
- `/healthz` (liveness/readiness), `/metrics` (Prometheus: `rooms_active`, `meets_active`, `sockets_connected`, `token_requests_total` + process metrics; bearer token optional).
- Graceful shutdown tells clients to reconnect; k8s `terminationGracePeriodSeconds: 15`.
- Suggested SLOs: signaling availability 99.9 %, join p95 < 3 s, chat fan-out p95 < 500 ms at ≤ 60 % CPU, alert on `sockets_connected` per node > planned ceiling and on 5xx.
- Config is env-only (`TRUST_PROXY`, `REDIS_URL`, `MAX_*`, `METRICS_TOKEN`, `LIVEKIT_URL` vs `LIVEKIT_API_URL`).

## Key decisions
| Decision | Alternative | Why / cost |
|---|---|---|
| Room-affinity routing + Redis relay | Room registry in Redis | The registry is synchronous and used by ~740 lines of handlers; affinity preserves behavior. Cost: a node loss ends its rooms. |
| Token over socket | Open HTTP endpoint | Removes a multi-node PIN bypass, enables server-decided publish rights and un-spoofable identity. |
| E2EE key bound to URL fragment | Server-held keys | Operator cannot read media; cost: link without `#key` is unusable. |
| On-device ASR | Cloud ASR | Privacy and zero marginal cost; cost: per-viewer CPU/GPU and a one-time model download. |
| Opt-in SFU for Meet | Always SFU | Safe rollout; fallback to the existing mesh. |
