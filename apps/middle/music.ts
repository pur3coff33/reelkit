// The whole soundtrack: one four-note theme (D, E, A, F#: two steps, a leap, a fall) in six versions that slow down and
// sink lower as the film's scale grows: quick high arpeggios for the subatomic, marimba and harp for molecules, near
// silence and a bare piano at the egg, piano and strings for us and Earth, the theme at half speed in the cellos for the
// stars, and the deepest, slowest strings for the cosmos, ending on a suspended chord that leads back to the start.
// Every cut gets a reversed swell, a sub boom and a whoosh; the supernova gets the blast. His voice is mixed in, and the
// music does not dip under him: each act is levelled to the same loudness, measured, so the music holds one level.
import { air, hum, readVoice } from "../../src/kit/music/narration";
import { instrument, type Instrument } from "../../src/kit/music/sampler";
import { blast, boom, shimmer, swell } from "../../src/kit/music/sfx";
import { Session, above, limit, loudnessOf, lufs, parseChord, voice, type Stem } from "../../src/kit/music/studio";
import { SR, writeWav } from "../../src/kit/music/synth";
import { ACTS, CUTS, LINES, SCENES, SECONDS, SPAN, type Act } from "./timeline";

const BAR = 4;
const D4 = 62, MOTIF = [0, 2, 7, 4];

/** Each act's span, from its first scene to its last. */
const ACT_SPAN = Object.fromEntries(ACTS.map((a) => {
  const mine = SCENES.filter((s) => s.act === a);
  return [a, { from: SPAN(mine[0].name).from, to: SPAN(mine[mine.length - 1].name).to }];
})) as Record<Act, { from: number; to: number }>;

/** Each act's chords (a bar each, round and round), how full the strings are, and the range they're voiced in. */
const ACT: Record<Act, { chords: string[]; level: number; lo: number; hi: number }> = {
  subatomic: { chords: ["Dadd9", "Bm9", "Gmaj9", "A9sus4"], level: 0.25, lo: 62, hi: 81 },
  molecules: { chords: ["Gmaj7#11", "Em9", "Bm9", "A9sus4"], level: 0.35, lo: 57, hi: 76 },
  cells: { chords: ["Dadd9", "Gmaj9", "Dadd9", "Gmaj9"], level: 0.4, lo: 55, hi: 74 },
  earth: { chords: ["Bm9", "Gmaj9", "Dadd9", "A9sus4"], level: 0.62, lo: 52, hi: 71 },
  stars: { chords: ["Em9", "Cmaj9", "Gmaj9", "Dadd9/F#"], level: 0.75, lo: 45, hi: 66 },
  cosmic: { chords: ["Gmaj9", "Em9", "Cmaj9", "A9sus4"], level: 0.85, lo: 40, hi: 62 },
};

/** Bar starts inside a span, with the chord for each. */
function bars(a: Act) {
  const { from, to } = ACT_SPAN[a], out: { at: number; len: number; chord: ReturnType<typeof parseChord>; i: number }[] = [];
  for (let at = from, i = 0; at < to - 0.5; at += BAR, i++) {
    const last = a === "cosmic" && at + BAR >= to - 0.5;
    out.push({ at, len: Math.min(BAR, to - at), chord: parseChord(last ? "A9sus4" : ACT[a].chords[i % ACT[a].chords.length]), i });
  }
  return out;
}

type Kit = Record<"upright" | "harp" | "marimba" | "vpizz" | "cpizz" | "violins" | "violas" | "cellos" | "trem" | "contra" | "solo" | "flute", Instrument>;

const egg = SPAN("egg"), eggLine = LINES.find((l) => l.id === "egg1")!.beat;
/** The near silence before the egg: everything except one high note drops away. A handful of keys only: the mixer looks
 * through every key for every sample, so a dense curve takes hours. */
