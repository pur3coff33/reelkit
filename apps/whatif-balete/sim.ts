// What's on screen at reel time t in EP 05: a balete in a forest clearing (at the origin), a tent and a fire under it,
// three friends, the kapre on a branch, the trail down to the barrio (+z) and a second trail through the forest (x = 40).
import { add, hex, mixRGB, scale, type Camera, type Env, type Glow, type PointLight, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { fbm, octa, poseFn, rng, shotCamera, smooth, vary, type Shot } from "../../src/kit/lowpoly/world";
import { limb, person, villager, type Look } from "../typhoon/models";
import { kubo } from "../santelmo/models";
import { beam, smoke } from "../../src/kit/whatif/props";
import type { Built, Fx } from "../../src/kit/whatif/Reel";
import type { Grade } from "../../src/kit/whatif/cinema";
import {
  CROUCH, ENV, SIT_LOG, wisp, campfire, camper, domeTent, facing, forest, grass, ground, hikerLook, lantern, mist, moonGlow, packColor, paintBy, setView, stride, type GroundSpec,
} from "../../src/kit/whatif/camp";
import { SHOTS, bpmAt, emberAt, eyesAt, local, shotAt, type ShotName } from "./timeline";

// ── The ground ───────────────────────────────────────────────────────────────────────────────────────

export const trailX = (z: number) => 1.5 * Math.sin(z * 0.05);
const clearing = (x: number, z: number) => Math.hypot(x, (z - 3) * 0.75);

export function H(x: number, z: number) {
  const h = 0.9 * fbm(x * 0.04, z * 0.04, 3, 2) * smooth(10, 17, clearing(x, z));
  return h - Math.max(0, z - 70) * 0.18;
}
const on = (x: number, z: number, dy = 0): V3 => [x, H(x, z) + dy, z];

const LEAF_LITTER = hex("#3a3424"), MOSS = hex("#2e3e26"), DIRT = hex("#4a3e2e");
const GROUND: GroundSpec = {
  key: "balete-near", x0: -60, z0: -50, x1: 60, z1: 140, cell: 2.5, height: H, seed: 3,
  paint: (x, z, h, slope, r) => {
    const onTrail = (z > 8 && Math.abs(x - trailX(z)) < 1.2) || (Math.abs(x - 40) < 1.1 && z > -40 && z < 30);
    const base = onTrail ? DIRT : clearing(x, z) < 13 ? mixRGB(LEAF_LITTER, MOSS, 0.4) : mixRGB(MOSS, LEAF_LITTER, fbm(x * 0.1, z * 0.1, 2, 4) + 0.5);
    return vary(base, Math.round(x * 13 + z * 7), 0.08 + r * 0.04);
  },
};
const FAR: GroundSpec = { key: "balete-far", x0: -600, z0: -600, x1: 600, z1: 800, cell: 40, height: (x, z) => H(x, z) - 3, seed: 4, zBias: 200, paint: paintBy({ flat: hex("#24321e"), steep: hex("#2a2e22") }), skip: (x, z) => x > -55 && x < 55 && z > -45 && z < 135 };

const CLEARINGS: [number, number, number][] = [[40, -6, 3], [-18, 7, 4], [-7, 9, 3.5], [0.5, 56, 3]];
const treesAt = (x: number, z: number) => {
  if (clearing(x, z) < 16) return 0;
  if (z > 8 && z < 98 && Math.abs(x - trailX(z)) < 2.4) return 0;
  if (Math.abs(x - 40) < 2.6 && z > -40 && z < 30) return 0;
  if (Math.abs(z - 6.5) < 2.4 && x < -10 && x > -45) return 0;
  for (const [qx, qz, r] of CLEARINGS) if ((x - qx) ** 2 + (z - qz) ** 2 < r * r) return 0;
  if (z > 96) return 0.2;
  return 0.82;
};

function world(out: Tri[], cam: Camera, t: number, far: number) {
  ground(out, cam, GROUND, far);
  ground(out, cam, FAR, 1600);
  forest(out, cam, { seed: 5, x0: -60, z0: -50, x1: 60, z1: 140, spacing: 3.6, density: treesAt, ground: H, kind: "mix", size: [9, 17], far: Math.min(far, 140), sway: 0.06, t });
  grass(out, cam, { x0: -60, z0: -50, x1: 60, z1: 140, step: 0.9, ground: H, color: hex("#3e5a2e"), height: 0.45, where: (x, z) => clearing(x, z) > 5, t, near: 14 });
}

// ── The balete ───────────────────────────────────────────────────────────────────────────────────────

const BARK = hex("#8a7c66"), CORE = hex("#221c16"), CANOPY = hex("#2e4a30");
/** The branch the kapre sits on. */
const PERCH_A: V3 = [-0.9, 9.0, 0.9], PERCH_B: V3 = [-6.5, 10.8, 6.0];
export const PERCH: V3 = add(PERCH_A, scale([PERCH_B[0] - PERCH_A[0], PERCH_B[1] - PERCH_A[1], PERCH_B[2] - PERCH_A[2]], 0.3));
const TENT: V3 = [4, 0, 4.5], FIRE: V3 = [2.5, 0, 8.5];

function balete(out: Tri[], t: number) {
  const r = rng(77);
  limb(out, [0, 0, 0], [0, 10.5, 0], 1.7, 1.2, CORE, 8);
  // The trunk: aerial roots fused into twisting columns.
  for (let i = 0; i < 18; i++) {
    const a0 = (i / 18) * Math.PI * 2 + r() * 0.2, r0 = 2.0 + r() * 0.9, twist = 0.5 + r() * 0.6;
    let prev: V3 = [Math.cos(a0) * r0, -0.1, Math.sin(a0) * r0];
    for (let k = 1; k <= 4; k++) {
      const a = a0 + (twist * k) / 4, rr = r0 + ((1.3 - r0) * k) / 4 + (r() - 0.5) * 0.25;
      const p: V3 = [Math.cos(a) * rr, k * 2.7, Math.sin(a) * rr];
      limb(out, prev, p, 0.34 - k * 0.03, 0.3 - k * 0.03, vary(BARK, i * 5 + k, 0.14), 5);
      prev = p;
    }
  }
  // Buttress roots snaking out over the ground.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + r() * 0.3, len = 4 + r() * 3;
    const mid: V3 = [Math.cos(a + 0.15) * len * 0.55, 0.35, Math.sin(a + 0.15) * len * 0.55];
    limb(out, [Math.cos(a) * 2, 0.6, Math.sin(a) * 2], mid, 0.38, 0.22, vary(BARK, 90 + i, 0.12), 5);
    limb(out, mid, [Math.cos(a - 0.1) * len, 0.02, Math.sin(a - 0.1) * len], 0.22, 0.08, vary(BARK, 70 + i, 0.12), 4);
  }
  // Big limbs, the perch among them, and roots hanging from them.
  const limbs: [V3, V3][] = [[PERCH_A, PERCH_B]];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.6 + r() * 0.4, y0 = 8.2 + r() * 2.4, len = 6 + r() * 3.5;
    limbs.push([[Math.cos(a) * 1.1, y0, Math.sin(a) * 1.1], [Math.cos(a) * len, y0 + 1.8 + r() * 2.2, Math.sin(a) * len]]);
  }
  for (const [a, b] of limbs) {
    const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.6, (a[2] + b[2]) / 2];
    limb(out, a, mid, 0.55, 0.4, BARK, 6);
    limb(out, mid, b, 0.4, 0.16, BARK, 5);
    for (let k = 0; k < 4; k++) {
      const u = 0.35 + k * 0.17;
      const top: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + 0.4, a[2] + (b[2] - a[2]) * u];
      const bottom = 1.2 + r() * 3.5;
      const sway = 0.12 * Math.sin(t * 0.9 + k + top[0]);
      const end: V3 = [top[0] + sway, bottom, top[2] + sway * 0.6];
      if (Math.hypot(end[0] - TENT[0], end[2] - TENT[2]) < 2 || Math.hypot(end[0] - FIRE[0], end[2] - FIRE[2]) < 3) continue;
      limb(out, top, end, 0.05, 0.025, hex("#5a4e40"), 3);
    }
  }
  // The crown: a wide, dark umbrella.
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2, rr = 1.5 + r() * 10;
    const y = 13 + r() * 3.5 - rr * 0.18;
    const g = mixRGB(CANOPY, hex("#3a5a34"), r());
    octa(out, { pos: [Math.cos(a) * rr, y, Math.sin(a) * rr], yaw: r() * 6, size: [2.8 + r() * 1.8, 1.4 + r() * 0.9, 2.8 + r() * 1.8] }, (f) => ({ color: mixRGB(g, [0, 0, 0], (f % 4) * 0.07) }));
  }
}

