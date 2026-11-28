// The forest. Hubs: the forest floor seen from underneath, as a map of light: every tree a rosette of roots, old ones big,
// young ones small, and one fungus's threads lighting from the hub tree out to nineteen others one by one as he counts
// them, then light running from the hubs to the young. Carbon: one tree as an hourglass, air drawn into its crown,
// gold pouring down its trunk and filling its roots. Story: a mother tree and a seedling engraved in fine lines, drawn
// twice: one picture with a thread of light between them, one without, the film flickering between the two readings.
import { smooth } from "../../../src/kit/looks/core";
import { LAYOUT } from "../layout.gen";
import { chooser, grow, on, reach, tips, type Twig, type V } from "./grow";
import { PALETTE, TAU, blend, frac, gaussOf, hash, kinds, put, tint, type Make, type Span } from "./make";

const P = PALETTE.forest;
const MOSS = P[0] as V, AMBER = P[1] as V, BLUE = P[2] as V, CYAN = P[3] as V, GOLD: V = [1, 0.78, 0.3], LIME: V = [0.6, 1, 0.35];
const len = (s: Span) => s.to - s.from;
const said = (s: Span, id: string) => (LAYOUT.beats[id] ?? s.from) - s.from;
const saying = (id: string) => LAYOUT.seconds[id] ?? 4;

// ── Hubs ───────────────────────────────────────────────────────────────────────────────────────────────

type Root = { at: V; size: number; old: boolean; twigs: Twig[]; pick: (k: number) => number };
const rosette = (at: V, size: number, seed: number): Twig[] =>
  Array.from({ length: 7 }, (_, j) => {
    const a = (j / 7) * TAU + hash(seed + j) * 0.6;
    return grow({ from: at, dir: [Math.cos(a), Math.sin(a), 0], len: 0.09 * size, width: 0.02 * size, levels: size > 1.5 ? 5 : 3, spread: 0.5, shrink: 0.8, plane: "xy", seed: seed * 10 + j, run: 0.3 });
  }).flat();

/** The hub, four more old trees, and twenty young ones in the gaps. */
const TREES: Root[] = (() => {
  const old: [number, number, number][] = [[0.1, 0.55, 2.6], [-1.75, 2.0, 1.8], [1.85, 1.95, 1.7], [-1.9, -1.15, 1.9], [1.75, -1.25, 1.6]];
  const out: Root[] = old.map(([x, y, size]) => ({ at: [x, y, 0] as V, size, old: true, twigs: [], pick: () => 0 }) as Root);
  for (let n = 0; out.length < 25 && n < 900; n++) {
    const at: V = [(hash(n * 1.3) - 0.5) * 5.4, -2.1 + hash(n * 2.9) * 5.0, (hash(n * 4.1) - 0.5) * 0.6];
    if (out.every((t) => Math.hypot(t.at[0] - at[0], t.at[1] - at[1]) > 0.55 + 0.18 * t.size)) out.push({ at, size: 0.7 + 0.35 * hash(n * 7.7), old: false, twigs: [], pick: () => 0 });
  }
  out.forEach((t, i) => {
    t.twigs = rosette(t.at, t.size, i + 3);
    t.pick = chooser(t.twigs, 3);
  });
  return out;
})();
/** The hub's fungus: threads to nineteen trees, nearest first. The other fungi link a few neighbours each. */
const HUB_LINKS = TREES.slice(1)
  .map((t, i) => ({ to: i + 1, d: Math.hypot(t.at[0] - TREES[0].at[0], t.at[1] - TREES[0].at[1]) }))
  .sort((a, b) => a.d - b.d)
  .slice(0, 19)
  .map((l, order) => ({ from: 0, to: l.to, order, bow: (hash(l.to * 3) - 0.5) * 0.5 }));
const OTHER_LINKS = Array.from({ length: 22 }, (_, n) => {
  const a = 1 + Math.floor(hash(n * 5.5) * 4), b = 5 + Math.floor(hash(n * 6.6) * (TREES.length - 5));
  return { from: a, to: b, order: 0, bow: (hash(n * 8.8) - 0.5) * 0.6 };
});
type Link = (typeof HUB_LINKS)[number];
const linkAt = (l: Link, k: number): V => {
  const A = TREES[l.from].at, B = TREES[l.to].at, dx = B[0] - A[0], dy = B[1] - A[1], m = Math.sin(Math.PI * k) * l.bow;
  return [A[0] + dx * k - dy * m, A[1] + dy * k + dx * m, A[2] + (B[2] - A[2]) * k];
};

