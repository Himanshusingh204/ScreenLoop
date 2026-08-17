// ─────────────────────────────────────────────────────────────────────────────
// sanitizer.js — Security sanitizer for user-generated strings
// Prevents Cross-Site Scripting (XSS) and injection attacks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escapes HTML characters in a string to prevent XSS.
 * @param {string} str - Raw user input
 * @returns {string} Sanitized string
 */
export function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates a Room ID format (alphanumeric, 4-20 chars).
 * @param {string} roomId
 * @returns {boolean}
 */
export function isValidRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{4,20}$/.test(roomId);
}

/**
 * Validates and sanitizes a display name.
 * @param {string} name
 * @returns {string}
 */
export function sanitizeDisplayName(name) {
  if (!name || typeof name !== 'string') return 'Anonymous';
  const trimmed = name.trim().slice(0, 30);
  return sanitizeText(trimmed) || 'Anonymous';
}
