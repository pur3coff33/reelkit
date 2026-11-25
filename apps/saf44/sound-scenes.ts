// The film's sound, scene by scene, reading the same lists as the picture. Nothing here is capped: the mix makes a shot the
// loudest thing in the film. Effects only; the score is in music.ts.
import { Mix, SR, svf } from "../../src/kit/music/synth";
import { ALL_ROUND, CALL, CEASE, FIFTEEN, FIRST_SHOT, FIRST_SHOTS, ONE_HOUR, RESUME, RUNNING_OUT, STRAFE, UNDER } from "./fire";
import { closeRifle, farRifle, incomingSnap, midRifle, mortar, slice, warRecording, waterStrike, type Stereo } from "./gunfire";
import { FIELD_FALLS, MARSH_FIRE, type Round } from "./mapclock";
import { WEIGHT_MEN, walked } from "./scenes";
import { bicycle, bird, clank, diesel, gravelStep, mudStep, phosphorus, putter, seeded, wading, whistle } from "./sfx";
import { SCENES as S, WP_FILM } from "./timeline";

const pan = (k: number, seed: number, width: number) => {
  const a = Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453;
  return (a - Math.floor(a) - 0.5) * width;
};
function noise(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 2147483648 - 1;
  };
}

/** Wind and leaves, shaped by `gain`, in seconds from the start of the bed. */
export function windBed(seconds: number, seed: number, cutoff: number, gain: (t: number) => number) {
  const rnd = noise(seed);
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let lp = 0;
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    lp += k * (rnd() - lp);
    out[i] = lp * (0.6 + 0.3 * Math.sin(t * 0.31 + seed) + 0.1 * Math.sin(t * 0.83)) * gain(t);
  }
  return out;
}

const bank = <T,>(n: number, make: (seed: number) => T) => {
  const list = Array.from({ length: n }, (_, i) => make(i * 41 + 3));
  return (k: number) => list[k % n];
};
const close = bank(10, (s) => closeRifle(s));
const mid = bank(10, (s) => midRifle(s + 500, true));
const midUs = bank(8, (s) => midRifle(s + 900));
const far = bank(8, (s) => farRifle(s + 700, true));
const snaps = bank(8, (s) => incomingSnap(s + 7));
const strikes = bank(8, (s) => waterStrike(s + 5));

function ours(s: Mix, list: Round[], at: number, gain = 0.9) {
  for (const q of list) s.add(close(q.k), at + q.t, gain * (0.86 + 0.14 * Math.abs(Math.sin(q.k * 7.31))), pan(q.k, 3, 0.8), 0.14);
}
/** Fire coming this way: the snap gets here before the sound does. */
function theirs(s: Mix, list: Round[], at: number, snap = 0.55, report = 0.6) {
  for (const q of list) {
    if (q.k % 2 === 0) s.add(snaps(q.k), at + q.t, snap, pan(q.k, 5, 1.2), 0.1);
    s.add(mid(q.k), at + q.t + 0.12, report, pan(q.k, 7, 1), 0.35);
  }
}
function distant(s: Mix, list: Round[], at: number, gain: number, delay = 0.2) {
  for (const q of list) s.add(far(q.k), at + q.t + delay, gain * (0.7 + 0.3 * Math.abs(Math.sin(q.k * 2.3))), pan(q.k, 9, 1.4), 0.4);
}
function loose(s: Mix, from: number, to: number, seed: number, every: number, fn: (t: number, k: number, r: () => number) => void) {
  const r = seeded(seed);
  for (let t = from, k = 0; t < to; t += every * (0.5 + r()), k++) fn(t, k, r);
}
const birds = (s: Mix, from: number, to: number, seed: number, gain = 0.03) => loose(s, from, to, seed, 0.9, (t, k, r) => s.add(bird(Math.round(t * 37) + k), t, gain * (0.6 + r() * 0.8), (r() - 0.5) * 1.5, 0.5));

/** The line going by: a boot on every footfall the picture shows, and kit shifting. Closer men are louder. */
export function addWeight(s: Mix, at: number, u0: number, seconds: number) {
  for (let i = 0; i < WEIGHT_MEN; i++) {
    const step = 0.56;
    let last = Math.floor(walked(i, u0) / step);
    for (let u = u0; u < u0 + seconds; u += 0.01) {
      const now = Math.floor(walked(i, u) / step);
      if (now !== last) {
        last = now;
        const z = i * 3.4 - walked(i, u) + 11;
        const near = 1 / (1 + Math.abs(z) * 0.28);
        s.add(mudStep(Math.round(u * 100) + i * 31), at + u - u0, 3.4 * near, pan(i, 2, 0.8) + 0.2, 0.08);
        if (now % 3 === 0) s.add(clank(Math.round(u * 37) + i, 0.5), at + u - u0 + 0.03, 0.55 * near, pan(i, 3, 0.8), 0.25);
      }
    }
  }
  s.add(windBed(seconds, 11, 420, () => 1.6), at, 1, -0.1, 0.05);
}

