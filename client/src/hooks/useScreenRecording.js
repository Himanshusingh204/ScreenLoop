import { useState, useRef, useCallback, useEffect } from 'react';

export function useScreenRecording(stream) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  // Clear the recording timer on unmount
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!stream) return;

    chunks.current = [];
    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType = mimeCandidates.find(
      (m) => typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)
    ) || '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.current.push(e.data);
    };

    recorder.onstop = () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenloop-recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    mediaRecorder.current = recorder;
    recorder.start(1000); // collect data every 1s
    setIsRecording(true);
    setRecordingTime(0);

    timer.current = setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
  }, [stream]);

  return { isRecording, recordingTime, startRecording, stopRecording };
}
