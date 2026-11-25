// Acts 3, 4 and 5: the hut, the dawn, and the wait. Rounds land in dirt, and nobody in frame is ever hit. The man the 55th holds
// quiet is shown sitting between two others, at a distance, and nothing more: the record says only that they held him.
import { add, hex, norm, smooth, type Camera, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, hash2, house, pulse, rng, shake, shotCamera } from "../../src/kit/lowpoly/world";
import { limb, person } from "../typhoon/models";
import { ALL_ROUND, CALL, CEASE, FIFTEEN, ONE_HOUR, RESUME, RUNNING_OUT } from "./fire";
import { moon, outgoing } from "./ground";
import { BRIDGE, HUTS, district, envAt, riverDist } from "./land";
import { firingNow } from "./mapclock";
import { fidget, gait } from "./motion";
import { VILLAGER, at, beam, blast, corn, muzzle, patch, puff, reeds, rifleman, scene, smokeBank, tracer, type Built } from "./props";
import { fight, lifted } from "./scenes";

const sm = (a: number, b: number, x: number) => smooth(a, b, x);

// ── The hut ───────────────────────────────────────────────────────────────────────────────────────────

const STILTS: V3[] = [[0, 0, 0], [34, 0, -22], [-28, 0, -30], [12, 0, -52]];

function hutsWorld(tris: Tri[], camera: Camera, u: number) {
  patch(tris, 650, -1650, 94, 4, () => hex("#39472f"));
  reeds(tris, camera.pos[0] + 2, camera.pos[2] - 9, 22, u, 6, 240, camera);
  for (const [i, s] of STILTS.entries()) {
    const x = HUTS[0] + s[0], z = HUTS[2] + s[2];
    house(tris, { pos: [x, 1.2, z], yaw: i * 0.7, size: [9, 2.8, 7] }, hex("#6c5a40"), hex("#54503a"));
    for (const dx of [-3.6, 3.6]) for (const dz of [-2.6, 2.6]) limb(tris, [x + dx, 0, z + dz], [x + dx, 1.3, z + dz], 0.08, 0.08, hex("#3b3226"), 3);
  }
}
function windowLight(tris: Tri[], glows: Glow[], lights: PointLight[]) {
  glows.push({ p: [HUTS[0] - 1, 3, HUTS[2] + 3.8], radius: 3.4, color: [255, 205, 130], alpha: 0.85 });
  box(tris, { pos: [HUTS[0] - 1, 2.6, HUTS[2] + 3.7], size: [1.2, 0.9, 0.05] }, { color: hex("#ffd98c"), glow: 1, zBias: -3 });
  lights.push({ p: [HUTS[0] - 1, 3, HUTS[2] + 7], color: [255, 200, 120], intensity: 0.5, range: 16 });
}
const nightAt = (hour: number, near = 44, far = 300) => ({ ...envAt(hour, near, far), sunColor: [96, 112, 152] as RGB, ambient: [84, 98, 134] as RGB });
const WINDOW_CAM = (u: number) => shotCamera([{ from: 0, to: 20, pos: [[668, 1.5, -1608], [648, 1.5, -1642]], target: [[622, 2.1, -1692], [622, 2.3, -1698]], fov: [34, 28], ease: (x) => x }], u);
function thirteen(tris: Tri[], u: number, drop: number, kicks?: (i: number) => number) {
  const r = rng(14);
  const muzzles: V3[] = [];
  for (let i = 0; i < 13; i++) {
    const x = HUTS[0] - 16 + r() * 34, z = HUTS[2] + 16 + r() * 14;
    const f = fidget(u, i + 1);
    muzzles.push(rifleman(tris, [x + f.shift, 0, z], Math.PI + f.yaw, { drop: drop + r() * 0.08, lean: 0.2 + f.lean, kick: kicks?.(i) ?? 0, lod: 0 }));
  }
  return muzzles;
}

/** One lit window, and a very slow push towards it. Almost nothing happens. */
export function windowFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const camera = shake(WINDOW_CAM(u), u * 0.3, 0.008);
  hutsWorld(tris, camera, u);
  windowLight(tris, glowsFront, lights);
  thirteen(tris, u, 0.3 + sm(0, 20, u) * 0.06);
  return scene({ tris, camera, env: nightAt(4.2), glowsFront, lights }, [], { mist: { color: "#30425a", alpha: 0.36 } });
}

