// The volcano world: a stratovolcano over a plain and a bay, a village on its east flank. The summit swells and
// steams, then blows: lava bombs, a Plinian ash column that spreads into an umbrella cloud, three lava flows down the
// gullies (one into the village), a pyroclastic flow down the south flank, and ash darkening the sky.
import { hex, mixRGB, smooth, type Env, type Frame, type Glow, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { ballistic, emitGrid, fbm, hash2, house, makeGrid, octa, rng, sampleGrid, shake, shotCamera, tetra, tree, vary, type Shot } from "../../src/kit/lowpoly/world";

export const ERUPT = 8.5;
export const PYRO = 14;
const SUMMIT = 24;

const bulge = (r: number, t: number) => (t < ERUPT ? 1.6 * smooth(2.5, ERUPT, t) : 0) * Math.exp(-((r / 8) ** 2));

export function ground(x: number, z: number, t = 0) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  let h = 26 * Math.exp(-((r / 20) ** 1.7));
  h += 1.4 * Math.sin(th * 9 + fbm(x * 0.05, z * 0.05, 2, 3) * 4) * smooth(4, 10, r) * Math.exp(-((r / 30) ** 2));
  const crater = t >= ERUPT ? 6.5 : 5;
  if (r < crater) h -= (1 - r / crater) ** 1.5 * 6;
  h += fbm(x * 0.04, z * 0.04, 3, 7) * 4 + 0.5;
  if (x < -38) h -= (-38 - x) * 0.32;
  return h + bulge(r, t);
}

// ── Lava ─────────────────────────────────────────────────────────────────────────────────────────────

const CHANNELS = [
  { phi: 0.12, start: ERUPT + 1, speed: 2.3, k: 0 },
  { phi: 2.4, start: ERUPT + 2, speed: 1.9, k: 1 },
  { phi: -2.1, start: ERUPT + 2.8, speed: 1.7, k: 2 },
];
const MAX_R = 44;
const channelCentre = (c: (typeof CHANNELS)[number], r: number) => c.phi + 0.22 * Math.sin(r * 0.14 + c.k * 2);
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Seconds since lava reached this spot, or −1 if it hasn't. */
export function lavaAge(x: number, z: number, t: number) {
  if (t < ERUPT) return -1;
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  if (r < 6.5) return t - ERUPT;
  let best = -1;
  for (const c of CHANNELS) {
    if (r > MAX_R) continue;
    const arrival = c.start + (r - 5) / c.speed;
    if (t < arrival) continue;
    const lateral = Math.abs(angleDiff(th, channelCentre(c, r))) * r;
    const width = (1.3 + r * 0.07) * (0.6 + 0.4 * smooth(arrival, arrival + 3, t)) * (1 - smooth(MAX_R - 6, MAX_R, r) * 0.6);
    if (lateral < width) best = Math.max(best, t - arrival);
  }
  return best;
}

export const lavaFront = (i: number, t: number): V3 => {
  const c = CHANNELS[i];
  const r = Math.min(MAX_R, Math.max(5, 5 + (t - c.start) * c.speed));
  const th = channelCentre(c, r);
  const x = r * Math.cos(th), z = r * Math.sin(th);
  return [x, ground(x, z, t) + 0.6, z];
};

const HOT = hex("#ffe27a"), ORANGE = hex("#ff6a1a"), RED = hex("#b3260f"), CRUST = hex("#33221d");
function lavaLook(age: number, seed: number): { color: RGB; glow: number } {
  if (age < 1.5) return { color: mixRGB(HOT, ORANGE, age / 1.5), glow: 1 };
  if (age < 4) return { color: mixRGB(ORANGE, RED, (age - 1.5) / 2.5), glow: 0.9 };
  // Cooled crust keeps glowing cracks.
  const crack = hash2(seed, 3, 1) > 0.78;
  const k = smooth(4, 9, age);
  return crack ? { color: mixRGB(RED, ORANGE, 0.3), glow: 0.75 } : { color: mixRGB(RED, CRUST, k), glow: 0.6 * (1 - k) + 0.05 };
}

// ── Pyroclastic flow ─────────────────────────────────────────────────────────────────────────────────

