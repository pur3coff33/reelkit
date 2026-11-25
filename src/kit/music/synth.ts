// A small synth for writing a reel's music in code: drums, bass, pads, plucks, risers and a plain reverb, mixed onto a
// stereo timeline and written as a WAV. Every sound is made here, so the track is original and its beats are exact.
import { writeFileSync } from "node:fs";

export const SR = 48_000;

export const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
/** Note names to MIDI numbers: "D3" → 50, "F#4" → 66. */
export function note(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as "C"];
  return base + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) + 1) * 12;
}
export const hz = (name: string) => midi(note(name));

/** Deterministic noise, so a track renders the same every time. */
function noiseSource(seed = 7) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 2147483648 - 1;
  };
}
const noise = noiseSource();

/** Chamberlin state-variable filter, cutoff in Hz per sample (a number or a function of time in seconds). */
export function svf(input: Float32Array, cutoff: number | ((t: number) => number), q: number, mode: "low" | "high" | "band") {
  const out = new Float32Array(input.length);
  let low = 0, band = 0;
  const damp = 1 / q;
  for (let i = 0; i < input.length; i++) {
    const fc = typeof cutoff === "number" ? cutoff : cutoff(i / SR);
    const f = 2 * Math.sin((Math.PI * Math.min(Math.max(fc, 10), SR / 6)) / SR);
    low += f * band;
    const high = input[i] - low - damp * band;
    band += f * high;
    out[i] = mode === "low" ? low : mode === "high" ? high : band;
  }
  return out;
}

const len = (seconds: number) => Math.max(1, Math.round(seconds * SR));

/** Attack/decay envelope multiplied in place. */
function env(buf: Float32Array, attack: number, decay: number, curve = 4) {
  const a = len(attack);
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const g = i < a ? i / a : Math.exp((-(t - attack) / decay) * curve * 0.25);
    buf[i] *= g;
  }
  return buf;
}

// ── Instruments: each returns a mono buffer. ─────────────────────────────────────────────────────────────

export function kick(punch = 1) {
  const n = len(0.45);
  const b = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 45 + 110 * Math.exp(-t * 28);
    phase += (2 * Math.PI * f) / SR;
    b[i] = Math.sin(phase) * Math.exp(-t * 7) + (i < 120 ? noise() * 0.4 * punch : 0);
  }
  return b.map((x) => Math.tanh(x * 1.6));
}

export function clap() {
  const n = len(0.3);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // three quick bursts then a tail, like hands
    const burst = [0, 0.011, 0.022].some((s) => t >= s && t < s + 0.008) ? 1 : 0;
    raw[i] = noise() * (burst * 0.8 + Math.exp(-t * 18) * 0.6);
  }
  return svf(raw, 1400, 1.2, "band").map((x) => x * 2.2);
}

export function hat(open = false) {
  const n = len(open ? 0.25 : 0.06);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = noise() * Math.exp((-i / SR) * (open ? 14 : 70));
  return svf(raw, 8000, 0.8, "high");
}

/** A rounded saw bass. */
export function bass(freq: number, seconds: number) {
  const n = len(seconds);
  const raw = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    p = (p + freq / SR) % 1;
    raw[i] = (2 * p - 1) * 0.6 + Math.sin(2 * Math.PI * p) * 0.6;
  }
  const out = svf(raw, (t) => 220 + 900 * Math.exp(-t * 9), 1.4, "low");
  return env(out, 0.005, seconds * 0.9).map((x, i) => (i > n - 300 ? x * ((n - i) / 300) : x));
}

/** Detuned saws through a soft low-pass: a stab when short, a pad when long. Returns [left, right]. */
export function chord(freqs: number[], seconds: number, opts: { attack?: number; bright?: number } = {}) {
  const n = len(seconds);
  const L = new Float32Array(n), R = new Float32Array(n);
  const voices = freqs.flatMap((f) => [f * 0.997, f * 1.003]);
  const phases = voices.map((_, i) => (i * 0.37) % 1);
  for (let i = 0; i < n; i++) {
    let l = 0, r = 0;
    voices.forEach((f, v) => {
      phases[v] = (phases[v] + f / SR) % 1;
      const s = 2 * phases[v] - 1;
      if (v % 2) r += s;
      else l += s;
    });
    L[i] = l / voices.length;
    R[i] = r / voices.length;
  }
  const cut = (t: number) => (opts.bright ?? 2500) * (0.5 + 0.5 * Math.exp(-t * 3)) + 300;
  return [svf(L, cut, 0.9, "low"), svf(R, cut, 0.9, "low")].map((b) => env(b, opts.attack ?? 0.01, seconds * 0.7)) as [Float32Array, Float32Array];
}

