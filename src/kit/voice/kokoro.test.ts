import { describe, expect, it } from "vitest";
import { blendStyles, clashingIds, parseVoice, speechStart, voiceSlug } from "./kokoro";

describe("line ids", () => {
  it("finds ids that would overwrite each other's WAV on a case-insensitive disk (Windows, macOS)", () => {
    expect(clashingIds(["a1", "a2", "A1", "b1", "B1", "c1"])).toEqual(["A1", "B1"]);
  });

  it("passes ids that are all different", () => {
    expect(clashingIds(["hook1", "hook2", "egg1"])).toEqual([]);
  });
});

describe("speechStart", () => {
  it("finds where the speech begins after the silence Kokoro leaves at the start", () => {
    const rate = 24000, x = new Float32Array(rate);
    for (let i = Math.round(0.28 * rate); i < rate; i++) x[i] = 0.3 * Math.sin(i * 0.05);
    expect(speechStart(x, rate)).toBeCloseTo(0.28, 2);
  });

  it("is 0 for a recording that starts straight away", () => {
    expect(speechStart(Float32Array.from({ length: 2400 }, (_, i) => 0.3 * Math.sin(i * 0.05 + 1)), 24000)).toBe(0);
  });
});

describe("voice blends", () => {
  it("reads one voice as the whole blend", () => {
    expect(parseVoice("af_heart")).toEqual([{ name: "af_heart", weight: 1 }]);
  });

  it("scales weights to add up to 1, and counts a missing weight as 1", () => {
    expect(parseVoice("af_heart:3, af_bella:1")).toEqual([{ name: "af_heart", weight: 0.75 }, { name: "af_bella", weight: 0.25 }]);
    expect(parseVoice("af_heart,af_bella")).toEqual([{ name: "af_heart", weight: 0.5 }, { name: "af_bella", weight: 0.5 }]);
  });

  it("refuses weights that are zero, negative or not numbers", () => {
    expect(() => parseVoice("af_heart:0")).toThrow();
    expect(() => parseVoice("af_heart:-1")).toThrow();
    expect(() => parseVoice("af_heart:loud")).toThrow();
    expect(() => parseVoice("")).toThrow();
  });

  it("mixes style tables by weight", () => {
    const out = blendStyles([Float32Array.from([1, 0]), Float32Array.from([0, 1])], [0.7, 0.3]);
    expect(out[0]).toBeCloseTo(0.7);
    expect(out[1]).toBeCloseTo(0.3);
  });

  it("makes a folder-safe name for a blend", () => {
    expect(voiceSlug("af_heart:0.7,af_bella:0.3")).toBe("af_heart-0.7-af_bella-0.3");
    expect(voiceSlug("am_michael")).toBe("am_michael");
  });
});

describe("pronunciations", () => {
  it("finds [word](/ipa/) and splits the line around it", async () => {
    const { hasIpa, splitIpa } = await import("./kokoro");
    expect(hasIpa("on Timog Avenue")).toBe(false);
    expect(hasIpa("on [Timog](/timˈoɡ/) Avenue")).toBe(true);
    expect(splitIpa("on [Timog](/timˈoɡ/) Avenue, [Quezon](/kˈɛsɔn/) City.")).toEqual([
      { text: "on " }, { ipa: "timˈoɡ" }, { text: " Avenue, " }, { ipa: "kˈɛsɔn" }, { text: " City." },
    ]);
  });

  it("phonemises the rest as kokoro-js would and keeps the given phonemes", async () => {
    const { phonemesOf } = await import("./kokoro");
    const out = await phonemesOf("A disco on [Timog](/timˈoɡ/) Avenue.", "en");
    expect(out).toContain("timˈoɡ");
    expect(out.endsWith(".")).toBe(true);
    expect(out).not.toContain("[");
  });
});
