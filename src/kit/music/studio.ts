// A small recording studio for scores: real instruments (sampler.ts) played a little loosely, each on its own stem with its
// own tone, echo and distance in a hall, levelled by measured loudness rather than by guess, then mastered.
// The method is adapted from the `compose` skill (MIT): see .claude/skills/reel-score.
import { type Instrument, convolve, hallResponse, type PlayOptions } from "./sampler";
import { SR, note as noteNumber, svf } from "./synth";

/** Random numbers in 0…1, the same every run. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Harmony ──────────────────────────────────────────────────────────────────────────────────────────

const PC: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const SHAPES: Record<string, number[]> = {
  "": [0, 4, 7], m: [0, 3, 7], "6": [0, 4, 7, 9], m6: [0, 3, 7, 9], "7": [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  "9": [0, 4, 10, 14], maj9: [0, 4, 11, 14], m9: [0, 3, 10, 14], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
  sus2: [0, 2, 7], sus4: [0, 5, 7], "7sus4": [0, 5, 7, 10], "9sus4": [0, 5, 10, 14], m11: [0, 3, 10, 17], "maj7#11": [0, 4, 11, 18],
};

export type Chord = { root: number; bass: number; pcs: number[] };

/** "Dmaj9", "Em11", "Gmaj7/B": pitch classes, with the bass apart. */
export function parseChord(name: string): Chord {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(name);
  const shape = m ? SHAPES[m[2]] : undefined;
  if (!m || !shape || PC[m[1]] === undefined || (m[3] && PC[m[3]] === undefined)) throw new Error(`unknown chord ${name}`);
  const root = PC[m[1]];
  return { root, bass: m[3] ? PC[m[3]] : root, pcs: [...new Set(shape.map((i) => (root + i) % 12))] };
}

/** The lowest note of pitch class `pc` at or above `lo`. */
export const above = (pc: number, lo: number) => lo + ((((pc - lo) % 12) + 12) % 12);

/** `count` different notes of a chord between lo and hi, moving as little as they can from `prev`. */
export function voice(c: Chord, lo: number, hi: number, count: number, prev?: number[]): number[] {
  const pool: number[] = [];
  for (let p = lo; p <= hi; p++) if (c.pcs.includes(p % 12)) pool.push(p);
  const want = Math.min(count, pool.length);
  const third = c.pcs.find((p) => [3, 4].includes((p - c.root + 12) % 12));
  let best: number[] = [];
  let score = Infinity;
  const pick = (from: number, got: number[]) => {
    if (got.length === want) {
      let s = 0;
      for (let i = 1; i < got.length; i++) {
        const gap = got[i] - got[i - 1];
        // Close seconds are mud low down and colour up high; very wide gaps leave a hole.
        if (gap < 3) s += got[i - 1] < 60 ? 8 : 1.5;
        if (gap > 9) s += gap - 9;
      }
      s += (want - new Set(got.map((p) => p % 12)).size) * 5;
      if (third !== undefined && !got.some((p) => p % 12 === third)) s += 6;
      if (prev?.length === want) s += got.reduce((a, p, i) => a + Math.abs(p - prev[i]), 0) * 0.8;
      else s += Math.abs(got.reduce((a, p) => a + p, 0) / want - (lo + hi) / 2) * 0.5;
      if (s < score) {
        score = s;
        best = got;
      }
      return;
    }
    for (let i = from; i < pool.length; i++) pick(i + 1, [...got, pool[i]]);
  };
  pick(0, []);
  return best;
}

// ── Stems ────────────────────────────────────────────────────────────────────────────────────────────

export type StemSpec = {
  /** Integrated loudness this stem is set to in the mix, LUFS. */
  lufs: number;
  /** Tone: cut below and above, in Hz. */
  low?: number;
  high?: number;
  /** Echo: seconds between repeats, how much of each feeds the next, and its level. */
  echo?: { time: number; feedback: number; mix: number };
  /** Distance: hall length (s), level, and the gap before it answers (shorter reads as further away). */
  hall?: { seconds: number; mix: number; gap?: number };
  /** Warms the sound and gives low notes harmonics a phone speaker can play, 0…1. */
  warmth?: number;
  /** How loosely it is played: seconds of timing drift either way, and velocity drift. */
  loose?: { time: number; velocity: number };
};

export type NoteOptions = PlayOptions & { gain?: number; pan?: number };

export class Stem {
  L: Float32Array;
  R: Float32Array;
  private rnd: () => number;
  private rides: [number, number][] = [];

