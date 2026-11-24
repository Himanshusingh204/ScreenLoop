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
4. **Chat is end-to-end encrypted** with AES-256-GCM (Web Crypto). The key lives only in the URL `#hash`. **Media is not E2EE** (DTLS-SRTP in transit; the SFU can access media). Media E2EE via Insertable Streams is planned, not built.
5. **No CSS frameworks**: vanilla CSS with tokens in `client/src/styles/tokens.css`. Never add Tailwind, Bootstrap or Material UI.

---

## 2. Repository Structure

```
ScreenLoop/
├── .github/                 # workflows (ci.yml, codeql.yml), issue forms, PR template, dependabot
├── client/                  # React 18 + Vite 5 frontend
│   ├── public/              # logo, og-image, pwa icon, hero image, robots.txt
│   └── src/
│       ├── pages/           # Home, Room, MeetLanding, MeetRoom + info pages (Features, Security, About,
│       │                    #   Help, Privacy, Terms, Accessibility, Changelog, Roadmap, Contact, NotFound)
│       ├── components/      # SiteHeader/Footer, ControlBar, VideoPlayer, ChatSidebar, ShareModal, JoinModal,
│       │   │                #   AnnotationCanvas, CursorOverlay, StatsOverlay, LiveKitRoomWrapper, ...
│       │   ├── meet/        # MeetGrid, MeetTile, MeetLobby, MeetControlBar, MeetDeviceModal,
│       │   │                #   MeetChatDrawer, MeetPeopleDrawer, MeetReactions
│       │   └── icons/       # central Phosphor icon exports
│       ├── hooks/           # useSignalingSocket, useRoom, useLiveKitRoom, useWebRTC, useWebRTCStats,
│       │                    #   useMeetRTC, useMediaDevices, useActiveSpeaker, useScreenRecording,
│       │                    #   useWakeLock, useNetworkStatus, useSoundEffects, useScrollReveal
│       ├── utils/           # crypto, audioPresets, audioBooster, roomId, sanitizer, linkify, recentRooms,
│       │                    #   formatTime, webrtcConfig, confetti, sfxSynth, viewTransition (+ __tests__/)
│       ├── data/            # changelog.js, roadmap.js (feed the public pages)
│       ├── styles/          # tokens, base, components, utilities, responsive, home, room, meet, pages,
│       │                    #   home-redesign, room-redesign
│       └── test/setup.js    # Vitest setup (localStorage + WebCrypto shims for CI Node versions)
├── server/                  # Node.js Express + Socket.IO
│   ├── src/                 # index.js, socketHandlers.js, roomManager.js, rateLimiter.js,
│   │                        #   livekitToken.js, logger.js
│   └── __tests__/           # roomManager, rateLimiter, socketHandlers, livekitToken
├── docs/                    # FILE_STRUCTURE, SFU_DESIGN, AUTH_DESIGN* , DATABASE_DESIGN*  (*proposals only)
├── ARCHITECTURE.md  CHANGELOG.md  CONTRIBUTING.md  CODE_OF_CONDUCT.md  DEPLOYMENT.md
├── MASTER_PLAN_NEW.md  PROJECT_MEMORY.md  README.md  SECURITY.md  LICENSE
└── docker-compose.yml  render.yaml  vercel.json  package.json
```

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| Frontend | React 18, react-router-dom 6, Vite 5, vite-plugin-pwa, Vitest + jsdom |
| UI | Vanilla CSS + custom properties, `@phosphor-icons/react`, `framer-motion`, `canvas-confetti` |
| Media | `livekit-client`, `@livekit/components-react`, WebRTC (`RTCPeerConnection`), Web Audio API |
| Signaling | Socket.IO 4, Express 4, Pino |
| LiveKit | `livekit-server-sdk` (JWT minting at `POST /api/token`); LiveKit Cloud or Docker |
| Crypto | Web Crypto API, AES-256-GCM (chat only) |
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
`GET /health`, `GET /api/rooms` (off in production by default), `POST /api/token`.

---

## 5. AI Engineering Rules

1. **No heavy CSS frameworks.** Use the tokens in `client/src/styles/tokens.css`.
2. **Never route media through the signaling server.**
3. **Keep zero-account privacy**: no registration, no database requirement, no login gates.
4. **Preserve CSP**: when adding external assets/workers, keep `vercel.json` and `client/vercel.json` directives valid.
5. **Don't overclaim security**: media is not end-to-end encrypted; only chat is.
6. **Always run and verify**:
   - `cd server && npm test` (Vitest)
   - `cd client && npm test` (Vitest)
   - `cd client && npm run build` and `npm run lint`
   CI runs the client on Node 18 and 20, so avoid relying on globals that only exist in newer Node.
7. **Never commit `.env` files**; only `.env.example` templates are tracked.

---

<div align="center">
  <sub>ScreenLoop Project Memory • Keep this file in sync with the code.</sub>
</div>
