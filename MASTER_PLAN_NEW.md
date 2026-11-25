# 🎬 Screenloop — Master Plan

> **Owner**: Himanshu · **Repo**: [Himanshusingh204/ScreenLoop](https://github.com/Himanshusingh204/ScreenLoop)
> **Purpose**: single source of truth for where the product stands and what we build next, in priority order.
> **Companion docs**: [ARCHITECTURE.md](ARCHITECTURE.md) (how it works), [PROJECT_MEMORY.md](PROJECT_MEMORY.md) (rules for contributors/AI), [CHANGELOG.md](CHANGELOG.md) (what shipped).

---

## 1. Product Vision

Screenloop is a **zero-account** place to watch together and meet face to face: open a link, you're in. Two modes share one design language:

- **Watch Party** — host shares a screen once; LiveKit SFU fans it out; cinema-grade audio; P2P fallback.
- **Video Meet** — multi-tile call with lobby, device switching, screen share, reactions, hand raise, chat.

**Principles**
1. No accounts, no database, no tracking.
2. Be honest about security (chat is E2EE; media is encrypted in transit only, until media E2EE ships).
3. Works on Node 18/20 CI, free-tier hosting, and a bad network.
4. Every page feels like one product: same tokens, same motion, same tone.

## 2. Status Snapshot (verified against code and CI)

| Area | State | Evidence |
|---|---|---|
| Watch rooms (LiveKit + P2P fallback) | ✅ Shipped | `useLiveKitRoom`, `useWebRTC`, `sfu:token` |
| Video Meet (P2P mesh; opt-in SFU with fallback) | ✅ Shipped, SFU verified live | `useMeetRTC`, `useMeetLiveKit`, `components/meet/*` |
| Chat (AES-256-GCM, search, edit/delete, typing) | ✅ Shipped | `crypto.js`, `ChatSidebar.jsx` |
| Security hardening (CORS, rate limits, PIN lockout, 1 MB cap) | ✅ Shipped | `server/src/*`, 40 server tests |
| CI (Node 18/20 tests, build, smoke, CodeQL) | ✅ Green | GitHub Actions |
| Wave footer + visual polish layer | ✅ Shipped | `polish.css`, `SiteFooter.jsx` |
| Media-frame E2EE (watch rooms) | ✅ Shipped, verified live | `useLiveKitRoom`, `mediaKeyCoordinator.js` |
| Multi-node scaling | ✅ Redis adapter + room affinity; compose stack run live; k8s not run | `deploy/`, `docs/SYSTEM_DESIGN.md` |
| On-device captions + recap | ✅ Shipped (1 clip benchmarked) | `client/src/ai/`, `docs/AI_EVAL.md` |
| Described-audio track | ❌ Not built | see P3 |

Quality gates today: server 83/83, client 84/84, lint clean, production build OK, live e2e suite in `e2e/` passing.

## 3. Roadmap (priority order)

### P0 — Trust & polish (now)
| # | Work | Done when |
|---|---|---|
| 0.1 | **UI/UX refresh**: unified tokens, wave footer, card depth, hero ambience (done); next: Home hero, Room welcome, Meet landing pass, empty/loading/error states | Same look across all pages in light + every dark theme; no layout shift; AA contrast |
| 0.2 | **Lint cleanup**: remove 53 unused imports | `eslint` 0 warnings; CI lint step added |
| 0.3 | **Test depth**: client tests for chat filter, `webrtcConfig`; server tests for `webrtc:stop`, Meet join/leave, `/api/token` validation | All green on Node 18 + 20; counts grow from 35 client / 40 server |
| 0.4 | **Docs honesty**: keep README/ARCHITECTURE aligned with code on each release | Review checklist item in PR template |

### P1 — Close the security gap
| # | Work | Done when |
|---|---|---|
| 1.1 | **Media E2EE** using LiveKit's E2EE (`ExternalE2EEKeyProvider`, key from URL hash) for watch rooms | SFU cannot decrypt media; key never sent to server; P2P fallback unchanged; docs + Security page updated; roadmap item done |
| 1.2 | Key rotation when host kicks a user | Kicked user cannot decrypt after kick |
| 1.3 | Move rate-limit/PIN counters behind an interface (prep for P2) | No behavior change; unit tested |

### P2 — Scale
| # | Work | Done when |
|---|---|---|
| 2.1 | Socket.IO **Redis adapter**, enabled only when `REDIS_URL` is set | Two server instances relay events across nodes |
| 2.2 | Room/meet registry in Redis (or sticky sessions documented) — `roomManager` is in-memory today | Rooms survive a second node; TTL sweep is cluster-safe |
| 2.3 | Load test (socket.io + 10-viewer room) with published numbers | Documented capacity per instance |

### P3 — Accessibility & reach
| # | Work | Done when |
|---|---|---|
| 3.1 | **Described-audio track**: host publishes second audio track; viewers toggle | Toggle in control bar; works in SFU and P2P |
| 3.2 | Captions/live transcript spike (browser SpeechRecognition, opt-in) | Decision recorded: ship or drop |
| 3.3 | Full keyboard + screen-reader pass on Room and Meet | No blockers in axe + manual NVDA pass |

## 4. Design System Direction

- **Type**: Geist (UI), Geist Mono (data), Newsreader (editorial accents). Tight tracking on display sizes, `text-wrap: balance` on headings.
- **Color**: one accent (violet) over tinted neutrals; surfaces derive from tokens with `color-mix`, so themes need no per-component overrides.
- **Depth**: tinted shadows (accent hue, never pure black), hover lift ≤ 3 px, honor `prefers-reduced-motion`.
- **Signature element**: layered wave footer, theme-aware.
- **Rules**: no new CSS framework; new visual rules go in `polish.css` or the page's stylesheet; use tokens, not hex.

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Docs overclaim security (happened with media E2EE) | Trust loss | Claims must cite code; PR checklist item |
| LiveKit outage / bad credentials | Watch rooms degrade | Automatic P2P fallback + toast; keep tested |
| Mesh doesn't scale for Meet beyond ~6–8 | Poor calls | Cap participants; evaluate moving Meet to LiveKit after P1 |
| In-memory rooms lost on restart | Users dropped | Acceptable for ephemeral rooms; document; P2 for clusters |
| Node 18 vs newer-Node test drift | CI red | CI matrix stays on 18/20; shims live in `test/setup.js` |
| Free-tier cold starts (Render) | Slow first join | Warm-up note in DEPLOYMENT.md |

## 6. Working Agreement

- Every change: tests + build + lint green → commit → push (CI must go green).
- Conventional commits; small, reviewable commits; no `.env` in git.
- Update `client/src/data/roadmap.js` and `CHANGELOG.md` when a roadmap item ships.

## 7. Cloud Reference

**Frontend (Vercel)**: root `client`, build `npm run build`, output `dist`; env `VITE_SERVER_URL`, optional `VITE_LIVEKIT_URL`, `VITE_TURN_*`.
**Backend (Render)**: root `server`, start `node src/index.js`; env `PORT`, `ALLOWED_ORIGIN`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
Full variable list: [DEPLOYMENT.md](DEPLOYMENT.md).
