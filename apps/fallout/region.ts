// The simulation view, 1 unit = 1 km: a city model on a curved Earth, the fireball, the shockwave ring, the mushroom
// cloud and the plume. The ground is a polar mesh round ground zero: fine where the city is, coarse by the horizon, whose
// silhouette is what makes the curve of the Earth read.
import { hex, mixRGB, norm, type Camera, type Env, type Frame, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, fbm, hash2, octa, rng, shake, smooth, sphere, tetra, vary } from "../../src/kit/lowpoly/world";
import { FLASH, STATION_KM, cloudAge, plumeKm, shockKm } from "./timeline";
import type { Fx } from "./downtown";
import { NO_FX } from "./downtown";

// A smaller Earth than the real one, so the curve can be seen in a tall frame.
const EARTH = 900;
const curve = (x: number, z: number) => -(x * x + z * z) / (2 * EARTH);

/** Where the wind takes the fallout: inland, to the north-east, over the station. */
const WIND = norm([0.6, 0, -0.8]);
export const STATION_AT: V3 = [WIND[0] * STATION_KM, 0, WIND[2] * STATION_KM];
export const stationPoint = (): V3 => [STATION_AT[0], curve(STATION_AT[0], STATION_AT[2]) + 0.3, STATION_AT[2]];

/** The shoreline: land on the -z side. A bay cuts in beside the city, and the bridge crosses it. */
function coastZ(x: number) {
  const c = 11 + fbm(x * 0.011, 3.1, 3, 31) * 70 + Math.sin(x * 0.0042) * 26;
  const bay = smooth(5.5, 1.5, Math.abs(x - 10));
  return c + (3.2 - c) * bay;
}
const isSea = (x: number, z: number) => z > coastZ(x);

function landHeight(x: number, z: number) {
  const hills = Math.max(0, fbm(x * 0.008, z * 0.008, 4, 5) + 0.05) * 16;
  // A range along the far side, for the horizon's edge.
  const range = Math.exp(-(((z + 330 + Math.sin(x * 0.006) * 70) / 80) ** 2)) * 12 * (0.55 + 0.9 * Math.abs(fbm(x * 0.02, z * 0.02, 3, 8)));
  return (hills + range) * smooth(18, 55, Math.hypot(x, z));
}

type GroundTri = { a: V3; b: V3; c: V3; color: RGB; x: number; z: number; r: number; sea: boolean };
let groundCache: GroundTri[] | null = null;
function groundMesh(): GroundTri[] {
  if (groundCache) return groundCache;
  const RINGS = 84, SECTORS = 150, R0 = 0.35, RMAX = 2000;
  const rad = (i: number) => (i === 0 ? 0 : R0 * (RMAX / R0) ** ((i - 1) / (RINGS - 1)));
  const v = (i: number, j: number): V3 => {
    const a = ((j % SECTORS) / SECTORS) * Math.PI * 2 + (i % 2) * (Math.PI / SECTORS);
    const jit = i > 0 ? 1 + (hash2(i, j % SECTORS, 3) - 0.5) * 0.09 : 1;
    const r = rad(i) * jit;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    return [x, (isSea(x, z) ? -0.02 : landHeight(x, z)) + curve(x, z), z];
  };
  const verts: V3[][] = [];
  for (let i = 0; i <= RINGS; i++) {
    verts.push([]);
    for (let j = 0; j < SECTORS; j++) verts[i].push(v(i, j));
  }
  const out: GroundTri[] = [];
  const GREENS = ["#5d8a4c", "#6b9650", "#4f7d47", "#7c9c56", "#8ea75e", "#a59e62"].map(hex);
  const OCEAN = hex("#2a6a96"), DEEP = hex("#1f557f"), CITY = hex("#7c7f85"), SUB = hex("#8f9682"), PEAK = hex("#8a8a7a"), SNOW = hex("#e8ecec"), BEACH = hex("#d6c693");
  const colour = (x: number, z: number, yy: number, seed: number): RGB => {
    const r = Math.hypot(x, z);
    if (isSea(x, z)) return vary(z - coastZ(x) > 30 ? DEEP : OCEAN, seed, 0.05);
    if (r < 15) return vary(CITY, seed, 0.06);
    if (r < 32) return vary(mixRGB(CITY, SUB, (r - 15) / 17), seed, 0.08);
    const h = yy - curve(x, z);
    if (h > 12) return vary(SNOW, seed, 0.02);
    if (h > 7) return vary(PEAK, seed, 0.08);
    if (coastZ(x) - z < 3.5) return vary(BEACH, seed, 0.06);
    const patch = Math.floor(fbm(x * 0.02, z * 0.02, 3, 13) * 12 + 6);
    return vary(GREENS[Math.abs(patch) % GREENS.length], seed, 0.06);
  };
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SECTORS; j++) {
      const a = verts[i][j], b = verts[i][(j + 1) % SECTORS], c = verts[i + 1][j], d = verts[i + 1][(j + 1) % SECTORS];
      const tris: [V3, V3, V3][] = i === 0 ? [[a, c, d]] : [[a, b, d], [a, d, c]];
      tris.forEach(([p, q, s], k) => {
        const x = (p[0] + q[0] + s[0]) / 3, z = (p[2] + q[2] + s[2]) / 3, y = (p[1] + q[1] + s[1]) / 3;
        out.push({ a: p, b: q, c: s, color: colour(x, z, y, i * 200 + j * 3 + k), x, z, r: Math.hypot(x, z), sea: isSea(x, z) });
      });
    }
  }
  groundCache = out;
  return out;
}

