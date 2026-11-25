// One continuous take of the real page. A camera eases to whatever each line is about (its box was measured during
// capture), with the line's audio and caption starting where capture reached it.
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../../src/kit/remotion/base";
import { ease, lerp } from "../../src/kit/remotion/motion";
import type { Box, Cue } from "./app";
import { config, MARK_SIZE } from "./reel.config";

export type LeadSalesData = {
  voice: { lines: { id: string; caption: string; file: string; seconds: number }[] };
  clip: string;
  seconds: number;
  cues: Cue[];
};

const { yellow, bg, white, ink } = config.theme;
const VIEW = { width: 1440, height: 810 };
const TO_VIDEO = config.width / VIEW.width;
const MAX_ZOOM = 2.1;
const CAMERA_FRAMES = 24;
const CARD_SECONDS = 2.4;

type Camera = { scale: number; x: number; y: number; focus: number };
const FULL: Camera = { scale: 1, x: VIEW.width / 2, y: VIEW.height / 2, focus: 0 };

function cameraFor(box: Box | null): Camera {
  if (!box) return FULL;
  // Room around the box, and more below it, where the caption sits.
  const scale = Math.max(1, Math.min(VIEW.width / (box.width + 80), VIEW.height / (box.height + 170), MAX_ZOOM));
  return { scale, x: box.x + box.width / 2, y: box.y + box.height / 2 + 30 / scale, focus: 1 };
}

function cameraAt(frame: number, cues: Cue[], fps: number): Camera {
  let camera = FULL;
  for (const cue of cues) {
    const start = cue.t * fps;
    if (frame < start) break;
    const target = cameraFor(cue.focus);
    const t = ease(frame, start, start + CAMERA_FRAMES);
    camera = {
      scale: lerp(camera.scale, target.scale, t),
      x: lerp(camera.x, target.x, t),
      y: lerp(camera.y, target.y, t),
      focus: lerp(camera.focus, target.focus, t),
    };
  }
  return camera;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function Caption({ text, frames }: { text: string; frames: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6, frames - 6, frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rise = interpolate(frame, [0, 8], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 44 }}>
      <div
        style={{
          opacity,
          transform: `translateY(${rise}px)`,
          background: "rgba(15,23,42,.94)",
          color: white,
          borderRadius: 16,
          padding: "16px 30px",
          fontFamily: FONT,
          fontSize: 38,
          fontWeight: 700,
        }}
      >
        {text.split("*").map((part, i) => (
          <span key={i} style={{ color: i % 2 ? yellow : white }}>
            {part}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function FullCard({ title, subtitle, opacity }: { title: string; subtitle: string; opacity: number }) {
  return (
    <AbsoluteFill style={{ opacity, background: bg, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 96, fontWeight: 900, color: white }}>{title}</div>
      <div style={{ marginTop: 18, width: 120, height: 8, borderRadius: 4, background: yellow }} />
      <div style={{ marginTop: 26, fontSize: 40, fontWeight: 600, color: yellow }}>{subtitle}</div>
    </AbsoluteFill>
  );
}

export function LeadSalesReel(props: LeadSalesData) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const camera = cameraAt(frame, props.cues, fps);
  const scale = camera.scale;
  const left = clamp(width / 2 - camera.x * TO_VIDEO * scale, width - width * scale, 0);
  const top = clamp(height / 2 - camera.y * TO_VIDEO * scale, height - height * scale, 0);
  const cardFrames = CARD_SECONDS * fps;
  const titleOpacity = interpolate(frame, [cardFrames - 12, cardFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endOpacity = interpolate(frame, [durationInFrames - cardFrames, durationInFrames - cardFrames + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${left}px, ${top}px) scale(${scale})` }}>
        <OffthreadVideo src={staticFile(props.clip)} muted style={{ width, height }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: (MARK_SIZE + 2) * TO_VIDEO, height: (MARK_SIZE + 2) * TO_VIDEO, background: bg }} />
      </AbsoluteFill>

      {props.cues.map((cue) => {
        const line = props.voice.lines.find((l) => l.id === cue.id);
        if (!line) return null;
        const frames = Math.round(line.seconds * fps);
        return (
          <Sequence key={cue.id} from={Math.round(cue.t * fps)} durationInFrames={frames + 6} layout="none">
            <Audio src={staticFile(line.file)} />
            <Caption text={line.caption} frames={frames + 6} />
          </Sequence>
        );
      })}

      <div
        style={{
          position: "absolute",
          top: 28,
          right: 32,
          padding: "8px 18px",
          borderRadius: 999,
          background: yellow,
          color: ink,
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 800,
        }}
      >
        Test data
      </div>

      <FullCard title={config.title} subtitle={config.tagline} opacity={titleOpacity} />
      <FullCard title={config.title} subtitle="Three views. Clear terms. Calendar comparisons." opacity={endOpacity} />
    </AbsoluteFill>
  );
}
