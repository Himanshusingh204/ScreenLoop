// JoinModal.jsx — Glassmorphic participant name & PIN entry modal
import React, { useState } from 'react';
import { Loader } from './Loader';
import { FilmStrip, RocketLaunch, ArrowRight } from './icons';

/**
 * @param {object} props
 * @param {string} props.roomId
 * @param {boolean} props.isCreating
 * @param {function} props.onJoin — called with { name, pin }
 * @param {string|null} props.error
 * @param {boolean} props.loading
 */
export function JoinModal({ roomId, isCreating, onJoin, error, loading }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [gender, setGender] = useState('female');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
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
          </div>

          <div>
            <label className="home-label" htmlFor="room-pin">
              {isCreating ? 'Set Room PIN (Optional)' : 'Room PIN (if protected)'}
            </label>
            <input
              id="room-pin"
              className="input"
              type="password"
              placeholder={isCreating ? 'Leave blank for open room' : 'Leave blank if none'}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={20}
              autoComplete="current-password"
            />
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
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <p className="card-error-text" role="alert">
              ⚠️ {error}
            </p>
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
