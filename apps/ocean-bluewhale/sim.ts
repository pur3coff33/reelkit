// Each shot at reel time t. The surface is y = 0. Everything moves slowly and nothing stops: shots are drawn a little past
// both ends so they can melt into each other. Looking along +z, screen right is −x. The whale is always the subject: big
// in frame, lit kindly, moving at her own pace.
import { add, clamp01, hex, mix3, mixRGB, norm, scale, type Camera, type Env, type Frame, type Glow, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, hash2, octa, rng, smooth, sphere, type Pose } from "../../src/kit/lowpoly/world";
import { bubbles, clouds, halo, jelly, krill, orca, school, seaGrid, seaTop, shafts, specks, streaks, surfaceBelow, whale, whalePoint, type WhaleOpts } from "../../src/kit/lowpoly/ocean";
import type { Grade } from "../../src/kit/whatif/cinema";
import { BREATHS, SHOTS, type ShotName } from "./timeline";

type Set = { tris: Tri[]; glows: Glow[]; behind: Glow[] };
type Scene = { cam: Camera; env: Env };

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const heading = (dir: V3) => ({ yaw: Math.atan2(dir[0], dir[2]), pitch: -Math.asin(dir[1]) });
/** Seconds into a shot. */
const into = (t: number, s: ShotName) => t - SHOTS[s].from;
/** Rises to 1 over [a, b] and falls back to 0 over [c, d]. */
const bump = (a: number, b: number, c: number, d: number, x: number) => smooth(a, b, x) * (1 - smooth(c, d, x));

const SUN = norm([0.25, 1, -0.35] as V3);
const WARM: Env = { skyTop: hex("#7ae4ea"), skyBottom: hex("#0a4c78"), fog: hex("#15689a"), fogNear: 14, fogFar: 84, sun: SUN, sunColor: [196, 230, 224], ambient: [114, 150, 168] };
const COLD: Env = { skyTop: hex("#86d6d0"), skyBottom: hex("#0a4052"), fog: hex("#165a6a"), fogNear: 14, fogFar: 76, sun: SUN, sunColor: [190, 218, 212], ambient: [104, 138, 146] };
const DIM: Env = { skyTop: hex("#3f8fae"), skyBottom: hex("#082f4c"), fog: hex("#10465f"), fogNear: 10, fogFar: 62, sun: SUN, sunColor: [150, 186, 196], ambient: [88, 118, 138] };
const DAY: Env = { skyTop: hex("#2a7ab4"), skyBottom: hex("#a8d0e0"), fog: hex("#96c4d6"), fogNear: 60, fogFar: 250, sun: norm([0.3, 0.8, 0.2] as V3), sunColor: [226, 216, 196], ambient: [114, 126, 140] };
const DUSK: Env = { skyTop: hex("#3d4f8f"), skyBottom: hex("#ffb98c"), fog: hex("#e9a88c"), fogNear: 60, fogFar: 260, sun: norm([-0.12, 0.3, 1] as V3), sunColor: [255, 176, 120], ambient: [104, 100, 132] };
const NIGHT: Env = { skyTop: hex("#06112e"), skyBottom: hex("#2c5180"), fog: hex("#23446e"), fogNear: 60, fogFar: 250, sun: norm([-0.1, 0.5, 1] as V3), sunColor: [120, 150, 200], ambient: [62, 80, 114], stars: 0.9 };
const POLAR: Env = { skyTop: hex("#2f78a8"), skyBottom: hex("#c4dde4"), fog: hex("#a6cad8"), fogNear: 40, fogFar: 240, sun: norm([0.6, 0.35, 0.3] as V3), sunColor: [222, 208, 188], ambient: [114, 128, 144] };

const mixEnv = (a: Env, b: Env, k: number): Env => ({
  ...a,
  skyTop: mixRGB(a.skyTop, b.skyTop, k), skyBottom: mixRGB(a.skyBottom, b.skyBottom, k), fog: mixRGB(a.fog, b.fog, k), sunColor: mixRGB(a.sunColor, b.sunColor, k), ambient: mixRGB(a.ambient, b.ambient, k),
  sun: norm(mix3(a.sun, b.sun, k)), fogNear: lerp(a.fogNear, b.fogNear, k), fogFar: lerp(a.fogFar, b.fogFar, k), stars: lerp(a.stars ?? 0, b.stars ?? 0, k),
});

const BLUE = hex("#5f8196"), PALE = hex("#b4c6c9");
const YOUNG: Partial<WhaleOpts> = { back: hex("#7396aa"), belly: hex("#c2d2d4") };
const GROWN: Partial<WhaleOpts> = { back: BLUE, belly: PALE };
const MALE: Partial<WhaleOpts> = { back: hex("#527288"), belly: hex("#a6babf") };

/** Sideways from a heading: + is to the animal's left. */
const beside = (dir: V3): V3 => norm([dir[2], 0, -dir[0]] as V3);

type WaterOpts = { far?: number; light?: number; at?: V3; depth?: number; flow?: V3; dark?: RGB; bright?: RGB; sun?: V3 };

/** Open sunlit water: the surface overhead, the sun through it, light coming down, specks near and far. */
function water(s: Set, cam: Camera, t: number, o: WaterOpts = {}) {
  const light = o.light ?? 1;
  surfaceBelow(s.tris, cam, t * 0.7, { far: o.far ?? 70, cell: 2.4, dark: o.dark, bright: o.bright });
  shafts(s.tris, o.at ?? [0, 0, 14], t * 0.6, { n: 18, radius: 18, depth: o.depth ?? 34, alpha: 0.085 * light });
  specks(s.tris, cam, t, { n: 170, box: 16, flow: o.flow });
  // A few bigger flecks close to the lens, for depth.
  specks(s.tris, cam, t * 0.8, { n: 26, box: 7, size: 0.03, alpha: 0.35, seed: 5, flow: o.flow });
  // The sun, broken up by the waves overhead.
  const sun = o.sun ?? add([cam.pos[0], 0, cam.pos[2]], [-5, -0.4, 30]);
  halo(s.glows, sun, 20, hex("#bff6ff"), 0.12 * light);
  halo(s.glows, sun, 5 + 0.6 * Math.sin(t * 1.3), hex("#f4feff"), 0.4 * light);
}