export const PYRO_DIR = 1.75;
export const pyroReach = (t: number) => (t < PYRO ? 0 : Math.min(62, 7.5 * (t - PYRO)));
const inPyroSector = (th: number, r: number) => Math.abs(angleDiff(th, PYRO_DIR)) < 0.32 + 6 / Math.max(r, 6);

// ── The village and the trees ────────────────────────────────────────────────────────────────────────

type House = { x: number; z: number; yaw: number; size: V3; wall: RGB; roof: RGB; burn: number };
type Plant = { x: number; z: number; s: number; color: RGB; burn: number; ash: number };

const WALLS = ["#efe3cf", "#e2c29b", "#d6dfe3", "#efd2c4", "#cdd6b9"].map(hex);
const ROOFS = ["#a8452f", "#7a3426", "#556b84", "#8a5a36"].map(hex);

function burnTime(x: number, z: number) {
  for (let t = ERUPT; t < 31; t += 1 / 15) if (lavaAge(x, z, t) >= 0) return t;
  return Infinity;
}
function ashTime(x: number, z: number) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  if (!inPyroSector(th, r)) return Infinity;
  return PYRO + r / 7.5;
}

let villageCache: { houses: House[]; plants: Plant[] } | null = null;
export function village() {
  if (villageCache) return villageCache;
  const r = rng(77);
  const houses: House[] = [];
  for (let tries = 0; houses.length < 32 && tries < 3000; tries++) {
    const rr = 27 + r() * 13, th = -0.45 + r() * 1.1;
    const x = rr * Math.cos(th), z = rr * Math.sin(th);
    if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 3.4)) continue;
    if (Math.hypot(x - 47, z - 12) < 6) continue;
    const w = 1.8 + r() * 1.0;
    houses.push({ x, z, yaw: r() * 0.4 - 0.2 + (r() < 0.5 ? 0 : Math.PI / 2), size: [w, 1.3 + r(), w * (0.9 + r() * 0.4)], wall: WALLS[Math.floor(r() * WALLS.length)], roof: ROOFS[Math.floor(r() * ROOFS.length)], burn: burnTime(x, z) });
  }
  const plants: Plant[] = [];
  for (let tries = 0; plants.length < 170 && tries < 5000; tries++) {
    const rr = 13 + r() * 50, th = r() * Math.PI * 2;
    const x = rr * Math.cos(th), z = rr * Math.sin(th);
    if (Math.abs(x) > 68 || Math.abs(z) > 68 || ground(x, z) < 0.6) continue;
    if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 2.2)) continue;
    plants.push({ x, z, s: 1.6 + r() * 1.8, color: vary(hex("#3d7436"), tries, 0.15), burn: burnTime(x, z), ash: ashTime(x, z) });
  }
  villageCache = { houses, plants };
  return villageCache;
}

// ── Frames ───────────────────────────────────────────────────────────────────────────────────────────

const GRID = makeGrid(-70, -70, 56, 56, 2.5, 5);

export const SHOTS: Shot[] = [
  { from: 0, to: 3.5, pos: [[75, 22, 55], [64, 20, 68]], target: [[0, 14, 0], [0, 14, 0]], fov: [50, 50] },
  { from: 3.5, to: ERUPT, pos: [[34, 36, 36], [27, 32, 30]], target: [[0, 23, 0], [0, 25, 0]], fov: [55, 52] },
  { from: ERUPT, to: PYRO, pos: [[70, 10, -30], [84, 14, -42]], target: [[0, 34, 0], [0, 46, 0]], fov: [56, 60] },
  { from: PYRO, to: 19, pos: [[36, 24, 58], [32, 20, 52]], target: [[2, 6, 12], [6, 5, 14]], fov: [56, 58] },
  { from: 19, to: 24.5, pos: [[47, 5, 13], [45, 5.5, 10]], target: [[22, 7, 3], [26, 7, 3]], fov: [58, 60] },
  { from: 24.5, to: 31, pos: [[95, 34, 80], [108, 44, 96]], target: [[0, 34, 0], [0, 38, 0]], fov: [56, 56] },
];

