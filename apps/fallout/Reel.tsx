// The graphics over the 3D: the fictional-simulation label on every frame, the alert and voicemail on the phone's screen,
// one line of words at the bottom, the 50-megaton line, the map's markers, and the time-lapse stamps.
import { loadFont } from "@remotion/fonts";
import { useMemo } from "react";
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { projector, type V3 } from "../../src/kit/lowpoly/engine";
import { Marker } from "../../src/kit/lowpoly/Hud";
import { CinemaCanvas, gradeAt } from "./cinema";
import { cloudHeight, groundCircle, stationPoint } from "./region";
import { falloutFrame } from "./sim";
import { PARTS, STAMPS, STATION_HIT, STREET_BLAST, TOWN, WORDS, YIELD, cloudAge, etaSeconds, lapseView, partAt, plumeKm, shockKm, simSeconds } from "./timeline";

const FONT = "Barlow Condensed";
let fontsLoaded: Promise<unknown> | undefined;
export function loadFalloutFonts() {
  fontsLoaded ??= Promise.all(["600", "700", "800"].map((w) => loadFont({ family: FONT, url: staticFile(`assets/barlow-condensed-latin-${w}-normal.woff2`), weight: w })));
  return fontsLoaded;
}

const AMBER = "#ffb81c", RED = "#ff3b30", SICK = "#d8e23a";
const SHADOW = "0 2px 4px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.65)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function Bottom({ text, sub, t, at, to }: { text: string; sub?: string; t: number; at: number; to: number }) {
  const a = Math.min(clamp01((t - at) / 0.2), clamp01((to - t) / 0.2));
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1290, height: 270, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", textAlign: "center", fontFamily: FONT, opacity: a, textShadow: SHADOW }}>
      <div style={{ fontWeight: 800, fontSize: 68, lineHeight: 1.03, color: "#fff" }}>{text}</div>
      {sub ? <div style={{ fontWeight: 700, fontSize: 42, lineHeight: 1.08, color: AMBER, marginTop: 8 }}>{sub}</div> : null}
    </div>
  );
}

/** A big line, landing with weight. */
function Slam({ text, sub, f, at, to, fps, tone = "#fff", size = 170, y = 760, subTone = "#fff" }: { text: string; sub?: string; f: number; at: number; to: number; fps: number; tone?: string; size?: number; y?: number; subTone?: string }) {
  if (f < at || f >= to) return null;
  const k = spring({ frame: f - at, fps, config: { damping: 13, stiffness: 260, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", left: 30, right: 30, top: y, textAlign: "center", fontFamily: FONT, opacity: clamp01((to - f) / 6), transform: `scale(${1.14 - 0.14 * k})` }}>
      <div style={{ fontWeight: 800, fontSize: size, lineHeight: 0.96, color: tone, textShadow: "0 6px 26px rgba(0,0,0,0.8), 0 2px 3px rgba(0,0,0,0.7)" }}>{text}</div>
      {sub ? <div style={{ fontWeight: 700, fontSize: 44, letterSpacing: 1.5, lineHeight: 1.08, color: subTone, textShadow: SHADOW, marginTop: 10 }}>{sub}</div> : null}
    </div>
  );
}

type Rect = { x: number; y: number; w: number; h: number };

/** The alert, filling the phone's screen. */
function AlertScreen({ r, t }: { r: Rect; t: number }) {
  const pulse = Math.floor(t * 3) % 2 === 0 ? 1 : 0.86;
  const u = r.w / 560;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#fff", fontFamily: FONT, padding: `${60 * u}px ${34 * u}px`, boxSizing: "border-box" }}>
      <div style={{ fontWeight: 700, fontSize: 40 * u, opacity: 0.86 }}>9:12</div>
      <div style={{ fontSize: 138 * u, fontWeight: 800, color: "#fff", marginTop: 66 * u, lineHeight: 1, opacity: pulse }}>⚠</div>
      <div style={{ fontWeight: 700, letterSpacing: 2.5 * u, fontSize: 38 * u, marginTop: 12 * u }}>EMERGENCY ALERT</div>
      <div style={{ fontWeight: 800, fontSize: 89 * u, lineHeight: 1, marginTop: 42 * u }}>INCOMING MISSILE</div>
      <div style={{ fontWeight: 800, fontSize: 56 * u, lineHeight: 1.08, marginTop: 30 * u }}>SEEK SHELTER NOW.<br />THIS IS NOT A DRILL.</div>
      <div style={{ flex: 1 }} />
      <div style={{ fontWeight: 700, fontSize: 38 * u, letterSpacing: 2 * u, borderTop: `${3 * u}px solid rgba(255,255,255,0.65)`, paddingTop: 22 * u, width: "86%" }}>PORT CALDER METRO AREA</div>
    </div>
  );
}

/** The voicemail: played from the last of the battery. */
function VoicemailScreen({ r, t }: { r: Rect; t: number }) {
  const u = r.w / 560;
  const bars = 15;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#e7f1ff", fontFamily: FONT, padding: `${60 * u}px ${34 * u}px`, boxSizing: "border-box" }}>
      <div style={{ alignSelf: "flex-end", fontWeight: 800, fontSize: 56 * u, color: RED, display: "flex", alignItems: "center", gap: 12 * u }}>
        <span style={{ display: "inline-block", width: 74 * u, height: 32 * u, border: `${4 * u}px solid ${RED}`, borderRadius: 7 * u, position: "relative" }}>
          <span style={{ position: "absolute", left: 3 * u, top: 3 * u, bottom: 3 * u, width: 7 * u, background: RED }} />
        </span>
        1%
      </div>
      <div style={{ fontWeight: 700, letterSpacing: 2.5 * u, fontSize: 40 * u, marginTop: 170 * u, opacity: 0.9 }}>VOICEMAIL</div>
      <div style={{ fontWeight: 800, fontSize: 72 * u, lineHeight: 1.05, marginTop: 18 * u }}>Missed call · 9:13</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * u, marginTop: 90 * u, height: 140 * u }}>
        {Array.from({ length: bars }, (_, i) => (
          <div key={i} style={{ width: 14 * u, height: (30 + 90 * Math.abs(Math.sin(t * 2.6 + i * 1.2))) * u, background: "#a6c9f5", borderRadius: 5 * u }} />
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 48 * u, marginTop: 70 * u }}>▶ PLAY</div>
    </div>
  );
}

