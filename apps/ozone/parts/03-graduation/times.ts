// Part 03-graduation: when things happen, shared by the picture and the sound. Sherilyn Bruan's walk in is drawn on the
// plan; the club's track is heard through the walls until her dot passes the inner door, then in the room.
import type { Layout } from "../../parts";
import { HALL } from "../../plan";

/** Her way in (plan metres, [x, z]): the pavement, the main doors, the corridor past the desk, the inner door, the bar. */
export const BRUAN_PATH: [number, number][] = [[3.0, -1.4], [3.0, 0.2], [3.0, HALL.z1 - 0.2], [3.4, HALL.z1 + 1.0], [4.8, 9.0], [5.6, 10.0]];

export function events(L: Layout) {
  const l = L.lines, S = L.spoken;
  const walk = { from: l.g5 + 0.2, len: S.g5 * 0.62 };
  // The share of the path's length at the inner door (z = HALL.z1), so the sound opens up as the dot passes it.
  const seg = BRUAN_PATH.slice(1).map((p, i) => Math.hypot(p[0] - BRUAN_PATH[i][0], p[1] - BRUAN_PATH[i][1]));
  const total = seg.reduce((a, b) => a + b, 0), atDoor = (seg[0] + seg[1] + 0.2) / total;
  return {
    walk,
    inside: walk.from + walk.len * atDoor,
    lost: l.g8 + 0.4,
    count: { from: l.g9 + 0.3, len: l.g10 + S.g10 - l.g9 },
  };
}