const hubs: Make = (s) => {
  const count = said(s, "hub1"), countFor = saying("hub1") * 0.85, young = said(s, "hub2") + 1;
  /** When link n lights: one after another through "…as many as nineteen trees". */
  const lit = (n: number, u: number) => smooth(count + 0.4 + (n / 19) * countFor, count + 0.9 + (n / 19) * countFor, u);
  const drift = (p: V, u: number): V => [p[0] + 0.02 * Math.sin(u * 0.4 + p[1]), p[1] + 0.02 * Math.cos(u * 0.35 + p[0]), p[2]];
  return kinds(s, [
    {
      // The trees: rosettes of roots, old ones amber and big, young ones small and lime.
      w: 0.42,
      make: (r) => {
        const i = Math.floor(r() ** 0.8 * TREES.length);
        return [i, TREES[i].pick(r()), r(), gaussOf(r), gaussOf(r)];
      },
      life: (o, u, key, ph) => {
        const tr = TREES[o[0]], T = tr.twigs[o[1]], p = on(T, o[2], o[3], o[4], 0, 0.5);
        put(o, ...drift(p, u));
        const grownUp = smooth(young, young + 2.5, u), glow = tr.old ? 0.55 + 0.15 * Math.sin(u * 0.8 + ph) : 0.3 + 0.55 * grownUp;
        tint(o, tr.old ? blend(AMBER, GOLD, 0.3 * key) : blend(MOSS, LIME, grownUp), glow * (1 - 0.4 * (T.depth / 5)));
      },
    },
    {
      // The hub's fungus: nineteen threads, lit one by one, then carrying light out to the young.
      w: 0.32,
      make: (r) => [Math.floor(r() * 19), r(), gaussOf(r), r()],
      life: (o, u, key) => {
        const l = HUB_LINKS[o[0]], k = o[1], p = linkAt(l, k), shown = lit(l.order, u);
        put(o, ...drift([p[0] + o[2] * 0.01, p[1] + o[2] * 0.01, p[2]], u));
        const run = smooth(young - 1, young + 1, u) * Math.exp(-((frac(k - u * 0.35 + o[3] * 0.05) - 0.5) ** 2) * 50);
        tint(o, blend(CYAN, GOLD, run), k <= shown ? 0.6 + 1.2 * run + 0.6 * (1 - smooth(0, 1.2, u - (count + 0.9 + (l.order / 19) * countFor))) : 0);
      },
    },
    {
      // Other fungi, other threads: a fainter web in blue behind.
      w: 0.14,
      make: (r) => [Math.floor(r() * OTHER_LINKS.length), r(), gaussOf(r)],
      life: (o, u, key) => {
        const p = linkAt(OTHER_LINKS[o[0]], o[1]);
        put(o, ...drift([p[0] + o[2] * 0.01, p[1], p[2] - 0.3], u));
        tint(o, blend(BLUE, [0.55, 0.3, 1], key), 0.3);
      },
    },
    {
      // The crowns overhead, as faint rings: we're looking up from under the forest floor.
      w: 0.12,
      make: (r) => [Math.floor(r() * 5), r(), gaussOf(r)],
      life: (o, u, key) => {
        const tr = TREES[o[0]], a = o[1] * TAU, R = 0.45 * tr.size + 0.03 * o[2];
        put(o, tr.at[0] + Math.cos(a) * R, tr.at[1] + Math.sin(a) * R, -1.6);
        tint(o, blend(MOSS, [0.7, 0.85, 1], 0.5), 0.15 + 0.05 * key);
      },
    },
  ]);
};

// ── Carbon ─────────────────────────────────────────────────────────────────────────────────────────────

const NECK = -0.25, CROWN_AT = 0.85;
const CROWN = grow({ from: [0, CROWN_AT, 0], dir: [0, 1, 0], len: 0.5, width: 0.07, levels: 7, spread: 0.55, shrink: 0.79, thin: 0.72, pull: [0, 0.5, 0], seed: 5, run: 0.1 });
const ROOTS = grow({ from: [0, NECK, 0], dir: [0, -1, 0], len: 0.46, width: 0.08, levels: 7, spread: 0.62, shrink: 0.8, thin: 0.72, pull: [0, -0.35, 0], seed: 9, run: 0.15 });
const pickCrown = chooser(CROWN, 4), pickRoot = chooser(ROOTS, 4), CROWN_TIPS = tips(CROWN), ROOT_TIPS = tips(ROOTS);
/** For each root tip, the way down to it from the neck. */
const ROOT_PATHS: V[][] = ROOT_TIPS.map((tip) => {
  const list: Twig[] = [];
  for (let id = tip.id; ; id = Math.floor(id / 2)) {
    const t = ROOTS.find((x) => x.id === id);
    if (!t) break;
    list.push(t);
  }
  return [[0, CROWN_AT + 0.6, 0], [0, NECK, 0], ...list.reverse().map((t) => t.b)];
});
const alongPath = (path: V[], k: number): V => {
  const f = k * (path.length - 1), j = Math.min(path.length - 2, Math.floor(f)), q = f - j, A = path[j], B = path[j + 1];
  return [A[0] + (B[0] - A[0]) * q, A[1] + (B[1] - A[1]) * q, A[2] + (B[2] - A[2]) * q];
};

