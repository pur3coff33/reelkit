// EP 01's composition: the series reel, plus its own graphics: scan tags on the workers in the hook, a bulletin bar that
// says plainly it's simulated, the share of jobs automated, the kiosk's chatbot, and signs pinned to the world.
import type { Projector, V3 } from "../../src/kit/lowpoly/engine";
import { FONT, WhatIfReel, type Episode } from "../../src/kit/whatif/Reel";
import { FEATURED, FEATURED_WALKERS, JOB_SIGN, SHOP_SIGN, aiFrame, aiGrade, riderPos } from "./sim";
import { AUTOMATED, BULLETIN, HOOK, QUESTION, SECONDS, SHOTS, SLAMS, STAMPS, WORDS } from "./timeline";

const CYAN = "#5ef0ff", RED = "#ff4b3e";
const SHADOW = "0 2px 4px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.65)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const track = (keys: [number, number][], t: number) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return keys[i - 1][1] + ((keys[i][1] - keys[i - 1][1]) * (t - keys[i - 1][0])) / (keys[i][0] - keys[i - 1][0]);
  return keys[keys.length - 1][1];
};

/** A box round a person with what the machine thinks of them. */
function Tag({ proj, p, label, pct, t, at }: { proj: Projector; p: V3; label: string; pct: number; t: number; at: number }) {
  const q = proj([p[0], 1.0, p[2]]);
  if (!q.visible || t < at) return null;
  const k = clamp01((t - at) / 0.25);
  const size = Math.max(40, Math.min(150, (2.2 / q.z) * proj.focal));
  const n = Math.round(pct * clamp01((t - at) / 0.6));
  const left = q.x > 760;
  return (
    <div style={{ position: "absolute", left: q.x - size / 2, top: q.y - size * 0.8, width: size, height: size * 1.4, border: `3px solid ${CYAN}`, opacity: k, boxShadow: `0 0 14px ${CYAN}` }}>
      <div style={{ position: "absolute", [left ? "right" : "left"]: size + 10, top: 0, whiteSpace: "nowrap", fontFamily: FONT, background: "rgba(3,12,16,0.82)", borderLeft: `4px solid ${CYAN}`, padding: "2px 10px 4px" }}>
        <div style={{ fontWeight: 700, fontSize: 26, letterSpacing: 2, color: "#cfefff" }}>{label}</div>
        <div style={{ fontWeight: 800, fontSize: 36, color: n > 80 ? RED : CYAN, lineHeight: 1 }}>{n}% AUTOMATABLE</div>
      </div>
    </div>
  );
}

function Bulletin({ t }: { t: number }) {
  if (t < BULLETIN.at || t >= BULLETIN.to) return null;
  const k = clamp01((t - BULLETIN.at) / 0.25) * clamp01((BULLETIN.to - t) / 0.2);
  const scroll = (t - BULLETIN.at) * 120;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1150, fontFamily: FONT, opacity: k, transform: `translateX(${(1 - k) * -80}px)` }}>
      <div style={{ display: "inline-block", marginLeft: 40, background: RED, color: "#fff", fontWeight: 800, fontSize: 40, letterSpacing: 3, padding: "4px 18px" }}>{BULLETIN.label}</div>
      <div style={{ marginTop: 6, background: "rgba(5,8,12,0.88)", borderTop: `3px solid ${RED}`, borderBottom: `3px solid ${RED}`, padding: "16px 40px", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div style={{ fontWeight: 800, fontSize: 70, lineHeight: 1, color: "#fff", transform: `translateX(${Math.max(0, 24 - scroll * 0.4)}px)` }}>{BULLETIN.text}</div>
      </div>
      <div style={{ marginLeft: 40, marginTop: 8, fontWeight: 700, fontSize: 30, letterSpacing: 2, color: "#ffd0cc", textShadow: SHADOW }}>A WHAT IF? SCENARIO · NOT A REAL NEWS REPORT</div>
    </div>
  );
}