// ── At the surface ───────────────────────────────────────────────────────────────────────────────────

/** Splits a triangle along the waterline: the part above it, as a polygon, and the points where the skin meets the water. */
function clipAbove(c: V3[], line: number) {
  const up: V3[] = [], meet: V3[] = [];
  for (let i = 0; i < 3; i++) {
    const a = c[i], b = c[(i + 1) % 3];
    if (a[1] >= line) up.push(a);
    if (a[1] >= line !== b[1] >= line) {
      const p = mix3(a, b, (line - a[1]) / (b[1] - a[1]));
      up.push(p);
      meet.push(p);
    }
  }
  return { up, meet };
}

/** A whale at the surface: the wet back out of the water, the rest seen through it, and foam where the two meet. */
function surfacing(s: Set, pose: Pose, o: WhaleOpts, sea: RGB, o2: { clear?: number; foam?: RGB; bias?: number; froth?: number } = {}) {
  const all: Tri[] = [];
  whale(all, pose, o);
  const line = 0.06, clear = o2.clear ?? 0.55, bias = o2.bias ?? -6, foam = o2.foam ?? hex("#eef8fa");
  const R = rng(3);
  for (const tri of all) {
    const c = [tri.a, tri.b, tri.c];
    const n = c.filter((p) => p[1] >= line).length;
    const zb = (tri.zBias ?? 0) + bias;
    if (n === 3) {
      s.tris.push({ ...tri, zBias: zb, mirror: 0.25 });
      continue;
    }
    if (n === 0) {
      const depth = -(c[0][1] + c[1][1] + c[2][1]) / 3;
      const k = clamp01(depth / 7);
      if (k < 1 && clear > 0) s.tris.push({ ...tri, color: mixRGB(tri.color, sea, 0.3 + 0.55 * k), alpha: clear * (1 - k) ** 1.5, glow: 0.25, zBias: zb + 0.05 });
      continue;
    }
    const { up, meet } = clipAbove(c, line);
    for (let i = 1; i < up.length - 1; i++) s.tris.push({ ...tri, a: up[0], b: up[i], c: up[i + 1], zBias: zb, mirror: 0.25 });
    // Foam: a few flecks where the water slides off the skin.
    for (const p of meet) {
      if (R() > (o2.froth ?? 0.4)) continue;
      const r = 0.12 + 0.22 * R(), q = R() * 6.28;
      s.tris.push({ a: [p[0] + Math.cos(q) * r, line + 0.03, p[2] + Math.sin(q) * r], b: [p[0] + Math.cos(q + 2.1) * r, line + 0.03, p[2] + Math.sin(q + 2.1) * r], c: [p[0] + Math.cos(q + 4.2) * r, line + 0.08, p[2] + Math.sin(q + 4.2) * r], color: foam, glow: 0.5, alpha: 0.4, zBias: zb - 0.1 });
    }
  }
}

/** The breath: a tall soft column that leans away and thins. */
function blow(s: Set, hole: V3, q: number, o: { color?: RGB; size?: number; seed?: number } = {}) {
  if (q < 0 || q > 5) return;
  const R = rng(o.seed ?? 6), size = o.size ?? 1;
  for (let i = 0; i < 110; i++) {
    const born = R() * 0.9, age = q - born, life = 2.2 + 1.8 * R(), rise = 8 * size * (0.35 + 0.65 * R()), a = R() * 6.28, sp = Math.sqrt(R()) * 1.1 * size, r = R();
    if (age < 0 || age > life) continue;
    const k = age / life, h = rise * (1 - Math.exp(-age * 1.7));
    const p: V3 = [hole[0] + Math.cos(a) * sp * (0.2 + k * 1.1) - k * 1.2, Math.max(0.3, hole[1]) + h - k * k * 1.6, hole[2] + Math.sin(a) * sp * (0.2 + k)];
    octa(s.tris, { pos: p, yaw: a, size: (0.16 + 0.3 * r) * (0.6 + 1.5 * k) * size }, { color: o.color ?? hex("#eef7fa"), glow: 0.6, alpha: 0.22 * (1 - k) ** 1.4, zBias: -9 });
  }
}

/** A whale sliding along the surface. Returns where its blowholes are, for the blow. */
function cruise(s: Set, at: V3, dir: V3, o: WhaleOpts, sea: RGB, clear?: number, froth?: number) {
  const pose: Pose = { pos: at, ...heading(dir) };
  surfacing(s, pose, o, sea, { clear, froth });
  return whalePoint(pose, { ...o, beat: 0 }, [0, 0.07, 0.22]);
}

/** A slick the flukes leave on the surface: a smooth oval that fades. */
function slick(s: Set, p: V3, r: number, color: RGB, alpha: number) {
  if (alpha < 0.01) return;
  const N = 12, c: V3 = [p[0], 0.05, p[2]];
  for (let k = 0; k < N; k++) {
    const a = (k / N) * 6.283, b = ((k + 1) / N) * 6.283;
    s.tris.push({ a: c, b: [c[0] + Math.cos(a) * r * 0.7, 0.05, c[2] + Math.sin(a) * r], c: [c[0] + Math.cos(b) * r * 0.7, 0.05, c[2] + Math.sin(b) * r], color, glow: 0.3, alpha, zBias: -3 });
  }
}

// ── Birth and milk ───────────────────────────────────────────────────────────────────────────────────

