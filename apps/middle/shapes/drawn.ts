// Drawn shapes for the scenes that show a person or a body part, so nothing looks like a mannequin: the hand-drawn head
// profile (glow.ts's HEAD spline) filled with flowing points or engraved in contour lines, a thumbprint's whorl, the
// branching trees of the lungs, and an armillary of nested worlds for the start and the end.
import { HEAD, lineDist, spline, type P } from "../../../src/kit/looks/glow";
import { TAU, hash, sphere, wave3 } from "./make";

// ── The profile ────────────────────────────────────────────────────────────────────────────────────────

/** The head-and-shoulders profile, facing right, in glow's 1000-unit box. */
export const PROFILE: P[] = spline(HEAD, 8);
const box = PROFILE.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);

function inside(x: number, y: number) {
  let n = false;
  for (let i = 0, j = PROFILE.length - 1; i < PROFILE.length; j = i++) {
    const [xi, yi] = PROFILE[i], [xj, yj] = PROFILE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) n = !n;
  }
  return n;
}

/** A point inside the profile: [x, y] in its box, and its distance in from the edge (box units). `keep` can refuse it by
 * that distance, to draw contour lines; give up after 60 tries and take the last one inside. */
export function inProfile(r: () => number, keep: (d: number) => boolean = () => true): [number, number, number] {
  let last: [number, number, number] = [520, 600, 10];
  for (let i = 0; i < 60; i++) {
    const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
    if (!inside(x, y)) continue;
    const d = lineDist(x, y, PROFILE);
    last = [x, y, d];
    if (keep(d)) return last;
  }
  return last;
}

/** A point on the profile's edge. */
export function onProfile(k: number): [number, number] {
  const f = k * PROFILE.length, i = Math.floor(f) % PROFILE.length, j = (i + 1) % PROFILE.length, t = f - Math.floor(f);
  return [PROFILE[i][0] + (PROFILE[j][0] - PROFILE[i][0]) * t, PROFILE[i][1] + (PROFILE[j][1] - PROFILE[i][1]) * t];
}

/** Box units to scene units: `size` scene units per 1000, centred on the box's (520, 600), y up, then turned by `rot`. */
export function placeProfile(x: number, y: number, size: number, at: [number, number], rot = 0): [number, number] {
  const px = ((x - 520) / 1000) * size, py = (-(y - 600) / 1000) * size, c = Math.cos(rot), s = Math.sin(rot);
  return [at[0] + px * c - py * s, at[1] + px * s + py * c];
}

// ── A thumbprint ───────────────────────────────────────────────────────────────────────────────────────

/** A point on one of a thumbprint's ridges: a whorl round a core, pulled by a delta low on one side. [x, y, ridge phase]. */
export function onRidge(r: () => number): [number, number, number] {
  for (let i = 0; ; i++) {
    const x = (r() * 2 - 1) * 2.1, y = (r() * 2 - 1) * 2.9, e = (x / 2.1) ** 2 + (y / 2.9) ** 2;
    if (e > 1) continue;
    // A whorl in the middle that winds as a two-armed spiral; ridges that arch over it above and sag below; two deltas
    // where the patterns meet (each adds a ridge, so ridges split and end there); and small breaks along the ridges.
    const dx = x - 0.15, dy = (y - 0.35) * 0.82, rho = Math.hypot(dx, dy), th = Math.atan2(dy, dx), GAP = 0.12;
    const whorl = (TAU * rho) / GAP + 2 * th, arch = (TAU * (y + 0.28 * x * x * Math.tanh((y - 0.35) * 1.5))) / GAP;
    const b = Math.min(1, Math.max(0, (rho - 1) / 0.6)), blend = b * b * (3 - 2 * b);
    const phase = whorl * (1 - blend) + arch * blend + Math.atan2(y + 1.5, x + 1.15) + Math.atan2(y + 1.4, x - 1.35) + 0.6 * wave3(x * 0.8, y * 0.8, 2);
    const broken = wave3(x * 2.6, y * 2.6, 5) > 0.72;
    if ((Math.cos(phase) > 0.5 && !broken) || i > 40) return [x, y, e];
  }
}

// ── The lungs ──────────────────────────────────────────────────────────────────────────────────────────

export type Branch = { a: [number, number, number]; b: [number, number, number]; w: number; depth: number };

