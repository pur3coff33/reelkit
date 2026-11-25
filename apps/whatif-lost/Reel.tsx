// EP 07's composition: the series reel, plus her phone's status (battery, no signal) and the air temperature.
import { FONT, WhatIfReel, type Episode } from "../../src/kit/whatif/Reel";
import { lostFrame, lostGrade } from "./sim";
import { HOOK, QUESTION, SECONDS, SHOTS, SLAMS, STAMPS, WORDS, batteryAt, tempAt } from "./timeline";

const GREEN = "#7dff8a", RED = "#ff4b3e";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function Phone({ t }: { t: number }) {
  const a = clamp01((t - SHOTS.phone.from) / 0.3) * clamp01((SHOTS.found.to - t) / 0.3);
  if (a <= 0) return null;
  const b = batteryAt(t);
  const low = b !== null && b <= 15;
  return (
    <div style={{ position: "absolute", left: 40, top: 330, opacity: a, fontFamily: FONT, background: "rgba(5,8,12,0.66)", borderLeft: `4px solid ${b === null ? "#8a9098" : low ? RED : GREEN}`, padding: "6px 16px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: 64, height: 30, border: "3px solid #fff", borderRadius: 5 }}>
          <div style={{ position: "absolute", left: 3, top: 3, bottom: 3, width: `${Math.max(4, ((b ?? 0) / 100) * 52)}px`, background: b === null ? "transparent" : low ? RED : GREEN, borderRadius: 2 }} />
          <div style={{ position: "absolute", right: -9, top: 8, width: 5, height: 10, background: "#fff", borderRadius: 1 }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 56, color: b === null ? "#8a9098" : low ? RED : "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{b === null ? "OFF" : `${b}%`}</div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: 2.5, color: RED, marginTop: 6 }}>NO SIGNAL</div>
      <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2.5, color: "#cfd6dc", marginTop: 2 }}>AIR <span style={{ color: "#fff", fontWeight: 800, fontSize: 34 }}>{tempAt(t)}°C</span></div>
    </div>
  );
}

export const LOST_EP: Episode = {
  number: 7,
  seconds: SECONDS,
  accent: GREEN,
  hook: HOOK,
  frameAt: lostFrame,
  gradeAt: lostGrade,
  words: WORDS,
  slams: SLAMS,
  stamps: STAMPS,
  question: QUESTION,
  overlay: ({ t }) => <Phone t={t} />,
};

export function LostReel({ step = 1 }: { step?: number }) {
  return <WhatIfReel ep={LOST_EP} step={step} />;
}
