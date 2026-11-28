import { describe, expect, it } from "vitest";
import { checkFacts } from "../../src/kit/doc/facts";
import { FACTS, SOURCES } from "./facts";
import { LINES, TEXTS } from "./script";

const numbers = (s: string) => (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]$/, "").replace(/,/g, ""));

describe("pinatubo research", () => {
  it("backs every line and every word on screen with a sourced fact", () => {
    const claims = [...LINES.map((l) => ({ id: l.id, text: l.caption, facts: l.facts })), ...TEXTS];
    expect(checkFacts(claims, FACTS, SOURCES)).toEqual([]);
  });

  it("only states numbers its facts contain", () => {
    for (const c of [...LINES.map((l) => ({ id: l.id, text: l.caption, facts: l.facts })), ...TEXTS]) {
      const backing = c.facts.map((f) => FACTS[f].value).join(" ").replace(/,/g, "");
      for (const n of numbers(c.text)) expect(backing, `${c.id}: "${n}"`).toContain(n);
    }
  });

  it("keeps the narration to about a minute (a guide, ±20%)", () => {
    const words = LINES.reduce((a, l) => a + l.text.split(/\s+/).length, 0);
    expect(words).toBeLessThanOrEqual(170);
  });
});

describe("pinatubo media", () => {
  it("has a clean media list", async () => {
    const { mediaProblems } = await import("../../src/kit/doc/media");
    const { MEDIA } = await import("./media");
    expect(mediaProblems(MEDIA)).toEqual([]);
  });
});

describe("pinatubo layout", () => {
  it("lays the real voice out in about a minute (±20%), every line inside the film", async () => {
    const { LAYOUT } = await import("./layout.gen");
    expect(LAYOUT.seconds).toBeLessThanOrEqual(72);
    for (const [id, at] of Object.entries(LAYOUT.lines)) expect(at + LAYOUT.spoken[id], id).toBeLessThanOrEqual(LAYOUT.seconds);
  });
});

describe("pinatubo credits", () => {
  it("credits only what the film shows or plays", async () => {
    const { MEDIA } = await import("./media");
    const { LAYOUT } = await import("./layout.gen");
    const used = new Set(LAYOUT.shots.flatMap((s) => ("media" in s ? [s.media] : [])));
    expect(MEDIA.filter((m) => m.kind !== "audio" && !used.has(m.id)).map((m) => m.id)).toEqual([]);
  });
});

describe("pinatubo shots", () => {
  it("only uses media the media list credits, and no clip runs past its footage", async () => {
    const { MEDIA } = await import("./media");
    const { LAYOUT } = await import("./layout.gen");
    const { clipOverruns } = await import("../../src/kit/doc/film");
    const ids = new Set(MEDIA.map((m) => m.id));
    expect(LAYOUT.shots.flatMap((s) => ("media" in s && !ids.has(s.media) ? [s.media] : []))).toEqual([]);
    expect(clipOverruns(LAYOUT.shots, Object.fromEntries(MEDIA.map((m) => [m.id, m.use])))).toEqual([]);
  });
});
