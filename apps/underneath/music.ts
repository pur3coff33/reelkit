// The soundtrack, at 60 BPM in E: one four-note theme (E, F#, G#, C#: three steps up and a leap) that each scene plays
// its own way. The galaxy: high violins and a slow harp, the theme on the flute. The shore: marimba dripping like water
// over low strings. The cells: the harp opening into quick rising arpeggios as the little trees bloom. The deal: piano
// broken chords and plucked cellos. The market: plucked violins counting. The tunnel: harp running up and down at once
// (two rivers) over trembling cellos. The ripple: wider and higher. The hubs: warm piano and strings, and one marimba note
// for each of the nineteen links as it lights. Carbon: the theme slow in the cellos. The story: almost nothing, a bare
// piano and one held note, the strings trembling at the doubt. The end: everything, the theme at half speed, closing on a
// suspended chord that leads back to the first bar, because the film loops. Each scene is levelled to the same loudness
// and the music doesn't dip under the voice (as in apps/middle).
import { air, hum, readVoice } from "../../src/kit/music/narration";
import { instrument, type Instrument } from "../../src/kit/music/sampler";
import { shimmer, swell } from "../../src/kit/music/sfx";
import { Session, above, limit, loudnessOf, lufs, parseChord, voice, type Stem } from "../../src/kit/music/studio";
import { SR, writeWav } from "../../src/kit/music/synth";
import { LAYOUT } from "./layout.gen";
import { CUTS, LINES, SCENES, SECONDS, SPAN, type SceneName } from "./timeline";

const BAR = 4, E4 = 64, MOTIF = [0, 2, 4, 9];

/** Each scene's chords (a bar each, round and round), how full the string bed is, and the range it's voiced in. */
const PART: Record<SceneName, { chords: string[]; level: number; lo: number; hi: number }> = {
  hook: { chords: ["Emaj9", "C#m9", "Amaj9", "B9sus4"], level: 0.3, lo: 64, hi: 83 },
  shore: { chords: ["C#m9", "Amaj7#11", "Emaj9", "B9sus4"], level: 0.35, lo: 52, hi: 71 },
  cells: { chords: ["Amaj9", "C#m9", "Emaj9", "B9sus4"], level: 0.35, lo: 57, hi: 76 },
  deal: { chords: ["Amaj9", "F#m9", "C#m9", "B9sus4"], level: 0.45, lo: 55, hi: 74 },
  market: { chords: ["F#m9", "C#m9", "Amaj9", "B9sus4"], level: 0.45, lo: 55, hi: 74 },
  tunnel: { chords: ["C#m9", "Amaj9", "F#m9", "B9sus4"], level: 0.5, lo: 50, hi: 69 },
  ripple: { chords: ["Amaj9", "Emaj9", "C#m9", "B9sus4"], level: 0.55, lo: 55, hi: 76 },
  hubs: { chords: ["Eadd9", "Amaj9", "C#m9", "B9sus4"], level: 0.62, lo: 52, hi: 71 },
  carbon: { chords: ["C#m9", "Amaj9", "Eadd9", "B9sus4"], level: 0.7, lo: 45, hi: 66 },
  story: { chords: ["Amaj9", "Amaj9", "F#m9", "F#m9"], level: 0.2, lo: 57, hi: 74 },
  end: { chords: ["Emaj9", "C#m9", "Amaj9", "B9sus4"], level: 0.85, lo: 45, hi: 69 },
};

/** Bar starts inside a scene, with the chord for each. The film's last bar is the suspended chord. */
function bars(n: SceneName) {
  const { from, to } = SPAN(n), out: { at: number; len: number; chord: ReturnType<typeof parseChord>; i: number }[] = [];
  for (let at = from, i = 0; at < to - 0.5; at += BAR, i++) {
    const last = n === "end" && at + BAR >= to - 0.5;
    out.push({ at, len: Math.min(BAR, to - at), chord: parseChord(last ? "B9sus4" : PART[n].chords[i % PART[n].chords.length]), i });
  }
  return out;
}