/** The explosive is the first frame: no warning, and a hard cut into it. */
export function fifteenFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const camera = shake(WINDOW_CAM(20), u, 0.02 + 0.3 * pulse(u, 0, 0.5));
  hutsWorld(tris, camera, u);
  if (u < FIFTEEN.lightOut) windowLight(tris, glowsFront, lights);
  blast(tris, glowsFront, lights, camera, at(HUTS[0] + 5, HUTS[2] + 12), u, 4, 0.8, hex("#6e6757"));
  const muzzles = thirteen(tris, u, 0.36, (i) => {
    let latest = -9;
    for (const q of FIFTEEN.we) if (q.k % 13 === i && q.t <= u && q.t > latest) latest = q.t;
    return u - latest > 0.25 ? 0 : Math.exp(-(u - latest) * 22);
  });
  outgoing(tris, glowsFront, lights, FIFTEEN.we, u, camera, muzzles, at(HUTS[0], HUTS[2] + 2));
  for (const q of firingNow(FIFTEEN.they, u)) {
    const p: V3 = [HUTS[0] - 5 + hash2(q.k, 1, 3) * 10, 1.7, HUTS[2] + 3.6];
    muzzle(glowsFront, lights, p, 0.9, 16);
    if (q.k % 2 === 0) tracer(tris, p, add(p, [(hash2(q.k, 2, 3) - 0.5) * 34, -0.4, 34]), 0.8, camera, 0.012);
  }
  smokeBank(tris, u, camera, HUTS[0], HUTS[2] + 8, 40, 14, 4, 15, sm(0, 10, u) * 0.9, hex("#5e6264"));
  return scene({ tris, camera, env: nightAt(4.45), glowsFront, lights }, [], { mist: { color: "#30425a", alpha: 0.4 }, flash: 0.75 * pulse(u, 0, 0.09) });
}

/** The smoke, a radio, and men getting up. */
export function bingoFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const camera = shake(shotCamera([{ from: 0, to: 12, pos: [[640, 1.2, -1658], [641, 1.2, -1660]], target: [[622, 2.2, -1692], [622, 2.2, -1692]], fov: [28, 28], ease: (x) => x }], u), u * 0.3, 0.008);
  hutsWorld(tris, camera, u);
  const r = rng(14);
  for (let i = 0; i < 13; i++) {
    const x = HUTS[0] - 16 + r() * 34, z = HUTS[2] + 16 + r() * 14;
    const up = sm(2 + i * 0.3, 5 + i * 0.3, u);
    const f = fidget(u, i + 1);
    rifleman(tris, [x + f.shift, 0, z], Math.PI + f.yaw, { carry: up > 0.5 ? "ready" : "aim", drop: 0.36 - up * 0.3, lean: 0.2 - up * 0.08, lod: 1 });
  }
  smokeBank(tris, u, camera, HUTS[0], HUTS[2] + 8, 40, 14, 4, 15, 0.9 - sm(0, 12, u) * 0.5, hex("#5e6264"));
  return scene({ tris, camera, env: nightAt(4.6) }, [], { mist: { color: "#30425a", alpha: 0.38 } });
}

/** They run. Along the whole horizon, flashes start. */
export function awakeFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const camera = shake(shotCamera([{ from: 0, to: 12, pos: [[HUTS[0] + 8, 0.95, HUTS[2] + 58], [HUTS[0] + 9, 0.95, HUTS[2] + 72]], target: [[HUTS[0] + 1, 1.5, HUTS[2] + 8], [HUTS[0] + 2, 1.6, HUTS[2] + 18]], fov: [36, 36], ease: (x) => x }], u), u, 0.03);
  hutsWorld(tris, camera, u);
  const r = rng(14);
  for (let i = 0; i < 13; i++) {
    const x = HUTS[0] - 12 + r() * 26, z = HUTS[2] + 6 + r() * 14;
    const start = 0.4 + i * 0.24;
    const dist = Math.max(0, u - start) * (4.2 + (i % 3) * 0.35);
    rifleman(tris, [x, 0, z + dist], 0, { carry: "ready", gait: dist > 0 ? gait(dist, 1.32, hash2(i, 1, 9), 0.36) : undefined, lean: 0.34, lod: Math.abs(z + dist - camera.pos[2]) < 30 ? 1 : 0 });
  }
  for (const q of firingNow(ALL_ROUND, u)) {
    const a = hash2(q.k, 4, 3) * Math.PI * 2, d = 240 + hash2(q.k, 5, 3) * 240;
    muzzle(glowsFront, lights, [HUTS[0] + Math.cos(a) * d, 1.6, HUTS[2] + 60 + Math.sin(a) * d], 3.2, 2);
  }
  smokeBank(tris, u, camera, HUTS[0], HUTS[2] + 8, 40, 14, 4, 15, 0.6 - sm(0, 12, u) * 0.3, hex("#5e6264"));
  return scene({ tris, camera, env: nightAt(4.8 + sm(0, 12, u) * 0.4), glowsFront, lights }, [], { mist: { color: "#30425a", alpha: 0.36 } });
}

