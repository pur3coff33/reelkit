// Cinematic sound effects, drawn from noise and sines: a whoosh that passes from one side to the other, a swell that sucks
// into a cut (a reverb tail played backwards), a sub boom for the cut itself, a shimmer of high sparks for light, a stutter
// for something snapping, and a blast for the biggest explosion. Each is normalised to peak at 0.9; put it on a stem
// (`stem.add(x, at)`) and let the stem's loudness set how loud it really is. The same seed always makes the same sound.
import { seeded } from "./studio";
import { SR, svf } from "./synth";

const samples = (seconds: number) => Math.max(1, Math.round(seconds * SR));

function normalise(...xs: Float32Array[]) {
  const p = xs.reduce((m, x) => x.reduce((n, v) => Math.max(n, Math.abs(v)), m), 0) || 1;
  for (const x of xs) for (let i = 0; i < x.length; i++) x[i] *= 0.9 / p;
  return xs;
}

const noise = (n: number, seed: number) => {
  const r = seeded(seed);
  return Float32Array.from({ length: n }, () => r() * 2 - 1);
};

/** Noise rushing past: a band sweeping up and down, loudest at 60% of the way, panned `from` → `to` (−1 left … 1 right). */
export function whoosh(seconds: number, seed: number, from = -0.8, to = 0.8): [Float32Array, Float32Array] {
  const n = samples(seconds), shape = (u: number) => (u < 0.6 ? (u / 0.6) ** 2 : (1 - (u - 0.6) / 0.4) ** 1.5);
  const band = svf(noise(n, seed), (t) => {
    const u = t / seconds;
    return u < 0.6 ? 300 + 3200 * (u / 0.6) ** 1.5 : 3500 - 2900 * ((u - 0.6) / 0.4);
  }, 1.3, "band");
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = i / n, p = from + (to - from) * u, a = ((p + 1) * Math.PI) / 4, v = band[i] * shape(u);
    L[i] = v * Math.cos(a);
    R[i] = v * Math.sin(a);
  }
  return normalise(L, R) as [Float32Array, Float32Array];
}

/** A reverb tail played backwards: it rises out of nothing and ends at full level, on the cut. */
export function swell(seconds: number, seed: number) {
  const n = samples(seconds), raw = svf(noise(n, seed), 5000, 0.7, "low");
  // A chord-ish ring in the tail, so it sounds like a hall rather than hiss.
  const ring = [110, 164.8, 220, 329.6, 440];
  const tail = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, decay = Math.exp((-t * 5) / seconds);
    tail[i] = decay * (0.6 * raw[i] + 0.4 * ring.reduce((s, f, k) => s + Math.sin(2 * Math.PI * f * t + k) / ring.length, 0));
  }
  tail.reverse();
  // The last 3 ms close, so it doesn't click.
  const close = Math.round(0.003 * SR);
  for (let i = 0; i < close; i++) tail[n - 1 - i] *= i / close;
  return normalise(tail)[0];
}

/** A sub boom: a sine falling from 60 to 30 Hz with a short click in front. `depth` 2 is twice as long and deep. */
export function boom(depth = 1, seed = 1) {
  const n = samples(2.5 * depth), x = new Float32Array(n), click = svf(noise(Math.round(0.03 * SR), seed), 2000, 0.7, "low");
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 30 + 30 * Math.exp(-t / (0.35 * depth));
    ph += (2 * Math.PI * f) / SR;
    const amp = Math.min(1, t / 0.005) * Math.exp(-t / (0.6 * depth));
    x[i] = amp * (Math.sin(ph) + 0.25 * Math.sin(2 * ph) * Math.exp(-t * 6));
    if (i < click.length) x[i] += 0.25 * click[i] * (1 - i / click.length);
  }
  return normalise(x)[0];
}

/** High sparks: short sine grains between 3 and 9 kHz, scattered, fading in and out over the whole length. */
export function shimmer(seconds: number, seed: number, density = 18) {
  const n = samples(seconds), x = new Float32Array(n), r = seeded(seed);
  const count = Math.max(1, Math.round(seconds * density));
  for (let g = 0; g < count; g++) {
    const at = Math.floor(r() * n), f = 3000 + 6000 * r(), decay = 0.04 + 0.11 * r(), gain = 0.3 + 0.7 * r();
    const len = Math.min(n - at, Math.round(decay * 5 * SR));
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      x[at + i] += gain * Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.002) * Math.exp(-t / decay);
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] *= Math.min(1, t / 0.3, (seconds - t) / 0.3);
  }
  return normalise(svf(x, 2500, 0.7, "high"))[0];
}

/** Noise chopped by a gate that starts at `rate` a second and slows to a quarter of it, dying away: a snap. */
export function stutter(seconds: number, seed: number, rate = 16) {
  const n = samples(seconds), band = svf(noise(n, seed), 1500, 1.2, "band"), x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    ph += (rate * (1 - 0.75 * u)) / SR;
    x[i] = band[i] * (ph % 1 < 0.45 ? 1 : 0) * (1 - u) ** 1.5;
  }
  return normalise(x)[0];
}

/** The biggest explosion: a deep boom, a roar whose brightness falls away, and crackle scattered through it. */
export function blast(seconds: number, seed: number) {
  const n = samples(seconds), x = new Float32Array(n), b = boom(2, seed);
  const roar = svf(noise(n, seed + 1), (t) => 200 + 1800 * Math.exp(-t / (seconds * 0.25)), 0.8, "low");
  const r = seeded(seed + 2);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] = (i < b.length ? b[i] : 0) + 0.8 * roar[i] * Math.min(1, t / 0.04) * Math.exp(-t / (seconds * 0.35));
    // Crackle: rarer as it dies away.
    if (r() < 0.004 * Math.exp(-t / (seconds * 0.4))) x[i] += (r() - 0.5) * 1.2 * Math.exp(-t / (seconds * 0.5));
  }
  return normalise(x)[0];
}
