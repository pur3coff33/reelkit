// The film from among the men: everything shot at eye level or below. Rounds fly and land in the dirt, men fire and crouch,
// but nobody in frame is ever hit, and nobody falls. The muzzle flashes come off the same lists of rounds as the sound.
import { add, hex, length, mixRGB, norm, smooth, sub, type Camera, type Frame, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { hash2, octa, pulse, rng, shake, shotCamera } from "../../src/kit/lowpoly/world";
import { limb, person, poly, truck } from "../typhoon/models";
import { tinyPerson } from "../fallout/models";
import { HIGHWAY_Z, WP_POINT, district, envAt, isMarsh, isTreeFace } from "./land";
import { fidget } from "./motion";
import { inView, puff } from "./props";
import { ARMY, VILLAGER, armored, at, beam, corn, cyclist, flashlight, howitzer, kick, kuliglig, muzzle, patch, reeds, rifleman, scene, smokeBank, tracer, type Built } from "./props";
import { MARSH_FIRE, WP_ROUNDS, firedWithin, firingNow, hourAt, type Round } from "./mapclock";

const sm = (a: number, b: number, x: number) => smooth(a, b, x);
/** Clears any tree near the lens from a finished ground shot. */
export const clearLens = (radius: number, fn: (t: number) => Built) => (t: number): Built => {
  const b = fn(t);
  return { ...b, frame: { ...b.frame, tris: b.frame.tris.filter((x) => !isTreeFace(x) || Math.hypot(x.a[0] - b.frame.camera.pos[0], x.a[2] - b.frame.camera.pos[2]) > radius) } };
};

/** Night, lifted enough to see by: a low moon on wet ground. */
export const moon = (near: number, far: number, lift = 1) => ({ ...envAt(23, near, far), sunColor: [118 * lift, 138 * lift, 185 * lift] as RGB, ambient: [78 * lift, 92 * lift, 128 * lift] as RGB, stars: 0.7 });

export function layer(near: Tri[], camera: Camera, env: Frame["env"], blur: number) {
  return near.length ? { near: { frame: { tris: near, camera, env, noSky: true }, blur } } : {};
}

/** Fire from a far line, coming this way, with some of it going into the dirt nearby. */
export function incoming(tris: Tri[], glows: Glow[], lights: PointLight[], list: Round[], t: number, cam: Camera, from: (k: number) => V3, to: (k: number) => V3, ground: (k: number) => V3, flight = 0.26) {
  for (const r of firingNow(list, t)) muzzle(glows, lights, from(r.k), 1.5, 26);
  for (const r of firedWithin(list, t, flight)) {
    if (r.k % 2 === 0) tracer(tris, from(r.k), to(r.k), (t - r.t) / flight, cam, 0.03);
  }
  for (const r of firedWithin(list, t, 0.5 + flight)) {
    if (r.k % 3 === 0) kick(tris, cam, ground(r.k), t - r.t - flight * 0.7, r.k + 7);
  }
}

/** Our own men's fire, each round from one of the muzzles in frame. */
export function outgoing(tris: Tri[], glows: Glow[], lights: PointLight[], list: Round[], t: number, cam: Camera, muzzles: V3[], aim: V3, flight = 0.2): number {
  if (!muzzles.length) return 0;
  let flash = 0;
  for (const r of firingNow(list, t)) {
    const m = muzzles[r.k % muzzles.length];
    muzzle(glows, lights, m, 1, 14);
    flash = Math.max(flash, 1 / (1 + length(sub(m, cam.pos)) * 0.14));
  }
  for (const r of firedWithin(list, t, flight)) {
    if (r.k % 3 !== 0) continue;
    const m = muzzles[r.k % muzzles.length];
    tracer(tris, m, add(aim, [(hash2(r.k, 1, 9) - 0.5) * 40, 1 + hash2(r.k, 2, 9) * 5, (hash2(r.k, 3, 9) - 0.5) * 12]), (t - r.t) / flight, cam, 0.022);
  }
  return flash;
}

/** The sun, low, somewhere off behind what we're looking at. */
export const sunAt = (env: Frame["env"], cam: Camera): V3 => add(cam.pos, [env.sun[0] * 4000, env.sun[1] * 4000, env.sun[2] * 4000]);

// ── Night ─────────────────────────────────────────────────────────────────────────────────────────────

// ── The cornfield ─────────────────────────────────────────────────────────────────────────────────────

/** The field when it's over. Nobody in frame, nothing moving but the corn and what's left in the air. */
export function emptyFieldFrame(t: number): Built {
  const tris: Tri[] = district().slice();
  const near: Tri[] = [];
  const camera = shotCamera([{ from: 181.5, to: 186.4, pos: [[-4, 1.1, 34], [-3.4, 1.34, 30]], target: [[6, 2.2, -70], [8, 3, -70]], fov: [42, 42], ease: (x) => x }], t);
  patch(tris, camera.pos[0], camera.pos[2] - 18, 50, 2.5);
  corn(tris, camera, t, { range: 28, wind: 0.75, lift: 0.14, near, nearUnder: 4.4, nearest: 2 });
  smokeBank(tris, t, camera, camera.pos[0], camera.pos[2] - 26, 42, 20, 2.6, 26, 0.85);
  const env = envAt(13.3, 26, 420);
  return scene({ tris, camera, env }, [], { ...layer(near, camera, env, 8), mist: { color: "#7f7a68", alpha: 0.32 } });
}

// ── The morning, elsewhere ────────────────────────────────────────────────────────────────────────────

/** A 105 battery, ready, in the morning sun, with nothing to do. The plan's third part, on hold. */
export function batteryFrame(t: number): Built {
  const tris: Tri[] = district().slice();
  const gx = -1500, gz = 2300;
  const camera = shotCamera([{ from: 131, to: 138.8, pos: [[gx + 13, 1.4, gz + 8], [gx + 10, 1.4, gz + 8]], target: [[gx - 2, 2.4, gz - 12], [gx - 3, 2.6, gz - 13]], fov: [40, 38], ease: (x) => x }], t);
  patch(tris, gx, gz, 60, 3, () => hex("#6f7a4c"));
  const r = rng(105);
  for (let i = 0; i < 4; i++) {
    const x = gx - 22 + i * 15, z = gz - 12 - i * 2.5;
    howitzer(tris, [x, 0, z], Math.PI - 0.05, 0.5);
    for (let c = 0; c < 4; c++) {
      const px = x - 3 + r() * 6, pz = z + 2 + r() * 4.5, turn = Math.PI + (r() - 0.5) * 2.6;
      person(tris, ARMY, { pos: [px, 0, pz], yaw: turn, walk: 0, lean: 0.02, headYaw: Math.sin(t * 0.3 + c) * 0.4, lod: Math.hypot(px - camera.pos[0], pz - camera.pos[2]) < 16 ? 1 : 0 });
    }
  }
  // Far off to the north, where they'd be firing: a thin line of smoke.
  for (let k = 0; k < 9; k++) puff(tris, [gx + 330 + k * 9, 24 + k * 32 + (t % 3), gz - 1700], 22 + k * 11, camera, hex("#9b9486"), 0.36 - k * 0.02);
  const env = envAt(7.7, 60, 1700);
  return scene({ tris, camera, env }, [], { mist: { color: "#8b9291", alpha: 0.26 } });
}

/** At the marsh's edge: a vehicle that has come as far as a vehicle can. */
export function roadFrame(t: number): Built {
  const tris: Tri[] = district().slice();
  const camera = shake(shotCamera([{ from: 138.8, to: 145, pos: [[-276, 1.5, 1158], [-284, 1.5, 1160]], target: [[-296, 1.8, 1120], [-298, 1.9, 1100]], fov: [42, 42], ease: (x) => x }], t), t * 0.5, 0.025);
  patch(tris, -290, 1130, 60, 3, (x, z) => (z > HIGHWAY_Z - 9 ? hex("#8c8579") : isMarsh(x, z) || z < 1110 ? hex("#50705c") : hex("#6d7a48")));
  reeds(tris, -295, 1098, 30, t, 22, 260, camera, 0.05);
  const crawl = sm(138.8, 141, t);
  armored(tris, at(-294, 1132 + (1 - crawl) * 30), Math.PI);
  armored(tris, at(-310, 1160), Math.PI / 2 + 0.05);
  // Exhaust, idling.
  for (let k = 0; k < 7; k++) {
    const age = (t * 1.3 + k * 0.4) % 2.6;
    puff(tris, [-292.5 + age * 0.7, 1.5 + age * 0.8, 1136 + (1 - crawl) * 30 + age * 0.2], 0.22 + age * 0.4, camera, hex("#444742"), 0.44 * (1 - age / 2.6));
  }
  const r = rng(45);
  for (let i = 0; i < 7; i++) {
    const x = -300 + r() * 34, z = 1118 + r() * 24;
    const f = fidget(t, i + 11);
    rifleman(tris, [x + f.shift, 0, z], Math.PI + (r() - 0.5) + f.yaw, { look: ARMY, carry: "slung", lean: 0.06 + f.lean, lod: 1 });
  }
  return scene({ tris, camera, env: envAt(9, 90, 1400) }, [], { mist: { color: "#8b9496", alpha: 0.24 } });
}

/** Five hundred metres of flat wet ground, from where the relief stopped. Fire comes from the far side of it. */
export function marshEdgeFrame(t: number): Built {
  const tris: Tri[] = district().slice();
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const camera = shake(shotCamera([{ from: 145, to: 148.5, pos: [[-258, 0.75, 520], [-258, 0.75, 516]], target: [[-200, 1.5, 200], [-198, 1.5, 196]], fov: [34, 32], ease: (x) => x }], t), t * 0.5, 0.03);
  patch(tris, -250, 480, 70, 3.4, () => hex("#50705c"));
  for (let i = 0; i < 70; i++) {
    const r = rng(i + 90);
    const x = -258 + (r() - 0.5) * 70, z = 500 - r() * 60;
    poly(tris, [[x, 0.12, z], [x + 2, 0.12, z + 0.5], [x + 2.2, 0.12, z + 1.8], [x - 0.4, 0.12, z + 1.4]], hex("#7d9690"), { mirror: 0.8, zBias: 4000 });
  }
  reeds(tris, -254, 508, 12, t, 91, 150, camera, 0.05);
  const r = rng(92);
  const camBase = shotCamera([{ from: 145, to: 148.5, pos: [[-258, 0.75, 520], [-258, 0.75, 516]], target: [[-200, 1.5, 200], [-198, 1.5, 196]], fov: [34, 32], ease: (x) => x }], t);
  for (let i = 0; i < 6; i++) {
    const d = 5.5 + i * 2.6 + r();
    rifleman(tris, inView(camBase, d, (i % 2 ? 1 : -1) * d * (0.07 + r() * 0.08)), Math.PI - 0.18, { drop: 0.62, lean: 0.4, lod: d < 13 ? 1 : 0 });
  }
  const from = (k: number): V3 => add(inView(camBase, 320 + hash2(k, 2, 6) * 50, (hash2(k, 1, 6) - 0.5) * 120), [0, 1, 0]);
  incoming(tris, glowsFront, lights, MARSH_FIRE, t, camera, from, (k) => add(inView(camBase, -2, (hash2(k, 3, 6) - 0.5) * 8), [0, 1.3 + hash2(k, 4, 6) * 2.4, 0]), (k) => add(inView(camBase, 22 + hash2(k, 6, 6) * 34, (hash2(k, 5, 6) - 0.5) * 16), [0, 0.1, 0]), 0.6);
  return scene({ tris, camera, env: envAt(10.5, 70, 900), glowsFront, lights }, [], { mist: { color: "#8c8f84", alpha: 0.3 } });
}

// ── The river ─────────────────────────────────────────────────────────────────────────────────────────

/** One round's airburst: a white point, then arms of smoke arcing down. */
function airburst(tris: Tri[], glows: Glow[], lights: PointLight[], c: V3, age: number, seed: number, cam: Camera) {
  if (age < 0 || age > 13) return;
  if (age < 0.2) {
    glows.push({ p: c, radius: 130, color: [255, 248, 235], alpha: 1 - age / 0.2 });
    lights.push({ p: c, color: [255, 246, 232], intensity: 4 * (1 - age / 0.2), range: 700 });
  }
  const fade = 1 - sm(6, 13, age);
  const r = rng(seed);
  for (let a = 0; a < 20; a++) {
    const th = r() * Math.PI * 2, out = 8 + r() * 26, up = 6 + r() * 20, vx = Math.cos(th) * out, vz = Math.sin(th) * out;
    const pos = (s: number): V3 => [c[0] + vx * s, Math.max(0, c[1] + up * s - 4.9 * s * s), c[2] + vz * s];
    const reach = Math.min(age, 4.6);
    for (let k = 0; k < 8; k++) {
      const s0 = (k / 8) * reach, s1 = ((k + 1) / 8) * reach;
      const w = 1.6 + (reach - s0) * 2.1;
      const p = pos(s0), q = pos(s1);
      const mid: V3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + (age - s0) * 1.3, (p[2] + q[2]) / 2];
      puff(tris, mid, w * 1.5, cam, [244, 244, 238], 0.5 * fade * (0.4 + (0.6 * k) / 8));
    }
    if (age < reach + 0.1) {
      const tip = pos(reach);
      if (tip[1] > 0) glows.push({ p: tip, radius: 6, color: [255, 255, 240], alpha: 0.9 });
    }
  }
}

