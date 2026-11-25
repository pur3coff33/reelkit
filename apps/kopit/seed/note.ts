// kop.it's day note (its lib/daynote/types.ts), and whether one is fit to headline an ad.
export type DayNote = { lines: { emoji: string; text: string }[]; tip: string | null; total: number; usual: number | null; ph: number | null };

const AWKWARD = /\b(vices?|yosi|beer|alcohol|drink(ing)?|smok(e|ing)|gambl(e|ing))\b/i;

/** Why `note` can't headline the reel, or null when it can. */
export function checkNote(note: DayNote): string | null {
  if (!note.tip) return "no idea for today";
  if (note.lines.length === 0) return "no lines";
  const long = [...note.lines.map((l) => l.text), note.tip].find((t) => t.length > 90);
  if (long) return `a line is too long for the screen: "${long}"`;
  const text = [...note.lines.map((l) => l.text), note.tip].join(" ");
  if (AWKWARD.test(text)) return "it talks about vices";
  return null;
}

/** Used only when the AI can't give a usable note; the reel marks it as a sample. */
export const FALLBACK_NOTE: DayNote = {
  total: 101_000,
  usual: 142_000,
  ph: null,
  lines: [
    { emoji: "🌿", text: "A calm day: ₱1,010, about ₱410 under your usual." },
    { emoji: "🧺", text: "Most of it was the palengke run, ₱640." },
  ],
  tip: "Pack lunch once this week and that's another easy leaf.",
};
