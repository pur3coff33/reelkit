// EP 01's machines and rooms: robot arms, a conveyor, desks and the AI terminals that replace the people at them,
// delivery pods and drones, a kiosk, service robots, a rider, and the shells of a factory, an office and a warehouse.
// 1 unit = 1 metre, facing +z at yaw 0.
import { hex, mixRGB, type Glow, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, octa, poseFn, rng } from "../../src/kit/lowpoly/world";
import { limb, person, poly, villager, type Look } from "../typhoon/models";

export const CYAN = hex("#5ef0ff"), ORANGE = hex("#ff7a1a"), WHITE = hex("#eef0f2"), STEEL = hex("#5a606a"), DARK = hex("#1a1d22");

type Pt = (x: number, y: number, z: number) => V3;

/** An industrial arm: turret, shoulder, elbow, wrist, gripper. Angles in radians. */
export function robotArm(out: Tri[], glows: Glow[], base: V3, o: { yaw: number; lift: number; bend: number; grip?: number; color?: RGB; scale?: number }) {
  const s = o.scale ?? 1, c = o.color ?? ORANGE;
  const T = poseFn({ pos: base, yaw: o.yaw });
  limb(out, base, [base[0], base[1] + 0.5 * s, base[2]], 0.55 * s, 0.5 * s, DARK, 8);
  const shoulder = T([0, 1.1 * s, 0]);
  limb(out, [base[0], base[1] + 0.5 * s, base[2]], shoulder, 0.42 * s, 0.38 * s, c, 6);
  const l1 = 2.1 * s, l2 = 1.8 * s;
  const elbow = T([0, 1.1 * s + Math.cos(o.lift) * l1, Math.sin(o.lift) * l1]);
  const a2 = o.lift + o.bend;
  const wrist = T([0, 1.1 * s + Math.cos(o.lift) * l1 + Math.cos(a2) * l2, Math.sin(o.lift) * l1 + Math.sin(a2) * l2]);
  limb(out, shoulder, elbow, 0.3 * s, 0.24 * s, c, 6);
  limb(out, elbow, wrist, 0.22 * s, 0.17 * s, c, 6);
  octa(out, { pos: elbow, size: 0.3 * s }, { color: STEEL });
  octa(out, { pos: shoulder, size: 0.38 * s }, { color: STEEL });
  octa(out, { pos: wrist, size: 0.2 * s }, { color: CYAN, glow: 1 });
  glows.push({ p: wrist, radius: 0.7 * s, color: CYAN, alpha: 0.5 });
  const g = (o.grip ?? 0.5) * 0.25 * s;
  for (const side of [-1, 1]) limb(out, wrist, [wrist[0] + Math.cos(o.yaw) * side * g, wrist[1] - 0.45 * s, wrist[2] - Math.sin(o.yaw) * side * g], 0.06 * s, 0.04 * s, DARK, 4);
  return wrist;
}

/** A conveyor along x at depth z, height 0.9, with boxes riding it. */
export function conveyor(out: Tri[], x0: number, x1: number, z: number, t: number, speed = 1.2) {
  box(out, { pos: [(x0 + x1) / 2, 0, z], size: [x1 - x0, 0.75, 1.3] }, { color: STEEL });
  box(out, { pos: [(x0 + x1) / 2, 0.75, z], size: [x1 - x0, 0.12, 1.2] }, { color: DARK });
  const L = x1 - x0;
  for (let k = 0; k < Math.floor(L / 2.6); k++) {
    const x = x0 + ((k * 2.6 + t * speed) % L);
    box(out, { pos: [x, 0.87, z], yaw: (k % 3) * 0.05, size: [0.8, 0.6, 0.7] }, { color: mixRGB(hex("#c09a6a"), hex("#a8814f"), (k % 2) * 0.6) });
  }
}

