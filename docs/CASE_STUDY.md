# Case study: scaling a zero-account watch-party app and adding private AI captions

## Problem
Screenloop lets people watch together with no account. Two gaps: (1) one in-memory Node process was the ceiling, and (2) viewers who are deaf, hard of hearing, or non-native speakers had no captions, while cloud captioning would send everyone's audio to a third party and break the privacy promise.

## What was built
**Scale-out.** Redis adapter (opt-in), `/healthz` and Prometheus `/metrics`, and room-affinity routing (nginx / k8s ingress hashing `?room=`). Measured baseline on one Node process: 500 sockets, 2,500 chat deliveries/s, 100% delivered, p95 372 ms, 157 MB (`loadtest/README.md`; the load generator shared the machine).
**Meet on the SFU (opt-in, `VITE_MEET_SFU=true`).** `useMeetLiveKit` publishes each user's tracks once to LiveKit (simulcast/dynacast) and maps SFU participants back to signaling presence through a `socketId` carried in token metadata; if the SFU is unreachable it falls back to the P2P mesh.
**Media E2EE.** Watch-room frames are encrypted with LiveKit's `ExternalE2EEKeyProvider` using the URL-fragment key. On a kick the host mints a new key and wraps it per recipient (ECDH P-256 + AES-GCM) because the room key is already known to the person being removed; the server relays opaque bytes and enforces host-only rekeys.
**On-device AI.** Whisper-tiny runs in a Web Worker (WebGPU, WASM fallback). Audio is resampled to 16 kHz, cut into 5 s windows, transcribed, and rendered as ARIA-live captions. Optional English translation (Whisper's translate task) and an extractive recap (TextRank-style sentence scoring) download as Markdown. No audio or text is sent anywhere.

## Decisions and trade-offs
| Decision | Alternative | Why |
|---|---|---|
| On-device ASR | Cloud ASR API | Preserves "no audio leaves the device"; no per-minute cost at any user count; costs each viewer CPU and a one-time model download |
| Room-affinity routing | Move room state into Redis | Registry is synchronous and used by ~740 lines of handlers; affinity keeps behavior identical. Cost: a node crash ends its rooms (they are ephemeral) |
| Each viewer transcribes locally | Host transcribes and broadcasts | No new server events, no abuse surface, no trust in the host's text |
| Extractive recap | On-device LLM | No extra model download; honest about being a summary of what was said, not an abstraction |

## A bug found on the way
Every per-IP limit (5 connections, spam, PIN lockout) read the socket's peer address. Behind any load balancer that is one shared IP, so the whole fleet would share 5 connections. Fixed with a proxy-aware key that trusts `X-Forwarded-For` only when `TRUST_PROXY=true` (test-covered); the caps are now env-configurable.

## What is not done (be honest)
- Meet-on-SFU and media E2EE are implemented and unit-tested at the logic level (token mapping, track reducers, key wrapping, rotation protocol, server relay) but have **never run against a live LiveKit server**. Mixed modes do not interoperate: a Meet participant whose SFU connected cannot see one who fell back to the mesh.
- A kick is not a ban: the link is the credential, so a removed user who rejoins with it gets the current key. Viewers on browsers without insertable-streams support cannot decode an encrypted stream.
- The multi-node path is tested with a mock Redis; the docker-compose and k8s manifests were not run (no Docker daemon available when written).
- The caption model has not been benchmarked in a browser (`docs/AI_EVAL.md`).
- "Millions of users" is a design direction; the only measured number is the single-node baseline above.
