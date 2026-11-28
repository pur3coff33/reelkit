// "Seven Plates": one Filipino yard, one Christmas a year, 1998 to 2026, in one unbroken camera move. A family of seven
// eats Noche Buena at a long table under the parol. One by one the children leave (abroad, to sea, to marry, to work),
// and each one fades into the balikbayan box that takes their chair. In 2026 the old parents light the parol, set seven
// plates and leave the gate open. The camera never cuts: the years melt into each other around it.
// Everything is a function of the film's time t (0…60 s). A segment is one year's state of the yard; the picture melts
// from one segment into the next (Film scenes with `melt`), while the camera keeps moving through both.
import type { Sky } from "../../src/kit/looks/box/world";
import { mixSky } from "../../src/kit/looks/box/world";
import { clamp01, smooth, type RGB, type V3 } from "../../src/kit/looks/core";

export const SECONDS = 60;

// ── The land and places ────────────────────────────────────────────────────────────────────────────────────────
export const SIZE = 2.1;
export const groundY = (x: number, z: number) => 0.04 * Math.sin(1.3 * x + 0.4) * Math.cos(1.1 * z) + 0.07 * smooth(-1.2, -2.1, z) + 0.01 * Math.sin(3.1 * x) * Math.sin(2.7 * z);
const G = groundY;
const at = (x: number, z: number, dy = 0): V3 => [x, G(x, z) + dy, z];

/** The house: centre, scale; it faces +z. */
export const HX = -0.1, HZ = -0.95, HS = 1.5;
export const FRONT = HZ + 0.32 * HS;
export const DOOR: [number, number] = [HX - 0.16 * HS, FRONT + 0.08];
/** The parol hangs in front of the window, right of the door. */
export const PAROL: V3 = [HX + 0.17 * HS, G(HX, HZ) + 0.36 * HS, FRONT + 0.07];
/** The long table, along z, its far end towards the house. */
export const TX = 0.28, TZ = 0.22, TABLE_H = 0.2, TABLE_HALF: [number, number] = [0.15, 0.34];
export const BULB: V3 = [TX, G(TX, TZ) + 0.72, TZ - 0.02];
export const MANGO: [number, number] = [1.38, -0.25];
export const FENCE_Z = 1.12, GATE_X = -0.75, ROAD_Z = 1.56;
/** The light sign over the yard that spells the title, on two bamboo poles. Centre of its letters. */
export const SIGN: V3 = [TX - 0.2, G(TX, TZ) + 1.08, TZ - 0.55];
export const NEIGHBOURS: [number, number, number][] = [[1.45, -1.4, 0.85], [-1.62, -1.5, 0.8]];
/** Where people say goodbye: just inside the gate. */
const HUG: [number, number] = [GATE_X + 0.02, FENCE_Z - 0.16];

// ── The family ─────────────────────────────────────────────────────────────────────────────────────────────────
export type Who = "tatay" | "nanay" | "ate" | "kuya" | "ditse" | "diko" | "bunso";
export type Member = { who: Who; born: number; coat: RGB; hair: RGB; long: boolean; legs: RGB; seat: number; leaves?: number };
export const FAMILY: Member[] = [
  { who: "tatay", born: 1958, coat: [0.2, 0.32, 0.6], hair: [0.1, 0.08, 0.07], long: false, legs: [0.28, 0.25, 0.22], seat: 0 },
  { who: "nanay", born: 1960, coat: [0.82, 0.22, 0.32], hair: [0.1, 0.07, 0.06], long: true, legs: [0.3, 0.22, 0.3], seat: 1 },
  // Seats: whoever leaves first sits nearest the camera's side of the table, so each box is in plain view.
  // Ate, the eldest: a nurse abroad. Kuya: a seaman. Ditse: marries away. Diko: work in Dubai. Bunso, the youngest: Canada.
  { who: "ate", born: 1986, coat: [0.98, 0.78, 0.22], hair: [0.12, 0.08, 0.06], long: true, legs: [0.25, 0.3, 0.55], seat: 3, leaves: 2006 },
  { who: "kuya", born: 1988, coat: [0.2, 0.62, 0.38], hair: [0.08, 0.07, 0.06], long: false, legs: [0.22, 0.24, 0.34], seat: 6, leaves: 2009 },
  { who: "ditse", born: 1990, coat: [0.95, 0.5, 0.7], hair: [0.14, 0.09, 0.07], long: true, legs: [0.3, 0.28, 0.42], seat: 2, leaves: 2013 },
  { who: "diko", born: 1992, coat: [0.98, 0.52, 0.18], hair: [0.09, 0.07, 0.06], long: false, legs: [0.24, 0.27, 0.38], seat: 5, leaves: 2018 },
  { who: "bunso", born: 1995, coat: [0.4, 0.72, 0.96], hair: [0.13, 0.09, 0.07], long: true, legs: [0.32, 0.3, 0.45], seat: 4, leaves: 2019 },
];
export const member = (w: Who) => FAMILY.find((m) => m.who === w)!;
/** Is this child still home for this year's Christmas? */
export const home = (m: Member, year: number) => !m.leaves || year < m.leaves;

/** Peg-doll age (0 child … 1 old) and size from years old. */
export function ageOf(years: number) {
  const pts: [number, number][] = [[3, 0], [17, 0.3], [25, 0.42], [45, 0.62], [58, 0.78], [70, 0.93]];
  let age = 0;
  for (let i = 1; i < pts.length; i++) if (years <= pts[i][0] || i === pts.length - 1) {
    const [a, x] = pts[i - 1], [b, y] = pts[i];
    age = x + (y - x) * clamp01((years - a) / (b - a));
    break;
  }
  const scale = years < 18 ? 0.5 + 0.5 * clamp01((years - 3) / 15) : years > 64 ? 0.96 : 1;
  return { age, scale };
}

