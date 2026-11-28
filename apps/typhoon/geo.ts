// The Philippines from high up: coarse real coastlines as low-poly land, the sea, and Kalakas itself, a rotating spiral
// of cloud with a clear eye. 1 unit = 10 km. North is −z, east is +x, and the origin is the landfall point on Samar.
import { hex, mixRGB, norm, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, hash2, noise2, rng, smooth, vary } from "../../src/kit/lowpoly/world";
import { RINGS } from "../../src/kit/doc/geo";

export const LANDFALL = { lon: 125.62, lat: 11.2 };
const KM_LON = 109, KM_LAT = 111;

/** Longitude and latitude to world units. */
export const LL = (lon: number, lat: number, y = 0): V3 => [((lon - LANDFALL.lon) * KM_LON) / 10, y, (-(lat - LANDFALL.lat) * KM_LAT) / 10];

// Coarse coastlines, each [lon, lat], clockwise.
const { SAMAR, LEYTE, LUZON, MINDORO, MASBATE, PANAY, NEGROS, CEBU, BOHOL, MINDANAO, CATANDUANES, PALAWAN } = RINGS;
const ALL = [SAMAR, LEYTE, LUZON, MINDORO, MASBATE, PANAY, NEGROS, CEBU, BOHOL, MINDANAO, CATANDUANES, PALAWAN];
export const COASTS = ALL;

// The neighbours, coarser still: they only ever appear from far away.
export const NEIGHBOURS: { ring: number[][]; size: number }[] = [
  { size: 0.8, ring: [[109.0, 1.5], [110.3, 1.7], [111.3, 2.6], [113.0, 3.2], [114.5, 4.7], [115.6, 5.6], [116.8, 7.0], [117.7, 6.4], [119.2, 5.3], [118.1, 4.3], [117.6, 3.4], [118.0, 2.2], [119.0, 1.0], [117.5, 0.3], [117.4, -0.8], [116.5, -1.8], [116.2, -3.4], [114.6, -4.1], [113.0, -3.2], [111.7, -3.5], [110.2, -2.9], [110.0, -1.4], [109.0, 0.0]] }, // Borneo
  { size: 0.7, ring: [[119.8, 0.8], [120.8, 1.3], [122.9, 0.9], [125.0, 1.6], [124.4, 0.5], [123.0, 0.4], [120.7, 0.4], [120.1, -0.9], [121.1, -1.4], [123.3, -0.9], [122.0, -1.9], [122.9, -4.2], [121.6, -4.8], [120.9, -2.7], [120.4, -3.4], [120.4, -5.5], [119.5, -5.5], [119.4, -3.5], [118.8, -2.7], [119.3, -1.4]] }, // Sulawesi
  { size: 0.6, ring: [[127.6, 2.0], [128.7, 1.3], [128.1, 0.2], [128.0, -0.8], [127.5, 0.2]] }, // Halmahera
  { size: 1.2, ring: [[131, -0.8], [134, -0.8], [135, -3.3], [138, -1.7], [141, -2.6], [145, -4.5], [147, -6], [150, -10], [146, -8.5], [143, -9.2], [138, -8.3], [138, -5.5], [133, -4], [132, -2.8]] }, // New Guinea
  { size: 0.45, ring: [[121.6, 25.2], [122, 25], [121.5, 23.5], [120.9, 22], [120.2, 22.9], [120.2, 23.8], [121, 25]] }, // Taiwan
  { size: 0.5, ring: [[108.7, 19.2], [110.7, 20.1], [111, 19.6], [110, 18.4], [109, 18.5]] }, // Hainan
  { size: 1.4, ring: [[103.5, 1.4], [104.2, 2.6], [103.4, 4.5], [102.2, 6.2], [100.9, 6.6], [100.1, 8.5], [99.2, 10], [99.9, 12], [100.5, 13.5], [101.0, 12.7], [102.4, 12], [103, 11], [104.7, 10.4], [105, 8.7], [106.8, 10.4], [109.2, 11.6], [109.3, 13.4], [108.9, 15.3], [107.2, 16.9], [105.8, 18.7], [105.9, 19.6], [106.8, 20.8], [108.3, 21.6], [110, 20.4], [110.5, 21.2], [113.5, 22.2], [116.7, 23.2], [118.5, 24.6], [119.7, 25.8], [121.2, 28.2], [122, 30], [121.2, 31.7], [120, 34.5], [122, 37], [121, 38.5], [118, 39.2], [122, 41], [125, 40], [126.5, 37.7], [126.6, 34.5], [129.3, 35.2], [129.5, 37], [128, 39], [130, 42.4], [127, 46], [115, 46], [97, 46], [92, 22], [94, 16], [97.6, 16.3], [98.6, 12], [98.3, 8.5], [100.3, 6], [100.4, 4], [101.3, 2.8]] }, // Mainland Asia
  { size: 0.6, ring: [[130, 33.6], [131.6, 33.6], [131.9, 32.6], [131, 31.1], [130.2, 31.3]] }, // Kyushu
  { size: 0.9, ring: [[130.9, 34], [132.6, 35.4], [136, 35.7], [137.4, 37], [139.5, 38.4], [140, 40.5], [141.4, 41.4], [142, 39.5], [141, 37.7], [140.7, 35.7], [139, 34.9], [137, 34.6], [135.7, 33.5], [134.7, 34.7], [132.4, 33.9]] }, // Honshu
  { size: 1.0, ring: [[95.3, 5.6], [97.5, 5.2], [100.4, 2.4], [103.6, 0], [106, -3], [105.8, -5.8], [104.5, -5.8], [101, -2.7], [98.7, 1.5]] }, // Sumatra
  { size: 0.8, ring: [[105.2, -6.7], [106.8, -6], [108.5, -6.7], [111, -6.4], [114.5, -7.8], [114.4, -8.6], [110, -8.1], [106.4, -7.4]] }, // Java
];

