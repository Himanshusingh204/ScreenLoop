# Screenloop — Master Engineering Plan v2

> **Screenloop**: Zero-friction, privacy-first peer-to-peer watch party and real-time screen sharing web platform.
> **Stack**: React 18 + Vite | WebRTC Mesh | Socket.io | AES-GCM E2EE
> **Author**: [Himanshu](https://github.com/Himanshusingh204)
> **License**: MIT

---

## Table of Contents

1. [Project Status](#1-project-status)
2. [Bug Inventory](#2-bug-inventory)
3. [Security Audit](#3-security-audit)
4. [Code Quality Issues](#4-code-quality-issues)
5. [Missing Features & UX Gaps](#5-missing-features--ux-gaps)
6. [New Pages Design](#6-new-pages-design)
7. [Execution Roadmap](#7-execution-roadmap)

---

## 1. Project Status

| Layer | Tech | Status |
|-------|------|--------|
| Frontend | React 18 + Vite + React Router v6 | Working, 2 pages (Home, Room) |
| Styling | CSS Modules (7 files) + 6 themes | Working, some hardcoded colors |
| Backend | Node.js + Express + Socket.io | Working, 4 source files |
| Encryption | AES-256-GCM via Web Crypto API | Working |
| P2P | WebRTC mesh (unlimited peers) | Working |
| Testing | Vitest (client + server) | 40/40 tests passing |
| CI | GitHub Actions | Build + lint, no test execution |

### Routes
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Home.jsx` | Landing page, create/join room |
| `/room/:roomId` | `Room.jsx` | Watch room with video, chat, controls |
| `*` | Redirect → `/` | Catch-all (no 404 page) |

---

## 2. Bug Inventory

### Critical (5)

| # | Bug | File:Line | Description |
|---|-----|-----------|-------------|
| B1 | WebRTC cross-room signaling | `socketHandlers.js:129-157` | No check that `targetId` is in the same room. Users in Room A can send offers to any socket in Room B. |
| B2 | `room:closed` dead code | `socketHandlers.js:264-277` | `leaveRoom()` never returns `roomClosed: true`. The entire emission block is unreachable. |
| B3 | Socket ref race condition | `Room.jsx:81-97` | `socketRef.current` is `null` on first render. `useWebRTC` and `useRoom` receive `null` and never re-register listeners. |
| B4 | Duplicate host state | `Room.jsx:159` + `useRoom.js:132` | Two separate `isActualHost` states. Room.jsx uses its own; useRoom's internal state is unused. |
| B5 | Kick name hardcoded | `socketHandlers.js:234` | Kicked user's name is always `'Someone'`. Other participants can't identify who was kicked. |

### High (4)

| # | Bug | File:Line | Description |
|---|-----|-----------|-------------|
| B6 | Chat name impersonation | `socketHandlers.js:184,202` | Client sends `name` in payload; server trusts it instead of looking up from `room.participants`. |
| B7 | Rate limiter wipe on disconnect | `rateLimiter.js:97-101` | `cleanupSocket` deletes all rate data for the IP, not just the disconnecting socket. |
| B8 | `room:kick` drops newHostId | `socketHandlers.js:221-238` | `newHostId` hardcoded to `null`. If kicked user was host, clients aren't told who the new host is. |
| B9 | TopBar missing roomId destructuring | `TopBar.jsx:19-28` | `roomId` is used in JSX but not destructured from props. |

### Medium (8)

| # | Bug | File:Line | Description |
|---|-----|-----------|-------------|
| B10 | Rate limiter Maps unbounded | `rateLimiter.js:7-8` | No periodic cleanup = slow memory leak for IPs that never return. |
| B11 | `gender` param dead code | `roomManager.js:24,48` | Accepted but never passed by socketHandlers. Always `'other'`. |
| B12 | Sync events unvalidated | `socketHandlers.js:205-213` | `sync:pointer`, `sync:draw`, `sync:seek` relay raw client data with no type/size checks. |
| B13 | handleShareScreen race | `Room.jsx:286-297` | Iterates `participants` snapshot; late joiners are missed. |
| B14 | setTimeout leak in addToast | `useRoom.js:33-35` | Calls `setToasts` after unmount. |
| B15 | stopScreenShare kills all peers | `useWebRTC.js:221-229` | Destroys ALL peer connections, not just the sharing one. |
| B16 | No `room:leave` event | `socketHandlers.js` | Clients can't voluntarily leave without disconnecting. |
| B17 | Duplicate CSS definitions | `room.css:826,1264` + `room.css:834,1272` | `.reaction-overlay` and `.floating-emoji` defined twice with different values. |

---

## 3. Security Audit

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| S1 | CRITICAL | WebRTC cross-room signaling | `socketHandlers.js:129-157` | Validate targetId is in same room |
| S2 | HIGH | Client-trusted display name | `socketHandlers.js:184,202` | Look up name from room.participants |
| S3 | HIGH | No per-IP connection limit | `index.js` | Add connection throttling middleware |
| S4 | MEDIUM | No room creation rate limit | `socketHandlers.js:36` | Add rate limit for room:create |
| S5 | MEDIUM | Rate limiter only covers chat/reactions | `socketHandlers.js` | Extend to sync events |
| S6 | MEDIUM | No `X-Powered-By` removal | `index.js` | `app.disable('x-powered-by')` |
| S7 | MEDIUM | No uncaughtException/unhandledRejection | `index.js` | Add process error handlers |
| S8 | MEDIUM | PIN in sessionStorage plaintext | `Home.jsx:32` | Acceptable for ephemeral rooms, document |
| S9 | LOW | TURN credentials hardcoded | `useWebRTC.js:14-22` | Move to env vars |
| S10 | LOW | Missing security headers | `index.js:66-72` | Add HSTS, COOP, CORP |

---

## 4. Code Quality Issues

| # | Issue | Location |
|---|-------|----------|
| Q1 | Duplicate `isValidRoomId()` with different regex | `sanitizer.js` + `roomId.js` |
| Q2 | Dead exports: `sanitizeDisplayName`, `formatTime`, `closeAllPeers` | Multiple utils |
| Q3 | `useScrollReveal.js` is NOT a hook (exports animation objects) | `hooks/` dir |
| Q4 | 14 `console.log` in client violate ESLint `no-console` | `useWebRTC.js`, `useWakeLock.js` |
| Q5 | Duplicate `vercel.json` at root and in `client/` | Root + `client/` |
| Q6 | Stale `netlify.toml` in Vercel project | `client/netlify.toml` |
| Q7 | Root `node_modules/` + `package-lock.json` from accidental install | Root |
| Q8 | CI doesn't run tests | `.github/workflows/ci.yml` |
| Q9 | Server has no ESLint/Prettier | `server/` |
| Q10 | Inconsistent `React.memo` usage | Various components |
| Q11 | `useSoundEffects(muted)` muted param unreachable from UI | `Room.jsx:78` |
| Q12 | Hardcoded colors in room.css (15+ instances) | `room.css` |
| Q13 | No `prefers-reduced-motion` queries | All CSS files |
| Q14 | OG/Twitter URLs hardcoded | `client/index.html` |
| Q15 | `server/.env` and `.env.example` identical | `server/` |

---

## 5. Missing Features & UX Gaps

| # | Feature | Priority |
|---|---------|----------|
| F1 | No Error Boundary — crash = white screen | CRITICAL |
| F2 | No 404 page — invalid routes silently redirect | HIGH |
| F3 | No "host disconnected" UI for viewers | HIGH |
| F4 | No reconnection UI — no "Reconnecting..." overlay | HIGH |
| F5 | No focus trap in modals (a11y) | MEDIUM |
| F6 | No room TTL/expiry — abandoned rooms leak memory | MEDIUM |
| F7 | No typing indicators in chat | MEDIUM |
| F8 | No chat history for late joiners | MEDIUM |
| F9 | No HTTP request logging (morgan) | MEDIUM |
| F10 | No Express error handler middleware | MEDIUM |
| F11 | Hardcoded `alert()`/`window.confirm()` — blocking, unstyled | MEDIUM |
| F12 | No env var validation on server start | LOW |

---

## 6. New Pages Design

### 6.1 `/not-found` — Custom 404 Page
- Animated disconnected-cable SVG illustration
- "This page doesn't exist" message
- Auto-redirect countdown (10s) back to home
- CTA buttons: "Go Home" / "Create a Room"

### 6.2 `/about` — About Page
- Hero with app name + tagline + animated illustration
- Feature showcase: E2EE, P2P, No Signup, Free Hosting
- Architecture diagram (simplified SVG)
- Tech stack cards with icons
- GitHub link + open source section

### 6.3 `/help` — Help & FAQ Page
- Searchable FAQ with accordion sections
- Sections: Getting Started, Troubleshooting, Security, Keyboard Shortcuts
- Step-by-step illustrated guides
- Browser compatibility table

### 6.4 `/privacy` — Privacy Policy Page
- Clean legal-style layout
- Sections: Data Collection, E2EE, Room Keys, WebRTC, Logs
- "Last updated" date
- Plain-language explanations

### 6.5 Enhanced JoinScreen (replaces JoinModal)
- Full-screen pre-join experience
- Audio/video preview (camera/mic test)
- Display name editor with avatar preview
- Theme selection before joining
- Connection quality indicator
- "About this room" info panel

### 6.6 In-Room SettingsPanel (slide-out drawer)
- Audio output device selector
- Video quality preference
- Notification toggle
- Sound effects toggle (fixes muted-but-unreachable bug)
- Theme switcher

---

## 7. Execution Roadmap

### Phase 1: Critical Bug Fixes & Security (8 tasks)
1. [ ] Fix WebRTC cross-room signaling validation (`socketHandlers.js`)
2. [x] Fix `room:closed` dead code — add `roomClosed` to `leaveRoom()` return
3. [ ] Fix socket ref race condition (`Room.jsx` — use useState for socket)
4. Consolidate host state (single source of truth)
5. Server: trust participant name from room state, not client
6. Add `uncaughtException`/`unhandledRejection` handlers
7. Remove `X-Powered-By` header
8. Add Express error handler middleware

### Phase 2: Important Fixes (8 tasks)
9. Fix rate limiter cleanup (don't wipe shared IP data)
10. Add rate limiter expiry cleanup (setInterval sweep)
11. Fix `room:kick` to emit `newHostId` and real kicked name
12. Fix `TopBar` missing `roomId` destructuring
13. Fix duplicate CSS definitions in `room.css`
14. Add `prefers-reduced-motion` media queries
15. Replace hardcoded colors with CSS variables
16. Replace `alert()`/`window.confirm()` with custom ConfirmModal

### Phase 3: Error Boundaries & UX (5 tasks)
17. Create `ErrorBoundary` component, wrap in App.jsx
18. [x] Create `/not-found` 404 page
19. Add "host disconnected" UI state
20. Add reconnection overlay + socket reconnect/failed handlers
21. Add focus trap to modals

### Phase 4: New Pages (6 tasks)
22. [x] Build `/about` page
23. [x] Build `/help` page
24. [x] Build `/privacy` page
25. Upgrade JoinModal → full JoinScreen
26. Build in-room SettingsPanel
27. [x] Add new routes to App.jsx (/features, /security, /terms, /about, /help, /privacy)

### Phase 5: Code Quality Cleanup (12 tasks)
28. Remove dead code (sanitizeDisplayName, formatTime, closeAllPeers, duplicate isValidRoomId)
29. Move `useScrollReveal.js` to `utils/animations.js`
30. Replace `console.log` with `console.debug` in client
31. Delete root `node_modules/` + `package-lock.json`
32. Remove duplicate `vercel.json` at root
33. Remove stale `netlify.toml`
34. Add server-side ESLint + Prettier
35. Update CI to run tests
36. Add per-IP connection limit
37. Add room TTL / auto-cleanup
38. Fix `server/.env.example` with placeholder values
39. Make rate limits / room size configurable via env vars

---

## Total: 39 tasks across 5 phases

| Phase | Tasks | Est. Effort |
|-------|-------|-------------|
| Phase 1: Critical Bugs & Security | 8 | High |
| Phase 2: Important Fixes | 8 | Medium |
| Phase 3: Error Boundaries & UX | 5 | Medium |
| Phase 4: New Pages | 6 | High |
| Phase 5: Code Quality | 12 | Low |
| **Total** | **39** | |

---

# PLAN v3 — Remaining Work (51 Gaps)

> Generated from full codebase audit. All 39 tasks from v1/v2 are DONE.
> These 51 items are what's LEFT.

---

## Phase 6: Critical Bug Fixes (5 tasks)

| # | Task | Files | Description |
|---|------|-------|-------------|
| 40 | Fix gender field silently dropped | `socketHandlers.js:35,69` | Server ignores `gender` param from client — all avatars show as "bottts" robots. Pass gender through in `room:create` and `room:join` handlers. |
| 41 | Fix WebRTC dies after socket reconnect | `Room.jsx:97-115`, `useWebRTC.js` | After reconnect, peers are stale/dead. Need to re-request offer from host and re-negotiate connections. |
| 42 | Fix `hostOnlyControls` not synced to late joiners | `socketHandlers.js:100-105` | Include `hostOnlyControls` state in `room:joined` response so late joiners see correct state. |
| 43 | Add room creation rate limiting | `socketHandlers.js:35`, `rateLimiter.js` | Call `checkSpam()` in `room:create` handler. Add max room count limit. |
| 44 | Validate room ID format on server | `socketHandlers.js:37` | Validate `roomId` matches `/^[A-Za-z0-9]+$/` to prevent special character injection. |

## Phase 7: High Priority UX Fixes (12 tasks)

| # | Task | Files | Description |
|---|------|-------|-------------|
| 45 | Add loading spinner after join submit | `Room.jsx:293-306` | Show "Connecting to room..." overlay instead of frozen form while waiting for `room:joined`. |
| 46 | Add "room not found" guidance | `Room.jsx:213-216` | When error is "Room not found", show a "Go Home" button alongside the error message. |
| 47 | Add screen recording (MediaRecorder) | `Room.jsx`, `ControlBar.jsx` | Add record button that captures the local/remote stream and downloads as WebM. |
| 48 | Add audio-only mode | `useWebRTC.js:131-136`, `ControlBar.jsx` | Add option to share audio without video (music listening parties). |
| 49 | Add keyboard shortcuts | `Room.jsx`, `ControlBar.jsx` | Add: S=screen share, D=draw, C=chat, Esc=close, Space=play/pause, 1/2/3=quality, T=stats. |
| 50 | Add typing indicators | `socketHandlers.js`, `ChatSidebar.jsx`, `useRoom.js` | Server broadcasts `chat:typing` to room. Client shows "X is typing..." below chat input. |
| 51 | Add message delivery confirmation | `useRoom.js`, `socketHandlers.js` | Server emits `chat:ack` with message ID. Client shows checkmark or "sending..." status. |
| 52 | Add WebRTC re-negotiation on reconnect | `Room.jsx`, `useWebRTC.js` | On socket reconnect, viewer requests new offer from host to re-establish peer connections. |
| 53 | Improve "room full" error message | `socketHandlers.js:86` | Include participant count and max limit in the error (e.g., "Room is full (10/10)"). |
| 54 | Fix wake lock re-request race condition | `useWakeLock.js:8-21` | Add retry with setTimeout on failure. Listen for `release` event to re-request. |
| 55 | Only fire confetti for host | `Room.jsx:211` | Check `isActualHost` before calling `fireRoomLaunchConfetti()`. |
| 56 | Show "permission denied" message for screen share | `Room.jsx:308-318` | Instead of silently suppressing `NotAllowedError`, show a helpful message about browser settings. |

## Phase 8: Chat Improvements (8 tasks)

| # | Task | Files | Description |
|---|------|-------|-------------|
| 57 | Add auto-linkification for URLs in chat | `ChatSidebar.jsx` | Detect any URL pattern and render as clickable `<a>` tag (not just image URLs). |
| 58 | Add copy message button | `ChatSidebar.jsx` | Hover/click to copy message text to clipboard. |
| 59 | Add message timestamps | `ChatSidebar.jsx` | Show relative time ("2m ago") on each message. |
| 60 | Add chat message search | `ChatSidebar.jsx` | Search/filter input at top of chat panel. |
| 61 | Add unread messages badge | `ChatSidebar.jsx` | Show count on "Live Chat" tab when sidebar is on "People" tab. |
| 62 | Auto-grow chat textarea | `ChatSidebar.jsx:177` | Textarea expands as user types multi-line messages. |
| 63 | Add emoji picker | `ChatSidebar.jsx` | Simple grid of common emojis for quick reactions in chat. |
| 64 | Add chat message edit/delete | `socketHandlers.js`, `ChatSidebar.jsx` | Host can delete any message. User can edit/delete own messages within 60s. |

## Phase 9: Keyboard Shortcuts & Accessibility (7 tasks)

| # | Task | Files | Description |
|---|------|-------|-------------|
| 65 | Add Escape key handling | `Room.jsx` | Esc closes modals, exits fullscreen, closes sidebar. |
| 66 | Add volume slider aria-valuetext | `ControlBar.jsx` | Add `aria-valuetext` to volume range input for screen readers. |
| 67 | Add AnnotationCanvas aria-pressed | `AnnotationCanvas.jsx` | Tool buttons need `aria-pressed` state for screen readers. |
| 68 | Add ReactionOverlay live region | `ReactionOverlay.jsx` | Announce new reactions to screen readers via `aria-live`. |
| 69 | Add ShareModal QR alt text | `ShareModal.jsx` | Add `aria-label` or `alt` text to QR code canvas. |
| 70 | Add fullscreen shortcut hint overlay | `Room.jsx` | Brief hint showing available shortcuts when entering fullscreen. |
| 71 | Add tooltip for all ControlBar buttons | `ControlBar.jsx` | Ensure every button has `title` and `aria-label`. |

## Phase 10: Polish & Performance (10 tasks)

| # | Task | Files | Description |
|---|------|-------|-------------|
| 72 | Add recent rooms history | `Home.jsx` | Store last 10 visited rooms in `localStorage`. Show "Recent Rooms" section. |
| 73 | Add route-level error boundaries | `App.jsx` | Wrap each route in its own ErrorBoundary for partial recovery. |
| 74 | Add code splitting (React.lazy) | `App.jsx` | Lazy-load Room, About, Help, Privacy pages. |
| 75 | Persist theme preference | `ThemeSelector.jsx` | Save selected theme to `localStorage` and restore on load. |
| 76 | Fix AudioContext leak | `audioBooster.js:18` | Reuse or properly close previous AudioContext before creating new one. |
| 77 | Add Connection quality auto-adaptation | `useWebRTC.js`, `useWebRTCStats.js` | When quality is "poor", auto-downgrade to 720p. |
| 78 | Add room session persistence | `Room.jsx` | Store roomId + name in sessionStorage. Auto-rejoin on accidental refresh. |
| 79 | Add JoinModal name character counter | `JoinModal.jsx:49` | Show "15/30" character count below name input. |
| 80 | Add ShareModal host explanation note | `ShareModal.jsx` | Add note: "Friends will join as viewers automatically." |
| 81 | Add PiP button on video overlay | `VideoPlayer.jsx` | Picture-in-Picture button as overlay on the video itself. |

## Phase 11: Server Hardening (8 tasks)

| # | Task | Files | Description |
|---|------|-------|-------------|
| 82 | Add room listing endpoint | `index.js` | `GET /api/rooms` returns active room count and metadata. |
| 83 | Add structured logging | `index.js`, `socketHandlers.js` | Replace `console.log` with pino/winston for production. |
| 84 | Add typing indicator relay | `socketHandlers.js` | Handle `chat:typing` events, broadcast to room (rate-limited). |
| 85 | Add message acknowledgment | `socketHandlers.js` | Emit `chat:ack` back to sender after relay. |
| 86 | Add max rooms limit | `roomManager.js` | Cap total rooms at configurable limit (default 100). |
| 87 | Add reaction rate limit (lower) | `socketHandlers.js` | Separate rate limit for reactions (max 5/sec per user). |
| 88 | Validate sync event data types | `socketHandlers.js:205-213` | Validate x, y, time are numbers. Validate stroke is array with max length. |
| 89 | Add disconnect reason tracking | `socketHandlers.js:250` | Log disconnect reasons and detect abnormal disconnection patterns. |

---

## Summary

| Phase | Tasks | Category |
|-------|-------|----------|
| Phase 6: Critical Bug Fixes | 5 | Security / Core |
| Phase 7: High Priority UX | 12 | Core Features |
| Phase 8: Chat Improvements | 8 | Feature Completeness |
| Phase 9: Keyboard & A11y | 7 | Accessibility |
| Phase 10: Polish & Performance | 10 | UX Polish |
| Phase 11: Server Hardening | 8 | Backend |
| **Total** | **50** | |

### Priority Order
1. **Phase 6** (Critical bugs) — must fix before anything else
2. **Phase 7** (High UX) — core user experience
3. **Phase 9** (A11y) — legal/compliance requirement
4. **Phase 8** (Chat) — most visible feature gap
5. **Phase 10** (Polish) — perceived quality
6. **Phase 11** (Server) — production readiness
