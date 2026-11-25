// The recut's scenes. Each takes `u`, seconds into the scene, so the film can move them without rewriting them. Nobody in frame
// is ever hit, and nobody falls: rounds land in dirt and water. Small gestures are imagined; what happens is from the record.
import { add, hex, norm, smooth, type Camera, type Env, type Glow, type PointLight, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import type { Round } from "./mapclock";
import { hash2, rng, shake, shotCamera } from "../../src/kit/lowpoly/world";
import { poly, limb } from "../typhoon/models";
import { FIRST_SHOT, FIRST_SHOTS, STRAFE, UNDER } from "./fire";
import { incoming, layer, moon, outgoing, sunAt } from "./ground";
import { district, envAt, riverDist } from "./land";
import { fidget, gait, recoil } from "./motion";
import { VILLAGER, blast, corn, inView, muzzle, patch, reeds, rifleman, scene, smokeBank, splash, tracer, type Built } from "./props";

const sm = (a: number, b: number, x: number) => smooth(a, b, x);

// ── The Weight ────────────────────────────────────────────────────────────────────────────────────────

const LINE_X = -326, FRONT_Z = 714, GAP = 3.4, SPEED = 0.95, STEP = 0.56;
export const WEIGHT_MEN = 14;
/** The man who drops behind. Everyone after him drops back with him. */
const STRAGGLER = 3;

/** How far man `i` has walked, u seconds in. Never goes backwards. The line slows to a halt after 16 s. */
export function walked(i: number, u: number) {
  const halting = u < 16 ? u : 16 + (1 - Math.exp(-(u - 16) * 0.7)) / 0.7;
  const behind = i >= STRAGGLER ? 2.2 * sm(11, 18, u) : 0;
  return SPEED * (1 + 0.05 * Math.sin(i * 2.1)) * halting + 0.12 * Math.sin(u * 0.55 + i * 1.3) - behind;
}

/** Tripod, beside the track: the line comes towards the lens and goes by, heavy and slow. */
export function weightFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  // Tilted down, so the land fills a tall frame and the sky stays a band at the top.
  const camera: Camera = shake({ pos: [LINE_X + 3.1, 1.0, 703], target: [LINE_X + 0.1, 0.62, 722 - u * 0.95], fov: 34 }, u * 0.4, 0.008);
  const wet = hex("#3a5356"), mud = hex("#2c3a33");
  patch(tris, camera.pos[0] - 3, 730, 46, 2.2, (x, z) => (hash2(x, z, 9) < 0.34 ? wet : mud));
  for (let i = 0; i < 46; i++) {
    const r = rng(i + 9);
    const x = LINE_X + (r() - 0.5) * 22, z = 696 + r() * 72;
    poly(tris, [[x, 0.12, z], [x + 1.6, 0.12, z + 0.4], [x + 1.8, 0.12, z + 1.5], [x - 0.3, 0.12, z + 1.2]], hex("#48666a"), { mirror: 0.9, zBias: 4000 });
  }
  reeds(tris, LINE_X + 3, 736, 26, u, 8, 300, camera);
  for (let i = 0; i < WEIGHT_MEN; i++) {
    const dist = walked(i, u);
    const z = FRONT_Z + i * GAP - dist;
    const x = LINE_X + Math.sin(z * 0.11 + i) * 0.38 + (i % 2 ? 0.16 : -0.16);
    const near = Math.hypot(x - camera.pos[0], z - camera.pos[2]) < 18;
    const f = fidget(u, i + 1);
    rifleman(tris, [x, 0, z], Math.PI + f.yaw * 0.6, { carry: i % 3 === 0 ? "ready" : "slung", gait: gait(dist, STEP, hash2(i, 1, 4)), lean: 0.2 + f.lean, drop: 0.07, pack: true, lod: near ? 1 : 0 });
  }
  return scene({ tris, camera, env: moon(18, 120, 1.6) }, [], { mist: { color: "#2a3e58", alpha: 0.4 } });
}

// ── First Shots ───────────────────────────────────────────────────────────────────────────────────────

export type FightOpts = {
  men: number;
  we: Round[];
  they: Round[];
  mortars: number[];
  env: Env;
  cam: (u: number) => Camera;
  /** "corn" stands in rows around the lens; "reeds" is the slope above the river. */
  ground: "corn" | "reeds";
  /** How far down each man is, and how far forward he's leaning. */
  posture: (i: number, u: number) => { drop: number; lean: number };
  /** How fast they'd be getting through a magazine: 0 never reloads. */
  reloads?: number;
  smoke: (u: number) => number;
  shakeAt: (u: number) => number;
  mist: { color: string; alpha: number };
  flare?: { alpha: number; rays: number };
  grade?: Built["fx"]["grade"];
};

