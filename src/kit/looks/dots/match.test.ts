import { describe, expect, it } from "vitest";
import type { Dot, Sampler } from "./forms";
import { makeCloud, type Group } from "./scene";

/** A vertical line at x, heights 0…4, as a static shape. */
const line = (x: number): Sampler => (r): Dot => ({ p: [x, r() * 4, 0], c: [1, 1, 1] });
/** The same, but its points get their height from a life (as the scene shapes do), not from the sampler. */
const living = (x: number): Sampler => Object.assign((r: () => number): Dot => ({ p: [r(), 0, 0], c: [1, 1, 1] }), { life: (o: number[]) => { o[1] = o[0] * 4; o[0] = x; } });

const meanHeightGap = (g: Group) => {
  const c = makeCloud(g), a = c.forms[0].p, b = c.forms[1].p;
  let s = 0;
  for (let i = 0; i < g.n; i++) s += Math.abs(a[i * 3 + 1] - b[i * 3 + 1]);
  return s / g.n;
};

describe("matching shapes point to point", () => {
  it("without it, a point's place in the next shape is random", () => {
    expect(meanHeightGap({ n: 4000, seed: 1, shape: line(-2), steps: [{ to: line(2), at: 5 }] })).toBeGreaterThan(1);
  });

  it("with it, each point goes to the same part of the next shape: top to top, bottom to bottom", () => {
    expect(meanHeightGap({ n: 4000, seed: 1, shape: line(-2), steps: [{ to: line(2), at: 5 }], match: true })).toBeLessThan(0.15);
  });

  it("matches by where a living shape's points really are", () => {
    const g: Group = { n: 4000, seed: 1, shape: living(-2), steps: [{ to: living(2), at: 5 }], match: true };
    const c = makeCloud(g), a = c.forms[0].p, b = c.forms[1].p, o = [0, 0, 0, 0, 0, 0];
    let s = 0;
    for (let i = 0; i < g.n; i++) {
      const ya = (o[0] = a[i * 3], g.shape.life!(o, 0, 0, 0), o[1]), yb = (o[0] = b[i * 3], g.steps![0].to.life!(o, 0, 0, 0), o[1]);
      s += Math.abs(ya - yb);
    }
    expect(s / g.n).toBeLessThan(0.15);
  });
});
