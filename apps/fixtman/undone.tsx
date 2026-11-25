// The jobs that never got done: boxes gathering days, cobwebs and grass, the drill that gets put down, and the garage.
import { useMemo, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ease, lerp, pop, slam } from "../../src/kit/remotion/motion";
import { clamp, FONT, FPS, inScene, lengthOf, Punch, T, W } from "./look";
import { CUES } from "./timeline";

/** A taped cardboard box with a printed label. */
export function Box(props: { w: number; h: number; label: string; sub: string; icon: ReactNode }) {
  const { w, h } = props;
  const d = 70;
  return (
    <svg width={w + d} height={h + d} viewBox={`0 ${-d} ${w + d} ${h + d}`} style={{ overflow: "visible", display: "block" }}>
      <ellipse cx={(w + d) / 2} cy={h + 4} rx={(w + d) * 0.56} ry="26" fill="rgba(30,25,15,.28)" />
      <polygon points={`0,0 ${d},${-d} ${w + d},${-d} ${w},0`} fill="#dcb07e" />
      <polygon points={`${w},0 ${w + d},${-d} ${w + d},${h - d} ${w},${h}`} fill="#a97c4d" />
      <rect x="0" y="0" width={w} height={h} fill={T.card} />
      <rect x={w / 2 - 46} y="0" width="92" height={h * 0.16} fill="#e8d3b0" opacity="0.85" />
      <polygon points={`${w / 2 - 46},0 ${w / 2 - 46 + d},${-d} ${w / 2 + 46 + d},${-d} ${w / 2 + 46},0`} fill="#f0dfc2" opacity="0.85" />
      <g transform={`translate(${w / 2} ${h * 0.45})`} stroke="#5b3d1e" fill="none" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
        {props.icon}
      </g>
      <text x={w / 2} y={h * 0.83} textAnchor="middle" fontFamily={FONT} fontWeight="900" fontSize={Math.min(h * 0.14, w * 0.12)} fill="#5b3d1e">{props.label}</text>
      <text x={w / 2} y={h * 0.93} textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize={h * 0.055} fill="#5b3d1e" letterSpacing="4">{props.sub}</text>
    </svg>
  );
}

export const ICONS = {
  tv: (<><rect x="-150" y="-95" width="300" height="172" rx="10" /><path d="M-70 110 H70 M0 77 V110" /></>),
  bed: (<path d="M-200 70 V-60 M-200 22 H200 V70 M200 22 V0 Q200 -28 170 -28 H-105 V22 M-152 -20 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0" />),
  swing: (<path d="M-150 100 L-95 -90 H110 L160 100 M-95 -90 L-40 100 M110 -90 L60 100 M-25 -90 V30 M30 -90 V30 M-32 32 H38" />),
};

/** The days it has sat there: spins up fast and lands with a thud. */
function Days({ from, to, at, over, color = T.white }: { from: number; to: number; at: number; over: number; color?: string }) {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + over], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.5, 1) });
  const bump = frame >= at + over ? (1 - slam(frame, at + over, FPS)) * 0.35 : 0;
  return (
    <div style={{ position: "absolute", top: 1415, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 150, letterSpacing: "-0.04em", color, transform: `scale(${1 + bump})`, fontVariantNumeric: "tabular-nums" }}>
      DAY {Math.round(lerp(from, to, k))}
    </div>
  );
}

/** Cobweb spreading from a corner as the days pass. */
function Cobweb({ grow }: { grow: number }) {
  const rays = [8, 28, 48, 68, 84].map((a) => (a * Math.PI) / 180);
  return (
    <svg width="300" height="300" style={{ position: "absolute", overflow: "visible", opacity: 0.8 }}>
      <g stroke="#fffaf0" strokeWidth="4" fill="none" strokeLinecap="round">
        {rays.map((a, i) => <path key={i} d={`M0 0 L${Math.cos(a) * 270 * grow} ${Math.sin(a) * 270 * grow}`} />)}
        {[0.3, 0.55, 0.8, 1].map((r, j) => grow > r * 0.8 && (
          <path key={j} d={rays.map((a, i) => `${i ? "L" : "M"}${Math.cos(a) * 250 * r * grow} ${Math.sin(a) * 250 * r * grow}`).join(" ")} />
        ))}
      </g>
    </svg>
  );
}

