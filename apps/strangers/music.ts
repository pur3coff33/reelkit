// The whole soundtrack: the score, his voice in a small hall, and a breath of air at each change of shape. A beat is a
// second and a bar is four, so every part starts on a bar line. A low D hums all the way through; over it a harp goes round
// and round in a long echo, and the strings open chords that only come home at the end. The music leans back when he speaks.
import { air, hum, leanBack, readVoice } from "../../src/kit/music/narration";
import { instrument } from "../../src/kit/music/sampler";
import { Session, above, loudnessOf, parseChord, voice, type Stem } from "../../src/kit/music/studio";
import { writeWav } from "../../src/kit/music/synth";
import { LINES, PARTS, SECONDS, type PartName } from "./timeline";

const BAR = 4;

/** Part by part, bar by bar: the chord, how full the strings are (0…1), and what else plays: h harp, v high violins, t trembling cellos. */
const CHORDS: Record<PartName, [string, number, string][]> = {
  body: [["Dadd9", 0.2, "h"], ["Dadd9", 0.3, "h"], ["Cmaj9", 0.45, "h"]],
  ship: [["Bm9", 0.45, "h"], ["Gmaj9", 0.5, "h"], ["Em9", 0.5, "h"], ["A9sus4", 0.6, "hv"]],
  river: [["Dadd9", 0.5, "h"], ["Cmaj9", 0.55, "h"], ["Gmaj9", 0.6, "hv"], ["Dmaj9/F#", 0.65, "hv"]],
  butterfly: [["Gmaj7#11", 0.45, "h"], ["Em9", 0.45, "h"], ["Bm9", 0.35, ""], ["Gmaj7#11", 0.4, "h"], ["A9sus4", 0.5, "hv"]],
  eye: [["Em9", 0.3, ""], ["Cmaj9", 0.4, "t"], ["Em9", 0.55, "t"], ["Cmaj9", 0.75, "tv"]],
  net: [["Gmaj9", 0.75, "hv"], ["Dmaj9/F#", 0.8, "hv"], ["Em9", 0.85, "hv"], ["Cmaj9", 0.85, "hv"]],
  wave: [["Gmaj9", 0.45, "h"], ["A9sus4", 0.65, "hv"], ["Bm9", 0.55, "h"], ["Gmaj9", 0.5, "h"]],
  home: [["A9sus4", 0.5, "hv"], ["Dadd9", 0.4, "h"]],
};
const BARS = Object.values(CHORDS).flat();

/** [seconds, note, length, velocity]: one small theme, up a fifth and falling by steps, in the gaps between sentences. */
type Note = [number, string, number, number];
const PIANO: Note[] = [
  [0.1, "D4", 2, 0.26], [5.9, "A4", 1.2, 0.24],
  [11, "E4", 1.4, 0.28], [12, "D4", 2, 0.26],
  [17.4, "F#4", 1.4, 0.24], [22.5, "A4", 1, 0.28], [26.3, "B4", 1.2, 0.32], [27.2, "A4", 1.8, 0.28],
  [33.8, "B4", 1.4, 0.24], [39, "A4", 1.2, 0.26], [43.4, "F#4", 2, 0.26],
  [51, "C#5", 1.4, 0.24], [55, "B4", 1.4, 0.26], [62, "A4", 1.2, 0.28], [63, "E4", 2, 0.26],
  [70.8, "E4", 1.6, 0.24], [78, "G4", 1.4, 0.26], [79, "B4", 1.6, 0.3],
  [86.6, "D5", 1.4, 0.34], [93.6, "E5", 1.2, 0.36], [94.6, "D5", 1.6, 0.34],
  [96, "B4", 2, 0.26], [104, "D5", 1.4, 0.34], [104.9, "B4", 1.4, 0.3], [108.9, "A4", 1.6, 0.28], [110.2, "F#4", 2, 0.26],
  [117.3, "A4", 1.2, 0.3], [118.2, "D4", 3, 0.28],
];
const FLUTE: Note[] = [
  [10.6, "A4", 1.6, 0.4], [25.9, "D5", 1.6, 0.42], [27.4, "B4", 1.4, 0.38], [43.8, "B4", 1.4, 0.4], [50.9, "D5", 1.2, 0.38],
  [61.9, "E5", 1.6, 0.44], [63.4, "B4", 1.4, 0.4], [93.4, "F#5", 1.8, 0.46], [95, "D5", 1.8, 0.42], [103.8, "E5", 1.6, 0.46], [108.8, "D5", 1.6, 0.42], [110.4, "B4", 1.6, 0.38],
];
const CELLO: Note[] = [[96.4, "B2", 3.2, 0.3], [100, "E3", 3.4, 0.36], [103.7, "A3", 2.2, 0.42], [106, "F#3", 2.6, 0.36], [108.8, "D3", 3, 0.36]];

