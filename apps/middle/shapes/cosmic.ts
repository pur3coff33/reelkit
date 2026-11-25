// Act 6, cosmic: our galaxy turning, Andromeda pouring through it, the rivers of Laniakea, a flight through the cosmic
// web, the oldest light all around, the web become neurons, and the nested worlds from the start flying back together round the middle.
import { smooth } from "../../../src/kit/looks/core";
import { armillary } from "./subatomic";
import { PALETTE, frac, gaussOf, hash, kinds, paint, put, sphere, wave3, type Make, type Span } from "./make";

const P = PALETTE.cosmic;
const len = (s: Span) => s.to - s.from;

/** A spiral galaxy's points: [arm angle, distance, height] → a place in its own flat plane (x, y; z thin), turned by `spin`. */
function spiral(o: number[], spin: number, R: number): [number, number, number, number] {
  const d = o[1] * R, a = o[0] - spin, x = Math.cos(a) * d, y = Math.sin(a) * d;
  return [x, y, o[2] * 0.12 * Math.exp(-o[1] * 2), o[1]];
}
const spiralMake = (r: () => number) => {
  const arm = r() < 0.5 ? 0 : 1, d = 0.06 + 0.94 * r() ** 0.85, a = arm * Math.PI + Math.log(d * 4.8 + 0.4) * 2.2 + gaussOf(r) * (0.18 + 0.3 * r() * r());
  return [a, d, gaussOf(r), r()];
};

/** Our galaxy, seen at a slant so it stands tall in the frame, turning as one. */
const galaxy: Make = (s) =>
  kinds(s, [
    {
      w: 0.8,
      make: spiralMake,
      life: (o, u, key) => {
        const spark = o[3], [x, y, z, d] = spiral(o, u * 0.1, 4.9), tilt = 1.15;
        put(o, x * Math.cos(tilt) + z * Math.sin(tilt), y, -x * Math.sin(tilt) + z * Math.cos(tilt));
        const knot = spark > 0.97 ? 1 : 0;
        paint(o, P, knot ? 0.5 : 0.05 + 0.2 * d + 0.04 * key, (knot ? 1.6 : 0.4 + 0.9 * Math.exp(-d * 2.5)) * (0.7 + 0.5 * spark));
      },
    },
    {
      w: 0.2,
      make: (r) => [gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o) => {
        put(o, o[0] * 0.35, o[1] * 0.55, o[2] * 0.35);
        paint(o, P, 0.95, 1.4);
      },
    },
  ]);

/** Andromeda and the Milky Way passing through each other, their outer stars flung into tails. */
const andromeda: Make = (s) => {
  const L = len(s);
  const path = (g: number, u: number): [number, number, number] => {
    const k = smooth(-1, L + 1, u), from: [number, number, number] = g ? [1.6, -3.6, -0.5] : [-1.4, 3.4, 0.5], to: [number, number, number] = g ? [-1.2, 2.2, 0.3] : [1.1, -2.4, -0.3];
    return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k];
  };
  return kinds(s, [
    {
      w: 1,
      make: (r) => [r() < 0.5 ? 0 : 1, ...spiralMake(r)],
      life: (o, u, key) => {
        const g = o[0], q = [o[1], o[2], o[3]], [x, y, z, d] = spiral(q, u * 0.12 * (g ? -1 : 1), 2.3), c = path(g, u), c2 = path(g, u + 0.3);
        // The outer stars lag behind, in tails that curve away.
        const lag = 0.7 * d ** 2 * smooth(0, L * 0.6, u), vx = c2[0] - c[0], vy = c2[1] - c[1];
        const tilt = g ? 0.3 : -0.25;
        put(o, c[0] + x * Math.cos(tilt) - lag * vx * 8 + d * Math.sin(u * 0.3) * 0.2, c[1] + y - lag * vy * 8, c[2] + x * Math.sin(tilt) + z);
        paint(o, P, (g ? 0.62 : 0.08) + 0.15 * d + 0.03 * key, 0.45 + 1 * Math.exp(-d * 3));
      },
    },
  ]);
};

/** Laniakea: rivers of galaxies flowing in from every side towards one point. */
const laniakea: Make = (s) =>
  kinds(s, [
    {
      w: 0.9,
      make: (r) => [Math.floor(r() * 46), r(), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const n = o[0], k = frac(o[1] + u * 0.07), [sx, sy, sz] = sphere(hash(n), hash(n + 1), 1), e = 1 - k;
        const r = 0.25 + 6.5 * e ** 1.4, a = Math.atan2(sz, sx) + 1.6 * k ** 2, h = Math.asin(Math.max(-1, Math.min(1, sy))) * (0.4 + 0.6 * e);
        const spread = 0.05 + 0.32 * e;
        put(o, Math.cos(a) * Math.cos(h) * r * 0.75 + o[2] * spread, Math.sin(h) * r * 1.2 + o[3] * spread, Math.sin(a) * Math.cos(h) * r * 0.75 + o[4] * spread);
        paint(o, P, 0.15 + 0.8 * k ** 2 + 0.03 * key, (0.35 + 1.1 * k ** 2) * smooth(0, 0.08, k));
      },
    },
    {
      w: 0.1,
      make: (r) => [gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        put(o, o[0] * 0.3, o[1] * 0.3, o[2] * 0.3);
        paint(o, P, 0.95, 1.6 + 0.2 * Math.sin(u * 2));
      },
    },
  ]);

/** The web's knots, shared with the neurons so one can become the other. */
const NODES = Array.from({ length: 64 }, (_, i): [number, number, number] => [(hash(i * 3.3) - 0.5) * 12, (hash(i * 3.3 + 1) - 0.5) * 16, (hash(i * 3.3 + 2) - 0.5) * 20]);
const LINKS = NODES.flatMap((a, i) =>
  NODES.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2] as const)
    .filter(([j]) => j !== i)
    .sort((x, y) => x[1] - y[1])
    .slice(0, 3)
    .map(([j]) => [i, j] as const),
);

