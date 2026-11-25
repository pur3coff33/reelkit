// "SAF 44: Mamasapano": the one clock. The picture (film.ts), the words (Reel.tsx) and the sound (music.ts) all read it.
import type { FactId } from "./facts";

export const SECONDS = 564;

/** Every scene's place on the clock, back to back. */
export const SCENES = {
  title: { from: 0, to: 12 },
  fourYears: { from: 12, to: 38 },
  boats: { from: 38, to: 44 },
  room: { from: 44, to: 64 },
  practice: { from: 64, to: 80 },
  trucks: { from: 80, to: 96 },
  dropOff: { from: 96, to: 108 },
  route: { from: 108, to: 124 },
  weight: { from: 124, to: 148 },
  lastRiver: { from: 148, to: 178 },
  window: { from: 178, to: 198 },
  fifteen: { from: 198, to: 210 },
  bingo: { from: 210, to: 222 },
  awake: { from: 222, to: 234 },
  bridge: { from: 234, to: 258 },
  morning: { from: 258, to: 270 },
  across: { from: 270, to: 294 },
  firstShots: { from: 294, to: 306 },
  call: { from: 306, to: 315 },
  guns: { from: 315, to: 324 },
  road: { from: 324, to: 332 },
  openGround: { from: 332, to: 340 },
  oneHour: { from: 340, to: 356 },
  runningOut: { from: 356, to: 362 },
  markers: { from: 362, to: 374 },
  lastOfThem: { from: 374, to: 386 },
  eleven: { from: 386, to: 404 },
  bottle: { from: 404, to: 424 },
  lastStand: { from: 424, to: 444 },
  threeRounds: { from: 444, to: 456 },
  lights: { from: 456, to: 470 },
  ninth: { from: 470, to: 482 },
  bicycle: { from: 482, to: 496 },
  halfMast: { from: 496, to: 506 },
  count: { from: 506, to: 532 },
  cost: { from: 532, to: 544 },
  lastField: { from: 544, to: 556 },
  end: { from: 556, to: SECONDS },
} as const;

export type SceneName = keyof typeof SCENES;

export function sceneAt(t: number): SceneName {
  for (const [name, s] of Object.entries(SCENES)) if (t >= s.from && t < s.to) return name as SceneName;
  return "end";
}

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

const S = SCENES;

/** The three white phosphorus rounds, in film time. */
export const WP_FILM = [S.threeRounds.from + 0.8, S.threeRounds.from + 3.8, S.threeRounds.from + 6.8];

// ── The counter ───────────────────────────────────────────────────────────────────────────────────────

/** Hours since the first call for artillery at 7:00 AM, by film time. Stops at the first white phosphorus round, 5:48 PM. */
const HOURS: [number, number][] = [
  [S.call.from, 0],
  [S.guns.to, 2],
  [S.openGround.to, 4],
  [S.oneHour.to, 5],
  [S.markers.to, 6],
  [S.lastOfThem.to, 8],
  [S.lastStand.from, 9],
  [WP_FILM[0], 10.8],
];

/** Where the counter shows. It sits out the river, which keeps its own clock, the bottle, which goes back a few hours, and the last words. */
const COUNTER_SCENES: SceneName[] = ["call", "guns", "road", "openGround", "oneHour", "runningOut", "markers", "lastOfThem", "threeRounds"];

export function hoursSinceCall(t: number) {
  return track(HOURS, t);
}

export function counterAt(t: number) {
  if (!COUNTER_SCENES.includes(sceneAt(t))) return undefined;
  const h = hoursSinceCall(t), whole = Math.floor(h + 1e-6), m = Math.floor((h - whole) * 60 + 1e-6);
  return `${whole}H ${String(m).padStart(2, "0")}M SINCE THE FIRST CALL`;
}

// ── The words ─────────────────────────────────────────────────────────────────────────────────────────

export type Stamp = { from: number; to: number; text: string };

