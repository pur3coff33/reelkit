// How bodies move. Feet read how far the man has walked, not the clock, so a planted boot stays planted whatever he does:
// start, stop, wade or run. Everything is built from its inputs alone, so frames can render in any order.
import type { V3 } from "../../src/kit/lowpoly/engine";

export type Gait = { footL: V3; footR: V3; bob: number; phase: number };

const frac = (x: number) => x - Math.floor(x);
const STANDING_HEIGHT = 0.04, LIFT = 0.13;

/**
 * Where a man's feet are, in his own space with z forward, after walking `dist` metres. `step` is metres per step, `seed`
 * where he is in his stride, and `duty` how much of the stride a foot spends on the ground: 0.62 walking, 0.35 running.
 */
export function gait(dist: number, step: number, seed: number, duty = 0.62): Gait {
  const reach = step * duty;
  const foot = (cycle: number, x: number): V3 => {
    if (cycle < duty) return [x, STANDING_HEIGHT, reach - (cycle / duty) * 2 * reach];
    const k = (cycle - duty) / (1 - duty);
    return [x, STANDING_HEIGHT + LIFT * Math.sin(k * Math.PI), -reach + 2 * reach * (k * k * (3 - 2 * k))];
  };
  const u = frac(dist / (2 * step) + seed);
  return {
    footL: foot(u, -0.1),
    footR: foot(frac(u + 0.5), 0.1),
    // Highest over a straight leg, twice a stride.
    bob: 0.018 * Math.cos(u * Math.PI * 4),
    // The kit's arm swing reads this: the right arm is forward as the left foot comes down.
    phase: u * Math.PI * 2 - Math.PI / 2,
  };
}

/** How hard the last round is still pushing man `man` of `men`, 0…1. Rounds go to men by `k`, as the flashes do. */
export function recoil(list: readonly { t: number; k: number }[], t: number, man: number, men: number) {
  let latest = -Infinity;
  for (const r of list) if (r.k % men === man && r.t <= t && r.t > latest) latest = r.t;
  const age = t - latest;
  return age > 0.25 ? 0 : Math.exp(-age * 22);
}

/** The small movements of someone staying still on purpose. Never repeats, and no two men match. */
export function fidget(t: number, seed: number) {
  const a = seed * 2.399, b = seed * 1.117;
  const wave = (speed: number, offset: number) => Math.sin(t * speed + offset) * 0.6 + Math.sin(t * speed * 2.37 + offset * 1.7) * 0.4;
  return { shift: 0.04 * wave(0.41, a), lean: 0.04 * wave(0.67, b), yaw: 0.1 * wave(0.29, a + b) };
}
