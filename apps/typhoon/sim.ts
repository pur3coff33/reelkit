// The 16 shots: for a reel time t, which world to draw, from where, and who is in it. Hard cuts live here too. Every
// frame is built from t alone, so Remotion can render frames in any order and in parallel.
import { add, hex, mixRGB, norm, type Camera, type Env, type Frame, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, hash2, octa, rng, shake, shotCamera, smooth, tetra, type Shot as CamShot } from "../../src/kit/lowpoly/world";
import { BOAT_HAULED, BOAT_Z, CALM, ROAD_X, RIVER_Z, SKIES, TIE_PALM, emitCloudDeck, emitCoast, emitFlyingDebris, groundH, shoreX, town, waterH, type CoastState } from "./coast";
import { LL, emitCone, emitLand, emitLightning, emitSea, emitStorm, stormLook, stormPos } from "./geo";
import { CAST, bangka, car, limb, lodFor, palmTree, person, poly, powerPole, tinSheet, truck, villager, type Look, type Pose } from "./models";
import { shotAt, speaking, storyHours, type Who } from "./timeline";

export type Fx = {
  /** 0…1 rain streaks over the picture, and how hard the wind slants them. */
  rain: number;
  slant: number;
  /** A brief white flash (lightning). */
  flash: number;
  /** A sideways smear on a whip pan. */
  whip: number;
  /** A colour laid over the picture, and how strongly. */
  grade?: [string, number];
  /** Fades to black. */
  black: number;
};

export type Inset = { frame: Frame; x: number; y: number; w: number; h: number; label: string };

export type Built = { frame: Frame; inset?: Inset; fx: Fx };

const NOFX: Fx = { rain: 0, slant: 0, flash: 0, whip: 0, black: 0 };

const mouthAt = (who: Who, t: number) => {
  const into = speaking(who, t);
  if (into === null) return 0;
  return 0.05 + 0.2 * Math.abs(Math.sin(into * 4.2));
};
const blinkAt = (t: number, seed: number) => (t * 0.31 + seed) % 1 < 0.035;

function who(out: Tri[], cam: Camera, L: Look, P: Pose, speaker?: Who, t = 0) {
  const d = Math.hypot(P.pos[0] - cam.pos[0], P.pos[1] - cam.pos[1], P.pos[2] - cam.pos[2]);
  person(out, L, { ...P, lod: lodFor(d), mouth: P.mouth ?? (speaker ? mouthAt(speaker, t) : 0), blink: P.blink ?? blinkAt(t, hash2(L.height * 100, 1, 2)) });
}

const onGround = (x: number, z: number, lift = 0): V3 => [x, groundH(x, z) + lift, z];

function coastFrame(tris: Tri[], camera: Camera, env: Env, S: CoastState, clouds: { dark: number; tint?: RGB }, extra: { glowsBehind?: Glow[]; glowsFront?: Glow[]; lights?: PointLight[] } = {}): Frame {
  emitCoast(tris, camera, S);
  emitCloudDeck(tris, camera, S.t, clouds.dark, S.wind, 420, clouds.tint);
  return { tris, camera, env, ...extra };
}

// ── Rooms ────────────────────────────────────────────────────────────────────────────────────────────

const ROOM: Env = { skyTop: [10, 14, 22], skyBottom: [10, 14, 22], fog: [10, 14, 22], fogNear: 40, fogFar: 120, sun: norm([0.25, 0.6, 0.75]), sunColor: [190, 190, 190], ambient: [150, 152, 158] };

function roomBox(out: Tri[], w: number, h: number, d: number, floor: RGB, wall: RGB, ceil: RGB, origin: V3 = [0, 0, 0]) {
  const [ox, oy, oz] = origin;
  const P = (x: number, y: number, z: number): V3 => [ox + x, oy + y, oz + z];
  poly(out, [P(-w / 2, 0, -d / 2), P(w / 2, 0, -d / 2), P(w / 2, 0, d / 2), P(-w / 2, 0, d / 2)], floor, { zBias: 30 });
  poly(out, [P(-w / 2, h, -d / 2), P(w / 2, h, -d / 2), P(w / 2, h, d / 2), P(-w / 2, h, d / 2)], ceil, { zBias: 30, glow: 0.7 });
  poly(out, [P(-w / 2, 0, -d / 2), P(w / 2, 0, -d / 2), P(w / 2, h, -d / 2), P(-w / 2, h, -d / 2)], wall, { zBias: 30 });
  poly(out, [P(-w / 2, 0, -d / 2), P(-w / 2, 0, d / 2), P(-w / 2, h, d / 2), P(-w / 2, h, -d / 2)], mixRGB(wall, [0, 0, 0], 0.08), { zBias: 30 });
  poly(out, [P(w / 2, 0, -d / 2), P(w / 2, 0, d / 2), P(w / 2, h, d / 2), P(w / 2, h, -d / 2)], mixRGB(wall, [0, 0, 0], 0.08), { zBias: 30 });
}

const PIX: Record<string, string[]> = {
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
};

function pixelText(out: Tri[], text: string, o: V3, s: number, color: RGB) {
  [...text].forEach((ch, c) => {
    (PIX[ch] ?? []).forEach((row, j) => {
      [...row].forEach((on, i) => {
        if (on !== "1") return;
        const x = o[0] + (c * 6 + i) * s, y = o[1] + (6 - j) * s, z = o[2];
        poly(out, [[x, y, z], [x + s * 0.92, y, z], [x + s * 0.92, y + s * 0.92, z], [x, y + s * 0.92, z]], color, { glow: 1, zBias: -0.05 });
      });
    });
  });
}

/** Kalakas, flattened onto a screen. */
function flatStorm(out: Tri[], c: V3, radius: number, t: number, hours: number, fine: number, bias: number) {
  const L = stormLook(hours);
  const tmp: Tri[] = [];
  emitStorm(tmp, [0, 0, 0], L, t, fine);
  const s = radius / L.R;
  const M = (v: V3): V3 => [c[0] + v[0] * s, c[1] - v[2] * s, c[2]];
  for (const q of tmp) out.push({ ...q, a: M(q.a), b: M(q.b), c: M(q.c), glow: 1, zBias: bias });
}

/** A monitor on the wall, its picture a small storm or static. */
function monitor(out: Tri[], c: V3, w: number, h: number, t: number, seed: number, dead: boolean) {
  poly(out, [[c[0] - w / 2 - 0.05, c[1] - h / 2 - 0.05, c[2]], [c[0] + w / 2 + 0.05, c[1] - h / 2 - 0.05, c[2]], [c[0] + w / 2 + 0.05, c[1] + h / 2 + 0.05, c[2]], [c[0] - w / 2 - 0.05, c[1] + h / 2 + 0.05, c[2]]], hex("#101317"));
  const z = c[2] + 0.02;
  if (dead) {
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 8; i++) {
        const v = hash2(i + Math.floor(t * 18), j, seed) * 200 + 30;
        const x = c[0] - w / 2 + (i / 8) * w, y = c[1] - h / 2 + (j / 8) * h;
        poly(out, [[x, y, z], [x + w / 8, y, z], [x + w / 8, y + h / 8, z], [x, y + h / 8, z]], [v, v, v], { glow: 1, zBias: -0.02 });
      }
    return;
  }
  poly(out, [[c[0] - w / 2, c[1] - h / 2, z], [c[0] + w / 2, c[1] - h / 2, z], [c[0] + w / 2, c[1] + h / 2, z], [c[0] - w / 2, c[1] + h / 2, z]], hex("#14426e"), { glow: 1, zBias: -0.02 });
  flatStorm(out, [c[0], c[1], z + 0.01], Math.min(w, h) * 0.46, t, -30, 0.34, -0.03);
}

function newsroom(out: Tri[], t: number, dead: number) {
  roomBox(out, 16, 6, 12, hex("#1b2230"), hex("#0f1a2e"), hex("#0b1220"), [0, 0, 2]);
  // The LED wall behind the anchor.
  for (let j = 0; j < 5; j++)
    for (let i = 0; i < 12; i++) {
      const x = -7.2 + i * 1.2, y = 0.5 + j * 0.95;
      const shimmer = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.7 + j * 1.1);
      const col = mixRGB(hex("#123d78"), hex("#1f6bb8"), shimmer * 0.7 + (j / 5) * 0.3);
      poly(out, [[x, y, -3.9], [x + 1.15, y, -3.9], [x + 1.15, y + 0.9, -3.9], [x, y + 0.9, -3.9]], col, { glow: 1, zBias: 2 });
    }
  poly(out, [[-8, 0.5, -3.88], [8, 0.5, -3.88], [8, 0.8, -3.88], [-8, 0.8, -3.88]], hex("#d8322e"), { glow: 1, zBias: 1 });
  pixelText(out, "PNN", [-0.68, 2.62, -3.85], 0.08, hex("#f2f6fa"));
  // Monitors either side, which die one by one when contact is lost.
  const spots: V3[] = [[-1.3, 1.85, -3.8], [1.3, 1.85, -3.8], [-1.3, 1.02, -3.8], [1.3, 1.02, -3.8], [-2.4, 1.85, -3.8], [2.4, 1.85, -3.8], [-2.4, 1.02, -3.8], [2.4, 1.02, -3.8]];
  spots.forEach((p, i) => monitor(out, p, 1.0, 0.72, t, i + 1, dead > (i + 1) / 9));
  // The desk: a wide faceted curve, and a band of red light.
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = -1 + (i / n) * 2, a1 = -1 + ((i + 1) / n) * 2;
    const X = (a: number) => a * 2.1, Z = (a: number) => 0.85 - a * a * 0.5;
    const col = i % 2 ? hex("#20395f") : hex("#1b3052");
    poly(out, [[X(a0), 0, Z(a0)], [X(a1), 0, Z(a1)], [X(a1), 0.94, Z(a1)], [X(a0), 0.94, Z(a0)]], col, { zBias: -0.5 });
    poly(out, [[X(a0), 0.72, Z(a0) + 0.005], [X(a1), 0.72, Z(a1) + 0.005], [X(a1), 0.78, Z(a1) + 0.005], [X(a0), 0.78, Z(a0) + 0.005]], hex("#e23b34"), { glow: 1, zBias: -0.7 });
    poly(out, [[X(a0), 0.94, Z(a0)], [X(a1), 0.94, Z(a1)], [X(a1) * 0.92, 0.94, Z(a1) - 0.55], [X(a0) * 0.92, 0.94, Z(a0) - 0.55]], hex("#e7ebee"), { zBias: -0.6 });
  }
}

