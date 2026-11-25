// The sea as low-poly solids: a great whale that swims, opens its jaw and fills its throat, a freediver, krill, the
// surface seen from below and from above, light shafts, drifting specks, and the inside of a whale's mouth.
// 1 unit = 1 metre. Animals face +z, backs up, at yaw 0; pitch −90° points them straight up.
import { add, clamp01, cross, dot, hex, mix3, mixRGB, norm, scale, sub, type Camera, type Glow, type RGB, type Tri, type V3 } from "./engine";
import { box, fbm, hash2, icosphere, noise2, poseFn, rng, smooth, sphere, type Pose } from "./world";

export type T3 = (v: V3) => V3;

const quad = (out: Tri[], a: V3, b: V3, c: V3, d: V3, color: RGB, extra: Partial<Tri> = {}) => {
  out.push({ a, b, c, color, ...extra }, { a, b: c, c: d, color, ...extra });
};

// ── The whale ────────────────────────────────────────────────────────────────────────────────────────

export type WhaleOpts = {
  length?: number;
  /** The tail's beat, in radians. */
  phase?: number;
  /** How strongly it swims, 0 gliding … 1. */
  beat?: number;
  /** Jaw, 0 shut … 1 wide. */
  mouth?: number;
  /** Throat, 0 slack … 1 full of water. */
  pouch?: number;
  /** Bends the body sideways: + curls the tail towards +x. */
  curve?: number;
  /** Flippers: + lifts them away from the body. */
  flap?: number;
  back?: RGB;
  belly?: RGB;
  /** Flipper length against a blue whale's. */
  flippers?: number;
  /** 0…1: how much it glows through the murk (for a whale far off). */
  glow?: number;
  /** Where the camera is. The jaw is thin, so each side of it is only drawn when the camera is on that side. */
  eye?: V3;
  /** Reel time: sunlight rippling over the back (caustics). Leave out where there's no sun overhead. */
  light?: number;
  /** How bright those ripples are, 0…1 (default 0.5). */
  dapple?: number;
};

/** Sunlight focused by the waves overhead: a slow net of bright lines, 0…1, at a point of the world. */
export function caustic(x: number, z: number, t: number) {
  const a = Math.sin(x * 1.25 + t * 0.9 + 1.6 * Math.sin(z * 0.8 + t * 0.55));
  const b = Math.sin(z * 1.1 - t * 0.75 + 1.6 * Math.sin(x * 0.7 - t * 0.5));
  return clamp01(1 - Math.abs(a + b) * 0.9) ** 2.2;
}

/** [along the body 0 snout … 1 tail, half width, top, bottom], as fractions of the length. */
const BODY: [number, number, number, number][] = [
  [0, 0.014, 0.004, 0.008],
  [0.02, 0.034, 0.012, 0.018],
  [0.06, 0.052, 0.022, 0.031],
  [0.11, 0.063, 0.031, 0.044],
  [0.17, 0.07, 0.036, 0.056],
  [0.23, 0.074, 0.048, 0.064],
  [0.3, 0.076, 0.056, 0.069],
  [0.4, 0.075, 0.06, 0.07],
  [0.5, 0.069, 0.058, 0.063],
  [0.6, 0.057, 0.052, 0.051],
  [0.7, 0.042, 0.043, 0.039],
  [0.8, 0.028, 0.033, 0.029],
  [0.88, 0.017, 0.025, 0.021],
  [0.95, 0.009, 0.016, 0.014],
  [1, 0.0015, 0.003, 0.003],
];
/** Where the jaw hinges, along the body. */
const HINGE = 0.24;
const STATIONS = 52;
const UPPER = 14, LOWER = 18;

function girth(s: number) {
  let i = 1;
  while (i < BODY.length - 1 && BODY[i][0] < s) i++;
  const a = BODY[i - 1], b = BODY[i];
  const k = clamp01((s - a[0]) / (b[0] - a[0]));
  return [1, 2, 3].map((j) => a[j] + (b[j] - a[j]) * k);
}

/** The line of the mouth: level along the snout, dropping to the corner below the eye. */
const mouthLine = (s: number) => -0.002 - 0.02 * smooth(0.12, HINGE, s) * (1 - smooth(HINGE, 0.42, s));

/** Body space → world for a whale: the swimming bend, then its pose. `s` is how far along the body the point belongs. */
function swim(pose: Pose, o: WhaleOpts) {
  const L = o.length ?? 27, T = poseFn({ ...pose, size: 1 });
  const phase = o.phase ?? 0, beat = o.beat ?? 0.6, curve = o.curve ?? 0;
  const lift = (s: number) => beat * L * (0.006 + 0.052 * s * s) * Math.sin(phase - s * 3.2);
  return (p: V3, s: number): V3 => T([p[0] + curve * L * 0.22 * Math.max(0, s - 0.2) ** 2, p[1] + lift(s), p[2]]);
}

