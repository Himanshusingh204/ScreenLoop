// ─────────────────────────────────────────────────────────────────────────────
// socketHandlers.js — All Socket.io event handlers
// Handles: room join/leave, WebRTC signaling, playback sync, chat
// ─────────────────────────────────────────────────────────────────────────────

const {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  findRoomBySocket,
  getParticipants,
  transferHost,
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
  // ─── Room: Create ───────────────────────────────────────────────────────────
  socket.on('room:create', ({ roomId, name, pin, gender }) => {
    try {
      if (!roomId || typeof roomId !== 'string' || roomId.length > 20) return;
      if (!name || typeof name !== 'string' || name.length > 30) return;
      if (pin && (typeof pin !== 'string' || pin.length > 20)) return;
      const validGender = ['male', 'female', 'other'].includes(gender) ? gender : 'other';

      const existing = getRoom(roomId);
      if (existing) {
        socket.emit('room:error', { message: 'Room already exists.' });
        return;
      }

      const room = createRoom(roomId, socket.id, name, pin, validGender);
      socket.join(roomId);

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
  socket.on('room:join', ({ roomId, name, pin, gender }) => {
    try {
      if (!roomId || typeof roomId !== 'string' || roomId.length > 20) return;
      if (!name || typeof name !== 'string' || name.length > 30) return;
      if (pin && (typeof pin !== 'string' || pin.length > 20)) return;
      const validGender = ['male', 'female', 'other'].includes(gender) ? gender : 'other';

      if (!checkPinBruteForce(socket.id)) {
        socket.emit('room:error', { message: 'Too many failed PIN attempts. Try again in 5 minutes.' });
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found. Check the link and try again.' });
        return;
      }

      // joinRoom will throw an error if the PIN is incorrect
      try {
        joinRoom(roomId, socket.id, name, pin, validGender);
        resetFailedPin(socket.id);
      } catch (e) {
        if (e.message === 'Incorrect PIN') {
          recordFailedPin(socket.id);
        }
        throw e;
      }
      
      socket.join(roomId);

      // Tell the new joiner about the room state
      socket.emit('room:joined', {
        roomId,
        participants: getParticipants(roomId),
        isHost: false,
        hostId: room.hostId,
      });

      // Tell everyone else a new user joined
      socket.to(roomId).emit('room:user-joined', {
        socketId: socket.id,
        name,
        participants: getParticipants(roomId),
      });

      // Ask the host to initiate WebRTC offer to the new joiner
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

  // ─── WebRTC: Offer (host → viewer) ──────────────────────────────────────────
  socket.on('webrtc:offer', ({ targetId, offer }) => {
    io.to(targetId).emit('webrtc:offer', {
      fromId: socket.id,
      offer,
    });
  });

  // ─── WebRTC: Answer (viewer → host) ─────────────────────────────────────────
  socket.on('webrtc:answer', ({ targetId, answer }) => {
    io.to(targetId).emit('webrtc:answer', {
      fromId: socket.id,
      answer,
    });
  });

  // ─── WebRTC: ICE Candidate (both directions) ─────────────────────────────────
  socket.on('webrtc:ice', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc:ice', {
      fromId: socket.id,
      candidate,
    });
  });

  // ─── Sync: Play ─────────────────────────────────────────────────────────────
  socket.on('sync:play', ({ roomId, name, currentTime }) => {
    socket.to(roomId).emit('sync:play', { name, currentTime });
    console.log(`[sync:play] ${name} in ${roomId} at ${currentTime}s`);
  });

  // ─── Sync: Pause ────────────────────────────────────────────────────────────
  socket.on('sync:pause', ({ roomId, name, currentTime }) => {
    socket.to(roomId).emit('sync:pause', { name, currentTime });
    console.log(`[sync:pause] ${name} in ${roomId} at ${currentTime}s`);
  });

  // ─── Sync: Seek ─────────────────────────────────────────────────────────────
  socket.on('sync:seek', ({ roomId, name, time }) => {
    socket.to(roomId).emit('sync:seek', { name, time });
    console.log(`[sync:seek] ${name} in ${roomId} to ${time}s`);
  });

  // ─── Chat: Message ───────────────────────────────────────────────────────────
  socket.on('chat:message', ({ roomId, name, text }) => {
    if (!checkSpam(socket.id)) return;
    if (!text || typeof text !== 'string' || text.length > 500) return;
    if (!name || typeof name !== 'string' || name.length > 30) return;

    const payload = { name, text, timestamp: Date.now() };
    // Broadcast to everyone in the room including sender
    io.to(roomId).emit('chat:message', payload);
  });

  // ─── Host: Toggle host-only controls ────────────────────────────────────────
  socket.on('room:host-only-toggle', ({ roomId, enabled }) => {
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;
    io.to(roomId).emit('room:host-only-changed', { enabled });
  });

  // ─── Reactions & Laser Pointer ───────────────────────────────────────────────
  socket.on('room:reaction', ({ roomId, name, emoji }) => {
    if (!checkSpam(socket.id)) return;
    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) return;
    
    io.to(roomId).emit('room:reaction', { name, emoji, id: Date.now() + Math.random() });
  });

  socket.on('sync:pointer', ({ roomId, x, y }) => {
    socket.to(roomId).emit('sync:pointer', { x, y });
  });

  socket.on('sync:draw', ({ roomId, stroke }) => {
    if (!roomId || !stroke) return;
    socket.to(roomId).emit('sync:draw', { stroke });
  });

  socket.on('sync:clear-draw', ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('sync:clear-draw');
  });

  // ─── Host Moderation (Kick) ─────────────────────────────────────────────────
  socket.on('room:kick', ({ roomId, targetId }) => {
    const room = getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;

    // Remove them from the room
    const result = leaveRoom(roomId, targetId);
    if (!result) return;

    // Tell the target they were kicked
    io.to(targetId).emit('room:kicked');
    // Forcibly remove socket from the Socket.io room
    io.sockets.sockets.get(targetId)?.leave(roomId);

    // Update remaining participants
    io.to(roomId).emit('room:user-left', {
      socketId: targetId,
      name: 'Someone', // Could look up their name from the room state before removing
      participants: getParticipants(roomId),
      newHostId: null,
    });
  });

  // ─── Transfer Host ──────────────────────────────────────────────────────────
  socket.on('room:transfer-host', ({ roomId, newHostId }) => {
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

      if (result && result.room) {
        // Notify remaining participants
        io.to(roomId).emit('room:user-left', {
          socketId: socket.id,
          name,
          participants: getParticipants(roomId),
          newHostId: result.newHostId,
        });

        // If a new host was promoted, notify them
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