/** How much the plume stains the ground at (x, z), 0…1: long and narrow, widening away from the bomb. */
export function plumeAt(x: number, z: number, reach: number, width = 1) {
  const along = x * WIND[0] + z * WIND[2];
  if (along < -18) return 0;
  const across = z * WIND[0] - x * WIND[2];
  const wander = Math.sin(along * 0.009) * 34 * smooth(50, 300, along);
  const halfW = (17 + Math.max(0, along) * 0.17) * width;
  const off = (across - wander) / halfW;
  const front = smooth(reach, reach - 120, along);
  return Math.exp(-off * off) * front * (0.5 + 0.5 * smooth(620, 80, along));
}

const SCORCH = hex("#27221f"), ASH = hex("#6f6a62"), CHAR = hex("#3d3833"), MOLTEN = hex("#ff6a1e"), STEAM = hex("#c2c6c4");
const STAIN = [hex("#f2ee2c"), hex("#d3dc2e"), hex("#a9bb30")];

function ground(out: Tri[], t: number, stain: number, reach: number, map: boolean) {
  const R = shockKm(t);
  const since = t - FLASH;
  for (const g of groundMesh()) {
    // On the map the land goes quiet, so the only strong colour on it is the fallout.
    let color = map && !g.sea ? mixRGB(g.color, hex("#6c7467"), 0.55) : g.color;
    let glow = 0;
    if (since > 0 && g.r < R) {
      const k = smooth(0, 3, R - g.r);
      if (g.sea) color = mixRGB(color, STEAM, 0.65 * k * smooth(70, 12, g.r));
      else color = mixRGB(color, g.r < 26 ? (g.r < 7 ? SCORCH : CHAR) : ASH, k * (g.r < 26 ? 0.96 : g.r < 45 ? 0.72 : 0.42));
      if (g.r < 7.5) {
        const hot = Math.exp(-since / 9) * (1 - g.r / 7.5);
        if (hot > 0.02) {
          color = mixRGB(color, MOLTEN, Math.min(1, hot * 1.8));
          glow = Math.min(1, hot * 2);
        }
      }
    }
    if (stain > 0 && g.r < 900) {
      const p = plumeAt(g.x, g.z, reach) * stain;
      if (p > 0.03) {
        // Bands, like the contours on a hazard map.
        const band = p > 0.58 ? STAIN[0] : p > 0.28 ? STAIN[1] : STAIN[2];
        color = mixRGB(color, band, Math.min(0.96, 0.62 + p * 0.6));
      }
    }
    out.push({ a: g.a, b: g.b, c: g.c, color, glow, zBias: 20000 });
  }
}

