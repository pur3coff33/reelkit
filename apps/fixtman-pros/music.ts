// The pros ad's score: the tiptoe and the pings while leads go nowhere, then a groove that starts on E minor, so it drives.
import { impact, riser } from "../../src/kit/music/synth";
import { at, band, knock, ping, whoosh } from "../fixtman/score";
import { CUES, KINDS, SCENES as S } from "./timeline";

const HOOK: [number, number][] = [[0, 76], [1, 79], [1.5, 78], [2, 74], [3, 71], [3.5, 74], [4, 79], [5, 81], [5.5, 79], [6, 76], [7, 74], [7.5, 71]];

export async function writeMusic(file: string) {
  const b = await band(["Em", "C", "G", "D"], S.brand.from, 11);
  const { sfx } = b;

  b.tiptoe(0, S.stop.from);
  sfx.add(ping(), CUES.paidLead, 0.6);
  for (let i = 0; i < 5; i++) sfx.add(ping(), at(S.another.from) + (i * 11) / 30, 0.5);
  sfx.add(knock(), CUES.hired, 1.1);
  for (let i = 0; i < 4; i++) sfx.add(whoosh(), CUES.drop + (i * 4) / 30 - 0.05, 0.5);
  sfx.add(riser(1.2), at(S.brand.from) - 1.25, 0.35);

  b.hit(S.brand.from);
  b.ring(S.brand.from, "Em", 1);
  sfx.add(knock(), at(S.brand.from) + 0.1, 1.2);

  b.groove(S.brand.from + 1, S.fees.from, "kb", HOOK);
  b.groove(S.fees.from, S.pick.from, "kcphb", HOOK);
  b.groove(S.pick.from, S.kinds.from, "kcmb", HOOK);
  b.groove(S.kinds.from, S.size.from, "kcpvhb", HOOK);
  b.groove(S.size.from, S.own.from, "kcphb", HOOK);
  b.groove(S.own.from, S.no.from, "kcmb", HOOK);
  b.groove(S.no.from, S.paid.from, "cpb", HOOK);
  b.groove(S.paid.from, S.back.from, "kcpmhb", HOOK);
  b.groove(S.back.from, S.numbers.from, "kcpb", HOOK);
  b.groove(S.numbers.from, S.bring.from, "kcpvmhb", HOOK);
  b.groove(S.bring.from, S.form.from, "cpb", HOOK);
  b.groove(S.form.from, S.end.from, "kmhb", HOOK);
  b.groove(S.end.from + 1, 116, "kcpvhb", HOOK);

  for (const n of ["fees", "pick", "own", "paid", "numbers", "end"] as const) sfx.add(whoosh(), at(S[n].from) - 0.1, 0.8);
  for (const n of ["fees", "kinds", "no", "back", "numbers", "form"] as const) b.hit(S[n].from, 0.55);
  for (const k of KINDS.slice(1)) sfx.add(knock(), k.at, 0.45);
  for (const t of [CUES.lead, CUES.subscription, CUES.big, CUES.noPenalty, CUES.friday, ...CUES.bring]) sfx.add(knock(), t, 0.8);
  sfx.add(whoosh(), CUES.turnDown, 0.8);
  sfx.add(impact(), CUES.hundred, 0.4);
  sfx.add(riser(1.5), at(S.numbers.from) - 1.5, 0.3);
  CUES.picks.forEach((t, i) => b.chime([71, 74, 79][i], t));
  [0, 1, 2, 3].forEach((i) => b.chime([67, 71, 74, 79][i], CUES.weekly + (i * 7) / 30));
  CUES.back.forEach((t, i) => b.chime([67, 71, 74][i], t));

  b.hit(S.end.from, 0.8);
  b.hit(CUES.logo * 2, 0.8);
  sfx.add(knock(), CUES.logo + 0.07, 1);
  b.hit(116, 1);
  b.ring(116, "G", 1.6);
  b.finish(file, S);
}
