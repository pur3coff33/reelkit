// The trade. The deal: sunlight falling as gold onto a fan of a leaf, sugar spiralling down inside a root, and at its foot
// a crystal of stone with fungal threads boring into it, dissolving it into blue grains that spiral back up round the
// outside: two helices, gold down and blue up. The market: a mandala with the root at its heart and eight fungal
// partners round it like petals; the ones that pay well swell and blaze, the stingy ones wither to embers, and a ring
// round the edge fills like a dial: both sides keep score.
import { smooth } from "../../../src/kit/looks/core";
import { chooser, grow, on, reach, tips, type Twig, type V } from "./grow";
import { PALETTE, TAU, blend, frac, gaussOf, hash, kinds, put, sphere, tint, type Make } from "./make";

const P = PALETTE.trade;
const GOLD = P[0] as V, AMBER = P[1] as V, CYAN = P[2] as V, ICE = P[3] as V, LILAC: V = [0.72, 0.6, 1], EMBER: V = [0.55, 0.12, 0.08];
const len = (s: { from: number; to: number }) => s.to - s.from;

// ── The deal ───────────────────────────────────────────────────────────────────────────────────────────

const TOP = 1.95, FOOT = -0.75, STONE: V = [0, -1.75, 0];
/** Six threads from the root's foot, curving down into the stone and ending inside it. */
const BORE = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * TAU + 0.4, end: V = [STONE[0] + Math.cos(a) * 0.42, STONE[1] + 0.05 * Math.sin(a * 2), STONE[2] + Math.sin(a) * 0.42];
  return { a: [Math.cos(a) * 0.12, FOOT, Math.sin(a) * 0.12] as V, b: end, out: [Math.cos(a) * 0.75, FOOT - 0.55, Math.sin(a) * 0.75] as V };
});
/** A point on a bore thread: from the root's foot out round the stone and in. */
const bore = (i: number, k: number): V => {
  const B = BORE[i], q = 1 - k;
  return [0, 1, 2].map((c) => q * q * B.a[c] + 2 * q * k * B.out[c] + k * k * B.b[c]) as V;
};
/** The stone, an octahedron a little taller than wide, turning. */
function stone(f: number, a: number, b: number, u: number): [V, number] {
  const sx = f & 1 ? 1 : -1, sy = f & 2 ? 1 : -1, sz = f & 4 ? 1 : -1;
  let p = a, q = b;
  if (p + q > 1) [p, q] = [1 - p, 1 - q];
  const w = 1 - p - q, R = 0.95, x = sx * p * R, y = sy * q * R * 1.25, z = sz * w * R, spin = u * 0.12;
  const X = x * Math.cos(spin) + z * Math.sin(spin), Z = -x * Math.sin(spin) + z * Math.cos(spin);
  // Faces lit by a light from above left, so the facets read.
  const lit = 0.35 + 0.65 * Math.max(0, (-sx * Math.cos(spin) * 0.4 + sy * 0.8 + sz * 0.3) / 1.0);
  return [[STONE[0] + X, STONE[1] + y, STONE[2] + Z], lit];
}

