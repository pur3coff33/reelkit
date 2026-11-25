// EP 08's composition: the series reel, plus a flash-to-bang counter: the seconds between a flash and its thunder,
// and how far away that puts the strike.
import { FONT, WhatIfReel, type Episode } from "../../src/kit/whatif/Reel";
import { lightningFrame, lightningGrade } from "./sim";
import { HOOK, QUESTION, SECONDS, SHOTS, SLAMS, STAMPS, WORDS, countAt } from "./timeline";

const VIOLET = "#c3a6ff", RED = "#ff4b3e";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function FlashBang({ t }: { t: number }) {
  const a = clamp01((t - SHOTS.flash.from) / 0.3) * clamp01((SHOTS.tree.to - t) / 0.3);
  const c = countAt(t);
  if (a <= 0 || !c) return null;
  const km = c.gap / 3;
  const close = c.gap < 5;
  return (
    <div style={{ position: "absolute", left: 40, top: 330, opacity: a, fontFamily: FONT, background: "rgba(5,8,12,0.66)", borderLeft: `4px solid ${close ? RED : VIOLET}`, padding: "4px 14px 6px" }}>
      <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2.5, color: "#cfd6dc" }}>FLASH → THUNDER</div>
      <div style={{ fontWeight: 800, fontSize: 64, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{c.n} S</div>
      <div style={{ fontWeight: 800, fontSize: 40, color: c.heard ? (close ? RED : VIOLET) : "rgba(255,255,255,0.25)", lineHeight: 1.1 }}>≈ {km < 1 ? km.toFixed(1) : Math.round(km * 10) / 10} KM AWAY</div>
    </div>
  );
}

export const LIGHTNING_EP: Episode = {
  number: 8,
  seconds: SECONDS,
  accent: VIOLET,
  hook: HOOK,
  frameAt: lightningFrame,
  gradeAt: lightningGrade,
  words: WORDS,
  slams: SLAMS,
  stamps: STAMPS,
  question: QUESTION,
  overlay: ({ t }) => <FlashBang t={t} />,
};

export function LightningReel({ step = 1 }: { step?: number }) {
  return <WhatIfReel ep={LIGHTNING_EP} step={step} />;
}