/** Birds, then nothing, then all of it at once. */
export function addFirstShots(s: Mix, at: number, rec: Stereo) {
  const r = noise(900);
  for (let u = 0.1; u < FIRST_SHOT - 1.5; u += 0.34 + (r() + 1) * 0.6) s.add(bird(Math.round(u * 37)), at + u, 0.018 + (r() + 1) * 0.012, r() * 0.8, 0.5);
  s.add(windBed(12, 21, 700, (t) => (t < FIRST_SHOT ? 0.16 : 0.2)), at, 1, 0.1, 0.05);
  ours(s, FIRST_SHOTS.we, at);
  for (const q of FIRST_SHOTS.they) {
    if (q.k % 2 === 0) s.add(snaps(q.k), at + q.t, q.k === 0 ? 0.95 : 0.55, pan(q.k, 5, 1.2), 0.1);
    s.add(mid(q.k), at + q.t + 0.12, q.k === 0 ? 1 : 0.6, pan(q.k, 7, 1), 0.35);
  }
  // The land carrying the rest of it, from the recording: a firefight, a long way off, and rising.
  s.add(slice(rec, 0.3, 2.5, 0.1), at + FIRST_SHOT + 0.5, 0.26, -0.2, 0.3);
  s.add(slice(rec, 4.9, 7.2, 0.1), at + FIRST_SHOT + 2.8, 0.3, 0.2, 0.3);
  for (const [i, m] of FIRST_SHOTS.mortars.entries()) s.add(mortar(30 + i, slice(rec, 7.55, 10.3, 0.005)), at + m, 1, (i % 2 ? 1 : -1) * 0.25, 0.25);
}

/** On the bank, in the water, under the water. Heard from under it, everything is low and far away. */
export function addElevenHours(s: Mix, at: number) {
  const seconds = 18;
  const under = (u: number) => {
    const a = Math.min(1, Math.max(0, (u - UNDER.from) / 0.4)), b = Math.min(1, Math.max(0, (u - (UNDER.to - 0.2)) / 0.5));
    return a * (1 - b);
  };
  const air = new Mix(seconds + 1);
  for (const q of STRAFE) {
    air.add(midUs(q.k), q.u, 0.85, q.k % 2 ? 0.25 : -0.25, 0.2);
    air.add(strikes(q.k), q.u + 0.05, 0.95, pan(q.k, 4, 0.9), 0.12);
  }
  const muffle = (x: Float32Array) => {
    const low = svf(x, 340, 0.8, "low");
    return x.map((v, i) => {
      const k = under(i / SR);
      return v * (1 - k) + low[i] * k * 1.8;
    });
  };
  s.add([muffle(air.L), muffle(air.R)], at, 1, 0, 0);
  s.add(windBed(seconds, 31, 640, (u) => 0.24 * (1 - under(u)) * (u < 13 ? 1 : 0.7)), at, 1, 0.1, 0.05);
  s.add(wading(3.8, 7), at + 2.5, 0.2, -0.05, 0.2);
  // Blood in the ears: a slow pulse while he's under. It fades before he comes up.
  const heart = new Float32Array(Math.round(seconds * SR));
  const rnd = noise(55);
  for (let u = UNDER.from + 0.2; u < UNDER.to; u += 0.92) {
    for (const off of [0, 0.22]) {
      const st = Math.round((u + off) * SR);
      for (let i = 0; i < SR * 0.2; i++) {
        const t = i / SR;
        heart[st + i] += Math.sin(2 * Math.PI * 52 * t) * Math.exp(-t * 26) * (off ? 0.6 : 1);
      }
    }
  }
  s.add(heart, at, 0.55, 0, 0);
  const press = new Float32Array(Math.round(seconds * SR));
  let lp = 0;
  for (let i = 0; i < press.length; i++) {
    lp += 0.008 * (rnd() - lp);
    press[i] = lp * under(i / SR) * 3;
  }
  s.add(press, at, 1, 0, 0);
  // Far off, the fire goes on. Then less of it. Then none, by the end of the scene.
  const r = noise(700);
  for (let u = 13.2, k = 0; u < 16.5; u += 0.4 + (r() + 1) * (0.5 + (u - 13) * 0.3), k++) {
    const f = mid(k);
    s.add([svf(f[0], 500, 0.7, "low"), svf(f[1], 500, 0.7, "low")], at + u, 0.28 * (1 - (u - 13) / 4), pan(k, 8, 1), 0.5);
  }
}