/** A mother lifting a newborn to the light. Also the last chapter, years on. */
function birthOf(t: number, u: number, s: Set, flip: number): Scene {
  const dir = norm([0.3 * flip, 0.06, 0.9] as V3), h = heading(dir);
  const at = add([-1.4 * flip, -13.2 + 0.06 * u, 21], scale(dir, 0.5 * u));
  whale(s.tris, { pos: at, ...h, roll: 0.1 * flip * Math.sin(t * 0.3) }, { phase: t * 0.9, beat: 0.45, curve: 0.15 * flip, light: t, ...GROWN });
  // The calf above her head, rising to breathe: nose up at first, levelling as it reaches the surface.
  const k = smooth(0, 9.5, u);
  const nose = add(at, add(scale(dir, 7 + 0.15 * u), [0.4 * flip, lerp(3.4, 11.4, k), -2.2]));
  whale(s.tris, { pos: nose, yaw: h.yaw + 0.25 * flip, pitch: lerp(-0.75, -0.22, k), roll: 0.12 * Math.sin(t * 0.9) }, { length: 7, phase: t * 2.4, beat: 0.95, light: t, dapple: 0.7, ...YOUNG });
  bubbles(s.tris, add(nose, [0, 0.6, 0]), t, { n: 8, size: 0.06, rise: 1 });
  const cam: Camera = { pos: [1.2 * flip, -14.4, -5 + 0.12 * u], target: [0.2 * flip, -10.4 + 0.12 * u, 18], fov: 52, roll: 0.012 * Math.sin(t * 0.3) };
  for (const [x, y, z, sz, sd] of [[-7, -6, 30, 0.45, 1], [6, -9, 36, 0.6, 2], [-3, -4, 44, 0.5, 3]]) jelly(s.tris, [x * flip, y + 0.25 * Math.sin(t * 0.5 + sd), z], t, { size: sz, seed: sd });
  school(s.tris, { centre: [8 * flip, -5.5, 40], n: 60, radius: [3.4, 1.2, 2.4], t, seed: 11, size: 0.22, speed: 0.25 });
  water(s, cam, t, { light: 1.3, at: [0, 0, 18] });
  return { cam, env: WARM };
}
const birth = (t: number, s: Set) => birthOf(t, into(t, "birth"), s, 1);
const calf = (t: number, s: Set) => birthOf(t, into(t, "calf"), s, -1);

function milk(t: number, s: Set): Scene {
  const u = into(t, "milk");
  const dir = norm([-0.42, 0, 0.9] as V3), h = heading(dir), side = beside(dir);
  const at = add([3.2, -10.4, 18], scale(dir, 0.6 * u));
  whale(s.tris, { pos: at, ...h, roll: 0.14 }, { phase: t * 0.8, beat: 0.35, light: t, ...GROWN });
  // Tucked in under her, back by the tail.
  const tuck = add(at, add(scale(dir, -1.6 + 0.5 * Math.sin(t * 0.4)), add(scale(side, 1.9), [0, -2.5 + 0.2 * Math.sin(t * 0.6), 0])));
  whale(s.tris, { pos: tuck, yaw: h.yaw - 0.1, pitch: -0.14, roll: -0.25 + 0.06 * Math.sin(t * 0.7) }, { length: 8.5, phase: t * 1.9, beat: 0.6, light: t, ...YOUNG });
  const cam: Camera = { pos: [-0.6 + 0.08 * u, -15.2 + 0.08 * u, -3 + 0.16 * u], target: [0.7, -11.4, 17], fov: 52, roll: -0.015 };
  school(s.tris, { centre: [-6, -7, 34], n: 70, radius: [3.6, 1.4, 2.6], t, seed: 23, size: 0.2, speed: -0.22 });
  jelly(s.tris, [5.5, -8 + 0.2 * Math.sin(t * 0.6), 28], t, { size: 0.5, seed: 4 });
  water(s, cam, t, { light: 1.15 });
  return { cam, env: WARM };
}

// ── From above ───────────────────────────────────────────────────────────────────────────────────────

const SEA_DEEP = hex("#0f4c78"), SEA_LIT = hex("#2f87ad");

/** Mother and calf from high above, gliding up the frame; she rises once to breathe. */
function aerial(t: number, s: Set): Scene {
  const u = into(t, "aerial");
  const z = -4 + 1.3 * u;
  const cam: Camera = { pos: [0.6, 36, z + 1], target: [0.6, 0, z + 3.2], fov: 50, roll: 0.06 + 0.012 * u };
  seaGrid(s.tris, [cam.pos[0], 0, cam.pos[2]], 21, 1.2, t * 0.8, { color: SEA_DEEP, light: SEA_LIT, swell: 0.18 });
  const dir = norm([0.06, 0, 1] as V3);
  const rise = bump(1.6, 3.8, 5.8, 8, u);
  const mum: V3 = [1.2, -2.6 + 1.25 * rise, z + 2];
  const sea = hex("#2f8fb4");
  const hole = cruise(s, mum, dir, { phase: t * 0.9, beat: 0.35, length: 25, ...GROWN }, sea, 0.85, 0.12);
  // The calf at her side, a little behind, in her slipstream.
  cruise(s, add([mum[0], -1.9, mum[2]], [-3.6, 0.15 * Math.sin(t * 0.8), -3.5 + 0.4 * Math.sin(t * 0.35)]), dir, { phase: t * 1.6, beat: 0.6, length: 10, ...YOUNG }, sea, 0.85, 0.12);
  blow(s, hole, t - BREATHS[0][0], { size: 0.9, seed: 4 });
  // Flukeprints: smooth patches she leaves behind, one every few beats.
  for (let k = 0; k < 6; k++) {
    const age = ((u * 0.9 + k) % 6) / 6;
    slick(s, [1.2 + 0.4 * Math.sin(k * 2), 0, mum[2] - 16 - age * 14], 2.6 + 1.6 * age, hex("#4fa6c6"), 0.32 * (1 - age) * smooth(0, 0.08, age));
  }
  return { cam, env: { ...DAY, fogNear: 80, fogFar: 260 } };
}

// ── The long swim ────────────────────────────────────────────────────────────────────────────────────

