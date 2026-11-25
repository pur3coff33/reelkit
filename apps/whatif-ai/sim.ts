// What's on screen at reel time t in EP 01: an invented city and the rooms inside it, as machines take over the work,
// then the same city ten years on. Every frame is built from t alone.
import { hex, mixRGB, norm, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, octa, poseFn, rng, shotCamera, smooth, type Shot } from "../../src/kit/lowpoly/world";
import { person, villager, broadTree, type Look } from "../typhoon/models";
import { drawCity, planCity, extent, type CityLook, type CityExtras, type TrafficOpts, type VehicleKind } from "../../src/kit/whatif/city";
import { handLight } from "../../src/kit/whatif/props";
import type { Built, Fx } from "../../src/kit/whatif/Reel";
import type { Grade } from "../../src/kit/whatif/cinema";
import { CYAN, ORANGE, ROBOT, WHITE, conveyor, desk, drone, floorBot, kiosk, pod, rider, robot, robotArm, room, shelves, terminal, worker } from "./props";
import { SHOTS, local, shotAt, type ShotName } from "./timeline";

// ── The city, now and ten years on ───────────────────────────────────────────────────────────────────

const PITCH = 48;
const SETS = { kitchen: [1, -2], jobs: [2, 1], shop: [-2, 2], park: [0, 3], family: [-6, 5] } as const;
const at = (k: keyof typeof SETS): [number, number] => [SETS[k][0] * PITCH, SETS[k][1] * PITCH];

const PLAN = planCity({
  seed: 101,
  n: 7,
  pitch: PITCH,
  road: 12,
  core: 160,
  peak: 165,
  houseRing: 250,
  palette: ["#c7c9cc", "#a9b4bd", "#8f9ba6", "#d8d2c4", "#7b8a99", "#b8b0a0", "#e2ddd3"].map(hex),
  housePalette: ["#e8d9b0", "#b9d3c4", "#e3b9a4", "#cfd8e0", "#efe6d6"].map(hex),
  houseRoofs: ["#8d979c", "#9a4a32", "#3e6c8f", "#7a8288"].map(hex),
  skip: (i, j) => Object.values(SETS).some(([a, b]) => a === i && b === j),
});
const E = extent(PLAN);
/** Ten years on the city has been rebuilt: towers packed west of a wall, and east of it, the district left behind. */
const WALL_X = 72;
const inSlum = (i: number, j: number) => i >= 2 && Math.abs(j) <= 2;
const PLAN_FUTURE = planCity({
  seed: 103,
  n: 7,
  pitch: PITCH,
  road: 12,
  core: 150,
  peak: 190,
  houseRing: 300,
  centre: [-40, 0],
  palette: ["#c7c9cc", "#a9b4bd", "#8f9ba6", "#d8d2c4", "#7b8a99", "#e2ddd3"].map(hex),
  housePalette: ["#e8e4dc", "#d8e4e8"].map(hex),
  skip: (i, j) => inSlum(i, j) || Object.values(SETS).some(([a, b]) => a === i && b === j),
});
const SLUM = planCity({ seed: 5, n: 4, pitch: 26, road: 5, houseRing: 0, offset: [WALL_X + 118, 0], palette: [hex("#8a7f6e")], housePalette: ["#9a8c74", "#7f8a86", "#a08a6a", "#6f7a80", "#8c7b6b"].map(hex), houseRoofs: ["#7a4a32", "#6d7378", "#8a5a3a", "#5a6066"].map(hex) });

/** The automated city: white towers trimmed in light. */
const future: CityLook["restyle"] = (b) => (b.kind === "house" ? undefined : { color: mixRGB(hex("#eef2f4"), b.color, 0.25), glass: hex("#4a8ab8"), trim: CYAN, trimGlow: 1 });

// ── Light ────────────────────────────────────────────────────────────────────────────────────────────

const SUN = norm([0.5, 0.62, 0.42]);
const DAY: Env = { skyTop: hex("#5e9ad0"), skyBottom: hex("#f0dfc2"), fog: hex("#e4d8c2"), fogNear: 120, fogFar: 1250, sun: SUN, sunColor: [255, 232, 196], ambient: [112, 120, 140] };
const FUTURE: Env = { skyTop: hex("#3f86c8"), skyBottom: hex("#d6eef2"), fog: hex("#cfe4ea"), fogNear: 140, fogFar: 1350, sun: SUN, sunColor: [255, 244, 226], ambient: [120, 132, 150] };
const DUSK: Env = { skyTop: hex("#1f2a52"), skyBottom: hex("#f08a5a"), fog: hex("#8a6070"), fogNear: 160, fogFar: 1400, sun: norm([-0.2, 0.16, -0.95]), sunColor: [255, 150, 100], ambient: [70, 66, 96], stars: 0.15 };
const ROOM: Env = { skyTop: hex("#9fb8c8"), skyBottom: hex("#e8eef0"), fog: hex("#d8dde0"), fogNear: 60, fogFar: 400, sun: norm([0.3, 0.9, 0.3]), sunColor: [200, 200, 196], ambient: [150, 152, 160] };
const DIM: Env = { ...ROOM, sunColor: [70, 76, 92], ambient: [52, 58, 74], fog: hex("#1a2028"), fogNear: 30, fogFar: 200 };
const DARK: Env = { skyTop: hex("#02040a"), skyBottom: hex("#0a1018"), fog: hex("#05080e"), fogNear: 25, fogFar: 140, sun: norm([0.3, 0.9, 0.3]), sunColor: [60, 76, 100], ambient: [58, 68, 90] };

