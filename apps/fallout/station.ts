// Calder Hills Station, 60 km out: a concrete platform running along z into the mouth of a deep rail tunnel at z = 0. The
// city is in the +z direction, so the cloud and the blast come straight up the line towards the tunnel. Also the tunnel
// itself: the survivors, the ash piling up in its mouth, and the phone.
import { hex, mixRGB, norm, type Camera, type Env, type Frame, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, emitGrid, fbm, hash2, makeGrid, octa, rng, sampleGrid, shake, smooth, tetra, tree, vary } from "../../src/kit/lowpoly/world";
import { limb, person, poly, type Look, type Pose } from "../typhoon/models";
import { NO_FX, type Fx } from "./downtown";
import { CHILD, STATION_PARENT, ashfall, boxShadow, clockFace, inDark, personShadow, phone, stranger } from "./models";
import { mushroom } from "./region";
import { FLASH, PHONE_DIES, SLAM, STATION_HIT, STATION_KM, cloudAge, stationMinutes } from "./timeline";

const PLATFORM_Y = 1;
const PORTAL_Z = 0;
const OPEN_W = 9, OPEN_H = 7.5;
const CANOPY = { from: 6, to: 62 };
/** The platform clock hangs from the canopy near the tunnel, its faces up and down the line. */
const CLOCK_AT: V3 = [0, 4.1, 12];

/**
 * Where the cloud stands, far up the line, in world units per km. At its true angle from 60 km it would be wider than the
 * frame and read as a brown sky, so it's drawn at 36%: small enough to be seen as what it is.
 */
const CLOUD_AT: V3 = [260, -30, 1300];
const KM = (0.36 * Math.hypot(CLOUD_AT[0], CLOUD_AT[2])) / STATION_KM;

const MORNING_SUN = norm([0.6, 0.46, -0.64]);

/** 0 before the blast … 1 the wreck after it. */
const wreckAt = (t: number) => smooth(STATION_HIT - 0.05, STATION_HIT + 0.5, t);
/** 0 clean … 1 buried, for the walk out. */
const ashAt = (t: number) => (t >= 84 ? 1 : 0);

// ── The world outside ────────────────────────────────────────────────────────────────────────────────

const GRID = makeGrid(-620, -380, 62, 76, 20, 4);

function groundHeight(x: number, z: number) {
  // Flat where the line runs; the hill rises behind the portal and off to the sides of it.
  const open = smooth(10, 42, Math.abs(x));
  let h = fbm(x * 0.009, z * 0.009, 3, 4) * 14 * smooth(40, 200, Math.abs(x) + Math.max(0, -z));
  h += smooth(6, -40, z) * 34;
  h += open * smooth(70, 0, z) * 7;
  return h;
}
let groundSampled: ReturnType<typeof sampleGrid> | null = null;
const FIELD = ["#6f9d50", "#7ea857", "#94ad5b", "#5f8d4a", "#a9a860", "#7b9a4f"].map(hex);
const HILL = hex("#55803f"), BED = hex("#6b645b");

/**
 * The land. `fromInside` is for a camera in the tunnel: the hill it's under would otherwise be a dark ceiling across the
 * sky, so everything near the mouth is taken away and a flat apron of ground stands in for what can be seen of it.
 */
function outside(out: Tri[], t: number, ash: number, fromInside = false) {
  groundSampled ??= sampleGrid(GRID, groundHeight);
  const burn = smooth(STATION_HIT, STATION_HIT + 0.4, t);
  const GREY = hex("#8d8b83");
  const first = out.length;
  emitGrid(out, GRID, groundSampled, (a, b, c, cx, cz) => {
    if (fromInside && cz < 34) return null;
    const near = Math.abs(cx) < 12;
    const patch = FIELD[Math.floor(Math.abs(fbm(cx * 0.012, cz * 0.012, 2, 9)) * 26) % FIELD.length];
    let color = cz < -6 ? HILL : near ? BED : patch;
    color = vary(color, a * 3 + b + c);
    if (burn > 0) color = mixRGB(color, hex("#6a5f4e"), burn * 0.72);
    if (ash > 0) color = mixRGB(color, vary(GREY, a), ash * 0.92);
    return { color };
  });
  // Every ground face is drawn first: nothing here ever hides what stands on it.
  for (let i = first; i < out.length; i++) out[i].zBias = 9000;
  if (fromInside) {
    let apron = mixRGB(BED, FIELD[0], 0.5);
    if (burn > 0) apron = mixRGB(apron, hex("#6a5f4e"), burn * 0.72);
    if (ash > 0) apron = mixRGB(apron, GREY, ash * 0.92);
    for (let x = -600; x < 600; x += 40) for (let z = -2; z < 58; z += 20) poly(out, [[x, 0, z], [x + 40, 0, z], [x + 40, 0, z + 20], [x, 0, z + 20]], vary(apron, x + z * 7), { zBias: 9000 });
  }
}

const CONCRETE = hex("#b4b0a4"), CONCRETE2 = hex("#969287"), STEEL = hex("#3c4046"), ROOF = hex("#b3bcbd");

/**
 * The platform in short tiles. A long box would be one huge face whose centre can fall behind the camera, and the painter
 * would then draw it over everything; tiles sort properly, and their bias keeps them under whoever stands on them.
 */
