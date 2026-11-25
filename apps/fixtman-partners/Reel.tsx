// FixtMan's ad for brands and retailers. The product a customer loved arrives as a box of parts and goes back; then FixtMan at
// the checkout, the three ways to plug in (the real partner page), matching and tracking, and why it pays.
import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ease, pop, slam } from "../../src/kit/remotion/motion";
import { AdReel, Brand, CaptionBand, Checklist, DARK, EndCard, LIGHT, ORANGE, Phone, PHONE, PhotoWords, Stamp, Tick, timing, zoom, type AdData, type Ground } from "../fixtman/ad";
import { clamp, FONT, FPS, HousePhoto, HouseWipe, job, Punch, T, W } from "../fixtman/look";
import { Box, ICONS } from "../fixtman/undone";
import { config } from "./reel.config";
import { CUES, KINDS, SCENES } from "./timeline";

type Name = keyof typeof SCENES;
const { inScene, lengthOf } = timing<Name>(SCENES);
const RED = "#c92a2a";
const GYM = <path d="M-150 100 V-90 H150 V100 M-150 -60 H150 M-60 -60 V60 H60 V-60 M-110 100 H-40 M40 100 H110" />;

/** A star row, `n` of five lit. */
function Stars({ n, size, at }: { n: number; size: number; at: number }) {
  const frame = useCurrentFrame();
  const d = "M50 4 L63 37 L98 39 L71 62 L80 96 L50 77 L20 96 L29 62 L2 39 L37 37 Z";
  return (
    <div style={{ display: "flex", gap: size * 0.12 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const s = pop(frame, at + i * 3, FPS);
        return <svg key={i} width={size} height={size} viewBox="0 0 100 100" style={{ transform: `scale(${s})` }}><path d={d} fill={i < n ? "#f0a500" : "#d9dee1"} stroke={i < n ? "#f0a500" : "#d9dee1"} strokeWidth="6" strokeLinejoin="round" /></svg>;
      })}
    </div>
  );
}

// ── The box that came back ───────────────────────────────────────────────────────────────────────────

