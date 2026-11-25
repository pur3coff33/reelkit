// What every disaster-sim reel shares: 30 s at 1080×1920, 120 BPM, generated music, no voice and no app footage.
// The pipeline for one is: music → render → export (`npm run music -- <app>` etc.).
import type { AppModule, ReelConfig } from "../config";

export const SIM_BPM = 120;

export function simConfig(app: string, title: string, tagline: string, theme: Record<string, string> = {}, seconds = 30): ReelConfig {
  return {
    app,
    title,
    url: "",
    tagline,
    fps: 30,
    width: 1080,
    height: 1920,
    seconds,
    voice: { name: "af_heart", speed: 1, lines: [] },
    music: { bpm: SIM_BPM, offset: 0, generated: true, file: "out/music.wav" },
    theme: { bg: "#02080e", ...theme },
  };
}

export function simApp(config: ReelConfig, music: (file: string) => void): AppModule {
  return {
    config,
    serve: () => {
      throw new Error(`${config.app} is simulated, not captured: run music, render and export`);
    },
    shots: [],
    music: async (file) => music(file),
  };
}
