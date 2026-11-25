// EP 03's things: a jet and a terminal, an elevated train on its viaduct, dogs, cats and deer, birds, shopping carts,
// the sparks people leave as they vanish, grass in the cracks. 1 unit = 1 metre, facing +z at yaw 0.
import { hex, mixRGB, type Glow, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, cone, octa, poseFn, rng, tetra } from "../../src/kit/lowpoly/world";
import { limb, poly } from "../typhoon/models";

const WHITE = hex("#eef0f2"), DARK = hex("#1a1d22"), STEEL = hex("#8a9098");

/** A narrow-body jet, nose towards +z. */
export function jet(out: Tri[], glows: Glow[], pos: V3, yaw: number, o: { pitch?: number; lights?: number; livery?: RGB } = {}) {
  const T = poseFn({ pos, yaw, pitch: o.pitch ?? 0 });
  const livery = o.livery ?? hex("#2f6db0");
  limb(out, T([0, 2.2, -16]), T([0, 2.2, 14]), 1.9, 1.9, WHITE, 8);
  limb(out, T([0, 2.2, 14]), T([0, 2.0, 18.5]), 1.9, 0.35, WHITE, 8);
  limb(out, T([0, 2.4, -16]), T([0, 3.3, -21]), 1.7, 0.3, WHITE, 8);
  box(out, { pos: T([0, 1.0, -2]), yaw, size: [3.9, 0.3, 30] }, { color: livery });
  // Wings, tailplane and fin.
  const wing = (side: number) => poly(out, [T([side * 1.6, 1.6, 4]), T([side * 17, 2.4, -4]), T([side * 17, 2.4, -6.5]), T([side * 1.6, 1.6, -4])], mixRGB(WHITE, STEEL, 0.25));
  wing(1);
  wing(-1);
  for (const side of [-1, 1]) poly(out, [T([side * 0.8, 3.3, -16]), T([side * 6.5, 3.6, -20]), T([side * 6.5, 3.6, -21.5]), T([side * 0.8, 3.3, -20.5])], mixRGB(WHITE, STEEL, 0.25));
  poly(out, [T([0, 3.6, -15]), T([0, 9.5, -20.5]), T([0, 9.5, -22]), T([0, 3.6, -21])], livery);
  for (const side of [-1, 1]) limb(out, T([side * 6, 0.9, 2.5]), T([side * 6, 0.9, -1.5]), 0.95, 0.85, STEEL, 8);
  if (o.lights) {
    glows.push({ p: T([17, 2.4, -5]), radius: 1.6, color: hex("#3dff6a"), alpha: o.lights }, { p: T([-17, 2.4, -5]), radius: 1.6, color: hex("#ff3a2c"), alpha: o.lights });
    if (Math.floor(pos[2] * 0.5 + pos[0]) % 2 === 0) glows.push({ p: T([0, 4.2, -2]), radius: 2.2, color: hex("#ffffff"), alpha: o.lights });
  }
}

/** An airport terminal: a long low hall with a glass front and two jet bridges. */
export function terminal(out: Tri[], c: V3, lit = 0) {
  box(out, { pos: c, size: [120, 14, 30] }, (f) => ({ color: f === 0 ? hex("#c8ccd0") : hex("#dfe2e4"), zBias: 10 }));
  box(out, { pos: [c[0], 2, c[2] + 15.05], size: [116, 9, 0.1] }, { color: lit > 0.02 ? hex("#fff0c8") : hex("#3e5a72"), glow: lit * 0.7, zBias: 9 });
  for (const x of [-30, 20]) box(out, { pos: [c[0] + x, 4, c[2] + 26], size: [4, 4, 22] }, { color: hex("#b8bcc0") });
}

