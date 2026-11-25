// The simulation HUD drawn over the 3D view: header, data panels, graphs, target markers, alerts, callouts, a phase
// bar and an end card. Everything key sits between y 250 and 1570 (out of the platform's top and bottom UI).
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring } from "remotion";
import type { Projected } from "./engine";

// System fonts on the render machine (Windows): Bahnschrift is DIN-like, Consolas is the readout face.
export const HUD_FONT = "Bahnschrift, 'Segoe UI', sans-serif";
export const MONO = "Consolas, 'Courier New', monospace";
export const HUD = { cyan: "#7DF9FF", amber: "#FFC24B", red: "#FF4B4B", white: "#F4FBFF", green: "#6BFF9E" };
export type Tone = "cyan" | "amber" | "red" | "white" | "green";

export const SAFE_TOP = 260;
export const SAFE_BOTTOM = 1570;

const glow = (c: string, r = 10) => `0 0 ${r}px ${c}99, 0 0 2px ${c}`;

/** Scanlines, a vignette and a faint grid, for the monitor feel. */
export function Overlay({ frame, tint = HUD.cyan }: { frame: number; tint?: string }) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${tint}10 1px, transparent 1px), linear-gradient(90deg, ${tint}10 1px, transparent 1px)`,
          backgroundSize: "90px 90px",
          backgroundPosition: `0 ${(frame * 0.6) % 90}px`,
        }}
      />
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0 2px, transparent 2px 5px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
}

/** Corner brackets round the safe area. */
export function Frame({ color = HUD.cyan }: { color?: string }) {
  const s: CSSProperties = { position: "absolute", width: 70, height: 70, borderColor: color, opacity: 0.8 };
  const b = "4px solid";
  return (
    <>
      <div style={{ ...s, left: 36, top: SAFE_TOP - 24, borderLeft: b, borderTop: b }} />
      <div style={{ ...s, right: 36, top: SAFE_TOP - 24, borderRight: b, borderTop: b }} />
      <div style={{ ...s, left: 36, top: SAFE_BOTTOM - 46, borderLeft: b, borderBottom: b }} />
      <div style={{ ...s, right: 36, top: SAFE_BOTTOM - 46, borderRight: b, borderBottom: b }} />
    </>
  );
}

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, "0");
/** Simulated clock: `seconds` of simulated time as T+HH:MM:SS. */
export const clock = (seconds: number) => `T+${pad(seconds / 3600)}:${pad((seconds / 60) % 60)}:${pad(seconds % 60)}`;

export function Header(props: { code: string; title: string; region: string; simSeconds: number; frame: number; accent?: string }) {
  const accent = props.accent ?? HUD.cyan;
  const rec = Math.floor(props.frame / 15) % 2 === 0;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: SAFE_TOP, fontFamily: HUD_FONT, color: HUD.white }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, letterSpacing: 4, color: accent, textShadow: glow(accent, 6) }}>
        <span>
          {props.code} <span style={{ opacity: 0.6 }}>// LIVE SIMULATION</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO }}>
          <span style={{ width: 18, height: 18, borderRadius: 9, background: HUD.red, opacity: rec ? 1 : 0.2, boxShadow: glow(HUD.red) }} />
          {clock(props.simSeconds)}
        </span>
      </div>
      <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: 2, lineHeight: 1.05, marginTop: 8, textShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>{props.title}</div>
      <div style={{ fontSize: 30, letterSpacing: 6, opacity: 0.85, marginTop: 4, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{props.region}</div>
    </div>
  );
}

export type Row = { k: string; v: string; unit?: string; tone?: Tone };

/** A boxed list of readouts. `appear` 0…1 slides it in. */
export function Panel(props: { x: number; y: number; w: number; title: string; rows: Row[]; appear?: number; tone?: Tone; align?: "left" | "right" }) {
  const a = props.appear ?? 1;
  const tone = HUD[props.tone ?? "cyan"];
  const dx = (1 - a) * (props.align === "right" ? 60 : -60);
  return (
    <div
      style={{
        position: "absolute",
        left: props.x,
        top: props.y,
        width: props.w,
        opacity: a,
        transform: `translateX(${dx}px)`,
        fontFamily: HUD_FONT,
        background: "linear-gradient(180deg, rgba(4,16,24,0.72), rgba(4,16,24,0.45))",
        borderLeft: `5px solid ${tone}`,
        padding: "16px 22px 14px",
        boxShadow: `inset 0 0 0 1px ${tone}44`,
      }}
    >
      <div style={{ fontSize: 24, letterSpacing: 5, color: tone, textShadow: glow(tone, 6), marginBottom: 8 }}>{props.title}</div>
      {props.rows.map((r) => {
        const c = HUD[r.tone ?? "white"];
        return (
          <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, lineHeight: 1.25 }}>
            <span style={{ fontSize: 24, letterSpacing: 2, color: "#cfe9f0", opacity: 0.8 }}>{r.k}</span>
            <span style={{ fontFamily: MONO, fontSize: 36, fontWeight: 700, color: c, textShadow: glow(c, 8), whiteSpace: "nowrap" }}>
              {r.v}
              {r.unit ? <span style={{ fontSize: 22, marginLeft: 6, opacity: 0.8 }}>{r.unit}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A live trace (seismograph, tide gauge…): `values` oldest first, drawn left to right. */
export function Graph(props: { x: number; y: number; w: number; h: number; label: string; values: number[]; min: number; max: number; tone?: Tone; readout?: string; appear?: number }) {
  const c = HUD[props.tone ?? "cyan"];
  const n = props.values.length;
  const pts = props.values
    .map((v, i) => {
      const x = (i / Math.max(1, n - 1)) * props.w;
      const y = props.h - ((Math.max(props.min, Math.min(props.max, v)) - props.min) / (props.max - props.min)) * props.h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div style={{ position: "absolute", left: props.x, top: props.y, width: props.w, opacity: props.appear ?? 1, fontFamily: HUD_FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 4, color: c, textShadow: glow(c, 6), marginBottom: 6 }}>
        <span>{props.label}</span>
        <span style={{ fontFamily: MONO, fontSize: 26 }}>{props.readout}</span>
      </div>
      <svg width={props.w} height={props.h} style={{ display: "block", background: "rgba(4,16,24,0.55)", boxShadow: `inset 0 0 0 1px ${c}44` }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={props.w} y1={props.h * f} y2={props.h * f} stroke={c} strokeOpacity={0.15} />
        ))}
        <polyline points={pts} fill="none" stroke={c} strokeWidth={3} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${c})` }} />
      </svg>
    </div>
  );
}

