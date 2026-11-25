// The score and the sound, on the film's clock. Real strings (VSCO 2 CE, CC0) and a soft upright, in a hall; the field's
// wind and insects and the distant fire are synthesised. No groove, no heroic brass, and real silence where the story has it.
//
// One theme, in D minor: it rises a step and falls away, never quite getting home. Heard whole only after the last shot.
import { Instrument, convolve, ensureSamples, hallResponse, instrument, type PlayOptions } from "../../src/kit/music/sampler";
import { Mix, SR, svf } from "../../src/kit/music/synth";
import { FIELD_NOTES, addEffects } from "./sound-scenes";
import { SCENES as S, SECONDS, WP_FILM } from "./timeline";

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

/** Random numbers in 0…1, the same every run. */
const seeded = (seed: number) => {
  const n = noiseGen(seed);
  return () => (n() + 1) / 2;
};

const sm = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
/** 1 between a and b, fading over `fade` either side. */
const within = (t: number, a: number, b: number, fade = 1) => sm(a - fade, a, t) * (1 - sm(b, b + fade, t));

// ── The field: wind, corn, insects, frogs ─────────────────────────────────────────────────────────────

function bed(seconds: number, gain: (t: number) => number, make: (i: number, t: number) => number) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, g = gain(t);
    if (g > 1e-4) out[i] = make(i, t) * g;
  }
  return out;
}

function wind(seconds: number, seed: number, cutoff: number, gain: (t: number) => number) {
  const rnd = noiseGen(seed);
  let lp = 0;
  const slow = (t: number) => 0.55 + 0.3 * Math.sin(t * 0.31 + seed) + 0.15 * Math.sin(t * 0.83 + seed * 2);
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  return bed(seconds, gain, (_, t) => {
    lp += k * (rnd() - lp);
    return lp * slow(t);
  });
}

/** Leaves against leaves: quick bright noise in gusts. */
function rustle(seconds: number, seed: number, gain: (t: number) => number) {
  const rnd = noiseGen(seed);
  const raw = bed(seconds, gain, (_, t) => {
    const gust = Math.max(0, Math.sin(t * 0.47 + seed) * 0.6 + Math.sin(t * 1.37 + seed) * 0.4);
    return rnd() * gust * gust;
  });
  return svf(raw, 3800, 0.9, "band");
}

/** Insects: a band of pulsing tone with a slow chorus. */
function crickets(seconds: number, seed: number, freq: number, gain: (t: number) => number) {
  const n = noiseGen(seed)() * 0.5 + 1;
  return bed(seconds, gain, (_, t) => {
    const pulse = Math.max(0, Math.sin(t * 2 * Math.PI * 16.5 * n)) ** 3;
    const chirp = Math.max(0, Math.sin(t * 2 * Math.PI * 0.43 * n + seed)) ** 2;
    return Math.sin(t * 2 * Math.PI * freq) * pulse * chirp;
  });
}

function frog(pitch: number, seed: number) {
  const rnd = seeded(seed);
  const len = 0.16 + rnd() * 0.12, n = Math.round(len * SR);
  const out = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    p += (2 * Math.PI * pitch * (1 + 0.16 * Math.sin((t / len) * Math.PI))) / SR;
    const s = Math.sin(p);
    out[i] = Math.sign(s) * Math.abs(s) ** 0.6 * Math.sin((t / len) * Math.PI) ** 0.8 * (0.65 + 0.35 * Math.sin(t * 2 * Math.PI * 34));
  }
  return svf(out, 900, 0.9, "low");
}

// ── The orchestra ─────────────────────────────────────────────────────────────────────────────────────

const NOTE: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const n = (name: string) => {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return NOTE[m[1]] + (Number(m[2]) + 1) * 12;
};

type Band = { cello: Instrument; viola: Instrument; violin: Instrument; bass: Instrument; pizz: Instrument; trem: Instrument; piano: Instrument };

