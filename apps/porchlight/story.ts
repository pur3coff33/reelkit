// "Leave the Light On": the whole film is one small world, a hill between two houses, from t = 0 to 120 s.
// Everything here is a function of the film's time: who stands where, the camera, the sky, the season, the weather.
// The boy's puppy bolts in a storm and runs over the hill, where a girl takes it in. He never finds it; he leaves the
// light at the gate on every night of his life, until the evening he switches it off himself.
import { DAY, DUSK, NIGHT, boxLook, landAt, mixSky, type BoxCamera, type BoxWorld, type Land, type Pose, type Sky } from "../../src/kit/looks/box/world";
import * as box from "../../src/kit/looks/box/things";
import { H, TAU, W, clamp01, smooth, type Painter, type RGB, type V3 } from "../../src/kit/looks/core";
import { GLASS, bench, crate, fence, grave, lantern, laundry, oak, postLamp, sheet, swingSeat } from "./props";

export const SECONDS = 120;

// ── The land: a ridge down the middle (x = 0), a hollow either side for the two houses ───────────────────────────

export const LAND: Land = {
  waves: [
    { amp: 0.25, fx: 2.33, fz: 0.35, px: Math.PI / 2 },
    { amp: 0.025, fx: 3.7, fz: 2.9, px: 0.4 },
  ],
  tufts: 0.26,
  tuftSize: 0.4,
  path: { points: [[-1.56, -0.12], [-1.42, 0.3], [-1.35, 0.75], [-0.9, 1.05], [0, 1.15], [0.9, 1.05], [1.3, 0.6], [1.14, -0.12]], width: 0.12, color: [0.6, 0.48, 0.34] },
  colorsAt: (t) => seasonColors(seasonAt(t)),
};
const G = (x: number, z: number) => landAt(LAND, x, z);
const ground = (x: number, z: number, dy = 0): V3 => [x, G(x, z) + dy, z];

// Places. Houses face +z; the hero's is on the left (−x), the girl's over the ridge on the right.
const HX = -1.35, GX = 1.35, HZ = -0.6, FRONT = HZ + 0.416;
const DOOR: [number, number] = [HX - 0.208, FRONT + 0.06];
const GDOOR: [number, number] = [GX - 0.208, FRONT + 0.06];
/** Just inside the doors, hidden by the walls: where people come from and go to. */
const IN: [number, number] = [DOOR[0], FRONT - 0.3], GIN: [number, number] = [GDOOR[0], FRONT - 0.3];
const GATE: [number, number] = [-1.35, 0.75];
const LAMP: [number, number] = [-1.57, 0.72];
const BENCH: [number, number] = [-1.86, 0.42];
const CRATE: [number, number] = [-1.2, 0.3];
const OAK: [number, number] = [0, -0.35];
const GTREE: [number, number] = [1.72, 0.22];
const GRAVE: [number, number] = [1.55, 0.55];
const LINE: [number, number] = [-0.98, 0.22];
/** Where the dog shivers, by the girl's door. */
const SHELTER: [number, number] = [GX + 0.02, FRONT + 0.1];
const FACE_Z = Math.PI / 2, FACE_NZ = -Math.PI / 2, FACE_X = 0, FACE_NX = Math.PI;

// ── Moving about ─────────────────────────────────────────────────────────────────────────────────────────────────

type XZ = [number, number];
const HIDE: Pose = { at: [0, -40, 0] };
const within = (t: number, a: number, b: number) => t >= a && t < b;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const toward = (from: XZ, to: XZ) => Math.atan2(to[1] - from[1], to[0] - from[0]);

/** Along a route of points between t0 and t1, easing in and out. Gives where, which way, and how far gone. */
function route(pts: XZ[], t0: number, t1: number, ease = true) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const posAt = (d: number): XZ => {
    d = Math.max(0, Math.min(total, d));
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        const k = lens[i] ? Math.min(1, d / lens[i]) : 0;
        return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
      }
      d -= lens[i];
    }
    return pts[pts.length - 1];
  };
  return (t: number) => {
    const u = ease ? smooth(t0, t1, t) : clamp01((t - t0) / (t1 - t0));
    const d = u * total, [x, z] = posAt(d), a = posAt(d - 0.04), b = posAt(d + 0.04);
    return { x, z, turn: Math.atan2(b[1] - a[1], b[0] - a[0]), d, moving: t > t0 && t < t1 };
  };
}

/** Round and round a point, anticlockwise. */
function circling(c: XZ, r: number, t0: number, t1: number, laps: number) {
  return (t: number) => {
    const a = TAU * laps * smooth(t0, t1, t) - Math.PI / 2;
    return { x: c[0] + r * Math.cos(a), z: c[1] + r * Math.sin(a), turn: a + Math.PI / 2, d: r * TAU * laps * smooth(t0, t1, t), moving: t > t0 && t < t1 };
  };
}

/** Softens a character's moves: where they are, which way they face and how they sit are averaged over a moment either
 *  side, within the shot, so nobody snaps from one move to the next. Strides and wagging (k[0], k[1]) stay sharp. */
function steady(raw: (t: number) => Pose): (t: number) => Pose {
  return (t) => {
    const now = raw(t);
    if (now.at[1] < -5) return now;
    const from = Math.max(0, ...CUTS.filter((c) => c <= t)), to = Math.min(SECONDS, ...CUTS.filter((c) => c > t)) - 1e-4;
    const average = (reach: number, pick: (p: Pose) => number, angle = false) => {
      let sum = 0, n = 0, last: number | undefined;
      for (let i = -5; i <= 5; i++) {
        const p = raw(Math.max(from, Math.min(to, t + (i / 5) * reach)));
        if (p.at[1] < -5) continue;
        let x = pick(p);
        if (angle && last !== undefined) x = last + Math.atan2(Math.sin(x - last), Math.cos(x - last));
        last = x;
        sum += x;
        n++;
      }
      return sum / n;
    };
    const k = now.k ?? [];
    return {
      ...now,
      at: [average(0.1, (p) => p.at[0]), average(0.05, (p) => p.at[1]), average(0.1, (p) => p.at[2])],
      turn: average(0.18, (p) => p.turn ?? 0, true),
      k: [k[0], k[1], average(0.12, (p) => p.k?.[2] ?? 0), average(0.12, (p) => p.k?.[3] ?? 0)],
    };
  };
}

// ── The people ───────────────────────────────────────────────────────────────────────────────────────────────────

