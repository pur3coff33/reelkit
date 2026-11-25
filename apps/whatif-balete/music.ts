// EP 05's sound, all made here: an uneasy E-minor drone score with a heartbeat that speeds up with the HUD, over the
// forest at night: crickets that stop, the fire, heavy footsteps, a run through the trees, birds at dawn.
import { Mix, hz, riser } from "../../src/kit/music/synth";
import { birdsong, crickets, drone, sting, wind } from "../../src/kit/whatif/score";
import { fire, heartbeat, step, stomp } from "../../src/kit/whatif/campsound";
import { hit, piano, play, taiko } from "../typhoon/music";
import { SECONDS, SHOTS, SLAMS, STAMPS, bpmAt } from "./timeline";

const BPM = 120;

function score(m: Mix) {
  sting(m, 0.15, "E", 0.32);
  play(m, { from: 3.6, to: 9.6, bpm: BPM, chords: ["Am", "F"], str: 0.18, bright: 1500, sub: 0.14 });
  // The night: a held drone that darkens, a few piano notes that don't resolve.
  m.add(drone(hz("E2"), 15.6 - 9.6 + 1, 420), 9.6, 0.26, 0, 0.5);
  for (const [at, n] of [[10.2, "E4"], [11.4, "G4"], [12.6, "F#4"], [14.4, "B3"]] as const) m.add(piano(hz(n), 3), at, 0.2, 0.2, 0.7);
  m.add(drone(hz("E2") * 0.94, SHOTS.tent.from - 15.6 + 0.5, 300), 15.6, 0.32, 0, 0.6);
  play(m, { from: SHOTS.tent.from, to: SHOTS.eyes.from + 1.6, bpm: BPM, chords: ["Am", "F"], str: 0.24, bright: 1300, sub: 0.28, drive: 0.18, div: 2, swell: true });
  m.add(riser(1.6), 30.2 - 1.6, 0.4, 0, 0.4);
  hit(m, 30.2, "Am", 1.2, 2.4);
  play(m, { from: SHOTS.run.from, to: SHOTS.shirt.from, bpm: BPM, chords: ["Am", "F", "C", "A"], beatsPerChord: 2, str: 0.32, bright: 2200, sub: 0.3, drive: 0.3, div: 4, drums: 0.45 });
  for (const s of STAMPS) m.add(piano(hz("E3"), 2.5), s.at, 0.22, 0, 0.6);
  hit(m, SHOTS.shirt.from, "Am", 0.6, 1.4);
  play(m, { from: SHOTS.shirt.from + 1, to: 48, bpm: BPM, chords: ["F", "C", "Am", "C"], str: 0.24, bright: 1900, sub: 0.18 });
  play(m, { from: 48, to: 51.5, bpm: BPM, chords: ["C", "F"], str: 0.22, bright: 2000, sub: 0.16 });
  play(m, { from: 51.5, to: 55.5, bpm: BPM, chords: ["Am", "F", "C", "A"], beatsPerChord: 2, str: 0.36, bright: 2400, sub: 0.3, drive: 0.26, div: 4, drums: 0.48 });
  for (const s of SLAMS.slice(1)) m.add(taiko(1.4), s.at, 0.85, 0, 0.3);
  sting(m, 55.55, "E", 0.55);
  m.add(drone(hz("E2"), 4.5, 600), 55.5, 0.3, 0, 0.6);
}

function effects(m: Mix) {
  m.add(crickets(15.6, 4), 0, 0.08, 0, 0.2);
  m.add(fire(SHOTS.run.from - SHOTS.fire.from, 5, 0.6), SHOTS.fire.from, 0.13, 0.2, 0.1);
  m.add(wind(SECONDS, 6, 0.25), 0, 0.05, 0, 0.2);
  // The heart, beat for beat with the HUD.
  for (let t = SHOTS.fire.from; t < SHOTS.dawn.to; ) {
    const bpm = bpmAt(t);
    m.add(heartbeat(Math.round(t * 10)), t, 0.18 + 0.4 * Math.max(0, (bpm - 74) / 104), 0, 0.05);
    t += 60 / bpm;
  }
  for (const at of [25.9, 26.6, 27.3, 28.0]) m.add(stomp(Math.round(at * 10)), at, 0.9, (at - 27) * 0.4, 0.2);
  for (let at = SHOTS.run.from; at < SHOTS.loop.from + 1.5; at += 0.21) m.add(step(Math.round(at * 100)), at, 0.22, (Math.round(at * 10) % 3) * 0.3 - 0.3, 0.1);
  m.add(crickets(SECONDS - 44, 8), 44, 0.07, 0, 0.2);
  m.add(birdsong(SECONDS - 48, 9, 0.8), 48, 0.1, 0.3, 0.3);
}

export function writeMusic(file: string) {
  const m = new Mix(SECONDS + 0.5);
  score(m);
  effects(m);
  m.finish(1.2);
  m.write(file);
}
