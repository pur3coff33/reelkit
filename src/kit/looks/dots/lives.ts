// More living shapes for points of light, for stories about people: poses, a tableau that stands several shapes together,
// light flowing between people, a wall that dissolves, a glass of water with salt, a boat and a net, a crown and a gown, a
// helmet, a bus window, open water, little figures circling, and the cosmic egg. Sizes match ideas.ts: someone standing is
// 3.8 tall with their feet at y −1.95, facing +z (the camera).
import { TAU, gauss, lerp, smooth, type RGB, type V3 } from "../core";
import { line, living, lump, lumps, type Lump, type Sampler } from "./forms";
import { STANDING, both, skin, swell, torso } from "./ideas";
import { neon } from "./trip";

const mod = (x: number, m: number) => ((x % m) + m) % m;
const ZERO: RGB = [0, 0, 0];

// ── Poses ──────────────────────────────────────────────────────────────────────────────────────────────

/** Sitting on a seat, hands on the thighs, facing +z. The seat is at y −0.3, the feet at −1.3. */
export const SEATED: Lump[] = [
  lump(1, [0, 1.36, 0.03], [0.25, 0.33, 0.28]),
  lump(1, [0, 1.0, 0], [0.11, 0.16, 0.11]),
  ...torso([[0.76, 0.37, 0.2], [0.6, 0.43, 0.23], [0.2, 0.31, 0.2], [-0.18, 0.37, 0.23], [-0.32, 0.36, 0.26]]),
  ...both((k) => [
    lump(1, [k * 0.4, 0.78, 0], [0.16, 0.15, 0.16]),
    ...lumps(1, [k * 0.47, 0.76, 0], [k * 0.52, 0.2, 0.12], 0.12, 0.09, 15),
    ...lumps(1, [k * 0.52, 0.2, 0.12], [k * 0.3, -0.14, 0.58], 0.09, 0.06, 15),
    ...lumps(1, [k * 0.2, -0.32, 0.05], [k * 0.24, -0.3, 0.85], 0.2, 0.14, 15),
    ...lumps(1, [k * 0.24, -0.32, 0.85], [k * 0.26, -1.2, 0.9], 0.13, 0.08, 15),
    lump(1, [k * 0.26, -1.28, 1.0], [0.1, 0.07, 0.2]),
  ]),
];

/** Curled up asleep on its side, knees to the chest, about 2 across: something not yet born. Seen side-on from +z. */
export const CURLED: Lump[] = (() => {
  const arc = (deg: number, r: number): [number, number] => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];
  const out: Lump[] = [];
  for (let a = 36; a <= 144; a += 3) {
    const [x, y] = arc(a, 0.62), w = 0.42 - (0.1 * Math.abs(a - 95)) / 55;
    out.push(lump(1, [x, y, 0], [w, w, 0.34]));
  }
  const [hx, hy] = arc(170, 0.8);
  out.push(lump(1, [hx, hy - 0.1, 0.02], [0.3, 0.33, 0.28]));
  for (const k of [-1, 1]) {
    const hip = arc(30, 0.5), shoulder = arc(130, 0.55);
    out.push(...lumps(1, [hip[0], hip[1], k * 0.16], [-0.28, -0.55, k * 0.18], 0.24, 0.17, 15));
    out.push(...lumps(1, [-0.28, -0.55, k * 0.18], [0.45, -0.8, k * 0.16], 0.16, 0.1, 15));
    out.push(...lumps(1, [shoulder[0], shoulder[1], k * 0.2], [-0.58, -0.32, k * 0.14], 0.12, 0.08, 15));
  }
  return out;
})();

/** Standing, without legs: under a gown or behind something. */
export const UPPER: Lump[] = STANDING.filter((l) => l.at[1] > -0.25);

// ── Standing shapes together ───────────────────────────────────────────────────────────────────────────

