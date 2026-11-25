# reelkit

Makes short promo reels for web apps from real app footage: about 10 seconds, 9:16, with bold motion graphics, a
voice-over, music and captions. Everything runs on your own machine.

- **Capture:** Playwright records the app at phone size, crisp at 2×.
- **Voice:** [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) through kokoro-js, on the CPU, with no API key.
- **Music:** written in code by a small synth in `src/kit/music`, so it's original and its beats are exact. A track
  you drop in works too.
- **Compose:** [Remotion](https://www.remotion.dev). **Finish:** ffmpeg (bundled by ffmpeg-static).

## Setup

Node 24 and npm 11 (pinned through Volta).

```sh
npm install
npx playwright install chromium
```

The first `voice` run downloads the Kokoro model (about 300 MB) and caches it.

## Making a reel

```sh
npm run seed -- kopit      # demo data for the app (kop.it: a demo household and a real AI note)
npm run reel -- kopit      # capture → voice → music → beats → render → export
```

The result is `apps/kopit/out/kopit-9x16.mp4`. `npm run studio -- kopit` opens Remotion Studio for tweaking.
[CLAUDE.md](CLAUDE.md) covers every step and how to add a new app.

## Licences

- Kokoro-82M and kokoro-js: Apache 2.0, so commercial use is fine.
- Remotion is free for individuals and for companies of up to 3 people. Larger companies need a
  [company licence](https://www.remotion.dev/license).
- The generated music is made entirely in this repo. A track you drop in has to be licensed for ads.