/** The first artillery of the day, from the riverbank at dusk: three white blooms across the river. */
export function phosphorusFrame(t: number): Built {
  const tris: Tri[] = district().slice();
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const camera = shake(shotCamera([{ from: 212.4, to: 219.6, pos: [[722, 1, -780], [722, 1, -790]], target: [[510, 34, -985], [506, 40, -990]], fov: [44, 44], ease: (x) => x }], t), t, 0.02 + WP_ROUNDS.reduce((s, r) => s + pulse(t, r, 0.25) * 0.14, 0));
  patch(tris, 708, -806, 56, 3, (x) => (x < 668 ? null : hex("#5c6240")));
  reeds(tris, 700, -812, 30, t, 212, 260, camera, 0.04);
  const r = rng(213);
  for (let i = 0; i < 5; i++) {
    const d = 7 + i * 3.4 + r();
    rifleman(tris, inView(camera, d, (i % 2 ? 1 : -1) * d * (0.1 + r() * 0.1)), -Math.PI * 0.75, { drop: 0.45, lean: 0.16, lod: d < 16 ? 1 : 0 });
  }
  for (const [i, r0] of WP_ROUNDS.entries()) airburst(tris, glowsFront, lights, [WP_POINT[0] - 80 + i * 90, 84 + i * 8, WP_POINT[2] + (i - 1) * 60], t - r0, 600 + i, camera);
  const env = envAt(hourAt(t), 90, 1800);
  const burst = WP_ROUNDS.findLast((r0) => t >= r0);
  return scene({ tris, camera, env, glowsFront, lights }, [], {
    mist: { color: "#d97a4c", alpha: 0.42 },
    flash: WP_ROUNDS.reduce((s, r0) => s + pulse(t, r0, 0.09) * 0.42, 0),
    ...(burst !== undefined && t - burst < 2.2 ? { flare: { p: [WP_POINT[0] - 80 + WP_ROUNDS.indexOf(burst) * 90, 84, WP_POINT[2]] as V3, alpha: 0.9 * pulse(t, burst, 0.7) } } : {}),
    grade: { bloom: 0.5, contrast: 1.08, saturate: 0.78, tint: "#d68a58", tintAmount: 0.16 },
  });
}

