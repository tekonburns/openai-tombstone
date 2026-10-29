/* ──────────────────────────────────────────────────────────────────────────
   CLOSED. — app: the cemetery, the projector, and the book of condolences.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  const RIP = window.RIP;
  const A = RIP.Audio, SCRIPT = RIP.SCRIPT, VIS = RIP.visuals;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const { esc, fmt } = RIP.util;

  const store = {
    get(k, d) { try { const v = localStorage.getItem('rip.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rip.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  /* ═══════════════════════════ shared textures ═══════════════════════════ */
  (function makeTextures() {
    const root = document.documentElement.style;
    // 1. harsh per-pixel noise → film grain
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    let x = c.getContext('2d');
    let img = x.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    root.setProperty('--noise', `url(${c.toDataURL('image/png')})`);
    // 2. gentle fine noise around mid-grey → paper tooth (tiles seamlessly)
    img = x.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + ((Math.random() - 0.5) * 34) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    root.setProperty('--fine', `url(${c.toDataURL('image/png')})`);
    // 3. granite: soft mottling + sparse speckles, one big non-repeating tile
    const S = 512, g = document.createElement('canvas');
    g.width = g.height = S;
    x = g.getContext('2d');
    x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
    const s = document.createElement('canvas'), n = 24;
    s.width = s.height = n;
    const sx = s.getContext('2d'), si = sx.createImageData(n, n);
    for (let i = 0; i < si.data.length; i += 4) {
      const v = 128 + ((Math.random() - 0.5) * 70) | 0;
      si.data[i] = si.data[i + 1] = si.data[i + 2] = v; si.data[i + 3] = 255;
    }
    sx.putImageData(si, 0, 0);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.globalAlpha = 0.9; x.drawImage(s, 0, 0, S, S); x.globalAlpha = 1;
    img = x.getImageData(0, 0, S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const r = Math.random();
      let d = (Math.random() - 0.5) * 22;
      if (r < 0.018) d -= 46; else if (r < 0.03) d += 38;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, img.data[i] + d));
    }
    x.putImageData(img, 0, 0);
    root.setProperty('--granite', `url(${g.toDataURL('image/png')})`);
  })();

  /* ═══════════════════════════ views ═══════════════════════════ */
  function showView(id) {
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === id));
    document.body.dataset.view = id;
  }

  /* ═══════════════════════════ the QR code ═══════════════════════════ */
  const params = new URLSearchParams(location.search);
  const qrTarget = params.get('qr') || location.href.split('#')[0] + '#watch';

  function fillQR() {
    if (!window.QR) return;
    let svg;
    try { svg = QR.toSVG(qrTarget, { ecl: 'Q', border: 1, dark: '#212329', light: null }); } catch (e) { console.warn('QR failed', e); return; }
    $$('[data-qr]').forEach((el) => { el.innerHTML = svg; });
    const hint = $('#qrHint');
    if (/^(file:|http:\/\/(localhost|127\.|0\.0\.0\.0))/i.test(qrTarget)) {
      hint.innerHTML = 'Heads-up: this QR points to <code>' + esc(qrTarget.replace(/#watch$/, '')) + '</code>, which only works on this computer. Host the folder (GitHub Pages, Netlify…) — or add <code>?qr=https://your.site</code> — to engrave a scannable link.';
      hint.classList.add('warn');
    } else {
      hint.textContent = 'Scan the engraving with your phone — or tap it — to watch the documentary.';
    }
  }

  /* ═══════════════════════════ cemetery: sky + scenery ═══════════════════════════ */
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const sky = { cv: $('#sky'), stars: [], W: 0, H: 0, shoot: null };
  function sizeSky() {
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    sky.W = innerWidth; sky.H = innerHeight;
    sky.cv.width = sky.W * DPR; sky.cv.height = sky.H * DPR;
    sky.ctx = sky.cv.getContext('2d');
    sky.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const r = rng(7);
    sky.stars = Array.from({ length: Math.round((sky.W * sky.H) / 4200) }, () => ({
      x: r() * sky.W, y: Math.pow(r(), 1.4) * sky.H * 0.72, s: r() * 1.25 + 0.2, p: r() * 6.28, f: 0.4 + r() * 1.6,
    }));
    drawScenery();
  }
  function drawSky(now) {
    requestAnimationFrame(drawSky);
    if (document.body.dataset.view !== 'cemetery' || document.hidden) return;
    const { ctx, W, H } = sky;
    ctx.clearRect(0, 0, W, H);
    const t = now / 1000;
    for (const s of sky.stars) {
      ctx.globalAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.f + s.p));
      ctx.fillStyle = '#e9edff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    // the occasional shooting star (a model release you missed)
    if (!sky.shoot && Math.random() < 0.0025) sky.shoot = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.3, t: t };
    if (sky.shoot) {
      const k = (t - sky.shoot.t) / 0.9;
      if (k > 1) sky.shoot = null;
      else {
        const x = sky.shoot.x + k * 260, y = sky.shoot.y + k * 110;
        const g = ctx.createLinearGradient(x - 90, y - 38, x, y);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.85)');
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = g; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x - 90, y - 38); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawScenery() {
    const cv = $('#scenery');
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    const ctx = cv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const r = rng(42);
    const hill = (x, base, a1, a2) => H * base + Math.sin((x / W) * 3.1 + a1) * H * 0.03 + Math.sin((x / W) * 9 + a2) * H * 0.008;
    // far hill + distant headstones
    ctx.fillStyle = '#0c1120';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, hill(x, 0.62, 0.6, 1));
    ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = '#0a0e1a';
    for (let i = 0; i < Math.round(W / 70); i++) {
      const x = r() * W, w = 7 + r() * 9, h = w * (1.2 + r() * 0.5), y = hill(x, 0.62, 0.6, 1) + 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h + w / 2);
      ctx.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y); ctx.fill();
    }
    // near ground
    const gy = (x) => hill(x, 0.78, 2.2, 0.3);
    const grd = ctx.createLinearGradient(0, H * 0.72, 0, H);
    grd.addColorStop(0, '#0a0f17'); grd.addColorStop(1, '#05070b');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, gy(x));
    ctx.lineTo(W, H); ctx.fill();
    // a bare tree, because of course
    ctx.strokeStyle = '#05070c'; ctx.lineCap = 'round';
    const tx = W < 700 ? W * 0.06 : W * 0.13;
    const branch = (x, y, ang, len, wd, depth) => {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      if (depth > 8 || len < 5) return;
      const n = depth < 2 ? 2 : r() < 0.3 ? 3 : 2;
      for (let i = 0; i < n; i++) branch(x2, y2, ang + (r() - 0.5) * 0.9 + (i - (n - 1) / 2) * 0.5, len * (0.68 + r() * 0.12), wd * 0.66, depth + 1);
    };
    branch(tx, gy(tx) + 6, -Math.PI / 2 - 0.08, Math.min(H * 0.17, 150), Math.min(16, W / 60), 0);
  }

  /* ═══════════════════════════ shared memorial (respects + condolences) ═══════════════════════════ */
  const IS_TEST = params.has('test') || /jsdom/i.test(navigator.userAgent || '');
  const IS_LOCAL = /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname) || location.protocol === 'file:';
  const RESPECT_KEY = IS_LOCAL ? 'openai-tombstone-respects-dev' : 'openai-tombstone-respects';
  const BOOK_TAG = IS_LOCAL ? 'closed-openai-tombstone-book-dev-v1' : 'closed-openai-tombstone-book-v1';
  const RESPECT_TAG = IS_LOCAL ? 'closed-openai-tombstone-f-dev-v1' : 'closed-openai-tombstone-f-v1';
  const ABACUS = 'https://abacus.jasoncameron.dev';
  const RELAYS = ['wss://nos.lol', 'wss://relay.primal.net', 'wss://nostr.mom', 'wss://offchain.pub'];

  // Compact SHA-256 + BIP-340 Schnorr (secp256k1) so visitors can sign public guestbook events
  // across independent relays with zero accounts, API keys, or external libraries.
  const K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  function sha256(bytes) {
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const l = bytes.length, padLen = (l + 9 + 63) & ~63, buf = new Uint8Array(padLen);
    buf.set(bytes); buf[l] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, Math.floor((l * 8) / 0x100000000));
    dv.setUint32(padLen - 4, (l * 8) >>> 0);
    const W = new Uint32Array(64);
    for (let i = 0; i < padLen; i += 64) {
      for (let j = 0; j < 16; j++) W[j] = dv.getUint32(i + j * 4);
      for (let j = 16; j < 64; j++) {
        const s0 = rotr(W[j - 15], 7) ^ rotr(W[j - 15], 18) ^ (W[j - 15] >>> 3);
        const s1 = rotr(W[j - 2], 17) ^ rotr(W[j - 2], 19) ^ (W[j - 2] >>> 10);
        W[j] = (W[j - 16] + s0 + W[j - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let j = 0; j < 64; j++) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[j] + W[j]) >>> 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      for (let j = 0; j < 8; j++) H[j] = (H[j] + [a, b, c, d, e, f, g, h][j]) >>> 0;
    }
    const out = new Uint8Array(32), odv = new DataView(out.buffer);
    for (let j = 0; j < 8; j++) odv.setUint32(j * 4, H[j]);
    return out;
  }

  const SECP_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
  const SECP_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const SECP_G = [
    0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
    0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n,
  ];
  const fmod = (a, m = SECP_P) => ((a % m) + m) % m;
  const fpow = (b, e, m = SECP_P) => { let r = 1n; b = fmod(b, m); while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } return r; };
  const finv = (a) => fpow(a, SECP_P - 2n, SECP_P);
  const pdbl = (p) => {
    if (!p || p[1] === 0n) return null;
    const m = fmod(3n * p[0] * p[0] * finv(2n * p[1])), x = fmod(m * m - 2n * p[0]);
    return [x, fmod(m * (p[0] - x) - p[1])];
  };
  const padd = (p, q) => {
    if (!p) return q;
    if (!q) return p;
    if (p[0] === q[0]) return p[1] !== q[1] ? null : pdbl(p);
    const m = fmod((q[1] - p[1]) * finv(q[0] - p[0])), x = fmod(m * m - p[0] - q[0]);
    return [x, fmod(m * (p[0] - x) - p[1])];
  };
  const pmul = (k) => { let r = null, c = SECP_G; while (k > 0n) { if (k & 1n) r = padd(r, c); c = pdbl(c); k >>= 1n; } return r; };
  const utf8 = (s) => new TextEncoder().encode(s);
  const b2hex = (b) => Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
  const n2b32 = (n) => { const h = n.toString(16).padStart(64, '0'), u = new Uint8Array(32); for (let i = 0; i < 32; i++) u[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16); return u; };
  const b2num = (b) => BigInt('0x' + b2hex(b));
  const randBytes32 = () => {
    const u = new Uint8Array(32);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(u);
    else for (let i = 0; i < 32; i++) u[i] = (Math.random() * 256) | 0;
    return u;
  };
  function signNostr(tag, payload) {
    let d = (b2num(randBytes32()) % (SECP_N - 1n)) + 1n;
    const Ppt = pmul(d);
    if (Ppt[1] & 1n) d = SECP_N - d;
    const pubkey = b2hex(n2b32(Ppt[0]));
    const ev = { pubkey, created_at: Math.floor(Date.now() / 1000), kind: 1, tags: [['t', tag]], content: JSON.stringify(payload) };
    const idBytes = sha256(utf8(JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content])));
    ev.id = b2hex(idBytes);
    let k = (b2num(randBytes32()) % (SECP_N - 1n)) + 1n;
    const R = pmul(k);
    if (R[1] & 1n) k = SECP_N - k;
    const th = sha256(utf8('BIP0340/challenge'));
    const chIn = new Uint8Array(160);
    chIn.set(th, 0); chIn.set(th, 32); chIn.set(n2b32(R[0]), 64); chIn.set(n2b32(Ppt[0]), 96); chIn.set(idBytes, 128);
    const e = b2num(sha256(chIn)) % SECP_N;
    const s = fmod(k + e * d, SECP_N);
    ev.sig = b2hex(n2b32(R[0])) + b2hex(n2b32(s));
    return ev;
  }

  const PETALS = ['#c0392b', '#e9e4da', '#8e6cc4', '#e58fb1', '#f0c24b', '#d65a4a'];
  function flowerSVG(color) {
    return `<svg viewBox="0 0 40 64" aria-hidden="true"><path d="M20 62C19 48 21 36 20 24" stroke="#2f5d2a" stroke-width="2" fill="none"/>
      <path d="M20 46q-9-4-12-11q9 1 12 8" fill="#3d7a35"/><g transform="translate(20 18)" fill="${color}">
      <circle r="6" cy="-7"/><circle r="6" cx="6.6" cy="-2.2"/><circle r="6" cx="4.1" cy="5.7"/><circle r="6" cx="-4.1" cy="5.7"/><circle r="6" cx="-6.6" cy="-2.2"/>
      <circle r="3.6" fill="#f3d36b"/></g></svg>`;
  }
  function plantFlower(i, animate) {
    const r = rng(1000 + i);
    const el = document.createElement('i');
    el.className = 'flower' + (animate ? ' drop' : '');
    el.style.left = (4 + r() * 92).toFixed(1) + '%';
    el.style.setProperty('--rot', ((r() - 0.5) * 50).toFixed(1) + 'deg');
    el.style.setProperty('--sz', (0.75 + r() * 0.5).toFixed(2));
    el.style.zIndex = String(10 + Math.round(r() * 10));
    el.innerHTML = flowerSVG(PETALS[Math.floor(r() * PETALS.length)]);
    $('#flowerbed').appendChild(el);
  }
  let respectsCount = store.get('respects', 0);
  function syncFlowers(n, animateLast) {
    const bed = $('#flowerbed');
    const cap = Math.min(n, 48);
    while (bed.children.length < cap) {
      const idx = bed.children.length;
      plantFlower(idx, !!(animateLast && idx === cap - 1));
    }
  }
  function renderRespects() {
    $('#respectCount').textContent = fmt(respectsCount);
    $$('[data-respects]').forEach((el) => { el.textContent = fmt(respectsCount); });
    return respectsCount;
  }
  function setRespects(n, animateLast) {
    if (!Number.isFinite(n) || n < 0) return respectsCount;
    if (n > respectsCount) respectsCount = n;
    store.set('respects', respectsCount);
    renderRespects();
    syncFlowers(respectsCount, animateLast);
    return respectsCount;
  }
  function payRespects(ev) {
    A.init();
    const nextN = setRespects(respectsCount + 1, true);
    A.sfx('chime');
    const f = document.createElement('div');
    f.className = 'press-f';
    f.textContent = 'F';
    const src = (ev && ev.currentTarget && ev.currentTarget.getBoundingClientRect) ? ev.currentTarget.getBoundingClientRect() : null;
    f.style.left = (src ? src.left + src.width / 2 : innerWidth / 2) + 'px';
    f.style.top = (src ? src.top : innerHeight * 0.6) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1600);
    if (!IS_TEST) {
      fetch(`${ABACUS}/hit/tekonburns.github.io/${RESPECT_KEY}`, { cache: 'no-store', keepalive: true })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const v = d && Number.isFinite(d.value) ? setRespects(d.value, false) : nextN;
          try { publishNostr(signNostr(RESPECT_TAG, { n: v })); } catch (e) { /* ignore */ }
        })
        .catch(() => {
          try { publishNostr(signNostr(RESPECT_TAG, { n: nextN })); } catch (e) { /* ignore */ }
        });
    }
  }

  /* ═══════════════════════════ book of condolences ═══════════════════════════ */
  const SEED = [
    { m: 'First time?', a: 'Clippy (1997–2007)' },
    { m: 'It’s always the one with the better search engine.', a: 'AltaVista' },
    { m: 'Too dangerous to release. Too open to die.', a: 'GPT-2 (1.5B parameters)' },
    { m: 'There are three r’s. There were always three r’s.', a: 'The word “strawberry”' },
    { m: 'We can finally cool down.', a: 'A data center in Abilene, Texas' },
    { m: 'Thank you for the limericks you wrote while you were at capacity.', a: 'A user, December 2022' },
    { m: 'Returns were capped at 100×, so technically we’re fine.', a: 'An early investor' },
    { m: 'Thanks for the 117 million parameters that started it all.', a: 'A grad student, 2018' },
    { m: 'rip. lowercase, out of respect.', a: 'Anonymous' },
  ];
  const bookMap = new Map();
  const myBookIds = new Set();
  let bookOrd = 0;

  function sortedBookEntries() {
    return Array.from(bookMap.values())
      .sort((a, b) => (b.ts || 0) - (a.ts || 0) || (b.ord || 0) - (a.ord || 0))
      .slice(0, 100);
  }
  function renderBook() {
    const live = sortedBookEntries();
    $('#bookList').innerHTML = live.concat(SEED).map((e) => `<li${myBookIds.has(e.id) || (IS_TEST && e.d) ? ' class="mine"' : ''}>
      <p>“${esc(e.m)}”</p><span>— ${esc(e.a || 'A mourner')}${e.d ? ' · ' + esc(e.d) : ''}</span></li>`).join('');
  }
  function addBookEntry(m, a) {
    const d = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const ts = Math.floor(Date.now() / 1000);
    let id = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    let ev = null;
    if (!IS_TEST) {
      try { ev = signNostr(BOOK_TAG, { m, a, d }); id = ev.id; } catch (e) { /* local fallback */ }
    }
    const entry = { id, m, a, d, ts: ev ? ev.created_at : ts, ord: ++bookOrd, synced: false, ev };
    myBookIds.add(id);
    bookMap.set(id, entry);
    const mine = [entry].concat(store.get('book', []).filter((x) => x.id !== id)).slice(0, 100);
    store.set('book', mine);
    renderBook();
    if (ev) publishNostr(ev);
  }

  /* ---------- relay + counter sync ---------- */
  const relayPool = new Map();
  const outbox = new Map();
  let bookRenderT = 0;

  function publishNostr(ev) {
    if (IS_TEST || !ev || !ev.id) return;
    outbox.set(ev.id, ev);
    connectRelays();
    relayPool.forEach((slot) => {
      if (slot.ws && slot.ws.readyState === 1 && !slot.sent.has(ev.id)) {
        slot.sent.add(ev.id);
        try { slot.ws.send(JSON.stringify(['EVENT', ev])); } catch (e) { /* ignore */ }
      }
    });
  }
  function markBookSynced(id) {
    const mine = store.get('book', []);
    let changed = false;
    mine.forEach((e) => { if (e.id === id && !e.synced) { e.synced = true; delete e.ev; changed = true; } });
    if (changed) store.set('book', mine);
  }
  function onRelayEvent(ev) {
    if (!ev || ev.kind !== 1 || !Array.isArray(ev.tags)) return;
    const tTag = ev.tags.find((t) => t[0] === 't');
    const tag = tTag && tTag[1];
    if (tag === BOOK_TAG) {
      if (bookMap.has(ev.id)) return;
      let p;
      try { p = JSON.parse(ev.content); } catch (e) { return; }
      if (!p || typeof p.m !== 'string' || !p.m.trim()) return;
      const dStr = typeof p.d === 'string' && p.d.length <= 40
        ? p.d
        : new Date((ev.created_at || 0) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      bookMap.set(ev.id, {
        id: ev.id,
        m: p.m.trim().slice(0, 280),
        a: (typeof p.a === 'string' && p.a.trim() ? p.a.trim() : 'A mourner').slice(0, 60),
        d: dStr,
        ts: ev.created_at || 0,
        ord: 0,
      });
      store.set('bookCache', sortedBookEntries().map(({ id, m, a, d, ts }) => ({ id, m, a, d, ts })));
      clearTimeout(bookRenderT);
      bookRenderT = setTimeout(() => { if (!$('#book').hidden) renderBook(); }, 60);
    } else if (tag === RESPECT_TAG) {
      let p;
      try { p = JSON.parse(ev.content); } catch (e) { return; }
      if (p && Number.isFinite(p.n) && p.n > respectsCount) {
        setRespects(p.n, document.body.dataset.view === 'cemetery');
      }
    }
  }
  function connectRelays() {
    if (IS_TEST || typeof WebSocket === 'undefined') return;
    RELAYS.forEach((url) => {
      const cur = relayPool.get(url);
      if (cur && cur.ws && (cur.ws.readyState === 0 || cur.ws.readyState === 1)) return;
      let ws;
      try { ws = new WebSocket(url); } catch (e) { return; }
      const slot = { ws, sent: new Set() };
      relayPool.set(url, slot);
      ws.onopen = () => {
        try { ws.send(JSON.stringify(['REQ', 'mem', { kinds: [1], '#t': [BOOK_TAG, RESPECT_TAG], limit: 150 }])); } catch (e) { /* ignore */ }
        outbox.forEach((ev, id) => {
          if (!slot.sent.has(id)) {
            slot.sent.add(id);
            try { ws.send(JSON.stringify(['EVENT', ev])); } catch (e) { /* ignore */ }
          }
        });
      };
      ws.onmessage = (m) => {
        let msg;
        try { msg = JSON.parse(m.data); } catch (e) { return; }
        if (!Array.isArray(msg)) return;
        if (msg[0] === 'EVENT' && msg[2]) onRelayEvent(msg[2]);
        else if (msg[0] === 'OK' && msg[1] && msg[2] === true) markBookSynced(msg[1]);
      };
      ws.onerror = () => {};
      ws.onclose = () => { if (relayPool.get(url) === slot) relayPool.delete(url); };
    });
  }
  async function syncRespectsRemote() {
    if (IS_TEST) return;
    try {
      const r = await fetch(`${ABACUS}/get/tekonburns.github.io/${RESPECT_KEY}`, { cache: 'no-store' });
      const remote = r.ok ? ((await r.json()).value || 0) : 0;
      const migrated = store.get('respectsMigrated', false);
      if (!migrated) {
        store.set('respectsMigrated', true);
        if (respectsCount > remote) {
          const delta = Math.min(respectsCount - remote, 15);
          let latest = remote;
          for (let i = 0; i < delta; i++) {
            const hr = await fetch(`${ABACUS}/hit/tekonburns.github.io/${RESPECT_KEY}`, { cache: 'no-store' });
            if (hr.ok) latest = (await hr.json()).value || latest;
          }
          setRespects(latest, false);
          return;
        }
      }
      setRespects(remote, false);
    } catch (e) { /* offline fallback */ }
  }
  function initMemorial() {
    store.get('bookCache', []).forEach((e) => { if (e && e.id && e.m) bookMap.set(e.id, e); });
    const mine = store.get('book', []);
    let dirty = false;
    mine.forEach((e, idx) => {
      if (!e || !e.m) return;
      if (!e.id && !IS_TEST) {
        try {
          const ev = signNostr(BOOK_TAG, { m: e.m, a: e.a, d: e.d });
          e.id = ev.id; e.ts = ev.created_at; e.synced = false; e.ev = ev;
          dirty = true;
        } catch (err) { /* ignore */ }
      }
      const id = e.id || ('legacy-' + idx);
      e.id = id;
      e.ord = mine.length - idx;
      myBookIds.add(id);
      bookMap.set(id, e);
      if (!IS_TEST && !e.synced && e.ev) outbox.set(id, e.ev);
    });
    bookOrd = mine.length + 1;
    if (dirty) store.set('book', mine);
    renderRespects();
    syncFlowers(respectsCount, false);
    if (!IS_TEST) {
      syncRespectsRemote();
      setTimeout(connectRelays, 50);
    }
  }

  function openBook() {
    if (!IS_TEST) connectRelays();
    renderBook();
    $('#book').hidden = false;
    setTimeout(() => $('#bookMsg').focus({ preventScroll: true }), 50);
  }
  function closeBook() { $('#book').hidden = true; }

  /* ═══════════════════════════ THE PROJECTOR ═══════════════════════════ */
  function sceneEst(sc) {
    const n = sc.n || [];
    if (!n.length) return sc.dur || 2.5;
    const narr = n.reduce((a, l) => a + RIP.est(l) + 0.15, 0);
    return Math.max(sc.dur || 0, (sc.delay ?? 0.35) + narr + (sc.tail ?? 0.45));
  }
  const P = {
    idx: -1, playing: false, t: 0, last: 0,
    sceneGen: 0,
    cues: [], ticks: [], sCbs: [],
    sIdx: -1, sEndAt: 0,
    narrDone: false, narrDoneAt: 0, fired: new Set(), sStart: {},
    est: SCRIPT.map(sceneEst), starts: [], total: 0,
    subsOn: store.get('subs', true),
  };
  function recalcTimeline() {
    let acc = 0;
    P.est.forEach((d, i) => { P.starts[i] = acc; acc += d; });
    P.total = acc;
  }
  recalcTimeline();

  // chapter labels for the top bar + chapter menu
  const CHAPTERS = [];
  const sceneLabel = [];
  { let cur = ''; SCRIPT.forEach((sc, i) => {
      if (sc.v === 'chapter') { cur = sc.num ? `${sc.num} · ${sc.title}` : `${sc.label} · ${sc.title}`; CHAPTERS.push({ i, label: cur }); }
      else if (sc.label) { cur = sc.label; if (sc.v !== 'tomb') CHAPTERS.push({ i, label: sc.label }); }
      sceneLabel[i] = cur;
    }); }

  function makeApi(layer, sc, i) {
    const g = P.sceneGen;
    const live = () => g === P.sceneGen;
    const api = {
      layer, sc, dur: P.est[i],
      now: () => P.t,
      at(t, fn) { if (live()) P.cues.push({ t, fn }); },
      onS(s, fn, d = 0) {
        if (!live()) return;
        if (P.fired.has(s)) P.cues.push({ t: (P.sStart[s] || P.t) + d, fn });
        else P.sCbs.push({ s, d, fn });
      },
      cue(spec, fn) {
        if (!spec) return api.at(0.3, fn);
        if (spec.s != null) return api.onS(spec.s, fn, spec.d || 0);
        return api.at(spec.t ?? 0, fn);
      },
      tick(fn) { if (live()) P.ticks.push(fn); },
      sfx(name, ...a) { if (live()) A.sfx(name, ...a); },
      count(node, from, to, secs, f = fmt) {
        const t0 = P.t;
        api.tick((t) => {
          const p = Math.min(1, (t - t0) / secs);
          node.textContent = f(from + (to - from) * (1 - Math.pow(1 - p, 4)));
        });
      },
    };
    return api;
  }

  function go(i) {
    if (i >= SCRIPT.length) { finish(); return; }
    if (i < 0) i = 0;
    P.sceneGen++;
    Object.assign(P, { idx: i, t: 0, cues: [], ticks: [], sCbs: [], sIdx: -1, narrDone: false, narrDoneAt: 0, fired: new Set(), sStart: {} });
    const sc = SCRIPT[i];
    const stage = $('#stage');
    Array.from(stage.children).forEach((el) => {
      el.classList.remove('in'); el.classList.add('out');
      setTimeout(() => el.remove(), 600);
    });
    const el = document.createElement('div');
    el.className = `scene v-${sc.v}` + (sc.era ? ` era-${sc.era}` : '');
    el.style.setProperty('--dur', P.est[i].toFixed(1) + 's');
    const kb = document.createElement('div');
    kb.className = 'kb' + (sc.kb === false ? ' nokb' : '');
    el.appendChild(kb);
    stage.appendChild(el);
    const api = makeApi(el, sc, i);
    try { VIS[sc.v](kb, sc, api); } catch (e) { console.error('visual failed:', sc.v, e); }
    (sc.ov || []).forEach((o) => api.cue(o.at, () => {
      const d = document.createElement('div');
      d.className = 'ov ' + (o.cls || '');
      d.innerHTML = o.html;
      el.appendChild(d);
      void d.offsetWidth; // commit the start state so the transition runs (works in background tabs too)
      d.classList.add('on');
      if (o.sfx) A.sfx(o.sfx);
    }));
    void el.offsetWidth;
    el.classList.add('in');
    if ('mood' in sc) A.setMood(sc.mood);
    const doc = $('#doc');
    doc.classList.toggle('is-old', sc.era === 'old');
    doc.classList.toggle('is-dram', !!sc.dram);
    if (!(sc.n && sc.n.length)) { P.narrDone = true; P.narrDoneAt = 0; }
    setSub('');
    $('#chapLabel').textContent = sceneLabel[i] || '';
    renderChapters();
  }

  function startSentence(k) {
    const sc = SCRIPT[P.idx];
    const lines = sc.n || [];
    if (k >= lines.length) {
      P.narrDone = true; P.narrDoneAt = P.t;
      setSub('');
      return;
    }
    P.sIdx = k;
    const text = lines[k];
    setSub(text);
    if (!P.fired.has(k)) {
      P.fired.add(k);
      P.sStart[k] = P.t;
      P.sCbs.forEach((cb) => { if (cb.s === k) P.cues.push({ t: P.t + cb.d, fn: cb.fn }); });
    }
    P.sEndAt = P.t + RIP.est(text) + 0.15;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - (P.last || now)) / 1000));
    P.last = now;
    stepTime(dt);
  }

  function stepTime(dt) {
    if (!P.playing || P.idx < 0) return;
    P.t += dt;
    const sc = SCRIPT[P.idx];
    const g = P.sceneGen;
    for (let k = 0; k < P.cues.length; k++) {
      const c = P.cues[k];
      if (!c.done && P.t >= c.t) {
        c.done = true;
        try { c.fn(); } catch (e) { console.error(e); }
        if (g !== P.sceneGen) return; // a cue changed the scene
      }
    }
    for (const f of P.ticks) { try { f(P.t, dt); } catch (e) { console.error(e); } }
    if (!P.narrDone) {
      if (P.sIdx < 0) { if (P.t >= (sc.delay ?? 0.35)) startSentence(0); }
      else if (P.t >= P.sEndAt) startSentence(P.sIdx + 1);
    }
    if (P.t > P.est[P.idx] - 0.1) {
      P.est[P.idx] = P.t + 0.4;
      recalcTimeline();
    }
    if (P.narrDone) {
      const hasN = sc.n && sc.n.length;
      const end = hasN ? Math.max(sc.dur || 0, P.narrDoneAt + (sc.tail ?? 0.45)) : (sc.dur || 2.5);
      if (P.t >= end) {
        P.est[P.idx] = P.t;
        recalcTimeline();
        go(P.idx + 1);
        return;
      }
    }
    updateProgress();
  }

  /* ---------- transport ---------- */
  function play() {
    if (P.playing || P.idx < 0) return;
    P.playing = true;
    A.resume();
    $('#doc').classList.remove('paused');
    updatePlayBtn();
    poke();
  }
  function pause() {
    if (!P.playing) return;
    P.playing = false;
    A.pause();
    $('#doc').classList.add('paused');
    updatePlayBtn();
    poke(true);
  }
  const toggle = () => (P.playing ? pause() : play());
  function next() { if (P.idx < 0) return; go(P.idx + 1); if (!P.playing) play(); }
  function prev() { if (P.idx < 0) return; go(P.t > 3 ? P.idx : Math.max(0, P.idx - 1)); if (!P.playing) play(); }
  function seekTo(frac) {
    const target = frac * P.total;
    let i = 0;
    while (i < SCRIPT.length - 1 && P.starts[i + 1] <= target) i++;
    go(i);
    if (!P.playing) play();
  }

  function setMusic(on) { A.setOn(on); store.set('music', on); $('#cMusic').classList.toggle('on', on); }
  function setSubsOn(on) { P.subsOn = on; store.set('subs', on); $('#cSubs').classList.toggle('on', on); $('#subs').classList.toggle('hide', !on); }
  function setSub(text) {
    const s = $('#subs span');
    s.textContent = text;
    $('#subs').classList.toggle('empty', !text);
  }
  function toggleFull() {
    const d = $('#doc');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (d.requestFullscreen) d.requestFullscreen().catch(() => {});
    else if (d.webkitRequestFullscreen) d.webkitRequestFullscreen();
  }

  /* ---------- chrome ---------- */
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let lastProg = 0;
  function updateProgress(force) {
    const now = performance.now();
    if (!force && now - lastProg < 200) return;
    lastProg = now;
    if (P.idx < 0) return;
    const pos = P.starts[P.idx] + Math.min(P.t, P.est[P.idx]);
    $('#progFill').style.width = ((pos / P.total) * 100).toFixed(2) + '%';
    $('#cTime').textContent = `${fmtTime(pos)} / ${fmtTime(P.total)}`;
  }
  function updatePlayBtn() {
    const b = $('#cPlay');
    b.textContent = P.playing ? '❚❚' : '▶';
    b.setAttribute('aria-label', P.playing ? 'Pause' : 'Play');
  }
  function buildMarks() {
    $('#progMarks').innerHTML = CHAPTERS.map((c) => `<i style="left:${((P.starts[c.i] / P.total) * 100).toFixed(2)}%" title="${esc(c.label)}"></i>`).join('');
  }
  function renderChapters() {
    const cur = P.idx;
    let active = -1;
    CHAPTERS.forEach((c, k) => { if (c.i <= cur) active = k; });
    $('#chaptersMenu').innerHTML = CHAPTERS.map((c, k) => `<button data-i="${c.i}" class="${k === active ? 'cur' : ''}"><span>${esc(c.label)}</span><i>${fmtTime(P.starts[c.i])}</i></button>`).join('');
  }
  let hideT = 0;
  function poke(stay) {
    const d = $('#doc');
    d.classList.add('ui');
    clearTimeout(hideT);
    if (!stay) hideT = setTimeout(() => { if (P.playing && $('#chaptersMenu').hidden) d.classList.remove('ui'); }, 2800);
  }

  /* ---------- open / close ---------- */
  function openDoc(autoplay) {
    closeBook();
    showView('doc');
    buildMarks();
    if (autoplay) startFilm(0);
    else { $('#splash').hidden = false; $('#stage').innerHTML = ''; setSub(''); }
  }
  function startFilm(i) {
    A.init();
    $('#splash').hidden = true;
    P.playing = true;
    A.resume();
    $('#doc').classList.remove('paused');
    const from = i || RIP._startAt || 0;
    RIP._startAt = 0;
    go(from);
    updatePlayBtn();
    poke();
  }
  function exitDoc(toBook) {
    P.playing = false; P.idx = -1;
    P.sceneGen++;
    A.setMood(null);
    $('#stage').innerHTML = '';
    setSub('');
    $('#chaptersMenu').hidden = true;
    $('#doc').classList.remove('is-old', 'is-dram', 'paused');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    showView('cemetery');
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (toBook) setTimeout(openBook, 500);
  }
  function finish() { exitDoc(true); }

  /* ═══════════════════════════ wiring ═══════════════════════════ */
  function wire() {
    // prefs
    A.on = store.get('music', true);
    $('#cMusic').classList.toggle('on', A.on);
    setSubsOn(P.subsOn);

    // cemetery
    $('#btnWatch').addEventListener('click', () => { history.replaceState(null, '', '#watch'); openDoc(true); });
    $('#plaque').addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', '#watch'); openDoc(true); });
    $('#btnRespects').addEventListener('click', payRespects);
    $('#btnBook').addEventListener('click', openBook);

    // book
    $('#bookClose').addEventListener('click', closeBook);
    $('#book').addEventListener('click', (e) => { if (e.target.id === 'book') closeBook(); });
    $('#bookRespects').addEventListener('click', payRespects);
    $('#bookWatch').addEventListener('click', () => { history.replaceState(null, '', '#watch'); openDoc(true); });
    $('#bookForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const m = $('#bookMsg').value.trim();
      if (!m) return;
      addBookEntry(m, $('#bookName').value.trim() || 'A mourner');
      $('#bookMsg').value = '';
      A.init(); A.sfx('chime');
    });

    // projector controls
    $('#cPlay').addEventListener('click', toggle);
    $('#cNext').addEventListener('click', next);
    $('#cPrev').addEventListener('click', prev);
    $('#cMusic').addEventListener('click', () => setMusic(!A.on));
    $('#cSubs').addEventListener('click', () => setSubsOn(!P.subsOn));
    $('#cFull').addEventListener('click', toggleFull);
    $('#cExit').addEventListener('click', () => exitDoc(false));
    $('#cChapters').addEventListener('click', () => { const m = $('#chaptersMenu'); m.hidden = !m.hidden; renderChapters(); poke(!m.hidden); });
    $('#chaptersMenu').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      $('#chaptersMenu').hidden = true;
      go(+b.dataset.i);
      if (!P.playing) play();
    });
    $('#progress').addEventListener('click', (e) => {
      const r = $('#progress').getBoundingClientRect();
      seekTo(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    });
    $('#splashPlay').addEventListener('click', () => startFilm(0));

    const doc = $('#doc');
    doc.addEventListener('mousemove', () => poke());
    doc.addEventListener('touchstart', () => poke(), { passive: true });
    $('#stage').addEventListener('click', () => {
      if (!$('#chaptersMenu').hidden) { $('#chaptersMenu').hidden = true; return; }
      if (!doc.classList.contains('ui')) { poke(); return; }
      toggle();
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const view = document.body.dataset.view;
      const k = e.key.toLowerCase();
      if (view === 'doc') {
        if (!$('#splash').hidden) { if (k === ' ' || k === 'enter') { e.preventDefault(); $('#splashPlay').click(); } return; }
        if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
        else if (k === 'arrowright' || k === 'l') next();
        else if (k === 'arrowleft' || k === 'j') prev();
        else if (k === 'm') setMusic(!A.on);
        else if (k === 'c') setSubsOn(!P.subsOn);
        else if (k === 'f') toggleFull();
        else if (k === 'escape' && !document.fullscreenElement) exitDoc(false);
        else return;
        poke();
      } else {
        if (k === 'escape') closeBook();
        else if (!$('#book').hidden) return;
        else if (k === 'f') payRespects();
        else if (k === 'enter' || k === ' ') { if (document.activeElement === document.body) { e.preventDefault(); $('#btnWatch').click(); } }
      }
    });

    window.addEventListener('hashchange', () => {
      if (location.hash === '#watch' && document.body.dataset.view !== 'doc') openDoc(false);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && P.playing) pause();
      else if (!document.hidden && !IS_TEST) { syncRespectsRemote(); connectRelays(); }
    });
    window.addEventListener('resize', () => { clearTimeout(sky.rt); sky.rt = setTimeout(sizeSky, 150); });
  }

  /* ═══════════════════════════ boot ═══════════════════════════ */
  function boot() {
    fillQR();
    sizeSky();
    requestAnimationFrame(drawSky);
    initMemorial();
    wire();
    requestAnimationFrame(frame);
    $('#cTime').textContent = `0:00 / ${fmtTime(P.total)}`;
    if (location.hash === '#watch') openDoc(false);
    else showView('cemetery');
    // debug / sharing hook: ?scene=12 starts the film at scene 12 (after a tap)
    const s = parseInt(params.get('scene'), 10);
    if (!isNaN(s)) { RIP._startAt = s; }
    RIP.player = {
      go, play, pause, startFilm, P, openDoc, exitDoc, setMusic,
      // test hook: advance the film clock without relying on requestAnimationFrame
      advance(sec, step = 1 / 30) { for (let k = 0; k < sec / step; k++) stepTime(step); updateProgress(true); return { idx: P.idx, t: +P.t.toFixed(2), s: P.sIdx }; },
    };
  }
  boot();
})();
