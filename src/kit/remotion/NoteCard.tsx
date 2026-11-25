// A notification-style card for an AI-written note: slides up, a ✦ that twinkles in the header, and the text typing
// itself out word by word. `sample` puts a small "sample note" mark on it (when the real AI note wasn't available).
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./base";
import { pop } from "./motion";

export type NoteCardLine = { emoji?: string; text: string; label?: string; strong?: boolean };

export function NoteCard(props: {
  start: number;
  width: number;
  title: string;
  lines: NoteCardLine[];
  /** Words typed per second. */
  speed?: number;
  sample?: boolean;
  colors: { card: string; ink: string; accent: string; soft: string };
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < props.start) return null;
  const s = pop(frame, props.start, fps);
  const typed = Math.max(0, ((frame - props.start - 6) / fps) * (props.speed ?? 14));
  let budget = typed;
  const sparkle = 1 + 0.35 * Math.max(0, Math.sin((frame - props.start) / 3)) * Math.exp(-(frame - props.start) / 20);
  return (
    <div
      style={{
        width: props.width,
        padding: "34px 40px 38px",
        borderRadius: 44,
        background: props.colors.card,
        color: props.colors.ink,
        fontFamily: FONT,
        boxShadow: "0 40px 90px rgba(0,0,0,.45)",
        transform: `translateY(${interpolate(s, [0, 1], [180, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
        opacity: Math.min(1, s * 2),
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 900, marginBottom: 20 }}>
        <span style={{ display: "inline-block", color: props.colors.accent, transform: `scale(${sparkle}) rotate(${(sparkle - 1) * 60}deg)`, fontSize: 40 }}>✦</span>
        {props.title}
        {props.sample && (
          <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800, letterSpacing: "0.12em", padding: "6px 12px", borderRadius: 99, background: "#f4d27a", color: "#3b2a00" }}>
            SAMPLE NOTE
          </span>
        )}
      </div>
      {props.lines.map((line, i) => {
        const words = line.text.split(" ");
        const shown = Math.min(words.length, Math.floor(budget));
        budget -= words.length;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 18,
              alignItems: "flex-start",
              fontSize: line.strong ? 44 : 40,
              fontWeight: line.strong ? 900 : 700,
              lineHeight: 1.22,
              marginTop: i ? 22 : 0,
              padding: line.label ? "20px 26px 24px" : 0,
              borderRadius: 28,
              background: line.label ? props.colors.soft : "transparent",
            }}
          >
            {line.emoji && <span style={{ fontSize: 40 }}>{line.emoji}</span>}
            <div>
              {line.label && <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.14em", color: props.colors.accent, marginBottom: 6 }}>{line.label}</div>}
              {words.map((w, k) => (
                <span key={k} style={{ opacity: k < shown ? 1 : 0 }}>
                  {w}{" "}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
