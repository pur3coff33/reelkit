// The santelmo's sound: a night in the province (crickets, frogs, wind, water), a fiesta heard from far off, drones
// that thicken as she follows the light, a heartbeat, stingers under the hit lines, the fire's crackle (louder as it
// nears the camera), her footsteps (hollow on the bamboo bridge), and silence: the ambience drops out in steps, and
// everything stops just before the flare. Every sound is synthesized here; the clock is timeline.ts.
import { Mix, SR, bass, chord, hat, hz, impact, kick, pluck, svf } from "../../src/kit/music/synth";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appDir, outDir } from "../../src/kit/paths";
import { footsteps, lightDistance } from "./sim";
import { CUES, LINES, SCENES, SECONDS } from "./timeline";

const N = Math.round(SECONDS * SR);
const sm = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
/** 1 inside [a, b), with `fade` s ramps at each end. */
const window_ = (t: number, a: number, b: number, fade = 0.4) => sm(a - fade, a, t) * (1 - sm(b, b + fade, t));

function noiseGen(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2147483648 - 1);
}

/** Multiplies a stem by a gain curve over time (evaluated every millisecond). */
function shape(buf: Float32Array, gain: (t: number) => number, at = 0) {
  const step = 48;
  let g0 = gain(at), g1 = g0;
  for (let i = 0; i < buf.length; i++) {
    if (i % step === 0) {
      g0 = g1;
      g1 = gain(at + (i + step) / SR);
    }
    buf[i] *= g0 + (g1 - g0) * ((i % step) / step);
  }
  return buf;
}

// ── The night ────────────────────────────────────────────────────────────────────────────────────────

/** A cricket: bursts of three or four pulses on a high carrier, repeating with a little jitter. */
function cricket(seed: number, freq: number, every: number) {
  const out = new Float32Array(N);
  const r = noiseGen(seed);
  for (let t = (r() + 1) * every; t < SECONDS; t += every * (0.85 + 0.3 * (r() + 1) / 2)) {
    const pulses = 3 + (r() > 0.3 ? 1 : 0);
    for (let p = 0; p < pulses; p++) {
      const s0 = Math.round((t + p * 0.042) * SR), len = Math.round(0.026 * SR);
      for (let i = 0; i < len && s0 + i < N; i++) {
        const e = Math.sin((Math.PI * i) / len);
        out[s0 + i] += Math.sin((2 * Math.PI * freq * (s0 + i)) / SR) * e * e;
      }
    }
  }
  return out;
}

/** Frogs: "kokak", two throaty croaks, irregular. */
function frog(seed: number, pitch: number) {
  const out = new Float32Array(N);
  const r = noiseGen(seed);
  for (let t = (r() + 1) * 1.2; t < SECONDS; t += 0.7 + ((r() + 1) / 2) * 1.8) {
    for (const [dt, len, k] of [[0, 0.09, 1], [0.13, 0.12, 0.85]] as const) {
      const s0 = Math.round((t + dt) * SR), n = Math.round(len * SR);
      const buf = new Float32Array(n);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const f = pitch * k * (1.1 - 0.25 * (i / n));
        ph = (ph + f / SR) % 1;
        // A narrow pulse train: buzzy, like a throat.
        buf[i] = (ph < 0.12 ? 1 : 0) - 0.12;
      }
      const band = svf(buf, pitch * 7, 3, "band");
      for (let i = 0; i < n && s0 + i < N; i++) out[s0 + i] += band[i] * Math.sin((Math.PI * i) / n) * 2.5;
    }
  }
  return out;
}

function wind(seed: number) {
  const r = noiseGen(seed);
  const raw = new Float32Array(N);
  for (let i = 0; i < N; i++) raw[i] = r();
  const lp = svf(raw, (t) => 400 + 180 * Math.sin(t * 0.23) + 100 * Math.sin(t * 0.61 + 1), 0.9, "low");
  return shape(lp, (t) => 0.6 + 0.4 * Math.sin(t * 0.17 + seed) * Math.sin(t * 0.41));
}

/** Water lapping at a bank: low noise in slow swells. */
function lapping(seed: number) {
  const r = noiseGen(seed);
  const raw = new Float32Array(N);
  for (let i = 0; i < N; i++) raw[i] = r();
  const lp = svf(raw, 520, 1.6, "band");
  return shape(lp, (t) => Math.max(0, Math.sin(t * 2.1 + Math.sin(t * 0.7) * 2)) ** 2 * 1.4 + 0.15);
}