/** An elevated rail: a deck on pillars along x, and a train of `cars` on it at `x`. */
export function viaduct(out: Tri[], z: number, x0: number, x1: number, h = 9) {
  box(out, { pos: [(x0 + x1) / 2, h, z], size: [x1 - x0, 1.2, 8] }, { color: hex("#9a9a94") });
  // Pillars mid-block, never in a crossing.
  for (let x = x0 + 12; x < x1; x += 24) box(out, { pos: [x, 0, z], size: [2.2, h, 2.2] }, { color: hex("#8a8a84") });
}
export function train(out: Tri[], glows: Glow[], x: number, z: number, h = 9, cars = 4, lit = 0, dir = 1) {
  for (let k = 0; k < cars; k++) {
    const cx = x - dir * k * 21;
    box(out, { pos: [cx, h + 1.2, z], size: [20, 3.6, 3.2] }, { color: hex("#e8e6e0") });
    box(out, { pos: [cx, h + 2.6, z + 1.62], size: [18.5, 1.2, 0.04] }, { color: lit > 0.02 ? hex("#fff0c8") : hex("#24303c"), glow: lit * 0.8, zBias: -0.05 });
    box(out, { pos: [cx, h + 1.4, z + 1.63], size: [20, 0.35, 0.04] }, { color: hex("#2f8f4a"), zBias: -0.05 });
  }
  if (lit > 0.02) glows.push({ p: [x + dir * 10.2, h + 2, z], radius: 2, color: hex("#fff4dc"), alpha: lit });
}

export type Beast = "dog" | "cat" | "deer" | "boar";
const COATS: Record<Beast, RGB[]> = {
  dog: ["#c8a070", "#3a3028", "#e8e0d0", "#8a6a48"].map(hex),
  cat: ["#d89a50", "#4a4a4e", "#e8e4dc", "#6a5a48"].map(hex),
  deer: ["#a87a4e", "#9a6a40"].map(hex),
  boar: ["#4a3e34", "#5a4a3c"].map(hex),
};

/** A four-legged animal, walking at `phase` with stride `walk`. */
export function beast(out: Tri[], kind: Beast, pos: V3, yaw: number, seed: number, phase = 0, walk = 1, headDown = 0) {
  const r = rng(seed);
  const S = kind === "cat" ? 0.42 : kind === "dog" ? 0.75 : kind === "boar" ? 0.85 : 1.25;
  const coat = COATS[kind][Math.floor(r() * COATS[kind].length)];
  const T = poseFn({ pos, yaw });
  const legH = (kind === "deer" ? 0.85 : kind === "boar" ? 0.4 : 0.5) * S, bodyL = (kind === "cat" ? 0.9 : 1) * S, bodyR = (kind === "boar" ? 0.3 : 0.2) * S;
  const y = legH + bodyR * 0.6;
  limb(out, T([0, y, -bodyL / 2]), T([0, y + 0.05 * S, bodyL / 2]), bodyR, bodyR * 0.9, coat, 6);
  for (const [lx, lz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]] as const) {
    const sw = Math.sin(phase + ph) * 0.25 * S * walk;
    limb(out, T([lx * bodyR * 0.6, y - 0.05, lz * bodyL * 0.42]), T([lx * bodyR * 0.6, 0.02, lz * bodyL * 0.42 + sw]), 0.06 * S, 0.04 * S, mixRGB(coat, [0, 0, 0], 0.15), 4);
  }
  const neckTop: V3 = [0, y + (kind === "deer" ? 0.7 : 0.25) * S - headDown * 0.5 * S, bodyL / 2 + (kind === "deer" ? 0.2 : 0.18) * S + headDown * 0.2 * S];
  limb(out, T([0, y + 0.05, bodyL / 2 - 0.05]), T(neckTop), bodyR * 0.6, bodyR * 0.45, coat, 5);
  const snout: V3 = [0, neckTop[1] - 0.05 * S, neckTop[2] + (kind === "cat" ? 0.12 : 0.28) * S];
  limb(out, T(neckTop), T(snout), bodyR * 0.55, bodyR * 0.25, coat, 5);
  for (const side of [-1, 1]) cone(out, { pos: T([side * 0.07 * S, neckTop[1] + 0.05 * S, neckTop[2]]), size: [0.04 * S, (kind === "cat" ? 0.12 : 0.1) * S, 0.04 * S] }, { color: coat }, 3);
  if (kind === "deer" && r() < 0.6) for (const side of [-1, 1]) {
    const base = T([side * 0.06 * S, neckTop[1] + 0.1 * S, neckTop[2] - 0.02]);
    const tip = T([side * 0.28 * S, neckTop[1] + 0.55 * S, neckTop[2] - 0.15 * S]);
    limb(out, base, tip, 0.025, 0.015, hex("#d8c8a8"), 3);
    limb(out, poseFn({ pos: [0, 0, 0] })(base), tip, 0.02, 0.01, hex("#d8c8a8"), 3);
  }
  limb(out, T([0, y + 0.05, -bodyL / 2]), T([0, y + (kind === "cat" ? 0.35 : 0.1) * S, -bodyL / 2 - (kind === "cat" ? 0.3 : 0.2) * S]), 0.04 * S, 0.02 * S, coat, 3);
}