export async function writeMusic(file: string) {
  const lines = readVoice("strangers", LINES);
  const [upright, harpi, violins, violas, cellos, trem, contra, flutes] = await Promise.all([
    instrument("Keys/Upright Nr1", /_(pp|mf)_/),
    instrument("Strings/Harp"),
    instrument("Strings/Violin Section/susVib"),
    instrument("Strings/Viola Section/susvib"),
    instrument("Strings/Cello Section/susvib"),
    instrument("Strings/Cello Section/trem"),
    instrument("Strings/Solo Contrabass/SusNV"),
    instrument("Woodwinds/Flute/susNV"),
  ]);
  const s = new Session(SECONDS, 31);

  const him = s.stem("voice", { lufs: -16.4, low: 75, high: 10500, hall: { seconds: 2.6, mix: 0.16, gap: 0.04 } });
  for (const l of lines) him.add(l.sound, l.at);

  const piano = s.stem("piano", { lufs: -25, low: 80, high: 4600, hall: { seconds: 5, mix: 0.5, gap: 0.045 }, echo: { time: 1.5, feedback: 0.45, mix: 0.3 }, loose: { time: 0.035, velocity: 0.12 } });
  const harp = s.stem("harp", { lufs: -27, low: 120, high: 5200, hall: { seconds: 5, mix: 0.55, gap: 0.04 }, echo: { time: 0.75, feedback: 0.5, mix: 0.42 }, loose: { time: 0.02, velocity: 0.14 } });
  const flute = s.stem("flute", { lufs: -31, low: 200, high: 5000, hall: { seconds: 5.5, mix: 0.8, gap: 0.03 }, echo: { time: 1.5, feedback: 0.4, mix: 0.3 }, loose: { time: 0.05, velocity: 0.06 } });
  const solo = s.stem("cello", { lufs: -29, low: 80, high: 3600, hall: { seconds: 5, mix: 0.55, gap: 0.03 }, loose: { time: 0.05, velocity: 0.06 } });
  const high = s.stem("violins", { lufs: -31, low: 200, high: 4200, hall: { seconds: 5.5, mix: 0.8, gap: 0.02 }, loose: { time: 0.14, velocity: 0.08 } });
  const mid = s.stem("violas and cellos", { lufs: -25.5, low: 90, high: 2900, hall: { seconds: 5.5, mix: 0.65, gap: 0.02 }, loose: { time: 0.14, velocity: 0.08 } });
  const shiver = s.stem("trembling cellos", { lufs: -33, low: 90, high: 2400, hall: { seconds: 4.5, mix: 0.6, gap: 0.02 }, loose: { time: 0.08, velocity: 0.08 } });
  const low = s.stem("bass", { lufs: -28, high: 900, warmth: 0.5, hall: { seconds: 4, mix: 0.2, gap: 0.02 }, loose: { time: 0.04, velocity: 0.05 } });
  const drone = s.stem("hum", { lufs: -33, high: 700, warmth: 0.4 });
  const breath = s.stem("air", { lufs: -39, low: 250, high: 5000, hall: { seconds: 4, mix: 0.7, gap: 0.02 } });

  let prev: number[] | undefined;
  BARS.forEach(([name, level, plays], i) => {
    const at = i * BAR, c = parseChord(name), v = voice(c, 52, 71, 4, prev);
    prev = v;
    // Each player comes in on their own, low to high, so a chord opens rather than switches on.
    v.forEach((n, k) => mid.note(n < 60 ? cellos : violas, n, at + k * 0.26, BAR + 0.5 - k * 0.16, 0.14 + 0.28 * level, { attack: 1.4, release: 2.6, swell: 0.35, pan: [0.32, 0.14, -0.14, -0.3][k], gain: 0.4 + 0.6 * level }));
    if (level > 0.35) low.note(contra, above(c.bass, 33), at, BAR - 0.2, 0.22 + 0.16 * level, { attack: 0.8, release: 1.6, swell: 0.25 });
    if (plays.includes("v")) [above(c.pcs[1], 74), above(c.pcs[2], 78)].forEach((n, k) => high.note(violins, n, at + 0.3 + k * 0.5, BAR - 0.1, 0.26, { attack: 1.7, release: 2.6, swell: 0.4, pan: k ? -0.4 : -0.15 }));
    if (plays.includes("t")) [above(c.bass, 43), above(c.pcs[1], 50)].forEach((n, k) => shiver.note(trem, n, at + k * 0.2, BAR, 0.16 + 0.3 * level, { attack: 1, release: 1.6, swell: 0.4, pan: k ? 0.25 : -0.2 }));
    if (plays.includes("h")) {
      // Five notes over four beats: the wheel never lines up with the bar the same way twice running.
      const notes = [...voice(c, 57, 74, 4), above(c.root, 74)];
      for (let k = 0; k < 8; k++) {
        const n = (i * 8 + k) % 5;
        if ((i * 8 + k) % 11 === 7) continue;
        harp.note(harpi, notes[[0, 3, 1, 4, 2][n] % notes.length], at + k * 0.5, 2.6, 0.22 + (n === 0 ? 0.08 : 0) + 0.06 * level, { attack: 0.004, release: 1.8, pan: -0.35 + n * 0.17 });
      }
    }
  });
  const sing = (line: Note[], play: Parameters<Stem["note"]>[0], stem: Stem, ring: number, o: { attack: number; release: number; pan: number; swell?: number }) => line.forEach(([at, n, len, v]) => stem.note(play, n, at, len + ring, v, o));
  sing(PIANO, upright, piano, 2.6, { attack: 0.003, release: 2.2, pan: 0.06 });
  sing(FLUTE, flutes, flute, 0.2, { attack: 0.18, release: 0.7, pan: 0.2, swell: 0.25 });
  sing(CELLO, cellos, solo, 0.3, { attack: 0.4, release: 1.3, pan: 0.2, swell: 0.3 });
  drone.add([hum(SECONDS, 0.11), hum(SECONDS, -0.13)], 0);
  Object.values(PARTS).slice(1).forEach((p, i) => breath.add([air(3.4, 40 + i), air(3.4, 60 + i)], p.from - 1.9));
  // The fall into the eye.
  breath.add([air(6, 80), air(6, 81)], 70.6, 1.5);

  // Under him the music sits about 12 dB down: every word has to be easy to follow.
  for (const st of s.stems)
    if (st !== him) {
      st.spec.lufs -= 3.5;
      st.ride(leanBack(lines, st === drone || st === breath ? 0.7 : 0.4));
    }
  // The hum goes out with the picture.
  const out = s.master({ target: -16, fade: 3.2 });
  writeWav(file, out.L, out.R);
  console.log(`  ${out.loudness.toFixed(1)} LUFS, limiter took at most ${out.reduced.toFixed(1)} dB`);
  for (const [name, p] of Object.entries(PARTS)) console.log(`  ${String(p.from).padStart(3)} s  ${name.padEnd(10)} ${loudnessOf(out.L, out.R, p.from, p.to).toFixed(1)} LUFS`);
  for (const l of lines.slice(0, -1)) {
    const to = l.at + l.seconds, next = lines[lines.indexOf(l) + 1].at;
    if (next - to > 1.5) console.log(`  gap ${to.toFixed(1)}–${next.toFixed(1)} s: ${loudnessOf(out.L, out.R, to + 0.6, next).toFixed(1)} LUFS`);
  }
}
