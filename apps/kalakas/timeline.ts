// "Kalakas": how a super typhoon forms, how big it is, one beach through 72 hours and a week, and what it cost. The
// picture (sim.ts), the graphics (Reel.tsx) and the sound (music.ts) all read this clock. Every figure is hypothetical.

export const SECONDS = 100;

export const PARTS = {
  hook: { from: 0, to: 4 },
  warm: { from: 4, to: 8 },
  rise: { from: 8, to: 13 },
  spin: { from: 13, to: 18 },
  eye: { from: 18, to: 25 },
  moves: { from: 25, to: 31 },
  size: { from: 31, to: 37 },
  dive: { from: 37, to: 40 },
  beach: { from: 40, to: 85 },
  cost: { from: 85, to: 96.5 },
  message: { from: 96.5, to: SECONDS },
} as const;

export type PartName = keyof typeof PARTS;

export function partAt(t: number): PartName {
  for (const [name, p] of Object.entries(PARTS)) if (t >= p.from && t < p.to) return name as PartName;
  return "message";
}

/** The moment the sea reaches the town. */
export const LANDFALL_T = 62;

/** Piecewise-linear lookup, held flat beyond its ends. */
export function track(keys: [number, number][], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return va + ((vb - va) * (t - a)) / (b - a);
    }
  }
  return keys[keys.length - 1][1];
}

/** Hours from landfall during the beach: a time-lapse, 72 hours before to a week after. */
export const hoursAt = (t: number) => track([[40, -72], [48, -48], [56, -12], [58, -6], [62, 0], [72, 24], [78, 72], [85, 168]], t);

/** Sustained wind on the beach (km/h), which climbs to the approved peak. */
export const windAt = (t: number) => Math.round(track([[40, 5], [52, 40], [56, 90], [59, 120], [61, 200], [63.5, 300], [66, 350], [70, 350], [73, 110], [77, 25], [85, 10]], t));

/** The Visayas tally, counted as the surge goes through. */
export const FINAL = { pesosBillions: 310, homes: 860_000, deaths: 2_900, withoutEvacuation: 41_000 };
export const pesosAt = (t: number) => Math.round(track([[LANDFALL_T, 0], [74, FINAL.pesosBillions]], t));
export const homesAt = (t: number) => Math.round(track([[LANDFALL_T, 0], [74, FINAL.homes]], t) / 1000) * 1000;

export type Say = { at: number; to: number; text: string; sub?: string };

/** What's on screen at the bottom, one thing at a time. */
export const WORDS: Say[] = [
  { at: 0.4, to: 4, text: "The strongest typhoon ever imagined." },
  { at: 4.2, to: 8, text: "It starts with a warm ocean.", sub: "26.5°C or warmer" },
  { at: 8.3, to: 13, text: "Warm, wet air rises.", sub: "Pressure falls, and more air rushes in" },
  { at: 13.3, to: 18, text: "Earth's spin turns the inflow.", sub: "Thunderstorms start to wind into a spiral" },
  { at: 18.3, to: 25, text: "The core tightens. An eye opens.", sub: "Warm sea keeps feeding it" },
  { at: 25.3, to: 31, text: "Kalakas moves west-northwest.", sub: "14 km/h, towards the Philippines" },
  { at: 31.5, to: 37, text: "Bigger than the Visayas.", sub: "" },
  { at: 40.4, to: 47.8, text: "Boats come up the beach.", sub: "Santa Lucia, Eastern Samar (fictional town)" },
  { at: 48.2, to: 55.8, text: "Plywood goes up. People leave for high ground.", sub: "" },
  { at: 56, to: 59, text: "Six hours left. The road is empty." },
  { at: 74.4, to: 79.5, text: "The water takes days to fall.", sub: "" },
  { at: 80, to: 84.8, text: "Then people come back and start again.", sub: "" },
];

/** What the wind does as it climbs, shown on the beach. */
export const WIND_STAGES: Say[] = [
  { at: 59, to: 61, text: "120 KM/H", sub: "TIN ROOFS PEEL AWAY" },
  { at: 61, to: 63.5, text: "200 KM/H", sub: "TREES AND POLES SNAP" },
  { at: 63.5, to: 66, text: "300 KM/H", sub: "WALLS START TO FAIL" },
  { at: 66, to: 71.5, text: "350 KM/H", sub: "AND THE SEA COMES IN" },
];
