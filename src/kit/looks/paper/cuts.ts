// Shapes to cut from paper. Each fills (or, for holes, cuts away) in frame coordinates: 1080 × 1920, y down, with EDGE px
// spare all round. Combine several in one sheet's `cut`.
import { H, TAU, W, clamp01, flicker, lerp, rng, smooth, type Pen } from "../core";
import { EDGE, type Cut, type Part } from "./stage";

export type P = [number, number];

// ── Basics ─────────────────────────────────────────────────────────────────────────────────────────────

/** The whole sheet, uncut. */
export const full: Cut = (g) => g.fillRect(-EDGE, -EDGE, W + EDGE * 2, H + EDGE * 2);

/** Cuts away instead of filling while `f` runs. */
export function hole(g: Pen, f: () => void) {
  g.save();
  g.globalCompositeOperation = "destination-out";
  f();
  g.restore();
}

/** Any cut, moved, scaled and turned about its own origin. */
export const at = (x: number, y: number, scale: number, cut: Cut, o: { flip?: boolean; turn?: number } = {}): Cut => (g) => {
  g.save();
  g.translate(x, y);
  g.rotate(o.turn ?? 0);
  g.scale(o.flip ? -scale : scale, scale);
  cut(g);
  g.restore();
};

export const disc = (x: number, y: number, r: number): Cut => (g) => {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
};

/** A scalloped blob: leaves, smoke, hair, boulders. */
export function blob(g: Pen, x: number, y: number, rx: number, ry: number, bumps: number, seed: number) {
  const r = rng(seed);
  g.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * TAU, px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry;
    if (!i) g.moveTo(px, py);
    else {
      const m = ((i - 0.5) / bumps) * TAU, k = 1.16 + r() * 0.14;
      g.quadraticCurveTo(x + Math.cos(m) * rx * k, y + Math.sin(m) * ry * k, px, py);
    }
  }
  g.fill();
}

/** A tapering ribbon through points: roots, branches, arms, legs, rivers. */
export function limb(g: Pen, pts: P[], w0: number, w1: number) {
  const N = 26, n = pts.length - 1;
  const spline = (u: number): P => {
    const k = Math.min(n - 1, Math.floor(u * n)), f = u * n - k;
    const p = (i: number) => pts[Math.max(0, Math.min(n, i))];
    const c = (j: 0 | 1) =>
      0.5 * (2 * p(k)[j] + (p(k + 1)[j] - p(k - 1)[j]) * f + (2 * p(k - 1)[j] - 5 * p(k)[j] + 4 * p(k + 1)[j] - p(k + 2)[j]) * f * f + (3 * p(k)[j] - p(k - 1)[j] - 3 * p(k + 1)[j] + p(k + 2)[j]) * f ** 3);
    return [c(0), c(1)];
  };
  const left: P[] = [], right: P[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, [x, y] = spline(u), [x2, y2] = spline(Math.min(1, u + 0.01)), [x0, y0] = spline(Math.max(0, u - 0.01));
    const a = Math.atan2(y2 - y0, x2 - x0) + Math.PI / 2, w = (w0 + (w1 - w0) * u) / 2;
    left.push([x + Math.cos(a) * w, y + Math.sin(a) * w]);
    right.push([x - Math.cos(a) * w, y - Math.sin(a) * w]);
  }
  poly(g, [...left, ...right.reverse()]);
}

export function poly(g: Pen, pts: P[]) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}

// ── Sky ────────────────────────────────────────────────────────────────────────────────────────────────

/** A sheet with a scalloped opening: stack a few, growing, round a moon for the lightbox rings. */
export const ring = (x: number, y: number, rx: number, ry: number, seed: number, bumps = 24): Cut => (g) => {
  full(g);
  hole(g, () => blob(g, x, y, rx, ry, bumps, seed));
};

