// The santelmo world: a barrio holding its fiesta at the north end, rice paddies cut by dikes (pilapil) south of it, an
// irrigation ditch crossed by a bamboo bridge, and a river at the far south. The girl walks the main dike (x = 0) from
// the barrio towards the river; the light floats ahead of her. Everything is a function of t, in seconds.
import { add, hex, mixRGB, norm, scale, smooth, sub, type Camera, type Env, type Frame, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, hash2, makeGrid, noise2, rng, sampleGrid, vary } from "../../src/kit/lowpoly/world";
import { bambooClump, banderitas, bridge, girl, kubo, mistPuff, palm, panakot, santelmo, stringLights, tsinelas, tuft, type GirlPose, type Santelmo } from "./models";
import { CUES, SCENES, SHOTS, type SceneName } from "./timeline";

// ── Ground ───────────────────────────────────────────────────────────────────────────────────────────

const DIKE_H = 0.42;
const CANOPY_H = 0.95;
export const DITCH_Z = 10;
const DITCH_HALF = 1.6;
const BRIDGE_SPAN = 4.2;
const BRIDGE_DECK = 0.5;
const WATER_RIVER = -0.35;
const WATER_DITCH = -0.22;
const BANK_FROM = 45.6;

type Kind = "dike" | "rice" | "flood" | "ditch" | "river" | "grass" | "barrio";

const paddyIsRice = (x: number, z: number) => hash2(Math.floor(x / 10), Math.floor((z - 5) / 10), 4) < 0.62;

/** What the ground is at (x, z), and its resting height. */
export function groundAt(x: number, z: number): { kind: Kind; h: number } {
  if (z < -55) return { kind: "barrio", h: 0.5 + fbm(x * 0.08, z * 0.08, 2, 3) * 0.4 };
  if (z > BANK_FROM) {
    let h: number;
    if (z < 55) h = 0.3 + fbm(x * 0.1, z * 0.1, 2, 5) * 0.25;
    else if (z < 77) h = 0.3 - 1.5 * smooth(55, 59, z);
    else h = -1.2 + 1.8 * smooth(77, 81, z) + fbm(x * 0.1, z * 0.1, 2, 6) * 0.3;
    // The bank wanders a little along the river.
    h += 0.35 * Math.sin(x * 0.11) * smooth(54, 57, z) * (1 - smooth(77, 80, z));
    return h <= WATER_RIVER ? { kind: "river", h: WATER_RIVER } : { kind: "grass", h };
  }
  const dz = Math.abs(z - DITCH_Z);
  if (dz < DITCH_HALF) return { kind: "ditch", h: WATER_DITCH };
  if (dz < DITCH_HALF + 0.9) return { kind: "dike", h: 0.12 };
  const dx = Math.abs(x - 10 * Math.round(x / 10));
  const dzz = Math.abs(z - 5 - 10 * Math.round((z - 5) / 10));
  const path = Math.abs(x) < 1.25;
  if (path || Math.min(dx, dzz) < 0.7) return { kind: "dike", h: DIKE_H + fbm(x * 0.5, z * 0.5, 2, 9) * 0.06 };
  if (paddyIsRice(x, z)) return { kind: "rice", h: CANOPY_H + fbm(x * 0.35, z * 0.35, 3, 2) * 0.35 };
  return { kind: "flood", h: 0.0 };
}

const GRID = makeGrid(-46, -86, 92, 176, 1, 5);
const STATIC = sampleGrid(GRID, (x, z) => groundAt(x, z).h);
const KINDS: Kind[] = Array.from(STATIC.X, (x, i) => groundAt(x, STATIC.Z[i]).kind);
const SEEDS = Array.from(STATIC.X, (x, i) => hash2(Math.round(x * 10), Math.round(STATIC.Z[i] * 10), 1));

/** The height the girl stands at: the dike, or the bridge deck over the ditch. */
export function standY(x: number, z: number) {
  if (Math.abs(x) < 0.7 && Math.abs(z - DITCH_Z) < BRIDGE_SPAN / 2) return BRIDGE_DECK;
  return groundAt(x, z).h;
}

const COL: Record<Kind, RGB> = {
  dike: hex("#4d4530"),
  rice: hex("#2f4c2a"),
  flood: hex("#0b1824"),
  ditch: hex("#0a141c"),
  river: hex("#08121b"),
  grass: hex("#2a3722"),
  barrio: hex("#36302a"),
};

