// Acts 7 and 8: the riverbank, and after. No figure shows a wound. A wounded man is someone sitting back with another beside him.
import { hex, norm, smooth, type Camera, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, hash2, rng, shake, shotCamera } from "../../src/kit/lowpoly/world";
import { limb, poly } from "../typhoon/models";
import { moon } from "./ground";
import { BRIDGE, RIVERBANK_84, district, envAt, riverDist } from "./land";
import { fidget, gait } from "./motion";
import { ARMY, at, beam, flashlight, muzzle, patch, reeds, rifleman, scene, type Built } from "./props";
import { lifted } from "./scenes";

const sm = (a: number, b: number, x: number) => smooth(a, b, x);
const R = RIVERBANK_84;

// ── One Bottle ────────────────────────────────────────────────────────────────────────────────────────

const SITTERS: { x: number; z: number; yaw: number }[] = [
  { x: -1.75, z: -0.3, yaw: 0.5 },
  { x: -0.9, z: 0.1, yaw: 0.2 },
  { x: 0, z: -0.3, yaw: 0 },
  { x: 0.9, z: 0.1, yaw: -0.2 },
  { x: 1.75, z: -0.3, yaw: -0.5 },
];

/** Five men low on a slope, and one bottle going from hand to hand. Past them, a man sits back, with another close beside him. */
export function bottleFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const camera = shake(shotCamera([{ from: 0, to: 20, pos: [[R[0] - 0.8, 0.86, R[2] - 6.4], [R[0] - 0.3, 0.8, R[2] - 5.2]], target: [[R[0], 0.56, R[2] + 2], [R[0] + 0.2, 0.56, R[2] + 2]], fov: [38, 34], ease: (x) => x }], u), u * 0.3, 0.008);
  patch(tris, R[0], R[2], 32, 2.2, (x, z) => (riverDist(x, z) < 22 ? null : hash2(Math.floor(x), Math.floor(z), 4) < 0.4 ? hex("#606a3e") : hex("#6b7345")));
  reeds(tris, R[0], R[2] + 6, 15, u, 84, 220, camera, 0.08);
  // They face the lens, so the bottle can be seen going from hand to hand.
  const yawOf = (i: number) => Math.PI + SITTERS[i].yaw;
  const hip = 0.93 - 0.68;
  const handAt = (i: number): V3 => {
    const s = SITTERS[i], y = yawOf(i);
    return [R[0] + s.x + Math.sin(y) * 0.32, hip + 0.42, R[2] + s.z + Math.cos(y) * 0.32];
  };
  // The bottle: passes on every 3 s. He drinks, then hands it on.
  const beat = u / 3, i0 = Math.min(SITTERS.length - 1, Math.floor(beat)), k = Math.min(1, Math.max(0, beat - i0 - 0.6) * 2.5);
  const a = handAt(i0), b = handAt(Math.min(SITTERS.length - 1, i0 + 1));
  const drink = Math.sin(Math.min(1, (beat - i0) / 0.6) * Math.PI) * 0.26;
  const bottle: V3 = [a[0] + (b[0] - a[0]) * k, a[1] + drink * (1 - k) + Math.sin(k * Math.PI) * 0.1, a[2] + (b[2] - a[2]) * k];
  for (const [i, s] of SITTERS.entries()) {
    const f = fidget(u, i + 41);
    const holding = i0 === i && k < 0.6;
    rifleman(tris, [R[0] + s.x, 0, R[2] + s.z], yawOf(i) + f.yaw, { carry: "slung", drop: 0.68, lean: 0.12 + f.lean, feet: { footL: [-0.14, 0.04, 0.46], footR: [0.14, 0.04, 0.42] }, hands: { handL: [-0.17, hip + 0.1, 0.3], handR: holding ? [0.02, hip + 0.42 + drink, 0.3] : [0.17, hip + 0.1, 0.3] }, lod: 2 });
  }
  box(tris, { pos: bottle, yaw: 0.2, size: [0.1, 0.24, 0.1] }, { color: hex("#d5e2dc"), glow: 0.75, zBias: -3 });
  // Behind them: the man who talks about his child, sitting back, and the man beside him. The hand on the shoulder is imagined.
  const w: V3 = [R[0] + 1.2, 0, R[2] + 3.4];
  rifleman(tris, w, Math.PI + 0.3, { carry: "slung", bare: true, drop: 0.72, lean: -0.1, feet: { footL: [-0.15, 0.04, 0.5], footR: [0.15, 0.04, 0.48] }, hands: { handL: [-0.2, 0.3, 0.1], handR: [0.2, 0.3, 0.1] }, lod: 2 });
  const fb = fidget(u, 55);
  rifleman(tris, [w[0] + 0.72, 0, w[2] - 0.2], -Math.PI / 2 - 0.2 + fb.yaw, { carry: "slung", drop: 0.5, lean: 0.22 + fb.lean, hands: { handR: [-0.2, 0.75, 0.42], handL: [0.1, 0.32, 0.2] }, lod: 2 });
  const env = { ...lifted(envAt(13, 34, 620)), sun: norm([0.2, 0.7, 0.5]) };
  return scene({ tris, camera, env }, [], { mist: { color: "#a39079", alpha: 0.24 } });
}

