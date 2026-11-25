// What's on screen at reel time t in EP 06: a grassy summit (the camp at the origin, 2,900 m) above a sea of clouds,
// the storm that comes up out of it, the trail down (−z) through the mossy forest to a ranger station.
import { add, hex, mixRGB, norm, scale, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, fbm, house, octa, poseFn, rng, shotCamera, smooth, vary, type Shot } from "../../src/kit/lowpoly/world";
import { limb, type Look } from "../typhoon/models";
import type { Built, Fx } from "../../src/kit/whatif/Reel";
import type { Grade } from "../../src/kit/whatif/cinema";
import {
  ENV, HUDDLE, bolt, camper, cloudMass, domeTent, facing, flashAt, forest, grass, ground, hikerLook, lightning, mist, packColor, paintBy, rain, rock, setView, stride, track, type GroundSpec,
} from "../../src/kit/whatif/camp";
import { SHOTS, STRIKES, SUMMIT_STRIKE, local, rainAt, shotAt, stormAt, windAt, type ShotName } from "./timeline";

// ── The mountain ─────────────────────────────────────────────────────────────────────────────────────

const PEAKS: [number, number, number][] = [[900, 1500, -70], [-1400, 1900, -95], [1900, 500, -120], [-800, 900, -130], [2300, 2600, -40], [-2200, 400, -110]];

export function H(x: number, z: number) {
  const r = Math.hypot(x * 0.75, z);
  let h = -0.06 * r ** 1.6 + 3 * fbm(x * 0.03, z * 0.03, 3, 2) * smooth(4, 20, r);
  h = Math.max(h, -620 + 40 * fbm(x * 0.002, z * 0.002, 2, 3));
  for (const [px, pz, ph] of PEAKS) h = Math.max(h, ph - 0.06 * Math.hypot(px - x, pz - z) ** 1.6 + 6 * fbm(x * 0.01, z * 0.01, 2, 5));
  return h;
}
const on = (x: number, z: number, dy = 0): V3 => [x, H(x, z) + dy, z];

const GRASS = hex("#a8a65a"), GRASS_DRY = hex("#c4b878"), MOSS = hex("#3c5a34"), ROCKC = hex("#6e6a62");
const NEAR: GroundSpec = {
  key: "summit-near", x0: -140, z0: -240, x1: 140, z1: 140, cell: 4, height: H, seed: 2,
  paint: (x, z, h, slope, r) => {
    const g = mixRGB(GRASS, GRASS_DRY, fbm(x * 0.05, z * 0.05, 2, 6) + 0.5);
    const c = h < -95 ? mixRGB(MOSS, hex("#2e4a2a"), r) : mixRGB(g, ROCKC, smooth(0.45, 0.7, slope));
    return vary(c, Math.round(x * 3 + z * 11), 0.07);
  },
};
const FAR: GroundSpec = { key: "summit-far", x0: -3200, z0: -3200, x1: 3200, z1: 3200, cell: 140, height: (x, z) => H(x, z) - (Math.abs(x) < 150 && z > -260 && z < 160 ? 8 : 0), seed: 3, zBias: 400, paint: paintBy({ flat: hex("#4a6a3a"), steep: hex("#5a5a4e"), high: hex("#a8a060"), highFrom: -200 }), skip: (x, z) => x > -130 && x < 130 && z > -230 && z < 130 };

// The trail down: from the camp to the ranger station.
const TRAIL: [number, number][] = [[0, -4], [6, -30], [-4, -62], [7, -96], [-2, -130], [5, -165], [3, -196]];
function trailAt(k: number): V3 {
  const f = Math.min(TRAIL.length - 1.0001, Math.max(0, k * (TRAIL.length - 1)));
  const i = Math.floor(f), u = f - i;
  const x = TRAIL[i][0] + (TRAIL[i + 1][0] - TRAIL[i][0]) * u, z = TRAIL[i][1] + (TRAIL[i + 1][1] - TRAIL[i][1]) * u;
  return on(x, z);
}
const STATION = on(8, -205);