/** The big touch wall the meteorologist works at, a map of the islands on it. */
function mapWall(out: Tri[], t: number) {
  roomBox(out, 14, 5, 10, hex("#1a212d"), hex("#10192a"), hex("#0a0f1a"), [0, 0, 1.5]);
  const zw = -3.1;
  poly(out, [[-6, 0.3, zw], [6, 0.3, zw], [6, 4.5, zw], [-6, 4.5, zw]], hex("#0e3a66"), { glow: 1, zBias: 4 });
  const k = 60;
  const m = (p: V3): V3 => [p[0] / k - 1.15, 2.45 - p[2] / k, zw + 0.02];
  emitLand(out, 0, m);
  for (let i = out.length - 1; i >= 0 && out[i].a[2] === zw + 0.02; i--) {
    out[i].glow = 1;
    out[i].zBias = 3;
    if (out[i].a[1] < 0.3 || out[i].a[1] > 4.5 || out[i].a[0] > 5.8 || out[i].a[0] < -5.8) out.splice(i, 1);
  }
  const hours = -71;
  const sp = m(stormPos(hours));
  // The track as a red wedge on the wall.
  const lf = m([0, 0, 0]), tip = m(stormPos(30));
  out.push({ a: [sp[0], sp[1] + 0.05, zw + 0.03], b: [sp[0], sp[1] - 0.05, zw + 0.03], c: [lf[0], lf[1] + 0.15, zw + 0.03], color: hex("#f2413c"), glow: 1, alpha: 0.65, zBias: 2 }, { a: [sp[0], sp[1] - 0.05, zw + 0.03], b: [lf[0], lf[1] + 0.15, zw + 0.03], c: [lf[0], lf[1] - 0.15, zw + 0.03], color: hex("#f2413c"), glow: 1, alpha: 0.65, zBias: 2 });
  out.push({ a: [lf[0], lf[1] + 0.15, zw + 0.03], b: [lf[0], lf[1] - 0.15, zw + 0.03], c: [tip[0], tip[1], zw + 0.03], color: hex("#ffc24b"), glow: 1, alpha: 0.55, zBias: 2 });
  flatStorm(out, [sp[0], sp[1], zw + 0.04], 0.52, t, -48, 0.5, 1);
  return { sp };
}

function ocampoAt(out: Tri[], cam: Camera, t: number, reach: number) {
  const hand: V3 = reach > 0 ? [0.62, 1.52 + 0.04 * Math.sin(t * 2), -0.05] : [0.3, 1.0, 0.25];
  who(out, cam, CAST.ocampo, { pos: [-1.5, 0, -1.6], yaw: 0.45, headYaw: reach > 0.5 ? -0.2 : 0, handR: hand, handL: [-0.26, 0.98, 0.2] }, "ocampo", t);
}

function classroom(out: Tri[], cam: Camera, t: number, opts: { night: boolean; names: number; ticks: number; stacked?: number; bare?: boolean }) {
  const wall = opts.night ? hex("#a8a48e") : hex("#dfe0c8"), floor = hex("#8c8778"), ceil = hex("#c5c5b4");
  roomBox(out, 10, 3.3, 9, floor, wall, ceil, [0, 0, 0]);
  // The chalkboard and its rows of names.
  const bz = -4.46;
  poly(out, [[-3.6, 0.95, bz], [2.4, 0.95, bz], [2.4, 2.8, bz], [-3.6, 2.8, bz]], hex("#25493a"), { zBias: 2 });
  poly(out, [[-3.68, 0.88, bz - 0.01], [2.48, 0.88, bz - 0.01], [2.48, 2.88, bz - 0.01], [-3.68, 2.88, bz - 0.01]], hex("#7a5a3a"), { zBias: 3 });
  const rows = 9, cols = 3;
  for (let i = 0; i < Math.floor(opts.names); i++) {
    const r = rng(i * 13 + 2);
    const col = Math.floor(i / rows) % cols, row = i % rows;
    const x = -3.35 + col * 1.95, y = 2.6 - row * 0.19;
    const L = 0.8 + r() * 0.5;
    for (let k = 0; k < 5; k++) {
      const x0 = x + (k / 5) * L, x1 = x + ((k + 0.7) / 5) * L, wob = (r() - 0.5) * 0.025;
      poly(out, [[x0, y + wob, bz + 0.01], [x1, y + wob, bz + 0.01], [x1, y + wob + 0.075, bz + 0.01], [x0, y + wob + 0.075, bz + 0.01]], hex("#e8e6d8"), { zBias: 1, glow: 0.6 });
    }
    if (i < Math.floor(opts.ticks)) {
      const tx = x + L + 0.1;
      out.push({ a: [tx, y + 0.03, bz + 0.015], b: [tx + 0.05, y - 0.03, bz + 0.015], c: [tx + 0.04, y - 0.01, bz + 0.015], color: hex("#ffe28a"), glow: 1, zBias: 0.8 });
      out.push({ a: [tx + 0.05, y - 0.03, bz + 0.015], b: [tx + 0.18, y + 0.1, bz + 0.015], c: [tx + 0.06, y, bz + 0.015], color: hex("#ffe28a"), glow: 1, zBias: 0.8 });
    }
  }
  // The window wall: jalousie slats that rattle.
  const wx = 4.97;
  for (let w = 0; w < 2; w++) {
    const z0 = -3 + w * 3.4;
    for (let i = 0; i < 9; i++) {
      const rattle = opts.night ? 0.05 * Math.sin(t * 38 + i * 2.1) : 0;
      const y = 1.05 + i * 0.17;
      poly(out, [[wx - 0.02, y + rattle * 0.3, z0], [wx - 0.02, y + rattle * 0.3, z0 + 2.4], [wx - 0.1 - rattle, y + 0.13, z0 + 2.4], [wx - 0.1 - rattle, y + 0.13, z0]], opts.night ? hex("#3a4656") : hex("#cfe2ea"), { glow: opts.night ? 0 : 0.8, zBias: 1 });
    }
    poly(out, [[wx - 0.01, 0.98, z0 - 0.08], [wx - 0.01, 0.98, z0 + 2.48], [wx - 0.01, 2.65, z0 + 2.48], [wx - 0.01, 2.65, z0 - 0.08]], opts.night ? hex("#16202a") : hex("#eef6f8"), { glow: 1, zBias: 2 });
  }
  if (opts.stacked !== undefined) {
    // Desks stacked against the wall.
    for (let i = 0; i < 8; i++) {
      const k = i % 3, x = -4.4 + Math.floor(i / 3) * 1.3, y = k * 0.36;
      box(out, { pos: [x, y + 0.7, 3.6], size: [1.1, 0.06, 0.7] }, { color: hex("#a07c4e") });
      for (const [dx, dz] of [[-0.45, -0.3], [0.45, -0.3], [0.45, 0.3], [-0.45, 0.3]]) box(out, { pos: [x + dx, y, 3.6 + dz], size: [0.05, 0.7, 0.05] }, { color: hex("#3d4a55") });
    }
  }
}

/** Sleeping mats and the families on them. */
function families(out: Tri[], cam: Camera, t: number) {
  const r = rng(61);
  for (let i = 0; i < 14; i++) {
    const x = -4 + (i % 5) * 1.75 + r() * 0.3, z = -2.7 + Math.floor(i / 5) * 2.35 + r() * 0.3;
    const a = r() * 6;
    poly(out, [[x - 0.7, 0.02, z - 0.45], [x + 0.7, 0.02, z - 0.45], [x + 0.7, 0.02, z + 0.45], [x - 0.7, 0.02, z + 0.45]], hex(i % 2 ? "#b5985a" : "#8a6a9a"), { zBias: 8 });
    if (x > 1.2 && z > -1.5) continue;
    const kind = i % 3 === 0 ? "child" : i % 3 === 1 ? "woman" : "man";
    const L = villager(i + 40, kind);
    const rr = r();
    who(out, cam, L, { pos: [x, 0, z], yaw: a, drop: L.height * 0.5, footL: [-0.16, 0.05, 0.32], footR: [0.16, 0.05, 0.32], handL: [-0.14, 0.4, 0.24], handR: [0.14, 0.4, 0.24], headPitch: 0.15 + rr * 0.3, headYaw: (rr - 0.5) * 0.8, blink: rr < 0.5 }, undefined, t);
  }
}

// ── Shot cameras ─────────────────────────────────────────────────────────────────────────────────────

const BZ = BOAT_Z;
const TX = TIE_PALM[0];

const CALM_CAM: CamShot[] = [{ from: 0, to: 8.02, pos: [[-19, 0.9, BZ + 15], [-96, 44, BZ + 92]], target: [[-2, 1.6, BZ], [40, 3, BZ - 18]], fov: [38, 52] }];

function calmShot(t: number): Built {
  const tris: Tri[] = [];
  const cam = shotCamera(CALM_CAM, t);
  const S: CoastState = { ...CALM, t };
  const push = smooth(0, 8, t);
  const bx = shoreX(BZ) - 3 - push * 11;
  const w = waterH(bx, BZ, S);
  const g = groundH(bx, BZ);
  bangka(tris, [bx, Math.max(w, g) - 0.05, BZ], Math.PI / 2, { roll: 0.03 * Math.sin(t * 1.2), pitch: 0.02 * Math.sin(t * 0.9) });
  const px = bx + 4.9;
  who(tris, cam, CAST.tomas, { pos: onGround(px, BZ, 0.03), yaw: -Math.PI / 2, lean: 0.34, walk: 0.55, phase: t * 3.2, handL: [-0.22, 0.9, 0.56], handR: [0.22, 0.9, 0.56], headPitch: 0.05 }, undefined, t);
  return { frame: coastFrame(tris, cam, SKIES.dawn, S, { dark: 0.1, tint: hex("#ffd8b4") }, { glowsBehind: [{ p: [-1400, 200, -480], radius: 620, color: [255, 200, 140], alpha: 0.55 }] }), fx: NOFX };
}

