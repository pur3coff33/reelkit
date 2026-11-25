// The call-masking explainer at 60 BPM, so a beat is a second. Scene lengths were fitted to the voice lines
// (each line's start is its `beat` in reel.config.ts), with a short breath before each cut.
export const BPM = 60;

export const SCENES = {
  hook: { from: 0, to: 10.2 }, // a Thumbtack thread with a blue "our side" bubble nobody on the team sent
  ours: { from: 10.2, to: 22.4 }, // our own masking: technician → Fixtman stand-in number → customer
  tt: { from: 22.4, to: 30 }, // the same picture one level up: our call center → Thumbtack's stand-in → customer
  copy: { from: 30, to: 44 }, // the side effect: one text lands on the customer's phone and in Thumbtack messages
  real: { from: 44, to: 53.8 }, // a real number: straight to the customer, nothing in Thumbtack
  recap: { from: 53.8, to: 62 }, // three lines to remember, then the logo
} as const;
