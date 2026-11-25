// What If? EP 05: three friends camp under a balete tree after a lolo warns them not to. Philippine folklore told as a
// fictional simulation: the kapre in the branches, the trails that loop, the shirt worn inside out. 60 s at 30 fps.
import type { Slam, Stamp, Words } from "../../src/kit/whatif/Reel";
import { smooth, track } from "../../src/kit/whatif/camp";

export const SECONDS = 60;

export const SHOTS = {
  hook: { from: 0, to: 3.6 },
  warn: { from: 3.6, to: 6.6 },
  pitch: { from: 6.6, to: 9.6 },
  fire: { from: 9.6, to: 12.6 },
  smell: { from: 12.6, to: 15.6 },
  silence: { from: 15.6, to: 18.6 },
  ember: { from: 18.6, to: 21.6 },
  beam: { from: 21.6, to: 24.6 },
  tent: { from: 24.6, to: 28.6 },
  eyes: { from: 28.6, to: 32.6 },
  run: { from: 32.6, to: 36.6 },
  loop: { from: 36.6, to: 39.6 },
  shirt: { from: 39.6, to: 44 },
  path: { from: 44, to: 48 },
  dawn: { from: 48, to: 51.5 },
  final: { from: 51.5, to: SECONDS + 1 },
} as const;
export type ShotName = keyof typeof SHOTS;

export function shotAt(t: number): ShotName {
  for (const [name, s] of Object.entries(SHOTS)) if (t >= s.from && t < s.to) return name as ShotName;
  return "final";
}
export const local = (t: number, s: ShotName) => t - SHOTS[s].from;

export const HOOK = { at: 0.15, to: 3.5, lines: ["WHAT IF", "YOU CAMPED", "UNDER A", "BALETE TREE?"] };

export const WORDS: Words[] = [
  { at: 3.7, to: 6.5, text: "A lolo at the trailhead warns them:", sub: "“DON'T CAMP UNDER THE BALETE.”" },
  { at: 6.7, to: 9.5, text: "They camp right under it anyway." },
  { at: 11.1, to: 12.5, text: "Ghost stories by the fire." },
  { at: 12.7, to: 15.5, text: "Someone smells tobacco smoke.", sub: "NOBODY BROUGHT CIGARETTES" },
  { at: 15.7, to: 18.5, text: "Then the crickets stop." },
  { at: 18.7, to: 21.5, text: "An orange glow, high in the branches." },
  { at: 21.7, to: 24.5, text: "They shine a light up there.", sub: "NOTHING." },
  { at: 26.1, to: 28.5, text: "Footsteps. Heavy ones.", sub: "SOMETHING CIRCLES THE TENT" },
  { at: 28.7, to: 30.1, text: "Two eyes in the branches." },
  { at: 32.7, to: 36.5, text: "They run into the dark." },
  { at: 36.7, to: 39.5, text: "Every path leads back to the balete.", sub: "FOLKLORE: A KAPRE LEADS YOU IN CIRCLES" },
  { at: 41.1, to: 43.9, text: "One remembers lola's old advice:", sub: "WEAR YOUR SHIRT INSIDE OUT" },
  { at: 44.1, to: 47.9, text: "Suddenly, the trail is there.", sub: "FOLKLORE SAYS IT BREAKS THE SPELL" },
  { at: 49.5, to: 51.4, text: "At dawn, they go back for the tent.", sub: "A CIGAR STUB, STILL SMOKING" },
];

/** The clock, in the corner: "IT'S 9 PM". */
export const STAMPS: Stamp[] = [
  { at: 9.6, to: 11, count: 9, unit: "PM", from: 6, label: "IT'S" },
  { at: 24.6, to: 26, count: 12, unit: "AM", from: 9, label: "IT'S" },
  { at: 39.6, to: 41, count: 3, unit: "AM", from: 1, label: "IT'S" },
  { at: 48, to: 49.4, count: 6, unit: "AM", from: 3, label: "IT'S" },
];

const EMBER = "#ff6a2a";
export const SLAMS: Slam[] = [
  { at: 30.2, to: 32.5, text: "KAPRE", size: 250, y: 700, tone: EMBER, sub: "THE TREE GIANT OF PHILIPPINE FOLKLORE" },
  { at: 51.6, to: 55.4, text: "TABI TABI PO.", size: 150, y: 560, tone: EMBER, sub: "ASK PERMISSION BEFORE YOU CAMP" },
  { at: 53.2, to: 55.4, text: "RESPECT THE OLD TREES.", size: 104, y: 830 },
];

export const QUESTION = { at: 55.5, text: "WOULD YOU STAY THE NIGHT?" };

// ── The night's clock ────────────────────────────────────────────────────────────────────────────────

/** The kapre's cigar: how bright its ember is (a slow draw, then it fades), when it is there at all. */
export function emberAt(t: number) {
  const on = (t >= 18.6 && t < 22.0) || (t >= 28.6 && t < 32.6);
  if (!on) return 0;
  const draw = 0.5 + 0.5 * Math.sin((t - 18.6) * 2.4 - 1.2);
  return 0.35 + 0.65 * draw ** 3;
}
/** The kapre's eyes, 0…1. */
export const eyesAt = (t: number) => (t >= 28.9 && t < 32.6 ? smooth(28.9, 29.5, t) * (Math.sin(t * 2.3) > 0.97 ? 0.2 : 1) : 0);
/** The heart rate on the HUD. */
export const bpmAt = (t: number) => Math.round(track([[9.6, 74], [12.6, 76], [15.6, 92], [18.6, 104], [21.6, 118], [24.6, 126], [28.6, 146], [30.2, 172], [36.6, 178], [41, 150], [44, 118], [48, 92], [51, 80]], t));
