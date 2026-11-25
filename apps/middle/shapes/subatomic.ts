// Act 1, subatomic: nested worlds round the middle of everything, which we fall into, the boiling foam of space, strings singing, particles flickering in and out of
// nothing, the proton's three quarks in their gluon sea, a quark pulled until the pull becomes matter, a nucleus that
// shrinks to a seed in a stadium of nothing, the electron's cloud of maybes, and the light an electron throws off as it falls.
import { keyed, smooth } from "../../../src/kit/looks/core";
import { ringPoint, tiltRing } from "./drawn";
import { PALETTE, frac, TAU, gaussOf, hash, kinds, paint, put, sphere, type Make, type Span } from "./make";

const P = PALETTE.subatomic;
const len = (s: Span) => s.to - s.from;

/** Nested worlds: five rings, one per scale (the atom's orbits, a hoop of DNA, a string of cells, a planet's orbit, a
 * galaxy's disc), turning on their own axes like an armillary round one bright seed, the exact middle. `gather`: the
 * rings fly in from far away and settle (the last scene), ending as the first scene begins, so the film loops. */
export const armillary = (gather: boolean): Make => (s) => {
  const L = len(s), PALS = [PALETTE.subatomic, PALETTE.molecules, PALETTE.cells, PALETTE.earth, PALETTE.cosmic], SHARE = [0.13, 0.2, 0.2, 0.15, 0.32];
  const ringOf = (k: number) => {
    let i = 0;
    for (let acc = SHARE[0]; k > acc && i < 4; acc += SHARE[++i]);
    return i;
  };
  const far = (ring: number, u: number) => (gather ? 1 + 3.5 * (1 - smooth(0.3 + ring * 0.5, L * 0.6 + ring * 0.4, u)) ** 2 : 1);
  return kinds(s, [
    {
      w: 0.84,
      make: (r) => [ringOf(r()), r(), r(), r()],
      life: (o, u, key) => {
        // Gathering, the rings keep a clock that reaches 0 at the scene's end: the opening's first moment.
        const ring = o[0], v = gather ? u - L : u, q = tiltRing(ring, ringPoint(ring, o[1], o[2], o[3], v), v), k = far(ring, u);
        put(o, q[0] * k, q[1] * k, q[2] * k);
        paint(o, PALS[ring], 0.1 + 0.6 * key + 0.05 * Math.sin(v * 0.5 + ring), (ring === 3 && o[3] < 0.12 ? 1.6 : 1) * (0.75 + 0.35 * key));
      },
    },
    {
      w: 0.05,
      make: (r) => [gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        // It flares as the worlds arrive and settles back to its opening size on the very last frame.
        const glow = gather ? 1 + 1.5 * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - (L - 3)) / 3))) : 1;
        put(o, o[0] * 0.07 * glow, o[1] * 0.07 * glow, o[2] * 0.07 * glow);
        // It grows rather than burning brighter, so it never goes white.
        const hot = 1 + 0.2 * (glow - 1);
        o[3] = 2.2 * hot;
        o[4] = 2 * hot;
        o[5] = 1.8 * hot;
      },
    },
    {
      // Dust of light round it all.
      w: 0.11,
      make: (r) => [r(), r(), r()],
      life: (o, u, key, ph) => {
        const [x, y, z] = sphere(o[0], o[1], 3.6 * Math.cbrt(o[2]));
        put(o, x, y * 1.35, z);
        const v = gather ? u - L : u;
        paint(o, P, key, 0.25 * (0.5 + 0.5 * Math.sin(v * 2 + ph)));
      },
    },
  ]);
};

