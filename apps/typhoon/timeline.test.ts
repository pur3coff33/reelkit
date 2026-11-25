import { describe, expect, it } from "vitest";
import { LINES, SECONDS, SHOTS, lineSeconds, shotAt, signalAt, stormAt, storyHours } from "./timeline";

describe("typhoon timeline", () => {
  it("runs 16 shots back to back for exactly three minutes", () => {
    expect(SHOTS).toHaveLength(16);
    expect(SHOTS[0].from).toBe(0);
    expect(SHOTS.at(-1)!.to).toBe(SECONDS);
    expect(SECONDS).toBe(180);
    for (let i = 1; i < SHOTS.length; i++) expect(SHOTS[i].from).toBe(SHOTS[i - 1].to);
  });

  it("keeps every line inside its slot, with no two speakers talking over each other", () => {
    for (let i = 0; i < LINES.length; i++) {
      const l = LINES[i];
      expect(lineSeconds(l)).toBeLessThanOrEqual(l.max);
      if (LINES[i + 1]) expect(l.at + lineSeconds(l)).toBeLessThanOrEqual(LINES[i + 1].at);
    }
  });

  it("starts and ends each line inside one shot", () => {
    for (const l of LINES) expect(shotAt(l.at).name).toBe(shotAt(l.at + lineSeconds(l) - 0.01).name);
  });

  it("gives every line in Filipino an English subtitle", () => {
    for (const l of LINES) if (["tomas", "nena", "jun", "kap"].includes(l.who)) expect(l.sub).toBeTruthy();
  });

  it("never runs the story clock backwards", () => {
    let last = -Infinity;
    for (let t = 0; t < SECONDS; t += 0.25) {
      const h = storyHours(t);
      expect(h).toBeGreaterThanOrEqual(last);
      last = h;
    }
  });

  it("holds the approved storm figures", () => {
    expect(stormAt(-72)).toMatchObject({ winds: 175, pressure: 935, distanceKm: 1008 });
    expect(stormAt(-12)).toMatchObject({ winds: 350, pressure: 850 });
    expect(signalAt(-12)).toBe(5);
  });
});
