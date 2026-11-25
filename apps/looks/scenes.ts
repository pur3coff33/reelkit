// One scene told four ways: someone walks under a balete at night, and something is watching. Copy the nearest one to
// start a film in that look.
import { DUSK, NIGHT, boxLook, landAt, mixSky, type BoxWorld, type Land } from "../../src/kit/looks/box/world";
import * as box from "../../src/kit/looks/box/things";
import { backOut, clamp01, eyelid, flicker, rng, smooth, type Painter, type V3 } from "../../src/kit/looks/core";
import * as form from "../../src/kit/looks/dots/forms";
import { dotsLook, dotsOver, type DotScene } from "../../src/kit/looks/dots/scene";
import * as cut from "../../src/kit/looks/paper/cuts";
import { paperLook, type Glow, type Live, type PaperStage, type Sheet } from "../../src/kit/looks/paper/stage";

// ── Paper ──────────────────────────────────────────────────────────────────────────────────────────────

const MOON = { x: 680, y: 760 };
const LAMP = { x: 430, y: 1440 };
const moonlight = (r: number, a: number): Glow => ({ ...MOON, r, color: `rgba(255,226,160,${a})` });
const lamplight = (a: number, r: number): Glow => ({ ...LAMP, r, color: `rgba(255,164,70,${a})` });

/** The balete forest, with whatever lives behind the crown of the tree. */
function forest(creature: Sheet | Live, mood: PaperStage["mood"]): PaperStage {
  const walking = (t: number) => 1 - smooth(1.9, 2.2, t);
  const who = cut.traveller(330, 1640, walking);
  return {
    vanish: [560, 1000],
    push: (t) => 0.06 + 0.16 * smooth(0, 6, t) + 0.0033 * t,
    sway: (t) => Math.sin(t * 0.55) * 26 - 8,
    mood,
    layers: [
      { z: 5.2, color: "#f9c878", cut: cut.full, glow: moonlight(900, 0.75), flat: true },
      { z: 4.9, color: "#fff0c4", cut: cut.disc(MOON.x, MOON.y, 205), halo: { color: "rgba(255,240,200,0.9)", blur: 90 } },
      { z: 4.7, color: "#eea562", cut: cut.ring(MOON.x, MOON.y, 225, 225, 91, 22), glow: moonlight(900, 0.35) },
      { z: 4.3, color: "#c0645a", cut: cut.ring(MOON.x, MOON.y, 400, 400, 92, 26), glow: moonlight(1000, 0.28) },
      { z: 3.9, color: "#7d4568", cut: cut.ring(MOON.x, MOON.y + 30, 600, 640, 93), glow: moonlight(1200, 0.2) },
      { z: 3.7, color: "#e8b27c", cut: cut.cloud(640, -260, 330, 120, 14), glow: moonlight(700, 0.3), drift: 16 },
      { z: 3.5, color: "#c98670", cut: cut.cloud(900, 560, 1300, 130, 17), glow: moonlight(700, 0.25), drift: -20 },
      { z: 3.3, color: "#8c5566", cut: (g) => cut.hill(g, 1200, 120, 5, 150), glow: moonlight(900, 0.35), rise: 0.05 },
      {
        z: 2.9,
        color: "#69435f",
        glow: moonlight(1000, 0.28),
        rise: 0.12,
        cut: (g) => {
          cut.hill(g, 1330, 70, 6, 170);
          cut.palm(g, 120, 1340, 210);
          cut.palm(g, 960, 1330, 260, 1.15);
          cut.palm(g, 1080, 1350, 180, 0.9);
          cut.palm(g, -40, 1350, 240, 1.1);
          cut.hut(g, 250, 1350);
        },
      },
      { z: 2.5, color: "#4a3456", glow: moonlight(760, 0.3), rise: 0.2, cut: (g) => (cut.hill(g, 1440, 60, 8, 160), cut.balete.back(g)) },
      { z: 2.28, color: "#2f2445", cut: cut.balete.trunk, glow: lamplight(0.42, 620), rise: 0.28 },
      creature,
      { z: 2.16, color: "#3a2c50", cut: cut.balete.front, glow: moonlight(640, 0.22), rise: 0.3 },
      { z: 2, color: "#2b2140", glow: lamplight(0.5, 560), rise: 0.36, cut: (g) => (cut.hill(g, 1620, 36, 11, 140), cut.grass(g, 1620, 13, 70, 120)) },
      {
        z: 1.9,
        color: "#150f24",
        parts: who.parts,
        glow: { x: 430, y: 1430, r: 190, color: "rgba(255,170,80,0.75)" },
        move: (t) => ({ x: -230 * (1 - smooth(0.2, 2.1, t)), y: who.bob(t) }),
        after: (g, t) => cut.lantern(g, ...who.hand, t),
      },
      { z: 1.75, color: "#1d1630", glow: lamplight(0.34, 480), rise: 0.42, cut: (g) => (cut.hill(g, 1740, 40, 15, 150), cut.grass(g, 1735, 19, 110, 130)) },
      { z: 1.35, color: "#130e22", rise: 0.5, blur: 3, cut: (g) => (cut.grass(g, 1960, 23, 300, 60), cut.sideLeaves(g, 1500, 44)) },
      { z: 1, color: "#0f0b1c", cut: cut.archFrame(), frame: true },
    ],
  };
}

