// The picture: one crowd of 80,000 points that becomes each scene's shape in turn, flowing from one into the next so the
// shapes merge across every cut (as in apps/middle), over a haze in the act's colours and, in the galaxy, the stars. Each
// scene has its own psychedelic treatment (echo zoom, spiral echoes, honeycomb kaleidoscope, double vision), blended
// across the cuts. At the very end the two forests flow back into the galaxy of threads the film opens on, so it loops.
import { TAU, keyed, smooth, type RGB } from "../../src/kit/looks/core";
import { flowStep } from "../../src/kit/looks/dots/blast";
import { living, type Sampler } from "../../src/kit/looks/dots/forms";
import { dotsLook, type DotCamera, type DotScene } from "../../src/kit/looks/dots/scene";
import type { Trip } from "../../src/kit/looks/dots/trip";
import { SHAPES } from "./shapes";
import { PALETTE, paint } from "./shapes/make";
import { CUTS, SCENES, SECONDS, SPAN, type Act, type SceneDef, type SceneName } from "./timeline";

const shapeOf = (s: SceneDef) => SHAPES[s.name]!(SPAN(s.name));

/** The faint light points give off as they drift between shapes, per act. */
const GLINT: Record<Act, RGB> = {
  cosmos: [0.015, 0.01, 0.03],
  ancient: [0.005, 0.02, 0.015],
  trade: [0.025, 0.015, 0.004],
  inside: [0.025, 0.008, 0.02],
  forest: [0.008, 0.02, 0.01],
  story: [0.02, 0.012, 0.02],
};

/** The galaxy again, timed as if the film had started over, for the last flow back into it. */
const hook = shapeOf(SCENES[0]);
const again: Sampler = Object.assign((r: () => number) => hook(r), { life: (o: number[], t: number, key: number, ph: number) => hook.life!(o, t - SECONDS, key, ph) });
/** Where the last flow is centred: its last point lands just before the final frame. */
export const HOME = SECONDS - 2.1;
const steps = [...SCENES.slice(1).map((s, i) => flowStep(shapeOf(s), CUTS[i], GLINT[s.act])), flowStep(again, HOME, GLINT.cosmos)];

/** A wave that comes round exactly `n` times in the film, so it's where it began when the film loops. */
const loop = (t: number, n: number) => (TAU * n * t) / SECONDS;

/** How much each scene is showing at t: 1 inside it, crossing over 1.5 s either side of each cut. */
function weights(t: number): number[] {
  return SCENES.map((s, i) => {
    const { from, to } = SPAN(s.name);
    const a = i ? smooth(from - 1.5, from + 1.5, t) : 1, b = i < SCENES.length - 1 ? 1 - smooth(to - 1.5, to + 1.5, t) : 1;
    return a * b;
  });
}
const homeAt = (t: number) => smooth(HOME - 1.4, SECONDS, t);

// ── Camera ─────────────────────────────────────────────────────────────────────────────────────────────

type Shot = { dist?: [number, number]; height?: [number, number]; yaw?: [number, number]; pitch?: [number, number] };
/** Where the camera starts and ends each scene. */
const SHOT: Record<SceneName, Shot> = {
  hook: { dist: [10.2, 7.2], yaw: [-0.15, 0.2], height: [0.3, 0.3] },
  shore: { dist: [8.6, 7.4], yaw: [0.22, -0.12], height: [-0.3, -0.15], pitch: [0.3, 0.24] },
  cells: { dist: [8.2, 6.6], yaw: [-0.3, 0.25], pitch: [0.04, 0.04] },
  deal: { dist: [8.6, 7.6], yaw: [-0.1, 0.5], height: [0.1, 0.1] },
  market: { dist: [8.8, 7.9], yaw: [0.12, -0.12], height: [0.45, 0.45] },
  tunnel: { dist: [6.2, 6.2], yaw: [0, 0], height: [0, 0], pitch: [0, 0] },
  ripple: { dist: [9.4, 8.2], yaw: [0, 0.35], height: [-0.3, -0.3], pitch: [1.0, 0.85] },
  hubs: { dist: [8.4, 7.4], yaw: [-0.12, 0.1], height: [0.4, 0.4], pitch: [0.03, 0.03] },
  carbon: { dist: [8.8, 7.8], yaw: [0, 0], height: [0.3, 0.3], pitch: [0.05, 0.05] },
  story: { dist: [8, 7.3], yaw: [-0.18, 0.15], height: [0.15, 0.15] },
  end: { dist: [8.6, 9.6], yaw: [0.25, -0.1], height: [0.35, 0.35], pitch: [0.03, 0.03] },
};
const DEFAULT = { dist: [8, 7.6], height: [0, 0], yaw: [-0.2, 0.2], pitch: [0.05, 0.05] } as const;

function keysOf(pick: (s: Required<Shot>) => [number, number]) {
  const list: [number, number][] = [];
  for (const s of SCENES) {
    const shot = { ...DEFAULT, ...SHOT[s.name] } as Required<Shot>, { from, to } = SPAN(s.name), [a, b] = pick(shot);
    list.push([from + 0.6, a], [s.name === "end" ? HOME - 1.4 : to - 0.4, b]);
  }
  // Back to the opening for the loop.
  list.push([SECONDS, pick({ ...DEFAULT, ...SHOT.hook } as Required<Shot>)[0]]);
  list[0] = [0, list[0][1]];
  return keyed(list);
}
const dist = keysOf((s) => s.dist), height = keysOf((s) => s.height), yaw = keysOf((s) => s.yaw), pitch = keysOf((s) => s.pitch);
export const camera = (t: number): DotCamera => ({ dist: dist(t), height: height(t), yaw: yaw(t) + 0.03 * Math.sin(loop(t, 14)), pitch: pitch(t), center: [540, 840] });