// ── Segments: one year's yard each, melting into the next ─────────────────────────────────────────────────────
export type SegId = "hook" | "y1998" | "y2003" | "ate" | "y2006" | "y2009" | "y2013" | "y2018" | "bunso" | "y2026";
export type Seg = { id: SegId; from: number; melt: number; year: number };
export const SEGS: Seg[] = [
  { id: "hook", from: 0, melt: 0, year: 2026 },
  { id: "y1998", from: 4.3, melt: 1.3, year: 1998 },
  { id: "y2003", from: 13.7, melt: 1.1, year: 2003 },
  { id: "ate", from: 17.9, melt: 1.0, year: 2006 },
  { id: "y2006", from: 23.2, melt: 1.2, year: 2006 },
  { id: "y2009", from: 27.2, melt: 1.3, year: 2009 },
  { id: "y2013", from: 31.2, melt: 1.3, year: 2013 },
  { id: "y2018", from: 35.2, melt: 1.3, year: 2018 },
  { id: "bunso", from: 39.0, melt: 1.2, year: 2019 },
  { id: "y2026", from: 44.0, melt: 1.8, year: 2026 },
];
export const seg = (id: SegId) => SEGS.find((s) => s.id === id)!;
/** The segment that owns time t (the newest one that has begun). */
export const segAt = (t: number) => SEGS[Math.max(0, SEGS.findLastIndex((s) => t >= s.from))];

/** The photo: the picture holds still for a moment after the flash (the camera too). */
export const FLASH = 16.4, FREEZE = 0.8;
export const filmTime = (t: number) => (t >= FLASH && t < FLASH + FREEZE ? FLASH : t);

// ── The camera: one move, through keyframes, with smooth speed ────────────────────────────────────────────────
type Key = [number, V3, V3]; // [t, eye, target]
const orbit = (a: number, r: number, h: number, ty = 0.2): [V3, V3] => [[TX + r * Math.sin(a), h, TZ + r * Math.cos(a)], [TX, ty, TZ - 0.02]];
const ORBIT: [number, number, number, number][] = [[23.6, 0.78, 1.42, 0.72], [25.5, 0.5, 1.36, 0.7], [27.6, 0.12, 1.3, 0.68], [29.5, -0.25, 1.3, 0.66], [31.6, -0.72, 1.36, 0.66], [33.5, -1.05, 1.4, 0.66], [35.6, -1.42, 1.32, 0.64], [37.5, -1.75, 1.26, 0.62]];
export const KEYS: Key[] = [
  // 2026: the title in bulbs over the yard, then down towards the old couple at the table, into the glow.
  [0, [0.1, 1.5, 2.45], [0.08, 1.02, -0.33]],
  [2.2, [0.11, 1.32, 2.1], [0.09, 0.95, -0.3]],
  [3.9, [0.13, 1.0, 1.55], [0.12, 0.62, -0.2]],
  // 1998, dusk: round to the window as Tatay hangs the parol; the children chase about; the food comes out.
  [5.6, [0.1, 0.72, 1.12], [0.18, 0.42, -0.3]],
  [7.4, [-0.25, 0.64, 0.8], [0.22, 0.44, -0.4]],
  [9.2, [-0.78, 0.78, 1.38], [0.2, 0.24, 0.05]],
  // The feast, from the end of the table; then up to the fireworks.
  [10.8, [0.3, 0.74, 1.52], [0.28, 0.2, 0.12]],
  [12.4, [0.72, 0.66, 1.18], [0.27, 0.24, 0.1]],
  [13.9, [0.66, 0.72, 1.3], [0.15, 1.6, -0.7]],
  // 2003: down from the sky to the family lined up for the photo.
  [15.4, [0.26, 0.76, 2.75], [0.22, 0.3, 0.64]],
  [16.4, [0.25, 0.74, 2.66], [0.22, 0.3, 0.66]],
  // 2006, dawn: to the gate, close on the goodbye; back as the jeepney goes.
  [18.6, [0.3, 0.64, 1.12], [-0.7, 0.3, 0.98]],
  [19.9, [0.16, 0.6, 1.06], [-0.72, 0.3, 0.98]],
  [21.4, [0.6, 0.88, 0.75], [-0.25, 0.25, 1.35]],
  [22.6, [0.62, 0.84, 0.82], [-0.7, 0.24, 1.0]],
  // Christmas after Christmas: round the table.
  ...ORBIT.map(([t, a, r, h]): Key => [t, ...orbit(a, r, h)]),
  // 2019: after Bunso to the gate; close on the last goodbye; then the road.
  [39.8, [-1.25, 0.82, 0.55], [-0.45, 0.25, 0.4]],
  [41.2, [-2.0, 0.82, 0.92], [-0.7, 0.3, 0.98]],
  [42.4, [-1.92, 0.8, 0.9], [-0.7, 0.3, 0.98]],
  [43.6, [-1.7, 0.98, 0.62], [-0.2, 0.25, 1.4]],
  [44.6, [-1.95, 0.84, 0.92], [-0.7, 0.3, 1.0]],
  // 2026: the same two at the gate, old now. They walk back; the parol; seven plates; their hands; up and away.
  [45.6, [-1.88, 0.82, 0.92], [-0.7, 0.3, 0.98]],
  [47.4, [-0.75, 0.72, 1.5], [-0.35, 0.3, 0.4]],
  [48.8, [-0.55, 0.66, 0.75], [0.12, 0.44, -0.38]],
  [50.4, [1.25, 0.95, 1.55], [0.27, 0.2, 0.12]],
  [52.4, [1.2, 0.85, 1.05], [0.25, 0.2, 0.08]],
  [53.9, [1.0, 0.74, 0.98], [0.15, 0.36, -0.08]],
  [55.3, [0.92, 0.7, 0.9], [0.15, 0.37, -0.08]],
  [57.0, [0.34, 1.05, 1.5], [0.1, 0.85, -0.3]],
  [60, [0.5, 2.7, 4.4], [-0.05, 0.25, 0.25]],
];

