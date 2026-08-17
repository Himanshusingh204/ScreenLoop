// VideoPlayer.jsx — Cinema stage video display area with ambient back-glow & autoplay recovery
import React, { useEffect, useRef, useState, memo } from 'react';
import { SpeakerSimpleHigh, MonitorPlay } from './icons';

/**
 * @param {object} props
 * @param {MediaStream|null} props.stream — the WebRTC stream to display
 * @param {boolean} props.isHost
 * @param {boolean} props.isSharing — host is actively sharing
 * @param {React.RefObject} props.videoRef — forwarded ref so parent can control the video el
 */
export const VideoPlayer = memo(function VideoPlayer({ stream, isHost, isSharing, videoRef }) {
  const internalRef = useRef(null);
  const ref = videoRef || internalRef;
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      
      // Attempt play and handle autoplay restrictions gracefully
      ref.current.play().catch((err) => {
        console.warn('[video-player] Autoplay restriction detected:', err);
        if (!isHost) {
          setAutoplayBlocked(true);
        }
      });
    }
  }, [stream, ref, isHost]);

  const handleUnblockAutoplay = () => {
    if (ref.current) {
      ref.current.play().then(() => {
        setAutoplayBlocked(false);
      }).catch(console.error);
    }
  };

  const showVideo = !!stream;

  return (
    <div className="video-wrapper">
      {/* Ambient background stage glow */}
      {showVideo && <div className="ambient-stage-glow" />}

      {/* The actual video element — always in DOM so ref stays stable */}
      <video
        ref={ref}
        id="main-video"
        className="video-el"
        autoPlay
        playsInline
        muted={isHost} // Host mutes their own stream to avoid feedback loop
        width="1280"
        height="720"
        style={{ display: showVideo ? 'block' : 'none' }}
      />

      {/* Autoplay Unlock Banner for Viewers */}
      {autoplayBlocked && (
        <div className="autoplay-banner animate-slide-down" onClick={handleUnblockAutoplay}>
          <SpeakerSimpleHigh size={16} /> <span>Sound is muted by browser policy — Click anywhere to enable full cinema audio</span>
          <button className="btn btn-primary btn-sm">Enable Audio</button>
        </div>
      )}

      {/* Placeholder when no stream */}
      {!showVideo && (
        <div className="video-placeholder">
          <div className="placeholder-animation-ring">
            <MonitorPlay size={32} style={{ opacity: 0.3 }} />
          </div>
          {isHost ? (
            <>
              <span className="video-placeholder-text">Cinema Stage Ready</span>
              <span className="video-placeholder-sub">
                Click <strong style={{ color: 'var(--text-primary)' }}>Share Screen</strong> below to begin broadcasting to viewers.
              </span>
            </>
          ) : (
            <>
              <span className="video-placeholder-text">Waiting for Host Stream…</span>
              <span className="video-placeholder-sub">
                Grab some popcorn! The host will begin sharing their screen shortly.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
});
