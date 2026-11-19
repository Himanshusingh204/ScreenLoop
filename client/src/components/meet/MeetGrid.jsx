import React, { useRef, useEffect } from 'react';
import { MicrophoneSlash } from '../icons';

function VideoTile({ stream, name, isSelf, isMuted, isSpeaking, handRaised, avatarUrl }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;

  return (
    <div className={`meet-tile ${isSpeaking ? 'active-speaker' : ''}`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={isSelf} />
      ) : (
        <div className="meet-tile-avatar-fallback">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} />
          ) : (
            <span>{name ? name.charAt(0).toUpperCase() : '?'}</span>
          )}
          <span>{name || 'Unknown'}</span>
        </div>
      )}

      {handRaised && (
        <div className="meet-hand-badge">✋ Hand</div>
      )}

      <div className="meet-tile-footer">
        <span className="meet-tile-name">
          {isSelf ? `${name} (You)` : name}
        </span>
        <span className={`meet-tile-mic-badge ${isMuted ? 'muted' : ''}`}>
          {isMuted ? <MicrophoneSlash size={14} /> : null}
        </span>
      </div>
    </div>
  );
}

export default function MeetGrid({ localStream, remoteStreams, participants, activeSpeaker, localName }) {
  const totalParticipants = 1 + (participants?.length || 0);

  const gridClass = totalParticipants <= 1 ? 'grid-1'
    : totalParticipants <= 2 ? 'grid-2'
    : totalParticipants <= 4 ? 'grid-4'
    : totalParticipants <= 6 ? 'grid-6'
    : 'grid-8';

  return (
    <div className={`meet-grid ${gridClass}`}>
      {/* Local tile always first */}
      <VideoTile
        stream={localStream}
        name={localName}
        isSelf={true}
        isMuted={false}
        isSpeaking={false}
        handRaised={false}
      />

      {/* Remote participant tiles */}
      {participants?.map((p) => (
        <VideoTile
          key={p.socketId}
          stream={remoteStreams?.[p.socketId]}
          name={p.name}
          isSelf={false}
          isMuted={!p.micOn}
          isSpeaking={activeSpeaker === p.socketId}
          handRaised={p.handRaised}
        />
      ))}
    </div>
  );
}
