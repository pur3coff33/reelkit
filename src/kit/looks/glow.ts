// Light that adds up: the toolkit behind the "creative" points-of-light frames (The Cosmic Egg mocks, apps/cosmic-egg/mix.ts).
// Points of light piled into one buffer (Light), flowing in a curl-noise current (stream), laid along lines like gold
// engraving (along), or gathered in stained-glass shards (shard). Plus the shapes that carry the ideas: a head in
// profile to hold a world inside, an egg, a crack, and a mask to fill any outline.
import { H, TAU, W, canvas, lerp, rng, smooth, type Pen } from "./core";

export type P = [number, number];

export type C3 = [number, number, number];

// ---------------------------------------------------------------- smoke: ember in a curl-noise wind
export type Stops = [number, [number, number, number]][];

// ---------------------------------------------------------------- shapes
/** A head and shoulders in profile, facing right, in a 1000-unit box. */
export const HEAD: P[] = [
  [40, 1010], [110, 905], [230, 845], [325, 775], [345, 700], [300, 610], [272, 480], [300, 330], [400, 215], [540, 172],
  [655, 215], [715, 300], [735, 390], [748, 425], [728, 452], [742, 482], [775, 530], [806, 566], [790, 586], [758, 598],
  [768, 624], [748, 642], [760, 664], [738, 690], [748, 738], [706, 776], [618, 792], [592, 860], [690, 925], [790, 1010],
];

export function spline(pts: P[], per = 10): P[] {
  const out: P[] = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

export const headAt = (s: number, ox: number, oy: number, flip = false) => spline(HEAD).map(([x, y]) => [flip ? ox - x * s : ox + x * s, oy + y * s] as P);

export function egg(cx: number, cy: number, a: number, b: number, n = 240): P[] {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU;
    out.push([cx + a * Math.sin(th) * (1 + 0.13 * Math.cos(th)), cy + b * Math.cos(th)]);
  }
  return out;
}

export const ring = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = TAU, n = 0): P[] => {
  const m = n || Math.max(24, Math.ceil(((a1 - a0) * Math.max(rx, ry)) / 3));
  return Array.from({ length: m + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / m;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P;
  });
};

export function path(g: Pen, pts: P[]) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

export function maskOf(pts: P[]) {
  const c = canvas(), g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  path(g, pts);
  g.fill();
  const d = g.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return m;
}

/** Points of a mask, most of them on its edge. */
export function seeds(m: Uint8Array, n: number, edgeShare: number, seed: number) {
  const r = rng(seed), out: P[] = [];
  const edge = (i: number, j: number) => [[-5, 0], [5, 0], [0, -5], [0, 5]].some(([a, b]) => !m[(j + b) * W + i + a]);
  let tries = 0;
  while (out.length < n && tries++ < n * 60) {
    const i = 6 + Math.floor(r() * (W - 12)), j = 6 + Math.floor(r() * (H - 12));
    if (!m[j * W + i]) continue;
    if (out.length < n * edgeShare ? edge(i, j) : !edge(i, j)) out.push([i + r(), j + r()]);
  }
  return out;
}

/** A jagged crack down the egg, as a list of points. */
export function crackLine(x0: number, y0: number, y1: number, seed: number): P[] {
  const r = rng(seed), out: P[] = [[x0, y0]];
  let x = x0;
  for (let y = y0 + 28 + r() * 26; y < y1; y += 28 + r() * 26) out.push([(x += (r() - 0.5) * 70), y]);
  return out;
}

export function segDist(px: number, py: number, [ax, ay]: P, [bx, by]: P) {
  const dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - k * dx, py - ay - k * dy);
}

export const lineDist = (x: number, y: number, pts: P[]) => pts.slice(1).reduce((m, p, i) => Math.min(m, segDist(x, y, pts[i], p)), Infinity);

