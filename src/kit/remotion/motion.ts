// Motion curves shared by the components: a slam (big → settle with a small overshoot), a pop and eased moves.
import { Easing, interpolate, spring } from "remotion";

/** 0 → 1 with a punchy overshoot, starting at `start`. */
export function slam(frame: number, start: number, fps: number) {
  return spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 260, mass: 0.6 } });
}

/** A softer 0 → 1 pop. */
export function pop(frame: number, start: number, fps: number) {
  return spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 180 } });
}

/** Eased 0 → 1 between two frames. */
export function ease(frame: number, from: number, to: number, easing = Easing.bezier(0.65, 0, 0.35, 1)) {
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