const TRAIL_PTS = Array.from({ length: 121 }, (_, k) => trailAt(k / 120));
const nearTrail = (x: number, z: number) => TRAIL_PTS.some((p) => (p[0] - x) ** 2 + (p[2] - z) ** 2 < 9);
const treesAt = (x: number, z: number) => {
  const h = H(x, z);
  if (h > -92) return 0;
  if (Math.hypot(x - STATION[0], z - STATION[2]) < 22) return 0;
  if (nearTrail(x, z)) return 0;
  return 0.8 * smooth(-92, -110, h);
};
const MOSSY = ["#3a5a32", "#4a6a38", "#2e4a2c", "#56703a"].map(hex);

function mountain(out: Tri[], cam: Camera, t: number, far: number, wind: number) {
  ground(out, cam, NEAR, far);
  ground(out, cam, FAR, 7000);
  forest(out, cam, { seed: 8, x0: -140, z0: -240, x1: 140, z1: 0, spacing: 4.2, density: treesAt, ground: H, kind: "leafy", size: [4, 8], palette: MOSSY, far: Math.min(far, 160), sway: wind * 0.5, t });
  grass(out, cam, { x0: -140, z0: -240, x1: 140, z1: 140, step: 0.8, ground: H, where: (x, z) => H(x, z) > -90, color: hex("#b8b064"), height: 0.38, wind, t, near: 16 });
  const r = rng(5);
  for (let k = 0; k < 18; k++) {
    const x = -30 + r() * 60, z = -40 + r() * 70;
    if (Math.hypot(x, z) < 8) continue;
    rock(out, on(x, z, -0.2), 0.4 + r() * 0.9, 20 + k, hex("#7a766c"));
  }
}

// ── The sea of clouds ────────────────────────────────────────────────────────────────────────────────

type Sea = { y: number; color: RGB; dark: number };
const SEA_N = 48, SEA_CELL = 130, SEA_X0 = -3100, SEA_Z0 = -3100;
const SEA_H = Array.from({ length: (SEA_N + 1) ** 2 }, (_, k) => 26 * fbm((k % (SEA_N + 1)) * 0.45, Math.floor(k / (SEA_N + 1)) * 0.45, 3, 9));

/** A rolling floor of cloud below the summit. Its height and colour change as the storm comes. */
function cloudFloor(out: Tri[], cam: Camera, sea: Sea, t: number) {
  const w = SEA_N + 1;
  const v = (i: number, j: number): V3 => {
    const x = SEA_X0 + i * SEA_CELL, z = SEA_Z0 + j * SEA_CELL;
    return [x + Math.sin(j * 1.7 + i) * 30, sea.y + SEA_H[j * w + i] + 6 * Math.sin(t * 0.4 + i * 0.7 + j * 0.3), z + Math.cos(i * 1.3 + j) * 30];
  };
  for (let j = 0; j < SEA_N; j++)
    for (let i = 0; i < SEA_N; i++) {
      const cx = SEA_X0 + (i + 0.5) * SEA_CELL, cz = SEA_Z0 + (j + 0.5) * SEA_CELL;
      // Under the mountain itself, leave it out.
      if (H(cx, cz) > sea.y + 30) continue;
      if (Math.hypot(cx - cam.pos[0], cz - cam.pos[2]) > 3400) continue;
      const c = vary(mixRGB(sea.color, [70, 74, 82], sea.dark), i * 7 + j, 0.05);
      out.push({ a: v(i, j), b: v(i + 1, j), c: v(i + 1, j + 1), color: c, zBias: 300 }, { a: v(i, j), b: v(i + 1, j + 1), c: v(i, j + 1), color: mixRGB(c, [0, 0, 0], 0.04), zBias: 300 });
    }
}

// ── Camp, hikers, guide ──────────────────────────────────────────────────────────────────────────────

const TENTS: { p: [number, number]; color: RGB }[] = [
  { p: [-5, -2], color: hex("#e2672e") }, { p: [-1.5, -4.5], color: hex("#2e6fb4") }, { p: [3, -3], color: hex("#e0c03a") },
  { p: [6.5, -0.5], color: hex("#3f8f5a") }, { p: [-8, 1.5], color: hex("#c43a4a") },
];
/** The tent that goes: its poles snap at 20.6 and the wind takes it. */
const FLY = 2;
const flyAt = 20.6;

