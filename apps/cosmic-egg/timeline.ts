// "The Cosmic Egg": five minutes on the oldest idea that you might be everyone. The script, part by part. When each line
// starts comes from layout.gen.ts, which `npx tsx apps/cosmic-egg/layout.ts` writes from how long each line took to say.
import type { VoiceLine } from "../../src/kit/config";
import { LAYOUT } from "./layout.gen";

export const SECONDS = 300;
export const PART_NAMES = ["hook", "salt", "lives", "kindness", "open", "egg", "hatch"] as const;
export type PartName = (typeof PART_NAMES)[number];

/** [id, what he says (spelled to be said right), the words on screen ("|" splits them in two), a longer pause before]. */
export type Said = [id: string, text: string, caption?: string, pause?: number];

export const SCRIPT: Record<PartName, Said[]> = {
  hook: [
    ["h1", "What if every person you have ever met... was you?", "What if every person you have ever met|was you?"],
    ["h2", "Not someone like you. You.", "Not someone like you.|You.", 0.4],
    ["h3", "Wearing another face. Living another life.", "Wearing another face.|Living another life."],
  ],
  // The Chandogya Upanishad (6.13): Uddalaka teaches his son Shvetaketu with salt.
  salt: [
    ["s1", "More than two and a half thousand years ago, in India, a father gave his son a lump of salt.", "More than two and a half thousand years ago, in India,|a father gave his son a lump of salt."],
    ["s2", "Put it in the water, he said, and come back in the morning.", "“Put it in the water,” he said,|“and come back in the morning.”"],
    ["s3", "In the morning, the boy looked for the salt. It was gone.", "In the morning, the boy looked for the salt.|It was gone.", 0.6],
    ["s4", "Taste the water, said the father. From the top. From the middle. From the bottom.", "“Taste the water,” said the father.|“From the top. From the middle. From the bottom.”"],
    ["s5", "Salt, said the boy. It's everywhere.", "“Salt,” said the boy. “It’s everywhere.”"],
    ["s6", "That is how it is with you, said the father. Tut twum ah-see. You are that.", "“That is how it is with you,” said the father.|“Tat tvam asi. You are that.”", 0.5],
  ],
  lives: [
    ["v1", "Some have imagined it like this. There is only one of us.", "Some have imagined it like this.|There is only one of us."],
    ["v2", "One life, lived again, and again, and again."],
    ["v3", "You are a fisherman, mending a net before the sun comes up.", "You are a fisherman,|mending a net before the sun comes up.", 0.9],
    ["v4", "You are a queen, who never once saw the sea.", "You are a queen,|who never once saw the sea.", 0.9],
    ["v5", "You are a soldier, far from home.", undefined, 0.9],
    ["v6", "And you are the one he is afraid of.", undefined, 0.5],
    ["v7", "You are a child, saying your very first word.", "You are a child,|saying your very first word.", 0.9],
    ["v8", "You are a stranger on a bus. Someone you will never think about again.", "You are a stranger on a bus.|Someone you will never think about again.", 0.9],
    ["v9", "Each time, you forget. Each time, you begin again.", "Each time, you forget.|Each time, you begin again.", 0.9],
  ],
  kindness: [
    ["k1", "If this were true, it would change everything."],
    ["k2", "Every kindness you have ever given, you have also received.", "Every kindness you have ever given,|you have also received.", 0.6],
    ["k3", "Every time you were cruel, you were the one it hurt.", "Every time you were cruel,|you were the one it hurt.", 0.6],
    ["k4", "Everyone you have ever loved, you were loving from the outside.", "Everyone you have ever loved,|you were loving from the outside.", 0.6],
    ["k5", "And everyone you have never forgiven, is still waiting for you to come home.", "And everyone you have never forgiven|is still waiting for you to come home.", 0.6],
  ],
  open: [
    ["o1", "Some philosophers call this idea open individualism.", "Some philosophers call this idea|open individualism."],
    ["o2", "The line between you and everyone else is not a wall. It is a habit.", "The line between you and everyone else is not a wall.|It is a habit.", 0.5],
    ["o3", "Your memories stop at your skin. The one who is having them might not.", "Your memories stop at your skin.|The one who is having them might not.", 0.5],
    ["o4", "Look out through any pair of eyes, and the one looking is the same.", "Look out through any pair of eyes,|and the one looking is the same.", 0.5],
  ],
  // Hiranyagarbha, the golden egg (Rigveda, the Puranas); Pangu (Chinese, from the 3rd century); the Orphic egg, from which
  // Phanes, the first light, broke out.
  egg: [
    ["e1", "All over the world, people have told of an egg at the beginning of everything.", "All over the world, people have told of an egg|at the beginning of everything."],
    ["e2", "In India, a golden egg floated on the dark water, before there was a world.", "In India, a golden egg floated on the dark water,|before there was a world.", 0.6],
    ["e3", "In China, the giant Pahn-goo slept inside an egg for eighteen thousand years.", "In China, the giant Pangu slept inside an egg|for eighteen thousand years.", 0.6],
    ["e4", "In Greece, the first light broke out of an egg of silver.", "In Greece, the first light broke out|of an egg of silver.", 0.6],
    ["e5", "Maybe they were all telling the same story.", undefined, 0.6],
    ["e6", "That all of this, every life, is the inside of an egg. Something growing. Not yet born.", "That all of this, every life, is the inside of an egg.|Something growing. Not yet born.", 0.4],
  ],
  hatch: [
    ["x1", "One day, when every life has been lived,"],
    ["x2", "the shell will crack.", undefined, 0.3],
    ["x3", "And what comes out will remember being everyone.", undefined, 2.8],
    ["x4", "Until then, be gentle with the people you meet.", "Until then,|be gentle with the people you meet.", 1.2],
    ["x5", "It might be you.", undefined, 1.4],
  ],
};

export const PARTS = LAYOUT.parts as Record<PartName, { from: number; to: number }>;

export const LINES: VoiceLine[] = PART_NAMES.flatMap((p) => SCRIPT[p].map(([id, text, caption]) => ({ id, text, caption: caption ?? text, beat: LAYOUT.beats[id] ?? 0 })));

/** When a line starts, and a moment `frac` of the way through it. */
export const at = (id: string, frac = 0) => (LAYOUT.beats[id] ?? 0) + frac * (LAYOUT.seconds[id] ?? 4);
/** When a line ends. */
export const end = (id: string) => at(id, 1);
