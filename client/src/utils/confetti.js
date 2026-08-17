// confetti.js — Celebration particle burst engine using canvas-confetti
import confetti from 'canvas-confetti';

/**
 * Fires a celebratory burst from both bottom corners (cannon style)
 */
export function fireRoomLaunchConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio, opts) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

/**
 * Fires a mini emoji/color pop at a specific screen position
 */
export function fireReactionPop(xRatio = 0.5, yRatio = 0.8) {
  confetti({
    particleCount: 25,
    angle: 90,
    spread: 45,
    origin: { x: xRatio, y: yRatio },
    zIndex: 9999,
    colors: ['#7c5cfc', '#00e5ff', '#ffd600', '#ff3b30', '#00e676'],
    disableForReducedMotion: true,
  });
}
