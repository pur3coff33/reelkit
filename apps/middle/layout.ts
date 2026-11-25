// npx tsx apps/middle/layout.ts [--estimate]: times the film from how long each line took to say (out/voice.json) and
// writes layout.gen.ts. --estimate guesses from word counts, for before the voice exists.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appDir, outDir } from "../../src/kit/paths";
import { SCENES, layOut } from "./timeline";

const estimate = process.argv.includes("--estimate");
const secs: Record<string, number> = estimate
  ? Object.fromEntries(SCENES.flatMap((s) => s.lines.map(([id, text]) => [id, +(0.4 + text.split(/\s+/).length / 2.3).toFixed(2)])))
  : Object.fromEntries((JSON.parse(readFileSync(outDir("middle", "voice.json"), "utf8")) as { lines: { id: string; seconds: number }[] }).lines.map((l) => [l.id, +l.seconds.toFixed(2)]));

const { scenes, beats } = layOut(secs);
for (const s of SCENES) {
  const p = scenes[s.name];
  console.log(`${s.name.padEnd(11)} ${p.from.toFixed(1).padStart(6)}–${p.to.toFixed(1).padStart(6)} s  (${(p.to - p.from).toFixed(1)} s)`);
}
const round = <T extends Record<string, unknown>>(o: T): T => JSON.parse(JSON.stringify(o, (_, v) => (typeof v === "number" ? +v.toFixed(3) : v)));
writeFileSync(
  join(appDir("middle"), "layout.gen.ts"),
  `// Written by layout.ts${estimate ? " (estimated from word counts)" : " from out/voice.json"}: don't edit.\nexport const LAYOUT: { scenes: Record<string, { from: number; to: number }>; beats: Record<string, number>; seconds: Record<string, number> } = ${JSON.stringify(round({ scenes, beats, seconds: secs }), null, 1)};\n`,
);
