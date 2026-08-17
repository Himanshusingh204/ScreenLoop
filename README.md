<div align="center">

  <br />
  <img src="https://raw.githubusercontent.com/Himanshusingh204/ScreenLoop/main/client/public/pwa-192x192.png" alt="Screenloop Logo" width="80" height="80" style="border-radius: 20px;" />
  <br />

  # 🎬 Screenloop Pro
  
  **Ultra-HD Peer-to-Peer Watch Party & Screen Sharing Web Platform**
  
  <p align="center">
    <em>Zero Signups • Zero Media Storage • 48 kHz Uncompressed Cinema Audio • AES-GCM 256-Bit E2EE</em>
  </p>

  <p align="center">
    <a href="#-key-features"><strong>Explore Features »</strong></a> •
    <a href="#-architecture"><strong>Architecture »</strong></a> •
    <a href="#-security--cryptography"><strong>Security »</strong></a> •
    <a href="#-quick-start"><strong>Quick Start »</strong></a> •
    <a href="#-production-deployment"><strong>Deployment »</strong></a>
  </p>

  <p align="center">
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" /></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 18+" /></a>
    <a href="https://socket.io/"><img src="https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" /></a>
    <a href="https://webrtc.org/"><img src="https://img.shields.io/badge/WebRTC-P2P_Mesh-FF6F00?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 5" /></a>
  </p>

</div>

---

## 🌟 Overview

**Screenloop Pro** is a modern, privacy-first web application designed for synchronized movie nights, watch parties, collaborative reviews, and real-time screen sharing with zero friction.

Unlike traditional conferencing or screen-sharing tools that compress stereo audio for voice chat, require account registrations, or route your video frames through third-party servers, Screenloop streams **directly peer-to-peer over WebRTC** with **uncompressed 48 kHz dynamic range cinema audio** and client-side **AES-256-GCM encryption**.

```
Host Browser ────── WebRTC P2P Direct Mesh (DTLS 1.2 / SRTP) ──────> Viewer Browsers
     │                                                                      │
     └────── Signaling Relay Only (Room state / Encrypted chat) ────────────┘
                            (Node.js + Socket.io)
```

---

## ⚡ Key Features

### 🎧 Audio & Streaming Performance
* **48 kHz Uncompressed Cinema Audio**: Echo cancellation and aggressive voice filters are disabled, preserving the full dynamic range of explosive soundtracks, subtle film dialogue, and live concerts.
* **1440p 2K 60fps WebRTC Mesh**: Native peer-to-peer direct streaming with sub-150ms glass-to-glass latency and zero central server bandwidth bottlenecks.
* **Dialogue & Volume Booster**: Integrated Web Audio API dynamic range compressor and gain booster (+200%) to clarify quiet movie whispers without distortion.
* **Adaptive Stream Presets**: On-the-fly quality switching between **1080p Full HD**, **720p HD**, and **480p SD** presets to accommodate varying network conditions.

### 🛡️ Privacy & Cryptography
* **AES-GCM 256-Bit E2EE Chat**: Chat messages are encrypted client-side via `window.crypto.subtle`.
* **Hash-Fragment Isolation**: The cryptographic room key resides exclusively in the URL hash fragment (`#key`), which web browsers never transmit in HTTP requests (RFC 3986).
* **Zero Accounts / Zero Database**: No signups, no emails, no tracking cookies, and no persistent server storage. All signaling state is held in transient memory.
* **Strict Room Lifecycle**: The watch room automatically destroys itself the moment the host leaves or clicks "Stop Room", protecting privacy and preventing abandoned connections.

### 🎨 Collaboration & Interactive Tools
* **Live Screen Annotations**: Host draws over the live stream with customizable Pen, Highlighter, and Eraser tools synchronized in real-time.
* **Neon Laser Pointer**: Synchronous cursor tracker for pointing out key cinematic details or code sections.
* **Dynamic Gender-Tailored Avatars**: Users select their avatar style (Female, Male, or Neutral) to automatically generate unique, beautiful SVG avatars via the DiceBear API.
* **Real-Time Telemetry HUD**: Live stream diagnostics overlay displaying framerate (FPS), bitrate (kbps), packet loss (%), and round-trip ping (ms).
* **1-Tap Local QR Code Generation**: HTML5 Canvas client-side QR generation for instant mobile joining without data leakage to external image APIs.
* **Screen Wake Lock API**: Prevents devices and laptops from dimming or sleeping during long movies.
* **Obsidian Glassmorphic Design**: 5 bespoke themes (Midnight Obsidian, OLED Black, Cyber Ocean, Crimson Noir, and Light Mode).

