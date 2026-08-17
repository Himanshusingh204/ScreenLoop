// TopBar.jsx — Room metadata header, stream health telemetry & navigation
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeSelector } from './ThemeSelector';
import { ConfirmModal } from './ConfirmModal';
import { FilmStrip, ShareNetwork, Users } from './icons';

/**
 * @param {object} props
 * @param {string} props.roomId
 * @param {string} props.roomKey
 * @param {number} props.participantCount
 * @param {boolean} props.connected
 * @param {string} [props.streamQuality] - 'good' | 'fair' | 'poor'
 * @param {boolean} props.sidebarOpen
 * @param {Function} props.onToggleSidebar
 * @param {Function} props.onOpenShare
 * @param {boolean} props.isHost
 */
export function TopBar({
  roomId,
  roomKey,
  participantCount,
  connected,
  streamQuality = 'good',
  sidebarOpen,
  onToggleSidebar,
  onOpenShare,
  isHost,
}) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const getQualityBadge = () => {
    if (!connected) return { label: 'Offline', color: 'var(--danger)' };
    switch (streamQuality) {
      case 'good': return { label: 'HD Direct', color: 'var(--success)' };
      case 'fair': return { label: 'Fair Link', color: 'var(--warning)' };
      case 'poor': return { label: 'Unstable', color: 'var(--danger)' };
      default: return { label: 'Connected', color: 'var(--success)' };
    }
  };

  const badge = getQualityBadge();

  const handleLeave = () => {
    setConfirmOpen(false);
    navigate('/');
  };

  return (
    <header className="topbar" role="banner">
      {/* Brand */}
      <Link
        to="/"
        className="topbar-brand-btn"
        aria-label="Screenloop Home"
      >
        <FilmStrip size={20} weight="bold" className="topbar-brand-icon" />
        <span className="topbar-brand-title">Screenloop</span>
      </Link>

      {/* Room info */}
      <div className="topbar-room-info">
        <span className="topbar-room-id" title={`Room ID: ${roomId}`}>
          #{roomId}
        </span>

        {/* Quality status badge */}
        <div
          className="topbar-quality-badge"
          style={{ borderColor: `${badge.color}44`, color: badge.color }}
          title={`Network link health: ${badge.label}`}
          role="status"
          aria-label={`Stream link status: ${badge.label}`}
        >
          <span className="status-dot-sm" style={{ background: badge.color }} aria-hidden="true" />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        <div className="theme-toggle-wrapper">
          <ThemeSelector />
        </div>

        {/* Open Share / QR Code Modal */}
        <button
          id="share-modal-btn"
          type="button"
          className="btn btn-secondary btn-sm invite-btn-pulse"
          onClick={onOpenShare}
          title="Share Room / Scan QR Code"
          aria-label="Share room invite link or QR code"
        >
          <ShareNetwork size={16} /> Invite
        </button>

        {/* Participants + sidebar toggle */}
        <button
          id="sidebar-toggle-btn"
          type="button"
          className={`btn btn-ghost btn-sm ${sidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Toggle chat & participants sidebar"
          aria-label={`Toggle sidebar, ${participantCount} active participants`}
          aria-expanded={sidebarOpen}
        >
          <Users size={18} />
          <span style={{ fontWeight: 700 }}>{participantCount}</span>
        </button>

        {/* Leave Room */}
        <button
          type="button"
          className="btn btn-sm leave-room-btn"
          onClick={() => setConfirmOpen(true)}
          title={isHost ? "Stop Room" : "Leave Watch Room"}
          aria-label={isHost ? "Stop Room" : "Leave Watch Room"}
        >
          {isHost ? "Stop Room" : "Leave"}
        </button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={isHost ? "Stop Room?" : "Leave Room?"}
        message={isHost
          ? "Are you sure you want to stop the room? Everyone will be disconnected."
          : "Are you sure you want to leave the room?"
        }
        confirmText={isHost ? "Stop Room" : "Leave"}
        cancelText="Stay"
        variant="danger"
        onConfirm={handleLeave}
        onCancel={() => setConfirmOpen(false)}
      />
    </header>
  );
}
