import { describe, expect, it } from "vitest";
import { blast, boom, shimmer, stutter, swell, whoosh } from "./sfx";
import { SR, svf } from "./synth";

const energy = (x: Float32Array, from = 0, to = x.length) => {
  let e = 0;
  for (let i = from; i < to; i++) e += x[i] * x[i];
  return e;
};
const rms = (x: Float32Array, from: number, to: number) => Math.sqrt(energy(x, from, to) / (to - from));
const peak = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

const mono: Record<string, [() => Float32Array, number]> = {
  swell: [() => swell(1.2, 3), 1.2],
  boom: [() => boom(1, 3), 2.5],
  "boom(2)": [() => boom(2, 3), 5],
  shimmer: [() => shimmer(3, 3), 3],
  stutter: [() => stutter(0.8, 3), 0.8],
  blast: [() => blast(6, 3), 6],
};

describe("sound effects", () => {
  it.each(Object.keys(mono))("%s is the right length, finite, peaking near 0.9", (name) => {
    const [make, seconds] = mono[name], x = make();
    expect(x.length).toBe(Math.round(seconds * SR));
    expect(x.every(Number.isFinite)).toBe(true);
    expect(peak(x)).toBeGreaterThanOrEqual(0.85);
    expect(peak(x)).toBeLessThanOrEqual(0.95);
  });

  it("whoosh is stereo, the right length, peaking near 0.9", () => {
    const [L, R] = whoosh(1.4, 3);
    expect(L.length).toBe(Math.round(1.4 * SR));
    expect(R.length).toBe(L.length);
    expect([...L, ...R].every(Number.isFinite)).toBe(true);
    expect(Math.max(peak(L), peak(R))).toBeGreaterThanOrEqual(0.85);
    expect(Math.max(peak(L), peak(R))).toBeLessThanOrEqual(0.95);
  });

  it("whoosh starts on the left and passes to the right", () => {
    const [L, R] = whoosh(1.4, 3), h = L.length >> 1;
    expect(rms(L, 0, h)).toBeGreaterThan(rms(R, 0, h));
    expect(rms(R, h, R.length)).toBeGreaterThan(rms(L, h, L.length));
  });

  it("swell rises into its end", () => {
    const x = swell(1.2, 3), k = Math.round(x.length / 10);
    expect(rms(x, x.length - k, x.length)).toBeGreaterThan(4 * rms(x, 0, k));
  });

  it("boom lives below 120 Hz", () => {
    const x = boom(1, 3);
    expect(energy(svf(x, 120, 0.7, "low"))).toBeGreaterThanOrEqual(0.7 * energy(x));
  });

  it("shimmer lives above 2.5 kHz", () => {
    const x = shimmer(3, 3);
    expect(energy(svf(x, 2500, 0.7, "high"))).toBeGreaterThanOrEqual(0.8 * energy(x));
  });

  it("is the same every time for the same seed", () => {
    expect(blast(2, 9)).toEqual(blast(2, 9));
    expect(whoosh(1, 9)).toEqual(whoosh(1, 9));
  });
});
