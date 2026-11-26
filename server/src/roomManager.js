// roomManager.js — In-memory room state management
// No database needed. Rooms live as long as the server is running.
// Includes capacity enforcement, room validation, and auto-cleanup.
// Manages both watch-party rooms and meet (video-call) rooms.

/**
 * Room structure:
 * {
 *   id: string,
 *   hostId: string,          // socket.id of the host
 *   pin: string|null,        // optional room password
 *   participants: Map<socketId, { name, isHost, gender }>,
 *   createdAt: number        // timestamp
 * }
 *
 * Meet structure:
 * {
 *   id: string,
 *   participants: Map<socketId, { name, gender, micOn, cameraOn, isSharing, handRaised }>,
 *   createdAt: number
 * }
 */

const crypto = require('crypto');

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

/**
 * Hash a room PIN with SHA-256 so memory dumps / logs never expose it.
 * Returns null for empty PIN (open room).
 */
function hashPin(pin) {
  if (!pin) return null;
  return crypto.createHash('sha256').update(String(pin), 'utf8').digest();
}

/**
 * Timing-safe PIN comparison. Accepts stored Buffer hash + candidate string.
 */
function verifyPin(storedHash, candidate) {
  if (!storedHash) return true; // open room
  if (candidate === undefined || candidate === null) return false;
  const candidateHash = hashPin(candidate);
  if (!candidateHash || storedHash.length !== candidateHash.length) return false;
  try {
    return crypto.timingSafeEqual(storedHash, candidateHash);
  } catch {
    return false;
  }
}

const rooms = new Map();
const socketToRoom = new Map(); // O(1) reverse index: socketId -> roomId
const socketToMeet = new Map(); // O(1) reverse index: socketId -> meetId

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
    pin: hashPin(pin),
    hasPin: !!pin,
    participants: new Map(),
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    hostOnlyControls: false,
    bannedKeys: new Set(), // client keys removed with ban:true; lifetime of the room
  };
  room.participants.set(hostSocketId, {
    name: hostName,
    isHost: true,
    gender: normalizeGender(gender),
  });
  rooms.set(roomId, room);
  socketToRoom.set(hostSocketId, roomId);
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

  if (room.pin && !verifyPin(room.pin, pin)) {
    throw new Error('Incorrect PIN');
  }

  if (room.participants.size >= MAX_PARTICIPANTS) {
    throw new Error('Room is full');
  }

  if (room.participants.has(socketId)) {
    throw new Error('Already in room');
  }

  room.participants.set(socketId, { name, isHost: false, gender: normalizeGender(gender) });
  room.lastActivityAt = Date.now();
  socketToRoom.set(socketId, roomId);
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
  socketToRoom.delete(socketId);

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
 * Find which room a socket belongs to. (O(1) via socketToRoom index)
 */
function findRoomBySocket(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  return room ? { roomId, room } : null;
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
    e2ePub: data.e2ePub || null, // public ECDH key for media-key delivery (public by design)
  }));
}

/**
 * Get summary of all active rooms (for the /api/rooms endpoint).
 */
function countMeets() {
  return meets.size;
}

function listRooms() {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    participantCount: room.participants.size,
    hasPin: !!(room.hasPin || room.pin),
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
 * Refresh a room's activity clock (Phase 2: TTL is idle-based, not creation-based,
 * so long movies don't get swept mid-stream). Safe to call with unknown IDs.
 */
function touchRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) room.lastActivityAt = Date.now();
}

/**
 * Delete rooms idle longer than the TTL.
 */
function sweepExpiredRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    const lastActive = room.lastActivityAt || room.createdAt;
    if (now - lastActive > ROOM_TTL_MS) {
      for (const sid of room.participants.keys()) {
        socketToRoom.delete(sid);
      }
      rooms.delete(roomId);
    }
  }
  sweepExpiredMeets(now);
}

const roomSweepTimer = setInterval(sweepExpiredRooms, 5 * 60 * 1000);

function stopRoomSweep() {
  clearInterval(roomSweepTimer);
}

// Meet Room Management

