# 🧠 ScreenLoop — Universal AI Context & Project Memory

> **IMPORTANT INSTRUCTION FOR ALL AI CODING ASSISTANTS**:
> Read this file **FIRST** before analyzing, modifying, or creating code in this repository.
> It summarizes architecture, structure, and rules. When it disagrees with the code, the code wins — and please fix this file.

---

## 1. Project Overview & Philosophy

**ScreenLoop** is an open-source, zero-friction watch party, screen sharing and video meeting web platform.

- **Watch Party (`/room/:id`)**: host shares once; a **LiveKit SFU** fans out to viewers. Automatic **P2P WebRTC mesh fallback** when LiveKit is not configured or unreachable.
- **Video Meet (`/meet/:id`)**: multi-tile call over a **P2P WebRTC mesh** (`useMeetRTC`), with lobby, device switching, screen share, reactions, hand raise and chat.

### Core Tenets
1. **Zero registration / zero accounts**: no database, no passwords, no email. Rooms are ephemeral, in server memory.
2. **The signaling server never handles media.** Media goes through LiveKit or directly between peers.
3. **Cinema-grade audio**: `CINEMA_AUDIO_PRESET` (48 kHz stereo, echo cancellation / noise suppression / AGC off) in `client/src/utils/audioPresets.js`.
4. **Chat is end-to-end encrypted** with AES-256-GCM (Web Crypto). The key lives only in the URL `#hash`. **Watch-room media is E2EE when the link carries the `#key`** (LiveKit ExternalE2EEKeyProvider; verified live); Meet and the P2P fallback are DTLS-SRTP only. A kick is not a ban. Do not claim more than `docs/VERIFICATION.md` supports.
5. **No CSS frameworks**: vanilla CSS with tokens in `client/src/styles/tokens.css`. Never add Tailwind, Bootstrap or Material UI.

---

## 2. Repository Structure

```
ScreenLoop/
├── .github/        workflows (ci, codeql), issue forms, PR template, dependabot
├── client/         React 18 + Vite frontend
│   └── src/
│       ├── pages/        Home, Room, MeetLanding, MeetRoom + info pages
│       ├── components/   ControlBar, VideoPlayer, ChatSidebar, ShareModal, CaptionsLayer, ...
│       │   └── meet/     MeetGrid, MeetTile, MeetLobby, MeetControlBar, drawers, reactions
│       ├── hooks/        useSignalingSocket, useRoom, useLiveKitRoom, useWebRTC, useMeetRTC,
│       │                 useMeetLiveKit, useLiveCaptions, useMediaKeyRotation, ...
│       ├── ai/           on-device captions: audioChunker, captionWorker, recap, support
│       ├── utils/        crypto, audioPresets, mediaKeyCoordinator, sfuToken, meshFallback, ...
│       ├── data/         changelog.js, roadmap.js (feed the public pages)
│       └── styles/       tokens + per-area vanilla CSS
├── server/         Express + Socket.IO signaling
│   ├── src/        index, socketHandlers, roomManager, rateLimiter, livekitToken, livekitAdmin,
│   │               redisAdapter, metrics, logger
│   └── __tests__/
├── deploy/         nginx + Kubernetes manifests (k8s not applied to a cluster)
├── docs/           SYSTEM_DESIGN, THREAT_MODEL, VERIFICATION, AI_EVAL, CASE_STUDY
├── e2e/ loadtest/  live browser suite and socket load test
└── ARCHITECTURE, CHANGELOG, CONTRIBUTING, DEPLOYMENT, SECURITY, README (root)
```

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| Frontend | React 18, react-router-dom 6, Vite 5, vite-plugin-pwa, Vitest + jsdom |
| UI | Vanilla CSS + custom properties, `@phosphor-icons/react`, `framer-motion`, `canvas-confetti` |
| Media | `livekit-client`, `@livekit/components-react`, WebRTC (`RTCPeerConnection`), Web Audio API |
| Signaling | Socket.IO 4, Express 4, Pino |
| LiveKit | `livekit-server-sdk` (JWT minting over the `sfu:token` socket event); LiveKit Cloud or Docker |
| Crypto | Web Crypto API: AES-256-GCM (chat), ECDH P-256 + HKDF + AES-GCM (media key delivery) |
| Deploy | Vercel (client), Render (server), `docker-compose.yml` (full stack) |
| CI | GitHub Actions: tests on Node 18.x/20.x, build, server smoke test, CodeQL |

---

## 4. Key Contracts

### Chat key flow
Host generates a 256-bit AES-GCM key → placed in URL hash `/room/ID#KEY` → browsers never transmit the fragment → messages are encrypted client-side and the server relays ciphertext only.

### Socket events (see `server/src/socketHandlers.js`)
- Rooms: `room:create`, `room:join`, `room:kick`, `room:transfer-host`, `room:host-only-toggle`, `room:reaction`
- WebRTC relay: `webrtc:offer`, `webrtc:answer`, `webrtc:ice`, `webrtc:stop` → `webrtc:stream-end`
- Sync / annotation: `sync:play|pause|seek`, `sync:pointer|draw|clear-draw`
- Chat: `chat:message|typing|edit|delete`
- Meet: `meet:join|signal|state-change|reaction|chat|leave`

### HTTP
`GET /health`, `GET /healthz`, `GET /metrics`, `GET /api/rooms` (off in production by default). LiveKit tokens are issued over the socket (`sfu:token`), not HTTP.

---

## 5. AI Engineering Rules

1. **No heavy CSS frameworks.** Use the tokens in `client/src/styles/tokens.css`.
2. **Never route media through the signaling server.**
3. **Keep zero-account privacy**: no registration, no database requirement, no login gates.
4. **Preserve CSP**: when adding external assets/workers, keep `vercel.json` and `client/vercel.json` directives valid.
5. **Don't overclaim security**: chat is E2EE; watch-room media is E2EE only with the `#key`; Meet and the P2P fallback are not. Cite `docs/VERIFICATION.md`.
6. **Always run and verify**:
   - `cd server && npm test` (Vitest)
   - `cd client && npm test` (Vitest)
   - `cd client && npm run build` and `npm run lint`
   CI runs the client on Node 18 and 20, so avoid relying on globals that only exist in newer Node.
7. **Never commit `.env` files**; only `.env.example` templates are tracked.

---

## 6. Status and open work

Shipped: watch rooms (SFU + P2P fallback), Meet (mesh, opt-in SFU), E2EE chat, watch-room media E2EE with key rotation, Redis scale-out, on-device captions and recap, described-audio track (SFU only, not browser-tested).

Open (needs real devices or a human):
- NVDA/screen-reader pass on Room and Meet.
- Caption benchmark on real human speech (only 4 synthetic clips measured; pooled WER 16.4 %).
- 12-tab Meet check; `deploy/k8s/` never applied to a cluster.
- Meet is dark-only; Meet is not frame-encrypted; mixed SFU/mesh Meet clients do not interoperate.

---

<div align="center">
  <sub>ScreenLoop Project Memory • Keep this file in sync with the code.</sub>
</div>