// ── The fiesta ───────────────────────────────────────────────────────────────────────────────────────

/**
 * "Bahay Kubo" (traditional, first published 1924): the tune in 3/4, as [midi note, start beat, length in beats].
 * The first beat is the pickup.
 */
const BAHAY_KUBO: [number, number, number][] = [
  [67, 2, 1], [72, 3, 2], [74, 5, 1], [71, 6, 2], [67, 8, 1], [69, 9, 2], [72, 11, 1], [67, 12, 2], [64, 14, 0.5], [65, 14.5, 0.5],
  [67, 15, 1], [69, 16, 1], [67, 17, 1], [65, 18, 2], [71, 20, 0.5], [72, 20.5, 0.5], [74, 21, 1], [76, 22, 1], [74, 23, 1], [72, 24, 2],
  [67, 26, 0.5], [67, 26.5, 0.5], [72, 27, 2], [74, 29, 0.5], [72, 29.5, 0.5], [71, 30, 2], [74, 32, 0.5], [72, 32.5, 0.5], [69, 33, 0.5],
  [69, 33.5, 0.5], [71, 34, 1], [69, 35, 1], [67, 36, 2], [67, 38, 1], [69, 39, 2], [69, 41, 1], [71, 42, 1.5], [69, 43.5, 0.5],
  [67, 44, 1], [72, 45, 5], [67, 50, 1], [72, 51, 1.5], [74, 52.5, 0.5], [72, 53, 1], [71, 54, 2], [67, 56, 1], [69, 57, 1],
  [69, 58, 0.5], [71, 58.5, 0.5], [69, 59, 1], [67, 60, 2], [64, 62, 0.5], [65, 62.5, 0.5], [67, 63, 1], [69, 64, 1], [67, 65, 1],
  [65, 66, 2], [71, 68, 0.5], [72, 68.5, 0.5], [74, 69, 1], [76, 70, 1], [74, 71, 1], [72, 72, 1.5], [67, 73.5, 0.5], [67, 74, 1],
  [72, 75, 1.5], [74, 76.5, 0.5], [72, 77, 1], [71, 78, 2], [71, 80, 1], [69, 81, 1], [69, 82, 1], [71, 83, 1], [67, 84, 2],
  [67, 86, 0.5], [67, 86.5, 0.5], [69, 87, 1], [69, 88, 1], [69, 89, 1], [71, 90, 1], [71, 91, 1], [71, 92, 1], [71, 93, 0.5],
  [71, 93.5, 0.5], [69, 94, 1], [71, 95, 1], [72, 96, 5],
];
const TUNE_BEATS = 101;
const mhz = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** The chord under each bar (3 beats from beat 0): whichever of C, F, G, Am holds most of that bar's tune. */
function barChord(bar: number): number[] {
  const chords: [number, number[]][] = [[48, [0, 4, 7]], [53, [5, 9, 0]], [55, [7, 11, 2]], [57, [9, 0, 4]]];
  let best = chords[0], score = -1;
  for (const c of chords) {
    let sc = 0;
    for (const [n, b, l] of BAHAY_KUBO) {
      const o = Math.min(b + l, bar * 3 + 3) - Math.max(b, bar * 3);
      if (o > 0 && c[1].includes(n % 12)) sc += o;
    }
    if (sc > score) [best, score] = [c, sc];
  }
  return best[1].map((pc) => best[0] + ((pc - (best[0] % 12) + 12) % 12));
}

