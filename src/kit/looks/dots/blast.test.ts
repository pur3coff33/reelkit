import { describe, expect, it } from "vitest";
import { blastStep, blastTrip, flowStep, rush } from "./blast";
import type { Sampler } from "./forms";
import type { Trip } from "./trip";

const dot: Sampler = () => ({ p: [0, 0, 0], c: [1, 1, 1] });

describe("rush", () => {
  const one = rush([{ at: 10 }]);

  it("is 0 away from the cut and peaks on it", () => {
    expect(one(8)).toBe(0);
    expect(one(12)).toBe(0);
    expect(one(10)).toBeGreaterThan(0.9);
  });

  it("is never NaN and never over 1.5, even with cuts close together", () => {
    const two = rush([{ at: 10 }, { at: 11, power: 2.5 }]);
    for (let t = 0; t <= 20; t += 0.01) {
      expect(Number.isFinite(two(t))).toBe(true);
      expect(two(t)).toBeLessThanOrEqual(1.5);
      expect(two(t)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("blastStep", () => {
  it("bursts harder with more power and leaves before the cut", () => {
    expect(blastStep(dot, { at: 10 }, [1, 0, 1]).burst).toBeCloseTo(1.8);
    expect(blastStep(dot, { at: 10, power: 2.5 }, [1, 0, 1]).burst).toBeCloseTo(4.5);
    expect(blastStep(dot, { at: 10 }, [1, 0, 1]).at).toBeCloseTo(9.5);
    expect(blastStep(dot, { at: 10 }, [1, 0, 1]).dim).toBeGreaterThan(0);
  });
});

describe("blastTrip", () => {
  const base = (): Trip => ({ echo: { n: 4, zoom: 1.1, fade: 0.3 }, split: 3 });
  const trip = blastTrip(base, [{ at: 10 }]);

  it("leaves the trip alone away from a cut", () => {
    expect(trip(5)).toEqual(base());
  });

  it("pulls the colours apart and echoes harder on the cut", () => {
    expect(trip(10).split!).toBeGreaterThan(15);
    expect(trip(10).echo!.fade).toBeGreaterThan(0.5);
    expect(trip(10).echo!.zoom).toBeGreaterThan(1.15);
  });
});

describe("flowStep", () => {
  const s = flowStep(dot, 10);

  it("flows gently: a soft curve, no burst, barely dimmed", () => {
    expect(s.burst!).toBeLessThan(0.6);
    expect(s.dim ?? 0).toBeLessThanOrEqual(0.15);
  });

  it("is slow and overlapping, so the two shapes merge across the cut", () => {
    expect(s.dur!).toBeGreaterThanOrEqual(2);
    expect(s.spread!).toBeGreaterThanOrEqual(1.2);
    expect(s.at).toBeLessThan(10 - 1);
    expect(s.at + s.spread! + s.dur!).toBeGreaterThan(10 + 1);
  });
});
