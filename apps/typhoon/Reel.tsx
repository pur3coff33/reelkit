// PNN's broadcast over the low-poly world: the fictional-simulation label on every frame, a clock, straps, a ticker,
// slammed readouts, captions and the map's labels. Key text stays between y 250 and 1570 (out of the platform's UI).
import { loadFont } from "@remotion/fonts";
import { useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { projector, type V3 } from "../../src/kit/lowpoly/engine";
import { SimCanvas } from "../../src/kit/lowpoly/SimCanvas";
import { LL, stormPos } from "./geo";
import { typhoonFrame, type Fx } from "./sim";
import { LINES, lineSeconds, shotAt, signalAt, storyHours, type Line } from "./timeline";

const FONT = "Barlow Condensed";
let fontsLoaded: Promise<unknown> | undefined;
export function loadBarlow() {
  fontsLoaded ??= Promise.all(["600", "700", "800"].map((w) => loadFont({ family: FONT, url: staticFile(`assets/barlow-condensed-latin-${w}-normal.woff2`), weight: w })));
  return fontsLoaded;
}

const NAVY = "#0b2545", RED = "#d8232a", AMBER = "#ffb81c", WHITE = "#f6f8fb";
const SHADOW = "0 2px 4px rgba(0,0,0,0.85), 0 0 16px rgba(0,0,0,0.6)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const pad2 = (n: number) => String(Math.floor(n)).padStart(2, "0");

function clockText(hours: number) {
  if (hours >= 100) return "ONE WEEK LATER";
  const a = Math.abs(hours);
  const whole = Math.floor(a), m = (a - whole) * 60, s = (m - Math.floor(m)) * 60;
  return `T${hours < 0 ? "-" : "+"}${pad2(whole)}:${pad2(m)}:${pad2(s)}`;
}

/** Fixed on every frame, black frames included: the label that says none of this is real. */
function TopBar({ hours, clock, signal }: { hours: number; clock: boolean; signal: number }) {
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 256, display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontFamily: FONT, fontWeight: 700 }}>
      <div style={{ display: "flex", alignItems: "stretch", fontSize: 32, letterSpacing: 2 }}>
        {clock ? <div style={{ background: NAVY, color: "#fff", fontWeight: 800, padding: "3px 14px 4px" }}>PNN</div> : null}
        <div style={{ color: "#fff", background: "rgba(5,10,20,0.72)", border: `2px solid ${AMBER}`, padding: "2px 14px 3px" }}>FICTIONAL DISASTER SIMULATION</div>
      </div>
      {clock ? (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 42, letterSpacing: 1, lineHeight: 1.1, color: "#fff", textShadow: SHADOW, fontVariantNumeric: "tabular-nums" }}>{clockText(hours)}</div>
          {signal ? <div style={{ display: "inline-block", marginTop: 4, background: RED, color: "#fff", fontSize: 28, letterSpacing: 1, padding: "0 10px 2px" }}>SIGNAL NO. {signal}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Banners and name straps: one at a time, top left, for the first moments only. */
const BANNER_SECONDS = 3.2;

function Strap({ title, sub, t, at, to }: { title: string; sub?: string; t: number; at: number; to: number }) {
  const end = Math.min(to, at + BANNER_SECONDS);
  if (t < at || t >= end) return null;
  const a = Math.min(clamp01((t - at) / 0.2), clamp01((end - t) / 0.25));
  return (
    <div style={{ position: "absolute", left: 40, top: 326, fontFamily: FONT, opacity: a }}>
      <div style={{ background: RED, color: "#fff", fontWeight: 800, fontSize: 38, letterSpacing: 1, padding: "1px 14px 3px", width: "fit-content" }}>{title}</div>
      {sub ? <div style={{ background: NAVY, color: "#fff", fontWeight: 600, fontSize: 30, letterSpacing: 1, padding: "1px 14px 3px", width: "fit-content" }}>{sub}</div> : null}
    </div>
  );
}

function Breaking({ text, t, at, to, tone = RED }: { text: string; t: number; at: number; to: number; tone?: string }) {
  const end = Math.min(to, at + BANNER_SECONDS);
  if (t < at || t >= end) return null;
  const a = Math.min(clamp01((t - at) / 0.2), clamp01((end - t) / 0.25));
  return (
    <div style={{ position: "absolute", left: 40, top: 326, fontFamily: FONT, opacity: a, background: tone, color: tone === AMBER ? "#1a1205" : "#fff", fontWeight: 800, fontSize: 38, letterSpacing: 1, padding: "1px 14px 3px", maxWidth: 780 }}>{text}</div>
  );
}

/** A line split into its sentences, each with its share of the line's time. */
function chunksOf(line: Line) {
  const parts = line.text.match(/[^.!?:]+[.!?:]*/g)?.map((x) => x.trim()).filter(Boolean) ?? [line.text];
  // "a.m." is not the end of a sentence.
  const merged: string[] = [];
  for (const p of parts) {
    if (merged.length && / a\.$/.test(merged[merged.length - 1])) merged[merged.length - 1] += p;
    else if (merged.length && p.length < 3) merged[merged.length - 1] += p;
    else merged.push(p);
  }
  // With no voice to carry them, very short sentences join the next one: nobody can read "Few phones." in half a second.
  for (let i = 0; i < merged.length - 1; ) {
    if (merged[i].length < 16) merged.splice(i, 2, merged[i] + " " + merged[i + 1]);
    else i++;
  }
  const total = merged.reduce((n, p) => n + p.length, 0);
  let at = 0;
  return merged.map((text) => {
    const c = { text, from: at / total };
    at += text.length;
    return { ...c, to: at / total };
  });
}

/** Lines whose first sentences are already on screen as big readouts, so they aren't shown twice. */
const SHOWN_AS_READOUTS: Record<string, number> = { "07a": 3 };

/** One sentence at a time, whole, in one place at the bottom. */
function Caption({ line, t }: { line: Line; t: number }) {
  const into = t - line.at;
  const dur = lineSeconds(line);
  const box: CSSProperties = { position: "absolute", left: 50, right: 50, top: 1330, height: 230, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", fontFamily: FONT, textAlign: "center", textShadow: SHADOW };
  if (line.sub) {
    const fade = Math.min(clamp01(into / 0.15), clamp01((dur + 0.55 - into) / 0.2));
    return (
      <div style={{ ...box, opacity: fade }}>
        <div style={{ fontWeight: 600, fontSize: 36, lineHeight: 1.1, color: "#d7dee6", marginBottom: 6 }}>{line.text}</div>
        <div style={{ fontWeight: 800, fontSize: 60, lineHeight: 1.06, color: "#fff" }}>{line.sub}</div>
      </div>
    );
  }
  const chunks = chunksOf(line);
  const i = chunks.findIndex((c) => into < c.to * dur);
  const index = i < 0 ? chunks.length - 1 : i;
  if (index < (SHOWN_AS_READOUTS[line.id] ?? 0)) return null;
  const c = chunks[index];
  const end = index === chunks.length - 1 ? dur + 0.55 : c.to * dur;
  const fade = Math.min(clamp01((into - c.from * dur) / 0.12), clamp01((end - into) / 0.12));
  return (
    <div style={{ ...box, opacity: fade }}>
      <div style={{ fontWeight: 800, fontSize: 60, lineHeight: 1.06, color: "#fff" }}>{c.text}</div>
    </div>
  );
}

function Slam({ text, sub, f, at, to, fps, y = 780, tone = WHITE, size = 170 }: { text: string; sub?: string; f: number; at: number; to: number; fps: number; y?: number; tone?: string; size?: number }) {
  if (f < at || f >= to) return null;
  const k = spring({ frame: f - at, fps, config: { damping: 12, stiffness: 280, mass: 0.6 } });
  const out = clamp01((to - f) / 7);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: FONT, opacity: out, transform: `scale(${1.7 - 0.7 * k})` }}>
      <div style={{ fontWeight: 800, fontSize: size, lineHeight: 0.95, color: tone, letterSpacing: 1, textShadow: "0 6px 24px rgba(0,0,0,0.75), 0 2px 3px rgba(0,0,0,0.6)" }}>{text}</div>
      {sub ? <div style={{ fontWeight: 700, fontSize: 44, letterSpacing: 3, color: WHITE, textShadow: SHADOW, marginTop: 8 }}>{sub}</div> : null}
    </div>
  );
}

