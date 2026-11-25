// Every sound that isn't music, made from noise and sine waves, so all of it is original and lands exactly on its frame. The
// rounds are the same lists the picture's muzzle flashes read (timeline.ts). A shot heard from close by is a crack, a body, a
// thump in the chest and the land answering it; one from far away is mostly the land answering. Fire coming this way is a
// snap in the air with its report arriving after it, because the bullet gets here before the sound does.
import { SR, svf } from "../../src/kit/music/synth";

function noiseGen(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 2147483648 - 1;
  };
}
export const seeded = (seed: number) => {
  const n = noiseGen(seed);
  return () => (n() + 1) / 2;
};
const samples = (seconds: number) => Math.round(seconds * SR);

/** `n` takes of the same sound, so a burst never repeats itself exactly. */

// ── Guns ──────────────────────────────────────────────────────────────────────────────────────────────

/** A shell or bomb coming down: a thin falling note, a long way under everything. */
export function whistle(seconds: number, seed: number) {
  const rnd = noiseGen(seed);
  const n = samples(seconds);
  const out = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    p += (2 * Math.PI * (1500 - 900 * k * k)) / SR;
    out[i] = (Math.sin(p) * 0.7 + rnd() * 0.3) * k * k;
  }
  return svf(out, 2200, 0.8, "low");
}

/** White phosphorus: a hard pop high up, the far thump of the gun that sent it, and the fizz of it burning down. */
export function phosphorus(seed: number) {
  const rnd = noiseGen(seed), r = seeded(seed + 2);
  const n = samples(6);
  const out = new Float32Array(n), pop = new Float32Array(n);
  let p = 0, low = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = rnd();
    pop[i] = x * Math.exp(-t * 130);
    low += 0.03 * (x - low);
    p += (2 * Math.PI * (46 + 40 * Math.exp(-t * 12))) / SR;
    out[i] = Math.sin(p) * Math.exp(-t * 3) * 0.6 + low * 4 * Math.exp(-t * 1.5);
  }
  const hi = svf(pop, 1500, 0.8, "band");
  for (let i = 0; i < n; i++) out[i] += hi[i] * 2;
  for (let k = 0; k < 260; k++) {
    const t = 0.25 + r() * r() * 5.4, at = samples(t), g = 0.03 * Math.exp(-t * 0.5) * (0.4 + r() * 0.6), len = samples(0.003 + r() * 0.01);
    for (let i = 0; i < len && at + i < n; i++) out[at + i] += rnd() * g;
  }
  return out.map((x, i) => Math.tanh(x * 1.2) * Math.min(1, (n - i) / 8000));
}

// ── Machines ──────────────────────────────────────────────────────────────────────────────────────────

/** A diesel at idle: uneven low firing pulses, a little rattle on top. */
export function diesel(seconds: number, hz: number, seed: number) {
  const rnd = noiseGen(seed);
  const n = samples(seconds);
  const out = new Float32Array(n);
  let phase = 0, wob = 0;
  for (let i = 0; i < n; i++) {
    wob += 0.0004 * (rnd() - wob);
    phase += (hz * (1 + wob * 2)) / SR;
    const f = phase % 1;
    out[i] = Math.exp(-f * 5) * (1 + 0.5 * rnd()) - 0.3;
  }
  return svf(out, 340, 0.9, "low").map((x, i) => x * 1.7 * Math.min(1, i / 9000, (n - i) / 9000));
}

/** A kuliglig's single cylinder, thumping along. */
export function putter(seconds: number, hz: number, seed: number) {
  const rnd = noiseGen(seed), r = seeded(seed + 1);
  const n = samples(seconds);
  const out = new Float32Array(n);
  let at = 0;
  while (at < n) {
    const len = samples(0.09), g = 0.8 + r() * 0.3;
    for (let i = 0; i < len && at + i < n; i++) {
      const t = i / SR;
      out[at + i] += (Math.sin(2 * Math.PI * 92 * t) * Math.exp(-t * 34) + rnd() * 0.5 * Math.exp(-t * 90)) * g;
    }
    at += samples((1 / hz) * (0.95 + r() * 0.1));
  }
  return svf(out, 1400, 0.8, "low").map((x, i) => x * Math.min(1, i / 9000, (n - i) / 9000));
}

