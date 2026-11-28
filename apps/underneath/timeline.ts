// "The Forest Underneath": about 2:10 on the fungal network under every forest, in points of light. The script scene by
// scene; when each scene and line starts comes from layout.gen.ts, which `npx tsx apps/underneath/layout.ts` writes from
// how long each line took to say (or, with --estimate, from a word count before there's a voice). The film is as long as
// the voice needs (at least 2:00), never squeezed to a number.
//
// Every claim is in post.md with its source. The story: threads under your feet (a tenth of the galaxy), how plants came
// onto land with fungi, the trade (sugar for minerals), that both sides keep score, rivers inside the threads, the web
// spreading, hub trees, the carbon that goes down, the "talking trees" story and the honest doubt about it, and what we
// do know: nearly every plant has a partner underground.
import type { VoiceLine } from "../../src/kit/config";
import { LAYOUT } from "./layout.gen";

export const MIN_SECONDS = 120;
export const SECONDS = LAYOUT.total;
export const ACTS = ["cosmos", "ancient", "trade", "inside", "forest", "story"] as const;
export type Act = (typeof ACTS)[number];

/** [id, what he says (spelled to be said right), the words on screen ("|" splits them in two), a longer pause before]. */
export type Said = [id: string, text: string, caption?: string, pause?: number];

export const SCENE_NAMES = ["hook", "shore", "cells", "deal", "market", "tunnel", "ripple", "hubs", "carbon", "story", "end"] as const;
export type SceneName = (typeof SCENE_NAMES)[number];

/** `room`: spare seconds this scene gets first, where the picture needs time to breathe. */
export type SceneDef = { name: SceneName; act: Act; lines: Said[]; room?: number };

const S = (name: SceneName, act: Act, lines: Said[], room?: number): SceneDef => ({ name, act, lines, room });

// Ids are lowercase words: they name the WAV files, and Windows treats "a1" and "A1" as the same file.
export const SCENES: SceneDef[] = [
  S("hook", "cosmos", [
    ["hook1", "Under your feet are threads too fine to see."],
    ["hook2", "Laid end to end, they would stretch a tenth of the way across the galaxy.", "Laid end to end, they would stretch|a tenth of the way across the galaxy."],
  ], 1),
  S("shore", "ancient", [
    ["shore1", "Four hundred million years ago, the first plants crept out of the water.", "400 million years ago,|the first plants crept out of the water."],
    ["shore2", "They had no roots. So they took a partner.", "They had no roots.|So they took a partner.", 0.3],
  ]),
  S("cells", "ancient", [
    ["cell1", "A fungus moved in, and inside their cells, it branched into tiny trees.", "A fungus moved in,|and inside their cells it branched into tiny trees."],
    ["cell2", "Scientists named them: little trees.", "Scientists named them|“little trees”."],
  ], 0.5),
  S("deal", "trade", [
    ["deal1", "Ever since, the plant makes sugar from light, and the fungus dissolves stone, to pay in minerals.", "Ever since, the plant makes sugar from light,|and the fungus dissolves stone to pay in minerals."],
  ], 0.5),
  S("market", "trade", [
    ["mark1", "And both sides keep score."],
    ["mark2", "Plants feed the [fungi](/fˈʌŋɡaɪ/) that bring them more. [Fungi](/fˈʌŋɡaɪ/) feed the plants that pay more.", "Plants feed the fungi that bring them more.|Fungi feed the plants that pay more."],
  ]),
  S("tunnel", "inside", [
    ["tun1", "Inside every thread, rivers run two ways at once: sugar out, minerals home.", "Inside every thread, rivers run two ways at once:|sugar out, minerals home."],
  ], 1),
  S("ripple", "inside", [
    ["rip1", "And the web keeps spreading, like a ripple, reaching for new partners.", "And the web keeps spreading like a ripple,|reaching for new partners."],
  ], 0.5),
  S("hubs", "forest", [
    ["hub1", "In one old forest, one fungus was linked to as many as nineteen trees.", "In one old forest, one fungus|was linked to as many as 19 trees."],
    ["hub2", "The oldest trees were the hubs, and young ones grew up inside their web.", "The oldest trees were the hubs,|and young ones grew up inside their web."],
  ]),
  S("carbon", "forest", [
    ["carb1", "Each year, plants send the [fungi](/fˈʌŋɡaɪ/) carbon equal to a third of our fossil fuel emissions.", "Each year, plants send the fungi carbon|equal to a third of our fossil fuel emissions."],
  ], 1),
  S("story", "story", [
    ["tale1", "You may have heard that trees talk; that old trees feed their young through the threads.", "You may have heard that trees talk,|that old trees feed their young through the threads."],
    ["tale2", "It's a beautiful story. Scientists are still arguing about how much of it is true.", "It’s a beautiful story.|Scientists are still arguing about how much of it is true.", 0.3],
  ]),
  S("end", "cosmos", [
    ["end1", "What we do know: more than nine in ten flowering plants have a partner underground.", "What we do know: more than 9 in 10 flowering plants|have a partner underground."],
    ["end2", "Every forest you've walked through was two forests.", "Every forest you’ve walked through|was two forests.", 0.4],
    ["end3", "One you could see. And one feeding it, in the dark.", "One you could see.|And one feeding it, in the dark.", 0.3],
  ], 2),
];

