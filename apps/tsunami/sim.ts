// The tsunami world: a sloping seabed up to a curved coast, a town and hills behind it. A megathrust quake lifts a
// ridge of sea 120 km out; the shoreward wave slows and steepens over the shelf, the sea draws back off the beach,
// then the wave breaks over the town and floods inland. Everything is a function of t (seconds into the reel).
import { hex, mixRGB, smooth, type Env, type Frame, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, emitGrid, fbm, hash2, house, makeGrid, rng, sampleGrid, shake, shotCamera, tetra, tree, vary, type Shot } from "../../src/kit/lowpoly/world";

export const QUAKE = 1;
export const ARRIVE = 19;
const EPI = -100;

const shoreX = (z: number) => 3 * Math.sin(z * 0.07) + 8 * fbm(z * 0.03, 4.2, 3, 2);

export function ground(x: number, z: number) {
  const d = x - shoreX(z);
  if (d < 0) return Math.max(-7, d * 0.16) + fbm(x * 0.08, z * 0.08, 2, 5) * 0.8;
  const hills = smooth(10, 34, d) * (fbm(x * 0.05, z * 0.05, 3, 8) * 9 + 4);
  return 0.15 + d * 0.06 + hills;
}

/** Where the shoreward wave's crest is (x), before and after it reaches the coast. */
export function front(t: number) {
  if (t < 2) return EPI;
  if (t < ARRIVE) {
    const u = (t - 2) / (ARRIVE - 2);
    return EPI + -EPI * (1 - (1 - u) ** 1.7);
  }
  return 24 * (1 - Math.exp(-(t - ARRIVE) / 3.5));
}

/** The front bends a little along the coast. */
export const frontAt = (z: number, t: number) => front(t) + 4 * Math.sin(z * 0.05 + 1) + 2 * fbm(z * 0.04, t * 0.2, 2, 9);

/** Crest height in world units at a front position. */
export function amplitude(X: number) {
  const a = 1 + 5 * smooth(-45, -2, X) ** 1.5;
  return X > 0 ? a * Math.exp(-X / 22) : a;
}

/** Water surface height, how much of it is the wave (0…1), and how much of that breaks into foam. */
export function water(x: number, z: number, t: number): [number, number, number] {
  let h = 0.13 * Math.sin(0.35 * x + 0.7 * t + 2 * Math.sin(0.1 * z)) + 0.08 * Math.sin(0.5 * z - 0.9 * t + 0.2 * x);
  let crest = 0, foam = 0;
  if (t >= QUAKE && t < 2.6) h += 1.2 * smooth(QUAKE, 2, t) * Math.exp(-Math.max(0, t - 2) / 0.35) * Math.exp(-(((x - EPI) / 6) ** 2));
  if (t >= 2) {
    const ramp = smooth(2, 2.6, t);
    // The seaward half runs off the map.
    h += 0.6 * ramp * Math.exp(-(((x - (EPI - (t - 2) * 14)) / 8) ** 2));
    const X = frontAt(z, t);
    const A = amplitude(X) * ramp;
    const w = 9 - 5.5 * smooth(-45, 0, X);
    const d = x - X;
    const back = 1.6 * w + Math.max(0, X) * 0.9;
    const shape = d > 0 ? Math.exp(-((d / (0.55 * w)) ** 2)) : Math.exp(-((d / back) ** 2));
    h += A * shape;
    // The sea drawing back off the beach ahead of the crest.
    h -= 0.4 * A * smooth(-42, -6, X) * (1 - smooth(-2, 6, X)) * Math.exp(-(((d - 2.6 * w) / (1.4 * w)) ** 2));
    crest = shape * ramp;
    foam = d > -0.6 && shape > 0.9 ? smooth(0.9, 1, shape) * smooth(3, 5.5, A) * 0.7 : 0;
  }
  return [h, crest, foam];
}

// ── The town ─────────────────────────────────────────────────────────────────────────────────────────

type House = { x: number; z: number; yaw: number; size: V3; wall: RGB; roof: RGB; hit: number; spin: number; collapse: boolean };
type Boat = { x: number; z: number; yaw: number; hit: number; color: RGB };
type Plant = { x: number; z: number; s: number; color: RGB; hit: number };

