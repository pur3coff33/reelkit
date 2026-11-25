// The sound, all made here: an original score in D minor at 60 BPM, so one beat is one second and the clock's tick is the
// music's pulse. Sound follows distance: near things are detailed, far things arrive late and muffled. Silence is a sound
// here too: the score and everything else cut hard at the flash, and again on the slam to black. The one voice line is
// read by Kokoro (npm run voice) and mixed in here, down a bad phone line and then clear on the voicemail.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Mix, SR, hz, impact, kick, pluck, riser, svf } from "../../src/kit/music/synth";
import { outDir } from "../../src/kit/paths";
import { CH, THEME, brass, hit, lead, oct, piano, play, shaped, strings, taiko, thud, tune, windHowl } from "../typhoon/music";
import { BLAST_SOUND, CALL_AT, FLASH, PHONE_DIES, SECONDS, SLAM, STATION_HIT, VOICEMAIL_AT } from "./timeline";

const LENGTH = SECONDS + 0.5;
const sm = (a: number, b: number, x: number) => {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const edges = (t: number, seconds: number, attack = 0.2, release = 0.3) => Math.min(1, t / attack) * Math.min(1, (seconds - t) / release);

function gainCurve(buf: Float32Array, gain: (t: number) => number) {
  for (let i = 0; i < buf.length; i++) buf[i] *= gain(i / SR);
  return buf;
}

// ── Effects ──────────────────────────────────────────────────────────────────────────────────────────

/** The mechanical tick of a very large clock. */
function tick(size = 1) {
  const a = svf(shaped(0.09, 11, (t, r) => r * Math.exp(-t * 90)), 2100, 2.2, "band");
  const b = shaped(0.18, 12, (t) => Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 34));
  return a.map((x, i) => (x * 1.8 + b[i] * 0.5) * size);
}

/** A minute hand jumping on: a heavy clunk with a little ring. */
function clunk() {
  const ring = shaped(0.5, 13, (t) => (Math.sin(2 * Math.PI * 610 * t) + Math.sin(2 * Math.PI * 1370 * t) * 0.5) * Math.exp(-t * 16));
  const body = shaped(0.25, 14, (t, r) => (Math.sin(2 * Math.PI * 92 * t) * 1.5 + r * 0.4) * Math.exp(-t * 22));
  return ring.map((x, i) => x * 0.22 + (i < body.length ? body[i] : 0));
}

/** A phone buzzing against a table: a dry, rattling hum, in pulses. */
function buzz(seconds: number) {
  const raw = shaped(seconds, 15, (t) => {
    const on = (t % 0.72) < 0.42 ? 1 : 0;
    const rattle = Math.sin(2 * Math.PI * 172 * t) + 0.55 * Math.sign(Math.sin(2 * Math.PI * 172 * t)) + 0.22 * Math.sin(2 * Math.PI * 344 * t);
    return rattle * on * Math.min(1, (t % 0.72) / 0.008);
  });
  return svf(raw, 1500, 0.8, "low");
}

/** The alert: a sharp, invented two-note tone. Deliberately not the tones real emergency systems use. */
function alertTone(seconds: number) {
  return shaped(seconds, 16, (t) => {
    const beat = t % 0.5;
    const f = beat < 0.25 ? 1046 : 784;
    const on = beat % 0.25 < 0.2 ? 1 : 0;
    return (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t)) * on * edges(t, seconds, 0.01, 0.06);
  });
}

/** Thousands of phones going off in a wave, spread out and overlapping. */
function phoneWave(seconds: number) {
  const n = Math.round(seconds * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  let s = 3;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let k = 0; k < 90; k++) {
    const start = rnd() * seconds * 0.7, f = 620 + rnd() * 560, pan = rnd(), g = 0.25 + rnd() * 0.5, len = 0.25 + rnd() * 0.4;
    const i0 = Math.round(start * SR), m = Math.round(len * SR);
    for (let i = 0; i < m && i0 + i < n; i++) {
      const tt = i / SR;
      const y = Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 7) * g * Math.min(1, tt / 0.004);
      L[i0 + i] += y * (1 - pan);
      R[i0 + i] += y * pan;
    }
  }
  return [L, R] as [Float32Array, Float32Array];
}

/** One air-raid siren, slowly rising and falling. Band-limited by distance. */
function siren(seconds: number, seed: number, base: number, period: number, cut: number) {
  let p = 0;
  const raw = shaped(seconds, seed, (t) => {
    const sweep = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period);
    const f = base * (1 + sweep * 0.95);
    p = (p + f / SR) % 1;
    return Math.sin(2 * Math.PI * p) + 0.5 * Math.sin(4 * Math.PI * p) + 0.25 * Math.sin(6 * Math.PI * p);
  });
  return svf(raw, cut, 0.9, "low");
}

