// Act 4, you and Earth: the egg's cells flocking into a person, ghost particles from the Sun pouring through a thumbprint,
// lungs drawn as trees taking in the breath of others, Earth at night with its cities lit, and the Moon's orbit slowly widening.
import { smooth } from "../../../src/kit/looks/core";
import { LUNGS, inProfile, onRidge, pickBranch, placeProfile } from "./drawn";
import { PALETTE, frac, TAU, gaussOf, hash, kinds, paint, put, sphere, wave3, type Make, type Span } from "./make";

const P = PALETTE.earth;
const len = (s: Span) => s.to - s.from;

/** A heartbeat: a strong beat and a softer one, once a period. */
const beat = (x: number) => {
  const f = x - Math.floor(x);
  return Math.exp(-((f - 0.08) ** 2) * 400) + 0.55 * Math.exp(-((f - 0.26) ** 2) * 400);
};

/** The egg divides (2, 4, 8, 16); the cells pour out and wheel like starlings; the flock settles into a person's profile,
 * and the cells' flickering, each to its own time, slowly falls into one heartbeat. Thirty trillion cells agreeing. */
const human: Make = (s) => {
  const L = len(s), SIZE = 7.2, AT: [number, number] = [0.45, 0.2];
  const divide = (u: number) => 4 * smooth(0.1, L * 0.24, u), flock = (u: number) => smooth(L * 0.2, L * 0.38, u), settle = (u: number, key: number) => { const at = L * 0.36 + L * 0.24 * hash(key * 57); return smooth(at, at + 1.4, u); }, agree = (u: number) => smooth(L * 0.5, L * 0.92, u);
  const cell = (c: number, d: number): [number, number, number] => {
    const p: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < Math.ceil(d); i++) {
      const bit = Math.floor(c / 2 ** i) % 2 ? 1 : -1, gap = 0.75 * 0.75 ** i * smooth(0, 1, Math.min(1, d - i));
      p[i % 3] += bit * gap;
    }
    return p;
  };
  return kinds(s, [
    {
      w: 1,
      make: (r) => [...inProfile(r), r(), r()],
      life: (o, u, key, ph) => {
        const bx = o[0], by = o[1], d = o[2], su = o[3], sv = o[4];
        // 1. A cell of the dividing egg.
        const dv = divide(u), n = 2 ** Math.ceil(dv), at = cell(Math.floor(key * n) % n, dv), [sx, sy, sz] = sphere(su, sv, (1.25 / 2 ** (dv / 3)) * (0.85 + 0.15 * hash(key * 7)));
        const c0 = [at[0] + sx, at[1] + sy, at[2] + sz];
        // 2. The flock: a thin ribbon of starlings twisting through the air, folding over itself.
        const a = key * TAU, band = (hash(key * 31) - 0.5) * 1.5 * (0.45 + 0.55 * Math.sin(a * 3 + u * 0.7)), fine = 0.05 * Math.sin(ph * 7 + u);
        const f0 = [
          2 * Math.sin(a + u * 0.55) + band * Math.cos(a * 5 + u) + fine,
          2.9 * Math.sin(2 * a + u * 0.4) * 0.85 + band * Math.sin(a * 3 - u * 0.6) + fine,
          1.3 * Math.cos(a + u * 0.45) + band * Math.sin(a * 5 + u),
        ];
        // 3. The person: the profile, a little depth in the middle, the inside always gently streaming.
        const [tx, ty] = placeProfile(bx, by, SIZE, AT), deep = Math.min(1, d / 110), stream = 0.05 * deep;
        const t0 = [tx + stream * Math.sin(u * 1.3 + ph), ty + stream * Math.cos(u * 1.1 + ph * 2), (key < 0.5 ? -1 : 1) * 0.55 * Math.sqrt(deep) * hash(key * 13)];
        const fk = flock(u), sk = settle(u, key), mid = [0, 1, 2].map((i) => c0[i] + (f0[i] - c0[i]) * fk);
        put(o, mid[0] + (t0[0] - mid[0]) * sk, mid[1] + (t0[1] - mid[1]) * sk, mid[2] + (t0[2] - mid[2]) * sk);
        // Each cell flickers to its own time until they agree; inside, rings of light keep flowing in from the edge.
        const g = agree(u), pulse = beat(u * 1.05 + (1 - g) * (ph / TAU) * 3), edge = d < 12 ? 1 : 0;
        const ripple = Math.exp(-((frac(d / 30 - u * 0.4) - 0.5) ** 2) * 18) * sk;
        // In flight they're warm light; landed, they take the profile's colours. The drawn shoulders fade out at the bottom.
        const x0 = edge ? 0.5 : 0.25 - 0.25 * ripple + 0.1 * deep, g0 = (edge ? 1 : 0.1 + 1.3 * ripple) * (0.6 + 0.8 * pulse), base = 1 - sk * (1 - smooth(1012, 925, by));
        paint(o, P, 0.5 + (x0 - 0.5) * sk, (0.75 + (g0 - 0.75) * sk) * base);
      },
    },
  ]);
};