function Loved() {
  const frame = useCurrentFrame();
  const heart = inScene("loved", CUES.heart), box = inScene("loved", CUES.box);
  const h = pop(frame, heart, FPS);
  const drop = interpolate(frame, [box - 6, box], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const thud = frame >= box ? interpolate(frame, [box, box + 4, box + 10], [0, 1, 0], clamp) : 0;
  return (
    <AbsoluteFill style={{ background: "#e9eef0", transform: `translateY(${thud * 14}px)` }}>
      <div style={{ position: "absolute", left: 110, top: 520, width: 860, borderRadius: 50, background: T.white, boxShadow: "0 30px 50px rgba(31,59,75,.16)", overflow: "hidden", fontFamily: FONT }}>
        <div style={{ height: 90, background: T.navy, color: T.white, display: "flex", alignItems: "center", padding: "0 40px", fontWeight: 900, fontSize: 38, letterSpacing: "0.12em" }}>YOUR STORE</div>
        <div style={{ position: "relative", height: 600, display: "grid", placeItems: "center", background: "#f6f3ee" }}>
          <HousePhoto src={job("fitness-8")} width={520} height={500} />
          {frame >= heart && (
            <svg width="150" height="140" viewBox="0 0 100 92" style={{ position: "absolute", right: 46, top: 36, transform: `scale(${interpolate(h, [0, 1], [2.2, 1])})` }}>
              <path d="M50 88 C10 60 0 38 0 24 C0 8 14 0 26 0 C38 0 46 8 50 16 C54 8 62 0 74 0 C86 0 100 8 100 24 C100 38 90 60 50 88 Z" fill={RED} />
            </svg>
          )}
        </div>
        <div style={{ padding: "34px 44px 44px", color: T.navy }}>
          <div style={{ fontWeight: 900, fontSize: 64, letterSpacing: "-0.03em" }}>Home gym</div>
          <div style={{ marginTop: 24, padding: "24px 0", borderRadius: 24, background: T.orange, color: T.white, textAlign: "center", fontWeight: 900, fontSize: 46 }}>Add to cart</div>
        </div>
      </div>
      {frame >= box - 6 && (
        <div style={{ position: "absolute", left: 140, top: 560 - (1 - drop) * 1500 }}>
          <Box w={730} h={680} label="HOME GYM" sub="148 PARTS INSIDE" icon={GYM} />
        </div>
      )}
    </AbsoluteFill>
  );
}

const PART_BITS = Array.from({ length: 26 }, (_, i) => ({ x: (i * 397) % 980, y: 1060 + ((i * 211) % 420), r: (i * 47) % 180, kind: i % 4 }));
function Parts() {
  const frame = useCurrentFrame();
  const burst = inScene("parts", CUES.burst), star = inScene("parts", CUES.oneStar);
  return (
    <AbsoluteFill style={{ background: "#d3dfe3" }}>
      <Punch>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1040, bottom: 0, background: "#93a7b0" }} />
        {PART_BITS.map((p, i) => {
          const k = ease(frame, burst + (i % 6), burst + 12 + (i % 6));
          const x = 540 + (p.x - 540) * k, y = 1100 + (p.y - 1100) * k - Math.sin(k * Math.PI) * 220;
          const shape = [
            <div style={{ width: 300, height: 40, borderRadius: 8, background: "#c99b6a" }} />,
            <div style={{ width: 34, height: 34, borderRadius: 99, border: "9px solid #6f7f88" }} />,
            <div style={{ width: 70, height: 16, borderRadius: 4, background: "#5f6f78" }} />,
            <div style={{ width: 160, height: 26, borderRadius: 6, background: "#2f3e47" }} />,
          ][p.kind];
          return <div key={i} style={{ position: "absolute", left: x, top: y, transform: `rotate(${p.r * k}deg)` }}>{shape}</div>;
        })}
        <div style={{ position: "absolute", left: 140, top: 640, transform: `scale(${1 - ease(frame, burst, burst + 6) * 0.15})`, transformOrigin: "50% 100%" }}>
          <Box w={730} h={400} label="HOME GYM" sub="OPENED" icon={<g transform="scale(.6)">{GYM}</g>} />
        </div>
        {frame >= star - 4 && (
          <div style={{ position: "absolute", left: 120, top: 1270, width: 840, borderRadius: 40, padding: "36px 44px", background: T.white, boxShadow: "0 30px 50px rgba(31,59,75,.25)", fontFamily: FONT, transform: `translateY(${(1 - pop(frame, star - 4, FPS)) * 500}px)` }}>
            <Stars n={1} size={84} at={star - 2} />
            <div style={{ marginTop: 18, fontWeight: 900, fontSize: 48, color: T.navy }}>"Impossible to put together."</div>
          </div>
        )}
      </Punch>
    </AbsoluteFill>
  );
}

