import type { AppModule } from "../../src/kit/config";
import { config } from "./reel.config";

export const app: AppModule = {
  config,
  serve: () => {
    throw new Error("pinatubo is a documentary, not an app: run fetch, voice, layout, music, render, export");
  },
  shots: [],
  music: async (file) => (await import("./music")).writeMusic(file),
};
