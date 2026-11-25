import { describe, expect, it } from "vitest";
import type { Tri } from "../../src/kit/lowpoly/engine";
import { BAMBOO, costFrame } from "./act7to8";
import { STRAFE, FIRST_SHOT } from "./fire";
import { rifleman } from "./props";
import { HIDER, elevenHoursFrame, firstShotsFrame, weightFrame } from "./scenes";

const finite = (t: Tri) => Number.isFinite(t.a[0] + t.a[1] + t.a[2] + t.b[0] + t.b[1] + t.b[2] + t.c[0] + t.c[1] + t.c[2]) && Number.isFinite(t.color[0] + t.color[1] + t.color[2]);

describe("the bridge in What It Cost", () => {
  const ys = (t: Tri) => [t.a[1], t.b[1], t.c[1]];
  const parts = costFrame(3).frame.tris.filter((t) => t.color.join() === BAMBOO.join());

  it("stands on piers that reach the water", () => {
    expect(Math.min(...parts.flatMap(ys))).toBeLessThanOrEqual(0);
  });

  it("has rails above the deck, so it reads as a bridge", () => {
    expect(Math.max(...parts.flatMap(ys))).toBeGreaterThan(3);
  });
});

describe("the clip's scenes", () => {
  const scenes = { weightFrame: [weightFrame, 24], firstShotsFrame: [firstShotsFrame, 12], elevenHoursFrame: [elevenHoursFrame, 18] } as const;

  for (const [name, [scene, length]] of Object.entries(scenes)) {
    it(`${name} builds from its own clock with no broken numbers`, () => {
      for (let u = 0; u < length; u += 0.25) {
        const { frame } = scene(u);
        expect(frame.tris.length).toBeGreaterThan(100);
        expect(frame.tris.every(finite), `u=${u}`).toBe(true);
      }
    });

    it(`${name} draws the same frame the same way twice`, () => {
      const sig = () => scene(3).frame.tris.slice(-30).map((x) => x.a.join()).join("|");
      const first = sig();
      scene(1);
      expect(sig()).toBe(first);
    });
  }

  it("keeps quiet until the first shot, then the light jumps", () => {
    const before = firstShotsFrame(FIRST_SHOT - 0.2);
    expect(before.frame.glowsFront ?? []).toHaveLength(0);
    let flashes = 0;
    for (let u = FIRST_SHOT; u < FIRST_SHOT + 2; u += 1 / 30) flashes += (firstShotsFrame(u).frame.glowsFront ?? []).length;
    expect(flashes).toBeGreaterThan(0);
  });

  it("never lands a round on the man in the river", () => {
    for (const s of STRAFE) expect(Math.hypot(s.x - HIDER[0], s.z - HIDER[2])).toBeGreaterThan(4);
  });
});

describe("the rifle", () => {
  const muzzleOf = (carry: "aim" | "ready" | "slung") => rifleman([] as Tri[], [0, 0, 0], 0, { carry });

  it("comes down off the shoulder when a man is walking", () => {
    expect(muzzleOf("ready")[1]).toBeLessThan(muzzleOf("aim")[1] - 0.25);
  });

  it("points up behind him when slung", () => {
    expect(muzzleOf("slung")[2]).toBeLessThan(0);
    expect(muzzleOf("slung")[1]).toBeGreaterThan(1.3);
  });

  it("kicks up when it fires", () => {
    const quiet = rifleman([], [0, 0, 0], 0, { kick: 0 });
    const fired = rifleman([], [0, 0, 0], 0, { kick: 1 });
    expect(fired[1]).toBeGreaterThan(quiet[1]);
  });
});
