// support.js — pure helpers shared by the caption hook and worker.
export function isCaptionSupported(env = globalThis) {
  const AC = env.AudioContext || env.webkitAudioContext;
  return !!(env.Worker && env.WebAssembly && AC);
}

// Whisper emits "[BLANK_AUDIO]" / "(music)" on silence; also cap length (captions render as text only).
export function cleanCaption(text) {
  const t = String(text || '').trim();
  if (!t || /^[[(].*[\])]$/.test(t)) return '';
  return t.slice(0, 500);
}
