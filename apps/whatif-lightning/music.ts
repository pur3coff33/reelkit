// EP 08's sound, all made here: a bright afternoon that darkens, a ticking count after each flash with its thunder
// arriving on the beat the count ends, the buzz before the strike, the crack itself, then a tense rescue, a "rewind"
// and a calm close. Under it: wind, rain on tents.
import { Mix, hz, riser } from "../../src/kit/music/synth";
import { birdsong, crickets, drone, sting, wind } from "../../src/kit/whatif/score";
import { buzz, flapping, heartbeat, thunder } from "../../src/kit/whatif/campsound";
import { hit, piano, play, rain, staticNoise, taiko } from "../typhoon/music";
import { ALL_FLASHES, COUNT_STEP, FLASHES, SECONDS, SHOTS, SLAMS, STAMPS, STRIKE } from "./timeline";

const BPM = 120;

function score(m: Mix) {
  sting(m, 0.15, "C", 0.32);
  play(m, { from: 3.6, to: 9.6, bpm: BPM, chords: ["C", "F"], str: 0.22, bright: 2400, sub: 0.14 });
  for (const [at, n] of [[3.8, "E5"], [4.6, "G5"], [5.4, "C5"], [7.2, "D5"]] as const) m.add(piano(hz(n), 2.2), at, 0.16, 0.15, 0.6);
  play(m, { from: 9.6, to: 19.5, bpm: BPM, chords: ["Am", "F", "Dm", "E"], str: 0.24, bright: 1700, sub: 0.24, drive: 0.18, div: 2, swell: true });
  play(m, { from: 19.5, to: STRIKE, bpm: BPM, chords: ["Dm", "E"], beatsPerChord: 2, str: 0.3, bright: 2100, sub: 0.3, drive: 0.3, div: 4, drums: 0.4, swell: true });
  m.add(riser(2), STRIKE - 2, 0.4, 0, 0.4);
  hit(m, STRIKE, "Am", 1.3, 2.6);
  play(m, { from: 28, to: 39, bpm: BPM, chords: ["Am", "F", "C", "E"], str: 0.3, bright: 1900, sub: 0.28, drive: 0.24, div: 4, drums: 0.36 });
  m.add(staticNoise(0.5, 3), 39, 0.25, 0, 0.2);
  for (const s of STAMPS) m.add(piano(hz("C4"), 2.2), s.at, 0.2, 0, 0.6);
  play(m, { from: 39.4, to: 51, bpm: BPM, chords: ["F", "C", "G", "Am"], str: 0.26, bright: 2100, sub: 0.2, drive: 0.14, div: 2 });
  play(m, { from: 51, to: 55.5, bpm: BPM, chords: ["F", "C", "G", "A"], beatsPerChord: 2, str: 0.36, bright: 2600, sub: 0.3, drive: 0.26, div: 4, drums: 0.48 });
  for (const s of SLAMS.slice(1)) m.add(taiko(1.4), s.at, 0.85, 0, 0.3);
  sting(m, 55.55, "C", 0.55);
  m.add(drone(hz("C3"), 4.5, 600), 55.5, 0.3, 0, 0.6);
}

function effects(m: Mix) {
  m.add(birdsong(8, 3, 0.6), 0, 0.07, 0.3, 0.3);
  m.add(crickets(9, 4), 0, 0.03, 0, 0.2);
  m.add(wind(SECONDS, 5, 0.35), 0, 0.08, 0, 0.2);
  // Each counted flash: a tick per counted second, then its thunder (louder the closer).
  for (const f of FLASHES) {
    for (let k = 1; k <= f.gap; k++) m.add(heartbeat(k + Math.round(f.at)), f.at + (k - 1) * COUNT_STEP, 0.16, 0, 0.05);
    m.add(thunder(4, Math.round(f.at * 10), 1 - f.gap / 10), f.at + f.gap * COUNT_STEP, 0.4 + 0.4 * (1 - f.gap / 10), -0.3, 0.4);
  }
  for (const at of ALL_FLASHES.filter((x) => x > 19 && Math.abs(x - STRIKE) > 0.2)) m.add(thunder(3.5, Math.round(at * 10), 0.5), at + 0.6, 0.35, 0.2, 0.4);
  m.add(rain(SHOTS.rewind.from - 16.5, 6), 16.5, 0.16, 0, 0.2);
  m.add(flapping(SHOTS.rewind.from - 16, 7, 0.5), 16, 0.12, 0.2, 0.1);
  m.add(buzz(STRIKE - 22.6, 8), 22.6, 0.5, 0, 0.1);
  m.add(thunder(5, 9, 1), STRIKE, 1.0, 0, 0.3);
  m.add(rain(5, 10), 45, 0.08, 0, 0.2);
  m.add(birdsong(SECONDS - 49, 11, 0.6), 49, 0.08, 0.3, 0.3);
}

export function writeMusic(file: string) {
  const m = new Mix(SECONDS + 0.5);
  score(m);
  effects(m);
  m.finish(1.2);
  m.write(file);
}