/** One shape in a tableau: where it stands, how it's turned, and how it's coloured. */
export type Piece = {
  shape: Sampler;
  /** Its share of the points. */
  weight: number;
  at?: V3;
  scale?: number;
  /** Turned about y, taking +x towards +z: π/2 faces +x, −π/2 faces −x. */
  turn?: number;
  /** Radians a second. */
  spin?: number;
  move?: (t: number) => V3;
  /** Plain shapes are rainbow-striped by height: where on the wheel they start, how bright, how many stripes. */
  hue?: number;
  gain?: number;
  stripes?: number;
  /** Colours it instead: `p` is x, y, z, r, g, b. */
  color?: (p: number[], t: number, key: number) => void;
  /** Keeps the colours the shape gave its points (times `gain`). */
  keep?: boolean;
  /** Brightness over time. */
  fade?: (t: number) => number;
};

// Each piece's points are carried this far apart in x until their life sorts them out.
const SLOT = 1000;

/** Several shapes as one: a person and what they hold, two people, an egg on water. Don't put a tableau in a tableau. */
export function tableau(pieces: Piece[]): Sampler {
  const total = pieces.reduce((n, p) => n + p.weight, 0);
  return living(
    (r) => {
      let k = r() * total, i = 0;
      while (i < pieces.length - 1 && (k -= pieces[i].weight) > 0) i++;
      const d = pieces[i].shape(r);
      return { p: [d.p[0] + SLOT * (i + 1), d.p[1], d.p[2]], c: d.c };
    },
    (p, t, key, phase) => {
      const i = Math.round(p[0] / SLOT) - 1, pc = pieces[i];
      p[0] -= SLOT * (i + 1);
      if (pc.shape.life) {
        pc.shape.life(p, t, key, phase);
        const g = pc.gain ?? 1;
        for (let k = 3; k < 6; k++) p[k] *= g;
      } else if (pc.color) pc.color(p, t, key);
      else if (pc.keep) for (let k = 3; k < 6; k++) p[k] *= pc.gain ?? 1;
      else neon(p[1] * (pc.stripes ?? 0.3) - t * 0.07 + key * 0.08 + (pc.hue ?? 0), p, 3, pc.gain ?? 0.8);
      if (pc.fade) {
        const f = pc.fade(t);
        for (let k = 3; k < 6; k++) p[k] *= f;
      }
      const s = pc.scale ?? 1, a = (pc.turn ?? 0) + (pc.spin ?? 0) * t, c = Math.cos(a), n = Math.sin(a), at = pc.at ?? [0, 0, 0], m = pc.move?.(t);
      const x = p[0] * s, z = p[2] * s;
      p[0] = at[0] + x * c + z * n + (m?.[0] ?? 0);
      p[1] = at[1] + p[1] * s + (m?.[1] ?? 0);
      p[2] = at[2] + z * c - x * n + (m?.[2] ?? 0);
    },
  );
}

/** A person as a piece, standing with their feet on `ground` at (x, z). */
export function someone(pose: Lump[], x: number, z: number, o: Partial<Piece> & { ground?: number; tall?: number } = {}): Piece {
  const { ground = -1.7, tall = 1, ...rest } = o, s = rest.scale ?? 0.6;
  const feet = pose === SEATED ? 1.3 : pose === CURLED ? 0.95 : 1.95;
  return { shape: skinOf(pose), weight: 10 * s * s * tall, at: [x, ground + feet * s, z], scale: s, ...rest };
}

/** Gold, shimmering. For a piece's `color`. */
export const golden = (gain = 1, tint: RGB = [1, 0.62, 0.2]) => (p: number[], t: number, key: number) => {
  const s = gain * (0.72 + 0.28 * Math.sin(p[1] * 4 - t * 1.5 + key * 6));
  for (let i = 0; i < 3; i++) p[3 + i] = tint[i] * s;
};

// ── Between people ─────────────────────────────────────────────────────────────────────────────────────

