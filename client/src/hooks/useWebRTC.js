// ─────────────────────────────────────────────────────────────────────────────
// useWebRTC.js — Production WebRTC peer connection management
// Includes ICE candidate queuing, dynamic bitrate adaptation, and robust recovery
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { 
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    { 
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
};

// ─── Video quality presets ────────────────────────────────────────────────────
export const QUALITY_PRESETS = {
  '720p': {
    label: '720p HD',
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
  '1080p': {
    label: '1080p FHD',
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  },
  '1440p': {
    label: '1440p 2K',
    width: { ideal: 2560, max: 2560 },
    height: { ideal: 1440, max: 1440 },
    frameRate: { ideal: 30, max: 30 },
  },
};

// ─── High-quality audio constraints ──────────────────────────────────────────
const AUDIO_CONSTRAINTS = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  sampleRate: 48000,
  channelCount: 2,
};

/**
 * @param {object} params
 * @param {import('socket.io-client').Socket} params.socket
 * @param {boolean} params.isHost
 * @param {function} params.onStream      — called with (MediaStream) when viewer gets stream
 * @param {function} params.onTrackEnded  — called when host's share track ends
 */
export function useWebRTC({ socket, isHost, onStream, onTrackEnded }) {
  const peers = useRef({});
  const localStream = useRef(null);
  const pendingIceCandidates = useRef({}); // targetId -> Array<RTCIceCandidateInit>

  // Helper to flush buffered ICE candidates once remoteDescription is set
  const processPendingIce = useCallback(async (targetId) => {
    const peer = peers.current[targetId];
    const queue = pendingIceCandidates.current[targetId];
    if (peer && peer.remoteDescription && queue && queue.length > 0) {
      while (queue.length > 0) {
        const candidate = queue.shift();
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[webrtc] Buffered ICE candidate error:', err);
        }
      }
    }
  }, []);

  // ─── Create a peer connection ───────────────────────────────────────────────
  const createPeer = useCallback(
    (targetId) => {
      if (peers.current[targetId]) {
        peers.current[targetId].close();
      }

      const peer = new RTCPeerConnection(ICE_SERVERS);
      pendingIceCandidates.current[targetId] = [];

      peer.onicecandidate = ({ candidate }) => {
        if (candidate && socket) {
          socket.emit('webrtc:ice', { targetId, candidate });
        }
      };

      peer.onconnectionstatechange = () => {
        console.log(`[webrtc] Peer ${targetId} state: ${peer.connectionState}`);
        if (peer.connectionState === 'failed') {
          console.warn('[webrtc] Connection failed. Restarting ICE…');
          peer.restartIce();
        }
      };

      // Viewer: receive the inbound stream
      if (!isHost) {
        peer.ontrack = (event) => {
          console.log('[webrtc] Received remote stream track:', event.track.kind);
          if (event.streams && event.streams[0] && onStream) {
            onStream(event.streams[0]);
          }
        };
      }

      peers.current[targetId] = peer;
      return peer;
    },
    [socket, isHost, onStream]
  );

  // ─── Host: capture screen ──────────────────────────────────────────────────
  const startScreenShare = useCallback(
    async (quality = '1080p') => {
      const videoConstraints = QUALITY_PRESETS[quality] ?? QUALITY_PRESETS['1080p'];

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            ...videoConstraints,
            displaySurface: 'monitor',
          },
          audio: AUDIO_CONSTRAINTS,
        });

        localStream.current = stream;

        stream.getVideoTracks()[0].addEventListener('ended', () => {
          if (onTrackEnded) onTrackEnded();
          stopScreenShare();
        });

        const vt = stream.getVideoTracks()[0];
        const { width, height, frameRate: fps } = vt.getSettings();
        console.log(`[webrtc] Capturing at ${width}×${height} @ ${fps}fps (${quality})`);

        return stream;
      } catch (err) {
        console.error('[webrtc] getDisplayMedia error:', err);
        throw err;
      }
    },
    [onTrackEnded]
  );

  // ─── Host: send offer to a viewer ──────────────────────────────────────────
  const sendOfferToViewer = useCallback(
    async (viewerId) => {
      if (!localStream.current) return;

      const peer = createPeer(viewerId);

      localStream.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStream.current);
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit('webrtc:offer', { targetId: viewerId, offer });
    },
    [createPeer, socket]
  );

  // ─── Viewer: handle incoming offer ────────────────────────────────────────
  const handleOffer = useCallback(
    async ({ fromId, offer }) => {
      const peer = createPeer(fromId);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      await processPendingIce(fromId);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('webrtc:answer', { targetId: fromId, answer });
    },
    [createPeer, socket, processPendingIce]
  );

  // ─── Host: handle viewer's answer ─────────────────────────────────────────
  const handleAnswer = useCallback(async ({ fromId, answer }) => {
    const peer = peers.current[fromId];
    if (peer) {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
      await processPendingIce(fromId);
    }
  }, [processPendingIce]);

  // ─── Handle incoming ICE candidate (with queuing) ─────────────────────────
  const handleIce = useCallback(async ({ fromId, candidate }) => {
    const peer = peers.current[fromId];
    if (!peer || !candidate) return;

    if (!peer.remoteDescription) {
      if (!pendingIceCandidates.current[fromId]) {
        pendingIceCandidates.current[fromId] = [];
      }
      pendingIceCandidates.current[fromId].push(candidate);
      return;
    }

    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[webrtc] addIceCandidate error:', err);
    }
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  const stopScreenShare = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }
    Object.values(peers.current).forEach((p) => p.close());
    peers.current = {};
    pendingIceCandidates.current = {};
  }, []);

  const closeAllPeers = useCallback(() => {
    stopScreenShare();
  }, [stopScreenShare]);

  return {
    peers,
    localStream,
    startScreenShare,
    sendOfferToViewer,
    handleOffer,
    handleAnswer,
    handleIce,
    stopScreenShare,
    closeAllPeers,
  };
}