/** Low among the men, two sides firing, every flash and recoil read off the same lists as the sound. Nobody is ever hit. */
export function fight(u: number, o: FightOpts): Built {
  const tris: Tri[] = district().slice();
  const near: Tri[] = [];
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const base = o.cam(u);
  const mortarShake = o.mortars.reduce((s, m) => s + Math.max(0, 1 - Math.abs(u - m) / 0.3) * 0.2, 0);
  const camera = shake(base, u * 0.5, o.shakeAt(u) + mortarShake);
  const r = rng(36);
  if (o.ground === "corn") {
    patch(tris, camera.pos[0], camera.pos[2] - 18, 50, 2.5);
    corn(tris, camera, u, { range: 28, wind: 0.9, lift: 0.22, near, nearUnder: 4.4, nearest: 2 });
  } else {
    const ahead = inView(base, 18);
    patch(tris, ahead[0], ahead[2], 56, 2.8, (x, z) => (riverDist(x, z) < 22 ? null : hex("#6b7345")));
    reeds(tris, ahead[0], ahead[2], 34, u, 84, 300, camera, 0.06);
  }
  const muzzles: V3[] = [];
  for (let i = 0; i < o.men; i++) {
    const d = 4.4 + i * 2.2 + r() * 1.2;
    const p = inView(base, d, (i % 2 ? 1 : -1) * d * (0.1 + r() * 0.1));
    const f = fidget(u, i + 1);
    const q = o.posture(i, u);
    const cycle = (u + i * 1.9) % 4.7;
    const reload = o.reloads ? Math.max(0, Math.min(1, cycle < 1.1 ? cycle * 5 : (1.5 - cycle) * 5)) * (i % 2 ? o.reloads : 0) : 0;
    const face = Math.atan2(base.target[0] - base.pos[0], base.target[2] - base.pos[2]);
    muzzles.push(rifleman(tris, [p[0] + f.shift, 0, p[2] + f.shift * 0.4], face + (i % 2 ? -1 : 1) * (0.26 + r() * 0.26) + f.yaw, { drop: q.drop + r() * 0.1, lean: q.lean + f.lean, kick: recoil(o.we, u, i, o.men), reload, lod: 1 }));
  }
  const flash = outgoing(tris, glowsFront, lights, o.we, u, camera, muzzles, add(inView(base, 120), [0, 1.5, 0]));
  const from = (k: number): V3 => {
    const d = 112 + hash2(k, 2, 5) * 22;
    return add(inView(base, d, (hash2(k, 1, 5) - 0.5) * d * 0.42), [0, 1.2, 0]);
  };
  const to = (k: number): V3 => add(inView(base, -2, (hash2(k, 3, 5) - 0.5) * 7), [0, 1.3 + hash2(k, 4, 5) * 2.2, 0]);
  const dirt = (k: number): V3 => {
    const d = 7 + hash2(k, 5, 5) * 22;
    return add(inView(base, d, (hash2(k, 6, 5) - 0.5) * d * 0.42), [0, 0.1, 0]);
  };
  incoming(tris, glowsFront, lights, o.they, u, camera, from, to, dirt);
  for (const [i, m] of o.mortars.entries()) {
    const d = 46 + i * 7;
    blast(tris, glowsFront, lights, camera, inView(base, d, (i % 2 ? 1 : -1) * d * 0.14), u - m, i + 21, 1.15);
  }
  const haze = o.smoke(u);
  if (haze > 0) {
    const ahead = inView(base, 26);
    smokeBank(tris, u, camera, ahead[0], ahead[2], 42, 16, 2.4, 26, haze);
  }
  const blastFlash = o.mortars.reduce((s, m) => s + Math.max(0, 1 - Math.abs(u - m) / 0.07) * 0.35, 0);
  return scene({ tris, camera, env: o.env, glowsFront, lights }, [], {
    ...layer(near, camera, o.env, 8),
    ...(o.flare ? { flare: { p: sunAt(o.env, camera), alpha: o.flare.alpha, rays: o.flare.rays } } : {}),
    mist: o.mist,
    flash: Math.min(0.6, flash * 0.5 + blastFlash),
    ...(o.grade ? { grade: o.grade } : {}),
  });
}

/** Some light on the backs of the men, so they aren't only shapes. */
export const lifted = (env: Env, k = 1.5): Env => ({ ...env, ambient: [env.ambient[0] * k, env.ambient[1] * k, env.ambient[2] * k] });

