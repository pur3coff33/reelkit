// What's on screen at reel time t in EP 02: an invented Metro Manila-like city on a bay, its grid, and the places the
// blackout reaches. Every frame is built from t alone.
import { hex, mixRGB, norm, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, octa, poseFn, rng, shake, shotCamera, smooth, type Shot } from "../../src/kit/lowpoly/world";
import { person, villager, jeepney, car, tricycle, powerPole, wire, poleTop, type Look } from "../typhoon/models";
import { drawBuilding, drawCity, planCity, view, type Bldg, type CityLook, type TrafficOpts } from "../../src/kit/whatif/city";
import { beam, cellTower, fuelStation, generator, handLight, jug, rescueTruck, shopfront, smoke, tanker, tent, trafficLight } from "../../src/kit/whatif/props";
import type { Built, Fx } from "../../src/kit/whatif/Reel";
import type { Grade } from "../../src/kit/whatif/cinema";
import { BLACKOUT, SHOTS, gridAt, local, shotAt, type ShotName } from "./timeline";

// ── The city ─────────────────────────────────────────────────────────────────────────────────────────

const PITCH = 48;
const CORE: [number, number] = [40, -30];
const SETS = { fuel: [3, 2], hospital: [2, -3], mall: [-1, 1], plaza: [-1, 2], store: [-2, 4], water: [-5, -4], tower: [5, -5] } as const;
const at = (k: keyof typeof SETS): [number, number] => [SETS[k][0] * PITCH, SETS[k][1] * PITCH];

const PLAN = planCity({
  seed: 202,
  n: 7,
  pitch: PITCH,
  road: 12,
  core: 150,
  peak: 175,
  houseRing: 235,
  centre: CORE,
  palette: ["#c9c3b6", "#a9b4bd", "#8f9ba6", "#d8cfbf", "#7b8a99", "#bfb19a", "#e0dad0", "#9aa59a"].map(hex),
  housePalette: ["#e8d9b0", "#b9d3c4", "#e3b9a4", "#cfd8e0", "#efe6d6", "#d9c27a", "#a9c7d9"].map(hex),
  houseRoofs: ["#8d979c", "#9a4a32", "#3e6c8f", "#7a8288", "#a35a3a", "#4b7a5a"].map(hex),
  skip: (i, j) => Object.values(SETS).some(([a, b]) => a === i && b === j),
});

const E = (PLAN.n + 0.5) * PITCH;
/** The tower with the glass lift: the tallest one near the core. */
const LIFT_TOWER = PLAN.buildings.filter((b) => b.dist < 120).sort((a, b) => b.h - a.h)[0];

const [HX, HZ] = at("hospital");
const HOSPITAL: Bldg = { x: HX, z: HZ, w: 30, d: 22, h: 34, color: hex("#eef0ee"), roof: hex("#9aa0a6"), seed: 77, kind: "mid", dist: 0 };
/** Buildings with their own generators: they stay lit when the grid is gone. */
const BACKUP = new Set(PLAN.buildings.filter((b) => rng(b.seed)() < 0.025).map((b) => b.seed));

// ── Light ────────────────────────────────────────────────────────────────────────────────────────────

const MOON = norm([0.35, 0.75, 0.45]);
const NIGHT_LIVE: Env = { skyTop: hex("#060b1c"), skyBottom: hex("#3d2c45"), fog: hex("#231d2c"), fogNear: 160, fogFar: 1350, sun: MOON, sunColor: [76, 84, 116], ambient: [44, 48, 70], stars: 0.1 };
const NIGHT_DARK: Env = { skyTop: hex("#03060f"), skyBottom: hex("#14203a"), fog: hex("#0c1322"), fogNear: 120, fogFar: 1150, sun: MOON, sunColor: [96, 112, 150], ambient: [40, 48, 72], stars: 0.85 };
const MORNING: Env = { skyTop: hex("#8aa7c2"), skyBottom: hex("#eadbc0"), fog: hex("#dccfb8"), fogNear: 110, fogFar: 1150, sun: norm([0.55, 0.5, 0.35]), sunColor: [255, 226, 182], ambient: [112, 116, 132] };
const DUSK: Env = { skyTop: hex("#1a2244"), skyBottom: hex("#b86a52"), fog: hex("#4a3a48"), fogNear: 120, fogFar: 1150, sun: norm([-0.7, 0.2, 0.3]), sunColor: [200, 130, 100], ambient: [52, 54, 78], stars: 0.3 };

