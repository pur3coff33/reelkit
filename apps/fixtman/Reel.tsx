// FixtMan's ad. Jobs that never got done (undone.tsx), the logo built like a house, the jobs done (FixtMan's own photos in
// house-shaped frames), the real booking form with its prices, then the warranty, the rating and the ask.
import { useMemo, type ReactNode } from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AudioMix } from "../../src/kit/remotion/AudioMix";
import type { VoiceLine } from "../../src/kit/remotion/base";
import { Captions } from "../../src/kit/remotion/Captions";
import { ease, lerp, pop, slam } from "../../src/kit/remotion/motion";
import { B, clamp, Fine, FONT, FPS, H, HousePhoto, HouseWipe, inScene, job, lengthOf, loadFixtmanFonts, LOOK, Mark, Punch, sceneAt, T, W } from "./look";
import { config } from "./reel.config";
import { BPM, CUES, JOBS, LEAD, SCENES, type SceneName } from "./timeline";
import { Ask, BedBox, Drill, SwingBox, TvBox } from "./undone";

export type FixtmanData = { voice: { voice: string; lines: VoiceLine[] } };

function Brand() {
  const frame = useCurrentFrame();
  const word = slam(frame, 13, FPS);
  const hold = interpolate(frame, [14, 60], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <AbsoluteFill style={{ alignItems: "center", transform: `scale(${1 + hold * 0.05})` }}>
        <div style={{ position: "absolute", top: 560 }}><Mark at={-3} size={560} /></div>
        <Img src={staticFile("assets/logo-word.png")} style={{ position: "absolute", top: 1215, width: 820, transform: `scale(${interpolate(word, [0, 1], [1.7, 1])})`, opacity: Math.min(1, word * 3) }} />
      </AbsoluteFill>
      <Dust at={6} y={740} />
    </AbsoluteFill>
  );
}

/** Dust kicked out as the roof lands. */
function Dust({ at, y }: { at: number; y: number }) {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + 22) return null;
  const k = (frame - at) / 22;
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const reach = 290 + (1 - (1 - k) ** 3) * (60 + ((i * 47) % 130));
        const r = (14 + ((i * 13) % 20)) * (1 - k);
        return <div key={i} style={{ position: "absolute", left: W / 2 + side * reach - r, top: y - ((i * 29) % 120) * k - r, width: r * 2, height: r * 2, borderRadius: 99, background: i % 3 ? "#e0d0b8" : T.orange }} />;
      })}
    </>
  );
}

// ── The jobs, done ───────────────────────────────────────────────────────────────────────────────────

const WALL = ["tvWall-7", "playset-5", "lighting-1", "outdoor-4", "indoor-2", "gazebo-5", "wallHanging-1", "fitness-1", "playset-3", "indoor-6", "wallHanging-7", "gazebo-8"];

function Pro() {
  const frame = useCurrentFrame();
  return (
    <HouseWipe bg={T.navy}>
      <AbsoluteFill style={{ background: `radial-gradient(1200px 1000px at 50% 55%, #2b5266, ${T.navy} 70%)` }} />
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${-frame * 0.9}px)` }}>
        {WALL.map((name, i) => {
          const at = 7 + i * 5;
          const s = pop(frame, at, FPS);
          const col = i % 3, row = Math.floor(i / 3);
          return (
            <div key={name} style={{ position: "absolute", left: 45 + col * 340, top: 640 + row * 400 + (col === 1 ? 40 : 0), transform: `scale(${s}) rotate(${(1 - s) * (col - 1) * 14}deg)` }}>
              <HousePhoto src={job(name)} width={310} height={340} at={at} />
            </div>
          );
        })}
      </div>
    </HouseWipe>
  );
}

function Jobs() {
  const frame = useCurrentFrame();
  const from = B(SCENES.jobs.from);
  const starts = JOBS.map((j, i) => (i === 0 ? 0 : Math.round(j.at * FPS) - from));
  const i = Math.max(0, starts.findLastIndex((s) => frame >= s));
  const at = starts[i], j = JOBS[i];
  const last = i === JOBS.length - 1;
  const bg = [T.peach, T.bg, T.navy, T.peach, T.bg, T.navy][i];
  const s = slam(frame, at, FPS);
  const word = slam(frame, at + 1, FPS);
  const width = last ? 980 : 900;
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div style={{ position: "absolute", top: last ? 270 : 350, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.98, color: bg === T.navy ? T.white : T.deep, fontSize: last ? 134 : j.word.length > 8 ? 158 : 200, transform: `scale(${interpolate(word, [0, 1], [1.5, 1])})`, opacity: Math.min(1, word * 3) }}>
        {last ? (<>Even that<br />giant playset</>) : j.word}
      </div>
      <div key={i} style={{ position: "absolute", left: (W - width) / 2, top: 660, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])}) rotate(${(1 - s) * (i % 2 ? 5 : -5)}deg)` }}>
        <HousePhoto src={job(j.photo)} width={width} height={last ? 900 : 860} at={at} zoom={last ? 0.14 : 0.1} />
      </div>
    </AbsoluteFill>
  );
}