export function TvBox() {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [0, 120], [1.01, 1.07]);
  const thud = interpolate(frame, [0, 5, 10], [1.05, 0.995, 1], clamp);
  return (
    <AbsoluteFill style={{ transform: `scale(${push * thud})` }}>
      <AbsoluteFill style={{ background: "#efe6d7" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1335, height: 26, background: "#fbf6ec" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1361, bottom: 0, background: "#a67b50" }} />
      {/* Where it should have gone. */}
      <div style={{ position: "absolute", left: 130, top: 600, width: 820, height: 470, border: "7px dashed rgba(31,59,75,.3)", borderRadius: 18 }} />
      <div style={{ position: "absolute", left: 150, top: 755, transform: "rotate(-4deg)", transformOrigin: "20% 100%" }}>
        <Box w={720} h={560} label="65-INCH TV" sub="THIS SIDE UP" icon={ICONS.tv} />
        <div style={{ position: "absolute", left: 4, top: 74 }}><Cobweb grow={ease(frame, 20, 105)} /></div>
      </div>
      <Days from={1} to={214} at={18} over={62} />
    </AbsoluteFill>
  );
}

export function BedBox() {
  const planks = [[-60, 1190, -7, "#d9b384"], [60, 1262, 4, "#c99b6a"], [-10, 1325, -2, "#e3c295"]] as const;
  return (
    <Punch>
      <AbsoluteFill style={{ background: "#d3dfe3" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1335, height: 24, background: "#f3f7f8" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1359, bottom: 0, background: "#6f8894" }} />
      <div style={{ position: "absolute", left: 110, top: 690 }}>
        <Box w={790} h={480} label="BED FRAME" sub="148 PARTS INSIDE" icon={ICONS.bed} />
      </div>
      {planks.map(([x, y, r, c]) => (
        <div key={y} style={{ position: "absolute", left: 160 + x, top: y, width: 780, height: 46, borderRadius: 8, background: c, transform: `rotate(${r}deg)`, boxShadow: "0 14px 18px rgba(20,40,55,.25)" }}>
          {[60, 380, 700].map((hx) => <span key={hx} style={{ position: "absolute", left: hx, top: 16, width: 14, height: 14, borderRadius: 9, background: "#6d4a26" }} />)}
        </div>
      ))}
      <Days from={214} to={365} at={2} over={26} />
    </Punch>
  );
}

/** The yard: days and nights wheel past and the grass climbs the box. */
export function SwingBox() {
  const frame = useCurrentFrame();
  const turn = frame / 30;
  const night = 0.5 - 0.5 * Math.cos(turn * Math.PI * 2);
  const ang = turn * Math.PI * 2 - Math.PI / 2;
  const grow = ease(frame, 6, lengthOf("swing") - 12);
  const blades = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: -10 + i * 16, h: 70 + ((i * 53) % 90), lean: ((i * 37) % 30) - 15, c: ["#4f9a4a", "#63b257", "#3f8542"][i % 3] })), []);
  return (
    <Punch>
      <AbsoluteFill style={{ background: "#bfe3f2" }} />
      <AbsoluteFill style={{ background: "#86a8c4", opacity: night * 0.8 }} />
      <div style={{ position: "absolute", left: W / 2 - 60 + Math.cos(ang) * 440, top: 1080 + Math.sin(ang) * 480, width: 120, height: 120, borderRadius: 99, background: "#ffd65a" }} />
      <div style={{ position: "absolute", left: W / 2 - 45 - Math.cos(ang) * 440, top: 1095 - Math.sin(ang) * 480, width: 90, height: 90, borderRadius: 99, background: "#f4f6ff" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1280, bottom: 0, background: "#78b95f" }} />
      <div style={{ position: "absolute", left: 185, top: 730 }}>
        <Box w={640} h={580} label="SWING SET" sub="SOME ASSEMBLY REQUIRED" icon={ICONS.swing} />
      </div>
      <svg width={W} height={400} style={{ position: "absolute", top: 1000, overflow: "visible" }}>
        {blades.map((b, i) => {
          const tall = b.h * (0.4 + grow * 2.6);
          const sway = Math.sin(frame / 7 + i) * 8;
          return <path key={i} d={`M${b.x - 9} 400 Q${b.x + b.lean * 0.3} ${400 - tall * 0.6} ${b.x + b.lean * (1 + grow) + sway} ${400 - tall} Q${b.x + 8 + b.lean * 0.3} ${400 - tall * 0.5} ${b.x + 9} 400 Z`} fill={b.c} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1396, bottom: 0, background: "#3f8542" }} />
      <Days from={365} to={540} at={4} over={56} />
    </Punch>
  );
}

