import { describe, expect, it } from "vitest";
import { activeAt, captionCues, coverTransform, mapXY, missingMedia, moveAt, printFit, kmToPx, clipOverruns, alongPath, type Placed } from "./film";

const A: Placed = { id: "a", kind: "title", text: "A", from: 0, to: 5 };
const B: Placed = { id: "b", kind: "title", text: "B", from: 5, to: 9 };

describe("activeAt", () => {
  it("crossfades into a shot over its first half second", () => {
    const on = activeAt([A, B], 5.2);
    expect(on.map((x) => x.shot.id)).toEqual(["a", "b"]);
    // The old shot stays whole underneath while the new one fades in on top, so the picture never dips to black.
    expect(on[0].opacity).toBe(1);
    expect(on[1].opacity).toBeCloseTo(0.4);
  });
  it("shows only the new shot on a hard cut", () => {
    expect(activeAt([A, { ...B, cut: true }], 5.2).map((x) => x.shot.id)).toEqual(["b"]);
  });
  it("shows one shot in the middle of it", () => {
    expect(activeAt([A, B], 2)).toEqual([{ shot: A, opacity: 1 }]);
  });
});

describe("moveAt", () => {
  const m = { from: [0.3, 0.4, 1] as [number, number, number], to: [0.6, 0.5, 1.3] as [number, number, number] };
  it("starts at from and ends at to", () => {
    expect(moveAt(m, 0)).toEqual({ x: 0.3, y: 0.4, zoom: 1 });
    expect(moveAt(m, 1)).toEqual({ x: 0.6, y: 0.5, zoom: 1.3 });
  });
});

describe("coverTransform", () => {
  const frame = { width: 1920, height: 1080 };
  it("never shows past the image's edge, even aimed at its corner", () => {
    const img = { width: 3000, height: 2000 };
    const { scale, tx, ty } = coverTransform(img, frame, { x: 0, y: 0, zoom: 1 });
    expect(tx).toBeLessThanOrEqual(0);
    expect(ty).toBeLessThanOrEqual(0);
    expect(tx + img.width * scale).toBeGreaterThanOrEqual(frame.width);
    expect(ty + img.height * scale).toBeGreaterThanOrEqual(frame.height);
  });
  it("covers the frame with a portrait image too", () => {
    const img = { width: 1000, height: 1500 };
    const { scale } = coverTransform(img, frame, { x: 0.5, y: 0.5, zoom: 1 });
    expect(img.width * scale).toBeGreaterThanOrEqual(frame.width);
  });
});

describe("mapXY", () => {
  it("puts the view's centre in the frame's centre", () => {
    const [x, y] = mapXY(120.35, 15.13, { lon: 120.35, lat: 15.13, spanDeg: 3 }, { width: 1920, height: 1080 });
    expect(x).toBeCloseTo(960);
    expect(y).toBeCloseTo(540);
  });
  it("puts north up and east right", () => {
    const v = { lon: 120, lat: 15, spanDeg: 3 }, f = { width: 1920, height: 1080 };
    expect(mapXY(121, 15, v, f)[0]).toBeGreaterThan(960);
    expect(mapXY(120, 16, v, f)[1]).toBeLessThan(540);
  });
});

describe("captionCues", () => {
  it("splits a caption at | and times the halves through the line", () => {
    const cues = captionCues([{ id: "l1", caption: "June 1991.|A mountain wakes.", at: 10, seconds: 3, lead: 0.28 }]);
    expect(cues).toHaveLength(2);
    expect(cues[0].at).toBeCloseTo(10.28);
    expect(cues[0].to).toBeCloseTo(cues[1].at);
    expect(cues[1].to).toBeCloseTo(13.4);
    expect(cues[1].text).toBe("A mountain wakes.");
  });
});

describe("missingMedia", () => {
  it("names media a shot uses that was never fetched", () => {
    expect(missingMedia([{ kind: "still", media: "x", move: { from: [0.5, 0.5, 1], to: [0.5, 0.5, 1.1] } }, { kind: "title", text: "t" }], {})).toEqual(["x"]);
  });
});

describe("printFit", () => {
  it("never blows a small photo up past twice its size", () => {
    expect(printFit({ width: 500, height: 338 }, { width: 1920, height: 1080 })).toEqual({ width: 1000, height: 676 });
  });
  it("keeps a large photo inside the frame with a margin", () => {
    const p = printFit({ width: 3000, height: 2000 }, { width: 1920, height: 1080 });
    expect(p.height).toBeLessThanOrEqual(1080 * 0.74);
    expect(p.width / p.height).toBeCloseTo(1.5);
  });
});

describe("kmToPx", () => {
  it("draws a distance on the map at the map's scale", () => {
    // 3° of latitude across 1920 px: 1° ≈ 111.2 km ≈ 640 px.
    expect(kmToPx(111.2, { lon: 120, lat: 15, spanDeg: 3 }, { width: 1920, height: 1080 })).toBeCloseTo(640, 0);
  });
});

describe("clipOverruns", () => {
  const clip = (id: string, from: number, to: number): Placed => ({ id, kind: "clip", media: id, from, to });
  it("flags a clip shot longer than the footage it may use", () => {
    expect(clipOverruns([clip("a", 0, 6)], { a: { from: 10, to: 14 } })).toEqual(["a: the shot runs 6.00 s but its use is 4.00 s"]);
  });
  it("flags a clip with no use", () => expect(clipOverruns([clip("b", 0, 2)], {})).toEqual(["b: a clip needs a use { from, to } in the media list"]));
  it("passes a clip that fits", () => expect(clipOverruns([clip("c", 3, 6.5)], { c: { from: 0, to: 4 } })).toEqual([]));
});

describe("alongPath", () => {
  const path: [number, number][] = [[0, 0], [3, 0], [3, 1]];
  it("starts at the first point and ends at the last", () => {
    expect(alongPath(path, 0)).toEqual([0, 0]);
    expect(alongPath(path, 1)).toEqual([3, 1]);
  });
  it("moves by distance along the line, not by point", () => expect(alongPath(path, 0.5)).toEqual([2, 0]));
});