/** A crowd, panicking: voices as noise through vowel formants, in a shifting swell. */
function crowdNoise(seconds: number, seed: number) {
  const raw = shaped(seconds, seed, (t, r) => r * (0.55 + 0.45 * Math.sin(t * 3.3 + Math.sin(t * 1.3) * 2)));
  const a = svf(raw, (t) => 640 + 180 * Math.sin(t * 2.7), 2.8, "band");
  const b = svf(raw, (t) => 1500 + 300 * Math.sin(t * 1.9 + 1), 3, "band");
  return a.map((x, i) => x * 1.4 + b[i] * 0.7);
}

/** One shout from the crowd: a falling, breathy formant. */
function shout(seed: number) {
  const seconds = 0.42 + ((seed * 37) % 10) * 0.03;
  let p = 0;
  const f0 = 190 + ((seed * 53) % 11) * 28;
  const raw = shaped(seconds, seed, (t, r) => {
    p = (p + (f0 * (1.2 - 0.5 * t)) / SR) % 1;
    return ((2 * p - 1) * 0.9 + r * 0.32) * edges(t, seconds, 0.04, 0.12);
  });
  return svf(raw, 900 + ((seed * 19) % 5) * 180, 3.2, "band");
}

function horn(seconds: number, f1: number, f2: number) {
  let a = 0, b = 0;
  const raw = shaped(seconds, 21, (t) => {
    a = (a + f1 / SR) % 1;
    b = (b + f2 / SR) % 1;
    return (2 * a - 1 + (2 * b - 1)) * 0.5 * edges(t, seconds, 0.01, 0.04);
  });
  return svf(raw, 1700, 0.9, "low");
}

const breath = (seconds: number, seed: number) => svf(shaped(seconds, seed, (t, r) => r * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 0.62)) ** 2 * edges(t, seconds, 0.2, 0.3)), 2300, 1.6, "band");

function heartbeat() {
  const h = (d: number) => shaped(0.2, 33, (t) => Math.sin(2 * Math.PI * (68 - 120 * t) * t) * Math.exp(-t * (d + 16)));
  const a = h(0), b = h(4);
  const out = new Float32Array(Math.round(0.42 * SR));
  a.forEach((x, i) => (out[i] += x));
  const off = Math.round(0.2 * SR);
  b.forEach((x, i) => {
    if (off + i < out.length) out[off + i] += x * 0.7;
  });
  return out;
}

function wings(seconds: number) {
  return svf(shaped(seconds, 35, (t, r) => r * Math.abs(Math.sin(t * 56 + Math.sin(t * 12) * 2)) ** 3 * edges(t, seconds, 0.03, 0.4)), 1800, 0.9, "band");
}

/** The sound of it: a long fall of sub-bass, tearing noise on top so small speakers still get the weight. */
function blast(seconds: number) {
  const sub = shaped(seconds, 41, (t) => Math.tanh(Math.sin(2 * Math.PI * (24 + 40 * Math.exp(-t * 2.2)) * t) * 2.3 * Math.exp(-t / 2.6)));
  const tear = svf(shaped(seconds, 42, (t, r) => r * Math.exp(-t / 2.3) * (0.55 + 0.45 * Math.abs(Math.sin(t * 37 + Math.sin(t * 9) * 3)))), (t) => 300 + 1800 * Math.exp(-t * 0.9), 0.8, "low");
  const crackle = svf(shaped(seconds, 43, (t, r) => (Math.abs(r) > 0.91 ? r * 2.8 : 0) * Math.exp(-t / 2.1)), 3200, 0.9, "band");
  return sub.map((x, i) => x * 0.95 + tear[i] * 1.7 + crackle[i] * 0.6);
}

/** Air being pushed past the camera. */
const whoosh = (seconds: number, seed: number) => svf(shaped(seconds, seed, (t, r) => r * Math.sin((Math.PI * t) / seconds) ** 2), (t) => 300 + 3400 * Math.sin((Math.PI * t) / seconds) ** 2, 1.1, "low");

/** A rusty chain, moving slowly. */
function creak(seed: number) {
  let p = 0;
  const raw = shaped(0.55, seed, (t, r) => {
    p = (p + (640 + 280 * Math.sin(t * 7)) / SR) % 1;
    return ((p < 0.2 ? 1 : 0) - 0.2 + r * 0.1) * Math.sin((Math.PI * t) / 0.55) * (Math.sin(t * 92) > 0 ? 1 : 0.35);
  });
  return svf(raw, 1500, 2.4, "band");
}

