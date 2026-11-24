import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useMeetRTC } from '../hooks/useMeetRTC';
import { useActiveSpeaker } from '../hooks/useActiveSpeaker';
import { useSignalingSocket } from '../hooks/useSignalingSocket';
import MeetLobby from '../components/meet/MeetLobby';
import MeetGrid from '../components/meet/MeetGrid';
import MeetControlBar from '../components/meet/MeetControlBar';
import MeetChatDrawer from '../components/meet/MeetChatDrawer';
import MeetPeopleDrawer from '../components/meet/MeetPeopleDrawer';
import MeetReactions from '../components/meet/MeetReactions';
import MeetDeviceModal from '../components/meet/MeetDeviceModal';
import '../styles/meet.css';
import '../styles/room-redesign.css';

// Single canonical signaling URL (must match Room.jsx). VITE_SIGNALING_URL kept
// as deprecated fallback so existing deploys don't break during migration.
const SOCKET_URL =
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_SIGNALING_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'));

export default function MeetRoom() {
  const { meetId } = useParams();
  const navigate = useNavigate();
  const [inLobby, setInLobby] = useState(true);
  const [name, setName] = useState(() => localStorage.getItem('sl-name') || '');
  const [gender, setGender] = useState('neutral');
  const [participants, setParticipants] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showReactions, setShowReactions] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Shared signaling connection (Phase 2: useSignalingSocket — socket persists
  // across lobby → call transition so the local stream isn't torn down).
  const { socket, socketRef } = useSignalingSocket(SOCKET_URL);

  const {
    localStream, devices, micOn, cameraOn,
    selectedCamera, setSelectedCamera,
    selectedMic, setSelectedMic,
    startStream, toggleMic, toggleCamera, stopStream,
  } = useMediaDevices();

  const {
    remoteStreams, sendOffer, handleSignal,
    replaceTrack, removePeer, cleanup: cleanupRTC,
  } = useMeetRTC(socketRef, localStream);

  const { activeSpeaker } = useActiveSpeaker(remoteStreams, participants);

  // Stable callback refs so the socket effect doesn't reconnect on every render.
  const sendOfferRef = useRef(sendOffer);
  const handleSignalRef = useRef(handleSignal);
  const removePeerRef = useRef(removePeer);
  const cleanupRef = useRef(cleanupRTC);
  const stopStreamRef = useRef(stopStream);
  sendOfferRef.current = sendOffer;
  handleSignalRef.current = handleSignal;
  removePeerRef.current = removePeer;
  cleanupRef.current = cleanupRTC;
  stopStreamRef.current = stopStream;

  // Socket subscriptions (join/rejoin, signaling relay, presence).
  // Listeners re-subscribe when join params change; the underlying socket
  // is owned by useSignalingSocket and survives lobby → call transitions.
  useEffect(() => {
    const s = socket;
    if (!s) return undefined;

    const handleConnect = () => {
      if (!inLobby && name) {
        s.emit('meet:join', { meetId, name, gender, micOn, cameraOn });
      }
    };

    s.on('connect', handleConnect);

    const handleJoined = ({ participants: p }) => {
      // Exclude self from remote participants so local tile isn't duplicated
      const remoteOnly = (p || []).filter((participant) => participant.socketId !== s.id);
      setParticipants(remoteOnly);
      // Initiate offers to all existing remote participants
      remoteOnly.forEach((participant) => {
        sendOfferRef.current(participant.socketId);
      });
    };
    s.on('meet:joined', handleJoined);

    const handleUserJoined = ({ socketId, name: userName, gender: userGender, micOn: m, cameraOn: c }) => {
      if (socketId === s.id) return;
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === socketId)) return prev;
        return [...prev, { socketId, name: userName, gender: userGender, micOn: m, cameraOn: c }];
      });
    };
    s.on('meet:user-joined', handleUserJoined);

    const handleSignal = (payload) => handleSignalRef.current(payload);
    s.on('meet:signal', handleSignal);

    const handleStateChange = ({ socketId, micOn: m, cameraOn: c, isSharing, handRaised: h }) => {
      setParticipants((prev) => prev.map((p) =>
        p.socketId === socketId ? { ...p, micOn: m, cameraOn: c, isSharing, handRaised: h } : p
      ));
    };
    s.on('meet:state-change', handleStateChange);

    const handleReaction = ({ name: reactName, emoji }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `reaction_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          system: true,
          text: `${reactName || 'Someone'} reacted ${emoji}`,
          timestamp: Date.now(),
        },
      ]);
    };
    s.on('meet:reaction', handleReaction);

    const handleChat = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    };
    s.on('meet:chat', handleChat);

    const handleUserLeft = ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      removePeerRef.current(socketId);
    };
    s.on('meet:user-left', handleUserLeft);

    const handleClosed = () => {
      navigate('/meet');
    };
    s.on('meet:closed', handleClosed);

    return () => {
      s.off('connect', handleConnect);
      s.off('meet:joined', handleJoined);
      s.off('meet:user-joined', handleUserJoined);
      s.off('meet:signal', handleSignal);
      s.off('meet:state-change', handleStateChange);
      s.off('meet:reaction', handleReaction);
      s.off('meet:chat', handleChat);
      s.off('meet:user-left', handleUserLeft);
      s.off('meet:closed', handleClosed);
    };
  }, [socket, meetId, inLobby, name, gender, micOn, cameraOn, navigate]);

  // Teardown media on unmount only (socket is owned by useSignalingSocket).
  useEffect(() => {
    return () => {
      cleanupRef.current();
      stopStreamRef.current();
    };
  }, []);

  const handleJoin = async (joinName, joinGender, joinMic, joinCam) => {
    setName(joinName);
    setGender(joinGender);
    try {
      localStorage.setItem('sl-name', joinName);
    } catch {
      /* ignore */
    }

    try {
      if (!localStream) {
        await startStream(selectedCamera || undefined, selectedMic || undefined);
      }
    } catch (err) {
      console.warn('[MeetRoom] Media device start error, joining call:', err);
    }

    setInLobby(false);

    socketRef.current?.emit('meet:join', {
      meetId,
      name: joinName,
      gender: joinGender,
      micOn: joinMic,
      cameraOn: joinCam,
    });
  };

  const handleToggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    socketRef.current?.emit('meet:state-change', { handRaised: next });
  };

  const handleToggleMic = () => {
    const next = toggleMic();
    socketRef.current?.emit('meet:state-change', { micOn: next });
  };

  const handleToggleCamera = () => {
    const next = toggleCamera();
    socketRef.current?.emit('meet:state-change', { cameraOn: next });
  };

  const handleShareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      replaceTrack(screenTrack, 'video');
      socketRef.current?.emit('meet:state-change', { isSharing: true });

      screenTrack.onended = () => {
        const camTrack = localStream?.getVideoTracks()[0];
        if (camTrack) replaceTrack(camTrack, 'video');
        socketRef.current?.emit('meet:state-change', { isSharing: false });
      };
    } catch (err) {
      console.error('[MeetRoom] share screen error:', err);
    }
  };

  const handleSendChat = (text) => {
    socketRef.current?.emit('meet:chat', { text });
  };

  const handleReaction = (emoji) => {
    socketRef.current?.emit('meet:reaction', { emoji });
    setShowReactions(false);
  };

  const handleLeave = () => {
    socketRef.current?.emit('meet:leave');
    stopStream();
    cleanupRTC();
    navigate('/meet');
  };

  if (inLobby) {
    return (
      <MeetLobby
        meetId={meetId}
        name={name}
        gender={gender}
        devices={devices}
        localStream={localStream}
        micOn={micOn}
        cameraOn={cameraOn}
        selectedCamera={selectedCamera}
        selectedMic={selectedMic}
        onSelectCamera={setSelectedCamera}
        onSelectMic={setSelectedMic}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onStartStream={startStream}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <div className="meet-room">
      <div className="meet-grid-container">
        <MeetGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
          activeSpeaker={activeSpeaker}
          localName={name}
        />
      </div>

      <MeetControlBar
        micOn={micOn}
        cameraOn={cameraOn}
        handRaised={handRaised}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleHand={handleToggleHand}
        onShareScreen={handleShareScreen}
        onToggleReactions={() => setShowReactions(!showReactions)}
        onToggleChat={() => setChatOpen(!chatOpen)}
        onTogglePeople={() => setPeopleOpen(!peopleOpen)}
        onToggleInfo={() => setShowInfo(!showInfo)}
        onToggleSettings={() => setDeviceModalOpen(!deviceModalOpen)}
        onLeave={handleLeave}
        meetId={meetId}
        chatCount={chatMessages.length}
        participantCount={participants.length + 1}
      />

      {showReactions && (
        <MeetReactions onReact={handleReaction} onClose={() => setShowReactions(false)} />
      )}

      {peopleOpen && (
        <MeetPeopleDrawer
          participants={[{ socketId: socketRef.current?.id, name, gender, micOn, cameraOn, isSelf: true }, ...participants]}
          onClose={() => setPeopleOpen(false)}
        />
      )}

      {chatOpen && (
        <MeetChatDrawer
          messages={chatMessages}
          onSend={handleSendChat}
          onClose={() => setChatOpen(false)}
        />
      )}

      {showInfo && (
        <div className="meet-info-overlay" onClick={() => setShowInfo(false)}>
          <div className="meet-info-card" onClick={e => e.stopPropagation()}>
            <h2>Meeting Info</h2>
            <p>Share this code to invite others:</p>
            <div
              className="meet-link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  try {
                    const input = document.createElement('input');
                    input.value = window.location.href;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch (e) {
                    console.error('Clipboard copy failed:', e);
                  }
                }
              }}
              style={{ cursor: 'pointer' }}
              title="Click to copy room link"
            >
              {copied ? '✓ Link copied!' : meetId}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click to copy link
            </p>
            <button className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }} onClick={() => setShowInfo(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {deviceModalOpen && (
        <MeetDeviceModal
          devices={devices}
          selectedCamera={selectedCamera}
          selectedMic={selectedMic}
          onSelectCamera={setSelectedCamera}
          onSelectMic={setSelectedMic}
          onClose={() => setDeviceModalOpen(false)}
        />
      )}
    </div>
  );
}
