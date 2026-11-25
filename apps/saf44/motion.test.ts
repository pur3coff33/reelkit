import { describe, expect, it } from "vitest";
import { fidget, gait, recoil } from "./motion";

describe("gait", () => {
  it("keeps a planted foot still in the world while the body walks over it", () => {
    let worst = 0;
    let plantedAt: number | null = null;
    for (let dist = 0; dist < 12; dist += 0.01) {
      const g = gait(dist, 0.7, 0.13);
      const planted = g.footL[1] <= 0.041;
      const worldZ = dist + g.footL[2];
      if (planted && plantedAt !== null) worst = Math.max(worst, Math.abs(worldZ - plantedAt));
      plantedAt = planted ? (plantedAt ?? worldZ) : null;
    }
    expect(worst).toBeLessThan(0.03);
  });

  it("stays planted whatever the body's speed, since it reads distance and not time", () => {
    const eased = (t: number) => t * t * (3 - 2 * t);
    let worst = 0;
    let plantedAt: number | null = null;
    for (let t = 0; t < 1; t += 0.001) {
      const dist = eased(t) * 20;
      const g = gait(dist, 1.4, 0.4, 0.35);
      const planted = g.footR[1] <= 0.041;
      const worldZ = dist + g.footR[2];
      if (planted && plantedAt !== null) worst = Math.max(worst, Math.abs(worldZ - plantedAt));
      plantedAt = planted ? (plantedAt ?? worldZ) : null;
    }
    expect(worst).toBeLessThan(0.04);
  });

  it("has one foot ahead when the other is behind", () => {
    const g = gait(1.23, 0.7, 0);
    expect(Math.sign(g.footL[2])).toBe(-Math.sign(g.footR[2]));
  });

  it("lifts a foot only while it swings forward", () => {
    let swung = false;
    for (let dist = 0; dist < 4; dist += 0.02) {
      const a = gait(dist, 0.7, 0), b = gait(dist + 0.01, 0.7, 0);
      if (a.footL[1] > 0.06) {
        swung = true;
        expect(b.footL[2]).toBeGreaterThan(a.footL[2]);
      }
    }
    expect(swung).toBe(true);
  });

  it("takes longer strides when asked to", () => {
    const reach = (step: number) => {
      let most = 0;
      for (let d = 0; d < 8; d += 0.02) most = Math.max(most, Math.abs(gait(d, step, 0).footL[2]));
      return most;
    };
    expect(reach(1.4)).toBeGreaterThan(reach(0.7) * 1.8);
  });
});

describe("recoil", () => {
  const rounds = [{ t: 1, k: 0 }, { t: 1.1, k: 1 }, { t: 3, k: 2 }];

  it("is nothing before a round, nearly full on it, and gone by 0.2 s", () => {
    expect(recoil(rounds, 0.5, 0, 2)).toBe(0);
    expect(recoil(rounds, 1, 0, 2)).toBeGreaterThan(0.95);
    expect(recoil(rounds, 1.21, 0, 2)).toBeLessThan(0.02);
  });

  it("moves only the man who fired", () => {
    expect(recoil(rounds, 1.1, 1, 2)).toBeGreaterThan(0.95);
    expect(recoil([{ t: 1.1, k: 1 }], 1.1, 0, 2)).toBe(0);
  });
});

describe("fidget", () => {
  it("stays small", () => {
    for (let t = 0; t < 60; t += 0.1) {
      const f = fidget(t, 3);
      expect(Math.abs(f.shift)).toBeLessThan(0.05);
      expect(Math.abs(f.lean)).toBeLessThan(0.05);
      expect(Math.abs(f.yaw)).toBeLessThan(0.12);
    }
  });

  it("differs between men", () => {
    expect(fidget(5, 1).lean).not.toBeCloseTo(fidget(5, 2).lean, 4);
  });
});
