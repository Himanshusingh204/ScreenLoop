// useWakeLock.js — Screen Wake Lock API
// Keeps the display awake during watch party video playback
import { useEffect, useRef, useCallback } from 'react';

export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || !enabled) return;

    try {
      if (!wakeLockRef.current || wakeLockRef.current.released) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[wakeLock] Screen wake lock released');
        });
        console.log('[wakeLock] Screen wake lock active');
      }
    } catch (err) {
      console.warn('[wakeLock] Request failed:', err.name, err.message);
    }
  }, [enabled]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return { requestWakeLock, releaseWakeLock };
}
