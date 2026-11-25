// Living shapes for points of light, all centred on the origin and about 4 units across: people, an eye, a butterfly, a
// tunnel, a river, a sea, a net of jewels, a galaxy, a mandala. Colours come from the palettes in trip.ts and drift with time.
import { TAU, gauss, lerp, smooth, type RGB, type Rand, type V3 } from "../core";
import { living, lump, lumps, type Dot, type Life, type Lump, type Sampler } from "./forms";
import { neon } from "./trip";

const ZERO: RGB = [0, 0, 0];
const mod = (x: number, m: number) => ((x % m) + m) % m;

// ── People ─────────────────────────────────────────────────────────────────────────────────────────────

/** The skin of a body made of lumps: points on the outside only. */
export function skin(body: Lump[], color: RGB = [0.5, 0.5, 0.5]): Sampler {
  // Share points by each lump's surface, so thin limbs aren't brighter than a chest.
  const area = body.map((l) => l.size[0] * l.size[1] + l.size[1] * l.size[2] + l.size[0] * l.size[2]);
  const total = area.reduce((a, b) => a + b, 0);
  return (r) => {
    for (let tries = 0; ; tries++) {
      let k = r() * total, n = 0;
      while (n < body.length - 1 && (k -= area[n]) > 0) n++;
      const l = body[n], u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u);
      const p: V3 = [l.at[0] + Math.cos(a) * s * l.size[0], l.at[1] + u * l.size[1], l.at[2] + Math.sin(a) * s * l.size[2]];
      const buried = body.some((q) => q !== l && ((p[0] - q.at[0]) / q.size[0]) ** 2 + ((p[1] - q.at[1]) / q.size[1]) ** 2 + ((p[2] - q.at[2]) / q.size[2]) ** 2 < 0.94);
      if (!buried || tries > 40) return { p, c: color };
    }
  };
}

/** A trunk from its width and depth at a few heights, as a close row of lumps. */
export function torso(at: [y: number, w: number, d: number][]): Lump[] {
  return at.slice(1).flatMap(([y1, w1, d1], i) => {
    const [y0, w0, d0] = at[i], n = Math.max(2, Math.round(Math.abs(y1 - y0) / 0.045));
    return Array.from({ length: n }, (_, j) => {
      const u = j / n, k = u * u * (3 - 2 * u);
      return lump(1, [0, lerp(y0, y1, u), 0], [lerp(w0, w1, k), 0.16, lerp(d0, d1, k)]);
    });
  });
}

export const both = (f: (k: 1 | -1) => Lump[]) => [...f(1), ...f(-1)];

/** Someone sitting cross-legged, hands on knees, 2.7 tall. The head is at y 1.42, the heart at 0.55. */
export const MEDITATOR: Lump[] = [
  lump(1, [0, 1.46, 0.04], [0.31, 0.4, 0.34]),
  lump(1, [0, 1.03, 0], [0.14, 0.2, 0.14]),
  ...torso([[0.74, 0.44, 0.23], [0.6, 0.52, 0.28], [0.2, 0.39, 0.25], [-0.15, 0.4, 0.27], [-0.48, 0.47, 0.32]]),
  ...both((k) => [
    lump(1, [k * 0.46, 0.78, 0], [0.2, 0.18, 0.19]),
    ...lumps(1, [k * 0.56, 0.74, 0], [k * 0.82, 0.12, 0.12], 0.15, 0.11, 15),
    ...lumps(1, [k * 0.82, 0.12, 0.12], [k * 0.98, -0.42, 0.62], 0.11, 0.075, 15),
    lump(1, [k * 1, -0.48, 0.72], [0.1, 0.06, 0.13]),
    ...lumps(1, [k * 0.28, -0.5, 0.05], [k * 1.12, -0.62, 0.5], 0.25, 0.18, 15),
    ...lumps(1, [k * 1.12, -0.64, 0.5], [k * -0.1, -0.72, 0.74], 0.17, 0.11, 15),
  ]),
];

