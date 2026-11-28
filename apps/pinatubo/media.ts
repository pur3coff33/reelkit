// Every picture and sound the film uses, with its rights. All pictures are U.S. government work (USGS, USAF, U.S. Navy,
// NOAA, NASA): public domain. The music is CC BY 4.0 and must be credited. Sound effects are drawn in code (music.ts),
// so they need no entry. `npm run fetch -- pinatubo` downloads these into out/media/.
import type { Media } from "../../src/kit/doc/media";

const PD = "Public domain (work of the U.S. federal government)";
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file.replace(/ /g, "_")}`;
const photo = (id: string, file: string, author: string, credit = author): Media => ({ id, kind: "image", url: commons(file), page: commons(file), author, licence: PD, rights: "free", credit });

export const MEDIA: Media[] = [
  photo("plume", "Pinatubo91eruption plume.jpg", "Dave Harlow, USGS", "The June 12, 1991 eruption column, from Clark Air Base. Dave Harlow / USGS"),
  photo("before", "Pinatubo 1991 (before).jpg", "Chris Newhall, USGS", "Pinatubo in late April 1991, with the April 2 craters. Chris Newhall / USGS"),
  photo("watched", "Pinatubo 1991-06-09.jpg", "USGS", "Pinatubo from the northeast, June 9, 1991. USGS"),
  photo("evac", "Evacuees from Mount Pinatubo collect supplies during evacuation of Clark Air Base.jpg", "A1C Steven M. McNally, USAF", "Evacuees collect food and water at Clark Air Base, June 1991. A1C Steven M. McNally / U.S. Air Force"),
  photo("daybreak", "Pinatubo91 lateral blast plume pinatubo 06-15-91-resized.jpg", "USGS Cascades Volcano Observatory", "Pinatubo at daybreak, June 15, 1991. USGS / Cascades Volcano Observatory"),
  photo("satellite", "Ash cloud from Mount Pinatubo eruption approximately 300 miles in diameter (Image credit- NOAA-NESDIS Operational Significant Event Imagery) (2268-356).jpg", "NOAA/NESDIS", "The ash cloud from space. NOAA/NESDIS Operational Significant Event Imagery"),
  photo("subic", "Ash from Mount Pinatubo crushes a building at NS Subic Bay.jpg", "Sgt. Paul Bishop, U.S. Navy", "A building crushed by ash, Naval Station Subic Bay, July 1991. Sgt. Paul Bishop / U.S. Navy"),
  photo("dc10", "World Airways DC-10 setting on its tail because of weight of Mt. Pinatubo ashfall.jpg", "R. L. Rieger, U.S. Navy", "A DC-10 tipped onto its tail by the weight of the June 15 ash, Cubi Point, June 17, 1991. R. L. Rieger / U.S. Navy"),
  photo("sapang", "Pinatubo91 lahar and tephra damage sapangbato 06-22-91.jpg", "Richard P. Hoblitt, USGS", "Lahar and ash damage, Sapangbato, June 22, 1991. Richard P. Hoblitt / USGS"),
  photo("home", "Volcanic ash blankets a home and automobile in the base housing area in the aftermath of the eruption of Mount Pinatubo. More than 20,000 evacuees have been removed from the area as - DPLA - a8898b15ae85a30ae1df17b45cea36cb.jpeg", "TSgt. Val Gempis, USAF", "Ash over a home at Clark Air Base, 1991. TSgt. Val Gempis / U.S. Air Force (National Archives)"),
  {
    id: "sage", kind: "image",
    url: "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/1000/1510/sage_pinatubo.jpg",
    page: "https://science.nasa.gov/earth/earth-observatory/global-effects-of-mount-pinatubo-1510",
    author: "NASA (SAGE II on the Earth Radiation Budget Satellite)", licence: "Public domain (NASA)", rights: "free",
    credit: "Stratospheric aerosol before and after Pinatubo. NASA, SAGE II / ERBS",
  },
  ...(
    [
      ["dawn", "Lightless Dawn", "the opening: a dark, quiet drone"],
      ["echoes", "Echoes of Time v2", "the evacuation: a rising pulse"],
      ["despair", "Despair and Triumph", "the eruption (its climax) and the close"],
      ["heart", "Heart of Nowhere", "the aftermath: mournful strings"],
    ] as const
  ).map(([id, title, role]): Media => ({
    id, kind: "audio",
    url: `https://incompetech.com/music/royalty-free/mp3-royaltyfree/${encodeURIComponent(title)}.mp3`,
    page: "https://incompetech.com/music/royalty-free/music.html",
    author: "Kevin MacLeod", licence: "Creative Commons: By Attribution 4.0 (http://creativecommons.org/licenses/by/4.0/)", rights: "free",
    credit: `"${title}" Kevin MacLeod (incompetech.com)`,
    contentId: `Not checked (${role}). If a claim lands, dispute it with the CC BY 4.0 licence and the credit in the post.`,
  })),
];