// ── Notes for the markers ─────────────────────────────────────────────────────────────────────────────

const NOTES = ["D3", "F3", "A3", "E3", "D3", "A2", "F3", "C4", "A3", "D3", "Bb2", "F3", "E3", "A3", "D4", "C4", "A3", "F3", "D3", "E3", "G3", "A3", "F3", "D3", "A2", "C3", "E3", "F3", "A3", "D4", "E4", "D4", "A3", "F3", "D3"];
/** One soft note for each of the 35 markers, in the same order and at the same moment they appear on the map. */
export const FIELD_NOTES = FIELD_FALLS.map((fall, i) => ({ at: S.markers.from + (fall - 157) / 2, note: NOTES[i] }));

// ── Radio ─────────────────────────────────────────────────────────────────────────────────────────────

function radio(seconds: number, seed: number) {
  const rnd = noise(seed);
  const n = Math.round(seconds * SR);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    raw[i] = rnd() * Math.min(1, t / 0.01) * Math.min(1, (seconds - t) / 0.03) * (0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 11));
  }
  return svf(raw, 1900, 1.1, "band");
}

/** A blast's ring in the ears, thin and very high, fading. */
function ringing(seconds: number) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = Math.sin(2 * Math.PI * 3900 * t) * Math.exp(-t * 0.8) * Math.min(1, t * 5);
  }
  return out;
}

// ── The whole film ────────────────────────────────────────────────────────────────────────────────────

