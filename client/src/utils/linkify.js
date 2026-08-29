// linkify.js — Split text into text/link segments so URLs render as clickable links.
// Only http/https URLs are matched, so `javascript:` (or any other scheme) can never
// become an href. React escapes all rendered content, preventing XSS.

// Matches http(s):// URLs without whitespace/quotes/angle brackets/backticks.
const URL_REGEX = /(https?:\/\/[^\s<>"'`]+)/g;
// Sentence punctuation that usually belongs outside a link (brackets are kept —
// they can be part of URLs, e.g. Wikipedia article titles).
const TRAILING_PUNCT = /[.,;:!?'"]+$/;

/** Append a text segment, merging it with a preceding text segment. */
function pushText(parts, value) {
  if (!value) return;
  const last = parts[parts.length - 1];
  if (last && last.type === 'text') last.value += value;
  else parts.push({ type: 'text', value });
}

/**
 * @param {string} text
 * @returns {Array<{type: 'text'|'link', value: string}>}
 */
export function linkifyText(text) {
  const parts = [];
  let lastIndex = 0;
  let match;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    pushText(parts, text.slice(lastIndex, match.index));

    let value = match[0];
    const trailing = value.match(TRAILING_PUNCT)?.[0] || '';
    if (trailing) value = value.slice(0, -trailing.length);

    parts.push({ type: 'link', value });
    pushText(parts, trailing);
    lastIndex = URL_REGEX.lastIndex;
  }
  pushText(parts, text.slice(lastIndex));
  if (parts.length === 0) parts.push({ type: 'text', value: text });
  return parts;
}