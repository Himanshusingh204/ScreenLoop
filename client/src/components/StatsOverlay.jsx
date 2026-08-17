// StatsOverlay.jsx — Telemetry and stream performance diagnostic HUD
import React from 'react';
import { BarChart, X, ShieldCheck } from './icons';

/**
 * @param {object} props
 * @param {object} props.stats
 * @param {boolean} props.visible
 * @param {Function} props.onClose
 * @param {boolean} props.isHost
 */
export function StatsOverlay({ stats, visible, onClose, isHost }) {
  if (!visible) return null;

  const getStatusColor = (quality) => {
    switch (quality) {
      case 'good': return 'var(--success)';
      case 'fair': return 'var(--warning)';
      case 'poor': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="stats-overlay-card animate-fade-in" role="region" aria-label="Stream Diagnostics">
      <div className="stats-header">
        <div className="stats-title-group">
          <BarChart size={16} />
          <span className="stats-title">Stream Telemetry</span>
          <span
            className="stats-badge"
            style={{ backgroundColor: `${getStatusColor(stats.quality)}22`, color: getStatusColor(stats.quality) }}
          >
            {stats.quality.toUpperCase()}
          </span>
        </div>
        <button className="stats-close-btn" onClick={onClose} title="Close Diagnostics">
          <X size={14} />
        </button>
      </div>

      <div className="stats-grid">
        <div className="stats-item">
          <span className="stats-label">Role</span>
          <span className="stats-value">{isHost ? 'Host (Broadcaster)' : 'Viewer (Receiver)'}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Framerate</span>
          <span className="stats-value highlight">{stats.fps} fps</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Bitrate</span>
          <span className="stats-value">{stats.bitrateKbps} kbps</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Resolution</span>
          <span className="stats-value">{stats.resolution}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Latency (RTT)</span>
          <span className="stats-value">{stats.rttMs ? `${stats.rttMs} ms` : 'P2P Direct'}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Packet Loss</span>
          <span className="stats-value" style={{ color: stats.packetLoss > 2 ? 'var(--danger)' : 'inherit' }}>
            {stats.packetLoss}%
          </span>
        </div>
      </div>
      <div className="stats-footer">
        <span className="stats-note"><ShieldCheck size={12} /> AES-256-GCM E2EE Enabled • WebRTC Direct Mesh</span>
      </div>
    </div>
  );
}
