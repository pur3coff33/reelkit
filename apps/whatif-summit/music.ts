// EP 06's sound, all made here: a bright, open G-major sunrise that turns to a driving minor storm score, over the
// mountain's sounds: a breeze, then howling wind, rain, flapping tents, a pole snapping, thunder, the station's calm.
import { Mix, hz, riser } from "../../src/kit/music/synth";
import { birdsong, drone, sting, wind } from "../../src/kit/whatif/score";
import { flapping, snap, thunder } from "../../src/kit/whatif/campsound";
import { hit, piano, play, rain, taiko, windHowl } from "../typhoon/music";
import { SECONDS, SHOTS, SLAMS, STAMPS, STRIKES, SUMMIT_STRIKE } from "./timeline";

const BPM = 120;

function score(m: Mix) {
  sting(m, 0.15, "G", 0.32);
  // Sunrise: open and warm.
  play(m, { from: 3.6, to: 9.6, bpm: BPM, chords: ["C", "F"], str: 0.24, bright: 2600, sub: 0.14 });
  for (const [at, n] of [[3.8, "G4"], [4.4, "C5"], [5.0, "E5"], [6.2, "D5"], [7.4, "C5"]] as const) m.add(piano(hz(n), 2.5), at, 0.2, 0.15, 0.6);
  play(m, { from: 9.6, to: 14, bpm: BPM, chords: ["Am", "F"], str: 0.26, bright: 1700, sub: 0.22, drive: 0.18, div: 2, swell: true });
  play(m, { from: 14, to: 26, bpm: BPM, chords: ["Dm", "Bb", "Gm", "A"], str: 0.3, bright: 2000, sub: 0.3, drive: 0.28, div: 4, drums: 0.4 });
  m.add(riser(1.4), 26.05 - 1.4, 0.35, 0, 0.4);
  hit(m, 26.05, "Dm", 1.1, 2.2);
  play(m, { from: 27, to: 30, bpm: BPM, chords: ["Bb", "A"], str: 0.24, bright: 1400, sub: 0.2 });
  play(m, { from: 30, to: 43, bpm: BPM, chords: ["Dm", "F", "Gm", "A"], str: 0.32, bright: 2100, sub: 0.3, drive: 0.3, div: 4, drums: 0.44, swell: true });
  for (const s of STAMPS) { m.add(riser(1), s.at - 1, 0.25, 0, 0.4); hit(m, s.at, s.count === 6 ? "F" : "Gm", 0.8, 1.6); }
  play(m, { from: 43, to: 51.5, bpm: BPM, chords: ["F", "C", "Dm", "Bb"], str: 0.26, bright: 1900, sub: 0.2, drive: 0.12, div: 2 });
  play(m, { from: 51.5, to: 55.5, bpm: BPM, chords: ["C", "G", "Am", "F"], beatsPerChord: 2, str: 0.36, bright: 2600, sub: 0.3, drive: 0.24, div: 4, drums: 0.46 });
  for (const s of SLAMS.slice(1)) m.add(taiko(1.4), s.at, 0.85, 0, 0.3);
  sting(m, 55.55, "G", 0.55);
  m.add(drone(hz("G2"), 4.5, 600), 55.5, 0.3, 0, 0.6);
}

function effects(m: Mix) {
  m.add(wind(12.6, 3, 0.2), 0, 0.08, 0, 0.2);
  m.add(birdsong(9, 4, 0.4), 0.5, 0.06, 0.3, 0.3);
  m.add(windHowl(SHOTS.forest.from - 12, 5, 0.9), 12, 0.32, 0, 0.2);
  m.add(windHowl(SHOTS.ranger.from - SHOTS.forest.from, 6, 0.3), SHOTS.forest.from, 0.14, 0, 0.2);
  m.add(rain(SHOTS.ranger.from - 15.5, 7), 15.5, 0.18, 0, 0.2);
  m.add(flapping(SHOTS.descend.from - 12.6, 8, 0.8), 12.6, 0.22, 0.3, 0.1);
  m.add(snap(20), 20.6, 0.7, 0.3, 0.2);
  m.add(snap(21), 20.75, 0.4, 0.4, 0.2);
  STRIKES.forEach((s, i) => m.add(thunder(4, 30 + i, s === SUMMIT_STRIKE ? 1 : 0.4), s + (s === SUMMIT_STRIKE ? 0.05 : 0.8), s === SUMMIT_STRIKE ? 0.85 : 0.4, 0, 0.4));
  m.add(rain(SHOTS.final.from - SHOTS.ranger.from, 9), SHOTS.ranger.from, 0.07, 0, 0.3);
  m.add(wind(SECONDS - SHOTS.final.from, 10, 0.15), SHOTS.final.from, 0.06, 0, 0.2);
  m.add(birdsong(SECONDS - SHOTS.final.from, 11, 0.5), SHOTS.final.from, 0.06, 0.3, 0.3);
}

export function writeMusic(file: string) {
  const m = new Mix(SECONDS + 0.5);
  score(m);
  effects(m);
  m.finish(1.2);
  m.write(file);
}
