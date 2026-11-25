// What's on screen at film time t, built from t alone. Movement is scripted from the record: nothing here computes who
// wins. Nobody is ever shown being hit: a figure stops, and a small white marker stays where it was. Figures are
// illustrative except the 36 and the 9, whose counts are sourced.
import { hex, length, mix3, mixRGB, norm, smooth, sub, type Camera, type Frame, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, hash2, octa, pulse, rng, shotCamera, vary } from "../../src/kit/lowpoly/world";
import { poly } from "../typhoon/models";
import { ACP, CROSSING, FIELD, HIGHWAY_Z, HUTS, RIVERBANK_84, VDOP, WP9, WP_POINT, district, envAt, shadows } from "./land";
import { FLASH, at, puff, scene, type Built, type Fx, type Tag, type Tone } from "./props";
import { CONTACT_LOST, FIELD_FALLS, LAST_SHOT, RIVER_FALLS, WP_ROUNDS, hourAt } from "./mapclock";

export type { Built, Fx, Tag, Tone };

const CYAN = hex("#5ce0f2"), DIM = hex("#4f9fb4"), AMBER = hex("#f2a93b"), GREEN = hex("#7ddc78"), WHITE = hex("#fbfbf4");

const sm = (a: number, b: number, x: number) => smooth(a, b, x);
const lerp3 = (a: V3, b: V3, k: number): V3 => mix3(a, b, k);

function along(pts: V3[], k: number): V3 {
  if (k <= 0) return pts[0];
  if (k >= 1) return pts[pts.length - 1];
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += length(sub(pts[i], pts[i - 1]));
  let d = k * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = length(sub(pts[i], pts[i - 1]));
    if (d <= seg) return lerp3(pts[i - 1], pts[i], d / seg);
    d -= seg;
  }
  return pts[pts.length - 1];
}

// ── The routes ───────────────────────────────────────────────────────────────────────────────────────

const WP8 = at(-320, 760), WP10 = at(-200, 320);
const ROUTE_55: V3[] = [VDOP, WP8, WP9, WP10, FIELD];
const ROUTE_84: V3[] = [VDOP, WP8, WP9, WP10, at(-60, 90), at(250, -20), at(530, -280), at(830, -800), at(880, -1240), CROSSING];
const OUT_84: V3[] = [HUTS, CROSSING, at(880, -1240), at(830, -1000), RIVERBANK_84];

export function pos84(t: number): V3 {
  if (t < 64) return along(ROUTE_84, sm(46, 64, t));
  if (t < 72) return lerp3(CROSSING, HUTS, sm(64, 72, t));
  if (t < 85) return HUTS;
  return along(OUT_84, sm(85, 186, t) ** 0.8);
}
export const pos55 = (t: number) => along(ROUTE_55, sm(58, 72, t));

// ── Everyone, in lists built once ────────────────────────────────────────────────────────────────────

type FieldMan = { p: V3; fall: number };
const fieldMen: FieldMan[] = (() => {
  const r = rng(36);
  return Array.from({ length: 36 }, (_, i) => ({
    p: at(FIELD[0] + (r() - 0.5) * 170, FIELD[2] + (r() - 0.5) * 78 - 8),
    fall: i < 35 ? FIELD_FALLS[i] : Infinity,
  }));
})();
const riverMen: FieldMan[] = (() => {
  const r = rng(9);
  return Array.from({ length: 9 }, (_, i) => ({ p: at(RIVERBANK_84[0] + (r() - 0.5) * 80 + 16, RIVERBANK_84[2] + (r() - 0.5) * 90), fall: RIVER_FALLS[i] }));
})();

type Hostile = { src: V3; bank: V3; start: number; crosses: boolean; field: V3; river: V3; dir: V3; gone: number; j: number };
const SOURCES: V3[] = [at(-720, -520), at(180, -640), at(-1000, 300), at(1420, -1380), at(-300, -1100), at(1050, 840)];
const hostiles: Hostile[] = (() => {
  const r = rng(118);
  return Array.from({ length: 70 }, () => {
    const src = SOURCES[Math.floor(r() * SOURCES.length)];
    const x = -440 + r() * 880;
    // The river bends north towards the east, so its far bank does too.
    const bankZ = -102 - (x > 120 ? (x - 120) * 0.42 : 0) - r() * 44;
    const a = r() * Math.PI * 2;
    return {
      src: at(src[0] + (r() - 0.5) * 170, src[2] + (r() - 0.5) * 170),
      bank: at(x, bankZ),
      start: 89 + r() * 28,
      crosses: r() < 0.5,
      field: at(-110 + r() * 220, 10 + r() * 70),
      river: at(WP_POINT[0] - 60 + r() * 110, WP_POINT[2] - 30 + r() * 170),
      dir: [Math.cos(a), 0, Math.sin(a)],
      gone: WP_ROUNDS[0] + 0.8 + r() * 5.4,
      j: r(),
    };
  });
})();

