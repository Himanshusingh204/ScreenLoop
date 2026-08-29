// useWakeLock.js — Screen Wake Lock API
// Keeps the display awake during watch party video playback.
// Pattern: request while media is active, re-acquire on visibilitychange
// (MDN best practice — locks are auto-released when the tab is hidden and
// cannot be re-requested until the document is visible again).
import { useEffect, useRef, useCallback } from 'react';

export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef(null);
  const enabledRef = useRef(enabled);
  const timersRef = useRef([]);

  // Keep the latest `enabled` without re-creating requestWakeLock below.
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const requestWakeLock = useCallback(async (isRetry = false) => {
    if (!('wakeLock' in navigator) || !enabledRef.current) return;

    try {
      if (!wakeLockRef.current || wakeLockRef.current.released) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        // A released sentinel can never be re-used; the lock is re-acquired on
        // visibilitychange (see effect below), never from this handler — the
        // document is hidden here, so a request would just throw.
        wakeLockRef.current.addEventListener('release', () => {
          console.debug('[wakeLock] Screen wake lock released by system');
        });
        console.debug('[wakeLock] Screen wake lock active');
      }
    } catch (err) {
      console.warn('[wakeLock] Request failed:', err.name, err.message);
      // Task 54: Retry once after 2 seconds if not already a retry.
      if (!isRetry) {
        const timer = setTimeout(() => requestWakeLock(true), 2000);
        timersRef.current.push(timer);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch (err) {
        console.warn('[wakeLock] Release failed:', err.name, err.message);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clear any pending retries and drop the lock on unmount.
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return { requestWakeLock, releaseWakeLock };
}