function dynHeight(i: number, t: number) {
  const k = KINDS[i], x = STATIC.X[i], z = STATIC.Z[i];
  if (k === "rice") return 0.07 * Math.sin(0.45 * x + 0.3 * z + 1.3 * t) + 0.04 * Math.sin(0.9 * z - 1.9 * t + x * 0.2);
  if (k === "flood") return 0.012 * Math.sin(1.7 * x + 2.1 * t + SEEDS[i] * 6);
  if (k === "ditch") return 0.02 * Math.sin(1.3 * x - 2.4 * t + SEEDS[i] * 6);
  if (k === "river") return 0.045 * Math.sin(0.8 * x - 1.6 * t + z * 0.5) + 0.03 * Math.sin(1.7 * z + 2.2 * t + SEEDS[i] * 6);
  return 0;
}

function faceKind(a: number, b: number, c: number): Kind {
  const ka = KINDS[a], kb = KINDS[b], kc = KINDS[c];
  for (const w of ["river", "ditch", "flood"] as const) if (ka === w && kb === w && kc === w) return w;
  // Two of three decide; a face touching the water's edge takes the land's kind.
  if (ka === kb || ka === kc) return ka === "river" || ka === "ditch" || ka === "flood" ? (kb === ka ? kc : kb) : ka;
  if (kb === kc) return kb === "river" || kb === "ditch" || kb === "flood" ? ka : kb;
  return [ka, kb, kc].find((k) => k === "dike") ?? [ka, kb, kc].find((k) => k === "rice") ?? ka;
}

const FAR = 82;

function visibleFrom(cam: Camera) {
  const f = norm(sub(cam.target, cam.pos));
  return (p: V3, margin = 3) => {
    const d = sub(p, cam.pos);
    const dist2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    if (dist2 > FAR * FAR) return false;
    return d[0] * f[0] + d[1] * f[1] + d[2] * f[2] > -margin;
  };
}

function emitGround(out: Tri[], cam: Camera, t: number) {
  const see = visibleFrom(cam);
  const w = GRID.nx + 1;
  const H = new Float32Array(STATIC.H.length);
  for (let i = 0; i < H.length; i++) H[i] = STATIC.H[i] + dynHeight(i, t);
  const v = (k: number): V3 => [STATIC.X[k], H[k], STATIC.Z[k]];
  for (let j = 0; j < GRID.nz; j++)
    for (let i = 0; i < GRID.nx; i++) {
      const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
      if (!see([STATIC.X[a], STATIC.H[a], STATIC.Z[a]], 4)) continue;
      const tris = (i + j) % 2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]];
      for (const [p, q, r] of tris) {
        const kind = faceKind(p, q, r);
        const water = kind === "river" || kind === "ditch" || kind === "flood";
        const shadeK = kind === "rice" ? 0.16 : 0.08;
        out.push({ a: v(p), b: v(q), c: v(r), color: vary(COL[kind], p * 3 + q, shadeK), mirror: water ? (kind === "flood" ? 0.85 : 1) : undefined });
      }
    }
  // Young rice in rows in the flooded paddies, and tufts along the dike edges, near the camera only.
  const near = 16;
  const cx = Math.round(cam.pos[0]), cz = Math.round(cam.pos[2]);
  for (let z = cz - near; z <= cz + near; z += 0.7)
    for (let x = cx - near; x <= cx + near; x += 0.7) {
      const g = groundAt(x, z);
      if (g.kind !== "flood") continue;
      const p: V3 = [x + (hash2(x * 10, z * 10, 2) - 0.5) * 0.2, 0, z];
      if (!see(p, 1)) continue;
      tuft(out, p, Math.round(x * 31 + z * 17), t, hex("#3f6a34"), 0.32);
    }
}

// ── Props ────────────────────────────────────────────────────────────────────────────────────────────

