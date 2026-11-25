// What FixtMan's three ads (customers, pros, partners) share beyond the look: the reel itself (scenes, captions, sound), the
// phone playing real footage, the logo scene, photos cut on spoken words, a list ticked off, stamps and the end card.
import { useMemo, type ReactNode } from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { ReelConfig } from "../../src/kit/config";
import { AudioMix } from "../../src/kit/remotion/AudioMix";
import type { VoiceLine } from "../../src/kit/remotion/base";
import { Captions } from "../../src/kit/remotion/Captions";
import { ease, pop, slam } from "../../src/kit/remotion/motion";
import { B, clamp, FONT, FPS, H, HousePhoto, job, loadFixtmanFonts, Mark, Punch, T, W } from "./look";
import { BPM, LEAD } from "./timeline";

export type AdData = { voice: { voice: string; lines: VoiceLine[] } };
export type Scenes<N extends string> = Record<N, { from: number; to: number }>;
export type Ground = { ink: string; hi: string };

/** Caption colours on a light, an orange and a dark ground. */
export const LIGHT: Ground = { ink: T.navy, hi: "#d9480f" };
export const ORANGE: Ground = { ink: T.deep, hi: T.white };
export const DARK: Ground = { ink: T.white, hi: T.peach };

/** Frames and lengths for an ad's own scenes. */
export function timing<N extends string>(scenes: Scenes<N>) {
  return {
    /** A moment in seconds as a frame inside a scene. */
    inScene: (scene: N, seconds: number) => Math.round(seconds * FPS) - B(scenes[scene].from),
    lengthOf: (scene: N) => B(scenes[scene].to) - B(scenes[scene].from),
    sceneAt: (frame: number) => (Object.keys(scenes) as N[]).findLast((n) => frame >= B(scenes[n].from)) ?? (Object.keys(scenes)[0] as N),
  };
}

/** Frames a scene stays under the next one's opening house. */
const TAIL = 14;

/** The whole ad. A part that runs on under later lines names the scene it lasts through. */
export function AdReel<N extends string>(props: {
  data: AdData;
  config: ReelConfig;
  scenes: Scenes<N>;
  grounds: Record<N, Ground>;
  parts: [N, () => ReactNode, N?][];
  /** Scenes that open with the house wipe. */
  wiped: N[];
  /** Lines whose picture already shows the words. */
  skip?: string[];
}) {
  loadFixtmanFonts();
  const { config, scenes, grounds } = props;
  const frame = useCurrentFrame();
  const { sceneAt } = timing(scenes);
  // A wiped-in scene's house only reaches the caption some frames after its cut, so its colours wait for that.
  const now = sceneAt(frame);
  const ground = grounds[props.wiped.includes(now) ? sceneAt(frame - 4) : now];
  // Each line starts on the config's beat, so timing can be tuned without re-voicing.
  const lines = useMemo(() => {
    const byId = new Map(config.voice.lines.map((l) => [l.id, l]));
    return props.data.voice.lines.map((l) => ({ ...l, beat: byId.get(l.id)?.beat ?? l.beat, caption: byId.get(l.id)?.caption ?? l.caption }));
  }, [props.data.voice, config]);
  const spoken = lines.map((l) => ({ ...l, beat: l.beat + LEAD * (BPM / 60), seconds: l.seconds - LEAD }));
  return (
    <AbsoluteFill style={{ background: T.bg, fontFamily: FONT }}>
      {props.parts.map(([name, Part, through]) => {
        const from = B(scenes[name].from), to = B(scenes[through ?? name].to);
        return (
          <Sequence key={name} from={from} durationInFrames={Math.min(to + TAIL, config.seconds * FPS) - from} layout="none">
            <Part />
          </Sequence>
        );
      })}
      <Captions lines={spoken} bpm={BPM} top={270} size={74} color={ground.ink} highlight={ground.hi} font={FONT} skip={props.skip} hold={8} />
      <AudioMix music={config.music.file} lines={lines} bpm={BPM} duck={0.24} musicVolume={0.7} voiceVolume={1.25} />
    </AbsoluteFill>
  );
}

// ── The logo ─────────────────────────────────────────────────────────────────────────────────────────