function camp(out: Tri[], glows: Glow[], t: number, wind: number) {
  const flap = smooth(10, 60, wind);
  TENTS.forEach((s, i) => {
    const p = on(s.p[0], s.p[1]);
    if (i === FLY && t > flyAt) {
      const a = t - flyAt;
      const q: V3 = [p[0] + 6 * a * a + 4 * a, p[1] + Math.sin(Math.min(a, 2.4)) * 3 + a * 0.6, p[2] + 1.5 * a];
      domeTent(out, glows, q, a * 2.4, { color: s.color, collapse: 0.55, roll: a * 3.1, pitch: a * 1.7, t, flap: 1 });
      return;
    }
    const collapse = i === FLY ? smooth(flyAt - 0.5, flyAt, t) * 0.5 : t > 23 ? 0.25 * smooth(23, 30, t) * (i % 2) : 0;
    domeTent(out, glows, p, facing([s.p[0], 0, s.p[1]], [0, 0, 20]), { color: s.color, flap: flap * (1 + (i % 2) * 0.3), collapse, t });
  });
}

const GUIDE: Look = { ...hikerLook(20, "man", hex("#e8562a")), cap: hex("#2b2f36") };
const HIKERS = [hikerLook(21, "woman", hex("#2e6fb4")), hikerLook(22, "man", hex("#f0b43a")), hikerLook(23, "woman", hex("#7a4ab0")), hikerLook(24, "man", hex("#3f8f5a")), hikerLook(25, "woman", hex("#c43a4a")), hikerLook(26, "man", hex("#2b2f36"))];
/** Rain shells: everyone's jacket, hood up, once it rains. */
const shell = (L: Look, t: number): Look => (rainAt(t) > 0.3 ? { ...L, hairStyle: "short", cap: L.top } : L);

/** Watching the sunrise from the summit's edge. */
function viewers(out: Tri[], glows: Glow[], t: number) {
  HIKERS.slice(0, 5).forEach((L, i) => {
    const p = on(-6 + i * 3, 6 + (i % 2) * 1.2);
    const arm = i === 2 ? { handR: [0.15, 1.45, 0.35] as V3, handL: [-0.1, 1.45, 0.35] as V3 } : {};
    camper(out, glows, L, { pos: p, yaw: 0.15 * (i - 2), headPitch: 0.1, ...arm, lod: 2 });
  });
}

/** The camp in the wind: hikers leaning into it, holding on to tents. */
function braced(out: Tri[], glows: Glow[], t: number, wind: number) {
  const lean = 0.06 + 0.16 * smooth(30, 100, wind);
  HIKERS.forEach((L, i) => {
    const p = on(-9 + (i % 3) * 2.2, 4 + Math.floor(i / 3) * 2.2 + (i % 2) * 0.5);
    const sway = 0.04 * Math.sin(t * 6 + i * 2) * smooth(40, 100, wind);
    camper(out, glows, shell(L, t), { pos: p, yaw: -Math.PI / 2 + 0.3 * Math.sin(i), lean: lean + sway, handL: i % 2 ? [-0.2, 1.1, 0.4] : undefined, headPitch: 0.3, lod: 2 }, { pack: packColor(i), shiver: smooth(22, 28, t) * 0.5, t });
  });
  camper(out, glows, shell(GUIDE, t), { pos: on(-2.5, 6), yaw: -Math.PI / 2, lean, headPitch: 0.15, lod: 2 }, { pack: packColor(5) });
}

/** The line going down the trail, the guide in front with a rope back along it. */
function line(out: Tri[], glows: Glow[], t: number, k0: number, speed: number, lights: PointLight[] = []) {
  const people = [GUIDE, ...HIKERS];
  const pts: V3[] = [];
  people.forEach((L, i) => {
    const k = Math.max(0, k0 - i * 0.012);
    const p = trailAt(k), q = trailAt(Math.min(1, k + 0.01));
    const lamp = camper(out, glows, shell(L, t), { pos: p, yaw: facing(p, q), ...stride(t, speed, i * 1.7), lean: 0.12, handR: [0.25, 1.0, 0.25], lod: 2 }, { pack: packColor(i), lamp: 1 });
    const ahead: V3 = [q[0] - p[0], 0, q[2] - p[2]];
    const n = Math.hypot(ahead[0], ahead[2]) || 1;
    lights.push({ p: [lamp[0] + (ahead[0] / n) * 1.5, lamp[1] - 0.6, lamp[2] + (ahead[2] / n) * 1.5], color: [235, 240, 255], intensity: 1.1, range: 5 });
    pts.push(add(p, [0.25, 1.0, 0]));
  });
  for (let i = 0; i < pts.length - 1; i++) limb(out, pts[i], pts[i + 1], 0.015, 0.015, hex("#f0d020"), 3);
}