function inside(lon: number, lat: number, ring: number[][]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

type Cell = { a: V3; b: V3; c: V3; d: V3; hi: boolean; lat: number };
let CELLS: Cell[] | null = null;

function landCells() {
  if (CELLS) return CELLS;
  const out: Cell[] = [];
  const step = 0.1;
  const height = (lon: number, lat: number) => 0.06 + Math.max(0, fbm(lon * 1.7, lat * 1.7, 3, 4) + 0.2) * 1.7;
  for (let lon = 118; lon < 128; lon += step)
    for (let lat = 5; lat < 19; lat += step) {
      const mx = lon + step / 2, my = lat + step / 2;
      const ring = ALL.find((r) => inside(mx, my, r));
      if (!ring) continue;
      const v = (x: number, y: number) => LL(x, y, height(x, y));
      out.push({ a: v(lon, lat), b: v(lon + step, lat), c: v(lon + step, lat + step), d: v(lon, lat + step), hi: ring === SAMAR || ring === LEYTE, lat });
    }
  CELLS = out;
  return out;
}

const LAND = [hex("#3f7a45"), hex("#548c4a"), hex("#6a9a50"), hex("#8c9a5a")];
const LAND_HI = [hex("#79a84e"), hex("#8cb855"), hex("#a0c05c")];
const SEA = hex("#0d3b66"), SEA2 = hex("#0a2f54");

/** Land, as shown from orbit or on the studio map. `highlight` lifts Samar and Leyte out of the rest. */
export function emitLand(out: Tri[], highlight = 0, map?: (p: V3) => V3) {
  const m = map ?? ((p: V3) => p);
  landCells().forEach((c, i) => {
    const base = LAND[Math.floor(hash2(i, 1, 2) * LAND.length)];
    const col = c.hi && highlight > 0 ? mixRGB(base, LAND_HI[i % 3], highlight) : base;
    const a = m(c.a), b = m(c.b), cc = m(c.c), d = m(c.d);
    out.push({ a, b, c: cc, color: col }, { a, b: cc, c: d, color: vary(col, i, 0.1) });
  });
}

/** The ocean as coarse facets. */
export function emitSea(out: Tri[], t: number, cx: number, cz: number, half = 420, cell = 22) {
  const fx = Math.floor(cx / cell) * cell, fz = Math.floor(cz / cell) * cell;
  for (let x = fx - half; x < fx + half; x += cell)
    for (let z = fz - half; z < fz + half; z += cell) {
      const k = hash2(x / cell, z / cell, 4);
      const col = mixRGB(SEA, SEA2, k);
      out.push({ a: [x, 0, z], b: [x + cell, 0, z], c: [x + cell, 0, z + cell], color: col, zBias: 8, mirror: 0.2 }, { a: [x, 0, z], b: [x + cell, 0, z + cell], c: [x, 0, z + cell], color: vary(col, x + z, 0.07), zBias: 8, mirror: 0.2 });
    }
}

// ── The storm ────────────────────────────────────────────────────────────────────────────────────────

const HEADING = (22.5 * Math.PI) / 180;

/** Where the eye is at a story hour: west-northwest at 14 km/h, through the origin at landfall. */
export function stormPos(hours: number, y = 0): V3 {
  const d = (-hours * 14) / 10;
  return [d * Math.cos(HEADING), y, d * Math.sin(HEADING)];
}

export type StormLook = { R: number; eye: number; peak: number; tight: number };

/** How the storm looks at a story hour. */
export function stormLook(hours: number): StormLook {
  const grow = smooth(-72, -18, hours), decay = smooth(4, 40, hours);
  return {
    R: 24 + 26 * grow - 12 * decay,
    eye: 0.4 + 2.8 * grow * (1 - decay),
    peak: 1.3 + 1.6 * grow - 1.1 * decay,
    tight: 0.45 + 0.55 * grow - 0.4 * decay,
  };
}

const CLOUD = hex("#f2f4f6"), CLOUD_SHADE = hex("#9aa6b3"), EYEWALL = hex("#b9c2cd"), EYE_FLOOR = hex("#1a4a70");

/** Kalakas: a disc of faceted cloud whose bands wind in to a clear eye and turn anticlockwise from above. */
export function emitStorm(out: Tri[], c: V3, L: StormLook, t: number, fine = 1) {
  const rings = Math.round(30 * fine), sectors = Math.round(72 * fine);
  const spin = t * 0.38;
  const rOf = (i: number) => L.eye * (L.R / L.eye) ** (i / rings);
  const top = (r: number, a: number) => {
    const wall = Math.exp(-(((r - L.eye * 1.55) / (L.eye * 1.3 + 1)) ** 2));
    const band = density(r, a);
    return L.peak * (0.2 + 0.8 * wall) * (0.45 + 0.55 * band) * smooth(L.R, L.R * 0.55, r);
  };
  function density(r: number, a: number) {
    const phase = 3 * (a - spin + 1.05 * Math.log(r / L.eye + 0.2));
    const arms = 0.5 + 0.5 * Math.cos(phase);
    const fade = smooth(L.eye * 1.2, L.eye * 3.8, r);
    const core = 1 - fade;
    const fine2 = noise2(r * 0.6 + 3, (a - spin) * 3.2, 7);
    return Math.min(1, core * 1.4 + fade * (arms * (0.45 + 0.75 * L.tight) + fine2 * 0.55 - 0.1));
  }
  const pt = (i: number, j: number): V3 => {
    const r = rOf(i), a = (j / sectors) * Math.PI * 2 + (i % 2 ? Math.PI / sectors : 0);
    return [c[0] + Math.cos(a) * r, 0.25 + top(r, a), c[2] - Math.sin(a) * r];
  };
  for (let i = 0; i < rings; i++) {
    const r = rOf(i + 0.5);
    for (let j = 0; j < sectors; j++) {
      const a = ((j + 0.5) / sectors) * Math.PI * 2;
      const d = density(r, a);
      const edge = smooth(L.R, L.R * 0.72, r);
      const alpha = Math.min(1, (d - 0.32) * 4) * edge;
      if (alpha <= 0.03) continue;
      const tone = hash2(i, j, 3);
      const col = mixRGB(CLOUD_SHADE, CLOUD, 0.45 + 0.55 * d - tone * 0.12);
      const A = pt(i, j), B = pt(i, j + 1), C = pt(i + 1, j), D = pt(i + 1, j + 1);
      out.push({ a: A, b: B, c: D, color: col, alpha: Math.min(1, alpha) }, { a: A, b: D, c: C, color: vary(col, i * 3 + j, 0.05), alpha: Math.min(1, alpha) });
    }
  }
  // The eye: a sheer stadium wall down to the sea, the sea showing through its floor.
  if (L.eye > 1.2) {
    for (let j = 0; j < sectors; j++) {
      const a0 = (j / sectors) * Math.PI * 2, a1 = ((j + 1) / sectors) * Math.PI * 2;
      const P = (a: number, r: number, y: number): V3 => [c[0] + Math.cos(a) * r, y, c[2] - Math.sin(a) * r];
      const rr0 = L.eye, h0 = 0.25 + top(rr0, a0), h1 = 0.25 + top(rr0, a1);
      const lo = L.eye * 0.62;
      const shadeK = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(a0 - 0.8));
      const wall = mixRGB(hex("#5d6876"), EYEWALL, shadeK);
      out.push({ a: P(a0, rr0, h0), b: P(a1, rr0, h1), c: P(a1, lo, 0.12), color: wall, zBias: -0.2 }, { a: P(a0, rr0, h0), b: P(a1, lo, 0.12), c: P(a0, lo, 0.12), color: vary(wall, j, 0.06), zBias: -0.2 });
      out.push({ a: [c[0], 0.08, c[2]], b: P(a0, lo, 0.1), c: P(a1, lo, 0.1), color: EYE_FLOOR, zBias: 0.8 });
    }
  }
}