/** A thumbprint, huge, its ridges glowing, with ghost particles pouring through it as if it weren't there. */
const neutrinos: Make = (s) =>
  kinds(s, [
    {
      w: 0.6,
      make: (r) => [...onRidge(r), r()],
      life: (o, u, key, ph) => {
        const x = o[0], y = o[1], e = o[2], pore = o[3] > 0.97;
        put(o, x * 1.1, y * 1.1 - 0.2 + 0.03 * Math.sin(u * 0.6), 0.75 * (1 - e) + 0.03 * Math.sin(u + ph));
        paint(o, P, 0.02 + 0.1 * e + 0.05 * key, (pore ? 1.8 : 0.85) * (1 - 0.5 * e ** 4));
      },
    },
    {
      w: 0.4,
      make: (r) => [Math.floor(r() * 140), r()],
      life: (o, u, key) => {
        // Streaks slanting down from top right, straight through the print, far faster than anything else here.
        const n = o[0], tail = o[1], head = frac(hash(n + 3) + u * (0.7 + 0.3 * hash(n + 4))) * 15 - 7.5, d = head - tail * 1.4;
        put(o, (hash(n) - 0.5) * 6 + d * 0.28, d, (hash(n + 1) - 0.5) * 4);
        paint(o, P, 0.7 + 0.15 * key, (1 - tail) ** 1.5 * 1.3);
      },
    },
  ]);

/** The lungs as two trees of light, breathing; wisps of other people's breath, in other colours, drift down into them. */
const breath: Make = (s) => {
  const TOP: [number, number, number] = [0, 2.8, 0], tips = LUNGS.filter((b) => b.depth === 8);
  const inhale = (u: number) => 0.5 - 0.5 * Math.cos(u * 1.15);
  const swell = (p: [number, number, number], u: number, depth: number): [number, number, number] => {
    const k = 1 + 0.07 * inhale(u) * (depth / 8);
    return [p[0] * k, 1.2 + (p[1] - 1.2) * k, p[2] * k];
  };
  return kinds(s, [
    {
      w: 0.55,
      make: (r) => [pickBranch(r()), r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const B = LUNGS[o[0]], t = o[1], w = B.w * 0.5;
        const p = swell([(B.a[0] + (B.b[0] - B.a[0]) * t) * 0.56 + o[2] * w, B.a[1] + (B.b[1] - B.a[1]) * t - 0.8 + o[3] * w, B.a[2] + (B.b[2] - B.a[2]) * t + o[2] * w * 0.6], u, B.depth);
        put(o, ...p);
        // Air running down the branches as it breathes in.
        const along = (B.depth + t) / 9, run = Math.exp(-((along - frac(u * 0.18)) ** 2) * 60);
        paint(o, P, 0.02 + 0.06 * B.depth + 0.04 * key, 0.5 + 0.25 * (B.depth / 8) + 1.2 * run);
      },
    },
    {
      // Where the air ends: little clusters at every tip.
      w: 0.2,
      make: (r) => [Math.floor(r() * tips.length), r(), r(), r()],
      life: (o, u, key, ph) => {
        const T = tips[o[0]], [x, y, z] = sphere(o[1], o[2], 0.11 * Math.cbrt(o[3]));
        put(o, ...swell([T.b[0] * 0.56 + x, T.b[1] - 0.8 + y, T.b[2] + z], u, 8));
        paint(o, P, 0.45 + 0.1 * key, 0.55 + 0.6 * inhale(u) * (0.6 + 0.4 * Math.sin(u * 3 + ph)));
      },
    },
    {
      // Other breaths, from far round, spiralling in to the top of the windpipe.
      w: 0.25,
      make: (r) => [Math.floor(r() * 7), r(), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const w = o[0], k = frac(o[1] + u * 0.11), e = 1 - k, a = hash(w) * TAU + k * 2.6, R = 0.15 + 3.6 * e ** 1.2, spread = 0.06 + 0.5 * e;
        put(o, TOP[0] + Math.cos(a) * R + o[2] * spread, TOP[1] + 0.6 + 1.6 * e * (hash(w + 1) - 0.2) + o[3] * spread, TOP[2] + Math.sin(a) * R * 0.6 + o[4] * spread);
        paint(o, [PALETTE.cells[w % 4], PALETTE.earth[(w + 1) % 4], PALETTE.molecules[w % 4]], hash(w + 2), 0.95 * smooth(0, 0.15, k) * smooth(1, 0.8, k));
      },
    },
  ]);
};

const land = (x: number, y: number, z: number) => wave3(x * 1.4 + 0.3, y * 1.4, z * 1.4 - 0.2) > 0.12;

