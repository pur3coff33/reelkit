// The new look for Kalakas from space (a test): a curved Earth with real coastlines, and a storm in layers, from its
// shadow on the sea to the thin high cloud spinning out of the top. 1 unit = 10 km. The storm sits at the top of the
// globe, so +y is straight up through its eye, +x is east and −z is north.
import { add, dot, hex, mixRGB, norm, scale, type Env, type Frame, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, hash2, icosphere, noise2, rng, smooth, vary } from "../../src/kit/lowpoly/world";
import { COASTS } from "./geo";

export const EARTH_R = 637;
export const STORM_AT = { lon: 127.0, lat: 11.7 };

const rad = (d: number) => (d * Math.PI) / 180;
const C_LON = rad(STORM_AT.lon), C_LAT = rad(STORM_AT.lat);

/** A place on Earth, `h` units above the sea. */
export function G(lon: number, lat: number, h = 0): V3 {
  const a = rad(lon) - C_LON, b = rad(lat);
  // On the globe, relative to the storm's meridian…
  const east = Math.cos(b) * Math.sin(a);
  const out = Math.cos(b) * Math.cos(a);
  const up = Math.sin(b);
  // …then turned so the storm's centre is at the top.
  const north = up * Math.cos(C_LAT) - out * Math.sin(C_LAT);
  const radial = up * Math.sin(C_LAT) + out * Math.cos(C_LAT);
  const r = EARTH_R + h;
  return [east * r, radial * r, -north * r];
}

/** Sun low in the west, so cloud tops throw relief across the storm and the far side of the Earth falls into night. */
export const SUN = norm([-0.8, 0.5, 0.33]);

