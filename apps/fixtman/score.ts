// The band FixtMan's ads share: plucked bass and strings, upright piano and marimba (VSCO 2 CE samples), drawn drums and effects,
// and the ways they play: a sneaky tiptoe, a bouncy groove, hits, rings. Each ad's music.ts says what plays when.
import { instrument } from "../../src/kit/music/sampler";
import { Session, above, loudnessOf, parseChord, seeded, voice } from "../../src/kit/music/studio";
import { SR, clap, hat, impact, kick, svf, writeWav } from "../../src/kit/music/synth";
import { BPM, TOTAL_BEATS } from "./timeline";

const BEAT = 60 / BPM;
/** Beats to seconds. */
export const at = (beat: number) => beat * BEAT;

const tone = (seconds: number, f: (t: number) => number) => Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => f(i / SR));

/** A woodblock tick: the clock on the wall. */
export const tick = (high: boolean) => tone(0.09, (t) => (Math.sin(2 * Math.PI * (high ? 1650 : 1240) * t) + 0.5 * Math.sin(2 * Math.PI * (high ? 2710 : 2050) * t)) * Math.exp(-t * 70));

/** Air moving as the house opens. */
export function whoosh() {
  const rnd = seeded(9);
  return svf(tone(0.5, (t) => (rnd() * 2 - 1) * Math.sin((Math.PI * t) / 0.5) ** 2), (t) => 500 + 5200 * t, 0.9, "band");
}

/** A knock: something heavy set on a wooden floor. */
export const knock = () => tone(0.25, (t) => Math.sin(2 * Math.PI * (70 + 90 * Math.exp(-t * 40)) * t) * Math.exp(-t * 18) + 0.4 * Math.sin(2 * Math.PI * 410 * t) * Math.exp(-t * 55));

/** Marker on paper: a line being struck. */
export function strike() {
  const rnd = seeded(3);
  return svf(tone(0.2, (t) => (rnd() * 2 - 1) * Math.min(1, t * 60) * (1 - t / 0.2)), 2900, 1.2, "band");
}

/** A phone's two-note ping. */
export const ping = () => tone(0.5, (t) => Math.sin(2 * Math.PI * (t < 0.09 ? 1318 : 1760) * t) * Math.exp(-(t < 0.09 ? t : t - 0.09) * 12) * 0.8);

/** Loose parts hitting the floor. */
export function clatter(seconds: number) {
  const rnd = seeded(21);
  const out = new Float32Array(Math.round(seconds * SR));
  for (let n = 0; n < 34; n++) {
    const start = Math.floor(rnd() ** 1.6 * (out.length - SR * 0.15)), f = 1200 + rnd() * 3200, g = 0.15 + rnd() * 0.35;
    for (let i = 0; i < SR * 0.12; i++) out[start + i] += Math.sin((2 * Math.PI * f * i) / SR) * Math.exp(-(i / SR) * 55) * g;
  }
  return out;
}

const SHORT = { attack: 0.002, release: 0.25 };