function breakingShot(t: number): Built {
  const tris: Tri[] = [];
  if (t < 14.2) {
    const k = smooth(8, 14.2, t);
    const camera: Camera = { pos: [0.4 - k * 0.4, 1.36, 5.1 - k * 1.5], target: [0, 1.52, 0], fov: 34 };
    newsroom(tris, t, 0);
    who(tris, camera, CAST.carmela, { pos: [0, 0, 0], yaw: 0, handL: [-0.26, 0.97, 0.36], handR: [0.26, 0.97, 0.36], headYaw: 0.03 * Math.sin(t * 0.7) }, "carmela", t);
    // Staff crossing behind the anchor.
    const cross = ((t - 8) * 0.8) % 12 - 6;
    who(tris, camera, villager(12, "woman"), { pos: [cross, 0, -3.3], yaw: Math.PI / 2, walk: 1, phase: t * 5 }, undefined, t);
    return { frame: { tris, camera, env: ROOM, lights: [{ p: [0, 3.2, 2.6], color: [255, 240, 225], intensity: 0.6, range: 6 }] }, fx: { ...NOFX, whip: t > 13.95 ? (t - 13.95) / 0.25 : 0 } };
  }
  if (t < 17.4) {
    // He holds the frame, then we push through the wall into the map.
    const k = smooth(16.3, 17.4, t) ** 2;
    const drift = smooth(14.2, 16.3, t);
    const camera: Camera = { pos: [-0.85, 1.52, 3.75 - drift * 0.5 - k * 6.3], target: [-0.85, 1.72, -3], fov: 46 };
    const { sp } = mapWall(tris, t);
    ocampoAt(tris, camera, t, 1);
    return { frame: { tris, camera, env: ROOM, glowsFront: [{ p: [sp[0], sp[1], sp[2] + 0.1], radius: 0.8, color: [255, 120, 110], alpha: 0.35 }] }, fx: { ...NOFX, whip: t < 14.42 ? 1 - (t - 14.2) / 0.22 : 0 } };
  }
  // Through the wall into the map: the storm, its eye opening, the cone reaching for the coast.
  const hours = -72 + smooth(17.4, 22, t) * 10;
  const c = stormPos(-72);
  const k = smooth(17.4, 22, t);
  const camera: Camera = { pos: [-52 + k * 8, 66 - k * 5, 8 + k * 2], target: [34, 0, 16], fov: 54 };
  emitSea(tris, t, camera.target[0], camera.target[2], 330, 20);
  emitLand(tris, 0.8);
  const L = stormLook(hours);
  emitStorm(tris, c, L, t * 1.8, 1);
  emitCone(tris, c, smooth(18, 21.4, t));
  return { frame: { tris, camera, env: SPACE }, fx: NOFX };
}

const SPACE: Env = { skyTop: [3, 6, 14], skyBottom: [14, 34, 70], fog: [10, 28, 60], fogNear: 120, fogFar: 620, sun: norm([0.5, 0.75, -0.35]), sunColor: [255, 246, 232], ambient: [90, 100, 118], stars: 0.45 };

function readyShot(t: number): Built {
  const tris: Tri[] = [];
  if (t < 26) return councilCut(tris, t);
  if (t < 28) return streetCut(tris, t);
  if (t < 31) return marketCut(tris, t);
  // Ma'am Cora writes up the families, teachers stack the desks.
  const k = smooth(31, 36, t);
  const camera: Camera = { pos: [1.6 - k * 0.5, 1.5, 3.8 - k * 1.5], target: [-0.9, 1.5, -4.2], fov: 42 };
  classroom(tris, camera, t, { night: false, names: 4 + (t - 31) * 3.2, ticks: 0, stacked: 1 });
  const writing = Math.sin(t * 9) * 0.1;
  who(tris, camera, CAST.cora, { pos: [-1.1, 0, -3.5], yaw: Math.PI * 0.92, handR: [-0.5 + writing, 1.7 + Math.sin(t * 5) * 0.09, 0.5], headPitch: -0.1 }, undefined, t);
  who(tris, camera, villager(3, "woman"), { pos: [-3.2, 0, 2.7], yaw: 0.3, lean: 0.22, handL: [-0.3, 0.95, 0.45], handR: [0.3, 0.95, 0.45], walk: 0.5, phase: t * 3 }, undefined, t);
  who(tris, camera, villager(7, "man"), { pos: [3.1, 0, -0.5], yaw: -1.4, walk: 0.9, phase: t * 4, handL: [-0.3, 1, 0.42], handR: [0.3, 1, 0.42] }, undefined, t);
  return { frame: { tris, camera, env: { ...ROOM, ambient: [190, 188, 178] } }, fx: NOFX };
}

function councilCut(tris: Tri[], t: number): Built {
  const k = smooth(22, 26, t);
  const camera: Camera = { pos: [1.9 - k * 1.0, 2.1, 4.9 - k * 0.8], target: [0, 1.32, -0.2], fov: 40 };
  mapWall(tris, t);
  // The long table and the map on it.
  box(tris, { pos: [0, 0.74, 1], size: [4.8, 0.05, 1.7] }, { color: hex("#4c3a2a") });
  for (const x of [-2.1, 2.1]) box(tris, { pos: [x, 0, 1], size: [0.14, 0.74, 1.5] }, { color: hex("#2b2119") });
  poly(tris, [[-1.1, 0.8, 0.55], [1.0, 0.8, 0.55], [1.0, 0.8, 1.5], [-1.1, 0.8, 1.5]], hex("#d9d0ad"), { zBias: -0.1 });
  for (let i = 0; i < 6; i++) {
    const r = rng(i + 3);
    poly(tris, [[-0.6 + r() * 1.2, 0.803, 0.7 + r() * 0.5], [-0.4 + r() * 1.2, 0.803, 0.7 + r() * 0.5], [-0.5 + r() * 1.2, 0.803, 0.85 + r() * 0.5]], hex("#6a9a50"), { zBias: -0.15 });
  }
  const seats: [number, number, number][] = [[-2.8, 1.0, Math.PI / 2], [2.8, 0.7, -Math.PI / 2], [-1.3, -0.25, 0], [1.3, -0.25, 0], [-2.2, -0.25, 0], [2.2, -0.25, 0]];
  seats.forEach(([x, z, yaw], i) => who(tris, camera, villager(20 + i, i % 2 ? "woman" : "man"), { pos: [x, 0, z], yaw, drop: 0.42, footL: [-0.12, 0.04, 0.42], footR: [0.12, 0.04, 0.42], handL: [-0.2, 0.84, 0.44], handR: [0.2, 0.84, 0.44], headYaw: x < 0 ? 0.5 : -0.5 }, undefined, t));
  // Cruz, plants his hand on the coast.
  const plant = smooth(23.2, 23.7, t);
  who(tris, camera, CAST.cruz, { pos: [0.1, 0, -0.1], yaw: 0, lean: 0.12 * plant, handR: [0.25 - plant * 0.25, 1.32 - plant * 0.5, 0.25 + plant * 0.63], handL: [-0.26, 0.92, 0.1], headPitch: plant * 0.24 }, undefined, t);
  return { frame: { tris, camera, env: { ...ROOM, ambient: [165, 168, 172] } }, fx: NOFX };
}

const house0 = () => town().houses.filter((h) => h.style === "concrete" && h.x < ROAD_X && h.x > 50).sort((a, b) => b.x - a.x)[0];

function streetCut(tris: Tri[], t: number): Built {
  const h = house0();
  const front = h.x + h.d / 2;
  const gc = groundH(front + 6.6, h.z + 5);
  const camera: Camera = { pos: [front + 7.6, gc + 1.5, h.z + 5.4], target: [front, gc + 1.55, h.z - 1.3], fov: 46 };
  const S: CoastState = { ...CALM, t, boarded: 0.3 + smooth(26, 27.8, t) * 0.7, swell: 0.32, hauled: true };
  // A neighbour hammering, another steadying the plywood; a pair carrying a ladder past.
  const g = groundH(front + 0.7, h.z);
  const strike = Math.abs(Math.sin(t * Math.PI * 2.4));
  who(tris, camera, villager(5, "man"), { pos: [front + 0.72, g, h.z - 0.75], yaw: -Math.PI / 2, handR: [0.16, 1.45 + strike * 0.28, 0.55 - strike * 0.12], handL: [-0.25, 1.35, 0.5] }, undefined, t);
  who(tris, camera, villager(6, "woman"), { pos: [front + 0.7, g, h.z - 2.7], yaw: -Math.PI / 2 + 0.1, handL: [-0.2, 1.45, 0.52], handR: [0.25, 1.1, 0.5] }, undefined, t);
  const walkZ = h.z + 12 - (t - 26) * 3.3;
  who(tris, camera, villager(8, "man"), { pos: onGround(front + 3.3, walkZ), yaw: Math.PI, walk: 1, phase: t * 7, handL: [-0.22, 1.05, 0.34], handR: [0.22, 1.05, 0.34] }, undefined, t);
  who(tris, camera, villager(9, "man"), { pos: onGround(front + 3.3, walkZ + 3.2), yaw: Math.PI, walk: 1, phase: t * 7 + 2, handL: [-0.22, 1.05, 0.34], handR: [0.22, 1.05, 0.34] }, undefined, t);
  limb(tris, onGround(front + 3.1, walkZ - 0.5, 1.05), onGround(front + 3.1, walkZ + 3.8, 1.05), 0.04, 0.04, hex("#b39a5e"), 3);
  limb(tris, onGround(front + 3.5, walkZ - 0.5, 1.05), onGround(front + 3.5, walkZ + 3.8, 1.05), 0.04, 0.04, hex("#b39a5e"), 3);
  return { frame: coastFrame(tris, camera, SKIES.gold, S, { dark: 0.2, tint: hex("#ffd9a5") }), fx: NOFX };
}

function marketCut(tris: Tri[], t: number): Built {
  const k = smooth(28, 31, t);
  const camera: Camera = { pos: [-3.5 + k * 2.1, 1.5, 7 - k * 3.6], target: [-0.4, 1.28, 0], fov: 42 };
  // Ground, stalls with awnings, shelves running thin, and string lights in the dark before sunrise.
  poly(tris, [[-60, 0, -60], [60, 0, -60], [60, 0, 60], [-60, 0, 60]], hex("#6c6459"), { zBias: 60 });
  const stall = (x: number, z: number, c: RGB, seed: number) => {
    box(tris, { pos: [x, 0, z], size: [3.4, 0.9, 1.2] }, { color: hex("#8a6a48") });
    box(tris, { pos: [x, 0, z - 1.4], size: [3.4, 2.4, 0.15] }, { color: hex("#5a4632") });
    for (const sy of [1.05, 1.65, 2.2]) box(tris, { pos: [x, sy, z - 1.2], size: [3.2, 0.05, 0.4] }, { color: hex("#7e6344") });
    const r = rng(seed);
    for (let i = 0; i < 26; i++) {
      const sy = [1.1, 1.7, 2.25][i % 3], gx = x - 1.5 + r() * 3, keep = r() > 0.55;
      if (keep) box(tris, { pos: [gx, sy, z - 1.2 + r() * 0.2], size: [0.13, 0.2, 0.12] }, { color: [hex("#c94f3d"), hex("#e0c04a"), hex("#3f7ea6"), hex("#ece6d5")][i % 4] });
    }
    for (let i = 0; i < 5; i++) octa(tris, { pos: [x - 1.3 + i * 0.65, 1.05, z - 0.1], size: [0.28, 0.2, 0.22] }, { color: hex("#e4dcc2") });
    poly(tris, [[x - 1.9, 2.75, z - 1.5], [x + 1.9, 2.75, z - 1.5], [x + 1.9, 2.3, z + 1.1], [x - 1.9, 2.3, z + 1.1]], c);
    for (const dx of [-1.8, 1.8]) box(tris, { pos: [x + dx, 0, z + 1], size: [0.08, 2.3, 0.08] }, { color: hex("#3a2f24") });
  };
  stall(-4.3, -2.1, hex("#c8402f"), 1);
  stall(-0.3, -2.3, hex("#2f6db0"), 2);
  stall(3.6, -2.1, hex("#d9a441"), 3);
  stall(7.6, -2.3, hex("#3f8a56"), 4);
  const glows: Glow[] = [];
  const lights: PointLight[] = [{ p: [-0.3, 2.3, 0.7], color: [255, 210, 150], intensity: 1.1, range: 9 }, { p: [3.6, 2.3, 0.7], color: [255, 210, 150], intensity: 0.8, range: 8 }];
  for (let i = 0; i < 14; i++) {
    const x = -7 + i * 1.1, y = 2.95 - 0.28 * Math.sin((i % 7) * 0.45);
    octa(tris, { pos: [x, y, 0.9], size: 0.05 }, { color: hex("#ffe0a0"), glow: 1 });
    glows.push({ p: [x, y, 0.9], radius: 0.36, color: [255, 208, 130], alpha: 0.42 });
  }
  // The line, Nena counting money at the front, Jun-Jun at her side, the shelves behind.
  const count = Math.sin(t * 8);
  who(tris, camera, CAST.nena, { pos: [-0.4, 0, 0.1], yaw: 0.25, headPitch: 0.45 + count * 0.03, handL: [-0.1, 1.04, 0.3], handR: [0.1 + count * 0.02, 1.07, 0.32] }, undefined, t);
  poly(tris, [[-0.46, 1.06, 0.42], [-0.26, 1.09, 0.44], [-0.26, 1.1, 0.34], [-0.46, 1.07, 0.32]], hex("#d3b264"), { zBias: -0.03 });
  who(tris, camera, CAST.jun, { pos: [0.25, 0, 0.45], yaw: -0.45, headPitch: -0.2, headYaw: 0.4 }, undefined, t);
  for (let i = 0; i < 6; i++) who(tris, camera, villager(30 + i, i % 2 ? "woman" : "man"), { pos: [-1.6 - (i % 3) * 0.2 + i * 0.0 + (i - 2) * 0.55, 0, 1.3 + i * 0.95], yaw: Math.PI - 0.2, headYaw: 0.4 * Math.sin(i + t * 0.4) }, undefined, t);
  return { frame: { tris, camera, env: { ...SKIES.dawn, fogNear: 12, fogFar: 62, skyTop: hex("#101a2e"), skyBottom: hex("#57668a"), fog: hex("#4a5372"), sunColor: [96, 104, 130], ambient: [116, 112, 122] }, glowsFront: glows, lights }, fx: NOFX };
}

