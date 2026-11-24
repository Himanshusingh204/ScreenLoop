import React, { useRef, useEffect, useState } from 'react';

export default function MeetTile({ stream, name, isSelf, isActive, isMuted, isCameraOff, handRaised }) {
  const videoRef = useRef(null);
  const [initials, setInitials] = useState('');

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (name) {
      const parts = name.split(' ').filter(Boolean);
      setInitials(parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0]?.[0] || '?');
    }
  }, [name]);

  const showVideo = stream && !isCameraOff;

  return (
    <div className={`meet-tile ${isActive ? 'active-speaker' : ''} ${isCameraOff ? 'cam-off' : ''}`}>
      {showVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={isSelf} style={{ transform: isSelf ? 'scaleX(-1)' : 'none' }} />
      ) : (
        <div className="meet-tile-avatar-fallback">
          <div className="meet-tile-initials">
            {initials}
          </div>
          <span>{name}</span>
        </div>
      )}

      {handRaised && <div className="meet-hand-badge">Hand raised</div>}

      <div className="meet-tile-footer">
        <span className="meet-tile-name">{name}</span>
        <span className={`meet-tile-mic-badge ${isMuted ? 'muted' : ''}`}>
          {isMuted ? '🔇' : '🎤'}
        </span>
      </div>
    </div>
  );
}
