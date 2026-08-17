// ─────────────────────────────────────────────────────────────────────────────
// roomId.js — Generate and validate room IDs
// Uses crypto.getRandomValues() for secure randomness.
// ─────────────────────────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ROOM_ID_LENGTH = 10;

/**
 * Generate a cryptographically secure 10-char alphanumeric room ID.
 * Uses crypto.getRandomValues() instead of Math.random().
 */
export function generateRoomId() {
  const bytes = new Uint8Array(ROOM_ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join('');
}

/**
 * Build the full room invite link from a room ID and optional key.
 */
export function buildRoomLink(roomId, roomKey) {
  const url = `${window.location.origin}/room/${roomId}`;
  return roomKey ? `${url}#${roomKey}` : url;
}
