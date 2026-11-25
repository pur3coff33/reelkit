// What's on screen at reel time t in EP 07: a forested hill with a bald summit at the origin, the marked trail down
// (west, then south), the unmarked shortcut she takes, and the big tree where she waits out the night.
import { add, hex, mixRGB, norm, scale, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, octa, poseFn, rng, shotCamera, smooth, vary, type Shot } from "../../src/kit/lowpoly/world";
import { limb } from "../typhoon/models";
import { beam } from "../../src/kit/whatif/props";
import type { Built, Fx } from "../../src/kit/whatif/Reel";
import type { Grade } from "../../src/kit/whatif/cinema";
import {
  ENV, HUDDLE, camper, facing, forest, grass, ground, hikerLook, leafy, mist, moonGlow, packColor, paintBy, rock, setView, stride, type GroundSpec,
} from "../../src/kit/whatif/camp";
import { BLASTS, SHOTS, batteryAt, shotAt, type ShotName } from "./timeline";

// ── The hill ─────────────────────────────────────────────────────────────────────────────────────────

export function H(x: number, z: number) {
  const r = Math.hypot(x, z);
  return 32 * Math.exp(-((r / 85) ** 2)) + 2.5 * fbm(x * 0.04, z * 0.04, 3, 2) * smooth(10, 30, r);
}
const on = (x: number, z: number, dy = 0): V3 => [x, H(x, z) + dy, z];

type P2 = [number, number];
const OFFICIAL: P2[] = [[0, 0], [-14, 10], [-26, 24], [-38, 42], [-46, 64], [-50, 90]];
const SHORTCUT: P2[] = [[-26, 24], [-14, 36], [-2, 50], [8, 62]];
/** The big tree she shelters under, and where she sits. */
const REFUGE: V3 = on(20, 74);
const SEAT: V3 = on(18.9, 72.9);

function along(path: P2[], k: number): V3 {
  const f = Math.min(path.length - 1.0001, Math.max(0, k * (path.length - 1)));
  const i = Math.floor(f), u = f - i;
  return on(path[i][0] + (path[i + 1][0] - path[i][0]) * u, path[i][1] + (path[i + 1][1] - path[i][1]) * u);
}
const near = (path: P2[], x: number, z: number, r: number) => {
  for (let k = 0; k <= 80; k++) {
    const p = along(path, k / 80);
    if ((p[0] - x) ** 2 + (p[2] - z) ** 2 < r * r) return true;
  }
  return false;
};
const OFF_PTS = Array.from({ length: 81 }, (_, k) => along(OFFICIAL, k / 80));
const CUT_PTS = Array.from({ length: 81 }, (_, k) => along(SHORTCUT, k / 80));
const dist2 = (pts: V3[], x: number, z: number) => Math.min(...pts.map((p) => (p[0] - x) ** 2 + (p[2] - z) ** 2));

const DIRT = hex("#5a4a36"), LITTER = hex("#3e3828"), MOSS = hex("#33452a"), SUMMIT_GRASS = hex("#7a8a4a");
const GROUND: GroundSpec = {
  key: "lost-near", x0: -70, z0: -30, x1: 50, z1: 110, cell: 2.5, height: H, seed: 6,
  paint: (x, z, h, slope, r) => {
    const r0 = Math.hypot(x, z);
    if (r0 < 16) return vary(SUMMIT_GRASS, Math.round(x * 7 + z), 0.1);
    if (dist2(OFF_PTS, x, z) < 2.2) return vary(DIRT, Math.round(x * 13 + z * 3), 0.08);
    // The shortcut is a faint trace that peters out.
    const k = CUT_PTS.findIndex((p) => (p[0] - x) ** 2 + (p[2] - z) ** 2 < 1.6);
    if (k >= 0) return vary(mixRGB(DIRT, LITTER, smooth(30, 80, k)), Math.round(x * 13 + z * 3), 0.08);
    return vary(mixRGB(LITTER, MOSS, fbm(x * 0.1, z * 0.1, 2, 4) + 0.5), Math.round(x * 5 + z * 9), 0.06 + r * 0.04);
  },
};
const FAR: GroundSpec = { key: "lost-far", x0: -900, z0: -900, x1: 900, z1: 900, cell: 50, height: (x, z) => H(x, z) - 140 * smooth(120, 600, Math.hypot(x, z)) + 120 * fbm(x * 0.003, z * 0.003, 2, 8) * smooth(150, 500, Math.hypot(x, z)) - 2, seed: 7, zBias: 200, paint: paintBy({ flat: hex("#2c4026"), steep: hex("#34402e") }), skip: (x, z) => x > -65 && x < 45 && z > -25 && z < 105 };

