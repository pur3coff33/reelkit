// A tiny flat-shaded 3D renderer on a 2D canvas: triangles are lit per face, fogged, sorted back to front and filled.
// That is the whole low-poly look. Every frame is built from scratch from time alone, so Remotion can render frames
// in any order and in parallel.
export type V3 = [number, number, number];
export type RGB = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => scale(a, 1 / (length(a) || 1));
export const mix3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => mix3(a, b, t);
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export type Tri = {
  a: V3;
  b: V3;
  c: V3;
  color: RGB;
  /** 0…1: how much the face glows instead of taking light (lava, fire, a fireball). */
  glow?: number;
  alpha?: number;
  /** 0…1: how much the face mirrors point lights and the sun (still water). Its facets glint. */
  mirror?: number;
  /** Added to the depth the painter sorts by: positive draws the face earlier (ground under a person's feet), negative later. */
  zBias?: number;
};

/** A light that falls off with distance: a fireball, a lamp. `range` is where it reaches zero. */
export type PointLight = { p: V3; color: RGB; intensity: number; range: number };

export type Camera = { pos: V3; target: V3; fov: number; roll?: number };

export type Env = {
  skyTop: RGB;
  skyBottom: RGB;
  fog: RGB;
  fogNear: number;
  fogFar: number;
  /** Direction towards the sun. */
  sun: V3;
  sunColor: RGB;
  ambient: RGB;
  /** 0…1 star field brightness. */
  stars?: number;
};

export type Glow = { p: V3; radius: number; color: RGB; alpha: number };

export type Frame = {
  tris: Tri[];
  camera: Camera;
  env: Env;
  glowsBehind?: Glow[];
  glowsFront?: Glow[];
  lights?: PointLight[];
  /** Leaves the canvas transparent behind the triangles: a layer to composite over another frame. */
  noSky?: boolean;
};

/** How sharp a mirror face's glint is (a Phong exponent: higher is tighter). */
const MIRROR_SHARPNESS = 48;

export type Projected = { x: number; y: number; z: number; visible: boolean };
export type Projector = ((p: V3) => Projected) & { focal: number };

const NEAR = 0.15;

function basis(cam: Camera) {
  const f = norm(sub(cam.target, cam.pos));
  let r = norm(cross(f, [0, 1, 0]));
  let u = cross(r, f);
  if (cam.roll) {
    const c = Math.cos(cam.roll), s = Math.sin(cam.roll);
    [r, u] = [add(scale(r, c), scale(u, s)), add(scale(u, c), scale(r, -s))];
  }
  return { f, r, u };
}

export function projector(cam: Camera, w: number, h: number): Projector {
  const { f, r, u } = basis(cam);
  const focal = h / 2 / Math.tan((cam.fov * Math.PI) / 360);
  const fn = (p: V3): Projected => {
    const d = sub(p, cam.pos);
    const z = dot(d, f);
    const x = dot(d, r), y = dot(d, u);
    const zz = Math.max(z, 1e-3);
    return { x: w / 2 + (x / zz) * focal, y: h / 2 - (y / zz) * focal, z, visible: z > NEAR };
  };
  return Object.assign(fn, { focal });
}

const rgb = (c: RGB, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);