export const STAMPS: Stamp[] = [
  { from: S.fourYears.from, to: S.boats.to, text: "2010 – 2014 · THE HUNT" },
  { from: S.room.from, to: S.room.to, text: "JAN 9, 2015 · MALACAÑANG" },
  { from: S.practice.from, to: S.practice.to, text: "JANUARY 2015 · ZAMBOANGA" },
  { from: S.trucks.from, to: S.trucks.to, text: "JAN 24 · NIGHT" },
  { from: S.dropOff.from, to: S.route.to, text: "10:10 PM · DROP-OFF POINT" },
  { from: S.weight.from, to: S.weight.to, text: "JAN 25 · THE MARSH" },
  { from: S.lastRiver.from, to: S.lastRiver.to, text: "2:30 AM · THE LAST RIVER" },
  { from: S.window.from, to: S.bingo.to, text: "4:00 AM · THE HUTS" },
  { from: S.awake.from, to: S.awake.to, text: "THE 84TH · PULLING OUT" },
  { from: S.bridge.from, to: S.bridge.to, text: "THE 55TH · THE BRIDGE" },
  { from: S.morning.from, to: S.morning.to, text: "FIRST LIGHT · TUKANALIPAO" },
  { from: S.across.from, to: S.firstShots.to, text: "5:30 AM · THE CORNFIELD" },
  { from: S.call.from, to: S.call.to, text: "7:00 AM · THE CORNFIELD" },
  { from: S.guns.from, to: S.guns.to, text: "THE ARTILLERY" },
  { from: S.road.from, to: S.road.to, text: "9:00 AM · THE HIGHWAY" },
  { from: S.openGround.from, to: S.openGround.to, text: "THE OPEN GROUND" },
  { from: S.oneHour.from, to: S.oneHour.to, text: "11:00 AM · THE 84TH" },
  { from: S.runningOut.from, to: S.markers.to, text: "THE 55TH · THE CORNFIELD" },
  { from: S.lastOfThem.from, to: S.lastOfThem.from + 6, text: "2:00 PM · THE CORNFIELD" },
  { from: S.lastOfThem.from + 6, to: S.lastOfThem.to, text: "3:00 PM · THE CORNFIELD" },
  { from: S.eleven.from, to: S.eleven.from + 13, text: "THE RIVER" },
  { from: S.eleven.from + 13, to: S.eleven.to, text: "UNTIL AFTER 6:00 PM · THE RIVER" },
  { from: S.bottle.from, to: S.bottle.to, text: "PAST NOON · THE 84TH" },
  { from: S.lastStand.from, to: S.lastStand.to, text: "THE 84TH · THE RIVERBANK" },
  { from: S.threeRounds.from, to: S.threeRounds.to, text: "5:48 PM · THE RIVERBANK" },
  { from: S.lights.from, to: S.lights.to, text: "11:30 PM · THE RIVERBANK" },
  { from: S.ninth.from, to: S.ninth.to, text: "THE NIGHT · THE CORNFIELD" },
  { from: S.bicycle.from, to: S.bicycle.to, text: "JAN 26 · THE ROAD" },
  { from: S.halfMast.from, to: S.halfMast.to, text: "JAN 30, 2015" },
];

export type Card = { from: number; to: number; text: string; fact: FactId | FactId[]; kind?: "plain" | "radio" | "quote" };

const line = (from: number, seconds: number, text: string, fact: FactId | FactId[], kind?: Card["kind"]): Card => ({ from, to: from + Math.max(seconds, 1.51 + text.trim().split(/\s+/).length / 2.5), text, fact, kind });

