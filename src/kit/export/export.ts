// The finished file: exactly the reel's length, loudness brought to about −14 LUFS (where Reels, TikTok and Shorts play
// things) with a limiter so no peak clips, video copied as is.
// With --extras, also a 1:1 and a 4:5 version (centre crop on the reel's dark background) and a small GIF.
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ReelConfig } from "../config";
import { ffmpeg } from "../ffmpeg";
import { appDir, outDir } from "../paths";

export async function exportReel(config: ReelConfig, extras: boolean) {
  const raw = outDir(config.app, `${config.app}-9x16-raw.mp4`);
  const final = outDir(config.app, `${config.app}-9x16.mp4`);
  await ffmpeg(["-i", raw, "-t", String(config.seconds), "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.84:level=false", "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", final]);
  console.log(`  ✓ ${final}`);
  // The post notes (one-sentence captions, related affiliate products) go next to the video.
  const notes = join(appDir(config.app), "post.md");
  if (existsSync(notes)) {
    copyFileSync(notes, outDir(config.app, `${config.app}-9x16.md`));
    console.log(`  ✓ ${outDir(config.app, `${config.app}-9x16.md`)}`);
  } else console.warn(`  ! no apps/${config.app}/post.md: write the captions and affiliate products (see CLAUDE.md)`);
  if (!extras) return;
  const bg = (config.theme.bg ?? "#000000").replace("#", "0x");
  for (const [name, h] of [["1x1", 1080], ["4x5", 1350]] as const) {
    const file = outDir(config.app, `${config.app}-${name}.mp4`);
    await ffmpeg(["-i", final, "-vf", `scale=-2:${h},pad=1080:${h}:(ow-iw)/2:0:${bg}`, "-c:v", "libx264", "-crf", "17", "-c:a", "copy", file]);
    console.log(`  ✓ ${file}`);
  }
  const gif = outDir(config.app, `${config.app}.gif`);
  await ffmpeg(["-i", final, "-vf", "fps=15,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse", gif]);
  console.log(`  ✓ ${gif}`);
}
