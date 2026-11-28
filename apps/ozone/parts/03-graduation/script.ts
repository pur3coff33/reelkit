// Part 03-graduation: chapter 3, "Graduation Night". Monday 18 March 1996: the end of the school year, a half-price
// promotion, Sherilyn Bruan (18) walking in past the doors and the bar, the room packed by eight or nine, Jhunie Mallari
// with a cousin and friends, and by midnight about 390 people in a room approved for 35.
//
// Jhunie Mallari is a man (photos; "Kuya Jhunie"); the narration names him rather than using pronouns.
import type { PartScript } from "../../parts";

const JHUNIE = "[Jhunie](/dʒˈuːni/) [Mallari](/maljˈaɾi/)", BRUAN = "Sherilyn [Bruan](/bɹuˈan/)";

export const SCRIPT: PartScript = {
  id: "03-graduation",
  title: "Graduation Night",
  intro: 4.0,
  tail: 0.5,
  lines: [
    { id: "g1", text: "Monday, the eighteenth of March, nineteen ninety-six.", caption: "Monday, 18 March 1996.", speed: 0.92, hold: 1.0, sources: ["ap"] },
    { id: "g2", text: "The school year was ending. Students were celebrating their graduation.", caption: "The school year was ending. Students were celebrating their graduation.", speed: 0.95, hold: 0.8, sources: ["upi", "wiki"] },
    { id: "g3", text: "That night, Ozone was running a promotion. Half off the entrance… and half off the drinks.", caption: "That night, Ozone was running a promotion: half off the entrance, and half off the drinks.", speed: 0.96, hold: 1.0, sources: ["upi", "esquire"] },
    { id: "g4", text: `${BRUAN} was eighteen.`, caption: "Sherilyn Bruan was 18.", speed: 0.92, hold: 0.6, sources: ["esquire"] },
    { id: "g5", text: "She went in through a door, down a long hallway, and through another door, into the club. There was a semi-circular bar, off to one side.", caption: "She went in through a door, down a long hallway, and through another door, into the club. There was a semi-circular bar, off to one side.", speed: 0.95, hold: 0.8, sources: ["esquire"] },
    { id: "g6", text: "On a Monday night, by eight or nine o'clock, the place was already packed.", caption: "On a Monday night, by eight or nine o'clock, the place was already packed.", speed: 0.96, hold: 1.0, sources: ["esquire"] },
    { id: "g7", text: `${JHUNIE} had just finished high school, and came with a cousin… and friends.`, caption: "Jhunie Mallari had just finished high school, and came with a cousin and friends.", speed: 0.93, hold: 1.0, sources: ["gma"] },
    { id: "g8", text: "[Jhunie](/dʒˈuːni/) would lose seventeen friends that night.", caption: "Jhunie would lose 17 friends that night.", speed: 0.84, hold: 2.0, sources: ["gma"] },
    { id: "g9", text: "By midnight, there were about three hundred and fifty customers inside… and forty staff.", caption: "By midnight, there were about 350 customers inside, and 40 staff.", speed: 0.95, hold: 0.8, sources: ["ap"] },
    { id: "g10", text: "In a room the city had approved for thirty-five.", caption: "In a room the city had approved for 35.", speed: 0.9, hold: 2.6, sources: ["ap"] },
  ],
};
