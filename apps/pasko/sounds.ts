// The yard's sounds, all synthesised and seeded (the same every run): spoons on plates, chairs on tiles, crickets and a
// tuko at night, birds at dawn, church bells, capiz shell chimes, firecrackers, a jeepney (engine and two-tone horn), a
// tricycle's putt-putt, and a neighbour's videoke singing along, off-key, through a cheap speaker.
import { seeded } from "../../src/kit/music/studio";
import { SR, svf } from "../../src/kit/music/synth";

const buf = (seconds: number) => new Float32Array(Math.round(seconds * SR));
const TAU = Math.PI * 2;
/** Fades in over `a` and out over `b` seconds. */
const edge = (t: number, len: number, a: number, b: number) => Math.min(1, t / a, (len - t) / b);

/** A spoon or fork on a plate: a few bright inharmonic partials, gone in a fifth of a second. */
export function clink(seed: number) {
  const r = seeded(seed), f = 2400 + 900 * r(), out = buf(0.25), parts = [1, 1.52, 2.11, 2.93];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = parts.reduce((a, p, k) => a + Math.sin(TAU * f * p * t + k) * Math.exp(-t * (18 + 9 * k)) / (k + 1), 0) * 0.5;
  }
  return out;
}
/** A plastic chair dragged on tiles: a short rough scrape. */
export function scrape(seed: number, seconds = 0.35) {
  const r = seeded(seed), raw = buf(seconds);
  for (let i = 0; i < raw.length; i++) {
    const t = i / SR, judder = 0.6 + 0.4 * Math.sin(TAU * (38 + 10 * Math.sin(t * 9)) * t);
    raw[i] = (r() * 2 - 1) * judder * edge(t, seconds, 0.03, 0.12);
  }
  return svf(svf(raw, 1500, 2.5, "band"), 300, 0.7, "high");
}
/** Crickets: several of them, each chirping in short trills at its own pitch. */
export function crickets(seconds: number, seed: number, n = 4) {
  const r = seeded(seed), out = buf(seconds);
  for (let c = 0; c < n; c++) {
    const f = 4200 + 900 * r(), rate = 0.45 + 0.4 * r(), phase = r() * 3, pulse = 28 + 8 * r(), amp = 0.25 + 0.2 * r();
    for (let i = 0; i < out.length; i++) {
      const t = i / SR, cyc = ((t + phase) * rate) % 1;
      if (cyc > 0.18) continue;
      const trill = Math.max(0, Math.sin(TAU * pulse * t)) ** 2;
      out[i] += Math.sin(TAU * f * t) * trill * amp * Math.sin((cyc / 0.18) * Math.PI) * edge(t, seconds, 0.5, 0.5);
    }
  }
  return out;
}
/** The tuko gecko's call: a rattle, then "tu-ko", low and throaty. */
export function tuko() {
  const out = buf(0.75);
  const syll = (t0: number, len: number, f0: number, f1: number, form: number) => {
    for (let i = Math.round(t0 * SR); i < Math.round((t0 + len) * SR) && i < out.length; i++) {
      const t = i / SR - t0, f = f0 + (f1 - f0) * (t / len), env = Math.sin((t / len) * Math.PI) ** 0.6;
      // A buzzy pulse train through a vowel-ish resonance.
      const p = (f * t) % 1, src = p < 0.12 ? 1 : -0.1;
      out[i] += src * env * (0.8 + 0.2 * Math.sin(TAU * form * t));
    }
  };
  syll(0.0, 0.16, 210, 150, 900);
  syll(0.28, 0.32, 150, 105, 600);
  return svf(svf(out, 1200, 1.4, "band"), 120, 0.7, "high");
}
/** Birds at dawn: quick rising and falling whistles, scattered. */
export function birds(seconds: number, seed: number, density = 2.5) {
  const r = seeded(seed), out = buf(seconds), n = Math.round(seconds * density);
  for (let k = 0; k < n; k++) {
    const t0 = r() * (seconds - 0.4), f0 = 2600 + 1800 * r(), len = 0.06 + 0.1 * r(), up = r() > 0.5 ? 1 : -1, notes = 1 + Math.floor(r() * 3), amp = 0.2 + 0.25 * r();
    for (let j = 0; j < notes; j++) {
      const s0 = t0 + j * (len + 0.04);
      let ph = 0;
      for (let i = Math.round(s0 * SR); i < Math.round((s0 + len) * SR) && i < out.length; i++) {
        const u = (i / SR - s0) / len, f = f0 * (1 + 0.35 * up * u);
        ph += (TAU * f) / SR;
        out[i] += Math.sin(ph) * Math.sin(u * Math.PI) * amp;
      }
    }
  }
  return out;
}
/** A church bell: a strike with the bell's own uneven partials, ringing long. */
export function bell(pitch = 196, seconds = 4) {
  const out = buf(seconds), parts: [number, number, number][] = [[0.5, 0.5, 0.6], [1, 1, 0.9], [1.19, 0.6, 1.4], [1.5, 0.45, 1.8], [2, 0.35, 2.4], [2.52, 0.22, 3], [3.0, 0.15, 4]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = parts.reduce((a, [m, g, d]) => a + Math.sin(TAU * pitch * m * t + m) * g * Math.exp(-t * d * 0.9), 0) * Math.min(1, t / 0.004) * 0.4;
  }
  return out;
}
/** Capiz shell chimes stirred by a hand or the wind: a shower of tiny bright clacks. */
export function chimes(seconds: number, seed: number, count = 14) {
  const r = seeded(seed), out = buf(seconds);
  for (let k = 0; k < count; k++) {
    const t0 = (seconds * 0.7) * r() ** 1.6, f = 3000 + 3500 * r(), amp = 0.25 + 0.25 * r();
    for (let i = Math.round(t0 * SR); i < out.length && i < Math.round((t0 + 0.4) * SR); i++) {
      const t = i / SR - t0;
      out[i] += (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.71 * t)) * Math.exp(-t * 14) * amp;
    }
  }
  return out;
}
/** A firecracker far off: a crack and its slap back. */
export function pop(seed: number) {
  const r = seeded(seed), raw = buf(0.6);
  for (let i = 0; i < raw.length; i++) {
    const t = i / SR;
    raw[i] = (r() * 2 - 1) * (Math.exp(-t * 60) + 0.25 * Math.exp(-Math.abs(t - 0.18) * 40) * (t > 0.18 ? 1 : 0));
  }
  return svf(raw, 2200, 0.8, "low");
}
/** A diesel engine: idling, then pulling away from `go` (seconds in), louder then fading as it leaves. */
export function engine(seconds: number, seed: number, go: number, base = 32) {
  const r = seeded(seed), out = buf(seconds);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, away = Math.max(0, t - go), rev = base * (1 + 0.9 * Math.min(1, away / 0.8) - 0.3 * Math.min(1, Math.max(0, away - 1.2) / 1.5));
    ph += (TAU * rev) / SR;
    const level = t < go ? 0.55 : Math.min(1.2, 0.55 + away * 1.2) * Math.exp(-Math.max(0, away - 0.9) * 1.1);
    out[i] = (Math.sin(ph) + 0.6 * Math.sin(ph * 2) + 0.35 * Math.sin(ph * 3) + 0.25 * (r() * 2 - 1)) * level * edge(t, seconds, 0.3, 0.3);
  }
  return svf(out, 700, 0.8, "low");
}
/** The jeepney's horn: two tones together, a short honk then a longer one. */
export function horn() {
  const out = buf(1.1);
  for (const [t0, len] of [[0, 0.16], [0.26, 0.5]]) for (let i = Math.round(t0 * SR); i < Math.round((t0 + len) * SR); i++) {
    const t = i / SR - t0, e = Math.min(1, t / 0.01, (len - t) / 0.03);
    out[i] += (Math.sign(Math.sin(TAU * 415 * t)) + Math.sign(Math.sin(TAU * 523 * t))) * 0.3 * e;
  }
  return svf(svf(out, 2600, 0.7, "low"), 250, 0.7, "high");
}
/** A tricycle's two-stroke putt-putt. `level(t)` 0…1 shapes it (coming or going). */
export function putt(seconds: number, seed: number, level: (t: number) => number) {
  const r = seeded(seed), out = buf(seconds);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, rate = 13 + 3 * Math.sin(t * 0.7), p = (t * rate) % 1;
    out[i] = (p < 0.25 ? Math.sin((p / 0.25) * Math.PI) : 0) * (0.7 + 0.3 * (r() * 2 - 1)) * level(t);
  }
  return svf(svf(out, 900, 0.9, "low"), 70, 0.7, "high");
}
/** A neighbour's videoke: a reedy voice singing a tune slightly off pitch and late, with a cheap organ under it, all
 *  through a small loudspeaker across the road. `notes`: [seconds, midi, length]. */