function Back() {
  const frame = useCurrentFrame();
  const stamp = inScene("back", CUES.stamp);
  const leave = interpolate(frame, [stamp + 18, stamp + 34], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  return (
    <AbsoluteFill style={{ background: "#dfd2bd" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1260, bottom: 0, background: "#a67b50" }} />
      <div style={{ position: "absolute", left: 160, top: 620, transform: `translateX(${leave * 1300}px) rotate(${leave * 8}deg)` }}>
        <Box w={700} h={620} label="HOME GYM" sub="148 PARTS INSIDE" icon={GYM} />
        {frame >= stamp && (
          <div style={{ position: "absolute", left: 90, top: 260, padding: "18px 40px", border: `14px solid ${RED}`, borderRadius: 20, color: RED, fontFamily: FONT, fontWeight: 900, fontSize: 130, letterSpacing: "0.04em", transform: `scale(${interpolate(slam(frame, stamp, FPS), [0, 1], [2.4, 1])}) rotate(-12deg)`, background: "rgba(255,240,230,.6)" }}>RETURN</div>
        )}
      </div>
    </AbsoluteFill>
  );
}

function Sell() {
  const frame = useCurrentFrame();
  const s = slam(frame, 0, FPS);
  return (
    <AbsoluteFill style={{ background: T.peach }}>
      <div style={{ position: "absolute", left: 290, top: 640, transform: `scale(${interpolate(s, [0, 1], [0.4, 1])}) rotate(${(1 - s) * -20}deg)` }}>
        <svg width="500" height="580" viewBox="0 0 500 580">
          <path d="M150 170 V120 Q150 40 250 40 Q350 40 350 120 V170" fill="none" stroke={T.deep} strokeWidth="34" strokeLinecap="round" />
          <path d="M40 150 H460 L430 560 H70 Z" fill={T.white} />
          <path d="M175 340 L230 395 L330 280" fill="none" stroke={T.orange} strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  );
}

// ── FixtMan at the checkout ──────────────────────────────────────────────────────────────────────────

function Checkout() {
  const frame = useCurrentFrame();
  const added = inScene("checkout", CUES.added);
  const on = frame >= added;
  const t = pop(frame, added, FPS);
  const row = (label: string, sub: string, icon: ReactNode, k: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 34, padding: "30px 40px", borderTop: k ? "3px solid #edf0f2" : "none" }}>{icon}<div><div style={{ fontWeight: 900, fontSize: 52, letterSpacing: "-0.03em" }}>{label}</div><div style={{ fontWeight: 700, fontSize: 34, color: "#63808f" }}>{sub}</div></div></div>
  );
  return (
    <HouseWipe bg={T.bg}>
      <div style={{ position: "absolute", left: 100, top: 560, width: 880, borderRadius: 50, background: T.white, boxShadow: "0 30px 50px rgba(31,59,75,.16)", overflow: "hidden", fontFamily: FONT, color: T.navy }}>
        <div style={{ padding: "34px 40px", fontWeight: 900, fontSize: 56, letterSpacing: "-0.03em", background: "#f4f7f8" }}>Checkout</div>
        {row("Home gym", "1 item", <svg width="110" height="110" viewBox="-170 -170 340 340"><g stroke={T.navy} strokeWidth="18" fill="none" strokeLinejoin="round">{GYM}</g></svg>, 0)}
        <div style={{ display: "flex", alignItems: "center", gap: 34, padding: "34px 40px", margin: "0 24px 24px", borderRadius: 34, background: on ? "#fff1ea" : "#f4f7f8", boxShadow: on ? `0 0 0 8px ${T.orange}` : "none" }}>
          <Tick on={on} t={t} size={96} off="#b4c2c8" />
          <div><div style={{ fontWeight: 900, fontSize: 52, letterSpacing: "-0.03em" }}>Add assembly</div><div style={{ fontWeight: 700, fontSize: 34, color: "#63808f" }}>by a FixtMan pro</div></div>
        </div>
      </div>
      <Stamp at={added + 10} top={1240} text="Built for them" size={96} tilt={-4} />
    </HouseWipe>
  );
}

const Kinds = () => <PhotoWords words={KINDS} from={SCENES.kinds.from} />;

const Cover = () => (
  <Checklist rows={[{ text: "Assembly", photo: "playset-3" }, { text: "Installation", photo: "app-install-1" }, { text: "Measurement", photo: "indoor-6" }]} at={CUES.cover.map((c) => inScene("cover", c))} />
);

function Ways() {
  const frame = useCurrentFrame();
  return (
    <HouseWipe bg={T.peach}>
      {["Standard", "Widget", "API"].map((name, i) => {
        const s = slam(frame, 8 + i * 6, FPS);
        return (
          <div key={name} style={{ position: "absolute", left: 140, right: 140, top: 600 + i * 270, height: 220, borderRadius: 44, background: i === 1 ? T.navy : T.white, color: i === 1 ? T.white : T.navy, display: "flex", alignItems: "center", gap: 46, padding: "0 60px", fontFamily: FONT, fontWeight: 900, fontSize: 100, letterSpacing: "-0.04em", transform: `translateX(${(1 - s) * (i % 2 ? 700 : -700)}px)`, boxShadow: "0 26px 40px rgba(80,25,0,.25)" }}>
            <span style={{ width: 120, height: 120, borderRadius: 30, background: T.orange, color: T.white, display: "grid", placeItems: "center", fontSize: 80 }}>{i + 1}</span>{name}
          </div>
        );
      })}
    </HouseWipe>
  );
}

