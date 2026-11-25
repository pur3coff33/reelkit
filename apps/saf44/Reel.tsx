// The lens and the words. Under the words: a lens's worth of light and air. Over it: one text block in one place, a map name or
// two where a map needs them, and the title and end cards. Shots melt into each other; only the blast cuts hard.
import { loadFont } from "@remotion/fonts";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { projector, render, type Frame } from "../../src/kit/lowpoly/engine";
import { CinemaCanvas, type Grade } from "../fallout/cinema";
import { filmAt } from "./film";
import type { Built, Fx, Tag, Tone } from "./props";
import { TextBlock } from "./TextBlock";
import { CARDS, SCENES, STAMPS, TALLIES, counterAt, sceneAt } from "./timeline";

const FONT = "Barlow Condensed";
let fontsLoaded: Promise<unknown> | undefined;
export function loadSaf44Fonts() {
  fontsLoaded ??= Promise.all(["600", "700", "800"].map((w) => loadFont({ family: FONT, url: staticFile(`assets/barlow-condensed-latin-${w}-normal.woff2`), weight: w })));
  return fontsLoaded;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const SHADOW = "0 2px 4px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.75)";
const TONE: Record<Tone, string> = { cyan: "#7be9f7", amber: "#ffbe5c", green: "#9bea95", white: "#ffffff", dim: "#7d8a90" };
const LONG_LABEL = "Reconstruction from public records. Positions and movements are approximate, and figures on screen are illustrative, not a headcount. Small gestures are imagined. Words on screen are from the record.";

const fadeOf = (t: number, from: number, to: number, f = 0.35) => Math.min(clamp01((t - from) / f), clamp01((to - t) / f));

/** The look of each stretch: sober, with the colour drawn out towards the end. */
function gradeAt(t: number): Grade {
  if (t < SCENES.practice.from) return { bloom: 0.12, contrast: 1.06, saturate: 0.74 };
  if (t < SCENES.morning.from) return { bloom: 0.5, contrast: 1.12, saturate: 0.82, tint: "#3e5a86", tintAmount: 0.18 };
  if (t < SCENES.call.from) return { bloom: 0.26, contrast: 1.1, saturate: 0.78, tint: "#d99a6a", tintAmount: 0.1 };
  if (t < SCENES.eleven.from) return { bloom: 0.16, contrast: 1.1, saturate: 0.66, tint: "#e6d9a8", tintAmount: 0.06 };
  if (t < SCENES.lights.from) return { bloom: 0.24, contrast: 1.1, saturate: 0.66, tint: "#d68a58", tintAmount: 0.12 };
  if (t < SCENES.bicycle.from) return { bloom: 0.5, contrast: 1.1, saturate: 0.78, tint: "#3e5a86", tintAmount: 0.12 };
  if (t < SCENES.count.from) return { bloom: 0.14, contrast: 1.06, saturate: 0.72 };
  if (t < SCENES.cost.from) return { bloom: 0.06, contrast: 1.06, saturate: 0.3 };
  return { bloom: 0.12, contrast: 1.06, saturate: 0.74 };
}

/** What's right in front of the lens: its own canvas, out of focus, over the frame. */
function NearLayer({ frame, blur, width, height }: { frame: Frame; blur: number; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) render(ctx, width, height, frame);
  }, [frame, width, height]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height, filter: `blur(${blur}px) brightness(0.72)` }} />;
}

/** A band of mist where the land meets the sky. */
function Mist({ frame, mist, width, height, frameNo }: { frame: Frame; mist: NonNullable<Fx["mist"]>; width: number; height: number; frameNo: number }) {
  const proj = projector(frame.camera, width, height);
  const c = frame.camera;
  const ahead = proj([c.pos[0] + (c.target[0] - c.pos[0]) * 1e3, c.pos[1], c.pos[2] + (c.target[2] - c.pos[2]) * 1e3]);
  const y = ahead.visible ? ahead.y : height * 0.55;
  const drift = (frameNo * 0.25) % 1080;
  return <div style={{ position: "absolute", left: 0, right: 0, top: y - 420, height: 840, pointerEvents: "none", mixBlendMode: "screen", opacity: mist.alpha, background: `radial-gradient(ellipse 70% 34% at ${40 + 14 * Math.sin(drift / 172)}% 50%, ${mist.color}, transparent 72%), linear-gradient(180deg, transparent 0, ${mist.color}88 50%, transparent 100%)` }} />;
}

