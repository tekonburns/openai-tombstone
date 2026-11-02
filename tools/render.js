#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────────
   Render the documentary to an MP4 — deterministic, frame by frame.

     node tools/render.js [--out out/closed.mp4] [--fps 30] [--width 1920] [--height 1080]
                          [--seconds N (preview only)] [--crf 20]
     node tools/render.js --audio-only out/closed.video.mp4   # soundtrack only, onto an encoded video track

   How it works
     • Headless Chrome opens index.html?render=1&test=render (no player chrome, no network).
     • A virtual clock replaces requestAnimationFrame / setTimeout / performance.now, and every
       CSS animation & transition is pinned to it (Web Animations API), so each captured frame is
       exactly 1/fps later than the last — no dropped frames, no jank, however slow the machine.
     • The audio engine logs every mood change and sound cue with its film time; afterwards the
       identical synthesis graph is re-run inside an OfflineAudioContext and the mix is muxed.
   Needs: Google Chrome, ffmpeg, and puppeteer-core on NODE_PATH (npm i puppeteer-core).
   ────────────────────────────────────────────────────────────────────────── */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { once } = require('events');

let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { puppeteer = require('puppeteer'); }

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(arg('out', path.join(ROOT, 'out', 'closed.mp4')));
const FPS = +arg('fps', 30), W = +arg('width', 1920), H = +arg('height', 1080), CRF = +arg('crf', 20);
const LIMIT = +arg('seconds', 0);
const AUDIO_ONLY = arg('audio-only', ''); // re-run the clock without capturing, render the mix, mux onto this video track
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find((p) => fs.existsSync(p));

// Installed before any page script runs: the page's clocks become ours.
const VIRTUAL_CLOCK = `(() => {
  let vt = 0;
  const timers = new Map(); let tid = 1;
  const rafs = new Map(); let rid = 1;
  const dateBase = Date.now();
  performance.now = () => vt;
  Date.now = () => dateBase + vt;
  window.setTimeout = (fn, ms, ...a) => { const id = tid++; timers.set(id, { due: vt + Math.max(0, +ms || 0), fn, a, every: 0 }); return id; };
  window.setInterval = (fn, ms, ...a) => { const id = tid++; const every = Math.max(1, +ms || 1); timers.set(id, { due: vt + every, fn, a, every }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  window.requestAnimationFrame = (fn) => { const id = rid++; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  const seen = new WeakMap();
  window.__vt = () => vt;
  window.__tick = (dtMs) => {
    vt += dtMs;
    for (let guard = 0; guard < 5000; guard++) {
      let pick = null;
      for (const [id, t] of timers) if (t.due <= vt && (!pick || t.due < pick[1].due)) pick = [id, t];
      if (!pick) break;
      const [id, t] = pick;
      if (t.every) t.due += t.every; else timers.delete(id);
      try { if (typeof t.fn === 'function') t.fn(...t.a); } catch (e) { console.error(e); }
    }
    const cbs = Array.from(rafs.values()); rafs.clear();
    for (const cb of cbs) { try { cb(vt); } catch (e) { console.error(e); } }
    for (const an of document.getAnimations()) {
      let s = seen.get(an);
      if (s == null) { s = vt; seen.set(an, s); try { an.pause(); } catch (e) { /* ignore */ } }
      try { an.currentTime = vt - s; } catch (e) { /* ignore */ }
    }
    return vt;
  };
})();`;

const FONTS = [
  '400 16px "Cormorant Garamond"', '500 16px "Cormorant Garamond"', '600 16px "Cormorant Garamond"', '700 16px "Cormorant Garamond"',
  'italic 400 16px "Cormorant Garamond"', 'italic 500 16px "Cormorant Garamond"',
  '400 16px "IBM Plex Mono"', '500 16px "IBM Plex Mono"', '600 16px "IBM Plex Mono"',
  '300 16px Inter', '400 16px Inter', '500 16px Inter', '600 16px Inter', '700 16px Inter', '800 16px Inter',
  '400 16px "Special Elite"',
];

const ffmpeg = (args) => spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

