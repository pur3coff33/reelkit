// Huge words that slam in: from about 2.4× with a slight tilt, settling with a small overshoot.
import type { CSSProperties } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./base";
import { slam } from "./motion";

export function KineticText(props: {
  text: string;
  start: number;
  size: number;
  color: string;
  weight?: number;
  tilt?: number;
  /** Frame it starts leaving (shrinks and fades), if it does. */
  exit?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < props.start) return null;
  const s = slam(frame, props.start, fps);
  const scale = interpolate(s, [0, 1], [2.4, 1]);
  const rotate = interpolate(s, [0, 1], [props.tilt ?? -4, 0]);
  const leave = props.exit === undefined ? 0 : interpolate(frame, [props.exit, props.exit + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: props.weight ?? 1000,
        fontSize: props.size,
        lineHeight: 0.95,
        letterSpacing: "-0.03em",
        color: props.color,
        opacity: Math.min(1, s * 3) * (1 - leave),
        transform: `scale(${scale * (1 - leave * 0.5)}) rotate(${rotate}deg)`,
        whiteSpace: "nowrap",
        ...props.style,
      }}
    >
      {props.text}
    </div>
  );
}
