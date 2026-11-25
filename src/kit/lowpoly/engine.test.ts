import { describe, expect, it } from "vitest";
import { shade, type Camera, type Env, type Tri } from "./engine";

const env: Env = {
  skyTop: [0, 0, 0], skyBottom: [0, 0, 0], fog: [0, 0, 0], fogNear: 100, fogFar: 200,
  sun: [0, 1, 0], sunColor: [40, 40, 60], ambient: [30, 30, 40],
};
const cam: Camera = { pos: [0, 3, -6], target: [0, 0, 0], fov: 50 };
const floor: Tri = { a: [-1, 0, -1], b: [1, 0, -1], c: [0, 0, 1], color: [120, 120, 120] };

describe("shade", () => {
  it("is unchanged by an empty or missing light list", () => {
    expect(shade(floor, cam, env, 6)).toEqual(shade(floor, cam, env, 6, []));
  });

  it("brightens a face near a point light, in the light's colour", () => {
    const base = shade(floor, cam, env, 6);
    const lit = shade(floor, cam, env, 6, [{ p: [0, 1, 0], color: [255, 140, 40], intensity: 1, range: 6 }]);
    expect(lit[0] - base[0]).toBeGreaterThan(lit[2] - base[2]);
    expect(lit[0]).toBeGreaterThan(base[0] + 20);
  });

  it("ignores a light out of range", () => {
    const base = shade(floor, cam, env, 6);
    expect(shade(floor, cam, env, 6, [{ p: [0, 1, 50], color: [255, 140, 40], intensity: 1, range: 6 }])).toEqual(base);
  });

  it("makes a mirror face glint where it reflects the light towards the camera", () => {
    const water: Tri = { ...floor, color: [20, 30, 40], mirror: 1 };
    // The light mirrored in the floor plane sits on the camera's line through the face's centre.
    const inLine = shade(water, cam, env, 6, [{ p: [0, 3, 6], color: [255, 140, 40], intensity: 1, range: 20 }]);
    const offLine = shade(water, cam, env, 6, [{ p: [8, 3, 0], color: [255, 140, 40], intensity: 1, range: 20 }]);
    expect(inLine[0]).toBeGreaterThan(offLine[0] + 40);
  });
});