const carbon: Make = (s) => {
  const L = len(s), fill = (u: number) => smooth(0.3, L * 0.8, u);
  const turn = (p: V, u: number): V => {
    const a = u * 0.1, c = Math.cos(a), sn = Math.sin(a);
    return [p[0] * c + p[2] * sn, p[1], -p[0] * sn + p[2] * c];
  };
  return kinds(s, [
    {
      // The crown and trunk: green, breathing in.
      w: 0.27,
      make: (r) => [pickCrown(r()), r(), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const T = CROWN[o[0]], p = on(T, o[1], o[2], o[3], o[4], 0.5);
        put(o, ...turn(p, u));
        tint(o, blend(MOSS, LIME, (T.depth / 7) * 0.7 + 0.2 * key), 0.35 + 0.25 * (T.depth / 7));
      },
    },
    {
      // The trunk, joining the two halves.
      w: 0.05,
      make: (r) => [r(), r(), gaussOf(r)],
      life: (o, u, key) => {
        const y = NECK + (CROWN_AT - NECK) * o[0], a = o[1] * TAU, R = 0.07 + 0.03 * Math.abs(y - (NECK + CROWN_AT) / 2);
        put(o, ...turn([Math.cos(a) * R, y, Math.sin(a) * R], u));
        tint(o, blend(AMBER, GOLD, key), 0.4);
      },
    },
    {
      // Air, drawn into the crown from all round.
      w: 0.16,
      make: (r) => [Math.floor(r() * CROWN_TIPS.length), r(), r(), r()],
      life: (o, u, key) => {
        const tip = CROWN_TIPS[o[0]].b, k = frac(o[1] + u * 0.13), a = o[2] * TAU, h = (o[3] - 0.3) * 4, far: V = [Math.cos(a) * 3.8, 1.6 + h, Math.sin(a) * 3.8];
        const e = k * k;
        put(o, ...turn([far[0] + (tip[0] - far[0]) * e, far[1] + (tip[1] - far[1]) * e, far[2] + (tip[2] - far[2]) * e], u));
        tint(o, blend([0.6, 0.8, 1], LIME, k), 0.95 * Math.sin(Math.PI * k));
      },
    },
    {
      // The gold: down the trunk and out along the roots to every tip.
      w: 0.24,
      make: (r) => [Math.floor(r() * ROOT_PATHS.length), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const path = ROOT_PATHS[o[0]], k = frac(o[1] + u * 0.12), p = alongPath(path, k);
        put(o, ...turn([p[0] + o[2] * 0.02, p[1] + o[3] * 0.02, p[2]], u));
        tint(o, blend(GOLD, AMBER, key * 0.6), 1.1 * smooth(0, 0.08, k) * smooth(1, 0.9, k));
      },
    },
    {
      // The roots and their fungi, filling with light from the neck down.
      w: 0.3,
      make: (r) => [pickRoot(r()), r(), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const T = ROOTS[o[0]], k = o[1], p = on(T, k, o[2], o[3], o[4], 0.5), full = reach(T, k) <= fill(u) * 1.1;
        put(o, ...turn(p, u));
        tint(o, full ? blend(AMBER, [1, 0.45, 0.3], (T.depth / 7) * 0.6 + 0.2 * key) : [0.35, 0.3, 0.5], full ? 0.75 : 0.18);
      },
    },
    {
      // The fungi round the root tips: short threads fanning out, glowing as the gold reaches them.
      w: 0.12,
      make: (r) => [Math.floor(r() * ROOT_TIPS.length), r(), r(), r(), gaussOf(r)],
      life: (o, u, key) => {
        const T = ROOT_TIPS[o[0]], k = o[1], a = o[2] * TAU, b = (o[3] - 0.5) * 2, reachK = 0.05 + 0.3 * k;
        const p: V = [T.b[0] + Math.cos(a) * reachK * Math.sqrt(1 - b * b), T.b[1] + b * reachK * 0.6 - 0.05 * k, T.b[2] + Math.sin(a) * reachK * Math.sqrt(1 - b * b)];
        put(o, ...turn([p[0] + o[4] * 0.01, p[1], p[2]], u));
        tint(o, blend([1, 0.45, 0.7], [0.65, 0.4, 1], key), (0.15 + 0.55 * fill(u)) * (1 - 0.6 * k));
      },
    },
  ]);
};

// ── The story, and the doubt ───────────────────────────────────────────────────────────────────────────

