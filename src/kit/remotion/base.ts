// What every reel composition shares: the font, beat timing and the data the pipeline wrote into out/.
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import nunito from "@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2";

export const FONT = "Nunito";
let fontLoaded: Promise<void> | null = null;
/** Nunito (variable, all weights), bundled with the reel. */
export function loadNunito() {
  fontLoaded ??= loadFont({ family: FONT, url: nunito, weight: "200 1000" });
  return fontLoaded;
}

export type Theme = Record<string, string>;

/** Beat → frame. */
export const beatFrame = (beat: number, bpm: number, fps: number) => Math.round(beat * (60 / bpm) * fps);

export type VoiceLine = { id: string; caption: string; beat: number; file: string; seconds: number };
export type ReelData = {
  voice: { voice: string; lines: VoiceLine[] };
  beats: { bpm: number; offset: number; beats: number[] };
  capture: { clips: Record<string, number>; kept: Record<string, unknown> };
};

async function json<T>(path: string): Promise<T> {
  const res = await fetch(staticFile(path));
  if (!res.ok) throw new Error(`${path} is missing: run the pipeline steps first (npm run reel -- <app>)`);
  return res.json() as Promise<T>;
}

/** Reads the pipeline's outputs, plus any app-specific files (`extra`: name → path under the app folder). */
export async function loadReelData<E extends Record<string, string>>(extra: E) {
  const [voice, beats, capture, ...rest] = await Promise.all([
    json<ReelData["voice"]>("out/voice.json"),
    json<ReelData["beats"]>("out/beats.json"),
    json<ReelData["capture"]>("out/capture.json"),
    ...Object.values(extra).map((p) => json<unknown>(p)),
  ]);
  const more = Object.fromEntries(Object.keys(extra).map((k, i) => [k, rest[i]])) as { [K in keyof E]: unknown };
  return { voice, beats, capture, ...more };
}
