// "Seven Plates" drawn in low-poly: the yard on its slab, the house, the long table, the parol, the title in bulbs.
// The story (who, where, when) is story.ts; this turns one segment at one moment into triangles, lights and glows.
// Each segment is a Film scene that melts over the one before, with the same moving camera in both: the years dissolve.
import { showing, type Scene } from "../../src/kit/looks/Film";
import { render, type Env, type Glow, type PointLight, type Tri } from "../../src/kit/lowpoly/engine";
import { ball, cube, facet, hash, limb, mix, norm, person, placer, quad, shadowUnder, tiles, to255, type Col, type Place } from "../../src/kit/lowpoly/diorama";
import { H, TAU, W, smooth, type Painter, type RGB, type V3 } from "../../src/kit/looks/core";
import {
  BULB, FAMILY, FENCE_Z, FLASH, FREEZE, FRONT, GATE_X, HS, HX, HZ, MANGO, NEIGHBOURS, PAROL, ROAD_Z, SECONDS, SEGS, SIGN, SIZE, TABLE_H, TABLE_HALF, TX, TZ, ZOOM,
  bulbOn, cameraAt, carried, cast, filmTime, gateOpen, groundY, mangoScale, parolOn, placeAt, rideAt, seatAt, seg, signFlare, signLit, skyAt, stringLights, swingAngle, tableAt, weathered,
  type Body, type Ride, type SegId,
} from "./story";

const G = groundY;
const c255 = (c: RGB, extra: Partial<Col> = {}): Col => ({ color: to255(c), ...extra });
const P0: Place = (q) => q;
const at = (x: number, z: number, dy = 0): V3 => [x, G(x, z) + dy, z];
const turnPlace = (o: V3, turn: number, s = 1): Place => {
  const c = Math.cos(turn), n = Math.sin(turn);
  return (q) => [o[0] + (q[0] * c - q[2] * n) * s, o[1] + q[1] * s, o[2] + (q[0] * n + q[2] * c) * s];
};

// ── The slab: grass, a tiled patio under the table, stepping stones to the gate, the road ─────────────────────────
const N = 46, STEP = (2 * SIZE) / N, BOTTOM = -0.9;
const GRID: [number, number][][] = Array.from({ length: N + 1 }, (_, i) => Array.from({ length: N + 1 }, (_, j) => {
  const ex = i === 0 || i === N, ez = j === 0 || j === N;
  return [-SIZE + i * STEP + (ex ? 0 : (hash(i, j, 1) - 0.5) * STEP * 0.5), -SIZE + j * STEP + (ez ? 0 : (hash(i, j, 2) - 0.5) * STEP * 0.5)];
}));
const GRASS: [RGB, RGB] = [[0.3, 0.52, 0.24], [0.42, 0.62, 0.3]];
const ROAD: RGB = [0.52, 0.52, 0.5];
const onRoad = (z: number) => Math.abs(z - ROAD_Z) < 0.22;
/** The patio: a rectangle of tiles round the table, out to the house. */
const PATIO = { x0: TX - 0.48, x1: TX + 0.48, z0: FRONT, z1: TZ + 0.6 };
const onPatio = (x: number, z: number) => x > PATIO.x0 && x < PATIO.x1 && z > PATIO.z0 && z < PATIO.z1;
/** Stepping stones from the door to the gate. */
const STONES: [number, number][] = Array.from({ length: 9 }, (_, i) => {
  const u = i / 8;
  return [-0.36 + (GATE_X + 0.36) * u + 0.04 * Math.sin(i * 2.1), FRONT + 0.16 + (FENCE_Z - 0.12 - FRONT - 0.16) * u];
});
const nearStone = (x: number, z: number) => STONES.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 0.09);
const TUFTS = Array.from({ length: 900 }, (_, i) => ({ x: (hash(i, 7) * 2 - 1) * (SIZE - 0.06), z: (hash(i, 8) * 2 - 1) * (SIZE - 0.06), h: 0.04 + 0.03 * hash(i, 9), turn: hash(i, 10) * TAU, flower: hash(i, 11) < 0.16, hue: Math.floor(hash(i, 12) * 3) }))
  .filter((f) => !onPatio(f.x, f.z) && !onRoad(f.z) && !nearStone(f.x, f.z) && Math.abs(f.z - FENCE_Z) > 0.04 && !(f.z < FRONT + 0.02 && f.z > HZ - 0.55 && Math.abs(f.x - HX) < 0.68));
const FLOWERS: RGB[] = [[0.95, 0.3, 0.4], [0.98, 0.85, 0.3], [0.97, 0.95, 0.92]];

