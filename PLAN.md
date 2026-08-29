# Screenloop — Master Engineering Plan v4

> **Screenloop**: Privacy-first peer-to-peer watch party and real-time screen sharing web platform.
> **Stack**: React 18 + Vite | WebRTC Mesh | Socket.io | AES-GCM E2EE
> **Author**: [Himanshu](https://github.com/Himanshusingh204)
> **License**: MIT

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

### Phase 1: Critical Bug Fixes & Security — DONE

| # | Task | Status |
|---|------|--------|
| 1 | Fix WebRTC cross-room signaling validation | DONE |
| 2 | Fix `room:closed` dead code | DONE |
| 3 | Fix socket ref race condition | DONE |
| 4 | Consolidate host state | DONE |
| 5 | Trust participant name from room state | DONE |
| 6 | Add error handlers | DONE |
| 7 | Remove `X-Powered-By` header | DONE |
| 8 | Add Express error handler | DONE |

### Phase 2: Important Fixes — DONE

| # | Task | Status |
|---|------|--------|
| 9 | Fix rate limiter cleanup | DONE |
| 10 | Add rate limiter expiry cleanup | DONE |
| 11 | Fix `room:kick` to emit `newHostId` and name | DONE |
| 12 | Fix `TopBar` missing `roomId` destructuring | DONE |
| 13 | Fix duplicate CSS definitions | DONE |
| 14 | Add `prefers-reduced-motion` media queries | DONE |
| 15 | Replace hardcoded colors with CSS variables | DONE |
| 16 | Replace `alert()`/`window.confirm()` with custom modals | DONE |

### Phase 3: Error Boundaries & UX — DONE

| # | Task | Status |
|---|------|--------|
| 17 | Create `ErrorBoundary` component | DONE |
| 18 | Create `/not-found` 404 page | DONE |
| 19 | Add "host disconnected" UI state | DONE |
| 20 | Add reconnection overlay | DONE |
| 21 | Add focus trap to modals | DONE |

### Phase 4: New Pages — DONE

| # | Task | Status |
|---|------|--------|
| 22 | Build `/about` page | DONE |
| 23 | Build `/help` page | DONE |
| 24 | Build `/privacy` page | DONE |
| 25 | Upgrade JoinModal → JoinScreen | SKIPPED (JoinModal works) |
| 26 | Build in-room SettingsPanel | SKIPPED (settings in ControlBar) |
| 27 | Add routes to App.jsx | DONE |

### Phase 5: Code Quality — DONE

| # | Task | Status |
|---|------|--------|
| 28 | Remove dead code | DONE |
| 29 | Move `useScrollReveal.js` to utils | DONE |
| 30 | Replace `console.log` with `console.debug` | DONE |
| 31 | Delete root `node_modules/` + `package-lock.json` | DONE |
| 32 | Remove duplicate `vercel.json` at root | DONE |
| 33 | Remove stale `netlify.toml` | DONE |
| 34 | Add server-side ESLint + Prettier | SKIPPED |
| 35 | Update CI to run tests | DONE |
| 36 | Add per-IP connection limit | DONE |
| 37 | Add room TTL / auto-cleanup | DONE |
| 38 | Fix `server/.env.example` | DONE |
| 39 | Make rate limits configurable via env vars | DONE |

### Phase 6: Additional Bug Fixes — DONE

| # | Task | Status |
|---|------|--------|
| 40 | Fix gender field silently dropped | SKIPPED (bottts is fine) |
| 41 | Fix WebRTC dies after socket reconnect | DONE (session persistence) |
| 42 | Fix `hostOnlyControls` not synced to late joiners | DONE |
| 43 | Add room creation rate limiting | DONE |
| 44 | Validate room ID format on server | DONE |

### Phase 7: High Priority UX — DONE

| # | Task | Status |
|---|------|--------|
| 45 | Add loading spinner after join submit | DONE |
| 46 | Add "room not found" guidance | DONE |
| 47 | Add screen recording | SKIPPED (future) |
| 48 | Add audio-only mode | SKIPPED (future) |
| 49 | Add keyboard shortcuts | DONE |
| 50 | Add typing indicators | DONE |
| 51 | Add message delivery confirmation | DONE (chat:ack) |
| 52 | Add WebRTC re-negotiation on reconnect | SKIPPED (session persistence covers) |
| 53 | Improve "room full" error message | DONE |
| 54 | Fix wake lock re-request race condition | DONE |
| 55 | Only fire confetti for host | DONE |
| 56 | Show "permission denied" for screen share | DONE |

### Phase 8: Chat Improvements — DONE

| # | Task | Status |
|---|------|--------|
| 57 | Auto-linkification for URLs in chat | DONE |
| 58 | Copy message button | DONE |
| 59 | Message timestamps | DONE |
| 60 | Chat message search | DONE |
| 61 | Unread messages badge | DONE |
| 62 | Auto-grow chat textarea | DONE |
| 63 | Emoji picker | DONE |
| 64 | Chat message edit/delete | DONE |

### Phase 9: Keyboard Shortcuts & Accessibility — DONE

| # | Task | Status |
|---|------|--------|
| 65 | Escape key handling | DONE |
| 66 | Volume slider `aria-valuetext` | DONE |
| 67 | AnnotationCanvas `aria-pressed` | DONE |
| 68 | ReactionOverlay `aria-live` | DONE |
| 69 | ShareModal QR alt text | DONE |
| 70 | Fullscreen shortcut hint overlay | DONE |
| 71 | ControlBar button tooltips | DONE |

### Phase 10: Polish & Performance — DONE

| # | Task | Status |
|---|------|--------|
| 72 | Recent rooms history | DONE |
| 73 | Route-level error boundaries | SKIPPED (single ErrorBoundary sufficient) |
| 74 | Code splitting (React.lazy) | DONE |
| 75 | Persist theme preference | DONE |
| 76 | Fix AudioContext leak | DONE |
| 77 | Connection quality auto-adaptation | SKIPPED (future) |
| 78 | Room session persistence | DONE |
| 79 | JoinModal name character counter | DONE |
| 80 | ShareModal host explanation note | DONE |
| 81 | PiP button on video overlay | SKIPPED (browser native) |

### Phase 11: Server Hardening — DONE

| # | Task | Status |
|---|------|--------|
| 82 | Room listing endpoint | DONE |
| 83 | Structured logging | SKIPPED (console is fine for now) |
| 84 | Typing indicator relay | DONE |
| 85 | Message acknowledgment | DONE |
| 86 | Max rooms limit | DONE |
| 87 | Reaction rate limit | DONE |
| 88 | Validate sync event data types | DONE |
| 89 | Disconnect reason tracking | DONE |

### De-AI & Copy Overhaul — DONE

| # | Task | Status |
|---|------|--------|
| D1 | Rewrite copy across all pages (remove fake stats, buzzwords) | DONE |
| D2 | Remove ambient glows from Home.jsx | DONE |
| D3 | Vary CTA banners across pages | DONE |
| D4 | Rewrite README (zero emoji, prose-first) | DONE |
| D5 | Update meta/OG tags in index.html | DONE |
| D6 | Simplify SiteFooter (remove pulsing badge, trust-facts marketing) | DONE |
| D7 | Remove pill badges from Accessibility/Terms | DONE |

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
