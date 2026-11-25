import type { AppModule } from "../../src/kit/config";
import { writeMusic } from "./music";
import { config } from "./reel.config";

// Drawn, not captured: voice, then `npx tsx apps/cosmic-egg/layout.ts`, then music, render and export.
export const app: AppModule = {
  config,
  serve: () => {
    throw new Error("cosmic-egg is drawn, not captured: run voice, layout, music, render and export");
  },
  shots: [],
  music: writeMusic,
};
