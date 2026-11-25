// Captions for the voice lines, timed from voice.json: each word pops in as it's (roughly) spoken, and *starred* words
// take the highlight colour. Sits in the social safe zone near the top.
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, beatFrame, type VoiceLine } from "./base";
import { pop } from "./motion";

/** When each word starts within a line, spread by length (longer words take longer to say). */
export function wordTimes(words: string[], seconds: number): number[] {
  const weights = words.map((w) => w.replace(/[*…,.]/g, "").length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  return weights.map((w) => {
    const at = t;
    t += (w / total) * seconds * 0.9;
    return at;
  });
}

export function Captions(props: {
  lines: VoiceLine[];
  bpm: number;
  top: number;
  size: number;
  color: string;
  highlight: string;
  /** Lines (by id) to leave out, e.g. when the picture already says it. */
  skip?: string[];
  /** Font family (default: the kit's Nunito). */
  font?: string;
  /** Frames a caption stays after its line ends. */
  hold?: number;
}) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const lines = props.lines.filter((l) => !props.skip?.includes(l.id));
  const current = lines.findLast((l) => frame >= beatFrame(l.beat, props.bpm, fps));
  if (!current) return null;
  const start = beatFrame(current.beat, props.bpm, fps);
  const end = start + Math.round(current.seconds * fps) + (props.hold ?? 12);
  const next = lines[lines.indexOf(current) + 1];
  const nextStart = next ? beatFrame(next.beat, props.bpm, fps) : Infinity;
  if (frame > end || frame >= nextStart) return null;
  const words = current.caption.split(" ");
  const times = wordTimes(words, current.seconds);
  const fade = interpolate(frame, [end - 6, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let starred = false;
  return (
    <div
      style={{
        position: "absolute",
        top: props.top,
        left: 70,
        width: width - 140,
        textAlign: "center",
        fontFamily: props.font ?? FONT,
        fontWeight: 1000,
        fontSize: props.size,
        lineHeight: 1.04,
        letterSpacing: "-0.025em",
        color: props.color,
        opacity: fade,
      }}
    >
      {words.map((raw, i) => {
        const at = start + Math.round(times[i] * fps) - 2;
        const s = pop(frame, at, fps);
        const opens = raw.startsWith("*");
        const closes = raw.endsWith("*") || raw.endsWith("*,") || raw.endsWith("*.");
        if (opens) starred = true;
        const lit = starred;
        if (closes) starred = false;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.24em",
              color: lit ? props.highlight : undefined,
              opacity: frame < at ? 0 : Math.min(1, s * 2),
              transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px) scale(${interpolate(s, [0, 1], [1.25, 1])})`,
            }}
          >
            {raw.replaceAll("*", "")}
          </span>
        );
      })}
    </div>
  );
}
