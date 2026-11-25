// The soundtrack, written in code: an original orchestral-style score in D minor, built on one recurring theme, that
// tightens from 72 to 96 BPM as the storm closes, thins out for the crisis and resolves to F major for the recovery.
// The sound of each shot sits under it, on its own bus, so the score always leads. There are no voices.
import { Mix, SR, bass, clap, hat, hz, impact, kick, pluck, riser, svf } from "../../src/kit/music/synth";
import { SECONDS, SHOTS } from "./timeline";

const noiseOf = (seed: number) => {
  let a = seed >>> 0;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 2147483648 - 1);
};
const smooth = (a: number, b: number, x: number) => {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const edges = (t: number, seconds: number, attack = 0.3, release = 0.4) => Math.min(1, t / attack) * Math.min(1, (seconds - t) / release);

// ── Instruments ──────────────────────────────────────────────────────────────────────────────────────

/** A string section: detuned saws with vibrato that hold their level, then release. Returns [left, right]. */
export function strings(freqs: number[], seconds: number, o: { attack?: number; release?: number; bright?: number } = {}): [Float32Array, Float32Array] {
  const n = Math.round(seconds * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  const attack = o.attack ?? 0.5, release = o.release ?? 0.6;
  const detune = [0.996, 1, 1.004];
  freqs.forEach((f, fi) => {
    detune.forEach((d, di) => {
      let p = (fi * 0.37 + di * 0.21) % 1;
      const pan = (di - 1) * 0.8;
      const gl = 0.5 - pan * 0.4, gr = 0.5 + pan * 0.4;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        const vib = 1 + 0.0035 * Math.sin(2 * Math.PI * (5.1 + fi * 0.13) * t + di) * Math.min(1, t / 0.8);
        p = (p + (f * d * vib) / SR) % 1;
        const s = 2 * p - 1;
        L[i] += s * gl;
        R[i] += s * gr;
      }
    });
  });
  const cut = o.bright ?? 2200;
  const fl = svf(L, cut, 0.8, "low"), fr = svf(R, cut, 0.8, "low");
  const norm = 1 / Math.sqrt(freqs.length * 3);
  for (let i = 0; i < n; i++) {
    const g = edges(i / SR, seconds, attack, release) * norm;
    fl[i] *= g;
    fr[i] *= g;
  }
  return [fl, fr];
}

/** A singing lead (horn or high strings): it swells into each note. */
export function lead(freq: number, seconds: number, bright = 2400) {
  const n = Math.round(seconds * SR);
  const raw = new Float32Array(n);
  let p = 0, q = 0.3;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const vib = 1 + 0.005 * Math.sin(2 * Math.PI * 5.4 * t) * Math.min(1, t / 0.5);
    p = (p + (freq * vib) / SR) % 1;
    q = (q + (freq * 1.003 * vib) / SR) % 1;
    raw[i] = (2 * p - 1) * 0.5 + (2 * q - 1) * 0.5;
  }
  const out = svf(raw, (t) => 500 + bright * Math.min(1, t / 0.22), 1, "low");
  for (let i = 0; i < n; i++) out[i] *= edges(i / SR, seconds, 0.07, Math.min(0.3, seconds * 0.4));
  return out;
}

/** Short bowed notes for the driving figure. */
export function spiccato(freq: number, seconds: number) {
  const n = Math.round(seconds * SR);
  const raw = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    p = (p + freq / SR) % 1;
    raw[i] = 2 * p - 1;
  }
  const out = svf(raw, (t) => 500 + 2500 * Math.exp(-t * 16), 1.1, "low");
  for (let i = 0; i < n; i++) out[i] *= Math.min(1, i / 120) * Math.exp((-i / SR) * 7) * Math.min(1, (n - i) / 200);
  return out;
}

/** A taiko-style drum: a falling pitch and a skin slap. */
export function taiko(size = 1) {
  const n = Math.round(0.9 * SR);
  const b = new Float32Array(n);
  const rnd = noiseOf(Math.round(size * 100) + 3);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    p += (2 * Math.PI * (52 + 80 * Math.exp(-t * 22))) / SR;
    b[i] = Math.tanh((Math.sin(p) * Math.exp(-t * 5) * 1.5 + rnd() * Math.exp(-t * 48) * 0.5) * size);
  }
  return b;
}