export const CARDS: Card[] = [
  line(S.fourYears.from + 1, 6, "December 2010, Sulu. Marwan escapes hours before they arrive.", "pitas"),
  line(S.fourYears.from + 11, 5.4, "Mission after mission fails or is called off.", "attempts"),
  line(S.boats.from + 0.6, 4.8, "November 2014. The boats capsize on the way in.", "terminator"),

  line(S.room.from + 0.8, 4.6, "A government–MILF ceasefire has been in place since 1997.", "ceasefire"),
  line(S.room.from + 6, 5, "The President says to coordinate with the Army.", "coordinate"),
  line(S.room.from + 11.4, 3.6, "The SAF director fears another leak.", "leak"),
  line(S.room.from + 15.4, 4.2, "“Have you truly no more trust in the AFP?” No one answers.", "noAnswer", "quote"),

  line(S.practice.from + 5.5, 6.4, "They rehearse for two weeks. Not with everything they will carry.", ["rehearse", "overload"]),

  line(S.trucks.from + 8.5, 5, "392 commandos are mobilized.", "mobilized"),

  line(S.route.from + 1, 4, "The plan needs darkness.", "needsDark"),
  line(S.route.from + 7.8, 5, "The 84th has a guide. The 55th does not.", "noGuide"),

  line(S.weight.from + 3, 5, "They carry more than they can.", "overload"),
  line(S.weight.from + 13.5, 6, "Some of the 55th keep asking to halt.", "overload"),

  line(S.lastRiver.from + 4, 4.6, "Daylight is close.", "lastRiver"),
  line(S.lastRiver.from + 11, 5.2, "The first group across will not wait.", "thirteen"),
  line(S.lastRiver.from + 22, 5, "Thirteen go on.", "thirteen"),

  line(S.fifteen.from + 3, 6, "An explosive goes off. The firefight lasts about 15 minutes.", "firefight"),
  line(S.bingo.from + 1, 3.6, "“Mike One, bingo.”", "bingo", "radio"),
  line(S.bingo.from + 5, 6.4, "Marwan is dead. A DNA sample is taken. Two other targets escape.", ["dnaTaken", "escaped"]),
  line(S.awake.from + 2.6, 5.4, "The shots have woken everyone.", "awake"),

  line(S.bridge.from + 1, 5, "1.8 km away, the 55th hears it and stops.", "heard"),
  line(S.bridge.from + 8.4, 3.6, "A man sees them.", "manSees"),
  line(S.bridge.from + 14.6, 6.6, "They try to go back across the bridge. Someone shouts.", "shout"),

  line(S.morning.from + 3, 6, "Local people are starting their day.", "ownsDay"),

  line(S.across.from + 12, 6.8, "The Board calls it pintakasi: armed men of any group, against an outsider.", "pintakasi"),
  line(S.across.from + 19.2, 4.2, "No verified count exists.", "strength"),

  line(S.firstShots.from + 6.8, 4.8, "Who fired first is disputed.", "firedFirst"),

  line(S.call.from + 1, 7.4, "The 55th asks for artillery and reinforcements.", "radioed"),
  line(S.guns.from + 0.8, 7.4, "Artillery is put on hold. Accounts of the reason differ.", "artilleryHold"),
  line(S.road.from + 1, 6.4, "Armor arrives. It cannot leave the road.", "armor"),
  line(S.openGround.from + 0.8, 6.6, "Nearly 300 commandos cannot cross the open ground.", ["support", "gap"]),
  line(S.oneHour.from + 3.6, 4.8, "A message says cease fire. The firing stops.", "ceaseSms"),
  line(S.oneHour.from + 9.2, 3, "For an hour.", "ceaseSms"),
  line(S.runningOut.from + 0.6, 5, "They are running low on ammunition.", "held"),

  line(S.lastOfThem.from + 0.8, 4.4, "One man is told he may try.", "lets"),
  line(S.lastOfThem.from + 6.2, 5.4, "No more gunfire from his comrades. 35 of the 36 are dead.", ["lastGunfire", "lone"]),

  line(S.eleven.from + 1, 5.8, "He takes off his vest and goes into the river.", "river"),
  line(S.eleven.from + 13.6, 3.8, "By his account: eleven hours.", "river"),

  line(S.bottle.from + 2, 5.4, "One bottle of IV fluid. More than ten men drink from it.", "ivBottle"),
  line(S.bottle.from + 9, 4.6, "A wounded man talks about his growing child.", "growingKid"),
  line(S.bottle.from + 14.4, 4.8, "They tell him they will all go home.", "growingKid"),

  line(S.lastStand.from + 0.4, 5, "They say goodbye. They entrust their families to each other.", "goodbyes"),
  line(S.lastStand.from + 6, 5.8, "“I love you, mommy.” “I love you, baby.” “I love Seaborne.”", "cries", "quote"),
  line(S.lastStand.from + 12.2, 3.8, "“Huwag niyo kaming iwan.” Don't leave us.", "dontLeave", "quote"),
  line(S.lastStand.from + 16.7, 2.8, "They never did.", "dontLeave"),

  line(S.threeRounds.from + 0.4, 6.2, "Almost 11 hours after the first call: three white phosphorus rounds.", "whitePhosphorus"),
  line(S.threeRounds.from + 6.8, 5, "The shooting stops at about 6:00 PM.", "stopped"),

  line(S.lights.from + 3, 7.4, "Help reaches the 84th: 17 unharmed, 11 wounded, 8 dead.", "linkUp"),
  line(S.ninth.from + 0.8, 5, "The man who talked about his child dies at hospital.", ["ninth", "growingKid"]),
  line(S.ninth.from + 6.4, 5, "Monitors and village officials bring tractors for the dead.", "retrieval"),
  line(S.bicycle.from + 0.4, 6.3, "Armed men find him. He plays dead, then fights his way out.", "playsDead"),
  line(S.bicycle.from + 6.8, 7.1, "2:00 PM, January 26. PO2 Christopher Lalan reaches the SAF post on a bicycle.", "bicycle"),
  line(S.halfMast.from + 2.6, 6, "A National Day of Mourning.", "mourning"),

  line(S.count.from + 19.7, 5.4, "Several hundred families are displaced.", "displaced"),
  line(S.cost.from + 0.4, 3.6, "DNA confirms Marwan on February 4.", "dnaConfirmed"),
  line(S.cost.from + 4.4, 3, "Peace law hearings halt.", "bblHalted"),
  line(S.cost.from + 7.6, 4.2, "The Board: the mission planning “was defective”.", "defective"),
];

export type Tally = { from: number; to: number; n: string; text: string; fact: FactId };

export const TALLIES: Tally[] = [
  { from: S.count.from + 0.6, to: S.count.from + 4.4, n: "44", text: "SPECIAL ACTION FORCE COMMANDOS", fact: "toll44" },
  { from: S.count.from + 4.6, to: S.count.from + 7.4, n: "16", text: "SEVERELY INJURED", fact: "toll16" },
  { from: S.count.from + 7.6, to: S.count.from + 11.15, n: "18", text: "MILF FIGHTERS REPORTED KILLED", fact: "toll18" },
  { from: S.count.from + 11.2, to: S.count.from + 14.35, n: "5", text: "LOCAL RESIDENTS KILLED", fact: "toll5" },
  { from: S.count.from + 14.4, to: S.count.from + 19.6, n: "67", text: "FILIPINOS DEAD, AND AN UNREPORTED NUMBER OF BIFF", fact: "toll67" },
];

export const wordCount = (s: string) => s.trim().split(/\s+/).length;
/** The shortest time a line of `words` words can stay up and still be read. */
export const minHold = (words: number) => 1.5 + words / 2.5;
export const MAX_WORDS = 14;
