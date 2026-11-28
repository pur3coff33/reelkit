// "Leave the Light On": one small world, 2:00, no words but the title.
import type { Film } from "../../src/kit/looks/Film";
import { SECONDS, paint, preview } from "./story";
import { lowpolyPaint } from "./lowpoly";

export const FILM: Film = {
  seconds: SECONDS,
  music: true,
  bg: "#0b0a14",
  scenes: [{ from: 0, to: SECONDS, paint }],
  lines: [{ at: 117.9, to: 120.6, text: "Leave the Light On", voice: "paper", size: 92, y: 330 }],
};

/** Key moments, for checking the look before the long render. */
export const STILLS = [0.3, 5.6, 8.9, 11.5, 18.5, 24, 29, 33, 35.6, 43.5, 47, 50.5, 55.4, 61.6, 63.5, 66, 70, 74, 78, 82.5, 86.5, 94, 98, 102, 106, 116.3, 119.5];

export const PREVIEW: Film = { ...FILM, music: false, scenes: [{ from: 0, to: SECONDS, paint: preview }] };

/** The four shots used to compare the look before and after: the hook, the old dog, the dog seeing the lamp, the light. */
export const COMPARE = [0.3, 82.5, 87.5, 106];

/** The same film drawn in low-poly (lowpoly.ts): a test of the look and the speed. */
export const LOWPOLY: Film = { ...FILM, scenes: [{ from: 0, to: SECONDS, paint: lowpolyPaint }] };
export const LOWPOLY_STILLS = [0.3, 18, 87.5, 113];
