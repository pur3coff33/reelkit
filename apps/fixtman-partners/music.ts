// The partners ad's score: a hopeful pluck for the product page, the tiptoe once the box lands, then a bright groove in C.
import { impact, riser } from "../../src/kit/music/synth";
import { at, band, clatter, knock, ping, whoosh } from "../fixtman/score";
import { CUES, KINDS, SCENES as S } from "./timeline";

const HOOK: [number, number][] = [[0, 79], [0.5, 76], [1, 79], [2, 84], [3, 83], [3.5, 79], [4, 81], [4.5, 76], [5, 81], [6, 79], [6.5, 77], [7, 74]];

export async function writeMusic(file: string) {
  const b = await band(["C", "G", "Am", "F"], S.brand.from, 23);
  const { sfx } = b;

  [72, 76, 79, 84].forEach((n, i) => b.chime(n, 0.15 + i * 0.25));
  b.chime(88, CUES.heart + 0.1);
  sfx.add(ping(), CUES.heart, 0.35);
  sfx.add(knock(), CUES.box, 1.4);
  b.tiptoe(4, S.sell.from);
  sfx.add(clatter(1.4), CUES.burst, 0.9);
  sfx.add(knock(), CUES.noTools, 0.7);
  sfx.add(impact(), CUES.oneStar, 0.5);
  sfx.add(knock(), CUES.stamp, 1.2);
  sfx.add(whoosh(), CUES.stamp + 0.6, 0.8);
  sfx.add(riser(1.4), at(S.brand.from) - 1.45, 0.35);

  b.hit(S.brand.from);
  b.ring(S.brand.from, "C", 1);
  sfx.add(knock(), at(S.brand.from) + 0.1, 1.2);

  b.groove(S.brand.from + 1, S.checkout.from, "kb", HOOK);
  b.groove(S.checkout.from, S.kinds.from, "kcmhb", HOOK);
  b.groove(S.kinds.from, S.cover.from, "kcpvhb", HOOK);
  b.groove(S.cover.from, S.ways.from, "kcphb", HOOK);
  b.groove(S.ways.from, S.standard.from, "cpb", HOOK);
  b.groove(S.standard.from, S.widget.from, "kmb", HOOK);
  b.groove(S.widget.from, S.api.from, "kcmb", HOOK);
  b.groove(S.api.from, S.shops.from, "kcmhb", HOOK);
  b.groove(S.shops.from, S.match.from, "kcphb", HOOK);
  b.groove(S.match.from, S.dash.from, "kcpmhb", HOOK);
  b.groove(S.dash.from, S.why.from, "cpb", HOOK);
  b.groove(S.why.from, S.end.from, "kcpvmhb", HOOK);
  b.groove(S.end.from + 1, 116, "kcpvhb", HOOK);

  for (const n of ["checkout", "ways", "match", "why", "end"] as const) sfx.add(whoosh(), at(S[n].from) - 0.1, 0.8);
  for (const n of ["checkout", "kinds", "cover", "ways", "standard", "widget", "api", "shops", "dash", "why"] as const) b.hit(S[n].from, 0.5);
  for (const k of KINDS.slice(1)) sfx.add(knock(), k.at, 0.45);
  for (const t of [...CUES.cover, CUES.free, CUES.sell, CUES.after]) sfx.add(knock(), t, 0.7);
  b.chime(79, CUES.added);
  b.chime(84, CUES.added + 0.12);
  b.chime(76, CUES.matched);
  [0, 1, 2].forEach((i) => b.chime([72, 76, 79][i], CUES.tracked + i * 0.5));
  CUES.why.forEach((t, i) => b.chime([72, 76, 84][i], t));
  sfx.add(riser(1.5), at(S.why.from) - 1.5, 0.3);

  b.hit(S.end.from, 0.8);
  b.hit(CUES.logo * 2, 0.8);
  sfx.add(knock(), CUES.logo + 0.07, 1);
  b.hit(116, 1);
  b.ring(116, "C", 1.6);
  b.finish(file, S);
}
