// EP 01's sound, all made here: A minor at 120 BPM. A light synth pulse over the busy city, a machine groove as the work
// goes to the robots, a bare piano for the people left out, then a bright, cold groove for the city that runs itself.
// Under it: scooters, servos, typing, drones, chatbot blips, a crowd, birds.
import { Mix, SR, bass, clap, hat, hz, kick, pluck, riser, svf } from "../../src/kit/music/synth";
import { birdsong, crickets, drone, edges, murmur, sting, trafficWash, wind } from "../../src/kit/whatif/score";
import { engine, hit, piano, play, shaped, taiko } from "../typhoon/music";
import { SECONDS, SHOTS, SLAMS, STAMPS } from "./timeline";

const BPM = 120, B = 60 / BPM;
const ARP = ["A3", "C4", "E4", "A4", "E4", "C4", "B3", "E4"];

/** A servo motor: a rising, buzzing whine. */
function servo(seconds: number, f0 = 300, f1 = 900) {
  let p = 0;
  return svf(shaped(seconds, 71, (t) => {
    const f = f0 + (f1 - f0) * Math.sin((Math.PI / 2) * (t / seconds));
    p = (p + f / SR) % 1;
    return ((2 * p - 1) * 0.6 + Math.sin(2 * Math.PI * f * 2 * t) * 0.3) * edges(t, seconds, 0.03, 0.08);
  }), 2400, 1.2, "low");
}
/** One key on a keyboard. */
const key = (seed: number) => svf(shaped(0.03, seed, (t, r) => r * Math.exp(-t * 260)), 3000 + (seed % 7) * 300, 1.4, "band");
/** A drone's rotors: a buzzing saw with a flutter. */
function rotors(seconds: number, f = 170) {
  let p = 0;
  return svf(shaped(seconds, 72, (t, r) => {
    p = (p + (f * (1 + 0.01 * Math.sin(t * 9))) / SR) % 1;
    return ((2 * p - 1) * (0.7 + 0.3 * Math.sin(t * 2 * Math.PI * 23)) + r * 0.2) * edges(t, seconds, 0.4, 0.4);
  }), 1400, 0.9, "low");
}
const blip = (f: number) => pluck(f, 0.25);

function groove(m: Mix, from: number, to: number, o: { kick?: number; clap?: number; hats?: number; bassGain?: number; arp?: number; chords: string[] }) {
  const roots: Record<string, string> = { Am: "A1", F: "F1", C: "C2", Dm: "D2", A: "A1", Bb: "Bb1", Gm: "G1" };
  let i = 0;
  for (let at = from; at < to - 0.01; at += B, i++) {
    const bar = Math.floor(i / 4), beat = i % 4;
    const chord = o.chords[bar % o.chords.length];
    if (o.kick) m.add(kick(1), at, o.kick);
    if (o.clap && beat % 2 === 1) m.add(clap(), at, o.clap, 0, 0.3);
    if (o.hats) {
      m.add(hat(), at + B / 2, o.hats, 0.3, 0.1);
      m.add(hat(), at + B / 4, o.hats * 0.5, -0.3, 0.1);
    }
    if (o.bassGain) for (const h of [0, 0.5]) m.add(bass(hz(roots[chord]) * (h ? 2 : 1), B * 0.45), at + h * B, o.bassGain);
    if (o.arp) for (const h of [0, 0.5]) m.add(pluck(hz(ARP[(i * 2 + h * 2) % ARP.length]) * (chord === "F" ? 0.84 : chord === "C" ? 1.19 : 1), 0.4), at + h * B, o.arp, (h ? 0.3 : -0.3), 0.35);
  }
}

