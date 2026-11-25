// The picture: one crowd of points that is a person, a ship, a river, a butterfly, an eye, a tunnel, a net, the sea and a
// galaxy in turn. The film says you are a pattern that other things pass through, and the points act it out.
import { between, clamp01, eyelid, smooth, type V3 } from "../../src/kit/looks/core";
import { stars, tinted, type Sampler } from "../../src/kit/looks/dots/forms";
import { MEDITATOR, STANDING, butterfly, eye, galaxyPerson, mandala, net, person, river, seaPerson, ship, tunnel, winged } from "../../src/kit/looks/dots/ideas";
import { dotsLook, type DotCamera, type DotScene, type Step } from "../../src/kit/looks/dots/scene";
import type { Trip } from "../../src/kit/looks/dots/trip";
import { PARTS as P, SECONDS } from "./timeline";

/** Eased values at moments: [seconds, value]. */
function keys(list: [number, number][]) {
  return (t: number) => {
    const i = list.findIndex(([at]) => t < at);
    if (i === 0) return list[0][1];
    if (i < 0) return list[list.length - 1][1];
    const [a, x] = list[i - 1], [b, y] = list[i];
    return x + (y - x) * smooth(a, b, t);
  };
}

// ── Shapes in order ────────────────────────────────────────────────────────────────────────────────────

const eyeOpen = (t: number) => 0.02 + 0.98 * eyelid((t - 65.2) / 4 + 0.2, 0, []) * (1 - between(t, 70.6, 70.75, 70.8, 71));
const pupil = keys([[64, 0.62], [67, 0.46], [69.4, 0.62], [71.4, 0.4], [73.4, 1.1]]);
const flown = (t: number) => 2.4 * t + 8 * smooth(72, 80, t);
const risen = (t: number) => smooth(98.6, 103.4, t) * (1 - smooth(105.9, 109.4, t));
/** Who is real while he can't say which he was. */
const man = (t: number) => 1 - smooth(58.6, 60.6, t);

const go = (to: Sampler, at: number, o: Partial<Step> = {}): Step => ({ to, at, dur: 1.5, spread: 0.9, burst: 0.9, dim: 0.6, flash: [0.05, 0.02, 0.08], ...o });
const steps: Step[] = [
  go(person(MEDITATOR, { stream: 0.34 }), -1.9, { dur: 1.5, spread: 1.4, burst: 1.2 }),
  go(ship(14.6, 23.2), P.ship.from - 1.1),
  go(river(), P.river.from - 1.1, { burst: 1.4 }),
  go(person(STANDING, { stream: 0.4, speed: 0.16, stripes: 0.8 }), 40.6, { burst: 0.5 }),
  go(butterfly(), P.butterfly.from - 0.8, { burst: 1.2 }),
  go(person(MEDITATOR, { stream: 0.12 }), 51.2),
  go(winged(man), 55.2),
  go(eye(eyeOpen, pupil), P.eye.from - 1.3, { burst: 1.3 }),
  go(tunnel(flown), 72.8, { burst: 0.3, spread: 1.4 }),
  go(net((t) => 1.15 * t), P.net.from - 1, { burst: 0.8 }),
  go(seaPerson(MEDITATOR, -1.25, risen), P.wave.from - 1.2, { dur: 1.8, burst: 0.8 }),
  go(galaxyPerson(MEDITATOR), P.home.from - 2.4, { dur: 2.2, spread: 1, burst: 1.4 }),
];

// ── Camera and trip ────────────────────────────────────────────────────────────────────────────────────

const dist = keys([[0, 8], [10, 6.6], [13, 8.2], [26, 7.6], [29, 8], [43, 8], [45, 7.6], [50, 7], [53, 7.4], [62, 8], [65, 7], [72, 5.6], [76, 8], [95, 8], [98, 8.2], [104, 7.4], [110, 8.4], [114, 7.6], [120, 10.5]]);
const height = keys([[0, 0.35], [11, 0.35], [13, 0.45], [26, 0.45], [29, 0.2], [39.6, 0.2], [42.4, -0.05], [44, 0], [51, 0], [53, 0.3], [56, 0.15], [64, 0], [96, 0], [98, 0.15], [111, 0.15], [114, 0]]);
// Still, where a shape is only itself from the front.
const turn = keys([[0, -0.5], [11, 0.4], [12.5, -0.55], [27, 0.5], [29, 0], [40, 0], [44, 0.25], [46, -0.3], [51, 0.3], [54, 0], [64, 0], [96, 0], [98, -0.25], [109, 0.25], [112, 0], [120, 0.12]]);
const tip = keys([[0, 0.05], [11, 0.05], [13, 0.14], [27, 0.1], [29, 0.1], [40, 0.1], [44, 0.02], [95, 0], [98, 0.16], [110, 0.12], [113, 0]]);
const camera = (t: number): DotCamera => ({ yaw: turn(t) + 0.03 * Math.sin(t * 0.5), dist: dist(t), height: height(t), pitch: tip(t), center: [540, 840] });

