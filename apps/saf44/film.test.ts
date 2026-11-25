import { describe, expect, it } from "vitest";
import type { Tri } from "../../src/kit/lowpoly/engine";
import { SHOTS, filmAt } from "./film";
import { SCENES, SECONDS } from "./timeline";

const finite = (x: Tri) => Number.isFinite(x.a[0] + x.a[1] + x.a[2] + x.b[0] + x.b[1] + x.b[2] + x.c[0] + x.c[1] + x.c[2] + x.color[0] + x.color[1] + x.color[2]);

describe("the film", () => {
  it("plays its shots back to back, from start to end", () => {
    expect(SHOTS[0].from).toBe(0);
    expect(SHOTS.at(-1)!.to).toBe(SECONDS);
    for (let i = 1; i < SHOTS.length; i++) expect(SHOTS[i].from).toBe(SHOTS[i - 1].to);
  });

  it("holds every shot at least 6 seconds", () => {
    for (const s of SHOTS) expect(s.to - s.from, `at ${s.from}`).toBeGreaterThanOrEqual(6);
  });

  it("cuts hard only into violence", () => {
    expect(SHOTS.filter((s) => s.in === "cut").map((s) => s.from)).toEqual([SCENES.fifteen.from]);
  });

  it("goes through black at most three times after the title", () => {
    expect(SHOTS.filter((s) => s.in === "black").length - 1).toBeLessThanOrEqual(3);
  });

  it("builds every shot from its own clock, with no broken numbers", () => {
    const broken: string[] = [];
    for (let t = 0.3; t < SECONDS; t += 3.1) {
      const { now, before } = filmAt(t);
      for (const b of [now, before]) {
        if (!b) continue;
        if (!b.frame.tris.every(finite)) broken.push(`triangle at ${t}`);
        for (const g of b.frame.glowsFront ?? []) if (!Number.isFinite(g.radius + g.alpha) || g.radius < 0) broken.push(`glow at ${t}`);
      }
    }
    expect(broken).toEqual([]);
  }, 120000);

  it("draws the same moment the same way, in any order", () => {
    const sig = (t: number) => {
      const { now } = filmAt(t);
      return now.frame.tris.length + ":" + now.frame.tris.slice(-30).map((x) => x.a.map((v) => v.toFixed(3)).join()).join("|");
    };
    const a = sig(300);
    filmAt(130);
    expect(sig(300)).toBe(a);
  });

  it("melts one shot into the next, rather than jumping", () => {
    const start = SCENES.bridge.from;
    expect(filmAt(start + 0.01).before).toBeDefined();
    expect(filmAt(start + 0.01).mix).toBeLessThan(0.05);
    expect(filmAt(start + 5).before).toBeUndefined();
  });

  it("goes straight into the blast with nothing before it", () => {
    const f = filmAt(SCENES.fifteen.from + 0.01);
    expect(f.before).toBeUndefined();
    expect(f.mix).toBe(1);
  });

  it("names at most two places in any one frame", () => {
    for (let t = 0.3; t < SECONDS; t += 6.7) expect(filmAt(t).now.fx.tags.length, `at ${t}`).toBeLessThanOrEqual(2);
  }, 120000);
});