export function whale(out: Tri[], pose: Pose, o: WhaleOpts = {}) {
  const L = o.length ?? 27, W = swim(pose, o);
  const mouth = o.mouth ?? 0, pouch = o.pouch ?? 0;
  const back = o.back ?? hex("#58798c"), belly = o.belly ?? hex("#9db4ba");
  const look: Partial<Tri> = o.glow ? { glow: o.glow } : {};
  const z = (s: number) => L * (0.5 - s);
  const hinge: V3 = [0, mouthLine(HINGE) * L, z(HINGE)];

  /** Opens a lower-jaw point about the hinge; the throat behind follows less and less. */
  const jaw = (p: V3, s: number): V3 => {
    const k = mouth * (1 - smooth(HINGE - 0.04, HINGE + 0.07, s)) * 1.2;
    if (!k) return p;
    const dy = p[1] - hinge[1], dz = p[2] - hinge[2];
    const c = Math.cos(k), n = Math.sin(k);
    return [p[0] * (1 + 0.16 * mouth * (1 - smooth(0, HINGE, s))), hinge[1] + dy * c - dz * n, hinge[2] + dz * c + dy * n];
  };
  const at = (i: number) => i / STATIONS;
  const bulge = (s: number) => pouch * 0.085 * smooth(0.02, 0.17, s) * (1 - smooth(0.32, 0.6, s)) + mouth * 0.03 * smooth(0.12, 0.26, s) * (1 - smooth(0.3, 0.55, s));

  const upper: V3[][] = [], lower: V3[][] = [];
  for (let i = 0; i <= STATIONS; i++) {
    const s = at(i);
    const [w, top, bot] = girth(s);
    const ym = mouthLine(s);
    // The top of the head is flat with a low ridge; the body behind is round.
    const flat = 1 - smooth(0.16, 0.32, s);
    upper.push(
      Array.from({ length: UPPER + 1 }, (_, j) => {
        const q = (j / UPPER) * Math.PI;
        const sn = Math.sin(q);
        const mid = Math.exp(-(((q - Math.PI / 2) / 0.32) ** 2));
        const ridge = mid * (0.0032 * smooth(0.03, 0.09, s) * (1 - smooth(0.17, 0.2, s)) + 0.0085 * Math.exp(-(((s - 0.205) / 0.016) ** 2)));
        return W([w * Math.cos(q) * L, (ym + (top - ym) * (sn * (1 - flat * 0.45) + flat * 0.45 * sn ** 5) + ridge) * L, z(s)], s);
      }),
    );
    const g = bulge(s);
    lower.push(
      Array.from({ length: LOWER + 1 }, (_, j) => {
        const q = (j / LOWER) * Math.PI;
        const sn = Math.sin(q);
        return W(jaw([(w + g * 0.55 * sn) * Math.cos(q) * L, (ym - (bot + ym + g) * sn) * L, z(s)], s), s);
      }),
    );
  }

  const lip = Math.round(HINGE * STATIONS) + 1;
  /** Whether the camera sees the outside of a jaw face whose hollow side is towards `hollow`. */
  const outside = (a: V3, b: V3, c: V3, hollow: V3) => {
    if (!o.eye) return true;
    let n = cross(sub(b, a), sub(c, a));
    if (dot(n, sub(a, hollow)) < 0) n = scale(n, -1);
    return dot(n, sub(o.eye, a)) > 0;
  };

  // Blue-grey dappled with paler grey, countershaded; sunlight moving over the back.
  const MOTTLE = mixRGB(back, [206, 220, 226], 0.42);
  const tone = (s: number, under: number, round: number, i: number, j: number): RGB => {
    const spots = fbm(s * L * 0.55, round * L * 0.07, 3, 4);
    let c = mixRGB(back, MOTTLE, smooth(0.1, 0.45, spots) * 0.55);
    if (hash2(i, j, 11) > 0.94) c = mixRGB(c, MOTTLE, 0.45);
    return mixRGB(c, belly, under * 0.8);
  };
  const sunlit = (c: RGB, a: V3, b: V3, d: V3, up: number): RGB => {
    if (o.light === undefined || up <= 0) return c;
    const x = (a[0] + b[0] + d[0]) / 3, y = (a[1] + b[1] + d[1]) / 3, zz = (a[2] + b[2] + d[2]) / 3;
    const k = caustic(x, zz, o.light) * up * (o.dapple ?? 0.5) * clamp01(1 + y / 28);
    return mixRGB(c, [228, 250, 255], k * 0.55);
  };
  for (let i = 0; i < STATIONS; i++) {
    const s = at(i + 0.5);
    for (let j = 0; j < UPPER; j++) {
      const q = ((j + 0.5) / UPPER) * Math.PI, edge = Math.abs(Math.cos(q));
      const c = mixRGB(tone(s, 0, q, i, j), [10, 25, 40], (1 - edge) * 0.07);
      quad(out, upper[i][j], upper[i][j + 1], upper[i + 1][j + 1], upper[i + 1][j], sunlit(c, upper[i][j], upper[i + 1][j + 1], upper[i][j + 1], Math.sin(q) - 0.2), look);
    }
    for (let j = 0; j < LOWER; j++) {
      if (mouth > 0.02 && i < lip && !outside(lower[i][j], lower[i][j + 1], lower[i + 1][j], mix3(lower[i][0], lower[i][LOWER], 0.5))) continue;
      const under = Math.sin(((j + 0.5) / LOWER) * Math.PI);
      const pleated = s < 0.56 && s > 0.012;
      let c = tone(s, smooth(0.15, 0.85, under), Math.PI + ((j + 0.5) / LOWER) * Math.PI, i, j + 40);
      if (pleated && j % 2 && under > 0.35) c = mixRGB(c, [38, 58, 74], 0.2 + 0.2 * (pouch + mouth) * 0.5);
      quad(out, lower[i][j], lower[i][j + 1], lower[i + 1][j + 1], lower[i + 1][j], c, look);
    }
  }

  // Both ends closed: the tip of each jaw, and the tail stock.
  for (const [row, n] of [[upper[0], UPPER], [lower[0], LOWER], [upper[STATIONS], UPPER], [lower[STATIONS], LOWER]] as [V3[], number][]) for (let j = 1; j < n; j++) out.push({ a: row[0], b: row[j], c: row[j + 1], color: mixRGB(back, [10, 25, 40], 0.35), ...look });

  // Inside the mouth, only worth drawing when it's open.
  if (mouth > 0.02) {
    const ROOF = hex("#b0606a"), FLOOR = hex("#d8838a"), BALEEN = hex("#2b3440"), DEEP = hex("#220c14");
    const wet: Partial<Tri> = { ...look, glow: Math.max(o.glow ?? 0, 0.28) };
    for (let i = 0; i < lip; i++) {
      const deep = i / lip;
      const a = upper[i], b = upper[i + 1], c = lower[i], d = lower[i + 1];
      // The palate, split down the middle and arched up a little into the head.
      const ra = mix3(mix3(a[0], a[UPPER], 0.5), a[UPPER / 2], 0.3), rb = mix3(mix3(b[0], b[UPPER], 0.5), b[UPPER / 2], 0.3);
      for (const e of [0, UPPER]) quad(out, a[e], ra, rb, b[e], mixRGB(ROOF, DEEP, deep * 0.8), { ...wet, zBias: -0.02 });
      // The floor of the lower jaw: a pink basin just inside the pleats.
      const across = 6;
      const basin = (row: V3[], k: number) => {
        const j = (k / across) * LOWER, j0 = Math.min(LOWER - 1, Math.floor(j));
        const skin = mix3(row[j0], row[j0 + 1], j - j0);
        return mix3(skin, mix3(row[0], row[LOWER], 0.5), 0.12);
      };
      for (let k = 0; k < across; k++) if (!o.eye || !outside(basin(c, k), basin(c, k + 1), basin(d, k), mix3(c[0], c[LOWER], 0.5))) quad(out, basin(c, k), basin(c, k + 1), basin(d, k + 1), basin(d, k), mixRGB(FLOOR, DEEP, deep * 0.8 + (k % 2) * 0.06), { ...wet, zBias: -0.06 });
      // Baleen: dark plates hanging from both edges of the palate.
      if (i > 0) {
        for (const e of [0, UPPER]) {
          const down = scale(norm(sub(lower[lip][LOWER / 2], upper[lip][UPPER / 2])), L * 0.04 * Math.min(1, 0.3 + (i / lip) * 1.6));
          const n = 4;
          for (let k = 0; k < n; k++) {
            const p = mix3(mix3(a[e], b[e], k / n), ra, 0.1), q = mix3(mix3(a[e], b[e], (k + 1) / n), ra, 0.1);
            const drop = (h: number) => scale(down, 0.97 + 0.06 * hash2(i, h, 4));
            quad(out, p, q, add(mix3(q, rb, 0.08), drop(k + 1)), add(mix3(p, ra, 0.08), drop(k)), mixRGB(BALEEN, hex("#77705c"), 0.15 + 0.3 * (k % 2)), { zBias: -0.1, ...look });
          }
        }
      }
    }
    // The gullet: darkness where the two halves meet.
    const u = upper[lip], l = lower[lip];
    const ring = [...u, ...[...l].reverse()];
    const mid = ring.reduce((p, q) => add(p, scale(q, 1 / ring.length)), [0, 0, 0] as V3);
    ring.forEach((p, k) => out.push({ a: p, b: ring[(k + 1) % ring.length], c: mid, color: DEEP, zBias: 0.4, ...look }));
  }

  // Eyes: small, dark, just above the corner of the mouth.
  for (const side of [1, -1]) {
    const s = 0.215;
    const [w] = girth(s);
    const p: V3 = [side * w * 0.985 * L, (mouthLine(s) + 0.008) * L, z(s)];
    const r = 0.0075 * L;
    const N = 12;
    const ringAt = (k: number, rr: number, push: number): V3 => W([p[0] + side * push, p[1] + Math.sin((k / N) * Math.PI * 2) * rr * 0.8, p[2] + Math.cos((k / N) * Math.PI * 2) * rr * 1.25], s);
    const centre = W([p[0] + side * r * 0.5, p[1], p[2]], s), pupil = W([p[0] + side * r * 0.62, p[1], p[2]], s);
    for (let k = 0; k < N; k++) {
      // A soft fold of skin round the eye, the dark eye, and its wet, brown-black centre.
      quad(out, ringAt(k, r * 1.5, 0), ringAt(k + 1, r * 1.5, 0), ringAt(k + 1, r * 0.96, r * 0.08), ringAt(k, r * 0.96, r * 0.08), mixRGB(back, [20, 30, 40], 0.1), { zBias: -0.3 });
      out.push({ a: ringAt(k, r, r * 0.1), b: ringAt(k + 1, r, r * 0.1), c: centre, color: mixRGB(back, [12, 20, 28], 0.6), zBias: -0.35 });
      out.push({ a: ringAt(k, r * 0.55, r * 0.5), b: ringAt(k + 1, r * 0.55, r * 0.5), c: pupil, color: k % 2 ? hex("#1a1210") : hex("#120c0b"), zBias: -0.5, mirror: 0.9 });
    }
    // A catch of light.
    out.push({ a: W([p[0] + side * r * 0.66, p[1] + r * 0.22, p[2] + r * 0.05], s), b: W([p[0] + side * r * 0.66, p[1] + r * 0.32, p[2] - r * 0.12], s), c: W([p[0] + side * r * 0.66, p[1] + r * 0.12, p[2] - r * 0.14], s), color: hex("#e8f6fa"), glow: 0.8, alpha: 0.8, zBias: -0.6 });
  }

  // Two blowholes behind the splashguard: dark slits that open in a V.
  for (const side of [1, -1]) {
    const s0 = 0.214, s1 = 0.232;
    const top = (s: number) => girth(s)[1] * 0.985 * L + 0.003 * L * Math.exp(-(((s - 0.205) / 0.016) ** 2));
    const P = [[0.0015, s0], [0.0055, s0 + 0.004], [0.0075, s1], [0.003, s1 - 0.003]].map(([x, s]) => W([side * x * L, top(s), z(s)], s));
    quad(out, P[0], P[1], P[2], P[3], mixRGB(back, [8, 14, 20], 0.7), { zBias: -0.3 });
  }

  // Flippers: long, slim, pale beneath and at the tip; they ease up and down as she swims.
  const fl = (o.flippers ?? 1) * L * 0.135, flap = (o.flap ?? 0) + 0.12 * Math.sin((o.phase ?? 0) * 0.5 + 0.8);
  for (const side of [1, -1]) {
    const s = 0.3;
    const [w] = girth(s);
    const root: V3 = [side * w * 0.88 * L, -0.032 * L, z(s)];
    const away = norm([side * (0.74 + 0.2 * flap), -0.4 + 0.55 * flap, -0.5]);
    const chord: V3 = [side * 0.12, 0.12, -1];
    const thick = norm(cross(away, norm(chord)));
    const prof: [number, number, number, number][] = [[0, 0.34, 0.07, 0], [0.22, 0.34, 0.06, 0.02], [0.5, 0.29, 0.045, 0.05], [0.78, 0.19, 0.03, 0.09], [1, 0.035, 0.008, 0.14]];
    const rows = prof.map(([k, c, h, sweep]) => {
      const m = add(add(root, scale(away, k * fl)), scale(norm(chord), sweep * fl));
      const half = scale(norm(chord), (c * fl) / 2), up = scale(thick, h * fl * 0.7 * side);
      return [sub(m, half), add(m, up), add(m, half), sub(m, up)].map((p) => W(p, s));
    });
    const topSide = mixRGB(back, belly, 0.12), under = mixRGB(belly, back, 0.4);
    for (let i = 0; i < rows.length - 1; i++) {
      const tip = (i + 0.5) / (rows.length - 1);
      for (let k = 0; k < 4; k++) quad(out, rows[i][k], rows[i][(k + 1) % 4], rows[i + 1][(k + 1) % 4], rows[i + 1][k], mixRGB(k < 2 ? topSide : under, [214, 226, 230], smooth(0.55, 1, tip) * 0.25), look);
    }
  }

  // A small dorsal fin, far back.
  {
    const s = 0.74, [, top] = girth(s);
    const y = top * 0.93 * L;
    const a: V3 = [0, y, z(s) + 0.028 * L], b: V3 = [0, y * 0.94, z(s) - 0.03 * L], tip: V3 = [0, y + 0.02 * L, z(s) - 0.026 * L];
    for (const side of [1, -1]) {
      const m: V3 = [side * 0.006 * L, y * 0.96, z(s) - 0.004 * L];
      out.push({ a: W(a, s), b: W(tip, s), c: W(m, s), color: mixRGB(back, [10, 25, 40], 0.2), ...look }, { a: W(m, s), b: W(tip, s), c: W(b, s), color: mixRGB(back, [10, 25, 40], 0.26), ...look });
    }
  }

  // Flukes: they lag the tail, so they drive the water.
  {
    const phase = o.phase ?? 0, beat = o.beat ?? 0.6;
    const tilt = beat * 0.5 * Math.cos(phase - 3.2 - 0.5);
    const root: V3 = [0, 0, z(0.975)];
    const c = Math.cos(tilt), n = Math.sin(tilt);
    const F = (x: number, y: number, q: number): V3 => W([x * L, root[1] + (y * c - q * n) * L, root[2] + (q * c + y * n) * L], 0.99);
    for (const side of [1, -1]) {
      // Leading edge out to the tip, trailing edge back to the notch: front, tip, back, with a thicker root.
      const P = [F(side * 0.004, 0.006, 0.035), F(side * 0.055, 0.004, -0.004), F(side * 0.118, 0, -0.06), F(side * 0.062, 0.001, -0.05), F(0, 0.002, -0.034)];
      const Q = [F(side * 0.004, -0.006, 0.035), F(side * 0.055, -0.003, -0.004), P[2], P[3], F(0, -0.002, -0.034)];
      const top = mixRGB(back, [12, 28, 42], 0.22);
      const lit: Partial<Tri> = { ...look, glow: Math.max(o.glow ?? 0, 0.22) };
      for (const [X, col] of [[P, top], [Q, mixRGB(belly, back, 0.2)]] as [V3[], RGB][]) {
        out.push({ a: X[0], b: X[1], c: X[4], color: col, ...lit }, { a: X[1], b: X[3], c: X[4], color: mixRGB(col, [0, 0, 0], 0.06), ...lit }, { a: X[1], b: X[2], c: X[3], color: mixRGB(col, [255, 255, 255], 0.05), ...lit });
      }
      quad(out, P[0], P[1], Q[1], Q[0], top, lit);
    }
  }
}

