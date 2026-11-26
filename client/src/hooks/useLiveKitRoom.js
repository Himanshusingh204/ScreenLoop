// ─────────────────────────────────────────────────────────────────────────────
// useLiveKitRoom.js — LiveKit media orchestration hook for Screenloop
// Handles token acquisition, SFU room connection, screen sharing with
// cinema audio, and track lifecycle management.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track, ExternalE2EEKeyProvider, isE2EESupported } from 'livekit-client';
import { CINEMA_AUDIO_PRESET } from '../utils/audioPresets';
import { requestSfuToken } from '../utils/sfuToken';

/**
 * Hook to manage LiveKit SFU room connection and media streams
 */
export function useLiveKitRoom({
  socket, // authenticated signaling socket: the server issues our LiveKit token over it
  roomId,
  name,
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
  const [describedAvailable, setDescribedAvailable] = useState(false); // viewer: host is publishing a described-audio track
  const [describing, setDescribing] = useState(false); // host: publishing it
  const [e2eeActive, setE2eeActive] = useState(false);
  const roomRef = useRef(null);
  const keyProviderRef = useRef(null);
  // Latest rotated media key + epoch. Survives LiveKit reconnects (e.g. when promoted to host) so a rebuild never
  // falls back to the URL-fragment key that a removed user still holds.
  const keyStateRef = useRef({ key: null, epoch: 0 });

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
    if (!enabled || !roomId || !name || !socket) return;

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
        // 1. Token over the authenticated socket (membership + PIN already enforced; host-only publish decided server-side)
        const { token, url } = await requestSfuToken(socket, 'watch', roomId);

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
          setE2eeActive(false);
          setIsSharing(false);
          setRemoteScreenStream(null);
          setRemoteAudioStream(null);
          setDescribedAvailable(false);
          setDescribing(false);
        });

        // When a remote participant shares their screen
        lkRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.source === Track.Source.ScreenShare) {
            console.log('[LiveKit] Subscribed to remote screen share track');
            const mediaStream = new MediaStream([track.mediaStreamTrack]);
            setRemoteScreenStream(mediaStream);
            if (onScreenTrackSubscribedRef.current) onScreenTrackSubscribedRef.current(mediaStream, participant);
          } else if (track.source === Track.Source.Microphone) {
            // Described audio: attached muted; the viewer opts in with setDescribedListening
            const el = track.attach();
            el.id = 'livekit-described-audio';
            el.muted = true;
            document.body.appendChild(el);
            setDescribedAvailable(true);
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
          } else if (track.source === Track.Source.Microphone) {
            track.detach();
            document.getElementById('livekit-described-audio')?.remove();
            setDescribedAvailable(false);
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
          await keyProvider.setKey(keyStateRef.current.key ?? e2eeKey);
          await lkRoom.setE2EEEnabled(true);
        }
        await lkRoom.connect(url, token);
        // Only claim E2EE once actually connected (a failed connect falls back to P2P, which is not frame-encrypted)
        if (keyProvider && isMounted) setE2eeActive(true);
      } catch (err) {
        if (!isMounted) return;
        console.warn('[LiveKit] SFU Connection could not be established (using P2P fallback):', err.message);
        setError(err.message);
        setE2eeActive(false);
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
  }, [socket, roomId, name, isHost, enabled, e2eeKey]);

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

  // Host: publish / unpublish the described-audio (narration) track
  const setDescribedAudio = useCallback(async (on) => {
    await roomRef.current?.localParticipant?.setMicrophoneEnabled(on);
    setDescribing(on);
  }, []);

  // Viewer: hear or silence the host's narration
  const setDescribedListening = useCallback((on) => {
    const el = document.getElementById('livekit-described-audio');
    if (el) {
      el.muted = !on;
      if (on) el.play?.().catch(() => {});
    }
  }, []);

  // Swap in a rotated media key (delivered per-recipient by MediaKeyCoordinator)
  const rotateKey = useCallback(async (key, epoch = 0) => {
    keyStateRef.current = { key, epoch };
    await keyProviderRef.current?.setKey(key);
  }, []);

  return {
    e2eeActive,
    describedAvailable,
    describing,
    setDescribedAudio,
    setDescribedListening,
    rotateKey,
    keyStateRef,
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
