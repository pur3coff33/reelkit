// The city every What If? episode happens in: a grid of blocks with towers in the middle and houses at the edge, roads
// with lane marks, street lights, traffic and people on the pavements. One plan per episode (seeded, so every frame is
// the same city); how it looks is a function of time: windows lit or dark (power), vines and trees (green), ruin.
// 1 unit = 1 metre, y up. Faces that can't be seen (walls turned away, buildings out of shot) are never emitted.
import { hex, mixRGB, projector, type Camera, type Glow, type RGB, type Tri, type V3 } from "../lowpoly/engine";
import { box, hash2, octa, rng } from "../lowpoly/world";
import { broadTree, car, jeepney, limb, person, poly, tricycle, truck, villager, type Look } from "../../../apps/typhoon/models";

export type Kind = "tower" | "mid" | "low" | "house";
export type Bldg = { x: number; z: number; w: number; d: number; h: number; color: RGB; roof: RGB; seed: number; kind: Kind; dist: number };
export type Plan = { n: number; pitch: number; road: number; buildings: Bldg[] };

export type PlanOpts = {
  seed: number;
  /** Blocks from the centre to the edge: (2n+1)² blocks. */
  n: number;
  pitch?: number;
  road?: number;
  /** How quickly the towers fall away from the centre (metres). */
  core?: number;
  /** The tallest towers, roughly. */
  peak?: number;
  /** Past this distance blocks are filled with houses. */
  houseRing?: number;
  palette: RGB[];
  roofs?: RGB[];
  /** Walls and roofs for the houses at the edge. */
  housePalette?: RGB[];
  houseRoofs?: RGB[];
  /** Leaves a block empty (a park, a plaza, water). */
  skip?: (i: number, j: number) => boolean;
  /** Where the densest towers stand (defaults to the centre). */
  centre?: [number, number];
  /** Moves every building (a second district beside the first). Roads and ground stay with the main plan. */
  offset?: [number, number];
};

export function planCity(o: PlanOpts): Plan {
  const pitch = o.pitch ?? 48, road = o.road ?? 12, core = o.core ?? 130, peak = o.peak ?? 150, houseRing = o.houseRing ?? 1e9;
  const [ox, oz] = o.centre ?? [0, 0];
  const roofs = o.roofs ?? [hex("#5b5f66"), hex("#6d6a62"), hex("#4f5560")];
  const r = rng(o.seed);
  const buildings: Bldg[] = [];
  for (let i = -o.n; i <= o.n; i++)
    for (let j = -o.n; j <= o.n; j++) {
      if (o.skip?.(i, j)) continue;
      const cx = i * pitch, cz = j * pitch;
      const dist = Math.hypot(cx - ox, cz - oz);
      const inner = pitch - road;
      const dense = Math.exp(-((dist / core) ** 2));
      const houses = dist > houseRing;
      const split = houses ? 3 : dense > 0.55 ? (r() < 0.55 ? 1 : 2) : r() < 0.35 ? 2 : r() < 0.7 ? 3 : 2;
      const lot = inner / split;
      for (let a = 0; a < split; a++)
        for (let b = 0; b < split; b++) {
          if (houses && r() < 0.12) continue;
          const margin = houses ? 1.4 + r() * 1.2 : 1.5 + r() * 2.5;
          const w = lot - margin * 2 - (houses ? r() * 2 : r() * 3), d = lot - margin * 2 - (houses ? r() * 2 : r() * 3);
          const x = cx - inner / 2 + lot * (a + 0.5), z = cz - inner / 2 + lot * (b + 0.5);
          let h: number;
          if (houses) h = 3 + r() * 3.5;
          else h = 7 + r() * 12 + dense * peak * (0.35 + r() * 0.85) * (split === 1 ? 1.15 : 1);
          const kind: Kind = houses ? "house" : h > 48 ? "tower" : h > 18 ? "mid" : "low";
          const walls = houses && o.housePalette ? o.housePalette : o.palette, tops = houses && o.houseRoofs ? o.houseRoofs : roofs;
          const color = walls[Math.floor(r() * walls.length)];
          const roof = tops[Math.floor(r() * tops.length)];
          buildings.push({ x: x + (o.offset?.[0] ?? 0), z: z + (o.offset?.[1] ?? 0), w: Math.max(4, w), d: Math.max(4, d), h, color, roof, seed: Math.floor(r() * 1e6), kind, dist });
        }
    }
  return { n: o.n, pitch, road, buildings };
}

