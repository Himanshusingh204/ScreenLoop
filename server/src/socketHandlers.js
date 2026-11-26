// socketHandlers.js — All Socket.io event handlers with security
// Handles: room join/leave, WebRTC signaling, playback sync, chat
// Security: membership validation, IP-based rate limiting, authorization

const {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  findRoomBySocket,
  getParticipants,
  transferHost,
  normalizeGender,
  touchRoom,
  touchMeet,
  MAX_PARTICIPANTS,
  // Meet functions
  createMeet,
  getMeet,
  joinMeet,
  leaveMeet,
  findMeetBySocket,
  getMeetParticipants,
} = require('./roomManager');

const { generateLiveKitToken, LIVEKIT_URL } = require('./livekitToken');
const { tokenRequests } = require('./metrics');
const lkAdmin = require('./livekitAdmin');

const {
  getClientKey,
  checkSpam,
  checkReactionRate,
  checkPinBruteForce,
  recordFailedPin,
  resetFailedPin,
} = require('./rateLimiter');

const crypto = require('crypto');
const logger = require('./logger');

// Chat message ownership (Phase 1 authz fix)
// Maps msgId -> { socketId, roomId, timestamp }. Prevents any participant from
// deleting/editing anyone else's messages by spoofing msgId + msgTimestamp.
// Server-side timestamp is authoritative; client msgTimestamp is untrusted.
const chatOwnership = new Map();
const CHAT_OWNERSHIP_TTL_MS = 10 * 60 * 1000;
const CHAT_EDIT_WINDOW_MS = 60 * 1000;

function trackChatMessage(msgId, socketId, roomId) {
  chatOwnership.set(msgId, { socketId, roomId, timestamp: Date.now() });
  // Opportunistic sweep to bound memory without a dedicated timer
  if (chatOwnership.size > 2000) {
    const now = Date.now();
    for (const [id, rec] of chatOwnership.entries()) {
      if (now - rec.timestamp > CHAT_OWNERSHIP_TTL_MS) chatOwnership.delete(id);
    }
  }
}

function canDeleteMessage(room, socketId, msgId, clientTimestamp) {
  const isHost = room.hostId === socketId;
  const owner = chatOwnership.get(msgId);
  if (owner && owner.roomId === room.id) {
    if (isHost) return true;
    return owner.socketId === socketId && Date.now() - owner.timestamp < CHAT_EDIT_WINDOW_MS;
  }
  // Fallback for messages sent before a server restart (no ownership record):
  // preserve old behavior so in-flight messages don't break during deploy.
  if (!owner) {
    if (isHost) return true;
    return Date.now() - Number(clientTimestamp) < CHAT_EDIT_WINDOW_MS;
  }
  return false;
}

function canEditMessage(room, socketId, msgId) {
  const owner = chatOwnership.get(msgId);
  if (owner && owner.roomId === room.id) {
    return owner.socketId === socketId && Date.now() - owner.timestamp < CHAT_EDIT_WINDOW_MS;
  }
  // Unknown msgId: deny (old code allowed anyone to edit anything — insecure).
  return false;
}

// Signaling payload size caps (prevent signaling-channel abuse)
const MAX_SDP_CHARS = 16000;
const MAX_ICE_CHARS = 4000;

function payloadSize(value) {
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    return s ? s.length : 0;
  } catch {
    return MAX_SDP_CHARS + 1;
  }
}

// Sync / annotation payload validation
// Shapes match client/src: media times are seconds; pointer and stroke
// coordinates are 0..1 fractions of the video area (pointer uses -1 on leave;
// touch strokes may drift a little past the edge, hence the wider stroke range).
const MAX_MEDIA_TIME_S = 1e7;
const MAX_STROKE_CHARS = 8192;
// shortcut: allowlist mirrors ControlBar's five reactions, add new ones here too
const REACTION_EMOJIS = new Set(['😂', '😲', '💖', '🍿', '🔥']);

function isMediaTime(t) {
  return typeof t === 'number' && Number.isFinite(t) && t >= 0 && t <= MAX_MEDIA_TIME_S;
}

function isPointerCoord(v) {
  return typeof v === 'number' && ((v >= 0 && v <= 1) || v === -1);
}

function isStrokeCoord(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 2;
}