/** Dawn, the corn, everyone still. Then the first round, and the same men from lower and closer. */
export function firstShotsFrame(u: number): Built {
  const fired = u >= FIRST_SHOT;
  return fight(u, {
    men: 6,
    we: FIRST_SHOTS.we,
    they: FIRST_SHOTS.they,
    mortars: FIRST_SHOTS.mortars,
    env: lifted({ ...envAt(5.8, 30, 520), sun: norm([0.42, 0.14, -0.9]) }),
    cam: (x) =>
      x >= FIRST_SHOT
        ? shotCamera([{ from: FIRST_SHOT, to: 12, pos: [[-11, 0.82, 22], [-9.5, 0.82, 18]], target: [[1, 1.8, -90], [4, 1.9, -90]], fov: [44, 44], ease: (y) => y }], x)
        : shotCamera([{ from: 0, to: FIRST_SHOT, pos: [[-6, 1.32, 27], [-6, 1.32, 25.5]], target: [[3, 1.75, -80], [3, 1.75, -80]], fov: [36, 36], ease: (y) => y }], x),
    ground: "corn",
    // Each man goes to ground in his own time.
    posture: (i, x) => {
      const flinch = sm(FIRST_SHOT + 0.06 + i * 0.05, FIRST_SHOT + 0.45 + i * 0.05, x);
      return { drop: 0.42 + flinch * 0.2, lean: 0.26 + flinch * 0.1 };
    },
    reloads: fired ? 1 : 0,
    smoke: (x) => (x >= FIRST_SHOT ? sm(FIRST_SHOT, 12, x) * 0.6 : 0),
    shakeAt: (x) => (x >= FIRST_SHOT ? 0.05 + 0.14 * Math.max(0, 1 - (x - FIRST_SHOT) / 0.5) : 0.006),
    mist: { color: "#d8a584", alpha: fired ? 0.3 : 0.42 },
    flare: { alpha: 0.28, rays: 0.22 },
  });
}

// ── Eleven Hours ──────────────────────────────────────────────────────────────────────────────────────

/** Where he ends up in the water. */
export const HIDER: V3 = [11.6, 0, -44.6];
const BANK: V3 = [10.2, 0, -34.6];
/** Where the two armed men walk: right at the water, in front of the reeds. */
const BANK_LIP = -35.2;
const WATER = hex("#3f5c60"), WATER_DARK = hex("#34505a");
const SHIRT = hex("#39473a"), VEST = hex("#20261f");

function hiderAt(u: number): V3 {
  const k = sm(2.5, 6.2, u);
  return [BANK[0] + (HIDER[0] - BANK[0]) * k, 0, BANK[2] + (HIDER[2] - BANK[2]) * k];
}