/** Light flowing along an arc from one point to another (and back the low way, with `both`). */
export function stream(from: V3, to: V3, o: { lift?: number; speed?: number; width?: number; hue?: number; gain?: number; both?: boolean } = {}): Sampler {
  const { lift = 0.8, speed = 0.3, width = 0.05, hue = 0.9, gain = 1.1, both: two = false } = o;
  return living(
    (r) => ({ p: [r(), gauss(r) * width, gauss(r) * width], c: [two && r() < 0.5 ? 1 : 0, 0, 0] }),
    (p, t, key) => {
      const back = p[3] > 0.5, ox = p[1], oy = p[2], u0 = mod(p[0] + t * speed * (0.8 + 0.4 * key), 1), u = back ? 1 - u0 : u0;
      const up = back ? -lift * 0.5 : lift, a = (1 - u) ** 2, b = 2 * u * (1 - u), c = u * u;
      const mid: V3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + up, (from[2] + to[2]) / 2];
      p[0] = a * from[0] + b * mid[0] + c * to[0] + ox;
      p[1] = a * from[1] + b * mid[1] + c * to[1] + oy;
      p[2] = a * from[2] + b * mid[2] + c * to[2] + ox * 0.5;
      neon(hue + u * 0.1 + 0.03 * Math.sin(t) + (back ? 0.06 : 0), p, 3, gain * Math.sin(Math.PI * u) ** 0.5);
    },
  );
}

/** A wall of bricks `w` wide and `h` high, standing on y0, that comes apart into drifting points as `open(t)` goes 0 → 1. */
export function wall(w: number, h: number, open: (t: number) => number, y0 = -1.7): Sampler {
  const BW = 0.62, BH = 0.31;
  return living(
    (r) => {
      const row = Math.floor((r() * h) / BH), y = y0 + row * BH, off = row % 2 ? BW / 2 : 0;
      if (r() < 0.5) return { p: [(r() - 0.5) * w, y, gauss(r) * 0.02], c: ZERO };
      const col = Math.floor(r() * (w / BW + 1));
      return { p: [-w / 2 + col * BW + off, y + r() * BH, gauss(r) * 0.02], c: ZERO };
    },
    (p, t, key, phase) => {
      const k = open(t), gone = smooth(key * 0.75, key * 0.75 + 0.25, k);
      if (gone > 0) {
        p[1] += gone * (1.2 + 2.5 * key);
        p[0] += gone * Math.sin(phase) * 1.4;
        p[2] += gone * Math.cos(phase) * 1.4;
      }
      if (Math.abs(p[0]) > w / 2) p[0] = Math.sign(p[0]) * w / 2;
      neon(0.62 - t * 0.02 + p[1] * 0.04, p, 3, 0.7 * (1 - 0.7 * gone));
    },
  );
}

// ── Things ─────────────────────────────────────────────────────────────────────────────────────────────

/** A glass of water about 2.6 tall. A lump of salt above it drops in at `drop`, has dissolved all through by `gone`, and
 * glows where it's tasted: the top, the middle and the bottom, at the three times in `tastes`. */
export function saltGlass(drop: number, gone: number, tastes: number[]): Sampler {
  const R = 1.1, BOT = -1.5, TOP = 1.05, WATER = 0.55, LEVELS = [0.25, -0.45, -1.15];
  return living(
    (r) => {
      const k = r(), a = r() * TAU;
      if (k < 0.3) {
        const y = r() < 0.35 ? (r() < 0.5 ? BOT : TOP) : lerp(BOT, TOP, r());
        return { p: [Math.cos(a) * R, y, Math.sin(a) * R], c: [0, 0, 0] };
      }
      if (k < 0.66) {
        const d = R * 0.97 * Math.sqrt(r()), top = r() < 0.25;
        return { p: [Math.cos(a) * d, top ? WATER : lerp(BOT + 0.04, WATER, r()), Math.sin(a) * d], c: [1, top ? 1 : 0, 0] };
      }
      // The salt: a crystal, each point knowing where in the water it will end up.
      return { p: [(r() - 0.5) * 0.4, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4], c: [2, r(), r()] };
    },
    (p, t, key, phase) => {
      const kind = p[3];
      let lit = 0;
      tastes.forEach((at, i) => {
        const near = Math.exp(-(((p[1] - LEVELS[i]) / 0.3) ** 2));
        lit += near * smooth(at, at + 0.3, t) * (1 - smooth(at + 1.2, at + 2.2, t));
      });
      if (kind < 0.5) {
        neon(0.6 + p[1] * 0.05 - t * 0.03, p, 3, 0.5);
        return;
      }
      if (kind < 1.5) {
        // Rings spread over the top when the salt goes in.
        const ring = p[4] > 0.5 ? Math.max(0, 1 - Math.abs(Math.hypot(p[0], p[2]) - (t - drop - 0.5) * 0.9) * 4) * smooth(drop + 0.5, drop + 0.6, t) * (1 - smooth(drop + 1, drop + 2, t)) : 0;
        p[1] += ring * 0.05;
        neon(0.62 + p[1] * 0.05, p, 3, 0.28 + 0.5 * ring);
        p[3] += lit * 0.9;
        p[4] += lit * 0.6;
        p[5] += lit * 0.15;
        return;
      }
      const fall = smooth(drop, drop + 0.9, t), melt = smooth(drop + 1.2, gone, t), spin = t * 0.6;
      const cx = p[0] * Math.cos(spin) - p[2] * Math.sin(spin), cz = p[0] * Math.sin(spin) + p[2] * Math.cos(spin);
      const ty = lerp(2.6, BOT + 0.35, fall ** 2) + 0.05 * Math.sin(t * 1.4) * (1 - fall);
      // Where it ends up: anywhere in the water, drifting slowly.
      const a = p[4] * TAU + t * 0.08 * (0.5 + key), d = R * 0.92 * Math.sqrt(key), y = lerp(BOT + 0.08, WATER - 0.05, p[5]) + 0.04 * Math.sin(t + phase);
      p[0] = lerp(cx * (1 - fall * 0.2), Math.cos(a) * d, melt);
      p[1] = lerp(ty + p[1] * (1 - fall * 0.2), y, melt);
      p[2] = lerp(cz, Math.sin(a) * d, melt);
      const g = lerp(1.3, 0.55 + 0.35 * Math.sin(t * 3 + phase * 3), melt) + lit * 1.4;
      p[3] = g;
      p[4] = g * 0.72;
      p[5] = g * 0.3;
    },
  );
}

