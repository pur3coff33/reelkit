// kop.it's hooks for the pipeline: its seed, how to bring it up, its shots and its music.
import type { AppModule } from "../../src/kit/config";
import { afterCapture, beforeCapture, shots } from "./capture";
import { dev } from "./kopit";
import { writeMusic } from "./music";
import { config } from "./reel.config";
import { seed } from "./seed/run";

export const app: AppModule = {
  config,
  seed,
  // Capture runs on stored data only: the note is already in, so the AI is never asked again.
  serve: () => dev({ realNotes: false }),
  beforeCapture,
  afterCapture,
  shots,
  music: writeMusic,
};