/** The fiesta: Bahay Kubo as a waltz from a far-off sound system (oom-pah-pah under a plucked tune), muffled. */
function fiesta(from: number, to: number) {
  const m = new Mix(SECONDS);
  const B = 60 / 132;
  for (let rep = 0; from + rep * TUNE_BEATS * B < to; rep++) {
    const t0 = from + rep * TUNE_BEATS * B - 2 * B;
    for (const [n, b, l] of BAHAY_KUBO) {
      const t = t0 + b * B;
      if (t >= from && t < to) {
        m.add(pluck(mhz(n), l * B + 0.25), t, 0.42);
        m.add(pluck(mhz(n + 12), l * B * 0.6), t, 0.12);
      }
    }
    for (let bar = 0; bar * 3 < TUNE_BEATS; bar++) {
      const t = t0 + bar * 3 * B;
      if (t < from || t >= to) continue;
      const ch = barChord(bar);
      m.add(kick(0.8), t, 0.55);
      m.add(bass(mhz(ch[0] - 12), B * 0.8), t, 0.55);
      for (const k of [1, 2]) m.add(chord(ch.map((x) => mhz(x + 12)), B * 0.4, { attack: 0.005, bright: 2200 }), t + k * B, 0.22);
      m.add(hat(), t + B, 0.08);
      m.add(hat(), t + 2 * B, 0.08);
    }
  }
  const mono = new Float32Array(N);
  for (let i = 0; i < N; i++) mono[i] = (m.L[i] + m.R[i]) * 0.5;
  // Distance: the highs go first.
  return svf(svf(mono, 560, 0.8, "low"), 60, 0.7, "high");
}

/** A music-box tine: a bright sine with a little inharmonic ring, wobbling flat as the box winds down. */
function tine(freq: number, len: number, wow: (t: number) => number) {
  const n = Math.round(len * SR);
  const b = new Float32Array(n);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = freq * wow(t);
    p1 += (2 * Math.PI * f) / SR;
    p2 += (2 * Math.PI * f * 4.07) / SR;
    b[i] = (Math.sin(p1) * Math.exp(-t / 0.9) + 0.35 * Math.sin(p2) * Math.exp(-t / 0.12)) * Math.min(1, i / 60);
  }
  return b;
}

/** Bahay Kubo again, lost: a music box, slowing, sliding flat, wavering, in a big room. */
function musicBox(from: number, to: number) {
  const m = new Mix(SECONDS);
  let t = from, prevB = 2;
  for (const [n, b, l] of BAHAY_KUBO) {
    // Each beat a little longer than the last: the spring running down.
    const k = (t - from) / (to - from);
    t += (b - prevB) * (0.62 + 0.38 * k);
    prevB = b;
    if (t >= to) break;
    const flat = 2 ** (-(0.9 * k) / 12);
    const wow = (u: number) => flat * (1 + 0.012 * Math.sin(2 * Math.PI * 0.8 * (t + u)) + 0.006 * Math.sin(2 * Math.PI * 5.5 * (t + u)));
    m.add(tine(mhz(n + 12), Math.max(0.8, l * 0.8), wow), t, 0.5, Math.sin(t * 0.7) * 0.4, 0.8);
  }
  return [m.L, m.R] as [Float32Array, Float32Array];
}

// ── Dread ────────────────────────────────────────────────────────────────────────────────────────────

/** Detuned saws, low-passed: a drone that beats against itself. */
function drone(freqs: number[], cutoff: number, seed: number) {
  const out = new Float32Array(N);
  const ph = freqs.flatMap(() => [0, 0.3]);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let s = 0;
    freqs.forEach((f, k) => {
      const wob = 1 + 0.003 * Math.sin(t * (0.13 + k * 0.07) + seed);
      ph[k * 2] = (ph[k * 2] + (f * 0.996 * wob) / SR) % 1;
      ph[k * 2 + 1] = (ph[k * 2 + 1] + (f * 1.004) / SR) % 1;
      s += ph[k * 2] + ph[k * 2 + 1] - 1;
    });
    out[i] = s / freqs.length;
  }
  return svf(out, (t) => cutoff * (0.8 + 0.2 * Math.sin(t * 0.21 + seed)), 1.1, "low");
}

function thump(freq: number, len: number) {
  const n = Math.round(len * SR);
  const b = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    p += (2 * Math.PI * freq * (1 + 0.6 * Math.exp(-t * 40))) / SR;
    b[i] = Math.sin(p) * Math.exp(-t / (len * 0.3));
  }
  return b;
}