const WALLS = ["#f2e6d0", "#e8c9a0", "#d9e3ea", "#f0d5d5", "#c9d8c0", "#f5f0e6"].map(hex);
const ROOFS = ["#c0533a", "#8a3b2e", "#4a5f7a", "#6b4f3a", "#b5763c"].map(hex);

/** The first time the flood stands `depth` deep at a spot (Infinity if it never does). */
function floodTime(x: number, z: number, depth: number) {
  const g = ground(x, z);
  for (let t = 12; t < 30; t += 1 / 15) if (water(x, z, t)[0] - g > depth) return t;
  return Infinity;
}

let townCache: { houses: House[]; boats: Boat[]; plants: Plant[] } | null = null;
export function town() {
  if (townCache) return townCache;
  const r = rng(42);
  const houses: House[] = [];
  for (let tries = 0; houses.length < 46 && tries < 2000; tries++) {
    const z = -34 + r() * 68;
    const d = 4 + r() * 18;
    const x = shoreX(z) + d;
    if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 3.6)) continue;
    // Clear of the beach camera's path (shot 4).
    if (Math.hypot(x - 18, z - 37) < 6) continue;
    const w = 1.8 + r() * 1.1;
    houses.push({
      x, z, yaw: (r() - 0.5) * 0.3 + (r() < 0.5 ? 0 : Math.PI / 2),
      size: [w, 1.3 + r() * 1.2, w * (0.9 + r() * 0.5)],
      wall: WALLS[Math.floor(r() * WALLS.length)], roof: ROOFS[Math.floor(r() * ROOFS.length)],
      hit: floodTime(x, z, 0.7), spin: (r() - 0.5) * 2.4, collapse: r() < 0.4,
    });
  }
  const boats: Boat[] = [];
  for (let i = 0; i < 7; i++) {
    const z = -26 + i * 8 + r() * 3;
    const x = shoreX(z) - 7 - r() * 10;
    boats.push({ x, z, yaw: r() * Math.PI, hit: Infinity, color: [hex("#e9eef2"), hex("#d84a3a"), hex("#2f6db0")][i % 3] });
  }
  // A boat starts moving once the crest reaches it.
  for (const b of boats) {
    for (let t = 8; t < 30; t += 1 / 15) if (water(b.x, b.z, t)[0] > 1.2) { b.hit = t; break; }
  }
  const plants: Plant[] = [];
  for (let tries = 0; plants.length < 110 && tries < 3000; tries++) {
    const z = -46 + r() * 92;
    const d = 3 + r() * 40;
    const x = shoreX(z) + d;
    if (x > 44) continue;
    if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 2.4)) continue;
    plants.push({ x, z, s: 1.6 + r() * 1.6, color: vary(hex("#3f7f3a"), tries, 0.15), hit: floodTime(x, z, 0.6) });
  }
  townCache = { houses, boats, plants };
  return townCache;
}

// ── Frames ───────────────────────────────────────────────────────────────────────────────────────────

const GRID = makeGrid(-132, -50, 74, 42, 2.4, 3);
let groundCache: ReturnType<typeof sampleGrid> | null = null;

const SAND = hex("#e2cf98"), WETSAND = hex("#b5a274"), GRASS = hex("#5f9e48"), GRASS2 = hex("#4c8a3d"), ROCK = hex("#86817a");
const SEABED = hex("#3a5a5e"), DEEP = hex("#0d4a7a"), SHALLOW = hex("#3fb2c9"), FOAM = hex("#eef8fb"), CREST = hex("#58c7e3"), FLOOD = hex("#6f8476");

export const SHOTS: Shot[] = [
  { from: 0, to: 4, pos: [[-62, 16, 36], [-70, 12, 28]], target: [[-100, 0, 0], [-100, 0, 0]], fov: [55, 52] },
  { from: 4, to: 9, pos: [[-55, 12, 30], [-16, 12, 30]], target: [[-81, 1, 0], [-41, 1, 0]], fov: [58, 58] },
  { from: 9, to: 15, pos: [[40, 28, 12], [34, 22, 8]], target: [[-26, 0, -2], [-20, 0, 0]], fov: [52, 50] },
  { from: 15, to: 19.5, pos: [[16, 9, 36], [20, 11, 38]], target: [[-8, 3, 2], [-2, 4, 0]], fov: [56, 60] },
  { from: 19.5, to: 26, pos: [[34, 18, 30], [44, 30, 42]], target: [[6, 0, 0], [10, 0, 0]], fov: [56, 58] },
  { from: 26, to: 31, pos: [[30, 72, 56], [26, 84, 62]], target: [[0, 0, 0], [0, 0, 0]], fov: [55, 55] },
];

