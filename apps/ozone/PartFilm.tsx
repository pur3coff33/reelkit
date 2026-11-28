// Plays one part: its shots (crossfading unless a shot cuts), its captions, and its sound (out/parts/<id>/music.wav).
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { captionCues } from "../../src/kit/doc/film";
import { DocCaptions, loadDocFonts } from "../../src/kit/doc/Text";
import { FILMS } from "./films";
import type { PartId } from "./parts";

/** `draw` gets the seconds into the shot and the shot's length. `cut`: starts hard instead of fading in. */
export type Shot = { from: number; to: number; cut?: boolean; draw: (t: number, len: number) => ReactNode };

const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const Shade = ({ o }: { o: number }) => <AbsoluteFill style={{ background: "#000", opacity: clamp(o) }} />;
export const Black = () => <AbsoluteFill style={{ background: "#000" }} />;

const FADE = 0.6;

export function PartFilm({ id }: { id: PartId }) {
  loadDocFonts();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const { script, layout, shots } = FILMS[id];
  const list = shots(layout);
  const cues = captionCues(script.lines.map((l) => ({ id: l.id, caption: l.caption, at: layout.lines[l.id], seconds: layout.spoken[l.id], lead: layout.lead[l.id] })));
  const live = list
    .map((s, i) => {
      const next = list[i + 1];
      // A shot stays on through the next one's fade unless the next one cuts.
      const end = next && !next.cut ? s.to + FADE : s.to;
      if (t < s.from || t >= end) return null;
      return { s, i, o: s.cut || i === 0 ? 1 : clamp((t - s.from) / FADE) };
    })
    .filter((x) => x !== null);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {live.map(({ s, o, i }) => (
        <AbsoluteFill key={i} style={{ opacity: o }}>{s.draw(t - s.from, s.to - s.from)}</AbsoluteFill>
      ))}
      <DocCaptions cues={cues} t={t} />
      <Audio src={staticFile(`out/parts/${id}/music.wav`)} />
    </AbsoluteFill>
  );
}
