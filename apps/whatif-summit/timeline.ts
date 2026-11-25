// What If? EP 06: a typhoon catches a camp on a 2,900 m summit at sunrise. The picture (sim.ts), the words (Reel.tsx)
// and the sound (music.ts) all read this clock. 60 s at 30 fps.
import type { Slam, Stamp, Words } from "../../src/kit/whatif/Reel";
import { track } from "../../src/kit/whatif/camp";

export const SECONDS = 60;
/** Lightning on the ridge: one far early, then the strike on the summit. */
export const STRIKES = [18.4, 21.7, 39.6, 40.3, 44.6];
export const SUMMIT_STRIKE = 39.6;

export const SHOTS = {
  hook: { from: 0, to: 3.6 },
  sea: { from: 3.6, to: 6.6 },
  alert: { from: 6.6, to: 9.6 },
  rise: { from: 9.6, to: 12.6 },
  wind: { from: 12.6, to: 17 },
  rain: { from: 17, to: 20 },
  tent: { from: 20, to: 23 },
  cold: { from: 23, to: 26 },
  hypo: { from: 26, to: 30 },
  descend: { from: 30, to: 35 },
  stream: { from: 35, to: 39 },
  bolt: { from: 39, to: 43 },
  forest: { from: 43, to: 47 },
  ranger: { from: 47, to: 51.5 },
  final: { from: 51.5, to: SECONDS + 1 },
} as const;
export type ShotName = keyof typeof SHOTS;

export function shotAt(t: number): ShotName {
  for (const [name, s] of Object.entries(SHOTS)) if (t >= s.from && t < s.to) return name as ShotName;
  return "final";
}
export const local = (t: number, s: ShotName) => t - SHOTS[s].from;

export const HOOK = { at: 0.15, to: 3.5, lines: ["WHAT IF", "A TYPHOON HIT", "WHILE YOU'RE", "ON THE SUMMIT?"] };

export const WORDS: Words[] = [
  { at: 3.7, to: 6.5, text: "2,900 m up. Sunrise above the clouds.", sub: "THE VIEW EVERYONE CAME FOR" },
  { at: 6.7, to: 9.5, text: "The forecast changed overnight.", sub: "SIGNAL NO. 3 BY AFTERNOON" },
  { at: 9.7, to: 12.5, text: "The clouds below start to rise." },
  { at: 14.1, to: 16.9, text: "Wind hits 60 km/h.", sub: "GUSTS SHOVE HIKERS OFF BALANCE" },
  { at: 17.1, to: 19.9, text: "Sideways rain.", sub: "YOU CAN'T SEE 10 METRES" },
  { at: 20.1, to: 22.9, text: "Tent poles snap.", sub: "THE SHELTER IS GONE" },
  { at: 23.1, to: 25.9, text: "Wet + wind = dangerous cold.", sub: "IT FEELS BELOW ZERO" },
  { at: 27.9, to: 29.9, text: "Shivering. Slurred words. Clumsy hands.", sub: "THE FIRST SIGNS" },
  { at: 31.5, to: 34.9, text: "The guide's call: go down. Now.", sub: "STAY TOGETHER. ONE LINE." },
  { at: 35.1, to: 38.9, text: "The trail turns into a stream.", sub: "SLOW STEPS. NO SHORTCUTS." },
  { at: 40.7, to: 42.9, text: "Lightning hits the summit they left.", sub: "HIGH GROUND DRAWS STRIKES" },
  { at: 43.1, to: 46.9, text: "Below the treeline, the wind drops.", sub: "THE FOREST BREAKS THE WIND" },
  { at: 48.5, to: 51.4, text: "Ranger station. Everyone accounted for." },
];

export const STAMPS: Stamp[] = [
  { at: 12.6, to: 14, count: 1, unit: "HOUR", from: 1 },
  { at: 30, to: 31.4, count: 3, unit: "HOURS", from: 2 },
  { at: 47, to: 48.4, count: 6, unit: "HOURS", from: 3 },
];

const YELLOW = "#ffd400";
export const SLAMS: Slam[] = [
  { at: 26.05, to: 27.8, text: "HYPOTHERMIA", size: 170, y: 720, tone: "#9fe0ff" },
  { at: 51.6, to: 55.4, text: "CHECK THE FORECAST.", size: 112, y: 540, tone: YELLOW },
  { at: 52.5, to: 55.4, text: "TURN BACK EARLY.", size: 124, y: 680 },
  { at: 53.5, to: 55.4, text: "THE MOUNTAIN WILL WAIT.", size: 100, y: 820, tone: YELLOW },
];

export const QUESTION = { at: 55.5, text: "WOULD YOU HAVE TURNED BACK?" };

// ── The weather ──────────────────────────────────────────────────────────────────────────────────────

/** Sustained wind, km/h. */
export const windAt = (t: number) => track([[0, 8], [9.6, 18], [12.6, 40], [14.5, 62], [20, 86], [26, 104], [30, 110], [39, 96], [42.5, 70], [44.5, 32], [48, 14], [51.5, 6]], t);
/** Air temperature, °C. */
export const tempAt = (t: number) => track([[0, 11], [12.6, 9], [20, 7], [26, 6], [39, 7], [44, 10], [48, 14], [51.5, 9]], t);
/** Wind chill (Environment Canada's formula), for 10 °C and below with wind over 4.8 km/h. */
export function feelsLike(t: number) {
  const T = tempAt(t), V = windAt(t);
  if (T > 10 || V < 4.8) return T;
  const v = V ** 0.16;
  return 13.12 + 0.6215 * T - 11.37 * v + 0.3965 * T * v;
}
/** 0 sunrise … 1 full storm: how far the weather has turned. */
export const stormAt = (t: number) => track([[9.6, 0], [12.6, 0.45], [14, 0.7], [17, 1], [43, 1], [47, 0.75], [51.5, 0]], t);
/** Rain, 0…1. */
export const rainAt = (t: number) => track([[15.5, 0], [17, 1], [43, 1], [47, 0.5], [51.4, 0.5], [51.5, 0]], t);
