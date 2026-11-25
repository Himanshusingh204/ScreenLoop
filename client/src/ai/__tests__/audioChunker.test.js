import { describe, it, expect } from 'vitest';
import { AudioChunker } from '../audioChunker';

const RATE = 16000;
const ramp = (n, start = 0) => Float32Array.from({ length: n }, (_, i) => start + i);

describe('AudioChunker', () => {
  it('emits nothing until a full window is buffered', () => {
    const c = new AudioChunker({ rate: RATE, windowSec: 5 });
    expect(c.push(ramp(RATE * 4))).toEqual([]);
  });

  it('splits 12s into two 5s windows (no overlap) and keeps the remainder', () => {
    const c = new AudioChunker({ rate: RATE, windowSec: 5, overlapSec: 0 });
    const out = c.push(ramp(RATE * 12));
    expect(out).toHaveLength(2);
    expect(out.every((w) => w.length === RATE * 5)).toBe(true);
    expect(c.pending).toBe(RATE * 2);
  });

  it('repeats the overlap at the start of the next window', () => {
    const c = new AudioChunker({ rate: RATE, windowSec: 5, overlapSec: 0.5 });
    const [w1, w2] = c.push(ramp(RATE * 12));
    expect(Array.from(w2.slice(0, RATE / 2))).toEqual(Array.from(w1.slice(w1.length - RATE / 2)));
  });

  it('works across many small pushes (audio callback sized)', () => {
    const c = new AudioChunker({ rate: RATE, windowSec: 5, overlapSec: 0 });
    let total = 0;
    for (let i = 0; i < 100; i++) total += c.push(ramp(4096)).length;
    expect(total).toBe(Math.floor((100 * 4096) / (RATE * 5)));
  });

  it('rejects an overlap that is not smaller than the window', () => {
    expect(() => new AudioChunker({ rate: RATE, windowSec: 1, overlapSec: 1 })).toThrow();
  });

  it('flush returns the remainder as one Float32Array when it holds at least minSec', () => {
    const c = new AudioChunker({ rate: RATE, windowSec: 5, overlapSec: 0 });
    c.push(ramp(RATE * 12));
    const tail = c.flush(1);
    expect(tail).toBeInstanceOf(Float32Array);
    expect(tail.length).toBe(RATE * 2);
    expect(tail[0]).toBe(RATE * 10); // continues exactly where the last full window ended
  });

  it('flush returns null when the remainder is shorter than minSec', () => {
    const c = new AudioChunker({ rate: RATE, windowSec: 5, overlapSec: 0 });
    c.push(ramp(RATE * 5.5));
    expect(c.flush(1)).toBeNull();
  });

  it('flush empties the buffer', () => {
    const c = new AudioChunker({ rate: RATE, windowSec: 5, overlapSec: 0 });
    c.push(ramp(RATE * 12));
    c.flush(1);
    expect(c.pending).toBe(0);
    expect(c.flush(1)).toBeNull();
  });
});
