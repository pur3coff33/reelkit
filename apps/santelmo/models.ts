// The things in the santelmo world, as low-poly solids: the girl, her tsinelas, the santelmo itself, the bamboo bridge,
// bamboo clumps, coconut palms, kubo on stilts, and the fiesta's string lights and banderitas.
import { hex, mixRGB, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, noise2, octa, poseFn, rng, sphere, tetra } from "../../src/kit/lowpoly/world";

// ── The girl ─────────────────────────────────────────────────────────────────────────────────────────

const SKIN = hex("#7a5038");
const HAIR = hex("#0d0a09");
const SHIRT = hex("#a99f8c");
const SKIRT = hex("#5a1f24");
export const SLIPPER = hex("#2f6f8a");

export type GirlPose = {
  pos: V3;
  /** 0 faces +z. */
  yaw: number;
  /** Walk phase in radians: a step lands at every multiple of π. */
  phase: number;
  /** 0 standing, 1 walking. */
  walk: number;
  /** Head turn (radians) and a little tilt back, for calling out. */
  look?: number;
  call?: number;
};

/** The girl, about 1.5 m tall, standing on `pos`. */
export function girl(out: Tri[], g: GirlPose) {
  const T = poseFn({ pos: g.pos, yaw: g.yaw });
  const swing = Math.sin(g.phase) * 0.5 * g.walk;
  const bob = Math.abs(Math.cos(g.phase)) * 0.025 * g.walk;
  const at = (x: number, y: number, z: number) => T([x, y + bob, z]);
  const part = (p: V3, size: V3, color: RGB, pitch = 0, yaw = 0, roll = 0) => box(out, { pos: p, yaw: g.yaw + yaw, pitch, roll, size }, { color });

  // Legs hang from the hips (a negative height hangs the box down), slippers on the feet.
  for (const side of [-1, 1]) {
    const p = swing * side;
    part(at(0.07 * side, 0.72, 0), [0.1, -0.7, 0.1], SKIN, p);
    const foot = at(0.07 * side, 0.72 - 0.7 * Math.cos(p), -0.7 * Math.sin(p));
    box(out, { pos: [foot[0], Math.max(g.pos[1], foot[1] - 0.03), foot[2]], yaw: g.yaw, size: [0.1, 0.03, 0.24] }, { color: SLIPPER });
  }
  frustum(out, at(0, 0.42, 0), g.yaw, 0.21, 0.13, 0.36, SKIRT, 7);
  // A torso narrower at the waist than the shoulders: two stacked boxes.
  part(at(0, 0.72, 0), [0.24, 0.24, 0.15], SHIRT);
  part(at(0, 0.95, 0), [0.3, 0.27, 0.16], SHIRT);
  part(at(0, 1.2, 0), [0.08, 0.05, 0.08], SKIN);
  // Arms swing against the legs.
  for (const side of [-1, 1]) part(at(0.185 * side, 1.19, 0), [0.07, -0.56, 0.07], SKIN, -swing * 0.8 * side, 0, 0.06 * side);
  const look = g.look ?? 0, call = g.call ?? 0;
  const head = at(0, 1.33, 0);
  sphere(out, 0, { pos: head, yaw: g.yaw + look }, () => 0.105, () => ({ color: SKIN }));
  // Hair: a cap over the top and back of the head (the face stays clear) and a long fall down the back.
  const H = poseFn({ pos: head, yaw: g.yaw + look });
  sphere(out, 0, { pos: H([0, 0.03, -0.03]), yaw: g.yaw + look }, (d) => (d[2] > 0.45 && d[1] < 0.5 ? 0.06 : 0.118), () => ({ color: HAIR }));
  box(out, { pos: H([0, 0.02, -0.07]), yaw: g.yaw + look, pitch: 0.1 - call * 0.3, size: [0.17, -0.36, 0.05] }, { color: HAIR });
}

/** An n-sided frustum standing on `base`: radius r0 at the bottom, r1 at the top. */
function frustum(out: Tri[], base: V3, yaw: number, r0: number, r1: number, h: number, color: RGB, sides: number) {
  const T = poseFn({ pos: base, yaw });
  const ring = (r: number, y: number) => Array.from({ length: sides }, (_, i) => T([Math.cos((i / sides) * Math.PI * 2) * r, y, Math.sin((i / sides) * Math.PI * 2) * r * 0.8]));
  const lo = ring(r0, -h / 2 + 0.18), hi = ring(r1, h / 2 + 0.18);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    out.push({ a: lo[i], b: lo[j], c: hi[j], color }, { a: lo[i], b: hi[j], c: hi[i], color: mixRGB(color, [0, 0, 0], 0.08) });
  }
}