export const env: Env = {
  skyTop: hex("#3c78b0"),
  skyBottom: hex("#cfe2ec"),
  fog: hex("#c3dae5"),
  fogNear: 50,
  fogFar: 260,
  sun: [0.45, 0.75, 0.35].map((v) => v / Math.hypot(0.45, 0.75, 0.35)) as V3,
  sunColor: [255, 240, 222],
  ambient: [112, 128, 146],
};

export function tsunamiFrame(t: number): Frame {
  const tris: Tri[] = [];
  groundCache ??= sampleGrid(GRID, ground);
  const G = groundCache;
  const W = sampleGrid(GRID, (x, z) => water(x, z, t)[0]);
  const crest = new Float32Array(W.H.length), foam = new Float32Array(W.H.length);
  for (let k = 0; k < crest.length; k++) [, crest[k], foam[k]] = water(W.X[k], W.Z[k], t);

  // Ground: skipped where water covers the whole face.
  emitGrid(tris, GRID, G, (a, b, c, cx, cz) => {
    const wet = [a, b, c].filter((k) => W.H[k] > G.H[k] + 0.05).length;
    if (wet === 3) return null;
    const h = (G.H[a] + G.H[b] + G.H[c]) / 3;
    const d = cx - shoreX(cz);
    const slope = Math.max(Math.abs(G.H[a] - G.H[b]), Math.abs(G.H[b] - G.H[c]), Math.abs(G.H[a] - G.H[c]));
    let col = d < 0 ? mixRGB(SEABED, WETSAND, smooth(-14, 0, d)) : d < 3.5 ? SAND : h > 8 || slope > 2.4 ? ROCK : hash2(a, b) > 0.5 ? GRASS : GRASS2;
    // Ground the flood has been over stays darker and muddy.
    if (d >= 0 && t > ARRIVE && cx < front(t) + 2) col = mixRGB(col, hex("#6b5a43"), 0.45);
    return { color: vary(col, a * 7 + b) };
  });

  // Water: only faces standing above the ground somewhere.
  emitGrid(tris, GRID, W, (a, b, c, cx, cz) => {
    const above = [a, b, c].filter((k) => W.H[k] > G.H[k] + 0.05).length;
    if (above === 0) return null;
    const depth = (W.H[a] + W.H[b] + W.H[c] - G.H[a] - G.H[b] - G.H[c]) / 3;
    const overLand = cx - shoreX(cz) > 0;
    let col = mixRGB(SHALLOW, DEEP, smooth(0.5, 6, depth));
    if (overLand) col = mixRGB(FLOOD, col, 0.25);
    // The wave reads as a lighter band even far out, where it is low; foam only where it breaks.
    const amp = amplitude(frontAt(cz, t));
    col = mixRGB(col, CREST, Math.max(crest[a], crest[b], crest[c]) * (0.75 - 0.4 * smooth(2.5, 6, amp)));
    // The steep face of the breaking wave reads darker: a wall of water, not a slope.
    const steep = Math.max(Math.abs(W.H[a] - W.H[b]), Math.abs(W.H[b] - W.H[c]), Math.abs(W.H[a] - W.H[c]));
    col = mixRGB(col, DEEP, smooth(1.2, 3.5, steep) * 0.55);
    const froth = Math.max(foam[a], foam[b], foam[c]);
    if (froth > 0) col = mixRGB(col, FOAM, froth * 0.9);
    return { color: vary(col, a + b * 3, 0.05) };
  });

  const { houses, boats, plants } = town();
  for (const h of houses) {
    const p = Math.max(0, t - h.hit);
    const carry = 9 * (1 - Math.exp(-p / 1.6));
    const x = h.x + carry, z = h.z + carry * 0.15 * h.spin;
    const sink = h.collapse ? smooth(0, 1.4, p) * 0.55 : 0;
    const size: V3 = [h.size[0], h.size[1] * (1 - sink), h.size[2]];
    house(tris, { pos: [x, ground(x, z) - 0.2, z], yaw: h.yaw + h.spin * (1 - Math.exp(-p / 1.5)), roll: p > 0 ? 0.25 * Math.sin(p * 2 + h.spin) * Math.exp(-p / 3) : 0, size }, vary(h.wall, h.x | 0), h.roof);
  }
  for (const pl of plants) {
    const p = Math.max(0, t - pl.hit);
    tree(tris, { pos: [pl.x, ground(pl.x, pl.z) - 0.1, pl.z], size: pl.s, roll: -1.2 * smooth(0, 0.8, p) }, pl.color);
  }
  for (const b of boats) {
    const p = Math.max(0, t - b.hit);
    const x = b.x + Math.min(p * 6.5, 30), z = b.z;
    const [wy] = water(x, z, t);
    const y = Math.max(wy, ground(x, z)) - 0.1;
    const yaw = b.yaw + p * 0.9;
    box(tris, { pos: [x, y, z], yaw, roll: 0.15 * Math.sin(t * 2 + b.x), size: [3.2, 0.7, 1.3] }, { color: b.color });
    box(tris, { pos: [x, y + 0.7, z], yaw, size: [1.2, 0.7, 0.9] }, { color: hex("#f4f4f0") });
  }

  // Debris riding the flood front.
  if (t > ARRIVE - 0.5) {
    const r = rng(7);
    for (let i = 0; i < 140; i++) {
      // Every draw happens before the skip, so each piece keeps its own numbers from frame to frame.
      const [rz, rx, rs, ry, rspin, rp, rc] = [r(), r(), r(), r(), r(), r(), r()];
      const z = -40 + rz * 80;
      const x = frontAt(z, t) - 1 - rx * 12;
      const [wy] = water(x, z, t);
      if (wy < ground(x, z) + 0.2) continue;
      tetra(tris, { pos: [x, wy + 0.1, z], yaw: ry * 6 + t * (rspin - 0.5) * 3, pitch: rp * 3, size: 0.3 + rs * 0.6 }, { color: vary(hex(rc < 0.6 ? "#7a5a3c" : "#c9c2b5"), i, 0.2) });
    }
  }

  let camera = shotCamera(SHOTS, t);
  const quake = t >= QUAKE ? Math.exp(-(t - QUAKE) / 1.6) * 1.1 : 0;
  const impact = t >= ARRIVE ? Math.exp(-(t - ARRIVE) / 1.8) * 0.9 : 0;
  camera = shake(camera, t, quake + (t > 15 && t < 19.5 ? 0.12 + 0.25 * smooth(16, 19.5, t) : 0) + impact);
  return { tris, camera, env };
}