/** Brown water running down the trail. */
function streamOnTrail(out: Tri[], t: number, k0: number, k1: number) {
  for (let k = k0; k < k1; k += 0.004) {
    const a = trailAt(k), b = trailAt(k + 0.004);
    const d = norm([b[0] - a[0], 0, b[2] - a[2]]);
    const side: V3 = [-d[2] * 0.85, 0, d[0] * 0.85];
    const flow = (k * 300 + t * 3) % 1;
    const c = mixRGB(hex("#9a8a6e"), hex("#e8e0d0"), flow < 0.2 ? 0.7 : 0);
    out.push({ a: add(a, [side[0], 0.06, side[2]]), b: add(a, [-side[0], 0.06, -side[2]]), c: add(b, [-side[0], 0.06, -side[2]]), color: c, mirror: 0.6, zBias: -0.1 }, { a: add(a, [side[0], 0.06, side[2]]), b: add(b, [-side[0], 0.06, -side[2]]), c: add(b, [side[0], 0.06, side[2]]), color: c, mirror: 0.6, zBias: -0.1 });
  }
}

function station(out: Tri[], glows: Glow[], lights: PointLight[]) {
  house(out, { pos: STATION, yaw: 0.3, size: [7, 3, 5] }, hex("#5e4a36"), hex("#34483a"));
  const T = poseFn({ pos: STATION, yaw: 0.3 });
  for (const x of [-1.8, 1.8]) {
    const w = T([x, 1.6, -2.52]);
    octa(out, { pos: w, size: [0.55, 0.45, 0.04] }, { color: hex("#ffcf80"), glow: 0.85 });
    glows.push({ p: w, radius: 0.8, color: [255, 210, 140], alpha: 0.4 });
  }
  const lamp = T([0, 2.7, -2.7]);
  glows.push({ p: lamp, radius: 0.4, color: [255, 240, 210], alpha: 0.9 });
  lights.push({ p: add(lamp, [0, -0.6, -2.5]), color: [255, 214, 160], intensity: 1.0, range: 9 });
  limb(out, add(STATION, [6, 0, 0]), add(STATION, [6, 6, 0]), 0.06, 0.05, hex("#9a9a9a"), 3);
  octa(out, { pos: add(STATION, [6.6, 5.4, 0]), size: [0.6, 0.35, 0.02] }, { color: hex("#2a5ab0") });
}

// ── Shots ────────────────────────────────────────────────────────────────────────────────────────────

const S = (name: ShotName, pos: [V3, V3], target: [V3, V3], fov: [number, number] = [50, 50], ease?: (x: number) => number): Shot[] => [{ from: SHOTS[name].from, to: SHOTS[name].to, pos, target, fov, ease }];
const lin = (x: number) => x;

const SUNRISE: Env = { ...ENV.sunrise, fogNear: 300, fogFar: 4200, ambient: [120, 112, 130] };
const STORM: Env = { ...ENV.storm, fogNear: 4, fogFar: 70 };
const SUN_DIR = norm([0.2, 0.14, 1]);
const RANGER: Env = { skyTop: hex("#1a2230"), skyBottom: hex("#3e4656"), fog: hex("#2a323e"), fogNear: 10, fogFar: 150, sun: norm([0.3, 0.8, 0.2]), sunColor: [84, 90, 106], ambient: [74, 80, 98] };

