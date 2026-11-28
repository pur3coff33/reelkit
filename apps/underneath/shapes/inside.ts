// Inside the threads. The tunnel: flying down the inside of a single hypha, its ringed walls streaming past, two rivers in
// the one tube: gold beads of sugar running away ahead of us to the growing edge, blue beads of minerals coming towards
// us, home to the root. The ripple: the web from above, spreading out in a ring like a wave, its front burning white,
// loops closing behind it, and new partners' root tips lighting green as it reaches them.
import { smooth } from "../../../src/kit/looks/core";
import { chooser, grow, on, tips, type Twig, type V } from "./grow";
import { PALETTE, TAU, blend, frac, gaussOf, hash, kinds, paint, put, tint, type Make } from "./make";

const P = PALETTE.inside;
const GOLD: V = [1, 0.72, 0.22], CYAN: V = [0.15, 0.82, 1], WHITE: V = [0.9, 0.97, 1], LIME: V = [0.55, 1, 0.35], DEEP: V = [0.2, 0.25, 0.95];
const len = (s: { from: number; to: number }) => s.to - s.from;

// ── The tunnel ─────────────────────────────────────────────────────────────────────────────────────────

const NEAR = 4.6, FAR = -34, R = 1.5;
/** The tube's middle at depth z: it bends gently, so the way ahead curves out of sight. */
const mid = (z: number, u: number): [number, number] => [0.55 * Math.sin(z * 0.085 + u * 0.3) - 0.55 * Math.sin(u * 0.3), 0.4 * Math.cos(z * 0.07 + u * 0.22) - 0.4 * Math.cos(u * 0.22)];
/** Fades points in from the dark far end and out before they reach the camera. */
const fade = (z: number) => smooth(FAR, FAR + 10, z) * smooth(NEAR, NEAR - 2.5, z);
/** A place in the tube: angle round, distance from the middle (1 = the wall), depth. */
const inTube = (a: number, r: number, z: number, u: number): V => {
  const [cx, cy] = mid(z, u);
  return [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r, z];
};

const tunnel: Make = (s) =>
  kinds(s, [
    {
      // The wall: rings and a slow spiral grain, streaming past.
      w: 0.56,
      make: (r) => [r(), r(), gaussOf(r)],
      life: (o, u, key) => {
        const z = FAR + (NEAR - FAR) * frac(o[0] + u * 0.05), a = o[1] * TAU, ring = Math.cos(z * 1.6) ** 6, grain = Math.max(0, Math.cos(a * 7 + z * 1.2 - u * 0.3)) ** 4;
        put(o, ...inTube(a, 1 + 0.03 * o[2] + 0.04 * Math.sin(z * 0.5 + a * 3), z, u));
        paint(o, P, 0.75 + 0.2 * Math.sin(a) * 0.5 + 0.1 * key + z * 0.004, (0.18 + 1.1 * ring + 0.35 * grain) * fade(z));
      },
    },
    {
      // Sugar: gold beads running away from us, low on the left.
      w: 0.17,
      make: (r) => [Math.floor(r() * 1400), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const c = o[0], z = NEAR - 0.3 - (NEAR - FAR) * frac(hash(c) + u * 0.075), a = -2.35 + 1.4 * (hash(c + 1) - 0.5), r = 0.45 + 0.4 * hash(c + 2), b = 0.022 + 0.02 * hash(c + 3);
        const p = inTube(a, r, z, u);
        put(o, p[0] + o[1] * b, p[1] + o[2] * b, p[2] + o[3] * b * 2);
        tint(o, blend(GOLD, [1, 0.45, 0.15], key * 0.5), 1.25 * fade(z));
      },
    },
    {
      // Minerals: blue beads coming home towards us, high on the right, a little faster.
      w: 0.17,
      make: (r) => [Math.floor(r() * 1400), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const c = o[0], z = FAR + (NEAR - 0.3 - FAR) * frac(hash(c + 50) + u * 0.1), a = 0.8 + 1.4 * (hash(c + 51) - 0.5), r = 0.45 + 0.4 * hash(c + 52), b = 0.02 + 0.02 * hash(c + 53);
        const p = inTube(a, r, z, u);
        put(o, p[0] + o[1] * b, p[1] + o[2] * b, p[2] + o[3] * b * 2);
        tint(o, blend(CYAN, WHITE, key * 0.4), 1.2 * fade(z));
      },
    },
    {
      // The stream itself: a fine drift through the middle, both ways.
      w: 0.1,
      make: (r) => [r(), r(), r(), r()],
      life: (o, u, key) => {
        const out = o[3] < 0.5, z = out ? NEAR - (NEAR - FAR) * frac(o[0] + u * 0.06) : FAR + (NEAR - FAR) * frac(o[0] + u * 0.08);
        put(o, ...inTube(o[1] * TAU, 0.85 * Math.sqrt(o[2]), z, u));
        tint(o, out ? GOLD : CYAN, 0.25 * fade(z) * (0.6 + 0.4 * key));
      },
    },
  ]);