// ── Booking ──────────────────────────────────────────────────────────────────────────────────────────

const PHONE = { width: 640, left: (W - 640) / 2, top: 540, bezel: 17 };
const PX = (PHONE.width - PHONE.bezel * 2) / 390;
const onStage = (x: number, y: number) => ({ x: PHONE.left + PHONE.bezel + x * PX, y: PHONE.top + PHONE.bezel + y * PX });

/** Zooms the stage onto a point of the phone's screen, in CSS px of the 390-wide page. */
function zoom(x: number, y: number, z: number, k: number) {
  const p = onStage(x, y);
  return { transform: `translate(${(W / 2 - p.x) * k}px, ${(1040 - p.y) * k}px) scale(${1 + (z - 1) * k})`, transformOrigin: `${p.x}px ${p.y}px` };
}

/** A phone playing pieces of the booking clip back to back: [frame it starts on, second of the clip, speed]. */
function Phone({ cuts, length }: { cuts: [number, number, number][]; length: number }) {
  const sw = PHONE.width - PHONE.bezel * 2, sh = Math.round((sw * 1688) / 780);
  return (
    <div style={{ width: PHONE.width, height: sh + PHONE.bezel * 2, borderRadius: 80, padding: PHONE.bezel, background: `linear-gradient(150deg, #35566a, ${T.deep} 55%, #24475a)`, boxShadow: "0 50px 90px rgba(60,20,0,.35)" }}>
      <div style={{ position: "relative", width: sw, height: sh, borderRadius: 63, overflow: "hidden", background: T.white }}>
        {cuts.map(([from, startAt, rate], i) => (
          <Sequence key={i} from={from} durationInFrames={(cuts[i + 1]?.[0] ?? length) - from} layout="none">
            <OffthreadVideo src={staticFile("out/clips/book.mp4")} startFrom={Math.round(startAt * FPS)} playbackRate={rate} muted style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
          </Sequence>
        ))}
      </div>
    </div>
  );
}

/** Keeps the zoomed phone from running up under the caption. */
const CaptionBand = () => <AbsoluteFill style={{ background: `linear-gradient(${T.peach} 26.5%, rgba(255,130,80,0) 29%)` }} />;

function Zip() {
  const frame = useCurrentFrame();
  const enter = pop(frame, 3, FPS);
  const z = ease(frame, 22, 42) * (1 - ease(frame, 60, 72));
  return (
    <HouseWipe bg={T.peach}>
      <AbsoluteFill style={zoom(195, 720, 1.55, z)}>
        <div style={{ position: "absolute", left: PHONE.left, top: PHONE.top, transform: `translateY(${(1 - enter) * 500}px)` }}>
          {/* Typing the ZIP and Start Booking; then the form, with the loading between them cut out. */}
          <Phone length={lengthOf("zip") + 20} cuts={[[0, 0.75, 1], [61, 4.95, 0.45]]} />
        </div>
      </AbsoluteFill>
      <CaptionBand />
    </HouseWipe>
  );
}

