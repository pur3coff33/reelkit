// Part 02-paper: when things happen, in seconds from the part's start, shared by the picture (stamps landing, verdicts on
// the checklist) and the sound (a stamp's thud, a typewriter's strike), so the two can't drift apart.
import type { Layout } from "../../parts";

export function events(L: Layout) {
  const l = L.lines, S = L.spoken;
  const papers = l.p2 - 0.4;
  return {
    papers,
    /** p2 names the permits and the certificate; each is stamped as it's said. */
    stamps: [l.p2 + S.p2 * 0.55, l.p2 + S.p2 * 0.66, l.p2 + S.p2 * 0.93],
    /** "for 35 persons" written on the certificate as p3 says it. */
    thirtyFive: l.p3 + S.p3 * 0.78,
    corridor: l.p4 + S.p4 * 0.5,
    blocked: l.p5 + S.p5 * 0.5,
    /** The checklist's verdicts: no sprinklers, defective extinguishers, then the two already told. */
    verdicts: [l.p10 + S.p10 * 0.22, l.p10 + S.p10 * 0.92, l.p10 + S.p10 + 0.35, l.p10 + S.p10 + 0.8],
    /** p11 in two halves: the 1995 certificate stamped, then the prosecutors' words. */
    stamp1995: l.p11 + S.p11 * 0.36,
    quote1995: l.p11 + S.p11 * 0.47,
    claimed: l.p12 + S.p12 * 0.8,
    crowd: l.p14 - 0.3,
  };
}