// ── After ─────────────────────────────────────────────────────────────────────────────────────────────

/** Dark: tractors and an ambulance come down through the corn, seen from a long way off. Nobody is shown being carried. */
export function retrievalFrame(t: number): Built {
  const tris: Tri[] = district().slice();
  const near: Tri[] = [];
  const camera = shotCamera([{ from: 226, to: 234.2, pos: [[52, 1.6, 196], [50, 1.6, 200]], target: [[12, 1.2, 150], [10, 1.2, 150]], fov: [30, 30], ease: (x) => x }], t);
  patch(tris, 30, 170, 70, 3, (x, z) => (hash2(Math.floor(x), Math.floor(z), 7) < 0.5 ? hex("#2d3826") : hex("#28321f")));
  corn(tris, camera, t, { range: 22, wind: 0.5, lift: 0.14, nearest: 3, near, nearUnder: 4.5 });
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const k = sm(225, 233, t);
  kuliglig(tris, at(14, 124 + (1 - k) * 18), Math.PI + 0.2);
  kuliglig(tris, at(0, 138 + (1 - k) * 22), Math.PI - 0.1);
  truck(tris, at(30, 160 + (1 - k) * 14), Math.PI + 0.4, hex("#d9dcd9"));
  const lamps: [number, number, V3][] = [[33, 150 + (1 - k) * 14, [-0.3, -0.03, -1]], [15, 116 + (1 - k) * 18, [-0.15, -0.03, -1]], [1, 130 + (1 - k) * 22, [0.1, -0.03, -1]]];
  for (const [x, z, d] of lamps) {
    glowsFront.push({ p: [x, 1.2, z], radius: 2, color: [255, 236, 200], alpha: 0.85 });
    beam(tris, [x, 1.2, z], d, 22, 3, camera, 0.1);
    lights.push({ p: [x, 1.2, z - 3], color: [255, 236, 200], intensity: 1.4, range: 24 });
  }
  const r = rng(77);
  for (let i = 0; i < 10; i++) {
    const x = -14 + r() * 54, z = 112 + r() * 34, w = r() * 6;
    const px = x, pz = z;
    tinyPerson(tris, px, 0, pz, mixRGB(VILLAGER(i).top, [0, 0, 0], 0.5), 1.68);
    const dir = w + t * 0.35;
    flashlight(glowsFront, lights, at(px, pz), dir, 0.8);
    beam(tris, [px, 1.1, pz], [Math.cos(dir), -0.16, Math.sin(dir)], 7, 0.9, camera, 0.12);
  }
  const env = { ...envAt(hourAt(t), 24, 360), sunColor: [96, 112, 152] as RGB, ambient: [70, 82, 112] as RGB };
  return scene({ tris, camera, env, glowsFront, lights }, [], { ...layer(near, camera, env, 7), mist: { color: "#31465f", alpha: 0.55 } });
}

