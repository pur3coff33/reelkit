// Sound shared by every part: the narration's processing, the club's own track (written here, original), the power-down,
// street ambience, and the instruments (VSCO 2 CE, CC0). Each part's music.ts builds its session from these.
import { readVoice } from "../../src/kit/music/narration";
import { instrument } from "../../src/kit/music/sampler";
import { whoosh } from "../../src/kit/music/sfx";
import { type Session, limit, seeded } from "../../src/kit/music/studio";
import { SR, bass, chord, clap, hat, hz, kick, svf } from "../../src/kit/music/synth";
import type { Layout, PartScript } from "./parts";

/** The part's narration as one stem: compressed (−27 dBFS, 3.5:1), each line's consonant spikes taken down 5 dB, so the
 *  master limiter isn't left to flatten the voice. Returns the lines (for the music to lean back under). */
export function narrate(s: Session, script: PartScript, layout: Layout) {
  const lines = readVoice("ozone", script.lines.map(({ hold: _h, sources: _s, ...l }) => ({ ...l, beat: layout.lines[l.id] })), `parts/${script.id}/voice.json`);
  if (process.env.OZONE_SCORE_ONLY) return lines;
  const voice = s.stem("voice", { lufs: -16.5, low: 70, high: 11000, hall: { seconds: 1.8, mix: 0.08, gap: 0.03 } });
  for (const l of lines) {
    const x = compress(l.sound, -27, 3.5), peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9);
    limit(x, Float32Array.from(x), peak * 10 ** (-5 / 20));
    voice.add(x, l.at);
  }
  return lines;
}

/** Fails if the voice was re-recorded since layout.gen.ts was written. */
export function checkFresh(script: PartScript, layout: Layout, recorded: { id: string; seconds: number }[]) {
  const stale = recorded.filter((l) => Math.abs((layout.spoken[l.id] ?? -1) - l.seconds) > 0.02).map((l) => l.id);
  if (stale.length) throw new Error(`${script.id}: the voice changed since the layout (${stale.join(", ")}): run part.ts ${script.id} layout`);
}

export function compress(x: Float32Array, thresholdDb = -22, ratio = 3) {
  const out = new Float32Array(x.length), th = 10 ** (thresholdDb / 20);
  const att = Math.exp(-1 / (0.005 * SR)), rel = Math.exp(-1 / (0.12 * SR));
  let env = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
    out[i] = x[i] * (env > th ? (th * (env / th) ** (1 / ratio)) / env : 1);
  }
  return out;
}

export const loadInstruments = () =>
  Promise.all([instrument("Keys/Upright Nr1", /_(pp|mf)_/), instrument("Strings/Cello Section/susvib"), instrument("Strings/Solo Contrabass/SusNV")]).then(([upright, cellos, contra]) => ({ upright, cellos, contra }));

const BPM = 122, BEAT = 60 / BPM, BAR = 4 * BEAT;
/** Am7 – Fmaj7 – G6 – Em7, a bar each. */
const PROG: [string, string[]][] = [["A1", ["A3", "C4", "E4", "G4"]], ["F1", ["F3", "A3", "C4", "E4"]], ["G1", ["G3", "B3", "D4", "E4"]], ["E1", ["G3", "B3", "D4", "E4"]]];

/** The club's track (122 BPM, A minor, original): four on the floor, offbeat open hats, claps on 2 and 4, an octave bass on
 *  the offbeats and organ stabs on the "and" of 2 and 4. */
export function clubTrack(seconds: number, seed: number): [Float32Array, Float32Array] {
  const n = Math.round(seconds * SR), L = new Float32Array(n), R = new Float32Array(n);
  const rnd = seeded(seed);
  const put = (s: Float32Array | [Float32Array, Float32Array], at: number, g: number, pan = 0) => {
    const [l, r] = s instanceof Float32Array ? [s, s] : s;
    const gl = g * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2, gr = g * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    const a = Math.round(at * SR);
    for (let i = 0; i < l.length && a + i < n; i++) {
      if (a + i < 0) continue;
      L[a + i] += l[i] * gl;
      R[a + i] += r[i] * gr;
    }
  };
  const K = kick(1), Hc = hat(false), Ho = hat(true), C = clap();
  for (let bar = 0; bar * BAR < seconds; bar++) {
    const [root, notes] = PROG[bar % 4], t0 = bar * BAR;
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * BEAT;
      put(K, t, 0.9);
      put(Ho, t + BEAT / 2, 0.22 + rnd() * 0.04, 0.25);
      for (const s of [0.25, 0.75]) put(Hc, t + s * BEAT, 0.09 + rnd() * 0.03, -0.2);
      if (b % 2) put(C, t, 0.4, 0.05);
      put(bass(hz(root) * (b % 2 ? 2 : 1), BEAT * 0.42), t + BEAT / 2, 0.55);
    }
    for (const b of [1.5, 3.5]) put(chord(notes.map(hz), BEAT * 0.55, { bright: 2600, attack: 0.004 }), t0 + b * BEAT, 0.34, 0);
  }
  return [L, R];
}

/** As heard through the club's walls from the street. */
export const throughWalls = (x: Float32Array) => svf(svf(x, 300, 0.8, "low"), 300, 0.7, "low");

/** The power failing: the last `seconds` before `at` slow to a stop, as a turntable does when its motor dies. */
export function powerDown(x: Float32Array, at: number, seconds: number) {
  const a = Math.round((at - seconds) * SR), n = Math.round(seconds * SR), src = x.slice(a, a + n);
  let pos = 0;
  for (let i = 0; i < n; i++) {
    const k = i / n, rate = (1 - k) ** 1.6;
    const j = Math.floor(pos), f = pos - j;
    x[a + i] = ((src[j] ?? 0) * (1 - f) + (src[j + 1] ?? 0) * f) * (1 - k * 0.3);
    pos += rate;
  }
  x.fill(0, a + n);
}

/** Fades in place: `rise` seconds in at the start, `fall` seconds out at the end. */
export function fades(x: Float32Array, rise: number, fall: number) {
  const a = Math.round(rise * SR), b = Math.round(fall * SR);
  for (let i = 0; i < x.length; i++) x[i] *= Math.min(1, a ? i / a : 1, b ? (x.length - i) / b : 1);
}

/** Traffic on Timog at midnight: a low wash with a car going by now and then. */
export function street(seconds: number, seed: number): [Float32Array, Float32Array] {
  const r = seeded(seed), n = Math.round(seconds * SR);
  const wash = svf(Float32Array.from({ length: n }, () => r() * 2 - 1), 380, 0.6, "low");
  const L = Float32Array.from(wash), R = Float32Array.from(wash);
  for (const [at, len, from, to] of [[0.6, 3.2, -0.9, 0.7], [5.5, 2.6, 0.8, -0.6], [11.5, 3.6, -0.7, 0.8], [17.8, 2.8, 0.6, -0.8]] as const) {
    if (at + len > seconds) continue;
    const [l, rr] = whoosh(len, Math.round(at * 10), from, to), a = Math.round(at * SR);
    const ll = svf(l, 900, 0.7, "low"), rl = svf(rr, 900, 0.7, "low");
    for (let i = 0; i < ll.length && a + i < n; i++) {
      L[a + i] += ll[i] * 0.5;
      R[a + i] += rl[i] * 0.5;
    }
  }
  return [L, R];
}
