// "This Is Not a Drill": a 50-megaton bomb over an invented city, told through one family. The picture (sim.ts), the
// graphics (Reel.tsx) and the sound (music.ts) all read this clock. The story runs 90 s; the last 3 s are silent black.

export const SECONDS = 93;

export const PARTS = {
  alert: { from: 0, to: 6 },
  panic: { from: 6, to: 14 },
  station: { from: 14, to: 20 },
  call: { from: 20, to: 25 },
  look: { from: 25, to: 30 },
  fireball: { from: 30, to: 38 },
  rise: { from: 38, to: 46 },
  light: { from: 46, to: 51 },
  wave: { from: 51, to: 55 },
  plume: { from: 55, to: 65 },
  tunnel: { from: 65, to: 72 },
  lapse: { from: 72, to: 78 },
  voicemail: { from: 78, to: 84 },
  out: { from: 84, to: 90 },
  black: { from: 90, to: SECONDS },
} as const;

export type PartName = keyof typeof PARTS;

export function partAt(t: number): PartName {
  for (const [name, p] of Object.entries(PARTS)) if (t >= p.from && t < p.to) return name as PartName;
  return "black";
}

/** The white-out, just before the first simulation shot. */
export const FLASH = 29.6;
/** Two seconds of silence after the flash, then the sound of it. */
export const BLAST_SOUND = 32;
/** The blast reaches the station. */
export const STATION_HIT = 54;
/** The screen goes to black on the slam, and the map fades up out of it. */
export const SLAM = 55;
/** The phone dies. */
export const PHONE_DIES = 83.4;

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

// ── The two clocks ───────────────────────────────────────────────────────────────────────────────────

/** Minutes past nine on the Meridian Clock. It jumps a minute at a time and reaches 9:14 just before the flash. */
export const cityMinutes = (t: number) => (t < 14.6 ? 12 : t < 28.9 ? 13 : 14);

/** Minutes past nine at the station: the same clock until the flash, then 9:14 to 9:17, where the blast stops it. */
export function stationMinutes(t: number) {
  if (t < FLASH) return cityMinutes(t);
  return t < 48.5 ? 14 : t < 51 ? 15 : t < 53.5 ? 16 : 17;
}

// ── The physics, compressed ──────────────────────────────────────────────────────────────────────────

/** Where the station sits: 60 km from ground zero. Light takes no time; the blast takes about three minutes. */
export const STATION_KM = 60;

/** The radius (km) the shockwave has reached. It gets to the station when the station is hit. */
export const shockKm = (t: number) => track([[FLASH, 0], [31, 2], [34, 9], [38, 22], [46, 50], [STATION_HIT, STATION_KM], [90, 95]], t);

/** The mushroom cloud's age, in the seconds its growth curve is written in. */
export const cloudAge = (t: number) => track([[FLASH, 0], [38, 3.4], [46, 16], [STATION_HIT, 26], [65, 38]], t);

/** How far (km) the fallout plume has reached downwind. */
export const plumeKm = (t: number) => track([[55, 60], [65, 520]], t);

/** How much of the fallout's danger is left, 0…1, on the map. The 7-10 rule, drawn on the same days as STAMPS. */
export const plumeLeft = (t: number) => track([[72, 1], [75, 0.42], [78, 0.1]], t);

// ── Words ────────────────────────────────────────────────────────────────────────────────────────────

export type Say = { at: number; to: number; text: string; sub?: string };

/** The one thing written at the bottom of the frame, when anything is. */
export const WORDS: Say[] = [
  { at: 14.4, to: 19.6, text: "Calder Hills Station", sub: "60 km outside the city" },
  { at: 20.5, to: 24.2, text: "“Get underground. Don't wait for me.”" },
  { at: 46.5, to: 50.8, text: "The light arrives first." },
  { at: 51.1, to: 53.8, text: "The blast takes 3 minutes." },
  { at: 57, to: 64.6, text: "Then the fallout.", sub: "Radioactive dust, carried hundreds of kilometers" },
  { at: 79.6, to: 83.2, text: "“Get underground. Don't wait for me.”" },
];

/** The bomb's one big line, over the rising shot. */
export const YIELD: Say = { at: 39, to: 44.2, text: "50 MEGATONS", sub: "THE MOST POWERFUL NUCLEAR BOMB EVER CREATED" };

/**
 * The time-lapse. Fallout's radiation follows the 7-10 rule: every sevenfold step in time cuts it about tenfold, so hour
 * 7 is a tenth of hour 1, hour 49 a hundredth, and two weeks (about hour 343) a thousandth.
 */
export const STAMPS: (Say & { hour: number; radiation: number })[] = [
  { at: 72, to: 73.5, text: "HOUR 1", sub: "RADIATION 100%", hour: 1, radiation: 100 },
  { at: 73.5, to: 75, text: "HOUR 7", sub: "RADIATION 10%", hour: 7, radiation: 10 },
  { at: 75, to: 76.5, text: "HOUR 49", sub: "RADIATION 1%", hour: 49, radiation: 1 },
  { at: 76.5, to: 78, text: "DAY 14", sub: "RADIATION 0.1%", hour: 336, radiation: 0.1 },
];

/** Inside the time-lapse, which view is on: the tunnel or the map. */
export const lapseView = (t: number) => (t < 73.5 || (t >= 75 && t < 76.5) ? "tunnel" : "map");

// ── The cuts inside the parts ────────────────────────────────────────────────────────────────────────

/** The call cuts away to the parent downtown, still trying to get through. */
export const CALL_CUT = { from: 21.6, to: 23.2 };
/** Street level, as the shockwave comes up the avenue and takes it. Starts on the sound of the blast. */
export const STREET_BLAST = { from: BLAST_SOUND, to: 35.4 };
/** A town far downwind, where the fallout comes down. */
export const TOWN = { from: 60, to: 62.4 };

// ── The simulation's readouts ────────────────────────────────────────────────────────────────────────

/** The blast takes about three minutes to cover 60 km, so that's the scale of the simulated clock. */
export const BLAST_SECONDS = 176;

/** Simulated seconds since detonation, read from how far the shockwave has come. */
export const simSeconds = (t: number) => (shockKm(t) / STATION_KM) * BLAST_SECONDS;

/** Simulated seconds until the blast reaches the station. */
export const etaSeconds = (t: number) => Math.max(0, BLAST_SECONDS - simSeconds(t));

/** The voice, on the phone and then on the voicemail. Starts in seconds. */
export const CALL_AT = 20.6;
export const VOICEMAIL_AT = 79.7;
