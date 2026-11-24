// useSignalingSocket.js — Single Socket.IO connection manager (Phase 2)
// Unifies Room.jsx + MeetRoom.jsx connection boilerplate so fixes apply once.
// Owns: connect, connected flag, reconnect backoff state, cleanup.
// Does NOT own room/meet join logic — callers attach their own listeners.

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const DEFAULT_TRANSPORTS = ['websocket', 'polling'];

export function useSignalingSocket(
  url,
  options = {}
) {
  const {
    transports = DEFAULT_TRANSPORTS,
    reconnection = true,
    reconnectionDelay = 1000,
    reconnectionAttempts = 15,
    onReconnectFailedMessage = '❌ Could not reconnect. Please refresh.',
    onReconnectFailed = null,
  } = options;

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const socketRef = useRef(null);
  const failedCbRef = useRef(onReconnectFailed);
  failedCbRef.current = onReconnectFailed;
  // Keep latest callbacks in refs so the socket effect doesn't re-run per render
  const onReconnectFailedMessageRef = useRef(onReconnectFailedMessage);
  useEffect(() => {
    onReconnectFailedMessageRef.current = onReconnectFailedMessage;
  }, [onReconnectFailedMessage]);
  const transportsKey = Array.isArray(transports) ? transports.join(',') : String(transports);

  useEffect(() => {
    if (!url) return undefined;

    const s = io(url, {
      reconnection,
      reconnectionDelay,
      reconnectionAttempts,
      transports: transportsKey ? transportsKey.split(',') : DEFAULT_TRANSPORTS,
    });
    socketRef.current = s;
    setSocket(s);

    const handleConnect = () => {
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempt(0);
    };
    const handleDisconnect = () => setConnected(false);
    const handleAttempt = (attempt) => {
      setReconnecting(true);
      setReconnectAttempt(attempt);
    };
    const handleReconnect = () => {
      setReconnecting(false);
      setReconnectAttempt(0);
    };
    const handleFailed = () => {
      setReconnecting(false);
      if (failedCbRef.current) failedCbRef.current(onReconnectFailedMessageRef.current);
    };
    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);
    // socket.io-client emits 'reconnect_attempt' / 'reconnect' / 'reconnect_failed'
    s.on('reconnect_attempt', handleAttempt);
    s.on('reconnect', handleReconnect);
    s.on('reconnect_failed', handleFailed);

    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.off('reconnect_attempt', handleAttempt);
      s.off('reconnect', handleReconnect);
      s.off('reconnect_failed', handleFailed);
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [url, reconnection, reconnectionDelay, reconnectionAttempts, transportsKey]);

  const disconnect = useCallback(() => {
    const s = socketRef.current;
    if (s) s.disconnect();
  }, []);

  return {
    socket,
    socketRef,
    connected,
    reconnecting,
    reconnectAttempt,
    setReconnecting,
    setReconnectAttempt,
    disconnect,
  };
}
