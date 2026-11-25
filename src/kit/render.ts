// Rendering an app's reel with the Remotion CLI, with the app folder as the public dir. Also opens Remotion Studio.
import { existsSync, readFileSync } from "node:fs";
import type { ReelConfig } from "./config";
import { appDir, outDir, ROOT } from "./paths";
import { run } from "./proc";

/** Stops a render that would mark the AI note as a sample, when the app asks for that. */
function checkNote(config: ReelConfig) {
  const file = outDir(config.app, "note.json");
  if (!existsSync(file)) return;
  const { real } = JSON.parse(readFileSync(file, "utf8")) as { real?: boolean };
  if (real === false) {
    if (config.requireRealNote) throw new Error("the AI note is the hand-written sample and requireRealNote is on: re-run the seed");
    console.warn("  ⚠ the AI note is the hand-written SAMPLE; the reel marks it as one");
  }
}

export async function render(config: ReelConfig) {
  checkNote(config);
  const out = outDir(config.app, `${config.app}-9x16-raw.mp4`);
  await run(
    "npx",
    // Its own port, so a render works while Studio has 3000.
    ["remotion", "render", "src/index.ts", config.app, out, "--public-dir", appDir(config.app), "--port", "3123", "--codec", "h264", "--crf", "16", "--audio-bitrate", "320k", ...(config.gl ? ["--gl", config.gl] : [])],
    { cwd: ROOT },
  );
  console.log(`  rendered ${out}`);
}

export async function studio(config: ReelConfig) {
  await run("npx", ["remotion", "studio", "src/index.ts", "--public-dir", appDir(config.app), ...(config.gl ? ["--gl", config.gl] : [])], { cwd: ROOT });
}