// ── The kapre ────────────────────────────────────────────────────────────────────────────────────────

const KAPRE: Look = { skin: hex("#4a3a2c"), hair: hex("#0e0c0a"), top: hex("#2a221a"), bottom: hex("#221c16"), shoes: hex("#4a3a2c"), height: 4.4, build: 1.25, hairStyle: "long", faceless: true };
const KH = KAPRE.height / 1.7;

/** Where the kapre's cigar tip is, sitting on the perch facing the camp. */
const kapreYaw = facing(PERCH, TENT);
const kapreT = poseFn({ pos: [PERCH[0], PERCH[1] - (0.92 * KH - 0.95), PERCH[2]], yaw: kapreYaw });
const MOUTH: V3 = [0.05, 1.605 * KH - 0.95 - 0.05, 0.27];
export const CIGAR_TIP = kapreT([0.1, MOUTH[1] - 0.06, MOUTH[2] + 0.5]);

function kapre(out: Tri[], glows: Glow[], lights: PointLight[], t: number, body: boolean) {
  const e = emberAt(t);
  if (body) {
    person(out, KAPRE, { pos: kapreT([0, 0, 0]), yaw: kapreYaw, drop: 0.95, footL: [-0.35, 0.2, 0.6], footR: [0.35, 0.05, 0.4], handR: [0.12, MOUTH[1] - 0.05, MOUTH[2] + 0.12], handL: [-0.35, 1.0, 0.6], headPitch: 0.25, lod: 1 });
    limb(out, kapreT(MOUTH), CIGAR_TIP, 0.05, 0.045, hex("#4a3424"), 4);
    const eyes = eyesAt(t);
    if (eyes > 0.02)
      for (const side of [-1, 1]) {
        const p = kapreT([side * 0.11, MOUTH[1] + 0.16, MOUTH[2] + 0.02]);
        octa(out, { pos: p, size: [0.05, 0.025, 0.02] }, { color: hex("#ffb060"), glow: 1, alpha: eyes });
        glows.push({ p, radius: 0.12, color: [255, 170, 80], alpha: 0.9 * eyes }, { p, radius: 0.5, color: [255, 100, 40], alpha: 0.25 * eyes });
      }
  }
  if (e > 0.02) {
    octa(out, { pos: CIGAR_TIP, size: 0.06 }, { color: hex("#ff7a30"), glow: 1 });
    glows.push({ p: CIGAR_TIP, radius: 0.14, color: [255, 210, 150], alpha: e }, { p: CIGAR_TIP, radius: 0.9, color: [255, 100, 30], alpha: 0.35 * e });
    lights.push({ p: add(CIGAR_TIP, [0, -0.2, 0.3]), color: [255, 120, 50], intensity: 2.6 * e, range: 5.5 });
    wisp(out, add(CIGAR_TIP, [0, 0.05, 0]), [0.2, 0.5, 0.3], t, { n: 14, len: 2.2, alpha: 0.25, seed: 4 });
  }
}

