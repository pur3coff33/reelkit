// The film is made in parts (one per chapter, plus the cold open), each scripted, voiced, timed, scored and rendered on its
// own, then joined (join.ts). A part lives in parts/<id>/: script.ts (lines), layout.gen.ts (written by part.ts from the
// voice), shots.tsx (the picture), music.ts (the sound).
//
//   npx tsx apps/ozone/part.ts <id> voice | layout | music | render | all     one part
//   npx tsx apps/ozone/join.ts                                                 every part in ORDER → out/ozone-16x9.mp4
import type { VoiceLine } from "../../src/kit/config";

/** The parts in the order the film plays them. Add a part here when its folder exists. */
export const ORDER = ["00-open", "01-birdland", "02-paper", "03-graduation", "04-fifteen"] as const;
export type PartId = (typeof ORDER)[number];

/** A narration line: `text` is what Kokoro reads (numbers in words; Filipino names as [Name](/ipa/), checked with say.ts),
 *  `caption` what the screen shows, `hold` the seconds of quiet after it, `sources` the ids in sources.ts it rests on. */
export type PartLine = Omit<VoiceLine, "beat"> & { hold: number; sources: string[] };
/** `intro`: seconds of picture before the first line. `tail`: seconds after the last line's hold (a title, a fade). */
export type PartScript = { id: PartId; title: string; intro: number; tail: number; lines: PartLine[] };

/** When each line starts and how long it took to say; `end` is after the last hold, `seconds` the whole part. */
export type Layout = { lines: Record<string, number>; spoken: Record<string, number>; lead: Record<string, number>; end: number; seconds: number };

export function layOutPart(script: PartScript, made: { id: string; seconds: number; lead: number }[]): Layout {
  const lines: Record<string, number> = {}, spoken: Record<string, number> = {}, lead: Record<string, number> = {};
  let t = script.intro;
  for (const l of script.lines) {
    const m = made.find((x) => x.id === l.id);
    if (!m) throw new Error(`${script.id}: no voice for ${l.id}`);
    lines[l.id] = +t.toFixed(3);
    spoken[l.id] = +m.seconds.toFixed(3);
    lead[l.id] = +m.lead.toFixed(3);
    t += m.seconds + l.hold;
  }
  return { lines, spoken, lead, end: +t.toFixed(3), seconds: +(t + script.tail).toFixed(3) };
}

/** Line ids must be unique across the whole film (their WAVs and captions are keyed by them) and differ by more than case. */
export function lineIdClashes(scripts: PartScript[]) {
  const seen = new Map<string, string>(), out: string[] = [];
  for (const s of scripts)
    for (const l of s.lines) {
      const k = l.id.toLowerCase();
      if (seen.has(k)) out.push(`${l.id} (${seen.get(k)} and ${s.id})`);
      else seen.set(k, s.id);
    }
  return out;
}
