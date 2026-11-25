// The kop.it reel, "deep forest": a ₱ coin drops into a pot and grows a plant, which becomes the app's own plant; then
// logging, missions, the household, the night sky, History and the gallery, a short beat for the morning note, and the
// bloom becomes the logo. Every scene boundary and hit sits on the beat grid in timeline.ts.
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AudioMix } from "../../src/kit/remotion/AudioMix";
import { beatFrame, FONT, type ReelData } from "../../src/kit/remotion/base";
import { Captions } from "../../src/kit/remotion/Captions";
import { EndCard } from "../../src/kit/remotion/EndCard";
import { ease, pop, slam } from "../../src/kit/remotion/motion";
import { NoteCard } from "../../src/kit/remotion/NoteCard";
import { PhoneFrame } from "../../src/kit/remotion/PhoneFrame";
import { Plant } from "../../src/kit/remotion/Plant";
import { config } from "./reel.config";
import { BPM, CUES, SCENES } from "./timeline";

const T = config.theme;

export type KopitData = ReelData & {
  note: { real: boolean; date: string; note: { lines: { emoji: string; text: string }[]; tip: string | null } };
};

/** Beat → frame at this reel's tempo. */
const B = (beat: number) => beatFrame(beat, BPM, config.fps);

/** A quick punch-in when a scene cuts in on its beat. */
function usePunch(from: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(slam(frame, from, fps), [0, 1], [1.07, 1]);
}

function Background() {
  const frame = useCurrentFrame();
  const glow = 0.5 + 0.5 * Math.sin(frame / 25);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1100px 900px at 50% ${45 + glow * 4}%, #2c4a36 0%, ${T.bg} 60%), ${T.bg}`,
      }}
    />
  );
}

/** Where the hook's plant stands: its SVG box (Plant is 120×150, the pot rim at y 122 of 150). */
const HOOK_PLANT = { width: 680, top: 560 };
const RIM_Y = HOOK_PLANT.top + (122 / 150) * HOOK_PLANT.width * 1.25;

/** A gold ₱ coin. */
function Coin({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="coin" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fbeaa0" />
          <stop offset="0.55" stopColor="#e6b93e" />
          <stop offset="1" stopColor="#b5861c" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#coin)" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="#fff3c4" strokeOpacity="0.55" strokeWidth="2.5" />
      <text x="50" y="66" textAnchor="middle" fontFamily={FONT} fontWeight={1000} fontSize="46" fill="#7a5a08">
        ₱
      </text>
    </svg>
  );
}

/** Hook: a coin tumbles down in slow motion, drops into a pot (soil puffs), and a plant shoots up and flowers. */
function CoinHook() {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const land = B(CUES.coinLand);
  // Falling: slow at first, faster near the pot (gravity), turning as it goes.
  const t = Math.min(1, frame / land);
  const y = -260 + (RIM_Y - 60 + 260) * (0.15 * t + 0.85 * t * t);
  const sink = interpolate(frame, [land, land + 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const potIn = pop(frame, 0, fps);
  const grow = ease(frame, B(CUES.sprout), B(CUES.hookFlower));
  const bloom = pop(frame, B(CUES.hookFlower), fps);
  const thud = frame >= land ? interpolate(frame, [land, land + 3, land + 10], [1, 0.94, 1], { extrapolateRight: "clamp" }) : 1;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: width / 2 - HOOK_PLANT.width / 2, top: HOOK_PLANT.top, transform: `scaleY(${thud})`, transformOrigin: `50% ${RIM_Y - HOOK_PLANT.top}px` }}>
        <Plant leaves={8} grow={grow} bloom={bloom} width={HOOK_PLANT.width} potIn={potIn} stem={T.leafDeep} />
      </div>
      <Puff at={land} x={width / 2} y={RIM_Y - 10} />
      {sink > 0 && (
        <div style={{ position: "absolute", left: width / 2 - 150, top: y - 150, transform: `rotate(${t * 520}deg) scale(${(1.15 - t * 0.35) * sink})` }}>
          <Coin size={300} />
        </div>
      )}
      <Sparkles at={B(CUES.hookFlower)} />
    </AbsoluteFill>
  );
}

/** Soil bursting up from the pot when the coin lands. */
function Puff({ at, x, y }: { at: number; x: number; y: number }) {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + 24) return null;
  const k = (frame - at) / 24;
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = Math.PI * (1.1 + (i / 9) * 0.8);
        const dist = 60 + (i % 3) * 40;
        const px = x + Math.cos(angle) * dist * k * 2.2;
        const py = y + Math.sin(angle) * dist * k * 2.2 + 260 * k * k;
        const r = 10 + (i % 4) * 5;
        return <div key={i} style={{ position: "absolute", left: px - r, top: py - r, width: r * 2, height: r * 2, borderRadius: "50%", background: i % 2 ? "#8a5a3a" : "#a8724a", opacity: 1 - k }} />;
      })}
    </>
  );
}

