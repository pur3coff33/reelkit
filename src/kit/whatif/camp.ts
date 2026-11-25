// The outdoors for the What If? camping episodes: terrain from a height field (cached, culled to the camera), water that
// rises over it, forests, dome tents, a campfire, hikers with packs and headlamps, rain, lightning, cloud masses and a
// sea of clouds. 1 unit = 1 metre. Everything is a pure function of its inputs and t, like the rest of the kit.
import { add, clamp01, cross, dot, hex, mix3, mixRGB, norm, scale, smooth, sub, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../lowpoly/engine";
import { box, emitGrid, hash2, makeGrid, noise2, octa, poseFn, rng, sampleGrid, sphere, tetra, vary } from "../lowpoly/world";
import { limb, person, poly, villager, type Look, type Pose as BodyPose } from "../../../apps/typhoon/models";
import { FIRE, FIRE_CORE, FIRE_EDGE, flicker, mistPuff } from "../../../apps/santelmo/models";

export type Field = (x: number, z: number) => number;

// ── Timing helpers ───────────────────────────────────────────────────────────────────────────────────

/** Piecewise-linear lookup, held flat beyond its ends. */
export function track(keys: [number, number][], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return va + ((vb - va) * (t - a)) / (b - a);
    }
  }
  return keys[keys.length - 1][1];
}

/** A lightning flash's brightness at t: a sharp return stroke, a re-strike or two, then gone. */
export function flashAt(t: number, strikes: number[], decay = 0.16) {
  let v = 0;
  for (const s of strikes) {
    const u = t - s;
    if (u < 0 || u > 1.2) continue;
    v = Math.max(v, Math.exp(-u / decay), u > 0.09 && u < 0.32 ? 0.75 * Math.exp(-(u - 0.09) / (decay * 0.7)) : 0);
  }
  return clamp01(v);
}

// ── Terrain ──────────────────────────────────────────────────────────────────────────────────────────

export type Paint = (x: number, z: number, h: number, slope: number, r: number) => RGB;
export type GroundSpec = {
  /** The cache key: the same key must always mean the same spec. */
  key: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  cell: number;
  height: Field;
  paint: Paint;
  /** Drawn this much earlier than its depth: things standing on it sort in front. Defaults to 0.8 cell. */
  zBias?: number;
  seed?: number;
  /** Faces to leave out (where another layer takes over). */
  skip?: (x: number, z: number) => boolean;
};

const groundCache = new Map<string, { tris: Tri[]; centres: V3[] }>();

function buildGround(s: GroundSpec) {
  const nx = Math.round((s.x1 - s.x0) / s.cell), nz = Math.round((s.z1 - s.z0) / s.cell);
  const g = makeGrid(s.x0, s.z0, nx, nz, s.cell, s.seed ?? 1);
  const sm = sampleGrid(g, s.height);
  const tris: Tri[] = [];
  emitGrid(tris, g, sm, (p, q, r, cx, cz) => {
    if (s.skip?.(cx, cz)) return null;
    const a: V3 = [sm.X[p], sm.H[p], sm.Z[p]], b: V3 = [sm.X[q], sm.H[q], sm.Z[q]], c: V3 = [sm.X[r], sm.H[r], sm.Z[r]];
    const n = norm(cross(sub(b, a), sub(c, a)));
    const h = (a[1] + b[1] + c[1]) / 3;
    return { color: s.paint(cx, cz, h, 1 - Math.abs(n[1]), hash2(p * 7 + 1, q * 3 + r, s.seed ?? 1)) };
  });
  const bias = s.zBias ?? s.cell * 0.8;
  for (const t of tris) t.zBias = bias;
  const centres = tris.map((t) => scale(add(add(t.a, t.b), t.c), 1 / 3));
  return { tris, centres };
}

/** Pushes the part of a (static, cached) terrain the camera can see. */
export function ground(out: Tri[], cam: Camera, spec: GroundSpec, far = 700) {
  let c = groundCache.get(spec.key);
  if (!c) groundCache.set(spec.key, (c = buildGround(spec)));
  const f = norm(sub(cam.target, cam.pos));
  const m = spec.cell * 2, far2 = far * far;
  for (let i = 0; i < c.tris.length; i++) {
    const d = sub(c.centres[i], cam.pos);
    if (dot(d, f) < -m || dot(d, d) > far2) continue;
    out.push(c.tris[i]);
  }
}

/** A ground colour by height and slope: grass on the flats, rock on the steep, a little noise to break it up. */
export const paintBy = (o: { flat: RGB; steep: RGB; high?: RGB; highFrom?: number; vary?: number }): Paint => (x, z, h, slope, r) => {
  let c = mixRGB(o.flat, o.steep, smooth(0.25, 0.55, slope));
  if (o.high && o.highFrom !== undefined) c = mixRGB(c, o.high, smooth(o.highFrom, o.highFrom + 40, h + (noise2(x * 0.02, z * 0.02, 4) - 0.5) * 30));
  const k = 1 + (r - 0.5) * 2 * (o.vary ?? 0.07) + (noise2(x * 0.05, z * 0.05, 9) - 0.5) * 0.12;
  return [c[0] * k, c[1] * k, c[2] * k];
};