/** The sky, sea and light between sunrise and storm. */
function weather(k: number): { env: Env; sea: Sea } {
  const mix = (a: RGB, b: RGB) => mixRGB(a, b, k);
  const env: Env = {
    skyTop: mix(SUNRISE.skyTop, STORM.skyTop), skyBottom: mix(SUNRISE.skyBottom, STORM.skyBottom), fog: mix(SUNRISE.fog, STORM.fog),
    fogNear: SUNRISE.fogNear + (STORM.fogNear - SUNRISE.fogNear) * k, fogFar: SUNRISE.fogFar + (STORM.fogFar - SUNRISE.fogFar) * Math.min(1, k * 1.15),
    sun: SUNRISE.sun, sunColor: mix(SUNRISE.sunColor, STORM.sunColor), ambient: mix(SUNRISE.ambient, STORM.ambient),
  };
  return { env, sea: { y: -150 + 110 * k, color: mixRGB(hex("#fff0e6"), hex("#ffd4b8"), 0.3), dark: k } };
}

type Scene = { cam: Camera; env: Env; sea?: Sea; fx?: Fx; build: (out: Tri[], glows: Glow[], lights: PointLight[]) => void; far?: number; sun?: boolean; band?: number };

function scene(t: number): Scene {
  const shot = shotAt(t);
  const u = local(t, shot);
  const W = weather(stormAt(t));
  const wind = windAt(t) / 110;
  const flash = flashAt(t, STRIKES);
  const stormy = (cam: Camera, build: Scene["build"], extra: Partial<Scene> = {}): Scene => ({ cam, env: lightning(W.env, flash), build, fx: { white: flash * 0.18 }, ...extra });
  switch (shot) {
    case "hook": {
      const cam = shotCamera(S("hook", [on(-1.2, 1.2, 1.7), on(-0.8, 2.4, 1.75)], [[10, -55, 300], [10, -52, 300]], [50, 50], lin), t);
      return { cam, env: W.env, sea: W.sea, sun: true, build: (o, g) => { camp(o, g, t, wind); viewers(o, g, t); } };
    }
    case "sea": {
      const cam = shotCamera(S("sea", [[-50, 20, -40], [-44, 26, -34]], [[40, -60, 300], [40, -60, 320]], [50, 52], lin), t);
      return { cam, env: W.env, sea: W.sea, sun: true, far: 400, build: (o, g) => { camp(o, g, t, wind); viewers(o, g, t); } };
    }
    case "alert": {
      const gp = on(1.5, 1.5);
      const cam = shotCamera(S("alert", [on(3.2, 3.6, 1.55), on(3.0, 3.4, 1.55)], [add(gp, [0, 1.35, 0]), add(gp, [0, 1.3, 0])], [44, 40], lin), t);
      const build = (out: Tri[], glows: Glow[]) => {
        camp(out, glows, t, wind);
        const yaw = facing(gp, [8, 0, 10]);
        camper(out, glows, GUIDE, { pos: gp, yaw, handR: [0.12, 1.2, 0.35], handL: [-0.05, 1.18, 0.33], headPitch: 0.45, lod: 2 }, { pack: packColor(5) });
        const phone = poseFn({ pos: gp, yaw })([0.04, 1.22, 0.37]);
        box(out, { pos: phone, yaw, pitch: -0.6, size: [0.07, 0.13, 0.012] }, { color: hex("#1e2630") });
        glows.push({ p: phone, radius: 0.07, color: [200, 225, 255], alpha: 0.35 });
      };
      return { cam, env: W.env, sea: W.sea, sun: true, build };
    }
    case "rise": {
      const cam = shotCamera(S("rise", [on(0, -2, 2.2), on(0, -1, 2.4)], [[0, -40, 400], [0, -20, 400]], [52, 52], lin), t);
      return { cam, env: W.env, sea: W.sea, sun: true, band: smooth(9.6, 12.6, t), build: (o, g) => { camp(o, g, t, wind); viewers(o, g, t); } };
    }
    case "wind": {
      const cam = shotCamera(S("wind", [on(-15, 10, 1.4), on(-14, 9.4, 1.5)], [on(-4, 2, 1.1), on(-4, 2, 1.2)], [50, 48], lin), t);
      return stormy({ ...cam, roll: 0.012 * Math.sin(t * 9) }, (o, g) => { camp(o, g, t, wind); braced(o, g, t, windAt(t)); }, { sea: W.sea });
    }
    case "rain": {
      const cam = shotCamera(S("rain", [on(-1.5, 10, 1.6), on(-2, 9.5, 1.6)], [on(-7, 4.5, 1.2), on(-7, 4.5, 1.2)], [48, 46], lin), t);
      return stormy({ ...cam, roll: 0.015 * Math.sin(t * 11) }, (o, g) => { camp(o, g, t, wind); braced(o, g, t, windAt(t)); });
    }
    case "tent": {
      const cam = shotCamera(S("tent", [on(12, 5, 1.4), on(12.5, 5.5, 1.5)], [on(4, -2, 1.1), on(10, -1, 2.6)], [50, 52]), t);
      return stormy(cam, (o, g) => { camp(o, g, t, wind); braced(o, g, t, windAt(t)); }, { fx: { white: flash * 0.18, zoom: t > flyAt && t < flyAt + 0.25 ? 0.008 : 0 } });
    }
    case "cold":
    case "hypo": {
      const hp = on(-3.6, 1.2);
      const cam = shotCamera(shot === "cold" ? S("cold", [on(-1.6, 3.2, 1.0), on(-1.9, 2.9, 0.95)], [add(hp, [0, 0.7, 0]), add(hp, [0, 0.7, 0])], [44, 40], lin) : S("hypo", [on(-1.9, 2.9, 0.95), on(-2.2, 2.6, 0.9)], [add(hp, [0, 0.75, 0]), add(hp, [0, 0.75, 0])], [40, 36], lin), t);
      const build = (out: Tri[], glows: Glow[]) => {
        camp(out, glows, t, wind);
        const L = { ...shell(HIKERS[1], t) };
        camper(out, glows, L, { pos: hp, yaw: facing(hp, cam.pos), ...HUDDLE, lod: 2 }, { shiver: 1, t });
        if (shot === "hypo") {
          // The guide crouches beside them with a foil blanket.
          const gp = on(-4.6, 2.0);
          camper(out, glows, shell(GUIDE, t), { pos: gp, yaw: facing(gp, hp), drop: 0.5, lean: 0.15, handL: [-0.1, 0.9, 0.55], handR: [0.2, 0.8, 0.5], lod: 2 }, { pack: packColor(5) });
          if (u > 1.8) limb(out, add(hp, [0, 0.76, 0.02]), add(hp, [0, 0.3, 0.02]), 0.24, 0.32, hex("#d8bc5a"), 7);
        }
      };
      return stormy(cam, build);
    }
    case "descend": {
      const k0 = 0.02 + u * 0.035;
      const ahead = trailAt(k0 + 0.07);
      const cam = { pos: add(ahead, [2.5, 1.6, -1]), target: add(trailAt(k0 - 0.02), [0, 1.2, 0]), fov: 50 };
      return stormy(cam, (o, g, l) => line(o, g, t, k0, 1.4, l));
    }
    case "stream": {
      const k0 = 0.24 + u * 0.03;
      const p = trailAt(k0 + 0.03);
      const cam = { pos: add(p, [1.4, 0.9, -0.8]), target: add(trailAt(k0 - 0.005), [0, 0.6, 0]), fov: 48 };
      return stormy(cam, (o, g, l) => { streamOnTrail(o, t, k0 - 0.08, k0 + 0.1); line(o, g, t, k0, 0.9, l); });
    }
    case "bolt": {
      const k0 = 0.4 + u * 0.03;
      const p = trailAt(k0 - 0.05);
      const cam = { pos: add(p, [-1.5, 1.4, -2]), target: on(0, 0, 8), fov: 46 };
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        streamOnTrail(out, t, k0 - 0.06, k0 + 0.06);
        line(out, glows, t, k0, 1.4, lights);
        const a = flashAt(t, [SUMMIT_STRIKE, SUMMIT_STRIKE + 0.7], 0.1);
        if (a > 0.03) bolt(out, glows, [-20, 220, 30], on(0, 2), 9, { alpha: a, width: 0.8 });
      };
      return stormy(cam, build, { env: lightning({ ...W.env, fogFar: 260 }, flash), fx: { white: flash * 0.35, zoom: t > SUMMIT_STRIKE && t < SUMMIT_STRIKE + 0.3 ? 0.012 : 0 }, far: 300 });
    }
    case "forest": {
      const k0 = 0.68 + u * 0.03;
      const p = trailAt(k0 + 0.04);
      const cam = { pos: add(p, [1.6, 1.7, -0.5]), target: add(trailAt(k0 - 0.01), [0, 1.3, 0]), fov: 50 };
      return stormy(cam, (o, g, l) => line(o, g, t, k0, 1.2, l), { env: { ...W.env, fogFar: 60 } });
    }
    case "ranger": {
      // From downhill (the slope climbs fast behind the station), the hikers between us and its door.
      const cam = shotCamera(S("ranger", [on(STATION[0] - 1.5, STATION[2] - 14, 2.0), on(STATION[0] - 1.2, STATION[2] - 12.6, 1.9)], [add(STATION, [0, 1.8, -2]), add(STATION, [0, 1.8, -2])], [50, 50], lin), t);
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        station(out, glows, lights);
        [GUIDE, ...HIKERS].forEach((L, i) => {
          const p = add(STATION, [-4 + i * 1.3, 0, -4.2 - (i % 2) * 0.9]);
          p[1] = H(p[0], p[2]);
          const wrapped = i > 0 ? { ...L, top: hex(i % 2 ? "#8a8a84" : "#6a6e78") } : L;
          camper(out, glows, wrapped, { pos: p, yaw: i === 0 ? 0.2 : facing(p, add(STATION, [0, 0, -14])), ...(i === 1 ? HUDDLE : {}), handR: i === 0 ? [0.25, 1.35, 0.35] : undefined, lod: 2 }, { lamp: i === 0 ? 1 : 0 });
        });
      };
      return { cam, env: RANGER, build };
    }
    case "final":
    default: {
      const cam = shotCamera(S("final", [on(-3, -2, 1.5), on(-2, 3, 1.7)], [[12, -55, 300], [12, -50, 300]], [52, 50], lin), t);
      const calm = weather(0);
      return { cam, env: calm.env, sea: calm.sea, sun: true, build: () => {} };
    }
  }
}

