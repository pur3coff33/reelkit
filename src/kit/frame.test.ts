import { describe, expect, it } from "vitest";
import type { ReelConfig } from "./config";
import { encodeArgs, extrasAllowed, frameTag } from "./frame";

const cfg = { app: "x", width: 1920, height: 1080, theme: {} } as unknown as ReelConfig;

describe("frameTag", () => {
  it("names a frame by its shape", () => {
    expect(frameTag({ width: 1920, height: 1080 })).toBe("16x9");
    expect(frameTag({ width: 1080, height: 1920 })).toBe("9x16");
    expect(frameTag({ width: 1080, height: 1080 })).toBe("1x1");
    expect(frameTag({ width: 1080, height: 1350 })).toBe("4x5");
  });
});

describe("encodeArgs", () => {
  it("re-encodes a documentary small, for photo footage", () => {
    const a = encodeArgs({ ...cfg, encode: "doc" });
    expect(a.join(" ")).toContain("-tune film");
    expect(a.join(" ")).toContain("-crf 24");
    expect(a.join(" ")).toContain("-b:a 192k");
    expect(a).not.toContain("copy");
  });
  it("copies the render's video for everything else, as before", () => {
    const a = encodeArgs(cfg);
    expect(a.join(" ")).toContain("-c:v copy");
    expect(a.join(" ")).toContain("-b:a 256k");
  });
});

describe("extrasAllowed", () => {
  it("makes square and 4:5 extras only from portrait reels", () => {
    expect(extrasAllowed({ width: 1920, height: 1080 })).toBe(false);
    expect(extrasAllowed({ width: 1080, height: 1920 })).toBe(true);
  });
});
