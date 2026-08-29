# 🧠 ScreenLoop — Universal AI Context & Project Memory

> **IMPORTANT INSTRUCTION FOR ALL AI CODING ASSISTANTS**:
> Read this file **FIRST** before analyzing, modifying, or creating code in this repository.
> This document is the single source of truth for ScreenLoop's architecture, file structure, technology choices, signaling protocols, and design patterns.

---

## 1. Project Overview & Philosophy

**ScreenLoop** is an open-source, zero-friction peer-to-peer watch party, screen sharing, and video collaboration web platform.

### Core Tenets:
1. **Zero Registration / Zero Accounts**: No databases, no passwords, no email collection. Rooms are ephemeral and created on-demand.
2. **Direct Peer-to-Peer Media (WebRTC Mesh)**: Video and audio never touch or transit the server. The Node.js server acts strictly as a lightweight signaling coordinator.
3. **Cinema-Grade Audio Pass-Through**: Bypasses browser voice suppression and echo cancellation so movie soundtracks, explosions, and music stream with full stereo fidelity.
4. **Client-Side Cryptographic Security**: Chat messages are encrypted using **AES-256-GCM** via the Web Crypto API (`window.crypto.subtle`). The 256-bit key resides only in the URL `#hash` fragment and is never sent across the network to servers (per RFC 3986).
5. **No Third-Party CSS Frameworks**: Built using pure vanilla CSS with custom CSS tokens, glassmorphism, and dynamic themes. **Never introduce TailwindCSS, Bootstrap, or Material UI.**

---

## 2. Complete Repository File Structure