/** The airway: a windpipe splitting in two, and each branch splitting again, seven times over, in 3D. */
export const LUNGS: Branch[] = (() => {
  const out: Branch[] = [];
  const grow = (a: [number, number, number], dir: [number, number, number], len: number, w: number, depth: number, id: number) => {
    const b: [number, number, number] = [a[0] + dir[0] * len, a[1] + dir[1] * len, a[2] + dir[2] * len];
    out.push({ a, b, w, depth });
    if (depth >= 8) return;
    for (const side of [-1, 1]) {
      // Each split turns the branches apart in a plane that rolls round as they go down.
      const roll = depth * 1.3 + hash(id) * 0.8, spread = depth === 0 ? 0.62 : 0.42 + 0.15 * hash(id * 2 + side);
      const ax: [number, number, number] = [Math.cos(roll), 0, Math.sin(roll)];
      const c = Math.cos(spread * side), s = Math.sin(spread * side);
      // Rotate dir about ax by spread·side (Rodrigues), then let it sag outward and down.
      const d = dir, dot = ax[0] * d[0] + ax[1] * d[1] + ax[2] * d[2];
      const cr: [number, number, number] = [ax[1] * d[2] - ax[2] * d[1], ax[2] * d[0] - ax[0] * d[2], ax[0] * d[1] - ax[1] * d[0]];
      let nd: [number, number, number] = [d[0] * c + cr[0] * s + ax[0] * dot * (1 - c), d[1] * c + cr[1] * s + ax[1] * dot * (1 - c), d[2] * c + cr[2] * s + ax[2] * dot * (1 - c)];
      if (depth === 0) nd = [side * 0.75, -0.66, 0];
      nd[1] -= 0.18;
      const n = Math.hypot(...nd);
      grow(b, [nd[0] / n, nd[1] / n, nd[2] / n], len * (depth === 0 ? 0.62 : 0.8), w * 0.72, depth + 1, id * 2 + (side > 0 ? 1 : 0));
    }
  };
  grow([0, 3.6, 0], [0, -1, 0], 1.7, 0.2, 0, 1);
  return out;
})();
export const LUNG_WEIGHTS = (() => {
  const w = LUNGS.map((b) => Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]) * (0.4 + b.w * 4));
  const total = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return w.map((x) => (acc += x / total));
})();
export const pickBranch = (k: number) => {
  let lo = 0, hi = LUNG_WEIGHTS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (LUNG_WEIGHTS[mid] < k) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

// ── Nested worlds ──────────────────────────────────────────────────────────────────────────────────────

/** Which ring of the armillary, and where on it: the atom's orbits, a ring of DNA, a ring of cells, a planet's orbit, a
 * galaxy's disc, each a sphere bigger than the last, all turning round one seed. Returns a place before the ring's tilt. */
export function ringPoint(ring: number, a: number, b: number, c: number, u: number): [number, number, number] {
  const R = [0.55, 1.15, 1.75, 2.35, 3][ring];
  switch (ring) {
    case 0: {
      // Three orbits, crossed.
      const orbit = Math.floor(c * 3), th = a * TAU + u * 2.2, rx = R, ry = R * 0.35, x = Math.cos(th) * rx, y = Math.sin(th) * ry, q = (orbit * Math.PI) / 3;
      return [x * Math.cos(q) - y * Math.sin(q), x * Math.sin(q) + y * Math.cos(q), 0.03 * (b - 0.5)];
    }
    case 1: {
      // A double helix bent round into a hoop.
      const th = a * TAU, strand = c < 0.5 ? 0 : Math.PI, tw = th * 9 + u * 1.2 + strand, rr = 0.13;
      return [Math.cos(th) * (R + Math.cos(tw) * rr), Math.sin(th) * (R + Math.cos(tw) * rr), Math.sin(tw) * rr];
    }
    case 2: {
      // Cells strung round like pearls.
      const n = 22, cell = Math.floor(a * n), th = ((cell + 0.5) / n) * TAU + u * 0.25, [sx, sy, sz] = sphere(b, c, 0.12);
      return [Math.cos(th) * R + sx, Math.sin(th) * R + sy, sz];
    }
    case 3: {
      // An orbit, and its planet.
      const planet = c < 0.12, th = planet ? u * 0.9 : a * TAU;
      if (planet) {
        const [sx, sy, sz] = sphere(a, b, 0.14);
        return [Math.cos(th) * R + sx, Math.sin(th) * R + sy, sz];
      }
      return [Math.cos(th) * R, Math.sin(th) * R, 0.02 * (b - 0.5)];
    }
    default: {
      // A thin spiral disc.
      const arm = c < 0.5 ? 0 : Math.PI, d = 0.75 + 0.25 * b, th = a * TAU * 0.5 + arm + Math.log(d * 3) * 2.4 - u * 0.15;
      return [Math.cos(th) * R * d, Math.sin(th) * R * d, 0.04 * (c - 0.5)];
    }
  }
}

/** Each ring's own tilt, turning with time like the hoops of a gyroscope. */
export function tiltRing(ring: number, p: [number, number, number], u: number): [number, number, number] {
  const ax = [0.4, 1.3, 2.1, 0.9, 1.7][ring] + u * [0.21, -0.15, 0.11, -0.08, 0.05][ring], ay = [0.2, 0.9, -0.6, 1.4, -1.1][ring] + u * [0.13, 0.17, -0.1, 0.07, -0.04][ring];
  const y = p[1] * Math.cos(ax) - p[2] * Math.sin(ax), z = p[1] * Math.sin(ax) + p[2] * Math.cos(ax);
  return [p[0] * Math.cos(ay) + z * Math.sin(ay), y, -p[0] * Math.sin(ay) + z * Math.cos(ay)];
}
