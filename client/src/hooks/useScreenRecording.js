import { useState, useRef, useCallback } from 'react';

export function useScreenRecording(stream) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  const startRecording = useCallback(() => {
    if (!stream) return;
    
    chunks.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenloop-recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    mediaRecorder.current = recorder;
    recorder.start(1000); // collect data every 1s
    setIsRecording(true);
    setRecordingTime(0);
    
    timer.current = setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
  }, [stream]);

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

  return { isRecording, recordingTime, startRecording, stopRecording };
}
