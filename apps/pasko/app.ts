import { simApp } from "../../src/kit/lowpoly/app";
import { config } from "./reel.config";

// Drawn, not captured: music, render, export.
export const app = simApp(config, async (file) => (await import("./music")).writeMusic(file));