export function shade(t: Tri, cam: Camera, env: Env, viewZ: number, lights?: PointLight[]): RGB {
  let n = norm(cross(sub(t.b, t.a), sub(t.c, t.a)));
  const centre: V3 = [(t.a[0] + t.b[0] + t.c[0]) / 3, (t.a[1] + t.b[1] + t.c[1]) / 3, (t.a[2] + t.b[2] + t.c[2]) / 3];
  // Faces are two-sided: light the side the camera sees.
  if (dot(n, sub(cam.pos, centre)) < 0) n = scale(n, -1);
  const lambert = Math.max(0, dot(n, env.sun));
  const sky = 0.65 + 0.35 * n[1];
  const g = t.glow ?? 0;
  const lit: RGB = [
    t.color[0] * ((env.ambient[0] / 255) * sky + (env.sunColor[0] / 255) * lambert),
    t.color[1] * ((env.ambient[1] / 255) * sky + (env.sunColor[1] / 255) * lambert),
    t.color[2] * ((env.ambient[2] / 255) * sky + (env.sunColor[2] / 255) * lambert),
  ];
  const m = t.mirror ?? 0;
  // The view ray bounced off the face, for mirror glints.
  const refl = m > 0 ? (() => {
    const v = norm(sub(centre, cam.pos));
    return sub(v, scale(n, 2 * dot(v, n)));
  })() : null;
  if (refl) {
    // The sun (or moon) is far and small: a tighter, fainter glint than a point light's.
    const s = Math.max(0, dot(refl, env.sun)) ** (MIRROR_SHARPNESS * 3) * m * 0.45;
    for (let k = 0; k < 3; k++) lit[k] += env.sunColor[k] * s;
  }
  if (lights) {
    for (const L of lights) {
      const d = sub(L.p, centre);
      const dist = length(d);
      if (dist >= L.range) continue;
      const dir = scale(d, 1 / (dist || 1));
      const fall = (1 - dist / L.range) ** 2 * L.intensity;
      const diffuse = Math.max(0, dot(n, dir)) * fall;
      for (let k = 0; k < 3; k++) lit[k] += t.color[k] * (L.color[k] / 255) * diffuse;
      if (refl) {
        const s = Math.max(0, dot(refl, dir)) ** MIRROR_SHARPNESS * m * fall * 2.5;
        for (let k = 0; k < 3; k++) lit[k] += L.color[k] * s;
      }
    }
  }
  const c = g > 0 ? mixRGB(lit, t.color, g) : lit;
  const fog = clamp01((viewZ - env.fogNear) / (env.fogFar - env.fogNear)) * (1 - 0.75 * g);
  const out = mixRGB(c, env.fog, fog);
  return [Math.min(255, out[0]), Math.min(255, out[1]), Math.min(255, out[2])];
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, cam: Camera, env: Env, proj: Projector) {
  // The horizon sits where a far point straight ahead at eye level projects.
  const ahead = norm(sub(cam.target, cam.pos));
  const flat = norm([ahead[0], 0, ahead[2]]);
  const hz = proj(add(cam.pos, scale(flat, 1e4))).y;
  const g = ctx.createLinearGradient(0, Math.min(hz - h, 0), 0, Math.max(hz, 10));
  g.addColorStop(0, rgb(env.skyTop));
  g.addColorStop(1, rgb(env.skyBottom));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (env.stars) {
    ctx.fillStyle = `rgba(255,255,255,${env.stars})`;
    let s = 1234567;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 900; i++) {
      const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1), size = rnd() < 0.08 ? 3 : 1.6;
      const dir: V3 = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      const p = proj(add(cam.pos, scale(dir, 1e4)));
      if (p.visible && p.x > -4 && p.x < w + 4 && p.y > -4 && p.y < h + 4) ctx.fillRect(p.x, p.y, size, size);
    }
  }
}

function drawGlows(ctx: CanvasRenderingContext2D, glows: Glow[], proj: Projector) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const gl of glows) {
    const p = proj(gl.p);
    if (!p.visible || gl.alpha <= 0) continue;
    const r = (gl.radius / p.z) * proj.focal;
    if (r < 1) continue;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, rgb(gl.color, gl.alpha));
    g.addColorStop(0.4, rgb(gl.color, gl.alpha * 0.35));
    g.addColorStop(1, rgb(gl.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Clips a view-space polygon to z ≥ NEAR. */
function clipNear(pts: V3[]): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) out.push(mix3(a, b, (NEAR - a[2]) / (b[2] - a[2])));
  }
  return out;
}

export function render(ctx: CanvasRenderingContext2D, w: number, h: number, frame: Frame) {
  const { camera: cam, env } = frame;
  const proj = projector(cam, w, h);
  const { f, r, u } = basis(cam);
  if (frame.noSky) ctx.clearRect(0, 0, w, h);
  else drawSky(ctx, w, h, cam, env, proj);
  if (frame.glowsBehind) drawGlows(ctx, frame.glowsBehind, proj);

  const toView = (p: V3): V3 => {
    const d = sub(p, cam.pos);
    return [dot(d, r), dot(d, u), dot(d, f)];
  };
  type Item = { pts: V3[]; z: number; color: RGB; alpha: number };
  const items: Item[] = [];
  const farLimit = env.fogFar * 1.05;
  for (const t of frame.tris) {
    const va = toView(t.a), vb = toView(t.b), vc = toView(t.c);
    if (va[2] < NEAR && vb[2] < NEAR && vc[2] < NEAR) continue;
    const z = (va[2] + vb[2] + vc[2]) / 3;
    if (z > farLimit && (t.glow ?? 0) < 0.5) continue;
    const pts = va[2] < NEAR || vb[2] < NEAR || vc[2] < NEAR ? clipNear([va, vb, vc]) : [va, vb, vc];
    if (pts.length < 3) continue;
    items.push({ pts, z: z + (t.zBias ?? 0), color: shade(t, cam, env, z, frame.lights), alpha: t.alpha ?? 1 });
  }
  items.sort((a, b) => b.z - a.z);

  const focal = proj.focal, cx = w / 2, cy = h / 2;
  ctx.lineJoin = "round";
  for (const it of items) {
    ctx.beginPath();
    for (let i = 0; i < it.pts.length; i++) {
      const p = it.pts[i];
      const x = cx + (p[0] / p[2]) * focal, y = cy - (p[1] / p[2]) * focal;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    const style = rgb(it.color, it.alpha);
    ctx.fillStyle = style;
    ctx.fill();
    if (it.alpha >= 1) {
      // Hides the hairline seams anti-aliasing leaves between neighbouring faces.
      ctx.strokeStyle = style;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  if (frame.glowsFront) drawGlows(ctx, frame.glowsFront, proj);
  return proj;
}
