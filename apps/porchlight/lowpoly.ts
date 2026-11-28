// "Leave the Light On" in low-poly: the same story, cameras, sky and poses as the box world (story.ts), drawn as flat
// shaded triangles by the low-poly engine instead of marching rays. Each box thing is rebuilt from boxes, faceted balls
// and prisms at the sizes its distance function uses, coloured from its own materials. Quick: no graphics card needed.
import { render, type Env, type Glow, type PointLight, type Tri } from "../../src/kit/lowpoly/engine";
import { ball, bench, cube, dog, facet, hash, lantern, limb, mix, norm, paintOf, person, placer, postLamp, quad, shadowUnder, tiles, to255, type Build, type Col, type Place } from "../../src/kit/lowpoly/diorama";
import { eyeOf, landAt } from "../../src/kit/looks/box/world";
import { H, W, clamp01, type Painter, type RGB, type V3 } from "../../src/kit/looks/core";
import { LAND, dressed, world } from "./story";

// ── The things, as the box draws them (see props.ts and box/things.ts for the same numbers) ─────────────────────

const cottage: Build = (out, P, k, m) => {
  // What sits on the walls is drawn after them (a nudge in the painter's sort), so the walls never cover it.
  const on = (c: Col): Col => ({ ...c, zBias: -0.03 });
  const [wall, roof, chimney] = [m[0], m[1], m[5]];
  const [glass, door, frame, flowerBox, flower, leaf, ivy, step] = [m[2], m[3], m[4], m[6], m[7], m[8], m[9], m[10]].map(on);
  cube(out, P, [0, 0.28, 0], [0.4, 0.34, 0.32], wall);
  // The gable roof: eaves at y 0.56, x ±0.5; ridge at y 0.98; 0.4 deep either side, with some thickness.
  const r = (x: number, y: number, z: number): V3 => [x, y, z];
  for (const s of [-1, 1]) {
    tiles(out, P(r(0, 0.98, -0.4)), P(r(0, 0.98, 0.4)), P(r(0.5 * s, 0.56, 0.4)), P(r(0.5 * s, 0.56, -0.4)), facet(roof, s > 0 ? 1 : 2));
    quad(out, P(r(0.5 * s, 0.56, 0.4)), P(r(0.5 * s, 0.56, -0.4)), P(r(0.5 * s, 0.53, -0.4)), P(r(0.5 * s, 0.53, 0.4)), roof);
    // Shingle courses: thin steps down each slope.
    for (let i = 1; i < 5; i++) {
      const f = i / 5, x = 0.5 * s * f, y = 0.98 - 0.42 * f;
      quad(out, P(r(x, y + 0.004, 0.4)), P(r(x, y + 0.004, -0.4)), P(r(x + 0.012 * s, y - 0.012, -0.4)), P(r(x + 0.012 * s, y - 0.012, 0.4)), { ...roof, color: [roof.color[0] * 0.8, roof.color[1] * 0.8, roof.color[2] * 0.8] });
    }
  }
  for (const z of [-0.32, 0.32]) {
    const g = (x: number, y: number) => P(r(x, y, z));
    out.push({ a: g(-0.4, 0.62), b: g(0, 0.62), c: g(-0.2, 0.78), ...wall }, { a: g(0, 0.62), b: g(0.4, 0.62), c: g(0.2, 0.78), ...wall });
    out.push({ a: g(-0.2, 0.78), b: g(0, 0.62), c: g(0.2, 0.78), ...wall }, { a: g(-0.2, 0.78), b: g(0.2, 0.78), c: g(0, 0.94), ...wall });
  }
  cube(out, P, [0.22, 0.86, -0.12], [0.05, 0.17, 0.05], chimney);
  cube(out, P, [0.22, 1.03, -0.12], [0.062, 0.012, 0.062], chimney);
  // Window: lit glass, a white frame and its cross.
  cube(out, P, [0.17, 0.34, 0.325], [0.1, 0.1, 0.01], glass);
  for (const [c, h] of [[[0.17, 0.452, 0.335], [0.118, 0.014, 0.012]], [[0.17, 0.228, 0.335], [0.118, 0.014, 0.012]], [[0.058, 0.34, 0.335], [0.014, 0.118, 0.012]], [[0.282, 0.34, 0.335], [0.014, 0.118, 0.012]], [[0.17, 0.34, 0.338], [0.1, 0.007, 0.01]], [[0.17, 0.34, 0.338], [0.007, 0.1, 0.01]]] as [V3, V3][]) cube(out, P, c, h, frame);
  cube(out, P, [0.17, 0.19, 0.37], [0.12, 0.022, 0.04], flowerBox);
  for (let i = 0; i < 6; i++) {
    const c: V3 = [0.075 + i * 0.038, 0.225, 0.36 + 0.02 * (i & 1)];
    ball(out, P, c, [0.03, 0.014, 0.024], leaf, 0);
    ball(out, P, [c[0], c[1] + 0.014, c[2]], [0.017, 0.017, 0.017], flower, 0, 0, i);
  }
  cube(out, P, [-0.16, 0.2, 0.325], [0.08, 0.2, 0.02], door);
  ball(out, P, [-0.105, 0.2, 0.35], [0.011, 0.011, 0.011], frame, 0);
  cube(out, P, [-0.16, 0.015, 0.39], [0.11, 0.02, 0.06], step);
  // Ivy climbs from the front left corner as the years go by.
  const grown = k[1] ?? 0;
  for (let i = 0; i < 14; i++) {
    const reach = hash(i, 4) * 0.55 + 0.05;
    if (reach > grown * 1.3) continue;
    const front = i % 2 === 0, a = hash(i, 5), y = 0.04 + reach * 0.75 * (0.6 + 0.4 * a);
    const c: V3 = front ? [-0.4 + 0.18 * a * reach * 2, y, 0.325] : [-0.405, y, 0.3 - 0.3 * a * reach * 2];
    ball(out, P, c, front ? [0.07, 0.06, 0.02] : [0.02, 0.06, 0.07], ivy, 0, 0.2, i);
  }
};