/** Someone standing, arms a little open, 3.6 tall. */
export const STANDING: Lump[] = [
  lump(1, [0, 1.56, 0.03], [0.25, 0.33, 0.28]),
  lump(1, [0, 1.2, 0], [0.11, 0.16, 0.11]),
  ...torso([[0.96, 0.37, 0.2], [0.8, 0.43, 0.23], [0.4, 0.31, 0.2], [0.02, 0.37, 0.23], [-0.12, 0.33, 0.22]]),
  ...both((k) => [
    lump(1, [k * 0.4, 0.98, 0], [0.16, 0.15, 0.16]),
    ...lumps(1, [k * 0.47, 0.96, 0], [k * 0.76, 0.36, 0.02], 0.12, 0.09, 15),
    ...lumps(1, [k * 0.76, 0.36, 0.02], [k * 0.96, -0.2, 0.16], 0.09, 0.06, 15),
    ...lumps(1, [k * 0.19, -0.1, 0], [k * 0.27, -0.95, 0.03], 0.2, 0.13, 15),
    ...lumps(1, [k * 0.27, -0.95, 0.03], [k * 0.3, -1.8, -0.02], 0.13, 0.08, 15),
    lump(1, [k * 0.31, -1.88, 0.1], [0.1, 0.07, 0.2]),
  ]),
];

/** A body whose colours climb it like a slow rainbow. `stream` 0…1 of its points keep leaving in a rising whirl, and others
 * keep arriving: the same body, never the same points. */
export function person(body: Lump[], o: { stream?: number; speed?: number; gain?: number; stripes?: number } = {}): Sampler {
  const { stream = 0, speed = 0.1, gain = 0.75, stripes = 0.3 } = o;
  return living(skin(body), (p, t, key, phase) => {
    neon(p[1] * stripes - t * 0.07 + key * 0.08, p, 3, gain);
    if (key >= stream) return;
    // Out of the body for part of each turn.
    const cycle = mod(t * speed + phase / TAU, 1), out = Math.sin(Math.PI * smooth(0.45, 1, cycle)) ** 0.8 * smooth(0.45, 0.5, cycle);
    if (out <= 0) return;
    const a = Math.atan2(p[2], p[0]) + out * (1.6 + key * 3), r = Math.hypot(p[0], p[2]) + out * (0.9 + 5 * key);
    p[0] = Math.cos(a) * r;
    p[2] = Math.sin(a) * r;
    p[1] += out * (1.6 * Math.sin(phase * 5) + 0.9);
    for (let i = 3; i < 6; i++) p[i] *= 1 + out * 0.6;
  });
}

// ── A ship ─────────────────────────────────────────────────────────────────────────────────────────────

