// The film, shot by shot: what plays when, and how it arrives. A shot moved here keeps its own timing inside, because every
// scene takes seconds into itself.
import { type Built, scene } from "./props";
import { boatsFrame, dropOffFrame, fourYearsFrame, lastRiverFrame, practiceFrame, roomFrame, routeFrame, trucksFrame } from "./act1to2";
import { acrossFrame, awakeFrame, bingoFrame, bridgeFrame, callFrame, crawlFrame, fifteenFrame, morningFrame, oneHourFrame, runningOutFrame, windowFrame } from "./act3to5";
import { bottleFrame, costFrame, halfMastFrame, lastStandFrame, lightsFrame } from "./act7to8";
import { batteryFrame, bicycleFrame, clearLens, emptyFieldFrame, lastFieldFrame, marshEdgeFrame, phosphorusFrame, retrievalFrame, roadFrame } from "./ground";
import { envAt } from "./land";
import { elevenHoursFrame, firstShotsFrame, weightFrame } from "./scenes";
import { countFrame, fieldFrame } from "./sim";
import { SCENES as S } from "./timeline";

/**
 * How a shot arrives. "dissolve" is the same place or a new one, melting in. "descent" is the same, with haze at its middle, for
 * going between the map and the ground. "black" comes up from nothing. "cut" is only ever for violence.
 */
export type Arrival = "cut" | "dissolve" | "descent" | "black";
export type Shot = { from: number; to: number; scene: (u: number) => Built; in: Arrival; fade?: number };

const onGround = (fn: (t: number) => Built) => clearLens(170, fn);
/** A shot from the first cut, which runs on the old clock. */
const old = (fn: (t: number) => Built, from: number, speed = 1) => (u: number) => onGround(fn)(from + u * speed);
const fresh = (fn: (u: number) => Built) => onGround(fn);
const NOTHING = () => scene({ tris: [], camera: { pos: [0, 0, 0], target: [0, 0, -1], fov: 40 }, env: envAt(1, 1, 2) }, [], { black: 1 });

export const SHOTS: Shot[] = [
  { ...S.title, scene: NOTHING, in: "black" },
  { ...S.fourYears, scene: fourYearsFrame, in: "black" },
  { ...S.boats, scene: boatsFrame, in: "dissolve" },
  { ...S.room, scene: roomFrame, in: "dissolve", fade: 1.4 },
  { ...S.practice, scene: practiceFrame, in: "dissolve" },
  { ...S.trucks, scene: trucksFrame, in: "dissolve", fade: 1.4 },
  { ...S.dropOff, scene: fresh(dropOffFrame), in: "dissolve" },
  { ...S.route, scene: routeFrame, in: "descent", fade: 1.2 },
  { ...S.weight, scene: fresh(weightFrame), in: "descent", fade: 1.6 },
  { ...S.lastRiver, scene: fresh(lastRiverFrame), in: "dissolve", fade: 1.4 },
  { ...S.window, scene: fresh(windowFrame), in: "dissolve", fade: 1.6 },
  { ...S.fifteen, scene: fresh(fifteenFrame), in: "cut" },
  { ...S.bingo, scene: fresh(bingoFrame), in: "dissolve", fade: 0.8 },
  { ...S.awake, scene: fresh(awakeFrame), in: "dissolve", fade: 0.6 },
  { ...S.bridge, scene: fresh(bridgeFrame), in: "dissolve", fade: 1.2 },
  { ...S.morning, scene: fresh(morningFrame), in: "dissolve", fade: 1.6 },
  { ...S.across, scene: fresh(acrossFrame), in: "dissolve", fade: 1.6 },
  { ...S.firstShots, scene: fresh(firstShotsFrame), in: "dissolve", fade: 1 },
  { ...S.call, scene: fresh(callFrame), in: "dissolve", fade: 0.7 },
  { ...S.guns, scene: old(batteryFrame, 131), in: "dissolve", fade: 1 },
  { ...S.road, scene: old(roadFrame, 138.8), in: "dissolve", fade: 1 },
  { ...S.openGround, scene: old(marshEdgeFrame, 145), in: "dissolve", fade: 0.8 },
  { ...S.oneHour, scene: fresh(oneHourFrame), in: "dissolve", fade: 0.8 },
  { ...S.runningOut, scene: fresh(runningOutFrame), in: "dissolve", fade: 0.8 },
  { ...S.markers, scene: (u) => fieldFrame(157 + u * 2), in: "descent", fade: 1.2 },
  { from: S.lastOfThem.from, to: S.lastOfThem.from + 6, scene: fresh(crawlFrame), in: "descent", fade: 1 },
  { from: S.lastOfThem.from + 6, to: S.lastOfThem.to, scene: old(emptyFieldFrame, 181.5, 0.82), in: "dissolve", fade: 1.2 },
  { ...S.eleven, scene: fresh(elevenHoursFrame), in: "dissolve", fade: 1 },
  { ...S.bottle, scene: fresh(bottleFrame), in: "dissolve", fade: 1.4 },
  { ...S.lastStand, scene: fresh(lastStandFrame), in: "black" },
  { ...S.threeRounds, scene: old(phosphorusFrame, 212.4), in: "dissolve", fade: 0.6 },
  { ...S.lights, scene: fresh(lightsFrame), in: "dissolve", fade: 1.6 },
  { ...S.ninth, scene: old(retrievalFrame, 226, 8.2 / 12), in: "dissolve", fade: 1.4 },
  { ...S.bicycle, scene: old(bicycleFrame, 247.8), in: "dissolve", fade: 1.6 },
  { ...S.halfMast, scene: halfMastFrame, in: "dissolve", fade: 1.4 },
  { ...S.count, scene: (u) => onGround(countFrame)(256 + u * (22.7 / 26)), in: "dissolve", fade: 1.6 },
  { ...S.cost, scene: fresh(costFrame), in: "dissolve", fade: 1.4 },
  { ...S.lastField, scene: old(lastFieldFrame, 278.7), in: "dissolve", fade: 1.6 },
  { ...S.end, scene: NOTHING, in: "black" },
];

const DEFAULT_FADE = 1;
const smooth01 = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/** What to draw at film time t: the shot, how far into view it is, the one it's replacing, and any haze or black over both. */
export function filmAt(t: number): { now: Built; before?: Built; mix: number; haze: number; black: number } {
  let i = SHOTS.findIndex((s) => t >= s.from && t < s.to);
  if (i < 0) i = SHOTS.length - 1;
  const s = SHOTS[i], u = t - s.from;
  const now = s.scene(u);
  const last = SHOTS[i - 1];
  const next = SHOTS[i + 1];
  // The shot before a black arrival fades away first, so nothing jumps to dark.
  const out = next?.in === "black" ? smooth01(1 - (s.to - t) / 0.7) : 0;
  if (s.in === "black") return { now, mix: 1, haze: 0, black: Math.max(smooth01(1 - u / 1.2), out, now.fx.black) };
  if (s.in === "cut" || !last) return { now, mix: 1, haze: 0, black: Math.max(out, now.fx.black) };
  const fade = s.fade ?? DEFAULT_FADE;
  if (u >= fade) return { now, mix: 1, haze: 0, black: Math.max(out, now.fx.black) };
  const k = u / fade;
  return { now, before: last.scene(t - last.from), mix: smooth01(k), haze: s.in === "descent" ? Math.sin(k * Math.PI) * 0.82 : 0, black: Math.max(out, now.fx.black) };
}