const KUBOS: { p: [number, number]; yaw: number; lit: number }[] = [
  { p: [-9, -62], yaw: 0.3, lit: 1 },
  { p: [8, -63], yaw: -0.4, lit: 1 },
  { p: [-15, -71], yaw: 0.6, lit: 0.7 },
  { p: [14, -72], yaw: -0.2, lit: 1 },
  { p: [3, -79], yaw: 0.1, lit: 0.8 },
  { p: [-5, -74], yaw: -0.1, lit: 0 },
  { p: [22, -66], yaw: -0.8, lit: 0.6 },
  { p: [-24, -64], yaw: 0.9, lit: 0 },
];
const POLES: V3[] = [[-6, 0, -58], [6, 0, -58], [-7, 0, -70], [7, 0, -70], [0, 0, -76]];
const WIRES: [number, number][] = [[0, 1], [0, 3], [1, 2], [2, 3], [2, 4], [3, 4], [0, 2], [1, 3]];

function propList() {
  const r = rng(77);
  const clumps: V3[] = [];
  for (const x of [-21, -14, -7.5, 6.5, 13, 19, 27]) clumps.push([x, 0.1, DITCH_Z + (r() < 0.5 ? -2.8 : 2.8)]);
  for (const x of [-26, -18, -11, -6, 5.5, 10, 16, 24]) clumps.push([x + r() * 2, 0.3, 50 + r() * 4]);
  for (const x of [-30, -19, -8, 4, 15, 28]) clumps.push([x, 0.4, 82 + r() * 4]);
  for (const x of [-30, -20, 18, 28]) clumps.push([x, 0.5, -57 - r() * 4]);
  const palms: V3[] = [
    [-12, 0.5, -58], [11, 0.5, -60], [-19, 0.5, -67], [18, 0.5, -76], [-2, 0.5, -84], [26, 0.5, -60],
    [-22, 0.42, -10], [24, 0.42, 25], [-27, 0.42, 34], [31, 0.42, -25], [-36, 0.42, 15],
    [-14, 0.3, 52], [9, 0.3, 48], [21, 0.3, 53], [-9, 0.6, 84], [12, 0.6, 85], [3, 0.6, 88],
  ];
  return { clumps, palms };
}
const PROPS = propList();

function poleTop(i: number): V3 {
  const p = POLES[i];
  return [p[0], groundAt(p[0], p[2]).h + 4.2, p[2]];
}

function emitProps(out: Tri[], glows: Glow[], cam: Camera, t: number, fiesta: boolean) {
  const see = visibleFrom(cam);
  PROPS.clumps.forEach((c, i) => see(c, 8) && bambooClump(out, [c[0], groundAt(c[0], c[2]).h, c[2]], i * 13 + 5, t));
  PROPS.palms.forEach((p, i) => see(p, 8) && palm(out, [p[0], groundAt(p[0], p[2]).h, p[2]], i * 7 + 3, t));
  if (see([0, 0.5, DITCH_Z], 6)) bridge(out, DITCH_Z, BRIDGE_DECK, BRIDGE_SPAN);
  if (!fiesta) return;
  for (const k of KUBOS) {
    const p: V3 = [k.p[0], groundAt(k.p[0], k.p[1]).h, k.p[1]];
    if (see(p, 8)) kubo(out, glows, p, k.yaw, k.lit);
  }
  POLES.forEach((p) => {
    const g = groundAt(p[0], p[2]).h;
    out.push({ a: [p[0] - 0.08, g, p[2]], b: [p[0] + 0.08, g, p[2]], c: [p[0], g + 4.3, p[2]], color: hex("#3a2f24") });
  });
  WIRES.forEach(([a, b], i) => {
    const A = poleTop(a), B = poleTop(b);
    if (i % 2) stringLights(out, glows, A, B, 14, t, i);
    else banderitas(out, [A[0], A[1] - 0.2, A[2]], [B[0], B[1] - 0.2, B[2]], 16, t, i);
  });
}

// ── Light and air ────────────────────────────────────────────────────────────────────────────────────

const MOON_DIR = norm([0.42, 0.24, 0.87]);

const NIGHT: Env = {
  skyTop: hex("#02040a"),
  skyBottom: hex("#0f1a2b"),
  fog: hex("#13233a"),
  fogNear: 8,
  fogFar: 75,
  sun: MOON_DIR,
  sunColor: [128, 150, 200],
  ambient: [38, 46, 70],
  stars: 0.32,
};

const DAWN: Env = {
  skyTop: hex("#3c4a5e"),
  skyBottom: hex("#9aa5b0"),
  fog: hex("#7a8794"),
  fogNear: 4,
  fogFar: 55,
  sun: norm([0.9, 0.12, 0.3]),
  sunColor: [130, 136, 148],
  ambient: [130, 138, 152],
};

