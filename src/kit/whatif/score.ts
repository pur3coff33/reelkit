// The series' sound: one recurring motif (the "what if?" question, four notes that rise and don't resolve), played under
// every hook and every closing question, plus the effects more than one episode needs. Built on the kit's synth and the
// typhoon score's orchestral instruments.
import { Mix, SR, hz, svf } from "../music/synth";
import { lead, piano, shaped, strings } from "../../../apps/typhoon/music";

export const edges = (t: number, seconds: number, attack = 0.2, release = 0.3) => Math.max(0, Math.min(1, t / attack, (seconds - t) / release));

/** The motif: up a fifth, up a third, then a step that leaves it hanging. `root` is the key's tonic, e.g. "D". */
export function sting(m: Mix, at: number, root: "D" | "E" | "C" | "A" | "G" = "D", gain = 0.5, beat = 0.42) {
  const keys: Record<string, string[]> = {
    D: ["D4", "A4", "F5", "E5"],
    E: ["E4", "B4", "G5", "F#5"],
    C: ["C4", "G4", "Eb5", "D5"],
    A: ["A3", "E4", "C5", "B4"],
    G: ["G3", "D4", "Bb4", "A4"],
  };
  const notes = keys[root];
  notes.forEach((n, i) => {
    const len = i === 3 ? 3.2 : beat * 1.6;
    m.add(piano(hz(n), len + 1), at + i * beat, gain * (i === 3 ? 1.1 : 0.9), (i - 1.5) * 0.15, 0.55);
    m.add(lead(hz(n), i === 3 ? 2.6 : beat * 0.95, 2000), at + i * beat, gain * 0.22, 0, 0.6);
  });
  // A held string chord under the last note.
  const [a, , c, d] = notes.map(hz);
  m.add(strings([a / 2, a, c / 2, d / 2], 3.6, { attack: 0.5, release: 1.6, bright: 1800 }), at + 3 * beat, gain * 0.5, 0, 0.6);
}

/** A low drone: two detuned saws through a slow filter. */
export function drone(freq: number, seconds: number, bright = 500) {
  return strings([freq, freq * 1.5, freq * 2], seconds, { attack: 1.2, release: 1.5, bright });
}

/** Mains hum: 60 Hz and its harmonics, switched by `gate(t)` 0…1. */
export function hum(seconds: number, gate: (t: number) => number) {
  return shaped(seconds, 61, (t, r) => (Math.sin(2 * Math.PI * 60 * t) * 0.6 + Math.sin(2 * Math.PI * 120 * t) * 0.35 + Math.sin(2 * Math.PI * 180 * t) * 0.18 + r * 0.04) * gate(t) * edges(t, seconds, 0.05, 0.05));
}

/** Electrical crackle: sparse sharp ticks. */
export function crackle(seconds: number, seed: number, density = 0.004) {
  return svf(shaped(seconds, seed, (t, r) => (Math.abs(r) > 1 - density ? r * 3 : 0) * edges(t, seconds, 0.01, 0.05)), 3400, 0.8, "band");
}

/** Everything switching off at once: a falling whine and a sub thump. */
export function powerDown(seconds = 1.6) {
  let p = 0, q = 0;
  return shaped(seconds, 62, (t) => {
    const f = 40 + 700 * Math.exp(-t * 2.6);
    p = (p + f / SR) % 1;
    q = (q + (f * 0.501) / SR) % 1;
    return (Math.sin(2 * Math.PI * p) * 0.6 + (2 * q - 1) * 0.25) * Math.exp(-t * 1.4) * edges(t, seconds, 0.005, 0.2);
  });
}

/** Crickets at night: pulsed high chirps, a field of them. */
export function crickets(seconds: number, seed: number) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let k = 0; k < 7; k++) {
    const f = 4200 + rnd() * 1600, rate = 2.2 + rnd() * 1.6, off = rnd() * 3, g = 0.4 + rnd() * 0.6;
    for (let i = 0; i < n; i++) {
      const t = i / SR + off;
      const chirp = (t * rate) % 1;
      const on = chirp < 0.32 ? Math.sin((chirp / 0.32) * Math.PI) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 42 * t)) : 0;
      out[i] += Math.sin(2 * Math.PI * f * t) * on * g * 0.25 * edges(i / SR, seconds, 0.6, 0.6);
    }
  }
  return out;
}

