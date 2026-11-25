import { describe, expect, it } from "vitest";
import type { Tri, V3 } from "./engine";
import { diver, mouthCave, whale } from "./ocean";

const points = (tris: Tri[]) => tris.flatMap((t) => [t.a, t.b, t.c]);
const span = (pts: V3[], k: number) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
const build = (o: Parameters<typeof whale>[2]) => {
  const out: Tri[] = [];
  whale(out, { pos: [0, 0, 0] }, { beat: 0, ...o });
  return points(out);
};

describe("whale", () => {
  it("is as long as asked, and slim", () => {
    const pts = build({ length: 27 });
    expect(Math.abs(span(pts, 2) - 27)).toBeLessThan(27 * 0.06);
    expect(span(pts, 1)).toBeLessThan(27 * 0.16);
  });

  it("has no broken points at any jaw angle", () => {
    for (const mouth of [0, 0.3, 0.6, 1]) for (const p of build({ mouth, pouch: mouth })) for (const v of p) expect(Number.isFinite(v)).toBe(true);
  });

  it("drops its jaw and fills its throat", () => {
    const low = (o: Parameters<typeof whale>[2]) => Math.min(...build(o).map((p) => p[1]));
    expect(low({ mouth: 1 })).toBeLessThan(low({ mouth: 0 }) - 3);
    expect(low({ pouch: 1 })).toBeLessThan(low({ pouch: 0 }) - 1);
  });

  it("is the same on both sides", () => {
    const pts = build({});
    expect(Math.abs(Math.max(...pts.map((p) => p[0])) + Math.min(...pts.map((p) => p[0])))).toBeLessThan(1e-6);
  });
});

describe("the rest", () => {
  it("draws a diver the size of a person plus fins", () => {
    const out: Tri[] = [];
    diver(out, { pos: [0, 0, 0] });
    expect(span(points(out), 2)).toBeGreaterThan(1.9);
    expect(span(points(out), 2)).toBeLessThan(2.8);
  });

  it("builds the mouth shut, squeezed and open without broken points", () => {
    for (const o of [{ t: 1 }, { t: 2, size: 0.6 }, { t: 3, open: 1, away: 1 }]) {
      const out: Tri[] = [];
      mouthCave(out, o);
      for (const p of points(out)) for (const v of p) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
