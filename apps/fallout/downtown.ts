// Downtown Port Calder at street level. The main avenue runs along z and ends at the Meridian Clock; the parent in the
// mustard coat runs up it towards the tower, against a crowd running the other way. Also the phone that starts it all.
import { dot, hex, mixRGB, norm, sub, type Camera, type Env, type Frame, type Glow, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, hash2, octa, poseFn, rng, shake, shotCamera, smooth, sphere, tetra, tree, vary, type Shot } from "../../src/kit/lowpoly/world";
import { car, person, type Pose } from "../typhoon/models";
import { CITY_PARENT, boxShadow, clockFace, personShadow, phone, stranger, tinyPerson } from "./models";
import { BLAST_SOUND, FLASH, cityMinutes } from "./timeline";

/** `zoom` is a radial blur for the hits. `flare` is a point of light the lens streaks. */
export type Fx = { white: number; dust: number; black: number; screen?: { tl: V3; br: V3 }; zoom?: number; flare?: { p: V3; alpha: number } };
export const NO_FX: Fx = { white: 0, dust: 0, black: 0 };

const GROUND = 6000, KERB = 5900, PAINT = 5800;
const ROAD = 11, WALK = 16, PITCH = 72;

/** The tower stands where the avenue ends, facing back down it. */
export const TOWER: V3 = [0, 0, 108];
const CLOCK_Y = 96, CLOCK_R = 7.5;
const TOWER_W = 16, TOWER_H = 112;

const quad = (out: Tri[], x0: number, z0: number, x1: number, z1: number, y: number, color: RGB, zBias: number) => {
  out.push({ a: [x0, y, z0], b: [x1, y, z0], c: [x1, y, z1], color, zBias }, { a: [x0, y, z0], b: [x1, y, z1], c: [x0, y, z1], color, zBias });
};

/** A box whose walls are cut into floors, two tints of glass taking turns. */
function tower(out: Tri[], x: number, z: number, w: number, d: number, h: number, c: RGB, seed: number, floors: boolean) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  const roof = mixRGB(c, [40, 44, 52], 0.6);
  out.push({ a: [x0, h, z0], b: [x1, h, z0], c: [x1, h, z1], color: roof }, { a: [x0, h, z0], b: [x1, h, z1], c: [x0, h, z1], color: roof });
  const walls: [V3, V3][] = [[[x0, 0, z1], [x1, 0, z1]], [[x1, 0, z1], [x1, 0, z0]], [[x1, 0, z0], [x0, 0, z0]], [[x0, 0, z0], [x0, 0, z1]]];
  const step = floors ? 7 : h;
  walls.forEach(([a, b], f) => {
    let i = 0;
    for (let y = 0; y < h; y += step, i++) {
      const top = Math.min(h, y + step);
      const pale = hash2(i, f * 7, seed) > 0.72;
      const col = vary(i % 2 ? c : mixRGB(c, pale ? hex("#ffe9c0") : [10, 18, 30], pale ? 0.22 : 0.18), seed + f + i, 0.03);
      out.push({ a: [a[0], y, a[2]], b: [b[0], y, b[2]], c: [b[0], top, b[2]], color: col }, { a: [a[0], y, a[2]], b: [b[0], top, b[2]], c: [a[0], top, a[2]], color: col });
    }
  });
}

