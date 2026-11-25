// The picture: one crowd of 80,000 points that becomes each scene's shape in turn, flowing from one into the next so the
// shapes merge across every cut, over a haze in the act's colours and, out in space, the stars.
import { TAU, clamp01, keyed, smooth, type RGB } from "../../src/kit/looks/core";
import { flowStep } from "../../src/kit/looks/dots/blast";
import { living } from "../../src/kit/looks/dots/forms";
import { dotsLook, type DotCamera, type DotScene } from "../../src/kit/looks/dots/scene";
import type { Trip } from "../../src/kit/looks/dots/trip";
import { SHAPES } from "./shapes";
import { PALETTE, paint } from "./shapes/make";
import { CUTS, SCENES, SECONDS, SPAN, type Act, type SceneDef, type SceneName } from "./timeline";

const shapeOf = (s: SceneDef) => (SHAPES[s.name] ?? SHAPES.foam!)(SPAN(s.name));

/** The faint light points give off as they drift between shapes, per act. */
const GLINT: Record<Act, RGB> = {
  subatomic: [0.02, 0.008, 0.03],
  molecules: [0.006, 0.02, 0.02],
  cells: [0.025, 0.012, 0.012],
  earth: [0.02, 0.012, 0.004],
  stars: [0.03, 0.015, 0.004],
  cosmic: [0.01, 0.01, 0.03],
};

const steps = SCENES.slice(1).map((s, i) => flowStep(shapeOf(s), CUTS[i], GLINT[s.act]));

/** The act playing at t. */
export const actAt = (t: number): Act => (SCENES.findLast((s) => SPAN(s.name).from <= t) ?? SCENES[0]).act;

/** A wave that comes round exactly `n` times in the film, so it's where it began when the film loops. */
const loop = (t: number, n: number) => (TAU * n * t) / SECONDS;
/** 0 until the last 3 s, then 1: everything easing back to how the film opens. */
const home = (t: number) => smooth(SECONDS - 3, SECONDS, t);

// ── Camera ─────────────────────────────────────────────────────────────────────────────────────────────

type Shot = { dist?: [number, number]; height?: [number, number]; yaw?: [number, number]; pitch?: [number, number] };
/** Where the camera starts and ends each scene. Unlisted: 8 away, level, a slow quarter-turn. */
const SHOT: Partial<Record<SceneName, Shot>> = {
  hook: { dist: [9.4, 6.2], yaw: [-0.2, 0.25] },
  foam: { dist: [9, 7.5], yaw: [-0.3, 0.3] },
  vacuum: { dist: [8.4, 7.8], yaw: [0.2, -0.2] },
  proton: { dist: [8.2, 7.2], yaw: [0.4, -0.3] },
  nucleus: { dist: [7, 8.6], yaw: [-0.2, 0.5] },
  dna: { dist: [8.4, 8], yaw: [0, 0], pitch: [0.08, 0.02] },
  egg: { dist: [10, 7.4], yaw: [-0.2, 0.45], pitch: [0.08, 0.02] },
  human: { dist: [9, 8.6], yaw: [0.15, -0.1] },
  earth: { dist: [8.4, 7.8], yaw: [0, 0], pitch: [0.08, 0.08] },
  supernova: { dist: [8, 10], yaw: [0, 0.3] },
  galaxy: { dist: [9.4, 8.6], yaw: [0, 0.25] },
  web: { dist: [6.4, 6], yaw: [0, 0.2], pitch: [0.02, 0.02] },
  end: { dist: [7, 9.4], yaw: [0.3, -0.2] },
};
const DEFAULT = { dist: [8, 7.6], height: [0, 0], yaw: [-0.25, 0.25], pitch: [0.05, 0.05] } as const;

