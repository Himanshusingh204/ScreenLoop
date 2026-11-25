// Caption benchmark: TTS clip played as the host's shared audio; viewer runs on-device Whisper via the CC button.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const APP = 'http://localhost:5173';
const ROOM = `b${Date.now().toString(36)}`.slice(0, 12);
const KEY = 'bk' + Math.random().toString(36).slice(2, 12) + 'QWERTY12';
const REF = fs.readFileSync(path.join(__dirname, 'ref.txt'), 'utf8');
const WAV = fs.readFileSync(path.join(__dirname, 'bench.wav'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);

function wer(ref, hyp) {
  const d = Array.from({ length: ref.length + 1 }, (_, i) => [i, ...Array(hyp.length).fill(0)]);
  for (let j = 0; j <= hyp.length; j++) d[0][j] = j;
  for (let i = 1; i <= ref.length; i++) for (let j = 1; j <= hyp.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
  return d[ref.length][hyp.length] / ref.length;
}

const HOST_INIT = () => {
  navigator.mediaDevices.getDisplayMedia = async () => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const g = c.getContext('2d'); setInterval(() => { g.fillStyle = '#123'; g.fillRect(0, 0, 320, 180); }, 100);
    const vs = c.captureStream(10);
    const audio = new Audio('/bench.wav'); audio.crossOrigin = 'anonymous';
    window.__audio = audio;
    const ac = new AudioContext(); const src = ac.createMediaElementSource(audio); const dest = ac.createMediaStreamDestination();
    src.connect(dest); dest.stream.getAudioTracks().forEach((t) => vs.addTrack(t));
    return vs;
  };
};

// Viewer: record every worker round trip (window sent -> caption/idle returned) to measure inference latency
const VIEWER_INIT = () => {
  window.__lat = []; window.__backend = (navigator.gpu ? 'webgpu-available' : 'wasm-only');
  const Orig = window.Worker;
  window.Worker = class extends Orig {
    constructor(...a) {
      super(...a); const sent = [];
      const post = this.postMessage.bind(this);
      this.postMessage = (m, t) => { if (m && m.type === 'audio') sent.push(performance.now()); if (m && m.type === 'load') window.__loadStart = performance.now(); return post(m, t); };
      this.addEventListener('message', (e) => {
        const d = e.data;
        if (d.type === 'ready') window.__loadMs = performance.now() - window.__loadStart;
        if (d.type === 'caption' || d.type === 'idle') window.__lat.push(performance.now() - sent.shift());
      });
    }
  };
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext();
  await ctx.route('**/bench.wav', (r) => r.fulfill({ body: WAV, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' } }));

  const host = await ctx.newPage();
  await host.addInitScript(HOST_INIT);
  await host.goto(`${APP}/room/${ROOM}?host=true#${KEY}`);
  await host.locator('#display-name').fill('Host'); await host.locator('#join-btn').click();
  await host.locator('#share-screen-btn').waitFor({ timeout: 20000 }); await host.locator('#share-screen-btn').click();
  for (let i = 0; i < 40 && (await host.evaluate(() => typeof window.__audio)) !== 'object'; i++) await sleep(500);
  console.log('host audio element:', await host.evaluate(() => typeof window.__audio));

  const v = await ctx.newPage();
  await v.addInitScript(() => { window.__backend = navigator.gpu ? 'webgpu-available' : 'wasm-only'; });
  await v.goto(`${APP}/room/${ROOM}#${KEY}`);
  await v.locator('#display-name').fill('Viewer'); await v.locator('#join-btn').click();
  await v.locator('.room-video-area video').waitFor({ timeout: 25000 });
  await sleep(2000);
  await v.getByRole('button', { name: 'Toggle live captions' }).click();

  const tClick = Date.now();
  let tReady = 0;
  while (Date.now() - tClick < 150000) {
    const txt = await v.locator('[data-testid=captions]').first().innerText().catch(() => '');
    if (/Listening/.test(txt)) { tReady = Date.now(); break; }
    if (/stopped|not supported/i.test(txt)) { console.log('CC ERROR:', txt); await browser.close(); process.exit(1); }
    await sleep(500);
  }
  console.log('model ready after ms:', tReady - tClick, ' backend:', await v.evaluate(() => window.__backend));

  console.log('viewer status text:', JSON.stringify(await v.locator('[data-testid=captions]').first().innerText().catch(() => 'none')));
  console.log('host audio now:', await host.evaluate(() => typeof window.__audio), host.url());
  const tPlay = Date.now();
  await host.evaluate(() => window.__audio.play());
  const seen = []; const at = []; let last = '';
  while (Date.now() - tPlay < 90000) {
    const txt = await v.locator('[data-testid=captions]').first().innerText().catch(() => '');
    if (txt && txt !== last && !/Listening|Loading/.test(txt)) { seen.push(txt); at.push(Date.now() - tPlay); last = txt; }
    const ended = await host.evaluate(() => window.__audio.ended);
    if (ended && seen.length && Date.now() - tPlay > 12000) { await sleep(9000); const t2 = await v.locator('[data-testid=captions]').first().innerText().catch(() => ''); if (t2 && t2 !== last) { seen.push(t2); at.push(Date.now() - tPlay); } break; }
    await sleep(300);
  }
  const gaps = at.map((t, i) => t - (i ? at[i - 1] : 0));
  console.log('caption arrival times (ms after play):', at.join(','));
  console.log('first caption after ms:', at[0], '(a window is 5000 ms, so inference+queue ~', at[0] - 5000, 'ms)');
  console.log('median gap between captions ms:', gaps.slice(1).sort((a, b) => a - b)[Math.floor((gaps.length - 1) / 2)]);
  const hyp = norm(seen.join(' '));
  const w = wer(norm(REF), hyp);
  console.log('caption lines:', seen.length);
  console.log('WER:', (w * 100).toFixed(1) + '%', ' ref words:', norm(REF).length, ' hyp words:', hyp.length);
  console.log('HYP:', seen.join(' | ').slice(0, 600));
  await browser.close();
})().catch((e) => { console.error('ERR', e); process.exit(2); });