type Age = { scale: number; age: number };
const CHILD: Age = { scale: 0.62, age: 0.04 }, CHILD2: Age = { scale: 0.68, age: 0.12 }, TEEN: Age = { scale: 0.86, age: 0.3 };
const YOUNG: Age = { scale: 1, age: 0.42 }, MID: Age = { scale: 1, age: 0.62 }, GREYING: Age = { scale: 1, age: 0.78 }, OLD: Age = { scale: 0.96, age: 0.93 };

/** A person standing or walking: stride from the distance walked. */
function person(a: Age, x: number, z: number, turn: number, o: { d?: number; moving?: boolean; arm?: number; dy?: number; sit?: number; run?: boolean } = {}): Pose {
  const step = (o.run ? 0.14 : 0.1) * a.scale, stride = o.moving ? Math.sin((o.d ?? 0) / step * Math.PI) : 0;
  return { at: ground(x, z, o.dy ?? 0), turn, scale: a.scale, k: [stride * (o.run ? 1 : 0.8), a.age, o.sit ?? 0, o.arm ?? 0] };
}
const walking = (a: Age, w: ReturnType<ReturnType<typeof route>>, o: { arm?: number; run?: boolean; dy?: number } = {}) => person(a, w.x, w.z, w.turn, { d: w.d, moving: w.moving, ...o });
/** Sitting on the bench (seat 0.13 up), facing +x along it; `at` −1…1 slides along the seat. */
const onBench = (a: Age, along = 0, o: { arm?: number } = {}): Pose => {
  const p = person(a, BENCH[0] - 0.02, BENCH[1] - along * 0.09, FACE_X, { sit: 1, arm: o.arm });
  p.at[1] = G(BENCH[0], BENCH[1]) + 0.13 - 0.135 * a.scale + 0.005;
  return p;
};
/** Sitting on the ground. */
const onGround = (a: Age, x: number, z: number, turn: number, o: { arm?: number } = {}) => person(a, x, z, turn, { sit: 1, dy: 0.03 - 0.135 * a.scale, arm: o.arm });
const hop = (t: number, t0: number, t1: number, n = 2, h = 0.05) => (within(t, t0, t1) ? h * Math.abs(Math.sin(((t - t0) / (t1 - t0)) * Math.PI * n)) : 0);

const OAK_Y = G(...OAK);
const swingAngle = (t: number) => {
  if (within(t, 16.8, 20)) return 0.42 * Math.sin((t - 16.8) * 2.7) * smooth(16.8, 17.8, t);
  if (within(t, 60, 64)) return 0.25 * Math.sin((t - 60) * 2.4);
  if (within(t, 76, 80)) return 0.45 * Math.sin((t - 76) * 2.6) * smooth(76, 76.8, t);
  return 0.03 * Math.sin(t * 1.3);
};
/** Sitting on the swing, facing +z. */
const onSwing = (a: Age, t: number): Pose => {
  const s = swingSeat(swingAngle(t));
  return { at: [OAK[0] + s[0] - 0.02, OAK_Y + s[1] + 0.008 - 0.135 * a.scale, OAK[1] + s[2]], turn: FACE_Z, scale: a.scale, k: [0, a.age, 1, 0.25] };
};

// Routes, made once.
const toCrate = route([IN, DOOR, [-1.42, 0.12], [CRATE[0] - 0.17, CRATE[1]]], 6.4, 7.8);
const toSwing = route([[CRATE[0] - 0.17, CRATE[1]], [-1.38, 0.55], GATE, [-0.85, 0.98], [-0.25, 0.5], [OAK[0] + 0.26, OAK[1] + 0.42]], 14, 16.8);
const CHASE: XZ[] = [[LINE[0] - 0.05, LINE[1]], [-1.25, 0.55], [-1.55, 0.5], [-1.6, 0.1], [-1.2, -0.02], [-0.85, 0.1], [-0.85, 0.5], [-1.15, 0.6], [-1.4, 0.4]];
const dogChase = route(CHASE, 22.3, 27, false);
const boyChase = route([[-1.3, 0.3], ...CHASE.slice(1)], 22.9, 27.6, false);
const toGate = route([IN, DOOR, [-1.42, 0.3], [GATE[0] + 0.05, GATE[1] - 0.12]], 36, 37.4);
const toRidge = route([[GATE[0] + 0.05, GATE[1] - 0.12], GATE, [-0.85, 1.0], [-0.28, 0.98]], 40, 43.4);
const toLampKid = route([[BENCH[0], BENCH[1] + 0.02], [LAMP[0] + 0.05, LAMP[1] - 0.13]], 53, 54.2);
const backToBench = route([[LAMP[0] + 0.05, LAMP[1] - 0.13], [BENCH[0] - 0.05, BENCH[1] + 0.02]], 55.6, 56.6);
const lovers = route([[-1.0, 1.0], [-0.4, 1.12], [0.1, 1.13]], 64, 67.8);
const toLampOld = route([[BENCH[0], BENCH[1] + 0.02], [LAMP[0] + 0.06, LAMP[1] - 0.14]], 103.6, 105.2);
const goingIn = route([[LAMP[0] + 0.06, LAMP[1] - 0.14], [-1.45, 0.3], [-1.5, 0.05], DOOR, IN], 107.4, 110);

