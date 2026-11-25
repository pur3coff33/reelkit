import { describe, expect, it } from "vitest";
import type { Tri } from "../lowpoly/engine";
import * as box from "./box/things";
import { DUSK, landAt, shader, type BoxWorld } from "./box/world";
import { backOut, eyelid, keepLast, rng, type V3 } from "./core";
import * as form from "./dots/forms";
import { makeCloud, pointAt, progress, project, type Group } from "./dots/scene";
import { showing } from "./Film";
import { place } from "./paper/stage";

describe("core", () => {
  it("opens, blinks and shuts eyes", () => {
    expect(eyelid(0.9, 1)).toBe(0);
    expect(eyelid(1.5, 1)).toBe(1);
    expect(eyelid(2.1, 1, [2])).toBeLessThan(0.05);
    expect(eyelid(2.4, 1, [2])).toBeCloseTo(1);
    expect(eyelid(4, 1, [], 3)).toBe(0);
  });

  it("overshoots, then lands", () => {
    expect(backOut(0)).toBeCloseTo(0);
    expect(backOut(0.7)).toBeGreaterThan(1);
    expect(backOut(1)).toBe(1);
  });

  it("keeps only the last few built things", () => {
    let built = 0;
    const get = keepLast(2, () => ++built);
    const [a, b, c] = [{}, {}, {}];
    get(a), get(b), get(a), get(c);
    expect(get(a)).toBe(1);
    expect(get(b)).toBe(4);
  });
});

describe("paper", () => {
  it("moves near sheets more than far ones, and the frame hardly at all", () => {
    const [far, near, frame] = [place({ z: 5 }, 0.2, 0, 0), place({ z: 1.5 }, 0.2, 0, 0), place({ z: 1, frame: true }, 0.2, 0, 0)];
    expect(near.scale).toBeGreaterThan(far.scale);
    expect(far.scale).toBeGreaterThan(1);
    expect(frame.scale).toBeLessThan(1.1);
  });

  it("pops a sheet up from below and leaves it in place", () => {
    expect(place({ z: 2, rise: 0.5 }, 0, 0, 0).y).toBeGreaterThan(100);
    expect(place({ z: 2, rise: 0.5 }, 0, 0, 3).y).toBeCloseTo(0);
    expect(place({ z: 2 }, 0, 0, 0).y).toBe(0);
  });
});

describe("box", () => {
  const things = [
    box.balete({ at: [0, 0, 0] }), box.tree({ at: [1, 0, 0] }), box.palm({ at: [1, 0, 1] }), box.hut({ at: [-1, 0, 0] }), box.house({ at: [-1, 0, 1] }), box.walker({ at: [0, 0, 1] }),
    box.kapre({ at: [0, 1, 0] }), box.rock({ at: [1, 0, -1] }), box.banca({ at: [-1, 0, -1] }), box.volcano({ at: [0, 0, -1] }), box.cloud({ at: [0, 2, 0] }), box.fish({ at: [0, 2, 1] }),
  ];
  const world: BoxWorld = { things, sky: () => DUSK, camera: () => ({ yaw: 0 }) };

  it("writes a function for each thing, with every material filled in", () => {
    const src = shader({ ...world, land: { waves: [{ amp: -0.1, fx: -1, fz: 2 }], water: { level: -0.02, color: [0, 0, 1] }, path: { points: [[-1, -1], [1, 1]] } } }, 2);
    things.forEach((_, i) => expect(src).toContain(`vec2 f${i}(`));
    expect(src).not.toMatch(/MAT\d/);
    expect(src).not.toMatch(/undefined|NaN/);
    expect(src).not.toMatch(/--|\+-|-\+/);
  });

  it("gives every thing its own materials", () => {
    const ids = [...shader(world, 0).matchAll(/if\(m<([\d.]+)\)return mix|if\(m<([\d.]+)\)return vec3/g)].map((m) => +(m[1] ?? m[2])).filter((x) => x > 3);
    expect(new Set(ids).size).toBe(things.reduce((n, t) => n + t.mats.length, 0));
  });

  it("says so when a thing names a material it doesn't have", () => {
    expect(() => shader({ ...world, things: [{ ...box.rock({ at: [0, 0, 0] }), sdf: "return vec2(length(q),MAT3);" }] }, 0)).toThrow(/MAT3/);
  });

  it("finds the ground and a turned thing's hand", () => {
    expect(landAt({ waves: [{ amp: 2, fx: 0, fz: 0, px: Math.PI / 2 }] }, 5, 5)).toBeCloseTo(2);
    const [x, y, z] = box.held({ at: [1, 0, 0], turn: Math.PI / 2, scale: 2 }, [0.5, 1, 0]);
    expect([x, y, z].map((n) => +n.toFixed(6))).toEqual([1, 2, 1]);
  });
});

