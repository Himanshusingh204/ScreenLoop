import { describe, it, expect } from 'vitest';
import { buildRecap, toMarkdown } from '../recap';

const cap = (min, text) => ({ ts: min * 60000, text });

describe('buildRecap', () => {
  it('handles empty input without throwing', () => {
    expect(buildRecap([])).toEqual({ chapters: [], summary: '' });
    expect(buildRecap(undefined)).toEqual({ chapters: [], summary: '' });
  });

  it('makes one chapter per 2-minute window that has speech, at its first timestamp', () => {
    const r = buildRecap([
      cap(0, 'The launch of the new rocket is scheduled for Friday.'),
      cap(1, 'Engineers checked the rocket engines twice.'),
      cap(5, 'Now the cooking show starts with fresh pasta.'),
    ]);
    expect(r.chapters.map((c) => c.ts)).toEqual([0, 5 * 60000]);
    expect(r.chapters[0].title.length).toBeGreaterThan(0);
    expect(r.chapters[0].title.length).toBeLessThanOrEqual(60);
  });

  it('summary prefers sentences with the most frequent content words', () => {
    const r = buildRecap([
      cap(0, 'Rocket engines power the rocket. Bananas are yellow. The rocket launch uses engines.'),
    ], { summarySentences: 2 });
    expect(r.summary).toContain('rocket');
    expect(r.summary).not.toContain('Bananas');
  });

  it('toMarkdown formats mm:ss chapters and ignores hostile markup safely as text', () => {
    const md = toMarkdown({ chapters: [{ ts: 125000, title: '<script>x</script>' }], summary: 'S' });
    expect(md).toContain('02:05');
    expect(md).toContain('# Recap');
  });
});