// ── The dawn ──────────────────────────────────────────────────────────────────────────────────────────

/** Far fire on the horizon. A man sees them, and they hold him quiet. They make for the bridge, someone shouts, and they turn back. */
export function bridgeFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const near: Tri[] = [];
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const camera = shake(shotCamera([{ from: 0, to: 24, pos: [[97, 1.35, 3.4], [98, 1.35, 1]], target: [[108, 1.6, -60], [110, 1.6, -60]], fov: [36, 34], ease: (x) => x }], u), u * 0.3, 0.008);
  patch(tris, camera.pos[0] + 6, camera.pos[2] - 22, 42, 2.5, (x, z) => (riverDist(x, z) < 22 ? null : hash2(Math.floor(x), Math.floor(z), 7) < 0.5 ? hex("#2d3826") : hex("#28321f")));
  corn(tris, camera, u, { range: 7, wind: 0.5, lift: 0.08, near, nearUnder: 3.2, nearest: 2.4 });
  // The line stops, then moves up to the bridge, then comes back.
  const fwd = sm(14, 20, u), back = sm(20.8, 23.6, u);
  for (let i = 0; i < 10; i++) {
    const row = i % 5, across = Math.floor(i / 5);
    const bx = 99 + row * 2.4 + across * 1.2, bz = -9 - across * 3 - hash2(i, 9, 1) * 2;
    const arrive = sm(0, 4.4, u);
    const dist = arrive * 5 + fwd * 7 - back * 7;
    const x = bx + fwd * 2 - back * 2, z = bz + 5 - dist;
    const moving = (u < 4.4) || (u > 14 && u < 20) || (u > 20.8 && u < 23.6);
    const f = fidget(u, i + 1);
    const turned = u > 20.6 ? 0.15 : Math.PI + f.yaw;
    rifleman(tris, [x + (moving ? 0 : f.shift), 0, z], turned, { carry: moving ? "ready" : "aim", drop: moving ? 0.06 : 0.4, lean: moving ? 0.22 : 0.2 + f.lean, gait: moving ? gait(Math.abs(dist), 0.58, hash2(i, 2, 1)) : undefined, lod: 1 });
  }
  // The man who saw them, between two who hold him still.
  if (u >= 8 && u < 15) {
    const p: V3 = at(106, -6);
    rifleman(tris, [p[0] - 1, 0, p[2]], 0.5, { look: VILLAGER(2), carry: "slung", bare: true, drop: 0.55, lean: 0.3, feet: { footL: [-0.13, 0.05, 0.4], footR: [0.13, 0.05, 0.36] }, hands: { handL: [-0.16, 0.5, 0.2], handR: [0.16, 0.5, 0.2] }, lod: 1 });
    for (const dx of [-0.5, 0.7]) rifleman(tris, [p[0] + dx - 1, 0, p[2] + 0.5], Math.PI * 0.9 + dx, { carry: "slung", drop: 0.3, lean: 0.32, lod: 1 });
  }
  // Someone on the far side, with a light, shouting.
  if (u >= 17.6) {
    const p: V3 = at(BRIDGE[0] + 8, BRIDGE[2] - 8, 2.2);
    const a = sm(17.6, 18.2, u);
    glowsFront.push({ p: [p[0], 3.4, p[2]], radius: 1.3, color: [255, 230, 180], alpha: 0.95 * a });
    lights.push({ p, color: [255, 230, 180], intensity: 0.5 * a, range: 20 });
    beam(tris, [p[0], 3.4, p[2]], [-0.15, -0.15, 1], 22, 2.2, camera, 0.12 * a);
    person(tris, VILLAGER(1), { pos: [p[0], 2.2, p[2]], yaw: 0.1, walk: 0, lean: 0.02, lod: 0 });
  }
  // The far fire, on the horizon, where the huts are.
  for (let k = 0; k < 40; k++) {
    const t0 = (k * 0.31 + hash2(k, 1, 7) * 0.2) % 24;
    if (Math.abs(u - t0) < 1 / 30) glowsFront.push({ p: [430 + hash2(k, 2, 7) * 160, 2, -1200 - hash2(k, 3, 7) * 120], radius: 26, color: [255, 200, 130], alpha: 0.9 });
  }
  return scene({ tris, camera, env: moon(20, 680, 1.2), glowsFront, lights }, [], { near: { frame: { tris: near, camera, env: moon(20, 680, 1.2), noSky: true }, blur: 7 }, mist: { color: "#2d4058", alpha: 0.36 } });
}