/** The drawn plant becomes the app's plant: the garden screen starts zoomed in on its plant and pulls back. */
function Match() {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const phone = { left: (width - 600) / 2, top: 470, width: 600 };
  // The app's plant in the phone (screen 566 px wide for 390 CSS px; its plant sits near CSS (65, 330)).
  const scale = 566 / 390;
  const p = { x: 17 + 65 * scale, y: 17 + 330 * scale };
  const target = { x: width / 2, y: HOOK_PLANT.top + HOOK_PLANT.width * 0.62 };
  const z = ease(frame, 4, 26);
  const s = 2.6 + (1 - 2.6) * z;
  const dx = (target.x - (phone.left + p.x)) * (1 - z);
  const dy = (target.y - (phone.top + p.y)) * (1 - z);
  const fade = interpolate(frame, [0, 10], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: phone.left, top: phone.top, transformOrigin: `${p.x}px ${p.y}px`, transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) }}>
        <PhoneFrame src="out/clips/garden.mp4" width={phone.width} />
      </div>
      {fade > 0 && (
        <div style={{ position: "absolute", left: width / 2 - HOOK_PLANT.width / 2, top: HOOK_PLANT.top, opacity: fade, transform: `scale(${1 + (1 - fade) * 0.3})` }}>
          <Plant leaves={8} grow={1} bloom={1} width={HOOK_PLANT.width} stem={T.leafDeep} />
        </div>
      )}
    </AbsoluteFill>
  );
}

/** The morning note, briefly: the phone's card and one line of it. */
function NoteBeat({ data }: { data: KopitData }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const punch = usePunch(0);
  const enter = pop(frame, 0, fps);
  const first = data.note.note.lines[0];
  return (
    <AbsoluteFill style={{ transform: `scale(${punch})` }}>
      <div style={{ position: "absolute", left: width / 2 - 280, top: 480, transform: `translateY(${(1 - enter) * 400}px) rotate(${(1 - enter) * -8}deg)` }}>
        <PhoneFrame src="out/clips/morning.mp4" width={560} startAt={0.3} tilt={-2} />
      </div>
      <div style={{ position: "absolute", left: (width - 880) / 2, top: 1230 }}>
        <NoteCard
          start={8}
          width={880}
          title="This morning's note"
          sample={!data.note.real}
          speed={30}
          lines={[{ emoji: first?.emoji, text: first?.text ?? "" }]}
          colors={{ card: T.card, ink: T.cardInk, accent: T.leafDeep, soft: "#d9ecd9" }}
        />
      </div>
    </AbsoluteFill>
  );
}

/** A burst of ✦ around the plant when it flowers. */
function Sparkles({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const spots = [
    [210, 560, 70], [880, 640, 54], [160, 900, 40], [930, 980, 64], [820, 470, 36],
  ];
  return (
    <>
      {spots.map(([x, y, size], i) => {
        const s = pop(frame, at + i * 2, fps);
        const fade = interpolate(frame, [at + 14 + i * 2, at + 34 + i * 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, fontSize: size, color: i % 2 ? T.pink : T.leaf, opacity: s * fade, transform: `scale(${s}) rotate(${s * 90}deg)` }}>
            ✦
          </div>
        );
      })}
    </>
  );
}

