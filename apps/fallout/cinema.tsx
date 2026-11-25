// The lens and the grade: what makes flat triangles look filmed. Bloom out of the highlights, a radial blur on the hits,
// grain, then a per-scene colour grade. Everything is a function of the frame number, so frames can render in any order.
import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { render, type Frame } from "../../src/kit/lowpoly/engine";
import { lapseView, partAt } from "./timeline";

export type Grade = {
  /** How hard the highlights bleed, 0…1. */
  bloom: number;
  contrast: number;
  saturate: number;
  brightness?: number;
  /** A colour laid over the whole frame in soft-light. */
  tint?: string;
  tintAmount?: number;
};

/** The colour story: warm morning, burning orange, then the green-grey of the fallout, then almost no colour at all. */
export function gradeAt(t: number): Grade {
  switch (partAt(t)) {
    case "alert":
      return t < 3 ? { bloom: 0.75, contrast: 1.08, saturate: 1.15 } : { bloom: 0.34, contrast: 1.16, saturate: 1.14, tint: "#ffb45e", tintAmount: 0.28 };
    case "panic":
    case "look":
      return { bloom: 0.34, contrast: 1.18, saturate: 1.12, tint: "#ffb45e", tintAmount: 0.28 };
    case "station":
    case "call":
      return { bloom: 0.34, contrast: 1.14, saturate: 1.12, tint: "#ffc070", tintAmount: 0.26 };
    case "fireball":
      return { bloom: 0.95, contrast: 1.24, saturate: 1.2, tint: "#ff6a1e", tintAmount: 0.34 };
    case "rise":
      return { bloom: 0.75, contrast: 1.2, saturate: 1.12, tint: "#ff8a3a", tintAmount: 0.2 };
    case "light":
    case "wave":
      return { bloom: 0.72, contrast: 1.22, saturate: 1.18, tint: "#ff7a2a", tintAmount: 0.3 };
    case "plume":
      return { bloom: 0.5, contrast: 1.18, saturate: 0.95, tint: "#9fb04a", tintAmount: 0.24 };
    case "tunnel":
      return { bloom: 0.85, contrast: 1.2, saturate: 0.82, tint: "#7f9a58", tintAmount: 0.3 };
    case "lapse":
      return lapseView(t) === "map" ? { bloom: 0.45, contrast: 1.16, saturate: 0.9, tint: "#9fb04a", tintAmount: 0.2 } : { bloom: 0.85, contrast: 1.2, saturate: 0.78, tint: "#7f9a58", tintAmount: 0.3 };
    case "voicemail":
      return { bloom: 0.85, contrast: 1.16, saturate: 1.05, tint: "#5a86c8", tintAmount: 0.2 };
    case "out":
      return { bloom: 0.4, contrast: 1.22, saturate: 0.72, brightness: 0.98, tint: "#a7ab92", tintAmount: 0.16 };
    default:
      return { bloom: 0, contrast: 1, saturate: 1 };
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

let quarter: HTMLCanvasElement | null = null;
let eighth: HTMLCanvasElement | null = null;
let noiseTile: HTMLCanvasElement | null = null;

/** Grain: a fixed tile of seeded noise, so every run of the same frame comes out the same. */
function grainTile() {
  if (noiseTile) return noiseTile;
  noiseTile = canvas(256, 256);
  const ctx = noiseTile.getContext("2d")!;
  const img = ctx.createImageData(256, 256);
  let s = 7919;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = s >>> 24;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return noiseTile;
}

/** Highlights only, blurred twice at two sizes and screened back over the picture. */
function bloom(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  quarter ??= canvas(Math.round(w / 4), Math.round(h / 4));
  eighth ??= canvas(Math.round(w / 8), Math.round(h / 8));
  const q = quarter.getContext("2d")!, e = eighth.getContext("2d")!;
  q.globalCompositeOperation = "copy";
  q.filter = "brightness(0.74) contrast(3.1) blur(3px)";
  q.drawImage(ctx.canvas, 0, 0, quarter.width, quarter.height);
  e.globalCompositeOperation = "copy";
  e.filter = "blur(5px)";
  e.drawImage(quarter, 0, 0, eighth.width, eighth.height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.globalAlpha = 0.55 * amount;
  ctx.drawImage(quarter, 0, 0, w, h);
  ctx.globalAlpha = 0.8 * amount;
  ctx.drawImage(eighth, 0, 0, w, h);
  ctx.restore();
}

/** A blur outward from the centre of the frame, for the moments that hit hard. */
function zoomBlur(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0.0005) return;
  ctx.save();
  for (let i = 1; i <= 4; i++) {
    const k = amount * i;
    ctx.globalAlpha = 0.34 / i;
    ctx.drawImage(ctx.canvas, -w * k, -h * k, w * (1 + 2 * k), h * (1 + 2 * k));
  }
  ctx.restore();
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, frameNo: number) {
  const pattern = ctx.createPattern(grainTile(), "repeat");
  if (!pattern) return;
  // A new position every frame: the same grain never sits still.
  const a = Math.imul(frameNo + 1, 2654435761) >>> 0;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.055;
  ctx.translate(-(a % 256), -((a >>> 8) % 256));
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w + 256, h + 256);
  ctx.restore();
}

/** One 3D frame, through the lens and the grade. */
export function CinemaCanvas({ frame, width, height, frameNo, grade, zoom = 0 }: { frame: Frame; width: number; height: number; frameNo: number; grade: Grade; zoom?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    render(ctx, width, height, frame);
    zoomBlur(ctx, width, height, zoom);
    bloom(ctx, width, height, grade.bloom);
    grain(ctx, width, height, frameNo);
  }, [frame, width, height, frameNo, grade.bloom, zoom]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width, height, filter: `contrast(${grade.contrast}) saturate(${grade.saturate}) brightness(${grade.brightness ?? 1})` }} />
      {grade.tint ? <AbsoluteFill style={{ background: grade.tint, opacity: grade.tintAmount ?? 0.2, mixBlendMode: "soft-light" }} /> : null}
    </AbsoluteFill>
  );
}
