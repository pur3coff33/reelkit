// What the ground shots are made of: looks, land up close, corn, vehicles, and what fire leaves in the air. Nobody is ever
// shown being hit. Rounds land in the dirt, and men in frame never fall: the map's white markers carry that.
import { add, cross, hex, length, mix3, mixRGB, norm, scale, sub, type Camera, type Frame, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { ballistic, box, hash2, poseFn, rng, sphere, tetra, vary } from "../../src/kit/lowpoly/world";
import { limb, person, poly, type Look, type Pose } from "../typhoon/models";
import { landColor, riverDist } from "./land";
import type { Gait } from "./motion";
import type { Grade } from "../fallout/cinema";

export type Tone = "cyan" | "amber" | "green" | "white" | "dim";
export type Tag = { p: V3; text: string; sub?: string; tone: Tone; side?: 1 | -1 };
export type Fx = {
  black: number;
  tags: Tag[];
  /** A measured gap on the ground, drawn as a dashed line with its length. */
  gap?: { a: V3; b: V3; text: string };
  /** A second view filling the lower half of the frame, with its own tags. */
  split?: { frame: Frame; tags: Tag[] };
  /** What's right in front of the lens, drawn over the frame out of focus. */
  near?: { frame: Frame; blur: number };
  /** 0…1: seen through night vision. */
  nvg?: number;
  /** 0…1: the picture dimming as he goes under. */
  under?: number;
  /** The sun, or a blast, in the lens. */
  flare?: { p: V3; alpha: number; rays?: number };
  /** The whole picture lifting for an instant: a flash close by. */
  flash?: number;
  /** A band of mist along the horizon. */
  mist?: { color: string; alpha: number };
  /** Cloud shadow crossing the land, seen from above. */
  clouds?: number;
  grade?: Grade;
};
export type Built = { frame: Frame; fx: Fx };

const NONE: Tag[] = [];
export const scene = (frame: Frame, tags: Tag[] = NONE, extra: Partial<Fx> = {}): Built => ({ frame, fx: { black: 0, tags, ...extra } });

export const FLASH = hex("#ffd9a0");
export const at = (x: number, z: number, y = 0): V3 => [x, y, z];

export const SOLDIER: Look = { skin: hex("#6e543e"), hair: hex("#16130f"), top: hex("#39473a"), collar: hex("#39473a"), bottom: hex("#3a4538"), shoes: hex("#1b1c1d"), height: 1.72, hairStyle: "short", faceless: true };
export const ARMY: Look = { ...SOLDIER, top: hex("#4a5a3a"), collar: hex("#4a5a3a"), bottom: hex("#46543a") };
const HELMET = hex("#242b25"), ARMY_HELMET = hex("#3a472f");
export const VILLAGER = (i: number): Look => ({ skin: hex("#6e543e"), hair: hex("#16130f"), top: [hex("#55594f"), hex("#4a4a4f"), hex("#6a5f4c"), hex("#3e4654")][i % 4], bottom: hex("#35332f"), shoes: hex("#1b1c1d"), height: 1.68, hairStyle: "short", faceless: true });

/** Close-in ground, in small faces, around a point. Skips water. */
export function patch(out: Tri[], cx: number, cz: number, radius: number, cell: number, color?: (x: number, z: number) => RGB | null, y = 0.05, bias = 6000) {
  const x0 = Math.floor((cx - radius) / cell) * cell, z0 = Math.floor((cz - radius) / cell) * cell;
  for (let z = z0; z < cz + radius; z += cell)
    for (let x = x0; x < cx + radius; x += cell) {
      if (Math.hypot(x - cx, z - cz) > radius) continue;
      const c = color ? color(x, z) : riverDist(x, z) < 22 ? null : landColor(x, z);
      if (!c) continue;
      const j = (a: number, b: number): V3 => [a + (hash2(a * 3, b * 3, 3) - 0.5) * cell * 0.6, y + hash2(a, b, 6) * 0.08, b + (hash2(a * 3, b * 3, 8) - 0.5) * cell * 0.6];
      const p = j(x, z), q = j(x + cell, z), r = j(x + cell, z + cell), s = j(x, z + cell);
      out.push({ a: p, b: q, c: r, color: vary(c, Math.round(x * 3 + z * 7), 0.1), zBias: bias }, { a: p, b: r, c: s, color: vary(c, Math.round(x * 5 + z), 0.1), zBias: bias });
    }
}

const CORN_DARK = hex("#55702f"), CORN_LIT = hex("#7f9c3e"), CORN_DRY = hex("#a9a860");

export type CornOpts = { range: number; wind?: number; lift?: number; nearest?: number; near?: Tri[]; nearUnder?: number };

/** Corn, in rows, thick near the lens and thinning away from it. Plants inside `nearUnder` go to the out-of-focus layer. */
export function corn(out: Tri[], cam: Camera, t: number, o: CornOpts) {
  const f = norm(sub(cam.target, cam.pos));
  const cx = Math.round(cam.pos[0]), cz = Math.round(cam.pos[2]);
  const R = Math.ceil(o.range), wind = o.wind ?? 1, lift = o.lift ?? 0.2, nearest = o.nearest ?? 3.4;
  for (let ix = -R; ix <= R; ix++) {
    for (let iz = -R; iz <= R; iz++) {
      if (((cx + ix) & 1) !== 0) continue;
      const wx = cx + ix, wz = cz + iz;
      const x = wx + (hash2(wx, wz, 1) - 0.5) * 0.55, z = wz + (hash2(wx, wz, 2) - 0.5) * 0.55;
      if (wz < -30 || riverDist(x, z) < 24) continue;
      const dx = x - cam.pos[0], dz = z - cam.pos[2], d = Math.hypot(dx, dz);
      if (d > o.range || d < nearest || dx * f[0] + dz * f[2] < 0) continue;
      const to = o.near && d < (o.nearUnder ?? 5) ? o.near : out;
      const h = 1.9 + hash2(wx, wz, 3) * 0.75;
      const sway = wind * (Math.sin(t * 1.4 + wx * 0.31 + wz * 0.23) * 0.08 + Math.sin(t * 3.1 + wx) * 0.025);
      const tone = hash2(wx, wz, 4), c = tone < 0.15 ? CORN_DRY : tone < 0.6 ? CORN_LIT : CORN_DARK;
      if (d > 26) {
        to.push({ a: [x - 0.3, 0, z], b: [x + 0.3, 0, z], c: [x + sway, h, z], color: c, glow: lift });
        continue;
      }
      limb(to, [x, 0, z], [x + sway, h, z], 0.022, 0.012, c, 3, { glow: lift });
      const leaves = d < 11 ? 5 : 3;
      for (let k = 0; k < leaves; k++) {
        const a = hash2(wx + k, wz, 5) * Math.PI * 2, y = h * (0.28 + (k / leaves) * 0.62), L = 0.55 + hash2(wx, wz + k, 6) * 0.45;
        const tx = x + sway * (y / h), ax = Math.cos(a), az = Math.sin(a), droop = 0.18 + hash2(wx + k, wz + k, 7) * 0.3;
        const w = 0.032;
        to.push(
          { a: [tx - az * w, y, z + ax * w], b: [tx + az * w, y, z - ax * w], c: [tx + ax * L * 0.55, y + L * 0.2, z + az * L * 0.55], color: c, glow: lift },
          { a: [tx + ax * L * 0.55 - az * w * 0.8, y + L * 0.2, z + az * L * 0.55 + ax * w * 0.8], b: [tx + ax * L * 0.55 + az * w * 0.8, y + L * 0.2, z + az * L * 0.55 - ax * w * 0.8], c: [tx + ax * L + sway * 0.5, y + L * 0.2 - droop, z + az * L], color: mixRGB(c, CORN_DRY, 0.25), glow: lift },
        );
      }
    }
  }
}

export function reeds(out: Tri[], cx: number, cz: number, radius: number, t: number, seed: number, n: number, cam?: Camera, lift = 0.16) {
  const r = rng(seed);
  const c = hex("#6c8a63");
  for (let i = 0; i < n; i++) {
    const x = cx + (r() - 0.5) * radius * 2, z = cz + (r() - 0.5) * radius * 2, h = 0.7 + r() * 1.1;
    const sway = Math.sin(t * 1.2 + i) * 0.06;
    const lean = (r() - 0.5) * 0.3, leanZ = (r() - 0.5) * 0.3;
    if (cam && Math.hypot(x - cam.pos[0], z - cam.pos[2]) < 8) continue;
    out.push({ a: [x - 0.05, 0, z], b: [x + 0.05, 0, z], c: [x + sway + lean, h, z + leanZ], color: vary(c, i, 0.16), glow: lift });
  }
}

/** A six-wheeled armored vehicle (the record names V-150s and Simbas; this is neither, just the shape). */
export function armored(out: Tri[], pos: V3, yaw: number, color = hex("#535c44")) {
  const T = poseFn({ pos, yaw });
  const P = (x: number, y: number, z: number, s: V3, c: RGB) => box(out, { pos: T([x, y, z]), yaw, size: s }, { color: c });
  P(0, 0.72, 0, [2.5, 1.0, 5.6], color);
  P(0, 1.72, -0.2, [1.9, 0.5, 3.6], mixRGB(color, [0, 0, 0], 0.1));
  P(0, 2.2, -0.4, [1.05, 0.42, 1.1], mixRGB(color, [0, 0, 0], 0.18));
  limb(out, T([0, 2.42, -0.2]), T([0, 2.5, 1.5]), 0.05, 0.04, hex("#22251f"), 4);
  for (const z of [-1.9, 0, 1.9]) for (const x of [-1.28, 1.28]) limb(out, T([x - 0.14, 0.5, z]), T([x + 0.14, 0.5, z]), 0.5, 0.5, hex("#191919"), 7);
}

/** A kuliglig: the small tractor with a cart that came for the dead. */
export function kuliglig(out: Tri[], pos: V3, yaw: number) {
  const T = poseFn({ pos, yaw });
  const P = (x: number, y: number, z: number, s: V3, c: RGB) => box(out, { pos: T([x, y, z]), yaw, size: s }, { color: c });
  P(0, 0.55, 2.1, [0.7, 0.55, 1.2], hex("#7a2d22"));
  limb(out, T([0, 1, 2.2]), T([0.34, 1.32, 3.1]), 0.03, 0.03, hex("#22222a"), 3);
  limb(out, T([0, 1, 2.2]), T([-0.34, 1.32, 3.1]), 0.03, 0.03, hex("#22222a"), 3);
  for (const x of [-0.55, 0.55]) limb(out, T([x - 0.07, 0.42, 2.0]), T([x + 0.07, 0.42, 2.0]), 0.42, 0.42, hex("#1a1a1a"), 7);
  P(0, 0.52, -0.6, [1.5, 0.12, 3], hex("#6b5a40"));
  for (const x of [-0.75, 0.75]) P(x, 0.6, -0.6, [0.05, 0.38, 3], hex("#7c6a4e"));
  for (const x of [-0.82, 0.82]) limb(out, T([x - 0.05, 0.34, -0.8]), T([x + 0.05, 0.34, -0.8]), 0.34, 0.34, hex("#1a1a1a"), 7);
}

/** A 105mm howitzer, trails down and barrel up: the shape, not a particular model. Faces +z at yaw 0. */
export function howitzer(out: Tri[], pos: V3, yaw: number, elevation = 0.5) {
  const T = poseFn({ pos, yaw });
  const steel = hex("#3f4a36"), dark = hex("#252a22");
  const c = Math.cos(elevation), s = Math.sin(elevation);
  limb(out, T([0, 1.15, -0.6]), T([0, 1.15 + s * 3.2, -0.6 + c * 3.2]), 0.11, 0.075, steel, 7);
  limb(out, T([0, 1.15 + s * 2.9, -0.6 + c * 2.9]), T([0, 1.15 + s * 3.3, -0.6 + c * 3.3]), 0.1, 0.1, dark, 7);
  box(out, { pos: T([0, 0.75, -0.2]), yaw, size: [1.9, 0.8, 0.06] }, { color: steel });
  box(out, { pos: T([0, 0.82, -0.7]), yaw, size: [0.5, 0.56, 1.2] }, { color: mixRGB(steel, dark, 0.4) });
  for (const x of [-1.05, 1.05]) limb(out, T([x - 0.12, 0.55, -0.4]), T([x + 0.12, 0.55, -0.4]), 0.55, 0.55, hex("#191919"), 8);
  for (const x of [-1, 1]) limb(out, T([x * 0.2, 0.62, -0.7]), T([x * 1.4, 0.05, -3.6]), 0.08, 0.06, steel, 4);
}

/** A person on a bicycle, going +x. Faceless like everyone else. */
export function cyclist(out: Tri[], pos: V3, t: number) {
  const cad = t * 5.2;
  const yaw = Math.PI / 2;
  const T = poseFn({ pos, yaw });
  const steel = hex("#23262b");
  const wheel = (z: number) => {
    const c = 10, R = 0.34;
    for (let i = 0; i < c; i++) {
      const a = (i / c) * Math.PI * 2, b = ((i + 1) / c) * Math.PI * 2;
      limb(out, T([0, R + Math.sin(a) * R, z + Math.cos(a) * R]), T([0, R + Math.sin(b) * R, z + Math.cos(b) * R]), 0.016, 0.016, hex("#121212"), 3);
    }
    for (let i = 0; i < 4; i++) {
      const a = cad * 1.3 + (i / 4) * Math.PI * 2;
      limb(out, T([0, R, z]), T([0, R + Math.sin(a) * R, z + Math.cos(a) * R]), 0.004, 0.004, hex("#54565a"), 3);
    }
  };
  wheel(0.54);
  wheel(-0.54);
  const crank: V3 = [0, 0.32, -0.05], seat: V3 = [0, 0.86, -0.2], head: V3 = [0, 0.82, 0.32];
  for (const [a, b] of [[crank, seat], [crank, head], [seat, head], [crank, [0, 0.34, -0.54]], [seat, [0, 0.34, -0.54]], [head, [0, 0.34, 0.54]]] as [V3, V3][]) limb(out, T(a), T(b), 0.016, 0.016, steel, 3);
  limb(out, T([-0.24, 0.95, 0.34]), T([0.24, 0.95, 0.34]), 0.012, 0.012, steel, 3);
  const pedal = (side: number): V3 => [0.1 * side, 0.32 + Math.sin(cad + (side > 0 ? 0 : Math.PI)) * 0.16, -0.05 + Math.cos(cad + (side > 0 ? 0 : Math.PI)) * 0.16];
  const L: Look = { ...VILLAGER(3), top: hex("#3a463c"), bottom: hex("#39443a"), height: 1.72 };
  const P: Pose = { pos: T([0, 0.1, -0.16]), yaw, lean: 0.34, drop: 0.2, footL: pedal(-1), footR: pedal(1), handL: [-0.22, 0.86, 0.5], handR: [0.22, 0.86, 0.5], lod: 1 };
  person(out, L, P);
}

export type RifleOpts = {
  drop?: number;
  lean?: number;
  lod?: number;
  look?: Look;
  walk?: number;
  phase?: number;
  /** "aim" is up on the shoulder, "ready" low across the body for moving, and "slung" on his back with the arms free. */
  carry?: "aim" | "ready" | "slung";
  /** Feet from `gait`, which keep them planted. */
  gait?: Gait;
  /** How hard the last round is still pushing him, 0…1. */
  kick?: number;
  /** 0…1: rifle dipped and a hand at the magazine. */
  reload?: number;
  /** Carrying a full load: a pack on his back. */
  pack?: boolean;
  /** No helmet. */
  bare?: boolean;
  /** Where his hands go, overriding the carry. */
  hands?: { handL?: V3; handR?: V3 };
  /** Where his feet go, for sitting and the like, overriding everything but a gait. */
  feet?: { footL: V3; footR: V3 };
};

const PACK = hex("#2c332a"), PACK_ROLL = hex("#3a3a2c");

/** A figure with a rifle, facing `yaw`. Returns where the muzzle is, for its flash and its tracer. */
export function rifleman(out: Tri[], p: V3, yaw: number, o: RifleOpts = {}): V3 {
  const carry = o.carry ?? "aim", g = o.gait, kick = o.kick ?? 0, reload = o.reload ?? 0;
  const drop = (o.drop ?? 0) - (g?.bob ?? 0), lean = (o.lean ?? 0.1) - kick * 0.035;
  const T = poseFn({ pos: p, yaw });
  const lod = o.lod ?? 1;
  const look = o.look ?? SOLDIER;
  const H = look.height / 1.7;
  const walk = o.walk ?? (g ? 0.7 : 0), phase = g?.phase ?? o.phase ?? 0;
  const hip = 0.92 * H - drop;
  const y = 1.24 - drop + lean * 0.08 - reload * 0.1;

  let butt: V3, tip: V3, hands: { handR?: V3; handL?: V3 };
  if (carry === "ready") {
    butt = [0.19, hip + 0.42, lean * 0.7];
    tip = [-0.2, hip + 0.02, 0.68 + lean * 0.5];
    hands = { handR: [0.1, hip + 0.28, 0.2 + lean * 0.65], handL: [-0.1, hip + 0.13, 0.46 + lean * 0.55] };
  } else if (carry === "slung") {
    butt = [0.17, hip + 0.04, -0.17];
    tip = [-0.21, hip + 0.88, -0.2];
    hands = {};
  } else {
    butt = [0.16, y + 0.05, -0.04 + lean];
    tip = [0.03, y + 0.06 + kick * 0.03 - reload * 0.14, 0.92 + lean];
    hands = { handR: [0.14, y, 0.16 + lean], handL: reload ? [-0.05 + reload * 0.05, y + 0.01 - reload * 0.16, 0.48 + lean - reload * 0.16] : [-0.05, y + 0.01, 0.48 + lean] };
  }
  // Low down and not going anywhere, one knee forward and one back: a firing stance, not a squat.
  const kneeling = drop > 0.3 && !o.walk && !g;
  const feet = g ? { footL: g.footL, footR: g.footR } : o.feet ?? (kneeling ? { footL: [-0.13, 0.05, 0.27] as V3, footR: [0.14, 0.05, -0.36] as V3 } : {});
  person(out, look, { pos: p, yaw, drop, lean, walk, phase, ...(o.hands ?? hands), lod, ...feet });
  // Same geometry the body uses for where its head is.
  const bob = walk * Math.abs(Math.cos(phase)) * 0.025;
  const head = hip + bob + 0.55 * H + 0.135 * H;
  if (!o.bare) sphere(out, 0, { pos: T([0, head + 0.04 * H, lean * 1.1 + 0.005]), yaw, size: 1 }, () => 0.116 * H, () => ({ color: look === ARMY ? ARMY_HELMET : HELMET, zBias: -0.03 }));
  if (o.pack) {
    box(out, { pos: T([0, hip + 0.2 * H, lean * 0.3 - 0.23]), yaw, size: [0.36, 0.52 * H, 0.24] }, { color: PACK });
    box(out, { pos: T([0, hip + 0.56 * H, lean * 0.7 - 0.2]), yaw, size: [0.42, 0.14, 0.16] }, { color: PACK_ROLL });
  }
  limb(out, T(butt), T(tip), 0.022, 0.012, hex("#17181a"), lod ? 4 : 3);
  const past: V3 = carry === "aim" ? [tip[0], tip[1], tip[2] + 0.06] : tip;
  return T(past);
}

/** A round going into water: a thin column and a ring of drops. */
export function splash(out: Tri[], cam: Camera, p: V3, age: number, seed: number) {
  if (age < 0 || age > 0.8) return;
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, s = 0.3 + r() * 1.1;
    const q = ballistic(p, [Math.cos(a) * s, 3 + r() * 4.2, Math.sin(a) * s], age);
    if (q[1] > p[1]) tetra(out, { pos: q, size: 0.05 + r() * 0.05, yaw: a }, { color: hex("#e6efef"), glow: 0.85 });
  }
  puff(out, [p[0], p[1] + 0.35 + age * 0.5, p[2]], 0.3 + age * 0.9, cam, hex("#dfe9e9"), 0.72 * (1 - age / 0.8));
}

