// A film in any of the looks: scenes one after another (cut or melting into each other), and a few words. No HUD.
import { loadFont } from "@remotion/fonts";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import barlow from "./fonts/barlow-condensed-latin-700-normal.woff2";
import cormorantItalic from "./fonts/cormorant-600-italic.woff2";
import cormorant from "./fonts/cormorant-700.woff2";
import { H, W, backOut, canvas, smooth, type Painter } from "./core";

export type Scene = {
  from: number;
  to: number;
  /** Gets the seconds since the scene began. */
  paint: Painter;
  /** Seconds it takes to melt in over the scene before, which carries on underneath. 0 cuts. */
  melt?: number;
};

export type Voice = "paper" | "box" | "dots";
export type Line = {
  at: number;
  to: number;
  /** "\n" breaks the line. */
  text: string;
  voice?: Voice;
  /** Its top, in px. The default sits under the platforms' top bar. */
  y?: number;
  size?: number;
  /** Lands with a hit instead of fading in. */
  hit?: boolean;
  color?: string;
};

export type Film = { seconds: number; scenes: Scene[]; lines: Line[]; music?: boolean; bg?: string };

let fonts: Promise<unknown> | undefined;
/** LookFilm calls this itself; awaiting it in calculateMetadata too means the first frame never waits. */
export function loadLookFonts() {
  fonts ??= Promise.all([
    loadFont({ family: "Look Serif", url: cormorant, weight: "700" }),
    loadFont({ family: "Look Italic", url: cormorantItalic, weight: "600", style: "italic" }),
    loadFont({ family: "Look Sans", url: barlow, weight: "700" }),
  ]);
  return fonts;
}

const VOICES: Record<Voice, { size: number; css: CSSProperties }> = {
  paper: { size: 82, css: { fontFamily: "Look Serif", fontWeight: 700, color: "#ffeccb", textShadow: "0 9px 26px rgba(10,2,20,0.85)" } },
  box: { size: 88, css: { fontFamily: "Look Sans", fontWeight: 700, color: "#fff4e0", textShadow: "0 4px 24px rgba(20,10,50,0.5)" } },
  dots: { size: 84, css: { fontFamily: "Look Italic", fontWeight: 600, fontStyle: "italic", color: "#f6ead2", textShadow: "0 0 20px rgba(0,0,0,0.9)" } },
};

/** The scenes showing at time t, back to front, with how solid each is. Nothing under a solid one is drawn. */
export function showing(scenes: Scene[], t: number): { scene: Scene; opacity: number }[] {
  const i = scenes.findLastIndex((s) => t >= s.from);
  if (i < 0) return [];
  const s = scenes[i], k = s.melt && i > 0 ? smooth(s.from, s.from + s.melt, t) : 1;
  return k >= 1 ? [{ scene: s, opacity: 1 }] : [{ scene: scenes[i - 1], opacity: 1 }, { scene: s, opacity: k }];
}

let spare: HTMLCanvasElement | undefined;
function Picture({ scenes, t }: { scenes: Scene[]; t: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Drawn in the layout effect, so the frame is on the canvas before Remotion takes its screenshot.
  useLayoutEffect(() => {
    const g = ref.current?.getContext("2d");
    if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    for (const { scene, opacity } of showing(scenes, t)) {
      if (opacity >= 1) scene.paint(g, t - scene.from);
      else {
        spare ??= canvas();
        const s = spare.getContext("2d")!;
        s.clearRect(0, 0, W, H);
        scene.paint(s, t - scene.from);
        g.globalAlpha = opacity;
        g.drawImage(spare, 0, 0);
        g.globalAlpha = 1;
      }
    }
  }, [scenes, t]);
  return <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} />;
}

function Words({ l, t }: { l: Line; t: number }) {
  if (t < l.at || t >= l.to) return null;
  const { size, css } = VOICES[l.voice ?? "paper"];
  const opacity = smooth(l.at, l.at + (l.hit ? 0.1 : 0.4), t) * (1 - smooth(l.to - 0.3, l.to, t));
  const scale = l.hit ? 1.12 - 0.12 * backOut((t - l.at) / 0.3) : 1;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: l.y ?? 265, textAlign: "center", whiteSpace: "pre-line", textWrap: "balance", lineHeight: 1.08, ...css, fontSize: l.size ?? size, ...(l.color ? { color: l.color } : {}), opacity, transform: `scale(${scale})` }}>
      {l.text}
    </div>
  );
}

/** `step` > 1 skips through the film without sound, for a contact sheet; `at` shows just those moments. */
export type FilmProps = { step?: number; at?: number[] };

export function LookFilm({ film, step = 1, at }: FilmProps & { film: Film }) {
  loadLookFonts();
  const { fps } = useVideoConfig();
  const n = useCurrentFrame();
  const t = at ? at[Math.min(n, at.length - 1)] : (n * step) / fps;
  return (
    <AbsoluteFill style={{ background: film.bg ?? "#000" }}>
      <Picture scenes={film.scenes} t={t} />
      {film.lines.map((l) => (
        <Words key={`${l.at}-${l.text}`} l={l} t={t} />
      ))}
      {film.music && step === 1 && !at ? <Audio src={staticFile("out/music.wav")} /> : null}
    </AbsoluteFill>
  );
}
