// Draws one low-poly frame onto a full-size canvas.
import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { render, type Frame } from "./engine";

export function SimCanvas({ frame, width, height }: { frame: Frame; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Drawn synchronously in the layout effect, so the frame is on the canvas before Remotion takes its screenshot.
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) render(ctx, width, height, frame);
  }, [frame, width, height]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width, height }} />
    </AbsoluteFill>
  );
}
