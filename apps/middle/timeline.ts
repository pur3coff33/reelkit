// "The Middle of Everything": 2:00 from the quantum foam to the cosmic web, stopping at the exact middle (a human egg).
// The script scene by scene. When each scene and line starts comes from layout.gen.ts, which `npx tsx apps/middle/layout.ts`
// writes from how long each line took to say (or, with --estimate, from a word count before there's a voice).
import type { VoiceLine } from "../../src/kit/config";
import { LAYOUT } from "./layout.gen";

export const SECONDS = 120;
export const ACTS = ["subatomic", "molecules", "cells", "earth", "stars", "cosmic"] as const;
export type Act = (typeof ACTS)[number];

/** [id, what he says (spelled to be said right), the words on screen ("|" splits them in two), a longer pause before]. */
export type Said = [id: string, text: string, caption?: string, pause?: number];

export const SCENE_NAMES = [
  "hook", "foam", "vacuum", "proton", "nucleus",
  "dna",
  "egg",
  "human", "earth",
  "supernova",
  "galaxy", "web", "end",
] as const;
export type SceneName = (typeof SCENE_NAMES)[number];

/** `room`: spare seconds this scene gets first, where the picture needs time to breathe. */
export type SceneDef = { name: SceneName; act: Act; lines: Said[]; room?: number };

const S = (name: SceneName, act: Act, lines: Said[], room?: number): SceneDef => ({ name, act, lines, room });

// Ids are lowercase words: they name the WAV files, and Windows treats "a1" and "A1" as the same file.
export const SCENES: SceneDef[] = [
  S("hook", "subatomic", [["hook1", "There is a place, exactly in the middle of everything.", "There is a place|exactly in the middle of everything."], ["hook2", "You have been there."]], 1),
  S("foam", "subatomic", [["foam1", "Start at the bottom, where space itself boils.", "Start at the bottom,|where space itself boils."]]),
  S("vacuum", "subatomic", [["vac1", "Even nothing isn't empty.", "Even nothing isn’t empty."], ["vac2", "Pairs of particles flicker into being, and vanish.", "Pairs of particles flicker into being,|and vanish."]]),
  S("proton", "subatomic", [["pro1", "A proton is three quarks."], ["pro2", "But ninety-nine percent of its mass isn't the quarks at all.", "But 99% of its mass|isn’t the quarks at all."], ["pro3", "It's energy, holding on.", "It’s energy, holding on."]]),
  S("nucleus", "subatomic", [["nuc1", "If an atom were a stadium, its nucleus would be a seed at the centre.", "If an atom were a stadium,|its nucleus would be a seed at the centre."]]),
  S("dna", "molecules", [["dna1", "Atoms hold hands, and the holding becomes a code.", "Atoms hold hands,|and the holding becomes a code."], ["dna2", "Three billion letters."]]),
  S("egg", "cells", [
    ["egg1", "And here, is the middle.", "And here is the middle.", 2.2],
    ["egg2", "Halfway between the smallest size and the edge of all we can see, is a tenth of a millimetre.", "Halfway between the smallest size|and the edge of all we can see|is a tenth of a millimetre."],
    ["egg3", "The width of a human egg.", "The width of a human egg."],
    ["egg4", "The place you began.", "The place you began.", 0.4],
  ], 3),
  S("human", "earth", [["hum1", "From there, you grew.", "From there, you grew."], ["hum2", "Thirty trillion cells, agreeing to be one person.", "Thirty trillion cells,|agreeing to be one person."]]),
  S("earth", "earth", [["earth1", "Eight billion of those agreements, on one wet stone.", "Eight billion of those agreements,|on one wet stone."]]),
  S("supernova", "stars", [["nova1", "The iron in your blood, was made in exploding stars.", "The iron in your blood|was made in exploding stars."]], 2),
  S("galaxy", "cosmic", [["gal1", "Hundreds of billions of stars, turning, slow as breath.", "Hundreds of billions of stars,|turning slow as breath."]]),
  S("web", "cosmic", [["web1", "And the galaxies hang on threads, a web so wide that light is still crossing it.", "And the galaxies hang on threads,|a web so wide that light is still crossing it."]], 1),
  S("end", "cosmic", [["end1", "Look out, and it never ends.", "Look out, and it never ends."], ["end2", "Look in, and it never ends.", "Look in, and it never ends."], ["end3", "And you, are right in the middle.", "And you are right in the middle.", 0.4]], 2),
];

const LEAD = 0.8, FIRST = 0.6, GAP = 0.55, TAIL = 0.7, MIN = 5;

/** When each scene and line goes, from how long each line takes to say. Throws if the script doesn't fit. */
export function layOut(secs: Record<string, number>, total = SECONDS) {
  const speech = (s: SceneDef) => s.lines.reduce((n, [id, , , pause = 0], i) => n + secs[id] + (i ? GAP + pause : pause), 0);
  const lead = (i: number) => (i ? LEAD : FIRST);
  const need = SCENES.map((s, i) => Math.max(MIN, lead(i) + speech(s) + TAIL));
  let spare = total - need.reduce((a, b) => a + b, 0);
  if (spare < 0) throw new Error(`the script runs ${(-spare).toFixed(1)} s over ${total} s`);
  // Spare time goes first where a scene asked for room, then evenly.
  const asked = SCENES.reduce((n, s) => n + (s.room ?? 0), 0), first = Math.min(1, spare / Math.max(asked, 1e-9));
  const len = need.map((n, i) => n + (SCENES[i].room ?? 0) * first);
  spare -= asked * first;
  for (let i = 0; i < len.length; i++) len[i] += spare / len.length;

  const scenes = {} as Record<SceneName, { from: number; to: number }>, beats: Record<string, number> = {};
  let from = 0;
  SCENES.forEach((s, i) => {
    const room = len[i] - lead(i) - speech(s) - TAIL;
    const n = s.lines.length, before = lead(i) + room * 0.3, gap = n > 1 ? (room * 0.3) / (n - 1) : 0;
    let t = from + before;
    s.lines.forEach(([id, , , pause = 0], j) => {
      t += j ? GAP + pause + gap : pause;
      beats[id] = t;
      t += secs[id];
    });
    scenes[s.name] = { from, to: i === SCENES.length - 1 ? total : from + len[i] };
    from += len[i];
  });
  return { scenes, beats };
}

export const SPAN = (name: SceneName) => LAYOUT.scenes[name];
/** When each scene after the first begins: where the points explode. */
export const CUTS = SCENES.slice(1).map((s) => LAYOUT.scenes[s.name]?.from ?? 0);
export const actOf = (name: SceneName) => SCENES.find((s) => s.name === name)!.act;

export const LINES: VoiceLine[] = SCENES.flatMap((s) => s.lines.map(([id, text, caption]) => ({ id, text, caption: caption ?? text, beat: LAYOUT.beats[id] ?? 0 })));
