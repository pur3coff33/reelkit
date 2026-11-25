import { describe, expect, it } from "vitest";
import { BLAST_SECONDS, CALL_CUT, FLASH, PARTS, SECONDS, STAMPS, STATION_HIT, STATION_KM, STREET_BLAST, TOWN, WORDS, cityMinutes, cloudAge, etaSeconds, partAt, plumeKm, shockKm, simSeconds, stationMinutes } from "./timeline";

describe("fallout timeline", () => {
  it("runs its parts back to back to the end", () => {
    const parts = Object.values(PARTS);
    expect(parts[0].from).toBe(0);
    expect(parts.at(-1)!.to).toBe(SECONDS);
    for (let i = 1; i < parts.length; i++) expect(parts[i].from).toBe(parts[i - 1].to);
    expect(partAt(92.9)).toBe("black");
  });

  it("tells the 90-second story, then holds three seconds of black", () => {
    expect(PARTS.out.to).toBe(90);
    expect(SECONDS - PARTS.black.from).toBe(3);
  });

  it("never shows two lines of words at once", () => {
    for (const list of [WORDS, STAMPS]) for (let i = 1; i < list.length; i++) expect(list[i].at).toBeGreaterThanOrEqual(list[i - 1].to);
  });

  it("gives every line long enough to read", () => {
    for (const w of WORDS) expect(w.to - w.at).toBeGreaterThanOrEqual(1.4 + 0.03 * (w.text.length + (w.sub?.length ?? 0)));
  });

  it("gives the city two minutes of warning, and stops the station's clock at 9:17", () => {
    expect(cityMinutes(0)).toBe(12);
    expect(cityMinutes(FLASH - 0.1)).toBe(14);
    expect(stationMinutes(46)).toBe(14);
    expect(stationMinutes(STATION_HIT)).toBe(17);
    expect(stationMinutes(89)).toBe(17);
  });

  it("gets the shockwave to the station exactly when the station is hit", () => {
    expect(shockKm(STATION_HIT)).toBe(STATION_KM);
    expect(shockKm(STATION_HIT - 0.5)).toBeLessThan(STATION_KM);
  });

  it("only ever grows the shockwave, the cloud and the plume", () => {
    for (let t = FLASH; t < 89; t += 0.25) {
      expect(shockKm(t + 0.25)).toBeGreaterThan(shockKm(t));
      if (t < 65) expect(cloudAge(t + 0.25)).toBeGreaterThan(cloudAge(t));
    }
    for (let t = 55; t < 65; t += 0.25) expect(plumeKm(t + 0.25)).toBeGreaterThan(plumeKm(t));
  });

  it("counts the simulated clock down to zero exactly as the blast arrives", () => {
    expect(simSeconds(FLASH)).toBe(0);
    expect(simSeconds(STATION_HIT)).toBe(BLAST_SECONDS);
    expect(etaSeconds(STATION_HIT)).toBe(0);
    for (let t = FLASH; t < STATION_HIT; t += 0.25) expect(etaSeconds(t + 0.25)).toBeLessThan(etaSeconds(t));
  });

  it("keeps each inserted cut inside the part it interrupts", () => {
    expect(partAt(CALL_CUT.from)).toBe("call");
    expect(partAt(CALL_CUT.to)).toBe("call");
    expect(partAt(STREET_BLAST.from)).toBe("fireball");
    expect(partAt(STREET_BLAST.to)).toBe("fireball");
    expect(partAt(TOWN.from)).toBe("plume");
    expect(partAt(TOWN.to)).toBe("plume");
  });

  it("follows the 7-10 rule: each sevenfold step in time is a tenth of the radiation", () => {
    for (let i = 1; i < STAMPS.length; i++) expect(STAMPS[i].radiation).toBeCloseTo(STAMPS[i - 1].radiation / 10);
    for (let i = 1; i < 3; i++) expect(STAMPS[i].hour).toBe(STAMPS[i - 1].hour * 7);
    // Day 14 is the nearest whole day to hour 343.
    expect(Math.abs(STAMPS[3].hour - 343)).toBeLessThan(24);
  });
});
