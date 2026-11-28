// The Birdland sign's bulbs (chapter 1): where each sits around the sign and when it dies on "the jazz stopped". Shared by
// the picture (Boards.tsx, MarqueeBoard) and the sound (parts/01-birdland/music.ts clicks each bulb out), so they agree.

/** The sign's face in frame pixels. */
export const SIGN = { x0: 300, y0: 150, x1: 1620, y1: 720 };
const STEP = 44;

/** Bulb centres, clockwise from the top-left corner. */
export const BULBS: [number, number][] = (() => {
  const out: [number, number][] = [], { x0, y0, x1, y1 } = SIGN;
  const run = (ax: number, ay: number, bx: number, by: number) => {
    const n = Math.round(Math.hypot(bx - ax, by - ay) / STEP);
    for (let i = 0; i < n; i++) out.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]);
  };
  run(x0, y0, x1, y0);
  run(x1, y0, x1, y1);
  run(x1, y1, x0, y1);
  run(x0, y1, x0, y0);
  return out;
})();

/** 0 … 1: when bulb i goes out, as a share of the lights-out. A ragged chase from the bottom corners up, the way an old
 *  sign dies a circuit at a time, with a little scatter so it doesn't look mechanical. */
export function offAt(i: number) {
  const [x, y] = BULBS[i], { x0, y0, x1, y1 } = SIGN;
  const up = 1 - (y - y0) / (y1 - y0), mid = 1 - Math.abs(x - (x0 + x1) / 2) / ((x1 - x0) / 2);
  const scatter = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  return Math.min(0.92, 0.62 * (0.55 * up + 0.45 * mid) + 0.3 * scatter);
}

/** Lights-out runs from the start of "the jazz stopped" over the line and a little of the quiet after it. */
export const lightsOut = (at: number, spoken: number) => ({ from: at + 0.25, len: spoken + 0.9 });
