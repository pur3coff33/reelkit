// 400 million years ago. The shore: a dark sea, rootless forked stems rising out of it (Aglaophyton-like, with spore cases
// at the tips) and mirrored in the water, and under the surface violet threads starting to weave between them: the
// partner. The cells: a honeycomb of plant cells, a fungal thread winding in through the walls, and in every cell it
// reaches a tiny tree of light blooming: the arbuscule, "little tree".
import { smooth } from "../../../src/kit/looks/core";
import { LAYOUT } from "../layout.gen";
import { chooser, grow, on, reach, tips, type Twig, type V } from "./grow";
import { PALETTE, TAU, blend, frac, gaussOf, hash, kinds, paint, put, sphere, tint, type Make } from "./make";

const P = PALETTE.ancient;
const VIOLET: V = [0.62, 0.32, 1], ROSE: V = [1, 0.4, 0.75], GOLD: V = [1, 0.8, 0.35];
const len = (s: { from: number; to: number }) => s.to - s.from;

// ── The shore ──────────────────────────────────────────────────────────────────────────────────────────

const SEA = -0.95;
/** Seven plants across the water, near and far: forked stems, equal splits, no leaves. */
const PLANTS = Array.from({ length: 8 }, (_, i) => {
  const x = -2.5 + i * 0.72 + (hash(i * 3 + 1) - 0.5) * 0.3, z = -0.6 - 2.6 * hash(i * 7 + 2) + (i % 2) * 0.5;
  const stems = grow({ from: [x, SEA - 0.05, z], dir: [(hash(i) - 0.5) * 0.35, 1, 0], len: 0.55 + 0.25 * hash(i * 5), width: 0.028, levels: 4, spread: 0.34, shrink: 0.86, thin: 0.85, pull: [0, 0.8, 0], seed: 7 + i, run: 0.25 });
  return { x, z, stems, pick: chooser(stems, 3), ends: tips(stems), delay: hash(i * 13) };
});

/** Threads under the water from one plant's base to another's, weaving. */
const PARTNER = Array.from({ length: 30 }, (_, n) => {
  const i = Math.floor(hash(n * 3.3) * PLANTS.length), j = (i + 1 + Math.floor(hash(n * 5.1) * 2)) % PLANTS.length, A = PLANTS[i], B = PLANTS[j];
  return { a: [A.x, SEA - 0.12, A.z] as V, b: [B.x, SEA - 0.12, B.z] as V, sag: 0.25 + 0.55 * hash(n * 7.7), wob: hash(n * 9.9) * TAU, at: hash(n * 2.2) };
});