const oak: Build = (out, P, k, [trunk, leaves, rope]) => {
  limb(out, P, [0, -0.1, 0], [0.02, 0.7, 0], 0.09, 0.06, trunk, 7);
  limb(out, P, [0, 0.55, 0], [0.3, 0.86, 0.25], 0.05, 0.03, trunk);
  limb(out, P, [0, 0.6, 0], [-0.3, 0.9, -0.1], 0.05, 0.03, trunk);
  const crown: [V3, V3][] = [[[0, 1, 0], [0.5, 0.36, 0.46]], [[0.32, 0.88, 0.12], [0.3, 0.25, 0.3]], [[-0.3, 0.9, -0.08], [0.32, 0.26, 0.3]], [[0.02, 1.18, -0.12], [0.34, 0.24, 0.3]]];
  crown.forEach(([c, r], i) => ball(out, P, c, r, leaves, 1, 0.12, i * 7));
  // The swing, hung from (0.28, 0.84, 0.3), swinging in y-z.
  const a = k[3] ?? 0, ca = Math.cos(a), sa = Math.sin(a);
  const S = (q: V3): V3 => [0.28 + q[0], 0.84 + q[1] * ca - q[2] * sa, 0.3 + q[1] * sa + q[2] * ca];
  for (const x of [-0.07, 0.07]) limb(out, P, S([x, 0, 0]), S([x, -0.62, 0]), 0.005, 0.005, rope, 3);
  const seat = (x: number, z: number) => P(S([x, -0.63, z]));
  quad(out, seat(-0.09, -0.035), seat(0.09, -0.035), seat(0.09, 0.035), seat(-0.09, 0.035), rope);
};

const smallTree: Build = (out, P, _k, [trunk, leaves]) => {
  limb(out, P, [0, -0.1, 0], [0.02, 0.55, 0], 0.06, 0.04, trunk);
  ([[[0, 0.72, 0], [0.3, 0.28, 0.3]], [[0.17, 0.6, 0.05], [0.2, 0.17, 0.2]], [[-0.15, 0.58, -0.04], [0.2, 0.17, 0.2]]] as [V3, V3][]).forEach(([c, r], i) => ball(out, P, c, r, leaves, 1, 0.12, 40 + i * 5));
};

