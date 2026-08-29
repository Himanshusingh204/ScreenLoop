# Screenloop — Master Engineering Plan v4

> **Screenloop**: Privacy-first peer-to-peer watch party and real-time screen sharing web platform.
> **Stack**: React 18 + Vite | WebRTC Mesh | Socket.io | AES-GCM E2EE
> **Author**: [Himanshu](https://github.com/Himanshusingh204)
> **License**: MIT

For architecture, data flow, and component details, see ARCHITECTURE.md

---

## Table of Contents

1. [Project Status](#1-project-status)
2. [Task Tracker](#2-task-tracker)
3. [Remaining Work](#3-remaining-work)

---

## 1. Project Status

| Layer | Tech | Status |
|-------|------|--------|
| Frontend | React 18 + Vite + React Router v6 | Working, 13 routes, React.lazy code splitting |
| Styling | Modular CSS (8 files) + 5 themes | Working |
| Backend | Node.js + Express + Socket.io | Working, room cap, /api/rooms endpoint |
| Encryption | AES-256-GCM via Web Crypto API | Working |
| P2P | WebRTC mesh | Working |
| Testing | Vitest (client) + Jest (server) | 67 tests passing (30 client, 37 server) |

---

## 2. Task Tracker

### Phase 1: Critical Bug Fixes & Security — 8/8 tasks done
WebRTC cross-room signaling validation, dead code cleanup, socket ref race condition, host state consolidation, name trust from room state, error handlers, X-Powered-By removal, Express error handler.

### Phase 2: Important Fixes — 8/8 tasks done
Rate limiter cleanup/expiry, room:kick newHostId fix, TopBar roomId destructuring, duplicate CSS removal, prefers-reduced-motion, CSS variable replacement, custom modals replacing alert()/confirm().

### Phase 3: Error Boundaries & UX — 5/5 tasks done
ErrorBoundary component, /not-found 404 page, host disconnected UI, reconnection overlay, focus trap in modals.

### Phase 4: New Pages — 4/5 tasks done (2 skipped)
About, Help, Privacy pages built. Routes added to App.jsx. JoinScreen upgrade skipped (JoinModal works). In-room SettingsPanel skipped (settings in ControlBar).

### Phase 5: Code Quality — 12/12 tasks done (1 skipped)
Dead code removal, useScrollReveal moved to utils, console.log to console.debug, root node_modules cleanup, stale vercel.json/netlify.toml removal, per-IP connection limit, room TTL, env var config. Server ESLint+Prettier skipped.

### Phase 6: Additional Bug Fixes — 4/5 tasks done
Gender passthrough skipped (bottts is fine). WebRTC reconnect session persistence, hostOnlyControls sync, room creation rate limiting, room ID format validation all done.

### Phase 7: High Priority UX — 9/12 tasks done (3 skipped)
Loading spinner, room not found guidance, keyboard shortcuts, typing indicators, chat:ack, room full error, wake lock fix, confetti for host only, permission denied toast all done. Screen recording, audio-only mode, WebRTC re-negotiation skipped (future).

### Phase 8: Chat Improvements — 8/8 tasks done
Auto-linkify, copy button, timestamps, search, unread badge, auto-grow textarea, emoji picker, edit/delete.

### Phase 9: Keyboard Shortcuts & Accessibility — 7/7 tasks done
Escape key, aria-valuetext, aria-pressed, aria-live, QR alt text, fullscreen hint overlay, tooltips.

### Phase 10: Polish & Performance — 7/10 tasks done (3 skipped)
Recent rooms, React.lazy code splitting, theme persistence, AudioContext fix, room session persistence, JoinModal counter, ShareModal host note all done. Route-level error boundaries, connection quality auto-adaptation, PiP button skipped.

### Phase 11: Server Hardening — 7/8 tasks done (1 skipped)
Room listing endpoint, typing relay, chat:ack, max rooms limit, reaction rate limit, sync validation, disconnect tracking all done. Structured logging skipped.

### De-AI & Copy Overhaul — 7/7 tasks done
Copy rewrite across 13 pages, ambient glows removal, varied CTAs, README rewrite, meta/OG tags update, footer simplification, pill badge removal.

---

## 3. Remaining Work

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 40 | Pass gender through to bot avatar | Low | Small |
| 47 | Add screen recording (MediaRecorder) | Medium | Large |
| 48 | Add audio-only mode | Medium | Medium |
| 77 | Connection quality auto-downgrade on poor connection | Medium | Medium |
| 83 | Structured logging (pino/winston) | Low | Medium |
| 34 | Server ESLint + Prettier | Low | Small |
| 73 | Per-route error boundaries | Low | Small |

---

## Summary

| Phase | Done | Total | Remaining |
|-------|------|-------|-----------|
| Phase 1-5 (Original) | 39 | 39 | 0 |
| Phase 6-11 (Extended) | 50 | 50 | 0 |
| De-AI Overhaul | 7 | 7 | 0 |
| **Total** | **96** | **96** | **7 Low-Priority** |