function hostileAt(h: Hostile, t: number): V3 | null {
  if (t < h.start || t > h.gone) return null;
  let p = lerp3(h.src, h.bank, sm(h.start, h.start + 11, t));
  if (h.crosses) p = lerp3(p, h.field, sm(170 + h.j * 3, 180, t));
  p = lerp3(p, h.river, sm(183 + h.j * 3, 196, t));
  const k = sm(WP_ROUNDS[0], WP_ROUNDS[0] + 6, t);
  return k > 0 ? [p[0] + h.dir[0] * k * 560, 0, p[2] + h.dir[2] * k * 560] : p;
}

const support: { hw: V3; line: V3; onward: V3 }[] = (() => {
  const r = rng(297);
  return Array.from({ length: 40 }, (_, i) => ({
    hw: at(-760 + i * 28 + r() * 16, HIGHWAY_Z + (r() - 0.5) * 34),
    line: at(-470 + r() * 420, 505 + r() * 170),
    onward: i % 2 ? at(FIELD[0] + (r() - 0.5) * 200, FIELD[2] + 60 + r() * 100) : at(RIVERBANK_84[0] + 40 + r() * 80, RIVERBANK_84[2] + 30 + r() * 120),
  }));
})();
const supportAt = (s: (typeof support)[number], t: number) => lerp3(lerp3(s.hw, s.line, sm(88, 138, t)), s.onward, sm(226, 240, t));

function armyAt(i: number, t: number): V3 {
  const road = at(2800 - sm(126, 139, t) * (2800 - (ACP[0] + i * 90)), HIGHWAY_Z - 6);
  return road;
}

// ── Drawing, on the map ──────────────────────────────────────────────────────────────────────────────

/** A marker that holds its size on screen whatever the camera's distance: a person or squad, not to scale. */
function token(out: Tri[], p: V3, color: RGB, cam: Camera, size = 0.0052, glow = 0.92) {
  const s = size * length(sub(p, cam.pos));
  poly(out, [[p[0] - s * 0.5, 0.5, p[2] + s * 0.2], [p[0] + s * 1.3, 0.5, p[2] + s * 0.6], [p[0] + s * 1.5, 0.5, p[2] + s * 1.5], [p[0] - s * 0.2, 0.5, p[2] + s * 1.2]], [6, 10, 8], { alpha: 0.34, zBias: 8000 });
  octa(out, { pos: [p[0], s * 0.7, p[2]], size: [s, s * 0.7, s] }, { color, glow, zBias: -2 });
}

function squad(out: Tri[], p: V3, n: number, spread: number, color: RGB, cam: Camera, seed: number, t: number, size = 0.0052) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const dx = (r() - 0.5) * spread, dz = (r() - 0.5) * spread, w = r() * 6;
    token(out, [p[0] + dx + Math.sin(t * 0.7 + w) * spread * 0.03, 0, p[2] + dz + Math.cos(t * 0.6 + w) * spread * 0.03], color, cam, size);
  }
}

/** The white marker that stays. Fades up over half a second. */
function marker(out: Tri[], glows: Glow[], m: FieldMan, t: number, cam: Camera, size = 0.0042, halo = 0.5) {
  // The lone survivor never gets one.
  if (!Number.isFinite(m.fall)) return;
  const k = sm(m.fall, m.fall + 0.5, t);
  if (k <= 0) return;
  const d = length(sub(m.p, cam.pos));
  const s = size * d;
  octa(out, { pos: [m.p[0], s * 0.8, m.p[2]], size: [s * 0.78, s * 0.8, s * 0.78] }, { color: WHITE, glow: 1, zBias: -4 });
  glows.push({ p: [m.p[0], s, m.p[2]], radius: s * (1.7 + 3 * pulse(t, m.fall, 1.1)), color: WHITE, alpha: k * halo * (0.28 + 0.72 * pulse(t, m.fall, 1.4)) });
}

