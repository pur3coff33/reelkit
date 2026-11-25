// The demo films of the looks. `looks` plays all four; each is also a composition of its own.
import type { Film, Line, Voice } from "../../src/kit/looks/Film";
import type { Painter } from "../../src/kit/looks/core";
import { boxed, dots, paper, paperAndLight, partsSheet } from "./scenes";

const said = (voice: Voice, reveal: string, at: number, y?: number): Line[] => [
  { at: 0.3, to: 2.6, voice, text: "They said: never pass\nunder it at night.", y },
  { at, to: 6.4, voice, text: reveal, size: voice === "dots" ? 104 : 126, hit: voice !== "dots", y: y ?? 285 },
];
const one = (paint: Painter, lines: Line[]): Film => ({ seconds: 6, scenes: [{ from: 0, to: 6, paint }], lines });

const films = {
  paper: one(paper, said("paper", "Don’t look up.", 3.6)),
  // Gone before the end, so it loops.
  box: one(boxed, said("box", "Don’t look up.", 3.2, 300).map((l) => ({ ...l, to: Math.min(l.to, 5.5) }))),
  dots: one(dots, said("dots", "It was never a tree.", 3.9)),
  mix: one(paperAndLight, said("paper", "It was never a tree.", 3.9).map((l) => (l.hit ? { ...l, size: 104 } : l))),
};

const all: Film = {
  seconds: 24,
  scenes: Object.values(films).map((f, i) => ({ from: i * 6, to: i * 6 + 6, paint: f.scenes[0].paint, melt: i ? 0.4 : 0 })),
  lines: Object.values(films).flatMap((f, i) => f.lines.map((l) => ({ ...l, at: l.at + i * 6, to: l.to + i * 6 }))),
};

const STILLS = [0.1, 1.2, 2.6, 3.3, 4.5, 5.8];
export const LOOKS: { id: string; film: Film; stills: number[] }[] = [
  { id: "looks", film: all, stills: [5, 11, 17, 23] },
  ...Object.entries(films).map(([name, film]) => ({ id: `looks-${name}`, film, stills: STILLS })),
  { id: "looks-parts", film: { seconds: 3, scenes: [{ from: 0, to: 3, paint: partsSheet }], lines: ["paper/cuts.ts", "box/things.ts", "dots/forms.ts"].map((text, i) => ({ at: i - 0.5, to: i + 1.4, text, voice: "box" as const, size: 46, y: 60 })) }, stills: [0.5, 1.5, 2.5] },
];
