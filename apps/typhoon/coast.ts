// Santa Lucia, a fictional town on the east coast of Samar: a bay, a beach, a main road, a school on the rise behind the
// town, jungle hills behind that. One world for the whole story: surge, wind, damage, mud and rebuilding are all inputs,
// so the same houses are boarded up, then wrecked, then rebuilt. The sea is at x < 0, inland is +x, 1 unit = 1 metre.
import { dot, hex, mixRGB, norm, sub, type Camera, type Env, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, hash2, makeGrid, noise2, rng, sampleGrid, smooth, tetra, box, octa, vary } from "../../src/kit/lowpoly/world";
import { bangka, broadTree, car, jeepney, limb, lodFor, palmTree, phHouse, poleTop, poly, powerPole, tinSheet, truck, tricycle, wire, type HouseSpec, type HouseState, type HouseStyle } from "./models";

export type CoastState = {
  t: number;
  /** How far the whole sea has risen (metres). */
  surge: number;
  /** Height of the swell. */
  swell: number;
  /** 0…1, blowing inland (+x). */
  wind: number;
  damage: number;
  boarded: number;
  rebuild: number;
  /** Mud left on everything. */
  mud: number;
  /** 0 clear blue … 1 brown floodwater. */
  flood: number;
  /** A breaking wave moving inland: where its crest is and how tall. */
  ridge?: { x: number; amp: number };
  poleFall: number;
  palmFall: number;
  /** Boats at the waterline, or hauled up the beach and tied. */
  hauled: boolean;
  /** How far up the beach they are, when it matters (0…1). Overrides `hauled`. */
  haul?: number;
  /** Cars caught on the main road. */
  stranded: boolean;
  bridgeDown: boolean;
  /** Scatter debris on the ground. */
  debris: number;
  /** How far the camera renders (metres). */
  far: number;
};

export const CALM: CoastState = { t: 0, surge: 0, swell: 0.28, wind: 0, damage: 0, boarded: 0, rebuild: 0, mud: 0, flood: 0, poleFall: 0, palmFall: 0, hauled: false, stranded: false, bridgeDown: false, debris: 0, far: 900 };

// ── Light ────────────────────────────────────────────────────────────────────────────────────────────

const dir = (x: number, y: number, z: number): V3 => norm([x, y, z]);

export const SKIES = {
  dawn: { skyTop: hex("#38658f"), skyBottom: hex("#f4c79a"), fog: hex("#e8c6a8"), fogNear: 120, fogFar: 1100, sun: dir(-0.75, 0.32, 0.25), sunColor: [255, 214, 170], ambient: [122, 132, 150] } as Env,
  morning: { skyTop: hex("#3d82bf"), skyBottom: hex("#c6e2ee"), fog: hex("#cfe3ea"), fogNear: 150, fogFar: 1200, sun: dir(-0.4, 0.75, 0.3), sunColor: [255, 244, 224], ambient: [126, 138, 150] } as Env,
  gold: { skyTop: hex("#4a78a6"), skyBottom: hex("#f2c98c"), fog: hex("#e8cda2"), fogNear: 120, fogFar: 1000, sun: dir(0.6, 0.38, 0.35), sunColor: [255, 214, 150], ambient: [118, 118, 124] } as Env,
  overcast: { skyTop: hex("#5a6672"), skyBottom: hex("#a4adb2"), fog: hex("#9aa4a9"), fogNear: 60, fogFar: 640, sun: dir(-0.2, 0.9, 0.2), sunColor: [90, 94, 98], ambient: [214, 220, 226] } as Env,
  orange: { skyTop: hex("#4f4348"), skyBottom: hex("#e0813e"), fog: hex("#c9794a"), fogNear: 70, fogFar: 640, sun: dir(0.7, 0.2, 0.3), sunColor: [255, 170, 100], ambient: [110, 92, 92] } as Env,
  storm: { skyTop: hex("#1c2329"), skyBottom: hex("#566169"), fog: hex("#4c565d"), fogNear: 18, fogFar: 300, sun: dir(-0.2, 0.9, 0.1), sunColor: [60, 66, 72], ambient: [158, 168, 178] } as Env,
  night: { skyTop: hex("#05080d"), skyBottom: hex("#1a2530"), fog: hex("#141d26"), fogNear: 20, fogFar: 300, sun: dir(0.2, 0.8, 0.3), sunColor: [46, 54, 70], ambient: [44, 50, 62] } as Env,
  drizzle: { skyTop: hex("#616b73"), skyBottom: hex("#b5bcbd"), fog: hex("#a9b0b1"), fogNear: 50, fogFar: 520, sun: dir(0.1, 0.9, 0.3), sunColor: [96, 98, 98], ambient: [222, 226, 228] } as Env,
  harsh: { skyTop: hex("#2f77bd"), skyBottom: hex("#d9ebf1"), fog: hex("#dcebf0"), fogNear: 180, fogFar: 1300, sun: dir(0.3, 0.86, 0.3), sunColor: [255, 248, 232], ambient: [176, 184, 190] } as Env,
};

// ── Land and water ───────────────────────────────────────────────────────────────────────────────────