function slab(out: Tri[]) {
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const v = (a: number, b: number): V3 => {
      const [x, z] = GRID[a][b];
      return [x, G(x, z), z];
    };
    const p00 = v(i, j), p10 = v(i + 1, j), p11 = v(i + 1, j + 1), p01 = v(i, j + 1);
    const tris: [V3, V3, V3][] = (i + j) % 2 === 0 ? [[p00, p10, p11], [p00, p11, p01]] : [[p00, p10, p01], [p10, p11, p01]];
    tris.forEach(([a, b, c], n) => {
      const cz = (a[2] + b[2] + c[2]) / 3, s = i * 997 + j * 31 + n;
      let col = mix(GRASS[0], GRASS[1], 0.2 + 0.6 * hash(s, 3));
      if (onRoad(cz)) col = mix(ROAD, [ROAD[0] * 0.92, ROAD[1] * 0.92, ROAD[2] * 0.92], hash(s, 5));
      // The patio: the ground's own facets, laid as flagstones.
      if (onPatio((a[0] + b[0] + c[0]) / 3, cz)) col = mix([0.86, 0.78, 0.66], [0.74, 0.64, 0.52], hash(s, 6));
      out.push({ a, b, c, color: to255(col), zBias: 0.02 });
    });
  }
  for (const [x, z] of STONES) ball(out, P0, at(x, z, 0.004), [0.07, 0.008, 0.055], { color: to255(mix([0.7, 0.68, 0.64], [0.6, 0.58, 0.55], hash(x * 9))), zBias: 0.012 }, 1, 0.1, Math.round(x * 30));
  const side = (pts: [number, number][]) => {
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, z0] = pts[s], [x1, z1] = pts[s + 1], y0 = G(x0, z0), y1 = G(x1, z1);
      const bands: [number, RGB][] = [[0.05, [0.26, 0.4, 0.18]], [0.35, [0.5, 0.33, 0.22]], [0.75, [0.37, 0.24, 0.18]], [2, [0.22, 0.15, 0.15]]];
      let ya = 0;
      for (const [to, col] of bands) {
        quad(out, [x0, y0 - ya, z0], [x1, y1 - ya, z1], [x1, Math.max(BOTTOM, y1 - to), z1], [x0, Math.max(BOTTOM, y0 - to), z0], facet(c255(col), s, 0.08));
        ya = to;
      }
    }
  };
  const edge = (f: (u: number) => [number, number]) => Array.from({ length: N + 1 }, (_, i) => f(-SIZE + i * STEP));
  side(edge((u) => [u, SIZE]));
  side(edge((u) => [u, -SIZE]));
  side(edge((u) => [SIZE, u]));
  side(edge((u) => [-SIZE, u]));
  for (const f of TUFTS) {
    const y = G(f.x, f.z);
    for (let b = 0; b < 3; b++) {
      const a = f.turn + (b * TAU) / 3, w: V3 = [-Math.sin(a) * 0.007, 0, Math.cos(a) * 0.007];
      const base: V3 = [f.x + Math.cos(a) * 0.006, y, f.z + Math.sin(a) * 0.006], tip: V3 = [f.x + Math.cos(a) * 0.016, y + f.h, f.z + Math.sin(a) * 0.016];
      out.push({ a: [base[0] - w[0], base[1], base[2] - w[2]], b: [base[0] + w[0], base[1], base[2] + w[2]], c: tip, color: [100, 155, 78] });
    }
    if (f.flower) ball(out, P0, [f.x, y + f.h * 1.15, f.z], [0.01, 0.01, 0.01], c255(FLOWERS[f.hue]), 0);
  }
}

// ── Buildings and plants ───────────────────────────────────────────────────────────────────────────────────────
/** A concrete bungalow facing +z, ridge along x, corrugated roof. Local units ×scale; window glow 0…1. */
function bungalow(out: Tri[], P: Place, wall: RGB, roof: RGB, win: number, grill = true) {
  const on = (c: Col): Col => ({ ...c, zBias: -0.03 });
  const W2 = 0.4, D2 = 0.32, WH = 0.5;
  cube(out, P, [0, WH / 2, 0], [W2, WH / 2, D2], c255(wall));
  cube(out, P, [0, 0.02, 0], [W2 + 0.02, 0.025, D2 + 0.02], c255([0.62, 0.6, 0.58]));
  cube(out, P, [0, WH - 0.015, D2 + 0.004], [W2, 0.015, 0.006], on(c255([0.95, 0.94, 0.9])));
  for (const x of [-W2, W2]) out.push({ a: P([x, WH, -D2]), b: P([x, WH, D2]), c: P([x, WH + 0.24, 0]), ...c255(wall) });
  const rf = c255(roof), rib = c255([roof[0] * 0.78, roof[1] * 0.78, roof[2] * 0.78]);
  for (const s of [-1, 1]) {
    tiles(out, P([-W2 - 0.06, WH + 0.26, 0]), P([W2 + 0.06, WH + 0.26, 0]), P([W2 + 0.06, WH - 0.04, s * (D2 + 0.1)]), P([-W2 - 0.06, WH - 0.04, s * (D2 + 0.1)]), facet(rf, s > 0 ? 1 : 2), 0.12);
    for (let i = 0; i <= 12; i++) {
      const x = -W2 - 0.06 + (i / 12) * (2 * W2 + 0.12);
      quad(out, P([x - 0.006, WH + 0.262, 0]), P([x + 0.006, WH + 0.262, 0]), P([x + 0.006, WH - 0.038, s * (D2 + 0.1)]), P([x - 0.006, WH - 0.038, s * (D2 + 0.1)]), { ...rib, zBias: -0.01 });
    }
  }
  cube(out, P, [-0.16, 0.19, D2 + 0.005], [0.075, 0.18, 0.01], on(c255([0.5, 0.3, 0.18])));
  ball(out, P, [-0.11, 0.19, D2 + 0.02], [0.01, 0.01, 0.01], on(c255([0.85, 0.75, 0.4])), 0);
  // The window: warm inside at night, but never a white glare.
  const lit = mix([0.3, 0.36, 0.44], [0.92, 0.66, 0.38], win);
  cube(out, P, [0.17, 0.27, D2 + 0.005], [0.11, 0.09, 0.01], on({ color: to255(lit), glow: 0.55 * win }));
  if (grill) for (let i = -2; i <= 2; i++) cube(out, P, [0.17 + i * 0.045, 0.27, D2 + 0.018], [0.005, 0.09, 0.005], on(c255([0.15, 0.15, 0.17])));
  cube(out, P, [0.17, 0.175, D2 + 0.02], [0.125, 0.008, 0.02], on(c255([0.9, 0.9, 0.86])));
  cube(out, P, [-0.16, 0.015, D2 + 0.06], [0.1, 0.018, 0.05], c255([0.66, 0.64, 0.6]));
  for (const x of [-0.32, 0.34]) {
    limb(out, P, [x, 0, D2 + 0.07], [x, 0.06, D2 + 0.07], 0.035, 0.03, c255([0.75, 0.38, 0.22]), 6);
    ball(out, P, [x, 0.1, D2 + 0.07], [0.055, 0.05, 0.05], c255([0.2, 0.5, 0.24]), 1, 0.2, Math.round(x * 100));
  }
}
const HOUSE_EAVE_Y = 0.46, HOUSE_EAVE_Z = 0.42;