/** One flat-bottomed paper cloud from x0 to x1. Give its sheet a `drift`. */
export const cloud = (y: number, x0: number, x1: number, puff: number, seed: number): Cut => (g) => {
  const n = rng(seed);
  g.beginPath();
  g.moveTo(x0, y + 30);
  g.lineTo(x0, y);
  for (let x = x0; x < x1; ) {
    const w = puff * (0.7 + n() * 0.7), yy = y + (n() - 0.5) * 24;
    g.quadraticCurveTo(x + w / 2, yy - w * 0.95, x + w, yy);
    x += w;
  }
  g.quadraticCurveTo(x1 + 60, y + 34, x1 - 30, y + 44);
  g.lineTo(x0 + 30, y + 44);
  g.quadraticCurveTo(x0 - 60, y + 36, x0, y + 30);
  g.fill();
};

export function star(g: Pen, x: number, y: number, s: number) {
  poly(g, Array.from({ length: 8 }, (_, i): P => {
    const a = (i * TAU) / 8, k = i % 2 ? s * 0.35 : s;
    return [x + Math.cos(a) * k, y + Math.sin(a) * k];
  }));
}

/** Small star holes over a band of sky: for a sheet over a bright one. */
export function starHoles(g: Pen, y0: number, y1: number, n: number, seed: number) {
  const r = rng(seed);
  hole(g, () => {
    for (let i = 0; i < n; i++) star(g, r() * W, y0 + r() * (y1 - y0), 4 + r() * 8);
  });
}

export function bird(g: Pen, x: number, y: number, s = 1) {
  g.beginPath();
  g.moveTo(x - 40 * s, y - 12 * s);
  g.quadraticCurveTo(x - 18 * s, y - 24 * s, x, y);
  g.quadraticCurveTo(x + 18 * s, y - 24 * s, x + 40 * s, y - 12 * s);
  g.quadraticCurveTo(x + 18 * s, y - 14 * s, x, y + 9 * s);
  g.quadraticCurveTo(x - 18 * s, y - 14 * s, x - 40 * s, y - 12 * s);
  g.fill();
}

// ── Land and water ─────────────────────────────────────────────────────────────────────────────────────

/** Rolling ground across the whole width, filled to the bottom. */
export function hill(g: Pen, y: number, amp: number, seed: number, step = 90) {
  const r = rng(seed);
  g.beginPath();
  g.moveTo(-EDGE, H + EDGE);
  let x = -EDGE, py = y;
  g.lineTo(x, py);
  while (x < W + EDGE) {
    const ny = y + (r() - 0.5) * amp;
    g.quadraticCurveTo(x + step / 2, (py + ny) / 2 + (r() - 0.5) * amp * 0.6, x + step, ny);
    x += step;
    py = ny;
  }
  g.lineTo(W + EDGE, H + EDGE);
  g.fill();
}

/** A mountain with rough sides, or a volcano when `crater` (its width) is above 0. */
export function mountain(g: Pen, x: number, base: number, w: number, h: number, seed: number, crater = 0) {
  const r = rng(seed), N = 7;
  const side = (s: -1 | 1) =>
    Array.from({ length: N - 1 }, (_, i): P => {
      const k = (i + 1) / N;
      return [x + s * (lerp(w / 2, crater / 2, k) + (r() - 0.5) * 14), base - h * k ** 1.25 + (r() - 0.5) * 20];
    });
  poly(g, [[x - w / 2, base], ...side(-1), [x - crater / 2, base - h], [x, base - h + (crater ? 18 : 0)], [x + crater / 2, base - h], ...side(1).reverse(), [x + w / 2, base]]);
}

/** A strip of waves filled to the bottom. Stack a few with opposite `drift`s. */
export function waves(g: Pen, y: number, size: number) {
  g.beginPath();
  g.moveTo(-EDGE, H + EDGE);
  g.lineTo(-EDGE, y);
  for (let x = -EDGE; x < W + EDGE; x += size) {
    g.quadraticCurveTo(x + size * 0.3, y + size * 0.05, x + size * 0.5, y - size * 0.22);
    g.quadraticCurveTo(x + size * 0.62, y + size * 0.12, x + size, y);
  }
  g.lineTo(W + EDGE, H + EDGE);
  g.fill();
}