const hero = steady((t: number): Pose => {
  // The hook: old, on the bench by the lit lamp at nightfall.
  if (t < 6) return onBench(OLD);
  // The puppy.
  if (within(t, 6.4, 7.8)) return walking(CHILD, toCrate(t));
  if (within(t, 7.8, 9.6)) return person(CHILD, CRATE[0] - 0.17, CRATE[1], FACE_X, { arm: within(t, 8, 8.7) ? 0.6 : smooth(9, 9.15, t), dy: hop(t, 9, 9.6) });
  if (within(t, 9.6, 14)) {
    const p = pup(t), me: XZ = [CRATE[0] - 0.17, CRATE[1]];
    return person(CHILD, me[0], me[1], toward(me, [p.at[0], p.at[2]]), { dy: hop(t, 9.6, 14, 6, 0.03), arm: 0.5 + 0.5 * Math.sin(t * 9) });
  }
  if (within(t, 14, 16.8)) return walking(CHILD, toSwing(t), { run: true });
  if (within(t, 16.8, 20)) return onSwing(CHILD, t);
  // The sheet.
  if (within(t, 20, 22.9)) return person(CHILD2, -1.3, 0.3, within(t, 22.3, 22.9) ? toward([-1.3, 0.3], [LINE[0], LINE[1]]) : FACE_Z, { arm: within(t, 22.3, 22.9) ? 0.8 : 0 });
  if (within(t, 22.9, 27.6)) return walking(CHILD2, boyChase(t), { run: true });
  if (within(t, 27.6, 30)) {
    const w = boyChase(27.6);
    return onGround(CHILD2, w.x, w.z, w.turn, { arm: t > 28.3 ? 0.5 + 0.5 * Math.sin(t * 11) : 0 });
  }
  // The storm: he comes out too late.
  if (within(t, 36, 37.4)) return walking(CHILD, toGate(t), { run: true });
  if (within(t, 37.4, 40)) return person(CHILD, GATE[0] + 0.05, GATE[1] - 0.12, FACE_X, { arm: 0.6 + 0.4 * Math.sin(t * 3) });
  if (within(t, 40, 45.4)) {
    const w = toRidge(t);
    return t < 43.4 ? walking(CHILD, w) : person(CHILD, w.x, w.z, FACE_X, { arm: within(t, 43.8, 44.8) ? 1 : 0 });
  }
  // The morning after, and the first night of the light.
  if (within(t, 49, 53)) return onBench(CHILD);
  if (within(t, 53, 54.2)) return walking(CHILD, toLampKid(t));
  if (within(t, 54.2, 55.6)) return person(CHILD, LAMP[0] + 0.05, LAMP[1] - 0.13, FACE_Z, { arm: smooth(54.2, 54.8, t) * (1 - smooth(55.2, 55.5, t)), dy: 0.012 * smooth(54.2, 54.8, t) });
  if (within(t, 55.6, 56.6)) return walking(CHILD, backToBench(t));
  if (within(t, 56.6, 60)) return onBench(CHILD);
  // The years: one vignette a turn of the day.
  if (within(t, 60, 64)) return onSwing(TEEN, t);
  if (within(t, 64, 68)) return walking(YOUNG, lovers(t));
  if (within(t, 68, 72)) return person(YOUNG, LAMP[0] + 0.2, LAMP[1] - 0.12, FACE_X);
  if (within(t, 72, 76)) return onBench(MID);
  if (within(t, 76, 80)) return person(MID, OAK[0] + 0.26, OAK[1] + 0.05, FACE_Z, { arm: 0.4 + 0.3 * Math.sin((t - 76) * 2.6) });
  if (within(t, 80, 84)) return onBench(GREYING, -1);
  if (within(t, 84, 92)) return HIDE;
  if (within(t, 92, 103.6)) return onBench(OLD, t < 100 ? 1 : 0);
  // The last evening: he switches the light off himself, and goes in.
  if (within(t, 103.6, 105.2)) return walking(OLD, toLampOld(t));
  if (within(t, 105.2, 107.4)) return person(OLD, LAMP[0] + 0.06, LAMP[1] - 0.14, FACE_Z, { arm: smooth(105.3, 106, t) * (1 - smooth(106.6, 107.2, t)) * 0.75 });
  if (within(t, 107.4, 110)) return walking(OLD, goingIn(t));
  return HIDE;
});

const wife = steady((t: number): Pose => {
  if (within(t, 64, 68)) {
    const w = lovers(t);
    return person(YOUNG, w.x + 0.12, w.z - 0.17, w.turn, { d: w.d + 0.05, moving: w.moving, arm: 0.15 });
  }
  if (within(t, 68, 72)) return person(YOUNG, LAMP[0] + 0.36, LAMP[1] - 0.12, FACE_NX);
  if (within(t, 72, 76)) return person(YOUNG, DOOR[0] + 0.1, DOOR[1] + 0.08, FACE_Z);
  if (within(t, 80, 84)) return onBench(GREYING, 1);
  if (within(t, 92, 95.6)) return onBench(OLD, -1);
  return HIDE;
});

const kid = steady((t: number): Pose => {
  if (within(t, 72, 76)) {
    const w = circling([-1.35, 0.3], 0.22, 72.2, 75.8, 2);
    return walking(CHILD, w(t), { run: true });
  }
  if (within(t, 76, 80)) return onSwing(CHILD2, t);
  // The grandchild, at dawn.
  if (within(t, 115.4, 120)) {
    const w = t < 116.8 ? route([IN, DOOR, [-1.3, 0.15]], 115.4, 116.8)(t) : circling([-1.3, 0.35], 0.2, 116.8, 120, 1.3)(t);
    return walking(CHILD, w, { run: true, dy: hop(t, 116.8, 120, 8, 0.02) });
  }
  return HIDE;
});

const girlWalk = route([[GX - 0.4, 0.5], [GX + 0.3, 0.55], [GX + 0.45, 0.2]], 64.2, 67.8);
const girlHome = route([[GRAVE[0] - 0.05, GRAVE[1] + 0.33], [GX - 0.1, 0.3], GDOOR, GIN], 89.4, 92);
const girl = steady((t: number): Pose => {
  if (within(t, 45.6, 46.6)) return walking(CHILD, route([GIN, GDOOR, [SHELTER[0] - 0.14, SHELTER[1] + 0.06]], 45.6, 46.6)(t));
  if (within(t, 46.6, 47.6)) return onGround(CHILD, SHELTER[0] - 0.14, SHELTER[1] + 0.06, FACE_X, { arm: 0.4 });
  if (within(t, 47.6, 49)) return walking(CHILD, route([[SHELTER[0] - 0.14, SHELTER[1] + 0.06], GDOOR, GIN], 47.6, 49)(t), { arm: 0.3 });
  if (within(t, 60, 64)) return walking(CHILD2, circling([GX - 0.05, 0.78], 0.2, 60.2, 63.8, 1.5)(t), { run: true });
  if (within(t, 64, 68)) return walking(TEEN, girlWalk(t));
  if (within(t, 68, 72)) return person(TEEN, GX - 0.05, FRONT + 0.2, FACE_Z);
  if (within(t, 72, 76)) return onGround(YOUNG, GX - 0.2, FRONT + 0.2, FACE_Z - 0.3, { arm: 0.15 });
  if (within(t, 76, 80)) return onGround(YOUNG, GTREE[0] - 0.25, GTREE[1] + 0.1, FACE_X);
  if (within(t, 80, 84)) return onGround(MID, GRAVE[0] - 0.05, GRAVE[1] + 0.33, FACE_NZ + 0.2, { arm: 0.35 + 0.12 * Math.sin(t * 2) });
  // She buries it under her tree, with the bandana.
  if (within(t, 84, 89.4)) return onGround(MID, GRAVE[0] - 0.05, GRAVE[1] + 0.33, FACE_NZ + 0.2, { arm: within(t, 85, 87) ? 0.3 : 0 });
  if (within(t, 89.4, 92)) return walking(MID, girlHome(t));
  return HIDE;
});