/** Lightning inside the storm: a flash now and then, a light and a glow at a seeded spot. */
export function emitLightning(glows: Glow[], lights: PointLight[], c: V3, L: StormLook, t: number, rate = 1.6) {
  const k = Math.floor(t * rate);
  const r = rng(k * 7 + 3);
  const fire = r();
  const when = r() / rate;
  const dt = t - k / rate - when;
  if (fire < 0.65 && dt >= 0 && dt < 0.2) {
    const a = r() * Math.PI * 2, rad = L.eye * (1.2 + r() * 1.8);
    const p: V3 = [c[0] + Math.cos(a) * rad, L.peak * 0.5, c[2] - Math.sin(a) * rad];
    const flick = (dt < 0.05 || (dt > 0.1 && dt < 0.14) ? 1 : 0.35);
    glows.push({ p, radius: L.eye * 2.2, color: [205, 215, 255], alpha: 0.75 * flick });
    lights.push({ p, color: [215, 225, 255], intensity: 2.4 * flick, range: L.eye * 5 });
  }
}

/** The forecast cone from `from` towards the track's future, growing wider, as far along as `reveal` (0…1). */
export function emitCone(out: Tri[], from: V3, reveal: number, color: RGB = hex("#f2413c")) {
  const n = 22;
  const far = -60;
  const startS = from[0] / Math.cos(HEADING);
  const pt = (k: number, side: number): V3 => {
    const s = startS + (far - startS) * k;
    const w = 1.5 + Math.abs(k) * 15;
    return [s * Math.cos(HEADING) - side * w * Math.sin(HEADING), 2.6, s * Math.sin(HEADING) + side * w * Math.cos(HEADING)];
  };
  for (let i = 0; i < n; i++) {
    const k0 = (i / n) * reveal, k1 = ((i + 1) / n) * reveal;
    const col = mixRGB(color, hex("#ffc24b"), i / n * 0.35);
    out.push({ a: pt(k0, -1), b: pt(k0, 1), c: pt(k1, 1), color: col, alpha: 0.3, glow: 1, zBias: -1 }, { a: pt(k0, -1), b: pt(k1, 1), c: pt(k1, -1), color: col, alpha: 0.3, glow: 1, zBias: -1 });
  }
}

export { norm };
