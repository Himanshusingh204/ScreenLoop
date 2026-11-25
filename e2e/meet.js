// Live test: 3 Chrome tabs in one Meet with VITE_MEET_SFU=true; assert SFU path, decoding video, and mesh fallback.
const { chromium } = require('playwright-core');
const { RoomServiceClient } = require('livekit-server-sdk');

const APP = 'http://localhost:5173';
const ROOM = `m${Date.now().toString(36)}`.slice(0, 12);
const ARGS = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function join(ctx, name) {
  const page = await ctx.newPage();
  page.on('console', (m) => { if (/SFU|fall/i.test(m.text())) log(`  [${name}]`, m.text().slice(0, 120)); });
  await page.goto(`${APP}/meet/${ROOM}`);
  await page.getByLabel('Your display name').fill(name);
  await page.getByRole('button', { name: 'Join Now' }).click();
  return page;
}

const decoding = (page) =>
  page.evaluate(() => [...document.querySelectorAll('.meet-tile video')].filter((v) => v.videoWidth > 0 && v.readyState >= 2).length);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ARGS });
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const pages = [];
  for (const n of ['Ann', 'Ben', 'Cy']) { pages.push(await join(ctx, n)); await sleep(1500); }

  // Wait until every tab decodes 3 tiles (self + 2 remote)
  const t0 = Date.now();
  let counts = [];
  while (Date.now() - t0 < 30000) {
    counts = await Promise.all(pages.map(decoding));
    if (counts.every((c) => c >= 3)) break;
    await sleep(1000);
  }
  log('decoding tiles per tab (want 3,3,3):', counts.join(','), `after ${Date.now() - t0}ms`);

  const svc = new RoomServiceClient(process.env.LIVEKIT_HTTP || 'http://127.0.0.1:7880', 'devkey', 'secret');
  const parts = await svc.listParticipants(`m:${ROOM}`).catch(() => []);
  log('LiveKit participants in meet-' + ROOM + ':', parts.length, parts.map((p) => p.name).join(','));
  const pubs = parts.map((p) => p.tracks.length);
  log('tracks published per participant (audio+video each):', pubs.join(','));

  // Leave handling: Cy closes, others should drop to 2 tiles worth of participants in LiveKit
  await pages[2].close();
  await sleep(4000);
  const after = await svc.listParticipants(`m:${ROOM}`).catch(() => []);
  log('after Cy leaves, LiveKit participants:', after.length);

  await browser.close();
  const ok = process.env.FALLBACK ? counts.every((c) => c >= 3) && parts.length === 0 : counts.every((c) => c >= 3) && parts.length === 3 && after.length === 2;
  log((process.env.FALLBACK ? 'MEET-MESH-FALLBACK ' : 'MEET-SFU ') + (ok ? 'PASS' : 'FAIL'));
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERR', e); process.exit(2); });