const duskfall = (t: number) => ({ edges: 0.3 + 0.22 * smooth(2.4, 3.2, t), wash: `rgba(52,34,84,${0.2 * smooth(2.4, 3, t)})` });

export const paper: Painter = paperLook(
  forest(
    {
      z: 2.22,
      color: "#1b1230",
      glow: { x: 560, y: 1300, r: 420, color: "rgba(255,150,60,0.35)" },
      cut: cut.at(47.5, 89.5, 0.9, cut.kapre),
      // Lowered out of the leaves like a puppet, and left swinging a little.
      move: (t) => {
        const k = backOut((t - 2.35) / 0.8, 0.9);
        return t < 2.3 ? { alpha: 0 } : { y: -760 * (1 - k), turn: 0.035 * Math.exp(-(t - 2.9) * 1.6) * Math.sin((t - 2.9) * 6) * smooth(2.9, 3, t), about: [700, 500] };
      },
      after: (g, t) => {
        g.translate(47.5, 89.5);
        g.scale(0.9, 0.9);
        cut.eyes(g, 694, 738, eyelid(t, 3.05, [4.35]), { look: smooth(3.4, 3.7, t) });
        cut.cigar(g, 690, 786, 636, 800, t, 3.6);
      },
    },
    duskfall,
  ),
);

// ── Box ────────────────────────────────────────────────────────────────────────────────────────────────

const LAND: Land = { path: { points: [[-2.4, 1.15], [-1.2, 1.2], [-0.2, 1.28], [0.6, 1.4], [0.9, 1.42]], width: 0.2 } };
const night = (t: number) => smooth(2.3, 3, t) * (1 - smooth(5.2, 5.9, t));
// Out and back, so the last frame meets the first.
const walk = (t: number) => 0.02 + 0.98 * smooth(0.2, 2.2, t) * (1 - smooth(5.2, 5.95, t));
const walkerAt = (t: number) => {
  const k = walk(t), x = -1.75 + 0.8 * k, moving = k < 0.99 && k > 0.03 ? 1 : 0;
  return { at: [x, landAt(LAND, x, 1.22), 1.22] as V3, turn: smooth(5.05, 5.25, t) * Math.PI * (1 - smooth(5.9, 6, t)), k: [Math.sin(k * 22) * moving, 1] };
};
const watching = (t: number) => eyelid(t, 2.9, [4.3], 5.2);