// ── The city model ───────────────────────────────────────────────────────────────────────────────────

type Block = { x: number; z: number; w: number; d: number; h: number; c: RGB; r: number };
let blocksCache: Block[] | null = null;
function blocks(): Block[] {
  if (blocksCache) return blocksCache;
  const r = rng(202);
  const GLASS = ["#a9c2d4", "#8ca9bf", "#c7cfd2", "#7892a8", "#b5aea2", "#95a2ad"].map(hex);
  const out: Block[] = [];
  const pitch = 0.62;
  for (let i = -26; i <= 26; i++) {
    for (let j = -26; j <= 26; j++) {
      const x = i * pitch + (r() - 0.5) * 0.1, z = j * pitch + (r() - 0.5) * 0.1;
      const d = Math.hypot(x, z);
      const keep = r();
      if (d > 15.5 || isSea(x, z) || keep < smooth(6, 15, d) * 0.55) continue;
      const centre = Math.exp(-((d / 3.4) ** 2));
      const h = 0.09 + r() * 0.2 + centre * (0.35 + r() * 0.95);
      out.push({ x, z, w: 0.26 + r() * 0.2, d: 0.26 + r() * 0.2, h, c: GLASS[Math.floor(r() * GLASS.length)], r: d });
    }
  }
  // Suburbs: low, wider apart, thinning out.
  for (let i = 0; i < 700; i++) {
    const a = r() * Math.PI * 2, d = 15 + (r() ** 1.5) * 24;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (isSea(x, z)) continue;
    out.push({ x, z, w: 0.3 + r() * 0.25, d: 0.3 + r() * 0.25, h: 0.04 + r() * 0.05, c: hex("#b6ad9d"), r: d });
  }
  blocksCache = out;
  return out;
}

function city(out: Tri[], t: number) {
  const R = shockKm(t);
  for (const b of blocks()) {
    const y = curve(b.x, b.z);
    const hit = R - b.r;
    if (hit > 0 && b.r < 6.2) continue; // Gone, in the fireball.
    const k = hit > 0 ? smooth(0, 1.1, hit) : 0;
    const h = b.h * (1 - 0.86 * k);
    const color = mixRGB(b.c, b.r < 16 ? CHAR : ASH, Math.min(1, k * 1.2));
    box(out, { pos: [b.x, y, b.z], yaw: k * (b.x * 3.1) * 0.25, pitch: k * 0.12 * Math.sin(b.z * 7), size: [b.w, h, b.d] }, (f) => ({ color: f === 0 ? mixRGB(color, [255, 255, 255], 0.2) : color }));
    // Towers come apart in triangular shards as the front goes through them.
    if (hit > 0 && hit < 1.8 && b.h > 0.18) {
      const r = rng(Math.round(b.x * 91 + b.z * 37));
      const dirx = b.x / (b.r || 1), dirz = b.z / (b.r || 1);
      for (let i = 0; i < 3; i++) {
        const q = hit * (0.8 + r() * 0.9);
        tetra(out, { pos: [b.x + dirx * q, y + b.h * r() + q * 0.3, b.z + dirz * q], yaw: t * 3 + i, pitch: t * 4, size: 0.11 + r() * 0.1 }, { color: b.c });
      }
    }
  }
}

/** The bridge across the bay: deck on two towers. Its deck drops and tips when the shockwave reaches it. */
function bridge(out: Tri[], t: number) {
  const R = shockKm(t);
  const z = 6.5, x0 = 4.5, x1 = 15.5, n = 22;
  const STEEL = hex("#c84c2e");
  for (let i = 0; i < n; i++) {
    const xa = x0 + ((x1 - x0) * i) / n, x = xa + (x1 - x0) / n / 2;
    const r = Math.hypot(x, z);
    const k = smooth(0, 2.2, R - r);
    const drop = k * k * (0.18 + 0.1 * Math.sin(i * 2.7));
    box(out, { pos: [x + k * 0.1, 0.6 - drop * 3, z + k * 0.45 * (i % 2 ? 1 : 0.7)], yaw: k * Math.sin(i * 1.7) * 0.5, roll: k * Math.sin(i * 3.1) * 0.6, size: [(x1 - x0) / n, 0.07, 0.42] }, { color: STEEL });
  }
  for (const x of [7.7, 12.3]) {
    const k = smooth(0, 1.6, R - Math.hypot(x, z));
    box(out, { pos: [x, 0, z], yaw: 0, roll: -1.3 * k * k, size: [0.28, 2.3, 0.5] }, { color: STEEL });
  }
}

