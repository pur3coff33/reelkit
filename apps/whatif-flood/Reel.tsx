// EP 04's composition: the series reel, plus its own HUD: the river's rise over normal at the camp, and how far off the
// flood front is until it arrives.
import { FONT, WhatIfReel, type Episode } from "../../src/kit/whatif/Reel";
import { floodFrame, floodGrade } from "./sim";
import { ARRIVE, HOOK, QUESTION, SECONDS, SHOTS, SLAMS, STAMPS, WORDS, campLevel, frontKm } from "./timeline";

const CYAN = "#4fd1ff", RED = "#ff4b3e";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function Box({ label, value, tone, edge, top, a }: { label: string; value: string; tone: string; edge: string; top: number; a: number }) {
  return (
    <div style={{ position: "absolute", left: 40, top, opacity: a, fontFamily: FONT, background: "rgba(5,8,12,0.66)", borderLeft: `4px solid ${edge}`, padding: "4px 14px 6px" }}>
      <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2.5, color: "#cfd6dc" }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 60, color: tone, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Hud({ t }: { t: number }) {
  const a = clamp01((t - SHOTS.camp.from) / 0.3) * clamp01((SHOTS.rescue.from - 0.1 - t) / 0.3);
  if (a <= 0) return null;
  const lv = campLevel(t);
  const high = lv > 1;
  const km = frontKm(t);
  const showFront = t >= SHOTS.gorge.from && t < ARRIVE + 1.6;
  return (
    <>
      <Box label="RIVER LEVEL · ABOVE NORMAL" value={`+${lv.toFixed(1)} M`} tone={high ? RED : "#fff"} edge={high ? RED : CYAN} top={330} a={a} />
      {showFront ? <Box label="FLOOD FRONT" value={t < ARRIVE ? `${km.toFixed(1)} KM AWAY` : "HERE"} tone={t < ARRIVE ? "#fff" : RED} edge={t < ARRIVE ? CYAN : RED} top={452} a={a * clamp01((t - SHOTS.gorge.from) / 0.3)} /> : null}
    </>
  );
}

export const FLOOD_EP: Episode = {
  number: 4,
  seconds: SECONDS,
  accent: CYAN,
  hook: HOOK,
  frameAt: floodFrame,
  gradeAt: floodGrade,
  words: WORDS,
  slams: SLAMS,
  stamps: STAMPS,
  question: QUESTION,
  overlay: ({ t }) => <Hud t={t} />,
};

export function FloodReel({ step = 1 }: { step?: number }) {
  return <WhatIfReel ep={FLOOD_EP} step={step} />;
}
