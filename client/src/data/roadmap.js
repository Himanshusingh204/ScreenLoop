// roadmap.js — Public roadmap data for the /roadmap page.
export const ROADMAP_PHASES = [
  {
    id: 'sfu',
    title: 'LiveKit SFU & Cinema Audio',
    tagline: 'Enterprise-grade video pipeline replacing mesh bottleneck with dedicated SFU.',
    items: [
      { title: 'LiveKit SFU integration (1x upload scaling to 10+ viewers)', status: 'done' },
      { title: 'Cinema audio preset (48kHz stereo, voice filtering bypassed)', status: 'done' },
      { title: 'Hybrid fallback to WebRTC mesh without credentials', status: 'done' },
      { title: 'LiveKit JWT access token minting with PIN verification', status: 'done' },
      { title: 'Picture-in-Picture floating toggle on video stage', status: 'done' },
      { title: 'E2EE media frame encryption for watch rooms (verified against a live SFU)', status: 'done' },
    ],
  },
  {
    id: 'chat',
    title: 'Chat & Interaction',
    tagline: 'Rich, encrypted real-time chat and interactive reactions for all participants.',
    items: [
      { title: 'URL auto-linkification in chat', status: 'done' },
      { title: 'Copy message button', status: 'done' },
      { title: 'Message timestamps', status: 'done' },
      { title: 'Real-time floating emoji reaction bursts', status: 'done' },
      { title: 'Live typing indicators with auto-cleanup timer', status: 'done' },
      { title: 'Chat message search & filter', status: 'done' },
    ],
  },
  {
    id: 'a11y',
    title: 'Keyboard & Accessibility',
    tagline: 'Reaching WCAG 2.1 AA across every button, overlay, and screen reader.',
    items: [
      { title: 'Escape key handling (modals, fullscreen, sidebar)', status: 'done' },
      { title: 'Volume slider screen-reader labels', status: 'done' },
      { title: 'Share modal QR code alt text & local generation', status: 'done' },
      { title: 'Fullscreen shortcut hints (F key)', status: 'done' },
      { title: 'Tooltips and ARIA labels on all control bar buttons', status: 'done' },
      { title: 'On-device live captions, English translation and recap (Whisper in the browser)', status: 'done' },
      { title: 'Audio description track support', status: 'planned' },
    ],
  },
  {
    id: 'server',
    title: 'Server Hardening & Scalability',
    tagline: 'Production-grade reliability, observability, and abuse protection.',
    items: [
      { title: 'O(1) reverse socket lookup maps for instant room routing', status: 'done' },
      { title: 'Structured pino logging with JSON format', status: 'done' },
      { title: 'Active room listing endpoint (/api/rooms)', status: 'done' },
      { title: 'Brute-force PIN rate limiting and spam prevention', status: 'done' },
      { title: 'Max room caps & automatic TTL garbage collection', status: 'done' },
      { title: 'Separate reaction rate limit', status: 'done' },
      { title: 'Redis adapter, room-affinity routing and metrics for multi-node deployments', status: 'done' },
    ],
  },
];
