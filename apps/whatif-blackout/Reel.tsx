// EP 02's composition: the series reel, plus its own graphics: the grid's load falling to zero as the dark sweeps in,
// and a phone's signal dying at the cell tower.
import { WhatIfReel, FONT, type Episode } from "../../src/kit/whatif/Reel";
import { blackoutFrame, blackoutGrade } from "./sim";
import { BLACKOUT, HOOK, QUESTION, SECONDS, SHOTS, SLAMS, STAMPS, WORDS, track } from "./timeline";

const AMBER = "#ffb81c", RED = "#ff4b3e";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function GridLoad({ t }: { t: number }) {
  const mw = Math.max(0, Math.round(track([[BLACKOUT, 11840], [BLACKOUT + 2.4, 0]], t) + (t < BLACKOUT ? Math.sin(t * 3) * 40 : 0)));
  const a = clamp01((t - 5.7) / 0.3) * clamp01((10.95 - t) / 0.2);
  const dead = mw === 0;
  return (
    <div style={{ position: "absolute", left: 40, top: 330, opacity: a, fontFamily: FONT, background: "rgba(5,8,12,0.66)", borderLeft: `4px solid ${dead ? RED : AMBER}`, padding: "4px 14px 6px" }}>
      <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2.5, color: "#cfd6dc" }}>GRID LOAD · SIMULATED</div>
      <div style={{ fontWeight: 800, fontSize: 64, color: dead ? RED : "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{mw.toLocaleString("en-US")} MW</div>
    </div>
  );
}

function Signal({ t }: { t: number }) {
  const s = SHOTS.tower;
  if (t < s.from || t >= s.to) return null;
  const dies = s.from + 1.7;
  const bars = t < dies ? 4 : t < dies + 0.5 ? 1 : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 440, display: "flex", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, background: "rgba(5,8,12,0.72)", padding: "16px 26px", borderRadius: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 64 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 16, height: 16 + i * 16, background: i < bars ? "#fff" : "rgba(255,255,255,0.22)", borderRadius: 3 }} />
          ))}
        </div>
        <div style={{ fontWeight: 800, fontSize: 60, lineHeight: 1, color: bars ? "#fff" : RED }}>{bars ? "LTE" : "NO SERVICE"}</div>
      </div>
    </div>
  );
}

export const BLACKOUT_EP: Episode = {
  number: 2,
  seconds: SECONDS,
  accent: AMBER,
  hook: HOOK,
  frameAt: blackoutFrame,
  gradeAt: blackoutGrade,
  words: WORDS,
  slams: SLAMS,
  stamps: STAMPS,
  question: QUESTION,
  overlay: ({ t }) => (
    <>
      {t < 11 ? <GridLoad t={t} /> : null}
      <Signal t={t} />
    </>
  ),
};

export function BlackoutReel({ step = 1 }: { step?: number }) {
  return <WhatIfReel ep={BLACKOUT_EP} step={step} />;
}
