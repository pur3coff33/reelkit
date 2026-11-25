// The ground at Tukanalipao, schematic: 1 unit = 1 metre, +x east, −z north, the origin at the 55th's cornfield. The
// report gives relationships rather than a survey: the huts about 1.8 km from the 55th, 400 m beyond the last river; the
// 55th about 40 m from the river and 1.2 km from the highway; the nearest relief 700 m in from the highway. Everything is
// placed to agree with those, and the film says its positions are approximate.
import { hex, mixRGB, norm, type Env, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, hash2, house, octa, rng, vary } from "../../src/kit/lowpoly/world";
import { limb, poly } from "../typhoon/models";
import { COASTS, LL } from "../typhoon/geo";

export const HIGHWAY_Z = 1200;
export const VDOP: V3 = [-350, 0, HIGHWAY_Z];
export const ACP: V3 = [-300, 0, HIGHWAY_Z - 20];
export const FIELD: V3 = [0, 0, 40];
export const HUTS: V3 = [620, 0, -1690];
export const RIVERBANK_84: V3 = [700, 0, -830];
export const WP9: V3 = [-260, 0, 500];
export const BRIDGE: V3 = [120, 0, -80];
export const CROSSING: V3 = [790, 0, -1290];
/** Where the white phosphorus lands: on the hostile line across the river from the 84th. */
export const WP_POINT: V3 = [430, 0, -1010];

/** The river, west to east. */
const RIVER_KEYS: [number, number][] = [[-3000, -260], [-1600, -150], [-600, -70], [0, -52], [350, -190], [620, -700], [760, -1290], [1250, -1520], [2000, -1720], [3400, -2000]];

function catmull(pts: [number, number][], steps: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export const RIVER = catmull(RIVER_KEYS, 10);

/** Distance to the river. */
export function riverDist(x: number, z: number) {
  let best = Infinity;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
    const dx = bx - ax, dz = bz - az;
    const k = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + k * dx), z - (az + k * dz)));
  }
  return best;
}

// ── Colours of the land ──────────────────────────────────────────────────────────────────────────────

const CORN = hex("#83913f"), RICE = hex("#5f8f4c"), FALLOW = hex("#8f7f58"), GRASS = hex("#6d8c47"), MARSH = hex("#50705c"), MUD = hex("#5a5748");

const inField = (x: number, z: number) => x > -360 && x < 460 && z > -46 && z < 290;
export const isMarsh = (x: number, z: number) => z > 300 && z < 1110 && x > -1050 && x < 900 && fbm(x * 0.0024, z * 0.0024, 3, 12) > -0.16;

/** The land's colour at a point, parcelled like farmland seen from the air. */
export function landColor(x: number, z: number): RGB {
  if (inField(x, z)) return vary(CORN, Math.floor(x / 9) + Math.floor(z / 9) * 31, 0.08);
  if (isMarsh(x, z)) return mixRGB(MARSH, MUD, Math.max(0, Math.min(1, 0.5 + fbm(x * 0.006, z * 0.006, 3, 4) * 2.4)));
  if (riverDist(x, z) < 70) return GRASS;
  const px = Math.floor((x + (z > 0 ? 40 : 0)) / 230), pz = Math.floor(z / 170);
  const h = hash2(px, pz, 5);
  return h < 0.42 ? CORN : h < 0.64 ? RICE : h < 0.84 ? FALLOW : GRASS;
}

// ── The fixed world, built once ──────────────────────────────────────────────────────────────────────

/** Ground faces sort behind everything: nothing stands under them. */
const GROUND_BIAS = 20000, WATER_BIAS = 19000, ROAD_BIAS = 18000;

function strip(out: Tri[], pts: [number, number][], width: number, y: number, color: RGB, bias: number, extra: Partial<Tri> = {}) {
  const w = width / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const a = i ? pts[i - 1] : pts[i], c = pts[Math.min(pts.length - 1, i + 2)];
    const n0 = norm([-(bz - a[1]), 0, bx - a[0]]), n1 = norm([-(c[1] - az), 0, c[0] - ax]);
    poly(out, [[ax + n0[0] * w, y, az + n0[2] * w], [bx + n1[0] * w, y, bz + n1[2] * w], [bx - n1[0] * w, y, bz - n1[2] * w], [ax - n0[0] * w, y, az - n0[2] * w]], color, { zBias: bias, ...extra });
  }
}