const VOID: Env = { ...NIGHT, skyTop: [0, 0, 0], skyBottom: hex("#03050a"), fog: hex("#020306"), fogNear: 1, fogFar: 14, ambient: [6, 8, 12], sunColor: [8, 10, 14], stars: 0 };

// ── The story's state over time ──────────────────────────────────────────────────────────────────────

export const sceneAt = (t: number): SceneName =>
  ((Object.entries(SCENES) as [SceneName, { from: number; to: number }][]).find(([, s]) => t >= s.from && t < s.to)?.[0] ?? "outro");

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const inOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/** A slow handheld drift. */
function drift(cam: Camera, t: number, amount: number): Camera {
  const j = (s: number) => (noise2(t * 0.4, s) - 0.5) * 2 * amount;
  const d: V3 = [j(1), j(2) * 0.6, j(3)];
  return { ...cam, pos: add(cam.pos, d), target: add(cam.target, scale(d, 0.4)), roll: j(4) * 0.02 };
}

/** The bridge crossing, shared by the walk and the loop so both look exactly the same. */
const bridgeZ = (u: number) => 6.3 + u * 1.05;
const STRIDE = 0.62;

type Walker = { z: number; walk: number; x?: number; look?: number; call?: number };

function walkerAt(t: number): Walker | null {
  switch (sceneAt(t)) {
    case "fiesta":
      return { z: -50 + (t - 11), walk: 1 };
    case "light": {
      if (t < 37.5) return { z: -33 + (t - 28), walk: 1 };
      if (t < 41) return { z: -23.5, walk: 1 - span(t, 37.5, 37.9), call: Math.sin(Math.PI * span(t, 38.3, 40)), look: 0.1 * Math.sin(Math.PI * span(t, 38.3, 40)) };
      return { z: -23.5 + (t - 41) * 1.2, walk: span(t, 41, 41.3) };
    }
    case "walk":
      if (t < 55) return { z: -16 + (t - 46), walk: 1 };
      if (t < 60) return { z: -7 + (t - 55), walk: 1 };
      return { z: bridgeZ(t - 60), walk: 1 };
    case "loop":
      if (t < 72) return { z: bridgeZ(t - 66), walk: 1 };
      return { z: 14 + (t - 72) * 0.8, walk: 0.85 };
    case "fire": {
      const k = span(t, 82, 87.4);
      return { z: 22.5 + 2.4 * (1 - (1 - k) ** 2), walk: 1 - k, look: -0.15 * smooth(85, 87, t) };
    }
    case "river":
      if (t < CUES.step) return { z: 56.1, walk: 0 };
      return { z: 56.1 + 0.9 * span(t, CUES.step, CUES.step + 0.7), walk: 0.8 };
    default:
      return null;
  }
}

export function girlAt(t: number): GirlPose | null {
  const w = walkerAt(t);
  if (!w) return null;
  const x = w.x ?? 0;
  const y = sceneAt(t) === "river" ? Math.max(groundAt(x, w.z).h - 0.25 * span(t, CUES.step, CUES.step + 0.7), WATER_RIVER - 0.3) : standY(x, w.z);
  return { pos: [x, y, w.z], yaw: 0, phase: (w.z / STRIDE) * Math.PI, walk: w.walk, look: w.look, call: w.call };
}

