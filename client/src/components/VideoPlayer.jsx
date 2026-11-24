// VideoPlayer.jsx — Cinema stage video display area with ambient back-glow & autoplay recovery
import React, { useEffect, useRef, useState, memo } from 'react';
import { SpeakerSimpleHigh, MonitorPlay, PictureInPicture } from './icons';

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
  const [isPip, setIsPip] = useState(false);

  useEffect(() => {
    const videoEl = ref.current;
    if (!videoEl) return;

    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);

    videoEl.addEventListener('enterpictureinpicture', onEnterPip);
    videoEl.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      videoEl.removeEventListener('enterpictureinpicture', onEnterPip);
      videoEl.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, [ref]);

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (ref.current && document.pictureInPictureEnabled) {
        await ref.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('[video-player] PiP toggle failed:', err);
    }
  };

  // Keyboard shortcut: P = Picture in Picture
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyP') togglePip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePip]);

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
          <button type="button" className="btn btn-primary btn-sm" onClick={handleUnblockAutoplay}>Enable Audio</button>
        </div>
      )}

      {/* Picture-in-Picture Quick Toggle */}
      {showVideo && document.pictureInPictureEnabled && (
        <button
          type="button"
          className="pip-toggle-btn"
          onClick={togglePip}
          title={isPip ? 'Exit Picture-in-Picture' : 'Picture-in-Picture Mode (P)'}
          aria-label="Picture-in-Picture"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: 15,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: isPip ? 'var(--color-primary, #6366f1)' : '#fff',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <PictureInPicture size={18} weight={isPip ? 'fill' : 'regular'} />
        </button>
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
