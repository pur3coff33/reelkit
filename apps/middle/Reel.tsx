// "The Middle of Everything": the picture, and what he says in soft type under it.
import { useMemo } from "react";
import { staticFile } from "remotion";
import { LookFilm, loadLookFonts, type Film, type FilmProps } from "../../src/kit/looks/Film";
import { captions, type Spoken } from "../../src/kit/looks/narration";
import { picture } from "./scenes";
import { LINES, SCENES, SECONDS, SPAN } from "./timeline";

/** From the voice step: how long each line's speech lasts, and the silence before it starts. */
export type Said = { seconds: Spoken; lead: Spoken };
export type MiddleProps = FilmProps & { spoken?: Said };

/** How long each line takes to say and how long before the speech starts, from the voice step. */
export async function loadMiddle(): Promise<Said> {
  await loadLookFonts();
  const res = await fetch(staticFile("out/voice.json"));
  if (!res.ok) throw new Error("out/voice.json is missing: run npm run voice -- middle first");
  const { lines } = (await res.json()) as { lines: { id: string; seconds: number; lead?: number }[] };
  return { seconds: Object.fromEntries(lines.map((l) => [l.id, l.seconds])), lead: Object.fromEntries(lines.map((l) => [l.id, l.lead ?? 0])) };
}

/** One still from the middle of each scene. */
export const MOCK_STILLS = SCENES.map((s) => +((SPAN(s.name).from + SPAN(s.name).to) / 2).toFixed(2));
/** Each scene just after it forms and in its middle, and every cut a moment after the burst. */
export const STILLS = SCENES.flatMap((s, i) => [...(i ? [SPAN(s.name).from + 0.15] : []), SPAN(s.name).from + 1.6, (SPAN(s.name).from + SPAN(s.name).to) / 2]).map((t) => +t.toFixed(2));

/** For reviewing the scenes being worked on: [scene, fraction of the way through it]. */
const REVIEW: [Parameters<typeof SPAN>[0], number][] = [
  ["hook", 0.001], ["foam", 0], ["vacuum", 0], ["proton", 0], ["nucleus", 0], ["dna", 0], ["egg", 0],
  ["human", 0], ["earth", 0], ["supernova", 0], ["galaxy", 0], ["web", 0], ["end", 0], ["end", 0.999],
];
export const REVIEW_STILLS = REVIEW.map(([n, k]) => +(SPAN(n).from + (SPAN(n).to - SPAN(n).from) * k).toFixed(2));

export function MiddleReel({ spoken = { seconds: {}, lead: {} }, ...props }: MiddleProps) {
  const film = useMemo((): Film => {
    // Captions wait for the speech itself, not the silence the voice leaves before it.
    const lead = (id: string) => spoken.lead[id] ?? 0;
    const lines = LINES.map((l) => ({ ...l, beat: l.beat + lead(l.id) }));
    const seconds = Object.fromEntries(Object.entries(spoken.seconds).map(([id, s]) => [id, s - lead(id)]));
    return { seconds: SECONDS, bg: "#03020a", music: true, scenes: [{ from: 0, to: SECONDS, paint: picture }], lines: captions(lines, seconds) };
  }, [spoken]);
  return <LookFilm film={film} {...props} />;
}