/** An old ship under sail, 4.4 long, whose planks are replaced one by one from `from` to `to`: amber turns to neon. */
export function ship(from: number, to: number): Sampler {
  const ROWS = 7, COLS = 11;
  const hull = (u: number, v: number, side: number): V3 => {
    const sheer = 0.32 * u * u + (u > 0 ? 0.28 : 0.16) * Math.abs(u) ** 5, keel = -0.95 + 0.55 * Math.abs(u) ** 3;
    const beam = 0.62 * Math.sqrt(Math.max(0, 1 - Math.abs(u) ** 2.6)) * (0.35 + 0.65 * Math.sqrt(1 - v));
    return [u * 2.2, lerp(-0.1 + sheer, keel, v), side * beam];
  };
  // The point's colour carries when its plank is replaced (0…1; −1 never), its shade and its palette place.
  const sampler = (r: Rand): Dot => {
    const k = r();
    if (k < 0.56) {
      const row = Math.floor(r() * ROWS), col = Math.floor(r() * COLS), fv = r(), fu = r();
      // Seams between planks stay dark.
      const v = (row + 0.08 + 0.84 * fv) / ROWS, u = ((col + (row % 2) * 0.5 + 0.04 + 0.92 * fu) / (COLS + 0.5)) * 2 - 1;
      const when = mod(Math.sin((row * 31 + col * 17) * 12.9898) * 43758.5453, 1), edge = fv < 0.12 || fv > 0.88 || fu < 0.05 || fu > 0.95;
      return { p: hull(Math.min(0.999, u), v, r() < 0.5 ? 1 : -1), c: [when, edge ? 1 : 0.45, col / COLS] };
    }
    if (k < 0.8) {
      // The sail, full of wind, ribbed.
      const u = r() * 2 - 1, v = r(), rib = r() < 0.4, w = rib ? Math.round(u * 4) / 4 : u, belly = 0.6 * (1 - w * w) * Math.sin(Math.PI * (0.15 + 0.8 * v));
      return { p: [0.1 + belly * 0.9 + 0.05, 0.75 + v * 1.75, w * (0.95 - 0.12 * v)], c: [0.15 + 0.8 * v, rib ? 0.9 : 0.4, 0.5 + 0.3 * v] };
    }
    if (k < 0.86) return { p: [0.02 + gauss(r) * 0.03, -0.3 + r() * 3.05, gauss(r) * 0.03], c: [-1, 0.9, 0] };
    if (k < 0.9) {
      const u = r(), s = r() < 0.5 ? -1 : 1;
      return { p: [lerp(0, s * 2.1, u), lerp(2.7, 0.25, u), 0], c: [-1, 0.5, 0] };
    }
    const o = Math.floor(r() * 9), u = r(), s = r() < 0.5 ? 1 : -1, x = -1.3 + o * 0.32;
    return { p: [x - 0.35 * u, lerp(-0.2, -1.05, u), s * lerp(0.5, 1.25, u)], c: [-1, 0.6, 0] };
  };
  return living(sampler, (p, t, key) => {
    const when = p[3], shade = p[4], hue = p[5], at = lerp(from, to, when);
    const now = when < 0 ? 0 : smooth(at, at + 0.35, t), pop = when < 0 ? 0 : Math.max(0, 1 - Math.abs(t - at - 0.2) / 0.6);
    const roll = 0.05 * Math.sin(t * 0.9), bob = 0.07 * Math.sin(t * 1.3);
    const [x, y, z] = p;
    p[0] = x;
    p[1] = y * Math.cos(roll) - z * Math.sin(roll) + bob + 0.03 * x * Math.sin(t * 1.1);
    p[2] = z * Math.cos(roll) + y * Math.sin(roll) + pop * 0.35 * Math.sign(z);
    neon(hue * 0.6 + t * 0.05, p, 3, shade * 1.15);
    const amber: RGB = [0.62 * shade, 0.36 * shade, 0.13 * shade];
    for (let i = 0; i < 3; i++) p[3 + i] = lerp(amber[i], p[3 + i], now) + pop * 0.45 * (0.4 + 0.6 * key);
  });
}

// ── Water ──────────────────────────────────────────────────────────────────────────────────────────────

/** A river winding from the horizon to the camera and past it, banks of contour lines either side. */
export function river(y = -1.5): Sampler {
  const sampler = (r: Rand): Dot => {
    const bank = r() < 0.36;
    return { p: [r(), bank ? (r() < 0.5 ? -1 : 1) * (1.15 + Math.floor(r() * 9) * 0.33 + r() * 0.04) : Math.round((r() * 2 - 1) * 9) / 9 + gauss(r) * 0.025, r()], c: [bank ? 1 : 0, 0, 0] };
  };
  return living(sampler, (p, t, key, phase) => {
    const [u, w, h] = p, bank = p[3] > 0.5;
    // The middle runs faster than the edges; the banks stand still.
    const run = bank ? u : mod(u + t * (0.075 - 0.03 * w * w) * (0.85 + 0.3 * key), 1);
    const z = lerp(-13, 6.4, run), x = Math.sin(z * 0.55) * 1.25 * smooth(8, -4, z) + w * 1.05;
    p[0] = x;
    p[2] = z;
    p[1] = y + (bank ? 0.12 + 0.22 * (Math.abs(w) - 1) + 0.1 * Math.sin(z * 0.9 + w * 2) : 0.07 * Math.sin(z * 2.4 - t * 2.2 + w * 2) + 0.035 * Math.sin(z * 5 - t * 3 + phase));
    if (bank) neon(Math.abs(w) * 0.12 + t * 0.03 + 0.3, p, 3, 0.4 + 0.1 * h);
    else neon(w * 0.2 + z * 0.06 - t * 0.12 + 0.45, p, 3, 0.8 + 0.35 * Math.sin(z * 2.4 - t * 2.2));
    for (let i = 3; i < 6; i++) p[i] *= smooth(-13, -8, z) * smooth(6.4, 5, z);
  });
}

