// useMeetLiveKit.js — Meet media over the LiveKit SFU (one upload per user, simulcast), replacing the P2P mesh.
// Same shape as useMeetRTC's outputs that MeetRoom consumes: remoteStreams keyed by signaling socketId.
// The token comes over the authenticated socket and the LiveKit identity IS the socket id, so tiles cannot be spoofed.
// If the SFU cannot be reached, `failed` flips true and MeetRoom falls back to the mesh.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { socketIdOf, withTrack, withoutTrack, withoutPeer } from '../utils/sfuTracks';
import { requestSfuToken } from '../utils/sfuToken';

export function useMeetLiveKit({ meetId, socket, localStream, enabled }) {
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tracks, setTracks] = useState({}); // socketId -> MediaStreamTrack[]
  const roomRef = useRef(null);
  const localStreamRef = useRef(localStream);
  localStreamRef.current = localStream;

  useEffect(() => {
    if (!enabled || !meetId || !socket) return undefined;
    let alive = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track, _pub, p) => {
      const id = socketIdOf(p);
      if (id && alive) setTracks((m) => withTrack(m, id, track.mediaStreamTrack));
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, p) => {
      const id = socketIdOf(p);
      if (id && alive) setTracks((m) => withoutTrack(m, id, track.mediaStreamTrack));
    });
    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      const id = socketIdOf(p);
      if (id && alive) setTracks((m) => withoutPeer(m, id));
    });
    room.on(RoomEvent.Disconnected, () => alive && setConnected(false));

    (async () => {
      try {
        const { token, url } = await requestSfuToken(socket, 'meet', meetId);
        await room.connect(url, token);
        if (!alive) return room.disconnect();
        for (const t of localStreamRef.current?.getTracks() || []) await room.localParticipant.publishTrack(t);
        if (alive) setConnected(true);
      } catch (err) {
        console.warn('[meet] SFU unavailable, falling back to P2P mesh:', err.message);
        if (alive) setFailed(true);
      }
    })();

    return () => {
      alive = false;
      room.disconnect();
      roomRef.current = null;
      setConnected(false);
      setTracks({});
    };
  }, [enabled, meetId, socket]);

  // Camera/mic that arrive after connect (permission prompt finishing late) must still be published.
  useEffect(() => {
    const room = roomRef.current;
    if (!connected || !room || !localStream) return;
    const have = new Set([...room.localParticipant.trackPublications.values()].map((p) => p.track?.mediaStreamTrack));
    for (const t of localStream.getTracks()) if (!have.has(t)) room.localParticipant.publishTrack(t).catch(() => {});
  }, [connected, localStream]);

  const replaceTrack = useCallback(async (newTrack, kind) => {
    const room = roomRef.current;
    if (!room) return;
    const pub = [...room.localParticipant.trackPublications.values()].find((p) => p.track?.kind === kind && p.source !== Track.Source.ScreenShare);
    try {
      if (pub?.track) await pub.track.replaceTrack(newTrack);
    } catch (err) {
      console.warn('[meet] SFU replaceTrack error:', err);
    }
  }, []);

  const remoteStreams = useMemo(
    () => Object.fromEntries(Object.entries(tracks).map(([id, ts]) => [id, new MediaStream(ts)])),
    [tracks]
  );

  const noop = useCallback(() => {}, []);
  return { connected, failed, remoteStreams, replaceTrack, removePeer: noop, cleanup: noop };
}
