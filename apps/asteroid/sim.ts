// The asteroid world, in two places. In orbit: a low-poly planet and a 1.4 km asteroid on its final approach. On the
// ground: a city on a plain, the fireball crossing the sky, the impact 90 units out, the crater, the ejecta, and the
// shockwave rolling over the city. Back in orbit, the impact scar and its dust spreading over the planet.
import { add, hex, mixRGB, norm, projector, scale, smooth, sub, type Camera, type Env, type Frame, type Glow, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { ballistic, box, emitGrid, fbm, hash2, makeGrid, octa, rng, sampleGrid, shake, shotCamera, sphere, tetra, tree, vary, type Shot } from "../../src/kit/lowpoly/world";

export const ENTRY = 9.5;
export const GROUND = 11;
export const IMPACT = 15;
export const ORBIT = 23.5;

// ── Orbit ────────────────────────────────────────────────────────────────────────────────────────────

const R = 30;
export const IMPACT_DIR = norm([-0.3, 0.45, 0.85]);
export const IMPACT_POINT = scale(IMPACT_DIR, R);
const APPROACH = norm([0.9, 0.38, 0.45]);
const SIDE = norm([APPROACH[2], 0, -APPROACH[0]]);

/** Distance (world units) from the asteroid to the impact point, in orbit. */
export const approachDist = (t: number) => 140 * Math.max(0, (11.3 - t) / 11.3) ** 1.3;
export const asteroidPos = (t: number): V3 => add(IMPACT_POINT, scale(APPROACH, approachDist(t)));

const angleTo = (d: V3, e: V3) => Math.acos(Math.max(-1, Math.min(1, d[0] * e[0] + d[1] * e[1] + d[2] * e[2])));

function planet(tris: Tri[], t: number) {
  const OCEAN = hex("#1d5fa0"), DEEP = hex("#174a86"), LAND = hex("#4f8f45"), DESERT = hex("#c8b273"), ICE = hex("#eef3f6"), DUST = hex("#6d5a4a");
  const scarAge = t - IMPACT;
  sphere(
    tris,
    3,
    { pos: [0, 0, 0] },
    (d) => R + (fbm(d[0] * 2.2 + d[1], d[2] * 2.2 - d[1] * 0.7, 4, 11) > 0.02 ? 0.5 : 0),
    (d, i) => {
      const e = fbm(d[0] * 2.2 + d[1], d[2] * 2.2 - d[1] * 0.7, 4, 11);
      let color: RGB = Math.abs(d[1]) > 0.86 ? ICE : e > 0.02 ? (Math.abs(d[1]) < 0.35 && e < 0.12 ? DESERT : LAND) : e > -0.06 ? OCEAN : DEEP;
      color = vary(color, i, 0.06);
      let glow = 0;
      if (t > IMPACT) {
        const a = angleTo(d, IMPACT_DIR);
        const dust = 0.12 + Math.max(0, t - ORBIT) * 0.09;
        if (a < dust) color = mixRGB(color, DUST, 0.85 * (1 - a / dust) ** 0.5);
        if (a < 0.1) {
          color = mixRGB(color, hex("#ff7a2a"), 0.9);
          glow = 0.9 * Math.exp(-Math.max(0, scarAge - 9) / 6);
        }
      }
      return { color, glow };
    },
  );
}

function asteroidMesh(tris: Tri[], pos: V3, t: number, heat: number) {
  sphere(
    tris,
    1,
    { pos, yaw: t * 0.8, pitch: t * 0.5, size: 2.2 },
    (d) => 0.8 + 0.35 * hash2(Math.round(d[0] * 50), Math.round(d[1] * 50 + d[2] * 31), 4),
    (_d, i) => ({ color: mixRGB(vary(hex("#7a6c60"), i, 0.15), hex("#ffb055"), heat * 0.8), glow: heat * 0.8 }),
  );
}

function orbitFrame(t: number): Frame {
  const tris: Tri[] = [];
  const glowsBehind: Glow[] = [{ p: [0, 0, 0], radius: R * 2.1, color: [90, 160, 255], alpha: 0.32 }];
  const glowsFront: Glow[] = [];
  planet(tris, t);
  let camera: Camera;
  if (t < ORBIT) {
    const A = asteroidPos(t);
    const heat = smooth(ENTRY - 1, GROUND, t);
    asteroidMesh(tris, A, t, heat);
    // The trail: hot shards and glow streaming behind once it hits the atmosphere.
    if (heat > 0) {
      for (let i = 0; i < 28; i++) {
        const back = (i + 1) * 1.4;
        const r = rng(i + 3);
        const p = add(add(A, scale(APPROACH, back)), [(r() - 0.5) * back * 0.2, (r() - 0.5) * back * 0.2, (r() - 0.5) * back * 0.2]);
        tetra(tris, { pos: p, yaw: t * 4 + i, pitch: i, size: 1.6 * (1 - i / 28) * heat }, { color: i < 8 ? hex("#fff0b0") : hex("#ff7a2a"), glow: 1 });
      }
      glowsFront.push({ p: A, radius: 14 * heat, color: [255, 150, 60], alpha: 0.7 * heat });
    }
    if (t < 5.5) {
      const k = t / 5.5;
      camera = { pos: add(add(A, scale(APPROACH, 13 + 6 * (1 - k))), add(scale(SIDE, 5), [0, 4, 0])), target: IMPACT_POINT, fov: 55 };
    } else {
      const k = smooth(5.5, GROUND, t);
      const pos = add(add(IMPACT_POINT, scale(SIDE, 112 - 30 * k)), add(scale(APPROACH, 24), scale(IMPACT_DIR, 20)));
      const cam: Camera = { pos, target: add(scale(IMPACT_POINT, 0.35), scale(A, 0.65)), fov: 56 };
      // Rolled so the approach runs down the tall frame, asteroid at the top, the planet below.
      const p = projector(cam, 1080, 1920);
      const a = p(A), b = p(IMPACT_POINT);
      camera = { ...cam, roll: -(Math.atan2(a.x - b.x, b.y - a.y)) };
    }
  } else {
    // The aftermath, seen from high over the impact site.
    const k = smooth(ORBIT, 30, t);
    camera = { pos: add(scale(IMPACT_DIR, 92 + 14 * k), add(scale(SIDE, 26 - 8 * k), [0, 12, 0])), target: [0, 0, 0], fov: 52 };
    glowsFront.push({ p: scale(IMPACT_DIR, R + 1), radius: 10, color: [255, 120, 40], alpha: 0.6 * Math.exp(-(t - ORBIT) / 8) });
  }
  const env: Env = {
    skyTop: hex("#02040a"),
    skyBottom: hex("#070b18"),
    fog: hex("#02040a"),
    fogNear: 400,
    fogFar: 900,
    sun: norm([0.9, 0.35, 0.55]),
    sunColor: [255, 246, 232],
    ambient: [28, 34, 48],
    stars: 0.85,
  };
  return { tris, camera: shake(camera, t, t > ENTRY ? 0.25 * smooth(ENTRY, GROUND, t) : 0), env, glowsBehind, glowsFront };
}

// ── Ground ───────────────────────────────────────────────────────────────────────────────────────────

export const IMPACT_AT: V3 = [0, 0, -90];
const SHOCK_SPEED = 14;
export const shockRadius = (t: number) => (t < IMPACT ? 0 : SHOCK_SPEED * (t - IMPACT) + 10 * smooth(IMPACT, IMPACT + 0.6, t));
const fromImpact = (x: number, z: number) => Math.hypot(x - IMPACT_AT[0], z - IMPACT_AT[2]);

export function ground(x: number, z: number, t: number) {
  let h = fbm(x * 0.03, z * 0.03, 3, 21) * 8 + 2;
  h *= smooth(10, 40, Math.hypot(x, z - 0)) * 0.7 + 0.3;
  if (t >= IMPACT) {
    const r = fromImpact(x, z);
    const k = smooth(IMPACT, IMPACT + 1.4, t);
    h += k * (r < 16 ? -12 * (1 - (r / 16) ** 2) : 0) + k * 4 * Math.exp(-(((r - 17) / 4) ** 2));
    const S = shockRadius(t);
    h += 1.4 * Math.exp(-(((r - S) / 3.5) ** 2)) * Math.exp(-(t - IMPACT) / 8);
  }
  return h;
}

type Tower = { x: number; z: number; w: number; d: number; h: number; color: RGB; hit: number; fall: boolean; yaw: number };
type Plant = { x: number; z: number; s: number; color: RGB; hit: number };

let cityCache: { towers: Tower[]; plants: Plant[] } | null = null;
export function city() {
  if (cityCache) return cityCache;
  const r = rng(99);
  const towers: Tower[] = [];
  for (let tries = 0; towers.length < 46 && tries < 3000; tries++) {
    const x = -24 + r() * 48, z = -18 + r() * 34;
    if (Math.abs(x - 6) < 4 && z > 12) continue;
    const w = 2.4 + r() * 2.6, d = 2.4 + r() * 2.6;
    if (towers.some((o) => Math.abs(o.x - x) < (o.w + w) / 2 + 0.8 && Math.abs(o.z - z) < (o.d + d) / 2 + 0.8)) continue;
    const centre = 1 - Math.min(1, Math.hypot(x, z) / 28);
    towers.push({
      x, z, w, d, h: 3 + r() * 6 + centre * 16 * r(),
      color: [hex("#9aa7b4"), hex("#7f93a8"), hex("#c3c8cc"), hex("#5f7389"), hex("#b8a99a")][Math.floor(r() * 5)],
      hit: IMPACT + (fromImpact(x, z) - 10) / SHOCK_SPEED, fall: r() < 0.55, yaw: (r() - 0.5) * 0.2,
    });
  }
  const plants: Plant[] = [];
  for (let tries = 0; plants.length < 150 && tries < 4000; tries++) {
    const x = -70 + r() * 140, z = -130 + r() * 180;
    const rr = Math.hypot(x, z);
    if (rr < 30 || fromImpact(x, z) < 22) continue;
    plants.push({ x, z, s: 2 + r() * 2.2, color: vary(hex("#3f7a3a"), tries, 0.15), hit: IMPACT + (fromImpact(x, z) - 10) / SHOCK_SPEED });
  }
  cityCache = { towers, plants };
  return cityCache;
}

const GRID = makeGrid(-80, -140, 50, 62, 3.2, 8);
export const fireballPos = (t: number): V3 => {
  const u = smooth(GROUND, IMPACT, t) ** 1.4;
  const F0: V3 = [-150, 170, -300];
  return [F0[0] + (IMPACT_AT[0] - F0[0]) * u, F0[1] + (8 - F0[1]) * u, F0[2] + (IMPACT_AT[2] - F0[2]) * u];
};

export const GROUND_SHOTS: Shot[] = [
  { from: IMPACT, to: 18.5, pos: [[72, 46, 12], [80, 51, 18]], target: [[0, 5, -58], [0, 5, -50]], fov: [56, 58] },
  { from: 18.5, to: ORBIT, pos: [[8, 18, 26], [8, 17, 28]], target: [[0, 1, -40], [0, 2, -40]], fov: [60, 62] },
];

function groundFrame(t: number): Frame {
  const tris: Tri[] = [];
  const glowsFront: Glow[] = [];
  const since = t - IMPACT;
  const S = shockRadius(t);
  const G = sampleGrid(GRID, (x, z) => ground(x, z, t));
  const GRASS = hex("#6a9a4a"), GRASS2 = hex("#5a8a40"), DIRT = hex("#a08660"), SCORCH = hex("#4a3a30"), MOLTEN = hex("#ff7a2a"), ROAD = hex("#7a7a78");
  emitGrid(tris, GRID, G, (a, b, c, cx, cz) => {
    const r = fromImpact(cx, cz);
    let col = Math.hypot(cx, cz) < 30 ? (hash2(a, b) > 0.65 ? ROAD : mixRGB(GRASS, ROAD, 0.35)) : hash2(a, c) > 0.5 ? GRASS : GRASS2;
    if (since > 0) {
      if (r < S - 4) col = mixRGB(col, r < 40 ? SCORCH : DIRT, r < 40 ? 0.9 : 0.6);
      if (r < 15) return { color: vary(mixRGB(SCORCH, MOLTEN, Math.exp(-since / 5) * (1 - r / 15)), a), glow: 0.8 * Math.exp(-since / 5) * (1 - r / 15) };
    }
    return { color: vary(col, a * 3 + b) };
  });

  const { towers, plants } = city();
  for (const o of towers) {
    const p = t - o.hit;
    const away = Math.atan2(o.x - IMPACT_AT[0], o.z - IMPACT_AT[2]);
    const y = ground(o.x, o.z, t) - 0.3;
    if (p > 0 && o.fall) {
      // Tipped over, away from the blast.
      const tip = 1.45 * smooth(0, 1.1, p) ** 1.5;
      box(tris, { pos: [o.x, y, o.z], yaw: away, pitch: tip, size: [o.w, o.h, o.d] }, (f) => ({ color: f === 0 ? hex("#e0e4e8") : vary(o.color, f + (o.x | 0)) }));
    } else {
      const crumble = p > 0 ? 1 - 0.65 * smooth(0, 1.2, p) : 1;
      box(tris, { pos: [o.x, y, o.z], yaw: o.yaw, size: [o.w, o.h * crumble, o.d] }, (f) => ({ color: f === 0 ? hex("#e0e4e8") : vary(o.color, f + (o.x | 0)) }));
    }
    if (p > 0 && p < 3) {
      const r = rng(Math.round(o.x * 37 + o.z * 11));
      for (let i = 0; i < 6; i++) {
        const v0: V3 = [Math.sin(away) * (6 + r() * 8), 3 + r() * 6, Math.cos(away) * (6 + r() * 8)];
        const q = ballistic([o.x, y + o.h * r(), o.z], v0, p, 9.8);
        if (q[1] > ground(q[0], q[2], t)) tetra(tris, { pos: q, yaw: p * 6 + i, pitch: i, size: 0.5 + r() * 0.5 }, { color: o.color });
      }
    }
  }
  for (const pl of plants) {
    const p = t - pl.hit;
    const away = Math.atan2(pl.x - IMPACT_AT[0], pl.z - IMPACT_AT[2]);
    tree(tris, { pos: [pl.x, ground(pl.x, pl.z, t) - 0.1, pl.z], size: pl.s, yaw: away, pitch: p > 0 ? 1.45 * smooth(0, 0.4, p) : 0 }, p > 0 ? mixRGB(pl.color, hex("#5a4632"), 0.6) : pl.color);
  }

  if (t < IMPACT) {
    // The fireball on its way down, with a burning trail.
    const F = fireballPos(t);
    const dir = norm(sub(fireballPos(t - 0.05), F));
    octa(tris, { pos: F, size: 3.2, yaw: t * 3 }, { color: hex("#fff6d0"), glow: 1 });
    for (let i = 0; i < 26; i++) {
      const r = rng(i * 5 + 2);
      const back = (i + 1) * 3.2;
      const p = add(add(F, scale(dir, back)), [(r() - 0.5) * back * 0.12, (r() - 0.5) * back * 0.12, (r() - 0.5) * back * 0.12]);
      const fade = 1 - i / 26;
      octa(tris, { pos: p, size: (2.6 + i * 0.25) * fade + 0.6, yaw: i + t }, { color: i < 6 ? hex("#ffd27a") : mixRGB(hex("#ff7a2a"), hex("#6a5a50"), i / 26), glow: fade });
    }
    glowsFront.push({ p: F, radius: 40, color: [255, 190, 110], alpha: 0.85 });
  } else {
    // The fireball dome and the mushroom of dust over the crater.
    for (let i = 0; i < 90; i++) {
      const r = rng(i * 13 + 1);
      const [ra, rb, rs, rh] = [r(), r(), r(), r()];
      const ang = ra * Math.PI * 2, el = rb * Math.PI * 0.5;
      const spread = 26 * (1 - Math.exp(-since / 1.3));
      const rise = rh * since * 3.2;
      const p: V3 = [IMPACT_AT[0] + Math.cos(ang) * Math.cos(el) * spread, ground(IMPACT_AT[0], IMPACT_AT[2], t) + 4 + Math.sin(el) * spread * 0.8 + rise, IMPACT_AT[2] + Math.sin(ang) * Math.cos(el) * spread];
      const heat = Math.exp(-since / (1.2 + rs));
      const col = mixRGB(mixRGB(hex("#5c4c42"), hex("#8a7462"), rs), mixRGB(hex("#ff8a30"), hex("#fff3c4"), heat), heat);
      octa(tris, { pos: p, size: (5 + rs * 6) * (0.6 + 0.4 * smooth(0, 1.5, since)), yaw: i }, { color: col, glow: heat });
    }
    // Ejecta thrown out on long arcs.
    for (let i = 0; i < 130; i++) {
      const r = rng(i * 19 + 4);
      const [ra, rh, rv, rs] = [r(), r(), r(), r()];
      const ang = ra * Math.PI * 2;
      const v0: V3 = [Math.cos(ang) * (14 + rh * 26), 22 + rv * 26, Math.sin(ang) * (14 + rh * 26)];
      const q = ballistic(add(IMPACT_AT, [0, 4, 0]), v0, since, 9.8);
      if (q[1] < ground(q[0], q[2], t)) continue;
      const heat = Math.exp(-since / 2);
      tetra(tris, { pos: q, yaw: since * 5 + i, pitch: since * 3, size: 0.8 + rs * 1.4 }, { color: mixRGB(hex("#5a4a40"), hex("#ffb050"), heat), glow: heat });
    }
    // The shockwave: a ring of dust rolling outward.
    if (S < 170) {
      for (let i = 0; i < 180; i++) {
        const r = rng(i * 23 + 6);
        const [ro, rs, rc, rl] = [r(), r(), r(), r()];
        const ang = (i / 180) * Math.PI * 2 + ro * 0.03;
        const rr = S - rl * 6;
        const x = IMPACT_AT[0] + Math.cos(ang) * rr, z = IMPACT_AT[2] + Math.sin(ang) * rr;
        if (x < -90 || x > 90 || z < -150 || z > 70) continue;
        const size = (3 + rs * 4) * (0.7 + 0.3 * Math.min(1, since / 2));
        octa(tris, { pos: [x, ground(x, z, t) + size * 0.55, z], size: [size, size * 0.7, size], yaw: i + since }, { color: mixRGB(hex("#e2cfb2"), hex("#a8896a"), rc) });
      }
    }
    glowsFront.push({ p: add(IMPACT_AT, [0, 14, 0]), radius: 90, color: [255, 160, 80], alpha: 0.9 * Math.exp(-since / 2.5) });
  }

  const blastSky = smooth(IMPACT, IMPACT + 4, t);
  const env: Env = {
    skyTop: mixRGB(hex("#2f6aa6"), hex("#3a2418"), blastSky),
    skyBottom: mixRGB(hex("#cfe1ee"), hex("#c9783f"), blastSky),
    fog: mixRGB(hex("#c8dbe8"), hex("#c49470"), blastSky),
    fogNear: 70,
    fogFar: 300 - 40 * blastSky,
    sun: norm([0.4, 0.75, 0.5]),
    sunColor: mixRGB([255, 244, 226], [255, 170, 110], blastSky),
    ambient: mixRGB([110, 124, 142], [124, 100, 88], blastSky),
  };

  let camera: Camera;
  if (t < IMPACT) {
    // Looking up from the city edge, following the fireball down to the horizon.
    const F = fireballPos(t);
    const look: V3 = [F[0] * 0.55, F[1] * 0.55 + 6, F[2] * 0.55 - 40];
    camera = { pos: [16, 10, 50], target: look, fov: 62 };
  } else {
    camera = shotCamera(GROUND_SHOTS, t);
  }
  const quake = t > IMPACT ? 1.3 * Math.exp(-since / 1.2) : 0;
  const atCity = shockAtCity();
  const wave = t > atCity - 0.4 ? 1.6 * Math.exp(-Math.max(0, t - atCity) / 1.5) : 0;
  const rumble = t > GROUND && t < IMPACT ? 0.1 + 0.3 * smooth(GROUND, IMPACT, t) : 0;
  return { tris, camera: shake(camera, t, quake + wave + rumble), env, glowsFront };
}

/** When the shockwave reaches the rooftop camera (shot 5). */
export const shockAtCity = () => IMPACT + (fromImpact(8, 26) - 10) / SHOCK_SPEED;

export function asteroidFrame(t: number): Frame {
  return t < GROUND || t >= ORBIT ? orbitFrame(t) : groundFrame(t);
}

export function readouts(t: number) {
  // In orbit, distance to the impact point; on the ground, the fireball's altitude.
  const distKm = t < GROUND ? approachDist(t) * 2800 : t < IMPACT ? fireballPos(t)[1] * 0.45 : 0;
  const v = 21.3 + 2.8 * smooth(ENTRY - 1, IMPACT, t);
  const tti = Math.max(0, (IMPACT - t) * 90);
  const shockKmh = t < IMPACT ? 0 : 3200 * Math.exp(-(t - IMPACT) / 6) + 800;
  const shockKm = shockRadius(t) * 0.35;
  const down = city().towers.filter((o) => o.hit <= t).length;
  return { distKm, v, tti, shockKmh, shockKm, down, towers: city().towers.length };
}

/** The asteroid's light curve (brightening as it nears, wobbling as it tumbles), then the seismic trace. */
export function trace(t: number, span = 5, n = 90) {
  return Array.from({ length: n }, (_, i) => {
    const tt = t - span + (i / (n - 1)) * span;
    if (tt < IMPACT) return -0.9 + 1.6 * smooth(0, IMPACT, tt) ** 2 + 0.12 * Math.sin(tt * 9) + (hash2(Math.floor(tt * 30), 1, 2) - 0.5) * 0.06;
    const amp = 0.1 + 1.0 * Math.exp(-(tt - IMPACT) / 2) + (tt > shockAtCity() ? 0.6 * Math.exp(-(tt - shockAtCity()) / 1) : 0);
    return (hash2(Math.floor(tt * 30), i, 5) - 0.5) * 2 * amp;
  });
}