---

## 📊 Platform Comparison Matrix

| Feature | Screenloop Pro | Discord | Zoom | Teleparty |
|---|:---:|:---:|:---:|:---:|
| **48kHz Stereo Movie Audio** | ✅ **Native Dynamic Range** | ⚠️ Voice-filtered | ❌ Mono voice codec | ❌ Extension audio |
| **Direct P2P Media (Zero Server Storage)** | ✅ **100% P2P Mesh** | ❌ Server Relayed | ❌ Server Relayed | ❌ Third-party server |
| **End-to-End Chat Encryption (AES-256)** | ✅ **Client-side `#key`** | ❌ Server Plaintext | ❌ Server Managed | ❌ Unencrypted |
| **Account / Software Installation** | ✅ **Zero Sign-Up / Pure Web** | ❌ Account Required | ❌ App Required | ❌ Chrome Extension |
| **1080p / 1440p 60fps Screen Sharing** | ✅ **Free & Unlimited** | ❌ Nitro ($9.99/mo) | ❌ 720p Capped | ❌ Not Supported |
| **Live Screen Drawing & Laser Pointer** | ✅ **Included Built-In** | ❌ Not Available | ⚠️ Meeting Plan only | ❌ Not Available |
| **Client-Side QR Code Join** | ✅ **Native Canvas** | ❌ Not Supported | ❌ Not Supported | ❌ Not Supported |

---

## 🏛️ System Architecture

Screenloop employs a strict hybrid architecture: a lightweight Node.js signaling control plane and a decentralized WebRTC peer-to-peer data plane.

```
                         ┌──────────────────────────────────────────┐
                         │     Signaling Server (Control Plane)     │
                         │      Node.js + Express + Socket.io       │
                         │  - Room lifecycle & capacity management │
                         │  - WebRTC SDP handshake & ICE relay      │
                         │  - IP sliding-window anti-spam limiter   │
                         └────────────────────┬─────────────────────┘
                                              │
                           Signaling & State  │  Socket.io (WebSocket)
                                              │
            ┌─────────────────────────────────┴─────────────────────────────────┐
            │                                                                   │
            ▼                                                                   ▼
┌─────────────────────────────┐             WebRTC              ┌─────────────────────────────┐
│         Host Client         │════════════════════════════════>│        Viewer Client        │
│      (React 18 + Vite)      │            P2P Mesh             │      (React 18 + Vite)      │
│ - getDisplayMedia() capture │       1080p/1440p Video         │ - HTML5 MediaStream player  │
│ - Web Audio dialogue boost  │      48kHz Stereo Audio         │ - Web Audio dialogue boost  │
│ - Hardware AES-GCM crypto   │                                 │ - Local AES-GCM decryptor   │
│ - Live annotation broadcast │                                 │ - Canvas annotation sync    │
│ - Telemetry HUD gathering   │                                 │ - Telemetry diagnostic HUD  │
└─────────────────────────────┘                                 └─────────────────────────────┘
```

### 🔒 Cryptographic Handshake Protocol

```
1. Host Browser   ───> Generates 256-bit AES-GCM Key (window.crypto.subtle)
2. URL Hash       ───> Embeds key in hash fragment (https://screenloop.app/room/id#KEY)
3. Invite Link    ───> Key transmitted out-of-band via URL fragment (never sent to server)
4. Encrypted Chat ───> Ciphertext sent over WebSocket; decrypted locally in viewer browser
```

---

## 🗺️ Application Routes

Screenloop features a fully connected suite of pages:

