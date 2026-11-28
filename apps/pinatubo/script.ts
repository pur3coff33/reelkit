// The narration and every word on screen, each naming the facts it states (facts.ts). `text` is spelled the way Kokoro
// should say it; `caption` is what's shown ("|" splits it into halves shown in turn). `beat` is filled in by the layout.
import type { Claim } from "../../src/kit/doc/facts";
import type { VoiceLine } from "../../src/kit/config";

export type Line = VoiceLine & { facts: string[] };

const line = (id: string, text: string, caption: string, facts: string[], speed?: number): Line => ({ id, text, caption, facts, beat: 0, ...(speed ? { speed } : {}) });

// Delivery: Kokoro has no emotion setting, so the feeling comes from pace and punctuation. Quiet and slow at the start,
// quicker and clipped through the evacuation, heavy on the eruption, slowest on the dead, lifting for the last line.
export const LINES: Line[] = [
  line("slept", "For five hundred years… Mount Pinatubo slept.", "For 500 years, Mount Pinatubo slept.", ["slumber", "where"], 0.88),
  line("steam", "Then, in April 1991… steam explosions tore open its side.", "Then, in April 1991,|steam explosions tore open its side.", ["april"], 0.95),
  line("watch", "Scientists from fee-volks and the U.S. Geological Survey wired it with instruments — and watched.", "Scientists from PHIVOLCS and the U.S. Geological Survey|wired it with instruments, and watched.", ["team"], 1.0),
  line("alert", "June ninth. Alert level five: eruption in progress.", "June 9. Alert level 5:|eruption in progress.", ["alert5"], 1.06),
  line("moved", "By June twelfth, at least fifty-eight thousand people had been evacuated.", "By June 12, at least 58,000 people|had been evacuated.", ["radius30"], 1.08),
  line("clark", "About fourteen thousand five hundred left Clark Air Base — on June tenth.", "About 14,500 left Clark Air Base|on June 10.", ["clark"], 1.08),
  line("blast", "Then, on June fifteenth… it exploded. The century's second-largest eruption.", "On June 15, it exploded:|the century's second-largest eruption.", ["june15", "second"], 0.92),
  line("typhoon", "Its ash rose thirty-five kilometres… just as Typhoon Yoon-ya crossed Luzon.", "Its ash rose 35 km,|just as Typhoon Yunya crossed Luzon.", ["height", "yunya"], 0.98),
  line("roofs", "Rain soaked the ash… and thousands of roofs collapsed under its weight.", "Rain soaked the ash,|and thousands of roofs collapsed under its weight.", ["roofs"], 0.95),
  line("planet", "Nearly twenty million tons of sulfur dioxide cooled the planet by about half a degree, for almost two years.", "Nearly 20 million tons of sulfur dioxide|cooled the planet by about half a degree, for almost two years.", ["so2", "cooling"], 1.0),
  line("died", "Hundreds died.", "Hundreds died.", ["deaths"], 0.82),
  line("saved", "But the warnings saved at least five thousand lives.", "But the warnings saved at least 5,000 lives.", ["saved"], 0.94),
];

const claim = (id: string, text: string, facts: string[]): Claim => ({ id, text, facts });

/** Date lines, map labels and the title. */
export const T = {
  plumeDate: claim("plumeDate", "Clark Air Base · 12 June 1991", ["june12", "clarkPlace"]),
  aprilDate: claim("aprilDate", "Mount Pinatubo · April 1991", ["april"]),
  pinatubo: claim("pinatubo", "Mount Pinatubo", ["where"]),
  clarkPin: claim("clarkPin", "Clark Air Base", ["clarkPlace"]),
  subicPin: claim("subicPin", "Subic Bay", ["clarkPlace"]),
  r10: claim("r10", "10 km", ["danger10"]),
  r20: claim("r20", "20 km · 9 June", ["alert5"]),
  r30: claim("r30", "30 km · 12 June", ["radius30"]),
  evacDate: claim("evacDate", "Clark Air Base · June 1991", ["clark"]),
  blastDate: claim("blastDate", "15 June 1991", ["june15"]),
  yunyaPin: claim("yunyaPin", "Typhoon Yunya", ["yunya"]),
  subicDate: claim("subicDate", "Subic Bay Naval Station", ["clarkPlace"]),
  strat: claim("strat", "Stratosphere · 10 km", ["stratosphere"]),
  col35: claim("col35", "Ash column", ["height"]),
  ashLabel: claim("ashLabel", "Ash cloud · 400 km across", ["ashCloud"]),
  title: claim("title", "Pinatubo", ["where"]),
  titleSub: claim("titleSub", "15 June 1991", ["june15"]),
} satisfies Record<string, Claim>;

export const TEXTS: Claim[] = Object.values(T);
