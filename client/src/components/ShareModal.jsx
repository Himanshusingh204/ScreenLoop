// ShareModal.jsx — Modal for inviting friends via Web Share API, link, or QR Code
import React, { useState, useEffect, useRef } from 'react';
import { buildRoomLink } from '../utils/roomId';
import { ShareNetwork, X, CopySimple, CheckCircle, DeviceMobile } from './icons';

/**
 * Renders QR Code onto canvas with high contrast and graceful fallback
 */
function renderQRCodeToCanvas(canvas, text) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 200;
  canvas.width = size;
  canvas.height = size;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}&margin=10`;
  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
  };
  img.onerror = () => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 20, 40, 40);
    ctx.clearRect(30, 30, 20, 20);
    ctx.fillRect(140, 20, 40, 40);
    ctx.clearRect(150, 30, 20, 20);
    ctx.fillRect(20, 140, 40, 40);
    ctx.clearRect(30, 150, 20, 20);
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan link below', size / 2, size / 2);
  };
}

/**
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.roomId
 * @param {string} props.roomKey
 */
export function ShareModal({ isOpen, onClose, roomId, roomKey }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const canvasRef = useRef(null);

  const fullLink = buildRoomLink(roomId, roomKey);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !!navigator.share) {
      setCanNativeShare(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      renderQRCodeToCanvas(canvasRef.current, fullLink);
    }
  }, [isOpen, fullLink]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Screenloop Watch Party',
          text: `Join my private cinema watch party on Screenloop!`,
          url: fullLink,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      prompt('Copy invite link:', fullLink);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      prompt('Copy Room ID:', roomId);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="modal-card share-modal-card animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="share-modal-title" className="modal-title"><ShareNetwork size={20} /> Invite Friends</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close invite modal"
          >
            <X size={18} />
          </button>
        </div>

        <p className="share-modal-desc">
          Share this link or scan the QR code to join instantly. The link includes the 256-bit E2EE key.
        </p>

        {/* Native Web Share Button (Mobile & Supported Desktops) */}
        {canNativeShare && (
          <button
            type="button"
            className="btn btn-primary w-full"
            style={{ marginBottom: 'var(--space-4)', gap: '8px' }}
            onClick={handleNativeShare}
          >
            <DeviceMobile size={16} /> Share via App / AirDrop / Messages
          </button>
        )}

        {/* QR Code Section */}
        <div className="share-qr-container">
          <div className="share-qr-wrapper">
            <canvas
              ref={canvasRef}
              className="share-qr-canvas"
              width={200}
              height={200}
              aria-label="Room Invite QR Code"
            />
          </div>
          <span className="share-qr-caption"><Smartphone size={14} /> Point mobile camera to join instantly</span>
        </div>

        {/* Invite Link Copy */}
        <div className="share-field-group">
          <label className="share-field-label" htmlFor="share-full-link">
            Full Invite Link (with E2EE Key)
          </label>
          <div className="share-input-row">
            <input
              id="share-full-link"
              type="text"
              readOnly
              value={fullLink}
              className="input share-input"
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              className="btn btn-primary share-copy-btn"
              onClick={handleCopyLink}
              aria-label="Copy full room invite link"
            >
              {copiedLink ? <><CheckCircle size={14} /> Copied</> : <><CopySimple size={14} /> Copy</>}
            </button>
          </div>
        </div>

        {/* Room ID Only */}
        <div className="share-field-group">
          <label className="share-field-label" htmlFor="share-room-id">
            Room Code Only
          </label>
          <div className="share-input-row">
            <input
              id="share-room-id"
              type="text"
              readOnly
              value={roomId}
              className="input share-input"
              style={{ fontWeight: 600, letterSpacing: '0.05em' }}
            />
            <button
              type="button"
              className="btn btn-secondary share-copy-btn"
              onClick={handleCopyId}
              aria-label="Copy room code"
            >
              {copiedId ? <><CheckCircle size={14} /> Copied</> : <><CopySimple size={14} /> Copy ID</>}
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost w-full" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