export const shoreX = (z: number) => -34 * (z / 170) ** 2 + 7 * fbm(z * 0.013, 3.1, 3, 2);
export const RIVER_Z = -122;
export const ROAD_X = 80;
export const SCHOOL: V3 = [178, 0, 40];

export function groundH(x: number, z: number) {
  const d = x - shoreX(z);
  let h: number;
  if (d < 0) h = Math.max(-11, d * 0.09) + fbm(x * 0.03, z * 0.03, 2, 5) * 0.6;
  else {
    h = Math.min(1.6, d * 0.058) + Math.max(0, d - 28) * 0.004;
    if (d > 30) h += fbm(x * 0.02, z * 0.02, 2, 9) * 0.5 * smooth(30, 60, d);
    h += smooth(128, 160, d) * 10;
    h += smooth(214, 340, d) * (64 + fbm(x * 0.01, z * 0.012, 4, 6) * 110);
  }
  const headland = smooth(158, 250, Math.abs(z));
  if (headland > 0) h += headland * smooth(-60, 20, d) * (16 + fbm(x * 0.02, z * 0.02, 3, 12) * 34);
  // The river channel, from the hills to the sea.
  if (d > -20) h -= 3.4 * Math.exp(-(((z - RIVER_Z - 6 * Math.sin(x * 0.02)) / 8) ** 2)) * smooth(-20, 6, d) * (1 - smooth(200, 290, d));
  return h;
}

export function waterH(x: number, z: number, S: CoastState) {
  const chop = 1 + S.wind * 1.5;
  let h = S.surge;
  h += S.swell * (Math.sin(0.09 * x + 0.75 * S.t + 1.6 * Math.sin(0.018 * z)) + 0.55 * Math.sin(0.17 * z - 0.95 * S.t + 0.05 * x)) * chop;
  h += S.swell * 0.35 * Math.sin(0.37 * x + 0.31 * z + 1.7 * S.t) * chop;
  if (S.ridge) {
    const d = x - (S.ridge.x + 7 * Math.sin(z * 0.03));
    h += S.ridge.amp * (d > 0 ? Math.exp(-((d / 9) ** 2)) : Math.exp(-((d / 34) ** 2)));
  }
  return h;
}

const GRID = makeGrid(-240, -330, 120, 132, 5, 8);
const GROUND = sampleGrid(GRID, groundH);

const SAND = hex("#e6d3a0"), WET = hex("#b9a678"), GRASS = hex("#6aa24a"), GRASS2 = hex("#5a9344"), JUNGLE = hex("#2f6a35"), JUNGLE2 = hex("#3f7a3a"), ROCK = hex("#7c7a6f");
const SEABED = hex("#4c7c80"), MUD = hex("#6b5a43");
const DEEP = hex("#0f5f92"), SHALLOW = hex("#37b4c6"), FOAM = hex("#eef8f8"), BROWN = hex("#7a6246"), BROWN2 = hex("#5e4b37");

function groundColor(cx: number, cz: number, h: number, seed: number): RGB {
  const d = cx - shoreX(cz);
  let c: RGB;
  if (d < -1) c = SEABED;
  else if (d < 3) c = WET;
  else if (d < 27 + 4 * Math.sin(cz * 0.04)) c = SAND;
  else if (h > 22) c = hash2(seed, 2) > 0.5 ? JUNGLE : JUNGLE2;
  else if (h > 13 && d > 190) c = mixRGB(GRASS2, JUNGLE, 0.6);
  else c = hash2(seed, 3) > 0.5 ? GRASS : GRASS2;
  if (h > 60 && hash2(seed, 5) > 0.75) c = ROCK;
  return vary(c, seed, 0.08);
}

// Each cell's two faces keep their colours from frame to frame.
const CELLS = GRID.nx * GRID.nz;
const FACE_COLORS = new Float32Array(CELLS * 6);
{
  const w = GRID.nx + 1;
  for (let j = 0; j < GRID.nz; j++)
    for (let i = 0; i < GRID.nx; i++) {
      const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
      const pair = (i + j) % 2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]];
      pair.forEach(([p, q, r], f) => {
        const cx = (GROUND.X[p] + GROUND.X[q] + GROUND.X[r]) / 3, cz = (GROUND.Z[p] + GROUND.Z[q] + GROUND.Z[r]) / 3, h = (GROUND.H[p] + GROUND.H[q] + GROUND.H[r]) / 3;
        const col = groundColor(cx, cz, h, p * 3 + q);
        FACE_COLORS.set(col, (j * GRID.nx + i) * 6 + f * 3);
      });
    }
}

type See = (p: V3, margin?: number) => boolean;

function seer(cam: Camera, far: number): See {
  const f = norm(sub(cam.target, cam.pos));
  return (p, margin = 8) => {
    const d = sub(p, cam.pos);
    if (d[0] * d[0] + d[1] * d[1] + d[2] * d[2] > far * far) return false;
    return dot(d, f) > -margin;
  };
}

const GROUND_BIAS = 6, ROAD_BIAS = 5.8, WATER_BIAS = 5.5;

