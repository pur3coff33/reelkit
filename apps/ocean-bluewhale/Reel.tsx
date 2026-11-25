// The film's composition: one shot melting into the next, and a few soft lines of words. Nothing else on screen.
import { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CinemaCanvas } from "../../src/kit/whatif/cinema";
import { FONT, loadWhatIfFonts } from "../../src/kit/whatif/Reel";
import { shotFrame, shotGrade } from "./sim";
import { END_FADE, LINES, SECONDS, SHOTS, layers, type Line, type ShotName } from "./timeline";

/** Stills for a quick look: the middle of every shot, then a few moments that matter. */
export const LOOK = [
  ...Object.values(SHOTS).map((s) => (s.from + s.to) / 2),
  SHOTS.birth.from + 9, SHOTS.aerial.from + 4.6, SHOTS.fluke.from + 2.5, SHOTS.fluke.from + 5, SHOTS.fluke.from + 7, SHOTS.eye.from + 1, SHOTS.eye.from + 7.6, SHOTS.song.from + 7, SHOTS.night.from + 4, SHOTS.dusk.from + 4,
];

const ease = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

function Layer({ shot, t, f, opacity }: { shot: ShotName; t: number; f: number; opacity: number }) {
  const { width, height } = useVideoConfig();
  const frame = useMemo(() => shotFrame(shot, t), [shot, t]);
  return (
    <AbsoluteFill style={{ opacity }}>
      <CinemaCanvas frame={frame} width={width} height={height} frameNo={f} grade={shotGrade(shot)} />
    </AbsoluteFill>
  );
}

function Words({ l, t }: { l: Line; t: number }) {
  if (t < l.at || t >= l.to) return null;
  const a = ease((t - l.at) / 1.2) * ease((l.to - t) / 1.1);
  const b = ease((t - l.at - 0.6) / 1.2) * ease((l.to - t) / 1.1);
  const drift = 14 * (1 - ease((t - l.at) / 2));
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1330, textAlign: "center", fontFamily: FONT, fontWeight: 600, fontSize: 66, lineHeight: 1.14, letterSpacing: 0.5, color: "#fff", textShadow: "0 2px 18px rgba(2,20,40,0.75), 0 1px 3px rgba(2,20,40,0.6)", transform: `translateY(${drift}px)` }}>
      <div style={{ opacity: a }}>{l.text}</div>
      {l.sub ? <div style={{ opacity: b * 0.92 }}>{l.sub}</div> : null}
    </div>
  );
}

export function OceanReel({ step = 1, at }: { step?: number; at?: number[] }) {
  loadWhatIfFonts();
  const { fps } = useVideoConfig();
  const n = useCurrentFrame();
  const f = at ? Math.round(at[n] * fps) : n * step;
  const t = f / fps;
  return (
    <AbsoluteFill style={{ background: "#04182c" }}>
      {layers(t).map((l) => (
        <Layer key={l.shot} shot={l.shot} t={t} f={f} opacity={l.opacity} />
      ))}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(2,16,32,0) 62%, rgba(2,16,32,0.34) 82%, rgba(2,16,32,0.4) 100%)" }} />
      {LINES.map((l) => (
        <Words key={l.at} l={l} t={t} />
      ))}
      <AbsoluteFill style={{ background: "#04182c", opacity: ease((t - (SECONDS - END_FADE)) / END_FADE) }} />
      {step === 1 && !at ? <Audio src={staticFile("out/music.wav")} /> : null}
    </AbsoluteFill>
  );
}
