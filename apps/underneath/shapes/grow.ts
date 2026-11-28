// Branching: every thread, root, tree and "little tree" in the film grows from this. A twig knows how far along the
// growth it starts and ends (0…1), so a shape can grow in over time, tip after tip, and light can run along it.
import { TAU, hash } from "./make";

export type V = [number, number, number];
export type Twig = { a: V; b: V; w: number; depth: number; id: number; start: number; end: number };

export type Growth = {
  from: V;
  dir: V;
  len: number;
  /** Thickness of the first twig; each split is `thin` times thinner. */
  width: number;
  levels: number;
  /** How far apart the two branches of a split turn, in radians. */
  spread: number;
  shrink?: number;
  thin?: number;
  /** Pulls every twig this way a little (gravity for roots, light for shoots). */
  pull?: V;
  /** Keeps every twig in a plane: "xy" (facing the camera) or "xz" (lying flat). Otherwise splits roll round in 3D. */
  plane?: "xy" | "xz";
  seed?: number;
  /** A twig may grow on without splitting, this often (0…1): longer runs, less like a diagram. */
  run?: number;
};

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a: V): V => mul(a, 1 / (Math.hypot(...a) || 1));
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** `d` turned by `ang` about the unit axis `k` (Rodrigues). */
export function turn(d: V, k: V, ang: number): V {
  const c = Math.cos(ang), s = Math.sin(ang), dot = k[0] * d[0] + k[1] * d[1] + k[2] * d[2], x = cross(k, d);
  return [d[0] * c + x[0] * s + k[0] * dot * (1 - c), d[1] * c + x[1] * s + k[1] * dot * (1 - c), d[2] * c + x[2] * s + k[2] * dot * (1 - c)];
}

/** A branching shape, root first. */
export function grow(g: Growth): Twig[] {
  const out: Twig[] = [], shrink = g.shrink ?? 0.78, thin = g.thin ?? 0.72, seed = g.seed ?? 1, run = g.run ?? 0;
  let longest = 0;
  const branch = (a: V, dir: V, len: number, w: number, depth: number, id: number, path: number) => {
    const d = g.pull ? unit(add(dir, mul(g.pull, 0.18))) : dir, b = add(a, mul(d, len));
    out.push({ a, b, w, depth, id, start: path, end: path + len });
    longest = Math.max(longest, path + len);
    if (depth >= g.levels) return;
    const h = (n: number) => hash(id * 7.31 + n * 13.7 + seed * 101.3);
    // Sometimes it grows on alone, bending a little, before it splits.
    if (h(9) < run) {
      const bend = g.plane === "xz" ? turn(d, [0, 1, 0], (h(10) - 0.5) * 0.5) : g.plane === "xy" ? turn(d, [0, 0, 1], (h(10) - 0.5) * 0.5) : turn(d, unit(cross(d, [h(11) - 0.5, h(12) - 0.5, h(13) - 0.5])), (h(10) - 0.5) * 0.5);
      return branch(b, unit(bend), len * 0.9, w * 0.92, depth + 1, id * 2 + 1, path + len);
    }
    for (const side of [-1, 1]) {
      const ang = side * g.spread * (0.65 + 0.7 * h(side + 2));
      let nd: V;
      if (g.plane === "xy") nd = turn(d, [0, 0, 1], ang);
      else if (g.plane === "xz") nd = turn(d, [0, 1, 0], ang);
      else {
        // An axis across the twig, rolled round it a different way at every split.
        const any: V = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], across = unit(cross(d, any)), ax = unit(turn(across, d, h(5) * TAU + depth * 1.3));
        nd = turn(d, ax, ang);
      }
      branch(b, unit(nd), len * shrink * (0.85 + 0.3 * h(side + 6)), w * thin, depth + 1, id * 2 + (side > 0 ? 1 : 0), path + len);
    }
  };
  branch(g.from, unit(g.dir), g.len, g.width, 0, 1, 0);
  for (const t of out) {
    t.start /= longest;
    t.end /= longest;
  }
  return out;
}

/** Picks twigs by length (and a little by thickness), so points spread evenly along a shape. */
export function chooser(twigs: Twig[], thick = 2) {
  const w = twigs.map((t) => Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1], t.b[2] - t.a[2]) * (0.3 + t.w * thick));
  const total = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  const cum = w.map((x) => (acc += x / total));
  return (k: number) => {
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < k) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
}

/** A point on a twig, `s` of the way along, pushed out by (gx, gy, gz) × its width. */
export function on(t: Twig, s: number, gx = 0, gy = 0, gz = 0, wide = 1): V {
  const w = t.w * wide;
  return [t.a[0] + (t.b[0] - t.a[0]) * s + gx * w, t.a[1] + (t.b[1] - t.a[1]) * s + gy * w, t.a[2] + (t.b[2] - t.a[2]) * s + gz * w];
}

/** How far through the whole growth a point `s` along twig `t` is (0…1). */
export const reach = (t: Twig, s: number) => t.start + (t.end - t.start) * s;

/** The tips: twigs that nothing grows from. */
export const tips = (twigs: Twig[]) => {
  const parents = new Set(twigs.map((t) => Math.floor(t.id / 2)));
  return twigs.filter((t) => !parents.has(t.id));
};
