// Shapes made of points. A `Sampler` gives one random point of a shape, with its colour; a point cloud is many of them.
// Units are about a metre, y up, ground at y = 0, the camera on the +z side.
import type { Tri } from "../../lowpoly/engine";
import { cross, length, sub } from "../../lowpoly/engine";
import { TAU, gauss, lerp, type RGB, type Rand, type V3 } from "../core";

export type Dot = { p: V3; c: RGB };
/** Moves and colours a point as time goes by: `o` is x, y, z, r, g, b, changed in place. `key` 0…1 and `phase` 0…2π are the
 * point's own and never change. */
export type Life = (o: number[], t: number, key: number, phase: number) => void;
export type Sampler = ((r: Rand) => Dot) & { life?: Life };

/** Gives a shape a life of its own. The sampler's points can be plain numbers that the life turns into places. */
export const living = (s: (r: Rand) => Dot, life: Life): Sampler => Object.assign((r: Rand) => s(r), { life });

const pick = <T>(r: Rand, list: T[]) => list[Math.floor(r() * list.length)];

function onSphere(r: Rand): V3 {
  const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u);
  return [Math.cos(a) * s, u, Math.sin(a) * s];
}

// ── Joining and changing ───────────────────────────────────────────────────────────────────────────────

/** Several shapes as one, each with its share of the points. */
export function join(parts: [weight: number, s: Sampler][]): Sampler {
  const total = parts.reduce((n, [w]) => n + w, 0);
  return (r) => {
    let k = r() * total;
    for (const [w, s] of parts) if ((k -= w) < 0) return s(r);
    return parts[parts.length - 1][1](r);
  };
}

/** Turns (about y), scales and then moves a shape. */
export function moved(s: Sampler, at: V3, scale = 1, turn = 0): Sampler {
  const c = Math.cos(turn), n = Math.sin(turn);
  return (r) => {
    const { p, c: color } = s(r);
    return { p: [at[0] + (p[0] * c + p[2] * n) * scale, at[1] + p[1] * scale, at[2] + (p[2] * c - p[0] * n) * scale], c: color };
  };
}

export const tinted = (s: Sampler, color: RGB | ((d: Dot, r: Rand) => RGB)): Sampler => (r) => {
  const d = s(r);
  return { p: d.p, c: typeof color === "function" ? color(d, r) : color };
};

// ── Simple shapes ──────────────────────────────────────────────────────────────────────────────────────

/** A ball or egg. `shell` is how deep below the surface points may sit (0…1). */
export function ball(at: V3, radius: V3 | number, color: RGB, shell = 0.14): Sampler {
  const size: V3 = typeof radius === "number" ? [radius, radius, radius] : radius;
  return (r) => {
    const n = onSphere(r), k = 1 - shell * r();
    return { p: [at[0] + n[0] * size[0] * k, at[1] + n[1] * size[1] * k, at[2] + n[2] * size[2] * k], c: color };
  };
}

/** A limb woven from strands that wind round it: trunks, roots, arms. `sag` bends its middle up or down. */
export function strands(from: V3, to: V3, w0: number, w1: number, color: RGB, sag = 0): Sampler {
  const n = w0 > 0.1 ? Math.max(5, Math.round(w0 * 22)) : 7;
  return (r) => {
    const u = r(), a = (Math.floor(r() * n) / n) * TAU + u * 2.6 * (n % 2 ? 1 : -0.6) + gauss(r) * 0.1;
    const w = lerp(w0, w1, u) * (1 + 0.12 * Math.sin(u * 9 + a * 3));
    return { p: [lerp(from[0], to[0], u) + Math.cos(a) * w, lerp(from[1], to[1], u) + Math.sin(u * Math.PI) * sag, lerp(from[2], to[2], u) + Math.sin(a) * w], c: color };
  };
}

export const line = (from: V3, to: V3, width: number, color: RGB): Sampler => (r) => {
  const u = r();
  return { p: [lerp(from[0], to[0], u) + gauss(r) * width, lerp(from[1], to[1], u) + gauss(r) * width, lerp(from[2], to[2], u) + gauss(r) * width], c: color };
};

/** Rolling ground with a few taller blades. */
export const ground = (w = 16, d = 13, color: RGB = [0.1, 0.36, 0.4]): Sampler => (r) => {
  const x = (r() - 0.5) * w, z = (r() - 0.5) * d;
  return { p: [x, 0.06 * Math.sin(x * 1.3) + 0.05 * Math.cos(z * 1.7) + (r() < 0.25 ? r() * 0.14 : 0), z], c: color };
};

/** A sheet of swell, brightest on its crests. */
export const sea = (w = 16, d = 13, color: RGB = [0.1, 0.3, 0.5]): Sampler => (r) => {
  const x = (r() - 0.5) * w, z = (r() - 0.5) * d, y = 0.14 * Math.sin(x * 1.1 + z * 0.6) + 0.07 * Math.sin(x * 2.3 - z * 1.4), k = 0.6 + y * 3;
  return { p: [x, y, z], c: [color[0] * k, color[1] * k, color[2] * k] };
};