// ── Trip ───────────────────────────────────────────────────────────────────────────────────────────────

/** Each scene's treatment: zoom echoes (how many, how much bigger and turned each, how faint, hue step), the honeycomb
 * kaleidoscope's mix, and the colour split. */
type Look = { n: number; zoom: number; turn: number; fade: number; hue: number; kaleido: number; split: number };
const LOOK: Record<SceneName, Look> = {
  hook: { n: 4, zoom: 1.06, turn: 0.03, fade: 0.26, hue: 18, kaleido: 0, split: 2 },
  shore: { n: 3, zoom: 1.03, turn: 0, fade: 0.14, hue: 10, kaleido: 0, split: 1.5 },
  cells: { n: 3, zoom: 1.05, turn: 0.01, fade: 0.18, hue: 30, kaleido: 0.25, split: 2.5 },
  deal: { n: 4, zoom: 1.04, turn: 0.02, fade: 0.2, hue: 14, kaleido: 0, split: 2 },
  market: { n: 5, zoom: 1.035, turn: 0.07, fade: 0.24, hue: 40, kaleido: 0, split: 2 },
  tunnel: { n: 5, zoom: 1.1, turn: 0.02, fade: 0.3, hue: 25, kaleido: 0, split: 3.5 },
  ripple: { n: 3, zoom: 1.04, turn: -0.02, fade: 0.2, hue: -20, kaleido: 0, split: 2 },
  hubs: { n: 3, zoom: 1.03, turn: 0, fade: 0.15, hue: 12, kaleido: 0, split: 1.5 },
  carbon: { n: 4, zoom: 1.05, turn: -0.02, fade: 0.2, hue: 20, kaleido: 0, split: 2 },
  story: { n: 2, zoom: 1.02, turn: 0, fade: 0.14, hue: 0, kaleido: 0, split: 7 },
  end: { n: 4, zoom: 1.05, turn: 0.02, fade: 0.22, hue: 16, kaleido: 0, split: 2 },
};
export const tripAt = (t: number): Trip => {
  const w = weights(t), total = w.reduce((a, b) => a + b, 0) || 1, at = { n: 0, zoom: 0, turn: 0, fade: 0, hue: 0, kaleido: 0, split: 0 };
  SCENES.forEach((s, i) => {
    for (const k of Object.keys(at) as (keyof Look)[]) at[k] += (LOOK[s.name][k] * w[i]) / total;
  });
  // The last seconds ease back to the opening's look.
  const h = homeAt(t);
  for (const k of Object.keys(at) as (keyof Look)[]) at[k] += (LOOK.hook[k] - at[k]) * h;
  return {
    echo: { n: Math.round(at.n), zoom: at.zoom, turn: at.turn * Math.sin(loop(t, 6)), fade: at.fade, hue: at.hue },
    kaleido: { sides: 6, mix: at.kaleido, turn: t * 0.03 },
    split: at.split,
  };
};

// ── The scene ──────────────────────────────────────────────────────────────────────────────────────────

/** The act playing at t. */
export const actAt = (t: number): Act => (SCENES.findLast((s) => SPAN(s.name).from <= t) ?? SCENES[0]).act;

/** Stars shine in the galaxy (the opening and the loop home), and stay faint below. */
export const starAlpha = (t: number) => {
  const w = weights(t), sky = w[0] + homeAt(t) * (1 - w[0]);
  return 0.12 + 0.88 * Math.min(1, sky);
};

/** A haze in the act's colours, drifting all through the film. */
export const haze = living(
  (r) => ({ p: [(r() - 0.5) * 16, (r() - 0.5) * 20, -12 + r() * 13], c: [r(), r(), 0] }),
  (o, t, key, ph) => {
    o[0] += 0.4 * Math.sin(loop(t, 3) + ph);
    o[1] += 0.3 * Math.sin(loop(t, 2) + ph * 2);
    const g = 0.18 * (0.7 + 0.3 * Math.sin(loop(t, 30) + ph)), w = weights(t), total = w.reduce((a, b) => a + b, 0) || 1, mix = [0, 0, 0];
    SCENES.forEach((s, i) => {
      if (w[i] < 1e-3) return;
      paint(o, PALETTE[s.act], key, g);
      for (let c = 0; c < 3; c++) mix[c] += (o[3 + c] * w[i]) / total;
    });
    const h = homeAt(t);
    paint(o, PALETTE.cosmos, key, g);
    for (let c = 0; c < 3; c++) o[3 + c] = mix[c] + (o[3 + c] - mix[c]) * h;
  },
);

const scene: DotScene = {
  blur: 0.2,
  vivid: 0.8,
  sky: { color: [0.3, 0.35, 0.75], horizon: 0.5 },
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
    { n: 80000, seed: 3, shape: hook, steps, match: true },
  ],
};

const paintScene = dotsLook(scene);
/** The film's picture at t seconds. */
export const picture: typeof paintScene = (g, t) => {
  paintScene(g, t);
  // A little shade for the words to sit on.
  const shade = g.createLinearGradient(0, 1250, 0, 1640);
  for (const [k, a] of [[0, 0], [0.35, 0.45], [0.7, 0.45], [1, 0]]) shade.addColorStop(k, `rgba(2,4,6,${a})`);
  g.fillStyle = shade;
  g.fillRect(0, 1250, 1080, 390);
};
