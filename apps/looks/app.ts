import { simApp } from "../../src/kit/lowpoly/app";
import { config } from "./reel.config";

// A silent demo: npm run render -- looks.
export const app = simApp(config, () => {
  throw new Error("the looks demo is silent");
});