// ── The camp and the friends ─────────────────────────────────────────────────────────────────────────

const J = hikerLook(5, "man", hex("#c8402c")), M = hikerLook(6, "woman", hex("#7a4ab0")), P = hikerLook(7, "man", hex("#2a8a8a"));
/** Inside out: the lighter lining shows. */
const inside = (L: Look): Look => ({ ...L, top: mixRGB(L.top, [255, 252, 240], 0.88), collar: L.top });
const SEATS: V3[] = [on(1.0, 7.4), on(2.5, 6.9), on(4.0, 7.4)];

function camp(out: Tri[], glows: Glow[], lights: PointLight[], t: number, o: { fire: number; tentLit: number }) {
  domeTent(out, glows, on(TENT[0], TENT[2]), facing(TENT, FIRE), { color: hex("#3a7a4a"), lit: o.tentLit, flap: t > 26 && t < 28.6 ? 0.6 * Math.max(0, Math.sin((t - 26) * 6)) : 0, t });
  campfire(out, glows, lights, on(FIRE[0], FIRE[2]), t, { strength: o.fire, seed: 4 });
  for (const s of SEATS) limb(out, add(s, [-0.5, 0.2, 0]), add(s, [0.5, 0.2, 0.1]), 0.2, 0.2, hex("#5c4632"), 6);
  octa(out, { pos: on(5.6, 3.3, 0.25), yaw: 0.5, size: [0.3, 0.3, 0.2] }, { color: packColor(0) });
  octa(out, { pos: on(5.9, 4.1, 0.25), yaw: 1.2, size: [0.25, 0.3, 0.2] }, { color: packColor(3) });
}

