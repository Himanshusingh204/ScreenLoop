// ParticipantList.jsx — List of room participants & host moderation controls
import React, { memo } from 'react';
import { Crown, Trash } from './icons';

/**
 * @param {object} props
 * @param {Array<{socketId: string, name: string, isHost: boolean}>} props.participants
 * @param {string} props.mySocketId
 * @param {boolean} props.isActualHost
 * @param {Function} props.onKick
 * @param {Function} props.onTransferHost
 */
export const ParticipantList = memo(function ParticipantList({
  participants,
  mySocketId,
  isActualHost,
  onKick,
  onTransferHost,
}) {
  return (
    <div className="participant-list" role="list" aria-label="Room Participants">
      {participants.length === 0 && (
        <div className="participant-empty-state">
          <p>No participants yet</p>
        </div>
      )}
      {participants.map((p) => {
        const isMe = p.socketId === mySocketId;
        return (
          <div key={p.socketId} className="participant-item" role="listitem">
            {/* Avatar */}
            <img
              className="avatar"
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name)}`}
              alt={`${p.name} avatar`}
              title={p.name}
              style={{ background: avatarColor(p.name), objectFit: 'cover' }}
            />

            {/* Name */}
            <span className="participant-name" title={p.name}>
              {p.name}
              {isMe && <span className="participant-you"> (you)</span>}
            </span>

            {/* Host badge */}
{p.isHost && (
              <span className="badge badge-accent" title="Room Host">
                <Crown size={12} /> Host
              </span>
            )}

            {/* Moderation Controls (Host only) */}
            {isActualHost && !p.isHost && !isMe && (
              <div className="participant-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm mod-btn"
                  onClick={() => {
                    if (window.confirm(`Make ${p.name} the new host?`)) {
                      onTransferHost(p.socketId);
                    }
                  }}
                  title="Transfer Host Privileges"
                  aria-label={`Make ${p.name} the new host`}
                >
                  <Crown size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm mod-btn mod-btn-danger"
                  onClick={() => {
                    if (window.confirm(`Kick ${p.name} from the room?`)) {
                      onKick(p.socketId);
                    }
                  }}
                  title="Kick User"
                  aria-label={`Kick ${p.name} from the room`}
                >
                  <Trash size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

/** Generate a deterministic harmonious color from a name string */
function avatarColor(name) {
  const colors = [
    '#7c5cfc', '#9333ea', '#06b6d4', '#10b981',
    '#f59e0b', '#f97316', '#3b82f6', '#ec4899',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