const CLEARINGS: [number, number, number][] = [[REFUGE[0] - 3, REFUGE[2] - 3, 4.5], [10, 66, 3], [-28, 20, 3.5], [8, 76, 2.5]];
const treesAt = (x: number, z: number) => {
  if (Math.hypot(x, z) < 17) return 0;
  if (dist2(OFF_PTS, x, z) < 5.5) return 0;
  const k = CUT_PTS.findIndex((p) => (p[0] - x) ** 2 + (p[2] - z) ** 2 < 4.5);
  if (k >= 0 && k < 70) return 0;
  for (const [qx, qz, r] of CLEARINGS) if ((x - qx) ** 2 + (z - qz) ** 2 < r * r) return 0;
  return 0.78;
};

function hill(out: Tri[], cam: Camera, t: number, far: number) {
  ground(out, cam, GROUND, far);
  ground(out, cam, FAR, 2400);
  forest(out, cam, { seed: 11, x0: -70, z0: -30, x1: 50, z1: 110, spacing: 3.8, density: treesAt, ground: H, kind: "mix", size: [9, 16], far: Math.min(far, 130), sway: 0.05, t });
  grass(out, cam, { x0: -70, z0: -30, x1: 50, z1: 110, step: 0.75, ground: H, color: hex("#4a6a34"), height: 0.5, t, near: 13, where: (x, z) => dist2(OFF_PTS, x, z) > 2 });
  // Ferns and stones on the forest floor near the camera, the summit's trail post.
  leafy(out, REFUGE, 16, hex("#2e5230"), 41, 1);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    limb(out, add(REFUGE, [Math.cos(a) * 0.9, 0.4, Math.sin(a) * 0.9]), add(REFUGE, [Math.cos(a) * 2.6, 0.02, Math.sin(a) * 2.6]), 0.22, 0.08, hex("#4e3a2a"), 4);
  }
  const fork = on(-24.5, 22.2);
  limb(out, fork, add(fork, [0, 1.5, 0]), 0.06, 0.06, hex("#5a4632"), 4);
  octa(out, { pos: add(fork, [-0.35, 1.35, -0.2]), yaw: -0.6, size: [0.5, 0.14, 0.03] }, { color: hex("#d8c8a0") });
  const r = rng(9);
  for (let k = 0; k < 14; k++) rock(out, on(-10 + r() * 40, 50 + r() * 30, -0.15), 0.3 + r() * 0.6, 60 + k, hex("#5e5a52"));
}

// ── Her ──────────────────────────────────────────────────────────────────────────────────────────────

const HER = hikerLook(31, "woman", hex("#2a9a8a"));
const PACK = packColor(2);
const RESCUE = (i: number) => ({ ...hikerLook(40 + i, i === 1 ? "woman" : "man", hex("#2a3a52")), vest: hex("#ff7a1a"), hardhat: hex("#e8e4d8"), cap: undefined });