/** Road centre lines: x of the roads that run along z, and z of those that run along x. */
export const roadLines = (p: Plan) => Array.from({ length: 2 * p.n + 2 }, (_, k) => (k - p.n - 0.5) * p.pitch);
export const extent = (p: Plan) => (p.n + 0.5) * p.pitch;

// ── Visibility ───────────────────────────────────────────────────────────────────────────────────────

export type View = { cam: Camera; see: (p: V3, radius: number) => boolean; dist: (p: V3) => number };

/** What the camera can see on a 1080×1920 frame, with a margin. */
export function view(cam: Camera, w = 1080, h = 1920): View {
  const proj = projector(cam, w, h);
  return {
    cam,
    dist: (p) => Math.hypot(p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]),
    see: (p, radius) => {
      const q = proj(p);
      if (q.z < -radius) return false;
      if (q.z < radius) return true;
      const m = (radius / q.z) * proj.focal + 40;
      return q.x > -m && q.x < w + m && q.y > -m && q.y < h + m;
    },
  };
}

// ── Looks ────────────────────────────────────────────────────────────────────────────────────────────

export type CityLook = {
  /** 0 day … 1 night: how much lit windows glow. */
  night: number;
  /** 0…1: how much of the grid is live here (window lights, street lights). Defaults to 1. */
  power?: (x: number, z: number, seed: number) => number;
  /** Share of windows lit on a live building at night. */
  litShare?: number;
  /** 0…1: vines up the walls, grass over the ground, trees. */
  green?: number;
  /** 0…1: broken glass, faded walls, fallen tops. */
  ruin?: number;
  /** Swaps a building's colours (the automated city's white towers). */
  restyle?: (b: Bldg) => { color?: RGB; glass?: RGB; trim?: RGB; trimGlow?: number } | undefined;
  /** A building's own light, whatever the grid does (a candle, a generator): its colour, share of windows, glow. */
  lamp?: (b: Bldg) => { color: RGB; share: number; glow: number } | undefined;
  /** Daytime glass. */
  glass?: RGB;
  ground?: { asphalt?: RGB; walk?: RGB; line?: RGB; grass?: RGB };
  /** Beyond this, nothing is drawn (match the fog). */
  far?: number;
  /** Sun direction for ground shadows; off at night. */
  shadows?: { sun: V3; alpha: number };
};

const WARM = [hex("#ffd98a"), hex("#ffe7b0"), hex("#fff1d6"), hex("#ffc870"), hex("#e8f0ff")];
const DARK_GLASS = hex("#1a2230");
const LEAF = hex("#3f7a35"), LEAF2 = hex("#5c8f3e"), MOSS = hex("#6d8a4a");

const quad = (out: Tri[], a: V3, b: V3, c: V3, d: V3, look: Partial<Tri> & { color: RGB }) => {
  out.push({ a, b, c, ...look }, { a, b: c, c: d, ...look });
};

/** How much of a building has come down, 0…0.6 of its height, from ruin. */
export function fallen(b: Bldg, ruin: number) {
  if (ruin <= 0) return 0;
  const k = hash2(b.seed, 3, 77);
  if (k > 0.45) return 0;
  return Math.min(0.62, ruin * (0.25 + k * 1.1));
}

