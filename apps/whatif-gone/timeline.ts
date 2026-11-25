// What If? EP 03: every human disappears overnight. The picture (sim.ts), the words (Reel.tsx) and the sound (music.ts)
// all read this clock. 60 s at 30 fps; everyone vanishes at 2.4 s.
import type { Slam, Stamp, Words } from "../../src/kit/whatif/Reel";

export const SECONDS = 60;
/** Everyone goes. */
export const VANISH = 2.4;

export const SHOTS = {
  crowd: { from: 0, to: 4 },
  silence: { from: 4, to: 8 },
  streets: { from: 8, to: 11 },
  airport: { from: 11, to: 13.5 },
  train: { from: 13.5, to: 15.5 },
  dog: { from: 15.5, to: 17.5 },
  grid: { from: 17.5, to: 20 },
  dark: { from: 20, to: 23 },
  market: { from: 23, to: 26 },
  strays: { from: 26, to: 29 },
  cracks: { from: 29, to: 32 },
  grass: { from: 32, to: 36 },
  flood: { from: 36, to: 40 },
  decay: { from: 40, to: 45 },
  jungle: { from: 45, to: 50 },
  herd: { from: 50, to: 52.5 },
  reclaimed: { from: 52.5, to: SECONDS + 1 },
} as const;
export type ShotName = keyof typeof SHOTS;

export function shotAt(t: number): ShotName {
  for (const [name, s] of Object.entries(SHOTS)) if (t >= s.from && t < s.to) return name as ShotName;
  return "reclaimed";
}
export const local = (t: number, s: ShotName) => t - SHOTS[s].from;

export const HOOK = { at: 0.15, to: 3.9, lines: ["WHAT IF", "EVERY HUMAN", "DISAPPEARED", "TONIGHT?"] };

export const WORDS: Words[] = [
  { at: 4.2, to: 7.9, text: "The city falls silent.", sub: "8 BILLION PEOPLE, GONE AT ONCE" },
  { at: 9.5, to: 10.9, text: "Streets frozen mid-commute." },
  { at: 11.1, to: 13.4, text: "Airports stand idle." },
  { at: 13.6, to: 15.4, text: "Trains stop where they are." },
  { at: 15.6, to: 17.4, text: "Pets wander out, looking for us." },
  { at: 17.6, to: 19.9, text: "With no one at the controls,", sub: "THE GRID FAILS" },
  { at: 21.5, to: 22.9, text: "The lights never come back." },
  { at: 23.1, to: 25.9, text: "Supermarkets sit untouched.", sub: "THE FOOD BEGINS TO ROT" },
  { at: 26.1, to: 28.9, text: "Pets become strays." },
  { at: 29.1, to: 31.9, text: "Nothing gets repaired." },
  { at: 33.5, to: 35.9, text: "Grass splits the asphalt.", sub: "DEER WALK THE AVENUES" },
  { at: 36.1, to: 39.9, text: "Drains clog. Streets flood." },
  { at: 40.1, to: 44.9, text: "Glass breaks. Steel rusts.", sub: "BUILDINGS BEGIN TO FAIL" },
  { at: 46.5, to: 49.9, text: "Forests swallow the neighbourhoods." },
  { at: 50.1, to: 52.4, text: "Wildlife moves in for good." },
];

export const STAMPS: Stamp[] = [
  { at: 8, to: 9.4, count: 24, unit: "HOURS", from: 2 },
  { at: 20, to: 21.4, count: 7, unit: "DAYS", from: 2 },
  { at: 32, to: 33.4, count: 1, unit: "YEAR", from: 1 },
  { at: 45, to: 46.4, count: 100, unit: "YEARS", from: 2 },
];

const GREEN = "#8be06b";
export const SLAMS: Slam[] = [
  { at: 52.8, to: 56.1, text: "100 YEARS LATER.", size: 130, y: 600, tone: GREEN },
  { at: 54.0, to: 56.1, text: "THE PLANET CONTINUES.", size: 110, y: 760 },
];

export const QUESTION = { at: 56.2, text: "WOULD ANYONE REMEMBER US?" };

/** How far nature has come back at reel time t: green (plants), ruin (decay). */
export function natureAt(t: number) {
  const k = (keys: [number, number][]) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return keys[i - 1][1] + ((keys[i][1] - keys[i - 1][1]) * (t - keys[i - 1][0])) / (keys[i][0] - keys[i - 1][0]);
    return keys[keys.length - 1][1];
  };
  return {
    green: k([[29, 0], [32, 0.07], [32.01, 0.28], [45, 0.42], [45.01, 0.85], [60, 0.95]]),
    ruin: k([[20, 0], [32, 0.05], [32.01, 0.12], [45, 0.32], [45.01, 0.82], [60, 0.9]]),
  };
}