// ── Last Stand ────────────────────────────────────────────────────────────────────────────────────────

/** Nearly nothing to see: dusk coming, flashes a long way off, shapes low on a slope. The words are the scene. */
export function lastStandFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const camera: Camera = { pos: [R[0] + 8, 0.6, R[2] - 9 + u * 0.06], target: [R[0] - 60, 2.2, R[2] - 30], fov: 42 };
  patch(tris, R[0] - 2, R[2] - 10, 36, 2.8, (x, z) => (riverDist(x, z) < 22 ? null : hex("#5c6240")));
  reeds(tris, R[0] - 4, R[2] - 12, 16, u, 84, 180, camera, 0.04);
  for (let i = 0; i < 6; i++) {
    const f = fidget(u, i + 61);
    rifleman(tris, [R[0] - 1 - i * 1.7 + f.shift, 0, R[2] - 8 - (i % 2) * 1.4], -Math.PI / 2 - 0.3 + f.yaw, { carry: i % 2 ? "aim" : "slung", drop: 0.62, lean: 0.34, lod: 1 });
  }
  for (let k = 0; k < 90; k++) {
    const t0 = hash2(k, 1, 11) * 20;
    if (Math.abs(u - t0) < 1 / 30) muzzle(glowsFront, lights, [R[0] - 110 - hash2(k, 2, 11) * 90, 1.4, R[2] - 40 + hash2(k, 3, 11) * 110], 3, 4);
  }
  const b = scene({ tris, camera, env: envAt(17.9, 60, 900), glowsFront, lights }, [], { mist: { color: "#a0603e", alpha: 0.2 }, grade: { bloom: 0.3, contrast: 1.14, saturate: 0.5, tint: "#b05a30", tintAmount: 0.2 } });
  // Near-black under the words, as the plan asks: the picture stays only just there.
  return { ...b, fx: { ...b.fx, black: 0.78 } };
}

// ── Lights in the Dark ────────────────────────────────────────────────────────────────────────────────

/** The relief, at last: flashlights coming through the dark, and men slowly getting up. */
export function lightsFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const camera = shake(shotCamera([{ from: 0, to: 14, pos: [[R[0] - 4, 1, R[2] - 26], [R[0] - 2, 1, R[2] - 24]], target: [[R[0] + 22, 1.4, R[2] + 40], [R[0] + 24, 1.5, R[2] + 40]], fov: [36, 34], ease: (x) => x }], u), u * 0.3, 0.012);
  patch(tris, R[0] + 8, R[2] + 8, 62, 3, () => hex("#39472f"));
  reeds(tris, R[0] + 2, R[2] - 10, 16, u, 234, 160, camera, 0.12);
  const r = rng(84);
  for (let i = 0; i < 8; i++) {
    const x = R[0] - 10 + r() * 22, z = R[2] - 10 + r() * 10;
    const up = sm(3 + i * 0.6, 7.4 + i * 0.6, u);
    const f = fidget(u, i + 71);
    rifleman(tris, [x + f.shift, 0, z], 0.4 + r() + f.yaw, { carry: up > 0.5 ? "ready" : "aim", drop: 0.62 - up * 0.56, lean: 0.3 - up * 0.2 + f.lean, lod: Math.hypot(x - camera.pos[0], z - camera.pos[2]) < 14 ? 1 : 0 });
  }
  for (let i = 0; i < 10; i++) {
    const dist = Math.max(0, u - 0.4 - r() * 2) * 1.32;
    const x = R[0] + 2 + r() * 44, z = R[2] + 62 + r() * 14 - dist;
    rifleman(tris, [x, 0, z], Math.PI - 0.2, { look: ARMY, carry: "ready", gait: gait(dist, 0.68, hash2(i, 8, 1)), lean: 0.12, lod: 0 });
    const dir = -Math.PI / 2 + Math.sin(u * 0.7 + i) * 0.5;
    flashlight(glowsFront, lights, at(x, z), dir, 0.95);
    beam(tris, [x, 1.15, z], [Math.cos(dir), -0.12, Math.sin(dir)], 13, 1.5, camera, 0.14);
  }
  return scene({ tris, camera, env: moon(24, 240, 0.95), glowsFront, lights }, [], { mist: { color: "#253a56", alpha: 0.5 } });
}