const clockText = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** What the simulation's reading: a small block of live numbers under the label. */
function Readout({ rows }: { rows: { k: string; v: string; tone?: string }[] }) {
  return (
    <div style={{ position: "absolute", right: 40, top: 256, minWidth: 330, fontFamily: FONT, background: "rgba(5,10,20,0.62)", borderRight: `4px solid ${AMBER}`, padding: "8px 14px 9px", textShadow: SHADOW }}>
      {rows.map((r) => (
        <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontWeight: 600, fontSize: 28, letterSpacing: 1.5, color: "#dfe6ea" }}>{r.k}</span>
          <span style={{ fontWeight: 800, fontSize: 40, color: r.tone ?? "#fff", fontVariantNumeric: "tabular-nums" }}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

type Proj = ReturnType<typeof projector>;

/** A range ring on the ground, dashed, with its label at the near edge. */
function RangeRing({ proj, km, label, tone, opacity }: { proj: Proj; km: number; label: string; tone: string; opacity: number }) {
  if (opacity <= 0.01) return null;
  const pts = groundCircle(km).map((p) => proj(p));
  if (pts.some((p) => !p.visible)) return null;
  const near = pts.reduce((a, b) => (b.y > a.y ? b : a));
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity }}>
        <polygon points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={tone} strokeWidth={4} strokeDasharray="20 12" />
      </svg>
      <div style={{ position: "absolute", left: Math.min(760, Math.max(40, near.x - 150)), top: Math.min(1250, near.y + 10), opacity, fontFamily: FONT, fontWeight: 800, fontSize: 34, letterSpacing: 1, color: tone, background: "rgba(5,10,20,0.68)", padding: "1px 10px 2px", whiteSpace: "nowrap" }}>{label}</div>
    </>
  );
}

/** The lens catching a very bright light: a thin streak right across the frame, and a soft bloom round it. */
function Flare({ x, y, alpha }: { x: number; y: number; alpha: number }) {
  if (alpha <= 0.01) return null;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: -200, width: 1480, top: y - 7, height: 14, opacity: alpha, background: "linear-gradient(90deg, transparent, rgba(255,190,120,0.35) 25%, rgba(255,244,220,1) 50%, rgba(255,190,120,0.35) 75%, transparent)", filter: "blur(4px)" }} />
      <div style={{ position: "absolute", left: x - 340, top: y - 340, width: 680, height: 680, opacity: alpha * 0.8, background: "radial-gradient(circle, rgba(255,214,160,0.75) 0, rgba(255,150,70,0.24) 38%, transparent 70%)" }} />
    </AbsoluteFill>
  );
}

