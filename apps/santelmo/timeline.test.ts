import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HIT_Y, LINES, SCENES, SECONDS, TEXT_Y, TITLES, minHold } from "./timeline";

// The platform UI covers the top ~250 px and the bottom ~350 px of 1920.
const SAFE = { top: 250, bottom: 1920 - 350 };

describe("santelmo timeline", () => {
  it("runs 115–125 s", () => {
    expect(SECONDS).toBeGreaterThanOrEqual(115);
    expect(SECONDS).toBeLessThanOrEqual(125);
  });

  it("has scenes that cover the whole reel with no gaps", () => {
    const s = Object.values(SCENES);
    expect(s[0].from).toBe(0);
    for (let i = 1; i < s.length; i++) expect(s[i].from).toBe(s[i - 1].to);
    expect(s.at(-1)!.to).toBe(SECONDS);
  });

  it("holds every line long enough to read twice (a line under another needs only 2 s: it's read with it)", () => {
    for (const l of LINES) expect(l.to - l.at, l.text).toBeGreaterThanOrEqual(l.under ? 2 : minHold(l.text));
  });

  // Once the narration is read (npm run voice -- santelmo), every spoken line has to fit inside its caption and end
  // before the next line starts.
  const voiceFile = join(dirname(fileURLToPath(import.meta.url)), "out", "voice.json");
  it.skipIf(!existsSync(voiceFile))("fits the narration inside the captions, one voice at a time", () => {
    const takes = JSON.parse(readFileSync(voiceFile, "utf8")) as { i: number; seconds: number }[];
    for (const t of takes) {
      const l = LINES[t.i];
      expect(l.at + t.seconds, l.text).toBeLessThanOrEqual(l.to);
      const next = LINES[t.i + 1];
      if (next) expect(l.at + t.seconds, `${l.text} → ${next.text}`).toBeLessThanOrEqual(next.at);
    }
  });

  it("never shows two lines at once unless the second sits under the first", () => {
    for (let i = 1; i < LINES.length; i++) {
      if (LINES[i].under) continue;
      expect(LINES[i].at, LINES[i].text).toBeGreaterThanOrEqual(LINES[i - 1].to);
    }
  });

  it("keeps the text clear of the platform UI", () => {
    for (const l of LINES) {
      const y = l.y ?? (l.hit ? HIT_Y : TEXT_Y);
      // Up to three wrapped lines of ~80 px, plus a paired line under it.
      expect(y - 160).toBeGreaterThan(SAFE.top);
      expect(y + 260).toBeLessThan(SAFE.bottom);
    }
  });

  it("puts the titles inside the reel, clear of the lines", () => {
    for (const t of TITLES) {
      expect(t.to).toBeLessThanOrEqual(SECONDS);
      for (const l of LINES) expect(l.to <= t.at || l.at >= t.to, l.text).toBe(true);
    }
  });
});