/** The shockwave's visible edge: a wall of dust, and a thin white condensation sheet just ahead of it. */
function ring(out: Tri[], t: number) {
  const R = shockKm(t);
  const since = t - FLASH;
  if (since <= 0 || R > 140) return;
  const puff = 0.45 + R * 0.055;
  const n = 340;
  for (let i = 0; i < n; i++) {
    const r = rng(i * 23 + 6);
    const ang = (i / n) * Math.PI * 2 + r() * 0.03;
    const rr = R - r() * puff * 1.6;
    const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
    const s = puff * (0.7 + r() * 0.6);
    const y = (isSea(x, z) ? 0 : landHeight(x, z)) + curve(x, z) + s * 0.35;
    octa(out, { pos: [x, y, z], yaw: i + since, size: [s, s * 0.62, s] }, { color: mixRGB(hex("#e4d3b6"), hex("#94775a"), r()), glow: 0.35, zBias: -0.2 });
  }
  // Hot debris carried on the front.
  for (let i = 0; i < 140; i++) {
    const r = rng(i * 7 + 4);
    const ang = r() * Math.PI * 2, rr = R + (r() - 0.4) * puff * 2.4;
    const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
    tetra(out, { pos: [x, curve(x, z) + r() * puff * 1.5, z], yaw: t * 6 + i, pitch: t * 4 + i, size: puff * (0.1 + r() * 0.14) }, { color: mixRGB(hex("#ff8a30"), hex("#3a3026"), r()), glow: 0.8 });
  }
}

// ── The cloud ────────────────────────────────────────────────────────────────────────────────────────

type Puff = { kind: 0 | 1 | 2 | 3; u: number; ang: number; rad: number; size: number; shade: number };
let puffsCache: Puff[] | null = null;
function puffs(): Puff[] {
  if (puffsCache) return puffsCache;
  const r = rng(808);
  const out: Puff[] = [];
  for (let i = 0; i < 70; i++) out.push({ kind: 0, u: i / 70, ang: r() * 6.28, rad: 0.25 + r() * 0.75, size: 0.75 + r() * 0.5, shade: r() });
  for (let i = 0; i < 170; i++) out.push({ kind: 1, u: r(), ang: r() * 6.28, rad: Math.sqrt(r()), size: 0.7 + r() * 0.6, shade: r() });
  for (let i = 0; i < 26; i++) out.push({ kind: 2, u: r(), ang: (i / 26) * 6.28, rad: 1, size: 0.7 + r() * 0.5, shade: r() });
  for (let i = 0; i < 60; i++) out.push({ kind: 3, u: r(), ang: (i / 60) * 6.28 + r() * 0.1, rad: 1, size: 0.7 + r() * 0.7, shade: r() });
  puffsCache = out;
  return out;
}

export const cloudHeight = (age: number) => 65 * (1 - Math.exp(-age / 7.5));
const cloudWidth = (age: number) => 48 * (1 - Math.exp(-age / 8));

/**
 * The mushroom cloud at `age`, standing on `origin`. `unit` is world units per km, so the station can draw the same cloud
 * at its true angle from far away. `level` is the puffs' detail.
 */
