import { describe, expect, it } from "vitest";
import { detect, grid, snap } from "./beats";

describe("grid and snap", () => {
  it("lays beats from the offset", () => {
    expect(grid(120, 0.1, 2)).toEqual([0.1, 0.6, 1.1, 1.6]);
  });
  it("snaps to the nearest beat", () => {
    expect(snap(0.8, [0, 0.5, 1, 1.5])).toBe(1);
    expect(snap(0.7, [0, 0.5, 1, 1.5])).toBe(0.5);
  });
});

describe("detect", () => {
  it("finds the tempo and phase of a click track", () => {
    const rate = 11_025, seconds = 10, bpm = 100, offset = 0.2;
    const s = new Float32Array(rate * seconds);
    for (let t = offset; t < seconds; t += 60 / bpm) {
      const start = Math.round(t * rate);
      for (let i = 0; i < 300; i++) s[start + i] = Math.sin(i * 0.3) * Math.exp(-i / 60);
    }
    const found = detect(s, rate);
    expect(found.bpm).toBeCloseTo(bpm, 0);
    expect(Math.abs(found.offset - offset)).toBeLessThan(0.03);
  });
});
