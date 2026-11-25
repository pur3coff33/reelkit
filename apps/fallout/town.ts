// A small town far downwind, where the fallout comes down. Nobody's in it. A swing still moving, washing on a line, ash
// settling on a car: the plume on the map, at the size of one street.
import { hex, mixRGB, norm, type Camera, type Env, type Frame, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, house, rng, shake, smooth, tree, vary } from "../../src/kit/lowpoly/world";
import { car, limb, poly } from "../typhoon/models";
import { NO_FX, type Fx } from "./downtown";
import { ashfall } from "./models";

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** How much ash has settled by time t, 0…1. */
const settled = (t: number) => smooth(59, 63, t);

const ENV: Env = {
  skyTop: hex("#4c5032"),
  skyBottom: hex("#b5b282"),
  fog: hex("#a5a37a"),
  fogNear: 30,
  fogFar: 230,
  sun: norm([0.3, 0.42, -0.7]),
  sunColor: [176, 170, 96],
  ambient: [118, 120, 92],
};

const ashed = (c: RGB, k: number) => mixRGB(c, hex("#b4b2a1"), k * 0.7);

function street(out: Tri[], t: number) {
  const k = settled(t);
  const r = rng(77);
  const ROAD = hex("#55564f"), LAWN = hex("#6f8a48"), WALLS = ["#cfc3ad", "#a9b6ba", "#bfa78d", "#d7d2c2"].map(hex), ROOFS = ["#7a4436", "#47525e", "#5e5346"].map(hex);
  // The ground: a road down the middle, lawns either side.
  for (let z = -40; z < 180; z += 12) {
    for (let x = -96; x < 96; x += 12) {
      const col = Math.abs(x + 6) < 7 ? ROAD : vary(LAWN, x * 3 + z, 0.1);
      poly(out, [[x, 0, z], [x + 12, 0, z], [x + 12, 0, z + 12], [x, 0, z + 12]], ashed(col, k), { zBias: 900 });
    }
  }
  // Houses down both sides, and the trees between them.
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, z = 2 + Math.floor(i / 2) * 22 + r() * 3, wall = WALLS[Math.floor(r() * 4)], roof = ROOFS[Math.floor(r() * 3)];
    house(out, { pos: [side * (17 + r() * 3), 0, z], yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2, size: [11, 3.6, 8.5] }, ashed(wall, k * 0.6), ashed(roof, k));
    tree(out, { pos: [side * (10.5 + r()), 0, z + 11], size: 6 + r() * 3, yaw: i }, ashed(hex("#3f6e3a"), k));
  }
  car(out, [5.2, 0, 22], 0.03, ashed(hex("#7c3a33"), k));
  car(out, [-5.4, 0, 82], Math.PI, ashed(hex("#3b5a78"), k));
  void t;
}

/** A swing set in a front yard. The seat's still moving. */
function swing(out: Tri[], t: number, at: V3) {
  const k = settled(t);
  const STEEL = ashed(hex("#7d8388"), k * 0.8), SEAT = ashed(hex("#b5382c"), k * 0.35);
  const h = 2.4, w = 1.9;
  for (const x of [-w, w]) {
    limb(out, [at[0] + x, 0, at[2] - 0.7], [at[0] + x, h, at[2]], 0.04, 0.04, STEEL, 4);
    limb(out, [at[0] + x, 0, at[2] + 0.7], [at[0] + x, h, at[2]], 0.04, 0.04, STEEL, 4);
  }
  limb(out, [at[0] - w, h, at[2]], [at[0] + w, h, at[2]], 0.045, 0.045, STEEL, 4);
  const a = 0.42 * Math.sin(t * 1.7) * Math.exp(-(t - 60) * 0.1);
  for (const sx of [-0.8, 0.8]) {
    const sdz = Math.sin(a) * 1.75, sdy = Math.cos(a) * 1.75;
    const seat: V3 = [at[0] + sx, h - sdy, at[2] + sdz];
    for (const dx of [-0.2, 0.2]) limb(out, [seat[0] + dx, h, at[2]], [seat[0] + dx, seat[1], seat[2]], 0.012, 0.012, STEEL, 3);
    box(out, { pos: seat, yaw: 0, pitch: -a, size: [0.46, 0.04, 0.18] }, { color: SEAT });
  }
}

/** Washing on a line, which nobody's coming back for. */
function laundry(out: Tri[], t: number, a: V3, b: V3) {
  const k = settled(t);
  const CLOTH = ["#e7e3d6", "#c44e3a", "#9fb4c2", "#e7e3d6", "#d8b24a"].map(hex);
  limb(out, [a[0], 0, a[2]], a, 0.04, 0.04, hex("#55534c"), 4);
  limb(out, [b[0], 0, b[2]], b, 0.04, 0.04, hex("#55534c"), 4);
  limb(out, a, b, 0.008, 0.008, hex("#2c2b28"), 3);
  CLOTH.forEach((c, i) => {
    const u = (i + 0.7) / (CLOTH.length + 0.4);
    const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, z = a[2] + (b[2] - a[2]) * u;
    const sway = 0.14 * Math.sin(t * 2.6 + i * 1.9);
    const w = 0.34, h = 0.72;
    poly(out, [[x - w, y, z], [x + w, y, z], [x + w + sway * 0.5, y - h, z + sway], [x - w + sway * 0.5, y - h * 0.96, z + sway]], ashed(c, k * 0.5));
  });
}

const SWING: V3 = [-9.5, 0, 23];

/** The town, at reel time t (shot 10's interlude). */
export function townFrame(t: number): { frame: Frame; fx: Fx } {
  const tris: Tri[] = [];
  street(tris, t);
  swing(tris, t, SWING);
  laundry(tris, t, [-12.6, 2, 46], [-7.6, 2, 53]);
  let camera: Camera;
  if (t < 61.2) {
    // The swing, close, from low in the grass, drifting sideways.
    const k = (t - 60) / 1.2;
    camera = { pos: [lerp(-4.9, -5.6, k), 0.9, SWING[2] - 4.4], target: [SWING[0], 1.35, SWING[2]], fov: 44 };
  } else {
    // The street, empty and slowly filling, the washing still blowing.
    const k = (t - 61.2) / 1.2;
    camera = { pos: [lerp(-4.2, -4.8, k), 1.25, lerp(40, 41.5, k)], target: [-11, 1.7, 53], fov: 46 };
  }
  ashfall(tris, camera, t * 1.2, 1, { n: 760, reach: 20, speed: 1.1, size: 0.04, color: hex("#d6d4c1") });
  return { frame: { tris, camera: shake(camera, t, 0.012), env: ENV }, fx: NO_FX };
}