/** Space boiling: bubbles of light that swell and pop and form again somewhere else. */
const foam: Make = (s) => {
  const B = 70;
  return kinds(s, [
    {
      w: 0.86,
      make: (r) => [Math.floor(r() * B), r(), r(), r()],
      life: (o, u, key) => {
        const b = o[0], per = 2.2 + 1.6 * hash(b), f0 = (u + hash(b + 7) * per) / per, cyc = Math.floor(f0), f = f0 - cyc;
        const id = b * 13.1 + cyc * 7.7, R = (0.5 + 0.85 * hash(id + 3)) * f ** 0.55 * (f > 0.92 ? 1 + (f - 0.92) * 4 : 1);
        const [x, y, z] = sphere(o[1], o[2], R), boil = 0.04 * Math.sin(u * 7 + key * 40);
        put(o, (hash(id) - 0.5) * 6 + x + boil, (hash(id + 1) - 0.5) * 9.6 + y + boil, (hash(id + 2) - 0.5) * 5 + z);
        const pop = f > 0.92 ? 1 - (f - 0.92) / 0.08 : 1;
        paint(o, P, hash(b) * 0.5 + f * 0.4, (1 + 2.2 * f ** 3) * pop);
      },
    },
    {
      w: 0.14,
      make: (r) => [r(), r(), r()],
      life: (o, u, key, ph) => {
        put(o, (o[0] - 0.5) * 6.4 + 0.2 * Math.sin(u * 0.4 + ph), (o[1] - 0.5) * 10 + 0.2 * Math.sin(u * 0.3 + ph * 2), (o[2] - 0.5) * 5);
        paint(o, P, key, 0.45 * (0.6 + 0.4 * Math.sin(u * 3 + ph)));
      },
    },
  ]);
};

/** Tiny loops of light, each ringing in its own mode, like the notes of a chord. */
const strings: Make = (s) => {
  const L = 48;
  return kinds(s, [
    {
      w: 0.8,
      make: (r) => [Math.floor(r() * L), r()],
      life: (o, u) => {
        const l = o[0], a = o[1] * TAU, m = 2 + Math.floor(hash(l) * 6), R = 0.22 + 0.42 * hash(l + 1), w = 2.5 + 2 * hash(l + 2);
        const ring = Math.sin(m * a + w * u + l), r = R * (1 + 0.28 * ring);
        const lx = Math.cos(a) * r, ly = Math.sin(a) * r, lz = 0.12 * R * Math.cos(m * a - w * u);
        // Each loop turned its own way, and slowly tumbling.
        const p = hash(l + 3) * TAU + u * 0.3 * (hash(l + 4) - 0.5), q = hash(l + 5) * TAU + u * 0.2;
        const y1 = ly * Math.cos(p) - lz * Math.sin(p), z1 = ly * Math.sin(p) + lz * Math.cos(p);
        const x2 = lx * Math.cos(q) + z1 * Math.sin(q), z2 = -lx * Math.sin(q) + z1 * Math.cos(q);
        put(o, (hash(l + 6) - 0.5) * 4.8 + x2, (hash(l + 7) - 0.5) * 8.2 + y1 + 0.1 * Math.sin(u * 0.5 + l), (hash(l + 8) - 0.5) * 4 + z2);
        paint(o, P, m / 7 + 0.1 * Math.sin(u * 0.2), 0.85 + 0.8 * Math.abs(ring));
      },
    },
    {
      // Open strings: a standing wave along a short line.
      w: 0.2,
      make: (r) => [Math.floor(r() * 14), r()],
      life: (o, u) => {
        const l = o[0] + 100, x = o[1], k = 1 + Math.floor(hash(l) * 4), w = 3 + 2 * hash(l + 1), A = 0.18 * Math.sin(k * Math.PI * x) * Math.cos(w * u);
        const a = hash(l + 2) * TAU, lenS = 1.1 + 0.6 * hash(l + 3), along = (x - 0.5) * lenS;
        put(o, (hash(l + 4) - 0.5) * 4.6 + Math.cos(a) * along - Math.sin(a) * A, (hash(l + 5) - 0.5) * 8 + Math.sin(a) * along + Math.cos(a) * A, (hash(l + 6) - 0.5) * 3);
        paint(o, P, 0.55 + k * 0.08, 0.8 + 0.8 * Math.abs(A) / 0.18);
      },
    },
  ]);
};

