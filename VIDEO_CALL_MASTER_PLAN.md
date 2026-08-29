# 🚀 Master Plan: Google Meet-Style Video Conferencing for ScreenLoop

> **Document Type**: Architecture & Engineering Master Plan  
> **Status**: Approved for Design — Pending AI Implementation  
> **Objective**: Introduce a dedicated, Google Meet-inspired multi-user video calling system (`/meet`) alongside existing watch party rooms, and update navigation to prioritize Video Meet over the Security tab.

---

## 1. Executive Summary

ScreenLoop currently excels at **peer-to-peer screen sharing and watch parties** where one primary host streams their display and audio to connected viewers. 

This master plan introduces a dedicated **Google Meet-style Video Calling Experience** on a separate route (`/meet` and `/meet/:meetId`). Instead of a 1-to-many broadcast, this mode offers a **many-to-many interactive video conference** where all participants can share their webcams, microphones, and screens in a dynamic, responsive video grid with active speaker spotlighting, pre-call lobby testing, and floating bottom controls.

---

## 2. Navigation & Routing Updates

### 2.1 Navigation Bar Changes (`client/src/components/SiteHeader.jsx`)
- **Remove**: The `Security` tab link from primary desktop and mobile navigation (`NAV_LINKS`).
- **Retain**: The `/security` route and link inside the footer (`SiteFooter.jsx`) so users and audits can still access compliance and encryption documentation.
- **Add**: `Video Meet` to `NAV_LINKS` with a `New` highlight badge:
  ```javascript
  const NAV_LINKS = [
    { path: '/', label: 'Watch Party' },
    { path: '/meet', label: 'Video Meet', badge: 'New' },
    { path: '/features', label: 'Features' },
    { path: '/about', label: 'About' },
    { path: '/help', label: 'Help & FAQ' },
    { path: '/changelog', label: "What's New" },
  ];
  ```

### 2.2 Route Architecture (`client/src/App.jsx`)
- `/meet` — **Meet Landing & Instant Launch Page**: Instant meeting creation, schedule/join by code, and device permission check.
- `/meet/:meetId` — **Active Video Call Room**:
  - Pre-join Green Room / Lobby (if not yet joined).
  - Main Google Meet grid stage once admitted.

---

## 3. Google Meet User Experience (UX/UI Breakdown)

```
+========================================================================================+
| ScreenLoop Meet                                               [Room ID: abc-defg-hij]  |
+========================================================================================+
|                                                                                        |
|  +--------------------------------+  +--------------------------------+  +-----------+ |
|  | [Webcam: Alex]                 |  | [Webcam: Sarah (Speaking)]     |  | In-Call   | |
|  |                                |  |     ==================         |  | Drawer    | |
|  |                                |  |     | Active Speaker |         |  |           | |
|  |                                |  |     | Glowing Border |         |  | • People  | |
|  |                                |  |     ==================         |  | • Chat    | |
|  | (Mic ON)            (Name Tag) |  | (Mic ON)            (Name Tag) |  |           | |
|  +--------------------------------+  +--------------------------------+  | [Message] | |
|                                                                          | [Send]    | |
|  +--------------------------------+  +--------------------------------+  |           | |
|  | [Webcam: Jordan (Camera Off)]  |  | [Screen Share / Presentation]  |  |           | |
|  |       [Avatar Initial]         |  |                                |  |           | |
|  |                                |  |                                |  |           | |
|  | (Mic Muted)         (Name Tag) |  | (HD Stream)         (Presenter)|  |           | |
|  +--------------------------------+  +--------------------------------+  +-----------+ |
|                                                                                        |
+========================================================================================+
|  10:42 AM | abc-defg-hij   [ 🎤 ] [ 📹 ] [ ✋ ] [ 🖥️ ] [ 😊 ] [ 📞 Leave ]  |  [👥 4] [💬] |
+========================================================================================+
```

### 3.1 Pre-Join Green Room (Lobby Preview)
Before jumping into the call, participants see a pre-flight lobby identical to Google Meet:
1. **Live Camera Preview**: Real-time mirror video feed.
2. **Microphone Audio Visualizer**: Animated green level meter verifying input volume.
3. **Quick Device Toggles**: Easy buttons to turn camera/mic ON/OFF before entering.
4. **Device Selectors**: Dropdown selection for camera, microphone, and output speakers.
5. **Display Name & Gender Avatar Selector**: Sets the user's participant card.
6. **"Join Now" / "Present Screen First" Buttons**.