/** A round's glowing path, facing the lens wherever it's going. `k` runs 0…1 along its flight. */
export function tracer(out: Tri[], a: V3, b: V3, k: number, cam: Camera, width: number, color = FLASH, alpha = 0.95) {
  const head = mix3(a, b, Math.min(1, k)), tail = mix3(a, b, Math.max(0, k - 0.2));
  const mid = mix3(head, tail, 0.5);
  const d = norm(sub(head, tail));
  const side = scale(norm(cross(d, norm(sub(cam.pos, mid)))), width * Math.max(0.3, length(sub(mid, cam.pos)) * 0.02));
  poly(out, [add(tail, side), add(head, side), sub(head, side), sub(tail, side)], color, { glow: 1, alpha, zBias: -3 });
}

export function muzzle(glows: Glow[], lights: PointLight[], p: V3, size = 1, reach = 16) {
  glows.push({ p, radius: 1.1 * size, color: [255, 226, 170], alpha: 1 });
  glows.push({ p, radius: 3.2 * size, color: [255, 176, 92], alpha: 0.5 });
  lights.push({ p, color: [255, 208, 150], intensity: 1.6, range: reach });
}

/** A round going into the dirt: a small spit of soil. Never near anyone. */
export function kick(out: Tri[], cam: Camera, p: V3, age: number, seed: number) {
  if (age < 0 || age > 0.5) return;
  const f = 1 - age / 0.5;
  const r = rng(seed);
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2, s = 0.5 + r() * 1.6;
    const q = ballistic(p, [Math.cos(a) * s, 2 + r() * 3.2, Math.sin(a) * s], age);
    if (q[1] > 0) tetra(out, { pos: q, size: 0.05 + r() * 0.05, yaw: a }, { color: hex("#4c4030") });
  }
  puff(out, [p[0], 0.25 + age, p[2]], 0.34 + age * 1.5, cam, hex("#a39579"), 0.6 * f);
}

