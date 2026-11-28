// The reconstruction's shots: each is a pose at local time t (s) in a shot `len` long. Shared by every part and the boards.
import { HALL } from "../plan";
import { camAt } from "./Recon";
import type { Pose } from "./scene";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (k: number) => { const c = clamp(k); return c * c * (3 - 2 * c); };
const Z = HALL.z1; // the inner door

export const R = {
  /** Timog at night: the front, the main doors a little open. */
  street: (t: number, len: number): Pose => ({ mode: "street", t, open: { street: 0.5 }, cam: camAt([{ at: 0, pos: [6.5, 1.6, -17], look: [4, 3.6, 0], fov: 36 }, { at: len, pos: [4.6, 1.7, -10.5], look: [3.6, 3.1, 0], fov: 36 }], t) }),
  /** The whole building as a white model, walls cut low, the crowd inside. */
  model: (t: number, len: number): Pose => ({ mode: "study", t, cut: 2.4, people: 390, cam: camAt([{ at: 0, pos: [15.5, 13.5, -1.5], look: [4, 0, 10.5], fov: 36 }, { at: len, pos: [14, 12, 0], look: [4, 0, 11], fov: 36 }], t) }),
  /** From just inside the inner door, a little above the heads, across the floor to the booth. */
  party: (t: number, len: number, fire = 0, smoke?: number): Pose => ({ mode: "party", t, people: 390, fire, smoke, clear: 1.5, cam: camAt([{ at: 0, pos: [5.4, 2.3, Z + 1.0], look: [3.8, 1.2, 17.2], fov: 50 }, { at: len, pos: [5.2, 2.35, Z + 1.8], look: [3.9, 1.3, 17.4], fov: 50 }], t) }),
  /** The study of the doors: all three swing into the room people were leaving, and the crowd stands in the swing. */
  arc: (t: number, len: number): Pose => ({ mode: "study", t, cut: 2.4, people: 390, flow: 1, red: ["street", "club", "fire"], open: { club: 0, street: 0, fire: 0 }, cam: camAt([{ at: 0, pos: [8.5, 10, Z + 8.5], look: [3.3, 0, Z + 0.6], fov: 38 }, { at: len, pos: [6.4, 7.2, Z + 5.4], look: [3.3, 0, Z + 0.4], fov: 38 }], t) }),
  /** The jam from above and behind, lit by the fire at their backs, the door shut in front of them. */
  jam: (t: number, len: number): Pose => ({ mode: "dark", t, people: 390, flow: 1, smoke: 2.7, fire: 1, open: { club: 0, street: 0 }, clear: 0.8, cam: camAt([{ at: 0, pos: [6.4, 2.5, Z + 6.4], look: [3.2, 0.9, Z + 0.2], fov: 44 }, { at: len, pos: [5.9, 2.45, Z + 5.4], look: [3.2, 0.9, Z + 0.2], fov: 44 }], t) }),
  /** Closer, through the smoke, to the door with its swing under their feet. */
  crowd: (t: number, len: number): Pose => ({ mode: "dark", t, people: 390, flow: 1, smoke: 2.4, fire: 1, open: { club: 0 }, red: ["club"], clear: 0.9, cam: camAt([{ at: 0, pos: [5.0, 2.3, Z + 4.2], look: [3.2, 0.6, Z + 0.3], fov: 42 }, { at: len, pos: [4.5, 2.2, Z + 3.1], look: [3.2, 0.6, Z + 0.2], fov: 42 }], t) }),
  /** The handle at the height of a hand, seen from the side away from the hinge, so the leaf swings out of the way as the
   *  door comes open (`pull` 0 … 1) and the corridor's cold light falls in. */
  handle: (t: number, len: number, pull: number): Pose => ({ mode: "dark", t, people: 160, flow: 1, smoke: 2.2, fire: 1, open: { club: 0.9 * ease(pull) }, clear: 1.7, cam: camAt([{ at: 0, pos: [4.5, 1.4, Z + 1.9], look: [3.1, 1.0, Z - 0.6], fov: 42 }, { at: len, pos: [4.3, 1.35, Z + 1.5], look: [3.1, 1.0, Z - 0.6], fov: 42 }], t) }),
  /** The floor from the back mezzanine, high, looking down over the heads toward the bar and the inner door. */
  mezz: (t: number, len: number): Pose => ({ mode: "party", t, people: 330, clear: 1.2, cam: camAt([{ at: 0, pos: [4.6, 4.7, 16.9], look: [4.0, 0.4, 10.4], fov: 50 }, { at: len, pos: [4.2, 4.6, 16.5], look: [3.9, 0.4, 10.0], fov: 50 }], t) }),
  /** The reverse: from beside the DJ booth back across the packed floor to the inner door, the only way out. */
  reverse: (t: number, len: number): Pose => ({ mode: "party", t, people: 390, clear: 1.3, cam: camAt([{ at: 0, pos: [5.6, 2.25, 16.0], look: [3.2, 1.3, 7.4], fov: 46 }, { at: len, pos: [5.4, 2.3, 15.4], look: [3.2, 1.3, 7.2], fov: 46 }], t) }),
  /** The inner door alone, close, swinging into the room (`open` 0 … 1), its arc on the floor. */
  door: (t: number, len: number, open: number): Pose => ({ mode: "study", t, cut: 2.4, people: 0, red: ["club"], open: { club: 0.95 * ease(open), street: 0 }, cam: camAt([{ at: 0, pos: [6.8, 3.9, Z + 4.8], look: [3.2, 0.4, Z + 0.4], fov: 40 }, { at: len, pos: [6.3, 3.6, Z + 4.1], look: [3.2, 0.4, Z + 0.4], fov: 40 }], t) }),
  /** The main doors from the pavement, close and shut. */
  shut: (t: number, len: number): Pose => ({ mode: "street", t, open: { street: 0 }, cam: camAt([{ at: 0, pos: [4.6, 1.5, -3.6], look: [3.3, 1.5, 0], fov: 40 }, { at: len, pos: [4.3, 1.5, -2.9], look: [3.3, 1.5, 0], fov: 40 }], t) }),
  /** Down the corridor from the street side as the doors open: the fire's light at the far end. */
  rush: (t: number, len: number): Pose => ({ mode: "dark", t, people: 120, flow: 1, smoke: 2.0, fire: 1, open: { club: 1, street: 1 }, clear: 0.6, cam: camAt([{ at: 0, pos: [3.3, 1.5, 0.5], look: [3.3, 1.3, 9], fov: 52 }, { at: len, pos: [3.3, 1.45, 1.3], look: [3.3, 1.3, 9], fov: 52 }], t) }),
  /** The empty room toward the DJ booth, the first of the fire lighting the foam and the cartons overhead. */
  materials: (t: number, len: number): Pose => ({ mode: "fire", t, people: 0, fire: 0.35, cam: camAt([{ at: 0, pos: [5.8, 1.6, 10.4], look: [3.9, 4.3, 17.3], fov: 54 }, { at: len, pos: [5.5, 1.7, 11.4], look: [3.9, 4.4, 17.4], fov: 54 }], t) }),
};
