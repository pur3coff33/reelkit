// "Huwag Mong Sundan": the story on one clock, in seconds. The world (sim.ts), the text (Reel.tsx) and the sound
// (music.ts) all read it, so a line or a scare moves everywhere at once.

export const SECONDS = 124;

/** Scenes, in seconds. Each one cuts hard to the next. */
export const SCENES = {
  hook: { from: 0, to: 9.2 },
  title: { from: 9.2, to: 11 },
  fiesta: { from: 11, to: 28 },
  light: { from: 28, to: 46 },
  walk: { from: 46, to: 66 },
  loop: { from: 66, to: 82 },
  fire: { from: 82, to: 92 },
  river: { from: 92, to: 106 },
  reveal: { from: 106, to: 112.6 },
  dawn: { from: 112.6, to: 117.3 },
  outro: { from: 117.3, to: SECONDS },
} as const;

export type SceneName = keyof typeof SCENES;

export type Line = {
  text: string;
  at: number;
  /** When it leaves the screen. */
  to: number;
  /** Hits: bigger, in caps, slammed on with no fade, a sound hit under them. */
  hit?: "small" | "big";
  /** The second line of a pair sits under the first (both on screen together). */
  under?: boolean;
  /** Where the line's centre sits on the 1920 px frame. */
  y?: number;
};

export const TEXT_Y = 1240;
export const HIT_Y = 900;

export const LINES: Line[] = [
  { text: "Sabi ni Lola,", at: 0.6, to: 6.1 },
  { text: "kapag may ilaw na lumulutang sa gabi…", at: 2.2, to: 6.1, under: true },
  { text: "HUWAG MONG SUNDAN.", at: 6.4, to: 9.1, hit: "big" },
  { text: "Pista noon sa amin.", at: 12.0, to: 15.2 },
  { text: "Suot ko ang bagong tsinelas na bigay ni Lola.", at: 16.9, to: 21.6 },
  { text: "Hatinggabi na nang umuwi ako.", at: 22.0, to: 25.4 },
  { text: "Mag-isa ako sa pilapil.", at: 25.6, to: 28.6 },
  { text: "May ilaw sa unahan.", at: 31, to: 34 },
  { text: "Akala ko si Kuya, sinusundo ako.", at: 34.5, to: 38.1 },
  { text: "“KUYA!”", at: 38.6, to: 40.7, hit: "small" },
  { text: "Hindi siya sumagot.", at: 41.1, to: 43.9 },
  { text: "Sinundan ko pa rin.", at: 44.1, to: 46.9 },
  { text: "Limang minuto lang dapat ang lakad pauwi.", at: 48, to: 52.5 },
  { text: "Pero hindi ko na matanaw ang bahay namin.", at: 53, to: 57.5 },
  { text: "Dinaanan ko ang tulay na kawayan.", at: 61, to: 64.6 },
  { text: "Dinaanan ko ulit.", at: 68.5, to: 71.5 },
  { text: "Tumahimik ang mga palaka.", at: 73.5, to: 77 },
  { text: "Pati ang mga kuliglig.", at: 78, to: 81.5 },
  { text: "Hindi pala flashlight.", at: 83.4, to: 86.8 },
  { text: "APOY.", at: 88.8, to: 91.2, hit: "big" },
  { text: "Dinala ako nito sa ilog.", at: 94, to: 97.5 },
  { text: "Naalala ko si Lola.", at: 98.5, to: 101.5 },
  { text: "Huli na.", at: 102.4, to: 105.2 },
  { text: "Kinabukasan, tsinelas ko lang ang nakita nila.", at: 112.9, to: 117.4 },
  { text: "Kaya kapag may nakita kang ilaw…", at: 117.5, to: 122.0 },
  { text: "huwag mong sundan.", at: 119.85, to: 122.0, under: true },
];

/** The title card, shown twice: after the hook and at the very end. */
export const TITLES = [
  { at: 9.4, to: 11 },
  { at: 122.7, to: SECONDS },
];

/** The minimum time a line needs on screen to be read twice. */
export const minHold = (text: string) => 1.6 + 0.06 * text.length;

// ── Sound cues (seconds) ────────────────────────────────────────────────────────────────────────────

export const CUES = {
  /** The stinger under each hit line. */
  hits: LINES.filter((l) => l.hit).map((l) => ({ at: l.at, size: l.hit === "big" ? 1 : 0.55 })),
  /** "KUYA!" goes out and nothing answers: an echo tail. */
  kuya: 38.6,
  /** The ambience drops out: the frogs, then the crickets (with lines 17 and 18). */
  frogsStop: 73.5,
  cricketsStop: 78,
  /** They come back at dawn. */
  ambienceBack: SCENES.dawn.from,
  heartbeat: { from: 76, to: 88 },
  /** Total silence before the flare. */
  silence: { from: 87.4, to: 88.8 },
  flare: 88.8,
  /** The second light rises out of the river. */
  secondLight: { from: 107.5, to: 111 },
  /** She steps into the river; the cut comes just after. */
  step: 104.6,
  rooster: 113.2,
  /** Bahay Kubo again, as a warped music box, from the panakot until the silence. */
  musicBox: { from: 77.4, to: 87.4 },
  /** At the very end one light rushes the viewer. */
  lastRush: 122.0,
};

/** Shots inside scenes (seconds), where the camera cuts. */
export const SHOTS = {
  fiestaFeet: { from: 16.5, to: 22 },
  loopWatch: { from: 72, to: 77 },
  loopPanakot: { from: 77, to: 82 },
};