function remembersShot(t: number): Built {
  const tris: Tri[] = [];
  const S: CoastState = { ...CALM, t, hauled: true, swell: 0.34, boarded: 0.1 };
  const haulZ = BZ - 19;
  const hx = shoreX(haulZ) + 4 + smooth(36, 40.5, t) * 17;
  const camera: Camera = t < 40.6
    ? { pos: [TX - 31, TIE_PALM[1] + 0.5, BZ - 21 + (t - 36) * 2.9], target: [TX - 6, TIE_PALM[1] + 0.4, BZ - 13 + (t - 36) * 2.9], fov: 44 }
    : { pos: [TX + 0.85, TIE_PALM[1] + 1.55, TIE_PALM[2] - 0.2], target: [TX - 1.1, TIE_PALM[1] + 1.42, TIE_PALM[2] - 0.5], fov: 30 };
  // Three men dragging another boat up the sand by its rope.
  bangka(tris, [hx, groundH(hx, haulZ) - 0.1, haulZ], Math.PI / 2, { pitch: 0.03 });
  const tug = Math.sin(t * 5);
  [-1.1, 0, 1.2].forEach((dz, i) => who(tris, camera, villager(40 + i, "man"), { pos: onGround(hx + 6.2 + i * 0.7, haulZ + dz), yaw: Math.PI / 2 + (dz * 0.1), lean: 0.34 + 0.05 * tug, walk: 0.9, phase: t * 5 + i, handL: [-0.18, 0.86, 0.45], handR: [0.18, 0.86, 0.45] }, undefined, t));
  limb(tris, onGround(hx + 4, haulZ, 0.9), onGround(hx + 6.8, haulZ, 0.95), 0.016, 0.016, hex("#d0c29a"), 3);
  // Tomas's boat, tied to the palm.
  bangka(tris, BOAT_HAULED, Math.PI / 2 + 0.08, {});
  const palmAt: V3 = [TX, TIE_PALM[1] + 0.9, TIE_PALM[2]];
  limb(tris, [BOAT_HAULED[0] + 3.9, BOAT_HAULED[1] + 0.95, BZ + 0.2], palmAt, 0.018, 0.018, hex("#d0c29a"), 3);
  limb(tris, [TX, TIE_PALM[1], TIE_PALM[2]], [TX + 0.05, TIE_PALM[1] + 1, TIE_PALM[2]], 0.25, 0.24, hex("#6b5540"), 5);
  limb(tris, [TX - 0.25, TIE_PALM[1] + 0.86, TIE_PALM[2]], [TX + 0.25, TIE_PALM[1] + 0.92, TIE_PALM[2]], 0.06, 0.06, hex("#d0c29a"), 4);
  const close = t >= 40.6;
  const tomasPos: V3 = onGround(TX - 1.1, TIE_PALM[2] - 0.5);
  if (!close) {
    const knot = Math.sin(t * 7) * 0.06;
    who(tris, camera, CAST.tomas, { pos: tomasPos, yaw: Math.PI / 2 + 0.3, lean: 0.12, handL: [-0.15, 1.02 + knot, 0.5], handR: [0.15, 1.02 - knot, 0.5], headPitch: 0.3 }, undefined, t);
  } else who(tris, camera, CAST.tomas, { pos: tomasPos, yaw: Math.PI / 2, handL: [-0.27, 0.9, 0.05], handR: [0.27, 0.9, 0.05], headYaw: 0.05 * Math.sin(t) }, "tomas", t);
  return { frame: coastFrame(tris, camera, SKIES.morning, S, { dark: 0.28 }), fx: NOFX };
}

/** Shot 5: a street cut open from the side, the sea rising past a door and a two-storey roof. */
function surgeShot(t: number): Built {
  const tris: Tri[] = [];
  const k = smooth(47, 54.2, t);
  const level = -0.1 + 7.2 * k;
  const hours = -24;
  const camera: Camera = { pos: [3 + Math.sin(t * 0.3) * 0.5, 4.8, 56], target: [3.2, 0.6, 0], fov: 33 };
  // Ground in section: the cut face, the sand, the road, the sea-bed.
  const ground = (x: number) => (x < -16 ? -5 + (x + 42) * 0.1 : x < -6 ? -2.4 + (x + 16) * 0.24 : 0);
  const n = 44;
  const step = 96 / n;
  for (let i = 0; i < n; i++) {
    const x0 = -46 + i * step, x1 = x0 + step;
    const y0 = ground(x0), y1 = ground(x1);
    const col = x0 < -8 ? hex("#c2ae7c") : hex("#7a6b56");
    poly(tris, [[x0, y0, 4], [x1, y1, 4], [x1, -14, 4], [x0, -14, 4]], mixRGB(col, [0, 0, 0], (i % 3) * 0.04), { zBias: 3 });
    poly(tris, [[x0, y0, 4], [x1, y1, 4], [x1, y1, -30], [x0, y0, -30]], x0 < -8 ? hex("#e0cc98") : hex("#6aa24a"), { zBias: 40 });
  }
  for (let i = 0; i < 18; i++) {
    const r = rng(i + 2);
    const x = -44 + r() * 90, y = -3 - r() * 10;
    tetra(tris, { pos: [x, y, 4.05], yaw: r() * 6, pitch: r() * 3, size: 0.4 + r() * 0.7 }, { color: hex("#655a4a") });
  }
  // House, two-storey block, and palms standing on the street.
  const Hs: [number, number, number, RGB, RGB][] = [[-2, 7, 3, hex("#efd0c6"), hex("#b9513a")], [8, 8, 6.4, hex("#c4dbe3"), hex("#4d6f8c")], [19, 7, 3, hex("#e8d07a"), hex("#8f9aa0")], [-0.6, 0, 0, [0, 0, 0], [0, 0, 0]]];
  for (const [x, w, h, wall, roof] of Hs.slice(0, 3)) {
    box(tris, { pos: [x, 0, -3.5], size: [w, h, 6] }, { color: wall, zBias: 3 });
    poly(tris, [[x - w / 2 - 0.4, h, 2.6 - 3], [x + w / 2 + 0.4, h, 2.6 - 3], [x, h + w * 0.28, 2.6 - 3]], mixRGB(roof, [0, 0, 0], 0.05));
    poly(tris, [[x - w / 2 - 0.4, h, -0.4], [x, h + w * 0.28, -0.4], [x, h + w * 0.28, -6.6], [x - w / 2 - 0.4, h, -6.6]], roof);
    poly(tris, [[x + w / 2 + 0.4, h, -0.4], [x, h + w * 0.28, -0.4], [x, h + w * 0.28, -6.6], [x + w / 2 + 0.4, h, -6.6]], mixRGB(roof, [0, 0, 0], 0.15));
    poly(tris, [[x - 0.6, 0, -0.45], [x + 0.6, 0, -0.45], [x + 0.6, 2.1, -0.45], [x - 0.6, 2.1, -0.45]], hex("#5c3d2a"), { zBias: -0.03 });
    if (h > 5) for (const wx of [-2.4, 2.4]) poly(tris, [[x + wx - 0.8, 4, -0.45], [x + wx + 0.8, 4, -0.45], [x + wx + 0.8, 5.4, -0.45], [x + wx - 0.8, 5.4, -0.45]], hex("#26313c"), { zBias: -0.03 });
    else for (const wx of [-2, 2]) poly(tris, [[x + wx - 0.7, 1, -0.45], [x + wx + 0.7, 1, -0.45], [x + wx + 0.7, 2.1, -0.45], [x + wx - 0.7, 2.1, -0.45]], hex("#26313c"), { zBias: -0.03 });
  }
  // A person, for scale, on the road (leaves before the water arrives).
  if (k < 0.1) who(tris, camera, villager(11, "man"), { pos: [12.6, 0, 1.2], yaw: 1.4, walk: 0.9, phase: t * 6, headYaw: -0.9 }, undefined, t);
  // The sea, cut away: a wall of water, the same level right across the street once it has come ashore.
  const adv = -7 + smooth(46.6, 53.6, t) * 62;
  const wave = (x: number) => level + 0.32 * Math.sin(x * 0.7 + t * 2.6) + 0.15 * Math.sin(x * 1.7 - t * 3.5);
  for (let i = 0; i < n; i++) {
    const x0 = -46 + i * step, x1 = x0 + step;
    const xc = (x0 + x1) / 2;
    const y0 = wave(x0), y1 = wave(x1);
    if (x0 > adv) continue;
    if (y0 <= ground(x0) && y1 <= ground(x1)) continue;
    const c = mixRGB(hex("#1a7aa8"), hex("#0f4f80"), smooth(0, 5, (y0 + y1) / 2 - ground(xc)));
    poly(tris, [[x0, Math.max(y0, ground(x0)), 4.2], [x1, Math.max(y1, ground(x1)), 4.2], [x1, ground(x1), 4.2], [x0, ground(x0), 4.2]], c, { alpha: 0.56, zBias: -2 });
    poly(tris, [[x0, y0, 4.2], [x1, y1, 4.2], [x1, y1, -28], [x0, y0, -28]], mixRGB(hex("#2a8ebd"), hex("#eef8f8"), hash2(i, 2, 4) * 0.15), { alpha: 0.7, zBias: -1 });
  }
  const env: Env = { ...SKIES.overcast, fogNear: 60, fogFar: 180 };
  emitCloudDeck(tris, camera, t, 0.7, 0.35, 90);
  const frame: Frame = { tris, camera, env };
  return { frame, fx: { ...NOFX, rain: 0.15, slant: 0.2 } };
}

