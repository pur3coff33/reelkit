// Gunfire, by distance. Close up: a crack, a blast and a thump in the chest, all in the first few milliseconds, and the land
// answering in both ears. Further off the crack and chest go, and most of what's left is the land. Each take is its own, and
// each is full level: the mix decides how loud it is, not the sound. The mortars can also carry a real recording's tail.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { parseWav } from "../../src/kit/music/sampler";
import { SR, svf } from "../../src/kit/music/synth";

export type Stereo = [Float32Array, Float32Array];

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
const samples = (seconds: number) => Math.round(seconds * SR);

function normalize(pair: Stereo, level = 1): Stereo {
  let peak = 0;
  for (const c of pair) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
  const g = level / (peak || 1);
  return [pair[0].map((x) => x * g), pair[1].map((x) => x * g)];
}

/** The land answering: a dark copy of the shot off tree lines at different distances, and a wash that's different in each ear. */
function answer(source: Float32Array, seed: number, seconds: number, echoes: [number, number][], wash: number, cutoff: number): Stereo {
  const n = samples(seconds);
  const out: Stereo = [new Float32Array(n), new Float32Array(n)];
  const dark = svf(source, cutoff, 0.7, "low");
  const skew = noiseGen(seed + 9);
  for (const [i, c] of out.entries()) {
    for (const [d, g] of echoes) {
      const at = samples(d * (1 + skew() * 0.16)), gain = g * (i ? 1 + skew() * 0.5 : 1 - skew() * 0.5);
      for (let k = 0; k + at < n && k < dark.length; k++) c[k + at] += dark[k] * gain;
    }
    const rnd = noiseGen(seed * 3 + i * 101);
    const air = new Float32Array(n);
    for (let k = 0; k < n; k++) air[k] = rnd() * Math.exp((-k / SR) * (2.6 + i * 0.4)) * Math.min(1, (k / SR - 0.02) * 30 > 0 ? (k / SR - 0.02) * 30 : 0);
    const shaped = svf(air, cutoff * 0.7, 0.8, "low");
    for (let k = 0; k < n; k++) c[k] += shaped[k] * wash;
  }
  return out;
}

/** The first instant of one shot, heard from beside the rifle. `heavy` is the slower, deeper round. */
function report(seed: number, heavy: boolean) {
  const rnd = noiseGen(seed);
  const n = samples(0.5);
  const crack = new Float32Array(n), blast = new Float32Array(n), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = rnd();
    crack[i] = x * Math.exp(-t * 1400);
    blast[i] = x * Math.exp(-t * (heavy ? 80 : 115));
  }
  const hi = svf(crack, 2400, 0.8, "high"), mid = svf(blast, heavy ? 620 : 980, 0.9, "band");
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    p += (2 * Math.PI * ((heavy ? 52 : 66) + 130 * Math.exp(-t * 55))) / SR;
    out[i] = hi[i] * 2.4 + mid[i] * 3 + Math.sin(p) * Math.exp(-t * (heavy ? 26 : 34)) * (heavy ? 1.5 : 1.2);
  }
  // Pushed hard: real recordings of a shot are nearly square at the front, which is most of why they feel loud.
  return out.map((x) => Math.tanh(x * 2.6));
}

export function closeRifle(seed: number, heavy = false): Stereo {
  const dry = report(seed, heavy);
  const [l, r] = answer(dry, seed, 1.8, [[0.09, 0.24], [0.21, 0.17], [0.38, 0.12], [0.66, 0.07], [1.02, 0.04]], 0.08, 1500);
  for (let i = 0; i < dry.length; i++) {
    l[i] += dry[i];
    r[i] += dry[i];
  }
  // The last of the sound, so nothing ends in a click.
  return normalize([l.map((x, i) => x * Math.min(1, (l.length - i) / 3000)), r.map((x, i) => x * Math.min(1, (r.length - i) / 3000))]);
}

/** About a hundred metres: the crack gone, the chest gone, and the land as loud as the shot. */
export function midRifle(seed: number, heavy = false): Stereo {
  const dry = svf(svf(report(seed, heavy), 1500, 0.7, "low"), 130, 0.7, "high");
  const [l, r] = answer(dry, seed, 1.9, [[0.12, 0.34], [0.27, 0.25], [0.5, 0.17], [0.86, 0.1], [1.3, 0.05]], 0.1, 1100);
  for (let i = 0; i < dry.length; i++) {
    l[i] += dry[i];
    r[i] += dry[i];
  }
  return normalize([l.map((x, i) => x * Math.min(1, (l.length - i) / 3000)), r.map((x, i) => x * Math.min(1, (r.length - i) / 3000))]);
}

/** A long way off: a dull knock, then mostly the land. */
export function farRifle(seed: number, heavy = false): Stereo {
  const dry = svf(svf(report(seed, heavy), 620, 0.7, "low"), 110, 0.7, "high");
  const [l, r] = answer(dry, seed, 2.2, [[0.16, 0.7], [0.34, 0.6], [0.62, 0.42], [1.05, 0.26], [1.6, 0.14]], 0.34, 520);
  for (let i = 0; i < dry.length; i++) {
    l[i] += dry[i] * 0.6;
    r[i] += dry[i] * 0.6;
  }
  return normalize([l.map((x, i) => x * Math.min(1, (l.length - i) / 3000)), r.map((x, i) => x * Math.min(1, (r.length - i) / 3000))]);
}