function mixEnv(a: Env, b: Env, k: number): Env {
  const m = (x: RGB, y: RGB) => mixRGB(x, y, k);
  return { ...a, skyTop: m(a.skyTop, b.skyTop), skyBottom: m(a.skyBottom, b.skyBottom), fog: m(a.fog, b.fog), sunColor: m(a.sunColor, b.sunColor), ambient: m(a.ambient, b.ambient), fogNear: a.fogNear + (b.fogNear - a.fogNear) * k, fogFar: a.fogFar + (b.fogFar - a.fogFar) * k, stars: (a.stars ?? 0) + ((b.stars ?? 0) - (a.stars ?? 0)) * k };
}

// ── Traffic ──────────────────────────────────────────────────────────────────────────────────────────

const kind: TrafficOpts["kind"] = (_i, r) => (r < 0.3 ? "jeep" : r < 0.42 ? "trike" : r < 0.52 ? "truck" : "car");
/** Moving at `v` until `stop`, then braking to a halt. */
const brake = (v: number, stop: number, tau = 0.9) => (t: number) => (t < stop ? v * t : v * stop + v * tau * (1 - Math.exp(-(t - stop) / tau)));
const fleet = (t0: number, stop = 1e9, count = 460): TrafficOpts => {
  const go = brake(9, stop);
  return { seed: 31, count, within: 5, kind, travel: (t, i) => go(t) * (0.75 + ((i * 37) % 10) / 20) + t0 * 0, lights: 1, range: 520 };
};

// ── People ───────────────────────────────────────────────────────────────────────────────────────────

const VEST = hex("#ff7a1a");
const responder = (seed: number): Look => ({ ...villager(seed, "man"), top: hex("#1e2a44"), bottom: hex("#1e2a44"), vest: VEST, hardhat: hex("#f2f2ee"), cap: undefined });
const darker = (L: Look, k: number): Look => ({ ...L, skin: mixRGB(L.skin, [0, 0, 0], k), hair: mixRGB(L.hair, [0, 0, 0], k) });

/** Someone holding a phone up to their face: the screen lights them. */
function phoneUser(out: Tri[], glows: Glow[], lights: PointLight[], L: Look, pos: V3, yaw: number, t: number, seed: number, lod = 1) {
  const look = (Math.sin(t * 0.7 + seed) * 0.3);
  const hand: V3 = [0.08, 1.28 * (L.height / 1.7), 0.32];
  person(out, { ...L, faceless: true }, { pos, yaw, handR: hand, headPitch: 0.35, headYaw: look * 0.4, lod });
  const p = poseFn({ pos, yaw })([hand[0], hand[1] + 0.06, hand[2] + 0.02]);
  handLight(glows, p, hex("#cfe4ff"), 0.8, 0.35);
  if (lights.length < 10) lights.push({ p, color: [190, 215, 255], intensity: 1.4, range: 2.2 });
}

// ── Set pieces ───────────────────────────────────────────────────────────────────────────────────────

function hospital(out: Tri[], glows: Glow[], cam: Camera, t: number, lit: number) {
  const v = view(cam);
  drawBuilding(out, glows, HOSPITAL, { night: 1, power: () => lit, lamp: () => ({ color: hex("#e8f2ff"), share: 0.7 * lit, glow: 0.85 }) }, v);
  // The sign: a white H on blue, lit by the generator.
  const T = poseFn({ pos: [HX, 0, HZ + 11.05], yaw: 0 });
  box(out, { pos: T([0, 27, 0]), size: [6, 6, 0.2] }, { color: hex("#1f5fbf"), glow: lit * 0.9 });
  for (const x of [-1.5, 1.5]) box(out, { pos: T([x, 28, 0.15]), size: [0.9, 4, 0.1] }, { color: hex("#ffffff"), glow: lit, zBias: -0.1 });
  box(out, { pos: T([0, 29.55, 0.15]), size: [2.2, 0.9, 0.1] }, { color: hex("#ffffff"), glow: lit, zBias: -0.1 });
  if (lit > 0.1) glows.push({ p: T([0, 30, 1]), radius: 9, color: hex("#6aa8ff"), alpha: 0.55 * lit });
  // Emergency bay: a lit canopy.
  box(out, { pos: T([-8, 3.6, 2.5]), size: [10, 0.5, 5] }, { color: hex("#d8dce0") });
  if (lit > 0.1) glows.push({ p: T([-8, 3.2, 3]), radius: 7, color: hex("#fff4e0"), alpha: 0.6 * lit });
  generator(out, [HX + 20, 0, HZ + 6], Math.PI / 2, t, lit);
  generator(out, [HX + 20, 0, HZ - 2], Math.PI / 2, t + 1.3, lit);
}