export function drawBuilding(out: Tri[], glows: Glow[], b: Bldg, L: CityLook, v: View) {
  const style = L.restyle?.(b);
  const green = L.green ?? 0, ruin = L.ruin ?? 0;
  const h = b.h * (1 - fallen(b, ruin));
  const centre: V3 = [b.x, h / 2, b.z];
  const radius = Math.hypot(b.w, h, b.d) / 2;
  if (!v.see(centre, radius)) return;
  const d = v.dist(centre);
  if (d > (L.far ?? 1400) + radius) return;
  const near = d < 320;
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
  const cam = v.cam.pos;
  const power = L.power ? L.power(b.x, b.z, b.seed) : 1;
  const lamp = L.lamp?.(b);
  const lit = lamp ? lamp.share : (L.litShare ?? 0.4) * power;
  const night = L.night;
  const wall = style?.color ?? b.color;
  const glass = style?.glass ?? L.glass ?? mixRGB(wall, hex("#3c5a78"), 0.55);
  const grow = (y: number, k: number) => green > 0 && hash2(k, Math.floor(y), b.seed) < green * (1.15 - 0.95 * (y / Math.max(h, 1)));
  const vine = (c: RGB, k: number): RGB => mixRGB(c, k % 3 ? LEAF : MOSS, 0.78);
  const aged = (c: RGB): RGB => (ruin > 0 ? mixRGB(c, hex("#8a877e"), ruin * 0.45) : c);

  // Roof.
  const roofC = green > 0.35 && hash2(b.seed, 1, 5) < green ? LEAF2 : aged(b.roof);
  quad(out, [x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1], { color: roofC });
  if (style?.trim && near) {
    // A glowing band round the top: the automated city's look.
    for (const [a, c] of [[[x0, z1], [x1, z1]], [[x1, z0], [x0, z0]], [[x1, z1], [x1, z0]], [[x0, z0], [x0, z1]]] as [[number, number], [number, number]][])
      quad(out, [a[0], h - 1.2, a[1]], [c[0], h - 1.2, c[1]], [c[0], h - 0.4, c[1]], [a[0], h - 0.4, a[1]], { color: style.trim, glow: style.trimGlow ?? 1, zBias: -0.3 });
  }

  // House: a pitched roof over one band of wall, a window or two.
  const walls: [V3, V3, V3][] = [
    [[x0, 0, z1], [x1, 0, z1], [0, 0, 1]],
    [[x1, 0, z0], [x0, 0, z0], [0, 0, -1]],
    [[x1, 0, z1], [x1, 0, z0], [1, 0, 0]],
    [[x0, 0, z0], [x0, 0, z1], [-1, 0, 0]],
  ];
  const band = b.kind === "house" ? h : b.kind === "low" ? 3.6 : 7;
  const winK = b.kind === "low" || b.kind === "house" ? 0.45 : 0.62;
  walls.forEach(([a, c, n], f) => {
    const mid: V3 = [(a[0] + c[0]) / 2, h / 2, (a[2] + c[2]) / 2];
    // Back-face cull: walls facing away from the camera.
    if ((cam[0] - mid[0]) * n[0] + (cam[2] - mid[2]) * n[2] < 0) return;
    const faceW = Math.hypot(c[0] - a[0], c[2] - a[2]);
    const varied = night > 0.04 && lit > 0.001;
    const segs = varied || green > 0 || ruin > 0 ? Math.max(1, Math.min(8, Math.round(faceW / (near ? 4.5 : 9)))) : 1;
    let i = 0;
    for (let y = 0; y < h - 0.01; y += band, i++) {
      const top = Math.min(h, y + band);
      const wy = y + (top - y) * (1 - winK) * 0.55, wTop = top - (top - y) * (1 - winK) * 0.45;
      const P = (k: number, yy: number): V3 => [a[0] + (c[0] - a[0]) * k, yy, a[2] + (c[2] - a[2]) * k];
      const tone = (i + f) % 2 ? wall : mixRGB(wall, [0, 0, 0], 0.05);
      // Spandrels: below and above the window strip.
      const sp = grow(y, f * 31 + i) ? vine(wall, i) : aged(tone);
      quad(out, P(0, y), P(1, y), P(1, wy), P(0, wy), { color: sp });
      quad(out, P(0, wTop), P(1, wTop), P(1, top), P(0, top), { color: grow(top, f * 37 + i) ? vine(wall, i + 1) : aged(tone) });
      for (let s = 0; s < segs; s++) {
        const k0 = s / segs, k1 = (s + 1) / segs;
        const key = b.seed * 13 + f * 977 + i * 31 + s;
        let look: Partial<Tri> & { color: RGB };
        const on = varied && hash2(key, 1, 9) < lit;
        if (grow(y + 1, key)) look = { color: vine(glass, s) };
        else if (ruin > 0 && hash2(key, 2, 4) < ruin * 0.8) look = { color: hex("#121416") };
        else if (on && lamp) look = { color: lamp.color, glow: lamp.glow };
        else if (on) look = { color: WARM[Math.floor(hash2(key, 5, 3) * WARM.length)], glow: Math.min(1, night * 1.1) };
        else look = { color: night > 0.5 ? mixRGB(glass, DARK_GLASS, 0.75) : glass };
        quad(out, P(k0, wy), P(k1, wy), P(k1, wTop), P(k0, wTop), { ...look, zBias: -0.05 });
      }
    }
  });
  if (b.kind === "house") {
    const ridge = h + Math.min(b.w, b.d) * 0.38;
    const along = b.w >= b.d;
    const roof = green > 0.4 && hash2(b.seed, 9, 2) < green ? LEAF : aged(b.roof);
    if (along) {
      quad(out, [x0, h, z0], [x1, h, z0], [x1, ridge, b.z], [x0, ridge, b.z], { color: roof });
      quad(out, [x0, h, z1], [x1, h, z1], [x1, ridge, b.z], [x0, ridge, b.z], { color: mixRGB(roof, [0, 0, 0], 0.12) });
      poly(out, [[x0, h, z0], [x0, ridge, b.z], [x0, h, z1]], aged(wall));
      poly(out, [[x1, h, z0], [x1, ridge, b.z], [x1, h, z1]], aged(wall));
    } else {
      quad(out, [x0, h, z0], [x0, h, z1], [b.x, ridge, z1], [b.x, ridge, z0], { color: roof });
      quad(out, [x1, h, z0], [x1, h, z1], [b.x, ridge, z1], [b.x, ridge, z0], { color: mixRGB(roof, [0, 0, 0], 0.12) });
      poly(out, [[x0, h, z0], [b.x, ridge, z0], [x1, h, z0]], aged(wall));
      poly(out, [[x0, h, z1], [b.x, ridge, z1], [x1, h, z1]], aged(wall));
    }
  }
  // A little roof clutter on the bigger ones: a plant room, a water tank.
  if (b.kind !== "house" && near && !style?.trim) {
    box(out, { pos: [b.x + b.w * 0.15, h, b.z - b.d * 0.1], size: [b.w * 0.3, 2.6, b.d * 0.3] }, { color: aged(mixRGB(b.roof, wall, 0.4)) });
  }
  // Ruin: trees on the roof of a building long left.
  if (green > 0.55 && near) {
    const r = rng(b.seed + 4);
    const n = Math.floor((green - 0.5) * 6);
    for (let k = 0; k < n; k++) octa(out, { pos: [x0 + r() * b.w, h + 1.4, z0 + r() * b.d], yaw: r() * 6, size: [1.6 + r() * 1.5, 1.3 + r(), 1.6 + r() * 1.5] }, (q) => ({ color: mixRGB(LEAF, LEAF2, (q % 3) / 3) }));
  }
  // A beacon on the very tall ones at night.
  if (b.h > 150 && night > 0.3 && power > 0.5) glows.push({ p: [b.x, h + 3, b.z], radius: 6, color: hex("#ff3a2c"), alpha: 0.9 * night });
}