/** Glass going, a sheet at a time. */
function glass(seconds: number, seed: number) {
  const raw = svf(shaped(seconds, seed, (t, r) => r * Math.exp(-t * 4.5) * (Math.abs(r) > 0.6 ? 1 : 0.25)), 6200, 0.9, "high");
  const pings = shaped(seconds, seed + 1, (t) => {
    let y = 0;
    for (let i = 0; i < 6; i++) {
      const f = 2600 + ((seed * (i + 3) * 397) % 3900);
      y += Math.sin(2 * Math.PI * f * t) * Math.exp(-(t - i * 0.03) * 11) * (t > i * 0.03 ? 1 : 0);
    }
    return y * 0.25;
  });
  return raw.map((x, i) => x + pings[i]);
}

/** Steel under load: low, slowly bending. */
function groan(seconds: number, seed: number, base: number) {
  let p = 0;
  const raw = shaped(seconds, seed, (t) => {
    p = (p + (base * (1 + 0.14 * Math.sin(t * 1.6 + seed) + 0.08 * Math.sin(t * 4.7))) / SR) % 1;
    return (2 * p - 1) * edges(t, seconds, 0.4, 1);
  });
  return svf(raw, 620, 2.6, "low");
}

/** The dust roaring in, from a long way off to right here. */
const rollingRumble = (seconds: number, seed: number, grow: (t: number) => number) => svf(shaped(seconds, seed, (t, r) => r * grow(t)), (t) => 110 + 720 * grow(t) ** 2, 0.9, "low");

/** A Geiger counter: dry random clicks, at a rate that can change over time. */
function geiger(seconds: number, seed: number, rate: (t: number) => number) {
  const out = new Float32Array(Math.round(seconds * SR));
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  let t = 0;
  while (t < seconds) {
    t += -Math.log(1 - rnd() * 0.999) / Math.max(0.05, rate(t));
    const i0 = Math.round(t * SR);
    for (let i = 0; i < 70 && i0 + i < out.length; i++) out[i0 + i] += (i % 2 ? 1 : -1) * Math.exp(-i / 11);
  }
  return svf(out, 2400, 1.2, "high");
}

const hiss = (seconds: number, seed: number) => svf(shaped(seconds, seed, (t, r) => r * edges(t, seconds, 0.3, 0.3)), 2600, 1.1, "low");

/** A low voice choir: strings through two vowel formants. */
function choir(chord: string, seconds: number, attack = 0.5) {
  const [l, r] = strings(CH[chord].map((n) => hz(n) * 0.5), seconds, { attack, release: 0.8, bright: 2600 });
  const v = (b: Float32Array) => {
    const a = svf(b, 500, 2.6, "band"), e = svf(b, 1100, 3, "band");
    return a.map((x, i) => x * 1.2 + e[i] * 0.55);
  };
  return [v(l), v(r)] as [Float32Array, Float32Array];
}

// ── The voice ────────────────────────────────────────────────────────────────────────────────────────

function loadVoice(): Float32Array {
  const file = outDir("fallout", "voice/message.wav");
  const ffmpeg: string = createRequire(import.meta.url)("ffmpeg-static");
  const res = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 27 });
  if (res.status !== 0) throw new Error(`could not read ${file}: run npm run voice -- fallout first\n${res.stderr}`);
  const b = res.stdout as Buffer;
  // Copied, so it sits on a 4-byte boundary.
  const copy = new Uint8Array(b.length);
  copy.set(b);
  const raw = new Float32Array(copy.buffer, 0, Math.floor(b.length / 4));
  let end = raw.length - 1;
  while (end > 0 && Math.abs(raw[end]) < 0.008) end--;
  let start = 0;
  while (start < end && Math.abs(raw[start]) < 0.008) start++;
  return raw.slice(Math.max(0, start - 400), Math.min(raw.length, end + 2400));
}

/** A bad line: narrow, overdriven, breaking up. */
function overThePhone(v: Float32Array) {
  const low = svf(v, 3000, 0.8, "low");
  const band = svf(low, 430, 0.8, "high");
  return band.map((x, i) => {
    const t = i / SR;
    const gate = Math.sin(t * 91) * Math.sin(t * 7.1) > 0.82 ? 0.28 : 1;
    return Math.tanh(x * 3.4) * gate;
  });
}

/** The same message, clear and close: warm, a touch of phone speaker. */
const onVoicemail = (v: Float32Array) => svf(svf(v, 7000, 0.8, "low"), 170, 0.8, "high").map((x) => Math.tanh(x * 1.5));

