// The soundtrack: the score, with the sea under it, whale calls, breaths at the surface, and orcas far off.
import { seeded, type Session } from "../../src/kit/music/studio";
import { SR, svf } from "../../src/kit/music/synth";
import { writeScore } from "./score";
import { BREATHS, CALLS, SHOTS } from "./timeline";

/** A sound made sample by sample from its own time and seeded noise. */
function make(seconds: number, seed: number, fn: (t: number, n: number) => number) {
  const r = seeded(seed);
  return Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => fn(i / SR, r() * 2 - 1));
}

/** A blue whale's call, raised about three octaves so people (and phones) can hear it: long, low, gently falling. */
function call(seconds: number, seed: number) {
  let p = 0;
  return svf(make(seconds, seed, (t, n) => {
    const k = t / seconds;
    p += (2 * Math.PI * (152 - 26 * k + 1.2 * Math.sin(t * 5))) / SR;
    const env = Math.sin(Math.PI * Math.min(1, k * 1.02)) ** 1.4;
    return (Math.sin(p) + 0.32 * Math.sin(2 * p + 0.4) + 0.12 * Math.sin(3 * p) + n * 0.02) * env;
  }), 700, 0.7, "low");
}

/** An orca's whistle, soft and a long way off. */
function whistle(seed: number, f0: number, f1: number) {
  let p = 0;
  const len = 0.9;
  return make(len, seed, (t) => {
    const k = t / len;
    p += (2 * Math.PI * (f0 + (f1 - f0) * k + 60 * Math.sin(t * 26))) / SR;
    return Math.sin(p) * Math.sin(Math.PI * k) ** 1.6;
  });
}

/** The breath: a soft rush out, then the air settling. */
const breath = (seed: number) => svf(make(3.2, seed, (t, n) => n * Math.min(1, t / 0.12) * Math.exp(-t * 1.5)), (t) => 700 + 2200 * Math.exp(-t * 1.6), 0.7, "low");

/** Waves at the surface, slow, easing in and out with the melts. */
const waves = (seconds: number, seed: number) => svf(make(seconds, seed, (t, n) => n * (0.45 + 0.55 * Math.sin((2 * Math.PI * t) / 5.2 + seed) ** 2) * Math.max(0, Math.min(1, t / 2, (seconds - t) / 2))), 900, 0.6, "low");

function effects(s: Session) {
  const voices = s.stem("calls", { lufs: -28, low: 90, high: 1200, hall: { seconds: 5.5, mix: 0.8, gap: 0.05 } });
  CALLS.forEach(([at, g], i) => voices.add(call(3.4, 3 + i), at, g, i % 2 ? -0.25 : 0.2));
  const pod = s.stem("orcas", { lufs: -38, low: 500, high: 3600, hall: { seconds: 5, mix: 1, gap: 0.04 } });
  const o = SHOTS.orcas.from, gone = SHOTS.away.from;
  for (const [at, a, b, pan] of [[o + 1.5, 1300, 1900, -0.4], [o + 5, 1700, 1200, 0.4], [o + 9.5, 1400, 2100, 0.2], [o + 13, 1900, 1400, -0.3], [gone + 2.5, 1500, 1200, 0.4]]) pod.add(whistle(at, a, b), at, at > gone ? 0.5 : 1, pan);
  const top = s.stem("surface", { lufs: -34, low: 120, high: 3600, hall: { seconds: 2, mix: 0.2 } });
  for (const shot of ["aerial", "night", "ice", "fluke", "years", "dusk"] as const) {
    const at = SHOTS[shot].from - 1, len = SHOTS[shot].to - SHOTS[shot].from + 2;
    top.add([waves(len, 1), waves(len, 2)], at, 0.5);
  }
  BREATHS.forEach(([at, g], i) => top.add(breath(9 + i), at, 1.1 * g, 0.1));
}

export async function writeMusic(file: string) {
  await writeScore(file, effects);
}
