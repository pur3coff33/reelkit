import { describe, expect, it } from "vitest";
import { FINAL, PARTS, SECONDS, WIND_STAGES, WORDS, homesAt, hoursAt, partAt, pesosAt, windAt } from "./timeline";

describe("kalakas timeline", () => {
  it("runs its parts back to back to the end", () => {
    const parts = Object.values(PARTS);
    expect(parts[0].from).toBe(0);
    expect(parts.at(-1)!.to).toBe(SECONDS);
    for (let i = 1; i < parts.length; i++) expect(parts[i].from).toBe(parts[i - 1].to);
    expect(partAt(99.9)).toBe("message");
  });

  it("never shows two lines of words at once", () => {
    for (const list of [WORDS, WIND_STAGES]) for (let i = 1; i < list.length; i++) expect(list[i].at).toBeGreaterThanOrEqual(list[i - 1].to);
  });

  it("gives every line long enough to read", () => {
    for (const w of WORDS) expect(w.to - w.at).toBeGreaterThanOrEqual(1.6 + 0.04 * (w.text.length + (w.sub?.length ?? 0)));
  });

  it("runs the story clock forward only, from 72 hours before to a week after", () => {
    expect(hoursAt(40)).toBe(-72);
    expect(hoursAt(85)).toBe(168);
    for (let t = 40; t < 85; t += 0.5) expect(hoursAt(t + 0.5)).toBeGreaterThan(hoursAt(t));
  });

  it("reaches the approved peak wind and the final tally", () => {
    expect(windAt(68)).toBe(350);
    expect(pesosAt(74)).toBe(FINAL.pesosBillions);
    expect(homesAt(74)).toBe(FINAL.homes);
  });
});