export const swell = (x: number, z: number, t: number) => 0.16 * Math.sin(x * 0.9 + t * 0.9) + 0.12 * Math.sin(z * 1.3 - t * 1.1 + x * 0.4) + 0.05 * Math.sin(x * 2.7 - z * 1.9 + t * 1.7);

/** A sea, out of which someone rises and into which they sink. `up(t)` 0…1. */
export function seaPerson(body: Lump[], y: number, up: (t: number) => number, share = 0.5): Sampler {
  const figure = skin(body);
  const sampler = (r: Rand): Dot => {
    if (r() < share) return { p: figure(r).p, c: [1, 0, 0] };
    // Closer together towards the middle, where it's looked at.
    const a = r() * TAU, d = 8 * r() ** 0.75;
    return { p: [Math.cos(a) * d, 0, Math.sin(a) * d], c: ZERO };
  };
  return living(sampler, (p, t, key) => {
    const k = up(t), d = Math.hypot(p[0], p[2]);
    const rise = (x: number, z: number) => y + swell(x, z, t) + (0.35 + 0.5 * k) * Math.exp(-(x * x + z * z) * 0.75) + 0.1 * k * Math.sin(Math.hypot(x, z) * 5 - t * 3) * Math.exp(-Math.hypot(x, z) * 0.4);
    if (p[3] > 0.5) {
      // Spread flat in the water, then drawn up from the crown down.
      const top = smooth(0, 1, k * 1.7 - (0.7 * (1.9 - p[1])) / 2.7), x0 = p[0] * (1 + 3.2 * (1 - top)), z0 = p[2] * (1 + 4 * (1 - top)) + (1 - top) * gaussOf(key) * 2;
      const h = rise(x0, z0);
      p[1] = lerp(h, p[1], top);
      neon(p[1] * 0.2 - t * 0.06 + 0.5, p, 3, 0.45 + 0.3 * top);
      p[0] = x0;
      p[2] = z0;
      return;
    }
    p[1] = rise(p[0], p[2]);
    neon(0.5 + d * 0.05 - t * 0.06 + p[1] * 0.15, p, 3, 0.95 + 1.2 * Math.max(0, p[1] - y));
  });
}
/** A steady bell-shaped number from a point's key. */
const gaussOf = (key: number) => Math.cos(key * 91.7) * Math.sqrt(-Math.log(Math.max(1e-4, mod(key * 37.3, 1)))) * 0.7;

// ── Dreams and eyes ────────────────────────────────────────────────────────────────────────────────────

/** A butterfly 4.6 across, beating its wings, banded like an agate. `flap` is beats in radians a second. */
export function butterfly(o: { scale?: number; flap?: number; gain?: (t: number) => number } = {}): Sampler {
  const { scale = 0.66, flap = 2.4, gain = () => 1 } = o;
  const sampler = (r: Rand): Dot => {
    if (r() < 0.05) return { p: [gauss(r) * 0.05, -0.55 + r() * 1.25, gauss(r) * 0.05], c: [2, 0, 0] };
    const a = r() * TAU, s = Math.sin(a), R = Math.exp(s) - 2 * Math.cos(4 * a) + Math.sin((2 * a - Math.PI) / 24) ** 5;
    // Bands across the wing, veins along it, and its edge.
    const q = r(), k = q < 0.16 ? 1 - 0.012 * r() : q < 0.74 ? (Math.floor(r() * 9) + 0.8 + 0.25 * r()) / 9.4 : Math.sqrt(r());
    return { p: [Math.cos(a) * R * k, s * R * k, 0], c: [k, a / TAU, q < 0.16 ? 1 : 0] };
  };
  return living(sampler, (p, t, key) => {
    const g = gain(t), k = p[3], a = p[4], edge = p[5];
    if (k > 1.5) {
      neon(0.1 + t * 0.05, p, 3, 0.9 * g);
      return;
    }
    // The curve runs through the middle over and over: thin it there.
    const mid = smooth(0.05, 1.3, Math.hypot(p[0], p[1]));
    const beat = 0.5 + 0.5 * Math.sin(t * flap) + 0.06 * Math.sin(t * 5), turn = 0.15 + 0.75 * beat, x = p[0] * scale, y = p[1] * scale;
    p[0] = x * Math.cos(turn);
    p[2] = Math.abs(x) * Math.sin(turn) - 0.2;
    p[1] = y + 0.1 * Math.sin(t * flap + 1.2);
    neon(k * 1.1 - t * 0.12 + Math.abs(a - 0.5) * 0.5, p, 3, g * mid * (0.45 + 0.4 * k + 0.6 * edge + 0.1 * key));
  });
}