### 3.2 Dynamic Video Grid Layout
Google Meet’s hallmark is its fluid, auto-sizing grid:
- **1 Participant**: Full-stage video centered with 16:9 ratio.
- **2 Participants**: Side-by-side (50% / 50%) or vertical split on mobile.
- **3–4 Participants**: 2 × 2 balanced grid.
- **5–6 Participants**: 3 × 2 grid.
- **7–12 Participants**: Responsive dynamic tile layout with active speaker auto-reordering.
- **Screen Share Active (Spotlight Mode)**: The shared screen occupies 75% of the stage width; webcam tiles dock into a neat vertical filmstrip on the right or bottom.

### 3.3 Active Speaker Detection
- Uses `AudioContext` and `AnalyserNode` to compute root-mean-square (RMS) microphone levels.
- The person currently speaking gets an animated **accent glow border** around their video tile.
- When multiple people are present, the active speaker's tile is prioritized on the main screen.

### 3.4 Floating Bottom Control Bar (Google Meet Style)
A sleek, floating pill-shaped bar anchored at the bottom:
- **Time & Meeting Code**: Left section displaying clock and clickable room code.
- **Center Action Controls**:
  - `Microphone`: Toggle mute/unmute (with red indicator when muted).
  - `Camera`: Toggle video on/off (with avatar fallback when off).
  - `Raise Hand`: Broadcast hand raise animation and chime to host.
  - `Screen Share`: Toggle entire screen / application window sharing.
  - `Reactions`: Floating emoji popups (❤️, 👏, 😂, 🎉, 👍).
  - `End Call`: Distinct red pill button with confirmation modal.
- **Right Utility Toggles**:
  - `Meeting Info`: Quick link copy, dial-in/PIN details.
  - `People (Count)`: Opens participant drawer with pin/mute options.
  - `In-Call Chat`: Opens real-time encrypted messaging drawer.
  - `Settings`: Audio/video hardware selector modal.

---

## 4. Technical & WebRTC Architecture

### 4.1 Multi-Stream Mesh Topology
For lightweight groups (up to 6–8 participants), ScreenLoop's peer-to-peer mesh architecture offers zero-cost, zero-server-transcoding performance:

```
                  ┌───────────────────────────────┐
                  │    Signaling Server (Node)    │
                  │   Socket.IO Room Coordinator  │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │ SDP / ICE Signaling    │ SDP / ICE Signaling    │ SDP / ICE Signaling
         ▼                        ▼                        ▼
  ┌──────────────┐         WebRTC Mesh P2P          ┌──────────────┐
  │  Peer Alpha  │◄────────────────────────────────►│   Peer Beta  │
  │ (Cam + Mic)  │                                  │ (Cam + Mic)  │
  └──────┬───────┘                                  └──────┬───────┘
         │                                                 │
         │                  WebRTC Mesh P2P                │
         └────────────────►┌──────────────┐◄───────────────┘
                           │  Peer Gamma  │
                           │(Cam+Mic+Scr) │
                           └──────────────┘
```

### 4.2 Simultaneous Media Tracks per Peer
Unlike the watch party room (which sends 1 display stream), each video call peer maintains:
1. **Audio Track**: Local microphone input (with optional noise suppression for voices).
2. **Video Track**: Local webcam (720p / 360p adaptive).
3. **Auxiliary Display Track**: Optional screen share track added via `RTCPeerConnection.addTrack`.

### 4.3 Track Management (Muting without Re-negotiation)
- **Mute Mic**: `audioTrack.enabled = false` (stops audio packets instantly without teardown).
- **Disable Camera**: `videoTrack.enabled = false` (freezes/stops sending video frames, UI shows user avatar).
- **Toggle Screen Share**: Adds/removes the display stream track via `replaceTrack` or renegotiation offer.

### 4.4 Socket.IO Signaling Events for Meet
Extend `server/src/socketHandlers.js` with meeting-specific events:
- `meet:join`: `{ meetId, name, avatar, micOn, cameraOn }`
- `meet:signal`: `{ to, from, signalData }` (SDP Offers/Answers & ICE candidates)
- `meet:peer-state-change`: `{ micOn, cameraOn, isSharing, handRaised }`
- `meet:active-speaker`: `{ socketId, audioLevel }`
- `meet:reaction`: `{ emoji, from }`
- `meet:leave`: Clean disconnection and tile removal

