// Points of light: thousands of glowing dots that hold a shape, let go, and become the next one. Drawn by adding light
// into a buffer, then bloomed. `dotsLook` paints the whole frame; `dotsOver` adds only the light, over another look.
import { H, W, canvas, clamp01, keepLast, rng, smooth, type Painter, type RGB, type V3 } from "../core";
import type { Sampler } from "./forms";
import { tripOn, type Trip } from "./trip";

/** The points fly to a new shape from `at`, each taking `dur` seconds, the last leaving `spread` seconds after the first. */
export type Step = {
  to: Sampler;
  at: number;
  dur?: number;
  spread?: number;
  /** Which leave first: those low in the old shape, those high in it, or any. */
  order?: "up" | "down" | "any";
  /** How far they swing out on the way. */
  burst?: number;
  /** Light they give off mid-flight. */
  flash?: RGB;
  /** Dims them mid-flight by this much (0…1), where a crowd crossing the middle would burn white. */
  dim?: number;
};

export type Group = {
  n: number;
  seed: number;
  shape: Sampler;
  steps?: Step[];
  alpha?: (t: number) => number;
  /** Sways like leaves, more the higher it is (try 0.02). */
  sway?: number;
  /** Wanders on the spot like fireflies, by this much. Fades as a step carries the points away. */
  wander?: number;
  /** Twinkles by this much (0…1). */
  twinkle?: number;
  /** A slow swell, as of breathing (try 0.012). */
  breathe?: number;
  /** Moves the whole group. */
  move?: (t: number) => V3;
  /** Orders each shape's points by where they are, so a step sends each point to the same part of the next shape (top to
   * top, left to left): the shapes reshape into each other rather than dissolving into a cloud between them. */
  match?: boolean;
};

export type DotLight = { at: V3; color: RGB; power: number; falloff: number };
export type DotCamera = {
  /** Turn about the scene, in radians; 0 looks from +z. */
  yaw: number;
  dist: number;
  /** The height looked at. */
  height: number;
  pitch?: number;
  /** Where the looked-at point sits in the frame. */
  center?: [number, number];
  focal?: number;
};

/** Extra light drawn by hand: lanterns, eyes, sparks. Sizes are in the scene's units. */
export type Spark = {
  glow: (p: V3, radius: number, c: RGB) => void;
  /** Two slit-pupilled eyes `gap` apart, `w` × `h` each way from their middles. */
  eyes: (p: V3, o: { gap: number; w: number; h: number; open: number; color?: RGB }) => void;
};

export type DotScene = {
  groups: Group[];
  camera: (t: number) => DotCamera;
  lights?: (t: number) => DotLight[];
  extra?: (s: Spark, t: number) => void;
  /** The night behind: its colour, brightest in a band at `horizon` (0 top … 1 bottom). */
  sky?: { color: RGB; horizon?: number };
  /** Keeps colours pure where points pile up, rather than burning to white: 0…1. */
  vivid?: number;
  /** Kaleidoscope, zoom echoes, colour split and hue, laid over the finished light. */
  trip?: (t: number) => Trip;
  /** Softens points away from the focal depth (0 = all sharp). */
  blur?: number;
};

// ── Clouds ─────────────────────────────────────────────────────────────────────────────────────────────

type Form = { p: Float32Array; c: Float32Array };
export type Cloud = { forms: Form[]; key: Float32Array; phase: Float32Array };

function sample(s: Sampler, n: number, seed: number): Form {
  const r = rng(seed), p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const d = s(r);
    p.set(d.p, i * 3);
    c.set(d.c, i * 3);
  }
  return { p, c };
}

export function makeCloud(g: Group): Cloud {
  const r = rng(g.seed + 999), key = new Float32Array(g.n), phase = new Float32Array(g.n);
  for (let i = 0; i < g.n; i++) {
    key[i] = r();
    phase[i] = r() * 6.283;
  }
  const shapes = [g.shape, ...(g.steps ?? []).map((s) => s.to)], forms = shapes.map((s, i) => sample(s, g.n, g.seed + i * 31));
  if (g.match) forms.forEach((f, n) => matchOrder(f, shapes[n], formedAt(g, n), key, phase));
  return { forms, key, phase };
}

/** When shape n is fully formed: the start for the first, otherwise once its step's last point has arrived. */
function formedAt(g: Group, n: number) {
  const s = g.steps ?? [];
  if (!n) return s[0]?.at ?? 0;
  const st = s[n - 1];
  return st.at + (st.dur ?? 1) + (st.spread ?? 0.8);
}

/** Where along a Hilbert curve through a 1024 × 1024 grid the cell (x, y) lies: neighbours on the curve are neighbours in
 * the frame, so two shapes ranked along it pair up part by part. */
