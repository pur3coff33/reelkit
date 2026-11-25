// The score: calm, wide and warm, on real instruments. A beat is a second and a bar is four, so every shot begins on a bar
// line. One small theme (up to the sixth, then falling home by step): a soft upright at the birth, the flute on the long
// swim, the violins over the krill, the piano alone in the deep, cello and flute together in courtship, and all of it at
// the second birth. The orcas get bareness rather than noise. It ends at home.
import { type Instrument, instrument } from "../../src/kit/music/sampler";
import { Session, above, loudnessOf, parseChord, seeded, voice, type Stem } from "../../src/kit/music/studio";
import { SR, svf, writeWav } from "../../src/kit/music/synth";
import { SECONDS, SHOTS, type ShotName } from "./timeline";

const BAR = 4;

/** Shot by shot, bar by bar: the chord, how full the strings are (0 rests … 1), and what else plays: h harp, v high violins, b bass. */
const CHORDS: Record<ShotName, [string, number, string][]> = {
  birth: [["Dadd9", 0.3, ""], ["Gmaj9", 0.5, "hb"], ["Dmaj9/F#", 0.6, "hbv"]],
  milk: [["A9sus4", 0.5, "hb"], ["Bm9", 0.55, "hb"]],
  aerial: [["Gmaj9", 0.6, "hbv"], ["Em9", 0.55, "hb"]],
  swim: [["Dadd9", 0.55, "hb"], ["Em9", 0.6, "hb"], ["Gmaj9", 0.7, "hbv"]],
  night: [["A9sus4", 0.35, "b"], ["Bm9", 0.35, "b"]],
  ice: [["Gmaj9", 0.5, "hb"], ["Em9", 0.65, "hb"]],
  lunge: [["Cmaj9", 0.85, "hbv"], ["Gmaj9", 0.95, "hbv"]],
  full: [["Em9", 0.85, "hbv"], ["Dmaj9/F#", 0.7, "hbv"]],
  orcas: [["Bm9", 0.4, "b"], ["Gmaj7#11", 0.4, "b"]],
  circle: [["Em9", 0.5, "b"], ["Bm9", 0.45, "b"]],
  away: [["Gmaj9", 0.6, "hb"], ["A9sus4", 0.7, "hbv"]],
  fluke: [["Dadd9", 0.45, "hb"], ["Bm9", 0.35, "b"]],
  alone: [["Em9", 0.25, "b"], ["Bm9", 0.28, "b"]],
  years: [["Gmaj9", 0.5, "hb"], ["A9sus4", 0.55, "hb"]],
  eye: [["Dmaj9", 0.5, "hb"], ["Gmaj9", 0.6, "hbv"]],
  song: [["Bm9", 0.3, "b"], ["Gmaj9", 0.35, "b"]],
  court: [["Dmaj9", 0.55, "hb"], ["Em9", 0.6, "hb"]],
  race: [["Gmaj9", 0.75, "hbv"], ["A9sus4", 0.75, "hbv"]],
  calf: [["Dadd9", 0.8, "hbv"], ["Gmaj9", 0.85, "hbv"], ["Dmaj9/F#", 0.75, "hbv"]],
  dusk: [["Gmaj9", 0.6, "hbv"], ["A9sus4", 0.5, "hb"], ["Dadd9", 0.4, "b"]],
};
export const BARS = Object.values(CHORDS).flat();

/** [seconds, note, length, velocity]. */
type Note = [number, string, number, number];
/** A phrase placed some seconds into a shot. */
const from = (shot: ShotName, line: Note[], late = 0): Note[] => line.map(([t, n, l, v]) => [t + SHOTS[shot].from + late, n, l, v]);