// ── The dog ──────────────────────────────────────────────────────────────────────────────────────────────────────

type DogAge = { scale: number; age: number };
const PUP: DogAge = { scale: 0.62, age: 0 }, YOUNG_DOG: DogAge = { scale: 0.85, age: 0.1 }, DOG: DogAge = { scale: 0.95, age: 0.2 };
const dogAt = (a: DogAge, x: number, z: number, turn: number, o: { d?: number; moving?: boolean; wag?: number; lie?: number; band?: boolean; dy?: number; t?: number } = {}): Pose => {
  const legs = o.moving ? Math.sin((o.d ?? 0) / (0.05 * a.scale) * Math.PI) : 0;
  const wag = o.wag ?? 0.7;
  return { at: ground(x, z, o.dy ?? 0), turn, scale: a.scale, k: box.dogK(legs, wag * Math.sin((o.t ?? 0) * 14), a.age, o.lie ?? 0, o.band) };
};
const dogWalk = (a: DogAge, w: ReturnType<ReturnType<typeof route>>, t: number, o: { band?: boolean; wag?: number } = {}) => dogAt(a, w.x, w.z, w.turn, { d: w.d, moving: w.moving, t, ...o });

const bolt = route([[GATE[0] + 0.03, GATE[1] - 0.32], GATE, [-0.9, 1.05], [0, 1.15], [0.9, 1.05], [1.3, 0.55], SHELTER], 34.1, 37.6, false);
const sneak = route([[-1.5, 0.45], [-1.3, 0.08], [LINE[0] - 0.12, LINE[1]]], 20.4, 22.3);
const pupJump = (t: number) => {
  const k = smooth(8.6, 9.1, t);
  return { x: lerp(CRATE[0], CRATE[0] + 0.12, k), z: CRATE[1], dy: 0.07 * (1 - k) + 0.12 * Math.sin(k * Math.PI) };
};

function pup(t: number): Pose {
  if (within(t, 6, 8.6)) return { ...dogAt(PUP, CRATE[0], CRATE[1], FACE_X, { dy: -0.2, t }), scale: PUP.scale };
  if (within(t, 8.6, 9.6)) {
    const j = pupJump(t);
    return dogAt(PUP, j.x, j.z, FACE_X, { dy: j.dy, t, wag: 1 });
  }
  if (within(t, 9.6, 14)) return dogWalk(PUP, circling([CRATE[0] - 0.17, CRATE[1]], 0.22, 9.6, 14, 2.5)(t), t, { wag: 1 });
  if (within(t, 14, 16.8)) return dogWalk(PUP, route([[CRATE[0] - 0.05, CRATE[1] + 0.1], [-1.3, 0.55], GATE, [-0.85, 1.08], [-0.2, 0.62], [OAK[0] + 0.15, OAK[1] + 0.62]], 14, 16.8)(t), t, { wag: 1 });
  if (within(t, 16.8, 20)) return dogAt(PUP, OAK[0] + 0.15, OAK[1] + 0.62, FACE_NX + 0.5, { dy: hop(t, 16.8, 20, 7, 0.04), t, wag: 1 });
  return HIDE;
}

const theDog = steady((t: number): Pose => {
  if (t < 20) return pup(t);
  // The sheet.
  if (within(t, 20, 20.4)) return dogAt(YOUNG_DOG, -1.5, 0.45, FACE_X, { t });
  if (within(t, 20.4, 22.3)) return dogWalk(YOUNG_DOG, sneak(t), t, { wag: 0.3 });
  if (within(t, 22.3, 27)) return dogWalk(YOUNG_DOG, dogChase(t), t, { wag: 1 });
  if (within(t, 27, 28.2)) {
    const end = dogChase(27), boy = boyChase(27.6), k = smooth(27.2, 28.1, t);
    const x = lerp(end.x, boy.x + 0.13, k), z = lerp(end.z, boy.z, k);
    return dogAt(YOUNG_DOG, x, z, toward([x, z], [boy.x, boy.z]), { d: k * 0.4, moving: k > 0 && k < 1, t, wag: 1 });
  }
  if (within(t, 28.2, 30)) {
    const boy = boyChase(27.6);
    return dogAt(YOUNG_DOG, boy.x + 0.15, boy.z + 0.02, FACE_NX, { t, wag: 1, dy: hop(t, 28.6, 30, 4, 0.03) });
  }
  // The storm: frightened at the gate, then gone.
  if (within(t, 30, 34.1)) return dogAt(DOG, GATE[0] + 0.03, GATE[1] - 0.32, FACE_Z + 0.4 * Math.sin(t * 1.7), { t, wag: 0, lie: 0.5 });
  if (within(t, 34.1, 37.6)) return dogWalk(DOG, bolt(t), t, { wag: 0 });
  if (within(t, 37.6, 47.6)) return dogAt(DOG, SHELTER[0] + 0.004 * Math.sin(t * 40), SHELTER[1], FACE_X + 0.3, { lie: 1, t, wag: 0 });
  // In her arms, into her house.
  if (within(t, 47.6, 49)) {
    const w = route([[SHELTER[0] - 0.14, SHELTER[1] + 0.06], GDOOR, GIN], 47.6, 49)(t);
    return dogAt({ scale: 0.8, age: 0.2 }, w.x + 0.06 * Math.cos(w.turn), w.z + 0.06 * Math.sin(w.turn), w.turn + Math.PI / 2, { dy: 0.2, lie: 1, t, wag: 0 });
  }
  // Her dog now: the red bandana, and growing old.
  if (within(t, 60, 64)) return dogWalk(DOG, circling([GX - 0.05, 0.78], 0.36, 60.2, 63.8, 1.8)(t), t, { band: true, wag: 1 });
  if (within(t, 64, 68)) {
    const w = girlWalk(t);
    return dogAt({ scale: 0.95, age: 0.35 }, w.x + 0.1 * Math.cos(w.turn), w.z + 0.1 * Math.sin(w.turn) + 0.08, w.turn, { d: w.d, moving: w.moving, t, band: true });
  }
  if (within(t, 68, 72)) return dogAt({ scale: 0.95, age: 0.45 }, GX + 0.12, FRONT + 0.22, FACE_Z, { lie: 1, band: true, t, wag: 0.3 });
  if (within(t, 72, 76)) return dogAt({ scale: 0.95, age: 0.6 }, GX + 0.1, FRONT + 0.24, FACE_Z + 0.6, { lie: 1, band: true, t, wag: 0.4 });
  if (within(t, 76, 80)) return dogAt({ scale: 0.95, age: 0.85 }, GTREE[0] - 0.08, GTREE[1] + 0.12, FACE_NX, { lie: 1, band: true, t, wag: 0.15 });
  if (within(t, 80, 84)) return dogAt({ scale: 0.95, age: 0.97 }, GRAVE[0], GRAVE[1] - 0.02, FACE_Z - 0.25, { lie: 1, band: true, t, wag: 0.05 });
  return HIDE;
});