/** A pair of tsinelas left on the ground, one a little turned. */
export function tsinelas(out: Tri[], pos: V3, yaw: number) {
  const T = poseFn({ pos, yaw });
  box(out, { pos: T([-0.08, 0, 0]), yaw: yaw + 0.12, size: [0.1, 0.03, 0.25] }, { color: SLIPPER });
  box(out, { pos: T([0.1, 0, 0.05]), yaw: yaw - 0.35, size: [0.1, 0.03, 0.25] }, { color: SLIPPER });
  // The straps.
  for (const [x, z, y2] of [[-0.08, 0.04, 0.12], [0.1, 0.09, -0.35]] as const) {
    const p = T([x, 0.03, z]);
    box(out, { pos: p, yaw: yaw + y2, size: [0.09, 0.025, 0.025] }, { color: mixRGB(SLIPPER, [255, 255, 255], 0.25) });
  }
}

// ── The santelmo ─────────────────────────────────────────────────────────────────────────────────────

export const FIRE_CORE = hex("#fff1b8");
export const FIRE = hex("#ffb347");
export const FIRE_EDGE = hex("#ff6a1a");

export type Santelmo = { p: V3; strength: number; size: number; seed?: number };

/** Flicker 0.75…1.15, never a clean sine. */
export const flicker = (t: number, seed = 0) => 0.95 + 0.1 * Math.sin(t * 13.1 + seed) + 0.12 * (noise2(t * 9, seed * 3.7) - 0.5) * 2;

/** A ball of fire: a seething core, tongues licking up off it, a halo, and the light it throws. */
export function santelmo(out: Tri[], glows: Glow[], lights: PointLight[], s: Santelmo, t: number) {
  if (s.strength <= 0) return;
  const seed = s.seed ?? 0;
  const f = flicker(t, seed);
  const R = s.size * (0.9 + 0.1 * f);
  const a0 = Math.min(1, s.strength * 1.5);
  // A white-hot core inside a see-through flame body that stretches upward like a teardrop and seethes.
  sphere(out, 1, { pos: s.p, yaw: -t * 1.1 + seed }, () => R * 0.5, () => ({ color: FIRE_CORE, glow: 1, alpha: a0 }));
  sphere(
    out,
    1,
    { pos: s.p, yaw: t * 0.7 + seed },
    (d) => R * (1 + 0.9 * Math.max(0, d[1]) ** 2 + 0.3 * (noise2(d[0] * 2 + t * 4, d[2] * 2 + d[1] * 3 - t * 2 + seed, 7) - 0.5) * 2),
    (d) => ({ color: mixRGB(FIRE, FIRE_EDGE, Math.max(0, d[1]) * 0.8), glow: 1, alpha: a0 * 0.55 }),
  );
  // Small tongues licking up off the crown, shrinking as they rise.
  for (let i = 0; i < 10; i++) {
    const r = rng(i * 19 + seed * 7 + 1);
    const [ra, rb, rc] = [r(), r(), r()];
    const life = 0.35 + rb * 0.3;
    const a = ((t + ra * 3) % life) / life;
    const ang = ra * Math.PI * 2 + t * 0.6;
    const rad = R * 0.35 * (1 - a * 0.5);
    const p: V3 = [s.p[0] + Math.cos(ang) * rad, s.p[1] + R * (0.7 + a * 1.3), s.p[2] + Math.sin(ang) * rad];
    tetra(out, { pos: p, yaw: ang + a * 3, pitch: 0.2, size: [R * 0.22 * (1 - a), R * 0.55 * (1 - a * 0.6) * (0.7 + rc * 0.5), R * 0.22 * (1 - a)] }, { color: a > 0.5 ? FIRE_EDGE : FIRE, glow: 1, alpha: a0 * 0.8 * (1 - a) });
  }
  glows.push({ p: s.p, radius: R * 4.5, color: [255, 176, 80], alpha: 0.6 * s.strength * f });
  glows.push({ p: s.p, radius: R * 16, color: [255, 110, 30], alpha: 0.16 * s.strength * f });
  lights.push({ p: s.p, color: [255, 140, 60], intensity: 1.6 * s.strength * f, range: 2.5 + 15 * s.size * Math.min(1, s.strength) });
}

// ── Props ────────────────────────────────────────────────────────────────────────────────────────────

