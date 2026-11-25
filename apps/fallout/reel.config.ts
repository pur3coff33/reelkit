import { simConfig } from "../../src/kit/lowpoly/app";
import { SECONDS } from "./timeline";

// Drawn from code. One voice line, read once by Kokoro; music.ts mixes it twice into out/music.wav (down a bad phone line
// at the call, clean on the voicemail) with the score and the sound effects.
const base = simConfig("fallout", "This Is Not a Drill", "Fictional simulation", { bg: "#000000" }, SECONDS);

export const config = {
  ...base,
  voice: {
    name: "af_heart",
    compare: "am_michael",
    speed: 1,
    lines: [{ id: "message", text: "Get underground. Don't wait for me.", caption: "Get underground. Don't wait for me.", beat: 21 }],
  },
};
