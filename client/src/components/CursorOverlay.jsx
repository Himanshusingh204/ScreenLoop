// CursorOverlay.jsx — Non-blocking laser pointer overlay
import React, { useState, useEffect, useRef } from 'react';

/**
 * @param {object} props
 * @param {import('socket.io-client').Socket} props.socket
 * @param {boolean} props.isHost
 * @param {string} props.roomId
 */
export function CursorOverlay({ socket, isHost, roomId }) {
  const [remotePos, setRemotePos] = useState(null);
  const lastEmitRef = useRef(0);

  // Viewer: receive pointer sync
  useEffect(() => {
    if (!socket || isHost) return;
    const onPointer = ({ x, y }) => setRemotePos({ x, y });
    socket.on('sync:pointer', onPointer);
    return () => socket.off('sync:pointer', onPointer);
  }, [socket, isHost]);

  // Host: capture pointer non-intrusively from parent video container
  useEffect(() => {
    if (!isHost || !socket) return;

    const target = document.querySelector('.room-video-area');
    if (!target) return;

    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastEmitRef.current < 40) return; // ~25 fps throttle
      lastEmitRef.current = now;

      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        socket.emit('sync:pointer', { roomId, x, y });
      }
    };

    const handleMouseLeave = () => {
      socket.emit('sync:pointer', { roomId, x: -1, y: -1 });
    };

    target.addEventListener('mousemove', handleMouseMove, { passive: true });
    target.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      target.removeEventListener('mousemove', handleMouseMove);
      target.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [socket, isHost, roomId]);

  return (
    <div className="cursor-overlay" style={{ pointerEvents: 'none' }}>
      {!isHost && remotePos && remotePos.x >= 0 && remotePos.y >= 0 && (
        <div
          className="shared-pointer"
          style={{
            left: `${remotePos.x * 100}%`,
            top: `${remotePos.y * 100}%`,
          }}
        />
      )}
    </div>
  );
}
