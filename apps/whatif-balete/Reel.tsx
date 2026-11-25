// EP 05's composition: the series reel, plus a heart-rate monitor that climbs as the night gets worse.
import { FONT, WhatIfReel, type Episode } from "../../src/kit/whatif/Reel";
import { baleteFrame, baleteGrade } from "./sim";
import { HOOK, QUESTION, SECONDS, SHOTS, SLAMS, STAMPS, WORDS, bpmAt } from "./timeline";

const EMBER = "#ff6a2a", RED = "#ff4b3e";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function Heart({ t }: { t: number }) {
  const a = clamp01((t - SHOTS.fire.from) / 0.3) * clamp01((SHOTS.dawn.to - t) / 0.3);
  if (a <= 0) return null;
  const bpm = bpmAt(t);
  // The heart beats at the rate it shows.
  const phase = (t * bpm) / 60 % 1;
  const beat = 1 + 0.22 * Math.exp(-phase * 9);
  const hot = bpm > 140;
  return (
    <div style={{ position: "absolute", left: 40, top: 330, opacity: a, fontFamily: FONT, background: "rgba(5,8,12,0.66)", borderLeft: `4px solid ${hot ? RED : EMBER}`, padding: "4px 14px 6px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontSize: 48, color: hot ? RED : EMBER, transform: `scale(${beat})`, lineHeight: 1 }}>{"♥"}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2.5, color: "#cfd6dc" }}>HEART RATE</div>
        <div style={{ fontWeight: 800, fontSize: 60, color: hot ? RED : "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{bpm} BPM</div>
      </div>
    </div>
  );
}

export const BALETE_EP: Episode = {
  number: 5,
  seconds: SECONDS,
  accent: EMBER,
  hook: HOOK,
  frameAt: baleteFrame,
  gradeAt: baleteGrade,
  words: WORDS,
  slams: SLAMS,
  stamps: STAMPS,
  question: QUESTION,
  overlay: ({ t }) => <Heart t={t} />,
};

export function BaleteReel({ step = 1 }: { step?: number }) {
  return <WhatIfReel ep={BALETE_EP} step={step} />;
}
