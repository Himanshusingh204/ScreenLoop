import { useRef, useCallback, useState, useEffect } from 'react';
import { getIceServers } from '../utils/webrtcConfig';

// useMeetRTC — multi-peer WebRTC mesh for /meet
// Phase 1 fixes:
// - accepts socketRef (not socket snapshot) so emits work after connect
// - tracks localStream via ref so late-arriving camera/mic attaches to existing peers
// - ICE candidate queue (out-of-order SDP vs ICE no longer throws)
// - removePeer on leave (closes pc + drops remote stream tile)

export function useMeetRTC(socketRef, localStream) {
  const [peers, setPeers] = useState({});
  const peersRef = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const pendingIceRef = useRef({}); // fromId -> RTCIceCandidateInit[]
  const localStreamRef = useRef(localStream);
  const iceConfigRef = useRef(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Close all peers on unmount so connections never leak
  useEffect(() => () => {
    Object.values(peersRef.current).forEach((pc) => {
      try { pc.close(); } catch { /* ignore */ }
    });
  }, []);

  if (!iceConfigRef.current) {
    try {
      iceConfigRef.current = getIceServers();
    } catch {
      iceConfigRef.current = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    }
  }

  const getSocket = useCallback(() => {
    if (!socketRef) return null;
    // Support both ref-object ({current}) and direct socket instance
    return socketRef.current !== undefined ? socketRef.current : socketRef;
  }, [socketRef]);

  const flushPendingIce = useCallback(async (from) => {
    const pc = peersRef.current[from];
    const queue = pendingIceRef.current[from];
    if (pc && pc.remoteDescription && queue && queue.length > 0) {
      while (queue.length > 0) {
        const candidate = queue.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[meet] Buffered ICE candidate error:', err);
        }
      }
    }
  }, []);

  const createPeer = useCallback((targetId) => {
    const existing = peersRef.current[targetId];
    if (existing) {
      try { existing.close(); } catch { /* ignore */ }
    }

    const pc = new RTCPeerConnection(iceConfigRef.current);
    // keep candidates parked before the SDP arrived
    pendingIceRef.current[targetId] ||= [];

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, stream);
        } catch (err) {
          console.warn('[meet] addTrack error:', err);
        }
      });
    }

    pc.onicecandidate = (e) => {
      const socket = getSocket();
      if (e.candidate && socket) {
        socket.emit('meet:signal', { to: targetId, signalData: { candidate: e.candidate } });
      }
    };

    pc.ontrack = (e) => {
      const incoming = e.streams && e.streams[0];
      if (incoming) {
        setRemoteStreams((prev) => ({ ...prev, [targetId]: incoming }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        try { pc.restartIce(); } catch { /* ignore */ }
      }
    };

    peersRef.current[targetId] = pc;
    setPeers((prev) => ({ ...prev, [targetId]: pc }));

    return pc;
  }, [getSocket]);

  const sendOffer = useCallback(async (targetId) => {
    const socket = getSocket();
    if (!socket) {
      console.warn('[meet] sendOffer skipped: socket not connected yet');
      return;
    }
    let pc = peersRef.current[targetId];
    if (!pc || pc.connectionState === 'closed') pc = createPeer(targetId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('meet:signal', { to: targetId, signalData: { sdp: pc.localDescription } });
    } catch (err) {
      console.error('[meet] sendOffer error:', err);
    }
  }, [createPeer, getSocket]);

  const handleSignal = useCallback(async ({ from, signalData }) => {
    if (!from || !signalData) return;
    const socket = getSocket();

    let pc = peersRef.current[from];

    try {
      if (signalData.sdp) {
        if (!pc || pc.connectionState === 'closed') pc = createPeer(from);
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        await flushPendingIce(from);

        if (signalData.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket?.emit('meet:signal', { to: from, signalData: { sdp: pc.localDescription } });
        }
      }

      if (signalData.candidate) {
        if (!pc) {
          // SDP hasn't arrived yet — park the candidate
          if (!pendingIceRef.current[from]) pendingIceRef.current[from] = [];
          pendingIceRef.current[from].push(signalData.candidate);
          return;
        }
        if (!pc.remoteDescription) {
          if (!pendingIceRef.current[from]) pendingIceRef.current[from] = [];
          pendingIceRef.current[from].push(signalData.candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    } catch (err) {
      console.warn('[meet] handleSignal error:', err);
    }
  }, [createPeer, flushPendingIce, getSocket]);

  const replaceTrack = useCallback((newTrack, kind) => {
    Object.values(peersRef.current).forEach((pc) => {
      try {
        const sender = pc.getSenders().find((s) => s.track?.kind === kind);
        if (sender) sender.replaceTrack(newTrack);
      } catch (err) {
        console.warn('[meet] replaceTrack error:', err);
      }
    });
  }, []);

  const removePeer = useCallback((socketId) => {
    const pc = peersRef.current[socketId];
    if (pc) {
      try { pc.close(); } catch { /* ignore */ }
      delete peersRef.current[socketId];
      setPeers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    }
    delete pendingIceRef.current[socketId];
    setRemoteStreams((prev) => {
      if (!(socketId in prev)) return prev;
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach((pc) => {
      try { pc.close(); } catch { /* ignore */ }
    });
    peersRef.current = {};
    pendingIceRef.current = {};
    setPeers({});
    setRemoteStreams({});
  }, []);

  return {
    peers, remoteStreams, createPeer, sendOffer,
    handleSignal, replaceTrack, removePeer, cleanup,
  };
}