const porch = () => {
  const h = town().houses.filter((p) => p.style === "concrete" && p.x < ROAD_X && p.x > 45 && p.z > 45).sort((a, b) => b.x - a.x)[0] ?? house0();
  return { h, x: h.x + h.d / 2 + 1.5, z: h.z };
};

function leavingShot(t: number): Built {
  const tris: Tri[] = [];
  const S: CoastState = { ...CALM, t, hauled: true, boarded: 1, swell: 0.55, wind: 0.2 };
  const fxRain = { ...NOFX, rain: 0.35, slant: 0.32 };
  if (t < 59) {
    const k = smooth(56, 59, t);
    const camera: Camera = { pos: [ROAD_X - 42 + k * 16, 42 - k * 8, 58 - k * 12], target: [ROAD_X, 2, 8], fov: 50 };
    const r = rng(77);
    for (let i = 0; i < 6; i++) {
      const z = 72 - i * 17 - (t - 56) * 4.2;
      const kind = i % 3;
      const y = groundH(ROAD_X - 1.7, z) + 0.1;
      if (kind === 2) car(tris, [ROAD_X - 1.7, y, z], Math.PI, hex("#b8bcc0"));
      else truck(tris, [ROAD_X - 1.7, y, z], Math.PI, kind ? hex("#2f6d8f") : hex("#b5563a"));
      r();
    }
    for (let i = 0; i < 16; i++) {
      const R = rng(i * 7);
      const side = R() < 0.5 ? -1 : 1;
      who(tris, camera, villager(i + 50, R() < 0.3 ? "child" : R() < 0.6 ? "woman" : "man"), { pos: onGround(ROAD_X + side * 5.2, 50 - i * 6 - (t - 56) * 1.2), yaw: Math.PI, walk: 1, phase: t * 6 + i }, undefined, t);
    }
    return { frame: coastFrame(tris, camera, SKIES.overcast, S, { dark: 0.8 }), fx: fxRain };
  }
  if (t < 62.2) {
    const z0 = 10;
    const k = smooth(59, 62.2, t);
    const g = groundH(ROAD_X, z0) + 0.1;
    const camera: Camera = { pos: [ROAD_X + 6.1 - k * 0.5, g + 1.5, z0 + 6.8 - k * 0.7], target: [ROAD_X - 1.1, g + 1.42, z0 - 0.4], fov: 44 };
    truck(tris, [ROAD_X - 2.4, g, z0 - 3.2], Math.PI, hex("#2f6d8f"));
    // Kap Boyet directs people, with a megaphone at his mouth.
    who(tris, camera, CAST.kap, { pos: [ROAD_X + 1.3, g, z0 + 1.5], yaw: Math.PI * 0.65, handR: [0.05, 1.53, 0.3], handL: [-0.55, 1.42, 0.4 + Math.sin(t * 5) * 0.08] }, "kap", t);
    limb(tris, add([ROAD_X + 1.3, g, z0 + 1.5], [0.2, 1.53, -0.26]), add([ROAD_X + 1.3, g, z0 + 1.5], [0.46, 1.54, -0.47]), 0.05, 0.13, hex("#e2e0d4"), 5);
    // Nena lifts Jun-Jun up onto the truck bed.
    const lift = smooth(60.0, 61.3, t);
    const bedZ = z0 + 0.25;
    who(tris, camera, CAST.nena, { pos: [ROAD_X - 2.2, g, z0 + 1.1], yaw: Math.PI, lean: 0.1, handL: [-0.16, 0.95 + lift * 0.8, 0.28], handR: [0.16, 0.95 + lift * 0.8, 0.28], headPitch: -0.3 }, undefined, t);
    who(tris, camera, CAST.jun, { pos: [ROAD_X - 2.2, g + lift * 1.02, bedZ + 0.5 - lift * 0.4], yaw: Math.PI, handL: [-0.2, 0.84, 0.25], handR: [0.2, 0.84, 0.25], headYaw: 0.6 }, undefined, t);
    for (let i = 0; i < 4; i++) who(tris, camera, villager(70 + i, i % 2 ? "woman" : "man"), { pos: [ROAD_X - 3.1 + i * 0.6, g + 1.05, z0 - 1.6 - i * 0.8], yaw: 0.2 + i * 0.3 }, undefined, t);
    return { frame: coastFrame(tris, camera, SKIES.overcast, S, { dark: 0.8 }), fx: fxRain };
  }
  const { x, z } = porch();
  const g = groundH(x, z);
  const k = smooth(62.2, 67, t);
  const camera: Camera = { pos: [x - 0.1, g + 1.15, z + 4.9 - k * 0.5], target: [x - 0.14, g + 0.9, z], fov: 34 };
  // The porch, her chair.
  poly(tris, [[x - 1.7, g + 0.28, z - 2.4], [x + 1.6, g + 0.28, z - 2.4], [x + 1.6, g + 0.28, z + 2.4], [x - 1.7, g + 0.28, z + 2.4]], hex("#8f7350"), { zBias: 1 });
  box(tris, { pos: [x - 0.76, g + 0.25, z], yaw: Math.PI / 2, size: [0.5, 0.48, 0.5] }, { color: hex("#5c4630") });
  box(tris, { pos: [x - 1.04, g + 0.7, z], yaw: Math.PI / 2, size: [0.52, 0.7, 0.06] }, { color: hex("#5c4630") });
  who(tris, camera, CAST.pacing, { pos: [x - 0.76, g + 0.28, z], yaw: Math.PI / 2, drop: 0.25, footL: [-0.1, 0.02, 0.48], footR: [0.1, 0.02, 0.48], handL: [-0.12, 0.84 - 0.06 * smooth(63, 63.6, t), 0.36 + 0.16 * smooth(63, 63.6, t)], handR: [0.2, 0.72, 0.15], headPitch: 0.08 }, undefined, t);
  who(tris, camera, CAST.tomas, { pos: [x + 0.46, g + 0.28, z - 0.1], yaw: -Math.PI / 2, drop: 0.5, lean: 0.08, footL: [-0.14, 0.03, 0.12], footR: [0.18, 0.03, -0.2], handL: [-0.02, 0.5, 0.45], handR: [0.1, 0.4, 0.3], headPitch: -0.05 }, "tomas", t);
  return { frame: coastFrame(tris, camera, SKIES.overcast, S, { dark: 0.85 }), fx: { ...fxRain, rain: 0.25 } };
}

function monsterShot(t: number): Built {
  const tris: Tri[] = [];
  const glows: Glow[] = [], lights: PointLight[] = [];
  const hours = -12 + smooth(67, 79, t) * 6;
  const c = stormPos(hours);
  const L = stormLook(hours);
  const k = smooth(67, 77.8, t);
  // From high above, circling down into the eye until its walls stand all around.
  const ang = 0.5 + k * 1.25, rad = 74 - k * 72.6, height = 92 - k * 90.1;
  const camera: Camera = { pos: [c[0] + Math.cos(ang) * rad, height, c[2] + Math.sin(ang) * rad], target: [c[0] - Math.sin(ang) * k * 1.8, k * 1.6, c[2] + Math.cos(ang) * k * 1.8], fov: 42 + k * 30 };
  emitSea(tris, t, c[0], c[2], 300, 20);
  emitLand(tris, 0.8);
  emitStorm(tris, c, L, t * 1.4, k > 0.5 ? 1.5 : 1.1);
  emitLightning(glows, lights, c, L, t, 2.6);
  // Dead silent on the very last word: the same stillness in the picture.
  const flash = glows.length ? 0.18 : 0;
  return { frame: { tris, camera, env: { ...SPACE, fogNear: 200, fogFar: 700 }, glowsFront: glows, lights }, fx: { ...NOFX, flash } };
}

function stormState(t: number, surge: number, patch: Partial<CoastState> = {}): CoastState {
  return { ...CALM, t, surge, swell: 1.05, wind: 0.95, boarded: 1, hauled: true, far: 420, flood: 0.25, ...patch };
}

function landfallShot(t: number): Built {
  const tris: Tri[] = [];
  const rise = smooth(82.2, 89.8, t);
  const surge = 0.6 + rise * 4.6;
  const ridgeX = -190 + 330 * smooth(81, 90, t);
  const S = stormState(t, surge, { ridge: { x: ridgeX, amp: 4.4 - rise * 2 }, damage: smooth(84, 91, t) * 0.52, poleFall: smooth(84, 90, t) * 0.8, palmFall: smooth(84, 91, t) * 0.5, flood: 0.5 + rise * 0.4 });
  const gy = TIE_PALM[1];
  const cams: CamShot[] = [
    { from: 79, to: 82.4, pos: [[TX + 8, gy + 2.3, BZ + 10], [TX + 7.6, gy + 2.3, BZ + 9.6]], target: [[TX - 22, gy + 0.9, BZ - 3], [TX - 22, gy + 0.9, BZ - 3]], fov: [46, 46], ease: (x) => x },
    { from: 82.4, to: 91.1, pos: [[TX + 7.6, gy + 2.3, BZ + 9.6], [TX + 74, 34, BZ + 70]], target: [[TX - 22, gy + 0.9, BZ - 3], [TX - 12, 3, BZ - 6]], fov: [46, 56], ease: (x) => 1 - (1 - x) ** 2.6 },
  ];
  let camera = shotCamera(cams, t);
  camera = shake(camera, t, 0.02 + rise * 0.14);
  const w = waterH(BOAT_HAULED[0], BZ, S);
  const floating = Math.max(BOAT_HAULED[1], w - 0.15);
  const adrift = Math.max(0, floating - BOAT_HAULED[1]) * 0.8;
  bangka(tris, [BOAT_HAULED[0] + adrift, floating, BZ + adrift * 0.4], Math.PI / 2 + 0.08 + adrift * 0.25, { roll: 0.14 * Math.sin(t * 2.1) * smooth(0, 0.7, adrift), pitch: 0.08 * Math.sin(t * 1.7) });
  limb(tris, [BOAT_HAULED[0] + adrift + 3.9, floating + 0.95, BZ + 0.2 + adrift * 0.4], [TX, TIE_PALM[1] + 0.9, TIE_PALM[2]], 0.018, 0.018, hex("#d0c29a"), 3);
  emitFlyingDebris(tris, camera, t, 0.4 + rise * 0.6);
  return { frame: coastFrame(tris, camera, { ...SKIES.storm, fogNear: 60, fogFar: 420 }, S, { dark: 1 }), fx: { ...NOFX, rain: 1, slant: 0.85, flash: lightningFlash(t, 0.33) } };
}

