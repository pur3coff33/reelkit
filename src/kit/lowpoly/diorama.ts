// Diorama pieces for the low-poly engine: a small world on a slab, built from boxes, faceted balls and pointed prisms,
// with peg-doll people and a dog. Shared by porchlight (lowpoly.ts) and pasko. Units: the slab is ~4.2 across, y up.
import type { Tri } from "./engine";
import { icosphere } from "./world";
import type { Mat, Pose } from "../looks/box/world";
import { clamp01, smooth, type RGB, type V3 } from "../looks/core";

export type Col = { color: RGB; glow?: number; zBias?: number };
export type Place = (q: V3) => V3;

export const hash = (a: number, b = 0, c = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
};
export const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const to255 = (c: RGB): RGB => [c[0] * 255, c[1] * 255, c[2] * 255];
export const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** A box material's colour for these pose numbers: its `steps` blended in, its glow switched by `glowBy`. */
export function paintOf(m: Mat, k: number[]): Col {
  let c = m.color;
  for (const s of m.steps ?? []) c = mix(c, s.color, clamp01(((k[s.by] ?? 0) - (s.from ?? 0)) / ((s.to ?? 1) - (s.from ?? 0))));
  if (!m.glow) return { color: to255(c) };
  const on = m.glowBy === undefined ? 1 : clamp01(k[m.glowBy] ?? 0), top = Math.max(...m.glow);
  const lit: RGB = [m.glow[0] / top, m.glow[1] / top, Math.min(1, (m.glow[2] / top) * 1.4)];
  return { color: to255(mix(c, lit, on)), glow: on };
}

/** Local → world for a box pose: turn takes +x towards +z, then scale, then move. */
export function placer(p: Pose): Place {
  const c = Math.cos(p.turn ?? 0), s = Math.sin(p.turn ?? 0), k = p.scale ?? 1;
  return (q) => [p.at[0] + (q[0] * c - q[2] * s) * k, p.at[1] + q[1] * k, p.at[2] + (q[0] * s + q[2] * c) * k];
}

// ── Shapes, in a thing's own units ───────────────────────────────────────────────────────────────────────────────

/** A little brightness wobble per face, so flat colours read as facets. */
export const facet = (c: Col, i: number, amount = 0.06): Col => {
  const f = 1 + amount * (hash(i, c.color[0], c.color[2]) - 0.5) * 2;
  return { ...c, color: [c.color[0] * f, c.color[1] * f, c.color[2] * f] };
};

export function quad(out: Tri[], a: V3, b: V3, c: V3, d: V3, col: Col) {
  out.push({ a, b, c, ...col }, { a, b: c, c: d, ...col });
}

/** A quad cut into pieces about `cell` across, so the painter's back-to-front sort works on big faces. */
export function tiles(out: Tri[], a: V3, b: V3, c: V3, d: V3, col: Col, cell = 0.09) {
  const nu = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / cell));
  const nv = Math.max(1, Math.ceil(Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]) / cell));
  const at = (u: number, v: number): V3 => {
    const x = (p: number) => (1 - u) * (1 - v) * a[p] + u * (1 - v) * b[p] + u * v * c[p] + (1 - u) * v * d[p];
    return [x(0), x(1), x(2)];
  };
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) quad(out, at(i / nu, j / nv), at((i + 1) / nu, j / nv), at((i + 1) / nu, (j + 1) / nv), at(i / nu, (j + 1) / nv), col);
}

/** A box with centre `c` and half sizes `h`. */
export function cube(out: Tri[], P: Place, c: V3, h: V3, col: Col) {
  const v = (x: number, y: number, z: number) => P([c[0] + x * h[0], c[1] + y * h[1], c[2] + z * h[2]]);
  const p = [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1), v(-1, 1, -1), v(1, 1, -1), v(1, 1, 1), v(-1, 1, 1)];
  [[4, 5, 6, 7], [0, 1, 2, 3], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach(([a, b, cc, d], i) => tiles(out, p[a], p[b], p[cc], p[d], facet(col, i, 0.03)));
}

/** Part of a faceted ball: only the faces whose centre (from `c`, in local units) passes `keep`. For hair. */
export function shell(out: Tri[], P: Place, c: V3, r: V3, col: Col, keep: (d: V3) => boolean) {
  const { v, f } = icosphere(2);
  f.forEach(([a, b, cc], i) => {
    const m: V3 = [((v[a][0] + v[b][0] + v[cc][0]) / 3) * r[0], ((v[a][1] + v[b][1] + v[cc][1]) / 3) * r[1], ((v[a][2] + v[b][2] + v[cc][2]) / 3) * r[2]];
    if (!keep(m)) return;
    const w = (k: number) => P([c[0] + v[k][0] * r[0], c[1] + v[k][1] * r[1], c[2] + v[k][2] * r[2]]);
    out.push({ a: w(a), b: w(b), c: w(cc), ...facet(col, i) });
  });
}