// ── Water ────────────────────────────────────────────────────────────────────────────────────────────

export type WaterSpec = {
  key: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  cell: number;
  ground: Field;
  /** The water surface height at (x, z) now. */
  level: (x: number, z: number) => number;
  color: (x: number, z: number, depth: number) => RGB;
  alpha?: number;
  mirror?: number;
};

const waterGround = new Map<string, Float32Array>();

/** A water surface over the terrain: faces only where it stands above the ground. */
export function water(out: Tri[], cam: Camera, s: WaterSpec, far = 500) {
  const nx = Math.round((s.x1 - s.x0) / s.cell), nz = Math.round((s.z1 - s.z0) / s.cell), w = nx + 1;
  let G = waterGround.get(s.key);
  if (!G) {
    G = new Float32Array(w * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) G[j * w + i] = s.ground(s.x0 + i * s.cell, s.z0 + j * s.cell);
    waterGround.set(s.key, G);
  }
  const L = new Float32Array(w * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) L[j * w + i] = s.level(s.x0 + i * s.cell, s.z0 + j * s.cell);
  const f = norm(sub(cam.target, cam.pos));
  const far2 = far * far;
  const v = (k: number): V3 => [s.x0 + (k % w) * s.cell, L[k], s.z0 + Math.floor(k / w) * s.cell];
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
      const cx = s.x0 + (i + 0.5) * s.cell, cz = s.z0 + (j + 0.5) * s.cell;
      const dd: V3 = [cx - cam.pos[0], L[a] - cam.pos[1], cz - cam.pos[2]];
      if (dot(dd, f) < -s.cell * 2 || dot(dd, dd) > far2) continue;
      for (const [p, q, r] of (i + j) % 2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]]) {
        const depth = Math.max(L[p] - G[p], L[q] - G[q], L[r] - G[r]);
        if (depth < 0.03) continue;
        out.push({ a: v(p), b: v(q), c: v(r), color: s.color(cx, cz, depth), alpha: s.alpha ?? 0.92, mirror: s.mirror ?? 0.5 });
      }
    }
}

// ── Trees, rocks, grass ──────────────────────────────────────────────────────────────────────────────

const TRUNK = hex("#4e3a2a");

/** A pine: a trunk and three tiers. `lod` 0 is one cone for the far hills. */
export function pine(out: Tri[], base: V3, h: number, color: RGB, lod = 1, sway = 0) {
  if (lod <= 0) {
    out.push(...coneTris(base, [base[0] + sway * h * 0.05, base[1] + h, base[2]], h * 0.3, color, 4));
    return;
  }
  limb(out, base, [base[0], base[1] + h * 0.35, base[2]], h * 0.035, h * 0.025, TRUNK, 4);
  const tiers = [[0.2, 0.55, 0.36], [0.45, 0.4, 0.27], [0.66, 0.34, 0.17]];
  tiers.forEach(([y0, len, rad], k) => {
    const top: V3 = [base[0] + sway * h * 0.06 * (k + 1) * 0.5, base[1] + h * (y0 + len), base[2]];
    out.push(...coneTris([base[0], base[1] + h * y0, base[2]], top, h * rad, mixRGB(color, [255, 255, 255], k * 0.05), 6));
  });
}

function coneTris(base: V3, top: V3, r: number, color: RGB, sides: number): Tri[] {
  const out: Tri[] = [];
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    out.push({ a: top, b: [base[0] + Math.cos(a0) * r, base[1], base[2] + Math.sin(a0) * r], c: [base[0] + Math.cos(a1) * r, base[1], base[2] + Math.sin(a1) * r], color: i % 2 ? color : mixRGB(color, [0, 0, 0], 0.08) });
  }
  return out;
}

/** A broadleaf tree for the tropical forest: a trunk and a few faceted crowns. */
export function leafy(out: Tri[], base: V3, h: number, color: RGB, seed: number, lod = 1, sway = 0) {
  const r = rng(seed);
  const top: V3 = [base[0] + sway * 0.4, base[1] + h * 0.62, base[2]];
  limb(out, base, top, h * 0.035, h * 0.022, TRUNK, lod ? 5 : 3);
  for (let k = 0; k < (lod ? 3 : 1); k++) {
    const g = mixRGB(color, mixRGB(color, [255, 255, 255], 0.18), r());
    octa(out, { pos: [top[0] + (r() - 0.5) * h * 0.3 + sway * 0.6, top[1] + r() * h * 0.2, top[2] + (r() - 0.5) * h * 0.3], yaw: r() * 6, size: [h * (0.22 + r() * 0.08), h * (0.17 + r() * 0.05), h * (0.22 + r() * 0.08)] }, (i) => ({ color: mixRGB(g, [0, 0, 0], (i % 4) * 0.05) }));
  }
}

export type ForestSpec = {
  seed: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  spacing: number;
  /** 0…1: how likely a tree is at (x, z). */
  density: Field;
  ground: Field;
  kind?: "pine" | "leafy" | "mix";
  size?: [number, number];
  palette?: RGB[];
  far?: number;
  sway?: number;
  t?: number;
};