/** Brass: a hard chord for hits. */
export function brass(freqs: number[], seconds: number) {
  const s = strings(freqs, seconds, { attack: 0.018, release: Math.min(0.5, seconds * 0.45), bright: 3400 });
  return s.map((b) => b.map((x) => Math.tanh(x * 1.9))) as [Float32Array, Float32Array];
}

export function piano(freq: number, seconds = 2.4) {
  const a = pluck(freq, seconds), b = pluck(freq * 2.002, seconds * 0.65), c = pluck(freq * 0.5, seconds);
  return a.map((x, i) => x + (i < b.length ? b[i] * 0.22 : 0) + (i < c.length ? c[i] * 0.16 : 0));
}

// ── The composition ──────────────────────────────────────────────────────────────────────────────────

export const CH: Record<string, string[]> = {
  Dm: ["D3", "A3", "D4", "F4", "A4"],
  Bb: ["Bb2", "F3", "Bb3", "D4", "F4"],
  F: ["F3", "C4", "F4", "A4", "C5"],
  C: ["C3", "G3", "C4", "E4", "G4"],
  Gm: ["G2", "D3", "G3", "Bb3", "D4"],
  Eb: ["Eb3", "Bb3", "Eb4", "G4", "Bb4"],
  A: ["A2", "E3", "A3", "C#4", "E4"],
  Am: ["A2", "E3", "A3", "C4", "E4"],
  G: ["G2", "D3", "G3", "B3", "D4"],
  E: ["E2", "B2", "E3", "G#3", "B3"],
};
export const ROOT: Record<string, string> = { Dm: "D2", Bb: "Bb1", F: "F2", C: "C2", Gm: "G1", Eb: "Eb2", A: "A1", Am: "A1", G: "G1", E: "E2" };

/** [beat, note, length in beats] */
type Tune = [number, string, number][];

// The theme: a falling call and a rising answer, in the minor, then in the major at the end.
export const THEME: Tune = [[0, "A4", 1.5], [1.5, "F4", 0.5], [2, "D4", 1], [3, "E4", 1], [4, "F4", 1.5], [5.5, "G4", 0.5], [6, "A4", 2], [8, "Bb4", 1.5], [9.5, "A4", 0.5], [10, "G4", 1], [11, "F4", 1], [12, "E4", 2], [14, "D4", 2]];
export const THEME_MAJOR: Tune = [[0, "C5", 1.5], [1.5, "A4", 0.5], [2, "F4", 1], [3, "G4", 1], [4, "A4", 1.5], [5.5, "Bb4", 0.5], [6, "C5", 2], [8, "D5", 1.5], [9.5, "C5", 0.5], [10, "Bb4", 1], [11, "A4", 1], [12, "G4", 2], [14, "F4", 2]];
export const oct = (t: Tune, by: number): Tune => t.map(([b, n, l]) => [b, n.replace(/-?\d$/, (d) => String(Number(d) + by)), l]);

type Section = {
  from: number;
  to: number;
  bpm: number;
  chords: string[];
  beatsPerChord?: number;
  /** Levels, 0 for none. */
  str?: number;
  bright?: number;
  sub?: number;
  /** The driving figure: its level and how many notes to a beat. */
  drive?: number;
  div?: number;
  /** Trailer drums. */
  drums?: number;
  /** Rising towards the end of the section. */
  swell?: boolean;
};