function hermite(keys: Key[], t: number, pick: 1 | 2): V3 {
  const i = Math.max(0, Math.min(keys.length - 2, keys.findLastIndex((k) => k[0] <= t)));
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const span = k2[0] - k1[0], u = clamp01((t - k1[0]) / span);
  // Tangents from the neighbours, by time: speed carries smoothly through every key.
  const tan = (a: Key, c: Key, d: number) => (c[pick][d] - a[pick][d]) / (c[0] - a[0]);
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return [0, 1, 2].map((d) => {
    const m1 = i === 0 ? 0 : tan(k0, k2, d), m2 = i + 2 >= keys.length ? 0 : tan(k1, k3, d);
    return h00 * k1[pick][d] + h10 * span * m1 + h01 * k2[pick][d] + h11 * span * m2;
  }) as V3;
}
export const ZOOM = 2.2;
export function cameraAt(t: number): { pos: V3; target: V3 } {
  return { pos: hermite(KEYS, t, 1), target: hermite(KEYS, t, 2) };
}

// ── Bodies ─────────────────────────────────────────────────────────────────────────────────────────────────────
export type Body = { at: V3; turn: number; scale: number; k: number[] };
type Act = { stride?: number; sit?: number; arm?: number; armL?: number; reach?: number; lean?: number; nod?: number; smile?: number; shut?: number; look?: number; dy?: number };
export const FACE_Z = Math.PI / 2, FACE_NZ = -Math.PI / 2, FACE_X = 0, FACE_NX = Math.PI;

function body(m: Member, year: number, x: number, z: number, turn: number, o: Act = {}): Body {
  const { age, scale } = ageOf(year - m.born);
  return { at: at(x, z, o.dy ?? 0), turn, scale, k: [o.stride ?? 0, age, o.sit ?? 0, o.arm ?? 0, o.smile ?? 0.4, o.shut ?? 0, o.look ?? 0, o.armL ?? 0, o.reach ?? 0, o.lean ?? 0, o.nod ?? 0] };
}
/** Chairs: 0 the head (far end, facing the camera's usual side), 1–3 the left side (facing +x), 4–6 the right (facing −x). */
export function seatAt(i: number): { x: number; z: number; turn: number } {
  if (i === 0) return { x: TX, z: TZ - TABLE_HALF[1] - 0.1, turn: FACE_Z };
  const left = i <= 3, row = left ? i - 1 : i - 4, z = TZ - 0.2 + row * 0.2;
  return { x: left ? TX - 0.25 : TX + 0.25, z, turn: left ? FACE_X : FACE_NX };
}
export function placeAt(i: number): [number, number] {
  const s = seatAt(i);
  return [s.x + Math.cos(s.turn) * 0.15, s.z + Math.sin(s.turn) * 0.15];
}
function seated(m: Member, year: number, seat: number, o: Act = {}): Body {
  const s = seatAt(seat), { scale } = ageOf(year - m.born);
  const b = body(m, year, s.x - Math.cos(s.turn) * 0.02, s.z - Math.sin(s.turn) * 0.02, s.turn, { sit: 1, ...o });
  b.at[1] = G(s.x, s.z) + 0.13 - 0.135 * scale + 0.005 + (o.dy ?? 0);
  return b;
}
/** Getting up from a chair or sitting down: 0 seated … 1 standing beside it. */
function rising(m: Member, year: number, seat: number, up: number, o: Act = {}): Body {
  const s = seatAt(seat), sat = seated(m, year, seat, o), stand = body(m, year, s.x - Math.cos(s.turn) * 0.09, s.z - Math.sin(s.turn) * 0.09, s.turn, o);
  const k = smooth(0, 1, up);
  return { ...stand, at: [sat.at[0] + (stand.at[0] - sat.at[0]) * k, sat.at[1] + (stand.at[1] - sat.at[1]) * k, sat.at[2] + (stand.at[2] - sat.at[2]) * k], k: stand.k.map((v, i) => (i === 2 ? 1 - k : v)) };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function route(pts: [number, number][], t0: number, t1: number, ease = true) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const posAt = (d: number): [number, number] => {
    d = Math.max(0, Math.min(total, d));
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        const k = lens[i] ? Math.min(1, d / lens[i]) : 0;
        return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
      }
      d -= lens[i];
    }
    return pts[pts.length - 1];
  };
  return (t: number) => {
    const u = ease ? smooth(t0, t1, t) : clamp01((t - t0) / (t1 - t0));
    const d = u * total, [x, z] = posAt(d), a = posAt(d - 0.04), b = posAt(d + 0.04);
    return { x, z, turn: Math.atan2(b[1] - a[1], b[0] - a[0]), d, moving: t > t0 && t < t1 };
  };
}
type Walk = ReturnType<ReturnType<typeof route>>;
function walking(m: Member, year: number, w: Walk, o: Act & { run?: boolean } = {}): Body {
  const { scale } = ageOf(year - m.born), old = year - m.born > 62, step = (o.run ? 0.14 : old ? 0.07 : 0.1) * scale;
  const ph = (w.d / step) * Math.PI, stride = w.moving ? Math.sin(ph) * (o.run ? 1 : old ? 0.55 : 0.8) : 0;
  return body(m, year, w.x, w.z, w.turn, { ...o, stride, dy: o.run && w.moving ? 0.014 * Math.abs(Math.sin(ph)) : 0, lean: (o.lean ?? 0) + (old ? 0.3 : 0) });
}
function circling(c: [number, number], r: number, t0: number, t1: number, laps: number, phase = 0): (t: number) => Walk {
  return (t) => {
    const a = Math.PI * 2 * laps * clamp01((t - t0) / (t1 - t0)) + phase;
    return { x: c[0] + r * Math.cos(a), z: c[1] + r * Math.sin(a), turn: a + Math.PI / 2, d: r * a, moving: t > t0 && t < t1 };
  };
}
const wave = (t: number, p = 0) => 0.72 + 0.28 * Math.sin(t * 7 + p);
/** At the table: eating, talking, turning to each other. */
function eating(t: number, i: number, lively: number): Act {
  const bite = Math.max(0, Math.sin(t * 2.1 + i * 1.7));
  return { arm: 0.12 + 0.3 * bite * bite, look: 0.5 * Math.sin(t * 0.8 + i * 2.3) * lively, smile: 0.4 + 0.5 * lively, nod: 0.25 * lively * Math.max(0, Math.sin(t * 3.1 + i)) };
}
const facing = (from: [number, number], to: [number, number]) => Math.atan2(to[1] - from[1], to[0] - from[0]);