/** The next afternoon: one man on a bicycle, on an ordinary road. */
export function bicycleFrame(t: number): Built {
  const tris: Tri[] = district().slice();
  const rider: V3 = [-430 + (t - 247.8) * 3.3, 0, HIGHWAY_Z + 1.5];
  const camera: Camera = { pos: [rider[0] - 3 - (t - 247.8) * 0.12, 1.35, rider[2] - 7.5], target: [rider[0] - 0.2, 1.05, rider[2]], fov: 40 };
  patch(tris, rider[0], rider[2], 42, 2.6, (x, z) => (Math.abs(z - HIGHWAY_Z) < 7.5 ? hex("#8c8579") : Math.abs(z - HIGHWAY_Z) < 10 ? hex("#79745c") : hex("#6d8c47")));
  for (let i = -6; i < 7; i++) {
    const x = Math.round(rider[0] / 16) * 16 + i * 16 + hash2(i, 3, 2) * 4;
    const seed = Math.round(x / 16);
    if (hash2(seed, 0, 6) < 0.45) {
      const z = HIGHWAY_Z + 13 + hash2(seed, 1, 6) * 6;
      limb(tris, [x, 0, z], [x + 0.4, 7.5, z], 0.2, 0.13, hex("#54483a"), 4);
      octa(tris, { pos: [x + 0.4, 8.2, z], size: [3.2, 1.3, 3.2] }, { color: hex("#3f6a3a") });
    }
  }
  cyclist(tris, rider, t);
  const env = { ...envAt(15.5, 40, 700), sun: norm([0.5, 0.4, 0.9]) };
  return scene({ tris, camera, env }, [], { flare: { p: sunAt(env, camera), alpha: 0.4, rays: 0.14 }, mist: { color: "#a39a82", alpha: 0.24 } });
}

/** The end of it: the same field in low gold light, with nobody there. */
export function lastFieldFrame(t: number): Built {
  const tris: Tri[] = district().slice();
  const near: Tri[] = [];
  const camera = shotCamera([{ from: 278.7, to: 291, pos: [[28, 1.3, 30], [32, 5.2, 42]], target: [[20, 2.6, -80], [20, 3.5, -80]], fov: [42, 42], ease: (x) => x * x * (3 - 2 * x) }], t);
  patch(tris, camera.pos[0], camera.pos[2] - 18, 56, 2.5);
  corn(tris, camera, t, { range: 30, wind: 0.7, lift: 0.3, near, nearUnder: 3.8, nearest: 1.8 });
  const env = { ...envAt(5.9, 60, 900), sun: norm([0.32, 0.12, -0.92]) };
  return scene({ tris, camera, env }, [], { ...layer(near, camera, env, 8), flare: { p: sunAt(env, camera), alpha: 0.34, rays: 0.34 }, mist: { color: "#ecb88e", alpha: 0.55 }, grade: { bloom: 0.3, contrast: 1.06, saturate: 0.7, tint: "#e8a56c", tintAmount: 0.12 } });
}