// ── Shots ────────────────────────────────────────────────────────────────────────────────────────────

type Scene = { cam: Camera; env: Env; behind?: boolean; city?: { look: CityLook; extras?: CityExtras; future?: boolean }; set?: (out: Tri[], glows: Glow[], lights: PointLight[]) => void; fx?: Fx };
const S = (name: ShotName, pos: [V3, V3], target: [V3, V3], fov: [number, number] = [50, 50], ease?: (x: number) => number): Shot[] => [{ from: SHOTS[name].from, to: SHOTS[name].to, pos, target, fov, ease }];
const lin = (x: number) => x;

const today = (shadows = true): CityLook => ({ night: 0, shadows: shadows ? { sun: SUN, alpha: 0.32 } : undefined });
const tomorrow: CityLook = { night: 0, restyle: future, shadows: { sun: SUN, alpha: 0.3 } };

const people = (seed: number, count = 260, within = 3): CityExtras["walkers"] => ({ seed, count, within });
const cars = (seed: number, count = 260, kind?: (i: number, r: number) => VehicleKind): TrafficOpts => ({ seed, count, within: 5, travel: (t, i) => t * (8 + (i % 5)), kind: kind ?? ((_i, r) => (r < 0.75 ? "car" : "truck")), custom: (out, _k, pos, yaw, _c, glows) => pod(out, glows, pos, yaw), range: 400 });

/** The riders the hook singles out, on the avenue at x = 24, heading for the camera. */
export const FEATURED = [
  { lane: 26.5, z0: 110, speed: -7, seed: 11, label: "DELIVERY RIDER", pct: 94 },
  { lane: 21.5, z0: 40, speed: 6, seed: 12, label: "DELIVERY RIDER", pct: 94 },
];
export const FEATURED_WALKERS = [
  { p: [31.2, 0, 52] as V3, yaw: Math.PI, seed: 21, label: "OFFICE CLERK", pct: 89 },
  { p: [16.6, 0, 70] as V3, yaw: Math.PI, seed: 22, label: "CASHIER", pct: 92 },
];
const riderPos = (f: (typeof FEATURED)[number], t: number): V3 => [f.lane, 0, f.z0 + f.speed * t];

function streetLife(out: Tri[], t: number) {
  for (const f of FEATURED) rider(out, riderPos(f, t), f.speed < 0 ? Math.PI : 0, f.seed);
  const r = rng(77);
  for (let i = 0; i < 14; i++) {
    const lane = r() < 0.5 ? 26.5 : 21.5, sp = (lane > 24 ? -1 : 1) * (6 + r() * 4), z0 = (r() - 0.5) * 300;
    const z = ((z0 + sp * t + 150) % 300 + 300) % 300 - 150;
    rider(out, [lane, 0, z], sp < 0 ? Math.PI : 0, 30 + i, [hex("#e8432c"), hex("#2fb24a"), hex("#f2b21c")][i % 3]);
  }
  for (const w of FEATURED_WALKERS) person(out, worker(w.seed, w.seed === 21 ? hex("#2a3a5a") : hex("#c94f3d")), { pos: [w.p[0], 0, w.p[2] - t * 1.2], yaw: w.yaw, walk: 1, phase: t * 4, lod: 1 });
}