const CLEAR: Env = {
  skyTop: hex("#3d6f9c"),
  skyBottom: hex("#e3d6c2"),
  fog: hex("#cfc6b8"),
  fogNear: 60,
  fogFar: 230,
  sun: [0.5, 0.65, 0.57].map((v) => v / Math.hypot(0.5, 0.65, 0.57)) as V3,
  sunColor: [255, 236, 210],
  ambient: [108, 116, 130],
};
const ASHEN = { skyTop: hex("#2a2220"), skyBottom: hex("#86705c"), fog: hex("#6e5c4e"), sunColor: [205, 135, 90] as RGB, ambient: [84, 76, 72] as RGB };

export function envAt(t: number): Env {
  const k = smooth(11, 24, t);
  return {
    ...CLEAR,
    skyTop: mixRGB(CLEAR.skyTop, ASHEN.skyTop, k),
    skyBottom: mixRGB(CLEAR.skyBottom, ASHEN.skyBottom, k),
    fog: mixRGB(CLEAR.fog, ASHEN.fog, k),
    fogFar: 230 - 50 * k,
    sunColor: mixRGB(CLEAR.sunColor, ASHEN.sunColor, k),
    ambient: mixRGB(CLEAR.ambient, ASHEN.ambient, k),
  };
}

/** How high the eruption column has climbed (world units above the summit). */
export const columnTop = (t: number) => (t < ERUPT ? 0 : 62 * (1 - Math.exp(-(t - ERUPT) / 4)));

export const LIGHTNING = [16.2, 17.9, 19.4, 21.0, 22.6, 24.1, 25.6];

