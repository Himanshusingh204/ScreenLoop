// ─────────────────────────────────────────────────────────────────────────────
// roomManager.js — In-memory room state management
// No database needed. Rooms live as long as the server is running.
// Includes capacity enforcement and room validation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Room structure:
 * {
 *   id: string,
 *   hostId: string,          // socket.id of the host
 *   pin: string|null,        // optional room password
 *   participants: Map<socketId, { name, isHost }>,
 *   createdAt: number        // timestamp
 * }
 */

const MAX_PARTICIPANTS = 10;
const rooms = new Map();

/**
 * Create a new room with the given ID and host.
 */
function createRoom(roomId, hostSocketId, hostName, pin = null, gender = 'other') {
  const room = {
    id: roomId,
    hostId: hostSocketId,
    pin: pin || null,
    participants: new Map(),
    createdAt: Date.now(),
  };
  room.participants.set(hostSocketId, { name: hostName, isHost: true, gender });
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
function joinRoom(roomId, socketId, name, pin = null, gender = 'other') {
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

  room.participants.set(socketId, { name, isHost: false });
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
    return { room: null, wasHost, newHostId: null };
  }

  let newHostId = null;
  if (wasHost) {
    const [nextId] = room.participants.keys();
    room.hostId = nextId;
    room.participants.get(nextId).isHost = true;
    newHostId = nextId;
  }

  return { room, wasHost, newHostId };
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
    gender: data.gender || 'other',
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

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  findRoomBySocket,
  getParticipants,
  transferHost,
  MAX_PARTICIPANTS,
};