/** Tukanalipao at first light: cook smoke, someone with water, a day like any other. */
export function morningFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const c: V3 = [-720, 0, -520];
  const camera = shotCamera([{ from: 0, to: 12, pos: [[c[0] + 16, 1.45, c[2] + 26], [c[0] + 13, 1.45, c[2] + 24]], target: [[c[0], 1.9, c[2]], [c[0], 1.9, c[2]]], fov: [40, 38], ease: (x) => x }], u);
  patch(tris, c[0] + 4, c[2] + 8, 34, 2.4, (x, z) => (hash2(Math.floor(x / 3), Math.floor(z / 3), 3) < 0.4 ? hex("#7a6a4c") : hex("#6d7a4a")));
  for (const [i, [dx, dz]] of [[-8, -4], [7, -9], [-1, -16]].entries()) house(tris, { pos: [c[0] + dx, 0, c[2] + dz], yaw: i * 0.5 + 0.3, size: [8, 3, 6] }, hex("#8c7452"), hex("#6c6242"));
  // Cook fires, thin and straight in still air.
  for (const [dx, dz] of [[-4.5, 0.5], [3.4, -4.6]]) {
    for (let k = 0; k < 9; k++) {
      const age = (u * 0.6 + k * 0.5) % 4.5;
      puff(tris, [c[0] + dx + age * 0.16, 0.5 + age * 1.1, c[2] + dz], 0.2 + age * 0.3, camera, hex("#aaa59a"), 0.4 * (1 - age / 4.5));
    }
  }
  // Someone crosses with water.
  const dist = u * 1.08;
  const p: V3 = [c[0] - 7 + dist, 0, c[2] + 8];
  const g = gait(dist, 0.62, 0.2);
  person(tris, VILLAGER(0), { pos: p, yaw: Math.PI / 2, footL: g.footL, footR: g.footR, walk: 0.5, phase: g.phase, handR: [0.3, 0.72, 0.05], lean: 0.05, drop: -g.bob, lod: 1 });
  limb(tris, [p[0] + 0.05, 0.58, p[2] + 0.3], [p[0] + 0.05, 0.3, p[2] + 0.3], 0.1, 0.09, hex("#55606a"), 6);
  // Someone at the door.
  const f = fidget(u, 4);
  person(tris, VILLAGER(3), { pos: [c[0] + 3, 0, c[2] - 2.5], yaw: 0.6 + f.yaw, walk: 0, lean: 0.04 + f.lean, lod: 1 });
  const env = { ...lifted(envAt(6, 50, 700), 1.25), sun: norm([0.7, 0.22, -0.2]) };
  return scene({ tris, camera, env }, [], { mist: { color: "#e6b08c", alpha: 0.38 } });
}

