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
  MAX_PARTICIPANTS,
} = require('./roomManager');

const {
  checkSpam,
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
  socket.on('room:create', ({ roomId, name, pin }) => {
    try {
      if (!roomId || typeof roomId !== 'string' || roomId.length > 20) return;
      if (!name || typeof name !== 'string' || name.length > 30) return;
      if (pin && (typeof pin !== 'string' || pin.length > 20)) return;

      const existing = getRoom(roomId);
      if (existing) {
        socket.emit('room:error', { message: 'Room already exists.' });
        return;
      }

      const room = createRoom(roomId, socket.id, name, pin);
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = 'host';
      socket.data.joinedAt = Date.now();

      socket.emit('room:joined', {
        roomId,
        participants: getParticipants(roomId),
        isHost: true,
        hostId: room.hostId,
      });

      console.log(`[room:create] "${name}" created room ${roomId}`);
    } catch (err) {
      console.error('[room:create] Error:', err);
      socket.emit('room:error', { message: 'Failed to create room.' });
    }
  });

  // ─── Room: Join ─────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomId, name, pin }) => {
    try {
      if (!roomId || typeof roomId !== 'string' || roomId.length > 20) return;
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
        joinRoom(roomId, socket.id, name, pin);
        resetFailedPin(socket);
      } catch (e) {
        if (e.message === 'Incorrect PIN') {
          recordFailedPin(socket);
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

      console.log(`[room:join] "${name}" joined room ${roomId}`);
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

  // ─── Chat: Message ───────────────────────────────────────────────────────────
  socket.on('chat:message', ({ roomId, text }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    if (!checkSpam(socket)) return;
    if (!text || typeof text !== 'string' || text.length > 500) return;

    // Use server-side name from room state to prevent impersonation
    const room = getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant) return;

    const payload = { name: participant.name, text, timestamp: Date.now() };
    io.to(roomId).emit('chat:message', payload);
  });

  // ─── Host: Toggle host-only controls ────────────────────────────────────────
  socket.on('room:host-only-toggle', ({ roomId, enabled }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;
    io.to(roomId).emit('room:host-only-changed', { enabled });
  });

  // ─── Reactions & Laser Pointer ───────────────────────────────────────────────
  socket.on('room:reaction', ({ roomId, emoji }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    if (!checkSpam(socket)) return;
    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) return;

    // Use server-side name to prevent impersonation
    const room = getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant) return;

    io.to(roomId).emit('room:reaction', { name: participant.name, emoji, id: Date.now() + Math.random() });
  });

  socket.on('sync:pointer', ({ roomId, x, y }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit('sync:pointer', { x, y });
  });

  socket.on('sync:draw', ({ roomId, stroke }) => {
    if (!socket.data.roomId || socket.data.roomId !== roomId || !stroke) return;
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

      console.log(`[disconnect] "${name}" left room ${roomId} (${reason})`);
    } catch (err) {
      console.error('[disconnect] Error:', err);
    }
  });
}

module.exports = { registerHandlers };
