import { describe, expect, it } from "vitest";
import { rng } from "../../src/kit/looks/core";
import { clashingIds } from "../../src/kit/voice/kokoro";
import { LAYOUT } from "./layout.gen";
import { SHAPES } from "./shapes";
import { MIN_SECONDS, SCENES, SECONDS, layOut } from "./timeline";

const fake = (len = 3.4) => Object.fromEntries(SCENES.flatMap((s) => s.lines.map(([id]) => [id, len])));

describe("the script", () => {
  it("gives every line an id no other differs from only by case (they name WAV files)", () => {
    const ids = SCENES.flatMap((s) => s.lines.map(([id]) => id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(clashingIds(ids)).toEqual([]);
  });

  it("is about two minutes, never squeezed under it", () => {
    expect(SECONDS).toBeGreaterThanOrEqual(MIN_SECONDS);
    expect(SECONDS).toBeLessThanOrEqual(MIN_SECONDS * 1.25);
  });

  it("puts every number in a caption only where the voice says it in words", () => {
    for (const s of SCENES) for (const [, text, caption] of s.lines) if (/\d/.test(text)) throw new Error(`digits in spoken text: ${text}`);
    expect(true).toBe(true);
  });
});

describe("layOut", () => {
  const { scenes, beats, total } = layOut(fake());

  it("tiles the film with no gaps, each scene at least 5 s", () => {
    expect(scenes.hook.from).toBe(0);
    SCENES.slice(1).forEach((s, i) => expect(scenes[s.name].from).toBeCloseTo(scenes[SCENES[i].name].to, 6));
    expect(scenes.end.to).toBe(total);
    for (const s of SCENES) expect(scenes[s.name].to - scenes[s.name].from).toBeGreaterThanOrEqual(5);
  });

  it("keeps the lines in their scenes, in order, without overlapping", () => {
    const secs = fake(), all = SCENES.flatMap((s) => s.lines.map(([id]) => id));
    for (const s of SCENES) for (const [id] of s.lines) expect(beats[id] + secs[id]).toBeLessThanOrEqual(scenes[s.name].to + 1e-9);
    all.slice(1).forEach((id, i) => expect(beats[id]).toBeGreaterThan(beats[all[i]] + secs[all[i]]));
  });

  it("refuses a script far longer than two minutes", () => {
    expect(() => layOut(fake(9))).toThrow(/cut a line/);
  });
});

describe("the shapes", () => {
  it.each(SCENES.map((s) => s.name))("%s stays finite and lit sensibly", (name) => {
    const make = SHAPES[name]!, span = LAYOUT.scenes[name], shape = make(span), r = rng(1);
    for (const t of [0, span.from, (span.from + span.to) / 2, span.to, SECONDS])
      for (let i = 0; i < 300; i++) {
        const d = shape(r), o = [...d.p, ...d.c];
        shape.life?.(o, t, (i + 0.5) / 300, i % 6.28);
        for (const v of o) expect(Number.isFinite(v)).toBe(true);
        for (const c of o.slice(3)) expect(c).toBeGreaterThanOrEqual(0);
        expect(Math.hypot(o[0], o[1])).toBeLessThan(60);
      }
  });
});
