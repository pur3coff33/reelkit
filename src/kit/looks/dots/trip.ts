// The psychedelic layer for points of light: rainbow palettes for points, and for the finished picture zoom echoes that
// swirl away, a kaleidoscope, a colour split and a turning hue. Each frame is made from itself alone (no feedback from the
// frame before), so frames still render in any order. Keep changes slow: never flash the whole picture more than 3× a second.
import { H, TAU, W, canvas, type RGB } from "../core";

export type Trip = {
  /** Copies of the picture, each bigger by `zoom`, turned by `turn` and dimmer by `fade` than the last. */
  echo?: { n: number; zoom: number; turn?: number; fade: number; hue?: number };
  /** Mirrors a wedge of the picture `sides` × 2 times round. `mix` 0 is off, 1 replaces the picture. */
  kaleido?: { sides: number; mix: number; turn?: number };
  /** Red and blue pulled apart from the middle by this many px at the frame's edge. */
  split?: number;
  /** Turns every colour this many degrees. */
  hue?: number;
};

/** A cosine rainbow: `x` goes round once per 1. `out` starts at index `at`. */
export function rainbow(x: number, out: number[], at = 0, gain = 1, shift: RGB = [0, 0.33, 0.67]) {
  for (let i = 0; i < 3; i++) out[at + i] = gain * (0.5 + 0.5 * Math.cos(TAU * (x + shift[i])));
}

/** A purer rainbow, leaning to magenta, violet, cyan and gold. */
export function neon(x: number, out: number[], at = 0, gain = 1) {
  for (let i = 0; i < 3; i++) {
    const v = 0.5 + 0.5 * Math.cos(TAU * (x + NEON[i]));
    out[at + i] = gain * (0.04 + 0.96 * v * v * (3 - 2 * v)) * (i === 1 ? 0.8 : 1);
  }
}
const NEON = [0, 0.36, 0.62];

let spare: HTMLCanvasElement[] | undefined;

/** Lays the trip over a picture on black and returns it (the same canvas, or one of this module's own). */
export function tripOn(src: HTMLCanvasElement, trip: Trip, [cx, cy]: [number, number]): HTMLCanvasElement {
  spare ??= [canvas(), canvas()];
  let from = src, to = spare[0];
  const swap = () => {
    [from, to] = [to, from === src ? spare![1] : from];
  };
  const start = () => {
    const g = to.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.filter = "none";
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    return g;
  };

  if (trip.echo && trip.echo.fade > 0.02) {
    const { n, zoom, turn = 0, fade, hue = 0 } = trip.echo, g = start();
    g.drawImage(from, 0, 0);
    g.globalCompositeOperation = "lighter";
    for (let i = 1; i <= n; i++) {
      g.globalAlpha = fade ** i;
      g.filter = hue ? `hue-rotate(${hue * i}deg)` : "none";
      g.setTransform(1, 0, 0, 1, cx, cy);
      g.rotate(turn * i);
      g.scale(zoom ** i, zoom ** i);
      g.drawImage(from, -cx, -cy);
    }
    swap();
  }

  if (trip.kaleido && trip.kaleido.mix > 0.01) {
    const { sides, mix, turn = 0 } = trip.kaleido, g = start();
    g.globalAlpha = 1 - mix;
    g.drawImage(from, 0, 0);
    g.globalAlpha = mix;
    g.globalCompositeOperation = "lighter";
    const wedge = Math.PI / sides, reach = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 10;
    // It's the wedge pointing down that's mirrored, where there's most picture, grown until it reaches the far corner.
    const grow = reach / Math.max(cy, H - cy);
    for (let i = 0; i < sides * 2; i++) {
      g.save();
      g.translate(cx, cy);
      g.rotate(i * wedge + turn);
      if (i % 2) g.scale(-1, 1);
      // A hair wider than the wedge, so no seam shows.
      const half = wedge / 2 + 0.002, far = reach * 1.1;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.sin(half) * far, Math.cos(half) * far);
      g.lineTo(-Math.sin(half) * far, Math.cos(half) * far);
      g.closePath();
      g.clip();
      g.scale(grow, grow);
      g.drawImage(from, -cx, -cy);
      g.restore();
    }
    swap();
  }

  if (trip.split && trip.split > 0.4) {
    const g = start(), k = trip.split / (W / 2);
    // Each colour alone, red a little bigger than blue, added back together.
    const one = tint(from);
    g.globalCompositeOperation = "lighter";
    (["#f00", "#0f0", "#00f"] as const).forEach((c, i) => {
      const s = 1 + k * (1 - i);
      g.setTransform(s, 0, 0, s, cx - cx * s, cy - cy * s);
      g.drawImage(one(c), 0, 0);
    });
    g.setTransform(1, 0, 0, 1, 0, 0);
    swap();
  }

  if (trip.hue && Math.abs(trip.hue) > 0.5) {
    const g = start();
    g.filter = `hue-rotate(${trip.hue}deg)`;
    g.drawImage(from, 0, 0);
    g.filter = "none";
    swap();
  }
  return from;
}

let ink: HTMLCanvasElement | undefined;
/** The picture seen through a coloured glass. */
const tint = (src: HTMLCanvasElement) => (color: string) => {
  ink ??= canvas();
  const g = ink.getContext("2d")!;
  g.globalCompositeOperation = "copy";
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "multiply";
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  return ink;
};
