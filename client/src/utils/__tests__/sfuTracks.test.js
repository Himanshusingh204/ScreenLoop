import { describe, it, expect } from 'vitest';
import { socketIdOf, withTrack, withoutTrack, withoutPeer } from '../sfuTracks';

describe('socketIdOf', () => {
  it('uses the LiveKit identity, which the server sets to the authenticated socket id', () => {
    expect(socketIdOf({ identity: 'abc_1' })).toBe('abc_1');
  });
  it('ignores client-controlled metadata (cannot be spoofed)', () => {
    expect(socketIdOf({ identity: 'real', metadata: JSON.stringify({ socketId: 'victim' }) })).toBe('real');
  });
  it.each([[undefined], [{}], [{ identity: 'bad id' }], [{ identity: 5 }], [{ identity: 'x'.repeat(41) }]])('returns null for %j', (p) =>
    expect(socketIdOf(p)).toBeNull()
  );
});

describe('track map reducers', () => {
  const a = { id: 'a', kind: 'audio' };
  const v = { id: 'v', kind: 'video' };

  it('adds tracks per peer without mutating the input and ignores duplicates', () => {
    const base = {};
    const one = withTrack(base, 's1', a);
    const two = withTrack(withTrack(one, 's1', v), 's1', v);
    expect(base).toEqual({});
    expect(two.s1).toEqual([a, v]);
  });

  it('removes one track, dropping the peer when it has none left', () => {
    const m = withTrack(withTrack({}, 's1', a), 's1', v);
    expect(withoutTrack(m, 's1', a).s1).toEqual([v]);
    expect('s1' in withoutTrack(withoutTrack(m, 's1', a), 's1', v)).toBe(false);
  });

  it('removes a whole peer and tolerates unknown ids', () => {
    const m = withTrack({}, 's1', a);
    expect(withoutPeer(m, 's1')).toEqual({});
    expect(withoutPeer(m, 'nope')).toBe(m);
    expect(withoutTrack(m, 'nope', a)).toBe(m);
  });
});