/** The new puppy at dawn: black, not his dog. */
const newPup = steady((t: number): Pose => {
  if (!within(t, 115.4, 120)) return HIDE;
  const w = t < 116.8 ? route([IN, [DOOR[0] + 0.04, DOOR[1]], [-1.3, 0.05]], 115.4, 116.8)(t) : circling([-1.3, 0.35], 0.3, 116.8, 120, 1.6)(t);
  return dogWalk(PUP, w, t, { wag: 1 });
});

// ── Things that come and go ──────────────────────────────────────────────────────────────────────────────────────

const gateOpen = (t: number) => {
  if (t < 6) return 1.25;
  if (within(t, 14.2, 20)) return 1.3 * smooth(14.2, 14.7, t);
  if (within(t, 30, 34)) return 0.2 + 0.18 * Math.sin(t * 4.3) + 0.1 * Math.sin(t * 7.1);
  // Banged open by the storm; he never shuts it again.
  if (t >= 34) return 1.25 + 0.45 * Math.exp(-(t - 34) * 3) * Math.cos((t - 34) * 18) * (t < 40 ? 1 : 0);
  return 0;
};
const posters = (t: number) => (within(t, 49, 68) ? Math.min(3, 3 * smooth(49.3, 51.2, t) + 0.02) : 0);

/** How dark it is, 0 day … 1 night: drives the lamp, the windows and the stars. */
type Key = [number, Sky & { dark: number }];
const DAWN: Sky = { top: [0.5, 0.48, 0.72], bottom: [0.98, 0.72, 0.6], key: [2.1, 1.45, 1.1], keyFrom: [-0.85, 0.42, 0.4], fill: [0.45, 0.42, 0.62], rim: [0.4, 0.22, 0.2] };
const GOLD: Sky = { top: [0.42, 0.52, 0.78], bottom: [1, 0.74, 0.48], key: [2.7, 1.7, 0.85], keyFrom: [0.75, 0.45, 0.45], fill: [0.45, 0.4, 0.52], rim: [0.45, 0.22, 0.1] };
const STORM: Sky = { top: [0.15, 0.17, 0.23], bottom: [0.07, 0.08, 0.12], key: [0.36, 0.39, 0.48], keyFrom: [-0.3, 0.9, 0.4], fill: [0.13, 0.15, 0.22], rim: [0.05, 0.06, 0.1] };
const GREY: Sky = { top: [0.5, 0.55, 0.6], bottom: [0.72, 0.74, 0.76], key: [1.1, 1.1, 1.15], keyFrom: [-0.3, 0.9, 0.5], fill: [0.45, 0.5, 0.58], rim: [0.1, 0.1, 0.1] };
const NIGHT_SKY: Sky = { ...NIGHT, stars: 1 };
const d = (s: Sky, dark: number) => ({ ...s, dark });
const S = { dawn: d(DAWN, 0.35), day: d(DAY, 0), gold: d(GOLD, 0.12), dusk: d(DUSK, 0.62), night: d(NIGHT_SKY, 1), storm: d(STORM, 0.9), grey: d(GREY, 0.15), eve: d(mixSky(DUSK, NIGHT_SKY, 0.6), 0.85) };

const SKY: Key[] = [
  [0, S.eve], [5.999, S.eve],
  [6, S.dawn], [9, S.day], [29.999, S.day],
  [30, S.storm], [49, S.storm], [49.6, S.grey], [52, S.grey], [53.5, S.dusk], [56.5, S.dusk], [59.5, S.night],
  // The years: a whole day every 4 s, the light on each night.
  ...[60, 64, 68, 72, 76, 80].flatMap((c): Key[] => [[c + 0.7, S.dawn], [c + 1.3, S.day], [c + 2.5, S.day], [c + 3.1, S.dusk], [c + 3.7, S.night]]),
  [83.999, S.night], [84, S.gold], [86.5, S.dusk], [91, S.eve], [91.999, S.eve],
  [92, S.dusk], [95.2, S.dusk], [95.5, S.night], [95.75, S.day], [96, S.dusk],
  [99.999, S.dusk], [100, S.gold], [103, S.gold], [105.5, S.dusk], [108.5, S.night], [111.5, S.night], [115, S.dawn],
];
function skyNow(t: number) {
  const i = Math.max(0, SKY.findLastIndex(([at]) => at <= t));
  const [a, A] = SKY[i], [b, B] = SKY[Math.min(i + 1, SKY.length - 1)];
  const k = b > a ? smooth(a, b, t) : 0;
  return { sky: mixSky(A, B, k), dark: A.dark + (B.dark - A.dark) * k };
}
export const darkness = (t: number) => skyNow(t).dark;

/** The gate lamp, 0…1: on from the first night he lit it, every night, until he switches it off. */
export const lampOn = (t: number) => {
  if (t < 6) return 1;
  if (t < 55) return 0;
  if (t < 56) return smooth(55, 55.25, t);
  // Lit all through the last evening, from before we come back to him.
  if (t < 100) return smooth(0.3, 0.55, darkness(t));
  return 1 - smooth(106.1, 106.9, t);
};
/** When the lamp comes on, and when he switches it off: the score gives each its two notes. */
export const LAMP_LIT = [55.05, 62.9, 66.9, 70.9, 74.9, 78.9, 82.9, 85.6];
export const LAMP_OFF = 106.15;
const heroWindow = (t: number) => {
  if (t < 6) return 0.55;
  if (within(t, 30, 49)) return t > 35.6 ? 1 : 0;
  if (within(t, 105.9, 115)) return t > 109.4 && t < 111 ? 0.9 * (1 - smooth(110.4, 111, t)) : 0;
  if (within(t, 115, 120)) return 0.6 * smooth(115, 115.4, t);
  return 0.9 * smooth(0.45, 0.7, darkness(t));
};
const girlWindow = (t: number) => (within(t, 45, 49) ? smooth(45.2, 45.6, t) : 0.85 * smooth(0.45, 0.7, darkness(t)));