/** The real partner page on a phone, zoomed onto the card being talked about. */
function PageShot({ clip, scene, y, children }: { clip: string; scene: Name; y: number; children?: ReactNode }) {
  const frame = useCurrentFrame();
  const enter = pop(frame, 0, FPS);
  const length = lengthOf(scene) + 20;
  return (
    <AbsoluteFill style={{ background: T.peach }}>
      <AbsoluteFill style={zoom(195, y, 1.38, ease(frame, 0, 14), 1060)}>
        <div style={{ position: "absolute", left: PHONE.left, top: PHONE.top, transform: `translateY(${(1 - enter) * 300}px)` }}>
          <Phone clip={clip} length={length} cuts={[[0, 1, (3.6 - 1) / (length / FPS)]]} />
        </div>
      </AbsoluteFill>
      <CaptionBand color={T.peach} />
      {children}
    </AbsoluteFill>
  );
}

const Standard = () => (
  <PageShot clip="standard" scene="standard" y={350}>
    <Stamp at={inScene("standard", CUES.free)} top={1370} text="Free. Live in days." size={84} />
  </PageShot>
);
const Widget = () => <PageShot clip="widget" scene="widget" y={350} />;
const Api = () => <PageShot clip="api" scene="api" y={350} />;
const Shops = () => <PageShot clip="shops" scene="shops" y={300} />;

const STEPS = ["Booked", "Pro on the way", "Working", "Done"];
function Match() {
  const frame = useCurrentFrame();
  const matched = inScene("match", CUES.matched), tracked = inScene("match", CUES.tracked);
  const m = slam(frame, matched, FPS);
  return (
    <HouseWipe bg={T.navy}>
      <AbsoluteFill style={{ background: `radial-gradient(1200px 1000px at 50% 45%, #2b5266, ${T.navy} 70%)` }} />
      <div style={{ position: "absolute", left: 210, top: 540 }}><HousePhoto src={job("fitness-1")} width={660} height={520} /></div>
      {frame >= matched && (
        <div style={{ position: "absolute", top: 990, width: W, display: "grid", placeItems: "center" }}>
          <div style={{ padding: "20px 44px", borderRadius: 99, background: T.orange, color: T.white, fontFamily: FONT, fontWeight: 900, fontSize: 58, transform: `scale(${interpolate(m, [0, 1], [1.8, 1])})`, whiteSpace: "nowrap" }}>Matched: fitness pro</div>
        </div>
      )}
      <div style={{ position: "absolute", left: 130, right: 130, top: 1170 }}>
        {STEPS.map((step, i) => {
          const at = tracked + i * 15;
          const on = frame >= at;
          return (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 30, height: 92, fontFamily: FONT, fontWeight: 900, fontSize: 56, color: on ? T.white : "rgba(255,255,255,.3)" }}>
              <Tick on={on} t={pop(frame, at, FPS)} size={64} />{step}
            </div>
          );
        })}
      </div>
    </HouseWipe>
  );
}