export function volcanoFrame(t: number): Frame {
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const G = sampleGrid(GRID, (x, z) => ground(x, z, t));
  const age = new Float32Array(G.H.length);
  for (let k = 0; k < age.length; k++) {
    age[k] = lavaAge(G.X[k], G.Z[k], t);
    if (age[k] >= 0) G.H[k] += 0.35;
  }
  const reach = pyroReach(t);
  const ashK = smooth(13, 26, t);

  const GRASS = hex("#5d8f43"), DRY = hex("#8f8a55"), ROCK = hex("#6f655c"), DARK = hex("#4a403b"), SAND = hex("#d8c896"), ASH = hex("#8b847c");
  emitGrid(tris, GRID, G, (a, b, c, cx, cz) => {
    const lava = [a, b, c].filter((k) => age[k] >= 0);
    if (lava.length >= 2) return lavaLook(lava.reduce((s, k) => s + age[k], 0) / lava.length, a * 31 + b);
    const h = (G.H[a] + G.H[b] + G.H[c]) / 3;
    const r = Math.hypot(cx, cz);
    if (h < 0.1) return null;
    let col = h < 0.9 && cx < -30 ? SAND : r < 9 ? DARK : r < 17 ? ROCK : h > 9 ? mixRGB(ROCK, DRY, 0.4) : hash2(a, c) > 0.5 ? GRASS : mixRGB(GRASS, DRY, 0.35);
    // Ash coats the south flank behind the pyroclastic flow, and settles everywhere as the sky darkens.
    if (reach > 0 && r < reach - 2 && inPyroSector(Math.atan2(cz, cx), r)) col = mixRGB(col, ASH, 0.75);
    col = mixRGB(col, ASH, ashK * 0.45);
    return { color: vary(col, a * 7 + c) };
  });
  // The bay.
  emitGrid(tris, GRID, sampleGrid(GRID, (x, z) => 0.05 * Math.sin(x * 0.4 + t) + 0.05 * Math.sin(z * 0.5 - t * 1.2)), (a, b, c, cx, cz) => {
    if (ground(cx, cz) > 0.4 || cx > -20) return null;
    return { color: vary(mixRGB(hex("#2f7fa0"), hex("#4a4a48"), ashK * 0.6), a + b) };
  });

  const { houses, plants } = village();
  for (const h of houses) {
    const burning = t >= h.burn;
    const p = t - h.burn;
    const char = burning ? smooth(0, 2.5, p) : 0;
    const y = ground(h.x, h.z, t) - 0.2 + (lavaAge(h.x, h.z, t) >= 0 ? 0.35 : 0);
    const size: V3 = [h.size[0], h.size[1] * (1 - 0.5 * smooth(2, 5, p)), h.size[2]];
    house(tris, { pos: [h.x, y, h.z], yaw: h.yaw, size }, mixRGB(mixRGB(h.wall, ASH, ashK * 0.4), CRUST, char), mixRGB(h.roof, CRUST, char), { glow: burning ? 0.25 * (1 - smooth(4, 9, p)) : 0 });
    if (burning && p < 9) {
      const r = rng(Math.round(h.x * 100 + h.z));
      for (let i = 0; i < 5; i++) {
        const flick = 0.6 + 0.4 * Math.sin(t * 17 + i * 2.1);
        tetra(tris, { pos: [h.x + (r() - 0.5) * h.size[0], y + size[1] + 0.3 + r() * 0.8, h.z + (r() - 0.5) * h.size[2]], yaw: t * 3 + i, size: (0.5 + r() * 0.6) * flick * (1 - p / 9) }, { color: i % 2 ? ORANGE : HOT, glow: 1 });
      }
      glows.push({ p: [h.x, y + 2, h.z], radius: 6, color: [255, 120, 40], alpha: 0.3 * (1 - p / 9) });
    }
  }
  for (const pl of plants) {
    const burnt = t >= pl.burn, ashed = t >= pl.ash;
    if (burnt && t - pl.burn > 1.2) continue;
    const col = burnt ? mixRGB(pl.color, CRUST, smooth(0, 1, t - pl.burn)) : ashed ? mixRGB(pl.color, ASH, 0.85) : mixRGB(pl.color, ASH, ashK * 0.5);
    tree(tris, { pos: [pl.x, ground(pl.x, pl.z, t) - 0.1, pl.z], size: pl.s, pitch: ashed ? 1.3 * smooth(0, 0.5, t - pl.ash) : 0, yaw: PYRO_DIR }, col);
  }

  // Steam from the summit before the eruption.
  if (t < ERUPT + 1) {
    for (let i = 0; i < 18; i++) {
      const a = (t * (0.8 + 0.5 * smooth(3, ERUPT, t)) + i * 0.27) % 7;
      const r = rng(i * 13 + 1);
      const [ox, oz, sz] = [r() - 0.5, r() - 0.5, r()];
      octa(tris, { pos: [ox * 4 + a * 0.6, SUMMIT + bulge(0, t) - 2 + a * 2.6, oz * 4 + a * 0.4], size: (0.5 + sz * 0.4) * (1 + a * 0.3), yaw: i }, { color: mixRGB(hex("#f1f3f4"), hex("#c9ccce"), a / 7), glow: 0.45 });
    }
  }

  if (t >= ERUPT) {
    const since = t - ERUPT;
    const blast = Math.exp(-since / 2.5);
    glows.push({ p: [0, SUMMIT + 2, 0], radius: 26, color: [255, 110, 30], alpha: 0.55 * (0.55 + 0.45 * blast) });
    // The ash column: puffs launched one after another, rising, widening, then spreading as the umbrella cloud.
    const N = 380;
    for (let i = 0; i < N; i++) {
      const r = rng(i * 7 + 3);
      const [ra, rr, rs, rc] = [r(), r(), r(), r()];
      const born = ERUPT + (i / N) * 20 + ra * 0.2;
      const a = t - born;
      if (a < 0) continue;
      const top = 62 * (1 - Math.exp(-a / 4));
      const y = SUMMIT + top;
      const ang = ra * Math.PI * 2;
      const umbrella = smooth(42, 62, top);
      const rad = (2 + a * 1.4) * (0.3 + rr) + umbrella * a * 4.5 * rr;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad + a * 1.1 * smooth(20, 60, top);
      const size = 3 + a * 1.0 + umbrella * 3;
      const hot = Math.max(0, 1 - a / 1.6);
      const col = mixRGB(mixRGB(hex("#4f4945"), hex("#8f877e"), smooth(20, 60, top) * 0.6 + rc * 0.2), ORANGE, hot * 0.7);
      octa(tris, { pos: [x, y, z], size: [size, size * 0.8, size], yaw: i * 1.3 + a * 0.2 }, { color: col, glow: hot * 0.6 });
    }
    // Lava bombs in three bursts.
    for (let i = 0; i < 96; i++) {
      const r = rng(i * 11 + 5);
      const [ra, rv, rh, rs] = [r(), r(), r(), r()];
      const launch = ERUPT + Math.floor(i / 32) * 2.2 + (i % 32) * 0.05;
      const a = t - launch;
      if (a < 0) continue;
      const v0: V3 = [Math.cos(ra * 6.283) * (5 + rh * 10), 18 + rv * 14, Math.sin(ra * 6.283) * (5 + rh * 10)];
      const p = ballistic([0, SUMMIT, 0], v0, a, 9.8);
      if (p[1] < ground(p[0], p[2], t)) continue;
      tetra(tris, { pos: p, yaw: a * 5 + i, pitch: a * 3, size: 0.5 + rs * 0.7 }, { color: rs > 0.5 ? HOT : ORANGE, glow: 1 });
    }
    for (let i = 0; i < CHANNELS.length; i++) if (t > CHANNELS[i].start) glows.push({ p: lavaFront(i, t), radius: 8, color: [255, 120, 40], alpha: 0.45 });
  }

  // The pyroclastic flow: a rolling cloud hugging the flank, rising off it as it slows.
  if (reach > 0) {
    for (let i = 0; i < 230; i++) {
      const r = rng(i * 17 + 9);
      const [rl, ra, rs, rc] = [r(), r(), r(), r()];
      const rr = Math.max(5, reach - rl * 16);
      const th = PYRO_DIR + (ra - 0.5) * (0.5 + 10 / rr);
      const x = rr * Math.cos(th), z = rr * Math.sin(th);
      const size = (1.6 + rs * 2.6) * (1 + rl * 0.6);
      const lift = rl * (t - PYRO) * 0.5;
      octa(tris, { pos: [x, ground(x, z, t) + size * 0.5 + lift, z], size: [size, size * 0.75, size], yaw: i + t * 0.4 }, { color: mixRGB(hex("#9a9188"), hex("#5e5650"), rc * 0.6 + rl * 0.3) });
    }
  }

  let camera = shotCamera(SHOTS, t);
  const tremor = t < ERUPT ? 0.05 + 0.35 * smooth(2, ERUPT, t) : 0;
  const boom = t >= ERUPT ? 1.4 * Math.exp(-(t - ERUPT) / 1.4) + 0.18 : 0;
  camera = shake(camera, t, tremor + boom);
  const flash = LIGHTNING.some((l) => t >= l && t < l + 0.12);
  const env = envAt(t);
  if (flash) env.ambient = mixRGB(env.ambient, [200, 200, 255], 0.5);
  return { tris, camera, env, glowsFront: glows };
}

