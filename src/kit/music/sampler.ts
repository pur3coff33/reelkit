// Real instruments for a reel's score: plays notes from a folder of recorded WAVs named by pitch, at the Mix's sample
// rate. Long notes loop the middle of the recording with a crossfade. Also a hall reverb, convolved from a synthetic room
// response, for what the plain Schroeder one in synth.ts can't do on real strings.
//
// Samples come from the Versilian Studios Chamber Orchestra 2 Community Edition (CC0) and are fetched on first use into
// .state/samples (gitignored). Only the folders a reel asks for are downloaded.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { ROOT } from "../paths";
import { SR, midi as hzOf, note as noteNumber } from "./synth";

const REPO = "sgossner/VSCO-2-CE";
const CACHE = join(ROOT, ".state", "samples", "vsco");

export type Wav = { rate: number; channels: Float32Array[] };

/** Reads a PCM (16, 24 or 32 bit) or float WAV. */
export function parseWav(buf: Buffer): Wav {
  if (buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WAVE") throw new Error("not a WAV file");
  let format = 0, count = 0, rate = 0, bits = 0, at = 12;
  let data: Buffer | null = null;
  while (at + 8 <= buf.length) {
    const id = buf.toString("latin1", at, at + 4), size = buf.readUInt32LE(at + 4), body = at + 8;
    if (id === "fmt ") {
      format = buf.readUInt16LE(body);
      count = buf.readUInt16LE(body + 2);
      rate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
      if (format === 0xfffe) format = buf.readUInt16LE(body + 24);
    } else if (id === "data") data = buf.subarray(body, Math.min(body + size, buf.length));
    at = body + size + (size & 1);
  }
  if (!data || !count) throw new Error("WAV has no audio");
  const bytes = bits / 8, frames = Math.floor(data.length / (bytes * count));
  const channels = Array.from({ length: count }, () => new Float32Array(frames));
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < count; c++) {
      const p = (f * count + c) * bytes;
      let v: number;
      if (format === 3) v = bits === 64 ? data.readDoubleLE(p) : data.readFloatLE(p);
      else if (bits === 16) v = data.readInt16LE(p) / 32768;
      else if (bits === 24) v = data.readIntLE(p, 3) / 8388608;
      else if (bits === 32) v = data.readInt32LE(p) / 2147483648;
      else throw new Error(`unsupported WAV: ${bits}-bit`);
      channels[c][f] = v;
    }
  }
  return { rate, channels };
}

/** Pitch and loudness layer from a file name: "susvib_A2_v1_1.wav", "BKCtbss_SusNV_A#0_v3_rr1.wav", "UR1_C3_pp_RR1.wav". */
export function parseName(name: string): { midi: number; layer: number } | null {
  const m = /(?:^|_)([A-G]#?-?\d)(?:_|\.)/.exec(name);
  if (!m) return null;
  const v = /_v(\d+)(?:_|\.)/.exec(name);
  const d = /_(pp|p|mp|mf|f|ff)(?:_|\.)/.exec(name);
  const layer = v ? Number(v[1]) : d ? ["pp", "p", "mp", "mf", "f", "ff"].indexOf(d[1]) + 1 : 1;
  return { midi: noteNumber(m[1]), layer };
}

/** Downloads a folder of the library once. `only` keeps the file names it matches. */
export async function ensureSamples(folder: string, only?: RegExp) {
  const dir = join(CACHE, folder);
  const done = join(dir, ".complete");
  if (existsSync(done)) return dir;
  mkdirSync(dir, { recursive: true });
  const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`, { headers: { "User-Agent": "reelkit" } });
  if (!res.ok) throw new Error(`could not list the sample library: HTTP ${res.status}`);
  const tree = (await res.json()) as { tree: { path: string; type: string }[] };
  const files = tree.tree.filter((e) => e.type === "blob" && e.path.startsWith(`${folder}/`) && e.path.toLowerCase().endsWith(".wav") && !e.path.slice(folder.length + 1).includes("/") && (!only || only.test(e.path)));
  if (!files.length) throw new Error(`no samples in ${folder}`);
  console.log(`  fetching ${files.length} samples: ${folder}`);
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < files.length) {
        const file = files[next++];
        const target = join(dir, basename(file.path));
        if (existsSync(target)) continue;
        const url = `https://raw.githubusercontent.com/${REPO}/master/${file.path.split("/").map(encodeURIComponent).join("/")}`;
        const r = await fetch(url, { headers: { "User-Agent": "reelkit" } });
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        writeFileSync(target, Buffer.from(await r.arrayBuffer()));
      }
    }),
  );
  writeFileSync(done, new Date().toISOString());
  return dir;
}