const PINES = ["#2d4a2e", "#264232", "#34522f", "#2b4438"].map(hex);
const LEAVES = ["#2f5a2c", "#3a6a30", "#2a4f2a", "#456f34"].map(hex);

/** Trees scattered on a jittered grid, culled to the camera and simplified with distance. */
export function forest(out: Tri[], cam: Camera, s: ForestSpec) {
  const f = norm(sub(cam.target, cam.pos));
  const far = s.far ?? 320;
  const [lo, hi] = s.size ?? [7, 13];
  for (let j = Math.floor(s.z0 / s.spacing); j <= s.z1 / s.spacing; j++)
    for (let i = Math.floor(s.x0 / s.spacing); i <= s.x1 / s.spacing; i++) {
      const x = (i + 0.2 + hash2(i, j, s.seed) * 0.6) * s.spacing, z = (j + 0.2 + hash2(i, j, s.seed + 1) * 0.6) * s.spacing;
      if (hash2(i, j, s.seed + 2) > s.density(x, z)) continue;
      const d: V3 = [x - cam.pos[0], 0, z - cam.pos[2]];
      const along = d[0] * f[0] + d[2] * f[2];
      const dist = Math.hypot(d[0], d[2]);
      if (along < -12 || dist > far) continue;
      const y = s.ground(x, z) - 0.2;
      const r = hash2(i, j, s.seed + 3);
      const h = lo + (hi - lo) * r;
      const lod = dist < 70 ? 1 : 0;
      const sway = (s.sway ?? 0) * Math.sin((s.t ?? 0) * 1.7 + i * 0.7 + j * 1.3);
      const kind = s.kind === "mix" ? (r < 0.5 ? "pine" : "leafy") : (s.kind ?? "pine");
      const pal = s.palette ?? (kind === "pine" ? PINES : LEAVES);
      const col = pal[Math.floor(hash2(i, j, s.seed + 4) * pal.length)];
      if (kind === "pine") pine(out, [x, y, z], h, col, lod, sway);
      else leafy(out, [x, y, z], h, col, i * 131 + j, lod, sway);
    }
}

/** A boulder. */
export function rock(out: Tri[], p: V3, size: number, seed: number, color: RGB = hex("#7a766e")) {
  const r = rng(seed);
  octa(out, { pos: [p[0], p[1] + size * 0.25, p[2]], yaw: r() * 6, pitch: (r() - 0.5) * 0.4, size: [size * (0.8 + r() * 0.4), size * (0.45 + r() * 0.25), size * (0.7 + r() * 0.4)] }, (i) => ({ color: vary(color, seed * 9 + i, 0.12) }));
}

/** Grass tufts near the camera, leaning with the wind. */
export function grass(out: Tri[], cam: Camera, o: { x0: number; z0: number; x1: number; z1: number; step: number; ground: Field; where?: (x: number, z: number) => boolean; color: RGB; height?: number; wind?: number; t?: number; near?: number; seed?: number }) {
  const near = o.near ?? 18;
  const f = norm(sub(cam.target, cam.pos));
  const cx = cam.pos[0] + f[0] * near * 0.5, cz = cam.pos[2] + f[2] * near * 0.5;
  const x0 = Math.max(o.x0, cx - near), x1 = Math.min(o.x1, cx + near), z0 = Math.max(o.z0, cz - near), z1 = Math.min(o.z1, cz + near);
  const H = o.height ?? 0.5;
  for (let z = Math.ceil(z0 / o.step) * o.step; z < z1; z += o.step)
    for (let x = Math.ceil(x0 / o.step) * o.step; x < x1; x += o.step) {
      const hx = x + (hash2(x * 10, z * 10, o.seed ?? 2) - 0.5) * o.step, hz = z + (hash2(x * 10, z * 10, (o.seed ?? 2) + 1) - 0.5) * o.step;
      if (o.where && !o.where(hx, hz)) continue;
      const d: V3 = [hx - cam.pos[0], 0, hz - cam.pos[2]];
      if (d[0] * f[0] + d[2] * f[2] < 0.5 || Math.hypot(d[0], d[2]) > near) continue;
      const y = o.ground(hx, hz);
      const r = hash2(x * 3, z * 3, 5);
      const bend = (o.wind ?? 0) * (0.6 + 0.4 * Math.sin((o.t ?? 0) * 5 + hx * 0.8 + hz * 0.3));
      const c = mixRGB(o.color, mixRGB(o.color, [255, 240, 180], 0.25), r);
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + r * 6, hh = H * (0.6 + 0.6 * hash2(x, z, k));
        const b0: V3 = [hx + Math.cos(a) * 0.06, y, hz + Math.sin(a) * 0.06];
        out.push({ a: b0, b: [b0[0] + Math.cos(a + 1.6) * 0.06, y, b0[2] + Math.sin(a + 1.6) * 0.06], c: [b0[0] + Math.cos(a) * 0.12 + bend * hh * 0.7, y + hh * (1 - Math.abs(bend) * 0.3), b0[2] + Math.sin(a) * 0.12], color: c });
      }
    }
}

// ── Camp ─────────────────────────────────────────────────────────────────────────────────────────────

