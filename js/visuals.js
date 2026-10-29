/* ──────────────────────────────────────────────────────────────────────────
   CLOSED. — visuals. One builder per scene type.
   Signature: builder(root, scene, api)
     root  the Ken-Burns layer to draw into        api.layer  full-bleed scene layer
     api.at(t, fn)       run at scene time t       api.onS(i, fn, d)  when line i starts (+d s)
     api.cue(spec, fn)   {s,d} or {t}              api.tick(fn(t, dt)) every frame
     api.count(node, from, to, secs, fmt)          api.sfx(name, ...args)   api.now()
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  const RIP = window.RIP;
  const V = (RIP.visuals = {});

  /* ---------- helpers ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hl = (s) => esc(s).replace(/==(.+?)==/g, '<mark>$1</mark>');
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const q = (el, s) => el.querySelector(s);
  const qa = (el, s) => Array.from(el.querySelectorAll(s));
  const on = (el) => el && el.classList.add('on');
  const add = (el, s, where = 'beforeend') => { el.insertAdjacentHTML(where, s); return where === 'afterbegin' ? el.firstElementChild : el.lastElementChild; };
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  RIP.util = { esc, fmt, initials };

  // Type text into a node, one character per `rate` seconds. Returns end time.
  function typeInto(api, node, text, start, rate, sfx, every = 2) {
    for (let i = 1; i <= text.length; i++) {
      api.at(start + i * rate, () => {
        node.textContent = text.slice(0, i);
        if (sfx && i % every === 0 && text[i - 1] !== ' ') api.sfx(sfx);
      });
    }
    return start + text.length * rate;
  }
  // Stream words into a node (chatbot style).
  function streamWords(api, node, text, start, rate) {
    const words = text.split(' ');
    words.forEach((_, i) => api.at(start + i * rate, () => { node.textContent = words.slice(0, i + 1).join(' '); }));
    return start + words.length * rate;
  }

  function tweetHTML(t) {
    return `<div class="tweet${t.reply ? ' reply' : ''}">
      <div class="tw-head"><span class="tw-av">${esc(initials(t.name))}</span>
        <span class="tw-who"><b>${esc(t.name)}</b><i>${esc(t.handle)}</i></span></div>
      ${t.reply ? `<div class="tw-replying">Replying to <span>@sama</span></div>` : ''}
      <div class="tw-text">${esc(t.text)}</div>
      <div class="tw-date">${esc(t.date)}</div></div>`;
  }

  const KNIFE = `<svg class="knife" viewBox="0 0 24 64" aria-hidden="true"><path d="M12 2C18 14 18 30 16 40H8C8 26 9 12 12 2Z" fill="#dfe3e8"/><path d="M12 2C14 14 14 30 13 40h-1C12 26 12 12 12 2Z" fill="#fff" opacity=".6"/><rect x="5" y="40" width="14" height="4" rx="1.5" fill="#8a8f98"/><rect x="8.5" y="44" width="7" height="18" rx="3" fill="#5a3a22"/></svg>`;

  const AVOCADO = `<svg viewBox="0 0 220 230" aria-hidden="true">
    <ellipse cx="110" cy="220" rx="88" ry="8" fill="#000" opacity=".35"/>
    <path d="M110 8C66 8 50 52 47 88C33 112 24 138 32 168H188C196 138 187 112 173 88C170 52 154 8 110 8Z" fill="#2f4a1f"/>
    <path d="M110 22C74 22 62 58 60 92C49 114 43 136 49 160H171C177 136 171 114 160 92C158 58 146 22 110 22Z" fill="#cfdc82"/>
    <path d="M110 30C82 30 72 60 70 92C62 112 57 132 61 152H159C163 132 158 112 150 92C148 60 138 30 110 30Z" fill="#e3ea9f" opacity=".55"/>
    <ellipse cx="110" cy="112" rx="29" ry="33" fill="#7a4b2a"/>
    <ellipse cx="101" cy="101" rx="9" ry="11" fill="#a36e43" opacity=".75"/>
    <rect x="34" y="150" width="152" height="30" rx="14" fill="#bccb6c"/>
    <rect x="34" y="150" width="152" height="10" rx="5" fill="#d4df8a" opacity=".7"/>
    <rect x="16" y="118" width="30" height="64" rx="14" fill="#2f4a1f"/>
    <rect x="174" y="118" width="30" height="64" rx="14" fill="#2f4a1f"/>
    <rect x="50" y="180" width="9" height="34" rx="3" fill="#3b2a1a"/>
    <rect x="161" y="180" width="9" height="34" rx="3" fill="#3b2a1a"/>
  </svg>`;

  /* ═══════════════════════════ IDENTS ═══════════════════════════ */
  V.ident = (root, sc, api) => {
    if (sc.kind === 'hp') {
      root.innerHTML = `<div class="ident hp">
        <svg class="hp-eye" viewBox="0 0 120 70" aria-hidden="true">
          <path d="M6 35Q60-10 114 35Q60 80 6 35Z" fill="none" stroke="currentColor" stroke-width="2.4"/>
          <circle cx="60" cy="35" r="17" fill="none" stroke="currentColor" stroke-width="2"/>
          <path class="spiral" d="M60 33a2 2 0 1 1-2 2a4 4 0 0 1 4-4a6 6 0 0 1 6 6a8 8 0 0 1-8 8a10 10 0 0 1-10-10a12 12 0 0 1 12-12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <div class="hp-name">Hallucination Pictures</div>
        <div class="hp-tag">confidently presents</div></div>`;
      api.at(0.1, () => { on(q(root, '.ident')); api.sfx('chime'); });
    } else {
      root.innerHTML = `<div class="ident kc">
        <div class="kc-small">in association with</div>
        <div class="kc-name"><span class="kc-keep">Knowledge Cutoff Fil</span><span class="kc-cut">ms</span></div>
        <div class="kc-tag">All footage accurate as of training date</div></div>`;
      api.at(0.1, () => on(q(root, '.ident')));
      api.at(1.2, () => { q(root, '.kc-name').classList.add('cut'); api.sfx('snip'); });
    }
  };

  /* ═══════════════════════════ COLD OPEN ═══════════════════════════ */
  V.chatfail = (root, sc, api) => {
    root.innerHTML = `<div class="chatui">
      <div class="chat-head"><span class="chat-model">ChatGPT <i>▾</i></span><span class="chat-date">Oct 28, 2026 · 6:49 PM</span></div>
      <div class="chat-log"></div>
      <div class="chat-input"><span class="typed"></span><span class="caret"></span><span class="ph">Ask anything</span><span class="send">↑</span></div></div>`;
    const typed = q(root, '.typed'), log = q(root, '.chat-log');
    const text = 'are you still there?';
    const end = typeInto(api, typed, text, 0.3, 0.065, 'key', 1);
    api.at(end + 0.35, () => { typed.textContent = ''; add(log, `<div class="msg user">${text}</div>`); api.sfx('pop'); });
    api.at(end + 0.75, () => add(log, `<div class="msg bot"><span class="dots"><i></i><i></i><i></i></span></div>`));
    api.onS(1, () => {
      const b = q(log, '.msg.bot');
      if (!b) return;
      b.classList.add('err');
      b.innerHTML = 'Something went wrong. If this issue persists please contact us through our help center at help.openai.com.';
      api.sfx('error');
    }, 0.05);
    api.onS(2, () => q(root, '.chatui').classList.add('fade'), 4.5);
  };

  /* ═══════════════════════════ TITLE ═══════════════════════════ */
  V.title = (root, sc, api) => {
    root.innerHTML = `<div class="neon-wrap">
      <div class="neon-sign"><div class="neon open">OPEN</div><div class="neon closed">CLOSED<span class="dot">.</span></div></div>
      <div class="title-sub">The Life &amp; Death of OpenAI</div>
      <div class="title-years">2015 — 2026</div></div>`;
    const open = q(root, '.open'), closed = q(root, '.closed');
    api.at(0.15, () => { open.classList.add('lit', 'flickon'); api.sfx('buzz', 1.6); });
    api.at(1.1, () => open.classList.add('dying'));
    api.at(1.85, () => { open.classList.add('dead'); api.sfx('clunk'); });
    api.at(2.3, () => { closed.classList.add('lit', 'flickon'); api.sfx('boom'); api.sfx('buzz', 2.2); });
    api.at(2.9, () => on(q(root, '.title-sub')));
    api.at(3.3, () => on(q(root, '.title-years')));
  };

  /* ═══════════════════════════ CHAPTER CARD ═══════════════════════════ */
  V.chapter = (root, sc, api) => {
    root.innerHTML = `<div class="chapter-card">
      <div class="ch-num">${sc.num ? 'Chapter ' + esc(sc.num) : esc(sc.label || '')}</div>
      <div class="ch-rule"></div>
      <h2 class="ch-title">${esc(sc.title)}</h2>
      ${sc.years ? `<div class="ch-years">${esc(sc.years)}</div>` : ''}</div>`;
    api.at(0.1, () => { on(q(root, '.chapter-card')); api.sfx('hit'); });
  };

  /* ═══════════════════════════ DOCUMENTS ═══════════════════════════ */
  V.doc = (root, sc, api) => {
    const st = sc.style || 'blog';
    let inner;
    if (st === 'paper') {
      inner = `<div class="paper-title">${esc(sc.title)}</div>
        <div class="paper-authors">${esc(sc.authors)}</div><div class="paper-date">${esc(sc.date)}</div>
        <div class="paper-abs"><b>Abstract</b><p>… ${hl(sc.body.join(' '))}</p></div>`;
    } else if (st === 'memo') {
      inner = `<div class="memo-kicker">${esc(sc.kicker)}</div><blockquote>“${hl(sc.body.join(' '))}”</blockquote><div class="memo-src">${esc(sc.src)}</div>`;
    } else {
      inner = `<div class="doc-kicker">${esc(sc.kicker)}</div><h3 class="doc-title">${esc(sc.title)}</h3>
        ${sc.date ? `<div class="doc-date">${esc(sc.date)}</div>` : ''}${sc.body.map((p) => `<p>${hl(p)}</p>`).join('')}`;
    }
    root.innerHTML = `<div class="doc ${st}">${inner}
      ${sc.note ? `<div class="sticky">${esc(sc.note.text)}</div>` : ''}
      ${sc.stamp ? `<div class="stamp">${esc(sc.stamp.text)}</div>` : ''}</div>`;
    api.at(0.15, () => on(q(root, '.doc')));
    if (sc.hl) api.cue(sc.hl, () => qa(root, 'mark').forEach((m) => m.classList.add('lit')));
    if (sc.note) api.cue(sc.note.at, () => { on(q(root, '.sticky')); api.sfx('pop'); });
    if (sc.stamp) api.cue(sc.stamp.at, () => { on(q(root, '.stamp')); api.sfx('stamp'); });
  };

  /* ═══════════════════════════ FOUNDERS ═══════════════════════════ */
  const FOUNDERS = [
    { n: 'Sam Altman', stay: true }, { n: 'Elon Musk', to: '→ xAI' }, { n: 'Greg Brockman', stay: true },
    { n: 'Ilya Sutskever', to: '→ Safe Superintelligence' }, { n: 'Wojciech Zaremba', stay: true },
    { n: 'John Schulman', to: '→ Anthropic' }, { n: 'Andrej Karpathy', to: '→ Eureka Labs' },
    { n: 'Durk Kingma', to: '→ Anthropic' }, { n: 'Trevor Blackwell', to: 'departed' },
    { n: 'Vicki Cheung', to: 'departed' }, { n: 'Pamela Vagata', to: 'departed' },
  ];
  V.names = (root, sc, api) => {
    const exodus = sc.mode === 'exodus';
    root.innerHTML = `<div class="names ${sc.mode}">
      <div class="names-count"><b>${exodus ? 11 : 0}</b><span>co-founders</span></div>
      <div class="names-grid">${FOUNDERS.map((p) => `<div class="nm${p.stay ? ' stay' : ''}"><span class="nm-n">${esc(p.n)}</span><span class="nm-to">${esc(p.to || 'remained')}</span></div>`).join('')}</div></div>`;
    const items = qa(root, '.nm'), count = q(root, '.names-count b');
    if (!exodus) {
      items.forEach((it, i) => api.at(0.5 + i * 0.3, () => { it.classList.add('on'); count.textContent = i + 1; api.sfx('tick'); }));
    } else {
      items.forEach((it) => it.classList.add('on'));
      const order = [10, 9, 8, 6, 1, 7, 3, 5];
      let left = 11;
      order.forEach((idx, k) => api.cue({ s: 0, d: 0.3 + k * 0.5 }, () => {
        items[idx].classList.add('gone'); count.textContent = --left; api.sfx('tick');
      }));
      api.onS(1, () => q(root, '.names').classList.add('final'), 0.3);
    }
  };

  /* ═══════════════════════════ CARDS ═══════════════════════════ */
  V.cards = (root, sc, api) => {
    const achv = sc.style === 'achv';
    root.innerHTML = `<div class="cards ${achv ? 'c-achv' : 'c-mile'}">${sc.items.map((it) => achv
      ? `<div class="achv"><span class="achv-i">${it.i}</span><span class="achv-tx"><small>Achievement unlocked</small><b>${esc(it.t)}</b><em>${esc(it.s)}</em></span></div>`
      : `<div class="mile"><div class="mile-d">${esc(it.d)}</div><div class="mile-t">${esc(it.t)}</div><div class="mile-s">${esc(it.s)}</div></div>`).join('')}</div>`;
    const nodes = qa(root, achv ? '.achv' : '.mile');
    sc.items.forEach((it, i) => api.cue(it.at, () => { nodes[i].classList.add('on'); api.sfx(achv ? 'achv' : 'pop'); }));
  };

  /* ═══════════════════════════ DOSSIER ═══════════════════════════ */
  V.dossier = (root, sc, api) => {
    root.innerHTML = `<div class="dossier">
      <div class="dos-photo"><span>${esc(initials(sc.name))}</span></div>
      <div class="dos-body"><div class="dos-kicker">Personnel file · OpenAI</div><div class="dos-name">${esc(sc.name)}</div><div class="dos-role">${esc(sc.role)}</div></div>
      <div class="stamp s1">${esc(sc.s1)}</div><div class="stamp s2">${esc(sc.s2)}</div></div>`;
    api.at(0.15, () => on(q(root, '.dossier')));
    api.cue(sc.c1, () => { on(q(root, '.s1')); api.sfx('stamp'); });
    api.cue(sc.c2, () => { on(q(root, '.s2')); api.sfx('stamp'); });
  };

  /* ═══════════════════════════ CORPORATE STRUCTURE ═══════════════════════════ */
  V.structure = (root, sc, api) => {
    const node = (n) => `<div class="sn ${n.k || ''}" data-st="${n.st || 0}"><b>${esc(n.t)}</b><small>${esc(n.s || '')}</small>${n.tag ? `<em>${esc(n.tag)}</em>` : ''}</div>`;
    root.innerHTML = `<div class="struct">
      ${node(sc.top)}
      ${sc.bottom ? `<div class="st-link" data-st="${sc.link.st}"><span>${esc(sc.link.t)}</span></div>
        <div class="st-bottom">${node(sc.bottom)}
          ${sc.side ? `<div class="st-side" data-st="${sc.side.st}"><div class="st-hlink"><span>${esc(sc.side.link)}</span></div>${node(sc.side)}</div>` : ''}
        </div>` : ''}</div>`;
    (sc.cues || [{ t: 0.4 }]).forEach((c, stage) => api.cue(c, () => {
      qa(root, '[data-st]').forEach((el) => { if (+el.dataset.st <= stage) el.classList.add('on'); });
      if (stage) api.sfx('pop');
    }));
  };

  /* ═══════════════════════════ SCALE + AVOCADO ═══════════════════════════ */
  V.scale = (root, sc, api) => {
    const data = [{ n: 'GPT', p: 0.117, y: '2018', l: '117 million' }, { n: 'GPT-2', p: 1.5, y: '2019', l: '1.5 billion' }, { n: 'GPT-3', p: 175, y: '2020', l: '175 billion' }];
    const max = Math.sqrt(175);
    root.innerHTML = `<div class="scale">
      <div class="scale-row">${data.map((d) => `<div class="sc-item"><div class="sc-ball" style="--r:${(Math.sqrt(d.p) / max).toFixed(4)}"></div>
        <div class="sc-lab"><b>${d.n}</b><span>${d.l} parameters</span><i>${d.y}</i></div></div>`).join('')}</div>
      <div class="avocado">${AVOCADO}<div class="avo-cap">“an armchair in the shape of an avocado”<small>DALL·E · January 2021</small></div></div></div>`;
    qa(root, '.sc-item').forEach((it, i) => api.cue({ s: 0, d: 0.2 + i * 1.1 }, () => { it.classList.add('on'); api.sfx('pop'); }));
    api.onS(1, () => q(root, '.scale').classList.add('avo'), 0.2);
  };

  /* ═══════════════════════════ THE WALKOUT ═══════════════════════════ */
  V.walkout = (root, sc, api) => {
    root.innerHTML = `<div class="walkout">
      <div class="wo-scene">
        <div class="wo-office"><span>OpenAI</span><i class="wo-win"></i><i class="wo-win"></i><i class="wo-win"></i></div>
        <div class="wo-door"></div>
        ${Array.from({ length: 7 }, (_, i) => `<div class="walker" style="--i:${i}"><i></i></div>`).join('')}
        <div class="wo-year">2021</div>
      </div>
      <div class="wo-cap">Seven researchers leave. They name their new company <b>Anthropic</b>.</div></div>`;
    api.at(0.15, () => q(root, '.walkout').classList.add('go'));
    api.cue({ s: 0, d: 3.6 }, () => on(q(root, '.wo-cap')));
  };

  /* ═══════════════════════════ CHAT UI ═══════════════════════════ */
  V.chat = (root, sc, api) => {
    root.innerHTML = `<div class="chatui ${sc.theme || ''}">
      <div class="chat-head"><span class="chat-model">${esc(sc.model || 'ChatGPT')}</span><span class="chat-date">${esc(sc.label || '')}</span></div>
      <div class="chat-log"></div>
      <div class="chat-input"><span class="typed"></span><span class="caret"></span><span class="ph">Send a message…</span><span class="send">↑</span></div></div>`;
    const log = q(root, '.chat-log'), typed = q(root, '.typed');
    const [u, b] = sc.msgs;
    const tEnd = typeInto(api, typed, u.t, 0.25, 0.035, 'key', 2);
    api.at(tEnd + 0.25, () => { typed.textContent = ''; add(log, `<div class="msg user">${esc(u.t)}</div>`); api.sfx('pop'); });
    let t0 = tEnd + 0.65;
    if (b.think) {
      api.at(t0, () => add(log, `<div class="think"><span class="spin"></span>Thinking…</div>`));
      api.at(t0 + 2.4, () => { const th = q(log, '.think'); th.classList.add('done'); th.innerHTML = '▸ ' + esc(b.think); });
      t0 += 2.8;
    }
    api.at(t0, () => {
      const m = add(log, `<div class="msg bot"><span class="bt"></span></div>`);
      streamWords(api, q(m, '.bt'), b.t, api.now(), 0.06);
    });
  };

  /* ═══════════════════════════ COUNTER ═══════════════════════════ */
  V.counter = (root, sc, api) => {
    root.innerHTML = `<div class="counter"><div class="cn-num">0</div><div class="cn-lab"></div>${sc.tweet ? tweetHTML(sc.tweet) : ''}</div>`;
    const num = q(root, '.cn-num'), lab = q(root, '.cn-lab');
    let cur = 0;
    sc.items.forEach((it) => api.cue(it.at, () => {
      lab.innerHTML = `${esc(it.label)} <em>${esc(it.sub)}</em>`;
      replay(lab, 'on');
      api.count(num, cur, it.to, 2.4, fmt);
      cur = it.to;
      api.sfx('rise');
    }));
    if (sc.tweet) api.cue(sc.tweet.at, () => { on(q(root, '.tweet')); api.sfx('pop'); });
  };

  /* ═══════════════════════════ AT CAPACITY ═══════════════════════════ */
  V.capacity = (root, sc, api) => {
    root.innerHTML = `<div class="capacity">
      <h3>ChatGPT is at capacity right now</h3>
      <span class="cap-btn">Get notified when we’re back</span>
      <div class="cap-poem"><div class="cap-pt">Write a limerick about the status of ChatGPT</div>
        ${sc.poem.map((l) => `<div class="cap-l">${esc(l)}</div>`).join('')}</div>
      <div class="cap-foot">(Reader’s note: it would go on to buy about 1.4 trillion dollars’ worth.)</div></div>`;
    api.at(0.15, () => on(q(root, '.capacity')));
    qa(root, '.cap-l').forEach((l, i) => api.at(1.1 + i * 1.0, () => l.classList.add('on')));
    api.at(1.1 + sc.poem.length * 1.0 + 0.6, () => on(q(root, '.cap-foot')));
  };

  /* ═══════════════════════════ CODE RED ═══════════════════════════ */
  V.alert = (root, sc, api) => {
    root.innerHTML = `<div class="alert${sc.panels.length > 1 ? ' dual' : ''}">${sc.panels.map((p) => `<div class="al-panel">
        <div class="al-place">${esc(p.place)} · ${esc(p.date)}</div><div class="al-title">${esc(p.title)}</div><div class="al-sub">${esc(p.sub)}</div></div>`).join('')}</div>
      ${sc.foot ? `<div class="al-foot">${esc(sc.foot.text)}</div>` : ''}`;
    const ps = qa(root, '.al-panel');
    sc.panels.forEach((p, i) => api.cue(p.at, () => { ps[i].classList.add('on'); api.sfx('alarm'); }));
    if (sc.foot) api.cue(sc.foot.at, () => on(q(root, '.al-foot')));
  };

  /* ═══════════════════════════ THE BLIP ═══════════════════════════ */
  V.blip = (root, sc, api) => {
    root.innerHTML = `<div class="blip">
      <div class="blip-ceo"><div class="bc-k">CEOs this week</div><div class="bc-n">1</div><div class="bc-names"><span>Sam Altman</span></div></div>
      <div class="blip-feed"></div></div>`;
    const feed = q(root, '.blip-feed'), n = q(root, '.bc-n'), names = q(root, '.bc-names');
    let count = 1;
    sc.items.forEach((it) => api.cue(it.at, () => {
      const row = add(feed, `<div class="bf"><span class="bf-day">${esc(it.day)}</span><span class="bf-tx">${esc(it.text)}</span></div>`);
      void row.offsetWidth;
      row.classList.add('on');
      api.sfx('news');
      if (it.ceo) {
        count++;
        n.textContent = count;
        replay(n, 'bump');
        add(names, `<span>→ ${esc(it.ceo)}</span>`);
      }
    }));
  };

  /* ═══════════════════════════ TWEETS ═══════════════════════════ */
  V.tweets = (root, sc, api) => {
    root.innerHTML = `<div class="tweets">${sc.items.map((it) => (it.note ? `<div class="tw-note">${esc(it.note)}</div>` : tweetHTML(it))).join('')}
      ${sc.sky ? `<div class="sky"><span class="sky-l">Voice · “Sky”</span><span class="sky-w">${Array.from({ length: 22 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span><span class="stamp">Paused</span></div>` : ''}</div>`;
    const nodes = Array.from(q(root, '.tweets').children);
    sc.items.forEach((it, i) => api.cue(it.at, () => { nodes[i].classList.add('on'); api.sfx('pop'); }));
    if (sc.sky) {
      api.cue(sc.sky.at, () => on(q(root, '.sky')));
      api.cue(sc.sky.pauseAt, () => { q(root, '.sky').classList.add('paused'); on(q(root, '.sky .stamp')); api.sfx('stamp'); });
    }
  };

  /* ═══════════════════════════ DEEPSEEK / NVDA ═══════════════════════════ */
  V.crash = (root, sc, api) => {
    // A gently rising price… then Monday.
    const pts = [];
    let v = 0.5;
    for (let i = 0; i < 44; i++) { v += Math.sin(i * 1.7) * 0.012 + Math.cos(i * 0.63) * 0.01 + 0.0045; pts.push(v); }
    pts.push(v + 0.01, v - 0.02, v - 0.3, v - 0.47, v - 0.5, v - 0.46, v - 0.49);
    const W = 600, H = 240, lo = Math.min(...pts), hi = Math.max(...pts);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * W).toFixed(1)},${(14 + (1 - (p - lo) / (hi - lo)) * (H - 28)).toFixed(1)}`).join(' ');
    root.innerHTML = `<div class="crash">
      <div class="ds-card"><div class="ds-k">January 20, 2025</div><div class="ds-n">DeepSeek-R1</div>
        <div class="ds-meta">Reasoning model · Open weights<br>MIT License · Hangzhou, China</div><span class="ds-free">Free</span></div>
      <div class="ticker">
        <div class="tk-head"><b>NVDA</b><span class="tk-px">▼ 16.97%</span></div>
        <svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path class="tk-grid" d="M0 60H600M0 120H600M0 180H600"/><path class="tk-line" pathLength="1" d="${d}"/></svg>
        <div class="tk-loss">−$<span>0</span></div>
        <div class="tk-cap">Monday, January 27, 2025 · the largest one-day loss of market value in U.S. stock market history</div></div></div>`;
    api.onS(0, () => on(q(root, '.ds-card')), 0.4);
    api.onS(1, () => {
      on(q(root, '.ticker'));
      api.sfx('crash');
      api.count(q(root, '.tk-loss span'), 0, 589000000000, 3.4, fmt);
    }, 0.2);
  };

  /* ═══════════════════════════ MELTING GPUs ═══════════════════════════ */
  V.melt = (root, sc, api) => {
    const drips = Array.from({ length: 10 }, (_, i) => `<i class="drip" style="--i:${i};--h:${[38, 70, 22, 96, 48, 120, 30, 84, 56, 26][i]}"></i>`).join('');
    root.innerHTML = `<div class="melt">
      <div class="gpu"><div class="gpu-body"><span class="fan"></span><span class="fan"></span><b>GPU</b></div>${drips}</div>
      <div class="melt-side"><div class="melt-count">+1,000,000<span>users in one hour</span></div>${tweetHTML(sc.tweet)}</div></div>`;
    api.at(0.2, () => on(q(root, '.gpu')));
    api.onS(0, () => { on(q(root, '.melt-count')); api.sfx('rise'); }, 3.0);
    api.onS(1, () => { on(q(root, '.tweet')); q(root, '.gpu').classList.add('hot'); api.sfx('sizzle'); });
  };

  /* ═══════════════════════════ THE MODEL PICKER ═══════════════════════════ */
  const MODELS = [
    ['GPT-4', '2023'], ['GPT-4 Turbo', '2023'], ['GPT-4o', '2024'], ['GPT-4o mini', '2024'], ['o1-preview', '2024'],
    ['o1-mini', '2024'], ['o1', '2024'], ['o1 pro mode', '2024'], ['o3-mini', '2025'], ['o3-mini-high', '2025'],
    ['GPT-4.5', 'research preview'], ['GPT-4.1', 'after 4.5'], ['GPT-4.1 mini', '2025'], ['GPT-4.1 nano', '2025'],
    ['o3', '2025'], ['o4-mini', '2025'], ['o4-mini-high', '2025'], ['o3-pro', '2025'], ['codex-mini', '2025'],
    ['gpt-oss-120b', 'open weights!'], ['gpt-oss-20b', 'open weights!'], ['GPT-5', '2025'], ['GPT-5 Thinking', '2025'],
    ['GPT-5 Pro', '2025'], ['GPT-5-Codex', '2025'], ['GPT-5.1', '2025'], ['GPT-5.1 Thinking', '2025'], ['GPT-5.1-Codex-Max', '2025'],
  ];
  V.picker = (root, sc, api) => {
    root.innerHTML = `<div class="picker-wrap">
      <div class="picker"><div class="pk-btn">Model <i>▾</i></div><div class="pk-menu"><div class="pk-list"></div></div></div>
      ${tweetHTML(sc.tweet)}</div>`;
    const menu = q(root, '.pk-menu'), list = q(root, '.pk-list');
    const push = (html) => {
      add(list, html);
      const over = list.offsetHeight - menu.clientHeight + 12;
      list.style.transform = `translateY(${-Math.max(0, over)}px)`;
    };
    MODELS.forEach(([m, s], i) => api.at(0.2 + i * 0.21, () => { push(`<div class="pk-i"><span>${esc(m)}</span><small>${esc(s)}</small></div>`); api.sfx('tick'); }));
    api.cue(sc.o2, () => { push(`<div class="pk-i o2"><span>o2</span><small>skipped — “out of respect” for Telefónica</small></div>`); api.sfx('error'); });
    api.cue(sc.tweet.at, () => { on(q(root, '.tweet')); api.sfx('pop'); });
  };

  /* ═══════════════════════════ THE CHART ═══════════════════════════ */
  V.chartcrime = (root, sc, api) => {
    root.innerHTML = `<div class="crime">
      <div class="cr-title">SWE-bench Verified <small>Accuracy (%) · as shown at the GPT-5 launch, August 7, 2025 · recreation</small></div>
      <div class="cr-chart">
        <div class="bar b1" style="--h:.88"><span class="v">52.8</span><i class="ring"></i><span class="l">GPT-5<small>without thinking</small></span></div>
        <div class="bar b2" style="--h:.5"><span class="v">69.1</span><i class="ring"></i><span class="q">52.8 &gt; 69.1 ?</span><span class="l">OpenAI o3</span></div>
        <div class="bar b3" style="--h:.5"><span class="v">30.8</span><span class="l">GPT-4o</span></div>
        <div class="cr-ann a2"><span>69.1 = 30.8 ?</span></div>
      </div>
      <div class="cr-foot"><span class="cr-quote">“mega chart screwup” <small>— Sam Altman</small></span><span class="cr-4o">#keep4o → GPT-4o restored</span></div>
      <div class="stamp">Chart crime</div></div>`;
    const box = q(root, '.crime');
    api.at(0.2, () => q(root, '.cr-chart').classList.add('grow'));
    api.onS(0, () => { box.classList.add('c1'); api.sfx('pop'); }, 2.8);
    api.onS(1, () => { box.classList.add('c2'); api.sfx('pop'); }, 0.2);
    api.onS(2, () => { box.classList.add('c3'); on(q(root, '.stamp')); api.sfx('stamp'); }, 0.15);
    api.onS(2, () => { box.classList.add('c4'); api.sfx('achv'); }, 2.4);
  };

  /* ═══════════════════════════ THE CIRCLE ═══════════════════════════ */
  V.circle = (root, sc, api) => {
    const k = window.innerWidth < 700 ? 1.45 : 1; // bigger type on phones
    const W = 900, H = 540, cx = 450, cy = 270, rx = 335, ry = 205;
    const P = [
      { n: 'Nvidia', s: 'up to $100B in · chips out', a: -90, inv: true },
      { n: 'AMD', s: 'share warrants · 6 GW', a: -30, inv: true },
      { n: 'Oracle', s: '≈ $300B compute', a: 30 },
      { n: 'Broadcom', s: '10 GW custom chips', a: 90 },
      { n: 'Amazon', s: '$38B AWS deal', a: 150 },
      { n: 'Microsoft', s: '$250B Azure · ~27% owner', a: 210, inv: true },
    ];
    const pw = 150 * k, ph = 50 * k, fs = 21 * k, ss = 14 * k;
    let flows = '', nodes = '';
    P.forEach((p) => {
      const r = (p.a * Math.PI) / 180;
      p.x = cx + rx * Math.cos(r); p.y = cy + ry * Math.sin(r);
      const dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy * 9, ny = ux * 9;
      const x1 = cx + ux * 70, y1 = cy + uy * 46, x2 = p.x - ux * 60, y2 = p.y - uy * 34;
      flows += `<path class="flow out" d="M${(x1 + nx).toFixed(1)},${(y1 + ny).toFixed(1)}L${(x2 + nx).toFixed(1)},${(y2 + ny).toFixed(1)}"/>`;
      if (p.inv) flows += `<path class="flow in" d="M${(x2 - nx).toFixed(1)},${(y2 - ny).toFixed(1)}L${(x1 - nx).toFixed(1)},${(y1 - ny).toFixed(1)}"/>`;
      const below = p.y >= cy;
      nodes += `<g class="node"><rect x="${(p.x - pw / 2).toFixed(1)}" y="${(p.y - ph / 2).toFixed(1)}" width="${pw}" height="${ph}" rx="${ph / 2}"/>
        <text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" style="font-size:${fs}px">${p.n}</text>
        <text class="sub" x="${p.x.toFixed(1)}" y="${(p.y + (below ? ph / 2 + ss * 1.2 : -ph / 2 - ss * 0.8)).toFixed(1)}" style="font-size:${ss}px">${esc(p.s)}</text></g>`;
    });
    root.innerHTML = `<div class="circ">
      <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <path class="ring" d="M${cx - rx - 46},${cy} a${rx + 46},${ry + 46} 0 1 1 ${2 * (rx + 46)},0 a${rx + 46},${ry + 46} 0 1 1 ${-2 * (rx + 46)},0"/>
        ${flows}${nodes}
        <g class="node core"><rect x="${cx - 88 * k}" y="${cy - 32 * k}" width="${176 * k}" height="${64 * k}" rx="${32 * k}"/>
          <text x="${cx}" y="${cy}" style="font-size:${25 * k}px">OpenAI</text></g>
      </svg>
      <div class="circ-big">≈ $1.4 trillion <span>in compute commitments</span></div>
      <div class="circ-bars">
        <div class="cb"><span>Compute commitments</span><i style="--w:100%"></i><b>≈ $1.4T</b></div>
        <div class="cb rev"><span>2025 revenue (reported)</span><i style="--w:0.93%"></i><b>≈ $13B</b></div></div></div>`;
    const c = q(root, '.circ');
    api.onS(0, () => { c.classList.add('on1'); api.sfx('rise'); }, 0.25);
    api.onS(1, () => c.classList.add('on2'), 0.3);
    api.onS(1, () => { c.classList.add('on3'); api.sfx('whoosh'); }, 4.8);
    api.onS(2, () => c.classList.add('on4'), 0.15);
  };

  /* ═══════════════════════════ HEADLINES ═══════════════════════════ */
  V.headlines = (root, sc, api) => {
    const rots = [-5, 4, -2, 6, -4, 2], dx = [-14, 18, -6, 10, -18, 4], dy = [-10, 8, 14, -6, 4, -2];
    root.innerHTML = `<div class="papers">${sc.papers.map((p, i) => `<div class="paper-n" style="--rot:${rots[i % 6]}deg;--dx:${dx[i % 6]}px;--dy:${dy[i % 6]}px;z-index:${i + 1}">
      <div class="pn-mast">${esc(p.m)}</div>
      <div class="pn-date"><span>${esc(p.d)}</span><span>Late edition</span><span>Dramatization</span></div>
      <div class="pn-head">${esc(p.h)}</div>
      <div class="pn-body"><div class="pn-img"></div><div class="pn-cols"></div></div></div>`).join('')}</div>`;
    const ps = qa(root, '.paper-n');
    const every = Math.max(1.3, (api.dur - 2.6) / ps.length);
    ps.forEach((p, i) => api.at(0.2 + i * every, () => { p.classList.add('spin'); api.sfx('whoosh'); }));
  };

  /* ═══════════════════════════ WEEKLY USERS ═══════════════════════════ */
  V.wau = (root, sc, api) => {
    const W = 900, H = 430, x0 = 70, x1 = 860, y0 = 370, y1 = 40, MONTHS = 35, MAX = 900;
    const X = (m) => x0 + (m / MONTHS) * (x1 - x0), Y = (v) => y0 - (v / MAX) * (y0 - y1);
    const real = [[0, 100, 'Nov ’23'], [9, 200, 'Aug ’24'], [13, 300, 'Dec ’24'], [15, 400, 'Feb ’25'], [16, 500, 'Mar ’25'], [23, 800, 'Oct ’25']];
    const fake = [[23, 800], [27, 770], [30, 640], [33, 330], [35, 0]];
    const path = (pts) => pts.map(([m, v], i) => `${i ? 'L' : 'M'}${X(m).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    root.innerHTML = `<div class="wau">
      <div class="wau-title">ChatGPT weekly active users</div>
      <div class="wau-legend"><span class="lg real">— reported</span><span class="lg fake">- - dramatized</span></div>
      <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
        ${[200, 400, 600, 800].map((v) => `<line class="grid" x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}"/><text class="lbl" x="${x0 - 10}" y="${Y(v) + 4}" text-anchor="end">${v}M</text>`).join('')}
        <line class="axis" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/>
        ${[['2024', 2], ['2025', 14], ['2026', 26]].map(([l, m]) => `<text class="lbl" x="${X(m)}" y="${y0 + 26}">${l}</text>`).join('')}
        <path class="real" pathLength="1" d="${path(real)}"/>
        ${real.map(([m, v], i) => `<g class="pt" style="--i:${i}"><circle cx="${X(m)}" cy="${Y(v)}" r="5"/><text x="${X(m)}" y="${Y(v) - 14}">${v}M</text></g>`).join('')}
        <path class="fake" d=""/>
        <g class="zero"><circle cx="${X(35)}" cy="${Y(0)}" r="6"/><text x="${X(35) - 12}" y="${Y(0) - 14}" text-anchor="end">0</text></g>
      </svg></div>`;
    const w = q(root, '.wau'), fakeEl = q(root, 'path.fake');
    // Reveal the dramatized decline progressively (works everywhere, unlike animated clip paths).
    const fp = fake.map(([m, v]) => [X(m), Y(v)]);
    const seg = fp.slice(1).map((p, i) => Math.hypot(p[0] - fp[i][0], p[1] - fp[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    const partial = (p) => {
      let left = p * total, d = `M${fp[0][0].toFixed(1)},${fp[0][1].toFixed(1)}`;
      for (let i = 0; i < seg.length && left > 0; i++) {
        const f = Math.min(1, left / seg[i]);
        const x = fp[i][0] + (fp[i + 1][0] - fp[i][0]) * f, y = fp[i][1] + (fp[i + 1][1] - fp[i][1]) * f;
        d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        left -= seg[i];
      }
      return d;
    };
    api.onS(0, () => w.classList.add('s0'), 0.1);
    api.onS(1, () => {
      w.classList.add('s1');
      api.sfx('crash');
      const t0 = api.now();
      api.tick((t) => {
        const p = Math.min(1, (t - t0) / 2.4);
        fakeEl.setAttribute('d', partial(1 - Math.pow(1 - p, 2)));
        if (p >= 1) w.classList.add('s2');
      });
    }, 0.15);
  };

  /* ═══════════════════════════ STATUS PAGE ═══════════════════════════ */
  V.status = (root, sc, api) => {
    const comps = ['ChatGPT', 'API', 'Sora', 'Codex'];
    root.innerHTML = `<div class="status">
      <div class="stt-head"><span><b>OpenAI</b> Status</span><span class="stt-date">Wednesday, October 28, 2026</span></div>
      <div class="stt-banner ok">All Systems Operational</div>
      <div class="stt-comps">${comps.map((c) => `<div class="stt-c"><div class="stt-cn"><span>${c}</span><em>Operational</em></div><div class="stt-bars">${'<i></i>'.repeat(48)}</div></div>`).join('')}</div>
      <div class="stt-log"></div></div>`;
    const banner = q(root, '.stt-banner'), log = q(root, '.stt-log'), cs = qa(root, '.stt-c');
    const setBanner = (cls, text) => { banner.className = 'stt-banner ' + cls; banner.textContent = text; };
    const degrade = (c, lvl, n) => {
      c.className = 'stt-c ' + lvl;
      q(c, 'em').textContent = lvl === 'red' ? 'Major Outage' : 'Degraded Performance';
      const bars = qa(c, '.stt-bars i');
      for (let j = bars.length - n; j < bars.length; j++) bars[j].className = lvl;
    };
    const entry = (time, kind, text, cls = '') => add(log, `<div class="stt-e ${cls}"><b>${kind}</b> — ${text}<i>${time}</i></div>`, 'afterbegin');
    api.onS(0, () => {
      setBanner('warn', 'Degraded Performance');
      degrade(cs[0], 'warn', 2); degrade(cs[1], 'warn', 1);
      entry('Oct 28, 6:27 PM PDT', 'Investigating', 'We are investigating elevated error rates across all products.');
      api.sfx('pop');
    }, 1.0);
    api.onS(1, () => { setBanner('bad', 'Major Outage'); cs.forEach((c, i) => degrade(c, 'red', 3 + i)); api.sfx('error'); }, 0.15);
    api.onS(2, () => { entry('Oct 28, 6:44 PM PDT', 'Identified', 'The issue has been identified: everyone else.'); api.sfx('pop'); }, 0.1);
    api.onS(2, () => {
      setBanner('dead', 'Permanently closed');
      entry('Oct 28, 6:49 PM PDT', 'Resolved', 'This incident has been resolved. OpenAI has not.', 'res');
      api.sfx('stamp');
    }, 1.35);
  };

  /* ═══════════════════════════ FLATLINE ═══════════════════════════ */
  V.flatline = (root, sc, api) => {
    root.innerHTML = `<div class="ekg">
      <div class="ekg-top"><span class="ekg-hr">HR<b>72</b></span><span class="ekg-name">PATIENT: OPENAI · AGE 10</span><span class="ekg-hr spo">SpO₂<b>98</b></span></div>
      <canvas></canvas>
      <div class="ekg-tod">Time of death · 6:49 PM PDT · October 28, 2026</div></div>`;
    const cv = q(root, 'canvas'), ctx = cv.getContext('2d'), hr = q(root, '.ekg-hr b'), spo = q(root, '.spo b');
    const beats = [0.45, 1.15, 2.0, 3.05];
    const rates = [72, 62, 48, 31];
    const FLAT = 3.7;
    let W = 0, H = 0, x = 0, lastT = 0, lastY = null;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const g = (d, mu, s, a) => a * Math.exp(-((d - mu) * (d - mu)) / (2 * s * s));
    const pqrst = (d) => g(d, -0.2, 0.03, 0.12) + g(d, -0.035, 0.009, -0.14) + g(d, 0, 0.013, 1) + g(d, 0.035, 0.011, -0.28) + g(d, 0.24, 0.055, 0.22);
    const sig = (t) => {
      if (t >= FLAT) return 0;
      let v = 0;
      for (const b of beats) { const d = t - b; if (d > -0.35 && d < 0.5) v += pqrst(d); }
      return v + Math.sin(t * 31) * 0.006;
    };
    api.tick((t) => {
      if (!W) {
        W = cv.clientWidth; H = cv.clientHeight;
        if (!W || !H) return;
        cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        lastT = t;
      }
      const speed = W / 3.4; // px per second
      const steps = Math.max(1, Math.ceil((t - lastT) * 120));
      ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3cff8f';
      ctx.shadowColor = 'rgba(60,255,143,.8)'; ctx.shadowBlur = 8;
      for (let k = 1; k <= steps; k++) {
        const tt = lastT + ((t - lastT) * k) / steps;
        const nx = x + ((t - lastT) * speed) / steps;
        const y = H * 0.55 - sig(tt) * H * 0.42;
        ctx.clearRect(nx, 0, 22, H);
        if (lastY != null) { ctx.beginPath(); ctx.moveTo(x, lastY); ctx.lineTo(nx, y); ctx.stroke(); }
        x = nx; lastY = y;
        if (x > W) { x = 0; lastY = null; }
      }
      lastT = t;
    });
    beats.forEach((b, i) => api.at(b, () => { api.sfx('beep'); hr.textContent = rates[i]; spo.textContent = 98 - i * 8; }));
    api.at(FLAT, () => { api.sfx('flat', 3.0); q(root, '.ekg').classList.add('dead'); hr.textContent = '0'; spo.textContent = '—'; });
    api.at(FLAT + 0.5, () => on(q(root, '.ekg-tod')));
  };

  /* ═══════════════════════════ DEATH CERTIFICATE ═══════════════════════════ */
  V.certificate = (root, sc, api) => {
    const F = [
      ['Name of decedent', 'OpenAI'],
      ['Age', '10 years, 10 months, 17 days'],
      ['Also known as', 'OpenAI, Inc. · OpenAI LP · OpenAI Global, LLC · OpenAI Group PBC', 1],
      ['Date of birth', 'December 11, 2015'],
      ['Date of death', 'October 28, 2026 · 6:49 PM PDT'],
      ['Immediate cause', '(a) ELIMINATED BY COMPETITION', 1],
      ['Due to, or as a consequence of', '(b) Commoditization of frontier models', 1],
      ['Due to, or as a consequence of', '(c) ≈ $1.4 trillion in compute commitments', 1],
      ['Other significant conditions', 'Talent exodus · model naming · one (1) chart', 1],
      ['Manner of death', '☐ Natural  ☐ Accident  ☐ Undetermined  ☒ Competition', 1],
    ];
    root.innerHTML = `<div class="cert">
      <div class="cert-head"><small>Office of the Silicon Valley Coroner</small><b>Certificate of Corporate Death</b></div>
      <div class="cert-grid">${F.map(([k, , w]) => `<div class="cf${w ? ' w' : ''}"><label>${esc(k)}</label><span></span></div>`).join('')}</div>
      <div class="cert-sign"><span class="sig">The Market</span><label>Certifier</label></div>
      <div class="cert-stamp">Eliminated by competition</div></div>`;
    const spans = qa(root, '.cf span');
    let t = 0.15;
    F.forEach(([, val], i) => { t = typeInto(api, spans[i], val, t, 0.009, 'type', 4) + 0.04; });
    api.at(t + 0.15, () => on(q(root, '.cert-sign')));
    api.cue({ s: 0, d: 1.5 }, () => { on(q(root, '.cert-stamp')); api.sfx('stamp'); });
  };

  /* ═══════════════════════════ THE SUSPECTS ═══════════════════════════ */
  const SUSPECTS = [
    { n: 'Google', d: 'Its researchers invented the Transformer (2017). Gemini, on billions of devices.', w: 'Distribution', s: 1 },
    { n: 'Anthropic', d: 'Founded in 2021 by former OpenAI researchers.', w: 'Developers', s: 2 },
    { n: 'Meta', d: 'Open-weight Llama. Nine-figure offers to OpenAI researchers.', w: 'Talent', s: 3 },
    { n: 'DeepSeek', d: 'R1: open weights, MIT license, a fraction of the price.', w: 'Price', s: 3 },
    { n: 'Open weights', d: 'Qwen · Kimi · GLM · Mistral · Llama … and gpt-oss.', w: 'Free', s: 3 },
    { n: 'Elon Musk', d: 'Co-founder. Then xAI. Sued OpenAI, repeatedly.', w: 'Litigation', s: 4 },
    { n: 'Microsoft', d: 'Largest investor. Listed OpenAI as a competitor (2024).', w: 'Hedging', s: 5 },
    { n: 'The users', d: 'Switching cost: one new tab.', w: 'Indifference', s: 6 },
  ];
  V.suspects = (root, sc, api) => {
    root.innerHTML = `<div class="suspects"><div class="suspects-k">Persons of interest</div>${SUSPECTS.map((p) => `<div class="sus">${KNIFE}
      <div class="sus-n">${esc(p.n)}</div><div class="sus-d">${esc(p.d)}</div><div class="sus-w">Weapon · <b>${esc(p.w)}</b></div></div>`).join('')}</div>`;
    const cards = qa(root, '.sus');
    cards.forEach((c, i) => api.cue({ s: 0, d: 0.15 + i * 0.18 }, () => c.classList.add('on')));
    SUSPECTS.forEach((p, i) => api.cue({ s: p.s, d: 0.2 + (p.n === 'DeepSeek' ? 1.3 : p.n === 'Open weights' ? 2.2 : 0) }, () => { cards[i].classList.add('hit'); api.sfx('stamp'); }));
  };

  /* ═══════════════════════════ STATEMENTS ═══════════════════════════ */
  V.statements = (root, sc, api) => {
    root.innerHTML = `<div class="stmts">${sc.items.map((it) => `<div class="stm"><div class="stm-big">${esc(it.big)}</div>${it.small ? `<div class="stm-small">${esc(it.small)}</div>` : ''}</div>`).join('')}</div>`;
    const ns = qa(root, '.stm');
    sc.items.forEach((it, i) => api.cue(it.at, () => {
      ns.forEach((n) => n.classList.remove('on'));
      ns[i].classList.add('on');
      if (it.count) api.count(q(ns[i], '.stm-big'), 0, it.count, 2.1, fmt);
      if (it.sfx) api.sfx(it.sfx);
    }));
  };

  /* ═══════════════════════════ SURVIVED BY ═══════════════════════════ */
  V.survived = (root, sc, api) => {
    const kids = [['GPT-2', '2019', 'weights released'], ['CLIP', '2021', 'MIT license'], ['Whisper', '2022', 'MIT license'], ['gpt-oss', '2025', 'Apache 2.0']];
    root.innerHTML = `<div class="survived">
      <div class="sv-k">Survived by its open-weight children</div>
      <div class="sv-row">${kids.map(([n, y, l]) => `<div class="kid"><div class="kid-flame"><i></i></div><b>${n}</b><span>${y}</span><em>${l}</em></div>`).join('')}</div>
      <div class="sv-moral">The only parts of OpenAI that lived forever were the parts that were open.</div></div>`;
    api.at(0.1, () => on(q(root, '.sv-k')));
    qa(root, '.kid').forEach((kd, i) => api.cue({ s: 0, d: 1.1 + i * 0.85 }, () => { kd.classList.add('on'); api.sfx('chime'); }));
    api.onS(1, () => on(q(root, '.sv-moral')), 0.15);
  };

  /* ═══════════════════════════ IN LIEU OF FLOWERS ═══════════════════════════ */
  V.flowers = (root, sc, api) => {
    root.innerHTML = `<div class="lieu"><div class="lieu-k">In lieu of flowers</div><div class="lieu-t">the family asks that you<br><b>open-source something.</b></div></div>`;
    add(api.layer, `<div class="petals" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => {
      const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
      return `<i style="--x:${(r(1) * 100).toFixed(1)}%;--d:${(7 + r(2) * 6).toFixed(1)}s;--delay:${(-r(3) * 9).toFixed(1)}s;--s:${(0.6 + r(4) * 0.9).toFixed(2)}"></i>`;
    }).join('')}</div>`);
    api.at(0.1, () => on(q(root, '.lieu')));
  };

  /* ═══════════════════════════ HERE LIES ═══════════════════════════ */
  V.tomb = (root, sc, api) => {
    root.innerHTML = `<div class="final-tomb"></div>`;
    const holder = q(root, '.final-tomb');
    const src = document.getElementById('mainTomb');
    if (src) {
      const t = src.cloneNode(true);
      t.removeAttribute('id');
      qa(t, '[id]').forEach((el) => el.removeAttribute('id'));
      const pl = q(t, '.plaque');
      if (pl) pl.setAttribute('tabindex', '-1');
      holder.appendChild(t);
    }
    api.at(0.1, () => { on(holder); api.sfx('chime'); });
  };

  /* ═══════════════════════════ CREDITS ═══════════════════════════ */
  V.credits = (root, sc, api) => {
    const html = RIP.CREDITS.map((s) => {
      if (s.title) return `<div class="crd-sec"><div class="crd-title">${esc(s.title)}</div><div class="crd-sub">${esc(s.sub)}</div></div>`;
      if (s.lines) return `<div class="crd-sec"><div class="crd-h">${esc(s.h)}</div>${s.lines.map(([a, b]) => `<div class="crd-line"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('')}</div>`;
      if (s.mem) return `<div class="crd-sec"><div class="crd-h">${esc(s.h)}</div>${s.mem.map(([a, b]) => `<div class="crd-mem">${esc(a)} <small>${esc(b)}</small></div>`).join('')}</div>`;
      if (s.list) return `<div class="crd-sec"><div class="crd-h">${esc(s.h)}</div>${s.list.map((a) => `<div class="crd-mem">${esc(a)}</div>`).join('')}</div>`;
      if (s.disc) return `<div class="crd-sec"><div class="crd-h">${esc(s.h)}</div><p class="crd-disc">${esc(s.disc)}</p></div>`;
      if (s.end) return `<div class="crd-sec crd-end">${esc(s.end)}</div>`;
      return '';
    }).join('');
    root.innerHTML = `<div class="credits"><div class="crd-roll">${html}</div></div>`;
    const box = q(root, '.credits'), roll = q(root, '.crd-roll');
    api.tick((t) => {
      const Hh = box.clientHeight, h = roll.offsetHeight;
      const p = Math.min(1, t / Math.max(1, api.dur - 1.6));
      // Start just below the frame; finish with the last line resting mid-screen.
      roll.style.transform = `translateY(${(Hh - p * (Hh / 2 + h)).toFixed(1)}px)`;
    });
  };
})();