/** A bell-like pluck (sine plus soft overtones). */
export function pluck(freq: number, seconds = 0.6) {
  const n = len(seconds);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    b[i] =
      Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 6) +
      Math.sin(2 * Math.PI * freq * 2 * t) * 0.35 * Math.exp(-t * 11) +
      Math.sin(2 * Math.PI * freq * 3.01 * t) * 0.12 * Math.exp(-t * 18);
  }
  return env(b, 0.002, seconds);
}

/** Filtered noise sweeping up, louder towards its end. */
export function riser(seconds: number) {
  const n = len(seconds);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = noise() * (i / n) ** 2;
  return svf(raw, (t) => 400 + 7000 * (t / seconds) ** 2, 2.5, "band").map((x) => x * 1.6);
}

/** A low boom with a noise crack, for big hits. */
export function impact() {
  const n = len(1.2);
  const b = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    p += (2 * Math.PI * (38 + 30 * Math.exp(-t * 10))) / SR;
    b[i] = Math.sin(p) * Math.exp(-t * 3) * 0.9 + noise() * Math.exp(-t * 30) * 0.3;
  }
  return b;
}

// ── Mixing ───────────────────────────────────────────────────────────────────────────────────────────

export class Mix {
  L: Float32Array;
  R: Float32Array;
  /** Sends to the reverb. */
  wetL: Float32Array;
  wetR: Float32Array;
  constructor(public seconds: number) {
    const n = len(seconds);
    this.L = new Float32Array(n);
    this.R = new Float32Array(n);
    this.wetL = new Float32Array(n);
    this.wetR = new Float32Array(n);
  }

  /** Mixes `sound` (mono, or [left, right]) in at `at` seconds. `pan` −1…1, `wet` the reverb send. */
  add(sound: Float32Array | [Float32Array, Float32Array], at: number, gain = 1, pan = 0, wet = 0) {
    const [l, r] = sound instanceof Float32Array ? [sound, sound] : sound;
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    const start = Math.round(at * SR);
    for (let i = 0; i < l.length; i++) {
      const j = start + i;
      if (j < 0 || j >= this.L.length) continue;
      this.L[j] += l[i] * gl;
      this.R[j] += r[i] * gr;
      this.wetL[j] += l[i] * gl * wet;
      this.wetR[j] += r[i] * gr * wet;
    }
  }

  /** Dips everything added so far (the "pumping" under a kick) after each time in `at`. */
  duck(at: number[], depth = 0.5, release = 0.22) {
    const g = new Float32Array(this.L.length).fill(1);
    for (const t of at) {
      const s = Math.round(t * SR);
      for (let i = 0; i < len(release); i++) {
        if (s + i >= g.length) break;
        g[s + i] = Math.min(g[s + i], 1 - depth * (1 - i / len(release)) ** 2);
      }
    }
    for (let i = 0; i < g.length; i++) {
      this.L[i] *= g[i];
      this.R[i] *= g[i];
    }
  }

  /** Reverb on the sends, a fade at the end, soft clipping and a −1 dBFS peak. */
  finish(fadeSeconds = 0.4) {
    const wl = reverb(this.wetL, 0), wr = reverb(this.wetR, 23);
    const n = this.L.length, fade = len(fadeSeconds);
    let peak = 0;
    for (let i = 0; i < n; i++) {
      const f = i > n - fade ? (n - i) / fade : 1;
      this.L[i] = Math.tanh((this.L[i] + wl[i] * 0.35) * 0.9) * f;
      this.R[i] = Math.tanh((this.R[i] + wr[i] * 0.35) * 0.9) * f;
      peak = Math.max(peak, Math.abs(this.L[i]), Math.abs(this.R[i]));
    }
    const norm = 0.89 / (peak || 1);
    for (let i = 0; i < n; i++) {
      this.L[i] *= norm;
      this.R[i] *= norm;
    }
  }

  write(file: string) {
    writeWav(file, this.L, this.R);
  }
}

/** Schroeder reverb: four combs into two all-passes. `spread` offsets the delays for the other channel. */
function reverb(input: Float32Array, spread: number) {
  const combs = [1557, 1617, 1491, 1422].map((d) => d + spread);
  const out = new Float32Array(input.length);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let k = 0, lp = 0;
    for (let i = 0; i < input.length; i++) {
      const y = buf[k];
      lp = y * 0.7 + lp * 0.3;
      buf[k] = input[i] + lp * 0.84;
      out[i] += y / combs.length;
      k = (k + 1) % d;
    }
  }
  for (const d of [225 + spread, 556 + spread]) {
    const buf = new Float32Array(d);
    let k = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buf[k];
      const y = -out[i] + b;
      buf[k] = out[i] + b * 0.5;
      out[i] = y;
      k = (k + 1) % d;
    }
  }
  return out;
}

/** 16-bit stereo PCM WAV. */
export function writeWav(file: string, L: Float32Array, R: Float32Array) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(file, buf);
}