/** A dissonant stab, a boom and a screech falling away. */
function stinger(size: number): [Float32Array, Float32Array] {
  const [L, R] = chord([hz("C3"), hz("C#3"), hz("F#3"), hz("G4"), hz("C#5")], 2.6, { attack: 0.004, bright: 3200 });
  const boom = impact();
  const r = noiseGen(9);
  const n = L.length;
  const scr = new Float32Array(n);
  for (let i = 0; i < n; i++) scr[i] = r() * Math.exp(-(i / SR) / 0.5);
  const sweep = svf(scr, (t) => 3400 * Math.exp(-t * 1.4) + 500, 5, "band");
  for (let i = 0; i < n; i++) {
    const extra = (i < boom.length ? boom[i] * 1.1 : 0) + sweep[i] * 0.5 * size;
    L[i] = L[i] * 0.8 + extra;
    R[i] = R[i] * 0.8 + extra;
  }
  return [L, R];
}

/** The flare: a roar of noise sweeping down from bright to dark. */
function roar() {
  const r = noiseGen(31);
  const n = Math.round(2.2 * SR);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = r() * Math.min(1, i / (0.02 * SR)) * Math.exp(-(i / SR) / 0.7);
  return svf(raw, (t) => 5000 * Math.exp(-t * 2.2) + 200, 0.9, "low");
}

/** The ring in the ears after the flare. */
function ring(len: number) {
  const n = Math.round(len * SR);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    b[i] = Math.sin(2 * Math.PI * 3150 * t) * Math.exp(-t / (len * 0.45)) * Math.min(1, t / 0.05);
  }
  return b;
}

/** The fire's voice: crackle and a breathy hum, following how near the light is. */
function crackle() {
  const r = noiseGen(17);
  const clicks = new Float32Array(N), breath = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (r() > 0.9965) clicks[i] = r() * 1.5;
    breath[i] = r();
  }
  const c = svf(clicks, 2600, 1.4, "band");
  const b = svf(breath, (t) => 380 + 120 * Math.sin(t * 7.3), 2.2, "band");
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = c[i] * 1.2 + b[i] * (0.8 + 0.4 * Math.sin((i / SR) * 11.7));
  const gainAt = (t: number) => {
    const { dist, strength } = lightDistance(t);
    return Number.isFinite(dist) ? Math.min(1, strength) * Math.min(1, 2.2 / Math.max(0.5, dist)) : 0;
  };
  // lightDistance is costly: sample it at 20 Hz and interpolate.
  const pts = Array.from({ length: Math.ceil(SECONDS * 20) + 2 }, (_, k) => gainAt(k / 20));
  return shape(out, (t) => {
    const k = t * 20, i = Math.floor(k);
    return (pts[i] ?? 0) + ((pts[i + 1] ?? 0) - (pts[i] ?? 0)) * (k - i);
  });
}

function step(bamboo: boolean, seed: number) {
  const r = noiseGen(seed);
  const n = Math.round(0.16 * SR);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = r() * Math.exp(-(i / SR) / 0.025);
  const out = svf(b, bamboo ? 900 : 420, 1, "low");
  if (bamboo) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = out[i] * 0.5 + (Math.sin(2 * Math.PI * 310 * t) * 0.8 + Math.sin(2 * Math.PI * 742 * t) * 0.4) * Math.exp(-t / 0.05);
    }
  }
  return out;
}

/** A rooster far off: four rising and falling cries through a band-pass. */
function rooster() {
  const segs: [number, number, number][] = [[520, 620, 0.16], [600, 600, 0.13], [700, 920, 0.26], [860, 480, 0.65]];
  const total = segs.reduce((s, x) => s + x[2] + 0.04, 0);
  const n = Math.round(total * SR);
  const b = new Float32Array(n);
  let i0 = 0, ph = 0;
  for (const [f0, f1, len] of segs) {
    const m = Math.round(len * SR);
    for (let i = 0; i < m; i++) {
      const k = i / m, t = i / SR;
      const f = (f0 + (f1 - f0) * k) * (1 + 0.02 * Math.sin(t * 38));
      ph = (ph + f / SR) % 1;
      b[i0 + i] = (2 * ph - 1) * Math.sin(Math.PI * k) ** 0.6;
    }
    i0 += m + Math.round(0.04 * SR);
  }
  return svf(svf(b, 1300, 2, "band"), 2600, 0.8, "low");
}

// ── The theme ────────────────────────────────────────────────────────────────────────────────────────

/** Bahay Kubo turned to C minor: E, A and B fall a semitone. */
const MINOR: [number, number, number][] = BAHAY_KUBO.map(([n, b, l]) => [[4, 9, 11].includes(n % 12) ? n - 1 : n, b, l]);

