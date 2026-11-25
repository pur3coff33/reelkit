import { describe, expect, it } from "vitest";
import { SR, svf } from "../../src/kit/music/synth";
import { closeRifle, farRifle, midRifle, mortar, waterStrike } from "./gunfire";

const energy = (x: Float32Array, from = 0, to = x.length) => {
  let s = 0;
  for (let i = from; i < Math.min(to, x.length); i++) s += x[i] * x[i];
  return s;
};
const peakAt = (x: Float32Array) => {
  let at = 0, most = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > most) (most = Math.abs(x[i])), (at = i);
  return { at, most };
};

describe("gunfire", () => {
  it("makes a close shot arrive all at once, at full level", () => {
    const [l] = closeRifle(3);
    const { at, most } = peakAt(l);
    expect(at / SR).toBeLessThan(0.004);
    expect(most).toBeGreaterThan(0.8);
  });

  it("puts weight in a close shot's chest", () => {
    const [l] = closeRifle(3);
    const low = svf(l, 150, 0.7, "low");
    expect(energy(low, 0, SR * 0.1) / energy(l, 0, SR * 0.1)).toBeGreaterThan(0.08);
  });

  it("loses the crack with distance", () => {
    const high = (x: Float32Array) => energy(svf(x, 3000, 0.7, "high")) / energy(x);
    expect(high(midRifle(3)[0])).toBeLessThan(high(closeRifle(3)[0]) * 0.6);
    expect(high(farRifle(3)[0])).toBeLessThan(high(midRifle(3)[0]) * 0.6);
  });

  it("is mostly echo from far away", () => {
    const tailShare = (x: Float32Array) => energy(x, SR * 0.1) / energy(x);
    expect(tailShare(farRifle(3)[0])).toBeGreaterThan(tailShare(closeRifle(3)[0]) * 2);
  });

  it("never fires the same shot twice", () => {
    const a = closeRifle(3)[0], b = closeRifle(4)[0];
    expect(energy(a.map((x, i) => x - b[i]))).toBeGreaterThan(0.1);
  });

  it("spreads the land's answer across both ears", () => {
    const [l, r] = closeRifle(3);
    const from = Math.round(SR * 0.15);
    expect(energy(l.map((x, i) => x - r[i]), from) / energy(l, from)).toBeGreaterThan(0.3);
  });

  it("makes a mortar longer and heavier than a rifle", () => {
    const m = mortar(5)[0], c = closeRifle(5)[0];
    expect(m.length).toBeGreaterThan(c.length);
    expect(energy(svf(m, 120, 0.7, "low"))).toBeGreaterThan(energy(svf(c, 120, 0.7, "low")) * 3);
  });

  it("makes a round hitting water short and without a chest", () => {
    const w = waterStrike(2);
    expect(w.length / SR).toBeLessThan(0.6);
    expect(energy(svf(w, 150, 0.7, "low")) / energy(w)).toBeLessThan(0.1);
  });
});
