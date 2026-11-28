// Real pictures: a photo moved slowly (push in, pan to a detail), and footage, both given the same archival grade so
// sources from different decades and cameras sit together. `k` is the shot's progress, 0…1.
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { coverTransform, moveAt, printFit, type Move } from "./film";

/** Vignette, a faint warm cast and moving grain. */
export function Grade({ strength = 1 }: { strength?: number }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "rgba(255,190,120,0.05)", mixBlendMode: "soft-light" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${0.55 * strength}) 100%)` }} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.09 * strength, mixBlendMode: "overlay" }}>
        <filter id={`grain-${f % 8}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 8} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${f % 8})`} />
      </svg>
    </AbsoluteFill>
  );
}

const LOOK = "contrast(1.06) saturate(0.82) brightness(0.96)";

export function Still({ src, size, move, k }: { src: string; size: { width: number; height: number }; move: Move; k: number }) {
  const frame = useVideoConfig();
  const { scale, tx, ty } = coverTransform(size, frame, moveAt(move, k));
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: size.width * scale, height: size.height * scale, transform: `translate(${tx}px, ${ty}px)`, filter: LOOK }} />
      <Grade />
    </AbsoluteFill>
  );
}

/** A photo too small to fill the frame, as a print lying on the dark: a thin border, a shadow, a slow drift in. */
export function Print({ src, size, k }: { src: string; size: { width: number; height: number }; k: number }) {
  const frame = useVideoConfig();
  const fit = printFit(size, frame);
  const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, #1a1f26 0%, #0b0e12 75%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: 14, background: "#e9e4d8", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", transform: `scale(${1 + 0.06 * e}) rotate(${-0.6 + 0.5 * e}deg)` }}>
        <Img src={staticFile(src)} style={{ display: "block", width: fit.width, height: fit.height, filter: LOOK }} />
      </div>
      <Grade strength={0.8} />
    </AbsoluteFill>
  );
}

/** Footage, always muted (its sound is never used: fair-use audio is refused, and the mix carries the sound). Plays the
 *  media entry's `use`, counted from the shot's start (DocFilm puts each shot in its own Sequence). */
export function Clip({ src, use, k }: { src: string; use: { from: number; to: number }; k: number }) {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <OffthreadVideo src={staticFile(src)} muted trimBefore={Math.round(use.from * fps)} durationInFrames={Math.max(1, Math.round((use.to - use.from) * fps))} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.02 + 0.04 * k})`, filter: LOOK }} />
      <Grade />
    </AbsoluteFill>
  );
}