export function Brand() {
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
export function Dust({ at, y }: { at: number; y: number }) {
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

/** The logo, the address and a phone number, held to the end. */
export function EndCard(props: { at: number; length: number; url: string; phone: string; tagline: string }) {
  const frame = useCurrentFrame();
  const { at } = props;
  const word = slam(frame, at + 10, FPS), url = slam(frame, at + 22, FPS), tel = pop(frame, at + 32, FPS);
  const hold = interpolate(frame, [at + 20, props.length], [0, 1], clamp);
  const beat = frame > at + 40 ? Math.max(0, 1 - ((frame - at - 40) % 30) / 9) : 0;
  if (frame < at) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", transform: `scale(${1 + hold * 0.035})` }}>
      <div style={{ position: "absolute", top: 500 }}><Mark at={at} size={410} quick /></div>
      <Img src={staticFile("assets/logo-word.png")} style={{ position: "absolute", top: 965, width: 720, opacity: Math.min(1, word * 3), transform: `scale(${interpolate(word, [0, 1], [1.5, 1])})` }} />
      {frame >= at + 22 && (
        <div style={{ position: "absolute", top: 1130, padding: props.url.length > 14 ? "30px 50px" : "32px 70px", borderRadius: 99, background: "#e2551f", color: T.white, fontFamily: FONT, fontWeight: 900, fontSize: props.url.length > 22 ? 50 : props.url.length > 14 ? 60 : 92, lineHeight: 1.1, letterSpacing: "-0.03em", boxShadow: "0 30px 60px rgba(242,106,53,.4)", transform: `scale(${interpolate(url, [0, 1], [1.6, 1]) + beat * 0.035})`, opacity: Math.min(1, url * 3), whiteSpace: "nowrap" }}>{props.url}</div>
      )}
      <div style={{ position: "absolute", top: props.url.length > 14 ? 1310 : 1345, fontFamily: FONT, fontWeight: 900, fontSize: 68, color: T.navy, letterSpacing: "-0.02em", opacity: tel, transform: `translateY(${(1 - tel) * 40}px)` }}>{props.phone}</div>
      <div style={{ position: "absolute", top: props.url.length > 14 ? 1410 : 1440, fontFamily: FONT, fontWeight: 700, fontSize: 44, color: "#466675", opacity: tel }}>{props.tagline}</div>
    </AbsoluteFill>
  );
}

// ── Photos, lists, stamps ────────────────────────────────────────────────────────────────────────────

/** One photo per spoken word. `words` carry the second each is said at. */
export function PhotoWords({ words, from }: { words: readonly { at: number; word: string; photo: string }[]; from: number }) {
  const frame = useCurrentFrame();
  const starts = words.map((w, i) => (i === 0 ? 0 : Math.round(w.at * FPS) - B(from)));
  const i = Math.max(0, starts.findLastIndex((s) => frame >= s));
  const at = starts[i], w = words[i];
  const bg = [T.peach, T.bg, T.navy][i % 3];
  const s = slam(frame, at, FPS), word = slam(frame, at + 1, FPS);
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div style={{ position: "absolute", top: 350, width: W, textAlign: "center", fontFamily: FONT, fontWeight: 900, letterSpacing: "-0.04em", color: bg === T.navy ? T.white : T.deep, fontSize: w.word.length > 9 ? 136 : w.word.length > 8 ? 158 : 184, whiteSpace: "nowrap", transform: `scale(${interpolate(word, [0, 1], [1.5, 1])})`, opacity: Math.min(1, word * 3) }}>{w.word}</div>
      <div key={i} style={{ position: "absolute", left: (W - 900) / 2, top: 660, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])}) rotate(${(1 - s) * (i % 2 ? 5 : -5)}deg)` }}>
        <HousePhoto src={job(w.photo)} width={900} height={860} at={at} zoom={0.1} />
      </div>
    </AbsoluteFill>
  );
}

/** A list ticked off, a row per cue (frames in the scene), with a photo above that changes with it. */
export function Checklist({ rows, at }: { rows: { text: string; photo: string }[]; at: number[] }) {
  const frame = useCurrentFrame();
  const i = Math.max(0, at.findLastIndex((a) => frame >= a));
  const photoAt = i === 0 ? 0 : at[i];
  const s = slam(frame, photoAt, FPS);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 1000px at 50% 45%, #2b5266, ${T.navy} 70%)` }}>
      <Punch>
        <div key={i} style={{ position: "absolute", left: 190, top: 590, transform: `scale(${interpolate(s, [0, 1], [0.86, 1])})` }}>
          <HousePhoto src={job(rows[i].photo)} width={700} height={550} at={photoAt} />
        </div>
        <div style={{ position: "absolute", left: 150, top: 1190 }}>
          {rows.map((row, k) => {
            const on = frame >= at[k];
            const t = pop(frame, at[k], FPS);
            return (
              <div key={row.text} style={{ display: "flex", alignItems: "center", gap: 34, height: 122, fontFamily: FONT, fontWeight: 900, fontSize: 74, letterSpacing: "-0.03em", color: on ? T.white : "rgba(255,255,255,.3)", whiteSpace: "nowrap" }}>
                <Tick on={on} t={t} size={84} />
                {row.text}
              </div>
            );
          })}
        </div>
      </Punch>
    </AbsoluteFill>
  );
}

