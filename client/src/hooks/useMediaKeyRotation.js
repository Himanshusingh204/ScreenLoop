// useMediaKeyRotation.js — runs a MediaKeyCoordinator for the lifetime of a room connection.
import { useEffect, useRef } from 'react';
import { MediaKeyCoordinator } from '../utils/mediaKeyCoordinator';

export function useMediaKeyRotation({ socket, roomId, enabled, isHost, applyKey, participants }) {
  const hostRef = useRef(isHost);
  const applyRef = useRef(applyKey);
  const coordRef = useRef(null);
  hostRef.current = isHost;
  applyRef.current = applyKey;

  useEffect(() => {
    if (!enabled || !socket || !roomId) return undefined;
    const c = new MediaKeyCoordinator({
      socket,
      roomId,
      isHost: () => hostRef.current,
      applyKey: (k) => applyRef.current(k),
    });
    coordRef.current = c;
    const hello = () => c.start().catch((e) => console.warn('[e2ee] key setup failed:', e));
    hello();
    // A reconnect gives a new socket id and a fresh server-side participant: advertise our key again
    socket.on('connect', hello);
    return () => {
      socket.off('connect', hello);
      c.stop();
      coordRef.current = null;
    };
  }, [socket, roomId, enabled]);

  useEffect(() => {
    coordRef.current?.seed(participants);
  }, [participants]);
}