function mangoTree(out: Tri[], id: SegId, t: number) {
  const s = mangoScale(seg(id).year), base = at(MANGO[0], MANGO[1], -0.02), P = turnPlace(base, 0.3, s);
  const bark = c255([0.38, 0.27, 0.18]), leaf = c255([0.17, 0.4, 0.19]), leaf2 = c255([0.23, 0.48, 0.22]);
  limb(out, P, [0, -0.05, 0], [0.03, 0.62, 0], 0.08, 0.055, bark, 7);
  limb(out, P, [0, 0.45, 0], [-0.32, 0.74, 0.12], 0.045, 0.03, bark);
  limb(out, P, [0, 0.5, 0], [0.28, 0.8, -0.1], 0.045, 0.03, bark);
  ([[[0, 0.92, 0], [0.55, 0.36, 0.5]], [[-0.36, 0.8, 0.12], [0.34, 0.27, 0.32]], [[0.34, 0.84, -0.1], [0.34, 0.27, 0.32]], [[0.05, 1.12, -0.05], [0.38, 0.25, 0.34]]] as [V3, V3][])
    .forEach(([c, r], i) => ball(out, P, c, r, i % 2 ? leaf2 : leaf, 1, 0.14, 60 + i * 7));
  const a = swingAngle(id, t), rope = c255([0.78, 0.68, 0.5]);
  const S = (q: V3): V3 => [-0.28 + q[0], 0.72 + q[1] * Math.cos(a) - q[2] * Math.sin(a), 0.12 + q[1] * Math.sin(a) + q[2] * Math.cos(a)];
  for (const x of [-0.07, 0.07]) limb(out, P, S([x, 0, 0]), S([x, -0.56, 0]), 0.005, 0.005, rope, 3);
  cube(out, (q) => P(S(q)), [0, -0.57, 0], [0.09, 0.008, 0.035], c255([0.55, 0.36, 0.2]));
}

function banana(out: Tri[], x: number, z: number, s: number, seed: number) {
  const P = turnPlace(at(x, z), seed, s), green = c255([0.32, 0.58, 0.24]), dark = c255([0.22, 0.45, 0.2]);
  limb(out, P, [0, 0, 0], [0.01, 0.42, 0], 0.035, 0.025, c255([0.45, 0.52, 0.26]), 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + seed, dx = Math.cos(a), dz = Math.sin(a);
    const root: V3 = [0, 0.4, 0], mid: V3 = [dx * 0.2, 0.55, dz * 0.2], tip: V3 = [dx * 0.34, 0.42, dz * 0.34], w: V3 = [-dz * 0.06, 0, dx * 0.06];
    const col = i % 2 ? green : dark, m1: V3 = [mid[0] + w[0], mid[1], mid[2] + w[2]], m2: V3 = [mid[0] - w[0], mid[1], mid[2] - w[2]];
    out.push({ a: P(root), b: P(m1), c: P(m2), ...col }, { a: P(m1), b: P(tip), c: P(m2), ...col });
  }
}

function palm(out: Tri[], x: number, z: number, s: number) {
  const P = turnPlace(at(x, z), 0.8, s), trunk = c255([0.52, 0.42, 0.32]), frond = c255([0.27, 0.54, 0.24]);
  const pts: V3[] = [[0, 0, 0], [0.05, 0.4, 0], [0.14, 0.8, 0], [0.26, 1.15, 0]];
  for (let i = 1; i < pts.length; i++) limb(out, P, pts[i - 1], pts[i], 0.045 - i * 0.006, 0.04 - i * 0.006, trunk, 6);
  const top = pts[3];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, dx = Math.cos(a), dz = Math.sin(a), w: V3 = [-dz * 0.05, 0, dx * 0.05];
    const mid: V3 = [top[0] + dx * 0.25, top[1] + 0.08, top[2] + dz * 0.25], tip: V3 = [top[0] + dx * 0.48, top[1] - 0.12, top[2] + dz * 0.48];
    out.push({ a: P(top), b: P([mid[0] + w[0], mid[1], mid[2] + w[2]]), c: P([mid[0] - w[0], mid[1], mid[2] - w[2]]), ...facet(frond, i) });
    out.push({ a: P([mid[0] + w[0], mid[1], mid[2] + w[2]]), b: P(tip), c: P([mid[0] - w[0], mid[1], mid[2] - w[2]]), ...facet(frond, i + 3) });
  }
  for (let i = 0; i < 3; i++) ball(out, P, [top[0] + 0.05 * Math.cos(i * 2.1), top[1] - 0.05, 0.05 * Math.sin(i * 2.1)], [0.035, 0.04, 0.035], c255([0.45, 0.48, 0.2]), 0);
}

/** Bougainvillea: a lumpy bush covered in magenta. */
function bougainvillea(out: Tri[], x: number, z: number, s: number, seed: number) {
  const P = turnPlace(at(x, z), seed, s);
  ball(out, P, [0, 0.11, 0], [0.16, 0.12, 0.13], c255([0.2, 0.42, 0.2]), 1, 0.25, seed);
  for (let i = 0; i < 9; i++) {
    const a = hash(i, seed) * TAU, e = 0.2 + 0.7 * hash(i, seed + 1);
    ball(out, P, [Math.cos(a) * 0.14 * Math.cos(e), 0.11 + 0.11 * Math.sin(e), Math.sin(a) * 0.12 * Math.cos(e)], [0.045, 0.04, 0.045], c255(i % 3 ? [0.9, 0.2, 0.55] : [0.98, 0.42, 0.7]), 0);
  }
}

/** Bamboo fence along the front, the gate hinged at its left post, swinging into the yard. */
function fence(out: Tri[], id: SegId, t: number) {
  const bam = c255([0.75, 0.64, 0.4]), dark = c255([0.58, 0.48, 0.28]);
  const gap0 = GATE_X - 0.15, gap1 = GATE_X + 0.15;
  for (let x = -SIZE + 0.05; x < SIZE - 0.02; x += 0.07) {
    if (x > gap0 && x < gap1) continue;
    limb(out, P0, at(x, FENCE_Z, -0.02), at(x, FENCE_Z, 0.15 + 0.012 * Math.sin(x * 40)), 0.011, 0.01, hash(x * 10) > 0.5 ? bam : dark, 5);
  }
  for (const y of [0.05, 0.11]) for (const [a, b] of [[-SIZE + 0.03, gap0], [gap1, SIZE - 0.03]]) {
    for (let x = a; x < b - 0.01; x += 0.3) limb(out, P0, at(x, FENCE_Z + 0.015, y), at(Math.min(b, x + 0.3), FENCE_Z + 0.015, y), 0.007, 0.007, bam, 4);
  }
  for (const x of [gap0, gap1]) limb(out, P0, at(x, FENCE_Z, -0.02), at(x, FENCE_Z, 0.2), 0.018, 0.016, dark, 6);
  const o = gateOpen(id, t), hinge = at(gap0 + 0.02, FENCE_Z), co = Math.cos(o), so = Math.sin(o);
  const Gp: Place = (q) => [hinge[0] + q[0] * co, hinge[1] + q[1], hinge[2] - q[0] * so + q[2]];
  for (let i = 0; i < 4; i++) limb(out, Gp, [0.03 + i * 0.075, 0.01, 0], [0.03 + i * 0.075, 0.16, 0], 0.01, 0.009, bam, 5);
  for (const y of [0.04, 0.12]) limb(out, Gp, [0.01, y, 0.01], [0.27, y, 0.01], 0.007, 0.007, dark, 4);
}