/** The three by the fire: telling stories, then turning towards the tree. */
function atFire(out: Tri[], glows: Glow[], t: number, alarm: number) {
  [J, M, P].forEach((L, i) => {
    const p = SEATS[i];
    const talk = i === 1 && t < 15.6 ? { handR: [0.2, 1.1 + 0.08 * Math.sin(t * 5), 0.45] as V3 } : {};
    const sniff = t >= 12.6 && t < 15.6 && i === 2 ? { headYaw: -0.6, headPitch: -0.2 } : {};
    const look = alarm > 0 ? { headYaw: (i - 1) * 0.3, headPitch: -0.55 * alarm } : {};
    camper(out, glows, L, { pos: p, yaw: facing(p, FIRE), ...SIT_LOG, ...talk, ...sniff, ...look, lod: 2 });
  });
}

function village(out: Tri[], glows: Glow[], lit: number) {
  const spots: [number, number, number][] = [[5, 103, -0.4], [-6, 110, 0.3], [8, 118, -0.2], [-3, 124, 0.1], [12, 128, -0.5]];
  for (const [x, z, yaw] of spots) kubo(out, glows, on(x, z), yaw, lit);
  // The trail's start: a post and a hand-painted sign.
  limb(out, on(-1.6, 99), on(-1.6, 99, 1.4), 0.06, 0.06, hex("#5a4632"), 4);
  octa(out, { pos: on(-1.6, 99, 1.35), yaw: 0.3, size: [0.45, 0.18, 0.03] }, { color: hex("#d8c8a0") });
}

// ── Shots ────────────────────────────────────────────────────────────────────────────────────────────

const S = (name: ShotName, pos: [V3, V3], target: [V3, V3], fov: [number, number] = [50, 50], ease?: (x: number) => number): Shot[] => [{ from: SHOTS[name].from, to: SHOTS[name].to, pos, target, fov, ease }];
const lin = (x: number) => x;

const NIGHT: Env = { ...ENV.forestNight, skyTop: hex("#0a1430"), skyBottom: hex("#2a3a60"), fog: hex("#141e32"), fogNear: 14, fogFar: 95, ambient: [64, 76, 104], sunColor: [96, 112, 156] };
const DUSK: Env = { ...ENV.dusk, fogNear: 30, fogFar: 260, fog: hex("#4a4250") };
const PREDAWN: Env = { skyTop: hex("#0c1830"), skyBottom: hex("#4a5a7a"), fog: hex("#2e3a54"), fogNear: 12, fogFar: 150, sun: ENV.night.sun, sunColor: [80, 96, 130], ambient: [52, 60, 84] };
const DAWN: Env = { ...ENV.dawn, fogNear: 6, fogFar: 120, fog: hex("#b4b8bc") };