const THEME: Note[] = [[0.6, "F#4", 1.4, 0.3], [2, "A4", 1, 0.36], [3, "B4", 2, 0.4], [5, "A4", 1, 0.36], [6, "F#4", 1, 0.32], [7, "E4", 1.2, 0.3], [8.2, "D5", 2.2, 0.42], [10, "B4", 1, 0.36], [11, "A4", 2, 0.32]];
const PIANO: Note[] = [
  ...from("birth", THEME),
  ...from("milk", [[1.2, "E4", 1.6, 0.28], [3, "D4", 1.4, 0.26], [4.6, "F#4", 1.4, 0.32], [6, "A4", 1.8, 0.34]]),
  ...from("aerial", [[0.8, "B4", 1.4, 0.32], [2.4, "A4", 1.2, 0.3], [4, "D5", 2, 0.36], [6.4, "B4", 1.4, 0.3]]),
  ...from("night", [[0.8, "E4", 1.8, 0.26], [2.8, "A4", 1.6, 0.3], [4.8, "F#4", 1.8, 0.28], [6.8, "D4", 1.6, 0.24]]),
  ...from("orcas", [[1, "F#3", 2.4, 0.22], [4.4, "C#4", 2.4, 0.24], [8.6, "E4", 2, 0.26], [10.8, "B3", 1.6, 0.22], [12.8, "D4", 1.6, 0.24], [14.4, "C#4", 1.6, 0.22]]),
  ...from("away", [[0.6, "B4", 1.4, 0.36], [2.2, "D5", 1.8, 0.4], [4.6, "E5", 1.6, 0.42], [6.6, "D5", 1.4, 0.36]]),
  ...from("alone", [[1, "F#4", 3, 0.2], [4.8, "D5", 2.4, 0.24], [7.2, "B4", 1.6, 0.22]]),
  ...from("years", [[0.6, "B4", 1.4, 0.3], [2.2, "A4", 1.6, 0.28], [4.6, "D5", 1.4, 0.34], [6.2, "E5", 1.8, 0.34]]),
  ...from("eye", [[0.6, "F#4", 1.4, 0.28], [2, "A4", 1, 0.3], [3, "B4", 2.2, 0.34], [5.4, "D5", 1.6, 0.34], [7, "B4", 1.2, 0.3]]),
  ...from("calf", THEME.map(([t, n, l, v]) => [t, n, l, v + 0.06] as Note)),
  ...from("dusk", [[0.8, "B4", 1.8, 0.34], [3, "A4", 1.6, 0.3], [5, "E4", 1.4, 0.28], [6.6, "D4", 1.4, 0.26], [8.6, "F#4", 1.6, 0.28], [10, "D5", 2, 0.26]]),
];
const FLUTE: Note[] = [
  ...from("swim", [[0.6, "A4", 1.4, 0.46], [2, "B4", 1, 0.48], [3, "D5", 2, 0.54], [5.3, "B4", 1.1, 0.48], [6.5, "G4", 1.4, 0.44], [8.3, "A4", 1.5, 0.46], [9.9, "B4", 1.9, 0.48]]),
  ...from("ice", [[0.8, "B4", 2, 0.46], [3, "D5", 1.5, 0.5], [4.8, "E5", 2, 0.54], [7, "B4", 0.9, 0.44]]),
  ...from("fluke", [[1.6, "D5", 1.8, 0.44], [3.8, "B4", 1.4, 0.42], [5.6, "A4", 2, 0.4]]),
  ...from("court", [[0.6, "F#5", 1.8, 0.5], [2.6, "E5", 1.2, 0.48], [4.4, "B4", 1.8, 0.48], [6.4, "E5", 1.4, 0.48], [8.4, "D5", 1.9, 0.52], [10.4, "B4", 1.4, 0.48], [12.4, "A4", 1.5, 0.46], [14, "B4", 1.8, 0.48]]),
  ...from("calf", [[3, "B4", 1.8, 0.42], [5, "A4", 1, 0.4], [8.2, "D5", 1.8, 0.48], [10, "B4", 1, 0.42], [11, "A4", 1.4, 0.4]]),
];
/** The violins' moment, over the krill; the cellos' answer, in the song and the courtship. */
const VIOLINS: Note[] = from("lunge", [[0.4, "E5", 1.9, 0.4], [2.5, "G5", 1.5, 0.44], [4.2, "F#5", 2, 0.46], [6.4, "D5", 1.5, 0.4], [8.2, "E5", 1.8, 0.4], [10.2, "B4", 1.7, 0.36], [12.2, "A4", 3, 0.34]]);
const CELLOS: Note[] = [...from("song", [[0.6, "F#3", 2.6, 0.4], [3.4, "E3", 0.9, 0.34], [4.5, "D3", 3, 0.4]]), ...from("court", [[2.2, "A3", 1.7, 0.4], [6.2, "B3", 1.7, 0.4], [10.2, "G3", 1.7, 0.4], [14.2, "E3", 1.6, 0.36]])];

/** The sea, felt rather than heard: dark noise that swells and falls like slow breath. */
function water(seconds: number, seed: number) {
  const rnd = seeded(seed);
  const raw = Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => (rnd() * 2 - 1) * (0.55 + 0.45 * Math.sin((2 * Math.PI * i) / SR / 8 - 1.2)));
  return svf(svf(raw, 420, 0.6, "low"), 70, 0.6, "high");
}