type Tower = { x: number; z: number; w: number; d: number; h: number; c: RGB };
const TOWERS: Tower[] = [];
let groundCache: Tri[] = [];
let staticCache: Tri[] | null = null;
function cityStatic(): Tri[] {
  if (staticCache) return staticCache;
  const out: Tri[] = [];
  const floor: Tri[] = [];
  const ASPHALT = hex("#44474d"), WALKWAY = hex("#a7a59c"), LINE = hex("#e8e4d6"), PLAZA = hex("#bfb8a6");
  const GLASS = ["#5f8fb3", "#4e7a9e", "#7ea3bb", "#476c8c", "#8fa8b5", "#a29a8c"].map(hex);
  const r = rng(404);
  // The whole floor of the city is asphalt; blocks and their pavements sit on it.
  quad(floor, -900, -900, 900, 900, -0.01, ASPHALT, GROUND);
  for (let k = -6; k <= 6; k++) {
    for (let j = -6; j <= 6; j++) {
      const cx = (k + 0.5) * PITCH, cz = (j + 0.5) * PITCH;
      const half = PITCH / 2 - ROAD;
      quad(floor, cx - half, cz - half, cx + half, cz + half, 0.02, WALKWAY, KERB);
      const near = Math.abs(cx) < 200 && Math.abs(cz) < 300;
      const inner = half - (WALK - ROAD);
      const centre = 1 - Math.min(1, Math.hypot(cx, cz - 40) / 460);
      const w = inner * (1.5 + r() * 0.45), d = inner * (1.5 + r() * 0.45);
      const h = 34 + r() * 40 + centre * centre * (40 + r() * 120);
      const x = cx + (r() - 0.5) * 3, z = cz + (r() - 0.5) * 3, c = GLASS[Math.floor(r() * GLASS.length)];
      TOWERS.push({ x, z, w, d, h, c });
      tower(out, x, z, w, d, h, c, k * 31 + j * 7, near);
    }
  }
  // Lane markings up the avenue, and the crossing's zebra stripes.
  for (let z = -300; z < 90; z += 9) if (Math.abs(z) > 14) for (const x of [-3.7, 3.7]) quad(floor, x - 0.08, z, x + 0.08, z + 4, 0.03, LINE, PAINT);
  for (let i = -5; i <= 5; i++) {
    const x = i * 2;
    quad(floor, x - 0.55, 11.5, x + 0.55, 15, 0.03, LINE, PAINT);
    quad(floor, x - 0.55, -15, x + 0.55, -11.5, 0.03, LINE, PAINT);
    quad(floor, 11.5, x - 0.55, 15, x + 0.55, 0.03, LINE, PAINT);
    quad(floor, -15, x - 0.55, -11.5, x + 0.55, 0.03, LINE, PAINT);
  }
  // Plaza at the avenue's end.
  quad(floor, -18, 90, 18, 126, 0.03, PLAZA, KERB - 50);
  // The elevated line crosses the avenue on pillars, a train stopped on it.
  const STEEL = hex("#5a5f68"), TRAIN = hex("#c9ced3");
  const yd = 9.5, zv = 70; // Along the cross street, so it clears every tower and the parent's view of the clock.
  for (let x = -300; x <= 300; x += 26) for (const dz of [-3.2, 3.2]) if (Math.abs(x) > 12) box(out, { pos: [x, 0, zv + dz], size: [1.1, yd, 1.1] }, { color: STEEL });
  box(out, { pos: [0, yd, zv], size: [640, 1.1, 8.2] }, { color: mixRGB(STEEL, [255, 255, 255], 0.1) });
  for (let i = 0; i < 5; i++) {
    const x = -46 + i * 21;
    box(out, { pos: [x, yd + 1.1, zv], size: [19.4, 3.3, 3.2] }, { color: TRAIN });
    box(out, { pos: [x, yd + 2.3, zv + 1.62], size: [18, 1, 0.04] }, { color: hex("#27323f"), zBias: -0.3 });
    box(out, { pos: [x, yd + 2.3, zv - 1.62], size: [18, 1, 0.04] }, { color: hex("#27323f"), zBias: -0.3 });
    box(out, { pos: [x, yd + 1.5, zv - 1.63], size: [19.4, 0.4, 0.04] }, { color: hex("#c23a2e"), zBias: -0.3 });
  }
  // Street trees and lamp posts down both pavements.
  for (let z = -240; z < 84; z += 18) {
    if (Math.abs(z) < 20 || Math.abs(z - zv) < 8) continue;
    for (const side of [-1, 1]) {
      tree(out, { pos: [side * 14, 0, z + (side > 0 ? 6 : 0)], size: 5.5 + (hash2(z, side) * 2), yaw: z }, hex("#3f7a3a"));
      box(out, { pos: [side * 11.6, 0, z + 9], size: [0.18, 7, 0.18] }, { color: STEEL });
      box(out, { pos: [side * 10.8, 7, z + 9], size: [1.8, 0.14, 0.2] }, { color: STEEL });
    }
  }
  // The tower: a stone shaft in three stages, then a stepped pyramid roof.
  const [tx, , tz] = TOWER;
  const STONE = hex("#b7a98d"), STONE2 = hex("#9c8e74"), ROOF = hex("#3e5a55");
  box(out, { pos: [tx, 0, tz], size: [TOWER_W + 6, 10, TOWER_W + 6] }, { color: STONE2 });
  box(out, { pos: [tx, 10, tz], size: [TOWER_W, 60, TOWER_W] }, (f) => ({ color: f % 2 ? STONE : STONE2 }));
  box(out, { pos: [tx, 70, tz], size: [TOWER_W + 2, 3, TOWER_W + 2] }, { color: STONE2 });
  box(out, { pos: [tx, 73, tz], size: [TOWER_W + 1, 34, TOWER_W + 1] }, (f) => ({ color: f % 2 ? STONE : STONE2 }));
  box(out, { pos: [tx, 107, tz], size: [TOWER_W + 2.4, 2, TOWER_W + 2.4] }, { color: STONE2 });
  // The face down the avenue: courses of stone, tall narrow windows, a great door.
  const faceZ = tz - TOWER_W / 2 - 0.06, upperZ = tz - (TOWER_W + 1) / 2 - 0.06;
  const mark = (x0: number, x1: number, y0: number, y1: number, z: number, c: RGB) => out.push({ a: [x0, y0, z], b: [x1, y0, z], c: [x1, y1, z], color: c, zBias: -1 }, { a: [x0, y0, z], b: [x1, y1, z], c: [x0, y1, z], color: c, zBias: -1 });
  const SLIT = hex("#35302a"), COURSE = hex("#8d7f66");
  for (let y = 14; y < 70; y += 7) mark(tx - TOWER_W / 2, tx + TOWER_W / 2, y, y + 0.32, faceZ, COURSE);
  for (let y = 16; y < 66; y += 14) for (const x of [-4.6, 0, 4.6]) mark(tx + x - 0.6, tx + x + 0.6, y, y + 8.4, faceZ, SLIT);
  for (let y = 76; y < 86; y += 3) mark(tx - hwUpper(), tx + hwUpper(), y, y + 0.28, upperZ, COURSE);
  mark(tx - 2.6, tx + 2.6, 0, 6.2, tz - (TOWER_W + 6) / 2 - 0.06, SLIT);
  const peak: V3 = [tx, TOWER_H + 22, tz], hw = (TOWER_W + 1) / 2;
  const rc: V3[] = [[tx - hw, 109, tz - hw], [tx + hw, 109, tz - hw], [tx + hw, 109, tz + hw], [tx - hw, 109, tz + hw]];
  for (let i = 0; i < 4; i++) out.push({ a: rc[i], b: rc[(i + 1) % 4], c: peak, color: i % 2 ? ROOF : mixRGB(ROOF, [0, 0, 0], 0.2) });
  groundCache = floor;
  staticCache = [...floor, ...out];
  return staticCache;
}