const boxWorld: BoxWorld = {
  land: LAND,
  things: [
    box.balete({ at: [0.1, 0, -0.25] }),
    box.kapre((t) => ({ at: [0.62, 1.62 + 0.62 * (1 - night(t)), 0.28 - 0.5 * (1 - night(t))], k: [watching(t)] })),
    box.hut({ at: [-1.3, 0, -1.15], turn: -0.5, k: [1] }),
    box.walker(walkerAt),
    box.rock({ at: [-1.2, landAt(LAND, -1.2, 1.65), 1.65] }),
    box.rock({ at: [1.6, landAt(LAND, 1.6, -0.6), -0.6], scale: 1.3 }),
    box.tree({ at: [1.45, landAt(LAND, 1.45, 0.9), 0.9], scale: 0.8 }),
  ],
  lamps: (t) => [
    { at: box.held(walkerAt(t), [0.26, 0.34, 0.12]), color: [1, 0.49, 0.17], power: 6.8 * flicker(t) },
    { at: [-1.05, 0.64, -0.72], color: [1, 0.5, 0.17], power: 2, falloff: 9, haze: 0 },
    { at: [0.58, 2.02, 0.62], color: [1, 0.25, 0.05], power: 2.4 * watching(t), falloff: 18, haze: 1.2 },
  ],
  sky: (t) => mixSky(DUSK, NIGHT, night(t)),
  camera: (t) => ({ yaw: 0.62 + 0.5 * Math.sin((t / 6) * Math.PI * 2) }),
};
export const boxed: Painter = boxLook(boxWorld);

// ── Dots ───────────────────────────────────────────────────────────────────────────────────────────────

const PERSON: V3 = [-2.4, 0, 2.15];
const strolled = (t: number) => 1.62 * smooth(0.3, 2.4, t) + 0.2 * smooth(3, 6, t);
const lanternAt = (t: number): V3 => [PERSON[0] + strolled(t), 0.62, PERSON[2]];

const dotScene: DotScene = {
  groups: [
    { n: 18000, seed: 1, shape: form.ground(), alpha: (t) => 0.75 * smooth(0.1, 1, t) },
    { n: 6300, seed: 2, shape: form.stars(), twinkle: 0.6 },
    {
      n: 65700,
      seed: 3,
      shape: form.swarm(),
      wander: 1,
      sway: 0.02,
      breathe: 0.006,
      steps: [
        { to: form.balete(rng(42)), at: -0.6, dur: 1.3, spread: 0.85, order: "up" },
        { to: form.giant(rng(43)), at: 2.35, dur: 1, spread: 0.9, order: "down", flash: [0.5, 0.28, 0.1] },
      ],
    },
    { n: 2600, seed: 4, shape: form.moved(form.person(), [PERSON[0] - 0.3, 0, PERSON[2]]), move: (t) => [strolled(t), 0.02 * Math.abs(Math.sin(t * 8)) * (1 - smooth(2.2, 2.5, t)), 0] },
  ],
  camera: (t) => ({ yaw: -0.55 + 0.75 * smooth(0, 6, t) + 0.03 * t, dist: 9.6 - 1.1 * smooth(0, 6, t), height: 1.75 + 0.25 * smooth(2.6, 4, t) }),
  lights: (t) => [
    { at: lanternAt(t), color: [1.3, 0.72, 0.22], power: 1.5, falloff: 3.5 },
    { at: [0, 3.02, 0.95], color: [1.2, 0.42, 0.06], power: 0.9 * eyelid(t, 3.5, [4.6]), falloff: 5 },
  ],
  extra: (s, t) => {
    const k = flicker(t);
    s.glow(lanternAt(t), 0.09 * k, [2.4, 1.6, 0.7]);
    s.glow(lanternAt(t), 0.85 * k, [0.2, 0.1, 0.03]);
    s.eyes([0, 3.04, 0.9], { gap: 0.54, w: 0.2, h: 0.105, open: eyelid(t, 3.5, [4.6]) });
  },
};
export const dots: Painter = dotsLook(dotScene);

// ── Paper and light ────────────────────────────────────────────────────────────────────────────────────