function Price() {
  const frame = useCurrentFrame();
  const fees = inScene("price", CUES.noFees);
  const s = slam(frame, fees, FPS);
  return (
    <AbsoluteFill style={{ background: T.peach }}>
      <AbsoluteFill style={zoom(195, 345, 1.6, ease(frame, 0, 16))}>
        <div style={{ position: "absolute", left: PHONE.left, top: PHONE.top }}>
          <Phone length={lengthOf("price") + 20} cuts={[[0, 7.25, 0.25]]} />
        </div>
      </AbsoluteFill>
      <CaptionBand />
      {frame >= fees && (
        <div style={{ position: "absolute", top: 1290, width: W, display: "grid", placeItems: "center" }}>
          <div style={{ padding: "26px 48px", background: T.navy, color: T.white, fontFamily: FONT, fontWeight: 900, fontSize: 84, letterSpacing: "-0.03em", borderRadius: 24, transform: `scale(${interpolate(s, [0, 1], [2, 1])}) rotate(-4deg)`, opacity: Math.min(1, s * 3), boxShadow: "0 30px 50px rgba(60,20,0,.35)" }}>No hidden fees</div>
        </div>
      )}
      <Fine text="Dallas ZIP shown. Prices vary by location and job." />
    </AbsoluteFill>
  );
}

const SLOTS = ["Morning", "Afternoon", "Evening"];
function Time() {
  const frame = useCurrentFrame();
  const same = inScene("time", CUES.sameDay);
  const pick = Math.min(2, Math.floor(Math.max(0, frame - 16) / 15));
  const s = slam(frame, same, FPS);
  const out = ease(frame, same - 2, same + 8);
  return (
    <HouseWipe bg={T.bg}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 620, transform: `translateY(${out * 60}px) scale(${1 - out * 0.1})`, opacity: 1 - out * 0.75 }}>
        {SLOTS.map((name, i) => {
          const p = pop(frame, 5 + i * 5, FPS);
          const on = frame >= 16 && pick === i;
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 210, padding: "0 60px", marginBottom: 36, borderRadius: 40, background: on ? T.peach : T.white, color: on ? T.deep : T.navy, fontFamily: FONT, fontWeight: 900, fontSize: 88, letterSpacing: "-0.03em", boxShadow: "0 22px 44px rgba(31,59,75,.14)", opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * 300}px) scale(${on ? 1.04 : 1})` }}>
              {name}
              <span style={{ width: 84, height: 84, boxSizing: "border-box", borderRadius: 99, border: `9px solid ${on ? T.deep : "#cfd8dc"}`, display: "grid", placeItems: "center" }}>
                {on && <span style={{ width: 40, height: 40, borderRadius: 99, background: T.deep }} />}
              </span>
            </div>
          );
        })}
      </div>
      {frame >= same && (
        <div style={{ position: "absolute", top: 760, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, color: T.white, transform: `scale(${interpolate(s, [0, 1], [2.2, 1])}) rotate(-3deg)`, opacity: Math.min(1, s * 3) }}>
          <div style={{ margin: "0 auto", width: 920, padding: "62px 0 66px", borderRadius: 56, background: T.navy, boxShadow: "0 50px 90px rgba(15,35,48,.4)" }}>
            <div style={{ fontSize: 170, letterSpacing: "-0.05em", lineHeight: 1 }}>Same-day</div>
            <div style={{ fontSize: 62, fontWeight: 700, marginTop: 18, color: T.peach }}>in many areas</div>
          </div>
        </div>
      )}
    </HouseWipe>
  );
}

const STEPS = [
  { text: "Brings the tools", photo: "wallHanging-1" },
  { text: "Does the work", photo: "lighting-1" },
  { text: "Checks it all", photo: "tvWall-4" },
];
function Ready() {
  const frame = useCurrentFrame();
  const at = CUES.ready.map((c) => inScene("ready", c));
  const i = Math.max(0, at.findLastIndex((a) => frame >= a));
  const photoAt = i === 0 ? 0 : at[i];
  const s = slam(frame, photoAt, FPS);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 1000px at 50% 45%, #2b5266, ${T.navy} 70%)` }}>
      <Punch>
        <div key={i} style={{ position: "absolute", left: 190, top: 590, transform: `scale(${interpolate(s, [0, 1], [0.86, 1])})` }}>
          <HousePhoto src={job(STEPS[i].photo)} width={700} height={550} at={photoAt} />
        </div>
        <div style={{ position: "absolute", left: 150, top: 1190 }}>
          {STEPS.map((step, k) => {
            const on = frame >= at[k];
            const t = pop(frame, at[k], FPS);
            return (
              <div key={step.text} style={{ display: "flex", alignItems: "center", gap: 34, height: 122, fontFamily: FONT, fontWeight: 900, fontSize: 74, letterSpacing: "-0.03em", color: on ? T.white : "rgba(255,255,255,.3)", whiteSpace: "nowrap" }}>
                <span style={{ width: 84, height: 84, boxSizing: "border-box", borderRadius: 24, border: on ? "none" : "7px solid rgba(255,255,255,.3)", background: on ? T.orange : "transparent", display: "grid", placeItems: "center", transform: `scale(${on ? interpolate(t, [0, 1], [1.6, 1]) : 1})` }}>
                  {on && (
                    <svg width="56" height="56" viewBox="0 0 56 56"><path d="M8 30 L22 44 L48 13" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="70" strokeDashoffset={70 * (1 - Math.min(1, t))} /></svg>
                  )}
                </span>
                {step.text}
              </div>
            );
          })}
        </div>
      </Punch>
    </AbsoluteFill>
  );
}

