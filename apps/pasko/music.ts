// The score and the yard's sounds. One carol-like theme in G: FIRST asks (it ends up on A), SECOND answers and comes
// home to G. In 1998 a rondalla plays it: plucked strings in tremolo over a strummed band. Each Christmas after a child
// leaves the theme comes back on fewer instruments, and the table gets quieter: fewer spoons on plates each year, until
// in 2026 there are two. The neighbour's videoke sings the same tune across the road, off-key, as life goes on next door.
// The seven plates play the seven notes of FIRST as Nanay sets them down; the answer stops one note short of home; a
// tricycle comes down the road, the capiz chimes ring, and a tuko calls seven times.
import { instrument, type Instrument } from "../../src/kit/music/sampler";
import { Session, above, loudnessOf, parseChord, seeded, voice, type Stem } from "../../src/kit/music/studio";
import { writeWav } from "../../src/kit/music/synth";
import { bell, birds, chimes, clink, crickets, engine, horn, pop, putt, scrape, tuko, videoke } from "./sounds";
import { FLASH, FREEZE, PLATE_SET, SECONDS } from "./story";

/** The theme in beats: [beat, note, length]. */
type Phrase = [number, string, number][];
const FIRST: Phrase = [[0, "B4", 1.5], [1.5, "C5", 0.5], [2, "D5", 1], [3, "B4", 1], [4, "A4", 1], [5, "G4", 1], [6, "A4", 2]];
const SECOND: Phrase = [[0, "B4", 1], [1, "A4", 1], [2, "G4", 1.5], [3.5, "E4", 0.5], [4, "D4", 1], [5, "E4", 1], [6, "G4", 2]];
const OPENING = FIRST.slice(0, 5);
const oct = (p: Phrase, by: number): Phrase => p.map(([b, n, l]) => [b, n.replace(/\d$/, (d) => String(+d + by)), l]);
const MIDI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiOf = (n: string) => MIDI[n[0]] + (n[1] === "#" ? 1 : 0) + 12 * (+n.slice(-1) + 1);

/** [at, length, chord, how full 0…1, plays: h harp ripple, v high violins, b bass]. */
const PADS: [number, number, string, number, string][] = [
  [0, 2.2, "Em9", 0.3, "b"], [2.2, 2.1, "Cmaj9", 0.38, "b"], [4.3, 1.3, "Dadd9", 0.4, "v"],
  [5.6, 4.0, "Gadd9", 0.45, "b"], [9.6, 1.6, "Cmaj9", 0.6, "hbv"], [11.2, 1.4, "Gadd9", 0.75, "hbv"], [12.6, 1.6, "Dadd9", 0.65, "hbv"],
  [14.2, FLASH - 14.2, "Em9", 0.45, "hb"], [FLASH, FREEZE, "Cmaj9", 0.4, "v"], [FLASH + FREEZE, 17.9 - FLASH - FREEZE, "Dadd9", 0.4, "b"],
  [17.9, 2.5, "Em9", 0.3, "b"], [20.4, 2.8, "Cmaj9", 0.36, "b"],
  [23.2, 2, "Gadd9", 0.42, "b"], [25.2, 2, "Dmaj9/F#", 0.45, "bv"],
  [27.2, 2, "Em9", 0.36, "b"], [29.2, 2, "Cmaj9", 0.36, "b"],
  [31.2, 2, "Am9", 0.3, "b"], [33.2, 2, "D9sus4", 0.3, "b"],
  [35.2, 2, "Cmaj9", 0.24, "b"], [37.2, 1.8, "Em9", 0.22, "b"],
  [39, 1.7, "Am9", 0.4, "b"], [40.7, 1.7, "Cmaj9", 0.55, "bv"], [42.4, 1.6, "D9sus4", 0.6, "bv"],
  [44, 2.5, "Em9", 0.2, "b"], [46.5, 2.4, "Cmaj9", 0.25, "b"], [48.9, 3.6, "Gadd9", 0.3, "b"], [52.5, 2.7, "Cmaj9", 0.35, "b"], [55.2, 2, "Am9", 0.4, "bv"], [57.2, 2.8, "Cmaj9", 0.5, "hbv"],
];
const PAROL_LIT = [8.0, 48.9];
const TOAST = 11.2;
const FIREWORKS = [12.6, 13.1, 13.6, 14.0, 14.4];