function emitLand(out: Tri[], cam: Camera, S: CoastState, see: See) {
  const w = GRID.nx + 1;
  const W = new Float32Array(GROUND.H.length);
  for (let k = 0; k < W.length; k++) W[k] = waterH(GROUND.X[k], GROUND.Z[k], S);
  const v = (k: number, H: ArrayLike<number>): V3 => [GROUND.X[k], H[k], GROUND.Z[k]];
  for (let j = 0; j < GRID.nz; j++)
    for (let i = 0; i < GRID.nx; i++) {
      const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
      if (!see([GROUND.X[a], GROUND.H[a], GROUND.Z[a]], 14)) continue;
      const pair = (i + j) % 2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]];
      for (let f = 0; f < 2; f++) {
        const [p, q, r] = pair[f];
        const wet = (W[p] > GROUND.H[p] + 0.03 ? 1 : 0) + (W[q] > GROUND.H[q] + 0.03 ? 1 : 0) + (W[r] > GROUND.H[r] + 0.03 ? 1 : 0);
        const fi = (j * GRID.nx + i) * 6 + f * 3;
        const cx = (GROUND.X[p] + GROUND.X[q] + GROUND.X[r]) / 3;
        if (wet < 3) {
          let col: RGB = [FACE_COLORS[fi], FACE_COLORS[fi + 1], FACE_COLORS[fi + 2]];
          const h = (GROUND.H[p] + GROUND.H[q] + GROUND.H[r]) / 3;
          if (S.mud > 0 && h < 8.5) col = mixRGB(col, vary(MUD, p, 0.12), S.mud * 0.85);
          out.push({ a: v(p, GROUND.H), b: v(q, GROUND.H), c: v(r, GROUND.H), color: col, zBias: GROUND_BIAS });
        }
        if (wet > 0) {
          const depth = (W[p] + W[q] + W[r] - GROUND.H[p] - GROUND.H[q] - GROUND.H[r]) / 3;
          const cz = (GROUND.Z[p] + GROUND.Z[q] + GROUND.Z[r]) / 3;
          let col = mixRGB(SHALLOW, DEEP, smooth(0.3, 6, depth));
          if (S.flood > 0) col = mixRGB(col, mixRGB(BROWN, BROWN2, hash2(p, q, 3)), S.flood * (0.5 + 0.5 * smooth(-90, 10, cx - shoreX(cz))));
          const steep = Math.max(Math.abs(W[p] - W[q]), Math.abs(W[q] - W[r]), Math.abs(W[p] - W[r]));
          // Foam along the waterline and on broken crests.
          const edge = 1 - smooth(0.04, 0.5 + S.wind * 0.8, depth);
          const churn = S.wind > 0.2 ? noise2(cx * 0.14 + S.t * 0.8, cz * 0.14, 4) * S.wind : 0;
          const crest = smooth(2.4, 4, steep);
          // Foam streaks and edges, not a white sheet: open water keeps its colour, and only a breaking crest goes white.
          const lace = S.wind > 0.4 ? 0.34 : 0.9;
          const froth = Math.max(edge * (0.55 + 0.45 * Math.sin(S.t * 1.4 + cz * 0.2)) * lace, crest * 0.8, churn > 0.72 ? (churn - 0.72) * 1.2 : 0);
          if (froth > 0) col = mixRGB(col, S.flood > 0.5 ? hex("#c9bda6") : FOAM, Math.min(0.9, froth));
          // The face of a breaking wave reads dark, its top pure white.
          if (S.ridge) {
            const d = cx - (S.ridge.x + 7 * Math.sin(cz * 0.03));
            const near = Math.exp(-((d / 11) ** 2));
            col = mixRGB(col, d > 2 ? hex("#123a4e") : FOAM, near * Math.min(1, S.ridge.amp / 4) * (d > 2 ? 0.75 : 0.96));
          }
          out.push({ a: v(p, W), b: v(q, W), c: v(r, W), color: vary(col, p + q * 3, 0.05), zBias: WATER_BIAS, mirror: S.flood > 0.7 ? 0.3 : 0.75 });
        }
      }
    }
  // The open sea beyond the grid, coarse and flat, out to the horizon.
  const cell = 240;
  for (let x = -3000; x < -240; x += cell)
    for (let z = -1680; z < 1680; z += cell) {
      if (!see([x + cell / 2, 0, z + cell / 2], cell * 1.5)) continue;
      const col = vary(mixRGB(DEEP, BROWN2, S.flood * 0.5), Math.round(x * 3 + z), 0.03);
      const y = S.surge;
      out.push({ a: [x, y, z], b: [x + cell, y, z], c: [x + cell, y, z + cell], color: col, zBias: WATER_BIAS }, { a: [x, y, z], b: [x + cell, y, z + cell], c: [x, y, z + cell], color: col, zBias: WATER_BIAS });
    }
}

// ── The town ─────────────────────────────────────────────────────────────────────────────────────────

const WALLS = ["#f0e4c8", "#e2b98a", "#d6e2d2", "#efd0c6", "#c4dbe3", "#f5efe0", "#e8d07a", "#bcd6a8", "#e0b6c0"].map(hex);
const TIN = ["#b9513a", "#8f9aa0", "#4d6f8c", "#a8653a", "#7e878c", "#3f7a6a"].map(hex);
const NIPA = hex("#a68b56"), BAMBOO_WALL = hex("#c5ad78");

