// A documentary's words on screen: the font, a place-and-date line, the reconstruction mark, captions and a title card.
// Quiet and small, in the manner of a long-form documentary: nothing here should shout.
import { loadFont } from "@remotion/fonts";
import type { CSSProperties } from "react";
import { AbsoluteFill } from "remotion";
import w600 from "./fonts/barlow-condensed-latin-600-normal.woff2";
import w700 from "./fonts/barlow-condensed-latin-700-normal.woff2";
import w800 from "./fonts/barlow-condensed-latin-800-normal.woff2";

export const DOC_FONT = "Doc Sans";
let loaded: Promise<unknown> | null = null;
export const loadDocFonts = () => (loaded ??= Promise.all([["600", w600], ["700", w700], ["800", w800]].map(([weight, url]) => loadFont({ family: DOC_FONT, url, weight }))));

const fade = (t: number, from: number, to: number, edge = 0.35) => Math.max(0, Math.min(1, (t - from) / edge, (to - t) / edge));
const label: CSSProperties = { fontFamily: DOC_FONT, fontWeight: 600, textTransform: "uppercase", color: "rgba(255,255,255,0.82)", letterSpacing: "0.12em" };

/** "CLARK AIR BASE · 12 JUNE 1991", lower left. `t` and `to` in the shot's seconds. */
export function DateLine({ text, t, to }: { text: string; t: number; to: number }) {
  return <div style={{ ...label, position: "absolute", left: 64, bottom: 120, fontSize: 30, opacity: fade(t, 0.4, to - 0.1), textShadow: "0 1px 12px rgba(0,0,0,0.7)" }}>{text}</div>;
}

/** On every simulated shot, so a reconstruction never passes for footage. */
export function Recon() {
  return <div style={{ ...label, position: "absolute", left: 56, top: 52, fontSize: 22, color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.45)", padding: "5px 12px 4px" }}>Reconstruction</div>;
}

export function DocCaptions({ cues, t }: { cues: { at: number; to: number; text: string }[]; t: number }) {
  const c = cues.find((x) => t >= x.at && t < x.to + 0.15);
  if (!c) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, display: "flex", justifyContent: "center", opacity: fade(t, c.at, c.to + 0.15, 0.12) }}>
      <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 46, lineHeight: 1.2, color: "#fff", maxWidth: 1400, textAlign: "center", textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.6)" }}>{c.text}</div>
    </div>
  );
}

/** A title card on near-black. `note`: a quiet line at its foot (where the sources are). `t` in the shot's seconds. */
export function Title({ text, sub, note, t }: { text: string; sub?: string; note?: string; t: number }) {
  const o = Math.min(1, t / 0.8);
  return (
    <AbsoluteFill style={{ background: "#0b0e12", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <div style={{ fontFamily: DOC_FONT, fontWeight: 800, fontSize: 132, letterSpacing: "0.06em", color: "#f2efe8", textTransform: "uppercase", opacity: o, transform: `translateY(${(1 - o) * 12}px)` }}>{text}</div>
      {sub ? <div style={{ ...label, fontSize: 30, opacity: Math.min(1, Math.max(0, (t - 0.6) / 0.8)) }}>{sub}</div> : null}
      {note ? <div style={{ ...label, position: "absolute", bottom: 90, fontSize: 24, color: "rgba(255,255,255,0.55)", opacity: Math.min(1, Math.max(0, (t - 1.1) / 0.8)) }}>{note}</div> : null}
    </AbsoluteFill>
  );
}