// The world is paper; what it can't hold is made of light. It leaks from the hollows of the trunk, the moon goes out, and
// it stands up where the tree was.
const EMBER: V3 = [0.5, 0.27, 0.08];
const hollows = form.join([
  [2, form.ball([-0.31, 0.88, 0], [0.08, 0.58, 0.06], EMBER, 1)],
  [2, form.ball([0.13, 1.24, 0], [0.06, 0.68, 0.06], EMBER, 1)],
  [2, form.ball([0.46, 0.57, 0], [0.07, 0.48, 0.06], EMBER, 1)],
  [1, form.ball([-0.06, 0.01, 0], [0.05, 0.36, 0.06], EMBER, 1)],
]);
const open = (t: number) => eyelid(t, 3.7, [4.7]);
const spirit: DotScene = {
  groups: [
    { n: 70000, seed: 9, shape: hollows, breathe: 0.01, alpha: (t) => 0.3 * smooth(1.5, 2.2, t) + 0.7 * smooth(2.2, 3, t), steps: [{ to: form.giant(rng(43), { hairs: 4200, root: [0.3, 0.11, 0.05], tip: [1.3, 0.66, 0.22] }), at: 2.25, dur: 1.1, spread: 0.7, burst: 0.8, flash: [0.5, 0.3, 0.1] }] },
    { n: 600, seed: 11, shape: form.tinted(form.swarm(3.4, 5), [0.9, 0.5, 0.14]), wander: 1, twinkle: 0.9, alpha: (t) => smooth(2.6, 3.6, t) },
  ],
  camera: (t) => ({ yaw: -0.1 + 0.05 * Math.sin(t * 0.9), dist: 8, height: 1.9, center: [560, 1130], focal: 1566, pitch: 0 }),
  lights: (t) => [{ at: [0, 3, 0.95], color: [1.2, 0.5, 0.1], power: 0.8 * open(t), falloff: 4 }],
  extra: (s, t) => s.eyes([0, 3.04, 0.9], { gap: 0.54, w: 0.2, h: 0.105, open: open(t) }),
};
const lightOver = dotsOver(spirit);
export const paperAndLight: Painter = paperLook(
  forest(
    {
      z: 2.24,
      live: (g, t) => {
        if (t < 1.5) return;
        const k = smooth(2.1, 3, t);
        // Everything behind goes dark, so the light has something to shine against.
        g.fillStyle = `rgba(9,5,22,${0.9 * k})`;
        g.fillRect(-420, -420, 1920, 2760);
        cut.shine(g, 560, 1000, 900, "255,110,40", 0.26 * k);
        lightOver(g, t);
      },
    },
    (t) => ({ edges: 0.3 + 0.2 * smooth(2.2, 3.2, t) }),
  ),
);

// ── Every part each look has ───────────────────────────────────────────────────────────────────────────

