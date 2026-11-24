import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Microphone, MicrophoneSlash, VideoCamera } from '../icons';

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
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
      setReady(true);
    }
  }, [localStream]);

  const handleStartPreview = async () => {
    try {
      setPermissionError('');
      await onStartStream(selectedCamera || undefined, selectedMic || undefined);
    } catch (err) {
      console.warn('Lobby preview error:', err);
      setPermissionError('Could not access camera/mic. You can still join without video.');
    }
  };

  const handleJoin = () => {
    if (!name.trim()) return;
    onJoin(name.trim(), gender, micOn, cameraOn);
  };

  return (
    <div className="meet-lobby">
      <Link to="/meet" className="join-brand" aria-label="Back to Screenloop Meet">
        Screenloop <span className="join-brand-sub">Meet</span>
      </Link>
      <div className="meet-lobby-card">
        {/* Video Preview Box */}
        <div className="meet-lobby-video">
          {ready && localStream ? (
            <video ref={videoRef} autoPlay playsInline muted />
          ) : (
            <div className="meet-tile-avatar-fallback">
              <span>{name ? name.charAt(0).toUpperCase() : '?'}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {ready ? 'Camera Off' : 'Preview Off'}
              </span>
            </div>
          )}
          <div className="meet-lobby-controls">
            <button
              className={`meet-ctrl-btn ${!micOn ? 'muted' : ''}`}
              onClick={onToggleMic}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
              title={micOn ? 'Mute Mic' : 'Unmute Mic'}
            >
              {micOn ? <Microphone size={22} /> : <MicrophoneSlash size={22} />}
            </button>
            <button
              className={`meet-ctrl-btn ${!cameraOn ? 'muted' : ''}`}
              onClick={onToggleCamera}
              aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
              title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              <VideoCamera size={22} weight={cameraOn ? 'regular' : 'fill'} />
            </button>
          </div>
        </div>

        {/* Join Configuration Form */}
        <div className="meet-lobby-form">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Join Meeting
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Room ID: <strong style={{ color: 'var(--meet-accent, #60a5fa)' }}>{meetId}</strong>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              aria-label="Your display name"
              autoFocus
            />

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              aria-label="Avatar Gender"
            >
              <option value="neutral">Avatar: Neutral</option>
              <option value="male">Avatar: Male</option>
              <option value="female">Avatar: Female</option>
            </select>

            {/* Device Selectors */}
            {devices.cameras?.length > 1 && (
              <select
                value={selectedCamera}
                onChange={(e) => onSelectCamera(e.target.value)}
                aria-label="Select Camera"
              >
                <option value="">Default Camera</option>
                {devices.cameras.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 4)}`}
                  </option>
                ))}
              </select>
            )}

            {devices.mics?.length > 1 && (
              <select
                value={selectedMic}
                onChange={(e) => onSelectMic(e.target.value)}
                aria-label="Select Microphone"
              >
                <option value="">Default Microphone</option>
                {devices.mics.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${d.deviceId.slice(0, 4)}`}
                  </option>
                ))}
              </select>
            )}

            {permissionError && (
              <p style={{ color: 'var(--warning, #f59e0b)', fontSize: '0.8rem', margin: 0 }}>
                {permissionError}
              </p>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              {!ready && (
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={handleStartPreview}
                  style={{ flex: 1 }}
                >
                  Test Camera &amp; Mic
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={handleJoin}
                disabled={!name.trim()}
                style={{ flex: ready ? 1 : 1 }}
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