/** Cloud shadow sliding slowly across the land. */
function Clouds({ amount, frameNo }: { amount: number; frameNo: number }) {
  const x = (k: number, s: number) => ((k * 1500 + frameNo * s) % 1800) - 400;
  const blobs = [
    { x: x(0.1, 0.12), y: 420, w: 720, h: 520 },
    { x: x(0.47, 0.09), y: 1040, w: 860, h: 640 },
    { x: x(0.81, 0.15), y: 1500, w: 640, h: 480 },
  ];
  return (
    <AbsoluteFill style={{ mixBlendMode: "multiply", pointerEvents: "none", opacity: amount }}>
      {blobs.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, background: "radial-gradient(ellipse closest-side, #2c3440 0, #2c344088 45%, transparent 100%)" }} />
      ))}
    </AbsoluteFill>
  );
}

/** The sun in the glass: a soft bloom, a thin streak, and, low down, a fan of rays. */
function Flare({ frame, flare, width, height, frameNo }: { frame: Frame; flare: NonNullable<Fx["flare"]>; width: number; height: number; frameNo: number }) {
  const at = projector(frame.camera, width, height)(flare.p);
  if (!at.visible || flare.alpha <= 0.01) return null;
  const turn = frameNo * 0.012;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      {flare.rays ? <div style={{ position: "absolute", left: at.x - 1400, top: at.y - 1400, width: 2800, height: 2800, opacity: flare.rays, background: `repeating-conic-gradient(from ${turn}deg, rgba(255,214,160,0.55) 0deg 3deg, transparent 5deg 11deg, rgba(255,214,160,0.3) 13deg 15deg, transparent 17deg 24deg)`, maskImage: "radial-gradient(circle, black 0, transparent 62%)", WebkitMaskImage: "radial-gradient(circle, black 0, transparent 62%)" }} /> : null}
      <div style={{ position: "absolute", left: at.x - 460, top: at.y - 460, width: 920, height: 920, opacity: flare.alpha, background: "radial-gradient(circle, rgba(255,226,180,0.95) 0, rgba(255,170,96,0.36) 26%, transparent 66%)" }} />
      <div style={{ position: "absolute", left: -200, width: width + 400, top: at.y - 5, height: 10, opacity: flare.alpha * 0.8, background: "linear-gradient(90deg, transparent, rgba(255,190,130,0.45) 26%, rgba(255,244,222,1) 50%, rgba(255,190,130,0.45) 74%, transparent)", filter: "blur(3px)" }} />
    </AbsoluteFill>
  );
}

/** Through night vision: the picture turned to green phosphor in a tube, with the noise such a tube has. */
function NightVision({ frameNo }: { frameNo: number }) {
  const a = Math.imul(frameNo + 1, 2654435761) >>> 0;
  return (
    <>
      <AbsoluteFill style={{ background: "#3cff78", mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: "#0a3a18", mixBlendMode: "screen", opacity: 0.55 }} />
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0 2px, transparent 2px 4px)", backgroundPosition: `0 ${a % 4}px` }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle 760px at 50% 44%, transparent 76%, rgba(0,0,0,0.92) 100%)" }} />
    </>
  );
}

/** A name on the map. Only on map shots, and only while it's clear of the text block and the frame's edges. */
function MapTag({ tag, frame, width, height }: { tag: Tag; frame: Frame; width: number; height: number }) {
  const at = projector(frame.camera, width, height)(tag.p);
  if (!at.visible || at.y < 300 || at.y > 1150 || at.x < -20 || at.x > 1100) return null;
  const side = tag.side ?? 1, color = TONE[tag.tone];
  const x = Math.min(width - 30, Math.max(30, at.x)), y = at.y;
  const boxW = 420;
  return (
    <>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={`M ${x} ${y} L ${x + side * 30} ${y - 34}`} stroke={color} strokeWidth={2.5} fill="none" opacity={0.85} />
      </svg>
      <div style={{ position: "absolute", left: side > 0 ? Math.min(x + 34, width - boxW) : undefined, right: side < 0 ? Math.min(width - x + 34, width - boxW) : undefined, top: y - 66, fontFamily: FONT, color, textAlign: side > 0 ? "left" : "right", width: boxW, textShadow: SHADOW, lineHeight: 1.02 }}>
        <div style={{ fontWeight: 700, fontSize: 40, letterSpacing: 1.4 }}>{tag.text}</div>
        {tag.sub ? <div style={{ fontWeight: 600, fontSize: 30, letterSpacing: 1.2, opacity: 0.95 }}>{tag.sub}</div> : null}
      </div>
    </>
  );
}

function Title({ t }: { t: number }) {
  const big = fadeOf(t, 1.2, 11.6, 1.2);
  const small = fadeOf(t, 4.4, 11.6, 1);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT, color: "#fff", textAlign: "center", padding: "0 80px" }}>
      <div style={{ fontWeight: 800, fontSize: 190, lineHeight: 0.96, letterSpacing: 4, opacity: big }}>SAF 44</div>
      <div style={{ fontWeight: 600, fontSize: 74, letterSpacing: 5, marginTop: 6, opacity: big }}>MAMASAPANO</div>
      <div style={{ fontWeight: 600, fontSize: 40, letterSpacing: 1.5, marginTop: 8, opacity: big * 0.85 }}>JANUARY 25, 2015</div>
      <div style={{ fontWeight: 600, fontSize: 38, lineHeight: 1.24, marginTop: 70, opacity: small * 0.92, maxWidth: 860 }}>{LONG_LABEL}</div>
    </AbsoluteFill>
  );
}

