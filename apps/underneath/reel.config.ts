// "The Forest Underneath": the fungal network under every forest, in points of light, narrated.
import type { ReelConfig } from "../../src/kit/config";
import { LINES, SECONDS } from "./timeline";

export const config: ReelConfig = {
  app: "underneath",
  title: "The Forest Underneath",
  url: "",
  tagline: "Every forest is two forests.",
  fps: 30,
  width: 1080,
  height: 1920,
  seconds: SECONDS,
  voice: { name: "bm_george", compare: "am_michael", speed: 0.9, lines: LINES },
  music: { bpm: 60, offset: 0, generated: true, file: "out/music.wav" },
  theme: { bg: "#020805" },
};