export function mushroom(out: Tri[], glows: Glow[], lights: PointLight[], origin: V3, unit: number, age: number, level = 1, drift = 0) {
  if (age <= 0) return;
  const H = cloudHeight(age), W = cloudWidth(age);
  const stemR = 2.2 + W * 0.13;
  const neck = H * 0.74;
  const heatAll = Math.exp(-age / 13);
  const roll = age * 0.09;
  // Soot and fire, not dough: dark on the outside, still burning in its folds.
  const DUST = hex("#40322a"), TOP = hex("#7c6c5f"), CORE = hex("#ff6a14"), HOT = hex("#fff1c0");
  const flash = Math.exp(-age / 0.7);
  for (const p of puffs()) {
    let x = 0, y = 0, z = 0, s = 1, heat = 0, base = DUST;
    if (p.kind === 0) {
      // The stem: a rising column, thinnest under the cap.
      const yy = p.u * neck;
      const rr = stemR * p.rad * (1 + 0.8 * (1 - p.u) ** 3);
      x = Math.cos(p.ang + roll * 3) * rr;
      z = Math.sin(p.ang + roll * 3) * rr;
      y = yy;
      s = stemR * 0.62 * p.size;
      heat = heatAll * (1 - p.u * 0.6);
      base = mixRGB(DUST, hex("#6c5847"), p.shade);
    } else if (p.kind === 1) {
      // The cap: a rolling dome.
      const rr = W * p.rad;
      x = Math.cos(p.ang + roll) * rr;
      z = Math.sin(p.ang + roll) * rr;
      y = neck + (H - neck) * Math.cos(p.rad * 1.45) * (0.75 + 0.25 * p.u) + 0.4 * W * 0.1 * Math.sin(p.ang * 5);
      s = W * 0.19 * p.size + 1.2;
      heat = heatAll * 0.75 * (1 - Math.cos(p.rad * 1.45)) * (p.u < 0.5 ? 1 : 0.5);
      base = mixRGB(TOP, DUST, p.u * 0.7 + (1 - Math.cos(p.rad * 1.45)) * 0.3);
    } else if (p.kind === 2) {
      // The collar: a ring round the stem, partway up.
      const rr = stemR * 2.5;
      x = Math.cos(p.ang + roll * 2) * rr;
      z = Math.sin(p.ang + roll * 2) * rr;
      y = neck * 0.46;
      s = stemR * 0.72 * p.size;
      base = mixRGB(hex("#e7e3da"), TOP, p.shade);
      heat = heatAll * 0.3;
    } else {
      // The base surge: dust thrown out along the ground.
      const rr = 4 + age * 1.15 + p.u * 3;
      x = Math.cos(p.ang) * rr;
      z = Math.sin(p.ang) * rr;
      y = 0.6;
      s = 1.6 + age * 0.14 * p.size;
      base = mixRGB(hex("#6c5847"), DUST, p.shade);
      heat = heatAll * 0.3;
    }
    // Some of the folds keep burning long after the rest has gone dark, and flicker.
    if (p.kind !== 2 && p.shade > 0.68) heat = Math.max(heat, (0.4 + 0.34 * hash2(Math.floor(age * 5), Math.round(p.ang * 30), 9)) * Math.exp(-age / 11));
    const col = mixRGB(mixRGB(base, CORE, Math.min(1, heat * 1.3)), HOT, flash);
    const pos: V3 = [origin[0] + (x + drift * (y / H) ** 2) * unit, origin[1] + y * unit, origin[2] + (z - drift * 0.6 * (y / H) ** 2) * unit];
    const seed = p.ang * 40;
    sphere(out, level, { pos, yaw: p.ang + roll }, (d) => s * unit * (0.86 + 0.28 * hash2(Math.round(d[0] * 9 + seed), Math.round(d[1] * 9 + d[2] * 5), 4)), () => ({ color: col, glow: Math.min(1, heat * 1.4 + flash) }));
  }
  // The first seconds: the fireball itself, white-hot, swallowing what's under it.
  const fb = 5.4 * (1 - Math.exp(-age / 0.45)) * (1 - smooth(1.8, 6, age) * 0.65);
  if (fb > 0.05) {
    const hot = 1 - smooth(1.2, 6, age);
    const c = mixRGB(CORE, HOT, hot);
    sphere(out, 2, { pos: [origin[0], origin[1] + fb * 0.36 * unit + neck * 0.15 * unit * smooth(1, 5, age), origin[2]], yaw: age }, (d) => fb * unit * (0.94 + 0.12 * hash2(Math.round(d[0] * 7), Math.round(d[1] * 7 + d[2] * 3), 2 + Math.floor(age * 2))), (_d, i) => ({ color: vary(c, i, 0.08), glow: 1 }));
    glows.push({ p: [origin[0], origin[1] + fb * 0.4 * unit, origin[2]], radius: fb * 5 * unit, color: [255, 190, 110], alpha: 0.7 * hot });
  }
  lights.push({ p: [origin[0], origin[1] + neck * 0.6 * unit, origin[2]], color: [255, 130, 60], intensity: 2.2 * heatAll, range: (H + 40) * 2.2 * unit });
  // Lightning in the column, in the first seconds: the bomb makes its own.
  if (age > 0.6 && age < 11) {
    const beat = Math.floor(age * 6);
    if (hash2(beat, 3, 5) > 0.55) {
      const r = rng(beat * 97 + 3);
      let p: V3 = [origin[0], origin[1] + neck * (0.15 + r() * 0.4) * unit, origin[2]];
      const dirA = r() * 6.28;
      for (let i = 0; i < 6; i++) {
        const n: V3 = [p[0] + (Math.cos(dirA) * stemR * 0.55 + (r() - 0.5) * stemR * 0.5) * unit, p[1] - (r() * 0.5 + 0.3) * stemR * 0.8 * unit, p[2] + (Math.sin(dirA) * stemR * 0.55 + (r() - 0.5) * stemR * 0.5) * unit];
        const w = stemR * 0.035 * unit;
        out.push({ a: [p[0] - w, p[1], p[2]], b: [p[0] + w, p[1], p[2]], c: n, color: hex("#e8f0ff"), glow: 1, zBias: -9 * unit });
        p = n;
      }
    }
  }
}