/** A point in the whale's own space ([x, y, along 0 snout … 1 tail], fractions of its length) in the world. */
export function whalePoint(pose: Pose, o: WhaleOpts, p: V3): V3 {
  const L = o.length ?? 27;
  return swim(pose, o)([p[0] * L, p[1] * L, L * (0.5 - p[2])], p[2]);
}

// ── The orca ─────────────────────────────────────────────────────────────────────────────────────────

/** [along the body 0 snout … 1 tail, half width, top, bottom], as fractions of the length. */
const ORCA: [number, number, number, number][] = [
  [0, 0.02, 0.015, 0.02], [0.05, 0.06, 0.045, 0.05], [0.14, 0.09, 0.085, 0.08], [0.28, 0.112, 0.112, 0.105], [0.42, 0.11, 0.112, 0.108], [0.58, 0.088, 0.09, 0.085], [0.74, 0.052, 0.062, 0.055], [0.88, 0.024, 0.04, 0.035], [1, 0.008, 0.016, 0.014],
];

/** An orca: black over white, the eye patch, the grey saddle, the tall fin (taller on a bull). */
export function orca(out: Tri[], pose: Pose, o: { length?: number; phase?: number; beat?: number; bull?: boolean } = {}) {
  const L = o.length ?? 6.5, T = poseFn({ ...pose, size: 1 }), phase = o.phase ?? 0, beat = o.beat ?? 0.7;
  const BLACK = hex("#12181f"), WHITE = hex("#e8f0f2"), GREY = hex("#7d8f9a");
  const W = (p: V3, q: number): V3 => T([p[0], p[1] + beat * L * (0.004 + 0.06 * q * q) * Math.sin(phase - q * 3), p[2]]);
  const z = (q: number) => L * (0.5 - q);
  const N = 12;
  const rows = ORCA.map(([q, w, top, bot]) => Array.from({ length: N }, (_, j) => {
    const a = (j / N) * Math.PI * 2, sn = Math.sin(a);
    return W([Math.cos(a) * w * L, (sn > 0 ? sn * top : sn * bot) * L, z(q)], q);
  }));
  for (let i = 0; i < rows.length - 1; i++) {
    const q = (ORCA[i][0] + ORCA[i + 1][0]) / 2;
    for (let j = 0; j < N; j++) {
      const a = ((j + 0.5) / N) * 360;
      let c = BLACK;
      if (a > 215 && a < 325 && q < 0.8) c = WHITE;
      else if (q > 0.5 && q < 0.68 && a > 45 && a < 135) c = GREY;
      quad(out, rows[i][j], rows[i][(j + 1) % N], rows[i + 1][(j + 1) % N], rows[i + 1][j], mixRGB(c, [60, 80, 95], 0.1 * (j % 2)), c === WHITE ? { glow: 0.3 } : {});
    }
  }
  for (const r of [rows[0], rows[rows.length - 1]]) for (let j = 1; j < N - 1; j++) out.push({ a: r[0], b: r[j], c: r[j + 1], color: BLACK });
  // The white patch behind each eye.
  for (const side of [1, -1]) {
    const P = [[0.1, 0.03], [0.15, 0.052], [0.205, 0.04], [0.16, 0.022]].map(([q, y]) => W([side * L * (0.066 + (q - 0.1) * 0.36) * 1.04, y * L, z(q)], q));
    quad(out, P[0], P[1], P[2], P[3], WHITE, { zBias: -0.25 });
    // Paddle flippers.
    const root: V3 = [side * 0.095 * L, -0.06 * L, z(0.27)];
    const tip = add(root, [side * 0.13 * L, -0.09 * L, -0.07 * L]);
    const F = [root, add(root, [side * 0.07 * L, -0.03 * L, 0.01 * L]), tip, add(root, [side * 0.02 * L, -0.05 * L, -0.1 * L])].map((p) => W(p, 0.28));
    quad(out, F[0], F[1], F[2], F[3], BLACK);
  }
  const tall = (o.bull ? 0.2 : 0.12) * L;
  {
    const a = W([0, 0.105 * L, z(0.4)], 0.4), b = W([0, 0.1 * L + tall, z(0.5) - 0.02 * L], 0.45), c = W([0, 0.085 * L, z(0.55)], 0.55);
    for (const side of [1, -1]) {
      const m = W([side * 0.018 * L, 0.1 * L + tall * 0.2, z(0.48)], 0.47);
      out.push({ a, b, c: m, color: BLACK }, { a: m, b, c, color: mixRGB(BLACK, [70, 90, 105], 0.2) });
    }
  }
  const tilt = beat * 0.5 * Math.cos(phase - 3.4), cs = Math.cos(tilt), sn = Math.sin(tilt);
  const K = (x: number, q: number): V3 => W([x * L, -q * sn * L, z(0.97) + q * cs * L], 0.99);
  for (const side of [1, -1]) {
    const P = [K(0, 0.04), K(side * 0.07, 0), K(side * 0.14, -0.06), K(side * 0.06, -0.06), K(0, -0.035)];
    for (let k = 1; k < 4; k++) out.push({ a: P[0], b: P[k], c: P[k + 1], color: BLACK });
  }
}

