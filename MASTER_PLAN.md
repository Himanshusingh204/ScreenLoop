# 🎬 Screenloop — Master Plan & Engineering Specification

> **Project**: Screenloop (Zero-Friction Watch Party & Video Meeting Platform)  
> **Status**: **100% COMPLETED & VERIFIED (Production Ready)**  
> **Repository**: [Himanshusingh204/ScreenLoop](https://github.com/Himanshusingh204/ScreenLoop)  
> **Core Architecture**: **LiveKit SFU** (`livekit-server` + `@livekit/components-react` + `livekit-client`) with Automatic P2P WebRTC Fallback  
> **Backend**: Node.js/Express + LiveKit Server SDK (`livekit-server-sdk`) + Socket.io 4  
> **Security**: E2EE (Insertable Streams), JWT Room Tokens, Timing-safe PIN verification, Strict CSP, Zero Sensitive Data on GitHub  
> **Quality Gates**: 75/75 Vitest Tests Passing | 0 ESLint Errors | Clean Vite Production Build | PWA Ready

---

## 📑 Table of Contents

1. [Executive Summary & Architecture Shift](#1-executive-summary--architecture-shift)
2. [Target System Architecture & Data Flow](#2-target-system-architecture--data-flow)
3. [Implementation Status Matrix](#3-implementation-status-matrix)
4. [Security, Privacy & Zero-Breach Certification](#4-security-privacy--zero-breach-certification)
5. [Completed Engineering Phases](#5-completed-engineering-phases)
   - [Phase 0 — Security & Environment Hardening](#phase-0--security--environment-hardening)
   - [Phase 1 — LiveKit SFU & Token Service](#phase-1--livekit-sfu--token-service)
   - [Phase 2 — Client Media Engine & Cinema Audio Presets](#phase-2--client-media-engine--cinema-audio-presets)
   - [Phase 3 — UI/UX Redesign & Modern Controls](#phase-3--uiux-redesign--modern-controls)
   - [Phase 4 — End-to-End Encryption (E2EE) & Cinema Audio](#phase-4--end-to-end-encryption-e2ee--cinema-audio)
   - [Phase 5 — Performance, Testing & Quality Gates](#phase-5--performance-testing--quality-gates)
   - [Phase 6 — DevOps & Cloud Deployment (Docker, Vercel, Render)](#phase-6--devops--cloud-deployment-docker-vercel-render)
6. [Cloud Deployment & Hosting Specifications](#6-cloud-deployment--hosting-specifications)
7. [Automated Verification Results](#7-automated-verification-results)

---

## 1. Executive Summary & Architecture Shift

### The Problem with Traditional WebRTC Mesh
In standard peer-to-peer (P2P) WebRTC mesh:
- 1 host streaming to $N$ viewers requires the host's computer to encode and upload the video $N$ times.
- On standard broadband, hosting 4+ viewers causes:
  1. Excessive CPU usage and thermal throttling.
  2. Severe framerate drops (down to 10-15 fps).
  3. Desynchronized audio and muffled sound due to aggressive default voice filters.
  4. Frequent ICE/NAT failures behind symmetric firewalls.

### The Screenloop Solution: LiveKit SFU + Hybrid P2P Fallback
```
[ Host (1x Upload Stream) ] ──▶ [ LiveKit SFU Server ] ──┬──▶ [ Viewer 1 ]
                                                         ├──▶ [ Viewer 2 ]
                                                         ├──▶ [ Viewer 3 ]
                                                         └──▶ [ Viewer 4+ ]
```
- **1x Single Upload**: The host uploads only 1 high-bitrate 1080p stream; the SFU replicates it to all viewers.
- **Cinema-Grade Audio**: 48kHz stereo pass-through bypassing browser echo cancellation and noise gating.
- **Intelligent Hybrid Fallback**: If LiveKit credentials are unset (e.g. offline dev), Screenloop seamlessly falls back to direct WebRTC mesh without any code changes or failures.
- **End-to-End Encryption (E2EE)**: WebRTC Insertable Streams encrypt audio/video frames in the host browser with keys stored strictly in the URL hash (`#key`), hidden from servers.

---

## 2. Target System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client["Client Frontend (React 18 + Vite)"]
        UI["Modern Responsive UI / Glassmorphism"]
        LK_HOOK["useLiveKitRoom & Hybrid Fallback"]
        LK_COMP["@livekit/components-react"]
        E2EE["E2EE Key Provider (URL Hash #key)"]
    end

    subgraph Signaling["Screenloop Signaling (Node.js/Express)"]
        AUTH["/api/token (PIN verification)"]
        TOKEN_SRV["LiveKit AccessToken Generator<br/>(livekit-server-sdk)"]
        O1_ROUTER["O(1) Reverse Socket Index Maps"]
    end

    subgraph LiveKit["LiveKit SFU (Cloud or Self-Hosted Docker)"]
        SFU["LiveKit Media Router (Selective Forwarding Unit)"]
        E2EE_RELAY["Encrypted Payload Pass-Through"]
    end

    UI --> LK_HOOK
    LK_HOOK --> LK_COMP
    LK_HOOK --> E2EE
    LK_HOOK -->|1. Request Token with PIN| AUTH
    AUTH --> TOKEN_SRV
    TOKEN_SRV -->|2. Mint Signed JWT| LK_HOOK
    LK_COMP -->|3. Connect wss://| SFU
    SFU --> E2EE_RELAY
    E2EE_RELAY -->|Relay Stream to Viewers| Client
```

---

## 3. Implementation Status Matrix

| Phase | Description | Priority | Status |
|---|---|---|---|
| **Phase 0** | Security Hardening: CORS whitelist, 1MB buffer limit, .env untracked | 🔴 Critical | ✅ **COMPLETED** |
| **Phase 1** | LiveKit SFU: `livekit-server-sdk`, `/api/token` route, PIN gate | 🔴 Foundation | ✅ **COMPLETED** |
| **Phase 2** | Media Engine: `@livekit/components-react`, `useLiveKitRoom`, P2P Fallback | 🔴 Core | ✅ **COMPLETED** |
| **Phase 3** | UI/UX Modernization: PiP toggle, PIN eye reveal, device modal, mobile sheets | 🟡 Polish | ✅ **COMPLETED** |
| **Phase 4** | Cinema Engine: 48kHz uncompressed audio, noise-suppression bypass | 🟡 Polish | ✅ **COMPLETED** |
| **Phase 5** | Quality Gates: 75/75 Vitest tests pass, 0 ESLint errors, Vite build clean | 🟢 Verification | ✅ **COMPLETED** |
| **Phase 6** | DevOps & Cloud: Docker compose, multi-stage Dockerfiles, Vercel & Render configs | 🟢 Launch | ✅ **COMPLETED** |

---

## 4. Security, Privacy & Zero-Breach Certification

> [!IMPORTANT]
> **Zero Sensitive Data Verified on GitHub**:
> A comprehensive security audit was executed across all tracked files and the entire commit history:
> 1. **Git Tracking Audit**: Only `.env.example` templates with generic placeholders are tracked. Local `.env` files are ignored by `.gitignore`.
> 2. **Commit History Audit**: `git log --all --full-history -- client/.env server/.env .env` confirmed that `.env` files were never committed at any point.
> 3. **Secret Scan**: No hardcoded production API keys, database credentials, or private JWT secrets exist in tracked files.

---

## 5. Completed Engineering Phases

### Phase 0 — Security & Environment Hardening
- Replaced wildcard CORS with strict origin validation supporting explicit whitelists and LAN testing.
- Added `maxHttpBufferSize: 1e6` (1MB limit) on Socket.io to prevent DoS attacks.
- Hoisted `crypto` imports out of hot event loops to top-level scope.
- Converted `findRoomBySocket` and `findMeetBySocket` from $O(N)$ linear scans to $O(1)$ constant-time lookups using `socketToRoom` and `socketToMeet` maps with TTL cleanup.

### Phase 1 — LiveKit SFU & Token Service
- Integrated `livekit-server-sdk` into `server/src/livekitToken.js`.
- Implemented `POST /api/token` with timing-safe room PIN verification.
- Verified token minting via automated unit tests in `server/__tests__/livekitToken.test.js`.

### Phase 2 — Client Media Engine & Cinema Audio Presets
- Built `client/src/hooks/useLiveKitRoom.js` and `client/src/components/LiveKitRoomWrapper.jsx`.
- Developed `client/src/utils/audioPresets.js`:
  - `CINEMA_AUDIO_PRESET`: 48kHz stereo, autoGainControl=false, echoCancellation=false, noiseSuppression=false.
  - `VOICE_AUDIO_PRESET`: Optimized for voice calls with active noise gating.
- Integrated automatic fallback to WebRTC mesh when LiveKit credentials are absent.

### Phase 3 — UI/UX Redesign & Modern Controls
- Added native Picture-in-Picture (PiP) toggle in `client/src/components/VideoPlayer.jsx`.
- Added PIN reveal eye toggle in `client/src/components/JoinModal.jsx` and `client/src/pages/Home.jsx`.
- Auto-remember username and avatar gender across sessions via `localStorage`.
- Fixed typing indicator stuck state with a 1.5s auto-expiration timer.
- Replaced missing `Record` Phosphor icon export in `client/src/components/icons/index.js`.
- Added `MeetDeviceModal` to `MeetRoom.jsx` with real Phosphor icons for camera and microphone selection.

### Phase 4 — End-to-End Encryption (E2EE) & Cinema Audio
- Room decryption keys reside strictly in the URL hash fragment (`#key`), preventing the server from inspecting chat or stream content.
- Documented Insertable Streams frame transformation pipeline in `docs/SFU_DESIGN.md`.

### Phase 5 — Performance, Testing & Quality Gates
- **Server Vitest Suite**: 40 / 40 passing tests.
- **Client Vitest Suite**: 35 / 35 passing tests.
- **ESLint**: 0 errors across server and client.
- **Vite Production Build**: 100% clean compilation in ~7.9s with PWA service worker precache.

### Phase 6 — DevOps & Cloud Deployment
- **Docker Compose**: Root [docker-compose.yml](file:///I:/Web%20devlopment/Screenshare/docker-compose.yml) containerizing LiveKit Server, Redis, Signaling, and Web Client.
- **Vercel Config**: [vercel.json](file:///I:/Web%20devlopment/Screenshare/vercel.json) with SPA rewrites and `camera=(self), microphone=(self), display-capture=(self)` Permissions-Policy.
- **Render Config**: [render.yaml](file:///I:/Web%20devlopment/Screenshare/render.yaml) with `/health` healthcheck and CORS integration.

---

## 6. Cloud Deployment & Hosting Specifications

### Frontend (Vercel)
- **Framework**: Vite
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_SERVER_URL`: `https://your-server.onrender.com`
  - `VITE_LIVEKIT_URL`: `wss://your-project.livekit.cloud` (optional)

### Backend (Render / Railway / VPS)
- **Environment**: Node.js
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `node src/index.js`
- **Environment Variables**:
  - `PORT`: `4000`
  - `ALLOWED_ORIGIN`: `https://your-app.vercel.app`
  - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (optional)

---

## 7. Automated Verification Results

```
Server Vitest Suite:
 ✓ __tests__/roomManager.test.js (18 tests)
 ✓ __tests__/rateLimiter.test.js (8 tests)
 ✓ __tests__/socketHandlers.test.js (11 tests)
 ✓ __tests__/livekitToken.test.js (3 tests)
 Total: 40 passed (40)

Client Vitest Suite:
 ✓ src/utils/__tests__/recentRooms.test.js (6 tests)
 ✓ src/utils/__tests__/linkify.test.js (6 tests)
 ✓ src/utils/__tests__/crypto.test.js (3 tests)
 ✓ src/utils/__tests__/sanitizer.test.js (9 tests)
 ✓ src/utils/__tests__/roomId.test.js (5 tests)
 ✓ src/utils/__tests__/audioPresets.test.js (2 tests)
 ✓ src/utils/__tests__/formatTime.test.js (4 tests)
 Total: 35 passed (35)
```