// ---------------------------------------------------------------- glass: one window, every shard a life
export const hash = (i: number, j: number, s: number) => {
  let h = (i * 374761393 + j * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** The nearest seed of a jittered grid, and how far the pixel is from that shard's edge. */
export function shard(x: number, y: number, size: number, salt: number) {
  const ci = Math.floor(x / size), cj = Math.floor(y / size);
  let d1 = Infinity, d2 = Infinity, a = [0, 0, 0, 0], b = [0, 0];
  for (let di = -1; di <= 1; di++)
    for (let dj = -1; dj <= 1; dj++) {
      const i = ci + di, j = cj + dj, sx = (i + 0.1 + 0.8 * hash(i, j, salt)) * size, sy = (j + 0.1 + 0.8 * hash(i, j, salt + 1)) * size;
      const d = (x - sx) ** 2 + (y - sy) ** 2;
      if (d < d1) {
        d2 = d1;
        b = [a[2], a[3]];
        d1 = d;
        a = [i, j, sx, sy];
      } else if (d < d2) {
        d2 = d;
        b = [sx, sy];
      }
    }
  return { i: a[0], j: a[1], edge: (d2 - d1) / (2 * Math.hypot(b[0] - a[2], b[1] - a[3]) + 1e-6) };
}

// ---------------------------------------------------------------- noise and finishing
export function perlin(seed: number) {
  const r = rng(seed), perm = [...Array(256).keys()], p = new Uint8Array(512);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const grad = (h: number, x: number, y: number) => {
    const a = ((h & 15) / 16) * TAU;
    return Math.cos(a) * x + Math.sin(a) * y;
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number) => {
    const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255, u = fade(xf), v = fade(yf);
    const aa = p[p[xi] + yi], ab = p[p[xi] + yi + 1], ba = p[p[xi + 1] + yi], bb = p[p[xi + 1] + yi + 1];
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u), lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
  };
}

// ---------------------------------------------------------------- light that adds up
export class Light {
  acc = new Float32Array(W * H * 3);
  /** Seconds. The current drifts with it, and the dots of every stream flow along it. */
  t = 0;
  private flowNoise = perlin(11);
  private grid?: Float32Array;
  private gridT = NaN;
  private static shared?: Light;
  /** The one buffer a film reuses, emptied, at time t. */
  static frame(t: number) {
    const L = (Light.shared ??= new Light());
    L.acc.fill(0);
    L.t = t;
    return L;
  }
  /** One point of light, `size` px across. */
  dot(x: number, y: number, c: ArrayLike<number>, w: number, size = 1.4) {
    const r = Math.ceil(size), x0 = Math.round(x), y0 = Math.round(y);
    if (x0 < -r || y0 < -r || x0 >= W + r || y0 >= H + r || w <= 0) return;
    const k = 1 / (size * size * 0.55);
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++) {
        const xi = x0 + i, yj = y0 + j;
        if (xi < 0 || yj < 0 || xi >= W || yj >= H) continue;
        const f = w * Math.exp(-((xi - x) ** 2 + (yj - y) ** 2) * k), o = (yj * W + xi) * 3;
        this.acc[o] += c[0] * f;
        this.acc[o + 1] += c[1] * f;
        this.acc[o + 2] += c[2] * f;
      }
  }
  /** The current at a point, straight from the noise (slow: streams read the grid). */
  curl(x: number, y: number, scale = 260) {
    const n = this.flowNoise, s = 1 / scale, e = 0.01, dx = this.t * 0.035, dy = -this.t * 0.02;
    const f = (x: number, y: number) => n(x * s + dx, y * s + dy) + 0.45 * n(x * s * 2.3 + 7 + dx, y * s * 2.3 + 3);
    return [(f(x, y + e / s) - f(x, y - e / s)) / (2 * e), -(f(x + e / s, y) - f(x - e / s, y)) / (2 * e)];
  }
  /** The current, read from a grid worked out once per frame. */
  flow(x: number, y: number): [number, number] {
    const G = 8, gw = Math.ceil(W / G) + 4, gh = Math.ceil(H / G) + 4;
    if (!this.grid || this.gridT !== this.t) {
      this.grid ??= new Float32Array(gw * gh * 2);
      for (let j = 0; j < gh; j++)
        for (let i = 0; i < gw; i++) {
          const [vx, vy] = this.curl((i - 2) * G, (j - 2) * G);
          this.grid[(j * gw + i) * 2] = vx;
          this.grid[(j * gw + i) * 2 + 1] = vy;
        }
      this.gridT = this.t;
    }
    const fx = Math.max(0, Math.min(gw - 1.001, x / G + 2)), fy = Math.max(0, Math.min(gh - 1.001, y / G + 2));
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, g = this.grid, o = (j * gw + i) * 2, o2 = o + gw * 2;
    return [
      (g[o] * (1 - u) + g[o + 2] * u) * (1 - v) + (g[o2] * (1 - u) + g[o2 + 2] * u) * v,
      (g[o + 1] * (1 - u) + g[o + 3] * u) * (1 - v) + (g[o2 + 1] * (1 - u) + g[o2 + 3] * u) * v,
    ];
  }
  /** Dots streaming from (x, y) in the current, one every `every` steps (1.25 px each), fading and changing colour as they
   * go. They move outwards `speed` steps a second, so a stream flows. */
  stream(x: number, y: number, steps: number, wind: P | ((x: number, y: number) => P), stops: Stops, w: number, every = 6, size = 1.3, speed = 22) {
    const ph = (this.t * speed + Math.abs(x * 12.9898 + y * 78.233)) % every, k0 = Math.floor(ph), fr = ph - k0;
    for (let k = 0; k <= steps; k++) {
      const [wx, wy] = typeof wind === "function" ? wind(x, y) : wind, [vx, vy] = this.flow(x, y), sp = 1.25 / Math.max(0.3, Math.hypot(vx + wx, vy + wy));
      const nx = x + (vx + wx) * sp, ny = y + (vy + wy) * sp;
      if ((((k - k0) % every) + every) % every === 0) {
        const f = steps ? k / steps : 0;
        this.dot(x + (nx - x) * fr, y + (ny - y) * fr, colorAt(stops, f), w * (1 - f) ** 1.2, size * (1 - 0.4 * f));
      }
      x = nx;
      y = ny;
      if (x < -40 || y < -40 || x > W + 40 || y > H + 40) break;
    }
  }
  /** Dots along a polyline, `gap` px apart. `shift` (px) slides them along it. */
  along(pts: P[], gap: number, c: ArrayLike<number>, w: number, size = 1.4, keep?: (x: number, y: number) => boolean, shift = 0) {
    let carry = ((shift % gap) + gap) % gap;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay);
      for (let d = carry; d < len; d += gap) {
        const x = ax + ((bx - ax) * d) / len, y = ay + ((by - ay) * d) / len;
        if (!keep || keep(x, y)) this.dot(x, y, c, w, size);
      }
      carry = (carry - len) % gap;
      if (carry < 0) carry += gap;
    }
  }
  draw(g: Pen, gain = 1.4) {
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let p = 0; p < W * H; p++) {
      const o = p * 3, q = p * 4;
      // Piled-up light gets brighter in its own colour, and only the hottest goes white.
      const r = this.acc[o], gg = this.acc[o + 1], b = this.acc[o + 2], m = Math.max(r, gg, b);
      if (m <= 0) continue;
      // The light covers the ground under it, so gold on blue stays gold.
      const cover = 1 - Math.exp(-m * gain), k = cover / m, under = 1 - 0.85 * cover, white = 255 * smooth(3, 12, m * gain) * 0.45;
      d[q] = Math.min(255, d[q] * under + 255 * r * k + white);
      d[q + 1] = Math.min(255, d[q + 1] * under + 255 * gg * k + white);
      d[q + 2] = Math.min(255, d[q + 2] * under + 255 * b * k + white);
    }
    g.putImageData(img, 0, 0);
  }
}