/** Pairs of particles born from nothing, curling away from each other in opposite spirals, then gone. */
const vacuum: Make = (s) => {
  const E = 64;
  return kinds(s, [
    {
      w: 1,
      make: (r) => [Math.floor(r() * E), r(), r() < 0.5 ? 0 : 1],
      life: (o, u) => {
        const e = o[0], side = o[2], trail = o[1], per = 2.4 + 1.4 * hash(e), f0 = (u + hash(e + 9) * per) / per, cyc = Math.floor(f0), f = f0 - cyc, id = e * 17.3 + cyc * 5.1;
        const tau = f * per, at = tau * (1 - trail);
        const sign = side ? -1 : 1, A = 0.5 + 0.9 * hash(id + 4), T = 0.5 + 0.5 * hash(id + 5);
        const rho = A * (1 - Math.exp(-at / T)), th = hash(id + 6) * TAU + (side ? Math.PI : 0) + sign * at * (2.4 + 1.5 * hash(id + 7));
        // Each pair's spirals lie in their own tilted plane.
        const tilt = hash(id + 8) * TAU, x = Math.cos(th) * rho, y = Math.sin(th) * rho;
        put(o, (hash(id) - 0.5) * 6 + x, (hash(id + 1) - 0.5) * 9.4 + y * Math.cos(tilt), (hash(id + 2) - 0.5) * 4 + y * Math.sin(tilt));
        const life = smooth(0, 0.05, f) * (1 - smooth(0.7, 1, f)), head = (1 - trail) ** 1.6;
        o[3] = side ? 0.18 : 1;
        o[4] = side ? 0.8 : 0.22;
        o[5] = side ? 1 : 0.75;
        const g = life * (0.15 + 1.1 * head) + (f < 0.06 ? 1.2 * (1 - f / 0.06) * (trail > 0.9 ? 1 : 0) : 0);
        for (let c = 3; c < 6; c++) o[c] *= g;
      },
    },
  ]);
};

/** A quark's wandering path inside the proton. */
const quark = (q: number, u: number): [number, number, number] => [
  1.75 * Math.sin(u * (0.9 + 0.2 * q) + q * 2.1) + 0.35 * Math.sin(u * 2.3 + q),
  1.9 * Math.sin(u * (0.7 + 0.15 * q) + q * 4.2) + 0.35 * Math.sin(u * 1.9 + q * 3),
  1.1 * Math.sin(u * (0.8 + 0.1 * q) + q * 1.3),
];
const CHARGE: [number, number, number][] = [[1, 0.25, 0.42], [0.3, 1, 0.55], [0.32, 0.5, 1]];

/** Three quarks wandering in a churning sea of gluon light, inside a haze that is the proton's edge. */
const proton: Make = (s) =>
  kinds(s, [
    {
      // The edge.
      w: 0.22,
      make: (r) => [r(), r(), r()],
      life: (o, u, key, ph) => {
        const R = 2.7 * (0.88 + 0.12 * o[2]) * (1 + 0.03 * Math.sin(u * 2.2)), [x, y, z] = sphere(o[0], o[1], R);
        put(o, x, y * 1.55, z);
        paint(o, P, 0.05 + 0.1 * key, 1 + 0.25 * Math.sin(u * 2 + ph));
      },
    },
    {
      w: 0.24,
      make: (r) => [Math.floor(r() * 3), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const q = o[0], [x, y, z] = quark(q, u), R = 0.32;
        put(o, x + o[1] * R, y + o[2] * R, z + o[3] * R);
        const c = CHARGE[q];
        for (let k = 0; k < 3; k++) o[3 + k] = c[k] * 1.25;
      },
    },
    {
      // Gluon strands between each pair, twisting, with light running along them.
      w: 0.38,
      make: (r) => [Math.floor(r() * 3), r(), r()],
      life: (o, u) => {
        const a = o[0], b = (a + 1) % 3, k = o[1], A = quark(a, u), B = quark(b, u);
        const ang = o[2] * TAU + k * 12 - u * 5, rad = 0.09 + 0.07 * Math.sin(k * 9 - u * 4);
        put(o, A[0] + (B[0] - A[0]) * k + Math.cos(ang) * rad, A[1] + (B[1] - A[1]) * k + Math.sin(ang) * rad, A[2] + (B[2] - A[2]) * k + Math.sin(ang * 0.7) * rad);
        const pulse = 0.5 + 0.5 * Math.sin(k * 14 - u * 7);
        paint(o, P, 0.25 + 0.35 * k + 0.1 * a, 0.35 + 0.75 * pulse);
      },
    },
    {
      // The sea: quark pairs flickering everywhere inside.
      w: 0.16,
      make: (r) => [r(), r(), r(), r()],
      life: (o, u, key) => {
        const [x, y, z] = sphere(o[0], o[1], 2.6 * o[2] ** 0.5), per = 0.6 + key, f = frac((u + o[3] * per) / per);
        put(o, x, y * 1.5, z);
        paint(o, P, key, 2.2 * Math.sin(Math.PI * f) ** 4);
      },
    },
  ]);

