// The opening and the close. The hook: a galaxy whose arms are fungal threads, branching as hyphae do, light running
// out along them (a tenth of the way across the galaxy). The end: two forests, one above the ground in cold silver, and
// its mirror below in warm gold, the roots and the web between them, brightening on "one feeding it, in the dark".
import { smooth } from "../../../src/kit/looks/core";
import { LAYOUT } from "../layout.gen";
import { chooser, grow, on, reach, tips, type Twig, type V } from "./grow";
import { PALETTE, TAU, blend, frac, gaussOf, hash, kinds, paint, put, tint, type Make } from "./make";

const P = PALETTE.cosmos;
const GOLD: V = [1, 0.74, 0.32], ROSE: V = [1, 0.42, 0.7];

// ── The galaxy of threads ──────────────────────────────────────────────────────────────────────────────

/** Four arms (two long, two short), each a log spiral, sprouting small branching threads all along it. */
const GALAXY: Twig[] = (() => {
  const out: Twig[] = [], N = 70;
  for (let arm = 0; arm < 4; arm++) {
    const major = arm % 2 === 0, R = major ? 4.3 : 3.1, phase = (arm * TAU) / 4, b = 0.24, th1 = Math.log(R / 0.28) / b;
    const at = (th: number): V => {
      const r = 0.28 * Math.exp(b * th);
      return [Math.cos(th + phase) * r, Math.sin(th + phase) * r, 0];
    };
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * th1, t1 = ((i + 1) / N) * th1, a = at(t0), c = at(t1), k = i / N;
      out.push({ a, b: c, w: (major ? 0.05 : 0.035) * (1 - 0.75 * k), depth: 0, id: -1, start: k * 0.55, end: (k + 1 / N) * 0.55 });
      if (i % 3 !== 1 || i < 4) continue;
      // A small tree of threads off the arm, turned outward or inward in turn.
      const tan: V = [c[0] - a[0], c[1] - a[1], 0], r = Math.hypot(a[0], a[1]), side = (i / 3) % 2 ? 1 : -1;
      const ang = side * (0.9 + 0.4 * hash(arm * 100 + i)), dir: V = [tan[0] * Math.cos(ang) - tan[1] * Math.sin(ang), tan[0] * Math.sin(ang) + tan[1] * Math.cos(ang), 0];
      const tree = grow({ from: a, dir, len: 0.12 + 0.07 * r, width: 0.016, levels: 4, spread: 0.5, plane: "xy", seed: arm * 1000 + i, run: 0.3 });
      for (const t of tree) out.push({ ...t, depth: t.depth + 1, start: k * 0.55 + t.start * 0.45, end: k * 0.55 + t.end * 0.45 });
    }
  }
  return out;
})();
const pickGalaxy = chooser(GALAXY, 6), GALAXY_TIPS = tips(GALAXY.filter((t) => t.depth > 0));

/** The galaxy's own plane to the scene: turning slowly, then stood up at a slant so it fills the tall frame. */
function placeGalaxy(p: V, u: number): V {
  const spin = -u * 0.045, c = Math.cos(spin), s = Math.sin(spin), x = p[0] * c - p[1] * s, y = p[0] * s + p[1] * c, z = p[2];
  const tilt = 0.6, lean = 0.28;
  const X = x * Math.cos(tilt) + z * Math.sin(tilt), Z = -x * Math.sin(tilt) + z * Math.cos(tilt);
  return [X, y * Math.cos(lean) - Z * Math.sin(lean) + 0.35, y * Math.sin(lean) + Z * Math.cos(lean)];
}

