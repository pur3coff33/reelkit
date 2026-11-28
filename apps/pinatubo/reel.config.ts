// Pinatubo, 1991: the first reelkit documentary. 60 s, landscape. Pipeline: fetch → voice → layout.ts → music → render →
// export (see CLAUDE.md, Documentaries).
import type { ReelConfig } from "../../src/kit/config";
import { LAYOUT } from "./layout.gen";
import { LINES } from "./script";

export const config: ReelConfig = {
  app: "pinatubo",
  title: "Pinatubo, 1991",
  url: "",
  tagline: "The eruption they saw coming",
  fps: 30,
  width: 1920,
  height: 1080,
  // As long as the story needs (layout.ts times it from the voice); the title holds to the next whole second.
  seconds: Math.ceil(LAYOUT.seconds),
  encode: "doc",
  voice: { name: "bm_fable", compare: "bm_george", speed: 1, lines: LINES },
  music: { generated: true, file: "out/music.wav" },
  theme: { bg: "#0b0e12" },
};
