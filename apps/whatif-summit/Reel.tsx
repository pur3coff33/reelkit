// EP 06's composition: the series reel, plus a weather panel: wind, air temperature, and what it feels like with the
// wind chill once it's cold and windy enough.
import { FONT, WhatIfReel, type Episode } from "../../src/kit/whatif/Reel";
import { summitFrame, summitGrade } from "./sim";
import { HOOK, QUESTION, SECONDS, SHOTS, SLAMS, STAMPS, WORDS, feelsLike, tempAt, windAt } from "./timeline";

const YELLOW = "#ffd400", RED = "#ff4b3e", ICE = "#9fe0ff";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2.5, color: "#cfd6dc", width: 140 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 52, color: tone, fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>{value}</div>
    </div>
  );
}

function Weather({ t }: { t: number }) {
  const a = clamp01((t - SHOTS.alert.from) / 0.3) * clamp01((SHOTS.final.from - t) / 0.3);
  if (a <= 0) return null;
  const w = Math.round(windAt(t)), T = Math.round(tempAt(t)), f = Math.round(feelsLike(t));
  const strong = w >= 89;
  const chill = f < T - 1;
  return (
    <div style={{ position: "absolute", left: 40, top: 330, opacity: a, fontFamily: FONT, background: "rgba(5,8,12,0.66)", borderLeft: `4px solid ${strong ? RED : YELLOW}`, padding: "6px 16px 8px" }}>
      <Row label="WIND" value={`${w} KM/H`} tone={strong ? RED : "#fff"} />
      <Row label="AIR" value={`${T}°C`} tone="#fff" />
      {chill ? <Row label="FEELS LIKE" value={`${f}°C`} tone={f <= 0 ? ICE : "#fff"} /> : null}
    </div>
  );
}

export const SUMMIT_EP: Episode = {
  number: 6,
  seconds: SECONDS,
  accent: YELLOW,
  hook: HOOK,
  frameAt: summitFrame,
  gradeAt: summitGrade,
  words: WORDS,
  slams: SLAMS,
  stamps: STAMPS,
  question: QUESTION,
  overlay: ({ t }) => <Weather t={t} />,
};

export function SummitReel({ step = 1 }: { step?: number }) {
  return <WhatIfReel ep={SUMMIT_EP} step={step} />;
}