export type TentOpts = {
  color?: RGB;
  w?: number;
  d?: number;
  h?: number;
  /** 0…1: a lamp on inside. */
  lit?: number;
  /** 0…1: flattened. */
  collapse?: number;
  /** 0…1: the fabric flapping in wind. */
  flap?: number;
  t?: number;
  roll?: number;
  pitch?: number;
};

/** A two-pole dome tent, door facing +z at yaw 0. */
export function domeTent(out: Tri[], glows: Glow[], pos: V3, yaw: number, o: TentOpts = {}) {
  const { color = hex("#e2672e"), w = 2.2, d = 2.0, h = 1.25, lit = 0, collapse = 0, flap = 0, t = 0 } = o;
  const T = poseFn({ pos, yaw, roll: o.roll, pitch: o.pitch });
  const N = 8;
  const rings: [number, number][] = [[0, 1], [0.5, 0.93], [0.84, 0.58], [1, 0]];
  const hh = h * (1 - 0.8 * collapse);
  const v = (ri: number, i: number): V3 => {
    const [hy, rr] = rings[ri];
    const a = (i / N) * Math.PI * 2 + Math.PI / N;
    const wob = flap * 0.09 * Math.sin(t * 13 + i * 1.9 + ri * 2.3) * hy + collapse * 0.35 * hy * Math.sin(i * 2.7);
    return T([Math.cos(a) * (w / 2) * rr * (1 + collapse * 0.25 * hy), hy * hh + wob, Math.sin(a) * (d / 2) * rr * (1 + collapse * 0.2 * hy)]);
  };
  const warm: RGB = [255, 214, 160];
  const fabric = lit > 0 ? mixRGB(color, warm, 0.4 * lit) : color;
  for (let ri = 0; ri < rings.length - 1; ri++)
    for (let i = 0; i < N; i++) {
      const mid = ((i + 0.5) / N) * Math.PI * 2 + Math.PI / N;
      const door = ri < 2 && Math.sin(mid) > 0.85;
      const c = door ? mixRGB(fabric, [20, 20, 24], 0.35) : i % 2 ? fabric : mixRGB(fabric, [0, 0, 0], 0.1);
      const look = { color: c, glow: lit * 0.85 };
      const a = v(ri, i), b = v(ri, i + 1), cc = v(ri + 1, i + 1), dd = v(ri + 1, i);
      out.push({ a, b, c: cc, ...look }, { a, b: cc, c: dd, ...look });
    }
  // The poles: two arcs crossing over the top.
  if (collapse < 0.5)
    for (const k of [0, 2]) {
      const arc = [v(0, k), v(1, k), v(2, k), v(3, 0), v(2, k + 4), v(1, k + 4), v(0, k + 4)];
      for (let i = 0; i < arc.length - 1; i++) limb(out, arc[i], arc[i + 1], 0.018, 0.018, hex("#2a2c30"), 3, { zBias: -0.05 });
    }
  if (lit > 0.02) glows.push({ p: T([0, hh * 0.45, 0]), radius: Math.max(w, d) * 1.1, color: warm, alpha: 0.32 * lit });
}

/** A campfire: a ring of stones, a teepee of logs, flames, sparks, and the light it throws. `strength` 0 is out. */
export function campfire(out: Tri[], glows: Glow[], lights: PointLight[], pos: V3, t: number, o: { strength?: number; seed?: number; size?: number } = {}) {
  const s = o.strength ?? 1, k = o.size ?? 1, seed = o.seed ?? 0;
  const r = rng(seed + 3);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.3;
    octa(out, { pos: [pos[0] + Math.cos(a) * 0.55 * k, pos[1] + 0.07 * k, pos[2] + Math.sin(a) * 0.55 * k], yaw: r() * 6, size: [0.16 * k, 0.11 * k, 0.13 * k] }, { color: vary(hex("#6e6a64"), i + seed, 0.15) });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    limb(out, [pos[0] + Math.cos(a) * 0.42 * k, pos[1] + 0.04, pos[2] + Math.sin(a) * 0.42 * k], [pos[0] + Math.cos(a) * 0.05 * k, pos[1] + 0.5 * k, pos[2] + Math.sin(a) * 0.05 * k], 0.06 * k, 0.045 * k, s > 0.05 ? hex("#4a3424") : hex("#1e1a18"), 4, { glow: s * 0.12 });
  }
  if (s <= 0.01) return;
  const f = flicker(t, seed);
  octa(out, { pos: [pos[0], pos[1] + 0.05, pos[2]], size: [0.3 * k, 0.06 * k, 0.3 * k] }, { color: hex("#ff5a1a"), glow: 1 });
  for (let i = 0; i < 8; i++) {
    const rr = rng(i * 13 + seed * 5 + 1);
    const life = 0.42 + rr() * 0.35;
    const a = ((t + rr() * 2) % life) / life;
    const ang = rr() * Math.PI * 2;
    const rad = 0.2 * k * (1 - a);
    const p: V3 = [pos[0] + Math.cos(ang) * rad, pos[1] + (0.12 + a * 0.75 * s) * k, pos[2] + Math.sin(ang) * rad];
    tetra(out, { pos: p, yaw: ang + t * 2, size: [0.17 * k * (1 - a * 0.7) * s, 0.4 * k * (1 - a * 0.5) * s, 0.17 * k * (1 - a * 0.7) * s] }, { color: a < 0.3 ? FIRE_CORE : a < 0.65 ? FIRE : FIRE_EDGE, glow: 1, alpha: 0.92 * (1 - a * 0.6) });
  }
  for (let i = 0; i < 7; i++) {
    const rr = rng(i * 29 + seed * 3 + 7);
    const life = 1.2 + rr() * 0.8;
    const a = ((t + rr() * 3) % life) / life;
    const p: V3 = [pos[0] + (rr() - 0.5) * 0.4 + Math.sin(t * 3 + i) * a * 0.3, pos[1] + 0.4 * k + a * 2.6 * k, pos[2] + (rr() - 0.5) * 0.4];
    tetra(out, { pos: p, yaw: t * 4 + i, size: 0.025 * k }, { color: FIRE_CORE, glow: 1, alpha: s * (1 - a) });
  }
  const c: V3 = [pos[0], pos[1] + 0.4 * k, pos[2]];
  glows.push({ p: c, radius: 1.3 * k, color: [255, 170, 80], alpha: 0.6 * s * f }, { p: c, radius: 6 * k, color: [255, 110, 40], alpha: 0.15 * s * f });
  lights.push({ p: c, color: [255, 150, 70], intensity: 1.8 * s * f, range: 12 * k });
}