type Town = { houses: HouseSpec[]; palms: { x: number; z: number; seed: number }[]; trees: { x: number; z: number; seed: number }[]; poles: V3[]; boats: { x: number; z: number; yaw: number; stripe: RGB }[] };

const onRoad = (x: number, z: number, m = 0) => Math.abs(x - ROAD_X) < 5.5 + m || (Math.abs(z - 40) < 4 + m && x > ROAD_X && x < 172) || (Math.abs(z + 40) < 3.5 + m && x > 30 && x < ROAD_X) || (Math.abs(z - 20) < 3 + m && x > 8 && x < ROAD_X);

let TOWN: Town | null = null;
export function town(): Town {
  if (TOWN) return TOWN;
  const r = rng(2026);
  const houses: HouseSpec[] = [];
  const CLEARINGS: [number, number, number][] = [[shoreX(20) + 33, 22, 24], [52, 112, 15]];
  const clearing = (x: number, z: number) => CLEARINGS.some(([cx, cz, rad]) => Math.hypot(x - cx, z - cz) < rad);
  const clear = (x: number, z: number, s: number) => !clearing(x, z) && !onRoad(x, z, s * 0.6) && !houses.some((h) => Math.hypot(h.x - x, h.z - z) < s + Math.max(h.w, h.d) * 0.6) && Math.abs(z - RIVER_Z) > 16;
  for (let tries = 0; houses.length < 92 && tries < 6000; tries++) {
    const z = -205 + r() * 400;
    const x = shoreX(z) + 32 + r() * 104;
    const near = x - shoreX(z) < 52;
    const style: HouseStyle = near ? (r() < 0.6 ? "stilt" : "concrete") : r() < 0.14 ? "two" : r() < 0.08 ? "store" : r() < 0.25 ? "stilt" : "concrete";
    const w = style === "two" ? 7 + r() * 2 : 5 + r() * 2.4, d = style === "two" ? 7.5 + r() * 2 : 5.2 + r() * 2.5;
    if (!clear(x, z, 8.5) || groundH(x, z) > 7) continue;
    // Each house faces its nearest road.
    const yaw = (x < ROAD_X ? Math.PI / 2 : -Math.PI / 2) + (r() - 0.5) * 0.14;
    houses.push({
      x, z, yaw, w, d, h: style === "stilt" ? 2.3 : 2.9, style, seed: houses.length + 1,
      wall: style === "stilt" ? BAMBOO_WALL : WALLS[Math.floor(r() * WALLS.length)],
      roof: style === "stilt" ? NIPA : TIN[Math.floor(r() * TIN.length)],
    });
  }
  // The porch where Tomas talks to Manang Pacing stays clear of trees.
  const porchHouse = houses.filter((p) => p.style === "concrete" && p.x < ROAD_X && p.x > 45 && p.z > 45).sort((a, b) => b.x - a.x)[0];
  if (porchHouse) CLEARINGS.push([porchHouse.x + porchHouse.d / 2 + 1.5, porchHouse.z, 8]);
  const palms: Town["palms"] = [];
  for (let i = 0; i < 150; i++) {
    const z = -280 + r() * 560, inland = r();
    const x = shoreX(z) + (inland < 0.55 ? 22 + r() * 16 : 30 + r() * 150);
    if (clearing(x, z) || onRoad(x, z, 1) || houses.some((h) => Math.hypot(h.x - x, h.z - z) < 5)) continue;
    palms.push({ x, z, seed: 1000 + i });
  }
  const trees: Town["trees"] = [];
  for (let i = 0; i < 90; i++) {
    const x = 140 + r() * 180, z = -290 + r() * 580;
    if (Math.hypot(x - SCHOOL[0], z - SCHOOL[2]) < 36 || onRoad(x, z, 2)) continue;
    trees.push({ x, z, seed: 2000 + i });
  }
  const poles: V3[] = [];
  for (let z = -300; z <= 300; z += 28) poles.push([ROAD_X + 6.5, groundH(ROAD_X + 6.5, z), z]);
  const boats: Town["boats"] = [];
  const stripes = ["#1f6fb5", "#c8402f", "#2f8f6b", "#d9a441", "#1f6fb5", "#7a5a9a"].map(hex);
  for (let i = 0; i < 9; i++) boats.push({ x: 0, z: -110 + i * 25 + r() * 8 + (i >= 5 ? 22 : 0), yaw: Math.PI / 2 + (r() - 0.5) * 0.5, stripe: stripes[i % stripes.length] });
  TOWN = { houses, palms, trees, poles, boats };
  return TOWN;
}

/** Tomas's boat and the palm it is tied to. */
export const BOAT_Z = 20;
export const TIE_PALM: V3 = [shoreX(BOAT_Z) + 33, groundH(shoreX(BOAT_Z) + 33, BOAT_Z + 5), BOAT_Z + 5];
export const BOAT_HAULED: V3 = [TIE_PALM[0] - 7, groundH(TIE_PALM[0] - 7, BOAT_Z), BOAT_Z];

