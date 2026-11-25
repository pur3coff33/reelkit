import { simApp } from "../../src/kit/lowpoly/app";
import { writeMusic } from "./music";
import { config } from "./reel.config";

// Drawn, not captured: npm run music → render → export.
export const app = simApp(config, writeMusic);