const MAX_MEET_PARTICIPANTS = parseInt(process.env.MAX_MEET_PARTICIPANTS, 10) || 20;
const MEET_TTL_MS =
  parseInt(process.env.MEET_TTL_MS, 10) || parseInt(process.env.ROOM_TTL_MS, 10) || 30 * 60 * 1000;
const meets = new Map();

/**
 * Build a fresh meet participant record.
 */
function makeMeetParticipant(name, gender, micOn, cameraOn) {
  return {
    name,
    gender: normalizeGender(gender),
    micOn: micOn !== false,
    cameraOn: cameraOn !== false,
    isSharing: false,
    handRaised: false,
  };
}

/**
 * Create a new meet room with the given ID and first participant.
 */
function createMeet(meetId, socketId, name, gender, micOn, cameraOn) {
  if (meets.size >= 100) throw new Error('Server at capacity');
  const meet = {
    id: meetId,
    participants: new Map(),
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
  meet.participants.set(socketId, makeMeetParticipant(name, gender, micOn, cameraOn));
  meets.set(meetId, meet);
  socketToMeet.set(socketId, meetId);
  return meet;
}

/**
 * Get an existing meet by ID.
 */
function getMeet(meetId) {
  return meets.get(meetId) || null;
}

/**
 * Add a participant to an existing meet room.
 * Enforces MAX_MEET_PARTICIPANTS limit.
 */
function joinMeet(meetId, socketId, name, gender, micOn, cameraOn) {
  const meet = meets.get(meetId);
  if (!meet) throw new Error('Meet not found');
  if (meet.participants.size >= MAX_MEET_PARTICIPANTS) throw new Error('Meet is full');
  if (meet.participants.has(socketId)) throw new Error('Already in meet');
  meet.participants.set(socketId, makeMeetParticipant(name, gender, micOn, cameraOn));
  meet.lastActivityAt = Date.now();
  socketToMeet.set(socketId, meetId);
  return meet;
}

/**
 * Remove a participant from a meet room.
 * If the room becomes empty, delete it.
 * Returns { meetClosed: boolean } or null if meet didn't exist.
 */
function leaveMeet(meetId, socketId) {
  const meet = meets.get(meetId);
  if (!meet) return null;
  meet.participants.delete(socketId);
  socketToMeet.delete(socketId);
  if (meet.participants.size === 0) {
    meets.delete(meetId);
    return { meetClosed: true };
  }
  return { meetClosed: false };
}

/**
 * Refresh a meet's activity clock. Safe to call with unknown IDs.
 */
function touchMeet(meetId) {
  const meet = meets.get(meetId);
  if (meet) meet.lastActivityAt = Date.now();
}

/**
 * Delete meets idle longer than the TTL (Phase 2: meets were never swept).
 */
function sweepExpiredMeets(now = Date.now()) {
  for (const [meetId, meet] of meets.entries()) {
    const lastActive = meet.lastActivityAt || meet.createdAt;
    if (now - lastActive > MEET_TTL_MS) {
      for (const sid of meet.participants.keys()) {
        socketToMeet.delete(sid);
      }
      meets.delete(meetId);
    }
  }
}

/**
 * Get serializable participant list for a meet.
 */
function getMeetParticipants(meetId) {
  const meet = meets.get(meetId);
  if (!meet) return [];
  return Array.from(meet.participants.entries()).map(([id, data]) => ({
    socketId: id,
    ...data,
  }));
}

/**
 * Find which meet a socket belongs to. (O(1) via socketToMeet index)
 */
function findMeetBySocket(socketId) {
  const meetId = socketToMeet.get(socketId);
  if (!meetId) return null;
  const meet = meets.get(meetId);
  return meet ? { meetId, meet } : null;
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
  hashPin,
  verifyPin,
  touchRoom,
  touchMeet,
  sweepExpiredMeets,
  MEET_TTL_MS,
  MAX_PARTICIPANTS,
  MAX_ROOMS,
  sweepExpiredRooms,
  stopRoomSweep,
  // Meet functions
  createMeet,
  getMeet,
  joinMeet,
  leaveMeet,
  findMeetBySocket,
  getMeetParticipants,
  countMeets,
  MAX_MEET_PARTICIPANTS,
};