const clipBelow = (out: Tri[], from: number, y: number) => {
  // Cuts everything added since `from` at the water's surface.
  const kept: Tri[] = [];
  for (let i = from; i < out.length; i++) {
    const t = out[i];
    const pts = [t.a, t.b, t.c];
    const inside = pts.filter((p) => p[1] >= y).length;
    if (inside === 3) kept.push(t);
    else if (inside > 0) {
      const poly2: V3[] = [];
      for (let k = 0; k < 3; k++) {
        const a = pts[k], b = pts[(k + 1) % 3];
        const ain = a[1] >= y, bin = b[1] >= y;
        if (ain) poly2.push(a);
        if (ain !== bin) {
          const u = (y - a[1]) / (b[1] - a[1]);
          poly2.push([a[0] + (b[0] - a[0]) * u, y, a[2] + (b[2] - a[2]) * u]);
        }
      }
      for (let k = 1; k < poly2.length - 1; k++) kept.push({ ...t, a: poly2[0], b: poly2[k], c: poly2[k + 1] });
    }
  }
  out.length = from;
  for (const t of kept) out.push(t);
};

/** Draws `build`, then trims it at the local water level if the water has reached it. */
function wetAware(out: Tri[], x: number, z: number, g: number, S: CoastState, build: () => void) {
  const from = out.length;
  build();
  const y = S.surge + (S.flood > 0.3 ? 0 : 0) + waterH(x, z, { ...S, surge: 0, ridge: S.ridge });
  if (y > g + 0.02) clipBelow(out, from, y);
}

function school(out: Tri[], see: See, S: CoastState) {
  const [x0, , z0] = SCHOOL;
  if (!see([x0, 12, z0], 40)) return;
  const g = groundH(x0, z0);
  const CREAM = hex("#eee4c6"), GREEN = hex("#3f7a56"), TRIM = hex("#b5563a");
  const L = 44, D = 9;
  for (let lv = 0; lv < 2; lv++) {
    const y = g + lv * 3.3;
    box(out, { pos: [x0, y, z0], size: [D, 3.3, L] }, (i) => ({ color: i === 4 ? mixRGB(CREAM, TRIM, 0.04) : CREAM, zBias: 4 }));
    box(out, { pos: [x0 - D / 2 - 1.1, y + 3.1, z0], size: [2.2, 0.16, L] }, { color: hex("#c9bfa4") });
    box(out, { pos: [x0 - D / 2 - 2.15, y + (lv ? 3.2 : 3.2), z0], size: [0.1, lv ? 1 : 0.1, L] }, { color: TRIM });
    for (let i = 0; i < 8; i++) {
      const wz = z0 - L / 2 + 3 + i * 5.4, fx = x0 - D / 2 - 0.02;
      poly(out, [[fx, y + 1.0, wz - 1.2], [fx, y + 1.0, wz + 1.2], [fx, y + 2.5, wz + 1.2], [fx, y + 2.5, wz - 1.2]], hex("#24303c"), { zBias: -0.05 });
      if (i % 3 === 1 && lv === 0) poly(out, [[fx, y, wz - 0.6], [fx, y, wz + 0.6], [fx, y + 2.3, wz + 0.6], [fx, y + 2.3, wz - 0.6]], hex("#5c3d2a"), { zBias: -0.06 });
    }
  }
  for (let i = 0; i < 12; i++) box(out, { pos: [x0 - D / 2 - 2.1, g, z0 - L / 2 + i * 4], size: [0.26, 3.2, 0.26] }, { color: CREAM });
  const top = g + 6.6;
  poly(out, [[x0 - D / 2 - 2.4, top, z0 - L / 2 - 1], [x0 - D / 2 - 2.4, top, z0 + L / 2 + 1], [x0, top + 2.6, z0 + L / 2 + 1], [x0, top + 2.6, z0 - L / 2 - 1]], GREEN);
  poly(out, [[x0 + D / 2 + 1, top, z0 - L / 2 - 1], [x0 + D / 2 + 1, top, z0 + L / 2 + 1], [x0, top + 2.6, z0 + L / 2 + 1], [x0, top + 2.6, z0 - L / 2 - 1]], mixRGB(GREEN, [0, 0, 0], 0.12));
  // The flag, in the school yard.
  const fx = x0 - 22, fz = z0;
  const fg = groundH(fx, fz);
  limb(out, [fx, fg, fz], [fx, fg + 11, fz], 0.07, 0.05, hex("#d8d8d8"), 4);
  if (S.damage < 0.6) {
    const flap = (k: number) => Math.sin(S.t * (2 + S.wind * 9) - k * 3) * (0.2 + S.wind * 0.3);
    const P = (k: number, y: number): V3 => [fx + k * 2.4 * (S.wind > 0.1 ? 1 : 0.55), fg + 10.9 - y - (S.wind > 0.1 ? 0 : k * 1.1), fz + flap(k) * k];
    for (let i = 0; i < 4; i++) {
      const a = i / 4, b = (i + 1) / 4;
      poly(out, [P(a, 0), P(b, 0), P(b, 0.65), P(a, 0.65)], hex("#2c4f9e"));
      poly(out, [P(a, 0.65), P(b, 0.65), P(b, 1.3), P(a, 1.3)], hex("#c63b36"));
    }
    out.push({ a: P(0, 0), b: P(0, 1.3), c: P(0.33, 0.65), color: hex("#f2efe6"), zBias: -0.03 });
  }
  // Steps down to the town (the surge stops at their foot).
  for (let i = 0; i < 12; i++) {
    const sx = 142 + i * 2.4;
    const gy = groundH(sx, 40);
    box(out, { pos: [sx, gy - 0.3, 40], size: [2.5, 0.42, 6.6] }, { color: hex("#b7b0a0") });
  }
}

