// Part 02-paper: chapter 2, "The Paper". Everything that would kill them, approved before the night: two building permits
// and a certificate of occupancy (1991–92), room on paper for 35, a fire exit built over by the neighbours, doors that
// swing in "for good feng shui", no sprinklers, dead extinguishers, a 1995 certificate of annual inspection, and a fire
// safety certificate the owner pointed to afterwards.
//
// Disagreements: where the blocked fire exit led (a restaurant's kitchen, FlipScience; a women's restroom, journalists via
// Wikipedia): the script gives both. Two doors (FlipScience, Bruan) or three (Jhunie, Tomenio): "a door at each end" of the
// corridor, as Bruan tells it.
import type { PartScript } from "../../parts";

export const SCRIPT: PartScript = {
  id: "02-paper",
  title: "The Paper",
  intro: 4.0,
  tail: 1.0,
  lines: [
    { id: "p1", text: "Before a club in [Quezon](/kˈɛsɔn/) City could open its doors, it needed paper.", caption: "Before a club in Quezon City could open its doors, it needed paper.", speed: 0.95, hold: 0.8, sources: ["gma2014"] },
    { id: "p2", text: "When Ozone was built, in nineteen ninety-one, and renovated the next year, the city engineer's office gave it two building permits… and a certificate of occupancy.", caption: "When Ozone was built in 1991, and renovated the next year, the city engineer's office gave it two building permits and a certificate of occupancy.", speed: 0.95, hold: 0.9, sources: ["gma2014", "philstar2007", "inqbefore"] },
    { id: "p3", text: "The city's own safety engineer later said what that paper allowed. Thirty-five people.", caption: "The city's own safety engineer later said what that paper allowed: 35 people.", speed: 0.93, hold: 1.4, sources: ["ap"] },
    { id: "p4", text: "The club was a hundred and sixty square metres, on two levels. The way in was a corridor from the street, with a door at each end.", caption: "The club was 160 square metres, on two levels. The way in was a corridor from the street, with a door at each end.", speed: 0.95, hold: 0.8, sources: ["upi", "esquire", "flip"] },
    { id: "p5", text: "There was a fire exit, beside a VIP room. But investigators said a new building had gone up next door… and blocked it.", caption: "There was a fire exit, beside a VIP room. But investigators said a new building had gone up next door, and blocked it.", speed: 0.95, hold: 0.8, sources: ["flip", "ap"] },
    { id: "p6", text: "Where it led after that, accounts differ. Into a restaurant's kitchen… or into the women's restroom of the place next door.", caption: "Where it led after that, accounts differ: into a restaurant's kitchen, or into the women's restroom of the place next door.", speed: 0.95, hold: 1.2, sources: ["flip", "wiki2001"] },
    { id: "p7", text: "And the doors in the club all swung the same way. Inward.", caption: "And the doors in the club all swung the same way. Inward.", speed: 0.92, hold: 1.4, sources: ["court", "roamer", "inqdoor"] },
    { id: "p8", text: "A former waiter later explained why. The owners, he said, believed it was good feng shui.", caption: "A former waiter later explained why. The owners, he said, believed it was good feng shui.", speed: 0.95, hold: 0.5, sources: ["inqdoor"] },
    { id: "p9", text: "It would bring the money in.", caption: "“It would bring the money in.”", speed: 0.88, hold: 1.8, sources: ["inqdoor"] },
    { id: "p10", text: "There were no sprinklers. The fire extinguishers, the trial court found, were defective.", caption: "There were no sprinklers. The fire extinguishers, the trial court found, were defective.", speed: 0.94, hold: 1.0, sources: ["wiki2001"] },
    { id: "p11", text: "And in nineteen ninety-five, the city gave Ozone its certificate of annual inspection. Prosecutors would later say the papers behind it were inadequate… insufficient… and improper.", caption: "And in 1995, the city gave Ozone its certificate of annual inspection. Prosecutors would later say the papers behind it were inadequate, insufficient and improper.", speed: 0.94, hold: 1.2, sources: ["wiki2001"] },
    { id: "p12", text: "After the fire, the owner would point to one more paper. A fire safety certificate, from the Bureau of Fire Protection.", caption: "After the fire, the owner would point to one more paper: a fire safety certificate, from the Bureau of Fire Protection.", speed: 0.95, hold: 1.4, sources: ["ap"] },
    { id: "p13", text: "Every paper said yes.", caption: "Every paper said yes.", speed: 0.85, hold: 1.6, sources: ["gma2014", "wiki2001", "ap"] },
    { id: "p14", text: "All the building needed now… was a crowd.", caption: "All the building needed now was a crowd.", speed: 0.88, hold: 2.0, sources: ["upi", "ap"] },
  ],
};