/** Corner brackets on a point in the 3D view, with a leader line and a label. */
export function Marker(props: { at: Projected | null; label: string; sub?: string; tone?: Tone; size?: number; appear?: number; side?: "left" | "right"; lift?: number }) {
  const p = props.at;
  const a = props.appear ?? 1;
  if (!p || !p.visible || a <= 0 || p.x < -200 || p.x > 1280 || p.y < 0 || p.y > 2000) return null;
  const c = HUD[props.tone ?? "amber"];
  const s = (props.size ?? 70) * (1.6 - 0.6 * a);
  const left = props.side === "left";
  const lift = props.lift ?? 110;
  const lx = p.x + (left ? -150 : 150), ly = p.y - lift;
  const arm = 18;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: a, overflow: "visible" }}>
      <g stroke={c} strokeWidth={4} fill="none" style={{ filter: `drop-shadow(0 0 5px ${c})` }}>
        <path d={`M${p.x - s / 2},${p.y - s / 2 + arm} v${-arm} h${arm} M${p.x + s / 2 - arm},${p.y - s / 2} h${arm} v${arm} M${p.x + s / 2},${p.y + s / 2 - arm} v${arm} h${-arm} M${p.x - s / 2 + arm},${p.y + s / 2} h${-arm} v${-arm}`} />
        <polyline points={`${p.x + (left ? -s / 2 : s / 2)},${p.y - s / 2} ${lx},${ly} ${lx + (left ? -220 : 220)},${ly}`} strokeWidth={2.5} />
      </g>
      <circle cx={p.x} cy={p.y} r={5} fill={c} />
      <text x={left ? lx - 220 : lx} y={ly - 14} fill={c} fontFamily={HUD_FONT} fontSize={30} letterSpacing={3} style={{ filter: `drop-shadow(0 0 4px ${c})` }}>
        {props.label}
      </text>
      {props.sub ? (
        <text x={left ? lx - 220 : lx} y={ly + 34} fill={HUD.white} fontFamily={MONO} fontSize={26}>
          {props.sub}
        </text>
      ) : null}
    </svg>
  );
}

/** A flashing warning strip. */
export function Alert(props: { text: string; frame: number; start: number; end: number; y: number; tone?: Tone }) {
  if (props.frame < props.start || props.frame > props.end) return null;
  const c = HUD[props.tone ?? "red"];
  const f = props.frame - props.start;
  const inA = Math.min(1, f / 6);
  const blink = f < 40 ? (Math.floor(f / 5) % 2 ? 0.35 : 1) : 1;
  const out = interpolate(props.frame, [props.end - 8, props.end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: props.y,
        display: "flex",
        justifyContent: "center",
        opacity: inA * blink * out,
        transform: `scaleX(${0.6 + 0.4 * inA})`,
      }}
    >
      <div
        style={{
          fontFamily: HUD_FONT,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: 5,
          color: "#140405",
          background: c,
          padding: "12px 34px",
          boxShadow: `0 0 40px ${c}aa`,
          backgroundImage: "repeating-linear-gradient(-45deg, rgba(0,0,0,0.12) 0 14px, transparent 14px 28px)",
        }}
      >
        ⚠ {props.text}
      </div>
    </div>
  );
}