function routeLine(out: Tri[], pts: V3[], k: number, color: RGB, cam: Camera, alpha = 0.85) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += length(sub(pts[i], pts[i - 1]));
  let left = total * k;
  for (let i = 1; i < pts.length && left > 0; i++) {
    const a = pts[i - 1], seg = length(sub(pts[i], a));
    const b = left >= seg ? pts[i] : lerp3(a, pts[i], left / seg);
    left -= seg;
    const w = length(sub(a, cam.pos)) * 0.00105;
    const d = norm(sub(b, a));
    const nx = -d[2] * w, nz = d[0] * w;
    poly(out, [[a[0] + nx, 1, a[2] + nz], [b[0] + nx, 1, b[2] + nz], [b[0] - nx, 1, b[2] - nz], [a[0] - nx, 1, a[2] - nz]], color, { glow: 1, alpha, zBias: 9000 });
  }
}

/** Fire between two lists of positions. It flickers on its own clock and never repeats a pattern. */
function exchange(out: Tri[], glows: Glow[], from: V3[], to: V3[], t: number, cam: Camera, n: number, seed: number, color = FLASH) {
  if (!from.length || !to.length) return;
  const beat = Math.floor(t * 9);
  for (let i = 0; i < n; i++) {
    if (hash2(beat, i, seed) > 0.42) continue;
    const a = from[Math.floor(hash2(beat, i + 40, seed) * from.length)], b = to[Math.floor(hash2(beat, i + 90, seed) * to.length)];
    const dist = length(sub(a, cam.pos));
    const w = dist * 0.00062;
    const d = norm(sub(b, a));
    const nx = -d[2] * w, nz = d[0] * w;
    const mid = lerp3(a, b, 0.55 + hash2(beat, i, seed + 3) * 0.4);
    poly(out, [[a[0] + nx, 3, a[2] + nz], [mid[0] + nx, 3, mid[2] + nz], [mid[0] - nx, 3, mid[2] - nz], [a[0] - nx, 3, a[2] - nz]], color, { glow: 1, alpha: 0.72, zBias: -6 });
    glows.push({ p: [a[0], 4, a[2]], radius: dist * 0.008, color, alpha: 0.5 });
  }
}

/** Dust from a mortar round, drifting up and thinning. Its timing is illustrative. */
function puffs(out: Tri[], cam: Camera, t: number, centre: V3, spread: number, every: number, seed: number, size: number, from: number, to: number) {
  for (let k = Math.floor(from / every); k <= Math.floor(Math.min(t, to) / every); k++) {
    const t0 = k * every + hash2(k, 1, seed) * every * 0.7;
    const age = t - t0;
    if (age < 0 || age > 3.6) continue;
    const x = centre[0] + (hash2(k, 2, seed) - 0.5) * spread, z = centre[2] + (hash2(k, 3, seed) - 0.5) * spread;
    const f = 1 - age / 3.6;
    for (let p = 0; p < 3; p++) {
      const s = size * (0.55 + age * 0.55) * (1 + p * 0.3);
      puff(out, [x + p * size * 0.5, size * (0.4 + age * 0.45), z - p * size * 0.3], s * 1.5, cam, mixRGB(hex("#8d826c"), hex("#c9c1ae"), hash2(k, p, seed)), 0.6 * f);
    }
  }
}

// ── The map shots ────────────────────────────────────────────────────────────────────────────────────

type MapOpts = { fog?: [number, number]; size?: number; rows?: boolean; hideField?: boolean };

/** Field rows, for looking straight down into the corn. */
let ROWS: Tri[] | null = null;
function fieldRows(): Tri[] {
  if (ROWS) return ROWS;
  const out: Tri[] = [];
  const c1 = hex("#566730"), c2 = hex("#6b7a3c"), r = rng(5);
  for (let x = -300; x < 340; x += 5)
    for (let z = -40; z < 240; z += 22) {
      poly(out, [[x, 0.4, z], [x + 3.4, 0.4, z], [x + 3.4, 0.4, z + 22], [x, 0.4, z + 22]], vary(r() < 0.5 ? c1 : c2, x + z, 0.12), { zBias: 17000 });
    }
  ROWS = out;
  return out;
}