  constructor(public name: string, public spec: StemSpec, seconds: number, seed: number) {
    this.L = new Float32Array(Math.round(seconds * SR));
    this.R = new Float32Array(this.L.length);
    this.rnd = seeded(seed);
  }

  /** Mixes a sound in. `pan` −1…1, equal power. */
  add(sound: Float32Array | [Float32Array, Float32Array], at: number, gain = 1, pan = 0) {
    const [l, r] = sound instanceof Float32Array ? [sound, sound] : sound;
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    const start = Math.round(at * SR);
    for (let i = Math.max(0, -start); i < l.length && start + i < this.L.length; i++) {
      this.L[start + i] += l[i] * gl;
      this.R[start + i] += r[i] * gr;
    }
  }

  /** One note, a little off the grid and off the dynamic, as a person would play it. */
  note(inst: Instrument, pitch: number | string, at: number, seconds: number, velocity: number, o: NoteOptions = {}) {
    const { gain = 1, pan = 0, ...play } = o;
    const loose = this.spec.loose ?? { time: 0.012, velocity: 0.06 };
    const t = Math.max(0, at + (this.rnd() * 2 - 1) * loose.time);
    const v = Math.min(1, Math.max(0.02, velocity * (1 + (this.rnd() * 2 - 1) * loose.velocity)));
    this.add(inst.play(typeof pitch === "string" ? noteNumber(pitch) : pitch, seconds, v, play), t, gain * (0.3 + 0.7 * v), pan);
  }

  /** The player's dynamics: gain keys [seconds, level], eased between. */
  ride(keys: [number, number][]) {
    this.rides = keys;
  }

  /** The stem as it goes to the mix: tone, dynamics, warmth, echo, hall. */
  produce(): [Float32Array, Float32Array] {
    const s = this.spec;
    const side = (dry: Float32Array, seed: number): Float32Array => {
      let x = dry;
      if (s.low) x = svf(x, s.low, 0.7, "high");
      if (s.high) x = svf(x, s.high, 0.7, "low");
      if (this.rides.length) x = x.map((v, i) => v * rideAt(this.rides, i / SR));
      if (s.warmth) {
        // Driven from the stem's own peak, so the amount of colour doesn't depend on how loud it was recorded.
        const peak = x.reduce((a, v) => Math.max(a, Math.abs(v)), 1e-9);
        const d = 1 + 3 * s.warmth;
        const n = Math.tanh(d);
        x = x.map((v) => (Math.tanh((v / peak) * d) / n) * peak);
      }
      const out = Float32Array.from(x);
      if (s.echo) {
        // Each repeat is darker than the last, and lands a hair apart on the two sides.
        const d = Math.round((s.echo.time + (seed % 2) * 0.011) * SR);
        const buf = new Float32Array(x.length);
        let lp = 0;
        for (let i = d; i < x.length; i++) {
          lp += 0.32 * (x[i - d] + buf[i - d] * s.echo.feedback - lp);
          buf[i] = lp;
          out[i] += lp * s.echo.mix;
        }
      }
      if (s.hall) {
        const room = hallResponse(s.hall.seconds, seed, s.hall.gap ?? 0.03);
        const energy = Math.sqrt(room.reduce((a, v) => a + v * v, 0)) || 1;
        // The room is fed without the low end, so it doesn't boom.
        const wet = convolve(svf(out, 160, 0.7, "high"), room);
        for (let i = 0; i < out.length; i++) out[i] += (wet[i] / energy) * s.hall.mix;
      }
      return out;
    };
    return [side(this.L, 11), side(this.R, 12)];
  }
}

function rideAt(keys: [number, number][], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, g1] = keys[i];
    const [t0, g0] = keys[i - 1];
    if (t < t1) {
      const k = (t - t0) / (t1 - t0);
      return g0 + (g1 - g0) * k * k * (3 - 2 * k);
    }
  }
  return keys[keys.length - 1][1];
}

// ── Loudness ─────────────────────────────────────────────────────────────────────────────────────────

/** BS.1770's two ear-weighting filters, at 48 kHz. */
function kWeight(x: Float32Array) {
  const run = (src: Float32Array, b: number[], a: number[]) => {
    const out = new Float32Array(src.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < src.length; i++) {
      const y = b[0] * src[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      x2 = x1;
      x1 = src[i];
      y2 = y1;
      y1 = y;
      out[i] = y;
    }
    return out;
  };
  return run(run(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]), [1, -2, 1], [-1.99004745483398, 0.99007225036621]);
}