// ── Plants ─────────────────────────────────────────────────────────────────────────────────────────────

export function grass(g: Pen, y: number, seed: number, h: number, n: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = -EDGE + r() * (W + EDGE * 2), hh = h * (0.4 + r()), l = (r() - 0.5) * hh * 0.7, w = 5 + r() * 7;
    g.beginPath();
    g.moveTo(x - w, y + 50);
    g.quadraticCurveTo(x + l * 0.2, y - hh * 0.5, x + l, y - hh);
    g.quadraticCurveTo(x + w + l * 0.3, y - hh * 0.4, x + w, y + 50);
    g.fill();
  }
}

export function palm(g: Pen, x: number, y: number, h: number, s = 1) {
  g.lineWidth = 13 * s;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + 24 * s, y - h * 0.5, x - 8 * s, y - h);
  g.stroke();
  for (let i = 0; i < 9; i++) {
    const a = -3.5 + i * 0.5, L = 120 * s, ex = x - 8 * s + Math.cos(a) * L, ey = y - h + Math.sin(a) * L * 0.55 + 38 * s;
    g.beginPath();
    g.moveTo(x - 8 * s, y - h);
    g.quadraticCurveTo(x + Math.cos(a) * L * 0.6, y - h + Math.sin(a) * L * 0.9 - 20 * s, ex, ey);
    g.quadraticCurveTo(x + Math.cos(a) * L * 0.4, y - h + Math.sin(a) * L * 0.4 + 6 * s, x - 8 * s, y - h);
    g.fill();
  }
}

/** A round-headed tree standing at (x, y). */
export function tree(g: Pen, x: number, y: number, h: number, seed: number) {
  limb(g, [[x, y + 10], [x + h * 0.02, y - h * 0.3], [x, y - h * 0.6]], h * 0.1, h * 0.05);
  blob(g, x, y - h * 0.72, h * 0.26, h * 0.24, 11, seed);
  blob(g, x - h * 0.15, y - h * 0.56, h * 0.18, h * 0.14, 9, seed + 1);
  blob(g, x + h * 0.16, y - h * 0.57, h * 0.18, h * 0.14, 9, seed + 2);
}

/** Long leaves reaching in from both sides of the frame, for the sheet nearest the camera. */
export function sideLeaves(g: Pen, y: number, seed: number) {
  const r = rng(seed);
  for (const right of [false, true])
    for (let i = 0; i < 8; i++) {
      const a = (right ? 3.5 : -0.4) + (r() - 0.5) * 1.1, x = right ? W + 50 : -50, yy = y + i * 40, L = 200 + r() * 90;
      g.beginPath();
      g.moveTo(x, yy);
      g.quadraticCurveTo(x + Math.cos(a) * L * 0.5, yy + Math.sin(a) * L * 0.5 - 70, x + Math.cos(a) * L, yy + Math.sin(a) * L);
      g.quadraticCurveTo(x + Math.cos(a) * L * 0.5, yy + Math.sin(a) * L * 0.5 + 26, x, yy + 26);
      g.fill();
    }
}

/** Leafy vines, one hanging from each point. */
export function vines(g: Pen, from: P[], seed: number) {
  const r = rng(seed);
  for (const [x, y] of from) {
    const L = 40 + r() * 150;
    g.lineWidth = 3 + r() * 3;
    g.beginPath();
    g.moveTo(x, y - 60);
    g.lineTo(x, y + L);
    g.stroke();
    for (let k = 0; k < L / 22; k++) {
      g.beginPath();
      g.ellipse(x + (k % 2 ? 9 : -9), y + k * 22, 10, 5, k % 2 ? 0.5 : -0.5, 0, TAU);
      g.fill();
    }
  }
}

