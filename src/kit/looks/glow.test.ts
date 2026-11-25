import { describe, expect, it } from "vitest";
import { H, W } from "./core";
import { HEAD, Light, colorAt, crackLine, egg, headAt, shard, spline, EMBER } from "./glow";

describe("glow", () => {
  it("adds light up where dots land, in their colour, and nowhere else", () => {
    const L = new Light();
    L.dot(100.3, 200.6, [1, 0.5, 0], 1, 1.4);
    const at = (x: number, y: number) => Array.from(L.acc.subarray((y * W + x) * 3, (y * W + x) * 3 + 3));
    const [r, g, b] = at(100, 201);
    expect(r).toBeGreaterThan(0.3);
    expect(g / r).toBeCloseTo(0.5, 5);
    expect(b).toBe(0);
    expect(at(110, 201)).toEqual([0, 0, 0]);
  });

  it("streams stay finite and leave the frame quietly", () => {
    const L = new Light();
    L.stream(540, 900, 3000, [0, -2], EMBER, 0.5);
    L.stream(5, 5, 400, [-3, -3], EMBER, 0.5);
    expect(L.acc.every(Number.isFinite)).toBe(true);
    expect(L.acc.some((v) => v > 0)).toBe(true);
  });

  it("colours along a stream run from its first stop to its last", () => {
    colorAt(EMBER, 0).forEach((v, i) => expect(v).toBeCloseTo(EMBER[0][1][i], 6));
    colorAt(EMBER, 1).forEach((v, i) => expect(v).toBeCloseTo(EMBER[EMBER.length - 1][1][i], 6));
  });

  it("an egg is wider below its middle than above it", () => {
    const e = egg(540, 700, 200, 260), width = (y0: number) => {
      const xs = e.filter(([, y]) => Math.abs(y - y0) < 8).map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(width(700 + 130)).toBeGreaterThan(width(700 - 130));
  });

  it("a head in profile fits the frame and a mirrored one faces the other way", () => {
    const h = headAt(1.25, 0, 170), m = headAt(1, W, 0, true);
    expect(h.every(([x, y]) => x > -60 && x < W + 60 && y > 0 && y < H)).toBe(true);
    // Above the neck, the furthest forward point is the tip of the nose: rightmost facing right, leftmost mirrored.
    const right = h.filter(([, y]) => y < 170 + 800 * 1.25).reduce((a, p) => (p[0] > a[0] ? p : a)), left = m.filter(([, y]) => y < 800).reduce((a, p) => (p[0] < a[0] ? p : a));
    expect((right[1] - 170) / 1.25).toBeGreaterThan(520);
    expect((right[1] - 170) / 1.25).toBeLessThan(600);
    expect(left[1]).toBeGreaterThan(520);
    expect(left[1]).toBeLessThan(600);
    expect(spline(HEAD).length).toBe(HEAD.length * 10);
  });

  it("shards have edges: the seam is near zero between two of them", () => {
    let seams = 0;
    for (let x = 0; x < 600; x += 2) if (shard(x, 300, 40, 1).edge < 1.5) seams++;
    expect(seams).toBeGreaterThan(5);
    expect(seams).toBeLessThan(150);
  });

  it("a crack runs downwards", () => {
    const c = crackLine(540, 400, 800, 3);
    expect(c[0]).toEqual([540, 400]);
    for (let i = 1; i < c.length; i++) expect(c[i][1]).toBeGreaterThan(c[i - 1][1]);
  });
});
