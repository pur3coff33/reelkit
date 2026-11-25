// D minor, dark and steady: the quake hits on beat 2, the pulse starts as the wave leaves, drums from the drawback,
// the biggest hit as the wave breaks over the town (beat 38), a last hit under the end card.
import { writeScore } from "../../src/kit/lowpoly/score";

export function writeMusic(file: string) {
  writeScore(file, {
    seconds: 30,
    bpm: 120,
    progression: ["D2 D3 F3 A3", "Bb1 Bb2 D3 F3", "G1 G2 Bb2 D3", "A1 A2 C#3 E3"],
    pulseFrom: 8,
    drums: [30, 52],
    outro: 52,
    hits: [
      { beat: 2, riserBeats: 2, size: 0.9 },
      { beat: 38, riserBeats: 8, size: 1.1 },
      { beat: 53, riserBeats: 0, size: 0.6 },
    ],
    beeps: [3, 9, 24],
    rumbles: [
      { from: 1, to: 5.5, gain: 0.9 },
      { from: 15, to: 19.2, gain: 0.45 },
      { from: 19, to: 26, gain: 1.0 },
    ],
  });
}
