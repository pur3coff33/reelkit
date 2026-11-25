// "The Middle of Everything": the universe from the quantum foam to the cosmic web in points of light, stopping at its
// exact middle, a human egg.
import type { ReelConfig } from "../../src/kit/config";
import { LINES, SECONDS } from "./timeline";

export const config: ReelConfig = {
  app: "middle",
  title: "The Middle of Everything",
  url: "",
  tagline: "You began at the exact middle of the universe.",
  fps: 30,
  width: 1080,
  height: 1920,
  seconds: SECONDS,
  voice: { name: "bm_george", compare: "am_michael", speed: 0.9, lines: LINES },
  music: { bpm: 60, offset: 0, generated: true, file: "out/music.wav" },
  theme: { bg: "#03020a" },
};
