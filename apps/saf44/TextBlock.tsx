// The film's only caption: one block, in one place, growing upward from a fixed bottom edge. Time and place in small type, the
// counter while it runs, then the line, then the label that says what this is. It fades, and that's all it does.
import { MONO } from "../../src/kit/lowpoly/Hud";

/** Where the block's bottom edge sits: clear of the platform's own controls. */
export const TEXT_BOTTOM = 1560;
const FONT = "Barlow Condensed";
export const LABEL = "RECONSTRUCTION · SMALL GESTURES IMAGINED · WORDS FROM THE RECORD";

type Props = { stamp?: string; counter?: string; line?: string; lineFont?: "plain" | "radio" | "quote"; lineOpacity?: number; tally?: { n: string; text: string; opacity: number } };

/** How dark the plate behind the whole block is, and the small one behind just the stamp and counter. The big one comes in with the line. */
export function plates(hasLine: boolean, lineOpacity: number) {
  return hasLine ? { whole: 0.6 * lineOpacity, head: 0.6 * (1 - lineOpacity) } : { whole: 0.6, head: 0 };
}

export function TextBlock({ stamp, counter, line, lineFont, lineOpacity = 1, tally }: Props) {
  const shade = plates(Boolean(line), lineOpacity);
  return (
    <div style={{ position: "absolute", left: 52, right: 52, top: TEXT_BOTTOM - 800, height: 800, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", textAlign: "center" }}>
      {tally ? (
        <div style={{ color: "#fff", fontFamily: FONT, opacity: tally.opacity, textShadow: "0 2px 4px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.75)", marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 248, lineHeight: 0.92 }}>{tally.n}</div>
          <div style={{ fontWeight: 700, fontSize: 54, letterSpacing: 2, lineHeight: 1.1, marginTop: 6 }}>{tally.text}</div>
        </div>
      ) : null}
      {stamp || line || counter ? (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 28px 14px", color: "#fff" }}>
          <div style={{ position: "absolute", inset: 0, background: `rgba(4,7,10,${shade.whole})` }} />
          {stamp || counter ? (
            <div style={{ position: "relative", background: `rgba(4,7,10,${shade.head})`, padding: "12px 28px 14px", margin: `-12px -28px ${line ? -8 : -14}px` }}>
              {stamp ? <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, letterSpacing: 1, opacity: 0.82, marginBottom: counter ? 6 : 0 }}>{stamp}</div> : null}
              {counter ? <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: "#ffbe5c" }}>{counter}</div> : null}
            </div>
          ) : null}
          {line ? <div style={{ position: "relative", fontFamily: lineFont === "radio" ? MONO : FONT, fontWeight: lineFont === "radio" ? 700 : 600, fontStyle: lineFont === "quote" ? "italic" : undefined, fontSize: lineFont === "radio" ? 50 : 60, lineHeight: 1.1, opacity: lineOpacity }}>{line}</div> : null}
        </div>
      ) : null}
      <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 25, letterSpacing: 1.4, color: "#fff", opacity: 0.55, marginTop: 8, textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{LABEL}</div>
    </div>
  );
}