/** A desk with a monitor and a chair. `screen` 0…1 lights the monitor. */
export function desk(out: Tri[], glows: Glow[], pos: V3, yaw: number, screen = 1, chair = true) {
  const T = poseFn({ pos, yaw });
  const P = (x: number, y: number, z: number, sz: V3, c: RGB, extra: Partial<Tri> = {}) => box(out, { pos: T([x, y, z]), yaw, size: sz }, { color: c, ...extra });
  P(0, 0.72, 0, [1.6, 0.06, 0.8], hex("#d8d2c6"));
  for (const x of [-0.75, 0.75]) P(x, 0, 0, [0.06, 0.72, 0.7], STEEL);
  P(0, 0.78, -0.25, [0.12, 0.25, 0.08], DARK);
  P(0, 0.98, -0.25, [0.75, 0.45, 0.04], DARK);
  P(0, 1.0, -0.22, [0.68, 0.38, 0.01], screen > 0.05 ? hex("#bfe8ff") : hex("#10141a"), { glow: screen * 0.85, zBias: -0.05 });
  if (screen > 0.05) glows.push({ p: T([0, 1.15, -0.1]), radius: 0.7, color: hex("#bfe8ff"), alpha: 0.22 * screen });
  if (chair) {
    P(0, 0.45, 0.65, [0.5, 0.08, 0.5], DARK);
    P(0, 0.5, 0.92, [0.5, 0.6, 0.06], DARK);
    P(0, 0, 0.65, [0.08, 0.45, 0.08], STEEL);
  }
}

/** The AI that takes a desk: a slowly turning glowing crystal over it. */
export function terminal(out: Tri[], glows: Glow[], p: V3, t: number, k = 1, size = 0.32) {
  if (k <= 0.01) return;
  const bob = Math.sin(t * 2 + p[0]) * 0.05;
  octa(out, { pos: [p[0], p[1] + bob, p[2]], yaw: t * 1.2 + p[2], size: [size * k, size * 1.5 * k, size * k] }, (i) => ({ color: i % 2 ? CYAN : mixRGB(CYAN, WHITE, 0.5), glow: 1, alpha: 0.85 }));
  glows.push({ p: [p[0], p[1] + bob, p[2]], radius: 1.4 * k, color: CYAN, alpha: 0.35 * k });
}

/** A driverless delivery pod: a rounded white van with a cyan strip, no cab windows. */
export function pod(out: Tri[], glows: Glow[], pos: V3, yaw: number) {
  const T = poseFn({ pos, yaw });
  const P = (x: number, y: number, z: number, s: V3, c: RGB, extra: Partial<Tri> = {}) => box(out, { pos: T([x, y, z]), yaw, size: s }, { color: c, ...extra });
  for (const [x, z] of [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]]) P(x, 0, z - 0.3, [0.22, 0.6, 0.6], DARK);
  P(0, 0.3, 0, [1.8, 1.7, 3.6], WHITE);
  P(0, 2.0, 0, [1.6, 0.25, 3.2], mixRGB(WHITE, DARK, 0.1));
  P(0, 1.1, 1.81, [1.5, 0.12, 0.02], CYAN, { glow: 1, zBias: -0.05 });
  P(0, 1.1, -1.81, [1.5, 0.12, 0.02], CYAN, { glow: 1, zBias: -0.05 });
  for (const x of [-0.91, 0.91]) P(x, 1.1, 0, [0.02, 0.12, 3.2], CYAN, { glow: 1, zBias: -0.05 });
  glows.push({ p: T([0, 1.1, 1.9]), radius: 1.2, color: CYAN, alpha: 0.35 });
}

/** A delivery drone: four rotors on arms, a parcel underneath. */
export function drone(out: Tri[], glows: Glow[], p: V3, t: number, yaw = 0, parcel = true, s = 1) {
  const T = poseFn({ pos: p, yaw });
  box(out, { pos: T([0, -0.12 * s, 0]), yaw, size: [0.5 * s, 0.22 * s, 0.5 * s] }, { color: WHITE });
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]) {
    const tip = T([x * s, 0, z * s]);
    limb(out, T([0, 0, 0]), tip, 0.04 * s, 0.04 * s, DARK, 3);
    const a = t * 40 + x * 3;
    const r = 0.32 * s;
    poly(out, [[tip[0] + Math.cos(a) * r, tip[1] + 0.05, tip[2] + Math.sin(a) * r], [tip[0] - Math.sin(a) * r * 0.3, tip[1] + 0.05, tip[2] + Math.cos(a) * r * 0.3], [tip[0] - Math.cos(a) * r, tip[1] + 0.05, tip[2] - Math.sin(a) * r]], hex("#8a9098"), { alpha: 0.6 });
  }
  octa(out, { pos: T([0, 0.02 * s, 0.26 * s]), size: 0.06 * s }, { color: CYAN, glow: 1 });
  glows.push({ p: T([0, -0.1 * s, 0]), radius: 0.5 * s, color: CYAN, alpha: 0.4 });
  if (parcel) box(out, { pos: T([0, -0.62 * s, 0]), yaw, size: [0.42 * s, 0.38 * s, 0.42 * s] }, { color: hex("#c09a6a") });
}

