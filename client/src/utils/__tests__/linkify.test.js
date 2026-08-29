import { describe, it, expect } from 'vitest';
import { linkifyText } from '../linkify';

describe('linkifyText', () => {
  it('returns the plain text when there are no URLs', () => {
    expect(linkifyText('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
  });

  it('turns a standalone URL into a single link segment', () => {
    expect(linkifyText('https://example.com')).toEqual([
      { type: 'link', value: 'https://example.com' },
    ]);
  });

  it('splits text with an embedded URL', () => {
    expect(linkifyText('watch https://youtu.be/abc123 now')).toEqual([
      { type: 'text', value: 'watch ' },
      { type: 'link', value: 'https://youtu.be/abc123' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('links multiple URLs in one message', () => {
    const parts = linkifyText('a https://a.com b http://b.org c');
    expect(parts).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'link', value: 'https://a.com' },
      { type: 'text', value: ' b ' },
      { type: 'link', value: 'http://b.org' },
      { type: 'text', value: ' c' },
    ]);
  });

  it('never produces a link for a non-http scheme', () => {
    expect(linkifyText('javascript:alert(1)')).toEqual([
      { type: 'text', value: 'javascript:alert(1)' },
    ]);
    expect(linkifyText('ftp://files.example.com/x')).toEqual([
      { type: 'text', value: 'ftp://files.example.com/x' },
    ]);
  });

  it('preserves trailing punctuation as text', () => {
    const parts = linkifyText('check https://site.com/page, ok');
    expect(parts[parts.length - 1]).toEqual({ type: 'text', value: ', ok' });
    expect(parts[0]).toEqual({ type: 'text', value: 'check ' });
  });
});