// ── Seasons and weather ──────────────────────────────────────────────────────────────────────────────────────────

/** 0 spring, 1 summer, 2 autumn, 3 winter, and on round again. */
const SEASONS: [number, number][] = [
  [0, 2], [5.999, 2], [6, 0], [19.999, 0], [20, 1], [29.999, 1], [30, 2], [59.999, 2], [60, 1],
  [63.5, 1], [64.3, 2], [67.5, 2], [68.3, 3], [71.5, 3], [72.3, 4], [75.5, 4], [76.3, 5], [79.5, 5], [80.3, 6], [91.999, 6],
  [92, 7], [99.999, 7], [100, 6], [110.5, 6], [114.6, 8], [120, 8],
];
export function seasonAt(t: number) {
  const i = Math.max(0, SEASONS.findLastIndex(([at]) => at <= t));
  const [a, x] = SEASONS[i], [b, y] = SEASONS[Math.min(i + 1, SEASONS.length - 1)];
  return x + (y - x) * (b > a ? smooth(a, b, t) : 0);
}
/** How much of each season (spring, summer, autumn, winter) there is now. */
function seasonMix(s: number) {
  const w = [0, 0, 0, 0], i = Math.floor(s), f = s - i;
  w[((i % 4) + 4) % 4] += 1 - f;
  w[(((i + 1) % 4) + 4) % 4] += f;
  return w;
}
const GRASS: [RGB, RGB][] = [[[0.3, 0.5, 0.27], [0.43, 0.58, 0.3]], [[0.22, 0.4, 0.21], [0.33, 0.48, 0.24]], [[0.45, 0.4, 0.2], [0.56, 0.45, 0.23]], [[0.5, 0.53, 0.64], [0.57, 0.6, 0.71]]];
const TUFT: RGB[] = [[0.5, 0.72, 0.4], [0.4, 0.6, 0.34], [0.72, 0.57, 0.3], [0.8, 0.82, 0.9]];
const blend = (cs: RGB[], w: number[]): RGB => [0, 1, 2].map((c) => cs.reduce((a, col, i) => a + col[c] * w[i], 0)) as RGB;
function seasonColors(s: number) {
  const w = seasonMix(s);
  return { grass: [blend(GRASS.map((g) => g[0]), w), blend(GRASS.map((g) => g[1]), w)] as [RGB, RGB], tuft: blend(TUFT, w) };
}
/** Leaves for the trees: [autumn, snow, blossom]. */
const leaves = (t: number) => {
  const [sp, , au, wi] = seasonMix(seasonAt(t));
  return [au, wi, sp];
};

const rainAt = (t: number) => (within(t, 30, 49.6) ? 1 - smooth(46, 49.6, t) * 0.6 : 0);
export const LIGHTNING = [31.2, 34.0, 36.7, 41.5];
const flash = (t: number) => LIGHTNING.reduce((a, at) => a + (t >= at && t < at + 0.6 ? Math.exp(-(t - at) * 9) * (1 + 0.6 * Math.sin((t - at) * 60)) : 0), 0);

// ── The world ────────────────────────────────────────────────────────────────────────────────────────────────────

const HERO: [RGB, RGB, { legs: RGB }] = [[0.76, 0.3, 0.22], [0.28, 0.17, 0.1], { legs: [0.22, 0.27, 0.4] }];

const world: BoxWorld = {
  land: LAND,
  quality: 0.62,
  cull: true,
  tilt: 6,
  things: [
    box.house({ at: ground(HX, HZ, -0.02), scale: 1.3, k: [0] }, [0.86, 0.76, 0.6], [0.6, 0.23, 0.18], [0.42, 0.5, 0.58]),
    box.house({ at: ground(GX, HZ, -0.02), scale: 1.3, k: [0] }, [0.66, 0.74, 0.78], [0.3, 0.36, 0.5], [0.42, 0.5, 0.58]),
    oak((t) => ({ at: ground(...OAK, -0.02), k: [...leaves(t), swingAngle(t)] })),
    box.tree((t) => ({ at: ground(...GTREE, -0.02), scale: 0.95, k: [] }), [[0.2, 0.42, 0.24], [0.34, 0.5, 0.27]]),
    fence((t) => ({ at: ground(GATE[0], GATE[1], -0.01), k: [gateOpen(t), posters(t)] }), 0.65),
    postLamp((t) => ({ at: ground(...LAMP, -0.01), k: [lampOn(t)] })),
    bench({ at: ground(...BENCH, -0.005), turn: -Math.PI / 2 }),
    box.peg(hero, ...HERO),
    box.peg(wife, [0.22, 0.5, 0.5], [0.48, 0.26, 0.12], { long: true, legs: [0.3, 0.26, 0.3] }),
    box.peg(girl, [0.93, 0.72, 0.26], [0.13, 0.09, 0.08], { long: true, legs: [0.36, 0.26, 0.24] }),
    box.peg(kid, [0.3, 0.46, 0.76], [0.3, 0.2, 0.12]),
    box.dog(theDog),
    box.dog(newPup, [0.15, 0.13, 0.13], [0.95, 0.94, 0.9], [0.09, 0.08, 0.08]),
    crate((t) => (within(t, 6, 20) ? { at: ground(...CRATE, -0.005), k: [smooth(8, 8.6, t)] } : HIDE)),
    laundry((t) => (within(t, 20, 30) ? { at: ground(...LINE, -0.005), turn: Math.PI / 2, k: [t < 22.3 ? 1 : 0] } : HIDE)),
    sheet((t) => {
      if (within(t, 22.3, 28.2)) {
        const p = theDog(t);
        return { at: box.held(p, [0.22, 0.19, 0]), turn: (p.turn ?? 0) + 0.3 * Math.sin(t * 9), k: [t * 12] };
      }
      if (within(t, 28.2, 30)) {
        const p = hero(t), s = p.scale ?? 1;
        return { at: box.held(p, [0.02, 0.6, 0]), turn: p.turn, scale: 1.05 * s + 0.2, k: [t * 3] };
      }
      return HIDE;
    }),
    grave((t) => (t < 6 || t >= 84 ? { at: ground(...GRAVE, -0.01), turn: 0.3 } : HIDE)),
    lantern((t) => (within(t, 40, 45.4) ? { at: box.held(hero(t), [0.03, 0.17, 0.1]), k: [1] } : HIDE)),
  ],
  lamps: (t) => {
    const lit = lampOn(t), carried = within(t, 40, 45.4) ? box.held(hero(t), [0.03, 0.17, 0.1]) : ([0, -40, 0] as V3);
    const lamp = ground(...LAMP, GLASS);
    return [
      { at: [lamp[0], lamp[1], lamp[2] + 0.06], color: [1, 0.66, 0.32], power: (within(t, 92, 100) ? 0.7 : 1.25) * lit, falloff: 5, haze: 1.5 },
      { at: carried, color: [1, 0.6, 0.25], power: within(t, 40, 45.4) ? 1.4 : 0, falloff: 9, haze: 0.9 },
    ];
  },
  castBy: 0,
  sky: (t) => {
    const s = skyNow(t).sky, f = flash(t);
    return f ? { ...s, key: s.key.map((c) => c * (1 + 5 * f)) as V3, fill: s.fill.map((c) => c * (1 + 2.5 * f)) as V3 } : s;
  },
  camera: (t) => cameraAt(t),
};
// Windows: the houses read their window brightness from k[0].
const [heroHouse, girlHouse] = world.things;
heroHouse.pose = (t) => ({ at: ground(HX, HZ, -0.02), scale: 1.3, k: [heroWindow(t)] });
girlHouse.pose = (t) => ({ at: ground(GX, HZ, -0.02), scale: 1.3, k: [girlWindow(t)] });

