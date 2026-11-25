// Act 5, stars: Earth falling round the Sun, light wandering for ages in the Sun's core before streaking to a face, a star
// dying and pouring out the iron that ends up in blood, new stars pinching off in pillars of gas, and a black hole.
import { smooth } from "../../../src/kit/looks/core";
import { inProfile, placeProfile } from "./drawn";
import { PALETTE, frac, TAU, gaussOf, hash, kinds, paint, put, sphere, wave3, type Make, type Span } from "./make";

const P = PALETTE.stars;
const len = (s: Span) => s.to - s.from;

/** The Sun's boiling surface and its arcs, at `c` with radius R. */
const sunParts = (c: [number, number, number], R: number) => [
  {
    w: 0.5,
    make: (r: () => number) => [r(), r(), r()],
    life: (o: number[], u: number, key: number) => {
      const [x, y, z] = sphere(o[0], o[1], R * (0.96 + 0.04 * o[2]));
      const g = wave3(x * 4 + u * 0.3, y * 4, z * 4 - u * 0.2);
      put(o, c[0] + x, c[1] + y, c[2] + z);
      paint(o, P, 0.02 + 0.08 * g + 0.04 * key, 0.9 + 0.5 * g);
    },
  },
  {
    // Arcs rising off the edge.
    w: 0.12,
    make: (r: () => number) => [Math.floor(r() * 9), r(), gaussOf(r)],
    life: (o: number[], u: number) => {
      const a = o[0], k = o[1], [ax, ay, az] = sphere(hash(a), hash(a + 1), 1), h = 0.55 * (0.6 + 0.4 * Math.sin(u * 0.8 + a)) * Math.sin(Math.PI * k);
      const side = [-az, 0, ax], n = Math.hypot(side[0], side[2]) || 1, sp = (k - 0.5) * 0.7;
      put(o, c[0] + ax * (R + h) + (side[0] / n) * sp + o[2] * 0.02, c[1] + ay * (R + h), c[2] + az * (R + h) + (side[2] / n) * sp);
      paint(o, P, 0.1, 1.1);
    },
  },
];

/** Earth falling round the Sun, never landing, leaving a ring of light behind it. */
const sun: Make = (s) => {
  const ORB = 3.4, tilt = 0.45;
  const at = (th: number): [number, number, number] => [Math.cos(th) * ORB * Math.sin(tilt), Math.sin(th) * ORB * 1.1, Math.cos(th) * ORB * Math.cos(tilt)];
  return kinds(s, [
    ...sunParts([0, 0, 0], 1.45),
    {
      w: 0.06,
      make: (r) => [r(), r()],
      life: (o, u) => {
        const c = at(u * 0.55 + 1), [x, y, z] = sphere(o[0], o[1], 0.13);
        put(o, c[0] + x, c[1] + y, c[2] + z);
        paint(o, PALETTE.earth, 0.25, 1.5);
      },
    },
    {
      w: 0.32,
      make: (r) => [r(), gaussOf(r)],
      life: (o, u) => {
        const behind = o[0], now = u * 0.55 + 1, th = now - behind * TAU, c = at(th);
        put(o, c[0], c[1] + o[1] * 0.015, c[2]);
        paint(o, P, 0.95, 0.15 + 0.9 * (1 - behind) ** 3);
      },
    },
  ]);
};

/** Where the face sits: the profile, small, low in the frame, turned up towards the Sun. */
const FACE = { size: 4.2, at: [0.35, -2.2] as [number, number], rot: 0.5 };
const CHEEK = placeProfile(700, 560, FACE.size, FACE.at, FACE.rot);