type Kit = Record<"upright" | "harp" | "marimba" | "vpizz" | "cpizz" | "violins" | "violas" | "cellos" | "trem" | "contra" | "flute", Instrument>;

function compose(s: Session, k: Kit) {
  const stems: Stem[] = [];
  const add = (name: string, spec: ConstructorParameters<typeof Stem>[1]) => {
    const st = s.stem(name, spec);
    stems.push(st);
    return st;
  };
  const harp = add("harp", { lufs: -29, low: 120, high: 5200, hall: { seconds: 5, mix: 0.55, gap: 0.04 }, echo: { time: 0.75, feedback: 0.35, mix: 0.25 }, loose: { time: 0.02, velocity: 0.12 } });
  const mallets = add("marimba", { lufs: -30, low: 150, high: 6000, hall: { seconds: 4.5, mix: 0.45, gap: 0.04 }, echo: { time: 0.75, feedback: 0.35, mix: 0.3 }, loose: { time: 0.012, velocity: 0.12 } });
  const pizz = add("pizzicato", { lufs: -31, low: 200, high: 6500, hall: { seconds: 4, mix: 0.45, gap: 0.03 }, loose: { time: 0.012, velocity: 0.12 } });
  const piano = add("piano", { lufs: -27, low: 70, high: 4800, hall: { seconds: 5, mix: 0.45, gap: 0.045 }, echo: { time: 1.5, feedback: 0.3, mix: 0.18 }, loose: { time: 0.03, velocity: 0.1 } });
  const pad = add("violas and cellos", { lufs: -28, low: 70, high: 3000, hall: { seconds: 5.5, mix: 0.65, gap: 0.02 }, loose: { time: 0.13, velocity: 0.08 } });
  const sky = add("violins", { lufs: -32, low: 200, high: 4200, hall: { seconds: 5.5, mix: 0.8, gap: 0.02 }, loose: { time: 0.13, velocity: 0.08 } });
  const line = add("cello theme", { lufs: -29, low: 70, high: 3400, hall: { seconds: 5, mix: 0.55, gap: 0.03 }, loose: { time: 0.06, velocity: 0.06 } });
  const shiver = add("trembling cellos", { lufs: -34, low: 80, high: 2400, hall: { seconds: 4.5, mix: 0.6, gap: 0.02 }, loose: { time: 0.08, velocity: 0.08 } });
  const low = add("bass", { lufs: -30, high: 900, warmth: 0.5, hall: { seconds: 4, mix: 0.2, gap: 0.02 }, loose: { time: 0.05, velocity: 0.05 } });
  const drone = add("hum", { lufs: -38, high: 700, warmth: 0.4 });
  const breath = add("air", { lufs: -36, low: 250, high: 6000, hall: { seconds: 4, mix: 0.6, gap: 0.02 } });
  const suck = add("swells", { lufs: -31, low: 100, high: 9000 });
  const glints = add("shimmer", { lufs: -39, low: 2500, high: 12000, hall: { seconds: 5, mix: 0.6, gap: 0.02 } });

  const play = (st: Stem, inst: Instrument, n: number, at: number, len: number, v: number, o: Parameters<Stem["note"]>[5] = {}) => st.note(inst, n, at, len, v, o);
  const theme = (st: Stem, inst: Instrument, root: number, at: number, step: number, v: number, o: Parameters<Stem["note"]>[5] = {}, ring = 0.5) =>
    MOTIF.forEach((m, i) => play(st, inst, root + m, at + i * step, step * (i === 3 ? 1.8 : 1) + ring, v * (i === 3 ? 1.12 : 1), o));

  // The string bed under every scene, chord by chord, fuller and lower as the film goes on; a contrabass once it's full.
  let prev: number[] | undefined;
  for (const sc of SCENES) {
    const { level, lo, hi } = PART[sc.name];
    for (const b of bars(sc.name)) {
      const v = voice(b.chord, lo, hi, 4, prev);
      prev = v;
      v.forEach((n, j) => play(pad, n < 58 ? k.cellos : k.violas, n, b.at + j * 0.3, b.len + 0.5 - j * 0.15, 0.14 + 0.3 * level, { attack: 1.4, release: 2.4, swell: 0.35, pan: [0.32, 0.12, -0.12, -0.3][j], gain: 0.45 + 0.55 * level }));
      if (level > 0.5) play(low, k.contra, above(b.chord.bass, 28), b.at, b.len - 0.2, 0.22 + 0.2 * level, { attack: 0.8, release: 1.6, swell: 0.25 });
    }
  }

  // The galaxy: violins high above, a slow harp, the theme on the flute.
  for (const b of bars("hook")) {
    const notes = voice(b.chord, 66, 83, 4);
    for (let j = 0; j < 8 && j * 0.5 < b.len; j++) play(harp, k.harp, notes[[0, 1, 2, 3, 2, 1, 2, 3][j]] + (j > 3 ? 12 : 0), b.at + j * 0.5, 1.6, 0.22, { attack: 0.003, release: 2, pan: -0.35 + j * 0.1 });
    [above(b.chord.pcs[1], 76), above(b.chord.pcs[2], 83)].forEach((n, j) => play(sky, k.violins, n, b.at + 0.3 + j * 0.5, b.len, 0.22, { attack: 1.8, release: 2.6, swell: 0.4, pan: j ? -0.4 : 0.3 }));
  }
  theme(sky, k.flute, E4 + 12, SPAN("hook").from + 4, 1, 0.38, { attack: 0.2, release: 0.8, swell: 0.25, pan: 0.15 }, 0.3);

  // The shore: marimba drops, unhurried, like water off a stem.
  for (const b of bars("shore")) {
    const notes = voice(b.chord, 64, 81, 4);
    [0, 1.5, 2.25, 3].forEach((d, j) => d < b.len && play(mallets, k.marimba, notes[(j * 3 + b.i) % 4], b.at + d, 1.2, 0.3 - j * 0.03, { attack: 0.002, release: 1.4, pan: [-0.4, 0.3, -0.1, 0.45][j] }));
  }
  theme(mallets, k.marimba, E4 + 12, LAYOUT.beats.shore2 ?? SPAN("shore").from + 6, 0.75, 0.34, { attack: 0.002, release: 1.4, pan: 0 });

  // The cells: the harp opens into quick rising arpeggios as the little trees bloom; plucked violins sparkle on top.
  for (const b of bars("cells")) {
    const notes = [...voice(b.chord, 60, 77, 4), ...voice(b.chord, 72, 89, 4)];
    const rate = b.i === 0 ? 0.5 : 0.25;
    for (let j = 0; j * rate < b.len; j++) play(harp, k.harp, notes[j % 8], b.at + j * rate, 1, 0.2 + (j % 4 === 0 ? 0.06 : 0), { attack: 0.003, release: 1.4, pan: -0.4 + (j % 8) * 0.1 });
    if (b.i > 0) for (let j = 0; j < 4; j++) play(pizz, k.vpizz, notes[4 + ((j + b.i) % 4)], b.at + j + 0.5, 0.4, 0.24, { attack: 0.002, release: 0.5, pan: 0.4 - j * 0.25 });
  }

  // The deal: piano broken chords on the beat, plucked cellos under them, the theme in the piano.
  for (const b of bars("deal")) {
    const notes = voice(b.chord, 55, 72, 4);
    for (let j = 0; j < 4 && j < b.len; j++) play(piano, k.upright, notes[[0, 2, 1, 3][j]], b.at + j, 1.4, 0.22 + (j === 0 ? 0.06 : 0), { attack: 0.003, release: 1.8, pan: -0.1 });
    play(low, k.cpizz, above(b.chord.bass, 38), b.at, 0.8, 0.4, { attack: 0.002, release: 1 });
    if (b.i === 0) theme(piano, k.upright, E4 + 12, b.at + 0.5, 1, 0.3, { attack: 0.003, release: 2, pan: 0.1 }, 1.5);
  }

  // The market: plucked violins counting in eighths, marimba marking each bar: keeping score.
  for (const b of bars("market")) {
    const notes = voice(b.chord, 67, 84, 4);
    for (let j = 0; j < 8 && j * 0.5 < b.len; j++) play(pizz, k.vpizz, notes[[0, 2, 1, 3, 2, 0, 3, 1][j]], b.at + j * 0.5, 0.35, 0.22 + (j % 2 ? 0 : 0.08), { attack: 0.002, release: 0.4, pan: j % 2 ? 0.35 : -0.35 });
    play(mallets, k.marimba, above(b.chord.root, 64), b.at, 1.5, 0.32, { attack: 0.002, release: 1.6 });
    play(low, k.cpizz, above(b.chord.bass, 38), b.at, 0.8, 0.38, { attack: 0.002, release: 1 });
  }

  // The tunnel: harp running up and down at once, two rivers, over trembling cellos.
  for (const b of bars("tunnel")) {
    const notes = [...voice(b.chord, 60, 77, 4), ...voice(b.chord, 72, 89, 4)];
    for (let j = 0; j * 0.25 < b.len; j++) {
      play(harp, k.harp, notes[j % 8], b.at + j * 0.25, 0.7, 0.18, { attack: 0.003, release: 1, pan: -0.45 });
      if (j % 2) play(mallets, k.marimba, notes[7 - (j % 8)], b.at + j * 0.25, 0.6, 0.16, { attack: 0.002, release: 0.9, pan: 0.45 });
    }
    [above(b.chord.bass, 43), above(b.chord.pcs[1], 50)].forEach((n, j) => play(shiver, k.trem, n, b.at + j * 0.2, b.len, 0.3, { attack: 1, release: 1.6, swell: 0.4, pan: j ? 0.25 : -0.2 }));
  }

  // The ripple: the same running figure, wider and higher, the violins swelling over it.
  for (const b of bars("ripple")) {
    const notes = [...voice(b.chord, 64, 81, 4), ...voice(b.chord, 76, 93, 4)];
    for (let j = 0; j * 0.25 < b.len; j++) play(harp, k.harp, notes[(j * 3) % 8], b.at + j * 0.25, 0.9, 0.17 + 0.05 * Math.sin(j * 0.4), { attack: 0.003, release: 1.2, pan: Math.sin(j * 0.5) * 0.5 });
    [above(b.chord.pcs[1], 74), above(b.chord.pcs[2], 79)].forEach((n, j) => play(sky, k.violins, n, b.at + 0.3 + j * 0.5, b.len, 0.26, { attack: 1.6, release: 2.4, swell: 0.4, pan: j ? -0.4 : 0.3 }));
  }

  // The hubs: warm piano and strings, the theme in the cellos, and a marimba note for each link as it lights.
  for (const b of bars("hubs")) {
    const notes = voice(b.chord, 55, 72, 4);
    for (let j = 0; j < 4 && j < b.len; j++) play(piano, k.upright, notes[[0, 2, 1, 3][j]], b.at + j, 1.6, 0.2, { attack: 0.003, release: 2, pan: -0.1 });
    if (b.i % 2 === 1) theme(line, k.cellos, E4 - 12, b.at, 1, 0.34, { attack: 0.35, release: 1.4, swell: 0.3, pan: 0.15 }, 0.4);
  }
  {
    const count = LAYOUT.beats.hub1 ?? SPAN("hubs").from + 1, countFor = (LAYOUT.seconds.hub1 ?? 4) * 0.85, steps = [0, 2, 4, 7, 9, 11, 12, 14, 16, 19, 21, 23, 24, 26, 28, 31, 33, 35, 36];
    for (let n = 0; n < 19; n++) play(mallets, k.marimba, E4 + steps[n] - 7, count + 0.6 + (n / 19) * countFor, 1.2, 0.2 + 0.006 * n, { attack: 0.002, release: 1.4, pan: Math.sin(n * 1.7) * 0.5 });
  }

  // Carbon: the theme slow and low in the cellos, piano dropping single low notes as the gold pours down.
  for (const b of bars("carbon")) {
    if (b.i === 0) theme(line, k.cellos, E4 - 12, b.at, 2, 0.4, { attack: 0.4, release: 1.6, swell: 0.3, pan: 0.1 }, 0.5);
    voice(b.chord, 48, 72, 4).reverse().forEach((n, j) => play(piano, k.upright, n, b.at + j * 0.75, 2, 0.2, { attack: 0.003, release: 2.4, pan: 0.2 - j * 0.12 }));
  }

  // The story: a bare piano and one held high note; at the doubt, the strings tremble.
  const tale = SPAN("story"), doubt = LAYOUT.beats.tale2 ?? tale.from + 7;
  theme(piano, k.upright, E4, tale.from + 0.8, 2, 0.28, { attack: 0.003, release: 2.6, pan: 0.05 }, 2.6);
  play(sky, k.violins, E4 + 21, tale.from + 0.5, tale.to - tale.from + 0.5, 0.2, { attack: 2, release: 3, swell: 0.3, pan: -0.15 });
  for (const b of bars("story").filter((x) => x.at >= doubt - 2)) [above(b.chord.bass, 45), above(b.chord.pcs[2], 52)].forEach((n, j) => play(shiver, k.trem, n, b.at + j * 0.3, b.len, 0.26, { attack: 1.2, release: 1.6, swell: 0.4, pan: j ? 0.3 : -0.25 }));

  // The end: the theme at half speed in the cellos, violins high above, the harp back, the piano's low notes.
  for (const b of bars("end")) {
    if (b.i % 2 === 0) theme(line, k.cellos, E4 - 12, b.at, 2, 0.38, { attack: 0.5, release: 2, swell: 0.35, pan: 0.1 }, 0.6);
    [above(b.chord.pcs[1], 76), above(b.chord.pcs[2], 81), above(b.chord.pcs[3] ?? b.chord.root, 86)].forEach((n, j) => play(sky, k.violins, n, b.at + 0.4 + j * 0.6, b.len, 0.22, { attack: 2, release: 3, swell: 0.4, pan: [-0.4, 0.05, 0.35][j] }));
    play(piano, k.upright, above(b.chord.root, 40), b.at + 2, 3, 0.2, { attack: 0.003, release: 3, pan: -0.05 });
    const notes = voice(b.chord, 64, 81, 4);
    for (let j = 0; j < 8 && j * 0.5 < b.len; j++) play(harp, k.harp, notes[[0, 1, 2, 3, 2, 1, 2, 3][j]] + (j > 3 ? 12 : 0), b.at + j * 0.5, 1.6, 0.18, { attack: 0.003, release: 2, pan: -0.35 + j * 0.1 });
  }
  theme(sky, k.flute, E4 + 12, (LAYOUT.beats.end3 ?? SECONDS - 8) + 1, 1, 0.36, { attack: 0.2, release: 0.8, swell: 0.25, pan: 0.15 }, 0.3);

  drone.add([hum(SECONDS, 0.11), hum(SECONDS, -0.13)], 0);

  // Every change of shape is a merge: a soft swell into it and a breath of air across it.
  CUTS.forEach((at, i) => {
    suck.add(swell(2.4, 100 + i), at - 2, 0.6);
    breath.add([air(3.6, 40 + i), air(3.6, 70 + i)], at - 1.8);
  });
  for (const n of ["hook", "cells", "end"] as const) {
    const sp = SPAN(n);
    glints.add(shimmer(sp.to - sp.from, 500 + sp.from), sp.from);
  }
  // Into the loop: a swell that peaks on the last frame, as the film starts again.
  suck.add(swell(2.2, 999), SECONDS - 2.2, 1.2);
  return stems;
}