/** A flock of birds wheeling round a point. */
export function flock(out: Tri[], c: V3, t: number, n = 24, radius = 18, color: RGB = hex("#2b2d33"), seed = 3) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28 + t * (0.4 + r() * 0.3), rr = radius * (0.5 + r() * 0.6), y = c[1] + (r() - 0.5) * radius * 0.4 + Math.sin(t * 1.3 + i) * 1.5;
    const p: V3 = [c[0] + Math.cos(a) * rr, y, c[2] + Math.sin(a) * rr];
    const flap = Math.sin(t * 18 + i) * 0.5, s = 0.7;
    const fx = -Math.sin(a), fz = Math.cos(a);
    out.push({ a: p, b: [p[0] - fz * s, p[1] + flap, p[2] + fx * s], c: [p[0] + fx * 0.4, p[1], p[2] + fz * 0.4], color }, { a: p, b: [p[0] + fz * s, p[1] + flap, p[2] - fx * s], c: [p[0] + fx * 0.4, p[1], p[2] + fz * 0.4], color: mixRGB(color, [255, 255, 255], 0.08) });
  }
}

/** Birds on the ground, pecking. */
export function pigeons(out: Tri[], c: V3, t: number, n = 10, seed = 5) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const p: V3 = [c[0] + (r() - 0.5) * 6, 0.12, c[2] + (r() - 0.5) * 6];
    const peck = Math.max(0, Math.sin(t * 5 + i * 1.7)) * 0.08;
    octa(out, { pos: p, yaw: r() * 6, size: [0.12, 0.1, 0.18] }, { color: hex("#6a6e78") });
    octa(out, { pos: [p[0], p[1] + 0.1 - peck, p[2] + 0.12], size: 0.06 }, { color: hex("#4a4e58") });
  }
}

/** A shopping cart, tipped or standing. */
export function cart(out: Tri[], pos: V3, yaw: number, roll = 0) {
  const T = poseFn({ pos, yaw, roll });
  box(out, { pos: T([0, 0.45, 0]), yaw, roll, size: [0.55, 0.5, 0.9] }, { color: STEEL, alpha: 0.85 });
  for (const [x, z] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, -0.35], [0.22, -0.35]]) box(out, { pos: T([x, 0, z]), yaw, roll, size: [0.06, 0.45, 0.06] }, { color: DARK });
}

/** Where someone stood, a moment after they went: sparks rising and fading. */
export function vanishSparks(out: Tri[], glows: Glow[], p: V3, age: number, seed: number) {
  if (age < 0 || age > 1.6) return;
  const r = rng(seed);
  const k = age / 1.6;
  for (let i = 0; i < 5; i++) {
    const q: V3 = [p[0] + (r() - 0.5) * 0.6, 0.4 + r() * 1.3 + age * (0.8 + r()), p[2] + (r() - 0.5) * 0.6];
    tetra(out, { pos: q, yaw: age * 4 + i, size: 0.05 + 0.04 * (1 - k) }, { color: hex("#d8f4ff"), glow: 1, alpha: 1 - k });
    if (i < 2) glows.push({ p: q, radius: 0.35, color: hex("#bfe8ff"), alpha: (1 - k) * 0.7 });
  }
  if (age < 0.25) glows.push({ p: [p[0], 1, p[2]], radius: 1.2, color: hex("#e8f8ff"), alpha: (1 - age / 0.25) * 0.8 });
}

/** Grass and weeds in the cracks: tufts of thin cones. */
export function tufts(out: Tri[], c: V3, spread: number, n: number, size: number, seed = 1) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const p: V3 = [c[0] + (r() - 0.5) * spread, 0.05, c[2] + (r() - 0.5) * spread];
    const s = size * (0.5 + r());
    for (let k = 0; k < 3; k++) cone(out, { pos: [p[0] + (r() - 0.5) * 0.2, 0.05, p[2] + (r() - 0.5) * 0.2], yaw: r() * 6, size: [0.06 * s, 0.5 * s, 0.06 * s] }, { color: mixRGB(hex("#5a8a3a"), hex("#8aa84a"), r()) }, 3);
  }
}