/** Missions tick on, one per beat, and the plant beside the phone flowers. */
function Garden({ data }: { data: KopitData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f0 = B(SCENES.garden.from);
  const punch = usePunch(0);
  // The real missions from the capture; one about vices never headlines an ad.
  const missions = ((data.capture.kept.missions as string[] | undefined) ?? []).filter((m) => !/vices?/i.test(m)).slice(0, 3);
  const ticks = CUES.ticks.map((b) => pop(frame, B(b) - f0, fps));
  const bloom = pop(frame, B(CUES.flower) - f0, fps);
  return (
    <AbsoluteFill style={{ transform: `scale(${punch})` }}>
      <div style={{ position: "absolute", left: 440, top: 470 }}>
        <PhoneFrame src="out/clips/garden.mp4" width={560} startAt={0.1} playbackRate={0.85} tilt={3} />
      </div>
      <div style={{ position: "absolute", left: 20, top: 560 }}>
        <Plant leaves={10 + ticks.filter((t) => t > 0.5).length * 2} grow={1} bloom={bloom} width={430} stem={T.leafDeep} />
      </div>
      <div style={{ position: "absolute", left: 60, top: 1180, display: "flex", flexDirection: "column", gap: 22 }}>
        {missions.map((m, i) => {
          const t = ticks[i];
          if (frame < B(CUES.ticks[i]) - f0) return null;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "22px 34px 22px 22px",
                borderRadius: 99,
                background: T.card,
                color: T.cardInk,
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 40,
                boxShadow: "0 24px 60px rgba(0,0,0,.4)",
                transform: `translateX(${(1 - t) * -120}px) scale(${interpolate(t, [0, 1], [0.7, 1])})`,
                opacity: Math.min(1, t * 2),
                alignSelf: "flex-start",
              }}
            >
              <span style={{ width: 58, height: 58, borderRadius: 99, background: T.leafDeep, color: "#fff", display: "grid", placeItems: "center", fontSize: 36 }}>✓</span>
              {m}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** A pill that pops in on its frame (relative to the scene). */
function Pill(props: { at: number; text: string; bg: string; ink: string; size?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < props.at) return null;
  const s = pop(frame, props.at, fps);
  return (
    <div
      style={{
        display: "inline-block",
        padding: "18px 34px",
        borderRadius: 99,
        background: props.bg,
        color: props.ink,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: props.size ?? 44,
        boxShadow: "0 24px 60px rgba(0,0,0,.4)",
        opacity: Math.min(1, s * 2),
        transform: `scale(${interpolate(s, [0, 1], [0.5, 1])}) rotate(${(1 - s) * -8}deg)`,
      }}
    >
      {props.text}
    </div>
  );
}

/** Logging ₱285: the keypad flow, and "works offline" popping on its beat. */
function Add() {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const f0 = B(SCENES.add.from);
  const punch = usePunch(0);
  const enter = pop(frame, 0, fps);
  return (
    <AbsoluteFill style={{ transform: `scale(${punch})` }}>
      <div style={{ position: "absolute", left: width / 2 - 300, top: 470, transform: `translateY(${(1 - enter) * 500}px)` }}>
        <PhoneFrame src="out/clips/add.mp4" width={600} playbackRate={1.15} tilt={-2} />
      </div>
      <div style={{ position: "absolute", right: 40, top: 1300 }}>
        <Pill at={B(CUES.offline) - f0} text="✓ Works offline" bg={T.leaf} ink={T.bg} size={48} />
      </div>
    </AbsoluteFill>
  );
}

/** Two phones, two people: the flower shelf on one, logging on the other. */
function People() {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const f0 = B(SCENES.people.from);
  const punch = usePunch(0);
  const left = pop(frame, 0, fps);
  const right = pop(frame, 3, fps);
  return (
    <AbsoluteFill style={{ transform: `scale(${punch})` }}>
      <div style={{ position: "absolute", left: 40, top: 560, transform: `translateX(${(1 - left) * -260}px)` }}>
        <PhoneFrame src="out/clips/people.mp4" width={480} playbackRate={0.9} tilt={-6} />
      </div>
      <div style={{ position: "absolute", left: width - 520, top: 640, transform: `translateX(${(1 - right) * 260}px)` }}>
        <PhoneFrame src="out/clips/add.mp4" width={480} startAt={0.3} tilt={6} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 1500 }}>
        <Pill at={B(CUES.people[0]) - f0} text="Maya" bg="#f2b04c" ink={T.bg} />
      </div>
      <div style={{ position: "absolute", right: 120, top: 1560 }}>
        <Pill at={B(CUES.people[1]) - f0} text="Leo" bg={T.pink} ink={T.bg} />
      </div>
    </AbsoluteFill>
  );
}

/** The garden at night: the background deepens and stars twinkle round the phone. */
function Night() {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const punch = usePunch(0);
  const dusk = ease(frame, 0, 12);
  const stars = [
    [120, 560, 34], [930, 520, 26], [80, 1000, 22], [980, 900, 38], [170, 1380, 28], [920, 1320, 24], [520, 420, 20],
  ];
  return (
    <AbsoluteFill style={{ transform: `scale(${punch})` }}>
      <AbsoluteFill style={{ background: "radial-gradient(900px 900px at 50% 40%, #1f3550 0%, #0f1a24 70%)", opacity: dusk * 0.9 }} />
      {stars.map(([x, y, size], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, fontSize: size, color: i % 2 ? "#f4e6b0" : T.ink, opacity: dusk * (0.4 + 0.6 * Math.abs(Math.sin((frame + i * 9) / 7))) }}>
          ✦
        </div>
      ))}
      <div style={{ position: "absolute", left: (width - 600) / 2, top: 470 }}>
        <PhoneFrame src="out/clips/night.mp4" width={600} playbackRate={0.88} />
      </div>
    </AbsoluteFill>
  );
}