/** The mall: a long, nearly blind box with a glass front and a lit band round the top. */
function mall(out: Tri[], glows: Glow[], lit: number) {
  const [x, z] = at("mall");
  const w = 34, d = 30, h = 17;
  box(out, { pos: [x, 0, z], size: [w, h, d] }, (f) => ({ color: f === 0 ? hex("#8f9196") : hex("#e7e1d5") }));
  box(out, { pos: [x, 1, z + d / 2 + 0.02], size: [w * 0.6, 8, 0.1] }, { color: lit > 0.05 ? hex("#ffe6b8") : hex("#1b232e"), glow: lit * 0.5, zBias: -0.1 });
  for (const side of [-1, 1]) box(out, { pos: [x, h - 3, z + side * (d / 2 + 0.02)], size: [w, 1.2, 0.1] }, { color: lit > 0.05 ? hex("#ff5a8a") : hex("#3a2a30"), glow: lit, zBias: -0.1 });
  box(out, { pos: [x + w / 2 + 0.02, h - 3, z], size: [0.1, 1.2, d] }, { color: lit > 0.05 ? hex("#ff5a8a") : hex("#3a2a30"), glow: lit, zBias: -0.1 });
  // The pylon sign out front.
  box(out, { pos: [x - w / 2 + 3, 0, z + d / 2 + 4], size: [2.2, 14, 1] }, { color: hex("#2a2e36") });
  box(out, { pos: [x - w / 2 + 3, 9, z + d / 2 + 4.52], size: [1.8, 4.5, 0.05] }, { color: lit > 0.05 ? hex("#ffd34a") : hex("#3a3424"), glow: lit, zBias: -0.1 });
  if (lit > 0.05) {
    glows.push({ p: [x, 5, z + d / 2 + 2], radius: 8, color: hex("#fff0d0"), alpha: 0.25 * lit });
    glows.push({ p: [x - w / 2 + 3, 11, z + d / 2 + 5], radius: 6, color: hex("#ffd34a"), alpha: 0.6 * lit });
  }
}

/** The glass lift on the face of the tall tower, and where it is. */
function lift(out: Tri[], glows: Glow[], lights: PointLight[], t: number, k: number, emergency: number) {
  const b = LIFT_TOWER;
  const face = b.z + b.d / 2 + 1.1;
  const y = liftY(t);
  // The shaft's rails.
  for (const x of [-1.3, 1.3]) box(out, { pos: [b.x + x, 0, face - 0.6], size: [0.2, b.h, 0.2] }, { color: hex("#2a2e34") });
  const lightC: RGB = k > 0.5 ? hex("#fff4e0") : emergency > 0.5 ? hex("#ff4a3a") : hex("#2a2420");
  box(out, { pos: [b.x, y, face], size: [2.4, 2.8, 2] }, (f) => ({ color: f === 0 ? hex("#3a3e44") : mixRGB(hex("#6a8ca8"), lightC, 0.55), glow: f === 0 ? 0 : k > 0.5 ? 0.8 : emergency * 0.6, alpha: f === 0 ? 1 : 0.75 }));
  const inside: V3 = [b.x, y + 1.4, face];
  glows.push({ p: inside, radius: 3.4, color: lightC, alpha: k > 0.5 ? 0.6 : emergency * 0.5 });
  lights.push({ p: inside, color: lightC, intensity: k > 0.5 ? 2 : emergency, range: 7 });
  // Two people inside.
  for (const [dx, s] of [[-0.5, 3], [0.5, 4]] as const) person(out, { ...villager(s, s === 3 ? "woman" : "man"), faceless: true }, { pos: [b.x + dx, y + 0.05, face + 0.2], yaw: 0, lod: 1, headPitch: k > 0.5 ? 0 : -0.3 });
}
const LIFT_STOP = 14.15;
function liftY(t: number) {
  const b = LIFT_TOWER;
  const top = b.h * 0.62;
  if (t < LIFT_STOP) return top - (t - SHOTS.elevator.from) * 2.2;
  const y0 = top - (LIFT_STOP - SHOTS.elevator.from) * 2.2;
  const j = t - LIFT_STOP;
  return y0 - 0.25 * Math.exp(-j * 7) * Math.sin(j * 30);
}

// ── Shots ────────────────────────────────────────────────────────────────────────────────────────────

type Scene = { cam: Camera; env: Env; look: CityLook; extras?: Parameters<typeof drawCity>[6]; set?: (out: Tri[], glows: Glow[], lights: PointLight[]) => void; fx?: Fx };

