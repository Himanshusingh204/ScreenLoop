// Live test: watch-room media E2EE, host-only publish, kick -> key rotation, late joiner. Real Chrome + real LiveKit.
const { chromium } = require('playwright-core');
const { RoomServiceClient } = require('livekit-server-sdk');

const APP = 'http://localhost:5173';
const ROOM = `w${Date.now().toString(36)}`.slice(0, 12);
const KEY = 'k' + Math.random().toString(36).slice(2, 12) + 'ZXCV123456';
const ARGS = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };

// Host's getDisplayMedia -> animated canvas + a tone, so the SFU carries real, changing frames and audio
const FAKE_SCREEN = () => {
  navigator.mediaDevices.getDisplayMedia = async () => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 360;
    const g = c.getContext('2d'); let t = 0;
    setInterval(() => { t += 1; g.fillStyle = `hsl(${(t * 7) % 360},70%,50%)`; g.fillRect(0, 0, 640, 360); g.fillStyle = '#fff'; g.font = '48px sans-serif'; g.fillText('frame ' + t, 40, 180); }, 33);
    const vs = c.captureStream(30);
    const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination();
    o.frequency.value = 440; o.connect(d); o.start();
    d.stream.getAudioTracks().forEach((tr) => vs.addTrack(tr));
    return vs;
  };
};

async function open(ctx, url, name, { host = false } = {}) {
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  page.on('console', (m) => { if (/e2ee|E2EE|rekey|LiveKit\] (Connected|Disc)/i.test(m.text())) log(`   [${name}]`, m.text().slice(0, 110)); });
  await page.addInitScript(() => { window.__e2eeSeen = false; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if ((n.textContent || '').includes('end-to-end encrypted')) window.__e2eeSeen = true; }).observe(document, { childList: true, subtree: true }); });
  if (host) await page.addInitScript(FAKE_SCREEN);
  await page.goto(url);
  await page.locator('#display-name').fill(name);
  await page.locator('#join-btn').click();
  return page;
}

const frames = (page) => page.evaluate(() => {
  const v = document.querySelector('.room-video-area video');
  return v ? { w: v.videoWidth, f: v.getVideoPlaybackQuality().totalVideoFrames } : { w: 0, f: 0 };
});
async function decodes(page, ms = 3500) {
  const a = await frames(page); await sleep(ms); const b = await frames(page);
  return a.w > 0 && b.f > a.f + 10;
}
async function waitDecode(page, timeout = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await decodes(page, 1500)) return true; }
  return false;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ARGS });
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const svc = new RoomServiceClient(process.env.LIVEKIT_HTTP || 'http://127.0.0.1:7880', 'devkey', 'secret');

  const host = await open(ctx, `${APP}/room/${ROOM}?host=true#${KEY}`, 'Host', { host: true });
  await host.locator('#share-screen-btn').waitFor({ timeout: 20000 });
  await host.locator('#share-screen-btn').click();
  await sleep(3000);

  const A = await open(ctx, `${APP}/room/${ROOM}#${KEY}`, 'Ann');
  const C = await open(ctx, `${APP}/room/${ROOM}#${KEY}`, 'Cy');
  const B = await open(ctx, `${APP}/room/${ROOM}`, 'NoKey'); // link without the #key fragment

  check('viewer with key decodes the encrypted stream (Ann)', await waitDecode(A));
  check('viewer with key decodes the encrypted stream (Cy)', await waitDecode(C));
  const bf1 = await frames(B); await sleep(4000); const bf2 = await frames(B);
  check('viewer WITHOUT the key cannot decode (proves frames are ciphertext at the SFU)', !(bf1.w > 0 && bf2.f > bf1.f + 10), JSON.stringify([bf1, bf2]));
  check('E2EE indicator shown to keyed viewer', await A.evaluate(() => window.__e2eeSeen === true));
  check('E2EE indicator NOT shown to the keyless viewer', !(await B.evaluate(() => window.__e2eeSeen === true)));

  // Authorization: only the server-recorded host may publish
  const parts = await svc.listParticipants(`w:${ROOM}`);
  const pubs = parts.filter((p) => p.tracks.length > 0).length;
  log('   participants:', JSON.stringify(parts.map((p) => ({ n: p.name, tracks: p.tracks.length, canPub: p.permission?.canPublish }))));
  const canPub = parts.map((p) => p.permission?.canPublish);
  check('exactly one publisher (the host); viewers have canPublish=false', pubs === 1 && canPub.filter(Boolean).length === 1, `participants=${parts.length} canPublish=${canPub.join(',')}`);
  check('LiveKit identities are signaling socket ids (not client-chosen)', parts.every((p) => /^[A-Za-z0-9_-]{15,25}$/.test(p.identity)), parts.map((p) => p.identity).join(','));

  // Kick Cy -> host rotates key and wraps it to the remaining peers
  await host.locator('#tab-people').click().catch(() => {});
  await host.locator('button[aria-label="Kick Cy from the room"]').click();
  await sleep(2500);
  const afterKick = (await svc.listParticipants(`w:${ROOM}`)).map((p) => p.name);
  check('kicked user was removed from the SFU room by the server', !afterKick.includes('Cy'), afterKick.join(','));
  check('after kick + rotation, remaining viewer (Ann) still decodes (new key delivered)', await waitDecode(A, 20000));
  const cText = await C.locator('body').innerText();
  check('kicked viewer is shown the kicked state', /kick|removed|left the room|Welcome|Join/i.test(cText));

  // Late joiner after rotation with only the URL key
  const D = await open(ctx, `${APP}/room/${ROOM}#${KEY}`, 'Late');
  check('late joiner (URL key only) receives the current key and decodes', await waitDecode(D, 25000));

  await browser.close();
  const ok = results.every(Boolean);
  log(ok ? 'WATCH-E2EE ALL PASS' : 'WATCH-E2EE FAILURES');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERR', e); process.exit(2); });
