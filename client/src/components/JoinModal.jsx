// JoinModal.jsx — Glassmorphic participant name & PIN entry modal
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader } from './Loader';
import { FilmStrip, RocketLaunch, ArrowRight, ArrowLeft, Eye, EyeSlash } from './icons';

/**
 * @param {object} props
 * @param {string} props.roomId
 * @param {boolean} props.isCreating
 * @param {function} props.onJoin — called with { name, pin }
 * @param {string|null} props.error
 * @param {boolean} props.loading
 */
export function JoinModal({ roomId, isCreating, onJoin, error, loading, showGoHome = false }) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('sl-name') || '';
    } catch {
      return '';
    }
  });
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [gender, setGender] = useState(() => {
    try {
      return localStorage.getItem('sl-gender') || 'neutral';
    } catch {
      return 'neutral';
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      localStorage.setItem('sl-name', name.trim());
      localStorage.setItem('sl-gender', gender);
    } catch {
      /* ignore quota errors */
    }
    onJoin({ name: name.trim(), pin: pin.trim(), gender });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="join-modal-title">
      <div className="modal-card animate-scale-up">
        <div id="join-modal-title" className="modal-title">
          {isCreating ? <span><FilmStrip size={20} /> Create Watch Room</span> : 'Join Watch Party'}
        </div>
        <p className="modal-sub">
          {isCreating
            ? "You'll be the host. Set up your screen share and invite friends!"
            : `You're joining room #${roomId}`}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="home-label" htmlFor="display-name">
              Your Display Name
            </label>
            <input
              id="display-name"
              className="input"
              type="text"
              placeholder="e.g. Alex, Maya…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoFocus
              autoComplete="nickname"
              required
            />
            <span
              className={`name-counter ${name.length >= 30 ? 'at-limit' : ''}`}
              aria-live="polite"
            >
              {name.length}/30
            </span>
          </div>

          <div>
            <label className="home-label" htmlFor="room-pin">
              {isCreating ? 'Set Room PIN (Optional)' : 'Room PIN (if protected)'}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="room-pin"
                className="input"
                type={showPin ? 'text' : 'password'}
                placeholder={isCreating ? 'Leave blank for open room' : 'Leave blank if none'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={20}
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              {pin && (
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="home-label" htmlFor="gender-select">
              Select Avatar Style
            </label>
            <select
              id="gender-select"
              className="input"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>

          {error && (
            <div>
              <p className="card-error-text" role="alert">
                ⚠️ {error}
              </p>
              {showGoHome && (
                <Link
                  to="/"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ArrowLeft size={14} /> Go Home
                </Link>
              )}
            </div>
          )}

          <button
            id="join-btn"
            type="submit"
            className="btn btn-primary btn-lg w-full card-action-btn"
            disabled={loading || !name.trim()}
          >
            {loading ? (
              <Loader size="sm" />
            ) : isCreating ? (
              <><RocketLaunch size={16} /> Launch Room</>
            ) : (
              <><ArrowRight size={16} /> Enter Watch Room</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
