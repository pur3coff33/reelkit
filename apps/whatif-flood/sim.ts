// What's on screen at reel time t in EP 04: a gravel bar on a mountain river, four campers, a storm far up the valley,
// and the flood that comes down it. The river runs towards −z; the camp sits on the bar at x ≈ 10–16, z ≈ 0.
import { hex, mixRGB, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, hash2, octa, rng, shotCamera, smooth, sphere, type Shot } from "../../src/kit/lowpoly/world";
import { limb } from "../typhoon/models";
import { smoke } from "../../src/kit/whatif/props";
import type { Built, Fx } from "../../src/kit/whatif/Reel";
import type { Grade } from "../../src/kit/whatif/cinema";
import {
  setView, CROUCH, ENV, SIT_LOG, bolt, campfire, camper, cloudMass, domeTent, facing, flashAt, forest, grass, ground, hikerLook, lantern, leafy, lightning, moonGlow, packColor, paintBy, rain, rock, stride, track, water, type GroundSpec,
} from "../../src/kit/whatif/camp";
import { ARRIVE, PEAK, SHOTS, STRIKES, W0, frontZ, levelAt, local, mud, shotAt, type ShotName } from "./timeline";

// ── The valley ───────────────────────────────────────────────────────────────────────────────────────

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** The river's centre line. */
export const cx = (z: number) => 5 * Math.sin(z * 0.013);

/** Ground height. The bar is on the +x side; past it the bank climbs to the forest. Upstream (z > 140) it narrows to a gorge. */
export function H(x: number, z: number) {
  const u = x - cx(z);
  const g = smooth(140, 320, z);
  const bank = 7 - 2 * g;
  const bed = -1.35 + fbm(x * 0.2, z * 0.2, 2, 7) * 0.2;
  const n = fbm(x * 0.018, z * 0.018, 3, 5);
  const hills = 70 * fbm(x * 0.004, z * 0.004, 3, 11) * smooth(120, 400, Math.abs(u));
  const up = Math.max(0, z - 900) * 0.14;
  let land: number, w: number;
  if (u >= 0) {
    const barW = 18 * (1 - g) + 3 * g, top = bank + barW;
    const bar = (0.42 + fbm(x * 0.09, z * 0.09, 2, 3) * 0.35) * (1 - g);
    land = bar + smooth(top, top + 14 - 6 * g, u) * (7.5 + 12 * g) + Math.max(0, u - top - 14) * (0.5 + 1.3 * g) + n * 10 * smooth(top + 8, top + 60, u);
    w = u;
  } else {
    w = -u;
    land = 0.3 + smooth(bank, bank + 11 - 5 * g, w) * (10 + 10 * g) + Math.max(0, w - bank - 11) * (0.65 + 1.3 * g) + n * 10 * smooth(bank + 12, bank + 60, w);
  }
  return lerp(bed, land, smooth(bank - 4, bank + 1, w)) + hills + up;
}
/** The point on the ground at (x, z), lifted by dy. */
const on = (x: number, z: number, dy = 0): V3 => [x, H(x, z) + dy, z];

