import { describe, expect, it } from "vitest";
import { config } from "./reel.config";
import { wordGroups } from "./subtitles";

const text = (words: string[], groups: number[][]) => groups.map((g) => g.map((i) => words[i]).join(" "));

describe("wordGroups", () => {
  it("ends a group after punctuation", () => {
    const words = "It came from our call center, through the ERP.".split(" ");
    expect(text(words, wordGroups(words))).toEqual(["It came from", "our call center,", "through the ERP."]);
  });

  it("keeps groups under the character limit", () => {
    const words = "Thumbtack sends it to the customer".split(" ");
    expect(text(words, wordGroups(words))).toEqual(["Thumbtack sends it", "to the customer"]);
    expect(text(words, wordGroups(words, 3, 12))).toEqual(["Thumbtack", "sends it to", "the customer"]);
  });

  it("covers every word of every voice line once, in order", () => {
    for (const line of config.voice.lines) {
      const words = line.text.split(" ");
      expect(wordGroups(words).flat()).toEqual(words.map((_, i) => i));
    }
  });
});