/** The shock's thin white shell of condensation, ahead of the dust, for as long as it can hold together. */
function shell(out: Tri[], t: number) {
  const R = shockKm(t), s = t - FLASH;
  if (s <= 0 || R > 30) return;
  const a = 0.16 * (1 - R / 30);
  sphere(out, 2, { pos: [0, 0, 0] }, () => R * 1.05, () => ({ color: hex("#ffffff"), alpha: a, glow: 1, zBias: -1 }));
}

/** Everything the wave has passed is on fire: thousands of small lights, flickering, under columns of smoke. */
function burning(out: Tri[], t: number) {
  const R = shockKm(t);
  if (R <= 1) return;
  const r = rng(909);
  for (let i = 0; i < 320; i++) {
    const a = r() * Math.PI * 2, d = 4 + r() ** 0.8 * 40, s0 = r(), ph = r() * 6.28;
    if (d > R - 1) continue;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (isSea(x, z)) continue;
    const f = 0.55 + 0.45 * Math.sin(t * (9 + s0 * 8) + ph);
    const s = (0.16 + s0 * 0.36) * (0.7 + 0.5 * f);
    octa(out, { pos: [x, curve(x, z) + s * 0.8, z], yaw: i, size: [s, s * 1.8, s] }, { color: mixRGB(hex("#ff5a14"), hex("#ffd27a"), f), glow: 1 });
    if (i % 5 === 0) {
      for (let k = 0; k < 4; k++) {
        const u = (t * 0.32 + s0 + k * 0.25) % 1;
        octa(out, { pos: [x + u * 2.2, curve(x, z) + 0.7 + u * 6.5, z - u * 1.5], yaw: i + k, size: 0.5 + u * 1.5 }, { color: hex("#2a2320"), alpha: 0.5 * (1 - u) });
      }
    }
  }
}

// ── The weather and the plume ────────────────────────────────────────────────────────────────────────

/** A layer of fair-weather cloud for scale: the camera climbs through it, and the blast clears it away. */
function weather(out: Tri[], t: number) {
  const R = shockKm(t);
  const r = rng(61);
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, d = 24 + r() ** 0.7 * 340, s = 3.5 + r() * 7, lift = r() * 2.6;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (d < R) continue;
    octa(out, { pos: [x, curve(x, z) + 8.5 + lift, z], yaw: i, size: [s, s * 0.26, s * 0.7] }, { color: hex("#f7f4ec"), alpha: 0.9 });
  }
}