// ── Trust ────────────────────────────────────────────────────────────────────────────────────────────

/** The 30 in a house; then an arrow runs round it, for "we redo it". One scene across two lines. */
function Warranty() {
  const frame = useCurrentFrame();
  const thirty = inScene("warranty", CUES.thirty), redo = inScene("warranty", CUES.redo);
  const n = Math.round(interpolate(frame, [4, thirty], [1, 30], clamp));
  const land = frame >= thirty ? interpolate(slam(frame, thirty, FPS), [0, 1], [1.3, 1]) : 1;
  const k = ease(frame, redo - 14, redo + 8);
  const c = { x: 540, y: 1040 }, r = 440;
  const a0 = -Math.PI * 0.42, a = a0 + k * Math.PI * 1.75;
  const pt = (t: number) => ({ x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r });
  const start = pt(a0), tip = pt(a);
  const spin = ease(frame, redo + 8, redo + 60) * 24;
  const shrink = ease(frame, redo - 18, redo - 2) * 0.27;
  return (
    <HouseWipe bg={T.peach}>
      <div style={{ position: "absolute", left: 190, top: 640, width: 700, height: 780, transform: `scale(${1 - shrink})`, transformOrigin: "50% 51%" }}>
        <svg width="700" height="780" style={{ overflow: "visible", position: "absolute" }}>
          <path d="M350 40 L660 270 V730 Q660 770 620 770 H80 Q40 770 40 730 V270 Z" fill={T.navy} />
          <polyline points="0,292 350,32 700,292" fill="none" stroke={T.white} strokeWidth="62" strokeLinejoin="round" strokeLinecap="round" transform={`translate(0 ${(1 - slam(frame, 8, FPS)) * -300})`} />
        </svg>
        <div style={{ position: "absolute", top: 235, width: 700, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 320, letterSpacing: "-0.06em", lineHeight: 1, color: T.white, transform: `scale(${land})` }}>{n}</div>
        <div style={{ position: "absolute", top: 570, width: 700, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 70, lineHeight: 1.05, letterSpacing: "-0.02em", color: T.peach }}>day service<br />warranty</div>
      </div>
      {k > 0 && (
        <svg width={W} height={H} style={{ position: "absolute", transform: `rotate(${spin}deg)`, transformOrigin: `${c.x}px ${c.y}px` }}>
          <path d={`M${start.x} ${start.y} A${r} ${r} 0 ${k * 1.75 > 1 ? 1 : 0} 1 ${tip.x} ${tip.y}`} fill="none" stroke={T.deep} strokeWidth="38" strokeLinecap="round" />
          <g transform={`translate(${tip.x} ${tip.y}) rotate(${(a * 180) / Math.PI + 90})`}><path d="M-12 -66 L80 0 L-12 66 Z" fill={T.deep} stroke={T.deep} strokeWidth="18" strokeLinejoin="round" /></g>
        </svg>
      )}
      <Fine text="Covers workmanship. Terms at fixtman.com" top={1545} />
    </HouseWipe>
  );
}