// ── The mix ──────────────────────────────────────────────────────────────────────────────────────────

/** The score. One beat is one second. */
function score(m: Mix) {
  // Under everything that runs: a driving figure at double time, so the pulse never lets go. It's far away at the station,
  // it comes back for the last look at the clock, then at the blast it has the whole orchestra behind it.
  play(m, { from: 6, to: 14, bpm: 120, chords: ["Dm", "Dm", "Bb", "A"], beatsPerChord: 4, str: 0.36, bright: 1900, sub: 0.3, drive: 0.3, div: 2, drums: 0.46, swell: true });
  play(m, { from: 14, to: 20, bpm: 120, chords: ["Dm", "Bb"], beatsPerChord: 4, str: 0.22, bright: 1100, sub: 0.16, drive: 0.13, div: 2 });
  play(m, { from: 25, to: 28.9, bpm: 120, chords: ["Bb", "A"], beatsPerChord: 4, str: 0.42, bright: 2400, sub: 0.34, drive: 0.34, div: 2, drums: 0.5, swell: true });
  m.add(riser(4.6), 25, 0.42, 0, 0.4);
  hit(m, BLAST_SOUND, "Dm", 1.1, 3.2);
  play(m, { from: 34, to: 44, bpm: 120, chords: ["Dm", "Bb", "Gm", "A"], beatsPerChord: 4, str: 0.52, bright: 2900, sub: 0.46, drive: 0.42, div: 2, drums: 0.8, swell: true });
  tune(m, oct(THEME, -1), 34.3, 96, "lead", 0.36);
  tune(m, THEME, 34.3, 96, "high", 0.11, 0.15);
  hit(m, 44, "Dm", 1, 2.4);
  play(m, { from: 47.7, to: 54, bpm: 120, chords: ["Dm", "Bb", "A", "A"], beatsPerChord: 4, str: 0.38, bright: 2400, sub: 0.4, drive: 0.4, div: 2, drums: 0.62, swell: true });

  // Shots 1 to 2: a low drone, and a muffled kick on the tick. Strings start to climb.
  m.add(strings([hz("D2"), hz("A2")], 9, { attack: 3, release: 2, bright: 450 }), 3, 0.55, 0, 0.3);
  for (let t = 6; t < 14; t++) m.add(kick(0.3), t, 0.3 + (t - 6) * 0.018, 0, 0.1);
  m.add(strings(CH.Dm.map(hz).slice(0, 3), 8.4, { attack: 3.5, release: 0.8, bright: 1100 }), 6, 0.42, 0, 0.45);
  m.add(lead(hz("D3"), 4.2, 700), 10, 0.14, 0, 0.3);
  m.add(lead(hz("E3"), 4, 800), 14, 0.04, 0, 0.3);
  // Shot 3: dropped back to the pulse and one held cello note.
  for (let t = 14; t < 25; t++) m.add(kick(0.3), t, 0.3, 0, 0.1);
  m.add(strings([hz("D2") * 2], 6.4, { attack: 1, release: 0.8, bright: 620 }), 14, 0.34, 0, 0.4);
  // Shot 4: four fragile notes, once, as the line goes dead.
  for (const [at, n] of [[23.5, "A4"], [24, "F4"], [24.5, "D4"], [25, "E4"]] as const) m.add(piano(hz(n), 2.6), at, 0.34, 0, 0.72);
  // Shot 5: the build. It falls away before the flash, leaving only the tick and the heart.
  m.add(strings(CH.Bb.map(hz), 2.6, { attack: 0.7, release: 0.3, bright: 1400 }), 25, 0.3, 0, 0.5);
  m.add(strings(CH.A.map(hz), 2.1, { attack: 0.5, release: 0.8, bright: 2100 }), 26.2, 0.48, 0, 0.5);
  for (let t = 25; t < 28; t++) m.add(taiko(0.6), t, 0.26 + (t - 25) * 0.08, 0, 0.3);
  // From the blast sound: slow brass and low choir, devastating, then the widest moment at the top of the climb.
  m.add(taiko(1.5), BLAST_SOUND, 1, 0, 0.5);
  m.add(choir("Dm", 6.6, 0.9), BLAST_SOUND + 0.2, 0.86, 0, 0.65);
  m.add(brass(CH.Dm.map(hz).slice(0, 4), 3), BLAST_SOUND + 0.3, 0.34, 0, 0.6);
  m.add(brass(CH.Bb.map(hz).slice(0, 4), 3.2), 35.3, 0.36, 0, 0.6);
  m.add(strings(CH.Gm.map(hz), 3.6, { attack: 0.6, release: 0.7, bright: 2200 }), 38, 0.56, 0, 0.6);
  m.add(choir("Gm", 3.6, 0.5), 38, 0.75, 0, 0.65);
  for (const t of [34, 36, 38, 40]) m.add(taiko(1.2), t, 0.5 + (t - 34) * 0.05, 0, 0.4);
  m.add(strings(CH.A.map(hz), 2.5, { attack: 0.4, release: 0.5, bright: 2600 }), 41.6, 0.62, 0, 0.6);
  m.add(brass(CH.A.map(hz).slice(0, 4), 2.4), 41.8, 0.44, 0, 0.6);
  m.add(riser(1.4), 42.6, 0.15, 0, 0.5);
  // The climax, over the curve of the Earth.
  m.add(taiko(1.7), 44, 1, 0, 0.6);
  m.add(strings(CH.Dm.map(hz), 2.5, { attack: 0.05, release: 1, bright: 3200 }), 44, 0.78, 0, 0.75);
  m.add(choir("Dm", 2.5, 0.05), 44, 0.8, 0, 0.75);
  m.add(brass(CH.Dm.map(hz).slice(1), 2.3), 44, 0.48, 0, 0.75);
  m.add(lead(hz("A5"), 4.4, 3200), 44.6, 0.1, 0, 0.8);
  // Shot 8: the rising tension string, under the real sound of nothing.
  m.add(strings([hz("A3"), hz("Bb3")], 6, { attack: 2.4, release: 0.2, bright: 1500 }), 48, 0.26, 0, 0.5);
  m.add(strings([hz("D3"), hz("Eb3"), hz("A4")], 3.2, { attack: 1.2, release: 0.1, bright: 2600 }), 51, 0.3, 0, 0.5);
  // Shot 10: cold and sparse, a hollow pad.
  m.add(strings([hz("D3"), hz("A3")], 10, { attack: 2.4, release: 2, bright: 520 }), 56, 0.34, 0, 0.65);
  m.add(strings([hz("F4")], 8, { attack: 3, release: 2.4, bright: 920 }), 57.8, 0.09, 0, 0.8);
  m.add(strings([hz("D3"), hz("G3")], 7.4, { attack: 1.4, release: 1.4, bright: 500 }), 65.2, 0.28, 0, 0.65);
  // Shot 12: the theme comes back slowly, strings under it.
  m.add(strings(CH.Dm.map(hz), 6.4, { attack: 1.4, release: 1.4, bright: 950 }), 72, 0.27, 0, 0.7);
  for (const [at, n, g] of [[72.2, "A4", 0.36], [73.7, "F4", 0.34], [75.2, "D4", 0.34], [76.7, "E4", 0.36]] as const) m.add(piano(hz(n), 3.6), at, g, 0, 0.72);
  // Shot 13: strings thin out and stop, so the voice stands alone.
  m.add(strings([hz("D3"), hz("A3")], 1.6, { attack: 0.3, release: 1.2, bright: 700 }), 78, 0.12, 0, 0.7);
  // Shot 14: the whole theme, gently, unresolved; the last note fades into the cut.
  for (const [at, n] of [[84.6, "A4"], [85.6, "F4"], [86.6, "D4"], [87.6, "E4"], [88.6, "F4"], [89.1, "G4"]] as const) m.add(piano(hz(n), 3.1), at, 0.34, 0, 0.75);
  m.add(strings([hz("D3"), hz("A3"), hz("F4")], 5.4, { attack: 2, release: 1.6, bright: 720 }), 84.6, 0.13, 0, 0.75);
}

