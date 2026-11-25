// FixtMan's score: a sneaky pizzicato tiptoe while the jobs don't get done, a drill, then a bouncy groove in G from the moment
// the logo's roof lands. Plucked bass and strings, upright piano and marimba are real (VSCO 2 CE); drums and effects are drawn.
import { instrument } from "../../src/kit/music/sampler";
import { Session, above, loudnessOf, parseChord, seeded, voice } from "../../src/kit/music/studio";
import { SR, clap, hat, impact, kick, riser, svf, writeWav } from "../../src/kit/music/synth";
import { BPM, CUES, JOBS, SCENES, TOTAL_BEATS } from "./timeline";

const BEAT = 60 / BPM;
const at = (beat: number) => beat * BEAT;
const CYCLE = ["G", "D", "Em", "C"];
/** The groove's chords, a bar each, counted from the logo's beat. */
const chordAt = (beat: number) => parseChord(CYCLE[Math.floor((beat - SCENES.brand.from) / 4) % 4]);

const tone = (seconds: number, f: (t: number, i: number) => number) => Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => f(i / SR, i));

/** A woodblock tick: the clock on the wall. */
const tick = (high: boolean) => tone(0.09, (t) => (Math.sin(2 * Math.PI * (high ? 1650 : 1240) * t) + 0.5 * Math.sin(2 * Math.PI * (high ? 2710 : 2050) * t)) * Math.exp(-t * 70));

/** A cordless drill: a buzzing motor that whines up, then dies. */
function drill(seconds: number) {
  const rnd = seeded(5);
  let phase = 0;
  const raw = tone(seconds, (t) => {
    const up = Math.min(1, t / 0.12), die = Math.max(0, (t - seconds + 0.35) / 0.35);
    phase += (95 + 130 * up) * (1 - 0.75 * die * die) / SR;
    const saw = 2 * (phase % 1) - 1, whine = Math.sin(2 * Math.PI * phase * 9);
    return (saw * 0.5 + whine * 0.28 + (rnd() * 2 - 1) * 0.16) * up * (1 - die);
  });
  return svf(svf(raw, 3600, 0.8, "low"), 140, 0.7, "high");
}

/** Air moving as the house opens. */
function whoosh() {
  const rnd = seeded(9);
  return svf(tone(0.5, (t) => (rnd() * 2 - 1) * Math.sin((Math.PI * t) / 0.5) ** 2), (t) => 500 + 5200 * t, 0.9, "band");
}

/** A knock: something heavy set on a wooden floor. */
const knock = () => tone(0.25, (t) => Math.sin(2 * Math.PI * (70 + 90 * Math.exp(-t * 40)) * t) * Math.exp(-t * 18) + 0.4 * Math.sin(2 * Math.PI * 410 * t) * Math.exp(-t * 55));

/** Marker on paper: the list being struck. */
function strike() {
  const rnd = seeded(3);
  return svf(tone(0.2, (t) => (rnd() * 2 - 1) * Math.min(1, t * 60) * (1 - t / 0.2)), 2900, 1.2, "band");
}

/** What plays in each stretch of the groove: k kick, c clap, p piano stabs, m marimba, v plucked violins, h hats, b bass. */
const GROOVE: [from: number, to: number, plays: string][] = [
  [SCENES.brand.from + 1, SCENES.pro.from, "kb"],
  [SCENES.pro.from, SCENES.jobs.from, "kcphb"],
  [SCENES.jobs.from, SCENES.zip.from, "kcpvhb"],
  [SCENES.zip.from, SCENES.price.from, "kmb"],
  [SCENES.price.from, SCENES.time.from, "kcmhb"],
  [SCENES.time.from, SCENES.ready.from, "kcphb"],
  [SCENES.ready.from, SCENES.warranty.from, "kcpmhb"],
  [SCENES.warranty.from, SCENES.stars.from, "cpb"],
  [SCENES.stars.from, SCENES.ask.from, "kcpvmhb"],
  [SCENES.end.from + 1, 116, "kcpvhb"],
];

