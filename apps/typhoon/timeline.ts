// "Philippines: The Super Typhoon": the approved 16-shot storyboard on one clock, in seconds. The world (sim.ts), the
// broadcast graphics (Reel.tsx) and the sound (music.ts) all read it. There are no voices: the captions carry the
// script, and a line's timing only paces its caption and the speaker's mouth.

export const SECONDS = 180;

export type ShotName =
  | "calm" | "breaking" | "ready" | "remembers" | "surge" | "leaving" | "monster" | "landfall"
  | "wind" | "contact" | "cutoff" | "rescue" | "away" | "falls" | "boat" | "message";

export const SHOTS: { name: ShotName; from: number; to: number }[] = [
  { name: "calm", from: 0, to: 8 },
  { name: "breaking", from: 8, to: 22 },
  { name: "ready", from: 22, to: 36 },
  { name: "remembers", from: 36, to: 46 },
  { name: "surge", from: 46, to: 56 },
  { name: "leaving", from: 56, to: 67 },
  { name: "monster", from: 67, to: 79 },
  { name: "landfall", from: 79, to: 91 },
  { name: "wind", from: 91, to: 101 },
  { name: "contact", from: 101, to: 113 },
  { name: "cutoff", from: 113, to: 124 },
  { name: "rescue", from: 124, to: 133 },
  { name: "away", from: 133, to: 144 },
  { name: "falls", from: 144, to: 154 },
  { name: "boat", from: 154, to: 168 },
  { name: "message", from: 168, to: 180 },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1];

export type Who = "carmela" | "ocampo" | "liza" | "miguel" | "tomas" | "nena" | "jun" | "kap";

export type Line = {
  id: string;
  who: Who;
  /** What is said, exactly as approved. */
  text: string;
  /** English subtitle, for lines spoken in Filipino. */
  sub?: string;
  at: number;
  /** The longest this line may run before it collides with what follows. */
  max: number;
};

export const LINES: Line[] = [
  { id: "01a", who: "carmela", at: 1.0, max: 6.7, text: "Seventy-two hours from now, this quiet coast will meet the strongest storm our forecasters have ever modelled." },
  { id: "02a", who: "carmela", at: 8.6, max: 5.6, text: "This is PNN. Typhoon Kalakas is one thousand kilometres east of Eastern Samar." },
  { id: "02b", who: "ocampo", at: 14.6, max: 7.1, text: "West-northwest, fourteen kilometres an hour. If this track holds, landfall is Friday at dawn, then Leyte." },
  { id: "03a", who: "carmela", at: 22.5, max: 13.1, text: "The order comes early: evacuate while the weather holds. Plywood goes up. Rice and batteries run short. Schools above the surge line become shelters." },
  { id: "04a", who: "liza", at: 36.4, max: 4.1, text: "Tomas Cabardo survived Yolanda. This time, he isn't waiting." },
  { id: "04b", who: "tomas", at: 40.8, max: 5.0, text: "Noong Yolanda, hangin ang binantayan namin. Dagat pala ang dapat katakutan.", sub: "During Yolanda, we watched the wind. It was the sea we should have feared." },
  { id: "05a", who: "ocampo", at: 46.5, max: 9.0, text: "Storm surge is the sea itself rising, and staying. Up to seven metres. Higher than a two-storey house." },
  { id: "06a", who: "kap", at: 56.8, max: 3.8, text: "Lahat po, sakay na! Iwan na ang mga gamit!", sub: "Everyone, get on! Leave your things!" },
  { id: "06b", who: "tomas", at: 62.6, max: 4.1, text: "Manang, ang bahay, napapalitan. Kayo, hindi.", sub: "Manang, a house can be replaced. You can't." },
  { id: "07a", who: "ocampo", at: 67.6, max: 10.6, text: "Sustained winds, three hundred fifty kilometres per hour. Gusts, four hundred twenty. Central pressure, eight hundred fifty hectopascals. We have no category for this." },
  { id: "08a", who: "carmela", at: 79.5, max: 6.2, text: "Five a.m. Kalakas makes landfall in Eastern Samar. The sea comes first." },
  { id: "09a", who: "liza", at: 93.7, max: 7.1, text: "We are sheltering inside the municipal hall. Nobody can go out in this. The road behind us is gone." },
  { id: "10a", who: "jun", at: 103.9, max: 3.1, text: "Lolo, nandoon pa po ba bukas ang bangka natin?", sub: "Grandpa, will our boat still be there tomorrow?" },
  { id: "10b", who: "tomas", at: 107.2, max: 2.9, text: "Hindi ko alam, apo. Pero nandito tayo.", sub: "I don't know, child. But we're here." },
  { id: "10c", who: "carmela", at: 110.3, max: 2.5, text: "We are losing contact with Eastern Samar." },
  { id: "11a", who: "miguel", at: 113.5, max: 10.2, text: "Twenty-four hours on, Leyte's highways are blocked and this bridge is down. No power. Few phones. Aid can only come by boat." },
  { id: "12a", who: "liza", at: 125.0, max: 5.5, text: "Rescue boats reach villages cut off for a day and a half." },
  { id: "13a", who: "nena", at: 134.0, max: 3.8, text: "Malinis na tubig po muna, para sa mga bata.", sub: "Clean water first, please, for the children." },
  { id: "13b", who: "carmela", at: 138.4, max: 5.3, text: "Kalakas is moving away, weakening inland. The crisis is not." },
  { id: "14a", who: "carmela", at: 144.5, max: 9.2, text: "One week later, the water is falling. Crews restore power line by line. Relief reaches families who lost everything." },
  { id: "15a", who: "liza", at: 154.4, max: 5.6, text: "Not every town was spared. But all two thousand names on this chalkboard made it." },
  { id: "15b", who: "jun", at: 161.2, max: 1.7, text: "Lolo, ang bangka!", sub: "Grandpa, the boat!" },
  { id: "15c", who: "tomas", at: 165.0, max: 2.6, text: "Aayusin natin, apo.", sub: "We'll fix it, child." },
  { id: "16a", who: "carmela", at: 169.0, max: 5.6, text: "The storm gave them seventy-two hours. They used every one." },
];

