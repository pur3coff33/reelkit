// "The Cosmic Egg": the picture, and what he says in soft type under it.
import { LookFilm, type Film, type FilmProps } from "../../src/kit/looks/Film";
import { captions } from "../../src/kit/looks/narration";
import { LAYOUT } from "./layout.gen";
import { picture } from "./shots";
import { LINES, PARTS, SECONDS, at } from "./timeline";

const FILM: Film = { seconds: SECONDS, bg: "#03020a", music: true, scenes: [{ from: 0, to: SECONDS, paint: picture }], lines: captions(LINES, LAYOUT.seconds) };

/** A still from the middle of every line, and from the start of every part: the contact sheet. */
export const STILLS = [...LINES.map((l) => at(l.id, 0.6)), ...Object.values(PARTS).map((p) => p.from + 1.2), SECONDS - 4].sort((a, b) => a - b);

export function CosmicEggReel(props: FilmProps) {
  return <LookFilm film={FILM} {...props} />;
}
