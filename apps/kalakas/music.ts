// The soundtrack: the same theme as a new arrangement on this reel's clock. Piano and growing strings while the storm
// forms, a march as it travels, calm on the beach tightening to full weight at the surge, then the major key as people
// come back, and bare piano under the tally. The roar of the storm is the one effect allowed to compete with it.
import { Mix, SR, pluck, hz, riser, svf } from "../../src/kit/music/synth";
import { CH, THEME, THEME_MAJOR, crack, hit, oct, piano, play, rain, shaped, strings, surf, taiko, thud, tune, windHowl } from "../typhoon/music";
import { LANDFALL_T, SECONDS } from "./timeline";

function score(m: Mix) {
  // 0:00 The hook: one low hit under the finished storm.
  play(m, { from: 0, to: 4, bpm: 60, chords: ["Dm"], str: 0.4, bright: 1500, sub: 0.3 });
  m.add(taiko(1.2), 0.1, 0.7, 0, 0.5);
  // 0:03 How it forms: the theme alone, the strings gathering behind it.
  play(m, { from: 4, to: 13, bpm: 72, chords: ["Dm", "Bb"], str: 0.34, bright: 1500, sub: 0.14 });
  tune(m, THEME, 4.2, 72, "piano", 0.5);
  play(m, { from: 13, to: 18, bpm: 72, chords: ["F", "C", "Dm", "Bb"], str: 0.44, bright: 1900, sub: 0.24, drive: 0.24 });
  tune(m, oct(THEME.slice(0, 7), -1), 13.3, 72, "lead", 0.24);
  // 0:18 The eye opens.
  m.add(riser(2), 18, 0.3, 0, 0.4);
  hit(m, 20, "Dm", 0.7);
  play(m, { from: 20, to: 25, bpm: 84, chords: ["Dm", "Bb", "Gm", "A"], beatsPerChord: 2, str: 0.55, bright: 2400, sub: 0.36, drive: 0.38, div: 3, drums: 0.4 });
  // 0:25 It moves, and how big it is.
  play(m, { from: 25, to: 33, bpm: 84, chords: ["Gm", "Eb", "Bb", "A"], str: 0.56, bright: 2500, sub: 0.38, drive: 0.42, div: 3, drums: 0.5, swell: true });
  tune(m, oct(THEME, -1), 25.4, 84, "lead", 0.32);
  m.add(riser(1.2), 31.9, 0.3, 0, 0.4);
  hit(m, 33.1, "Dm", 0.8, 2);
  play(m, { from: 33.1, to: 37, bpm: 96, chords: ["Dm", "Bb"], str: 0.62, bright: 2800, sub: 0.44, drive: 0.44, div: 4, drums: 0.66 });
  m.add(riser(1), 36.9, 0.3, 0, 0.4);
  // 0:37 Into the eye: the music falls away to one held chord.
  hit(m, 37.9, "Gm", 0.9, 1.4);
  m.add(strings(CH.Gm.map(hz), 2.5, { attack: 0.3, release: 1, bright: 1300 }), 37.5, 0.5, 0, 0.7);
  // 0:40 The beach, 72 hours out: quiet, almost pretty.
  play(m, { from: 40, to: 48, bpm: 72, chords: ["F", "C", "Dm", "Bb"], str: 0.4, bright: 1700, sub: 0.16 });
  tune(m, oct(THEME_MAJOR, -1).slice(0, 9), 40.5, 72, "piano", 0.46);
  // 0:48 Getting ready: the pulse starts.
  play(m, { from: 48, to: 56, bpm: 84, chords: ["Dm", "Bb", "Gm", "A"], str: 0.5, bright: 2100, sub: 0.3, drive: 0.36, div: 2, drums: 0.3, swell: true });
  // 0:56 The empty road: thin and held.
  play(m, { from: 56, to: 59, bpm: 72, chords: ["Gm"], str: 0.42, bright: 1200, sub: 0.28 });
  m.add(riser(3), 56.1, 0.32, 0, 0.4);
  // 0:59 The wind climbs, and at landfall the theme comes in full.
  hit(m, 59, "Dm", 0.65, 1.2);
  play(m, { from: 59, to: LANDFALL_T, bpm: 96, chords: ["Dm", "Bb"], str: 0.62, bright: 2900, sub: 0.46, drive: 0.44, div: 4, drums: 0.66 });
  hit(m, LANDFALL_T, "Dm", 1, 2);
  play(m, { from: LANDFALL_T, to: 71, bpm: 96, chords: ["Dm", "Bb", "Gm", "A"], str: 0.72, bright: 3100, sub: 0.5, drive: 0.5, div: 4, drums: 0.82 });
  tune(m, oct(THEME, -1), LANDFALL_T + 0.3, 96, "lead", 0.46);
  tune(m, THEME, LANDFALL_T + 0.3, 96, "high", 0.14, 0.2);
  hit(m, 61, "Bb", 0.5, 0.9);
  hit(m, 63.5, "Gm", 0.55, 1);
  hit(m, 66, "A", 0.7, 1.4);
  // 1:11 The water falling: everything has stopped but a few notes.
  m.add(strings(CH.Dm.map(hz), 5, { attack: 0.3, release: 2, bright: 1000 }), 71, 0.42, 0, 0.7);
  play(m, { from: 74.4, to: 80, bpm: 60, chords: ["Dm", "Bb"], str: 0.36, bright: 1300, sub: 0.18 });
  tune(m, oct(THEME.slice(0, 7), -1), 74.6, 72, "piano", 0.46);
  // 1:20 They come back: the major key.
  play(m, { from: 80, to: 85, bpm: 72, chords: ["F", "C", "Bb", "F"], beatsPerChord: 2, str: 0.55, bright: 2600, sub: 0.3, drive: 0.2 });
  tune(m, oct(THEME_MAJOR.slice(0, 7), -1), 80.1, 72, "lead", 0.32);
  // 1:25 The cost: only the piano.
  play(m, { from: 85, to: 92.4, bpm: 60, chords: ["Dm", "Bb"], str: 0.26, bright: 1000, sub: 0.1 });
  for (const [at, n] of [[85.4, "D4"], [87.4, "F4"], [89.6, "A3"]] as const) m.add(piano(hz(n), 3), at, 0.5, 0, 0.6);
  // The comparison, then the message on the theme's opening, major.
  m.add(piano(hz("Bb3"), 3), 92.4, 0.55, 0, 0.6);
  m.add(strings(CH.Bb.map(hz), 4.1, { attack: 0.9, release: 0.6, bright: 1700 }), 92.4, 0.4, 0, 0.7);
  m.add(riser(1.4), 95.1, 0.2, 0, 0.5);
  hit(m, 96.5, "F", 0.85, 1.4);
  m.add(strings(CH.F.map(hz), 3.5, { attack: 0.02, release: 2.4, bright: 2600 }), 96.5, 0.62, 0, 0.7);
  m.add(piano(hz("F4"), 3), 96.52, 0.42, 0, 0.7);
  m.add(piano(hz("C5"), 3), 96.8, 0.32, 0, 0.7);
}