export function play(m: Mix, s: Section) {
  const B = 60 / s.bpm;
  const per = (s.beatsPerChord ?? 4) * B;
  let i = 0;
  for (let at = s.from; at < s.to - 0.02; at += per, i++) {
    const name = s.chords[i % s.chords.length];
    const len = Math.min(per + 0.35, s.to - at + 0.25);
    const grow = s.swell ? 0.65 + 0.35 * (at - s.from) / (s.to - s.from) : 1;
    if (s.str) m.add(strings(CH[name].map(hz), len, { attack: Math.min(0.6, len / 3), release: 0.5, bright: s.bright ?? 2200 }), at, s.str * grow, 0, 0.5);
    if (s.sub) m.add(bass(hz(ROOT[name]), Math.min(per, s.to - at)), at, s.sub * grow, 0, 0.05);
    if (s.drive) {
      const div = s.div ?? 2;
      const notes = Math.floor((len - 0.3) / (B / div));
      for (let k = 0; k < notes; k++) {
        const nAt = at + (k * B) / div;
        if (nAt >= s.to) break;
        // Root, root, fifth, root: an insistent figure that follows the harmony.
        const f = hz(ROOT[name]) * [2, 2, 3, 2][k % 4] * (k % 8 === 7 ? 2 : 1);
        m.add(spiccato(f, (B / div) * 0.95), nAt, s.drive * grow * (k % div === 0 ? 1 : 0.72), k % 2 ? 0.18 : -0.18, 0.12);
      }
    }
  }
  if (s.drums) {
    let b = 0;
    for (let at = s.from; at < s.to - 0.02; at += B, b++) {
      const inBar = b % 4;
      if (inBar === 0) m.add(taiko(1.2), at, s.drums, 0, 0.3);
      if (inBar === 2) m.add(taiko(0.9), at, s.drums * 0.8, 0.12, 0.3);
      if (inBar === 3) m.add(taiko(0.7), at + B / 2, s.drums * 0.6, -0.15, 0.3);
      if (inBar === 2) m.add(clap(), at, s.drums * 0.28, 0, 0.5);
      m.add(hat(), at + B / 2, s.drums * 0.09, 0.3, 0.2);
    }
  }
}

export function tune(m: Mix, t: Tune, from: number, bpm: number, voice: "piano" | "lead" | "high", gain: number, pan = 0, wet = 0.45) {
  const B = 60 / bpm;
  for (const [b, n, l] of t) {
    const at = from + b * B;
    if (voice === "piano") m.add(piano(hz(n), Math.max(1.6, l * B * 1.6)), at, gain, pan, wet);
    else if (voice === "lead") m.add(lead(hz(n), l * B + 0.08, 2300), at, gain, pan, wet);
    else m.add(lead(hz(n) * 2, l * B + 0.08, 3600), at, gain, pan, wet);
  }
}

export function hit(m: Mix, at: number, chord: string, size = 1, seconds = 1.8) {
  m.add(kick(1.5), at, 0.95 * size);
  m.add(impact(), at, 0.8 * size);
  m.add(taiko(1.4), at, 0.9 * size, 0, 0.35);
  m.add(brass(CH[chord].map(hz), seconds), at, 0.62 * size, 0, 0.5);
}