/** A camping lantern: hung or set down. */
export function lantern(out: Tri[], glows: Glow[], lights: PointLight[], p: V3, on = 1) {
  octa(out, { pos: p, size: [0.07, 0.12, 0.07] }, { color: on > 0.05 ? hex("#fff0c8") : hex("#8a8a84"), glow: on });
  octa(out, { pos: [p[0], p[1] + 0.13, p[2]], size: [0.06, 0.03, 0.06] }, { color: hex("#2a2c30") });
  if (on <= 0.02) return;
  glows.push({ p, radius: 0.9, color: [255, 226, 170], alpha: 0.6 * on }, { p, radius: 4, color: [255, 200, 130], alpha: 0.12 * on });
  lights.push({ p, color: [255, 220, 170], intensity: 1.1 * on, range: 7 });
}

// ── People ───────────────────────────────────────────────────────────────────────────────────────────

const JACKETS = ["#d8462c", "#2e6fb4", "#f0b43a", "#3f8f5a", "#7a4ab0", "#e86a9a", "#2b2f36", "#e0dccc"].map(hex);
const PACKS = ["#2c3e57", "#6a3a2a", "#3d4a2c", "#1f2226", "#8a2f2f"].map(hex);

let VIEW: V3 | null = null;
/** Where the camera is this frame, so headlamps facing away from it don't shine through heads. */
export const setView = (cam: Camera) => void (VIEW = cam.pos);

/** A camper: a villager in hiking gear. */
export function hikerLook(seed: number, kind: "man" | "woman" | "child" = "man", jacket?: RGB): Look {
  const base = villager(seed, kind);
  return { ...base, top: jacket ?? JACKETS[seed % JACKETS.length], bottom: hex(seed % 2 ? "#2b2f36" : "#3a3f2e"), shorts: false, skirt: false, shoes: hex("#3a2e26"), cap: seed % 3 === 0 ? hex("#2b2f36") : undefined };
}
export const packColor = (seed: number) => PACKS[seed % PACKS.length];

type PoseBits = Omit<BodyPose, "pos" | "yaw">;
/** Sitting on a log or a rock about 0.45 m high. */
export const SIT_LOG: PoseBits = { drop: 0.48, footL: [-0.13, 0.04, 0.42], footR: [0.13, 0.04, 0.42], handL: [-0.17, 0.52, 0.36], handR: [0.17, 0.52, 0.36] };
/** Sitting on the ground, knees up. */
export const SIT_GROUND: PoseBits = { drop: 0.7, footL: [-0.16, 0.04, 0.42], footR: [0.16, 0.04, 0.42], handL: [-0.1, 0.45, 0.42], handR: [0.13, 0.45, 0.42] };
/** Crouched, reaching forward. */
export const CROUCH: PoseBits = { drop: 0.5, lean: 0.14, footL: [-0.14, 0.03, 0.12], footR: [0.18, 0.03, -0.2], handL: [-0.06, 0.42, 0.5], handR: [0.1, 0.4, 0.42] };
/** Hugging their knees, cold: sitting, arms wrapped round. */
export const HUDDLE: PoseBits = { drop: 0.72, lean: 0.12, footL: [-0.1, 0.04, 0.3], footR: [0.1, 0.04, 0.3], handL: [0.05, 0.5, 0.36], handR: [-0.05, 0.52, 0.36], headPitch: 0.25 };
/** Walking or running: a stride at `speed` m/s. */
export const stride = (t: number, speed: number, seed = 0): PoseBits => ({ walk: speed > 2.5 ? 1.35 : 1, phase: t * (speed > 2.5 ? 9.5 : 4.2) + seed, lean: speed > 2.5 ? 0.16 : 0.03 });