let GROUND: Tri[] | null = null;
/** What stands on the land: where, how tall and how wide. */
const STANDING: { x: number; z: number; h: number; w: number }[] = [];
/** The faces of the trees, so a shot at ground level can leave out any that would stand right in front of the lens. */
const TREE_FACES = new Set<Tri>();

export const isTreeFace = (t: Tri) => TREE_FACES.has(t);

/** The whole district: land, river, highway, villages, trees. */
export function district(): Tri[] {
  if (GROUND) return GROUND;
  const out: Tri[] = [];
  const cell = 60, x0 = -2600, x1 = 3200, z0 = -3400, z1 = 2800;
  poly(out, [[-30000, -0.5, -30000], [30000, -0.5, -30000], [30000, -0.5, 30000], [-30000, -0.5, 30000]], hex("#6a7a4c"), { zBias: GROUND_BIAS + 20000 });
  for (let z = z0; z < z1; z += cell)
    for (let x = x0; x < x1; x += cell) {
      const c = landColor(x + cell / 2, z + cell / 2);
      const j = (a: number, b: number): V3 => [a + (hash2(a, b, 3) - 0.5) * cell * 0.5, 0, b + (hash2(a, b, 8) - 0.5) * cell * 0.5];
      const p = j(x, z), q = j(x + cell, z), r = j(x + cell, z + cell), s = j(x, z + cell);
      out.push({ a: p, b: q, c: r, color: vary(c, x + z * 7, 0.05), zBias: GROUND_BIAS }, { a: p, b: r, c: s, color: vary(c, x * 3 + z, 0.05), zBias: GROUND_BIAS });
    }
  strip(out, RIVER, 62, 0.1, hex("#6c6a50"), WATER_BIAS + 500);
  strip(out, RIVER, 40, 0.2, hex("#44626a"), WATER_BIAS, { mirror: 0.3 });
  strip(out, [[x0, HIGHWAY_Z], [x1, HIGHWAY_Z]], 15, 0.2, hex("#8c8579"), ROAD_BIAS);

  const r = rng(404);
  const WALLS = ["#8c7452", "#9a8156", "#7f6a4a", "#a48e6a"].map(hex), ROOFS = ["#6c6242", "#5c5a42", "#7a6f50", "#7c7f85"].map(hex);
  const hut = (x: number, z: number, s = 1) => (STANDING.push({ x, z, h: 5 * s, w: 5 * s }), house(out, { pos: [x, 0, z], yaw: r() * Math.PI, size: [9 * s, 3 * s, 7 * s] }, WALLS[Math.floor(r() * 4)], ROOFS[Math.floor(r() * 4)]));
  const village = (cx: number, cz: number, n: number, spread: number) => {
    for (let i = 0; i < n; i++) hut(cx + (r() - 0.5) * spread, cz + (r() - 0.5) * spread);
  };
  for (let x = -2200; x < 2800; x += 60 + r() * 120) hut(x, HIGHWAY_Z + (r() < 0.5 ? -1 : 1) * (22 + r() * 34));
  village(-720, -520, 22, 260);
  village(180, -640, 14, 190);
  village(-1000, 300, 12, 200);
  village(1420, -1380, 16, 240);
  village(1050, 840, 12, 180);
  // The four huts.
  for (const [dx, dz] of [[0, 0], [34, -22], [-28, -30], [12, -52]]) hut(HUTS[0] + dx, HUTS[2] + dz, 1.1);

  const TREE = ["#3f6a3a", "#4c7a3f", "#35593a"].map(hex), TRUNK = hex("#5a4b38");
  const tree = (x: number, z: number) => {
    const first = out.length;
    const s = 3.4 + r() * 3.2;
    STANDING.push({ x, z, h: s * 2.3, w: s });
    limb(out, [x, 0, z], [x, s * 1.3, z], s * 0.09, s * 0.06, TRUNK, 3);
    octa(out, { pos: [x, s * 1.75, z], size: [s, s * 0.62, s], yaw: r() * 3 }, (i) => ({ color: vary(TREE[Math.floor(r() * 3)], i + Math.floor(x), 0.12) }));
    octa(out, { pos: [x + s * 0.4, s * 1.42, z - s * 0.3], size: [s * 0.72, s * 0.46, s * 0.72], yaw: r() * 3 }, (i) => ({ color: vary(TREE[Math.floor(r() * 3)], i + Math.floor(z), 0.12) }));
    for (let k = first; k < out.length; k++) TREE_FACES.add(out[k]);
  };
  for (let i = 0; i < RIVER.length; i += 1) {
    const [x, z] = RIVER[i];
    if (Math.hypot(x, z - 40) < 220) continue;
    for (let k = 0; k < 3; k++) {
      const tx = x + (r() - 0.5) * 170, tz = z + (r() - 0.5) * 170;
      if (riverDist(tx, tz) > 30) tree(tx, tz);
    }
  }
  for (let i = 0; i < 26; i++) {
    const gx = x0 + r() * (x1 - x0), gz = z0 + r() * (z1 - z0);
    if (inField(gx, gz) || isMarsh(gx, gz)) continue;
    for (let k = 0; k < 7; k++) tree(gx + (r() - 0.5) * 150, gz + (r() - 0.5) * 150);
  }
  // The bamboo bridge.
  const dir: V3 = norm([0.35, 0, -1]);
  const bx = BRIDGE[0], bz = BRIDGE[2];
  poly(out, [[bx - dir[0] * 34 - 2, 2.2, bz - dir[2] * 34], [bx - dir[0] * 34 + 2, 2.2, bz - dir[2] * 34], [bx + dir[0] * 34 + 2, 2.2, bz + dir[2] * 34], [bx + dir[0] * 34 - 2, 2.2, bz + dir[2] * 34]], hex("#a08a5c"), { zBias: 200 });
  GROUND = out;
  return out;
}

