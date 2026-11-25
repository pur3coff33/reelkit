// The score. One theme that always stops one note short of home: it breaks off on E until he has switched the light off
// and gone in, and only then lands on D. The lamp has its own two harp notes (A up to D), heard each time it comes on, and
// played backwards when he switches it off. Each chapter has its own colour: piano (night), pizzicato and marimba (the
// puppy, the sheet), trembling cellos (the storm), solo violin (the calling), everything (the years), cello (the old dog hearing the light).
import { instrument, type Instrument } from "../../src/kit/music/sampler";
import { Session, above, loudnessOf, parseChord, seeded, voice, type Stem } from "../../src/kit/music/studio";
import { SR, svf, writeWav } from "../../src/kit/music/synth";
import { thunder } from "../../src/kit/whatif/campsound";
import { LAMP_LIT, LAMP_OFF, LIGHTNING, SECONDS } from "./story";

/** The theme in beats: [beat, note, length]. FIRST is the question; SECOND falls towards home, and HOME is its last note. */
type Phrase = [number, string, number][];
const FIRST: Phrase = [[0, "A4", 1.4], [1.5, "B4", 0.5], [2, "A4", 1], [3, "F#4", 1], [4, "E4", 1], [5, "F#4", 1], [6, "C#5", 2]];
const SECOND: Phrase = [[0, "B4", 1], [1, "C#5", 1], [2, "A4", 1.8], [4, "G4", 1], [5, "F#4", 1], [6, "E4", 2]];
const HOME = "D4";
const OPENING: Phrase = FIRST.slice(0, 5);
const oct = (p: Phrase, by: number): Phrase => p.map(([b, n, l]) => [b, n.replace(/\d$/, (d) => String(+d + by)), l]);

/** [at, length, chord, how full 0…1, plays: h harp ripple, v high violins, b bass]. */
const PADS: [number, number, string, number, string][] = [
  // The hook.
  [0, 3, "Bm9", 0.3, "b"], [3, 3, "Gmaj9", 0.4, "b"],
  // The swing (joy and the sheet have their own plucked band).
  [14, 3, "Gmaj9", 0.35, "b"], [17, 3, "Dadd9", 0.45, "bv"],
  // Searching; then the warm house over the hill; then the morning after.
  [40, 2.7, "Bm9", 0.3, "b"], [42.7, 2.7, "Em9", 0.3, "b"], [45.4, 3.6, "Gmaj9", 0.4, "hb"], [49, 3, "Bm9", 0.22, ""],
  // The first night of the light.
  [52, 1.5, "Em9", 0.25, "b"], [53.5, 1.5, "A9sus4", 0.35, "b"], [55, 2.5, "Dadd9", 0.6, "hbv"], [57.5, 2.5, "Gmaj9", 0.65, "hbv"],
  // The years, a day to a bar.
  [60, 4, "Dadd9", 0.55, "hb"], [64, 4, "Gmaj9", 0.65, "hbv"], [68, 4, "Bm9", 0.35, "b"], [72, 4, "Gmaj9", 0.75, "hbv"], [76, 4, "Dmaj9/F#", 0.9, "hbv"], [80, 4, "A9sus4", 0.6, "hb"],
  // Her old dog, at dusk.
  [84, 4, "Bm9", 0.28, "b"], [88, 4, "Gmaj9", 0.32, "b"],
  // Old together; then alone.
  [92, 3.6, "Gmaj9", 0.4, "b"], [95.6, 4.4, "Bm9", 0.18, ""],
  // The last evening.
  [100, 2, "Gmaj9", 0.45, "b"], [102, 2, "Dmaj9/F#", 0.55, "bv"], [104, 2.1, "A9sus4", 0.6, "bv"], [109.6, 3.4, "Dadd9", 0.4, "b"],
  // Dawn.
  [113, 2.4, "Gmaj9", 0.5, "hbv"], [115.4, 2.2, "A9sus4", 0.6, "hbv"], [117.6, 2.4, "Dadd9", 0.65, "hbv"],
];

/** Rain: a hiss and a soft patter, easing off after the first 15 s. */
function rain(seconds: number, seed: number) {
  const rnd = seeded(seed);
  const raw = Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => {
    const t = i / SR, edge = Math.min(1, t / 0.5, (seconds - t) / 2.5), drop = rnd() < 0.002 ? 3 : 1;
    return (rnd() * 2 - 1) * Math.max(0, edge) * (t > 15 ? 0.6 : 1) * drop;
  });
  return svf(svf(raw, 4200, 0.6, "low"), 500, 0.6, "high");
}

