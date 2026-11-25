import { simApp } from "../../src/kit/lowpoly/app";
import { writeMusic } from "./music";
import { config } from "./reel.config";
import { writeVoice } from "./voice";

// Drawn, not captured. The voice is ElevenLabs (Tagalog), not Kokoro: npm run voice → music → render.
export const app = { ...simApp(config, writeMusic), voice: writeVoice };
