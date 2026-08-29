// ControlBar.jsx — Bottom cinema playback controls & host broadcast actions with Phosphor icons
import React, { useState, useCallback, useEffect } from 'react';
import {
  SpeakerSimpleHigh,
  SpeakerSimpleLow,
  SpeakerSimpleX,
  Lightning,
  MonitorPlay,
  Square,
  PencilSimple,
  LockSimple,
  BarChart,
  CornersOut,
  CornersIn,
  PictureInPicture,
  Microphone,
  MicrophoneSlash,
} from '../components/icons';
import { QUALITY_PRESETS } from '../hooks/useWebRTC';
import { audioBooster, fireReactionPop } from '../utils';

/**
 * @param {object}   props
 * @param {boolean}  props.isActualHost
 * @param {boolean}  props.isSharing
 * @param {boolean}  props.hostOnlyControls
 * @param {React.RefObject} props.videoRef
 * @param {boolean}  props.isFullscreen
 * @param {boolean}  props.controlsVisible
 * @param {boolean}  props.statsVisible
 * @param {Function} props.onToggleStats
 * @param {boolean}  props.drawModeActive
 * @param {Function} props.onToggleDrawMode
 * @param {Function} props.onShareScreen
 * @param {Function} props.onStopShare
 * @param {Function} props.onSync
 * @param {Function} props.onToggleFullscreen
 * @param {Function} props.onReaction
 * @param {boolean}  props.isRecording
 * @param {number}   props.recordingTime
 * @param {Function} props.onToggleRecording
 * @param {boolean}  props.audioOnly
 * @param {Function} props.onToggleAudioOnly
 * @param {string}   props.currentQuality
 * @param {Function} props.onQualityChange
 */
