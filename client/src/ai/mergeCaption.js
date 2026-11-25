// mergeCaption.js — removes the words a new caption repeats from the previous one (overlapping windows).
const MIN_REPEAT = 2; // a single shared word ("the") is common; only drop 2+ word overlaps
const MAX_TAIL_WORDS = 12;

const tokens = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean);
const keyOf = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Returns newText without its longest leading word sequence that equals the end of previousText.
 * Case and punctuation are ignored when comparing; empty input returns newText unchanged.
 */
export function mergeCaption(previousText, newText) {
  const next = tokens(newText);
  const prev = tokens(previousText).slice(-MAX_TAIL_WORDS).map(keyOf);
  const nextKeys = next.map(keyOf);
  for (let k = Math.min(prev.length, next.length); k >= MIN_REPEAT; k--) {
    const tailMatches = prev.slice(prev.length - k).every((p, i) => p && p === nextKeys[i]);
    if (tailMatches) return next.slice(k).join(' ');
  }
  return String(newText ?? '');
}
