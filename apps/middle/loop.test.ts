// The film loops: its last moment must be its first, or a replay shows a jump.
import { describe, expect, it } from "vitest";
import { rng } from "../../src/kit/looks/core";
import type { Sampler } from "../../src/kit/looks/dots/forms";
import { LAYOUT } from "./layout.gen";
import { camera, haze, starAlpha, tripAt } from "./scenes";
import { SHAPES } from "./shapes";
import { SECONDS } from "./timeline";

const END = SECONDS - 1 / 30;

function sample(s: Sampler, t: number, n = 600) {
  const r = rng(5);
  return Array.from({ length: n }, (_, i) => {
    const d = s(r), o = [...d.p, ...d.c];
    s.life?.(o, t, (i + 0.5) / n, (i * 2.4) % 6.283);
    return o;
  });
}

describe("the loop", () => {
  it("ends the last scene on the first scene's first frame", () => {
    const first = sample(SHAPES.hook!(LAYOUT.scenes.hook), 0), last = sample(SHAPES.end!(LAYOUT.scenes.end), END);
    first.forEach((o, i) => o.forEach((v, k) => expect(last[i][k]).toBeCloseTo(v, 1)));
  });

  it("brings the stars, the haze, the camera and the trip back to where they started", () => {
    expect(starAlpha(END)).toBeCloseTo(starAlpha(0), 2);
    const a = sample(haze, 0), b = sample(haze, END);
    a.forEach((o, i) => o.forEach((v, k) => expect(b[i][k]).toBeCloseTo(v, 1)));
    const c0 = camera(0), c1 = camera(END);
    for (const k of ["dist", "yaw", "pitch", "height"] as const) expect(c1[k]).toBeCloseTo(c0[k] ?? 0, 2);
    expect(tripAt(END).echo!.turn!).toBeCloseTo(tripAt(0).echo!.turn!, 2);
  });
});
