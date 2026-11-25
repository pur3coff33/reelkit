// FixtMan's ad for technicians. Paying for leads that go nowhere; the logo; then what an independent pro gets, the real
// application form, and where to apply.
import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ease, lerp, pop, slam } from "../../src/kit/remotion/motion";
import { AdReel, Brand, CaptionBand, Checklist, DARK, EndCard, LIGHT, ORANGE, Phone, PHONE, PhotoWords, Stamp, Tick, timing, zoom, type AdData, type Ground } from "../fixtman/ad";
import { clamp, Fine, FONT, FPS, HousePhoto, HouseWipe, job, Punch, T, W } from "../fixtman/look";
import { config } from "./reel.config";
import { CUES, KINDS, SCENES } from "./timeline";

type Name = keyof typeof SCENES;
const { inScene, lengthOf } = timing<Name>(SCENES);
const RED = "#c92a2a";

// ── Paying for maybes ────────────────────────────────────────────────────────────────────────────────

/** A lead as a phone shows it, with the fee it cost. */
function Lead({ title, fee, dim = 0, width = 820 }: { title: string; fee: boolean; dim?: number; width?: number }) {
  return (
    <div style={{ width, boxSizing: "border-box", padding: "34px 44px", borderRadius: 38, background: T.white, boxShadow: "0 20px 34px rgba(31,59,75,.18)", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: FONT, color: T.navy, opacity: 1 - dim * 0.4 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 34, color: "#63808f" }}>New lead</div>
        <div style={{ fontWeight: 900, fontSize: 60, letterSpacing: "-0.03em" }}>{title}</div>
      </div>
      {fee && <div style={{ fontWeight: 900, fontSize: 40, color: T.white, background: RED, padding: "14px 24px", borderRadius: 18 }}>Fee paid</div>}
    </div>
  );
}

function Total({ text, at, color = T.navy }: { text: string; at: number; color?: string }) {
  const frame = useCurrentFrame();
  const bump = frame >= at ? (1 - slam(frame, at, FPS)) * 0.3 : 0;
  return <div style={{ position: "absolute", top: 1400, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 84, letterSpacing: "-0.04em", color, transform: `scale(${1 + bump})`, whiteSpace: "nowrap" }}>{text}</div>;
}

function LeadScene() {
  const frame = useCurrentFrame();
  const paid = inScene("lead", CUES.paidLead), reply = inScene("lead", CUES.reply);
  const thud = interpolate(frame, [0, 6, 12], [1.06, 0.995, 1], clamp);
  const msg = pop(frame, paid + 12, FPS);
  return (
    <AbsoluteFill style={{ background: "#e8ddcb", transform: `scale(${thud})` }}>
      <div style={{ position: "absolute", left: 130, top: 600 }}><Lead title="Mount a TV" fee={frame >= paid} /></div>
      {frame >= paid + 12 && (
        <div style={{ position: "absolute", right: 130, top: 860, padding: "34px 44px", borderRadius: "44px 44px 10px 44px", background: T.navy, color: T.white, fontFamily: FONT, fontWeight: 700, fontSize: 50, transform: `scale(${msg})`, transformOrigin: "100% 100%" }}>Hi! I can come today.</div>
      )}
      {frame >= reply && (
        <>
          <div style={{ position: "absolute", right: 140, top: 1000, fontFamily: FONT, fontWeight: 700, fontSize: 36, color: "#6d6250" }}>Seen</div>
          <div style={{ position: "absolute", left: 130, top: 1080, padding: "42px 50px", borderRadius: "44px 44px 44px 10px", background: T.white, display: "flex", gap: 20, opacity: 1 - ease(frame, reply + 26, reply + 34) }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 30, height: 30, borderRadius: 99, background: "#b9c6cc", transform: `translateY(${Math.sin((frame - i * 4) / 3.4) * 10}px)` }} />)}
          </div>
        </>
      )}
      <Total text={frame >= paid ? "1 lead paid. 0 jobs." : "0 leads. 0 jobs."} at={paid} />
    </AbsoluteFill>
  );
}