/** Readouts for the HUD. */
export function readouts(t: number) {
  const X = front(t);
  const A = amplitude(X);
  const heightM = t < 2 ? 0 : 0.5 + (A - 1) * 3.5;
  const speed = t < 2 ? 0 : X < 0 ? 40 + 760 * Math.min(1, -X / 100) ** 0.8 : 38 * Math.exp(-(t - ARRIVE) / 4);
  const distKm = Math.max(0, -X * 1.2);
  const etaSim = Math.max(0, (ARRIVE - t) * 60);
  const inundation = Math.max(0, X) * 0.11;
  const hits = town().houses.filter((h) => h.hit <= t).length;
  return { X, A, heightM, speed, distKm, etaSim, inundation, hits, houses: town().houses.length };
}

/** The tide gauge at the beach, the last `span` seconds. */
export function tideGauge(t: number, span = 8, n = 90) {
  const x = shoreX(0) - 1.5;
  return Array.from({ length: n }, (_, i) => {
    const tt = t - span + (i / (n - 1)) * span;
    return tt < 0 ? 0 : water(x, 0, tt)[0];
  });
}

/** Ground shaking at the station: a burst at the quake and aftershocks. */
export function seismo(t: number, span = 5, n = 90) {
  return Array.from({ length: n }, (_, i) => {
    const tt = t - span + (i / (n - 1)) * span;
    const k = Math.floor(tt * 30);
    const amp = 0.06 + (tt > QUAKE ? 1.0 * Math.exp(-(tt - QUAKE) / 1.4) : 0) + (tt > 5.5 ? 0.35 * Math.exp(-(tt - 5.5) / 0.6) : 0);
    return (hash2(k, i, 4) - 0.5) * 2 * amp * (0.6 + 0.4 * Math.sin(tt * 40));
  });
}

export const crestPoint = (t: number): V3 => {
  const X = frontAt(0, t);
  return [X, water(X, 0, t)[0] + 0.5, 0];
};
