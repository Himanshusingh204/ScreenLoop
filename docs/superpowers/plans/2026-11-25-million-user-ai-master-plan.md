# Screenloop: Million-User + On-Device AI Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Screenloop survive millions of users and ship one flagship AI feature that solves a real problem: **live, private, multilingual captions and an AI recap for watch parties and meets, with zero audio leaving the browser.**

**Architecture:** Signaling becomes stateless (Redis adapter plus Redis room registry) behind a load balancer. Media moves to a LiveKit SFU cluster, with Meet moved off the P2P mesh. AI runs **on-device** (Whisper via `@huggingface/transformers` on WebGPU/WASM in a Web Worker). Only text transcripts travel, inside the existing AES-256-GCM chat channel. This costs $0 in server inference and keeps the "no accounts, honest privacy" principle.

**Tech Stack:** React 18/Vite, Node/Express/Socket.IO, LiveKit, Redis, Docker/Kubernetes (or Fly/Render autoscale), Prometheus/Grafana, k6, Vitest/Playwright, `@huggingface/transformers`.

**Spec:** `MASTER_PLAN_NEW.md` (P0 to P3 roadmap), `docs/SFU_DESIGN.md`, `ARCHITECTURE.md`. This plan supersedes P1.3, P2 and P3.2 there.

## Global Constraints

- No accounts, no database for user data, no tracking (MASTER_PLAN_NEW.md principle 1).
- Audio and video never go to any AI service. Inference runs in the browser only.
- Docs must not overclaim security. Every claim must cite code (principle 2).
- CI matrix stays Node 18/20. Tests, build and lint must be green before each commit.
- Commits are conventional and small. No AI attribution trailers (project memory rule).
- Every shipped roadmap item updates `client/src/data/roadmap.js` and `CHANGELOG.md`.

## Review Focus

- Redis down or slow: server must degrade to single-node behavior and not crash. Test with the Redis client killed.
- Two nodes, same room: a joiner on node B must see the host on node A. Test with two server instances.
- Reconnect after node restart: client rejoin with PIN must work on any node.
- Captions on low-end devices (no WebGPU, mobile): the feature must be opt-in, show a clear "unsupported" state and never freeze the UI. Test via the worker timeout path.
- Hostile transcript text (XSS, huge payloads) over the socket: must pass through the existing `sanitizeText` and 1 MB cap.
- Thundering herd of joins to one room (10k viewers): token endpoint must rate-limit and the SFU must not be hit on every join.

---

## Phase 0: Baseline and measurement (do first; you cannot scale what you cannot see)

### Task 1: Observability and health

**Files:** Create `server/src/metrics.js`. Modify `server/src/index.js`, `server/__tests__/socketHandlers.test.js`.

**Interfaces:**
- Produces: `GET /metrics` (Prometheus text) with gauges `rooms_active`, `meets_active`, `sockets_connected`, counter `token_requests_total`. `GET /healthz` returns 200 `{ok:true}`.

- [x] **Step 1:** Write a failing test: `GET /healthz` returns 200, and `GET /metrics` body contains `sockets_connected`.
- [x] **Step 2:** Run `cd server && npx vitest run`. Expected: FAIL.
- [x] **Step 3:** Implement with `prom-client` (the one new dependency, justified by the Prometheus format). Update gauges inside `roomManager` create/remove paths.
- [x] **Step 4:** Re-run. Expected: PASS.
- [x] **Step 5:** Commit `feat: add metrics and health endpoints`.

### Task 2: Load-test baseline

**Files:** Create `loadtest/socket-join.js` (k6), `loadtest/README.md`.

- [x] **Step 1:** Script: N virtual users create or join rooms over Socket.IO, send chat at 1 msg/s for 2 min.
- [x] **Step 2:** Run against local server. Record max sockets per instance at p95 latency under 200 ms and CPU under 70%.
- [x] **Step 3:** Commit results to `loadtest/README.md` as the published baseline (the resume number).

---

## Phase 1: Horizontal scale (signaling)

### Task 3: Redis adapter, optional

**Files:** Modify `server/src/index.js`, `server/package.json`. Test `server/__tests__/multinode.test.js`.

**Interfaces:**
- Consumes: env `REDIS_URL`. If it is unset, behavior is unchanged.

- [x] **Step 1:** Failing test: start two `createServer()` instances on different ports sharing one Redis (use `ioredis-mock` or a CI Redis service). A client on A and a client on B join the same room. Assert B receives A's `chat:message`.
- [x] **Step 2:** Run it. Expected: FAIL.
- [x] **Step 3:** Add `@socket.io/redis-adapter` and attach it only when `REDIS_URL` is set. On Redis error, log it and keep serving local sockets.
- [x] **Step 4:** Test passes, including the "Redis killed" case from Review Focus.
- [x] **Step 5:** Commit `feat: optional redis adapter for multi-node signaling`.