function Star({ size, at, fill = 1 }: { size: number; at: number; fill?: number }) {
  const s = pop(useCurrentFrame(), at, FPS);
  const d = "M50 4 L63 37 L98 39 L71 62 L80 96 L50 77 L20 96 L29 62 L2 39 L37 37 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `scale(${s}) rotate(${(1 - s) * -70}deg)`, overflow: "visible" }}>
      <path d={d} fill="#e6dccb" stroke="#e6dccb" strokeWidth="6" strokeLinejoin="round" />
      <path d={d} fill={T.orange} stroke={T.orange} strokeWidth="6" strokeLinejoin="round" style={{ clipPath: `inset(-5% ${(1 - fill) * 100}% -5% -5%)` }} />
    </svg>
  );
}

function Stars() {
  const frame = useCurrentFrame();
  const at = inScene("stars", CUES.rating), rev = inScene("stars", CUES.reviews);
  const rating = interpolate(frame, [at - 4, at + 16], [0, 4.9], { ...clamp, easing: Easing.out(Easing.cubic) });
  const count = Math.round(interpolate(frame, [rev - 4, rev + 26], [0, 4264], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const big = slam(frame, at - 2, FPS);
  const photo = pop(frame, 4, FPS);
  const up = ease(frame, at - 14, at);
  return (
    <HouseWipe bg={T.bg}>
      <div style={{ position: "absolute", left: 170, top: lerp(660, 1000, up), transform: `scale(${photo * lerp(1, 0.74, up)})`, transformOrigin: "50% 0%" }}>
        <HousePhoto src={job("tvWall-7")} width={740} height={660} at={4} />
      </div>
      {frame >= at - 2 && (
        <>
          <div style={{ position: "absolute", top: 500, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 300, lineHeight: 1, letterSpacing: "-0.06em", color: T.navy, transform: `scale(${interpolate(big, [0, 1], [1.5, 1])})` }}>{rating.toFixed(1)}</div>
          <div style={{ position: "absolute", top: 800, width: W, display: "flex", justifyContent: "center", gap: 16 }}>
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={118} at={at + 3 + i * 4} fill={i === 4 ? 0.9 : 1} />)}
          </div>
        </>
      )}
      {frame >= rev - 4 && (
        <div style={{ position: "absolute", top: 1400, width: W, display: "grid", placeItems: "center", transform: `scale(${pop(frame, rev - 4, FPS)})` }}>
          <div style={{ padding: "18px 44px", borderRadius: 99, background: T.navy, color: T.white, fontFamily: FONT, fontWeight: 900, fontSize: 68, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{count.toLocaleString("en-US")} reviews</div>
        </div>
      )}
      {frame >= at && <Fine text="TV mounting rating on fixtman.com, November 2026" top={1545} />}
    </HouseWipe>
  );
}

// ── The end ──────────────────────────────────────────────────────────────────────────────────────────

const LIST = ["Mount the TV", "Build the bed", "Swing set"];
function End() {
  const frame = useCurrentFrame();
  const logo = inScene("end", CUES.logo);
  const leave = ease(frame, logo - 6, logo + 4);
  const word = slam(frame, logo + 10, FPS), url = slam(frame, logo + 22, FPS), tel = pop(frame, logo + 32, FPS);
  const hold = interpolate(frame, [logo + 20, lengthOf("end")], [0, 1], clamp);
  const beat = frame > logo + 40 ? Math.max(0, 1 - ((frame - logo - 40) % 30) / 9) : 0;
  return (
    <HouseWipe bg={T.bg}>
      {leave < 1 && (
        <div style={{ position: "absolute", left: 120, top: 700, opacity: 1 - leave, transform: `translateY(${-leave * 120}px)` }}>
          {LIST.map((t, i) => {
            const at = inScene("end", CUES.struck[i]);
            const k = ease(frame, at, at + 7);
            return (
              <div key={t}>
                <div style={{ position: "relative", display: "inline-block", fontFamily: FONT, fontWeight: 900, fontSize: 118, letterSpacing: "-0.04em", color: T.navy, marginBottom: 44, whiteSpace: "nowrap" }}>
                  <span style={{ opacity: 1 - k * 0.5 }}>{t}</span>
                  <span style={{ position: "absolute", left: -14, top: "48%", height: 20, width: `calc(${k * 100}% + ${k * 28}px)`, background: T.orange, borderRadius: 10, transform: "rotate(-2deg)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {frame >= logo && (
        <AbsoluteFill style={{ alignItems: "center", transform: `scale(${1 + hold * 0.035})` }}>
          <div style={{ position: "absolute", top: 500 }}><Mark at={logo} size={410} quick /></div>
          <Img src={staticFile("assets/logo-word.png")} style={{ position: "absolute", top: 965, width: 720, opacity: Math.min(1, word * 3), transform: `scale(${interpolate(word, [0, 1], [1.5, 1])})` }} />
          {frame >= logo + 22 && (
            <div style={{ position: "absolute", top: 1130, padding: "32px 70px", borderRadius: 99, background: "#e2551f", color: T.white, fontFamily: FONT, fontWeight: 900, fontSize: 92, lineHeight: 1.1, letterSpacing: "-0.03em", boxShadow: "0 30px 60px rgba(242,106,53,.4)", transform: `scale(${interpolate(url, [0, 1], [1.6, 1]) + beat * 0.035})`, opacity: Math.min(1, url * 3) }}>fixtman.com</div>
          )}
          <div style={{ position: "absolute", top: 1345, fontFamily: FONT, fontWeight: 900, fontSize: 68, color: T.navy, letterSpacing: "-0.02em", opacity: tel, transform: `translateY(${(1 - tel) * 40}px)` }}>(888) 493-0064</div>
          <div style={{ position: "absolute", top: 1440, fontFamily: FONT, fontWeight: 700, fontSize: 44, color: "#466675", opacity: tel }}>Handyman services, nationwide</div>
        </AbsoluteFill>
      )}
    </HouseWipe>
  );
}

/** Each scene; one that runs on under the next line names that scene as its last. */
const PARTS: [SceneName, () => ReactNode, SceneName?][] = [
  ["tv", TvBox], ["bed", BedBox], ["swing", SwingBox], ["drill", Drill], ["brand", Brand], ["pro", Pro], ["jobs", Jobs], ["zip", Zip],
  ["price", Price], ["time", Time], ["ready", Ready], ["warranty", Warranty, "redo"], ["stars", Stars], ["ask", Ask], ["end", End],
];
const WIPED: SceneName[] = ["pro", "zip", "time", "warranty", "stars", "end"];
/** Frames a scene stays under the next one's opening house. */
const TAIL = 14;

export function FixtmanReel(data: FixtmanData) {
  loadFixtmanFonts();
  const frame = useCurrentFrame();
  // A wiped-in scene's house only reaches the caption some frames after its cut, so its colours wait for that.
  const now = sceneAt(frame);
  const look = LOOK[WIPED.includes(now) ? sceneAt(frame - 4) : now];
  // Each line starts on the config's beat, so timing can be tuned without re-voicing.
  const lines = useMemo(() => {
    const byId = new Map<string, (typeof config.voice.lines)[number]>(config.voice.lines.map((l) => [l.id, l]));
    return data.voice.lines.map((l) => ({ ...l, beat: byId.get(l.id)?.beat ?? l.beat, caption: byId.get(l.id)?.caption ?? l.caption }));
  }, [data.voice]);
  const spoken = lines.map((l) => ({ ...l, beat: l.beat + LEAD * (BPM / 60), seconds: l.seconds - LEAD }));
  return (
    <AbsoluteFill style={{ background: T.bg, fontFamily: FONT }}>
      {PARTS.map(([name, Part, through]) => {
        const from = B(SCENES[name].from), to = B(SCENES[through ?? name].to);
        return (
          <Sequence key={name} from={from} durationInFrames={Math.min(to + TAIL, config.seconds * FPS) - from} layout="none">
            <Part />
          </Sequence>
        );
      })}
      <Captions lines={spoken} bpm={BPM} top={270} size={74} color={look.ink} highlight={look.hi} font={FONT} skip={["jobs"]} hold={8} />
      <AudioMix music={config.music.file} lines={lines} bpm={BPM} duck={0.24} musicVolume={0.7} voiceVolume={1.25} />
    </AbsoluteFill>
  );
}

export { loadFixtmanFonts };