/** A line's syllables, roughly: each run of vowels counts as one. */
export const syllables = (text: string) => (text.toLowerCase().match(/[aeiouy]+/g) ?? []).length;

/** How long a line plays: a natural speaking pace, held to its slot. */
export const lineSeconds = (l: Line) => Math.min(l.max, syllables(l.text) / 4.6 + 0.3);

/** The line someone is saying at t, and how far through it they are (seconds). */
export function speaking(who: Who, t: number) {
  for (const l of LINES) {
    if (l.who !== who) continue;
    const into = t - l.at;
    if (into >= 0 && into < lineSeconds(l)) return into;
  }
  return null;
}

// ── The story's clock: hours from landfall, per stretch of the reel. ────────────────────────────────

const HOURS: [number, number][] = [
  [0, -72], [8, -71.4], [22, -60], [36, -45], [46, -24], [56, -20], [67, -12], [78.9, -6],
  [79, 0], [91, 2], [101, 3], [113, 24], [124, 36], [133, 48], [144, 168], [154, 169], [168, 170], [180, 171],
];

/** Hours from landfall at reel time t. It runs slowly through a shot, so the seconds visibly tick. */
export function storyHours(t: number) {
  const s = shotAt(t);
  const base = (at: number) => {
    let i = HOURS.length - 2;
    while (i > 0 && HOURS[i][0] > at) i--;
    const [a, ha] = HOURS[i], [b, hb] = HOURS[i + 1];
    return ha + ((hb - ha) * (at - a)) / (b - a || 1);
  };
  return base(s.from) + (t - s.from) / 60 * (s.name === "monster" ? 30 : 4);
}

/** The Philippine storm signal raised over Eastern Samar. */
export function signalAt(hours: number) {
  if (hours < -48) return 0;
  if (hours < -46) return 1;
  if (hours < -24) return 2;
  if (hours < -12) return 4;
  return hours < 24 ? 5 : 0;
}

/** The storm at a story hour (the series bible's figures, eased between them). */
export function stormAt(hours: number) {
  const table: [number, number, number][] = [[-72, 175, 935], [-48, 260, 895], [-24, 320, 865], [-12, 350, 850], [0, 350, 850], [24, 190, 930], [48, 110, 985]];
  let i = 0;
  while (i < table.length - 2 && table[i + 1][0] <= hours) i++;
  const [h0, w0, p0] = table[i], [h1, w1, p1] = table[i + 1];
  const k = Math.max(0, Math.min(1, (hours - h0) / (h1 - h0)));
  return { winds: Math.round(w0 + (w1 - w0) * k), pressure: Math.round(p0 + (p1 - p0) * k), distanceKm: hours < 0 ? Math.round(-hours * 14) : 0 };
}
