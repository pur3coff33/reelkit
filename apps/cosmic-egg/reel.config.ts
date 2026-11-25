// "The Cosmic Egg": what if you are everyone? Five minutes of points of light that keep becoming someone else, told by a
// calm voice, from the Upanishads' salt to the egg at the start of the world.
import type { ReelConfig } from "../../src/kit/config";
import { LINES, SECONDS } from "./timeline";

export const config: ReelConfig = {
  app: "cosmic-egg",
  title: "The Cosmic Egg",
  url: "",
  tagline: "What if every person you have ever met was you?",
  fps: 30,
  width: 1080,
  height: 1920,
  seconds: SECONDS,
  // A beat is a second.
  voice: { name: "bm_george", compare: "am_michael", speed: 0.86, lines: LINES },
  music: { bpm: 60, offset: 0, generated: true, file: "out/music.wav" },
  theme: { bg: "#03020a" },
};