export function videoke(seconds: number, seed: number, notes: [number, number, number][], chords: [number, number[], number][]) {
  const r = seeded(seed), voice = buf(seconds), organ = buf(seconds);
  for (const [t0, n, len] of notes) {
    const off = (r() - 0.5) * 0.7 + 0.15, late = 0.04 + 0.08 * r(), f = 440 * 2 ** ((n + off - 69) / 12);
    let ph = 0;
    for (let i = Math.round((t0 + late) * SR); i < Math.round((t0 + late + len) * SR) && i < voice.length; i++) {
      const t = i / SR - t0 - late, vib = 1 + 0.012 * Math.sin(TAU * 5.5 * t) * Math.min(1, t / 0.3);
      ph += (TAU * f * vib) / SR;
      const saw = 2 * ((ph / TAU) % 1) - 1;
      voice[i] += saw * Math.min(1, t / 0.05, (len - t) / 0.08) * 0.5;
    }
  }
  for (const [t0, ns, len] of chords) for (const n of ns) {
    const f = 440 * 2 ** ((n - 69) / 12);
    for (let i = Math.round(t0 * SR); i < Math.round((t0 + len) * SR) && i < organ.length; i++) {
      const t = i / SR - t0;
      organ[i] += Math.sign(Math.sin(TAU * f * t)) * 0.06 * Math.min(1, t / 0.02, (len - t) / 0.05);
    }
  }
  // The voice's vowel ("ah"), then the little speaker: no lows, no highs, a bit of slap from the houses.
  const f2 = svf(voice, 1250, 4, "band"), vowel = svf(voice, 750, 3, "band").map((x, i) => x + f2[i] * 0.6);
  const mixd = vowel.map((x, i) => x + organ[i]);
  const speaker = svf(svf(mixd, 3000, 0.7, "low"), 380, 0.7, "high");
  const slap = Math.round(0.12 * SR);
  return speaker.map((x, i) => (x + (i >= slap ? speaker[i - slap] * 0.35 : 0)) * edge(i / SR, seconds, 0.4, 0.6));
}