const MORE = ["Build a bed", "Hang a mirror", "Fix a fan", "Mount a TV", "Build a gym"];
function Another() {
  const frame = useCurrentFrame();
  const hired = inScene("another", CUES.hired);
  const n = Math.min(MORE.length, 1 + Math.floor(frame / 11));
  return (
    <AbsoluteFill style={{ background: "#c9d8de" }}>
      <Punch>
        {MORE.map((title, i) => {
          const s = pop(frame, i * 11, FPS);
          if (frame < i * 11) return null;
          return (
            <div key={i} style={{ position: "absolute", left: 130, top: 500 + i * 158, transform: `translateY(${(1 - s) * 300}px) rotate(${[-2, 1.5, -1, 2, -1.5][i]}deg)` }}>
              <Lead title={title} fee />
            </div>
          );
        })}
        <Stamp at={hired} top={860} text="Hired someone else" size={88} tilt={-7} bg={RED} />
        <Total text={`${n + 1} leads paid. 0 jobs.`} at={(n - 1) * 11} />
      </Punch>
    </AbsoluteFill>
  );
}

function Stop() {
  const frame = useCurrentFrame();
  const drop = inScene("stop", CUES.drop);
  return (
    <AbsoluteFill style={{ background: T.peach }}>
      <Punch by={0.12}>
        {["Maybe", "Maybe", "Maybe", "Maybe"].map((t, i) => {
          const at = drop + i * 4;
          const k = interpolate(frame, [at, at + 20], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
          const shake = frame < at ? Math.sin(frame * 2.4 + i * 2) * 7 : 0;
          return (
            <div key={i} style={{ position: "absolute", left: 190, top: 590 + i * 205, width: 700, textAlign: "center", padding: "32px 0", borderRadius: 40, background: T.white, color: "#9fb0b9", fontFamily: FONT, fontWeight: 900, fontSize: 104, lineHeight: 1.1, letterSpacing: "-0.04em", transform: `translate(${shake}px, ${k * 1600}px) rotate(${[-3, 2, -1.5, 3][i] + k * (i % 2 ? 60 : -60)}deg)`, boxShadow: "0 22px 34px rgba(80,25,0,.22)" }}>{t}</div>
          );
        })}
      </Punch>
    </AbsoluteFill>
  );
}

// ── What a pro gets ──────────────────────────────────────────────────────────────────────────────────

function Fees() {
  const frame = useCurrentFrame();
  return (
    <HouseWipe bg={T.navy}>
      <AbsoluteFill style={{ background: `radial-gradient(1200px 1000px at 50% 55%, #2b5266, ${T.navy} 70%)` }} />
      {([["lead costs", CUES.lead], ["subscription", CUES.subscription]] as const).map(([label, t], i) => {
        const at = inScene("fees", t);
        const s = slam(frame, at, FPS);
        if (frame < at) return null;
        return (
          <div key={label} style={{ position: "absolute", left: 100, right: 100, top: 560 + i * 480, textAlign: "center", fontFamily: FONT, fontWeight: 900, transform: `scale(${interpolate(s, [0, 1], [1.7, 1])})`, opacity: Math.min(1, s * 3) }}>
            <div style={{ fontSize: 300, lineHeight: 0.95, letterSpacing: "-0.06em", color: T.peach }}>$0</div>
            <div style={{ fontSize: 92, letterSpacing: "-0.04em", color: T.white }}>{label}</div>
          </div>
        );
      })}
    </HouseWipe>
  );
}

const CARDS = [
  { title: "TV mounting", photo: "tvWall-4" },
  { title: "Chandelier", photo: "lighting-8" },
  { title: "Gazebo build", photo: "gazebo-2" },
];
function Pick() {
  const frame = useCurrentFrame();
  return (
    <HouseWipe bg={T.bg}>
      {CARDS.map((c, i) => {
        const s = pop(frame, 4 + i * 6, FPS);
        const at = inScene("pick", CUES.picks[i]);
        const on = frame >= at;
        const t = pop(frame, at, FPS);
        return (
          <div key={c.title} style={{ position: "absolute", left: 80, right: 80, top: 520 + i * 340, height: 300, borderRadius: 44, background: T.white, boxShadow: on ? `0 0 0 10px ${T.orange}, 0 24px 44px rgba(31,59,75,.2)` : "0 24px 44px rgba(31,59,75,.14)", display: "flex", alignItems: "center", gap: 44, padding: "0 50px 0 40px", transform: `translateX(${(1 - s) * 500}px)`, opacity: Math.min(1, s * 2) }}>
            <HousePhoto src={job(c.photo)} width={240} height={215} at={4 + i * 6} />
            <div style={{ flex: 1, fontFamily: FONT, color: T.navy, whiteSpace: "nowrap" }}>
              <div style={{ fontWeight: 900, fontSize: 60, letterSpacing: "-0.04em" }}>{c.title}</div>
              <div style={{ fontWeight: 700, fontSize: 38, color: "#63808f" }}>In your area</div>
            </div>
            <Tick on={on} t={t} size={92} off="#cfd8dc" />
          </div>
        );
      })}
    </HouseWipe>
  );
}

const Kinds = () => <PhotoWords words={KINDS} from={SCENES.kinds.from} />;

function Size() {
  const frame = useCurrentFrame();
  const big = inScene("size", CUES.big);
  const s = slam(frame, big, FPS);
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <Punch>
        <div style={{ position: "absolute", left: frame >= big ? 80 : 330, top: frame >= big ? 560 : 760, transform: `scale(${frame >= big ? 0.8 : 1})`, transformOrigin: "0 0" }}>
          <HousePhoto src={job("handyman-8")} width={420} height={400} />
        </div>
        {frame >= big && (
          <div style={{ position: "absolute", left: 160, top: 730, transform: `scale(${interpolate(s, [0, 1], [0.5, 1])})`, transformOrigin: "0 20%" }}>
            <HousePhoto src={job("gazebo-8")} width={830} height={740} at={big} zoom={0.14} />
          </div>
        )}
      </Punch>
    </AbsoluteFill>
  );
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const PINS = [[-150, -90], [120, -170], [210, 60], [-60, 150], [-260, 90], [60, 260], [320, -220], [-340, -260], [370, 270], [-390, 300]] as const;
function Own() {
  const frame = useCurrentFrame();
  const at = inScene("own", CUES.radius);
  const days = [true, true, false, true, true, false, false];
  const grow = pop(frame, at, FPS), r = 130 + 290 * ease(frame, at + 2, at + 26);
  const up = ease(frame, at - 6, at + 4);
  return (
    <HouseWipe bg={T.bg}>
      <div style={{ position: "absolute", left: 60, right: 60, top: lerp(880, 520, up), display: "flex", justifyContent: "space-between" }}>
        {DAYS.map((d, i) => {
          const t = 8 + i * 4;
          const on = days[i] && frame >= t;
          const p = pop(frame, t, FPS);
          return (
            <div key={i} style={{ width: 124, height: lerp(250, 140, up), borderRadius: 30, display: "grid", placeItems: "center", background: on ? T.orange : T.white, color: on ? T.white : "#a9b8bf", fontFamily: FONT, fontWeight: 900, fontSize: 66, boxShadow: "0 18px 30px rgba(31,59,75,.14)", transform: `scale(${on ? interpolate(p, [0, 1], [1.3, 1]) : 1})` }}>{d}</div>
          );
        })}
      </div>
      {frame >= at && (
        <div style={{ position: "absolute", left: 90, top: 730, width: 900, height: 760, borderRadius: 56, overflow: "hidden", background: "#dfe6dc", transform: `scale(${grow})`, boxShadow: "0 30px 50px rgba(31,59,75,.18)" }}>
          <svg width="900" height="760" viewBox="-450 -380 900 760">
            {[-320, -180, -40, 110, 260].map((v) => <path key={v} d={`M-450 ${v} H450 M${v * 1.2} -380 V380`} stroke="#fff" strokeWidth="16" />)}
            <path d="M-450 220 Q-100 120 60 -40 T450 -260" stroke="#f3e3b5" strokeWidth="30" fill="none" />
            <circle r={r} fill="rgba(242,106,53,.18)" stroke={T.orange} strokeWidth="10" strokeDasharray="30 20" strokeDashoffset={-frame * 2} />
            {PINS.map(([x, y], i) => {
              const inside = Math.hypot(x, y) < r;
              return <g key={i} transform={`translate(${x} ${y})`}><path d="M0 0 C-34 -44 -26 -84 0 -84 C26 -84 34 -44 0 0 Z" fill={inside ? T.orange : "#9fb0b9"} /><circle cy="-54" r="11" fill="#fff" /></g>;
            })}
            <path d="M-46 8 L0 -34 L46 8" stroke={T.navy} strokeWidth="18" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="-30" y="2" width="60" height="44" rx="6" fill={T.navy} />
          </svg>
        </div>
      )}
    </HouseWipe>
  );
}

function No() {
  const frame = useCurrentFrame();
  const at = inScene("no", CUES.turnDown), free = inScene("no", CUES.noPenalty);
  const k = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  return (
    <AbsoluteFill style={{ background: T.peach }}>
      <Punch>
        <div style={{ position: "absolute", left: 150, top: 560, transform: `translateX(${-k * 1300}px) rotate(${-k * 24}deg)` }}>
          <div style={{ width: 780, borderRadius: 56, background: T.white, padding: "60px 0 50px", textAlign: "center", boxShadow: "0 40px 60px rgba(80,25,0,.28)" }}>
            <div style={{ display: "grid", placeItems: "center" }}><HousePhoto src={job("fitness-1")} width={520} height={440} /></div>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 70, color: T.navy, letterSpacing: "-0.04em", marginTop: 44 }}>Job offer</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 26, fontFamily: FONT, fontWeight: 900, fontSize: 48 }}>
              <span style={{ padding: "22px 60px", borderRadius: 99, background: frame >= at - 5 ? T.deep : "#e4eaed", color: frame >= at - 5 ? T.white : T.navy, transform: `scale(${frame >= at - 5 ? 1.08 : 1})` }}>Not now</span>
              <span style={{ padding: "22px 60px", borderRadius: 99, background: T.orange, color: T.white }}>Accept</span>
            </div>
          </div>
        </div>
        <Stamp at={free} top={830} text="No penalty" size={150} tilt={-4} />
      </Punch>
      <Fine text="For offers you turn down. Dropping an accepted job can be penalized." top={1545} />
    </AbsoluteFill>
  );
}