function effects(m: Mix) {
  m.add(surf(4.5, 41, 0.14), 4, 0.12);
  m.add(surf(8, 42, 0.17), 40, 0.15);
  for (let at = 46.5; at < 52; at += 0.44) m.add(thud(Math.round(at * 10)), at, 0.12, 0.25 * Math.sin(at), 0.3);
  m.add(windHowl(6, 43, 0.5), 54, 0.09);
  m.add(rain(7, 44), 54, 0.03);
  // The storm: this is where the roar gets to match the music.
  m.add(windHowl(13, 45, 1), 59, 0.22, 0.08, 0.2);
  m.add(windHowl(13, 46, 0.8), 59, 0.19, -0.08, 0.2);
  m.add(rain(13, 47), 59, 0.05);
  const surgeRoar = svf(shaped(11, 48, (t, r) => r * Math.min(1, t / 3) * Math.min(1, (11 - t) / 1.4)), (t) => 240 + t * 90, 0.8, "low");
  m.add(surgeRoar, LANDFALL_T - 1, 0.62);
  for (const [at, s] of [[61.1, 1.2], [62.8, 0.9], [64.4, 1.4], [66.3, 1], [68.2, 1.3]] as const) m.add(crack(Math.round(at * 3), s), at, 0.3, Math.sin(at * 2) * 0.4, 0.2);
  m.add(surf(6, 49, 0.08), 74, 0.08);
  m.add(rain(5, 50), 72, 0.03);
  for (let at = 80.2; at < 85; at += 0.68) m.add(thud(Math.round(at * 7)), at, 0.08, -0.3, 0.5);
  for (const at of [85.4, 87.4]) m.add(pluck(hz("A2"), 0.5), at, 0.05, 0, 0.3);
}

export function writeMusic(file: string) {
  const length = SECONDS + 0.5;
  const mus = new Mix(length), fx = new Mix(length);
  score(mus);
  effects(fx);
  const m = new Mix(length);
  for (let i = 0; i < m.L.length; i++) {
    m.L[i] = mus.L[i] + fx.L[i];
    m.R[i] = mus.R[i] + fx.R[i];
    m.wetL[i] = mus.wetL[i] + fx.wetL[i];
    m.wetR[i] = mus.wetR[i] + fx.wetR[i];
  }
  m.finish(0.8);
  m.write(file);
  void SR;
  console.log(`  ✓ score and effects → ${file}`);
}
