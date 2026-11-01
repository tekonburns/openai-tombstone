#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────────
   Render the social preview (og.png, 1200×630) from the live cemetery scene.

   Usage:  node tools/make-og.js [out=og.png]
   Needs:  Google Chrome + puppeteer-core on NODE_PATH (npm i puppeteer-core)
   The page itself is untouched — poster styling is injected only for the shot.
   ────────────────────────────────────────────────────────────────────────── */
const path = require('path');
const fs = require('fs');

let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { puppeteer = require('puppeteer'); }

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'og.png'));
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find((p) => fs.existsSync(p));

const POSTER_CSS = `
  .cem-actions, .cem-hint, .nb2, .nb3 { display: none !important; }
  .cem-head { margin-top: 20px; }
  .grave { justify-content: flex-start; padding-left: 160px; padding-bottom: 14px; }
  .tomb { --W: 304px !important; }
  .flowerbed { left: 312px; width: 400px; }
  .candle.c1 { left: 112px; } .candle.c2 { left: 522px; }
  .nb1 { left: 24px; bottom: 150px; } .nb4 { right: 26px; bottom: 150px; }
  .og-poster { position: absolute; z-index: 6; left: 596px; top: 50%; width: 580px; transform: translateY(-50%); color: var(--bone); text-shadow: 0 2px 16px rgba(0,0,0,.75); }
  .og-poster .k { font: 600 15px var(--sans); letter-spacing: .34em; text-transform: uppercase; color: var(--gold); }
  .og-poster .t { margin: 8px 0 10px; font: 600 134px/1 var(--serif); letter-spacing: .01em; }
  .og-poster .t em { color: var(--red); font-style: normal; }
  .og-poster .s { font: 500 33px/1.2 var(--serif); }
  .og-poster .y { margin-top: 10px; font: 400 15px var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--bone-dim); }
  .og-poster .c { display: inline-flex; align-items: center; gap: 10px; margin-top: 28px; padding: 13px 22px; border-radius: 999px; background: linear-gradient(180deg, #e6c680, #b8924b); color: #1b1408; font: 600 19px var(--sans); text-shadow: none; box-shadow: 0 10px 30px rgba(0,0,0,.5); }
`;

const POSTER_HTML = `
  <div class="og-poster">
    <div class="k">A documentary · 7 minutes</div>
    <div class="t">CLOSED<em>.</em></div>
    <div class="s">The Life &amp; Death of OpenAI</div>
    <div class="y">2015 — 2026 · Eliminated by competition</div>
    <div class="c">▶&nbsp; Watch the documentary</div>
  </div>`;

(async () => {
  if (!CHROME) throw new Error('Chrome not found; set CHROME=/path/to/chrome');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--mute-audio', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  // A few respects so the flowerbed is not bare; ?test= keeps the shot offline.
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('rip.respects', '16'); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.join(ROOT, 'index.html') + '?test=og', { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: POSTER_CSS });
  await page.evaluate((html) => { document.getElementById('cemetery').insertAdjacentHTML('beforeend', html); }, POSTER_HTML);
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: OUT, type: 'png' });
  await browser.close();
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${kb} KB, 2400×1260)`);
})().catch((e) => { console.error(e); process.exit(1); });