/** A self-order kiosk: a tall screen on a stand. */
export function kiosk(out: Tri[], glows: Glow[], pos: V3, yaw: number) {
  const T = poseFn({ pos, yaw });
  box(out, { pos, yaw, size: [0.7, 1.9, 0.35] }, { color: WHITE });
  box(out, { pos: T([0, 0.9, 0.18]), yaw, size: [0.56, 0.9, 0.02] }, { color: hex("#bff6ff"), glow: 0.9, zBias: -0.05 });
  glows.push({ p: T([0, 1.35, 0.3]), radius: 0.8, color: CYAN, alpha: 0.3 });
}

/** A service robot: a faceless white figure with a glowing visor. */
export const ROBOT: Look = { skin: hex("#e8eaec"), hair: hex("#d0d4d8"), top: hex("#f4f6f8"), bottom: hex("#c8ccd2"), shoes: hex("#3a3e46"), height: 1.75, hairStyle: "short", faceless: true, collar: hex("#c8ccd2") };
export function robot(out: Tri[], glows: Glow[], pos: V3, yaw: number, o: { phase?: number; walk?: number; handR?: V3; handL?: V3; lod?: number } = {}) {
  person(out, ROBOT, { pos, yaw, phase: o.phase, walk: o.walk, handR: o.handR, handL: o.handL, lod: o.lod ?? 1 });
  const T = poseFn({ pos, yaw });
  const v = T([0, 1.62, 0.1]);
  box(out, { pos: v, yaw, size: [0.2, 0.05, 0.03] }, { color: CYAN, glow: 1, zBias: -0.1 });
  glows.push({ p: v, radius: 0.35, color: CYAN, alpha: 0.6 });
}

/** A delivery rider on a scooter with a box on the back. */
export function rider(out: Tri[], pos: V3, yaw: number, seed: number, box3: RGB = hex("#e8432c")) {
  const T = poseFn({ pos, yaw });
  const P = (x: number, y: number, z: number, s: V3, c: RGB) => box(out, { pos: T([x, y, z]), yaw, size: s }, { color: c });
  for (const z of [0.7, -0.7]) P(0, 0, z - 0.3, [0.12, 0.6, 0.6], DARK);
  P(0, 0.35, 0, [0.35, 0.35, 1.5], hex("#2a2e36"));
  P(0, 0.7, 0.55, [0.3, 0.6, 0.2], hex("#2a2e36"));
  P(0, 0.75, -0.65, [0.6, 0.55, 0.55], box3);
  const L = { ...villager(seed, "man"), top: box3, cap: undefined, hardhat: hex("#f2f2ee") };
  person(out, { ...L, faceless: true }, { pos: T([0, 0.15, -0.05]), yaw, drop: 0.45, lean: 0.12, handL: [-0.25, 1.05, 0.6], handR: [0.25, 1.05, 0.6], footL: [-0.18, 0.45, 0.3], footR: [0.18, 0.45, 0.3], lod: 1 });
}