// ── The freediver ────────────────────────────────────────────────────────────────────────────────────

export type DiverOpts = { kick?: number; arms?: "ahead" | "side" | "wide" | "brace"; suit?: RGB; fins?: RGB; tank?: boolean; zBias?: number; glow?: number };

/** A freediver, 1.75 m and long fins. Head towards +z, chest down: pitch −90° stands them upright. */
export function diver(out: Tri[], pose: Pose, o: DiverOpts = {}) {
  const T = poseFn({ ...pose, size: pose.size ?? 1 });
  const suit = o.suit ?? hex("#1d3346"), accent = hex("#ff8a2a"), fins = o.fins ?? hex("#ffd23f"), skin = hex("#c98f68");
  const kick = o.kick ?? 0;
  const ex: Partial<Tri> = { zBias: o.zBias ?? -0.4, ...(o.glow ? { glow: o.glow } : {}) };
  /** A tapered six-sided tube between two points. */
  const tube = (a: V3, b: V3, ra: number, rb: number, color: RGB, squash = 1) => {
    const axis = norm(sub(b, a));
    const u = norm(cross(axis, Math.abs(axis[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0])), v = cross(axis, u);
    const ring = (c: V3, r: number) => Array.from({ length: 6 }, (_, i) => add(c, add(scale(u, Math.cos((i / 6) * Math.PI * 2) * r), scale(v, Math.sin((i / 6) * Math.PI * 2) * r * squash))));
    const A = ring(a, ra).map(T), B = ring(b, rb).map(T);
    for (let i = 0; i < 6; i++) quad(out, A[i], A[(i + 1) % 6], B[(i + 1) % 6], B[i], i % 2 ? color : mixRGB(color, [0, 0, 0], 0.08), ex);
    for (const R of [A, B]) for (let i = 1; i < 5; i++) out.push({ a: R[0], b: R[i], c: R[i + 1], color, ...ex });
  };
  // Torso, hips, hood.
  tube([0, 0, 0.5], [0, 0, 0.22], 0.2, 0.17, suit, 0.62);
  tube([0, 0, 0.22], [0, 0, -0.06], 0.17, 0.165, suit, 0.66);
  tube([0.13, -0.02, 0.47], [0.11, -0.02, 0.0], 0.03, 0.03, accent);
  tube([-0.13, -0.02, 0.47], [-0.11, -0.02, 0.0], 0.03, 0.03, accent);
  tube([0, 0, 0.5], [0, 0, 0.58], 0.08, 0.075, suit);
  const ico = icosphere(1);
  ico.f.forEach(([a, b, c]) => {
    const pts = [a, b, c].map((i) => T(add([0, 0.01, 0.69], [ico.v[i][0] * 0.105, ico.v[i][1] * 0.12, ico.v[i][2] * 0.135])));
    const under = (ico.v[a][1] + ico.v[b][1] + ico.v[c][1]) / 3 < -0.35;
    out.push({ a: pts[0], b: pts[1], c: pts[2], color: under ? skin : suit, ...ex });
  });
  // Mask, on the face (chest side).
  for (const x of [-0.045, 0.045]) box(out, { pos: T([x, -0.13, 0.74]), yaw: pose.yaw, pitch: pose.pitch, roll: pose.roll, size: [0.085, 0.05, 0.07] }, { color: hex("#9fe6ff"), glow: 0.35, zBias: (o.zBias ?? -0.4) - 0.05 });
  // Arms.
  const A = o.arms ?? "side";
  for (const s of [1, -1]) {
    const sh: V3 = [s * 0.2, 0, 0.44];
    const wob = Math.sin(kick * 0.7 + s) * 0.06;
    const [el, ha]: [V3, V3] =
      A === "ahead" ? [[s * 0.2, -0.04, 0.74], [s * 0.08, -0.04, 1.02]]
      : A === "wide" ? [[s * 0.46, -0.04 + wob, 0.42], [s * 0.66, -0.1 + wob * 2, 0.6]]
      : A === "brace" ? [[s * 0.38, -0.16, 0.5], [s * 0.3, -0.42, 0.62]]
      : [[s * 0.28, -0.05 + wob, 0.18], [s * 0.26, -0.1 + wob, -0.08]];
    tube(sh, el, 0.065, 0.052, suit);
    tube(el, ha, 0.052, 0.038, suit);
    tube(ha, add(ha, scale(norm(sub(ha, el)), 0.1)), 0.04, 0.03, skin);
  }
  // Legs, kicking from the hip, and long bi-fins.
  for (const s of [1, -1]) {
    const k = Math.sin(kick + (s > 0 ? 0 : Math.PI));
    const hip: V3 = [s * 0.09, 0, -0.04], knee: V3 = [s * 0.1, k * 0.14, -0.46], foot: V3 = [s * 0.1, k * 0.27, -0.88];
    tube(hip, knee, 0.095, 0.07, suit);
    tube(knee, foot, 0.07, 0.045, suit);
    const bend = Math.cos(kick + (s > 0 ? 0 : Math.PI)) * 0.16;
    const m: V3 = add(foot, [0, k * 0.1, -0.34]), e: V3 = add(m, [0, k * 0.06 - bend, -0.4]);
    const w = 0.095;
    const P = [foot, m, e].map((p, i) => [T([p[0] - w * (0.7 + i * 0.2), p[1], p[2]]), T([p[0] + w * (0.7 + i * 0.2), p[1], p[2]])]);
    quad(out, P[0][0], P[0][1], P[1][1], P[1][0], fins, ex);
    quad(out, P[1][0], P[1][1], P[2][1], P[2][0], mixRGB(fins, [255, 255, 255], 0.15), ex);
  }
  if (o.tank) tube([0, 0.2, 0.46], [0, 0.2, -0.02], 0.09, 0.09, hex("#d8dde0"));
}

/** Air trailing up from a point: a wobbling column of bubbles. */
export function bubbles(out: Tri[], from: V3, t: number, o: { n?: number; seed?: number; rise?: number; spread?: number; size?: number } = {}) {
  const n = o.n ?? 16, R = rng(o.seed ?? 3);
  for (let i = 0; i < n; i++) {
    const life = 1.4 + R() * 1.4, u = (t / life + R()) % 1;
    const a = R() * 6.28, sp = (o.spread ?? 0.35) * u;
    const p: V3 = [from[0] + Math.cos(a + t * 2 + i) * sp, from[1] + u * life * (o.rise ?? 1.3), from[2] + Math.sin(a + t * 2 + i) * sp];
    const r = (o.size ?? 0.045) * (0.5 + R()) * (0.6 + u);
    out.push({ a: [p[0] - r, p[1], p[2]], b: [p[0], p[1] + r, p[2]], c: [p[0] + r, p[1], p[2]], color: hex("#d9f6ff"), glow: 0.5, alpha: 0.5 * (1 - u) + 0.1 });
    out.push({ a: [p[0] - r, p[1], p[2]], b: [p[0], p[1] - r, p[2]], c: [p[0] + r, p[1], p[2]], color: hex("#8fd4ec"), glow: 0.4, alpha: 0.4 * (1 - u) + 0.1 });
  }
}

// ── Krill ────────────────────────────────────────────────────────────────────────────────────────────

export type KrillOpts = { centre: V3; radius: V3; n: number; t: number; seed?: number; size?: number; alpha?: number; glow?: number; swirl?: number; drift?: V3; tint?: [RGB, RGB]; keep?: (p: V3) => boolean };

/** A cloud of krill: thousands would be thousands of triangles, so each stands for a few. */
export function krill(out: Tri[], o: KrillOpts) {
  const R = rng(o.seed ?? 17), size = o.size ?? 0.11;
  for (let i = 0; i < o.n; i++) {
    const th = R() * Math.PI * 2, cz = R() * 2 - 1, rad = R() ** 0.42;
    const sw = (o.swirl ?? 0.25) * o.t * (0.6 + R() * 0.8) + th;
    const flat = Math.sqrt(1 - cz * cz) * rad;
    const j = 0.35 * Math.sin(o.t * (1.2 + R() * 2) + i);
    const p: V3 = [
      o.centre[0] + Math.cos(sw) * flat * o.radius[0] + j * 0.5 + (o.drift?.[0] ?? 0) * o.t,
      o.centre[1] + cz * rad * o.radius[1] + j + (o.drift?.[1] ?? 0) * o.t,
      o.centre[2] + Math.sin(sw) * flat * o.radius[2] - j * 0.5 + (o.drift?.[2] ?? 0) * o.t,
    ];
    const tint = R(), s = size * (0.6 + 0.8 * R()), dart = R() * 6.28;
    if (o.keep && !o.keep(p)) continue;
    const dir: V3 = [-Math.sin(sw) * 0.9, 0.3 * Math.sin(dart), Math.cos(sw) * 0.9];
    const tail = add(p, scale(dir, -s * 1.7)), head = add(p, scale(dir, s));
    const color = o.tint ? mixRGB(o.tint[0], o.tint[1], tint) : mixRGB(hex("#ff6f7e"), hex("#ffc2a8"), tint);
    out.push({ a: head, b: add(p, [0, s * 0.42, 0]), c: tail, color, glow: o.glow ?? 0.45, alpha: o.alpha ?? 0.95 }, { a: head, b: add(p, [0, -s * 0.3, s * 0.2]), c: tail, color: mixRGB(color, o.tint ? [40, 70, 90] : [120, 20, 40], 0.3), glow: o.glow ?? 0.45, alpha: o.alpha ?? 0.95 });
  }
}

// ── Water and light ──────────────────────────────────────────────────────────────────────────────────

/** The surface from below, y = 0: a bright window overhead, mirror-dark beyond it, rippling. */
export function surfaceBelow(out: Tri[], cam: Camera, t: number, o: { bright?: RGB; dark?: RGB; far?: number; cell?: number } = {}) {
  const far = o.far ?? 60, cell = o.cell ?? 3;
  const bright = o.bright ?? hex("#d8fbff"), dark = o.dark ?? hex("#1c86ad");
  const x0 = Math.floor(cam.pos[0] / cell) * cell, z0 = Math.floor(cam.pos[2] / cell) * cell;
  const n = Math.ceil(far / cell);
  const H = (x: number, z: number) => 0.28 * Math.sin(x * 0.5 + t * 1.3) + 0.22 * Math.sin(z * 0.62 - t * 1.1 + x * 0.2) + 0.5 * noise2(x * 0.3 + t * 0.3, z * 0.3, 5);
  const depth = Math.max(1, -cam.pos[1]);
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const x = x0 + i * cell, z = z0 + j * cell;
      const d = Math.hypot(x - cam.pos[0], z - cam.pos[2]);
      if (d > far) continue;
      const P = (a: number, b: number): V3 => [a, H(a, b), b];
      const a = P(x, z), b = P(x + cell, z), c = P(x + cell, z + cell), e = P(x, z + cell);
      // Straight up you see the sky; past about 48° from vertical the surface mirrors the deep.
      const window = 1 - smooth(0.75, 1.5, d / depth);
      [[a, b, c], [a, c, e]].forEach((f, k) => {
        const tilt = f[0][1] - f[1][1] + (f[2][1] - f[1][1]) * 0.7;
        const sparkle = clamp01(0.5 + tilt * 1.4 + 0.3 * hash2(i, j, k));
        out.push({ a: f[0], b: f[1], c: f[2], color: mixRGB(dark, bright, clamp01(window * 0.65 + sparkle * 0.4 * (0.25 + window))), glow: 0.85, zBias: 6 });
      });
    }
  }
}