/** The boiling harbour: steam lifting off the water the blast crossed. */
function steam(out: Tri[], t: number) {
  const R = shockKm(t);
  const r = rng(303);
  for (let i = 0; i < 90; i++) {
    const x = -46 + r() * 92, z = coastZ(x) + r() * 22, s = 0.9 + r() * 1.7, ph = r(), pale = r();
    if (Math.hypot(x, z) > R - 2) continue;
    const k = (t * 0.28 + ph) % 1;
    octa(out, { pos: [x, curve(x, z) + k * 6, z], yaw: i, size: s * (0.7 + k) }, { color: mixRGB(STEAM, hex("#f0efe9"), pale), alpha: 0.75 * (1 - k) });
  }
}

/** The dust in the air over the stain: low, flat and pale, sliding downwind. */
function plumeDust(out: Tri[], t: number, reach: number, amount: number) {
  if (amount <= 0) return;
  const r = rng(515);
  for (let i = 0; i < 130; i++) {
    const a0 = r() * 1, c0 = r() - 0.5, s = 16 + r() * 34;
    const along = ((a0 + t * 0.02) % 1) * reach;
    const wander = Math.sin(along * 0.009) * 34 * smooth(50, 300, along);
    const across = c0 * 2 * (17 + along * 0.17) + wander;
    const x = WIND[0] * along - WIND[2] * across, z = WIND[2] * along + WIND[0] * across;
    const fade = smooth(reach, reach * 0.7, along);
    out.push({ a: [x - s, curve(x, z) + 7, z - s * 0.4], b: [x + s, curve(x, z) + 7, z - s * 0.3], c: [x, curve(x, z) + 7, z + s * 0.8], color: hex("#b8b78a"), alpha: 0.2 * fade * amount });
  }
}

// ── The shots ────────────────────────────────────────────────────────────────────────────────────────

