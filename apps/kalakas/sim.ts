// What's on screen at reel time t: the storm from space, then one fixed view of Santa Lucia through the whole story, as
// a time-lapse in which sky, wind, sea, damage and repairs are all functions of t.
import { hex, mixRGB, type Camera, type Env, type Frame, type Glow, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { rng, shake, smooth } from "../../src/kit/lowpoly/world";
import { CALM, ROAD_X, SKIES, emitCloudDeck, emitCoast, emitFlyingDebris, groundH, waterH, type CoastState } from "../typhoon/coast";
import { person, truck, villager } from "../typhoon/models";
import { EARTH_R, FULL, growing, spaceFrame, type SpaceShot } from "./space";
import { PARTS, LANDFALL_T, partAt, track } from "./timeline";

export type Fx = { rain: number; slant: number; flash: number; dim: number };
export type Built = { frame: Frame; fx: Fx };

const NONE: Fx = { rain: 0, slant: 0, flash: 0, dim: 0 };
const TOP = EARTH_R;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** How far west the land sits (units of 10 km) as the storm travels towards it. */
export const landShiftAt = (t: number) => track([[25, 90], [31, 22], [37, 0]], t);

const OVER: V3 = [0, TOP + 275, 88];
const FAR: V3 = [260, TOP + 980, 860];
const IN_EYE: V3 = [-FULL.eye * 0.34, TOP + 2.5, FULL.eye * 0.24];

function spaceShot(t: number): SpaceShot {
  const base = { t, look: FULL, shift: landShiftAt(t) };
  if (t < PARTS.warm.from) {
    // The hook: the finished storm, close enough to fill the frame.
    const k = smooth(0, 4, t);
    return { ...base, pos: mix3([40, TOP + 300, 110], [10, TOP + 210, 70], k), target: [0, TOP, 4], fov: 42, shift: 90 };
  }
  if (t < PARTS.eye.to) {
    // The story of how it forms, all from one slowly rising view.
    const form = track([[8, 0.02], [13, 0.34], [18, 0.74], [22, 1]], t);
    const k = smooth(4, 25, t);
    const heat = track([[4, 0.6], [4.7, 1], [9.5, 1], [13, 0.25], [18, 0]], t);
    const vapour = track([[7.5, 0], [9, 1], [14, 1], [17, 0]], t);
    return { ...base, shift: 90, look: growing(form), pos: [lerp(0, 8, k), TOP + lerp(95, 215, k), lerp(112, 74, k)], target: [0, TOP, lerp(12, 4, k)], fov: 44, heat, vapour };
  }
  if (t < PARTS.size.from) {
    // Out to the whole Earth, the Philippines coming into view as it moves west-northwest.
    const k = smooth(25, 29, t);
    return { ...base, pos: mix3([8, TOP + 215, 74], FAR, k), target: mix3([0, TOP, 4], [40, TOP - 120, 150], k), fov: lerp(44, 36, k) };
  }
  if (t < PARTS.dive.from) {
    const k = smooth(31, 33.2, t);
    return { ...base, pos: mix3(FAR, OVER, k * k), target: mix3([40, TOP - 120, 150], [0, TOP, 2], k), fov: lerp(36, 42, k) };
  }
  const k = smooth(37, 39.9, t);
  const eased = 1 - (1 - k) ** 3;
  return { ...base, pos: mix3(OVER, IN_EYE, eased), target: mix3([0, TOP, 2], [FULL.eye * 0.74, TOP + 2.05, -FULL.eye * 0.52], smooth(0.42, 1, k)), fov: lerp(42, 92, smooth(0.35, 1, k)) };
}

// ── The beach ────────────────────────────────────────────────────────────────────────────────────────

function mixEnv(a: Env, b: Env, k: number): Env {
  const m = (x: RGB, y: RGB) => mixRGB(x, y, k);
  return { skyTop: m(a.skyTop, b.skyTop), skyBottom: m(a.skyBottom, b.skyBottom), fog: m(a.fog, b.fog), fogNear: lerp(a.fogNear, b.fogNear, k), fogFar: lerp(a.fogFar, b.fogFar, k), sun: mixRGB(a.sun, b.sun, k), sunColor: m(a.sunColor, b.sunColor), ambient: m(a.ambient, b.ambient) };
}

const STORM_SKY: Env = { ...SKIES.storm, fogNear: 110, fogFar: 760 };
const SKY_KEYS: [number, Env][] = [[40, SKIES.dawn], [44, SKIES.morning], [49, SKIES.morning], [52, SKIES.gold], [54.5, SKIES.overcast], [56.5, SKIES.orange], [58.5, STORM_SKY], [72, STORM_SKY], [75, SKIES.drizzle], [78.5, SKIES.overcast], [81, SKIES.harsh], [85, SKIES.harsh]];

function skyAt(t: number): Env {
  if (t <= SKY_KEYS[0][0]) return SKY_KEYS[0][1];
  for (let i = 1; i < SKY_KEYS.length; i++) if (t < SKY_KEYS[i][0]) return mixEnv(SKY_KEYS[i - 1][1], SKY_KEYS[i][1], smooth(SKY_KEYS[i - 1][0], SKY_KEYS[i][0], t));
  return SKY_KEYS[SKY_KEYS.length - 1][1];
}

/** The town at reel time t. */
function townAt(t: number): CoastState {
  const surge = track([[LANDFALL_T - 2, 0.2], [LANDFALL_T + 6, 5.2], [71, 5.2], [74, 2.4], [78, 1.3], [82, 0.05]], t);
  const inRidge = t > LANDFALL_T - 3 && t < LANDFALL_T + 7;
  return {
    ...CALM,
    t,
    surge,
    swell: track([[40, 0.28], [54, 0.45], [58, 0.6], [62, 0.72], [71, 0.72], [74, 0.25], [85, 0.2]], t),
    wind: track([[40, 0], [52, 0.15], [56, 0.42], [59, 0.72], [62, 1], [71, 1], [74, 0.2], [85, 0.02]], t),
    damage: track([[59, 0], [61, 0.1], [63.5, 0.26], [66, 0.42], [69, 0.58], [73, 0.8]], t),
    boarded: track([[46, 0], [52, 1]], t),
    rebuild: track([[79.5, 0], [85, 0.88]], t),
    mud: track([[70, 0], [74, 0.85], [85, 0.62]], t),
    flood: track([[58, 0], [62, 0.45], [66, 0.9], [78, 0.9], [82, 0.3]], t),
    ridge: inRidge ? { x: lerp(-210, 150, smooth(LANDFALL_T - 3, LANDFALL_T + 7, t)), amp: lerp(9, 3.4, smooth(LANDFALL_T + 1, LANDFALL_T + 7, t)) } : undefined,
    poleFall: track([[61, 0], [64, 0.5], [68, 0.85], [79, 0.85], [84, 0.3]], t),
    palmFall: track([[61, 0], [65, 0.4], [69, 0.55]], t),
    haul: smooth(41, 47.5, t),
    hauled: t > 47.5,
    debris: track([[71, 0], [74, 0.9], [85, 0.4]], t),
    far: 950,
  };
}

/** The beach camera: the same place the whole time, drifting a few metres. */
const beachCamera = (t: number): Camera => ({ pos: [-122 + (t - 40) * 0.2, 66, 108 - (t - 40) * 0.2], target: [58, 2, -6], fov: 52 });

function evacuees(tris: Tri[], t: number) {
  // Leaving: from the town along the side road to the school on the rise. Coming back a week later.
  const go = smooth(48, 56, t), back = smooth(79, 85, t);
  if (go <= 0 || (go >= 1 && back <= 0)) return;
  for (let i = 0; i < 46; i++) {
    const r = rng(i * 11 + 2);
    const x0 = 56 + r() * 44, z0 = -30 + r() * 110, delay = r() * 0.42, kind = r();
    const k = back > 0 ? 1 - back : smooth(delay, delay + 0.55, go);
    if (k >= 1 && back <= 0) continue;
    // Two legs: to the side road, then up it.
    const leg1 = Math.min(1, k / 0.35), leg2 = Math.max(0, (k - 0.35) / 0.65);
    const x = lerp(x0, ROAD_X, leg1) + lerp(0, 86, leg2), z = lerp(z0, 40 + (i % 4) * 1.1, leg1);
    tris.length;
    person(tris, villager(i + 200, kind < 0.3 ? "child" : kind < 0.65 ? "woman" : "man"), { pos: [x, groundH(x, z), z], yaw: 1.2, walk: 1, phase: t * 8 + i, lod: 0 });
  }
}

function vehiclesOnRoad(tris: Tri[], t: number) {
  // Trucks leave along the main road. Relief trucks arrive a week later.
  for (let i = 0; i < 5; i++) {
    const at = 49 + i * 1.3;
    if (t < at || t > at + 6.5) continue;
    const z = 150 - (t - at) * 62;
    truck(tris, [ROAD_X - 1.7, groundH(ROAD_X, z) + 0.1, z], Math.PI, i % 2 ? hex("#2f6d8f") : hex("#b5563a"));
  }
  for (let i = 0; i < 3; i++) {
    const at = 80.5 + i * 0.9;
    if (t < at) continue;
    const z = Math.max(-180 + i * 12, -150 + i * 12 + 0) + Math.min(170 - i * 16, (t - at) * 70);
    truck(tris, [ROAD_X + 1.7, groundH(ROAD_X, z) + 0.1, z], 0, hex("#2f8f6b"));
  }
}

function rescueBoats(tris: Tri[], S: CoastState, t: number) {
  if (t < 72.5 || t > 79) return;
  for (let i = 0; i < 4; i++) {
    const x = 36 + i * 16 + (t - 72.5) * (i % 2 ? 4 : -3), z = -48 + i * 30 + (t - 72.5) * (i % 2 ? -3 : 4);
    const y = Math.max(waterH(x, z, S), groundH(x, z)) + 0.05;
    const c = hex("#f06a1d");
    tris.push({ a: [x - 3, y, z - 1], b: [x + 3, y + 0.1, z - 1], c: [x + 3, y + 0.1, z + 1], color: c, zBias: -2 }, { a: [x - 3, y, z - 1], b: [x + 3, y + 0.1, z + 1], c: [x - 3, y, z + 1], color: c, zBias: -2 });
    tris.push({ a: [x + 3, y + 0.1, z - 1], b: [x + 3, y + 0.1, z + 1], c: [x + 5, y + 0.15, z], color: mixRGB(c, [255, 255, 255], 0.2), zBias: -2 });
  }
}

function beachFrame(t: number): Built {
  const tris: Tri[] = [];
  const S = townAt(t);
  const rage = smooth(59, 63, t) * (1 - smooth(70, 73, t));
  const camera = shake(beachCamera(t), t, rage * 0.34);
  emitCoast(tris, camera, S);
  const dark = track([[40, 0.08], [48, 0.2], [53, 0.7], [57, 1], [72, 1], [75, 0.8], [79, 0.5], [82, 0.12]], t);
  emitCloudDeck(tris, camera, t * 1.3, dark, S.wind, 420, t < 44 ? hex("#ffd8b4") : t > 55 && t < 58 ? hex("#e0813e") : undefined);
  evacuees(tris, t);
  vehiclesOnRoad(tris, t);
  rescueBoats(tris, S, t);
  emitFlyingDebris(tris, camera, t, rage);
  // Spray thrown up along the wave front.
  if (S.ridge) {
    const r = rng(33);
    for (let i = 0; i < 260; i++) {
      const z = -230 + r() * 460, phase = r(), rx = r(), size = 0.5 + r() * 1.3;
      const k = (t * 1.3 + phase) % 1;
      const x = S.ridge.x + 7 * Math.sin(z * 0.03) - 2 + rx * 7 + k * 15;
      const y = waterH(x, z, S) + 0.3 + k * (2 + S.ridge.amp * 0.8) * (1 - k * 0.4);
      tris.push({ a: [x, y, z], b: [x + size * 2, y + size * 0.3, z + size], c: [x + size, y + size * 1.3, z - size], color: hex("#f6fbfc"), alpha: 0.8 * (1 - k), glow: 0.7, zBias: -4 });
    }
  }
  // The school on the rise stays lit through the storm.
  const glows: Glow[] = [];
  if (t > 55.5 && t < 75) for (let i = 0; i < 6; i++) glows.push({ p: [171, groundH(171, 40) + 2 + (i % 2) * 3, 24 + i * 6.5], radius: 7, color: [255, 200, 120], alpha: 0.5 });
  const rain = track([[53, 0], [58, 0.6], [62, 1], [71, 1], [75, 0.3], [78.5, 0]], t);
  const k = Math.floor(t * 0.9), r = rng(k * 11 + 1), dt = t - (k + r()) / 0.9;
  const flash = rage > 0.2 && dt > 0 && dt < 0.15 ? 0.14 : 0;
  return { frame: { tris, camera, env: skyAt(t), glowsFront: glows }, fx: { ...NONE, rain, slant: 0.2 + S.wind * 0.65, flash } };
}

export function kalakasFrame(t: number): Built {
  const part = partAt(t);
  if (part === "message") return { frame: { tris: [], camera: { pos: [0, 0, 0], target: [0, 0, -1], fov: 40 }, env: SKIES.night }, fx: { ...NONE, dim: 1 } };
  if (part === "cost") {
    // The town as the water left it, slowly dimming under the figures.
    const b = beachFrame(85);
    return { ...b, fx: { ...b.fx, dim: 0.62 + 0.22 * smooth(85, 96.5, t) } };
  }
  if (part === "beach") return beachFrame(t);
  return { frame: spaceFrame(spaceShot(t)), fx: NONE };
}

export const beachCameraAt = beachCamera;
