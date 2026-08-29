# 🚀 Master Engineering Blueprint: Google Meet Video Conferencing (`/meet`)

> **Authoritative Specification Document**  
> **Target Audience**: AI Engineering Agents & Frontend Developers  
> **Status**: Ready for AI-Directed Implementation  
> **Architecture Standard**: Pure WebRTC Mesh • Vanilla CSS Design Tokens • React 18 • Socket.IO Signaling

---

## 📌 Table of Contents

1. [High-Level Vision & Objectives](#1-high-level-vision--objectives)
2. [Navbar & Navigation Integration (Completed)](#2-navbar--navigation-integration-completed)
3. [Google Meet UI & UX Specifications](#3-google-meet-ui--ux-specifications)
   - [3.1 Color Palette & Design Tokens](#31-color-palette--design-tokens)
   - [3.2 Pre-Join Green Room (Lobby Preview)](#32-pre-join-green-room-lobby-preview)
   - [3.3 Responsive Auto-Sizing Video Grid](#33-responsive-auto-sizing-video-grid)
   - [3.4 Active Speaker Spotlight & Detection](#34-active-speaker-spotlight--detection)
   - [3.5 Floating Bottom Control Pill](#35-floating-bottom-control-pill)
   - [3.6 In-Call Drawers (People & Chat)](#36-in-call-drawers-people--chat)
   - [3.7 Self-View Picture-in-Picture](#37-self-view-picture-in-picture)
4. [WebRTC Multi-Stream Mesh Architecture](#4-webrtc-multi-stream-mesh-architecture)
   - [4.1 Multi-Track Signaling Protocol](#41-multi-track-signaling-protocol)
   - [4.2 Track Muting vs Renegotiation](#42-track-muting-vs-renegotiation)
   - [4.3 Socket.IO Meet Event Contracts](#43-socketio-meet-event-contracts)
5. [File Structure & Component Directory](#5-file-structure--component-directory)
6. [Step-by-Step Implementation Phasing for AI](#6-step-by-step-implementation-phasing-for-ai)
7. [AI Prompt Injection Template](#7-ai-prompt-injection-template)

---

## 1. High-Level Vision & Objectives

ScreenLoop's primary watch party room (`/room/:roomId`) is engineered for **1-to-many screen broadcasting** (one presenter streaming high-bitrate video and lossless stereo movie audio to viewers).

**The Video Meet Feature (`/meet` and `/meet/:meetId`)** introduces a **Google Meet-identical multi-party video call platform** designed for:
- 👥 Multi-user interactive group calls (2 to 8+ simultaneous webcams).
- 🎤 Individual mic streams with active speaker auto-detection.
- 🖥️ Simultaneous or shared screen presenting alongside webcam feeds.
- 🔒 100% Peer-to-Peer media transmission with zero server-side recording or transcoding.

---

## 2. Navbar & Navigation Integration (Completed)

The top navigation bar in [SiteHeader.jsx](file:///i:/Web%20devlopment/Screenshare/client/src/components/SiteHeader.jsx) has been updated:
- **Removed**: The `Security` link from primary header navigation.
- **Added**: `Video Meet` (`/meet`) with a glowing `New` badge.
- **Preserved**: The `/security` link remains in the footer ([SiteFooter.jsx](file:///i:/Web%20devlopment/Screenshare/client/src/components/SiteFooter.jsx)) for compliance and technical review.

```javascript
// client/src/components/SiteHeader.jsx
const NAV_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/meet', label: 'Video Meet', badge: 'New' },
  { path: '/features', label: 'Features' },
  { path: '/about', label: 'About' },
  { path: '/help', label: 'Help & FAQ' },
  { path: '/changelog', label: "What's New" },
];
```

---

## 3. Google Meet UI & UX Specifications

### 3.1 Color Palette & Design Tokens (`meet.css`)

```css
:root {
  --meet-bg: #202124;              /* Google Meet dark stage background */
  --meet-surface: #2d2e30;         /* Video tile card surface */
  --meet-surface-hover: #3c4043;   /* Tile hover border & controls */
  --meet-pill-bg: #303134;         /* Bottom control bar surface */
  --meet-pill-button: #3c4043;     /* Floating round action buttons */
  --meet-pill-button-hover: #474a4d;
  --meet-danger: #ea4335;          /* Muted state & Hang Up button */
  --meet-danger-hover: #d93025;
  --meet-accent: #8ab4f8;          /* Google Meet blue highlight */
  --meet-speaker-green: #34a853;   /* Active speaker glowing ring */
  --meet-hand-yellow: #fbbc04;     /* Hand raised badge */
  --meet-radius-tile: 16px;        /* Smooth modern card corners */
  --meet-radius-pill: 9999px;      /* Pill shape */
}
```

---

### 3.2 Pre-Join Green Room (Lobby Preview)

Before entering an active meeting, users land on the **Google Meet Green Room**:

```
+========================================================================================+
| ScreenLoop Meet                                                                        |
+========================================================================================+
|                                                                                        |
|         [ Live Webcam Preview ]                      Ready to join?                    |
|      +---------------------------+                   Room: abc-defg-hij                |
|      |                           |                                                     |
|      |    (User Camera Feed)     |                   [ Your Name Input           ]     |
|      |                           |                                                     |
|      |   [🎤 Level: |||||||    ] |                   [ Avatar Gender: Male/Female]     |
|      +---------------------------+                                                     |
|           [ 🎤 Mic ] [ 📹 Cam ]                      [ Join Now ]  [ Present Screen ]  |
|                                                                                        |
|         ⚙️ Audio & Video Settings                    No one else is here yet           |
|                                                                                        |
+========================================================================================+
```

#### Lobby Checklist for AI:
- `video` element mirroring the local webcam (`transform: scaleX(-1)`).
- Real-time microphone audio visualizer (horizontal pill with animated green bars powered by `AudioContext` and `AnalyserNode`).
- Quick toggle buttons: Mic (Mute/Unmute) and Camera (On/Off).
- Device selector dropdowns: Camera source, Mic source, Speaker output (`navigator.mediaDevices.enumerateDevices`).
- Display Name text field with character counter.
- **"Join Now"** primary button and **"Present"** direct screen share button.

---

### 3.3 Responsive Auto-Sizing Video Grid

The layout engine dynamically computes tile dimensions based on window viewport and participant count:

| Participants | Layout Grid | Aspect Ratio | Behavior |
| :---: | :---: | :---: | :--- |
| **1** | `1 × 1` (Centered) | `16:9` | Dominates screen, max-width 1100px |
| **2** | `2 × 1` (Side-by-Side) | `16:9` or `4:3` | 50% / 50% split (vertical on mobile) |
| **3 – 4** | `2 × 2` (Balanced Grid) | `16:9` | Equal quadrant sizing |
| **5 – 6** | `3 × 2` (Standard Grid) | `16:9` | 3 tiles top row, 3 tiles bottom row |
| **7 – 8+** | `4 × 2` or Paginated | `16:9` | Auto-scaled with active speaker prioritization |
| **Spotlight / Presentation** | `75% Stage + 25% Strip` | Varied | Presentation dominates; webcam thumbnails dock into right vertical filmstrip |

#### Video Tile Component Structure (`MeetTile.jsx`):
```html
<div class="meet-tile {isSpeaking ? 'active-speaker' : ''} {isCameraOff ? 'cam-off' : ''}">
  <video autoplay playsinline muted={isSelf}></video>
  <div class="meet-tile-avatar-fallback">
    <!-- Visible only when camera is disabled -->
    <img src={avatarUrl} alt={name} />
    <span>{initials}</span>
  </div>
  
  <!-- Top Right Action Overlay (Appears on Hover) -->
  <div class="meet-tile-hover-actions">
    <button title="Pin to screen"><Thumbtack size={16} /></button>
  </div>

  <!-- Bottom Badges -->
  <div class="meet-tile-footer">
    <span class="meet-tile-name">{name} {isSelf && '(You)'}</span>
    <span class="meet-tile-mic-badge {isMuted ? 'muted' : ''}">
      {isMuted ? <MicrophoneSlash size={14} /> : <Microphone size={14} />}
    </span>
  </div>

  <!-- Hand Raised Badge -->
  {isHandRaised && <div class="meet-hand-badge">✋ Hand raised</div>}
</div>
```

---

### 3.4 Active Speaker Spotlight & Detection (`useActiveSpeaker.js`)

- Each connected audio stream feeds into an `AudioContext` and `AnalyserNode`.
- Computes volume amplitude every 100ms:
  ```javascript
  const rms = Math.sqrt(values / arrayLength);
  if (rms > 0.04) {
    // User is actively speaking
    setActiveSpeaker(participantId);
  }
  ```
- **Visual Feedback**: The active speaker's tile immediately gains a pulsing green border (`box-shadow: 0 0 0 3px #34a853`).
- **Priority Re-ordering**: When 5+ users are present, active speakers are moved to the top-left slots.

---

### 3.5 Floating Bottom Control Pill (`MeetControlBar.jsx`)

The control bar floats above the bottom margin in Google Meet's classic 3-section layout:

```
+-----------------------------------------------------------------------------------------------+
|  10:45 AM | abc-defg-hij     [ 🎤 ] [ 📹 ] [ ✋ ] [ 🖥️ ] [ 😊 ] [ 📞 Leave ]     [ ℹ️ ] [ 👥 4 ] [ 💬 ] |
+-----------------------------------------------------------------------------------------------+
```

#### Left Section:
- Live digital clock (`10:45 AM`).
- Formatted room code (`abc-defg-hij`) with a 1-click clipboard copy button.

#### Center Section (Floating Action Dock):
1. **Mic Toggle**: Circular button. Grey when live; `#ea4335` red with slash when muted.
2. **Camera Toggle**: Circular button. Grey when live; `#ea4335` red with slash when turned off.
3. **Raise Hand**: Circular button. Broadcasts hand raise state to all participants with a subtle chime.
4. **Screen Share**: Circular button. Launches display media picker.
5. **Emoji Reactions**: Opens a popover menu (`💖`, `👍`, `👏`, `😂`, `😮`, `🎉`). Clicking emits floating reactions that drift upward from the participant's video card.
6. **More Options (`...`)**: Device switcher settings modal and fullscreen toggle.
7. **End Call**: High-contrast elongated red pill button (`#ea4335`) with phone hang-up icon.

#### Right Section (Drawer Toggles):
- **Meeting Info (`ℹ️`)**: Opens call sharing details and join link.
- **People (`👥`)**: Opens participant drawer with badge count.
- **Chat (`💬`)**: Opens encrypted in-call text drawer with unread message notification dot.

---

### 3.6 In-Call Drawers (People & Chat)

A smooth slide-over drawer docking on the right side of the screen (`360px` width) with two tabs:

#### Tab 1: People (`MeetPeopleDrawer.jsx`)
- Participant count and search filter.
- List of connected peers with name, avatar, audio status indicator, and hand-raise status.
- Host privileges: Pin participant to screen, Mute participant, or Kick participant.

#### Tab 2: In-Call Messages (`MeetChatDrawer.jsx`)
- Real-time encrypted text chat.
- "Messages can be seen only by people in the call and are deleted when the call ends."
- Markdown / URL auto-linkification.

---

### 3.7 Self-View Picture-in-Picture

- Users have a toggle to collapse their own camera feed into a floating, draggable mini-card in the corner of the screen.
- This frees up maximum screen real estate for other participants and presentations.

---

## 4. WebRTC Multi-Stream Mesh Architecture

### 4.1 Multi-Track Signaling Protocol

Unlike watch party rooms which stream only 1 display track, Video Meet manages **multiple tracks per peer**:

```
Local Device               WebRTC PeerConnection                Remote Peer
Microphone Track --------> [ addTrack(audioTrack) ] ----------> <audio autoplay>
Webcam Video Track ------> [ addTrack(videoTrack) ] ----------> <video autoplay>
Display Screen Track ----> [ addTrack(screenTrack)] ----------> <video class="presentation">
```

### 4.2 Track Muting vs Renegotiation
- **Mic Mute**: `audioTrack.enabled = false` (stops audio transport instantly without SDP renegotiation).
- **Camera Off**: `videoTrack.enabled = false` (stops video frames; peer receives black frame, UI switches to user avatar).
- **Screen Share**: Dynamically calls `peerConnection.addTrack` or `sender.replaceTrack` with SDP offer/answer exchange.

### 4.3 Socket.IO Meet Event Contracts (`server/src/socketHandlers.js`)

| Event | Direction | Payload |
| :--- | :---: | :--- |
| `meet:join` | Client ➔ Server | `{ meetId, name, gender, micOn, cameraOn }` |
| `meet:user-joined` | Server ➔ Peers | `{ socketId, name, gender, micOn, cameraOn }` |
| `meet:signal` | Bidirectional | `{ to, from, signalData: { sdp \| candidate } }` |
| `meet:state-change` | Bidirectional | `{ socketId, micOn, cameraOn, isSharing, handRaised }` |
| `meet:reaction` | Bidirectional | `{ from, name, emoji }` |
| `meet:leave` | Client ➔ Server | `{ meetId }` |
| `meet:user-left` | Server ➔ Peers | `{ socketId }` |

---

## 5. File Structure & Component Directory

```
client/src/
├── pages/
│   ├── MeetLanding.jsx            # /meet - Pre-call landing, instant meet & enter code
│   └── MeetRoom.jsx               # /meet/:meetId - Main conference stage & orchestrator
├── components/meet/
│   ├── MeetLobby.jsx              # Green Room preview, mic check, device selectors
│   ├── MeetGrid.jsx               # Dynamic auto-sizing responsive video grid
│   ├── MeetTile.jsx               # Individual participant card, badges & fallback avatar
│   ├── MeetControlBar.jsx         # Google Meet floating bottom dock
│   ├── MeetChatDrawer.jsx         # In-call encrypted text messages
│   ├── MeetPeopleDrawer.jsx       # Participant list, pin & host controls
│   ├── MeetDeviceModal.jsx        # Audio/video hardware input/output settings
│   └── MeetReactions.jsx          # Floating emoji animation renderer
├── hooks/
│   ├── useMediaDevices.js         # Camera & mic hardware acquisition & enumeration
│   ├── useMeetRTC.js              # Multi-peer WebRTC mesh connection manager
│   └── useActiveSpeaker.js        # AudioContext RMS active speaker detector
└── styles/
    └── meet.css                   # Google Meet dark mode aesthetic, layout grid & pills
```

---

## 6. Step-by-Step Implementation Phasing for AI

### Phase 1: Routing & Navigation Setup
1. Verify `client/src/components/SiteHeader.jsx` has `Video Meet` (`/meet`).
2. Add route `/meet` and `/meet/:meetId` in `client/src/App.jsx`.
3. Create placeholder pages `MeetLanding.jsx` and `MeetRoom.jsx`.

### Phase 2: Hardware Acquisition & Lobby Engine
1. Implement `useMediaDevices.js` (`getUserMedia`, enumerate devices, toggle tracks).
2. Build `MeetLobby.jsx` with camera mirror, live audio meter, and device selectors.

### Phase 3: Server Signaling Expansion
1. Add `meet:*` event routing in `server/src/socketHandlers.js`.
2. Add meet room tracking in `server/src/roomManager.js`.

### Phase 4: WebRTC Multi-Peer Mesh Engine
1. Build `useMeetRTC.js` handling `RTCPeerConnection` for each joined peer.
2. Implement audio, video, and screen share track additions.

### Phase 5: Google Meet Video Grid & Controls
1. Create `meet.css` with exact Google Meet dark tokens and grid layout rules.
2. Build `MeetGrid.jsx`, `MeetTile.jsx`, and `useActiveSpeaker.js`.
3. Build floating `MeetControlBar.jsx` with Mic, Cam, Screen Share, Reactions, and Hang Up.

### Phase 6: Drawers, Reactions & Polish
1. Build `MeetPeopleDrawer.jsx` and `MeetChatDrawer.jsx`.
2. Implement floating reactions and hand-raise chime sound.
3. Run `npm test` across client and server to guarantee zero regressions.

---

## 7. AI Prompt Injection Template

*Use this exact prompt when instructing any AI coding agent to implement Phase 1 through 6:*

```text
You are an expert WebRTC & React frontend architect. We are implementing the Google Meet-style Video Conferencing feature for ScreenLoop.

BEFORE WRITING CODE:
1. Review "PROJECT_MEMORY.md" for global architectural guidelines and styling tokens.
2. Follow the exact specifications in "VIDEO_CALL_MASTER_PLAN.md".
3. Maintain zero-account privacy, pure vanilla CSS tokens (no Tailwind), and strict WebRTC mesh standards.

TASK:
[Insert Phase Number - e.g., "Implement Phase 2: useMediaDevices hook and MeetLobby component"]
```

---

<div align="center">
  <sub>Document locked & approved for development • ScreenLoop Engineering 2026</sub>
</div>