function roads(out: Tri[], see: See, S: CoastState) {
  const asphalt = mixRGB(hex("#55575a"), MUD, S.mud * 0.8);
  const strip = (x0: number, z0: number, x1: number, z1: number, half: number, n: number, color: RGB, y = 0.1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const nx = -(z1 - z0) / len * half, nz = (x1 - x0) / len * half;
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n;
      const ax = x0 + (x1 - x0) * a, az = z0 + (z1 - z0) * a, bx = x0 + (x1 - x0) * b, bz = z0 + (z1 - z0) * b;
      if (!see([ax, 2, az], 20)) continue;
      if (Math.abs(az - RIVER_Z) < 14 && Math.abs(ax - ROAD_X) < 8) continue;
      poly(out, [[ax + nx, groundH(ax + nx, az + nz) + y, az + nz], [bx + nx, groundH(bx + nx, bz + nz) + y, bz + nz], [bx - nx, groundH(bx - nx, bz - nz) + y, bz - nz], [ax - nx, groundH(ax - nx, az - nz) + y, az - nz]], vary(color, i, 0.03), { zBias: ROAD_BIAS });
    }
  };
  strip(ROAD_X, -320, ROAD_X, 320, 3.6, 60, asphalt);
  strip(ROAD_X, 40, 150, 40, 3, 12, asphalt);
  strip(ROAD_X, -40, 35, -40, 2.4, 8, mixRGB(hex("#b4a584"), MUD, S.mud));
  strip(ROAD_X, 20, 22, 20, 2, 10, mixRGB(hex("#c4b48f"), MUD, S.mud));
  // A basketball court, as in every barangay.
  const cx = 105, cz = -18;
  if (see([cx, 2, cz], 16)) {
    const g = groundH(cx, cz) + 0.12;
    poly(out, [[cx - 8, g, cz - 14], [cx + 8, g, cz - 14], [cx + 8, g, cz + 14], [cx - 8, g, cz + 14]], mixRGB(hex("#b78d55"), MUD, S.mud), { zBias: ROAD_BIAS });
    for (const s of [-1, 1]) {
      limb(out, [cx, g, cz + s * 14.5], [cx, g + 3.3, cz + s * 14.5], 0.08, 0.06, hex("#3a5f85"), 4);
      if (S.damage < 0.5) box(out, { pos: [cx, g + 3, cz + s * 14.2], size: [1.8, 1.05, 0.08] }, { color: hex("#efeadb") });
    }
  }
}

function riverBridge(out: Tri[], see: See, S: CoastState) {
  if (!see([ROAD_X, 4, RIVER_Z], 40)) return;
  const deck = 5.8, half = 3.6, a = RIVER_Z - 16, b = RIVER_Z + 16;
  const col = hex("#8f8f88"), rail = hex("#c9c6bb");
  const span = (z0: number, z1: number, y0: number, y1: number) => {
    poly(out, [[ROAD_X - half, y0, z0], [ROAD_X + half, y0, z0], [ROAD_X + half, y1, z1], [ROAD_X - half, y1, z1]], hex("#60625f"));
    for (const s of [-1, 1]) {
      poly(out, [[ROAD_X + s * half, y0 - 0.7, z0], [ROAD_X + s * half, y1 - 0.7, z1], [ROAD_X + s * half, y1 + 0.1, z1], [ROAD_X + s * half, y0 + 0.1, z0]], col);
      poly(out, [[ROAD_X + s * half, y0 + 0.1, z0], [ROAD_X + s * half, y1 + 0.1, z1], [ROAD_X + s * half, y1 + 0.95, z1], [ROAD_X + s * half, y0 + 0.95, z0]], rail, { alpha: 0.45 });
    }
  };
  span(a - 15, a, groundH(ROAD_X, a - 15) + 0.1, deck);
  span(b, b + 15, deck, groundH(ROAD_X, b + 15) + 0.1);
  if (!S.bridgeDown) span(a, b, deck, deck);
  else {
    span(a, a + 9, deck, deck);
    span(b - 9, b, deck, deck);
    // The fallen middle span, its far end in the river.
    span(a + 10, b - 11, deck - 0.7, 0.3);
  }
  for (const z of [RIVER_Z - 7, RIVER_Z + 7]) box(out, { pos: [ROAD_X, -3, z], size: [6, deck + 2.3, 1.2] }, { color: col });
}

const CAR_COLORS = ["#b8bcc0", "#c94f3d", "#2f4f6f", "#f0ece0", "#3a3f46", "#d9a441"].map(hex);