describe("dots", () => {
  const shapes: Record<string, form.Sampler> = {
    balete: form.balete(rng(1)), giant: form.giant(rng(2)), person: form.person(), ground: form.ground(), sea: form.sea(), stars: form.stars(), swarm: form.swarm(), ball: form.ball([0, 0, 0], 1, [1, 1, 1]),
  };
  it.each(Object.keys(shapes))("%s has only real points", (name) => {
    const r = rng(3);
    for (let i = 0; i < 500; i++) {
      const { p, c } = shapes[name](r);
      for (const v of [...p, ...c]) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("keeps the giant on the ground", () => {
    const r = rng(4);
    for (let i = 0; i < 2000; i++) expect(shapes.giant(r).p[1]).toBeGreaterThanOrEqual(0);
  });

  it("shares points out by weight", () => {
    const s = form.join([[3, form.ball([0, 0, 0], 0, [1, 0, 0])], [1, form.ball([0, 0, 0], 0, [0, 1, 0])]]), r = rng(5);
    const red = Array.from({ length: 2000 }, () => s(r).c[0]).reduce((a, b) => a + b, 0);
    expect(red / 2000).toBeGreaterThan(0.7);
    expect(red / 2000).toBeLessThan(0.8);
  });

  it("covers a low-poly model by area", () => {
    const tri = (a: V3, b: V3, c: V3, color: V3): Tri => ({ a, b, c, color }) as Tri;
    const s = form.fromTris([tri([0, 0, 0], [3, 0, 0], [0, 3, 0], [255, 0, 0]), tri([0, 0, 5], [1, 0, 5], [0, 1, 5], [0, 255, 0])]), r = rng(6);
    let big = 0;
    for (let i = 0; i < 2000; i++) {
      const { p } = s(r);
      expect(p[0] >= -1e-9 && p[1] >= -1e-9 && p[0] + p[1] <= 3 + 1e-9).toBe(true);
      if (p[2] === 0) big++;
    }
    expect(big / 2000).toBeGreaterThan(0.86);
    expect(() => form.fromTris([])).toThrow();
  });

  it("leaves one shape and arrives exactly at the next", () => {
    const g: Group = { n: 200, seed: 1, shape: shapes.balete, steps: [{ to: shapes.giant, at: 1, dur: 1, spread: 0.5, flash: [1, 1, 1] }, { to: shapes.swarm, at: 4 }] };
    const cloud = makeCloud(g), out: number[] = [];
    for (let i = 0; i < g.n; i++) {
      for (const [t, form] of [[0.5, 0], [3, 1], [8, 2]]) {
        pointAt(g, cloud, i, t, out);
        for (let k = 0; k < 3; k++) {
          expect(out[k]).toBeCloseTo(cloud.forms[form].p[i * 3 + k], 4);
          expect(out[k + 3]).toBeCloseTo(cloud.forms[form].c[i * 3 + k], 4);
        }
      }
    }
  });

  it("sends the low points first when going up", () => {
    const s = { to: shapes.giant, at: 0, order: "up" as const };
    expect(progress(s, 0.6, 0, 0.5)).toBeGreaterThan(progress(s, 0.6, 1, 0.5));
  });

  it("puts the looked-at point where it's asked to", () => {
    const [x, y, z] = project({ yaw: 1, dist: 9, height: 2, center: [500, 900] })(0, 2, 0);
    expect([x, y, z]).toEqual([500, 900, 9]);
  });
});

describe("film", () => {
  const paint = () => {};
  const scenes = [{ from: 0, to: 5, paint }, { from: 5, to: 9, paint, melt: 1 }, { from: 9, to: 12, paint }];
  it("cuts and melts", () => {
    expect(showing(scenes, 3)).toEqual([{ scene: scenes[0], opacity: 1 }]);
    expect(showing(scenes, 5.5).map((s) => s.opacity)).toEqual([1, 0.5]);
    expect(showing(scenes, 7)).toEqual([{ scene: scenes[1], opacity: 1 }]);
    expect(showing(scenes, 9)).toEqual([{ scene: scenes[2], opacity: 1 }]);
    expect(showing(scenes, -1)).toEqual([]);
  });
});