function hwUpper() {
  return (TOWER_W + 1) / 2;
}

// A low morning sun, so the towers throw long shadows down the streets.
const SUN = norm([0.62, 0.44, -0.64]);
const SHADOW = PAINT - 100;

let shadowCache: Tri[] | null = null;
function cityShadows(): Tri[] {
  if (shadowCache) return shadowCache;
  cityStatic();
  const out: Tri[] = [];
  for (const b of TOWERS) boxShadow(out, b.x - b.w / 2, b.x + b.w / 2, b.z - b.d / 2, b.z + b.d / 2, b.h, SUN, 0.04, 0.27, SHADOW);
  boxShadow(out, TOWER[0] - TOWER_W / 2, TOWER[0] + TOWER_W / 2, TOWER[2] - TOWER_W / 2, TOWER[2] + TOWER_W / 2, TOWER_H, SUN, 0.04, 0.3, SHADOW);
  shadowCache = out;
  return out;
}

/** The hands change, so the faces are drawn fresh. Only the side down the avenue can ever be seen. */
function towerClock(out: Tri[], t: number) {
  clockFace(out, [TOWER[0], CLOCK_Y, TOWER[2] - (TOWER_W + 1) / 2 - 0.15], Math.PI, CLOCK_R, 9, cityMinutes(t), { rim: hex("#2c2f35"), glow: 0.35, lift: 30 });
}

// ── The people ───────────────────────────────────────────────────────────────────────────────────────

/** Where the parent in the mustard coat is: up the middle of the avenue, then stopped. */
export function cityParentZ(t: number) {
  return -6 + Math.max(0, Math.min(t, 25.8) - 6) * 1.6;
}

const CROWD = 270;
type Walker = { x: number; z0: number; speed: number; start: number; seed: number; color: RGB; visible: number };
let crowdCache: Walker[] | null = null;
function crowdList(): Walker[] {
  if (crowdCache) return crowdCache;
  const r = rng(71);
  const C = ["#c94f3d", "#3f7ea6", "#e6e0d0", "#5d8a55", "#d9a441", "#7a5a9a", "#2f4f6f", "#b86a8c", "#8c8c84", "#22303f"].map(hex);
  crowdCache = Array.from({ length: CROWD }, (_, i) => {
    // The middle of the avenue between the stopped cars, and both pavements.
    const lane = r();
    const x = lane < 0.62 ? (r() - 0.5) * 8.4 : (r() < 0.5 ? -1 : 1) * (11.8 + r() * 3.2);
    return { x, z0: -30 + r() * 118, speed: 3 + r() * 2.8, start: 6.3 + r() * 1.1, seed: i + 1, color: C[Math.floor(r() * C.length)], visible: r() };
  });
  return crowdCache;
}