function isValidStroke(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  if (payloadSize(s) > MAX_STROKE_CHARS) return false;
  return ['fromX', 'fromY', 'toX', 'toY'].every((k) => isStrokeCoord(s[k]));
}

// Membership assertions (Phase 2: single source of truth)
// Every room/meet event must prove: socket claims this room AND the room exists
// AND the socket is still a participant. Returns { room, participant } or null.
function requireRoomMember(socket, roomId) {
  if (!roomId || !socket.data || socket.data.roomId !== roomId) return null;
  const room = getRoom(roomId);
  const participant = room?.participants.get(socket.id);
  if (!room || !participant) return null;
  return { room, participant };
}

// Meets use their own Socket.IO room namespace so a meet and a watch room with the same id cannot cross-talk.
const meetRoom = (meetId) => `meet:${meetId}`;

// With several nodes behind an affinity LB, a socket may only act on the room it was routed for; otherwise an
// attacker could create a same-named "shadow" room on another node and, via the Redis adapter, hear/forge the real one.
function roomBindingOk(socket, id) {
  const q = socket.handshake?.query?.room;
  if (q === undefined) return !process.env.REDIS_URL; // legacy clients are only tolerated single-node
  return q === id;
}

function requireMeetMember(socket) {
  const meetId = socket.data?.meetId;
  if (!meetId) return null;
  const meet = getMeet(meetId);
  const participant = meet?.participants.get(socket.id);
  if (!meet || !participant) return null;
  return { meetId, meet, participant };
}

