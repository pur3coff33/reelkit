// "Made of Strangers": two minutes on what a self is, told in points of light that keep becoming something else.
import type { ReelConfig } from "../../src/kit/config";
import { LINES, SECONDS } from "./timeline";

export const config: ReelConfig = {
  app: "strangers",
  title: "Made of Strangers",
  url: "",
  tagline: "What stays the same when everything in you changes?",
  fps: 30,
  width: 1080,
  height: 1920,
  seconds: SECONDS,
  // A beat is a second.
  voice: { name: "bm_george", compare: "am_michael", speed: 0.86, lines: LINES },
  music: { bpm: 60, offset: 0, generated: true, file: "out/music.wav" },
  theme: { bg: "#03020a" },
};
