// The What If? series look, shared by every episode: the badge and the simulation label, the hook question that opens
// it, the time stamps, one line of words at the bottom, big slams, and the closing question. An episode gives its picture
// (frameAt), its grade, its words, and any graphics of its own.
import { loadFont } from "@remotion/fonts";
import { useMemo, type ReactNode } from "react";
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { projector, type Frame, type Projector } from "../lowpoly/engine";
import { CinemaCanvas, type Grade } from "./cinema";

export const FONT = "Barlow Condensed";
let fontsLoaded: Promise<unknown> | undefined;
/** Every episode ships Barlow Condensed in its own assets/ (the app folder is the public dir). */
export function loadWhatIfFonts() {
  fontsLoaded ??= Promise.all(["600", "700", "800"].map((w) => loadFont({ family: FONT, url: staticFile(`assets/barlow-condensed-latin-${w}-normal.woff2`), weight: w })));
  return fontsLoaded;
}

export type Fx = { white?: number; black?: number; zoom?: number; tint?: string; tintAmount?: number };
export type Built = { frame: Frame; fx: Fx };
export type Span = { at: number; to: number };
export type Words = Span & { text: string; sub?: string };
export type Slam = Span & { text: string; sub?: string; tone?: string; size?: number; y?: number };
/** "AFTER 12 HOURS": `count` rolls up from the last stamp's. */
export type Stamp = Span & { count: number; unit: string; from?: number; label?: string };

export type Episode = {
  number: number;
  seconds: number;
  accent: string;
  /** Another series' name in place of "WHAT IF?". */
  badge?: string;
  /** What the film is, in place of "FICTIONAL SIMULATION". */
  tag?: string;
  /** No badge, tag or clock in the corners: only the story's words. */
  bare?: boolean;
  /** The hook, in its lines: the first is the small "WHAT IF". */
  hook: Span & { lines: string[] };
  frameAt: (t: number) => Built;
  gradeAt: (t: number) => Grade;
  words: Words[];
  slams: Slam[];
  stamps: Stamp[];
  /** The closing question, from `at` to the end. */
  question: { at: number; text: string };
  /** The episode's own graphics, over the picture and under the series ones. */
  overlay?: (o: { t: number; f: number; fps: number; proj: Projector; fx: Fx }) => ReactNode;
};

const SHADOW = "0 2px 4px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.65)";
const BIG_SHADOW = "0 6px 26px rgba(0,0,0,0.85), 0 2px 3px rgba(0,0,0,0.75)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const fadeIn = (t: number, s: Span, a = 0.18, b = 0.2) => Math.min(clamp01((t - s.at) / a), clamp01((s.to - t) / b));

export function Badge({ ep, accent, name = "WHAT IF?" }: { ep: number; accent: string; name?: string }) {
  return (
    <div style={{ position: "absolute", left: 40, top: 258, display: "flex", alignItems: "stretch", fontFamily: FONT, boxShadow: "0 4px 18px rgba(0,0,0,0.5)" }}>
      <div style={{ background: accent, color: "#05070a", fontWeight: 800, fontSize: 38, letterSpacing: 1, padding: "2px 14px 3px" }}>{name}</div>
      <div style={{ background: "rgba(5,8,12,0.78)", color: "#fff", fontWeight: 700, fontSize: 34, letterSpacing: 2, padding: "5px 14px 3px", borderTop: `2px solid ${accent}`, borderBottom: `2px solid ${accent}` }}>EP {String(ep).padStart(2, "0")}</div>
    </div>
  );
}

export function SimTag({ accent, text = "FICTIONAL SIMULATION" }: { accent: string; text?: string }) {
  return (
    <div style={{ position: "absolute", right: 40, top: 262, fontFamily: FONT, fontWeight: 700, fontSize: 28, letterSpacing: 2.5, color: "#fff", background: "rgba(5,8,12,0.66)", borderRight: `4px solid ${accent}`, padding: "3px 12px 4px" }}>
      {text}
    </div>
  );
}