/** The factory floor: five stations along a conveyor; the arms come down and the people step away. */
const STATIONS = [-10, -5, 0, 5, 10];
const armDrop = (k: number) => SHOTS.factory.from + 0.8 + k * 0.35;
function factory(out: Tri[], glows: Glow[], lights: PointLight[], t: number) {
  room(out, glows, [0, 0, -2], 44, 26, 8, { floor: hex("#6c7076"), wall: hex("#b8bcc0"), ceiling: hex("#8a8e94"), sawtooth: true });
  conveyor(out, -20, 20, 0, t);
  STATIONS.forEach((x, k) => {
    const drop = armDrop(k);
    const d = smooth(drop, drop + 0.6, t);
    // The arm lowers on its column and starts working.
    const y = 8 - d * 8;
    if (t > drop - 0.1) {
      box(out, { pos: [x, y + 2.2, 1.9], size: [0.5, Math.max(0.1, 8 - y), 0.5] }, { color: hex("#3a3e45") });
      const work = Math.sin((t - drop) * 6 + k);
      robotArm(out, glows, [x, y, 1.9], { yaw: Math.PI, lift: 0.5 + 0.2 * work, bend: 1.4 - 0.2 * work, grip: 0.5 + 0.5 * work, scale: 0.75 });
    }
    // The worker: at the line, then stepping back and walking off as the arm arrives.
    const leave = smooth(drop + 0.2, drop + 0.6, t);
    const gone = t - (drop + 0.4);
    const pz = 1.6 + Math.max(0, gone) * 1.4 + leave * 0.5;
    if (pz < 16) {
      const yaw = leave > 0.5 ? 0 : Math.PI;
      const L = { ...worker(50 + k, hex("#2f6db0")), hardhat: hex("#f2c21c") };
      person(out, L, { pos: [x + (leave > 0.5 ? Math.max(0, gone) * 0.5 : 0), 0, pz], yaw, walk: leave > 0.5 ? 1 : 0, phase: t * 5 + k, lod: 1, handL: leave < 0.5 ? [-0.2, 0.95, 0.45 + 0.08 * Math.sin(t * 7 + k)] : undefined, handR: leave < 0.5 ? [0.2, 0.95, 0.45 + 0.08 * Math.cos(t * 7 + k)] : undefined });
    }
  });
  lights.push({ p: [0, 7, 0], color: [255, 245, 230], intensity: 0.6, range: 30 });
}

/** The office: sixteen desks; one by one the person at each is replaced by the AI. */
const DESKS: V3[] = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) DESKS.push([-6 + c * 4, 0, -6 + r * 3.2]);
const replaced = (k: number) => SHOTS.office.from + 0.6 + ((k * 7) % 16) * 0.13;
function office(out: Tri[], glows: Glow[], t: number, staffed: boolean, lightK: number) {
  room(out, glows, [0, 0, -2], 30, 24, 3.4, { floor: hex("#7d8288"), wall: hex("#e4e2dc"), ceiling: hex("#cfd0d0"), panels: lightK, window: hex("#a8d4f0") });
  DESKS.forEach((p, k) => {
    desk(out, glows, p, Math.PI, 1);
    const swap = staffed ? smooth(replaced(k), replaced(k) + 0.25, t) : 1;
    if (swap < 0.5) person(out, worker(80 + k, [hex("#2a3a5a"), hex("#e6e0d0"), hex("#5d8a55"), hex("#7a5a9a")][k % 4]), { pos: [p[0], 0, p[2] + 0.62], yaw: Math.PI, drop: 0.42, handL: [-0.2, 0.78, 0.45 + 0.03 * Math.sin(t * 12 + k)], handR: [0.2, 0.78, 0.45 + 0.03 * Math.cos(t * 11 + k)], lod: 1 });
    if (swap > 0.2) terminal(out, glows, [p[0], 1.45, p[2] + 0.2], t, swap);
    if (staffed && swap > 0 && swap < 1) glows.push({ p: [p[0], 1.2, p[2] + 0.6], radius: 1.6, color: CYAN, alpha: (1 - swap) * 0.7 });
  });
}

/** The kitchen: an open counter, an arm at the grill, a kiosk and a customer out front. */
function kitchen(out: Tri[], glows: Glow[], lights: PointLight[], t: number) {
  const [x, z] = at("kitchen");
  const fz = z + 16;
  box(out, { pos: [x, 0, fz - 6], size: [14, 4, 0.3] }, { color: hex("#5a6068"), zBias: 30 });
  box(out, { pos: [x - 7, 0, fz - 3], size: [0.3, 4, 6] }, { color: hex("#d6cfc2") });
  box(out, { pos: [x + 7, 0, fz - 3], size: [0.3, 4, 6] }, { color: hex("#d6cfc2") });
  box(out, { pos: [x, 4, fz - 3], size: [14.6, 0.3, 6.6] }, { color: hex("#2a2e36") });
  box(out, { pos: [x, 4.3, fz + 0.2], size: [14.6, 0.8, 0.2] }, { color: CYAN, glow: 0.9 });
  box(out, { pos: [x, 0, fz - 0.5], size: [12, 1.05, 0.8] }, { color: hex("#cfd4d8") });
  box(out, { pos: [x - 2.5, 0, fz - 4.6], size: [4, 0.95, 1.6] }, { color: hex("#3a3e45") });
  box(out, { pos: [x - 2.5, 0.95, fz - 4.6], size: [3.6, 0.05, 1.3] }, { color: hex("#ff7a2a"), glow: 0.7 });
  glows.push({ p: [x - 2.5, 1.2, fz - 4.6], radius: 2, color: hex("#ff8a3a"), alpha: 0.4 });
  const w = Math.sin(t * 3);
  robotArm(out, glows, [x - 2.5, 0, fz - 2.8], { yaw: Math.PI + w * 0.6, lift: 0.7 + 0.15 * w, bend: 1.3, grip: 0.7, color: WHITE, scale: 0.7 });
  robotArm(out, glows, [x + 3, 0, fz - 2.8], { yaw: Math.PI - 0.4 + Math.cos(t * 2.4) * 0.5, lift: 0.6, bend: 1.5 + 0.2 * w, grip: 0.4, color: WHITE, scale: 0.7 });
  robot(out, glows, [x + 4.5, 0, fz - 1.4], Math.PI * 0, { handR: [0.25, 1.0, 0.45], handL: [-0.25, 1.0, 0.45] });
  kiosk(out, glows, [x - 4, 0, fz + 2.4], Math.PI * 0.9);
  kiosk(out, glows, [x - 2.2, 0, fz + 2.4], Math.PI);
  person(out, worker(140, hex("#d9a441")), { pos: [x - 4.1, 0, fz + 3.3], yaw: Math.PI * 0.9 + Math.PI, handR: [0.18, 1.3, 0.45], headPitch: 0.15, lod: 2 });
  lights.push({ p: [x, 3.6, fz - 2], color: [235, 248, 255], intensity: 1.4, range: 12 });
}

