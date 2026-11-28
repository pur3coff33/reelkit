import type { AppModule } from "../../src/kit/config";
import { config } from "./reel.config";

// Drawn, not captured: voice, layout, music, render, then mux by hand.
export const app: AppModule = {
  config,
  serve: () => {
    throw new Error("underneath is drawn, not captured: run voice, layout, music and render");
  },
  shots: [],
  music: async (file: string) => (await import("./music")).writeMusic(file),
};