const deal: Make = (s) =>
  kinds(s, [
    {
      // Sunlight, falling in gold streaks onto the leaf.
      w: 0.1,
      make: (r) => [r(), r(), r(), r()],
      life: (o, u, key) => {
        const x = (o[0] - 0.5) * 4.2, z = (o[1] - 0.5) * 1.5, k = frac(o[2] + u * (0.35 + 0.2 * o[3])), y = 5.2 - k * (5.2 - TOP - 0.45 - 0.4 * Math.cos(x * 0.7));
        put(o, x * (1 - 0.3 * k), y, z);
        tint(o, blend(GOLD, ICE, 0.3 * key), 0.6 * Math.sin(Math.PI * k) * (0.6 + 0.4 * o[3]));
      },
    },
    {
      // The leaf: a fan of veins over the root.
      w: 0.14,
      make: (r) => [r(), r() ** 0.7, gaussOf(r), r()],
      life: (o, u, key) => {
        const vein = o[3] < 0.6, a = (vein ? Math.round(o[0] * 14) / 14 : o[0]) * 2.6 - 1.3, d = o[1] * 1.35, breathe = 1 + 0.03 * Math.sin(u * 0.9);
        put(o, Math.sin(a) * d * 1.45 * breathe, TOP + Math.cos(a) * d * 0.75 * breathe, o[2] * 0.03 + 0.2 * d * Math.cos(a * 2));
        tint(o, blend([0.35, 0.95, 0.45], GOLD, d / 1.35), vein ? 0.55 : 0.14);
      },
    },
    {
      // The root: a pale tube, and sugar spiralling down inside it.
      w: 0.24,
      make: (r) => [r(), r(), r(), gaussOf(r)],
      life: (o, u, key, ph) => {
        const wall = o[0] < 0.3;
        if (wall) {
          const y = FOOT + (TOP - FOOT) * o[1], a = o[2] * TAU, R = 0.3 + 0.02 * Math.sin(y * 9);
          put(o, Math.cos(a) * R, y, Math.sin(a) * R);
          tint(o, blend(AMBER, ICE, 0.5), 0.16 + 0.1 * key);
          return;
        }
        const k = frac(o[1] + u * 0.2), y = TOP - (TOP - FOOT) * k, a = y * 5.5 + (o[2] < 0.5 ? 0 : Math.PI) - u * 0.6, R = 0.14 + 0.03 * o[3];
        put(o, Math.cos(a) * R, y, Math.sin(a) * R);
        tint(o, blend(GOLD, AMBER, 0.4 * key), 1.15 * (0.75 + 0.25 * Math.sin(ph + u * 3)) * smooth(0, 0.06, k) * smooth(1, 0.94, k));
      },
    },
    {
      // Minerals: grains leave the bore tips, come back along the threads and spiral up round the outside of the root.
      w: 0.22,
      make: (r) => [Math.floor(r() * 6), r(), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const i = o[0], k = frac(o[1] + u * 0.16), spread = 0.03;
        let p: V;
        if (k < 0.3) p = bore(i, 1 - k / 0.3);
        else {
          const h = (k - 0.3) / 0.7, y = FOOT + (TOP - 0.15 - FOOT) * h, a = -y * 4.2 + o[2] * TAU + u * 0.5, R = 0.5 + 0.06 * Math.sin(y * 3);
          p = [Math.cos(a) * R, y, Math.sin(a) * R];
        }
        put(o, p[0] + o[3] * spread, p[1] + o[4] * spread, p[2]);
        tint(o, blend(CYAN, ICE, 0.5 * key), 0.95 * smooth(0, 0.04, k) * smooth(1, 0.9, k));
      },
    },
    {
      // The stone, faceted, lilac and ice.
      w: 0.18,
      make: (r) => [Math.floor(r() * 8), r(), r(), r()],
      life: (o, u, key) => {
        const [p, lit] = stone(o[0], o[1], o[2], u), edge = Math.min(o[1], o[2], Math.abs(1 - o[1] - o[2])) < 0.03 ? 1 : 0;
        put(o, ...p);
        tint(o, blend(LILAC, ICE, 0.5 * key), (0.16 + 0.3 * lit) * (edge ? 2.2 : 1));
      },
    },
    {
      // The threads boring in, violet, their tips burning where the stone dissolves.
      w: 0.12,
      make: (r) => [Math.floor(r() * 6), r(), gaussOf(r), gaussOf(r), r()],
      life: (o, u, key, ph) => {
        const i = o[0], tip = o[4] < 0.25, k = tip ? 1 : o[1], p = bore(i, k), [sx, sy, sz] = tip ? sphere(o[1], o[4] * 4, 0.07) : [0, 0, 0];
        put(o, p[0] + sx + o[2] * 0.012, p[1] + sy + o[3] * 0.012, p[2] + sz);
        tint(o, tip ? blend(CYAN, ICE, key) : [0.62, 0.3, 1], tip ? 1.2 + 0.4 * Math.sin(u * 4 + ph) : 0.7);
      },
    },
  ]);

// ── The market ─────────────────────────────────────────────────────────────────────────────────────────

const C: V = [0, 0.45, 0];
/** How well each partner pays: the film's fungi, from generous to stingy. */
const PAYS = [1, 0.25, 0.85, 0.1, 0.95, 0.35, 0.7, 0.15];
const FAN: Twig[] = grow({ from: [0.55, 0, 0], dir: [1, 0, 0], len: 0.42, width: 0.04, levels: 6, spread: 0.36, shrink: 0.8, plane: "xy", seed: 21, run: 0.2 });
const pickFan = chooser(FAN, 3), FAN_TIPS = tips(FAN);
/** For each tip, the path from the middle of the root out through the twigs that lead to it. */
const PATHS: V[][] = FAN_TIPS.map((tip) => {
  const list: Twig[] = [];
  for (let id = tip.id; ; id = Math.floor(id / 2)) {
    const t = FAN.find((x) => x.id === id);
    if (!t) break;
    list.push(t);
  }
  return [[0.1, 0, 0], [0.55, 0, 0], ...list.reverse().map((t) => t.b)];
});

