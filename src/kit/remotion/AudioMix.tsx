// The music and the voice lines on the timeline. The music dips under each line (to `duck`) and comes back after it.
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { beatFrame, type VoiceLine } from "./base";

export function AudioMix(props: { music: string; lines: VoiceLine[]; bpm: number; duck?: number; voiceVolume?: number; musicVolume?: number }) {
  const { fps } = useVideoConfig();
  const duck = props.duck ?? 0.28;
  const base = props.musicVolume ?? 0.9;
  const spans = props.lines.map((l) => {
    const from = beatFrame(l.beat, props.bpm, fps);
    return [from, from + Math.round(l.seconds * fps)] as const;
  });
  const volume = (f: number) => {
    let g = 1;
    for (const [a, b] of spans) {
      const inside = interpolate(f, [a - 4, a, b, b + 8], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      g = Math.min(g, 1 - inside * (1 - duck));
    }
    return base * g;
  };
  return (
    <>
      <Audio src={staticFile(props.music)} volume={volume} />
      {props.lines.map((l) => (
        <Sequence key={l.id} from={beatFrame(l.beat, props.bpm, fps)} layout="none">
          <Audio src={staticFile(l.file)} volume={props.voiceVolume ?? 1} />
        </Sequence>
      ))}
    </>
  );
}
