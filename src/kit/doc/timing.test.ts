import { describe, expect, it } from "vitest";
import { layOut, staleLines, type Beat } from "./timing";

const beats: Beat[] = [
  { lines: ["a"], shots: [{ id: "s1", kind: "title", text: "1", min: 2 }] },
  { lines: ["b", "c"], shots: [{ id: "s2", kind: "title", text: "2", min: 2 }, { id: "s3", kind: "title", text: "3", min: 4 }] },
  { lines: [], shots: [{ id: "end", kind: "title", text: "end", min: 3 }] },
];
const spoken = { a: 3, b: 2.5, c: 4 };

describe("layOut", () => {
  it("runs the shots back to back from 0", () => {
    const { shots } = layOut(beats, spoken, 60);
    expect(shots[0].from).toBe(0);
    for (let i = 1; i < shots.length; i++) expect(shots[i].from).toBeCloseTo(shots[i - 1].to);
  });

  it("ends every line before its beat's last shot ends, with lines in order and apart", () => {
    const { shots, lines } = layOut(beats, spoken, 60);
    expect(lines.a + spoken.a).toBeLessThanOrEqual(shots[0].to);
    expect(lines.b).toBeGreaterThanOrEqual(shots[1].from);
    expect(lines.c).toBeGreaterThanOrEqual(lines.b + spoken.b + 0.4);
    expect(lines.c + spoken.c).toBeLessThanOrEqual(shots[2].to);
  });

  it("splits a beat between its shots by their minimum lengths, and never below them", () => {
    const { shots } = layOut(beats, spoken, 60);
    const s2 = shots[1].to - shots[1].from, s3 = shots[2].to - shots[2].from;
    expect(s2).toBeGreaterThanOrEqual(2);
    expect(s3 / s2).toBeCloseTo(2);
  });

  it("holds a beat with no lines for its minimum", () => {
    const { shots } = layOut(beats, spoken, 60);
    expect(shots.at(-1)!.to - shots.at(-1)!.from).toBeCloseTo(3);
  });

  it("refuses a film longer than its length, saying by how much", () => {
    expect(() => layOut(beats, { a: 30, b: 20, c: 20 }, 60)).toThrow(/over by \d/);
  });
});

describe("layOut refuses broken beats", () => {
  it("a beat with lines but no shots", () => expect(() => layOut([{ lines: ["a"], shots: [] }], spoken, 60)).toThrow(/no shots/));
  it("a beat whose shots all have no minimum length", () => {
    expect(() => layOut([{ lines: ["a"], shots: [{ id: "z", kind: "title", text: "z", min: 0 }] }], spoken, 60)).toThrow(/minimum/);
  });
});

describe("staleLines", () => {
  it("names lines whose recorded length no longer matches the layout", () => {
    expect(staleLines({ a: 3, b: 2.5 }, [{ id: "a", seconds: 3.001 }, { id: "b", seconds: 2.9 }, { id: "c", seconds: 1 }])).toEqual(["b", "c"]);
  });
});