function hilbert(x: number, y: number) {
  let d = 0;
  for (let s = 512; s > 0; s >>= 1) {
    const rx = x & s ? 1 : 0, ry = y & s ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (!ry) {
      if (rx) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      [x, y] = [y, x];
    }
  }
  return d;
}

/** Re-orders a form's points along the curve, by where they are (as the camera sees them, x across, y up) at time `t`. */
function matchOrder(f: Form, s: Sampler, t: number, key: Float32Array, phase: Float32Array) {
  const n = key.length, xy = new Float32Array(n * 2), o = [0, 0, 0, 0, 0, 0];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      o[k] = f.p[i * 3 + k];
      o[k + 3] = f.c[i * 3 + k];
    }
    s.life?.(o, t, key[i], phase[i]);
    xy[i * 2] = o[0];
    xy[i * 2 + 1] = o[1];
    x0 = Math.min(x0, o[0]);
    x1 = Math.max(x1, o[0]);
    y0 = Math.min(y0, o[1]);
    y1 = Math.max(y1, o[1]);
  }
  // Each shape is stretched to the same square first, so its top meets the next one's top wherever each sits.
  const q = (v: number, a: number, b: number) => Math.min(1023, Math.max(0, Math.floor(((v - a) / Math.max(b - a, 1e-6)) * 1024)));
  const code = Float64Array.from({ length: n }, (_, i) => hilbert(q(xy[i * 2], x0, x1), q(xy[i * 2 + 1], y0, y1)));
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => code[a] - code[b]);
  const p = f.p.slice(), c = f.c.slice();
  order.forEach((from, to) => {
    f.p.set(p.subarray(from * 3, from * 3 + 3), to * 3);
    f.c.set(c.subarray(from * 3, from * 3 + 3), to * 3);
  });
}

/** How far a point is through a step at time t (0 = not left, 1 = arrived). `high` 0…1 is its height in the old shape. */
export function progress(s: Step, t: number, high: number, key: number) {
  const { at, dur = 1, spread = 0.8, order = "any" } = s;
  const when = at + spread * (order === "any" ? key : 0.6 * (order === "up" ? high : 1 - high) + 0.4 * key);
  return smooth(when, when + dur, t);
}

const aim = [0, 0, 0, 0, 0, 0];
function shapeAt(g: Group, cloud: Cloud, n: number, i: number, t: number, o: number[]) {
  const f = cloud.forms[n], j = i * 3;
  for (let k = 0; k < 3; k++) {
    o[k] = f.p[j + k];
    o[k + 3] = f.c[j + k];
  }
  (n ? g.steps![n - 1].to : g.shape).life?.(o, t, cloud.key[i], cloud.phase[i]);
}

/** Point i of a group at time t, into `out`: x, y, z, r, g, b. */
export function pointAt(g: Group, cloud: Cloud, i: number, t: number, out: number[]) {
  const ph = cloud.phase[i], key = cloud.key[i], steps = g.steps ?? [];
  // Start from the last shape it has fully arrived at.
  let n = steps.length;
  while (n > 0 && steps[n - 1].at + (steps[n - 1].spread ?? 0.8) + (steps[n - 1].dur ?? 1) > t) n--;
  shapeAt(g, cloud, n, i, t, out);
  let [x, y, z, r, gr, b] = out;
  let flying = 0;
  const loose = g.wander && n === 0;
  if (loose) {
    x += 0.5 * g.wander! * Math.sin(t * 0.8 + ph);
    y += 0.4 * g.wander! * Math.sin(t * 1.1 + ph * 2);
  }
  for (; n < steps.length; n++) {
    const s = steps[n];
    if (t <= s.at) break;
    shapeAt(g, cloud, n + 1, i, t, aim);
    // "up" and "down" go by the height it's leaving, or the one it's heading for when it starts as a loose swarm.
    const k = progress(s, t, clamp01((loose ? aim[1] : y) / 4.5), key);
    if (k <= 0) continue;
    const swing = Math.sin(k * Math.PI), burst = (s.burst ?? 0.7) * swing;
    x += (aim[0] - x) * k + burst * Math.cos(ph + k * 3);
    y += (aim[1] - y) * k + burst * 0.5 * Math.sin(ph * 3);
    z += (aim[2] - z) * k + burst * Math.sin(ph + k * 3);
    r += (aim[3] - r) * k;
    gr += (aim[4] - gr) * k;
    b += (aim[5] - b) * k;
    if (s.dim) {
      const keep = 1 - s.dim * swing;
      r *= keep;
      gr *= keep;
      b *= keep;
    }
    if (s.flash) {
      r += swing * s.flash[0];
      gr += swing * s.flash[1];
      b += swing * s.flash[2];
    }
    flying = swing;
  }
  if (g.sway) {
    const w = g.sway * Math.sin(t * 1.4 + x * 1.5 + y) * smooth(2, 4, y) * (1 - flying);
    x += w;
    z += w;
  }
  if (g.breathe) {
    const k = 1 + g.breathe * Math.sin(t * 2.2);
    x *= k;
    z *= k;
  }
  if (g.move) {
    const m = g.move(t);
    x += m[0];
    y += m[1];
    z += m[2];
  }
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = r;
  out[4] = gr;
  out[5] = b;
}