/** Where she is and what she's doing at time t. */
function her(t: number): { p: V3; yaw: number; pose: object; phone: number; walk: number } {
  if (t < SHOTS.fork.from) return { p: on(-3, 9), yaw: facing(on(-3, 9), on(-40, 40)), pose: { handR: [0.12, 1.5, 0.32], handL: [-0.05, 1.45, 0.32], headPitch: -0.05 }, phone: 0.4, walk: 0 };
  const legs: [number, number, number, number, P2[]][] = [
    [SHOTS.fork.from, SHOTS.dusk.from, 0, 0.18, SHORTCUT],
    [SHOTS.dusk.from, SHOTS.phone.from, 0.24, 0.42, SHORTCUT],
    [SHOTS.phone.from, SHOTS.gone.from, 0.45, 0.7, SHORTCUT],
    [SHOTS.gone.from, 19, 0.74, 0.92, SHORTCUT],
  ];
  for (const [a, b, k0, k1, path] of legs) {
    if (t >= a && t < b) {
      const k = k0 + ((t - a) / (b - a)) * (k1 - k0);
      const p = along(path, k), q = along(path, Math.min(1, k + 0.02));
      return { p, yaw: facing(p, q), pose: stride(t, 1.3), phone: t >= 13.4 ? 1 : 0, walk: 1 };
    }
  }
  const lost = on(9, 63);
  if (t < 20) return { p: lost, yaw: 0.6 + 1.6 * Math.sin((t - 19) * 2.6), pose: { headYaw: 0.5 * Math.sin(t * 3) }, phone: 1, walk: 0 };
  if (t < 23) {
    const k = (t - 20) / 3;
    const p: V3 = on(9 + 6.5 * k, 63 + 7 * k);
    const trip = t > 22.2 && t < 22.7 ? { lean: 0.45, drop: 0.25 } : {};
    return { p, yaw: facing(lost, on(15.5, 70)) + 0.3 * Math.sin(t * 4), pose: { ...stride(t, 3), ...trip }, phone: 1, walk: 1 };
  }
  if (t < 26) return { p: on(15.5, 70), yaw: facing(on(15.5, 70), on(10, 64)), pose: { headPitch: 0.15 }, phone: 1, walk: 0 };
  const phoneOn = t < 39.2 ? 1 : t >= 45.6 ? 1 : 0;
  const yaw = facing(SEAT, on(10, 66));
  if (t >= SHOTS.found.from) return { p: SEAT, yaw, pose: { ...HUDDLE, headPitch: -0.1 }, phone: 0, walk: 0 };
  const blowing = BLASTS.some((b) => t > b - 0.05 && t < b + 0.55);
  const pose = blowing ? { ...HUDDLE, handR: [0.02, 1.05 - 0.72, 0.2] as V3, headPitch: -0.1 } : { ...HUDDLE, headPitch: t > 31 ? 0.3 : 0.1 };
  return { p: SEAT, yaw, pose, phone: t >= SHOTS.shelter.from && t < 31 ? 1 : phoneOn * (t > 34 ? 0.6 : 1), walk: 0 };
}

function drawHer(out: Tri[], glows: Glow[], lights: PointLight[], t: number) {
  const h = her(t);
  const sitting = t >= SHOTS.shelter.from;
  const cold = smooth(30, 34, t) * (t < SHOTS.found.from ? 1 : 0.4);
  camper(out, glows, HER, { pos: h.p, yaw: h.yaw, ...(h.pose as object), lod: 2 }, { pack: sitting ? undefined : PACK, shiver: cold, t });
  if (sitting) octa(out, { pos: add(h.p, [0, 0.12, 0]), yaw: h.yaw, size: [0.28, 0.12, 0.22] }, { color: PACK });
  // The phone's torch: held out in front while walking, set beside her while she sits.
  if (h.phone > 0.02) {
    const T = poseFn({ pos: h.p, yaw: h.yaw });
    const hand = sitting ? T([0.32, 0.25, 0.25]) : T([0.22, 1.05, 0.38]);
    const aim = sitting ? T([0.6, 0.0, 1.8]) : T([0.1, 0, 3.6]);
    glows.push({ p: hand, radius: 0.08, color: [255, 255, 245], alpha: 0.95 * h.phone });
    beam(out, glows, hand, aim, 0.55 * h.phone, 0.32);
    lights.push({ p: add(aim, [0, 0.6, 0]), color: [240, 244, 255], intensity: 1.5 * h.phone, range: 5 });
  }
}

