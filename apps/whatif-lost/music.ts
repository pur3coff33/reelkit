// EP 07's sound, all made here: a warm sunset that goes cold, tension and a pulse as she walks deeper, a calm,
// steady turn at S.T.O.P., then a long held night, and relief when the beams turn. Under it: the forest at dusk and at
// night, footsteps on leaves, her breathing hard, a whistle, voices of the search team as a distant murmur.
import { Mix, hz, riser } from "../../src/kit/music/synth";
import { birdsong, crickets, drone, murmur, sting, wind } from "../../src/kit/whatif/score";
import { heartbeat, step, whistle } from "../../src/kit/whatif/campsound";
import { hit, piano, play, taiko } from "../typhoon/music";
import { BLASTS, SECONDS, SHOTS, SLAMS, STAMPS } from "./timeline";

const BPM = 120;

function score(m: Mix) {
  sting(m, 0.15, "A", 0.32);
  play(m, { from: 3.6, to: 9.6, bpm: BPM, chords: ["F", "C"], str: 0.22, bright: 2200, sub: 0.14 });
  for (const [at, n] of [[3.8, "A4"], [4.6, "C5"], [5.4, "E5"], [7.0, "D5"]] as const) m.add(piano(hz(n), 2.5), at, 0.18, 0.15, 0.6);
  play(m, { from: 9.6, to: 20, bpm: BPM, chords: ["Am", "F", "Dm", "E"], str: 0.24, bright: 1600, sub: 0.22, drive: 0.16, div: 2, swell: true });
  play(m, { from: 20, to: 23, bpm: BPM, chords: ["Dm", "E"], beatsPerChord: 2, str: 0.3, bright: 2200, sub: 0.3, drive: 0.32, div: 4, drums: 0.45 });
  m.add(riser(1.2), 23.05 - 1.2, 0.35, 0, 0.4);
  hit(m, 23.05, "Am", 1.0, 2.2);
  // S.T.O.P.: everything settles to a held chord, then a patient night.
  play(m, { from: 25, to: 42, bpm: BPM, chords: ["Am", "F", "C", "G"], str: 0.2, bright: 1400, sub: 0.16 });
  for (const s of STAMPS) m.add(piano(hz("A3"), 2.5), s.at, 0.2, 0, 0.6);
  play(m, { from: 42, to: 45.6, bpm: BPM, chords: ["Am", "F"], str: 0.24, bright: 1700, sub: 0.2, drive: 0.14, div: 2, swell: true });
  play(m, { from: 45.6, to: 52, bpm: BPM, chords: ["F", "C", "G", "Am"], str: 0.3, bright: 2300, sub: 0.24, drive: 0.18, div: 2 });
  play(m, { from: 52, to: 55.5, bpm: BPM, chords: ["F", "C", "G", "A"], beatsPerChord: 2, str: 0.36, bright: 2600, sub: 0.3, drive: 0.26, div: 4, drums: 0.48 });
  for (const s of SLAMS.slice(1)) m.add(taiko(1.4), s.at, 0.85, 0, 0.3);
  sting(m, 55.55, "A", 0.55);
  m.add(drone(hz("A2"), 4.5, 600), 55.5, 0.3, 0, 0.6);
}

function effects(m: Mix) {
  m.add(birdsong(9, 3, 0.6), 3.6, 0.07, 0.3, 0.3);
  m.add(wind(SECONDS, 4, 0.2), 0, 0.05, 0, 0.2);
  m.add(crickets(SHOTS.final.from - SHOTS.dusk.from, 5), SHOTS.dusk.from, 0.07, 0, 0.2);
  for (let at = SHOTS.fork.from; at < SHOTS.stop.from; at += at > 20 ? 0.28 : 0.42) m.add(step(Math.round(at * 100)), at, 0.2, 0.1, 0.1);
  for (let t = 19; t < 26; t += t < 23 ? 0.45 : 0.62) m.add(heartbeat(Math.round(t * 10)), t, 0.5, 0, 0.05);
  BLASTS.forEach((b, i) => { if (i % 3 === 0) m.add(whistle(3, 0.5, 0.2), b, 0.32, 0, 0.5); });
  m.add(murmur(SHOTS.found.from - 43, 6, 0.3), 43, 0.06, -0.4, 0.6);
  m.add(birdsong(SECONDS - SHOTS.found.from, 7, 0.7), SHOTS.found.from, 0.08, 0.3, 0.3);
}

export function writeMusic(file: string) {
  const m = new Mix(SECONDS + 0.5);
  score(m);
  effects(m);
  m.finish(1.2);
  m.write(file);
}
