// The film: shots end to end, each faded in over the last (or cut), with its date line, the reconstruction mark on
// simulated shots, and the captions over everything. The app draws each shot's picture through `picture`.
import type { ReactNode } from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { CROSSFADE, activeAt, type Placed } from "./film";
import { DateLine, DocCaptions, Recon, loadDocFonts } from "./Text";

export function DocFilm({ shots, cues, picture, at }: {
  shots: Placed[];
  cues: { at: number; to: number; text: string }[];
  /** The shot's picture at `t` seconds into it (`k` = t / its length). */
  picture: (shot: Placed, t: number, k: number) => ReactNode;
  /** Film time to show instead of the frame's (stills for review). */
  at?: number;
}) {
  // Each render tab loads the fonts itself (loadFont holds the frame until they're in); calculateMetadata's load doesn't carry over.
  loadDocFonts();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = at ?? f / fps;
  return (
    <AbsoluteFill style={{ background: "#0b0e12" }}>
      {activeAt(shots, t).map(({ shot, opacity }) => {
        const local = t - shot.from, len = shot.to - shot.from;
        const body = (
          <AbsoluteFill style={{ opacity }}>
            {picture(shot, local, Math.min(1, Math.max(0, local / len)))}
            {shot.kind === "sim" ? <Recon /> : null}
            {"date" in shot && shot.date ? <DateLine text={shot.date} t={local} to={len} /> : null}
          </AbsoluteFill>
        );
        // In the film, each shot sits in its own Sequence, so footage inside it counts frames from the shot's start.
        // For review stills (`at`), the composition is only a few frames long, so a Sequence would never reach the
        // shot: hold each shot at its own moment instead.
        return at === undefined ? (
          <Sequence key={shot.id} from={Math.round(shot.from * fps)} durationInFrames={Math.max(1, Math.round(len * fps) + Math.round(CROSSFADE * fps) + 1)} layout="none">
            {body}
          </Sequence>
        ) : (
          <Freeze key={shot.id} frame={Math.max(0, Math.round(local * fps))}>
            {body}
          </Freeze>
        );
      })}
      <DocCaptions cues={cues} t={t} />
    </AbsoluteFill>
  );
}
