// What every scene's shape is built from. A scene's shape is made for its span of the film (`Make`), and moves by the
// seconds since its scene began (`local`), holding still a little before and after so it doesn't drift off while the
// points are elsewhere. A shape can have several kinds of point (`kinds`), each with its own life, without losing the
// life the way `join` would. Each act has its own palette. (Copied from apps/middle with this film's palettes.)
import { TAU, type RGB, type Rand } from "../../../src/kit/looks/core";
import { living, type Sampler } from "../../../src/kit/looks/dots/forms";
import type { Act } from "../timeline";

export type Span = { from: number; to: number };
export type Make = (span: Span) => Sampler;

/** Seconds into the scene, held 2 s before it starts and 2 s after it ends. */
export const local = (span: Span, t: number) => Math.min(Math.max(t - span.from, -2), span.to - span.from + 2);

/** A kind of point: `make` gives up to five numbers of its own, `life` turns them into x, y, z, r, g, b (all six, in place). */
export type Part = { w: number; make: (r: Rand) => number[]; life: (o: number[], u: number, key: number, phase: number) => void };

/** A shape of several kinds of point. `u` in each life is the seconds into the scene (see `local`). */
export function kinds(span: Span, parts: Part[]): Sampler {
  const total = parts.reduce((n, p) => n + p.w, 0);
  return living(
    (r) => {
      let k = r() * total, i = 0;
      while (i < parts.length - 1 && (k -= parts[i].w) > 0) i++;
      const v = parts[i].make(r);
      return { p: [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0], c: [v[3] ?? 0, v[4] ?? 0, i] };
    },
    (o, t, key, phase) => parts[Math.round(o[5])].life(o, local(span, t), key, phase),
  );
}

/** Each act's colours, as stops round a wheel. */
export const PALETTE: Record<Act, RGB[]> = {
  cosmos: [[0.25, 0.2, 1], [0.7, 0.3, 1], [1, 0.75, 0.3], [1, 0.4, 0.7]],
  ancient: [[0.05, 0.7, 0.65], [0.15, 0.9, 0.4], [0.7, 1, 0.3], [0.55, 0.3, 1]],
  trade: [[1, 0.72, 0.2], [1, 0.45, 0.12], [0.15, 0.85, 1], [0.75, 0.9, 1]],
  inside: [[1, 0.2, 0.75], [1, 0.6, 0.15], [0.1, 0.8, 1], [0.5, 0.2, 1]],
  forest: [[0.35, 0.85, 0.3], [1, 0.6, 0.2], [0.2, 0.5, 1], [0.2, 0.95, 0.85]],
  story: [[1, 0.5, 0.65], [0.8, 0.85, 1], [0.7, 0.55, 1], [1, 0.75, 0.6]],
};

/** Sets a point's colour to `c` times `gain`. */
export function tint(o: number[], c: RGB, gain: number) {
  for (let i = 0; i < 3; i++) o[3 + i] = Math.max(0, c[i] * gain);
}

/** Between two colours. */
export const blend = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** RGBs point `o` from a palette: `x` goes round the wheel once per 1, `gain` sets how bright. */
export function paint(o: number[], pal: RGB[], x: number, gain: number) {
  const n = pal.length, f = (((x % 1) + 1) % 1) * n, i = Math.floor(f) % n, k = f - Math.floor(f), s = k * k * (3 - 2 * k);
  const a = pal[i], b = pal[(i + 1) % n];
  for (let c = 0; c < 3; c++) o[3 + c] = Math.max(0, gain * (a[c] + (b[c] - a[c]) * s));
}

/** The fractional part, always 0…1 (unlike %, which goes negative before a scene starts). */
export const frac = (x: number) => x - Math.floor(x);

/** Sets a point's place. */
export function put(o: number[], x: number, y: number, z: number) {
  o[0] = x;
  o[1] = y;
  o[2] = z;
}

/** The same 0…1 for the same number, every time. */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** A point on a sphere from two 0…1 numbers. */
export function sphere(u: number, v: number, r = 1): [number, number, number] {
  const y = u * 2 - 1, a = v * TAU, s = Math.sqrt(Math.max(0, 1 - y * y));
  return [Math.cos(a) * s * r, y * r, Math.sin(a) * s * r];
}

/** Rough noise in 3D, about −1…1, smooth enough for clouds and continents. */
export const wave3 = (x: number, y: number, z: number) =>
  (Math.sin(x * 1.7 + Math.sin(y * 1.3 + 0.5) * 1.4) * Math.cos(z * 1.9 + Math.sin(x * 0.9) * 1.2) + 0.5 * Math.sin(y * 3.1 + z * 2.3 + Math.cos(x * 2.7)) + 0.25 * Math.sin(x * 5.3 - y * 4.1 + z * 3.7)) / 1.6;

export const gaussOf = (r: Rand) => (r() + r() + r() + r() - 2) / 1.15;
export { TAU };