/** Turns scene points into [x, y on the frame, distance from the camera]. */
export function project(c: DotCamera) {
  const ca = Math.cos(c.yaw), sa = Math.sin(c.yaw), cp = Math.cos(c.pitch ?? 0.07), sp = Math.sin(c.pitch ?? 0.07);
  const F = c.focal ?? 1650, [cx, cy] = c.center ?? [W / 2, 1060];
  return (x: number, y: number, z: number): [number, number, number] => {
    const X = x * ca - z * sa, Z0 = x * sa + z * ca, Y = y - c.height;
    const depth = c.dist - (Z0 * cp + Y * sp);
    return [cx + (X * F) / depth, cy - ((Y * cp - Z0 * sp) * F) / depth, depth];
  };
}

// ── Light ──────────────────────────────────────────────────────────────────────────────────────────────

/** Adds a soft dot of light to the buffer. At a pixel or less it's shared between the four nearest. */
function splat(buf: Float32Array, x: number, y: number, rad: number, r: number, g: number, b: number) {
  if (rad <= 1) {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= W - 1 || iy >= H - 1) return;
    const fx = x - ix, fy = y - iy;
    for (let k = 0; k < 4; k++) {
      const w = (k & 1 ? fx : 1 - fx) * (k & 2 ? fy : 1 - fy), o = ((iy + (k >> 1)) * W + ix + (k & 1)) * 3;
      buf[o] += r * w;
      buf[o + 1] += g * w;
      buf[o + 2] += b * w;
    }
    return;
  }
  const x0 = Math.max(0, Math.floor(x - rad)), x1 = Math.min(W - 1, Math.ceil(x + rad));
  const y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(H - 1, Math.ceil(y + rad));
  const ir = 1 / (rad * rad);
  for (let yy = y0; yy <= y1; yy++)
    for (let xx = x0; xx <= x1; xx++) {
      let w = 1 - ((xx - x) ** 2 + (yy - y) ** 2) * ir;
      if (w <= 0) continue;
      w *= w;
      const o = (yy * W + xx) * 3;
      buf[o] += r * w;
      buf[o + 1] += g * w;
      buf[o + 2] += b * w;
    }
}

const clouds = keepLast(3, (s: DotScene) => s.groups.map(makeCloud));
let shared: { buf: Float32Array; img: ImageData; a: HTMLCanvasElement; b: HTMLCanvasElement } | undefined;

