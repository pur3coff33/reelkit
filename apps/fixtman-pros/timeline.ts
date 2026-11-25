// The pros ad on its beat grid: 120 BPM, a beat is half a second, 120 beats in 60 s. Cues are fitted to the voice files.
export const SCENES = {
  lead: { from: 0, to: 7 }, // a paid lead, a message, no answer
  another: { from: 7, to: 13 }, // more leads paid for, none won
  stop: { from: 13, to: 17 }, // the maybes drop away
  brand: { from: 17, to: 21 }, // the logo is built
  fees: { from: 21, to: 28 }, // $0 leads, $0 subscription
  pick: { from: 28, to: 35 }, // job cards, the good ones taken
  kinds: { from: 35, to: 44 }, // one kind of job per word
  size: { from: 44, to: 49 }, // a curtain rod, then a gazebo
  own: { from: 49, to: 56 }, // the week, the radius
  no: { from: 56, to: 63 }, // an offer turned down
  paid: { from: 63, to: 71 }, // Fridays
  back: { from: 71, to: 78 }, // ads, leads, back office: ticked
  numbers: { from: 78, to: 89 }, // 700+ and 100,000+
  bring: { from: 89, to: 95 }, // tools, license, ride
  form: { from: 95, to: 103 }, // the real application form
  end: { from: 103, to: 120 }, // skills, schedule, logo
} as const;

/** Seconds each word of the "kinds" line is spoken at (measured in the voice file). */
export const KINDS = [
  { at: 17.6, word: "TV mounting", photo: "tvWall-7" },
  { at: 18.85, word: "Furniture", photo: "indoor-2" },
  { at: 19.4, word: "Gyms", photo: "fitness-8" },
  { at: 19.95, word: "Lighting", photo: "lighting-1" },
  { at: 20.55, word: "Gazebos", photo: "gazebo-5" },
  { at: 21.25, word: "Playsets", photo: "playset-5" },
] as const;

/** Other moments, in seconds. */
export const CUES = {
  paidLead: 0.5,
  reply: 1.8,
  hired: 4.95,
  drop: 7.2,
  lead: 10.8,
  subscription: 12.1,
  picks: [15.4, 16, 16.6],
  big: 23,
  schedule: 24.75,
  radius: 26.1,
  turnDown: 29.35,
  noPenalty: 30.3,
  weekly: 32.8,
  friday: 33.9,
  back: [35.8, 36.35, 36.85],
  handled: 37.9,
  seven: 39.4,
  hundred: 41.6,
  bring: [45, 45.95, 46.75],
  words: [51.8, 52.4],
  logo: 53.5,
};