// The jeepney (2006) and the tricycle (2019, and a light on the road in 2026) wait on the road, then pull away left.
export type Ride = { kind: "jeep" | "trike"; x: number; z: number; lit: boolean; right?: boolean };
export function rideAt(id: SegId, t: number): Ride | null {
  if (id === "ate") return { kind: "jeep", x: 0.25 - 3.2 * smooth(22.2, 24.4, t) ** 1.6, z: ROAD_Z, lit: false };
  if (id === "bunso") return { kind: "trike", x: -0.45 + 2.8 * smooth(43.5, 45.4, t) ** 1.5, z: ROAD_Z + 0.05, lit: false, right: true };
  if (id === "y2026" && t > 56.8) return { kind: "trike", x: -2.3 + 0.75 * smooth(56.8, 60.5, t), z: ROAD_Z + 0.05, lit: true };
  return null;
}

/** Everyone's body in a segment at time t. */
export function cast(id: SegId, t: number): { m: Member; b: Body }[] {
  const y = seg(id).year, out: { m: Member; b: Body }[] = [];
  const put = (w: Who, b: Body | null) => b && out.push({ m: member(w), b });
  const M = member;
  const atTable = (who: Who[], lively: number, over: Partial<Record<Who, Act>> = {}) => who.forEach((w) => {
    const m = M(w), i = FAMILY.indexOf(m);
    put(w, seated(m, y, m.seat, { ...eating(t, i, lively), ...over[w] }));
  });
  switch (id) {
    case "hook":
    case "y2026": {
      if (id === "hook" || t > 53.0) {
        // Old, together, at a table set for seven. At the end his hand finds hers.
        const hold = id === "y2026" ? smooth(53.9, 54.8, t) : 0;
        put("tatay", seated(M("tatay"), y, 0, { smile: 0.25 + 0.4 * hold, look: -0.6 * hold + 0.1 * Math.sin(t * 0.5), reach: 0.55 * hold, lean: 0.2 * hold }));
        put("nanay", seated(M("nanay"), y, 1, { smile: 0.15 + 0.5 * hold, look: -0.55 + 0.7 * hold, reach: 0.4 * hold, shut: 0.25 * hold }));
        break;
      }
      // At the gate where the last one left; then back to the house, slowly.
      const back = route([[HUG[0] + 0.1, HUG[1] - 0.04], [-0.55, 0.5], [0.05, 0.05], [PAROL[0] + 0.2, PAROL[2] + 0.1]], 46.0, 48.4);
      if (t < 46) put("tatay", body(M("tatay"), y, HUG[0] + 0.1, HUG[1] - 0.04, FACE_Z + 0.25, { armL: 0.25, look: -0.3, smile: 0 }));
      else if (t < 48.4) put("tatay", walking(M("tatay"), y, back(t)));
      else put("tatay", t < 50.6 ? body(M("tatay"), y, PAROL[0] + 0.2, PAROL[2] + 0.1, FACE_NZ - 0.75, { arm: smooth(48.4, 48.9, t) * (1 - smooth(49.6, 50.1, t)), smile: t > 48.9 ? 0.5 : 0.1, look: t > 49.4 ? -0.4 : 0 })
        : walking(M("tatay"), y, route([[PAROL[0] + 0.2, PAROL[2] + 0.1], [TX - 0.05, TZ - 0.6], [seatAt(0).x, seatAt(0).z - 0.08]], 50.6, 52.2)(t)));
      const nBack = route([[HUG[0] - 0.08, HUG[1]], [-0.7, 0.55], [-0.2, 0.25], [TX - 0.36, TZ - 0.5]], 46.4, 49.3);
      if (t < 46.4) put("nanay", body(M("nanay"), y, HUG[0] - 0.08, HUG[1], FACE_Z - 0.2, { arm: 0.35 * smooth(44.5, 45.2, t) * (1 - smooth(45.8, 46.3, t)), look: 0.4, smile: -0.1 }));
      else if (t < 49.3) put("nanay", walking(M("nanay"), y, nBack(t)));
      else put("nanay", walking(M("nanay"), y, NANAY_PLATES(t), { reach: 0.35 }));
      break;
    }
    case "y1998": {
      if (t < 9.6) {
        put("tatay", body(M("tatay"), y, PAROL[0] + 0.2, PAROL[2] + 0.1, FACE_NZ - 0.75, { arm: smooth(5.0, 5.8, t) * (1 - smooth(8.3, 8.9, t)), smile: 0.8, look: t > 8.2 ? -0.7 : 0, nod: t > 8.1 && t < 9 ? 0.4 : 0 }));
        const food = route([[DOOR[0], DOOR[1] - 0.15], DOOR, [DOOR[0] + 0.2, 0.08], [TX - 0.17, TZ - 0.06]], 5.4, 9.4);
        put("nanay", walking(M("nanay"), y, food(t), { reach: 1, smile: 0.9 }));
        put("ate", walking(M("ate"), y, route([[DOOR[0] - 0.05, DOOR[1] - 0.2], DOOR, [DOOR[0] + 0.12, 0.16], [TX - 0.17, TZ + 0.14]], 6.0, 9.5)(t), { reach: 0.8, smile: 0.9 }));
        put("kuya", walking(M("kuya"), y, circling([-0.45, 0.45], 0.26, 4.3, 9.6, 1.9)(t), { run: true, smile: 1, arm: 0.6 }));
        put("ditse", walking(M("ditse"), y, circling([-0.45, 0.45], 0.26, 4.3, 9.6, 1.9, 1.7)(t), { run: true, smile: 1, armL: 0.5 }));
        put("diko", walking(M("diko"), y, circling([-0.45, 0.45], 0.26, 4.3, 9.6, 1.9, 3.4)(t), { run: true, smile: 1, arm: 0.8, armL: 0.8 }));
        put("bunso", body(M("bunso"), y, DOOR[0] + 0.05, DOOR[1] + 0.14, FACE_Z, { dy: 0.035 * Math.abs(Math.sin(t * 6)), arm: wave(t), armL: wave(t, 2), smile: 1 }));
        break;
      }
      // The feast. A toast at 11.2: everyone up, arms high; the little ones stand on their chairs.
      const toast = smooth(10.9, 11.3, t) * (1 - smooth(12.0, 12.5, t));
      FAMILY.forEach((m, i) => {
        if (m.who === "tatay") return;
        const kid = y - m.born < 10;
        const b = toast > 0.02 ? rising(m, y, m.seat, toast * (kid ? 1 : 0.9), { arm: toast, armL: kid ? toast : 0, smile: 1, nod: 0.5 * toast, look: 0.3 * Math.sin(i) }) : seated(m, y, m.seat, { ...eating(t, i, 1), smile: 1 });
        if (kid && toast > 0.5) b.at[1] += 0.11 * toast + 0.03 * Math.abs(Math.sin(t * 8 + i));
        out.push({ m, b });
      });
      // Tatay stands at the head and carves; then raises the toast.
      const s0 = seatAt(0);
      put("tatay", body(M("tatay"), y, s0.x, s0.z - 0.04, FACE_Z, { arm: toast > 0.02 ? toast : 0.25 + 0.35 * Math.abs(Math.sin(t * 4)), reach: toast > 0.02 ? 0 : 0.35, lean: toast > 0.02 ? 0 : 0.4, smile: 1, nod: 0.5 * toast }));
      break;
    }
    case "y2003": {
      const row: Who[] = ["bunso", "diko", "kuya", "nanay", "tatay", "ate", "ditse"];
      row.forEach((w, i) => {
        const x = TX - 0.42 + i * 0.14, z = 0.68 + (i % 2) * 0.03;
        const after = FLASH + FREEZE + 0.15;
        if (t > after && ["bunso", "diko", "kuya"].includes(w)) {
          put(w, walking(M(w), y, route([[x, z], [x - 0.3 + i * 0.05, z + 0.2], [-0.6, 0.5]], after, 18.6)(t), { run: true, smile: 1, arm: 0.7 }));
          return;
        }
        // Arms round each other for the photo; Diko blinks.
        const pose: Act = { reach: 0.15, armL: w === "tatay" ? 0.2 : 0, smile: t > FLASH - 1.4 ? 1 : 0.6, shut: w === "diko" && Math.abs(t - FLASH) < 0.12 ? 1 : 0, nod: t > FLASH + FREEZE ? 0.4 : 0 };
        put(w, body(M(w), y, x, z, FACE_Z, pose));
      });
      break;
    }
    case "ate": {
      // Dawn. Nanay holds Ate at the gate; then Ate walks out to the jeepney, turns, waves, and is gone.
      const ate = M("ate"), hugEnd = 20.4, walkOut = route([[HUG[0], HUG[1] + 0.12], [GATE_X, FENCE_Z + 0.1], [0.12, ROAD_Z - 0.12]], 20.4, 21.6);
      if (t < hugEnd) put("ate", body(ate, y, HUG[0], HUG[1] + 0.12, FACE_NZ, { reach: smooth(18.6, 19.0, t), shut: 0.7, smile: -0.4, nod: -0.3, lean: 0.2 }));
      else if (t < 21.6) put("ate", walking(ate, y, walkOut(t), { smile: -0.3 }));
      else if (t < 22.25) put("ate", body(ate, y, 0.12, ROAD_Z - 0.12, FACE_NZ - 0.6, { arm: wave(t), smile: 0.4 }));
      put("nanay", body(M("nanay"), y, HUG[0], HUG[1], FACE_Z, t < hugEnd ? { reach: smooth(18.6, 19.0, t), shut: 0.8, smile: -0.6, lean: 0.25 } : { arm: wave(t) * smooth(21.0, 21.4, t), armL: 0.35, smile: -0.5, look: -0.3 }));
      const by: [Who, number, number][] = [["tatay", -1.0, 0.86], ["kuya", -0.95, 0.66], ["ditse", -0.6, 0.66], ["diko", -1.12, 0.78]];
      by.forEach(([w, x, z], i) => put(w, body(M(w), y, x, z, facing([x, z], [GATE_X, FENCE_Z + 0.4]), { arm: t > 20.6 ? wave(t, i) * 0.9 : 0, armL: w === "tatay" ? 0.2 : 0, smile: -0.1, look: 0.2 })));
      // Bunso, small, runs to the gate as the jeepney goes, and holds on to it.
      const b = M("bunso");
      if (t < 21.9) put("bunso", body(b, y, -0.62, 0.62, facing([-0.62, 0.62], HUG), { smile: -0.5 }));
      else put("bunso", walking(b, y, route([[-0.62, 0.62], [GATE_X + 0.04, FENCE_Z - 0.06]], 21.9, 22.7)(t), { run: true, reach: t > 22.7 ? 0.7 : 0, smile: -0.7, look: 0.4 }));
      break;
    }
    case "y2006": {
      // The first box: Kuya carries it out of the house and sets it on her chair. Bunso jumps.
      const kuya = M("kuya"), s3 = seatAt(3), s6 = seatAt(6);
      const carry = route([[DOOR[0], DOOR[1] - 0.1], [DOOR[0] + 0.05, 0.05], [s3.x - 0.17, s3.z]], 23.4, 25.0);
      if (t < 25.0) put("kuya", walking(kuya, y, carry(t), { reach: 1, look: 0.2 }));
      else if (t < 25.6) put("kuya", body(kuya, y, s3.x - 0.17, s3.z, FACE_X, { reach: 1 - smooth(25.3, 25.6, t), lean: 0.6 * (1 - smooth(25.3, 25.6, t)) }));
      else if (t < 26.9) put("kuya", walking(kuya, y, route([[s3.x - 0.17, s3.z], [TX - 0.1, TZ + 0.5], [s6.x + 0.12, s6.z + 0.06]], 25.6, 26.9)(t)));
      else put("kuya", seated(kuya, y, 6, eating(t, 3, 0.6)));
      const jump = smooth(25.4, 25.7, t) * (1 - smooth(26.6, 27.0, t));
      atTable(["tatay", "nanay", "ditse", "diko"], 0.7, { nanay: { look: t < 25.4 ? 0.7 : 0.2, smile: 0.6 } });
      put("bunso", jump > 0.02 ? rising(M("bunso"), y, 4, jump, { arm: jump, armL: jump, smile: 1, dy: 0.04 * jump * Math.abs(Math.sin(t * 9)) }) : seated(M("bunso"), y, 4, { look: -0.6, smile: 0.7 }));
      break;
    }
    case "y2009": {
      // A phone call from far away: Nanay holds it up; the others lean in and wave at the screen.
      const call = smooth(27.9, 28.4, t);
      put("nanay", seated(M("nanay"), y, 1, { reach: 0.75 * call, arm: 0.35 * call, smile: 0.9, nod: 0.2 * call }));
      put("tatay", seated(M("tatay"), y, 0, { lean: 0.5 * call, look: -0.8 * call, smile: 0.9, armL: call * wave(t, 1) * 0.6 }));
      put("ditse", seated(M("ditse"), y, 2, { lean: 0.4 * call, look: 0.9 * call, arm: call * wave(t, 2) * 0.8, smile: 1 }));
      put("diko", seated(M("diko"), y, 5, { look: -0.5 * call, armL: call * wave(t, 3) * 0.7, smile: 1, lean: 0.3 * call }));
      put("bunso", seated(M("bunso"), y, 4, { look: -0.9 * call, arm: call * wave(t, 4), armL: call * wave(t, 5), smile: 1, lean: 0.4 * call }));
      break;
    }
    case "y2013": {
      // Bunso, eighteen, on the old swing; the table is quiet without her.
      atTable(["tatay", "nanay", "diko"], 0.25, { nanay: { look: 0.6, smile: 0.2 } });
      const sw = swingSeat(id, t), b = M("bunso"), { age, scale } = ageOf(y - b.born);
      put("bunso", { at: [sw.at[0] - Math.cos(sw.turn) * 0.02 * scale, sw.at[1] - 0.135 * scale + 0.01, sw.at[2] - Math.sin(sw.turn) * 0.02 * scale], turn: sw.turn, scale, k: [0, age, 1, 0.9, 0.1, 0, -0.6, 0.9, 0, 0, -0.1] });
      break;
    }
    case "y2018": {
      // Three of them. Bunso goes round and holds Nanay; Tatay watches them.
      const b = M("bunso"), s4 = seatAt(4), n = seatAt(1);
      atTable(["tatay"], 0.3, { tatay: { look: -0.5, smile: 0.7 } });
      put("nanay", seated(M("nanay"), y, 1, { look: t > 36.8 ? 0.8 : 0.3, smile: t > 37 ? 0.9 : 0.3, shut: t > 37.2 ? 0.5 : 0, nod: t > 37 ? -0.2 : 0 }));
      if (t < 35.9) put("bunso", seated(b, y, 4, eating(t, 6, 0.4)));
      else if (t < 36.5) put("bunso", rising(b, y, 4, smooth(35.9, 36.5, t)));
      else {
        const w = route([[s4.x + 0.09, s4.z], [TX, TZ - 0.62], [n.x - 0.02, n.z - 0.15]], 36.5, 37.5)(t);
        put("bunso", t < 37.5 ? walking(b, y, w) : body(b, y, n.x - 0.02, n.z - 0.15, FACE_Z + 0.3, { reach: smooth(37.5, 37.9, t), lean: 0.35, shut: 0.6, smile: 0.7 }));
      }
      break;
    }
    case "bunso": {
      // Morning. The three walk to the gate; all three hold each other; she goes; the tricycle takes her.
      const b = M("bunso"), tt = M("tatay"), nn = M("nanay");
      const go = (dx: number, dz: number) => route([[DOOR[0] + dx, DOOR[1] + 0.05 + dz], [-0.55 + dx, 0.45 + dz], [HUG[0] + dx, HUG[1] + dz]], 39.1, 41.0);
      const hug = smooth(41.0, 41.4, t) * (1 - smooth(42.4, 42.7, t));
      if (t < 41) put("bunso", walking(b, y, go(0, 0.12)(t)));
      else if (t < 42.7) put("bunso", body(b, y, HUG[0], HUG[1] + 0.12, FACE_NZ, { reach: hug, shut: 0.8, smile: -0.4, lean: 0.2 }));
      else if (t < 43.4) put("bunso", walking(b, y, route([[HUG[0], HUG[1] + 0.12], [GATE_X, FENCE_Z + 0.1], [-0.5, ROAD_Z - 0.12]], 42.7, 43.4)(t)));
      const side = (w: Member, dx: number, look: number) => t < 41 ? walking(w, y, go(dx, -0.02)(t))
        : body(w, y, HUG[0] + dx, HUG[1] - 0.02, FACE_Z - dx * 2.2, t < 42.7 ? { reach: hug, shut: 0.7, smile: -0.5, lean: 0.25 } : { arm: wave(t, dx * 9) * smooth(42.8, 43.2, t) * (w.who === "nanay" ? 1 : 0.6), armL: w.who === "tatay" ? 0.3 : 0, look, smile: -0.4 });
      put("tatay", side(tt, 0.09, -0.3));
      put("nanay", side(nn, -0.09, 0.3));
      break;
    }
  }
  return out;
}