/** `step` plays every step-th frame and no sound: the contact-sheet composition, for reviewing the whole reel fast. */
export function FalloutReel({ step = 1 }: { step?: number }) {
  loadFalloutFonts();
  const f = useCurrentFrame() * step;
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const { frame, fx } = useMemo(() => falloutFrame(t), [t]);
  const part = partAt(t);
  const S = (s: number) => Math.round(s * fps);
  const proj = projector(frame.camera, width, height);
  const word = WORDS.find((w) => t >= w.at && t < w.to);
  const stamp = STAMPS.find((w) => t >= w.at && t < w.to);

  const rect = (): Rect | null => {
    if (!fx.screen) return null;
    const a = proj(fx.screen.tl), b = proj(fx.screen.br);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  };
  const r = rect();

  const onMap = part === "plume" || (part === "lapse" && lapseView(t) === "map");
  const mapAppear = part === "plume" ? clamp01((t - 58.4) / 0.5) : 1;
  const zero: V3 = [0, 0.5, 0];
  const station = stationPoint();
  const street = t >= STREET_BLAST.from && t < STREET_BLAST.to;
  const inTown = t >= TOWN.from && t < TOWN.to;
  const inSim = part === "fireball" || part === "rise";
  const flarePoint = fx.flare ? proj(fx.flare.p) : null;
  const ringIn = (a: number, b: number) => clamp01((t - a) / 0.4) * clamp01((b - t) / 0.3);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <CinemaCanvas frame={frame} width={width} height={height} frameNo={f} grade={gradeAt(t)} zoom={fx.zoom} />
      {flarePoint && flarePoint.visible && fx.flare ? <Flare x={flarePoint.x} y={flarePoint.y} alpha={fx.flare.alpha} /> : null}
      {r && part === "alert" ? <AlertScreen r={r} t={t} /> : null}
      {r && part === "voicemail" ? <VoicemailScreen r={r} t={t} /> : null}

      {part === "fireball" && !street ? <RangeRing proj={proj} km={4} label="FIREBALL · 8 KM ACROSS" tone={AMBER} opacity={ringIn(35.6, 38)} /> : null}
      {part === "rise" ? <RangeRing proj={proj} km={55} label="BUILDINGS DESTROYED · 55 KM" tone={RED} opacity={ringIn(44.2, 46)} /> : null}
      {onMap && !inTown ? <RangeRing proj={proj} km={55} label="BLAST · 55 KM" tone={RED} opacity={part === "plume" ? clamp01((t - 62.6) / 0.4) * 0.9 : 0.75} /> : null}
      {onMap && !inTown ? (
        <>
          <Marker at={proj(zero)} label="GROUND ZERO" sub="PORT CALDER" tone="red" appear={mapAppear} size={60} side="right" lift={150} />
          <Marker at={proj(station)} label="THE STATION" sub="60 KM" tone="amber" appear={mapAppear} size={46} side="right" lift={190} />
        </>
      ) : null}

      {/* Light dark bands behind the words, top and bottom, as on the kit's other reels. */}
      {part !== "alert" && part !== "voicemail" && fx.black < 1 ? <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0, rgba(0,0,0,0.28) 13%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.5) 74%, rgba(0,0,0,0.62) 100%)" }} /> : null}
      {/* A soft vignette, for the lens. */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 76% 62% at 50% 50%, transparent 58%, rgba(0,0,0,0.42) 100%)" }} />

      {fx.dust > 0 ? <AbsoluteFill style={{ background: "#7e6749", opacity: fx.dust }} /> : null}
      {fx.white > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: fx.white }} /> : null}
      {fx.black > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fx.black }} /> : null}

      {word ? <Bottom text={word.text} sub={word.sub} t={t} at={word.at} to={word.to} /> : null}
      <Slam text={YIELD.text} sub={YIELD.sub} f={f} at={S(YIELD.at)} to={S(YIELD.to)} fps={fps} size={166} y={1300} tone={AMBER} />
      {stamp ? <Slam text={stamp.text} sub={stamp.sub} f={f} at={S(stamp.at)} to={S(stamp.to)} fps={fps} size={156} y={1300} subTone={SICK} /> : null}

      {inSim ? (
        <Readout
          rows={[
            { k: "T+", v: clockText(simSeconds(t)), tone: AMBER },
            { k: "BLAST RADIUS", v: `${shockKm(t).toFixed(1)} KM`, tone: RED },
            { k: "CLOUD TOP", v: `${cloudHeight(cloudAge(t)).toFixed(0)} KM` },
          ]}
        />
      ) : null}
      {(part === "light" || part === "wave") && t >= 47.1 && t < STATION_HIT && fx.dust < 0.3 ? <Readout rows={[{ k: "BLAST ARRIVES IN", v: clockText(etaSeconds(t)), tone: RED }, { k: "DISTANCE", v: `${(60 - shockKm(t)).toFixed(1)} KM` }]} /> : null}
      {part === "plume" && !inTown && fx.black < 1 ? <Readout rows={[{ k: "PLUME REACH", v: `${plumeKm(t).toFixed(0)} KM`, tone: SICK }, { k: "WIND", v: "NE" }]} /> : null}

      {t < PARTS.black.from && fx.black < 1 ? (
        <div style={{ position: "absolute", left: 40, top: 256, fontFamily: FONT, fontWeight: 700, fontSize: 32, letterSpacing: 2, color: "#fff", background: "rgba(5,10,20,0.72)", border: `2px solid ${AMBER}`, padding: "2px 14px 3px" }}>FICTIONAL SIMULATION</div>
      ) : null}
      {step === 1 ? <Audio src={staticFile("out/music.wav")} /> : null}
    </AbsoluteFill>
  );
}