/** A box that gets ticked. `t` is how far its pop has come. */
export function Tick({ on, t, size, off = "rgba(255,255,255,.3)" }: { on: boolean; t: number; size: number; off?: string }) {
  return (
    <span style={{ width: size, height: size, flex: "none", boxSizing: "border-box", borderRadius: size * 0.28, border: on ? "none" : `${size / 12}px solid ${off}`, background: on ? T.orange : "transparent", display: "grid", placeItems: "center", transform: `scale(${on ? interpolate(t, [0, 1], [1.6, 1]) : 1})` }}>
      {on && (
        <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 56 56"><path d="M8 30 L22 44 L48 13" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="70" strokeDashoffset={70 * (1 - Math.min(1, t))} /></svg>
      )}
    </span>
  );
}

/** Words stamped on, big to small, with a slight tilt. */
export function Stamp(props: { at: number; top: number; text: string; size?: number; tilt?: number; bg?: string; ink?: string }) {
  const frame = useCurrentFrame();
  if (frame < props.at) return null;
  const s = slam(frame, props.at, FPS);
  return (
    <div style={{ position: "absolute", top: props.top, width: W, display: "grid", placeItems: "center" }}>
      <div style={{ padding: "26px 48px", background: props.bg ?? T.navy, color: props.ink ?? T.white, fontFamily: FONT, fontWeight: 900, fontSize: props.size ?? 84, letterSpacing: "-0.03em", lineHeight: 1.05, borderRadius: 24, textAlign: "center", transform: `scale(${interpolate(s, [0, 1], [2, 1])}) rotate(${props.tilt ?? -4}deg)`, opacity: Math.min(1, s * 3), boxShadow: "0 30px 50px rgba(20,20,20,.3)", whiteSpace: "nowrap" }}>{props.text}</div>
    </div>
  );
}

// ── The phone ────────────────────────────────────────────────────────────────────────────────────────

export const PHONE = { width: 640, left: (W - 640) / 2, top: 540, bezel: 17 };
const PX = (PHONE.width - PHONE.bezel * 2) / 390;

/** Zooms the stage onto a point of the phone's screen, in CSS px of the 390-wide page. */
export function zoom(x: number, y: number, z: number, k: number, middle = 1040) {
  const p = { x: PHONE.left + PHONE.bezel + x * PX, y: PHONE.top + PHONE.bezel + y * PX };
  return { transform: `translate(${(W / 2 - p.x) * k}px, ${(middle - p.y) * k}px) scale(${1 + (z - 1) * k})`, transformOrigin: `${p.x}px ${p.y}px` };
}

/** A phone playing pieces of a clip back to back: [frame it starts on, second of the clip, speed]. */
export function Phone({ clip, cuts, length }: { clip: string; cuts: [number, number, number][]; length: number }) {
  const sw = PHONE.width - PHONE.bezel * 2, sh = Math.round((sw * 1688) / 780);
  return (
    <div style={{ width: PHONE.width, height: sh + PHONE.bezel * 2, borderRadius: 80, padding: PHONE.bezel, background: `linear-gradient(150deg, #35566a, ${T.deep} 55%, #24475a)`, boxShadow: "0 50px 90px rgba(60,20,0,.35)" }}>
      <div style={{ position: "relative", width: sw, height: sh, borderRadius: 63, overflow: "hidden", background: T.white }}>
        {cuts.map(([from, startAt, rate], i) => (
          <Sequence key={i} from={from} durationInFrames={(cuts[i + 1]?.[0] ?? length) - from} layout="none">
            <OffthreadVideo src={staticFile(`out/clips/${clip}.mp4`)} startFrom={Math.round(startAt * FPS)} playbackRate={rate} muted style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
          </Sequence>
        ))}
      </div>
    </div>
  );
}

/** Keeps a zoomed phone from running up under the caption. */
export function CaptionBand({ color }: { color: string }) {
  return <AbsoluteFill style={{ background: `linear-gradient(${color} 26.5%, ${color}00 29%)`, height: H }} />;
}

export { ease };