/** The swing under the mango: where its seat is and which way the rider faces. */
export const swingAngle = (id: SegId, t: number) => (id === "y2013" ? 0.32 * Math.sin((t - 31) * 2.1) : 0.05 * Math.sin(t * 1.2));
export const mangoScale = (year: number) => 0.82 + 0.3 * clamp01((year - 1998) / 28);
export function swingSeat(id: SegId, t: number) {
  const s = mangoScale(seg(id).year), a = swingAngle(id, t), base = at(MANGO[0], MANGO[1], -0.02), c = Math.cos(0.3), n = Math.sin(0.3);
  const q: V3 = [-0.28, 0.72 - 0.57 * Math.cos(a), 0.12 - 0.57 * Math.sin(a)];
  return { at: [base[0] + (q[0] * c - q[2] * n) * s, base[1] + q[1] * s, base[2] + (q[0] * n + q[2] * c) * s] as V3, turn: Math.PI / 2 + 0.3 };
}

/** Nanay round the table in 2026, setting a plate at each place. */
const PLATE_ROUTE: [number, number][] = [[TX - 0.36, TZ - 0.5], [TX - 0.36, TZ + 0.25], [TX - 0.1, TZ + 0.46], [TX + 0.36, TZ + 0.25], [TX + 0.36, TZ - 0.5], [seatAt(1).x - 0.1, seatAt(1).z - 0.1]];
const NANAY_PLATES = route(PLATE_ROUTE, 49.3, 52.9, false);
/** When each seat's plate is set (indexed by seat): as she passes nearest it. */
export const PLATE_SET: number[] = Array.from({ length: 7 }, (_, i) => {
  const [px, pz] = placeAt(i);
  let best = 49.3, bd = 1e9;
  for (let tt = 49.3; tt <= 52.4; tt += 0.02) {
    const w = NANAY_PLATES(tt), d = Math.hypot(w.x - px, w.z - pz);
    if (d < bd) [bd, best] = [d, tt];
  }
  return best;
});