/** An outrigger boat (banca) 3.8 long, its keel at y −0.42, pointing along x. */
export const boat: Sampler = (r) => {
  const k = r(), s = r() < 0.5 ? -1 : 1;
  if (k < 0.72) {
    const u = r() * 2 - 1, v = r(), beam = 0.62 * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.5 * v);
    return { p: [u * 1.9, lerp(0.15 + 0.35 * u ** 4, -0.42, v), s * beam], c: ZERO };
  }
  const u = r();
  if (k < 0.88) return { p: [(u * 2 - 1) * 1.5, -0.32, s * 1.35], c: ZERO };
  return { p: [(r() < 0.5 ? -1 : 1) * 0.7, lerp(0.05, -0.32, u), s * lerp(0.3, 1.35, u)], c: ZERO };
};

/** A fishing net lying over a seated person's lap and hanging down in front (SEATED's own space). */
export const net: Sampler = (r) => {
  const along = r() < 0.5, i = Math.floor(r() * 11) / 10, j = r();
  const u = along ? i : j, v = along ? j : Math.floor(r() * 8) / 7;
  return { p: [(u - 0.5) * 1.5 + 0.1 * Math.sin(v * 5), -0.28 - 0.9 * v ** 1.6 + 0.05 * Math.sin(u * 14), 0.5 + 0.75 * v], c: ZERO };
};

/** A crown on a standing head. */
export const crown: Sampler = (r) => {
  const a = r() * TAU, R = 0.27;
  if (r() < 0.4) return { p: [Math.cos(a) * R, 1.82 + r() * 0.05, Math.sin(a) * R + 0.03], c: ZERO };
  const f = mod((a / TAU) * 8, 1), h = 0.26 * (1 - Math.abs(f - 0.5) * 2);
  return { p: [Math.cos(a) * R, 1.85 + r() * h, Math.sin(a) * R + 0.03], c: ZERO };
};

/** A long gown from the waist of someone standing to the floor. */
export const gown: Sampler = (r) => {
  const v = r(), a = r() * TAU, R = lerp(0.36, 1.2, v ** 1.3) * (1 + 0.07 * Math.sin(a * 9 + v * 3));
  return { p: [Math.cos(a) * R, lerp(0.15, -1.95, v), Math.sin(a) * R * 0.8], c: ZERO };
};

