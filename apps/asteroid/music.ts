// C minor: a cold approach in orbit, drums from the cut to the ground (beat 22), the impact on beat 30, the
// shockwave reaching the city (beat 43), then a quiet orbit for the aftermath.
import { writeScore } from "../../src/kit/lowpoly/score";
import { shockAtCity } from "./sim";

export function writeMusic(file: string) {
  const shockBeat = Math.round(shockAtCity() * 2);
  writeScore(file, {
    seconds: 30,
    bpm: 120,
    progression: ["C2 C3 Eb3 G3", "Ab1 Ab2 C3 Eb3", "F1 F2 Ab2 C3", "G1 G2 B2 D3"],
    pulseFrom: 4,
    drums: [22, 47],
    outro: 47,
    hits: [
      { beat: 30, riserBeats: 8, size: 1.3 },
      { beat: shockBeat, riserBeats: 4, size: 0.9 },
      { beat: 47, riserBeats: 0, size: 0.5 },
      { beat: 53, riserBeats: 0, size: 0.45 },
    ],
    beeps: [2, 17, 39],
    rumbles: [
      { from: 9, to: 15, gain: 0.5 },
      { from: 15, to: 23.5, gain: 1.0 },
      { from: 23.5, to: 28, gain: 0.3 },
    ],
  });
}
