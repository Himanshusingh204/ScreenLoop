// recap.js — on-device extractive recap: chapters + summary from caption lines. No model, no network.
const STOP = new Set(
  'the a an and or but if then of to in on at for with is are was were be been it this that these those i you he she we they as by from not so do does did have has had will would can could just very'.split(' ')
);
const words = (s) => (s.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2 && !STOP.has(w));
const sentences = (s) => (s.match(/[^.!?]+[.!?]*/g) || []).map((x) => x.trim()).filter(Boolean);

function scorer(texts) {
  const freq = new Map();
  for (const t of texts) for (const w of words(t)) freq.set(w, (freq.get(w) || 0) + 1);
  return (sentence) => {
    const ws = words(sentence);
    return ws.length ? ws.reduce((a, w) => a + (freq.get(w) || 0), 0) / ws.length : 0;
  };
}

const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

/** @param {{text:string, ts:number}[]} captions @returns {{chapters:{ts:number,title:string}[], summary:string}} */
export function buildRecap(captions, { windowMs = 120000, summarySentences = 5 } = {}) {
  const lines = (captions || []).filter((c) => c && c.text && c.text.trim());
  if (!lines.length) return { chapters: [], summary: '' };

  const windows = new Map();
  for (const c of lines) {
    const key = Math.floor(c.ts / windowMs);
    if (!windows.has(key)) windows.set(key, []);
    windows.get(key).push(c);
  }
  const chapters = [...windows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, group]) => {
      const sents = sentences(group.map((g) => g.text).join(' '));
      const score = scorer(sents);
      const best = sents.reduce((a, b) => (score(b) > score(a) ? b : a), sents[0]);
      return { ts: group[0].ts, title: clip(best, 60) };
    });

  const all = sentences(lines.map((l) => l.text).join(' '));
  const score = scorer(all);
  const top = new Set([...all].sort((a, b) => score(b) - score(a)).slice(0, summarySentences));
  const summary = all.filter((s) => top.has(s)).join(' ');
  return { chapters, summary };
}

const mmss = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function toMarkdown({ chapters, summary }) {
  return `# Recap\n\n${summary || '_No speech detected._'}\n\n## Chapters\n\n${chapters
    .map((c) => `- ${mmss(c.ts)} ${c.title}`)
    .join('\n')}\n`;
}