/** The sun's shadows of everything standing, one soft shape each, swung by the hour. Nothing by moonlight. */
export function shadows(out: Tri[], env: Env) {
  const strength = Math.min(1, (env.sunColor[0] + env.sunColor[1]) / 260) * (env.sun[1] > 0.04 ? 1 : 0);
  if (strength < 0.45) return;
  const reach = Math.min(3.2, 1 / Math.max(0.2, env.sun[1]));
  const sx = -env.sun[0] * reach, sz = -env.sun[2] * reach;
  for (const s of STANDING) {
    const tx = s.x + sx * s.h, tz = s.z + sz * s.h;
    const len = Math.hypot(sx, sz) || 1, nx = (-sz / len) * s.w * 0.8, nz = (sx / len) * s.w * 0.8;
    poly(out, [[s.x + nx, 0.3, s.z + nz], [tx + nx * 0.8, 0.3, tz + nz * 0.8], [tx - nx * 0.8, 0.3, tz - nz * 0.8], [s.x - nx, 0.3, s.z - nz]], [10, 16, 14], { alpha: 0.3 * strength, zBias: 16000 });
  }
}

// ── The country, for the opening ─────────────────────────────────────────────────────────────────────

function inside(lon: number, lat: number, ring: number[][]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export const MAMASAPANO = LL(124.52, 6.92);
let COUNTRY: Tri[] | null = null;

/** The Philippines as coarse low-poly land on a dark sea. 1 unit = 10 km here (typhoon/geo's scale). */
export function country(): Tri[] {
  if (COUNTRY) return COUNTRY;
  const out: Tri[] = [];
  const a = LL(112, 22), b = LL(132, 2);
  poly(out, [[a[0], -0.2, a[2]], [b[0], -0.2, a[2]], [b[0], -0.2, b[2]], [a[0], -0.2, b[2]]], hex("#10202e"), { zBias: 900 });
  const step = 0.1;
  for (let lon = 116; lon < 128; lon += step)
    for (let lat = 4.8; lat < 19; lat += step) {
      if (!COASTS.some((ring) => inside(lon + step / 2, lat + step / 2, ring))) continue;
      const c = vary(hex("#55714f"), Math.round(lon * 31 + lat * 57), 0.1);
      const p = LL(lon, lat), q = LL(lon + step, lat), r = LL(lon + step, lat + step), s = LL(lon, lat + step);
      poly(out, [[p[0], 0.1, p[2]], [q[0], 0.1, q[2]], [r[0], 0.1, r[2]], [s[0], 0.1, s[2]]], c, { zBias: 400 });
    }
  COUNTRY = out;
  return out;
}

// ── The day's light ──────────────────────────────────────────────────────────────────────────────────

type Sky = { top: string; low: string; fog: string; sun: V3; sunColor: RGB; ambient: RGB; stars: number };

const SKIES: [number, Sky][] = [
  [4.8, { top: "#050a14", low: "#0d1626", fog: "#0a1320", sun: norm([0.35, 0.65, -0.2]), sunColor: [74, 92, 128], ambient: [36, 44, 66], stars: 0.75 }],
  [6.1, { top: "#3a4a6a", low: "#e0a17a", fog: "#b89a86", sun: norm([0.82, 0.18, 0.1]), sunColor: [178, 120, 80], ambient: [78, 76, 84], stars: 0 }],
  [8.5, { top: "#4f86c0", low: "#cfe0e6", fog: "#c3d3d6", sun: norm([0.7, 0.5, 0.15]), sunColor: [158, 148, 130], ambient: [92, 96, 100], stars: 0 }],
  [12, { top: "#5e8fc4", low: "#e2e6de", fog: "#d5d8cf", sun: norm([0.12, 0.98, 0.12]), sunColor: [150, 146, 134], ambient: [94, 94, 90], stars: 0 }],
  [16, { top: "#5b7fae", low: "#e6d6b6", fog: "#d6c7aa", sun: norm([-0.6, 0.55, 0.12]), sunColor: [160, 140, 112], ambient: [86, 84, 84], stars: 0 }],
  [18.2, { top: "#2b3b5e", low: "#d97a4c", fog: "#8a6a5e", sun: norm([-0.85, 0.15, 0.1]), sunColor: [176, 102, 66], ambient: [62, 58, 70], stars: 0 }],
  [19.4, { top: "#050a14", low: "#0d1626", fog: "#0a1320", sun: norm([-0.3, 0.65, -0.2]), sunColor: [74, 92, 128], ambient: [36, 44, 66], stars: 0.75 }],
  [28.8, { top: "#050a14", low: "#0d1626", fog: "#0a1320", sun: norm([0.35, 0.65, -0.2]), sunColor: [74, 92, 128], ambient: [36, 44, 66], stars: 0.75 }],
];

const hour24 = (h: number) => ((h - 4.8) % 24 + 24) % 24 + 4.8;

/** The sky at an hour of the day. `near` and `far` are the shot's own fog. */
export function envAt(hour: number, near: number, far: number): Env {
  const h = hour24(hour);
  let i = 0;
  while (i < SKIES.length - 2 && h >= SKIES[i + 1][0]) i++;
  const [ta, A] = SKIES[i], [tb, B] = SKIES[i + 1];
  const k = Math.min(1, Math.max(0, (h - ta) / (tb - ta)));
  const c = (a: string, b: string) => mixRGB(hex(a), hex(b), k);
  const v = (a: readonly number[], b: readonly number[]) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k] as RGB;
  return { skyTop: c(A.top, B.top), skyBottom: c(A.low, B.low), fog: c(A.fog, B.fog), fogNear: near, fogFar: far, sun: norm(v(A.sun, B.sun) as unknown as V3), sunColor: v(A.sunColor, B.sunColor), ambient: v(A.ambient, B.ambient), stars: A.stars + (B.stars - A.stars) * k };
}
