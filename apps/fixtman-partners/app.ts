// The live site, its shots and the score.
import type { AppModule } from "../../src/kit/config";
import { beforeCapture } from "../fixtman/capture";
import { shots } from "./capture";
import { writeMusic } from "./music";
import { config } from "./reel.config";

export const app: AppModule = { config, serve: async () => ({ url: "https://fixtman.com", stop: async () => {} }), beforeCapture, shots, music: writeMusic };