/** The light (or lights) at time t. */
export function lightsAt(t: number, cam?: Camera): Santelmo[] {
  const scene = sceneAt(t);
  const g = walkerAt(t);
  const bob = (a: number, s = 0) => a * Math.sin(t * 1.9 + s) + a * 0.4 * Math.sin(t * 3.3 + s * 2);
  switch (scene) {
    case "hook":
    case "title":
      return [{ p: [0.6, 1.55 + bob(0.1), 64], strength: 1, size: 0.22 }];
    case "light":
      return [{ p: [0.2 * Math.sin(t * 1.4), 1.15 + bob(0.05), g!.z + 40], strength: 0.95 * smooth(30.2, 32.4, t), size: 0.17 }];
    case "walk":
    case "loop": {
      const local = scene === "loop" && t < 72 ? t - 6 : t;
      const D = local < 66 ? lerp(32, 22, span(local, 46, 66)) : lerp(18, 9, span(t, 72, 82));
      const z = (scene === "loop" && t < 72 ? walkerAt(local + 0)!.z : g!.z) + D;
      return [{ p: [0.15 * Math.sin(t * 1.2), 1.2 + bob(0.06), z], strength: 1, size: 0.19 + 0.05 * span(t, 72, 82) }];
    }
    case "fire": {
      const base: V3 = [0.1 * Math.sin(t * 1.1), 1.38 + bob(0.05), 30.5 - 1.35 * span(t, 82, 87.4)];
      const s: Santelmo = { p: base, strength: 1.25, size: 0.32 + 0.06 * span(t, 82, 88) };
      if (t >= CUES.flare && cam) {
        const k = span(t, CUES.flare, CUES.flare + 0.5) ** 2;
        const f = norm(sub(cam.target, cam.pos));
        s.p = lerp3(base, add(cam.pos, scale(f, 0.7)), k);
        s.size *= 1 + 3 * k;
        s.strength = 1.6;
      }
      return t < CUES.flare + 0.55 ? [s] : [];
    }
    case "river":
      return [{ p: [0.25, 1.7 + bob(0.08), 63.5], strength: 1.1, size: 0.26 }];
    case "reveal": {
      const rise = smooth(CUES.secondLight.from, CUES.secondLight.to, t);
      return [
        { p: [-0.4, 1.75 + bob(0.08), 63.4], strength: 1.1, size: 0.25 },
        { p: [1.15, -0.5 + 2.15 * rise + bob(0.05, 2) * rise, 64.3], strength: smooth(CUES.secondLight.from, CUES.secondLight.from + 1.2, t), size: 0.23, seed: 3 },
      ];
    }
    case "outro": {
      const a: Santelmo = { p: [-0.4, 1.75 + bob(0.08), 63.4], strength: 0.9, size: 0.25 };
      if (t >= CUES.lastRush && cam) {
        const k = span(t, CUES.lastRush, CUES.lastRush + 0.45) ** 2;
        const f = norm(sub(cam.target, cam.pos));
        a.p = lerp3(a.p, add(cam.pos, scale(f, 0.6)), k);
        a.size *= 1 + 3 * k;
        a.strength = 1.4;
      }
      if (t >= CUES.lastRush + 0.5) return [];
      return [a, { p: [1.15, 1.65 + bob(0.05, 2), 64.3], strength: 0.9, size: 0.23, seed: 3 }];
    }
    default:
      return [];
  }
}