export const BAMBOO = hex("#8c8150");
const BAMBOO_GREEN = hex("#4c5a2a");
const LEAF = hex("#2f4226");
const TRUNK = hex("#4a3b2c");

/** The bamboo bridge over the ditch, along z on x = 0, centred on `z`. Its east railing is broken in the middle. */
export function bridge(out: Tri[], z: number, deckY: number, span: number) {
  const z0 = z - span / 2;
  // The deck: five poles side by side.
  for (let i = 0; i < 5; i++) {
    const x = -0.4 + i * 0.2;
    box(out, { pos: [x, deckY - 0.06 + (i % 2) * 0.01, z0], pitch: Math.PI / 2, size: [0.09, span, 0.09] }, { color: mixRGB(BAMBOO, [0, 0, 0], (i % 3) * 0.08) });
  }
  // Cross supports under the ends and middle.
  for (const k of [0.05, 0.5, 0.95]) box(out, { pos: [-0.6, deckY - 0.16, z0 + span * k], roll: -Math.PI / 2, size: [0.1, 1.2, 0.1] }, { color: BAMBOO });
  // Posts and rails.
  const posts = 5;
  for (const side of [-1, 1]) {
    for (let i = 0; i < posts; i++) {
      if (side > 0 && i === 2) continue; // the broken post
      box(out, { pos: [0.55 * side, deckY - 0.6, z0 + (i / (posts - 1)) * span], size: [0.08, 1.45, 0.08] }, { color: BAMBOO });
    }
    if (side < 0) {
      box(out, { pos: [-0.55, deckY + 0.78, z0], pitch: Math.PI / 2, size: [0.07, span, 0.07] }, { color: BAMBOO });
    } else {
      // The east rail: whole near the ends, snapped in the middle, one half hanging down into the ditch.
      box(out, { pos: [0.55, deckY + 0.78, z0], pitch: Math.PI / 2, size: [0.07, span * 0.3, 0.07] }, { color: BAMBOO });
      box(out, { pos: [0.55, deckY + 0.78, z0 + span * 0.3], pitch: Math.PI / 2 + 0.75, size: [0.07, span * 0.24, 0.07] }, { color: BAMBOO });
      box(out, { pos: [0.55, deckY + 0.78, z0 + span * 0.68], pitch: Math.PI / 2, size: [0.07, span * 0.32, 0.07] }, { color: BAMBOO });
    }
  }
}

/** A clump of bamboo: tall culms leaning out, leafy tops that sway. */
export function bambooClump(out: Tri[], base: V3, seed: number, t: number) {
  const r = rng(seed);
  const n = 7 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const ang = r() * Math.PI * 2, lean = 0.08 + r() * 0.22, h = 5 + r() * 4;
    const sway = 0.04 * Math.sin(t * 0.9 + seed + i);
    const pos: V3 = [base[0] + Math.cos(ang) * r() * 0.6, base[1] - 0.1, base[2] + Math.sin(ang) * r() * 0.6];
    box(out, { pos, yaw: ang, pitch: lean + sway, size: [0.09, h, 0.09] }, { color: mixRGB(BAMBOO_GREEN, BAMBOO, r() * 0.4) });
    const T = poseFn({ pos, yaw: ang, pitch: lean + sway });
    for (let k = 0; k < 3; k++) {
      const top = T([0, h * (0.7 + k * 0.13), 0]);
      octa(out, { pos: top, yaw: ang + k, pitch: lean * 2, size: [0.9 - k * 0.2, 0.18, 0.35] }, { color: mixRGB(LEAF, BAMBOO_GREEN, r() * 0.5) });
    }
  }
}

/** A coconut palm: a curved trunk and a drooping crown. */
export function palm(out: Tri[], base: V3, seed: number, t: number) {
  const r = rng(seed);
  const h = 7 + r() * 4, bend = (r() - 0.5) * 0.5, dir = r() * Math.PI * 2;
  let p: V3 = [base[0], base[1] - 0.2, base[2]];
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const pitch = bend * (i / segs) * 1.6;
    box(out, { pos: p, yaw: dir, pitch, size: [0.28 - i * 0.02, h / segs + 0.05, 0.28 - i * 0.02] }, { color: TRUNK });
    p = poseFn({ pos: p, yaw: dir, pitch })([0, h / segs, 0]);
  }
  const sway = 0.06 * Math.sin(t * 0.7 + seed);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + r() * 0.3;
    const T = poseFn({ pos: p, yaw: a, pitch: 1.1 + r() * 0.35 + sway });
    const len = 3 + r();
    const tip = T([0, len, 0]), mid = T([0, len * 0.5, 0]);
    const side = poseFn({ pos: [0, 0, 0], yaw: a })([0.5, 0, 0]);
    const droop: V3 = [tip[0], tip[1] - 1.1, tip[2]];
    const c = mixRGB(LEAF, [0, 0, 0], r() * 0.3);
    out.push({ a: p, b: [mid[0] + side[0], mid[1], mid[2] + side[2]], c: droop, color: c });
    out.push({ a: p, b: [mid[0] - side[0], mid[1], mid[2] - side[2]], c: droop, color: mixRGB(c, [0, 0, 0], 0.15) });
  }
}