/** Rings spreading from her for each whistle blast. */
function blastRings(out: Tri[], t: number) {
  for (const b of BLASTS) {
    const a = t - b;
    if (a < 0 || a > 1.1) continue;
    const c = add(SEAT, [0, 0.9, 0]);
    const R = 0.4 + a * 5, n = 28;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const p0: V3 = [c[0] + Math.cos(a0) * R, c[1], c[2] + Math.sin(a0) * R], p1: V3 = [c[0] + Math.cos(a1) * R, c[1], c[2] + Math.sin(a1) * R];
      out.push({ a: p0, b: p1, c: add(p1, [0, 0.06, 0]), color: hex("#d8ffe0"), glow: 1, alpha: 0.5 * (1 - a / 1.1) }, { a: p0, b: add(p1, [0, 0.06, 0]), c: add(p0, [0, 0.06, 0]), color: hex("#d8ffe0"), glow: 1, alpha: 0.5 * (1 - a / 1.1) });
    }
  }
}

/** The search team coming through the trees with torches, calling. */
function searchers(out: Tri[], glows: Glow[], lights: PointLight[], t: number) {
  const k = smooth(42.6, 49, t);
  const turn = smooth(46.2, 47.4, t);
  [0, 1, 2].forEach((i) => {
    const start = on(-14 + i * 1.6, 60 + i * 3.4), end = on(13 + i * 0.6, 66.2 + i * 1.6);
    const p: V3 = [start[0] + (end[0] - start[0]) * k, 0, start[2] + (end[2] - start[2]) * k];
    p[1] = H(p[0], p[2]);
    const wander = (1 - turn) * 0.9 * Math.sin(t * 1.3 + i * 2);
    const yaw = facing(p, SEAT) + wander;
    camper(out, glows, RESCUE(i), { pos: p, yaw, ...(k < 1 ? stride(t, 1.2, i) : {}), handR: [0.2, 1.3, 0.45], lod: 2 });
    const hand = poseFn({ pos: p, yaw })([0.2, 1.3, 0.45]);
    const aim = poseFn({ pos: p, yaw })([0, 0, 7]);
    beam(out, glows, hand, aim, 0.4, 0.22);
    lights.push({ p: add(aim, [0, 0.8, 0]), color: [255, 246, 220], intensity: 1.6, range: 6 });
  });
}

// ── Shots ────────────────────────────────────────────────────────────────────────────────────────────

const S = (name: ShotName, pos: [V3, V3], target: [V3, V3], fov: [number, number] = [50, 50], ease?: (x: number) => number): Shot[] => [{ from: SHOTS[name].from, to: SHOTS[name].to, pos, target, fov, ease }];
const lin = (x: number) => x;

const SUNSET: Env = { ...ENV.dusk, sun: norm([-0.8, 0.12, 0.6]), fogNear: 80, fogFar: 1600, ambient: [100, 92, 112] };
const DUSK_FOREST: Env = { ...ENV.dusk, skyTop: hex("#1e2a50"), skyBottom: hex("#8a5a6a"), fog: hex("#3a3448"), fogNear: 12, fogFar: 110, ambient: [92, 90, 112], sunColor: [160, 116, 110] };
const NIGHT: Env = { ...ENV.forestNight, skyTop: hex("#0a1430"), skyBottom: hex("#26365a"), fog: hex("#121c30"), fogNear: 12, fogFar: 85, ambient: [70, 84, 114], sunColor: [96, 112, 156] };
const PREDAWN: Env = { skyTop: hex("#142040"), skyBottom: hex("#5a6a8a"), fog: hex("#34405a"), fogNear: 10, fogFar: 110, sun: ENV.night.sun, sunColor: [90, 104, 140], ambient: [70, 80, 106] };

type Scene = { cam: Camera; env: Env; fx?: Fx; far?: number; extra?: (out: Tri[], glows: Glow[], lights: PointLight[]) => void; mist?: RGB; sun?: boolean; noHer?: boolean };

/** The camera a little behind and above her, looking past her the way she's going. */
function follow(t: number, back = 3.2, up = 1.4, side = 0.6): Camera {
  const h = her(t);
  const T = poseFn({ pos: h.p, yaw: h.yaw });
  return { pos: T([side, up + 0.3, -back]), target: T([0, 1.0, 4]), fov: 50 };
}