/** A crowd murmuring: noise through moving vowel formants. */
export function murmur(seconds: number, seed: number, agitation = 0.4) {
  const raw = shaped(seconds, seed, (t, r) => r * (0.6 + 0.4 * Math.sin(t * (1.7 + agitation * 3) + Math.sin(t * 0.9) * 2)) * edges(t, seconds, 0.4, 0.5));
  const a = svf(raw, (t) => 560 + 140 * Math.sin(t * 2.3), 2.6, "band");
  const b = svf(raw, (t) => 1400 + 260 * Math.sin(t * 1.7 + 1), 2.8, "band");
  return a.map((x, i) => x * 1.3 + b[i] * 0.6);
}

/** A car horn: two square-ish tones. */
export function horn(seconds: number, f1 = 410, f2 = 500) {
  let a = 0, b = 0;
  const raw = shaped(seconds, 63, (t) => {
    a = (a + f1 / SR) % 1;
    b = (b + f2 / SR) % 1;
    return (Math.sign(Math.sin(2 * Math.PI * a)) * 0.5 + Math.sign(Math.sin(2 * Math.PI * b)) * 0.5) * edges(t, seconds, 0.01, 0.05);
  });
  return svf(raw, 1800, 0.8, "low");
}

/** Traffic: a wash of tyres and engines. */
export function trafficWash(seconds: number, seed: number) {
  const raw = shaped(seconds, seed, (t, r) => r * (0.7 + 0.3 * Math.sin(t * 0.8) * Math.sin(t * 0.37 + 2)) * edges(t, seconds, 0.4, 0.4));
  return svf(raw, (t) => 520 + 160 * Math.sin(t * 0.6), 0.7, "low");
}

/** A siren that is deliberately not any real service's: a slow, soft rise and fall. */
export function softSiren(seconds: number, seed: number) {
  let p = 0;
  return svf(shaped(seconds, seed, (t) => {
    const f = 640 + 240 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 2.4));
    p = (p + f / SR) % 1;
    return (Math.sin(2 * Math.PI * p) + 0.3 * Math.sin(4 * Math.PI * p)) * edges(t, seconds, 0.5, 0.8);
  }), 1600, 0.8, "low");
}

/** Birdsong: little falling and rising whistles. */
export function birdsong(seconds: number, seed: number, density = 1) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const calls = Math.round(seconds * 2.2 * density);
  for (let k = 0; k < calls; k++) {
    const start = rnd() * seconds, f0 = 2400 + rnd() * 2600, notes = 2 + Math.floor(rnd() * 4), g = 0.25 + rnd() * 0.5, kind = rnd();
    for (let j = 0; j < notes; j++) {
      const at = start + j * (0.09 + rnd() * 0.06), len = 0.06 + rnd() * 0.08;
      const i0 = Math.round(at * SR), m = Math.round(len * SR);
      let p = 0;
      for (let i = 0; i < m && i0 + i < n; i++) {
        const u = i / m;
        const f = f0 * (kind < 0.5 ? 1 + 0.35 * (1 - u) : 1 + 0.3 * u) * (1 + 0.04 * Math.sin(u * 60));
        p = (p + f / SR) % 1;
        out[i0 + i] += Math.sin(2 * Math.PI * p) * Math.sin(u * Math.PI) * g * 0.3;
      }
    }
  }
  return out;
}

/** Wind: soft broadband noise with gusts. */
export function wind(seconds: number, seed: number, strength = 0.5) {
  const raw = shaped(seconds, seed, (t, r) => r * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.7 + Math.sin(t * 0.23) * 3)) ** 2) * edges(t, seconds, 0.8, 0.8));
  return svf(raw, (t) => 300 + 700 * strength + 250 * Math.sin(t * 0.5), 1.4, "band");
}
