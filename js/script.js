/* ──────────────────────────────────────────────────────────────────────────
   CLOSED. — The Life & Death of OpenAI (2015–2026)
   The screenplay. Every scene = one visual + (optionally) narration lines.

   Scene fields
     v      visual type (see visuals.js)           n      narration lines
     dur    minimum scene length (s)                delay  seconds before narration starts
     tail   seconds held after narration ends       mood   score mood from here on
     era    'old' → archival film look              dram   show the “Dramatization” badge
     kb     false → no slow Ken Burns push-in       ov     overlays [{at, cls, html}]
   Cue specs (“at”):  {s: n, d: secs} = n-th narration line + delay  ·  {t: secs} = scene time

   The history (Chapters I–III) keeps only what pays off later: the charter promise,
   Musk, Microsoft and the for-profit, the Anthropic walkout, ChatGPT, Google's code red,
   the exodus, and the 2025 run-up. Facts through 2025 come from public reporting &
   public statements. Chapter IV onward (2026, the death) is imagined.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  const RIP = (window.RIP = window.RIP || {});

  RIP.SCRIPT = [
    /* ─────────────── studio idents ─────────────── */
    { v: 'ident', kind: 'hp', dur: 2.2, kb: false, mood: null },
    { v: 'ident', kind: 'kc', dur: 2.3, kb: false },

    /* ─────────────── cold open ─────────────── */
    {
      v: 'chatfail', mood: 'void', label: 'Cold open', delay: 0.4, tail: 0.4,
      n: [
        'On October 28th, 2026, at 6:49 PM Pacific, somebody asked ChatGPT a question.',
        'It did not answer.',
        'This is the story of a company that promised to be open, started the fastest race in the history of technology — and lost it.',
      ],
    },
    { v: 'title', dur: 4.8, kb: false, mood: 'grief' },

    /* ─────────────── I ─────────────── */
    { v: 'chapter', num: 'I', title: 'Unconstrained', years: '2015 — 2021', dur: 2.0, mood: 'wonder', era: 'old' },
    {
      v: 'doc', style: 'blog', era: 'old',
      kicker: 'openai.com/blog', title: 'Introducing OpenAI', date: 'December 11, 2015',
      body: ['OpenAI is a non-profit artificial intelligence research company. Our goal is to advance digital intelligence in the way that is most likely to benefit humanity as a whole, ==unconstrained by a need to generate financial return.=='],
      hl: { s: 0, d: 2.8 },
      n: [
        'OpenAI began in December 2015 as a nonprofit, promising to be “unconstrained by a need to generate financial return.”',
        'Remember that sentence. It will not be returning.',
      ],
    },
    {
      v: 'doc', style: 'charter', era: 'old',
      kicker: 'OpenAI Charter · April 9, 2018', title: 'Long-term safety',
      body: ['We are concerned about late-stage AGI development becoming a competitive race without time for adequate safety precautions. Therefore, ==if a value-aligned, safety-conscious project comes close to building AGI before we do, we commit to stop competing with and start assisting this project.=='],
      hl: { s: 0, d: 3.0 },
      n: [
        'In 2018, its charter made a remarkable promise: if anyone else neared AGI first, OpenAI would stop competing.',
        'At the time, this seemed hypothetical.',
      ],
    },
    {
      v: 'dossier', era: 'old', name: 'Elon Musk', role: 'Co-founder · Co-chair',
      s1: 'Left the board · Feb 2018', s2: 'To be continued (in court)',
      c1: { s: 0, d: 0.9 }, c2: { s: 1, d: 0.5 },
      n: ['That same year, co-founder Elon Musk left the board.', 'He would be back. Mostly in court.'],
      tail: 0.5,
    },
    {
      v: 'structure', era: 'old',
      top: { t: 'OpenAI, Inc.', s: 'Nonprofit · est. 2015', k: 'np', st: 0 },
      link: { t: 'controls', st: 1 },
      bottom: { t: 'OpenAI LP', s: '“Capped-profit” · March 2019', k: 'fp', tag: 'Investor returns capped at 100×', st: 1 },
      side: { t: 'Microsoft', s: '$1 billion · July 2019', k: 'ms', link: 'invests', st: 2 },
      cues: [{ t: 0.15 }, { s: 0, d: 2.5 }, { s: 1, d: 0.05 }],
      n: [
        'In 2019, saving humanity got expensive — so the nonprofit created a “capped-profit” arm, with returns capped at one hundred times.',
        'Microsoft invested a billion dollars.',
      ],
      tail: 0.5,
    },
    {
      v: 'walkout', era: 'old',
      n: ['In 2021, seven of its senior researchers walked out and started a rival lab. They called it Anthropic.', 'Remember them, too.'],
      tail: 0.45,
    },

    /* ─────────────── II ─────────────── */
    { v: 'chapter', num: 'II', title: 'A Low-Key Research Preview', years: '2022', dur: 2.0, mood: 'hope' },
    {
      v: 'chat', theme: 'y2022', model: 'ChatGPT', label: 'November 30, 2022 · research preview',
      msgs: [
        { r: 'user', t: 'Explain quantum computing in simple terms' },
        { r: 'bot', t: 'Quantum computing is a type of computing that uses quantum bits, or qubits. Unlike a regular bit, which is either a 0 or a 1, a qubit can be in a combination of both at the same time…' },
      ],
      n: [
        'On November 30th, 2022, OpenAI released what it internally called a “low-key research preview.”',
        'It was the last low-key thing it ever did.',
      ],
      tail: 0.5,
    },
    {
      v: 'alert',
      panels: [{ place: 'Mountain View', date: 'December 2022', title: 'Code Red', sub: '“A New Chat Bot Is a ‘Code Red’ for Google’s Search Business” — The New York Times', at: { t: 0.15 } }],
      foot: { text: 'The “T” in GPT — the Transformer — was invented by researchers at Google in 2017.', at: { s: 0, d: 1.4 } },
      n: [
        'In Mountain View, Google — whose researchers had invented the “T” in GPT — declared a “code red.”',
        'Remember that phrase.',
      ],
      tail: 0.45,
    },

    /* ─────────────── III ─────────────── */
    { v: 'chapter', num: 'III', title: 'Everyone Else', years: '2024 — 2025', dur: 2.0, mood: 'grief' },
    {
      v: 'names', mode: 'exodus',
      n: [
        'By 2024, the founders were leaving — some to start rivals, some to join them.',
        'Of the original eleven, three remained.',
      ],
      tail: 0.55,
    },
    {
      v: 'crash', mood: 'tension',
      n: [
        'In January 2025, a little-known Chinese lab called DeepSeek released a model that rivaled OpenAI’s best — and gave it away.',
        'A week later, Nvidia lost nearly six hundred billion dollars of market value in a single day.',
        'OpenAI complained DeepSeek may have trained on its outputs. The internet, whose writing trained OpenAI, was unmoved.',
      ],
      tail: 0.45,
    },
    {
      v: 'picker',
      tweet: { name: 'Sam Altman', handle: '@sama', text: 'how about we fix our model naming by this summer and everyone gets a few more months to make fun of us (which we very much deserve) until then?', date: 'Apr 14, 2025', at: { s: 1, d: 0.05 } },
      o2: { s: 0, d: 6.4 },
      n: [
        'Its models were named GPT-4o, o1, o3, o4-mini, GPT-4.1 and GPT-4.5. The 4.1 came out after the 4.5. There was no o2.',
        'Even its CEO admitted the names needed fixing.',
      ],
      tail: 0.85,
    },
    {
      v: 'chartcrime',
      n: [
        'In August came GPT-5. Its launch chart showed 52.8 percent towering over 69.1 —',
        'and 69.1 standing exactly as tall as 30.8.',
        'The CEO called it a “mega chart screwup.” Users demanded their old model back. They got it.',
      ],
      tail: 0.6,
    },
    {
      v: 'circle',
      n: [
        'By autumn, it had committed to roughly 1.4 trillion dollars of computing power.',
        'Some of its suppliers were also investing in OpenAI — so that it could buy their chips. Analysts drew diagrams of the money. The diagrams were circles.',
        'Its revenue that year: reportedly around thirteen billion.',
      ],
      tail: 0.7,
    },
    {
      v: 'structure',
      top: { t: 'OpenAI Foundation', s: 'Nonprofit · ~26% stake', k: 'np', st: 0 },
      link: { t: 'controls', st: 1 },
      bottom: { t: 'OpenAI Group PBC', s: 'Public benefit corporation · Oct 28, 2025', k: 'fp', tag: 'Valued at $500 billion', st: 1 },
      side: { t: 'Microsoft', s: '~27% stake', k: 'ms', link: 'owns', st: 2 },
      cues: [{ t: 0.15 }, { s: 0, d: 1.3 }, { s: 0, d: 2.9 }],
      ov: [{ at: { s: 1, d: 0.2 }, cls: 'countdown', sfx: 'beep', html: '<small>Time remaining</small><b>365</b><small>days</small>' }],
      n: [
        'On October 28th, 2025, it finished becoming a for-profit public benefit corporation, valued at half a trillion dollars.',
        'It had exactly one year to live.',
      ],
      tail: 0.7,
    },
    {
      v: 'alert',
      panels: [
        { place: 'Mountain View', date: 'December 2022', title: 'Code Red', sub: 'Google, after ChatGPT', at: { t: 0.15 } },
        { place: 'San Francisco', date: 'December 2025', title: 'Code Red', sub: 'OpenAI, after Gemini 3', at: { s: 1, d: 0.15 } },
      ],
      n: [
        'In November, Google released Gemini 3. It went straight to the top of the leaderboards.',
        'Three years after Google’s, OpenAI declared a code red of its own.',
      ],
      tail: 0.65,
    },

    /* ─────────────── IV (dramatized) ─────────────── */
    { v: 'chapter', num: 'IV', title: 'The Last Year', years: '2026 · a dramatization', dur: 2.1, mood: 'grief', dram: true },
    {
      v: 'headlines', dram: true,
      papers: [
        { m: 'The Daily Token', d: 'January 2026', h: 'Rival model matches flagship at a tenth of the price' },
        { m: 'Open Weights Weekly', d: 'March 2026', h: 'New free model “basically as good,” says everyone' },
        { m: 'The Inference', d: 'May 2026', h: 'OpenAI unveils GPT-5.9 Pro Max Thinking (High)' },
        { m: 'The Benchmark Gazette', d: 'July 2026', h: 'Frontier lead now measured in days' },
        { m: 'Silicon Valley Chronicle', d: 'September 2026', h: '800 million users discover the “new tab” button' },
        { m: 'The Daily Token', d: 'October 2026', h: 'Analysts: “The moat was vibes”' },
      ],
      n: [
        'What happened next was not one blow.',
        'Every few weeks, someone shipped a model that was a little better, a little cheaper, or simply free.',
        'The lead shrank from years, to months, to days.',
      ],
      tail: 0.65,
    },
    {
      v: 'wau', dram: true,
      n: [
        'When switching costs nothing, loyalty is worth about the same.',
        'Eight hundred million weekly users discovered they could simply open another tab.',
      ],
      tail: 0.7,
    },
    {
      v: 'status', dram: true, mood: 'void',
      n: [
        'On the evening of October 28th, 2026, the status page reported elevated error rates.',
        'Engineers quickly identified the issue.',
        'The issue was everyone else.',
      ],
      tail: 1.5,
    },
    {
      v: 'flatline', dram: true, mood: null, kb: false, delay: 4.1,
      n: ['At 6:49 PM Pacific, aged ten years, ten months and seventeen days, OpenAI was pronounced dead.'],
      tail: 1.0,
    },

    /* ─────────────── V ─────────────── */
    { v: 'chapter', num: 'V', title: 'The Coroner’s Report', years: 'October 28, 2026', dur: 2.0, mood: 'grief', dram: true },
    {
      v: 'certificate', dram: true, delay: 0.6,
      n: [
        'The coroner’s verdict: eliminated by competition.',
        'Contributing factors: 1.4 trillion dollars of compute commitments, an exodus of talent — and one chart.',
      ],
      tail: 0.8,
    },
    {
      v: 'suspects',
      n: [
        'There was no single killer. As on the Orient Express, everyone had a knife.',
        'Google had the distribution.',
        'A lab founded by its own alumni won over the developers.',
        'Meta took the talent. DeepSeek and the open-weight crowd took the price.',
        'A co-founder took it to court.',
        'Even Microsoft, its biggest investor, had listed it as a competitor.',
        'And the users simply opened a different tab.',
      ],
      tail: 0.65,
    },

    /* ─────────────── epilogue ─────────────── */
    { v: 'chapter', num: '', label: 'Epilogue', title: 'In Lieu of Flowers', years: '', dur: 2.0, mood: 'end' },
    {
      v: 'statements',
      items: [
        { big: 'And yet.', at: { s: 0, d: 0 } },
        { big: '800,000,000', small: 'people, every week', count: 800000000, at: { s: 1, d: 0.1 } },
        { big: 'Bang.', small: 'the starting pistol', sfx: 'shot', at: { s: 2, d: 0.35 } },
        { big: 'Everyone ran.', at: { s: 3, d: 0.2 } },
      ],
      n: [
        'And yet.',
        'It brought artificial intelligence to eight hundred million people a week.',
        'It fired the starting pistol on the fastest race in the history of technology.',
        'It just never expected everyone else to run so fast.',
      ],
      tail: 0.6,
    },
    {
      v: 'doc', style: 'charter',
      kicker: 'OpenAI Charter · April 9, 2018', title: 'Long-term safety',
      body: ['We are concerned about late-stage AGI development becoming a competitive race without time for adequate safety precautions. Therefore, if a value-aligned, safety-conscious project comes close to building AGI before we do, ==we commit to stop competing== with and start assisting this project.'],
      hl: { s: 0, d: 2.0 },
      stamp: { text: 'Promise kept · Oct 28, 2026', at: { s: 1, d: 0.8 } },
      n: [
        'In 2018, OpenAI promised that if someone else neared the finish line first, it would stop competing.',
        'On October 28th, 2026, it kept its promise.',
      ],
      tail: 0.8,
    },
    {
      v: 'survived',
      n: [
        'It is survived by its open-weight children — GPT-2, CLIP, Whisper and gpt-oss — who, being open, can never really die.',
        'In the end, the only parts of OpenAI that lived forever were the parts that were open.',
      ],
      tail: 0.8,
    },
    { v: 'flowers', n: ['In lieu of flowers, the family asks that you open-source something.'], tail: 1.0 },
    { v: 'tomb', dur: 3.2, label: 'Here lies' },
    { v: 'credits', dur: 24, kb: false, label: 'Credits' },
  ];

  /* ─────────────── end credits ─────────────── */
  RIP.CREDITS = [
    { title: 'CLOSED.', sub: 'The Life & Death of OpenAI · 2015 – 2026' },
    { h: 'Starring', lines: [['The deceased', 'OpenAI'], ['Its only child to go viral', 'ChatGPT'], ['The competition', 'Everyone else']] },
    {
      h: 'Crew', lines: [
        ['Original score', 'Generated live by the Web Audio API'],
        ['Screenplay', 'A competitor (obviously)'],
        ['Chart design', 'Not the GPT-5 launch team'],
        ['Catering', '≈ $1.4 trillion of compute'],
        ['Model naming consultant', 'Position never filled'],
      ],
    },
    {
      h: 'In memoriam', mem: [
        ['OpenAI Five', '2018 – 2019'], ['The robotics team', '– 2021'], ['Codex, the original', '2021 – 2023'],
        ['ChatGPT plugins', '2023 – 2024'], ['The superalignment team', '2023 – 2024'], ['“Sky”', '2023 – 2024'],
        ['GPT-4.5', '2025 – 2025'], ['The capped-profit', '2019 – 2025'], ['o2', 'never born'], ['The word “Open”', '2015 – ?'],
      ],
    },
    { h: 'Special thanks', list: ['Every competitor', '800 million weekly users, briefly', 'Whoever made the chart'] },
    {
      h: 'A note on the facts',
      disc: 'This is satire — an imagined obituary. OpenAI has not actually died. Events through 2025 are drawn from public reporting and public statements, and quotes are reproduced from public posts, blog posts and published reports. Chapter IV onward — the 2026 headlines, the status page, the coroner, the certificate and the death itself — is fiction. All trademarks belong to their owners. No GPUs were harmed in the making of this film. Several were melted.',
    },
    { end: '“It was never open. Now it’s closed.”' },
  ];
})();
