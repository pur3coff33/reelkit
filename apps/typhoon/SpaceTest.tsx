// A 15-second test of the new storm look: the whole Earth, then the storm laid over the real coastlines to show its
// size, then down into the eye. Silent, and separate from the main reel, to judge the picture on its own.
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { projector, type V3 } from "../../src/kit/lowpoly/engine";
import { SimCanvas } from "../../src/kit/lowpoly/SimCanvas";
import { smooth } from "../../src/kit/lowpoly/world";
import { EARTH_R, EYE_R, G, STORM_R, spaceFrame } from "./earth";
import { COASTS } from "./geo";
import { loadBarlow } from "./Reel";

const FONT = "Barlow Condensed";
const AMBER = "#ffb81c";
const SHADOW = "0 2px 4px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.7)";

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

function shotAt(t: number) {
  // 0–5 s: from far out, closing on the storm. 5–9.5 s: over it, the coast showing through. 9.5–15 s: down into the eye.
  const top = EARTH_R;
  const far: V3 = [300, top + 1050, 900], over: V3 = [0, top + 290, 92];
  const inEye: V3 = [-EYE_R * 0.34, top + 2.5, EYE_R * 0.24];
  if (t < 5) {
    const k = smooth(0, 5, t);
    return { pos: mix3(far, over, k * k), target: mix3([0, top - 90, 120], [0, top, 2], k), fov: lerp(36, 42, k), t };
  }
  if (t < 9.5) {
    const k = smooth(5, 9.5, t);
    return { pos: mix3(over, [0, top + 245, 78], k), target: [0, top, 2] as V3, fov: 42, t };
  }
  const k = smooth(9.5, 14.6, t);
  const eased = 1 - (1 - k) ** 3;
  const pos = mix3([0, top + 245, 78], inEye, eased);
  // The camera tips up from looking straight down to looking across the eye at its far wall.
  const look = smooth(0.42, 1, k);
  const target = mix3([0, top, 2], [EYE_R * 0.74, top + 2.05, -EYE_R * 0.52], look);
  return { pos, target, fov: lerp(42, 92, smooth(0.35, 1, k)), t };
}

const LABELS: [string, number, number][] = [["SAMAR", 125.0, 11.9], ["LEYTE", 124.75, 10.75], ["CEBU", 123.75, 10.3], ["MANILA", 120.98, 14.6], ["MINDANAO", 125.2, 8.2]];

export function SpaceTest() {
  loadBarlow();
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const shot = useMemo(() => shotAt(t), [t]);
  const frame = useMemo(() => spaceFrame(shot), [shot]);
  const proj = projector(frame.camera, width, height);
  const reveal = smooth(5.2, 6.4, t) * (1 - smooth(8.9, 9.7, t));
  const lines = reveal > 0.01 ? COASTS.map((ring) => {
    const pts = [...ring, ring[0]].map(([lon, lat]) => proj(G(lon, lat, 8)));
    return pts.every((p) => p.visible) ? pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") : "";
  }) : [];
  const a = proj([-STORM_R, EARTH_R + 8, 0]), b = proj([STORM_R, EARTH_R + 8, 0]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <SimCanvas frame={frame} width={width} height={height} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: reveal }}>
        {lines.map((l, i) => (l ? <polyline key={i} points={l} fill="none" stroke={AMBER} strokeWidth={3.5} strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.8))" }} /> : null))}
        <line x1={a.x} y1={1300} x2={b.x} y2={1300} stroke="#fff" strokeWidth={5} />
        <line x1={a.x} y1={1282} x2={a.x} y2={1318} stroke="#fff" strokeWidth={5} />
        <line x1={b.x} y1={1282} x2={b.x} y2={1318} stroke="#fff" strokeWidth={5} />
      </svg>
      {reveal > 0.01 ? (
        <>
          {LABELS.map(([name, lon, lat]) => {
            const p = proj(G(lon, lat, 8));
            return (
              <div key={name} style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 34, color: AMBER, opacity: reveal, textShadow: SHADOW }}>{name}</div>
            );
          })}
          <div style={{ position: "absolute", left: 0, right: 0, top: 1320, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 92, color: "#fff", opacity: reveal, textShadow: SHADOW }}>1,000 KM ACROSS</div>
        </>
      ) : null}
      <div style={{ position: "absolute", left: 40, top: 256, fontFamily: FONT, fontWeight: 700, fontSize: 32, letterSpacing: 2, color: "#fff", background: "rgba(5,10,20,0.72)", border: `2px solid ${AMBER}`, padding: "2px 14px 3px" }}>FICTIONAL DISASTER SIMULATION</div>
    </AbsoluteFill>
  );
}
