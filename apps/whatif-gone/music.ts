// EP 03's sound, all made here: G minor. A city at night and a light pulse, cut dead when everyone goes. Then near
// silence: wind, a low drone, a sparse piano. Strings creep back in as nature does, and the end opens out with birdsong.
import { Mix, SR, hat, hz, pluck, riser, svf } from "../../src/kit/music/synth";
import { birdsong, crickets, drone, edges, murmur, sting, trafficWash, wind } from "../../src/kit/whatif/score";
import { hit, piano, play, shaped, strings } from "../typhoon/music";
import { SECONDS, SHOTS, SLAMS, STAMPS, VANISH } from "./timeline";

const BPM = 120, B = 60 / BPM;

/** A dog's howl: a rising, wavering tone. */
function howl(seconds: number) {
  let p = 0;
  return svf(shaped(seconds, 81, (t) => {
    const f = 420 + 220 * Math.sin(Math.min(1, t / (seconds * 0.4)) * Math.PI / 2) - 80 * Math.max(0, t - seconds * 0.7) * 2;
    p = (p + (f * (1 + 0.012 * Math.sin(t * 34))) / SR) % 1;
    return (Math.sin(2 * Math.PI * p) + 0.25 * Math.sin(4 * Math.PI * p)) * edges(t, seconds, 0.25, 0.6);
  }), 1800, 0.9, "low");
}
/** A drop of water. */
const drip = (seed: number) => shaped(0.18, seed, (t) => Math.sin(2 * Math.PI * (900 + 1300 * Math.exp(-t * 40)) * t) * Math.exp(-t * 28));
/** Flies over something left out. */
function flies(seconds: number) {
  let p = 0;
  return shaped(seconds, 82, (t, r) => {
    p = (p + (190 + 40 * Math.sin(t * 3.1) + 25 * Math.sin(t * 7.7)) / SR) % 1;
    return ((2 * p - 1) * 0.6 + r * 0.1) * (0.5 + 0.5 * Math.sin(t * 1.7)) * edges(t, seconds, 0.3, 0.3);
  });
}

/** The world with people in it, cut off hard at the vanishing. */
function before(m: Mix) {
  const pre = new Mix(SECONDS + 0.5);
  pre.add(trafficWash(3.5, 3), 0, 0.22, 0, 0.1);
  pre.add(murmur(3.5, 4, 0.3), 0, 0.2, 0, 0.2);
  play(pre, { from: 0, to: 3.5, bpm: BPM, chords: ["Gm", "Eb"], str: 0.18, bright: 1700, sub: 0.2, drive: 0.16, div: 2 });
  for (let b = 0; b < 3.5; b += B / 2) pre.add(hat(), b, 0.05, 0.3, 0.1);
  sting(pre, 0.15, "G", 0.32);
  const cut = Math.round(VANISH * SR);
  for (const buf of [pre.L, pre.R, pre.wetL, pre.wetR]) for (let i = cut; i < buf.length; i++) buf[i] *= Math.max(0, 1 - (i - cut) / 240);
  m.add([pre.L, pre.R], 0);
  // The reverb of what was there, a breath after it's gone.
  m.add([pre.wetL, pre.wetR], 0, 0.6, 0, 1);
  m.add(svf(shaped(0.6, 83, (t, r) => r * Math.exp(-t * 6)), 3000, 0.7, "high"), VANISH, 0.18, 0, 0.8);
}

function score(m: Mix) {
  // Nothing but a low drone and wind for a while; the first notes come with the first stamp.
  m.add(drone(hz("G1"), 6, 300), VANISH + 0.6, 0.3, 0, 0.5);
  for (const s of STAMPS) {
    m.add(riser(1), s.at - 1, 0.22, 0, 0.5);
    hit(m, s.at, s.count === 100 ? "Eb" : "Gm", s.count === 100 ? 0.8 : 0.55, 2);
  }
  play(m, { from: 8, to: 20, bpm: BPM, chords: ["Gm", "Eb", "Bb", "F"], beatsPerChord: 8, str: 0.2, bright: 1200, sub: 0.14 });
  const tune = ["D5", "Bb4", "G4", "A4", "Bb4", "G4", "D4", "F4"];
  for (let k = 0; k < 11; k++) m.add(piano(hz(tune[k % tune.length]), 2.6), 8.4 + k * 1.05, 0.28, k % 2 ? 0.25 : -0.25, 0.6);
  play(m, { from: 20, to: 32, bpm: BPM, chords: ["Gm", "Eb", "Gm", "D"].map((c) => (c === "D" ? "A" : c)), beatsPerChord: 8, str: 0.22, bright: 1000, sub: 0.16 });
  // Nature coming back: the strings rise and move faster.
  play(m, { from: 32, to: 45, bpm: BPM, chords: ["Eb", "Bb", "F", "Gm"], str: 0.28, bright: 1800, sub: 0.2, drive: 0.12, div: 2, swell: true });
  for (let k = 0; k < 13; k++) m.add(pluck(hz(["G5", "D5", "Bb5", "F5"][k % 4]), 0.8), 32.3 + k * 1.0, 0.08, k % 2 ? 0.4 : -0.4, 0.6);
  play(m, { from: 45, to: 56.2, bpm: BPM, chords: ["Eb", "Bb", "F", "Gm"], str: 0.38, bright: 2400, sub: 0.26, drive: 0.18, div: 2, drums: 0.3 });
  for (const s of SLAMS) hit(m, s.at, "Eb", 0.75, 2.2);
  m.add(strings(["Eb3", "Bb3", "G4", "Bb4"].map(hz), 4, { attack: 0.3, release: 2 }), 56.2, 0.3, 0, 0.7);
  sting(m, 56.25, "G", 0.55);
}

function effects(m: Mix) {
  m.add(wind(SECONDS - VANISH, 5, 0.35), VANISH + 0.2, 0.09, 0, 0.3);
  m.add(crickets(5, 6), 3, 0.05, 0, 0.3);
  m.add(howl(1.8), SHOTS.dog.from + 0.3, 0.12, 0.2, 0.6);
  m.add(howl(1.6), SHOTS.grid.from + 0.6, 0.06, -0.4, 0.8);
  m.add(flies(3), SHOTS.market.from, 0.05, 0.2, 0.2);
  for (let k = 0; k < 8; k++) m.add(drip(k + 3), SHOTS.cracks.from + 0.2 + k * 0.37 + (k % 3) * 0.05, 0.2, 0.1, 0.5);
  m.add(svf(shaped(4, 84, (t, r) => r * edges(t, 4, 0.5, 0.5)), 700, 0.7, "low"), SHOTS.flood.from, 0.08, 0, 0.3);
  m.add(birdsong(SECONDS - SHOTS.grass.from, 7, 0.5), SHOTS.grass.from, 0.07, 0.3, 0.4);
  m.add(birdsong(SECONDS - SHOTS.jungle.from, 8, 1.4), SHOTS.jungle.from, 0.1, -0.3, 0.4);
}

export function writeMusic(file: string) {
  const m = new Mix(SECONDS + 0.5);
  before(m);
  score(m);
  effects(m);
  m.finish(1.4);
  m.write(file);
}