function vehicles(out: Tri[], see: See, S: CoastState) {
  if (S.stranded) {
    const r = rng(14);
    for (let i = 0; i < 16; i++) {
      const z = -96 + i * 11 + r() * 5, lane = r() < 0.5 ? -1.8 : 1.8;
      const yaw = (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 0.7;
      const x = ROAD_X + lane + (r() - 0.5);
      const kind = r();
      if (!see([x, 2, z], 10)) continue;
      const g = groundH(x, z) + 0.1;
      wetAware(out, x, z, g, S, () => {
        if (kind < 0.16) jeepney(out, [x, g, z], yaw, hex("#c63d32"), (r() - 0.5) * 0.14);
        else if (kind < 0.3) truck(out, [x, g, z], yaw, hex("#2f6d8f"), (r() - 0.5) * 0.14);
        else if (kind < 0.45) tricycle(out, [x, g, z], yaw, hex("#2f8f6b"), (r() - 0.5) * 0.3);
        else car(out, [x, g, z], yaw, CAR_COLORS[i % CAR_COLORS.length], (r() - 0.5) * 0.12);
      });
    }
  } else if (S.damage < 0.1) {
    // Everyday traffic: parked jeepney, a tricycle by the store.
    for (const [x, z, yaw, kind] of [[ROAD_X - 2, 62, 0, 0], [ROAD_X + 2.3, -75, Math.PI, 1], [ROAD_X - 2, 5, 0, 1]] as const) {
      if (!see([x, 2, z], 10)) continue;
      const g = groundH(x, z) + 0.1;
      if (kind === 0) jeepney(out, [x, g, z], yaw);
      else tricycle(out, [x, g, z], yaw);
    }
  }
}

function emitDebris(out: Tri[], see: See, cam: Camera, S: CoastState) {
  if (S.debris <= 0) return;
  const r = rng(99);
  const n = Math.round(240 * S.debris);
  for (let i = 0; i < n; i++) {
    const [rx, rz, ry, rs, rc, rk] = [r(), r(), r(), r(), r(), r()];
    const x = shoreX(0) + 14 + rx * 136, z = -205 + rz * 410;
    const p: V3 = [x, 0, z];
    if (!see(p, 4)) continue;
    const dist = Math.hypot(x - cam.pos[0], z - cam.pos[2]);
    if (dist > 240) continue;
    const g = groundH(x, z);
    const w = waterH(x, z, S);
    const y = Math.max(g, w) + 0.04;
    if (rk < 0.35) tinSheet(out, [x, y + 0.05, z], ry * 6, (rs - 0.5) * 0.3, (rc - 0.5) * 0.3, 1.5 + rs * 1.6);
    else if (rk < 0.6) limb(out, [x, y + 0.1, z], [x + (ry - 0.5) * 4, y + 0.2, z + (rs - 0.5) * 4], 0.07, 0.05, hex("#8a6d4a"), 3);
    else tetra(out, { pos: [x, y + 0.1, z], yaw: ry * 6, pitch: rs * 3, size: 0.25 + rs * 0.6 }, { color: vary(hex(rc < 0.5 ? "#7a5a3c" : "#a8a59c"), i, 0.15) });
  }
}

/** Emits the whole town and its land and sea for this frame. */
export function emitCoast(out: Tri[], cam: Camera, S: CoastState) {
  const see = seer(cam, S.far);
  emitLand(out, cam, S, see);
  roads(out, see, S);
  school(out, see, S);
  riverBridge(out, see, S);
  const T = town();
  const dist = (x: number, z: number) => Math.hypot(x - cam.pos[0], z - cam.pos[2]);
  const hs: Omit<HouseState, "lod"> = { boarded: S.boarded, damage: S.damage, rebuild: S.rebuild, mud: S.mud, t: S.t };
  for (const h of T.houses) {
    if (!see([h.x, 3, h.z], 12)) continue;
    const g = groundH(h.x, h.z) - 0.1;
    const d = dist(h.x, h.z);
    wetAware(out, h.x, h.z, g, S, () => phHouse(out, h, g, { ...hs, lod: d < 170 ? 1 : 0 }));
  }
  for (const p of T.palms) {
    if (!see([p.x, 6, p.z], 16)) continue;
    const g = groundH(p.x, p.z);
    const d = dist(p.x, p.z);
    const fall = S.palmFall > hash2(p.seed, 2, 3) ? Math.min(1, (S.palmFall - hash2(p.seed, 2, 3)) * 6) : 0;
    wetAware(out, p.x, p.z, g, S, () => palmTree(out, [p.x, g - 0.1, p.z], p.seed, S.t, S.wind, fall, d < 130 ? 1 : 0));
  }
  for (const p of T.trees) {
    if (!see([p.x, 6, p.z], 16)) continue;
    const g = groundH(p.x, p.z);
    broadTree(out, [p.x, g - 0.1, p.z], p.seed, S.wind * 0.8, dist(p.x, p.z) < 170 ? 1 : 0, S.damage > 0.55 && hash2(p.seed, 1, 1) < 0.7 ? 1 : 0);
  }
  // Poles and wires. A fallen pole pulls its wires down with it.
  const fallOf = (i: number) => {
    const th = hash2(i, 7, 7) * 0.8;
    return S.poleFall > th ? Math.min(1, (S.poleFall - th) * 5) : 0;
  };
  T.poles.forEach((b, i) => {
    if (!see(b, 14)) return;
    const d = dist(b[0], b[2]);
    if (d > 280) return;
    const fall = fallOf(i);
    wetAware(out, b[0], b[2], b[1], S, () => powerPole(out, b, fall));
    const nb = T.poles[i + 1];
    if (nb && d < 200) {
      const fall2 = fallOf(i + 1);
      if (fall < 0.05 && fall2 < 0.05) for (const dz of [-0.8, 0.8]) wire(out, [...[poleTop(b)[0] + dz, poleTop(b)[1], poleTop(b)[2]]] as V3, [poleTop(nb)[0] + dz, poleTop(nb)[1], poleTop(nb)[2]]);
    }
  });
  vehicles(out, see, S);
  // Other fishermen's boats, at the waterline or hauled up.
  for (const b of T.boats) {
    const sx = shoreX(b.z);
    const x = sx - 1 + 27 * (S.haul ?? (S.hauled ? 1 : 0));
    if (!see([x, 1, b.z], 10)) continue;
    const g = groundH(x, b.z);
    const w = waterH(x, b.z, S);
    if (S.damage > 0.4) {
      if (hash2(b.z, 3, 1) < 0.6) bangka(out, [x + 16, Math.max(g, w), b.z + 5], b.yaw + 0.7, { wreck: true, roll: 0.3, stripe: b.stripe });
      continue;
    }
    bangka(out, [x, Math.max(g, w) - 0.1, b.z], b.yaw, { stripe: b.stripe, roll: 0.05 * Math.sin(S.t + b.z), pitch: 0.03 * Math.sin(S.t * 0.8 + b.z) });
  }
  emitDebris(out, see, cam, S);
}

/** Tin and timber flying with the wind, for the storm's shots. */
export function emitFlyingDebris(out: Tri[], cam: Camera, t: number, amount: number) {
  if (amount <= 0) return;
  const r = rng(5);
  const f = norm(sub(cam.target, cam.pos));
  for (let i = 0; i < 70 * amount; i++) {
    const [ra, rb, rc, rd, re] = [r(), r(), r(), r(), r()];
    const span = 180;
    const speed = 22 + rd * 42;
    const along = ((t * speed + ra * span) % span) - span / 2;
    const p: V3 = [cam.pos[0] + f[0] * (25 + rb * 60) + along, cam.pos[1] + (rc - 0.35) * 45 + Math.sin(t * 2 + i) * 2, cam.pos[2] + f[2] * (25 + rb * 60) + (re - 0.5) * 60];
    if (re < 0.3) tinSheet(out, p, t * (2 + rc * 5) + i, t * (3 + ra * 4), t * (1 + rb * 3), 0.9 + rc * 1.6);
    else tetra(out, { pos: p, yaw: t * 5 + i, pitch: t * 4, size: 0.15 + rc * 0.42 }, { color: re < 0.65 ? hex("#6d5a44") : hex("#7f8488") });
  }
}

const CLOUD_LIGHT = hex("#f6f3ec"), CLOUD_DARK = hex("#2a3036");

/** A layer of faceted cloud overhead. `dark` 0 fair-weather puffs … 1 a solid storm deck; it scuds with the wind. */
export function emitCloudDeck(out: Tri[], cam: Camera, t: number, dark: number, wind: number, y = 420, tint?: RGB) {
  const f = norm(sub(cam.target, cam.pos));
  const size = 150, n = 14;
  const ox = cam.pos[0] + f[0] * 300, oz = cam.pos[2] + f[2] * 300;
  const drift = t * (6 + wind * 70);
  const base = dark > 0.5 ? mixRGB(CLOUD_LIGHT, CLOUD_DARK, dark) : mixRGB(CLOUD_LIGHT, hex("#c9d0d4"), dark * 2);
  const col = tint ? mixRGB(base, tint, 0.55) : base;
  const fx = (i: number, j: number): V3 => {
    const x = (Math.floor(ox / size) + i) * size, z = (Math.floor(oz / size) + j) * size;
    const h = fbm((x - drift) * 0.0035, z * 0.0035, 3, 21);
    return [x + 40 * (hash2(i + Math.floor(ox / size), j + Math.floor(oz / size), 9) - 0.5), y + h * 170 - dark * 40, z];
  };
  const dens = (x: number, z: number) => fbm((x - drift) * 0.004, z * 0.004, 3, 33) + 0.5;
  for (let j = -n; j < n; j++)
    for (let i = -n; i < n; i++) {
      const a = fx(i, j), b = fx(i + 1, j), c = fx(i, j + 1), d = fx(i + 1, j + 1);
      const m = dens(a[0], a[2]);
      const need = 0.62 - dark * 0.75;
      if (m < need) continue;
      const alpha = dark > 0.75 ? 1 : Math.min(0.92, (m - need) * 6);
      const shade1 = mixRGB(col, [0, 0, 0], hash2(i, j, 4) * 0.16), shade2 = mixRGB(col, [255, 255, 255], hash2(j, i, 5) * 0.08);
      out.push({ a, b, c: d, color: shade1, alpha, glow: 0.65, zBias: 200 }, { a, b: d, c, color: shade2, alpha, glow: 0.65, zBias: 200 });
    }
}

export { octa };