function Counter({ t }: { t: number }) {
  if (t < 8 || t >= 50) return null;
  const v = Math.round(track(AUTOMATED, t));
  const a = clamp01((t - 8) / 0.3) * clamp01((50 - t) / 0.3);
  return (
    <div style={{ position: "absolute", left: 40, top: 330, opacity: a, fontFamily: FONT, background: "rgba(3,12,16,0.7)", borderLeft: `4px solid ${CYAN}`, padding: "4px 14px 6px", minWidth: 290 }}>
      <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: 2.5, color: "#cfefff" }}>JOBS AUTOMATED · SIMULATED</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 64, color: v > 70 ? RED : "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{v}%</div>
        <div style={{ flex: 1, height: 12, background: "rgba(255,255,255,0.18)" }}>
          <div style={{ width: `${v}%`, height: "100%", background: v > 70 ? RED : CYAN }} />
        </div>
      </div>
    </div>
  );
}

function Chat({ t }: { t: number }) {
  const s = SHOTS.kitchen;
  if (t < s.from + 0.4 || t >= s.to) return null;
  const lines = ["Hi! I'm your AI assistant.", "Your order is ready in 90 seconds.", "Anything else I can do?"];
  const shown = Math.min(lines.length, 1 + Math.floor((t - s.from - 0.4) / 0.85));
  return (
    <div style={{ position: "absolute", left: 60, top: 470, display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      {lines.slice(0, shown).map((l, i) => (
        <div key={i} style={{ alignSelf: "flex-start", background: "rgba(235,252,255,0.95)", color: "#06232a", fontWeight: 700, fontSize: 44, padding: "10px 22px", borderRadius: "22px 22px 22px 4px", boxShadow: `0 0 24px rgba(94,240,255,0.5)` }}>
          {l}
        </div>
      ))}
    </div>
  );
}

/** A sign hung on a point in the world. */
function Sign({ proj, p, text, sub, tone, appear }: { proj: Projector; p: V3; text: string; sub?: string; tone: string; appear: number }) {
  const q = proj(p);
  if (!q.visible) return null;
  const s = Math.max(0.9, Math.min(1.4, (14 / q.z)));
  return (
    <div style={{ position: "absolute", left: q.x, top: q.y, transform: `translate(-50%,-50%) scale(${s})`, opacity: appear, fontFamily: FONT, textAlign: "center", background: "rgba(5,8,12,0.85)", border: `3px solid ${tone}`, padding: "6px 20px 8px", whiteSpace: "nowrap" }}>
      <div style={{ fontWeight: 800, fontSize: 56, color: tone, lineHeight: 1 }}>{text}</div>
      {sub ? <div style={{ fontWeight: 700, fontSize: 32, color: "#fff", letterSpacing: 2 }}>{sub}</div> : null}
    </div>
  );
}

export const AI_EP: Episode = {
  number: 1,
  seconds: SECONDS,
  accent: CYAN,
  hook: HOOK,
  frameAt: aiFrame,
  gradeAt: aiGrade,
  words: WORDS,
  slams: SLAMS,
  stamps: STAMPS,
  question: QUESTION,
  overlay: ({ t, proj }) => (
    <>
      {t < SHOTS.city.to ? (
        <>
          {FEATURED.map((f, i) => <Tag key={i} proj={proj} p={riderPos(f, t)} label={f.label} pct={f.pct} t={t} at={1.2 + i * 0.5} />)}
          {FEATURED_WALKERS.map((w, i) => <Tag key={`w${i}`} proj={proj} p={[w.p[0], 0, w.p[2] - t * 1.2]} label={w.label} pct={w.pct} t={t} at={2.0 + i * 0.5} />)}
        </>
      ) : null}
      <Bulletin t={t} />
      <Counter t={t} />
      <Chat t={t} />
      {t >= SHOTS.queue.from && t < SHOTS.queue.to ? <Sign proj={proj} p={JOB_SIGN} text="JOB FAIR" sub="2 OPENINGS" tone="#ffd34a" appear={clamp01((t - SHOTS.queue.from - 0.3) / 0.3)} /> : null}
      {t >= SHOTS.shop.from && t < SHOTS.shop.to ? <Sign proj={proj} p={SHOP_SIGN} text="OPEN 24/7" sub="STAFF: 0" tone={CYAN} appear={clamp01((t - SHOTS.shop.from - 0.2) / 0.3)} /> : null}
    </>
  ),
};

export function AiReel({ step = 1 }: { step?: number }) {
  return <WhatIfReel ep={AI_EP} step={step} />;
}
