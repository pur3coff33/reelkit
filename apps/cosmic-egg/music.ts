// The whole soundtrack: his voice in a small hall, the score, a breath of air at each change of shape. A beat is a second
// and a bar four, and every part starts on a bar line. A low D hums all the way through. The harp turns in a long echo; the
// strings open chords part by part, growing through the lives and the egg, and only come home on the last bar. Between his
// sentences the piano (and later the flute) answers with one small theme that keeps coming back.
import { air, hum, leanBack, readVoice } from "../../src/kit/music/narration";
import { instrument } from "../../src/kit/music/sampler";
import { Session, above, loudnessOf, parseChord, voice } from "../../src/kit/music/studio";
import { writeWav } from "../../src/kit/music/synth";
import { LINES, PARTS, PART_NAMES, SECONDS, end, type PartName } from "./timeline";

const BAR = 4;

/** Each part's chords (round and round), how full the strings are at its start and end (0…1), and what else plays:
 * h harp, v high violins, t trembling cellos, f the flute answering. */
const SCORE: Record<PartName, { chords: string[]; level: [number, number]; plays: string }> = {
  hook: { chords: ["Dadd9", "Bm9", "Gmaj9", "A9sus4"], level: [0.2, 0.35], plays: "h" },
  salt: { chords: ["Em9", "Cmaj9", "Gmaj9", "Dadd9"], level: [0.3, 0.45], plays: "h" },
  lives: { chords: ["Gmaj9", "Dmaj9/F#", "Em9", "A9sus4", "Bm9", "Gmaj7#11", "Em9", "A9sus4"], level: [0.4, 0.65], plays: "hv" },
  kindness: { chords: ["Bm9", "Gmaj9", "Dadd9", "A9sus4"], level: [0.45, 0.6], plays: "h" },
  open: { chords: ["Em9", "Cmaj9"], level: [0.3, 0.45], plays: "t" },
  egg: { chords: ["Cmaj9", "Gmaj9", "Em9", "Dmaj9/F#"], level: [0.5, 0.8], plays: "hvf" },
  hatch: { chords: ["A9sus4", "Bm9", "Gmaj9", "A9sus4", "Gmaj9", "Em9", "A9sus4", "Dadd9"], level: [0.75, 0.45], plays: "hvf" },
};

/** The theme: up to the sixth and falling home by step. Phrases of it fill the gaps between sentences. */
const THEME = ["D4", "F#4", "A4", "B4", "A4", "F#4", "E4", "D5", "B4", "A4", "F#4", "E4", "D4"];

