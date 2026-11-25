// ffmpeg comes from the ffmpeg-static package, so nothing needs installing on the machine.
import { createRequire } from "node:module";
import { run } from "./proc";

const ffmpegPath: string = createRequire(import.meta.url)("ffmpeg-static");

export function ffmpeg(args: string[], quiet = true) {
  return run(ffmpegPath, ["-hide_banner", "-y", ...args], { quiet });
}

/** A media file's length in seconds, read from ffmpeg's own report (ffmpeg-static ships no ffprobe). */
export async function duration(file: string): Promise<number> {
  const out = await run(ffmpegPath, ["-hide_banner", "-i", file, "-f", "null", "-"], { quiet: true });
  const all = [...out.matchAll(/time=(\d+):(\d+):([\d.]+)/g)];
  const m = all.at(-1);
  if (!m) throw new Error(`no duration for ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