/** A room: floor, back and side walls, a ceiling with light panels. Its open side faces +z. */
export function room(out: Tri[], glows: Glow[], c: V3, w: number, d: number, h: number, o: { floor: RGB; wall: RGB; ceiling?: RGB; panels?: number; window?: RGB; sawtooth?: boolean }) {
  const [x, y, z] = c;
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  const q = (a: V3, b: V3, cc: V3, dd: V3, color: RGB, extra: Partial<Tri> = {}) => out.push({ a, b, c: cc, color, ...extra }, { a, b: cc, c: dd, color, ...extra });
  q([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], o.floor, { zBias: 500 });
  q([x0, y, z0], [x1, y, z0], [x1, y + h, z0], [x0, y + h, z0], o.wall, { zBias: 400 });
  q([x0, y, z0], [x0, y, z1], [x0, y + h, z1], [x0, y + h, z0], mixRGB(o.wall, [0, 0, 0], 0.08), { zBias: 400 });
  q([x1, y, z0], [x1, y, z1], [x1, y + h, z1], [x1, y + h, z0], mixRGB(o.wall, [0, 0, 0], 0.08), { zBias: 400 });
  if (o.window) q([x0 + 0.5, y + h * 0.3, z0 + 0.02], [x1 - 0.5, y + h * 0.3, z0 + 0.02], [x1 - 0.5, y + h * 0.85, z0 + 0.02], [x0 + 0.5, y + h * 0.85, z0 + 0.02], o.window, { glow: 0.8, zBias: 390 });
  const ceil = o.ceiling ?? mixRGB(o.wall, [0, 0, 0], 0.2);
  if (o.sawtooth) {
    for (let k = 0; k < Math.floor(w / 8); k++) {
      const a = x0 + k * 8, b = a + 8;
      q([a, y + h, z0], [b, y + h + 3, z0], [b, y + h + 3, z1], [a, y + h, z1], ceil, { zBias: 300 });
      q([b, y + h, z0], [b, y + h + 3, z0], [b, y + h + 3, z1], [b, y + h, z1], hex("#dfeaf2"), { glow: 0.5, zBias: 300 });
    }
  } else q([x0, y + h, z0], [x1, y + h, z0], [x1, y + h, z1], [x0, y + h, z1], ceil, { zBias: 300 });
  const panels = o.panels ?? 0;
  if (panels > 0.02)
    for (let px = x0 + 3; px < x1 - 2; px += 6)
      for (let pz = z0 + 3; pz < z1 - 1; pz += 5) {
        q([px - 1, y + h - 0.02, pz - 0.4], [px + 1, y + h - 0.02, pz - 0.4], [px + 1, y + h - 0.02, pz + 0.4], [px - 1, y + h - 0.02, pz + 0.4], hex("#f4f8ff"), { glow: panels, zBias: 200 });
      }
}

/** Shelving with boxes, a warehouse aisle, along x. */
export function shelves(out: Tri[], x0: number, x1: number, z: number, levels = 4, seed = 1) {
  const r = rng(seed);
  for (let x = x0; x < x1; x += 3) {
    for (const zz of [z - 0.55, z + 0.55]) box(out, { pos: [x, 0, zz], size: [0.1, levels * 1.6, 0.1] }, { color: hex("#2f6db0") });
  }
  for (let l = 0; l < levels; l++) {
    box(out, { pos: [(x0 + x1) / 2, l * 1.6 + 0.4, z], size: [x1 - x0, 0.08, 1.2] }, { color: hex("#e07a2a") });
    for (let x = x0 + 0.6; x < x1 - 0.5; x += 1.1) if (r() < 0.85) box(out, { pos: [x, l * 1.6 + 0.48, z], yaw: (r() - 0.5) * 0.1, size: [0.9, 0.7 + r() * 0.4, 0.95] }, { color: mixRGB(hex("#c09a6a"), hex("#9a7448"), r()) });
  }
}

/** A floor robot that ferries shelves: a low disc with a cyan ring. */
export function floorBot(out: Tri[], glows: Glow[], p: V3, yaw: number, load = false) {
  box(out, { pos: p, yaw, size: [1.0, 0.35, 1.0] }, { color: hex("#e6a81a") });
  box(out, { pos: [p[0], p[1] + 0.35, p[2]], yaw, size: [0.9, 0.04, 0.9] }, { color: CYAN, glow: 1 });
  glows.push({ p: [p[0], p[1] + 0.4, p[2]], radius: 0.9, color: CYAN, alpha: 0.35 });
  if (load) box(out, { pos: [p[0], p[1] + 0.4, p[2]], yaw, size: [0.9, 0.9, 0.9] }, { color: hex("#c09a6a") });
}

export const worker = (seed: number, top?: RGB): Look => ({ ...villager(seed, seed % 3 === 0 ? "woman" : "man"), ...(top ? { top } : {}), cap: undefined, faceless: true });

export type { Pt };