function crowd(out: Tri[], glowsFront: Glow[], cam: Camera, t: number, parentZ: number) {
  const ahead = norm(sub(cam.target, cam.pos));
  const remain = 1 - 0.8 * smooth(24.8, 27.6, t);
  crowdList().forEach((w, i) => {
    if (w.visible > remain) return;
    const running = t > w.start;
    const span = 160;
    let z = w.z0;
    if (running) z = w.z0 - w.speed * (t - w.start);
    // Wrap well beyond what the shot can see, so a runner never pops into view.
    if (running) z = (((z + 60) % span) + span) % span - 60;
    let x = w.x + (running ? Math.sin(t * 1.1 + i) * 0.35 : 0);
    // Everyone goes round the one person coming the other way.
    const dz = z - parentZ;
    if (Math.abs(dz) < 2.4 && Math.abs(x) < 1.2) x += (x >= 0 ? 1 : -1) * (1.2 - Math.abs(x)) * (1 - Math.abs(dz) / 2.4);
    const d: V3 = [x - cam.pos[0], 0.9 - cam.pos[1], z - cam.pos[2]];
    const dist = Math.hypot(d[0], d[1], d[2]);
    if (dist > 2 && dot(d, ahead) < 0) return;
    if (dist > 62) {
      if (dist < 190) tinyPerson(out, x, 0, z, w.color);
      return;
    }
    const look = stranger(w.seed);
    const pose: Pose = {
      pos: [x, 0, z],
      yaw: running ? Math.PI : (i * 2.4) % (Math.PI * 2),
      lod: dist < 11 ? 1 : 0,
      walk: running ? 1 : 0,
      phase: t * (7 + (i % 5)) + i,
      lean: running ? 0.14 : 0,
      headPitch: running ? 0 : 0.42,
      handR: running ? undefined : [0.1, 1.08 * (look.height / 1.7), 0.26],
    };
    person(out, look, pose);
    if (dist < 45) personShadow(out, x, 0.04, z, look.height, SUN, 0.34, SHADOW - 10);
    if (!running) {
      const yaw = pose.yaw;
      const px = x + Math.sin(yaw) * 0.26 + Math.cos(yaw) * 0.1, pz = z + Math.cos(yaw) * 0.26 - Math.sin(yaw) * 0.1;
      octa(out, { pos: [px, 1.08 * (look.height / 1.7), pz], size: 0.1 }, { color: hex("#ff5148"), glow: 1, zBias: -0.1 });
      if (i % 3 === 0) glowsFront.push({ p: [px, 1.08, pz], radius: 0.34, color: [255, 70, 60], alpha: 0.4 });
    }
  });
}

/** The phones of everyone too far off to draw: a sea of red lights down every street. */
function phoneSea(out: Tri[], amount: number) {
  if (amount <= 0) return;
  const r = rng(9);
  const c = hex("#ff4a40");
  for (let i = 0; i < 3400; i++) {
    const along = -520 + r() * 1040, across = (r() - 0.5) * 32, line = Math.floor(r() * 13) - 6, onZ = r() < 0.5;
    const x = onZ ? line * PITCH + across : along, z = onZ ? along : line * PITCH + across;
    if (onZ && Math.abs(x) < 16 && z > 88) continue;
    const s = 0.36 + r() * 0.3;
    if (r() > amount) continue;
    out.push({ a: [x, 1.1, z], b: [x + s, 1.1 + s * 0.2, z + s * 0.3], c: [x + s * 0.3, 1.1 + s, z - s * 0.2], color: c, glow: 1, zBias: -0.2 });
  }
}

