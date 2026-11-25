// Changes of shape for points of light. Gentle: `flowStep` (the shapes merge). Explosive: the old shape bursts outward (`blastStep`), the camera rushes into the
// middle of the burst (`rush`, for the camera's distance), and the picture's colours pull apart and echo (`blastTrip`)
// while the points settle into the next shape.
import { smooth, type RGB } from "../core";
import type { Sampler } from "./forms";
import type { Step } from "./scene";
import type { Trip } from "./trip";

/** A cut at `at` seconds. `power` 1 is an ordinary cut, 2.5 the biggest explosion of a film. */
export type Blast = { at: number; power?: number };

/** The points burst and fly to `to`, arriving a little after the cut. */
export const blastStep = (to: Sampler, b: Blast, flash: RGB): Step => ({ to, at: b.at - 0.5, dur: 1.4, spread: 0.6, burst: 1.8 * (b.power ?? 1), dim: 0.65, flash });

/** 0 away from any cut, rising to the cut's power (at most 1.5) on it and gone 1.4 s after. */
export const rush = (blasts: Blast[]) => (t: number) =>
  Math.min(1.5, blasts.reduce((m, b) => Math.max(m, Math.min(1.5, b.power ?? 1) * smooth(b.at - 0.6, b.at, t) * (1 - smooth(b.at + 0.2, b.at + 1.4, t))), 0));

/** The trip, with the colours split and the echoes stronger and wider round each cut. */
export function blastTrip(base: (t: number) => Trip, blasts: Blast[]): (t: number) => Trip {
  const k = rush(blasts);
  return (t) => {
    const trip = base(t), r = k(t);
    if (r <= 0) return trip;
    return {
      ...trip,
      split: (trip.split ?? 0) + 14 * r,
      echo: trip.echo ? { ...trip.echo, fade: trip.echo.fade + 0.25 * r, zoom: trip.echo.zoom + 0.08 * r } : { n: 4, zoom: 1 + 0.08 * r, fade: 0.25 * r },
    };
  };
}

/** The gentle opposite of a blast: the old shape's points drift along soft curves and gather into the next, leaving a
 * few at a time over 1.4 s and taking 2.2 s each, so for a few seconds both shapes are there, merging. Centred on `cut`. */
export const flowStep = (to: Sampler, cut: number, flash: RGB = [0.015, 0.01, 0.02]): Step => ({ to, at: cut - 1.6, dur: 2.2, spread: 1.4, burst: 0.45, dim: 0.1, flash });