/** Draws the scene's light on a canvas of its own (black where there is none) and returns it. */
function light(scene: DotScene, t: number, withSky: boolean) {
  shared ??= { buf: new Float32Array(W * H * 3), img: new ImageData(W, H), a: canvas(), b: canvas() };
  const { buf, img, a, b } = shared;
  buf.fill(0);
  const cam = scene.camera(t), proj = project(cam), lights = scene.lights?.(t) ?? [], soft = scene.blur ?? 0.45;
  const F = cam.focal ?? 1650;
  const pt = [0, 0, 0, 0, 0, 0];
  const built = clouds(scene);
  scene.groups.forEach((g, gi) => {
    const alpha = g.alpha?.(t) ?? 1;
    if (alpha <= 0) return;
    const { key, phase } = built[gi];
    for (let i = 0; i < g.n; i++) {
      pointAt(g, built[gi], i, t, pt);
      const x = pt[0], y = pt[1], z = pt[2];
      const [px, py, Z] = proj(x, y, z);
      if (Z < 0.5) continue;
      let r = pt[3], gr = pt[4], bl = pt[5];
      for (const l of lights) {
        const k = l.power / (1 + l.falloff * ((x - l.at[0]) ** 2 + (y - l.at[1]) ** 2 + (z - l.at[2]) ** 2));
        r += l.color[0] * k;
        gr += l.color[1] * k;
        bl += l.color[2] * k;
      }
      const depth = Math.max(0.12, Math.min(1.5, 1.5 - (Z - cam.dist) * 0.34)), focus = Math.abs(Z - cam.dist + 0.3) * soft;
      // About one point in seventy is drawn big.
      const big = key[i] > 0.985, tw = g.twinkle ? 1 + g.twinkle * Math.sin(t * 3 + phase[i]) : 1;
      const rad = Math.max(1.01, ((big ? 3.2 : 1.25) * 6.4 * (1 + focus * 0.5) * F) / 1650 / Z);
      const e = (alpha * tw * depth * (big ? 1.25 : 0.95)) / (1 + focus * 0.25);
      splat(buf, px, py, rad, r * e, gr * e, bl * e);
    }
  });
  const q = rng(7);
  scene.extra?.(
    {
      glow: (p, radius, c) => {
        const [x, y, Z] = proj(...p);
        if (Z > 0.5) splat(buf, x, y, (radius * F) / Z, ...c);
      },
      eyes: (p, o) => {
        if (o.open <= 0.01) return;
        const c = o.color ?? [1.6, 0.95, 0.2];
        for (const s of [-1, 1]) {
          const [x, y, Z] = proj(p[0] + (s * o.gap) / 2, p[1], p[2]);
          if (Z < 0.5) continue;
          const k = F / Z, w = o.w * k, h = o.h * k * o.open;
          // As many points as the eye has room for, so a small one doesn't burn out white.
          for (let i = 0; i < Math.min(1500, w * o.h * k); i++) {
            const a = q() * 6.28, u = Math.sqrt(q()), ex = Math.cos(a) * u * w, ey = Math.sin(a) * u * h * (1 - 0.35 * Math.abs(Math.cos(a)) * u);
            if (Math.abs(ex) < w * 0.19) continue;
            splat(buf, x + ex, y + ey, 1.8, ...c);
          }
          splat(buf, x, y, w * 3, c[0] * 0.1 * o.open, c[1] * 0.05 * o.open, c[2] * 0.05 * o.open);
        }
      },
    },
    t,
  );
  // Under a trip the sky goes in afterwards, so its echoes don't pile up.
  const sky = withSky && !scene.trip ? skyOf(scene) : [0, 0, 0], vivid = scene.vivid ?? 0, horizon = scene.sky?.horizon ?? 0.6;
  const d = img.data;
  for (let i = 0, k = 0; i < W * H; i++, k += 3) {
    const v = 0.018 + 0.03 * Math.max(0, 1 - Math.abs(Math.floor(i / W) / H - horizon) * 2.6);
    const r = buf[k] + v * sky[0], g = buf[k + 1] + v * sky[1], b = buf[k + 2] + v * sky[2];
    const most = Math.max(r, g, b, 1e-6), same = (vivid * (1 - Math.exp(-most * 1.25))) / most, each = 1 - vivid;
    d[i * 4] = 255 * (each * (1 - Math.exp(-r * 1.25)) + same * r);
    d[i * 4 + 1] = 255 * (each * (1 - Math.exp(-g * 1.25)) + same * g);
    d[i * 4 + 2] = 255 * (each * (1 - Math.exp(-b * 1.25)) + same * b);
    d[i * 4 + 3] = 255;
  }
  const ag = a.getContext("2d")!, bg = b.getContext("2d")!;
  ag.putImageData(img, 0, 0);
  for (const [blur, k] of [[6, 0.5], [34, 0.42]]) {
    bg.clearRect(0, 0, W, H);
    bg.filter = `blur(${blur}px)`;
    bg.drawImage(a, 0, 0);
    bg.filter = "none";
    ag.globalCompositeOperation = "lighter";
    ag.globalAlpha = k;
    ag.drawImage(b, 0, 0);
    ag.globalCompositeOperation = "source-over";
    ag.globalAlpha = 1;
  }
  return scene.trip ? tripOn(a, scene.trip(t), cam.center ?? [W / 2, 1060]) : a;
}

const skyOf = (s: DotScene): RGB => s.sky?.color ?? [0.5, 0.75, 1.5];

export const dotsLook = (scene: DotScene): Painter => (g, t) => {
  g.drawImage(light(scene, t, true), 0, 0);
  if (!scene.trip) return;
  const at = scene.sky?.horizon ?? 0.6, c = (k: number) => `rgb(${skyOf(scene).map((v) => Math.round(255 * (1 - Math.exp(-v * k * 1.25)))).join(",")})`;
  const gr = g.createLinearGradient(0, 0, 0, H);
  for (const [k, v] of [[0, 0.018], [Math.max(0, at - 0.38), 0.018], [at, 0.048], [Math.min(1, at + 0.38), 0.018], [1, 0.018]]) gr.addColorStop(k, c(v));
  g.save();
  g.globalCompositeOperation = "lighter";
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.restore();
};

/** Only the light, added over what's already drawn: a creature of light in a paper world. */
export const dotsOver = (scene: DotScene): Painter => (g, t) => {
  const img = light(scene, t, false);
  g.save();
  g.globalCompositeOperation = "screen";
  g.drawImage(img, 0, 0);
  g.restore();
};