const CAR_COLORS = ["#c63d32", "#e6e3dc", "#2c3f5e", "#3a3d42", "#c9a227", "#7f8a93", "#2f6d5f", "#e6e3dc"].map(hex);
let carsCache: Tri[] | null = null;
function cars(): Tri[] {
  if (carsCache) return carsCache;
  const out: Tri[] = [];
  const r = rng(12);
  // Gridlock: nose to tail up both sides of the avenue, and across the crossing's side road.
  for (const x of [-8.2, 8.2]) for (let z = -220; z < 86; z += 5.4 + r() * 1.3) if (Math.abs(z) > 17) car(out, [x + (r() - 0.5) * 0.5, 0, z], x > 0 ? 0.04 * (r() - 0.5) : Math.PI + 0.06 * (r() - 0.5), CAR_COLORS[Math.floor(r() * 8)]);
  for (const z of [-7, -3.2, 3.2, 7]) for (let x = -120; x < 120; x += 5.6 + r() * 1.4) if (Math.abs(x) > 18) car(out, [x, 0, z + (r() - 0.5) * 0.4], Math.PI / 2 + (z > 0 ? Math.PI : 0) + 0.08 * (r() - 0.5), CAR_COLORS[Math.floor(r() * 8)]);
  // Everyone's foot is on the brake.
  for (const x of [-8.2, 8.2]) {
    const yaw = x > 0 ? 0 : Math.PI;
    for (let z = -220; z < 86; z += 6.05) {
      if (Math.abs(z) <= 17) continue;
      const T = poseFn({ pos: [x, 0, z], yaw });
      for (const side of [-0.6, 0.6]) octa(out, { pos: T([side, 0.72, -2.08]), size: [0.17, 0.09, 0.04] }, { color: hex("#ff3a2c"), glow: 1 });
    }
  }
  carsCache = out;
  return out;
}

function birds(out: Tri[], t: number) {
  if (t < 28.6) return;
  const k = t - 28.6;
  const r = rng(5);
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.28, sp = 7 + r() * 8, x0 = (r() - 0.5) * 16, flap = Math.sin(t * 22 + i) * 0.55;
    const p: V3 = [TOWER[0] + x0 + Math.cos(a) * sp * k, 108 + k * (7 + r() * 8), TOWER[2] - 9 - Math.abs(Math.sin(a)) * sp * k];
    const s = 0.8;
    out.push({ a: p, b: [p[0] - s, p[1] + flap, p[2]], c: [p[0] - 0.1, p[1], p[2] - s * 0.5], color: hex("#2b2d33") }, { a: p, b: [p[0] + s, p[1] + flap, p[2]], c: [p[0] + 0.1, p[1], p[2] - s * 0.5], color: hex("#34363c") });
  }
}

// ── The shots ────────────────────────────────────────────────────────────────────────────────────────

const MORNING: Env = {
  skyTop: hex("#4f93c9"),
  skyBottom: hex("#f7dcae"),
  fog: hex("#ecd7b2"),
  fogNear: 90,
  fogFar: 760,
  sun: SUN,
  sunColor: [255, 214, 158],
  ambient: [104, 114, 138],
};

/** The light going wrong: in the last instant before the white, everything burns out. */
function flashEnv(t: number): Env {
  const k = smooth(FLASH - 0.4, FLASH, t);
  if (k <= 0) return MORNING;
  return { ...MORNING, skyTop: mixRGB(MORNING.skyTop, [255, 255, 255], k), skyBottom: mixRGB(MORNING.skyBottom, [255, 255, 255], k), ambient: mixRGB(MORNING.ambient, [255, 255, 255], k) };
}

// Straight up the middle of the avenue, so it never meets a tower: the crowd, then the sea of phones, then the clock.
const WIDE: Shot[] = [{ from: 3, to: 6, pos: [[5, 2, -13], [2, 58, -92]], target: [[-1.5, 2.8, 8], [0, 62, 108]], fov: [50, 50] }];

function parentPose(t: number, lod: number): Pose {
  const z = cityParentZ(t);
  const running = t < 25.8;
  const phoneUp = t < 23;
  return {
    pos: [0.1 * Math.sin(t * 2.2), 0, z],
    yaw: 0,
    walk: running ? 1 : 0,
    phase: t * 9.5,
    lean: running ? 0.16 : 0,
    lod,
    handR: phoneUp ? [0.14, 1.56, 0.03] : undefined,
    headYaw: t < 25.8 ? 0.15 * Math.sin(t * 1.4) : 0,
    headPitch: -0.75 * smooth(25.9, 27.2, t),
  };
}