/** A person's yaw to face from `p` towards `q`. */
export const facing = (p: V3, q: V3) => Math.atan2(q[0] - p[0], q[2] - p[2]);

/** Where a person's head is, for a pose (the same sums as typhoon's person()). */
export function headOf(L: Look, P: BodyPose): V3 {
  const H = L.height / 1.7;
  const T = poseFn({ pos: P.pos, yaw: P.yaw });
  return T([0, 0.92 * H - (P.drop ?? 0) + 0.685 * H, (P.lean ?? 0) * 1.1 + 0.01]);
}

/** A person, with a pack on their back and a headlamp if asked. Returns where the lamp is. */
export function camper(out: Tri[], glows: Glow[], L: Look, P: BodyPose, o: { pack?: RGB; lamp?: number; shiver?: number; t?: number } = {}) {
  const sh = (o.shiver ?? 0) * 0.012 * Math.sin((o.t ?? 0) * 70);
  const pose = sh ? { ...P, pos: [P.pos[0] + sh, P.pos[1], P.pos[2]] as V3 } : P;
  person(out, L, pose);
  const H = L.height / 1.7, lean = P.lean ?? 0, drop = P.drop ?? 0;
  const T = poseFn({ pos: pose.pos, yaw: P.yaw });
  if (o.pack) {
    const y = 0.92 * H - drop + 0.08 * H;
    // Tilted with the lean, sitting on the back: a main bag and a rolled mat on top.
    const pitch = -Math.atan2(lean, 0.55 * H);
    box(out, { pos: T([0, y, lean * 0.35 - 0.2 * H]), yaw: P.yaw, pitch, size: [0.32 * H, 0.5 * H, 0.2 * H] }, (i) => ({ color: mixRGB(o.pack!, [0, 0, 0], (i % 3) * 0.08) }));
    limb(out, T([-0.2 * H, y + 0.55 * H, lean * 0.55 - 0.2 * H]), T([0.2 * H, y + 0.55 * H, lean * 0.55 - 0.2 * H]), 0.06 * H, 0.06 * H, mixRGB(o.pack!, [255, 255, 255], 0.35), 6);
  }
  const head = headOf(L, pose);
  if (o.lamp && o.lamp > 0.02) {
    const fwd = T([0, 0.92 * H - drop + 0.7 * H, lean * 1.1 + 0.12 * H]);
    const ahead = sub(T([0, 0, 1]), T([0, 0, 0]));
    const away = VIEW ? dot(ahead, sub(VIEW, fwd)) < 0 : false;
    if (away) {
      glows.push({ p: add(fwd, scale(ahead, 0.6)), radius: 0.9, color: [220, 235, 255], alpha: 0.1 * o.lamp });
      return fwd;
    }
    glows.push({ p: fwd, radius: 0.13, color: [255, 250, 230], alpha: 0.85 * o.lamp }, { p: fwd, radius: 0.8, color: [220, 235, 255], alpha: 0.12 * o.lamp });
    return fwd;
  }
  return head;
}

// ── Weather ──────────────────────────────────────────────────────────────────────────────────────────

/** Rain streaks in a box around the camera, so there is always rain in shot however the camera moves. */
export function rain(out: Tri[], cam: Camera, t: number, o: { amount: number; wind?: number; seed?: number; color?: RGB; speed?: number; len?: number; box?: number; alpha?: number }) {
  if (o.amount <= 0) return;
  const n = Math.round(900 * o.amount);
  const f = norm(sub(cam.target, cam.pos));
  const right = norm(cross(f, [0, 1, 0]));
  const B = o.box ?? 22;
  const C = add(cam.pos, scale(f, B * 0.5));
  const sp = o.speed ?? 16, wind = o.wind ?? 0.15, L = o.len ?? 1.1;
  const dir = norm([wind, -1, wind * 0.3]);
  const wrap = (v: number, c: number) => c - B / 2 + ((((v - (c - B / 2)) % B) + B) % B);
  const col = o.color ?? hex("#c8d4e0");
  const r = rng(o.seed ?? 77);
  for (let i = 0; i < n; i++) {
    const fall = t * sp * (0.9 + r() * 0.2);
    const p: V3 = [wrap(r() * B * 7 + fall * dir[0], C[0]), wrap(r() * B * 7 + fall * dir[1], C[1]), wrap(r() * B * 7 + fall * dir[2], C[2])];
    const d = sub(p, cam.pos);
    if (dot(d, f) < 0.6) continue;
    const b = add(p, scale(dir, L));
    out.push({ a: p, b, c: add(p, scale(right, 0.02)), color: col, alpha: o.alpha ?? 0.3, glow: 0.35, zBias: -0.2 });
  }
}

