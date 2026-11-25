import { describe, it, expect } from 'vitest';
import { pendingOffers } from '../meshFallback';

describe('pendingOffers (mesh fallback after the SFU fails)', () => {
  it('only the lower socket id offers, so exactly one side initiates each pair', () => {
    expect(pendingOffers('b', ['a', 'c'], new Set())).toEqual(['c']);
    expect(pendingOffers('a', ['b', 'c'], new Set())).toEqual(['b', 'c']);
  });

  it('never offers twice to the same peer, and picks up peers who arrive later', () => {
    const offered = new Set(['c']);
    expect(pendingOffers('a', ['c', 'd'], offered)).toEqual(['d']);
  });

  it('is empty with no peers', () => {
    expect(pendingOffers('a', [], new Set())).toEqual([]);
  });
});