// ── The ripple ─────────────────────────────────────────────────────────────────────────────────────────

const FLOOR = -0.3;
/** Fourteen threads out from the middle, each branching as it goes, lying flat. */
const WEB: Twig[] = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * TAU + (hash(i) - 0.5) * 0.3;
  return grow({ from: [0, FLOOR, 0], dir: [Math.cos(a), 0, Math.sin(a)], len: 0.55, width: 0.026, levels: 7, spread: 0.42, shrink: 0.9, thin: 0.84, plane: "xz", seed: 60 + i, run: 0.35 });
}).flat();
const pickWeb = chooser(WEB, 3), ENDS = tips(WEB);
/** Loops: from each tip to the nearest tip of a neighbouring thread, if it's close. */
const LOOPS = ENDS.flatMap((t, i) => {
  let best = -1, d = 0.75;
  ENDS.forEach((q, j) => {
    const dd = Math.hypot(q.b[0] - t.b[0], q.b[2] - t.b[2]);
    if (j !== i && dd < d && dd > 0.08) [best, d] = [j, dd];
  });
  return best < 0 || best < i ? [] : [{ a: t.b, b: ENDS[best].b, r: Math.hypot(t.b[0], t.b[2]) }];
});
/** Where new partners' roots wait. */
const ROOTS = Array.from({ length: 26 }, (_, i) => {
  const a = hash(i * 3.7) * TAU, r = 1 + 4.4 * Math.sqrt(hash(i * 5.1));
  return { at: [Math.cos(a) * r, FLOOR, Math.sin(a) * r] as V, r };
});

const ripple: Make = (s) => {
  const L = len(s), front = (u: number) => 0.3 + 5.6 * Math.min(1.05, Math.max(0, u / L));
  const flat = (p: V, u: number): V => {
    const a = u * 0.03, c = Math.cos(a), sn = Math.sin(a);
    return [p[0] * c - p[2] * sn, p[1], p[0] * sn + p[2] * c];
  };
  return kinds(s, [
    {
      // The threads: deep blue behind, burning white along the moving front.
      w: 0.6,
      make: (r) => [pickWeb(r()), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const T = WEB[o[0]], p = on(T, o[1], o[2], 0, o[3], 0.5), r = Math.hypot(p[0], p[2]), F = front(u), d = F - r;
        put(o, ...flat(p, u));
        const wave = Math.exp(-(((d - 0.15) / 0.35) ** 2)), seen = d > -0.05 ? 1 : 0;
        tint(o, blend(blend(DEEP, CYAN, 0.3 * key), WHITE, wave), seen * (0.32 + 1.5 * wave));
      },
    },
    {
      // Loops closing behind the front.
      w: 0.22,
      make: (r) => [Math.floor(r() * LOOPS.length), r(), gaussOf(r)],
      life: (o, u, key) => {
        const l = LOOPS[o[0]], k = o[1], F = front(u), closed = smooth(l.r + 0.2, l.r + 0.9, F), m = Math.sin(Math.PI * k) * 0.12;
        const p: V = [l.a[0] + (l.b[0] - l.a[0]) * k - (l.b[2] - l.a[2]) * m, FLOOR, l.a[2] + (l.b[2] - l.a[2]) * k + (l.b[0] - l.a[0]) * m];
        put(o, ...flat([p[0] + o[2] * 0.01, p[1], p[2]], u));
        tint(o, blend([0.6, 0.3, 1], CYAN, key), k <= closed ? 0.6 : 0);
      },
    },
    {
      // New partners' root tips: dim rings until the front arrives, then green.
      w: 0.18,
      make: (r) => [Math.floor(r() * ROOTS.length), r(), gaussOf(r)],
      life: (o, u, key, ph) => {
        const R0 = ROOTS[o[0]], a = o[1] * TAU, rr = 0.11 + 0.015 * o[2], met = smooth(R0.r - 0.1, R0.r + 0.4, front(u));
        put(o, ...flat([R0.at[0] + Math.cos(a) * rr, FLOOR + 0.02, R0.at[2] + Math.sin(a) * rr], u));
        tint(o, blend([0.25, 0.3, 0.4], LIME, met), 0.18 + met * (0.9 + 0.3 * Math.sin(u * 3 + ph)));
      },
    },
  ]);
};

export const INSIDE: Record<string, Make> = { tunnel, ripple };
