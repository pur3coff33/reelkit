// EP 04's sound, all made here: a quiet night score in D minor that tightens with each warning sign and breaks open when
// the flood hits, over the camp's sounds: crickets, the fire, the river, far thunder, then the roar and the torrent.
import { Mix, hz, riser } from "../../src/kit/music/synth";
import { birdsong, crickets, drone, sting } from "../../src/kit/whatif/score";
import { fire, river, roar, snap, splash, thunder } from "../../src/kit/whatif/campsound";
import { hit, play, rain, taiko } from "../typhoon/music";
import { ARRIVE, SECONDS, SHOTS, SLAMS, STAMPS, STRIKES } from "./timeline";

const BPM = 120;

function score(m: Mix) {
  sting(m, 0.15, "D", 0.32);
  play(m, { from: 0, to: 9.5, bpm: BPM, chords: ["Dm", "Bb"], str: 0.2, bright: 1300, sub: 0.16 });
  play(m, { from: 9.5, to: 21, bpm: BPM, chords: ["Dm", "Bb", "Gm", "A"], str: 0.26, bright: 1700, sub: 0.24, drive: 0.2, div: 2, swell: true });
  m.add(riser(1.2), 21 - 1.2, 0.35, 0, 0.4);
  hit(m, 21.05, "Gm", 0.8, 1.6);
  play(m, { from: 21, to: ARRIVE, bpm: BPM, chords: ["Gm", "A"], beatsPerChord: 2, str: 0.32, bright: 2200, sub: 0.3, drive: 0.3, div: 4, drums: 0.42, swell: true });
  m.add(riser(1.6), ARRIVE - 1.6, 0.45, 0, 0.4);
  hit(m, ARRIVE - 0.05, "Dm", 1.25, 2.4);
  play(m, { from: ARRIVE + 1, to: 36, bpm: BPM, chords: ["Dm", "Bb", "Gm", "A"], str: 0.34, bright: 2200, sub: 0.32, drive: 0.28, div: 4, drums: 0.46 });
  play(m, { from: 36, to: 40, bpm: BPM, chords: ["Bb", "A"], str: 0.3, bright: 1500, sub: 0.2 });
  for (const s of STAMPS) {
    m.add(riser(1), s.at - 1, 0.25, 0, 0.4);
    hit(m, s.at, s.count === 6 ? "F" : "Gm", 0.8, 1.6);
  }
  play(m, { from: 40, to: 50, bpm: BPM, chords: ["F", "C", "Dm", "Bb"], str: 0.26, bright: 1900, sub: 0.2, drive: 0.12, div: 2 });
  play(m, { from: 50, to: 55, bpm: BPM, chords: ["Dm", "Bb", "Gm", "A"], beatsPerChord: 2, str: 0.38, bright: 2400, sub: 0.32, drive: 0.3, div: 4, drums: 0.5 });
  for (const s of SLAMS.slice(2)) m.add(taiko(1.4), s.at, 0.85, 0, 0.3);
  hit(m, SLAMS[5].at, "A", 0.95, 2.2);
  sting(m, 55.05, "D", 0.55);
  m.add(drone(hz("D2"), 5, 600), 55, 0.3, 0, 0.6);
}

function effects(m: Mix) {
  m.add(crickets(18, 4), 0, 0.07, 0, 0.2);
  m.add(fire(ARRIVE - 0.1, 5, 0.6), 0, 0.14, 0.2, 0.1);
  m.add(river(ARRIVE, 6, 0.25), 0, 0.12, -0.2, 0.15);
  // Far thunder from the storm upstream: late and soft; louder in the gorge.
  STRIKES.forEach((s, i) => {
    const inGorge = s >= SHOTS.gorge.from && s < SHOTS.gorge.to;
    m.add(thunder(4.5, 10 + i, inGorge ? 0.6 : 0.1), s + (inGorge ? 0.4 : 1.4), inGorge ? 0.55 : 0.28, (i % 2) - 0.5, 0.5);
  });
  m.add(rain(SHOTS.gorge.to - SHOTS.gorge.from, 12), SHOTS.gorge.from, 0.16, 0, 0.2);
  m.add(river(2.5, 13, 1), SHOTS.gorge.from, 0.25, 0, 0.2);
  m.add(roar(2.2, 14), SHOTS.gorge.from + 0.2, 0.5, 0, 0.3);
  // The roar coming down the valley, then the flood itself.
  m.add(roar(ARRIVE - 17.5, 15), 17.5, 0.6, 0, 0.3);
  m.add(splash(16, 1.2), ARRIVE, 0.8, 0.2, 0.3);
  for (const at of [ARRIVE + 0.2, ARRIVE + 0.45, ARRIVE + 0.9]) m.add(snap(Math.round(at * 10)), at, 0.4, 0.4, 0.3);
  m.add(river(40 - ARRIVE, 17, 1), ARRIVE, 0.5, 0, 0.25);
  m.add(river(SECONDS - 40, 18, 0.5), 40, 0.2, 0, 0.2);
  m.add(birdsong(SECONDS - 40, 19, 0.7), 40, 0.1, 0.3, 0.3);
}

export function writeMusic(file: string) {
  const m = new Mix(SECONDS + 0.5);
  score(m);
  effects(m);
  m.finish(1.2);
  m.write(file);
}