function Paid() {
  const frame = useCurrentFrame();
  const weekly = inScene("paid", CUES.weekly), fri = inScene("paid", CUES.friday);
  const big = slam(frame, fri, FPS);
  return (
    <HouseWipe bg={T.bg}>
      {/* Four weeks; every Friday fills in turn. */}
      <div style={{ position: "absolute", left: 90, top: 590, width: 900 }}>
        {[0, 1, 2, 3].map((w) => (
          <div key={w} style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
            {DAYS.map((d, i) => {
              const at = weekly + w * 7;
              const on = i === 4 && frame >= at;
              const s = pop(frame, at, FPS);
              const p = pop(frame, 2 + i + w * 2, FPS);
              return (
                <div key={i} style={{ width: 116, height: 150, borderRadius: 28, display: "grid", placeItems: "center", background: on ? T.orange : T.white, color: on ? T.white : "#b4c2c8", fontFamily: FONT, fontWeight: 900, fontSize: on ? 76 : 52, transform: `scale(${p * (on ? interpolate(s, [0, 1], [1.5, 1]) : 1)})`, boxShadow: "0 14px 24px rgba(31,59,75,.12)" }}>{on ? "$" : d}</div>
              );
            })}
          </div>
        ))}
      </div>
      {frame >= fri && (
        <div style={{ position: "absolute", top: 1290, width: W, display: "grid", placeItems: "center" }}>
          <div style={{ padding: "26px 70px 30px", borderRadius: 34, background: T.navy, color: T.white, fontFamily: FONT, fontWeight: 900, fontSize: 120, lineHeight: 1.05, letterSpacing: "-0.04em", transform: `scale(${interpolate(big, [0, 1], [2, 1])}) rotate(-3deg)`, opacity: Math.min(1, big * 3) }}>Paid Friday</div>
        </div>
      )}
      <Fine text="Commission on jobs done Monday to Sunday, paid the next Friday." top={1545} />
    </HouseWipe>
  );
}