/** The band, ready to play. `cycle`: four chords, a bar each, counted from `start` (a beat). */
export async function band(cycle: string[], start: number, seed: number) {
  const [contra, violins, cellos, upright, bars] = await Promise.all([
    instrument("Strings/Solo Contrabass/Pizz"),
    instrument("Strings/Violin Section/Pizz"),
    instrument("Strings/Cello Section/pizzT"),
    instrument("Keys/Upright Nr1", /_(pp|mf)_/),
    instrument("Percussion/Marimba"),
  ]);
  const chordAt = (beat: number) => parseChord(cycle[Math.floor((beat - start) / 4) % cycle.length]);
  const s = new Session(TOTAL_BEATS * BEAT, seed);
  const room = (mix: number) => ({ seconds: 1.4, mix, gap: 0.015 });
  const piano = s.stem("piano", { lufs: -23, low: 120, high: 6500, hall: room(0.22), loose: { time: 0.008, velocity: 0.1 } });
  const low = s.stem("bass", { lufs: -21, high: 1800, warmth: 0.45, hall: room(0.08), loose: { time: 0.006, velocity: 0.08 } });
  const high = s.stem("violins", { lufs: -25, low: 200, high: 7500, hall: room(0.3), loose: { time: 0.01, velocity: 0.1 } });
  const mid = s.stem("cellos", { lufs: -25, low: 90, high: 5000, hall: room(0.25), loose: { time: 0.01, velocity: 0.1 } });
  const wood = s.stem("marimba", { lufs: -26, low: 160, high: 7000, hall: room(0.28), loose: { time: 0.008, velocity: 0.12 } });
  const drums = s.stem("drums", { lufs: -21, hall: { seconds: 0.7, mix: 0.1, gap: 0.01 } });
  const sfx = s.stem("effects", { lufs: -24, hall: room(0.15) });

  /** In E minor: bass and cellos trade, the violins answer, the clock ticks. */
  const tiptoe = (from: number, to: number) => {
    const bassline = ["E2", "B2", "E2", "B2", "C2", "G2", "B1", "F#2"];
    const answer: [number, string][] = [[0.5, "G4"], [1, "F#4"], [1.5, "E4"], [2.5, "B4"], [4.5, "E4"], [5, "G4"], [5.5, "E4"], [6.5, "D#4"], [7, "F#4"]];
    for (let b = from; b < to; b++) {
      const k = (b - from) % 8;
      low.note(contra, bassline[k], at(b), 0.35, k % 2 ? 0.5 : 0.68, SHORT);
      if (k % 2) mid.note(cellos, k < 4 ? "G3" : "F#3", at(b), 0.3, 0.5, { ...SHORT, pan: 0.2 });
      drums.add(tick(k % 2 === 0), at(b), 0.22, 0.3);
      drums.add(tick(false), at(b + 0.5), 0.1, 0.3);
    }
    for (let base = from; base < to; base += 8) for (const [d, n] of answer) if (base + d < to) high.note(violins, n, at(base + d), 0.3, 0.55, { attack: 0.002, release: 0.3, pan: -0.25 });
  };

  const hit = (beat: number, gain = 1) => {
    drums.add(kick(1.4), at(beat), gain);
    drums.add(clap(), at(beat), 0.3 * gain);
    sfx.add(impact(), at(beat), 0.55 * gain);
  };

  /** Everyone on one chord, left to ring. */
  const ring = (beat: number, name: string, seconds: number) => {
    const c = parseChord(name);
    voice(c, 55, 74, 4).forEach((n, i) => piano.note(upright, n, at(beat) + i * 0.012, seconds, 0.75, { attack: 0.002, release: 1.2, pan: -0.15 + i * 0.1 }));
    [above(c.root, 67), above(c.root, 79)].forEach((n) => high.note(violins, n, at(beat), 0.6, 0.8, { attack: 0.002, release: 0.5 }));
    low.note(contra, above(c.bass, 31), at(beat), 1, 0.85, { attack: 0.002, release: 0.7 });
  };

  /** `plays`: k kick, c clap, p piano stabs, m marimba, v plucked violins (`hook`: [beat, note] over two bars), h hats, b bass. */
  const groove = (from: number, to: number, plays: string, hook: [number, number][]) => {
    const has = (x: string) => plays.includes(x);
    const half = !has("k");
    for (let b = from; b < to; b++) {
      const c = chordAt(b), k = (b - start) % 4;
      if (has("k") || k === 0) drums.add(kick(), at(b), half ? 1 : 0.85);
      if (has("c") && (half ? k === 2 : k % 2 === 1)) drums.add(clap(), at(b), 0.42);
      if (has("h")) {
        drums.add(hat(), at(b + 0.5), 0.2, 0.3);
        drums.add(hat(), at(b + 0.25), 0.06, -0.3);
        drums.add(hat(), at(b + 0.75), 0.08, -0.3);
      }
      // The bass walks: root, root, fifth, and a step up into the next chord.
      const root = above(c.bass, 31);
      const walk = [root, root, above((c.root + 7) % 12, 31), above(chordAt(b + 1).bass, 31) - 2][k];
      low.note(contra, walk, at(b), 0.38, k === 0 ? 0.8 : 0.62, { attack: 0.002, release: 0.2 });
      if (k === 1) low.note(contra, root, at(b + 0.5), 0.2, 0.5, { attack: 0.002, release: 0.15 });
      if (has("p")) for (const off of half ? (k === 0 ? [0] : []) : [0.5]) {
        voice(c, 58, 74, 3).forEach((n, i) => piano.note(upright, n, at(b + off), half ? 1.6 : 0.14, half ? 0.55 : k % 2 ? 0.6 : 0.48, { attack: 0.002, release: half ? 0.8 : 0.16, pan: -0.15 + i * 0.12 }));
      }
      if (has("m")) {
        const notes = voice(c, 67, 84, 4);
        // Named an octave below what it sounds (measured), so it's asked for an octave down.
        [0, 2, 1, 3].forEach((n, i) => i % 2 === 0 || k % 2 ? wood.note(bars, notes[n] - 12, at(b + i / 4), 0.25, i === 0 ? 0.6 : 0.42, { ...SHORT, pan: 0.25 - i * 0.12 }) : undefined);
      }
    }
    if (!has("v")) return;
    for (let base = from; base < to; base += 8) for (const [d, n] of hook) {
      if (base + d >= to) continue;
      // Nudged onto the chord of the moment, so it never rubs.
      const pcs = chordAt(base + d).pcs;
      const fit = [0, -1, 1, -2, 2].map((x) => n + x).find((x) => pcs.includes(((x % 12) + 12) % 12)) ?? n;
      high.note(violins, fit, at(base + d), 0.3, d % 4 === 0 ? 0.75 : 0.58, { attack: 0.002, release: 0.3, pan: -0.2 });
    }
  };

  /** A bright marimba note, for a tick or a star. `pitch` as it should sound. */
  const chime = (pitch: number, t: number) => wood.note(bars, pitch - 12, t, 0.5, 0.95, { attack: 0.002, release: 0.5 });

  const finish = (file: string, scenes: Record<string, { from: number; to: number }>) => {
    const out = s.master({ target: -16, fade: 1.2 });
    writeWav(file, out.L, out.R);
    console.log(`  ${out.loudness.toFixed(1)} LUFS, limiter took at most ${out.reduced.toFixed(1)} dB`);
    for (const [name, sc] of Object.entries(scenes)) console.log(`  ${name.padEnd(9)} ${loudnessOf(out.L, out.R, at(sc.from), at(sc.to)).toFixed(1)} LUFS`);
  };

  return { sfx, drums, tiptoe, hit, ring, groove, chime, finish };
}