/** Rain over the whole picture, seeded so every frame is the same on every render. */
function Rain({ fx, t, w, h }: { fx: Fx; t: number; w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (fx.rain <= 0) return;
    const n = Math.round(620 * fx.rain);
    const slant = fx.slant;
    ctx.lineCap = "round";
    for (let layer = 0; layer < 3; layer++) {
      const len = 26 + layer * 34, speed = 1500 + layer * 1000;
      ctx.lineWidth = 1 + layer * 0.9;
      ctx.strokeStyle = `rgba(220,232,240,${0.07 + layer * 0.05})`;
      ctx.beginPath();
      let a = 1234567 + layer * 99;
      const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < n / (layer + 1); i++) {
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

function PlaceLabel({ at, text, sub, tone = "#fff", a = 1 }: { at: { x: number; y: number; visible: boolean }; text: string; sub?: string; tone?: string; a?: number }) {
  if (!at.visible || at.x < 30 || at.x > 1050 || at.y < 300 || at.y > 1500) return null;
  return (
    <div style={{ position: "absolute", left: at.x, top: at.y, opacity: a, transform: "translate(-6px,-6px)", fontFamily: FONT }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: tone, boxShadow: "0 0 0 3px rgba(0,0,0,0.5)" }} />
      <div style={{ position: "absolute", left: 20, top: -21, whiteSpace: "nowrap", fontWeight: 800, fontSize: 38, color: tone, textShadow: SHADOW }}>{text}</div>
      {sub ? <div style={{ position: "absolute", left: 20, top: 18, whiteSpace: "nowrap", fontWeight: 700, fontSize: 30, color: "#fff", textShadow: SHADOW }}>{sub}</div> : null}
    </div>
  );
}

function Panel({ children, x, y, w }: { children: ReactNode; x: number; y: number; w: number }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, background: "rgba(8,20,40,0.84)", borderLeft: `6px solid ${RED}`, padding: "10px 16px 12px", fontFamily: FONT, color: "#fff" }}>{children}</div>;
}

