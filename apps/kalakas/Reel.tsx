// The graphics for "Kalakas": the fictional-simulation label on every frame, a clock on the beach, one line of words at
// the bottom, the storm laid against the real coastline, and the tally at the end.
import { loadFont } from "@remotion/fonts";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { projector, type V3 } from "../../src/kit/lowpoly/engine";
import { SimCanvas } from "../../src/kit/lowpoly/SimCanvas";
import { smooth } from "../../src/kit/lowpoly/world";
import { COASTS } from "../typhoon/geo";
import { EARTH_R, FULL, G } from "./space";
import { kalakasFrame, landShiftAt, type Fx } from "./sim";
import { FINAL, LANDFALL_T, WIND_STAGES, WORDS, homesAt, hoursAt, partAt, pesosAt, windAt } from "./timeline";

const FONT = "Barlow Condensed";
let fontsLoaded: Promise<unknown> | undefined;
export function loadKalakasFonts() {
  fontsLoaded ??= Promise.all(["600", "700", "800"].map((w) => loadFont({ family: FONT, url: staticFile(`assets/barlow-condensed-latin-${w}-normal.woff2`), weight: w })));
  return fontsLoaded;
}

const AMBER = "#ffb81c", RED = "#e23b34";
const SHADOW = "0 2px 4px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.65)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function clockText(h: number) {
  if (h >= 100) return "ONE WEEK LATER";
  const a = Math.abs(Math.round(h));
  return h <= 0 ? (a === 0 ? "LANDFALL" : `T-${a} HOURS`) : `T+${a} HOURS`;
}

function Rain({ fx, t, w, h }: { fx: Fx; t: number; w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (fx.rain <= 0) return;
    const slant = fx.slant;
    ctx.lineCap = "round";
    for (let layer = 0; layer < 3; layer++) {
      const len = 26 + layer * 34, speed = 1500 + layer * 1000;
      ctx.lineWidth = 1 + layer * 0.9;
      ctx.strokeStyle = `rgba(220,232,240,${0.07 + layer * 0.05})`;
      ctx.beginPath();
      let a = 1234567 + layer * 99;
      const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < (620 * fx.rain) / (layer + 1); i++) {
        const y = (rnd() * (h + 200) + t * speed * (0.8 + rnd() * 0.4)) % (h + 200) - 100;
        const x0 = rnd() * (w + 800) - 400;
        const x = ((x0 + (t * speed * slant * 0.85) % (w + 800)) % (w + 800) + w + 800) % (w + 800) - 400;
        ctx.moveTo(x, y);
        ctx.lineTo(x + len * slant, y + len);
      }
      ctx.stroke();
    }
  }, [fx.rain, fx.slant, t, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", inset: 0, width: w, height: h }} />;
}

function Bottom({ text, sub, t, at, to }: { text: string; sub?: string; t: number; at: number; to: number }) {
  const a = Math.min(clamp01((t - at) / 0.2), clamp01((to - t) / 0.2));
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1290, height: 270, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", textAlign: "center", fontFamily: FONT, opacity: a, textShadow: SHADOW }}>
      <div style={{ fontWeight: 800, fontSize: 72, lineHeight: 1.03, color: "#fff" }}>{text}</div>
      {sub ? <div style={{ fontWeight: 700, fontSize: 42, lineHeight: 1.08, color: AMBER, marginTop: 8 }}>{sub}</div> : null}
    </div>
  );
}