/** The job fair: a low building with a long queue down the pavement. */
export const JOB_SIGN: V3 = [SETS.jobs[0] * PITCH, 7.4, SETS.jobs[1] * PITCH - 13.6];
function jobs(out: Tri[], glows: Glow[], t: number) {
  const [x, z] = at("jobs");
  box(out, { pos: [x, 0, z], size: [30, 7, 26] }, { color: hex("#d8d2c4") });
  box(out, { pos: [x, 0.2, z - 13.02], size: [6, 3, 0.1] }, { color: hex("#2a3440") });
  box(out, { pos: [x, 5.8, z - 13.1], size: [12, 2.2, 0.2] }, { color: hex("#1f5fbf") });
  const r = rng(3);
  for (let i = 0; i < 120; i++) {
    const s = i * 0.95;
    const p: V3 = s < 40 ? [x - 3 - s, 0, z - 15.4 + (r() - 0.5) * 0.4] : [x - 43 + (r() - 0.5) * 0.4, 0, z - 15.4 + (s - 40)];
    const yaw = s < 40 ? Math.PI / 2 : Math.PI;
    const L = worker(200 + i, [hex("#2a3a5a"), hex("#e6e0d0"), hex("#5d8a55"), hex("#7a5a9a"), hex("#c94f3d"), hex("#3f7ea6")][i % 6]);
    person(out, L, { pos: p, yaw: yaw + (r() - 0.5) * 0.3, lod: i < 20 ? 1 : 0, headYaw: Math.sin(t * 0.8 + i) * 0.3, headPitch: r() < 0.3 ? 0.4 : 0, handR: r() < 0.25 ? [0.15, 1.2, 0.3] : undefined });
  }
}

/** A family on their front step in the evening, under one bulb. */
const FAMILY_AT: V3 = [SETS.family[0] * PITCH, 0, SETS.family[1] * PITCH - 6];
function family(out: Tri[], glows: Glow[], lights: PointLight[], t: number) {
  const [x, , z] = FAMILY_AT;
  box(out, { pos: [x, 0, z + 4], size: [9, 3.2, 7] }, { color: hex("#cfd8e0"), zBias: 20 });
  box(out, { pos: [x, 3.2, z + 4], size: [9.6, 0.25, 7.6] }, { color: hex("#8d979c"), zBias: 20 });
  box(out, { pos: [x, 0, z + 0.2], size: [4, 0.35, 1.2] }, { color: hex("#9a958a"), zBias: 6 });
  box(out, { pos: [x + 1.2, 0.35, z + 0.6], size: [1.2, 2.1, 0.1] }, { color: hex("#3a2a20") });
  const bulb: V3 = [x - 0.8, 2.7, z + 0.4];
  octa(out, { pos: bulb, size: 0.1 }, { color: hex("#ffe2a0"), glow: 1 });
  handLight(glows, bulb, hex("#ffcf7a"), 0.8, 0.8);
  lights.push({ p: bulb, color: [255, 210, 150], intensity: 1.6, range: 7 });
  const sitters: [Look, number][] = [[villager(301, "man"), -1.4], [villager(302, "woman"), -0.6], [villager(303, "child"), 0.2], [villager(304, "child"), 0.9]];
  sitters.forEach(([L, dx], i) => person(out, { ...L, faceless: true }, { pos: [x + dx, 0.35, z + 0.4], yaw: Math.PI, drop: L.height > 1.4 ? 0.45 : 0.3, footL: [-0.12, -0.3, 0.45], footR: [0.12, -0.3, 0.45], headPitch: i === 0 ? 0.35 : 0.1, handR: i === 0 ? [0.12, 0.55, 0.35] : undefined, lod: 2 }));
  // The bills in his hand.
  box(out, { pos: poseFn({ pos: [x - 1.4, 0.35, z + 0.4], yaw: Math.PI })([0.12, 0.6, 0.38]), yaw: Math.PI, size: [0.22, 0.02, 0.3] }, { color: hex("#f4f2ea") });
}