export async function writeMusic(file: string) {
  const [upright, harpi, marimba, vpizz, cpizz, bpizz, violins, violas, cellos, contra, violin, flute] = await Promise.all([
    instrument("Keys/Upright Nr1", /_(pp|mf)_/),
    instrument("Strings/Harp"),
    instrument("Percussion/Marimba"),
    instrument("Strings/Violin Section/Pizz"),
    instrument("Strings/Cello Section/pizzT"),
    instrument("Strings/Solo Contrabass/Pizz"),
    instrument("Strings/Violin Section/susVib"),
    instrument("Strings/Viola Section/susvib"),
    instrument("Strings/Cello Section/susvib"),
    instrument("Strings/Solo Contrabass/SusNV"),
    instrument("Strings/Solo Violin/Arco Vib"),
    instrument("Woodwinds/Flute/susNV"),
  ]);
  const s = new Session(SECONDS, 77);
  const hall = (seconds: number, mix: number, gap = 0.03) => ({ seconds, mix, gap });
  const piano = s.stem("piano", { lufs: -20.5, low: 70, high: 5000, hall: hall(4.5, 0.42, 0.045), loose: { time: 0.03, velocity: 0.1 } });
  const harp = s.stem("harp", { lufs: -25.5, low: 110, high: 6500, hall: hall(4.5, 0.5, 0.04), loose: { time: 0.02, velocity: 0.12 } });
  const mallet = s.stem("marimba", { lufs: -24, low: 140, high: 6500, hall: hall(2.2, 0.24), loose: { time: 0.008, velocity: 0.1 } });
  const band = s.stem("rondalla", { lufs: -21, low: 70, high: 5600, hall: hall(2.4, 0.26), loose: { time: 0.01, velocity: 0.12 } });
  const wind = s.stem("flute", { lufs: -24.5, low: 200, high: 5600, hall: hall(4.5, 0.55, 0.035), loose: { time: 0.03, velocity: 0.06 } });
  const solo = s.stem("solo strings", { lufs: -23, low: 90, high: 4600, hall: hall(5, 0.6), loose: { time: 0.05, velocity: 0.06 } });
  const high = s.stem("violins", { lufs: -28, low: 180, high: 4200, hall: hall(5, 0.7, 0.02), loose: { time: 0.12, velocity: 0.08 } });
  const mid = s.stem("violas and cellos", { lufs: -24, low: 90, high: 3200, hall: hall(5, 0.6, 0.02), loose: { time: 0.12, velocity: 0.08 } });
  const low = s.stem("bass", { lufs: -26, high: 900, warmth: 0.5, hall: hall(3.5, 0.2, 0.02), loose: { time: 0.03, velocity: 0.05 } });
  // The yard.
  const night = s.stem("crickets and birds", { lufs: -37, low: 1500 });
  const tableSfx = s.stem("table", { lufs: -33, low: 200, hall: hall(1.2, 0.15) });
  const town = s.stem("bells and fireworks", { lufs: -31, hall: hall(3, 0.35) });
  const neighbour = s.stem("videoke", { lufs: -34, hall: hall(1.5, 0.3) });
  const road = s.stem("jeepney and tricycle", { lufs: -30 });
  const shells = s.stem("capiz chimes", { lufs: -33, hall: hall(2, 0.3) });
  const gecko = s.stem("tuko", { lufs: -33, hall: hall(1.5, 0.25) });

  type Touch = { ring?: number; attack?: number; release?: number; pan?: number; swell?: number };
  const sing = (p: Phrase, at: number, beat: number, inst: Instrument, stem: Stem, v: number, o: Touch = {}) =>
    p.forEach(([b, n, l]) => stem.note(inst, n, at + b * beat, l * beat + (o.ring ?? 0), v * (b % 2 === 0 ? 1.06 : 0.94) * (l >= 1.5 ? 1.05 : 1), { attack: o.attack ?? 0.003, release: o.release ?? 1.8, pan: o.pan ?? 0, swell: o.swell }));
  const onPiano = (p: Phrase, at: number, beat: number, v: number) => sing(p, at, beat, upright, piano, v, { ring: 2, release: 2, pan: 0.05 });
  const onFlute = (p: Phrase, at: number, beat: number, v: number) => sing(p, at, beat, flute, wind, v, { ring: 0.1, attack: 0.12, release: 0.5, pan: 0.18, swell: 0.2 });
  const onViolin = (p: Phrase, at: number, beat: number, v: number) => sing(p, at, beat, violin, solo, v, { ring: 0.15, attack: 0.14, release: 0.7, pan: -0.15, swell: 0.22 });
  const onCello = (p: Phrase, at: number, beat: number, v: number) => sing(oct(p, -1), at, beat, cellos, solo, v, { ring: 0.2, attack: 0.3, release: 1.1, pan: 0.22, swell: 0.25 });
  /** Bandurria-style tremolo: each note picked over and over, fast, on plucked violins. */
  const tremolo = (p: Phrase, at: number, beat: number, v: number) =>
    p.forEach(([b, n, l]) => {
      const from = at + b * beat, len = l * beat;
      for (let k = 0; from + k * 0.075 < from + len - 0.03; k++) band.note(vpizz, n, from + k * 0.075, 0.25, v * (k === 0 ? 1.15 : 0.62 + 0.1 * Math.sin(k)), { attack: 0.002, release: 0.18, pan: -0.12 });
    });
  const gliss = (from: number, notes: number[], gap: number, v: number) => notes.forEach((n, k) => harp.note(harpi, n, from + k * gap, 2, v, { attack: 0.003, release: 1.6, pan: -0.3 + (k / notes.length) * 0.6 }));

  mid.ride([[0, 1], [5.4, 1], [6, 0.85], [17.8, 0.85], [18.4, 1], [33, 1], [35, 0.8], [38.5, 1.1], [43.5, 1.1], [44.5, 0.8], [48, 0.9], [60, 0.9]]);

  let prev: number[] | undefined;
  PADS.forEach(([at, len, name, level, plays], i) => {
    const c = parseChord(name), v = voice(c, 52, 71, 4, prev);
    prev = v;
    if (plays.includes("b")) low.note(contra, above(c.bass, 31), at, len, 0.24 + 0.16 * level, { attack: 0.5, release: 1.4, swell: 0.2 });
    v.forEach((n, k) => mid.note(n < 60 ? cellos : violas, n, at + k * 0.16, Math.max(1, len + 0.3 - k * 0.12), 0.14 + 0.28 * level, { attack: 1, release: 2, swell: 0.28, pan: [0.32, 0.14, -0.14, -0.3][k], gain: 0.45 + 0.55 * level }));
    if (plays.includes("v")) [above(c.pcs[1], 74), above(c.pcs[2], 78)].forEach((n, k) => high.note(violins, n, at + 0.2 + k * 0.4, len, 0.26 + 0.1 * level, { attack: 1.2, release: 2.2, swell: 0.35, pan: k ? -0.4 : -0.15 }));
    if (plays.includes("h")) {
      const steps = [...voice(c, 50, 69, 4), ...voice(c, 66, 83, 3)], shape = i % 2 ? [0, 2, 1, 3, 4, 3, 5, 4] : [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < Math.max(2, Math.round(len / 0.42)); k++) harp.note(harpi, steps[Math.min(shape[k % 8], steps.length - 1)], at + k * 0.42, 2.4, 0.3 - 0.01 * (k % 8), { attack: 0.004, release: 1.6, pan: -0.3 + shape[k % 8] * 0.09 });
    }
  });

  // 0:00 2026, the title: the theme on the piano, slow, ending on its question; a harp note for each letter lit.
  const LETTERS = ["D5", "E5", "G5", "A5", "B5", "E5", "G5", "A5", "B5", "D6", "E6"];
  onPiano(FIRST, 0.3, 0.52, 0.32);
  LETTERS.forEach((n, i) => harp.note(harpi, n, 0.6 + (i + 0.5) * (2.6 / 11), 2, 0.26 + 0.01 * i, { attack: 0.003, release: 1.6, pan: -0.25 + i * 0.05 }));
  // Into the bulbs' glow and back to 1998: a harp sweep up.
  gliss(4.3, [62, 66, 67, 69, 71, 74, 78, 79, 81, 83, 86], 0.07, 0.34);

  // 0:05 1998: the rondalla, strummed eight to a bar.
  const strum = (from: number, to: number, beat: number, chords: string[], v: number) => {
    for (let t = from, i = 0; t < to - 0.01; t += beat, i++) {
      if (t >= FLASH - 0.05 && t < FLASH + FREEZE) continue;
      const c = parseChord(chords[Math.floor(i / 4) % chords.length]), accent = Math.abs(t - TOAST) < 0.2 ? 1.4 : 1;
      if (i % 2 === 0) band.note(i % 4 === 0 ? bpizz : cpizz, above(i % 4 === 0 ? c.bass : (c.root + 7) % 12, 38), t, 0.9, (v + 0.12) * accent, { attack: 0.002, release: 0.5, pan: 0.15 });
      else c.pcs.slice(0, 3).forEach((pc, k) => band.note(vpizz, above(pc, 64), t + k * 0.012, 0.45, v * accent, { attack: 0.002, release: 0.3, pan: 0.05 + k * 0.12 }));
    }
  };
  strum(5.4, 9.6, 0.42, ["G", "Em7", "C", "D"], 0.3);
  strum(9.6, FLASH, 0.42, ["C", "D", "G", "Em7"], 0.36);
  strum(FLASH + FREEZE, 17.9, 0.42, ["D"], 0.24);
  sing(oct(OPENING, 1), 5.8, 0.42, marimba, mallet, 0.42, { release: 0.6 });
  for (const at of PAROL_LIT) ["D5", "G5"].forEach((n, k) => harp.note(harpi, n, at + k * 0.3, 3, 0.48, { attack: 0.003, release: 2.4, pan: 0.15 }));
  tremolo(FIRST, 9.6, 0.42, 0.5);
  tremolo(SECOND, 12.96, 0.42, 0.5);
  sing(oct(FIRST, 1), 9.6, 0.42, marimba, mallet, 0.26, { release: 0.6 });
  // The toast: everyone up, a sweep up the harp.
  gliss(TOAST - 0.15, [67, 71, 74, 79, 83, 86, 91], 0.05, 0.36);
  for (const at of FIREWORKS) [79, 83, 86, 91].forEach((n, k) => harp.note(harpi, n, at + 0.08 + k * 0.04, 1.2, 0.22, { attack: 0.003, release: 1, pan: 0.3 - k * 0.15 }));
  ["G5", "B5", "D6", "F#6"].forEach((n, k) => harp.note(harpi, n, FLASH + k * 0.02, 2.2, 0.36, { attack: 0.002, release: 1.8, pan: -0.2 + k * 0.13 }));

  // 0:18 Ate leaves: a solo violin, at dawn.
  onViolin(FIRST, 18.4, 0.5, 0.46);
  // 0:23 Christmas after Christmas, round the table, fewer each time.
  onPiano(FIRST, 23.5, 0.48, 0.27);
  for (const [k, n] of ["G5", "B5", "D6"].entries()) mallet.note(marimba, n, 25.5 + k * 0.12, 0.5, 0.36, { attack: 0.002, release: 0.5, pan: -0.2 });
  onPiano(SECOND, 27.5, 0.48, 0.25);
  onFlute(FIRST, 31.5, 0.48, 0.3);
  onPiano(OPENING, 35.5, 0.62, 0.21);
  solo.note(cellos, "G3", 37.5, 2, 0.34, { attack: 0.4, release: 1.4, pan: 0.2 });
  // 0:39 Bunso, the last: the cello, the violins above.
  onCello(FIRST, 39.3, 0.55, 0.48);
  sing(oct(FIRST, 1), 40.4, 0.5, violins, high, 0.3, { ring: 0.3, attack: 0.3, release: 1, pan: -0.25, swell: 0.25 });

  // 0:48 2026. The parol (above). Each plate is one note of the theme.
  const order = PLATE_SET.slice().sort((a, b) => a - b);
  order.forEach((at, i) => piano.note(upright, FIRST[i][1], at, (i < 6 ? order[i + 1] - at : 2.5) + 1.6, 0.24 + (i === 2 ? 0.03 : 0), { attack: 0.003, release: 2, pan: 0.05 }));
  // Their hands: the answer, one note short of home.
  onPiano(SECOND.slice(0, 6), 53.5, 0.5, 0.25);
  // The sign lights again, quicker, softer.
  LETTERS.forEach((n, i) => harp.note(harpi, n, 55.7 + (i + 0.5) * (1.6 / 11), 1.8, 0.2, { attack: 0.003, release: 1.4, pan: -0.25 + i * 0.05 }));
  // 0:58 A light on the road: the question note, high, and nothing after it.
  piano.note(upright, "A5", 58.3, 3, 0.26, { attack: 0.003, release: 2.4, pan: 0.1 });
  harp.note(harpi, "A6", 58.32, 2.5, 0.2, { attack: 0.003, release: 2, pan: -0.2 });

  // ── The yard ──
  // Crickets every night; birds at the two dawns.
  night.add([crickets(SECONDS, 3), crickets(SECONDS, 4)], 0);
  night.ride([[0, 1], [4.3, 1], [5.6, 0.12], [9.0, 0.35], [17.6, 0.35], [18.2, 0], [23.2, 0], [24.2, 1], [38.6, 1], [39.4, 0], [44.5, 0], [48, 0.35], [50.5, 1], [60, 1]]);
  night.add([birds(5.4, 5), birds(5.4, 6)], 17.9, 1.4);
  night.add([birds(5.6, 7), birds(5.6, 8)], 39.0, 1.4);
  // The table: lots of spoons in 1998, fewer each year, two in 2026.
  const rnd = seeded(91);
  const spoons = (from: number, to: number, perSecond: number, gain = 1) => {
    for (let t = from; t < to; t += (0.4 + rnd() * 1.2) / perSecond) tableSfx.add(clink(Math.floor(rnd() * 1e6)), t, gain * (0.6 + 0.4 * rnd()), rnd() * 1.2 - 0.6);
  };
  spoons(9.8, 10.9, 5);
  spoons(12.4, 13.8, 5);
  spoons(23.6, 27.4, 3.2);
  spoons(27.4, 31.4, 2.4, 0.9);
  spoons(31.4, 35.4, 1.5, 0.85);
  spoons(35.4, 37.0, 1.0, 0.8);
  tableSfx.add(clink(7), 54.4, 0.8, -0.1);
  tableSfx.add(clink(8), 55.6, 0.7, 0.15);
  // Chairs on the tiles: everyone up for the toast and down again; in 2026 two chairs.
  for (let k = 0; k < 6; k++) tableSfx.add(scrape(20 + k), 10.85 + k * 0.05, 0.7, -0.5 + k * 0.2);
  for (let k = 0; k < 6; k++) tableSfx.add(scrape(30 + k), 12.15 + k * 0.06, 0.6, -0.5 + k * 0.2);
  tableSfx.add(scrape(41), 52.2, 0.8, 0.1);
  tableSfx.add(scrape(42), 52.95, 0.8, -0.2);
  // Church bells for midnight in 1998; the same bells in 2026, further off.
  for (const [k, at] of [11.3, 12.3, 13.3].entries()) town.add(bell(k === 1 ? 247 : 196), at, 0.8, 0.35);
  for (const at of [54.2, 55.5]) town.add(bell(196, 4), at, 0.35, 0.4);
  for (const [k, at] of FIREWORKS.entries()) town.add(pop(50 + k), at + 0.25, 0.7, (k % 2 ? 0.4 : -0.3));
  town.add(pop(60), 56.0, 0.25, 0.5);
  // The neighbour's videoke: singing along with the piano in 2009; the answer, slower, as the old couple stand at the gate.
  const toKaraoke = (p: Phrase, at: number, beat: number): [number, number, number][] => p.map(([b, n, l]) => [at + b * beat, midiOf(n), l * beat * 0.95]);
  const chordsFor = (at: number, beat: number): [number, number[], number][] => [[0, [55, 59, 62]], [2, [52, 55, 59]], [4, [48, 52, 55]], [6, [50, 54, 57]]].map(([b, ns]) => [at + (b as number) * beat, ns as number[], 2 * beat]);
  neighbour.add(videoke(4.4, 12, toKaraoke(SECOND, 0.1, 0.48), chordsFor(0.1, 0.48)), 27.4, 0.7, 0.6);
  neighbour.add(videoke(5, 13, toKaraoke(SECOND, 0.2, 0.58), chordsFor(0.2, 0.58)), 44.2, 1, 0.55);
  // The jeepney: idling, a horn, pulling away left. Bunso's tricycle going; and in 2026 one coming.
  road.add(engine(4.6, 70, 1.9), 20.4, 1, 0.1);
  road.add(horn(), 21.95, 0.9, 0);
  road.add(putt(3.4, 71, (t) => Math.min(1, t / 0.3) * Math.exp(-Math.max(0, t - 1.0) * 1.1)), 42.6, 1, -0.2);
  road.add(putt(3.6, 72, (t) => 0.15 + 0.85 * Math.min(1, t / 3.2) ** 1.6), 56.6, 0.8, -0.6);
  // The capiz chimes by the door: each time the gate opens, and once more when the light comes down the road.
  for (const at of [20.3, 42.6]) shells.add(chimes(2.5, Math.round(at)), at, 1, -0.3);
  shells.add(chimes(3, 99, 18), 58.3, 1, -0.4);
  // The tuko, seven times, under the last minute's quiet.
  for (let k = 0; k < 7; k++) gecko.add(tuko(), 52.5 + k * 0.92, 0.85 + 0.04 * k, 0.55);

  const out = s.master({ target: -16, fade: 0.9 });
  writeWav(file, out.L, out.R);
  console.log(`  ${out.loudness.toFixed(1)} LUFS, limiter took at most ${out.reduced.toFixed(1)} dB`);
  for (let t = 0; t < SECONDS; t += 2) console.log(`  ${String(t).padStart(3)} s  ${loudnessOf(out.L, out.R, t, t + 2).toFixed(1)} LUFS`);
}