/** A piano a little out of tune: two strings per note beating against each other, a soft hammer, a long decay. */
function piano(freq: number, len: number, seed: number) {
  const n = Math.round(len * SR);
  const b = new Float32Array(n);
  const r = noiseGen(seed);
  const detune = [0.9955, 1.0035];
  const parts = [1, 2, 3, 4, 5];
  const ph = new Float64Array(parts.length * 2);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (let k = 0; k < parts.length; k++) {
      const h = parts[k] * (1 + 0.0004 * parts[k] * parts[k]);
      const amp = Math.exp(-t * (0.9 + parts[k] * 0.7)) / parts[k] ** 1.3;
      for (let d = 0; d < 2; d++) {
        ph[k * 2 + d] += (2 * Math.PI * freq * h * detune[d]) / SR;
        s += Math.sin(ph[k * 2 + d]) * amp;
      }
    }
    const hammer = t < 0.012 ? r() * (1 - t / 0.012) * 0.3 : 0;
    b[i] = (s * 0.5 + hammer) * Math.min(1, i / 40) * Math.min(1, (n - i) / 2400);
  }
  return b;
}

/**
 * The theme: the minor tune at a slow 3/4, from `fromBeat` of the tune, laid at `at` seconds until `to`. `doubled`
 * adds the octave below; a low root sounds on each bar.
 */
function theme(m: Mix, at: number, to: number, bpm: number, fromBeat: number, gain: number, doubled = false) {
  const B = 60 / bpm;
  const t0 = at - fromBeat * B;
  for (const [n, b, l] of MINOR) {
    const t = t0 + b * B;
    if (t < at || t >= to) continue;
    const len = Math.min(l * B * 1.6 + 1.2, 5);
    m.add(piano(mhz(n - 12), len, b * 7 + 1), t, gain, -0.15, 0.6);
    if (doubled) m.add(piano(mhz(n - 24), len, b * 7 + 2), t, gain * 0.55, 0.15, 0.6);
  }
  for (let bar = Math.ceil(fromBeat / 3); ; bar++) {
    const t = t0 + bar * 3 * B;
    if (t >= to) break;
    if (t < at) continue;
    const root = barChord(bar)[0];
    // The bar's root, in minor: E and A and B flattened like the tune.
    const r = [4, 9, 11].includes(root % 12) ? root - 1 : root;
    m.add(piano(mhz(r - 12), 3 * B + 1.5, bar * 13 + 5), t, gain * 0.5, 0, 0.7);
  }
}

// ── The narration ────────────────────────────────────────────────────────────────────────────────────

/** A 16-bit PCM WAV's first channel as floats (the voice files are 48 kHz mono). */
function readWav(file: string): Float32Array {
  const b = readFileSync(file);
  let p = 12;
  let ch = 1, bits = 16, data = 0, size = 0;
  while (p < b.length - 8) {
    const id = b.toString("ascii", p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === "fmt ") {
      ch = b.readUInt16LE(p + 10);
      bits = b.readUInt16LE(p + 22);
    }
    if (id === "data") {
      data = p + 8;
      size = len;
      break;
    }
    p += 8 + len + (len % 2);
  }
  if (bits !== 16 || !data) throw new Error(`${file}: expected 16-bit PCM`);
  const n = Math.floor(size / (2 * ch));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(data + i * 2 * ch) / 32768;
  return out;
}

/** Her lines, each placed at its caption's start. Empty if the voice step hasn't run. */
function narration(): { at: number; buf: Float32Array }[] {
  const index = outDir("santelmo", "voice.json");
  if (!existsSync(index)) return [];
  const takes = JSON.parse(readFileSync(index, "utf8")) as { i: number; file: string }[];
  return takes.map((t) => ({ at: LINES[t.i].at, buf: readWav(join(appDir("santelmo"), t.file)) }));
}