/** The shop with no staff: bright, robots inside, people looking in. */
export const SHOP_SIGN: V3 = [SETS.shop[0] * PITCH, 4.6, SETS.shop[1] * PITCH - 6.2];
function shop(out: Tri[], glows: Glow[], lights: PointLight[], t: number) {
  const [x, z] = at("shop");
  const fz = z - 6;
  box(out, { pos: [x, 0, z + 2], size: [16, 4.4, 16] }, (f) => ({ color: f === 0 ? hex("#2a2e36") : hex("#3a3f48"), alpha: f === 1 ? 0 : 1 }));
  box(out, { pos: [x, 0.1, fz - 0.05], size: [13, 3.6, 0.08] }, { color: hex("#9fdcef"), alpha: 0.22, glow: 0.1, zBias: -0.2 });
  box(out, { pos: [x, 3.8, fz - 0.1], size: [16, 0.5, 0.1] }, { color: CYAN, glow: 1 });
  for (let k = 0; k < 3; k++) box(out, { pos: [x - 4 + k * 4, 0, fz + 3.5], size: [2.5, 1.8, 0.8] }, { color: [hex("#d04a3a"), hex("#3a7ad0"), hex("#e0c04a")][k] });
  robot(out, glows, [x - 2, 0.05, fz + 2.2], Math.PI, { handR: [0.25, 1.3, 0.4], lod: 1 });
  robot(out, glows, [x + 3, 0.05, fz + 2], Math.PI * 1.2, { walk: 1, phase: t * 4, lod: 1 });
  glows.push({ p: [x, 2, fz + 1], radius: 4, color: hex("#e8faff"), alpha: 0.12 });
  lights.push({ p: [x, 3, fz - 1.5], color: [220, 245, 255], intensity: 1.3, range: 8 });
  for (let i = 0; i < 4; i++) person(out, worker(320 + i), { pos: [x - 4 + i * 2.4, 0, fz - 1.6 - (i % 2) * 0.6], yaw: 0, lod: 2, headPitch: -0.05, handL: i === 2 ? [-0.1, 1.5, 0.35] : undefined });
}

/** The automated city's air traffic: drones on lanes, and the light of their paths. */
function skyLanes(out: Tri[], glows: Glow[], t: number, camPos: V3) {
  const r = rng(9);
  for (let i = 0; i < 70; i++) {
    const y = 30 + r() * 60, along = r() < 0.5, line = (r() - 0.5) * 600, sp = 14 + r() * 10, off = r() * 800;
    const s = ((off + t * sp) % 800) - 400;
    const p: V3 = along ? [line, y, s] : [s, y, line];
    const d = Math.hypot(p[0] - camPos[0], p[1] - camPos[1], p[2] - camPos[2]);
    if (d < 120) drone(out, glows, p, t, along ? 0 : Math.PI / 2, r() < 0.7, 1.4);
    else glows.push({ p, radius: 2.2, color: CYAN, alpha: 0.7 });
  }
}

function park(out: Tri[], glows: Glow[], t: number) {
  const [x, z] = at("park");
  out.push({ a: [x - 19, 0.07, z - 19], b: [x + 19, 0.07, z - 19], c: [x + 19, 0.07, z + 19], color: hex("#4f8040"), zBias: 8700 }, { a: [x - 19, 0.07, z - 19], b: [x + 19, 0.07, z + 19], c: [x - 19, 0.07, z + 19], color: hex("#4f8040"), zBias: 8700 });
  const r = rng(12);
  for (let k = 0; k < 9; k++) broadTree(out, [x - 16 + r() * 32, 0, z + r() * 16], k + 40, 0, 1);
  for (let i = 0; i < 26; i++) {
    const p: V3 = [x - 15 + r() * 30, 0.05, z - 15 + r() * 30];
    const kind = r();
    const L = worker(400 + i, [hex("#e6e0d0"), hex("#5d8a55"), hex("#d9a441"), hex("#3f7ea6"), hex("#c94f3d")][i % 5]);
    if (kind < 0.45) person(out, L, { pos: p, yaw: r() * 6, drop: 0.55, footL: [-0.15, 0.05, 0.55], footR: [0.15, 0.05, 0.6], lod: 1, headPitch: r() < 0.5 ? 0.35 : -0.1 });
    else if (kind < 0.8) person(out, L, { pos: [p[0] + Math.sin(t * 0.3 + i) * 3, 0.05, p[2] + Math.cos(t * 0.3 + i) * 3], yaw: -t * 0.3 - i + Math.PI / 2, walk: 1, phase: t * 4 + i, lod: 1 });
    else person(out, { ...villager(450 + i, "child"), faceless: true }, { pos: [p[0] + Math.sin(t * 2 + i) * 2, 0.05 + Math.abs(Math.sin(t * 5 + i)) * 0.25, p[2]], yaw: t * 2 + i, walk: 1, phase: t * 7, lod: 1 });
  }
  // A robot tends the grass.
  robot(out, glows, [x + 6 + Math.sin(t * 0.5) * 4, 0.05, z - 8], Math.cos(t * 0.5) > 0 ? Math.PI / 2 : -Math.PI / 2, { walk: 1, phase: t * 4 });
}