function streetScene(t: number, camera: Camera, parent: boolean, fx: Partial<Fx>): { frame: Frame; fx: Fx } {
  const tris: Tri[] = [];
  const glowsFront: Glow[] = [];
  for (const x of cityStatic()) tris.push(x);
  for (const x of cityShadows()) tris.push(x);
  for (const x of cars()) tris.push(x);
  towerClock(tris, t);
  crowd(tris, glowsFront, camera, t, cityParentZ(t));
  if (parent) {
    const pose = parentPose(t, 2);
    person(tris, CITY_PARENT, pose);
    personShadow(tris, pose.pos[0], 0.04, pose.pos[2], CITY_PARENT.height, SUN, 0.42, SHADOW - 10);
    // The phone at their ear, for as long as they keep trying.
    if (pose.handR) phone(tris, [pose.pos[0] + 0.15, 1.59, pose.pos[2] + 0.05], Math.PI / 2, hex("#33363c"), 0, 0, 0.2, -0.04);
  }
  birds(tris, t);
  return { frame: { tris, camera, env: flashEnv(t), glowsFront }, fx: { ...NO_FX, ...fx } };
}

/** Shot 1, the opening: black, the buzz, the alert on the phone. */
function phoneShot(t: number): { frame: Frame; fx: Fx } {
  const tris: Tri[] = [];
  const glowsFront: Glow[] = [];
  const on = t > 0.35;
  // The phone rattling while it buzzes.
  const buzz = t > 0.1 && (t % 0.72) < 0.42 ? 1 : 0;
  const j = (s: number) => Math.sin(t * 190 + s) * 0.0014 * buzz;
  const shots = phone(tris, [j(0), j(2), 0], 0, hex("#b2141a"), on ? 1 : 0, 0, j(5) * 4, 0);
  if (on) glowsFront.push({ p: [0, 0, 0.03], radius: 0.26, color: [255, 50, 44], alpha: 0.28 });
  const camera: Camera = { pos: [0, 0, 0.31 - 0.012 * smooth(0.8, 3, t)], target: [0, 0, 0], fov: 45 };
  const env: Env = { skyTop: hex("#000000"), skyBottom: hex("#000000"), fog: hex("#000000"), fogNear: 40, fogFar: 80, sun: norm([0, 0.3, 1]), sunColor: [40, 40, 44], ambient: [20, 20, 24] };
  return { frame: { tris, camera, env, glowsFront }, fx: { ...NO_FX, screen: on ? { tl: shots.tl, br: shots.br } : undefined } };
}

export function alertFrame(t: number) {
  if (t < 3) return phoneShot(t);
  const camera = shotCamera(WIDE, t);
  const built = streetScene(t, camera, false, {});
  // The sea of phones comes up as the camera climbs.
  phoneSea(built.frame.tris, smooth(3.4, 4.8, t));
  return built;
}

/** The panic is six shots, cut on the music's pulse, and all of them are hand-held. */
function panicCamera(t: number, z: number): Camera {
  if (t < 7.4) return { pos: [0.5, 1.95, z - 3.5], target: [0.25, 2.5, z + 8], fov: 58 };
  if (t < 8.6) {
    // At ankle height, as the crowd comes straight over the camera.
    const k = t - 7.4;
    return { pos: [-2.6, 0.34, z + 15 - k * 6], target: [-0.6, 2.5, z + 5], fov: 64 };
  }
  if (t < 10) {
    // Overhead: a river of people between two lines of stopped cars.
    const k = t - 8.6;
    return { pos: [7 + k * 1.5, 25 - k * 1.5, z - 4 + k * 3], target: [0, 0, z + 16 + k], fov: 48 };
  }
  // Side on, with people cutting across the lens, and the phone at their ear.
  if (t < 11.2) return { pos: [-1.9, 1.5, z + 0.5], target: [0.1, 1.55, z + 0.1], fov: 40 };
  if (t < 12.4) {
    // Down the row of brake lights.
    const k = t - 11.2;
    return { pos: [-10.6, 1.05, z + 3 + k * 3.5], target: [-7.2, 1.2, z + 22 + k * 3.5], fov: 46 };
  }
  // Long lens, stacking the crowd up against the tower.
  const k = t - 12.4;
  return { pos: [0.2, 2.6, z - 8.5 + k * 0.7], target: [0.05, 3.2, z + 14], fov: 36 };
}

export function panicFrame(t: number) {
  const camera = panicCamera(t, cityParentZ(t));
  return streetScene(t, shake(camera, t, t >= 8.6 && t < 10 ? 0.12 : 0.04), true, {});
}

/** The cut away during the call: the parent, close, shouting into a phone over the noise. */
export function parentCloseFrame(t: number) {
  const z = cityParentZ(t);
  const k = t - 21.6;
  const camera: Camera = { pos: [-1.7 + k * 0.1, 1.54, z + 0.75], target: [0.1, 1.6, z + 0.15], fov: 34 };
  return streetScene(t, shake(camera, t, 0.03), true, {});
}