function platform(out: Tri[], z0: number, z1: number, top: RGB, side: RGB, edge?: RGB) {
  const w = 3.25, y = PLATFORM_Y, zBias = 4;
  for (let z = z0; z < z1; z += 6) {
    const e = Math.min(z1, z + 6);
    const c = vary(top, Math.round(z), 0.03);
    poly(out, [[-w, y, z], [w, y, z], [w, y, e], [-w, y, e]], c, { zBias });
    poly(out, [[-w, 0, z], [-w, y, z], [-w, y, e], [-w, 0, e]], side, { zBias });
    poly(out, [[w, 0, z], [w, y, z], [w, y, e], [w, 0, e]], side, { zBias });
    if (edge) poly(out, [[-w + 0.05, y + 0.004, z], [-w + 0.42, y + 0.004, z], [-w + 0.42, y + 0.004, e], [-w + 0.05, y + 0.004, e]], edge, { zBias: zBias - 0.5 });
  }
  poly(out, [[-w, 0, z1], [w, 0, z1], [w, y, z1], [-w, y, z1]], side, { zBias });
}

function rails(out: Tri[], z0: number, z1: number, color: RGB) {
  for (let z = z0; z < z1; z += 12) for (const x of [-5.4, -3.9]) box(out, { pos: [x, 0.04, z + 6], size: [0.14, 0.16, 12] }, { color, zBias: 3 });
}
const grey = (c: RGB, ash: number) => mixRGB(c, hex("#7b7970"), ash * 0.82);

function trees(out: Tri[], ash: number, burn: number) {
  const r = rng(37);
  for (let i = 0; i < 70; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (15 + r() * 170), z = -10 + r() * 240, s = 6 + r() * 7, y = groundHeight(x, z) - 0.2;
    tree(out, { pos: [x, y, z], size: s, yaw: i, pitch: burn * (1.2 + (i % 3) * 0.1) }, grey(mixRGB(hex("#35703a"), hex("#4c4436"), burn * 0.85), ash));
  }
}

/** The platform and everything that stands on it. `w` is how far the blast has taken it. */
function station(out: Tri[], t: number, w: number, ash: number) {
  const since = Math.max(0, t - STATION_HIT);
  const fall = 1 - w * 0.9;
  // The platform, track bed and rails. All of it runs on into the tunnel.
  platform(out, 0, CANOPY.to + 14, grey(CONCRETE, ash), grey(CONCRETE2, ash), grey(hex("#d9c13a"), ash));
  rails(out, -10, 200, grey(hex("#5c5a57"), ash));
  for (let z = -60; z < 180; z += 2.6) box(out, { pos: [-4.65, 0.02, z], size: [2.4, 0.1, 0.34] }, { color: grey(hex("#4d4238"), ash), zBias: 8 });

  // The canopy: posts, and a roof in panels, which the blast strips off one by one.
  const panels = 14, step = (CANOPY.to - CANOPY.from) / panels;
  for (let i = 0; i < panels; i++) {
    const z = CANOPY.from + i * step;
    const r = rng(i * 19 + 2);
    const a = r(), b = r(), c = r();
    if (i % 2 === 0) {
      const tip = w * (0.8 + a * 0.5);
      limb(out, [1.6, PLATFORM_Y, z], [1.6 - Math.sin(tip) * 3.6, PLATFORM_Y + Math.cos(tip) * 3.6, z - Math.sin(tip) * 2], 0.12, 0.1, grey(STEEL, ash), 4);
    }
    const fly = since * (10 + b * 12);
    if (since > 0 && ash <= 0) {
      if (fly < 200) box(out, { pos: [2 - fly * 0.18 + c * 3, PLATFORM_Y + 3.5 + fly * (0.12 + c * 0.2), z - fly], yaw: since * (1 + a), pitch: since * (2 + b * 3), roll: since * c * 3, size: [5.4, 0.12, step] }, { color: ROOF });
    } else if (since <= 0) {
      box(out, { pos: [0.8, PLATFORM_Y + 3.5, z + step / 2], size: [5.4, 0.14, step], roll: 0.04 }, { color: i % 2 ? ROOF : mixRGB(ROOF, [0, 0, 0], 0.1), glow: 0.3 });
    } else if (i % 3 === 0) {
      // What's left of it, a week and more on.
      box(out, { pos: [-2 + a * 4, PLATFORM_Y + 0.06, z], yaw: b * 3, roll: 0.14 * (c - 0.5), pitch: 0.12 * (a - 0.5), size: [4.2, 0.1, step * 0.9] }, { color: grey(ROOF, ash) });
    }
  }

  // The small ticket hall at the far end of the platform, then benches and lamps.
  const hallZ = CANOPY.to + 7;
  box(out, { pos: [1, PLATFORM_Y, hallZ], size: [7, 3.8 * fall + 0.2, 10] }, (f) => ({ color: grey(f === 0 ? hex("#6c5a4a") : hex("#c9b89a"), ash) }));
  // Catenary poles along the track, which whip past the side-on camera.
  if (ash <= 0) {
    for (let z = -6; z < 190; z += 11) limb(out, [-6.5, 0, z], [-6.5 + w * 2, 7 * fall + 0.3, z - w * 5], 0.1, 0.08, STEEL, 4);
  }
  // The canopy's shadow, and the light that gets in under it.
  if (w <= 0) boxShadow(out, -1.9, 3.5, CANOPY.from, CANOPY.to, 0.5, MORNING_SUN, PLATFORM_Y + 0.006, 0.3, 3.4);
  for (let z = 16; z < 58; z += 13) {
    box(out, { pos: [1.9, PLATFORM_Y + 0.42, z], size: [0.5, 0.08, 2.1], yaw: w * (z * 0.7), roll: w * 0.3 }, { color: grey(hex("#7c5a3a"), ash) });
    for (const dz of [-0.8, 0.8]) box(out, { pos: [1.9, PLATFORM_Y, z + dz], size: [0.1, 0.44 * fall, 0.1] }, { color: grey(STEEL, ash) });
  }
}

