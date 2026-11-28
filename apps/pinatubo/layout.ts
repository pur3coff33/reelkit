// npx tsx apps/pinatubo/layout.ts [--estimate]: times the film from how long each line took to say (out/voice.json) and
// writes layout.gen.ts. --estimate guesses from word counts, for before the voice exists.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appDir, outDir } from "../../src/kit/paths";
import { LINES } from "./script";
import { BEATS } from "./shots";
import { layOut } from "../../src/kit/doc/timing";

const estimate = process.argv.includes("--estimate");
type Made = { id: string; seconds: number; lead: number };
const made: Made[] = estimate
  ? LINES.map((l) => ({ id: l.id, seconds: 0.3 + l.text.split(/\s+/).length / 2.5, lead: 0.28 }))
  : (JSON.parse(readFileSync(outDir("pinatubo", "voice.json"), "utf8")) as { lines: Made[] }).lines;
const spoken = Object.fromEntries(made.map((l) => [l.id, +l.seconds.toFixed(3)]));
const lead = Object.fromEntries(made.map((l) => [l.id, +l.lead.toFixed(3)]));

// About a minute was asked for; that's a guide, not a limit (±20% is fine). 75 s only catches a runaway layout.
const { shots, lines, seconds } = layOut(BEATS, spoken, 75);
for (const s of shots) console.log(`${s.id.padEnd(10)} ${s.from.toFixed(2).padStart(6)}–${s.to.toFixed(2).padStart(6)} s  (${(s.to - s.from).toFixed(2)} s)`);
console.log(`total ${seconds.toFixed(2)} s`);
const round = (o: unknown) => JSON.parse(JSON.stringify(o, (_, v) => (typeof v === "number" ? +v.toFixed(3) : v)));
writeFileSync(
  join(appDir("pinatubo"), "layout.gen.ts"),
  `// Written by layout.ts${estimate ? " (estimated from word counts)" : " from out/voice.json"}: don't edit.\nimport type { Placed } from "../../src/kit/doc/film";\nexport const LAYOUT: { shots: Placed[]; lines: Record<string, number>; spoken: Record<string, number>; lead: Record<string, number>; seconds: number } = ${JSON.stringify(round({ shots, lines, spoken, lead, seconds }), null, 1)};\n`,
);
