# Screenloop — Architecture

> Current architecture of Screenloop: a zero-account watch-party and video-meeting platform.
> Source of truth is the code; this document describes it as of the LiveKit SFU integration.

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Two Media Paths](#2-two-media-paths)
3. [Signaling Server](#3-signaling-server)
4. [Socket Events](#4-socket-events)
5. [Client Structure](#5-client-structure)
6. [Encryption Model](#6-encryption-model)
7. [Security Layers](#7-security-layers)
8. [Room Lifecycle](#8-room-lifecycle)
9. [Deployment](#9-deployment)
10. [Development Guide](#10-development-guide)

---

## 1. System Overview

```
┌──────────────────────── Client (React 18 + Vite) ─────────────────────────┐
│  /room/:id  Watch Party      /meet/:id  Video Meet      static info pages │
│  useLiveKitRoom + useWebRTC   useMeetRTC (mesh)                           │
└───────┬──────────────────────────────┬─────────────────────┬──────────────┘
        │ Socket.IO (signaling, chat)  │ POST /api/token     │ wss:// media
        ▼                              ▼                     ▼
┌─────────────── Signaling Server (Node + Express + Socket.IO) ┐   ┌── LiveKit SFU ──┐
│ rooms, PIN checks, rate limits, chat relay, SDP/ICE relay,   │   │ cloud or Docker │
│ LiveKit JWT minting (livekit-server-sdk)                     │   │ 7880/7881/7882  │
└──────────────────────────────────────────────────────────────┘   └─────────────────┘
```

- **No accounts, no database.** Room state is ephemeral and held in server memory.
- The signaling server never carries media. Media flows either through LiveKit (watch rooms) or directly between peers (fallback and Meet).

## 2. Two Media Paths

| Feature | Route | Media transport | Notes |
|---|---|---|---|
| Watch Party | `/room/:roomId` | **LiveKit SFU** (host uploads once, SFU fans out) | Falls back to P2P WebRTC mesh if the token request or SFU connection fails |
| Video Meet | `/meet/:meetId` | **P2P WebRTC mesh** (`useMeetRTC`) | Signaling via `meet:*` events; no LiveKit involved |

**Watch Party flow**

1. The client calls `POST /api/token` with `roomId`, `participantName`, `pin`, `isHost`, `gender`.
2. The server verifies the room PIN (timing-safe) and mints a LiveKit JWT with `livekit-server-sdk`.
3. `useLiveKitRoom` connects to `LIVEKIT_URL` and publishes/subscribes tracks.
4. If LiveKit is unconfigured or unreachable, `useWebRTC` is used: the host sends an SDP offer per viewer (`webrtc:offer` / `webrtc:answer` / `webrtc:ice`).

**Cinema audio.** `client/src/utils/audioPresets.js` defines `CINEMA_AUDIO_PRESET` (48 kHz stereo; echo cancellation, noise suppression and auto gain off) and a voice preset for Meet. `audioBooster.js` adds a Web Audio gain stage.

**Meet.** Multi-tile grid (`MeetGrid`/`MeetTile`), active speaker detection (`useActiveSpeaker`), lobby with device preview (`MeetLobby`, `useMediaDevices`), in-call device switching (`MeetDeviceModal`), screen share, chat drawer, emoji reactions and hand raise.

## 3. Signaling Server

`server/src/`

| File | Responsibility |
|---|---|
| `index.js` | Express app, CORS allow-list, security headers, Socket.IO bootstrap, `/health`, `/api/rooms`, `/api/token`, graceful shutdown |
| `socketHandlers.js` | All Socket.IO event handlers (rooms, WebRTC relay, sync, chat, Meet) |
| `roomManager.js` | In-memory room and meet registries, PIN verification, TTL sweep, `socketToRoom` / `socketToMeet` O(1) reverse maps |
| `rateLimiter.js` | Sliding-window / leaky-bucket limits (events, room creation, PIN attempts) |
| `livekitToken.js` | LiveKit access-token minting |
| `logger.js` | Pino structured JSON logging |

**HTTP endpoints**

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe (`status`, `uptime`, `timestamp`, `version`) |
| GET | `/api/rooms` | Room listing; dev default on, production default off (`ROOM_LISTING_ENABLED`), rate limited per IP |
| POST | `/api/token` | Mint a LiveKit token after validating room ID, name and PIN |

## 4. Socket Events

| Group | Events |
|---|---|
| Rooms | `room:create`, `room:join`, `room:kick`, `room:transfer-host`, `room:host-only-toggle`, `room:reaction` |
| WebRTC relay | `webrtc:offer`, `webrtc:answer`, `webrtc:ice`, `webrtc:stop` (server broadcasts `webrtc:stream-end`) |
| Playback sync | `sync:play`, `sync:pause`, `sync:seek` |
| Annotation | `sync:pointer`, `sync:draw`, `sync:clear-draw` |
| Chat | `chat:message`, `chat:typing`, `chat:edit`, `chat:delete` |
| Meet | `meet:join`, `meet:signal`, `meet:state-change`, `meet:reaction`, `meet:chat`, `meet:leave` |

Handlers verify the sender is a member of the target room before relaying. The server resolves display names itself and never trusts a client-sent name for sync events.

## 5. Client Structure

`client/src/`

- `pages/` — `Home`, `Room`, `MeetLanding`, `MeetRoom`, and info pages (`Features`, `Security`, `About`, `Help`, `Privacy`, `Terms`, `Accessibility`, `Changelog`, `Roadmap`, `Contact`, `NotFound`).
- `components/` — shared UI (`SiteHeader`, `SiteFooter`, `ControlBar`, `VideoPlayer`, `ChatSidebar`, `ShareModal`, `JoinModal`, `AnnotationCanvas`, `StatsOverlay`, …) and `components/meet/` for the Meet UI.
- `hooks/` — `useSignalingSocket`, `useRoom`, `useLiveKitRoom`, `useWebRTC`, `useWebRTCStats`, `useMeetRTC`, `useMediaDevices`, `useActiveSpeaker`, `useScreenRecording`, `useWakeLock`, `useNetworkStatus`, `useSoundEffects`, `useScrollReveal`.
- `utils/` — `crypto` (AES-GCM), `audioPresets`, `audioBooster`, `roomId`, `sanitizer`, `linkify`, `recentRooms`, `formatTime`, `webrtcConfig` (ICE/TURN), `confetti`, `sfxSynth`, `viewTransition`.
- `styles/` — vanilla CSS with design tokens in `tokens.css`; no CSS framework.
- `data/` — `changelog.js`, `roadmap.js` feeding the public pages.

## 6. Encryption Model

**What is end-to-end encrypted: chat.**

1. The host generates a 256-bit AES-GCM key (`crypto.subtle.generateKey`) and puts it in the URL fragment: `/room/ID#KEY`.
2. Browsers never send the fragment in HTTP or WebSocket requests, so the server never sees the key.
3. Each message is encrypted with a fresh 12-byte IV; the payload is `IV || ciphertext`, base64url encoded. The server relays ciphertext only. A wrong key makes decryption return `null`.

**What is not end-to-end encrypted: media.** Audio/video is protected in transit by WebRTC DTLS-SRTP. In P2P mode that is effectively peer-to-peer; in LiveKit mode the SFU terminates DTLS-SRTP and can access media. Watch-room media-frame E2EE is **implemented but unverified against a live SFU**: `useLiveKitRoom` enables LiveKit's `ExternalE2EEKeyProvider` with the URL-fragment key, and `MediaKeyCoordinator` (`client/src/utils/mediaKeyCoordinator.js`) rotates it on a kick by wrapping a fresh key to each remaining peer's ECDH public key; the server only relays (`e2ee:hello`, `e2ee:rekey`, host-only). A viewer whose link lacks the `#key` cannot decode an encrypted stream. A kick is not a ban: the link is the credential, so a removed user who rejoins with it is given the current key. Video Meet is not frame-encrypted.

## 7. Security Layers

1. **CORS** — explicit `ALLOWED_ORIGIN` allow-list plus localhost/LAN origins; no-Origin requests allowed only outside production.
2. **Headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` disabled. Client CSP lives in `vercel.json` / `client/vercel.json`.
3. **Rate limiting** — per-IP connection cap, per-socket event limits, room-creation limits, room-listing limit.
4. **PIN brute-force protection** — attempt cap with lockout; timing-safe comparison.
5. **Input validation** — room ID format, name length, payload shape; `maxHttpBufferSize` of 1 MB.
6. **Server-side identity** — display names resolved by the server.
7. **Chat E2EE** — see section 6.

## 8. Room Lifecycle

- Created on `room:create` (host, optional PIN). Capacity: `MAX_PARTICIPANTS` (default 10); total rooms capped by `MAX_ROOMS`.
- Meets use `meet:join` with `MAX_MEET_PARTICIPANTS` (default 20).
- Empty/idle rooms are removed by a periodic sweep after `ROOM_TTL_MS` (meets: `MEET_TTL_MS`).
- Host can kick users, transfer host, or restrict controls to host only.

## 9. Deployment

| Target | Config | Notes |
|---|---|---|
| Frontend | Vercel (`vercel.json`, root dir `client`) | SPA rewrites, CSP, Permissions-Policy for camera/mic/display-capture |
| Signaling | Render (`render.yaml`, root dir `server`) | `/health` health check |
| Full stack | `docker-compose.yml` | LiveKit (7880/7881/7882-udp), server (4000), client (3000) |
| CI | `.github/workflows/ci.yml`, `codeql.yml` | Client and server tests on Node 18/20, client build, server smoke test |

Environment variables are documented in [DEPLOYMENT.md](DEPLOYMENT.md) and the `.env.example` files. TURN is optional (`VITE_TURN_*`); without it production uses STUN only.

## 10. Development Guide

```bash
npm install && npm install --prefix client && npm install --prefix server
npm run dev:server     # signaling + token server on :4000
npm run dev            # Vite client on :5173
npm test --prefix server   # Vitest (server)
npm test --prefix client   # Vitest (client, jsdom)
npm run build --prefix client
```

- **New page:** add `pages/X.jsx`, register the route in `App.jsx`, link from `SiteHeader`/`SiteFooter`.
- **New socket event:** add the handler in `server/src/socketHandlers.js` (validate membership first), add a test in `server/__tests__/`, then consume it in the relevant hook.
- **Styling:** use tokens from `styles/tokens.css`; do not add a CSS framework.
- **Icons:** export from `components/icons/index.js` (Phosphor).
