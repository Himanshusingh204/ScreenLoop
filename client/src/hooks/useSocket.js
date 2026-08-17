// ─────────────────────────────────────────────────────────────────────────────
// useSocket.js — Manages the Socket.io connection lifecycle
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

/**
 * Returns a stable socket instance for the lifetime of the component tree.
 * The socket is lazily created and auto-reconnects.
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] connect error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected, socketRef };
}
