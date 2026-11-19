// webrtcConfig.js — Single source of truth for ICE servers (STUN + TURN)
// Reads TURN credentials from env; falls back to public OpenRelay for local dev.
// Phase 1: unifies useWebRTC + useMeetRTC so meet works behind symmetric NAT too.

const DEFAULT_STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

function parseUrls(raw, fallback) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return fallback;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getIceServers() {
  const servers = [...DEFAULT_STUN];

  // Optional env overrides (comma-separated TURN URLs + shared credential).
  // Vite exposes only VITE_* vars to the browser — never put long-lived secrets here.
  // Production should mint short-lived TURN creds via GET /api/turn-credentials (Phase C).
  const turnUrls = parseUrls(import.meta.env.VITE_TURN_URLS, []);
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrls.length > 0 && username && credential) {
    for (const urls of turnUrls) {
      servers.push({ urls, username, credential });
    }
    return { iceServers: servers };
  }

  // Dev fallback: public OpenRelay (abusable — do not rely on in production).
  if (import.meta.env.DEV && !turnUrls.length) {
    servers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    );
    return { iceServers: servers };
  }

  // Prod without TURN configured: STUN only (works for most NATs, fails for symmetric).
  if (!turnUrls.length && import.meta.env.PROD) {
    console.warn(
      '[webrtc] No TURN configured (VITE_TURN_URLS). Calls may fail behind symmetric NAT. ' +
        'Set TURN env vars or deploy coturn (see MASTER_AUDIT_PLAN Phase C).'
    );
  }

  // Env provided URLs but missing credentials — still add URLs (some TURN servers allow anon).
  for (const urls of turnUrls) {
    servers.push(username && credential ? { urls, username, credential } : { urls });
  }

  return { iceServers: servers };
}

// Prebuilt config for call sites that need a static object.
export const ICE_SERVERS = getIceServers();