const shore: Make = (s) => {
  const L = len(s), partner = (LAYOUT.beats.shore2 ?? s.from + L * 0.5) - s.from;
  /** How far each plant has risen out of the water. */
  const risen = (u: number, d: number) => 0.12 + 0.88 * smooth(-0.8 + d * 1.2, L * 0.42 + d * 1.2, u);
  const wave = (x: number, z: number, u: number) => 0.05 * Math.sin(x * 1.4 + z * 0.8 - u * 1.1) + 0.03 * Math.sin(z * 2.3 - x * 0.6 + u * 0.8);
  return kinds(s, [
    {
      // The sea: dark teal, lit along the crests.
      w: 0.3,
      make: (r) => [(r() - 0.5) * 12, -9 * r() ** 0.7 + 2.5],
      life: (o, u, key) => {
        const x = o[0], z = o[1], y = SEA + wave(x, z, u), crest = Math.max(0, Math.sin(x * 1.4 + z * 0.8 - u * 1.1));
        put(o, x, y, z);
        const far = Math.exp((z - 2.5) * 0.12);
        paint(o, P, 0.02 + 0.06 * key, (0.24 + 0.95 * crest ** 4) * far);
      },
    },
    {
      // The stems, rising out of it.
      w: 0.34,
      make: (r) => {
        const i = Math.floor(r() * PLANTS.length);
        return [i, PLANTS[i].pick(r()), r(), gaussOf(r), gaussOf(r)];
      },
      life: (o, u, key) => {
        const pl = PLANTS[o[0]], T = pl.stems[o[1]], k = o[2], g = risen(u, pl.delay), shown = reach(T, k) <= g;
        const p = on(T, shown ? k : 0, o[3], o[4], o[3] * 0.6, 0.5);
        // Unrisen points wait just under the surface, dark.
        put(o, p[0] + 0.02 * Math.sin(u * 0.8 + p[1] * 2) * (p[1] - SEA), shown ? p[1] : SEA - 0.1, p[2]);
        const tipward = T.depth / 4;
        tint(o, blend(P[1], P[2], tipward * 0.8 + 0.2 * key), shown ? 0.55 + 0.35 * tipward : 0);
      },
    },
    {
      // The spore cases at the tips, glowing as each stem gets there.
      w: 0.08,
      make: (r) => {
        const i = Math.floor(r() * PLANTS.length);
        return [i, Math.floor(r() * PLANTS[i].ends.length), r(), r(), r()];
      },
      life: (o, u, key, ph) => {
        const pl = PLANTS[o[0]], T = pl.ends[o[1]], [x, y, z] = sphere(o[2], o[3], 0.045 * Math.cbrt(o[4]));
        const lit = smooth(0.95, 1, risen(u, pl.delay));
        put(o, T.b[0] + x, lit ? T.b[1] + y * 1.8 + 0.04 : SEA - 0.1, T.b[2] + z);
        tint(o, blend(GOLD, P[2], key), lit * (0.9 + 0.3 * Math.sin(u * 2 + ph)));
      },
    },
    {
      // Their reflection, wavering.
      w: 0.13,
      make: (r) => {
        const i = Math.floor(r() * PLANTS.length);
        return [i, PLANTS[i].pick(r()), r(), gaussOf(r)];
      },
      life: (o, u, key) => {
        const pl = PLANTS[o[0]], T = pl.stems[o[1]], k = o[2], shown = reach(T, k) <= risen(u, pl.delay), p = on(T, k, o[3], 0, 0, 0.5);
        const depth = p[1] - SEA;
        put(o, p[0] + 0.06 * Math.sin(depth * 7 - u * 2.2) * depth, SEA - depth * 0.85, p[2]);
        tint(o, blend(P[0], P[1], 0.4 * key), shown ? 0.42 * Math.exp(-depth * 0.5) : 0);
      },
    },
    {
      // The partner: violet threads under the water, weaving in from "So they took a partner".
      w: 0.15,
      make: (r) => [Math.floor(r() * PARTNER.length), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const w = PARTNER[o[0]], k = o[1], m = 4 * k * (1 - k), grown = smooth(partner - 0.5 + w.at * 2, partner + 2.5 + w.at * 2, u);
        const x = w.a[0] + (w.b[0] - w.a[0]) * k + 0.18 * Math.sin(k * 9 + w.wob) * m, y = w.a[1] - w.sag * m + 0.05 * Math.sin(k * 14 + w.wob + u), z = w.a[2] + (w.b[2] - w.a[2]) * k + 0.2 * Math.cos(k * 7 + w.wob) * m;
        put(o, x + o[2] * 0.01, y + o[3] * 0.01, z);
        const run = Math.exp(-((frac(k * 1.5 - u * 0.3 + w.wob) - 0.5) ** 2) * 40);
        tint(o, blend(VIOLET, ROSE, run * 0.7 + 0.2 * key), k <= grown ? 0.5 + 0.8 * run : 0);
      },
    },
  ]);
};

// ── The cells ──────────────────────────────────────────────────────────────────────────────────────────

const RC = 0.85, ROWH = Math.sqrt(3) * RC;
/** The honeycomb: two layers of cells, the back one offset half a cell and further away. */
const CELLS: { c: V; layer: number; order: number; turn: number; ph: number }[] = [];
for (let layer = 0; layer < 2; layer++)
  for (let col = -3; col <= 3; col++)
    for (let row = -3; row <= 4; row++) {
      const x = col * 1.5 * RC + layer * 0.75 * RC, y = row * ROWH + (col % 2 ? ROWH / 2 : 0) + layer * ROWH * 0.5 - 0.2, z = -layer * 1.7;
      if (Math.abs(x) > 3.6 + layer * 0.8 || y < -4.3 || y > 4.6) continue;
      // The fungus comes in from the lower left, so the cells fill along the diagonal, a little out of order.
      const order = Math.min(1, Math.max(0, ((x + 3.6) / 7.2) * 0.5 + ((y + 4.3) / 8.9) * 0.5 + (hash(CELLS.length * 3.1) - 0.5) * 0.12));
      CELLS.push({ c: [x, y, z], layer, order, turn: Math.floor(hash(CELLS.length * 1.7) * 6), ph: hash(CELLS.length * 9.3) * TAU });
    }