export const WINDOW = hex("#ffbe73");

/** A kubo on stilts with a steep nipa roof and a lit window. */
export function kubo(out: Tri[], glows: Glow[], pos: V3, yaw: number, lit: number) {
  const T = poseFn({ pos, yaw });
  for (const [x, z] of [[-1.3, -1.1], [1.3, -1.1], [1.3, 1.1], [-1.3, 1.1]]) box(out, { pos: T([x, 0, z]), yaw, size: [0.14, 1.1, 0.14] }, { color: TRUNK });
  const wall = hex("#6e6143"), roof = hex("#4a3d27");
  const base = T([0, 1.05, 0]);
  const w = 3, h = 1.7, d = 2.6;
  // Walls, then a steep roof that overhangs.
  box(out, { pos: base, yaw, size: [w, h, d] }, { color: wall });
  const R = poseFn({ pos: T([0, 1.05 + h, 0]), yaw });
  const v = [R([-w / 2 - 0.35, 0, -d / 2 - 0.35]), R([w / 2 + 0.35, 0, -d / 2 - 0.35]), R([w / 2 + 0.35, 0, d / 2 + 0.35]), R([-w / 2 - 0.35, 0, d / 2 + 0.35]), R([0, 1.9, -d / 2 - 0.2]), R([0, 1.9, d / 2 + 0.2])];
  out.push({ a: v[0], b: v[1], c: v[4], color: roof }, { a: v[3], b: v[2], c: v[5], color: roof });
  out.push({ a: v[0], b: v[4], c: v[5], color: roof }, { a: v[0], b: v[5], c: v[3], color: roof });
  out.push({ a: v[1], b: v[4], c: v[5], color: roof }, { a: v[1], b: v[5], c: v[2], color: roof });
  if (lit > 0) {
    const win = T([0.5, 1.6, d / 2 + 0.02]);
    box(out, { pos: win, yaw, size: [0.7, 0.55, 0.02] }, { color: WINDOW, glow: 1 });
    glows.push({ p: [win[0], win[1] + 0.3, win[2] + 0.3], radius: 2.2, color: [255, 170, 90], alpha: 0.35 * lit });
  }
}

const BULBS: RGB[] = [hex("#ffd9a0"), hex("#ff6b6b"), hex("#7dff9a"), hex("#7ab8ff"), hex("#ffd9a0")];
const FLAGS: RGB[] = [hex("#b8332e"), hex("#d9b23a"), hex("#2e5fb8"), hex("#3a9a4a"), hex("#c45a9a"), hex("#e8e0d0")];

/** A sagging wire from a to b, as n points. */
function sag(a: V3, b: V3, n: number, depth: number): V3[] {
  return Array.from({ length: n }, (_, i) => {
    const k = (i + 0.5) / n;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - depth * 4 * k * (1 - k), a[2] + (b[2] - a[2]) * k];
  });
}

/** Fiesta bulbs strung between two points. They twinkle a little. */
export function stringLights(out: Tri[], glows: Glow[], a: V3, b: V3, n: number, t: number, seed: number) {
  sag(a, b, n, 0.8).forEach((p, i) => {
    const c = BULBS[(i + seed) % BULBS.length];
    const tw = 0.75 + 0.25 * Math.sin(t * 2.3 + i * 1.7 + seed);
    octa(out, { pos: p, size: 0.09 }, { color: c, glow: 1 });
    glows.push({ p, radius: 0.9, color: c, alpha: 0.4 * tw });
  });
}

