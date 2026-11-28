// Ozone, 1996: a long-form documentary about the Ozone Disco fire (Quezon City, 18 March 1996), made in parts (parts.ts):
// each part is voiced, timed, scored and rendered with part.ts, and join.ts puts them together. This config holds what the
// parts share (size, frame rate, the narrator). Each part has its own length (parts/<id>/layout.gen.ts); `seconds` is unused.
import type { ReelConfig } from "../../src/kit/config";

export const config: ReelConfig = {
  app: "ozone",
  title: "Ozone, 1996",
  url: "",
  tagline: "The door that opened inward",
  fps: 30,
  width: 1920,
  height: 1080,
  seconds: 0,
  encode: "doc",
  gl: "angle",
  // Each part's lines are given to the voice step by part.ts.
  voice: { name: "bm_fable", compare: "bm_george", speed: 1, lines: [] },
  music: { generated: true, file: "out/music.wav" },
  theme: { bg: "#0a0c0f" },
};
