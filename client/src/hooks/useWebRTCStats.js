// ─────────────────────────────────────────────────────────────────────────────
// useWebRTCStats.js — Real-time WebRTC stream quality and network telemetry
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';

/**
 * @param {object} params
 * @param {React.MutableRefObject<object>} params.peersRef - Map of targetId -> RTCPeerConnection
 * @param {boolean} params.isHost
 * @param {boolean} params.isSharing
 * @param {boolean} params.enabled
 */
export function useWebRTCStats({ peersRef, isHost, isSharing, enabled = true }) {
  const [stats, setStats] = useState({
    fps: 0,
    bitrateKbps: 0,
    resolution: '--',
    rttMs: 0,
    packetLoss: 0,
    quality: 'good', // 'good' | 'fair' | 'poor'
  });

  const prevStatsRef = useRef({
    timestamp: 0,
    bytes: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      if (!peersRef?.current) return;
      const peerList = Object.values(peersRef.current);
      if (peerList.length === 0) {
        setStats((prev) => ({ ...prev, bitrateKbps: 0, fps: 0, resolution: '--' }));
        return;
      }

      // Pick the primary active peer
      const peer = peerList[0];
      if (!peer || peer.connectionState !== 'connected') {
        return;
      }

      try {
        const statsReport = await peer.getStats();
        let currentBytes = 0;
        let currentFps = 0;
        let width = 0;
        let height = 0;
        let rtt = 0;
        let packetsLost = 0;
        let totalPackets = 0;
        let now = 0;

        statsReport.forEach((report) => {
          if (isHost && report.type === 'outbound-rtp' && report.kind === 'video') {
            currentBytes += report.bytesSent || 0;
            currentFps = report.framesPerSecond || currentFps;
            now = report.timestamp;
          } else if (!isHost && report.type === 'inbound-rtp' && report.kind === 'video') {
            currentBytes += report.bytesReceived || 0;
            currentFps = report.framesPerSecond || currentFps;
            packetsLost = report.packetsLost || 0;
            totalPackets = (report.packetsReceived || 0) + packetsLost;
            width = report.frameWidth || width;
            height = report.frameHeight || height;
            now = report.timestamp;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
              rtt = Math.round(report.currentRoundTripTime * 1000);
            }
          } else if (report.type === 'track' && report.kind === 'video') {
            if (report.frameWidth) width = report.frameWidth;
            if (report.frameHeight) height = report.frameHeight;
          }
        });

        // Compute bitrate
        let bitrateKbps = 0;
        if (prevStatsRef.current.timestamp && now > prevStatsRef.current.timestamp) {
          const timeDiffSec = (now - prevStatsRef.current.timestamp) / 1000;
          const bytesDiff = currentBytes - prevStatsRef.current.bytes;
          bitrateKbps = Math.max(0, Math.round((bytesDiff * 8) / (timeDiffSec * 1000)));
        }

        prevStatsRef.current = { timestamp: now, bytes: currentBytes };

        const lossPct = totalPackets > 0 ? ((packetsLost / totalPackets) * 100).toFixed(1) : 0;

        // Determine quality tier
        let quality = 'good';
        if (lossPct > 5 || (rtt > 250 && rtt > 0)) {
          quality = 'poor';
        } else if (lossPct > 1 || (rtt > 120 && rtt > 0)) {
          quality = 'fair';
        }

        setStats({
          fps: Math.round(currentFps) || (isSharing ? 30 : 0),
          bitrateKbps,
          resolution: width && height ? `${width}×${height}` : isSharing ? 'HD' : '--',
          rttMs: rtt,
          packetLoss: parseFloat(lossPct),
          quality,
        });
      } catch (err) {
        console.debug('[webrtc-stats] Error gathering stats:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [peersRef, isHost, isSharing, enabled]);

  return stats;
}