/** What is on the table in a segment. */
export function tableAt(id: SegId, t: number) {
  const y = seg(id).year;
  if (id === "ate" || id === "bunso") return null;
  const final = y === 2026, plating = id === "y2026" && t < 53;
  const plates = FAMILY.map((m) => {
    if (final) return plating ? t > PLATE_SET[m.seat] : true;
    if (id === "y1998") return t > 9.6;
    return id === "y2003" ? true : home(m, y);
  });
  const boxes = FAMILY.map((m) => !final && id !== "y1998" && id !== "y2003" && !home(m, y) && !(id === "y2006" && m.who === "ate" && t < 25.4));
  const set = !(id === "y1998" && t < 9.6);
  const dishes = { lechon: id === "y1998" && t > 9.4, queso: set, pancit: y <= 2013 && !final && set, rice: set && !(id === "y2026" && t < 53) };
  return { plates, boxes, dishes };
}
/** The box Kuya carries in 2006, the lechon Nanay carries in 1998, the phone in 2009: held at a person's chest. */
export function carried(id: SegId, t: number): { what: "box" | "lechon" | "phone"; by: Body }[] {
  const c = cast(id, t), by = (w: Who) => c.find((o) => o.m.who === w)?.b;
  const out: { what: "box" | "lechon" | "phone"; by: Body }[] = [];
  if (id === "y1998" && t < 9.4 && by("nanay")) out.push({ what: "lechon", by: by("nanay")! });
  if (id === "y2006" && t < 25.4 && by("kuya")) out.push({ what: "box", by: by("kuya")! });
  if (id === "y2009" && t > 27.9 && by("nanay")) out.push({ what: "phone", by: by("nanay")! });
  return out;
}