export function summitFrame(t: number): Built {
  const sc = scene(t);
  setView(sc.cam);
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const behind: Glow[] = [];
  const lights: PointLight[] = [];
  const wind = windAt(t) / 110;
  mountain(tris, sc.cam, t, sc.far ?? 260, wind);
  if (sc.sea) cloudFloor(tris, sc.cam, sc.sea, t);
  if (sc.band) cloudMass(tris, [0, -60, 1900 - sc.band * 500], 600, 4, hex("#3a3e48"), { puffs: 14, flat: 0.9, inner: 0.15 * Math.max(0, Math.sin(t * 9)) ** 4, alpha: Math.min(1, sc.band * 1.6) });
  sc.build(tris, glows, lights);
  const r = rainAt(t);
  if (r > 0 && shotAt(t) !== "ranger") rain(tris, sc.cam, t, { amount: r, wind: 0.4 + windAt(t) / 90, speed: 18, color: hex("#c8d0d8") });
  if (stormAt(t) > 0.6 && shotAt(t) !== "final") mist(tris, sc.cam, { x0: -140, z0: -240, x1: 140, z1: 140, spacing: 6, ground: H, color: hex("#9aa0a8"), alpha: 0.1, t: t * 6, seed: 4, height: 1.6 });
  if (sc.sun) {
    const p = add(sc.cam.pos, scale(SUN_DIR, 900));
    behind.push({ p, radius: 40, color: [255, 236, 200], alpha: 0.95 }, { p, radius: 260, color: [255, 160, 90], alpha: 0.28 });
  }
  return { frame: { tris, camera: sc.cam, env: sc.env, glowsFront: glows, glowsBehind: behind, lights }, fx: sc.fx ?? {} };
}

export function summitGrade(t: number): Grade {
  const k = stormAt(t);
  if (k < 0.3) return { bloom: 0.55, contrast: 1.08, saturate: 1.1, brightness: 1.04, tint: "#ffb080", tintAmount: 0.14 };
  if (shotAt(t) === "ranger") return { bloom: 0.5, contrast: 1.1, saturate: 0.95, brightness: 1.08, tint: "#ffc890", tintAmount: 0.1 };
  return { bloom: 0.3, contrast: 1.12, saturate: 0.78, brightness: 1.06, tint: "#7a8aa0", tintAmount: 0.16 };
}

export { track };