/** The roof the last shot stands on, at the edge of the city, facing it. */
const ROOF_Y = 64;
const ROOF: V3 = [10, ROOF_Y, E + 46];

function scene(t: number): Scene {
  const shot = shotAt(t);
  const u = local(t, shot);
  switch (shot) {
    case "city": {
      const cam = shotCamera(S("city", [[24, 95, -70], [24, 22, -12]], [[24, 0, 50], [24, 0, 62]], [52, 50], (x) => 1 - (1 - x) ** 2), t);
      return { cam, env: DAY, city: { look: today(), extras: { walkers: people(1, 500, 3), traffic: { ...cars(2, 400), custom: undefined } } }, set: (out) => streetLife(out, t) };
    }
    case "street": {
      const cam = shotCamera(S("street", [[32, 1.7, -6], [32.5, 1.8, 6]], [[23, 1.8, 40], [22, 1.9, 52]], [52, 52], lin), t);
      return { cam, env: DAY, city: { look: today(), extras: { walkers: people(3, 500, 2), traffic: { ...cars(4, 300), custom: undefined } } }, set: (out) => streetLife(out, t + 4) };
    }
    case "factory": {
      const cam = shotCamera(S("factory", [[-15, 3.4, 10], [-9.5, 2.6, 8]], [[2, 1.1, -0.5], [3, 1, -0.5]], [50, 48]), t);
      return { cam, env: ROOM, set: (out, glows, lights) => factory(out, glows, lights, t) };
    }
    case "office": {
      const cam = shotCamera(S("office", [[-11, 2.7, 9], [-7, 2.4, 7]], [[2, 0.9, -4], [3, 0.9, -4]], [50, 48]), t);
      return { cam, env: ROOM, set: (out, glows) => office(out, glows, t, true, 1) };
    }
    case "delivery": {
      const cam = shotCamera(S("delivery", [[24, 9, -52], [24, 11, -30]], [[24, 9, 40], [24, 10, 60]], [52, 52], lin), t);
      const set = (out: Tri[], glows: Glow[]) => {
        for (let i = 0; i < 12; i++) {
          const r = rng(i * 5 + 1);
          const z = -40 + ((r() * 220 + t * (9 + r() * 5)) % 220);
          drone(out, glows, [15 + r() * 18, 12 + r() * 16, z], t, 0, true, 1.3);
        }
      };
      return { cam, env: DAY, city: { look: today(), extras: { walkers: people(5, 160, 2), traffic: cars(6, 420, () => "pod") } }, set };
    }
    case "kitchen": {
      const [x, z] = at("kitchen");
      const cam = shotCamera(S("kitchen", [[x + 3.5, 2.7, z + 22.5], [x + 1.8, 2.5, z + 21.5]], [[x - 1, 1.2, z + 13], [x - 1.5, 1.2, z + 13]], [50, 48]), t);
      return { cam, env: DAY, city: { look: today(), extras: { walkers: people(7, 160, 2) } }, set: (out, glows, lights) => kitchen(out, glows, lights, t) };
    }
    case "empty": {
      const cam = shotCamera(S("empty", [[-12, 1.6, 7], [9, 1.7, 6]], [[-4, 1.2, -6], [6, 1.2, -6]], [50, 50], lin), t);
      return { cam, env: DIM, set: (out, glows) => office(out, glows, t, false, 0.12) };
    }
    case "boxes": {
      const cam = shotCamera(S("boxes", [[29.6, 1.4, 4], [29.6, 1.5, 7]], [[31.5, 2.4, 40], [31.5, 2.6, 44]], [44, 44], lin), t);
      const set = (out: Tri[]) => {
        for (let i = 0; i < 9; i++) {
          const p: V3 = [31.2 + ((i * 37) % 5) * 0.55 - 1, 0, 15 + i * 2.6 - u * 1.25];
          person(out, worker(500 + i, [hex("#2a3a5a"), hex("#e6e0d0"), hex("#3a3e46")][i % 3]), { pos: p, yaw: Math.PI, walk: 0.8, phase: u * 4 + i, lod: i < 3 ? 2 : 1, headPitch: 0.3, handL: [-0.2, 1.0, 0.35], handR: [0.2, 1.0, 0.35] });
          box(out, { pos: poseFn({ pos: p, yaw: Math.PI })([0, 0.9, 0.4]), yaw: Math.PI, size: [0.5, 0.35, 0.4] }, { color: hex("#c09a6a") });
        }
      };
      return { cam, env: mixEnv(DAY, DUSK, 0.25), city: { look: today(), extras: { traffic: cars(8, 200, () => "pod") } }, set };
    }
    case "queue": {
      const [x, z] = at("jobs");
      const cam = shotCamera(S("queue", [[x - 60, 2.4, z - 26], [x - 52, 3, z - 24]], [[x - 10, 3, z - 14], [x - 6, 3.4, z - 14]], [50, 48]), t);
      return { cam, env: DAY, city: { look: today(), extras: { traffic: cars(9, 160, () => "pod") } }, set: (out, glows) => jobs(out, glows, t) };
    }
    case "family": {
      const [x, , z] = FAMILY_AT;
      const cam = shotCamera(S("family", [[x + 4, 1.4, z - 7], [x + 2.6, 1.35, z - 5.8]], [[x - 0.4, 1.0, z + 0.6], [x - 0.6, 1.0, z + 0.6]], [46, 44]), t);
      return { cam, env: DUSK, city: { look: { night: 0.6, litShare: 0.25 } }, set: (out, glows, lights) => family(out, glows, lights, t) };
    }
    case "shop": {
      const [x, z] = at("shop");
      const cam = shotCamera(S("shop", [[x + 5, 1.8, z - 21], [x + 3, 1.8, z - 19]], [[x, 1.9, z - 4], [x, 1.9, z - 4]], [50, 48]), t);
      return { cam, env: mixEnv(DAY, DUSK, 0.5), city: { look: { ...today(false), night: 0.3 } }, set: (out, glows, lights) => shop(out, glows, lights, t) };
    }
    case "future": {
      const cam = shotCamera(S("future", [[-300, 170, 300], [-150, 120, 220]], [[40, 30, -20], [40, 20, -30]], [50, 50], lin), t);
      return { cam, env: FUTURE, city: { look: tomorrow, future: true, extras: { traffic: cars(10, 500, () => "pod"), walkers: people(11, 120, 2) } }, set: (out, glows) => skyLanes(out, glows, t, cam.pos) };
    }
    case "warehouse": {
      const cam = shotCamera(S("warehouse", [[-17, 7, 12], [-11, 4.5, 10]], [[4, 1, -4], [5, 1, -5]], [50, 48]), t);
      const set = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        room(out, glows, [0, 0, -4], 44, 34, 10, { floor: hex("#2a2e34"), wall: hex("#3a3e46"), ceiling: hex("#22262c") });
        for (let k = 0; k < 6; k++) shelves(out, -18, 16, -16 + k * 4.4, 5, k + 1);
        for (let i = 0; i < 14; i++) {
          const r = rng(i * 3 + 1);
          const lane = -13.8 + Math.floor(r() * 5) * 4.4, sp = (r() < 0.5 ? 1 : -1) * (1.6 + r());
          const xx = (((r() * 34 + t * sp) % 34) + 34) % 34 - 18;
          floorBot(out, glows, [xx, 0, lane], sp > 0 ? Math.PI / 2 : -Math.PI / 2, r() < 0.5);
        }
        robotArm(out, glows, [-2, 0, 8], { yaw: Math.PI + Math.sin(t * 2) * 0.8, lift: 0.6, bend: 1.4, color: WHITE, scale: 0.8 });
        robotArm(out, glows, [6, 0, 8], { yaw: Math.PI + Math.cos(t * 2.3) * 0.8, lift: 0.5, bend: 1.5, color: WHITE, scale: 0.8 });
        lights.push({ p: [0, 4, 6], color: [94, 240, 255], intensity: 1.2, range: 20 }, { p: [-10, 6, -6], color: [94, 240, 255], intensity: 0.8, range: 18 }, { p: [10, 6, -10], color: [94, 240, 255], intensity: 0.8, range: 18 });
      };
      return { cam, env: DARK, set };
    }
    case "park": {
      const [x, z] = at("park");
      const cam = shotCamera(S("park", [[x - 16, 8, z - 34], [x - 4, 7, z - 32]], [[x, 0.5, z - 2], [x + 2, 0.5, z - 2]], [50, 50], lin), t);
      return { cam, env: FUTURE, city: { look: tomorrow, future: true, extras: { trees: false } }, set: (out, glows) => { park(out, glows, t); skyLanes(out, glows, t, cam.pos); } };
    }
    case "divide": {
      const cam = shotCamera(S("divide", [[WALL_X, 7, 150], [WALL_X - 8, 95, 230]], [[WALL_X, 14, 0], [WALL_X, 0, -30]], [52, 54]), t);
      const set = (out: Tri[], glows: Glow[]) => {
        // The wall between them.
        skyLanes(out, glows, t, cam.pos);
      };
      return { cam, env: mixEnv(FUTURE, DUSK, 0.3), city: { look: tomorrow, future: true, extras: { traffic: cars(12, 300, () => "pod") } }, set };
    }
    case "lone":
    default: {
      const cam = shotCamera(S("lone", [[ROOF[0] + 1.6, ROOF_Y + 2.7, ROOF[2] + 4], [ROOF[0] + 1.1, ROOF_Y + 2.3, ROOF[2] + 1.8]], [[ROOF[0] - 3, ROOF_Y - 3, ROOF[2] - 70], [ROOF[0] - 3, ROOF_Y - 2, ROOF[2] - 70]], [50, 46], lin), t);
      const set = (out: Tri[], glows: Glow[]) => {
        box(out, { pos: [ROOF[0], 0, ROOF[2]], size: [16, ROOF_Y, 12] }, { color: hex("#4a4e56"), zBias: 30 });
        box(out, { pos: [ROOF[0], ROOF_Y, ROOF[2] - 5.8], size: [16, 1, 0.3] }, { color: hex("#3a3e45") });
        person(out, worker(600, hex("#c94f3d")), { pos: [ROOF[0], ROOF_Y, ROOF[2] - 4.6], yaw: Math.PI, lod: 2, headPitch: -0.1, headYaw: Math.sin(t * 0.4) * 0.2 });
        skyLanes(out, glows, t, cam.pos);
      };
      return { cam, env: DUSK, behind: true, city: { future: true, look: { ...tomorrow, night: 0.7, litShare: 0.35, shadows: undefined }, extras: { traffic: { ...cars(13, 500, () => "pod"), lights: 1 } } }, set };
    }
  }
}

