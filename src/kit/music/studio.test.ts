import { describe, expect, it } from "vitest";
import { namingShift, tuning } from "./sampler";
import { Session, above, limit, lufs, parseChord, voice } from "./studio";
import { SR } from "./synth";

const sine = (hz: number, seconds: number, gain: number) => Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => gain * Math.sin((2 * Math.PI * hz * i) / SR));
const peak = (x: Float32Array) => x.reduce((a, v) => Math.max(a, Math.abs(v)), 0);

describe("harmony", () => {
  it("reads chord names, with a bass", () => {
    expect(parseChord("Dmaj9")).toEqual({ root: 2, bass: 2, pcs: [2, 6, 1, 4] });
    expect(parseChord("Gmaj7/B").bass).toBe(11);
    expect(() => parseChord("Dwat")).toThrow("unknown chord");
  });

  it("finds the first note at or above a floor", () => {
    expect(above(2, 50)).toBe(50);
    expect(above(1, 50)).toBe(61);
  });

  it("voices within range, with the third, moving little between chords", () => {
    const a = voice(parseChord("Dmaj9"), 55, 76, 4);
    const b = voice(parseChord("Gmaj9"), 55, 76, 4, a);
    expect(a.every((p) => p >= 55 && p <= 76)).toBe(true);
    expect(a.some((p) => p % 12 === 6)).toBe(true);
    expect(Math.max(...b.map((p, i) => Math.abs(p - a[i])))).toBeLessThanOrEqual(5);
  });
});

describe("the sample library's pitch", () => {
  it("corrects the flute's octave and the harp's tuning", () => {
    expect(namingShift("Woodwinds/Flute/susNV")).toBe(12);
    expect(namingShift("Strings/Harp")).toBe(0);
    expect(tuning("Strings/Harp")?.[69]).toBe(-13);
  });
});

describe("loudness", () => {
  // BS.1770: a 997 Hz sine at 0 dBFS in one channel reads −3.01 LUFS, so in both at −23 dBFS it reads −23.
  it("reads the reference tone", () => {
    const x = sine(997, 4, 10 ** (-23 / 20));
    expect(lufs(x, x)).toBeCloseTo(-23, 1);
  });

  it("ignores silence", () => {
    const x = new Float32Array(8 * SR);
    const y = sine(997, 4, 0.1);
    x.set(y);
    expect(Math.abs(lufs(x, x) - lufs(y, y))).toBeLessThan(0.5);
  });
});

describe("mastering", () => {
  it("keeps every sample under the ceiling", () => {
    const l = sine(220, 1, 0.3), r = sine(220, 1, 0.3);
    for (let i = 20000; i < 20400; i++) l[i] *= 5;
    limit(l, r, 0.8);
    expect(peak(l)).toBeLessThanOrEqual(0.8 + 1e-6);
  });

  it("sets stems by measured loudness and lands on the target", () => {
    const s = new Session(6);
    s.stem("a", { lufs: -20 }).add(sine(400, 6, 0.9), 0);
    s.stem("b", { lufs: -30 }).add(sine(900, 6, 0.001), 0);
    const out = s.master({ target: -18, fade: 0.2 });
    expect(Math.abs(out.loudness + 18)).toBeLessThan(0.5);
    expect(out.reduced).toBeLessThan(1);
  });

  it("says which stem is silent", () => {
    const s = new Session(2);
    s.stem("harp", { lufs: -20 });
    expect(() => s.master({ target: -18 })).toThrow("harp");
  });
});
