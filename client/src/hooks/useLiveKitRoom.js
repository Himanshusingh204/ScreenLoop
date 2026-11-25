// ─────────────────────────────────────────────────────────────────────────────
// useLiveKitRoom.js — LiveKit media orchestration hook for Screenloop
// Handles token acquisition, SFU room connection, screen sharing with
// cinema audio, and track lifecycle management.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track, ExternalE2EEKeyProvider, isE2EESupported } from 'livekit-client';
import { CINEMA_AUDIO_PRESET } from '../utils/audioPresets';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'));

/**
 * Hook to manage LiveKit SFU room connection and media streams
 */
export function useLiveKitRoom({
  roomId,
  name,
  pin,
  isHost,
  e2eeKey = null, // URL-hash room key: when set (and supported), media frames are end-to-end encrypted
  enabled = true,
  onScreenTrackSubscribed,
  onScreenTrackUnsubscribed,
}) {
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [remoteAudioStream, setRemoteAudioStream] = useState(null); // cinema audio, for on-device captions
  const [isSharing, setIsSharing] = useState(false);
  const [e2eeActive, setE2eeActive] = useState(false);
  const roomRef = useRef(null);
  const keyProviderRef = useRef(null);

  // Keep latest callbacks in refs so the connection effect doesn't re-run
  // (and tear down the SFU room) on every parent render.
  const onScreenTrackSubscribedRef = useRef(onScreenTrackSubscribed);
  const onScreenTrackUnsubscribedRef = useRef(onScreenTrackUnsubscribed);
  useEffect(() => {
    onScreenTrackSubscribedRef.current = onScreenTrackSubscribed;
    onScreenTrackUnsubscribedRef.current = onScreenTrackUnsubscribed;
  }, [onScreenTrackSubscribed, onScreenTrackUnsubscribed]);

  // Connect to LiveKit Room when enabled and name/roomId are present
  useEffect(() => {
    if (!enabled || !roomId || !name) return;

    let isMounted = true;
    const keyProvider = e2eeKey && isE2EESupported() ? new ExternalE2EEKeyProvider() : null;
    keyProviderRef.current = keyProvider;
    const lkRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      ...(keyProvider
        ? { e2ee: { keyProvider, worker: new Worker(new URL('livekit-client/e2ee-worker', import.meta.url), { type: 'module' }) } }
        : {}),
    });
    roomRef.current = lkRoom;

    async function connectToLiveKit() {
      setIsConnecting(true);
      setError(null);

      try {
        // 1. Fetch access token from our Express backend
        const res = await fetch(`${SERVER_URL}/api/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            participantName: name,
            pin: pin || undefined,
            isHost: !!isHost,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${res.status}`);
        }

        const { token, url } = await res.json();
        if (!token || !url) {
          throw new Error('Invalid token response from server');
        }

        if (!isMounted) return;

        // 2. Wire up Room events
        lkRoom.on(RoomEvent.Connected, () => {
          if (!isMounted) return;
          console.log('[LiveKit] Connected to SFU room:', roomId);
          setIsConnected(true);
          setIsConnecting(false);
          setRoom(lkRoom);
        });

        lkRoom.on(RoomEvent.Disconnected, () => {
          if (!isMounted) return;
          console.log('[LiveKit] Disconnected from room');
          setIsConnected(false);
          setIsSharing(false);
          setRemoteScreenStream(null);
          setRemoteAudioStream(null);
        });

        // When a remote participant shares their screen
        lkRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.source === Track.Source.ScreenShare) {
            console.log('[LiveKit] Subscribed to remote screen share track');
            const mediaStream = new MediaStream([track.mediaStreamTrack]);
            setRemoteScreenStream(mediaStream);
            if (onScreenTrackSubscribedRef.current) onScreenTrackSubscribedRef.current(mediaStream, participant);
          } else if (track.source === Track.Source.ScreenShareAudio) {
            console.log('[LiveKit] Subscribed to cinema audio track');
            setRemoteAudioStream(new MediaStream([track.mediaStreamTrack]));
            // Attach the audio track to a playable element in the DOM
            const audioEl = track.attach();
            audioEl.id = 'livekit-cinema-audio';
            audioEl.autoplay = true;
            if (audioEl && typeof audioEl.play === 'function') {
              audioEl.play().catch(() => {});
            }
            if (audioEl && audioEl.parentElement !== document.body) {
              document.body.appendChild(audioEl);
            }
          }
        });

        lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.source === Track.Source.ScreenShare) {
            console.log('[LiveKit] Remote screen share stopped');
            track.detach();
            setRemoteScreenStream(null);
            if (onScreenTrackUnsubscribedRef.current) onScreenTrackUnsubscribedRef.current();
          } else if (track.source === Track.Source.ScreenShareAudio) {
            console.log('[LiveKit] Remote cinema audio stopped');
            setRemoteAudioStream(null);
            track.detach();
            const el = document.getElementById('livekit-cinema-audio');
            if (el) {
              el.pause?.();
              el.remove();
            }
          }
        });

        // 3. Key first, then enable E2EE, then connect: no frame is ever sent unencrypted
        if (keyProvider) {
          await keyProvider.setKey(e2eeKey);
          await lkRoom.setE2EEEnabled(true);
          if (isMounted) setE2eeActive(true);
        }
        await lkRoom.connect(url, token);
      } catch (err) {
        if (!isMounted) return;
        console.warn('[LiveKit] SFU Connection could not be established (using P2P fallback):', err.message);
        setError(err.message);
        setIsConnecting(false);
      }
    }

    connectToLiveKit();

    return () => {
      isMounted = false;
      setE2eeActive(false);
      keyProviderRef.current = null;
      if (lkRoom) {
        lkRoom.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomId, name, pin, isHost, enabled, e2eeKey]);

  // Start Screen Sharing with Cinema Audio
  const startScreenShare = useCallback(async () => {
    const currentRoom = roomRef.current;
    if (!currentRoom || !currentRoom.localParticipant) {
      throw new Error('LiveKit room is not connected');
    }

    try {
      await currentRoom.localParticipant.setScreenShareEnabled(true, {
        audio: CINEMA_AUDIO_PRESET,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
      });
      setIsSharing(true);
    } catch (err) {
      setIsSharing(false);
      throw err;
    }
  }, []);

  // Stop Screen Sharing
  const stopScreenShare = useCallback(async () => {
    const currentRoom = roomRef.current;
    if (currentRoom && currentRoom.localParticipant) {
      await currentRoom.localParticipant.setScreenShareEnabled(false);
    }
    setIsSharing(false);
  }, []);

  // Swap in a rotated media key (delivered per-recipient by MediaKeyCoordinator)
  const rotateKey = useCallback(async (key) => {
    await keyProviderRef.current?.setKey(key);
  }, []);

  return {
    e2eeActive,
    rotateKey,
    remoteAudioStream,
    room,
    isConnected,
    isConnecting,
    error,
    remoteScreenStream,
    isSharing,
    startScreenShare,
    stopScreenShare,
  };
}