/** The cosmic web, flown through: knots of galaxies, and threads between them. */
const web: Make = (s) => {
  // Squeezed nearer than the knots' plan, so the web fills the frame instead of fading into the distance.
  const DEPTH = 12, fly = (z: number, u: number) => ((((z * 0.6 + u * 1.1 + DEPTH / 2) % DEPTH) + DEPTH) % DEPTH) - DEPTH / 2 - 1.5, S = 0.7;
  return kinds(s, [
    {
      w: 0.68,
      make: (r) => [Math.floor(r() * LINKS.length), r(), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const link = o[0], [i, j] = LINKS[link], a = NODES[i], b = NODES[j], k = o[1], thick = 0.06 + 0.12 * Math.sin(Math.PI * k) * (0.5 + hash(link));
        const sag = 0.6 * Math.sin(Math.PI * k);
        const z = a[2] + (b[2] - a[2]) * k;
        put(o, (a[0] + (b[0] - a[0]) * k + sag * 0.3) * S + o[2] * thick, (a[1] + (b[1] - a[1]) * k + sag) * S + o[3] * thick, fly(z + o[4] * thick, u));
        const clump = 0.6 + 0.6 * Math.max(0, wave3(k * 9 + link, 0, 1));
        paint(o, P, 0.55 + 0.15 * k + 0.05 * key, 1.9 * clump);
      },
    },
    {
      w: 0.32,
      make: (r) => [Math.floor(r() * NODES.length), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const c = NODES[o[0]], R = 0.25 + 0.25 * hash(o[0] + 5);
        put(o, c[0] * S + o[1] * R, c[1] * S + o[2] * R, fly(c[2] + o[3] * R, u));
        paint(o, P, 0.95 + 0.05 * key, 2.4);
      },
    },
  ]);
};

/** The oldest light: the whole sky's first glow drawn as a mottled globe of warm and cool patches, slowly turning. */
const firstlight: Make = (s) =>
  kinds(s, [
    {
      w: 1,
      make: (r) => [r(), r()],
      life: (o, u, key) => {
        const [x, y, z] = sphere(o[0], o[1], 1), a = u * 0.04, xx = x * Math.cos(a) + z * Math.sin(a), zz = -x * Math.sin(a) + z * Math.cos(a);
        const g = wave3(xx * 3.2, y * 3.2, zz * 3.2) + 0.5 * wave3(xx * 7, y * 7 + 1, zz * 7);
        put(o, xx * 3.3, y * 3.3, zz * 3.3);
        const warm = g > 0;
        o[3] = warm ? 1 : 0.25;
        o[4] = warm ? 0.55 : 0.45;
        o[5] = warm ? 0.25 : 1;
        const gain = (0.7 + 1.2 * Math.abs(g)) * (0.85 + 0.15 * key);
        for (let c = 3; c < 6; c++) o[c] *= gain;
      },
    },
  ]);

/** Neurons where the web's knots were, their branches lit by pulses running out from each cell. */
const neurons: Make = (s) => {
  const SOMA = NODES.slice(0, 64).map((n): [number, number, number] => [n[0] * 0.24, n[1] * 0.27, n[2] * 0.15]).filter((n) => Math.abs(n[0]) < 2.4 && Math.abs(n[1]) < 4.2).slice(0, 12);
  // Each cell: 7 branches of 6 steps, wandering outwards.
  const STEPS = 6, BR = 7;
  const branch = (c: number, b: number, k: number): [number, number, number] => {
    const p: [number, number, number] = [...SOMA[c]], f = k * STEPS, n = Math.floor(f);
    const [dx, dy, dz] = sphere(hash(c * 7 + b), hash(c * 7 + b + 0.3), 1);
    for (let i = 0; i <= Math.min(n, STEPS - 1); i++) {
      const [wx, wy, wz] = sphere(hash(c * 31 + b * 7 + i), hash(c * 31 + b * 7 + i + 0.5), 0.28), part = i < n ? 1 : f - n;
      p[0] += (dx * 0.3 + wx) * part;
      p[1] += (dy * 0.3 + wy) * part;
      p[2] += (dz * 0.3 + wz) * part;
    }
    return p;
  };
  return kinds(s, [
    {
      w: 0.78,
      make: (r) => [Math.floor(r() * SOMA.length), Math.floor(r() * BR), r(), gaussOf(r)],
      life: (o, u, key) => {
        const c = o[0], b = o[1], k = o[2], q = branch(c, b, k), w = 0.03 * (1 - k * 0.7);
        put(o, q[0] + o[3] * w, q[1] + o[3] * w, q[2]);
        const gap = ((((k * 3 - u * 1.4 - hash(c + b * 0.1) * 3) % 3) + 3) % 3) - 1.5, pulse = Math.exp(-(gap ** 2) * 8);
        paint(o, P, 0.55 + 0.4 * pulse + 0.03 * key, 0.45 + 1.8 * pulse);
      },
    },
    {
      w: 0.22,
      make: (r) => [Math.floor(r() * SOMA.length), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const c = SOMA[o[0]], R = 0.14 * (1 + 0.1 * Math.sin(u * 3 + o[0]));
        put(o, c[0] + o[1] * R, c[1] + o[2] * R, c[2] + o[3] * R);
        paint(o, P, 0.95, 1.5);
      },
    },
  ]);
};

export const COSMIC: Record<string, Make> = { galaxy, andromeda, laniakea, web, firstlight, neurons, end: armillary(true) };
