# Handoff: Leave the Light On (porchlight): render on the new PC

- Written: 2026-11-26 05:19 | Reason: user request, moving to a PC with a better graphics card
- Project: reelkit repo (was `C:\Users\Anxiaive\Documents\devz\jon-devs\reelkit`) | Branch: main | Remote: github.com/pur3coff33/reelkit (public)
- Status: open

## Goal

A 2:00, 9:16, wordless "world in a box" film, `apps/porchlight` ("Leave the Light On"). A boy's dog runs off in a storm
and he never finds it; he leaves the gate light on all his life and, old, switches it off himself. The viewer sees what
he never does: the dog lived just over the hill with a girl, grew old loved, and at 1:24 lifts its head and wags when his
lamp comes on across the hill. The user's words: "i just want this video to be a closure or something to the pets they
lost". Done = `apps/porchlight/out/porchlight-9x16.mp4` plus `porchlight-9x16.md` (post notes), checked.

## State right now

- Done: story, look upgrade (lens/depth of field, bloom, grade, lamp shadows, rich ground, faces, ageing houses), score.
  Verified on the old PC: `npx tsc --noEmit -p .` clean; `npx vitest run apps/porchlight` 8/8 pass (run from PowerShell).
- Done: four comparison stills re-rendered and reviewed (0.3, 82.5, 87.5, 106 s, composition `porchlight-compare`).
- Done: music measured earlier (ebur128, phase, clicks, spectrogram all passed). Only comments in `music.ts` changed since.
- Not started: the full render. One attempt on the old PC (CPU only, about 14 s a frame, about 14 h) was stopped by the
  user at piece 1/24, to move to a PC with a modern graphics card.
- Not started: export, review of the finished video, re-encode to a sensible size.

## Next steps

1. New PC: install Node and git, `git clone https://github.com/pur3coff33/reelkit`, `npm install`.
2. `npm run music -- porchlight` (fetches the VSCO samples into `.state/samples`, writes `apps/porchlight/out/music.wav`,
   which is gitignored). Check it: `-af ebur128=peak=true` near −16 LUFS, true peak ≤ −1.5 dB.
3. Test the graphics card on stills first:
   `npx remotion render src/index.ts porchlight-compare .state/porchlight/compare/gpu --sequence --image-format=jpeg --gl=angle --public-dir apps/porchlight`
   Time it and look at the four frames. They should match the CPU ones (lamp glow, soft focus, faces). If `angle`
   fails or looks wrong, try `--gl=vulkan` or `--gl=egl`; `--gl=swangle` is the slow CPU fallback that is known to work.
4. Full render: `bash apps/porchlight/render.sh` (GL defaults to `angle`; `GL=swangle` or `CONC=4` to override). It
   renders 24 pieces into `.state/porchlight/parts/`, joins them, adds the music and runs `npm run export -- porchlight`,
   which copies `post.md` next to the video.
5. Review: frame sheets (`ffmpeg ... -vf "select=...,tile=6x2"`), length exactly 120 s, loudness.
6. Re-encode smaller per CLAUDE.md ("Keeping files small"): flat drawn graphics, so `-tune animation -crf 24`,
   stereo AAC with music. Mind the full-range note (`scale=in_range=full:out_range=tv`). Offer the user sizes.

## Uncommitted work

None after the handoff commit. That commit holds the look upgrade (`src/kit/looks/box/world.ts`, `things.ts`), the
no-grave rewrite (`apps/porchlight/story.ts`, `props.ts`, `music.ts`, `Reel.tsx`, `post.md`), `src/Root.tsx`
(porchlight-compare composition), `apps/porchlight/render.sh` and this file.

## Decisions and constraints

- **No death, no grave.** The user objected strongly ("no should be lost no dying pls"). The dog stays alive, never
  found by him; the viewer sees it safe. `grave()` is still defined in `props.ts` but unused.
- The user liked the art style; the look changes 1–6 and 8 were approved via a before/after page. Not built: 7 (clouds
  and sun), 9 (smoother edges), 10 (handmade textures).
- No voice, no words except the title card (117.9–120.6 s). No HUDs or badges of any kind.
- Commit and push only when the user asks. Commits use the GitHub no-reply address, never the user's real email.
- Ask the user which file size they want for the final encode (see CLAUDE.md).

## Learned the hard way

- Run vitest from PowerShell, not Git Bash (drive-letter case splits vitest and every suite fails).
- On CPU, concurrency 4 timed out; use `--concurrency=2 --timeout=240000`.
- `cull: true` (world.ts) gave no measurable speedup on CPU; untested on a GPU.
- Python one-off edit scripts in a bash heredoc broke on long strings; write them to a file and run them.
- The bundle in `.state/porchlight/bundle` goes stale after any code change: delete it before rendering.

## Open questions for the user

- Final file size / quality for the encode (ask when the render is done).

## Resume prompt

"Read apps/porchlight/HANDOFF.md in this repo and continue from Next steps."