function keysOf(pick: (s: Required<Shot>) => [number, number]) {
  const list: [number, number][] = [];
  for (const s of SCENES) {
    const shot = { ...DEFAULT, ...SHOT[s.name] } as Required<Shot>, { from, to } = SPAN(s.name), [a, b] = pick(shot);
    list.push([from + 0.6, a], [to - 0.4, b]);
  }
  return keyed(list);
}
const dist = keysOf((s) => s.dist), height = keysOf((s) => s.height), yaw = keysOf((s) => s.yaw), pitch = keysOf((s) => s.pitch);
export const camera = (t: number): DotCamera => ({ dist: dist(t), height: height(t), yaw: yaw(t) + 0.03 * Math.sin(loop(t, 16)), pitch: pitch(t), center: [540, 840] });

// ── Trip ───────────────────────────────────────────────────────────────────────────────────────────────

const inScene = (names: SceneName[], fade = 1.5) => (t: number) => Math.max(0, ...names.map((n) => { const { from, to } = SPAN(n); return smooth(from + 0.8, from + 0.8 + fade, t) * (1 - smooth(to - fade, to - 0.3, t)); }));
const mirror = inScene(["foam", "end"]);
const base = (t: number): Trip => ({
  echo: { n: 4, zoom: 1.07, turn: 0.04 * Math.sin(loop(t, 7)), fade: 0.2, hue: 24 },
  kaleido: { sides: 6, mix: 0.55 * mirror(t), turn: t * 0.03 },
  split: 2.5,
});

// ── The scene ──────────────────────────────────────────────────────────────────────────────────────────

/** Stars shine out in space (the last two acts) and stay faint below it. */
export const starAlpha = (t: number) => {
  const a = ["stars", "cosmic"].includes(actAt(t)) ? 1 : 0.25;
  return a + (0.25 - a) * home(t);
};
/** The trip at t: the slow base plus the bursts at each cut. */
export const tripAt = base;

/** A haze in the act's colours, drifting all through the film. */
export const haze = living(
  (r) => ({ p: [(r() - 0.5) * 16, (r() - 0.5) * 20, -12 + r() * 13], c: [r(), r(), 0] }),
  (o, t, key, ph) => {
    o[0] += 0.4 * Math.sin(loop(t, 3) + ph);
    o[1] += 0.3 * Math.sin(loop(t, 2) + ph * 2);
    // In the act's colours, turning back to the opening's in the last seconds.
    const g = 0.2 * (0.7 + 0.3 * Math.sin(loop(t, 32) + ph)), k = home(t);
    paint(o, PALETTE[actAt(t)], key, g);
    const now = [o[3], o[4], o[5]];
    paint(o, PALETTE.subatomic, key, g);
    for (let c = 0; c < 3; c++) o[3 + c] = now[c] + (o[3 + c] - now[c]) * k;
  },
);

const scene: DotScene = {
  blur: 0.2,
  vivid: 0.8,
  sky: { color: [0.45, 0.3, 1], horizon: 0.45 },
  camera,
  trip: tripAt,
  groups: [
    {
      n: 3500,
      seed: 2,
      shape: (r) => ({ p: [(r() - 0.5) * 30, (r() - 0.5) * 40, -14 - r() * 8], c: r() < 0.3 ? [1.3, 0.85, 1] : [0.6, 0.75, 1.4] }),
      twinkle: 0.7,
      alpha: starAlpha,
    },
    { n: 12000, seed: 4, shape: haze },
    { n: 80000, seed: 3, shape: shapeOf(SCENES[0]), steps, match: true },
  ],
};

const paintScene = dotsLook(scene);
/** The film's picture at t seconds. */
export const picture: typeof paintScene = (g, t) => {
  paintScene(g, t);
  // A little shade for the words to sit on.
  const shade = g.createLinearGradient(0, 1250, 0, 1640);
  for (const [k, a] of [[0, 0], [0.35, 0.45], [0.7, 0.45], [1, 0]]) shade.addColorStop(k, `rgba(3,2,10,${a})`);
  g.fillStyle = shade;
  g.fillRect(0, 1250, 1080, 390);
};