function swim(t: number, s: Set): Scene {
  const u = into(t, "swim");
  const dir = norm([0.5, 0.02, -0.86] as V3), h = heading(dir), side = beside(dir);
  const at = add([-4.6, -12, 42], scale(dir, 1.8 * u));
  whale(s.tris, { pos: at, ...h, roll: 0.08 * Math.sin(t * 0.3) }, { phase: t * 1.15, beat: 0.6, curve: 0.2 * Math.sin(t * 0.25), light: t, ...GROWN });
  const young = add(at, add(scale(side, 4.2), add(scale(dir, 1.5), [0, 2.4 + 0.3 * Math.sin(t * 0.5), 0])));
  whale(s.tris, { pos: young, ...h, roll: 0.12 * Math.sin(t * 0.5) }, { length: 12, phase: t * 1.7, beat: 0.75, light: t, ...YOUNG });
  // Others making the same journey, far off in the blue.
  whale(s.tris, { pos: add([9, -17, 70], scale(dir, 1.6 * u)), ...h }, { phase: t * 1.1 + 2, beat: 0.5, glow: 0.35, ...GROWN });
  const cam: Camera = { pos: [0.3 * Math.sin(t * 0.18), -13.4, 2], target: [0.2, -10.6, 22], fov: 50, roll: 0.015 * Math.sin(t * 0.2) };
  school(s.tris, { centre: [-5, -8, 22], n: 80, radius: [2.6, 1.0, 2], t, seed: 5, size: 0.2, speed: 0.4, drift: [0.9, 0, 0.2] });
  water(s, cam, t, { at: [0, 0, 16] });
  // The water cools as they go.
  const k = smooth(0, 12, u);
  return { cam, env: { ...WARM, skyTop: mixRGB(WARM.skyTop, COLD.skyTop, k), skyBottom: mixRGB(WARM.skyBottom, COLD.skyBottom, k), fog: mixRGB(WARM.fog, COLD.fog, k) } };
}

// ── The surface, from just above it ──────────────────────────────────────────────────────────────────

function night(t: number, s: Set): Scene {
  const u = into(t, "night");
  const cam: Camera = { pos: [0, 3.2 + 0.12 * Math.sin(t * 0.4), -15 + 0.2 * u], target: [0, 3.8, 20], fov: 52, roll: 0.008 * Math.sin(t * 0.5) };
  seaTop(s.tris, cam, t * 0.6, { color: hex("#14365f"), sky: hex("#9fc4ee"), far: 240, swell: 0.4 });
  clouds(s.tris, cam, { n: 7, seed: 9, color: hex("#5d78a6"), shade: hex("#24365c"), height: [28, 60] });
  const dir = norm([0.55, 0, 0.83] as V3);
  const up = 2.3 * smooth(-0.5, 2.2, u) - 0.7 * smooth(5, 9, u);
  const sea = hex("#1d4373");
  const hole = cruise(s, add([-3.4, -3.45 + up, 9], scale(dir, 1.0 * u)), dir, { phase: t * 0.8, beat: 0.14, back: hex("#5f7ba4"), belly: PALE, glow: 0.12 }, sea, 0.35);
  cruise(s, add([-5.4, -0.5 + 0.3 * Math.sin(u * 0.8), 3.0], scale(dir, 1.05 * u)), dir, { length: 12, phase: t * 1.2, beat: 0.2, back: hex("#6f8cb4"), belly: PALE, glow: 0.12 }, sea, 0.35);
  blow(s, hole, t - BREATHS[1][0], { color: hex("#b9d2f0") });
  const moon = add(cam.pos, [-12, 34, 130]);
  halo(s.behind, moon, 22, hex("#6f98d0"), 0.28);
  halo(s.behind, moon, 4.2, hex("#eef6ff"), 1);
  halo(s.behind, moon, 2.4, hex("#ffffff"), 1);
  return { cam, env: NIGHT };
}

/** A berg: a crag of ice, flat-topped, blue in its shadows. */
function berg(s: Set, p: V3, size: number, seed: number, squash = 0.7) {
  sphere(s.tris, 3, { pos: p, yaw: seed, size }, (d) => {
    const n = fbm(d[0] * 1.7 + seed, d[2] * 1.7 + d[1] * 1.3, 3, seed);
    const r = 1 + 0.5 * n;
    // Flat on top, like the shelf it broke from.
    return d[1] > 0.12 ? Math.min(r, (0.4 + 0.25 * n) / d[1]) : r;
  }, (d, i) => ({ color: mixRGB(hex("#f4fbff"), hex("#5fb2d6"), Math.max(0, 0.42 - d[1] * squash) + 0.14 * hash2(i, seed, 2)), glow: 0.3 }));
}

function ice(t: number, s: Set): Scene {
  const u = into(t, "ice");
  const cam: Camera = { pos: [0, 3.2 + 0.1 * Math.sin(t * 0.4), -15 + 0.25 * u], target: [0, 3.8, 20], fov: 52 };
  seaTop(s.tris, cam, t * 0.5, { color: hex("#2a6880"), sky: hex("#e6f2f2"), far: 220, swell: 0.28 });
  clouds(s.tris, cam, { n: 8, seed: 4, color: hex("#ffffff"), shade: hex("#c3d5e0"), size: 0.75 });
  for (const [x, y, z, r, k] of [[16, 0.5, 46, 11, 3], [-19, 0, 60, 14, 7], [-7, -0.2, 88, 13, 12], [7, -0.4, 30, 3.2, 5], [-10.5, -0.5, 26, 2.4, 9], [28, 0, 110, 22, 15]]) berg(s, [x, y, z], r, k);
  const dir = norm([-0.55, 0, 0.83] as V3);
  const up = 2.3 * smooth(0, 2.6, u) - 0.7 * smooth(5, 9, u);
  const sea = hex("#3a7f92");
  const hole = cruise(s, add([3.6, -3.45 + up, 8], scale(dir, 1.0 * u)), dir, { phase: t * 0.8, beat: 0.14, glow: 0.12, ...GROWN }, sea);
  cruise(s, add([5.6, -0.55 + 0.3 * Math.sin(u * 0.9), 2.6], scale(dir, 1.05 * u)), dir, { length: 14, phase: t * 1.1, beat: 0.18, glow: 0.12, ...YOUNG }, sea);
  blow(s, hole, t - BREATHS[2][0], { seed: 8 });
  return { cam, env: POLAR };
}

// ── Krill ────────────────────────────────────────────────────────────────────────────────────────────