const LEAD = 0.8, FIRST = 0.6, GAP = 0.55, TAIL = 0.7, MIN = 5;
/** The last scene keeps this long after its last line, for the web to curl back into the galaxy the film opens on. */
const OUTRO = 2.6;

/** When each scene and line goes, from how long each line takes to say. The film is at least `least` seconds, longer when
 * the voice needs it (rounded up to a whole second); throws only past a generous ceiling (length is a guide). */
export function layOut(secs: Record<string, number>, least = MIN_SECONDS) {
  const speech = (s: SceneDef) => s.lines.reduce((n, [id, , , pause = 0], i) => n + secs[id] + (i ? GAP + pause : pause), 0);
  const lead = (i: number) => (i ? LEAD : FIRST);
  const tail = (i: number) => (i === SCENES.length - 1 ? OUTRO : TAIL);
  const need = SCENES.map((s, i) => Math.max(MIN, lead(i) + speech(s) + tail(i)));
  const asked = SCENES.reduce((n, s) => n + (s.room ?? 0), 0), needed = need.reduce((a, b) => a + b, 0);
  const total = Math.max(least, Math.ceil(needed + asked));
  if (total > least * 1.25) throw new Error(`the script needs ${total} s, more than 25% over ${least} s: cut a line`);
  let spare = total - needed;
  // Spare time goes first where a scene asked for room, then evenly.
  const first = Math.min(1, spare / Math.max(asked, 1e-9));
  const len = need.map((n, i) => n + (SCENES[i].room ?? 0) * first);
  spare -= asked * first;
  for (let i = 0; i < len.length; i++) len[i] += spare / len.length;

  const scenes = {} as Record<SceneName, { from: number; to: number }>, beats: Record<string, number> = {};
  let from = 0;
  SCENES.forEach((s, i) => {
    const room = len[i] - lead(i) - speech(s) - tail(i);
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
  return { scenes, beats, total };
}

export const SPAN = (name: SceneName) => LAYOUT.scenes[name];
/** When each scene after the first begins: where the points flow into the next shape. */
export const CUTS = SCENES.slice(1).map((s) => LAYOUT.scenes[s.name]?.from ?? 0);
export const actOf = (name: SceneName) => SCENES.find((s) => s.name === name)!.act;

export const LINES: VoiceLine[] = SCENES.flatMap((s) => s.lines.map(([id, text, caption]) => ({ id, text, caption: caption ?? text, beat: LAYOUT.beats[id] ?? 0 })));
