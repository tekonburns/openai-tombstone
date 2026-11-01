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

The tombstone engraving encodes the page's own URL (`…/index.html#watch`). Host the folder anywhere static
(GitHub Pages, Netlify, Cloudflare Pages) and the carved code points at the live documentary.
To engrave a different URL without redeploying, add `?qr=https://your.site/whatever`.

## What's inside

| File | Purpose |
| --- | --- |
| `index.html` | The cemetery, the player chrome, the book of condolences |
| `css/style.css` | All styling, including every scene's look |
| `js/qr.js` | Dependency-free QR encoder (byte mode, v1–40, L/M/Q/H, verified against jsQR) |
| `js/audio.js` | Generative score + sound effects (Web Audio) |
| `js/script.js` | The screenplay: every scene, its captions and cue timings |
| `js/visuals.js` | One builder per scene type — the "footage" |
| `js/app.js` | The projector: scene scheduling, caption sync, controls, QR wiring, guestbook |
| `og.png` | The link-preview card (X, iMessage, Slack…), rendered from the cemetery by `tools/make-og.js` |

Keyboard: **Space** play/pause · **←/→** scenes · **M** score · **C** subtitles ·
**F** fullscreen (or pay respects, at the grave) · **Esc** back to the grave.
Debug: `?scene=21` starts the film at scene 21.

## Link previews

`index.html` carries Open Graph + `twitter:card = summary_large_image` tags pointing at
`og.png` with an **absolute** URL, so pasting the link on X shows the large card. If you host
the site elsewhere, update the `og:url` / `og:image` / `twitter:image` URLs and the canonical
link. To re-render the card after changing the tombstone: `node tools/make-og.js` (needs
Chrome and `puppeteer-core` on `NODE_PATH`). X caches cards per URL; append `?v=2` to the
link if you need it to re-fetch.

## On the facts

Everything through 2025 is drawn from public reporting and public statements. Chapter IV
onward — the 2026 headlines, the status page, the coroner's certificate, the death itself — is
fiction. The one exception is "The Reset Company": Days 1–27 are the real daily posts from
@thsottiaux (Oct 5–31, 2026), lightly abridged; Day 28 — the day of death — is tomorrow's, as
promised on Day 26. No GPUs were harmed. Several were melted.