function lunge(t: number, s: Set): Scene {
  const u = into(t, "lunge");
  const cam: Camera = { pos: [-0.4, -11.6 + 0.1 * u, -24 + 0.35 * u], target: [0.2, -11.4 + 0.15 * u, 0], fov: 52, roll: -0.02 };
  const dir = norm([0.5, 0.86, 0.08] as V3);
  const nose = add([0.9, -8.4, 0.5], scale(dir, lerp(-11, 2.5, smooth(-1, 8.5, u))));
  const L = 19;
  const pose: Pose = { pos: add(nose, scale(dir, -L / 2)), ...heading(dir), roll: -0.15 };
  const near = smooth(1.5, 6.5, u);
  whale(s.tris, pose, { length: L, phase: t * 2, beat: 0.75, mouth: 0.82 * near, pouch: 0.25 * smooth(4.5, 8, u), eye: cam.pos, light: t, dapple: 0.35, ...YOUNG });
  krill(s.tris, { centre: [0.9, -7.4, 0.5], radius: [6.2, 5.4, 4], n: 950, t: t * 0.8, size: 0.12, swirl: 0.22, seed: 4 });
  // Her mother feeding further off.
  const d2 = norm([-0.7, 0.2, 0.68] as V3);
  whale(s.tris, { pos: add([6, -15, 34], scale(d2, 1.1 * u)), ...heading(d2) }, { phase: t * 1.1, beat: 0.5, pouch: 0.6, ...GROWN });
  water(s, cam, t, { light: 0.8, dark: hex("#2a8f9c"), bright: hex("#dcfaf2") });
  return { cam, env: COLD };
}

function full(t: number, s: Set): Scene {
  const u = into(t, "full");
  const cam: Camera = { pos: [1.8 - 0.1 * u, -12.2, -18], target: [0.4, -10.6, 4], fov: 52, roll: 0.015 };
  // Throat full, gliding level, then slowly emptying through the baleen.
  const dir = norm([0.62, 0.08, 0.78] as V3);
  const pose: Pose = { pos: add([-3.6, -11.2, 12], scale(dir, 0.7 * u)), ...heading(dir), roll: 0.06 * Math.sin(t * 0.5) };
  const empty = smooth(1.5, 8.5, u);
  const o: WhaleOpts = { phase: t * 1.1, beat: 0.35, mouth: 0.1 * (1 - smooth(-1, 1.2, u)), pouch: lerp(1, 0.2, empty), eye: cam.pos, light: t, dapple: 0.35, ...GROWN };
  whale(s.tris, pose, o);
  krill(s.tris, { centre: [-2.5, -8.5, 4], radius: [7, 5, 5], n: 420, t: t * 0.7, size: 0.1, swirl: 0.2, seed: 4, alpha: 0.9 });
  const lip = whalePoint(pose, { ...o, beat: 0 }, [-0.06, -0.012, 0.14]);
  streaks(s.tris, t, { n: 70, speed: 1.1, reach: 4, len: 0.7, alpha: 0.28 * smooth(0.8, 2, u) * (1 - smooth(6.5, 9, u)), from: (_, r) => add(lip, [(r() - 0.5) * 3.4, (r() - 0.5) * 0.5, (r() - 0.5) * 1.6]), dir: () => [-0.5, -0.25, -0.9] });
  water(s, cam, t, { light: 0.8, dark: hex("#2a8f9c"), bright: hex("#dcfaf2") });
  return { cam, env: COLD };
}

// ── Orcas ────────────────────────────────────────────────────────────────────────────────────────────

/** A pod strung round a circle, each with its own pace and height. */
function pod(s: Set, t: number, o: { n: number; centre: V3; radius: number; turn: number; height?: number; seed?: number; spread?: number }) {
  const R = rng(o.seed ?? 5);
  for (let i = 0; i < o.n; i++) {
    const q = o.turn + (i / o.n) * (o.spread ?? Math.PI * 2) + (R() - 0.5) * 0.4;
    const r = o.radius * (0.9 + 0.25 * R());
    const y = (R() - 0.5) * (o.height ?? 6) + 0.6 * Math.sin(t * 0.5 + i);
    const p: V3 = add(o.centre, [Math.cos(q) * r, y, Math.sin(q) * r]);
    // Nose along the circle.
    orca(s.tris, { pos: p, yaw: Math.atan2(-Math.sin(q), Math.cos(q)), pitch: 0.06 * Math.sin(t * 0.5 + i), roll: 0.12 }, { length: 6 + 1.4 * R(), phase: t * 2.6 + i * 1.3, bull: i === 0 });
  }
}

function pair(s: Set, t: number, at: V3, dir: V3, o: { close?: number; speed?: number; light?: boolean } = {}) {
  const h = heading(dir), side = beside(dir);
  const sp = o.speed ?? 1, light = o.light ? t : undefined;
  whale(s.tris, { pos: at, ...h, roll: 0.05 * Math.sin(t * 0.5) }, { phase: t * 1.2 * sp, beat: 0.65, light, dapple: 0.3, ...GROWN });
  const young = add(at, add(scale(side, o.close ?? 3.4), add(scale(dir, 1.8), [0, 1.9 + 0.2 * Math.sin(t * 0.8), 0])));
  whale(s.tris, { pos: young, ...h, roll: 0.08 * Math.sin(t * 0.7) }, { length: 13, phase: t * 1.9 * sp, beat: 0.85, light, dapple: 0.3, ...YOUNG });
}

function orcas(t: number, s: Set): Scene {
  const u = into(t, "orcas");
  const dir = norm([0.36, 0.02, 0.93] as V3);
  const cam: Camera = { pos: [-1.2, -10.4, -7 + 0.2 * u], target: [0.2, -12.2, 18], fov: 52, roll: 0.012 * Math.sin(t * 0.3) };
  pair(s, t, add([-2.6, -12.6, 20], scale(dir, 0.9 * u)), dir);
  // Shapes coming up out of the murk behind them, overtaking along both sides.
  const R = rng(3);
  for (let i = 0; i < 6; i++) {
    const right = i % 2 ? 1 : -1;
    const d = norm([0.35 - 0.25 * right, 0, 0.9] as V3);
    const p = add([right * (6.2 + 2.2 * R()), -9.2 - 6 * R(), lerp(-12, 2, R())], scale(d, (2.5 + 0.5 * R()) * Math.max(-2, u - 0.4)));
    if (p[2] < cam.pos[2] + 4) continue;
    orca(s.tris, { pos: p, ...heading(d), roll: 0.1 * Math.sin(t + i) }, { length: 6 + 1.2 * R(), phase: t * 2.8 + i, bull: i === 1 });
  }
  water(s, cam, t, { light: 0.6, dark: hex("#1c5f7a"), bright: hex("#a9d5dd") });
  return { cam, env: DIM };
}