/** A soldier's helmet on a standing head, and a rifle held across the body. */
export const helmet: Sampler = (r) => {
  const a = r() * TAU;
  if (r() < 0.25) return { p: [Math.cos(a) * 0.42, 1.55, Math.sin(a) * 0.44 + 0.03], c: ZERO };
  const v = (r() * Math.PI) / 2;
  return { p: [Math.cos(a) * Math.cos(v) * 0.34, 1.58 + Math.sin(v) * 0.36, Math.sin(a) * Math.cos(v) * 0.37 + 0.03], c: ZERO };
};
export const rifle: Sampler = line([0.62, -0.15, 0.32], [-0.4, 1.3, 0.34], 0.025, ZERO);

/** A bus's windows behind someone seated, and the city's lights streaming past outside. */
export function busWindow(speed = 3): Sampler {
  const PANES: [number, number][] = [[-2.2, -0.1], [0.1, 2.2]], Y0 = -0.4, Y1 = 1.6, Z = -0.8;
  return living(
    (r) => {
      if (r() < 0.45) {
        const [x0, x1] = PANES[r() < 0.5 ? 0 : 1], u = r(), side = Math.floor(r() * 4);
        const p: V3 = side < 2 ? [lerp(x0, x1, u), side ? Y1 : Y0, Z] : [side === 2 ? x0 : x1, lerp(Y0, Y1, u), Z];
        return { p, c: [0, 0, 0] };
      }
      return { p: [r(), lerp(Y0 + 0.1, Y1 - 0.1, r() ** 1.5), -2.6 - r() * 2], c: [1, r(), 0] };
    },
    (p, t, key) => {
      if (p[3] < 0.5) {
        neon(0.6, p, 3, 0.45);
        return;
      }
      // Seen through the panes from about 8 in front: further lights show across a wider stretch.
      const x = mod(p[0] * 14 - t * speed * (0.6 + 0.8 * key), 14) - 7, k = (8 - p[2]) / (8 - Z);
      const inside = PANES.some(([a, b]) => x > a * k + 0.05 && x < b * k - 0.05) ? 1 : 0;
      neon(p[4] < 0.4 ? 0.9 : p[4] < 0.7 ? 0.05 : 0.55, p, 3, inside * (0.4 + 0.9 * key));
      p[0] = x;
    },
  );
}

/** Open water at height y, a disc `size` across, brighter on the crests. `glint` (an x) lays a road of light across it. */
export function water(y: number, o: { size?: number; glint?: number; gain?: number; hue?: number } = {}): Sampler {
  const { size = 8, glint, gain = 1, hue = 0.62 } = o;
  return living(
    (r) => {
      const a = r() * TAU, d = size * r() ** 0.75;
      return { p: [Math.cos(a) * d, 0, Math.sin(a) * d], c: ZERO };
    },
    (p, t) => {
      const h = swell(p[0], p[2], t) * 0.7;
      p[1] = y + h;
      neon(hue + Math.hypot(p[0], p[2]) * 0.03 - t * 0.04, p, 3, gain * (0.3 + 1.1 * Math.max(0, h)));
      if (glint !== undefined) {
        const k = Math.exp(-(((p[0] - glint) / 0.35) ** 2)) * smooth(-9, -1, p[2]) * (0.5 + h * 4);
        p[3] += k * 1.2;
        p[4] += k * 0.8;
        p[5] += k * 0.3;
      }
    },
  );
}

/** `n` small figures circling inside a column `radius` wide and `height` high: many lives at once. */
export function circling(pose: Lump[], n: number, o: { radius?: number; height?: number; scale?: number; speed?: number; gain?: number } = {}): Sampler {
  const { radius = 1.6, height = 2, scale = 0.12, speed = 0.25, gain = 0.9 } = o, figure = skin(pose);
  return living(
    (r) => {
      const d = figure(r).p;
      return { p: [d[0] * scale, d[1] * scale, d[2] * scale], c: [Math.floor(r() * n), 0, 0] };
    },
    (p, t) => {
      const i = p[3], h = (mod(i * 0.618, 1) - 0.5) * height, a = (i / n) * TAU * 3 + t * speed * (1 + (i % 3) * 0.2);
      const R = radius * Math.sqrt(Math.max(0.05, 1 - ((2 * h) / height) ** 2 * 0.7));
      p[0] += Math.cos(a) * R;
      p[1] += h + 0.08 * Math.sin(t + i);
      p[2] += Math.sin(a) * R;
      neon(i * 0.131 + p[1] * 0.1 - t * 0.05, p, 3, gain);
    },
  );
}

