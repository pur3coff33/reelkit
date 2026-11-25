// EP 02's sound, all made here: a tense D-minor score at 120 BPM that drops out when the grid fails, and the city under
// it: traffic and mains hum while there's power, then horns, crickets, generators, a crowd, a soft siren, radio static.
import { Mix, hz, riser, svf } from "../../src/kit/music/synth";
import { crackle, crickets, drone, horn, hum, murmur, powerDown, softSiren, sting, trafficWash } from "../../src/kit/whatif/score";
import { engine, hit, play, staticNoise, taiko } from "../typhoon/music";
import { BLACKOUT, FLICKERS, SECONDS, SHOTS, SLAMS, STAMPS } from "./timeline";

const BPM = 120;

function score(m: Mix) {
  play(m, { from: 0, to: BLACKOUT, bpm: BPM, chords: ["Dm", "Bb"], str: 0.22, bright: 1500, sub: 0.28, drive: 0.22, div: 2 });
  m.add(riser(1.4), BLACKOUT - 1.4, 0.4, 0, 0.4);
  hit(m, BLACKOUT, "Dm", 1.25, 2.2);
  // For a beat and a half after it goes, almost nothing: a low drone.
  m.add(drone(hz("D2"), 3.2, 380), BLACKOUT + 0.3, 0.35, 0, 0.4);
  play(m, { from: 9.5, to: 20, bpm: BPM, chords: ["Dm", "Bb", "Gm", "A"], str: 0.3, bright: 1900, sub: 0.3, drive: 0.26, div: 4, drums: 0.38, swell: true });
  play(m, { from: 20, to: 35, bpm: BPM, chords: ["Dm", "F", "Gm", "A"], str: 0.28, bright: 1700, sub: 0.26, drive: 0.18, div: 2, drums: 0.26 });
  play(m, { from: 35, to: 48, bpm: BPM, chords: ["Bb", "F", "Gm", "A"], str: 0.34, bright: 2100, sub: 0.3, drive: 0.3, div: 4, drums: 0.45, swell: true });
  play(m, { from: 48, to: 55, bpm: BPM, chords: ["Dm", "Bb", "Gm", "A"], str: 0.42, bright: 2400, sub: 0.34, drive: 0.32, div: 4, drums: 0.5 });
  for (const s of STAMPS) {
    m.add(riser(1), s.at - 1, 0.3, 0, 0.4);
    hit(m, s.at, s.count === 72 ? "Dm" : "Gm", s.count === 72 ? 1.15 : 0.9, 1.8);
  }
  for (const s of SLAMS.slice(1)) m.add(taiko(1.5), s.at, 0.9, 0, 0.3);
  hit(m, SLAMS[3].at, "A", 0.9, 2.6);
  // The question: everything stops but the motif and a held chord.
  sting(m, 55.05, "D", 0.55);
  m.add(drone(hz("D2"), 5, 600), 55, 0.3, 0, 0.6);
  sting(m, 0.15, "D", 0.32);
}

function effects(m: Mix) {
  // The city with power: traffic, the hum of the grid (cut on every flicker), now and then a horn.
  const live = (t: number) => {
    for (const [a, b] of FLICKERS) if (t >= a && t < b) return Math.floor(t * 16) % 2 ? 1 : 0.1;
    return 1;
  };
  m.add(trafficWash(BLACKOUT, 3), 0, 0.22, 0, 0.1);
  m.add(hum(BLACKOUT + 0.05, live), 0, 0.05);
  for (const [a, b] of FLICKERS) m.add(crackle(b - a, Math.round(a * 10), 0.008), a, 0.35, 0.2, 0.2);
  for (const at of [2.6, 4.1, 4.4, 6.2]) m.add(horn(0.3 + (at % 1) * 0.3, 380 + at * 20, 470 + at * 20), at, 0.07, at % 2 ? 0.4 : -0.4, 0.3);
  m.add(powerDown(1.8), BLACKOUT, 0.5, 0, 0.3);
  // Then the city without it.
  const j = SHOTS.junction.from;
  for (let k = 0; k < 9; k++) m.add(horn(0.35 + (k % 3) * 0.25, 360 + k * 23, 450 + k * 19), j + 0.7 + k * 0.21, 0.09 + (k % 2) * 0.04, (k % 3) - 1, 0.3);
  m.add(svf(crackle(0.6, 9, 0.02), 2000, 0.9, "low"), SHOTS.elevator.from + 0.5, 0.3);
  m.add(taiko(0.8), SHOTS.elevator.from + 0.55, 0.35);
  m.add(murmur(4.2, 5, 0.6), SHOTS.mall.from, 0.16, 0, 0.3);
  m.add(crickets(SHOTS.fuel.from - SHOTS.junction.from, 7), SHOTS.junction.from, 0.06, 0, 0.2);
  m.add(engine(4, 42, 11), SHOTS.fuel.from, 0.1, 0.2, 0.1);
  m.add(murmur(3, 12, 0.3), SHOTS.store.from, 0.13, 0, 0.3);
  m.add(engine(4, 30, 13), SHOTS.hospital.from, 0.16, 0.3, 0.1);
  m.add(crickets(SHOTS.homes.to - SHOTS.homes.from + 3.5, 14), SHOTS.homes.from, 0.09, 0, 0.3);
  m.add(softSiren(3, 15), SHOTS.responders.from, 0.06, -0.3, 0.4);
  m.add(murmur(3.5, 16, 0.25), SHOTS.water.from, 0.12, 0, 0.3);
  m.add(staticNoise(SHOTS.tower.to - SHOTS.tower.from, 17), SHOTS.tower.from, 0.05, 0, 0.2);
  m.add(crickets(SECONDS - SHOTS.final.from, 18), SHOTS.final.from, 0.05, 0, 0.3);
}

export function writeMusic(file: string) {
  const m = new Mix(SECONDS + 0.5);
  score(m);
  effects(m);
  m.finish(1.2);
  m.write(file);
}