/** A quark pulled from its partner: the strand stretches thin and bright, snaps, and the snap is two new quarks. */
const confine: Make = (s) => {
  const L = len(s), snap = L * 0.55;
  const ends = (u: number) => {
    // y of the two first quarks (A up, B down) and the new pair (A2 under A, B2 over B).
    const d = 0.9 + 6.6 * smooth(0, snap, u) ** 1.4, y = Math.min(d, 7.5) / 2;
    if (u < snap) return { A: y, B: -y, A2: 0, B2: 0, after: 0 };
    const tau = u - snap, drift = 0.25 * tau, pull = 1 - Math.exp(-3 * tau);
    const A = 3.75 + drift, A2 = 0.15 + (A - 1.35 - 0.15) * pull;
    return { A, B: -A, A2, B2: -A2, after: tau };
  };
  return kinds(s, [
    {
      w: 0.28,
      make: (r) => [Math.floor(r() * 4), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const e = ends(u), q = o[0], y = [e.A, e.B, e.A2, e.B2][q], born = q < 2 || u >= snap ? 1 : 0;
        put(o, o[1] * 0.22, y + o[2] * 0.22, o[3] * 0.22);
        paint(o, P, q < 2 ? 0.1 : 0.55, 1.2 * born);
        o[3] += 0.3 * born;
        o[4] += 0.3 * born;
        o[5] += 0.3 * born;
      },
    },
    {
      w: 0.6,
      make: (r) => [r(), r()],
      life: (o, u) => {
        const e = ends(u), k = o[0];
        let y0: number, y1: number, kk: number;
        if (u < snap) [y0, y1, kk] = [e.B, e.A, k];
        else if (k < 0.5) [y0, y1, kk] = [e.A2, e.A, k * 2];
        else [y0, y1, kk] = [e.B, e.B2, (k - 0.5) * 2];
        // Three strands braided round each other, and a soft halo round the braid.
        const stretch = Math.abs(y1 - y0), halo = o[1] > 0.8, rad = (halo ? 1.6 : 0.75) / Math.sqrt(1 + stretch * 0.4), strand = Math.floor(o[1] * 3.75);
        const ang = halo ? o[1] * 40 : (strand * TAU) / 3 + kk * 11 - u * 5 + 0.25 * Math.sin(o[1] * 90), w = halo ? Math.sqrt(hash(o[1] * 9)) : 1;
        put(o, Math.cos(ang) * rad * w, y0 + (y1 - y0) * kk, Math.sin(ang) * rad * w);
        const tense = u < snap ? 0.4 + 0.8 * smooth(0, snap, u) : 0.55;
        paint(o, P, 0.2 + 0.4 * tense + 0.1 * Math.sin(kk * 10 - u * 8), tense * (halo ? 0.25 : 0.7 + 0.6 * Math.sin(kk * 20 - u * 9) ** 2));
      },
    },
    {
      // The snap: sparks thrown out from the break.
      w: 0.12,
      make: (r) => [r(), r(), r()],
      life: (o, u, key) => {
        const tau = u - snap, [x, y, z] = sphere(o[0], o[1], 1), d = tau > 0 ? (2.6 + 2 * o[2]) * (1 - Math.exp(-tau * 2.2)) : 0;
        put(o, x * d, y * d * 1.3, z * d);
        paint(o, P, 0.6 + 0.3 * key, tau > 0 ? 1.6 * Math.exp(-tau * 1.1) : 0);
      },
    },
  ]);
};

