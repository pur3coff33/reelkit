// When rounds go off in the new scenes, in seconds into each scene. The picture's flashes and recoil, and the sound's shots,
// all read these same lists. How much was fired is not on the record: this is what it sounded like, not a count.
import { rounds, type Round } from "./mapclock";

/** First Shots: nothing at all until here. */
export const FIRST_SHOT = 5;
export const FIRST_SHOTS = {
  they: [{ t: FIRST_SHOT, k: 0 }, ...rounds(FIRST_SHOT + 0.5, 12, 2.2, 0.105, 202).map((r) => ({ t: r.t, k: r.k + 1 }))],
  we: rounds(FIRST_SHOT + 0.95, 12, 1.2, 0.085, 201),
  mortars: [FIRST_SHOT + 3.9, FIRST_SHOT + 5.8],
};

/** Fifteen Minutes: the explosive is the first frame. */
export const FIFTEEN = {
  lightOut: 0.5,
  we: rounds(0.2, 11.4, 1.7, 0.085, 203),
  they: rounds(0.5, 10.6, 1, 0.1, 204),
};

/** Awake: from every side, a long way off. */
export const ALL_ROUND: Round[] = rounds(0.6, 12, 2, 0.105, 205);

/** The Call: the corn at 7:00. Both sides settled into it. */
export const CALL = { we: rounds(0.2, 9, 0.9, 0.085, 206), they: rounds(0.2, 9, 1.7, 0.105, 207), mortars: [3.6, 7.6] };

/** One Hour: firing, then a message, then an hour of nothing, and it all comes back. */
export const CEASE = 3.4, RESUME = 12.6;
export const ONE_HOUR = {
  we: [...rounds(0, CEASE, 1.1, 0.085, 208), ...rounds(RESUME + 0.5, 16, 1.4, 0.085, 209)],
  they: [...rounds(0, CEASE - 0.2, 2, 0.105, 210), { t: RESUME, k: 900 }, ...rounds(RESUME + 0.1, 16, 3.2, 0.105, 211).map((r) => ({ t: r.t, k: r.k + 901 }))],
  mortars: [1.2, RESUME + 0.3, RESUME + 2],
};

/** Running Out: only one of the men still firing, and not often. */
export const RUNNING_OUT = { we: rounds(0.8, 6, 0.26, 0.11, 212), they: rounds(0, 6, 1.5, 0.105, 213), mortars: [2.4] };

/** Eleven Hours: two armed men walk rounds across the water. None come near him. */
export type Strike = { u: number; x: number; z: number; k: number };

function burst(from: number, to: number, x0: number, x1: number, z: number, n: number, start: number): Strike[] {
  return Array.from({ length: n }, (_, i) => {
    const f = i / (n - 1);
    const wobble = Math.sin(i * 12.9898 + from) * 0.5;
    return { u: from + (to - from) * f, x: x0 + (x1 - x0) * f + wobble, z: z + Math.sin(i * 4.1 + from) * 0.2, k: start + i };
  });
}
export const STRAFE: Strike[] = [...burst(9.2, 10.3, 9.4, 13.2, -39.4, 11, 0), ...burst(11, 12.2, 13.4, 9.4, -39.4, 12, 11)];
/** When he goes under, once the first rounds have shown him what's coming, and when he comes back up. */
export const UNDER = { from: 10.2, to: 12.9 };
