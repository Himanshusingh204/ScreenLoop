import { describe, it, expect } from 'vitest';
import { sanitizeText, isValidRoomId } from '../sanitizer';

describe('sanitizeText', () => {
  it('escapes HTML entities', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(sanitizeText('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes quotes', () => {
    expect(sanitizeText("it's a \"test\"")).toBe("it&#039;s a &quot;test&quot;");
  });

  it('returns plain text unchanged', () => {
    expect(sanitizeText('hello world')).toBe('hello world');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('isValidRoomId', () => {
  it('accepts valid alphanumeric IDs', () => {
    expect(isValidRoomId('abc123')).toBe(true);
    expect(isValidRoomId('X7K4P2Q9FM')).toBe(true);
  });

  it('rejects IDs with special characters', () => {
    expect(isValidRoomId('abc 123')).toBe(false);
    expect(isValidRoomId('abc!123')).toBe(false);
  });

  it('rejects too short IDs', () => {
    expect(isValidRoomId('abc')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidRoomId(null)).toBe(false);
    expect(isValidRoomId(123)).toBe(false);
  });
});