export async function writeMusic(file: string) {
  const [upright, harp, marimba, vpizz, cpizz, violins, violas, cellos, trem, contra, flute] = await Promise.all([
    instrument("Keys/Upright Nr1", /_(pp|mf)_/),
    instrument("Strings/Harp"),
    instrument("Percussion/Marimba"),
    instrument("Strings/Violin Section/Pizz"),
    instrument("Strings/Cello Section/pizzT"),
    instrument("Strings/Violin Section/susVib"),
    instrument("Strings/Viola Section/susvib"),
    instrument("Strings/Cello Section/susvib"),
    instrument("Strings/Cello Section/trem"),
    instrument("Strings/Solo Contrabass/SusNV"),
    instrument("Woodwinds/Flute/susNV"),
  ]);
  const kit: Kit = { upright, harp, marimba, vpizz, cpizz, violins, violas, cellos, trem, contra, flute };

  // Each scene levelled to the same loudness on the finished mix, except the story, which sits 3 dB under: the hush.
  const PARTS = SCENES.map((sc) => ({ name: sc.name, ...SPAN(sc.name), at: [SPAN(sc.name).from + 0.8, SPAN(sc.name).to - 0.8] as [number, number], trim: sc.name === "story" ? -3 : 0 }));
  const measure = (L: Float32Array, R: Float32Array) => PARTS.map((p) => loudnessOf(L, R, ...p.at));

  const score = new Session(SECONDS, 47);
  compose(score, kit);
  const music = score.master({ target: -26, fade: 0.15 }), was = measure(music.L, music.R);
  const goal = was.reduce((n, x) => n + x, 0) / was.length, gain = was.map((x, j) => 10 ** ((goal - x + PARTS[j].trim) / 20));
  for (let i = 0; i < music.L.length; i++) {
    const t = i / SR;
    let g = gain[0];
    PARTS.forEach((p, j) => {
      if (j) g += (gain[j] - g) * Math.min(1, Math.max(0, (t - p.from + 0.75) / 1.5));
    });
    music.L[i] *= g;
    music.R[i] *= g;
  }
  const now = measure(music.L, music.R);
  console.log("  music by scene as written:", PARTS.map((p, j) => `${p.name} ${was[j].toFixed(1)}`).join(", "));
  console.log("  music by scene levelled:  ", PARTS.map((p, j) => `${p.name} ${now[j].toFixed(1)}`).join(", "));

  // His voice on top, about 10 LU over the music; nothing turns the music down for it.
  const speech = new Session(SECONDS, 49), him = speech.stem("voice", { lufs: -16.4, low: 75, high: 10500, hall: { seconds: 2.4, mix: 0.14, gap: 0.04 } });
  for (const l of readVoice("underneath", LINES)) him.add(l.sound, l.at);
  const said = speech.master({ target: -16.4, fade: 0.15 });
  const L = music.L.map((v, i) => v + said.L[i]), R = music.R.map((v, i) => v + said.R[i]);
  const trim = 10 ** ((-16 - lufs(L, R)) / 20);
  for (let i = 0; i < L.length; i++) {
    L[i] *= trim;
    R[i] *= trim;
  }
  const reduced = limit(L, R, 10 ** (-1.5 / 20));
  writeWav(file, L, R);
  console.log(`  voice ${lufs(said.L, said.R).toFixed(1)}, music ${lufs(music.L, music.R).toFixed(1)}, together ${lufs(L, R).toFixed(1)} LUFS, limiter took at most ${reduced.toFixed(1)} dB`);
}