/** Someone with a butterfly's wings. `man(t)` 0…1 says which of the two is the solid one. */
export function winged(man: (t: number) => number): Sampler {
  const wings = butterfly({ scale: 0.68, flap: 1.5 }), body = person(MEDITATOR, { gain: 0.95 });
  // The figure's points are marked by being moved far off; its life moves them back.
  const FAR = 100;
  return living(
    (r) => {
      if (r() < 0.55) return wings(r);
      const d = body(r);
      return { p: [d.p[0] + FAR, d.p[1], d.p[2]], c: d.c };
    },
    (p, t, key, phase) => {
      const m = man(t);
      if (p[0] < FAR / 2) {
        wings.life!(p, t, key, phase);
        p[2] -= 0.5;
        for (let i = 3; i < 6; i++) p[i] *= 1.05 - 0.72 * m;
        return;
      }
      p[0] -= FAR;
      body.life!(p, t, key, phase);
      const s = 0.62 + 0.3 * m;
      for (let i = 0; i < 3; i++) p[i] *= s;
      for (let i = 3; i < 6; i++) p[i] *= 0.28 + 0.8 * m;
    },
  );
}

/** A great eye 4.6 across looking at you. `open(t)` 0…1, `pupil(t)` its pupil's radius (about 0.5). */
export function eye(open: (t: number) => number, pupil: (t: number) => number): Sampler {
  const sampler = (r: Rand): Dot => {
    const k = r();
    // Kinds: 0 iris fibre, 1 lid lines, 2 the white, 3 lashes.
    if (k < 0.62) return { p: [(Math.floor(r() * 150) / 150) * TAU + gauss(r) * 0.006, r() ** 0.8, gauss(r)], c: [0, r(), 0] };
    if (k < 0.82) return { p: [r() * 2 - 1, r() < 0.5 ? 1 : -1, Math.floor(r() * 6)], c: [1, r(), 0] };
    if (k < 0.9) return { p: [r() * 2 - 1, r() * 2 - 1, 0], c: [2, r(), 0] };
    return { p: [(Math.floor(r() * 34) + 0.5) / 34, r() < 0.62 ? 1 : -1, r()], c: [3, r(), 0] };
  };
  const lid = (x: number) => Math.max(0, 1 - x * x) ** 0.85;
  return living(sampler, (p, t) => {
    const kind = p[3], o = open(t), shine = p[4];
    const HALF = 2.3, TALL = 1.3 * o + 0.015;
    if (kind < 0.5) {
      const a = p[0], rr = p[1], pr = pupil(t), R = lerp(pr, 1.22, rr) + 0.02 * Math.sin(a * 9 + t * 2), tw = a + 0.16 * Math.sin(rr * 7 - t * 1.3) * rr + t * 0.05;
      const x = Math.cos(tw) * R, y = Math.sin(tw) * R, room = TALL * lid(x / HALF);
      p[0] = x;
      p[1] = y;
      p[2] = 0.25 * (1 - rr);
      neon(rr * 0.7 - t * 0.1 + 0.12 * Math.sin(a * 6), p, 3, Math.abs(y) < room ? 0.45 + 0.75 * (1 - rr) + 0.25 * shine : 0);
      return;
    }
    if (kind < 1.5) {
      const x = p[0], s = p[1], n = p[2], y = s * TALL * lid(x) + s * n * 0.13 * (1 - 0.6 * x * x) * (s > 0 ? 1 : 0.6);
      neon(n * 0.1 - t * 0.08 + x * 0.1, p, 3, 0.9 / (1 + n * 0.55));
      p[0] = x * HALF * (1 + n * 0.035);
      p[1] = y;
      p[2] = -0.1 * n;
      return;
    }
    if (kind < 2.5) {
      const x = p[0], y = p[1] * TALL * lid(x);
      p[0] = x * HALF;
      p[1] = y;
      p[2] = -0.1;
      const far = Math.hypot(p[0], y) > 1.24 ? 0.22 : 0;
      p[3] = far * 0.8;
      p[4] = far * 0.85;
      p[5] = far;
      return;
    }
    const x = (p[0] * 2 - 1) * 0.94, s = p[1], l = p[2];
    neon(0.2 + x * 0.2 - t * 0.06, p, 3, 0.7 * (1 - l));
    p[0] = x * HALF * (1 + 0.2 * l);
    p[1] = s * (TALL * lid(x) + (s > 0 ? 0.72 : 0.34) * l * (0.5 + 0.5 * o) + 0.1);
    p[2] = 0.2 * l;
  });
}

