---
name: reel-documentary
description: Use when making, planning or improving a documentary-style video in reelkit (LEMMiNO-like, research first, real photos or footage, narration), when the user names a real event, disaster, mystery or history topic to "document", or when a documentary's story, pictures, voice or music feels flat, generic, stiff or like a list of facts.
---

# reel-documentary

A documentary here is a **story told with evidence**: research first, then a story angle the user picks, then a script
where every claim is sourced, then real pictures treated creatively, quiet graphics for what no camera caught, a
narrator with feeling, and a score that follows the story. Worked example: `apps/pinatubo` (kit: `src/kit/doc`).
CLAUDE.md's Documentaries section has the API details; this skill is the method.

## The workflow

| # | Step | You make | Gate |
|---|---|---|---|
| 1 | Research | `facts.ts`: sources (primary first) and facts quoted from them, disagreements in `note` | read the sources yourself; never fill numbers from memory |
| 2 | **Story angles** | 2–3 pitches (template below) | **the user picks one** before any script |
| 3 | Script | `script.ts`: lines with `facts`, per-line `speed`, captions with digits | `checkFacts` + number test pass |
| 4 | Media | `media.ts` with rights; `npm run fetch -- <app>` | look at every picture (tile a contact sheet) |
| 5 | Shots | `shots.ts`: beats → shots, one visual idea per shot | `<app>-look` stills read |
| 6 | Voice | `npm run voice`, then `npx tsx apps/<app>/layout.ts` | lines fit; no rushing |
| 7 | Music | `music.ts`: cue sheet + effects + compressed voice | limiter ≤ 3 dB |
| 8 | Render | `render` → `export` (`encode: "doc"`) | −14 LUFS, frames tiled and read |
| 9 | Post | `post.md`: captions, products, what's real vs drawn, sources, credits | every CC BY credit pasted |

## Storytelling (the step that matters most)

A chronological list of dated facts is not a story ("June 9… June 12… June 15…" was rejected). Pitch each angle as:

- **Question**: what the viewer needs answered, stated in the first line. A hook, not a date.
- **Who we follow**: a person or small group with a decision to make (the scientists, a pilot, a family).
- **Stakes**: what happens if they're wrong, both ways ("too early and no one listens again; too late and thousands die").
- **The turn**: a false climax and/or a twist the research supports (the "big" eruption that wasn't; the typhoon the
  same day; the killer was wet ash on roofs, not the blast).
- **Human scale**: one thread at eye level (the 20,000 Aeta on the slopes; all but ~20 got out).
- **Ending that reframes**: changes how the start reads ("one mountain cooled the whole planet: in 1991 everyone on
  Earth felt Pinatubo"), not a summary.

Script rules: one number per beat (the picture carries the rest); every hook word sourced too; vary rhythm (a held
silence before the impact, quick through the escape, a long breath at the end). Length is a guide (±20%): give the
story the time it needs.

## Pictures

Treat every photo; a still that only sits there is a missed shot.

| Treatment | Status |
|---|---|
| Slow push/pan to the detail the line is about (`Still`) | built |
| Small photo as a print on dark (`Print`) | built, but plain: prefer the treatments below |
| **Depth parallax**: depth model (transformers.js is installed) splits fore/background, the camera drifts through | to build |
| **Photo pinned to the map** where it was taken; the camera flies in from the pin | to build |
| **Point at the evidence**: circle or box the detail (craters, a date stamp), zoom into it | to build |
| **Then and now**: two or three photos of the same place in a wipe or side by side | to build |
| **Documents**: the source page on screen, the quoted line highlighted as it's spoken | to build |
| **Real footage**: 1–2 short archival clips (NARA, Internet Archive, USGS), `Clip` plays the `use` | built |
| **Match cuts**: the photo's column becomes the diagram's column; map pin dissolves into its photo | to build |
| **Counters**: a number ticks up as it's said | to build |

Build a "to build" treatment into `src/kit/doc` the first time a film needs it, then update this table.

What no camera caught: **doc graphics, never low-poly** (rejected as "too cartoonish"). `MapCard` (zones in km, a
storm moving along its real track, a spreading plume), `HeightChart` (to scale, a counter riding the top). Label
anything drawn as illustrative in `post.md`.

## Voice

The user is happy with tuned Kokoro; don't push ElevenLabs. Feeling comes from: a speed per line (≈0.82 for the dead,
≈1.08 for urgency, ≈0.9 for weight), `…` and `—` for pauses, the hardest line alone ("Hundreds died."). Choose the voice
by measuring pitch spread within lines across a few voices (`voice --voice x`); bm_fable measured liveliest male.
Compress the narration (−22 dBFS, 3:1) in `music.ts`. English narration.

## Music and sound

A **cue sheet**, never one track looping: one royalty-free cue per act (drone for the calm, climbing pulse for the
warning, climax on the impact after a beat of silence, mournful for the aftermath, a lift for the resolution). Level
each by loudness capped by its peaks; cross over ~1.2 s, cut hard on the impact; pull the music almost to nothing under
the saddest line. Master at −18 LUFS (export makes −14). Credit every CC BY track. Effects: `music/sfx`,
`whatif/campsound` (or CC0 Freesound with a key).

## Common mistakes

| Mistake | Fix |
|---|---|
| Script written before an angle was chosen | Pitch angles, wait for the pick |
| Ten numbers in a minute | One per beat; cut the rest or show them |
| Squeezing voice/pauses/shots to hit "60 s" | Length is a guide; let the layout set it |
| Low-poly or cartoon reconstructions | Maps, diagrams, treated photos |
| One music track under everything | Cue sheet per act |
| Plain print-on-black for small photos | Parallax, pin to map, point at the detail |
| Credits listing media the film doesn't show | The app test: every credited item is used |
| Re-recorded voice without re-running layout | `staleLines` makes music refuse; run `layout.ts` |
| Picture found by keyword, never looked at | Contact sheet; the photo must show what the line says |