| Route | Page | Purpose |
|---|---|---|
| `/` | **Home** | Hero landing, room PIN protection, 1-tap room launcher, and join input |
| `/room/:roomId` | **Watch Room** | Cinema video player, WebRTC mesh, E2EE chat, live drawing, and control bar |
| `/features` | **Features Showcase** | Interactive capability filters and full competitive comparison matrix |
| `/security` | **Security Architecture** | Cryptographic whitepaper, zero-knowledge specifications, and verification checklist |
| `/about` | **About Screenloop** | Project mission, architecture diagrams, and open-source contribution guide |
| `/help` | **Help & FAQ** | Searchable knowledge base, troubleshooting for sound/screen, and keyboard shortcuts |
| `/privacy` | **Privacy Policy** | Zero-data guarantees and transparent data-handling policy |
| `/terms` | **Terms of Service** | P2P acceptable use policy and open-source MIT guidelines |
| `*` | **404 Not Found** | Custom illustration, automatic countdown recovery, and quick navigation |

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Context |
|:---:|---|---|
| <kbd>F</kbd> | Toggle Fullscreen Cinema Mode | In Room |
| <kbd>M</kbd> | Toggle Audio Mute / Unmute | In Room |
| <kbd>Esc</kbd> | Exit Fullscreen / Close Overlays & Modals | Global |
| <kbd>Enter</kbd> | Send Encrypted Chat Message | Chat Box |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | Multi-line Chat Input | Chat Box |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/Himanshusingh204/ScreenLoop.git
cd ScreenLoop
```

### 2. Start the Signaling Server
```bash
cd server
npm install
npm run dev
```
> Server starts on `http://localhost:4000` (listening on `0.0.0.0:4000` for LAN access).

### 3. Start the Frontend Client
In a new terminal window:
```bash
cd client
npm install
npm run dev
```
> Client launches at `http://localhost:5173`. Open the URL in your browser to start watching!

---

## 🧪 Testing & Code Quality

Screenloop uses **Vitest** for fast unit and integration testing across both client and server:

```bash
# Run client unit tests
cd client
npm run test

# Run production build validation
npm run build

# Run linting
npm run lint
```

---

## 🌐 Production Deployment

### Frontend: Vercel (Recommended)
1. Import repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Framework Preset: **Vite**.
4. Set Environment Variable: `VITE_SERVER_URL=https://your-backend.onrender.com`.
5. Click **Deploy**.

### Backend: Render (Free Tier Supported)
1. Create a new **Web Service** on [Render](https://render.com).
2. Select your repository and set **Root Directory** to `server`.
3. **Build Command**: `npm install`.
4. **Start Command**: `node src/index.js`.
5. Environment Variables:
   * `PORT=4000`
   * `ALLOWED_ORIGIN=https://your-frontend.vercel.app`

### Backend: Railway / Fly.io / Docker
```dockerfile
# Self-hosting Dockerfile example for server
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/src ./src
EXPOSE 4000
CMD ["node", "src/index.js"]
```

---

## 📂 Repository Structure

```
ScreenLoop/
├── client/                     # React 18 SPA Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (SiteHeader, ControlBar, etc.)
│   │   ├── hooks/              # WebRTC, Room state, Audio booster hooks
│   │   ├── pages/              # Route pages (Home, Room, Features, Security, etc.)
│   │   ├── styles/             # Modular CSS design system (tokens, room, pages)
│   │   └── utils/              # Cryptography, sanitizer, formatters
│   ├── public/                 # PWA icons & web manifest
│   ├── vite.config.js          # Vite build configuration
│   └── package.json
├── server/                     # Node.js Signaling Backend
│   ├── src/
│   │   ├── index.js            # Express + Socket.io server entry
│   │   ├── socketHandlers.js   # Secure WebRTC & chat signaling
│   │   ├── roomManager.js      # In-memory room lifecycle state
│   │   └── rateLimiter.js      # Sliding-window IP rate limiter
│   └── package.json
├── .github/workflows/          # CI/CD pipelines
├── LICENSE                     # MIT License
├── README.md                   # Project documentation
└── PLAN.md                     # Engineering roadmap
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for complete details.

---

<div align="center">

  <p>
    Designed & Engineered with ❤️ by <strong><a href="https://github.com/Himanshusingh204">Himanshu</a></strong>
  </p>
  <p>
    <em>Star ⭐ this repository on GitHub if you love private, high-fidelity watch parties!</em>
  </p>

</div>