export function mapScene(t: number, still: Camera, tags: Tag[], o: MapOpts = {}): { frame: Frame; tags: Tag[] } {
  const up = still.pos[1];
  const sway: V3 = [Math.sin(t * 0.21) * up * 0.006, Math.sin(t * 0.13) * up * 0.004, Math.cos(t * 0.17) * up * 0.006];
  const camera: Camera = { ...still, pos: [still.pos[0] + sway[0], still.pos[1] + sway[1], still.pos[2] + sway[2]], target: [still.target[0] + sway[0] * 0.5, 0, still.target[2] + sway[2] * 0.5] };
  const tris: Tri[] = district().slice();
  const fogged = o.fog ?? [5200, 14000];
  shadows(tris, envAt(hourAt(t), fogged[0], fogged[1]));
  const glowsFront: Glow[] = [];
  const glowsBehind: Glow[] = [];
  const lights: PointLight[] = [];
  const size = o.size ?? 0.0052;
  if (o.rows) for (const f of fieldRows()) tris.push(f);

  // The two companies' routes, drawn as they walk.
  routeLine(tris, ROUTE_84, sm(46, 64, t), CYAN, camera, 0.75 * (1 - sm(100, 112, t)));
  routeLine(tris, ROUTE_55, sm(58, 72, t), CYAN, camera, 0.75 * (1 - sm(100, 112, t)));

  // The 84th.
  const p84 = pos84(t);
  const firing84: V3[] = [];
  if (t >= 46 && t < 186) {
    squad(tris, p84, 9, Math.min(90, length(sub(camera.pos, p84)) * 0.03), CYAN, camera, 84, t, size);
    firing84.push(p84);
  } else if (t >= 186) {
    const r = rng(844);
    for (let i = 0; i < 18; i++) {
      const p = at(RIVERBANK_84[0] + 16 + (r() - 0.5) * 100, RIVERBANK_84[2] + (r() - 0.5) * 110);
      if (t < 240 || i < 18) {
        token(tris, p, CYAN, camera, size);
        firing84.push(p);
      }
    }
    for (const m of riverMen) marker(tris, glowsFront, m, t, camera, size * 0.82);
  }

  // The 55th, one figure for each man.
  const living55: V3[] = [];
  if (t >= 58 && t < 72) squad(tris, pos55(t), 8, 40, CYAN, camera, 55, t, size);
  else if (t >= 72) {
    for (const m of fieldMen) {
      marker(tris, glowsFront, m, t, camera, size * 0.82);
      if (t < m.fall && t < CONTACT_LOST + 1) {
        if (m.fall === Infinity && t > 178) continue;
        token(tris, m.p, CYAN, camera, size * 0.82);
        living55.push(m.p);
      }
    }
    // The one who gets away, to the river.
    if (t > 177 && t < 184) {
      const lone = fieldMen[35].p;
      token(tris, lerp3(lone, at(lone[0] + 30, -50), sm(178, 183, t)), CYAN, camera, size * 0.82, 0.92);
    }
  }

  // The armed men on the other side: how many is not known, so they are never counted.
  const hostile: V3[] = [];
  for (const h of hostiles) {
    const p = hostileAt(h, t);
    if (!p) continue;
    token(tris, p, AMBER, camera, size * 0.82);
    if (t > 90) hostile.push(p);
  }

  // Everyone else trying to get there.
  if (t > 40) for (const s of support) token(tris, supportAt(s, t), DIM, camera, size * 0.72);
  if (t >= 126) for (let i = 0; i < 6; i++) {
    const a = armyAt(i, t);
    const v = size * length(sub(a, camera.pos));
    box(tris, { pos: [a[0], 0, a[2]], size: [v * 1.5, v * 0.9, v] }, { color: GREEN, glow: 0.9, zBias: -3 });
  }
  if (t >= 142) {
    const r = rng(62);
    for (let i = 0; i < 12; i++) {
      const home = at(ACP[0] + (r() - 0.5) * 200, HIGHWAY_Z - 30);
      const front = at(-300 + (r() - 0.5) * 190, 610 + r() * 60);
      const onward = at(RIVERBANK_84[0] + 50 + r() * 60, RIVERBANK_84[2] + 50 + r() * 90);
      const p = lerp3(lerp3(lerp3(home, front, sm(142, 150, t)), home, sm(160, 168, t)), onward, sm(224, 240, t));
      token(tris, p, GREEN, camera, size * 0.72);
    }
  }

  // The fighting.
  if (t >= 91 && t < 186) exchange(tris, glowsFront, hostile.slice(0, 40), living55.length ? living55 : [FIELD], t, camera, Math.round(8 * (1 - 0.5 * sm(176, 183, t))), 11);
  if (t >= 91 && t < CONTACT_LOST) exchange(tris, glowsFront, living55, hostile.slice(0, 30), t, camera, Math.round(5 * (1 - sm(150, CONTACT_LOST, t))), 12);
  if (t >= 89 && t < LAST_SHOT) {
    const near84 = hostile.filter((p) => length(sub(p, p84)) < 800);
    exchange(tris, glowsFront, near84.length ? near84 : hostile.slice(30, 50), firing84, t, camera, t > 186 ? 12 : 4, 13);
    if (t > 186) exchange(tris, glowsFront, firing84, near84.length ? near84 : hostile.slice(0, 10), t, camera, 4, 14);
  }
  if (t >= 92 && t < 186) puffs(tris, camera, t, FIELD, 280, 3.2, 21, 16 * (length(sub(FIELD, camera.pos)) / 1500 + 0.2), 92, 183);
  if (t >= 186 && t < 214) puffs(tris, camera, t, RIVERBANK_84, 240, 2.6, 22, 18 * (length(sub(RIVERBANK_84, camera.pos)) / 1500 + 0.2), 186, 214);

  // The rounds of white phosphorus, marking from the air: smoke trailing down in long white arms.
  for (const [i, r0] of WP_ROUNDS.entries()) {
    const age = t - r0;
    if (age < 0 || age > 13) continue;
    const c = at(WP_POINT[0] - 110 + i * 110, WP_POINT[2] + (i - 1) * 60);
    if (age < 0.6) {
      glowsFront.push({ p: [c[0], 40, c[2]], radius: 520 * (1 - age / 0.6) + 80, color: WHITE, alpha: 0.95 * (1 - age / 0.6) });
      lights.push({ p: [c[0], 60, c[2]], color: [255, 245, 230], intensity: 3.5 * (1 - age / 0.6), range: 1100 });
    }
    const fade = 1 - sm(7, 13, age);
    const r = rng(600 + i);
    for (let k = 0; k < 22; k++) {
      const a = r() * Math.PI * 2, reach = (10 + r() * r() * 92) * Math.min(1, age / 1.6);
      const s = (8 + r() * 12) * (0.6 + Math.min(1.5, age * 0.26));
      puff(tris, [c[0] + Math.cos(a) * reach, 10 + age * (4 + r() * 7), c[2] + Math.sin(a) * reach], s * 1.7, camera, WHITE, 0.5 * fade);
    }
  }

  const hour = hourAt(t);
  const frame: Frame = { tris, camera, env: envAt(hour, fogged[0], fogged[1]), glowsFront, glowsBehind, lights };
  return { frame, tags };
}

