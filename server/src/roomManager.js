// ─────────────────────────────────────────────────────────────────────────────
// roomManager.js — In-memory room state management
// No database needed. Rooms live as long as the server is running.
// Includes capacity enforcement, room validation, and auto-cleanup.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Room structure:
 * {
 *   id: string,
 *   hostId: string,          // socket.id of the host
 *   pin: string|null,        // optional room password
 *   participants: Map<socketId, { name, isHost, gender }>,
 *   createdAt: number        // timestamp
 * }
 */

const MAX_PARTICIPANTS = parseInt(process.env.MAX_PARTICIPANTS, 10) || 10;
const MAX_ROOMS = parseInt(process.env.MAX_ROOMS, 10) || 100;
const ROOM_TTL_MS = parseInt(process.env.ROOM_TTL_MS, 10) || 30 * 60 * 1000;

// Valid avatar genders. Anything else falls back to DEFAULT_GENDER.
const VALID_GENDERS = ['male', 'female', 'neutral'];
const DEFAULT_GENDER = 'neutral';

/**
 * Coerce an arbitrary client-supplied gender into a known value.
 * All normalization lives here so callers never repeat the allow-list.
 */
function normalizeGender(gender) {
  return VALID_GENDERS.includes(gender) ? gender : DEFAULT_GENDER;
}

const rooms = new Map();

/**
 * Create a new room with the given ID and host.
 */
function createRoom(roomId, hostSocketId, hostName, pin = null, gender = DEFAULT_GENDER) {
  if (rooms.size >= MAX_ROOMS) {
    throw new Error('Server is at capacity. Try again later.');
  }

  const room = {
    id: roomId,
    hostId: hostSocketId,
    pin: pin || null,
    participants: new Map(),
    createdAt: Date.now(),
  };
  room.participants.set(hostSocketId, {
    name: hostName,
    isHost: true,
    gender: normalizeGender(gender),
  });
  rooms.set(roomId, room);
  return room;
}

/**
 * Get an existing room by ID.
 */
function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

/**
 * Add a participant to a room.
 * Enforces MAX_PARTICIPANTS limit.
 */
function joinRoom(roomId, socketId, name, pin = null, gender = DEFAULT_GENDER) {
  const room = rooms.get(roomId);
  if (!room) throw new Error('Room not found');

  if (room.pin && room.pin !== pin) {
    throw new Error('Incorrect PIN');
  }

  if (room.participants.size >= MAX_PARTICIPANTS) {
    throw new Error('Room is full');
  }

  if (room.participants.has(socketId)) {
    throw new Error('Already in room');
  }

  room.participants.set(socketId, { name, isHost: false, gender: normalizeGender(gender) });
  return room;
}

/**
 * Remove a participant from a room (on disconnect/leave).
 * If the host leaves, promote the next participant.
 * If the room is empty, delete it.
 * Returns { room, wasHost, newHostId } or null if room didn't exist.
 */
function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const wasHost = room.hostId === socketId;
  room.participants.delete(socketId);

  if (room.participants.size === 0) {
    rooms.delete(roomId);
    return { room: null, wasHost, newHostId: null, roomClosed: wasHost };
  }

  let newHostId = null;
  if (wasHost) {
    const [nextId] = room.participants.keys();
    room.hostId = nextId;
    room.participants.get(nextId).isHost = true;
    newHostId = nextId;
  }

  return { room, wasHost, newHostId, roomClosed: false };
}

/**
 * Find which room a socket belongs to.
 */
function findRoomBySocket(socketId) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.participants.has(socketId)) {
      return { roomId, room };
    }
  }
  return null;
}

/**
 * Get serializable participant list for a room.
 */
function getParticipants(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.participants.entries()).map(([id, data]) => ({
    socketId: id,
    name: data.name,
    isHost: data.isHost,
    gender: data.gender || DEFAULT_GENDER,
  }));
}

/**
 * Get summary of all active rooms (for the /api/rooms endpoint).
 */
function listRooms() {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    participantCount: room.participants.size,
    hasPin: !!room.pin,
    createdAt: room.createdAt,
  }));
}

/**
 * Transfer host privileges to another participant.
 */
function transferHost(roomId, currentHostId, newHostId) {
  const room = rooms.get(roomId);
  if (!room || room.hostId !== currentHostId) return false;
  if (!room.participants.has(newHostId)) return false;

  room.participants.get(currentHostId).isHost = false;
  room.hostId = newHostId;
  room.participants.get(newHostId).isHost = true;
  return true;
}

/**
 * Delete rooms that have exceeded the TTL.
 */
function sweepExpiredRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(roomId);
    }
  }
}

const roomSweepTimer = setInterval(sweepExpiredRooms, 5 * 60 * 1000);

function stopRoomSweep() {
  clearInterval(roomSweepTimer);
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  findRoomBySocket,
  getParticipants,
  listRooms,
  transferHost,
  normalizeGender,
  MAX_PARTICIPANTS,
  MAX_ROOMS,
  sweepExpiredRooms,
  stopRoomSweep,
};