/** The world's sound, shot by shot. */
function effects(m: Mix) {
  // Shot 1: the phone, then the tone, then the wave of phones. The clock ticks once a second from the first wide shot.
  m.add(buzz(3), 0, 0.42);
  m.add(alertTone(2.6), 0.35, 0.15, 0, 0.1);
  m.add(phoneWave(3), 3, 0.34, 0, 0.3);
  for (let at = 3; at < FLASH; at++) m.add(tick(1), at, at < 6 ? 0.26 : at < 14 ? 0.1 : at < 25 ? 0.06 : 0.22, 0, 0.6);
  // Shots 1 and 2: sirens rising, crowds, cars.
  // Close downtown, thin at the station (the cut is 60 km of distance), then close again for the last look at the city.
  const sirenDistance = (at: number) => (at >= 14 && at < 25 ? 0.13 : 1);
  m.add(gainCurve(siren(25, 51, 340, 11, 2200), (t) => sm(0, 5, t) * sirenDistance(t + 3.6)), 3.6, 0.1, -0.35, 0.45);
  m.add(gainCurve(siren(25, 52, 390, 9.2, 1900), (t) => sm(2, 7, t) * sirenDistance(t + 3.6)), 3.6, 0.08, 0.4, 0.5);
  m.add(gainCurve(crowdNoise(8.4, 53), (t) => sm(0, 1.8, t) * edges(t, 8.4, 0.1, 0.08)), 5.8, 0.42, 0.1, 0.2);
  m.add(gainCurve(crowdNoise(8.4, 54), (t) => sm(0, 1.8, t) * edges(t, 8.4, 0.1, 0.08)), 5.8, 0.36, -0.1, 0.2);
  for (let i = 0; i < 12; i++) m.add(shout(i + 60), 6.6 + i * 0.6 + (i % 3) * 0.17, 0.38, Math.sin(i * 2.4) * 0.65, 0.35);
  for (const [at, s, a, b] of [[7.2, 0.5, 410, 515], [8.6, 0.9, 370, 462], [10.3, 0.3, 440, 554], [11.1, 1.2, 392, 494], [12.9, 0.5, 349, 440]] as const) m.add(horn(s, a, b), at, 0.09, Math.sin(at * 3) * 0.6, 0.4);
  for (let at = 6; at < 14; at += 0.15) m.add(thud(Math.round(at * 13)), at + Math.sin(at * 17) * 0.05, 0.08, Math.sin(at * 7) * 0.65, 0.1);
  // Shot 3: far away from all of it. Wind, feet on concrete, a child breathing. Sirens carry thin across the fields.
  m.add(windHowl(11, 71, 0.15), 14, 0.08, 0.1, 0.2);
  for (let at = 14; at < 19.9; at += 0.3) m.add(thud(Math.round(at * 7)), at, 0.16, 0.14, 0.15);
  m.add(breath(6, 72), 14, 0.13, 0.2, 0.1);
  // Shot 4: one ring, then the line, then dead.
  for (const at of [20.02, 20.22]) m.add(pluck(hz("E6"), 0.2), at, 0.14, 0.1, 0.1);
  m.add(gainCurve(hiss(4.5, 73), (t) => (Math.sin(t * 29) * Math.sin(t * 6.7) > 0.3 ? 1 : 0.55)), 20.4, 0.018, 0.15);
  // Shot 5: the crowd gone quiet, the tick and a heart. The wings go up just before the white.
  m.add(gainCurve(crowdNoise(3.5, 74), (t) => 1 - sm(0, 3.3, t)), 25, 0.2);
  for (let at = 26.4; at < FLASH; at += 0.82) m.add(heartbeat(), at, 0.42, 0, 0.1);
  m.add(wings(1.5), 28.15, 0.28, 0.12, 0.7);
  m.add(clunk(), 14.6, 0.14, 0, 0.5);
  m.add(clunk(), 28.9, 0.58, 0, 0.7);

  // The cuts of the panic land with weight.
  for (const at of [7.4, 8.6, 10, 11.2, 12.4]) {
    m.add(whoosh(0.5, Math.round(at * 11)), at - 0.3, 0.2, Math.sin(at) * 0.4, 0.2);
    m.add(kick(0.9), at, 0.42);
  }
  for (const at of [15.8, 17.6]) m.add(whoosh(0.45, Math.round(at * 13)), at - 0.28, 0.12, Math.sin(at) * 0.4, 0.2);
  // The wall coming up the avenue: it builds to the camera, wrecks, cars and all, and passes.
  m.add(rollingRumble(3.5, 141, (t) => sm(0, 3.4, t) ** 1.6), BLAST_SOUND, 1.5, 0, 0.25);
  m.add(whoosh(1.5, 142), 34.2, 0.95, 0, 0.4);
  for (const at of [33, 33.5, 33.9, 34.2, 34.5, 34.8, 35.05, 35.2]) m.add(impact(), at, 0.28 + (at - 33) * 0.2, Math.sin(at * 11) * 0.5, 0.25);
  for (const [at, s] of [[33.2, 1.1], [33.9, 1], [34.6, 0.9]] as const) m.add(glass(s, Math.round(at * 17)), at, 0.26, Math.sin(at * 5) * 0.55, 0.25);

  // Shots 6 and 7: the sound of the blast, with a rain of glass and steel, thinning to high wind as the camera climbs.
  m.add(blast(11), BLAST_SOUND, 1.25, 0, 0.45);
  for (const [at, s, g, p] of [[32.25, 1.5, 0.3, -0.45], [33, 1.6, 0.32, 0.5], [33.8, 1.2, 0.24, -0.2], [34.7, 1.7, 0.28, 0.25], [36, 1.2, 0.2, -0.55]] as const) m.add(glass(s, Math.round(at * 7)), at, g, p, 0.3);
  m.add(groan(4, 81, 44), 33, 0.26, -0.3, 0.45);
  m.add(groan(4.4, 82, 58), 34.5, 0.22, 0.3, 0.5);
  m.add(gainCurve(windHowl(10, 83, 0.5), (t) => sm(0.5, 5, t) * (1 - sm(7.2, 8, t) * 0.9)), 38, 0.1, 0, 0.3);

  // Shot 8: true quiet. Ringing in the ears, a child's breath, then the rumble building. The minute hand clunks on.
  m.add(gainCurve(shaped(5.1, 90, (t) => Math.sin(2 * Math.PI * 4180 * t)), (t) => Math.exp(-t / 2.8) * Math.min(1, t / 0.05)), 46, 0.03, 0.1);
  m.add(breath(5, 91), 46.4, 0.15, 0.25, 0.08);
  m.add(rollingRumble(8, 92, (t) => sm(0, 8, t) ** 2.3), 46.05, 1.5);
  m.add(heartbeat(), 47.3, 0.3, 0, 0.1);
  for (let at = 48, gap = 0.72; at < STATION_HIT; at += gap, gap = Math.max(0.42, gap - 0.05)) m.add(heartbeat(), at, 0.38, 0, 0.1);
  for (let at = 48; at < 53.6; at += 0.21) m.add(thud(Math.round(at * 19)), at, 0.26, 0.14, 0.15);
  for (const at of [48.5, 51, 53.5]) m.add(clunk(), at, 0.72, 0, 0.75);
  // Shot 9: a beat of pressure drop, then the hit: concrete, glass, tearing roof, and a last tick before the slam.
  m.add(tick(1.4), 53.97, 0.38, 0, 0.4);
  m.add(blast(1.4), STATION_HIT, 1.3, 0, 0.3);
  m.add(impact(), STATION_HIT, 1);
  m.add(kick(1.6), STATION_HIT, 1);
  m.add(glass(0.9, 411), STATION_HIT + 0.03, 0.5, -0.4, 0.3);
  m.add(glass(0.9, 412), STATION_HIT + 0.18, 0.4, 0.4, 0.3);
  m.add(groan(1, 93, 74), STATION_HIT + 0.1, 0.5, 0, 0.2);

  // Shot 10: vast cold wind and the first few clicks.
  m.add(gainCurve(windHowl(10.2, 101, 0.28), (t) => sm(0, 1.5, t)), 55.1, 0.14, 0, 0.45);
  m.add(geiger(10, 102, (t) => 1.1 + t * 0.35), 55.2, 0.1, 0.28, 0.14);
  // The town: wind, a chain creaking, and the sound of nothing else.
  m.add(gainCurve(windHowl(2.5, 145, 0.12), (t) => edges(t, 2.5, 0.05, 0.06)), 60, 0.16, 0.1, 0.5);
  for (const [at, s] of [[60.25, 146], [61.1, 147], [62, 148]] as const) m.add(creak(s), at, 0.15, -0.25, 0.55);
  m.add(whoosh(0.6, 149), 59.55, 0.1, 0, 0.3);
  m.add(whoosh(0.6, 150), 62.05, 0.1, 0, 0.3);

  // Shot 11: dripping, a buzzing lamp, ash whispering, footsteps walking away. The counter is fast here.
  const drip = shaped(0.16, 103, (t) => Math.sin(2 * Math.PI * (900 + 2700 * t) * t) * Math.exp(-t * 34));
  for (const at of [65.6, 67.4, 68.25, 70.3, 71.2, 73.4, 76.5]) m.add(drip, at, 0.13, Math.sin(at) * 0.35, 0.9);
  m.add(gainCurve(shaped(13, 104, (t) => Math.sign(Math.sin(2 * Math.PI * 100 * t)) * 0.45 + Math.sin(2 * Math.PI * 200 * t)), (t) => edges(t, 13, 0.3, 1.6)), 65, 0.011, -0.3);
  m.add(gainCurve(svf(shaped(13, 105, (t, r) => r), 5200, 0.9, "high"), (t) => edges(t, 13, 1, 1.2)), 65, 0.018, 0);
  m.add(gainCurve(windHowl(13, 106, 0.1), (t) => edges(t, 13, 0.9, 1.4)), 65, 0.05, 0, 0.5);
  m.add(geiger(7, 107, () => 9), 65, 0.14, 0.2, 0.3);
  for (let at = 66.2, i = 0; at < 71.4; at += 0.55, i++) m.add(thud(i + 700), at, 0.2 * (1 - i * 0.08), -0.12, 0.85);
  // A breath against a hand, as the child's held back.
  m.add(breath(1.5, 108), 67.7, 0.2, 0.15, 0.3);
  // Shot 12: the clicks slow from hurried to almost nothing as the days pass.
  m.add(geiger(6, 109, (t) => 8 * 0.45 ** t), 72, 0.14, 0.2, 0.3);
  // Shot 13: a low hum, the low-battery chime, the tiny click as the screen dies.
  m.add(gainCurve(shaped(5.4, 110, (t) => Math.sin(2 * Math.PI * 60 * t)), (t) => edges(t, 5.4, 0.5, 0.2)), 78, 0.05, 0);
  m.add(pluck(hz("C6"), 0.3), 78.8, 0.09, 0.1, 0.2);
  m.add(pluck(hz("G5"), 0.4), 79, 0.08, 0.1, 0.2);
  const click = svf(shaped(0.05, 111, (t, r) => r * Math.exp(-t * 180)), 3000, 2, "band");
  m.add(click, PHONE_DIES, 0.5, 0.1, 0.25);
  // Shot 14: slow feet on ash, soft wind, one last click.
  m.add(gainCurve(windHowl(6.1, 112, 0.06), (t) => edges(t, 6.1, 0.8, 0.9)), 84, 0.09, 0.05, 0.4);
  const soft = (seed: number) => svf(thud(seed), 800, 0.9, "low");
  for (let at = 84.6, i = 0; at < 87.6; at += 0.62, i++) m.add(soft(i + 800), at, 0.34, 0.1, 0.3);
  m.add(geiger(0.05, 113, () => 80), 88.4, 0.22, -0.2, 0.7);
}

