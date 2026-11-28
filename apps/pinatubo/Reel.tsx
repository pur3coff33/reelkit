// Pinatubo, 1991: the film. Shots and timing come from layout.gen.ts, pictures from out/media (fetch), the sound from
// out/music.wav (music.ts mixes the voice, the track and the effects). `at` renders stills at those seconds instead
// (pinatubo-look, for review).
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DocFilm } from "../../src/kit/doc/DocFilm";
import type { Probed } from "../../src/kit/doc/fetch";
import { captionCues, missingMedia, type Placed } from "../../src/kit/doc/film";
import { HeightChart } from "../../src/kit/doc/HeightChart";
import { MapCard } from "../../src/kit/doc/MapCard";
import { Clip, Print, Still } from "../../src/kit/doc/Still";
import { Title, loadDocFonts } from "../../src/kit/doc/Text";
import { LAYOUT } from "./layout.gen";
import { MEDIA } from "./media";
import { LINES } from "./script";
import { MAP_RINGS } from "./shots";

export type PinatuboProps = { media: Record<string, Probed>; at?: number[] };

/** Fonts and the fetched media's sizes; fails loudly if a shot's media was never fetched. */
export async function loadPinatubo(): Promise<{ media: Record<string, Probed> }> {
  await loadDocFonts();
  const res = await fetch(staticFile("out/media.json"));
  if (!res.ok) throw new Error("out/media.json is missing: run npm run fetch -- pinatubo");
  const media = (await res.json()) as Record<string, Probed>;
  const missing = missingMedia(LAYOUT.shots, media);
  if (missing.length) throw new Error(`shots use media that wasn't fetched: ${missing.join(", ")}`);
  return { media };
}

/** Each shot's midpoint: one still per shot. */
export const LOOK_AT = LAYOUT.shots.map((s) => +((s.from + s.to) / 2).toFixed(2));

const cues = captionCues(LINES.map((l) => ({ id: l.id, caption: l.caption, at: LAYOUT.lines[l.id], seconds: LAYOUT.spoken[l.id], lead: LAYOUT.lead[l.id] })));
const useOf = Object.fromEntries(MEDIA.map((m) => [m.id, m.use]));

export function PinatuboReel({ media, at }: PinatuboProps) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = at ? at[Math.min(f, at.length - 1)] : f / fps;
  const picture = (s: Placed, local: number, k: number) => {
    const len = s.to - s.from;
    switch (s.kind) {
      case "still": {
        const m = media[s.media];
        const size = { width: m.width ?? 1920, height: m.height ?? 1080 };
        return s.print ? <Print src={m.file} size={size} k={k} /> : <Still src={m.file} size={size} move={s.move} k={k} />;
      }
      case "clip":
        return <Clip src={media[s.media].file} use={useOf[s.media] ?? { from: 0, to: s.to - s.from }} k={k} />;
      case "map":
        return <MapCard view={s.view} pins={s.pins} path={s.path} pathLabel={s.pathLabel} circles={s.circles} storm={s.storm} plume={s.plume} rings={MAP_RINGS} t={local} seconds={len} />;
      case "height":
        return <HeightChart topKm={s.topKm} maxKm={s.maxKm} marks={s.marks} columnLabel={s.columnLabel} base={s.base} t={local} seconds={len} />;
      case "sim":
        throw new Error(`shot ${s.id}: this film has no simulations`);
      case "title":
        return <Title text={s.text} sub={s.sub} note={s.note} t={local} />;
    }
  };
  return (
    <AbsoluteFill style={{ background: "#0b0e12" }}>
      <DocFilm shots={LAYOUT.shots} cues={cues} picture={picture} at={t} />
      {at ? null : <Audio src={staticFile("out/music.wav")} />}
    </AbsoluteFill>
  );
}