```
ScreenLoop/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml             # Structured YAML bug report form
│   │   ├── feature_request.yml        # Structured YAML feature request form
│   │   └── config.yml                 # Issue configuration & security link
│   ├── workflows/
│   │   ├── ci.yml                     # Node 18/20 client & server build/test pipeline
│   │   └── codeql.yml                 # Automated CodeQL static security analysis
│   ├── PULL_REQUEST_TEMPLATE.md       # Standardized PR checklist & test proof
│   └── dependabot.yml                 # Weekly npm and GitHub Action dependency bot
│
├── client/                            # React 18 frontend (Vite 5)
│   ├── public/
│   │   ├── logo.svg                   # Brand vector logo
│   │   ├── Logo.png                   # High-res raster brand mark
│   │   ├── og-image.png               # Social preview card
│   │   ├── pwa-icon.svg               # PWA app icon
│   │   └── robots.txt                 # Search engine directives
│   ├── src/
│   │   ├── components/                # Reusable UI widgets & modals
│   │   │   ├── icons/index.js         # Centralized Phosphor Icons export
│   │   │   ├── AnnotationCanvas.jsx   # Live on-screen drawing & laser pointer
│   │   │   ├── ChatSidebar.jsx        # Encrypted chat, emoji picker, participant list
│   │   │   ├── ConfirmModal.jsx       # Universal confirmation dialog
│   │   │   ├── ControlBar.jsx         # Bottom video playback & reaction controls
│   │   │   ├── CursorOverlay.jsx      # Synchronized multi-user laser pointers
│   │   │   ├── ErrorBoundary.jsx      # Top-level React error catch boundary
│   │   │   ├── GradientBackground.jsx # Dynamic ambient glow canvas
│   │   │   ├── JoinModal.jsx          # PIN / password entry dialog
│   │   │   ├── Loader.jsx             # Glassmorphic loading spinner
│   │   │   ├── LogoBrand.jsx          # Branded vector header component
│   │   │   ├── ParticipantList.jsx    # User avatars, host badges, kick buttons
│   │   │   ├── ReactionOverlay.jsx    # Floating animated emoji reactions
│   │   │   ├── RouteErrorBoundary.jsx # Isolated route-level error boundary
│   │   │   ├── ShareModal.jsx         # 1-click room link & QR code generator
│   │   │   ├── SiteFooter.jsx         # Universal footer navigation
│   │   │   ├── SiteHeader.jsx         # Universal header navbar
│   │   │   ├── StatsOverlay.jsx       # Real-time WebRTC diagnostics HUD (FPS, Bitrate)
│   │   │   ├── ThemeSelector.jsx      # Theme switcher (Midnight, OLED, Cyber, etc.)
│   │   │   ├── Toast.jsx              # Floating notification toasts
│   │   │   ├── TopBar.jsx             # Active room header, participant counter, quality
│   │   │   └── VideoPlayer.jsx        # Stream player with volume booster hookup
│   │   ├── data/
│   │   │   ├── changelog.js           # Version history data for /changelog
│   │   │   └── roadmap.js             # Public milestone roadmap data
│   │   ├── hooks/
│   │   │   ├── index.js               # Central hook exports
│   │   │   ├── useNetworkStatus.js    # Online/offline network detector
│   │   │   ├── useRoom.js             # Socket.io room state, participants, and chat
│   │   │   ├── useScreenRecording.js  # Client-side MediaRecorder capture
│   │   │   ├── useScrollReveal.js     # Framer Motion scroll animations
│   │   │   ├── useSoundEffects.js     # Web Audio SFX synthesizer
│   │   │   ├── useWakeLock.js         # Screen Wake Lock API
│   │   │   ├── useWebRTC.js           # Multi-peer WebRTC mesh coordinator
│   │   │   └── useWebRTCStats.js      # RTCStatsReport telemetry parser
│   │   ├── pages/
│   │   │   ├── About.jsx              # /about - Project background & architecture
│   │   │   ├── Accessibility.jsx      # /accessibility - WCAG 2.1 AA statement
│   │   │   ├── Changelog.jsx          # /changelog - Release timeline
│   │   │   ├── Contact.jsx            # /contact - Support & GitHub channels
│   │   │   ├── Features.jsx           # /features - Interactive feature catalog
│   │   │   ├── Help.jsx               # /help - FAQ & troubleshooting
│   │   │   ├── Home.jsx               # / - Room launcher & recent rooms history
│   │   │   ├── NotFound.jsx           # 404 handler with auto-redirect
│   │   │   ├── Privacy.jsx            # /privacy - Data handling guarantees
│   │   │   ├── Roadmap.jsx            # /roadmap - Kanban development board
│   │   │   ├── Room.jsx               # /room/:roomId - Watch party master orchestrator
│   │   │   ├── Security.jsx           # /security - Cryptography & threat model
│   │   │   └── Terms.jsx              # /terms - Acceptable use policy
│   │   ├── styles/
│   │   │   ├── base.css               # Reset, typography, body base styles
│   │   │   ├── components.css         # Buttons, cards, form inputs, badges
│   │   │   ├── home.css               # Hero section, feature preview grids
│   │   │   ├── pages.css              # Informational page layouts & tables
│   │   │   ├── responsive.css         # Mobile/tablet breakpoints
│   │   │   ├── room.css               # Theater mode, video grid, chat drawer
│   │   │   ├── tokens.css             # CSS variables (colors, spacing, shadows)
│   │   │   └── utilities.css          # Flex, grid, animation helper classes
│   │   ├── test/setup.js              # Vitest DOM environment mocks
│   │   ├── utils/
│   │   │   ├── __tests__/             # Unit test suites (formatTime, sanitizer, etc.)
│   │   │   ├── audioBooster.js        # Web Audio API GainNode compressor
│   │   │   ├── confetti.js            # Canvas Confetti burst trigger
│   │   │   ├── crypto.js              # AES-256-GCM subtle crypto routines
│   │   │   ├── formatTime.js          # Timestamp formatting
│   │   │   ├── linkify.js             # URL detection & sanitization in chat
│   │   │   ├── recentRooms.js         # LocalStorage room history manager
│   │   │   ├── roomId.js              # Cryptographically secure room code generator
│   │   │   ├── sanitizer.js           # XSS HTML entity escaper
│   │   │   ├── sfxSynth.js            # Synthetic audio chimes
│   │   │   └── viewTransition.js      # Document View Transitions API
│   │   ├── App.jsx                    # Route switchboard & layout providers
│   │   ├── index.css                  # Global root styles & CSS imports
│   │   └── main.jsx                   # React 18 root mount
│   ├── .eslintrc.cjs                  # ESLint configuration
│   ├── package.json                   # Client dependencies & scripts
│   ├── vercel.json                    # Client-specific CSP & routing rules
│   └── vite.config.js                 # Vite bundler, PWA plugin, Vitest config
│
├── server/                            # Node.js Socket.IO signaling service
│   ├── src/
│   │   ├── index.js                   # Express server, health check, Socket.io bootstrap
│   │   ├── logger.js                  # Pino structured JSON logger
│   │   ├── rateLimiter.js             # IP & Socket sliding-window anti-spam
│   │   ├── roomManager.js             # In-memory ephemeral room registry
│   │   └── socketHandlers.js          # WebRTC SDP/ICE relay, chat, drawing events
│   ├── __tests__/                     # Vitest server integration test suites
│   ├── package.json                   # Server dependencies & scripts
│   └── vitest.config.js               # Server Vitest configuration
│
├── ARCHITECTURE.md                    # Deep-dive engineering specification
├── CHANGELOG.md                       # Semantic version history (Keep a Changelog)
├── CODE_OF_CONDUCT.md                 # Contributor Covenant v2.1
├── CONTRIBUTING.md                    # Branching, testing & PR rules
├── LICENSE                            # MIT License
├── PROJECT_MEMORY.md                  # THIS FILE — Canonical AI context & rules
├── README.md                          # Public GitHub landing documentation
├── render.yaml                        # Turnkey Render Blueprint deployment specification
├── SECURITY.md                        # Security policy & private vulnerability reporting
├── vercel.json                        # Root Vercel deployment specification
└── VIDEO_CALL_MASTER_PLAN.md          # Google Meet-style video calling architecture
```