// ── The table ──────────────────────────────────────────────────────────────────────────────────────────────────
function chair(out: Tri[], i: number, fade: number) {
  const s = seatAt(i), P = turnPlace(at(s.x, s.z, 0.006), s.turn), white = c255(mix([0.95, 0.95, 0.92], [0.86, 0.84, 0.76], fade));
  cube(out, P, [0, 0.125, 0], [0.055, 0.007, 0.055], white);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) limb(out, P, [x * 0.048, 0.12, z * 0.048], [x * 0.058, 0, z * 0.058], 0.008, 0.007, white, 4);
  cube(out, P, [-0.055, 0.21, 0], [0.006, 0.08, 0.055], white);
  cube(out, P, [-0.052, 0.27, 0], [0.008, 0.012, 0.058], white);
}
function plate(out: Tri[], x: number, z: number, food: RGB | null) {
  const y = G(TX, TZ) + TABLE_H + 0.011;
  ball(out, P0, [x, y, z], [0.036, 0.004, 0.036], { color: [242, 242, 238], zBias: -0.01 }, 1);
  if (food) ball(out, P0, [x, y + 0.004, z], [0.02, 0.005, 0.02], { color: to255(food), zBias: -0.02 }, 0);
}
function lechon(out: Tri[], P: Place) {
  const skin = c255([0.76, 0.38, 0.14]), leaf = c255([0.24, 0.52, 0.2]);
  ball(out, P, [0, 0.002, 0], [0.075, 0.004, 0.14], { ...leaf, zBias: -0.01 }, 1);
  ball(out, P, [0, 0.035, 0.0], [0.05, 0.035, 0.1], skin, 1);
  ball(out, P, [0, 0.04, 0.1], [0.032, 0.03, 0.035], skin, 1);
  ball(out, P, [0, 0.035, 0.137], [0.014, 0.014, 0.014], c255([0.88, 0.12, 0.12]), 0);
  for (const x of [-1, 1]) ball(out, P, [x * 0.018, 0.068, 0.095], [0.008, 0.012, 0.01], skin, 0);
}
function boxShape(out: Tri[], P: Place) {
  const card = c255([0.74, 0.55, 0.34]), tape = c255([0.56, 0.42, 0.27]), print = c255([0.18, 0.36, 0.66]);
  cube(out, P, [0, 0, 0], [0.075, 0.068, 0.07], card);
  cube(out, P, [0, 0.069, 0], [0.077, 0.002, 0.014], { ...tape, zBias: -0.01 });
  for (const s of [-1, 1]) cube(out, P, [0, 0, s * 0.071], [0.06, 0.016, 0.002], { ...print, zBias: -0.01 });
  cube(out, P, [0.076, 0, 0], [0.002, 0.016, 0.055], { ...print, zBias: -0.01 });
}
const balikbayan = (out: Tri[], i: number) => {
  const s = seatAt(i);
  boxShape(out, turnPlace(at(s.x, s.z, 0.2), s.turn + 0.15 * Math.sin(i * 3.1)));
};
function table(out: Tri[], id: SegId, t: number) {
  const tb = tableAt(id, t), year = seg(id).year, fade = weathered(year), y = G(TX, TZ) + TABLE_H;
  for (let i = 0; i < 7; i++) chair(out, i, fade);
  const [hx, hz] = TABLE_HALF, cloth = c255(mix([0.84, 0.14, 0.17], [0.72, 0.17, 0.22], fade)), hem = c255([0.98, 0.86, 0.48]);
  cube(out, P0, [TX, y - 0.004, TZ], [hx, 0.006, hz], cloth);
  for (const [a, b] of [[[-1, 1], [1, 1]], [[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]]] as [number[], number[]][]) {
    const p = (c: number[], dy: number): V3 => [TX + c[0] * (hx + 0.004), y + dy, TZ + c[1] * (hz + 0.004)];
    quad(out, p(a, 0), p(b, 0), p(b, -0.07), p(a, -0.07), cloth);
    quad(out, p(a, -0.065), p(b, -0.065), p(b, -0.075), p(a, -0.075), { ...hem, zBias: -0.005 });
  }
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) limb(out, P0, [TX + x * (hx - 0.02), y - 0.07, TZ + z * (hz - 0.02)], [TX + x * (hx - 0.02), G(TX, TZ), TZ + z * (hz - 0.02)], 0.01, 0.01, c255([0.4, 0.27, 0.17]), 4);
  if (!tb) return;
  const FOODS: RGB[] = [[0.97, 0.96, 0.9], [0.92, 0.52, 0.2], [0.85, 0.64, 0.3]];
  tb.plates.forEach((on, i) => {
    if (!on) return;
    const [px, pz] = placeAt(FAMILY[i].seat);
    plate(out, px, pz, year === 2026 ? null : FOODS[i % 3]);
  });
  tb.boxes.forEach((on, i) => on && balikbayan(out, FAMILY[i].seat));
  const d = tb.dishes;
  if (d.lechon) lechon(out, turnPlace([TX, y + 0.006, TZ + 0.02], 0));
  if (d.queso) {
    ball(out, P0, [TX + 0.05, y + 0.03, TZ + 0.22], [0.03, 0.028, 0.03], c255([0.9, 0.12, 0.14]), 1);
    ball(out, P0, [TX + 0.05, y + 0.006, TZ + 0.22], [0.04, 0.004, 0.04], c255([0.94, 0.94, 0.9]), 1);
  }
  if (d.pancit) {
    ball(out, P0, [TX - 0.06, y + 0.006, TZ - 0.2], [0.05, 0.004, 0.05], c255([0.94, 0.94, 0.9]), 1);
    ball(out, P0, [TX - 0.06, y + 0.016, TZ - 0.2], [0.036, 0.014, 0.036], c255([0.94, 0.64, 0.26]), 1, 0.2, 3);
  }
  if (d.rice) {
    limb(out, P0, [TX + 0.06, y, TZ - 0.17], [TX + 0.06, y + 0.026, TZ - 0.17], 0.026, 0.034, c255([0.86, 0.83, 0.76]), 7);
    ball(out, P0, [TX + 0.06, y + 0.03, TZ - 0.17], [0.03, 0.015, 0.03], c255([0.98, 0.98, 0.95]), 1);
  }
}

