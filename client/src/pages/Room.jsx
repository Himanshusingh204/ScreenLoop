// Room.jsx — Main watch room orchestrator with Web APIs & clean barrel imports
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';

// Clean Barrel Imports
import {
  JoinModal,
  TopBar,
  VideoPlayer,
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
} from '../hooks';

import { fireRoomLaunchConfetti } from '../utils';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000');

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
  const [connected, setConnected]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSharing, setIsSharing]   = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isActualHost, setIsActualHost] = useState(intendedHost);

  // ─── Modals and Overlays State ────────────────────────────────────────────
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [statsVisible, setStatsVisible]       = useState(false);
  const [drawModeActive, setDrawModeActive]   = useState(false);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // ─── Fullscreen state ─────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef(null);

  // ─── Web APIs Hooks (Wake Lock, SFX Synthesizer, Network Status) ──────────
  const isMediaActive = isSharing || !!remoteStream;
  useWakeLock(isMediaActive);
  const { isOnline } = useNetworkStatus();
  const { playJoinChime, playLeaveChime, playMessagePing, playReactionPop } = useSoundEffects();

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const [socket, setSocket] = useState(null);
  const videoRef    = useRef(null);
  const roomRef     = useRef(null);

  // ─── Socket.io Connection ────────────────────────────────────────────────
  useEffect(() => {
    const s = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 15,
      transports: ['websocket', 'polling'],
    });
    setSocket(s);
    s.on('connect',    () => {
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempt(0);
    });
    s.on('disconnect', () => setConnected(false));
    s.on('reconnect_attempt', (attempt) => {
      setReconnecting(true);
      setReconnectAttempt(attempt);
    });
    s.on('reconnect', () => {
      setReconnecting(false);
      setReconnectAttempt(0);
    });
    s.on('reconnect_failed', () => {
      setReconnecting(false);
      addToast('❌ Could not reconnect. Please refresh.');
    });
    return () => s.disconnect();
  }, []);

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
    toasts, chatMessages, hostOnlyControls,
    emitSync, sendChatMessage, addToast,
  } = useRoom({
    socket,
    roomId, myName, isHost: isActualHost, roomKey,
    onInitiateOffer: useCallback(async (viewerId) => {
      if (isActualHost && localStream.current) {
        await sendOfferToViewer(viewerId);
      }
    }, [isActualHost, sendOfferToViewer, localStream]),
  });

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

  // ─── WebRTC Signaling Listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.on('webrtc:offer',  handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice',    handleIce);
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
    return () => {
      socket.off('webrtc:offer',  handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice',    handleIce);
      socket.off('room:closed');
      socket.off('room:host-disconnected');
    };
  }, [handleOffer, handleAnswer, handleIce, addToast]);

  // ─── Room Join Events ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onJoined = ({ participants: p, isHost: h, hostId }) => {
      setParticipants(p);
      setHostId(hostId);
      setIsActualHost(h);
      setModalLoading(false);
      setPhase('room');
      playJoinChime();
      fireRoomLaunchConfetti();
    };
    const onError = ({ message }) => {
      setModalError(message);
      setModalLoading(false);
    };
    socket.on('room:joined', onJoined);
    socket.on('room:error',  onError);
    return () => {
      socket.off('room:joined', onJoined);
      socket.off('room:error',  onError);
    };
  }, [setParticipants, setHostId, playJoinChime]);

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
    } else {
      clearTimeout(hideTimer.current);
      setControlsVisible(true);
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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen]);

  // ─── Room Actions ─────────────────────────────────────────────────────────
  const handleJoin = useCallback(({ name, pin, gender }) => {
    if (!socket) {
      setModalError('Not connected to server. Please wait or refresh.');
      return;
    }
    setMyName(name);
    setModalLoading(true);
    setModalError(null);
    if (intendedHost) {
      socket.emit('room:create', { roomId, name, pin, gender });
    } else {
      socket.emit('room:join', { roomId, name, pin, gender });
    }
  }, [intendedHost, roomId, socket]);

  const handleShareScreen = useCallback(async (quality = '1080p') => {
    try {
      await startScreenShare(quality);
      setIsSharing(true);
      const viewers = participants.filter((p) => !p.isHost);
      for (const viewer of viewers) await sendOfferToViewer(viewer.socketId);
      addToast('🖥 Screen sharing started');
    } catch (err) {
      if (err.name !== 'NotAllowedError') addToast('❌ Could not start screen share: ' + err.message);
      setIsSharing(false);
    }
  }, [startScreenShare, participants, sendOfferToViewer, addToast]);

  const handleStopShare = useCallback(() => {
    stopScreenShare();
    setIsSharing(false);
    setDrawModeActive(false);
    addToast('🛑 Screen sharing stopped');
  }, [stopScreenShare, addToast]);

  const handleReaction = useCallback((emoji) => {
    playReactionPop();
    socket?.emit('room:reaction', { roomId, emoji });
  }, [roomId, socket, playReactionPop]);

  const handleKick = useCallback((targetId) => {
    socket?.emit('room:kick', { roomId, targetId });
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
    return (
      <JoinModal
        roomId={roomId}
        isCreating={intendedHost}
        onJoin={handleJoin}
        error={modalError}
        loading={modalLoading}
      />
    );
  }

  const mySocketId = socket?.id;
  const stream = isActualHost ? localStream.current : remoteStream;

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
          streamQuality={streamStats.quality}
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
          />
        </div>

        {/* Sidebar: hidden in fullscreen */}
        {!isFullscreen && (
          <ChatSidebar
            open={sidebarOpen}
            participants={participants}
            mySocketId={mySocketId}
            messages={chatMessages}
            onSendMessage={sendChatMessage}
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