type Sample = { file: string; midi: number; layer: number };

export type PlayOptions = {
  /** Fade in (seconds): a bow already moving rather than the recorded attack. */
  attack?: number;
  /** Fade out (seconds), added after `seconds`. */
  release?: number;
  /** Skip this far into the recording before the note starts (seconds). */
  skip?: number;
  /** A slow swell over the note: 0 flat, 1 from silence up and back. */
  swell?: number;
};

/** Picks the recording nearest in pitch, then the nearest loudness layer. Ties go to the lower pitch, which stretches less cleanly upward. */
export function pickSample<T extends { midi: number; layer: number }>(list: T[], midi: number, velocity: number, layers: number): T {
  let best = list[0], score = Infinity;
  const want = 1 + Math.round(Math.min(1, Math.max(0, velocity)) * (layers - 1));
  for (const s of list) {
    const d = Math.abs(s.midi - midi) + Math.abs(s.layer - want) * 0.2 + (s.midi > midi ? 0.01 : 0);
    if (d < score) {
      score = d;
      best = s;
    }
  }
  return best;
}

/** A value at a fractional position, by Catmull-Rom. */
function read(buf: Float32Array, p: number) {
  const i = Math.floor(p), f = p - i;
  const a = buf[i - 1] ?? 0, b = buf[i] ?? 0, c = buf[i + 1] ?? 0, d = buf[i + 2] ?? 0;
  return b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
}

export class Instrument {
  private samples: Sample[];
  private layers: number;
  private cache = new Map<string, { rate: number; L: Float32Array; R: Float32Array; start: number }>();

  /**
   * `shift`: semitones between a file's name and the pitch it really sounds. See NAMED_AN_OCTAVE_LOW.
   * `cents`: how far each recording (by its named note number) is from in tune, corrected on playback.
   */
  constructor(dir: string, opts: { only?: RegExp; shift?: number; cents?: Record<number, number> } = {}) {
    this.samples = readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".wav") && (!opts.only || opts.only.test(f)))
      .flatMap((f) => {
        const parsed = parseName(f);
        return parsed ? [{ file: join(dir, f), midi: parsed.midi + (opts.shift ?? 0) + (opts.cents?.[parsed.midi] ?? 0) / 100, layer: parsed.layer }] : [];
      });
    if (!this.samples.length) throw new Error(`no usable samples in ${dir}`);
    this.layers = Math.max(...this.samples.map((s) => s.layer));
  }

  private load(file: string) {
    const hit = this.cache.get(file);
    if (hit) return hit;
    const wav = parseWav(readFileSync(file));
    const L = wav.channels[0], R = wav.channels[1] ?? L;
    // The recording starts where the sound does.
    let start = 0;
    while (start < L.length - 1 && Math.abs(L[start]) < 0.0015 && Math.abs(R[start]) < 0.0015) start++;
    const out = { rate: wav.rate, L, R, start };
    this.cache.set(file, out);
    return out;
  }

  /** One note, `seconds` long plus its release. Returns [left, right] at the Mix's sample rate. */
  play(midi: number, seconds: number, velocity = 0.5, opts: PlayOptions = {}): [Float32Array, Float32Array] {
    const s = pickSample(this.samples, midi, velocity, this.layers);
    const w = this.load(s.file);
    const step = 2 ** ((midi - s.midi) / 12) * (w.rate / SR);
    const attack = opts.attack ?? 0.02, release = opts.release ?? 0.4, swell = opts.swell ?? 0;
    const total = Math.round((seconds + release) * SR);
    const L = new Float32Array(total), R = new Float32Array(total);
    const last = w.L.length - 3;
    // The steady middle of the recording, for notes longer than it is.
    const body = last - w.start;
    const loopFrom = w.start + body * 0.3;
    // A whole number of the note's periods, so the two ends of the crossfade agree in phase and don't cancel.
    const period = w.rate / hzOf(s.midi);
    const span = Math.max(1, Math.round((body * 0.56) / period)) * period;
    const loopTo = loopFrom + span;
    const fade = Math.min(span * 0.45, w.rate * 0.6);
    const a = Math.max(1, Math.round(attack * SR)), n = Math.round(seconds * SR), rel = Math.max(1, total - n);
    let p = w.start + (opts.skip ?? 0) * w.rate;
    for (let i = 0; i < total; i++) {
      let l = 0, r = 0;
      if (p < last) {
        if (p > loopTo - fade && seconds * w.rate * step > body * 0.7) {
          const k = (p - (loopTo - fade)) / fade, q = p - span;
          const g0 = Math.cos((k * Math.PI) / 2), g1 = Math.sin((k * Math.PI) / 2);
          l = read(w.L, p) * g0 + read(w.L, q) * g1;
          r = read(w.R, p) * g0 + read(w.R, q) * g1;
          if (p >= loopTo) p -= span;
        } else {
          l = read(w.L, p);
          r = read(w.R, p);
        }
      }
      let g = i < a ? Math.sin(((i / a) * Math.PI) / 2) : 1;
      if (i >= n) g *= Math.cos((((i - n) / rel) * Math.PI) / 2);
      if (swell > 0) g *= 1 - swell + swell * Math.sin((Math.min(1, i / n) * Math.PI));
      L[i] = l * g;
      R[i] = r * g;
      p += step;
    }
    return [L, R];
  }
}

