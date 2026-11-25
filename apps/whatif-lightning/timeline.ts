// What If? EP 08: a thunderstorm builds over a hilltop camp. Flash-to-bang counting, why a tent and a lone tree are the
// wrong places, the strike, ground current, CPR, then a rewind to what they should have done. 60 s at 30 fps.
import type { Slam, Stamp, Words } from "../../src/kit/whatif/Reel";
import { track } from "../../src/kit/whatif/camp";

export const SECONDS = 60;
/** The strike on the lone tree. */
export const STRIKE = 25.6;
/** Flashes the campers count from: when, and how many real seconds until the thunder. */
export const FLASHES = [{ at: 9.9, gap: 9 }, { at: 13.3, gap: 4 }, { at: 17.2, gap: 2 }];
/** On screen, one counted second takes this long. */
export const COUNT_STEP = 0.3;
/** Every flash, for the light: the counted ones, the strike, a few more as the storm moves off. */
export const ALL_FLASHES = [...FLASHES.map((f) => f.at), 20.4, 23.4, STRIKE, 26.1, 30.2, 34.4, 41.8, 45.6];

export const SHOTS = {
  hook: { from: 0, to: 3.6 },
  camp: { from: 3.6, to: 6.6 },
  cloud: { from: 6.6, to: 9.6 },
  flash: { from: 9.6, to: 13 },
  closer: { from: 13, to: 16 },
  tents: { from: 16, to: 19.5 },
  tree: { from: 19.5, to: 22.5 },
  hair: { from: 22.5, to: STRIKE - 0.1 },
  strike: { from: STRIKE - 0.1, to: 28 },
  ground: { from: 28, to: 31.5 },
  down: { from: 31.5, to: 35 },
  cpr: { from: 35, to: 39 },
  rewind: { from: 39, to: 43 },
  spread: { from: 43, to: 47 },
  wait: { from: 47, to: 51 },
  final: { from: 51, to: SECONDS + 1 },
} as const;
export type ShotName = keyof typeof SHOTS;

export function shotAt(t: number): ShotName {
  for (const [name, s] of Object.entries(SHOTS)) if (t >= s.from && t < s.to) return name as ShotName;
  return "final";
}
export const local = (t: number, s: ShotName) => t - SHOTS[s].from;

export const HOOK = { at: 0.15, to: 3.5, lines: ["WHAT IF", "LIGHTNING", "STRUCK YOUR", "CAMPSITE?"] };

export const WORDS: Words[] = [
  { at: 3.7, to: 6.5, text: "A hilltop camp. 3 PM.", sub: "THE HIGHEST POINT AROUND" },
  { at: 6.7, to: 9.5, text: "Afternoon clouds build fast.", sub: "A THUNDERSTORM IS FORMING" },
  { at: 9.7, to: 12.9, text: "A flash. Count to the thunder.", sub: "EVERY 3 SECONDS ≈ 1 KM" },
  { at: 13.1, to: 15.9, text: "The count gets shorter.", sub: "UNDER 30 SECONDS? GET TO SAFETY" },
  { at: 17.4, to: 19.4, text: "They hide in their tents.", sub: "A TENT IS NOT A SHELTER" },
  { at: 19.6, to: 22.4, text: "One runs under the lone tree.", sub: "THE WORST PLACE TO BE" },
  { at: 22.6, to: 25.4, text: "Hair stands on end. A buzzing.", sub: "A STRIKE IS SECONDS AWAY" },
  { at: 28.1, to: 31.4, text: "The current spreads through the ground.", sub: "IT CAUSES MOST LIGHTNING INJURIES" },
  { at: 31.6, to: 34.9, text: "The tree splits. Their friend is down." },
  { at: 35.1, to: 38.9, text: "They start CPR right away.", sub: "IT'S SAFE TO TOUCH A STRIKE VICTIM" },
  { at: 39.1, to: 42.9, text: "Rewind. At the first thunder:", sub: "GET OFF THE HILLTOP" },
  { at: 43.1, to: 46.9, text: "Get low. Spread out.", sub: "15 M APART, SO ONE STRIKE CAN'T HIT EVERYONE" },
  { at: 48.5, to: 50.9, text: "Then wait for the storm to pass.", sub: "30 MINUTES AFTER THE LAST THUNDER" },
];

export const STAMPS: Stamp[] = [
  { at: 16, to: 17.3, count: 10, unit: "MINUTES", from: 2, label: "AFTER" },
  { at: 47, to: 48.4, count: 30, unit: "MINUTES", from: 5, label: "WAIT" },
];

const VIOLET = "#c3a6ff";
export const SLAMS: Slam[] = [
  { at: STRIKE, to: 27.6, text: "STRIKE", size: 240, y: 700, tone: "#fff" },
  { at: 51.1, to: 55.4, text: "WHEN THUNDER ROARS,", size: 104, y: 540, tone: VIOLET },
  { at: 52.0, to: 55.4, text: "GET OFF THE PEAK.", size: 124, y: 670 },
  { at: 53.0, to: 55.4, text: "A TENT WON'T SAVE YOU.", size: 104, y: 820, tone: VIOLET },
];

export const QUESTION = { at: 55.5, text: "WOULD YOU HIDE IN YOUR TENT?" };

/** The count after the latest flash, in real seconds, and whether the thunder has come. */
export function countAt(t: number): { n: number; gap: number; heard: boolean } | null {
  const f = [...FLASHES].reverse().find((x) => t >= x.at);
  if (!f) return null;
  const n = Math.min(f.gap, Math.floor((t - f.at) / COUNT_STEP) + 1);
  return { n, gap: f.gap, heard: t - f.at >= f.gap * COUNT_STEP };
}
/** 0 sunny … 1 under the storm. */
export const stormAt = (t: number) => track([[3.4, 0.95], [3.6, 0], [6.6, 0], [9.6, 0.35], [13, 0.6], [17, 0.9], [20, 1], [39, 1], [39.01, 0.55], [43, 0.85], [47, 0.9], [50.5, 0.3], [51, 0.1]], t);
export const rainAt = (t: number) => track([[16.5, 0], [18, 0.8], [38.9, 0.8], [39, 0], [44, 0.2], [47, 0.6], [50, 0], [61, 0]], t);