function lightningFlash(t: number, peak: number) {
  const k = Math.floor(t * 0.9);
  const r = rng(k * 11 + 1);
  const dt = t - (k + r()) / 0.9;
  return dt > 0 && dt < 0.16 ? peak * (dt < 0.05 || dt > 0.1 ? 1 : 0.35) : 0;
}

function windShot(t: number): Built {
  const tris: Tri[] = [];
  const z0 = 168;
  if (t < 93.65) {
    const first = t < 92.3;
    const y1 = groundH(ROAD_X, z0 - 13);
    const hero = town().houses.filter((p) => p.style === "concrete" && p.x < ROAD_X && p.z > 60 && p.z < 150).sort((a, b) => b.x - a.x)[0] ?? house0();
    const yh = groundH(hero.x, hero.z);
    const camera = shake(first ? { pos: [ROAD_X - 1, y1 + 1.6, z0 - 19], target: [ROAD_X + 1.5, y1 + 4, z0 - 3], fov: 58 } : { pos: [hero.x + 17, yh + 3, hero.z + 13], target: [hero.x + 1, yh + 4.6, hero.z], fov: 50 }, t, 0.06);
    if (first) {
      const fall = smooth(91.05, 92.05, t);
      powerPole(tris, [ROAD_X - 5, groundH(ROAD_X - 5, z0 - 5), z0 - 5], fall);
      palmTree(tris, [ROAD_X + 6.5, groundH(ROAD_X + 6.5, z0 - 8) - 0.1, z0 - 8], 77, t, 0.95, smooth(91.3, 92.2, t) * 0, 1);
    }
    const S = stormState(t, 0.7, { damage: first ? 0.3 : 0.26, poleFall: 0.42 + smooth(91.1, 92.2, t) * 0.25, palmFall: 0.34, flood: 0.7, swell: 0.4 });
    if (!first) {
      // Sheets of tin tearing off and flying.
      for (let i = 0; i < 5; i++) {
        const age = t - 92.3 - i * 0.14;
        if (age < 0) continue;
        tinSheet(tris, [hero.x - 2 + age * 22 - i * 0.5, yh + 4.2 + age * 8 + i * 0.3, hero.z - 3 + i * 1.6], age * 5 + i, age * 7, age * 4, 2.6);
      }
    }
    emitFlyingDebris(tris, camera, t, 1);
    return { frame: coastFrame(tris, camera, { ...SKIES.storm, fogFar: 240 }, S, { dark: 1 }), fx: { ...NOFX, rain: 1, slant: 0.9, flash: lightningFlash(t, 0.26) } };
  }
  // Liza, in the concrete hall, a shuttered gap with the storm behind her.
  const camera: Camera = { pos: [0.1, 1.5, 2.3], target: [0, 1.47, 0], fov: 32 };
  const buzz = t % 0.7 < 0.04 ? 0.5 : 1;
  roomBox(tris, 8, 3.4, 7, hex("#5e5c54"), hex("#8a877a"), hex("#6e6c62"), [0, 0, 0]);
  // A gap between shutters: bright, with rain beating through it.
  const gap = -3.46;
  poly(tris, [[-0.9, 0.9, gap], [1.2, 0.9, gap], [1.2, 2.3, gap], [-0.9, 2.3, gap]], hex("#8ea0ad"), { glow: 1, zBias: 2 });
  for (let i = 0; i < 6; i++) {
    const shake2 = 0.01 * Math.sin(t * 33 + i);
    poly(tris, [[-0.95, 0.95 + i * 0.24 + shake2, gap + 0.03], [1.25, 0.95 + i * 0.24 + shake2, gap + 0.03], [1.25, 1.1 + i * 0.24 + shake2, gap + 0.03], [-0.95, 1.1 + i * 0.24 + shake2, gap + 0.03]], hex("#54503f"), { zBias: 1 });
  }
  box(tris, { pos: [-2.5, 0, -3.1], size: [1.6, 1.3, 0.6] }, { color: hex("#3b4656") });
  who(tris, camera, CAST.liza, { pos: [0, 0, -0.1], yaw: 0, handR: [0.12, 1.25, 0.34], handL: [-0.25, 0.92, 0.1], headYaw: 0.04 * Math.sin(t * 2) }, "liza", t);
  // Her microphone.
  limb(tris, [0.1, 1.17, 0.27], [0.03, 1.35, 0.3], 0.018, 0.022, hex("#222428"), 5);
  octa(tris, { pos: [0.02, 1.37, 0.3], size: 0.045 }, { color: hex("#1c62b8") });
  return { frame: { tris, camera, env: { ...ROOM, ambient: [150 * buzz, 145 * buzz, 136 * buzz] }, lights: [{ p: [0, 3, 1], color: [255, 228, 180], intensity: 0.7 * buzz, range: 7 }] }, fx: { ...NOFX, flash: lightningFlash(t, 0.1) } };
}

function contactShot(t: number): Built {
  const tris: Tri[] = [];
  if (t < 103.6) {
    const k = smooth(101, 103.6, t);
    const camera = shake({ pos: [151 - k * 1.5, groundH(151, 45) + 1.9, 46 - k * 0.6], target: [139, 6.7, 40], fov: 52 }, t, 0.025);
    const S = stormState(t, 6.3 + 0.22 * Math.sin(t * 1.4), { damage: 0.72, poleFall: 0.85, palmFall: 0.55, flood: 0.85, swell: 0.32, far: 320 });
    return { frame: coastFrame(tris, camera, { ...SKIES.storm, fogNear: 45, fogFar: 260 }, S, { dark: 1 }), fx: { ...NOFX, rain: 1, slant: 0.82, flash: lightningFlash(t, 0.28) } };
  }
  if (t < 110) {
    const k = smooth(103.6, 110, t);
    const camera: Camera = { pos: [3.05, 1.08, 4.3 - k * 0.5], target: [3.05, 0.86, 0.3], fov: 36 };
    classroom(tris, camera, t, { night: true, names: 26, ticks: 0 });
    families(tris, camera, t);
    const lantern: V3 = [3.1, 0.34, 1.3];
    box(tris, { pos: [3.1, 0, 1.3], size: [0.34, 0.34, 0.34] }, { color: hex("#5c4630") });
    box(tris, { pos: lantern, size: [0.09, 0.17, 0.09] }, { color: hex("#fff0b2"), glow: 1 });
    const glows: Glow[] = [{ p: add(lantern, [0, 0.14, 0]), radius: 1.1, color: [255, 190, 110], alpha: 0.32 }];
    const flick = 0.92 + 0.08 * Math.sin(t * 11);
    const lights: PointLight[] = [{ p: add(lantern, [0, 0.35, 0]), color: [255, 196, 130], intensity: 1.75 * flick, range: 7 }];
    // Grandfather and boy at the window.
    who(tris, camera, CAST.tomas, { pos: [3.58, 0, 0.42], yaw: -0.65, drop: 0.72, footL: [-0.16, 0.04, 0.42], footR: [0.16, 0.04, 0.42], handL: [-0.1, 0.45, 0.42], handR: [0.13, 0.45, 0.42], headYaw: 0.1, headPitch: 0.16 }, "tomas", t);
    who(tris, camera, CAST.jun, { pos: [2.62, 0, 0.45], yaw: 0.62, drop: 0.53, footL: [-0.12, 0.04, 0.32], footR: [0.12, 0.04, 0.32], handL: [-0.1, 0.3, 0.3], handR: [0.1, 0.3, 0.3], headYaw: -0.2, headPitch: -0.2 }, "jun", t);
    const nena = { pos: [3.05, 0, -0.65] as V3, yaw: 0.08, drop: 0.68, footL: [-0.14, 0.04, 0.38] as V3, footR: [0.14, 0.04, 0.38] as V3, handL: [-0.1, 0.4, 0.35] as V3, handR: [0.1, 0.4, 0.35] as V3, headPitch: 0.2 };
    who(tris, camera, CAST.nena, nena, undefined, t);
    const env: Env = { ...ROOM, ambient: [44, 46, 58], sunColor: [28, 30, 40] };
    return { frame: { tris, camera, env, glowsFront: glows, lights }, fx: NOFX };
  }
  // The newsroom loses the Samar feeds.
  const dead = smooth(110.1, 112.1, t);
  const camera: Camera = { pos: [0, 1.35, 5.2], target: [0, 1.46, 0], fov: 34 };
  newsroom(tris, t, dead);
  who(tris, camera, CAST.carmela, { pos: [0, 0, 0], yaw: 0, headYaw: -0.45 * smooth(110.5, 111.2, t) * (1 - smooth(111.6, 112.1, t)), handL: [-0.26, 0.97, 0.36], handR: [0.26, 0.97, 0.36] }, "carmela", t);
  return { frame: { tris, camera, env: { ...ROOM, ambient: [128, 128, 134] } }, fx: NOFX };
}

function aftermathState(t: number, patch: Partial<CoastState> = {}): CoastState {
  return { ...CALM, t, surge: 2.4, swell: 0.1, wind: 0.05, boarded: 1, damage: 0.8, poleFall: 0.8, palmFall: 0.55, flood: 1, mud: 0.55, stranded: true, bridgeDown: true, debris: 0.8, hauled: true, far: 900, ...patch };
}

