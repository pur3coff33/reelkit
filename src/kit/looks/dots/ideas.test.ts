import { describe, expect, it } from "vitest";
import { rng } from "../core";
import type { Sampler } from "./forms";
import { MEDITATOR, STANDING, butterfly, eye, galaxyPerson, mandala, net, person, river, seaPerson, ship, skin, tunnel, winged } from "./ideas";
import { makeCloud, pointAt, type Group } from "./scene";
import { neon } from "./trip";

const shapes: Record<string, Sampler> = {
  person: person(MEDITATOR, { stream: 0.4 }), standing: person(STANDING), ship: ship(2, 8), river: river(), butterfly: butterfly(), winged: winged(() => 0.5),
  eye: eye(() => 1, () => 0.5), tunnel: tunnel((t) => 2 * t), net: net((t) => t), sea: seaPerson(MEDITATOR, -1, (t) => Math.min(1, t / 5)), galaxy: galaxyPerson(MEDITATOR), mandala: mandala(),
};

/** Points of a shape at time t. */
function at(s: Sampler, t: number, n = 400) {
  const r = rng(1);
  return Array.from({ length: n }, (_, i) => {
    const d = s(r), o = [...d.p, ...d.c];
    s.life?.(o, t, (i + 0.5) / n, (i * 2.4) % 6.283);
    return o;
  });
}

describe("ideas", () => {
  it.each(Object.keys(shapes))("%s stays whole for two minutes", (name) => {
    for (const t of [0, 0.5, 7, 33.3, 119.9])
      for (const o of at(shapes[name], t)) {
        for (const v of o) expect(Number.isFinite(v)).toBe(true);
        expect(Math.hypot(o[0], o[1])).toBeLessThan(40);
        for (const c of o.slice(3)) expect(c).toBeGreaterThanOrEqual(0);
      }
  });

  it("keeps skin points on the outside", () => {
    const r = rng(2), s = skin(MEDITATOR);
    let inside = 0;
    for (let i = 0; i < 1000; i++) {
      const { p } = s(r);
      if (MEDITATOR.some((l) => ((p[0] - l.at[0]) / l.size[0]) ** 2 + ((p[1] - l.at[1]) / l.size[1]) ** 2 + ((p[2] - l.at[2]) / l.size[2]) ** 2 < 0.9)) inside++;
    }
    expect(inside).toBeLessThan(30);
  });

  it("replaces every plank by the end", () => {
    // Amber has far more red than blue; none of the hull is amber after `to`.
    const same = at(shapes.ship, 1).map((o) => o.slice(3).join()), later = at(shapes.ship, 20).map((o) => o.slice(3).join());
    expect(later.filter((c, i) => c !== same[i]).length).toBeGreaterThan(300);
  });

  it("lifts someone out of the sea", () => {
    const top = (t: number) => Math.max(...at(shapes.sea, t).map((o) => o[1]));
    expect(top(5)).toBeGreaterThan(1.5);
    expect(top(0)).toBeLessThan(0.2);
  });

  it("colours without going dark or over its gain", () => {
    for (let x = 0; x < 1; x += 0.05) {
      const o = [0, 0, 0];
      neon(x, o, 0, 1);
      expect(Math.max(...o)).toBeGreaterThan(0.4);
      expect(Math.max(...o)).toBeLessThanOrEqual(1);
    }
  });

  it("arrives at a living shape as that shape is then", () => {
    const g: Group = { n: 50, seed: 1, shape: shapes.river, steps: [{ to: shapes.butterfly, at: 1 }] };
    const cloud = makeCloud(g), out: number[] = [];
    for (let i = 0; i < g.n; i++) {
      pointAt(g, cloud, i, 9, out);
      const want = [...cloud.forms[1].p.slice(i * 3, i * 3 + 3), ...cloud.forms[1].c.slice(i * 3, i * 3 + 3)];
      shapes.butterfly.life!(want, 9, cloud.key[i], cloud.phase[i]);
      out.forEach((v, k) => expect(v).toBeCloseTo(want[k], 5));
    }
  });
});
