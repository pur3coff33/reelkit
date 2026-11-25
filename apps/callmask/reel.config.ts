// The call-masking explainer for Fixtman's sales team: why call-center texts from the ERP show up in Thumbtack
// messages. Calm and clear rather than punchy: no music, one idea per scene, the voice carries it.
import type { ReelConfig } from "../../src/kit/config";

export const config = {
  app: "callmask",
  title: "Call masking",
  url: "",
  tagline: "Why call-center texts show up in Thumbtack",
  fps: 30,
  width: 1080,
  height: 1920,
  seconds: 62,

  voice: {
    name: "af_heart",
    speed: 0.95,
    // `beat` is seconds here (timeline.ts runs at 60 BPM); timeline.ts fits each scene to its lines.
    lines: [
      { id: "seen", text: "Ever seen a message in Thumbtack that nobody on your team sent?", caption: "A message *nobody on your team* sent?", beat: 0.8 },
      { id: "source", text: "It came from our call center, through the E R P. Here's how.", caption: "It came from *our call center*", beat: 5.6 },
      { id: "ours", text: "First, something we already do. Our technicians never get the customer's real number.", caption: "Our techs never get the *real number*", beat: 11 },
      { id: "ours2", text: "They text a Fixtman stand-in number, and we pass it on. That's call masking.", caption: "A number in the middle. That's *call masking*.", beat: 17 },
      { id: "tt", text: "Thumbtack does the same thing to us. The customer number on a lead is often Thumbtack's stand-in.", caption: "Thumbtack does *the same to us*", beat: 23.2 },
      { id: "copy", text: "So when our call center texts that number, Thumbtack sends it to the customer, and keeps a copy in its chat.", caption: "Thumbtack *keeps a copy* in its chat", beat: 30.8 },
      { id: "copy2", text: "That copy shows up on our side, with no name. We didn't build that. It's a side effect.", caption: "Our side, *no name*. A side effect.", beat: 37.9 },
      { id: "real", text: "Sometimes, Thumbtack gives us the real number instead. Then the text goes straight to the customer, and nothing shows up in Thumbtack.", caption: "Real number? *Nothing in Thumbtack.*", beat: 44.8 },
      { id: "recap", text: "So it all comes down to which number Thumbtack gave us.", caption: "It comes down to *the number*", beat: 54.6 },
    ],
  },

  // No music: the beat grid is only a clock (60 BPM, a beat is a second).
  music: { bpm: 60, offset: 0, file: "" },

  theme: {
    bg: "#134A54",
    bg2: "#1d6370",
    orange: "#EC6633",
    ink: "#2A2E36",
    slate: "#64748b",
    card: "#ffffff",
    meBg: "#E9F2FF",
    meBorder: "#D6E6FF",
    meInk: "#0071CE",
    themBorder: "#E7EAEE",
    tt: "#2A2E36",
  },
} satisfies ReelConfig;