function cutoffShot(t: number): Built {
  const tris: Tri[] = [];
  const S = aftermathState(t);
  if (t < 117.5) {
    const k = smooth(113, 117.5, t);
    const camera: Camera = { pos: [ROAD_X + 36 - k * 10, 72 - k * 34, 60 - k * 116], target: [ROAD_X - 3, 2, -30 - k * 90], fov: 52 };
    return { frame: coastFrame(tris, camera, SKIES.drizzle, S, { dark: 0.78 }), fx: { ...NOFX, rain: 0.28, slant: 0.2 } };
  }
  // Miguel, on the bank above the water, with the broken bridge behind him.
  const px = ROAD_X + 11, pz = RIVER_Z + 26;
  const top = 3.9;
  const k = smooth(117.5, 124, t);
  const camera: Camera = { pos: [px + 1.5, top + 1.5, pz + 5.1 - k * 0.7], target: [px - 0.72, top + 1.05, pz - 1], fov: 30 };
  box(tris, { pos: [px, -1, pz], size: [16, top + 1, 15] }, { color: hex("#6b6658") });
  poly(tris, [[px - 8, top + 0.01, pz - 7.5], [px + 8, top + 0.01, pz - 7.5], [px + 8, top + 0.01, pz + 7.5], [px - 8, top + 0.01, pz + 7.5]], hex("#59564c"), { zBias: 4 });
  who(tris, camera, CAST.miguel, { pos: [px, top, pz], yaw: 0.1, handR: [0.11, 1.27, 0.34], handL: [-0.52, 1.25, 0.08], headYaw: 0.2 * Math.sin(t * 0.5) - 0.1 }, "miguel", t);
  limb(tris, [px + 0.11, top + 1.2, pz + 0.27], [px + 0.04, top + 1.38, pz + 0.3], 0.018, 0.022, hex("#222428"), 5);
  octa(tris, { pos: [px + 0.03, top + 1.4, pz + 0.3], size: 0.045 }, { color: hex("#1c62b8") });
  truck(tris, [px + 4.4, top, pz - 3], 0.3, hex("#ffffff"));
  return { frame: coastFrame(tris, camera, SKIES.drizzle, S, { dark: 0.78 }), fx: { ...NOFX, rain: 0.3, slant: 0.22 } };
}

function rescueShot(t: number): Built {
  const tris: Tri[] = [];
  const S = aftermathState(t, { surge: 2.75, far: 340 });
  const k = smooth(124, 130, t);
  const rx = 52, rz = 112;
  const bx = rx + 36 - k * 31;
  const bob = 0.05 * Math.sin(t * 1.7);
  const w = waterH(bx, rz, S);
  const camera: Camera = { pos: [bx + 3.2, w + 1.3 + bob, rz + 0.8], target: [rx, w + 1.0, rz], fov: 46 };
  // The rubber boat: fat grey tubes, a raised bow, an orange vest.
  const B = (x: number, y: number, z: number): V3 => [bx + x, w + y + bob, rz + z];
  limb(tris, B(-2.6, 0.32, -0.8), B(2.8, 0.32, -0.8), 0.3, 0.3, hex("#555d64"), 6);
  limb(tris, B(-2.6, 0.32, 0.8), B(2.8, 0.32, 0.8), 0.3, 0.3, hex("#555d64"), 6);
  limb(tris, B(-2.6, 0.32, -0.8), B(-3.3, 0.45, 0), 0.3, 0.22, hex("#555d64"), 6);
  limb(tris, B(-2.6, 0.32, 0.8), B(-3.3, 0.45, 0), 0.3, 0.22, hex("#555d64"), 6);
  poly(tris, [B(-2.8, 0.1, -0.8), B(2.8, 0.1, -0.8), B(2.8, 0.1, 0.8), B(-2.8, 0.1, 0.8)], hex("#343a40"));
  box(tris, { pos: B(2.75, 0.2, 0), yaw: Math.PI / 2, size: [0.34, 0.65, 0.34] }, { color: hex("#1c1f22") });
  const VEST = hex("#f06a1d");
  const rescuer: Look = { ...villager(90, "man"), vest: VEST, hardhat: hex("#f2d13c") };
  const rescuer2: Look = { ...villager(91, "man"), vest: VEST, hardhat: hex("#f2d13c") };
  const hand = smooth(128.4, 130, t);
  // A rooftop with a family on it, and the child passed across.
  const yR = w + 0.75;
  poly(tris, [[rx - 3.5, w - 0.5, rz - 4.5], [rx - 0.15, yR + 1.05, rz - 4.5], [rx - 0.15, yR + 1.05, rz + 4.5], [rx - 3.5, w - 0.5, rz + 4.5]], hex("#a06a3a"), { zBias: 2 });
  poly(tris, [[rx + 3.1, w - 0.5, rz - 4.5], [rx - 0.15, yR + 1.05, rz - 4.5], [rx - 0.15, yR + 1.05, rz + 4.5], [rx + 3.1, w - 0.5, rz + 4.5]], hex("#b77b45"), { zBias: 2 });
  const footY = yR + 0.2;
  who(tris, camera, villager(92, "man"), { pos: [rx + 1.0, footY, rz - 0.8], yaw: 1.1, lean: 0.14 + hand * 0.12, handL: [-0.2, 0.96 + hand * 0.25, 0.42 + hand * 0.2], handR: [0.2, 0.96 + hand * 0.25, 0.42 + hand * 0.2] }, undefined, t);
  who(tris, camera, villager(93, "woman"), { pos: [rx + 0.6, footY - 0.08, rz + 1.45], yaw: 1.3, handL: [-0.1, 1.42, 0.46 + 0.05 * Math.sin(t * 6)], handR: [0.2, 1.05, 0.3], headPitch: -0.14 }, undefined, t);
  const fly = smooth(129.5, 131.3, t);
  const from: V3 = add([rx + 1.5, footY + 0.68, rz - 0.3], [0, 0, 0]);
  const to: V3 = B(-1.2, 0.35, 0);
  const cx = from[0] + (to[0] - from[0]) * fly, cy = from[1] + (to[1] - from[1]) * fly + Math.sin(fly * Math.PI) * 0.2, cz = from[2] + (to[2] - from[2]) * fly;
  const armReach = smooth(127.8, 129.5, t);
  who(tris, camera, rescuer, { pos: B(-1.45, 0.14, -0.1), yaw: -Math.PI / 2, lean: 0.1 + armReach * 0.18, footL: [-0.15, 0.04, 0.28], footR: [0.15, 0.04, -0.15], handL: [-0.17 + fly * 0.04, 1.0 + armReach * 0.2 - fly * 0.4, 0.45 + armReach * 0.15 - fly * 0.26], handR: [0.17, 1.0 + armReach * 0.2 - fly * 0.4, 0.45 + armReach * 0.15 - fly * 0.26] }, undefined, t);
  who(tris, camera, rescuer2, { pos: B(2.1, 0.14, 0.1), yaw: -Math.PI / 2 + 0.2, handR: [0.05, 0.95, 0.42], drop: 0.1 }, undefined, t);
  who(tris, camera, villager(94, "child"), { pos: [cx, cy - 0.45, cz], yaw: 1.6, footL: [-0.12, 0.1, 0.05], footR: [0.12, 0.1, 0.05], handL: [-0.2, 0.86, 0.25], handR: [0.2, 0.86, 0.25], headYaw: -0.6 }, undefined, t);
  return { frame: coastFrame(tris, camera, SKIES.drizzle, S, { dark: 0.8 }), fx: { ...NOFX, rain: 0.32, slant: 0.2 } };
}

function awayShot(t: number): Built {
  const tris: Tri[] = [];
  const S = aftermathState(t, { surge: 1.9, far: 330, stranded: false });
  const k = smooth(133, 134.1, t);
  const nz = 38;
  const camera: Camera = { pos: [162.2, groundH(166, nz) + 1.45, nz + 9 - k * 8.4], target: [166, groundH(166, nz) + 1.3, nz + 4 - k * 4], fov: 36 };
  // The tank truck at the head of the line.
  const gy = groundH(166, nz);
  truck(tris, [166, gy, nz - 16], 0, hex("#c6c8c5"));
  limb(tris, [166, gy + 1.85, nz - 18.8], [166, gy + 1.85, nz - 14.5], 1.05, 1.05, hex("#3672b4"), 8);
  for (let i = 0; i < 12; i++) {
    const z = nz - 10 + i * 2.1;
    if (Math.abs(z - nz) < 1.25) continue;
    const L = villager(100 + i, i % 3 === 2 ? "child" : i % 3 ? "woman" : "man");
    who(tris, camera, L, { pos: onGround(166 + (i % 2) * 0.3, z), yaw: Math.PI - 0.12, headPitch: 0.2, handR: [0.3, 0.75, 0.15] }, undefined, t);
    box(tris, { pos: onGround(166.5 + (i % 2) * 0.3, z + 0.1, 0.42), size: [0.26, 0.42, 0.2] }, { color: [hex("#2f6db0"), hex("#f0ece0"), hex("#c94f3d"), hex("#e0b13c")][i % 4] });
  }
  who(tris, camera, CAST.nena, { pos: onGround(166, nz), yaw: -Math.PI / 2 - 0.2, headYaw: -0.05, handL: [-0.24, 0.84, 0.08], handR: [0.28, 0.72, 0.05], headPitch: 0.04 }, "nena", t);
  // Her jerrycan, held in both hands.
  box(tris, { pos: add(onGround(166, nz), [-0.05, 0.36, 0.34]), yaw: 0, size: [0.2, 0.36, 0.26] }, { color: hex("#3672b4") });
  // The inset: the storm weakening inland, moving away.
  const insetTris: Tri[] = [];
  const hours = 48 + (t - 138) * 2;
  const c = stormPos(hours);
  const ic: Camera = { pos: [-18, 86, 75], target: [-22, 0, 6], fov: 48 };
  emitSea(insetTris, t, -20, 0, 160, 26);
  emitLand(insetTris, 1);
  emitStorm(insetTris, c, stormLook(hours), t, 0.55);
  const inset: Inset | undefined = t >= 138 ? { frame: { tris: insetTris, camera: ic, env: SPACE }, x: 620, y: 540, w: 400, h: 420, label: "KALAKAS · WEAKENING INLAND" } : undefined;
  return { frame: coastFrame(tris, camera, SKIES.drizzle, S, { dark: 0.75 }), fx: { ...NOFX, rain: 0.28, slant: 0.14 }, inset };
}

function recovered(t: number, patch: Partial<CoastState> = {}): CoastState {
  return { ...CALM, t, surge: 0.05, swell: 0.2, boarded: 1, damage: 0.8, poleFall: 0.6, palmFall: 0.55, flood: 0.45, mud: 0.8, stranded: false, bridgeDown: true, debris: 0.55, hauled: true, far: 900, ...patch };
}

const HVIS = hex("#ec7a1f");

