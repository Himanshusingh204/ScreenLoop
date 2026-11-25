# Threat model

Scope: signaling server (`server/`), web client (`client/`), LiveKit SFU, Redis, load balancer. Method: STRIDE over each trust boundary.
"Verified live" means exercised against real Chrome + a real LiveKit server (`docs/VERIFICATION.md`); "unit" means covered by automated tests only.

## Assets
| Asset | Why it matters |
|---|---|
| Room link incl. `#key` | The only credential: it grants entry and the media/chat key. The fragment is never sent to any server. |
| Media frames | Screen + audio of the host. |
| Chat | AES-256-GCM, key from the fragment. |
| Host authority | Controls kick, sync, publishing. |
| Availability | Rooms are ephemeral but must survive abuse and node loss. |

## Trust boundaries
Browser ⇄ LB/signaling (Socket.IO) · Browser ⇄ SFU (WebRTC) · Signaling ⇄ SFU (admin API) · Signaling ⇄ Redis · Browser ⇄ Hugging Face CDN (caption model download only).
Honest-but-curious operator assumption: whoever runs signaling usually also runs the SFU, so media E2EE exists precisely so the SFU forwards ciphertext.

## STRIDE
| # | Threat | Mitigation (where) | Status |
|---|---|---|---|
| S1 | Join a PIN-protected room without the PIN | PIN checked at `room:join`; LiveKit tokens are minted only for sockets that are already members (`sfu:token`, `socketHandlers.js`). The open `/api/token` HTTP endpoint was removed because on multi-node it could be answered by a node that did not hold the room, skipping the PIN check. | Verified live |
| S2 | Impersonate another participant's tile / identity | LiveKit identity = authenticated socket id, set server-side; clients cannot choose it (`utils/sfuTracks.js` reads `identity`, not metadata). | Verified live |
| S3 | Shadow room: create same-named room on another node and hear/forge the real one via the Redis adapter | `roomBindingOk`: create/join/meet:join must match the handshake `?room=`; required when `REDIS_URL` is set. Meet Socket.IO rooms are namespaced `meet:` so a meet and a watch room never share a channel. | Unit |
| S4 | Spoof client IP to dodge rate limits / PIN lockout | `TRUST_PROXY` uses the **rightmost** `X-Forwarded-For` hop; shipped nginx overwrites the header with `$remote_addr`. | Unit |
| T1 | Viewer injects their own stream into the SFU | Token grants `canPublish` only to the server-recorded host; `canPublishData=false` for all. | Verified live (LiveKit reports one publisher) |
| T2 | Tamper with / forge a rotated media key | Key wrapped per recipient: ECDH P-256 → HKDF-SHA256 salted with the room key → AES-GCM. A signaling server that swaps public keys lacks the room key, so it can neither unwrap nor forge. Rotations carry an epoch; older epochs are ignored. Server enforces host-only `e2ee:rekey` and field/size limits. | Unit |
| T3 | Tamper with chat | AES-GCM authenticated encryption. | Unit |
| R1 | Repudiation of kicks / abuse | Structured pino logs for joins, kicks, blocked origins. No durable audit store (ephemeral rooms by design). | Residual |
| I1 | SFU/operator reads media | LiveKit `ExternalE2EEKeyProvider` with the fragment-derived key; viewer without the key gets undecodable frames. | Verified live (keyless viewer decoded 0 frames) |
| I2 | Removed user keeps reading media | Host rotates the key on kick; server also disconnects the user from the SFU (`livekitAdmin.removeParticipant`). | Verified live |
| I3 | Audio sent to a third party for captions | Whisper runs in a Web Worker; no audio or transcript leaves the device. Only the model weights are downloaded. | By design |
| I4 | Metrics leak | `/metrics` requires `Authorization: Bearer $METRICS_TOKEN` when set; also block at ingress. | Unit |
| D1 | Connection / event flood | Per-IP connection cap, per-IP event rate limit (including `e2ee:hello`), 1 MB socket payload cap, PIN lockout, room and participant caps. | Unit + load test |
| D2 | Join storm to one room | Token issuance goes through the same spam limiter; room affinity keeps a room on one node. | Unit |
| D3 | One bad caption window kills captions | Only a failed model load is fatal; bad windows are skipped. Worker backlog capped at 2. | Unit |
| D4 | Redis outage | Adapter has error listeners; node keeps serving local sockets. | Unit |
| E1 | Guest acts as host (sync, kick, rekey) | Host checks server-side on every privileged event. | Unit |
| E2 | XSS via names / chat / captions | Text-only rendering, `sanitizeText`, 500-char caps; CSP restricts scripts (`'wasm-unsafe-eval'` added only for the caption model). | Unit |

## Known limitations (accepted, documented)
1. **A kick is not a ban.** The link is the credential: a removed user who rejoins with the full link is given the current key. Banning without accounts would need an IP/device ban list with NAT collateral damage.
2. **The signaling server can see who is in which room** (names, socket ids, public keys) and can deny service. It cannot read media or chat, or forge media keys.
3. **First-use trust:** if a room link is shared without its `#key`, that room is not end-to-end encrypted for the keyless joiner (they see nothing, but also protect nothing).
4. **Browsers without insertable-streams support** cannot decode an encrypted stream.
5. **Mixed Meet modes** (SFU vs mesh fallback) do not interoperate; Meet frames are not E2EE-encrypted.
6. **TURN/UDP exposure** is whatever LiveKit exposes; deploy LiveKit with TLS and restricted UDP ranges in production.
7. **Dependency risk:** `npm audit` is run in CI (see `.github/workflows/ci.yml`).

## Review history
An independent reviewer found 3 critical and 6 important issues on the first version of this branch (PIN bypass on multi-node, shadow rooms, spoofable `X-Forwarded-For`, spoofable tiles, room-name collisions, key loss on host change, unauthenticated key relay, false E2EE toast, Firefox crash). All were fixed with tests; two further bugs were found by live testing (mesh fallback race, Share-before-SFU silently falling back to P2P) plus a probe/CORS bug found by running the deploy manifests.