const fence: Build = (out, P, k, [wood, paper, ink]) => {
  const half = 0.65;
  for (let id = Math.round(-half / 0.09); id <= Math.round(half / 0.09); id++) {
    const x = id * 0.09;
    if (Math.abs(x) < 0.15 || Math.abs(x) > half) continue;
    cube(out, P, [x, 0.09, 0], [0.013, 0.09, 0.008], wood);
  }
  for (const s of [-1, 1]) {
    for (const y of [0.06, 0.14]) cube(out, P, [s * (0.15 + half) / 2, y, -0.012], [(half - 0.15) / 2, 0.008, 0.005], wood);
    cube(out, P, [s * 0.15, 0.11, 0], [0.018, 0.11, 0.018], wood);
  }
  // The gate, hinged at x −0.13, swinging back into the yard.
  const o = k[0] ?? 0, co = Math.cos(o), so = Math.sin(o);
  const G = (q: V3): V3 => P([-0.13 + q[0] * co + q[2] * so, q[1], -q[0] * so + q[2] * co]);
  for (const [c, h] of [[[0.13, 0.17, 0], [0.12, 0.01, 0.006]], [[0.13, 0.03, 0], [0.12, 0.01, 0.006]], [[0.02, 0.1, 0], [0.01, 0.08, 0.006]], [[0.24, 0.1, 0], [0.01, 0.08, 0.006]], [[0.13, 0.1, 0], [0.12, 0.008, 0.006]]] as [V3, V3][]) cube(out, G, c, h, wood);
  const pinned = k[1] ?? 0;
  for (let i = 0; i < 3; i++) {
    if (i >= pinned - 0.01) continue;
    const x = 0.22 + i * 0.13;
    cube(out, P, [x, 0.11, 0.013], [0.035, 0.045, 0.002], paper);
    ball(out, P, [x, 0.12, 0.016], [0.016, 0.016, 0.004], ink, 0);
  }
};

const crate: Build = (out, P, k, [wood, bow]) => {
  cube(out, P, [0, 0.005, 0], [0.09, 0.005, 0.08], wood);
  for (const s of [-1, 1]) {
    cube(out, P, [0.084 * s, 0.07, 0], [0.006, 0.07, 0.08], wood);
    cube(out, P, [0, 0.07, 0.074 * s], [0.09, 0.07, 0.006], wood);
  }
  const a = (k[0] ?? 0) * 1.9, ca = Math.cos(a), sa = Math.sin(a);
  const Lid: Place = (q) => P([-0.09 + q[0] * ca - q[1] * sa, 0.145 + q[0] * sa + q[1] * ca, q[2]]);
  cube(out, Lid, [0.09, 0, 0], [0.094, 0.008, 0.084], wood);
  if ((k[0] ?? 0) < 0.2) {
    cube(out, P, [0, 0.075, 0], [0.094, 0.077, 0.012], bow);
    ball(out, P, [0, 0.16, 0], [0.03, 0.016, 0.018], bow, 0);
  }
};

const laundry: Build = (out, P, k, [pole, white, blue]) => {
  for (const x of [-0.35, 0.35]) {
    limb(out, P, [x, 0, 0], [x, 0.46, 0], 0.012, 0.01, pole, 5);
    limb(out, P, [x, 0.45, -0.05], [x, 0.45, 0.05], 0.008, 0.008, pole, 4);
  }
  limb(out, P, [-0.35, 0.44, 0], [0.35, 0.44, 0], 0.003, 0.003, pole, 3);
  cube(out, P, [-0.22, 0.35, 0], [0.08, 0.085, 0.004], white);
  if ((k[0] ?? 0) > 0.5) cube(out, P, [0, 0.345, 0], [0.085, 0.09, 0.004], white);
  cube(out, P, [0.22, 0.355, 0], [0.07, 0.08, 0.004], blue);
};