/** The open sea from above. */
export function seaTop(out: Tri[], cam: Camera, t: number, o: { color?: RGB; sky?: RGB; far?: number; swell?: number } = {}) {
  const far = o.far ?? 220, swell = o.swell ?? 0.5;
  const base = o.color ?? hex("#1b6f8f"), sky = o.sky ?? hex("#bfe6ee");
  const rings = 58, spokes = 112;
  const look = Math.atan2(cam.target[2] - cam.pos[2], cam.target[0] - cam.pos[0]);
  const seen = (j: number) => Math.abs(((((j + 0.5) / spokes) * Math.PI * 2 - look + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.8;
  const H = (x: number, z: number) => swell * (0.5 * Math.sin(x * 0.16 + t * 0.9) + 0.4 * Math.sin(z * 0.21 - t * 0.8) + 0.9 * noise2(x * 0.2 + t * 0.35, z * 0.2, 9));
  const P = (i: number, j: number): V3 => {
    const r = 0.5 + (far - 0.5) * (i / rings) ** 2.3, q = (j / spokes) * Math.PI * 2;
    const x = cam.pos[0] + Math.cos(q) * r, z = cam.pos[2] + Math.sin(q) * r;
    return [x, H(x, z), z];
  };
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < spokes; j++) {
      if (!seen(j)) continue;
      const a = P(i, j), b = P(i, j + 1), c = P(i + 1, j + 1), d = P(i + 1, j);
      const k = clamp01(0.25 + (a[1] - c[1]) * 0.6 + 0.12 * hash2(i, j, 3));
      out.push({ a, b, c, color: mixRGB(base, sky, k * 0.5), mirror: 0.6, zBias: 2 }, { a, b: c, c: d, color: mixRGB(base, sky, k * 0.4), mirror: 0.6, zBias: 2 });
    }
  }
}

/** Sunlight coming down through the water in slanting curtains. */
export function shafts(out: Tri[], centre: V3, t: number, o: { n?: number; radius?: number; depth?: number; alpha?: number; seed?: number; color?: RGB } = {}) {
  const R = rng(o.seed ?? 8), n = o.n ?? 9;
  for (let i = 0; i < n; i++) {
    const q = R() * 6.28, r = (o.radius ?? 16) * Math.sqrt(R()), w = 0.6 + R() * 1.8, sway = Math.sin(t * 0.5 + i * 1.7);
    const x = centre[0] + Math.cos(q) * r + sway * 0.6, z = centre[2] + Math.sin(q) * r;
    const D = (o.depth ?? 26) * (0.6 + R() * 0.5);
    const dx = 2.5 + sway, al = (o.alpha ?? 0.07) * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 2.3));
    const top = centre[1];
    const color = o.color ?? hex("#bdf6ff");
    // Two halves, the lower fainter, so a shaft dies out rather than ending.
    const A: V3[] = [[x - w, top, z], [x + w, top, z], [x + w * 1.3 + dx * 0.5, top - D * 0.5, z + 1], [x - w * 0.8 + dx * 0.5, top - D * 0.5, z + 1], [x + w * 1.7 + dx, top - D, z + 2], [x - w * 0.6 + dx, top - D, z + 2]];
    quad(out, A[0], A[1], A[2], A[3], color, { glow: 1, alpha: Math.max(0.005, al) });
    quad(out, A[3], A[2], A[4], A[5], color, { glow: 1, alpha: Math.max(0.005, al * 0.45) });
  }
}

