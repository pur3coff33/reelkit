// Part 01-birdland, the sound:
//   Birdland (b1–b5)        a slow jazz ballad on the upright (ii–V–I–vi in D, 66 BPM, rolled voicings, a little
//                           melody), the bass under it; it stops on "the jazz stopped", one chord left hanging
//   Westwood (b7–b11)       cold: a low cello and bass drone, a clock ticking, typewriter keys as the court's words type
//   the refit (b12)         the cello rises; the clock stops
//   students (b13)          the club's own track, far off down the street, coming nearer
//   the memorial (b14)      the track falls away; the film's falling figure (A – G – E … D – E) once, quietly
//   room for 35 (b15)       near silence; one low note on "thirty-five"
import { readFileSync } from "node:fs";
import { leanBack } from "../../../../src/kit/music/narration";
import { Session, above, parseChord, seeded, voice } from "../../../../src/kit/music/studio";
import { SR, svf, writeWav } from "../../../../src/kit/music/synth";
import { outDir } from "../../../../src/kit/paths";
import { snap } from "../../../../src/kit/whatif/campsound";
import { BULBS, offAt, lightsOut } from "../../marquee";
import { checkFresh, clubTrack, loadInstruments, narrate, throughWalls } from "../../sound";
import { LAYOUT } from "./layout.gen";
import { SCRIPT } from "./script";

const BEAT = 60 / 66, BAR = 4 * BEAT;
const CHANGES = ["Em9", "A9sus4", "Dmaj9", "Bm9", "Gmaj9", "F#m7", "Em9", "A9sus4"];
/** A little tune over the changes: [bar, beat, note, beats long]. */
const TUNE: [number, number, string, number][] = [
  [0, 1, "B4", 1.5], [0, 2.5, "A4", 0.5], [0, 3, "F#4", 1], [1, 0, "E4", 2.5], [1, 3, "C#5", 1],
  [2, 0, "E5", 1.5], [2, 1.5, "C#5", 0.5], [2, 2, "A4", 2], [3, 1, "F#4", 1], [3, 2, "A4", 1], [3, 3, "B4", 1],
  [4, 0, "D5", 2], [4, 2.5, "B4", 1.5], [5, 0, "C#5", 1], [5, 1, "A4", 2], [6, 1, "G4", 1], [6, 2, "F#4", 1], [6, 3, "E4", 1],
];

