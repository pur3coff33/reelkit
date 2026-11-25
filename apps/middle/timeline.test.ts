import { describe, expect, it } from "vitest";
import { clashingIds } from "../../src/kit/voice/kokoro";
import { SCENES, SECONDS, layOut } from "./timeline";

/** Every line 3.4 s long (the real average is 3.4). */
const fake = (len = 3.4) => Object.fromEntries(SCENES.flatMap((s) => s.lines.map(([id]) => [id, len])));

describe("the script", () => {
  it("is 13 scenes for two minutes, opening on the nested worlds, the egg seventh, ending back on them", () => {
    expect(SECONDS).toBe(120);
    expect(SCENES).toHaveLength(13);
    expect(new Set(SCENES.map((s) => s.name)).size).toBe(13);
    expect(SCENES[0].name).toBe("hook");
    expect(SCENES[6].name).toBe("egg");
    expect(SCENES[12].name).toBe("end");
  });

  it("gives every line an id no other differs from only by case (they name WAV files)", () => {
    const ids = SCENES.flatMap((s) => s.lines.map(([id]) => id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(clashingIds(ids)).toEqual([]);
  });
});

describe("layOut", () => {
  const { scenes, beats } = layOut(fake());

  it("tiles 0…120 with no gaps", () => {
    expect(scenes.hook.from).toBe(0);
    SCENES.slice(1).forEach((s, i) => expect(scenes[s.name].from).toBeCloseTo(scenes[SCENES[i].name].to, 6));
    expect(scenes.end.to).toBeCloseTo(SECONDS, 6);
  });

  it("gives every scene at least 5 s", () => {
    for (const s of SCENES) expect(scenes[s.name].to - scenes[s.name].from).toBeGreaterThanOrEqual(5);
  });

  it("keeps every line inside its scene, after the change of shape", () => {
    const secs = fake();
    for (const s of SCENES)
      for (const [id] of s.lines) {
        expect(beats[id] + 1e-9).toBeGreaterThanOrEqual(scenes[s.name].from + (s.name === "hook" ? 0.5 : 0.8));
        expect(beats[id] + secs[id]).toBeLessThanOrEqual(scenes[s.name].to + 1e-9);
      }
  });

  it("keeps the lines from overlapping", () => {
    const secs = fake(), all = SCENES.flatMap((s) => s.lines.map(([id]) => id));
    all.slice(1).forEach((id, i) => expect(beats[id]).toBeGreaterThan(beats[all[i]] + secs[all[i]]));
  });

  it("puts the egg near the middle", () => {
    expect(scenes.egg.from).toBeGreaterThan(42);
    expect(scenes.egg.from).toBeLessThan(66);
  });

  it("refuses a script that runs over", () => {
    expect(() => layOut(fake(8))).toThrow(/runs .* over/);
  });
});
