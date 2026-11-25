// FixtMan's ad on its beat grid: 120 BPM, a beat is half a second, 120 beats in 60 s. The music and the picture both read this.
export const BPM = 120;
export const TOTAL_BEATS = 120;

/** Scenes in beats. */
export const SCENES = {
  tv: { from: 0, to: 8 }, // a TV box leaning on the wall, the days racing by
  bed: { from: 8, to: 12 }, // the bed, still flat-packed
  swing: { from: 12, to: 18 }, // the swing set in the yard, grass growing over it
  drill: { from: 18, to: 20 }, // a drill, shaking, put down
  brand: { from: 20, to: 24 }, // the logo is built: body, roof, door
  pro: { from: 24, to: 31 }, // a wall of finished jobs
  jobs: { from: 31, to: 43 }, // one job per word
  zip: { from: 43, to: 51 }, // the real booking form
  price: { from: 51, to: 58 }, // real prices before booking
  time: { from: 58, to: 68 }, // time slots, same-day
  ready: { from: 68, to: 79 }, // tools, work, check
  warranty: { from: 79, to: 85 }, // 30 days
  redo: { from: 85, to: 90 }, // we redo it
  stars: { from: 90, to: 102 }, // 4.9 and the review count
  ask: { from: 102, to: 107 }, // back to the boxes, in the garage
  end: { from: 107, to: 120 }, // the list struck off, then the logo
} as const;
export type SceneName = keyof typeof SCENES;

/** Seconds a Kokoro line is silent before it speaks. */
export const LEAD = 0.38;

/** Seconds each word of the "jobs" line is spoken at (measured in the voice file). */
export const JOBS = [
  { at: 15.5, word: "TVs", photo: "tvWall-4" },
  { at: 16.2, word: "Furniture", photo: "indoor-1" },
  { at: 17.05, word: "Home gyms", photo: "fitness-8" },
  { at: 17.83, word: "Lights", photo: "lighting-8" },
  { at: 18.35, word: "Gazebos", photo: "gazebo-2" },
  { at: 19.23, word: "That giant playset", photo: "playset-4" },
] as const;

/** Other moments, in seconds. */
export const CUES = {
  drillDown: 9.5,
  noFees: 26.97,
  sameDay: 30.95,
  ready: [34.9, 36.25, 37.05],
  thirty: 40.2,
  redo: 43.5,
  rating: 46.8,
  reviews: 48.4,
  struck: [53.75, 54.1, 54.45],
  logo: 55,
};
