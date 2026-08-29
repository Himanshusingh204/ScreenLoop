// changelog.js — Release history for the /changelog page.
// Newest release first. Grounded in the project git history and feature batches.
export const RELEASES = [
  {
    version: 'v1.4.0',
    date: 'Aug 20, 2026',
    tag: 'Site & discovery',
    summary: 'Four new pages make Screenloop easier to learn about, follow, and reach out about.',
    items: [
      'New Contact, Roadmap, Changelog, and Accessibility pages',
      'Footer navigation expanded across every page',
    ],
  },
  {
    version: 'v1.3.0',
    date: 'Aug 20, 2026',
    tag: 'Watch-party experience',
    summary: 'Quality-of-life upgrades for hosts and viewers.',
    items: [
      'Recent rooms history on the home page (last 10, kept private to your browser)',
      'URLs in chat are now clickable links automatically',
      'Copy button on every chat message',
      'Character counter on the join name field',
      'Host note added to the share modal',
    ],
  },
  {
    version: 'v1.2.0',
    date: 'Aug 19, 2026',
    tag: 'Reconnect & room UX',
    summary: 'Rooms recover from network blips, and errors are impossible to miss.',
    items: [
      'Rejoin PIN-protected rooms safely after reconnects',
      'Room errors surface as clear toasts instead of silent failures',
      'Consistent gender handling for hosts and viewers',
      'More reliable screen wake lock during long sessions',
    ],
  },
  {
    version: 'v1.1.0',
    date: 'Aug 18, 2026',
    tag: 'Stability & security',
    summary: 'Hardening passes across the entire stack.',
    items: [
      'WebRTC signaling restricted to same-room peers',
      'Custom 404 page and global error boundary',
      'Room creation rate limiting and PIN brute-force protection',
      'Express hardening (security headers, error handling)',
    ],
  },
  {
    version: 'v1.0.0',
    date: 'Aug 17, 2026',
    tag: 'Launch',
    summary: 'The first public release of Screenloop.',
    items: [
      'Peer-to-peer screen sharing up to 1440p / 60fps',
      'AES-256-GCM end-to-end encrypted chat',
      'Gender-tailored DiceBear avatars',
      'Features, Security, About, Help, Privacy, and Terms pages',
    ],
  },
];