/** Protons and neutrons packed and trembling; then the nucleus shrinks to a seed in a stadium of nothing. */
const nucleus: Make = (s) => {
  const L = len(s), N = 14, scale = keyed([[0, 1], [L * 0.42, 1], [L * 0.9, 0.05]]);
  const at = Array.from({ length: N }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    const R = i === 0 || i === N - 1 ? 0.55 : 0.82;
    return [Math.cos(a) * rr * R, y * R * 1.1, Math.sin(a) * rr * R];
  });
  return kinds(s, [
    {
      w: 0.7,
      make: (r) => [Math.floor(r() * N), r(), r(), r()],
      life: (o, u, key) => {
        const n = o[0], c = at[n], k = scale(u), j = 0.07 * Math.sin(u * 6 + n * 2), [x, y, z] = sphere(o[1], o[2], 0.44 * (0.75 + 0.25 * o[3]));
        put(o, (c[0] + j + x) * k * 1.5, (c[1] + y + 0.6 * j) * k * 1.5, (c[2] + z) * k * 1.5);
        const proton = n % 2 === 0, pulse = 0.85 + 0.25 * Math.sin(u * 3.1 + n);
        if (proton) paint(o, P, 0.25 + 0.05 * key, pulse * (1 + 1.5 * (1 - k)));
        else {
          o[3] = o[4] = 0.62 * pulse * (1 + 1.5 * (1 - k));
          o[5] = 0.95 * pulse * (1 + 1.5 * (1 - k));
        }
      },
    },
    {
      // The stadium: a faint far shell, there once the nucleus is small.
      w: 0.18,
      make: (r) => [r(), r()],
      life: (o, u, key, ph) => {
        const [x, y, z] = sphere(o[0], o[1], 2.45);
        put(o, x, y * 1.6, z);
        paint(o, P, 0.55 + 0.1 * key, 0.8 * smooth(L * 0.45, L * 0.8, u) * (0.6 + 0.4 * Math.sin(u * 2 + ph)));
      },
    },
    {
      // Rushing back: streaks flying out from the middle.
      w: 0.12,
      make: (r) => [r(), r(), r()],
      life: (o, u, key) => {
        const [x, y, z] = sphere(o[0], o[1], 1), d = 0.3 + (frac(o[2] + u * 0.9)) * 4;
        put(o, x * d, y * d * 1.5, z * d);
        paint(o, P, 0.6, 0.55 * smooth(L * 0.4, L * 0.55, u) * (1 - smooth(L * 0.85, L, u)) * (1 - (d - 0.3) / 4));
      },
    },
  ]);
};

/** The electron's cloud of maybes: orbitals around a spark, a fifth of its points jumping somewhere new four times a second. */
const cloud: Make = (s) =>
  kinds(s, [
    {
      w: 0.97,
      make: (r) => [Math.floor(r() * 3), r(), r(), r(), r()],
      life: (o, u, key, ph) => {
        const kind = o[0], hop = key < 0.22 ? Math.floor(u * 4) : 0, h = (k: number) => (hop ? hash(key * 977 + hop * 13 + k) : o[1 + k]);
        const g = (a: number, b: number) => Math.sqrt(-2 * Math.log(Math.max(1e-4, a))) * Math.cos(TAU * b);
        let x: number, y: number, z: number;
        if (kind === 0) [x, y, z] = [g(h(0), h(1)) * 0.6, g(h(2), h(1) + 0.25) * 0.6, g(h(3), h(0)) * 0.6];
        else if (kind === 1) {
          // p: two lobes up and down.
          const side = h(3) < 0.5 ? -1 : 1;
          [x, y, z] = [g(h(0), h(1)) * 0.65, side * (2.1 + g(h(2), h(1) + 0.25) * 0.85), g(h(3), h(0)) * 0.65];
        } else {
          // d: four lobes round the middle, turning.
          const lobe = Math.floor(h(3) * 4), a = (lobe + 0.5) * (TAU / 4) + u * 0.25;
          [x, y, z] = [Math.cos(a) * 1.7 + g(h(0), h(1)) * 0.5, g(h(2), h(1)) * 0.35, Math.sin(a) * 1.7 + g(h(1), h(2)) * 0.5];
        }
        const b = 0.15 * u;
        put(o, x * Math.cos(b) + z * Math.sin(b), y, -x * Math.sin(b) + z * Math.cos(b));
        paint(o, P, [0.5, 0.05, 0.27][kind] + 0.08 * Math.sin(u + ph), (hop ? 0.9 : 0.55) * (0.75 + 0.25 * Math.sin(u * 2 + ph)));
      },
    },
    {
      w: 0.03,
      make: (r) => [gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o) => {
        put(o, o[0] * 0.06, o[1] * 0.06, o[2] * 0.06);
        o[3] = o[4] = o[5] = 2.2;
      },
    },
  ]);