function End({ t }: { t: number }) {
  const a = clamp01((t - (SCENES.end.from + 1)) / 1.2) * clamp01((SCENES.end.to - 0.2 - t) / 0.5);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT, color: "#fff", textAlign: "center", padding: "0 80px", opacity: a }}>
      <div style={{ fontWeight: 700, fontSize: 76, lineHeight: 1.08 }}>For the 44, and for all who died at Mamasapano.</div>
      <div style={{ fontWeight: 600, fontSize: 36, lineHeight: 1.26, marginTop: 56, opacity: 0.92, maxWidth: 860 }}>{LONG_LABEL}</div>
      <div style={{ fontWeight: 600, fontSize: 32, lineHeight: 1.26, marginTop: 36, opacity: 0.78, maxWidth: 860 }}>
        Sources: PNP Board of Inquiry report, March 2015. G. Villareal, Naval Postgraduate School, 2016. Philippine Daily Inquirer. Wikipedia. Far gunfire and mortar tails: “War sounds” by Dragout, CC0.
      </div>
    </AbsoluteFill>
  );
}

function Picture({ built, frameNo, grade, width, height, opacity = 1 }: { built: Built; frameNo: number; grade: Grade; width: number; height: number; opacity?: number }) {
  const { frame, fx } = built;
  return (
    <AbsoluteFill style={{ opacity }}>
      <CinemaCanvas frame={frame} width={width} height={height} frameNo={frameNo} grade={fx.grade ?? grade} />
      {fx.clouds ? <Clouds amount={fx.clouds} frameNo={frameNo} /> : null}
      {fx.mist ? <Mist frame={frame} mist={fx.mist} width={width} height={height} frameNo={frameNo} /> : null}
      {fx.near ? <NearLayer frame={fx.near.frame} blur={fx.near.blur} width={width} height={height} /> : null}
      {fx.flare ? <Flare frame={frame} flare={fx.flare} width={width} height={height} frameNo={frameNo} /> : null}
      {fx.nvg ? <NightVision frameNo={frameNo} /> : null}
      {fx.flash ? <AbsoluteFill style={{ background: "#ffe6c0", mixBlendMode: "screen", opacity: fx.flash }} /> : null}
      {fx.under ? <AbsoluteFill style={{ background: "#16323a", mixBlendMode: "multiply", opacity: fx.under * 0.5 }} /> : null}
    </AbsoluteFill>
  );
}

/** `step` plays every step-th frame with no sound: the contact sheet, for reviewing the whole film fast. */
export function Saf44Reel({ step = 1 }: { step?: number }) {
  loadSaf44Fonts();
  const f = useCurrentFrame() * step;
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const film = useMemo(() => filmAt(t), [t]);
  const grade = gradeAt(t);
  const part = sceneAt(t);
  const drawn = part !== "title" && part !== "end";

  const stamp = STAMPS.find((s) => t >= s.from && t < s.to);
  const card = CARDS.find((c) => t >= c.from && t < c.to);
  const tally = TALLIES.find((c) => t >= c.from && t < c.to);
  const counter = counterAt(t);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {drawn ? (
        <>
          {film.before ? <Picture built={film.before} frameNo={f - 1} grade={grade} width={width} height={height} /> : null}
          <Picture built={film.now} frameNo={f} grade={grade} width={width} height={height} opacity={film.mix} />
          {film.haze ? <AbsoluteFill style={{ background: "#c9cfd2", opacity: film.haze }} /> : null}
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 64% at 50% 48%, transparent 54%, rgba(0,0,0,0.5) 100%)" }} />
        </>
      ) : null}
      {film.black > 0 ? <AbsoluteFill style={{ background: "#000", opacity: film.black }} /> : null}
      {drawn && film.black < 0.5 ? film.now.fx.tags.map((tag) => <MapTag key={tag.text} tag={tag} frame={film.now.frame} width={width} height={height} />) : null}
      {drawn ? <TextBlock stamp={tally ? undefined : stamp?.text} counter={counter} line={card?.text} lineFont={card?.kind} lineOpacity={card ? fadeOf(t, card.from, card.to) : 1} tally={tally ? { n: tally.n, text: tally.text, opacity: fadeOf(t, tally.from, tally.to, 0.4) } : undefined} /> : null}
      {part === "title" ? <Title t={t} /> : null}
      {part === "end" ? <End t={t} /> : null}
      {step === 1 ? <Audio src={staticFile("out/music.wav")} /> : null}
    </AbsoluteFill>
  );
}