/** The stone face of the hill round the tunnel's mouth, and its black opening. */
function portal(out: Tri[], ash: number) {
  const C = grey(hex("#8f8a7e"), ash), C2 = grey(hex("#797468"), ash), D = hex("#040506");
  const w = OPEN_W, h = OPEN_H, cx = -1;
  const FACE = 0;
  // Opening: pointed by a low arch over straight sides.
  const arch: V3[] = [[cx - w, 0, FACE + 0.04], [cx + w, 0, FACE + 0.04], [cx + w, h * 0.72, FACE + 0.04], [cx + w * 0.62, h * 0.94, FACE + 0.04], [cx, h, FACE + 0.04], [cx - w * 0.62, h * 0.94, FACE + 0.04], [cx - w, h * 0.72, FACE + 0.04]];
  poly(out, arch, D, { zBias: 0.5 });
  // The surround, wider and up the hill.
  const W = w + 5, H = h + 5;
  const panel = (a: V3, b: V3, c: V3, d: V3, col: RGB) => poly(out, [a, b, c, d], col, { zBias: 1 });
  panel([cx - W, 0, FACE], [cx - w, 0, FACE], [cx - w, H, FACE], [cx - W, H, FACE], C);
  panel([cx + w, 0, FACE], [cx + W, 0, FACE], [cx + W, H, FACE], [cx + w, H, FACE], C);
  panel([cx - w, h * 0.72, FACE], [cx - w * 0.62, h * 0.94, FACE], [cx - w * 0.62, H, FACE], [cx - w, H, FACE], C2);
  panel([cx - w * 0.62, h * 0.94, FACE], [cx, h, FACE], [cx, H, FACE], [cx - w * 0.62, H, FACE], C);
  panel([cx, h, FACE], [cx + w * 0.62, h * 0.94, FACE], [cx + w * 0.62, H, FACE], [cx, H, FACE], C2);
  panel([cx + w * 0.62, h * 0.94, FACE], [cx + w, h * 0.72, FACE], [cx + w, H, FACE], [cx + w * 0.62, H, FACE], C);
}

function hangingClock(out: Tri[], t: number, w: number) {
  if (w > 0.02) return;
  box(out, { pos: [CLOCK_AT[0], CLOCK_AT[1] + 0.6, CLOCK_AT[2]], size: [0.1, PLATFORM_Y + 3.5 - CLOCK_AT[1] - 0.6, 0.1] }, { color: STEEL });
  const m = stationMinutes(t);
  clockFace(out, [CLOCK_AT[0], CLOCK_AT[1], CLOCK_AT[2] - 0.08], Math.PI, 0.72, 9, m, { glow: 0.75, lift: 0.3 });
  clockFace(out, [CLOCK_AT[0], CLOCK_AT[1], CLOCK_AT[2] + 0.08], 0, 0.72, 9, m, { glow: 0.75, lift: 0.3 });
}

/** The wall of dust: a front of huge puffs, rolling down the line at the station. */
function dustWall(out: Tri[], dist: number, t: number) {
  if (dist > 1500) return;
  const near = 1 - Math.min(1, dist / 400);
  for (let i = 0; i < 210; i++) {
    const r = rng(i * 41 + 3);
    const a = r(), b = r(), c = r(), e = r();
    const x = -540 + a * 1080;
    const size = (26 + c * 36) * (0.7 + 0.3 * near);
    const y = b ** 1.4 * (130 + 40 * near);
    const z = dist + (e - 0.5) * 34 + Math.sin(a * 40) * 18 + y * 0.32;
    octa(out, { pos: [x + (e - 0.5) * 20, y + size * 0.3, z], yaw: i + t * (0.4 + c), pitch: i * 0.7 + t * 0.2, size: [size, size * 0.86, size] }, { color: mixRGB(hex("#c3a884"), hex("#7c6348"), b * 0.7 + c * 0.3), glow: 0.5, zBias: -1 });
  }
}

/** How far the front is from the station, as a function of time. */
export const dustFront = (t: number) => {
  const k = smooth(46.4, STATION_HIT, t);
  return 1400 * (1 - k ** 1.45) - 2;
};

// ── The light ────────────────────────────────────────────────────────────────────────────────────────

const MORNING: Env = {
  skyTop: hex("#4f93c9"),
  skyBottom: hex("#f8e2b8"),
  fog: hex("#ecdcbc"),
  fogNear: 120,
  fogFar: 1150,
  sun: MORNING_SUN,
  sunColor: [255, 216, 160],
  ambient: [108, 116, 136],
};
const AFTER_FLASH: Env = {
  skyTop: hex("#4a2d21"),
  skyBottom: hex("#ff9f55"),
  fog: hex("#ffb26f"),
  fogNear: 500,
  fogFar: 2300,
  sun: norm([0.14, 0.42, 0.9]),
  sunColor: [255, 174, 112],
  ambient: [205, 158, 128],
};
const GREY_SKY: Env = {
  skyTop: hex("#5c5f5e"),
  skyBottom: hex("#b7b6aa"),
  fog: hex("#a9a89c"),
  fogNear: 26,
  fogFar: 330,
  sun: norm([0.2, 0.9, 0.3]),
  sunColor: [122, 122, 112],
  ambient: [132, 132, 124],
};

// ── The family ───────────────────────────────────────────────────────────────────────────────────────

/** Along the platform towards the tunnel, then the long stop for the call, then the run. */
function familyZ(t: number) {
  if (t < 20) return 55 - (t - 14) * 3.4;
  if (t < 47.7) return 34.6;
  return 34.6 - smooth(47.7, 54.9, t) ** 1.12 * 62;
}

