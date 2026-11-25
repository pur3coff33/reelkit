// Building blocks for the low-poly worlds: seeded noise, a height-field grid, simple solids, particles and camera moves.
import { add, clamp01, mixRGB, norm, scale, smooth, type Camera, type RGB, type Tri, type V3 } from "./engine";

// ── Noise ──────────────────────────────────────────────────────────────────────────────────────────────

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x: number, z: number, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in 0…1. */
export function noise2(x: number, z: number, seed = 0) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** Fractal noise in roughly −0.5…0.5. */
export function fbm(x: number, z: number, octaves = 4, seed = 0) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += (noise2(x * f, z * f, seed + i * 17) - 0.5) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

// ── Height-field grids (terrain, water) ───────────────────────────────────────────────────────────────

export type Grid = { x0: number; z0: number; nx: number; nz: number; cell: number; jx: Float32Array; jz: Float32Array };

/** A grid of nx × nz cells, its inner vertices nudged a little so the faces look hand-cut, not tiled. */
export function makeGrid(x0: number, z0: number, nx: number, nz: number, cell: number, seed = 1): Grid {
  const n = (nx + 1) * (nz + 1);
  const jx = new Float32Array(n), jz = new Float32Array(n);
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      if (i === 0 || j === 0 || i === nx || j === nz) continue;
      jx[j * (nx + 1) + i] = (hash2(i, j, seed) - 0.5) * cell * 0.7;
      jz[j * (nx + 1) + i] = (hash2(i, j, seed + 9) - 0.5) * cell * 0.7;
    }
  return { x0, z0, nx, nz, cell, jx, jz };
}

/** The grid's vertex positions (x, z) and a height per vertex from `height`. */
export function sampleGrid(g: Grid, height: (x: number, z: number) => number) {
  const n = (g.nx + 1) * (g.nz + 1);
  const X = new Float32Array(n), Z = new Float32Array(n), H = new Float32Array(n);
  for (let j = 0; j <= g.nz; j++)
    for (let i = 0; i <= g.nx; i++) {
      const k = j * (g.nx + 1) + i;
      X[k] = g.x0 + i * g.cell + g.jx[k];
      Z[k] = g.z0 + j * g.cell + g.jz[k];
      H[k] = height(X[k], Z[k]);
    }
  return { X, Z, H };
}

export type Sampled = ReturnType<typeof sampleGrid>;

/**
 * Two triangles per cell. `face` picks each triangle's colour (or null to skip it) from its three vertex indices.
 */
export function emitGrid(
  out: Tri[],
  g: Grid,
  s: Sampled,
  face: (i0: number, i1: number, i2: number, cx: number, cz: number) => { color: RGB; glow?: number; alpha?: number } | null,
) {
  const w = g.nx + 1;
  const v = (k: number): V3 => [s.X[k], s.H[k], s.Z[k]];
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
      const tris = (i + j) % 2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]];
      for (const [p, q, r] of tris) {
        const cx = (s.X[p] + s.X[q] + s.X[r]) / 3, cz = (s.Z[p] + s.Z[q] + s.Z[r]) / 3;
        const f = face(p, q, r, cx, cz);
        if (f) out.push({ a: v(p), b: v(q), c: v(r), ...f });
      }
    }
}

/** Shifts a colour a touch per face so flat areas still read as facets. */
export function vary(c: RGB, seed: number, amount = 0.07): RGB {
  const k = 1 + (hash2(seed, seed * 7, 3) - 0.5) * 2 * amount;
  return [c[0] * k, c[1] * k, c[2] * k];
}

// ── Solids ───────────────────────────────────────────────────────────────────────────────────────────

export type Pose = { pos: V3; yaw?: number; pitch?: number; roll?: number; size?: number | V3 };

/** Local → world for a pose: scale, then roll (z), pitch (x), yaw (y), then move. */
export function poseFn(p: Pose) {
  const s: V3 = typeof p.size === "number" ? [p.size, p.size, p.size] : (p.size ?? [1, 1, 1]);
  const cy = Math.cos(p.yaw ?? 0), sy = Math.sin(p.yaw ?? 0);
  const cx = Math.cos(p.pitch ?? 0), sx = Math.sin(p.pitch ?? 0);
  const cz = Math.cos(p.roll ?? 0), sz = Math.sin(p.roll ?? 0);
  return (v: V3): V3 => {
    let x = v[0] * s[0], y = v[1] * s[1], z = v[2] * s[2];
    [x, y] = [x * cz - y * sz, x * sz + y * cz];
    [y, z] = [y * cx - z * sx, y * sx + z * cx];
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    return [x + p.pos[0], y + p.pos[1], z + p.pos[2]];
  };
}