export async function addEffects(s: Mix) {
  const rec = await warRecording();
  const r = seeded(404);

  // Boats: water against a hull, and it turning over.
  s.add(wading(6, 12), S.boats.from, 0.32, -0.1, 0.3);
  s.add(clank(70, 0.4), S.boats.from + 2.2, 0.12, 0.2, 0.3);

  // Rehearsal: boots on hard ground, going by.
  loose(s, S.practice.from + 1, S.practice.to, 501, 0.24, (t, k) => s.add(gravelStep(k + 40), t, 0.2, 0.5 - ((t - S.practice.from) / 16) * 1, 0.12));

  // Trucks: the engine for a whole scene, the bed rattling, nobody speaking. It cuts out at the drop-off.
  s.add(diesel(S.dropOff.from + 1.6 - S.trucks.from, 20, 1), S.trucks.from, 0.7, 0.05, 0.04);
  s.add(diesel(S.dropOff.from + 1.6 - S.trucks.from, 17, 2), S.trucks.from, 0.4, -0.1, 0.04);
  loose(s, S.trucks.from + 0.4, S.dropOff.from + 1, 502, 1.4, (t, k, q) => s.add(clank(k + 10, 0.6), t, 0.12 + q() * 0.1, (q() - 0.5) * 0.8, 0.2));
  // Boots coming down off the tailgate onto the road.
  s.add(clank(11, 1.1), S.dropOff.from + 1.2, 0.3, 0.34, 0.5);
  loose(s, S.dropOff.from + 1.6, S.dropOff.to, 503, 0.42, (t, k, q) => s.add(gravelStep(k + 60), t, 0.2, (q() - 0.5) * 0.7, 0.15));

  addWeight(s, S.weight.from, 0, S.weight.to - S.weight.from);

  // The last river: water around legs, for a long time.
  s.add(wading(S.lastRiver.to - S.lastRiver.from, 7), S.lastRiver.from, 0.26, -0.1, 0.25);
  s.add(wading(S.lastRiver.to - S.lastRiver.from - 4, 9), S.lastRiver.from + 2.6, 0.17, 0.25, 0.25);

  // The huts: all at once.
  s.add(mortar(4, slice(rec, 7.55, 10.3, 0.005)), S.fifteen.from, 1, -0.05, 0.3);
  for (const q of FIFTEEN.we) s.add(midUs(q.k), S.fifteen.from + q.t, 0.62, pan(q.k, 3, 0.5), 0.25);
  for (const q of FIFTEEN.they) s.add(mid(q.k), S.fifteen.from + q.t, 0.52, pan(q.k, 4, 0.3), 0.25);

  // Then a ring in the ears, and a radio finding its way through it.
  s.add(ringing(9), S.bingo.from - 0.4, 0.01, 0.1, 0);
  s.add(radio(0.36, 50), S.bingo.from + 0.9, 0.26, 0.2, 0.2);
  s.add(radio(0.2, 51), S.bingo.from + 4.5, 0.2, 0.2, 0.2);

  // Awake: boots at a run, and fire from all sides, a long way off.
  loose(s, S.awake.from + 0.4, S.awake.to, 504, 0.2, (t, k, q) => s.add(mudStep(k + 70), t, 0.44 + 0.3 * q(), (q() - 0.5) * 0.7, 0.1));
  distant(s, ALL_ROUND, S.awake.from, 0.4);

  // The bridge: what they're hearing, from 1.8 km. Boots, starting and stopping.
  loose(s, S.bridge.from + 0.3, S.bridge.to, 505, 0.42, (t) => s.add(far(Math.round(t * 7)), t, 0.09 + r() * 0.06, -0.3 + r() * 0.2, 0.5));
  loose(s, S.bridge.from + 0.2, S.bridge.from + 4.4, 506, 0.3, (t, k) => s.add(mudStep(k + 90), t, 0.46, pan(k, 1, 0.8), 0.1));
  loose(s, S.bridge.from + 14, S.bridge.from + 23.6, 507, 0.3, (t, k) => s.add(mudStep(k + 110), t, 0.42, pan(k, 2, 0.8), 0.1));

  // Morning: birds, and an ordinary day getting going.
  birds(s, S.morning.from, S.morning.to, 508, 0.04);
  loose(s, S.morning.from + 1, S.morning.to, 509, 0.46, (t, k) => s.add(gravelStep(k + 150), t, 0.05, 0.2, 0.2));

  // Across the river: birds, until they stop. Then only corn. Then First Shots has its own.
  birds(s, S.across.from, S.across.from + 14, 510, 0.04);

  addFirstShots(s, S.firstShots.from, rec);

  // The call: the radio, and close fire behind it.
  ours(s, CALL.we, S.call.from, 0.5);
  theirs(s, CALL.they, S.call.from, 0.4, 0.42);
  for (const [i, m] of CALL.mortars.entries()) s.add(mortar(70 + i), S.call.from + m, 0.62, (i % 2 ? 1 : -1) * 0.3, 0.3);
  s.add(radio(0.44, 60), S.call.from + 0.5, 0.3, 0.1, 0.1);
  s.add(radio(0.3, 61), S.call.from + 3.4, 0.26, 0.1, 0.1);
  s.add(radio(0.4, 62), S.call.from + 6.2, 0.3, 0.1, 0.1);

  // The artillery, not firing: nothing added but the fire they could be answering, a long way off.
  loose(s, S.guns.from, S.guns.to, 511, 0.34, (t, k) => s.add(far(k), t, 0.22, 0.3, 0.5));

  // The road: engines, idling. Fire over the marsh.
  s.add(diesel(S.road.to - S.road.from + 0.6, 21, 3), S.road.from - 0.3, 0.55, -0.2, 0.08);
  s.add(diesel(S.road.to - S.road.from + 0.6, 18.5, 4), S.road.from - 0.3, 0.38, 0.3, 0.08);
  loose(s, S.road.from, S.road.to, 512, 0.34, (t, k) => s.add(far(k), t, 0.16, -0.3, 0.5));

  // The open ground: their fire, already tired by the time it gets here.
  for (const q of MARSH_FIRE) {
    s.add(mid(q.k), S.openGround.from + q.t - 145 + 0.25, 0.26, pan(q.k, 3, 0.8), 0.45);
    if (q.k % 3 === 0) s.add(snaps(q.k), S.openGround.from + q.t - 145, 0.24, pan(q.k, 6, 1), 0.12);
  }

  // One Hour. The firing, the silence, and all of it again.
  ours(s, ONE_HOUR.we, S.oneHour.from, 0.85);
  theirs(s, ONE_HOUR.they, S.oneHour.from, 0.55, 0.6);
  for (const [i, m] of ONE_HOUR.mortars.entries()) {
    s.add(whistle(0.7, 120 + i), S.oneHour.from + m - 0.7, 0.1, 0.1, 0.3);
    s.add(mortar(80 + i, slice(rec, 7.55, 10.3, 0.005)), S.oneHour.from + m, 0.92, -0.3 + i * 0.3, 0.25);
  }
  s.add(windBed(RESUME - CEASE, 41, 520, (t) => 0.2 * Math.min(1, t / 1.4, (RESUME - CEASE - t) / 0.08 + 0.001)), S.oneHour.from + CEASE, 1, 0, 0.05);
  s.add(radio(0.18, 66), S.oneHour.from + CEASE - 0.5, 0.2, 0.2, 0.1);
  birds(s, S.oneHour.from + CEASE + 3, S.oneHour.from + RESUME - 1, 513, 0.016);

  // Running out: fewer of theirs answered, and a rifle's dry click.
  ours(s, RUNNING_OUT.we, S.runningOut.from, 0.8);
  theirs(s, RUNNING_OUT.they, S.runningOut.from, 0.44, 0.5);
  for (const [i, m] of RUNNING_OUT.mortars.entries()) s.add(mortar(90 + i), S.runningOut.from + m, 0.7, 0.25, 0.3);
  s.add(clank(201, 0.5), S.runningOut.from + 1.8, 0.2, -0.1, 0.1);

  // The markers: fire, thinning out, seen from a long way up.
  loose(s, S.markers.from, S.markers.to, 514, 0.3, (t, k) => {
    const left = 1 - (t - S.markers.from) / 12;
    if (r() < left) s.add(far(k), t, 0.24 * left, pan(k, 7, 1.2), 0.5);
  });

  // The crawl: corn on cloth. After it, wind and nothing else.
  loose(s, S.lastOfThem.from, S.lastOfThem.from + 6, 515, 0.5, (t, k) => s.add(mudStep(k + 170), t, 0.16, 0.05, 0.1));
  loose(s, S.lastOfThem.from, S.lastOfThem.from + 5, 516, 0.5, (t, k) => s.add(far(k), t, 0.14, -0.3, 0.5));

  addElevenHours(s, S.eleven.from);

  // The bottle: fire a long way off, and it never quite stops.
  loose(s, S.bottle.from, S.bottle.to, 517, 0.6, (t, k) => s.add(far(k), t, 0.14, pan(k, 11, 1.4), 0.5));

  // Last Stand: almost nothing. Some of it far away, and then less.
  loose(s, S.lastStand.from + 0.5, S.lastStand.to, 518, 0.9, (t, k) => s.add(far(k), t, 0.09 * (1 - (t - S.lastStand.from) / 22), pan(k, 12, 1.2), 0.6));

  // The three rounds.
  for (const [i, t] of WP_FILM.entries()) s.add(phosphorus(200 + i), t, 0.62, -0.15 + i * 0.15, 0.55);

  // Lights: boots and kit coming through the dark.
  loose(s, S.lights.from + 0.4, S.lights.to, 519, 0.42, (t, k, q) => s.add(mudStep(k + 190), t, 0.1 + 0.26 * ((t - S.lights.from) / 14), 0.1 + (q() - 0.5) * 0.6, 0.2));

  // The tractors, and the ambulance idling.
  s.add(putter(S.ninth.to - S.ninth.from + 0.8, 8.6, 5), S.ninth.from - 0.4, 0.16, -0.1, 0.22);
  s.add(putter(S.ninth.to - S.ninth.from + 0.8, 7.7, 6), S.ninth.from - 0.4, 0.11, 0.25, 0.22);
  s.add(diesel(S.ninth.to - S.ninth.from + 0.8, 14, 7), S.ninth.from - 0.4, 0.1, 0.4, 0.12);

  // The bicycle, on a road with birds on it.
  s.add(bicycle(S.bicycle.to - S.bicycle.from, 8), S.bicycle.from, 0.5, 0.05, 0.1);
  birds(s, S.bicycle.from, S.bicycle.to, 520, 0.03);

  // The halyard against the pole, and the flag.
  loose(s, S.halfMast.from, S.halfMast.to, 521, 1.1, (t, k) => s.add(clank(k + 220, 0.36), t, 0.11, 0.1, 0.5));
  s.add(windBed(S.halfMast.to - S.halfMast.from, 51, 1300, () => 0.24), S.halfMast.from, 1, 0, 0.05);

  // The bridge, and the last field: only what's living there.
  birds(s, S.cost.from, S.cost.to, 522, 0.02);
  birds(s, S.lastField.from, S.lastField.to - 2, 523, 0.024);
}