/** Light wandering in the Sun's core, bounced around for ages; then out, and straight to a face. */
const sunlight: Make = (s) => {
  const L = len(s), C: [number, number, number] = [0, 2.8, 0], K = 700, out = L * 0.6, cheek: [number, number, number] = [CHEEK[0], CHEEK[1], 0];
  // The wander: steps in random directions, kept inside the Sun.
  const walk = new Float32Array(K * 3);
  let p = [...C];
  for (let i = 0; i < K; i++) {
    const [dx, dy, dz] = sphere(hash(i * 3.1), hash(i * 5.7), 0.16);
    let q = [p[0] + dx, p[1] + dy, p[2] + dz];
    if (Math.hypot(q[0] - C[0], q[1] - C[1], q[2] - C[2]) > (i === K - 1 ? 9 : 1.25)) q = [p[0] - dx, p[1] - dy, p[2] - dz];
    walk.set(q, i * 3);
    p = q;
  }
  const exit: [number, number, number] = [walk[(K - 1) * 3], walk[(K - 1) * 3 + 1], walk[(K - 1) * 3 + 2]];
  const along = (f: number): [number, number, number] => {
    const i = Math.min(K - 2, Math.floor(f)), k = f - i;
    return [walk[i * 3] + (walk[i * 3 + 3] - walk[i * 3]) * k, walk[i * 3 + 1] + (walk[i * 3 + 4] - walk[i * 3 + 1]) * k, walk[i * 3 + 2] + (walk[i * 3 + 5] - walk[i * 3 + 2]) * k];
  };
  return kinds(s, [
    {
      // The Sun, faint, so the path shows through.
      w: 0.25,
      make: (r) => [r(), r(), r()],
      life: (o, u, key) => {
        const [x, y, z] = sphere(o[0], o[1], 1.5 * (0.9 + 0.1 * o[2]));
        put(o, C[0] + x, C[1] + y, C[2] + z);
        paint(o, P, 0.02 + 0.06 * key, 0.4);
      },
    },
    {
      // The path so far: the newest part brightest.
      w: 0.35,
      make: (r) => [r(), gaussOf(r)],
      life: (o, u) => {
        const k = o[0], head = (K - 1) * smooth(0, out, u), f = k * head, q = along(f);
        put(o, q[0] + o[1] * 0.012, q[1] + o[1] * 0.012, q[2]);
        paint(o, P, 0.92 + 0.06 * k, head > 1 ? 0.25 + 1.2 * (f / head) ** 6 : 0);
      },
    },
    {
      // Out at last: a streak to the cheek.
      w: 0.12,
      make: (r) => [r(), gaussOf(r)],
      life: (o, u) => {
        const at = o[0], go = smooth(out, out + 1.1, u), k = at * go;
        put(o, exit[0] + (cheek[0] - exit[0]) * k + o[1] * 0.015, exit[1] + (cheek[1] - exit[1]) * k, exit[2] + (cheek[2] - exit[2]) * k);
        paint(o, P, 0.95, u > out ? 0.5 + 1.2 * (at > 0.85 ? 1 : 0.6) : 0);
      },
    },
    {
      // The face, engraved in contour lines, warming to gold where the light lands.
      w: 0.28,
      make: (r) => inProfile(r, (d) => d < 5 || frac(d / 24) < 0.2),
      life: (o, u, key) => {
        const [x, y] = placeProfile(o[0], o[1], FACE.size, FACE.at, FACE.rot), lit = smooth(out + 0.9, out + 2.2, u) * Math.exp(-((x - cheek[0]) ** 2 + (y - cheek[1]) ** 2) * 0.9);
        put(o, x, y, 0);
        // Cool teal lines, warming straight to gold (not through the palette's red).
        const k = Math.min(1, lit * 1.4), cool = [0.12, 0.62, 0.7], warm = [1.25, 0.86, 0.4], g = (0.42 + 0.03 * key) * (1 - k) + 1.5 * k;
        for (let c = 0; c < 3; c++) o[3 + c] = (cool[c] + (warm[c] - cool[c]) * k) * g;
      },
    },
  ]);
};