function circle(t: number, s: Set): Scene {
  const u = into(t, "circle");
  const dir = norm([0.5, 0, 0.87] as V3);
  const centre: V3 = add([-1.6, -13, 29], scale(dir, 0.4 * u));
  pair(s, t, centre, dir, { close: 2.6 });
  pod(s, t, { n: 7, centre: add(centre, [0, 1, 0]), radius: lerp(13.5, 10.5, smooth(0, 8, u)), turn: 0.6 + u * 0.2, height: 8, seed: 9 });
  const cam: Camera = { pos: [0.6, -6.2 - 0.1 * u, -6 + 0.2 * u], target: [0.1, -13.6, 27], fov: 50, roll: -0.02 };
  water(s, cam, t, { light: 0.5, dark: hex("#1c5f7a"), bright: hex("#a9d5dd") });
  return { cam, env: DIM };
}

function away(t: number, s: Set): Scene {
  const u = into(t, "away");
  // Towards the light and past us; the pod turns back, smaller and smaller.
  const dir = norm([0.4, 0.08, -0.91] as V3);
  const at = add([-4.4, -13.4, 40], scale(dir, 2.2 * u));
  pair(s, t, at, dir, { close: -3.2, speed: 1.35, light: true });
  const R = rng(7);
  for (let i = 0; i < 5; i++) {
    const d = norm([-0.6 - 0.3 * R(), 0.02, 0.75] as V3);
    const p = add([-3 + 9 * (R() - 0.5), -9 - 6 * R(), 44 + 8 * R()], scale(d, 1.6 * u));
    orca(s.tris, { pos: p, ...heading(d) }, { length: 6.4, phase: t * 2.3 + i, bull: i === 0 });
  }
  const cam: Camera = { pos: [0.4, -12.6, 0], target: [0.2, -11.2, 20], fov: 52 };
  const k = smooth(0, 8, u);
  water(s, cam, t, { light: lerp(0.6, 1.15, k) });
  return { cam, env: { ...DIM, skyTop: mixRGB(DIM.skyTop, WARM.skyTop, k), skyBottom: mixRGB(DIM.skyBottom, WARM.skyBottom, k), fog: mixRGB(DIM.fog, WARM.fog, k), ambient: mixRGB(DIM.ambient, WARM.ambient, k), fogFar: lerp(62, 80, k) } };
}

// ── Alone ────────────────────────────────────────────────────────────────────────────────────────────

