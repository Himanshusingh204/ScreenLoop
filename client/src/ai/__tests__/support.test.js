import { describe, it, expect } from 'vitest';
import { isCaptionSupported, cleanCaption } from '../support';

describe('isCaptionSupported', () => {
  it('requires Worker, WebAssembly and AudioContext', () => {
    const ok = { Worker: function () {}, WebAssembly: {}, AudioContext: function () {} };
    expect(isCaptionSupported(ok)).toBe(true);
    expect(isCaptionSupported({ ...ok, Worker: undefined })).toBe(false);
    expect(isCaptionSupported({ ...ok, WebAssembly: undefined })).toBe(false);
    expect(isCaptionSupported({ ...ok, AudioContext: undefined })).toBe(false);
  });
});

describe('cleanCaption', () => {
  it('drops silence markers and empty text, trims, and caps length', () => {
    expect(cleanCaption('  [BLANK_AUDIO] ')).toBe('');
    expect(cleanCaption('(music)')).toBe('');
    expect(cleanCaption('   ')).toBe('');
    expect(cleanCaption(' hello world ')).toBe('hello world');
    expect(cleanCaption('x'.repeat(900))).toHaveLength(500);
  });
});
