// The last beat: a wordmark (any text, with an optional leaf between two parts, like kop.it's), a tagline and a URL pill.
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./base";
import { pop, slam } from "./motion";

export function EndCard(props: {
  start: number;
  /** The wordmark in parts; a leaf is drawn between them (["kop", "it"] → kop🍃it). */
  mark: string[];
  tagline: string;
  url: string;
  colors: { ink: string; leaf: string; pillBg: string; pillInk: string };
  size?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < props.start) return null;
  const size = props.size ?? 210;
  const m = slam(frame, props.start, fps);
  const t = pop(frame, props.start + 8, fps);
  const u = pop(frame, props.start + 14, fps);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT, color: props.colors.ink }}>
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          display: "flex",
          alignItems: "baseline",
          lineHeight: 1.1,
          transform: `scale(${interpolate(m, [0, 1], [1.8, 1])})`,
          opacity: Math.min(1, m * 3),
        }}
      >
        {props.mark.map((part, i) => (
          <span key={i} style={{ display: "flex", alignItems: "baseline" }}>
            {i > 0 && (
              <i
                style={{
                  display: "inline-block",
                  width: size * 0.3,
                  height: size * 0.45,
                  margin: `0 ${size * 0.08}px`,
                  background: props.colors.leaf,
                  borderRadius: "0 80% 0 80%",
                  transform: `rotate(${8 + (1 - m) * 40}deg) translateY(${size * 0.02}px) scale(${m})`,
                }}
              />
            )}
            {part}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 64, fontWeight: 800, marginTop: 26, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>{props.tagline}</div>
      <div
        style={{
          marginTop: 56,
          fontSize: 46,
          fontWeight: 900,
          padding: "20px 46px",
          borderRadius: 99,
          background: props.colors.pillBg,
          color: props.colors.pillInk,
          opacity: u,
          transform: `scale(${interpolate(u, [0, 1], [0.6, 1])})`,
        }}
      >
        {props.url}
      </div>
    </div>
  );
}
