// Run after capture (npx tsx apps/leadsales/sync.ts). The screencast falls behind as a long take goes on, so a line's
// start time from the clock doesn't match the footage. Each line flipped a marker in the page's corner: this finds
// those flips in the clip and rewrites each cue's time to the frame where it really appears.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";
import { outDir } from "../../src/kit/paths";
import type { Cue } from "./app";
import { config } from "./reel.config";

const CROP = 8;
const LOOK_WHITE = 128;

const file = outDir(config.app, "capture.json");
const capture = JSON.parse(readFileSync(file, "utf8")) as { clips: Record<string, number>; kept: { cues: Cue[] } };
const { cues } = capture.kept;

const read = spawnSync(
  ffmpegPath as unknown as string,
  ["-v", "error", "-i", outDir(config.app, "clips/tour.mp4"), "-vf", `crop=${CROP}:${CROP}:0:0,scale=1:1:flags=area,format=gray`, "-f", "rawvideo", "-"],
  { maxBuffer: 1024 * 1024 * 64 },
);
if (read.status !== 0) throw new Error(`ffmpeg failed: ${read.stderr}`);
const levels = read.stdout as Buffer;

// The marker starts black and flips on each line, so the nth change is the nth cue.
const flips: number[] = [];
let white = false;
levels.forEach((level, frame) => {
  const nowWhite = level >= LOOK_WHITE;
  if (nowWhite !== white) flips.push(frame);
  white = nowWhite;
});
if (flips.length !== cues.length) throw new Error(`found ${flips.length} marker flips for ${cues.length} cues`);

cues.forEach((cue, i) => {
  const t = flips[i] / config.fps;
  console.log(`  ${cue.id}: clock ${cue.t.toFixed(2)}s, footage ${t.toFixed(2)}s (${(t - cue.t).toFixed(2)}s behind)`);
  cue.t = t;
});
writeFileSync(file, JSON.stringify(capture, null, 2));
