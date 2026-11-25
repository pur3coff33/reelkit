import { describe, expect, it } from "vitest";
import { rng } from "../core";
import type { Sampler } from "./forms";
import { STANDING } from "./ideas";
import * as L from "./lives";

const shapes: Record<string, Sampler> = {
  seated: L.skinOf(L.SEATED), curled: L.skinOf(L.CURLED), upper: L.skinOf(L.UPPER),
  tableau: L.tableau([L.someone(STANDING, -1, 0), { shape: L.boat, weight: 2, turn: 1 }, { shape: L.egg(), weight: 3, at: [1, 0, 0], scale: 0.5 }]),
  stream: L.stream([-1, 0, 0], [1, 0, 0], { both: true }), wall: L.wall(4, 3, (t) => t / 10), glass: L.saltGlass(1, 4, [5, 6, 7]),
  boat: L.boat, net: L.net, crown: L.crown, gown: L.gown, helmet: L.helmet, rifle: L.rifle, bus: L.busWindow(), water: L.water(-1, { glint: 0 }),
  circling: L.circling(STANDING, 10), egg: L.egg({ metal: "rainbow", crack: (t) => t / 10 }), silver: L.egg({ metal: "silver" }),
};

const points = (s: Sampler, t: number, n = 300) => {
  const r = rng(4);
  return Array.from({ length: n }, (_, i) => {
    const d = s(r), o = [...d.p, ...d.c];
    s.life?.(o, t, (i + 0.5) / n, i * 0.7);
    return o;
  });
};

describe("lives", () => {
  it.each(Object.keys(shapes))("%s stays whole for five minutes", (name) => {
    for (const t of [0, 3, 61, 299])
      for (const o of points(shapes[name], t)) {
        for (const v of o) expect(Number.isFinite(v)).toBe(true);
        expect(Math.hypot(o[0], o[1], o[2])).toBeLessThan(30);
      }
  });

  it("puts each piece of a tableau where it stands", () => {
    const one = L.tableau([{ shape: L.boat, weight: 1, at: [5, 0, 0], scale: 0.5 }]);
    for (const o of points(one, 1)) expect(Math.abs(o[0] - 5)).toBeLessThan(1.2);
  });

  it("keeps the cracks dark until they open", () => {
    const egg = L.egg({ crack: (t) => (t > 5 ? 1 : 0) }), r = rng(1);
    let dark = 0, lit = 0;
    for (let i = 0; i < 3000; i++) {
      const d = egg(r);
      if (d.c[0] !== 2) continue;
      const a = [...d.p, ...d.c], b = [...d.p, ...d.c];
      egg.life!(a, 0, 0.5, 0);
      egg.life!(b, 9, 0.5, 0);
      if (a[3] < 0.01) dark++;
      if (b[3] > 1) lit++;
    }
    expect(dark).toBeGreaterThan(100);
    expect(lit).toBe(dark);
  });

  it("drops the salt and spreads it through the water", () => {
    const top = (t: number) => Math.max(...points(shapes.glass, t).filter((o) => o[3] > 1.2 || o[4] > 0.9).map((o) => o[1]));
    expect(top(0)).toBeGreaterThan(2);
    expect(top(4.5)).toBeLessThan(0.7);
  });
});
