// E Phrygian, heavy: tremor rumble building to the eruption on beat 17, drums through the flows, hits for the
// pyroclastic flow (beat 28) and the lava reaching the village (beat 41), a last hit under the end card.
import { writeScore } from "../../src/kit/lowpoly/score";

export function writeMusic(file: string) {
  writeScore(file, {
    seconds: 30,
    bpm: 120,
    progression: ["E2 E3 G3 B3", "F2 F3 A3 C4", "E2 E3 G3 B3", "D2 D3 F3 A3"],
    pulseFrom: 6,
    drums: [17, 53],
    outro: 53,
    hits: [
      { beat: 17, riserBeats: 8, size: 1.2 },
      { beat: 28, riserBeats: 2, size: 0.7 },
      { beat: 41, riserBeats: 3, size: 0.8 },
      { beat: 53, riserBeats: 0, size: 0.6 },
    ],
    beeps: [3, 11, 29, 41],
    rumbles: [
      { from: 1, to: 8.6, gain: 0.55 },
      { from: 8.5, to: 15, gain: 1.0 },
      { from: 14, to: 20, gain: 0.6 },
      { from: 20, to: 27, gain: 0.45 },
    ],
  });
}