/** A lightning bolt from cloud to ground: a jagged main channel and a few forks, glowing. */
export function bolt(out: Tri[], glows: Glow[], from: V3, to: V3, seed: number, o: { width?: number; alpha?: number; forks?: number; color?: RGB } = {}) {
  const a0 = o.alpha ?? 1;
  if (a0 <= 0.02) return;
  const r = rng(seed);
  const len = Math.hypot(...(sub(to, from) as [number, number, number]));
  const w = o.width ?? len * 0.0035;
  const col = o.color ?? hex("#eef0ff");
  const chain = (a: V3, b: V3, n: number, jag: number, wd: number, alpha: number) => {
    const pts: V3[] = [a];
    for (let k = 1; k < n; k++) {
      const p = mix3(a, b, k / n);
      pts.push([p[0] + (r() - 0.5) * jag, p[1] + (r() - 0.5) * jag * 0.3, p[2] + (r() - 0.5) * jag]);
    }
    pts.push(b);
    for (let k = 0; k < pts.length - 1; k++) limb(out, pts[k], pts[k + 1], wd, wd, col, 3, { glow: 1, alpha });
    return pts;
  };
  const main = chain(from, to, 16, len * 0.09, w, a0);
  for (let k = 0; k < main.length; k += 3) glows.push({ p: main[k], radius: w * 40, color: [190, 200, 255], alpha: 0.4 * a0 });
  glows.push({ p: to, radius: w * 90, color: [220, 225, 255], alpha: 0.6 * a0 });
  for (let k = 0; k < (o.forks ?? 4); k++) {
    const i = 2 + Math.floor(r() * (main.length - 6));
    const s = main[i];
    const e: V3 = [s[0] + (r() - 0.5) * len * 0.35, s[1] - len * (0.12 + r() * 0.15), s[2] + (r() - 0.5) * len * 0.35];
    chain(s, e, 6, len * 0.05, w * 0.55, a0 * 0.8);
  }
}

/** A heap of cloud: lumpy spheres, flat underneath. `inner` 0…1 lights it from within (lightning inside it). */
export function cloudMass(out: Tri[], c: V3, size: number, seed: number, color: RGB, o: { alpha?: number; inner?: number; puffs?: number; flat?: number; t?: number } = {}) {
  const r = rng(seed);
  const n = o.puffs ?? 9;
  const glowCol: RGB = [214, 210, 255];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, rr = r() * size * 0.9;
    const s = size * (0.45 + r() * 0.45);
    const p: V3 = [c[0] + Math.cos(a) * rr, c[1] + r() * size * 0.5 + (o.t ?? 0) * 0.3 * r(), c[2] + Math.sin(a) * rr * 0.7];
    const lit = (o.inner ?? 0) * (0.4 + 0.6 * r());
    sphere(out, 1, { pos: p, yaw: r() * 6 }, (d) => s * (1 + 0.2 * (noise2(d[0] * 2 + seed, d[2] * 2 + i, 3) - 0.5)) * (d[1] < -0.2 ? 1 - (o.flat ?? 0.5) * (-0.2 - d[1]) : 1), (d) => ({ color: mixRGB(mixRGB(color, [0, 0, 0], d[1] < 0 ? 0.25 : 0), glowCol, lit), alpha: o.alpha ?? 1, glow: lit }));
  }
}

/** A sea of clouds: flattened puffs on a grid at height `y`, near the camera only. */
export function cloudSea(out: Tri[], cam: Camera, o: { y: number; x0: number; z0: number; x1: number; z1: number; spacing: number; color: RGB; alpha?: number; t?: number; seed?: number; far?: number; drift?: number; lift?: Field }) {
  const f = norm(sub(cam.target, cam.pos));
  const far = o.far ?? 900;
  for (let j = Math.floor(o.z0 / o.spacing); j <= o.z1 / o.spacing; j++)
    for (let i = Math.floor(o.x0 / o.spacing); i <= o.x1 / o.spacing; i++) {
      const r = hash2(i, j, o.seed ?? 31);
      const x = (i + r) * o.spacing + (o.t ?? 0) * (o.drift ?? 0), z = (j + hash2(i, j, 32)) * o.spacing;
      const d: V3 = [x - cam.pos[0], o.y - cam.pos[1], z - cam.pos[2]];
      const dist = Math.hypot(d[0], d[2]);
      if (dot(d, f) < -o.spacing || dist > far) continue;
      const s = o.spacing * (0.7 + r * 0.5);
      const y = o.y + (noise2(i * 0.3, j * 0.3, 5) - 0.5) * o.spacing * 0.5 + (o.lift?.(x, z) ?? 0);
      sphere(out, dist < far * 0.4 ? 1 : 0, { pos: [x, y, z], yaw: r * 6, size: 1 }, (dd) => s * (dd[1] > 0 ? 0.42 + 0.12 * noise2(dd[0] * 3 + i, dd[2] * 3 + j, 2) : 0.18), (dd) => ({ color: mixRGB(o.color, [0, 0, 0], dd[1] > 0.5 ? 0 : 0.06), alpha: o.alpha ?? 1 }));
    }
}

/** A thin thread of smoke drifting from `p` along `dir`, curling as it goes. */
export function wisp(out: Tri[], p: V3, dir: V3, t: number, o: { n?: number; len?: number; alpha?: number; color?: RGB; seed?: number } = {}) {
  const n = o.n ?? 16, len = o.len ?? 3, seed = o.seed ?? 1;
  for (let i = 0; i < n; i++) {
    const k = ((i / n + t * 0.18) % 1);
    const curl = Math.sin(k * 9 + t * 1.3 + seed) * 0.25 * k;
    const q: V3 = [p[0] + dir[0] * len * k + curl, p[1] + dir[1] * len * k + Math.sin(k * 6 + seed) * 0.1, p[2] + dir[2] * len * k - curl * 0.6];
    octa(out, { pos: q, yaw: k * 5 + seed, size: [0.06 + k * 0.22, 0.04 + k * 0.1, 0.06 + k * 0.2] }, { color: o.color ?? hex("#b8b4ac"), alpha: (o.alpha ?? 0.22) * Math.sin(k * Math.PI) });
  }
}