// ── Half-mast ─────────────────────────────────────────────────────────────────────────────────────────

/** A flag coming down its pole against a flat sky, and stopping halfway. */
export function halfMastFrame(u: number): Built {
  const tris: Tri[] = [];
  const camera: Camera = { pos: [-3.4, 1.0, 11], target: [1.4, 5.9, 0], fov: 46 };
  poly(tris, [[-300, 0, -300], [300, 0, -300], [300, 0, 300], [-300, 0, 300]], hex("#59604a"), { zBias: 9000 });
  limb(tris, [0, 0, 0], [0, 11, 0], 0.07, 0.04, hex("#d6d4cc"), 7);
  limb(tris, [0, 11, 0], [0, 11.14, 0], 0.09, 0.09, hex("#b9a35a"), 7);
  const top = 10.8 - sm(1, 8, u) * 3.5;
  const W = 3.3, H = 1.65;
  const wave = (x: number, y: number) => Math.sin(x * 2.1 - u * 3.6 + y * 0.4) * 0.14 * (x / W);
  const point = (x: number, y: number): V3 => [x, top - y + wave(x, y) * 0.3, wave(x, y)];
  const cols = 10, rows = 6;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const x0 = (i / cols) * W, x1 = ((i + 1) / cols) * W, y0 = (j / rows) * H, y1 = ((j + 1) / rows) * H;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      // Blue over red, a white triangle at the hoist.
      const inHoist = cx < (0.5 - Math.abs(cy / H - 0.5)) * W * 0.86;
      const c: RGB = inHoist ? hex("#ecebe2") : cy < H / 2 ? hex("#20368c") : hex("#b52a2c");
      const shade = 1 - 0.14 * Math.abs(Math.cos(cx * 2.1 - u * 3.6));
      const col: RGB = [c[0] * shade, c[1] * shade, c[2] * shade];
      poly(tris, [point(x0, y0), point(x1, y0), point(x1, y1), point(x0, y1)], col);
    }
  const env = { ...envAt(9.5, 200, 900), sunColor: [190, 190, 186] as RGB, ambient: [146, 148, 150] as RGB, skyTop: hex("#83898f"), skyBottom: hex("#b6b8b8") };
  return scene({ tris, camera, env }, [], { grade: { bloom: 0.1, contrast: 1.06, saturate: 0.62 } });
}

// ── What It Cost ──────────────────────────────────────────────────────────────────────────────────────

export const BAMBOO = hex("#4a3a26");

/** What holds the deck up: posts down to the water and rails along both sides, so from low on the bank it reads as a bridge. */
function bambooFrame(out: Tri[]) {
  const dir = norm([0.35, 0, -1]);
  const SPAN = 34, BAY = 4;
  for (const side of [-2, 2]) {
    for (let s = -SPAN; s <= SPAN; s += BAY) {
      const x = BRIDGE[0] + dir[0] * s + side, z = BRIDGE[2] + dir[2] * s;
      limb(out, [x, -0.4, z], [x, 3.3, z], 0.1, 0.07, BAMBOO, 4);
      if (s === SPAN) continue;
      const nx = x + dir[0] * BAY, nz = z + dir[2] * BAY;
      for (const y of [2.8, 3.3]) limb(out, [x, y, z], [nx, y, nz], 0.06, 0.06, BAMBOO, 4);
    }
  }
}

/** The bridge over the river, in evening light. Nobody on it. */
export function costFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  bambooFrame(tris);
  const camera = shotCamera([{ from: 0, to: 12, pos: [[BRIDGE[0] - 36, 1.0, BRIDGE[2] + 40], [BRIDGE[0] - 33, 1.0, BRIDGE[2] + 38]], target: [[BRIDGE[0], 2.2, BRIDGE[2]], [BRIDGE[0], 2.2, BRIDGE[2]]], fov: [38, 36], ease: (x) => x }], u);
  patch(tris, camera.pos[0] + 16, camera.pos[2] - 18, 40, 2.8, (x, z) => (riverDist(x, z) < 22 ? null : hex("#6c6c47")));
  reeds(tris, camera.pos[0] + 8, camera.pos[2] - 5, 12, u, 532, 120, camera, 0.08);
  const env = lifted({ ...envAt(17.6, 70, 900), sun: norm([-0.85, 0.2, 0.1]) }, 1.15);
  return scene({ tris, camera, env }, [], { mist: { color: "#d97a4c", alpha: 0.3 }, grade: { bloom: 0.2, contrast: 1.08, saturate: 0.68, tint: "#d68a58", tintAmount: 0.14 } });
}
