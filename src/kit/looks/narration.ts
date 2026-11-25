// Captions for a narrated looks film: each line's halves ("|" splits them) shown as they're said, timed from how long the
// voice took to say the line.
import type { VoiceLine } from "../config";
import { wordTimes } from "../remotion/Captions";
import type { Line } from "./Film";

/** Seconds each line takes to say, by id. */
export type Spoken = Record<string, number>;

export function captions(lines: VoiceLine[], spoken: Spoken, style: Partial<Line> = {}): Line[] {
  return lines.flatMap((l) => {
    const halves = l.caption.split("|"), seconds = spoken[l.id] ?? 5;
    const words = halves.map((h) => h.split(" "));
    const times = wordTimes(words.flat(), seconds / 0.9);
    let n = 0;
    return halves.map((text, i): Line => {
      const at = l.beat + times[n];
      n += words[i].length;
      const to = i < halves.length - 1 ? l.beat + times[n] : l.beat + seconds + 0.55;
      return { at: at - 0.1, to, text, voice: "dots", y: 1375, size: 72, ...style };
    });
  });
}