/** Steel on steel: a tailgate, a rifle sling. */
export function clank(seed: number, size = 1) {
  const r = seeded(seed), rnd = noiseGen(seed);
  const n = samples(0.35);
  const out = new Float32Array(n);
  const modes = [430 + r() * 90, 1130 + r() * 160, 2290 + r() * 300, 3510 + r() * 500];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let x = rnd() * 0.35 * Math.exp(-t * 170);
    for (const [k, f] of modes.entries()) x += (Math.sin(2 * Math.PI * f * t) / (k + 1.5)) * Math.exp(-t * (16 + k * 9));
    out[i] = x * size;
  }
  return out;
}

// ── Feet, water, corn, a bicycle ──────────────────────────────────────────────────────────────────────

/** A boot in mud: a soft heavy thud and the suck as it comes out. */
export function mudStep(seed: number) {
  const rnd = noiseGen(seed);
  const n = samples(0.34);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    raw[i] = rnd() * (Math.exp(-t * 34) + 0.42 * Math.exp(-((t - 0.2) ** 2) * 900));
  }
  return svf(raw, (t) => 480 + 1000 * Math.max(0, t - 0.14), 1.6, "low");
}

/** A boot on a gravel road. */
export function gravelStep(seed: number) {
  const rnd = noiseGen(seed), r = seeded(seed + 3);
  const n = samples(0.17);
  const raw = new Float32Array(n);
  for (let k = 0; k < 24; k++) {
    const at = samples(r() * 0.1), len = samples(0.002 + r() * 0.005), g = 0.4 + r() * 0.6;
    for (let i = 0; i < len && at + i < n; i++) raw[at + i] += rnd() * g;
  }
  return svf(raw, 1800, 0.9, "band").map((x) => x * 1.9);
}

/** Legs through water, one after another. */
export function wading(seconds: number, seed: number) {
  const rnd = noiseGen(seed);
  const n = samples(seconds);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const pull = Math.abs(Math.sin(t * Math.PI * 1.25)) ** 3 + 0.6 * Math.abs(Math.sin(t * Math.PI * 1.25 + 1.1)) ** 5;
    raw[i] = rnd() * pull * Math.min(1, t / 0.4, (seconds - t) / 0.4);
  }
  return svf(svf(raw, 1500, 0.7, "low"), 260, 0.7, "high").map((x) => x * 1.2);
}

/** A bicycle: the freewheel's tick, tyres on the road, and now and then the frame. */
export function bicycle(seconds: number, seed: number) {
  const rnd = noiseGen(seed), r = seeded(seed + 1);
  const n = samples(seconds);
  const out = new Float32Array(n);
  let low = 0;
  for (let i = 0; i < n; i++) {
    const x = rnd();
    low += 0.025 * (x - low);
    out[i] = low * 1.5;
  }
  for (let t = 0; t < seconds; t += 0.082 + r() * 0.01) {
    const at = samples(t), len = samples(0.004);
    for (let i = 0; i < len && at + i < n; i++) out[at + i] += rnd() * 0.12;
  }
  return out.map((x, i) => x * Math.min(1, i / 9000, (n - i) / 9000));
}

/** A small bird, somewhere: a few quick rising notes. */
export function bird(seed: number) {
  const r = seeded(seed);
  const notes = 2 + Math.floor(r() * 4), base = 2900 + r() * 2600;
  const n = samples(0.14 * notes + 0.1);
  const out = new Float32Array(n);
  let at = 0;
  for (let k = 0; k < notes; k++) {
    const len = samples(0.05 + r() * 0.06), rise = 500 + r() * 1100;
    let p = 0;
    for (let i = 0; i < len && at + i < n; i++) {
      const u = i / len;
      p += (2 * Math.PI * (base + rise * u)) / SR;
      out[at + i] += Math.sin(p) * Math.sin(u * Math.PI);
    }
    at += len + samples(0.02 + r() * 0.05);
  }
  return out;
}