/** Absolute silence, sample-exact, with a few milliseconds of edge so the cuts don't click. */
function silence(m: Mix, windows: [number, number][]) {
  const edge = 0.004 * SR;
  for (const [a, b] of windows) {
    const i0 = Math.round(a * SR), i1 = Math.min(m.L.length, Math.round(b * SR));
    for (let i = Math.max(0, i0 - edge); i < i1 + edge && i < m.L.length; i++) {
      const g = i < i0 ? (i0 - i) / edge : i >= i1 ? (i - i1) / edge : 0;
      m.L[i] *= g;
      m.R[i] *= g;
    }
  }
}

export function writeMusic(file: string) {
  const voice = loadVoice();
  const vs = voice.length / SR;
  if (CALL_AT + vs > 24.2) console.warn(`  ⚠ the voice runs ${(CALL_AT + vs - 24.2).toFixed(2)} s past its caption at the call`);
  if (VOICEMAIL_AT + vs > PHONE_DIES) console.warn(`  ⚠ the voice runs ${(VOICEMAIL_AT + vs - PHONE_DIES).toFixed(2)} s past the phone dying`);

  const m = new Mix(LENGTH);
  score(m);
  effects(m);
  // The music dips under the voice, and the two takes sit on top of it.
  const under: [number, number][] = [[CALL_AT - 0.15, CALL_AT + vs + 0.05]];
  for (const [a, b] of under) {
    const i0 = Math.round(a * SR), i1 = Math.round(b * SR);
    for (let i = i0; i < i1; i++) {
      const g = 1 - 0.6 * Math.min(1, Math.min(i - i0, i1 - i) / (0.1 * SR));
      m.L[i] *= g;
      m.R[i] *= g;
    }
  }
  m.add(overThePhone(voice), CALL_AT, 0.95, 0.05, 0.03);
  m.add(onVoicemail(voice), VOICEMAIL_AT, 1.2, 0, 0.14);
  // The dead line after the call, a real tail of static.
  const dead = shaped(1.25, 121, (t) => Math.sin(2 * Math.PI * 425 * t) * (t % 0.5 < 0.25 ? 1 : 0) * edges(t, 1.25, 0.01, 0.08));
  m.add(svf(dead, 1800, 0.8, "low"), CALL_AT + vs + 0.12, 0.05, 0.08);

  m.finish(0.02);
  silence(m, [
    [FLASH, BLAST_SOUND],
    [SLAM, SLAM + 0.3],
    [90, LENGTH],
  ]);
  m.write(file);
  console.log(`  ✓ score, effects and voice (${vs.toFixed(2)} s line) → ${file}`);
}
