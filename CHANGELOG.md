# Changelog

All notable changes to the **ScreenLoop** platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Upcoming

### Planned
- **Google Meet-style Video Conferencing (`/meet`)**: Multi-peer camera/microphone video grid with active speaker detection, floating controls, pre-call lobby preview, and presentation spotlight mode.
- **Presenter Screen Sharing in Meet**: Simultaneous webcam + screen share broadcasting.
- **In-Call Hand Raise & Reactions**: Synchronized hand raising queue and floating emoji reactions.

---

## [1.5.0] - 2026-08-29

### Added
- Dedicated **Google Meet Video Call Master Plan** (`VIDEO_CALL_MASTER_PLAN.md`) with comprehensive UX/UI blueprints and WebRTC signaling contracts.
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