/** Low mist in the trees. */
export function mist(out: Tri[], cam: Camera, o: { x0: number; z0: number; x1: number; z1: number; spacing: number; ground: Field; color: RGB; alpha: number; t: number; seed?: number; height?: number }) {
  const f = norm(sub(cam.target, cam.pos));
  for (let j = Math.floor(o.z0 / o.spacing); j <= o.z1 / o.spacing; j++)
    for (let i = Math.floor(o.x0 / o.spacing); i <= o.x1 / o.spacing; i++) {
      const x = (i + hash2(i, j, o.seed ?? 3)) * o.spacing + o.t * 0.25, z = (j + hash2(i, j, 4)) * o.spacing;
      const d: V3 = [x - cam.pos[0], 0, z - cam.pos[2]];
      const dist = Math.hypot(d[0], d[2]);
      if (d[0] * f[0] + d[2] * f[2] < 2 || dist > 60) continue;
      const near = smooth(2, 6, dist) * (1 - smooth(40, 60, dist));
      mistPuff(out, [x, o.ground(x, z) + (o.height ?? 1.2), z], 2.4 + hash2(i, j, 5) * 2, o.alpha * near, i * 7 + j, o.color);
    }
}

// ── Light ────────────────────────────────────────────────────────────────────────────────────────────

export const MOON = norm([0.3, 0.7, -0.5]);
export const ENV = {
  dusk: { skyTop: hex("#1c2a55"), skyBottom: hex("#e88a5a"), fog: hex("#5a4a5a"), fogNear: 60, fogFar: 900, sun: norm([-0.7, 0.18, 0.6]), sunColor: [255, 170, 120], ambient: [82, 82, 108] } as Env,
  night: { skyTop: hex("#050a18"), skyBottom: hex("#18223e"), fog: hex("#0e1426"), fogNear: 30, fogFar: 520, sun: MOON, sunColor: [70, 84, 120], ambient: [34, 40, 62], stars: 0.75 } as Env,
  forestNight: { skyTop: hex("#03060e"), skyBottom: hex("#0c1424"), fog: hex("#070b14"), fogNear: 8, fogFar: 70, sun: MOON, sunColor: [44, 54, 84], ambient: [20, 26, 42], stars: 0.4 } as Env,
  storm: { skyTop: hex("#2a3038"), skyBottom: hex("#5a6068"), fog: hex("#4e545c"), fogNear: 10, fogFar: 160, sun: norm([0.2, 0.9, 0.2]), sunColor: [90, 96, 106], ambient: [86, 92, 102] } as Env,
  stormNight: { skyTop: hex("#06080c"), skyBottom: hex("#141a22"), fog: hex("#0c1016"), fogNear: 6, fogFar: 90, sun: MOON, sunColor: [40, 46, 60], ambient: [26, 30, 40] } as Env,
  dawn: { skyTop: hex("#4a6a9a"), skyBottom: hex("#f2c49a"), fog: hex("#b8b0b0"), fogNear: 40, fogFar: 700, sun: norm([0.7, 0.2, -0.5]), sunColor: [255, 196, 150], ambient: [100, 104, 122] } as Env,
  sunrise: { skyTop: hex("#2e4a86"), skyBottom: hex("#ffb07a"), fog: hex("#f0b890"), fogNear: 200, fogFar: 2600, sun: norm([0.2, 0.14, 1]), sunColor: [255, 190, 130], ambient: [104, 100, 124] } as Env,
  day: { skyTop: hex("#4a86c8"), skyBottom: hex("#d8e6ee"), fog: hex("#c4d2da"), fogNear: 80, fogFar: 1400, sun: norm([0.4, 0.75, 0.3]), sunColor: [255, 240, 214], ambient: [104, 116, 132] } as Env,
};

/** An env with lightning washed through it. */
export function lightning(env: Env, k: number, tone: RGB = [196, 204, 255]): Env {
  if (k <= 0.01) return env;
  return { ...env, skyTop: mixRGB(env.skyTop, tone, k * 0.55), skyBottom: mixRGB(env.skyBottom, tone, k * 0.7), fog: mixRGB(env.fog, tone, k * 0.4), ambient: mixRGB(env.ambient, tone, k * 0.8), sunColor: mixRGB(env.sunColor, tone, k) };
}

/** The moon on the sky, for glowsBehind. */
export const moonGlow = (cam: Camera, dir: V3 = MOON, a = 0.85): Glow[] => {
  const p = add(cam.pos, scale(dir, 900));
  return [{ p, radius: 26, color: [220, 226, 240], alpha: a }, { p, radius: 140, color: [120, 140, 190], alpha: 0.1 * a }];
};

export { poly, limb, clamp01, smooth };
