// Draws a reconstruction pose into the frame. One Club (one WebGL context) per render tab, shared by every shot, so
// crossfades and cuts never pile up contexts; each shot copies the drawn frame into its own 2D canvas.
import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Club, type Pose } from "./scene";

let shared: Club | null = null;
function club(width: number, height: number) {
  if (!shared) shared = new Club(document.createElement("canvas"), width, height);
  return shared;
}

export function Recon({ pose }: { pose: Pose }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { width, height } = useVideoConfig();
  useLayoutEffect(() => {
    const c = club(width, height);
    c.draw(pose);
    ref.current!.getContext("2d")!.drawImage(c.renderer.domElement, 0, 0, width, height);
  });
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
}

type Key = { at: number; pos: [number, number, number]; look: [number, number, number]; fov?: number };
const ease = (k: number) => k * k * (3 - 2 * k);
/** The camera between keys (seconds into the shot), eased. */
export function camAt(keys: Key[], t: number): Pose["cam"] {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].at) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const k = b.at === a.at ? 0 : ease(Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at))));
  const mix = (p: number[], q: number[]) => p.map((v, j) => v + (q[j] - v) * k) as [number, number, number];
  return { pos: mix(a.pos, b.pos), look: mix(a.look, b.look), fov: (a.fov ?? 40) + ((b.fov ?? 40) - (a.fov ?? 40)) * k };
}
