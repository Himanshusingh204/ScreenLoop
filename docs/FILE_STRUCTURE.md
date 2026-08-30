# 📁 ScreenLoop — Comprehensive File Structure & Architecture Guide

> **Document Version**: 1.0.0  
> **Target Audience**: Developers, Contributors, and AI Coding Assistants  
> **Repository**: [Himanshusingh204/ScreenLoop](https://github.com/Himanshusingh204/ScreenLoop)

---

## 📌 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Complete Visual Directory Tree](#2-complete-visual-directory-tree)
3. [Root Files & Configuration](#3-root-files--configuration)
4. [Client Architecture (`/client`)](#4-client-architecture-client)
   - [4.1 Pages (`client/src/pages`)](#41-pages-clientsrcpages)
   - [4.2 UI Components (`client/src/components`)](#42-ui-components-clientsrccomponents)
   - [4.3 Custom Hooks (`client/src/hooks`)](#43-custom-hooks-clientsrchooks)
   - [4.4 Utilities (`client/src/utils`)](#44-utilities-clientsrcutils)
   - [4.5 Styling System (`client/src/styles`)](#45-styling-system-clientsrcstyles)
   - [4.6 Data Fixtures (`client/src/data`)](#46-data-fixtures-clientsrcdata)
5. [Server Architecture (`/server`)](#5-server-architecture-server)
6. [Data & Control Flow Map](#6-data--control-flow-map)
7. [Guidelines for Adding New Code](#7-guidelines-for-adding-new-code)

---

## 1. System Architecture Overview

ScreenLoop is engineered with a strict **separation between media and signaling**:

```
                               ┌──────────────────────────────────┐
                               │     Signaling Server (Node.js)   │
                               │  Express 4 • Socket.IO 4 • Pino  │
                               │  - Ephemeral room coordination   │
                               │  - SDP Offer/Answer relay        │
                               │  - Rate limiting & anti-abuse    │
                               └────────────────┬─────────────────┘
                                                │
                                  WebSocket     │     WebSocket
                                  Signaling     │     Signaling
                                                │
                ┌───────────────────────────────┴───────────────────────────────┐
                │                                                               │
                ▼                                                               ▼
   ┌──────────────────────────┐      WebRTC P2P Mesh (Direct)      ┌──────────────────────────┐
   │     Host Web Browser     │════════════════════════════════════│    Viewer Web Browser    │
   │    (React 18 + Vite 5)   │      Encrypted Video & Audio       │    (React 18 + Vite 5)   │
   │                          │                                    │                          │
   │ • Screen Display Capture │ - - - - - - - - - - - - - - - - - >│ • MediaStream Rendering  │
   │ • Web Audio Volume Boost │   AES-256-GCM Encrypted Chat Data  │ • Web Audio Volume Boost │
   │ • Live Canvas Drawing    │< - - - - - - - - - - - - - - - - - │ • Sync Canvas Annotation │
   └──────────────────────────┘                                    └──────────────────────────┘
```

---

## 2. Complete Visual Directory Tree

```
ScreenLoop/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml             # Structured GitHub form for bug reports
│   │   ├── feature_request.yml        # Structured GitHub form for feature proposals
│   │   └── config.yml                 # Disables blank issues & links security contact
│   ├── workflows/
│   │   ├── ci.yml                     # Continuous integration build & test matrix (Node 18/20)
│   │   └── codeql.yml                 # CodeQL automated security vulnerability scanning
│   ├── PULL_REQUEST_TEMPLATE.md       # Standardized pull request review checklist
│   └── dependabot.yml                 # Automated weekly npm & GitHub action dependency updates
│
├── client/                            # React 18 frontend single-page application
│   ├── public/
│   │   ├── logo.svg                   # Vector SVG brand logo
│   │   ├── Logo.png                   # High-resolution raster brand mark
│   │   ├── og-image.png               # OpenGraph social preview banner
│   │   ├── pwa-icon.svg               # Progressive Web App home screen icon
│   │   └── robots.txt                 # Web crawler indexation rules
│   ├── src/
│   │   ├── components/                # Modular UI widgets, modals, and overlays
│   │   │   ├── icons/index.js         # Centralized export of Phosphor vector icons
│   │   │   ├── AnnotationCanvas.jsx   # Live on-screen drawing & laser pointer broadcast
│   │   │   ├── ChatSidebar.jsx        # Encrypted chat, emoji picker, participant list
│   │   │   ├── ConfirmModal.jsx       # Universal reusable modal dialog
│   │   │   ├── ControlBar.jsx         # Bottom video controls, audio boost, reactions
│   │   │   ├── CursorOverlay.jsx      # Multi-user synchronized live laser pointers
│   │   │   ├── ErrorBoundary.jsx      # Top-level React error catch boundary
│   │   │   ├── GradientBackground.jsx # Ambient animated gradient backdrop
│   │   │   ├── JoinModal.jsx          # PIN entry modal for protected rooms
│   │   │   ├── Loader.jsx             # Glassmorphic loading spinner
│   │   │   ├── LogoBrand.jsx          # Reusable vector brand badge
│   │   │   ├── ParticipantList.jsx    # User list with host badges and moderation tools
│   │   │   ├── ReactionOverlay.jsx    # Floating animated emoji reactions
│   │   │   ├── RouteErrorBoundary.jsx # Isolated boundary preventing page-level crashes
│   │   │   ├── ShareModal.jsx         # Room URL copy card with client-side QR generator
│   │   │   ├── SiteFooter.jsx         # Universal website footer navigation
│   │   │   ├── SiteHeader.jsx         # Universal top navbar with active route indicator
│   │   │   ├── StatsOverlay.jsx       # Real-time WebRTC diagnostics HUD (FPS, Bitrate, RTT)
│   │   │   ├── ThemeSelector.jsx      # Theme switcher (Midnight, OLED, Cyber, Crimson)
│   │   │   ├── Toast.jsx              # Floating toast notification renderer
│   │   │   ├── TopBar.jsx             # Active room header, participant count, quality badge
│   │   │   ├── VideoPlayer.jsx        # Video stream renderer hooked into Web Audio gain
│   │   │   └── index.js               # Centralized component export barrel
│   │   ├── data/
│   │   │   ├── changelog.js           # Version history records for /changelog
│   │   │   └── roadmap.js             # Milestone deliverables for /roadmap
│   │   ├── hooks/
│   │   │   ├── index.js               # Centralized custom hooks export barrel
│   │   │   ├── useNetworkStatus.js    # Online/offline network event listener
│   │   │   ├── useRoom.js             # Socket.IO room lifecycle, participants, and chat state
│   │   │   ├── useScreenRecording.js  # Client-side MediaRecorder capture & video download
│   │   │   ├── useScrollReveal.js     # Framer Motion scroll entrance animations
│   │   │   ├── useSoundEffects.js     # Synthetic Web Audio sound effects
│   │   │   ├── useWakeLock.js         # Screen Wake Lock API preventing display sleep
│   │   │   ├── useWebRTC.js           # Multi-peer WebRTC mesh connection coordinator
│   │   │   └── useWebRTCStats.js      # RTCStatsReport parser computing bitrate, FPS, latency
│   │   ├── pages/
│   │   │   ├── About.jsx              # /about - Project background & architecture overview
│   │   │   ├── Accessibility.jsx      # /accessibility - WCAG 2.1 AA accessibility statement
│   │   │   ├── Changelog.jsx          # /changelog - Magazine-style version history
│   │   │   ├── Contact.jsx            # /contact - Support & GitHub feedback channels
│   │   │   ├── Features.jsx           # /features - Interactive feature catalog with filters
│   │   │   ├── Help.jsx               # /help - Searchable FAQ & troubleshooting guide
│   │   │   ├── Home.jsx               # / - Room launcher, PIN configuration, recent rooms
│   │   │   ├── NotFound.jsx           # 404 - Graceful page not found with auto-redirect
│   │   │   ├── Privacy.jsx            # /privacy - Zero-data retention guarantee
│   │   │   ├── Roadmap.jsx            # /roadmap - Interactive Kanban roadmap board
│   │   │   ├── Room.jsx               # /room/:roomId - Watch party master orchestrator
│   │   │   ├── Security.jsx           # /security - Cryptographic model & threat defense
│   │   │   └── Terms.jsx              # /terms - Acceptable use terms with sticky navigation
│   │   ├── styles/
│   │   │   ├── base.css               # Reset, typography, global layout base
│   │   │   ├── components.css         # Buttons, cards, form inputs, badge styles
│   │   │   ├── home.css               # Landing page hero, cards, and animations
│   │   │   ├── pages.css              # Informational page layouts, tables, and FAQ
│   │   │   ├── responsive.css         # Breakpoint rules for tablets and mobile devices
│   │   │   ├── room.css               # Theater mode, video player, chat sidebar styles
│   │   │   ├── tokens.css             # CSS custom properties (colors, fonts, shadows)
│   │   │   └── utilities.css          # Utility helper classes (flex, grid, spacers)
│   │   ├── test/
│   │   │   └── setup.js               # Vitest browser API polyfills (MediaStream, AudioContext)
│   │   ├── utils/
│   │   │   ├── __tests__/             # Pure utility unit test suites
│   │   │   │   ├── formatTime.test.js
│   │   │   │   ├── linkify.test.js
│   │   │   │   ├── recentRooms.test.js
│   │   │   │   ├── roomId.test.js
│   │   │   │   └── sanitizer.test.js
│   │   │   ├── audioBooster.js        # Web Audio API GainNode compressor & amplifier
│   │   │   ├── confetti.js            # Canvas Confetti trigger
│   │   │   ├── crypto.js              # AES-256-GCM encryption & decryption via Web Crypto API
│   │   │   ├── formatTime.js          # Timestamp formatter for chat messages
│   │   │   ├── index.js               # Utility export barrel
│   │   │   ├── linkify.js             # Safe URL detector and auto-linkifier
│   │   │   ├── recentRooms.js         # LocalStorage history manager for visited rooms
│   │   │   ├── roomId.js              # Cryptographically secure random room code generator
│   │   │   ├── sanitizer.js           # XSS HTML entity escaper
│   │   │   ├── sfxSynth.js            # Synthesizer producing room chimes
│   │   │   └── viewTransition.js      # Document View Transitions API wrapper
│   │   ├── App.jsx                    # Route configuration & suspense boundaries
│   │   ├── index.css                  # Global root styles & stylesheet imports
│   │   └── main.jsx                   # React 18 DOM mount
│   ├── .eslintrc.cjs                  # ESLint linting configuration
│   ├── .prettierrc                    # Code formatting configuration
│   ├── .prettierignore                # Files ignored by Prettier
│   ├── package.json                   # Client npm dependencies & build scripts
│   ├── vercel.json                    # Client-specific Vercel routing & CSP rules
│   └── vite.config.js                 # Vite bundler, PWA plugin, Vitest configuration
│
├── docs/                              # Project documentation
│   └── FILE_STRUCTURE.md              # THIS FILE — Detailed file structure reference
│
├── server/                            # Node.js Socket.IO signaling service
│   ├── src/
│   │   ├── index.js                   # Express server bootstrap, health check, Socket.IO
│   │   ├── logger.js                  # Pino structured JSON logging configuration
│   │   ├── rateLimiter.js             # Sliding-window IP & connection anti-spam
│   │   ├── roomManager.js             # In-memory ephemeral room state registry
│   │   └── socketHandlers.js          # WebRTC SDP/ICE relay, chat, drawing router
│   ├── __tests__/                     # Server vitest test suites
│   │   ├── rateLimiter.test.js        # Rate limiter unit tests
│   │   ├── roomManager.test.js        # Room state & sweep unit tests
│   │   └── socketHandlers.test.js     # Signaling & join integration tests
│   ├── .prettierrc                    # Server Prettier formatting rules
│   ├── eslint.config.js               # Server ESLint configuration
│   ├── package.json                   # Server npm dependencies & scripts
│   └── vitest.config.js               # Server Vitest configuration
│
├── ARCHITECTURE.md                    # In-depth architectural & protocol specification
├── CHANGELOG.md                       # Semantic version history (Keep a Changelog)
├── CODE_OF_CONDUCT.md                 # Contributor Covenant v2.1
├── CONTRIBUTING.md                    # Guidelines for contributing, git branching, and PRs
├── LICENSE                            # MIT License
├── PLAN.md                            # High-level product milestones & status
├── PROJECT_MEMORY.md                  # Canonical single-file AI memory & project context
├── README.md                          # Public GitHub landing page
├── render.yaml                        # Turnkey Render Blueprint specification
├── SECURITY.md                        # Security policy & private vulnerability reporting
├── vercel.json                        # Root zero-config Vercel deployment specification
└── VIDEO_CALL_MASTER_PLAN.md          # Google Meet-style video call engineering blueprint
```

---

## 3. Root Files & Configuration

| File | Purpose |
| :--- | :--- |
| **[package.json](file:///i:/Web%20devlopment/Screenshare/package.json)** | Root workspace scripts (`npm run dev`, `npm run build`, `npm run check`). |
| **[vercel.json](file:///i:/Web%20devlopment/Screenshare/vercel.json)** | Root Vercel config enabling zero-configuration 1-click frontend deployments with hardened CSP headers (`worker-src 'self' blob:`). |
| **[render.yaml](file:///i:/Web%20devlopment/Screenshare/render.yaml)** | Cloud deployment blueprint for hosting the Node.js signaling service on Render with health checks on `/health`. |
| **[PROJECT_MEMORY.md](file:///i:/Web%20devlopment/Screenshare/PROJECT_MEMORY.md)** | Single-source-of-truth memory context file for human developers and AI assistants. |
| **[VIDEO_CALL_MASTER_PLAN.md](file:///i:/Web%20devlopment/Screenshare/VIDEO_CALL_MASTER_PLAN.md)** | Full architectural master plan for adding Google Meet-style video conferencing (`/meet`). |
| **[CHANGELOG.md](file:///i:/Web%20devlopment/Screenshare/CHANGELOG.md)** | Semantic release notes following the Keep a Changelog standard. |
| **[CONTRIBUTING.md](file:///i:/Web%20devlopment/Screenshare/CONTRIBUTING.md)** | Contributor guidelines for code standards, testing, and pull requests. |
| **[SECURITY.md](file:///i:/Web%20devlopment/Screenshare/SECURITY.md)** | Security disclosure instructions routing to GitHub Security Advisories. |
| **[LICENSE](file:///i:/Web%20devlopment/Screenshare/LICENSE)** | Standard MIT License. |

---

## 4. Client Architecture (`/client`)

### 4.1 Pages (`client/src/pages`)

All pages are lazy-loaded via `React.lazy` in `App.jsx` to optimize initial load times:

| Page | Route | Description |
| :--- | :---: | :--- |
| **`Home.jsx`** | `/` | Room creation form, PIN protection toggle, recent room cards, and feature highlights. |
| **`Room.jsx`** | `/room/:roomId` | Master watch party orchestrator coordinating WebRTC, chat, annotations, and controls. |
| **`Features.jsx`** | `/features` | Categorized feature showcase with interactive filter pills. |
| **`Security.jsx`** | `/security` | Cryptographic documentation detailing AES-256-GCM and threat mitigations. |
| **`About.jsx`** | `/about` | Technical background, philosophy, and architectural explanation. |
| **`Help.jsx`** | `/help` | Searchable FAQ with expandable troubleshooting sections. |
| **`Contact.jsx`** | `/contact` | Direct links to GitHub Issues, Discussions, and security reporting. |
| **`Roadmap.jsx`** | `/roadmap` | Public Kanban board tracking Completed, In Progress, and Planned milestones. |
| **`Changelog.jsx`** | `/changelog` | Release history reader displaying version details and dates. |
| **`Accessibility.jsx`** | `/accessibility` | Accessibility commitment, keyboard navigation matrix, and WCAG compliance. |
| **`Privacy.jsx`** | `/privacy` | Explicit zero-retention privacy policy. |
| **`Terms.jsx`** | `/terms` | Acceptable use policy with sticky table of contents navigation. |
| **`NotFound.jsx`** | `*` | 404 handler with an automated countdown redirecting back to `/`. |

---

### 4.2 UI Components (`client/src/components`)

| Component | Responsibility |
| :--- | :--- |
| **`VideoPlayer.jsx`** | Mounts the `<video>` element, attaches `srcObject`, and connects to the audio gain booster. |
| **`ControlBar.jsx`** | Bottom floating playback toolbar: fullscreen, audio mute, volume boost slider, annotations, reactions. |
| **`ChatSidebar.jsx`** | Slide-out drawer housing encrypted text messaging, emoji selector, and user list. |
| **`AnnotationCanvas.jsx`**| HTML5 `<canvas>` layer for freehand drawings and live synchronized laser pointers. |
| **`CursorOverlay.jsx`** | Renders remote participant cursor/laser pointer coordinates in real time. |
| **`StatsOverlay.jsx`** | Telemetry HUD showing FPS, resolution, bitrate (kbps), packet loss, and latency. |
| **`ParticipantList.jsx`** | Participant roster showing names, avatar gender badges, and host moderation actions. |
| **`ReactionOverlay.jsx`** | Renders floating animated emojis across the screen when users react. |
| **`ShareModal.jsx`** | Dialog displaying the full invite URL (including hash key) and client-side QR code. |
| **`JoinModal.jsx`** | PIN validation dialog when joining password-protected rooms. |
| **`ConfirmModal.jsx`** | Reusable confirmation modal (e.g. before ending a stream). |
| **`TopBar.jsx`** | Header in active rooms displaying room ID, participant count, and connection status. |
| **`SiteHeader.jsx`** | Universal navigation bar with active route highlight and mobile drawer. |
| **`SiteFooter.jsx`** | Universal footer with navigation categories and copyright. |
| **`ThemeSelector.jsx`** | Dual-theme switcher (Midnight, OLED, Cyber, Crimson). |
| **`Toast.jsx`** | Visual toast alert renderer for signaling and network events. |
| **`RouteErrorBoundary.jsx`**| React error boundary isolating page crashes to prevent white-screen failures. |

---

### 4.3 Custom Hooks (`client/src/hooks`)

| Hook | Returns | Responsibility |
| :--- | :--- | :--- |
| **`useRoom.js`** | `{ participants, messages, typingUsers, connected, isHost, ... }` | Coordinates Socket.IO room connection, chat messaging, and participant rosters. |
| **`useWebRTC.js`** | `{ localStream, peers, startScreenShare, stopScreenShare, isSharing }` | Manages `RTCPeerConnection` mesh instances, ICE candidate exchange, and stream dispatch. |
| **`useWebRTCStats.js`**| `{ stats: { fps, bitrateKbps, rttMs, packetLoss, quality } }` | Polls `getStats()` every second to compute live connection telemetry. |
| **`useScreenRecording.js`**| `{ isRecording, startRecording, stopRecording, recordingTime }` | Uses the browser `MediaRecorder` API to capture streams locally to `.webm`. |
| **`useWakeLock.js`** | `{ isLocked, requestWakeLock, releaseWakeLock }` | Prevents device screens from dimming or locking during long watch sessions. |
| **`useSoundEffects.js`**| `{ playChime, playJoin, playLeave, playError }` | Synthesizes pleasant Web Audio notification tones without external audio assets. |
| **`useScrollReveal.js`**| Framer Motion animation variants | Pre-configured animation definitions for smooth entrance transitions. |
| **`useNetworkStatus.js`**| `{ isOnline, wasOffline }` | Listens to browser online/offline events to notify users of network blips. |

---

### 4.4 Utilities (`client/src/utils`)

| Utility | Key Functions | Description |
| :--- | :--- | :--- |
| **`crypto.js`** | `generateRoomKey`, `encryptMessage`, `decryptMessage` | AES-256-GCM cryptography via native `window.crypto.subtle`. |
| **`audioBooster.js`** | `setupAudioBooster`, `setBoostLevel` | Web Audio API `AudioContext` and `GainNode` audio compressor. |
| **`roomId.js`** | `generateRoomId` | Generates cryptographically secure 9-character room codes (`abc-defg-hij`). |
| **`sanitizer.js`** | `sanitizeHtml` | Escapes dangerous HTML entities to eliminate XSS risks. |
| **`linkify.js`** | `linkifyText` | Safely detects URLs in chat text and converts them to clickable `<a>` links. |
| **`recentRooms.js`** | `getRecentRooms`, `addRecentRoom` | Stores the user's last 10 visited rooms privately in `localStorage`. |
| **`confetti.js`** | `fireRoomLaunchConfetti` | Fires celebratory confetti bursts when rooms are created. |
| **`sfxSynth.js`** | `playSyntheticChime` | Generates audio tones using pure Web Audio oscillator nodes. |
| **`formatTime.js`** | `formatChatTime` | Formats ISO timestamps into localized 12-hour times (`10:45 AM`). |
| **`viewTransition.js`**| `startViewTransition` | Safely executes Document View Transitions if supported by the browser. |

---

### 4.5 Styling System (`client/src/styles`)

ScreenLoop uses **100% Vanilla CSS** with custom property tokens. **No utility frameworks (Tailwind) are used.**

| Stylesheet | Scope |
| :--- | :--- |
| **`tokens.css`** | Defines all design variables: colors (`--accent`, `--bg-primary`), spacing, borders, and shadows. |
| **`base.css`** | HTML element reset, modern typography, body background, and scrollbar styling. |
| **`components.css`**| Reusable UI tokens: `.btn`, `.glass-card`, form inputs, modals, and badges. |
| **`home.css`** | Landing page hero layout, glow effects, and feature preview cards. |
| **`room.css`** | Theater-mode video layout, control bar styling, and chat drawer animation. |
| **`pages.css`** | Layouts for informational pages (`/about`, `/features`, `/security`, tables, and accordions). |
| **`responsive.css`**| Media queries adapting layouts for mobile phones and tablet screens. |
| **`utilities.css`** | Common flexbox, grid, and animation helper classes. |

---

## 5. Server Architecture (`/server`)

The server is a lightweight **Node.js + Express + Socket.IO** signaling coordinator. Media streams never touch this server.

```
server/src/
├── index.js          # Express initialization, health check (/health), Socket.IO setup
├── roomManager.js    # In-memory ephemeral room state registry (room sweep, PIN verification)
├── socketHandlers.js # WebRTC signaling (offer/answer/ice), encrypted chat relay, drawing sync
├── rateLimiter.js    # Sliding-window IP and socket connection spam prevention
└── logger.js         # Pino structured JSON logger
```

### Key Server Responsibilities:
1. **Health Check Endpoint (`GET /health`)**:
   - Responds with `{ status: "ok", uptime, timestamp, version }` for cloud uptime monitoring.
2. **Ephemeral Room Lifecycle (`roomManager.js`)**:
   - Tracks active rooms, host IDs, participant lists, and optional salted PINs in memory.
   - Rooms are automatically destroyed when the host disconnects.
3. **WebRTC Signaling Relay (`socketHandlers.js`)**:
   - Relays `webrtc:offer`, `webrtc:answer`, and `webrtc:ice` strictly between peers in the same room.
4. **Sliding-Window Rate Limiting (`rateLimiter.js`)**:
   - Limits room creation (max 20 per minute per IP) and chat messages to protect against DoS attacks.

---

## 6. Data & Control Flow Map

### Room Creation & Connection Flow:

```
1. USER LAUNCHES ROOM
   Home.jsx -> roomId.js (generates 'abc-defg-hij')
            -> crypto.js (generates 256-bit AES-GCM key)
            -> navigate('/room/abc-defg-hij#SECRET_KEY')

2. HOST INITIALIZES STREAM
   Room.jsx -> useRoom.js (emits 'room:create' via Socket.IO)
            -> useWebRTC.js -> navigator.mediaDevices.getDisplayMedia()
            -> Audio stream -> audioBooster.js (GainNode compressor)
            -> Video stream -> VideoPlayer.jsx (<video>)

3. VIEWER JOINS
   Viewer visits '/room/abc-defg-hij#SECRET_KEY'
   Room.jsx -> useRoom.js (emits 'room:join' with optional PIN)
   Server validates room -> emits 'room:joined'
   Server notifies Host -> Host emits 'webrtc:offer'
   Viewer receives offer -> emits 'webrtc:answer'
   ICE Candidates exchanged -> Direct WebRTC P2P Mesh established!

4. ENCRYPTED CHAT
   Host/Viewer types message
   ChatSidebar.jsx -> crypto.js: encryptMessage(text, URL_hash_key)
   useRoom.js emits 'chat:message' with ciphertext
   Server broadcasts ciphertext to room
   Receiving peer -> crypto.js: decryptMessage(ciphertext, URL_hash_key)
   Sanitized and rendered in ChatSidebar.jsx
```

---

## 7. Guidelines for Adding New Code

1. **Adding a New Component**:
   - Place in `client/src/components/<ComponentName>.jsx`.
   - Export through `client/src/components/index.js`.
   - Style using existing tokens in `tokens.css`.
2. **Adding a New Custom Hook**:
   - Place in `client/src/hooks/<useHookName>.js`.
   - Export through `client/src/hooks/index.js`.
3. **Adding a New Route / Page**:
   - Place in `client/src/pages/<PageName>.jsx`.
   - Register in `client/src/App.jsx` with `React.lazy()` and `RouteErrorBoundary`.
   - Add navigation links in `SiteHeader.jsx` and `SiteFooter.jsx`.
4. **Adding a New Server Event**:
   - Add the handler in `server/src/socketHandlers.js`.
   - Write a unit test in `server/__tests__/socketHandlers.test.js`.
5. **Quality Verification**:
   - Run tests: `cd client && npm test` and `cd server && npm test`.
   - Run build check: `cd client && npm run build`.

---

<div align="center">
  <sub>Maintained for ScreenLoop • Accurate as of Version 1.5.0</sub>
</div>