export function readouts(t: number) {
  const pre = smooth(1, ERUPT, t);
  const tremor = t < ERUPT ? 40 + 900 * pre ** 2 : 1400 * Math.exp(-(t - ERUPT) / 6) + 380;
  const so2 = t < ERUPT ? 1200 + 9000 * pre : 38000 + 4000 * Math.sin(t);
  const colKm = (columnTop(t) / 62) * 18.4;
  const villageR = 30;
  const front = Math.min(MAX_R, Math.max(0, 5 + (t - CHANNELS[0].start) * CHANNELS[0].speed));
  const toVillageKm = t < CHANNELS[0].start ? 6.2 : Math.max(0, (villageR - front) * 0.25);
  const lost = village().houses.filter((h) => h.burn <= t).length;
  return { tremor, so2, colKm, toVillageKm, lost, houses: village().houses.length, bulgeM: (bulge(0, t) / 1.6) * 1.8, pyroKm: pyroReach(t) * 0.25 };
}

/** The station's seismogram over the last `span` seconds. */
export function seismo(t: number, span = 5, n = 90) {
  return Array.from({ length: n }, (_, i) => {
    const tt = t - span + (i / (n - 1)) * span;
    const k = Math.floor(tt * 30);
    const amp = tt < ERUPT ? 0.05 + 0.45 * smooth(1, ERUPT, tt) ** 2 : 0.3 + 0.9 * Math.exp(-(tt - ERUPT) / 2);
    return (hash2(k, i, 9) - 0.5) * 2 * amp;
  });
}