const HUSH: [number, number][] = [[0, 1], [egg.from + 0.3, 1], [egg.from + 1.1, 0.06], [eggLine - 0.2, 0.06], [eggLine + 1.4, 1]];

function compose(s: Session, k: Kit) {
  const stems: Stem[] = [];
  const add = (name: string, spec: ConstructorParameters<typeof Stem>[1], keep = false) => {
    const st = s.stem(name, spec);
    if (!keep) stems.push(st);
    return st;
  };

  const sparkle = add("sparkle", { lufs: -30, low: 300, high: 7000, hall: { seconds: 4.5, mix: 0.5, gap: 0.03 }, echo: { time: 0.375, feedback: 0.45, mix: 0.35 }, loose: { time: 0.01, velocity: 0.12 } });
  const mallets = add("marimba", { lufs: -30, low: 150, high: 6000, hall: { seconds: 4, mix: 0.4, gap: 0.04 }, echo: { time: 0.75, feedback: 0.35, mix: 0.25 }, loose: { time: 0.012, velocity: 0.12 } });
  const harp = add("harp", { lufs: -30, low: 120, high: 5200, hall: { seconds: 5, mix: 0.55, gap: 0.04 }, echo: { time: 0.75, feedback: 0.4, mix: 0.3 }, loose: { time: 0.02, velocity: 0.12 } });
  const piano = add("piano", { lufs: -27, low: 70, high: 4800, hall: { seconds: 5, mix: 0.45, gap: 0.045 }, echo: { time: 1.5, feedback: 0.35, mix: 0.2 }, loose: { time: 0.03, velocity: 0.1 } });
  const pad = add("violas and cellos", { lufs: -28.5, low: 70, high: 3000, hall: { seconds: 5.5, mix: 0.65, gap: 0.02 }, loose: { time: 0.13, velocity: 0.08 } });
  const sky = add("violins", { lufs: -33, low: 200, high: 4200, hall: { seconds: 5.5, mix: 0.8, gap: 0.02 }, loose: { time: 0.13, velocity: 0.08 } });
  const line = add("cello theme", { lufs: -29, low: 70, high: 3400, hall: { seconds: 5, mix: 0.55, gap: 0.03 }, loose: { time: 0.06, velocity: 0.06 } });
  const shiver = add("trembling cellos", { lufs: -34, low: 80, high: 2400, hall: { seconds: 4.5, mix: 0.6, gap: 0.02 }, loose: { time: 0.08, velocity: 0.08 } });
  const low = add("bass", { lufs: -30, high: 900, warmth: 0.5, hall: { seconds: 4, mix: 0.2, gap: 0.02 }, loose: { time: 0.05, velocity: 0.05 } });
  const drone = add("hum", { lufs: -38, high: 700, warmth: 0.4 });
  // The one note held through the hush before the egg: it alone doesn't drop away.
  const held = add("held note", { lufs: -34, low: 300, high: 5000, hall: { seconds: 6, mix: 0.8, gap: 0.02 } }, true);
  const booms = add("booms", { lufs: -27, high: 4000, warmth: 0.3 });
  const breath = add("air", { lufs: -36, low: 250, high: 6000, hall: { seconds: 4, mix: 0.6, gap: 0.02 } });
  const suck = add("swells", { lufs: -31, low: 100, high: 9000 });
  const glints = add("shimmer", { lufs: -39, low: 2500, high: 12000, hall: { seconds: 5, mix: 0.6, gap: 0.02 } });

  const play = (st: Stem, inst: Instrument, n: number, at: number, len: number, v: number, o: Parameters<Stem["note"]>[5] = {}) => st.note(inst, n, at, len, v, o);
  const theme = (st: Stem, inst: Instrument, root: number, at: number, step: number, v: number, o: Parameters<Stem["note"]>[5] = {}, ring = 0.5) =>
    MOTIF.forEach((m, i) => play(st, inst, root + m, at + i * step, step * (i === 3 ? 1.8 : 1) + ring, v * (i === 2 ? 1.12 : 1), o));

  // The string bed, every act, opening chord by chord; fuller and lower as the film grows.
  for (const a of ACTS) {
    let prev: number[] | undefined;
    const { level, lo, hi } = ACT[a];
    for (const b of bars(a)) {
      const v = voice(b.chord, lo, hi, 4, prev);
      prev = v;
      v.forEach((n, j) => play(pad, n < 58 ? k.cellos : k.violas, n, b.at + j * 0.3, b.len + 0.5 - j * 0.15, 0.14 + 0.3 * level, { attack: 1.4, release: 2.4, swell: 0.35, pan: [0.32, 0.12, -0.12, -0.3][j], gain: 0.45 + 0.55 * level }));
      if (level > 0.5) play(low, k.contra, above(b.chord.bass, a === "cosmic" ? 28 : 33), b.at, b.len - 0.2, 0.22 + 0.2 * level, { attack: 0.8, release: 1.6, swell: 0.25 });
    }
  }

  // 1. Subatomic: sixteenths high up, harp and plucked violins turn about, the theme rings out on marimba every other bar.
  for (const b of bars("subatomic")) {
    const notes = [...voice(b.chord, 74, 91, 4), above(b.chord.root, 86)];
    for (let j = 0; j < 32 && j * 0.125 < b.len; j++) {
      const n = notes[[0, 2, 1, 3, 4, 3, 1, 2][j % 8]], t = b.at + j * 0.125, accent = j % 4 === 0 ? 0.1 : 0;
      if (j % 2 === 0) play(harp, k.harp, n, t, 0.6, 0.2 + accent, { attack: 0.003, release: 0.9, pan: -0.4 + (j % 8) * 0.1 });
      else play(sparkle, k.vpizz, n - 12, t, 0.3, 0.22 + accent, { attack: 0.002, release: 0.4, pan: 0.4 - (j % 8) * 0.1 });
    }
    if (b.i % 2 === 1) theme(mallets, k.marimba, D4 + 24, b.at, 0.5, 0.42, { attack: 0.002, release: 1, pan: 0.1 });
  }

  // 2. Molecules: eighths in the middle, marimba and harp; the theme in the harp, a beat a note.
  for (const b of bars("molecules")) {
    const notes = voice(b.chord, 62, 79, 4);
    for (let j = 0; j < 16 && j * 0.25 < b.len; j++) {
      const n = notes[[0, 1, 2, 3, 2, 1][j % 6]], t = b.at + j * 0.25;
      if (j % 2 === 0) play(mallets, k.marimba, n, t, 0.5, 0.3 + (j % 8 === 0 ? 0.1 : 0), { attack: 0.002, release: 0.8, pan: -0.25 });
      else play(harp, k.harp, n + 12, t, 0.6, 0.2, { attack: 0.003, release: 1, pan: 0.3 });
    }
    play(low, k.cpizz, above(b.chord.bass, 38), b.at, 0.8, 0.4, { attack: 0.002, release: 1 });
    if (b.i % 2 === 0) theme(harp, k.harp, D4 + 12, b.at + 0.5, 1, 0.34, { attack: 0.003, release: 2, pan: 0 });
  }

  // 3. Cells: slow harp before the egg (if the act starts earlier); then the hush, one high note, and the theme bare on the piano.
  for (const b of bars("cells").filter((x) => x.at < egg.from)) {
    const notes = voice(b.chord, 60, 76, 4);
    for (let j = 0; j < 4; j++) play(harp, k.harp, notes[j], b.at + j, 2, 0.24, { attack: 0.003, release: 2.2, pan: -0.3 + j * 0.2 });
  }
  play(held, k.violins, 81, egg.from + 0.2, eggLine - egg.from + 4, 0.22, { attack: 1.8, release: 3, swell: 0.3, pan: -0.15 });
  // After the hush has lifted (it's back to full 1.4 s into the line), so the first note isn't swallowed.
  theme(piano, k.upright, D4, eggLine + 1.8, 2, 0.3, { attack: 0.003, release: 2.6, pan: 0.05 }, 2.6);
  theme(piano, k.upright, D4 + 12, eggLine + 10.5, 2, 0.26, { attack: 0.003, release: 2.6, pan: 0.05 }, 2.6);

  // 4. You and Earth: the piano's broken chords on the beat, the theme in the piano over the strings.
  for (const b of bars("earth")) {
    const notes = voice(b.chord, 55, 72, 4);
    for (let j = 0; j < 4 && j < b.len; j++) play(piano, k.upright, notes[[0, 2, 1, 3][j]], b.at + j, 1.4, 0.22 + (j === 0 ? 0.06 : 0), { attack: 0.003, release: 1.8, pan: -0.1 });
    if (b.i % 2 === 1) theme(piano, k.upright, D4 + 12, b.at, 1, 0.32, { attack: 0.003, release: 2, pan: 0.1 }, 1.5);
  }
  for (const b of bars("earth").filter((x) => x.i % 2 === 0)) [above(b.chord.pcs[1], 74), above(b.chord.pcs[2], 79)].forEach((n, j) => play(sky, k.violins, n, b.at + 0.3 + j * 0.5, b.len, 0.24, { attack: 1.7, release: 2.6, swell: 0.4, pan: j ? -0.4 : -0.15 }));

  // 5. Stars: the theme at half speed in the cellos, trembling cellos under the dying star.
  for (const b of bars("stars")) if (b.i % 2 === 0) theme(line, k.cellos, D4 - 12, b.at, 2, 0.38, { attack: 0.35, release: 1.4, swell: 0.3, pan: 0.15 }, 0.4);
  const nova = SPAN("supernova");
  for (const b of bars("stars").filter((x) => x.at >= nova.from - BAR && x.at < nova.to)) [above(b.chord.bass, 43), above(b.chord.pcs[1], 50)].forEach((n, j) => play(shiver, k.trem, n, b.at + j * 0.2, b.len, 0.3, { attack: 1, release: 1.6, swell: 0.4, pan: j ? 0.25 : -0.2 }));

  // 6. Cosmic: the theme slowest and lowest, the violins high above, the piano dropping single low notes.
  for (const b of bars("cosmic")) {
    if (b.i % 4 === 0) theme(line, k.cellos, D4 - 24 + 12, b.at, 4, 0.36, { attack: 0.6, release: 2, swell: 0.35, pan: 0.1 }, 0.6);
    [above(b.chord.pcs[1], 76), above(b.chord.pcs[2], 81), above(b.chord.pcs[3] ?? b.chord.root, 86)].forEach((n, j) => play(sky, k.violins, n, b.at + 0.4 + j * 0.6, b.len, 0.22, { attack: 2, release: 3, swell: 0.4, pan: [-0.4, 0.05, 0.35][j] }));
    play(piano, k.upright, above(b.chord.root, 38), b.at + 2, 3, 0.2, { attack: 0.003, release: 3, pan: -0.05 });
  }
  // The flute takes the theme once, high, as the galaxy turns.
  theme(sky, k.flute, D4 + 12, SPAN("galaxy").from + 1, 1.5, 0.4, { attack: 0.2, release: 0.8, swell: 0.25, pan: 0.2 }, 0.3);

  drone.add([hum(SECONDS, 0.11), hum(SECONDS, -0.13)], 0);

  // ── Effects ──
  // Every change of shape is a merge, not a hit: a soft swell into it and a breath of air across it.
  CUTS.forEach((at, i) => {
    suck.add(swell(2.4, 100 + i), at - 2, 0.6);
    breath.add([air(3.6, 40 + i), air(3.6, 70 + i)], at - 1.8);
  });
  // The one real explosion is the supernova's own, as its star bursts (the shape bursts 0.6 s into the scene).
  booms.add(blast(6, 200), nova.from + 0.6);
  booms.add(boom(2, 300), nova.from + 0.65, 0.9);
  for (const n of ["foam", "end"] as const) {
    const sp = SPAN(n);
    glints.add(shimmer(sp.to - sp.from, 500 + sp.from), sp.from);
  }
  // Into the loop: a swell that peaks on the last frame, as the film starts again.
  suck.add(swell(2.2, 999), SECONDS - 2.2, 1.2);

  for (const st of stems) st.ride(HUSH);
}

