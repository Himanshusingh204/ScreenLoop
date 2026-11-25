# Changelog

All notable changes to the **ScreenLoop** platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Upcoming

### Added
- **On-device live captions** (`CC` in watch rooms): Whisper in a Web Worker (WebGPU, WASM fallback), optional English translation, downloadable extractive recap. No audio or transcript leaves the device.
- **Media-frame end-to-end encryption** for watch rooms (LiveKit `ExternalE2EEKeyProvider`, key from the URL `#fragment`), with per-recipient key rotation when the host removes someone (ECDH P-256 + HKDF salted with the room key + AES-GCM, epoch-ordered).
- **Video Meet on the LiveKit SFU** (opt-in `VITE_MEET_SFU=true`) with automatic P2P mesh fallback.
- **Scale-out**: optional Redis Socket.IO adapter (`REDIS_URL`), room-affinity load balancing, `/healthz`, Prometheus `/metrics` (optional `METRICS_TOKEN`), nginx / docker-compose / Kubernetes manifests, Socket.IO load test with published baseline.
- **Live verification suite** (`e2e/`) driving real Chrome against a real LiveKit server; `docs/THREAT_MODEL.md`, `SYSTEM_DESIGN.md`, `VERIFICATION.md`, `AI_EVAL.md`, `CASE_STUDY.md`.
- CI: dependency audit and a 3-node compose smoke test.
- Server-side validation of playback, pointer, reaction and annotation payloads (also fixes live annotations being silently dropped: the client sends one stroke segment, the old check required an array).
- Opt-in "kick and block rejoin"; `deploy/k8s/check.py` static manifest check; multi-node load test (1,500 clients, 100% delivered).

### Changed
- **LiveKit tokens are issued over the authenticated socket (`sfu:token`)**; the open `POST /api/token` endpoint was removed. Identity is the socket id, only the server-recorded host can publish, and kicked users are removed from the SFU.
- LiveKit rooms are namespaced `w:<id>` / `m:<id>`; Meet Socket.IO rooms are namespaced `meet:<id>`.
- Clicking Share while the SFU is still connecting now waits instead of silently falling back to P2P.
- Dependency updates (`npm audit fix`): server 1 critical + 5 high advisories and client 3 high advisories resolved.

### Fixed
- Per-IP limits collapsed to one bucket behind a load balancer; they now use the rightmost `X-Forwarded-For` hop when `TRUST_PROXY=true` (nginx overwrites the header).
- Multi-node: PIN could be bypassed via the token endpoint, and a same-named "shadow" room could be created on another node; sockets are now bound to their room.
- `docker-compose.yml` could never start LiveKit (key format) and handed browsers an unreachable hostname.
- nginx `events {}` capped the load balancer at ~256 users and the server Dockerfile HEALTHCHECK could never pass (IPv6 `localhost`).
- `/healthz`, `/health`, `/metrics` returned 500 in production for requests without an `Origin` header.
- Meet mesh fallback missed peers depending on join order; the "end-to-end encrypted" indicator no longer stays up after a fall back to P2P.
- Captions: a single bad audio window no longer stops captions; unsupported browsers fail cleanly instead of crashing the page.

### Accessibility
- `ConfirmModal` traps and restores focus, closes on Escape, and is labelled/described for screen readers.

### Known limitations
- A plain kick is not a ban (the link is the credential); the host can now opt in to blocking rejoin for the room's lifetime (keyed like the other abuse limits, so people behind one NAT may be blocked too). Meet is not frame-encrypted, and SFU and mesh Meet peers do not interoperate.
- `deploy/k8s/` has not been applied to a cluster. Caption accuracy is measured on one clean synthetic clip only.

### Planned
- Chat message search & filter (see `client/src/data/roadmap.js`).
- Audio description track support.

---

## [1.5.0] - 2026-08-29

### Added
- Dedicated **Google Meet Video Call Master Plan** (`VIDEO_CALL_MASTER_PLAN.md`, since consolidated into `MASTER_PLAN_NEW.md`) with comprehensive UX/UI blueprints and WebRTC signaling contracts.
- Automated **CodeQL static security analysis** workflow (`.github/workflows/codeql.yml`).
- Repository community standards: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `CHANGELOG.md`.
- Structured GitHub Issue Forms for bug reports and feature proposals (`.github/ISSUE_TEMPLATE/`).
- Automated dependency update configuration via `.github/dependabot.yml`.
- Turnkey deployment configurations for Vercel (`vercel.json`) and Render (`render.yaml`).
- Centralized architecture and memory context file (`PROJECT_MEMORY.md`).

### Changed
- **Navbar Update**: Replaced `Security` in primary header navigation (`SiteHeader.jsx`) with `Video Meet` (`/meet`). Retained Security documentation link in `SiteFooter.jsx`.
- **Content Security Policy (CSP)**: Added `worker-src 'self' blob:` and `script-src blob:` directives to allow in-memory PWA and canvas background workers without CSP violations.
- **Render Build Compatibility**: Added explicit build command and `/health` health check path to `server/package.json` and `render.yaml`.

---

## [1.4.0] - 2026-08-20

### Added
- New informational and discovery pages: `/contact`, `/roadmap`, `/changelog`, and `/accessibility`.
- Universal `SiteHeader` and `SiteFooter` navigation across all informational routes.
- Screen recording hook (`useScreenRecording.js`) for capturing stream sessions locally.
- Route error boundary component (`RouteErrorBoundary.jsx`) for fault-tolerant page rendering.

---

## [1.3.0] - 2026-08-20

### Added
- Recent rooms local history on home page (last 10 rooms stored privately in `localStorage`).
- Automatic URL linkification in chat messages (`linkify.js`).
- One-click copy button on chat messages.
- Live character counter on participant join name field.
- Host instructions badge in the share modal.

---

## [1.2.0] - 2026-08-19

### Added
- Reconnection resilience: auto-rejoin PIN-protected rooms after brief network blips.
- Visual toast notification system for signaling errors, connection drops, and participant events.
- Screen Wake Lock API integration (`useWakeLock.js`) to keep displays awake during movies.
- Consistent avatar gender generator (`dicebear`) for hosts and viewers.

---

## [1.1.0] - 2026-08-18

### Security & Hardening
- WebRTC signaling validation: messages restricted strictly to authorized same-room peers.
- Leaky-bucket and sliding-window rate limiting on room creation and socket connection floods (`rateLimiter.js`).
- PIN protection brute-force rate limiter.
- Express security middleware: stripped `X-Powered-By`, enforced `X-Content-Type-Options: nosniff`.
- Global client error boundary (`ErrorBoundary.jsx`) and custom 404 page (`NotFound.jsx`).

---

## [1.0.0] - 2026-08-17

### Initial Release
- Peer-to-peer screen sharing up to 1080p60 via WebRTC mesh topology.
- Cinema-quality audio pass-through with voice suppression filters disabled.
- Web Audio API dialogue volume booster (`audioBooster.js`).
- Client-side AES-256-GCM encrypted chat via Web Crypto API with URL hash fragment key storage (`#key`).
- Live drawing canvas and synchronized laser pointer overlay (`AnnotationCanvas.jsx`).
- Real-time WebRTC telemetry diagnostics HUD (FPS, bitrate, packet loss, RTT).
- Complete informational pages: `/features`, `/security`, `/about`, `/help`, `/privacy`, `/terms`.
