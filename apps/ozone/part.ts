// npx tsx apps/ozone/part.ts <id> <step…> [--voice <name>] [--estimate]
//   voice     Kokoro reads the part's lines → out/parts/<id>/voice/ (--voice x: another voice, to compare)
//   layout    times the part from the voice → parts/<id>/layout.gen.ts (--estimate: from word counts, before any voice)
//   music     the part's sound → out/parts/<id>/music.wav (OZONE_SCORE_ONLY=1: without the narration, to music-score.wav)
//   render    the composition ozone-part-<id> → out/parts/<id>.mp4
//   all       voice, layout, music, render
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { voice } from "../../src/kit/voice/kokoro";
import { appDir, ensureOut, outDir } from "../../src/kit/paths";
import { ORDER, type PartId, type PartScript, layOutPart, lineIdClashes } from "./parts";
import { config } from "./reel.config";

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const id = args[0] as PartId;
if (!ORDER.includes(id)) throw new Error(`unknown part "${id}": parts are ${ORDER.join(", ")} (add new ones to ORDER in parts.ts)`);
let steps = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--voice"));
if (steps.includes("all")) steps = ["voice", "layout", "music", "render"];
const dir = join(appDir("ozone"), "parts", id);
const load = async <T>(file: string): Promise<T> => import(pathToFileURL(join(dir, file)).href);

const scripts = await Promise.all(ORDER.map(async (p) => (await import(pathToFileURL(join(appDir("ozone"), "parts", p, "script.ts")).href)).SCRIPT as PartScript));
const clash = lineIdClashes(scripts);
if (clash.length) throw new Error(`line ids used twice: ${clash.join(", ")}`);
const { SCRIPT } = await load<{ SCRIPT: PartScript }>("script.ts");

for (const step of steps) {
  console.log(`▶ ${id}: ${step}`);
  if (step === "voice") {
    const lines = SCRIPT.lines.map(({ hold: _h, sources: _s, ...l }) => ({ ...l, beat: 0 }));
    await voice({ ...config, voice: { ...config.voice, lines } }, flag("--voice"), `parts/${id}`);
  } else if (step === "layout") {
    const estimate = args.includes("--estimate");
    const made = estimate
      ? SCRIPT.lines.map((l) => ({ id: l.id, seconds: 0.3 + l.text.replace(/\(\/[^/]+\/\)/g, "").split(/\s+/).length / (2.3 * (l.speed ?? 1)), lead: 0.28 }))
      : (JSON.parse(readFileSync(outDir("ozone", "parts", id, "voice.json"), "utf8")) as { lines: { id: string; seconds: number; lead: number }[] }).lines;
    const layout = layOutPart(SCRIPT, made);
    for (const l of SCRIPT.lines) console.log(`  ${l.id.padEnd(4)} ${layout.lines[l.id].toFixed(2).padStart(6)} s  (${layout.spoken[l.id].toFixed(2)} s said)`);
    console.log(`  total ${layout.seconds.toFixed(2)} s`);
    writeFileSync(
      join(dir, "layout.gen.ts"),
      `// Written by part.ts ${id} layout${estimate ? " --estimate (from word counts)" : " from out/parts/" + id + "/voice.json"}: don't edit.\nimport type { Layout } from "../../parts";\nexport const LAYOUT: Layout = ${JSON.stringify(layout, null, 1)};\n`,
    );
  } else if (step === "music") {
    ensureOut("ozone", "parts", id);
    const file = outDir("ozone", "parts", id, process.env.OZONE_SCORE_ONLY ? "music-score.wav" : "music.wav");
    await (await load<{ writeMusic: (f: string) => Promise<void> }>("music.ts")).writeMusic(file);
  } else if (step === "render") {
    const out = outDir("ozone", "parts", `${id}.mp4`);
    execFileSync("npx", ["remotion", "render", "src/index.ts", `ozone-part-${id}`, out, "--public-dir", appDir("ozone"), "--gl", "angle", "--concurrency", "3", "--codec", "h264", "--crf", "16", "--audio-bitrate", "320k"], { stdio: "inherit", shell: true });
  } else throw new Error(`unknown step "${step}"`);
}
