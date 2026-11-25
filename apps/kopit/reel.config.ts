// Everything about the kop.it reel that isn't code: where the app is, what's said, how it sounds and looks.
import type { ReelConfig } from "../../src/kit/config";

export const config = {
  app: "kopit",
  title: "kop.it",
  url: "kop.it", // the end card's pill. TODO: the real public address
  tagline: "Your money, as a garden.",
  fps: 30,
  width: 1080,
  height: 1920,
  seconds: 30,

  voice: {
    name: "af_heart",
    compare: "am_michael",
    speed: 0.95,
    // Each line starts on its beat (timeline.ts). "Koh-pit" is spelled for the voice; captions use `caption`.
    lines: [
      { id: "coin", text: "What if every peso grew something?", caption: "What if every peso *grew something?*", beat: 0.5 },
      { id: "match", text: "With Koh-pit, it does.", caption: "With kop.it, *it does.*", beat: 6.5 },
      { id: "add", text: "Log what you spend in seconds, even offline.", caption: "Log it in seconds. *Even offline.*", beat: 10 },
      { id: "missions", text: "Three small missions a day. Spend a little less, and it grows.", caption: "Three *missions* a day. Spend a little less…", beat: 17 },
      { id: "people", text: "Everyone at home logs from their own phone.", caption: "Everyone at home, on their *own phone*", beat: 25 },
      { id: "night", text: "It grows under your own sky, day and night.", caption: "…under your own sky, *day and night*", beat: 31 },
      { id: "history", text: "Each day becomes a pot in your greenhouse,", caption: "Each day, a pot in your *greenhouse*", beat: 37.25 },
      { id: "bloom", text: "and every cheaper month blooms.", caption: "…and every cheaper month *blooms*", beat: 42.25 },
      { id: "note", text: "Plus, a little note each morning.", caption: "Plus, a little *note* each morning", beat: 46.25 },
      { id: "brand", text: "Koh-pit. Your money, as a garden.", caption: "kop.it", beat: 51 },
    ],
  },

  music: { bpm: 120, offset: 0, generated: true, file: "out/music.wav" },

  /** With true, a run whose AI note had to fall back to the hand-written one fails instead of rendering. */
  requireRealNote: false,

  theme: {
    bg: "#1f3326",
    ink: "#eef4ea",
    leaf: "#7fb08c",
    leafDeep: "#5f9a6c",
    pink: "#f4a3b8",
    pot: "#c98a5e",
    card: "#eef4ea",
    cardInk: "#1f3326",
  },
} satisfies ReelConfig;