export function Drill() {
  const frame = useCurrentFrame();
  const down = inScene("drill", CUES.drillDown);
  const shake = frame < down ? 1 : 0;
  const fall = interpolate(frame, [down, down + 14], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  return (
    <AbsoluteFill style={{ background: T.peach }}>
      <Punch by={0.12}>
        <div style={{ position: "absolute", left: 130, top: 660, transform: `translate(${shake * Math.sin(frame * 2.7) * 12}px, ${shake * Math.cos(frame * 3.3) * 10 + fall * 1500}px) rotate(${-14 + fall * 60}deg)` }}>
          <svg width="820" height="760" viewBox="0 0 820 760" style={{ overflow: "visible" }}>
            <path d="M0 174 L30 160 H150 V188 H30 Z" fill="#dfe7ea" />
            {[40, 66, 92, 118].map((x, i) => <path key={x} d={`M${30 + ((x + frame * 9 + i) % 112)} 160 l14 28`} stroke="#5f727d" strokeWidth="6" />)}
            <path d="M150 138 L230 112 V236 L150 210 Z" fill="#3a4f5c" />
            <rect x="226" y="80" width="420" height="188" rx="46" fill={T.navy} />
            <rect x="226" y="140" width="420" height="30" fill={T.deep} />
            {[480, 520, 560, 600].map((x) => <rect key={x} x={x} y="98" width="16" height="32" rx="8" fill={T.deep} />)}
            <path d="M440 262 H600 L650 560 H500 Z" fill={T.navy} />
            <path d="M432 276 q-30 34 12 72 l26 -8 l-8 -70 Z" fill={T.white} />
            <rect x="452" y="548" width="270" height="130" rx="26" fill={T.deep} />
            <rect x="482" y="600" width="120" height="26" rx="13" fill={T.white} opacity="0.85" />
          </svg>
        </div>
      </Punch>
    </AbsoluteFill>
  );
}

export function Ask() {
  const frame = useCurrentFrame();
  const swing = Math.sin(frame / 9) * 60;
  const pile = pop(frame, 0, FPS);
  return (
    <AbsoluteFill style={{ background: "#1b2932" }}>
      <Punch>
        <AbsoluteFill style={{ background: `radial-gradient(760px 900px at ${540 + swing}px 1080px, #7d7159, #2a3640 62%, #1b2932)` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1365, bottom: 0, background: "rgba(10,18,24,.55)" }} />
        <svg width={W} height={760} style={{ position: "absolute", overflow: "visible" }}>
          <g transform={`rotate(${-swing / 14} 540 0)`}>
            <path d="M540 0 V500" stroke="#0d171d" strokeWidth="9" opacity={0.6} />
            <path d="M510 490 h60 l26 52 h-112 Z" fill="#0d171d" />
            <circle cx="540" cy="552" r="27" fill="#ffe9a8" />
          </g>
        </svg>
        <div style={{ transform: `translateY(${(1 - pile) * 80}px)` }}>
          <div style={{ position: "absolute", left: 275, top: 640 }}><Box w={440} h={300} label="SWING SET" sub="" icon={<g transform="scale(.62)">{ICONS.swing}</g>} /></div>
          <div style={{ position: "absolute", left: 530, top: 1010 }}><Box w={430} h={320} label="BED FRAME" sub="" icon={<g transform="scale(.65)">{ICONS.bed}</g>} /></div>
          <div style={{ position: "absolute", left: 50, top: 1010 }}><Box w={430} h={320} label="65-INCH TV" sub="" icon={<g transform="scale(.65)">{ICONS.tv}</g>} /></div>
        </div>
      </Punch>
    </AbsoluteFill>
  );
}

