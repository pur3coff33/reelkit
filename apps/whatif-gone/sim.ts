// What's on screen at reel time t in EP 03: an invented city the night everyone vanishes, then a day, a week, a year and
// a century without us. Every frame is built from t alone.
import { hex, mixRGB, norm, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { hash2, octa, rng, shotCamera, smooth, type Shot } from "../../src/kit/lowpoly/world";
import { person, villager, broadTree } from "../typhoon/models";
import { drawCity, planCity, extent, type CityLook, type CityExtras, type TrafficOpts, type WalkOpts } from "../../src/kit/whatif/city";
import { shopfront } from "../../src/kit/whatif/props";
import type { Built, Fx } from "../../src/kit/whatif/Reel";
import type { Grade } from "../../src/kit/whatif/cinema";
import { beast, cart, flock, jet, pigeons, terminal, train, tufts, vanishSparks, viaduct } from "./props";
import { SHOTS, VANISH, local, natureAt, shotAt, type ShotName } from "./timeline";

// ── The city ─────────────────────────────────────────────────────────────────────────────────────────

const PITCH = 48;
const SETS = { market: [1, 2] } as const;
const PLAN = planCity({
  seed: 303,
  n: 7,
  pitch: PITCH,
  road: 12,
  core: 150,
  peak: 170,
  houseRing: 250,
  palette: ["#c7c9cc", "#a9b4bd", "#8f9ba6", "#d8d2c4", "#7b8a99", "#b8b0a0", "#e2ddd3"].map(hex),
  housePalette: ["#e8d9b0", "#b9d3c4", "#e3b9a4", "#cfd8e0", "#efe6d6", "#d9c27a"].map(hex),
  houseRoofs: ["#8d979c", "#9a4a32", "#3e6c8f", "#7a8288", "#a35a3a"].map(hex),
  skip: (i, j) => Object.values(SETS).some(([a, b]) => a === i && b === j),
});
const E = extent(PLAN);
const RAIL_Z = 24, RAIL_H = 9;
const AIRPORT: V3 = [-760, 0, 0];

// ── Light ────────────────────────────────────────────────────────────────────────────────────────────

const MOON = norm([0.35, 0.75, 0.45]);
const NIGHT: Env = { skyTop: hex("#060b1c"), skyBottom: hex("#2e2a48"), fog: hex("#1c1c2c"), fogNear: 150, fogFar: 1300, sun: MOON, sunColor: [86, 96, 130], ambient: [48, 52, 76], stars: 0.2 };
const DARK_NIGHT: Env = { ...NIGHT, skyBottom: hex("#121a30"), fog: hex("#0c1220"), ambient: [36, 42, 64], stars: 0.85 };
const SUN = norm([0.5, 0.6, 0.4]);
const MORNING: Env = { skyTop: hex("#6a9ccc"), skyBottom: hex("#f0e0c4"), fog: hex("#e4d8c4"), fogNear: 120, fogFar: 1250, sun: SUN, sunColor: [255, 230, 190], ambient: [112, 118, 136] };
const GREY: Env = { skyTop: hex("#7d8690"), skyBottom: hex("#b8bcbe"), fog: hex("#a8aeb2"), fogNear: 80, fogFar: 900, sun: norm([0.3, 0.8, 0.3]), sunColor: [150, 152, 156], ambient: [110, 114, 122] };
const GREEN_DAY: Env = { skyTop: hex("#5a9ad0"), skyBottom: hex("#e8f0d8"), fog: hex("#d4e2cc"), fogNear: 100, fogFar: 1100, sun: SUN, sunColor: [255, 236, 200], ambient: [104, 120, 116] };
const SUNRISE: Env = { skyTop: hex("#3a5a8a"), skyBottom: hex("#ffc890"), fog: hex("#e8c8a8"), fogNear: 120, fogFar: 1300, sun: norm([-0.6, 0.22, 0.75]), sunColor: [255, 200, 150], ambient: [96, 100, 118] };

// ── People, cars, the vanishing ──────────────────────────────────────────────────────────────────────

/** When person i goes: everyone within half a second of VANISH. */
const goneAt = (i: number) => VANISH + hash2(i, 7, 3) * 0.45;
const walkers = (count = 520): WalkOpts => ({ seed: 1, count, within: 3, travel: (t, i) => Math.min(t, goneAt(i)) * (1.1 + (i % 5) * 0.1), hide: undefined });

/** Cars: driving until everyone goes, then rolling to a stop and veering a little. Frozen there ever after. */
const roll = (t: number, i: number) => {
  const v = 8 + (i % 5);
  const t0 = VANISH + hash2(i, 9, 1) * 0.3;
  return t < t0 ? v * t : v * t0 + v * 1.6 * (1 - Math.exp(-(t - t0) / 1.6));
};
const veer = (i: number) => (hash2(i, 4, 2) - 0.5) * 0.9;
const fleet = (t: number, lights = 0): TrafficOpts => ({
  seed: 7,
  count: 420,
  within: 5,
  travel: roll,
  kind: (_i, r) => (r < 0.82 ? "car" : "truck"),
  skew: (i) => veer(i) * smooth(VANISH, VANISH + 2.5, t),
  lights,
  range: 450,
  hide: (i) => {
    const n = natureAt(t);
    return n.ruin > 0.7 && hash2(i, 1, 1) < 0.85;
  },
});

/** The crowd on the corner in the first shot. */
function crowd(out: Tri[], glows: Glow[], t: number) {
  const r = rng(11);
  for (let i = 0; i < 48; i++) {
    const p0: V3 = [30.5 + r() * 4, 0, 14 + r() * 50];
    const dir = r() < 0.5 ? 1 : -1, sp = 1.1 + r() * 0.5;
    const g = goneAt(i + 1000);
    const tt = Math.min(t, g);
    const p: V3 = [p0[0], 0, p0[2] + dir * sp * tt];
    if (t < g) person(out, { ...villager(i + 900, r() < 0.12 ? "child" : r() < 0.55 ? "woman" : "man"), faceless: true }, { pos: p, yaw: dir > 0 ? 0 : Math.PI, walk: 1, phase: tt * 4 + i, lod: Math.abs(p[2] - 12) < 14 ? 2 : 1 });
    else vanishSparks(out, glows, p, t - g, i);
  }
  // People crossing.
  for (let i = 0; i < 10; i++) {
    const g = goneAt(i + 2000);
    const tt = Math.min(t, g);
    const p: V3 = [18 + ((i * 2.3 + tt * 1.3) % 12), 0, 46 + (i % 3) * 1.2];
    if (t < g) person(out, { ...villager(i + 950, i % 2 ? "woman" : "man"), faceless: true }, { pos: p, yaw: Math.PI / 2, walk: 1, phase: tt * 4 + i, lod: 1 });
    else vanishSparks(out, glows, p, t - g, i + 60);
  }
}

// ── Set pieces ───────────────────────────────────────────────────────────────────────────────────────

function airport(out: Tri[], glows: Glow[], t: number) {
  const [x, , z] = AIRPORT;
  const q = (a: V3, b: V3, c: V3, d: V3, color: RGB, zBias: number) => out.push({ a, b, c, color, zBias }, { a, b: c, c: d, color, zBias });
  q([x - 200, 0.08, z - 30], [x + 200, 0.08, z - 30], [x + 200, 0.08, z + 220], [x - 200, 0.08, z + 220], hex("#9a9c9e"), 8500);
  q([x - 300, 0.1, z + 130], [x + 300, 0.1, z + 130], [x + 300, 0.1, z + 175], [x - 300, 0.1, z + 175], hex("#3a3c40"), 8400);
  for (let k = -280; k < 280; k += 30) q([x + k, 0.12, z + 151.5], [x + k + 16, 0.12, z + 151.5], [x + k + 16, 0.12, z + 153.5], [x + k, 0.12, z + 153.5], hex("#e8e6dc"), 8300);
  terminal(out, [x, 0, z - 45]);
  const liveries = [hex("#2f6db0"), hex("#c63d32"), hex("#2f8f4a"), hex("#e0a020")];
  for (let k = 0; k < 4; k++) jet(out, glows, [x - 45 + k * 30, 0, z + 12], Math.PI, { livery: liveries[k] });
  jet(out, glows, [x + 60, 0, z + 80], Math.PI / 2 + 0.3, { livery: hex("#7a4ab0") });
  // Baggage carts left where they stopped.
  for (let k = 0; k < 5; k++) octa(out, { pos: [x - 30 + k * 4, 0.6, z + 40], size: [1.2, 0.6, 0.8] }, { color: hex("#d8b030") });
  pigeons(out, [x - 10, 0, z + 50], t, 8, 2);
}

function market(out: Tri[], glows: Glow[], t: number, green: number) {
  const [x, z] = [SETS.market[0] * PITCH, SETS.market[1] * PITCH];
  shopfront(out, glows, [x, 0, z - 2], Math.PI, { w: 30, lit: 0, sign: hex("#c63d32"), wall: hex("#e4dfd4"), shelves: 0.6 });
  octa(out, { pos: [x + 4, 1.4, z - 2.1], size: [1.6, 1.4, 0.05] }, { color: hex("#0c0e10") });
  const r = rng(21);
  for (let k = 0; k < 11; k++) cart(out, [x - 14 + r() * 28, 0, z - 6 - r() * 12], r() * 6, r() < 0.3 ? 1.4 : 0);
  pigeons(out, [x - 4, 0, z - 10], t, 14, 4);
  if (green > 0) tufts(out, [x, 0, z - 12], 26, Math.floor(green * 300), 1.2, 3);
}

/** A flooded district: still water in tiles, so cars and walls sort against it properly. */
function flood(out: Tri[], depth: number) {
  for (let x = -350; x < -170; x += 12)
    for (let z = -330; z < -170; z += 12) out.push({ a: [x, depth, z], b: [x + 12, depth, z], c: [x + 12, depth, z + 12], color: hex("#3a5866"), mirror: 0.7, alpha: 0.88 }, { a: [x, depth, z], b: [x + 12, depth, z + 12], c: [x, depth, z + 12], color: hex("#3a5866"), mirror: 0.7, alpha: 0.88 });
}

// ── Shots ────────────────────────────────────────────────────────────────────────────────────────────

type Scene = { cam: Camera; env: Env; city?: { look: CityLook; extras?: CityExtras }; set?: (out: Tri[], glows: Glow[], lights: PointLight[]) => void; fx?: Fx };
const S = (name: ShotName, pos: [V3, V3], target: [V3, V3], fov: [number, number] = [50, 50], ease?: (x: number) => number): Shot[] => [{ from: SHOTS[name].from, to: SHOTS[name].to, pos, target, fov, ease }];
const lin = (x: number) => x;

/** The grid failing, block by block, over the "grid" shot. */
const failing = (t: number): CityLook["power"] => (x, z) => {
  const k = smooth(SHOTS.grid.from + 0.2, SHOTS.grid.to - 0.3, t);
  return hash2(Math.floor(x / 140), Math.floor(z / 140), 5) > k ? 1 : 0;
};
const look = (t: number, extra: Partial<CityLook> = {}): CityLook => {
  const n = natureAt(t);
  return { night: 0, green: n.green, ruin: n.ruin, shadows: { sun: SUN, alpha: 0.3 }, ...extra };
};
const rail = (out: Tri[], glows: Glow[], lit = 0) => {
  viaduct(out, RAIL_Z, -E, E, RAIL_H);
  train(out, glows, 70, RAIL_Z, RAIL_H, 4, lit);
};

function scene(t: number): Scene {
  const shot = shotAt(t);
  const u = local(t, shot);
  const n = natureAt(t);
  switch (shot) {
    case "crowd": {
      const cam = shotCamera(S("crowd", [[33.8, 2.8, 0], [33.8, 2.9, 6]], [[26, 1.6, 52], [26, 1.6, 58]], [52, 52], lin), t);
      const set = (out: Tri[], glows: Glow[]) => {
        crowd(out, glows, t);
        rail(out, glows, 1);
        jet(out, glows, [-200 + t * 70, 260, 420], Math.PI / 2, { lights: 1 });
      };
      return { cam, env: NIGHT, city: { look: { night: 1 }, extras: { traffic: fleet(t, 1), walkers: { ...walkers(), hide: (i) => t > goneAt(i) }, streetLights: false } }, set, fx: { white: t > VANISH && t < VANISH + 0.15 ? 0.35 * (1 - (t - VANISH) / 0.15) : 0 } };
    }
    case "silence": {
      const cam = shotCamera(S("silence", [[-230, 170, -230], [-170, 140, -190]], [[20, 0, 20], [20, 0, 30]], [50, 50], lin), t);
      return { cam, env: NIGHT, city: { look: { night: 1 }, extras: { traffic: fleet(t, 1) } }, set: (out, glows) => { rail(out, glows, 1); jet(out, glows, [-200 + t * 70, 260, 420], Math.PI / 2, { lights: 1 }); } };
    }
    case "streets": {
      const cam = shotCamera(S("streets", [[30.5, 3.6, -34], [30.5, 3.9, -24]], [[22, 1.2, 40], [22, 1.2, 50]], [52, 52], lin), t);
      return { cam, env: MORNING, city: { look: look(t), extras: { traffic: { ...fleet(t), clear: [26, -40, 34, -14] } } }, set: (out, glows) => { rail(out, glows); pigeons(out, [23, 0, 8], t, 12, 1); } };
    }
    case "airport": {
      const [x, , z] = AIRPORT;
      const cam = shotCamera(S("airport", [[x + 70, 14, z + 95], [x + 50, 11, z + 80]], [[x - 10, 4, z], [x - 15, 4, z]], [50, 50]), t);
      return { cam, env: MORNING, set: (out, glows) => airport(out, glows, t) };
    }
    case "train": {
      const cam = shotCamera(S("train", [[104, 13.5, 28.5], [97, 12.8, 28.8]], [[40, 11.2, RAIL_Z], [38, 11.2, RAIL_Z]], [50, 48]), t);
      return { cam, env: MORNING, city: { look: look(t), extras: { traffic: { ...fleet(t), clear: [66, -10, 78, 20] } } }, set: (out, glows) => rail(out, glows) };
    }
    case "dog": {
      const dx = -252 + u * 1.3;
      const cam: Camera = { pos: [dx - 4.2, 0.75, 169.6], target: [dx + 3, 0.4, 171.7], fov: 46 };
      return { cam, env: MORNING, city: { look: look(t), extras: { traffic: { ...fleet(t), clear: [-275, 160, -230, 180] } } }, set: (out) => beast(out, "dog", [dx, 0, 171.5], Math.PI / 2, 4, u * 9, 1, 0.3 + 0.2 * Math.sin(u * 2)) };
    }
    case "grid": {
      const cam = shotCamera(S("grid", [[320, 300, 320], [270, 260, 290]], [[0, 0, 0], [0, 0, -10]], [50, 50], lin), t);
      const k = smooth(SHOTS.grid.from, SHOTS.grid.to, t);
      return { cam, env: k > 0.6 ? DARK_NIGHT : NIGHT, city: { look: { night: 1, power: failing(t) }, extras: { traffic: fleet(t) } }, set: (out, glows) => rail(out, glows) };
    }
    case "dark": {
      const cam = shotCamera(S("dark", [[24, 32, -150], [24, 27, -105]], [[24, 10, 60], [24, 8, 70]], [52, 52], lin), t);
      return { cam, env: GREY, city: { look: look(t, { shadows: undefined }), extras: { traffic: fleet(t) } }, set: (out, glows) => { rail(out, glows); flock(out, [24, 40, 20], t, 18, 20); } };
    }
    case "market": {
      const [x, z] = [SETS.market[0] * PITCH, SETS.market[1] * PITCH];
      const cam = shotCamera(S("market", [[x - 12, 2.2, z - 28], [x - 8, 2.6, z - 26]], [[x + 2, 2.6, z - 4], [x + 3, 2.8, z - 4]], [50, 48]), t);
      return { cam, env: GREY, city: { look: look(t, { shadows: undefined }), extras: { traffic: fleet(t) } }, set: (out, glows) => market(out, glows, t, n.green) };
    }
    case "strays": {
      const cam = shotCamera(S("strays", [[25.8, 0.9, 14], [25.8, 1.0, 18]], [[24, 0.8, 50], [24, 0.8, 54]], [48, 48], lin), t);
      const set = (out: Tri[], glows: Glow[]) => {
        rail(out, glows);
        const pack: ["dog" | "cat", number, number][] = [["dog", 0, 0], ["dog", -1.2, 1.6], ["dog", 1.1, 2.4], ["dog", -0.4, 3.8], ["cat", 2.4, 1], ["dog", 0.8, 5], ["cat", -2.2, 4.2]];
        pack.forEach(([kind, dx, dz], i) => beast(out, kind, [24 + dx, 0, 32 + dz - u * 3.2], Math.PI, 10 + i, u * 11 + i, 1, i === 0 ? 0.1 : 0.25));
      };
      return { cam, env: GREY, city: { look: look(t, { shadows: undefined }), extras: { traffic: { ...fleet(t), clear: [17, 0, 31, 70] } } }, set };
    }
    case "cracks": {
      const cam = shotCamera(S("cracks", [[21, 0.7, 26], [21.6, 0.8, 30]], [[24, 0.1, 40], [24, 0.1, 42]], [46, 46], lin), t);
      const set = (out: Tri[], glows: Glow[]) => {
        rail(out, glows);
        tufts(out, [23, 0, 38], 10, 40, 0.9, 7);
        const r = rng(4);
        for (let k = 0; k < 14; k++) {
          const p: V3 = [19 + r() * 10, 0.07, 32 + r() * 14];
          const a = r() * 6, l = 1 + r() * 2.5;
          out.push({ a: p, b: [p[0] + Math.cos(a) * l, 0.07, p[2] + Math.sin(a) * l], c: [p[0] + Math.cos(a) * l + 0.06, 0.07, p[2] + Math.sin(a) * l + 0.06], color: hex("#1a1c1e"), zBias: 8000 });
        }
        // A burst main, pooling.
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2, b = ((k + 1) / 6) * Math.PI * 2, R = 2.2 + u * 0.3;
          out.push({ a: [26, 0.08, 44], b: [26 + Math.cos(a) * R, 0.08, 44 + Math.sin(a) * R * 0.8], c: [26 + Math.cos(b) * R, 0.08, 44 + Math.sin(b) * R * 0.8], color: hex("#6a7a86"), mirror: 0.8, zBias: 7900 });
        }
      };
      return { cam, env: GREY, city: { look: look(t, { shadows: undefined }), extras: { traffic: { ...fleet(t), clear: [17, 10, 31, 60] }, trees: true } }, set };
    }
    case "grass": {
      const cam = shotCamera(S("grass", [[25, 1.5, -12], [25, 1.6, -5]], [[24, 1.4, 40], [24, 1.5, 46]], [50, 50], lin), t);
      const set = (out: Tri[], glows: Glow[]) => {
        rail(out, glows);
        tufts(out, [24, 0, 20], 20, 160, 1.4, 9);
        for (let i = 0; i < 3; i++) beast(out, "deer", [22.5 + i * 2.2, 0, 13 + i * 3 - u * 1.4], Math.PI + (i - 1) * 0.15, 30 + i, u * 6 + i, 1, i === 1 ? 0.6 * Math.max(0, Math.sin(u * 1.5)) : 0);
      };
      return { cam, env: GREEN_DAY, city: { look: look(t), extras: { traffic: { ...fleet(t), clear: [17, -20, 31, 50] } } }, set };
    }
    case "flood": {
      const cam = shotCamera(S("flood", [[-150, 26, -130], [-162, 19, -146]], [[-265, 0, -250], [-262, 0, -252]], [50, 50], lin), t);
      return { cam, env: GREY, city: { look: look(t, { shadows: undefined }), extras: { traffic: fleet(t) } }, set: (out, glows) => { rail(out, glows); flood(out, 0.75); flock(out, [-230, 30, -220], t, 14, 16); } };
    }
    case "decay": {
      const cam = shotCamera(S("decay", [[-170, 95, 160], [-110, 75, 185]], [[0, 25, 0], [10, 20, 0]], [50, 50], lin), t);
      return { cam, env: GREEN_DAY, city: { look: look(t), extras: { traffic: fleet(t) } }, set: (out, glows) => rail(out, glows) };
    }
    case "jungle": {
      const cam = shotCamera(S("jungle", [[24, 44, -210], [24, 32, -130]], [[24, 22, 60], [24, 18, 70]], [52, 52], lin), t);
      return { cam, env: GREEN_DAY, city: { look: look(t), extras: { traffic: fleet(t) } }, set: (out, glows) => { rail(out, glows); flock(out, [24, 50, -40], t, 30, 26, hex("#2b2d33"), 8); } };
    }
    case "herd": {
      const cam = shotCamera(S("herd", [[21, 2.2, -16], [22, 2.2, -12]], [[24, 1.4, 12], [24, 1.4, 14]], [50, 50], lin), t);
      const set = (out: Tri[], glows: Glow[]) => {
        rail(out, glows);
        tufts(out, [24, 0, -2], 24, 200, 1.8, 12);
        for (let i = 0; i < 7; i++) beast(out, "deer", [12 + i * 2.8 + u * 2.2, 0, 4 + (i % 3) * 2.2], Math.PI / 2, 40 + i, u * 7 + i, 1, i % 3 === 2 ? 0.5 : 0);
        beast(out, "boar", [30 - u * 1.2, 0, -6], -Math.PI / 2, 60, u * 8, 1, 0.5);
        for (let k = 0; k < 6; k++) broadTree(out, [12 + k * 5, 0, 14 + (k % 2) * 3], 70 + k, 0, 1);
      };
      return { cam, env: GREEN_DAY, city: { look: look(t), extras: { traffic: { ...fleet(t), clear: [10, -30, 38, 20] } } }, set };
    }
    case "reclaimed":
    default: {
      const cam = shotCamera(S("reclaimed", [[-250, 170, 290], [-330, 250, 380]], [[0, 20, 0], [0, 10, 0]], [50, 52], lin), t);
      return { cam, env: SUNRISE, city: { look: look(t, { shadows: { sun: SUNRISE.sun, alpha: 0.25 } }), extras: { traffic: fleet(t) } }, set: (out, glows) => { rail(out, glows); flock(out, [0, 80, 60], t, 40, 40, hex("#2b2d33"), 9); flock(out, [-60, 60, 140], t, 20, 22, hex("#3a3030"), 10); } };
    }
  }
}