/** A mortar round landing: flash, a fountain of earth, and dust that hangs. `scale_` is the whole thing's size. */
export function blast(out: Tri[], glows: Glow[], lights: PointLight[], cam: Camera, p: V3, age: number, seed: number, scale_ = 1, dust: RGB = hex("#8a7c64")) {
  if (age < 0 || age > 6) return;
  const r = rng(seed);
  if (age < 0.16) {
    const k = 1 - age / 0.16;
    glows.push({ p: [p[0], 2.5 * scale_, p[2]], radius: 18 * scale_, color: [255, 214, 150], alpha: k });
    lights.push({ p: [p[0], 3 * scale_, p[2]], color: [255, 214, 150], intensity: 3 * k, range: 60 * scale_ });
  }
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, s = (1 + r() * 6) * scale_, up = (7 + r() * 14) * scale_;
    const q = ballistic(p, [Math.cos(a) * s, up, Math.sin(a) * s], age, 9.8 * Math.max(0.7, scale_));
    if (q[1] > 0) tetra(out, { pos: q, size: (0.06 + r() * 0.15) * scale_, yaw: a + age, pitch: age * 3 }, { color: vary(hex("#3f3528"), i, 0.2) });
  }
  const fade = 1 - age / 6;
  for (let i = 0; i < 12; i++) {
    const a = r() * Math.PI * 2, reach = (0.6 + r() * 3.4) * scale_ * Math.min(2.2, 0.5 + age);
    const rise = (0.6 + r() * 3.4) * scale_ * Math.min(2.4, 0.4 + age * 0.9);
    const s = (0.9 + r() * 1.5) * scale_ * (0.7 + Math.min(2, age * 0.55));
    puff(out, [p[0] + Math.cos(a) * reach + age * 0.7, rise, p[2] + Math.sin(a) * reach], s * 1.5, cam, vary(dust, i, 0.1), 0.62 * fade);
  }
}