export async function writeMusic(file: string) {
  const [upright, harp, marimba, vpizz, cpizz, violins, violas, cellos, trem, contra, solo, flute] = await Promise.all([
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
    instrument("Strings/Solo Violin/Arco Vib"),
    instrument("Woodwinds/Flute/susNV"),
  ]);
  const kit: Kit = { upright, harp, marimba, vpizz, cpizz, violins, violas, cellos, trem, contra, solo, flute };

  // Levelled in parts: each act, except that the cells act is two parts, the mitochondria and the egg (measured once
  // the hush before it has lifted), so neither is set by the other's music.
  const egg = SPAN("egg"), cells = ACT_SPAN.cells;
  const PARTS: { name: string; from: number; to: number; at: [number, number] }[] = ACTS.flatMap((a) => {
    const { from, to } = ACT_SPAN[a];
    if (a !== "cells") return [{ name: a, from, to, at: [from + 0.5, to - 0.5] as [number, number] }];
    return [
      { name: "mitochondria", from, to: egg.from, at: [from + 0.5, egg.from - 0.3] as [number, number] },
      { name: "egg", from: egg.from, to: cells.to, at: [eggLine + 1.7, cells.to - 0.5] as [number, number] },
    ];
  });
  // A part too short to measure (no mitochondria scene in the two-minute cut) is left out.
  PARTS.splice(0, PARTS.length, ...PARTS.filter((p) => p.at[1] - p.at[0] >= 2));
  const measure = (L: Float32Array, R: Float32Array) => PARTS.map((p) => loudnessOf(L, R, ...p.at));

  // The music on its own, then each part brought to the same loudness on the finished mix. (Not on the stems: the mixer
  // sets each stem's loudness after its automation, which would undo it for anything that plays in only one part.)
  const score = new Session(SECONDS, 41);
  compose(score, kit);
  // Only a click-guard at the end: the film loops, and the last line ("From you.") must not sink under a fade.
  const music = score.master({ target: -26, fade: 0.15 }), was = measure(music.L, music.R);
  const goal = was.reduce((n, x) => n + x, 0) / was.length, gain = was.map((x) => 10 ** ((goal - x) / 20));
  for (let i = 0; i < music.L.length; i++) {
    const t = i / SR;
    let g = gain[0];
    PARTS.forEach((p, j) => {
      if (j) g += (gain[j] - g) * Math.min(1, Math.max(0, (t - p.from + 0.75) / 1.5));
    });
    music.L[i] *= g;
    music.R[i] *= g;
  }
  const now = measure(music.L, music.R), spread = Math.max(...now) - Math.min(...now);
  console.log("  music by part as written:", PARTS.map((p, j) => `${p.name} ${was[j].toFixed(1)}`).join(", "));
  console.log("  music by part levelled:  ", PARTS.map((p, j) => `${p.name} ${now[j].toFixed(1)}`).join(", "), `(spread ${spread.toFixed(1)} LU)`);

  // His voice on top, about 10 LU over the music, and nothing turns the music down for it.
  const speech = new Session(SECONDS, 43), him = speech.stem("voice", { lufs: -16.4, low: 75, high: 10500, hall: { seconds: 2.4, mix: 0.14, gap: 0.04 } });
  for (const l of readVoice("middle", LINES)) him.add(l.sound, l.at);
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