async function band(): Promise<Band> {
  const piano = /_(pp|mf)_/;
  return {
    cello: await instrument("Strings/Cello Section/susvib"),
    viola: await instrument("Strings/Viola Section/susvib"),
    violin: await instrument("Strings/Solo Violin/Arco Vib"),
    bass: await instrument("Strings/Solo Contrabass/SusNV"),
    pizz: await instrument("Strings/Cello Section/pizzT"),
    trem: await instrument("Strings/Cello Section/trem"),
    piano: new Instrument(await ensureSamples("Keys/Upright Nr1", piano), { only: piano }),
  };
}

/** A held note on a string section: slow in, slow out, a slight swell, and a shade of drift in when it starts. */
function hold(m: Mix, inst: Instrument, name: string, at: number, seconds: number, gain: number, velocity: number, pan = 0, wet = 0.5, opts: PlayOptions = {}) {
  m.add(inst.play(n(name), seconds, velocity, { attack: 1.4, release: 2.2, swell: 0.2, ...opts }), at, gain, pan, wet);
}

/** A slow chord for the string section. Voice-led: nothing moves further than it has to. */
function strings(m: Mix, b: Band, at: number, seconds: number, notes: { bass?: string; cello?: string[]; viola?: string[] }, gain: number, velocity = 0.3, wet = 0.5) {
  if (notes.bass) hold(m, b.bass, notes.bass, at, seconds, gain * 1.05, velocity, 0.05, wet * 0.7);
  for (const [i, c] of (notes.cello ?? []).entries()) hold(m, b.cello, c, at + i * 0.09, seconds, gain, velocity, 0.18, wet);
  for (const [i, c] of (notes.viola ?? []).entries()) hold(m, b.viola, c, at + i * 0.11, seconds, gain * 0.9, velocity, -0.22, wet);
}

// The theme. Beats at 44 a minute: [note, beats].
const BEAT = 60 / 44;
const THEME: [string, number][] = [["D4", 2], ["E4", 1], ["F4", 3], ["E4", 1], ["D4", 1], ["C4", 2], ["A3", 2], ["Bb3", 2], ["A3", 1], ["G3", 1], ["F3", 2], ["E3", 2], ["D3", 4]];
export const THEME_SECONDS = THEME.reduce((s, [, b]) => s + b, 0) * BEAT;

function theme(m: Mix, inst: Instrument, at: number, gain: number, velocity: number, opts: { shift?: number; pan?: number; wet?: number; bars?: number; rnd?: () => number } = {}) {
  const rnd = opts.rnd ?? seeded(5);
  let beat = 0;
  const list = opts.bars ? THEME.slice(0, opts.bars) : THEME;
  for (const [name, beats] of list) {
    const note = n(name) + (opts.shift ?? 0);
    // Played, not sequenced: each note lands a little off the grid and leans into its length.
    const start = at + beat * BEAT + (rnd() - 0.5) * 0.09;
    const v = velocity * (0.9 + rnd() * 0.2) * (beats >= 2 ? 1.06 : 0.92);
    m.add(inst.play(note, beats * BEAT + 0.12, v, { attack: 0.22, release: 1.1, swell: 0.18 }), start, gain, opts.pan ?? 0.1, opts.wet ?? 0.6);
    beat += beats;
  }
}

// The harmony of the theme's two lines: i, VI, iv, V(sus) on the way down, then the plain tonic.
const CHORDS: { bass: string; cello: string[]; viola: string[] }[] = [
  { bass: "D2", cello: ["D3", "A3"], viola: ["F4"] },
  { bass: "Bb1", cello: ["D3", "Bb3"], viola: ["F4"] },
  { bass: "G1", cello: ["G3", "Bb3"], viola: ["D4"] },
  { bass: "A1", cello: ["E3", "A3"], viola: ["D4"] },
  { bass: "A1", cello: ["E3", "A3"], viola: ["C#4"] },
  { bass: "D2", cello: ["D3", "A3"], viola: ["F4"] },
];

