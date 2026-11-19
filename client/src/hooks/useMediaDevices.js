import { useState, useRef, useCallback, useEffect } from 'react';

export function useMediaDevices() {
  const [localStream, setLocalStream] = useState(null);
  const [devices, setDevices] = useState({ cameras: [], mics: [], speakers: [] });
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const streamRef = useRef(null);

  const enumerateDevices = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        cameras: devs.filter(d => d.kind === 'videoinput'),
        mics: devs.filter(d => d.kind === 'audioinput'),
        speakers: devs.filter(d => d.kind === 'audiooutput'),
      });
    } catch (err) {
      console.error('[useMediaDevices] enumerate error:', err);
    }
  }, []);

  const startStream = useCallback(async (cameraDeviceId, micDeviceId) => {
    try {
      const constraints = {
        video: cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : true,
        audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setLocalStream(stream);
      setMicOn(true);
      setCameraOn(true);
      await enumerateDevices();
      return stream;
    } catch (err) {
      console.error('[useMediaDevices] startStream error:', err);
      throw err;
    }
  }, [enumerateDevices]);

  const toggleMic = useCallback(() => {
    if (!streamRef.current) return micOn;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
      return audioTrack.enabled;
    }
    return micOn;
  }, [micOn]);

  const toggleCamera = useCallback(() => {
    if (!streamRef.current) return cameraOn;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
      return videoTrack.enabled;
    }
    return cameraOn;
  }, [cameraOn]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  return {
    localStream, devices, micOn, cameraOn,
    selectedCamera, setSelectedCamera,
    selectedMic, setSelectedMic,
    startStream, toggleMic, toggleCamera, stopStream,
    enumerateDevices,
  };
}