export function ground(g: Pen, inner: string, outer: string, cy = 760) {
  const bg = g.createRadialGradient(W / 2, cy, 60, W / 2, cy, 1350);
  bg.addColorStop(0, inner);
  bg.addColorStop(1, outer);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
}

/** Light bleeding into the dark around bright things. */
let soft: HTMLCanvasElement | undefined;
export function bloom(g: Pen, radius = 24, amount = 0.6) {
  // Blurred at half size: four times less work, and nobody can tell in a glow.
  soft ??= canvas(W / 2, H / 2);
  const s = soft.getContext("2d")!;
  s.clearRect(0, 0, W / 2, H / 2);
  s.filter = `blur(${radius / 2}px)`;
  s.drawImage(g.canvas, 0, 0, W / 2, H / 2);
  s.filter = "none";
  g.save();
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = amount;
  g.drawImage(soft, 0, 0, W, H);
  g.restore();
}

export function finish(g: Pen, seed: number, grain = 10) {
  const v = g.createRadialGradient(W / 2, H * 0.42, H * 0.25, W / 2, H * 0.45, H * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.75)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  // A shade under the words.
  const b = g.createLinearGradient(0, 1250, 0, 1700);
  b.addColorStop(0, "rgba(0,0,0,0)");
  b.addColorStop(0.5, "rgba(0,0,0,0.55)");
  b.addColorStop(1, "rgba(0,0,0,0.3)");
  g.fillStyle = b;
  g.fillRect(0, 1250, W, 450);
  const img = g.getImageData(0, 0, W, H), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * grain;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

export function colorAt(stops: Stops, k: number) {
  const i = Math.max(1, stops.findIndex(([at]) => at >= k));
  const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (k - a) / Math.max(1e-6, b - a);
  return [lerp(ca[0], cb[0], f), lerp(ca[1], cb[1], f), lerp(ca[2], cb[2], f)];
}

export const rgb = (c: number[]): C3 => [c[0] / 255, c[1] / 255, c[2] / 255];

export const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

export const EMBER: Stops = [[0, [1.0, 0.62, 0.25]], [0.25, [1.0, 0.3, 0.32]], [0.55, [0.55, 0.22, 0.95]], [1, [0.1, 0.55, 0.95]]];

export const WHITE_GOLD: Stops = [[0, [1, 0.95, 0.8]], [0.3, [1, 0.75, 0.35]], [0.7, [0.95, 0.35, 0.45]], [1, [0.4, 0.25, 0.9]]];

export const SEA_GLASS: Stops = [[0, [0.95, 0.98, 1]], [0.2, [0.5, 0.95, 1]], [0.55, [0.2, 0.55, 1]], [1, [0.55, 0.25, 0.95]]];

export const GOLD: C3 = [1, 0.72, 0.3];

export const GOLD_PALE: C3 = [1, 0.86, 0.55];

export const COLD = ["#1a2a9a", "#12206e", "#2b1a86", "#0f3d96", "#3c1670", "#1f56b0", "#0c5f78", "#16207a", "#5a1050", "#1b3c8a"].map(hex);

export const WARM = ["#ffb43a", "#ff8a24", "#ffd772", "#ff6a3d", "#ffe9b0", "#f29c38", "#ff5a78", "#ffc45a", "#e0602a"].map(hex);

// ---------------------------------------------------------------- shapes that move
/** Where a shape goes in the frame: its anchor `a` (in its own units) lands on (x, y), scaled, mirrored, turned. */
export type Place = { x: number; y: number; s: number; a?: P; flip?: boolean; rot?: number };
export function placer({ x, y, s, a = [0, 0], flip = false, rot = 0 }: Place) {
  const c = Math.cos(rot), sn = Math.sin(rot), sx = flip ? -s : s;
  return {
    to: ([u, v]: P): P => {
      const dx = (u - a[0]) * sx, dy = (v - a[1]) * s;
      return [x + dx * c - dy * sn, y + dx * sn + dy * c];
    },
    from: (fx: number, fy: number): P => {
      const ex = fx - x, ey = fy - y, dx = ex * c + ey * sn, dy = -ex * sn + ey * c;
      return [a[0] + dx / sx, a[1] + dy / s];
    },
  };
}

/** An outline in its own units (it must fit inside the frame), with its mask and the points on and in it, worked out once
 * and then placed anywhere. */
export class Form {
  private m?: Uint8Array;
  private kept = new Map<string, P[] | Float32Array>();
  constructor(
    readonly outline: P[],
    readonly anchor: P,
  ) {}
  get mask() {
    return (this.m ??= maskOf(this.outline));
  }
  inside([u, v]: P) {
    const i = Math.round(u), j = Math.round(v);
    return i >= 0 && j >= 0 && i < W && j < H && this.mask[j * W + i] === 1;
  }
  /** `n` points, `edge` (0…1) of them on the edge. */
  points(n: number, edge: number, seed = 1): P[] {
    const key = `p${n},${edge},${seed}`;
    if (!this.kept.has(key)) this.kept.set(key, seeds(this.mask, n, edge, seed));
    return this.kept.get(key) as P[];
  }
  /** A grid of points `gap` apart inside, each in a stained-glass shard `cell` across: x, y, the shard's own chance (0…1),
   * and how far the point is from the seam. Mirrored forms mirror their shards, so two people share one pattern. */
  glass(gap: number, cell: number, salt: number): Float32Array {
    const key = `g${gap},${cell},${salt}`;
    if (!this.kept.has(key)) {
      const out: number[] = [], r = rng(salt);
      for (let y = 0; y < H; y += gap)
        for (let x = 0; x < W; x += gap) {
          const jx = x + (r() - 0.5) * gap * 0.7, jy = y + (r() - 0.5) * gap * 0.7;
          if (!this.inside([jx, jy])) continue;
          const sh = shard(jx, jy, cell, salt);
          out.push(jx, jy, hash(sh.i, sh.j, salt), sh.edge);
        }
      this.kept.set(key, Float32Array.from(out));
    }
    return this.kept.get(key) as Float32Array;
  }
  /** The outline, placed. */
  at(p: Place) {
    const to = placer({ a: this.anchor, ...p }).to;
    return this.outline.map(to);
  }
}

/** A child's head in profile, facing right: a rounder skull, a small nose and chin. */
export const CHILD: P[] = [
  [60, 1010], [130, 930], [250, 880], [330, 820], [340, 760], [290, 690], [250, 560], [255, 420], [310, 300], [420, 215],
  [560, 190], [680, 230], [760, 320], [790, 430], [792, 500], [772, 530], [800, 578], [790, 600], [762, 610], [772, 640],
  [752, 660], [762, 690], [732, 722], [700, 745], [620, 760], [580, 820], [640, 900], [720, 1010],
];
export const HEAD_FORM = new Form(spline(HEAD), [520, 600]);
export const CHILD_FORM = new Form(spline(CHILD), [520, 600]);
export const EGG_FORM = new Form(egg(540, 960, 400, 520), [540, 960]);

/** A steady chance for thing `i` (0…1): use it in place of rng inside a frame, so nothing jitters from frame to frame. */
export const chance = (i: number, k = 0) => hash(i, k, 77);
