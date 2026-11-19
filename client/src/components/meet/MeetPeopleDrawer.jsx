import React from 'react';
import { X, Crown } from '../icons';

export default function MeetPeopleDrawer({ participants, onClose }) {
  return (
    <>
      <div className="meet-drawer-overlay" onClick={onClose} />
      <div className="meet-drawer open">
        <div className="meet-drawer-header">
          <h3>People ({participants.length})</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close people panel">
            <X size={20} />
          </button>
        </div>

        <div className="meet-drawer-body">
          {participants.map((p, i) => (
            <div key={p.socketId || i} className="meet-person">
              <div className="meet-person-avatar">
                {p.name ? p.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="meet-person-info">
                <div className="meet-person-name">
                  {p.name || 'Unknown'}
                  {p.isSelf && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (You)</span>}
                </div>
                <div className="meet-person-status">
                  {!p.micOn && '🔇 Mic off'}
                  {!p.cameraOn && ' • 📷 Cam off'}
                  {p.isSharing && ' • 🖥 Sharing'}
                </div>
              </div>
              {p.handRaised && (
                <span className="meet-person-hand" title="Hand raised">✋</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
