// ReactionOverlay.jsx — Floating emoji reaction cascade
import React, { useState, useEffect } from 'react';

/**
 * @param {object} props
 * @param {import('socket.io-client').Socket} props.socket
 */
export function ReactionOverlay({ socket }) {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const onReaction = ({ emoji, id }) => {
      const reactionId = id || Date.now() + Math.random();
      // Pick random horizontal percentage (15% to 85%) and slight rotation
      const left = 15 + Math.random() * 70;
      const rotate = (Math.random() - 0.5) * 30; // -15deg to +15deg

      const newReaction = { id: reactionId, emoji, left, rotate };
      setReactions((prev) => [...prev, newReaction]);

      // Remove after animation completes (2.5s)
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reactionId));
      }, 2500);
    };

    socket.on('room:reaction', onReaction);
    return () => socket.off('room:reaction', onReaction);
  }, [socket]);

  return (
    <div className="reaction-overlay" style={{ pointerEvents: 'none' }} aria-live="polite" aria-relevant="additions">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="floating-emoji"
          style={{
            left: `${r.left}%`,
            transform: `rotate(${r.rotate}deg)`,
          }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
}
