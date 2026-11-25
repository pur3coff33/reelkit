// The partners ad on its beat grid: 120 BPM, a beat is half a second, 120 beats in 60 s. Cues are fitted to the voice files.
export const SCENES = {
  loved: { from: 0, to: 7 }, // a product page, a heart, then the box
  parts: { from: 7, to: 13 }, // parts everywhere, one star
  back: { from: 13, to: 17 }, // the box, stamped and leaving
  sell: { from: 17, to: 20 }, // the shop bag
  brand: { from: 20, to: 24 }, // the logo is built
  checkout: { from: 24, to: 32 }, // assembly added at checkout
  kinds: { from: 32, to: 39 }, // one kind of product per word
  cover: { from: 39, to: 45 }, // assembly, installation, measurement
  ways: { from: 45, to: 49 }, // a 3 in a house
  standard: { from: 49, to: 58 }, // the partner page: Standard
  widget: { from: 58, to: 64 }, // the partner page: Widget
  api: { from: 64, to: 70 }, // the partner page: API
  shops: { from: 70, to: 77 }, // the partner page: shop platforms
  match: { from: 77, to: 87 }, // pros matched, job tracked
  dash: { from: 87, to: 94 }, // dashboard, sales person
  why: { from: 94, to: 103 }, // returns, reviews, revenue
  end: { from: 103, to: 120 }, // sell it / everything after, logo
} as const;

/** Seconds each word of the "kinds" line is spoken at (measured in the voice file). */
export const KINDS = [
  { at: 16.1, word: "Furniture", photo: "indoor-1" },
  { at: 16.8, word: "Fitness", photo: "fitness-8" },
  { at: 17.25, word: "Smart home", photo: "smart-home-4" },
  { at: 18, word: "Outdoor", photo: "outdoor-4" },
  { at: 18.6, word: "Property", photo: "indoor-5" },
] as const;

/** Other moments, in seconds. */
export const CUES = {
  heart: 1,
  box: 2.1,
  burst: 3.8,
  noTools: 4.75,
  oneStar: 5.5,
  stamp: 7.2,
  added: 14.45,
  cover: [19.75, 20.4, 21.4],
  free: 27.2,
  matched: 39.6,
  tracked: 41.3,
  dashboard: 44.2,
  person: 45.6,
  why: [47.3, 48.6, 49.9],
  sell: 51.8,
  after: 52.5,
  logo: 54.25,
};
