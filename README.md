<div align="center">

  <br />
  <img src="./client/public/logo.svg" alt="Screenloop Logo" width="80" height="80" />
  <br />

  # Screenloop

  **Peer-to-peer screen sharing with encrypted chat.**

  <p align="center">
    <a href="https://github.com/Himanshusingh204/ScreenLoop/actions/workflows/ci.yml"><img src="https://github.com/Himanshusingh204/ScreenLoop/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
    <a href="https://github.com/Himanshusingh204/ScreenLoop/actions/workflows/codeql.yml"><img src="https://github.com/Himanshusingh204/ScreenLoop/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 5" /></a>
  </p>

</div>

---

## Overview

Screenloop is a web app for watching movies or sharing your screen with friends. There's no server involved in the actual streaming — video and audio go directly between browsers via WebRTC. The server only helps devices find each other (signaling).

Most screen-sharing tools compress audio with voice-isolation filters designed for work calls. Screenloop skips that, so movie audio comes through the way it was mixed. Chat messages are encrypted in the browser using AES-256-GCM, and the decryption key lives in the URL hash — the server never sees it.

No accounts. No downloads. No video data touching a server.

```
Host Browser ────── WebRTC P2P ──────> Viewer Browsers
     │                                     │
     └────── Signaling only (Node.js) ─────┘
```

---

## Features

**Streaming & Audio**
- Peer-to-peer screen sharing up to 1080p60 (higher on strong connections)
- Echo cancellation disabled so movie audio isn't processed like voice chat
- Volume booster for quiet dialogue scenes
- Adaptive quality presets (1080p, 720p, 480p)

**Privacy & Encryption**
- Chat encrypted with AES-256-GCM in the browser (`window.crypto.subtle`)
- Room key in URL hash fragment — browsers never send it to the server (RFC 3986)
- No accounts, no database, no analytics
- Room destroyed when host leaves

**Collaboration**
- Live drawing and laser pointer over the stream
- Generated avatars (male/female/neutral) — no profile data stored
- QR code for mobile joining (generated client-side)
- Connection quality dashboard (FPS, bitrate, packet loss, ping)
- Picture-in-picture and fullscreen modes
- Screen Wake Lock to prevent sleep during long movies
- 5 color themes

---

## Quick Start

**Requirements:** Node.js 18+

```bash
git clone https://github.com/Himanshusingh204/ScreenLoop.git
cd ScreenLoop
```

Start the signaling server:
```bash
cd server
npm install
npm run dev
```

In a second terminal, start the client:
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Architecture

```
                         ┌──────────────────────────────────┐
                         │     Signaling Server              │
                         │     Node.js + Socket.io           │
                         │  - Room lifecycle                 │
                         │  - WebRTC SDP/ICE relay           │
                         │  - Rate limiting                  │
                         └───────────────┬──────────────────┘
                                         │
                        Signaling only   │  WebSocket
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              │                                                     │
              ▼                                                     ▼
┌──────────────────────────────┐         WebRTC         ┌──────────────────────────────┐
│         Host Client          │════════════════════════>│        Viewer Client          │
│       (React 18 + Vite)      │        P2P Mesh         │       (React 18 + Vite)       │
│  - getDisplayMedia()         │   Video + Audio direct  │  - MediaStream player         │
│  - Web Audio boost           │                         │  - Web Audio boost            │
│  - AES-GCM encryption        │                         │  - AES-GCM decryption         │
│  - Annotation broadcast      │                         │  - Annotation sync            │
└──────────────────────────────┘                         └──────────────────────────────┘
```

### Encryption Flow

```
1. Host generates 256-bit AES-GCM key (window.crypto.subtle)
2. Key embedded in URL hash: /room/abc123#SECRET_KEY
3. Key never sent to server (browsers skip hash fragments per RFC 3986)
4. Chat messages encrypted before sending, decrypted on receive
```

---

## Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Room launcher, PIN setup, recent rooms |
| `/room/:roomId` | Watch Room | Video player, chat, annotations, controls |
| `/features` | Features | Feature list with category filters |
| `/security` | Security | Encryption details and architecture |
| `/about` | About | Project background and tech stack |
| `/help` | Help | FAQ and troubleshooting |
| `/privacy` | Privacy | Data handling policy |
| `/terms` | Terms | Acceptable use |
| `/contact` | Contact | Bug reports and feature requests |
| `/roadmap` | Roadmap | Public development roadmap |
| `/changelog` | Changelog | Release history |
| `/accessibility` | Accessibility | WCAG 2.1 AA commitment |
| `*` | 404 | Not found with auto-redirect |

---

## Keyboard Shortcuts

| Key | Action | Where |
|:---:|---|---|
| <kbd>F</kbd> | Toggle fullscreen | In room |
| <kbd>M</kbd> | Mute/unmute audio | In room |
| <kbd>Esc</kbd> | Exit fullscreen / close overlays | Global |
| <kbd>Enter</kbd> | Send chat message | Chat |
| <kbd>Shift</kbd>+<kbd>Enter</kbd> | New line in chat | Chat |

---

## Testing

```bash
# Client tests
cd client && npm run test

# Lint
cd client && npm run lint

# Build
cd client && npm run build
```

---

## Deployment

**Frontend (Vercel):**
1. Import repo on [vercel.com](https://vercel.com)
2. Root directory: `client`, framework: Vite
3. Set `VITE_SERVER_URL` to your backend URL

**Backend (Render):**
1. New Web Service on [render.com](https://render.com)
2. Root directory: `server`, start command: `node src/index.js`
3. Set `PORT=4000` and `ALLOWED_ORIGIN` to your frontend URL

---

## Tech Stack

- **Frontend:** React 18, Vite 5, React Router v6, Framer Motion
- **Backend:** Node.js, Express, Socket.io 4
- **Streaming:** WebRTC P2P mesh
- **Encryption:** AES-256-GCM via Web Crypto API
- **Testing:** Vitest
- **Styling:** Vanilla CSS with CSS variables

---

## Contributing & Community

Contributions are welcome! Please check out the following guides before getting started:
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

  Built with ❤️ by <a href="https://github.com/Himanshusingh204">Himanshu</a>

</div>