// ── Space ──────────────────────────────────────────────────────────────────────────────────────────────

/** A breathing tunnel rushing at you. `z(t)` is how far you've travelled. */
export function tunnel(travel: (t: number) => number, arms = 6): Sampler {
  const LONG = 22;
  const sampler = (r: Rand): Dot => {
    const ring = r() < 0.5;
    return { p: [r() * TAU, ring ? (Math.floor(r() * 30) / 30) * LONG : r() * LONG, ring ? 0 : Math.floor(r() * arms * 2)], c: [ring ? 0 : 1, r(), 0] };
  };
  return living(sampler, (p, t) => {
    const rib = p[3] > 0.5, d = mod(p[1] + travel(t), LONG), z = d - 15.5;
    // Rings across it, and ribs that spiral along it.
    const a = rib ? (p[2] / (arms * 2)) * TAU + z * 0.16 : p[0], R = 1.75 + 0.28 * Math.sin(a * arms + z * 0.7 + t * 0.8) + 0.12 * Math.sin(z * 1.3 - t * 1.6);
    const b = a + 0.1 * z + t * 0.12;
    const g = smooth(-15.5, -9, z) * smooth(6.5, 4, z) * (1 + p[4]) * (1 + Math.max(0, -z) * 0.22);
    p[0] = Math.cos(b) * R;
    p[1] = Math.sin(b) * R;
    p[2] = z;
    neon(z * 0.07 + t * 0.1 + (rib ? 0.35 : 0), p, 3, g * 0.95);
  });
}

/** An endless net with a jewel at every knot, drifting towards you. */
export function net(travel: (t: number) => number, gap = 1.9): Sampler {
  const NX = 5, NZ = 6, LONG = NZ * gap;
  const sampler = (r: Rand): Dot => {
    const cell = (n: number) => Math.floor(r() * n) - (n - 1) / 2;
    const at: V3 = [cell(NX) * gap, cell(NX) * gap, Math.floor(r() * NZ) * gap], hue = mod(at[0] * 0.31 + at[1] * 0.17 + at[2] * 0.23, 1);
    const k = r();
    if (k < 0.3) {
      const axis = Math.floor(r() * 3), u = (r() - 0.5) * gap;
      at[axis] += u;
      return { p: at, c: [0, hue, 0] };
    }
    // A jewel: rings round it, a lit heart, and small sparks: the others, seen in it.
    const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u), kind = r(), R = kind < 0.5 ? 0.34 : kind < 0.7 ? 0.09 * r() : 0.2;
    const q = kind >= 0.7 ? [Math.round(u * 3) / 3, Math.round(a * 1.3) / 1.3] : [u, a], ss = kind >= 0.7 ? Math.sqrt(1 - q[0] * q[0]) : s;
    return { p: [at[0] + Math.cos(q[1]) * ss * R, at[1] + q[0] * R, at[2] + Math.sin(q[1]) * ss * R], c: [kind < 0.5 ? 1 : kind < 0.7 ? 2 : 3, hue, 0] };
  };
  return living(sampler, (p, t, key) => {
    const kind = p[3], hue = p[4], z = mod(p[2] + travel(t), LONG) - LONG + 5.2;
    p[2] = z;
    const a = 0.05 * z + 0.12 * Math.sin(t * 0.3), x = p[0], y = p[1];
    p[0] = x * Math.cos(a) - y * Math.sin(a) + 0.12 * Math.sin(z * 0.6 + t * 0.7);
    p[1] = x * Math.sin(a) + y * Math.cos(a) + 0.12 * Math.sin(z * 0.5 + t * 0.6 + 1);
    const fade = smooth(-6.2, -3.5, z) * smooth(5.2, 3.6, z) * (1 + Math.max(0, -z) * 0.3);
    if (kind < 0.5) neon(0.5 + z * 0.03 - t * 0.1, p, 3, 1.3 * fade);
    else neon(hue + t * 0.06 + (kind > 2.5 ? key : 0), p, 3, fade * (kind < 1.5 ? 1.8 : kind < 2.5 ? 2.6 : 2.4));
  });
}

