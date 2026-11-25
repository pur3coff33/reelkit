// The call-masking explainer, in Fixtman's look (Lato, brand teal, the logo's orange, thumbtack_fe's chat bubbles).
// One idea per scene: the confusing bubble, our own masking, Thumbtack's masking, the copy it keeps, the real-number
// case, a recap. Calm on purpose: soft fades, an orange dot for a message on the move, no music.
import type { CSSProperties, ReactNode } from "react";
import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { beatFrame, type VoiceLine } from "../../src/kit/remotion/base";
import { wordTimes } from "../../src/kit/remotion/Captions";
import { pop } from "../../src/kit/remotion/motion";
import { config } from "./reel.config";
import { wordGroups } from "./subtitles";
import { BPM, SCENES } from "./timeline";

const T = config.theme;
const LATO = "Lato";

let latoLoaded: Promise<unknown> | null = null;
/** Lato from the app's assets (the public dir is this app's folder, so only this reel can load it). */
export function loadLato() {
  latoLoaded ??= Promise.all(
    (["400", "700", "900"] as const).map((weight) => loadFont({ family: LATO, url: staticFile(`assets/lato-${weight}.woff2`), weight })),
  );
  return latoLoaded;
}

export type CallmaskData = { voice: { voice: string; lines: VoiceLine[] } };

const B = (beat: number) => beatFrame(beat, BPM, config.fps);
const sceneLength = (s: { from: number; to: number }) => B(s.to) - B(s.from);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

type Pt = readonly [number, number];

/** The point `t` (0–1) of the way along a polyline, by length. */
function along(pts: readonly Pt[], t: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = Math.max(0, Math.min(1, t)) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] === 0 ? 0 : Math.min(1, d / lens[i]);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

/** Where a looping trip is (0–1), or null before it starts. */
function phase(frame: number, start: number, period: number) {
  return frame < start ? null : ((frame - start) % period) / period;
}

// ── layout (1080×1920) ────────────────────────────────────────────────────────────────────────────────────────────
const CX = 540;
const TOP = { y: 600, h: 170 };
const MID = { y: 870, h: 215, w: 820 };
const BOT = { y: 1200, h: 170 };
const SPLIT_Y = 1140;
const HALF = { w: 470, left: 270, right: 810 };

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Fades a scene in and out so cuts are soft. */
function SceneFade({ length, children }: { length: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10, length - 10, length], [0, 1, 1, 0], clamp);
  const y = interpolate(frame, [0, 14], [24, 0], clamp);
  return <AbsoluteFill style={{ opacity: o, transform: `translateY(${y}px)` }}>{children}</AbsoluteFill>;
}

function Kicker({ text }: { text: string }) {
  return (
    <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: LATO, fontWeight: 900, fontSize: 46, letterSpacing: "0.12em", color: "rgba(255,255,255,.85)" }}>
      {text}
    </div>
  );
}

type NodeKind = "plain" | "ours" | "tt" | "ghost";

