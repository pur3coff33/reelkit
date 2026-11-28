// npx tsx apps/ozone/join.ts [--crf 24]: every rendered part in ORDER, joined into out/ozone-16x9.mp4 (re-encoded for
// photo/3D footage: x264 slow, -tune film, CRF 24; AAC 192k stereo; loudness brought to −14 LUFS, true peak −1.5 dB).
// A part that hasn't been rendered stops the join and says which.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import ffmpeg from "ffmpeg-static";
import { outDir } from "../../src/kit/paths";
import { ORDER } from "./parts";

const args = process.argv.slice(2);
const crf = args.includes("--crf") ? args[args.indexOf("--crf") + 1] : "24";
const files = ORDER.map((id) => outDir("ozone", "parts", `${id}.mp4`));
const missing = ORDER.filter((_, i) => !existsSync(files[i]));
if (missing.length) throw new Error(`not rendered yet: ${missing.join(", ")} (npx tsx apps/ozone/part.ts <id> render)`);

const out = outDir("ozone", "ozone-16x9.mp4");
const inputs = files.flatMap((f) => ["-i", f]);
const graph = `${files.map((_, i) => `[${i}:v][${i}:a]`).join("")}concat=n=${files.length}:v=1:a=1[v][a];[v]scale=in_range=full:out_range=tv,format=yuv420p[vo];[a]loudnorm=I=-14:TP=-1.5:LRA=11[an]`;
execFileSync(ffmpeg as unknown as string, [
  "-y", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-map", "[vo]", "-map", "[an]",
  "-c:v", "libx264", "-preset", "slow", "-tune", "film", "-crf", crf, "-color_range", "tv",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out,
], { stdio: "inherit" });
console.log(`joined ${ORDER.length} parts → ${out}`);