type Look = { color: RGB; glow?: number; alpha?: number; zBias?: number };

function emitFaces(out: Tri[], verts: V3[], faces: number[][], pose: Pose, look: Look | ((face: number) => Look)) {
  const T = poseFn(pose);
  const w = verts.map(T);
  faces.forEach((f, i) => {
    const l = typeof look === "function" ? look(i) : look;
    for (let k = 1; k < f.length - 1; k++) out.push({ a: w[f[0]], b: w[f[k]], c: w[f[k + 1]], ...l });
  });
}

const BOX_V: V3[] = [
  [-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5],
  [-0.5, 1, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5],
];
const BOX_F = [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];

/** A box standing on its pose's position (no bottom face). */
export function box(out: Tri[], pose: Pose, look: Look | ((face: number) => Look)) {
  emitFaces(out, BOX_V, BOX_F, pose, look);
}

/** A house: a box with a pitched roof. `size` is [width, wall height, depth]. */
export function house(out: Tri[], pose: Pose, wall: RGB, roof: RGB, look: { glow?: number } = {}) {
  const [w, h, d] = typeof pose.size === "number" ? [pose.size, pose.size, pose.size] : (pose.size ?? [1, 1, 1]);
  const T = poseFn({ ...pose, size: 1 });
  const v: V3[] = [
    [-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2],
    [-w / 2, h, -d / 2], [w / 2, h, -d / 2], [w / 2, h, d / 2], [-w / 2, h, d / 2],
    [0, h + w * 0.45, -d / 2], [0, h + w * 0.45, d / 2],
  ].map((p) => T(p as V3));
  const wallLook = { color: wall, glow: look.glow }, roofLook = { color: roof, glow: look.glow };
  const quads: [number[], Look][] = [
    [[0, 1, 5, 4], wallLook], [[1, 2, 6, 5], wallLook], [[2, 3, 7, 6], wallLook], [[3, 0, 4, 7], wallLook],
    [[4, 8, 9, 7], roofLook], [[5, 6, 9, 8], roofLook], [[4, 5, 8], wallLook], [[6, 7, 9], wallLook],
  ];
  for (const [f, l] of quads) for (let k = 1; k < f.length - 1; k++) out.push({ a: v[f[0]], b: v[f[k]], c: v[f[k + 1]], ...l });
}

/** An n-sided cone standing on its pose's position, height 1, radius 1 (scaled by the pose). */
export function cone(out: Tri[], pose: Pose, look: Look, sides = 5) {
  const v: V3[] = [[0, 1, 0]];
  for (let i = 0; i < sides; i++) v.push([Math.cos((i / sides) * Math.PI * 2), 0, Math.sin((i / sides) * Math.PI * 2)]);
  const f: number[][] = [];
  for (let i = 0; i < sides; i++) f.push([0, 1 + i, 1 + ((i + 1) % sides)]);
  emitFaces(out, v, f, pose, look);
}

/** A two-tier pine, height about 1 at size 1. */
export function tree(out: Tri[], pose: Pose, color: RGB) {
  const T = poseFn({ ...pose, size: 1 });
  const s = typeof pose.size === "number" ? pose.size : 1;
  cone(out, { ...pose, pos: T([0, 0.15 * s, 0]), size: [0.42 * s, 0.6 * s, 0.42 * s] }, { color }, 5);
  cone(out, { ...pose, pos: T([0, 0.5 * s, 0]), size: [0.3 * s, 0.5 * s, 0.3 * s] }, { color: mixRGB(color, [255, 255, 255], 0.1) }, 5);
}

const OCTA_V: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const OCTA_F = [[2, 4, 0], [2, 0, 5], [2, 5, 1], [2, 1, 4], [3, 0, 4], [3, 5, 0], [3, 1, 5], [3, 4, 1]];
/** A rough puff or rock: an octahedron, centred on its pose's position. */
export function octa(out: Tri[], pose: Pose, look: Look | ((face: number) => Look)) {
  emitFaces(out, OCTA_V, OCTA_F, pose, look);
}