const S = (name: ShotName, pos: [V3, V3], target: [V3, V3], fov: [number, number] = [50, 50], ease?: (x: number) => number): Shot[] => [{ from: SHOTS[name].from, to: SHOTS[name].to, pos, target, fov, ease }];
const lin = (x: number) => x;

const allLive = (t: number): CityLook["power"] => (x, _z, seed) => gridAt(t, x, seed);
const dead: CityLook["power"] = () => 0;
/** After the first night: only the buildings on generators. */
const backups: CityLook["power"] = (_x, _z, seed) => (BACKUP.has(seed) ? 1 : 0);
const lampFor = (share: number, t: number) => (b: Bldg) => {
  if (b.kind !== "house") return BACKUP.has(b.seed) ? { color: hex("#ffe7b0"), share: 0.7, glow: 1 } : undefined;
  const r = rng(b.seed + 9)();
  if (r > share) return undefined;
  const flick = 0.75 + 0.25 * Math.sin(t * 11 + b.seed) * Math.sin(t * 7.3 + b.seed * 0.3);
  return { color: r < share * 0.4 ? hex("#f4f8ff") : hex("#ff9a3c"), share: 0.32, glow: flick };
};

function scene(t: number): Scene {
  const shot = shotAt(t);
  const u = local(t, shot);
  switch (shot) {
    case "skyline": {
      const cam = shotCamera(S("skyline", [[-640, 70, -150], [-470, 82, -90]], [[60, 80, -30], [50, 62, -30]], [46, 42], lin), t);
      return { cam, env: NIGHT_LIVE, look: { night: 1, power: allLive(t) }, extras: { traffic: fleet(0) } };
    }
    case "highway": {
      const cam = shotCamera(S("highway", [[18, 30, -230], [20, 24, -170]], [[24, 2, 30], [24, 0, 60]], [50, 50], lin), t);
      return { cam, env: NIGHT_LIVE, look: { night: 1, power: allLive(t) }, extras: { traffic: { ...fleet(0, 1e9, 900), within: 4 }, walkers: { seed: 3, count: 200, within: 2 } } };
    }
    case "aerial": {
      const cam = shotCamera(S("aerial", [[-300, 280, 300], [-210, 250, 340]], [[30, 10, -20], [40, 0, -30]], [48, 46], lin), t);
      return { cam, env: NIGHT_LIVE, look: { night: 1, power: allLive(t) }, extras: { traffic: fleet(0) } };
    }
    case "wave": {
      const base = shotCamera(S("wave", [[560, 340, 150], [520, 310, 110]], [[-80, 0, -20], [-60, 0, -30]], [52, 50], lin), t);
      const cam = shake(base, t, 2.2 * Math.exp(-(t - BLACKOUT) * 1.6));
      const k = smooth(BLACKOUT, BLACKOUT + 2.6, t);
      return { cam, env: mixEnv(NIGHT_LIVE, NIGHT_DARK, k), look: { night: 1, power: allLive(t) }, extras: { traffic: fleet(0, BLACKOUT + 1) }, fx: { black: 0.65 * Math.exp(-(t - BLACKOUT) * 6), zoom: 0.02 * Math.exp(-(t - BLACKOUT) * 4) } };
    }
    case "junction": {
      const cut = SHOTS.junction.from + 0.55;
      const cam = shotCamera(S("junction", [[12.5, 1.7, 27], [14, 1.9, 24.5]], [[16.5, 4.5, 16.5], [16.6, 4.6, 16.5]], [42, 40]), t);
      const live = t < cut ? (Math.floor(t * 18) % 3 === 0 && t > cut - 0.3 ? 0.1 : 1) : 0;
      const set = (out: Tri[], glows: Glow[]) => {
        const c = 24;
        trafficLight(out, glows, [c - 7.5, 0, c - 7.5], 0, "red", live);
        trafficLight(out, glows, [c + 7.5, 0, c - 7.5], -Math.PI / 2, "green", live);
        trafficLight(out, glows, [c + 7.5, 0, c + 7.5], Math.PI, "red", live);
        trafficLight(out, glows, [c - 7.5, 0, c + 7.5], Math.PI / 2, "green", live);
      };
      return { cam, env: live > 0.5 ? NIGHT_LIVE : NIGHT_DARK, look: { night: 1, power: () => live }, extras: { traffic: { ...fleet(0, cut + 0.2, 900), within: 3 }, walkers: { seed: 5, count: 160, within: 2 }, trees: false }, set };
    }
    case "elevator": {
      const b = LIFT_TOWER;
      const face = b.z + b.d / 2 + 1.1;
      const y = liftY(t);
      const cam = shotCamera(S("elevator", [[b.x + 9, y + 3, face + 20], [b.x - 7, y + 1, face + 17]], [[b.x, y + 1.2, face], [b.x, y + 1.2, face]], [44, 40]), t);
      const k = t < LIFT_STOP ? 1 : 0;
      const em = t < LIFT_STOP + 0.5 ? 0 : 0.6 + 0.4 * (Math.floor(t * 3) % 2);
      return { cam, env: k ? NIGHT_LIVE : NIGHT_DARK, look: { night: 1, power: () => k }, set: (out, glows, lights) => lift(out, glows, lights, t, k, em) };
    }
    case "mall": {
      const [x, z] = at("mall");
      const off = SHOTS.mall.from + 0.45;
      const lit = t < off ? 1 : 0;
      const cam = shotCamera(S("mall", [[x + 14, 3.5, z + 60], [x + 8, 5, z + 52]], [[x - 4, 8, z], [x - 2, 8, z]], [50, 48]), t);
      const set = (out: Tri[], glows: Glow[]) => {
        mall(out, glows, lit);
        // Shoppers coming out of the doors into the dark.
        for (let i = 0; i < 26; i++) {
          const r = rng(i * 17 + 3);
          const start = r() * 1.2;
          const p: V3 = [x + (r() - 0.5) * 18, 0, z + 15.5 + Math.max(0, u - start) * (1 + r() * 0.6) + r() * 3];
          person(out, { ...villager(i + 40, r() < 0.5 ? "woman" : "man"), faceless: true }, { pos: p, yaw: (r() - 0.5) * 0.8, walk: 1, phase: u * 6 + i, lod: 1 });
          if (lit < 0.5 && r() < 0.6) handLight(glows, [p[0] + 0.2, 1.25, p[2] + 0.3], hex("#cfe4ff"), 0.75, 0.6);
        }
      };
      return { cam, env: lit ? NIGHT_LIVE : NIGHT_DARK, look: { night: 1, power: () => lit }, extras: { traffic: { ...fleet(0, 0.01, 500), lights: 1 } }, set };
    }
    case "phones": {
      const [x, z] = at("mall");
      const cam = shotCamera(S("phones", [[x - 12, 1.7, z + 31], [x - 4, 1.75, z + 31.5]], [[x + 6, 1.5, z + 42], [x + 14, 1.5, z + 42]], [46, 46], lin), t);
      const set = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        mall(out, glows, 0);
        const r = rng(8);
        for (let i = 0; i < 46; i++) {
          const p: V3 = [x - 16 + r() * 34, 0, z + 33 + r() * 14];
          const L = darker(villager(i + 70, r() < 0.12 ? "child" : r() < 0.55 ? "woman" : "man"), 0.35);
          const d = Math.hypot(p[0] - cam.pos[0], p[2] - cam.pos[2]);
          if (r() < 0.8) phoneUser(out, glows, lights, L, p, Math.PI + (r() - 0.5) * 2, t, i, d < 12 ? 2 : 1);
          else person(out, { ...L, faceless: true }, { pos: p, yaw: r() * 6, lod: 1 });
        }
      };
      return { cam, env: NIGHT_DARK, look: { night: 1, power: dead }, extras: { traffic: { ...fleet(0, 0.01, 500), lights: 0.9 } }, set };
    }
    case "fuel": {
      const [x, z] = at("fuel");
      const cam = shotCamera(S("fuel", [[x - 26, 5, z - 28], [x - 30, 15, z - 30]], [[x + 60, 0, z - 20], [x + 70, 0, z - 20]], [50, 50]), t);
      const set = (out: Tri[], glows: Glow[]) => {
        fuelStation(out, glows, [x, 0, z - 10], Math.PI, 0);
        const r = rng(4);
        // The queue: nose to tail along the road, back past the edge of the frame. It creeps.
        const creep = Math.min(1, u / 4) * 2.5;
        for (let k = 0; k < 48; k++) {
          const px = x + 10 + k * 5.6 + (r() - 0.5) * 0.6 - creep;
          const kindR = r();
          const p: V3 = [px, 0, z - 21 + (r() - 0.5) * 0.4];
          if (kindR < 0.25) jeepney(out, p, -Math.PI / 2, [hex("#c63d32"), hex("#2f6db0"), hex("#e0c04a")][Math.floor(r() * 3)]);
          else if (kindR < 0.45) tricycle(out, p, -Math.PI / 2);
          else car(out, p, -Math.PI / 2, [hex("#e6e3dc"), hex("#3a3d42"), hex("#c63d32"), hex("#7f8a93"), hex("#2c3f5e")][Math.floor(r() * 5)]);
        }
        // People with jerry cans walking to the pumps.
        for (let i = 0; i < 12; i++) {
          const p: V3 = [x + 6 + i * 3.4, 0, z - 15.5];
          person(out, { ...villager(i + 90, i % 3 ? "man" : "woman"), faceless: true }, { pos: p, yaw: -Math.PI / 2, lod: 1, handR: [0.25, 0.6, 0.05] });
          box(out, { pos: poseFn({ pos: p, yaw: -Math.PI / 2 })([0.28, 0.25, 0.05]), yaw: -Math.PI / 2, size: [0.2, 0.42, 0.34] }, { color: hex("#d23a2a") });
        }
      };
      return { cam, env: MORNING, look: { night: 0, power: dead, shadows: { sun: MORNING.sun, alpha: 0.32 } }, extras: { walkers: { seed: 9, count: 120, within: 4 } }, set };
    }
    case "store": {
      const [x, z] = at("store");
      const cam = shotCamera(S("store", [[x + 22, 2.6, z - 34], [x + 15, 3.2, z - 30]], [[x - 2, 2.4, z - 16], [x - 3, 2.4, z - 16]], [50, 48]), t);
      const set = (out: Tri[], glows: Glow[]) => {
        shopfront(out, glows, [x, 0, z - 13], Math.PI, { w: 14, lit: 0, sign: hex("#2f7d4a"), shelves: 0.2 });
        box(out, { pos: [x - 3, 0, z - 15], size: [6, 0.9, 0.8] }, { color: hex("#5a4a3a") });
        for (let k = 0; k < 4; k++) jug(out, [x - 5 + k * 0.6, 0.9, z - 15], 1.1);
        // The queue down the pavement.
        for (let i = 0; i < 26; i++) {
          const r = rng(i * 7 + 1);
          const p: V3 = [x + 2 + i * 1.05, 0, z - 16.5 + (r() - 0.5) * 0.6];
          person(out, { ...villager(i + 120, r() < 0.15 ? "child" : r() < 0.6 ? "woman" : "man"), faceless: true }, { pos: p, yaw: -Math.PI / 2 + (r() - 0.5) * 0.4, lod: i < 8 ? 2 : 1, headYaw: Math.sin(t + i) * 0.3 });
        }
        // Those who got some, walking away with it.
        for (let i = 0; i < 5; i++) {
          const p: V3 = [x - 6 - u * 1.2 - i * 3, 0, z - 19 - (i % 2)];
          person(out, { ...villager(i + 160, "woman"), faceless: true }, { pos: p, yaw: -Math.PI / 2, walk: 1, phase: u * 6 + i, lod: 1, handR: [0.22, 0.85, 0.2], handL: [-0.22, 0.85, 0.2] });
          jug(out, poseFn({ pos: p, yaw: -Math.PI / 2 })([0, 0.75, 0.3]), 1.2);
        }
      };
      return { cam, env: MORNING, look: { night: 0, power: dead, shadows: { sun: MORNING.sun, alpha: 0.32 } }, extras: { walkers: { seed: 11, count: 200, within: 5 } }, set };
    }
    case "hospital": {
      const cam = shotCamera(S("hospital", [[HX - 26, 9, HZ + 50], [HX - 22, 6, HZ + 42]], [[HX, 17, HZ], [HX + 2, 16, HZ]], [52, 52]), t);
      const k = smooth(SHOTS.hospital.from, SHOTS.hospital.to, t);
      return { cam, env: mixEnv(DUSK, NIGHT_DARK, k), look: { night: 1, power: dead }, set: (out, glows) => hospital(out, glows, cam, t, 1) };
    }
    case "homes": {
      const hx = -190, hz = 222;
      const cam = shotCamera(S("homes", [[hx - 14, 1.7, hz - 16], [hx - 6, 1.75, hz - 13]], [[hx + 3, 2.2, hz + 6], [hx + 4, 2, hz + 6]], [48, 46], lin), t);
      const set = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        // A family on their step; the father's torch sweeps the street.
        const fam: [Look, V3, number][] = [
          [darker(villager(201, "man"), 0.3), [hx + 1, 0, hz - 1.5], -0.9],
          [darker(villager(202, "woman"), 0.3), [hx + 2.2, 0, hz - 0.6], -1.2],
          [darker(villager(203, "child"), 0.3), [hx + 1.6, 0, hz - 0.2], -1.1],
        ];
        fam.forEach(([L, p, yaw], i) => person(out, { ...L, faceless: true }, { pos: p, yaw, lod: 2, handR: i === 0 ? [0.2, 1.15, 0.45] : undefined, headYaw: i === 2 ? 0.4 : 0 }));
        const sweep = Math.sin(u * 0.9) * 0.9;
        const from = poseFn({ pos: fam[0][1], yaw: -0.9 })([0.2, 1.2, 0.5]);
        const to: V3 = [from[0] - 14 * Math.cos(sweep - 0.6), 0.2, from[2] - 14 * Math.sin(-sweep + 0.6) * 0.6 - 6];
        beam(out, glows, from, to, 1, 0.22);
        lights.push({ p: from, color: [255, 235, 200], intensity: 1.4, range: 6 }, { p: to, color: [255, 235, 200], intensity: 1.6, range: 9 });
        // A candle in the window behind them.
        handLight(glows, [hx + 3.4, 1.5, hz + 0.2], hex("#ff9a3c"), 0.7 + 0.2 * Math.sin(t * 13), 0.8);
        lights.push({ p: [hx + 3.4, 1.5, hz + 0.6], color: [255, 160, 80], intensity: 1.2, range: 5 });
        for (let i = 0; i < 6; i++) {
          const b: V3 = [hx - 24 + i * 12, 0, hz - 7.2];
          powerPole(out, b);
          if (i) wire(out, poleTop([b[0] - 12, 0, b[2]]), poleTop(b), 0.8);
        }
      };
      return { cam, env: NIGHT_DARK, look: { night: 1, power: dead, lamp: lampFor(0.22, t) }, set };
    }
    case "silent": {
      const cam = shotCamera(S("silent", [[-330, 120, 370], [-280, 105, 330]], [[-150, 0, 170], [-140, 0, 160]], [50, 48], lin), t);
      return { cam, env: NIGHT_DARK, look: { night: 1, power: backups, lamp: lampFor(0.14, t) } };
    }
    case "responders": {
      const rx = -165, rz = 200;
      const cam = shotCamera(S("responders", [[rx - 9, 2.2, rz - 26], [rx - 7, 2.4, rz - 20]], [[rx, 1.6, rz + 2], [rx + 1, 1.5, rz + 2]], [50, 48]), t);
      const set = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        rescueTruck(out, glows, [rx, 0, rz], Math.PI, t);
        const flash = Math.floor(t * 6) % 2;
        lights.push({ p: [rx, 2.2, rz - 2.3], color: flash ? [255, 50, 40] : [50, 100, 255], intensity: 1.1, range: 14 });
        for (let i = 0; i < 4; i++) {
          const p: V3 = [rx - 3 + i * 1.9, 0, rz - 6 - u * 1.1 - (i % 2) * 1.5];
          person(out, { ...darker(responder(300 + i), 0.2), faceless: true }, { pos: p, yaw: Math.PI + (i - 1.5) * 0.15, walk: 1, phase: u * 6 + i * 1.7, lod: 1, handR: [0.2, 1.1, 0.45] });
          const from = poseFn({ pos: p, yaw: Math.PI })([0.2, 1.12, 0.5]);
          const sw = Math.sin(t * 1.3 + i * 2) * 0.5;
          beam(out, glows, from, [from[0] + Math.sin(sw) * 8, 0.1, from[2] - 10], 0.8, 0.22);
        }
      };
      return { cam, env: NIGHT_DARK, look: { night: 1, power: dead, lamp: lampFor(0.12, t) }, set };
    }
    case "water": {
      const [x, z] = at("water");
      const cam = shotCamera(S("water", [[x + 30, 9, z + 36], [x + 22, 14, z + 40]], [[x, 1.2, z - 2], [x - 2, 1, z - 2]], [48, 46]), t);
      const set = (out: Tri[], glows: Glow[]) => {
        tent(out, [x - 9, 0, z - 6], 0, hex("#e8e2d0"), 7, 5);
        tent(out, [x + 2, 0, z - 6], 0, hex("#3b6fb0"), 7, 5);
        tent(out, [x + 12, 0, z - 6], 0, hex("#e8e2d0"), 6, 5);
        tanker(out, [x - 6, 0, z + 6], Math.PI / 2);
        for (let k = 0; k < 14; k++) jug(out, [x - 2 + (k % 7) * 0.4, 0.05 + Math.floor(k / 7) * 0.45, z + 3], 1.2);
        // The line for water: two bends round the lot.
        for (let i = 0; i < 40; i++) {
          const r = rng(i * 11 + 2);
          const s = i * 1.05;
          const p: V3 = s < 16 ? [x + 1 + s, 0, z + 3.2] : [x + 17 + (r() - 0.5) * 0.4, 0, z + 3.2 + (s - 16)];
          const yaw = s < 16 ? -Math.PI / 2 : Math.PI;
          person(out, { ...villager(i + 400, r() < 0.15 ? "child" : r() < 0.6 ? "woman" : "man"), faceless: true }, { pos: p, yaw, lod: 1, handR: [0.24, 0.6, 0.05] });
          if (r() < 0.7) jug(out, poseFn({ pos: p, yaw })([0.26, 0.2, 0.05]), 1);
        }
        for (let i = 0; i < 3; i++) person(out, { ...responder(450 + i), faceless: true }, { pos: [x - 1 + i * 1.4, 0, z + 2], yaw: 0, lod: 1, handR: [0.2, 0.9, 0.4], handL: [-0.2, 0.9, 0.4] });
      };
      return { cam, env: MORNING, look: { night: 0, power: dead, shadows: { sun: MORNING.sun, alpha: 0.32 } }, set };
    }
    case "tower": {
      const [x, z] = at("tower");
      const dies = SHOTS.tower.from + 1.7;
      const beacon = t < dies ? ((t * 1.3) % 1 < 0.5 ? 1 : 0) : t < dies + 0.35 ? (Math.floor(t * 20) % 2 ? 0.4 : 0) : 0;
      const cam = shotCamera(S("tower", [[x - 26, 1.7, z + 30], [x - 20, 3, z + 34]], [[x, 30, z], [x, 34, z]], [50, 50]), t);
      return { cam, env: mixEnv(DUSK, NIGHT_DARK, 0.6), look: { night: 1, power: dead, lamp: lampFor(0.08, t) }, set: (out, glows) => cellTower(out, glows, [x, 0, z], 42, beacon) };
    }
    case "final":
    default: {
      const cam = shotCamera(S("final", [[180, 260, 420], [320, 640, 760]], [[-10, 0, -20], [0, 0, -40]], [50, 52], (x) => 1 - (1 - x) ** 2), t);
      const set = (out: Tri[], glows: Glow[]) => {
        hospital(out, glows, cam, t, 1);
        const [wx, wz] = at("water");
        glows.push({ p: [wx, 3, wz], radius: 30, color: hex("#ffe2b0"), alpha: 0.55 }, { p: [wx, 3, wz], radius: 8, color: hex("#ffffff"), alpha: 0.6 });
      };
      return { cam, env: NIGHT_DARK, look: { night: 1, power: backups, lamp: lampFor(0.05, t), far: 1500 }, set };
    }
  }
}