// ── The parol, the sign, the lights ────────────────────────────────────────────────────────────────────────────
function parol(out: Tri[], c: V3, s: number, on: number, hue: [RGB, RGB]) {
  const P: Place = (q) => [c[0] + q[0] * s, c[1] + q[1] * s, c[2] + q[2] * s];
  const lit = (base: RGB, glowCol: RGB): Col => ({ color: to255(mix(base, glowCol, on)), glow: on });
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.042 : 0.1;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
  for (const z of [0.012, -0.012]) for (let i = 0; i < 10; i++) {
    const a = pts[i], b = pts[(i + 1) % 10], col = i % 2 ? lit(hue[0], [1, 0.62, 0.4]) : lit(hue[1], [1, 0.88, 0.5]);
    out.push({ a: P([0, 0, z * 1.6]), b: P([a[0], a[1], z]), c: P([b[0], b[1], z]), ...col });
  }
  ball(out, P, [0, 0, 0.018], [0.025, 0.025, 0.006], lit([0.95, 0.9, 0.7], [1, 0.97, 0.8]), 1);
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * TAU, a1 = ((i + 1) / 16) * TAU;
    limb(out, P, [Math.cos(a0) * 0.108, Math.sin(a0) * 0.108, 0], [Math.cos(a1) * 0.108, Math.sin(a1) * 0.108, 0], 0.004, 0.004, lit([0.9, 0.75, 0.3], [1, 0.82, 0.45]), 3);
  }
  for (const x of [-0.035, 0.035]) {
    const top: V3 = [x * 1.4, -0.09, 0];
    quad(out, P([top[0] - 0.008, top[1], 0.004]), P([top[0] + 0.008, top[1], 0.004]), P([top[0] * 1.3 + 0.006, top[1] - 0.17, 0.004]), P([top[0] * 1.3 - 0.006, top[1] - 0.17, 0.004]), lit(hue[1], [1, 0.82, 0.5]));
  }
}

const FONT: Record<string, string[]> = {
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
  N: ["10001", "11001", "10101", "10101", "10011", "10001", "10001"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
};
const SPACING = 0.027;
const SIGN_BULBS: { p: V3; letter: number }[] = (() => {
  const out: { p: V3; letter: number }[] = [];
  let letter = 0;
  ["SEVEN", "PLATES"].forEach((word, line) => {
    const cols = word.length * 6 - 1, x0 = SIGN[0] - ((cols - 1) * SPACING) / 2, y0 = SIGN[1] + (line === 0 ? 1 : -1) * 4.5 * SPACING;
    [...word].forEach((ch, ci) => {
      FONT[ch].forEach((row, ri) => [...row].forEach((on, xi) => {
        if (on === "1") out.push({ p: [x0 + (ci * 6 + xi) * SPACING, y0 + (3 - ri) * SPACING, SIGN[2]], letter });
      }));
      letter++;
    });
  });
  return out;
})();
const SIGN_HALF = (6 * 6 - 1) * SPACING * 0.5 + 0.06;

function sign(out: Tri[], glows: Glow[], id: SegId, t: number) {
  const lit = signLit(id, t);
  if (lit < 0) return;
  const flare = id === "hook" ? signFlare(t) : 0, pole = c255([0.68, 0.58, 0.36]);
  for (const s of [-1, 1]) limb(out, P0, at(SIGN[0] + s * SIGN_HALF, SIGN[2], -0.02), [SIGN[0] + s * SIGN_HALF, SIGN[1] + 0.26, SIGN[2]], 0.014, 0.011, pole, 6);
  for (const dy of [0.2, -0.2]) limb(out, P0, [SIGN[0] - SIGN_HALF, SIGN[1] + dy, SIGN[2] - 0.004], [SIGN[0] + SIGN_HALF, SIGN[1] + dy, SIGN[2] - 0.004], 0.002, 0.002, c255([0.1, 0.1, 0.1]), 3);
  for (const b of SIGN_BULBS) {
    if (lit - b.letter < 0.5) ball(out, P0, b.p, [0.006, 0.006, 0.006], c255([0.35, 0.3, 0.25]), 0);
    else {
      const f = 0.85 + 0.15 * Math.sin(t * 9 + b.p[0] * 50);
      glows.push({ p: b.p, radius: 0.026 * (1 + 1.6 * flare), color: [255, 196, 110], alpha: Math.min(1, 0.45 * f + 0.4 * flare) }, { p: b.p, radius: 0.009, color: [255, 246, 215], alpha: 0.95 });
    }
  }
  if (flare > 0.01) glows.push({ p: SIGN, radius: 0.9 * flare, color: [255, 210, 150], alpha: 0.7 * flare });
}

const BULB_COLS: RGB[] = [[255, 70, 60], [80, 220, 110], [255, 205, 60], [90, 150, 255], [255, 120, 200]];
/** A sagging string of coloured bulbs from a to b. */
function strand(glows: Glow[], a: V3, b: V3, n: number, sag: number, t: number, on: number, seed: number) {
  for (let i = 0; i <= n; i++) {
    const u = i / n, p: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u];
    const tw = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.9 + seed);
    glows.push({ p, radius: 0.034, color: BULB_COLS[(i + seed) % 5], alpha: 0.5 * on * tw }, { p, radius: 0.008, color: [255, 250, 235], alpha: 0.9 * on });
  }
}
function stringGlows(glows: Glow[], t: number, on: number) {
  if (on <= 0.02) return;
  const P = turnPlace(at(HX, HZ, -0.02), 0, HS);
  // Along the eave, and over the patio from the eave to the mango and to two bamboo poles at the front.
  for (let k = 0; k < 4; k++) strand(glows, P([-0.46 + k * 0.23, HOUSE_EAVE_Y - 0.02, HOUSE_EAVE_Z + 0.04]), P([-0.23 + k * 0.23, HOUSE_EAVE_Y - 0.02, HOUSE_EAVE_Z + 0.04]), 6, 0.025, t, on, k);
  const eave = (x: number) => P([x, HOUSE_EAVE_Y - 0.03, HOUSE_EAVE_Z + 0.05]);
  strand(glows, eave(0.15), [MANGO[0] - 0.35, G(MANGO[0], MANGO[1]) + 0.78, MANGO[1] + 0.2], 14, 0.12, t, on, 7);
  strand(glows, eave(0.3), [TX + 0.5, G(TX, TZ) + 0.7, TZ + 0.62], 13, 0.1, t, on, 11);
  strand(glows, eave(0.0), [TX - 0.5, G(TX, TZ) + 0.7, TZ + 0.62], 13, 0.1, t, on, 3);
  for (let i = 0; i < 30; i++) {
    const x = -SIZE + 0.15 + i * 0.137;
    if (Math.abs(x - GATE_X) < 0.18) continue;
    const p = at(x, FENCE_Z, 0.17), tw = 0.55 + 0.45 * Math.sin(t * 2.6 + i * 2.3);
    glows.push({ p, radius: 0.03, color: BULB_COLS[(i + 2) % 5], alpha: 0.45 * on * tw }, { p, radius: 0.007, color: [255, 250, 235], alpha: 0.85 * on });
  }
}
function lightPoles(out: Tri[]) {
  for (const x of [TX - 0.5, TX + 0.5]) limb(out, P0, at(x, TZ + 0.62, -0.02), at(x, TZ + 0.62, 0.74), 0.01, 0.009, c255([0.68, 0.58, 0.36]), 5);
}