/** Leaf-shaped cuts that let the sheet behind shine through. */
export function leafHoles(g: Pen, spots: P[], seed: number) {
  const r = rng(seed);
  hole(g, () => {
    for (const [x, y] of spots) {
      g.save();
      g.translate(x, y);
      g.rotate(r() * 3);
      g.beginPath();
      g.moveTo(-15, 0);
      g.quadraticCurveTo(0, -11, 15, 0);
      g.quadraticCurveTo(0, 11, -15, 0);
      g.fill();
      g.restore();
    }
  });
}

/** Tall eye-shaped slits: hollows in a trunk, gills. Each is [x, y, half width, half height]. */
export function slits(g: Pen, list: [number, number, number, number][]) {
  hole(g, () => {
    for (const [x, y, a, b] of list) {
      g.beginPath();
      g.moveTo(x, y - b);
      g.quadraticCurveTo(x + a * 1.6, y, x - 4, y + b);
      g.quadraticCurveTo(x - a * 1.3, y, x, y - b);
      g.fill();
    }
  });
}

const blobs = (g: Pen, list: number[][], bumps: number, seed: number) => list.forEach(([x, y, a, b], i) => blob(g, x, y, a, b, bumps, seed + i));

/** A great balete (strangler fig) filling the frame, in three sheets. The gap in its crown is round (680, 760). */
export const balete: Record<"back" | "trunk" | "front", Cut> = {
  back: (g) => blobs(g, [[190, 780, 200, 120], [320, 600, 190, 110], [560, 440, 260, 80], [930, 540, 150, 100], [1020, 760, 120, 110], [110, 930, 140, 90], [1040, 930, 110, 80]], 15, 40),
  trunk: (g) => {
    limb(g, [[600, 1620], [585, 1400], [555, 1200], [540, 1060], [500, 930]], 310, 130);
    limb(g, [[560, 1150], [430, 1000], [320, 900], [170, 850]], 130, 34);
    limb(g, [[560, 1180], [660, 1080], [800, 1010], [1060, 940]], 170, 60);
    limb(g, [[510, 980], [440, 820], [360, 660], [330, 520]], 130, 40);
    limb(g, [[470, 880], [500, 720], [490, 560], [540, 430]], 70, 30);
    limb(g, [[860, 960], [960, 830], [985, 700], [960, 560]], 70, 34);
    const roots: P[][] = [[[520, 1350], [430, 1500], [300, 1600], [160, 1640]], [[640, 1350], [740, 1500], [860, 1600], [1010, 1640]], [[540, 1400], [490, 1540], [430, 1660]], [[620, 1400], [690, 1550], [740, 1670]], [[580, 1420], [590, 1560], [580, 1680]]];
    for (const p of roots) limb(g, p, 120, 46);
    const r = rng(77);
    for (let i = 0; i < 11; i++) {
      const x = 200 + i * 75 + (r() - 0.5) * 30;
      if (Math.abs(x - 580) < 110) continue;
      const y0 = (x > 600 ? 1060 : 900) + (r() - 0.5) * 40;
      limb(g, [[x, y0], [x + (r() - 0.5) * 36, y0 + 300], [x + (r() - 0.5) * 50, 1630]], 10 + r() * 14, 14 + r() * 18);
    }
    slits(g, [[500, 1330, 20, 120], [585, 1260, 16, 140], [650, 1390, 18, 100], [548, 1500, 14, 80], [560, 1120, 11, 70]]);
  },
  front: (g) => {
    blobs(g, [[150, 660, 190, 110], [310, 530, 170, 100], [560, 425, 210, 66], [800, 455, 180, 76], [985, 620, 110, 110], [30, 800, 140, 90], [1090, 800, 120, 90]], 14, 60);
    const r = rng(3);
    vines(g, Array.from({ length: 30 }, (_, i): P => {
      const x = i % 2 ? r() * 330 : 930 + r() * 150;
      return [x, 690 + Math.abs(x - 560) * 0.22 + r() * 30];
    }), 4);
    const q = rng(12);
    leafHoles(g, Array.from({ length: 46 }, (): P => {
      const s = q();
      return [s < 0.6 ? 60 + q() * 300 : s < 0.8 ? 940 + q() * 110 : 420 + q() * 450, s < 0.8 ? 540 + q() * 170 : 390 + q() * 70];
    }), 13);
  },
};