function NoSignal({ f }: { f: number }) {
  const bars = ["#d6d6d6", "#d6d600", "#00d6d6", "#00d600", "#d600d6", "#d60000", "#0000d6"];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", opacity: 0.85 }}>
        {bars.map((c) => <div key={c} style={{ flex: 1, background: c }} />)}
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0 3px, transparent 3px 8px)", backgroundPosition: `0 ${(f * 13) % 8}px` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 850, textAlign: "center" }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 150, color: "#fff", background: "#000", padding: "4px 40px", letterSpacing: 4 }}>NO SIGNAL</span>
      </div>
    </AbsoluteFill>
  );
}

export function TyphoonReel() {
  loadBarlow();
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const built = useMemo(() => typhoonFrame(t), [t]);
  const { frame, fx, inset } = built;
  const shot = shotAt(t);
  const hours = storyHours(t);
  const signal = signalAt(hours);
  const S = (s: number) => Math.round(s * fps);
  const proj = projector(frame.camera, width, height);
  const line = LINES.find((l) => t >= l.at && t < l.at + lineSeconds(l) + 0.55);
  const black = fx.black >= 1;
  const noSignal = t >= 112.2 && t < 113;
  const ending = t >= 175;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ filter: fx.whip > 0 ? `blur(${6 + fx.whip * 26}px)` : undefined }}>
        {black ? null : <SimCanvas frame={frame} width={width} height={height} />}
      </AbsoluteFill>
      <Rain fx={fx} t={t} w={width} h={height} />
      {fx.flash > 0 ? <AbsoluteFill style={{ background: "#dfe7ff", opacity: fx.flash * 0.45 }} /> : null}
      {!black ? <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 56% at 50% 47%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.62) 100%)" }} /> : null}
      {!black ? <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0, rgba(0,0,0,0.5) 13%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 66%, rgba(0,0,0,0.62) 76%, rgba(0,0,0,0.72) 100%)" }} /> : null}
      {inset ? (
        <div style={{ position: "absolute", left: inset.x, top: inset.y, width: inset.w, height: inset.h, overflow: "hidden", border: "3px solid #fff", boxShadow: "0 6px 26px rgba(0,0,0,0.6)" }}>
          <SimCanvas frame={inset.frame} width={inset.w} height={inset.h} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: NAVY, color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 28, padding: "3px 10px", letterSpacing: 0.5 }}>{inset.label}</div>
        </div>
      ) : null}

      {/* Shot-by-shot graphics. */}
      {t < 8 ? (
        <div style={{ position: "absolute", left: 40, right: 40, top: 420, fontFamily: FONT, opacity: clamp01((t - 2.4) / 0.4) * clamp01((7.8 - t) / 0.3) }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 56, letterSpacing: 4, textShadow: SHADOW }}>PHILIPPINES:</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 138, lineHeight: 0.92, textShadow: SHADOW }}>THE SUPER TYPHOON</div>
        </div>
      ) : null}
      <Breaking text="BREAKING: TYPHOON KALAKAS IN PH WATERS" t={t} at={8.1} to={11.2} />
      <Strap title="CARMELA DIZON" sub="PNN ANCHOR" t={t} at={11.25} to={14.1} />
      <Strap title="DR. ANDRES OCAMPO" sub="PNN METEOROLOGIST" t={t} at={14.4} to={17.3} />
      {t >= 17.4 && t < 22 ? (
        <>
          <Panel x={40} y={430} w={350}>
            <div style={{ fontSize: 30, fontWeight: 700, color: AMBER, letterSpacing: 1 }}>TYPHOON KALAKAS</div>
            <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1 }}>175 KM/H</div>
            <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.05 }}>935 HPA</div>
          </Panel>
          <PlaceLabel at={proj(LL(125.1, 11.9, 2))} text="EASTERN SAMAR" tone={AMBER} a={clamp01((t - 18) / 0.5)} />
          <PlaceLabel at={proj(LL(124.7, 10.7, 2))} text="LEYTE" a={clamp01((t - 18.4) / 0.5)} />
          <PlaceLabel at={proj([...stormPos(-72)].map((v, i) => (i === 1 ? 4 : v)) as V3)} text="KALAKAS" sub="1,000 KM OUT" tone="#ff8d80" a={clamp01((t - 17.6) / 0.5)} />
          <Breaking text="FORECAST LANDFALL: FRIDAY, ABOUT 05:00" t={t} at={18.5} to={22} tone={AMBER} />
        </>
      ) : null}
      <Breaking text="PRE-EMPTIVE EVACUATION ORDERED" t={t} at={22.1} to={36} />
      <Strap title="TOMAS CABARDO" sub="FISHERMAN · YOLANDA SURVIVOR" t={t} at={40.8} to={45.9} />
      {shot.name === "surge" ? (
        <>
          <Breaking text="SUPER TYPHOON KALAKAS · 320 KM/H" t={t} at={46.1} to={49.3} />
          <SurgeRuler t={t} proj={proj} />
        </>
      ) : null}
      <Breaking text="COASTAL EVACUATION UNDERWAY" t={t} at={56.1} to={67} tone={AMBER} />
      {shot.name === "monster" ? (
        <>
          <Slam text="350 KM/H" sub="SUSTAINED WINDS" f={f} at={S(67.9)} to={S(71.2)} fps={fps} y={640} />
          <Slam text="420 KM/H" sub="GUSTS" f={f} at={S(71.6)} to={S(73.5)} fps={fps} tone={AMBER} y={640} />
          <Slam text="850 HPA" sub="CENTRAL PRESSURE" f={f} at={S(73.8)} to={S(76.3)} fps={fps} y={640} />
          <div style={{ position: "absolute", left: 40, width: 640, top: 332, fontFamily: FONT, fontWeight: 700, fontSize: 30, color: "#fff", textShadow: SHADOW, lineHeight: 1.12 }}>
            “CATEGORY 6-EQUIVALENT” IS HYPOTHETICAL. NOT AN OFFICIAL PAGASA OR SAFFIR-SIMPSON CLASS.
          </div>
        </>
      ) : null}
      {shot.name === "landfall" ? <Slam text="LANDFALL" sub="EASTERN SAMAR · 05:00" f={f} at={S(79.05)} to={S(82)} fps={fps} tone={AMBER} y={700} size={200} /> : null}
      <Strap title="LIZA ABELLANA" sub="FROM A SAFE LOCATION · SANTA LUCIA" t={t} at={93.8} to={100.9} />
      <Breaking text="ROADS IMPASSABLE" t={t} at={91.1} to={93.6} />
      <Strap title="CONTACT LOST" sub="SAMAR FEEDS DOWN" t={t} at={110.3} to={112.2} />
      <Strap title="MIGUEL TAN" sub="LEYTE" t={t} at={117.7} to={123.9} />
      <Breaking text="T+24 HOURS · BRIDGE DOWN, HIGHWAYS CUT" t={t} at={113.2} to={117.4} />
      <Breaking text="RESCUE OPERATIONS UNDERWAY" t={t} at={124.2} to={133} tone={AMBER} />
      <Breaking text="FOOD AND CLEAN WATER NEEDED" t={t} at={133.2} to={144} />
      <Breaking text="RELIEF AND REPAIRS UNDERWAY" t={t} at={144.3} to={154} tone={AMBER} />

      {line && !ending ? <Caption line={line} t={t} /> : null}
      {noSignal ? <NoSignal f={f} /> : null}
      {ending ? (
        <AbsoluteFill style={{ background: "#000" }}>
          <div style={{ position: "absolute", left: 50, right: 50, top: 640, textAlign: "center", fontFamily: FONT, fontWeight: 800, color: "#fff", fontSize: 176, lineHeight: 1, transform: `scale(${1.5 - 0.5 * spring({ frame: f - S(175), fps, config: { damping: 13, stiffness: 240, mass: 0.7 } })})` }}>
            PREPAREDNESS<br /><span style={{ color: AMBER }}>SAVES LIVES</span>
          </div>
        </AbsoluteFill>
      ) : null}
      <TopBar hours={hours} clock={!ending} signal={noSignal ? 0 : signal} />
      <Audio src={staticFile("out/music.wav")} />
    </AbsoluteFill>
  );
}

/** A height ruler at the street, climbing with the sea in the surge shot. */
function SurgeRuler({ t, proj }: { t: number; proj: ReturnType<typeof projector> }) {
  const k = clamp01((t - 47) / 7.2);
  const level = -0.1 + 7.2 * k;
  const X = 3, Z = 4.3;
  const base = proj([X, 0, Z]), top = proj([X, 7, Z]);
  const metres = Math.max(0, Math.min(7, level));
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} stroke={AMBER} strokeWidth={7} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((m) => {
        const p = proj([X, m, Z]);
        return (
          <g key={m}>
            <line x1={p.x - 16} x2={p.x + 16} y1={p.y} y2={p.y} stroke={AMBER} strokeWidth={5} />
            <text x={p.x + 24} y={p.y + 15} fill="#fff" fontFamily={FONT} fontWeight={800} fontSize={42} style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.7)", strokeWidth: 5 }}>{m} M</text>
          </g>
        );
      })}
      <text x={250} y={520} fill={AMBER} fontFamily={FONT} fontWeight={800} fontSize={140} style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.75)", strokeWidth: 8 }}>{metres.toFixed(1)} M</text>
    </svg>
  );
}