// ── Rides ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** A jeepney facing −x: long body in bright paint, an open back, a roof rack. */
function jeepney(out: Tri[], r: Ride) {
  const P = turnPlace(at(r.x, r.z), Math.PI, 1);
  const body = c255([0.92, 0.9, 0.86]), red = c255([0.85, 0.15, 0.18]), blue = c255([0.15, 0.35, 0.75]), chrome = c255([0.8, 0.82, 0.85]), dark = c255([0.12, 0.12, 0.14]);
  cube(out, P, [0, 0.16, 0], [0.42, 0.1, 0.12], body);
  cube(out, P, [0.02, 0.29, 0], [0.38, 0.012, 0.13], red);
  cube(out, P, [0.02, 0.2, 0.121], [0.38, 0.015, 0.002], { ...blue, zBias: -0.01 });
  cube(out, P, [0.02, 0.2, -0.121], [0.38, 0.015, 0.002], { ...blue, zBias: -0.01 });
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) cube(out, P, [-0.28 + i * 0.13, 0.235, s * 0.121], [0.05, 0.035, 0.002], { ...dark, zBias: -0.012 });
  cube(out, P, [0.5, 0.12, 0], [0.09, 0.06, 0.1], body);
  cube(out, P, [0.59, 0.12, 0], [0.004, 0.05, 0.08], { ...chrome, zBias: -0.01 });
  for (const s of [-1, 1]) ball(out, P, [0.592, 0.13, s * 0.065], [0.006, 0.016, 0.016], { color: [255, 245, 210], glow: 0.8 }, 0);
  cube(out, P, [0.44, 0.215, 0], [0.04, 0.05, 0.1], { ...dark, zBias: -0.005 });
  for (const [x, z] of [[-0.28, 1], [-0.28, -1], [0.42, 1], [0.42, -1]]) limb(out, P, [x, 0.05, z * 0.13], [x, 0.05, z * 0.1], 0.05, 0.05, dark, 8);
  limb(out, P, [0.3, 0.3, 0.06], [0.3, 0.36, 0.06], 0.006, 0.006, chrome, 4);
  ball(out, P, [0.3, 0.37, 0.06], [0.03, 0.02, 0.01], chrome, 0);
}
/** A tricycle facing −x: a motorbike with a roofed sidecar on its right. */
function tricycle(out: Tri[], glows: Glow[], lights: PointLight[], r: Ride) {
  const P = turnPlace(at(r.x, r.z), r.right ? 0 : Math.PI, 1);
  const paint = c255([0.15, 0.55, 0.45]), dark = c255([0.12, 0.12, 0.14]), roof = c255([0.85, 0.82, 0.2]);
  cube(out, P, [0, 0.13, 0.13], [0.16, 0.08, 0.09], paint);
  cube(out, P, [0, 0.29, 0.1], [0.19, 0.01, 0.13], roof);
  for (const x of [-0.13, 0.13]) limb(out, P, [x, 0.21, 0.2], [x, 0.29, 0.2], 0.006, 0.006, dark, 4);
  cube(out, P, [0.05, 0.12, -0.02], [0.14, 0.03, 0.02], paint);
  limb(out, P, [0.2, 0.12, -0.02], [0.22, 0.26, -0.02], 0.008, 0.008, dark, 4);
  for (const [x, z] of [[-0.1, -0.02], [0.2, -0.02], [-0.05, 0.2]]) limb(out, P, [x, 0.045, z - 0.012], [x, 0.045, z + 0.012], 0.045, 0.045, dark, 8);
  const head = P([0.23, 0.22, -0.02]);
  ball(out, P0, head, [0.012, 0.012, 0.012], { color: [255, 248, 220], glow: 1 }, 0);
  if (r.lit) {
    glows.push({ p: head, radius: 0.2, color: [255, 236, 200], alpha: 0.5 }, { p: head, radius: 0.045, color: [255, 255, 245], alpha: 0.95 });
    lights.push({ p: [head[0] - 0.2, head[1], head[2]], color: [255, 238, 205], intensity: 0.7, range: 0.7 });
  }
}