/** Mean power of each 0.4 s block, every 0.1 s. */
function blocks(L: Float32Array, R: Float32Array) {
  const l = kWeight(L), r = kWeight(R);
  const hop = Math.round(0.1 * SR), size = 4 * hop;
  const out: number[] = [];
  for (let at = 0; at + size <= l.length; at += hop) {
    let p = 0;
    for (let i = at; i < at + size; i++) p += l[i] * l[i] + r[i] * r[i];
    out.push(p / size);
  }
  return out;
}

const db = (p: number) => -0.691 + 10 * Math.log10(p + 1e-12);
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1);

/** Integrated loudness, LUFS (gated, so rests don't count). */
export function lufs(L: Float32Array, R: Float32Array) {
  const loud = blocks(L, R).filter((p) => db(p) > -70);
  if (!loud.length) return -Infinity;
  const gate = db(mean(loud)) - 10;
  return db(mean(loud.filter((p) => db(p) > gate)));
}

/** Loudness of a stretch, LUFS, ungated: for checking a score's shape. */
export function loudnessOf(L: Float32Array, R: Float32Array, from: number, to: number) {
  const a = Math.round(from * SR), b = Math.round(to * SR);
  return db(mean(blocks(L.subarray(a, b), R.subarray(a, b))));
}

// ── The session ──────────────────────────────────────────────────────────────────────────────────────

export class Session {
  stems: Stem[] = [];
  constructor(public seconds: number, private seed = 1) {}

  stem(name: string, spec: StemSpec) {
    const s = new Stem(name, spec, this.seconds, this.seed * 7919 + this.stems.length * 101);
    this.stems.push(s);
    return s;
  }

  /** Every stem at its loudness, summed, cut below 30 Hz, faded out, brought to `target` LUFS under a limiter. */
  master(o: { target: number; fade?: number; ceilingDb?: number; width?: number }) {
    const n = Math.round(this.seconds * SR);
    let L: Float32Array = new Float32Array(n);
    let R: Float32Array = new Float32Array(n);
    for (const s of this.stems) {
      const [l, r] = s.produce();
      const was = lufs(l, r);
      if (!Number.isFinite(was)) throw new Error(`stem ${s.name} is silent`);
      const g = 10 ** ((s.spec.lufs - was) / 20);
      for (let i = 0; i < n; i++) {
        L[i] += l[i] * g;
        R[i] += r[i] * g;
      }
    }
    L = svf(L, 30, 0.7, "high");
    R = svf(R, 30, 0.7, "high");
    // Phones play both sides through one speaker: keep the low end in the middle and don't spread the rest too far.
    const mid = L.map((v, i) => (v + R[i]) / 2);
    const side = svf(L.map((v, i) => (v - R[i]) / 2), 180, 0.7, "high");
    const width = o.width ?? 0.6;
    for (let i = 0; i < n; i++) {
      L[i] = mid[i] + side[i] * width;
      R[i] = mid[i] - side[i] * width;
    }
    const fade = Math.round((o.fade ?? 1.5) * SR), rise = Math.round(0.01 * SR);
    for (let i = 0; i < n; i++) {
      const g = Math.min(1, i / rise) * (i > n - fade ? Math.cos(((i - (n - fade)) / fade) * (Math.PI / 2)) : 1);
      L[i] *= g;
      R[i] *= g;
    }
    const g = 10 ** ((o.target - lufs(L, R)) / 20);
    for (let i = 0; i < n; i++) {
      L[i] *= g;
      R[i] *= g;
    }
    const reduced = limit(L, R, 10 ** ((o.ceilingDb ?? -1.5) / 20));
    return { L, R, reduced, loudness: lufs(L, R) };
  }
}

/** A look-ahead limiter, in place. Returns the most it turned down, in dB: over about 3 means the mix is too hot. */
export function limit(L: Float32Array, R: Float32Array, ceiling: number) {
  const look = Math.round(0.005 * SR), release = Math.exp(-1 / (0.12 * SR)), n = L.length;
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    need[i] = p > ceiling ? ceiling / p : 1;
  }
  // The least gain anywhere in the window ahead, kept in a queue so it's one pass.
  const q: number[] = [];
  let head = 0, g = 1, worst = 1, j = 0;
  for (let i = 0; i < n; i++) {
    for (; j < n && j <= i + look; j++) {
      while (q.length > head && need[q[q.length - 1]] >= need[j]) q.pop();
      q.push(j);
    }
    while (q[head] < i) head++;
    const want = need[q[head]];
    // Down within the look-ahead, up slowly.
    g = want < g ? g - (g - want) / (look * 0.2) : want + (g - want) * release;
    const now = Math.min(g, need[i]);
    worst = Math.min(worst, now);
    L[i] *= now;
    R[i] *= now;
  }
  return -20 * Math.log10(worst);
}
