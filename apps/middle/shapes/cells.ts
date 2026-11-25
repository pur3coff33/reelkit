// Act 3, cells: mitochondria, once creatures of their own, swimming into a cell and staying; then the middle of everything,
// a human egg, with the small scales flowing in from one side and the large from the other.
import { smooth } from "../../../src/kit/looks/core";
import { PALETTE, frac, TAU, gaussOf, hash, kinds, paint, put, sphere, type Make, type Span } from "./make";

const P = PALETTE.cells;
const len = (s: Span) => s.to - s.from;

/** Mitochondria swimming in through the membrane of a tall cell, then staying, wriggling. */
const mito: Make = (s) => {
  const L = len(s), K = 6, CELL: [number, number, number] = [2.6, 4.2, 2.2];
  const place = (m: number, u: number): [number, number, number] => {
    const [ox, oy, oz] = sphere(hash(m + 1), hash(m + 2), 1), go = smooth(0, L * 0.6, u - m * 0.25);
    const inside: [number, number, number] = [(hash(m + 3) - 0.5) * 2.4, (hash(m + 4) - 0.5) * 5.2, (hash(m + 5) - 0.5) * 1.6];
    const out: [number, number, number] = [ox * 5.5, oy * 7.5, oz * 3];
    const w = 0.12 * Math.sin(u * 1.3 + m);
    return [out[0] + (inside[0] - out[0]) * go + w, out[1] + (inside[1] - out[1]) * go, out[2] + (inside[2] - out[2]) * go];
  };
  const bean = (m: number, v: [number, number, number], u: number): [number, number, number] => {
    const a = hash(m + 6) * TAU + 0.3 * Math.sin(u * 0.7 + m), b = hash(m + 7) * TAU + u * 0.2;
    const y = v[1] * Math.cos(a) - v[0] * Math.sin(a), x = v[1] * Math.sin(a) + v[0] * Math.cos(a);
    const c = place(m, u);
    return [c[0] + x * Math.cos(b) + v[2] * Math.sin(b), c[1] + y, c[2] - x * Math.sin(b) + v[2] * Math.cos(b)];
  };
  return kinds(s, [
    {
      // The membrane: two close skins, rippling.
      w: 0.3,
      make: (r) => [r(), r(), r() < 0.5 ? 1 : 0.94],
      life: (o, u, key) => {
        const [x, y, z] = sphere(o[0], o[1], o[2] * (1 + 0.025 * Math.sin(o[0] * 20 + u * 1.5)));
        put(o, x * CELL[0], y * CELL[1], z * CELL[2]);
        paint(o, P, 0.05 + 0.1 * key, 0.5);
      },
    },
    {
      w: 0.12,
      make: (r) => [r(), r(), r()],
      life: (o, u, key, ph) => {
        const [x, y, z] = sphere(o[0], o[1], 0.92 * Math.cbrt(o[2]));
        put(o, x * CELL[0] + 0.05 * Math.sin(u + ph), y * CELL[1], z * CELL[2]);
        paint(o, P, 0.85 + 0.1 * key, 0.32);
      },
    },
    {
      // The beans' skins.
      w: 0.36,
      make: (r) => [Math.floor(r() * K), r(), r()],
      life: (o, u) => {
        const m = o[0], [x, y, z] = sphere(o[1], o[2], 1), p = bean(m, [x * 0.38, y * 0.85, z * 0.38], u);
        put(o, ...p);
        paint(o, P, 0.45 + 0.05 * m, 1.05);
      },
    },
    {
      // The folds inside them.
      w: 0.22,
      make: (r) => [Math.floor(r() * K), Math.floor(r() * 7), r(), gaussOf(r)],
      life: (o, u) => {
        const m = o[0], f = o[1], k = o[2] * 2 - 1, y = -0.7 + (f / 6) * 1.4, x = k * 0.32 * Math.sqrt(Math.max(0, 1 - (y / 0.85) ** 2)), wav = 0.06 * Math.sin(k * 9 + u * 2 + f);
        put(o, ...bean(m, [x, y + wav, o[3] * 0.1], u));
        paint(o, P, 0.3, 1.5);
      },
    },
  ]);
};

/** The egg: corona, shell, living inside and its nucleus, with two streams flowing into it from left and right. */
const egg: Make = (s) => {
  const R = 1.9, CORONA = 150, SMALL = PALETTE.subatomic, LARGE = PALETTE.cosmic;
  const beat = (u: number) => 1 + 0.02 * Math.sin(u * 1.4);
  /** Turns a point about the upright axis. */
  const spin = (x: number, y: number, z: number, a: number): [number, number, number] => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
  return kinds(s, [
    {
      // The shell.
      w: 0.24,
      make: (r) => [r(), r(), r()],
      life: (o, u, key) => {
        const [x, y, z] = sphere(o[0], o[1], R * (0.94 + 0.06 * o[2]) * beat(u));
        put(o, x, y, z);
        paint(o, P, 0.02 + 0.05 * key, 1.05);
      },
    },
    {
      // The inside, grainy and alive.
      w: 0.22,
      make: (r) => [r(), r(), r()],
      life: (o, u, key, ph) => {
        // Slowly stirring: the middle turns faster than the edge.
        const f = Math.cbrt(o[2]), [x, y, z] = sphere(o[0], o[1], R * 0.9 * f * beat(u)), sw = 0.05 * Math.sin(u * 0.8 + ph);
        put(o, ...spin(x + sw, y + sw, z, u * (0.12 + 0.3 * (1 - f))));
        paint(o, P, 0.9 + 0.15 * key, 0.42);
      },
    },
    {
      w: 0.04,
      make: (r) => [gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        put(o, ...spin(0.45 + o[0] * 0.18, 0.4 + o[1] * 0.18, 0.4 + o[2] * 0.18, u * 0.12));
        paint(o, P, 0.15, 2 + 0.4 * Math.sin(u * 1.4));
      },
    },
    {
      // The corona: little cells round it.
      w: 0.24,
      make: (r) => [Math.floor(r() * CORONA), r(), r()],
      life: (o, u) => {
        const c = o[0], [cx, cy, cz] = sphere(hash(c), hash(c + 1), R + 0.35 + 0.45 * hash(c + 2)), [x, y, z] = sphere(o[1], o[2], 0.17), j = 0.04 * Math.sin(u * 2 + c);
        put(o, ...spin(cx * beat(u) + x + j, cy * beat(u) + y, cz * beat(u) + z, u * 0.12));
        paint(o, P, 0.25 + 0.2 * hash(c + 3), 0.75);
      },
    },
    {
      // Everything smaller pours down from above, everything larger rises from below, both spiralling into the egg.
      w: 0.28,
      make: (r) => [r() < 0.5 ? 1 : -1, r(), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const side = o[0], k = frac(o[1] + u * 0.1), e = 1 - k, a = o[2] * 6.283 + e * 5 * side + u * 0.3, rr = (0.12 + 1.25 * e) * (0.7 + 0.3 * o[2]);
        const spread = 0.04 + 0.18 * e;
        put(o, Math.cos(a) * rr + o[3] * spread, side * (R + 0.25 + 3.4 * e ** 1.15), Math.sin(a) * rr * 0.6 + o[4] * spread);
        paint(o, side > 0 ? SMALL : LARGE, key + u * 0.05, 1.7 * smooth(0, 0.12, k) * smooth(1, 0.88, k));
      },
    },
  ]);
};

export const CELLS: Record<string, Make> = { mito, egg };