/** Specks hanging in the water, in a box that travels with the camera. `flow` carries them. */
export function specks(out: Tri[], cam: Camera, t: number, o: { n?: number; box?: number; flow?: V3; alpha?: number; size?: number; seed?: number } = {}) {
  const R = rng(o.seed ?? 21), B = o.box ?? 14, f = o.flow ?? [0.08, 0.12, 0];
  const wrap = (v: number, c: number) => c + ((((v - c) % B) + B * 1.5) % B) - B / 2;
  for (let i = 0; i < (o.n ?? 150); i++) {
    const p: V3 = [wrap(R() * B + f[0] * t + 0.2 * Math.sin(t + i), cam.pos[0]), wrap(R() * B + f[1] * t, cam.pos[1]), wrap(R() * B + f[2] * t, cam.pos[2])];
    const d = Math.hypot(p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]);
    const a = (o.alpha ?? 0.5) * smooth(0.6, 2, d) * (1 - smooth(B * 0.3, B * 0.5, d));
    if (a < 0.02) continue;
    const s = (o.size ?? 0.014) * (0.5 + R());
    out.push({ a: [p[0] - s, p[1], p[2]], b: [p[0], p[1] + s * 1.4, p[2]], c: [p[0] + s, p[1], p[2] + s], color: hex("#e6fbff"), glow: 0.7, alpha: a });
  }
}

/** Streaks rushing along `dir`, for water pouring through something. */
export function streaks(out: Tri[], t: number, o: { from: (k: number, r: () => number) => V3; dir: (p: V3, k: number) => V3; n: number; len?: number; speed?: number; reach?: number; alpha?: number; color?: RGB; seed?: number }) {
  const R = rng(o.seed ?? 31);
  for (let i = 0; i < o.n; i++) {
    const p0 = o.from(i, R), d = norm(o.dir(p0, i)), reach = o.reach ?? 3;
    const u = (t * (o.speed ?? 3) * (0.7 + 0.6 * R()) / reach + R()) % 1;
    const p = add(p0, scale(d, u * reach)), q = add(p, scale(d, (o.len ?? 0.6) * (0.5 + R())));
    const side = scale(norm(cross(d, [0.3, 1, 0.2])), 0.008 + 0.012 * R());
    out.push({ a: add(p, side), b: sub(p, side), c: q, color: o.color ?? hex("#bff2ff"), glow: 0.9, alpha: (o.alpha ?? 0.5) * Math.sin(u * Math.PI) });
  }
}

// ── Things for scale ─────────────────────────────────────────────────────────────────────────────────

/** A yellow school bus, 11 m, its length along z. */
export function bus(out: Tri[], pose: Pose) {
  const T = poseFn({ ...pose, size: 1 }), Y = hex("#ffc21f"), K = hex("#1d2226"), G = hex("#2c4a5c");
  const face = (pts: V3[], color: RGB, extra: Partial<Tri> = {}) => {
    const p = pts.map(T);
    for (let i = 1; i < p.length - 1; i++) out.push({ a: p[0], b: p[i], c: p[i + 1], color, glow: 0.45, ...extra });
  };
  const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: RGB, extra: Partial<Tri> = {}) => {
    const v: V3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    for (const f of [[4, 5, 6, 7], [0, 1, 2, 3], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) face(f.map((i) => v[i]), color, extra);
  };
  // Body in short slabs, so each sorts by its own depth.
  for (let i = 0; i < 5; i++) slab(-1.25, 1.25, 0, 2.6, -5.5 + i * 1.8, -5.5 + (i + 1) * 1.8, i % 2 ? Y : mixRGB(Y, [255, 255, 255], 0.06));
  slab(-1.1, 1.1, 0, 1.35, 3.5, 5.5, Y);
  for (const s of [1, -1]) {
    for (let i = 0; i < 8; i++) face([[s * 1.27, 1.45, -5.2 + i * 1.08], [s * 1.27, 2.25, -5.2 + i * 1.08], [s * 1.27, 2.25, -4.35 + i * 1.08], [s * 1.27, 1.45, -4.35 + i * 1.08]], G, { zBias: -0.25 });
    face([[s * 1.27, 1.0, -5.5], [s * 1.27, 1.16, -5.5], [s * 1.27, 1.16, 3.5], [s * 1.27, 1.0, 3.5]], K, { zBias: -0.25 });
    face([[s * 1.27, 0.5, -5.5], [s * 1.27, 0.62, -5.5], [s * 1.27, 0.62, 3.5], [s * 1.27, 0.5, 3.5]], K, { zBias: -0.25 });
    for (const z of [-3.4, 4.1]) {
      const ring = Array.from({ length: 8 }, (_, k): V3 => [s * 1.3, 0.02 + Math.sin((k / 8) * 6.283) * 0.52, z + Math.cos((k / 8) * 6.283) * 0.52]);
      face(ring, K, { zBias: -0.35 });
    }
  }
  face([[-1.05, 1.4, 3.53], [1.05, 1.4, 3.53], [1.05, 2.35, 3.53], [-1.05, 2.35, 3.53]], G, { zBias: -0.2 });
}

/** A small working boat with a wheelhouse, about 10 m, bow towards +z. */
export function boat(out: Tri[], pose: Pose) {
  const T = poseFn({ ...pose, size: 1 }), HULL = hex("#f1f3ee"), RED = hex("#b8382e"), DECK = hex("#8a7a64");
  const st = [-5, -2.5, 0, 2.5, 4.2, 5.4];
  const half = [1.5, 1.65, 1.65, 1.35, 0.7, 0.04], sheer = [0.95, 0.95, 1.0, 1.2, 1.45, 1.7];
  for (let i = 0; i < st.length - 1; i++) {
    for (const s of [1, -1]) {
      const a = T([s * half[i], sheer[i], st[i]]), b = T([s * half[i + 1], sheer[i + 1], st[i + 1]]);
      const c = T([s * half[i + 1] * 0.82, 0.3, st[i + 1]]), d = T([s * half[i] * 0.82, 0.3, st[i]]);
      quad(out, a, b, c, d, s > 0 ? HULL : mixRGB(HULL, [0, 0, 0], 0.1));
      quad(out, d, c, T([s * half[i + 1] * 0.6, -0.4, st[i + 1]]), T([s * half[i] * 0.6, -0.4, st[i]]), RED);
    }
    quad(out, T([-half[i], sheer[i] - 0.2, st[i]]), T([half[i], sheer[i] - 0.2, st[i]]), T([half[i + 1], sheer[i + 1] - 0.2, st[i + 1]]), T([-half[i + 1], sheer[i + 1] - 0.2, st[i + 1]]), DECK, { zBias: 0.1 });
  }
  quad(out, T([-1.5, 0.95, -5]), T([1.5, 0.95, -5]), T([0.9, -0.4, -5]), T([-0.9, -0.4, -5]), HULL);
  box(out, { pos: T([0, 0.8, 1.6]), yaw: pose.yaw, pitch: pose.pitch, roll: pose.roll, size: [2, 1.7, 2] }, { color: HULL });
  for (const x of [-0.5, 0.5]) box(out, { pos: T([x, 1.65, 2.6]), yaw: pose.yaw, pitch: pose.pitch, roll: pose.roll, size: [0.8, 0.6, 0.06] }, { color: hex("#23506a"), zBias: -0.2 });
  box(out, { pos: T([0, 2.5, 1.5]), yaw: pose.yaw, pitch: pose.pitch, roll: pose.roll, size: [2.4, 0.12, 2.5] }, { color: RED, zBias: -0.1 });
}