const hook: Make = (s) =>
  kinds(s, [
    {
      // The threads, violet and indigo, with gold running out along them.
      w: 0.6,
      make: (r) => [pickGalaxy(r()), r(), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const T = GALAXY[o[0]], sAlong = o[1], p = on(T, sAlong, o[2], o[3], o[4] * 0.4, 0.55);
        put(o, ...placeGalaxy(p, u));
        const along = reach(T, sAlong), pulse = Math.exp(-((frac(along * 2.4 - u * 0.11) - 0.5) ** 2) * 60);
        const r = Math.hypot(p[0], p[1]), base = (0.3 + 0.3 * Math.exp(-r * 0.6) + (T.depth ? 0 : 0.15)) * (0.35 + 0.65 * Math.min(1, r / 1.2));
        paint(o, P, 0.02 + 0.07 * T.depth + 0.08 * key, base);
        const c: V = [o[3], o[4], o[5]];
        tint(o, blend(c, GOLD, pulse * 0.85), 1 + pulse * 0.9);
      },
    },
    {
      // Every thread's growing tip, a bead of light.
      w: 0.1,
      make: (r) => [Math.floor(r() * GALAXY_TIPS.length), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key, ph) => {
        const T = GALAXY_TIPS[o[0]], p = T.b;
        put(o, ...placeGalaxy([p[0] + o[1] * 0.018, p[1] + o[2] * 0.018, p[2] + o[3] * 0.018], u));
        tint(o, key < 0.5 ? GOLD : ROSE, 0.7 + 0.45 * Math.sin(u * 1.7 + ph));
      },
    },
    {
      // The faint disc the arms turn in.
      w: 0.18,
      make: (r) => {
        const arm = Math.floor(r() * 4), d = 0.1 + 0.9 * r() ** 0.8, th = Math.log((d * 4.3) / 0.28) / 0.24 + gaussOf(r) * 0.5;
        return [arm, th, d, gaussOf(r)];
      },
      life: (o, u, key) => {
        const R = o[2] * 4.3, a = o[1] + (o[0] * TAU) / 4, p: V = [Math.cos(a) * R, Math.sin(a) * R, o[3] * 0.08];
        put(o, ...placeGalaxy(p, u));
        paint(o, P, 0.1 + 0.15 * key, 0.16 + 0.2 * Math.exp(-o[2] * 2));
      },
    },
    {
      // The core.
      w: 0.07,
      make: (r) => [gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        put(o, ...placeGalaxy([o[0] * 0.22, o[1] * 0.22, o[2] * 0.08], u));
        tint(o, blend(GOLD, ROSE, key * 0.4), 0.55);
      },
    },
  ]);

// ── Two forests ────────────────────────────────────────────────────────────────────────────────────────

const GROUND = 0.35;
type Tree = { x: number; z: number; crown: Twig[]; pick: (k: number) => number; ends: Twig[] };

/** A row of trees across the frame, deep and shallow, each with its crown and (mirrored, wider) its roots. */
const ROW: Tree[] = Array.from({ length: 9 }, (_, i) => {
  const x = -2.7 + i * 0.68 + (hash(i * 3) - 0.5) * 0.25, z = (hash(i * 5 + 1) - 0.5) * 1.8, h = 0.32 + 0.22 * hash(i * 7 + 2);
  const crown = grow({ from: [x, GROUND, z], dir: [(hash(i) - 0.5) * 0.2, 1, 0], len: h, width: 0.05, levels: 6, spread: 0.48, shrink: 0.8, pull: [0, 0.7, 0], seed: 40 + i, run: 0.15 });
  return { x, z, crown, pick: chooser(crown, 4), ends: tips(crown) };
});
/** A crown twig's mirror under the ground: a little wider and deeper than the tree above. */
const below = (p: V, x0: number): V => [x0 + (p[0] - x0) * 1.15, GROUND - (p[1] - GROUND) * 1.1, p[2]];

