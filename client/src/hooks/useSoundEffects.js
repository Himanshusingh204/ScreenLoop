// useSoundEffects.js — Hook for triggering procedural UI audio & haptics
import { useCallback, useEffect } from 'react';
import { sfx } from '../utils/sfxSynth';

export function useSoundEffects(muted = false) {
  useEffect(() => {
    sfx.setMuted(muted);
  }, [muted]);

  const playJoinChime = useCallback(() => {
    sfx.playJoin();
    sfx.vibrate([20, 50, 20]);
  }, []);

  const playLeaveChime = useCallback(() => {
    sfx.playLeave();
    sfx.vibrate(30);
  }, []);

  const playMessagePing = useCallback(() => {
    sfx.playMessage();
    sfx.vibrate(15);
  }, []);

  const playReactionPop = useCallback(() => {
    sfx.playReaction();
    sfx.vibrate(10);
  }, []);

  return {
    playJoinChime,
    playLeaveChime,
    playMessagePing,
    playReactionPop,
  };
}