/** A wall of stars behind the scene. */
export const stars = (color: RGB = [0.3, 0.36, 0.57]): Sampler => (r) => ({ p: [(r() - 0.5) * 18, 1 + r() * 9, -7 - r() * 5], c: color });

/** Loose points all round, like fireflies: what a shape gathers from or scatters to. */
export const swarm = (radius = 6, height = 6, color: RGB = [0.22, 0.48, 0.36]): Sampler => (r) => {
  const a = r() * TAU, d = 1 + r() * (radius - 1);
  return { p: [Math.cos(a) * d, r() * height - 0.5, Math.sin(a) * d], c: color };
};

/** The surface of a low-poly model: anything from src/kit/lowpoly that fills a `Tri[]` (whale, camper, boat…). */
export function fromTris(tris: Tri[], o: { at?: V3; scale?: number; glow?: number } = {}): Sampler {
  const { at = [0, 0, 0], scale = 1, glow = 1 } = o;
  const ends: number[] = [];
  let total = 0;
  for (const t of tris) ends.push((total += length(cross(sub(t.b, t.a), sub(t.c, t.a)))));
  if (!total) throw new Error("fromTris: the model has no faces");
  return (r) => {
    const k = r() * total;
    let lo = 0, hi = ends.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ends[mid] < k) lo = mid + 1;
      else hi = mid;
    }
    const t = tris[lo];
    let u = r(), v = r();
    if (u + v > 1) [u, v] = [1 - u, 1 - v];
    const f = (i: 0 | 1 | 2) => at[i] + (t.a[i] + (t.b[i] - t.a[i]) * u + (t.c[i] - t.a[i]) * v) * scale;
    return { p: [f(0), f(1), f(2)], c: [(t.color[0] / 255) * glow, (t.color[1] / 255) * glow, (t.color[2] / 255) * glow] };
  };
}

// ── Living things ──────────────────────────────────────────────────────────────────────────────────────

/** A body part for `fur`: an egg, and its share of the hair. */
export type Lump = { n: number; at: V3; size: V3 };
export const lump = (n: number, at: V3, size: V3): Lump => ({ n, at, size });
/** A limb as a row of lumps. */
export const lumps = (n: number, p: V3, q: V3, w0: number, w1: number, count = 7): Lump[] =>
  Array.from({ length: count }, (_, i) => {
    const u = i / (count - 1), w = lerp(w0, w1, u);
    return lump(n / count, [lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u)], [w, w, w]);
  });

export type Coat = { hairs?: number; length?: number; root?: RGB; tip?: RGB; head?: (p: V3) => boolean };

/** Fur combed down over a body made of lumps. `head`: where hair stands on end and the face stays short. */
export function fur(body: Lump[], rand: Rand, o: Coat = {}): Sampler {
  const { hairs = 3400, length: long = 1, root = [0.16, 0.06, 0.07], tip = [0.78, 0.32, 0.13], head = () => false } = o;
  const total = body.reduce((n, p) => n + p.n, 0);
  const buried = (p: V3, me: Lump) => body.some((l) => l !== me && ((p[0] - l.at[0]) / l.size[0]) ** 2 + ((p[1] - l.at[1]) / l.size[1]) ** 2 + ((p[2] - l.at[2]) / l.size[2]) ** 2 < 0.9);
  type Hair = { p: V3; n: V3; len: number; lean: number; head: boolean };
  const coat: Hair[] = [];
  for (let tries = 0; coat.length < hairs && tries < hairs * 60; tries++) {
    let k = rand() * total;
    const l = body.find((q) => (k -= q.n) < 0) ?? body[0];
    const n = onSphere(rand), p: V3 = [l.at[0] + n[0] * l.size[0], l.at[1] + n[1] * l.size[1], l.at[2] + n[2] * l.size[2]];
    if (p[1] < 0 || buried(p, l)) continue;
    const h = head(p);
    coat.push({ p, n, len: long * (h ? 0.3 + 0.3 * Math.max(0, n[1]) : 0.2 + 0.2 * rand()), lean: rand() - 0.5, head: h });
  }
  if (!coat.length) throw new Error("fur: every hair is buried in the body");
  return (r) => {
    const h = pick(r, coat), u = r(), l = h.len * u, q = h.head && h.n[2] > 0.45 ? 0.2 : 1, v = u * u;
    return {
      p: [h.p[0] + (h.n[0] * l * 0.75 + h.lean * l * 0.5) * q, Math.max(0, h.p[1] + (h.n[1] * l * (h.head ? 1 : 0.4) - l * u * (h.head ? 0.35 : 0.95)) * q), h.p[2] + h.n[2] * l * 0.6 * q],
      c: [lerp(root[0], tip[0], v), lerp(root[1], tip[1], v), lerp(root[2], tip[2], v)],
    };
  };
}