/** Threads between neighbours' roots, from a root tip of one to a root tip of the next, sagging deeper between. */
const WEB = Array.from({ length: 70 }, (_, n) => {
  const i = Math.floor(hash(n * 11) * 8), j = Math.min(8, i + 1 + (hash(n * 13) < 0.3 ? 1 : 0)), A = ROW[i], B = ROW[j];
  const a = below(A.ends[Math.floor(hash(n * 17) * A.ends.length)].b, A.x), b = below(B.ends[Math.floor(hash(n * 19) * B.ends.length)].b, B.x);
  return { a, b, sag: 0.15 + 0.45 * hash(n * 23) };
});
const along = (w: (typeof WEB)[number], k: number): V => {
  const m = 4 * k * (1 - k);
  return [w.a[0] + (w.b[0] - w.a[0]) * k, w.a[1] + (w.b[1] - w.a[1]) * k - w.sag * m, w.a[2] + (w.b[2] - w.a[2]) * k];
};

const SILVER: V = [0.62, 0.72, 1], WARM: V = [1, 0.66, 0.3];

const end: Make = (s) => {
  const said = (id: string) => (LAYOUT.beats[id] ?? s.from) - s.from;
  // The lower forest wakes on "two forests", and burns brightest on "feeding it, in the dark".
  const wake = (u: number) => 0.45 + 0.35 * smooth(said("end2"), said("end2") + 2, u) + 0.5 * smooth(said("end3") + 1.2, said("end3") + 3.2, u);
  const sway = (p: V, u: number, k: number): V => [p[0] + 0.03 * Math.sin(u * 0.7 + p[1] * 1.3 + k) * Math.max(0, p[1] - GROUND), p[1], p[2]];
  return kinds(s, [
    {
      // The forest you can see.
      w: 0.36,
      make: (r) => {
        const i = Math.floor(r() * ROW.length);
        return [i, ROW[i].pick(r()), r(), gaussOf(r), gaussOf(r)];
      },
      life: (o, u, key) => {
        const T = ROW[o[0]].crown[o[1]], p = on(T, o[2], o[3], o[4], o[3] * 0.7, 0.5);
        put(o, ...sway(p, u, o[0]));
        tint(o, blend(SILVER, P[1], 0.25 * key), 0.3 + 0.18 * (T.depth / 6));
      },
    },
    {
      // Its mirror underground: roots in warm gold, light rising through them to the trees.
      w: 0.34,
      make: (r) => {
        const i = Math.floor(r() * ROW.length);
        return [i, ROW[i].pick(r()), r(), gaussOf(r), gaussOf(r)];
      },
      life: (o, u, key) => {
        const tree = ROW[o[0]], T = tree.crown[o[1]], p = below(on(T, o[2], o[3], o[4], o[3] * 0.7, 0.55), tree.x);
        put(o, ...p);
        const rise = Math.exp(-((frac(reach(T, o[2]) * 2 + u * 0.22) - 0.5) ** 2) * 40);
        tint(o, blend(WARM, ROSE, 0.3 * key), wake(u) * (0.55 + 0.9 * rise));
      },
    },
    {
      // The web between them, finer and brighter.
      w: 0.22,
      make: (r) => [Math.floor(r() * WEB.length), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const n = o[0], w = WEB[n], k = o[1], p = along(w, k);
        put(o, p[0] + o[2] * 0.012, p[1] + o[3] * 0.012, p[2]);
        const run = Math.exp(-((frac(k + u * 0.15 + hash(n)) - 0.5) ** 2) * 30);
        tint(o, blend(GOLD, P[3], 0.4 * key), wake(u) * (0.45 + 0.9 * run));
      },
    },
    {
      // The ground line between the two.
      w: 0.08,
      make: (r) => [(r() - 0.5) * 8, (r() - 0.5) * 3],
      life: (o, u, key) => {
        put(o, o[0], GROUND + 0.01 * Math.sin(o[0] * 5 + u), o[1]);
        tint(o, blend(SILVER, WARM, 0.5), 0.25 * (1 - Math.abs(o[0]) / 4.2) * (0.7 + 0.3 * key));
      },
    },
  ]);
};

export const COSMOS: Record<string, Make> = { hook, end };
