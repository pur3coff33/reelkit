import { describe, expect, it } from "vitest";
import { dayKey, generate, startOf } from "./generate";

const today = dayKey(Date.UTC(2026, 9, 25, 4));

describe("generate", () => {
  const { firstDay, entries } = generate({ today, days: 190 });

  it("is the same every time for the same day", () => {
    expect(generate({ today, days: 190 }).entries).toEqual(entries);
  });

  it("ends yesterday and never touches today", () => {
    const last = Math.max(...entries.map((e) => dayKey(e.spentAt)));
    expect(last).toBe(today - 1);
    expect(Math.min(...entries.map((e) => dayKey(e.spentAt)))).toBeGreaterThanOrEqual(firstDay);
  });

  it("keeps whole centavos and unique ids", () => {
    for (const e of entries) expect(Number.isInteger(e.centavos) && e.centavos > 0).toBe(true);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  it("makes yesterday calm: no vices and wants small", () => {
    const y = entries.filter((e) => e.spentAt >= startOf(today - 1));
    expect(y.some((e) => e.category === "vices")).toBe(false);
    const wants = y.filter((e) => ["eating-out", "shopping", "fun", "gifts", "vices"].includes(e.category));
    expect(wants.reduce((s, e) => s + e.centavos, 0)).toBeLessThanOrEqual(20_000);
  });

  it("spends less on wants in later months, so some months bloom", () => {
    const wantsByMonth = new Map<number, number>();
    for (const e of entries) {
      if (!["eating-out", "shopping", "fun", "vices"].includes(e.category)) continue;
      const d = new Date(e.spentAt + 8 * 3_600_000);
      const m = d.getUTCFullYear() * 12 + d.getUTCMonth();
      wantsByMonth.set(m, (wantsByMonth.get(m) ?? 0) + e.centavos);
    }
    const full = [...wantsByMonth.entries()].sort((a, b) => a[0] - b[0]).slice(1, -1).map(([, v]) => v);
    let cheaper = 0;
    for (let i = 1; i < full.length; i++) if (full[i] < full[i - 1]) cheaper++;
    expect(cheaper).toBeGreaterThanOrEqual(2);
  });
});