/** Banderitas: little triangle flags on a line, fluttering. */
export function banderitas(out: Tri[], a: V3, b: V3, n: number, t: number, seed: number) {
  const dir: V3 = [b[0] - a[0], 0, b[2] - a[2]];
  const L = Math.hypot(dir[0], dir[2]) || 1;
  const u: V3 = [(dir[0] / L) * 0.18, 0, (dir[2] / L) * 0.18];
  sag(a, b, n, 0.6).forEach((p, i) => {
    const flut = 0.25 * Math.sin(t * 4 + i * 0.9 + seed);
    const tip: V3 = [p[0] + flut * u[2] * 2, p[1] - 0.42, p[2] - flut * u[0] * 2];
    out.push({ a: [p[0] - u[0], p[1], p[2] - u[2]], b: [p[0] + u[0], p[1], p[2] + u[2]], c: tip, color: FLAGS[(i + seed) % FLAGS.length] });
  });
}

// ── The panakot ──────────────────────────────────────────────────────────────────────────────────────

const SACK = hex("#7d6e52");
const RAG = hex("#4f4a3e");
const SALAKOT = hex("#8f7a4c");

/**
 * A scarecrow: a pole and crossbar, a ragged shirt, a burlap-sack head with two dark eyes, a salakot. Its body faces
 * `yaw` (0 faces +z); its head can turn on its own (`head`, radians relative to the body).
 */
export function panakot(out: Tri[], base: V3, yaw: number, head: number, t: number) {
  const T = poseFn({ pos: base, yaw });
  box(out, { pos: base, yaw, size: [0.07, 1.95, 0.07] }, { color: TRUNK });
  box(out, { pos: T([-0.7, 1.52, 0]), yaw, roll: -Math.PI / 2, size: [0.06, 1.4, 0.06] }, { color: TRUNK });
  // The shirt and its sleeves along the crossbar, rags hanging off them that stir in the wind.
  box(out, { pos: T([0, 0.92, 0]), yaw, size: [0.48, 0.62, 0.2] }, { color: RAG });
  for (const side of [-1, 1]) box(out, { pos: T([0.42 * side, 1.4, 0]), yaw, size: [0.42, 0.2, 0.18] }, { color: mixRGB(RAG, [0, 0, 0], 0.12) });
  for (let i = 0; i < 6; i++) {
    const x = -0.6 + i * 0.24, sway = 0.12 * Math.sin(t * 1.7 + i * 1.3);
    const a = T([x - 0.05, 1.32, 0.1]), b = T([x + 0.05, 1.32, 0.1]), c = T([x + sway, 1.0 - (i % 3) * 0.08, 0.14]);
    out.push({ a, b, c, color: mixRGB(RAG, [0, 0, 0], 0.25) });
  }
  const H = poseFn({ pos: T([0, 1.74, 0]), yaw: yaw + head });
  const hp = H([0, 0, 0]);
  sphere(out, 0, { pos: hp, yaw: yaw + head }, (d) => 0.17 * (1 + 0.12 * d[1]), () => ({ color: SACK }));
  for (const side of [-1, 1]) box(out, { pos: H([0.055 * side, 0.01, 0.15]), yaw: yaw + head, size: [0.045, 0.035, 0.03] }, { color: hex("#0a0806") });
  // The salakot: a wide, flat cone.
  const v: V3[] = [H([0, 0.36, 0])];
  for (let i = 0; i < 9; i++) v.push(H([Math.cos((i / 9) * Math.PI * 2) * 0.44, 0.1, Math.sin((i / 9) * Math.PI * 2) * 0.44]));
  for (let i = 0; i < 9; i++) out.push({ a: v[0], b: v[1 + i], c: v[1 + ((i + 1) % 9)], color: mixRGB(SALAKOT, [0, 0, 0], (i % 3) * 0.07) });
}

// ── Mist ─────────────────────────────────────────────────────────────────────────────────────────────

/** A drifting puff of low mist: a wide, flat, faint shape. The light tints it where it passes near. */
export function mistPuff(out: Tri[], p: V3, size: number, alpha: number, seed: number, color: RGB) {
  if (alpha <= 0.005) return;
  octa(out, { pos: p, yaw: seed, size: [size, size * 0.16, size * 0.8] }, { color, alpha });
}

/** A short rice tuft: three blades fanning out. */
export function tuft(out: Tri[], base: V3, seed: number, t: number, color: RGB, height = 0.55) {
  const r = rng(seed);
  for (let k = 0; k < 3; k++) {
    const a = r() * Math.PI * 2, lean = 0.15 + r() * 0.3 + 0.06 * Math.sin(t * 1.3 + base[0] * 0.4 + k);
    const T = poseFn({ pos: base, yaw: a, pitch: lean });
    out.push({ a: T([-0.025, 0, 0]), b: T([0.025, 0, 0]), c: T([0, height * (0.7 + r() * 0.4), 0]), color: mixRGB(color, [0, 0, 0], r() * 0.25) });
  }
}
