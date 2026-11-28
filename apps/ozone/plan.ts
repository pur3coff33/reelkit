// The club's layout, shared by the 3D reconstruction (recon/scene.ts) and the drawn plan (Boards.tsx), so the two always
// agree. Metres: x across the front (0 at the left wall, looking in from Timog), z from the facade (0) to the back wall,
// y up.
//
// What each part rests on (the plan is labelled "illustrative · not to scale" wherever it's shown):
//   main doors, swinging in      FlipScience 2021 ("the building's main inswing doors"); Inquirer 2014 (feng shui);
//                                 trial court 2001 via Wikipedia ("a small door that swung inward")
//   then a corridor               AP 19 Mar 1996 ("piled waist-deep near the only exit, a narrow front corridor");
//                                 Sherilyn Bruan, Esquire 2017 ("the long hallway"; "everyone in the hallway was hit")
//   then another door             FlipScience ("through the building's main doors, then through another door"); Bruan
//                                 (a door, the long hallway, another door). Jhunie Mallari (GMA 2026) and Nelson Tomenio
//                                 (Inquirer 2014) both remember "three doors": noted in post.md, two drawn
//   a reception desk by the way   Tomenio and Loyola (Inquirer 2014) were "briefly trapped near the reception desk"
//   out
//   DJ booth at the dance floor,  FlipScience ("in front of the dance floor, next to a storage room"; acoustic foam
//   storage beside, foam          around it)
//   egg cartons on the ceiling    FlipScience ("decorative egg cartons", which acted as accelerants)
//   semi-circular bar at a side,  FlipScience; Bruan ("a semi-circular bar off to one side", facing the dance floor)
//   tables and chairs
//   mezzanine about halfway up    FlipScience ("an elevated platform about halfway between the ceiling and the floor");
//                                 Wikipedia (mezzanines added in the refit)
//   one fire exit, small, beside  FlipScience ("next to a VIP room, which led to the kitchen of an adjoining restaurant");
//   the VIP room, into the        Urban Roamer 2014 ("a small one at that", "swung inward"); AP: the original fire exit
//   neighbour's kitchen           was blocked by a new building next door
//   narrow two-storey front       the 2008 photo (Commons, public domain)
// Not in any source: sizes and positions. The rooms either side of the corridor are unknown and drawn as such.

export type Rect = { x0: number; x1: number; z0: number; z1: number };
/** A door leaf in a gap: across z (`along: "x"`) or across x (`along: "z"`), hinged at one end, swinging into +z (or +x),
 *  which for every door here is into the room people were trying to leave. A double door is two leaves in one `group`. */
export type Door = { id: string; group?: string; along: "x" | "z"; at: number; from: number; to: number; hinge: "from" | "to"; label: string };
export type Wall = { along: "x" | "z"; at: number; from: number; to: number; height?: number };

export const W = 8;
export const D = 20;
export const STOREY = 5.4;
/** "About halfway between the ceiling and the floor." */
export const MEZZ_Y = STOREY / 2;
/** The corridor, from the main doors to the inner door. */
export const HALL = { x0: 2.3, x1: 4.3, z1: 7 };

export const DOORS: Door[] = [
  { id: "street-l", group: "street", along: "x", at: 0, from: 2.5, to: 3.3, hinge: "from", label: "Main doors" },
  { id: "street-r", group: "street", along: "x", at: 0, from: 3.3, to: 4.1, hinge: "to", label: "" },
  { id: "club", along: "x", at: HALL.z1, from: 2.7, to: 3.9, hinge: "from", label: "Inner door" },
  { id: "fire", along: "z", at: 0, from: 15.4, to: 16.2, hinge: "from", label: "Fire exit" },
];
export const doorGroup = (d: Door) => d.group ?? d.id;

/** Walls, with gaps where the doors are. Heights default to the storey. */
export const WALLS: Wall[] = [
  // outside
  { along: "z", at: 0, from: 0, to: 15.4 }, { along: "z", at: 0, from: 16.2, to: D },
  { along: "z", at: W, from: 0, to: D },
  { along: "x", at: D, from: 0, to: W },
  { along: "x", at: 0, from: 0, to: 2.5 }, { along: "x", at: 0, from: 4.1, to: W },
  // the corridor, and the wall the inner door is in
  { along: "z", at: HALL.x0, from: 0, to: HALL.z1 }, { along: "z", at: HALL.x1, from: 0, to: HALL.z1 },
  { along: "x", at: HALL.z1, from: 0, to: 2.7 }, { along: "x", at: HALL.z1, from: 3.9, to: W },
  // VIP room (back left, under the mezzanine) and storage (back right, beside the booth)
  { along: "x", at: 16.4, from: 0, to: 1.7, height: MEZZ_Y }, { along: "z", at: 2.6, from: 16.4, to: D, height: MEZZ_Y },
  { along: "z", at: 5.4, from: 16.4, to: D, height: MEZZ_Y }, { along: "x", at: 16.4, from: 6.2, to: W, height: MEZZ_Y },
];