/** In the corn: birds and wind, men kneeling. The lens rises above the tassels, and what they can't see is across the river. */
export function acrossFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const near: Tri[] = [];
  const rise = sm(7, 15, u);
  const camera = shake(shotCamera([{ from: 0, to: 24, pos: [[16, 1.2, 8], [19, 1.2, 0]], target: [[20, 1.85, -90], [21, 2.1, -92]], fov: [40, 32], ease: (x) => x }], u), u * 0.4, 0.008);
  camera.pos = [camera.pos[0], 1.2 + rise * 2.5, camera.pos[2]];
  patch(tris, camera.pos[0], camera.pos[2] - 14, 46, 2.5);
  corn(tris, camera, u, { range: 18, wind: 0.7, lift: 0.3, near, nearUnder: 5.6, nearest: 2.2 });
  // The men, seen only while the lens is down among them.
  const r = rng(60);
  for (let i = 0; i < 5; i++) {
    const f = fidget(u, i + 8);
    const d = 5 + i * 2.4;
    rifleman(tris, [18 + (i % 2 ? 1 : -1) * (d * 0.12 + r() * 0.5) + f.shift, 0, 8 - d], Math.PI + (i % 2 ? 0.2 : -0.2) + f.yaw, { drop: 0.42, lean: 0.2 + f.lean, lod: 1 });
  }
  // Gathering across the river, from all sides.
  const c = rng(40);
  for (let i = 0; i < 46; i++) {
    const x = 18 + (c() - 0.5) * 120, z = -92 - c() * 34;
    const start = 3 + c() * 16, approach = 16 + c() * 22, side = c() < 0.5 ? -1 : 1;
    if (u < start) continue;
    const walked = Math.min(approach, (u - start) * 1.15);
    const stop = walked >= approach;
    rifleman(tris, [x + side * (approach - walked) * 0.9, 0, z - (approach - walked) * 0.5], stop ? Math.PI * 0 + 0.1 * side : -side * Math.PI * 0.6, { carry: "ready", look: VILLAGER(i), gait: stop ? undefined : gait(walked, 0.65, i * 0.13), bare: i % 3 !== 0, lod: 0, lean: 0.1 });
  }
  const env = { ...lifted(envAt(5.85, 34, 620)), sun: norm([0.42, 0.14, -0.9]) };
  return scene({ tris, camera, env }, [], { near: { frame: { tris: near, camera, env, noSky: true }, blur: 9 }, flare: { p: add(camera.pos, [env.sun[0] * 4000, env.sun[1] * 4000, env.sun[2] * 4000]), alpha: 0.4, rays: 0.3 }, mist: { color: "#e6b08c", alpha: 0.4 } });
}

// ── The wait ──────────────────────────────────────────────────────────────────────────────────────────

const cornCam = (pos: [V3, V3], target: [V3, V3], length: number) => (x: number) => shotCamera([{ from: 0, to: length, pos, target, fov: [38, 38], ease: (y) => y }], x);

/** A man on a radio in the corn, and rounds going past. */
export function callFrame(u: number): Built {
  const b = fight(u, {
    men: 5,
    we: CALL.we,
    they: CALL.they,
    mortars: CALL.mortars,
    env: lifted(envAt(7, 30, 520)),
    cam: cornCam([[8, 0.9, 22], [8, 0.9, 19]], [[6, 1.1, 8], [6, 1.1, 5]], 9),
    ground: "corn",
    posture: () => ({ drop: 0.6, lean: 0.34 }),
    reloads: 1,
    smoke: () => 0.5,
    shakeAt: () => 0.03,
    mist: { color: "#a39079", alpha: 0.3 },
  });
  const tris = b.frame.tris;
  // The radio man, close to the lens, his handset up.
  const p: V3 = [6.2, 0, 17 - u * 0.0];
  const f = fidget(u, 21);
  const hip = 0.93 - 0.52;
  rifleman(tris, [p[0] + f.shift, 0, p[2]], Math.PI + 0.3 + f.yaw, { carry: "slung", drop: 0.52, lean: 0.26 + f.lean, hands: { handR: [0.2, hip + 0.62, 0.22], handL: [-0.2, hip + 0.1, 0.24] }, lod: 2 });
  box(tris, { pos: [p[0] + 0.05 + f.shift, hip + 0.32, p[2] + 0.28], yaw: 0.3, size: [0.32, 0.42, 0.18] }, { color: hex("#2b3026") });
  limb(tris, [p[0] + 0.05 + f.shift, hip + 0.54, p[2] + 0.28], [p[0] - 0.05 + f.shift, hip + 1.24, p[2] + 0.34], 0.006, 0.003, hex("#111111"), 3);
  return b;
}

