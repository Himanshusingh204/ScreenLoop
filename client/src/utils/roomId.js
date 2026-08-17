// ─────────────────────────────────────────────────────────────────────────────
// roomId.js — Generate and validate room IDs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random 8-char alphanumeric room ID (e.g. "x7k2m9qp")
 */
export function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

/**
 * Build the full room invite link from a room ID and optional key.
 */
export function buildRoomLink(roomId, roomKey) {
  const url = `${window.location.origin}/room/${roomId}`;
  return roomKey ? `${url}#${roomKey}` : url;
}
