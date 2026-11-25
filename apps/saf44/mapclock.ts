// The old five-minute clock, kept for one reason: the map and the shots reused from the first cut still run on it. The film
// itself runs on timeline.ts, and film.ts says which stretch of this clock each of those shots plays.

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

/** Hours since midnight on January 25, at film time t. Only ever runs forward. */
export const hourAt = (t: number) =>
  track([[40, -1.83], [55, 2.5], [65, 4], [85, 4.5], [89, 5.3], [120, 7], [152, 11], [186, 13.5], [212, 17.5], [219, 18.3], [226, 18.6], [234, 23.5], [247, 24 + 8], [256, 24 + 14]], t);

// ── The story's own events, in film time. ─────────────────────────────────────────────────────────────

/** The explosive outside the hut. */
export const IED = 73.6;
/** The three white phosphorus rounds. */
export const WP_ROUNDS = [213.2, 216.2, 219.2];
/** The last shot of the day: the score and the picture go quiet here. */
export const LAST_SHOT = 220;
/** The field's overhead shot, while the markers appear. */
export const FIELD_MARKERS = { from: 157, to: 181 };
/** The 55th's tag goes dark. */
export const CONTACT_LOST = 181.5;
export const RIVER_MARKERS = { from: 188, to: 198 };

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** `n` moments between a and b, unevenly spaced but in order. The real times are not known, so these are illustrative. */
function uneven(n: number, a: number, b: number, seed: number) {
  const r = seeded(seed);
  const gaps = Array.from({ length: n }, () => 0.45 + r() * r() * 2.2);
  const total = gaps.reduce((s, g) => s + g, 0);
  let at = 0;
  return gaps.map((g) => {
    at += g;
    return a + ((at - gaps[0]) / (total - gaps[0])) * (b - a);
  });
}

// ── The fire: when each round goes off. The picture's flashes and the sound's shots both read these lists. ─

export type Round = { t: number; k: number };

/**
 * Rounds between two times, in bursts with uneven gaps. `rate` is roughly bursts a second, `cycle` the seconds between
 * rounds in a burst. How much was fired is not on the record: this is what it sounded like, not a count.
 */
export function rounds(from: number, to: number, rate: number, cycle: number, seed: number): Round[] {
  const r = seeded(seed);
  const out: Round[] = [];
  let t = from, k = 0;
  while (t < to) {
    const n = 1 + Math.floor(r() * r() * 7);
    for (let i = 0; i < n && t < to; i++) {
      out.push({ t, k: k++ });
      t += cycle * (0.9 + r() * 0.2);
    }
    t += (0.1 + r() * r() * 1.5) / rate;
  }
  return out;
}

export const MARSH_FIRE = rounds(145, 153, 2.2, 0.105, 82);

/** The rounds that go off in the frame starting at t (a 30th of a second long). */
export const firingNow = (list: Round[], t: number) => list.filter((r) => r.t >= t && r.t < t + 1 / 30);
/** The rounds fired in the last `age` seconds, for what they leave in the air. */
export const firedWithin = (list: Round[], t: number, age: number) => list.filter((r) => r.t <= t && r.t > t - age);

/** One moment for each of the 35 in the field, and for each of the 9 by the river. */
export const FIELD_FALLS = uneven(35, FIELD_MARKERS.from + 0.5, FIELD_MARKERS.to, 41);
export const RIVER_FALLS = uneven(9, RIVER_MARKERS.from, RIVER_MARKERS.to, 42);
