// What If? EP 07: a solo hiker takes a shortcut at sunset and gets lost after dark. What to do (S.T.O.P., stay put,
// shelter, whistle, save the phone) told as a fictional simulation. 60 s at 30 fps.
import type { Slam, Stamp, Words } from "../../src/kit/whatif/Reel";
import { track } from "../../src/kit/whatif/camp";

export const SECONDS = 60;

export const SHOTS = {
  hook: { from: 0, to: 3.6 },
  summit: { from: 3.6, to: 6.6 },
  fork: { from: 6.6, to: 9.6 },
  dusk: { from: 9.6, to: 12.6 },
  phone: { from: 12.6, to: 17 },
  gone: { from: 17, to: 20 },
  panic: { from: 20, to: 23 },
  stop: { from: 23, to: 26 },
  shelter: { from: 26, to: 31 },
  cold: { from: 31, to: 34 },
  whistle: { from: 34, to: 37 },
  off: { from: 37, to: 42 },
  waiting: { from: 42, to: 45 },
  search: { from: 45, to: 49 },
  found: { from: 49, to: 52 },
  final: { from: 52, to: SECONDS + 1 },
} as const;
export type ShotName = keyof typeof SHOTS;

export function shotAt(t: number): ShotName {
  for (const [name, s] of Object.entries(SHOTS)) if (t >= s.from && t < s.to) return name as ShotName;
  return "final";
}
export const local = (t: number, s: ShotName) => t - SHOTS[s].from;

export const HOOK = { at: 0.15, to: 3.5, lines: ["WHAT IF", "YOU GOT LOST", "ON A TRAIL", "AFTER DARK?"] };

export const WORDS: Words[] = [
  { at: 3.7, to: 6.5, text: "5:30 PM. One last photo at the top.", sub: "SUNSET IN 15 MINUTES" },
  { at: 6.7, to: 9.5, text: "A shortcut looks faster.", sub: "IT ISN'T ON THE MAP" },
  { at: 9.7, to: 12.5, text: "Under the trees, dark comes fast." },
  { at: 14.1, to: 16.9, text: "Phone light on.", sub: "LOW BATTERY. NO SIGNAL." },
  { at: 17.1, to: 19.9, text: "Then the path is gone." },
  { at: 20.1, to: 22.9, text: "The instinct: keep walking.", sub: "IT ONLY MAKES YOU HARDER TO FIND" },
  { at: 27.5, to: 30.9, text: "Stay put. Find shelter. Stay dry.", sub: "SIT ON YOUR PACK, NOT THE COLD GROUND" },
  { at: 31.1, to: 33.9, text: "Even 14°C is dangerous when you're wet.", sub: "WET CLOTHES PULL HEAT FROM YOUR BODY" },
  { at: 34.1, to: 36.9, text: "Three blasts on a whistle.", sub: "THE SIGNAL FOR HELP" },
  { at: 38.5, to: 41.9, text: "Phone off. Save the battery.", sub: "FOR WHEN SEARCHERS ARE CLOSE" },
  { at: 43.5, to: 44.9, text: "Then: lights in the trees." },
  { at: 45.1, to: 48.9, text: "Whistle. Phone light. The beams turn.", sub: "SHE HAD TOLD A FRIEND HER ROUTE" },
  { at: 49.1, to: 51.9, text: "Found. 600 m from the trail." },
];

export const STAMPS: Stamp[] = [
  { at: 12.6, to: 14, count: 6, unit: "PM", from: 5, label: "IT'S" },
  { at: 26, to: 27.4, count: 8, unit: "PM", from: 6, label: "IT'S" },
  { at: 37, to: 38.4, count: 11, unit: "PM", from: 8, label: "IT'S" },
  { at: 42, to: 43.4, count: 4, unit: "AM", from: 1, label: "IT'S" },
];

const GREEN = "#7dff8a";
export const SLAMS: Slam[] = [
  { at: 23.05, to: 25.9, text: "S.T.O.P.", size: 230, y: 650, tone: GREEN, sub: "STOP · THINK · OBSERVE · PLAN" },
  { at: 52.1, to: 55.4, text: "TELL SOMEONE YOUR ROUTE.", size: 96, y: 540, tone: GREEN },
  { at: 53.0, to: 55.4, text: "LOST? STAY PUT.", size: 130, y: 670 },
  { at: 53.9, to: 55.4, text: "CARRY A WHISTLE.", size: 112, y: 820, tone: GREEN },
];

export const QUESTION = { at: 55.5, text: "STAY PUT OR KEEP WALKING?" };

// ── Her night ────────────────────────────────────────────────────────────────────────────────────────

/** The phone, % battery; null while it's switched off. */
export function batteryAt(t: number): number | null {
  if (t >= 39.2 && t < 45.6) return null;
  return Math.round(track([[12.6, 24], [17, 21], [23, 17], [31, 13], [37, 11], [39.2, 10], [45.6, 9], [52, 8]], t));
}
/** The air, °C. */
export const tempAt = (t: number) => Math.round(track([[3.6, 19], [12.6, 18], [26, 16], [37, 14], [42, 13], [52, 14]], t));
/** Whistle blasts: three, twice. */
export const BLASTS = [34.4, 35.1, 35.8, 46.0, 46.6, 47.2];