/** The bay: still water to the west, catching the city's lights. */
function bay(out: Tri[]) {
  const x1 = -E - 8;
  out.push({ a: [-4000, 0.03, -3000], b: [x1, 0.03, -3000], c: [x1, 0.03, 3000], color: hex("#18304a"), mirror: 0.8, zBias: 8900 }, { a: [-4000, 0.03, -3000], b: [x1, 0.03, 3000], c: [-4000, 0.03, 3000], color: hex("#18304a"), mirror: 0.8, zBias: 8900 });
}

export function blackoutFrame(t: number): Built {
  const sc = scene(t);
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  bay(tris);
  drawCity(tris, glows, PLAN, sc.look, sc.cam, t, sc.extras);
  sc.set?.(tris, glows, lights);
  return { frame: { tris, camera: sc.cam, env: sc.env, glowsFront: glows, lights }, fx: sc.fx ?? {} };
}

export function blackoutGrade(t: number): Grade {
  const shot = shotAt(t);
  if (t < BLACKOUT) return { bloom: 0.7, contrast: 1.12, saturate: 1.15, tint: "#ff9a5a", tintAmount: 0.12 };
  switch (shot) {
    case "fuel":
    case "store":
    case "water":
      return { bloom: 0.25, contrast: 1.1, saturate: 1.05, tint: "#ffc890", tintAmount: 0.16 };
    case "hospital":
      return { bloom: 0.75, contrast: 1.15, saturate: 1.05, tint: "#5a78b0", tintAmount: 0.16 };
    default:
      return { bloom: 0.8, contrast: 1.16, saturate: 1.0, tint: "#3a5a9a", tintAmount: 0.2 };
  }
}