const Back = () => (
  <Checklist rows={[{ text: "The ads", photo: "playset-3" }, { text: "The leads", photo: "outdoor-4" }, { text: "The back office", photo: "indoor-1" }]} at={CUES.back.map((c) => inScene("back", c))} />
);

const WALL = ["tvWall-7", "playset-5", "lighting-1", "outdoor-4", "indoor-2", "gazebo-5", "wallHanging-1", "fitness-8", "playset-3", "indoor-6", "wallHanging-7", "gazebo-8"];
function Numbers() {
  const frame = useCurrentFrame();
  const rows = [
    { at: inScene("numbers", CUES.seven), to: 700, label: "technicians" },
    { at: inScene("numbers", CUES.hundred), to: 100000, label: "projects done" },
  ];
  return (
    <HouseWipe bg={T.peach}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.2, transform: `translateY(${-frame * 1.1}px)` }}>
        {WALL.map((name, i) => (
          <div key={name} style={{ position: "absolute", left: 45 + (i % 3) * 340, top: 560 + Math.floor(i / 3) * 400 }}><HousePhoto src={job(name)} width={310} height={340} /></div>
        ))}
      </div>
      {rows.map((r, i) => {
        if (frame < r.at - 2) return null;
        const n = Math.round(interpolate(frame, [r.at - 2, r.at + 26], [0, r.to], { ...clamp, easing: Easing.out(Easing.cubic) }));
        const s = slam(frame, r.at - 2, FPS);
        return (
          <div key={r.label} style={{ position: "absolute", top: 570 + i * 440, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, color: T.deep, transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`, opacity: Math.min(1, s * 3) }}>
            <div style={{ fontSize: i ? 184 : 280, lineHeight: 1, letterSpacing: "-0.06em", fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString("en-US")}+</div>
            <div style={{ fontSize: 92, letterSpacing: "-0.03em", color: T.white, textShadow: "0 3px 14px rgba(120,40,0,.45)" }}>{r.label}</div>
          </div>
        );
      })}
      <Fine text="fixtman.com/become-pro, November 2026" top={1545} />
    </HouseWipe>
  );
}

const THINGS: [string, ReactNode][] = [
  ["Tools", <g key="t"><rect x="-110" y="-40" width="220" height="130" rx="18" fill={T.orange} /><path d="M-46 -40 V-78 H46 V-40" fill="none" stroke={T.orange} strokeWidth="24" strokeLinejoin="round" /><rect x="-110" y="8" width="220" height="18" fill={T.deep} /><rect x="-24" y="-6" width="48" height="46" rx="8" fill={T.white} /></g>],
  ["License", <g key="l"><rect x="-130" y="-80" width="260" height="170" rx="24" fill={T.orange} /><circle cx="-62" cy="-8" r="38" fill={T.white} /><path d="M-110 66 q48 -46 96 0" fill={T.white} /><path d="M16 -30 H98 M16 8 H98 M16 46 H70" stroke={T.white} strokeWidth="18" strokeLinecap="round" /></g>],
  ["Ride", <g key="r"><path d="M-150 60 V-60 Q-150 -80 -130 -80 H40 V60 Z" fill={T.orange} /><path d="M40 60 V-36 H98 L150 14 V60 Z" fill={T.orange} /><path d="M60 -16 H92 L120 14 H60 Z" fill={T.white} /><circle cx="-80" cy="66" r="36" fill={T.deep} stroke={T.white} strokeWidth="10" /><circle cx="92" cy="66" r="36" fill={T.deep} stroke={T.white} strokeWidth="10" /></g>],
];
function Bring() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.navy }}>
      <Punch>
        {THINGS.map(([label, icon], i) => {
          const at = inScene("bring", CUES.bring[i]);
          const s = slam(frame, at, FPS);
          if (frame < at) return null;
          return (
            <div key={label} style={{ position: "absolute", left: 130, top: 540 + i * 330, width: 820, display: "flex", alignItems: "center", gap: 70, transform: `translateX(${(1 - s) * (i % 2 ? 260 : -260)}px)`, opacity: Math.min(1, s * 3) }}>
              <svg width="320" height="270" viewBox="-165 -130 330 270">{icon}</svg>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 130, letterSpacing: "-0.04em", color: T.white }}>{label}</div>
            </div>
          );
        })}
      </Punch>
    </AbsoluteFill>
  );
}

function Form() {
  const frame = useCurrentFrame();
  const enter = pop(frame, 0, FPS);
  return (
    <AbsoluteFill style={{ background: T.peach }}>
      <AbsoluteFill style={zoom(195, 420, 1.42, ease(frame, 8, 26), 1080)}>
        <div style={{ position: "absolute", left: PHONE.left, top: PHONE.top, transform: `translateY(${(1 - enter) * 500}px)` }}>
          <Phone clip="form" length={lengthOf("form") + 20} cuts={[[0, 0.35, 1.15]]} />
        </div>
      </AbsoluteFill>
      <CaptionBand color={T.peach} />
    </AbsoluteFill>
  );
}

function End() {
  const frame = useCurrentFrame();
  const logo = inScene("end", CUES.logo);
  const leave = ease(frame, logo - 6, logo + 3);
  return (
    <HouseWipe bg={T.bg}>
      {leave < 1 && (
        <div style={{ position: "absolute", top: 730, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 150, lineHeight: 1.25, letterSpacing: "-0.05em", color: T.navy, opacity: 1 - leave, transform: `translateY(${-leave * 120}px)` }}>
          {["Your skills.", "Your schedule."].map((t, i) => {
            const at = inScene("end", CUES.words[i]);
            const s = slam(frame, at, FPS);
            return <div key={t} style={{ fontSize: i ? 124 : 150, color: i ? "#d9480f" : T.navy, transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`, opacity: frame < at ? 0 : Math.min(1, s * 3) }}>{t}</div>;
          })}
        </div>
      )}
      <EndCard at={logo} length={lengthOf("end")} url="fixtman.com/become-pro" phone="(888) 493-0064" tagline="Independent pros wanted" />
      {frame >= logo + 40 && <Fine text="Independent contractor (1099). Earnings depend on jobs completed." top={1545} />}
    </HouseWipe>
  );
}

const GROUNDS: Record<Name, Ground> = {
  lead: LIGHT, another: LIGHT, stop: ORANGE, brand: LIGHT, fees: DARK, pick: LIGHT, kinds: LIGHT, size: LIGHT, own: LIGHT, no: ORANGE,
  paid: LIGHT, back: DARK, numbers: ORANGE, bring: DARK, form: ORANGE, end: LIGHT,
};
const PARTS: [Name, () => ReactNode][] = [
  ["lead", LeadScene], ["another", Another], ["stop", Stop], ["brand", Brand], ["fees", Fees], ["pick", Pick], ["kinds", Kinds], ["size", Size],
  ["own", Own], ["no", No], ["paid", Paid], ["back", Back], ["numbers", Numbers], ["bring", Bring], ["form", Form], ["end", End],
];

export function FixtmanProsReel(data: AdData) {
  return <AdReel data={data} config={config} scenes={SCENES} grounds={GROUNDS} parts={PARTS} wiped={["fees", "pick", "own", "paid", "numbers", "end"]} skip={["kinds"]} />;
}
