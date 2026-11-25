// useMediaKeyRotation.js — runs a MediaKeyCoordinator for the lifetime of a room connection.
import { useEffect, useRef } from 'react';
import { MediaKeyCoordinator } from '../utils/mediaKeyCoordinator';

/**
 * @param {{socket:any, roomId:string, roomKey:string, enabled:boolean, isHost:boolean,
 *   applyKey:(key:string, epoch:number)=>Promise<void>, keyStateRef:{current:{key:string|null, epoch:number}}, participants:any[]}} p
 */
export function useMediaKeyRotation({ socket, roomId, roomKey, enabled, isHost, applyKey, keyStateRef, participants }) {
  const hostRef = useRef(isHost);
  const applyRef = useRef(applyKey);
  const coordRef = useRef(null);
  hostRef.current = isHost;
  applyRef.current = applyKey;

  useEffect(() => {
    if (!enabled || !socket || !roomId || !roomKey) return undefined;
    const c = new MediaKeyCoordinator({
      socket,
      roomId,
      roomKey,
      isHost: () => hostRef.current,
      applyKey: (k, epoch) => applyRef.current(k, epoch),
      // Carry the rotated key across a LiveKit rebuild (e.g. promotion to host) so the coordinator keeps serving it
      initialKey: keyStateRef?.current?.key ?? null,
      initialEpoch: keyStateRef?.current?.epoch ?? 0,
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
  }, [socket, roomId, roomKey, enabled, keyStateRef]);

  useEffect(() => {
    coordRef.current?.seed(participants);
  }, [participants]);
}