/** A big number or word slammed in at the centre on a key moment. */
export function Callout(props: { text: string; sub?: string; frame: number; start: number; end: number; fps: number; y?: number; tone?: Tone }) {
  if (props.frame < props.start || props.frame > props.end) return null;
  const c = HUD[props.tone ?? "white"];
  const k = spring({ frame: props.frame - props.start, fps: props.fps, config: { damping: 11, stiffness: 260, mass: 0.6 } });
  const out = interpolate(props.frame, [props.end - 8, props.end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: props.y ?? 820, textAlign: "center", opacity: out, transform: `scale(${interpolate(k, [0, 1], [1.8, 1])})`, fontFamily: HUD_FONT }}>
      <div style={{ fontSize: 190, fontWeight: 700, lineHeight: 1, color: c, letterSpacing: 4, textShadow: `0 0 30px ${c}88, 0 8px 30px rgba(0,0,0,0.8)` }}>{props.text}</div>
      {props.sub ? <div style={{ fontSize: 38, letterSpacing: 6, color: HUD.white, marginTop: 14, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>{props.sub}</div> : null}
    </div>
  );
}

/** The simulation's phases along a bar, with the current one lit. */
export function PhaseBar(props: { phases: { at: number; label: string }[]; t: number; total: number; tone?: Tone }) {
  const c = HUD[props.tone ?? "cyan"];
  const w = 960, x = 60, y = SAFE_BOTTOM - 120;
  const current = [...props.phases].reverse().find((p) => props.t >= p.at);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, fontFamily: HUD_FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, letterSpacing: 4, color: c, marginBottom: 10, textShadow: glow(c, 6) }}>
        <span>PHASE // {current?.label ?? ""}</span>
        <span style={{ fontFamily: MONO }}>{Math.min(100, (props.t / props.total) * 100).toFixed(0)}%</span>
      </div>
      <div style={{ position: "relative", height: 10, background: "rgba(4,16,24,0.6)", boxShadow: `inset 0 0 0 1px ${c}55` }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(1, props.t / props.total) * 100}%`, background: c, boxShadow: `0 0 12px ${c}` }} />
        {props.phases.map((p) => (
          <div key={p.label} style={{ position: "absolute", left: `${(p.at / props.total) * 100}%`, top: -6, width: 3, height: 22, background: HUD.white, opacity: 0.7 }} />
        ))}
      </div>
    </div>
  );
}

/** The closing summary: what the simulation ended with. */
export function EndCard(props: { frame: number; start: number; fps: number; index: string; title: string; stats: { k: string; v: string }[]; tone?: Tone; children?: ReactNode }) {
  if (props.frame < props.start) return null;
  const c = HUD[props.tone ?? "cyan"];
  const f = props.frame - props.start;
  const k = spring({ frame: f, fps: props.fps, config: { damping: 14, stiffness: 180 } });
  return (
    <AbsoluteFill style={{ background: `rgba(2,8,14,${0.62 * Math.min(1, f / 10)})`, fontFamily: HUD_FONT, color: HUD.white }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 560, opacity: k, transform: `translateY(${(1 - k) * 40}px)` }}>
        <div style={{ fontSize: 30, letterSpacing: 8, color: c, textShadow: glow(c, 8) }}>SIMULATION COMPLETE · {props.index}</div>
        <div style={{ fontSize: 110, fontWeight: 700, lineHeight: 1, margin: "14px 0 40px" }}>{props.title}</div>
        {props.stats.map((s, i) => {
          const a = spring({ frame: f - 6 - i * 4, fps: props.fps, config: { damping: 14, stiffness: 200 } });
          return (
            <div key={s.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `2px solid ${c}55`, padding: "18px 0", opacity: a, transform: `translateX(${(1 - a) * -40}px)` }}>
              <span style={{ fontSize: 32, letterSpacing: 4, opacity: 0.85 }}>{s.k}</span>
              <span style={{ fontFamily: MONO, fontSize: 52, fontWeight: 700, color: c, textShadow: glow(c, 10) }}>{s.v}</span>
            </div>
          );
        })}
        {props.children}
      </div>
    </AbsoluteFill>
  );
}

/** A full-screen white flash for impacts and blasts. */
export function Flash({ frame, at, decay = 12, color = "#ffffff", peak = 1 }: { frame: number; at: number; decay?: number; color?: string; peak?: number }) {
  if (frame < at) return null;
  const a = peak * Math.exp(-(frame - at) / decay);
  if (a < 0.01) return null;
  return <AbsoluteFill style={{ background: color, opacity: a }} />;
}

/** Number formatting for readouts. */
export const fmt = (n: number, digits = 0) => n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