export async function writeMusic(file: string) {
  const L = LAYOUT, l = L.lines, S = L.spoken;
  checkFresh(SCRIPT, L, JSON.parse(readFileSync(outDir("ozone", "parts", SCRIPT.id, "voice.json"), "utf8")).lines);
  const { upright, cellos, contra } = await loadInstruments();
  const s = new Session(L.seconds, 21);
  const lines = narrate(s, SCRIPT, L);
  const jazzEnd = l.b6 + S.b6, cold = l.b7 - 0.3, refit = l.b12, students = l.b13 - 0.4, memorial = l.b14 - 0.3, last = l.b15 + S.b15 - 0.9;

  // ── Birdland: the ballad, from the chapter card until "the jazz stopped".
  const piano = s.stem("piano", { lufs: -22, low: 60, high: 5200, hall: { seconds: 2.8, mix: 0.35, gap: 0.04 }, loose: { time: 0.04, velocity: 0.12 } });
  const bass = s.stem("bass", { lufs: -27, high: 900, warmth: 0.5, hall: { seconds: 2.4, mix: 0.2, gap: 0.02 }, loose: { time: 0.03, velocity: 0.06 } });
  const start = 0.6;
  let prev: number[] | undefined;
  for (let bar = 0; start + bar * BAR < l.b6; bar++) {
    const at = start + bar * BAR, c = parseChord(CHANGES[bar % CHANGES.length]);
    const v = voice(c, 57, 74, 4, prev);
    prev = v;
    const root = above(c.bass, 38);
    piano.note(upright, root, at, BAR + 0.5, 0.24, { attack: 0.003, release: 1.8, pan: -0.12 });
    // A rolled chord on beat 1 and a lighter echo of it on the "and" of 3, so it swings a little.
    v.forEach((n, k) => piano.note(upright, n, at + 0.03 + k * 0.035, BAR * 0.7, 0.2 + 0.02 * k, { attack: 0.003, release: 1.6, pan: 0.05 * k }));
    v.slice(1).forEach((n, k) => piano.note(upright, n, at + 2.5 * BEAT + k * 0.02, BEAT * 1.2, 0.13, { attack: 0.003, release: 1.2, pan: 0.08 }));
    bass.note(contra, above(c.bass, 26), at, BAR - 0.1, 0.3, { attack: 0.25, release: 0.8 });
    for (const [b, beat, n, len] of TUNE) if (b === bar % 8) piano.note(upright, n, at + beat * BEAT, len * BEAT + 0.6, 0.3, { attack: 0.003, release: 1.4, pan: 0.15 });
  }
  // The last chord, left hanging and damped as the line ends.
  const hang = voice(parseChord("A9sus4"), 57, 74, 4, prev);
  hang.forEach((n, k) => piano.note(upright, n, l.b6 + 0.1 + k * 0.04, jazzEnd - l.b6 - 0.1, 0.22, { attack: 0.003, release: 0.25 }));
  piano.ride([[0, 0.85], [l.b0 - 0.2, 0.85], [l.b0 + 0.3, 0.6], [l.b5 + S.b5, 0.6], [l.b5 + S.b5 + 0.6, 0.9], [jazzEnd, 0.9], [jazzEnd + 0.01, 1]]);
  bass.ride([[0, 1], [l.b6 - 0.05, 1], [l.b6, 0]]);

  const fx = s.stem("effects", { lufs: -30, high: 8000 });
  // ── The sign: a faint mains hum while it's lit, and each bulb clicking out as the jazz stops.
  const out = lightsOut(l.b6, S.b6), signOn = l.b5 - 0.2, signOff = out.from + out.len * 0.95;
  const hum = new Float32Array(Math.ceil((signOff - signOn) * SR));
  for (let i = 0; i < hum.length; i++) {
    const t = i / SR, g = Math.min(1, t / 0.8) * Math.min(1, (hum.length / SR - t) / 0.15);
    hum[i] = g * (Math.sin(2 * Math.PI * 120 * t) * 0.5 + Math.sin(2 * Math.PI * 240 * t) * 0.25 + Math.sin(2 * Math.PI * 360 * t) * 0.12) * 0.05;
  }
  const sign = s.stem("sign", { lufs: -38, high: 2000 });
  sign.add(hum, signOn, 1);
  const bulbs = s.stem("bulbs", { lufs: -33, high: 7000 });
  BULBS.forEach(([x], i) => bulbs.add(svf(snap(3000 + i), 3200, 0.7, "band"), out.from + offAt(i) * out.len, 0.12 + 0.08 * ((i * 37) % 5) / 5, (x - 960) / 960 * 0.6));

  // ── Westwood: a cold drone, a clock, the court's words typed.
  const strings = s.stem("strings", { lufs: -25, low: 40, high: 3500, warmth: 0.3, hall: { seconds: 4.5, mix: 0.55, gap: 0.03 }, loose: { time: 0.1, velocity: 0.06 } });
  strings.note(cellos, "D2", cold, refit - cold + 1, 0.3, { attack: 2.5, release: 2, swell: 0.4 });
  strings.note(contra, "D1", cold + 1, refit - cold, 0.26, { attack: 3, release: 2 });
  strings.note(cellos, "A2", l.b10, refit - l.b10, 0.24, { attack: 2, release: 2, swell: 0.4 });
  // The refit: the cello climbs a step and grows, then lets go as the students arrive.
  strings.note(cellos, "B2", refit, students - refit + 1.5, 0.38, { attack: 1.6, release: 2, swell: 0.6 });
  strings.note(cellos, "D3", refit + 1.6, students - refit, 0.3, { attack: 1.6, release: 2, swell: 0.5 });
  for (let t = cold + 0.4; t < refit; t += 1.0) fx.add(svf(snap(Math.round(t * 7)), 2400, 0.8, "band"), t, 0.5);
  const rnd = seeded(5), typing = l.b10 + 0.2, typed = typing + (l.b11 - l.b10) * 0.75 * 0.6;
  for (let t = typing; t < typed; t += 0.07 + rnd() * 0.1) fx.add(snap(1000 + Math.round(t * 100)), t, 0.25 + rnd() * 0.2, rnd() * 0.4 - 0.2);

  // ── The students: the club's own track, far down the street, nearer as the line goes on; gone for the memorial.
  const club = s.stem("club track", { lufs: -27 });
  const len = memorial + 1.5 - students;
  const [cl, cr] = clubTrack(len, 9);
  const fl = throughWalls(cl), fr = throughWalls(cr);
  for (let i = 0; i < fl.length; i++) {
    const t = i / SR, g = Math.min(1, t / 1.5) * Math.max(0, Math.min(1, (len - t) / 1.6));
    fl[i] *= g;
    fr[i] *= g;
  }
  club.add([fl, fr], students);
  club.ride(leanBack(lines.filter((x) => x.at >= students - 1), 0.55));

  // ── The memorial: the falling figure, once. Room for 35: one low note.
  const motif = s.stem("motif", { lufs: -25, low: 60, high: 5000, hall: { seconds: 4.8, mix: 0.5, gap: 0.045 }, loose: { time: 0.02, velocity: 0.06 } });
  for (const [dt, n, d, v] of [[0.8, "A4", 1.6, 0.28], [2.4, "G4", 0.9, 0.25], [3.3, "E4", 1.8, 0.27], [5.1, "D4", 1, 0.23], [6.1, "E4", 2.6, 0.25]] as const) motif.note(upright, n, memorial + dt, d + 2, v, { attack: 0.003, release: 2.4 });
  motif.note(upright, "A2", memorial + 0.8, 6, 0.2, { attack: 0.003, release: 2.6 });
  motif.note(upright, "A1", last, 6, 0.3, { attack: 0.003, release: 3 });
  motif.note(cellos, "A2", last, L.seconds - last, 0.3, { attack: 0.8, release: 2.5, swell: 0.3 });

  const { L: left, R: right, reduced, loudness } = s.master({ target: process.env.OZONE_SCORE_ONLY ? -20 : -18, fade: 2 });
  writeWav(file, left, right);
  console.log(`  ${SCRIPT.id}: ${L.seconds.toFixed(1)} s, ${loudness.toFixed(1)} LUFS, limiter took ${reduced.toFixed(1)} dB (jazz ends ${jazzEnd.toFixed(2)}, students ${students.toFixed(2)})`);
}