/** One big line in the middle, landing with weight. */
function Slam({ text, sub, f, at, to, fps, tone = "#fff", size = 170, y = 760 }: { text: string; sub?: string; f: number; at: number; to: number; fps: number; tone?: string; size?: number; y?: number }) {
  if (f < at || f >= to) return null;
  const k = spring({ frame: f - at, fps, config: { damping: 13, stiffness: 260, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", left: 30, right: 30, top: y, textAlign: "center", fontFamily: FONT, opacity: clamp01((to - f) / 6), transform: `scale(${1.45 - 0.45 * k})` }}>
      <div style={{ fontWeight: 800, fontSize: size, lineHeight: 0.96, color: tone, textShadow: "0 6px 26px rgba(0,0,0,0.8), 0 2px 3px rgba(0,0,0,0.7)" }}>{text}</div>
      {sub ? <div style={{ fontWeight: 700, fontSize: 46, letterSpacing: 2.5, color: "#fff", textShadow: SHADOW, marginTop: 10 }}>{sub}</div> : null}
    </div>
  );
}

function CostLine({ f, at, fps, big, small, tone = "#fff", size = 150 }: { f: number; at: number; fps: number; big: string; small: string; tone?: string; size?: number }) {
  if (f < at) return null;
  const a = clamp01((f - at) / 10);
  const k = spring({ frame: f - at, fps, config: { damping: 18, stiffness: 150 } });
  return (
    <div style={{ opacity: a, transform: `translateY(${(1 - k) * 22}px)`, marginBottom: 30, fontFamily: FONT, textAlign: "center", textShadow: SHADOW }}>
      <div style={{ fontWeight: 800, fontSize: size, lineHeight: 0.98, color: tone }}>{big}</div>
      <div style={{ fontWeight: 700, fontSize: 44, letterSpacing: 2, color: "#e4e9ef" }}>{small}</div>
    </div>
  );
}

const PLACES: [string, number, number][] = [["SAMAR", 125.0, 11.9], ["LEYTE", 124.75, 10.75], ["CEBU", 123.75, 10.3], ["MINDANAO", 125.2, 8.2], ["LUZON", 121.4, 16.2], ["PALAWAN", 118.6, 9.8]];

export function KalakasReel() {
  loadKalakasFonts();
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const { frame, fx } = useMemo(() => kalakasFrame(t), [t]);
  const part = partAt(t);
  const S = (s: number) => Math.round(s * fps);
  const proj = projector(frame.camera, width, height);
  const onBeach = part === "beach";
  const shift = landShiftAt(t);
  const reveal = part === "size" ? smooth(33, 33.8, t) * (1 - smooth(36.6, 37, t)) : 0;
  const coast = reveal > 0.01 ? COASTS.map((ring) => {
    const pts = [...ring, ring[0]].map(([lon, lat]) => proj(G(lon, lat, 8, shift)));
    return pts.every((p) => p.visible) ? pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") : "";
  }) : [];
  const edgeL = proj([-FULL.R, EARTH_R + 8, 0] as V3), edgeR = proj([FULL.R, EARTH_R + 8, 0] as V3);
  const word = WORDS.find((w) => t >= w.at && t < w.to);
  const stage = WIND_STAGES.find((w) => t >= w.at && t < w.to);
  const counting = t >= LANDFALL_T && t < 76;
  const hours = hoursAt(t);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {part === "message" ? null : <SimCanvas frame={frame} width={width} height={height} />}
      <Rain fx={fx} t={t} w={width} h={height} />
      {fx.flash > 0 ? <AbsoluteFill style={{ background: "#dfe7ff", opacity: fx.flash }} /> : null}
      {part !== "message" ? <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0, rgba(0,0,0,0.42) 13%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.58) 74%, rgba(0,0,0,0.7) 100%)" }} /> : null}
      {fx.dim > 0 && part !== "message" ? <AbsoluteFill style={{ background: "#03060b", opacity: fx.dim }} /> : null}

      {reveal > 0.01 ? (
        <>
          <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: reveal }}>
            {coast.map((l, i) => (l ? <polyline key={i} points={l} fill="none" stroke={AMBER} strokeWidth={3.5} strokeLinejoin="round" /> : null))}
            <line x1={edgeL.x} y1={1215} x2={edgeR.x} y2={1215} stroke="#fff" strokeWidth={6} />
            <line x1={edgeL.x} y1={1195} x2={edgeL.x} y2={1235} stroke="#fff" strokeWidth={6} />
            <line x1={edgeR.x} y1={1195} x2={edgeR.x} y2={1235} stroke="#fff" strokeWidth={6} />
          </svg>
          {PLACES.map(([name, lon, lat]) => {
            const p = proj(G(lon, lat, 8, shift));
            if (p.x < 90 || p.x > 990) return null;
            return <div key={name} style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 36, color: AMBER, opacity: reveal, textShadow: SHADOW }}>{name}</div>;
          })}
          <Slam text="1,000 KM ACROSS" f={f} at={S(33.1)} to={S(37)} fps={fps} size={112} y={1240} />
        </>
      ) : null}

      {word ? <Bottom text={word.text} sub={word.sub} t={t} at={word.at} to={word.to} /> : null}

      <Slam text="350 KM/H" sub="SUSTAINED WINDS · 850 HPA" f={f} at={S(37.9)} to={S(40)} fps={fps} y={700} />

      {stage ? <Slam text={stage.text} sub={stage.sub} f={f} at={S(stage.at)} to={S(stage.to)} fps={fps} y={460} tone={stage.at >= 66 ? RED : "#fff"} size={140} /> : null}
      {counting ? (
        <div style={{ position: "absolute", left: 50, right: 50, top: 1330, display: "flex", justifyContent: "space-between", fontFamily: FONT, textShadow: SHADOW, opacity: Math.min(clamp01((t - LANDFALL_T) / 0.3), clamp01((76 - t) / 0.4)) }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 92, lineHeight: 1, color: "#fff", fontVariantNumeric: "tabular-nums" }}>₱{pesosAt(t)}B</div>
            <div style={{ fontWeight: 700, fontSize: 38, letterSpacing: 2, color: AMBER }}>DAMAGE SO FAR</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 92, lineHeight: 1, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{homesAt(t).toLocaleString("en-US")}</div>
            <div style={{ fontWeight: 700, fontSize: 38, letterSpacing: 2, color: AMBER }}>HOMES</div>
          </div>
        </div>
      ) : null}

      {part === "cost" ? (
        <div style={{ position: "absolute", left: 40, right: 40, top: 380, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <CostLine f={f} at={S(85.4)} fps={fps} big={`₱${FINAL.pesosBillions} BILLION`} small="IN DAMAGE" />
          <CostLine f={f} at={S(87.4)} fps={fps} big={FINAL.homes.toLocaleString("en-US")} small="HOMES DESTROYED OR DAMAGED" />
          <CostLine f={f} at={S(89.6)} fps={fps} big={`${FINAL.deaths.toLocaleString("en-US")} LIVES LOST`} small="WITH THE EVACUATION" tone={AMBER} size={120} />
          <CostLine f={f} at={S(92.4)} fps={fps} big={FINAL.withoutEvacuation.toLocaleString("en-US")} small="IF NO ONE HAD LEFT" size={120} />
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: 2, color: "#cdd5de", opacity: clamp01((t - 85.6) / 0.5), marginTop: 8 }}>ALL FIGURES HYPOTHETICAL</div>
        </div>
      ) : null}

      {part === "message" ? (
        <AbsoluteFill style={{ background: "#000" }}>
          <div style={{ position: "absolute", left: 40, right: 40, top: 720, textAlign: "center", fontFamily: FONT, fontWeight: 800, color: "#fff", fontSize: 176, lineHeight: 1, transform: `scale(${1.4 - 0.4 * spring({ frame: f - S(96.5), fps, config: { damping: 14, stiffness: 230, mass: 0.7 } })})` }}>
            PREPAREDNESS<br /><span style={{ color: AMBER }}>SAVES LIVES</span>
          </div>
        </AbsoluteFill>
      ) : null}

      <div style={{ position: "absolute", left: 40, right: 40, top: 256, display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontFamily: FONT, fontWeight: 700 }}>
        <div style={{ fontSize: 32, letterSpacing: 2, color: "#fff", background: "rgba(5,10,20,0.72)", border: `2px solid ${AMBER}`, padding: "2px 14px 3px" }}>FICTIONAL DISASTER SIMULATION</div>
        {onBeach ? (
          <div style={{ textAlign: "right", textShadow: SHADOW, color: "#fff" }}>
            <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.02, color: hours >= 0 && hours < 100 ? AMBER : "#fff" }}>{clockText(hours)}</div>
            {t < 76 ? <div style={{ fontSize: 34, fontVariantNumeric: "tabular-nums" }}>WIND {windAt(t)} KM/H</div> : null}
          </div>
        ) : null}
      </div>
      <Audio src={staticFile("out/music.wav")} />
    </AbsoluteFill>
  );
}