/** Pulls everything already in the mix down while she speaks: fast in, slow out. */
function duckUnder(m: Mix, lines: { at: number; buf: Float32Array }[], depth: number) {
  const n = m.L.length;
  const env = new Float32Array(n);
  for (const { at, buf } of lines) {
    const s0 = Math.round(at * SR);
    for (let i = 0; i < buf.length && s0 + i < n; i++) env[s0 + i] = Math.max(env[s0 + i], Math.abs(buf[i]));
  }
  let e = 0;
  const att = 1 - Math.exp(-1 / (0.02 * SR)), rel = 1 - Math.exp(-1 / (0.45 * SR));
  for (let i = 0; i < n; i++) {
    const x = Math.min(1, env[i] * 8);
    e += (x > e ? att : rel) * (x - e);
    const g = 1 - depth * e;
    m.L[i] *= g;
    m.R[i] *= g;
    m.wetL[i] *= g;
    m.wetR[i] *= g;
  }
}

// ── The mix ──────────────────────────────────────────────────────────────────────────────────────────

const S = SCENES;
/** Everything stops: the silence before the flare, the black after it, and the cut from the river. */
const hush = (t: number) => (t >= CUES.silence.from && t < CUES.silence.to + 0.05 ? 0 : 1) * (1 - window_(t, CUES.flare + 0.05, S.fire.to, 0.05));
const night = (t: number) => hush(t) * (1 - window_(t, CUES.step + 0.75, S.river.to, 0.1));

