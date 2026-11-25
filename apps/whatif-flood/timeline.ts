// What If? EP 04: a flash flood hits a riverside camp on a clear night. The picture (sim.ts), the words (Reel.tsx) and
// the sound (music.ts) all read this clock. 60 s at 30 fps; the flood front reaches the camp at 26.5 s.
import type { Slam, Stamp, Words } from "../../src/kit/whatif/Reel";
import { smooth, track } from "../../src/kit/whatif/camp";

export const SECONDS = 60;
/** The front reaches the camp (z = 0). */
export const ARRIVE = 26.5;
/** Lightning in the storm upstream. */
export const STRIKES = [6.9, 7.7, 8.6, 9.2, 10.0, 10.7, 11.4, 19.6];

export const SHOTS = {
  hook: { from: 0, to: 3.6 },
  camp: { from: 3.6, to: 6.5 },
  upstream: { from: 6.5, to: 9.5 },
  gorge: { from: 9.5, to: 12 },
  rise: { from: 12, to: 15 },
  muddy: { from: 15, to: 18 },
  roar: { from: 18, to: 21 },
  run: { from: 21, to: 25 },
  wall: { from: 25, to: 28.2 },
  sweep: { from: 28.2, to: 32 },
  cling: { from: 32, to: 36 },
  ridge: { from: 36, to: 40 },
  rescue: { from: 40, to: 45 },
  after: { from: 45, to: 50 },
  final: { from: 50, to: SECONDS + 1 },
} as const;
export type ShotName = keyof typeof SHOTS;

export function shotAt(t: number): ShotName {
  for (const [name, s] of Object.entries(SHOTS)) if (t >= s.from && t < s.to) return name as ShotName;
  return "final";
}
export const local = (t: number, s: ShotName) => t - SHOTS[s].from;

export const HOOK = { at: 0.15, to: 3.5, lines: ["WHAT IF", "A FLASH FLOOD", "HIT YOUR", "CAMPSITE?"] };

export const WORDS: Words[] = [
  { at: 3.7, to: 6.4, text: "A riverside camp. 9 PM.", sub: "CLEAR SKY. NOT A DROP OF RAIN." },
  { at: 6.6, to: 9.4, text: "But 10 km upstream…", sub: "A STORM IS DUMPING RAIN ON THE MOUNTAINS" },
  { at: 9.6, to: 11.9, text: "All that water funnels into one river." },
  { at: 13.4, to: 14.9, text: "The river creeps up.", sub: "SIGN 1: WATER RISING FAST" },
  { at: 15.1, to: 17.9, text: "It turns brown. Sticks race past.", sub: "SIGN 2: MUDDY WATER AND DEBRIS" },
  { at: 18.1, to: 20.9, text: "Then a roar, like a train.", sub: "SIGN 3: A RUMBLE UPSTREAM" },
  { at: 22.7, to: 24.9, text: "Two run uphill.", sub: "TWO GO BACK FOR THEIR GEAR" },
  { at: 28.3, to: 31.9, text: "The camp is gone in seconds.", sub: "THE RIVER JUMPS 2 METRES" },
  { at: 32.1, to: 35.9, text: "15 cm of fast water can knock you down.", sub: "30 CM CAN CARRY AWAY A CAR" },
  { at: 36.1, to: 39.9, text: "From high ground, they can only watch.", sub: "AND RADIO FOR RESCUE" },
  { at: 41.6, to: 44.9, text: "Rescuers reach them at first light.", sub: "STILL HOLDING ON" },
  { at: 45.1, to: 49.9, text: "Above the camp, it never rained.", sub: "THE STORM WAS 10 KM AWAY" },
];

export const STAMPS: Stamp[] = [
  { at: 12, to: 13.3, count: 20, unit: "MINUTES", from: 2 },
  { at: 40, to: 41.5, count: 6, unit: "HOURS", from: 2 },
];

const CYAN = "#4fd1ff";
export const SLAMS: Slam[] = [
  { at: 21.05, to: 22.6, text: "GET TO HIGH GROUND", size: 132, y: 700, tone: CYAN },
  { at: 26.45, to: 28.1, text: "FLASH FLOOD", size: 190, y: 720, tone: "#fff" },
  { at: 50.1, to: 54.9, text: "MUDDY WATER?", size: 118, y: 520, tone: CYAN },
  { at: 50.9, to: 54.9, text: "RISING FAST?", size: 118, y: 650 },
  { at: 51.7, to: 54.9, text: "A ROAR UPSTREAM?", size: 110, y: 780 },
  { at: 52.8, to: 54.9, text: "CLIMB. NOW.", size: 170, y: 930, tone: CYAN },
];

export const QUESTION = { at: 55, text: "WOULD YOU GO BACK FOR YOUR GEAR?" };

// ── The water's clock ────────────────────────────────────────────────────────────────────────────────

/** The normal river surface. */
export const W0 = -0.45;
/** How high the flood stands over the normal river. */
export const PEAK = 1.9;

/** Where the flood front is along the valley (z, the camp at 0; the river runs towards −z). */
export const frontZ = (t: number) => track([[9.5, 620], [12, 450], [ARRIVE, 0], [ARRIVE + 4, -140]], t);

/** The river's rise before the front, the first warning sign. */
export const creep = (t: number) => 0.4 * smooth(12, 24, t);
/** How muddy the water is, 0 clear … 1 brown. */
export const mud = (t: number) => smooth(14.5, 16.5, t);

/** The surface height at (x, z), time t, before ripples. */
export function levelAt(z: number, t: number) {
  const behind = z - frontZ(t);
  const flood = t < 9.4 ? 0 : PEAK * smooth(-1, 5, behind);
  const recede = 1 - 0.62 * smooth(37, 41, t);
  return W0 + creep(t) + flood * recede;
}

/** The river level at the camp over normal, metres: the HUD's reading. */
export const campLevel = (t: number) => levelAt(0, t) - W0;
/** The storm's distance from camp in the story, km. */
export const frontKm = (t: number) => track([[9.5, 9.6], [12, 8.1], [ARRIVE, 0]], t);
