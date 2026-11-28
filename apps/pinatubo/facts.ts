// Everything the film says or shows, and where it comes from. Researched 2026-11-27 from the primary sources: the USGS
// fact sheets and Fire and Mud (the USGS/PHIVOLCS volume on the eruption), NASA, and the JMA best track for the typhoon.
// pinatubo.test.ts holds every line and on-screen text to these.
import type { Fact, Source } from "../../src/kit/doc/facts";

const ACCESSED = "2026-11-27";

export const SOURCES: Record<string, Source> = {
  FS113: { title: "Newhall, Hendley & Stauffer, The Cataclysmic 1991 Eruption of Mount Pinatubo, Philippines. USGS Fact Sheet 113-97", url: "https://pubs.usgs.gov/fs/1997/fs113-97/", accessed: ACCESSED },
  FS115: { title: "Benefits of Volcano Monitoring Far Outweigh Costs: The Case of Mount Pinatubo. USGS Fact Sheet 115-97", url: "https://pubs.usgs.gov/fs/1997/fs115-97/", accessed: ACCESSED },
  WOLFE: { title: "Wolfe & Hoblitt, Overview of the Eruptions. In Fire and Mud: Eruptions and Lahars of Mount Pinatubo (PHIVOLCS / University of Washington Press, 1996)", url: "https://pubs.usgs.gov/pinatubo/wolfe/", accessed: ACCESSED },
  NASA: { title: "Global Effects of Mount Pinatubo. NASA Earth Observatory", url: "https://science.nasa.gov/earth/earth-observatory/global-effects-of-mount-pinatubo-1510", accessed: ACCESSED },
  JMA: { title: "JMA best track, Typhoon 199105 (YUNYA), via Digital Typhoon (NII)", url: "https://agora.ex.nii.ac.jp/digital-typhoon/summary/wnp/l/199105.html.en", accessed: ACCESSED },
  GVP: { title: "Smithsonian Global Volcanism Program, Pinatubo (273083)", url: "https://volcano.si.edu/volcano.cfm?vn=273083", accessed: ACCESSED },
};

export const FACTS: Record<string, Fact> = {
  slumber: { value: "Pinatubo reawakened after a 500-year slumber", sources: ["FS115", "FS113"], where: "FS115 para 4; FS113 'Precursors'" },
  april: { value: "Steam explosions announced unrest on April 2, 1991; powerful steam explosions blasted three craters on the north flank", sources: ["WOLFE", "FS115", "FS113"], where: "Wolfe, Abstract; FS115 para 4 ('early April 1991'); FS113 'Precursors'" },
  team: { value: "PHIVOLCS monitored on site; USGS scientists joined in late April with portable instruments", sources: ["WOLFE", "FS115"], where: "Wolfe, Abstract; FS115 paras 4–5" },
  danger10: { value: "PHIVOLCS declared a 10-kilometer-radius danger zone", sources: ["FS115"], where: "para 4" },
  alert5: { value: "Alert level 5 (eruption in progress) on June 9; evacuation radius 20 km; about 25,000 evacuees", sources: ["WOLFE"], where: "Lava-dome stage, June 7–12" },
  radius30: { value: "On June 12 the evacuation radius was extended to 30 km; at least 58,000 evacuees", sources: ["WOLFE"], where: "Vertical eruptions, June 12" },
  clark: { value: "On June 10 [1991], about 14,500 U.S. military personnel and their dependents evacuated Clark Air Base", sources: ["WOLFE"], where: "Lava-dome stage, June 7–12", note: "FS115 says 'more than 15,000 American servicemen and their dependents' were evacuated from Clark before June 15. The film uses Wolfe's June 10 figure." },
  clarkPlace: { value: "Clark Air Base lies east of the volcano, within 25 km of the summit; Subic Bay Naval Station about 40 km southwest", sources: ["WOLFE"], where: "Introduction" },
  june12: { value: "The first spectacular eruption came on June 12, 1991 (Philippine Independence Day)", sources: ["FS113"], where: "'The Eruptions'" },
  june15: { value: "The climactic eruption began at 13:42 on June 15, 1991, and lasted about 9 hours", sources: ["WOLFE", "FS113"], where: "Wolfe, Abstract; FS113 'The Eruptions'" },
  second: { value: "The second-largest volcanic eruption of the 20th century", sources: ["FS113"], where: "Opening paragraph", note: "FS115 puts it as 'the largest volcanic eruption on Earth in more than three-quarters of a century'." },
  height: { value: "The ash cloud rose 22 miles (35 kilometers) into the air", sources: ["FS113"], where: "'The Eruptions'", note: "Wolfe gives 34 km at the umbrella's centre at 15:40 (Koyaguchi & Tokuno 1993). The film uses 35 km." },
  yunya: { value: "Typhoon Yunya made landfall at 08:00 on June 15 and passed about 75 km northeast of Pinatubo during the climactic eruption; its track crossed central Luzon from the east coast and left it to the northwest the same day", sources: ["WOLFE", "JMA"], where: "Wolfe, climactic eruption; JMA track 1991-06-14 06Z to 06-15 18Z" },
  roofs: { value: "Thousands of roofs collapsed under the weight of ash made wet by heavy rains", sources: ["FS113", "FS115"], where: "FS113 photo caption; FS115 'Lives and Property Saved'" },
  deaths: { value: "The climactic eruption, coincident with a typhoon, caused 200 to 300 deaths", sources: ["WOLFE"], where: "Abstract", note: "FS115: 'only about 250 lowland residents were killed'. The film says 'hundreds'." },
  so2: { value: "Nearly 20 million tons of sulfur dioxide were injected into the stratosphere", sources: ["FS113"], where: "'Impacts of the Eruptions'", note: "NASA gives about 15 million tons. The film uses the USGS figure." },
  cooling: { value: "Global temperatures dropped temporarily (1991 through 1993) by about 1°F (0.5°C); a measurable cooling of the Earth's surface for a period of almost two years", sources: ["FS113", "NASA"], where: "FS113 'Impacts of the Eruptions'; NASA para 2", note: "NASA: about 0.6 °C over the next 15 months. The film says 'about half a degree'." },
  saved: { value: "The forecasts saved at least 5,000 lives", sources: ["FS113", "FS115"], where: "FS113 'Impacts'; FS115 'Lives and Property Saved' (at least 5,000, perhaps as many as 20,000)" },
  stratosphere: { value: "The stratosphere is the layer of atmosphere extending from about 10 km to 50 km (6-30 miles) in altitude; the plume penetrated into it", sources: ["NASA"], where: "para 1" },
  ashCloud: { value: "At 15:40 the climactic eruption cloud was 400 km in diameter; at lower altitudes the typhoon's cyclonic winds blew the ash in all directions, and winds higher up blew it southwestward", sources: ["WOLFE", "FS113"], where: "Wolfe, climactic eruption (Koyaguchi & Tokuno 1993); FS113 'The Eruptions'", note: "FS115: 'grew to more than 300 miles across'." },
  where: { value: "Pinatubo: 15.13°N, 120.35°E, on Luzon, Philippines", sources: ["GVP"], where: "Summary" },
};
