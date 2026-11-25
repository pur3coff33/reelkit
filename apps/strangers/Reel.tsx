// "Made of Strangers": the picture, and what he says in soft type under it.
import { useMemo } from "react";
import { staticFile } from "remotion";
import { LookFilm, loadLookFonts, type Film, type FilmProps } from "../../src/kit/looks/Film";
import { captions, type Spoken } from "../../src/kit/looks/narration";
import { picture } from "./scenes";
import { LINES, SECONDS } from "./timeline";

export type StrangersProps = FilmProps & { spoken?: Spoken };

/** How long each line takes to say, from the voice step. */
export async function loadStrangers() {
  await loadLookFonts();
  const res = await fetch(staticFile("out/voice.json"));
  if (!res.ok) throw new Error("out/voice.json is missing: run npm run voice -- strangers first");
  const { lines } = (await res.json()) as { lines: { id: string; seconds: number }[] };
  return Object.fromEntries(lines.map((l) => [l.id, l.seconds])) as Spoken;
}

/** A still or two from each part, for a contact sheet. */
export const STILLS = [0, 0.3, 1.2, 12.2, 16, 22, 27.6, 33, 41.4, 43, 44, 47, 51, 51.8, 53.5, 56, 57.4, 61, 63.6, 66.5, 69.5, 73.4, 77, 82, 85, 93, 98, 101, 104.5, 108, 111, 113, 116, 118];

export function StrangersReel({ spoken = {}, ...props }: StrangersProps) {
  const film = useMemo((): Film => ({ seconds: SECONDS, bg: "#03020a", music: true, scenes: [{ from: 0, to: SECONDS, paint: picture }], lines: captions(LINES, spoken) }), [spoken]);
  return <LookFilm film={film} {...props} />;
}
