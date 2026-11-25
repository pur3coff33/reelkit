// The kop.it reel on its beat grid (120 BPM: a beat is half a second, 60 beats in 30 s). The music and the video
// both read this, so every cut and hit lands together. Scene lengths were fitted to the voice lines (reel.config.ts).
export const BPM = 120;

export const SCENES = {
  hook: { from: 0, to: 6 }, // a ₱ coin tumbles into a pot and a plant shoots up and flowers
  match: { from: 6, to: 10 }, // the drawn plant becomes the app's plant: zoom out to the garden screen
  add: { from: 10, to: 17 }, // logging ₱285 on the keypad
  garden: { from: 17, to: 25 }, // missions tick, a flower opens
  people: { from: 25, to: 31 }, // two phones, two people
  night: { from: 31, to: 37 }, // the same garden under the night sky
  history: { from: 37, to: 42 }, // the greenhouse of daily pots
  gallery: { from: 42, to: 46 }, // months of plants, the cheaper ones bloom
  note: { from: 46, to: 50 }, // the morning note, briefly
  end: { from: 50, to: 60 }, // logo, held with a soft outro
} as const;

export const CUES = {
  coinLand: 2,
  sprout: 2.5,
  hookFlower: 4.5,
  offline: 14.5,
  ticks: [19, 20, 21],
  flower: 23.5,
  people: [26.5, 27.5],
  final: 50,
};

export const TOTAL_BEATS = 60;
