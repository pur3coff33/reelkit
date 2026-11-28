// Part 04-fifteen: chapter 4, "Fifteen Seconds". The sparks, the smoke taken for part of the show, the dead microphone,
// the power failing, the dark, the crush at an inward door, Jhunie Mallari pulling it, the guards holding the doors, the
// fire rushing at the air when they opened, Sherilyn Bruan in the hallway, why the smoke killed, and the corridor.
//
// Disagreements: the DJ is "Marvin Reyes" (AP) or "Mervyn Reyes" (FlipScience): not named. The guards locking the doors
// is "some reports" (FlipScience) / bouncers who thought it was a riot (Wikipedia): the line says so. The egg cartons are
// "reportedly" (FlipScience). Jhunie's account is translated from Filipino (GMA, 2026).
import type { PartScript } from "../../parts";

const JHUNIE = "[Jhunie](/dʒˈuːni/)";

export const SCRIPT: PartScript = {
  id: "04-fifteen",
  title: "Fifteen Seconds",
  intro: 4.0,
  tail: 1.0,
  lines: [
    { id: "f1", text: "It was a Monday night, just before twelve. Sparks flew from the DJ booth.", caption: "It was a Monday night, just before twelve. Sparks flew from the DJ booth.", speed: 0.98, hold: 0.7, sources: ["wiki", "flip"] },
    { id: "f2", text: "On the dance floor, people saw the smoke… and thought it was part of the show.", caption: "On the dance floor, people saw the smoke and thought it was part of the show.", speed: 1.0, hold: 0.9, sources: ["wiki", "gma"] },
    { id: "f3", text: "The DJ reached for his microphone, to warn them.", caption: "The DJ reached for his microphone, to warn them.", speed: 1.02, hold: 0.5, sources: ["flip"] },
    { id: "f4", text: "It had stopped working.", caption: "It had stopped working.", speed: 0.9, hold: 1.6, sources: ["flip"] },
    { id: "f5", text: "About fifteen seconds later, the power failed… and the lights went out.", caption: "About 15 seconds later, the power failed and the lights went out.", speed: 0.95, hold: 2.4, sources: ["flip", "wiki"] },
    { id: "f6", text: "In the dark, hundreds of people pushed toward one door.", caption: "In the dark, hundreds of people pushed toward one door.", speed: 1.0, hold: 1.2, sources: ["gma", "court"] },
    { id: "f7", text: `${JHUNIE} was in that crush. Almost three hundred people, ${JHUNIE} remembers… at one door.`, caption: "Jhunie was in that crush. Almost 300 people, Jhunie remembers, at one door.", speed: 0.93, hold: 0.9, sources: ["gma"] },
    { id: "f8", text: "It opened inward. With the crowd pressed against it, even ten people pushing could not have opened it.", caption: "It opened inward. With the crowd pressed against it, even ten people pushing could not have opened it.", speed: 0.95, hold: 1.0, sources: ["gma", "court"] },
    { id: "f9", text: `Everyone was pushing. ${JHUNIE} found the handle… and pulled.`, caption: "Everyone was pushing. Jhunie found the handle, and pulled.", speed: 0.9, hold: 2.2, sources: ["gma"] },
    { id: "f10", text: "Outside, the guards heard the noise. Some reports say they thought it was a riot… and held the doors shut.", caption: "Outside, the guards heard the noise. Some reports say they thought it was a riot, and held the doors shut.", speed: 0.96, hold: 1.0, sources: ["flip", "wiki", "esquire"] },
    { id: "f11", text: "Inside, the fire had used up the air. When the doors finally opened, fresh air rushed in…", caption: "Inside, the fire had used up the air. When the doors finally opened, fresh air rushed in.", speed: 0.96, hold: 0.3, sources: ["flip"] },
    { id: "f12", text: "and the fire came with it.", caption: "And the fire came with it.", speed: 0.86, hold: 1.6, sources: ["flip", "esquire", "gma"] },
    { id: "f13", text: "Sherilyn [Bruan](/bɹuˈan/) was in the hallway.", caption: "Sherilyn Bruan was in the hallway.", speed: 0.94, hold: 0.4, sources: ["esquire", "flip"] },
    { id: "f14", text: "The impact was so strong, everyone in the hallway was hit… and fell down.", caption: "“The impact was so strong, everyone in the hallway was hit and fell down.”", speed: 0.9, hold: 1.2, sources: ["esquire", "flip"] },
    { id: "f15", text: "She crawled out… past the people who could not.", caption: "She crawled out, past the people who could not.", speed: 0.86, hold: 1.8, sources: ["flip"] },
    { id: "f16", text: `At the door, ${JHUNIE} bent down, and felt the fire come in. Then through the first door… the second… and the third.`, caption: "At the door, Jhunie bent down, and felt the fire come in. Then through the first door, the second, and the third.", speed: 0.92, hold: 0.9, sources: ["gma"] },
    { id: "f17", text: "The burns covered forty-six percent of [Jhunie's](/dʒˈuːniz/) body.", caption: "The burns covered 46% of Jhunie's body.", speed: 0.86, hold: 2.0, sources: ["gma"] },
    { id: "f18", text: "The walls around the DJ booth were lined with acoustic foam. The ceiling, reportedly, was covered in egg cartons.", caption: "The walls around the DJ booth were lined with acoustic foam. The ceiling, reportedly, was covered in egg cartons.", speed: 0.95, hold: 0.8, sources: ["flip"] },
    { id: "f19", text: "In a closed room, most of the smoke from a fire like that is carbon monoxide. It takes the place of oxygen in the blood.", caption: "In a closed room, most of the smoke from a fire like that is carbon monoxide. It takes the place of oxygen in the blood.", speed: 0.95, hold: 0.7, sources: ["flip"] },
    { id: "f20", text: "Burning foam and fabric give off hydrogen cyanide as well. Enough of it… kills within minutes.", caption: "Burning foam and fabric give off hydrogen cyanide as well. Enough of it kills within minutes.", speed: 0.94, hold: 1.4, sources: ["flip"] },
    { id: "f21", text: "In the corridor to the only way out, the bodies were piled waist-deep.", caption: "In the corridor to the only way out, the bodies were piled waist-deep.", speed: 0.84, hold: 3.0, sources: ["ap"] },
  ],
};
