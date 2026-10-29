# CLOSED. — The Life & Death of OpenAI (2015–2026)

A satirical, fully self-contained web "documentary" — the thing you'd get if you scanned the QR
code on OpenAI's tombstone. Cause of death: **eliminated by competition.**

## Run it

```bash
# any static server works; no build step, no dependencies
python3 -m http.server 8765
open http://localhost:8765/
```

Double-clicking `index.html` also works (everything is a classic `<script>`), but the QR code
will then encode a `file://` URL that only your own machine can open.

## Make the QR scannable

The plaque encodes the page's own URL (`…/index.html#watch`). Host the folder anywhere static
(GitHub Pages, Netlify, Cloudflare Pages) and the engraved code points at the live documentary.
To engrave a different URL without redeploying, add `?qr=https://your.site/whatever`.
"Download QR" saves a clean black-and-white SVG for printing.

## What's inside

| File | Purpose |
| --- | --- |
| `index.html` | The cemetery, the player chrome, the book of condolences |
| `css/style.css` | All styling, including every scene's look |
| `js/qr.js` | Dependency-free QR encoder (byte mode, v1–40, L/M/Q/H, verified against jsQR) |
| `js/audio.js` | Generative score + sound effects (Web Audio) and the narrator (speechSynthesis) |
| `js/script.js` | The screenplay: every scene, its narration and cue timings |
| `js/visuals.js` | One builder per scene type — the "footage" |
| `js/app.js` | The projector: scene scheduling, narration sync, controls, QR wiring, guestbook |

Keyboard: **Space** play/pause · **←/→** scenes · **N** narrator · **M** score · **C** subtitles ·
**F** fullscreen (or pay respects, at the grave) · **Esc** back to the grave.
Debug: `?scene=21` starts the film at scene 21.

## On the facts

Everything through 2025 is drawn from public reporting and public statements. Chapter IV
onward — the 2026 headlines, the status page, the coroner's certificate, the death itself — is
fiction. No GPUs were harmed. Several were melted.
