// Room.jsx — Main watch room orchestrator with Web APIs & clean barrel imports
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

// Clean Barrel Imports
import {
  JoinModal,
  TopBar,
  VideoPlayer,
  CaptionsLayer,
  ControlBar,
  ChatSidebar,
  ToastContainer,
  LoaderPage,
  ReactionOverlay,
  CursorOverlay,
  StatsOverlay,
  ShareModal,
  AnnotationCanvas,
} from '../components';

import {
  useWebRTC,
  useRoom,
  useWebRTCStats,
  useWakeLock,
  useSoundEffects,
  useNetworkStatus,
  useScreenRecording,
  useSignalingSocket,
  useLiveKitRoom,
  useMediaKeyRotation,
} from '../hooks';

import { fireRoomLaunchConfetti, addRecentRoom } from '../utils';
import { CornersIn } from '../components/icons';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'));

export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const intendedHost = searchParams.get('host') === 'true';
  const [roomKey] = useState(() => window.location.hash.replace('#', ''));

  // Clear ?host=true from the URL so users don't share it
  useEffect(() => {
    if (searchParams.has('host')) {
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // ─── Phase / connection state ─────────────────────────────────────────────
  const [phase, setPhase]           = useState('joining');
  const [myName, setMyName]         = useState('');
  const [modalError, setModalError] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 769px)').matches
  );
  const [isSharing, setIsSharing]   = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isActualHost, setIsActualHost] = useState(intendedHost);

  // ─── Modals and Overlays State ────────────────────────────────────────────
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [statsVisible, setStatsVisible]       = useState(false);
  const [drawModeActive, setDrawModeActive]   = useState(false);
  const [hostDisconnected, setHostDisconnected] = useState(false);

  // ─── Shared signaling connection (Phase 2: useSignalingSocket) ─────────────
  const {
    socket,
    connected,
    reconnecting,
    reconnectAttempt,
  } = useSignalingSocket(SERVER_URL, { room: roomId });

  // ─── Audio-only mode & Quality state ──────────────────────────────────────────
  const [audioOnly, setAudioOnly] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('1080p');

  // ─── Fullscreen state ─────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef(null);

  // ─── Web APIs Hooks (Wake Lock, SFX Synthesizer, Network Status) ──────────
  const isMediaActive = isSharing || !!remoteStream;
  useWakeLock(isMediaActive);
  const { isOnline } = useNetworkStatus();
  const { playJoinChime, playLeaveChime, playMessagePing, playReactionPop } = useSoundEffects();

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const addToastRef = useRef(null);
  const videoRef    = useRef(null);
  const roomRef     = useRef(null);

  // Latest join credentials (name/pin/gender) — used to re-join after a reconnect.
  const joinInfoRef = useRef({ name: '', pin: '', gender: 'neutral' });
  // Latest phase — lets error handlers behave differently before/after joining.
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  // Track initial socket connect to avoid double-joining on first handshake
  // (auto-rejoin/handleJoin handle the first join; connect handler is for reconnects).
  const initialConnectHandledRef = useRef(false);

  // ─── Socket.io Connection ────────────────────────────────────────────────
  // Owned by useSignalingSocket (shared hook). Room-specific rejoin logic lives
  // in the WebRTC signaling effect + auto-rejoin effect below.

  // ─── Auto-rejoin from sessionStorage on refresh ────────────────────────────
  useEffect(() => {
    if (!socket) return;
    try {
      const saved = sessionStorage.getItem(`room-session-${roomId}`);
      if (saved) {
        const { name, pin, gender, isHost } = JSON.parse(saved);
        joinInfoRef.current = { name, pin: pin || '', gender: gender || 'neutral' };
        setMyName(name);
        setModalLoading(true);
        if (isHost) {
          socket.emit('room:create', { roomId, name, pin, gender });
        } else {
          socket.emit('room:join', { roomId, name, pin, gender });
        }
      }
    } catch { /* ignore corrupt data */ }
  }, [socket, roomId]);

  // ─── WebRTC Engine ───────────────────────────────────────────────────────
  const {
    startScreenShare, sendOfferToViewer,
    handleOffer, handleAnswer, handleIce,
    stopScreenShare, localStream, peers,
  } = useWebRTC({
    socket,
    isHost: isActualHost,
    onStream: (stream) => setRemoteStream(stream),
    onTrackEnded: () => setIsSharing(false),
  });

  // ─── LiveKit SFU Media Engine ─────────────────────────────────────────────
  const {
    room: lkRoom,
    isConnected: isLiveKitActive,
    remoteScreenStream: lkRemoteStream,
    startScreenShare: startLiveKitScreenShare,
    stopScreenShare: stopLiveKitScreenShare,
    error: lkError,
    rotateKey: rotateMediaKey,
    e2eeActive,
    keyStateRef: mediaKeyStateRef,
    remoteAudioStream: lkAudioStream,
  } = useLiveKitRoom({
    socket,
    roomId,
    name: myName,
    isHost: isActualHost,
    e2eeKey: roomKey || null,
    enabled: phase === 'room' && !!myName,
    onScreenTrackSubscribed: (stream) => {
      setRemoteStream(stream);
      addToastRef.current?.('📡 Connected via LiveKit High-Speed SFU');
    },
    onScreenTrackUnsubscribed: () => {
      setRemoteStream(null);
    },
  });

  // LiveKit self-view: when the host shares via the SFU, build a local stream
  // from the SFU local participant's video track so the host sees their own
  // screen (and screen recording has a capture source).
  const livekitSelfStream = useMemo(() => {
    if (!isLiveKitActive || !isActualHost) return null;
    const track = lkRoom?.localParticipant?.videoTrack?.mediaStreamTrack;
    if (!track) return null;
    return new MediaStream([track]);
  }, [isLiveKitActive, isActualHost, lkRoom]);

  // ─── Screen Recording Hook ──────────────────────────────────────────────
  const recordingStream = isActualHost ? (livekitSelfStream || localStream.current) : remoteStream;
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
  } = useScreenRecording(recordingStream);

  // ─── Telemetry Hook ───────────────────────────────────────────────────────
  const streamStats = useWebRTCStats({
    peersRef: peers,
    isHost: isActualHost,
    isSharing: isSharing || !!remoteStream,
    enabled: true,
  });

  // ─── Room State & Crypto Messaging ───────────────────────────────────────
  const {
    participants, setParticipants, setHostId,
    toasts, chatMessages, hostOnlyControls, setHostOnlyControls,
    emitSync, sendChatMessage, deleteChatMessage, editChatMessage, emitTyping, typingUsers, addToast,
  } = useRoom({
    socket,
    roomId, myName, isHost: isActualHost, roomKey,
    onInitiateOffer: useCallback(async (viewerId) => {
      if (isActualHost && localStream.current) {
        await sendOfferToViewer(viewerId);
      }
    }, [isActualHost, sendOfferToViewer, localStream]),
  });

  addToastRef.current = addToast;

  // Media E2EE: the SFU only ever sees ciphertext; host rotates the key when it removes someone.
  useMediaKeyRotation({ socket, roomId, roomKey, enabled: e2eeActive, isHost: isActualHost, applyKey: rotateMediaKey, keyStateRef: mediaKeyStateRef, participants });
  useEffect(() => {
    if (e2eeActive) addToast('🔒 Media is end-to-end encrypted');
  }, [e2eeActive, addToast]);

  // Surface LiveKit failures as toasts (falls back to WebRTC automatically).
  useEffect(() => {
    if (lkError) addToast(`⚠️ LiveKit high-speed link unavailable — using peer-to-peer fallback ()`);
  }, [lkError, addToast]);

  // Play audio on new incoming chat messages
  const lastMsgCount = useRef(0);
  useEffect(() => {
    if (chatMessages.length > lastMsgCount.current) {
      if (lastMsgCount.current > 0) {
        playMessagePing();
      }
      lastMsgCount.current = chatMessages.length;
    }
  }, [chatMessages, playMessagePing]);

  // Network offline alerts
  useEffect(() => {
    if (!isOnline) {
      addToast('⚠️ Network offline — reconnecting…');
    }
  }, [isOnline, addToast]);

  // Signaling reconnect failure (previously inside the inline connection effect)
  useEffect(() => {
    if (!socket) return;
    const onFailed = () => addToast('❌ Could not reconnect. Please refresh.');
    socket.on('reconnect_failed', onFailed);
    return () => {
      socket.off('reconnect_failed', onFailed);
    };
  }, [socket, addToast]);

  // ─── WebRTC Signaling Listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleStreamEnd = () => {
      // Host ended the screen share — clear the stream on viewers
      setRemoteStream(null);
      setIsSharing(false);
    };
    socket.on('webrtc:offer',  handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice',    handleIce);
    socket.on('webrtc:stream-end', handleStreamEnd);
    socket.on('webrtc:stop', handleStreamEnd); // legacy fallback
    socket.on('room:promoted-to-host', () => {
      setIsActualHost(true);
      addToast('👑 You have been promoted to Host!');
    });
    socket.on('room:closed', ({ message }) => {
      addToast(`🛑 ${message}`);
      setHostDisconnected(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    });
    socket.on('room:host-disconnected', () => {
      setHostDisconnected(true);
      addToast('⚠️ Host disconnected — waiting for reconnection…');
    });

    // Task 41/52: Re-join on every successful connect after the first handshake
    // so the host re-offers a WebRTC stream. The join payload is replayed from
    // joinInfoRef so PIN-protected rooms and avatar gender survive a network blip.
    const handleConnect = () => {
      if (!initialConnectHandledRef.current) {
        initialConnectHandledRef.current = true;
        return; // initial connect — handled by auto-rejoin or manual join
      }
      const { name, pin, gender } = joinInfoRef.current;
      if (!name || !roomId) return; // not joined yet
      addToast('🔄 Reconnected — re-establishing stream…');
      socket.emit('room:join', { roomId, name, pin, gender });
    };
    socket.on('connect', handleConnect);

    // If socket is already connected when this effect mounts, mark initial connect handled
    // so subsequent reconnects will trigger rejoin.
    if (socket.connected) {
      initialConnectHandledRef.current = true;
    }

    return () => {
      socket.off('webrtc:offer',  handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice',    handleIce);
      socket.off('webrtc:stream-end', handleStreamEnd);
      socket.off('webrtc:stop', handleStreamEnd);
      socket.off('room:closed');
      socket.off('room:host-disconnected');
      socket.off('connect', handleConnect);
    };
  }, [socket, handleOffer, handleAnswer, handleIce, addToast, roomId]);

  // ─── Room Join Events ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onJoined = ({ participants: p, isHost: h, hostId, hostOnlyControls: hoc }) => {
      setParticipants(p);
      setHostId(hostId);
      setIsActualHost(h);
      // Task 42: Apply correct hostOnlyControls state from server for late joiners
      if (hoc !== undefined) setHostOnlyControls(hoc);
      // Task 72: Remember this room for the Home "Recent Rooms" section
      addRecentRoom(roomId);
      setModalLoading(false);
      setPhase('room');
      playJoinChime();
      // Task 55: Only fire confetti for host
      if (h) fireRoomLaunchConfetti();
    };
    const onError = ({ message }) => {
      setModalError(message);
      setModalLoading(false);
      // Errors after joining are not shown in the modal — surface them as toasts.
      // A room that no longer exists (e.g. host-only room deleted on a blip)
      // is unrecoverable, so send the user back home.
      if (phaseRef.current !== 'joining') {
        addToast(`❌ ${message}`);
        if (/not found/i.test(message)) {
          setTimeout(() => {
            window.location.href = '/';
          }, 2500);
        }
      }
    };
    socket.on('room:joined', onJoined);
    socket.on('room:error',  onError);
    return () => {
      socket.off('room:joined', onJoined);
      socket.off('room:error',  onError);
    };
  }, [socket, roomId, setParticipants, setHostId, setHostOnlyControls, playJoinChime, addToast]);

  // ─── Media Session API ───────────────────────────────────────────────────
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Screenloop Cinema — Room #${roomId}`,
        artist: isActualHost ? 'Screenloop (Hosting)' : 'Screenloop (Watching)',
        album: 'Live P2P Stream',
      });
    }
  }, [roomId, isActualHost]);

  // ─── Track Fullscreen State ──────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        setControlsVisible(true);
        clearTimeout(hideTimer.current);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ─── Auto-hide Controls in Fullscreen ─────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    if (isFullscreen) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      showControls();
      setShowFullscreenHint(true);
      const t = setTimeout(() => setShowFullscreenHint(false), 3000);
      return () => clearTimeout(t);
    } else {
      clearTimeout(hideTimer.current);
      setControlsVisible(true);
      setShowFullscreenHint(false);
    }
    return () => clearTimeout(hideTimer.current);
  }, [isFullscreen, showControls]);

  // ─── Fullscreen Toggle ───────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await roomRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('[fullscreen]', err);
    }
  }, []);

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyF') toggleFullscreen();
      if (e.code === 'Escape') {
        if (shareModalOpen) setShareModalOpen(false);
        else if (isFullscreen) toggleFullscreen();
        else if (sidebarOpen) setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen, shareModalOpen, isFullscreen, sidebarOpen]);

  // ─── Apply incoming playback sync events to the local video element ──────
  // Server broadcasts sync events to other participants; apply them here so
  // pause/play/seek actually affects playback (toasts are handled in useRoom).
  useEffect(() => {
    if (!socket) return;
    const onSyncPlay = () => {
      const video = videoRef.current;
      if (video) video.play().catch(() => {});
    };
    const onSyncPause = () => {
      const video = videoRef.current;
      if (video) video.pause();
    };
    const onSyncSeek = ({ time }) => {
      const video = videoRef.current;
      if (video && typeof time === 'number' && Number.isFinite(time)) {
        video.currentTime = time;
      }
    };
    socket.on('sync:play', onSyncPlay);
    socket.on('sync:pause', onSyncPause);
    socket.on('sync:seek', onSyncSeek);
    return () => {
      socket.off('sync:play', onSyncPlay);
      socket.off('sync:pause', onSyncPause);
      socket.off('sync:seek', onSyncSeek);
    };
  }, [socket]);

  // ─── Room Actions ─────────────────────────────────────────────────────────
  const handleJoin = useCallback(({ name, pin, gender }) => {
    if (!socket) {
      setModalError('Not connected to server. Please wait or refresh.');
      return;
    }
    // Persist credentials so a later reconnect can re-join the same room.
    joinInfoRef.current = { name, pin: pin || '', gender: gender || 'neutral' };
    // Save to sessionStorage for auto-rejoin on refresh
    try {
      sessionStorage.setItem(`room-session-${roomId}`, JSON.stringify({
        name, pin: pin || '', gender: gender || 'neutral', isHost: intendedHost,
      }));
    } catch { /* quota exceeded — ignore */ }
    setMyName(name);
    setModalLoading(true);
    setModalError(null);
    if (intendedHost) {
      socket.emit('room:create', { roomId, name, pin, gender });
    } else {
      socket.emit('room:join', { roomId, name, pin, gender });
    }
  }, [intendedHost, roomId, socket]);

  // Latest SFU state for async handlers (the Share click can land while the SFU is still connecting)
  const sfuStateRef = useRef({ active: false, pending: false });
  sfuStateRef.current = { active: isLiveKitActive, pending: phase === 'room' && !!myName && !isLiveKitActive && !lkError };

  const handleShareScreen = useCallback(async (quality = '1080p') => {
    try {
      // If the SFU is still connecting, wait for it to settle: silently falling back to P2P here would skip the SFU
      // and its media E2EE for the whole session.
      if (sfuStateRef.current.pending) {
        addToast('⏳ Connecting to the secure media server…');
        for (let i = 0; i < 100 && sfuStateRef.current.pending; i++) await new Promise((r) => setTimeout(r, 150));
      }
      if (sfuStateRef.current.active) {
        await startLiveKitScreenShare();
        setIsSharing(true);
        addToast('🖥 LiveKit HD Cinema Screen sharing started');
      } else {
        await startScreenShare(quality);
        setIsSharing(true);
        const viewers = participants.filter((p) => !p.isHost);
        for (const viewer of viewers) await sendOfferToViewer(viewer.socketId);
        addToast('🖥 Screen sharing started');
      }
    } catch (err) {
      setIsSharing(false);
      // Task 56: Show helpful message for permission denied
      if (err.name === 'NotAllowedError') {
        addToast('🚫 Screen share blocked — please allow access in your browser settings.');
      } else {
        addToast('❌ Could not start screen share: ' + err.message);
      }
    }
  }, [startLiveKitScreenShare, startScreenShare, participants, sendOfferToViewer, addToast]);

  const handleStopShare = useCallback(() => {
    if (isLiveKitActive) {
      stopLiveKitScreenShare();
    } else {
      stopScreenShare();
    }
    // Notify viewers the stream has ended so they can clear it
    socket?.emit('webrtc:stop', { roomId });
    setIsSharing(false);
    setDrawModeActive(false);
    addToast('🛑 Screen sharing stopped');
  }, [isLiveKitActive, stopLiveKitScreenShare, stopScreenShare, addToast, socket, roomId]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (recordingStream) {
      startRecording();
    }
  }, [isRecording, recordingStream, startRecording, stopRecording]);

  const handleReaction = useCallback((emoji) => {
    playReactionPop();
    socket?.emit('room:reaction', { roomId, emoji });
  }, [roomId, socket, playReactionPop]);

  const handleToggleAudioOnly = useCallback(() => {
    const next = !audioOnly;
    if (next && localStream.current) {
      localStream.current.getVideoTracks().forEach((t) => {
        t.enabled = false;
      });
    } else if (!next) {
      // Re-enable video tracks (user must re-share for new capture)
      if (localStream.current) {
        localStream.current.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
      }
    }
    setAudioOnly(next);
    addToast(next ? '🔇 Video disabled — audio-only mode' : '🎥 Video re-enabled');
  }, [audioOnly, localStream, addToast]);

  const handleQualityChange = useCallback((newQuality) => {
    setCurrentQuality(newQuality);
  }, []);

  const handleKick = useCallback((targetId, ban = false) => {
    socket?.emit('room:kick', { roomId, targetId, ban: ban === true });
    playLeaveChime();
  }, [roomId, socket, playLeaveChime]);

  const handleTransferHost = useCallback((newHostId) => {
    socket?.emit('room:transfer-host', { roomId, newHostId });
    stopScreenShare();
    setIsSharing(false);
    setIsActualHost(false);
  }, [roomId, socket, stopScreenShare]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!socket && phase === 'joining') {
    return <LoaderPage text="Connecting to server…" />;
  }

  if (phase === 'joining') {
    const isNotFound = modalError && modalError.toLowerCase().includes('not found');
    return (
      <JoinModal
        roomId={roomId}
        isCreating={intendedHost}
        onJoin={handleJoin}
        error={modalError}
        loading={modalLoading}
        showGoHome={isNotFound}
      />
    );
  }

  const mySocketId = socket?.id;
  const stream = lkRemoteStream || (isActualHost ? (livekitSelfStream || localStream.current) : remoteStream);

  return (
    <div
      ref={roomRef}
      className={[
        'room-layout',
        isFullscreen ? 'is-fullscreen' : '',
        isFullscreen && !controlsVisible ? 'cursor-hidden' : '',
      ].filter(Boolean).join(' ')}
      onMouseMove={isFullscreen ? showControls : undefined}
      onClick={isFullscreen ? showControls : undefined}
    >
      {/* ── TopBar: hidden in fullscreen ──────────────────────────────────── */}
      {!isFullscreen && (
        <TopBar
          roomId={roomId}
          roomKey={roomKey}
          participantCount={participants.length}
          connected={connected}
          streamQuality={isLiveKitActive ? 'good' : streamStats.quality}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onOpenShare={() => setShareModalOpen(true)}
          isHost={isActualHost}
        />
      )}

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="room-main">

        {/* Video area */}
        <div className="room-video-area">
          <VideoPlayer
            stream={stream}
            isHost={isActualHost}
            isSharing={isSharing}
            videoRef={videoRef}
          />

          <CaptionsLayer stream={stream?.getAudioTracks().length ? stream : lkAudioStream} />

          {/* Screen Annotation Drawing Canvas */}
          <AnnotationCanvas
            socket={socket}
            isHost={isActualHost}
            roomId={roomId}
            active={drawModeActive}
            onToggleActive={() => setDrawModeActive((d) => !d)}
          />

          {/* Overlays that sit over the video area */}
          {!drawModeActive && (
            <CursorOverlay socket={socket} isHost={isActualHost} roomId={roomId} />
          )}
          <ReactionOverlay socket={socket} />

          {/* Telemetry Diagnostics HUD */}
          <StatsOverlay
            stats={streamStats}
            visible={statsVisible}
            onClose={() => setStatsVisible(false)}
            isHost={isActualHost}
          />

          {/* ControlBar: static normally, floating overlay in fullscreen */}
          <ControlBar
            isActualHost={isActualHost}
            isSharing={isSharing}
            hostOnlyControls={hostOnlyControls}
            videoRef={videoRef}
            isFullscreen={isFullscreen}
            controlsVisible={controlsVisible}
            statsVisible={statsVisible}
            onToggleStats={() => setStatsVisible((s) => !s)}
            drawModeActive={drawModeActive}
            onToggleDrawMode={() => setDrawModeActive((d) => !d)}
            onShareScreen={handleShareScreen}
            onStopShare={handleStopShare}
            onSync={emitSync}
            onToggleFullscreen={toggleFullscreen}
            onReaction={handleReaction}
            audioOnly={audioOnly}
            onToggleAudioOnly={handleToggleAudioOnly}
            currentQuality={currentQuality}
            onQualityChange={handleQualityChange}
            isRecording={isActualHost ? isRecording : false}
            recordingTime={recordingTime}
            onToggleRecording={isActualHost ? handleToggleRecording : null}
          />

          {/* Persistent Exit button — always visible in fullscreen, the rest only on hover */}
          {isFullscreen && (
            <button
              type="button"
              className="fullscreen-exit-btn"
              onClick={toggleFullscreen}
              title="Exit fullscreen (F)"
              aria-label="Exit Fullscreen (F)"
            >
              <CornersIn size={18} />
              <span className="fullscreen-exit-label">Exit</span>
            </button>
          )}
        </div>

        {/* Sidebar: hidden in fullscreen */}
        {!isFullscreen && (
          <ChatSidebar
            open={sidebarOpen}
            participants={participants}
            mySocketId={mySocketId}
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            onDeleteMessage={deleteChatMessage}
            onEditMessage={editChatMessage}
            onTyping={emitTyping}
            typingUsers={typingUsers}
            isActualHost={isActualHost}
            onKick={handleKick}
            onTransferHost={handleTransferHost}
          />
        )}
      </div>

      {/* Share / QR Code Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        roomId={roomId}
        roomKey={roomKey}
      />

      {/* Fullscreen shortcut hint */}
      {showFullscreenHint && isFullscreen && (
        <div className="fullscreen-hint" role="status" aria-live="polite">
          Press <kbd>Esc</kbd> to exit fullscreen
        </div>
      )}

      {/* Reconnection Overlay */}
      {reconnecting && (
        <div className="reconnection-overlay" role="alert" aria-live="assertive">
          <div className="reconnection-card">
            <div className="reconnection-spinner" />
            <p>Reconnecting… (attempt {reconnectAttempt}/15)</p>
          </div>
        </div>
      )}

      {/* Host Disconnected Overlay */}
      {hostDisconnected && !isActualHost && (
        <div className="host-disconnected-overlay" role="alert" aria-live="assertive">
          <div className="host-disconnected-card">
            <div className="host-disconnected-icon">⚠️</div>
            <h3>Host Disconnected</h3>
            <p>The host has left the room. Waiting for reconnection…</p>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}


