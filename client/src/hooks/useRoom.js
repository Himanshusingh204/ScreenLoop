// ─────────────────────────────────────────────────────────────────────────────
// useRoom.js — Room state: participants, toasts, sync events, chat
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { encryptMessage, decryptMessage } from '../utils/crypto';

/**
 * Manages all room-level state and socket event listeners.
 *
 * @param {object} params
 * @param {import('socket.io-client').Socket|null} params.socket
 * @param {string} params.roomId
 * @param {string} params.myName
 * @param {boolean} params.isHost
 * @param {string} params.roomKey
 * @param {Function} params.onInitiateOffer — host callback when viewer joins
 */
export function useRoom({ socket, roomId, myName, isHost, roomKey, onInitiateOffer }) {
  const [participants, setParticipants] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [hostOnlyControls, setHostOnlyControls] = useState(false);
  const [isActualHost, setIsActualHost] = useState(isHost);
  const toastIdRef = useRef(0);

  // ─── Add a toast notification ─────────────────────────────────────────────
  const addToast = useCallback((text) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text }]);
    // Auto-remove after 3s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // ─── Send a sync event (host only) ────────────────────────────────────────
  const emitSync = useCallback(
    (event, payload) => {
      if (!socket) return;
      socket.emit(event, { roomId, name: myName, ...payload });
    },
    [socket, roomId, myName]
  );

  // ─── Send a chat message ──────────────────────────────────────────────────
  const sendChatMessage = useCallback(
    async (text) => {
      if (!socket || !text.trim()) return;
      
      let payload = text.trim();
      if (roomKey) {
        const encrypted = await encryptMessage(payload, roomKey);
        if (encrypted) payload = encrypted;
      }
      
      socket.emit('chat:message', { roomId, name: myName, text: payload });
    },
    [socket, roomId, myName, roomKey]
  );

  // ─── Delete a chat message ───────────────────────────────────────────────
  const deleteChatMessage = useCallback(
    (msgId, msgTimestamp) => {
      if (!socket) return;
      socket.emit('chat:delete', { roomId, msgId, msgTimestamp });
    },
    [socket, roomId]
  );

  // ─── Edit a chat message ─────────────────────────────────────────────────
  const editChatMessage = useCallback(
    async (msgId, msgTimestamp, newText) => {
      if (!socket || !newText.trim()) return;
      let payload = newText.trim();
      if (roomKey) {
        const encrypted = await encryptMessage(payload, roomKey);
        if (encrypted) payload = encrypted;
      }
      socket.emit('chat:edit', { roomId, msgId, msgTimestamp, newText: payload });
    },
    [socket, roomId, roomKey]
  );

  // ─── Typing indicator ──────────────────────────────────────────────────
  const lastTypingEmit = useRef(0);
  const emitTyping = useCallback(() => {
    if (!socket) return;
    const now = Date.now();
    if (now - lastTypingEmit.current < 2000) return;
    lastTypingEmit.current = now;
    socket.emit('chat:typing', { roomId });
  }, [socket, roomId]);

  // ─── Toggle host-only controls ────────────────────────────────────────────
  const toggleHostOnly = useCallback(
    (enabled) => {
      if (!socket) return;
      socket.emit('room:host-only-toggle', { roomId, enabled });
    },
    [socket, roomId]
  );

  // ─── Typing indicator state ────────────────────────────────────────────
  const [typingUsers, setTypingUsers] = useState({});

  // ─── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onUserJoined = ({ name, participants: p }) => {
      setParticipants(p);
      addToast(`${name} joined the room`);
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now(), system: true, text: `${name} joined the room`, timestamp: Date.now() },
      ]);
    };

    const onUserLeft = ({ name, participants: p, newHostId }) => {
      setParticipants(p);
      addToast(`${name} left the room`);
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now(), system: true, text: `${name} left the room`, timestamp: Date.now() },
      ]);
      if (newHostId) setHostId(newHostId);
    };

    const onSyncPlay = ({ name }) => {
      addToast(`▶️ ${name} resumed playback`);
    };

    const onSyncPause = ({ name }) => {
      addToast(`⏸ ${name} paused the movie`);
    };

    const onSyncSeek = ({ name, time }) => {
      addToast(`⏩ ${name} seeked to ${Math.floor(time)}s`);
    };

    const onChatMessage = async ({ id, name, text, timestamp, socketId }) => {
      let decryptedText = text;
      
      if (roomKey && text.length > 30) {
        const decrypted = await decryptMessage(text, roomKey);
        if (decrypted) {
          decryptedText = decrypted;
        } else {
          decryptedText = '*(Encrypted message)*';
        }
      }

      setChatMessages((prev) => [
        ...prev,
        { id: id || Date.now() + Math.random(), name, text: decryptedText, timestamp, system: false, socketId },
      ]);
    };

    const onChatDeleted = ({ msgId }) => {
      setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
    };

    const onChatEdited = ({ msgId, newText }) => {
      setChatMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: newText, edited: true } : m))
      );
    };

    const onChatTyping = ({ name, socketId }) => {
      setTypingUsers((prev) => ({ ...prev, [socketId]: { name, ts: Date.now() } }));
    };

    const onHostOnlyChanged = ({ enabled }) => {
      setHostOnlyControls(enabled);
      addToast(enabled ? '🔒 Host-only controls enabled' : '🔓 Everyone can control playback');
    };

    const onPromotedToHost = ({ message }) => {
      setIsActualHost(true);
      addToast(`👑 ${message}`);
    };

    const onKicked = () => {
      addToast('🚫 You have been kicked from the room by the host.');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    };

    const onParticipantsUpdated = (p) => {
      setParticipants(p);
    };

    // WebRTC: tell the host to send an offer to a new viewer
    const onInitiate = ({ targetId, targetName }) => {
      if (onInitiateOffer) onInitiateOffer(targetId, targetName);
    };

    socket.on('room:user-joined', onUserJoined);
    socket.on('room:user-left', onUserLeft);
    socket.on('sync:play', onSyncPlay);
    socket.on('sync:pause', onSyncPause);
    socket.on('sync:seek', onSyncSeek);
    socket.on('chat:message', onChatMessage);
    socket.on('chat:deleted', onChatDeleted);
    socket.on('chat:edited', onChatEdited);
    socket.on('chat:typing', onChatTyping);
    socket.on('room:host-only-changed', onHostOnlyChanged);
    socket.on('room:promoted-to-host', onPromotedToHost);
    socket.on('room:participants-updated', onParticipantsUpdated);
    socket.on('room:kicked', onKicked);
    socket.on('webrtc:initiate', onInitiate);

    return () => {
      socket.off('room:user-joined', onUserJoined);
      socket.off('room:user-left', onUserLeft);
      socket.off('sync:play', onSyncPlay);
      socket.off('sync:pause', onSyncPause);
      socket.off('sync:seek', onSyncSeek);
      socket.off('chat:message', onChatMessage);
      socket.off('chat:deleted', onChatDeleted);
      socket.off('chat:edited', onChatEdited);
      socket.off('chat:typing', onChatTyping);
      socket.off('room:host-only-changed', onHostOnlyChanged);
      socket.off('room:promoted-to-host', onPromotedToHost);
      socket.off('room:participants-updated', onParticipantsUpdated);
      socket.off('room:kicked', onKicked);
      socket.off('webrtc:initiate', onInitiate);
    };
  }, [socket, addToast, onInitiateOffer, roomKey]);

  return {
    participants,
    setParticipants,
    hostId,
    setHostId,
    toasts,
    chatMessages,
    typingUsers,
    hostOnlyControls,
    setHostOnlyControls,
    isActualHost,
    emitSync,
    sendChatMessage,
    deleteChatMessage,
    editChatMessage,
    emitTyping,
    toggleHostOnly,
    addToast,
  };
}