/** History's greenhouse scrolling by, a little faster than life. */
function History() {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const punch = usePunch(0);
  const drift = ease(frame, 0, B(SCENES.history.to) - B(SCENES.history.from));
  return (
    <AbsoluteFill style={{ transform: `scale(${punch * (1 + drift * 0.05)})` }}>
      <div style={{ position: "absolute", left: (width - 660) / 2, top: 460 }}>
        <PhoneFrame src="out/clips/history.mp4" width={660} playbackRate={1.5} tilt={2} />
      </div>
    </AbsoluteFill>
  );
}

/** The gallery building in, sped up into a time-lapse. */
function Gallery() {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const punch = usePunch(0);
  const zoom = ease(frame, 0, B(SCENES.gallery.to) - B(SCENES.gallery.from));
  return (
    <AbsoluteFill style={{ transform: `scale(${punch * (1 + zoom * 0.06)})` }}>
      <div style={{ position: "absolute", left: (width - 640) / 2, top: 470 }}>
        <PhoneFrame src="out/clips/gallery.mp4" width={640} startAt={0.85} playbackRate={1.7} />
      </div>
    </AbsoluteFill>
  );
}

/** A few ✦ drifting slowly upwards while the logo holds, fading in and out on their own timing. */
function Drift({ from }: { from: number }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame < from) return null;
  const t = frame - from;
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const period = 150 + ((i * 37) % 90);
        const life = ((t + i * 41) % period) / period;
        const x = ((i * 233) % (width - 160)) + 80 + Math.sin((t + i * 20) / 40) * 30;
        const y = height * 0.9 - life * height * 0.75;
        const fadeIn = interpolate(t, [0, 30], [0, 1], { extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{ position: "absolute", left: x, top: y, fontSize: 22 + ((i * 13) % 26), color: i % 3 ? T.leaf : T.pink, opacity: Math.sin(life * Math.PI) * 0.5 * fadeIn, transform: `rotate(${t * 0.8 + i * 30}deg)` }}
          >
            ✦
          </div>
        );
      })}
    </>
  );
}

/** The bloom shrinks into the wordmark, which then holds with a slow push-in. */
function End() {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const length = B(SCENES.end.to) - B(SCENES.end.from);
  const bloom = pop(frame, 0, fps);
  const shrink = ease(frame, 8, 18);
  const hold = interpolate(frame, [20, length], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Drift from={24} />
      {shrink < 1 && (
        <div style={{ position: "absolute", left: width / 2 - 250, top: 520, transform: `scale(${1 - shrink * 0.9}) translateY(${shrink * 200}px)`, opacity: 1 - shrink }}>
          <Plant leaves={14} grow={1} bloom={bloom} width={500} stem={T.leafDeep} />
        </div>
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120, transform: `scale(${1 + hold * 0.07})` }}>
        <EndCard
          start={12}
          mark={["kop", "it"]}
          tagline={config.tagline}
          url={config.url}
          colors={{ ink: T.ink, leaf: T.leaf, pillBg: T.leaf, pillInk: T.bg }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function KopitReel(data: KopitData) {
  const scene = (s: { from: number; to: number }) => ({ from: B(s.from), durationInFrames: B(s.to) - B(s.from) });
  return (
    <AbsoluteFill style={{ background: T.bg, fontFamily: FONT }}>
      <Background />
      <Sequence {...scene(SCENES.hook)} layout="none">
        <CoinHook />
      </Sequence>
      <Sequence {...scene(SCENES.match)} layout="none">
        <Match />
      </Sequence>
      <Sequence {...scene(SCENES.add)} layout="none">
        <Add />
      </Sequence>
      <Sequence {...scene(SCENES.garden)} layout="none">
        <Garden data={data} />
      </Sequence>
      <Sequence {...scene(SCENES.people)} layout="none">
        <People />
      </Sequence>
      <Sequence {...scene(SCENES.night)} layout="none">
        <Night />
      </Sequence>
      <Sequence {...scene(SCENES.history)} layout="none">
        <History />
      </Sequence>
      <Sequence {...scene(SCENES.gallery)} layout="none">
        <Gallery />
      </Sequence>
      <Sequence {...scene(SCENES.note)} layout="none">
        <NoteBeat data={data} />
      </Sequence>
      <Sequence {...scene(SCENES.end)} layout="none">
        <End />
      </Sequence>
      <Captions lines={data.voice.lines} bpm={BPM} top={250} size={92} color={T.ink} highlight={T.leaf} skip={["brand"]} />
      <AudioMix music={config.music.file} lines={data.voice.lines} bpm={BPM} />
    </AbsoluteFill>
  );
}
