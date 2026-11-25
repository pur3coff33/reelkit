// "Huwag Mong Sundan": a low-poly santelmo story, told in Tagalog text over the 3D world, with no voice.
import { loadFont } from "@remotion/fonts";
import { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SimCanvas } from "../../src/kit/lowpoly/SimCanvas";
import { lightDistance, santelmoFrame } from "./sim";
import { CUES, HIT_Y, LINES, SCENES, TEXT_Y, TITLES, type Line } from "./timeline";

const SERIF = "Cormorant Garamond";
let fontsLoaded: Promise<unknown> | undefined;
export function loadCormorant() {
  fontsLoaded ??= Promise.all([
    loadFont({ family: SERIF, url: staticFile("assets/cormorant-600-italic.woff2"), weight: "600", style: "italic" }),
    loadFont({ family: SERIF, url: staticFile("assets/cormorant-700.woff2"), weight: "700", style: "normal" }),
  ]);
  return fontsLoaded;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const mixHex = (a: string, b: string, k: number) => {
  const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * k)).join(",")})`;
};
const SHADOW = "0 0 22px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.9), 0 3px 3px rgba(0,0,0,0.8)";

/** Black over the frame: the title, after the flare, and the cut away from the river. */
function blackAt(t: number) {
  if (t >= SCENES.title.from && t < SCENES.title.to) return 1;
  if (t >= CUES.flare + 0.55 && t < SCENES.fire.to) return 1;
  if (t >= CUES.step + 0.75 && t < SCENES.river.to) return 1;
  // After the last rush, black under the title.
  if (t >= CUES.lastRush + 0.5) return 1;
  // Fade up from black at the very start.
  if (t < 0.6) return 1 - t / 0.6;
  return 0;
}

function TextLine({ line, t, offset, warm, spoken }: { line: Line; t: number; offset: number; warm: number; spoken?: number }) {
  const hit = line.hit;
  const into = t - line.at, left = line.to - t;
  let opacity: number, blur: number, scaleK = 1, dx = 0, dy = 0;
  if (hit) {
    opacity = clamp01(left / 0.3);
    blur = 0;
    scaleK = 1 + 0.12 * Math.exp(-into / 0.08);
    // A tremble that settles.
    const shake = (hit === "big" ? 5 : 3) * (0.35 + 0.65 * Math.exp(-into / 0.5));
    dx = Math.sin(t * 91) * shake;
    dy = Math.cos(t * 77) * shake * 0.6;
  } else {
    // The whole line fades out; it comes in word by word (below).
    const fout = clamp01(left / 0.45);
    opacity = fout;
    blur = (1 - fout) * 6;
  }
  const y = (line.y ?? (hit ? HIT_Y : TEXT_Y)) + offset;
  const fire = line.text.startsWith("APOY");
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: y,
        transform: `translate(${dx}px, calc(-50% + ${dy}px)) scale(${scaleK})`,
        textAlign: "center",
        fontFamily: SERIF,
        fontStyle: hit ? "normal" : "italic",
        fontWeight: hit ? 700 : 600,
        fontSize: hit ? (hit === "big" ? 124 : 104) : 70,
        letterSpacing: hit ? "0.06em" : "0.005em",
        lineHeight: 1.12,
        // Near the fire the words warm and glow.
        color: fire ? "#ffc069" : mixHex("#f4efe6", "#ffc98a", warm * 0.85),
        textShadow: fire ? `0 0 28px rgba(255,120,30,0.85), ${SHADOW}` : `0 0 26px rgba(255,120,30,${(warm * 0.6).toFixed(2)}), ${SHADOW}`,
        opacity,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
      }}
    >
      {hit
        ? line.text
        : line.text.split(" ").map((w, i, words) => {
            // With narration, each word arrives about when she says it (by its place in the line); without, a quick ripple.
            const before = words.slice(0, i).join(" ").length;
            const at = spoken ? (before / line.text.length) * spoken * 0.9 : i * 0.11;
            const k = clamp01((into - at) / (spoken ? 0.25 : 0.4));
            return (
              <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, filter: k < 1 ? `blur(${(1 - k) * 8}px)` : undefined, transform: `translateY(${(1 - k) * 10}px)` }}>
                {w + " "}
              </span>
            );
          })}
    </div>
  );
}

function Title({ t, at, to }: { t: number; at: number; to: number }) {
  const o = Math.min(clamp01((t - at) / 0.7), clamp01((to - t) / 0.5));
  const spread = 0.22 + 0.05 * clamp01((t - at) / (to - at));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 104, letterSpacing: `${spread}em`, marginRight: `-${spread}em`, color: "#f1e6d2", opacity: o, textShadow: "0 0 34px rgba(255,140,50,0.45)" }}>SANTELMO</div>
    </AbsoluteFill>
  );
}

/** Film grain: SVG noise, reseeded every frame. */
function Grain({ frame }: { frame: number }) {
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.075, mixBlendMode: "screen" }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 97} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

/** The narration's length per line (seconds, by index into LINES), from out/voice.json. */
export type SantelmoData = { spoken: Record<number, number> };

export async function loadSantelmoData(): Promise<SantelmoData> {
  const res = await fetch(staticFile("out/voice.json"));
  if (!res.ok) return { spoken: {} };
  const takes = (await res.json()) as { i: number; seconds: number }[];
  return { spoken: Object.fromEntries(takes.map((x) => [x.i, x.seconds])) };
}

export function SantelmoReel({ spoken = {} }: Partial<SantelmoData>) {
  loadCormorant();
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const frame = useMemo(() => santelmoFrame(t), [t]);

  // The flare: the screen fills with fire, then black.
  const flare = t >= CUES.flare && t < CUES.flare + 0.55 ? clamp01((t - CUES.flare) / 0.5) ** 1.5 : 0;
  // The hook's hit: a cold pulse.
  const pulse = t >= 6.4 && t < 7.4 ? 0.22 * Math.exp(-(t - 6.4) / 0.18) : 0;
  // The last rush at the viewer.
  const rush = t >= CUES.lastRush && t < CUES.lastRush + 0.5 ? clamp01((t - CUES.lastRush) / 0.45) ** 1.5 : 0;
  // How near the fire is, for warming the text.
  const ld = lightDistance(t);
  const warm = Number.isFinite(ld.dist) ? Math.min(1, ld.strength) * clamp01(1 - (ld.dist - 2.5) / 9) : 0;
  const black = blackAt(t);

  const shown = LINES.filter((l) => t >= l.at && t < l.to);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <SimCanvas frame={frame} width={width} height={height} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)" }} />
      <Grain frame={f} />
      {pulse > 0 ? <AbsoluteFill style={{ background: "#cfe0ff", opacity: pulse }} /> : null}
      {rush > 0 ? <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 48%, #fff6d8 0%, #ffb347 35%, #ff5a10 75%)", opacity: rush }} /> : null}
      {flare > 0 ? <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 48%, #fff6d8 0%, #ffb347 35%, #ff5a10 75%)", opacity: flare }} /> : null}
      {black > 0 ? <AbsoluteFill style={{ background: "#000", opacity: black }} /> : null}
      {shown.map((l) => {
        // A pair: the first line rises to make room for the one under it.
        const i = LINES.indexOf(l);
        const hasUnder = LINES[i + 1]?.under && t >= LINES[i + 1].at;
        const offset = l.under ? 52 : hasUnder ? -52 : 0;
        return <TextLine key={i} line={l} t={t} offset={offset} warm={warm} spoken={spoken[i]} />;
      })}
      {TITLES.map((x) => (t >= x.at && t < x.to ? <Title key={x.at} t={t} at={x.at} to={x.to} /> : null))}
      <Audio src={staticFile("out/music.wav")} />
    </AbsoluteFill>
  );
}