const sheet: Build = (out, P, _k, [white]) => ball(out, P, [0, 0, 0], [0.1, 0.014, 0.085], white, 1, 0.15);

/** world.things, in order (see story.ts). */
/** Where the houses stand: anyone inside one is hidden (the box hides them behind its walls). */
const HOUSES = [0, 1].map((i) => {
  const p = world.things[i].pose, at = (typeof p === "function" ? p(0) : p).at;
  return [at[0], at[2]] as [number, number];
});
const BUILDS: Build[] = [cottage, cottage, oak, smallTree, fence, postLamp, bench, person(false), person(true), person(true), person(false), dog, dog, crate, laundry, sheet, lantern];
const SHADOWS = [0, 0, 0.34, 0.24, 0, 0.05, 0.16, 0.1, 0.1, 0.1, 0.1, 0.11, 0.11, 0.1, 0, 0, 0];

// ── The slab ─────────────────────────────────────────────────────────────────────────────────────────────────────

const SIZE = LAND.size ?? 2.1, DEPTH = LAND.depth ?? 2, BOTTOM = 0.35 - DEPTH / 2 - 0.1 - (DEPTH / 2 + 0.25);
const EARTH: [RGB, RGB, RGB] = LAND.earth ?? [[0.36, 0.2, 0.15], [0.22, 0.12, 0.13], [0.13, 0.09, 0.15]];
const N = 42, STEP = (2 * SIZE) / N;
const pathPts = LAND.path?.points ?? [], pathW = LAND.path?.width ?? 0.12;
function pathDist(x: number, z: number) {
  let d = 1e9;
  for (let i = 1; i < pathPts.length; i++) {
    const [ax, az] = pathPts[i - 1], [bx, bz] = pathPts[i], dx = bx - ax, dz = bz - az;
    const t = clamp01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}
const G = (x: number, z: number) => landAt(LAND, x, z);
// Jittered grid points, fixed for the whole film (the edge ones stay on the edge).
const GRID: [number, number][][] = Array.from({ length: N + 1 }, (_, i) => Array.from({ length: N + 1 }, (_, j) => {
  const edgeX = i === 0 || i === N, edgeZ = j === 0 || j === N;
  return [-SIZE + i * STEP + (edgeX ? 0 : (hash(i, j, 1) - 0.5) * STEP * 0.5), -SIZE + j * STEP + (edgeZ ? 0 : (hash(i, j, 2) - 0.5) * STEP * 0.5)];
}));
// Tufts and flowers: fixed places, like the box's cells.
const TUFTS = Array.from({ length: 900 }, (_, i) => {
  const x = (hash(i, 7) * 2 - 1) * (SIZE - 0.08), z = (hash(i, 8) * 2 - 1) * (SIZE - 0.08);
  return { x, z, h: 0.05 + 0.035 * hash(i, 9), turn: hash(i, 10) * Math.PI * 2, flower: hash(i, 11) < 0.22, hue: Math.floor(hash(i, 12) * 4) };
}).filter((t) => pathDist(t.x, t.z) > pathW + 0.05);

function slab(out: Tri[], t: number) {
  const now = LAND.colorsAt!(t), [ga, gb] = now.grass, litter = now.litter ?? 0, flowers = now.flowers ?? 0;
  const pathCol = LAND.path?.color ?? [0.5, 0.38, 0.27];
  const groundAt = (x: number, z: number, i: number): RGB => {
    let c = mix(ga, gb, 0.25 + 0.5 * hash(i, 3));
    if (pathDist(x, z) < pathW) c = mix(pathCol, [pathCol[0] * 0.92, pathCol[1] * 0.92, pathCol[2] * 0.92], hash(i, 4));
    return to255(c);
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const v = (a: number, b: number): V3 => {
      const [x, z] = GRID[a][b];
      return [x, G(x, z), z];
    };
    const p00 = v(i, j), p10 = v(i + 1, j), p11 = v(i + 1, j + 1), p01 = v(i, j + 1);
    const flip = (i + j) % 2 === 0;
    const tris: [V3, V3, V3][] = flip ? [[p00, p10, p11], [p00, p11, p01]] : [[p00, p10, p01], [p10, p11, p01]];
    tris.forEach(([a, b, c], n) => {
      const cx = (a[0] + b[0] + c[0]) / 3, cz = (a[2] + b[2] + c[2]) / 3;
      out.push({ a, b, c, color: groundAt(cx, cz, i * 997 + j * 31 + n), zBias: 0.02 });
    });
  }
  // The cut sides: earth in bands, a dark lip under the grass.
  const side = (pts: [number, number][], out2: [number, number]) => {
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, z0] = pts[s], [x1, z1] = pts[s + 1], y0 = G(x0, z0), y1 = G(x1, z1);
      const ox = out2[0] * 0.012, oz = out2[1] * 0.012;
      const lip = (y: number) => y - 0.06 - 0.03 * hash(s, x0 + z0);
      quad(out, [x0 + ox, y0 + 0.01, z0 + oz], [x1 + ox, y1 + 0.01, z1 + oz], [x1 + ox, lip(y1), z1 + oz], [x0 + ox, lip(y0), z0 + oz], { color: to255(mix(ga, [0.1, 0.1, 0.1], 0.25)) });
      const bands: [number, RGB][] = [[0.06, EARTH[0]], [0.5, mix(EARTH[0], EARTH[1], 0.5)], [1.0, EARTH[1]], [1.6, EARTH[2]]];
      let ya = 0.06;
      for (const [to, col] of bands.slice(1)) {
        quad(out, [x0, y0 - ya, z0], [x1, y1 - ya, z1], [x1, Math.max(BOTTOM, y1 - to), z1], [x0, Math.max(BOTTOM, y0 - to), z0], facet({ color: to255(col) }, s, 0.08));
        ya = to;
      }
      quad(out, [x0, y0 - ya, z0], [x1, y1 - ya, z1], [x1, BOTTOM, z1], [x0, BOTTOM, z0], { color: to255(EARTH[2]) });
    }
  };
  const edge = (f: (u: number) => [number, number]) => Array.from({ length: N + 1 }, (_, i) => f(-SIZE + i * STEP));
  side(edge((u) => [u, SIZE]), [0, 1]);
  side(edge((u) => [u, -SIZE]), [0, -1]);
  side(edge((u) => [SIZE, u]), [1, 0]);
  side(edge((u) => [-SIZE, u]), [-1, 0]);
  // Fallen leaves in autumn: small flat flakes.
  for (let i = 0; i < 700 * litter; i++) {
    const x = (hash(i, 21) * 2 - 1) * (SIZE - 0.03), z = (hash(i, 22) * 2 - 1) * (SIZE - 0.03), y = G(x, z) + 0.003;
    const a = hash(i, 23) * 6.3, r = 0.012 + 0.008 * hash(i, 24), col = to255(mix([0.82, 0.45, 0.14], [0.62, 0.28, 0.12], hash(i, 25)));
    const at = (da: number, s: number): V3 => [x + Math.cos(a + da) * r * s, y, z + Math.sin(a + da) * r * s];
    out.push({ a: at(0, 1), b: at(2.4, 0.6), c: at(-2.4, 0.6), color: col, zBias: 0.01 });
  }
  // Tufts: three blades each; some carry a flower in spring and summer.
  const tuft = to255(now.tuft), flowerCols = (LAND.rich?.flowers ?? []).map(to255);
  for (const f of TUFTS) {
    const y = G(f.x, f.z);
    for (let b = 0; b < 3; b++) {
      const a = f.turn + (b * Math.PI * 2) / 3, lean = 0.018;
      const base: V3 = [f.x + Math.cos(a) * 0.008, y, f.z + Math.sin(a) * 0.008];
      const tip: V3 = [f.x + Math.cos(a) * lean, y + f.h * (0.8 + 0.25 * b / 2), f.z + Math.sin(a) * lean];
      const w: V3 = [-Math.sin(a) * 0.008, 0, Math.cos(a) * 0.008];
      out.push({ a: [base[0] - w[0], base[1], base[2] - w[2]], b: [base[0] + w[0], base[1], base[2] + w[2]], c: tip, color: tuft, glow: 0.2 });
    }
    if (f.flower && flowerCols.length && hash(f.x, f.z) < flowers) {
      const top: V3 = [f.x, y + f.h * 1.25, f.z];
      ball(out, (q) => q, top, [0.012, 0.012, 0.012], { color: flowerCols[f.hue % flowerCols.length] }, 0);
    }
  }
}