/**
 * The library's section strings name pitches on the "middle C = C3" convention, so each sounds an octave above its name:
 * the cello's open C string, C2, is filed as C1. Measured by autocorrelation; a score that trusts the names plays these
 * an octave too high against the solo violin and the piano, which are named normally. Add a folder here once it's measured.
 */
const NAMED_AN_OCTAVE_LOW = [/^Strings\/Cello Section\//, /^Strings\/Viola Section\//, /^Strings\/Violin Section\//, /^Strings\/Solo Contrabass\//, /^Woodwinds\/Flute\/susNV/];

/** Semitones between a folder's file names and what its recordings sound. */
export const namingShift = (folder: string) => (NAMED_AN_OCTAVE_LOW.some((r) => r.test(folder)) ? 12 : 0);

/** The harp's strings, measured against equal temperament (cents by note number): its recordings aren't quite in tune. */
const HARP_CENTS: Record<number, number> = { 28: -19, 31: -19, 35: -14, 38: -7, 41: -6, 45: -5, 48: -4, 52: -3, 55: -8, 59: -14, 62: -10, 65: 4, 69: -13, 72: -15, 76: -3, 79: 8, 83: -14, 86: -21, 89: -23, 93: 4, 95: 25, 98: -21, 101: -23 };

/** Cents each recording in a folder is off by, for the folders measured. */
export const tuning = (folder: string) => (folder === "Strings/Harp" ? HARP_CENTS : undefined);

/** Fetches a folder and opens it as an instrument, at its true pitch. */
export async function instrument(folder: string, only?: RegExp) {
  return new Instrument(await ensureSamples(folder, only), { only, shift: namingShift(folder), cents: tuning(folder) });
}

// ── A hall ───────────────────────────────────────────────────────────────────────────────────────────

/** In-place radix-2 FFT. */
function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] /= n;
  }
}

/** A room's decay: noise, darker as it fades, with a short pre-delay. Same seed, same room. */
export function hallResponse(seconds: number, seed = 11, preDelay = 0.022) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let a = seed >>> 0, low = 0;
  const pre = Math.round(preDelay * SR), rt = seconds / 6.9;
  for (let i = pre; i < n; i++) {
    a = (a * 1664525 + 1013904223) >>> 0;
    const x = a / 2147483648 - 1, t = (i - pre) / SR;
    // Highs die first, as they do in air and on soft walls.
    const cut = 0.08 + 0.5 * Math.exp(-t * 3.2);
    low += cut * (x - low);
    out[i] = low * Math.exp(-t / rt) * Math.min(1, t / 0.012);
  }
  return out;
}

/** `input` through `response`, the result the same length as the input. */
export function convolve(input: Float32Array, response: Float32Array) {
  // Block by block, so a five-minute score doesn't need one enormous transform.
  const block = 1 << 18;
  let size = 1;
  while (size < block + response.length) size <<= 1;
  const hRe = new Float64Array(size), hIm = new Float64Array(size);
  hRe.set(response);
  fft(hRe, hIm, false);
  const out = new Float32Array(input.length);
  const re = new Float64Array(size), im = new Float64Array(size);
  for (let at = 0; at < input.length; at += block) {
    re.fill(0);
    im.fill(0);
    const end = Math.min(at + block, input.length);
    let silent = true;
    for (let i = at; i < end; i++) {
      re[i - at] = input[i];
      if (input[i] !== 0) silent = false;
    }
    if (silent) continue;
    fft(re, im, false);
    for (let i = 0; i < size; i++) {
      const r = re[i] * hRe[i] - im[i] * hIm[i];
      im[i] = re[i] * hIm[i] + im[i] * hRe[i];
      re[i] = r;
    }
    fft(re, im, true);
    for (let i = 0; i < size && at + i < out.length; i++) out[at + i] += re[i];
  }
  return out;
}
