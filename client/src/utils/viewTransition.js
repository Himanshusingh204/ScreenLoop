// viewTransition.js — Native View Transitions API utility
// Provides fluid cinematic cross-fades during navigation and state switches

export function withViewTransition(callback) {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    return document.startViewTransition(callback);
  }
  return callback();
}