// ── The frame ────────────────────────────────────────────────────────────────────────────────────────────────────

export function lowpolyFrame(t: number) {
  const cam = world.camera(t), zoom = cam.zoom ?? 2.2;
  const camera = { pos: eyeOf(cam), target: cam.target ?? ([0, 1, 0] as V3), fov: (2 * Math.atan(H / (2 * zoom * W)) * 180) / Math.PI };
  const sky = world.sky(t);
  const env: Env = {
    skyTop: to255(sky.top), skyBottom: to255(sky.bottom), fog: to255(sky.bottom), fogNear: 60, fogFar: 120,
    sun: norm(sky.keyFrom), sunColor: sky.key.map((c) => Math.min(255, c * 120)) as RGB, ambient: sky.fill.map((c) => Math.min(255, c * 300)) as RGB,
    stars: (sky.stars ?? 0) * 0.8,
  };
  const tris: Tri[] = [];
  slab(tris, t);
  world.things.forEach((th, i) => {
    const pose = typeof th.pose === "function" ? th.pose(t) : th.pose;
    if (pose.at[1] < -5) return;
    if (i >= 7 && HOUSES.some(([x, z]) => Math.abs(pose.at[0] - x) < 0.5 && Math.abs(pose.at[2] - z) < 0.4)) return;
    const k = pose.k ?? [];
    const build = BUILDS[i];
    if (!build) return;
    if (SHADOWS[i]) shadowUnder(tris, G, pose.at[0], pose.at[2], SHADOWS[i] * (pose.scale ?? 1), 0.22);
    build(tris, placer(pose), k, th.mats.map((m) => paintOf(m, k)));
  });
  const lights: PointLight[] = [], glows: Glow[] = [];
  for (const l of world.lamps?.(t) ?? []) {
    if (l.power <= 0.02 || l.at[1] < -5) continue;
    const color = l.color.map((c) => Math.min(255, c * 255)) as RGB;
    lights.push({ p: l.at, color, intensity: l.power * 1.1, range: 2.4 / Math.sqrt(l.falloff ?? 4) });
    if (l.haze) glows.push({ p: l.at, radius: 0.22 * l.haze, color, alpha: Math.min(0.8, 0.45 * l.power) }, { p: l.at, radius: 0.05, color: [255, 240, 200], alpha: Math.min(1, 0.7 * l.power) });
  }
  return { tris, camera, env, lights, glowsFront: glows };
}

let layer: HTMLCanvasElement | null = null;
/** The low-poly picture of the film at t, dressed with the same smoke, moths, weather and blinks. The sky is a plain
 *  gradient down the frame, as in the box (the engine puts its own at the horizon, off the top of these shots). */
export const lowpolyPaint: Painter = dressed((g, t) => {
  const frame = lowpolyFrame(t), sky = world.sky(t);
  const css = (c: RGB) => `rgb(${Math.min(255, c[0] * 255) | 0},${Math.min(255, c[1] * 255) | 0},${Math.min(255, c[2] * 255) | 0})`;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, css(sky.top));
  grad.addColorStop(1, css(sky.bottom));
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const stars = sky.stars ?? 0;
  if (stars > 0.02) {
    g.fillStyle = `rgba(255,255,255,${0.8 * stars})`;
    for (let i = 0; i < 160; i++) {
      const s = hash(i, 33) < 0.1 ? 4 : 2.4;
      g.fillRect(hash(i, 31) * W, hash(i, 32) * H * 0.75, s, s);
    }
  }
  layer ??= document.createElement("canvas");
  layer.width = W;
  layer.height = H;
  render(layer.getContext("2d")!, W, H, { ...frame, noSky: true });
  g.drawImage(layer, 0, 0);
});
