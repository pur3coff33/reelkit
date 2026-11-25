// npx tsx apps/cosmic-egg/layout.ts: times the film from how long each line took to say (out/voice.json) and writes
// layout.gen.ts. Every part starts on a bar line (4 s); between parts there's time for the picture to change; the spare
// time to make five minutes goes where the film most needs room to breathe.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appDir, outDir } from "../../src/kit/paths";
import { PART_NAMES, SCRIPT, SECONDS, type PartName } from "./timeline";

const said = JSON.parse(readFileSync(outDir("cosmic-egg", "voice.json"), "utf8")) as { lines: { id: string; seconds: number }[] };
const secs: Record<string, number> = Object.fromEntries(said.lines.map((l) => [l.id, +l.seconds.toFixed(2)]));

const BAR = 4, FIRST = 0.6, LEAD = 3, GAP = 0.85, TAIL = 1.6, END = 6;
/** Which parts get the spare bars first. */
const ROOM: PartName[] = ["lives", "egg", "salt", "kindness", "hatch", "open", "lives", "egg", "hook"];

const speech = (p: PartName) => SCRIPT[p].reduce((n, [id, , , pause = 0], i) => n + secs[id] + (i ? GAP + pause : 0), 0);
const lead = (i: number) => (i ? LEAD : FIRST);
const len = PART_NAMES.map((p, i) => Math.ceil((lead(i) + speech(p) + TAIL + (i === PART_NAMES.length - 1 ? END : 0)) / BAR) * BAR);
let spare = SECONDS - len.reduce((a, b) => a + b, 0);
if (spare < 0) throw new Error(`the script runs ${-spare} s over ${SECONDS} s`);
for (let k = 0; spare >= BAR; k++) {
  len[PART_NAMES.indexOf(ROOM[k % ROOM.length])] += BAR;
  spare -= BAR;
}
len[len.length - 1] += spare;

const parts: Record<string, { from: number; to: number }> = {}, beats: Record<string, number> = {};
let from = 0;
PART_NAMES.forEach((p, i) => {
  const lines = SCRIPT[p], room = len[i] - lead(i) - speech(p) - TAIL - (i === PART_NAMES.length - 1 ? END : 0);
  // The room left over: some before the first line, the rest shared between the gaps.
  const before = lead(i) + (i ? room * 0.25 : 0), gap = lines.length > 1 ? (room * (i ? 0.75 : 1)) / (lines.length - 1) : 0;
  let t = from + before;
  lines.forEach(([id, , , pause = 0], j) => {
    if (j) t += GAP + pause + gap;
    beats[id] = +t.toFixed(2);
    t += secs[id];
  });
  parts[p] = { from, to: from + len[i] };
  console.log(`${p.padEnd(9)} ${String(from).padStart(3)}–${String(from + len[i]).padStart(3)} s, ${lines.length} lines, ${room.toFixed(1)} s to spare`);
  from += len[i];
});

writeFileSync(
  join(appDir("cosmic-egg"), "layout.gen.ts"),
  `// Written by layout.ts from out/voice.json: don't edit.\nexport const LAYOUT: { parts: Record<string, { from: number; to: number }>; beats: Record<string, number>; seconds: Record<string, number> } = ${JSON.stringify({ parts, beats, seconds: secs }, null, 1)};\n`,
);
