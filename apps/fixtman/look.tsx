// What FixtMan's scenes share: the font, colours per scene, the house shape (wipe, photo frame) and the logo being built.
import type { ReactNode } from "react";
import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { beatFrame } from "../../src/kit/remotion/base";
import { ease, pop, slam } from "../../src/kit/remotion/motion";
import { config } from "./reel.config";
import { BPM, SCENES, type SceneName } from "./timeline";

export const T = config.theme;
export const FPS = config.fps;
export const FONT = "Montserrat";
export const W = 1080;
export const H = 1920;
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

let fonts: Promise<unknown> | null = null;
export function loadFixtmanFonts() {
  fonts ??= Promise.all((["500", "700", "900"] as const).map((weight) => loadFont({ family: FONT, url: staticFile(`assets/montserrat-${weight}.woff2`), weight })));
  return fonts;
}

export const B = (beat: number) => beatFrame(beat, BPM, FPS);
/** A moment in seconds as a frame inside a scene. */
export const inScene = (scene: SceneName, seconds: number) => Math.round(seconds * FPS) - B(SCENES[scene].from);
export const lengthOf = (scene: SceneName) => B(SCENES[scene].to) - B(SCENES[scene].from);
export const job = (name: string) => staticFile(`assets/jobs/${name}.jpg`);

const light = { ink: T.navy, hi: "#d9480f" };
const onOrange = { ink: T.deep, hi: T.white };
const dark = { ink: T.white, hi: T.peach };
/** The caption colours that read on each scene's ground. */
export const LOOK: Record<SceneName, { ink: string; hi: string }> = {
  tv: light, bed: light, swing: light, drill: onOrange, brand: light, pro: dark, jobs: light, zip: onOrange, price: onOrange,
  time: light, ready: dark, warranty: onOrange, redo: onOrange, stars: light, ask: dark, end: light,
};

export function sceneAt(frame: number): SceneName {
  return (Object.keys(SCENES) as SceneName[]).findLast((n) => frame >= B(SCENES[n].from)) ?? "tv";
}

/** A quick punch-in as a scene cuts in. */
export function Punch({ children, by = 0.07 }: { children: ReactNode; by?: number }) {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ transform: `scale(${interpolate(slam(frame, 0, FPS), [0, 1], [1 + by, 1])})` }}>{children}</AbsoluteFill>;
}

/** The scene opens through a growing house, the shape of the brand's mark. */
export function HouseWipe({ bg, children }: { bg: string; children: ReactNode }) {
  const frame = useCurrentFrame();
  const k = ease(frame, 0, 13, Easing.bezier(0.5, 0, 0.2, 1));
  const s = k * 2.82;
  const at = (x: number, y: number) => `${W / 2 + x * s * W}px ${H / 2 + y * s * W}px`;
  const clip = k >= 1 ? undefined : `polygon(${at(0, -0.7)}, ${at(0.5, -0.34)}, ${at(0.5, 0.6)}, ${at(-0.5, 0.6)}, ${at(-0.5, -0.34)})`;
  const pt = (x: number, y: number) => `${W / 2 + x * s * W},${H / 2 + y * s * W}`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip, background: bg }}>{children}</AbsoluteFill>
      {k < 1 && (
        <svg width={W} height={H} style={{ position: "absolute" }}>
          <polyline points={`${pt(-0.57, -0.32)} ${pt(0, -0.73)} ${pt(0.57, -0.32)}`} fill="none" stroke={T.orange} strokeWidth={0.12 * s * W} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
}

/** A photo framed as a house: gable on top, the orange roof dropping onto it. */
export function HousePhoto(props: { src: string; width: number; height: number; at?: number; zoom?: number }) {
  const frame = useCurrentFrame();
  const at = props.at ?? 0;
  const { width: w, height: h } = props;
  const gable = w * 0.2;
  const stroke = w * 0.062;
  const drop = slam(frame, at + 2, FPS);
  const drift = interpolate(frame - at, [0, 90], [0, 1], { extrapolateLeft: "clamp" });
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {/* A flat offset shadow: a blurred one over a clipped photo made every frame several times slower to draw. */}
      <svg width={w} height={h} style={{ position: "absolute", overflow: "visible" }}>
        <path d={`M ${w / 2} 22 L ${w + 16} ${gable + 22} L ${w + 16} ${h + 22} L 16 ${h + 22} L 16 ${gable + 22} Z`} fill="rgba(15,35,48,.2)" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: `path('M ${w / 2} 0 L ${w} ${gable} L ${w} ${h - 26} Q ${w} ${h} ${w - 26} ${h} L 26 ${h} Q 0 ${h} 0 ${h - 26} L 0 ${gable} Z')` }}>
        <Img src={props.src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.02 + (props.zoom ?? 0.08) * drift})` }} />
      </div>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", transform: `translateY(${(1 - drop) * -260}px)`, opacity: Math.min(1, drop * 3) }}>
        <polyline points={`${-stroke * 0.5},${gable + stroke * 0.15} ${w / 2},${-stroke * 0.25} ${w + stroke * 0.5},${gable + stroke * 0.15}`} fill="none" stroke={T.orange} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** FixtMan's mark, built: the body rises, the roof slams on, the door pops in. */
export function Mark({ at, size, quick = false }: { at: number; size: number; quick?: boolean }) {
  const frame = useCurrentFrame();
  const gap = quick ? 2 : 5;
  const body = pop(frame, at, FPS);
  const roof = slam(frame, at + gap, FPS);
  const dot = pop(frame, at + gap * 2, FPS);
  const hit = interpolate(frame, [at + gap + 1, at + gap + 4, at + gap + 9], [0, 1, 0], clamp);
  const part = (name: string, style: object) => <Img src={staticFile(`assets/logo-${name}.png`)} style={{ position: "absolute", width: "100%", height: "100%", ...style }} />;
  return (
    <div style={{ position: "relative", width: size, height: (size * 422) / 429, transform: `translateY(${hit * 10}px) scaleY(${1 - hit * 0.035})`, transformOrigin: "50% 100%" }}>
      {part("body", { transform: `translateY(${(1 - body) * 160}px)`, opacity: Math.min(1, body * 2) })}
      {part("dot", { transform: `scale(${dot})`, transformOrigin: "50% 60%" })}
      {part("roof", { transform: `translateY(${(1 - roof) * -620}px)`, opacity: Math.min(1, roof * 4) })}
    </div>
  );
}

/** Small print, on a plate so it reads over anything. */
export function Fine({ text, top = 1520 }: { text: string; top?: number }) {
  return (
    <div style={{ position: "absolute", top, width: W, display: "grid", placeItems: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, color: T.deep, background: "rgba(255,250,243,.9)", padding: "8px 22px", borderRadius: 12 }}>{text}</div>
    </div>
  );
}
