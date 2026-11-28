// Part 01-birdland: chapter 1, "Birdland". The building before the fire: a jazz club from 1978, renamed in 1986; in 1990 a
// company is formed to make it a disco, with a name on its papers that was chosen for luck; the refit of 1991–92; the
// students of the mid-nineties; the memorial outside; and, on paper, room for 35. `intro` holds the chapter card.
//
// Disagreements: Birds opened in 1978 (Philstar 2010) or 1979 (Ocampo's testimony, CA 2005). Wikipedia names a different
// owner of Birdland ("Sergio Orgaoow"); the CA record (sworn testimony) and Philstar both name Serafin Pua: we follow them.
import type { PartScript } from "../../parts";

const TIMOG = "[Timog](/timˈoɡ/)", MORATO = "[Tomas Morato](/tomˈas moɾˈato/)", PUA = "[Serafin Pua](/sɛɾafˈin pˈuːa/)";

export const SCRIPT: PartScript = {
  id: "01-birdland",
  title: "Birdland",
  intro: 4.0,
  tail: 1.5,
  lines: [
    { id: "b0", text: "This is the building in two thousand and eight, twelve years after the fire. Shuttered… with no name on it.", caption: "This is the building in 2008, twelve years after the fire. Shuttered, with no name on it.", speed: 0.92, hold: 1.0, sources: ["photo"] },
    { id: "b1", text: `Before it was Ozone, the building near the corner of ${TIMOG} and ${MORATO} was a jazz club.`, caption: "Before it was Ozone, the building near the corner of Timog and Tomas Morato was a jazz club.", speed: 0.95, hold: 0.8, sources: ["flip", "ca2005", "philstar2009"] },
    { id: "b2", text: "It opened in nineteen seventy-eight, as Birds of the Same Feather.", caption: "It opened in 1978, as Birds of the Same Feather.", speed: 0.95, hold: 0.6, sources: ["philstar2010"] },
    { id: "b3", text: `Its owner was a jazz lover named ${PUA}.`, caption: "Its owner was a jazz lover named Serafin Pua.", speed: 0.95, hold: 0.8, sources: ["philstar2010", "ca2005"] },
    { id: "b4", text: "In nineteen eighty-six, he made it three times bigger… and gave it a new name. Birdland.", caption: "In 1986, he made it three times bigger, and gave it a new name: Birdland.", speed: 0.94, hold: 1.0, sources: ["philstar2010"] },
    { id: "b5", text: "Some of the biggest names in Filipino music sang there. On its busiest nights, a hundred and fifty people were turned away at the door.", caption: "Some of the biggest names in Filipino music sang there. On its busiest nights, 150 people were turned away at the door.", speed: 0.97, hold: 1.4, sources: ["philstar2010"] },
    { id: "b6", text: "In nineteen ninety, the jazz stopped.", caption: "In 1990, the jazz stopped.", speed: 0.9, hold: 1.6, sources: ["wiki", "flip"] },
    { id: "b7", text: "A new company was set up to turn the building into a disco. Westwood Entertainment.", caption: "A new company was set up to turn the building into a disco: Westwood Entertainment.", speed: 0.96, hold: 0.6, sources: ["ca2005"] },
    { id: "b8", text: "Its president was [Hermilo Ocampo](/ɛɾmˈilo okˈampo/). Its treasurer, [Ramon Ng](/ɹamˈon ˈɛŋ/).", caption: "Its president was Hermilo Ocampo. Its treasurer, Ramon Ng.", speed: 0.95, hold: 0.7, sources: ["ca2005", "inqmoney"] },
    { id: "b9", text: `And on its founding papers was a man who never sat in on a single board meeting… [Alfredo Chua](/alfɹˈɛdo tʃˈuːa/). ${PUA}'s brother-in-law.`, caption: "And on its founding papers was a man who never sat in on a single board meeting: Alfredo Chua, Serafin Pua's brother-in-law.", speed: 0.95, hold: 1.0, sources: ["ca2005"] },
    { id: "b10", text: "Chua later told a court why he had agreed. His brother-in-law had said that using his name… would be good luck.", caption: "Chua later told a court why he had agreed. His brother-in-law had said that using his name would be good luck.", speed: 0.92, hold: 1.4, sources: ["ca2005"] },
    { id: "b11", text: "The Court of Appeals found that Chua had only lent his name. Behind it, the court said, was Pua.", caption: "The Court of Appeals found that Chua had only lent his name. Behind it, the court said, was Pua.", speed: 0.95, hold: 1.2, sources: ["ca2005"] },
    { id: "b12", text: "Ozone opened in nineteen ninety-one. The building was rebuilt that year, and renovated again the next. Mezzanines went in, halfway up the walls.", caption: "Ozone opened in 1991. The building was rebuilt that year, and renovated again the next. Mezzanines went in, halfway up the walls.", speed: 0.96, hold: 0.9, sources: ["ca2005", "inqbefore", "flip", "wiki"] },
    { id: "b13", text: "By the mid-nineties, it was where students came to dance.", caption: "By the mid-nineties, it was where students came to dance.", speed: 0.95, hold: 1.2, sources: ["wiki", "esquire"] },
    { id: "b14", text: "In the roundabout outside stands a memorial to twenty-four Filipino scouts, killed in a plane crash in nineteen sixty-three on their way to a world jamboree. The streets around the club carry their names.", caption: "In the roundabout outside stands a memorial to 24 Filipino scouts, killed in a plane crash in 1963 on their way to a world jamboree. The streets around the club carry their names.", speed: 0.93, hold: 1.6, sources: ["scouts", "plaque", "circle2009", "monument", "osm"] },
    { id: "b15", text: "Inside, the club had a dance floor, a semi-circular bar, a DJ booth… and room, on paper, for thirty-five people.", caption: "Inside, the club had a dance floor, a semi-circular bar, a DJ booth, and room, on paper, for 35 people.", speed: 0.93, hold: 2.0, sources: ["esquire", "flip", "ap"] },
  ],
};