// ── The camera: shots that move between two framings; a new shot cuts ────────────────────────────────────────────

type Shot = { from: number; to: number; a: BoxCamera; b?: BoxCamera; ease?: [number, number] };
const C = (target: V3, dist: number, yaw: number, lift = 0.32): BoxCamera => ({ target, dist, yaw, lift });

const SHOTS: Shot[] = [
  { from: 0, to: 6, a: C([BENCH[0] + 0.13, -0.04, BENCH[1] + 0.1], 2.1, -0.1, 0.24), b: C([0, 0.05, 0], 14, 0.2, 0.45), ease: [0.9, 5.7] },
  { from: 6, to: 9.6, a: C([CRATE[0] - 0.12, -0.1, CRATE[1]], 2.7, -0.2, 0.3), b: C([CRATE[0] - 0.08, -0.1, CRATE[1]], 2.0, -0.12, 0.28) },
  { from: 9.6, to: 14, a: C([CRATE[0] - 0.14, -0.1, CRATE[1]], 2.1, -0.2, 0.36), b: C([CRATE[0] - 0.14, -0.1, CRATE[1]], 2.3, 0.2, 0.38) },
  { from: 14, to: 20, a: C([-1.15, -0.08, 0.5], 2.9, 0.05, 0.34), b: C([0.24, 0.42, -0.02], 2.6, 0.45, 0.28), ease: [14, 17.5] },
  { from: 20, to: 30, a: C([-1.22, -0.08, 0.28], 2.95, -0.15, 0.38), b: C([-1.22, -0.08, 0.3], 2.7, 0.1, 0.36) },
  { from: 30, to: 34.1, a: C([GATE[0] + 0.05, -0.08, GATE[1] - 0.2], 2.1, -0.3, 0.34), b: C([GATE[0] + 0.05, -0.08, GATE[1] - 0.2], 1.75, -0.2, 0.34) },
  { from: 34.1, to: 37.6, a: C([-1.2, -0.0, 0.8], 3.0, -0.15, 0.34), b: C([1.15, -0.0, 0.4], 3.0, 0.4, 0.34), ease: [34.1, 37.6] },
  { from: 37.6, to: 40, a: C([GATE[0] + 0.15, -0.08, GATE[1] - 0.05], 2.4, 0.35, 0.24), b: C([GATE[0] + 0.15, -0.08, GATE[1] - 0.05], 2.2, 0.3, 0.22) },
  { from: 40, to: 45.4, a: C([0.5, 0.16, 0.4], 6.2, 0.05, 0.38), b: C([0.54, 0.14, 0.4], 5.8, 0.02, 0.37) },
  { from: 45.4, to: 49, a: C([SHELTER[0] - 0.08, -0.12, SHELTER[1] + 0.05], 2.4, 0.45, 0.28), b: C([SHELTER[0] - 0.12, -0.12, SHELTER[1]], 2.6, 0.3, 0.28) },
  { from: 49, to: 52, a: C([BENCH[0] + 0.3, -0.06, BENCH[1] + 0.2], 2.6, 0.0, 0.27), b: C([BENCH[0] + 0.28, -0.06, BENCH[1] + 0.2], 2.4, 0.0, 0.26) },
  { from: 52, to: 56.6, a: C([LAMP[0] - 0.02, -0.04, LAMP[1] - 0.12], 2.2, 0.15, 0.24), b: C([LAMP[0] - 0.02, -0.04, LAMP[1] - 0.12], 2.0, 0.18, 0.22) },
  { from: 56.6, to: 60, a: C([BENCH[0] + 0.2, -0.04, BENCH[1] + 0.1], 2.2, -0.05, 0.24), b: C([-0.6, 0.12, 0.3], 6, 0.15, 0.36) },
// The years: her side (the lamp a spark over the hill), his side, the whole world in snow; hers, his, hers.
  { from: 60, to: 64, a: C([GX - 0.1, 0.06, 0.82], 2.8, 1.52, 0.4), b: C([GX - 0.1, 0.06, 0.82], 2.55, 1.58, 0.38) },
  { from: 64, to: 68, a: C([-0.75, 0.12, 1.0], 2.8, -0.3, 0.3), b: C([-0.15, 0.2, 1.05], 2.8, 0.0, 0.3) },
  { from: 68, to: 72, a: C([0, 0.1, 0], 10, -0.2, 0.45), b: C([0, 0.1, 0], 9.2, 0.2, 0.43) },
  { from: 72, to: 76, a: C([GX, -0.06, 0.06], 2.2, -0.3, 0.34), b: C([GX, -0.06, 0.06], 1.9, -0.22, 0.33) },
  { from: 76, to: 80, a: C([0.26, 0.4, -0.05], 2.6, 0.25, 0.28), b: C([0.26, 0.4, -0.05], 2.4, 0.45, 0.28) },
  // Its favourite spot, framed as its grave will be.
  { from: 80, to: 84, a: C([GRAVE[0] - 0.1, 0.12, GRAVE[1]], 2.4, 1.62, 0.36), b: C([GRAVE[0] - 0.1, 0.12, GRAVE[1]], 2.4, 1.62, 0.36) },
  { from: 84, to: 92, a: C([GRAVE[0] - 0.1, 0.12, GRAVE[1]], 2.4, 1.62, 0.36), b: C([GRAVE[0] - 0.1, 0.1, GRAVE[1]], 2.2, 1.64, 0.34) },
  { from: 92, to: 100, a: C([BENCH[0] + 0.06, -0.02, BENCH[1] + 0.02], 2.0, 1.1, 0.34), b: C([BENCH[0] + 0.06, -0.02, BENCH[1] + 0.02], 1.85, 1.08, 0.33) },
  { from: 100, to: 103.6, a: C([BENCH[0] + 0.13, -0.04, BENCH[1] + 0.1], 2.1, -0.1, 0.24), b: C([BENCH[0] + 0.13, -0.04, BENCH[1] + 0.1], 1.95, -0.1, 0.23) },
  { from: 103.6, to: 107.4, a: C([LAMP[0] - 0.02, -0.03, LAMP[1] - 0.14], 2.2, 0.22, 0.23), b: C([LAMP[0] - 0.02, -0.03, LAMP[1] - 0.14], 1.9, 0.2, 0.21) },
  { from: 107.4, to: 110, a: C([-1.4, 0.0, 0.25], 2.8, 0.3, 0.26), b: C([-1.4, 0.0, 0.2], 3.2, 0.25, 0.28) },
  { from: 110, to: 115, a: C([-1.4, 0.0, 0.2], 3.2, 0.25, 0.28), b: C([0, 0.05, 0], 11, 0.2, 0.44), ease: [110, 114.6] },
  { from: 115, to: 120, a: C([-1.38, -0.1, 0.2], 2.4, 0.05, 0.3), b: C([0, 0.05, 0], 12.5, 0.2, 0.46), ease: [116.6, 119] },
];