/** A faceted ball (ellipsoid) with centre `c` and radii `r`; `lumpy` pushes its points in and out. */
export function ball(out: Tri[], P: Place, c: V3, r: V3, col: Col, level = 1, lumpy = 0, seed = 0) {
  const { v, f } = icosphere(level);
  const w = v.map((d, i) => {
    const bump = 1 + lumpy * (hash(i, seed) - 0.5) * 2;
    return P([c[0] + d[0] * r[0] * bump, c[1] + d[1] * r[1] * bump, c[2] + d[2] * r[2] * bump]);
  });
  f.forEach(([a, b, cc], i) => out.push({ a: w[a], b: w[b], c: w[cc], ...facet(col, i + seed) }));
}

/** A rounded limb from `a` to `b`: a prism of `sides` sides with pointed ends. */
export function limb(out: Tri[], P: Place, a: V3, b: V3, ra: number, rb: number, col: Col, sides = 6) {
  const ax = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm([ax[1] * ref[2] - ax[2] * ref[1], ax[2] * ref[0] - ax[0] * ref[2], ax[0] * ref[1] - ax[1] * ref[0]]);
  const w: V3 = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]];
  const ring = (o: V3, r: number) => Array.from({ length: sides }, (_, i) => {
    const t = (i / sides) * Math.PI * 2, x = Math.cos(t) * r, y = Math.sin(t) * r;
    return P([o[0] + u[0] * x + w[0] * y, o[1] + u[1] * x + w[1] * y, o[2] + u[2] * x + w[2] * y]);
  });
  const A = ring(a, ra), B = ring(b, rb);
  const tipA = P([a[0] - ax[0] * ra * 0.7, a[1] - ax[1] * ra * 0.7, a[2] - ax[2] * ra * 0.7]);
  const tipB = P([b[0] + ax[0] * rb * 0.7, b[1] + ax[1] * rb * 0.7, b[2] + ax[2] * rb * 0.7]);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides, c = facet(col, i);
    quad(out, A[i], A[j], B[j], B[i], c);
    out.push({ a: tipA, b: A[j], c: A[i], ...c }, { a: tipB, b: B[i], c: B[j], ...c });
  }
}

/** A soft dark patch on the ground under something, drawn before it. */
export function shadowUnder(out: Tri[], ground: (x: number, z: number) => number, x: number, z: number, r: number, alpha: number) {
  const y = ground(x, z) + 0.004, n = 10, c: V3 = [x, y, z];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const p0: V3 = [x + Math.cos(a0) * r, ground(x + Math.cos(a0) * r, z + Math.sin(a0) * r * 0.8) + 0.004, z + Math.sin(a0) * r * 0.8];
    const p1: V3 = [x + Math.cos(a1) * r, ground(x + Math.cos(a1) * r, z + Math.sin(a1) * r * 0.8) + 0.004, z + Math.sin(a1) * r * 0.8];
    out.push({ a: c, b: p0, c: p1, color: [20, 16, 30], alpha, glow: 1, zBias: 0.05 });
  }
}

export type Build = (out: Tri[], P: Place, k: number[], mats: Col[]) => void;

export const postLamp: Build = (out, P, _k, [iron, glass]) => {
  limb(out, P, [0, -0.05, 0], [0, 0.33, 0], 0.012, 0.01, iron, 5);
  cube(out, P, [0, 0.37, 0], [0.026, 0.036, 0.026], glass);
  cube(out, P, [0, 0.414, 0], [0.036, 0.008, 0.036], iron);
  cube(out, P, [0, 0.328, 0], [0.03, 0.006, 0.03], iron);
  ball(out, P, [0, 0.432, 0], [0.012, 0.012, 0.004], iron, 0);
};

export const bench: Build = (out, P, _k, [wood]) => {
  cube(out, P, [0, 0.12, 0], [0.17, 0.012, 0.05], wood);
  cube(out, P, [0, 0.2, -0.048], [0.17, 0.04, 0.008], wood);
  for (const x of [-0.14, 0.14]) for (const z of [-0.035, 0.035]) cube(out, P, [x, 0.06, z], [0.012, 0.06, 0.012], wood);
};