/** A spiral galaxy turning, seen from a little above, with someone sitting at its heart. */
export function galaxyPerson(body: Lump[], scale = 0.5, share = 0.3): Sampler {
  const figure = skin(body), FAR = 100;
  const sampler = (r: Rand): Dot => {
    if (r() < share) {
      const p = figure(r).p;
      return { p: [p[0] + FAR, p[1], p[2]], c: ZERO };
    }
    const arm = Math.floor(r() * 3), d = 0.35 + 4.8 * r() ** 0.8, a = (arm / 3) * TAU + Math.log(d + 0.4) * 2.3 + gauss(r) * (0.2 + 0.35 * r() * r());
    return { p: [a, gauss(r) * 0.1 * Math.exp(-d * 0.4), d], c: [0, r(), 0] };
  };
  return living(sampler, (p, t, key) => {
    if (p[0] > FAR / 2) {
      p[0] = (p[0] - FAR) * scale;
      p[1] = p[1] * scale + 0.05;
      p[2] *= scale;
      neon(p[1] * 0.4 - t * 0.08 + 0.1, p, 3, 0.26);
      return;
    }
    // The whole spiral turns as one: stars circling at their own speeds would wind it into rings.
    const d = p[2], a = p[0] - t * 0.16, h = p[1], tilt = 0.5;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, sparkle = p[4];
    p[0] = x;
    p[1] = h * Math.cos(tilt) - z * Math.sin(tilt);
    p[2] = z * Math.cos(tilt) + h * Math.sin(tilt);
    neon(d * 0.13 - t * 0.04 + 0.05 * key, p, 3, (1.5 * Math.exp(-d * 0.22) + 0.15) * smooth(0.2, 1.4, d) * (0.6 + 0.6 * sparkle));
  });
}

/** Rings of petals blooming outwards without end: a ground for the other shapes. Flat, at depth `z`. */
export function mandala(z = -0.8, o: { petals?: number; reach?: number; speed?: number; gain?: number } = {}): Sampler {
  const { petals = 12, reach = 6, speed = 0.035, gain = 1.6 } = o, RINGS = 9;
  const sampler = (r: Rand): Dot => ({ p: [r() * TAU, (Math.floor(r() * RINGS) + gauss(r) * 0.03) / RINGS, r()], c: ZERO });
  const life: Life = (p, t) => {
    const a = p[0], k = mod(p[1] + t * speed, 1), odd = Math.floor(p[1] * RINGS + 0.5) % 2 ? 1 : -1;
    const R = reach * k * (1 + 0.2 * Math.abs(Math.sin((a * petals) / 2 + odd * t * 0.1)) + 0.012 * Math.sin(a * petals * 3 - t)), b = a + odd * t * 0.05;
    p[0] = Math.cos(b) * R;
    p[1] = Math.sin(b) * R;
    p[2] = z;
    neon(k * 1.2 - t * 0.06, p, 3, gain * smooth(0.24, 0.36, k) * smooth(1, 0.7, k));
  };
  return living(sampler, life);
}