function family(out: Tri[], t: number, lod = 2) {
  const z = familyZ(t);
  const running = t < 20 || (t > 47.7 && t < 55);
  const phase = t * 11;
  const py = PLATFORM_Y;
  const parentX = -0.05, childX = 0.56;
  // Hand in hand: the parent's hand reaches for the child's, in body space. Yaw π faces the tunnel.
  const holdP: V3 = [-(childX - parentX) * 0.5, 0.92, 0.14];
  const holdC: V3 = [(childX - parentX) * 0.44, 0.72, 0.14];
  const shadowSun = t < FLASH ? MORNING_SUN : norm([0.1, 0.36, 0.92]);
  personShadow(out, parentX, py + 0.008, z, STATION_PARENT.height, shadowSun, 0.42, 3);
  personShadow(out, childX, py + 0.008, z, CHILD.height, shadowSun, 0.42, 3);
  person(out, STATION_PARENT, { pos: [parentX, py, z], yaw: Math.PI, walk: running ? 1 : 0, phase, lean: running ? 0.15 : 0, lod, handR: t < 20 || t > 47.7 ? holdP : undefined, headYaw: t < 47 ? 0 : t < 47.7 ? Math.PI - 0.2 : 0 });
  const onCall = t >= 20 && t < 25;
  person(out, CHILD, {
    pos: [childX, py, z + (running ? 0.15 : 0)],
    yaw: t >= 20 && t < 47.7 ? Math.PI + 0.45 : Math.PI,
    walk: running ? 1 : 0,
    phase: phase + 1.2,
    lean: running ? 0.1 : 0,
    lod,
    handL: t < 20 || t > 47.7 ? holdC : undefined,
    handR: t >= 20 && t < 47.7 ? [0.12, 1.14, 0.03] : undefined,
    headYaw: t >= 47 && t < 47.7 ? Math.PI - 0.5 : 0,
    headPitch: onCall ? 0.1 : 0,
  });
  return { z };
}

/** The others on the platform: hurrying before the flash, frozen after it, then gone. */
function others(out: Tri[], t: number, w: number, farSideOnly = false) {
  if (w > 0.1) return;
  const r = rng(90);
  // The family have to be the ones we follow, so nobody else is near them.
  for (let i = 0; i < 16; i++) {
    const x = (i % 2 ? -1.9 : 1.9) + (r() - 0.5) * 1.4, z0 = 4 + r() * 56, sp = 1.8 + r() * 1.8;
    if (farSideOnly && x > -0.5) continue;
    const before = t < FLASH;
    const z = before ? (((z0 - sp * (t - 14)) % 60) + 60) % 60 + 2 : z0;
    // After the flash they stand and stare, a hand up against the light, then break for the tunnel.
    const stare = t >= 46 && t < 47.8 + i * 0.05;
    const run = t >= 47.8 + i * 0.05;
    const dz = run ? (t - (47.8 + i * 0.05)) * (4 + sp) : 0;
    if (z - dz < -3) continue;
    const look = stranger(i + 40);
    const pose: Pose = { pos: [x, PLATFORM_Y, z - dz], yaw: before || run ? Math.PI : 0, walk: before || run ? 1 : 0, phase: t * 8 + i, lean: run ? 0.14 : 0, lod: 0, handR: stare ? [0.1, 1.5, 0.2] : undefined };
    person(out, look, pose);
  }
}

// ── The shots ────────────────────────────────────────────────────────────────────────────────────────

function outdoor(t: number, opts: { cloud?: boolean; dust?: number } = {}): { tris: Tri[]; glows: Glow[]; lights: PointLight[] } {
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  const w = wreckAt(t), ash = ashAt(t);
  outside(tris, t, ash);
  trees(tris, ash, w);
  station(tris, t, w, ash);
  portal(tris, ash);
  hangingClock(tris, t, w);
  if (opts.cloud) mushroom(tris, glows, lights, CLOUD_AT, KM, cloudAge(t), 1);
  if (opts.dust !== undefined) dustWall(tris, opts.dust, t);
  return { tris, glows, lights };
}

/** Shot 3 in three angles: side on with the poles whipping past, from the front, then from behind with the tunnel ahead. */
function stationCamera(t: number, z: number): Camera {
  if (t < 15.8) return { pos: [-8.2, 1.65, z + 0.5], target: [0.2, PLATFORM_Y + 0.85, z + 0.1], fov: 44 };
  if (t < 17.6) return { pos: [0.6, PLATFORM_Y + 0.95, z - 3.9], target: [0.2, PLATFORM_Y + 1.1, z + 9], fov: 50 };
  const k = t - 17.6;
  return { pos: [0.3, PLATFORM_Y + 1.75, z + 6 - k * 0.8], target: [0.25, PLATFORM_Y + 0.9, z - 24], fov: 56 };
}

/** Shot 3: running for the tunnel, the mouth ahead of them. */
export function stationFrame(t: number): { frame: Frame; fx: Fx } {
  const z = familyZ(t);
  const camera = stationCamera(t, z);
  const scene = outdoor(t);
  family(scene.tris, t, 2);
  others(scene.tris, t, 0);
  return { frame: { tris: scene.tris, camera: shake(camera, t, 0.03), env: MORNING }, fx: NO_FX };
}

/** Shot 4: the child stops to answer. The phone's at their ear; the line is breaking up. */
export function callFrame(t: number): { frame: Frame; fx: Fx } {
  const z = familyZ(t);
  const k = smooth(20, 25, t);
  const camera: Camera = { pos: [1.85 - 0.25 * k, PLATFORM_Y + 1.02, z - 1.75 + 0.4 * k], target: [0.56, PLATFORM_Y + 1.02, z + 0.1], fov: 42 };
  const scene = outdoor(t);
  family(scene.tris, t, 2);
  others(scene.tris, t, 0, true);
  // The phone in the child's hand, the screen lit.
  phone(scene.tris, [0.4, PLATFORM_Y + 1.14, z + 0.02], Math.PI + 1.5, hex("#6fd7a1"), t < 23.8 ? 0.9 : 0.25, 0, 0, -0.02);
  return { frame: { tris: scene.tris, camera: shake(camera, t, 0.012), env: MORNING }, fx: NO_FX };
}