type Scene = { cam: Camera; env: Env; fx?: Fx; build: (out: Tri[], glows: Glow[], lights: PointLight[]) => void; far?: number; mist?: { color: RGB; alpha: number } };

function scene(t: number): Scene {
  const shot = shotAt(t);
  const u = local(t, shot);
  const fireOn = t >= SHOTS.fire.from && t < SHOTS.run.from ? 1 - 0.45 * smooth(15.6, 18, t) : 0;
  const tentLit = t >= SHOTS.tent.from && t < SHOTS.run.from ? 0.42 : 0;
  const base = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
    balete(out, t);
    camp(out, glows, lights, t, { fire: fireOn, tentLit });
  };
  switch (shot) {
    case "hook": {
      const cam = shotCamera(S("hook", [[5.5, 0.8, 17], [5, 1.0, 14]], [[0, 7.5, 0], [0, 8, 0]], [52, 54], lin), t);
      return { cam, env: NIGHT, build: (o, g, l) => { balete(o, t); camp(o, g, l, t, { fire: 1, tentLit: 0.6 }); atFire(o, g, t, 0); kapre(o, g, l, t, false); } };
    }
    case "warn": {
      const cam = shotCamera(S("warn", [on(-4, 104.5, 1.6), on(-3.2, 103.6, 1.6)], [on(0.4, 98.4, 1.3), on(0.4, 98.4, 1.3)], [48, 46], lin), t);
      const build = (out: Tri[], glows: Glow[]) => {
        village(out, glows, 0.8);
        const lolo = { ...villager(41, "elder"), faceless: false };
        const lp = on(0.8, 99.6);
        person(out, lolo, { pos: lp, yaw: facing(lp, on(0, 97)), handR: [0.35, 1.25, 0.4], headYaw: 0.25 * Math.sin(u * 5), lod: 2 });
        [J, M, P].forEach((L, i) => {
          const p = on(-1.3 + i * 1.2, 97.2 - (i % 2) * 0.4);
          camper(out, glows, L, { pos: p, yaw: facing(p, lp), headYaw: i === 0 ? 0.3 * Math.sin(u * 2) : 0, lod: 2 }, { pack: packColor(i + 1) });
        });
      };
      return { cam, env: DUSK, build, far: 300 };
    }
    case "pitch": {
      const cam = shotCamera(S("pitch", [[10, 2.0, 16], [9, 2.2, 14]], [[1.5, 4.5, 2], [1.5, 4.8, 2]], [52, 52], lin), t);
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        balete(out, t);
        camp(out, glows, lights, t, { fire: 0, tentLit: 0 });
        const jp = on(6.2, 8.2);
        camper(out, glows, J, { pos: jp, yaw: facing(jp, [0, 0, 0]), headPitch: -0.4, handR: [0.3, 1.5, 0.3], lod: 2 });
        const mp = on(5.2, 5.6), pp = on(3.2, 6.6);
        camper(out, glows, M, { pos: mp, yaw: facing(mp, TENT), ...CROUCH, lod: 2 });
        camper(out, glows, P, { pos: pp, yaw: facing(pp, FIRE), ...CROUCH, lod: 2 });
      };
      return { cam, env: { ...DUSK, fogFar: 140 }, build };
    }
    case "fire": {
      const cam = shotCamera(S("fire", [[2.8, 1.9, 15.2], [2.7, 1.8, 14.0]], [[2.4, 1.9, 6.5], [2.4, 1.9, 6.5]], [48, 46], lin), t);
      return { cam, env: NIGHT, build: (o, g, l) => { base(o, g, l); atFire(o, g, t, 0); } };
    }
    case "smell": {
      const cam = shotCamera(S("smell", [[6.4, 1.3, 9.6], [6.1, 1.3, 9.3]], [[3.0, 1.4, 6.6], [3.0, 1.4, 6.6]], [46, 44], lin), t);
      return { cam, env: NIGHT, build: (o, g, l) => { base(o, g, l); atFire(o, g, t, 0); wisp(o, [-0.4, 2.4, 5.4], [1, -0.12, 0.55], t, { n: 22, len: 5.5, alpha: 0.3, seed: 2 }); wisp(o, [0.2, 3.0, 4.8], [1, -0.2, 0.7], t + 2, { n: 18, len: 5, alpha: 0.24, seed: 7 }); } };
    }
    case "silence": {
      const cam = shotCamera(S("silence", [[9, 2.4, 16], [8.2, 2.6, 13.5]], [[1, 6, 1], [1, 6.5, 1]], [50, 50], lin), t);
      return { cam, env: NIGHT, build: (o, g, l) => { base(o, g, l); atFire(o, g, t, smooth(16.5, 18, t)); } };
    }
    case "ember": {
      const cam = shotCamera(S("ember", [[3.0, 1.5, 9.5], [3.0, 1.55, 9.4]], [CIGAR_TIP, CIGAR_TIP], [44, 26]), t);
      return { cam, env: NIGHT, build: (o, g, l) => { base(o, g, l); kapre(o, g, l, t, false); } };
    }
    case "beam": {
      const jp = on(2.6, 9.4);
      const cam = shotCamera(S("beam", [[4.2, 1.75, 11.4], [4.0, 1.8, 11.0]], [[-1.6, 8.6, 2.6], [-1.8, 9.2, 2.4]], [50, 48], lin), t);
      const aim: V3 = [PERCH[0] + 1.6 * Math.sin(u * 1.4), PERCH[1] + 1.2, PERCH[2] + 1.1 * Math.cos(u * 1.1)];
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        base(out, glows, lights);
        const yaw = facing(jp, PERCH);
        camper(out, glows, J, { pos: jp, yaw, handR: [0.18, 1.55, 0.35], headPitch: -0.5, lod: 2 });
        const hand = poseFn({ pos: jp, yaw })([0.18, 1.55, 0.35]);
        beam(out, glows, hand, aim, 1, 0.12);
        lights.push({ p: aim, color: [255, 246, 220], intensity: 2.2, range: 5 });
        [M, P].forEach((L, i) => { const p = on(1.6 + i * 1.6, 8.1 + i * 0.3); camper(out, glows, L, { pos: p, yaw: facing(p, PERCH), headPitch: -0.5, lod: 2 }); });
      };
      return { cam, env: NIGHT, build };
    }
    case "tent": {
      const cam = shotCamera(S("tent", [on(4.4, 13.0, 0.6), on(4.4, 12.6, 0.6)], [on(4, 4.5, 1.1), on(4, 4.5, 1.1)], [52, 52], lin), t);
      const walk = Math.min(1, Math.max(0, (t - 25.9) / 2.7));
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        base(out, glows, lights);
        lantern(out, glows, lights, on(TENT[0], TENT[2], 0.6), 0.4);
        const x = 7.2 - walk * 6, p = on(x, 7.9);
        if (walk > 0 && walk < 1) person(out, KAPRE, { pos: p, yaw: -Math.PI / 2, walk: 0.8, phase: walk * 7, lod: 1 });
      };
      return { cam, env: NIGHT, build, fx: { zoom: [26.1, 26.8, 27.5].some((s) => t > s && t < s + 0.12) ? 0.004 : 0 } };
    }
    case "eyes": {
      const cam = shotCamera(S("eyes", [on(3.6, 6.4, 0.75), on(3.5, 6.2, 0.8)], [add(CIGAR_TIP, [0, 0.3, 0]), add(CIGAR_TIP, [0, 0.45, 0])], [34, 26]), t);
      return { cam, env: { ...NIGHT, ambient: [48, 58, 82] }, build: (o, g, l) => { base(o, g, l); kapre(o, g, l, t, true); l.push({ p: [PERCH[0] - 2, PERCH[1] + 3, PERCH[2] - 3], color: [120, 150, 220], intensity: 1.6, range: 9 }); }, fx: { zoom: t > 30.2 && t < 30.5 ? 0.01 : 0 } };
    }
    case "run": {
      const lead = -22 + u * 5.2;
      const cam: Camera = { pos: on(40.3, lead + 5.5, 1.5), target: on(40, lead - 2, 1.3), fov: 50, roll: 0.02 * Math.sin(t * 7) };
      const build = (out: Tri[], glows: Glow[]) => {
        [J, M, P].forEach((L, i) => {
          const p = on(39.4 + i * 0.7, lead - i * 1.3 - (i === 1 ? 0.6 : 0));
          const lamp = camper(out, glows, L, { pos: p, yaw: 0, ...stride(t, 5, i * 1.3), lod: 2 }, { pack: i === 0 ? packColor(1) : undefined });
          beam(out, glows, add(lamp, [0.2, -0.4, 0.3]), on(39.8 + Math.sin(t * 3 + i) * 0.8, lead + 6, 0.2), 0.3, 0.14);
        });
      };
      return { cam, env: { ...NIGHT, fogFar: 40 }, build, far: 80, mist: { color: hex("#3a4a5a"), alpha: 0.12 } };
    }
    case "loop": {
      const k = smooth(0, 1.6, u);
      const cam = shotCamera(S("loop", [[-21, 1.7, 6.6], [-17.5, 1.7, 6.6]], [[0, 5, 2], [0, 6, 2]], [50, 50]), t);
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        balete(out, t);
        camp(out, glows, lights, t, { fire: 0.25, tentLit: 0.7 });
        [J, M, P].forEach((L, i) => {
          const p = on(-17 + k * 4.5 + i * 0.6, 6.5 + (i - 1) * 1.1);
          camper(out, glows, L, { pos: p, yaw: Math.PI / 2, ...(k < 1 ? stride(t, 4, i) : {}), headPitch: -0.2, lod: 2 }, { lamp: 1 });
        });
      };
      return { cam, env: NIGHT, build };
    }
    case "shirt": {
      const cam = shotCamera(S("shirt", [[-6.6, 1.55, 9.6], [-6.9, 1.5, 9.2]], [[-10.2, 1.25, 6.2], [-10.2, 1.25, 6.2]], [46, 44], lin), t);
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        balete(out, t);
        camp(out, glows, lights, t, { fire: 0.2, tentLit: 0.5 });
        const flip = [41.3, 42.5, 43.0];
        const who: [Look, V3][] = [[M, on(-8.7, 7.7)], [J, on(-10.6, 6.4)], [P, on(-11.0, 7.9)]];
        who.forEach(([L, p], i) => {
          const f = flip[i];
          const up = t > f - 0.6 && t < f + 0.2;
          const look = t >= f ? inside(L) : L;
          camper(out, glows, look, { pos: p, yaw: facing(p, cam.pos) + (i - 1) * 0.3, ...(up ? { handL: [-0.1, 2.0, 0.05], handR: [0.1, 2.0, 0.05], headPitch: 0.2 } : {}), lod: 2 }, { lamp: 0.6 });
        });
      };
      return { cam, env: { ...NIGHT, ambient: [40, 50, 70] }, build };
    }
    case "path": {
      const z = 52 + u * 1.2;
      const cam = shotCamera(S("path", [on(trailX(52) + 0.4, 52, 1.7), on(trailX(57) + 0.4, 57, 1.7)], [on(trailX(90), 90, -1), on(trailX(95), 95, -1.5)], [50, 50], lin), t);
      const build = (out: Tri[], glows: Glow[]) => {
        village(out, glows, 1);
        [J, M, P].forEach((L, i) => {
          const zz = z + 3.5 + i * 1.4;
          const p = on(trailX(zz) + (i - 1) * 0.4, zz);
          camper(out, glows, inside(L), { pos: p, yaw: 0, ...stride(t, 1.4, i), lod: 2 }, { pack: packColor(i + 1) });
        });
      };
      return { cam, env: PREDAWN, build, far: 300, mist: { color: hex("#6a7690"), alpha: 0.1 } };
    }
    case "dawn": {
      const stub: V3 = [-1.5, 0.42, 4.1];
      const cam = shotCamera(S("dawn", [[-0.2, 0.75, 5.6], [-0.4, 0.72, 5.3]], [stub, stub], [44, 40], lin), t);
      const build = (out: Tri[], glows: Glow[], lights: PointLight[]) => {
        balete(out, t);
        camp(out, glows, lights, t, { fire: 0, tentLit: 0 });
        limb(out, stub, add(stub, [0.16, 0.02, 0.05]), 0.03, 0.028, hex("#5a3e26"), 5);
        octa(out, { pos: add(stub, [0.17, 0.02, 0.05]), size: 0.025 }, { color: hex("#ff6a2a"), glow: 0.8 });
        glows.push({ p: add(stub, [0.17, 0.02, 0.05]), radius: 0.06, color: [255, 120, 50], alpha: 0.7 });
        smoke(out, add(stub, [0.17, 0.05, 0.05]), t, 0.45, 41, 0.35);
        [J, M, P].forEach((L, i) => { const p = on(1 + i * 1.1, 9.5 + (i % 2) * 0.6); camper(out, glows, inside(L), { pos: p, yaw: facing(p, stub), headPitch: 0.4, lod: 1 }); });
      };
      return { cam, env: DAWN, build, mist: { color: hex("#c8ccd0"), alpha: 0.12 } };
    }
    case "final":
    default: {
      const cam = shotCamera(S("final", [[7, 1.1, 22], [6, 1.5, 18.5]], [[0, 8.5, 0], [0, 9, 0]], [52, 54], lin), t);
      return { cam, env: DAWN, build: (o, g, l) => { balete(o, t); camp(o, g, l, t, { fire: 0, tentLit: 0 }); }, mist: { color: hex("#c8ccd0"), alpha: 0.14 } };
    }
  }
}

