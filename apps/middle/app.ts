import type { AppModule } from "../../src/kit/config";
import { writeMusic } from "./music";
import { config } from "./reel.config";

// Drawn, not captured: voice, layout, music, render, then mux by hand.
export const app: AppModule = {
  config,
  serve: () => {
    throw new Error("middle is drawn, not captured: run voice, music and render");
  },
  shots: [],
  music: writeMusic,
};