/** A furry giant crouched with its knees up, 3.7 tall. Its eyes go at [0, 3.04, 0.9], 0.54 apart. */
export function giant(rand: Rand, o: Coat = {}): Sampler {
  const body = [lump(14, [0, 1.35, -0.2], [1.05, 1.1, 0.8]), lump(12, [0, 2.2, -0.15], [1.35, 0.78, 0.72]), lump(9, [0, 2.98, 0.3], [0.56, 0.66, 0.56]), lump(3, [0, 2.62, 0.62], [0.34, 0.26, 0.3])];
  for (const k of [-1, 1])
    body.push(
      ...lumps(8, [k * 1.25, 2.35, 0], [k * 1.85, 1.3, 0.45], 0.42, 0.32),
      ...lumps(8, [k * 1.85, 1.3, 0.45], [k * 1.45, 0.16, 1], 0.32, 0.24),
      ...lumps(8, [k * 0.55, 0.75, 0.2], [k * 0.95, 1.5, 0.95], 0.42, 0.36),
      ...lumps(8, [k * 0.95, 1.5, 0.95], [k * 0.8, 0.12, 1.1], 0.36, 0.24),
      lump(2, [k * 0.85, 0.08, 1.3], [0.26, 0.12, 0.4]),
      lump(2, [k * 1.45, 0.1, 1.15], [0.22, 0.14, 0.3]),
    );
  return fur(body, rand, { head: (p) => p[1] > 2.75 && Math.abs(p[0]) < 0.6, ...o });
}

/** A great balete, 4.4 tall: woven trunk and roots, aerial roots, a leafy crown. */
export function balete(rand: Rand, leaf: RGB = [0.13, 0.56, 0.38], bark: RGB = [0.5, 0.34, 0.22]): Sampler {
  const wood: Sampler[] = [];
  for (let i = 0; i < 14; i++) wood.push(strands([0, 0, 0], [0, 2, 0], 0.62, 0.36, bark));
  const tops: V3[] = [[-1.5, 2.7, 0.2], [1.5, 2.7, 0.3], [0.2, 3.3, -0.6], [-0.6, 3.2, 0.6], [0.9, 3.1, -0.7], [-1.1, 3, -0.8]];
  for (const q of tops) for (let i = 0; i < 3; i++) wood.push(strands([0, 1.8, 0], q, 0.3, 0.08, bark, 0.12));
  for (let i = 0; i < 18; i++) {
    const a = (i >> 1) * 0.698;
    wood.push(strands([Math.cos(a) * 0.35, 0.7, Math.sin(a) * 0.35], [Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45], 0.16, 0.05, bark, -0.12));
  }
  const aerial = Array.from({ length: 20 }, (_, i) => {
    const a = i * 2.4, d = 0.9 + rand(), x = Math.cos(a) * d, z = Math.sin(a) * d;
    return strands([x, 2.7, z], [x * 0.96, 0, z * 0.96], 0.035, 0.03, [0.36, 0.34, 0.3]);
  });
  const puffs = Array.from({ length: 26 }, (_, i): [V3, V3] => {
    const a = i * 2.4, d = Math.sqrt(i / 26) * 2, s = 0.62 + rand() * 0.2;
    return [[Math.cos(a) * d, 3.25 + 0.75 * (1 - d / 2) + (rand() - 0.5) * 0.4, Math.sin(a) * d * 0.9], [s, s * 0.7, s]];
  });
  const leaves: Sampler = (r) => {
    const l = r(), [at, size] = pick(r, puffs);
    return ball(at, size, l < 0.12 ? [0.75, 0.95, 0.45] : [leaf[0] - 0.05 + 0.1 * l, leaf[1] - 0.1 + 0.2 * l, leaf[2]])(r);
  };
  return join([[27, (r) => pick(r, wood)(r)], [6, (r) => pick(r, aerial)(r)], [40, leaves]]);
}

/** Someone in a wide hat, 1.2 tall, facing +x. Their lantern hangs at [0.3, 0.62, 0]. */
export function person(color: RGB = [0.6, 0.42, 0.24]): Sampler {
  const hat: Sampler = (r) => {
    const u = r(), a = r() * TAU;
    return { p: [Math.cos(a) * 0.27 * u, 1.02 + 0.16 * (1 - u), Math.sin(a) * 0.27 * u], c: color };
  };
  const coat: Sampler = (r) => {
    const u = r(), a = r() * TAU, w = 0.16 - 0.05 * u;
    return { p: [Math.cos(a) * w, 0.4 + u * 0.46, Math.sin(a) * w], c: color };
  };
  return join([
    [25, hat],
    [15, ball([0, 0.96, 0], [0.11, 0.12, 0.11], color)],
    [35, coat],
    [8, line([0.1, 0.76, 0], [0.32, 0.7, 0], 0.02, color)],
    [9, line([-0.07, 0.42, 0], [-0.1, 0, 0], 0.03, color)],
    [9, line([0.07, 0.42, 0], [0.1, 0, 0], 0.03, color)],
  ]);
}
