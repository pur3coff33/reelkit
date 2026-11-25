import { describe, expect, it } from "vitest";
import { BARS } from "./score";
import { shotFrame } from "./sim";
import { LINES, MELT, SECONDS, SHOTS, layers, type ShotName } from "./timeline";

describe("the life of a blue whale", () => {
  it("runs its shots back to back, on the bars, for two to three minutes", () => {
    const shots = Object.values(SHOTS);
    expect(shots[0].from).toBe(0);
    expect(shots.at(-1)!.to).toBe(SECONDS);
    for (let i = 1; i < shots.length; i++) expect(shots[i].from).toBe(shots[i - 1].to);
    for (const s of shots) expect(s.from % 4).toBe(0);
    expect(SECONDS).toBeGreaterThanOrEqual(120);
    expect(SECONDS).toBeLessThanOrEqual(180);
    // The score has a chord for every bar of every shot.
    expect(BARS.length * 4).toBe(SECONDS);
  });

  it("always has a full picture, and melts between shots", () => {
    for (let t = 0; t < SECONDS; t += 0.1) expect(layers(t)[0].opacity).toBe(1);
    expect(layers(12).map((l) => l.shot)).toEqual(["birth", "milk"]);
    expect(layers(16).length).toBe(1);
  });

  it("leaves every line up long enough to read slowly, and asks nothing", () => {
    for (let i = 1; i < LINES.length; i++) expect(LINES[i].at).toBeGreaterThan(LINES[i - 1].to);
    for (const l of LINES) {
      expect(l.to - l.at).toBeGreaterThanOrEqual(1.8 + 0.045 * (l.text.length + (l.sub?.length ?? 0)));
      expect(l.text + (l.sub ?? "")).not.toContain("?");
    }
  });

  it("draws every shot without broken points", () => {
    for (const [name, s] of Object.entries(SHOTS)) {
      for (let t = s.from - MELT; t <= s.to + MELT; t += 2) {
        const f = shotFrame(name as ShotName, t);
        expect(f.tris.length).toBeGreaterThan(300);
        for (const tri of f.tris) for (const p of [tri.a, tri.b, tri.c]) if (!p.every(Number.isFinite)) throw new Error(`broken point in ${name} at ${t}`);
      }
    }
  });
});