export const ROOMS: { name: string; r: Rect }[] = [
  { name: "Corridor", r: { x0: HALL.x0, x1: HALL.x1, z0: 0, z1: HALL.z1 } },
  { name: "VIP", r: { x0: 0, x1: 2.6, z0: 16.4, z1: D } },
  { name: "Storage", r: { x0: 5.4, x1: W, z0: 16.4, z1: D } },
];
/** Parts of the building no source describes. */
export const UNKNOWN: Rect[] = [{ x0: 0, x1: HALL.x0, z0: 0, z1: HALL.z1 }, { x0: HALL.x1, x1: W, z0: 0, z1: HALL.z1 }];

export const DANCE: Rect = { x0: 2.4, x1: 6.0, z0: 11.0, z1: 15.6 };
export const BOOTH: Rect = { x0: 2.8, x1: 5.2, z0: 16.6, z1: 17.9 };
/** The semi-circular bar against the right wall. */
export const BAR = { cx: W, cz: 10.2, r: 1.7, w: 0.5 };
/** The reception desk, in the corridor just inside the main doors. */
export const DESK: Rect = { x0: 3.7, x1: 4.25, z0: 1.0, z1: 2.6 };
/** Round tables down the left wall, under the mezzanine. */
export const TABLES: [number, number][] = [[0.9, 8.3], [0.9, 9.8], [0.9, 11.3], [0.9, 12.8], [0.9, 14.3]];
/** Mezzanine decks: across the back, and down the left wall. */
export const MEZZ: Rect[] = [{ x0: 0, x1: W, z0: 16.4, z1: D }, { x0: 0, x1: 1.8, z0: HALL.z1, z1: 16.4 }];
export const STAIRS: Rect = { x0: 6.6, x1: W, z0: 12.6, z1: 16.4 };
/** Egg cartons on the ceiling over the dance floor and under the deck above the booth. */
export const CARTONS: { r: Rect; y: number }[] = [{ r: { x0: 2.0, x1: 6.4, z0: 10.4, z1: 16.2 }, y: STOREY }, { r: { x0: 2.6, x1: 5.4, z0: 16.5, z1: 18.6 }, y: MEZZ_Y }];

/** The legal limit and the crowd that night (AP, quoting the city's safety engineer: 350 customers and 40 staff). */
export const APPROVED = 35;
export const INSIDE = 390;
/** Where the crush formed: the inner door. */
export const JAM: [number, number] = [3.3, HALL.z1 + 0.3];

/** Floor taken by furniture and rooms. */
export function blocked(x: number, z: number) {
  return (
    (x > BOOTH.x0 - 0.2 && x < BOOTH.x1 + 0.2 && z > BOOTH.z0 - 0.3 && z < BOOTH.z1 + 0.3) ||
    Math.hypot(x - BAR.cx, z - BAR.cz) < BAR.r + 0.3 ||
    (x > STAIRS.x0 - 0.1 && z > STAIRS.z0 && z < STAIRS.z1) ||
    (x < 2.7 && z > 16.3) || (x > 5.3 && z > 16.3) ||
    TABLES.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 0.6)
  );
}

/** Where the crowd stood: seeded, so every render of a state is the same crowd. `flow` 0 … 1 packs them against the
 *  inner door. */
export function crowd(n: number, seed: number, flow = 0): [number, number][] {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: [number, number][] = [];
  while (out.length < n) {
    const x = 0.3 + r() * (W - 0.6), z = HALL.z1 + 0.4 + r() * (D - HALL.z1 - 0.8);
    if (!blocked(x, z)) out.push([x, z]);
  }
  if (!flow) return out;
  // The jam: everyone packed into a half-disc against the inner door, densest at the opening, whoever was nearest nearest.
  // Slots are laid on a sunflower spiral (even spacing), then each person eases from where they stood to their slot.
  const slots: [number, number][] = [];
  for (let j = 0; slots.length < n && j < 20 * n; j++) {
    const density = 7.5 - 3.5 * Math.min(1, j / n); // people per m²: a crush at the door, thinning behind
    const rad = Math.sqrt((2 * (j + 0.5)) / (Math.PI * density));
    const a = ((j * 2.39996) % (2 * Math.PI)) % Math.PI;
    const x = JAM[0] + rad * Math.cos(a), z = JAM[1] + rad * Math.sin(a);
    if (x < 0.3 || x > W - 0.3 || z < HALL.z1 + 0.25 || z > D - 0.4 || blocked(x, z)) continue;
    slots.push([x, z]);
  }
  const rank = out.map((p, i) => [i, Math.hypot(p[0] - JAM[0], p[1] - JAM[1])] as const).sort((a, b) => a[1] - b[1]);
  const k = flow * flow * (3 - 2 * flow);
  const moved = out.slice();
  rank.forEach(([i], slot) => {
    const [sx, sz] = slots[Math.min(slot, slots.length - 1)], [x, z] = out[i];
    moved[i] = [x + (sx - x) * k + (r() - 0.5) * 0.1, z + (sz - z) * k + (r() - 0.5) * 0.1];
  });
  return moved;
}