/** Earth at night on one side, day on the other, cities lit along the dark edge, turning. */
const earth: Make = (s) => {
  const R = 2.3;
  /** A point on the globe, turned by time; day on the right. */
  const globe = (o: number[], u: number, r: number) => {
    const a = u * 0.1, x = o[0] * Math.cos(a) + o[2] * Math.sin(a), z = -o[0] * Math.sin(a) + o[2] * Math.cos(a), tilt = 0.4;
    const y = o[1] * Math.cos(tilt) - z * Math.sin(tilt), z2 = o[1] * Math.sin(tilt) + z * Math.cos(tilt);
    put(o, x * r, y * r, z2 * r);
    return smooth(-0.15, 0.25, x * 0.9 + z2 * 0.45);
  };
  const onLand = (r: () => number, want: boolean) => {
    for (let i = 0; ; i++) {
      const p = sphere(r(), r(), 1);
      if (land(...p) === want || i > 30) return p;
    }
  };
  return kinds(s, [
    {
      w: 0.26,
      make: (r) => onLand(r, false),
      life: (o, u, key) => {
        const day = globe(o, u, R);
        paint(o, P, 0.25 + 0.03 * key, 0.25 + 0.55 * day);
      },
    },
    {
      w: 0.32,
      make: (r) => onLand(r, true),
      life: (o, u, key) => {
        const day = globe(o, u, R);
        paint(o, P, 0.75 + 0.2 * key, 0.2 + 0.9 * day);
      },
    },
    {
      // Cities: clusters on land, lit at night.
      w: 0.27,
      make: (r) => {
        for (let i = 0; ; i++) {
          const c = Math.floor(r() * 700), [cx, cy, cz] = sphere(hash(c), hash(c + 1), 1), sz = 0.012 + 0.03 * hash(c + 2) ** 2, q = [cx + gaussOf(r) * sz, cy + gaussOf(r) * sz, cz + gaussOf(r) * sz], n = Math.hypot(q[0], q[1], q[2]);
          if (land(cx, cy, cz) || i > 30) return [q[0] / n, q[1] / n, q[2] / n];
        }
      },
      life: (o, u, key, ph) => {
        const day = globe(o, u, R * 1.005);
        paint(o, P, 0.02 + 0.05 * key, (1 - day) * (1.5 + 0.3 * Math.sin(u * 3 + ph)));
      },
    },
    {
      // The thin air: brightest at the edge.
      w: 0.15,
      make: (r) => sphere(r(), r(), 1),
      life: (o, u) => {
        const day = globe(o, u, R * 1.06), rim = 1 - Math.abs(o[2]) / (R * 1.06);
        paint(o, P, 0.25 - 0.08 * rim, (0.15 + 0.75 * rim ** 3) * (0.3 + 0.7 * day));
      },
    },
  ]);
};

/** Earth and the Moon, whose orbit keeps widening: the path it has taken drawn as a spiral of light. */
const moon: Make = (s) => {
  const E: [number, number, number] = [0, -0.4, 0], spin = 1.7, plane = 0.5;
  const orbit = (th: number): [number, number, number] => {
    const r = 1.75 + (0.42 * th) / TAU, x = Math.cos(th) * r, y = Math.sin(th) * r * 1.35;
    return [E[0] + x * Math.cos(plane), E[1] + y, E[2] + x * Math.sin(plane)];
  };
  return kinds(s, [
    {
      w: 0.3,
      make: (r) => [r(), r(), r()],
      life: (o, u, key) => {
        const [x, y, z] = sphere(o[0], o[1], 0.95), a = u * 0.3, xx = x * Math.cos(a) + z * Math.sin(a), zz = -x * Math.sin(a) + z * Math.cos(a);
        put(o, E[0] + xx, E[1] + y, E[2] + zz);
        const isLand = land(x * 1.4, y * 1.4, z * 1.4);
        paint(o, P, isLand ? 0.75 : 0.25, isLand ? 0.7 : 0.6);
      },
    },
    {
      w: 0.12,
      make: (r) => [r(), r(), r()],
      life: (o, u) => {
        const th = 1.4 + u * spin, c = orbit(th), [x, y, z] = sphere(o[0], o[1], 0.32 * (0.85 + 0.15 * o[2]));
        put(o, c[0] + x, c[1] + y, c[2] + z);
        o[3] = 1.2;
        o[4] = 1.15;
        o[5] = 1.05;
      },
    },
    {
      // The path, older loops fainter.
      w: 0.58,
      make: (r) => [r(), gaussOf(r)],
      life: (o, u) => {
        const now = 1.4 + u * spin, th = now - o[0] * (now + 6), c = orbit(th), age = now - th;
        put(o, c[0] + o[1] * 0.02, c[1] + o[1] * 0.02, c[2]);
        paint(o, P, 0.4 + 0.1 * Math.sin(th * 0.3), th < 0 ? 0 : 0.95 * Math.exp(-age * 0.07));
      },
    },
  ]);
};

export const EARTH: Record<string, Make> = { human, neutrinos, breath, earth, moon };
