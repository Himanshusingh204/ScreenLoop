<div align="center">

# Screenloop Pro

**Zero-Friction Peer-to-Peer Watch Party & Screen Sharing Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-FF6F00?logo=webrtc&logoColor=white)](https://webrtc.org/)

_Zero signups. Zero media storage. 48kHz uncompressed cinema audio. AES-GCM 256-bit End-to-End Encryption._

</div>

---

## Features

- **Peer-to-Peer Screen Sharing**: WebRTC direct mesh stream up to 1440p 2K resolution at 30/60 fps
- **48 kHz Uncompressed Cinema Audio**: Dynamic range preserving stereo sound tuned for movies (echo cancellation & noise suppression OFF)
- **AES-GCM 256-bit End-to-End Encryption**: Chat encrypted client-side using a key in the URL hash fragment. Server acts as blind relay
- **Live Screen Drawing & Annotations**: Host draws over the live stream with Pen, Highlighter, and Eraser tools synchronized in real-time
- **Web Audio Dialogue & Volume Booster**: Built-in dynamic range compressor and gain booster (up to 200%)
- **Real-Time Telemetry HUD**: Live stream FPS, bitrate (kbps), round-trip latency (ms), and packet loss
- **Dynamic Avatars**: Users select their gender to generate distinct, harmonious avatar styles using the DiceBear API
- **Strict Room Lifecycle**: The watch party automatically and safely shuts down for all users when the host leaves
- **1-Tap QR Code Mobile Join**: Locally generated QR codes (no third-party API, no data leakage)
- **Native Web Share API**: 1-tap sharing via AirDrop, WhatsApp, Messages, or Email
- **Screen Wake Lock API**: Prevents display from sleeping during playback
- **Obsidian Glassmorphic Design**: Midnight Obsidian, OLED Black, Cyber Ocean, Crimson Noir themes

---

## Architecture

Screenloop employs a hybrid architecture: a lightweight signaling server for connection orchestration and WebRTC for direct peer-to-peer media transmission.

```
                        +------------------------------------------+
                        |        Signaling Server (Control Plane)  |
                        |     Node.js + Express + Socket.io        |
                        | - Room lifecycle & host hierarchy        |
                        | - WebRTC SDP handshake & ICE relay       |
                        | - Anti-spam & PIN brute-force protection  |
                        +--------------------+---------------------+
                                             |
                          Signaling & State  | Socket.io (WebSocket)
                                             |
           +---------------------------------+---------------------------------+
           |                                                                   |
           v                                                                   v
+-----------------------------+             +-----------------------------+
|         Host Client         |   WebRTC    |        Viewer Client        |
|      (React 18 + Vite)      |============>|      (React 18 + Vite)      |
| - getDisplayMedia() capture |   P2P Mesh  | - HTML5 MediaStream playback|
| - Web Audio dialogue boost  |  1080p/1440p| - Web Audio dialogue boost  |
| - AES-GCM key generator     |  Video +   | - E2EE local decryptor      |
| - Screen annotation broadcast|  48kHz     | - Screen annotation renderer|
| - Telemetry gatherer        |  Audio      | - Telemetry display HUD     |
+-----------------------------+             +-----------------------------+
```

### Key Principle

**Media never touches the server.** The signaling server handles room state and WebRTC negotiation only. Screen pixels, audio, and chat plaintext never reach the application server.

---

## Security

- **Zero Media Storage**: Streams are peer-to-peer over WebRTC. Media never touches any database or server
- **Client-Side Key Derivation**: Room keys reside exclusively in the `#key` URL hash fragment, never sent in HTTP requests
- **Local QR Generation**: QR codes are generated client-side. Invite URLs never leave the browser
- **Signaling Authorization**: All socket events validate room membership before processing
- **IP-Based Rate Limiting**: Anti-spam protection keyed by IP address, preventing bypass via reconnect
- **Room Capacity Enforcement**: Server-side limit of 10 participants per room
- **XSS Sanitization**: User inputs and chat payloads are scrubbed before DOM presentation
- **CSP Headers**: Content Security Policy deployed at the deployment boundary
- **Data Anonymity**: No personal data, email addresses, or user profiles collected

---

## Local Development

**Prerequisites**: Node.js 18+ and npm

### 1. Start the Signaling Server

```bash
cd server
npm install
npm run dev
```

Runs at `http://localhost:4000` (listening on all interfaces for LAN access).

### 2. Start the Frontend Client

```bash
cd client
npm install
npm run dev
```

Runs at `http://localhost:5173`.

---

## Production Deployment

### Frontend: Vercel (Recommended)

1. Push to GitHub
2. Import repository on [Vercel](https://vercel.com)
3. Set **Root Directory** to `client`
4. Framework Preset: **Vite**
5. Environment Variable: `VITE_SERVER_URL=https://your-backend.onrender.com`
6. Deploy

### Backend: Render (Recommended - Free Tier)

1. Create a new **Web Service** on [Render](https://render.com)
2. **Root Directory**: `server`
3. **Build Command**: `npm install`
4. **Start Command**: `node src/index.js`
5. Environment Variables:
   - `PORT=4000`
   - `ALLOWED_ORIGIN=https://your-frontend.vercel.app`

### Backend: Railway

1. Create a new project on [Railway](https://railway.app)
2. Add a new service from your GitHub repo
3. Set **Root Directory** to `server`
4. Start Command: `node src/index.js`
5. Environment Variables:
   - `PORT=4000`
   - `ALLOWED_ORIGIN=https://your-frontend.vercel.app`

### Backend: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. `fly launch` in the `server/` directory
3. Set environment variables via `fly secrets set`

### Backend: Koyeb

1. Create a free account on [Koyeb](https://koyeb.com)
2. Import your GitHub repo
3. Set build command: `cd server && npm install`
4. Set run command: `cd server && node src/index.js`
5. Add environment variables

---

## Repository Structure

```
screenloop/
+-- client/                 # React 18 SPA Frontend
|   +-- src/
|       +-- components/     # Reusable UI components (14 components)
|       +-- hooks/          # Custom React hooks (WebRTC, Audio, etc.)
|       +-- pages/          # Route-level components (Home, Room)
|       +-- utils/          # Helpers (Crypto, formatters, QR, etc.)
|   +-- .env.example        # Client env template
|   +-- vercel.json         # SPA rewrites + security headers + CSP
|   +-- package.json
+-- server/                 # Node.js Signaling Backend
|   +-- src/
|       +-- index.js        # Express + Socket.io + graceful shutdown
|       +-- socketHandlers.js # Secure event handlers with validation
|       +-- roomManager.js  # Room state with capacity enforcement
|       +-- rateLimiter.js  # IP-based rate limiting + brute-force protection
|   +-- .env.example        # Server env template
|   +-- package.json
+-- .github/workflows/      # CI/CD pipelines
+-- LICENSE                 # MIT License
+-- README.md
+-- PLAN.md                 # Master engineering plan
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|:--------:|:-------|
| <kbd>M</kbd> | Toggle Audio Mute / Unmute |
| <kbd>F</kbd> | Toggle Fullscreen Cinema Mode |
| <kbd>Esc</kbd> | Exit Fullscreen / Close Overlays |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, React Router 6, Framer Motion, Phosphor Icons |
| Backend | Node.js 18+, Express 4, Socket.io 4 |
| Transport | WebRTC (P2P Mesh), Socket.io (Signaling) |
| Security | AES-GCM 256-bit E2EE, CSP, IP-based rate limiting |
| Audio | Web Audio API, DynamicsCompressor, GainNode |
| PWA | vite-plugin-pwa, Service Worker, Web Manifest |
| Deployment | Vercel (client), Render/Railway/Fly.io (server) |

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<div align="center">
  <p>Engineered and developed by <strong>Himanshu</strong>.</p>
  <p>Built with care for seamless sharing and immersive experiences.</p>
</div>