/** A peg-doll person, facing +x (box/things.ts peg). Mats: coat, skin, hair, legs, ink, cheeks, shoes.
 *  k: stride, age, sit, right arm up, smile, eyes shut, head turn; and optionally k[7] left arm up, k[8] both arms
 *  reaching forward (a hug, carrying), k[9] leaning forward, k[10] head tilted back (laughing) or down (negative). */
export const person = (long: boolean): Build => (out, P, k, [coat, skin, hair, legs, ink, cheeks, shoes]) => {
  const [stride = 0, age = 0, sit = 0, arm = 0, smile = 0.3, shut = 0, look = 0, armL = 0, reach = 0, lean = 0, nod = 0] = k;
  const st = smooth(0.65, 1, age) * 0.07, s = stride * 0.075 * (1 - sit), old = smooth(0.84, 0.92, age);
  const bob = 0.012 * Math.abs(stride) * (1 - sit), lift = (q: V3): V3 => [q[0], q[1] + bob, q[2]];
  const L = (a: V3, b: V3, ra: number, rb: number, c: Col, n = 6) => limb(out, P, lift(a), lift(b), ra, rb, c, n);
  const hip = 0.2 + (0.135 - 0.2) * sit;
  for (const sd of [-1, 1]) {
    const sw = s * sd, m = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * sit, a[1] + (b[1] - a[1]) * sit, a[2] + (b[2] - a[2]) * sit];
    const a: V3 = [0, hip, 0.04 * sd], kn = m([sw * 0.5, 0.11, 0.04 * sd], [0.12, 0.14, 0.045 * sd]), f = m([sw, 0.03, 0.04 * sd], [0.13, 0.03, 0.05 * sd]);
    L(a, kn, 0.036, 0.032, legs);
    L(kn, f, 0.032, 0.03, legs);
    ball(out, P, lift([f[0] + 0.016, f[1] - 0.012, f[2]]), [0.04, 0.02, 0.027], shoes, 0);
  }
  const bend = st + 0.08 * lean, top: V3 = [bend, 0.37 - bend * 0.4, 0];
  L([0, hip + 0.01, 0], top, 0.078, 0.064, coat, 8);
  ball(out, P, lift([0, hip + 0.02, 0]), [0.085, 0.06, 0.08], coat, 1);
  const sh: V3 = [top[0], top[1] - 0.02, 0];
  const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const fwd = (z: number): V3 => [sh[0] + 0.15, sh[1] - 0.03, z];
  const hand = lerp3(lerp3([sh[0] + s * 0.6 + 0.02, sh[1] - 0.15 + 0.03 * sit, -0.085], [sh[0] + 0.1, sh[1] + 0.17, -0.06], arm), fwd(-0.045), reach);
  const left = lerp3(lerp3([sh[0] - s * 0.6 + 0.02, sh[1] - 0.15 + 0.03 * sit, 0.085], [sh[0] + 0.1, sh[1] + 0.17, 0.06], armL), fwd(0.045), reach);
  L([sh[0], sh[1], 0.07], left, 0.026, 0.022, coat);
  L([sh[0], sh[1], -0.07], hand, 0.026, 0.022, coat);
  if (old * (1 - sit) > 0.5) L([left[0] + 0.02, left[1], left[2] + 0.012], [left[0] + 0.05, 0, left[2] + 0.02], 0.008, 0.008, shoes, 4);
  // The head turns by `look`; the face is on its +x side.
  const hr = 0.085 + (0.064 - 0.085) * smooth(0, 0.45, age), hc: V3 = [top[0] + bend * 0.6 + 0.005, top[1] + 0.035 + hr + bob, 0];
  const ca = Math.cos(look * 0.6), sa = Math.sin(look * 0.6), cn = Math.cos(nod * 0.45), sn = Math.sin(nod * 0.45);
  // Tilt back (nod > 0) about z, then turn about y.
  const Hd: Place = (q) => {
    const x = q[0] * cn - q[1] * sn, y = q[0] * sn + q[1] * cn;
    return P([hc[0] + x * ca + q[2] * sa, hc[1] + y, hc[2] - x * sa + q[2] * ca]);
  };
  ball(out, Hd, [0, 0, 0], [hr, hr, hr], skin, 1);
  ball(out, Hd, [hr * 0.98, -0.008, 0], [0.012, 0.012, 0.012], skin, 0);
  for (const z of [-1, 1]) ball(out, Hd, [-0.004, -0.006, hr * 0.97 * z], [0.014, 0.014, 0.01], skin, 0);
  // Hair: a cap over the back and top, thinning when old; long hair falls down the back.
  // Cut as the box cuts it: behind a slanted plane over the brow; short hair thins to a fringe round the back when old.
  const hcap: V3 = [-0.012, 0.012, 0], R = hr * 1.07;
  shell(out, Hd, hcap, [R, R, R], hair, (d) => {
    const x = d[0] + hcap[0], y = d[1] + hcap[1];
    return y - 0.5 * x + 0.03 > 0.004 && (long || y - 0.03 + 0.35 * x - (1 - old) < 0);
  });
  if (long) limb(out, Hd, [-0.045, 0, 0], [-0.05, -0.1, 0], 0.05, 0.042, hair);
  // Eyes, brows, mouth, cheeks.
  for (const z of [-1, 1]) {
    ball(out, Hd, [hr * 0.92, 0.008, 0.026 * z], [0.006, 0.0085 * (1 - 0.85 * shut) + 0.0015, 0.0085], ink, 0);
    ball(out, Hd, [hr * 0.8, -0.016, hr * 0.56 * z], [0.008, 0.009, 0.013], cheeks, 0);
    limb(out, Hd, [hr * 0.88, 0.031 - 0.004 * smile, 0.015 * z], [hr * 0.86, 0.031 + 0.002 * smile, 0.037 * z], 0.003, 0.003, ink, 3);
    if (old > 0.5) ball(out, Hd, [hr * 1.03, 0.008, 0.026 * z], [0.004, 0.019, 0.019], { ...ink, color: [ink.color[0] + 40, ink.color[1] + 40, ink.color[2] + 40] }, 0);
  }
  limb(out, Hd, [hr * 0.97, -0.03 + 0.006 * smile, -0.014], [hr * 0.99, -0.034 - 0.004 * smile, 0], 0.003, 0.003, ink, 3);
  limb(out, Hd, [hr * 0.99, -0.034 - 0.004 * smile, 0], [hr * 0.97, -0.03 + 0.006 * smile, 0.014], 0.003, 0.003, ink, 3);
};