function cameraAt(t: number): BoxCamera {
  const s = SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1];
  if (!s.b) return s.a;
  const [e0, e1] = s.ease ?? [s.from, s.to], k = smooth(e0, e1, t), a = s.a, b = s.b;
  const ta = a.target ?? [0, 1, 0], tb = b.target ?? [0, 1, 0];
  return {
    target: [lerp(ta[0], tb[0], k), lerp(ta[1], tb[1], k), lerp(ta[2], tb[2], k)],
    dist: Math.exp(lerp(Math.log(a.dist ?? 13.2), Math.log(b.dist ?? 13.2), k)),
    yaw: lerp(a.yaw, b.yaw, k),
    lift: lerp(a.lift ?? 0.4, b.lift ?? 0.4, k),
  };
}

// ── Weather over the picture ─────────────────────────────────────────────────────────────────────────────────────

const h1 = (i: number, s: number) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function weather(g: CanvasRenderingContext2D, t: number) {
  const [sp, , au, wi] = seasonMix(seasonAt(t)), rain = rainAt(t), f = flash(t);
  // Petals in spring, leaves in autumn, snow in winter, rain in the storm. Only outside the time-lapse's day flicker.
  const calm = within(t, 60, 84) ? 0.35 : 1;
  const fall = (n: number, seed: number, speed: number, sway: number, draw: (x: number, y: number, i: number) => void) => {
    for (let i = 0; i < n; i++) {
      const y = ((h1(i, seed) * (H + 200) + t * speed * (0.7 + 0.6 * h1(i, seed + 1))) % (H + 200)) - 100;
      const x = ((h1(i, seed + 2) * (W + 200) + Math.sin(t * 0.9 + i) * sway + t * sway * 0.4) % (W + 200)) - 100;
      draw(x, y, i);
    }
  };
  g.save();
  if (rain > 0) {
    g.strokeStyle = "rgba(190,205,230,0.35)";
    g.lineWidth = 2;
    g.beginPath();
    fall(Math.round(260 * rain), 1, 2300, 30, (x, y) => {
      g.moveTo(x, y);
      g.lineTo(x - 9, y + 46);
    });
    g.stroke();
  }
  const petals = sp * calm * (t < 30 || t > 110 ? 1 : 0.6), leavesN = au * calm, snow = wi * calm;
  if (petals > 0.02) fall(Math.round(46 * petals), 7, 120, 60, (x, y, i) => {
    g.fillStyle = `rgba(250,${190 + 30 * h1(i, 3)},${205 + 20 * h1(i, 4)},0.85)`;
    g.beginPath();
    g.ellipse(x, y, 7, 4, t * 2 + i, 0, TAU);
    g.fill();
  });
  if (leavesN > 0.02 && !rain) fall(Math.round(34 * leavesN), 9, 150, 80, (x, y, i) => {
    g.fillStyle = ["rgba(214,120,40,0.9)", "rgba(190,80,30,0.9)", "rgba(230,170,60,0.9)"][i % 3];
    g.beginPath();
    g.ellipse(x, y, 9, 4.5, t * 3 + i * 1.7, 0, TAU);
    g.fill();
  });
  if (snow > 0.02) fall(Math.round(180 * snow), 11, 110, 40, (x, y, i) => {
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.beginPath();
    g.arc(x, y, 2 + 3.5 * h1(i, 5), 0, TAU);
    g.fill();
  });
  if (f > 0) {
    g.fillStyle = `rgba(225,232,255,${Math.min(0.55, f * 0.45)})`;
    g.fillRect(0, 0, W, H);
  }
  g.restore();
}

/** The years go by in blinks: the picture dips at each night, where everyone moves on. */
const BLINKS = [64, 68, 72, 76, 80, 95.6];
const blink = (t: number) => Math.max(0, ...BLINKS.map((b) => 1 - Math.abs(t - b) / 0.22));

const painter = (w: BoxWorld): Painter => {
  const picture = boxLook(w);
  return (g, t) => {
    picture(g, t);
    weather(g, t);
    const b = blink(t);
    if (b > 0) {
      g.fillStyle = `rgba(8,8,24,${0.92 * smooth(0, 0.7, b)})`;
      g.fillRect(0, 0, W, H);
    }
  };
};
export const paint = painter(world);
/** The same film, small and quick, for checking movement. */
export const preview = painter({ ...world, quality: 0.22, tilt: 0 });
/** Everyone, for the test that nobody jumps. */
export const CAST: Record<string, (t: number) => Pose> = { hero, wife, kid, girl, dog: theDog, newPup };
/** When the picture cuts (or blinks): the only times anyone may be somewhere new. */
export const CUTS = [...SHOTS.map((x) => x.from), ...BLINKS];
