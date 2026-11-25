// What the three looks (paper, box, dots) share: the frame, seeded chance, timing, and the painter every look becomes.
// A painter draws one whole frame from the time alone, so frames render in any order, and looks can share a film.
import { clamp01, smooth, type RGB, type V3 } from "../lowpoly/engine";

export { rng } from "../lowpoly/world";
export { clamp01, smooth };
export type { RGB, V3 };

export const W = 1080;
export const H = 1920;

export type Pen = CanvasRenderingContext2D;
/** Draws the frame at time t (seconds) over whatever is on the canvas. */
export type Painter = (g: Pen, t: number) => void;
export type Rand = () => number;

export const TAU = Math.PI * 2;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** 0 → 1 with a small overshoot at the end, for things that snap into place. */
export function backOut(x: number, over = 1.4) {
  const k = clamp01(x) - 1;
  return 1 + (over + 1) * k ** 3 + over * k ** 2;
}

/** Fades in over a→b and out over c→d. */
export const between = (t: number, a: number, b: number, c: number, d: number) => smooth(a, b, t) * (1 - smooth(c, d, t));

/** How open an eye is (0…1): opens at `open`, shuts for a moment at each of `blinks`, and shuts for good at `close`. */
export function eyelid(t: number, open: number, blinks: number[] = [], close = Infinity) {
  let k = smooth(open, open + 0.2, t);
  for (const b of blinks) k *= 1 - smooth(b, b + 0.07, t) + smooth(b + 0.13, b + 0.21, t);
  return clamp01(close === Infinity ? k : k * (1 - smooth(close, close + 0.25, t)));
}

/** Eased values at moments: [seconds, value], held before the first and after the last. */
export function keyed(list: [number, number][]) {
  return (t: number) => {
    const i = list.findIndex(([at]) => t < at);
    if (i === 0) return list[0][1];
    if (i < 0) return list[list.length - 1][1];
    const [a, x] = list[i - 1], [b, y] = list[i];
    return x + (y - x) * smooth(a, b, t);
  };
}

/** A lamp's unsteady brightness, around 1. */
export const flicker = (t: number, seed = 0) => 1 + 0.05 * Math.sin(t * 11 + seed) + 0.04 * Math.sin(t * 17.3 + 1 + seed * 2);

/** Bell-shaped chance around 0, mostly within ±1. */
export const gauss = (r: Rand) => (r() + r() + r() + r() - 2) / 1.15;

export function canvas(w = W, h = H) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Keeps the last few built things (cut sheets, point clouds), so a long film doesn't hold every scene in memory. */
export function keepLast<K extends object, T>(max: number, build: (k: K) => T) {
  const kept = new Map<K, T>();
  return (k: K) => {
    const v = kept.has(k) ? kept.get(k)! : build(k);
    kept.delete(k);
    kept.set(k, v);
    if (kept.size > max) kept.delete(kept.keys().next().value as K);
    return v;
  };
}