// ── Shadows ──────────────────────────────────────────────────────────────────────────────────────────

function hull(pts: V3[]): V3[] {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  const turn = (o: V3, a: V3, b: V3) => (a[0] - o[0]) * (b[2] - o[2]) - (a[2] - o[2]) * (b[0] - o[0]);
  const half = (list: V3[]) => {
    const h: V3[] = [];
    for (const p of list) {
      while (h.length >= 2 && turn(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...half(s), ...half([...s].reverse())];
}

/** The shadow a box throws on the ground: one see-through shape, so overlapping faces don't stack darker. */
export function boxShadow(out: Tri[], x0: number, x1: number, z0: number, z1: number, h: number, sun: V3, alpha: number, zBias = 5000) {
  const k = h / sun[1];
  const foot: V3[] = [[x0, 0.05, z0], [x1, 0.05, z0], [x1, 0.05, z1], [x0, 0.05, z1]];
  const cast = foot.map((p): V3 => [p[0] - sun[0] * k, 0.05, p[2] - sun[2] * k]);
  poly(out, hull([...foot, ...cast]), [10, 14, 28], { alpha, zBias });
}

// ── Ground ───────────────────────────────────────────────────────────────────────────────────────────

const GROUND_BIAS = 9000, WALK_BIAS = 8800, PAINT_BIAS = 8600;

function ground(out: Tri[], plan: Plan, L: CityLook, v: View) {
  const green = L.green ?? 0;
  const g = L.ground ?? {};
  const grass = g.grass ?? hex("#4f7d3a");
  const asphalt = mixRGB(g.asphalt ?? hex("#3d4046"), mixRGB(hex("#5b6b3c"), grass, 0.5), Math.min(1, green * 1.1));
  const walk = g.walk ?? hex("#9d9b93");
  const E = extent(plan) + 600;
  quad(out, [-E, 0, -E], [E, 0, -E], [E, 0, E], [-E, 0, E], { color: asphalt, zBias: GROUND_BIAS });
  const inner = plan.pitch - plan.road;
  // Lay the blocks out in a coarse grid of tiles so grass can take over unevenly.
  for (let i = -plan.n; i <= plan.n; i++)
    for (let j = -plan.n; j <= plan.n; j++) {
      const cx = i * plan.pitch, cz = j * plan.pitch;
      if (!v.see([cx, 0, cz], plan.pitch)) continue;
      const h = inner / 2 + 1.5;
      const k = hash2(i, j, 41);
      const c = green > 0 && k < green * 1.4 ? mixRGB(walk, k < green * 0.8 ? grass : MOSS, Math.min(1, green * 1.6)) : walk;
      quad(out, [cx - h, 0.04, cz - h], [cx + h, 0.04, cz - h], [cx + h, 0.04, cz + h], [cx - h, 0.04, cz + h], { color: c, zBias: WALK_BIAS });
    }
  if (green > 0.85) return;
  // Lane marks near the camera.
  const line = g.line ?? hex("#d8d4c4");
  const fade = mixRGB(line, asphalt, Math.min(1, green * 1.3 + (L.ruin ?? 0) * 0.4));
  for (const rl of roadLines(plan))
    for (let s = -extent(plan); s < extent(plan); s += 9) {
      for (const axis of [0, 1]) {
        const p: V3 = axis ? [rl, 0, s] : [s, 0, rl];
        if (v.dist(p) > 220 || !v.see(p, 6)) continue;
        const a = s, b = s + 4.2, w = 0.18;
        if (axis) quad(out, [rl - w, 0.06, a], [rl + w, 0.06, a], [rl + w, 0.06, b], [rl - w, 0.06, b], { color: fade, zBias: PAINT_BIAS });
        else quad(out, [a, 0.06, rl - w], [b, 0.06, rl - w], [b, 0.06, rl + w], [a, 0.06, rl + w], { color: fade, zBias: PAINT_BIAS });
      }
    }
}

// ── Street lights ────────────────────────────────────────────────────────────────────────────────────

const POLE = hex("#4b4f56");

function streetLights(out: Tri[], glows: Glow[], plan: Plan, L: CityLook, v: View) {
  const off = plan.road / 2 - 0.6;
  for (const rl of roadLines(plan))
    for (let s = -extent(plan) + plan.pitch / 4; s < extent(plan); s += plan.pitch / 2) {
      for (const axis of [0, 1]) {
        for (const side of [-1, 1]) {
          const base: V3 = axis ? [rl + side * off, 0, s + side * 6] : [s + side * 6, 0, rl + side * off];
          const d = v.dist(base);
          if (d > 520 || !v.see(base, 10)) continue;
          const head: V3 = axis ? [base[0] - side * 1.6, 8, base[2]] : [base[0], 8, base[2] - side * 1.6];
          if (d < 200) {
            limb(out, base, [base[0], 8.2, base[2]], 0.1, 0.08, POLE, 3);
            limb(out, [base[0], 8.1, base[2]], head, 0.06, 0.06, POLE, 3);
          }
          const p = L.power ? L.power(base[0], base[2], Math.round(s)) : 1;
          if (L.night > 0.2 && p > 0.05) {
            glows.push({ p: head, radius: 4.5, color: hex("#ffc47a"), alpha: 0.5 * L.night * p });
            if (d < 200) octa(out, { pos: [head[0], head[1] - 0.15, head[2]], size: [0.45, 0.12, 0.25] }, { color: hex("#ffe2b0"), glow: L.night * p });
          }
        }
      }
    }
}

// ── Trees ────────────────────────────────────────────────────────────────────────────────────────────

/** Street trees on the pavements, and with `green` trees everywhere: the pavements, then the roads, then the blocks. */
function trees(out: Tri[], plan: Plan, L: CityLook, v: View) {
  const green = L.green ?? 0;
  const r = rng(91);
  const count = 160 + Math.floor(green * 1400);
  const E = extent(plan);
  for (let k = 0; k < count; k++) {
    const kind = r(), a = r(), b = r(), size = 0.8 + r() * 1.1, birth = r();
    // The first 160 are the street trees that were always there; the rest come in as green grows.
    if (k >= 160 && birth > green) continue;
    let p: V3;
    if (k < 160 || kind < 0.45) {
      const rls = roadLines(plan);
      const rl = rls[Math.floor(a * rls.length)];
      const s = (b - 0.5) * 2 * E;
      const off = (plan.road / 2 + 1.2) * (r() < 0.5 ? -1 : 1);
      p = r() < 0.5 ? [rl + off, 0, s] : [s, 0, rl + off];
      if (k >= 160) p = r() < 0.5 ? [rl + (r() - 0.5) * plan.road, 0, s] : [s, 0, rl + (r() - 0.5) * plan.road];
    } else p = [(a - 0.5) * 2 * E, 0, (b - 0.5) * 2 * E];
    const d = v.dist(p);
    if (d > 700 || !v.see([p[0], 5, p[2]], 8 * size)) continue;
    const grown = k < 160 ? 1 + green * 0.8 : 0.4 + Math.min(1.6, (green - birth) * 4);
    const T = (q: V3): V3 => [p[0] + (q[0] - p[0]) * grown * size, q[1] * grown * size, p[2] + (q[2] - p[2]) * grown * size];
    const tmp: Tri[] = [];
    broadTree(tmp, p, k * 7 + 3, 0, d < 150 ? 1 : 0);
    for (const t of tmp) out.push({ ...t, a: T(t.a), b: T(t.b), c: T(t.c) });
  }
}

// ── Traffic ──────────────────────────────────────────────────────────────────────────────────────────

export type VehicleKind = "car" | "jeep" | "truck" | "trike" | "van" | "pod" | "bike";
const CAR_COLORS = ["#c63d32", "#e6e3dc", "#2c3f5e", "#3a3d42", "#c9a227", "#7f8a93", "#2f6d5f", "#e6e3dc", "#1d1f24"].map(hex);

export type TrafficOpts = {
  seed: number;
  count: number;
  /** Metres car i has travelled by time t (its own clock: speed changes, stops). */
  travel: (t: number, i: number) => number;
  /** Which kind car i is. */
  kind?: (i: number, r: number) => VehicleKind;
  /** Only roads within this many blocks of the centre carry traffic. */
  within?: number;
  /** Headlights and tail lights. */
  lights?: number;
  /** Draws a vehicle the kit doesn't know. */
  custom?: (out: Tri[], kind: VehicleKind, pos: V3, yaw: number, color: RGB, glows: Glow[]) => void;
  /** Leaves car i out. */
  hide?: (i: number) => boolean;
  /** Keeps cars out of a rectangle [x0, z0, x1, z1] (room for a shot at street level). */
  clear?: [number, number, number, number];
  /** A small sideways skew (abandoned cars sit at angles). */
  skew?: (i: number) => number;
  range?: number;
};

/** Where car i is at t, and which way it faces. */
export function carPose(plan: Plan, o: TrafficOpts, i: number, t: number) {
  const r = rng(o.seed * 1000 + i);
  const within = o.within ?? Math.min(plan.n, 4);
  const along = r() < 0.5;
  const line = (Math.floor(r() * (2 * within + 2)) - within - 0.5) * plan.pitch;
  const dir = r() < 0.5 ? 1 : -1;
  const lane = (plan.road / 4) * dir * (r() < 0.5 ? 1 : 0.45);
  const E = within * plan.pitch + plan.pitch / 2;
  const s0 = (r() - 0.5) * 2 * E;
  const color = CAR_COLORS[Math.floor(r() * CAR_COLORS.length)];
  const kindR = r();
  let s = s0 + dir * o.travel(t, i);
  s = ((((s + E) % (2 * E)) + 2 * E) % (2 * E)) - E;
  // Drive on the right: +z traffic on the +x side of the line.
  const pos: V3 = along ? [line + lane, 0, s] : [s, 0, line - lane];
  const yaw = (along ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? Math.PI / 2 : -Math.PI / 2) + (o.skew?.(i) ?? 0);
  return { pos, yaw, color, kindR };
}

export function traffic(out: Tri[], glows: Glow[], plan: Plan, v: View, t: number, o: TrafficOpts) {
  const range = o.range ?? 420;
  for (let i = 0; i < o.count; i++) {
    if (o.hide?.(i)) continue;
    const { pos, yaw, color, kindR } = carPose(plan, o, i, t);
    if (o.clear && pos[0] > o.clear[0] && pos[0] < o.clear[2] && pos[2] > o.clear[1] && pos[2] < o.clear[3]) continue;
    const d = v.dist(pos);
    if (d > range || !v.see([pos[0], 1, pos[2]], 4)) continue;
    const kind = o.kind?.(i, kindR) ?? (kindR < 0.8 ? "car" : "truck");
    if (o.custom && (kind === "pod" || kind === "van" || kind === "bike")) o.custom(out, kind, pos, yaw, color, glows);
    else if (kind === "jeep") jeepney(out, pos, yaw, color);
    else if (kind === "truck") truck(out, pos, yaw, mixRGB(color, hex("#2f6d8f"), 0.5));
    else if (kind === "trike") tricycle(out, pos, yaw, color);
    else car(out, pos, yaw, color);
    const lights = o.lights ?? 0;
    if (lights > 0.02 && d < range && d > 9) {
      const fx = Math.sin(yaw), fz = Math.cos(yaw), sx = Math.cos(yaw), sz = -Math.sin(yaw);
      const L = kind === "jeep" ? 3.1 : kind === "truck" ? 3.2 : 2.1;
      for (const side of [-0.6, 0.6]) {
        glows.push({ p: [pos[0] + fx * L + sx * side, 0.75, pos[2] + fz * L + sz * side], radius: 1.1, color: hex("#fff4dc"), alpha: 0.7 * lights });
        glows.push({ p: [pos[0] - fx * L + sx * side, 0.8, pos[2] - fz * L + sz * side], radius: 0.7, color: hex("#ff3a2c"), alpha: 0.65 * lights });
      }
    }
  }
}

// ── People ───────────────────────────────────────────────────────────────────────────────────────────

export type WalkOpts = {
  seed: number;
  count: number;
  within?: number;
  /** Metres walked by t. */
  travel?: (t: number, i: number) => number;
  look?: (i: number) => Look;
  hide?: (i: number) => boolean;
  /** Drawn instead of the walker (a phone glow, a flashlight): gets where they are. */
  extra?: (i: number, pos: V3, yaw: number, d: number) => void;
  range?: number;
};

export function walkerPose(plan: Plan, o: WalkOpts, i: number, t: number) {
  const r = rng(o.seed * 7919 + i);
  const within = o.within ?? 3;
  const bi = Math.floor(r() * (2 * within + 1)) - within, bj = Math.floor(r() * (2 * within + 1)) - within;
  const edge = Math.floor(r() * 4);
  const half = (plan.pitch - plan.road) / 2 + 0.6 + r() * 1.6;
  const dir = r() < 0.5 ? 1 : -1;
  const speed = 1.1 + r() * 0.5;
  const s0 = (r() - 0.5) * 2 * half;
  const moved = o.travel ? o.travel(t, i) : t * speed;
  let s = s0 + dir * moved;
  s = ((((s + half) % (2 * half)) + 2 * half) % (2 * half)) - half;
  const cx = bi * plan.pitch, cz = bj * plan.pitch;
  const pos: V3 = edge === 0 ? [cx + s, 0, cz + half] : edge === 1 ? [cx + s, 0, cz - half] : edge === 2 ? [cx + half, 0, cz + s] : [cx - half, 0, cz + s];
  const yaw = edge < 2 ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI;
  return { pos, yaw, phase: moved * 3.2 + r() * 6, kindR: r() };
}

export function walkers(out: Tri[], plan: Plan, v: View, t: number, o: WalkOpts) {
  const range = o.range ?? 200;
  for (let i = 0; i < o.count; i++) {
    if (o.hide?.(i)) continue;
    const { pos, yaw, phase, kindR } = walkerPose(plan, o, i, t);
    const d = v.dist(pos);
    if (d > range || !v.see([pos[0], 1, pos[2]], 2)) continue;
    const look = o.look?.(i) ?? villager(i, kindR < 0.12 ? "child" : kindR < 0.55 ? "woman" : "man");
    const moving = o.travel ? 1 : 1;
    if (d < 70) person(out, { ...look, faceless: true }, { pos, yaw, phase, walk: moving, lod: d < 18 ? 2 : d < 40 ? 1 : 0 });
    else {
      limb(out, pos, [pos[0], look.height * 0.8, pos[2]], 0.2, 0.24, look.top, 3);
      octa(out, { pos: [pos[0], look.height * 0.92, pos[2]], size: 0.15 }, { color: look.skin });
    }
    o.extra?.(i, pos, yaw, d);
  }
}

// ── The whole city ───────────────────────────────────────────────────────────────────────────────────

export type CityExtras = { traffic?: TrafficOpts; walkers?: WalkOpts; streetLights?: boolean; trees?: boolean };

export function drawCity(out: Tri[], glows: Glow[], plan: Plan, L: CityLook, cam: Camera, t: number, x: CityExtras = {}) {
  const v = view(cam);
  ground(out, plan, L, v);
  if (L.shadows && L.night < 0.5) {
    for (const b of plan.buildings) {
      const h = b.h * (1 - fallen(b, L.ruin ?? 0));
      if (v.dist([b.x, 0, b.z]) > 700 || !v.see([b.x, 0, b.z], h * 2)) continue;
      boxShadow(out, b.x - b.w / 2, b.x + b.w / 2, b.z - b.d / 2, b.z + b.d / 2, h, L.shadows.sun, L.shadows.alpha * (1 - (L.green ?? 0) * 0.4));
    }
  }
  for (const b of plan.buildings) drawBuilding(out, glows, b, L, v);
  if (x.streetLights !== false) streetLights(out, glows, plan, L, v);
  if (x.trees !== false) trees(out, plan, L, v);
  if (x.traffic) traffic(out, glows, plan, v, t, x.traffic);
  if (x.walkers) walkers(out, plan, v, t, x.walkers);
  return v;
}
