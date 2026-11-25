import { describe, it, expect } from 'vitest';
import { socketIdOf, withTrack, withoutTrack, withoutPeer } from '../sfuTracks';

describe('socketIdOf', () => {
  it('reads socketId from participant metadata JSON', () => {
    expect(socketIdOf({ metadata: JSON.stringify({ socketId: 'abc_1' }) })).toBe('abc_1');
  });
  it.each([[undefined], [{}], [{ metadata: 'not json' }], [{ metadata: '{"socketId":5}' }], [{ metadata: '{"socketId":"bad id"}' }]])(
    'returns null for %j',
    (p) => expect(socketIdOf(p)).toBeNull()
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