const TETRA_V: V3[] = [[0, 1, 0], [0.94, -0.33, 0], [-0.47, -0.33, 0.82], [-0.47, -0.33, -0.82]];
const TETRA_F = [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]];
/** A shard: debris, sparks, lava bombs. */
export function tetra(out: Tri[], pose: Pose, look: Look) {
  emitFaces(out, TETRA_V, TETRA_F, pose, look);
}

/** An icosphere, subdivided `level` times, as unit vertices and faces. Cached per level. */
const icoCache = new Map<number, { v: V3[]; f: number[][] }>();
export function icosphere(level: number) {
  const hit = icoCache.get(level);
  if (hit) return hit;
  const t = (1 + Math.sqrt(5)) / 2;
  let v: V3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((p) => norm(p as V3));
  let f = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let l = 0; l < level; l++) {
    const mid = new Map<string, number>();
    const m = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let i = mid.get(key);
      if (i === undefined) {
        i = v.length;
        v = [...v, norm(scale(add(v[a], v[b]), 0.5))];
        mid.set(key, i);
      }
      return i;
    };
    f = f.flatMap(([a, b, c]) => {
      const ab = m(a, b), bc = m(b, c), ca = m(c, a);
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });
  }
  const out = { v, f };
  icoCache.set(level, out);
  return out;
}

/** An icosphere placed in the world, its vertices pushed out by `radius(dir)`. */
export function sphere(out: Tri[], level: number, pose: Pose, radius: (dir: V3) => number, look: (centreDir: V3, i: number) => Look) {
  const { v, f } = icosphere(level);
  const T = poseFn({ ...pose, size: 1 });
  const s = typeof pose.size === "number" ? pose.size : 1;
  const w = v.map((d) => T(scale(d, radius(d) * s)));
  f.forEach(([a, b, c], i) => {
    const cd = norm(add(add(v[a], v[b]), v[c]));
    out.push({ a: w[a], b: w[b], c: w[c], ...look(cd, i) });
  });
}

// ── Particles ────────────────────────────────────────────────────────────────────────────────────────

/** A ballistic particle: where something thrown from `p0` with velocity `v0` is after `t` seconds. */
export const ballistic = (p0: V3, v0: V3, t: number, gravity = 9.8, drag = 0): V3 => {
  const k = drag > 0 ? (1 - Math.exp(-drag * t)) / drag : t;
  return [p0[0] + v0[0] * k, p0[1] + v0[1] * k - 0.5 * gravity * t * t, p0[2] + v0[2] * k];
};

// ── Camera moves ─────────────────────────────────────────────────────────────────────────────────────

export type Shot = { from: number; to: number; pos: [V3, V3]; target: [V3, V3]; fov?: [number, number]; ease?: (x: number) => number };

const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
export const linear = (x: number) => x;

/** The camera at time t: the shot that holds t, eased from its start to its end pose. Shots cut hard between them. */
export function shotCamera(shots: Shot[], t: number): Camera {
  const s = shots.find((x) => t >= x.from && t < x.to) ?? (t < shots[0].from ? shots[0] : shots[shots.length - 1]);
  const k = (s.ease ?? inOut)(clamp01((t - s.from) / (s.to - s.from)));
  const fov = s.fov ? s.fov[0] + (s.fov[1] - s.fov[0]) * k : 55;
  const lerp = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  return { pos: lerp(...s.pos), target: lerp(...s.target), fov };
}

/** Camera shake: `amount` world units of jitter, smooth enough to read as a rumble rather than noise. */
export function shake(cam: Camera, t: number, amount: number): Camera {
  if (amount <= 0) return cam;
  const j = (seed: number) => (noise2(t * 14, seed) - 0.5) * 2 * amount + (noise2(t * 37, seed + 50) - 0.5) * amount * 0.6;
  const d: V3 = [j(1), j(2), j(3)];
  return { ...cam, pos: add(cam.pos, d), target: add(cam.target, scale(d, 0.6)), roll: (cam.roll ?? 0) + j(4) * 0.01 };
}

/** A pulse that rises at `at` and dies away over `decay` seconds. */
export const pulse = (t: number, at: number, decay: number) => (t < at ? 0 : Math.exp(-(t - at) / decay));

export { smooth, clamp01 };
