# Verification log

Environment: Windows 11, Chrome (headless, fake camera/mic), LiveKit v1.13.11 in Docker, Node 25. Scripts: `e2e/`. Nothing here was run on a phone, Firefox/Safari, or on more than one machine.

## Live (real browser + real LiveKit)
| Claim | Result |
|---|---|
| Meet on the SFU: 3 tabs each decode 3 tiles | PASS; LiveKit lists 3 participants with 2 tracks each; 2 after one leaves |
| SFU unavailable: Meet falls back to the mesh | PASS after fixing a join-order race the first run exposed (was 1/2/2 tiles, now 3/3/3) |
| Watch-room frames are end-to-end encrypted | PASS: keyed viewers decode; a viewer without the `#key` decodes 0 frames |
| Only the host can publish | PASS: LiveKit reports 1 publisher; viewers `canPublish=false` |
| LiveKit identity = signaling socket id | PASS |
| Kick: key rotates, remaining viewer keeps decoding | PASS |
| Kicked user removed from the SFU by the server | PASS |
| Late joiner (URL key only) receives the current key | PASS |
| Same suite through nginx + 3 Docker signaling nodes + Redis + LiveKit | PASS |
| Captions on the E2EE-decrypted SFU stream | PASS (below) |

## Bugs that only live testing found
1. `docker-compose.yml` could never start LiveKit (`LIVEKIT_KEYS` needs `key: secret` with a space); also handed browsers an unreachable container hostname.
2. Meet mesh fallback missed peers depending on join order.
3. Clicking **Share** before the SFU connected silently used P2P (no SFU, no E2EE) for the whole session.
4. `/healthz` and `/metrics` returned 500 in production because CORS rejected requests with no `Origin` (every LB/k8s probe).
5. The `e2e` run showed per-IP limits keyed on the proxy address (fixed earlier) and, with the independent review, a multi-node PIN bypass.

## Caption benchmark (see `docs/AI_EVAL.md`)
Single clean synthetic-speech clip, so it shows the pipeline works, not general accuracy.

## Not verified
Firefox/Safari/mobile; WebGPU vs WASM backend split (Chrome reported `navigator.gpu` present, the worker picks WebGPU then); real network loss/latency; Kubernetes manifests (compose and nginx were run, `deploy/k8s/` was not); more than 3 nodes; the 1 M-user design target.
