import { describe, expect, it } from "vitest";
import { checkFacts, type Fact, type Source } from "./facts";

const sources: Record<string, Source> = { USGS: { title: "USGS Fact Sheet 113-97", url: "https://pubs.usgs.gov/fs/1997/fs113-97/", accessed: "2026-11-27" } };
const facts: Record<string, Fact> = { date: { value: "15 June 1991", sources: ["USGS"], where: "para 1" } };

describe("checkFacts", () => {
  it("passes when every claim names facts that name sources", () => {
    expect(checkFacts([{ id: "l1", text: "June 15, 1991.", facts: ["date"] }], facts, sources)).toEqual([]);
  });

  it("flags a claim that names no facts", () => {
    const p = checkFacts([{ id: "l1", text: "It was big.", facts: [] }], facts, sources);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("l1");
  });

  it("flags a fact id that doesn't exist", () => {
    const p = checkFacts([{ id: "l1", text: "x", facts: ["height"] }], facts, sources);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("height");
  });

  it("flags a fact with no sources", () => {
    const p = checkFacts([{ id: "l1", text: "x", facts: ["bare"] }], { bare: { value: "v", sources: [], where: "" } }, sources);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("bare");
  });

  it("flags a fact citing a source that doesn't exist", () => {
    const p = checkFacts([{ id: "l1", text: "x", facts: ["d"] }], { d: { value: "v", sources: ["NYT"], where: "" } }, sources);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("NYT");
  });

  it("doesn't mind a fact no claim uses", () => {
    expect(checkFacts([], facts, sources)).toEqual([]);
  });
});
