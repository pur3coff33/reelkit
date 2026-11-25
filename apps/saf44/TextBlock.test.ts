import { describe, expect, it } from "vitest";
import { plates } from "./TextBlock";

describe("the caption's plate", () => {
  it("shows no empty line-sized plate before the line has faded in", () => {
    expect(plates(true, 0)).toEqual({ whole: 0, head: 0.6 });
  });

  it("is one whole plate once the line is fully in", () => {
    expect(plates(true, 1)).toEqual({ whole: 0.6, head: 0 });
  });

  it("fades with the line, never darker than the plate itself", () => {
    const mid = plates(true, 0.5);
    expect(mid.whole).toBeCloseTo(0.3);
    expect(mid.head).toBeCloseTo(0.3);
  });

  it("is one whole plate when there is only a stamp", () => {
    expect(plates(false, 1)).toEqual({ whole: 0.6, head: 0 });
  });
});