/** A box in the diagram, centred on `x`, popping in at `at` and glowing by `glow` (0–1). */
function Node(props: { x: number; y: number; w?: number; h: number; at: number; kind?: NodeKind; glow?: number; title: string; sub?: string; children?: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, props.at, fps);
  const w = props.w ?? 690;
  const kind = props.kind ?? "plain";
  const dark = kind === "tt";
  const ghost = kind === "ghost";
  const glow = props.glow ?? 0;
  const style: CSSProperties = {
    position: "absolute",
    left: props.x - w / 2,
    top: props.y,
    width: w,
    height: props.h,
    boxSizing: "border-box",
    borderRadius: 44,
    padding: "0 30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontFamily: LATO,
    background: ghost ? "transparent" : dark ? T.tt : T.card,
    color: ghost || dark ? "#fff" : T.ink,
    border: ghost ? "6px dashed rgba(255,255,255,.55)" : kind === "plain" ? "none" : `12px solid ${T.orange}`,
    boxShadow: ghost ? "none" : `0 12px 40px rgba(0,0,0,.22), 0 0 0 ${glow * 36}px rgba(236,102,51,${0.45 * glow})`,
    opacity: (ghost ? 0.55 : 1) * Math.min(1, s * 1.5),
    transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`,
    zIndex: 2,
  };
  return (
    <div style={style}>
      <div style={{ fontWeight: 900, fontSize: 52, lineHeight: 1.1 }}>{props.title}</div>
      {props.sub && <div style={{ fontWeight: 400, fontSize: 36, marginTop: 8, color: ghost || dark ? "rgba(255,255,255,.8)" : T.slate }}>{props.sub}</div>}
      {props.children}
    </div>
  );
}

/** A straight connector between two points (horizontal or vertical), drawn in at `at`. */
function Wire({ a, b, at }: { a: Pt; b: Pt; at: number }) {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 12], [0, 1], clamp);
  const vertical = a[0] === b[0];
  const len = vertical ? b[1] - a[1] : b[0] - a[0];
  return (
    <div
      style={{
        position: "absolute",
        left: Math.min(a[0], b[0]) - (vertical ? 4 : 0),
        top: Math.min(a[1], b[1]) - (vertical ? 0 : 4),
        width: vertical ? 8 : Math.abs(len) * k,
        height: vertical ? Math.abs(len) * k : 8,
        borderRadius: 4,
        background: "rgba(255,255,255,.5)",
        zIndex: 1,
      }}
    />
  );
}

/** The message on the move. Drawn under the boxes, so it disappears into one and comes out the other side. */
function Dot({ at: [x, y], opacity }: { at: Pt; opacity: number }) {
  return (
    <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, background: T.orange, boxShadow: "0 0 0 14px rgba(236,102,51,.3)", opacity, zIndex: 1 }} />
  );
}

/**
 * One trip: in to the middle box, a pause there (it glows), then on to the end. Returns the dot's place and the middle
 * box's glow for phase `p`.
 */
function trip(p: number | null, toMid: readonly Pt[], onward: readonly Pt[]): { dot: Pt | null; glow: number; opacity: number } {
  if (p === null) return { dot: null, glow: 0, opacity: 0 };
  const glow = p > 0.3 && p < 0.6 ? Math.sin(((p - 0.3) / 0.3) * Math.PI) : 0;
  if (p < 0.35) return { dot: along(toMid, easeInOut(p / 0.35)), glow, opacity: 1 };
  if (p < 0.55) return { dot: null, glow, opacity: 0 };
  if (p < 0.9) return { dot: along(onward, easeInOut((p - 0.55) / 0.35)), glow, opacity: interpolate(p, [0.82, 0.9], [1, 0], clamp) };
  return { dot: null, glow, opacity: 0 };
}

const midCenter: Pt = [CX, MID.y + MID.h / 2];
const fromTop: Pt[] = [[CX, TOP.y + TOP.h - 20], midCenter];

function Bubble({ me, text, at, width, size = 36 }: { me?: boolean; text: string; at?: number; width?: number | string; size?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = at === undefined ? 1 : pop(frame, at, fps);
  if (at !== undefined && frame < at) return null;
  return (
    <div
      style={{
        alignSelf: me ? "flex-end" : "flex-start",
        width,
        maxWidth: "82%",
        boxSizing: "border-box",
        borderRadius: 34,
        borderBottomRightRadius: me ? 10 : 34,
        borderBottomLeftRadius: me ? 34 : 10,
        padding: "18px 24px",
        border: `3px solid ${me ? T.meBorder : T.themBorder}`,
        background: me ? T.meBg : "#fff",
        color: me ? T.meInk : T.ink,
        fontFamily: LATO,
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1.3,
        textAlign: "left",
        boxShadow: "0 2px 6px rgba(0,0,0,.06)",
        opacity: Math.min(1, s * 1.5),
        transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
        transformOrigin: me ? "right bottom" : "left bottom",
      }}
    >
      {text}
    </div>
  );
}

function Stamp({ right, children, at }: { right?: boolean; children: ReactNode; at?: number }) {
  const frame = useCurrentFrame();
  if (at !== undefined && frame < at) return null;
  return (
    <div style={{ alignSelf: right ? "flex-end" : "flex-start", fontFamily: LATO, fontSize: 30, color: T.slate, margin: "8px 6px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      {children}
    </div>
  );
}

function NoName({ at }: { at?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = at === undefined ? 1 : pop(frame, at, fps);
  return (
    <span style={{ background: T.orange, color: "#fff", fontWeight: 900, fontSize: 32, borderRadius: 99, padding: "6px 20px", transform: `scale(${s})`, display: "inline-block" }}>
      no name?
    </span>
  );
}

// ── subtitles ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Reels-style subtitles: what the voice says, two or three words at a time, bold white with a dark outline, the word
 * being said lit in orange. Word times are spread by length (wordTimes), the same estimate the kit's captions use.
 */
function Subtitles({ lines }: { lines: (VoiceLine & { text: string })[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groups = lines.flatMap((l) => {
    const words = l.text.split(" ");
    const start = beatFrame(l.beat, BPM, fps);
    const at = wordTimes(words, l.seconds).map((t) => start + Math.round(t * fps));
    const end = start + Math.round(l.seconds * fps) + 6;
    return wordGroups(words).map((g, i, all) => ({
      words: g.map((w) => ({ text: words[w], at: at[w] })),
      from: at[g[0]],
      to: i + 1 < all.length ? at[all[i + 1][0]] : end,
    }));
  });
  const group = groups.find((g) => frame >= g.from && frame < g.to);
  if (!group) return null;
  const s = pop(frame, group.from, fps);
  const active = group.words.findLast((w) => frame >= w.at);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1640,
        textAlign: "center",
        fontFamily: LATO,
        fontWeight: 900,
        fontSize: 84,
        lineHeight: 1.1,
        color: "#fff",
        WebkitTextStroke: "14px rgba(0,0,0,.85)",
        paintOrder: "stroke fill",
        textShadow: "0 8px 24px rgba(0,0,0,.35)",
        transform: `scale(${interpolate(s, [0, 1], [0.86, 1])})`,
        opacity: Math.min(1, s * 2),
      }}
    >
      {group.words.map((w, i) => (
        <span key={i} style={{ color: w === active ? T.orange : "#fff" }}>
          {w.text}
          {i < group.words.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
}

// ── scenes ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** 1: the thread a sales user has actually seen, with a bubble on our side that nobody on the team sent. */
function Hook() {
  const frame = useCurrentFrame();
  const appear = 40;
  const tag = B(5.6) - B(SCENES.hook.from) + 10; // as "it came from our call center" starts
  const ring = interpolate(frame, [tag, tag + 12], [0, 1], clamp);
  return (
    <>
      <Kicker text="YOU'VE PROBABLY SEEN THIS" />
      <div style={{ position: "absolute", left: 90, top: 560, width: 900, boxSizing: "border-box", background: "#fff", borderRadius: 44, padding: "30px 36px 20px", display: "flex", flexDirection: "column", boxShadow: "0 18px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 22, marginBottom: 20, borderBottom: `3px solid ${T.themBorder}`, fontFamily: LATO, fontWeight: 900, fontSize: 36, color: T.ink }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: "#cbd5e1" }} />
          Sarah M. · Faucet repair
        </div>
        <div style={{ alignSelf: "center", background: "#f1f5f9", color: "#475569", fontFamily: LATO, fontWeight: 700, fontSize: 24, borderRadius: 99, padding: "6px 22px", marginBottom: 14 }}>Today</div>
        <Bubble text="Is Tuesday 10am still good?" />
        <Stamp>9:41 AM</Stamp>
        <Bubble me text="Yes, see you Tuesday!" />
        <Stamp right>
          9:43 AM · <b style={{ color: "#475569" }}>Jon</b>
        </Stamp>
        <div style={{ alignSelf: "flex-end", maxWidth: "82%", display: "flex", justifyContent: "flex-end", borderRadius: 40, outline: `${ring * 8}px solid rgba(236,102,51,${ring})`, outlineOffset: 10 }}>
          <Bubble me at={appear} text="Your technician arrives at 2pm" size={38} />
        </div>
        <Stamp right at={appear}>
          10:02 AM · <NoName at={appear + 12} />
        </Stamp>
      </div>
      {frame >= tag && (
        <div style={{ position: "absolute", top: 1330, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ background: T.orange, color: "#fff", fontFamily: LATO, fontWeight: 900, fontSize: 42, borderRadius: 99, padding: "16px 40px", transform: `scale(${pop(frame, tag, 30)})` }}>
            Sent by our call center, from the ERP
          </div>
        </div>
      )}
    </>
  );
}

/** 2 and 3: a sender, a stand-in number in the middle, the customer. The same picture both times. */
function Chain(props: { kicker: string; sender: string; senderSub: string; mid: string; midSub: string; kind: NodeKind; tripsFrom: number }) {
  const frame = useCurrentFrame();
  const { glow, dot, opacity } = trip(phase(frame, props.tripsFrom, 105), fromTop, [midCenter, [CX, BOT.y + 60]]);
  return (
    <>
      <Kicker text={props.kicker} />
      <Node x={CX} y={TOP.y} h={TOP.h} at={0} title={props.sender} sub={props.senderSub} />
      <Wire a={[CX, TOP.y + TOP.h]} b={[CX, MID.y]} at={6} />
      <Node x={CX} y={MID.y} w={MID.w} h={MID.h} at={10} kind={props.kind} glow={glow} title={props.mid} sub={props.midSub} />
      <Wire a={[CX, MID.y + MID.h]} b={[CX, BOT.y]} at={16} />
      <Node x={CX} y={BOT.y} h={BOT.h} at={20} title="Customer" sub="real number stays hidden" />
      {dot && <Dot at={dot} opacity={opacity} />}
    </>
  );
}

/** 4: one text, two places. Thumbtack passes it on and files a copy under our business, with nobody's name on it. */
function Copy() {
  const frame = useCurrentFrame();
  const start = 30;
  const period = 120;
  const p = phase(frame, start, period);
  const toLeft: Pt[] = [midCenter, [CX, SPLIT_Y], [HALF.left, SPLIT_Y], [HALF.left, BOT.y + 40]];
  const toRight: Pt[] = [midCenter, [CX, SPLIT_Y], [HALF.right, SPLIT_Y], [HALF.right, BOT.y + 40]];
  const l = trip(p, fromTop, toLeft);
  const r = trip(p, fromTop, toRight);
  const landed = start + Math.round(period * 0.86);
  const half = { y: BOT.y, h: 400, w: HALF.w };
  return (
    <>
      <Kicker text="THE SIDE EFFECT" />
      <Node x={CX} y={TOP.y} h={TOP.h} at={0} title="Our call center" sub="texts from the ERP" />
      <Wire a={[CX, TOP.y + TOP.h]} b={[CX, MID.y]} at={6} />
      <Node x={CX} y={MID.y} w={MID.w} h={MID.h} at={10} kind="tt" glow={l.glow} title="Thumbtack stand-in number" />
      <Wire a={[CX, MID.y + MID.h]} b={[CX, SPLIT_Y]} at={16} />
      <Wire a={[HALF.left, SPLIT_Y]} b={[HALF.right, SPLIT_Y]} at={18} />
      <Wire a={[HALF.left, SPLIT_Y]} b={[HALF.left, BOT.y]} at={22} />
      <Wire a={[HALF.right, SPLIT_Y]} b={[HALF.right, BOT.y]} at={22} />
      <Node x={HALF.left} y={half.y} w={half.w} h={half.h} at={24} title="Customer's phone">
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 24 }}>
          {frame >= landed && (
            <div style={{ alignSelf: "flex-start", maxWidth: "92%", background: "#e5e7eb", color: T.ink, fontFamily: LATO, fontSize: 34, lineHeight: 1.3, textAlign: "left", borderRadius: 30, borderBottomLeftRadius: 8, padding: "16px 22px", transform: `scale(${pop(frame, landed, 30)})`, transformOrigin: "left bottom" }}>
              Your technician arrives at 2pm
            </div>
          )}
        </div>
      </Node>
      <Node x={HALF.right} y={half.y} w={half.w} h={half.h} at={28} title="Thumbtack messages">
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 24 }}>
          <Bubble me at={landed} text="Your technician arrives at 2pm" size={34} />
          <Stamp right at={landed}>
            <NoName at={landed + 10} />
          </Stamp>
        </div>
      </Node>
      {l.dot && <Dot at={l.dot} opacity={l.opacity} />}
      {r.dot && <Dot at={r.dot} opacity={r.opacity} />}
    </>
  );
}

/** 5: with the real number there's no stand-in in the middle, so the text goes straight to the customer. */
function Real() {
  const frame = useCurrentFrame();
  const p = phase(frame, 30, 105);
  const path: Pt[] = [[CX, TOP.y + TOP.h - 20], [CX, SPLIT_Y], [HALF.left, SPLIT_Y], [HALF.left, BOT.y + 40]];
  const dot = p !== null && p < 0.85 ? along(path, easeInOut(p / 0.85)) : null;
  const dotOpacity = p === null ? 0 : interpolate(p, [0.75, 0.85], [1, 0], clamp);
  const { fps } = useVideoConfig();
  const pill = pop(frame, 14, fps);
  return (
    <>
      <Kicker text="BUT NOT ALWAYS" />
      <Node x={CX} y={TOP.y} h={TOP.h} at={0} title="Our call center" sub="texts from the ERP" />
      <Wire a={[CX, TOP.y + TOP.h]} b={[CX, SPLIT_Y]} at={6} />
      <Wire a={[HALF.left, SPLIT_Y]} b={[CX, SPLIT_Y]} at={12} />
      <Wire a={[HALF.left, SPLIT_Y]} b={[HALF.left, BOT.y]} at={16} />
      <div style={{ position: "absolute", left: CX + 40, top: 930, background: "#fff", color: T.ink, fontFamily: LATO, fontWeight: 900, fontSize: 40, borderRadius: 99, padding: "12px 32px", opacity: Math.min(1, pill * 1.5), transform: `scale(${pill})`, transformOrigin: "left center", zIndex: 2 }}>
        real number
      </div>
      <Node x={HALF.left} y={BOT.y} w={HALF.w} h={BOT.h + 30} at={18} title="Customer's phone" sub="gets the text directly" />
      <Node x={HALF.right} y={BOT.y} w={HALF.w} h={BOT.h + 30} at={24} kind="ghost" title="Thumbtack messages" sub="no copy here" />
      {dot && <Dot at={dot} opacity={dotOpacity} />}
    </>
  );
}

/** 6: three lines to remember, then the logo. */
function Recap() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = [
    { title: "Stand-in number", sub: "our text also lands in Thumbtack, with no name", at: 6 },
    { title: "Real number", sub: "our text only goes to the customer", at: 22 },
    { title: "Not something we built", sub: "a side effect of Thumbtack's masking", at: 38, accent: true },
  ];
  const logo = pop(frame, 120, fps);
  return (
    <>
      <Kicker text="IN SHORT" />
      {rows.map((r, i) => {
        const s = pop(frame, r.at, fps);
        return (
          <div
            key={r.title}
            style={{
              position: "absolute",
              left: 90,
              top: 590 + i * 210,
              width: 900,
              height: 180,
              boxSizing: "border-box",
              borderRadius: 40,
              padding: "0 44px",
              background: "#fff",
              border: r.accent ? `10px solid ${T.orange}` : "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              fontFamily: LATO,
              color: T.ink,
              boxShadow: "0 12px 40px rgba(0,0,0,.22)",
              opacity: Math.min(1, s * 1.5),
              transform: `translateX(${(1 - s) * -60}px)`,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 50 }}>{r.title}</div>
            <div style={{ fontWeight: 400, fontSize: 36, color: T.slate, marginTop: 6 }}>{r.accent ? r.sub : `→ ${r.sub}`}</div>
          </div>
        );
      })}
      <Img src={staticFile("assets/logo-light.png")} style={{ position: "absolute", left: CX - 140, top: 1260, width: 280, height: 280, opacity: Math.min(1, logo * 1.5), transform: `scale(${interpolate(logo, [0, 1], [0.85, 1])})` }} />
    </>
  );
}

export function CallmaskReel(data: CallmaskData) {
  loadLato();
  // Each line starts on the config's beat, so timing can be tuned without re-voicing.
  const byId = new Map(config.voice.lines.map((l) => [l.id, l]));
  // Subtitles show the words as written, not as spelled for the voice.
  const lines = (data.voice?.lines ?? []).map((l) => ({ ...l, beat: byId.get(l.id)?.beat ?? l.beat, text: (byId.get(l.id)?.text ?? "").replace("E R P", "ERP") }));
  const scene = (s: { from: number; to: number }) => ({ from: B(s.from), durationInFrames: sceneLength(s), layout: "none" as const });
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, ${T.bg} 0%, ${T.bg2} 100%)`, fontFamily: LATO }}>
      <Sequence {...scene(SCENES.hook)}>
        <SceneFade length={sceneLength(SCENES.hook)}>
          <Hook />
        </SceneFade>
      </Sequence>
      <Sequence {...scene(SCENES.ours)}>
        <SceneFade length={sceneLength(SCENES.ours)}>
          <Chain kicker="FIRST, SOMETHING WE ALREADY DO" sender="Technician" senderSub="calls or texts" mid="Fixtman stand-in number" midSub="(555) 010-0142 · ext 42" kind="ours" tripsFrom={60} />
        </SceneFade>
      </Sequence>
      <Sequence {...scene(SCENES.tt)}>
        <SceneFade length={sceneLength(SCENES.tt)}>
          <Chain kicker="THUMBTACK DOES IT TOO" sender="Our call center" senderSub="texts from the ERP" mid="Thumbtack stand-in number" midSub="looks like the customer's number" kind="tt" tripsFrom={45} />
        </SceneFade>
      </Sequence>
      <Sequence {...scene(SCENES.copy)}>
        <SceneFade length={sceneLength(SCENES.copy)}>
          <Copy />
        </SceneFade>
      </Sequence>
      <Sequence {...scene(SCENES.real)}>
        <SceneFade length={sceneLength(SCENES.real)}>
          <Real />
        </SceneFade>
      </Sequence>
      <Sequence {...scene(SCENES.recap)}>
        <SceneFade length={sceneLength(SCENES.recap) + 20}>
          <Recap />
        </SceneFade>
      </Sequence>
      <Subtitles lines={lines} />
      {lines.map((l) => (
        <Sequence key={l.id} from={beatFrame(l.beat, BPM, fps)} layout="none">
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
