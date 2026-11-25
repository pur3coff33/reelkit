import type { AppModule } from "../../src/kit/config";
import { writeMusic } from "./music";
import { config } from "./reel.config";

// Drawn, not captured: voice, music, render, export.
export const app: AppModule = {
  config,
  serve: () => {
    throw new Error("strangers is drawn, not captured: run voice, music, render and export");
  },
  shots: [],
  music: writeMusic,
};