/** The district across the wall: its houses (no second ground), and the wall. */
function slum(out: Tri[], glows: Glow[], cam: Camera, t: number, night: number) {
  const tmp: Tri[] = [];
  drawCity(tmp, glows, { ...SLUM, n: 0 }, { night, litShare: 0.12, shadows: night < 0.5 ? { sun: SUN, alpha: 0.3 } : undefined, far: 900 }, cam, t, { streetLights: false, trees: false });
  for (const q of tmp) if ((q.zBias ?? 0) < 1000 || (q.zBias ?? 0) === 5000) out.push(q);
  box(out, { pos: [WALL_X, 0, 0], size: [1.2, 6, 250] }, { color: hex("#9a9a94") });
  for (let z = -124; z < 124; z += 10) box(out, { pos: [WALL_X, 6, z], size: [0.3, 0.8, 0.3] }, { color: hex("#3a3e45") });
}

function mixEnv(a: Env, b: Env, k: number): Env {
  const m = (x: RGB, y: RGB) => mixRGB(x, y, k);
  return { ...a, skyTop: m(a.skyTop, b.skyTop), skyBottom: m(a.skyBottom, b.skyBottom), fog: m(a.fog, b.fog), sunColor: m(a.sunColor, b.sunColor), ambient: m(a.ambient, b.ambient), sun: norm([a.sun[0] + (b.sun[0] - a.sun[0]) * k, a.sun[1] + (b.sun[1] - a.sun[1]) * k, a.sun[2] + (b.sun[2] - a.sun[2]) * k]) };
}