/** Shot 8: the white clears. The clock says 9:14. Far up the line the cloud is already enormous, and the dust is coming. */
export function lightFrame(t: number): { frame: Frame; fx: Fx } {
  const env = t < 46.9 ? { ...AFTER_FLASH, skyBottom: mixRGB(hex("#ffffff"), AFTER_FLASH.skyBottom, smooth(46, 46.9, t)) } : AFTER_FLASH;
  if (t < 47.1) {
    const camera: Camera = { pos: [0.05, CLOCK_AT[1] - 0.05, CLOCK_AT[2] - 3.5], target: [0, CLOCK_AT[1], CLOCK_AT[2]], fov: 42 };
    const scene = outdoor(t);
    return { frame: { tris: scene.tris, camera, env }, fx: { ...NO_FX, white: 1 - smooth(46, 46.7, t) } };
  }
  const k = smooth(47.1, 51, t);
  const z = familyZ(t);
  // Down on the track, the tunnel behind the camera: the family stand frozen, the cloud above the canopy behind them.
  // Then close and in front of them as they run, the wall of dust filling the frame behind.
  const camera: Camera = t < 49.4
    ? { pos: [-4.6, 2, 2.2 + k * 0.6], target: [40 + k * 6, 20 + k * 2, 230], fov: 64 }
    : { pos: [0.7, PLATFORM_Y + 0.72, z - 3.5], target: [0.35, PLATFORM_Y + 3.6, z + 22], fov: 62 };
  const scene = outdoor(t, { cloud: true, dust: dustFront(t) });
  family(scene.tris, t, 2);
  if (t < 49.4) others(scene.tris, t, 0);
  return { frame: { tris: scene.tris, camera: shake(camera, t, t < 49.4 ? 0.02 : 0.05), env, glowsFront: scene.glows, lights: scene.lights }, fx: NO_FX };
}

// ── The tunnel ───────────────────────────────────────────────────────────────────────────────────────

const STEP = 7;
const ARCH: [number, number][] = [[-9, 0], [-9, 5.4], [-5.6, 7.1], [-1, 7.5], [3.6, 7.1], [7, 5.4], [7, 0]];
let tunnelCache: Tri[] | null = null;
function tunnelWalls(): Tri[] {
  if (tunnelCache) return tunnelCache;
  const out: Tri[] = [];
  const C = hex("#55554f"), C2 = hex("#47473f"), F = hex("#3a3833");
  for (let z = 0; z > -210; z -= STEP) {
    const z1 = z - STEP;
    for (let i = 0; i < ARCH.length - 1; i++) {
      const [x0, y0] = ARCH[i], [x1, y1] = ARCH[i + 1];
      const col = vary((i + Math.floor(z / STEP)) % 2 ? C : C2, i * 7 - z, 0.05);
      out.push({ a: [x0, y0, z], b: [x1, y1, z], c: [x1, y1, z1], color: col, zBias: 4 }, { a: [x0, y0, z], b: [x1, y1, z1], c: [x0, y0, z1], color: col, zBias: 4 });
    }
    out.push({ a: [-9, 0, z], b: [7, 0, z], c: [7, 0, z1], color: F, zBias: 40 }, { a: [-9, 0, z], b: [7, 0, z1], c: [-9, 0, z1], color: F, zBias: 40 });
  }
  // The platform carries on inside, and so do the rails.
  platform(out, -210, 0, hex("#6e6b63"), hex("#5a5850"));
  rails(out, -210, 0, hex("#34332f"));
  tunnelCache = out;
  return out;
}

/** The emergency lamps along the wall, and the dim light they give. */
function lamps(out: Tri[], glows: Glow[], lights: PointLight[], level: number) {
  for (let z = -7; z > -170; z -= 21) {
    const p: V3 = [6.8, 4.6, z];
    box(out, { pos: [6.72, 4.45, z], size: [0.16, 0.3, 0.7] }, { color: hex("#ffb24d"), glow: level, zBias: -1 });
    glows.push({ p, radius: 3, color: [255, 160, 70], alpha: 0.45 * level });
    if (z > -80) lights.push({ p, color: [255, 150, 74], intensity: 1.6 * level, range: 20 });
  }
}

/** The ash pile in the tunnel's mouth, growing with `h`. */
function ashPile(out: Tri[], h: number) {
  if (h <= 0) return;
  const G = hex("#a9a79c");
  const nx = 16, nz = 10, x0 = -9, dx = 16 / nx, dz = 2.4;
  const H = (i: number, j: number) => {
    const z = -j * dz;
    return h * Math.max(0, 1 - j / nz) ** 1.4 * (0.72 + 0.46 * hash2(i, j, 7)) + 0.02;
  };
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a: V3 = [x0 + i * dx, H(i, j), -j * dz], b: V3 = [x0 + (i + 1) * dx, H(i + 1, j), -j * dz];
      const c: V3 = [x0 + (i + 1) * dx, H(i + 1, j + 1), -(j + 1) * dz], d: V3 = [x0 + i * dx, H(i, j + 1), -(j + 1) * dz];
      const col = vary(G, i * 5 + j * 13, 0.07);
      out.push({ a, b, c, color: col, zBias: 2 }, { a, b: c, c: d, color: col, zBias: 2 });
    }
}

const FAR_LIGHT = hex("#aeb896");

/** The world past the mouth, which from inside is just light. */
function daylight(out: Tri[], glows: Glow[], color: RGB, strength: number) {
  poly(out, [[-9, 0, 0.3], [7, 0, 0.3], [7, 5.4, 0.3], [3.6, 7.1, 0.3], [-1, 7.5, 0.3], [-5.6, 7.1, 0.3], [-9, 5.4, 0.3]], color, { glow: 1, zBias: 6 });
  glows.push({ p: [-1, 3.6, -2], radius: 16, color, alpha: 0.3 * strength });
}