function score(m: Mix) {
  // 0:00 The calm: the theme alone on the piano, strings barely there.
  play(m, { from: 0, to: 8, bpm: 72, chords: ["Dm", "Bb"], str: 0.34, bright: 1500, sub: 0.1 });
  tune(m, THEME.slice(0, 7), 0.7, 72, "piano", 0.5);
  m.add(riser(1.3), 6.8, 0.3, 0, 0.4);

  // 0:08 The news: the sting, the driving figure starts.
  hit(m, 8.05, "Dm", 0.7);
  for (const [at, n, g] of [[8.05, "A5", 0.3], [8.3, "E6", 0.3], [8.55, "A6", 0.32]] as const) m.add(pluck(hz(n), 0.5), at, g, 0, 0.3);
  play(m, { from: 8.05, to: 22, bpm: 72, chords: ["Dm", "Bb", "F", "C"], str: 0.5, sub: 0.34, drive: 0.38 });
  tune(m, oct(THEME, -1), 11.4, 72, "lead", 0.26, -0.15);

  // 0:22 Getting ready: more urgent, the hammering locks to it.
  play(m, { from: 22, to: 36, bpm: 72, chords: ["Gm", "Dm", "Bb", "A"], str: 0.56, sub: 0.38, drive: 0.42, div: 3, drums: 0.42, swell: true });
  tune(m, THEME, 22.8, 72, "lead", 0.3, 0.1);

  // 0:36 Tomas remembers: everything drops away but the piano and warm strings.
  play(m, { from: 36, to: 46, bpm: 72, chords: ["F", "C", "Dm", "Bb"], str: 0.38, bright: 1400, sub: 0.14 });
  tune(m, oct(THEME.slice(0, 9), -1), 36.4, 72, "piano", 0.52);

  // 0:46 The surge: faster, climbing with the water.
  play(m, { from: 46, to: 56, bpm: 84, chords: ["Gm", "Eb", "Bb", "A"], beatsPerChord: 4, str: 0.55, sub: 0.38, drive: 0.42, div: 3, drums: 0.46, swell: true });
  m.add(riser(2.6), 53.4, 0.3, 0, 0.4);

  // 0:56 Leaving, then Tomas with Manang Pacing: the music holds its breath for his line.
  play(m, { from: 56, to: 62.4, bpm: 84, chords: ["Dm", "Bb"], str: 0.5, sub: 0.32, drive: 0.36, drums: 0.3 });
  tune(m, oct(THEME.slice(0, 7), -1), 56.2, 84, "lead", 0.26);
  play(m, { from: 62.4, to: 67, bpm: 72, chords: ["F", "C"], str: 0.38, bright: 1500 });
  tune(m, THEME.slice(0, 4), 62.6, 72, "piano", 0.48);
  m.add(riser(2.4), 64.7, 0.32, 0, 0.4);

  // 1:07 The monster: the full weight of it, at 96.
  hit(m, 67.05, "Gm", 1, 2);
  play(m, { from: 67.05, to: 77.5, bpm: 96, chords: ["Gm", "Eb", "Bb", "A"], str: 0.62, bright: 2800, sub: 0.46, drive: 0.46, div: 4, drums: 0.72 });
  tune(m, oct(THEME.slice(0, 11), -1), 67.7, 96, "lead", 0.42);
  tune(m, THEME.slice(0, 11), 67.7, 96, "lead", 0.2, 0.2);
  for (const [at, c] of [[67.9, "Gm"], [71.6, "Eb"], [73.8, "A"]] as const) hit(m, at, c, 0.42, 1);
  m.add(riser(3), 74.5, 0.34, 0, 0.4);

  // 1:19 Landfall: everything, in D minor, with the theme thrown high.
  hit(m, 79.02, "Dm", 1.1, 2.4);
  play(m, { from: 79.02, to: 101, bpm: 96, chords: ["Dm", "Bb", "Gm", "A"], str: 0.7, bright: 3000, sub: 0.5, drive: 0.5, div: 4, drums: 0.8 });
  tune(m, oct(THEME, -1), 80.3, 96, "lead", 0.42);
  tune(m, THEME, 80.3, 96, "high", 0.14, 0.2);
  tune(m, oct(THEME, -1), 90.3, 96, "lead", 0.42);
  tune(m, THEME, 90.3, 96, "high", 0.14, -0.2);
  hit(m, 84.3, "Bb", 0.55, 1.2);
  hit(m, 91.0, "Dm", 0.6, 1.2);

  // 1:41 Losing contact: the drums are gone; the child's question over thin strings.
  play(m, { from: 101, to: 110.3, bpm: 72, chords: ["Gm", "Dm"], str: 0.4, bright: 1200, sub: 0.2 });
  tune(m, oct(THEME.slice(0, 4), -1), 104, 72, "piano", 0.46);
  m.add(strings(CH.Dm.map(hz), 3, { attack: 0.4, release: 1.2, bright: 900 }), 110.3, 0.28, 0, 0.5);

  // 1:53 The crisis: slow and bare.
  m.add(taiko(0.8), 113.05, 0.5, 0, 0.5);
  play(m, { from: 113.05, to: 124, bpm: 60, chords: ["Dm", "Bb", "Gm", "A"], str: 0.42, bright: 1400, sub: 0.22 });
  tune(m, oct(THEME, -1), 113.6, 60, "piano", 0.46);

  // 2:04 Rescue: the figure returns, hopeful and held back.
  play(m, { from: 124, to: 133, bpm: 72, chords: ["F", "C", "Dm", "Bb"], str: 0.46, bright: 1800, sub: 0.26, drive: 0.26 });
  tune(m, oct(THEME.slice(0, 9), -1), 124.6, 72, "lead", 0.24);

  // 2:13 The storm moves on; the crisis doesn't.
  play(m, { from: 133, to: 144, bpm: 60, chords: ["Bb", "Dm", "Gm", "C"], str: 0.42, bright: 1400, sub: 0.2 });
  tune(m, oct(THEME.slice(0, 9), -1), 133.5, 60, "piano", 0.46);

  // 2:24 One week later: into the major, gently.
  play(m, { from: 144, to: 154, bpm: 72, chords: ["F", "C", "Dm", "Bb"], str: 0.46, bright: 1900, sub: 0.24 });
  tune(m, oct(THEME_MAJOR, -1), 144.4, 72, "piano", 0.48);

  // 2:34 The chalkboard and the boat: warmer, growing.
  play(m, { from: 154, to: 168, bpm: 72, chords: ["F", "Bb", "Dm", "C"], str: 0.56, bright: 2400, sub: 0.3, drive: 0.2, swell: true });
  tune(m, oct(THEME_MAJOR, -1), 155.4, 72, "lead", 0.28);
  tune(m, THEME_MAJOR.slice(0, 7), 162.2, 72, "piano", 0.42, 0.1);

  // 2:48 The message: the theme in full, in the major, then a last chord that rings out over the title.
  play(m, { from: 168, to: 175, bpm: 72, chords: ["F", "C", "Bb", "F"], str: 0.68, bright: 3000, sub: 0.38, drive: 0.24, drums: 0.3 });
  tune(m, oct(THEME_MAJOR, -1), 168.2, 72, "lead", 0.4);
  tune(m, THEME_MAJOR.slice(0, 8), 168.2, 72, "high", 0.12, 0.2);
  m.add(riser(1.4), 173.6, 0.26, 0, 0.5);
  hit(m, 175, "F", 0.85, 1.6);
  m.add(strings(CH.F.map(hz), 4.9, { attack: 0.02, release: 3.2, bright: 2600 }), 175, 0.6, 0, 0.7);
  m.add(piano(hz("F4"), 4), 175.02, 0.42, 0, 0.7);
  m.add(piano(hz("C5"), 4), 175.3, 0.3, 0, 0.7);
}