/** Ear clipping: a coastline as triangles, so land keeps its real outline instead of a grid of squares. */
function earclip(ring: number[][]) {
  const pts = [...ring];
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    area += x0 * y1 - x1 * y0;
  }
  if (area < 0) pts.reverse();
  const out: number[][][] = [];
  const left = pts.map((_, i) => i);
  const cross2 = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let guard = 0; left.length > 3 && guard < 5000; guard++) {
    let clipped = false;
    for (let i = 0; i < left.length; i++) {
      const p = pts[left[(i + left.length - 1) % left.length]], c = pts[left[i]], n = pts[left[(i + 1) % left.length]];
      if (cross2(p, c, n) <= 0) continue;
      const blocked = left.some((k) => {
        const q = pts[k];
        if (q === p || q === c || q === n) return false;
        return cross2(p, c, q) >= 0 && cross2(c, n, q) >= 0 && cross2(n, p, q) >= 0;
      });
      if (blocked) continue;
      out.push([p, c, n]);
      left.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (left.length === 3) out.push(left.map((k) => pts[k]));
  return out;
}

/** Splits a triangle along its longest edge until it is small: the facets of the land. */
function facets(t: number[][], out: number[][][], size: number) {
  const len = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const e = [len(t[0], t[1]), len(t[1], t[2]), len(t[2], t[0])];
  const m = Math.max(...e);
  if (m < size) {
    out.push(t);
    return;
  }
  const i = e.indexOf(m);
  const a = t[i], b = t[(i + 1) % 3], c = t[(i + 2) % 3];
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  facets([a, mid, c], out, size);
  facets([mid, b, c], out, size);
}

// ── Static geometry, built once. ─────────────────────────────────────────────────────────────────────

const SEA_DEEP = hex("#0a3560"), SEA_MID = hex("#0d4a7c"), SEA_WARM = hex("#127a94");
type Face = { a: V3; b: V3; c: V3; centre: V3; color: RGB };

let OCEAN: Face[] | null = null;
function ocean() {
  if (OCEAN) return OCEAN;
  const { v, f } = icosphere(5);
  OCEAN = f.map(([ia, ib, ic], i) => {
    const centre = norm(add(add(v[ia], v[ib]), v[ic]));
    const k = fbm(centre[0] * 9 + 3, centre[2] * 9 + centre[1] * 4, 3, 2) + 0.5;
    return { a: scale(v[ia], EARTH_R), b: scale(v[ib], EARTH_R), c: scale(v[ic], EARTH_R), centre, color: vary(mixRGB(SEA_DEEP, SEA_MID, k), i, 0.04) };
  });
  return OCEAN;
}

const LAND = [hex("#3f7a45"), hex("#548c4a"), hex("#6a9a50"), hex("#8c9a5a")];
let LAND_FACES: Face[] | null = null;
function land() {
  if (LAND_FACES) return LAND_FACES;
  const out: Face[] = [];
  const height = (x: number, y: number) => 0.04 + Math.max(0, fbm(x * 1.7, y * 1.7, 3, 4) + 0.2) * 0.9;
  let n = 0;
  for (const ring of COASTS) {
    const small: number[][][] = [];
    for (const t of earclip(ring)) facets(t, small, 0.3);
    for (const t of small) {
      const [a, b, c] = t.map(([x, y]) => G(x, y, height(x, y)));
      const col = LAND[Math.floor(hash2(n, 7, 2) * LAND.length)];
      out.push({ a, b, c, centre: norm(a), color: vary(col, n++, 0.1) });
    }
  }
  LAND_FACES = out;
  return out;
}

// ── The storm ────────────────────────────────────────────────────────────────────────────────────────

export const STORM_R = 50; // 500 km: 1,000 km across, hypothetical.
export const EYE_R = 3.1;
const PEAK = 5.6;

const WHITE = hex("#fbfcfd"), MID = hex("#c9d3de"), LOW = hex("#7e8da0");

/** A point on the storm, at radius r and angle a (anticlockwise from above), height h. */
const P = (r: number, a: number, h: number): V3 => {
  const x = Math.cos(a) * r, z = -Math.sin(a) * r;
  const d = norm([x, EARTH_R, z]);
  return scale(d, EARTH_R + h);
};

/** How much cloud there is at (r, a): spiral bands winding in to a solid core, torn by noise. */
function density(r: number, a: number, t: number) {
  // It turns faster nearer the eye.
  const spin = t * (0.05 + 0.32 * Math.min(1, EYE_R * 2 / r));
  const q = a - spin;
  const lg = Math.log(r / EYE_R + 0.3);
  const wobble = (noise2(r * 0.09 + 11, Math.cos(q) * 2 + Math.sin(q) + 5, 5) - 0.5) * 0.9;
  const band = 0.5 + 0.5 * Math.cos(3 * (q + wobble) + 3.4 * lg);
  const x = Math.cos(q) * r, z = Math.sin(q) * r;
  const tear = fbm(x * 0.16 + 40, z * 0.16 + 9, 4, 6) + 0.5;
  const fine = fbm(x * 0.5, z * 0.5, 3, 8) + 0.5;
  const core = 1 - smooth(EYE_R * 1.6, EYE_R * 6.8, r);
  const edge = smooth(STORM_R, STORM_R * 0.55, r);
  return { d: Math.min(1, Math.max(core, band ** 1.5 * (0.5 + 1.15 * tear) * edge + core * 0.3)), fine };
}

function topOf(r: number, d: number, fine: number) {
  const wall = Math.exp(-(((r - EYE_R * 1.45) / (EYE_R * 1.7)) ** 2));
  return 0.35 + PEAK * (0.2 * d + 0.8 * wall * (0.7 + 0.3 * d)) * smooth(STORM_R * 1.02, STORM_R * 0.5, r) + (fine - 0.5) * 0.5 * (0.3 + d);
}

export type StormParts = { shadow: Tri[]; deck: Tri[]; wall: Tri[]; cirrus: Tri[] };

export function storm(t: number, cameraAlt: number): StormParts {
  const parts: StormParts = { shadow: [], deck: [], wall: [], cirrus: [] };
  const rings = 62, sectors = 168;
  const rOf = (i: number) => EYE_R * (STORM_R * 1.04 / EYE_R) ** (i / rings);
  // The grid is shared, so every face meets its neighbours.
  const W = sectors + 1;
  const pts: V3[] = new Array((rings + 1) * W), dens = new Float32Array((rings + 1) * W);
  for (let i = 0; i <= rings; i++) {
    const r = rOf(i);
    for (let j = 0; j <= sectors; j++) {
      const a = ((j % sectors) / sectors) * Math.PI * 2 + (i % 2 ? Math.PI / sectors : 0);
      const { d, fine } = density(r, a, t);
      dens[i * W + j] = d;
      pts[i * W + j] = P(r, a, topOf(r, d, fine));
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sectors; j++) {
      const k = i * W + j;
      const mean = (dens[k] + dens[k + 1] + dens[k + W] + dens[k + W + 1]) / 4;
      if (mean < 0.13) continue;
      const alpha = mean > 0.33 ? 1 : (mean - 0.13) / 0.2;
      const col = mean > 0.62 ? mixRGB(MID, WHITE, (mean - 0.62) / 0.38) : mixRGB(LOW, MID, mean / 0.62);
      const v = (i * 13 + j * 7) % 5 === 0 ? 0.06 : 0.025;
      parts.deck.push({ a: pts[k], b: pts[k + 1], c: pts[k + W + 1], color: vary(col, k, v), alpha });
      parts.deck.push({ a: pts[k], b: pts[k + W + 1], c: pts[k + W], color: vary(col, k + 3, v), alpha });
    }
  // Its shadow on the sea, slid away from the sun.
  const off: V3 = [-SUN[0] * 1.6, 0, -SUN[2] * 1.6];
  for (let i = 0; i < rings; i += 2)
    for (let j = 0; j < sectors; j += 2) {
      const r0 = rOf(i), r1 = rOf(i + 2), a0 = (j / sectors) * Math.PI * 2, a1 = ((j + 2) / sectors) * Math.PI * 2;
      const { d } = density((r0 + r1) / 2, (a0 + a1) / 2, t);
      if (d < 0.2) continue;
      const S = (r: number, a: number) => add(P(r, a, 0.1), off);
      const alpha = Math.min(0.42, d * 0.5);
      parts.shadow.push({ a: S(r0, a0), b: S(r0, a1), c: S(r1, a1), color: hex("#04121f"), alpha, glow: 1 }, { a: S(r0, a0), b: S(r1, a1), c: S(r1, a0), color: hex("#04121f"), alpha, glow: 1 });
    }
  // The eyewall: a stadium of even, staggered facets. The sun catches the far side and leaves the near side dark.
  const tiers = 15, around = 84;
  const wallAt = (k: number, j: number): V3 => {
    const v = k / tiers;
    const a = ((j + (k % 2 ? 0.5 : 0)) / around) * Math.PI * 2;
    const q = a - t * 0.3;
    const bulge = 1 + 0.13 * fbm(Math.cos(q) * 3.4 + 7 + v * 1.5, Math.sin(q) * 3.4 + v * 5.5, 3, 3);
    const rr = EYE_R * (0.52 + 0.48 * v ** 0.55) * bulge;
    return P(rr, a, 0.15 + v * (topOf(EYE_R, density(EYE_R, a, t).d, 0.5) - 0.15));
  };
  for (let k = 0; k < tiers; k++)
    for (let j = 0; j < around; j++) {
      const v = (k + 0.5) / tiers, a = (j / around) * Math.PI * 2;
      const soft = fbm(Math.cos(a) * 2.2 + 3 + v, Math.sin(a) * 2.2 + v * 3.2, 2, 13) + 0.5;
      const col = mixRGB(hex("#5d6b80"), hex("#d3dbe4"), Math.min(1, v ** 0.8 * (0.68 + 0.62 * soft)));
      const A = wallAt(k, j), B = wallAt(k, j + 1), C = wallAt(k + 1, j), D = wallAt(k + 1, j + 1);
      if (k % 2) {
        parts.wall.push({ a: A, b: B, c: D, color: vary(col, k * 31 + j, 0.025) }, { a: A, b: D, c: C, color: vary(col, k * 37 + j, 0.025) });
      } else {
        parts.wall.push({ a: A, b: B, c: C, color: vary(col, k * 31 + j, 0.025) }, { a: B, b: D, c: C, color: vary(col, k * 37 + j, 0.025) });
      }
    }
  // Thin cloud streaming out of the top in the opposite turn: the part that makes it read as enormous from far away.
  if (cameraAlt > 12) {
    const fade = smooth(12, 40, cameraAlt);
    const r = rng(19);
    for (let n = 0; n < 72; n++) {
      const a0 = r() * Math.PI * 2, r0 = STORM_R * (0.2 + r() * 0.45), len = STORM_R * (0.45 + r() * 0.5), wide = 0.45 + r() * 1.3, alpha = (0.08 + r() * 0.15) * fade;
      const rot = t * 0.02;
      for (let s = 0; s < 9; s++) {
        const k0 = s / 9, k1 = (s + 1) / 9;
        const at = (k: number, side: number): V3 => {
          const rr = r0 + len * k;
          const a = a0 - 0.9 * k - rot;
          return P(rr + side * wide * Math.sin(k * Math.PI), a, PEAK * 1.08);
        };
        const al = alpha * Math.sin(((k0 + k1) / 2) * Math.PI);
        parts.cirrus.push({ a: at(k0, -1), b: at(k0, 1), c: at(k1, 1), color: WHITE, alpha: al, glow: 0.8 }, { a: at(k0, -1), b: at(k1, 1), c: at(k1, -1), color: WHITE, alpha: al, glow: 0.8 });
      }
    }
  }
  return parts;
}

// ── A frame ──────────────────────────────────────────────────────────────────────────────────────────

/** The glow of the atmosphere round the Earth's edge, as a few rings that always face the camera. */
function atmosphere(out: Tri[], cam: V3) {
  const D = Math.hypot(cam[0], cam[1], cam[2]);
  if (D < EARTH_R * 1.02) return;
  const v = norm(cam);
  const c = scale(v, (EARTH_R * EARTH_R) / D);
  const rim = EARTH_R * Math.sqrt(1 - (EARTH_R * EARTH_R) / (D * D));
  const u = norm([v[1], -v[0], 0.001]);
  const w: V3 = [v[1] * u[2] - v[2] * u[1], v[2] * u[0] - v[0] * u[2], v[0] * u[1] - v[1] * u[0]];
  const n = 120;
  const bands: [number, number, number][] = [[0.998, 1.008, 0.75], [1.008, 1.018, 0.42], [1.018, 1.034, 0.2], [1.034, 1.06, 0.08]];
  for (const [r0, r1, alpha] of bands)
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const P2 = (a: number, r: number) => add(c, add(scale(u, Math.cos(a) * rim * r), scale(w, Math.sin(a) * rim * r)));
      const lit = Math.max(0.04, dot(norm(P2((a0 + a1) / 2, 1)), SUN) + 0.42);
      const col: RGB = [120 * lit, 180 * lit, 255 * Math.min(1, lit + 0.1)];
      const q = Math.min(1, alpha * Math.min(1, lit * 1.5));
      out.push({ a: P2(a0, r0), b: P2(a1, r0), c: P2(a1, r1), color: col, glow: 1, alpha: q, zBias: 4000 }, { a: P2(a0, r0), b: P2(a1, r1), c: P2(a0, r1), color: col, glow: 1, alpha: q, zBias: 4000 });
    }
}

export type SpaceShot = { pos: V3; target: V3; fov: number; t: number };

export function spaceFrame(s: SpaceShot): Frame {
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  const camera = { pos: s.pos, target: s.target, fov: s.fov };
  const alt = Math.hypot(...s.pos) - EARTH_R;
  // Draw order is by layer, top of the air last: everything here really is stacked.
  const layer = (faces: Tri[], bias: number) => {
    for (const q of faces) tris.push({ ...q, zBias: bias });
  };
  atmosphere(tris, s.pos);
  const see = (n: V3) => dot(n, s.pos) > EARTH_R * 0.985;
  for (const f of ocean()) if (see(f.centre)) tris.push({ a: f.a, b: f.b, c: f.c, color: f.color, mirror: 0.35, zBias: 3000 });
  for (const f of land()) if (see(f.centre)) tris.push({ a: f.a, b: f.b, c: f.c, color: f.color, zBias: 2000 });
  const parts = storm(s.t, alt);
  layer(parts.shadow, 1500);
  // The sea in the eye: dark, rough facets on an even lattice, foam in streaks, and low scud turning round its edge.
  const cell = 0.42, reach = EYE_R * 0.98;
  const seaAt = (i: number, j: number): V3 => {
    const x = (i + (j % 2 ? 0.5 : 0)) * cell + (hash2(i, j, 4) - 0.5) * cell * 0.45, z = j * cell * 0.87 + (hash2(j, i, 6) - 0.5) * cell * 0.45;
    return scale(norm([x, EARTH_R, z]), EARTH_R + 0.05 + 0.05 * hash2(i, j, 8));
  };
  const span = Math.ceil(reach / cell) + 1;
  for (let j = -span; j < span; j++)
    for (let i = -span; i < span; i++) {
      const A = seaAt(i, j), B = seaAt(i + 1, j), C = seaAt(i, j + 1), D = seaAt(i + 1, j + 1);
      if (Math.hypot(A[0], A[2]) > reach) continue;
      const streak = fbm(A[0] * 0.5 + A[2] * 0.9 + s.t * 0.05, A[2] * 0.5 - A[0] * 0.9, 3, 17) + 0.5;
      const foam = smooth(0.62, 0.76, streak) * 0.75;
      const base = mixRGB(hex("#0a3a5c"), SEA_WARM, 0.15 + 0.35 * hash2(i, j, 9));
      const c1 = mixRGB(base, hex("#d4e2e6"), foam), c2 = mixRGB(vary(base, i * 3 + j, 0.1), hex("#d4e2e6"), foam * 0.8);
      if (j & 1) tris.push({ a: A, b: B, c: D, color: c1, zBias: 1400, mirror: 0.5 }, { a: A, b: D, c: C, color: c2, zBias: 1400, mirror: 0.5 });
      else tris.push({ a: A, b: B, c: C, color: c1, zBias: 1400, mirror: 0.5 }, { a: B, b: D, c: C, color: c2, zBias: 1400, mirror: 0.5 });
    }
  for (let n = 0; n < 44; n++) {
    const R0 = rng(n + 90);
    const a = R0() * Math.PI * 2 + s.t * (0.3 + R0() * 0.12), rr = EYE_R * (0.42 + R0() * 0.4), h = 0.3 + R0() * 0.4, w = 0.26 + R0() * 0.5;
    const q = (dx: number, dy: number) => P(rr + dx, a + dy / rr, h);
    tris.push({ a: q(-w * 0.5, -w * 1.5), b: q(w * 0.45, -w * 0.9), c: q(w * 0.5, w * 1.6), color: hex("#dde5ec"), alpha: 0.72, zBias: 700 }, { a: q(-w * 0.5, -w * 1.5), b: q(w * 0.5, w * 1.6), c: q(-w * 0.4, w), color: hex("#c3cfda"), alpha: 0.72, zBias: 700 });
  }
  layer(parts.deck, 40);
  layer(parts.wall, 0);
  layer(parts.cirrus, -60);
  // Lightning inside the eyewall.
  const rate = 2.4, k = Math.floor(s.t * rate);
  const r = rng(k * 7 + 3);
  const fire = r(), when = r() / rate, dt = s.t - k / rate - when;
  if (fire < 0.7 && dt >= 0 && dt < 0.2) {
    const a = r() * Math.PI * 2, rr = EYE_R * (1.3 + r() * 1.6);
    const p = P(rr, a, PEAK * 0.55);
    const f = dt < 0.05 || (dt > 0.1 && dt < 0.14) ? 1 : 0.35;
    glows.push({ p, radius: EYE_R * 1.7, color: [205, 215, 255], alpha: 0.75 * f });
    lights.push({ p, color: [215, 225, 255], intensity: 2.2 * f, range: EYE_R * 4 });
  }
  // From inside the eye the sky is blue; from orbit it is black.
  const air = 1 - smooth(4, 40, alt);
  const env: Env = {
    skyTop: mixRGB([1, 2, 6], hex("#2a6aa8"), air),
    skyBottom: mixRGB([2, 4, 10], hex("#a9cce0"), air),
    fog: hex("#9fb9cb"),
    fogNear: alt < 30 ? 60 : 1e5,
    fogFar: alt < 30 ? 400 : 2e5,
    sun: SUN,
    sunColor: [255, 244, 228],
    ambient: mixRGB([46, 58, 82], [120, 135, 158], air),
    stars: 0.55 * (1 - air),
  };
  return { tris, camera, env, glowsFront: glows, lights };
}