/** `effects` adds its own stems to the session before it's mastered. */
export async function writeScore(file: string, effects?: (s: Session) => void) {
  const [upright, harpi, violins, violas, cellos, contra, flutes] = await Promise.all([
    instrument("Keys/Upright Nr1", /_(pp|mf)_/),
    instrument("Strings/Harp"),
    instrument("Strings/Violin Section/susVib"),
    instrument("Strings/Viola Section/susvib"),
    instrument("Strings/Cello Section/susvib"),
    instrument("Strings/Solo Contrabass/SusNV"),
    instrument("Woodwinds/Flute/susNV"),
  ]);
  const s = new Session(SECONDS, 24);

  // Near to far: piano and harp in front, flute and solo lines a step back, strings behind, all in one long hall.
  const piano = s.stem("piano", { lufs: -20.5, low: 70, high: 5000, hall: { seconds: 4.5, mix: 0.42, gap: 0.045 }, echo: { time: 1.5, feedback: 0.35, mix: 0.15 }, loose: { time: 0.035, velocity: 0.12 } });
  const harp = s.stem("harp", { lufs: -27, low: 110, high: 6000, hall: { seconds: 4.5, mix: 0.5, gap: 0.04 }, echo: { time: 1, feedback: 0.3, mix: 0.14 }, loose: { time: 0.025, velocity: 0.14 } });
  const flute = s.stem("flute", { lufs: -25.5, low: 200, high: 5600, hall: { seconds: 5, mix: 0.6, gap: 0.035 }, loose: { time: 0.04, velocity: 0.05 } });
  const solo = s.stem("solo strings", { lufs: -25, low: 110, high: 4200, hall: { seconds: 5.5, mix: 0.6, gap: 0.03 }, loose: { time: 0.06, velocity: 0.06 } });
  const high = s.stem("violins", { lufs: -28.5, low: 180, high: 4000, hall: { seconds: 5.5, mix: 0.7, gap: 0.02 }, loose: { time: 0.14, velocity: 0.08 } });
  const mid = s.stem("violas and cellos", { lufs: -23, low: 90, high: 3000, hall: { seconds: 5.5, mix: 0.6, gap: 0.02 }, loose: { time: 0.14, velocity: 0.08 } });
  const low = s.stem("bass", { lufs: -26, high: 900, warmth: 0.5, hall: { seconds: 4, mix: 0.2, gap: 0.02 }, loose: { time: 0.04, velocity: 0.05 } });
  const sea = s.stem("water", { lufs: -42 });

  let prev: number[] | undefined;
  BARS.forEach(([name, level, plays], i) => {
    const at = i * BAR, c = parseChord(name);
    const v = voice(c, 52, 71, 4, prev);
    prev = v;
    const thin = level < 0.45;
    if (plays.includes("b")) low.note(contra, above(c.bass, 33), at, BAR - 0.2, 0.24 + 0.16 * level, { attack: 0.6, release: 1.5, swell: 0.25 });
    // Each player comes in on their own, low to high, so a chord opens rather than switches on.
    v.forEach((n, k) => mid.note(n < 60 ? cellos : violas, n, at + k * (thin ? 0.34 : 0.18), BAR + 0.5 - k * 0.16, 0.14 + 0.28 * level, { attack: 1.2, release: 2.4, swell: 0.3, pan: [0.32, 0.14, -0.14, -0.3][k], gain: 0.45 + 0.55 * level }));
    if (plays.includes("v")) [above(c.pcs[1], 74), above(c.pcs[2], 78)].forEach((n, k) => high.note(violins, n, at + 0.3 + k * 0.5, BAR - 0.1, 0.26, { attack: 1.7, release: 2.6, swell: 0.4, pan: k ? -0.4 : -0.15 }));
    if (plays.includes("h")) {
      const steps = [...voice(c, 50, 69, 4), ...voice(c, 66, 83, 3)];
      // Two shapes by turns, so it ripples rather than loops; now and then a note is left out.
      const shape = i % 2 ? [0, 2, 1, 3, 4, 3, 5, 4] : [0, 1, 2, 3, 4, 5, 4, 3];
      shape.forEach((step, k) => {
        if (k === 6 && i % 3 === 0) return;
        harp.note(harpi, steps[Math.min(step, steps.length - 1)], at + k * 0.5, 3, 0.34 - 0.015 * k + (k === 0 ? 0.08 : 0), { attack: 0.004, release: 1.8, pan: -0.3 + step * 0.09 });
      });
    }
    // The piano's left hand: the root and, a little later, the fifth above it. Every other bar where it's bare.
    if (!thin || i % 2 === 1 || i === 0) {
      const b = above(c.bass, 36);
      piano.note(upright, b, at, 4, 0.22, { attack: 0.003, release: 2.2, pan: -0.1 });
      piano.note(upright, above((c.root + 7) % 12, b + 5), at + 0.75, 3.2, 0.16, { attack: 0.003, release: 2.2, pan: -0.04 });
    }
  });

  const sing = (line: Note[], inst: Instrument, stem: Stem, ring: number, o: { attack: number; release: number; pan: number; swell?: number }) => line.forEach(([at, n, len, v]) => stem.note(inst, n, at, len + ring, v, o));
  sing(PIANO, upright, piano, 2.4, { attack: 0.003, release: 2.2, pan: 0.06 });
  sing(FLUTE, flutes, flute, 0.12, { attack: 0.14, release: 0.55, pan: 0.18, swell: 0.22 });
  sing(VIOLINS, violins, solo, 0.25, { attack: 0.3, release: 1, pan: -0.2, swell: 0.2 });
  sing(CELLOS, cellos, solo, 0.2, { attack: 0.35, release: 1.2, pan: 0.25, swell: 0.25 });
  sea.add([water(SECONDS, 5), water(SECONDS, 6)], 0);

  effects?.(s);

  const out = s.master({ target: -16, fade: 4 });
  writeWav(file, out.L, out.R);
  console.log(`  ${out.loudness.toFixed(1)} LUFS, limiter took at most ${out.reduced.toFixed(1)} dB`);
  for (let i = 0; i < BARS.length; i += 2) console.log(`  ${String(i * BAR).padStart(3)} s  ${BARS[i][0].padEnd(9)} ${loudnessOf(out.L, out.R, i * BAR, (i + 2) * BAR).toFixed(1)} LUFS`);
}
