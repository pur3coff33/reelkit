// Sounds of the outdoors for the camping episodes: thunder near and far, a river and a flood's roar, a campfire, a
// whistle, a heartbeat, the buzz before a strike, wind in a tent. All synthesised, seeded, the same every run.
import { SR, svf } from "../music/synth";
import { shaped } from "../../../apps/typhoon/music";
import { edges } from "./score";

/** Thunder: a crack (if near) and a long rolling rumble. `near` 0 is far off (all rumble), 1 overhead. */
export function thunder(seconds: number, seed: number, near = 0.5) {
  const crackLen = 0.35 * near;
  const raw = shaped(seconds, seed, (t, r) => {
    const roll = (0.55 + 0.45 * Math.sin(t * 5.3 + Math.sin(t * 2.1) * 3)) * (0.6 + 0.4 * Math.sin(t * 11.7 + 1));
    const env = Math.min(1, t / (0.05 + (1 - near) * 0.5)) * Math.exp(-t / (seconds * 0.38));
    const crack = t < crackLen ? Math.exp(-t * 9) * 2.6 : 0;
    return r * (env * roll + crack);
  });
  const low = svf(raw, (t) => 90 + 260 * near * Math.exp(-t * 1.5), 0.9, "low");
  const mid = svf(raw, (t) => 900 + 2600 * near * Math.exp(-t * 6), 0.7, "low");
  return low.map((x, i) => (x * 2.2 + mid[i] * 0.6 * near) * edges(i / SR, seconds, 0.005, 0.4));
}

/** A river running over stones: a band of noise that babbles. `strength` up to 1 is a torrent. */
export function river(seconds: number, seed: number, strength = 0.3) {
  const raw = shaped(seconds, seed, (t, r) => r * (0.7 + 0.3 * Math.sin(t * 3.1 + Math.sin(t * 7.3) * 1.5)) * edges(t, seconds, 0.4, 0.4));
  const a = svf(raw, (t) => 700 + 500 * strength + 300 * Math.sin(t * 2.3), 1.2 + (1 - strength), "band");
  const b = svf(raw, 300 + 200 * strength, 0.8, "low");
  return a.map((x, i) => x * (0.9 - strength * 0.3) + b[i] * (0.3 + strength * 1.2));
}

/** A flood coming: a low roar that swells from far off to on top of you over `seconds`. */
export function roar(seconds: number, seed: number) {
  const raw = shaped(seconds, seed, (t, r) => r * (0.2 + 0.8 * (t / seconds) ** 1.6) * (0.8 + 0.2 * Math.sin(t * 9.1)) * edges(t, seconds, 0.6, 0.3));
  const low = svf(raw, (t) => 120 + 500 * (t / seconds) ** 2, 1.1, "low");
  const rumble = svf(raw, 60, 1.4, "low");
  return low.map((x, i) => x * 1.6 + rumble[i] * 2.4);
}

/** A campfire: soft roar and pops. */
export function fire(seconds: number, seed: number, strength = 1) {
  const bed = svf(shaped(seconds, seed, (t, r) => r * edges(t, seconds, 0.3, 0.3)), 500, 0.7, "low");
  const pops = svf(shaped(seconds, seed + 1, (t, r) => (Math.abs(r) > 0.9985 ? r * 4 : 0) * edges(t, seconds, 0.05, 0.05)), 2600, 0.9, "band");
  return bed.map((x, i) => (x * 0.5 + pops[i]) * strength);
}

/** A whistle: `blasts` blasts, each `len` seconds, `gap` apart. */
export function whistle(blasts = 3, len = 0.55, gap = 0.3) {
  const total = blasts * (len + gap);
  let p = 0;
  return shaped(total, 91, (t, r) => {
    const k = Math.floor(t / (len + gap)), u = t - k * (len + gap);
    if (k >= blasts || u > len) return 0;
    const f = 2950 + 60 * Math.sin(t * 70) + r * 40;
    p = (p + f / SR) % 1;
    const env = Math.min(1, u / 0.02, (len - u) / 0.05);
    return (Math.sin(2 * Math.PI * p) * 0.8 + r * 0.15) * env;
  });
}

/** One heartbeat (lub-dub), a little over 0.4 s long. */
export function heartbeat(seed = 3) {
  return svf(shaped(0.45, seed, (t, r) => {
    const beat = (at: number, k: number) => (t >= at ? Math.sin(2 * Math.PI * 55 * (t - at)) * Math.exp(-(t - at) * 26) * k : 0);
    return beat(0, 1) + beat(0.17, 0.7) + r * 0.02 * Math.exp(-t * 20);
  }), 180, 0.8, "low");
}

/** The buzz and crackle of charge in the air just before a strike. */
export function buzz(seconds: number, seed: number) {
  let p = 0;
  const hum = shaped(seconds, seed, (t, r) => {
    p = (p + (118 + 3 * Math.sin(t * 9)) / SR) % 1;
    return ((2 * p - 1) * 0.4 + (Math.abs(r) > 0.995 ? r * 2 : 0)) * (t / seconds) * edges(t, seconds, 0.2, 0.02);
  });
  return svf(hum, 4200, 0.6, "low");
}

/** A tent's fabric in the wind: snapping and rattling. */
export function flapping(seconds: number, seed: number, strength = 0.6) {
  const raw = shaped(seconds, seed, (t, r) => {
    const snap = Math.max(0, Math.sin(t * (9 + strength * 9) + Math.sin(t * 2.3) * 4)) ** 12;
    return r * (0.2 + snap * 1.8) * strength * edges(t, seconds, 0.2, 0.2);
  });
  return svf(raw, 1400, 0.8, "low");
}

/** Heavy footsteps: a low thud each. */
export const stomp = (seed: number) => svf(shaped(0.4, seed, (t, r) => (Math.sin(2 * Math.PI * (48 - 30 * t) * t) * 1.6 + r * 0.25) * Math.exp(-t * 12)), 260, 0.8, "low");

/** A footstep on leaves or gravel. */
export const step = (seed: number) => svf(shaped(0.12, seed, (t, r) => r * Math.exp(-t * 40)), 2200, 0.7, "band");

/** A snap: a branch, a tent pole. */
export const snap = (seed: number) => svf(shaped(0.18, seed, (t, r) => r * Math.exp(-t * 60) * 2 + Math.sin(t * 2 * Math.PI * 900) * Math.exp(-t * 80)), 3000, 0.9, "band");

/** Running water splashing: bursts. */
export const splash = (seed: number, seconds = 0.6) => svf(shaped(seconds, seed, (t, r) => r * Math.exp(-t * 6) * (0.6 + 0.4 * Math.sin(t * 60))), 1800, 0.6, "low");