// ── People ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SKIN: RGB = [0.8, 0.58, 0.42], INK: RGB = [0.07, 0.05, 0.06], CHEEK: RGB = [0.92, 0.45, 0.42], SHOE: RGB = [0.18, 0.14, 0.12];
function peg(out: Tri[], b: Body, coat: RGB, hair: RGB, legs: RGB, long: boolean, fade: number) {
  const grey = smooth(0.66, 0.9, b.k[1]);
  const mats: Col[] = [c255(mix(coat, mix(coat, [0.62, 0.6, 0.58], 0.3), fade)), c255(SKIN), c255(mix(hair, [0.88, 0.87, 0.85], grey)), c255(legs), c255(INK), c255(CHEEK), c255(SHOE)];
  person(long)(out, placer(b), b.k, mats);
}
function suitcase(out: Tri[], b: Body) {
  const P = placer(b);
  cube(out, P, [0.02, 0.075, 0.125], [0.05, 0.065, 0.02], c255([0.3, 0.22, 0.36]));
  cube(out, P, [0.02, 0.145, 0.125], [0.018, 0.006, 0.006], c255([0.1, 0.1, 0.1]));
}

// ── One segment's frame ────────────────────────────────────────────────────────────────────────────────────────
export function frameAt(id: SegId, t: number, o: { noSlab?: boolean } = {}) {
  const cam = cameraAt(t), camera = { pos: cam.pos, target: cam.target, fov: (2 * Math.atan(H / (2 * ZOOM * W)) * 180) / Math.PI };
  const { sky, dark } = skyAt(id, t), year = seg(id).year, fade = weathered(year);
  const env: Env = {
    skyTop: to255(sky.top), skyBottom: to255(sky.bottom), fog: to255(sky.bottom), fogNear: 60, fogFar: 120,
    sun: norm(sky.keyFrom), sunColor: sky.key.map((c) => Math.min(255, c * 120)) as RGB, ambient: sky.fill.map((c) => Math.min(255, c * 300)) as RGB,
  };
  const tris: Tri[] = [], glows: Glow[] = [], lights: PointLight[] = [];
  if (!o.noSlab) slab(tris);
  const winOn = smooth(0.45, 0.8, dark);
  bungalow(tris, turnPlace(at(HX, HZ, -0.02), 0, HS), mix([0.62, 0.86, 0.76], [0.7, 0.77, 0.7], fade), mix([0.72, 0.24, 0.2], [0.55, 0.3, 0.24], fade), winOn);
  for (const [x, z, s] of NEIGHBOURS) {
    bungalow(tris, turnPlace(at(x, z, -0.02), 0, s), x > 0 ? [0.95, 0.86, 0.6] : [0.76, 0.8, 0.94], x > 0 ? [0.3, 0.44, 0.64] : [0.52, 0.52, 0.52], winOn, false);
    if (dark > 0.6) {
      const p: V3 = [x + 0.17 * s, G(x, z) + 0.34 * s, z + 0.32 * s + 0.06];
      parol(tris, p, 0.6, 1, x > 0 ? [[0.2, 0.5, 0.9], [0.95, 0.95, 0.9]] : [[0.9, 0.3, 0.6], [0.98, 0.85, 0.3]]);
      glows.push({ p, radius: 0.12, color: x > 0 ? [140, 190, 255] : [255, 150, 200], alpha: 0.32 });
    }
  }
  mangoTree(tris, id, t);
  banana(tris, -1.32, -0.25, 0.9, 0.3);
  banana(tris, -1.5, 0.1, 0.75, 1.9);
  banana(tris, 1.62, 0.75, 0.8, 2.6);
  palm(tris, 1.72, -0.75, 1.0);
  palm(tris, -1.75, -0.9, 0.85);
  for (const [x, z, s, seed] of [[-1.25, 0.95, 1, 1], [-0.25, 0.98, 0.9, 2], [1.05, 0.95, 1.1, 3], [1.7, 0.4, 0.9, 4], [-0.82, -0.36, 0.8, 5], [0.62, -0.38, 0.75, 6]] as [number, number, number, number][]) bougainvillea(tris, x, z, s, seed);
  fence(tris, id, t);
  table(tris, id, t);
  lightPoles(tris);
  const pOn = parolOn(id, t);
  parol(tris, PAROL, 1.25, pOn, [[0.85, 0.15, 0.2], [0.98, 0.78, 0.25]]);
  limb(tris, P0, [PAROL[0], PAROL[1] + 0.13, PAROL[2]], [PAROL[0], G(HX, HZ) + HOUSE_EAVE_Y * HS, PAROL[2] + 0.02], 0.002, 0.002, c255([0.15, 0.15, 0.15]), 3);
  if (pOn > 0.02) {
    lights.push({ p: [PAROL[0], PAROL[1], PAROL[2] + 0.12], color: [255, 180, 110], intensity: 1.2 * pOn, range: 1.5 });
    glows.push({ p: PAROL, radius: 0.2, color: [255, 160, 90], alpha: 0.28 * pOn }, { p: PAROL, radius: 0.06, color: [255, 230, 180], alpha: 0.4 * pOn });
  }
  const bOn = bulbOn(id, t);
  limb(tris, P0, [BULB[0], BULB[1] + 0.02, BULB[2]], [BULB[0], BULB[1] + 0.8, BULB[2]], 0.002, 0.002, c255([0.1, 0.1, 0.1]), 3);
  ball(tris, P0, BULB, [0.016, 0.02, 0.016], { color: to255(mix([0.6, 0.6, 0.55], [1, 0.92, 0.75], bOn)), glow: bOn }, 1);
  if (bOn > 0.02) {
    lights.push({ p: BULB, color: [255, 200, 140], intensity: 1.6 * bOn, range: 1.5 });
    glows.push({ p: BULB, radius: 0.15, color: [255, 190, 120], alpha: 0.3 * bOn }, { p: BULB, radius: 0.035, color: [255, 245, 220], alpha: 0.8 * bOn });
  }
  if (winOn > 0.05) lights.push({ p: [HX + 0.17 * HS, G(HX, HZ) + 0.27 * HS, FRONT + 0.15], color: [255, 190, 120], intensity: 0.4 * winOn, range: 0.8 });
  stringGlows(glows, t, stringLights(id, t));
  sign(tris, glows, id, t);
  for (const { m, b } of cast(id, t)) {
    shadowUnder(tris, G, b.at[0], b.at[2], 0.09 * b.scale, 0.22);
    peg(tris, b, m.coat, m.hair, m.legs, m.long, fade);
    if ((id === "ate" && m.who === "ate") || (id === "bunso" && m.who === "bunso")) suitcase(tris, b);
  }
  for (const c of carried(id, t)) {
    const P = placer(c.by), s = c.by.scale;
    if (c.what === "box") boxShape(tris, (q) => P([0.17 + q[0] / s, 0.26 + q[1] / s, q[2] / s]));
    if (c.what === "lechon") lechon(tris, (q) => P([0.15 + q[2] * 0.75 / s, 0.27 + q[1] * 0.75 / s, -q[0] * 0.75 / s]));
    if (c.what === "phone") {
      const p = P([0.19, 0.4, 0]);
      cube(tris, P, [0.19, 0.4, 0], [0.004, 0.03, 0.017], { color: [200, 225, 255], glow: 1 });
      glows.push({ p, radius: 0.07, color: [170, 210, 255], alpha: 0.45 });
      lights.push({ p, color: [180, 210, 255], intensity: 0.7, range: 0.45 });
    }
  }
  const ride = rideAt(id, t);
  if (ride?.kind === "jeep") jeepney(tris, ride);
  if (ride?.kind === "trike") tricycle(tris, glows, lights, ride);
  return { tris, camera, env, lights, glowsFront: glows, sky };
}

