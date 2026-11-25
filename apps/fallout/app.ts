import { simApp } from "../../src/kit/lowpoly/app";
import { writeMusic } from "./music";
import { config } from "./reel.config";

// Drawn, not captured: npm run voice → music → render → export. The music step reads the voice, so voice comes first.
export const app = simApp(config, writeMusic);
