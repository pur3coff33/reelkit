// The life of a blue whale, from her first breath to her first calf's: birth, milk, the long swim, krill, orcas, growing
// up, song, courtship, and round again. Long shots that melt into each other. The picture (sim.ts), the words (Reel.tsx)
// and the sound (score.ts, music.ts) read this clock. A bar of the score is 4 s and every shot is whole bars.

/** Each shot and how long it holds, in order. */
const LENGTHS = {
  birth: 12,
  milk: 8,
  aerial: 8,
  swim: 12,
  night: 8,
  ice: 8,
  lunge: 8,
  full: 8,
  orcas: 8,
  circle: 8,
  away: 8,
  fluke: 8,
  alone: 8,
  years: 8,
  eye: 8,
  song: 8,
  court: 8,
  race: 8,
  calf: 12,
  dusk: 12,
} as const;
export type ShotName = keyof typeof LENGTHS;
const ORDER = Object.keys(LENGTHS) as ShotName[];

export const SHOTS = {} as Record<ShotName, { from: number; to: number }>;
let clock = 0;
for (const shot of ORDER) SHOTS[shot] = { from: clock, to: (clock += LENGTHS[shot]) };
export const SECONDS = clock;
/** How long one shot takes to melt into the next, centred on the bar. */
export const MELT = 2;

const ease = (k: number) => k * k * (3 - 2 * k);

/** What's on screen at t, back to front, with how much of each shows. */
export function layers(t: number): { shot: ShotName; opacity: number }[] {
  const out: { shot: ShotName; opacity: number }[] = [];
  ORDER.forEach((shot, i) => {
    const s = SHOTS[shot];
    if (t < s.from - (i ? MELT / 2 : 0) || t >= s.to + (i < ORDER.length - 1 ? MELT / 2 : 0.1)) return;
    out.push({ shot, opacity: ease(i ? Math.min(1, (t - (s.from - MELT / 2)) / MELT) : 1) });
  });
  return out;
}

/** The last seconds sink into dark blue. */
export const END_FADE = 3;

export type Line = { at: number; to: number; text: string; sub?: string };
/** A line timed from the start of its shot. */
const line = (shot: ShotName, at: number, to: number, text: string, sub?: string): Line => ({ at: SHOTS[shot].from + at, to: SHOTS[shot].from + to, text, sub });

export const LINES: Line[] = [
  line("birth", 0.4, 5.4, "This is the life", "of the biggest animal alive."),
  line("birth", 6.4, 11.2, "She is born in warm water,", "already 7 metres long."),
  line("milk", 1.2, 7, "On her mother's milk", "she can gain 90 kilos a day."),
  line("aerial", 1.2, 7, "They stay together", "for about half a year."),
  line("swim", 1.4, 6.4, "Then they follow the cold,", "thousands of kilometres away."),
  line("night", 1.2, 6.8, "Day and night,", "one breath at a time."),
  line("ice", 1.2, 6.4, "At the end of the long swim,", "a sea full of krill."),
  line("lunge", 1.2, 6.4, "She learns to lunge:", "mouth open, throat wide."),
  line("full", 1.2, 6.6, "A grown whale can eat", "up to 16 tonnes a day."),
  line("orcas", 1.2, 6.6, "Almost nothing hunts", "a blue whale. Only orcas."),
  line("circle", 1.2, 6.4, "They hunt the young,", "and sometimes even adults."),
  line("away", 1.2, 6.6, "Her mother stays close.", "This time, they get away."),
  line("fluke", 1.4, 6.6, "Weaned, she goes on alone."),
  line("alone", 1.2, 6.8, "On deep dives her heart", "can slow to 2 beats a minute."),
  line("years", 1.2, 6.6, "Growing up takes years.", "Five, ten, even fifteen."),
  line("eye", 1.2, 6.8, "Grown now, some 25 metres long.", "Her heart is the largest on Earth."),
  line("song", 1.2, 6.6, "Somewhere, a male is singing,", "too low for us to hear well."),
  line("court", 1.2, 6.6, "He follows. They turn", "around each other."),
  line("race", 1.2, 6.8, "Another male gives chase.", "Mating has never been documented."),
  line("calf", 1.4, 6, "Almost a year later,", "in warm water again,"),
  line("calf", 6.8, 11.2, "a calf takes its first breath."),
  line("dusk", 1.6, 7.6, "She may live", "80 or 90 years."),
];

/** Breaths at the surface: [when, loudness]. */
export const BREATHS: [number, number][] = [
  [SHOTS.aerial.from + 4.2, 0.7],
  [SHOTS.night.from + 3, 0.8],
  [SHOTS.ice.from + 3.2, 0.8],
  [SHOTS.fluke.from + 0.6, 0.75],
  [SHOTS.years.from + 2.4, 0.7],
  [SHOTS.dusk.from + 3, 1],
];
/** Calls in the water. */
export const CALLS: [number, number][] = [[SHOTS.alone.from + 4.6, 0.5], [SHOTS.song.from + 0.6, 1], [SHOTS.song.from + 4.6, 0.75], [SHOTS.court.from + 2.5, 0.5]];
