/* ──────────────────────────────────────────────────────────────────────────
   CLOSED. — audio: a generative score and a box of sound effects.
   Everything is synthesised live with the Web Audio API.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  const RIP = (window.RIP = window.RIP || {});

  /* ═══════════════════════════ MUSIC + SFX ═══════════════════════════ */
  const M = (RIP.Audio = {
    ctx: null,
    on: true,          // score enabled
    mood: null,        // current mood key
    bar: 0,
    barLen: 4.8,       // seconds per chord
    nextBar: 0,
  });

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Chord progressions. First number = bass root; the rest = pad voicing.
  const MOODS = {
    hope:    { chords: [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]], arp: 0.5, bright: 1500 }, // C G Am F
    wonder:  { chords: [[41, 60, 65, 69], [48, 60, 64, 67], [50, 62, 65, 69], [46, 58, 62, 65]], arp: 0.45, bright: 1300 }, // F C Dm Bb
    tension: { chords: [[45, 57, 60, 64], [41, 57, 60, 65], [38, 57, 62, 65], [40, 56, 59, 64]], arp: 0.28, bright: 950, pulse: true }, // Am F Dm E
    grief:   { chords: [[38, 57, 62, 65], [46, 58, 62, 65], [41, 57, 60, 65], [45, 57, 61, 64]], arp: 0.24, bright: 850 }, // Dm Bb F A
    void:    { chords: [[38, 50, 57], [38, 50, 57], [36, 50, 55], [38, 50, 57]], arp: 0, bright: 520 }, // drone
    end:     { chords: [[41, 60, 65, 69], [48, 60, 64, 67], [50, 62, 65, 69], [46, 58, 62, 65, 70]], arp: 0.42, bright: 1400 }, // F C Dm Bb
  };

  M.init = function () {
    if (M.ctx) { if (M.ctx.state === 'suspended') M.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (M.ctx = new AC());

    M.out = ctx.createGain();
    M.out.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    M.out.connect(comp); comp.connect(ctx.destination);

    // A cheap cathedral: exponentially decaying noise as an impulse response.
    M.verb = ctx.createConvolver();
    M.verb.buffer = impulse(ctx, 3.6, 2.4);
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.5;
    M.verb.connect(verbOut); verbOut.connect(M.out);

    M.music = ctx.createGain(); M.music.gain.value = M.on ? 0.5 : 0;
    M.duckG = ctx.createGain(); M.duckG.gain.value = 1;
    M.music.connect(M.duckG); M.duckG.connect(M.out); M.duckG.connect(M.verb);

    M.sfxBus = ctx.createGain(); M.sfxBus.gain.value = 0.85; M.sfxBus.connect(M.out);
    const sfxSend = ctx.createGain(); sfxSend.gain.value = 0.22;
    M.sfxBus.connect(sfxSend); sfxSend.connect(M.verb);

    // 2 s of white noise, reused by every noisy effect.
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    M.noiseBuf = nb;

    M.nextBar = ctx.currentTime + 0.15;
    setInterval(schedule, 120);
  };

  function impulse(ctx, secs, decay) {
    const len = Math.floor(ctx.sampleRate * secs);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  /* ---------- the score ---------- */
  function schedule() {
    const ctx = M.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (M.nextBar < ctx.currentTime) M.nextBar = ctx.currentTime + 0.05;
    while (M.nextBar < ctx.currentTime + 0.5) {
      const mood = MOODS[M.mood];
      if (mood) playBar(mood, M.nextBar, M.bar++);
      M.nextBar += M.barLen;
    }
  }

  function playBar(mood, t, n) {
    const ch = mood.chords[n % mood.chords.length];
    const L = M.barLen;
    tone(mtof(ch[0] - 12), t, L + 1.6, { type: 'sine', gain: 0.2, a: 1.4, r: 1.8, dest: M.music });
    for (let i = 1; i < ch.length; i++) pad(mtof(ch[i]), t, L + 1.4, mood.bright);
    if (mood.arp) {
      for (let k = 0; k < 8; k++) {
        if (Math.random() < mood.arp) {
          const note = ch[1 + Math.floor(Math.random() * (ch.length - 1))] + (Math.random() < 0.55 ? 12 : 0);
          pluck(mtof(note), t + (k * L) / 8 + Math.random() * 0.03, 0.035 + Math.random() * 0.035);
        }
      }
    }
    if (mood.pulse) {
      for (let k = 0; k < 4; k++) tone(mtof(ch[0] - 12), t + (k * L) / 4, 0.6, { type: 'triangle', gain: 0.06, a: 0.01, r: 0.5, dest: M.music });
    }
  }

  function pad(freq, t, dur, bright) {
    const ctx = M.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 1.5);
    g.gain.setValueAtTime(0.04, t + dur - 1.6);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = bright; f.Q.value = 0.4;
    [-8, 7].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.05);
    });
    f.connect(g); g.connect(M.music);
  }

  function pluck(freq, t, vel) {
    const ctx = M.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.001;
    const g2 = ctx.createGain(); g2.gain.value = 0.3;
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(M.music);
    o1.start(t); o2.start(t); o1.stop(t + 2.9); o2.stop(t + 2.9);
  }

  function tone(freq, t, dur, o = {}) {
    const ctx = M.ctx;
    const { type = 'sine', gain = 0.2, a = 0.01, r = 0.3, dest = M.sfxBus, to } = o;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a);
    g.gain.setValueAtTime(gain, Math.max(t + a, t + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.05);
    return { osc, g };
  }

  function noise(t, dur, o = {}) {
    const ctx = M.ctx;
    const { gain = 0.2, type = 'bandpass', f = 1000, q = 1, a = 0.005, f2, dest = M.sfxBus } = o;
    const src = ctx.createBufferSource();
    src.buffer = M.noiseBuf; src.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(dest);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
    return { src, fl, g };
  }

  /* ---------- sound effects ---------- */
  const SFX = {
    chime() {
      const t = M.ctx.currentTime;
      [[523.25, 0], [783.99, 0.09], [1046.5, 0.2]].forEach(([f, d]) => {
        tone(f, t + d, 3.2, { gain: 0.09, a: 0.005, r: 3 });
        tone(f * 2.76, t + d, 1.2, { gain: 0.025, a: 0.005, r: 1.1 });
      });
    },
    hit() {
      const t = M.ctx.currentTime;
      tone(72, t, 1.6, { gain: 0.45, a: 0.01, r: 1.5, to: 36 });
      noise(t, 0.5, { type: 'lowpass', f: 500, gain: 0.12 });
    },
    boom() {
      const t = M.ctx.currentTime;
      tone(64, t, 2.8, { gain: 0.7, a: 0.01, r: 2.6, to: 28 });
      noise(t, 1.8, { type: 'lowpass', f: 260, gain: 0.3 });
      tone(196, t, 3.5, { type: 'triangle', gain: 0.04, a: 0.02, r: 3.2 });
    },
    buzz(dur = 2.5) {
      const ctx = M.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 3;
      const g = ctx.createGain(); g.gain.value = 0;
      for (let k = 0; k < dur * 14; k++) g.gain.setValueAtTime(Math.random() < 0.85 ? 0.022 : 0.004, t + k / 14);
      g.gain.setValueAtTime(0.0001, t + dur);
      o.connect(bp); bp.connect(g); g.connect(M.sfxBus);
      o.start(t); o.stop(t + dur + 0.05);
      tone(60, t, dur, { gain: 0.03, a: 0.05, r: 0.2 });
    },
    clunk() {
      const t = M.ctx.currentTime;
      tone(110, t, 0.2, { gain: 0.35, to: 48 });
      noise(t, 0.06, { type: 'highpass', f: 2500, gain: 0.15 });
    },
    snip() {
      const t = M.ctx.currentTime;
      noise(t, 0.05, { type: 'highpass', f: 4000, gain: 0.25 });
      noise(t + 0.09, 0.06, { type: 'highpass', f: 3500, gain: 0.3 });
    },
    pop() { tone(520, M.ctx.currentTime, 0.09, { gain: 0.08, to: 900, r: 0.06 }); },
    key() { noise(M.ctx.currentTime, 0.018, { f: 2800 + Math.random() * 1200, q: 2, gain: 0.05 }); },
    type() {
      const t = M.ctx.currentTime;
      noise(t, 0.025, { f: 2000 + Math.random() * 1800, q: 1.5, gain: 0.14 });
      tone(180, t, 0.04, { gain: 0.05, to: 90 });
    },
    error() {
      const t = M.ctx.currentTime;
      tone(520, t, 0.13, { type: 'triangle', gain: 0.1 });
      tone(370, t + 0.14, 0.24, { type: 'triangle', gain: 0.1 });
    },
    tick() { tone(1800, M.ctx.currentTime, 0.035, { gain: 0.035 }); },
    rise() {
      const t = M.ctx.currentTime;
      tone(220, t, 1.6, { type: 'triangle', gain: 0.04, a: 0.05, r: 0.4, to: 880 });
      for (let k = 0; k < 6; k++) tone(1200 + k * 180, t + 0.2 + k * 0.18, 0.12, { gain: 0.02 });
    },
    alarm() {
      const t = M.ctx.currentTime;
      for (let k = 0; k < 4; k++) tone(k % 2 ? 620 : 740, t + k * 0.26, 0.24, { type: 'square', gain: 0.025, r: 0.05 });
    },
    news() {
      const t = M.ctx.currentTime;
      tone(1175, t, 0.06, { gain: 0.05 });
      tone(1568, t + 0.07, 0.08, { gain: 0.05 });
    },
    whoosh() { noise(M.ctx.currentTime, 0.75, { f: 350, f2: 2600, q: 0.9, gain: 0.2, a: 0.25 }); },
    crash() {
      const t = M.ctx.currentTime;
      tone(320, t, 1.8, { type: 'sawtooth', gain: 0.06, a: 0.02, r: 0.5, to: 40 });
      tone(58, t + 1.2, 1.8, { gain: 0.5, to: 30, r: 1.6 });
    },
    stamp() {
      const t = M.ctx.currentTime;
      tone(150, t, 0.22, { gain: 0.5, to: 55 });
      noise(t, 0.06, { type: 'lowpass', f: 1600, gain: 0.3 });
    },
    sizzle() { noise(M.ctx.currentTime, 2.6, { type: 'highpass', f: 4500, gain: 0.04, a: 0.4 }); },
    achv() {
      const t = M.ctx.currentTime;
      tone(880, t, 0.14, { gain: 0.07 });
      tone(1318.5, t + 0.1, 0.3, { gain: 0.07, r: 0.25 });
    },
    beep() { tone(960, M.ctx.currentTime, 0.14, { gain: 0.13, a: 0.004, r: 0.04 }); },
    flat(dur = 4) {
      const ctx = M.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 960;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.005);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.45);
      o.connect(g); g.connect(M.sfxBus);
      o.start(t); o.stop(t + dur + 3);
    },
    shot() {
      const t = M.ctx.currentTime;
      noise(t, 0.35, { type: 'lowpass', f: 3500, gain: 0.45, a: 0.002 });
      tone(90, t, 0.4, { gain: 0.4, to: 40 });
    },
  };

  M.sfx = function (name, ...args) {
    if (!M.ctx || M.ctx.state !== 'running' || !SFX[name]) return;
    try { SFX[name](...args); } catch (e) { /* never let a sound break the film */ }
  };

  M.setMood = function (m) { M.mood = m || null; };
  M.setOn = function (on) {
    M.on = on;
    if (M.ctx) M.music.gain.setTargetAtTime(on ? 0.5 : 0, M.ctx.currentTime, 0.25);
  };
  M.duck = function (on) {
    if (M.ctx) M.duckG.gain.setTargetAtTime(on ? 0.42 : 1, M.ctx.currentTime, 0.35);
  };
  M.pause = function () { if (M.ctx && M.ctx.state === 'running') M.ctx.suspend(); };
  M.resume = function () { if (M.ctx && M.ctx.state === 'suspended') M.ctx.resume(); };

  // Reading-pace duration (seconds) for an on-screen caption line.
  RIP.est = function (text) {
    const w = text.trim().split(/\s+/).length;
    const p = (text.match(/[,;:—–]/g) || []).length;
    const s = (text.match(/[.!?]/g) || []).length;
    return 0.15 + w / 3.0 + p * 0.12 + s * 0.18;
  };
})();