(async () => {
  if (!CHROME) throw new Error('Chrome not found; set CHROME=/path/to/chrome');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmpVideo = OUT.replace(/\.mp4$/i, '') + '.video.mp4';
  const tmpWav = OUT.replace(/\.mp4$/i, '') + '.audio.wav';

  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', protocolTimeout: 3600000, // the offline audio render is one long call
    args: ['--mute-audio', '--hide-scrollbars', '--disable-gpu-vsync', '--run-all-compositor-stages-before-draw', `--window-size=${W},${H}`],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.evaluateOnNewDocument(VIRTUAL_CLOCK);
  await page.goto('file://' + path.join(ROOT, 'index.html') + '?render=1&test=render', { waitUntil: 'networkidle0' });
  await page.evaluate(async (fonts) => { await Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => {}))); await document.fonts.ready; }, FONTS);
  const client = await page.createCDPSession();

  // Frame 0 = the instant the film starts.
  await page.evaluate(() => {
    RIP.Audio.rec = [];
    RIP.Audio.clock = () => window.__vt() / 1000;
    RIP.player.openDoc(true);
  });

  const enc = AUDIO_ONLY ? null : ffmpeg(['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-maxrate', '10M', '-bufsize', '20M', '-tune', 'film', '-g', '30', '-keyint_min', '30', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmpVideo]);
  const encDone = enc ? once(enc, 'close') : Promise.resolve();

  const dt = 1000 / FPS;
  let frames = 0, lastLog = Date.now();
  const t0 = Date.now();
  for (;;) {
    const state = await page.evaluate((d) => {
      window.__tick(d);
      const P = RIP.player.P, last = P.idx === RIP.SCRIPT.length - 1;
      // Fade the picture to black over the final 1.6 s of the credits.
      if (last) document.getElementById('doc').style.opacity = String(Math.max(0, Math.min(1, (P.est[P.idx] - P.t) / 1.6)));
      return { view: document.body.dataset.view, idx: P.idx, t: P.t };
    }, dt);
    if (state.view !== 'doc') break;
    if (LIMIT && frames / FPS >= LIMIT) break;
    if (enc) {
      const { data } = await client.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true });
      if (!enc.stdin.write(Buffer.from(data, 'base64'))) await once(enc.stdin, 'drain');
    }
    frames++;
    if (Date.now() - lastLog > 10000) {
      lastLog = Date.now();
      const el = (Date.now() - t0) / 1000;
      console.log(`  ${fmt(frames / FPS)} of film · scene ${state.idx} · ${frames} frames · ${(frames / el).toFixed(1)} fps render speed`);
    }
  }
  if (enc) enc.stdin.end();
  const duration = frames / FPS;
  console.log(`frames: ${frames} (${fmt(duration)})${enc ? ' — encoding video…' : ''}`);
  await encDone;
  fs.writeFileSync(OUT.replace(/\.mp4$/i, '') + '.events.json', JSON.stringify(await page.evaluate(() => RIP.Audio.rec)));

  // Audio: rebuild the mix offline from the event log, export 16-bit WAV, pull it over in chunks.
  console.log('rendering soundtrack offline…');
  const bytes = await page.evaluate(async (dur) => {
    const buf = await RIP.Audio.renderOffline(RIP.Audio.rec, dur, 48000);
    const ch = buf.numberOfChannels, n = Math.min(buf.length, Math.ceil(dur * buf.sampleRate)), sr = buf.sampleRate;
    const chans = []; let peak = 0;
    for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); chans.push(d); for (let i = 0; i < n; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; } }
    const k = peak > 0.98 ? 0.98 / peak : 1;
    const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true);
    out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true);
    out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
    let o = 44;
    const fadeN = Math.floor(2.2 * sr); // audio fades with the picture
    for (let i = 0; i < n; i++) {
      const g = k * Math.min(1, (n - i) / fadeN);
      for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i] * g)); out.setInt16(o, v < 0 ? v * 32768 : v * 32767, true); o += 2; }
    }
    window.__wav = new Uint8Array(out.buffer);
    return window.__wav.length;
  }, duration);
  const fd = fs.openSync(tmpWav, 'w');
  const CH = 6 * 1024 * 1024;
  for (let off = 0; off < bytes; off += CH) {
    const b64 = await page.evaluate((o, l) => { const s = window.__wav.subarray(o, o + l); let str = ''; for (let i = 0; i < s.length; i += 0x8000) str += String.fromCharCode.apply(null, s.subarray(i, i + 0x8000)); return btoa(str); }, off, CH);
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd);
  await browser.close();

  console.log('muxing…');
  const videoTrack = AUDIO_ONLY ? path.resolve(AUDIO_ONLY) : tmpVideo;
  const mux = ffmpeg(['-y', '-i', videoTrack, '-i', tmpWav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT]);
  mux.stdin.end();
  const [code] = await once(mux, 'close');
  if (code !== 0) throw new Error('ffmpeg mux failed');
  if (fs.existsSync(tmpVideo) && path.resolve(tmpVideo) !== path.resolve(OUT)) fs.unlinkSync(tmpVideo);
  fs.unlinkSync(tmpWav);
  const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
  console.log(`wrote ${path.relative(process.cwd(), OUT)} · ${W}×${H} @ ${FPS}fps · ${fmt(duration)} · ${mb} MB · took ${fmt((Date.now() - t0) / 1000)}`);
})().catch((e) => { console.error(e); process.exit(1); });
