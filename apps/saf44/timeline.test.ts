import { describe, expect, it } from "vitest";
import { FACTS, SOURCES } from "./facts";
import { CARDS, MAX_WORDS, SCENES, SECONDS, STAMPS, TALLIES, WP_FILM, counterAt, hoursSinceCall, minHold, sceneAt, wordCount } from "./timeline";

const words = [...CARDS, ...TALLIES];

describe("saf44 timeline", () => {
  it("runs its scenes back to back to 9:24", () => {
    const list = Object.values(SCENES);
    expect(SECONDS).toBe(564);
    expect(list[0].from).toBe(0);
    expect(list.at(-1)!.to).toBe(SECONDS);
    for (let i = 1; i < list.length; i++) expect(list[i].from).toBe(list[i - 1].to);
    expect(sceneAt(563.9)).toBe("end");
  });

  it("only ever shows one line at a time", () => {
    const all = [...words].sort((a, b) => a.from - b.from);
    for (let i = 1; i < all.length; i++) expect(all[i].from, all[i].text).toBeGreaterThanOrEqual(all[i - 1].to);
  });

  it("gives every line time to be read, and keeps it short", () => {
    for (const c of CARDS) {
      expect(wordCount(c.text), c.text).toBeLessThanOrEqual(MAX_WORDS);
      expect(c.to - c.from, c.text).toBeGreaterThanOrEqual(minHold(wordCount(c.text)));
    }
    for (const c of TALLIES) expect(c.to - c.from, c.text).toBeGreaterThanOrEqual(minHold(wordCount(`${c.n} ${c.text}`)));
  });

  it("gives the eye a rest: lines about 8 s or more apart on average", () => {
    expect((SECONDS - 12 - 8) / words.length).toBeGreaterThanOrEqual(8);
  });

  it("has at least three long stretches with no line up at all", () => {
    const all = [...words].sort((a, b) => a.from - b.from);
    let long = 0;
    for (let i = 1; i < all.length; i++) if (all[i].from - all[i - 1].to >= 15) long++;
    expect(long).toBeGreaterThanOrEqual(3);
  });

  it("backs every line with a sourced fact", () => {
    for (const c of words) {
      for (const id of [c.fact].flat()) {
        const fact = FACTS[id];
        expect(fact, c.text).toBeDefined();
        expect(fact.source.length).toBeGreaterThan(0);
        for (const s of fact.source) expect(SOURCES[s]).toBeTruthy();
      }
    }
  });

  it("states the record's toll, and its sum", () => {
    const n = (i: number) => Number(TALLIES[i].n);
    expect(n(0) + n(2) + n(3)).toBe(n(4));
    expect(n(4)).toBe(67);
  });

  it("names the survivor exactly once, at the bicycle", () => {
    const named = CARDS.filter((c) => /Lalan/.test(c.text));
    expect(named).toHaveLength(1);
    expect(sceneAt(named[0].from)).toBe("bicycle");
  });

  it("runs the counter forward only, and stops it at 10 h 48 m", () => {
    for (let t = SCENES.call.from; t < SCENES.threeRounds.to; t += 0.5) expect(hoursSinceCall(t + 0.5)).toBeGreaterThanOrEqual(hoursSinceCall(t));
    expect(counterAt(SCENES.call.from)).toBe("0H 00M SINCE THE FIRST CALL");
    expect(counterAt(WP_FILM[0])).toBe("10H 48M SINCE THE FIRST CALL");
    expect(counterAt(SCENES.threeRounds.to - 0.1)).toBe("10H 48M SINCE THE FIRST CALL");
  });

  it("hides the counter outside the wait", () => {
    expect(counterAt(SCENES.firstShots.from)).toBeUndefined();
    expect(counterAt(SCENES.eleven.from + 1)).toBeUndefined();
    expect(counterAt(SCENES.lights.from + 1)).toBeUndefined();
  });

  it("never overlaps its time stamps", () => {
    for (let i = 1; i < STAMPS.length; i++) expect(STAMPS[i].from).toBeGreaterThanOrEqual(STAMPS[i - 1].to);
  });
});
