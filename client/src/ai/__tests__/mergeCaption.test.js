import { describe, it, expect } from 'vitest';
import { mergeCaption } from '../mergeCaption';

describe('mergeCaption', () => {
  it('removes an exact repeat of the previous text', () => {
    expect(mergeCaption('we will ship it today', 'we will ship it today')).toBe('');
  });

  it('removes a partial overlap at the start of the new text', () => {
    expect(mergeCaption('the quick brown fox', 'brown fox jumps over')).toBe('jumps over');
  });

  it('leaves text unchanged when there is no overlap', () => {
    expect(mergeCaption('hello there', 'completely different words')).toBe('completely different words');
  });

  it('does not remove a single repeated word', () => {
    expect(mergeCaption('I went to the', 'the store was closed')).toBe('the store was closed');
  });

  it('ignores case and punctuation when comparing', () => {
    expect(mergeCaption('Thanks, everyone.', 'thanks everyone, let us begin')).toBe('let us begin');
  });

  it('handles empty inputs', () => {
    expect(mergeCaption('', 'hello world')).toBe('hello world');
    expect(mergeCaption('hello world', '')).toBe('');
    expect(mergeCaption('', '')).toBe('');
    expect(mergeCaption(undefined, undefined)).toBe('');
  });

  it('returns an empty string when the new text is entirely a repeat', () => {
    expect(mergeCaption('a b c d', 'c d')).toBe('');
  });

  it('only compares the last 12 words of the previous text', () => {
    const prev = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi';
    // "alpha beta" is outside the last 12 words of prev, so it must not be removed
    expect(mergeCaption(prev, 'alpha beta new words')).toBe('alpha beta new words');
  });
});
