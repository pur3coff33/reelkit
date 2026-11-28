// A documentary's timing (src/kit/doc), from how long each line took to say. The film is a list of beats: a beat is told over one or more
// shots, by zero or more lines. A beat lasts as long as its lines need (or its shots' minimums, if longer); its shots
// share that time in proportion to their minimums. Kokoro starts each file with ~0.28 s of silence, so a line's file
// starts just after its beat does.
import type { Placed, ShotSpec } from "./film";

export type ShotDef = ShotSpec & { id: string; min: number; cut?: boolean };
export type Beat = { lines: string[]; shots: ShotDef[] };

/** Seconds before a beat's first line, between its lines, and after its last: a natural documentary pace. */
export const LEAD_IN = 0.1, GAP = 0.5, TAIL = 0.45;

/** `seconds`: a ceiling, not a target. A film takes the length its story needs; this only catches a runaway layout. */
export function layOut(beats: Beat[], spoken: Record<string, number>, seconds: number) {
  const shots: Placed[] = [];
  const lines: Record<string, number> = {};
  let t = 0;
  for (const [i, b] of beats.entries()) {
    if (!b.shots.length) throw new Error(`beat ${i} (${b.lines.join(", ") || "no lines"}) has no shots`);
    if (!(b.shots.reduce((a, s) => a + s.min, 0) > 0)) throw new Error(`beat ${i}: its shots need a minimum length above 0`);
    const say = b.lines.map((id) => {
      if (!(id in spoken)) throw new Error(`line ${id} has no length: run the voice step (or layout.ts --estimate)`);
      return spoken[id];
    });
    const speech = say.length ? LEAD_IN + say.reduce((a, s) => a + s, 0) + GAP * (say.length - 1) + TAIL : 0;
    const mins = b.shots.reduce((a, s) => a + s.min, 0);
    const len = Math.max(mins, speech);
    let at = t + LEAD_IN;
    b.lines.forEach((id, i) => {
      lines[id] = at;
      at += say[i] + GAP;
    });
    for (const { min, ...s } of b.shots) {
      const d = (len * min) / mins;
      shots.push({ ...s, from: t, to: t + d } as Placed);
      t += d;
    }
  }
  if (t > seconds + 1e-6) throw new Error(`the film runs ${t.toFixed(2)} s, over by ${(t - seconds).toFixed(2)} s: shorten lines or shots`);
  return { shots, lines, seconds: t };
}

/** Lines recorded since the layout was made (their length changed, or they're new): re-run the app's layout.ts. */
export function staleLines(laidOut: Record<string, number>, recorded: { id: string; seconds: number }[]) {
  return recorded.filter((l) => !(l.id in laidOut) || Math.abs(laidOut[l.id] - l.seconds) > 0.01).map((l) => l.id);
}