/** A star falls in on itself, bursts, and its iron pours away in a red river. A pulsar spins where it was. */
const supernova: Make = (s) => {
  const shellR = (u: number) => (u < 0.6 ? 1.3 - 0.9 * smooth(0, 0.6, u) : 0.4 + 3.5 * (1 - Math.exp(-(u - 0.6) * 0.55)));
  return kinds(s, [
    {
      w: 0.52,
      make: (r) => [r(), r(), r()],
      life: (o, u, key) => {
        const [nx, ny, nz] = sphere(o[0], o[1], 1), finger = 1 + 0.32 * wave3(nx * 3, ny * 3, nz * 3) * smooth(0.6, 3, u), R = shellR(u) * finger * (0.85 + 0.15 * o[2]);
        put(o, nx * R, ny * R * 1.25, nz * R);
        const age = smooth(0.6, 6, u);
        paint(o, P, 0.05 + 0.25 * age + 0.1 * (finger - 1) + 0.04 * key, (u < 0.6 ? 1.4 : 2.8 - 1.2 * age) * (0.8 + 0.6 * (finger - 0.7)));
      },
    },
    {
      // The iron: a red river pouring down out of the shell.
      w: 0.24,
      make: (r) => [r(), gaussOf(r), gaussOf(r)],
      life: (o, u, key) => {
        const k = frac(o[0] + u * 0.16), open = smooth(1, 3, u), y = -0.6 - k * 5 * open, sw = 0.55 * Math.sin(k * 7 - u * 0.8) * k, spread = 0.12 + 0.35 * k;
        put(o, sw + o[1] * spread, y, 0.4 + o[2] * spread * 0.6);
        paint(o, P, 0.25 + 0.04 * key, 1.4 * open * smooth(0, 0.1, k));
      },
    },
    {
      // What's left: a spinning star with two beams.
      w: 0.14,
      make: (r) => [r() < 0.25 ? 0 : 1, r(), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        if (o[0] === 0) {
          put(o, o[2] * 0.06, o[3] * 0.06, o[1] * 0.06);
          o[3] = o[4] = o[5] = u > 0.6 ? 2.4 : 0;
          return;
        }
        const k = (o[1] - 0.5) * 2, a = u * 2.2, d = k * 3.2;
        put(o, Math.sin(a) * d * 0.5 + o[2] * 0.03, d, Math.cos(a) * d * 0.5 + o[3] * 0.03);
        paint(o, P, 0.55, smooth(1.2, 2.5, u) * (1 - Math.abs(k)) * 1.3);
      },
    },
    {
      w: 0.1,
      make: (r) => [r(), r(), r()],
      life: (o, u, key) => {
        const [x, y, z] = sphere(o[0], o[1], shellR(u) * (1.15 + 0.8 * o[2]));
        put(o, x, y * 1.25, z);
        paint(o, P, 0.7 + 0.2 * key, 0.4 * smooth(0.6, 2, u));
      },
    },
  ]);
};

/** Pillars of gas, lit from above; at their tips, knots pinch off and catch fire as new stars. */
const nebula: Make = (s) => {
  const L = len(s), PILLARS: [number, number, number][] = [[-1.5, 2.6, 0.75], [0.25, 4.2, 0.95], [1.7, 1.6, 0.6]];
  return kinds(s, [
    {
      w: 0.62,
      make: (r) => [Math.floor(r() * 3), r(), r(), r()],
      life: (o, u, key) => {
        const [px, h, w] = PILLARS[o[0]], k = o[1], y = -5 + (h + 5) * k, rad = w * (1.2 - 0.6 * k) * (0.6 + 0.4 * Math.sqrt(o[3])), a = o[2] * TAU;
        const lump = 1 + 0.35 * wave3(px + Math.cos(a) * 2, y * 0.8, Math.sin(a) * 2 + u * 0.05);
        put(o, px + Math.cos(a) * rad * lump + 0.2 * Math.sin(y * 0.7), y, Math.sin(a) * rad * lump);
        // Lit from above: the tops and edges glow rose, the body is teal.
        const top = smooth(0.7, 1, k);
        paint(o, P, 0.5 + 0.4 * top + 0.05 * key, 0.32 + 0.5 * top + 0.2 * o[3]);
      },
    },
    {
      // New stars: knots at the tips, brightening.
      w: 0.12,
      make: (r) => [Math.floor(r() * 5), gaussOf(r), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const n = o[0], pl = PILLARS[n % 3], born = smooth(n * 0.6, n * 0.6 + L * 0.5, u), rad = 0.3 * (1 - 0.7 * born);
        put(o, pl[0] + (hash(n) - 0.5) * 0.6 + o[1] * rad, pl[1] + 0.5 * hash(n + 1) + o[2] * rad, o[3] * rad);
        paint(o, P, 0.98, 0.5 + 2 * born);
      },
    },
    {
      w: 0.26,
      make: (r) => [r(), r()],
      life: (o, u, key) => {
        const x = (o[0] - 0.5) * 9, y = (o[1] - 0.5) * 12, g = wave3(x * 0.6, y * 0.5 + u * 0.03, 1);
        put(o, x, y, -2.8 + g);
        paint(o, P, 0.5 + 0.3 * g, Math.max(0, 0.15 + 0.3 * g));
      },
    },
  ]);
};

