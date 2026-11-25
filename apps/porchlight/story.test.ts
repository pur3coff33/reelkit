import { describe, expect, it } from "vitest";
import { CAST, CUTS, LAMP_LIT, LAMP_OFF, SECONDS, lampOn } from "./story";

const there = (p: readonly number[]) => p[1] > -5;
/** Behind a house's walls, where coming and going isn't seen. */
const inside = ([x, , z]: readonly number[]) => z < -0.4 && Math.abs(Math.abs(x) - 1.35) < 0.45;

describe("the people and the dog", () => {
  for (const [name, at] of Object.entries(CAST)) {
    it(`${name} never jumps, appears or turns sharply in the middle of a shot`, () => {
      const jumps: string[] = [];
      for (let f = 1; f < SECONDS * 30; f++) {
        const t = f / 30;
        if (CUTS.some((c) => t >= c - 1e-6 && t - 1 / 30 < c + 1e-6)) continue;
        const a = at(t - 1 / 30), b = at(t);
        for (const v of [...b.at, b.turn ?? 0, ...(b.k ?? [])]) expect(Number.isFinite(v)).toBe(true);
        if (there(a.at) !== there(b.at)) {
          if (!inside(there(a.at) ? a.at : b.at)) jumps.push(`${t.toFixed(2)} ${there(b.at) ? "appears" : "vanishes"}`);
        }
        else if (there(b.at)) {
          const d = Math.hypot(...b.at.map((v, i) => v - a.at[i])), turn = Math.abs(Math.atan2(Math.sin((b.turn ?? 0) - (a.turn ?? 0)), Math.cos((b.turn ?? 0) - (a.turn ?? 0))));
          if (d > 0.12) jumps.push(`${t.toFixed(2)} moves ${d.toFixed(2)}`);
          else if (turn > 1.2) jumps.push(`${t.toFixed(2)} turns ${turn.toFixed(2)}`);
        }
      }
      expect(jumps).toEqual([]);
    });
  }
});

describe("the light", () => {
  it("is never on before he first lights it, once the hook is over", () => {
    for (let t = 6.1; t < 55; t += 0.1) expect(lampOn(t)).toBe(0);
  });

  it("comes on when the score says so, and goes off when he switches it off", () => {
    for (const at of LAMP_LIT) {
      expect(lampOn(at - 0.4)).toBeLessThan(0.5);
      expect(lampOn(at + 0.4)).toBeGreaterThan(0.5);
    }
    expect(lampOn(LAMP_OFF - 0.1)).toBe(1);
    expect(lampOn(LAMP_OFF + 1)).toBe(0);
    for (let t = LAMP_OFF + 1; t < SECONDS; t += 0.2) expect(lampOn(t)).toBe(0);
  });
});