const DAY: Env = {
  skyTop: hex("#2b6fb3"),
  skyBottom: hex("#d5e7f0"),
  fog: hex("#d5e7f0"),
  fogNear: 90,
  fogFar: 900,
  sun: norm([0.5, 0.72, 0.42]),
  sunColor: [255, 238, 214],
  ambient: [116, 124, 138],
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

function scene(t: number, camera: Camera, env: Env, age: number, opts: { stain?: number; reach?: number; level?: number; map?: boolean; drift?: number } = {}): Frame {
  const tris: Tri[] = [];
  const glowsFront: Glow[] = [];
  const lights: PointLight[] = [];
  ground(tris, t, opts.stain ?? 0, opts.reach ?? 0, !!opts.map);
  if (!opts.map) {
    city(tris, t);
    bridge(tris, t);
    weather(tris, t);
  }
  ring(tris, t);
  if (!opts.map) {
    shell(tris, t);
    burning(tris, t);
  }
  mushroom(tris, glowsFront, lights, [0, 0, 0], 1, age, opts.level ?? 1, opts.drift ?? 0);
  return { tris, camera, env, glowsFront, lights };
}

/** Shot 6: the model of the city, from high up, and the fireball taking it. */
export function fireballFrame(t: number): { frame: Frame; fx: Fx } {
  const k = smooth(30, 38, t);
  const camera: Camera = { pos: [lerp(-19, -29, k), lerp(34, 50, k), lerp(44, 62, k)], target: [lerp(1, 2, k), 0, lerp(-13, -17, k)], fov: 50 };
  // The land goes dark round the light, which is what makes the light look bright.
  const dim = smooth(30.4, 31.8, t);
  const env: Env = { ...DAY, skyTop: mixRGB(DAY.skyTop, hex("#2a140a"), dim), skyBottom: mixRGB(DAY.skyBottom, hex("#c2703a"), dim), fog: mixRGB(DAY.fog, hex("#b5683a"), dim), sunColor: mixRGB(DAY.sunColor, [150, 104, 78], dim), ambient: mixRGB(DAY.ambient, [68, 56, 54], dim) };
  const frame = scene(t, shake(camera, t, t > 32 ? 0.5 * Math.exp(-(t - 32) / 1.4) : 0), env, cloudAge(t), { level: 1 });
  return { frame, fx: { ...NO_FX, white: t < FLASH + 2 ? 1 - smooth(30, 31.7, t) : 0, flare: { p: [0, 3, 0], alpha: 0.9 * (1 - smooth(31, 37, t)) } } };
}

/** Shot 7: one long climb, from the bay to the edge of space. */
export function riseFrame(t: number): { frame: Frame; fx: Fx } {
  const k = smooth(38, 46, t);
  const lift = k * k * (1.6 - 0.6 * k);
  // Starts out over the bay, ahead of the shockwave, and is well above it by the time it passes underneath.
  // Its last position is low enough that the top of the cloud stands clear above the curve of the horizon.
  const pos = lerp3([28, 2.2, 40], [30, 46, 146], lift);
  const target = lerp3([7, 8, 3], [0, 25, -40], smooth(0.05, 0.9, k));
  const camera: Camera = { pos, target, fov: lerp(58, 58, k) };
  const space = smooth(0.35, 0.95, k);
  const env: Env = {
    ...DAY,
    sunColor: mixRGB([190, 136, 100], [235, 226, 208], space),
    ambient: mixRGB([78, 62, 58], [78, 86, 104], space),
    skyTop: mixRGB(hex("#2a140a"), hex("#000208"), space),
    skyBottom: mixRGB(hex("#e7a56f"), hex("#4f90cf"), space),
    fog: mixRGB(hex("#dca878"), hex("#a9d2ee"), space),
    fogNear: lerp(70, 160, k),
    fogFar: lerp(380, 1300, k),
    stars: 0.85 * smooth(0.6, 1, k),
  };
  const frame = scene(t, shake(camera, t, 0.14 * (1 - k)), env, cloudAge(t), { level: 1 });
  steam(frame.tris, t);
  return { frame, fx: NO_FX };
}

const MAP_ENV: Env = { ...DAY, skyTop: hex("#000208"), skyBottom: hex("#4d8ec9"), fog: hex("#8eb6cf"), fogNear: 700, fogFar: 2600, stars: 0.8, sun: norm([0.4, 0.8, 0.45]), sunColor: [226, 220, 208], ambient: [92, 96, 106] };

/** From just over the cloud, all the way out to where the plume's whole length shows. */
function mapCamera(t: number): Camera {
  if (t < 65) {
    const k = smooth(55.5, 64.8, t);
    const out = k * k * (3 - 2 * k);
    return { pos: [lerp(84, 160, out), lerp(250, 760, out), lerp(200, 330, out)], target: [lerp(34, 115, k), 0, lerp(-40, -135, k)], fov: 50 };
  }
  const k = smooth(65, 78, t);
  return { pos: [lerp(160, 190, k), lerp(760, 830, k), lerp(330, 370, k)], target: [lerp(115, 150, k), 0, lerp(-135, -170, k)], fov: 50 };
}

/** Shot 10: the map, from very high, as the plume reaches downwind. */
export function plumeFrame(t: number): { frame: Frame; fx: Fx } {
  const reach = plumeKm(t);
  const frame = scene(t, mapCamera(t), MAP_ENV, cloudAge(t), { stain: smooth(55.3, 57.2, t), reach, level: 1, map: true, drift: 40 });
  plumeDust(frame.tris, t, reach, smooth(55.5, 58, t));
  return { frame, fx: { ...NO_FX, black: t < 55.5 ? 1 : 1 - smooth(55.5, 56.2, t) } };
}

/** Shot 12's other half: the same map, the stain fading over two weeks. */
export function mapDecayFrame(t: number, left: number): { frame: Frame; fx: Fx } {
  const frame = scene(t, mapCamera(t), MAP_ENV, 0, { stain: left, reach: 700, map: true });
  plumeDust(frame.tris, t, 700, left * 0.9);
  return { frame, fx: NO_FX };
}

/** A circle on the ground round ground zero, for the range rings. */
export const groundCircle = (km: number, n = 72): V3[] => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  const x = Math.cos(a) * km, z = Math.sin(a) * km;
  return [x, curve(x, z) + 0.5, z] as V3;
});
