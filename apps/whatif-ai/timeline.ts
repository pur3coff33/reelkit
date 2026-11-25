// What If? EP 01: AI replaces every human worker. The picture (sim.ts), the words (Reel.tsx) and the sound (music.ts)
// all read this clock. 60 s at 30 fps.
import type { Slam, Stamp, Words } from "../../src/kit/whatif/Reel";

export const SECONDS = 60;

export const SHOTS = {
  city: { from: 0, to: 4 },
  street: { from: 4, to: 8 },
  factory: { from: 8, to: 11.5 },
  office: { from: 11.5, to: 14.5 },
  delivery: { from: 14.5, to: 17 },
  kitchen: { from: 17, to: 20 },
  empty: { from: 20, to: 23.5 },
  boxes: { from: 23.5, to: 27 },
  queue: { from: 27, to: 30.5 },
  family: { from: 30.5, to: 33 },
  shop: { from: 33, to: 35 },
  future: { from: 35, to: 40 },
  warehouse: { from: 40, to: 43 },
  park: { from: 43, to: 46.5 },
  divide: { from: 46.5, to: 50 },
  lone: { from: 50, to: SECONDS + 1 },
} as const;
export type ShotName = keyof typeof SHOTS;

export function shotAt(t: number): ShotName {
  for (const [name, s] of Object.entries(SHOTS)) if (t >= s.from && t < s.to) return name as ShotName;
  return "lone";
}
export const local = (t: number, s: ShotName) => t - SHOTS[s].from;

export const HOOK = { at: 0.15, to: 3.9, lines: ["WHAT IF", "AI REPLACED", "EVERY HUMAN", "WORKER?"] };

/** The simulated bulletin over the street: plainly labelled as a simulation, never a real channel. */
export const BULLETIN = { at: 4.15, to: 7.95, label: "SIMULATED BULLETIN", text: "AI IS REPLACING MILLIONS OF JOBS." };

export const WORDS: Words[] = [
  { at: 8.1, to: 11.4, text: "Factories go first.", sub: "ROBOT ARMS NEVER CLOCK OUT" },
  { at: 11.6, to: 14.4, text: "Then the offices.", sub: "AI WRITES, CODES AND CALCULATES" },
  { at: 14.6, to: 16.9, text: "Deliveries drive themselves." },
  { at: 17.1, to: 19.9, text: "Kitchens and call centers run on AI." },
  { at: 21.5, to: 23.4, text: "Offices empty out." },
  { at: 23.6, to: 26.9, text: "Millions are let go.", sub: "IN EVERY INDUSTRY AT ONCE" },
  { at: 27.1, to: 30.4, text: "Hundreds line up for every opening." },
  { at: 30.6, to: 32.9, text: "Families stretch every peso." },
  { at: 33.1, to: 34.9, text: "Business booms. Without staff." },
  { at: 36.5, to: 39.9, text: "A city that runs itself.", sub: "FACTORIES, ROADS, SHOPS, SKIES" },
  { at: 40.1, to: 42.9, text: "Warehouses work in the dark.", sub: "MACHINES DON'T NEED LIGHT" },
  { at: 43.1, to: 46.4, text: "People get their time back..." },
  { at: 46.6, to: 49.9, text: "...but the gap keeps growing.", sub: "A FEW OWN THE MACHINES" },
];

export const STAMPS: Stamp[] = [
  { at: 20, to: 21.4, count: 2, unit: "YEARS", from: 2, label: "AFTER" },
  { at: 35, to: 36.4, count: 10, unit: "YEARS", from: 2, label: "AFTER" },
];

const CYAN = "#5ef0ff";
export const SLAMS: Slam[] = [
  { at: 50.6, to: 55.4, text: "THE MACHINES CAN DO EVERYTHING.", size: 104, y: 560 },
  { at: 52.6, to: 55.4, text: "BUT WHAT WILL HUMANS DO?", size: 118, y: 800, tone: CYAN },
];

export const QUESTION = { at: 55.5, text: "WOULD YOU SURVIVE IN AN AI-POWERED WORLD?" };

/** The share of jobs the simulation has automated, for the counter (a made-up curve, labelled as simulated). */
export const AUTOMATED: [number, number][] = [[8, 3], [11.5, 14], [14.5, 27], [17, 36], [20, 44], [27, 58], [35, 71], [40, 84], [50, 92]];