export function cameraAt(t: number): Camera {
  const scene = sceneAt(t);
  const g = walkerAt(t);
  const cam = (pos: V3, target: V3, fov = 50): Camera => ({ pos, target, fov });
  switch (scene) {
    case "hook":
    case "title": {
      const k = inOut(span(t, 0, 9.2));
      return drift(cam(lerp3([-2.6, 1.15, 50.5], [-1.3, 0.95, 55.0], k), lerp3([0.3, 1.4, 64], [0.5, 1.5, 64], k), lerp(46, 38, k)), t, 0.05);
    }
    case "fiesta": {
      if (t < SHOTS.fiestaFeet.from) {
        const k = inOut(span(t, 11, SHOTS.fiestaFeet.from));
        return drift(cam(lerp3([5, 2.6, -30], [4.2, 2.3, -31.5], k), [0, 1.9, -60], 48), t, 0.06);
      }
      if (t < SHOTS.fiestaFeet.to) {
        // Down at her feet: the new tsinelas on the dike's mud.
        const y = standY(0, g!.z);
        return drift(cam([0.6, y + 0.5, g!.z - 1.9], [0, y - 0.02, g!.z + 0.1], 40), t, 0.012);
      }
      return drift(cam([0.9, 1.3, g!.z + 3.6], [0, 1.1, g!.z - 3]), t, 0.06);
    }
    case "light": {
      if (t < 37.5) return drift(cam([0.75, 1.82, g!.z - 3.3], [0, 1.15, g!.z + 25]), t, 0.05);
      if (t < 41) return drift(cam([0.35, 1.25, g!.z + 13], [0, 0.95, g!.z], 30), t, 0.03);
      return drift(cam([0.8, 1.7, g!.z - 3.0], [0, 1.1, g!.z + 25], 52), t, 0.07);
    }
    case "walk": {
      if (t < 55) return drift(cam([-4.4, 1.9, g!.z - 2.6], [0.2, 1.0, g!.z + 0.9], 50), t, 0.05);
      if (t < 60) return drift(cam([3.2, 6.5, g!.z - 9], [0, 0.3, g!.z + 10], 50), t, 0.05);
      return drift(cam([2.8, 1.35, 5.0], [0, 0.7, 10.2], 52), t - 60, 0.03);
    }
    case "loop": {
      if (t < 72) return drift(cam([2.8, 1.35, 5.0], [0, 0.7, 10.2], 52), t - 66, 0.03);
      if (t < SHOTS.loopWatch.to) {
        // Something in the rice, watching her: low in the canopy, the frame tilted.
        const side = paddyIsRice(3.4, g!.z) ? 1 : -1;
        const c = drift(cam([3.6 * side, 1.32, g!.z + 2.2 - (t - 72) * 0.3], [0, 1.05, g!.z], 38), t, 0.04);
        return { ...c, roll: 0.13 * side };
      }
      // She walks towards us past the panakot; after she passes, its head turns to follow her (towards us).
      const k = span(t, SHOTS.loopPanakot.from, 82);
      const c = drift(cam([-0.3, 1.5, lerp(25.8, 25.3, k)], [0.5, 1.3, 19.5], 44), t, 0.03);
      return { ...c, roll: -0.05 };
    }
    case "fire": {
      const l = lightsAt(t)[0]?.p ?? [0, 1.4, 29];
      if (t < 86) return drift(cam([0.6, 1.72, g!.z - 2.1], [0, 1.3, l[2]], 50), t, 0.04);
      const k = span(t, 86, CUES.flare);
      const c = cam([0.85, 1.45, l[2] - lerp(3.0, 2.2, k)], [l[0], l[1], l[2]], 46);
      return t >= CUES.flare ? c : drift(c, t, 0.02 + 0.03 * k);
    }
    case "river": {
      if (t < 99) {
        const k = inOut(span(t, 92, 99));
        return drift(cam(lerp3([-1.8, 2.3, 50.5], [-1.4, 2.1, 51.8], k), [0.1, 1.1, 62]), t, 0.05);
      }
      return drift(cam([-0.9, 0.85, 53.4], [0.15, 1.3, 60], 48), t, 0.04);
    }
    case "reveal": {
      const k = inOut(span(t, 106, 112.6));
      return drift(cam(lerp3([0.85, 0.85, 54.9], [0.7, 0.8, 55.2], k), lerp3([0.2, -0.05, 57.0], [0.3, 1.1, 61], k), 46), t, 0.03);
    }
    case "dawn":
      return drift(cam([0.85, 1.15, 54.6], [0.2, -0.5, 57.4], 46), t, 0.02);
    default:
      return drift(cam([0.2, 1.5, 44], [0.3, 1.6, 64], 44), t, 0.03);
  }
}

/** Where the panakot stands in each part of the story: further off at first, then closer, then on the path. */
export function panakotAt(t: number): { p: V3; yaw: number; head: number } | null {
  const g = girlAt(t);
  const track = (p: V3, yaw: number) => (g ? Math.atan2(g.pos[0] - p[0], g.pos[2] - p[2]) - yaw : 0);
  switch (sceneAt(t)) {
    case "light":
      // Far off at first, turned away.
      return { p: [3.2, 0, -13], yaw: 0, head: 0 };
    case "walk":
      if (t < 60) return { p: [2.6, 0, -6], yaw: -Math.PI / 2, head: 0 };
      return null;
    case "loop": {
      // The second crossing is the same shot as the first, except that this time it is waiting past the bridge.
      if (t < 72) return { p: [-0.9, standY(-0.9, 13.6), 13.6], yaw: Math.PI, head: 0 };
      if (t < SHOTS.loopPanakot.from) return null;
      const p: V3 = [1.15, standY(1.15, 20.3), 20.3];
      // Its head follows her, slowly, once she is close.
      const h = track(p, Math.PI);
      return { p, yaw: Math.PI, head: h * smooth(77.8, 79.5, t) };
    }
    default:
      return null;
  }
}

const MIST = hex("#71839c");

