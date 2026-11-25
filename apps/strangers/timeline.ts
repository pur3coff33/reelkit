// The film in seconds. One beat is a second, one bar four, and every part starts on a bar.
import type { VoiceLine } from "../../src/kit/config";

export const SECONDS = 120;

export const PARTS = {
  body: { from: 0, to: 12 },
  ship: { from: 12, to: 28 },
  river: { from: 28, to: 44 },
  butterfly: { from: 44, to: 64 },
  eye: { from: 64, to: 80 },
  net: { from: 80, to: 96 },
  wave: { from: 96, to: 112 },
  home: { from: 112, to: 120 },
} as const;
export type PartName = keyof typeof PARTS;

/** [start, what he says, the words on screen if they differ]. "|" splits the words into two captions. */
const SAID: [number, string, string?][] = [
  [0.9, "Most of the atoms in your body were not there when you were born."],
  [6.7, "You are made of strangers. So which part of this, is you?", "You are made of strangers.|So which part of this is you?"],
  [12.7, "The Greeks told of a ship. When a plank rotted, they replaced it.", "The Greeks told of a ship.|When a plank rotted, they replaced it."],
  [18.4, "One by one, until none of the first planks were left."],
  [23.8, "Was it still the same ship?"],
  [28.9, "Heraclitus said that no one steps into the same river twice."],
  [34.3, "The water has moved on. And so has the one who steps.", "The water has moved on.|And so has the one who steps."],
  [39.6, "A river is something that keeps happening. So are you.", "A river is something that keeps happening.|So are you."],
  [44.7, "In China, Juwahng zuh dreamed he was a butterfly, with no memory of being a man.", "In China, Zhuangzi dreamed he was a butterfly,|with no memory of being a man."],
  [51.6, "Then he woke, and could not say which he was."],
  [56, "A man who had dreamed of a butterfly? Or a butterfly, now dreaming of a man?", "A man who had dreamed of a butterfly?|Or a butterfly, now dreaming of a man?"],
  [64.7, "Descartes tried to doubt everything. The sky. His hands. His own body.", "Descartes tried to doubt everything.|The sky. His hands. His own body."],
  [72.2, "But something was doing the doubting. And that, he could not make disappear.", "But something was doing the doubting.|And that, he could not make disappear."],
  [80.7, "Buddhist teachers imagined a net without end, with a jewel at every knot.", "Buddhist teachers imagined a net without end,|with a jewel at every knot."],
  [87.2, "Look into one, and you see all the others. Look for where it ends, and you never arrive.", "Look into one, and you see all the others.|Look for where it ends, and you never arrive."],
  [96.8, "Maybe a self is like a wave. It rises. It takes a shape. Someone gives it a name.", "Maybe a self is like a wave.|It rises. It takes a shape. Someone gives it a name."],
  [105.8, "And the whole time, it was the sea."],
  [112.6, "For a little while, the universe is awake. And it is you.", "For a little while, the universe is awake.|And it is you."],
];

export const LINES: VoiceLine[] = SAID.map(([beat, text, caption], i) => ({ id: `l${String(i).padStart(2, "0")}`, text, caption: caption ?? text, beat }));
