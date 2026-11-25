// The call-masking explainer is drawn, not captured, and has no music: only voice → beats → render → export apply.
import type { AppModule } from "../../src/kit/config";
import { config } from "./reel.config";

export const app: AppModule = {
  config,
  serve: () => {
    throw new Error("callmask has no app footage: run voice, beats, render and export (not capture or reel)");
  },
  shots: [],
};
