// recentRooms.js — Local browser history of recently visited rooms
// Stored in localStorage (last 10). Room keys/PINs are never saved here —
// only the room ID and the last visit timestamp.
const STORAGE_KEY = 'screenloop-recent-rooms';
const MAX_RECENT_ROOMS = 10;

/**
 * Read the recent-rooms list (newest first).
 */
export function getRecentRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list)
      ? list.filter((r) => r && typeof r.roomId === 'string' && typeof r.timestamp === 'number')
      : [];
  } catch {
    return [];
  }
}

/**
 * Record a room visit. Deduplicates by roomId, keeps the newest 10.
 */
export function addRecentRoom(roomId) {
  if (!roomId || typeof roomId !== 'string') return getRecentRooms();
  try {
    const next = [
      { roomId, timestamp: Date.now() },
      ...getRecentRooms().filter((r) => r.roomId !== roomId),
    ].slice(0, MAX_RECENT_ROOMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecentRooms();
  }
}

/**
 * Clear the recent-rooms history.
 */
export function clearRecentRooms() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore storage errors (private mode) */
  }
}