// ── The cosmic egg ─────────────────────────────────────────────────────────────────────────────────────

export type Metal = "gold" | "silver" | "rainbow";
const METALS: Record<Exclude<Metal, "rainbow">, RGB> = { gold: [1, 0.64, 0.2], silver: [0.72, 0.8, 1.05] };

/** An egg 3.1 tall and 2.3 across, its middle at the origin: a shell with rings of light, a glow inside, and cracks that
 * run over it as `crack(t)` goes 0 → 1. `shell` dims the shell to see what's inside. */
export function egg(o: { metal?: Metal; crack?: (t: number) => number; shell?: number; inner?: number; seed?: number } = {}): Sampler {
  const { metal = "gold", crack = () => 0, shell = 1, inner = 1, seed = 7 } = o;
  const at = (v: number, a: number, k = 1): V3 => {
    const R = 1.12 * Math.sin(v) * (1 + 0.12 * Math.cos(v)) * k;
    return [Math.cos(a) * R, -1.55 * Math.cos(v) * k, Math.sin(a) * R];
  };
  // Cracks: wandering lines that start round the top and run down, each a list of (v, a).
  const rr = seeded(seed), cracks: [number, number][][] = Array.from({ length: 7 }, () => {
    let v = 2.6 + rr() * 0.4, a = rr() * TAU;
    return Array.from({ length: 18 }, () => {
      v -= 0.07 + rr() * 0.05;
      a += (rr() - 0.5) * 0.35;
      return [Math.max(0.15, v), a];
    });
  });
  return living(
    (r) => {
      const k = r();
      if (k < 0.5) return { p: at(Math.acos(1 - 2 * r()), r() * TAU), c: [0, 0, 0] };
      if (k < 0.66) {
        // Rings of latitude and lines of longitude.
        const lat = r() < 0.55;
        return { p: lat ? at(((Math.floor(r() * 9) + 1) / 10) * Math.PI, r() * TAU) : at(r() * Math.PI, (Math.floor(r() * 12) / 12) * TAU), c: [1, 0, 0] };
      }
      if (k < 0.8) {
        const c = cracks[Math.floor(r() * cracks.length)], u = r() * (c.length - 1), j = Math.floor(u), f = u - j;
        const [v0, a0] = c[j], [v1, a1] = c[Math.min(c.length - 1, j + 1)];
        return { p: at(lerp(v0, v1, f) + gauss(r) * 0.006, lerp(a0, a1, f) + gauss(r) * 0.006, 1.004), c: [2, u / (c.length - 1), 0] };
      }
      return { p: at(Math.acos(1 - 2 * r()), r() * TAU, Math.cbrt(r()) * 0.95), c: [3, 0, 0] };
    },
    (p, t, key) => {
      const kind = p[3], along = p[4], breathe = 1 + 0.015 * Math.sin(t * 1.6);
      for (let i = 0; i < 3; i++) p[i] *= breathe;
      const shimmer = 0.6 + 0.4 * Math.sin(p[1] * 3.5 - t * 1.2 + Math.atan2(p[2], p[0]) * 2);
      const g = kind < 0.5 ? 0.55 * shell * shimmer : kind < 1.5 ? 1.1 * shell : kind < 2.5 ? 0 : 0.22 * inner;
      if (metal === "rainbow") neon(p[1] * 0.18 - t * 0.06 + (kind > 2.5 ? 0.3 : 0), p, 3, g);
      else for (let i = 0; i < 3; i++) p[3 + i] = METALS[metal][i] * g;
      if (kind > 1.5 && kind < 2.5) {
        // A crack lights from the top down as it opens.
        const c = crack(t), k = smooth(along - 0.08, along, c * 1.1) * smooth(0, 0.04, c) * (0.85 + 0.3 * Math.sin(t * 5 + key * 9));
        p[3] = 2.2 * k;
        p[4] = 1.7 * k;
        p[5] = 1.0 * k;
      }
    },
  );
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}


const skins = new Map<Lump[], Sampler>();
/** The skin of a pose, made once. */
export function skinOf(pose: Lump[]) {
  if (!skins.has(pose)) skins.set(pose, skin(pose));
  return skins.get(pose)!;
}
