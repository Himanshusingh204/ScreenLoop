import React, { useState, useEffect, useRef } from 'react';
import { Microphone, MicrophoneSlash } from '../icons';

export default function MeetLobby({
  meetId,
  name: initialName,
  gender: initialGender,
  devices,
  localStream,
  micOn,
  cameraOn,
  selectedCamera,
  selectedMic,
  onSelectCamera,
  onSelectMic,
  onToggleMic,
  onToggleCamera,
  onStartStream,
  onJoin,
}) {
  const videoRef = useRef(null);
  const [name, setName] = useState(initialName || '');
  const [gender, setGender] = useState(initialGender || 'neutral');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
      setReady(true);
    }
  }, [localStream]);

  const handleStartPreview = async () => {
    await onStartStream(selectedCamera || undefined, selectedMic || undefined);
  };

  const handleJoin = () => {
    if (!name.trim()) return;
    onJoin(name.trim(), gender, micOn, cameraOn);
  };

  return (
    <div className="meet-lobby">
      <div className="meet-lobby-card">
        <div className="meet-lobby-video">
          {ready && localStream ? (
            <video ref={videoRef} autoPlay playsInline muted />
          ) : (
            <div className="meet-tile-avatar-fallback">
              <span>{name ? name.charAt(0).toUpperCase() : '?'}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Camera preview</span>
            </div>
          )}
          <div className="meet-lobby-controls">
            <button
              className={`meet-ctrl-btn ${!micOn ? 'muted' : ''}`}
              onClick={onToggleMic}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micOn ? <Microphone size={22} /> : <MicrophoneSlash size={22} />}
            </button>
            <button
              className={`meet-ctrl-btn ${!cameraOn ? 'muted' : ''}`}
              onClick={onToggleCamera}
              aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              <span role="img" aria-label="camera">
                {cameraOn ? '📷' : '📷❌'}
              </span>
            </button>
          </div>
        </div>

        <div className="meet-lobby-form">
          <h2>Join Meeting</h2>

          {!ready && (
            <button className="btn btn-primary" onClick={handleStartPreview}>
              Start Camera &amp; Microphone
            </button>
          )}

          {ready && (
            <>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                aria-label="Your display name"
              />

              <select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
                <option value="neutral">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              {devices.cameras.length > 1 && (
                <select
                  value={selectedCamera}
                  onChange={(e) => onSelectCamera(e.target.value)}
                  aria-label="Camera"
                >
                  <option value="">Default Camera</option>
                  {devices.cameras.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 4)}`}</option>
                  ))}
                </select>
              )}

              {devices.mics.length > 1 && (
                <select
                  value={selectedMic}
                  onChange={(e) => onSelectMic(e.target.value)}
                  aria-label="Microphone"
                >
                  <option value="">Default Microphone</option>
                  {devices.mics.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 4)}`}</option>
                  ))}
                </select>
              )}

              <div className="meet-lobby-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleJoin}
                  disabled={!name.trim()}
                >
                  Join Now
                </button>
              </div>
            </>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
            Meeting code: <strong>{meetId}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