const market: Make = (s) => {
  const L = len(s), score = (u: number) => smooth(L * 0.2, L * 0.85, u);
  /** Partner i's point `p` (in its fan's frame, pointing along +x) to the scene: turned to its place, grown or shrunk by how it pays. */
  const fan = (i: number, p: V, u: number): V => {
    const g = PAYS[i], a = (i / 8) * TAU + 0.2 + u * 0.035, sc = 1 + (g - 0.5) * 0.85 * score(u), x = p[0] * sc, y = p[1] * sc * (1 + 0.12 * (g - 0.5) * score(u));
    return [C[0] + x * Math.cos(a) - y * Math.sin(a), C[1] + x * Math.sin(a) + y * Math.cos(a), p[2] + 0.15 * Math.sin(x * 2 + u * 0.4)];
  };
  const health = (i: number, u: number) => Math.max(0.1, 1 + (PAYS[i] - 0.5) * 1.6 * score(u));
  const hue = (i: number) => [GOLD, CYAN, AMBER, ICE][i % 4];
  return kinds(s, [
    {
      // The partners: each a fan of threads in its own colour; stingy ones going to embers.
      w: 0.4,
      make: (r) => [Math.floor(r() * 8), pickFan(r()), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const i = o[0], T = FAN[o[1]], p = on(T, o[2], o[3], o[4], o[3] * 0.5, 0.5);
        put(o, ...fan(i, p, u));
        const hp = health(i, u), dying = smooth(1, 0.3, hp);
        tint(o, blend(blend(hue(i), [1, 1, 1], 0.15 * key), EMBER, dying), 0.4 * Math.min(1.6, hp) + 0.15 * (T.depth / 6));
      },
    },
    {
      // What flows: sugar out from the root along the spokes and threads, minerals back in, more where it's paid for.
      w: 0.26,
      make: (r) => [Math.floor(r() * 8), Math.floor(r() * FAN_TIPS.length), r(), gaussOf(r), r()],
      life: (o, u, key) => {
        const i = o[0], path = PATHS[o[1]], out = o[4] < 0.5, k = frac(o[2] + (out ? 1 : -1) * u * 0.28);
        const f = k * (path.length - 1), j = Math.min(path.length - 2, Math.floor(f)), q = f - j, A = path[j], B = path[j + 1];
        put(o, ...fan(i, [A[0] + (B[0] - A[0]) * q, A[1] + (B[1] - A[1]) * q + o[3] * 0.015, 0], u));
        const hp = health(i, u), busy = smooth(0.4, 1.4, hp);
        tint(o, out ? blend(GOLD, AMBER, key * 0.5) : blend(CYAN, ICE, key * 0.5), (o[2] < 0.35 + 0.6 * busy ? 1 : 0) * (0.5 + 0.9 * busy) * Math.sin(Math.PI * k) ** 0.5);
      },
    },
    {
      // The root at the heart: rings of gold, turning.
      w: 0.14,
      make: (r) => [r(), r(), gaussOf(r)],
      life: (o, u, key) => {
        const ring = Math.floor(o[0] * 4), R = 0.12 + ring * 0.11, a = o[1] * TAU + u * (ring % 2 ? 0.3 : -0.25);
        put(o, C[0] + Math.cos(a) * R + o[2] * 0.008, C[1] + Math.sin(a) * R, o[2] * 0.02);
        tint(o, blend(GOLD, [1, 0.95, 0.8], ring / 4), 0.8 + 0.3 * key);
      },
    },
    {
      // The dial round the edge: each partner's arc fills as far as it pays.
      w: 0.2,
      make: (r) => [r(), gaussOf(r), r()],
      life: (o, u, key) => {
        const k = o[0], i = Math.floor(k * 8), local = k * 8 - i, a = (i / 8) * TAU + 0.2 + u * 0.035 + (local - 0.5) * (TAU / 8) * 0.86, tick = o[2] < 0.5;
        const R = 2.45 + (tick ? 0.05 * Math.sign(Math.sin(local * 60)) : 0);
        put(o, C[0] + Math.cos(a) * R + o[1] * 0.01, C[1] + Math.sin(a) * R, 0);
        const fill = local <= 0.15 + 0.85 * PAYS[i] * score(u);
        tint(o, fill ? hue(i) : [0.3, 0.3, 0.45], fill ? 0.85 : 0.12 + 0.05 * key);
      },
    },
  ]);
};

export const TRADE: Record<string, Make> = { deal, market };
