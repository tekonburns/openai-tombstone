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
    paused: false,     // transport paused
    mood: null,        // current mood key
    moodBus: null,     // active mood gain node (crossfaded on mood change)
    bar: 0,
    barLen: 4.4,       // seconds per chord
    nextBar: 0,
  });

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Chord progressions: ch[0] = bass root; ch[1..3] = triad/voicing; pat = deterministic 8-step motif
  // (index into ch[1..], +3 shifts up an octave, -1 = rest) so the score never drops out randomly.
  const MOODS = {
    void: {
      chords: [[38, 57, 62, 65], [38, 55, 60, 64], [36, 55, 60, 62], [38, 57, 62, 65]], // Dm · Dm/C · Csus2 · Dm
      pat: [0, -1, 5, -1, 1, -1, 4, -1], vel: 0.048, bright: 1080, padG: 0.052,
    },
    wonder: {
      chords: [[41, 60, 65, 69], [48, 60, 64, 67], [50, 62, 65, 69], [46, 58, 62, 65]], // F · C · Dm · Bb
      pat: [0, 1, 2, 1, 3, 2, 1, 2], vel: 0.052, bright: 1480, padG: 0.056,
    },
    hope: {
      chords: [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]], // C · G · Am · F
      pat: [0, 1, 2, 4, 5, 2, 1, 2], vel: 0.056, bright: 1680, padG: 0.058,
    },
    grief: {
      chords: [[38, 57, 62, 65], [46, 58, 62, 65], [41, 57, 60, 65], [45, 57, 61, 64]], // Dm · Bb · F · A
      pat: [0, -1, 1, 2, 3, -1, 2, 1], vel: 0.050, bright: 1180, padG: 0.056,
    },
    tension: {
      chords: [[45, 57, 60, 64], [41, 57, 60, 65], [38, 57, 62, 65], [40, 56, 59, 64]], // Am · F · Dm · E
      pat: [0, 1, 0, 2, 3, 1, 2, 1], vel: 0.052, bright: 1300, padG: 0.055, pulse: true,
    },
    end: {
      chords: [[41, 60, 65, 69], [48, 60, 64, 67], [50, 62, 65, 69], [46, 58, 62, 65]], // F · C · Dm · Bb
      pat: [0, 1, 2, 5, 4, 2, 1, 0], vel: 0.054, bright: 1560, padG: 0.058,
    },
  };
  const STEP_ACCENT = [1.0, 0.72, 0.86, 0.74, 0.94, 0.72, 0.84, 0.70];

  /* ---------- mobile / iOS silent-switch & interrupted-context unlock ---------- */
  const IS_IOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
    (/Macintosh/.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1)
  );
  let iosUnlocked = false;

  function unlockAudioSession() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) { /* ignore */ }
    if (IS_IOS && !iosUnlocked && !(typeof navigator !== 'undefined' && navigator.audioSession)) {
      iosUnlocked = true;
      try {
        // Tiny 0.05 s silent 16-bit PCM WAV promotes older iOS WebKit out of the ringer-muted ambient category.
        const sr = 8000, samples = 400, dataSize = samples * 2, buf = new ArrayBuffer(44 + dataSize);
        const v = new DataView(buf);
        const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        w(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); w(8, 'WAVE');
        w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        w(36, 'data'); v.setUint32(40, dataSize, true);
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const a = document.createElement('audio');
        a.setAttribute('playsinline', '');
        a.src = 'data:audio/wav;base64,' + btoa(bin);
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* ignore */ }
    }
    if (M.ctx) {
      try {
        const b = M.ctx.createBuffer(1, 1, 22050);
        const s = M.ctx.createBufferSource();
        s.buffer = b;
        s.connect(M.ctx.destination);
        s.start(0);
      } catch (e) { /* ignore */ }
    }
  }

  function kickFromGesture() {
    if (!M.ctx || M.paused) return;
    unlockAudioSession();
    if (M.ctx.state !== 'running' && M.ctx.state !== 'closed') {
      try { M.ctx.resume().then(schedule).catch(() => {}); } catch (e) { /* ignore */ }
    }
  }
  if (typeof window !== 'undefined') {
    ['touchstart', 'touchend', 'pointerdown', 'keydown'].forEach((ev) => {
      window.addEventListener(ev, kickFromGesture, { capture: true, passive: true });
    });
  }

  M.init = function () {
    unlockAudioSession();
    if (M.ctx) {
      if (!M.paused && M.ctx.state !== 'running' && M.ctx.state !== 'closed') {
        try { M.ctx.resume().then(schedule).catch(() => {}); } catch (e) { /* ignore */ }
      }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx;
    try { ctx = new AC(); } catch (e) { return; }
    M.ctx = ctx;

    // Unlock immediately inside the user gesture before allocating buffers.
    unlockAudioSession();
    if (!M.paused && ctx.state !== 'running') {
      try { ctx.resume().then(schedule).catch(() => {}); } catch (e) { /* ignore */ }
    }
    ctx.onstatechange = () => { if (ctx.state === 'running' && !M.paused) schedule(); };

    // Separate music and SFX output paths so loud sound effects never duck/pump the score.
    const musicLim = ctx.createDynamicsCompressor();
    musicLim.threshold.value = -6; musicLim.knee.value = 8; musicLim.ratio.value = 4;
    musicLim.attack.value = 0.015; musicLim.release.value = 0.25;
    musicLim.connect(ctx.destination);

    const sfxLim = ctx.createDynamicsCompressor();
    sfxLim.threshold.value = -14; sfxLim.knee.value = 6; sfxLim.ratio.value = 3.5;
    sfxLim.attack.value = 0.005; sfxLim.release.value = 0.2;
    sfxLim.connect(ctx.destination);

    // Cathedral reverb shared as a parallel send.
    M.verb = ctx.createConvolver();
    M.verb.buffer = impulse(ctx, 2.4, 2.5);
    const verbMusic = ctx.createGain(); verbMusic.gain.value = 0.42;
    M.verb.connect(verbMusic); verbMusic.connect(musicLim);

    M.music = ctx.createGain();
    M.music.gain.value = M.on ? 0.68 : 0;
    M.music.connect(musicLim);
    M.music.connect(M.verb);

    M.sfxBus = ctx.createGain();
    M.sfxBus.gain.value = 0.85;
    M.sfxBus.connect(sfxLim);
    const sfxSend = ctx.createGain(); sfxSend.gain.value = 0.18;
    M.sfxBus.connect(sfxSend); sfxSend.connect(M.verb);

    // 1.5 s of white noise reused by percussion/atmosphere effects.
    const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    M.noiseBuf = nb;

    if (M.mood && MOODS[M.mood]) {
      M.moodBus = ctx.createGain();
      M.moodBus.connect(M.music);
      M.nextBar = 0;
    }
    setInterval(schedule, 140);
    schedule();
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
    if (!ctx || ctx.state !== 'running' || M.paused) return;
    const mood = MOODS[M.mood];
    if (!mood) { M.nextBar = 0; return; }
    if (!M.moodBus) {
      M.moodBus = ctx.createGain();
      M.moodBus.connect(M.music);
    }
    if (!M.nextBar || M.nextBar < ctx.currentTime) M.nextBar = ctx.currentTime + 0.03;
    // 0.85 s lookahead keeps playback rock-steady across main-thread frame spikes.
    while (M.nextBar < ctx.currentTime + 0.85) {
      playBar(mood, M.moodBus, M.nextBar, M.bar++);
      M.nextBar += M.barLen;
    }
  }

  function playBar(mood, bus, t, n) {
    const ch = mood.chords[n % mood.chords.length];
    const L = M.barLen;
    const fastIn = n === 0;
    bass(bus, mtof(ch[0] - 12), t, L + 0.9, fastIn);
    for (let i = 1; i < ch.length; i++) pad(bus, mtof(ch[i]), t, L + 1.0, mood.bright, mood.padG, fastIn);
    const tones = ch.slice(1);
    const stepDur = L / 8;
    for (let k = 0; k < 8; k++) {
      const p = mood.pat[k];
      if (p < 0) continue;
      const baseNote = tones[p % tones.length] + (p >= 3 ? 12 : 0);
      pluck(bus, mtof(baseNote), t + k * stepDur, mood.vel * STEP_ACCENT[k]);
    }
    if (mood.pulse) {
      for (let k = 0; k < 4; k++) {
        const pt = t + (k * L) / 4;
        tone(mtof(ch[0]), pt, 0.48, { type: 'triangle', gain: 0.075, a: 0.012, r: 0.38, dest: bus });
      }
    }
  }

  // Sub-fundamental + warm octave cello harmonics so bass translates clearly on phone speakers too.
  function bass(dest, freq, t, dur, fastIn) {
    const ctx = M.ctx;
    const t0 = Math.max(ctx.currentTime + 0.005, t);
    const att = fastIn ? 0.25 : 0.75;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(1, t0 + att);
    g.gain.setValueAtTime(1, Math.max(t0 + att, t0 + dur - 1.0));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);

    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.setValueAtTime(freq, t0);
    const subG = ctx.createGain(); subG.gain.value = 0.15;
    sub.connect(subG); subG.connect(g);

    const oct = ctx.createOscillator(); oct.type = 'triangle'; oct.frequency.setValueAtTime(freq * 2, t0);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 460;
    const octG = ctx.createGain(); octG.gain.value = 0.095;
    oct.connect(lp); lp.connect(octG); octG.connect(g);

    g.connect(dest);
    sub.start(t0); oct.start(t0);
    sub.stop(t0 + dur + 0.05); oct.stop(t0 + dur + 0.05);
  }

  function pad(dest, freq, t, dur, bright, peak, fastIn) {
    const ctx = M.ctx;
    const t0 = Math.max(ctx.currentTime + 0.005, t);
    const att = fastIn ? 0.32 : 0.85;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + att);
    g.gain.setValueAtTime(peak, Math.max(t0 + att, t0 + dur - 1.1));
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = bright; f.Q.value = 0.45;
    [-7, 7].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, t0); o.detune.value = det;
      o.connect(f); o.start(t0); o.stop(t0 + dur + 0.05);
    });
    f.connect(g); g.connect(dest);
  }

  function pluck(dest, freq, t, vel) {
    const ctx = M.ctx;
    const t0 = Math.max(ctx.currentTime + 0.005, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vel, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2800;
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.setValueAtTime(freq, t0);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(freq * 2.001, t0);
    const g2 = ctx.createGain(); g2.gain.value = 0.28;
    o1.connect(lp); o2.connect(g2); g2.connect(lp);
    lp.connect(g); g.connect(dest);
    o1.start(t0); o2.start(t0); o1.stop(t0 + 2.5); o2.stop(t0 + 2.5);
  }

  function tone(freq, t, dur, o = {}) {
    const ctx = M.ctx;
    const t0 = Math.max(ctx.currentTime + 0.004, t);
    const { type = 'sine', gain = 0.2, a = 0.01, r = 0.3, dest = M.sfxBus, to } = o;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + a);
    g.gain.setValueAtTime(gain, Math.max(t0 + a, t0 + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(dest);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
    return { osc, g };
  }

  function noise(t, dur, o = {}) {
    const ctx = M.ctx;
    const t0 = Math.max(ctx.currentTime + 0.004, t);
    const { gain = 0.2, type = 'bandpass', f = 1000, q = 1, a = 0.005, f2, dest = M.sfxBus } = o;
    const src = ctx.createBufferSource();
    src.buffer = M.noiseBuf; src.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(dest);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
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
      const ctx = M.ctx, t = ctx.currentTime + 0.004;
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
      const ctx = M.ctx, t = ctx.currentTime + 0.004;
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
    if (!M.ctx || M.paused || !SFX[name]) return;
    if (M.ctx.state === 'running') {
      try { SFX[name](...args); } catch (e) { /* never let a sound break the film */ }
    } else if (M.ctx.state !== 'closed') {
      try {
        M.ctx.resume().then(() => {
          if (!M.paused && M.ctx.state === 'running') {
            try { SFX[name](...args); } catch (e) { /* ignore */ }
          }
        }).catch(() => {});
      } catch (e) { /* ignore */ }
    }
  };

  M.setMood = function (m) {
    const next = m || null;
    if (next === M.mood) return;
    M.mood = next;
    M.bar = 0;
    M.nextBar = 0;
    const ctx = M.ctx;
    if (!ctx) return;
    if (M.moodBus) {
      const old = M.moodBus;
      M.moodBus = null;
      try {
        old.gain.cancelScheduledValues(ctx.currentTime);
        old.gain.setValueAtTime(old.gain.value, ctx.currentTime);
        old.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        setTimeout(() => { try { old.disconnect(); } catch (e) { /* ignore */ } }, 550);
      } catch (e) { /* ignore */ }
    }
    if (next && MOODS[next]) {
      M.moodBus = ctx.createGain();
      M.moodBus.connect(M.music);
      schedule();
    }
  };

  M.setOn = function (on) {
    M.on = on;
    if (M.ctx && M.music) {
      M.music.gain.cancelScheduledValues(M.ctx.currentTime);
      M.music.gain.setValueAtTime(M.music.gain.value, M.ctx.currentTime);
      M.music.gain.linearRampToValueAtTime(on ? 0.68 : 0, M.ctx.currentTime + 0.25);
    }
  };

  M.pause = function () {
    M.paused = true;
    if (M.ctx && M.ctx.state === 'running') {
      try { M.ctx.suspend(); } catch (e) { /* ignore */ }
    }
  };

  M.resume = function () {
    M.paused = false;
    unlockAudioSession();
    if (!M.ctx) M.init();
    if (M.ctx && M.ctx.state !== 'running' && M.ctx.state !== 'closed') {
      try { M.ctx.resume().then(schedule).catch(() => {}); } catch (e) { /* ignore */ }
    } else {
      schedule();
    }
  };

  // Reading-pace duration (seconds) for an on-screen caption line.
  RIP.est = function (text) {
    const w = text.trim().split(/\s+/).length;
    const p = (text.match(/[,;:—–]/g) || []).length;
    const s = (text.match(/[.!?]/g) || []).length;
    return 0.15 + w / 3.0 + p * 0.12 + s * 0.18;
  };
})();