const SOIL = -0.75;
const MOTHER = grow({ from: [-0.95, SOIL, 0], dir: [0.05, 1, 0], len: 0.62, width: 0.04, levels: 7, spread: 0.5, shrink: 0.8, pull: [0, 0.6, 0], seed: 77, run: 0.15 });
const MOTHER_ROOTS = grow({ from: [-0.95, SOIL, 0], dir: [0, -1, 0], len: 0.36, width: 0.04, levels: 5, spread: 0.65, shrink: 0.78, pull: [0.3, -0.3, 0], seed: 78, run: 0.2 });
const SEEDLING = grow({ from: [1.45, SOIL, 0.2], dir: [-0.05, 1, 0], len: 0.2, width: 0.02, levels: 4, spread: 0.55, shrink: 0.78, pull: [0, 0.6, 0], seed: 79 });
const SEED_ROOTS = grow({ from: [1.45, SOIL, 0.2], dir: [0, -1, 0], len: 0.15, width: 0.02, levels: 3, spread: 0.6, seed: 80 });
const DRAWN = [MOTHER, MOTHER_ROOTS, SEEDLING, SEED_ROOTS], PICKS = DRAWN.map((d) => chooser(d, 1)), WEIGHT = [0.55, 0.2, 0.15, 0.1];
const MR = tips(MOTHER_ROOTS);
/** The thread of the story, from the mother's roots to the seedling's. */
const tale = (k: number, n: number): V => {
  const a = MR[n % MR.length].b, b: V = [1.45, SOIL - 0.3, 0.2], m = Math.sin(Math.PI * k);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - 0.35 * m, a[2] + (b[2] - a[2]) * k];
};

const ROSE: V = [1, 0.5, 0.68], SILVER: V = [0.75, 0.82, 1], LILAC: V = [0.7, 0.55, 1];

const story: Make = (s) => {
  const doubt = said(s, "tale2");
  /** Which picture is showing: 1 the story (with the thread), 0 without. Rocks slowly, faster and further apart once in doubt. */
  const which = (u: number) => 0.5 + 0.5 * Math.sin(u * (0.8 + 0.5 * smooth(doubt, doubt + 2, u)));
  const apart = (u: number) => 0.12 + 0.3 * smooth(doubt, doubt + 3, u);
  return kinds(s, [
    {
      // The two trees, engraved: the story's picture in rose, the other in silver, a little apart.
      w: 0.72,
      make: (r) => {
        let k = r(), d = 0;
        while (d < 3 && (k -= WEIGHT[d]) > 0) d++;
        return [d, PICKS[d](r()), r(), gaussOf(r), r()];
      },
      life: (o, u, key) => {
        const d = o[0], T = DRAWN[d][o[1]], p = on(T, o[2], o[3], 0, o[3] * 0.4, 0.25), copy = o[4] < 0.5, w = which(u), off = apart(u);
        // Fine engraving lines: hatches across the thicker twigs.
        put(o, p[0] + (copy ? 0 : off), p[1] + (copy ? 0 : off * 0.4), p[2] + (copy ? 0 : -0.5));
        tint(o, copy ? blend(ROSE, [1, 0.75, 0.6], key * 0.5) : blend(SILVER, LILAC, key * 0.5), (copy ? 0.25 + 0.55 * w : 0.25 + 0.55 * (1 - w)) * (d % 2 ? 0.8 : 1));
      },
    },
    {
      // The thread of the story: dashes of light running from the mother to the seedling, only in her picture.
      w: 0.18,
      make: (r) => [Math.floor(r() * 5), r(), gaussOf(r)],
      life: (o, u, key) => {
        const n = o[0], k = o[1], p = tale(k, n), dash = frac(k * 14 - u * 0.9 + n * 0.3) < 0.55;
        put(o, p[0] + o[2] * 0.01, p[1] + o[2] * 0.01, p[2]);
        // Once there's doubt, it flickers: there, then not.
        const there = which(u) * (1 - 0.6 * smooth(doubt, doubt + 2, u) * (0.5 + 0.5 * Math.sin(u * 5.3 + n)));
        tint(o, blend(GOLD, ROSE, key), dash ? 1.3 * there : 0.1 * there);
      },
    },
    {
      // The soil line.
      w: 0.1,
      make: (r) => [(r() - 0.5) * 7, (r() - 0.5) * 2],
      life: (o, u, key) => {
        put(o, o[0], SOIL + 0.01 * Math.sin(o[0] * 7), o[1]);
        tint(o, blend(ROSE, SILVER, key), 0.2 * (1 - Math.abs(o[0]) / 3.6));
      },
    },
  ]);
};

export const FOREST: Record<string, Make> = { hubs, carbon, story };