// ── Made things ────────────────────────────────────────────────────────────────────────────────────────

/** A nipa hut about 230 wide, its window cut through. (x, y) is the middle of its floor. */
export function hut(g: Pen, x: number, y: number, s = 1) {
  poly(g, [[x - 115 * s, y - 60 * s], [x, y - 170 * s], [x + 115 * s, y - 60 * s]]);
  g.fillRect(x - 85 * s, y - 70 * s, 170 * s, 70 * s);
  for (const k of [-70, -25, 25, 70]) g.fillRect(x + (k - 4) * s, y - 4 * s, 8 * s, 46 * s);
  hole(g, () => g.fillRect(x - 21 * s, y - 52 * s, 42 * s, 38 * s));
}

/** A small house with its windows cut through, about 180 wide. (x, y) is the middle of its foot. */
export function house(g: Pen, x: number, y: number, s = 1, seed = 1) {
  const r = rng(seed), w = (80 + r() * 20) * s, h = (90 + r() * 70) * s;
  g.fillRect(x - w, y - h, w * 2, h + 10 * s);
  poly(g, [[x - w * 1.15, y - h + 2], [x, y - h - 70 * s], [x + w * 1.15, y - h + 2]]);
  hole(g, () => {
    for (const k of [-0.5, 0.5]) g.fillRect(x + k * w - 14 * s, y - h * 0.65, 28 * s, 32 * s);
  });
}

/** An outrigger boat (banca), about 320 long, floating at (x, y). */
export function banca(g: Pen, x: number, y: number, s = 1) {
  g.beginPath();
  g.moveTo(x - 160 * s, y - 34 * s);
  g.quadraticCurveTo(x - 90 * s, y + 26 * s, x, y + 24 * s);
  g.quadraticCurveTo(x + 90 * s, y + 26 * s, x + 160 * s, y - 34 * s);
  g.quadraticCurveTo(x, y + 8 * s, x - 160 * s, y - 34 * s);
  g.fill();
  limb(g, [[x - 110 * s, y + 34 * s], [x, y + 40 * s], [x + 110 * s, y + 34 * s]], 9 * s, 9 * s);
  for (const k of [-60, 60]) limb(g, [[x + k * s, y], [x + k * s, y + 38 * s]], 6 * s, 6 * s);
}

/** A tongue of flame from its base. */
export function flame(g: Pen, x: number, y: number, w: number, h: number, lean = 0) {
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.bezierCurveTo(x - w * 0.8, y - h * 0.5, x + lean - w * 0.1, y - h * 0.55, x + lean, y - h);
  g.bezierCurveTo(x + lean + w * 0.2, y - h * 0.6, x + w * 0.8, y - h * 0.45, x + w / 2, y);
  g.closePath();
  g.fill();
}

/** The lightbox's front: a dark sheet with a scalloped arch cut out of it. */
export const archFrame = (margin = 70, shoulder = 600, floor = 120): Cut => (g) => {
  full(g);
  hole(g, () => {
    const n = 13, rx = W / 2 - margin, ry = 450;
    g.beginPath();
    g.moveTo(margin, H - floor);
    g.lineTo(margin, shoulder);
    for (let i = 0; i < n; i++) {
      const a = Math.PI + ((i + 1) / n) * Math.PI, m = Math.PI + ((i + 0.5) / n) * Math.PI;
      g.quadraticCurveTo(W / 2 + Math.cos(m) * (rx + 50), shoulder + Math.sin(m) * (ry + 50), W / 2 + Math.cos(a) * rx, shoulder + Math.sin(a) * ry);
    }
    g.lineTo(W - margin, H - floor);
    g.closePath();
    g.fill();
  });
};