const INK = "#3a2c50";
const partsStage: PaperStage = {
  layers: [
    { z: 5, color: "#e9b67e", cut: cut.full, flat: true },
    { z: 4.5, color: "#c0645a", cut: cut.ring(540, 480, 560, 420, 92, 26) },
    { z: 4.2, color: "#fff0c4", cut: (g) => (cut.cloud(300, 120, 420, 90, 3)(g), cut.bird(g, 640, 250, 1.1), cut.bird(g, 760, 330, 0.8), cut.star(g, 880, 230, 30)) },
    { z: 4, color: "#8c5566", cut: (g) => (cut.mountain(g, 300, 800, 620, 420, 4), cut.mountain(g, 800, 800, 560, 360, 8, 110)) },
    { z: 3, color: INK, cut: (g) => (cut.hill(g, 800, 30, 4, 150), cut.palm(g, 120, 810, 230), cut.tree(g, 300, 810, 220, 5), cut.hut(g, 470, 790), cut.house(g, 690, 800, 1, 2), cut.house(g, 900, 800, 1, 5)) },
    { z: 2.8, color: "#e8843f", cut: (g) => (cut.flame(g, 590, 830, 60, 120, 10), cut.flame(g, 620, 830, 40, 80, -6)) },
    { z: 2.6, color: "#3d6a86", cut: (g) => cut.waves(g, 990, 130), drift: 14 },
    { z: 2.5, color: "#1b1230", cut: (g) => cut.banca(g, 300, 1010) },
    { z: 2.4, color: "#2b4f6b", cut: (g) => cut.waves(g, 1080, 150), drift: -18 },
    { z: 2.2, color: "#1d1630", cut: (g) => (cut.hill(g, 1200, 24, 9, 150), cut.grass(g, 1200, 13, 70, 110)) },
    { z: 2, color: "#1b1230", cut: cut.at(380, 830, 0.62, cut.kapre), after: (g) => { g.translate(380, 830); g.scale(0.62, 0.62); cut.eyes(g, 694, 738, 1); } },
    { z: 1.9, color: "#e8d3b0", parts: cut.traveller(280, 1560, () => 1).parts, after: (g, t) => cut.lantern(g, 380, 1344, t) },
    { z: 1.3, color: "#130e22", cut: (g) => (cut.sideLeaves(g, 1560, 44), cut.grass(g, 1960, 23, 260, 60)) },
  ],
};
const boxParts: BoxWorld = {
  land: { water: { level: -0.02, color: [0.1, 0.3, 0.42] }, waves: [{ amp: 0.24, fx: 0.9, fz: 0.5, px: 2.6 }, { amp: 0.04, fx: 3.1, fz: 2 }], tufts: 0.4 },
  things: [
    box.volcano({ at: [-1, 0.1, -1.05], scale: 0.72, k: [1] }),
    box.palm({ at: [-1.6, 0.12, 0.9] }),
    box.palm({ at: [-1.25, 0.1, 1.5], scale: 0.8, turn: 1 }),
    box.house({ at: [-0.65, 0.12, 0.5], turn: -0.3, k: [1] }),
    box.house({ at: [-0.05, 0.05, -0.55], k: [1], scale: 0.8 }, [0.5, 0.62, 0.66], [0.3, 0.35, 0.5]),
    box.hut({ at: [-0.6, 0.1, 1.45], scale: 0.7, turn: 0.2, k: [1] }),
    box.tree({ at: [-1.5, 0.14, 0.1] }),
    box.banca({ at: [1.1, 0.02, 1.1], turn: 0.6 }),
    box.fish((t) => ({ at: [1.3, 0.3 + 0.1 * Math.sin(t * 2), -0.4], k: [t * 8] })),
    box.cloud({ at: [0.9, 2.3, -0.6], scale: 0.9 }),
    box.cloud({ at: [-1.1, 2.1, -1.1], scale: 0.6 }),
    box.walker({ at: [0.02, 0.06, 1.2], k: [0.6, 1] }),
  ],
  lamps: (t) => [{ at: box.held({ at: [0.02, 0.06, 1.2] }, [0.26, 0.34, 0.12]), color: [1, 0.49, 0.17], power: 3 * flicker(t) }, { at: [-1, 1.5, -1.05], color: [1, 0.3, 0.08], power: 3, falloff: 4 }],
  sky: () => DUSK,
  camera: () => ({ yaw: 0.5, target: [0, 0.7, 0] }),
};
const dotParts: DotScene = {
  groups: [
    { n: 14000, seed: 1, shape: form.ground(12, 9) },
    { n: 3000, seed: 8, shape: form.stars(), twinkle: 0.5 },
    { n: 34000, seed: 2, shape: form.moved(form.balete(rng(1)), [-1.5, 0, -1], 0.75) },
    { n: 34000, seed: 3, shape: form.moved(form.giant(rng(2)), [1.5, 0, -0.6], 0.72, -0.3) },
    { n: 5000, seed: 4, shape: form.moved(form.person(), [-0.2, 0, 2], 0.9) },
    { n: 6000, seed: 5, shape: form.ball([0, 4.6, -2], 0.6, [0.9, 0.85, 0.6]) },
  ],
  camera: () => ({ yaw: 0.1, dist: 10.4, height: 2 }),
  extra: (s) => s.eyes([1.31, 2.19, 0.06], { gap: 0.38, w: 0.14, h: 0.075, open: 1 }),
};
const parts = [paperLook(partsStage), boxLook(boxParts), dotsLook(dotParts)];
/** One look's parts a second. */
export const partsSheet: Painter = (g, t) => {
  const i = Math.min(2, Math.floor(clamp01(t / 3) * 3));
  parts[i](g, t);
};