---

## 3. Technology Stack Reference

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 18 (`react`, `react-dom`, `react-router-dom` v6) |
| **Build & Tooling** | Vite 5, `vite-plugin-pwa`, Vitest |
| **Icons & Animation** | `@phosphor-icons/react`, `framer-motion`, `canvas-confetti` |
| **Styling** | Vanilla CSS3, CSS Custom Properties (`tokens.css`), Glassmorphism |
| **Real-time Signaling** | Socket.IO client & server (`v4.7.4`), WebSockets |
| **Media & Audio Engine** | WebRTC (`RTCPeerConnection`), Web Audio API (`AudioContext`, `GainNode`) |
| **Cryptography** | Web Crypto API (`crypto.subtle` AES-256-GCM) |
| **Backend Runtime** | Node.js (>=18.0.0), Express 4, Pino Logger |
| **Deployment Targets** | **Frontend**: Vercel (`vercel.json`) \| **Signaling Server**: Render (`render.yaml`) |

---

## 4. Key Architectural Patterns & Contracts

### 4.1 Cryptographic Key Flow (Zero-Knowledge)
1. **Generation**: Host generates 256-bit AES-GCM key in browser via `crypto.subtle.generateKey`.
2. **Key Storage in URL**: Key is serialized into URL hash: `https://domain.com/room/abc-123#SECRET_KEY`.
3. **Network Isolation**: Per RFC 3986, browser user agents **never** transmit URL `#hash` fragments in HTTP requests or WebSocket handshakes.
4. **Chat Encryption**: Messages are encrypted locally before being emitted over Socket.IO. The server only sees ciphertext. Connected peers decrypt locally using the key in their URL hash.

### 4.2 WebRTC Signaling Protocol
The server never decodes or transacts audio/video frames. It routes these Socket.IO events:
- `room:create`: `{ roomId, pin, name, gender }`
- `room:join`: `{ roomId, pin, name, gender }`
- `webrtc:offer`: `{ to, offer }` (SDP offer forwarded to specific peer)
- `webrtc:answer`: `{ to, answer }` (SDP answer forwarded back)
- `webrtc:ice`: `{ to, candidate }` (ICE candidate exchange)
- `chat:message`: Encrypted payload forwarded to same-room sockets
- `draw:stroke` / `cursor:move`: Real-time canvas annotation coordinates

---

## 5. AI Engineering Rules (Do NOT Violate)

1. **Never Introduce Heavy CSS Frameworks**: Do not install Tailwind, Bootstrap, or component UI kits. Always use the established CSS variables in `client/src/styles/tokens.css`.
2. **Never Route Media Through the Server**: Do not attempt to process video or audio streams on the Node.js server. Keep all media strictly peer-to-peer over WebRTC.
3. **Maintain Zero-Account Privacy**: Do not add user registration tables, database requirements, or mandatory login gates.
4. **Preserve Content-Security-Policy (CSP)**: Whenever adding external assets or workers, ensure `vercel.json` and `client/vercel.json` CSP directives (`script-src`, `worker-src`, `connect-src`) remain valid.
5. **Always Run & Verify Tests**:
   - Client tests: `cd client && npm test`
   - Server tests: `cd server && npm test`
   - Client build: `cd client && npm run build`

---

<div align="center">
  <sub>ScreenLoop Project Memory • Maintained for seamless multi-agent and human developer continuity.</sub>
</div>