/** A soft round of smoke, facing the lens: three discs inside one another, so its edge fades. */
export function puff(out: Tri[], p: V3, radius: number, cam: Camera, color: RGB, alpha: number, flat = 1) {
  if (alpha <= 0.004) return;
  const d = norm(sub(p, cam.pos));
  const right = norm(cross(d, [0, 1, 0]));
  const up = cross(right, d);
  for (const [k, a] of [[1, 0.3], [0.72, 0.36], [0.44, 0.42]] as const) {
    const ring: V3[] = [];
    for (let i = 0; i < 10; i++) {
      const th = (i / 10) * Math.PI * 2;
      ring.push(add(p, add(scale(right, Math.cos(th) * radius * k), scale(up, Math.sin(th) * radius * k * flat))));
    }
    poly(out, ring, color, { glow: 0.7, alpha: alpha * a, zBias: -1 - k });
  }
}

/** A point `d` metres out along the lens's line of sight on the ground, `side` metres to the right of that line. */
export function inView(cam: Camera, d: number, side = 0): V3 {
  const f = norm([cam.target[0] - cam.pos[0], 0, cam.target[2] - cam.pos[2]]);
  return [cam.pos[0] + f[0] * d - f[2] * side, 0, cam.pos[2] + f[2] * d + f[0] * side];
}