/** On the bank, the vest comes off. He goes in. Two armed men walk rounds across the water. Then only the hours. */
export function elevenHoursFrame(u: number): Built {
  const tris: Tri[] = district().slice();
  const near: Tri[] = [];
  const glowsFront: Glow[] = [], lights: PointLight[] = [];
  const hour = u < 13 ? 14.3 : 14.3 + sm(13, 18, u) * 4.2;
  const env = envAt(hour, 40, 620);

  const wide = u >= 9 && u < 13;
  const still: Camera = wide
    ? shotCamera([{ from: 9, to: 13, pos: [[11.1, 0.5, -50.6], [11.1, 0.5, -50]], target: [[11.4, 0.92, -35], [11.4, 0.92, -35]], fov: [40, 40], ease: (x) => x }], u)
    : u < 9
      ? shotCamera([{ from: 0, to: 9, pos: [[9.6, 0.62, -50.6], [10.6, 0.5, -48.8]], target: [[10.3, 0.86, -36], [11.5, 0.42, -44.4]], fov: [46, 34] }], u)
      : shotCamera([{ from: 13, to: 18, pos: [[10.1, 0.48, -49.4], [10.3, 0.46, -49]], target: [[11.6, 0.42, -44.6], [11.6, 0.42, -44.6]], fov: [30, 26], ease: (x) => x }], u);
  const camera = shake(still, u * 0.3, wide ? 0.018 : 0.006);

  // The bank he leaves and the water he goes into. Small enough cells that the near water covers what's under its surface.
  patch(tris, 11, -30, 24, 2, (x, z) => (riverDist(x, z) < 20 ? null : hex("#6b6b45")));
  patch(tris, camera.pos[0], camera.pos[2] + 8, 14, 0.9, (x, z) => (riverDist(x, z) < 20 ? (hash2(Math.floor(x * 2), Math.floor(z * 2), 3) < 0.5 ? WATER : WATER_DARK) : null), 0.18, 0);
  reeds(tris, 11, -31.5, 12, u, 301, 150, camera, 0.1);
  reeds(tris, HIDER[0], HIDER[2] + 1.4, 2.8, u, 302, 80, camera, 0.1);
  corn(tris, camera, u, { range: 26, wind: 0.7, lift: 0.14, nearest: 12 });

  // Something out of focus right against the lens.
  for (const [i, side] of [-0.62, -0.5, 0.58].entries()) {
    const x = camera.pos[0] + side, z = camera.pos[2] + 0.95 + i * 0.05;
    limb(near, [x, 0, z], [x + side * 0.22 + Math.sin(u * 0.8 + i) * 0.015, 1.25, z], 0.009, 0.003, hex("#6d8a62"), 3);
  }

  // Him. Deep in the water his legs hang straight under him, so nothing but his head breaks the surface.
  const p = hiderAt(u);
  const dist = Math.hypot(p[0] - BANK[0], p[2] - BANK[2]);
  const under = sm(UNDER.from, UNDER.from + 0.5, u) * (1 - sm(UNDER.to - 0.2, UNDER.to + 0.5, u));
  const wade = sm(2.5, 6.2, u);
  const drop = 0.5 + wade * 0.72 + under * 0.46;
  const f = fidget(u, 9);
  const hipY = 0.92 * (1.68 / 1.7) - drop;
  const walking = wade > 0 && wade < 0.55;
  const hanging = { footL: [-0.1, hipY - 0.82, 0.05] as V3, footR: [0.1, hipY - 0.82, -0.05] as V3, bob: 0, phase: 0 };
  rifleman(tris, [p[0], 0, p[2]], 0.12 + f.yaw * 0.5, { carry: "ready", drop, lean: 0.14 + f.lean, gait: wade <= 0 ? undefined : walking ? gait(dist, 0.34, 0.2) : hanging, walk: 0, bare: true, look: { ...VILLAGER(0), top: SHIRT, bottom: hex("#3a4538") }, lod: 2 });
  // The vest: on him, then in his hand, then let go at the water's edge.
  if (u < 3.4) {
    const off = sm(1.1, 2.1, u), fall = sm(2.2, 3.1, u);
    const vy = hipY + 0.36 + 0.14 * off - fall * 1.2;
    if (vy > 0.22) tris.push(...vestAt([p[0] + off * 0.26, vy, p[2] - off * 0.3], off * 1.1 + fall));
  }

  // The two on the bank, while they're there. Rounds go into the water, well short of him.
  if (u >= 6.8 && u < 13) {
    for (const [i, x0] of [8.8, 14].entries()) {
      const d = Math.max(0, u - 6.8) * 0.72;
      const x = x0 + (i ? -d * 0.34 : d * 0.34);
      const man: V3 = [x, 0, BANK_LIP + i * 0.5];
      rifleman(tris, man, Math.PI + (i ? 0.22 : -0.22), { carry: "aim", lean: 0.2, drop: 0.08, look: VILLAGER(i + 1), gait: gait(d * 0.34, 0.6, i * 0.4), kick: recoil(STRAFE.map((s) => ({ t: s.u, k: s.k })), u, i, 2), lod: 1 });
    }
  }
  for (const s of STRAFE) {
    const age = u - s.u;
    if (age < 0 || age > 0.9) continue;
    const shooter: V3 = [8.8 + (s.k % 2 ? 5.2 : 0) + Math.max(0, s.u - 6.8) * (s.k % 2 ? -0.24 : 0.24), 1.3, BANK_LIP - 0.6 + (s.k % 2 ? 0.5 : 0)];
    if (age < 1 / 30) muzzle(glowsFront, lights, shooter, 0.9, 12);
    if (age < 0.08) tracer(tris, shooter, [s.x, 0.25, s.z], age / 0.08, camera, 0.016);
    splash(tris, camera, [s.x, 0.2, s.z], age, s.k + 40);
  }

  return scene({ tris, camera, env, glowsFront, lights }, [], {
    ...layer(near, camera, env, 9),
    mist: { color: u < 13 ? "#8a7e64" : "#b97a58", alpha: 0.2 + sm(13, 18, u) * 0.16 },
    under,
    grade: { bloom: 0.2, contrast: 1.1, saturate: 0.62 + sm(13, 18, u) * 0.12, tint: u < 13 ? "#a9b58e" : "#d68a58", tintAmount: 0.08 + sm(13, 18, u) * 0.08 },
    black: 0,
  });
}

function vestAt(p: V3, turn: number): Tri[] {
  const out: Tri[] = [];
  const c = Math.cos(turn), s = Math.sin(turn);
  const q = (x: number, y: number): V3 => [p[0] + x * c, p[1] + y, p[2] + x * s];
  poly(out, [q(-0.16, -0.2), q(0.16, -0.2), q(0.14, 0.2), q(-0.14, 0.2)], VEST);
  return out;
}
