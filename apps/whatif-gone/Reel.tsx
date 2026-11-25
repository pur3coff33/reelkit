// EP 03's composition: the series reel, plus a world-population counter that ticks along and then drops to zero.
import { FONT, WhatIfReel, type Episode } from "../../src/kit/whatif/Reel";
import { goneFrame, goneGrade } from "./sim";
import { HOOK, QUESTION, SECONDS, SLAMS, STAMPS, VANISH, WORDS } from "./timeline";

const GREEN = "#8be06b", RED = "#ff4b3e";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function Population({ t }: { t: number }) {
  const a = clamp01((t - 0.3) / 0.3) * clamp01((7.9 - t) / 0.3);
  if (a <= 0) return null;
  const base = 8_142_000_000 + Math.floor(t * 4.3);
  const drop = clamp01((t - VANISH) / 0.5);
  const n = Math.round(base * (1 - drop * drop * (3 - 2 * drop)));
  const zero = n === 0;
  return (
    <div style={{ position: "absolute", left: 40, top: 330, opacity: a, fontFamily: FONT, background: "rgba(5,8,12,0.66)", borderLeft: `4px solid ${zero ? RED : GREEN}`, padding: "4px 14px 6px" }}>
      <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2.5, color: "#cfd6dc" }}>WORLD POPULATION</div>
      <div style={{ fontWeight: 800, fontSize: 60, color: zero ? RED : "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{n.toLocaleString("en-US")}</div>
    </div>
  );
}

export const GONE_EP: Episode = {
  number: 3,
  seconds: SECONDS,
  accent: GREEN,
  hook: HOOK,
  frameAt: goneFrame,
  gradeAt: goneGrade,
  words: WORDS,
  slams: SLAMS,
  stamps: STAMPS,
  question: QUESTION,
  overlay: ({ t }) => <Population t={t} />,
};

export function GoneReel({ step = 1 }: { step?: number }) {
  return <WhatIfReel ep={GONE_EP} step={step} />;
}