export function aiFrame(t: number): Built {
  const sc = scene(t);
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  if (sc.city) drawCity(tris, glows, sc.city.future ? PLAN_FUTURE : PLAN, sc.city.look, sc.cam, t, sc.city.extras);
  if (sc.city?.future) slum(tris, glows, sc.cam, t, sc.city.look.night);
  // Far city lights can go behind the geometry, so a roof in the foreground hides them.
  const own: Glow[] = sc.behind ? [] : glows;
  sc.set?.(tris, own, lights);
  return { frame: { tris, camera: sc.cam, env: sc.env, glowsBehind: sc.behind ? glows : undefined, glowsFront: own, lights }, fx: sc.fx ?? {} };
}

export function aiGrade(t: number): Grade {
  switch (shotAt(t)) {
    case "factory":
    case "office":
      return { bloom: 0.35, contrast: 1.1, saturate: 1.05, tint: "#bfe8ff", tintAmount: 0.12 };
    case "empty":
    case "warehouse":
      return { bloom: 0.8, contrast: 1.18, saturate: 1.0, tint: "#3a8aa8", tintAmount: 0.22 };
    case "boxes":
    case "queue":
    case "family":
      return { bloom: 0.35, contrast: 1.12, saturate: 0.85, tint: "#c8a888", tintAmount: 0.16 };
    case "future":
    case "park":
    case "divide":
      return { bloom: 0.45, contrast: 1.1, saturate: 1.1, tint: "#8ae8ff", tintAmount: 0.12 };
    case "lone":
      return { bloom: 0.7, contrast: 1.14, saturate: 1.08, tint: "#ff9a6a", tintAmount: 0.14 };
    default:
      return { bloom: 0.3, contrast: 1.1, saturate: 1.1, tint: "#ffd8a8", tintAmount: 0.1 };
  }
}

export { riderPos, ROBOT, ORANGE };