// ── Sound effects ────────────────────────────────────────────────────────────────────────────────────

export function shaped(seconds: number, seed: number, fn: (t: number, n: number) => number) {
  const n = Math.round(seconds * SR);
  const b = new Float32Array(n);
  const rnd = noiseOf(seed);
  for (let i = 0; i < n; i++) b[i] = fn(i / SR, rnd());
  return b;
}

export function surf(seconds: number, seed: number, rate = 0.17) {
  const raw = shaped(seconds, seed, (t, r) => r * (0.32 + 0.68 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * rate)) ** 2) * edges(t, seconds, 0.6, 0.6));
  return svf(raw, (t) => 500 + 1600 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * rate)), 0.8, "low");
}

export function windHowl(seconds: number, seed: number, strength: number) {
  const raw = shaped(seconds, seed, (t, r) => r * edges(t, seconds, 0.5, 0.25));
  const low = svf(raw, (t) => 240 + 300 * strength + 340 * Math.sin(t * 1.5) * Math.sin(t * 0.31 + 1), 3.5 + strength * 5, "band");
  const body = svf(raw, 900, 0.8, "low");
  return low.map((x, i) => x * 1.8 + body[i] * 0.35);
}

export const rain = (seconds: number, seed: number) => svf(shaped(seconds, seed, (t, r) => r * edges(t, seconds, 0.3, 0.3)), 4300, 0.7, "high");

export function engine(seconds: number, hz0: number, seed: number) {
  const rnd = noiseOf(seed);
  let p = 0;
  const raw = shaped(seconds, seed, (t) => {
    const f = hz0 * (1 + 0.02 * Math.sin(t * 7));
    p = (p + f / SR) % 1;
    return ((2 * p - 1) * 0.7 + rnd() * 0.3) * edges(t, seconds, 0.4, 0.5);
  });
  return svf(raw, hz0 * 5, 1.1, "low");
}

export const thud = (seed: number) => svf(shaped(0.14, seed, (t, r) => (Math.sin(2 * Math.PI * (170 - 500 * t) * t) * 1.4 + r * 0.8) * Math.exp(-t * 34)), 2600, 0.9, "low");
export const crack = (seed: number, size = 1) => svf(shaped(0.35 + size * 0.2, seed, (t, r) => r * Math.exp(-t * (24 - size * 8)) * (1 + 0.8 * Math.sin(t * 410))), 1500 + size * 800, 0.9, "low");
export const staticNoise = (seconds: number, seed: number) => shaped(seconds, seed, (t, r) => r * (0.6 + 0.4 * Math.sin(t * 73)) * edges(t, seconds, 0.04, 0.05));

