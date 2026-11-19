import { useState, useEffect, useRef, useCallback } from 'react';

export function useActiveSpeaker(remoteStreams, participants) {
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const analyzersRef = useRef({});
  const intervalsRef = useRef({});

  const startMonitoring = useCallback((socketId, stream) => {
    if (analyzersRef.current[socketId]) return;
    
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      analyzersRef.current[socketId] = { ctx, source, analyzer };
      
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      
      intervalsRef.current[socketId] = setInterval(() => {
        analyzer.getByteFrequencyData(dataArray);
        const values = dataArray.reduce((a, b) => a + b, 0);
        const rms = Math.sqrt(values / dataArray.length) / 255;
        
        if (rms > 0.04) {
          setActiveSpeaker(socketId);
        }
      }, 100);
    } catch (err) {
      console.error('[useActiveSpeaker] monitoring error:', err);
    }
  }, []);

  const stopMonitoring = useCallback((socketId) => {
    if (intervalsRef.current[socketId]) {
      clearInterval(intervalsRef.current[socketId]);
      delete intervalsRef.current[socketId];
    }
    if (analyzersRef.current[socketId]) {
      analyzersRef.current[socketId].ctx.close();
      delete analyzersRef.current[socketId];
    }
  }, []);

  useEffect(() => {
    if (!remoteStreams) return;
    
    Object.entries(remoteStreams).forEach(([socketId, stream]) => {
      if (stream) startMonitoring(socketId, stream);
    });
    
    return () => {
      Object.keys(intervalsRef.current).forEach(stopMonitoring);
    };
  }, [remoteStreams, startMonitoring, stopMonitoring]);

  useEffect(() => {
    // Reset active speaker after 2 seconds of silence
    const timer = setTimeout(() => setActiveSpeaker(null), 2000);
    return () => clearTimeout(timer);
  }, [activeSpeaker]);

  return { activeSpeaker };
}