export function writeMusic(file: string) {
  const m = new Mix(SECONDS);

  // Crickets: through the night until line 18, back thin at dawn.
  const cricketGain = (t: number) => night(t) * ((1 - sm(CUES.cricketsStop, CUES.cricketsStop + 0.8, t)) * (t < S.reveal.from ? 1 : 0) + 0.45 * window_(t, S.dawn.from, S.dawn.to, 0.2));
  [[1, 4300, 0.62, -0.6], [2, 4650, 0.55, 0.5], [3, 3950, 0.8, -0.15], [4, 4900, 0.47, 0.8], [5, 4150, 0.7, 0.25]].forEach(([seed, f, every, pan], k) => {
    m.add(shape(cricket(seed, f, every), (t) => cricketGain(t) * (k > 2 ? 1 - sm(CUES.cricketsStop - 3, CUES.cricketsStop, t) : 1)), 0, 0.045, pan, 0.15);
  });

  // Frogs: until line 17.
  const frogGain = (t: number) => night(t) * (1 - sm(CUES.frogsStop, CUES.frogsStop + 0.6, t));
  [[11, 95, -0.7], [12, 120, 0.6], [13, 82, 0.1]].forEach(([seed, p, pan]) => m.add(shape(frog(seed, p), frogGain), 0, 0.13, pan, 0.3));

  // Wind, more of it by the river.
  m.add(shape(wind(21), (t) => night(t) * (0.5 + 0.5 * window_(t, S.river.from, S.dawn.to, 1))), 0, 0.22, -0.2);
  m.add(shape(wind(22), (t) => night(t) * (0.5 + 0.5 * window_(t, S.river.from, S.dawn.to, 1))), 0, 0.22, 0.2);

  // Water at the river: the hook, then the river, the reveal and the dawn.
  const waterGain = (t: number) => night(t) * (window_(t, 0, S.title.to, 0.5) * 0.7 + window_(t, S.river.from, S.dawn.to, 0.3));
  m.add(shape(lapping(41), waterGain), 0, 0.3, -0.3, 0.2);
  m.add(shape(lapping(42), waterGain), 0, 0.3, 0.35, 0.2);

  // The fiesta, fading behind her.
  m.add(shape(fiesta(S.fiesta.from, S.walk.from), (t) => window_(t, S.fiesta.from, 36, 0.15) * (0.55 - 0.42 * sm(S.fiesta.from, S.light.from, t) - 0.13 * sm(S.light.from, 36, t))), 0, 0.5, 0, 0.35);

  // The same tune comes back when she's lost, as a music box: from the panakot until the silence.
  const box = musicBox(CUES.musicBox.from, CUES.musicBox.to);
  const boxGain = (t: number) => hush(t) * sm(CUES.musicBox.from, CUES.musicBox.from + 1.5, t);
  m.add([shape(box[0], boxGain), shape(box[1], boxGain)], 0, 0.55, 0, 0.5);

  // The theme on the out-of-tune piano: as the fiesta fades and the light leads her on, thicker through the loop
  // (until the music box takes over), and once more from dawn to the end.
  const th = new Mix(SECONDS);
  theme(th, 36, S.walk.to, 58, 2, 0.5);
  theme(th, S.loop.from, CUES.musicBox.from, 52, 26, 0.55, true);
  theme(th, S.dawn.from, CUES.lastRush, 50, 2, 0.5);
  const themeGain = night;
  m.add([shape(th.L, themeGain), shape(th.R, themeGain)], 0, 0.7, 0, 0.3);

  // Drones: a low bed the whole way, a second, sourer one from the loop into the fire.
  const bed = (t: number) =>
    hush(t) *
    (t < S.title.to ? 0.35 + 0.2 * sm(6, 9.5, t)
      : t < S.light.from ? 0.15
      : t < S.loop.from ? 0.25 + 0.15 * sm(S.light.from, S.loop.from, t)
      : t < S.fire.to ? 0.45 + 0.5 * sm(S.loop.from, CUES.silence.from, t)
      : t < S.dawn.from ? 0.5
      : t < S.outro.from ? 0.12
      : 0.4);
  m.add(shape(drone([hz("A1"), hz("E2"), hz("A2")], 260, 1), bed), 0, 0.42, 0, 0.4);
  m.add(shape(drone([hz("A#2"), hz("D#3"), hz("A3")], 620, 2), (t) => hush(t) * sm(72, CUES.silence.from, t) * (t < S.fire.to ? 1 : 0)), 0, 0.28, 0.1, 0.5);

  // The fire's crackle and hum.
  m.add(shape(crackle(), hush), 0, 0.5, 0.05, 0.25);

  // Heartbeat, quickening.
  for (let t = CUES.heartbeat.from; t < CUES.silence.from; ) {
    const k = sm(CUES.heartbeat.from, CUES.silence.from, t);
    m.add(thump(52, 0.22), t, 0.55 + 0.35 * k);
    m.add(thump(48, 0.2), t + 0.17, 0.4 + 0.25 * k);
    t += 60 / (62 + 48 * k);
  }

  // Footsteps.
  footsteps().forEach((s, i) => {
    if (hush(s.t) < 1) return;
    m.add(step(s.bamboo, i + 1), s.t, (s.bamboo ? 0.5 : 0.22) * s.gain, ((i % 2) - 0.5) * 0.2, 0.15);
  });
  m.add(step(false, 99), CUES.step + 0.35, 0.15, 0, 0.6);

  // Hits under the hit lines; "KUYA!" goes out and only its echo comes back.
  for (const h of CUES.hits) m.add(stinger(h.size), h.at, 0.75 * h.size, 0, 0.55);
  for (let k = 1; k <= 3; k++) {
    const e = stinger(0.4).map((b) => svf(b, 1200 / k, 0.8, "low")) as [Float32Array, Float32Array];
    m.add(e, CUES.kuya + k * 0.42, 0.32 / k, k % 2 ? 0.5 : -0.5, 0.9);
  }
  m.add(roar(), CUES.flare, 0.9, 0, 0.5);
  m.add(kick(1.6), CUES.flare, 1);
  m.add(ring(S.fire.to - CUES.flare - 0.1), CUES.flare + 0.1, 0.05, 0, 0);

  // The step into the river: a low swallow of water.
  m.add(thump(40, 0.9), CUES.step + 0.3, 0.35, 0, 0.6);

  // Dawn, and a rooster far off.
  m.add(rooster(), CUES.rooster, 0.12, 0.6, 0.85);

  // The last rush at the viewer, then one soft, low hit under the title.
  m.add(stinger(1), CUES.lastRush + 0.35, 0.8, 0, 0.5);
  m.add(roar(), CUES.lastRush + 0.3, 0.6, 0, 0.4);
  m.add(impact(), 122.1, 0.4, 0, 0.7);

  // Her voice, over everything, with the rest dipped under it and a little of the night's reverb on her.
  const voice = narration();
  duckUnder(m, voice, 0.6);
  for (const { at, buf } of voice) m.add(buf, at, 0.95, 0, 0.12);

  m.finish(1.6);
  // True silence, reverb tails and all: just before the flare, and on the cut to black after the river.
  const gate = (t: number) => (1 - window_(t, CUES.silence.from + 0.06, CUES.silence.to - 0.01, 0.06)) * (1 - window_(t, CUES.step + 0.83, S.river.to - 0.04, 0.08));
  shape(m.L, gate);
  shape(m.R, gate);
  m.write(file);
}