function effects(m: Mix) {
  m.add(surf(8.6, 1), 0, 0.2, 0, 0.1);
  for (let at = 26.05; at < 28; at += 60 / 72 / 2) m.add(thud(Math.round(at * 10)), at, 0.32, 0.25, 0.1);
  m.add(surf(10.5, 2, 0.14), 36, 0.13, 0, 0.1);
  m.add(svf(shaped(10, 4, (t, r) => r * smooth(0, 7, t) * Math.min(1, (10 - t) * 2)), (t) => 200 + t * 120, 0.8, "low"), 46, 0.26, 0, 0.2);
  m.add(engine(5.5, 62, 31), 56, 0.09, 0.2);
  m.add(rain(11, 5), 56, 0.035);
  m.add(windHowl(12, 6, 0.5), 67, 0.08, 0, 0.2);
  m.add(windHowl(22.6, 7, 1), 79, 0.2, 0.08, 0.2);
  m.add(windHowl(22.6, 8, 0.8), 79, 0.16, -0.08, 0.2);
  m.add(rain(22.6, 9), 79, 0.05);
  m.add(surf(13, 11, 0.3), 79, 0.26);
  m.add(crack(1, 1.5), 91.5, 0.4, 0.3, 0.25);
  m.add(crack(2, 1), 92.0, 0.28, -0.2, 0.2);
  m.add(crack(3, 0.8), 85.5, 0.26, 0.3, 0.2);
  m.add(crack(4, 1.4), 87.4, 0.32, -0.3, 0.2);
  m.add(svf(windHowl(9.4, 14, 0.9), 480, 0.9, "low"), 101, 0.16);
  m.add(shaped(6.4, 16, (t, r) => r * Math.abs(Math.sin(t * 38)) ** 6 * edges(t, 6.4, 0.2, 0.2)), 103.6, 0.05, 0.4, 0.1);
  m.add(staticNoise(0.8, 17), 112.2, 0.22);
  for (const at of [110.3, 110.8, 111.2, 111.6, 111.9]) m.add(staticNoise(0.14, Math.round(at * 13)), at, 0.09, 0.2 * Math.sin(at * 9));
  m.add(rain(11, 18), 113, 0.025);
  m.add(surf(11, 19, 0.08), 113, 0.07);
  m.add(engine(9, 92, 33), 124, 0.05, 0.2);
  m.add(rain(20, 20), 124, 0.02);
  for (let at = 146; at < 154; at += 0.72) m.add(thud(Math.round(at * 7)), at, 0.05, -0.35, 0.5);
  m.add(surf(14, 25, 0.14), 154, 0.08);
  m.add(surf(7.4, 26, 0.17), 168, 0.1);
}

// ── The mix ──────────────────────────────────────────────────────────────────────────────────────────

const rms = (L: Float32Array, R: Float32Array, a: number, b: number) => {
  let s = 0, n = 0;
  for (let i = Math.round(a * SR); i < Math.min(Math.round(b * SR), L.length); i++) {
    s += L[i] * L[i] + R[i] * R[i];
    n += 2;
  }
  return 10 * Math.log10(s / (n || 1) + 1e-12);
};

export function writeMusic(file: string) {
  const length = SECONDS + 0.5;
  const mus = new Mix(length), fx = new Mix(length);
  score(mus);
  effects(fx);
  // The score against the effects, shot by shot: the score has to lead everywhere.
  for (const s of SHOTS) console.log(`  ${s.name.padEnd(10)} score ${rms(mus.L, mus.R, s.from, s.to).toFixed(1).padStart(6)} dB   effects ${rms(fx.L, fx.R, s.from, s.to).toFixed(1).padStart(6)} dB`);
  const m = new Mix(length);
  for (let i = 0; i < m.L.length; i++) {
    m.L[i] = mus.L[i] + fx.L[i];
    m.R[i] = mus.R[i] + fx.R[i];
    m.wetL[i] = mus.wetL[i] + fx.wetL[i];
    m.wetR[i] = mus.wetR[i] + fx.wetR[i];
  }
  // A held breath before landfall: everything stops for the last second and a half of the monster.
  const i0 = Math.round(77.5 * SR), i1 = Math.round(78.95 * SR);
  for (let i = i0; i < i1; i++) {
    const keep = 1 - Math.min(1, (i - i0) / (0.05 * SR));
    m.L[i] *= keep;
    m.R[i] *= keep;
    m.wetL[i] *= keep;
    m.wetR[i] *= keep;
  }
  m.finish(0.8);
  m.write(file);
  console.log(`  ✓ score and effects, no voices → ${file}`);
}