// ── Inside the mouth ─────────────────────────────────────────────────────────────────────────────────

export type CaveOpts = {
  t: number;
  /** 1 full of water … 0.6 squeezed. */
  size?: number;
  /** The front: 0 shut … 1 wide open. */
  open?: number;
  /** The tongue: 0 a great mound on the floor … 1 folded back and away. */
  away?: number;
};

/** Half height and half width of the mouth at z (−6 throat … +6 lips). */
export function caveAt(z: number, size = 1) {
  const u = clamp01((z + 6) / 12);
  const swellUp = Math.sin(Math.PI * (0.12 + 0.82 * u)) ** 0.6;
  return { w: (0.35 + 2.5 * swellUp) * (0.55 + 0.45 * size), up: 0.3 + 1.35 * swellUp, down: (0.3 + 2.0 * swellUp) * size };
}

/** A whale's mouth from the inside: a ribbed, wet cave, baleen down both sides, the tongue, and a small hole at the back. */
export function mouthCave(out: Tri[], o: CaveOpts) {
  const size = o.size ?? 1, open = o.open ?? 0, away = o.away ?? 0;
  const FLESH = hex("#9c5a60"), DARK = hex("#4a2430"), ROOF = hex("#86505a");
  const N = 26, M = 24;
  const pulse = (z: number) => 1 + 0.015 * Math.sin(o.t * 2.2 + z * 1.3);
  const P = (i: number, j: number): V3 => {
    const z = -6 + (12 * i) / N, c = caveAt(z, size), q = (j / M) * Math.PI * 2;
    const sn = Math.sin(q);
    const lift = open * smooth(0.5, 6, z) * 2.6;
    const rib = 1 + 0.035 * Math.sin(j * Math.PI) * 0 + (sn < 0 ? 0.05 * (j % 2) : 0);
    return [Math.cos(q) * c.w * pulse(z) * rib, (sn > 0 ? sn * c.up + lift * 0.55 * Math.min(1, sn * 2.2) : sn * c.down * pulse(z) * rib - lift * 0.45 * Math.min(1, -sn * 2.2)), z];
  };
  const last = open > 0.02 ? N - 2 : N;
  for (let i = 0; i < last; i++) {
    for (let j = 0; j < M; j++) {
      const up = j < M / 2;
      const base = up ? ROOF : FLESH;
      const n = hash2(i, j, 6);
      let col = mixRGB(base, DARK, 0.15 + 0.35 * n * 0.5 + (up ? 0 : 0.3 * (j % 2)));
      col = mixRGB(col, hex("#1a0a10"), 0.6 * smooth(-1, -6, -6 + (12 * i) / N));
      quad(out, P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), col, { mirror: 0.35, zBias: 1.2 });
    }
  }
  // The back wall, folded in towards the throat: a hole no wider than a dinner plate.
  const c = caveAt(-6, size);
  const R1 = Array.from({ length: 14 }, (_, k): V3 => [Math.cos((k / 14) * 6.2832) * Math.max(c.w, 0.9), Math.sin((k / 14) * 6.2832) * 0.9, -5.6]);
  const R2 = R1.map((p, k): V3 => [p[0] * (0.36 + 0.05 * (k % 2)), p[1] * (0.36 + 0.05 * (k % 2)), -5.9]);
  const R3 = R1.map((p): V3 => [p[0] * 0.15, p[1] * 0.15, -6.1]);
  for (let k = 0; k < 14; k++) {
    const m = (k + 1) % 14;
    quad(out, R1[k], R1[m], R2[m], R2[k], mixRGB(FLESH, DARK, 0.35 + 0.35 * (k % 2)), { zBias: 0.3 });
    quad(out, R2[k], R2[m], R3[m], R3[k], mixRGB(FLESH, DARK, 0.2 + 0.4 * (k % 2)), { zBias: 0.15 });
    out.push({ a: R3[k], b: R3[m], c: [0, 0, -6.3], color: hex("#050204"), zBias: 0 });
  }
  // Baleen: plates hanging from the roof's edges, close together, frayed at the bottom.
  for (const s of [1, -1]) {
    for (let k = 0; k < 64; k++) {
      const z = -4.4 + k * 0.148;
      const b = caveAt(z, size);
      const lift = open * smooth(0.5, 6, z) * 2.6 * 0.55;
      const x = s * b.w * 0.8, top = b.up * 0.62 + lift, len = (0.95 + 0.35 * hash2(k, s, 2)) * (0.5 + 0.5 * Math.sin(Math.PI * clamp01((z + 5) / 11)));
      const sway = 0.06 * Math.sin(o.t * 1.7 + k * 0.4);
      const col = mixRGB(hex("#2a323c"), hex("#6d6a5e"), hash2(k, s, 7) * 0.7);
      out.push({ a: [x, top, z], b: [x - s * 0.3, top, z + 0.02], c: [x + s * 0.02 + sway, top - len, z + 0.05], color: col, zBias: -0.02 });
      out.push({ a: [x, top, z], b: [x + s * 0.1, top, z + 0.12], c: [x + s * 0.02 + sway, top - len * 0.92, z + 0.1], color: mixRGB(col, [0, 0, 0], 0.25), zBias: -0.02 });
    }
  }
  // The tongue: a mound the length of the floor that sinks, shrinks and rolls towards the back.
  const ico = icosphere(3);
  const k = smooth(0, 1, away);
  const tz = 0.4 - 4.4 * k;
  const ts: V3 = [1.75 - 0.75 * k, 1.75 - 1.4 * k, 4.2 - 2.9 * k];
  ico.f.forEach(([a, b, d], i) => {
    const pts = [a, b, d].map((v): V3 => {
      const [x, y, zz] = ico.v[v];
      const groove = 1 - 0.14 * Math.exp(-((x * 4) ** 2));
      const z0 = tz + zz * ts[2];
      const c0 = caveAt(Math.max(-5.5, Math.min(5.5, z0)), size);
      const floor = -c0.down * Math.sqrt(Math.max(0.1, 1 - ((x * ts[0]) / c0.w) ** 2));
      // A ripple runs to the back as it folds away.
      const ripple = k > 0 && k < 1 ? 0.22 * Math.sin(zz * 5 + k * 12) * Math.sin(Math.PI * k) : 0.04 * Math.sin(zz * 6 - o.t * 2.2);
      return [x * ts[0], floor - 0.1 + Math.max(0, y) * (ts[1] * groove + ripple), z0];
    });
    if (ico.v[a][1] < -0.1 && ico.v[b][1] < -0.1 && ico.v[d][1] < -0.1) return;
    out.push({ a: pts[0], b: pts[1], c: pts[2], color: mixRGB(hex("#c87a80"), hex("#8c4a58"), hash2(i, 3, 5) * 0.5), mirror: 0.5 });
  });
}

/** A soft ball of light, e.g. the glow of open water through a gap. */
export const halo = (glows: Glow[], p: V3, radius: number, color: RGB, alpha: number) => void glows.push({ p, radius, color, alpha });

// ── Life in the water, and the sky ───────────────────────────────────────────────────────────────────

export type SchoolOpts = { centre: V3; n: number; radius: V3; t: number; seed?: number; size?: number; speed?: number; color?: RGB; drift?: V3; alpha?: number };

