# Screenloop Pro — Architecture

> Single source of truth for the peer-to-peer watch party and screen sharing platform.
> Author: Himanshu | License: MIT | Version: 1.0.0

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [Component Hierarchy](#3-component-hierarchy)
4. [State Management](#4-state-management)
5. [Encryption Architecture](#5-encryption-architecture)
6. [Security Layers](#6-security-layers)
7. [Socket Events](#7-socket-events)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Development Guide](#9-development-guide)

---

## 1. System Architecture

```
+===========================================================================+
|                              CLIENT (Browser)                             |
|  React 18 SPA | Vite 5 | React Router v6 | Socket.io Client 4.7          |
+===========================================================================+
|                                                                           |
|  Pages (lazy-loaded)                                                      |
|  +----------+ +------+ +----------+ +----------+ +------+ +--------+     |
|  | Home.jsx | | Room | |Features  | |Security  | |About | |  Help  |     |
|  +----------+ +--+---+ +----------+ +----------+ +------+ +--------+     |
|                  |                                                            |
|                  v                                                            |
|  +--------------------------------------------------------------------+   |
|  |                     Room.jsx (Orchestrator)                         |   |
|  |  - Socket.io connection lifecycle                                   |   |
|  |  - Session persistence (sessionStorage)                             |   |
|  |  - Reconnection + auto-rejoin logic                                 |   |
|  |  - Fullscreen + keyboard shortcuts                                  |   |
|  |  - Audio-only mode (disable video tracks)                           |   |
|  |  - Quality management + auto-downgrade on poor connection           |   |
|  |  - Screen recording via useScreenRecording hook                     |   |
|  +--------------------------------------------------------------------+   |
|       |            |               |                                       |
|       v            v               v                                       |
|  +---------+  +-----------+  +---------------+                            |
|  | useRoom |  | useWebRTC |  | useWebRTCStats|                            |
|  +----+----+  +-----+-----+  +-------+-------+                            |
|       |             |                 |                                      |
|       v             v                 v                                      |
|  +---------+  +-----------+  +------------------+                         |
|  |participants| | peers{}  |  | stats{fps,      |                         |
|  |hostId   |  | localStream|  | bitrateKbps,    |                         |
|  |toasts[] |  | sendOffer  |  | rttMs,          |                         |
|  |chatMsgs |  | handleOffer|  | packetLoss,     |                         |
|  |typing {}|  | handleIce  |  | quality}        |                         |
|  |hostOnly |  | stopShare  |  +------------------+                         |
|  +---------+  +-----------+                                               |
|       |                                                                    |
|       v                                                                    |
|  +--------------------------------------------------------------------+   |
|  |  UI Components                                                       |   |
|  |  +----------+ +----------+ +-----------+ +-----------+ +----------+ |   |
|  |  | TopBar   | |VideoPlayer| |ControlBar | |ChatSidebar| |Annotate | |   |
|  |  +----------+ +----------+ +-----------+ +-----------+ |Canvas    | |   |
|  |  +----------+ +----------+ +-----------+ +-----------+ +----------+ |   |
|  |  |CursorOvl | |Reaction  | |StatsOvl   | |Participant| |ShareMod | |   |
|  |  +----------+ |Overlay   | +-----------+ |List       | +----------+ |   |
|  |               +----------+               +-----------+               |   |
|  +--------------------------------------------------------------------+   |
|       |                                                                    |
|       v                                                                    |
|  +--------------------------------------------------------------------+   |
|  |  Utils                                                               |   |
|  |  +---------+ +-----------+ +----------+ +-----------+ +---------+   |   |
|  |  | crypto  | | roomId    | |sanitizer | | linkify   | |confetti |   |   |
|  |  | AES-GCM | | generate  | | XSS      | | URL       | | room    |   |   |
|  |  +---------+ +-----------+ +----------+ +-----------+ +---------+   |   |
|  +--------------------------------------------------------------------+   |
+===========================================================================+
           |                          |                          |
           | HTTPS/WSS (Signaling)    | WebRTC (P2P Media)      | HTTPS
           v                          v                          v
+===========================================================================+
|                           SERVER (Node.js + Express)                      |
|  Express 4.18 | Socket.io 4.7 | Port 4000 | Render | Pino Logging          |
+===========================================================================+
|                                                                           |
|  +--------------------------------------------------------------------+   |
|  |  index.js — Server Entry                                            |   |
|  |  - Express + HTTP server                                            |   |
|  |  - CORS dynamic origin validation                                   |   |
|  |  - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)|   |
|  |  - Socket.io server (websocket + polling transports)                |   |
|  |  - IP connection limiter (max 5/IP)                                 |   |
|  |  - Graceful shutdown (SIGTERM/SIGINT)                               |   |
|  +--------------------------------------------------------------------+   |
|                          |                                                  |
|           +--------------+--------------+                                  |
|           |              |              |                                    |
|           v              v              v                                    |
|  +----------------+ +----------+ +-----------+                             |
|  |socketHandlers.js| |roomManager| |rateLimiter|                           |
|  |                 | |.js        | |.js         |                         |
|  | registerHandlers| | createRoom| | checkSpam  |                         |
|  | - room:create   | | joinRoom  | | checkReact |                         |
|  | - room:join     | | leaveRoom | | checkPin   |                         |
|  | - webrtc:*      | | getRoom   | | recordFail |                         |
|  | - sync:*        | | transferHost| | resetFail|                         |
|  | - chat:*        | | listRooms | +-----------+                         |
|  | - room:kick     | | sweepRoom |                                        |
|  | - disconnect    | |           |                                        |
|  +----------------+ +----------+                                         |
|                                                                           |
|  +--------------------------------------------------------------------+   |
|  |  logger.js — Pino Structured Logging                                |   |
|  |  - pino with pino-pretty (dev) / JSON (production)                  |   |
|  |  - Structured fields: roomId, socketId, name, gender                |   |
|  |  - Level: LOG_LEVEL env var (default: "info")                       |   |
|  +--------------------------------------------------------------------+   |
|                                                                           |
|  In-Memory State:                                                         |
|  rooms Map: { roomId -> { id, hostId, pin, participants Map, createdAt }} |
|  MAX_PARTICIPANTS: 10 | MAX_ROOMS: 100 | ROOM_TTL: 30 min               |
+===========================================================================+
           |                          ^
           | WebRTC Signaling         | WebRTC P2P (direct browser-to-browser)
           | (offer/answer/ICE)       |
           v                          |
+===========================================================================+
|                     WebRTC Mesh (Browser-to-Browser)                      |
|  Host Screen -> P2P -> Viewer(s)                                          |
|  ICE Servers: Google STUN + Twilio STUN + OpenRelay TURN                  |
|  Quality: 720p / 1080p / 1440p adaptive                                   |
+===========================================================================+
```

### Transport Summary

| Channel                | Protocol      | Purpose                          |
|------------------------|---------------|----------------------------------|
| HTTPS (443)            | HTTP/2        | Static SPA assets from Vercel    |
| WSS (443)              | WebSocket     | Socket.io signaling + chat       |
| WebSocket Fallback     | HTTP long-poll| Socket.io fallback transport     |
| WebRTC (UDP)           | DTLS/SRTP     | Video/audio streaming P2P        |
| STUN (3478/19302)      | UDP           | NAT traversal / public IP detect |
| TURN (80/443)          | TCP/UDP       | Relay fallback for restrictive NAT|

---

## 2. Data Flow Diagrams

### 2.1 Room Creation and Join Flow

```
 User A (Host)                  Server                    User B (Viewer)
      |                           |                             |
      | 1. Click "Launch Room"    |                             |
      |   generateRoomId()        |                             |
      |   generateRoomKey()       |                             |
      |                           |                             |
      | 2. socket.emit(           |                             |
      |    "room:create",         |                             |
      |    {roomId,name,pin,      |                             |
      |     gender})              |                             |
      | ------------------------> |                             |
      |                           | 3. Validate inputs:         |
      |                           |    roomId regex ^[A-Za-z0-9_ -]{1,20}$
      |                           |    name max 30 chars        |
      |                           |    checkSpam(socket)        |
      |                           |    rooms.size < MAX_ROOMS   |
      |                           |                             |
      |                           | 4. createRoom()             |
      |                           |    rooms.set(roomId, room)  |
      |                           |    socket.join(roomId)      |
      |                           |                             |
      | 5. socket.emit(           |                             |
      |    "room:joined",         |                             |
      |    {participants,         |                             |
      |     isHost:true,          |                             |
      |     hostId,               |                             |
      |     hostOnlyControls})    |                             |
      | <------------------------ |                             |
      |                           |                             |
      | [Room is ready]           |                             |
      |                           |                             |
      |                           |    6. User B opens link:    |
      |                           |    /room/abc123#KEY_HERE    |
      |                           |                             |
      |                           | 7. socket.emit(            |
      |                           |    "room:join",            |
      |                           |    {roomId,name,pin,gender})|
      |                           | <--------------------------- |
      |                           |                             |
      |                           | 8. Validate:                |
      |                           |    getRoom(roomId)          |
      |                           |    checkPinBruteForce()     |
      |                           |    joinRoom()               |
      |                           |    participants.size < max  |
      |                           |                             |
      |                           | 9. socket.emit(            |
      |                           |    "room:joined",           |
      |                           |    {participants,           |
      |                           |     isHost:false,hostId,    |
      |                           |     hostOnlyControls})      |
      |                           | ------------------------->  |
      |                           |                             |
      |                           | 10. socket.to(roomId).emit( |
      |                           |     "room:user-joined",     |
      |                           |     {socketId,name,         |
      |                           |      participants})         |
      |                           | ------------------------->  |
      |                           |                             |
      |                           | 11. socket.to(hostId).emit( |
      |                           |     "webrtc:initiate",      |
      |                           |     {targetId,targetName})  |
      | <------------------------ |                             |
      |                           |                             |
      | [Host begins WebRTC       |                             |
      |  signaling to User B]     |                             |
```

### 2.2 WebRTC Signaling Flow

```
 Host (Browser)                 Server                   Viewer (Browser)
      |                           |                             |
      | 12. onInitiate()          |                             |
      |  sendOfferToViewer()      |                             |
      |  createPeer(targetId)     |                             |
      |  addTrack(stream)         |                             |
      |  createOffer()            |                             |
      |  setLocalDescription()    |                             |
      |                           |                             |
      | 13. socket.emit(          |                             |
      |    "webrtc:offer",        |                             |
      |    {targetId, offer})     |                             |
      | ------------------------> |                             |
      |                           | 14. Validate:               |
      |                           |    socket.data.roomId set   |
      |                           |    room.participants.has(   |
      |                           |      targetId)              |
      |                           |                             |
      |                           | 15. io.to(targetId).emit(  |
      |                           |     "webrtc:offer",        |
      |                           |     {fromId, offer})       |
      |                           | -------------------------> |
      |                           |                             |
      |                           |   16. handleOffer()         |
      |                           |   createPeer(fromId)        |
      |                           |   setRemoteDescription()    |
      |                           |   processPendingIce()       |
      |                           |   createAnswer()            |
      |                           |   setLocalDescription()     |
      |                           |                             |
      |                           |   17. socket.emit(          |
      |                           |     "webrtc:answer",        |
      |                           |     {targetId, answer})    |
      |                           | <---------------------------|
      |                           |                             |
      |                           | 18. Validate target in room |
      |                           |                             |
      |                           | 19. io.to(hostId).emit(    |
      |                           |     "webrtc:answer",       |
      |                           |     {fromId, answer})      |
      | <------------------------ |                             |
      |                           |                             |
      | 20. handleAnswer()        |                             |
      |   setRemoteDescription()  |                             |
      |   processPendingIce()     |                             |
      |                           |                             |
      |  ~~~~~~ ICE Candidate Exchange (both directions) ~~~~~~ |
      |                           |                             |
      | 21. onicecandidate ->     |                             |
      |   emit("webrtc:ice",      |                             |
      |    {targetId,candidate})  |                             |
      | ------------------------> |                             |
      |                           | 22. Relay to viewer:       |
      |                           |   io.to(targetId).emit(    |
      |                           |     "webrtc:ice",          |
      |                           |     {fromId, candidate})   |
      |                           | -------------------------> |
      |                           |                             |
      |                           |   23. handleIce()           |
      |                           |   addIceCandidate()         |
      |                           |   (or queue if no           |
      |                           |    remoteDescription yet)   |
      |                           |                             |
      |                           | <--- ICE flows both ways -->|
      |                           |                             |
      | 24. P2P Connection Established                           |
      |   Video/Audio flows directly browser-to-browser          |
      |   No server involvement in media path                    |
      |                           |                             |
```

### 2.3 E2EE Chat Flow

```
 User A                        Server                       User B
    |                             |                            |
    | 1. Type message in chat     |                            |
    |    sendChatMessage(text)    |                            |
    |                             |                            |
    | 2. encryptMessage(          |                            |
    |    text, roomKey)           |                            |
    |    -> AES-256-GCM           |                            |
    |    -> random IV (12 bytes)  |                            |
    |    -> IV + ciphertext       |                            |
    |    -> base64url string      |                            |
    |                             |                            |
    | 3. socket.emit(             |                            |
    |    "chat:message",          |                            |
    |    {roomId, text: cipher})  |                            |
    | --------------------------> |                            |
    |                             |                            |
    |                             | 4. Server validates:       |
    |                             |    checkSpam(socket)       |
    |                             |    text.length <= 500      |
    |                             |    room.participants.has(  |
    |                             |      socket.id)            |
    |                             |    Use SERVER-SIDE name:   |
    |                             |    participant.name        |
    |                             |    (NEVER trust client)    |
    |                             |                            |
    |                             | 5. Generate msgId:         |
    |                             |    Date.now() + "_" +      |
    |                             |    socket.id.slice(-4)     |
    |                             |                            |
    |                             | 6. io.to(roomId).emit(    |
    |                             |    "chat:message",         |
    |                             |    {id, name, text:        |
    |                             |     ciphertext, timestamp, |
    |                             |     socketId})             |
    |                             | ------------------------> |
    |                             |                            |
    |                             |   7. onChatMessage()       |
    |                             |   Check roomKey present    |
    |                             |   AND text.length > 30     |
    |                             |   (short text = plaintext) |
    |                             |                            |
    |                             |   8. decryptMessage(       |
    |                             |    ciphertext, roomKey)    |
    |                             |   -> importKey()           |
    |                             |   -> split IV + ciphertext |
    |                             |   -> crypto.subtle.decrypt |
    |                             |   -> plaintext             |
    |                             |                            |
    |                             |   9. Display in chat UI    |
    |                             |                            |
    | 10. socket.emit(            |                            |
    |    "chat:ack",              |                            |
    |    {msgId})                 |                            |
    | --------------------------> |                            |
    |                             |                            |
    | 11. Sender confirms         |                            |
    |     delivery (UI update)    |                            |
```

**Security note:** If decryption fails (wrong key or corrupted data), the UI shows
"(Encrypted message)" rather than crashing. Short messages (<= 30 chars) are sent
as plaintext since they have low entropy value for attackers.

### 2.4 Room Lifecycle

```
 +----------+     +-----------+     +-----------+     +-------------+
 |  Room    |     | 1 Player  |     | 2+ Players|     | Active      |
 | Created  | --> | Waiting   | --> | in Room   | --> | Session     |
 +----------+     +-----------+     +-----------+     +------+------+
   |                                                    |            |
   | createRoom()                                       |            |
   | rooms.set()                                        |            |
   | HOST only                                          |            |
   |                                                    v            v
   |                                          +------------------+ +---------+
   |                                          | P2P Streaming    | | Chat    |
   |                                          | + E2EE Chat      | | E2EE    |
   |                                          | + Reactions      | | Sync    |
   |                                          | + Annotations    | | Drawing |
   |                                          | + Typing Indic.  | +---------+
   |                                          +--------+---------+
   |                                                   |
   |                              +--------------------+--------------------+
   |                              |                    |                    |
   |                              v                    v                    v
   |                     +--------------+     +--------------+    +--------------+
   |                     | Host Leaves  |     | Viewer Leaves|    | 30 min TTL  |
   |                     | (disconnect) |     | (disconnect) |    | (sweep)     |
   |                     +------+-------+     +------+-------+    +------+-------+
   |                            |                    |                   |
   |                            v                    v                   v
   |                     +--------------+     +--------------+    +--------------+
   |                     | Promote next |     | Remove from  |    | sweepExpired |
   |                     | participant  |     | participants |    | Rooms()      |
   |                     | to host      |     | Notify room  |    | rooms.delete |
   |                     +------+-------+     +--------------+    +--------------+
   |                            |
   |                     +------v-------+
   |                     | Room stays   |
   |                     | open with    |
   |                     | new host     |
   |                     +------+-------+
   |                            |
   |                     +------v-------+
   |                     | Host disconnects|
   |                     | again?        |
   |                     | -> promote   |
   |                     | -> or close  |
   |                     |    (empty)   |
   |                     +--------------+
   |
   v
 +--------------+
 | Room Closed  |
 | - All sockets |
 |   disconnected|
 | - rooms.delete|
 | - WebRTC peers|
 |   closed      |
 +--------------+

 Room TTL Sweep: Every 5 minutes, sweepExpiredRooms() checks createdAt.
 Rooms older than 30 minutes are deleted. (Configurable via ROOM_TTL_MS env var)

 Auto-Rejoin: On browser refresh or network blip, sessionStorage preserves
 join credentials. On reconnect, client re-emits room:join to re-establish
 the session and trigger a new WebRTC offer from the host.
```

---

## 3. Component Hierarchy

```
App.jsx
 +-- ErrorBoundary (global)
 +-- BrowserRouter
      +-- ScrollManager
      +-- GradientBackground
      +-- Suspense <RouteLoader>
           +-- Routes (each lazy route wrapped in RouteErrorBoundary)
                |
                +-- "/" -> Home.jsx
                |
                +-- "/room/:roomId" -> Room.jsx
                |    +-- JoinModal
                |    +-- TopBar
                |    +-- VideoPlayer
                |    +-- AnnotationCanvas
                |    +-- CursorOverlay
                |    +-- ReactionOverlay
                |    +-- StatsOverlay
                |    +-- ControlBar
                |    +-- ChatSidebar
                |    |    +-- ParticipantList
                |    |    +-- Message list (inline)
                |    |    +-- Typing indicator
                |    +-- ShareModal
                |    +-- ToastContainer
                |    +-- ConfirmModal (via ParticipantList kick)
                |    +-- LoaderPage (phase: joining)
                |    +-- ReconnectionOverlay
                |    +-- HostDisconnectedOverlay
                |
                +-- "/features" -> Features.jsx (bento grid)
                +-- "/security" -> Security.jsx (vertical timeline)
                +-- "/about" -> About.jsx (split 2-column)
                +-- "/help" -> Help.jsx (sidebar + content)
                +-- "/privacy" -> Privacy.jsx (expandable cards)
                +-- "/terms" -> Terms.jsx (sticky TOC)
                +-- "/contact" -> Contact.jsx (2x2 grid)
                +-- "/roadmap" -> Roadmap.jsx (kanban columns)
                +-- "/changelog" -> Changelog.jsx (magazine cards)
                +-- "/accessibility" -> Accessibility.jsx (dashboard)
                +-- "*" -> NotFound.jsx (glass card)
```

### Component Inventory (24 components)

| Component            | Purpose                                             |
|----------------------|-----------------------------------------------------|
| `AnnotationCanvas`   | Screen annotation drawing overlay with sync          |
| `ChatSidebar`        | Chat panel with E2EE messages, typing indicators    |
| `ConfirmModal`       | Reusable confirmation dialog                        |
| `ControlBar`         | Playback controls, share, draw, reactions, stats, recording, audio-only |
| `CursorOverlay`      | Laser pointer / cursor position sync                |
| `ErrorBoundary`      | React error boundary with fallback UI (global)      |
| `GradientBackground` | Animated background gradient (dark blobs + mouse)    |
| `icons/index.js`     | Phosphor icon barrel exports                        |
| `JoinModal`          | Room join/creation form with PIN and avatar         |
| `Loader.jsx`         | Loading spinner component                           |
| `LogoBrand`          | Inline SVG brand logo                               |
| `ParticipantList`    | User list with host badge, kick, transfer host      |
| `ReactionOverlay`    | Floating emoji reactions                            |
| `RouteErrorBoundary` | Per-route error boundary with fallback UI           |
| `ShareModal`         | QR code + share link for room invitations           |
| `SiteFooter`         | Global footer with navigation links                 |
| `SiteHeader`         | Global header with navigation (glassmorphic)        |
| `StatsOverlay`       | WebRTC telemetry HUD (fps, bitrate, RTT, quality)  |
| `ThemeSelector`      | Dark/light theme toggle                             |
| `Toast`              | Toast notification container                        |
| `TopBar`             | Room header with ID, participants, connection status|
| `VideoPlayer`        | Video element for local/remote stream               |

---

## 4. State Management

All state is managed via custom React hooks. No external state library is used.

### useRoom.js -- Room-Level State

```
State:
  participants[]      <- socket "room:user-joined", "room:user-left",
                          "room:participants-updated"
  hostId              <- socket "room:user-left" (newHostId),
                          "room:joined" (hostId)
  toasts[]            <- addToast() with auto-remove (3s timeout)
  chatMessages[]      <- socket "chat:message", "chat:deleted",
                          "chat:edited", system messages (join/leave)
  typingUsers{}       <- socket "chat:typing" (keyed by socketId,
                          auto-expire via timestamp comparison)
  hostOnlyControls    <- socket "room:host-only-changed"
  isActualHost        <- socket "room:promoted-to-host",
                          initial isHost from join

Methods:
  emitSync(event, payload)
    -> socket.emit(event, {roomId, name, ...payload})
    Used for: sync:play, sync:pause, sync:seek

  sendChatMessage(text)
    -> if roomKey: encryptMessage(text, roomKey)
    -> socket.emit("chat:message", {roomId, text: payload})
    (Server ignores client-sent name, uses server-side lookup)

  deleteChatMessage(msgId, msgTimestamp)
    -> socket.emit("chat:delete", {roomId, msgId, msgTimestamp})
    (60s window for self-delete, host can delete any)

  editChatMessage(msgId, msgTimestamp, newText)
    -> if roomKey: encryptMessage(newText, roomKey)
    -> socket.emit("chat:edit", {roomId, msgId, msgTimestamp, newText})
    (60s edit window, own messages only)

  emitTyping()
    -> socket.emit("chat:typing", {roomId})
    (Debounced: max once per 2 seconds via lastTypingEmit ref)

  toggleHostOnly(enabled)
    -> socket.emit("room:host-only-toggle", {roomId, enabled})

  addToast(text)
    -> Adds toast to state, auto-removes after 3000ms
```

### useWebRTC.js -- Peer Connection Management

```
State (refs for non-rendering):
  peers{}               <- Map of targetId -> RTCPeerConnection
  localStream           <- MediaStream from getDisplayMedia()
  pendingIceCandidates{} <- Map of targetId -> RTCIceCandidateInit[]

Methods:
  startScreenShare(quality = '1080p')
    -> navigator.mediaDevices.getDisplayMedia({video: constraints, audio})
    -> Constraints from QUALITY_PRESETS: 720p / 1080p / 1440p
    -> Audio: echoCancellation:false, noiseSuppression:false,
              autoGainControl:false, 48kHz, stereo
    -> Attaches 'ended' track listener to auto-stop

  sendOfferToViewer(viewerId)
    -> createPeer(viewerId)
    -> localStream.getTracks().forEach(track => peer.addTrack())
    -> peer.createOffer() -> peer.setLocalDescription(offer)
    -> socket.emit("webrtc:offer", {targetId, offer})

  handleOffer({fromId, offer})
    -> createPeer(fromId)
    -> peer.setRemoteDescription(offer)
    -> processPendingIce(fromId)  // flush queued ICE candidates
    -> peer.createAnswer() -> peer.setLocalDescription(answer)
    -> socket.emit("webrtc:answer", {targetId, answer})

  handleAnswer({fromId, answer})
    -> peers[fromId].setRemoteDescription(answer)
    -> processPendingIce(fromId)

  handleIce({fromId, candidate})
    -> If remoteDescription set: peer.addIceCandidate(candidate)
    -> If not: queue in pendingIceCandidates[fromId]
    -> (Queuing prevents "Failed to execute addIceCandidate
         on RTCPeerConnection" errors)

  stopScreenShare()
    -> localStream.getTracks().forEach(t => t.stop())
    -> Object.values(peers).forEach(p => p.close())
    -> Clear all refs

  ICE Recovery:
    -> onconnectionstatechange: if "failed", call peer.restartIce()

  ICE Servers:
    -> STUN: stun.l.google.com:19302
    -> STUN: stun1.l.google.com:19302
    -> STUN: global.stun.twilio.com:3478
    -> TURN: openrelay.metered.ca:80 (TCP)
    -> TURN: openrelay.metered.ca:443 (TCP)
```

### useWebRTCStats.js -- Stream Telemetry

```
State:
  stats{
    fps: number          <- framesPerSecond from inbound/outbound-rtp report
    bitrateKbps: number  <- computed from bytes diff over 1.5s interval
    resolution: string   <- "WIDTHxHEIGHT" from track stats
    rttMs: number        <- currentRoundTripTime * 1000 from candidate-pair
    packetLoss: number   <- (packetsLost / totalPackets) * 100
    quality: string      <- "good" | "fair" | "poor"
  }

Quality Tiers:
  "good"  -> lossPct <= 1 AND (rtt <= 120 OR rtt == 0)
  "fair"  -> lossPct <= 5 OR rtt <= 250
  "poor"  -> lossPct > 5 OR rtt > 250

Polling: Every 1500ms via peer.getStats() RTCPeerConnection API
Scope: Uses first active peer in peers{} map
```

### Supporting Hooks

| Hook                  | Purpose                                                |
|-----------------------|--------------------------------------------------------|
| `useWakeLock`         | Prevents screen sleep while media is active            |
| `useSoundEffects`     | Web Audio API synth: join chime, leave chime, message  |
|                       | ping, reaction pop                                     |
| `useNetworkStatus`    | navigator.onLine + online/offline event listeners      |
| `useScrollReveal`     | Intersection Observer scroll animations                |
| `useScreenRecording`  | MediaRecorder API: record stream, timer, auto-download |

---

## 5. Encryption Architecture

Screenloop uses AES-256-GCM (Galois/Counter Mode) for end-to-end encrypted
chat. The encryption key never leaves the client browser.

### Key Generation

```
generateRoomKey()
  -> crypto.subtle.generateKey(
       { name: "AES-GCM", length: 256 },
       true,                          // extractable
       ["encrypt", "decrypt"]
     )
  -> crypto.subtle.exportKey("raw", key)
  -> Convert to base64url string (URL-safe, no padding)
```

### Key Distribution via URL Hash Fragment

```
Host creates room:
  1. generateRoomKey() -> "abc123...xyz"
  2. Room URL becomes: /room/roomId#abc123...xyz

Viewer joins:
  1. Opens link: /room/roomId#abc123...xyz
  2. window.location.hash.replace('#', '') -> roomKey
  3. Room.jsx: const [roomKey] = useState(() => window.location.hash.replace('#', ''))

RFC 3986 Compliance:
  - URL hash fragments are NEVER sent to the server in HTTP requests
  - Server only sees /room/roomId, never the key
  - Key exists only in browser memory
```

### Message Encryption

```
encryptMessage(plaintext, keyString)
  1. importKey(keyString)
     -> base64url -> raw buffer -> crypto.subtle.importKey()
  2. Generate random IV: crypto.getRandomValues(new Uint8Array(12))
  3. Encode plaintext: new TextEncoder().encode(text)
  4. Encrypt: crypto.subtle.encrypt({name:"AES-GCM", iv}, key, encoded)
  5. Combine: [IV (12 bytes)] + [ciphertext]
  6. Convert to base64url string
  7. Return combined string

Output format (base64url):
  IV (12 bytes) | AES-GCM ciphertext + auth tag (16 bytes)
```

### Message Decryption

```
decryptMessage(payloadString, keyString)
  1. importKey(keyString)
  2. base64url -> raw buffer
  3. Split: iv = buffer[0:12], ciphertext = buffer[12:]
  4. Decrypt: crypto.subtle.decrypt({name:"AES-GCM", iv}, key, ciphertext)
  5. Decode: new TextDecoder().decode(decrypted)
  6. Return plaintext string (or null on failure)
```

### Security Properties

| Property                        | Guarantee                                          |
|---------------------------------|----------------------------------------------------|
| Key never sent to server        | URL hash fragment not included in HTTP requests    |
| Server sees only ciphertext     | Server relays base64url blobs without decrypting   |
| Unique IV per message           | Random 12-byte IV prevents pattern analysis        |
| Authentication tag (GCM)        | Detects tampering / corrupted ciphertext           |
| 256-bit key strength            | Brute-force infeasible with current technology     |
| Fail-safe display               | Decryption failure shows "(Encrypted message)"     |

---

## 6. Security Layers

Screenloop implements 7 defense-in-depth security layers.

### Layer 1: CORS -- Origin Validation

```
Dynamic origin validator in server/src/index.js:

  Allowed origins:
    - Explicit: ALLOWED_ORIGIN env var (comma-separated)
    - Localhost:  http://localhost:* , http://127.0.0.1:*
    - LAN:        http://192.168.*.*:*
                  http://10.*.*.*:*
                  http://172.16-31.*.*:*
    - Cloud:      https://*.vercel.app
                  https://*.netlify.app
                  https://*.onrender.com

  Blocked: Everything else (logged as warning)
  Credentials: true (allows authenticated requests)
```

### Layer 2: Security Headers

```
Applied via Express middleware:

  X-Content-Type-Options: nosniff
    -> Prevents MIME type sniffing attacks

  X-Frame-Options: SAMEORIGIN
    -> Prevents clickjacking (no framing from other origins)

  Referrer-Policy: strict-origin-when-cross-origin
    -> Limits referrer information leakage

  Permissions-Policy: display-capture=(self), camera=(), microphone=(self)
    -> Restricts feature access (camera blocked, mic/screen allowed)

  X-Powered-By: disabled (app.disable)
    -> Removes technology fingerprint
```

### Layer 3: IP Rate Limiting

```
Rate limiter in server/src/rateLimiter.js:

  Spam Protection (per IP):
    Window: 1 second
    Max events: 20 per window
    Applied to: room:create, chat:message, room:reaction

  Connection Limit (per IP):
    Max simultaneous socket connections: 5
    Enforced in: server/src/index.js on "connection" event

  Reaction Rate (per socket):
    Window: 1 second
    Max reactions: 5 per window

  Cleanup: Expired entries swept every 60 seconds
```

### Layer 4: PIN Brute-Force Protection

```
  Key: IP address (via socket.handshake.address)
  Max attempts: 5 wrong PINs
  Lockout window: 5 minutes from first failure

  Flow:
    1. checkPinBruteForce(socket) -> true (allowed to try)
    2. User enters wrong PIN
    3. recordFailedPin(socket) -> increment count
    4. After 5 failures: checkPinBruteForce() -> false
    5. Emit "room:error" with "Try again in 5 minutes"
    6. After 5 min: entry auto-expires, user can try again

  Reset: resetFailedPin(socket) on successful join
```

### Layer 5: Input Validation

```
  roomId:    /^[A-Za-z0-9_-]{1,20}$/  (alphanumeric, hyphens, underscores)
  name:      typeof string, length <= 30
  pin:       typeof string, length <= 20 (optional)
  text:      typeof string, length <= 500
  emoji:     typeof string, length <= 10
  x, y:      typeof number, isFinite()
  stroke:    Array.isArray(), length <= 5000
  gender:    normalized to ['male','female','neutral'] (fallback: 'neutral')

  All validation happens server-side before processing.
  Client-side validation is a UX convenience, not a security measure.
```

### Layer 6: Server-Side Name Resolution

```
  Rule: NEVER trust the client-sent "name" field.

  In chat:message handler:
    const participant = room.participants.get(socket.id);
    const serverName = participant.name;  // <-- Used for broadcast

  In room:reaction handler:
    const participant = room.participants.get(socket.id);
    const serverName = participant.name;  // <-- Used for broadcast

  In chat:typing handler:
    const participant = room.participants.get(socket.id);
    const serverName = participant.name;  // <-- Used for broadcast

  Prevents: Name impersonation, spoofing other users' identities.
```

### Layer 7: End-to-End Encrypted Chat

```
  Algorithm: AES-256-GCM
  Key size: 256 bits
  IV size: 12 bytes (random per message)
  Transport: base64url encoding
  Key exchange: URL hash fragment (never sent to server)

  Server role: Relay-only (cannot read messages)
  Client role: Encrypt before send, decrypt on receive
  Fallback: Short messages (<= 30 chars) sent as plaintext
```

---

## 7. Socket Events

### Room Events

| Event                      | Direction        | Purpose                                  | Validation                                           |
|----------------------------|------------------|------------------------------------------|------------------------------------------------------|
| `room:create`              | Client -> Server | Create a new room (host)                 | roomId regex, name max 30, checkSpam, MAX_ROOMS      |
| `room:join`                | Client -> Server | Join an existing room (viewer)           | roomId regex, name max 30, PIN check, MAX_PARTICIPANTS|
| `room:joined`              | Server -> Client | Confirmation with participants + hostId  | Sent to the joining client only                      |
| `room:error`               | Server -> Client | Error message (room not found, full, etc)| Sent to the requesting client only                   |
| `room:user-joined`         | Server -> Client | Broadcast: new participant entered       | Sent to all others in room                           |
| `room:user-left`           | Server -> Client | Broadcast: participant disconnected      | Sent to all others, includes newHostId if applicable |
| `room:kicked`              | Server -> Client | You have been kicked by the host         | Sent to the kicked client only                       |
| `room:closed`              | Server -> Client | Host left, room is closing               | Sent to all remaining participants                   |
| `room:host-only-changed`   | Server -> Client | Host-only controls toggled               | Broadcast to all in room                             |
| `room:promoted-to-host`    | Server -> Client | You are now the host                     | Sent to the promoted participant only                |
| `room:participants-updated`| Server -> Client | Full participant list updated            | Sent to all in room (after transfer-host)            |
| `room:reaction`            | Client -> Server | Send an emoji reaction                   | checkSpam, checkReactionRate, emoji max 10           |
| `room:reaction`            | Server -> Client | Broadcast reaction with server-side name | Sent to all in room                                  |
| `room:host-only-toggle`    | Client -> Server | Toggle host-only playback controls       | Must be host, persists on room object                |
| `room:kick`                | Client -> Server | Kick a participant                       | Must be host, target must be in room                 |
| `room:transfer-host`       | Client -> Server | Transfer host to another participant     | Must be host, target must be in room                 |

### WebRTC Signaling Events

| Event              | Direction        | Purpose                               | Validation                                    |
|--------------------|------------------|---------------------------------------|-----------------------------------------------|
| `webrtc:initiate`  | Server -> Client | Tell host to send offer to new viewer | Sent to host only, targetId in room           |
| `webrtc:offer`     | Client -> Server | SDP offer (host -> viewer relay)      | socket.data.roomId set, target in same room   |
| `webrtc:offer`     | Server -> Client | Relayed offer from host               | Sent to targetId only                         |
| `webrtc:answer`    | Client -> Server | SDP answer (viewer -> host relay)     | socket.data.roomId set, target in same room   |
| `webrtc:answer`    | Server -> Client | Relayed answer from viewer            | Sent to targetId only                         |
| `webrtc:ice`       | Client -> Server | ICE candidate (both directions)       | socket.data.roomId set, target in same room   |
| `webrtc:ice`       | Server -> Client | Relayed ICE candidate                 | Sent to targetId only                         |

### Chat Events

| Event              | Direction        | Purpose                               | Validation                                    |
|--------------------|------------------|---------------------------------------|-----------------------------------------------|
| `chat:message`     | Client -> Server | Send chat message (may be encrypted)  | checkSpam, text max 500, participant exists   |
| `chat:message`     | Server -> Client | Broadcast message (server-side name)  | Sent to all in room, includes msgId           |
| `chat:ack`         | Server -> Client | Acknowledge message delivery          | Sent back to sender only                      |
| `chat:typing`      | Client -> Server | Typing indicator                      | roomId match, participant exists              |
| `chat:typing`      | Server -> Client | Broadcast typing indicator            | Sent to others in room                        |
| `chat:delete`      | Client -> Server | Delete a message                      | 60s self-delete window OR host can delete any |
| `chat:deleted`     | Server -> Client | Broadcast: message deleted            | Sent to all in room                           |
| `chat:edit`        | Client -> Server | Edit a message                        | 60s window, own messages only, max 500 chars  |
| `chat:edited`      | Server -> Client | Broadcast: message edited             | Sent to all in room                           |

### Sync Events

| Event              | Direction        | Purpose                               | Validation                                    |
|--------------------|------------------|---------------------------------------|-----------------------------------------------|
| `sync:play`        | Client -> Server | Resume playback                       | roomId match                                  |
| `sync:play`        | Server -> Client | Broadcast play command                | Sent to others in room                        |
| `sync:pause`       | Client -> Server | Pause playback                        | roomId match                                  |
| `sync:pause`       | Server -> Client | Broadcast pause command               | Sent to others in room                        |
| `sync:seek`        | Client -> Server | Seek to time                          | roomId match                                  |
| `sync:seek`        | Server -> Client | Broadcast seek command                | Sent to others in room                        |
| `sync:pointer`     | Client -> Server | Laser pointer position                | x/y must be finite numbers                    |
| `sync:pointer`     | Server -> Client | Broadcast pointer position            | Sent to others in room                        |
| `sync:draw`        | Client -> Server | Annotation stroke data                | Array, max 5000 points                        |
| `sync:draw`        | Server -> Client | Broadcast stroke data                 | Sent to others in room                        |
| `sync:clear-draw`  | Client -> Server | Clear all annotations                 | roomId match                                  |
| `sync:clear-draw`  | Server -> Client | Broadcast clear command               | Sent to others in room                        |

---

## 8. Deployment Architecture

```
+===========================================================================+
|                          PRODUCTION SETUP                                  |
+===========================================================================+

  DEVELOPER PUSH
       |
       v
  +-------------+         +-------------------+
  |   GitHub    | -------> | GitHub Actions CI  |
  |   Repo      |         | - npm ci           |
  |             |         | - npm run lint     |
  |             |         | - npm run build    |
  |             |         | - npm run test     |
  +------+------+         +-------------------+
         |
    +----+----+
    |         |
    v         v
+---------+ +---------+
| Vercel  | | Render  |
| (Client)| | (Server)|
+----+----+ +----+----+
     |           |
     v           v
 Static SPA   Node.js Server
 (Vite build) (Express + Socket.io)
 Port: 443    Port: 4000
     |           |
     v           v
 +--------------------------+
 |   End Users (Browsers)   |
 |   - Loads SPA from Vercel|
 |   - Socket.io -> Render  |
 |   - WebRTC P2P between   |
 |     browsers directly    |
 +--------------------------+

--- Vercel (Frontend) ---

  Root Directory:   client/
  Framework:        Vite
  Build Command:    npm run build
  Output:           dist/
  SPA Routing:      All routes -> index.html (fallback)

  Environment Variables:
    VITE_SERVER_URL  ->  https://screenloop-server.onrender.com

  Features:
    - Automatic preview deployments on PRs
    - Edge-optimized static asset serving
    - Automatic HTTPS
    - Custom domain support

--- Render (Backend) ---

  Root Directory:   server/
  Start Command:    node src/index.js
  Port:             4000 (env: PORT)

  Environment Variables:
    PORT                -> 4000
    ALLOWED_ORIGIN      ->  https://screenloop.vercel.app
    MAX_PARTICIPANTS    -> 10
    MAX_ROOMS           -> 100
    ROOM_TTL_MS         -> 1800000  (30 minutes)
    SPAM_MAX_EVENTS     -> 20
    PIN_MAX_ATTEMPTS    -> 5

  Features:
    - Automatic deploys on push to main
    - Health check endpoint: GET /health
    - Room listing endpoint: GET /api/rooms
    - Graceful shutdown on SIGTERM/SIGINT
    - Free tier: spins down after inactivity (15 min)

--- Data Flow ---

  1. Browser loads SPA from Vercel CDN (static files)
  2. React app initializes, connects Socket.io to Render server
  3. User creates/joins room via Socket.io (HTTPS/WSS signaling)
  4. Server facilitates WebRTC signaling (offer/answer/ICE relay)
  5. WebRTC P2P connection established between host and viewers
  6. Video/audio flows directly browser-to-browser (no server)
  7. Chat messages encrypted client-side, relayed through server
  8. Server maintains room state in memory (no database)
  9. Rooms auto-expire after 30 minutes or when host disconnects
```

### API Endpoints

| Method | Path          | Purpose                     | Response                        |
|--------|---------------|-----------------------------|---------------------------------|
| GET    | `/health`     | Server health check         | `{status, uptime, timestamp, version}` |
| GET    | `/api/rooms`  | List active rooms           | `{count, rooms[]}`              |

### Server Entry Point (`server/src/index.js`)

```
Startup sequence:
  1. require('dotenv').config()
  2. Create Express app + HTTP server
  3. Disable X-Powered-By
  4. Apply CORS middleware (dynamic origin validation)
  5. Apply security headers middleware
  6. Create Socket.io server with CORS config
  7. Register health and rooms endpoints
  8. On socket connection:
     a. Check IP connection limit (max 5)
     b. Register all event handlers (registerHandlers)
  9. Start listening on PORT (default 4000)
  10. Register SIGTERM/SIGINT graceful shutdown

Shutdown sequence:
  1. Stop room sweep timer
  2. Emit "server:shutdown" to all clients
  3. Wait 2 seconds for delivery
  4. Close Socket.io connections
  5. Close HTTP server
  6. Force exit after 10 seconds if hung
```

---

## 9. Development Guide

### Adding a New Page

```
1. Create the page component:
   client/src/pages/YourPage.jsx

   import SiteHeader from '../components/SiteHeader';
   import SiteFooter from '../components/SiteFooter';

   export default function YourPage() {
     return (
       <>
         <SiteHeader />
         <main>
           {/* Page content */}
         </main>
         <SiteFooter />
       </>
     );
   }

2. Add lazy import in App.jsx:
   const YourPage = lazy(() => import('./pages/YourPage'));

3. Add route in App.jsx Routes:
   <Route path="/your-page" element={<YourPage />} />

4. Add navigation link in SiteHeader.jsx and SiteFooter.jsx
```

### Adding a New Socket Event

```
Server (server/src/socketHandlers.js):

  Inside registerHandlers(socket, io):

    socket.on('your:event', ({ roomId, ...data }) => {
      // 1. Validate socket is in a room
      if (!socket.data.roomId || socket.data.roomId !== roomId) return;

      // 2. Validate inputs
      if (!data.field || typeof data.field !== 'string') return;

      // 3. Check room membership
      const room = getRoom(roomId);
      const participant = room?.participants.get(socket.id);
      if (!participant) return;

      // 4. Use SERVER-SIDE name (never trust client)
      const name = participant.name;

      // 5. Emit to room
      io.to(roomId).emit('your:event-response', { name, ...data });
    });

Client (client/src/hooks/useRoom.js):

  Inside useEffect:

    const onYourEvent = ({ name, ...data }) => {
      // Handle the event
    };
    socket.on('your:event-response', onYourEvent);

  Return cleanup:
    socket.off('your:event-response', onYourEvent);
```

### Adding a New Hook

```
1. Create the hook file:
   client/src/hooks/useYourHook.js

   import { useState, useEffect } from 'react';

   export function useYourHook({ socket, roomId }) {
     const [state, setState] = useState(null);

     useEffect(() => {
       if (!socket) return;
       // Hook logic
       return () => { /* cleanup */ };
     }, [socket, roomId]);

     return { state };
   }

2. Export from barrel:
   client/src/hooks/index.js

   export { useYourHook } from './useYourHook';

3. Import in component:
   import { useYourHook } from '../hooks';
```

### Adding New Styles

```
Rules:
  - Use CSS custom properties from tokens.css
  - Theme-aware: use html[data-theme="dark"] selectors
  - Glass effects: use .glass-card class
  - Responsive: add to responsive.css
  - Component styles: add to components.css
  - Page styles: add to pages.css

Example:
  /* In tokens.css */
  :root {
    --color-primary: #6366f1;
    --space-md: 1rem;
    --radius-lg: 1rem;
  }

  /* In components.css */
  .my-component {
    background: var(--color-surface);
    padding: var(--space-md);
    border-radius: var(--radius-lg);
  }
```

### Adding a New Icon

```
1. Import from Phosphor Icons in icons/index.js:
   export { IconName } from '@phosphor-icons/react';

2. Use in component:
   import { IconName } from './icons';
   <IconName size={20} weight="fill" />
```

### Running Tests

```
Client tests (Vitest):
  cd client
  npm test              # single run
  npm run test:watch    # watch mode

Server tests (Vitest):
  cd server
  npm test              # single run
  npm run test:watch    # watch mode

Test counts:
  Client: 30 tests (utils/*, components)
  Server: 37 tests (socketHandlers, roomManager, rateLimiter)
```

### Environment Variables

```
Client (client/.env):
  VITE_SERVER_URL  = https://your-server.onrender.com

Server (server/.env):
  PORT             = 4000
  ALLOWED_ORIGIN   = https://your-app.vercel.app
  MAX_PARTICIPANTS = 10
  MAX_ROOMS        = 100
  ROOM_TTL_MS      = 1800000
  SPAM_MAX_EVENTS  = 20
  PIN_MAX_ATTEMPTS = 5
```

---

*This document is the single source of truth for the Screenloop Pro architecture.
Last updated: August 2026*