/** On her own now: one long breath, the back rolling over, the flukes lifting clear, and down. */
function fluke(t: number, s: Set): Scene {
  const u = into(t, "fluke");
  const cam: Camera = { pos: [0.4, 1.9 + 0.1 * Math.sin(t * 0.4), 0 + 0.15 * u], target: [-0.8, 3.6, 22], fov: 52, roll: 0.006 * Math.sin(t * 0.5) };
  seaTop(s.tris, cam, t * 0.6, { color: hex("#255f86"), sky: hex("#d8ecf2"), far: 230, swell: 0.32 });
  clouds(s.tris, cam, { n: 9, seed: 21, color: hex("#ffffff"), shade: hex("#b8cad8"), size: 0.6, dist: [190, 250], height: [26, 60] });
  const yaw = -0.18, L = 24;
  const pitch = 0.06 + 1.22 * smooth(1.4, 6.2, u);
  const dir: V3 = [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const adv = 1.1 * u;
  // The root of the tail: just under the water, then lifted high as she tips forward, then sliding down out of sight.
  const root: V3 = [-1 + Math.sin(yaw) * adv, lerp(-0.8, 3.6, smooth(1.6, 5.2, u)) - 7.5 * smooth(5.4, 8.8, u), 18 + Math.cos(yaw) * adv];
  const pose: Pose = { pos: add(root, scale(dir, L * 0.46)), yaw, pitch };
  const o: WhaleOpts = { length: L, phase: t * 0.7, beat: 0.12, ...GROWN };
  surfacing(s, pose, o, hex("#2f7393"), { clear: 0.45 });
  blow(s, whalePoint(pose, { ...o, beat: 0 }, [0, 0.07, 0.22]), t - BREATHS[3][0], { seed: 14, size: 0.95 });
  // Water pouring off the trailing edge of the flukes while they're up.
  const edge = (k: number) => whalePoint(pose, { ...o, beat: 0 }, [(k - 0.5) * 0.22, 0, 1.03]);
  const up = bump(3.6, 4.6, 6.2, 7.4, u);
  streaks(s.tris, t, { n: 90, speed: 4.5, reach: 4.5, len: 0.9, alpha: 0.55 * up, color: hex("#e9f6fa"), from: (k) => edge((k % 30) / 29), dir: () => [0, -1, -0.05] });
  // The slick where she went down.
  slick(s, [root[0], 0, root[2] - 1], 3 + 1.2 * smooth(6, 9, u), hex("#5f9ab8"), 0.35 * smooth(5.5, 7, u));
  return { cam, env: { ...DAY, sun: norm([0.35, 0.6, -0.7] as V3) } };
}

function alone(t: number, s: Set): Scene {
  const u = into(t, "alone"), k = smooth(0, 8, u);
  const dir = norm([0.14, -0.58, 0.8] as V3);
  const at = add([-0.6, -17.5, 15], scale(dir, 1.25 * u));
  whale(s.tris, { pos: at, ...heading(dir), roll: 0.1 * Math.sin(t * 0.35) }, { length: 21, phase: t * 1.2, beat: 0.85, curve: 0.3 * Math.sin(t * 0.3), light: t, dapple: 0.4 * (1 - k), ...GROWN });
  const cam: Camera = { pos: [0.4, -6.5 - 0.5 * u, -4], target: [0.3, -20 - 0.8 * u, 17], fov: 52, roll: 0.02 * Math.sin(t * 0.25) };
  shafts(s.tris, [0, -3, 10], t * 0.6, { n: 12, radius: 11, depth: 36, alpha: lerp(0.08, 0.02, k) });
  specks(s.tris, cam, t, { n: 210, box: 16, flow: [0.03, 0.35, 0] });
  specks(s.tris, cam, t * 0.8, { n: 26, box: 7, size: 0.03, alpha: 0.3, seed: 5, flow: [0, 0.3, 0] });
  return { cam, env: { ...WARM, skyTop: mixRGB(hex("#2583a6"), hex("#0c3c62"), k), skyBottom: mixRGB(hex("#0a3f66"), hex("#041a34"), k), fog: mixRGB(hex("#0d4f78"), hex("#052342"), k), fogNear: 12, fogFar: lerp(74, 56, k), ambient: mixRGB([108, 146, 168], [86, 118, 152], k) } };
}

// ── The years ────────────────────────────────────────────────────────────────────────────────────────

/** One day turning over her, for all of them: clouds racing, sun down, moon up, dawn. */
function years(t: number, s: Set): Scene {
  const u = into(t, "years");
  const cam: Camera = { pos: [0, 3.3, -15 + 0.2 * u], target: [0, 4.0, 20], fov: 52 };
  const toDusk = smooth(0.6, 3, u), toNight = smooth(3.2, 5.2, u), toDawn = smooth(6.2, 8.6, u);
  const env = mixEnv(mixEnv(mixEnv(DAY, DUSK, toDusk), NIGHT, toNight), DUSK, toDawn);
  const sea = mixRGB(mixRGB(mixRGB(hex("#2a7398"), hex("#34537f"), toDusk), hex("#163a66"), toNight), hex("#3a5a86"), toDawn);
  seaTop(s.tris, cam, t * 0.8, { color: sea, sky: mixRGB(env.skyBottom, [255, 255, 255], 0.15), far: 240, swell: 0.4 });
  const lit = mixRGB(mixRGB(mixRGB(hex("#ffffff"), hex("#ffc39a"), toDusk), hex("#4a6496"), toNight), hex("#ffcfb0"), toDawn);
  clouds(s.tris, cam, { n: 9, seed: 17, color: lit, shade: mixRGB(lit, [40, 50, 90], 0.45), drift: -0.12 * u, spread: 1.8 });
  // The sun goes down on the left as the moon comes up.
  const low = add(cam.pos, [-9, lerp(52, -14, smooth(-1.5, 4, u)), 150]);
  halo(s.behind, low, 34, hex("#ffb27a"), (0.12 + 0.34 * toDusk) * (1 - toNight));
  halo(s.behind, low, 5.5, hex("#fff0d2"), 1 - toNight);
  const moon = add(cam.pos, [14, lerp(8, 52, smooth(3, 9, u)), 140]);
  halo(s.behind, moon, 5, hex("#eef6ff"), toNight * (1 - toDawn));
  const dir = norm([0.55, 0, 0.83] as V3);
  const up = 2.1 * smooth(0, 2.4, u) - 0.6 * smooth(6, 9.5, u);
  const hole = cruise(s, add([-3.6, -3.15 + up, 8], scale(dir, 1.0 * u)), dir, { length: 23, phase: t * 0.8, beat: 0.14, back: hex("#68849f"), belly: PALE, glow: 0.14 }, mixRGB(sea, [120, 160, 190], 0.2), 0.4);
  blow(s, hole, t - BREATHS[4][0], { seed: 12, size: 0.9, color: mixRGB(hex("#eef7fa"), hex("#ffd9bc"), toDusk) });
  return { cam, env };
}

// ── Grown ────────────────────────────────────────────────────────────────────────────────────────────

/** Alongside her, slowly, from the flipper to the eye. */
function eye(t: number, s: Set): Scene {
  const u = into(t, "eye");
  const L = 25;
  const at: V3 = [0, -9.5, 0.9 * u];
  whale(s.tris, { pos: at, yaw: 0, pitch: -0.02, roll: 0.14 + 0.03 * Math.sin(t * 0.3) }, { length: L, phase: t * 0.6, beat: 0.25, light: t, dapple: 0.65, ...GROWN });
  // The eye sits 0.285 of her length ahead of her middle; we drift from her flipper up to it.
  const eyeZ = at[2] + L * 0.285;
  const k = smooth(-1, 8.5, u);
  const look: V3 = [1.2, -9.9 + 0.5 * k, eyeZ - lerp(9, 0.3, k)];
  const cam: Camera = { pos: [lerp(15, 5.6, k), -8.6 - 0.4 * k + 0.25 * Math.sin(t * 0.3), look[2] - lerp(4, 0.9, k)], target: look, fov: 50, roll: 0.01 * Math.sin(t * 0.25) };
  water(s, cam, t, { light: 1.2, at: [0, 0, eyeZ], sun: [4, -0.4, eyeZ + 14] });
  school(s.tris, { centre: [-3, -4.5, eyeZ + 14], n: 50, radius: [3, 1, 2.4], t, seed: 31, size: 0.2, speed: 0.3, alpha: 0.9 });
  return { cam, env: { ...WARM, fogNear: 10, fogFar: 70 } };
}

// ── Song and courtship ───────────────────────────────────────────────────────────────────────────────

/** A male singing as he passes over us, dark against the light. */
function song(t: number, s: Set): Scene {
  const u = into(t, "song");
  const dir = norm([-0.3, 0.03, -0.95] as V3);
  const at = add([2.4, -7 + 0.2 * Math.sin(t * 0.3), 44], scale(dir, 2.4 * u));
  whale(s.tris, { pos: at, ...heading(dir), roll: 0.08 * Math.sin(t * 0.3) }, { length: 25, phase: t * 0.6, beat: 0.4, flap: 0.25, light: t, dapple: 0.3, ...MALE });
  const cam: Camera = { pos: [0.4, -32 + 0.3 * u, 4 + 0.4 * u], target: [0.8, -8 + 0.3 * u, 32 - 1.2 * u], fov: 52, roll: 0.01 * Math.sin(t * 0.2) };
  water(s, cam, t, { light: 0.7, at: [0, 0, 30], depth: 44, sun: [-2, -0.4, 34], bright: hex("#9fe3f0"), dark: hex("#1a6f96") });
  school(s.tris, { centre: [-6, -14, 30], n: 70, radius: [3.2, 1.3, 2.4], t, seed: 7, size: 0.2, speed: 0.25 });
  return { cam, env: { ...DIM, skyTop: hex("#5fc4dc"), fog: hex("#0f4a70"), skyBottom: hex("#06243f"), fogNear: 14, fogFar: 88, ambient: [98, 132, 156] } };
}

/** Two whales turning round a shared line, belly to belly and back. */
function court(t: number, s: Set): Scene {
  const u = into(t, "court");
  const dir = norm([0.34, 0.1, 0.93] as V3), h = heading(dir), side = beside(dir);
  const mid = add([-1.4, -12.6, 22], scale(dir, 0.7 * u));
  const q = 0.5 + u * 0.36;
  for (const [k, o, L] of [[0, GROWN, 26], [Math.PI, MALE, 24]] as const) {
    const off = add(scale(side, Math.cos(q + k) * 4.3), [0, Math.sin(q + k) * 3.5, 0] as V3);
    whale(s.tris, { pos: add(mid, add(off, scale(dir, k ? -2 : 1))), ...h, roll: (k ? 1 : -1) * 0.5 * Math.sin(q) }, { length: L, phase: t * 1.05 + k * 0.4, beat: 0.55, curve: 0.2 * Math.sin(q + k), light: t, ...o });
  }
  const cam: Camera = { pos: [-0.6 + 0.1 * u, -12.4, -6], target: [0.4, -12.4, 22], fov: 52, roll: 0.015 * Math.sin(t * 0.3) };
  water(s, cam, t, { light: 1.15 });
  return { cam, env: WARM };
}

function race(t: number, s: Set): Scene {
  const u = into(t, "race");
  const dir = norm([0.36, 0.03, -0.93] as V3), h = heading(dir), side = beside(dir);
  const at = add([-4.2, -9.6, 54], scale(dir, 3.1 * u));
  whale(s.tris, { pos: at, ...h, roll: 0.06 * Math.sin(t * 0.8) }, { phase: t * 2, beat: 0.85, light: t, ...GROWN });
  whale(s.tris, { pos: add(at, add(scale(side, -5.4), add(scale(dir, -8 + 0.35 * u), [0, -1.8, 0]))), ...h, roll: 0.08 * Math.sin(t * 0.8 + 1) }, { length: 24, phase: t * 2.1 + 1, beat: 0.9, light: t, ...MALE });
  whale(s.tris, { pos: add(at, add(scale(side, 4.6), add(scale(dir, -15 + 0.5 * u), [0, -3.4, 0]))), ...h, roll: 0.08 * Math.sin(t * 0.8 + 2) }, { length: 23, phase: t * 2.2 + 2, beat: 0.95, light: t, back: hex("#648499"), belly: PALE });
  const cam: Camera = { pos: [0.2, -12.4, 0], target: [0.1, -11, 20], fov: 50 };
  water(s, cam, t, { light: 1.1, flow: [0, 0.1, 0.6] });
  return { cam, env: WARM };
}

// ── Dusk ─────────────────────────────────────────────────────────────────────────────────────────────

function dusk(t: number, s: Set): Scene {
  const u = into(t, "dusk");
  const cam: Camera = { pos: [0, 3.3 + 0.12 * Math.sin(t * 0.3), -15 + 0.2 * u], target: [0, 3.9, 20], fov: 52, roll: 0.008 * Math.sin(t * 0.5) };
  seaTop(s.tris, cam, t * 0.6, { color: hex("#34537f"), sky: hex("#ffb48e"), far: 250, swell: 0.4 });
  clouds(s.tris, cam, { n: 9, seed: 30, color: hex("#ffc49a"), shade: hex("#8a5f86"), height: [20, 46], drift: -0.01 * u });
  const dir = norm([0.55, 0, 0.83] as V3);
  const up = 2.3 * smooth(-0.5, 2.4, u) - 1.5 * smooth(6.5, 12, u);
  const sea = hex("#4a5f8a");
  const hole = cruise(s, add([-3.6, -3.45 + up, 8], scale(dir, 0.95 * u)), dir, { phase: t * 0.8, beat: 0.14, back: hex("#8a98b4"), belly: hex("#c9b8b8"), glow: 0.3 }, sea, 0.18);
  cruise(s, add([-5.2, -0.25 + 0.2 * Math.sin(u * 0.7) - 0.6 * smooth(7, 12, u), 2.6], scale(dir, 1.0 * u)), dir, { length: 8, phase: t * 1.3, beat: 0.22, back: hex("#9aa6bf"), belly: hex("#c9b8b8"), glow: 0.3 }, sea, 0.18);
  blow(s, hole, t - BREATHS[5][0], { color: hex("#ffe3cf") });
  const sun = add(cam.pos, [-9, lerp(11, 4.5, smooth(0, 12, u)), 150]);
  halo(s.behind, sun, 40, hex("#ff9a5c"), 0.45);
  halo(s.behind, sun, 10, hex("#ffd9a6"), 0.9);
  halo(s.behind, sun, 4.6, hex("#fff3da"), 1);
  return { cam, env: DUSK };
}

const SCENES: Record<ShotName, (t: number, s: Set) => Scene> = { birth, milk, aerial, swim, night, ice, lunge, full, orcas, circle, away, fluke, alone, years, eye, song, court, race, calf, dusk };

export function shotFrame(shot: ShotName, t: number): Frame {
  const s: Set = { tris: [], glows: [], behind: [] };
  const { cam, env } = SCENES[shot](t, s);
  return { tris: s.tris, camera: cam, env, glowsFront: s.glows, glowsBehind: s.behind };
}

export function shotGrade(shot: ShotName): Grade {
  if (["dusk", "ice", "years", "fluke"].includes(shot)) return { bloom: 0.36, contrast: 1.03, saturate: 1.06, brightness: 1.03 };
  if (shot === "aerial") return { bloom: 0.3, contrast: 1.05, saturate: 1.1, brightness: 1.06 };
  if (shot === "night") return { bloom: 0.5, contrast: 1.02, saturate: 1.05, brightness: 1.18 };
  if (["orcas", "circle", "alone"].includes(shot)) return { bloom: 0.45, contrast: 1.05, saturate: 1.08, brightness: 1.15 };
  if (shot === "song") return { bloom: 0.4, contrast: 1.06, saturate: 1.08, brightness: 1.02 };
  return { bloom: 0.5, contrast: 1.05, saturate: 1.1, brightness: 1.1 };
}