/** A black hole: a hot disk spiralling in, its far side bent up over the top and under the bottom, a ring of light at the
 * edge, and nothing at all in the middle. */
const blackhole: Make = (s) => {
  const IN = 1.25, OUT = 4.2;
  return kinds(s, [
    {
      w: 0.5,
      make: (r) => [r(), r(), gaussOf(r)],
      life: (o, u, key) => {
        const k = frac(o[0] + u * 0.05), r = OUT - (OUT - IN) * k ** 0.7, a = o[1] * TAU + u * 2.4 * r ** -1.5;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        put(o, x, o[2] * 0.03 * r, z);
        const hot = (OUT - r) / (OUT - IN), toward = 0.6 + 0.5 * Math.sin(a);
        paint(o, P, 0.25 - 0.27 * hot + 0.02 * key, (0.35 + 1.2 * hot ** 2) * toward);
      },
    },
    {
      // The far side, lensed: arcs over the top and under the bottom.
      w: 0.22,
      make: (r) => [r(), r(), r() < 0.62 ? 1 : -1],
      life: (o, u) => {
        const a = o[0] * Math.PI, out = o[1], up = o[2] > 0, rr = 1.1 + 0.9 * out ** 1.5, flow = Math.sin(a * 5 + u * 3) * 0.04;
        put(o, Math.cos(a) * rr, (up ? 1 : -0.8) * Math.sin(a) * rr + flow, -0.6);
        const hot = 1 - out;
        paint(o, P, 0.2 - 0.2 * hot, (0.3 + 1.1 * hot ** 2) * (up ? 1 : 0.6));
      },
    },
    {
      w: 0.1,
      make: (r) => [r(), gaussOf(r)],
      life: (o, u) => {
        const a = o[0] * TAU;
        put(o, Math.cos(a) * (1.02 + o[1] * 0.01), Math.sin(a) * (1.02 + o[1] * 0.01), 0.1);
        paint(o, P, 0.98, 1.8 + 0.3 * Math.sin(a * 3 + u * 4));
      },
    },
    {
      // Starlight bent round it: a tall ring of stretched stars.
      w: 0.12,
      make: (r) => [r(), gaussOf(r), r()],
      life: (o, u, key, ph) => {
        const a = o[0] * TAU + u * 0.02, rr = 3.1 + o[1] * 0.22, bright = o[2] > 0.9;
        put(o, Math.cos(a) * rr * 0.78, Math.sin(a) * rr * 1.3, -1.2);
        paint(o, PALETTE.cosmic, 0.2 + 0.2 * key, (0.35 + 0.5 * (bright ? 1 : 0)) * (0.7 + 0.3 * Math.sin(u * 2.5 + ph)));
      },
    },
    {
      // Matter falling in from far away.
      w: 0.18,
      make: (r) => [Math.floor(r() * 4), r(), gaussOf(r), gaussOf(r)],
      life: (o, u) => {
        const n = o[0], k = frac(o[1] + u * 0.09), r = 8 - (8 - OUT) * k, a = hash(n) * TAU + k * 2.2;
        put(o, Math.cos(a) * r + o[2] * 0.15, (hash(n + 1) - 0.5) * 6 * (1 - k) + o[3] * 0.15, Math.sin(a) * r);
        paint(o, P, 0.2, 0.55 * smooth(0, 0.2, k));
      },
    },
  ]);
};

export const STARS: Record<string, Make> = { sun, sunlight, supernova, nebula, blackhole };