function fallsShot(t: number): Built {
  const tris: Tri[] = [];
  const S = recovered(t, { rebuild: 0.08 });
  const h = town().houses.find((x) => x.x > 90 && x.z > 60) ?? house0();
  if (t < 148) {
    const k = smooth(144, 148, t);
    return { frame: coastFrame(tris, { pos: [160 - k * 40, 110 - k * 62, 180 - k * 70], target: [62, 2, 40], fov: 52 }, SKIES.harsh, S, { dark: 0.08 }), fx: NOFX };
  }
  if (t < 150.5) {
    const camera: Camera = { pos: [h.x - 11, groundH(h.x, h.z) + 1.9, h.z + 9 - (t - 148) * 0.4], target: [h.x - 2, groundH(h.x, h.z) + 1.3, h.z + 1], fov: 44 };
    const tech = { ...villager(120, "woman"), vest: HVIS };
    who(tris, camera, tech, { pos: onGround(h.x - 5.5, h.z + 2.6), yaw: 2.2, handL: [-0.1, 1.2, 0.34], handR: [0.13, 1.2, 0.34], headPitch: 0.22 }, undefined, t);
    box(tris, { pos: add(onGround(h.x - 5.5, h.z + 2.6), [0.1, 1.2, -0.12]), yaw: 2.2, pitch: -0.5, size: [0.28, 0.02, 0.2] }, { color: hex("#ece6d5") });
    const tech2 = { ...villager(121, "man"), vest: HVIS, hardhat: hex("#f2f2ee") };
    who(tris, camera, tech2, { pos: onGround(h.x - 3.8, h.z + 4.2), yaw: 2.8, handR: [0.1, 1.52, 0.2], headPitch: 0.04, headYaw: 0.3 }, undefined, t);
    return { frame: coastFrame(tris, camera, SKIES.harsh, S, { dark: 0.08 }), fx: NOFX };
  }
  if (t < 152.3) {
    const z0 = -62;
    const gl = groundH(ROAD_X - 6, z0 + 11);
    const camera: Camera = { pos: [ROAD_X - 6, gl + 1.5, z0 + 11], target: [ROAD_X + 4.5, gl + 2.5, z0 + 0.2], fov: 58 };
    const raise = smooth(150.5, 152.3, t);
    const base: V3 = onGround(ROAD_X + 6.5, z0);
    const a = (1 - raise) * 1.1;
    limb(tris, base, [base[0] + Math.sin(a) * 8.5, base[1] + Math.cos(a) * 8.5, base[2]], 0.14, 0.1, hex("#6b6258"), 5);
    truck(tris, [ROAD_X - 0.6, groundH(ROAD_X, z0) + 0.1, z0 - 2], 0.2, hex("#f2d13c"));
    for (let i = 0; i < 4; i++) {
      const tech = { ...villager(130 + i, "man"), vest: HVIS, hardhat: hex("#f2d13c") };
      who(tris, camera, tech, { pos: onGround(ROAD_X + 4 + i * 1.1, z0 + 2.2 - i * 1), yaw: Math.PI + 1 + i * 0.2, lean: 0.16, handL: [-0.2, 1.5, 0.3], handR: [0.2, 1.4, 0.3], headPitch: -0.25 }, undefined, t);
    }
    return { frame: coastFrame(tris, camera, SKIES.harsh, S, { dark: 0.08 }), fx: NOFX };
  }
  const z0 = 34;
  const g = groundH(ROAD_X, z0) + 0.1;
  const camera: Camera = { pos: [ROAD_X - 9, g + 1.6, z0 + 10 - (t - 152.3) * 0.5], target: [ROAD_X - 0.4, g + 1.35, z0 + 1], fov: 44 };
  truck(tris, [ROAD_X, g, z0 - 3.2], 0.15, hex("#2f6d8f"));
  for (let i = 0; i < 9; i++) {
    const sack = i % 3 === 0;
    const L = villager(140 + i, i % 2 ? "woman" : "man");
    const z = z0 + 0.2 + i * 1.2;
    who(tris, camera, sack ? { ...L, vest: hex("#2f8f6b") } : L, { pos: onGround(ROAD_X - 1.8 + (i % 2) * 0.5, z), yaw: Math.PI - 0.1, handL: [-0.17, 1.22, 0.3], handR: [0.17, 1.22, 0.3] }, undefined, t);
    if (i < 5) box(tris, { pos: onGround(ROAD_X - 1.8 + (i % 2) * 0.5, z + 0.3, 1.14), size: [0.45, 0.24, 0.3] }, { color: hex("#e4dcc2") });
  }
  return { frame: coastFrame(tris, camera, SKIES.harsh, S, { dark: 0.08 }), fx: NOFX };
}

const WRECK_POS = (): V3 => [BOAT_HAULED[0] + 1.6, groundH(BOAT_HAULED[0] + 1.6, BZ + 2) + 0.12, BZ + 2];

function boatShot(t: number): Built {
  const tris: Tri[] = [];
  if (t < 159.8) {
    const k = smooth(154, 159.8, t);
    const camera: Camera = { pos: [-0.3, 1.35, 3.9 - k * 0.6], target: [-0.3, 1.5, -4.5], fov: 36 };
    classroom(tris, camera, t, { night: false, names: 26, ticks: 25 + smooth(157.1, 157.7, t) });
    const reach = smooth(156.2, 157.2, t);
    who(tris, camera, CAST.cora, { pos: [0.72, 0, -3.65], yaw: Math.PI * 1.08, handR: [0.05 + reach * 0.1, 1.05 + reach * 0.22, 0.24 + reach * 0.4], headPitch: 0.03 }, undefined, t);
    return { frame: { tris, camera, env: { ...ROOM, ambient: [195, 192, 180] } }, fx: NOFX };
  }
  const S = recovered(t, { rebuild: 0.22 + smooth(159, 168, t) * 0.15, flood: 0.25, surge: 0 });
  const wr = WRECK_POS();
  bangka(tris, wr, Math.PI / 2 + 0.3, { wreck: true, roll: 0.3 * (1 - smooth(165.6, 167, t) * 0.8) });
  limb(tris, [wr[0] + 3.3, wr[1] + 1.1, wr[2] + 1], [TX, TIE_PALM[1] + 0.9, TIE_PALM[2]], 0.018, 0.018, hex("#d0c29a"), 3);
  limb(tris, [TX, TIE_PALM[1], TIE_PALM[2]], [TX + 0.05, TIE_PALM[1] + 1, TIE_PALM[2]], 0.25, 0.24, hex("#6b5540"), 5);
  // Jun-Jun runs ahead down the beach, Tomas after him, neighbours coming to lift.
  const run = smooth(160, 162.4, t);
  const camera: Camera = t < 164.5
    ? { pos: [wr[0] + 7.5, wr[1] + 1.6, wr[2] - 9 + run * 1.2], target: [wr[0] + 2, wr[1] + 1, wr[2] + 2.5], fov: 44 }
    : { pos: [wr[0] - 1.1, wr[1] + 1.55, wr[2] - 0.7], target: [wr[0] + 1.5, wr[1] + 1.42, wr[2] + 2.4], fov: 30 };
  const jx = wr[0] + 17 - run * 12.6, jz = wr[2] + 15 - run * 13;
  who(tris, camera, CAST.jun, { pos: onGround(jx, jz), yaw: Math.atan2(wr[0] - jx, wr[2] + 2 - jz), walk: run < 1 ? 1 : 0, phase: t * 12, handL: run >= 1 ? [-0.22, 0.75, 0.2] : undefined }, "jun", t);
  const walk = smooth(160.7, 163.9, t);
  const tx = wr[0] + 15 - walk * 13.5, tz = wr[2] + 17 - walk * 14.6;
  who(tris, camera, CAST.tomas, {
    pos: onGround(tx, tz), yaw: walk >= 1 ? -2.0 : Math.atan2(wr[0] - tx, wr[2] - tz), walk: walk < 1 ? 1 : 0, phase: t * 7,
    handR: walk >= 1 ? [0.28, 1.06, 0.36] : undefined,
    headPitch: walk >= 1 ? 0.2 : 0,
  }, "tomas", t);
  const lift = smooth(165, 167, t);
  for (let i = 0; i < 6; i++) {
    const reach = smooth(162.7 + i * 0.2, 165, t);
    const fx = wr[0] + 1.5 + (i - 2.5) * 0.9, fz = wr[2] + (i % 2 ? 1.6 : -1.6);
    const sx = fx + 16 + i * 2, sz = fz + 15 - i;
    const x = sx + (fx - sx) * reach, z = sz + (fz - sz) * reach;
    const yaw = reach < 1 ? Math.atan2(fx - sx, fz - sz) : i % 2 ? Math.PI : 0;
    who(tris, camera, villager(150 + i, i === 2 ? "elder" : i % 3 ? "man" : "woman"), { pos: onGround(x, z), yaw, walk: reach < 1 ? 1 : 0, phase: t * 7 + i, lean: reach >= 1 ? 0.18 : 0, handL: reach >= 1 ? [-0.2, 0.8 + lift * 0.1, 0.4] : undefined, handR: reach >= 1 ? [0.2, 0.8 + lift * 0.1, 0.4] : undefined }, undefined, t);
  }
  return { frame: coastFrame(tris, camera, { ...SKIES.harsh, sunColor: [255, 238, 214] }, S, { dark: 0.14 }), fx: NOFX };
}

const MESSAGE_CAM: CamShot[] = [{ from: 168, to: 175.05, pos: [[-19, 0.9, BZ + 15], [-104, 54, BZ + 100]], target: [[1, 1.6, BZ], [48, 3, BZ - 18]], fov: [38, 52] }];

function messageShot(t: number): Built {
  const tris: Tri[] = [];
  if (t >= 175) return { frame: { tris, camera: { pos: [0, 0, 0], target: [0, 0, -1], fov: 40 }, env: ROOM }, fx: { ...NOFX, black: 1 } };
  const camera = shotCamera(MESSAGE_CAM, t);
  const S = recovered(t, { rebuild: 0.55 + smooth(168, 175, t) * 0.45, flood: 0, surge: 0, debris: 0.25, mud: 0.45, poleFall: 0, palmFall: 0.35 });
  const wr: V3 = [shoreX(BZ) + 4.5, groundH(shoreX(BZ) + 4.5, BZ) + 0.1, BZ];
  bangka(tris, wr, Math.PI / 2 + 0.02, { wreck: true });
  // New planks on the hull, Tomas at work on it.
  const swing = Math.abs(Math.sin(t * 4.6));
  who(tris, camera, CAST.tomas, { pos: onGround(wr[0] + 0.5, wr[2] - 1.1), yaw: 0.05, lean: 0.2, handR: [0.1, 0.8 + swing * 0.16, 0.36], handL: [-0.12, 0.78, 0.36] }, undefined, t);
  who(tris, camera, CAST.jun, { pos: onGround(wr[0] + 1.8, wr[2] - 1.2), yaw: -0.6, headYaw: -0.3, handL: [-0.12, 0.65, 0.32], handR: [0.12, 0.65, 0.32] }, undefined, t);
  return { frame: coastFrame(tris, camera, SKIES.dawn, S, { dark: 0.12, tint: hex("#ffd8b4") }, { glowsBehind: [{ p: [-1400, 200, -480], radius: 620, color: [255, 200, 140], alpha: 0.55 }] }), fx: NOFX };
}

const SHOTS_BY_NAME = {
  calm: calmShot, breaking: breakingShot, ready: readyShot, remembers: remembersShot, surge: surgeShot, leaving: leavingShot, monster: monsterShot, landfall: landfallShot,
  wind: windShot, contact: contactShot, cutoff: cutoffShot, rescue: rescueShot, away: awayShot, falls: fallsShot, boat: boatShot, message: messageShot,
} as const;

export function typhoonFrame(t: number): Built {
  return SHOTS_BY_NAME[shotAt(t).name](t);
}

export { LL, storyHours, tetra };
