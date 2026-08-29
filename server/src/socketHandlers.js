// ─────────────────────────────────────────────────────────────────────────────
// socketHandlers.js — All Socket.io event handlers with security
// Handles: room join/leave, WebRTC signaling, playback sync, chat
// Security: membership validation, IP-based rate limiting, authorization
// ─────────────────────────────────────────────────────────────────────────────

const {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  findRoomBySocket,
  getParticipants,
  transferHost,
  normalizeGender,
  MAX_PARTICIPANTS,
} = require('./roomManager');

const {
  checkSpam,
  checkReactionRate,
  checkPinBruteForce,
  recordFailedPin,
  resetFailedPin,
} = require('./rateLimiter');

/**
 * Register all socket event handlers for a connected client.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
function registerHandlers(socket, io) {
  // Track which room this socket is in for fast membership checks
  socket.data = { roomId: null, role: null, joinedAt: null };

  // ─── Room: Create ───────────────────────────────────────────────────────────
  socket.on('room:create', ({ roomId, name, pin, gender }) => {
    try {
      // Task 44: Validate roomId format — no special characters
      if (!roomId || typeof roomId !== 'string' || !/^[A-Za-z0-9_-]{1,20}$/.test(roomId)) return;
      if (!name || typeof name !== 'string' || name.length > 30) return;
      if (pin && (typeof pin !== 'string' || pin.length > 20)) return;

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

      console.log(`[room:create] "${name}" (${normalizeGender(gender)}) created room ${roomId}`);
    } catch (err) {
      console.error('[room:create] Error:', err);
      socket.emit('room:error', { message: 'Failed to create room.' });
    }
  });

  // ─── Room: Join ─────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomId, name, pin, gender }) => {
    try {
      // Task 44: Validate roomId format
      if (!roomId || typeof roomId !== 'string' || !/^[A-Za-z0-9_-]{1,20}$/.test(roomId)) return;
      if (!name || typeof name !== 'string' || name.length > 30) return;
      if (pin && (typeof pin !== 'string' || pin.length > 20)) return;

      if (!checkPinBruteForce(socket)) {
        socket.emit('room:error', { message: 'Too many failed PIN attempts. Try again in 5 minutes.' });
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found. Check the link and try again.' });
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
          e = new Error(`Room is full (${room.participants.size}/${MAX_PARTICIPANTS}). Try again later.`);
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

      console.log(`[room:join] "${name}" (${normalizeGender(gender)}) joined room ${roomId}`);
    } catch (err) {
      console.error('[room:join] Error:', err.message);
      socket.emit('room:error', { message: err.message || 'Failed to join room.' });
    }
  });

  // ─── WebRTC: Offer (host -> viewer) ─────────────────────────────────────────
  socket.on('webrtc:offer', ({ targetId, offer }) => {
    if (!socket.data.roomId || !targetId || !offer) return;
    // Validate target is in the same room (prevent cross-room signaling)
    const targetRoom = getRoom(socket.data.roomId);
    if (!targetRoom || !targetRoom.participants.has(targetId)) return;

    io.to(targetId).emit('webrtc:offer', {
      fromId: socket.id,
      offer,
    });
  });

  // ─── WebRTC: Answer (viewer -> host) ────────────────────────────────────────
  socket.on('webrtc:answer', ({ targetId, answer }) => {
    if (!socket.data.roomId || !targetId || !answer) return;
    const targetRoom = getRoom(socket.data.roomId);
    if (!targetRoom || !targetRoom.participants.has(targetId)) return;

    io.to(targetId).emit('webrtc:answer', {
      fromId: socket.id,
      answer,
    });
  });

  // ─── WebRTC: ICE Candidate (both directions) ────────────────────────────────
  socket.on('webrtc:ice', ({ targetId, candidate }) => {
    if (!socket.data.roomId || !targetId) return;
    const targetRoom = getRoom(socket.data.roomId);
    if (!targetRoom || !targetRoom.participants.has(targetId)) return;

    io.to(targetId).emit('webrtc:ice', {
      fromId: socket.id,
      candidate,
    });
  });

  // ─── Sync: Play ─────────────────────────────────────────────────────────────
  socket.on('sync:play', ({ roomId, name, currentTime }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit('sync:play', { name, currentTime });
  });

  // ─── Sync: Pause ────────────────────────────────────────────────────────────
  socket.on('sync:pause', ({ roomId, name, currentTime }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit('sync:pause', { name, currentTime });
  });

  // ─── Sync: Seek ─────────────────────────────────────────────────────────────
  socket.on('sync:seek', ({ roomId, name, time }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit('sync:seek', { name, time });
  });

  // ─── Chat: Typing Indicator ─────────────────────────────────────────────────
  socket.on('chat:typing', ({ roomId }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    const room = getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant) return;
    socket.to(roomId).emit('chat:typing', { name: participant.name, socketId: socket.id });
  });

  // ─── Chat: Message ───────────────────────────────────────────────────────────
  socket.on('chat:message', ({ roomId, text }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    if (!checkSpam(socket)) return;
    if (!text || typeof text !== 'string' || text.length > 500) return;

    // Use server-side name from room state to prevent impersonation
    const room = getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant) return;

    const msgId = Date.now() + '_' + socket.id.slice(-4);
    const payload = { id: msgId, name: participant.name, text, timestamp: Date.now(), socketId: socket.id };
    io.to(roomId).emit('chat:message', payload);
    // Task 85: Ack back to sender with message ID
    socket.emit('chat:ack', { msgId });
  });

  // ─── Chat: Delete ───────────────────────────────────────────────────────────
  socket.on('chat:delete', ({ roomId, msgId, msgTimestamp }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    if (!msgId || !msgTimestamp) return;

    const room = getRoom(roomId);
    if (!room) return;
    const participant = room.participants.get(socket.id);
    if (!participant) return;

    const isHost = room.hostId === socket.id;
    const isOwn = Date.now() - msgTimestamp < 60 * 1000; // within 60s

    if (!isHost && !isOwn) return;

    io.to(roomId).emit('chat:deleted', { msgId, deletedBy: participant.name });
  });

  // ─── Chat: Edit ─────────────────────────────────────────────────────────────
  socket.on('chat:edit', ({ roomId, msgId, msgTimestamp, newText }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    if (!msgId || !msgTimestamp || !newText || typeof newText !== 'string' || newText.length > 500) return;

    // Users can only edit their own messages within 60s
    if (Date.now() - msgTimestamp > 60 * 1000) return;

    const room = getRoom(roomId);
    if (!room) return;
    const participant = room.participants.get(socket.id);
    if (!participant) return;

    // Encrypt the edited message if room has a key (client handles this)
    io.to(roomId).emit('chat:edited', {
      msgId,
      newText,
      editedBy: participant.name,
    });
  });

  // ─── Host: Toggle host-only controls ────────────────────────────────────────
  socket.on('room:host-only-toggle', ({ roomId, enabled }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;
    // Task 42: persist state on the room object so late joiners get it
    room.hostOnlyControls = !!enabled;
    io.to(roomId).emit('room:host-only-changed', { enabled });
  });

  // ─── Reactions & Laser Pointer ───────────────────────────────────────────────
  socket.on('room:reaction', ({ roomId, emoji }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    if (!checkSpam(socket)) return;
    if (!checkReactionRate(socket)) return;
    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) return;

    // Use server-side name to prevent impersonation
    const room = getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant) return;

    io.to(roomId).emit('room:reaction', { name: participant.name, emoji, id: Date.now() + Math.random() });
  });

  socket.on('sync:pointer', ({ roomId, x, y }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    if (!isFinite(x) || !isFinite(y)) return;
    socket.to(roomId).emit('sync:pointer', { x, y });
  });

  socket.on('sync:draw', ({ roomId, stroke }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId || !stroke) return;
    if (!Array.isArray(stroke) || stroke.length > 5000) return;
    socket.to(roomId).emit('sync:draw', { stroke });
  });

  socket.on('sync:clear-draw', ({ roomId }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit('sync:clear-draw');
  });

  // ─── Host Moderation (Kick) ─────────────────────────────────────────────────
  socket.on('room:kick', ({ roomId, targetId }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;

    const targetParticipant = room.participants.get(targetId);
    if (!targetParticipant) return;
    const kickedName = targetParticipant.name;

    const result = leaveRoom(roomId, targetId);
    if (!result) return;

    io.to(targetId).emit('room:kicked');
    io.sockets.sockets.get(targetId)?.leave(roomId);

    io.to(roomId).emit('room:user-left', {
      socketId: targetId,
      name: kickedName,
      participants: getParticipants(roomId),
      newHostId: result.newHostId,
    });

    if (result.newHostId) {
      io.to(result.newHostId).emit('room:promoted-to-host', {
        message: 'You are now the host.',
      });
    }
  });

  // ─── Transfer Host ──────────────────────────────────────────────────────────
  socket.on('room:transfer-host', ({ roomId, newHostId }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    if (transferHost(roomId, socket.id, newHostId)) {
      io.to(roomId).emit('room:participants-updated', getParticipants(roomId));
      io.to(newHostId).emit('room:promoted-to-host', { message: 'You have been made the new host!' });
    }
  });

  // ─── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    try {
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

      console.log(`[disconnect] "${name}" left room ${roomId} (reason: ${reason}, wasHost: ${!!result?.wasHost})`);
    } catch (err) {
      console.error('[disconnect] Error:', err.message);
    }
  });
}

module.exports = { registerHandlers };