function scene(t: number): Scene {
  const shot = shotAt(t);
  switch (shot) {
    case "hook": {
      // In front of her, a little to the side: her face in the phone's light, the dark forest behind.
      const tt = SHOTS.phone.from + 1.6 + t * 0.4;
      const h = her(tt);
      const T = poseFn({ pos: h.p, yaw: h.yaw });
      const cam: Camera = { pos: T([-1.3 + t * 0.06, 1.55, 3.4 - t * 0.12]), target: T([0, 1.35, 0]), fov: 46 };
      return { cam, env: NIGHT, extra: (o, g, l) => { drawHer(o, g, l, tt); l.push({ p: T([0.25, 1.4, 0.7]), color: [230, 240, 255], intensity: 1.2, range: 2.5 }); }, noHer: true };
    }
    case "summit": {
      const p = her(t).p;
      const cam = shotCamera(S("summit", [add(p, [2.6, 0.45, -2.6]), add(p, [2.3, 0.5, -2.3])], [add(p, [-1.5, 2.2, 1.2]), add(p, [-1.5, 2.2, 1.2])], [50, 48], lin), t);
      return { cam, env: SUNSET, sun: true, far: 400 };
    }
    case "fork": {
      const c = follow(t, 3.6, 1.5, 1.8);
      return { cam: c, env: { ...DUSK_FOREST, fogFar: 140, ambient: [104, 100, 122] } };
    }
    case "dusk": {
      const c = follow(t, 4, 1.6, 1.0);
      return { cam: c, env: { ...DUSK_FOREST, ambient: [62, 62, 84] } };
    }
    case "phone":
      return { cam: follow(t, 3.2, 1.6, -1.5), env: NIGHT };
    case "gone": {
      const p = on(9, 63);
      const cam = shotCamera(S("gone", [add(p, [3.2, 2.0, 2.6]), add(p, [2.6, 1.8, 2.2])], [add(p, [0, 1.0, 0]), add(p, [0, 1.0, 0])], [50, 46], lin), t);
      return { cam, env: NIGHT };
    }
    case "panic": {
      const c = follow(t, -2.8, 1.25, 1.6);
      return { cam: { ...c, target: add(her(t).p, [0, 1.1, 0]), roll: 0.03 * Math.sin(t * 5), pos: add(c.pos, [0.08 * Math.sin(t * 9), 0.06 * Math.sin(t * 13), 0]) }, env: NIGHT, fx: { zoom: t > 22.2 && t < 22.5 ? 0.008 : 0 } };
    }
    case "stop": {
      const p = on(15.5, 70);
      const cam = shotCamera(S("stop", [add(p, [-2.2, 1.6, -3.4]), add(p, [-1.8, 1.55, -2.6])], [add(p, [0, 1.3, 0]), add(p, [0, 1.35, 0])], [46, 42], lin), t);
      return { cam, env: NIGHT };
    }
    case "shelter":
    case "cold":
    case "whistle":
    case "off": {
      const close = shot === "cold" || shot === "off";
      const from = close ? add(SEAT, [-2.0, 1.1, -2.4]) : add(SEAT, [-4.5, 1.8, -4.6]);
      const cam = shotCamera(S(shot, [from, add(from, [0.3, -0.05, 0.4])], [add(SEAT, [0.2, 0.6, 0.3]), add(SEAT, [0.2, 0.6, 0.3])], close ? [42, 38] : [48, 46], lin), t);
      return { cam, env: NIGHT, extra: (o) => blastRings(o, t) };
    }
    case "waiting": {
      const cam = shotCamera(S("waiting", [add(SEAT, [1.7, 1.15, 1.4]), add(SEAT, [1.5, 1.1, 1.2])], [on(6, 63, 1.3), on(6, 63, 1.3)], [50, 48], lin), t);
      return { cam, env: { ...NIGHT, ambient: [86, 98, 130] }, extra: (o, g, l) => { searchers(o, g, l, t); l.push({ p: add(SEAT, [0.5, 2.5, 1]), color: [120, 140, 200], intensity: 1.2, range: 6 }); }, mist: hex("#4a5a78") };
    }
    case "search": {
      const cam = shotCamera(S("search", [add(SEAT, [1.8, 1.2, 2.2]), add(SEAT, [1.5, 1.2, 1.9])], [on(4, 65, 1.4), on(8, 66, 1.4)], [50, 48], lin), t);
      return { cam, env: PREDAWN, extra: (o, g, l) => { searchers(o, g, l, t); blastRings(o, t); }, mist: hex("#6a7690") };
    }
    case "found": {
      const cam = shotCamera(S("found", [add(SEAT, [-2.2, 1.2, -2.0]), add(SEAT, [-1.8, 1.15, -1.7])], [add(SEAT, [0.4, 0.7, 0.2]), add(SEAT, [0.4, 0.7, 0.2])], [46, 42], lin), t);
      const extra = (out: Tri[], glows: Glow[]) => {
        const rp = add(SEAT, [0.6, 0, -0.75]);
        rp[1] = H(rp[0], rp[2]);
        camper(out, glows, RESCUE(0), { pos: rp, yaw: facing(rp, SEAT), drop: 0.5, lean: 0.12, handL: [-0.2, 1.0, 0.6], handR: [0.25, 1.05, 0.55], lod: 2 });
        // The emergency blanket round her shoulders.
        limb(out, add(SEAT, [0, 0.76, 0.02]), add(SEAT, [0, 0.3, 0.02]), 0.24, 0.32, hex("#d8bc5a"), 7);
        [1, 2].forEach((i) => { const p = on(SEAT[0] - 3.5 + i, SEAT[2] - 4 + i * 0.6); camper(out, glows, RESCUE(i), { pos: p, yaw: facing(p, SEAT), lod: 2 }); });
      };
      return { cam, env: { ...PREDAWN, ambient: [86, 94, 118] }, extra, mist: hex("#7a86a0") };
    }
    case "final":
    default: {
      const cam = shotCamera(S("final", [on(-6, -8, 1.8), on(-4, -5, 2.0)], [on(-30, 40, 8), on(-30, 40, 9)], [52, 50], lin), t);
      return { cam, env: { ...ENV.dawn, fogNear: 60, fogFar: 1600 }, far: 400, noHer: true };
    }
  }
}

