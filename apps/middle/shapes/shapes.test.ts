import { describe, expect, it } from "vitest";
import { rng } from "../../../src/kit/looks/core";
import type { Sampler } from "../../../src/kit/looks/dots/forms";
import { LAYOUT } from "../layout.gen";
import { SCENES, SECONDS, type SceneName } from "../timeline";
import { SHAPES } from "./index";

/** Scenes whose camera flies through or that fill more than the frame on purpose. */
const WIDE: SceneName[] = ["web", "galaxy", "vacuum", "foam"];

function points(s: Sampler, t: number, n = 400) {
  const r = rng(1);
  return Array.from({ length: n }, (_, i) => {
    const d = s(r), o = [...d.p, ...d.c];
    s.life?.(o, t, (i + 0.5) / n, (i * 2.4) % 6.283);
    return o;
  });
}

const built = SCENES.filter((s) => SHAPES[s.name]).map((s) => [s.name, SHAPES[s.name]!(LAYOUT.scenes[s.name])] as const);

describe("scene shapes", () => {
  it("has a shape for every scene", () => {
    expect(SCENES.filter((s) => !SHAPES[s.name]).map((s) => s.name)).toEqual([]);
  });

  it.each(built.map(([n]) => n))("%s stays whole and lit at every moment", (name) => {
    const shape = built.find(([n]) => n === name)![1], { from, to } = LAYOUT.scenes[name];
    for (const t of [0, from, (from + to) / 2, to, SECONDS])
      for (const o of points(shape, t)) {
        for (const v of o) expect(Number.isFinite(v)).toBe(true);
        expect(Math.hypot(o[0], o[1])).toBeLessThan(40);
        for (const c of o.slice(3)) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(3);
        }
      }
  });

  it.each(built.map(([n]) => n).filter((n) => !WIDE.includes(n)))("%s fills the frame, not past it", (name) => {
    const shape = built.find(([n]) => n === name)![1], { from, to } = LAYOUT.scenes[name];
    const pts = points(shape, (from + to) / 2), inside = pts.filter(([x, y, z]) => Math.abs(x) <= 2.9 && y >= -5.4 && y <= 4.4 && Math.abs(z) <= 4);
    expect(inside.length / pts.length).toBeGreaterThanOrEqual(0.6);
  });
});