export async function writeMusic(file: string) {
  const [upright, harpi, marimba, vpizz, cpizz, bpizz, violins, violas, cellos, trem, contra, violin, flute] = await Promise.all([
    instrument("Keys/Upright Nr1", /_(pp|mf)_/),
    instrument("Strings/Harp"),
    instrument("Percussion/Marimba"),
    instrument("Strings/Violin Section/Pizz"),
    instrument("Strings/Cello Section/pizzT"),
    instrument("Strings/Solo Contrabass/Pizz"),
    instrument("Strings/Violin Section/susVib"),
    instrument("Strings/Viola Section/susvib"),
    instrument("Strings/Cello Section/susvib"),
    instrument("Strings/Cello Section/trem"),
    instrument("Strings/Solo Contrabass/SusNV"),
    instrument("Strings/Solo Violin/Arco Vib"),
    instrument("Woodwinds/Flute/susNV"),
  ]);
  const s = new Session(SECONDS, 41);
  const hall = (seconds: number, mix: number, gap = 0.03) => ({ seconds, mix, gap });
  const piano = s.stem("piano", { lufs: -20.5, low: 70, high: 5000, hall: hall(4.5, 0.42, 0.045), loose: { time: 0.03, velocity: 0.1 } });
  const harp = s.stem("harp", { lufs: -26, low: 110, high: 6500, hall: hall(4.5, 0.5, 0.04), loose: { time: 0.02, velocity: 0.12 } });
  const mallet = s.stem("marimba", { lufs: -23, low: 140, high: 6500, hall: hall(2.2, 0.22), loose: { time: 0.008, velocity: 0.1 } });
  const pluck = s.stem("pizzicato", { lufs: -23, low: 70, high: 5200, hall: hall(2.4, 0.28), loose: { time: 0.012, velocity: 0.1 } });
  const wind = s.stem("flute", { lufs: -25, low: 200, high: 5600, hall: hall(4.5, 0.55, 0.035), loose: { time: 0.03, velocity: 0.06 } });
  const solo = s.stem("solo strings", { lufs: -23.5, low: 110, high: 4600, hall: hall(5, 0.6), loose: { time: 0.05, velocity: 0.06 } });
  const high = s.stem("violins", { lufs: -28, low: 180, high: 4200, hall: hall(5, 0.7, 0.02), loose: { time: 0.12, velocity: 0.08 } });
  const mid = s.stem("violas and cellos", { lufs: -23.5, low: 90, high: 3200, hall: hall(5, 0.6, 0.02), loose: { time: 0.12, velocity: 0.08 } });
  const low = s.stem("bass", { lufs: -26, high: 900, warmth: 0.5, hall: hall(3.5, 0.2, 0.02), loose: { time: 0.03, velocity: 0.05 } });
  const shiver = s.stem("trembling cellos", { lufs: -22, low: 70, high: 2600, hall: hall(3.5, 0.45, 0.02), loose: { time: 0.06, velocity: 0.08 } });
  const weather = s.stem("rain", { lufs: -32 });
  const sky = s.stem("thunder", { lufs: -23.5 });

  type Touch = { ring?: number; attack?: number; release?: number; pan?: number; swell?: number };
  const sing = (p: Phrase, at: number, beat: number, inst: Instrument, stem: Stem, v: number, o: Touch = {}) =>
    p.forEach(([b, n, l]) => stem.note(inst, n, at + b * beat, l * beat + (o.ring ?? 0), v * (b % 2 === 0 ? 1.06 : 0.94), { attack: o.attack ?? 0.003, release: o.release ?? 1.8, pan: o.pan ?? 0, swell: o.swell }));
  const onPiano = (p: Phrase, at: number, beat: number, v: number) => sing(p, at, beat, upright, piano, v, { ring: 2, release: 2, pan: 0.05 });
  const onFlute = (p: Phrase, at: number, beat: number, v: number) => sing(p, at, beat, flute, wind, v, { ring: 0.1, attack: 0.12, release: 0.5, pan: 0.18, swell: 0.2 });
  const onViolin = (p: Phrase, at: number, beat: number, v: number) => sing(p, at, beat, violin, solo, v, { ring: 0.15, attack: 0.14, release: 0.7, pan: -0.15, swell: 0.22 });
  const onCello = (p: Phrase, at: number, beat: number, v: number) => sing(oct(p, -1), at, beat, cellos, solo, v, { ring: 0.2, attack: 0.3, release: 1.1, pan: 0.22, swell: 0.25 });

  // The years are full enough as written: the bed leans back there.
  mid.ride([[0, 1], [59, 1], [61, 0.72], [83, 0.72], [86, 0.9], [120, 0.9]]);
  low.ride([[0, 1], [59, 1], [61, 0.75], [83, 0.75], [86, 0.9], [120, 0.9]]);
  high.ride([[0, 1], [74, 1], [76, 0.7], [82, 0.7], [86, 1], [120, 1]]);

  // The bed of strings, the harp's ripples, the bass.
  let prev: number[] | undefined;
  PADS.forEach(([at, len, name, level, plays], i) => {
    const c = parseChord(name), v = voice(c, 52, 71, 4, prev);
    prev = v;
    if (plays.includes("b")) low.note(contra, above(c.bass, 33), at, len, 0.24 + 0.16 * level, { attack: 0.5, release: 1.4, swell: 0.2 });
    v.forEach((n, k) => mid.note(n < 60 ? cellos : violas, n, at + k * 0.16, Math.max(1, len + 0.3 - k * 0.12), 0.14 + 0.28 * level, { attack: 1, release: 2, swell: 0.28, pan: [0.32, 0.14, -0.14, -0.3][k], gain: 0.45 + 0.55 * level }));
    if (plays.includes("v")) [above(c.pcs[1], 74), above(c.pcs[2], 78)].forEach((n, k) => high.note(violins, n, at + 0.2 + k * 0.4, len, 0.26 + 0.1 * level, { attack: 1.3, release: 2.2, swell: 0.35, pan: k ? -0.4 : -0.15 }));
    if (plays.includes("h")) {
      const steps = [...voice(c, 50, 69, 4), ...voice(c, 66, 83, 3)], shape = i % 2 ? [0, 2, 1, 3, 4, 3, 5, 4] : [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < Math.max(2, Math.round(len / 0.5)); k++) harp.note(harpi, steps[Math.min(shape[k % 8], steps.length - 1)], at + k * 0.5, 2.6, 0.34 - 0.012 * (k % 8), { attack: 0.004, release: 1.7, pan: -0.3 + shape[k % 8] * 0.09 });
    }
  });

  // The lamp's two notes: up when it comes on, down when he switches it off.
  for (const at of LAMP_LIT) ["A5", "D6"].forEach((n, k) => harp.note(harpi, n, at + k * 0.34, 3, 0.5, { attack: 0.003, release: 2.4, pan: 0.15 }));
  ["D6", "A5"].forEach((n, k) => harp.note(harpi, n, LAMP_OFF + k * 0.5, 3.5, 0.46, { attack: 0.003, release: 2.8, pan: 0.15 }));

  // 0:00 The hook: the theme, as far as it ever gets.
  onPiano(OPENING, 0.7, 0.85, 0.34);

  // 0:06 The puppy: a plucked band, two and a half beats a second.
  const band = (from: number, to: number, beat: number, chords: string[], v: number) => {
    for (let t = from, i = 0; t < to - 0.01; t += beat, i++) {
      const c = parseChord(chords[Math.floor(i / 4) % chords.length]);
      if (i % 2 === 0) pluck.note(i % 4 === 0 ? bpizz : cpizz, above(i % 4 === 0 ? c.bass : (c.root + 7) % 12, 38), t, 0.9, v + 0.12, { attack: 0.002, release: 0.5, pan: 0.1 });
      else c.pcs.slice(0, 3).forEach((pc, k) => pluck.note(vpizz, above(pc, 66), t + k * 0.008, 0.5, v, { attack: 0.002, release: 0.3, pan: -0.3 + k * 0.15 }));
    }
  };
  band(6.4, 14, 0.4, ["D", "G", "Bm7", "A"], 0.34);
  band(14, 19.8, 0.4, ["G", "D", "Em7", "A"], 0.28);
  // It jumps out of the crate.
  for (let k = 0; k < 9; k++) harp.note(harpi, [62, 64, 66, 69, 71, 74, 76, 78, 81][k], 8.55 + k * 0.05, 1.6, 0.42, { attack: 0.003, release: 1.4, pan: -0.3 + k * 0.07 });
  sing(oct(FIRST, 1), 9.6, 0.4, marimba, mallet, 0.5, { release: 0.6 });
  sing(oct(SECOND, 1), 12.8, 0.4, marimba, mallet, 0.5, { release: 0.6 });
  onFlute(oct(FIRST, 1), 16.8, 0.4, 0.46);

  // 0:20 The sheet: tiptoe, the snatch, the chase, the bump, a giggle.
  for (let t = 20.3, i = 0; t < 22.2; t += 0.3, i++) pluck.note(bpizz, ["D2", "F2", "E2", "G2", "F2", "A2", "G#2"][i % 7], t, 0.5, 0.36 + i * 0.02, { attack: 0.002, release: 0.25 });
  ["D4", "F#4", "A4", "D5"].forEach((n, k) => pluck.note(vpizz, n, 22.32 + k * 0.01, 0.6, 0.75, { attack: 0.002, release: 0.3, pan: -0.2 + k * 0.12 }));
  const RUN = ["D5", "E5", "F#5", "G5", "A5", "G5", "F#5", "E5", "D5", "C#5", "B4", "C#5", "D5", "F#5", "A5", "F#5"];
  for (let t = 22.6, i = 0; t < 27.5; t += 0.17, i++) {
    mallet.note(marimba, RUN[i % 16], t, 0.4, i % 4 === 0 ? 0.52 : 0.4, { attack: 0.002, release: 0.4, pan: 0.2 });
    if (i % 2 === 0) pluck.note(i % 4 === 0 ? bpizz : cpizz, ["D2", "A2", "G2", "A2"][(i >> 3) % 4], t, 0.5, 0.48, { attack: 0.002, release: 0.3 });
  }
  ["D2", "G#2"].forEach((n) => pluck.note(bpizz, n, 27.62, 0.8, 0.85, { attack: 0.002, release: 0.4 }));
  [81, 78, 76, 74, 71, 69, 66, 62].forEach((n, k) => harp.note(harpi, n, 28.12 + k * 0.05, 1.2, 0.4, { attack: 0.003, release: 1 }));
  for (const [t, n] of [[28.8, "A5"], [28.95, "F#5"], [29.1, "A5"], [29.4, "D6"]] as [number, string][]) mallet.note(marimba, n, t, 0.4, 0.46, { attack: 0.002, release: 0.5 });

  // 0:30 The storm. The light comes first, the sound a moment after.
  weather.add([rain(19.6, 5), rain(19.6, 6)], 30);
  LIGHTNING.forEach((at, i) => sky.add(thunder(4.5, 20 + i, i === 1 ? 1 : 0.55), at + (i === 1 ? 0.06 : 0.3), i === 1 ? 1 : 0.8, i % 2 ? 0.3 : -0.3));
  [["D2", "A2"], ["D2", "F3"]].forEach((pair, i) => pair.forEach((n, k) => shiver.note(trem, n, 30 + i * 2, 2.3, 0.3 + 0.08 * i, { attack: 0.7, release: 0.6, pan: k ? 0.25 : -0.2 })));
  // It runs: plucked cellos galloping, the tremolo climbing under them.
  ["D3", "E3", "F3", "G3", "A3", "A#3", "C4"].forEach((n, i) => shiver.note(trem, n, 34.1 + i * 0.5, 0.7, 0.4 + 0.06 * i, { attack: 0.08, release: 0.3, pan: -0.1 }));
  for (let t = 34.1, i = 0; t < 37.5; t += 0.2, i++) pluck.note(i % 2 ? cpizz : bpizz, ["D2", "D3", "F2", "E3", "D2", "A2", "C3", "A2"][i % 8], t, 0.35, 0.55, { attack: 0.002, release: 0.25 });
  shiver.note(trem, "D2", 37.6, 2.6, 0.3, { attack: 0.5, release: 1.2 });
  // He calls: two falling notes. Nobody answers.
  const call = (at: number, v: number) => {
    solo.note(violin, "D5", at, 0.5, v, { attack: 0.1, release: 0.4 });
    solo.note(violin, "B4", at + 0.55, 1.1, v * 0.9, { attack: 0.1, release: 0.9 });
  };
  call(37.9, 0.5);
  call(39, 0.4);
  // 0:40 The lantern on the hill; the call again; and the warm house on the other side.
  onPiano([[0, "F#4", 1], [1.4, "C#4", 1], [2.4, "E4", 2]], 40.4, 0.9, 0.26);
  call(43.8, 0.36);
  onFlute(OPENING, 46, 0.6, 0.38);
  // 0:49 The morning after.
  onPiano([[0, "F#4", 1.5], [1.5, "E4", 1.5]], 49.6, 1, 0.22);

  // 0:52 The light.
  onViolin(FIRST, 55.4, 0.5, 0.46);
  onFlute([[0, "A5", 1.5], [1.5, "F#5", 1], [2.5, "E5", 1.2]], 58.1, 0.55, 0.36);

  // 1:00 The years.
  onPiano(FIRST, 60.3, 0.45, 0.36);
  onFlute(SECOND, 64.3, 0.45, 0.42);
  onPiano([[0, "F#4", 2], [2, "E4", 1], [3, "C#4", 0.9], [4.2, "F#4", 1.4]], 68.4, 0.55, 0.24);
  onViolin(FIRST, 72.2, 0.45, 0.5);
  onFlute(oct(FIRST, 1), 72.2, 0.45, 0.34);
  sing(oct(FIRST, 1), 76.2, 0.45, violins, high, 0.5, { ring: 0.2, attack: 0.2, release: 0.8, pan: -0.2, swell: 0.2 });
  onCello(FIRST, 76.2, 0.45, 0.46);
  for (let k = 0; k < 16; k++) mallet.note(marimba, ["D5", "F#5", "A5", "F#5", "G5", "B5", "A5", "F#5"][k % 8], 76 + k * 0.25, 0.4, 0.28, { attack: 0.002, release: 0.5, pan: 0.25 });
  onPiano(SECOND, 80.3, 0.45, 0.32);

  // 1:24 Her old dog lifts its head to his light: the cello has the theme.
  onCello(FIRST, 84.8, 0.85, 0.42);
  // 1:32 Old, two of them; then one.
  onPiano(OPENING, 92.4, 0.55, 0.3);
  onCello([[0, "F#4", 2], [2.2, "E4", 2]], 92.6, 0.65, 0.34);
  onPiano([[0, "F#4", 1], [2, "E4", 2]], 96.6, 0.9, 0.18);

  // 1:40 The last evening: the theme, unhurried, until the light goes off; then its end, on the piano alone.
  onPiano(FIRST, 100.4, 0.46, 0.34);
  onViolin(FIRST, 100.4, 0.46, 0.34);
  onPiano([[0, "B4", 1], [1, "C#5", 1], [2, "A4", 1.6]], 104.4, 0.55, 0.36);
  onPiano([[0, "G4", 1], [1, "F#4", 1], [2, "E4", 1.2]], 107.5, 0.66, 0.26);
  // Home, at last.
  piano.note(upright, HOME, 109.6, 4, 0.3, { attack: 0.003, release: 2.5 });
  piano.note(upright, "D3", 109.62, 4, 0.22, { attack: 0.003, release: 2.5 });

  // 1:53 Dawn: the same tune, young again, and this time it goes all the way home.
  onFlute(oct(FIRST, 1), 113.2, 0.27, 0.42);
  sing(oct(FIRST, 1), 115.5, 0.21, marimba, mallet, 0.4, { release: 0.6 });
  sing([[0, "G5", 1], [1, "F#5", 1], [2, "E5", 1], [3, "D5", 4]], 117.2, 0.3, marimba, mallet, 0.42, { release: 0.8 });
  harp.note(harpi, "D5", 118.1, 3, 0.4, { attack: 0.003, release: 2 });

  const out = s.master({ target: -16, fade: 1.6 });
  writeWav(file, out.L, out.R);
  console.log(`  ${out.loudness.toFixed(1)} LUFS, limiter took at most ${out.reduced.toFixed(1)} dB`);
  for (let t = 0; t < SECONDS; t += 4) console.log(`  ${String(t).padStart(3)} s  ${loudnessOf(out.L, out.R, t, t + 4).toFixed(1)} LUFS`);
}