export function lookFrame(t: number) {
  const z = cityParentZ(t);
  if (t >= 28.3 && t < 29.2) {
    // The hand reaches 9:14.
    const camera: Camera = { pos: [2, CLOCK_Y - 8, TOWER[2] - 72], target: [0, CLOCK_Y, TOWER[2]], fov: 30 };
    return streetScene(t, camera, false, {});
  }
  const k = smooth(25, 28.3, t);
  // The light's starting to change as the last seconds run out.
  const camera: Camera = t < 28.3
    ? { pos: [1.3 - 0.7 * k, 1.4 - 0.6 * k, z - 4 + 1.4 * k], target: [0, 1.7 + 12 * k * k, z + 8], fov: 58 + 8 * k }
    : { pos: [0.5, 0.55, z - 2.5], target: [0, 24, z + 16], fov: 70 };
  return streetScene(t, camera, true, { white: smooth(FLASH - 0.14, FLASH, t) });
}

// ── The shockwave ────────────────────────────────────────────────────────────────────────────────────

const FRONT_SPEED = 196;
/** Far side of the city at the sound of the blast; past the camera by the end of the shot. */
const frontZ = (s: number) => 430 - FRONT_SPEED * s;

const BLAST_SUN = norm([0.02, 0.2, 1]);
let blastShadowCache: Tri[] | null = null;
function blastShadows() {
  if (blastShadowCache) return blastShadowCache;
  const out: Tri[] = [];
  for (const b of TOWERS) if (Math.abs(b.x) < 320) boxShadow(out, b.x - b.w / 2, b.x + b.w / 2, b.z - b.d / 2, b.z + b.d / 2, b.h, BLAST_SUN, 0.04, 0.55, SHADOW, [14, 6, 4]);
  blastShadowCache = out;
  return out;
}

/** A tower coming apart: four stacked blocks, the top going first, thrown away from the blast, breaking into shards. */
function blownTower(out: Tri[], b: Tower, p: number, t: number) {
  const CHAR = hex("#23140e");
  const n = 4, seg = b.h / n;
  const dirx = (b.x >= 0 ? 1 : -1) * 0.16;
  for (let i = 0; i < n; i++) {
    const q = Math.max(0, p - (n - 1 - i) * 0.06);
    const throwZ = q * q * (15 + i * 15) + q * (4 + i * 7);
    const pos: V3 = [b.x + dirx * throwZ, i * seg + q * (i * 3.5) - q * q * 7 * (1 - i / n), b.z - throwZ];
    const burn = smooth(0, 0.9, q);
    const color = mixRGB(mixRGB(b.c, hex("#2c2622"), 0.5), CHAR, burn);
    box(out, { pos: [pos[0], Math.max(0, pos[1]), pos[2]], yaw: q * (i - 1.5) * 0.3, pitch: -q * (0.25 + i * 0.32), roll: q * dirx * 2.4, size: [b.w * (1 - q * 0.06), seg, b.d * (1 - q * 0.06)] }, (f) => ({ color: f === 0 ? mixRGB(color, hex("#ff8a3a"), 0.5) : color, glow: q > 0 ? 0.08 : 0 }));
    if (q > 0.02 && q < 2.6) {
      const r = rng(Math.round(b.x * 17 + b.z * 3) + i * 31);
      for (let k = 0; k < 7; k++) {
        const a = r(), c = r(), e = r(), f = r();
        const v = q * (9 + a * 24);
        tetra(out, { pos: [pos[0] + (c - 0.5) * b.w * 1.5 + dirx * v, Math.max(0.3, pos[1] + e * seg + q * (f * 12) - q * q * 5), pos[2] - v * (0.8 + f)], yaw: t * 5 + k, pitch: t * 7 + k, size: 1.1 + a * 2.3 }, { color: k % 3 ? mixRGB(b.c, CHAR, 0.4) : hex("#ffb060"), glow: k % 3 ? 0 : 1 });
      }
    }
  }
}