export function lostFrame(t: number): Built {
  const sc = scene(t);
  setView(sc.cam);
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const behind: Glow[] = [];
  const lights: PointLight[] = [];
  hill(tris, sc.cam, t, sc.far ?? 140);
  if (!sc.noHer) drawHer(tris, glows, lights, t);
  sc.extra?.(tris, glows, lights);
  if (sc.mist) mist(tris, sc.cam, { x0: -70, z0: -30, x1: 50, z1: 110, spacing: 6, ground: H, color: sc.mist, alpha: 0.12, t, seed: 5 });
  if (sc.sun) {
    const p = add(sc.cam.pos, scale(SUNSET.sun, 900));
    behind.push({ p, radius: 36, color: [255, 220, 170], alpha: 0.95 }, { p, radius: 220, color: [255, 130, 70], alpha: 0.3 });
  } else if (sc.env === NIGHT) behind.push(...moonGlow(sc.cam, undefined, 0.5));
  return { frame: { tris, camera: sc.cam, env: sc.env, glowsFront: glows, glowsBehind: behind, lights }, fx: sc.fx ?? {} };
}

export function lostGrade(t: number): Grade {
  const shot = shotAt(t);
  if (shot === "summit") return { bloom: 0.5, contrast: 1.08, saturate: 1.12, brightness: 1.04, tint: "#ff9a6a", tintAmount: 0.14 };
  if (shot === "fork" || shot === "dusk") return { bloom: 0.45, contrast: 1.1, saturate: 1.0, brightness: 1.08, tint: "#b07aa0", tintAmount: 0.12 };
  if (shot === "final") return { bloom: 0.45, contrast: 1.06, saturate: 1.08, brightness: 1.1, tint: "#ffc890", tintAmount: 0.12 };
  if (shot === "search" || shot === "found") return { bloom: 0.5, contrast: 1.1, saturate: 0.95, brightness: 1.12, tint: "#6a80b0", tintAmount: 0.12 };
  return { bloom: 0.6, contrast: 1.12, saturate: 0.95, brightness: 1.16, tint: "#3a6a8a", tintAmount: 0.13 };
}

export { batteryAt, near };