/** The opening question: a small "WHAT IF", then the rest landing a line at a time. */
function Hook({ hook, t, fps, accent }: { hook: Episode["hook"]; t: number; fps: number; accent: string }) {
  if (t < hook.at || t >= hook.to) return null;
  const out = clamp01((hook.to - t) / 0.25);
  const [first, ...rest] = hook.lines;
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 560, textAlign: "center", fontFamily: FONT, opacity: out }}>
      <div style={{ display: "inline-block", fontWeight: 800, fontSize: 64, letterSpacing: 6, color: "#05070a", background: accent, padding: "0 20px 2px", transform: `scale(${1.3 - 0.3 * spring({ frame: (t - hook.at) * fps, fps, config: { damping: 12, stiffness: 300 } })})` }}>{first}</div>
      {rest.map((line, i) => {
        const at = hook.at + 0.22 + i * 0.32;
        const k = spring({ frame: Math.max(0, (t - at) * fps), fps, config: { damping: 13, stiffness: 260, mass: 0.6 } });
        return (
          <div key={i} style={{ fontWeight: 800, fontSize: line.length > 12 ? 118 : 138, lineHeight: 0.98, color: "#fff", textShadow: BIG_SHADOW, marginTop: i ? 0 : 14, opacity: t < at ? 0 : 1, transform: `scale(${1.35 - 0.35 * k})` }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

function Bottom({ w, t, accent }: { w: Words; t: number; accent: string }) {
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1250, height: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", textAlign: "center", fontFamily: FONT, opacity: fadeIn(t, w), textShadow: SHADOW }}>
      <div style={{ fontWeight: 800, fontSize: 70, lineHeight: 1.03, color: "#fff" }}>{w.text}</div>
      {w.sub ? <div style={{ fontWeight: 700, fontSize: 44, lineHeight: 1.08, color: accent, marginTop: 8 }}>{w.sub}</div> : null}
    </div>
  );
}

function SlamText({ s, t, fps }: { s: Slam; t: number; fps: number }) {
  if (t < s.at || t >= s.to) return null;
  const k = spring({ frame: (t - s.at) * fps, fps, config: { damping: 13, stiffness: 260, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", left: 30, right: 30, top: s.y ?? 760, textAlign: "center", fontFamily: FONT, opacity: clamp01((s.to - t) / 0.2), transform: `scale(${1.4 - 0.4 * k})` }}>
      <div style={{ fontWeight: 800, fontSize: s.size ?? 160, lineHeight: 0.96, color: s.tone ?? "#fff", textShadow: BIG_SHADOW }}>{s.text}</div>
      {s.sub ? <div style={{ fontWeight: 700, fontSize: 46, letterSpacing: 2.5, color: "#fff", textShadow: SHADOW, marginTop: 10 }}>{s.sub}</div> : null}
    </div>
  );
}

/** "AFTER / 12 HOURS", the number rolling up into place. */
function StampText({ s, t, fps, accent }: { s: Stamp; t: number; fps: number; accent: string }) {
  if (t < s.at || t >= s.to) return null;
  const k = spring({ frame: (t - s.at) * fps, fps, config: { damping: 14, stiffness: 240, mass: 0.6 } });
  const roll = clamp01((t - s.at) / 0.55);
  const from = s.from ?? 0;
  const n = Math.round(from + (s.count - from) * (1 - (1 - roll) ** 3));
  return (
    <div style={{ position: "absolute", left: 30, right: 30, top: 640, textAlign: "center", fontFamily: FONT, opacity: clamp01((s.to - t) / 0.2) }}>
      <div style={{ display: "inline-block", fontWeight: 800, fontSize: 54, letterSpacing: 8, color: "#05070a", background: accent, padding: "0 18px 2px" }}>{s.label ?? "AFTER"}</div>
      <div style={{ fontWeight: 800, fontSize: 210, lineHeight: 0.95, color: "#fff", textShadow: BIG_SHADOW, transform: `scale(${1.3 - 0.3 * k})`, fontVariantNumeric: "tabular-nums" }}>
        {n} {s.unit}
      </div>
    </div>
  );
}

/** The time so far, kept in the corner once the first stamp has landed. */
function Elapsed({ stamps, t, accent }: { stamps: Stamp[]; t: number; accent: string }) {
  const last = [...stamps].reverse().find((s) => t >= s.to);
  if (!last) return null;
  return (
    <div style={{ position: "absolute", right: 40, top: 312, fontFamily: FONT, display: "flex", alignItems: "baseline", gap: 10, background: "rgba(5,8,12,0.66)", borderRight: `4px solid ${accent}`, padding: "2px 12px 4px", opacity: clamp01((t - last.to) / 0.3) }}>
      <span style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2, color: "#cfd6dc" }}>{last.label ?? "AFTER"}</span>
      <span style={{ fontWeight: 800, fontSize: 40, color: accent }}>{last.count} {last.unit}</span>
    </div>
  );
}

function Question({ q, t, fps, accent, seconds }: { q: Episode["question"]; t: number; fps: number; accent: string; seconds: number }) {
  if (t < q.at) return null;
  const k = spring({ frame: (t - q.at) * fps, fps, config: { damping: 13, stiffness: 220, mass: 0.7 } });
  const sub = clamp01((t - q.at - 0.8) / 0.3);
  const bounce = Math.abs(Math.sin((t - q.at) * 4.5)) * 14;
  const words = q.text.split(" ");
  return (
    <>
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.42)", opacity: clamp01((t - q.at) / 0.4) * clamp01((seconds - t) / 0.01) }} />
      <div style={{ position: "absolute", left: 40, right: 40, top: 560, textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 800, fontSize: words.join(" ").length > 22 ? 128 : 150, lineHeight: 0.98, color: "#fff", textShadow: BIG_SHADOW, transform: `scale(${1.35 - 0.35 * k})`, opacity: k > 0.02 ? 1 : 0 }}>
          {words.map((w, i) => (
            <span key={i} style={{ color: i === words.length - 1 ? accent : "#fff" }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 56, opacity: sub, fontWeight: 800, fontSize: 54, letterSpacing: 4, color: "#05070a", display: "inline-block", background: accent, padding: "4px 26px 6px" }}>COMMENT YOUR ANSWER</div>
        <div style={{ marginTop: 18 + bounce, opacity: sub, fontWeight: 800, fontSize: 70, color: accent, textShadow: SHADOW }}>▼</div>
      </div>
    </>
  );
}

/** `step` plays every step-th frame and no sound: a contact sheet for reviewing the whole episode fast. */
export function WhatIfReel({ ep, step = 1 }: { ep: Episode; step?: number }) {
  loadWhatIfFonts();
  const f = useCurrentFrame() * step;
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const { frame, fx } = useMemo(() => ep.frameAt(t), [ep, t]);
  const grade = ep.gradeAt(t);
  const proj = projector(frame.camera, width, height);
  const word = ep.words.find((w) => t >= w.at && t < w.to);
  const inHook = t >= ep.hook.at && t < ep.hook.to;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <CinemaCanvas frame={frame} width={width} height={height} frameNo={f} grade={grade} zoom={fx.zoom} />
      {fx.tint ? <AbsoluteFill style={{ background: fx.tint, opacity: fx.tintAmount ?? 0.3, mixBlendMode: "soft-light" }} /> : null}
      {/* Dark bands behind the words, top and bottom, and a soft vignette for the lens. */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.34) 0, rgba(0,0,0,0.26) 14%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 74%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 76% 62% at 50% 50%, transparent 58%, rgba(0,0,0,0.42) 100%)" }} />
      {ep.overlay?.({ t, f, fps, proj, fx })}
      {fx.white ? <AbsoluteFill style={{ background: "#fff", opacity: fx.white }} /> : null}
      {fx.black ? <AbsoluteFill style={{ background: "#000", opacity: fx.black }} /> : null}

      {ep.bare ? null : <Badge ep={ep.number} accent={ep.accent} name={ep.badge} />}
      {ep.bare ? null : <SimTag accent={ep.accent} text={ep.tag} />}
      {!ep.bare && t < ep.question.at ? <Elapsed stamps={ep.stamps} t={t} accent={ep.accent} /> : null}
      <Hook hook={ep.hook} t={t} fps={fps} accent={ep.accent} />
      {!inHook && word && t < ep.question.at ? <Bottom w={word} t={t} accent={ep.accent} /> : null}
      {ep.slams.map((s, i) => <SlamText key={i} s={s} t={t} fps={fps} />)}
      {ep.stamps.map((s, i) => <StampText key={i} s={s} t={t} fps={fps} accent={ep.accent} />)}
      <Question q={ep.question} t={t} fps={fps} accent={ep.accent} seconds={ep.seconds} />
      {step === 1 ? <Audio src={staticFile("out/music.wav")} /> : null}
    </AbsoluteFill>
  );
}