/** The string section under the theme, one chord every `every` seconds. */
function progression(m: Mix, b: Band, at: number, until: number, every: number, gain: number | ((t: number) => number), velocity = 0.3, from = 0) {
  let i = from;
  for (let t = at; t < until - 0.5; t += every, i++) {
    const c = CHORDS[i % CHORDS.length];
    const g = typeof gain === "function" ? gain(t) : gain;
    strings(m, b, t, Math.min(every, until - t) + 0.4, c, g, velocity);
  }
}

// ── The cue sheet ─────────────────────────────────────────────────────────────────────────────────────

/** How loud the score sits against the effects. Nothing of it plays under close fire. */
const MUSIC = 1.05;

export async function writeMusic(file: string) {
  const b = await band();
  const m = new Mix(SECONDS + 0.5);
  // Effects get their own bus, with no cap on it: a shot is the loudest thing in the film.
  const fx = new Mix(SECONDS + 0.5);
  await addEffects(fx);

  const r = seeded(77);
  // The land under most of it, with its silences cut out: the empty room, the lens on the map, the last words.
  const air = (t: number) => within(t, S.practice.from, S.count.to, 2) * (1 - within(t, S.lastStand.from + 0.4, S.lastStand.to - 0.4, 1) * 0.86);
  m.add(wind(SECONDS, 3, 340, (t) => 0.08 * air(t)), 0, 1, -0.08, 0.05);
  m.add(wind(SECONDS, 8, 900, (t) => 0.028 * air(t)), 0, 1, 0.14, 0.05);
  m.add(rustle(SECONDS, 21, (t) => 0.3 * within(t, S.across.from, S.across.to, 2) + 0.3 * within(t, S.ninth.from, S.ninth.to, 2) + 0.22 * within(t, S.lastField.from, S.lastField.to, 2)), 0, 1, -0.2, 0.1);
  const night = (t: number) => within(t, S.dropOff.from, S.window.from + 9, 2.5) * (1 - sm(S.window.from + 2, S.window.from + 9, t)) + within(t, S.lights.from, S.ninth.to, 3);
  m.add(crickets(SECONDS, 31, 4300, (t) => 0.02 * night(t)), 0, 1, -0.4, 0.15);
  m.add(crickets(SECONDS, 32, 5150, (t) => 0.014 * night(t)), 0, 1, 0.45, 0.15);
  for (const [a, z] of [[S.dropOff.from, S.window.from + 3], [S.lights.from, S.ninth.to]]) {
    for (let t = a; t < z; t += 0.5 + r() * 2.6) m.add(frog(120 + r() * 120, Math.round(t * 91)), t, 0.03 + r() * 0.035, (r() - 0.5) * 1.3, 0.5);
  }

  // 0:00 Title: one low note, far back, and nothing else.
  hold(m, b.bass, "D2", 3, 9.5, 0.5, 0.15, 0, 0.5, { attack: 3.5, release: 3.5 });

  // 0:12 The hunt: the string section, very quiet, where the theme's harmony lives.
  progression(m, b, S.fourYears.from + 1, S.boats.to, 7.2, 0.3, 0.12);

  // 0:44 The empty room: nothing. Rehearsal: only a pulse, plucked, already not quite in time.
  for (let t = S.practice.from + 1, i = 0; t < S.practice.to - 1; t += 2.2, i++) m.add(b.pizz.play(n(["D2", "A1"][i % 2]), 1, 0.2, { attack: 0.002, release: 0.5 }), t + r() * 0.05, 0.4, 0.12, 0.45);

  // 1:20 The night: a pedal, and a slow plucked step that doesn't quite keep time.
  hold(m, b.bass, "D2", S.trucks.from, S.route.to - S.trucks.from, 0.42, 0.15, 0, 0.45, { attack: 3, release: 3.5 });
  const stepR = seeded(13);
  for (let t = S.route.from, i = 0; t < S.weight.to; t += 2.7 + stepR() * 1.5, i++) m.add(b.pizz.play(n(["D2", "A1", "D2", "F2"][i % 4]), 1.2, 0.28, { attack: 0.002, release: 0.5 }), t, 0.5, 0.12, 0.5);
  strings(m, b, S.weight.from + 4, S.weight.to - S.weight.from - 4, { cello: ["D3"], viola: ["A3"] }, 0.2, 0.1);

  // 2:28 The last river: one low tremolo, climbing out of hearing for the window.
  hold(m, b.trem, "D2", S.lastRiver.from + 2, 26, 0.16, 0.1, 0.1, 0.5, { attack: 7, release: 3 });
  hold(m, b.bass, "A1", S.window.from + 3, 15, 0.2, 0.08, 0, 0.5, { attack: 6, release: 2.2 });

  // 3:30 After the blast: the first hint of the theme, in the violas, and it stops short.
  theme(m, b.viola, S.bingo.from + 2, 0.32, 0.2, { pan: -0.15, bars: 3 });

  // 3:54 The bridge: a low plucked pulse under a chord that won't resolve.
  for (let t = S.bridge.from + 1, i = 0; t < S.bridge.to; t += 1.3, i++) m.add(b.pizz.play(n(i % 4 === 3 ? "G1" : "A1"), 0.9, 0.2, { attack: 0.002, release: 0.4 }), t + (r() - 0.5) * 0.02, 0.36, 0.1, 0.35);
  strings(m, b, S.bridge.from, 24, { bass: "A1", cello: ["E3", "A3"], viola: ["D4"] }, 0.22, 0.14);

  // 4:30 What's across the river: the viola starts over and the rise comes under it. All of it stops before the first shot.
  theme(m, b.viola, S.across.from + 1, 0.42, 0.22, { pan: -0.15, bars: 6, rnd: seeded(9) });
  hold(m, b.trem, "A2", S.across.from + 9, 12.5, 0.22, 0.2, 0.15, 0.5, { attack: 6, release: 1 });

  // 5:06 The wait: the pulse comes back, and goes on for as long as nothing comes back from the radio.
  const pulse = 1.1;
  for (let t = S.call.from + 0.4, i = 0; t < S.openGround.to; t += pulse, i++) m.add(b.pizz.play(n(i % 8 < 6 ? "A1" : "D2"), 0.9, 0.24, { attack: 0.002, release: 0.4 }), t + (r() - 0.5) * 0.02, 0.5 + 0.2 * sm(S.call.from, S.openGround.to, t), 0.1, 0.35);
  strings(m, b, S.guns.from, S.guns.to - S.guns.from + 3, { bass: "G1", cello: ["G3", "Bb3"], viola: ["E4"] }, 0.26, 0.2);
  strings(m, b, S.openGround.from, 8, { bass: "A1", cello: ["E3", "A3"], viola: ["D4"] }, 0.26, 0.22);

  // 5:40 One Hour: nothing at all. The wind is the only thing in it.

  // 6:02 The markers: one soft note on the upright for each one, never quite a tune.
  FIELD_NOTES.forEach(({ at, note: name }, i) => m.add(b.piano.play(n(name), 2.8, 0.1, { attack: 0.004, release: 1.2 }), at, 0.5, -0.05 + ((i * 7) % 5) * 0.05, 0.75));

  // 6:44 One Bottle: low strings, no melody, and the bass stops to listen.
  strings(m, b, S.bottle.from + 2, 18, { bass: "D2", cello: ["D3", "A3"] }, 0.16, 0.1);

  // 7:04 Last Stand: no music.

  // 7:24 The three rounds, each from far behind us, and the land going quiet after them.
  for (const [i, t] of WP_FILM.entries()) hold(m, b.bass, ["D2", "C2", "Bb1"][i], t, 2.8, 0.4, 0.25, 0, 0.7, { attack: 0.3, release: 1.6 });

  // 7:36 Help comes: the theme, whole for the first time, in the cellos. Soft, and not trying to console anyone.
  progression(m, b, S.lights.from + 0.5, S.halfMast.to, THEME_SECONDS / 4.5, 0.22, 0.16);
  theme(m, b.cello, S.lights.from + 4, 0.62, 0.26, { shift: -12, rnd: seeded(14), pan: 0.12 });

  // 8:26 The count: the theme again, an octave up on solo violin over the full section, and its only swell.
  progression(m, b, S.count.from, S.cost.to, THEME_SECONDS / 4.8, (t) => 0.24 + 0.16 * within(t, S.count.from + 6, S.count.from + 22, 8), 0.28);
  theme(m, b.violin, S.count.from + 2.6, 0.42, 0.3, { rnd: seeded(15), pan: -0.1, wet: 0.75 });
  theme(m, b.cello, S.count.from + 2.6, 0.38, 0.26, { shift: -12, rnd: seeded(16), pan: 0.15 });

  // 9:04 The field: the last of the strings let go, then only birds. Then a single note under the end card.
  hold(m, b.bass, "D2", S.lastField.from, 7, 0.28, 0.15, 0, 0.5, { attack: 2.4, release: 2.4 });
  m.add(b.piano.play(n("D3"), 5, 0.06, { attack: 0.004, release: 1.5 }), S.end.from + 1.2, 0.44, 0, 0.8);
  m.add(b.piano.play(n("D4"), 5, 0.04, { attack: 0.004, release: 1.5 }), S.end.from + 1.22, 0.28, 0, 0.8);

  // Nothing of the score under close fire.
  const CLOSE: [number, number][] = [[S.fifteen.from, S.fifteen.to], [S.firstShots.from, S.firstShots.to], [S.call.from, S.call.to], [S.oneHour.from, S.oneHour.to], [S.runningOut.from, S.runningOut.to]];
  const under = (t: number) => CLOSE.reduce((g, [a, z]) => g * (1 - within(t, a, z, 0.1) * (a === S.call.from ? 0.75 : 1)), 1);

  // A real room for the score. The effects get a smaller one: outdoors, the land does most of the answering.
  const scoreL = m.wetL.map((x) => x * MUSIC), scoreR = m.wetR.map((x) => x * MUSIC);
  const hallL = convolve(scoreL, hallResponse(3.4, 11)), hallR = convolve(scoreR, hallResponse(3.4, 29));
  const roomL = convolve(fx.wetL, hallResponse(1.1, 13)), roomR = convolve(fx.wetR, hallResponse(1.1, 31));
  const fadeOut = (t: number) => (t < S.end.from ? 1 - sm(S.lastField.to - 2.5, S.lastField.to, t) : 1);
  for (let i = 0; i < m.L.length; i++) {
    const t = i / SR, g = under(t), f = fadeOut(t);
    m.L[i] = ((m.L[i] * MUSIC + hallL[i] * 0.6) * g + fx.L[i] + roomL[i] * 0.5) * f;
    m.R[i] = ((m.R[i] * MUSIC + hallR[i] * 0.6) * g + fx.R[i] + roomR[i] * 0.5) * f;
    m.wetL[i] = 0;
    m.wetR[i] = 0;
  }
  m.L = svf(m.L, 30, 0.7, "high");
  m.R = svf(m.R, 30, 0.7, "high");
  let peak = 0;
  for (let i = 0; i < m.L.length; i++) peak = Math.max(peak, Math.abs(m.L[i]), Math.abs(m.R[i]));
  // Pushed into finish()'s soft clip: the same treatment the test clip's fire measured well with.
  const room = 3.2 / (peak || 1);
  for (let i = 0; i < m.L.length; i++) {
    m.L[i] *= room;
    m.R[i] *= room;
  }
  m.finish(1.5);
  m.write(file);
  console.log(`  wrote ${file}`);
}