/** Low mist drifting over the paddies, anchored to the world, near the camera only. */
function emitMist(out: Tri[], cam: Camera, t: number, dawn: boolean) {
  const see = visibleFrom(cam);
  const cell = 6, R = 6;
  const ci = Math.floor(cam.pos[0] / cell), cj = Math.floor(cam.pos[2] / cell);
  for (let j = cj - R; j <= cj + R; j++)
    for (let i = ci - R; i <= ci + R; i++) {
      for (let k = 0; k < 2; k++) {
        const h1 = hash2(i, j, 30 + k), h2 = hash2(i, j, 40 + k), h3 = hash2(i, j, 50 + k);
        const p: V3 = [i * cell + h1 * cell + t * 0.28, 0.75 + h3 * 0.7, j * cell + h2 * cell];
        if (!see(p, 2)) continue;
        const d = Math.hypot(p[0] - cam.pos[0], p[2] - cam.pos[2]);
        // Not right on the lens: a puff too close reads as a wall.
        const near = smooth(1.5, 4, d) * (1 - smooth(28, 40, d));
        const breathe = 0.6 + 0.4 * Math.sin(t * 0.25 + h1 * 9);
        mistPuff(out, p, 2.2 + h3 * 2.2, (dawn ? 0.11 : 0.075) * near * breathe, i * 7 + j, dawn ? hex("#c7ced6") : MIST);
      }
    }
}

export const TSINELAS: V3 = [0.2, 0, 56.45];

/** Everything on screen at time t. */
export function santelmoFrame(t: number): Frame {
  const scene = sceneAt(t);
  const camera = cameraAt(t);
  const tris: Tri[] = [];
  const glowsFront: Glow[] = [];
  const glowsBehind: Glow[] = [];
  const lights: PointLight[] = [];

  let env = { ...NIGHT };
  if (scene === "dawn") env = { ...DAWN };
  if (scene === "outro") env = { ...VOID };
  if (scene === "loop" && t >= 72) env.fogFar = lerp(75, 50, span(t, 72, 82));
  if (scene === "fire") env = { ...env, fogNear: 4, fogFar: 42, ambient: [26, 32, 48] };

  emitGround(tris, camera, t);
  emitProps(tris, glowsFront, camera, t, scene === "fiesta" || scene === "light");
  // The fiesta's warm spill over the plaza.
  if (scene === "fiesta" || scene === "light") lights.push({ p: [0, 4, -66], color: [255, 170, 100], intensity: 0.9, range: 26 });

  const g = girlAt(t);
  if (g) girl(tris, g);
  const pk = panakotAt(t);
  if (pk) panakot(tris, pk.p, pk.yaw, pk.head, t);
  if (scene !== "outro" && scene !== "title" && scene !== "fiesta") emitMist(tris, camera, t, scene === "dawn");
  if (scene === "reveal" || scene === "dawn") tsinelas(tris, [TSINELAS[0], groundAt(TSINELAS[0], TSINELAS[2]).h + 0.01, TSINELAS[2]], 0.4);

  for (const s of lightsAt(t, camera)) santelmo(tris, glowsFront, lights, s, t);

  if (scene !== "dawn" && scene !== "outro") {
    const moon = add(camera.pos, scale(MOON_DIR, 900));
    glowsBehind.push({ p: moon, radius: 30, color: [214, 222, 236], alpha: 0.85 }, { p: moon, radius: 150, color: [120, 140, 180], alpha: 0.1 });
  }
  return { tris, camera, env, glowsFront, glowsBehind, lights };
}

/** Where the light is from the camera (m), for the santelmo's hum in the sound. */
export function lightDistance(t: number) {
  const cam = cameraAt(t);
  const ls = lightsAt(t, cam);
  if (!ls.length) return { dist: Infinity, strength: 0 };
  const d = Math.min(...ls.map((l) => Math.hypot(...(sub(l.p, cam.pos) as [number, number, number]))));
  return { dist: d, strength: Math.max(...ls.map((l) => l.strength)) };
}

/** Each footfall, with what it lands on. */
export function footsteps(dt = 1 / 120) {
  const out: { t: number; bamboo: boolean; gain: number }[] = [];
  let last: number | null = null;
  for (let t = 0; t < SCENES.outro.from; t += dt) {
    const g = girlAt(t);
    if (!g || g.walk < 0.2) {
      last = null;
      continue;
    }
    const step = Math.floor(g.phase / Math.PI);
    if (last !== null && step !== last && Math.abs(step - last) < 3) out.push({ t, bamboo: Math.abs(g.pos[2] - DITCH_Z) < BRIDGE_SPAN / 2, gain: g.walk });
    last = step;
  }
  return out;
}