export function baleteFrame(t: number): Built {
  const sc = scene(t);
  setView(sc.cam);
  const tris: Tri[] = [];
  const glows: Glow[] = [];
  const behind: Glow[] = [];
  const lights: PointLight[] = [];
  world(tris, sc.cam, t, sc.far ?? 120);
  sc.build(tris, glows, lights);
  if (sc.mist) mist(tris, sc.cam, { x0: -60, z0: -50, x1: 60, z1: 140, spacing: 7, ground: H, color: sc.mist.color, alpha: sc.mist.alpha, t, seed: 3 });
  if (sc.env !== DAWN && sc.env !== DUSK) behind.push(...moonGlow(sc.cam, undefined, 0.6));
  return { frame: { tris, camera: sc.cam, env: sc.env, glowsFront: glows, glowsBehind: behind, lights }, fx: sc.fx ?? {} };
}

export function baleteGrade(t: number): Grade {
  const shot = shotAt(t);
  if (shot === "warn" || shot === "pitch") return { bloom: 0.45, contrast: 1.1, saturate: 1.05, brightness: 1.06, tint: "#ff9a6a", tintAmount: 0.12 };
  if (shot === "dawn" || shot === "final") return { bloom: 0.4, contrast: 1.08, saturate: 0.95, brightness: 1.1, tint: "#d8c8b0", tintAmount: 0.12 };
  if (shot === "path") return { bloom: 0.5, contrast: 1.1, saturate: 1.0, brightness: 1.12, tint: "#6a80b0", tintAmount: 0.12 };
  return { bloom: 0.62, contrast: 1.14, saturate: 0.95, brightness: 1.18, tint: "#3a7a6a", tintAmount: 0.13 };
}

export { bpmAt };
