// Act 2, molecules: water molecules tumbling and reaching for each other, DNA climbing past with its letters lighting up,
// and a molecular machine running along a strand while the chain it makes folds itself up.
import { smooth } from "../../../src/kit/looks/core";
import { PALETTE, frac, TAU, gaussOf, hash, kinds, paint, put, sphere, type Make, type Span } from "./make";

const P = PALETTE.molecules;
const len = (s: Span) => s.to - s.from;

/** Turns v about x by a, then about y by b. */
function turn(v: [number, number, number], a: number, b: number): [number, number, number] {
  const y = v[1] * Math.cos(a) - v[2] * Math.sin(a), z = v[1] * Math.sin(a) + v[2] * Math.cos(a);
  return [v[0] * Math.cos(b) + z * Math.sin(b), y, -v[0] * Math.sin(b) + z * Math.cos(b)];
}

/** Water: an oxygen and two hydrogens at 104.5°, tumbling, each one's hydrogen flickering towards a neighbour's oxygen. */
const water: Make = (s) => {
  const M = 26, HALF = (104.5 / 2) * (Math.PI / 180), BOND = 0.62;
  const centre = (m: number, u: number): [number, number, number] => [
    (hash(m) - 0.5) * 4.8 + 0.15 * Math.sin(u * 0.5 + m),
    (hash(m + 1) - 0.5) * 8.4 + 0.15 * Math.sin(u * 0.4 + m * 2),
    (hash(m + 2) - 0.5) * 3.6,
  ];
  const atom = (m: number, which: number, u: number): [number, number, number] => {
    const c = centre(m, u);
    if (!which) return c;
    const side = which === 1 ? -1 : 1, v = turn([Math.sin(HALF) * side * BOND, -Math.cos(HALF) * BOND, 0], hash(m + 3) * TAU + u * (0.4 + 0.5 * hash(m + 4)), hash(m + 5) * TAU + u * 0.3);
    return [c[0] + v[0], c[1] + v[1], c[2] + v[2]];
  };
  // Each molecule's nearest neighbour, for the hydrogen bond.
  const near = Array.from({ length: M }, (_, m) => {
    const c = centre(m, 0);
    let best = (m + 1) % M, d = Infinity;
    for (let n = 0; n < M; n++) {
      if (n === m) continue;
      const e = centre(n, 0), dd = (e[0] - c[0]) ** 2 + (e[1] - c[1]) ** 2 + (e[2] - c[2]) ** 2;
      if (dd < d) [d, best] = [dd, n];
    }
    return best;
  });
  return kinds(s, [
    {
      w: 0.72,
      make: (r) => [Math.floor(r() * M), r() < 0.55 ? 0 : r() < 0.5 ? 1 : 2, gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const m = o[0], which = o[1], a = atom(m, which, u), R = which ? 0.13 : 0.24;
        put(o, a[0] + o[2] * R, a[1] + o[3] * R, a[2] + o[4] * R);
        if (which) o[3] = o[4] = o[5] = 1.05;
        else paint(o, P, 0.02 + 0.05 * Math.sin(u + m), 1.3);
      },
    },
    {
      w: 0.28,
      make: (r) => [Math.floor(r() * M), r() < 0.5 ? 1 : 2, r()],
      life: (o, u) => {
        const m = o[0], which = o[1], a = atom(m, which, u), b = atom(near[m], 0, u), k = o[2];
        put(o, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
        // Dashed, and breaking and forming again.
        const on = Math.sin(u * (1.1 + hash(m * 3 + which)) + m) > -0.2 ? 1 : 0, dash = Math.sin(k * 40) > 0 ? 1 : 0.15;
        paint(o, P, 0.25, 0.8 * on * dash);
      },
    },
  ]);
};

/** DNA climbing past, turning, each rung a letter; light runs up it as if it were being read. */
const dna: Make = (s) => {
  const H = 11, N = 46, R = 1.15;
  const wrap = (y: number) => ((((y + H / 2) % H) + H) % H) - H / 2;
  const ang = (y: number, u: number) => y * 1.6 + u * 0.7;
  return kinds(s, [
    {
      w: 0.42,
      make: (r) => [r() < 0.5 ? 0 : 1, r(), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const y = wrap(o[1] * H - H / 2 + u * 0.45), a = ang(y, u) + (o[0] ? Math.PI * 0.78 : 0);
        put(o, Math.cos(a) * R + o[2] * 0.06, y + o[3] * 0.04, Math.sin(a) * R + o[2] * 0.06);
        const fade = smooth(H / 2, H / 2 - 1, Math.abs(y));
        paint(o, P, 0.25 + 0.04 * Math.sin(y), 1.1 * fade);
      },
    },
    {
      w: 0.48,
      make: (r) => [Math.floor(r() * N), r(), gaussOf(r)],
      life: (o, u) => {
        const n = o[0], y = wrap((n / N) * H - H / 2 + u * 0.45), a = ang(y, u), b = a + Math.PI * 0.78, k = o[1];
        const x = Math.cos(a) * R + (Math.cos(b) * R - Math.cos(a) * R) * k, z = Math.sin(a) * R + (Math.sin(b) * R - Math.sin(a) * R) * k;
        put(o, x, y + o[2] * 0.03, z);
        // A pair: each half its own letter's colour.
        const letter = Math.floor(hash(n) * 4), mine = k < 0.5 ? letter : 3 - letter, gapY = ((((y - ((u * 2.2) % H)) % H) + H * 1.5) % H) - H / 2, read = Math.exp(-(gapY ** 2) * 3);
        const fade = smooth(H / 2, H / 2 - 1, Math.abs(y));
        paint(o, P, mine / 4 + 0.12, (0.55 + 1.6 * read) * fade);
      },
    },
    {
      w: 0.1,
      make: (r) => [r(), r(), r()],
      life: (o, u, key, ph) => {
        put(o, (o[0] - 0.5) * 5.6 + 0.3 * Math.sin(u * 0.3 + ph), (frac(o[1] + u * 0.03) - 0.5) * 10, (o[2] - 0.5) * 4);
        paint(o, P, key, 0.4 * (0.5 + 0.5 * Math.sin(u * 2 + ph)));
      },
    },
  ]);
};

/** A machine runs along a strand reading it, and the chain it makes coils up and folds into a ball. */
const machines: Make = (s) => {
  const L = len(s), strandY = -2.7;
  const at = (u: number) => -1.9 + 3.8 * smooth(0, L, u);
  const strand = (x: number, u: number) => strandY + 0.12 * Math.sin(x * 2.4 + u);
  const grown = (u: number) => 0.6 + 7 * smooth(0, L * 0.95, u);
  return kinds(s, [
    {
      w: 0.22,
      make: (r) => [r(), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const x = (o[0] - 0.5) * 7.4;
        put(o, x, strand(x, u) + o[1] * 0.03, o[2] * 0.03);
        const read = smooth(0.4, 0, Math.abs(x - at(u)));
        paint(o, P, Math.floor(hash(Math.floor(x * 6)) * 4) / 4 + 0.1, 0.5 + 0.9 * read);
      },
    },
    {
      // The machine: a big part under the strand and a small one over it.
      w: 0.3,
      make: (r) => [r() < 0.62 ? 0 : 1, r(), r(), r()],
      life: (o, u, key) => {
        const big = o[0] === 0, [x, y, z] = sphere(o[1], o[2], 1), k = 0.75 + 0.25 * o[3], cx = at(u), cy = strandY + (big ? -0.45 : 0.42);
        const lump = 1 + 0.08 * Math.sin(x * 7 + y * 5 + u);
        put(o, cx + x * (big ? 0.95 : 0.65) * k * lump, cy + y * (big ? 0.6 : 0.42) * k * lump, z * (big ? 0.7 : 0.5) * k);
        paint(o, P, big ? 0.55 : 0.6, 0.85 + 0.2 * key);
      },
    },
    {
      // The chain: up out of the machine in a coil, then folding into a ball above it.
      w: 0.48,
      make: (r) => [r(), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const l = o[0] * grown(u), cx = at(u), COIL = 3.2;
        let x: number, y: number, z: number;
        if (l < COIL) [x, y, z] = [cx + 0.32 * Math.cos(l * 8), strandY + 0.9 + l * 1.1, 0.32 * Math.sin(l * 8)];
        else {
          // A crumpled path: a point every ninth of a unit along it, and the chain drawn between them.
          const f = (l - COIL) * 9, seg = Math.floor(f), k = f - seg, knot = (n: number) => sphere(hash(n), hash(n + 0.5), 1.15 * Math.cbrt(hash(n + 0.7)));
          const A = knot(seg), B = knot(seg + 1), bx = A[0] + (B[0] - A[0]) * k, by = A[1] + (B[1] - A[1]) * k, bz = A[2] + (B[2] - A[2]) * k;
          const sway = 0.1 * Math.sin(u + seg * 0.1);
          [x, y, z] = [cx * 0.7 + bx + sway, strandY + 0.9 + COIL * 1.1 + 1 + by, bz];
        }
        put(o, x + o[1] * 0.05, y + o[2] * 0.05, z + o[3] * 0.05);
        paint(o, P, 0.3 + 0.12 * (l / 7.6), 1.05);
      },
    },
  ]);
};

export const MOLECULES: Record<string, Make> = { water, dna, machines };