/** A hump round each change of shape. */
const change = (t: number) => Math.max(...steps.slice(1).map((s) => smooth(s.at - 0.4, s.at + 0.9, t) * (1 - smooth(s.at + 1.1, s.at + 2.8, t))));
const echo = keys([[0, 0.2], [12, 0.18], [28, 0.3], [40, 0.34], [44, 0.36], [56, 0.42], [64, 0.36], [72, 0.5], [80, 0.42], [96, 0.3], [112, 0.4], [120, 0.3]]);
const mirror = keys([[0, 0], [72.6, 0], [75, 0.75], [78.6, 0.75], [80, 0], [82.4, 0.85], [86, 0.85], [88, 1], [94, 1], [96.2, 0]]);
const trip = (t: number): Trip => ({
  echo: { n: 5, zoom: 1.1, turn: 0.07 * Math.sin(t * 0.21) + 0.05 * change(t), fade: echo(t) - 0.1 * change(t), hue: 34 },
  kaleido: { sides: t < 80 ? 6 : 8, mix: mirror(t), turn: (t - 72) * 0.03 },
  split: 3 + 9 * change(t),
});

// ── The scene ──────────────────────────────────────────────────────────────────────────────────────────

const heart: V3 = [0, 0.55, 0.3];
const scene: DotScene = {
  blur: 0.22,
  vivid: 0.8,
  sky: { color: [0.75, 0.35, 1.25], horizon: 0.45 },
  camera,
  trip,
  groups: [
    { n: 3200, seed: 2, shape: tinted(stars(), (_, r) => (r() < 0.3 ? [1.3, 0.8, 1.1] : [0.6, 0.75, 1.4])), twinkle: 0.7 },
    // The ground it all appears on, out of the way where the shape fills the frame.
    { n: 24000, seed: 5, shape: mandala(), alpha: keys([[0, 0], [2, 0.8], [11, 0.8], [14, 0.3], [27, 0.3], [30, 0.12], [40, 0.12], [43, 0.8], [52, 0.9], [62, 0.9], [66, 0.5], [71, 0.4], [73, 0], [96, 0], [99, 0.45], [108, 0.45], [111, 0]]) },
    { n: 78000, seed: 3, shape: tinted((r) => ({ p: [(r() - 0.5) * 9, (r() - 0.5) * 12, (r() - 0.5) * 8], c: [0, 0, 0] }), (_, r) => (r() < 0.5 ? [0.35, 0.16, 0.5] : [0.12, 0.35, 0.5])), wander: 1, steps },
  ],
  lights: (t) => [
    { at: heart, color: [1, 0.55, 0.8], power: 0.5 * between(t, 5, 8, 10, 12), falloff: 6 },
    { at: [0, 0, 0.4], color: [0.9, 0.6, 1], power: 0.04 * smooth(113, 116.5, t), falloff: 4 },
  ],
  extra: (s, t) => {
    // Something is doing the doubting: the light that stays at the end of the tunnel.
    const k = between(t, 74, 77, 79.4, 80.6), pulse = 1 + 0.12 * Math.sin(t * 3.1);
    if (k > 0) {
      s.glow([0, 0, -6], 0.3 * k * pulse, [2 * k, 1.5 * k, 1.1 * k]);
      s.glow([0, 0, -6], 1.7 * k, [0.16 * k, 0.09 * k, 0.12 * k]);
    }
    const core = smooth(112.5, 115, t) * (1 - clamp01((t - 118) / 2));
    if (core > 0) s.glow([0, 0.2, -0.1], 1.3, [0.07 * core, 0.03 * core, 0.1 * core]);
  },
};

const paint = dotsLook(scene);
/** The film's picture at t seconds. */
export const picture: typeof paint = (g, t) => {
  paint(g, t);
  // A little shade for the words to sit on.
  const shade = g.createLinearGradient(0, 1230, 0, 1660);
  for (const [k, a] of [[0, 0], [0.35, 0.5], [0.7, 0.5], [1, 0]]) shade.addColorStop(k, `rgba(3,2,10,${a})`);
  g.fillStyle = shade;
  g.fillRect(0, 1230, 1080, 430);
  const dark = Math.max(1 - smooth(-0.3, 0.25, t), smooth(SECONDS - 1.6, SECONDS - 0.1, t));
  if (dark <= 0) return;
  g.fillStyle = `rgba(3,2,10,${dark})`;
  g.fillRect(0, 0, 1080, 1920);
};
