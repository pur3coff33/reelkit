// What's on screen at reel time t in EP 08: a bald hilltop (the camp at the origin) with one tree on it, lowland and
// woods all round, and a thunderstorm that comes in from the west (−x).
import { add, hex, mixRGB, norm, scale, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { cone, fbm, hash2, octa, poseFn, rng, shotCamera, smooth, vary, type Shot } from "../../src/kit/lowpoly/world";
import { limb, type Look } from "../typhoon/models";
import { smoke } from "../../src/kit/whatif/props";
import type { Built, Fx } from "../../src/kit/whatif/Reel";
import type { Grade } from "../../src/kit/whatif/cinema";
import {
  CROUCH, ENV, SIT_GROUND, bolt, camper, cloudMass, domeTent, facing, flashAt, forest, grass, ground, headOf, hikerLook, leafy, lightning, packColor, paintBy, rain, setView, stride, type GroundSpec,
} from "../../src/kit/whatif/camp";
import { ALL_FLASHES, FLASHES, SHOTS, STRIKE, local, rainAt, shotAt, stormAt, type ShotName } from "./timeline";

// ── The hill ─────────────────────────────────────────────────────────────────────────────────────────

export function H(x: number, z: number) {
  const r = Math.hypot(x, z);
  return 38 * Math.exp(-((r / 58) ** 2)) + 2 * fbm(x * 0.03, z * 0.03, 3, 3) * smooth(8, 30, r) + 20 * fbm(x * 0.004, z * 0.004, 2, 9) * smooth(150, 500, r);
}
const on = (x: number, z: number, dy = 0): V3 => [x, H(x, z) + dy, z];

const GRASS = hex("#8aa04a"), GRASS2 = hex("#a8b05a"), LOW = hex("#5a7a3a");
const GROUND: GroundSpec = {
  key: "lightning-near", x0: -130, z0: -90, x1: 90, z1: 90, cell: 3, height: H, seed: 8,
  paint: (x, z, h, slope, r) => vary(mixRGB(mixRGB(GRASS, GRASS2, fbm(x * 0.05, z * 0.05, 2, 6) + 0.5), LOW, smooth(20, 4, h)), Math.round(x * 3 + z * 7), 0.07 + r * 0.03),
};
const FAR: GroundSpec = { key: "lightning-far", x0: -2400, z0: -2400, x1: 2400, z1: 2400, cell: 100, height: (x, z) => H(x, z) - 3, seed: 9, zBias: 300, paint: paintBy({ flat: hex("#4a6a34"), steep: hex("#5a6a44") }), skip: (x, z) => x > -125 && x < 85 && z > -85 && z < 85 };

const TREE = on(7, 5);
const SPREAD: V3[] = [on(-84, -8), on(-99, 3), on(-86, 13), on(-101, -14)];
const treesAt = (x: number, z: number) => {
  const r = Math.hypot(x, z);
  if (r < 62) return 0;
  // The low meadow they spread out in: open, a few bushes.
  if (Math.hypot(x + 92, z) < 24) return 0;
  return 0.6 * smooth(62, 80, r);
};

function land(out: Tri[], cam: Camera, t: number, far: number, wind: number) {
  ground(out, cam, GROUND, far);
  ground(out, cam, FAR, 5000);
  forest(out, cam, { seed: 13, x0: -130, z0: -90, x1: 90, z1: 90, spacing: 5, density: treesAt, ground: H, kind: "leafy", size: [6, 11], far: Math.min(far, 260), sway: wind * 0.4, t });
  grass(out, cam, { x0: -130, z0: -90, x1: 90, z1: 90, step: 0.8, ground: H, color: hex("#9ab052"), height: 0.4, wind: wind * 0.6, t, near: 14 });
  const r = rng(4);
  for (let k = 0; k < 10; k++) {
    const p = on(-92 + (r() - 0.5) * 40, (r() - 0.5) * 40);
    if (SPREAD.some((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < 5)) continue;
    octa(out, { pos: add(p, [0, 0.5, 0]), yaw: r() * 6, size: [1 + r(), 0.7 + r() * 0.4, 1 + r()] }, (i) => ({ color: mixRGB(hex("#3e6a2e"), [0, 0, 0], (i % 3) * 0.06) }));
  }
}

// ── The lone tree ────────────────────────────────────────────────────────────────────────────────────

function loneTree(out: Tri[], glows: Glow[], t: number) {
  if (t < STRIKE || t >= SHOTS.rewind.from) {
    leafy(out, TREE, 10, hex("#3a6a30"), 17, 1, 0.3 * Math.sin(t * 2) * stormAt(t));
    return;
  }
  // Split down the middle and smoking.
  const char = hex("#2a221c");
  for (const s of [-1, 1]) {
    const top: V3 = add(TREE, [s * 2.2, 5.4, 0.6 * s]);
    limb(out, TREE, top, 0.36, 0.2, char, 5);
    octa(out, { pos: add(top, [s * 0.8, 0.8, 0]), yaw: s, size: [1.8, 1.2, 1.7] }, (i) => ({ color: mixRGB(hex("#2e4a26"), [0, 0, 0], (i % 4) * 0.08) }));
  }
  const burn = Math.max(0, 1 - (t - STRIKE) / 6);
  octa(out, { pos: add(TREE, [0, 2.6, 0]), size: [0.3, 2, 0.3] }, { color: hex("#ff7a30"), glow: 1, alpha: burn });
  if (burn > 0) glows.push({ p: add(TREE, [0, 2.5, 0]), radius: 2.5, color: [255, 120, 40], alpha: 0.5 * burn });
  smoke(out, add(TREE, [0, 4.5, 0]), t, 1, 21, 1.6);
}

/** Current running out over the ground from the tree's roots: glowing forks that branch and fade. */
function groundCurrent(out: Tri[], glows: Glow[], t: number) {
  const a = t - STRIKE;
  if (a < 0 || a > 1.4) return;
  const reach = 22 * Math.min(1, a / 0.45), fade = 1 - smooth(0.5, 1.4, a);
  const r = rng(31);
  const arm = (p: V3, ang: number, len: number, depth: number) => {
    let q = p;
    const steps = 8;
    for (let k = 0; k < steps; k++) {
      const d = ((k + 1) / steps) * len;
      if (Math.hypot(q[0] - TREE[0], q[2] - TREE[2]) > reach) return;
      ang += (r() - 0.5) * 0.7;
      const nx = q[0] + Math.cos(ang) * (len / steps), nz = q[2] + Math.sin(ang) * (len / steps);
      const n = on(nx, nz, 0.06);
      const w = 0.07 * (1 - d / len) + 0.02;
      const side: V3 = [-Math.sin(ang) * w, 0, Math.cos(ang) * w];
      out.push({ a: add(q, side), b: add(n, side), c: add(n, scale(side, -1)), color: hex("#e6ecff"), glow: 1, alpha: fade, zBias: -0.3 }, { a: add(q, side), b: add(n, scale(side, -1)), c: add(q, scale(side, -1)), color: hex("#e6ecff"), glow: 1, alpha: fade, zBias: -0.3 });
      if (k % 3 === 2) glows.push({ p: n, radius: 1.2, color: [180, 190, 255], alpha: 0.5 * fade });
      if (depth > 0 && r() < 0.35) arm(n, ang + (r() < 0.5 ? -0.8 : 0.8), len * 0.5, depth - 1);
      q = n;
    }
  };
  for (let i = 0; i < 14; i++) arm(on(TREE[0], TREE[2], 0.06), (i / 14) * Math.PI * 2 + r() * 0.3, 10 + r() * 12, 2);
}

// ── Camp and campers ─────────────────────────────────────────────────────────────────────────────────

const TENTS: { p: V3; color: RGB }[] = [{ p: on(-3, -2), color: hex("#2e6fb4") }, { p: on(1, -7.5), color: hex("#e2672e") }, { p: on(-7.5, 4), color: hex("#3f8f5a") }];
const A = hikerLook(51, "man", hex("#c8402c")), B = hikerLook(52, "woman", hex("#e0b030")), C = hikerLook(53, "man", hex("#7a4ab0")), D = hikerLook(54, "woman", hex("#2a9a8a"));

function tents(out: Tri[], glows: Glow[], t: number) {
  const flap = smooth(9, 18, t) * (t < SHOTS.rewind.from ? 1 : 0.6);
  for (const s of TENTS) domeTent(out, glows, s.p, facing(s.p, [0, 0, 0]) + Math.PI, { color: s.color, flap, t });
}

/** The afternoon: lounging round the tents. */
function lounging(out: Tri[], glows: Glow[], t: number, look = 0) {
  const spots: [Look, V3, object][] = [[A, on(-1, 1.5), SIT_GROUND], [B, on(1, 0.2), SIT_GROUND], [C, on(3, 2.5), {}], [D, on(-2.5, -5), SIT_GROUND]];
  spots.forEach(([L, p, pose], i) => camper(out, glows, L, { pos: p, yaw: facing(p, on(-60, 10)) + (i - 1.5) * 0.4, ...(pose as object), headPitch: -0.25 * look, lod: 2 }));
}

/** Hair standing on end: spikes on the head. */
function hairUp(out: Tri[], head: V3, k: number, t: number) {
  if (k <= 0.02) return;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, tilt = 0.5 + 0.3 * hash2(i, 1, 1);
    const base: V3 = add(head, [Math.cos(a) * 0.07, 0.08, Math.sin(a) * 0.07]);
    cone(out, { pos: base, yaw: a, roll: Math.cos(a) * tilt * 0.6, pitch: Math.sin(a) * tilt * 0.6, size: [0.04, 0.22 * k * (1 + 0.15 * Math.sin(t * 40 + i)), 0.04] }, { color: hex("#14100e") }, 3);
  }
}

/** A person lying on their back. */
function lying(out: Tri[], L: Look, p: V3, yaw: number) {
  const T = poseFn({ pos: p, yaw });
  limb(out, T([0, 0.14, 0]), T([0, 0.14, 0.55]), 0.17, 0.15, L.top, 6);
  octa(out, { pos: T([0, 0.15, 0.72]), size: [0.11, 0.11, 0.12] }, { color: L.skin });
  octa(out, { pos: T([0, 0.2, 0.74]), size: [0.115, 0.06, 0.11] }, { color: L.hair });
  for (const s of [-1, 1]) {
    limb(out, T([s * 0.09, 0.1, -0.02]), T([s * 0.12, 0.07, -0.82]), 0.07, 0.05, L.bottom, 5);
    limb(out, T([s * 0.2, 0.14, 0.48]), T([s * 0.36, 0.06, 0.05]), 0.05, 0.04, L.top, 5);
  }
}

// ── The storm ────────────────────────────────────────────────────────────────────────────────────────

function stormCloud(out: Tri[], glows: Glow[], t: number) {
  const k = stormAt(t);
  if (k <= 0.02) return;
  const x = t < SHOTS.rewind.from ? -900 + 900 * smooth(6, 24, t) : -500;
  const fl = flashAt(t, ALL_FLASHES);
  // The tower, and its anvil spreading at the top.
  cloudMass(out, [x, 260 + 200 * k, 60], 260 + 180 * k, 3, hex("#4a505c"), { inner: fl * 0.8, puffs: 12, flat: 0.9, t });
  cloudMass(out, [x + 80, 700 + 260 * k, 40], 340 + 240 * k, 5, hex("#6a707c"), { inner: fl * 0.5, puffs: 9, flat: 0.95, t });
  if (fl > 0.05) glows.push({ p: [x, 380, 60], radius: 500, color: [190, 180, 255], alpha: 0.35 * fl });
}

/** Distant cloud-to-ground strikes for the counted flashes: further away the longer the count. */
function farStrikes(out: Tri[], glows: Glow[], t: number) {
  FLASHES.forEach((f, i) => {
    const a = flashAt(t, [f.at], 0.08);
    if (a < 0.05) return;
    const d = (f.gap / 3) * 1000 * 0.6;
    const p: V3 = [-d, 0, 120 * (i - 1)];
    p[1] = H(p[0], p[2]);
    bolt(out, glows, [p[0] + 40, 520, p[2]], p, 90 + i, { alpha: a, width: 2.2 });
  });
}

// ── Shots ────────────────────────────────────────────────────────────────────────────────────────────

const S = (name: ShotName, pos: [V3, V3], target: [V3, V3], fov: [number, number] = [50, 50], ease?: (x: number) => number): Shot[] => [{ from: SHOTS[name].from, to: SHOTS[name].to, pos, target, fov, ease }];
const lin = (x: number) => x;

const DAY: Env = { ...ENV.day, sun: norm([-0.3, 0.7, 0.4]), fogNear: 120, fogFar: 2600 };
const STORM: Env = { ...ENV.storm, skyTop: hex("#1e2430"), skyBottom: hex("#3e4654"), fog: hex("#343a44"), fogNear: 30, fogFar: 380, ambient: [76, 82, 96] };

function envAt(t: number): Env {
  const k = stormAt(t);
  const m = (a: RGB, b: RGB) => mixRGB(a, b, k);
  const base: Env = { skyTop: m(DAY.skyTop, STORM.skyTop), skyBottom: m(DAY.skyBottom, STORM.skyBottom), fog: m(DAY.fog, STORM.fog), fogNear: DAY.fogNear + (STORM.fogNear - DAY.fogNear) * k, fogFar: DAY.fogFar + (STORM.fogFar - DAY.fogFar) * k, sun: DAY.sun, sunColor: m(DAY.sunColor, STORM.sunColor), ambient: m(DAY.ambient, STORM.ambient) };
  return lightning(base, flashAt(t, ALL_FLASHES) * 0.9);
}

type Scene = { cam: Camera; fx?: Fx; build: (out: Tri[], glows: Glow[], lights: PointLight[]) => void; far?: number };

function scene(t: number): Scene {
  const shot = shotAt(t);
  const u = local(t, shot);
  const fl = flashAt(t, ALL_FLASHES);
  const flashFx = { white: fl * 0.15 };
  switch (shot) {
    case "hook": {
      const cam = shotCamera(S("hook", [on(20, -9, 3.2), on(18, -7.5, 3.0)], [add(TREE, [-4, 4.5, 0]), add(TREE, [-4, 5, 0])], [54, 52], lin), t);
      return { cam, fx: { white: flashAt(t, [2.4], 0.1) * 0.5 }, build: (o, g) => { tents(o, g, t); loneTree(o, g, t); lounging(o, g, t, 1); const a = flashAt(t, [2.4], 0.08); if (a > 0.05) bolt(o, g, [-260, 420, 160], on(-180, 120), 7, { alpha: a, width: 1.4 }); } };
    }
    case "camp": {
      const cam = shotCamera(S("camp", [on(17, 6, 3.0), on(15.5, 5.5, 3.2)], [on(-3, -1, 1.5), on(-3, -1, 1.7)], [50, 50], lin), t);
      return { cam, build: (o, g) => { tents(o, g, t); loneTree(o, g, t); lounging(o, g, t); } };
    }
    case "cloud": {
      const cam = shotCamera(S("cloud", [on(16, -3, 2.0), on(15.5, -3, 2.1)], [[-400, 160, 40], [-400, 230, 40]], [56, 58], lin), t);
      return { cam, far: 600, build: (o, g) => { tents(o, g, t); loneTree(o, g, t); lounging(o, g, t, 1); } };
    }
    case "flash":
    case "closer": {
      const cam = shotCamera(S(shot, shot === "flash" ? [on(6, 0.5, 1.5), on(5.4, 0.5, 1.5)] : [on(4.6, 0.5, 1.5), on(4.0, 0.5, 1.5)], [on(-200, 20, 50), on(-200, 20, 60)], [50, 50], lin), t);
      return { cam, fx: flashFx, far: 600, build: (o, g) => { tents(o, g, t); loneTree(o, g, t); lounging(o, g, t, 1); farStrikes(o, g, t); } };
    }
    case "tents": {
      const cam = shotCamera(S("tents", [on(8, -9, 2.2), on(7.4, -8.4, 2.1)], [on(-3, -1, 0.8), on(-3, -1, 0.8)], [50, 48], lin), t);
      const k = smooth(16.3, 18.6, t);
      const build = (out: Tri[], glows: Glow[]) => {
        tents(out, glows, t);
        loneTree(out, glows, t);
        // Three crawl into tents; the fourth hesitates.
        [[A, on(-1, 1.5), TENTS[0].p], [B, on(1, 0.2), TENTS[1].p], [D, on(-2.5, -5), TENTS[0].p]].forEach(([L, p0, door], i) => {
          if (k >= 1) return;
          const p = add(p0 as V3, scale([(door as V3)[0] - (p0 as V3)[0], 0, (door as V3)[2] - (p0 as V3)[2]], k * 0.85));
          p[1] = H(p[0], p[2]);
          camper(out, glows, L as Look, { pos: p, yaw: facing(p, door as V3), ...(k > 0.75 ? CROUCH : stride(t, 2.4, i)), lod: 2 });
        });
        const cp = on(3, 2.5);
        camper(out, glows, C, { pos: cp, yaw: facing(cp, TREE), headYaw: 0.4 * Math.sin(t * 2), lod: 2 });
      };
      return { cam, fx: flashFx, build };
    }
    case "tree": {
      const k = smooth(19.6, 21.4, t);
      const from = on(3, 2.5), to = add(TREE, [-0.9, 0, -0.6]);
      const p: V3 = [from[0] + (to[0] - from[0]) * k, 0, from[2] + (to[2] - from[2]) * k];
      p[1] = H(p[0], p[2]);
      const cam = shotCamera(S("tree", [on(-2, -6, 1.8), on(-1, -5, 1.9)], [add(TREE, [0, 3, 0]), add(TREE, [0, 3.5, 0])], [52, 50], lin), t);
      return { cam, fx: flashFx, build: (o, g) => { tents(o, g, t); loneTree(o, g, t); camper(o, g, C, { pos: p, yaw: k < 1 ? facing(from, to) : facing(p, on(-10, -10)), ...(k < 1 ? stride(t, 3.5) : { headPitch: -0.2 }), lod: 2 }); } };
    }
    case "hair": {
      const cp = add(TREE, [-0.9, 0, -0.6]);
      const yaw = facing(cp, on(-10, -10));
      const T = poseFn({ pos: cp, yaw });
      const cam = shotCamera(S("hair", [T([0.5, 1.6, 2.2]), T([0.35, 1.62, 1.6])], [T([0, 1.55, 0]), T([0, 1.6, 0])], [46, 40], lin), t);
      const k = smooth(22.8, 23.8, t);
      return { cam, build: (o, g) => { loneTree(o, g, t); const pose = { pos: cp, yaw, headPitch: -0.35, handL: [-0.25, 1.1, 0.2] as V3, lod: 2 }; camper(o, g, C, pose); hairUp(o, headOf(C, pose), k, t); for (let i = 0; i < 10; i++) { const sp = add(headOf(C, pose), [Math.sin(t * 31 + i) * 0.25, 0.25 + ((t * 2 + i * 0.13) % 0.4), Math.cos(t * 23 + i) * 0.25]); if (k > 0.5 && hash2(i, Math.floor(t * 12), 4) > 0.6) g.push({ p: sp, radius: 0.05, color: [200, 210, 255], alpha: 0.9 }); } } };
    }
    case "strike": {
      const cam = shotCamera(S("strike", [on(-18, -16, 3), on(-18.5, -16.5, 3.1)], [add(TREE, [0, 6, 0]), add(TREE, [0, 6, 0])], [56, 56], lin), t);
      const a = flashAt(t, [STRIKE, STRIKE + 0.5], 0.12);
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        tents(out, glows, t);
        loneTree(out, glows, t);
        if (a > 0.04) {
          bolt(out, glows, [TREE[0] - 30, 330, TREE[2] + 20], add(TREE, [0, 9, 0]), 77, { alpha: a, width: 0.5, forks: 6 });
          lights.push({ p: add(TREE, [0, 8, 0]), color: [220, 225, 255], intensity: 4 * a, range: 60 });
        }
        if (t >= STRIKE) lying(out, C, add(TREE, [-1.6, 0, -1.4]), -2.2);
      };
      return { cam: { ...cam, roll: t > STRIKE && t < STRIKE + 0.5 ? 0.03 * Math.sin(t * 60) : 0 }, fx: { white: t > STRIKE && t < STRIKE + 0.12 ? 0.9 : a * 0.3, zoom: t > STRIKE && t < STRIKE + 0.4 ? 0.016 : 0 }, build };
    }
    case "ground": {
      const tt = STRIKE + u * 0.4;
      const cam = shotCamera(S("ground", [add(TREE, [-14, 18, -16]), add(TREE, [-13, 17, -15])], [add(TREE, [-3, 0, -3]), add(TREE, [-3, 0, -3])], [50, 50], lin), t);
      return { cam, build: (o, g) => { tents(o, g, t); loneTree(o, g, tt); groundCurrent(o, g, tt); lying(o, C, add(TREE, [-1.6, 0, -1.4]), -2.2); } };
    }
    case "down": {
      const cam = shotCamera(S("down", [on(0.5, -4.5, 3.4), on(1.0, -4.0, 3.2)], [add(TREE, [-1.6, 0.3, -1.4]), add(TREE, [-1.6, 0.3, -1.4])], [48, 46], lin), t);
      const k = smooth(32, 34.5, t);
      const build = (out: Tri[], glows: Glow[]) => {
        tents(out, glows, t);
        loneTree(out, glows, t);
        lying(out, C, add(TREE, [-1.6, 0, -1.4]), -2.2);
        [[A, TENTS[0].p], [B, TENTS[1].p], [D, TENTS[0].p]].forEach(([L, door], i) => {
          const goal = add(TREE, [-2.6 - i * 0.6, 0, -2.4 + i * 0.9]);
          const p = add(door as V3, scale([goal[0] - (door as V3)[0], 0, goal[2] - (door as V3)[2]], k));
          p[1] = H(p[0], p[2]);
          camper(out, glows, L as Look, { pos: p, yaw: facing(p, goal), ...(k < 1 ? stride(t, 4, i) : {}), lod: 2 });
        });
      };
      return { cam, build };
    }
    case "cpr": {
      const v = add(TREE, [-1.6, 0, -1.4]);
      const cam = shotCamera(S("cpr", [add(v, [-2.6, 1.5, -2.0]), add(v, [-2.3, 1.4, -1.7])], [add(v, [0, 0.4, 0.2]), add(v, [0, 0.4, 0.2])], [46, 44], lin), t);
      const push = Math.max(0, Math.sin(t * Math.PI * 2 * 1.8)) * 0.07;
      const build = (out: Tri[], glows: Glow[]) => {
        loneTree(out, glows, t);
        lying(out, C, v, -2.2);
        const T = poseFn({ pos: v, yaw: -2.2 });
        const rp = T([0.62, 0, 0.42]);
        camper(out, glows, A, { pos: rp, yaw: -2.2 - Math.PI / 2, drop: 0.55, lean: 0.32, handL: [-0.04, 0.42 - push, 0.62], handR: [0.04, 0.44 - push, 0.62], headPitch: 0.5, lod: 2 });
        const bp = T([-0.6, 0, 0.75]);
        camper(out, glows, B, { pos: bp, yaw: facing(bp, T([0, 0, 0.7])), drop: 0.55, lean: 0.15, handL: [-0.1, 0.5, 0.45], handR: [0.1, 0.5, 0.45], lod: 2 });
        const dp = add(v, [-3, 0, 1]);
        dp[1] = H(dp[0], dp[2]);
        camper(out, glows, D, { pos: dp, yaw: facing(dp, v), handR: [0.15, 1.6, 0.1], headPitch: -0.1, lod: 2 });
      };
      return { cam, build };
    }
    case "rewind": {
      const k = smooth(39.3, 42.8, t);
      const cam = shotCamera(S("rewind", [on(-24, 8, 2.4), on(-28, 8, 2.6)], [on(-4, 0, 1.4), on(-8, 0, 1.4)], [50, 50], lin), t);
      const build = (out: Tri[], glows: Glow[]) => {
        loneTree(out, glows, t);
        [A, B, C, D].forEach((L, i) => {
          const p = on(-2 - k * 30 - i * 2.2, -3 + i * 2.2);
          camper(out, glows, L, { pos: p, yaw: -Math.PI / 2, ...stride(t, 2.2, i), lod: 2 }, { pack: packColor(i) });
        });
      };
      return { cam, fx: { tint: "#5a40ff", tintAmount: t < 39.5 ? 0.5 : 0.18, white: t < 39.15 ? 0.6 : 0 }, build };
    }
    case "spread": {
      const cam = shotCamera(S("spread", [on(-74, 12, 4.5), on(-76, 11, 4.2)], [on(-93, 0, 0.3), on(-93, 0, 0.3)], [50, 50], lin), t);
      const build = (out: Tri[], glows: Glow[]) => {
        [A, B, C, D].forEach((L, i) => {
          const p = SPREAD[i];
          camper(out, glows, L, { pos: p, yaw: facing(p, on(-66, 8)), drop: 0.6, lean: 0.2, handL: [-0.12, 0.6, 0.3], handR: [0.12, 0.6, 0.3], headPitch: 0.3, lod: 2 }, { pack: packColor(i) });
        });
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (j === i + 1) {
          // Dotted lines between them: the spacing.
          const a = SPREAD[i], b = SPREAD[j];
          for (let s = 0.1; s < 0.9; s += 0.08) {
            const q: V3 = [a[0] + (b[0] - a[0]) * s, 0, a[2] + (b[2] - a[2]) * s];
            q[1] = H(q[0], q[2]) + 0.15;
            octa(out, { pos: q, size: 0.18 }, { color: hex("#c3a6ff"), glow: 1, alpha: smooth(43.3, 44, t) });
          }
        }
      };
      return { cam, build };
    }
    case "wait": {
      const cam = shotCamera(S("wait", [on(-108, -24, 2.2), on(-106, -22, 2.3)], [on(-80, 10, 6), on(-80, 10, 8)], [52, 52], lin), t);
      const build = (out: Tri[], glows: Glow[]) => {
        [A, B, C, D].forEach((L, i) => {
          const p = SPREAD[i];
          camper(out, glows, L, { pos: p, yaw: facing(p, on(-40, 0)), ...(t < 49.5 ? { drop: 0.6, lean: 0.2 } : {}), headPitch: -0.2, lod: 2 }, { pack: packColor(i) });
        });
      };
      return { cam, build };
    }
    case "final":
    default: {
      const cam = shotCamera(S("final", [on(26, 18, 2.6), on(23, 16, 2.8)], [add(TREE, [-4, 4, -2]), add(TREE, [-4, 4.5, -2])], [52, 50], lin), t);
      return { cam, build: (o, g) => { tents(o, g, t); loneTree(o, g, t); } };
    }
  }
}

export function lightningFrame(t: number): Built {
  const sc = scene(t);
  setView(sc.cam);
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  const wind = smooth(9, 18, t) * (t < 50 ? 1 : 0.2);
  land(tris, sc.cam, t, sc.far ?? 300, wind);
  stormCloud(tris, glows, t);
  sc.build(tris, glows, lights);
  const r = rainAt(t);
  if (r > 0) rain(tris, sc.cam, t, { amount: r, wind: 0.35, speed: 18 });
  return { frame: { tris, camera: sc.cam, env: envAt(t), glowsFront: glows, lights }, fx: sc.fx ?? {} };
}

export function lightningGrade(t: number): Grade {
  const k = stormAt(t);
  if (shotAt(t) === "rewind") return { bloom: 0.4, contrast: 1.15, saturate: 0.7, brightness: 1.05, tint: "#7a6aff", tintAmount: 0.2 };
  if (k < 0.3) return { bloom: 0.35, contrast: 1.06, saturate: 1.12, brightness: 1.04, tint: "#ffe0a0", tintAmount: 0.1 };
  return { bloom: 0.5, contrast: 1.14, saturate: 0.85, brightness: 1.08, tint: "#6a6aa8", tintAmount: 0.15 };
}