/** A dog facing +x (box/things.ts dog). Mats: coat, muzzle, nose and eyes, bandana, ears. */
export const dog: Build = (out, P, k, [coat, muzzle, dark, band, ears]) => {
  const [legs = 0, tail = 0, age = 0, w = 0] = k;
  const banded = w >= 1.5, lie = clamp01(w - (banded ? 2 : 0)), dn = lie * 0.075;
  ball(out, P, [0, 0.135 - dn, 0], [0.125, 0.06, 0.058], coat, 1);
  ball(out, P, [0.07, 0.15 - dn, 0], [0.06, 0.065, 0.055], coat, 1);
  const hc: V3 = [0.135, 0.205 - dn * 0.8 - age * 0.025, 0];
  limb(out, P, [0.08, 0.16 - dn, 0], hc, 0.035, 0.032, coat);
  ball(out, P, hc, [0.048, 0.048, 0.048], coat, 1);
  for (let i = 0; i < 4; i++) {
    const fx = i < 2 ? 0.08 : -0.08, sz = (i & 1) === 0 ? 0.035 : -0.035, sw = legs * 0.05 * (i === 0 || i === 3 ? 1 : -1) * (1 - lie);
    const a: V3 = [fx, 0.12 - dn, sz], f: V3 = [fx + sw + (fx + 0.07 - fx - sw) * lie, 0.015, sz + sz * 0.3 * lie];
    limb(out, P, a, f, 0.022, 0.017, coat, 5);
  }
  const tb: V3 = [-0.115, 0.15 - dn, 0];
  limb(out, P, tb, [tb[0] - 0.07, tb[1] + 0.07 - lie * 0.06, tail * 0.045], 0.017, 0.01, coat, 5);
  ball(out, P, [hc[0] + 0.045, hc[1] - 0.015, 0], [0.04, 0.025, 0.026], muzzle, 1);
  for (const z of [-1, 1]) {
    ball(out, P, [hc[0] - 0.012, hc[1] - 0.005, 0.045 * z], [0.022, 0.04, 0.012], ears, 1);
    ball(out, P, [hc[0] + 0.034, hc[1] + 0.016, 0.026 * z], [0.008, 0.008, 0.008], dark, 0);
  }
  ball(out, P, [hc[0] + 0.085, hc[1] - 0.008, 0], [0.012, 0.012, 0.012], dark, 0);
  if (banded) ball(out, P, [0.095, 0.165 - dn, 0], [0.032, 0.028, 0.062], band, 1);
};

export const lantern: Build = (out, P, _k, [iron, glass]) => {
  cube(out, P, [0, 0, 0], [0.018, 0.024, 0.018], glass);
  cube(out, P, [0, 0.03, 0], [0.022, 0.005, 0.022], iron);
};
