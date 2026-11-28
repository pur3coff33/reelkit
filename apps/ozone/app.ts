import type { AppModule } from "../../src/kit/config";
import { config } from "./reel.config";

const PARTS = "ozone is a documentary made in parts: npx tsx apps/ozone/part.ts <id> all, then npx tsx apps/ozone/join.ts";

export const app: AppModule = {
  config,
  serve: () => {
    throw new Error(PARTS);
  },
  shots: [],
  voice: async () => {
    throw new Error(PARTS);
  },
  music: async () => {
    throw new Error(PARTS);
  },
};