// ── People and creatures ───────────────────────────────────────────────────────────────────────────────

/** Someone in a wide hat as a jointed puppet, 310 px tall, facing right, feet at (x, y). `walking(t)` 0…1 is the stride.
 * Put `parts` on a sheet, add `bob(t)` to its `move`, and hang a lantern at `hand`. */
export function traveller(x: number, y: number, walking: (t: number) => number): { parts: Part[]; hand: P; bob: (t: number) => number } {
  const swing = (t: number) => Math.sin(t * 6.5) * 0.36 * walking(t);
  const hip: P = [x, y - 96];
  const leg: Cut = (g) => {
    limb(g, [[x, y - 102], [x - 1, y - 50], [x - 2, y - 4]], 36, 24);
    limb(g, [[x - 10, y], [x + 24, y]], 18, 13);
  };
  return {
    parts: [
      { cut: leg, pivot: hip, turn: swing },
      { cut: leg, pivot: hip, turn: (t) => -swing(t) },
      { cut: (g) => limb(g, [[x - 20, y - 214], [x - 40, y - 150], [x - 32, y - 108]], 26, 18), pivot: [x - 18, y - 212], turn: (t) => swing(t) * 0.5 },
      {
        pivot: hip,
        cut: (g) => {
          blob(g, x, y - 262, 34, 38, 14, 2);
          g.beginPath();
          g.moveTo(x - 62, y - 262);
          g.quadraticCurveTo(x, y - 346, x + 66, y - 262);
          g.quadraticCurveTo(x, y - 282, x - 62, y - 262);
          g.fill();
          g.beginPath();
          g.moveTo(x - 34, y - 226);
          g.quadraticCurveTo(x, y - 246, x + 32, y - 226);
          g.lineTo(x + 46, y - 84);
          g.lineTo(x - 46, y - 84);
          g.fill();
        },
      },
      { cut: (g) => limb(g, [[x + 18, y - 212], [x + 62, y - 190], [x + 100, y - 216]], 26, 16), pivot: [x + 14, y - 212] },
    ],
    hand: [x + 100, y - 216],
    bob: (t) => -Math.abs(Math.sin(t * 6.5)) * 10 * walking(t),
  };
}

/** The kapre: a huge hairy giant sitting hunched, 560 px tall. Its eyes go at (694, 738), its cigar from (690, 786). */
export const kapre: Cut = (g) => {
  blob(g, 735, 905, 150, 185, 26, 21);
  blob(g, 700, 735, 92, 98, 22, 22);
  limb(g, [[620, 860], [560, 960], [590, 1060], [650, 1080]], 90, 60);
  limb(g, [[850, 870], [930, 980], [900, 1080]], 90, 60);
  limb(g, [[680, 1010], [600, 950], [560, 1080], [555, 1190]], 100, 64);
  limb(g, [[800, 1020], [880, 960], [900, 1080], [905, 1200]], 100, 64);
  blob(g, 540, 1215, 60, 30, 9, 23);
  blob(g, 925, 1225, 60, 30, 9, 24);
  const r = rng(8);
  g.lineWidth = 5;
  for (let i = 0; i < 70; i++) {
    const a = r() * 6.28, x = 735 + Math.cos(a) * 150, y = 900 + Math.sin(a) * 180;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 24, y + Math.abs(Math.sin(a)) * 14 + 22);
    g.stroke();
  }
  for (let i = 0; i < 34; i++) {
    const a = -3.7 + i * 0.135, x = 700 + Math.cos(a) * 84, y = 735 + Math.sin(a) * 90, L = 34 + r() * 46, b = a + (r() - 0.5) * 0.9 + Math.cos(a) * 0.25;
    g.beginPath();
    g.moveTo(x + Math.sin(a) * 17, y - Math.cos(a) * 17);
    g.quadraticCurveTo(x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.6, x + Math.cos(b) * L, y + Math.sin(b) * L);
    g.lineTo(x - Math.sin(a) * 17, y + Math.cos(a) * 17);
    g.fill();
  }
};