export function ControlBar({
  isActualHost,
  isSharing,
  videoRef,
  isFullscreen,
  controlsVisible,
  statsVisible,
  onToggleStats,
  drawModeActive,
  onToggleDrawMode,
  onShareScreen,
  onStopShare,
  onSync,
  onToggleFullscreen,
  onReaction,
  isRecording,
  recordingTime,
  onToggleRecording,
  audioOnly,
  onToggleAudioOnly,
  currentQuality,
  onQualityChange,
}) {
  const [muted, setMuted]           = useState(false);
  const [volume, setVolume]         = useState(1);
  const [boostLevel, setBoostLevel] = useState(1); // 1 = 100%, 1.5 = 150%, 2.0 = 200%
  const [isPiP, setIsPiP]           = useState(false);
  const [hostOnlyOn, setHostOnlyOn] = useState(false);

  // Use controlled quality from parent (Room.jsx), fallback to '1080p'
  const quality = currentQuality || '1080p';

  // ─── Sync volume & audio boost to video ───────────────────────────────────
  useEffect(() => {
    if (videoRef?.current) {
      videoRef.current.volume = muted ? 0 : volume;
      if (!muted && volume > 0) {
        audioBooster.init(videoRef.current);
        audioBooster.setGain(boostLevel);
      }
    }
  }, [volume, muted, boostLevel, videoRef]);

  // ─── PiP tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onPiPChange = () => setIsPiP(!!document.pictureInPictureElement);
    document.addEventListener('enterpictureinpicture', onPiPChange);
    document.addEventListener('leavepictureinpicture', onPiPChange);
    return () => {
      document.removeEventListener('enterpictureinpicture', onPiPChange);
      document.removeEventListener('leavepictureinpicture', onPiPChange);
    };
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const cycleBoost = useCallback(() => {
    setBoostLevel((prev) => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2.0;
      return 1.0;
    });
  }, []);

  const togglePiP = useCallback(async () => {
    // Fallback to getElementById if ref isn't attached properly
    const el = videoRef?.current || document.getElementById('main-video');
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('[pip]', err);
    }
  }, [videoRef]);

  // ─── Keyboard shortcut: M = mute ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyM') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleMute]);

  const barClass = [
    'controlbar',
    isFullscreen ? 'controlbar-overlay' : '',
    isFullscreen && !controlsVisible ? 'controlbar-hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={barClass} role="toolbar" aria-label="Playback and Stream Controls">

      {/* ── LEFT: Volume & Audio Dialogue Booster ────────────────────────── */}
      <div className="controlbar-left">
        <button
          id="mute-btn"
          type="button"
          className={`ctrl-btn ${muted ? 'active' : ''}`}
          onClick={toggleMute}
          title={`${muted ? 'Unmute' : 'Mute'} (M)`}
          aria-label={muted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
          aria-pressed={muted}
        >
          {muted ? (
            <SpeakerSimpleX size={18} />
          ) : volume > 0.5 ? (
            <SpeakerSimpleHigh size={18} />
          ) : (
            <SpeakerSimpleLow size={18} />
          )}
        </button>

        <input
          id="volume-slider"
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            setMuted(v === 0);
          }}
          className="volume-slider"
          title="Local Playback Volume"
          aria-label="Local Playback Volume"
          aria-valuetext={muted ? 'Muted' : `${Math.round(volume * 100)}% volume`}
        />

        <span className="volume-pct" aria-live="polite">
          {muted ? '0%' : `${Math.round(volume * 100)}%`}
        </span>

        {/* Audio Dialogue Boost Toggle */}
        <button
          type="button"
          className={`ctrl-btn audio-boost-btn ${boostLevel > 1 ? 'boost-active' : ''}`}
          onClick={cycleBoost}
          title="Dialogue & Volume Booster (100% -> 150% -> 200%)"
          aria-label={`Dialogue Booster: ${boostLevel * 100}% gain`}
        >
          <Lightning size={14} className={boostLevel > 1 ? 'animate-pulse' : ''} />
          <span>{boostLevel * 100}%</span>
        </button>
      </div>

      {/* ── CENTER: Host controls ────────────────────────────────────────── */}
      <div className="controlbar-center">

        {/* Quality selector */}
        {isActualHost && (
          <div className="quality-selector" title="Stream capture resolution">
            <label htmlFor="quality-select" className="quality-label" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
              Select stream capture resolution
            </label>
            <select
              id="quality-select"
              className="quality-select"
              value={quality}
              onChange={(e) => onQualityChange?.(e.target.value)}
              disabled={isSharing}
              title={isSharing ? 'Stop sharing to change quality' : 'Select capture quality'}
              aria-label="Select stream capture resolution"
            >
              {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>{preset.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Share / Stop sharing */}
        {isActualHost && (
          <>
            {!isSharing ? (
              <button
                id="share-screen-btn"
                type="button"
                className="btn btn-primary"
                onClick={() => onShareScreen(quality)}
                title={`Share screen at ${QUALITY_PRESETS[quality]?.label}`}
                aria-label="Start Screen Sharing"
                style={{ gap: '6px' }}
              >
                <MonitorPlay size={16} />
                <span>Share Screen</span>
              </button>
            ) : (
              <button
                id="stop-share-btn"
                type="button"
                className="btn btn-danger"
                onClick={onStopShare}
                title="Stop sharing"
                aria-label="Stop Screen Sharing"
                style={{ gap: '6px' }}
              >
                <Square size={16} />
                <span>Stop Sharing</span>
              </button>
            )}
          </>
        )}

        {/* Drawing Canvas Toggle (Host Only) */}
        {isActualHost && isSharing && (
          <button
            type="button"
            className={`btn btn-secondary ${drawModeActive ? 'active' : ''}`}
            onClick={onToggleDrawMode}
            title={drawModeActive ? 'Exit Drawing Mode' : 'Live Screen Draw & Annotation'}
            aria-label={drawModeActive ? 'Exit Drawing Mode' : 'Activate Drawing Mode'}
            aria-pressed={drawModeActive}
            style={{ gap: '6px' }}
          >
            <PencilSimple size={16} />
            <span>{drawModeActive ? 'Drawing ON' : 'Draw'}</span>
          </button>
        )}

        {/* Host-only controls toggle */}
        {isActualHost && (
          <div className="host-only-toggle" title="Restrict controls to host only">
            <LockSimple size={14} style={{ color: 'var(--text-muted)' }} />
            <label className="toggle" htmlFor="host-only-toggle">
              <input
                id="host-only-toggle"
                type="checkbox"
                checked={hostOnlyOn}
                onChange={(e) => {
                  setHostOnlyOn(e.target.checked);
                  if (onSync) onSync('room:host-only-toggle', { enabled: e.target.checked });
                }}
                aria-label="Restrict room controls to host only"
              />
              <span className="toggle-track" />
            </label>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              Host only
            </span>
          </div>
        )}
      </div>

      {/* ── RIGHT: Telemetry + Reactions + PiP + Fullscreen ──────────────── */}
      <div className="controlbar-right">
        
        {/* Audio-Only Mode Toggle */}
        <button
          type="button"
          className={`ctrl-btn ${audioOnly ? 'active' : ''}`}
          onClick={onToggleAudioOnly}
          title={audioOnly ? 'Enable Video' : 'Audio Only Mode'}
          aria-label={audioOnly ? 'Enable Video' : 'Audio Only Mode'}
          aria-pressed={audioOnly}
        >
          {audioOnly ? <MicrophoneSlash size={18} /> : <Microphone size={18} />}
        </button>

        {/* Recording Toggle */}
        {onToggleRecording && (
          <>
            {isRecording ? (
              <div className="recording-indicator" title="Recording in progress — click to stop">
                <span className="recording-dot" />
                <span>{String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}</span>
                <button
                  type="button"
                  className="ctrl-btn danger"
                  onClick={onToggleRecording}
                  title="Stop recording"
                  aria-label="Stop screen recording"
                  style={{ width: '28px', height: '28px', marginLeft: '2px' }}
                >
                  <Square size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="ctrl-btn"
                onClick={onToggleRecording}
                title="Record screen"
                aria-label="Start screen recording"
              >
                <Record size={18} />
              </button>
            )}
          </>
        )}

        {/* Stream Telemetry HUD Button */}
        <button
          type="button"
          className={`ctrl-btn ${statsVisible ? 'active' : ''}`}
          onClick={onToggleStats}
          title="Toggle Stream Telemetry & Network Diagnostics"
          aria-label="Toggle Stream Telemetry Diagnostics"
          aria-pressed={statsVisible}
        >
          <BarChart size={18} />
        </button>

        {/* Emoji Reactions */}
        <div className="flex gap-1 items-center" style={{ marginRight: 'var(--space-2)' }}>
          {['😂', '😲', '💖', '🍿', '🔥'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="ctrl-btn reaction-btn"
              style={{ fontSize: '18px', padding: '0 6px' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                fireReactionPop((rect.left + rect.width / 2) / window.innerWidth, rect.top / window.innerHeight);
                if (onReaction) onReaction(emoji);
              }}
              title={`React with ${emoji}`}
              aria-label={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {document.pictureInPictureEnabled && (
          <button
            id="pip-btn"
            type="button"
            className={`ctrl-btn ${isPiP ? 'active' : ''}`}
            onClick={togglePiP}
            title="Picture in Picture"
            aria-label="Toggle Picture in Picture mode"
            aria-pressed={isPiP}
          >
            <PictureInPicture size={18} />
          </button>
        )}

        <button
          id="fullscreen-btn"
          type="button"
          className={`ctrl-btn ${isFullscreen ? 'active' : ''}`}
          onClick={onToggleFullscreen}
          title={`${isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} (F)`}
          aria-label={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? <CornersIn size={18} /> : <CornersOut size={18} />}
        </button>
      </div>

    </div>
  );
}