/** A round passing close: a hard snap, and a thin tear of air behind it. */
export function incomingSnap(seed: number) {
  const rnd = noiseGen(seed);
  const n = samples(0.2);
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = rnd();
    a[i] = x * Math.exp(-t * 2400);
    b[i] = x * Math.exp(-t * 34) * 0.26;
  }
  const hi = svf(a, 3200, 0.8, "high"), tear = svf(b, (t) => 5400 - t * 15000, 2.2, "band");
  return hi.map((x, i) => Math.tanh((x * 2.4 + tear[i] * 1.5) * 1.8));
}

/** A mortar landing: the air's crack, a long drop in the chest, and soil coming back down around you. */
export function mortar(seed: number, tail?: Stereo): Stereo {
  const rnd = noiseGen(seed), pick = noiseGen(seed + 31);
  const n = samples(4.4);
  const body = new Float32Array(n), mono = new Float32Array(n);
  let low = 0, p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = rnd();
    body[i] = x * Math.exp(-t * 34);
    low += 0.016 * (x - low);
    p += (2 * Math.PI * (30 + 74 * Math.exp(-t * 9))) / SR;
    mono[i] = Math.sin(p) * Math.exp(-t * 2.3) * 1.5 + low * 11 * Math.exp(-t * 1.25);
  }
  const mid = svf(body, 900, 0.8, "band");
  for (let i = 0; i < n; i++) mono[i] += mid[i] * 3.4;
  for (let k = 0; k < 90; k++) {
    const r = (pick() + 1) / 2, at = samples(0.24 + r * r * 2.6), g = 0.03 + ((pick() + 1) / 2) * 0.06, len = samples(0.008 + ((pick() + 1) / 2) * 0.014);
    for (let i = 0; i < len && at + i < n; i++) mono[at + i] += rnd() * g * Math.exp((-i / len) * 3);
  }
  const shaped = mono.map((x) => Math.tanh(x * 1.5));
  const [l, r] = answer(shaped, seed, 4.4, [[0.14, 0.2], [0.34, 0.13], [0.7, 0.07]], 0.1, 700);
  for (let i = 0; i < n; i++) {
    l[i] += shaped[i];
    r[i] += shaped[i];
  }
  if (tail) {
    const at = samples(0.05);
    for (let i = 0; i + at < n && i < tail[0].length; i++) {
      l[i + at] += tail[0][i] * 0.7;
      r[i + at] += tail[1][i] * 0.7;
    }
  }
  return normalize([l.map((x, i) => x * Math.min(1, (n - i) / 9000)), r.map((x, i) => x * Math.min(1, (n - i) / 9000))]);
}

/** A round going into the water: a short bright smack and the drops falling back. */
export function waterStrike(seed: number) {
  const rnd = noiseGen(seed);
  const n = samples(0.42);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    raw[i] = rnd() * (Math.exp(-t * 46) + 0.16 * Math.exp(-((t - 0.16) ** 2) * 180));
  }
  return svf(svf(raw, 2200, 0.9, "band"), 500, 0.7, "high").map((x) => x * 1.6);
}

// ── The recording ─────────────────────────────────────────────────────────────────────────────────────

/** "War sounds" by Dragout, CC0, via Wikimedia Commons. Fetched once, into the same cache as the instrument samples. */
const SOURCE = "https://upload.wikimedia.org/wikipedia/commons/1/11/Dragout_-_War_sounds_%28cc0%29_%28freesound%29.ogg";
const OGG = resolve(".state/samples/guns/war-sounds.ogg"), WAV = resolve(".state/samples/guns/war-sounds-48k.wav");

export async function warRecording(): Promise<Stereo> {
  if (!existsSync(WAV)) {
    mkdirSync(dirname(WAV), { recursive: true });
    if (!existsSync(OGG)) {
      const res = await fetch(SOURCE, { headers: { "User-Agent": "reelkit-sound-check/1.0" } });
      if (!res.ok) throw new Error(`could not fetch the recording: ${res.status}`);
      writeFileSync(OGG, Buffer.from(await res.arrayBuffer()));
    }
    execFileSync(ffmpegPath as unknown as string, ["-y", "-v", "error", "-i", OGG, "-ar", String(SR), "-ac", "2", "-c:a", "pcm_s16le", WAV]);
  }
  const wav = parseWav(readFileSync(WAV));
  return [wav.channels[0], wav.channels[1] ?? wav.channels[0]];
}

/** A stretch of a recording, faded at both ends. */
export function slice(rec: Stereo, from: number, to: number, fade = 0.02): Stereo {
  const a = samples(from), b = samples(to), f = samples(fade);
  const cut = (c: Float32Array) => c.slice(a, b).map((x, i, all) => x * Math.min(1, i / f, (all.length - i) / f));
  return [cut(rec[0]), cut(rec[1])];
}