function Dash() {
  const frame = useCurrentFrame();
  const person = inScene("dash", CUES.person);
  const p = pop(frame, person, FPS);
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <Punch>
        <div style={{ position: "absolute", left: 90, top: 540, width: 900, borderRadius: 50, background: T.white, boxShadow: "0 30px 50px rgba(31,59,75,.16)", overflow: "hidden", fontFamily: FONT, color: T.navy }}>
          <div style={{ padding: "30px 44px", background: T.navy, color: T.white, fontWeight: 900, fontSize: 46 }}>Your dashboard</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 34, height: 380, padding: "40px 54px 30px" }}>
            {[0.35, 0.5, 0.45, 0.62, 0.7, 0.86].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h * 100 * ease(frame, 4 + i * 3, 18 + i * 3)}%`, borderRadius: 16, background: i === 5 ? T.orange : "#9fc3d1" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 20, padding: "0 44px 40px" }}>
            {["Booked", "In progress", "Done"].map((t, i) => <div key={t} style={{ flex: 1, padding: "20px 0", textAlign: "center", borderRadius: 20, background: "#f1f5f6", fontWeight: 900, fontSize: 34, color: i === 2 ? "#2b8a3e" : T.navy }}>{t}</div>)}
          </div>
        </div>
        {frame >= person && (
          <div style={{ position: "absolute", left: 150, top: 1290, width: 780, display: "flex", alignItems: "center", gap: 36, padding: "30px 40px", borderRadius: 40, background: T.navy, color: T.white, fontFamily: FONT, transform: `translateY(${(1 - p) * 400}px)`, boxShadow: "0 30px 50px rgba(31,59,75,.3)" }}>
            <svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill={T.orange} /><circle cx="60" cy="46" r="22" fill={T.white} /><path d="M22 104 Q60 58 98 104" fill={T.white} /></svg>
            <div><div style={{ fontWeight: 900, fontSize: 54, letterSpacing: "-0.03em" }}>Your sales person</div><div style={{ fontWeight: 700, fontSize: 36, color: T.peach }}>Dedicated to your brand</div></div>
          </div>
        )}
      </Punch>
    </AbsoluteFill>
  );
}

function Why() {
  const frame = useCurrentFrame();
  const rows = [["Returns", false], ["Bad reviews", false], ["Revenue", true]] as const;
  return (
    <HouseWipe bg={T.peach}>
      {rows.map(([label, up], i) => {
        const at = inScene("why", CUES.why[i]);
        if (frame < at) return null;
        const s = slam(frame, at, FPS);
        return (
          <div key={label} style={{ position: "absolute", left: 120, right: 120, top: 580 + i * 300, height: 240, borderRadius: 50, background: up ? T.navy : T.white, color: up ? T.white : T.navy, display: "flex", alignItems: "center", gap: 44, padding: "0 54px", fontFamily: FONT, fontWeight: 900, fontSize: 84, letterSpacing: "-0.04em", whiteSpace: "nowrap", transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, opacity: Math.min(1, s * 3), boxShadow: "0 26px 40px rgba(80,25,0,.25)" }}>
            <svg width="130" height="130" viewBox="0 0 100 100" style={{ flex: "none", transform: up ? "none" : "rotate(180deg)" }}><circle cx="50" cy="50" r="50" fill={up ? T.orange : "#2b8a3e"} /><path d="M50 24 V76 M28 46 L50 24 L72 46" stroke="#fff" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {label}
          </div>
        );
      })}
    </HouseWipe>
  );
}

function End() {
  const frame = useCurrentFrame();
  const logo = inScene("end", CUES.logo);
  const leave = ease(frame, logo - 6, logo + 3);
  const lines = [["You sell it.", CUES.sell, 140, T.navy], ["We handle", CUES.after, 124, "#d9480f"], ["everything after.", CUES.after + 0.3, 104, "#d9480f"]] as const;
  return (
    <HouseWipe bg={T.bg}>
      {leave < 1 && (
        <div style={{ position: "absolute", top: 700, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.05em", opacity: 1 - leave, transform: `translateY(${-leave * 120}px)` }}>
          {lines.map(([t, sec, size, color]) => {
            const at = inScene("end", sec);
            const s = slam(frame, at, FPS);
            return <div key={t} style={{ fontSize: size, color, transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`, opacity: frame < at ? 0 : Math.min(1, s * 3) }}>{t}</div>;
          })}
        </div>
      )}
      <EndCard at={logo} length={lengthOf("end")} url="fixtman.com/become-partner" phone="(888) 493-0064" tagline="Assembly & installation partner" />
    </HouseWipe>
  );
}

const GROUNDS: Record<Name, Ground> = {
  loved: LIGHT, parts: LIGHT, back: LIGHT, sell: ORANGE, brand: LIGHT, checkout: LIGHT, kinds: LIGHT, cover: DARK, ways: ORANGE,
  standard: ORANGE, widget: ORANGE, api: ORANGE, shops: ORANGE, match: DARK, dash: LIGHT, why: ORANGE, end: LIGHT,
};
const PARTS: [Name, () => ReactNode][] = [
  ["loved", Loved], ["parts", Parts], ["back", Back], ["sell", Sell], ["brand", Brand], ["checkout", Checkout], ["kinds", Kinds], ["cover", Cover],
  ["ways", Ways], ["standard", Standard], ["widget", Widget], ["api", Api], ["shops", Shops], ["match", Match], ["dash", Dash], ["why", Why], ["end", End],
];

export function FixtmanPartnersReel(data: AdData) {
  return <AdReel data={data} config={config} scenes={SCENES} grounds={GROUNDS} parts={PARTS} wiped={["checkout", "ways", "match", "why", "end"]} skip={["kinds"]} />;
}