// ── Gate, parol, sign, lights ──────────────────────────────────────────────────────────────────────────────────
export function gateOpen(id: SegId, t: number) {
  if (id === "ate") return 1.3 * smooth(20.2, 20.7, t);
  if (id === "bunso") return 1.3 * smooth(42.5, 43.0, t);
  if (id === "y2026" || id === "hook") return 1.3;
  return 0;
}
export function parolOn(id: SegId, t: number) {
  if (id === "y1998") return smooth(8.0, 8.3, t);
  if (id === "y2026") return smooth(48.9, 49.2, t);
  if (id === "ate" || id === "bunso") return 0;
  return 1;
}
/** How many of the title's letters are lit (−1: the sign isn't up). Up only in 2026. */
export function signLit(id: SegId, t: number) {
  if (id === "hook") return clamp01((t - 0.6) / 2.6) * 11;
  if (id === "y2026") return t < 55.6 ? -1 : clamp01((t - 55.7) / 1.6) * 11;
  return -1;
}
/** The bulbs flare as the camera falls into them, carrying the picture into 1998. */
export const signFlare = (t: number) => smooth(3.6, 4.6, t) * (1 - smooth(4.8, 5.6, t));
export const bulbOn = (id: SegId, t: number) => (id === "ate" || id === "bunso" ? 0 : id === "y1998" ? smooth(8.4, 8.6, t) : id === "y2026" ? smooth(50.0, 50.3, t) : 1);
export const stringLights = (id: SegId, t: number) => (id === "ate" || id === "bunso" ? 0 : id === "y1998" ? smooth(8.6, 8.9, t) : id === "y2026" ? smooth(49.3, 49.6, t) : 1);
/** How old the place looks, 0 (1998) … 1 (2026). */
export const weathered = (year: number) => clamp01((year - 1998) / 28);