/** Gunsmoke and dust hanging low over a field, drifting with the wind. `amount` is how much of it has built up. */
export function smokeBank(out: Tri[], t: number, cam: Camera, cx: number, cz: number, spread: number, n: number, height: number, seed: number, amount: number, color: RGB = hex("#b5ab97")) {
  if (amount <= 0.01) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const px = r(), pz = r(), py = r(), ps = r();
    const x = cx - spread + ((px * spread * 2 + t * (0.5 + py * 0.7)) % (spread * 2));
    const z = cz + (pz - 0.5) * spread;
    const s = height * (0.8 + ps * 1.3);
    puff(out, [x, height * (0.25 + py * 0.9), z], s * 1.6, cam, vary(color, i, 0.08), 0.2 * amount, 0.62);
  }
}

/** A headlight or flashlight beam, as a pale wedge lying in the air. */
export function beam(out: Tri[], p: V3, dir: V3, length_: number, width: number, cam: Camera, alpha = 0.16, color: RGB = [255, 236, 196]) {
  const d = norm(dir);
  const end = add(p, scale(d, length_));
  const side = scale(norm(cross(d, norm(sub(cam.pos, mix3(p, end, 0.5))))), width);
  poly(out, [p, add(end, side), sub(end, side)], color, { glow: 1, alpha, zBias: -2 });
}

/** A flashlight in the dark: a soft pool on the ground and a point at the hand. */
export function flashlight(glows: Glow[], lights: PointLight[], p: V3, dir: number, on: number) {
  const q: V3 = [p[0] + Math.cos(dir) * 4, 0.2, p[2] + Math.sin(dir) * 4];
  glows.push({ p: [p[0], 1.2, p[2]], radius: 0.8, color: [255, 240, 205], alpha: 0.65 * on });
  glows.push({ p: q, radius: 2.6, color: [255, 232, 190], alpha: 0.2 * on });
  lights.push({ p: q, color: [255, 236, 200], intensity: 1.4 * on, range: 9 });
}