// Straight above the field. One marker at a time.
export function fieldFrame(t: number): Built {
  const camera = shotCamera([{ from: 160, to: 181.5, pos: [[6, 470, 230], [6, 372, 196]], target: [[6, 0, 46], [6, 0, 42]], fov: [34, 34], ease: (x) => x }], t);
  const { frame } = mapScene(t, camera, [], { size: 0.0076, rows: true });
  const dark = sm(CONTACT_LOST, CONTACT_LOST + 0.7, t);
  return scene(frame, [{ p: FIELD, text: "55TH SAC", sub: dark > 0.5 ? "NO CONTACT" : undefined, tone: dark > 0.5 ? "dim" : "cyan", side: -1 }], { clouds: 0.4 });
}

// The count: every marker on the wide shot, under a flat sky.
export function countFrame(t: number): Built {
  const camera = shotCamera([{ from: 256, to: 278.7, pos: [[340, 2500, 980], [350, 3050, 1290]], target: [[340, 0, -100], [350, 0, -50]], fov: [38, 38], ease: (x) => x }], t);
  const tris: Tri[] = district().slice();
  const glowsFront: Glow[] = [];
  for (const m of [...fieldMen.slice(0, 35), ...riverMen]) marker(tris, glowsFront, { ...m, fall: 0 }, t, camera, 0.0044, 0.2);
  const env = { ...envAt(9.5, 5200, 14000), sunColor: [190, 190, 186] as RGB, ambient: [132, 134, 138] as RGB, skyTop: hex("#8a8f96"), skyBottom: hex("#b6b8b8") };
  return scene({ tris, camera, env, glowsFront }, [], { clouds: 0.3 });
}


