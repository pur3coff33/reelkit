// A generic phone (rounded bezel, no brand) floating with a soft shadow and a slow drift, playing a captured clip.
import type { ReactNode } from "react";
import { OffthreadVideo, staticFile, useCurrentFrame } from "remotion";

export function PhoneFrame(props: {
  /** Clip under the app folder, e.g. "out/clips/garden.mp4". */
  src: string;
  width: number;
  /** Second of the clip to start at. */
  startAt?: number;
  playbackRate?: number;
  tilt?: number;
  /** Drawn over the screen (e.g. highlights). */
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const w = props.width;
  const bezel = Math.round(w * 0.028);
  const radius = Math.round(w * 0.13);
  const screenW = w - bezel * 2;
  const screenH = Math.round((screenW * 1688) / 780);
  const drift = Math.sin(frame / 22) * 6;
  return (
    <div
      style={{
        width: w,
        height: screenH + bezel * 2,
        borderRadius: radius,
        padding: bezel,
        background: "linear-gradient(150deg, #2d4334, #0f1c14 55%, #22362a)",
        boxShadow: "0 60px 120px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.08) inset, 0 0 60px rgba(127,176,140,.18)",
        transform: `translateY(${drift}px) rotate(${(props.tilt ?? 0) + Math.sin(frame / 30) * 0.6}deg)`,
        position: "relative",
      }}
    >
      <div style={{ width: screenW, height: screenH, borderRadius: radius - bezel, overflow: "hidden", position: "relative", background: "#eef4ea" }}>
        <OffthreadVideo
          src={staticFile(props.src)}
          startFrom={Math.round((props.startAt ?? 0) * 30)}
          playbackRate={props.playbackRate ?? 1}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {props.children}
      </div>
    </div>
  );
}