### Task 4: Room registry behind an interface

**Files:** Create `server/src/roomStore.js` (`MemoryStore`, `RedisStore`). Modify `server/src/roomManager.js`, `server/src/rateLimiter.js` (PIN counters and rate limits use the store). Test `server/__tests__/roomStore.test.js`.

**Interfaces:**
- Produces: `getRoom(id)`, `setRoom(id, room, ttlSec)`, `deleteRoom(id)`, `incr(key, ttlSec) -> number`. Both stores satisfy the same contract tests.

- [x] **Step 1:** Write a contract test that runs against both stores: set/get/delete, TTL expiry, and `incr` atomicity across 50 concurrent calls.
- [x] **Step 2:** Run it. Expected: FAIL.
- [x] **Step 3:** Implement `MemoryStore` first, so existing tests stay green. Then `RedisStore` with `EXPIRE` so TTL sweep is cluster-safe. Keep per-socket state (`socketToRoom`) local. It is node-scoped by design.
- [x] **Step 4:** All 40 existing server tests plus the new ones pass on both stores.
- [x] **Step 5:** Commit `refactor: pluggable room store with redis backend`.

### Task 5: Stateless deploy and autoscale

**Files:** Modify `docker-compose.yml`, `render.yaml`. Create `deploy/k8s/` (Deployment, HPA on CPU/sockets, Service, Ingress with WebSocket upgrade) and `DEPLOYMENT.md` section.

- [x] **Step 1:** `docker compose up --scale server=3` plus nginx or Traefik plus Redis. Verify via the Task 3 test script that cross-node chat works.
- [x] **Step 2:** Run the Task 2 load test at 3 instances. Record near-linear scaling.
- [x] **Step 3:** Add graceful shutdown (SIGTERM drains sockets, tells clients to reconnect). Test: kill a node, clients rejoin within 5 s.
- [x] **Step 4:** Commit `feat: horizontal deploy manifests and graceful shutdown`.

---

## Phase 2: Media at scale

### Task 6: Meet on the LiveKit SFU

**Files:** Modify `client/src/pages/MeetRoom.jsx`, `client/src/hooks/useMeetRTC.js` (keep as P2P fallback). Reuse `useLiveKitRoom`, `/api/token`, `livekitToken.js`.

**Interfaces:**
- Consumes: `/api/token {roomId, identity, pin}`. Produces: Meet works above 8 participants, with simulcast and dynacast on.

- [x] **Step 1:** Failing server test: `/api/token` accepts a `meet` room kind and rejects bad input.
- [x] **Step 2:** Implement the token kind. Wire `MeetRoom` to LiveKit when `VITE_LIVEKIT_URL` is set, mesh otherwise.
- [ ] **Step 3:** Manual check with 12 tabs. Record CPU per client. Raise the participant cap from the mesh limit.
- [x] **Step 4:** Commit `feat: run meet on livekit sfu with mesh fallback`.

### Task 7: Edge, TURN, abuse control

**Files:** Modify `DEPLOYMENT.md`, `server/src/rateLimiter.js`, `vercel.json`.

- [x] **Step 1:** Document multi-region LiveKit (Cloud or self-hosted nodes) and coturn with TLS on 443 for strict networks.
- [x] **Step 2:** Add per-IP rate limits on `/api/token` (the join-storm point) and a per-room participant cap.
- [x] **Step 3:** Static assets on CDN with immutable cache headers (Vite hashed files). Verify `Cache-Control` in a test or curl.
- [x] **Step 4:** Commit `feat: abuse limits and edge deployment docs`.

---

## Phase 3: Flagship AI, private live captions, translation and recap

**Problem solved:** Deaf and hard-of-hearing users, non-native speakers and noisy environments cannot follow shared streams. Cloud captioning would send everyone's audio to a third party. This runs on the viewer's device.

### Task 8: Caption engine (Web Worker)

**Files:** Create `client/src/ai/captionWorker.js`, `client/src/hooks/useLiveCaptions.js`. Test `client/src/ai/__tests__/captions.test.js`.

**Interfaces:**
- Produces: `useLiveCaptions(mediaStream, {lang}) -> { status: 'unsupported'|'loading'|'ready'|'error', captions: {text, ts}[] }`. The worker takes 5 s PCM chunks (16 kHz mono) and posts back `{text, ts}`.

- [x] **Step 1:** Failing tests: (a) no WebGPU and no WASM gives `status: 'unsupported'`, (b) worker timeout gives `status: 'error'` without throwing, (c) a chunker splits a 12 s buffer into 5 s windows with 0.5 s overlap.
- [x] **Step 2:** Run `cd client && npx vitest run`. Expected: FAIL.
- [x] **Step 3:** Implement the chunker (`AudioWorklet` to Float32 to worker) and the worker using `@huggingface/transformers` `automatic-speech-recognition` with `whisper-tiny` (quantized, cached in IndexedDB after first load). Opt-in only, behind a "CC" button in `ControlBar`.
- [x] **Step 4:** Tests pass. Manual check: captions appear within 3 s on a laptop, and the UI stays at 60 fps (worker isolation).
- [x] **Step 5:** Commit `feat: on-device live captions`.