const MOUTH_SUN = norm([0.03, 0.16, 1]);

/** The light coming in at the mouth: pale sheets standing in the dust, fading as they reach into the tunnel. */
function lightShafts(out: Tri[], t: number, color: RGB, strength: number) {
  const r = rng(404);
  for (let i = 0; i < 14; i++) {
    const x = -8 + r() * 14, w = 0.4 + r() * 1.4, len = 16 + r() * 22, top = 3.5 + r() * 3.6;
    const a = (0.04 + 0.03 * r()) * (0.75 + 0.25 * Math.sin(t * 0.7 + i)) * strength;
    out.push({ a: [x - w, top, -0.6], b: [x + w, top, -0.6], c: [x + w * 0.4, 0.1, -len], color, glow: 1, alpha: a, zBias: -0.4 });
  }
}

/** Everyone in the tunnel throws a long shadow back towards the camera. */
function mouthShadow(out: Tri[], x: number, y: number, z: number, h: number) {
  personShadow(out, x, y + 0.008, z, h, MOUTH_SUN, 0.62, 3);
}

/** The light from the mouth, on the floor and on anyone facing it. */
const mouthLight = (level = 1): PointLight => ({ p: [-1, 3.4, -1], color: [216, 212, 160], intensity: 1.5 * level, range: 62 });

const DARK_ENV = (fog: RGB): Env => ({ skyTop: hex("#000000"), skyBottom: hex("#000000"), fog, fogNear: 12, fogFar: 150, sun: norm([0, 1, 0.1]), sunColor: [18, 18, 16], ambient: [46, 46, 46] });

/** People who got in, sitting along the wall. */
function survivors(out: Tri[], t: number, dark: number) {
  const r = rng(303);
  for (let i = 0; i < 18; i++) {
    // Along the far wall, on the track bed.
    const side = true, z = -13 - r() * 55, seat = r(), x = 5.6 + seat * 0.9;
    const y = 0;
    const breathe = Math.sin(t * 1.1 + i) * 0.006;
    person(out, inDark(stranger(i + 70), dark), { pos: [x, y, z], yaw: side ? -Math.PI / 2 : Math.PI / 2, drop: 0.46 + breathe, lod: 0, lean: 0.14, headPitch: 0.5 });
  }
}