export async function writeMusic(file: string) {
  const [contra, violins, cellos, upright, bars] = await Promise.all([
    instrument("Strings/Solo Contrabass/Pizz"),
    instrument("Strings/Violin Section/Pizz"),
    instrument("Strings/Cello Section/pizzT"),
    instrument("Keys/Upright Nr1", /_(pp|mf)_/),
    instrument("Percussion/Marimba"),
  ]);
  const s = new Session(TOTAL_BEATS * BEAT, 4);
  const room = (mix: number) => ({ seconds: 1.4, mix, gap: 0.015 });
  const piano = s.stem("piano", { lufs: -23, low: 120, high: 6500, hall: room(0.22), loose: { time: 0.008, velocity: 0.1 } });
  const low = s.stem("bass", { lufs: -21, high: 1800, warmth: 0.45, hall: room(0.08), loose: { time: 0.006, velocity: 0.08 } });
  const high = s.stem("violins", { lufs: -25, low: 200, high: 7500, hall: room(0.3), loose: { time: 0.01, velocity: 0.1 } });
  const mid = s.stem("cellos", { lufs: -25, low: 90, high: 5000, hall: room(0.25), loose: { time: 0.01, velocity: 0.1 } });
  const wood = s.stem("marimba", { lufs: -26, low: 160, high: 7000, hall: room(0.28), loose: { time: 0.008, velocity: 0.12 } });
  const drums = s.stem("drums", { lufs: -21, hall: { seconds: 0.7, mix: 0.1, gap: 0.01 } });
  const sfx = s.stem("effects", { lufs: -24, hall: room(0.15) });

  // The tiptoe, in E minor: bass and cellos trade, the violins answer, the clock ticks. Twice: at the start and in the garage.
  const tiptoe = (from: number, to: number) => {
    const bassline = ["E2", "B2", "E2", "B2", "C2", "G2", "B1", "F#2"];
    const answer: [number, string][] = [[0.5, "G4"], [1, "F#4"], [1.5, "E4"], [2.5, "B4"], [4.5, "E4"], [5, "G4"], [5.5, "E4"], [6.5, "D#4"], [7, "F#4"]];
    for (let b = from; b < to; b++) {
      const k = (b - from) % 8;
      low.note(contra, bassline[k], at(b), 0.35, k % 2 ? 0.5 : 0.68, { attack: 0.002, release: 0.25 });
      if (k % 2) mid.note(cellos, k < 4 ? "G3" : "F#3", at(b), 0.3, 0.5, { attack: 0.002, release: 0.25, pan: 0.2 });
      drums.add(tick(k % 2 === 0), at(b), 0.22, 0.3);
      drums.add(tick(false), at(b + 0.5), 0.1, 0.3);
    }
    for (const base of [from, from + 8, from + 16]) for (const [d, n] of answer) if (base + d < to) high.note(violins, n, at(base + d), 0.3, 0.55, { attack: 0.002, release: 0.3, pan: -0.25 });
  };
  tiptoe(0, SCENES.drill.from);
  for (const b of [0, SCENES.bed.from, SCENES.swing.from, SCENES.ask.from]) sfx.add(knock(), at(b), 0.9);
  // The days land.
  for (const t of [80, 120 + 28, 180 + 60]) sfx.add(knock(), t / 30, 0.7);
  tiptoe(SCENES.ask.from, SCENES.end.from);

  // The drill, then nothing, then the logo.
  sfx.add(drill(0.8), at(SCENES.drill.from) + 0.02, 0.55);
  sfx.add(knock(), CUES.drillDown + 0.42, 1);
  const hit = (beat: number, gain = 1) => {
    drums.add(kick(1.4), at(beat), gain);
    drums.add(clap(), at(beat), 0.3 * gain);
    sfx.add(impact(), at(beat), 0.55 * gain);
  };
  const ring = (beat: number, name: string, seconds: number) => {
    const c = parseChord(name);
    voice(c, 55, 74, 4).forEach((n, i) => piano.note(upright, n, at(beat) + i * 0.012, seconds, 0.75, { attack: 0.002, release: 1.2, pan: -0.15 + i * 0.1 }));
    [above(c.root, 67), above(c.root, 79)].forEach((n) => high.note(violins, n, at(beat), 0.6, 0.8, { attack: 0.002, release: 0.5 }));
    low.note(contra, above(c.bass, 31), at(beat), 1, 0.85, { attack: 0.002, release: 0.7 });
  };
  hit(SCENES.brand.from);
  ring(SCENES.brand.from, "G", 1);
  sfx.add(knock(), at(SCENES.brand.from) + 0.1, 1.2);

  for (const [from, to, plays] of GROOVE) {
    const has = (x: string) => plays.includes(x);
    const half = !has("k");
    for (let b = from; b < to; b++) {
      const c = chordAt(b), k = (b - SCENES.brand.from) % 4;
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
        [0, 2, 1, 3].forEach((n, i) => i % 2 === 0 || k % 2 ? wood.note(bars, notes[n] - 12, at(b + i / 4), 0.25, i === 0 ? 0.6 : 0.42, { attack: 0.002, release: 0.25, pan: 0.25 - i * 0.12 }) : undefined);
      }
    }
    // The hook, plucked: two bars, up to the sixth and home.
    if (has("v")) {
      const hook: [number, number][] = [[0, 74], [0.5, 79], [1, 83], [2, 81], [2.5, 79], [3, 76], [4, 74], [4.5, 78], [5, 81], [6, 79], [7, 74], [7.5, 76]];
      for (let base = from; base < to; base += 8) for (const [d, n] of hook) {
        if (base + d >= to) continue;
        // Nudged onto the chord of the moment, so it never rubs.
        const pcs = chordAt(base + d).pcs;
        const fit = [0, -1, 1, -2, 2].map((x) => n + x).find((x) => pcs.includes(((x % 12) + 12) % 12)) ?? n;
        high.note(violins, fit, at(base + d), 0.3, d % 4 === 0 ? 0.75 : 0.58, { attack: 0.002, release: 0.3, pan: -0.2 });
      }
    }
  }

  // Into each new part: air as the house opens, a hit on the cut.
  for (const scene of ["pro", "zip", "time", "warranty", "stars", "end"] as const) sfx.add(whoosh(), at(SCENES[scene].from) - 0.1, 0.8);
  for (const scene of ["pro", "jobs", "zip", "ready", "warranty", "stars"] as const) hit(SCENES[scene].from, 0.55);
  for (const j of JOBS.slice(1)) sfx.add(knock(), j.at, 0.45);
  sfx.add(riser(1.2), at(SCENES.warranty.from) - 1.2, 0.3);
  sfx.add(riser(1.5), at(SCENES.stars.from) - 1.5, 0.3);
  sfx.add(knock(), CUES.noFees, 0.8);
  sfx.add(knock(), CUES.sameDay, 0.8);
  sfx.add(impact(), CUES.thirty, 0.4);
  sfx.add(whoosh(), CUES.redo - 0.35, 0.8);
  // A bright note per tick, star and struck line.
  CUES.ready.forEach((t, i) => wood.note(bars, [67, 71, 74][i], t, 0.5, 0.95, { attack: 0.002, release: 0.5 }));
  [67, 71, 74, 79, 83].forEach((n, i) => wood.note(bars, n, CUES.rating + 0.1 + i * (4 / 30), 0.5, 0.9, { attack: 0.002, release: 0.5 }));
  CUES.struck.forEach((t) => sfx.add(strike(), t, 0.7));

  hit(SCENES.end.from, 0.8);
  ring(SCENES.end.from, "G", 0.8);
  hit(CUES.logo / BEAT, 0.8);
  sfx.add(knock(), CUES.logo + 0.07, 1);
  hit(116, 1);
  ring(116, "G", 1.6);

  const out = s.master({ target: -16, fade: 1.2 });
  writeWav(file, out.L, out.R);
  console.log(`  ${out.loudness.toFixed(1)} LUFS, limiter took at most ${out.reduced.toFixed(1)} dB`);
  for (const [name, sc] of Object.entries(SCENES)) console.log(`  ${name.padEnd(9)} ${loudnessOf(out.L, out.R, at(sc.from), at(sc.to)).toFixed(1)} LUFS`);
}