### Task 9: Caption sharing and translation

**Files:** Modify `client/src/components/VideoPlayer.jsx` (overlay), `ChatSidebar.jsx`. Create `client/src/ai/translate.js`.

- [x] **Step 1:** Failing test: a received caption containing `<script>` renders as text and is capped at 500 chars (reuse `sanitizeText`).
- [x] **Step 2:** Host's captions are broadcast as encrypted chat-channel messages of type `caption`. Viewers who cannot run ASR still get them. Translation uses the on-device `Xenova/nllb` or `opus-mt` model, chosen per viewer language.
- [x] **Step 3:** Accessibility: `aria-live="polite"` region, size and contrast controls. Test with axe.
- [x] **Step 4:** Commit `feat: shared and translated captions`.

### Task 10: AI recap

**Files:** Create `client/src/ai/recap.js`, `client/src/components/RecapModal.jsx`.

- [x] **Step 1:** Failing test: `buildRecap(captions[])` returns `{chapters: [{ts,title}], summary}` and handles an empty input without throwing.
- [x] **Step 2:** Implement chapters by 2-minute windows plus extractive summarization (TextRank, no model download) as the default. An optional small on-device LLM is a stretch goal, not required.
- [x] **Step 3:** "Download recap" saves a local `.md` file. Nothing is uploaded.
- [x] **Step 4:** Commit `feat: on-device recap and chapters`.

### Task 11: Honest evaluation (the resume proof)

**Files:** Create `docs/AI_EVAL.md`, `loadtest/asr-bench.html`.

- [ ] **Step 1:** Measure word error rate on 20 public-domain clips, latency (p50/p95) and memory on 3 device classes. Publish the table, including failures.
- [x] **Step 2:** Update `Security.jsx` and `Privacy.jsx` copy: captions run locally, no audio leaves the device. Cite the worker file.
- [x] **Step 3:** Commit `docs: ai evaluation and privacy copy`.

---

## Phase 4: Security close-out

### Task 12: Media E2EE and key rotation

**Files:** Modify `client/src/hooks/useLiveKitRoom.js`, `server/src/socketHandlers.js`.

- [x] **Step 1:** Failing test: the kick handler emits `key:rotate` to the remaining participants.
- [x] **Step 2:** Implement LiveKit `ExternalE2EEKeyProvider` with the key from the URL hash. On kick, the host generates a new key and shares it over the encrypted chat channel.
- [x] **Step 3:** Commit `feat: media e2ee and key rotation`. Update the roadmap, changelog and Security page.

---

## Phase 5: Resume packaging

### Task 13: Portfolio-grade proof

**Files:** Modify `README.md`. Create `docs/CASE_STUDY.md`, `docs/architecture.png`.

- [x] **Step 1:** README top section: live demo, architecture diagram, load-test table (sockets per node, node count, p95), AI eval table.
- [x] **Step 2:** `CASE_STUDY.md`: problem, constraints, tradeoffs (on-device vs cloud ASR, mesh vs SFU, Redis vs sticky sessions), what failed.
- [ ] **Step 3:** Record a 90-second demo (two languages, captions on). Commit.

---

## Order and effort

| Phase | Tasks | Effort | Why this order |
|---|---|---|---|
| 0 | 1-2 | 1 day | You need numbers before and after |
| 1 | 3-5 | 3-4 days | Removes the single-node ceiling |
| 2 | 6-7 | 3 days | Meet is the weakest scale point (mesh) |
| 3 | 8-11 | 5-7 days | Flagship differentiator |
| 4 | 12 | 2 days | Closes the documented security gap |
| 5 | 13 | 1 day | Turns work into a resume asset |

## Self-review notes

- Spec coverage: P1.1-1.3, P2.1-2.3 and P3.2 map to Tasks 12, 4, 3, 4, 2/5 and 8. P3.1 (described audio) and P3.3 (a11y pass) are not scheduled. Add them after Phase 3 if wanted.
- Status 2026-11-27: all tasks shipped except the open steps above (20-clip benchmark: 4 clips run; 12-tab Meet check; demo recording), which need real devices or a human. P3.1 described audio shipped (SFU only, untested in a browser); the P3.3 NVDA pass remains.
- Risk: "millions" is a design target, not a measured claim. Task 2 and Task 5 produce the real number. Quote only that number.
- Risk: Whisper-tiny accuracy is weak on noisy movie audio. Task 11 publishes this honestly, and a whisper-base option is the fallback.