// ── Sky, per segment ───────────────────────────────────────────────────────────────────────────────────────────
const NIGHT_X: Sky = { top: [0.09, 0.12, 0.33], bottom: [0.26, 0.22, 0.46], key: [0.85, 0.85, 1.1], keyFrom: [-0.45, 0.8, 0.55], fill: [0.33, 0.33, 0.52], rim: [0.12, 0.12, 0.3], stars: 1 };
const BLUE_X: Sky = { top: [0.12, 0.18, 0.46], bottom: [0.52, 0.38, 0.6], key: [1.05, 0.92, 1.05], keyFrom: [0.6, 0.45, 0.5], fill: [0.36, 0.36, 0.56], rim: [0.2, 0.12, 0.2], stars: 0.5 };
const DUSK_X: Sky = { top: [0.3, 0.3, 0.6], bottom: [1, 0.62, 0.45], key: [1.9, 1.25, 0.9], keyFrom: [0.75, 0.32, 0.5], fill: [0.45, 0.4, 0.58], rim: [0.4, 0.2, 0.15], stars: 0 };
const DAWN_X: Sky = { top: [0.45, 0.56, 0.82], bottom: [1, 0.8, 0.66], key: [1.9, 1.5, 1.25], keyFrom: [-0.8, 0.42, 0.5], fill: [0.5, 0.52, 0.68], rim: [0.3, 0.2, 0.2], stars: 0 };
const MORNING_X: Sky = { top: [0.4, 0.62, 0.9], bottom: [0.92, 0.9, 0.85], key: [2.3, 2.05, 1.7], keyFrom: [-0.5, 0.85, 0.6], fill: [0.52, 0.6, 0.75], rim: [0.2, 0.2, 0.15], stars: 0 };
type SkyKey = [number, Sky, number];
const SKIES: Record<SegId, SkyKey[]> = {
  hook: [[0, NIGHT_X, 1]],
  y1998: [[0, DUSK_X, 0.25], [6.5, DUSK_X, 0.3], [8.3, BLUE_X, 0.7], [9.8, NIGHT_X, 1]],
  y2003: [[0, NIGHT_X, 1]],
  ate: [[0, DAWN_X, 0.3]],
  y2006: [[0, BLUE_X, 0.85]],
  y2009: [[0, NIGHT_X, 1]],
  y2013: [[0, BLUE_X, 0.85]],
  y2018: [[0, NIGHT_X, 1]],
  bunso: [[0, MORNING_X, 0]],
  y2026: [[44, DUSK_X, 0.3], [47, mixSky(DUSK_X, BLUE_X, 0.6), 0.5], [49.5, BLUE_X, 0.75], [52.5, NIGHT_X, 1]],
};
export function skyAt(id: SegId, t: number): { sky: Sky; dark: number } {
  const keys = SKIES[id], i = Math.max(0, keys.findLastIndex(([a]) => a <= t));
  const [a, A, da] = keys[i], [b, B, db] = keys[Math.min(i + 1, keys.length - 1)];
  const k = b > a ? smooth(a, b, t) : 0;
  return { sky: mixSky(A, B, k), dark: da + (db - da) * k };
}