/** A school of small silver fish wheeling together as one slow shape. */
export function school(out: Tri[], o: SchoolOpts) {
  const R = rng(o.seed ?? 41), size = o.size ?? 0.2, col = o.color ?? hex("#c6dbe0");
  const drift = scale(o.drift ?? [0, 0, 0], o.t);
  for (let i = 0; i < o.n; i++) {
    const th = R() * Math.PI * 2, ph = R() * Math.PI * 2, rr = 0.45 + 0.55 * Math.sqrt(R()), own = 0.9 + 0.2 * R(), k = R();
    const q = th + o.t * (o.speed ?? 0.3) * own;
    const breath = 1 + 0.14 * Math.sin(o.t * 0.35 + ph);
    const p: V3 = add(add(o.centre, drift), [Math.cos(q) * o.radius[0] * rr * breath, Math.sin(ph + o.t * 0.25) * o.radius[1] * rr, Math.sin(q) * o.radius[2] * rr * breath]);
    const dir = norm(add([-Math.sin(q) * o.radius[0], 0.15 * Math.cos(ph + o.t * 0.25) * o.radius[1], Math.cos(q) * o.radius[2]], scale(o.drift ?? [0, 0, 0], 3)));
    const sz = size * (0.75 + 0.5 * k), side = norm(cross(dir, [0, 1, 0]));
    const up: V3 = [0, sz * 0.34, 0], wag = scale(side, sz * 0.3 * Math.sin(o.t * 8 + i));
    const head = add(p, scale(dir, sz)), tail = add(p, scale(dir, -sz * 0.9)), fin = add(add(tail, scale(dir, -sz * 0.5)), wag);
    const ex: Partial<Tri> = { mirror: 0.9, alpha: o.alpha ?? 1, glow: 0.15 };
    out.push({ a: head, b: add(p, up), c: tail, color: col, ...ex }, { a: head, b: sub(p, up), c: tail, color: mixRGB(col, [30, 50, 64], 0.3), ...ex }, { a: tail, b: add(fin, scale(up, 0.9)), c: sub(fin, scale(up, 0.9)), color: mixRGB(col, [60, 80, 90], 0.2), ...ex });
  }
}

/** A moon jelly: a translucent bell that pulses, trailing a few threads. */
export function jelly(out: Tri[], p: V3, t: number, o: { size?: number; color?: RGB; seed?: number; alpha?: number } = {}) {
  const sz = o.size ?? 0.5, col = o.color ?? hex("#e4d6ff"), N = 10, seed = o.seed ?? 0, al = o.alpha ?? 1;
  const beat = 0.5 + 0.5 * Math.sin(t * 1.5 + seed);
  const rim = sz * (0.82 + 0.28 * beat), h = sz * (0.78 - 0.24 * beat);
  const ring = (r: number, y: number) => Array.from({ length: N }, (_, k): V3 => add(p, [Math.cos((k / N) * 6.283) * r, y, Math.sin((k / N) * 6.283) * r]));
  const top = add(p, [0, h, 0]), mid = ring(rim * 0.8, h * 0.62), low = ring(rim, 0);
  for (let k = 0; k < N; k++) {
    const m = (k + 1) % N;
    out.push({ a: top, b: mid[k], c: mid[m], color: col, glow: 0.65, alpha: 0.32 * al, zBias: -0.1 });
    quad(out, mid[k], mid[m], low[m], low[k], mixRGB(col, [255, 255, 255], 0.2), { glow: 0.65, alpha: 0.26 * al, zBias: -0.1 });
  }
  // Four pale rings inside the bell.
  for (let k = 0; k < 4; k++) {
    const q = (k / 4) * 6.283 + 0.4, c = add(p, [Math.cos(q) * rim * 0.32, h * 0.45, Math.sin(q) * rim * 0.32]);
    octaPoint(out, c, sz * 0.1, hex("#fff0fb"), 0.5 * al);
  }
  for (let k = 0; k < 6; k++) {
    const q = (k / 6) * 6.283, x = Math.cos(q) * rim * 0.8, zz = Math.sin(q) * rim * 0.8;
    let prev: V3 = add(p, [x, 0, zz]);
    for (let j = 1; j <= 4; j++) {
      const sway = 0.12 * sz * Math.sin(t * 1.2 - j * 0.9 + k);
      const next = add(p, [x * (1 - j * 0.12) + sway, -j * sz * 0.55, zz * (1 - j * 0.12) + sway * 0.5]);
      out.push({ a: add(prev, [sz * 0.02, 0, 0]), b: sub(prev, [sz * 0.02, 0, 0]), c: next, color: col, glow: 0.7, alpha: 0.28 * al * (1 - j * 0.18) });
      prev = next;
    }
  }
}

function octaPoint(out: Tri[], c: V3, r: number, color: RGB, alpha: number) {
  const P: V3[] = [add(c, [r, 0, 0]), add(c, [0, r, 0]), add(c, [-r, 0, 0]), add(c, [0, -r, 0])];
  out.push({ a: P[0], b: P[1], c: P[2], color, glow: 0.8, alpha }, { a: P[0], b: P[2], c: P[3], color, glow: 0.8, alpha });
}

/** Low, flat clouds far off, in the direction the camera looks. */
export function clouds(out: Tri[], cam: Camera, o: { n?: number; seed?: number; color?: RGB; shade?: RGB; dist?: [number, number]; height?: [number, number]; spread?: number; drift?: number; size?: number } = {}) {
  const R = rng(o.seed ?? 3), look = Math.atan2(cam.target[0] - cam.pos[0], cam.target[2] - cam.pos[2]);
  const [d0, d1] = o.dist ?? [150, 230], [h0, h1] = o.height ?? [22, 55];
  const lit = o.color ?? hex("#f4f8fb"), dark = o.shade ?? hex("#b9cbd8");
  for (let i = 0; i < (o.n ?? 9); i++) {
    const q = look + (R() - 0.5) * (o.spread ?? 1.3) + (o.drift ?? 0), d = d0 + (d1 - d0) * R(), y = h0 + (h1 - h0) * R();
    const c: V3 = [cam.pos[0] + Math.sin(q) * d, y, cam.pos[2] + Math.cos(q) * d];
    const size = (9 + 16 * R()) * (o.size ?? 1), puffs = 3 + Math.floor(R() * 3);
    for (let k = 0; k < puffs; k++) {
      const off: V3 = [(R() - 0.5) * size * 2.2, R() * size * 0.25, (R() - 0.5) * size * 0.8];
      const r = size * (0.5 + 0.5 * R());
      sphere(out, 1, { pos: add(c, off), yaw: R() * 6, size: r }, (dir) => 1 / Math.hypot(dir[0] * 0.8, dir[1] * 2.4, dir[2]), (dir) => ({ color: mixRGB(dark, lit, clamp01(0.45 + dir[1] * 0.8)), glow: 0.82 }));
    }
  }
}

/** A square patch of open sea seen from above, centred on `centre` (for cameras looking down). */
export function seaGrid(out: Tri[], centre: V3, half: number, cell: number, t: number, o: { color?: RGB; light?: RGB; swell?: number } = {}) {
  const base = o.color ?? hex("#145a86"), light = o.light ?? hex("#3d93b8"), swell = o.swell ?? 0.35;
  const H = (x: number, z: number) => swell * (0.5 * Math.sin(x * 0.45 + t * 1.1) + 0.4 * Math.sin(z * 0.38 - t * 0.9 + x * 0.2) + 0.8 * noise2(x * 0.35 + t * 0.3, z * 0.35, 9));
  const n = Math.ceil(half / cell);
  const x0 = Math.round(centre[0] / cell) * cell, z0 = Math.round(centre[2] / cell) * cell;
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const x = x0 + i * cell, z = z0 + j * cell;
      const P = (a: number, b: number): V3 => [a, H(a, b), b];
      const a = P(x, z), b = P(x + cell, z), c = P(x + cell, z + cell), d = P(x, z + cell);
      for (const [f, k] of [[[a, b, c], 0], [[a, c, d], 1]] as [V3[], number][]) {
        const slope = f[0][1] - f[2][1] + 0.6 * (f[1][1] - f[2][1]);
        const tone = clamp01(0.4 + slope * 0.7 + 0.08 * hash2(i, j, k + 4));
        out.push({ a: f[0], b: f[1], c: f[2], color: mixRGB(base, light, tone), mirror: 0.5 });
      }
    }
  }
}