/**
 * Register all socket event handlers for a connected client.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
function registerHandlers(socket, io) {
  // Track which room this socket is in for fast membership checks
  socket.data = { roomId: null, role: null, joinedAt: null, meetId: null };

  // A malformed payload (e.g. emit('webrtc:stop') with no args) would throw in
  // destructuring and crash the process via uncaughtException. Contain it per handler.
  const rawOn = socket.on.bind(socket);
  socket.on = (event, fn) =>
    rawOn(event, (...args) => {
      try {
        fn(...args);
      } catch (err) {
        logger.warn({ event, socketId: socket.id, err: err.message }, 'Handler error');
      }
    });

  // Phase 2: idle-activity middleware — any inbound event refreshes the
  // room/meet TTL clock so active sessions are never swept mid-stream.
  // Guarded for unit-test fake sockets (which lack .use).
  if (typeof socket.use === 'function') {
    socket.use(([event], next) => {
      try {
        if (socket.data?.roomId && event !== 'room:create' && event !== 'room:join') {
          touchRoom(socket.data.roomId);
        }
        if (socket.data?.meetId && event.startsWith('meet:')) {
          touchMeet(socket.data.meetId);
        }
      } catch {
        // Activity tracking must never break signaling
      }
      next();
    });
  }

  // Room: Create
  socket.on('room:create', ({ roomId, name, pin, gender }) => {
    try {
      // Task 44: Validate roomId format — no special characters
      if (!roomId || typeof roomId !== 'string' || !/^[A-Za-z0-9_-]{1,20}$/.test(roomId)) return;
      if (!name || typeof name !== 'string' || name.length > 30) return;
      if (pin && (typeof pin !== 'string' || pin.length > 20)) return;
      // A socket in a room must leave first, or its old membership leaks
      if (socket.data.roomId) return;
      if (!roomBindingOk(socket, roomId)) return;

      // Task 43: Rate-limit room creation per IP
      if (!checkSpam(socket)) {
        socket.emit('room:error', { message: 'Too many requests. Please wait a moment.' });
        return;
      }

      const existing = getRoom(roomId);
      if (existing) {
        socket.emit('room:error', { message: 'Room already exists.' });
        return;
      }

      // Task 40: Pass gender through so avatars render correctly (normalized in roomManager)
      const room = createRoom(roomId, socket.id, name, pin, gender);
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = 'host';
      socket.data.joinedAt = Date.now();

      socket.emit('room:joined', {
        roomId,
        participants: getParticipants(roomId),
        isHost: true,
        hostId: room.hostId,
        // Task 42: include hostOnlyControls so client has correct state
        hostOnlyControls: room.hostOnlyControls || false,
      });

      logger.info(
        { roomId, socketId: socket.id, name, gender: normalizeGender(gender) },
        'Room created'
      );
    } catch (err) {
      logger.error({ err: err.message }, 'Error creating room');
      socket.emit('room:error', { message: 'Failed to create room.' });
    }
  });

  // Room: Join
  socket.on('room:join', ({ roomId, name, pin, gender }) => {
    try {
      // Task 44: Validate roomId format
      if (!roomId || typeof roomId !== 'string' || !/^[A-Za-z0-9_-]{1,20}$/.test(roomId)) return;
      if (!name || typeof name !== 'string' || name.length > 30) return;
      if (pin && (typeof pin !== 'string' || pin.length > 20)) return;
      if (socket.data.roomId) return;
      if (!roomBindingOk(socket, roomId)) return;

      if (!checkPinBruteForce(socket)) {
        socket.emit('room:error', {
          message: 'Too many failed PIN attempts. Try again in 5 minutes.',
        });
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found. Check the link and try again.' });
        return;
      }
      if (room.bannedKeys?.has(getClientKey(socket))) {
        socket.emit('room:error', { message: 'You were removed from this room by the host.' });
        return;
      }

      try {
        // Task 40: Pass gender through (normalized in roomManager)
        joinRoom(roomId, socket.id, name, pin, gender);
        resetFailedPin(socket);
      } catch (e) {
        if (e.message === 'Incorrect PIN') {
          recordFailedPin(socket);
        } else if (e.message === 'Room is full') {
          // Task 53: Improve "room full" error with count info
          throw new Error(
            `Room is full (${room.participants.size}/${MAX_PARTICIPANTS}). Try again later.`
          );
        }
        throw e;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = 'viewer';
      socket.data.joinedAt = Date.now();

      socket.emit('room:joined', {
        roomId,
        participants: getParticipants(roomId),
        isHost: false,
        hostId: room.hostId,
        // Task 42: include current hostOnlyControls state for late joiners
        hostOnlyControls: room.hostOnlyControls || false,
      });

      socket.to(roomId).emit('room:user-joined', {
        socketId: socket.id,
        name,
        participants: getParticipants(roomId),
      });

      if (room.hostId && room.hostId !== socket.id) {
        io.to(room.hostId).emit('webrtc:initiate', {
          targetId: socket.id,
          targetName: name,
        });
      }

      logger.info(
        { roomId, socketId: socket.id, name, gender: normalizeGender(gender) },
        'User joined'
      );
    } catch (err) {
      logger.error(
        { roomId: socket.data?.roomId, socketId: socket.id, err: err.message },
        'Error joining room'
      );
      socket.emit('room:error', { message: err.message || 'Failed to join room.' });
    }
  });

  // WebRTC: Offer (host -> viewer)
  socket.on('webrtc:offer', ({ targetId, offer }) => {
    if (!socket.data.roomId || !targetId || !offer) return;
    if (payloadSize(offer) > MAX_SDP_CHARS) return;
    // Validate target is in the same room (prevent cross-room signaling)
    const targetRoom = getRoom(socket.data.roomId);
    if (!targetRoom || !targetRoom.participants.has(socket.id) || !targetRoom.participants.has(targetId)) return;

    io.to(targetId).emit('webrtc:offer', {
      fromId: socket.id,
      offer,
    });
  });

  // WebRTC: Answer (viewer -> host)
  socket.on('webrtc:answer', ({ targetId, answer }) => {
    if (!socket.data.roomId || !targetId || !answer) return;
    if (payloadSize(answer) > MAX_SDP_CHARS) return;
    const targetRoom = getRoom(socket.data.roomId);
    if (!targetRoom || !targetRoom.participants.has(socket.id) || !targetRoom.participants.has(targetId)) return;

    io.to(targetId).emit('webrtc:answer', {
      fromId: socket.id,
      answer,
    });
  });

  // WebRTC: ICE Candidate (both directions)
  socket.on('webrtc:ice', ({ targetId, candidate }) => {
    if (!socket.data.roomId || !targetId) return;
    if (payloadSize(candidate) > MAX_ICE_CHARS) return;
    const targetRoom = getRoom(socket.data.roomId);
    if (!targetRoom || !targetRoom.participants.has(socket.id) || !targetRoom.participants.has(targetId)) return;

    io.to(targetId).emit('webrtc:ice', {
      fromId: socket.id,
      candidate,
    });
  });

  // WebRTC: Stop Stream (host ended the share)
  socket.on('webrtc:stop', ({ roomId }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    io.to(roomId).emit('webrtc:stream-end', { roomId });
  });

  // Sync: Play
  // Phase 2: server-side name (never trust client-sent "name").
  socket.on('sync:play', ({ roomId, currentTime }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    if (currentTime !== undefined && !isMediaTime(currentTime)) return;
    socket.to(roomId).emit('sync:play', { name: m.participant.name, currentTime });
  });

  // Sync: Pause
  socket.on('sync:pause', ({ roomId, currentTime }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    if (currentTime !== undefined && !isMediaTime(currentTime)) return;
    socket.to(roomId).emit('sync:pause', { name: m.participant.name, currentTime });
  });

  // Sync: Seek
  socket.on('sync:seek', ({ roomId, time }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    if (!isMediaTime(time)) return;
    socket.to(roomId).emit('sync:seek', { name: m.participant.name, time });
  });

  // Chat: Typing Indicator
  socket.on('chat:typing', ({ roomId }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    socket.to(roomId).emit('chat:typing', { name: m.participant.name, socketId: socket.id });
  });

  // Chat: Message
  // Phase 2: explicit `enc` flag marks E2EE ciphertext (replaces length heuristic).
  socket.on('chat:message', ({ roomId, text, enc }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    if (!checkSpam(socket)) return;
    if (!text || typeof text !== 'string' || text.length > 500) return;
    if (enc !== undefined && typeof enc !== 'boolean') return;

    const msgId = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    trackChatMessage(msgId, socket.id, roomId);
    const payload = {
      id: msgId,
      name: m.participant.name,
      text,
      enc: enc === true,
      timestamp: Date.now(),
      socketId: socket.id,
    };
    io.to(roomId).emit('chat:message', payload);
    // Task 85: Ack back to sender with message ID
    socket.emit('chat:ack', { msgId });
  });

  // Chat: Delete
  // Phase 1: ownership enforced via server-side map. Host may delete any
  // message; others may delete only their own within 60s (server clock).
  socket.on('chat:delete', ({ roomId, msgId, msgTimestamp }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m || !msgId || !msgTimestamp) return;
    const { room, participant } = m;

    if (!canDeleteMessage(room, socket.id, msgId, msgTimestamp)) return;

    chatOwnership.delete(msgId);
    io.to(roomId).emit('chat:deleted', { msgId, deletedBy: participant.name });
  });

  // Chat: Edit
  // Phase 1: only the original author may edit, within 60s (server clock).
  // Phase 2: `enc` flag passes through so receivers know to decrypt.
  socket.on('chat:edit', ({ roomId, msgId, msgTimestamp, newText, enc }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m || !msgId || !msgTimestamp || !newText || typeof newText !== 'string' || newText.length > 500)
      return;
    if (enc !== undefined && typeof enc !== 'boolean') return;

    const { room, participant } = m;

    if (!canEditMessage(room, socket.id, msgId)) return;

    // Encrypt the edited message if room has a key (client handles this)
    io.to(roomId).emit('chat:edited', {
      msgId,
      newText,
      enc: enc === true,
      editedBy: participant.name,
    });
  });

  // Host: Toggle host-only controls
  socket.on('room:host-only-toggle', ({ roomId, enabled }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    const { room } = m;
    if (room.hostId !== socket.id) return;
    if (typeof enabled !== 'boolean') return;
    // Task 42: persist state on the room object so late joiners get it
    room.hostOnlyControls = enabled;
    io.to(roomId).emit('room:host-only-changed', { enabled: room.hostOnlyControls });
  });

  // Reactions & Laser Pointer
  socket.on('room:reaction', ({ roomId, emoji }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    if (!checkSpam(socket)) return;
    if (!checkReactionRate(socket)) return;
    if (!REACTION_EMOJIS.has(emoji)) return;

    // Use server-side name to prevent impersonation
    const { participant } = m;

    io.to(roomId).emit('room:reaction', {
      name: participant.name,
      emoji,
      id: Date.now() + Math.random(),
    });
  });

  socket.on('sync:pointer', ({ roomId, x, y }) => {
    if (!requireRoomMember(socket, roomId)) return;
    if (!isPointerCoord(x) || !isPointerCoord(y)) return;
    socket.to(roomId).emit('sync:pointer', { x, y });
  });

  socket.on('sync:draw', ({ roomId, stroke }) => {
    if (!requireRoomMember(socket, roomId) || !isValidStroke(stroke)) return;
    socket.to(roomId).emit('sync:draw', { stroke });
  });

  socket.on('sync:clear-draw', ({ roomId }) => {
    if (!requireRoomMember(socket, roomId)) return;
    socket.to(roomId).emit('sync:clear-draw');
  });

  // Host Moderation (Kick)
  socket.on('room:kick', ({ roomId, targetId, ban }) => {
    const m = requireRoomMember(socket, roomId);
    if (!m) return;
    const { room } = m;
    if (room.hostId !== socket.id) return;

    const targetParticipant = room.participants.get(targetId);
    if (!targetParticipant) return;
    const kickedName = targetParticipant.name;

    const result = leaveRoom(roomId, targetId);
    if (!result) return;

    // Opt-in ban (strict boolean) for the room's lifetime, keyed like the other abuse limits. Trade-off: users
    // behind the same NAT share a key, so a ban can block innocent neighbours; hence it is opt-in.
    const victimSock = io.sockets.sockets.get(targetId);
    if (ban === true && victimSock) room.bannedKeys.add(getClientKey(victimSock));

    io.to(targetId).emit('room:kicked');
    // Defense in depth: drop them from the SFU too (their LiveKit identity is their socket id)
    lkAdmin.removeParticipant(`w:${roomId}`, targetId);
    const victim = io.sockets.sockets.get(targetId);
    victim?.leave(roomId);
    // Clear server-side membership so a stale socket.data can't relay signaling
    if (victim && victim.data) {
      victim.data.roomId = null;
      victim.data.role = null;
    }

    io.to(roomId).emit('room:user-left', {
      socketId: targetId,
      name: kickedName,
      participants: getParticipants(roomId),
      newHostId: result.newHostId,
      kicked: true, // host client rotates the media key on a kick
    });

    if (result.newHostId) {
      io.to(result.newHostId).emit('room:promoted-to-host', {
        message: 'You are now the host.',
      });
    }
  });

  // LiveKit token issuance (replaces the open /api/token endpoint)
  // Issued only over an authenticated socket that is already a member (PIN passed). Identity is the socket id, so a
  // tile cannot be claimed by someone else; only the server-recorded host may publish into a watch room.
  socket.on('sfu:token', async (req, ack) => {
    if (typeof ack !== 'function') return;
    const fail = (error) => ack({ error });
    try {
      const { kind, roomId } = req || {};
      if (typeof roomId !== 'string' || (kind !== 'watch' && kind !== 'meet')) return fail('Invalid request');
      if (!checkSpam(socket)) return fail('Too many requests');
      let name;
      let lkRoom;
      let canPublish;
      let metadata = {};
      if (kind === 'watch') {
        const m = requireRoomMember(socket, roomId);
        if (!m) return fail('Not in this room');
        name = m.participant.name;
        lkRoom = `w:${roomId}`;
        canPublish = m.room.hostId === socket.id;
        metadata = { isHost: canPublish, gender: normalizeGender(m.participant.gender) };
      } else {
        const m = requireMeetMember(socket);
        if (!m || m.meetId !== roomId) return fail('Not in this meeting');
        name = m.participant.name;
        lkRoom = `m:${roomId}`;
        canPublish = true;
      }
      const token = await generateLiveKitToken({
        roomId: lkRoom,
        participantName: name,
        participantIdentity: socket.id,
        canPublish,
        canPublishData: false,
        metadata,
      });
      tokenRequests.inc();
      ack({ token, url: process.env.LIVEKIT_URL || LIVEKIT_URL });
    } catch (err) {
      logger.error({ err: err.message }, 'Failed to mint LiveKit token');
      fail('Failed to mint access token');
    }
  });

  // Media E2EE key delivery
  // Server only relays: public keys (so the host can wrap) and wrapped keys (opaque to us).
  const B64 = /^[A-Za-z0-9_-]+$/;
  const okB64 = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max && B64.test(v);

  socket.on('e2ee:hello', ({ roomId, pub } = {}) => {
    const m = requireRoomMember(socket, roomId);
    if (!m || !okB64(pub, 200) || !checkSpam(socket)) return;
    m.participant.e2ePub = pub;
    socket.to(roomId).emit('e2ee:hello', { from: socket.id, pub });
  });

  socket.on('e2ee:rekey', ({ roomId, to, hostPub, iv, ct, epoch } = {}) => {
    const m = requireRoomMember(socket, roomId);
    if (!m || m.room.hostId !== socket.id) return;
    if (typeof to !== 'string' || !m.room.participants.has(to)) return;
    if (!okB64(hostPub, 200) || !okB64(iv, 32) || !okB64(ct, 300)) return;
    // epoch orders rotations so a slow older key can never overwrite a newer one on the receiver
    if (!Number.isInteger(epoch) || epoch < 0 || epoch > 1e9) return;
    io.to(to).emit('e2ee:rekey', { from: socket.id, hostPub, iv, ct, epoch });
  });

  // Transfer Host
  socket.on('room:transfer-host', ({ roomId, newHostId }) => {
    if (!requireRoomMember(socket, roomId)) return;
    if (transferHost(roomId, socket.id, newHostId)) {
      io.to(roomId).emit('room:participants-updated', getParticipants(roomId));
      io.to(newHostId).emit('room:promoted-to-host', {
        message: 'You have been made the new host!',
      });
    }
  });

  // Meet: Join
  socket.on('meet:join', ({ meetId, name, gender, micOn, cameraOn }) => {
    try {
      if (!meetId || typeof meetId !== 'string' || !/^[A-Za-z0-9_-]{1,20}$/.test(meetId)) return;
      if (!name || typeof name !== 'string' || name.length > 30) return;
      if (socket.data.meetId) return;
      if (!roomBindingOk(socket, meetId)) return;
      if (!checkSpam(socket)) {
        socket.emit('room:error', { message: 'Too many requests.' });
        return;
      }

      const existing = getMeet(meetId);
      if (!existing) {
        // First person creates the meet
        createMeet(meetId, socket.id, name, gender, micOn, cameraOn);
        socket.join(meetRoom(meetId));
        socket.data.meetId = meetId;
        socket.emit('meet:joined', {
          meetId,
          participants: getMeetParticipants(meetId),
          isHost: true,
        });
      } else {
        // Join existing meet
        joinMeet(meetId, socket.id, name, gender, micOn, cameraOn);
        socket.join(meetRoom(meetId));
        socket.data.meetId = meetId;

        socket.emit('meet:joined', {
          meetId,
          participants: getMeetParticipants(meetId),
          isHost: false,
        });

        // Notify existing participants
        socket.to(meetRoom(meetId)).emit('meet:user-joined', {
          socketId: socket.id,
          name,
          gender: normalizeGender(gender),
          micOn,
          cameraOn,
        });
      }

      logger.info({ meetId, socketId: socket.id, name }, 'Meet joined');
    } catch (err) {
      logger.error({ meetId, socketId: socket.id, err: err.message }, 'Error joining meet');
      socket.emit('room:error', { message: err.message || 'Failed to join meet.' });
    }
  });

  // Meet: Signal (WebRTC relay)
  socket.on('meet:signal', ({ to, signalData }) => {
    if (!socket.data.meetId || !to || !signalData) return;
    if (payloadSize(signalData) > MAX_SDP_CHARS) return;
    const meet = getMeet(socket.data.meetId);
    if (!meet || !meet.participants.has(socket.id) || !meet.participants.has(to)) return;

    io.to(to).emit('meet:signal', {
      from: socket.id,
      signalData,
    });
  });

  // Meet: State Change (mic/cam/share/hand)
  socket.on('meet:state-change', ({ micOn, cameraOn, isSharing, handRaised }) => {
    const m = requireMeetMember(socket);
    if (!m) return;
    const { meetId, meet, participant } = m;

    if (micOn !== undefined) participant.micOn = !!micOn;
    if (cameraOn !== undefined) participant.cameraOn = !!cameraOn;
    if (isSharing !== undefined) participant.isSharing = !!isSharing;
    if (handRaised !== undefined) participant.handRaised = !!handRaised;
    meet.lastActivityAt = Date.now();

    socket.to(meetRoom(meetId)).emit('meet:state-change', {
      socketId: socket.id,
      micOn: participant.micOn,
      cameraOn: participant.cameraOn,
      isSharing: participant.isSharing,
      handRaised: participant.handRaised,
    });
  });

  // Meet: Reaction
  socket.on('meet:reaction', ({ emoji }) => {
    const m = requireMeetMember(socket);
    if (!m) return;
    if (!checkSpam(socket)) return;
    if (!checkReactionRate(socket)) return;
    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) return;

    const { meetId, participant } = m;

    io.to(meetRoom(meetId)).emit('meet:reaction', {
      from: socket.id,
      name: participant.name,
      emoji,
    });
  });

  // Meet: Chat Message
  socket.on('meet:chat', ({ text }) => {
    const m = requireMeetMember(socket);
    if (!m) return;
    if (!checkSpam(socket)) return;
    if (!text || typeof text !== 'string' || text.length > 500) return;

    const { meetId, meet, participant } = m;
    meet.lastActivityAt = Date.now();

    const msgId = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    io.to(meetRoom(meetId)).emit('meet:chat', {
      id: msgId,
      socketId: socket.id,
      name: participant.name,
      text,
      timestamp: Date.now(),
    });
  });

  // Meet: Leave
  socket.on('meet:leave', () => {
    if (!socket.data.meetId) return;
    const meetId = socket.data.meetId;

    const result = leaveMeet(meetId, socket.id);
    socket.leave(meetRoom(meetId));

    io.to(meetRoom(meetId)).emit('meet:user-left', { socketId: socket.id });

    if (result?.meetClosed) {
      io.to(meetRoom(meetId)).emit('meet:closed', { message: 'Meeting ended.' });
      const sockets = io.sockets.adapter.rooms.get(meetId);
      if (sockets) {
        for (const sid of sockets) {
          const s = io.sockets.sockets.get(sid);
          if (s) s.leave(meetRoom(meetId));
        }
      }
    }

    socket.data.meetId = null;
    logger.info({ meetId, socketId: socket.id }, 'Meet left');
  });

  // Disconnect
  socket.on('disconnect', (reason) => {
    try {
      // Clean up meet room
      const meetFound = findMeetBySocket(socket.id);
      if (meetFound) {
        const { meetId, meet } = meetFound;
        const participant = meet.participants.get(socket.id);
        const meetName = participant?.name || 'Someone';

        const meetResult = leaveMeet(meetId, socket.id);

        io.to(meetRoom(meetId)).emit('meet:user-left', { socketId: socket.id, name: meetName });

        if (meetResult?.meetClosed) {
          io.to(meetRoom(meetId)).emit('meet:closed', { message: 'Meeting ended.' });
          const meetSockets = io.sockets.adapter.rooms.get(meetId);
          if (meetSockets) {
            for (const sid of meetSockets) {
              const s = io.sockets.sockets.get(sid);
              if (s) s.leave(meetRoom(meetId));
            }
          }
        }

        logger.info({ meetId, socketId: socket.id, name: meetName }, 'Meet user left (disconnect)');
      }

      // Clean up watch party room
      const found = findRoomBySocket(socket.id);
      if (!found) return;

      const { roomId, room } = found;
      const participant = room.participants.get(socket.id);
      const name = participant?.name || 'Someone';

      const result = leaveRoom(roomId, socket.id);

      if (result && result.roomClosed) {
        if (result.wasHost) {
          // Tell everyone remaining that the room is closed
          io.to(roomId).emit('room:closed', { message: 'The host has ended the room.' });

          // Force all sockets in the room to leave the Socket.io room channel
          const sockets = io.sockets.adapter.rooms.get(roomId);
          if (sockets) {
            for (const sid of sockets) {
              const s = io.sockets.sockets.get(sid);
              if (s) s.leave(roomId);
            }
          }
        }
      } else if (result && result.room) {
        // Notify remaining participants
        io.to(roomId).emit('room:user-left', {
          socketId: socket.id,
          name,
          participants: getParticipants(roomId),
          newHostId: result.newHostId,
        });

        if (result.newHostId) {
          io.to(result.newHostId).emit('room:promoted-to-host', {
            message: 'You are now the host.',
          });
        }
      }

      logger.info(
        { roomId, socketId: socket.id, name, reason, wasHost: !!result?.wasHost },
        'User left'
      );
    } catch (err) {
      logger.error({ socketId: socket.id, err: err.message }, 'Error handling disconnect');
    }
  });
}

module.exports = { registerHandlers };