// ── Light, for a sheet's `after` ───────────────────────────────────────────────────────────────────────

/** A soft pool of light added over the paper. `rgb` like "255,160,70". */
export function shine(g: Pen, x: number, y: number, r: number, rgb: string, a: number) {
  if (a <= 0) return;
  g.save();
  g.globalCompositeOperation = "lighter";
  const gr = g.createRadialGradient(x, y, 2, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(0.16, `rgba(${rgb},${a * 0.42})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

/** A hand lantern hanging from (x, y). `power` 0 is out. */
export function lantern(g: Pen, x: number, y: number, t: number, power = 1) {
  g.save();
  g.strokeStyle = "#150f24";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + 2, y + 24);
  g.stroke();
  shine(g, x, y + 50, 430 * flicker(t), "255,160,75", 0.85 * power);
  g.fillStyle = "#3b1d12";
  g.fillRect(x - 20, y + 22, 40, 8);
  g.fillRect(x - 20, y + 78, 40, 8);
  g.fillStyle = power > 0.2 ? "#ffe3a3" : "#6b5a48";
  g.beginPath();
  g.roundRect(x - 16, y + 30, 32, 48, 8);
  g.fill();
  g.restore();
}

/** A pair of slit-pupilled eyes, glowing. `look` −1…1 turns the pupils to one side and down. */
export function eyes(g: Pen, x: number, y: number, open: number, o: { gap?: number; size?: number; look?: number; color?: string; rgb?: string } = {}) {
  if (open <= 0.02) return;
  const { gap = 72, size = 24, look = 0, color = "#ffd873", rgb = "255,120,20" } = o;
  for (const s of [-1, 1]) {
    const ex = x + (s * gap) / 2;
    shine(g, ex, y, size * 3.3, rgb, 0.5 * open);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(ex - size, y);
    g.quadraticCurveTo(ex, y - size * 1.08 * open, ex + size, y);
    g.quadraticCurveTo(ex, y + size * 0.92 * open, ex - size, y);
    g.fill();
    g.fillStyle = "#2a0d08";
    g.beginPath();
    g.ellipse(ex - size * 0.3 * look, y + size * 0.17 * Math.abs(look), size * 0.25, size * 0.54 * open, 0, 0, TAU);
    g.fill();
  }
}

/** A cigar from (x0, y0) to (x, y) with a glowing end and paper puffs of smoke, lit from time `from`. */
export function cigar(g: Pen, x0: number, y0: number, x: number, y: number, t: number, from: number) {
  const k = smooth(from, from + 0.35, t);
  if (k <= 0.02) return;
  g.save();
  g.lineCap = "round";
  g.strokeStyle = "#5d3926";
  g.lineWidth = 13;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x, y);
  g.stroke();
  shine(g, x, y, 130, "255,100,30", k * (0.75 + 0.25 * Math.sin(t * 9)));
  g.fillStyle = "#ffb35c";
  disc(x, y, 8)(g);
  smoke(g, x - 10, y - 20, t - from - 0.25);
  g.restore();
}

/** Paper puffs rising from (x, y), `age` seconds after the first. */
export function smoke(g: Pen, x: number, y: number, age: number, color = "#b98f95") {
  for (let i = 0; i < 5; i++) {
    const a = age - i * 0.45;
    if (a < 0) continue;
    const v = (a % 2.25) / 2.25, r = 14 + v * 34;
    g.save();
    g.globalAlpha *= (1 - v) * 0.85 * clamp01(v * 8);
    g.shadowColor = "rgba(18,6,30,0.5)";
    g.shadowBlur = 14;
    g.shadowOffsetY = 8;
    g.fillStyle = color;
    blob(g, x + Math.sin(v * 5 + i) * 34, y - v * 250, r, r * 0.7, 8, i + 70);
    g.restore();
  }
}