function score(m: Mix) {
  groove(m, 0, 8, { hats: 0.06, arp: 0.13, bassGain: 0.16, chords: ["Am", "F", "C", "Am"] });
  play(m, { from: 0, to: 8, bpm: BPM, chords: ["Am", "F"], str: 0.16, bright: 1600, beatsPerChord: 8 });
  m.add(riser(1.5), 6.5, 0.35, 0, 0.4);
  hit(m, 8, "Am", 1.0, 1.6);
  groove(m, 8, 20, { kick: 0.7, clap: 0.35, hats: 0.08, bassGain: 0.26, arp: 0.1, chords: ["Am", "F", "C", "Dm"] });
  play(m, { from: 8, to: 20, bpm: BPM, chords: ["Am", "F", "C", "Dm"], str: 0.18, bright: 1900, swell: true });
  for (const s of STAMPS) {
    m.add(riser(1), s.at - 1, 0.3, 0, 0.4);
    hit(m, s.at, s.count === 10 ? "C" : "Am", 0.9, 1.8);
  }
  // The people left out: piano and strings, no drums.
  play(m, { from: 20, to: 35, bpm: BPM, chords: ["Am", "F", "C", "Dm"], str: 0.24, bright: 1300, sub: 0.18 });
  const tune = ["E5", "C5", "A4", "B4", "C5", "A4", "E4", "G4"];
  for (let k = 0; k < 14; k++) m.add(piano(hz(tune[k % tune.length]), 2.4), 20.5 + k * 1.0, 0.32, (k % 2 ? 0.2 : -0.2), 0.55);
  // The city that runs itself: bright and cold.
  groove(m, 35, 50, { kick: 0.6, clap: 0.3, hats: 0.09, bassGain: 0.22, arp: 0.16, chords: ["C", "Am", "F", "C"] });
  play(m, { from: 35, to: 50, bpm: BPM, chords: ["C", "Am", "F", "C"], str: 0.2, bright: 2600 });
  play(m, { from: 50, to: 55.5, bpm: BPM, chords: ["Am", "F"], str: 0.34, bright: 2200, sub: 0.3, drums: 0.45, swell: true });
  for (const s of SLAMS) hit(m, s.at, "Am", 0.85, 2);
  sting(m, 55.55, "A", 0.55);
  m.add(drone(hz("A1"), 4.6, 600), 55.5, 0.28, 0, 0.6);
  sting(m, 0.15, "A", 0.3);
}

function effects(m: Mix) {
  m.add(trafficWash(8, 3), 0, 0.16, 0, 0.1);
  for (let k = 0; k < 5; k++) m.add(engine(1.6, 110 + k * 12, 20 + k), 0.6 + k * 1.4, 0.05, k % 2 ? 0.4 : -0.4, 0.1);
  const f = SHOTS.factory.from;
  for (let k = 0; k < 5; k++) m.add(servo(0.5, 260 + k * 30, 820 + k * 40), f + 0.8 + k * 0.35, 0.14, (k - 2) * 0.25, 0.2);
  for (let k = 0; k < 10; k++) m.add(taiko(0.4), f + 1.6 + k * 0.18, 0.08, 0, 0.2);
  const o = SHOTS.office.from;
  for (let k = 0; k < 40; k++) m.add(key(k * 13 + 1), o + 0.1 + k * 0.06 + (k % 3) * 0.01, 0.12, ((k % 5) - 2) * 0.2, 0.05);
  for (let k = 0; k < 16; k++) m.add(blip(hz("E6") * (1 + (k % 3) * 0.12)), o + 0.6 + ((k * 7) % 16) * 0.13, 0.07, ((k % 5) - 2) * 0.2, 0.3);
  m.add(rotors(2.6), SHOTS.delivery.from, 0.07, 0.3, 0.2);
  m.add(rotors(2.6, 190), SHOTS.delivery.from + 0.2, 0.05, -0.3, 0.2);
  for (let k = 0; k < 3; k++) {
    m.add(blip(hz("A5")), SHOTS.kitchen.from + 0.4 + k * 0.85, 0.12, 0, 0.3);
    m.add(blip(hz("E6")), SHOTS.kitchen.from + 0.48 + k * 0.85, 0.1, 0, 0.3);
  }
  m.add(murmur(3.4, 5, 0.2), SHOTS.boxes.from, 0.08, 0, 0.3);
  m.add(murmur(3.5, 6, 0.35), SHOTS.queue.from, 0.13, 0, 0.3);
  m.add(crickets(2.6, 7), SHOTS.family.from, 0.06, 0, 0.3);
  m.add(rotors(5, 210), SHOTS.future.from, 0.05, 0, 0.3);
  m.add(svf(shaped(3, 8, (t) => Math.sin(2 * Math.PI * 55 * t) * edges(t, 3, 0.3, 0.3)), 200, 0.8, "low"), SHOTS.warehouse.from, 0.18);
  for (let k = 0; k < 6; k++) m.add(servo(0.35, 500, 1100), SHOTS.warehouse.from + 0.3 + k * 0.45, 0.06, (k % 2) * 0.6 - 0.3, 0.3);
  m.add(birdsong(3.5, 9), SHOTS.park.from, 0.1, 0, 0.3);
  m.add(wind(10, 10, 0.4), SHOTS.lone.from, 0.06, 0, 0.3);
}

export function writeMusic(file: string) {
  const m = new Mix(SECONDS + 0.5);
  score(m);
  effects(m);
  m.finish(1.2);
  m.write(file);
}
