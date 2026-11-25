---
name: reel-score
description: Compose, mix and check music for a reelkit video with real instrument samples (src/kit/music/studio.ts). Use when a reel needs a score, background music, a relaxing, ambient or cinematic track, or when asked to make existing reel music better, warmer, calmer, longer or timed to the picture.
---

# reel-score

Write music as code on real instruments, mix it in stems, and check it by measurement, because you can't hear it. New
scores use `src/kit/music/studio.ts` (the session) and `src/kit/music/sampler.ts` (VSCO 2 CE instruments, CC0). Keep
`synth.ts` for sound effects; don't build melodies or pads from its oscillators. Worked example:
`apps/ocean-bluewhale/score.ts`.

## 1. Settle the brief

Use, exact length, mood. Turn a mood or a reference into traits: tempo, harmony, instruments, tone, space. Defaults:
original piece, −16 LUFS master (export brings it to −14), no voice-over. Never recreate an existing tune, riff or
arrangement; chord progressions and styles are free to use.

## 2. Form before notes

- Lay out bars against the story first. At 60 BPM a beat is a second and a 4-beat bar is 4 s, so turns land on bar lines.
- Each section adds or takes away something. Size comes from layers and register, not from volume.
- One short theme: mostly steps, one leap, long notes on strong beats. Bring it back changed (other instrument, barer,
  higher) rather than writing a second one.
- For a looping video, end on a chord that leads to the first bar (a sus4 on the fifth).

## 3. Relaxing and ambient recipe

| Choice | Value |
|---|---|
| Tempo | 56–66 BPM, no drums |
| Harmony | add9, maj9, m9, 9sus4; move by `voice(chord, lo, hi, n, prev)` so nothing leaps; borrow tension from bare texture, not dissonance |
| Front | soft upright (pp/mf), pedalled: let each note ring 2–3 s past its length |
| Motion | harp broken chords, slow; rest them for whole sections |
| Bed | cellos and violas, attack 1–1.6 s, release 2+ s, `swell` 0.25–0.4; stagger entries so chords open |
| Sky | high violins or flute only where the picture opens |
| Bottom | contrabass, `warmth` ~0.5: pure low sines vanish on phones, harmonics survive |
| Tone | roll each stem off (`high`): strings 3–4 kHz, piano ~5 kHz |
| Space | one hall, 4–5.5 s; nearer instruments get a longer `gap` and less `mix` |

## 4. Make it played, not sequenced

- `loose` on every stem: strings ±0.12 s, piano ±0.03 s, velocity ±5–12 %.
- `ride` every sustained stem: a flat dynamic is the main reason sampled strings sound fake.
- Vary velocity inside a phrase: lean into the long and high notes.
- Section samples for section parts, solo samples for solo lines. Stay inside each instrument's real range.
- Before using a new sample folder, measure its pitch (autocorrelate each file against its name). Several VSCO folders
  are named an octave low (`NAMED_AN_OCTAVE_LOW`); the harp is off by up to 25 cents (`HARP_CENTS`).

## 5. Mix

Set each stem by measured loudness (`lufs` in its spec), lead loudest: piano −20, strings −22 to −27, harp and flute
about −25, bass −25, texture −40 or lower. `master()` keeps the low end mono and narrows the sides.

## 6. Check every render

1. `tsx` the score: the log gives loudness bar by bar. Is the shape the one you wrote? Quiet parts 4–6 LU under loud ones
   suit a calm score.
2. ffmpeg `ebur128=peak=true`: target ±0.5 LU, true peak ≤ −1.5 dB. The limiter should take under 3 dB (a calm score, ~0).
3. Clicks: second difference far above its running average. Near-silent half seconds that weren't written.
4. Left/right correlation 0.3–0.8, balance within 1.5 dB; folded to mono it should lose no more than ~2 dB.
5. Spectrogram (`showspectrumpic`): sections start where written, a clean end.
6. Tell the person it was checked by measurement, not by ear, give them an MP3, and offer 2–3 concrete changes.

## Sources

Adapted from the `compose` skill in `ninadkale98/sound-studio` (MIT, commit 218bc55), copied unchanged in `references/`.
It drives FluidSynth and SoX, which this repo doesn't use: read it for genre recipes and method, don't run its setup.
Layering, staggered entries, the flat-dynamics warning and the phone-bass rule are from `mc-style-cinematic` and
`mc-sound-design` in `jtydhr88/music-composition-skills` (MIT, commit e283141).