// ── Over the picture ───────────────────────────────────────────────────────────────────────────────────────────
const FIREWORKS = [{ at: 12.6, x: 0.3, y: 0.2, hue: [255, 120, 90] }, { at: 13.1, x: 0.7, y: 0.14, hue: [255, 220, 120] }, { at: 13.6, x: 0.48, y: 0.26, hue: [140, 200, 255] }, { at: 14.0, x: 0.22, y: 0.12, hue: [255, 150, 220] }, { at: 14.4, x: 0.66, y: 0.3, hue: [150, 255, 170] }];
function fireworks(g: CanvasRenderingContext2D, t: number) {
  for (const f of FIREWORKS) {
    const a = t - f.at;
    if (a < 0 || a > 1.8) continue;
    const r = 190 * (1 - Math.exp(-a * 3)), alpha = 1 - a / 1.8;
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * TAU + f.at, x = f.x * W + Math.cos(ang) * r, y = f.y * H + Math.sin(ang) * r + 70 * a * a;
      g.fillStyle = `rgba(${f.hue[0]},${f.hue[1]},${f.hue[2]},${0.9 * alpha})`;
      g.beginPath();
      g.arc(x, y, 6 * (1 - a / 2.2), 0, TAU);
      g.fill();
    }
  }
}

let layer: HTMLCanvasElement | null = null;
const css = (c: RGB) => `rgb(${Math.min(255, c[0] * 255) | 0},${Math.min(255, c[1] * 255) | 0},${Math.min(255, c[2] * 255) | 0})`;

/** One segment's picture at absolute film time (the scene hands us its own clock; we add its start back). */
const painterFor = (id: SegId): Painter => (g, local) => {
  const time = local + seg(id).from, t = filmTime(time), frame = frameAt(id, t), sky = frame.sky;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, css(sky.top));
  grad.addColorStop(1, css(sky.bottom));
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const stars = sky.stars ?? 0;
  if (stars > 0.02) for (let i = 0; i < 170; i++) {
    const s = hash(i, 33) < 0.1 ? 4 : 2.2, tw = 0.6 + 0.4 * Math.sin(time * 2 + i);
    g.fillStyle = `rgba(255,255,255,${0.75 * stars * tw})`;
    g.fillRect(hash(i, 31) * W, hash(i, 32) * H * 0.7, s, s);
  }
  if (id === "y1998") fireworks(g, t);
  layer ??= document.createElement("canvas");
  layer.width = W;
  layer.height = H;
  render(layer.getContext("2d")!, W, H, { tris: frame.tris, camera: frame.camera, env: frame.env, lights: frame.lights, glowsFront: frame.glowsFront, noSky: true });
  g.drawImage(layer, 0, 0);
};

/** What goes over every segment alike: vignette, the photo's flash, the fade at the end. */
export const finish: Painter = (g, time) => {
  const v = g.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 0.78);
  v.addColorStop(0, "rgba(10,6,20,0)");
  v.addColorStop(1, "rgba(10,6,20,0.38)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  if (time >= FLASH && time < FLASH + 1.6) {
    const a = time - FLASH, hold = time < FLASH + FREEZE ? 1 : 1 - smooth(FLASH + FREEZE, FLASH + FREEZE + 0.25, time);
    if (hold > 0) {
      g.fillStyle = `rgba(255,214,150,${0.16 * hold})`;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = `rgba(250,246,236,${hold})`;
      g.lineWidth = 46;
      g.strokeRect(23, 23, W - 46, H - 46);
    }
    g.fillStyle = `rgba(255,255,255,${0.95 * Math.exp(-a * 7)})`;
    g.fillRect(0, 0, W, H);
  }
  if (time > 59.2) {
    g.fillStyle = `rgba(4,3,10,${smooth(59.2, 60, time)})`;
    g.fillRect(0, 0, W, H);
  }
};

/** The film's scenes: each segment melts in over the last, the camera moving on through both. */
export const SCENES: Scene[] = SEGS.map((s, i) => ({ from: s.from, to: SEGS[i + 1]?.from ?? SECONDS, melt: s.melt, paint: painterFor(s.id) }));

let spare: HTMLCanvasElement | null = null;
/** The whole film at time t: the segments showing (two while one melts into the next), then the finishing touches. */
export const paint: Painter = (g, time) => {
  for (const { scene, opacity } of showing(SCENES, time)) {
    if (opacity >= 1) scene.paint(g, time - scene.from);
    else {
      spare ??= document.createElement("canvas");
      spare.width = W;
      spare.height = H;
      const s = spare.getContext("2d")!;
      scene.paint(s, time - scene.from);
      g.globalAlpha = opacity;
      g.drawImage(spare, 0, 0);
      g.globalAlpha = 1;
    }
  }
  finish(g, time);
};

/** Times to check the look before the long render. */
export const STILLS = [0.5, 3.4, 4.9, 6.6, 8.6, 10.2, 11.5, 13.4, 15.2, 16.6, 18.4, 19.6, 21.2, 22.4, 24.4, 26.2, 28.8, 31.8, 33.4, 36.0, 37.9, 40.0, 41.8, 43.2, 45.0, 47.6, 49.1, 51.0, 54.6, 56.4, 58.0, 59.4];