/** The 84th. Firing, then a message, then an hour with only wind in it. Then it all comes back. */
export function oneHourFrame(u: number): Built {
  const env = { ...lifted(envAt(11, 40, 720)), sun: norm([-0.2, 0.9, 0.2]) };
  return fight(u, {
    men: 7,
    we: ONE_HOUR.we,
    they: ONE_HOUR.they,
    mortars: ONE_HOUR.mortars,
    env,
    cam: (x) => shotCamera([{ from: 0, to: 16, pos: [[716, 0.85, -812], [716, 0.85, -822]], target: [[620, 1.2, -838], [620, 1.2, -848]], fov: [38, 34], ease: (y) => y }], x),
    ground: "reeds",
    // In the quiet they lift their heads, one by one. When it comes back they go flat, and don't get up.
    posture: (i, x) => {
      const up = sm(CEASE + 1.4 + i * 0.5, CEASE + 3.8 + i * 0.5, x) * (1 - sm(RESUME + 0.02 * i, RESUME + 0.4 + 0.02 * i, x));
      return { drop: 0.62 - up * 0.36, lean: 0.42 - up * 0.26 };
    },
    reloads: 0,
    smoke: (x) => 0.7 * (1 - sm(CEASE, RESUME, x) * 0.7),
    shakeAt: (x) => (x < CEASE || x > RESUME ? 0.05 + (x > RESUME ? 0.14 * Math.max(0, 1 - (x - RESUME) / 0.5) : 0) : 0.008),
    mist: { color: "#8a7e64", alpha: 0.26 },
  });
}

/** Fewer rifles answering, longer gaps. One man looks in his pouch. */
export function runningOutFrame(u: number): Built {
  const env = lifted(envAt(11.5, 26, 420));
  const b = fight(u, {
    men: 3,
    we: RUNNING_OUT.we,
    they: RUNNING_OUT.they,
    mortars: RUNNING_OUT.mortars,
    env,
    cam: cornCam([[10, 0.7, 30], [11, 0.7, 28]], [[-4, 1.9, -90], [-3, 2, -90]], 6),
    ground: "corn",
    posture: () => ({ drop: 0.62, lean: 0.34 }),
    reloads: 0,
    smoke: () => 1,
    shakeAt: () => 0.03,
    mist: { color: "#7f7a68", alpha: 0.36 },
  });
  const f = fidget(u, 31);
  const p: V3 = [8.4, 0, 25.4];
  const hip = 0.93 - 0.56;
  const look = sm(1.4, 2.2, u);
  rifleman(b.frame.tris, [p[0] + f.shift, 0, p[2]], Math.PI + 0.5, { carry: "slung", drop: 0.56, lean: 0.32 + look * 0.1, hands: { handR: [0.16, hip + 0.1 + look * 0.1, 0.18], handL: [-0.12, hip + 0.1 + look * 0.1, 0.22] }, lod: 2 });
  return b;
}

/** Near the river, low, one figure going away through the rows. */
export function crawlFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const near: Tri[] = [];
  const camera = shotCamera([{ from: 0, to: 6, pos: [[-9, 0.46, 14], [-9, 0.46, 12.4]], target: [[-4, 0.5, -30], [-4, 0.5, -30]], fov: [34, 32], ease: (x) => x }], u);
  patch(tris, camera.pos[0] + 2, camera.pos[2] - 18, 34, 2.5);
  corn(tris, camera, u, { range: 22, wind: 0.8, lift: 0.14, near, nearUnder: 3.4, nearest: 2 });
  const dist = u * 0.62;
  const p: V3 = [-8 + dist * 0.2, 0, 7.8 - dist];
  const g = gait(dist, 0.3, 0.3);
  rifleman(tris, p, Math.PI + 0.2, { carry: "slung", drop: 0.74, lean: 0.56, gait: g, walk: 0.3, lod: 2 });
  smokeBank(tris, u, camera, camera.pos[0], camera.pos[2] - 26, 42, 16, 2.4, 26, 0.9);
  const env = lifted(envAt(13.8, 26, 420));
  return scene({ tris, camera, env }, [], { near: { frame: { tris: near, camera, env, noSky: true }, blur: 8 }, mist: { color: "#7f7a68", alpha: 0.32 } });
}
