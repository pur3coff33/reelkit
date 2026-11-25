// What If? EP 02: the Philippines loses power for 72 hours. The picture (sim.ts), the words (Reel.tsx) and the sound
// (music.ts) all read this clock. 60 s at 30 fps; the grid fails on the beat at 8.0 s.
import type { Slam, Stamp, Words } from "../../src/kit/whatif/Reel";

export const SECONDS = 60;
/** The grid fails. */
export const BLACKOUT = 8;
/** How fast the dark sweeps inland from the bay (metres a second, in the city's scale). */
export const WAVE_SPEED = 300;
/** Where the dark starts: the bay side. */
export const WAVE_FROM = -420;

export const SHOTS = {
  skyline: { from: 0, to: 3.4 },
  highway: { from: 3.4, to: 5.6 },
  aerial: { from: 5.6, to: 8 },
  wave: { from: 8, to: 11 },
  junction: { from: 11, to: 13.6 },
  elevator: { from: 13.6, to: 16 },
  mall: { from: 16, to: 18 },
  phones: { from: 18, to: 20 },
  fuel: { from: 20, to: 24 },
  store: { from: 24, to: 27 },
  hospital: { from: 27, to: 31 },
  homes: { from: 31, to: 35 },
  silent: { from: 35, to: 38.5 },
  responders: { from: 38.5, to: 41.5 },
  water: { from: 41.5, to: 45 },
  tower: { from: 45, to: 48 },
  final: { from: 48, to: SECONDS + 1 },
} as const;
export type ShotName = keyof typeof SHOTS;

export function shotAt(t: number): ShotName {
  for (const [name, s] of Object.entries(SHOTS)) if (t >= s.from && t < s.to) return name as ShotName;
  return "final";
}
export const local = (t: number, s: ShotName) => t - SHOTS[s].from;

/** The lights stutter: once early (the hook), then hard just before the grid goes. */
export const FLICKERS: [number, number][] = [[1.5, 2.05], [6.8, 7.98]];

export const HOOK = { at: 0.15, to: 3.3, lines: ["WHAT IF", "THE ENTIRE", "PHILIPPINES", "LOST POWER?"] };

export const WORDS: Words[] = [
  { at: 3.5, to: 5.5, text: "Metro Manila. 8 PM.", sub: "14 MILLION PEOPLE ON THE GRID" },
  { at: 5.7, to: 7.9, text: "Then the lights flicker." },
  { at: 9.6, to: 10.95, text: "The whole grid fails.", sub: "BAY TO HILLS IN SECONDS" },
  { at: 11.1, to: 13.5, text: "Traffic lights die.", sub: "INTERSECTIONS JAM" },
  { at: 13.7, to: 15.9, text: "Elevators stop between floors." },
  { at: 16.1, to: 17.9, text: "Malls go dark mid-shopping." },
  { at: 18.1, to: 19.9, text: "Everyone reaches for a phone." },
  { at: 21.5, to: 23.9, text: "Fuel queues stretch for blocks.", sub: "GENERATORS NEED GAS" },
  { at: 24.1, to: 26.9, text: "Stores sell out of water.", sub: "FRIDGES ARE WARM" },
  { at: 27.1, to: 30.9, text: "Hospitals switch to generators.", sub: "FUEL FOR ABOUT 3 DAYS" },
  { at: 31.1, to: 34.9, text: "Families wait it out by flashlight." },
  { at: 36.5, to: 38.4, text: "Whole neighbourhoods go silent." },
  { at: 38.6, to: 41.4, text: "Responders work around the clock." },
  { at: 41.6, to: 44.9, text: "Water is handed out by the jug.", sub: "AID CENTERS OPEN" },
  { at: 45.1, to: 47.9, text: "Cell sites run out of backup power.", sub: "CALLS STOP GOING THROUGH" },
];

export const STAMPS: Stamp[] = [
  { at: 20, to: 21.4, count: 12, unit: "HOURS", from: 2 },
  { at: 35, to: 36.4, count: 48, unit: "HOURS", from: 12 },
  { at: 48, to: 49.6, count: 72, unit: "HOURS", from: 48 },
];

const AMBER = "#ffb81c";
export const SLAMS: Slam[] = [
  { at: 8.05, to: 9.5, text: "BLACKOUT", size: 210, y: 760, tone: "#fff" },
  { at: 49.8, to: 54.9, text: "72 HOURS.", size: 150, y: 560, tone: AMBER },
  { at: 50.9, to: 54.9, text: "NO ELECTRICITY.", size: 120, y: 720 },
  { at: 52.0, to: 54.9, text: "NO NORMAL LIFE.", size: 120, y: 850 },
];

export const QUESTION = { at: 55, text: "HOW PREPARED ARE WE?" };

/** Piecewise-linear lookup, held flat beyond its ends. */
export function track(keys: [number, number][], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return va + ((vb - va) * (t - a)) / (b - a);
    }
  }
  return keys[keys.length - 1][1];
}

const hashT = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/** The grid at reel time t, at a point in the city: 1 live, 0 dead. */
export function gridAt(t: number, x: number, seed: number) {
  for (const [a, b] of FLICKERS) {
    if (t >= a && t < b) {
      const step = Math.floor(t * 16) + (seed % 3);
      return hashT(step) > (t > 7.4 ? 0.62 : 0.4) ? 1 : 0.08;
    }
  }
  if (t < BLACKOUT) return 1;
  const front = WAVE_FROM + (t - BLACKOUT) * WAVE_SPEED;
  const ahead = x - front;
  if (ahead < 0) return 0;
  // Just ahead of the front, lights stutter before they go.
  if (ahead < 70) return hashT(Math.floor(t * 20) + seed) > 0.5 ? 1 : 0.1;
  return 1;
}