export async function writeMusic(file: string) {
  const lines = readVoice("cosmic-egg", LINES);
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
  const s = new Session(SECONDS, 41);

  const him = s.stem("voice", { lufs: -16.4, low: 75, high: 10500, hall: { seconds: 2.6, mix: 0.16, gap: 0.04 } });
  for (const l of lines) him.add(l.sound, l.at);

  const piano = s.stem("piano", { lufs: -28.5, low: 80, high: 4600, hall: { seconds: 5, mix: 0.5, gap: 0.045 }, echo: { time: 1.5, feedback: 0.45, mix: 0.3 }, loose: { time: 0.035, velocity: 0.12 } });
  const harp = s.stem("harp", { lufs: -30.5, low: 120, high: 5200, hall: { seconds: 5, mix: 0.55, gap: 0.04 }, echo: { time: 0.75, feedback: 0.5, mix: 0.42 }, loose: { time: 0.02, velocity: 0.14 } });
  const flute = s.stem("flute", { lufs: -34, low: 200, high: 5000, hall: { seconds: 5.5, mix: 0.8, gap: 0.03 }, echo: { time: 1.5, feedback: 0.4, mix: 0.3 }, loose: { time: 0.05, velocity: 0.06 } });
  const high = s.stem("violins", { lufs: -34.5, low: 200, high: 4200, hall: { seconds: 5.5, mix: 0.8, gap: 0.02 }, loose: { time: 0.14, velocity: 0.08 } });
  const mid = s.stem("violas and cellos", { lufs: -29, low: 90, high: 2900, hall: { seconds: 5.5, mix: 0.65, gap: 0.02 }, loose: { time: 0.14, velocity: 0.08 } });
  const shiver = s.stem("trembling cellos", { lufs: -36.5, low: 90, high: 2400, hall: { seconds: 4.5, mix: 0.6, gap: 0.02 }, loose: { time: 0.08, velocity: 0.08 } });
  const low = s.stem("bass", { lufs: -31.5, high: 900, warmth: 0.5, hall: { seconds: 4, mix: 0.2, gap: 0.02 }, loose: { time: 0.04, velocity: 0.05 } });
  const drone = s.stem("hum", { lufs: -36.5, high: 700, warmth: 0.4 });
  const breath = s.stem("air", { lufs: -42.5, low: 250, high: 5000, hall: { seconds: 4, mix: 0.7, gap: 0.02 } });

  let prev: number[] | undefined, bar = 0;
  for (const name of PART_NAMES) {
    const { chords, level: [l0, l1], plays } = SCORE[name], { from, to } = PARTS[name], bars = Math.max(1, Math.round((to - from) / BAR));
    for (let b = 0; b < bars; b++, bar++) {
      const at = from + b * BAR, last = name === "hatch" && b === bars - 1;
      const c = parseChord(last ? "Dadd9" : chords[b % chords.length]), level = l0 + (l1 - l0) * (b / Math.max(1, bars - 1));
      const v = voice(c, 52, 71, 4, prev), long = last ? BAR + 4 : BAR + 0.5;
      prev = v;
      // Each player comes in on their own, low to high, so a chord opens rather than switches on.
      v.forEach((n, k) => mid.note(n < 60 ? cellos : violas, n, at + k * 0.26, long - k * 0.16, 0.14 + 0.28 * level, { attack: 1.4, release: 2.6, swell: 0.35, pan: [0.32, 0.14, -0.14, -0.3][k], gain: 0.4 + 0.6 * level }));
      if (level > 0.3) low.note(contra, above(c.bass, 33), at, long - 0.2, 0.22 + 0.16 * level, { attack: 0.8, release: 1.6, swell: 0.25 });
      if (plays.includes("v") && level > 0.5) [above(c.pcs[1], 74), above(c.pcs[2], 78)].forEach((n, k) => high.note(violins, n, at + 0.3 + k * 0.5, long - 0.1, 0.26, { attack: 1.7, release: 2.6, swell: 0.4, pan: k ? -0.4 : -0.15 }));
      if (plays.includes("t")) [above(c.bass, 43), above(c.pcs[1], 50)].forEach((n, k) => shiver.note(trem, n, at + k * 0.2, BAR, 0.16 + 0.3 * level, { attack: 1, release: 1.6, swell: 0.4, pan: k ? 0.25 : -0.2 }));
      if (plays.includes("h") && !last) {
        // Five notes over four beats: the wheel never lines up with the bar the same way twice running.
        const notes = [...voice(c, 57, 74, 4), above(c.root, 74)];
        for (let k = 0; k < 8; k++) {
          const n = (bar * 8 + k) % 5;
          if ((bar * 8 + k) % 11 === 7) continue;
          harp.note(harpi, notes[[0, 3, 1, 4, 2][n] % notes.length], at + k * 0.5, 2.6, 0.22 + (n === 0 ? 0.08 : 0) + 0.06 * level, { attack: 0.004, release: 1.8, pan: -0.35 + n * 0.17 });
        }
      }
    }
  }

  // The theme in the gaps: a few notes of it after each sentence, carrying on where the last phrase stopped.
  let step = 0;
  lines.forEach((l, i) => {
    const gapEnd = i + 1 < lines.length ? lines[i + 1].at - 0.4 : SECONDS - 3, from = l.at + l.seconds + 0.25, room = gapEnd - from;
    if (room < 1.4) return;
    const part = PART_NAMES.find((p) => from >= PARTS[p].from && from < PARTS[p].to) ?? "hatch", fl = SCORE[part].plays.includes("f") && room > 2.4;
    const n = Math.min(4, Math.floor(room / 0.9));
    for (let k = 0; k < n; k++, step++) {
      const note = THEME[step % THEME.length], t = from + k * 0.85, lean = k === n - 1 ? 0.05 : 0;
      piano.note(upright, note, t, 1 + 2.4, 0.24 + lean, { attack: 0.003, release: 2.2, pan: 0.06 });
      if (fl) flute.note(flutes, note.replace(/\d/, (d) => String(+d + 1)), t + 0.05, 1.1, 0.38 + lean, { attack: 0.18, release: 0.7, pan: 0.2, swell: 0.25 });
    }
  });
  // The last note, under the last word.
  piano.note(upright, "D4", end("x5") + 0.5, 5, 0.26, { attack: 0.003, release: 2.6 });

  drone.add([hum(SECONDS, 0.11), hum(SECONDS, -0.13)], 0);
  for (const p of PART_NAMES.slice(1)) breath.add([air(3.4, 40 + PARTS[p].from), air(3.4, 60 + PARTS[p].from)], PARTS[p].from - 1.9);
  // The hatching.
  breath.add([air(5, 90), air(5, 91)], end("x2") - 1.5, 1.6);

  // Under him the music sits about 12 dB down: every word has to be easy to follow.
  for (const st of s.stems) if (st !== him) st.ride(leanBack(lines, st === drone || st === breath ? 0.7 : 0.4));
  const out = s.master({ target: -16, fade: 4 });
  writeWav(file, out.L, out.R);
  console.log(`  ${out.loudness.toFixed(1)} LUFS, limiter took at most ${out.reduced.toFixed(1)} dB`);
  for (const p of PART_NAMES) console.log(`  ${String(PARTS[p].from).padStart(3)} s  ${p.padEnd(9)} ${loudnessOf(out.L, out.R, PARTS[p].from, PARTS[p].to).toFixed(1)} LUFS`);
  const gaps = lines.slice(0, -1).map((l, i) => [l.at + l.seconds + 0.6, lines[i + 1].at] as const).filter(([a, b]) => b - a > 1.5);
  console.log(`  between sentences: ${gaps.map(([a, b]) => loudnessOf(out.L, out.R, a, b).toFixed(0)).join(" ")} LUFS`);
}