---

## 5. File System & Component Implementation Plan

### 5.1 New Files to Create
```
client/src/
├── pages/
│   ├── MeetLanding.jsx          # /meet - Create or join video call landing page
│   └── MeetRoom.jsx             # /meet/:meetId - Google Meet main conference room
├── components/meet/
│   ├── MeetLobby.jsx            # Pre-join green room camera & mic check
│   ├── MeetGrid.jsx             # Dynamic Google Meet responsive video tile grid
│   ├── MeetTile.jsx             # Individual participant video tile with badges
│   ├── MeetControlBar.jsx       # Floating bottom control bar
│   ├── MeetChatDrawer.jsx       # In-call text messaging sidebar
│   ├── MeetPeopleDrawer.jsx     # Participant list with host actions
│   ├── MeetDeviceModal.jsx      # Audio/Video hardware settings selector
│   └── MeetHandRaiseOverlay.jsx # Hand raised notification alert
└── hooks/
    ├── useMediaDevices.js       # Camera/mic permissions, enumeration, device switching
    ├── useMeetRTC.js            # Multi-peer WebRTC connection mesh coordinator
    └── useActiveSpeaker.js      # RMS volume calculation and active speaker spotlighting
```

### 5.2 Files to Modify
- **[client/src/components/SiteHeader.jsx](file:///i:/Web%20devlopment/Screenshare/client/src/components/SiteHeader.jsx)**:
  - Replace `Security` nav link with `Video Meet` (`/meet`).
- **[client/src/App.jsx](file:///i:/Web%20devlopment/Screenshare/client/src/App.jsx)**:
  - Register `/meet` and `/meet/:meetId` routes with lazy loading and error boundaries.
- **[client/src/styles/](file:///i:/Web%20devlopment/Screenshare/client/src/styles/)**:
  - Add dedicated `meet.css` stylesheet for Google Meet dark aesthetic, grid math, and floating pill controls.
- **[server/src/socketHandlers.js](file:///i:/Web%20devlopment/Screenshare/server/src/socketHandlers.js)**:
  - Add `meet:*` event routing for multi-peer state broadcasting.

---

## 6. Implementation Phasing Strategy (For AI Execution)

| Phase | Milestone | Scope |
| :---: | :--- | :--- |
| **Phase 1** | **Navigation & Routes** | Update `SiteHeader.jsx` to replace `Security` with `Video Meet`; configure `/meet` and `/meet/:meetId` in `App.jsx`. |
| **Phase 2** | **Device Engine & Lobby** | Build `useMediaDevices.js` and `MeetLobby.jsx` with camera preview, mic meter, and device switcher. |
| **Phase 3** | **WebRTC Multi-Peer Mesh** | Implement `useMeetRTC.js` supporting multi-peer camera, mic, and screen share tracks with signaling. |
| **Phase 4** | **Google Meet UI Stage** | Build `MeetGrid.jsx`, `MeetTile.jsx`, active speaker spotlighting, and responsive tile resizing. |
| **Phase 5** | **Control Bar & Drawers** | Build `MeetControlBar.jsx`, floating emoji reactions, hand-raise alerts, chat drawer, and participant management. |
| **Phase 6** | **Polish & Verification** | Run Vitest suites, verify CSP on Vercel, test cross-browser camera/mic permissions, and verify build. |

---

## 7. Quality & Security Safeguards

1. **Permissions Graceful Fallbacks**: If a user denies camera or microphone access, the lobby provides clear on-screen instructions without crashing.
2. **Hardware Disconnect Handling**: Automatically listens to `navigator.mediaDevices.ondevicechange` to handle unplugged webcams/microphones.
3. **No Database / Zero Accounts**: Retains ScreenLoop’s signature privacy model: zero log-ins, ephemeral in-memory rooms, and URL hash-encrypted chat.
4. **Vercel & Render Compatibility**: Fully compatible with existing root `vercel.json` CSP directives and Render Socket.IO signaling.

---

<div align="center">
  <sub>Document generated for ScreenLoop AI Architecture Engine • Ready for staged implementation on command.</sub>
</div>