/** The new hero shot: from low down the avenue, the wave comes straight at the camera, taking the city with it. */
export function blastFrame(t: number): { frame: Frame; fx: Fx } {
  cityStatic();
  const s = t - BLAST_SOUND;
  const front = frontZ(s);
  const tris: Tri[] = [];
  const glowsFront: Glow[] = [];
  const shadows = blastShadows();
  for (const x of groundCache) tris.push(x);
  for (const x of shadows) tris.push(x);
  for (const b of TOWERS) {
    if (Math.abs(b.x) > 320 || b.z < -420 || b.z > 700) continue;
    blownTower(tris, b, Math.max(0, (b.z - front) / FRONT_SPEED), t);
  }
  // The elevated line goes in pieces, and the cars go with it.
  for (let x = -300; x < 300; x += 20) {
    const q = Math.max(0, (70 - front) / FRONT_SPEED);
    const r = rng(x + 500);
    const v = q * (16 + r() * 22);
    box(tris, { pos: [x + (r() - 0.5) * v, Math.max(0, 9.5 + q * 5 - q * q * 8), 70 - v], yaw: q * (r() - 0.5) * 2, pitch: q * (r() - 0.5) * 3, size: [20, 1.1, 8.2] }, { color: hex("#3a3532") });
  }
  const r = rng(12);
  for (const x of [-8.2, 8.2]) {
    for (let z = -220; z < 86; z += 6) {
      const col = CAR_COLORS[Math.floor(r() * 8)], a = r(), b = r();
      const q = Math.max(0, (z - front) / FRONT_SPEED);
      if (z < -200) continue;
      const v = q * q * 26 + q * 14;
      car(tris, [x + (a - 0.5) * v * 0.5, Math.max(0, q * (9 + b * 9) - q * q * 8), z - v], (x > 0 ? 0 : Math.PI) + q * (a - 0.5) * 7, mixRGB(col, hex("#1c130e"), smooth(0, 0.7, q)), q * (b - 0.5) * 9);
    }
  }
  // The wall itself: dust and fire, from the road to well above the rooftops.
  for (let i = 0; i < 170; i++) {
    const q = rng(i * 37 + 5);
    const a = q(), b = q(), c = q(), e = q();
    const size = 15 + c * 42;
    const y = b * b * 190;
    octa(tris, { pos: [-340 + a * 680, y + size * 0.3, front + (e - 0.2) * 44 + y * 0.28], yaw: i + t * (0.7 + c), pitch: i + t * 0.5, size: [size, size * 0.86, size] }, { color: mixRGB(hex("#ffa24a"), hex("#40281a"), 0.2 + 0.8 * b * (0.3 + 0.7 * c)), glow: 0.55, zBias: -2 });
  }
  // Burning debris, carried ahead of the wall.
  for (let i = 0; i < 280; i++) {
    const q = rng(i * 13 + 8);
    const a = q(), b = q(), c = q(), e = q();
    const z = front - 8 - c * 90;
    tetra(tris, { pos: [-180 + a * 360, 0.5 + b * b * 90, z], yaw: t * 7 + i, pitch: t * 9 + i, size: 0.5 + e * 1.8 }, { color: e > 0.5 ? hex("#ffc27a") : hex("#2a1c14"), glow: e > 0.5 ? 1 : 0, zBias: -3 });
  }
  // Over everything at the far end, what started it.
  const domeR = 680 + s * 60;
  sphere(tris, 3, { pos: [0, -60, 1650], yaw: 0.2 }, () => domeR, (d, i) => ({ color: vary(mixRGB(hex("#ffb45a"), hex("#fff6d8"), Math.max(0, 1 - Math.abs(d[1]) * 1.25)), i, 0.05), glow: 1, zBias: 20000 }));
  glowsFront.push({ p: [0, 200, 1600], radius: 1100, color: [255, 180, 96], alpha: 0.35 });

  const near = smooth(1.2, 3.1, s);
  // Up on a rooftop's level at the far end of the avenue, so the towers can be seen going, top first.
  const camera: Camera = { pos: [-3 + near * 0.9, 21, -232 - s * 2], target: [0.6, 44 + near * 9, 60], fov: 62 };
  const env: Env = {
    skyTop: hex("#3a140a"),
    skyBottom: hex("#ffa356"),
    fog: hex("#ff9a52"),
    fogNear: 180,
    fogFar: 1500,
    sun: BLAST_SUN,
    sunColor: [255, 170, 104],
    ambient: [186, 116, 82],
  };
  return {
    frame: { tris, camera: shake(camera, t, 0.05 + 0.65 * near ** 2), env, glowsFront },
    fx: { ...NO_FX, dust: smooth(3.02, 3.32, s), zoom: 0.001 + 0.011 * near ** 2 + 0.009 * Math.exp(-s / 0.3), flare: { p: [0, 180, 1100], alpha: 0.7 } },
  };
}