/** Shot 9: inside the tunnel looking back out as they run for it, then the clock, then the blast comes in after them. */
export function waveFrame(t: number): { frame: Frame; fx: Fx } {
  if (t >= 53.45 && t < 54.25) {
    // The hand reaches 9:17, and the clock goes.
    const camera: Camera = { pos: [0.05, CLOCK_AT[1] - 0.04, CLOCK_AT[2] - 3.5], target: [0, CLOCK_AT[1], CLOCK_AT[2]], fov: 42 };
    const scene = outdoor(t, { cloud: true, dust: t < STATION_HIT ? 130 : 40 });
    if (wreckAt(t) > 0.02) clockFace(scene.tris, [CLOCK_AT[0] + (t - STATION_HIT) * 2, CLOCK_AT[1] + (t - STATION_HIT) * 0.9, CLOCK_AT[2] - 0.08 - (t - STATION_HIT) * 6], Math.PI, 0.72, 9, 17, { broken: true, glow: 0.75, lift: 0.3 }, (t - STATION_HIT) * 4, (t - STATION_HIT) * 3);
    return { frame: { tris: scene.tris, camera: shake(camera, t, 0.012 + 0.22 * wreckAt(t)), env: AFTER_FLASH, glowsFront: scene.glows, lights: scene.lights }, fx: NO_FX };
  }
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  const w = wreckAt(t);
  const camera: Camera = { pos: [-1.6, PLATFORM_Y + 0.85, -17.5], target: [-0.3, PLATFORM_Y + 2, 40], fov: 56 };
  const dust = dustFront(t);
  // The world outside, through the arch.
  outside(tris, t, 0, true);
  trees(tris, 0, w);
  station(tris, t, w, 0);
  hangingClock(tris, t, w);
  mushroom(tris, glows, lights, CLOUD_AT, KM, cloudAge(t), 1);
  dustWall(tris, dust, t);
  // Then the tunnel over it, its walls in front of everything but the arch.
  for (const x of tunnelWalls()) tris.push(x);
  lamps(tris, glows, lights, 0.9);
  family(tris, t, 2);
  others(tris, t, 0);
  // The mouth lights the tunnel near it, orange.
  lights.push({ p: [-1, 4, -1], color: [255, 160, 96], intensity: 1.5, range: 34 });
  const env: Env = { ...AFTER_FLASH, fogNear: 500, fogFar: 2300, sunColor: [150, 110, 80], ambient: [92, 72, 62] };
  // After the hit: dust and debris coming down the tunnel at the camera.
  const since = t - STATION_HIT;
  if (since > 0) {
    const r = rng(6);
    for (let i = 0; i < 90; i++) {
      const a = r(), b = r(), c = r();
      const z = 2 - since * (42 + c * 34);
      const s = 1.2 + c * 1.9 + since;
      octa(tris, { pos: [-8 + a * 14, b * 7, z + c * 6], yaw: i + since * 3, pitch: i * 1.3, size: s }, { color: mixRGB(hex("#a78e70"), hex("#6d5843"), a), zBias: -3 });
      if (i % 3 === 0) tetra(tris, { pos: [-8 + b * 14, c * 7, z - 6 * a], yaw: since * 7 + i, pitch: since * 9, size: 0.3 + a * 0.5 }, { color: hex("#3c3a37") });
    }
  }
  const dustFx = smooth(STATION_HIT + 0.2, SLAM - 0.04, t);
  return { frame: { tris, camera: shake(camera, t, since > 0 ? 0.3 : 0.018), env, glowsFront: glows, lights }, fx: { ...NO_FX, dust: dustFx } };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const FAMILY_Z = -30;

/** Where the family's stopped, inside the tunnel. */
function huddle(out: Tri[], t: number, dark: number, opts: { hold?: number; stepOut?: number; sit?: number; phoneArm?: boolean; childDark?: number } = {}) {
  const hold = opts.hold ?? 1, step = opts.stepOut ?? 0, sit = opts.sit ?? 0;
  const childZ = FAMILY_Z + 0.65 + step * 1.05;
  const parent = inDark(STATION_PARENT, dark), child = { ...inDark(CHILD, opts.childDark ?? dark), hair: mixRGB(CHILD.hair, [90, 96, 110], opts.phoneArm ? 0.45 : 0) };
  const drop = sit * 0.46;
  mouthShadow(out, -0.25, PLATFORM_Y, FAMILY_Z, parent.height - drop);
  mouthShadow(out, 0.3, PLATFORM_Y, childZ, child.height - drop);
  person(out, parent, { pos: [-0.25, PLATFORM_Y, FAMILY_Z], yaw: 0.1, drop, lean: 0.1 * sit, lod: 2, handL: [0.42, 0.9 + (1 - hold) * 0.3 - drop, 0.55 + step * 0.7], headPitch: 0.1 });
  person(out, child, { pos: [0.3, PLATFORM_Y, childZ], yaw: 0, walk: step > 0 && step < 1 ? 1 : 0, phase: t * 6, drop, lean: 0.06, lod: 2, handR: opts.phoneArm ? [0.05, 0.41, 0.24] : undefined, handL: opts.phoneArm ? [-0.05, 0.41, 0.24] : undefined, headPitch: opts.phoneArm ? 0.5 : -0.04 });
}

/** Shot 11: ash on the air in the mouth. A stranger walks out into it; the parent holds the child back. */
export function tunnelFrame(t: number): { frame: Frame; fx: Fx } {
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  const k = smooth(65, 72, t);
  // Three angles. Behind the two of them, the mouth beyond; side on and low as the child steps out and the arm comes
  // across; then from the mouth itself, looking back into the dark as the stranger comes towards us and past.
  const camera: Camera = t < 67.2
    ? { pos: [lerp(0.5, 0.4, k), PLATFORM_Y + 1.3, lerp(FAMILY_Z - 3.9, FAMILY_Z - 2.9, k)], target: [-0.25, PLATFORM_Y + 1.5, 4], fov: 46 }
    : t < 69.4
      ? { pos: [5.9, PLATFORM_Y + 0.5, FAMILY_Z + 1], target: [0, PLATFORM_Y + 1.05, FAMILY_Z + 1], fov: 44 }
      : { pos: [-3.6, PLATFORM_Y + 1.1, -1.4], target: [-1.5, PLATFORM_Y + 1.3, FAMILY_Z], fov: 42 };
  for (const x of tunnelWalls()) tris.push(x);
  lamps(tris, glows, lights, 0.9);
  lights.push(mouthLight());
  daylight(tris, glows, FAR_LIGHT, 1);
  lightShafts(tris, t, FAR_LIGHT, 1);
  ashPile(tris, 0.25 + k * 0.5);
  // Those by the far wall would stand right in front of the side-on camera.
  if (t < 67.2 || t >= 69.4) survivors(tris, t, 0.45);
  else lights.push({ p: [3.4, PLATFORM_Y + 2.4, FAMILY_Z + 1.6], color: [214, 196, 150], intensity: 1.7, range: 9 });
  // The stranger walks from beside them out towards the light, and is gone in it.
  const s = smooth(66.2, 72.3, t);
  if (s < 1) {
    const z = lerp(FAMILY_Z + 2.4, -1, s);
    const look = inDark({ ...stranger(82), top: hex("#59625c"), bottom: hex("#2e3236") }, 0.5);
    mouthShadow(tris, -1.9, PLATFORM_Y, z, look.height);
    person(tris, look, { pos: [-1.9, PLATFORM_Y, z], yaw: 0, walk: 1, phase: t * 6.5, lod: 1, lean: 0.07 });
  }
  // The child takes a step after them, and the parent's arm comes across.
  const step = smooth(66.9, 67.8, t) * (1 - 0.65 * smooth(68, 69.4, t));
  huddle(tris, t, 0.45, { hold: 1 - 0.4 * step, stepOut: step });
  ashfall(tris, { ...camera, pos: [-1, 4, -4] }, t, 1, { n: 230, reach: 12, speed: 0.7, size: 0.05, lens: camera.pos });
  return { frame: { tris, camera, env: DARK_ENV(hex("#242620")), glowsFront: glows, lights }, fx: NO_FX };
}

/** Shot 12's tunnel half: the same view, as the ash climbs in the mouth and the lamps run down. */
export function lapseTunnelFrame(t: number): { frame: Frame; fx: Fx } {
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  const later = smooth(74, 76.5, t);
  const camera: Camera = { pos: [0.3, PLATFORM_Y + 1.5, FAMILY_Z - 4.2 + later], target: [-0.15, PLATFORM_Y + 1.1, 2], fov: 46 };
  for (const x of tunnelWalls()) tris.push(x);
  lamps(tris, glows, lights, lerp(0.85, 0.32, later));
  lights.push(mouthLight(1 - later * 0.5));
  daylight(tris, glows, mixRGB(FAR_LIGHT, hex("#9c9c90"), later), 1 - later * 0.6);
  lightShafts(tris, t * 3, mixRGB(FAR_LIGHT, hex("#9c9c90"), later), 1 - later * 0.6);
  ashPile(tris, lerp(1.1, 3.3, later));
  survivors(tris, t, 0.5);
  huddle(tris, t, 0.55, { sit: 1 });
  ashfall(tris, { ...camera, pos: [-1, 4, -4] }, t * 5, 1 - later * 0.8, { n: 240, reach: 12, speed: 0.7, size: 0.05, lens: camera.pos });
  return { frame: { tris, camera, env: DARK_ENV(hex("#242620")), glowsFront: glows, lights }, fx: NO_FX };
}

const PHONE_ENV: Env = { skyTop: hex("#000000"), skyBottom: hex("#000000"), fog: hex("#000000"), fogNear: 40, fogFar: 80, sun: norm([0, 0.3, 1]), sunColor: [34, 34, 36], ambient: [10, 10, 12] };

/** Shot 13: the phone, at 1%. Then over the child's shoulder, the screen the only light there is, until it goes out. */
export function voicemailFrame(t: number): { frame: Frame; fx: Fx } {
  if (t < 79.6) {
    const tris: Tri[] = [];
    const glows: Glow[] = [];
    const s = phone(tris, [0, 0, 0], 0, hex("#1a3a5c"), 1, 0, 0, 0);
    glows.push({ p: [0, 0, 0.03], radius: 0.25, color: [90, 150, 220], alpha: 0.18 });
    const camera: Camera = { pos: [0, 0, 0.31 - smooth(78, 79.6, t) * 0.01], target: [0, 0, 0], fov: 45 };
    return { frame: { tris, camera, env: PHONE_ENV, glowsFront: glows }, fx: { ...NO_FX, screen: { tl: s.tl, br: s.br } } };
  }
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const lights: PointLight[] = [];
  const k = smooth(79.6, 84, t);
  const dying = 1 - smooth(PHONE_DIES - 0.03, PHONE_DIES + 0.03, t);
  const flicker = dying * (1 - 0.18 * smooth(82.7, PHONE_DIES, t) * (Math.sin(t * 61) > 0.2 ? 1 : 0));
  const head: V3 = [0.3, PLATFORM_Y + 0.72, FAMILY_Z + 0.65];
  const screenAt: V3 = [0.3, PLATFORM_Y + 0.46, FAMILY_Z + 0.65 + 0.27];
  // A slow push in over the shoulder, from behind the head.
  const camera: Camera = { pos: [head[0] + lerp(0.56, 0.48, k), head[1] + 0.34, head[2] - lerp(0.68, 0.52, k)], target: [screenAt[0] - 0.08, screenAt[1] + 0.1, screenAt[2]], fov: 42 };
  for (const x of tunnelWalls()) tris.push(x);
  lamps(tris, glows, lights, 0.14);
  huddle(tris, t, 0.9, { sit: 1, phoneArm: true, childDark: lerp(0.94, 0.55, flicker) });
  // Tipped up towards the child, and so towards the camera behind them.
  phone(tris, screenAt, Math.PI, hex("#5c93cf"), flicker, -0.55, 0, -0.03);
  if (flicker > 0.01) {
    const p: V3 = [screenAt[0], screenAt[1] + 0.05, screenAt[2] - 0.06];
    lights.push({ p, color: [150, 195, 255], intensity: 1.4 * flicker, range: 1.6 });
    glows.push({ p, radius: 0.3, color: [110, 165, 240], alpha: 0.3 * flicker });
  }
  return { frame: { tris, camera, env: { ...DARK_ENV(hex("#050605")), ambient: [16, 16, 16] }, glowsFront: glows, lights }, fx: NO_FX };
}

/** Shot 14: out of the tunnel. The station is under ash, the clock on the ground, still at 9:17. The child looks up. */
export function outFrame(t: number): { frame: Frame; fx: Fx } {
  const k = smooth(84.6, 90, t);
  // From inside the mouth, looking out. The camera comes out under the arch and rises, and they get small under the sky.
  const camera: Camera = { pos: [lerp(-1.3, -1.9, k), lerp(2.0, 5.3, k), lerp(-7.5, -3, k)], target: [lerp(-0.7, 0, k), lerp(2.3, 5.2, k), lerp(16, 60, k)], fov: 58 };
  const tris: Tri[] = [];
  const w = 1, ash = 1;
  outside(tris, t, ash, true);
  trees(tris, ash, w);
  station(tris, t, w, ash);
  for (const x of tunnelWalls()) tris.push(x);
  // The fallen clock, cracked and stopped, tipped over in the ash and facing back at the tunnel.
  clockFace(tris, [1.5, PLATFORM_Y + 0.42, 5.2], Math.PI * 1.03, 0.85, 9, stationMinutes(t), { broken: true, rim: hex("#3a3a38"), dial: hex("#cfccbd"), hands: hex("#1c1c1b"), lift: 0.5 }, -0.95, 0.16);
  // Parent and child, walking out and slowing to a stop.
  const walk = smooth(84, 87.7, t);
  const z = lerp(-4.6, 9.4, walk);
  const walking = t < 87.5;
  person(tris, STATION_PARENT, { pos: [-1.0, PLATFORM_Y, z], yaw: 0.05, walk: walking ? 0.8 : 0, phase: t * 5, lod: 2, handL: [0.42, 0.9, 0.08], headPitch: -0.2 * smooth(87, 88.3, t) });
  person(tris, CHILD, { pos: [-0.3, PLATFORM_Y, z + 0.2], yaw: -0.05, walk: walking ? 0.8 : 0, phase: t * 5 + 1.2, lod: 2, handR: [-0.3, 0.76, 0.08], headPitch: -0.82 * smooth(87.3, 88.7, t) });
  // A few last flakes.
  ashfall(tris, camera, t, 0.32 * (1 - smooth(87.2, 89.5, t)), { n: 340, reach: 22, speed: 0.55, size: 0.055 });
  return { frame: { tris, camera, env: GREY_SKY }, fx: NO_FX };
}