/** Balmer's colours: the red, blue-green and violet light of hydrogen. */
const LINES: [number, number, number][] = [[1, 0.16, 0.12], [0.18, 0.9, 1], [0.6, 0.22, 1]];
const WAVE = [0.42, 0.32, 0.27];

/** An electron climbs to an outer shell, falls back, and throws off a ribbon of coloured light each time. */
const light: Make = (s) => {
  const PER = 1.3, shell = [1, 1.8, 2.6];
  // Where the electron is: it rises over the first half of each period, falls at its end.
  const level = (u: number) => {
    const f = (((u % PER) + PER) % PER) / PER;
    return f < 0.15 ? 0 : f < 0.85 ? 2 : 2 - 2 * smooth(0.85, 1, f);
  };
  const electron = (u: number): [number, number, number] => {
    const lv = level(u), R = shell[Math.floor(lv)] + (shell[Math.min(2, Math.ceil(lv))] - shell[Math.floor(lv)]) * frac(lv), a = u * 2.6;
    return [Math.cos(a) * R, Math.sin(a) * R * 0.85, Math.sin(a) * R * 0.3];
  };
  return kinds(s, [
    {
      w: 0.25,
      make: (r) => [Math.floor(r() * 3), r()],
      life: (o, u) => {
        const n = o[0], R = shell[n], a = o[1] * TAU;
        put(o, Math.cos(a) * R, Math.sin(a) * R * 0.85, Math.sin(a) * R * 0.3);
        paint(o, P, 0.35 + 0.1 * n, 0.6);
      },
    },
    {
      w: 0.07,
      make: (r) => [gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const [x, y, z] = electron(u);
        put(o, x + o[0] * 0.13, y + o[1] * 0.13, z + o[2] * 0.13);
        o[3] = 1.2;
        o[4] = 1.3;
        o[5] = 1.8;
      },
    },
    {
      // Ribbons of light: each fall sends one out, up or down the frame.
      w: 0.68,
      make: (r) => [Math.floor(r() * 3), r(), r()],
      life: (o, u) => {
        const n = Math.floor(u / PER) - o[0], age = u - (n * PER + 0.95 * PER);
        const line = Math.floor(hash(n + 31) * 3), dir = hash(n + 7) < 0.5 ? 1 : -1, lean = (hash(n + 3) - 0.5) * 1.1;
        const k = o[1], head = age * 2.6, back = head - k * 2.2, A = 0.42 * Math.sin(Math.PI * k) ** 2;
        const wv = Math.sin((TAU * back) / (WAVE[line] * 1.6) - age * 3), turn = (o[2] - 0.5) * 0.9;
        put(o, lean * back + A * wv * Math.cos(turn), dir * back, A * wv * Math.sin(turn) + 0.4);
        const c = LINES[line], g = n >= 0 && age > 0 && back > 0.3 && back < 4.8 ? (1.6 - 0.26 * back) * Math.sin(Math.PI * k) : 0;
        // Not sent yet, or gone off the frame: wait, unlit, at the atom.
        if (g <= 0) put(o, 0, 0, 0);
        for (let i = 0; i < 3; i++) o[3 + i] = c[i] * Math.max(0, g);
      },
    },
  ]);
};

export const SUBATOMIC: Record<string, Make> = { hook: armillary(false), foam, strings, vacuum, proton, confine, nucleus, cloud, light };