export function goneFrame(t: number): Built {
  const sc = scene(t);
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  if (sc.city) drawCity(tris, glows, PLAN, sc.city.look, sc.cam, t, sc.city.extras);
  sc.set?.(tris, glows, lights);
  return { frame: { tris, camera: sc.cam, env: sc.env, glowsFront: glows, lights }, fx: sc.fx ?? {} };
}

export function goneGrade(t: number): Grade {
  switch (shotAt(t)) {
    case "crowd":
    case "silence":
    case "grid":
      return { bloom: 0.75, contrast: 1.14, saturate: 1.1, tint: "#5a6ab0", tintAmount: 0.14 };
    case "dark":
    case "market":
    case "strays":
    case "cracks":
    case "flood":
      return { bloom: 0.25, contrast: 1.12, saturate: 0.72, tint: "#8a9aa0", tintAmount: 0.16 };
    case "reclaimed":
      return { bloom: 0.55, contrast: 1.1, saturate: 1.12, tint: "#ffb878", tintAmount: 0.16 };
    case "grass":
    case "decay":
    case "jungle":
    case "herd":
      return { bloom: 0.35, contrast: 1.1, saturate: 1.12, tint: "#b8e08a", tintAmount: 0.1 };
    default:
      return { bloom: 0.3, contrast: 1.1, saturate: 1.0, tint: "#ffd8a8", tintAmount: 0.1 };
  }
}

export { mixRGB };
