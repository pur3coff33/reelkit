# reelkit

Short promo reels (10–30 s, 9:16) for web apps: real app footage, bold motion graphics, a Kokoro voice-over, music
written in code, captions. Everything runs locally. Each app's reel is written by Claude; this repo holds the tooling.

## The pipeline

Each step is `npm run <step> -- <app>` and writes into `apps/<app>/out/` (gitignored).

| Step | What it does | Output |
|---|---|---|
| `seed` | Fills the app with demo data (app-specific, optional) | whatever the app needs |
| `capture` | Brings the app up, runs its shots at phone size (390×844 @2×), records each | `out/clips/<shot>.mp4`, `out/capture.json` |
| `voice` | Kokoro (kokoro-js, CPU) reads `config.voice.lines`, one WAV per line | `out/voice/*.wav`, `out/voice.json` |
| `music` | Runs the app's `music` hook (generated tracks) | `out/music.wav` |
| `beats` | Beat grid from `config.music.bpm/offset`, or detected from the track | `out/beats.json` |
| `render` | Remotion renders the app's composition (app folder = public dir) | `out/<app>-<shape>-raw.mp4` (`9x16`, `16x9`…) |
| `export` | Trims to length, −14 LUFS + limiter; `--extras` adds 1:1, 4:5, GIF (portrait only) | `out/<app>-<shape>.mp4` |
| `reel` | capture → voice → music → beats → render → export | |
| `studio` | Remotion Studio on the app's composition, for tweaking timing live | |
| `fetch` | Documentaries: downloads `media.ts` (photos, footage, music), checks rights | `out/media/`, `out/media.json`, `out/credits.md` |

Flags: `capture --peek` (screenshot + HTML per shot instead of recording: use it to find selectors), `capture --only <shot>`,
`voice --voice <name>` (renders another voice into `out/voice-<name>/` to compare).

Kokoro has no emotion setting. To change the delivery, use the voice, the speed, and punctuation (`!`, `?`, `…`, `—`). A
voice `name` can be a blend: `"af_heart:0.7,af_bella:0.3"` (a blend reads with the first voice's accent; `--voice`
takes blends too). A line can set its own `speed`, which overrides `voice.speed`.

Names espeak gets wrong (Filipino names, places) can be given as phonemes inside a line's `text`: `[Timog](/timˈoɡ/)`.
The rest of the line is phonemised exactly as kokoro-js does it (checked identical on 14 lines), so only the marked word
changes. Find the phonemes with `npx tsx apps/ozone/say.ts "Timog" "Tee-mog"` (prints what Kokoro will read for each
spelling); every symbol in Kokoro's vocabulary works (ɾ, ɔ, ʎ…). Skip markup in lines with digits or abbreviations: that
path skips kokoro-js's own text clean-up.

## Video length is a guide, not a target

When the user asks for "a 1 min video" (or any length), it's approximate: a bit shorter or longer is fine (±20% without
asking). Never cut sourced detail, speed up the voice, squeeze the pauses or shorten shots just to land on an exact
number (the user, 2026-11-27, after the Pinatubo narration was rushed to hit 59.96 s). Let the layout set the length:
derive the composition's duration from it (`seconds: Math.ceil(LAYOUT.seconds)` in `apps/pinatubo/reel.config.ts`).

## Post notes with every video (don't skip)

Every finished video gets a Markdown file next to it with the same name (`out/<app>-9x16.mp4` → `out/<app>-9x16.md`).
Write the source as `apps/<app>/post.md` (kept in git); `export` copies it next to the video. Videos muxed by hand
(whale, strangers, cosmic egg, middle) need the copy made by hand too. It holds:

- **Captions:** 3–5 options, one short sentence each, ready to paste. A hook or a question, not a summary.
- **Affiliate products:** 4–6 real kinds of product the video's viewers would want (books, kits, gear), each with a
  one-line reason it fits and search terms to find it on Shopee, Lazada or Amazon. Never make up links, prices or
  product names that don't exist; the user adds their own affiliate links.
- **Notes:** anything the post text should disclose (a simulation, a dramatised fact) and where facts came from.

`caption.txt` is separate: it's what `npm run post` sends to Facebook.

## Keeping files small

`render` encodes near-lossless (`--crf 16`) and `export` copies that video as is, so finished files come out bigger than
they need to be: 7.8 MB for the 62 s callmask reel. Re-encode the video and shrink the audio to keep it small:

- **Video:** `-c:v libx264 -preset slow -tune animation -crf 24 -pix_fmt yuv420p`. `-tune animation` suits flat drawn
  graphics; use `-tune film` for reels that are mostly app footage. `-preset slow` costs encode time, not quality.
- **Audio:** a voice-only reel goes mono, `-ac 1 -b:a 96k`. With music, keep stereo at `-b:a 128k`.
- **Keep 1080×1920.** Reels and Shorts expect it. Dropping to 720×1280 roughly halves the file again but softens text;
  only do it for files shared internally (chat, email).
- **Skip HEVC and AV1.** They're smaller, but some browsers, chat previews and older players can't play them.

Measured on callmask (62 s, 1080×1920, flat graphics, mono 96k voice). Similarity to the render (SSIM) is out of 1:

| Video | Size | SSIM |
|---|---|---|
| copied from render (CRF 16) | 6.6 MB | 1 |
| CRF 22 | 3.6 MB | 0.9988 |
| **CRF 24** (recommended) | **3.1 MB** | 0.9985 |
| CRF 26 | 2.7 MB | 0.9980 |

Wired into `export` only for apps with `encode: "doc"` (CRF 24, `-tune film`, AAC 192k); the rest still copy the
render's video and write 256k stereo audio.

**Points-of-light films are a different case: pick the size, not just the CRF.** Tens of thousands of moving dots are
about the hardest thing to compress: the same CRF gives 5–10× the bitrate of flat graphics, and calm scenes are no
smaller than busy ones. Measured on `middle` (4:10, 1080×1920; `-preset slower -tune film -aq-mode 3`, which gives
near-black more bits so dark films don't band):

| CRF | Bitrate | 4:10 file | SSIM | Looks |
|---|---|---|---|---|
| 19 | ~55 Mbps | ~1.7 GB | 0.98 | identical |
| 23 | ~28 Mbps | ~900 MB | 0.96 | identical |
| 26 | ~18 Mbps | ~560 MB | 0.93 | identical to the eye |
| **29** | **~10.5 Mbps** | **~330 MB** | 0.90 | slightly soft when zoomed (used for `middle`) |
| 32 | ~6 Mbps | ~180 MB | 0.87 | visibly blurry |

The user wanted better quality than CRF 25 but found the large files too big (2026-11-25): ask which size they want,
and keep the near-lossless render so a re-encode is all it takes. AAC 192k stereo with music. The raw render's video is
full range (`yuvj420p`): encode with `-vf "scale=in_range=full:out_range=tv,format=yuv420p" -color_range tv`.

## Layout

```
src/cli.ts              the steps
src/Root.tsx            registers every app's composition (add new apps here)
src/kit/                app-agnostic
  config.ts             ReelConfig and AppModule: what an app provides
  capture/record.ts     phone context, CDP screencast recording, tap ripple, eased scroll, `keep()` for data
  voice/kokoro.ts       lines → WAVs + durations
  music/synth.ts        kick, clap, hat, bass, chord, pluck, riser, impact, Mix (duck, reverb, finish), WAV writer
  music/studio.ts       new scores: stems of real instruments, loose playing, hall, LUFS levels, limiter (skill: reel-score)
  music/sfx.ts          cinematic effects: whoosh (pans past), swell (reversed tail into a cut), boom, shimmer, stutter, blast
  music/sampler.ts      real instruments from WAVs (VSCO 2 CE, CC0, fetched into .state/samples), hall reverb
  beats/beats.ts        grid, snap, tempo/phase detection
  remotion/             base (font, beatFrame, loadReelData), motion (slam/pop/ease), KineticText, PhoneFrame,
                        NoteCard, Captions (word pops, *starred* words highlighted), AudioMix (music ducks under voice),
                        EndCard (wordmark with a leaf, tagline, URL pill), Plant (kop.it-style, can grow and bloom)
  looks/                  paper-cut, world in a box and points of light (see Looks)
  render.ts, export/    Remotion CLI and ffmpeg (ffmpeg-static, nothing to install)
apps/<app>/             one folder per app (see kopit for a full example)
  app.ts                the AppModule: config + seed/serve/beforeCapture/afterCapture/shots/music hooks
  reel.config.ts        URL, tagline, voice lines (each on a beat), music, theme colours
  timeline.ts           scenes and cues in beats (the music and the video both read it)
  capture.ts            shots: { name, path, prepare?, act, after? }
  music.ts              the arrangement, using src/kit/music/synth
  Reel.tsx              the composition
  assets/               anything kept in git that the composition reads
.state/<app>/           app state for capture (gitignored, outside the app folder: the app folder is copied into renders)
```

## Making a reel for a new app

1. **Talk it through first**: what the app is, who the reel is for, the one feature to headline, the look. Write a
   storyboard on a beat grid: 10 s at 120 BPM is 20 beats (a beat = 15 frames at 30 fps).
2. `apps/<app>/reel.config.ts`: copy kopit's and change it. Voice lines are short (10 s holds ~25 words) and each
   starts on a beat; spell brand names the way they should sound in `text`, the real way in `caption`.
3. `apps/<app>/timeline.ts`: scenes `{from, to}` and cues in beats.
4. `apps/<app>/app.ts` with `serve` (bring the app up, resolve its URL), optional `seed`, `beforeCapture` (log in, set
   localStorage with `context.addInitScript`, fix the clock with `page.clock.install`), `afterCapture` (undo what shots
   saved), and `shots`.
5. Shots: `npm run capture -- <app> --peek`, read the screenshots and `out/clips/<shot>.html` for selectors, then write
   `act` with `h.tap(selector)`, `h.wait(ms)`, `h.scroll(px, ms)`. Pass `page.evaluate` a **string**, not a function:
   tsx wraps named functions in a `__name` helper that doesn't exist in the page.
6. Music: write `apps/<app>/music.ts` on the same grid (see kopit's: hits on cues, riser into the groove, plucks for
   ticks), or drop a licensed track into `assets/` and set `music: { file: "assets/x.mp3" }` without `generated`.
7. `apps/<app>/Reel.tsx` using the kit components, then register it in `src/Root.tsx` (`calculateMetadata` loads the
   pipeline's JSON with `loadReelData`). Inside a `<Sequence>`, `useCurrentFrame()` counts from the sequence's start:
   pass scene-relative frames to components there.
8. `npm run reel -- <app>`. Review by pulling frames: `ffmpeg -i out/<app>-9x16.mp4 -vf "select=…,tile=6x2"` and reading
   the image. Check the length (≤ the config's seconds) and loudness (`-af ebur128=peak=true`).

## Rules of the look

Punchy and graphic, never cartoonish: big heavy type, cuts on beats, no pause over ~0.5 s, no mascots. Keep captions
and key text out of the platform UI zones (top ~250 px, bottom ~350 px of 1920). Real footage only; AI copy shown in an
ad must be what the app's AI actually wrote (kopit marks a fallback as a "sample note").

## What If? series (`whatif-ai`, `whatif-blackout`, `whatif-gone`)

Three 60 s low-poly "what if" episodes for the user's own channel, drawn from code with no voice: words on screen carry
each story. Built on `src/kit/lowpoly` plus a series kit in `src/kit/whatif/`:

- `city.ts`: a seeded city plan (towers in the core, houses past `houseRing`, `skip` for set-piece blocks) and how it
  looks at time t: `power` (lit windows, street lights), `green` (vines, grass, trees), `ruin`, `restyle`, `lamp`.
  Also traffic (`clear` keeps a rectangle free for a street-level camera) and pavement walkers.
- `Reel.tsx`: the series look every episode shares (badge, FICTIONAL SIMULATION tag, hook, stamps, bottom words, slams,
  closing question with "comment your answer"). An episode is an `Episode` object; its `overlay` adds its own HUD.
- `cinema.tsx` (bloom, grain, grade), `props.ts` (shared set pieces), `score.ts` (the recurring 4-note "what if?"
  motif played under every hook and question, plus shared sound effects).

Pipeline per episode: `music` → `render` → `export`. Review fast with the `<app>-contact` composition (every 15th
frame): render it, then `tile=6x4` the frames. Gotchas found while building: the 9:16 frame is narrow (~29° across at
fov 50), so subjects off to the side fall out of shot; check a set's camera isn't inside a building of the plan; big
faces near the camera can paint over small things behind them (give the big one a positive `zBias`); `glowsFront`
draw over everything, so far city lights behind a foreground subject go in `glowsBehind`.

### Camping episodes (EP 04–08)

`whatif-flood` (flash flood at a river camp), `whatif-balete` (folklore: the kapre), `whatif-summit` (typhoon on a
2,900 m summit), `whatif-lost` (lost after dark), `whatif-lightning` (hilltop strike). Each has its own HUD (river level,
heart rate, wind/temp/feels-like, phone battery, flash-to-bang). Built on two more kit files:

- `camp.ts`: cached height-field terrain (`ground`, culled to the camera), `water` that rises over it, `forest`,
  `grass`, dome tents, campfire, lantern, hikers with packs and headlamps (`camper`; call `setView(cam)` each frame so
  lamps facing away don't glow through heads), shared poses (`SIT_LOG`, `CROUCH`, `HUDDLE`, `stride`), rain, bolts,
  cloud masses, a smoke `wisp`, and env presets.
- `campsound.ts`: thunder, river, flood roar, fire, whistle, heartbeat, static buzz, tent flapping, footsteps.

Gotchas: looking along +z, screen right is −x. Keep trees out of camera spots with a `CLEARINGS` list. Keep cameras
≥ 3 m from headlamps and phones. Night scenes need `ambient` around [60–90] or the low-poly reads as black. Review with
`<app>-contact` tiled `10x3` from every other frame.

## Ocean films (`ocean-bluewhale`)

A 2:56 relaxing film, "The Life of a Blue Whale": birth, milk, migration, krill, orcas, growing up, song, courtship, a calf.
No voice, no HUD of any kind, no story gimmick and no closing question (the user rejected all of those). Long shots that
melt into each other (`layers(t)` in `timeline.ts`), a few soft lines of words, a real-instrument score (`reel-score`
skill). Its own `Reel.tsx`, not `WhatIfReel`. `src/kit/lowpoly/ocean.ts` has `whale` (jaw, throat, tail, flippers),
`orca`, `diver`, `krill`, `school`, `jelly`, `clouds`, `seaGrid` (sea from above), `surfaceBelow`, `seaTop`, `shafts`,
`specks`, `bubbles`, `bus`, `boat`, `mouthCave`. Pass the whale `light: t` for sunlight rippling over its back. Shot lengths live
in `LENGTHS` (timeline.ts) and the score's chords in `CHORDS` per shot, so a shot can be added or resized in one place.
At the surface use `surfacing` (sim.ts): the back clipped at the waterline, the rest seen faintly through the water; only
the top ~0.4 m of an adult's back should break the surface. Quick review: render `ocean-bluewhale-look` (one still per shot).
Run vitest from PowerShell: under Git Bash the drive-letter case splits vitest into two copies and every suite fails.
Pass the whale `eye: cam.pos` when its mouth is open (the jaw is one skin thick, and the far side paints through). In
9:16 a whole whale only fits turned well away from side-on (heading about 0.3 across to 0.9 in depth, 25 m or more off).
`export` re-levels the sound and undoes the
small encode: mux `out/music.wav` at +2 dB with `alimiter=limit=0.8:level=false` (its default `level` adds ~2 dB of make-up) and CRF 24 instead.

## Looks: paper, box, dots (`src/kit/looks`, demo in `apps/looks`)

Three designs other than low-poly, drawn from code. Each is a `Painter` (`(canvas, seconds) => frame`), so looks can share
a film (`Film.tsx`: scenes that cut or melt, words, no HUD) or one frame (`dotsOver` inside a paper stage).

| Look | Make it with | Good for |
|---|---|---|
| Paper-cut lightbox | `paperLook(stage)`: sheets back to front (`z` 5 far … 1 frame), cut with `paper/cuts.ts` | folklore, history, animal lives |
| World in a box | `boxLook(world)`: `box/things.ts` standing on a slab; the shader is written from the list | "what's inside", disasters in miniature, loops |
| Points of light | `dotsLook(scene)`: groups of points that fly from shape to shape (`dots/forms.ts`) | space, ocean, the body, transformations |
| Paper and light | a paper stage with a `live` layer that calls `dotsOver(scene)` | a paper world, with the supernatural made of light |

New film: copy the nearest scene in `apps/looks/scenes.ts`, make a `Film`, render `<LookFilm film={film} />` from a
composition in `Root.tsx`, and set `gl: "swangle"` in its config if it uses the box. `music: true` plays `out/music.wav`.
Any low-poly model becomes dots with `fromTris(tris)`. See what exists: the `looks-parts-contact` composition. Quick
review: `npx remotion render src/index.ts looks-<paper|box|dots|mix>-contact <dir> --sequence --public-dir apps/looks --gl=swangle`.

- **Paper:** frame coordinates, y down, cut `EDGE` px past the frame. Leave gaps in the crown for the moon: a silhouette
  against it is the thumbnail. Puppets are `parts` on brads (`traveller`). Bring creatures in by moving the sheet, not fading.
- **Box:** units are the slab (4.2 across), y up. A thing's `bound` ball must hold it in every pose, or rays skip it and
  leave holes. A thing's `turn` takes +x towards +z; `held()` finds its lantern. Distances that bend space need scaling
  down (`d * 0.7`). Lamps must stay the same number. It runs on the CPU, about 2 s a frame at `quality` 0.6.
- **Dots:** about 90,000 points. Dot files are big (4× paper): export at CRF 25. For `dotsOver`, darken what's behind first
  (`rgba(9,5,22,0.9)`), or a bright moon washes the light out.
- **Dots, living and psychedelic:** a sampler can carry a `life` (`living()` in forms.ts) that moves and colours its points
  with time; `dots/ideas.ts` has people (`MEDITATOR`, `STANDING`), ship, river, sea, butterfly, eye, tunnel, net, galaxy,
  mandala. `trip` (trip.ts) lays zoom echoes, a kaleidoscope and a colour split over the picture; `vivid: 0.8` keeps colours
  pure where points pile up. Let the kaleidoscope's `mix` reach 0 before changing its `sides`, or it pops. Keep it slow: no flashing.
- **People in dots:** `dots/lives.ts` has more poses (`SEATED`, `CURLED`, `UPPER`), `tableau(pieces)` to stand several
  shapes together (each with its own place, turn, colour; never nest one), `stream` (light between two hearts), `wall`,
  `saltGlass`, boat, net, crown, gown, helmet, rifle, `busWindow`, `water`, `circling` figures and the `egg` (metals, cracks).
  A shape's `life` gets the raw time: don't drift a hue by `t` where its colour has to mean something.
- **Narration helpers:** `src/kit/music/narration.ts` (voice into the mix, music leaning back under it) and
  `src/kit/looks/narration.ts` (captions from the line lengths).
- **Creative, never generic (the user's rule for every film).** A lone figure standing in the middle of black, rainbow
  gradients, empty frames and literal props were rejected as "too generic". Each shot needs one visual idea that carries the
  line's meaning: a world drawn inside a head, a face dissolving into the current, two profiles whose gap is a vessel of
  light (Rubin's vase), an egg engraved like gold leaf. Fill the frame, give each part its own palette and treatment, and
  mock stills of two or three directions before rendering anything long.
- **Glow** (`src/kit/looks/glow.ts`): points of light that add up in one buffer (`Light`). `dot`, `stream` (dots carried
  by a curl-noise current, coloured along `Stops`), `along` (dots laid on a line like engraving), `draw` (light covers the
  ground under it, so gold on blue stays gold). Shapes: `headAt` (a head in profile, mirrorable), `egg`, `crackLine`,
  `maskOf`/`seeds` (fill or edge any outline), `shard` (stained-glass cells and their seams). Palettes `EMBER`,
  `SEA_GLASS`, `GOLD`, `COLD`, `WARM`. See `cosmic-egg-mix` (points of light, one treatment per part) and
  `cosmic-egg-mocks` (the same ideas as gold engraving, smoke and stained glass). For films: `Light.frame(t)` reuses one
  buffer and streams flow with t; `Form` + `Place` put a head or egg anywhere (worked out once, `glass()` gives its
  shards, mirrored people share them); inside a frame use `chance(i)`, never rng, or points jitter. About 1.5 s a frame.
- **The Cosmic Egg** (`apps/cosmic-egg`, 5:00): the picture is `shots.ts`, one glow painter per line, melting into
  each other (render about an hour). Voice → `npx tsx apps/cosmic-egg/layout.ts` (times every line from the
  voice and writes `layout.gen.ts`; parts on bar lines) → music → render. Don't render while music.wav is being written.
- **Transitions in dots:** the user rejected bursts between scenes ("i dont like the explosion transition"). Use
  `flowStep` (blast.ts: points drift on soft curves, both shapes on screen for a few seconds) with `match: true` on the
  group (scene.ts: each shape's points are ordered along a Hilbert curve, so a point goes to the same part of the next
  shape and the old shape visibly reshapes into the new one). Without `match`, the halfway frame is a shapeless cloud.
- **Voice line ids must differ by more than case.** On Windows `a1.wav` and `A1.wav` are one file: the later line
  silently overwrote the earlier one's recording in `middle`. The voice step now refuses such ids. Kokoro leaves ~0.28 s of
  silence before each line; `voice.json` records it as `lead`, and captions should start after it.
- **`middle`** ("The Middle of Everything", 2:00, 13 scenes): `timeline.ts` (script) → voice → `npx tsx apps/middle/layout.ts`
  → music → render → mux by hand at CRF 29 → copy `post.md`. It loops (`loop.test.ts`). Review stills: `middle-review`.
- **Narrated dots film:** `apps/strangers` ("Made of Strangers", 2:00, one crowd of points through 12 shapes). Its
  `music.ts` bakes the voice, score and ducking into `music.wav`: run voice → music → render, then mux by hand as for the whale.

- **`underneath`** ("The Forest Underneath", ~2:03, 11 scenes, fungal networks): built on `middle`'s structure, with
  `shapes/grow.ts` (branching twigs with growth timing: threads, roots, trees, arbuscules). The length comes from the
  voice (`LAYOUT.total`, at least 120 s). voice → `npx tsx apps/underneath/layout.ts` → music → render → mux by hand →
  copy `post.md`. Mocks: `underneath-mocks`; merges: `underneath-review`. Kokoro says "fungi" as "fung-ee": lines mark
  it `[fungi](/fˈʌŋɡaɪ/)`.

## Documentaries (`src/kit/doc`, first film `apps/pinatubo`)

Research first, LEMMiNO-style: real photos and footage, quiet graphics (maps and diagrams) for what no camera
caught, Kokoro narration, captions. Landscape works: file names follow the frame (`pinatubo-16x9.mp4`).

**The method (story angles first, picture treatments, voice, cue sheets, common mistakes) is the `reel-documentary`
skill (`.claude/skills/reel-documentary/SKILL.md`): follow it for every documentary.** Below are the kit details.

Pipeline: research → `facts.ts` → `script.ts` → `media.ts` → `npm run fetch -- <app>` → `voice` →
`npx tsx apps/<app>/layout.ts` → `music` → `render` → `export` (`encode: "doc"` re-encodes at CRF 24, `-tune film`).
Review with `<app>-look` (one still per shot).

- **Facts** (`facts.ts` in the kit): every voice line and on-screen text names fact ids; every fact names a source.
  The app's test runs `checkFacts` and checks every number in a caption is in its facts. Captions carry digits,
  voice `text` spells them.
- **Media** (`media.ts`): each item has its licence, credit and `rights: "free" | "fair-use"`. Fair use needs a reason;
  fair-use video ≤ 5 s and muted; fair-use audio is refused. `fetch` resolves Commons file pages through the API,
  trusts the URL's extension when a server says `octet-stream`, refuses HTML, retries 429s, skips files it already has,
  and writes `out/media.json` and `out/credits.md`. Look at every picture before using it (tile a contact sheet).
  Wikimedia rate-limits bursts hard (one 429 asked for 600 s).
- **Components**: `Still` (slow push-in, archival grade), `Print` (photos too small to fill 1080p, ≤ 2×), `Clip`
  (plays the media entry's `use`; DocFilm puts every shot in its own Sequence), `MapCard` (pins, evacuation circles in
  km, a drawn track with a moving typhoon `storm` mark, a spreading ash `plume`; pass finer `rings` for a close view),
  `HeightChart` (to-scale altitude: the mountain a sliver, a column rising past marked heights, a counter), `DateLine`,
  `DocCaptions`, `Title` (with a `note`: "Sources in the description"), `DocFilm`. Call `loadDocFonts()` inside the
  component (DocFilm does): fonts loaded in calculateMetadata don't reach render tabs. In `-look` stills each shot is
  `Freeze`d at its own moment (a Sequence would never reach it in a 15-frame composition).
- **No low-poly in documentaries.** The user found the low-poly reconstructions "too cartoonish" for this kind of
  video. Show what no camera caught with doc graphics instead (maps, diagrams, treated real photos).
- **Timing** (`timing.ts`): a film is beats (lines told over shots); `layOut` stretches shots to the voice, catches
  broken beats, and fails past a generous ceiling (length is a guide: see above). `staleLines` makes `music.ts` refuse
  when the voice was re-recorded without re-running `layout.ts`. Kokoro reads about 2.2 words a second at speed 1.
- **Voice with feeling (Kokoro).** No emotion setting, so: a speed per line (≈0.82 for the dead, ≈1.08 for urgency),
  `…` and `—` for pauses, short lines on their own ("Hundreds died."). Pick the voice by measuring, not guessing:
  record the script in a few voices (`voice --voice x`) and compare the pitch spread within lines (autocorrelation F0,
  semitones; flatter = stiffer). On Pinatubo: bm_fable 6.7, af_heart 6.2, am_fenrir 5.7, bm_george 4.8, am_michael
  3.9. Compress the narration (−22 dBFS, 3:1) and master at −18 LUFS: speech peaks need the headroom, and export
  brings the file to −14.
- **Music: a cue sheet, not one track.** Cut several royalty-free cues to the story's acts (a drone for the calm, a
  climbing pulse for the warning, a climax on the impact after a beat of silence, mournful for the aftermath, a lift
  for the resolution). Level each cue by loudness but cap it by its own peaks (a climax's drums otherwise make the
  limiter flatten the impact), cross them over ~1.2 s, cut hard on the impact, and pull the music almost to nothing
  under the saddest line. FreePD has closed; Incompetech (Kevin MacLeod, CC BY 4.0, credit every track) serves direct
  mp3s. Effects are drawn in code (`music/sfx`, `whatif/campsound`).

## Ozone, 1996 (`apps/ozone`): a long-form documentary made in parts

TrageDiaries-inspired, ~25 min, 16:9, on the Ozone Disco fire (Quezon City, 18 March 1996). The user asked to build it
part by part and join at the end. **`apps/ozone/PROGRESS.md` is the working log: read it first, update it whenever a part
changes state, a decision is made or a source turns up** (the user wants any new session to be able to continue). `parts.ts` holds the order (`ORDER`); each part is a folder `parts/<id>/` with
`script.ts` (lines with `hold` and `sources`), `layout.gen.ts`, `shots.tsx`, `music.ts`. Steps:
`npx tsx apps/ozone/part.ts <id> voice layout music render` (or `all`; `layout --estimate` before any voice), then
`npx tsx apps/ozone/join.ts` (concat, CRF 24 `-tune film`, −14 LUFS) → `out/ozone-16x9.mp4`. Add a part: its folder,
`ORDER`, and `films.ts`. Line ids are unique across the film.

- **Look:** a white clay 3D reconstruction (`recon/scene.ts`, three.js, `--gl angle`; people are plain grey figures in
  three poses, never faces; fire as light and smoke, not drawn flames), the drawn plan with every door's swing in red
  (`Boards.tsx`), and the record (2008 PD photo, OSM street map, court quotes as quotations, never facsimiles).
  `ozone-boards` renders one still per look.
- **Layout** (`plan.ts`) is built only from what sources say, each line commented with its source; what no source
  describes is hatched "no record". The 3D model and the plan both read it.
- **Sound** (`sound.ts`): the club's own 90s house track (written in code), muffled through walls outside, dying with
  the power (`powerDown`); cello/piano on VSCO samples; narration compressed and peak-limited per line.
- **Windows:** `PartFilm.tsx` not `Part.tsx` (it would clash with `part.ts`).

## kop.it specifics

- Runs kop.it from `../kopit` with wrangler, all state in `.state/kopit` (`--persist-to`), port 8790. Never edits kopit.
- `npm run seed -- kopit` rebuilds the demo household (Maya and Leo, months of spending from the 1st, four months
  back) and has the real Workers AI write yesterday's note (needs `wrangler login`; no `--local`, which would turn the
  remote AI binding off). `--note` re-rolls only the note. The seed is tied to the day it ran: seed again on a new day.
- Notes that have no tip, run long, or mention vices are rejected; two rejections store the hand-written sample.
  `requireRealNote: true` in the config makes render fail instead.
- The end card's URL is a placeholder (`kop.it`) until the real public address is known.
