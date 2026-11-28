// Part 00-open: the cold open. Timog at night, the count (35 approved, 390 inside), the door that opened inward,
// 162 dead; then the title. `tail` holds the title card.
import type { PartScript } from "../../parts";

export const SCRIPT: PartScript = {
  id: "00-open",
  title: "Cold open",
  intro: 4.0,
  tail: 5.0,
  lines: [
  { id: "o1", text: "On the night of March eighteenth, nineteen ninety-six, about three hundred and ninety people were inside a disco on [Timog](/timˈoɡ/) Avenue, in [Quezon](/kˈɛsɔn/) City.", caption: "On the night of 18 March 1996, about 390 people were inside a disco on Timog Avenue, Quezon City.", speed: 0.95, hold: 1.0, sources: ["ap"] },
  { id: "o2", text: "It had been approved for thirty-five.", caption: "It had been approved for 35.", speed: 0.9, hold: 1.4, sources: ["ap"] },
  { id: "o3", text: "Most of them were students… celebrating the end of the school year.", caption: "Most of them were students, celebrating the end of the school year.", speed: 0.95, hold: 1.0, sources: ["wiki"] },
  { id: "o4", text: "When the fire came, nearly all of them ran for the only way out.", caption: "When the fire came, nearly all of them ran for the only way out.", speed: 0.96, hold: 0.9, sources: ["court", "gma"] },
  { id: "o5", text: "It opened inward.", caption: "It opened inward.", speed: 0.84, hold: 2.2, sources: ["court"] },
  { id: "o6", text: "One hundred and sixty-two people… never came home.", caption: "162 people never came home.", speed: 0.82, hold: 1.8, sources: ["wiki"] },
  ],
};
