// The frame's shape, for file names (pinatubo-16x9.mp4, kopit-9x16.mp4), and how export encodes a finished file.
import type { ReelConfig } from "./config";

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** "16x9", "9x16", "1x1", "4x5": the frame's sides reduced to their ratio. */
export function frameTag(c: { width: number; height: number }) {
  const g = gcd(c.width, c.height);
  return `${c.width / g}x${c.height / g}`;
}

/** The 1:1 and 4:5 extras crop a portrait reel's centre: a landscape frame has nothing to crop them from. */
export const extrasAllowed = (c: { width: number; height: number }) => c.height > c.width;

/** Export's video and audio settings. A documentary is re-encoded small (CLAUDE.md, "Keeping files small"): photo footage,
 *  so -tune film, and the render's full-range video brought to TV range. Everything else keeps the render's video. */
export function encodeArgs(config: ReelConfig): string[] {
  if (config.encode === "doc")
    return [
      "-c:v", "libx264", "-preset", "slow", "-tune", "film", "-crf", "24",
      "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", "-color_range", "tv",
      "-c:a", "aac", "-b:a", "192k", "-ac", "2",
    ];
  return ["-c:v", "copy", "-c:a", "aac", "-b:a", "256k"];
}