const NEAR = { x0: -50, z0: -70, x1: 70, z1: 90 };
const GORGE = { x0: -60, z0: 330, x1: 60, z1: 640 };
const MID = { x0: -322, z0: -420, x1: 364, z1: 980 };
const inside = (r: typeof NEAR, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

const GRAVEL = hex("#6c665c"), SAND = hex("#787060"), GRASS = hex("#3d5a30"), ROCK = hex("#5e5a54"), FOREST_FLOOR = hex("#2e4228"), MUD = hex("#4a3e34");
const paintValley = (muddy: boolean) => {
  const hill = paintBy({ flat: FOREST_FLOOR, steep: ROCK, vary: 0.08 });
  return (x: number, z: number, h: number, slope: number, r: number): RGB => {
    const u = x - cx(z);
    if (h < -0.2) return mixRGB(hex("#4a4436"), GRAVEL, r * 0.4);
    if (u > 0 && h < 2.2 && z < 200) {
      const c = mixRGB(GRAVEL, SAND, smooth(0.3, 0.8, fbm(x * 0.15, z * 0.15, 2, 8) + 0.5) * 0.6);
      return muddy ? mixRGB(c, MUD, 0.75) : mixRGB(c, [0, 0, 0], (r - 0.5) * 0.14);
    }
    if (h < 5 && slope < 0.35) return mixRGB(GRASS, FOREST_FLOOR, r * 0.5);
    return hill(x, z, h, slope, r);
  };
};

const nearSpec = (muddy: boolean): GroundSpec => ({ key: muddy ? "flood-near-mud" : "flood-near", ...NEAR, cell: 2, height: H, paint: paintValley(muddy), seed: 4 });
const GORGE_SPEC: GroundSpec = { key: "flood-gorge", ...GORGE, cell: 3, height: H, paint: paintValley(false), seed: 5 };
// The mid and far layers sink a little where a finer one takes over, so the fine one always draws on top.
const MID_SPEC: GroundSpec = {
  key: "flood-mid", ...MID, cell: 14, seed: 6, zBias: 40, paint: paintValley(false),
  height: (x, z) => H(x, z) - 2.5 * (inside(NEAR, x, z, -14) || inside(GORGE, x, z, -14) ? 1 : 0),
  skip: (x, z) => inside(NEAR, x, z, 3) || inside(GORGE, x, z, 4),
};
const FAR_SPEC: GroundSpec = {
  key: "flood-far", x0: -2400, z0: -1800, x1: 2400, z1: 4200, cell: 100, seed: 7, zBias: 300, paint: paintBy({ flat: hex("#2c4026"), steep: hex("#3a4034"), vary: 0.1 }),
  height: (x, z) => H(x, z) - 6 * (inside(MID, x, z, -100) ? 1 : 0),
  skip: (x, z) => inside(MID, x, z, 60),
};

const CLEARINGS: [number, number, number][] = [[31, -6.5, 8], [36, -13, 9], [47, 2.5, 8], [33, -19, 9], [22, -30, 8], [42, 0, 8]];
const treesAt = (x: number, z: number) => {
  const u = x - cx(z), h = H(x, z);
  if (h < 2.5) return 0;
  // The path the campers climb, and the spots the cameras stand on, kept clear.
  if (x > 18 && x < 50 && z > -9 && z < 5) return 0;
  for (const [qx, qz, r] of CLEARINGS) if ((x - qx) ** 2 + (z - qz) ** 2 < r * r) return 0;
  return 0.62 * smooth(2.5, 6, h);
};

function valley(out: Tri[], cam: Camera, muddy: boolean, t: number, far = 900) {
  ground(out, cam, nearSpec(muddy), far);
  ground(out, cam, GORGE_SPEC, far);
  ground(out, cam, MID_SPEC, Math.max(far, 1400));
  ground(out, cam, FAR_SPEC, 6000);
  forest(out, cam, { seed: 3, ...NEAR, spacing: 4.5, density: treesAt, ground: H, kind: "mix", size: [8, 15], far: 160, sway: 0.15, t });
  forest(out, cam, { seed: 9, ...GORGE, spacing: 6, density: treesAt, ground: H, kind: "mix", size: [8, 15], far: 200 });
  forest(out, cam, { seed: 5, x0: -320, z0: -420, x1: 360, z1: 980, spacing: 13, density: (x, z) => (inside(NEAR, x, z) || inside(GORGE, x, z) ? 0 : treesAt(x, z)), ground: H, kind: "pine", size: [12, 20], far });
  // Stones on the bar.
  const r = rng(12);
  for (let k = 0; k < 26; k++) {
    const x = 7 + r() * 16, z = -40 + r() * 80;
    rock(out, on(x, z, -0.1), 0.25 + r() * 0.5, 40 + k);
  }
  rock(out, on(5.2, 1.6, -0.2), 0.7, 3, hex("#6a665e"));
}

// ── The river ────────────────────────────────────────────────────────────────────────────────────────

const CLEAR = hex("#173540"), BROWN = hex("#8e6a42"), FOAM = hex("#e4ddcc");

function riverColor(t: number) {
  return (x: number, z: number, depth: number): RGB => {
    const behind = z - frontZ(t);
    const flooded = t > 9.4 && behind > -3;
    const m = flooded ? 1 : mud(t);
    let c = mixRGB(CLEAR, BROWN, Math.min(1, m));
    if (!flooded) {
      c = mixRGB(c, mixRGB(c, [255, 255, 255], 0.12), smooth(0.4, 0, depth));
      c = mixRGB(c, FOAM, 0.3 * m * smooth(0.06, 0.24, fbm(x * 0.9, (z + t * 3) * 0.2, 2, 4)));
    }
    if (flooded && behind < 5) c = mixRGB(c, FOAM, 0.9 * (1 - smooth(0.5, 5, behind)));
    else if (flooded) {
      // Streaks of foam stretched along the flow, racing downstream.
      const streak = fbm(x * 0.7, (z + t * 7) * 0.12, 2, 3);
      c = mixRGB(c, FOAM, 0.55 * smooth(0.04, 0.22, streak));
    }
    return mixRGB(c, [0, 0, 0], (hash2(Math.floor(x * 2), Math.floor(z * 2), 1) - 0.5) * 0.1);
  };
}

function surface(t: number) {
  return (x: number, z: number) => {
    const base = levelAt(z, t);
    const rough = smooth(W0 + 0.6, W0 + 1.6, base);
    return base + 0.035 * Math.sin(x * 1.3 + z * 0.7 + t * 3.1) + 0.03 * Math.sin(z * 1.1 + t * 4.2) + rough * 0.4 * (fbm(x * 0.25, z * 0.18 + t * 2.2, 2, 5) + 0.1 * Math.sin(z * 0.9 + t * 9));
  };
}

function river(out: Tri[], cam: Camera, t: number, area: "camp" | "gorge" | "valley") {
  const spec = area === "camp" ? { key: "w-camp", x0: -24, z0: -64, x1: 46, z1: 84, cell: 1.6 } : area === "gorge" ? { key: "w-gorge", x0: -26, z0: 350, x1: 26, z1: 630, cell: 2.4 } : { key: "w-valley", x0: -40, z0: -60, x1: 48, z1: 900, cell: 6 };
  water(out, cam, { ...spec, ground: H, level: surface(t), color: riverColor(t), alpha: 0.95, mirror: 0.85 });
}

/** Logs and branches riding the flood: with the front as it comes, then streaming past. */
function debris(out: Tri[], t: number, zMin: number, zMax: number) {
  if (t < 9.4) return;
  const r = rng(21);
  const lvl = surface(t);
  for (let i = 0; i < 46; i++) {
    const o = 2 + r() * 120, u = -6 + r() * 22, len = 1.5 + r() * 4, yaw = r() * 6, rad = 0.12 + r() * 0.16, spin = (r() - 0.5) * 2;
    const riding = frontZ(t) + o;
    const stream = 90 - ((t * 6.5 + o * 1.7) % 170);
    const z = t < ARRIVE + 0.6 ? riding : Math.max(riding, stream);
    if (z < zMin || z > zMax) continue;
    const x = cx(z) + u;
    const y = lvl(x, z);
    if (y < H(x, z) + 0.15) continue;
    const a = yaw + t * spin * 0.6;
    const d: V3 = [Math.cos(a) * len * 0.5, 0, Math.sin(a) * len * 0.5];
    limb(out, [x - d[0], y + 0.05, z - d[2]], [x + d[0], y + 0.1 * Math.sin(t * 3 + i), z + d[2]], rad, rad * 0.8, i % 4 ? hex("#5a4430") : hex("#7a6a52"), 4);
  }
}

/** White water churning along the front. */
function churn(out: Tri[], t: number) {
  const zf = frontZ(t);
  if (t < 9.4 || zf < -70) return;
  const lvl = surface(t);
  for (let k = 0; k < 40; k++) {
    const u = -10 + (k / 39) * 34;
    const z = zf + 1 + hash2(k, Math.floor(t * 8), 3) * 3;
    const x = cx(z) + u;
    const y = lvl(x, z);
    if (y < H(x, z) + 0.2) continue;
    const s = 0.7 + 0.5 * hash2(k, 2, 2);
    sphere(out, 0, { pos: [x, y + 0.15 + 0.2 * Math.sin(t * 9 + k), z], yaw: t * 2 + k }, (d) => s * (d[1] < 0 ? 0.35 : 0.6 + 0.15 * Math.sin(k + d[0] * 3)), () => ({ color: FOAM, alpha: 0.85 }));
  }
}

/** Twigs and leaves on the surface, close to the camera, flowing downstream. */
function twigs(out: Tri[], t: number, c: V3, n: number) {
  const r = rng(33);
  const lvl = surface(t);
  for (let i = 0; i < n; i++) {
    const u = (r() - 0.5) * 6, o = r() * 30, sp = 1.8 + r() * 1.2;
    const z = c[2] + 15 - ((t * sp + o) % 30);
    const x = c[0] + u;
    const y = lvl(x, z);
    if (y < H(x, z) + 0.05) continue;
    const a = r() * 6 + t;
    if (i % 3) limb(out, [x, y + 0.02, z], [x + Math.cos(a) * 0.5, y + 0.03, z + Math.sin(a) * 0.5], 0.025, 0.015, hex("#5a4632"), 3);
    else octa(out, { pos: [x, y + 0.02, z], yaw: a, size: [0.09, 0.01, 0.05] }, { color: hex("#4a6a2a") });
  }
}

// ── The camp ─────────────────────────────────────────────────────────────────────────────────────────

const FIRE_AT = on(11.5, 2);
type TentSpot = { p: [number, number]; yaw: number; color: RGB };
const TENTS: TentSpot[] = [
  { p: [12.5, -2.6], yaw: 0, color: hex("#e2672e") },
  { p: [15.8, 2.8], yaw: -Math.PI / 2, color: hex("#2e6fb4") },
  { p: [10.4, 6.6], yaw: Math.PI, color: hex("#e0c03a") },
];
/** When the front reaches z. */
const hitAt = (z: number) => (z >= 0 ? 12 + ((450 - z) / 450) * (ARRIVE - 12) : ARRIVE + (-z / 140) * 4);
const CLING_TREE = on(18.6, -7.2);
/** The orange tent ends up wrapped round the tree's upstream side. */
const WRAPPED: V3 = [18.3, H(18.3, -6) + 0.1, -6.1];

function camp(out: Tri[], glows: Glow[], lights: PointLight[], t: number) {
  const lvl = surface(t);
  const fireOut = smooth(hitAt(FIRE_AT[2]) - 0.08, hitAt(FIRE_AT[2]) + 0.1, t);
  campfire(out, glows, lights, FIRE_AT, t, { strength: 1 - fireOut, seed: 2 });
  if (fireOut > 0 && t < hitAt(FIRE_AT[2]) + 2.5) smoke(out, [FIRE_AT[0], lvl(FIRE_AT[0], FIRE_AT[2]) + 0.3, FIRE_AT[2]], t, 1.4 * (1 - smooth(hitAt(2) + 0.5, hitAt(2) + 2.5, t)), 4, 2.2);
  // Log seats.
  for (const [x, z, yaw] of [[9.8, 1.2, 0.3], [13.2, 2.9, 1.2], [11.6, 3.8, -0.2]] as const) {
    const p = on(x, z, 0.2);
    if (t < hitAt(z) + 0.3) limb(out, [p[0] - Math.cos(yaw) * 0.7, p[1], p[2] - Math.sin(yaw) * 0.7], [p[0] + Math.cos(yaw) * 0.7, p[1], p[2] + Math.sin(yaw) * 0.7], 0.2, 0.2, hex("#5c4632"), 6);
  }
  TENTS.forEach((s, i) => {
    const [x, z] = s.p;
    const th = hitAt(z) + 0.05 * i;
    if (t < th) {
      domeTent(out, glows, on(x, z), s.yaw, { color: s.color, lit: i === 0 ? 0.6 : 0.25, t, flap: 0.1 });
      return;
    }
    const age = t - th;
    if (i === 0 && age > 0.8) return; // Wrapped round the tree from here on: drawn by `wrapped`.
    const d = 9 * age ** 1.25;
    const p: V3 = [x + d * 0.35 + (i === 0 ? (WRAPPED[0] - x) * smooth(0, 0.8, age) : 0), 0, z - d];
    if (p[2] < -66) return;
    p[1] = lvl(p[0], p[2]) - 0.35;
    domeTent(out, glows, p, s.yaw + age * 1.3, { color: s.color, collapse: 0.6, roll: Math.sin(age * 3 + i) * 0.6, pitch: age * 0.8, t, flap: 0.5 });
  });
  if (t >= hitAt(TENTS[0].p[1]) + 0.8) wrapped(out, glows, t);
  // The lantern at the orange tent's door, then floating off.
  const lz = TENTS[0].p[1] + 1.1;
  const lt = hitAt(lz);
  if (t < lt) lantern(out, glows, lights, on(TENTS[0].p[0] + 0.6, lz, 0.6), 1);
  else {
    const a = t - lt, z = lz - 6 * a;
    if (z > -64) lantern(out, glows, lights, [TENTS[0].p[0] + 1 + a, lvl(TENTS[0].p[0] + 1 + a, z) + 0.12, z], Math.max(0, 1 - a / 4));
  }
}

function wrapped(out: Tri[], glows: Glow[], t: number) {
  domeTent(out, glows, WRAPPED, 0.4, { color: hex("#c85a2a"), collapse: 0.85, roll: 0.5, pitch: -0.6, t, flap: t < 40 ? 0.6 : 0 });
}

// ── The campers ──────────────────────────────────────────────────────────────────────────────────────

const A = hikerLook(1, "man", hex("#d8462c")), B = hikerLook(2, "woman", hex("#2e8fb4")), C = hikerLook(3, "man", hex("#f0b43a")), D = hikerLook(4, "woman", hex("#3f8f5a"));
const SEATS: [number, number][] = [[9.8, 1.2], [13.2, 2.9], [11.6, 3.8], [10.3, 3.4]];
const HIGH: [number, number][] = [[41.5, -1.6], [42.6, 0.4]];
const UP_PATH: [number, number][] = [[12, 1], [18, 0], [26, -1], [34, -1.5], [41.5, -1]];

function along(path: [number, number][], k: number): [number, number] {
  const f = Math.min(path.length - 1.0001, Math.max(0, k * (path.length - 1)));
  const i = Math.floor(f), u = f - i;
  return [path[i][0] + (path[i + 1][0] - path[i][0]) * u, path[i][1] + (path[i + 1][1] - path[i][1]) * u];
}

function campers(out: Tri[], glows: Glow[], t: number, lights: PointLight[] = []) {
  const lamps = t > 17.5 ? 1 : 0;
  const lvl = surface(t);
  // A and B: at the fire, then up the bank to the high ground, and there to the end.
  [A, B].forEach((L, k) => {
    const seat = SEATS[k];
    if (t < 21.2) {
      const p = on(seat[0], seat[1]);
      const look = t > 19.2 ? { headYaw: 0.7 * (k ? -1 : 1) } : {};
      camper(out, glows, L, { pos: p, yaw: facing(p, FIRE_AT), ...SIT_LOG, ...look, lod: 2 }, { lamp: lamps });
      return;
    }
    const run = smooth(21.2, 27.2 + k * 0.5, t);
    const path: [number, number][] = [seat, ...UP_PATH.slice(1, -1), HIGH[k]];
    const [x, z] = along(path, run);
    const [nx, nz] = along(path, Math.min(1, run + 0.02));
    const p = on(x, z);
    if (run < 1) camper(out, glows, L, { pos: p, yaw: facing(p, [nx, 0, nz]), ...stride(t, 5, k), lod: 2 }, { pack: k ? undefined : packColor(1), lamp: 1 });
    else {
      const wave = t > 30 && t < 40 && k === 1 ? 1 : 0;
      camper(out, glows, L, { pos: p, yaw: facing(p, CLING_TREE) + (k ? 0.1 : -0.1), headPitch: 0.25, handR: wave ? [0.25, 1.6 + 0.1 * Math.sin(t * 9), 0.2] : undefined, lod: 2 }, { lamp: t < 40.5 ? 1 : 0 });
    }
  });
  // C: down at the water's edge as it rises, then up and staring upstream; C and D go back to the tent.
  const door = on(TENTS[0].p[0], TENTS[0].p[1] + 1.15);
  [C, D].forEach((L, k) => {
    const seat = SEATS[2 + k];
    const th = hitAt(door[2]);
    let p: V3, yaw: number, extra = {};
    if (t < th) {
      if (k === 0 && t >= 12 && t < 18) {
        p = on(6.7, 0.8);
        yaw = -Math.PI / 2 + 0.25;
        extra = { ...CROUCH, headPitch: 0.35 };
      } else if (k === 0 && t >= 18 && t < 21.3) {
        p = on(7.6, 0.4);
        yaw = 0.15;
        extra = { headPitch: -0.05, headYaw: 0.1 * Math.sin(t * 2) };
      } else if (t < 21.6) {
        p = on(seat[0], seat[1]);
        yaw = facing(p, FIRE_AT);
        extra = { ...SIT_LOG, headYaw: t > 19.2 ? -0.8 : 0 };
      } else {
        const from: [number, number] = k === 0 ? [7.6, 0.4] : seat;
        const go = smooth(21.6, 23.6, t);
        const x = from[0] + (door[0] + (k ? 0.7 : -0.6) - from[0]) * go, z = from[1] + (door[2] - from[1]) * go;
        p = on(x, z);
        yaw = go < 1 ? facing(p, door) : Math.PI;
        extra = go < 1 ? stride(t, 3, k) : { ...CROUCH };
      }
      camper(out, glows, L, { pos: p, yaw, ...extra, lod: 2 }, { lamp: k === 0 && t > 12 ? 1 : lamps });
      if (k === 0 && t >= 12 && t < 18) {
        // A torch on the water: the brown shows in its pool of light.
        const hand = on(6.2, 0.9, 0.55);
        glows.push({ p: hand, radius: 0.15, color: [255, 250, 230], alpha: 0.9 }, { p: [4.8, lvl(4.8, 1.4) + 0.05, 1.4], radius: 1.1, color: [230, 240, 255], alpha: 0.22 });
        lights.push({ p: [5.0, lvl(5, 1.4) + 1.2, 1.4], color: [255, 246, 228], intensity: 2.4, range: 5 });
      }
      return;
    }
    // Swept, under, then hanging on to the tree.
    if (t < th + 1.1) return;
    const side = k ? 1 : -1;
    const base: V3 = [CLING_TREE[0] - 0.55, 0, CLING_TREE[2] + 0.35 * side];
    const level = lvl(base[0], base[2]);
    const standY = Math.max(H(base[0], base[2]), level - 1.45);
    const pp: V3 = [base[0], standY, base[2]];
    const sway = 0.06 * Math.sin(t * 2.2 + k);
    camper(out, glows, L, { pos: pp, yaw: Math.PI / 2 + side * 0.35, lean: 0.12 + sway, handL: [-0.12 * side + 0.05, 1.45, 0.42], handR: [0.12 + 0.05 * side, 1.25, 0.45], headPitch: -0.1, headYaw: -side * 0.5, lod: 2 }, { lamp: t < 41 ? 1 : 0, shiver: t > 40 ? 0.7 : 0.3, t });
  });
}

/** The rescue at dawn: three in vests on the bank, a rope to the tree, one wading out. */
function rescuers(out: Tri[], glows: Glow[], t: number) {
  const u = local(t, "rescue");
  const vest = hex("#ff7a1a"), helmet = hex("#e83a2a");
  const R = [0, 1, 2].map((i) => ({ ...hikerLook(30 + i, i === 1 ? "woman" : "man", hex("#2a3a52")), vest, hardhat: helmet, cap: undefined }));
  const anchor = on(28.5, -9.4, 1);
  const spots: [number, number][] = [[28.5, -9.4], [29.6, -8.2]];
  spots.forEach(([x, z], i) => {
    const p = on(x, z);
    camper(out, glows, R[i], { pos: p, yaw: facing(p, CLING_TREE), lean: 0.12, handL: [-0.1, 1.0, 0.45], handR: [0.1, 1.05, 0.5], lod: 2 });
  });
  const wade = Math.min(1, u / 4);
  const wx = 26 + (CLING_TREE[0] + 1.1 - 26) * wade, wz = -9 + (CLING_TREE[2] - 0.8 + 9) * wade;
  const lvl = surface(t);
  const wp: V3 = [wx, Math.max(H(wx, wz), lvl(wx, wz) - 1.05), wz];
  camper(out, glows, R[2], { pos: wp, yaw: facing(wp, CLING_TREE), ...stride(t, 0.8, 2), handL: [-0.1, 1.2, 0.4], handR: [0.1, 1.2, 0.4], lod: 2 });
  limb(out, anchor, [wp[0], wp[1] + 1.2, wp[2]], 0.02, 0.02, hex("#f0d020"), 3);
  limb(out, [wp[0], wp[1] + 1.2, wp[2]], [CLING_TREE[0], CLING_TREE[1] + 1.4, CLING_TREE[2]], 0.02, 0.02, hex("#f0d020"), 3);
}

/** Mud and wreckage left on the bar after the water drops. */
function aftermath(out: Tri[], glows: Glow[]) {
  const r = rng(51);
  for (let k = 0; k < 22; k++) {
    const x = 8 + r() * 16, z = -50 + r() * 90;
    const p = on(x, z, 0.12);
    const a = r() * 6, len = 2 + r() * 5;
    limb(out, [p[0] - Math.cos(a) * len * 0.5, p[1], p[2] - Math.sin(a) * len * 0.5], [p[0] + Math.cos(a) * len * 0.5, p[1] + 0.15, p[2] + Math.sin(a) * len * 0.5], 0.15 + r() * 0.15, 0.12, hex("#5a4632"), 5);
  }
  // A blue tent snagged on rocks downstream, a cooler, a pack.
  domeTent(out, glows, on(20, -46, 0.1), 2.1, { color: hex("#2e6fb4"), collapse: 0.9, roll: 0.3 });
  octa(out, { pos: on(14, -18, 0.2), yaw: 0.6, size: [0.35, 0.25, 0.25] }, { color: hex("#e8e4d8") });
  octa(out, { pos: on(16.5, -24, 0.18), yaw: 1.6, size: [0.25, 0.2, 0.35] }, { color: packColor(2) });
}

// ── The storm up the valley ──────────────────────────────────────────────────────────────────────────

const STORM: V3 = [-30, 600, 1500];

function storm(out: Tri[], glows: Glow[], t: number) {
  // Lightning flickering inside it all the time, and the big strikes on top.
  const k = Math.max(flashAt(t, STRIKES), 0.18 + 0.22 * Math.max(0, Math.sin(t * 23) * Math.sin(t * 7.3 + 1)));
  cloudMass(out, STORM, 380, 8, hex("#6a7080"), { inner: k * 0.8, puffs: 12, flat: 0.85, t });
  cloudMass(out, [STORM[0] + 380, STORM[1] - 40, STORM[2] + 220], 280, 9, hex("#505664"), { inner: k * 0.55, puffs: 8, flat: 0.85, t });
  cloudMass(out, [STORM[0] - 360, STORM[1] - 30, STORM[2] + 160], 260, 10, hex("#4a505e"), { inner: k * 0.5, puffs: 7, flat: 0.85, t });
  // Flickers lighting patches of it from inside.
  for (let i = 0; i < 6; i++) {
    const f = Math.max(0, Math.sin(t * (13 + i * 3.1) + i * 2) * Math.sin(t * (4.1 + i) + i)) ** 2 + flashAt(t, STRIKES) * 0.6;
    const p: V3 = [STORM[0] - 420 + ((i * 173) % 840), STORM[1] + 40 + ((i * 97) % 160), STORM[2] - 120 + ((i * 61) % 200)];
    glows.push({ p, radius: 300, color: [190, 180, 255], alpha: 0.4 * Math.min(1, f) }, { p, radius: 90, color: [235, 235, 255], alpha: 0.5 * Math.min(1, f) });
  }
  // Grey shafts of rain hanging under it.
  for (let i = 0; i < 6; i++) {
    const x = STORM[0] - 300 + i * 120, z = STORM[2] + (i % 2) * 80;
    const top = STORM[1] - 120, g = H(x, z);
    out.push({ a: [x - 70, top, z], b: [x + 70, top, z], c: [x + 90, g, z + 30], color: hex("#3e4450"), alpha: 0.32 }, { a: [x - 70, top, z], b: [x + 90, g, z + 30], c: [x - 50, g, z + 30], color: hex("#3e4450"), alpha: 0.32 });
  }
  STRIKES.forEach((s, i) => {
    const a = flashAt(t, [s], 0.08);
    if (a < 0.05) return;
    const x = STORM[0] - 260 + i * 130, z = STORM[2] - 60 + i * 40;
    bolt(out, glows, [x, STORM[1] - 140, z], [x + 60, H(x + 60, z), z], 70 + i, { alpha: a, width: 2.6 });
  });
}

// ── Shots ────────────────────────────────────────────────────────────────────────────────────────────

const S = (name: ShotName, pos: [V3, V3], target: [V3, V3], fov: [number, number] = [50, 50], ease?: (x: number) => number): Shot[] => [{ from: SHOTS[name].from, to: SHOTS[name].to, pos, target, fov, ease }];
const lin = (x: number) => x;

type Scene = { cam: Camera; env: Env; fx?: Fx; muddy?: boolean; river: "camp" | "gorge" | "valley"; storm?: boolean; rain?: number; after?: boolean; rescue?: boolean; twigs?: V3; far?: number };

const flashEnv = (env: Env, t: number, k = 1) => lightning(env, flashAt(t, STRIKES) * k);
const NIGHT: Env = { ...ENV.night, fogNear: 40, fogFar: 700, ambient: [40, 46, 70] };
const DAWN: Env = { ...ENV.dawn, fogFar: 900 };

function scene(t: number): Scene {
  const shot = shotAt(t);
  switch (shot) {
    case "hook":
      return { cam: shotCamera(S("hook", [[-1.5, 1.0, -9], [0, 0.95, -6.8]], [[12, 2.4, 1.5], [12, 2.3, 1.6]], [50, 48], lin), t), env: NIGHT, river: "camp" };
    case "camp":
      return { cam: shotCamera(S("camp", [[-14, 12, -24], [-11, 13.5, -21]], [[12, 0, 1.5], [12, 0.4, 2]], [50, 50], lin), t), env: NIGHT, river: "camp" };
    case "upstream": {
      const cam = shotCamera(S("upstream", [[6, 4, -14], [4, 70, -70]], [[8, 3, 30], [0, 330, 1500]], [50, 56]), t);
      return { cam, env: flashEnv({ ...NIGHT, fogNear: 400, fogFar: 3600, stars: 0.5 }, t, 0.5), river: "valley", storm: true, far: 3000, fx: { white: flashAt(t, STRIKES) * 0.12 } };
    }
    case "gorge": {
      const z0 = 432;
      const p = on(cx(z0) + 9.5, z0, 3.2);
      const cam = shotCamera(S("gorge", [p, [p[0] + 0.4, p[1] + 0.6, p[2] - 4]], [[cx(500) - 1, 0.6, 500], [cx(470), 0.6, 470]], [50, 50], lin), t);
      return { cam, env: flashEnv({ ...ENV.stormNight, fog: hex("#1a2028"), fogFar: 240, ambient: [70, 76, 94] }, t, 1.2), river: "gorge", rain: 0.85, fx: { white: flashAt(t, STRIKES) * 0.2, zoom: frontZ(t) < z0 + 30 && frontZ(t) > z0 - 10 ? 0.006 : 0 } };
    }
    case "rise": {
      const p = on(10.5, -3.8, 1.5);
      return { cam: shotCamera(S("rise", [p, [p[0] - 0.3, p[1] - 0.1, p[2] + 0.4]], [[5.5, 0, 1.2], [5.4, -0.05, 1.3]], [46, 44], lin), t), env: NIGHT, river: "camp", twigs: [4, 0, 2] };
    }
    case "muddy": {
      const p = on(6.6, -2.2, 0.6);
      return { cam: shotCamera(S("muddy", [p, [p[0] + 0.1, p[1] + 0.05, p[2] - 0.8]], [[3.6, -0.3, 7], [3.6, -0.3, 6]], [46, 46], lin), t), env: NIGHT, river: "camp", twigs: [3.4, 0, 3] };
    }
    case "roar": {
      const p = on(8.3, -4.6, 1.65);
      const cam = shotCamera(S("roar", [p, [p[0] + 0.1, p[1] + 0.05, p[2] - 0.5]], [[5, 3.5, 60], [5, 3.6, 60]], [48, 44], lin), t);
      return { cam: { ...cam, roll: 0.01 * Math.sin(t * 3) }, env: flashEnv(NIGHT, t, 0.9), river: "camp", fx: { white: flashAt(t, STRIKES) * 0.1 } };
    }
    case "run": {
      const p = on(31, -6.5, 2.4);
      return { cam: shotCamera(S("run", [p, [p[0] - 0.8, p[1] - 0.2, p[2] + 0.4]], [[14, 0.8, 2], [16, 1, 1.5]], [50, 48], lin), t), env: NIGHT, river: "camp" };
    }
    case "wall": {
      const p = on(36, -13, 2.5);
      const hit = t > ARRIVE - 0.1 && t < ARRIVE + 0.6;
      const cam = shotCamera(S("wall", [p, [p[0] - 0.6, p[1] + 0.3, p[2] + 0.4]], [[10, 0.4, 22], [12, 0.4, 2]], [50, 52]), t);
      return { cam, env: NIGHT, river: "camp", fx: { zoom: hit ? 0.012 : 0, white: t > ARRIVE - 0.06 && t < ARRIVE + 0.1 ? 0.3 : 0 } };
    }
    case "sweep":
      return { cam: shotCamera(S("sweep", [[-2, 16, -34], [-1, 14, -30]], [[13, 0.5, -4], [14, 0.5, -6]], [50, 50], lin), t), env: NIGHT, river: "camp" };
    case "cling":
      return { cam: shotCamera(S("cling", [[15.0, 2.5, -10.9], [15.3, 2.45, -10.5]], [[18.1, 2.0, -7.2], [18.1, 2.0, -7.2]], [46, 44], lin), t), env: NIGHT, river: "camp" };
    case "ridge": {
      const p = on(47, 2.5, 1.75);
      return { cam: shotCamera(S("ridge", [p, [p[0] + 0.3, p[1] + 0.2, p[2] + 0.6]], [[19, 1.2, -7.2], [19, 1.1, -7.2]], [50, 46], lin), t), env: NIGHT, river: "camp" };
    }
    case "rescue": {
      const p = on(33, -19, 3.2);
      return { cam: shotCamera(S("rescue", [p, [p[0] - 0.8, p[1] - 0.2, p[2] + 1.2]], [[20.5, 1.4, -7.4], [20, 1.4, -7.2]], [48, 46], lin), t), env: DAWN, river: "camp", after: true, rescue: true, muddy: true };
    }
    case "after": {
      const p = on(22, -30, 2.4);
      return { cam: shotCamera(S("after", [p, [p[0] - 0.5, p[1] + 0.6, p[2] + 2]], [[10, 9, 30], [10, 12, 30]], [52, 52], lin), t), env: DAWN, river: "camp", after: true, muddy: true };
    }
    case "final":
    default:
      return { cam: shotCamera(S("final", [on(8, -32, 2.2), on(9, -27, 2.4)], [[17, 7, 4], [17, 7.5, 4]], [50, 50], lin), t), env: DAWN, river: "camp", after: true, muddy: true };
  }
}

export function floodFrame(t: number): Built {
  const sc = scene(t);
  setView(sc.cam);
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const behind: Glow[] = [];
  const lights: PointLight[] = [];
  valley(tris, sc.cam, !!sc.muddy, t, sc.far ?? 900);
  river(tris, sc.cam, t, sc.river);
  if (sc.river !== "valley") {
    debris(tris, t, sc.river === "gorge" ? 340 : -66, sc.river === "gorge" ? 640 : 86);
    churn(tris, t);
  }
  if (sc.river === "camp") {
    if (!sc.after) {
      camp(tris, glows, lights, t);
      campers(tris, glows, t, lights);
    } else {
      aftermath(tris, glows);
      wrapped(tris, glows, t);
      campers(tris, glows, t);
    }
    leafy(tris, CLING_TREE, 9, hex("#2f5a2c"), 7, 1);
    if (sc.rescue) rescuers(tris, glows, t);
  }
  if (sc.twigs) twigs(tris, t, sc.twigs, mud(t) > 0.2 ? 60 : 8);
  if (sc.storm) storm(tris, glows, t);
  if (sc.rain) rain(tris, sc.cam, t, { amount: sc.rain, wind: 0.25 });
  if (t < SHOTS.rescue.from) behind.push(...moonGlow(sc.cam));
  return { frame: { tris, camera: sc.cam, env: sc.env, glowsFront: glows, glowsBehind: behind, lights }, fx: sc.fx ?? {} };
}

export function floodGrade(t: number): Grade {
  const shot = shotAt(t);
  if (shot === "rescue" || shot === "after" || shot === "final") return { bloom: 0.4, contrast: 1.08, saturate: 1.08, brightness: 1.14, tint: "#ffc890", tintAmount: 0.14 };
  if (shot === "gorge") return { bloom: 0.5, contrast: 1.16, saturate: 0.9, brightness: 1.15, tint: "#6a7aa0", tintAmount: 0.14 };
  return { bloom: 0.62, contrast: 1.12, saturate: 1.05, brightness: 1.14, tint: "#4a6ab0", tintAmount: 0.12 };
}

export { PEAK };