/** The little tree in a cell: in through the wall from below, then splitting fast into a bush. */
const ARB: Twig[] = grow({ from: [0, -RC * 0.82, 0], dir: [0, 1, 0], len: 0.27, width: 0.022, levels: 6, spread: 0.62, shrink: 0.74, thin: 0.75, seed: 3, run: 0.1 });
const pickArb = chooser(ARB, 3);

/** A point in cell `ci`'s frame (turned to come in through one of its six walls) to the scene, with a slow breath. */
function inCell(ci: number, p: V, u: number): V {
  const C = CELLS[ci], a = (C.turn * TAU) / 6, c = Math.cos(a), s = Math.sin(a), b = 1 + 0.035 * Math.sin(u * 1.1 + C.ph);
  return [C.c[0] + (p[0] * c - p[1] * s) * b, C.c[1] + (p[0] * s + p[1] * c) * b, C.c[2] + p[2] * b];
}

/** Five threads winding up through the honeycomb from the lower left. */
const thread = (j: number, k: number): V => [-3.8 + 7.6 * k + 0.45 * Math.sin(k * 8 + j * 1.9), -4.4 + 9 * k + (j - 2) * 1.3 * (1 - k) - (j - 2) * 0.9 * k + 0.35 * Math.cos(k * 11 + j), 0.15 - 0.85 * (j % 2)];

const cells: Make = (s) => {
  const L = len(s);
  /** How far the fungus has come through the honeycomb (0…1.15 so the last cells finish). */
  const front = (u: number) => 0.08 + 1.07 * smooth(-0.6, L * 0.6, u);
  const bloom = (ci: number, u: number) => Math.min(1, Math.max(0, (front(u) - CELLS[ci].order) / 0.18));
  return kinds(s, [
    {
      // The walls: hexagons of green light, the back layer dimmer.
      w: 0.26,
      make: (r) => [Math.floor(r() * CELLS.length), Math.floor(r() * 6), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const ci = o[0], e = o[1], k = o[2], a0 = (e * TAU) / 6, a1 = ((e + 1) * TAU) / 6;
        const p: V = [RC * (Math.cos(a0) + (Math.cos(a1) - Math.cos(a0)) * k) + o[3] * 0.012, RC * (Math.sin(a0) + (Math.sin(a1) - Math.sin(a0)) * k) + o[4] * 0.012, (o[3] + o[4]) * 0.06];
        const C = CELLS[ci];
        put(o, ...inCell(ci, p, u));
        // Each cell's walls brighten as its little tree blooms.
        paint(o, P, 0.2 + 0.25 * key, (C.layer ? 0.25 : 0.55) * (0.8 + 0.7 * bloom(ci, u)));
      },
    },
    {
      // The little trees: gold at the trunk to magenta at the tips, growing in as the fungus reaches each cell.
      w: 0.58,
      make: (r) => [Math.floor(r() * CELLS.length), pickArb(r()), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key, ph) => {
        const ci = o[0], T = ARB[o[1]], k = o[2], g = bloom(ci, u), shown = reach(T, k) <= g, p = on(T, shown ? k : 0, o[3], o[4], o[3] * 0.8, 0.6);
        put(o, ...inCell(ci, p, u));
        const tipward = T.depth / 6, glow = 0.7 + 0.3 * Math.sin(u * 2.2 + ph + CELLS[ci].ph);
        tint(o, blend(GOLD, ROSE, tipward * 0.9 + 0.1 * key), shown ? (CELLS[ci].layer ? 0.7 : 1.9) * glow * (0.6 + 0.5 * tipward) : 0);
      },
    },
    {
      // The threads that bring it, their tips leading.
      w: 0.16,
      make: (r) => [Math.floor(r() * 5), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const j = o[0], k = o[1], p = thread(j, k), head = front(u) * 1.05;
        put(o, p[0] + o[2] * 0.015, p[1] + o[3] * 0.015, p[2]);
        const tip = Math.exp(-((k - head) ** 2) * 900);
        tint(o, blend(VIOLET, GOLD, tip), k <= head ? 0.55 + 1.4 * tip : 0);
      },
    },
  ]);
};

export const ANCIENT: Record<string, Make> = { shore, cells };
