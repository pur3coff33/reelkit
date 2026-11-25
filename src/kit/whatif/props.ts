// Street furniture and set pieces the episodes share: traffic lights, a petrol station, a shopfront, tents, a water
// tanker, a rescue truck, a cell tower, generator smoke, flashlight beams. 1 unit = 1 metre, facing +z at yaw 0.
import { hex, mixRGB, type Glow, type RGB, type Tri, type V3 } from "../lowpoly/engine";
import { box, octa, poseFn, rng } from "../lowpoly/world";
import { limb, poly, truck } from "../../../apps/typhoon/models";

const METAL = hex("#3a3e45"), WHITE = hex("#e9e6de"), DARK = hex("#16191e");

type P = (x: number, y: number, z: number, s: V3, c: RGB, extra?: Partial<Tri>) => void;
function parts(out: Tri[], pos: V3, yaw: number): { P: P; T: (v: V3) => V3 } {
  const T = poseFn({ pos, yaw });
  return { T, P: (x, y, z, s, c, extra = {}) => box(out, { pos: T([x, y, z]), yaw, size: s }, { color: c, ...extra }) };
}

/** A traffic light on a pole, its lamps facing +z. `on` 0…1 is how live the lamp is. */
export function trafficLight(out: Tri[], glows: Glow[], pos: V3, yaw: number, lamp: "red" | "amber" | "green", on: number) {
  const { P, T } = parts(out, pos, yaw);
  limb(out, pos, T([0, 5.2, 0]), 0.1, 0.09, METAL, 4);
  P(0, 3.8, 0.15, [0.5, 1.5, 0.4], DARK);
  const ys = { red: 4.95, amber: 4.55, green: 4.15 };
  for (const [name, y] of Object.entries(ys)) {
    const isOn = name === lamp && on > 0.02;
    const c = name === "red" ? hex("#ff3b2f") : name === "amber" ? hex("#ffb21c") : hex("#3dff8a");
    octa(out, { pos: T([0, y, 0.38]), size: [0.15, 0.15, 0.05] }, { color: isOn ? c : mixRGB(c, DARK, 0.85), glow: isOn ? on : 0, zBias: -0.1 });
    if (isOn) glows.push({ p: T([0, y, 0.5]), radius: 1.6, color: c, alpha: 0.85 * on });
  }
}

/** A petrol station: a canopy on four posts over two pump islands, a kiosk behind. Faces +z (the road). */
export function fuelStation(out: Tri[], glows: Glow[], pos: V3, yaw: number, lit: number, brand: RGB = hex("#d23a2a")) {
  const { P, T } = parts(out, pos, yaw);
  for (const x of [-7, 7]) for (const z of [-4, 4]) P(x, 0, z, [0.5, 5.2, 0.5], WHITE);
  P(0, 5.2, 0, [17, 0.9, 11], WHITE);
  P(0, 5.25, 5.52, [17, 0.7, 0.06], brand);
  P(0, 5.25, -5.52, [17, 0.7, 0.06], brand);
  // The canopy's underside lights.
  if (lit > 0.02) for (const x of [-4.5, 0, 4.5]) for (const z of [-2.5, 2.5]) glows.push({ p: T([x, 5, z]), radius: 4, color: hex("#f4f8ff"), alpha: 0.5 * lit });
  for (const x of [-3.5, 3.5]) {
    P(x, 0, 0, [1.4, 0.25, 6], hex("#b9b6ad"));
    for (const z of [-1.6, 1.6]) {
      P(x, 0.25, z, [0.8, 1.7, 0.5], brand);
      P(x, 1.3, z + 0.26, [0.6, 0.35, 0.02], lit > 0.02 ? hex("#c8f0ff") : DARK, { glow: lit * 0.8, zBias: -0.05 });
    }
  }
  P(0, 0, -11, [14, 4, 6], hex("#d8d2c4"));
  P(0, 0.3, -7.96, [9, 2.6, 0.05], lit > 0.02 ? hex("#ffe9b0") : hex("#26303a"), { glow: lit * 0.7, zBias: -0.05 });
  P(0, 4, -8, [14, 0.8, 0.1], brand);
  // A price sign by the road.
  P(8.5, 0, 7.5, [0.3, 5, 0.3], METAL);
  P(8.5, 5, 7.5, [2.2, 2.6, 0.3], brand);
  P(8.5, 5.4, 7.68, [1.6, 1.6, 0.02], lit > 0.02 ? hex("#fff2c8") : hex("#40342e"), { glow: lit * 0.6, zBias: -0.05 });
}

/** A shopfront: one storey, a big window, an awning, a lit sign. Faces +z. */
export function shopfront(out: Tri[], glows: Glow[], pos: V3, yaw: number, o: { w?: number; lit: number; sign?: RGB; wall?: RGB; shelves?: number }) {
  const { P, T } = parts(out, pos, yaw);
  const w = o.w ?? 12, sign = o.sign ?? hex("#2f7d4a"), wall = o.wall ?? hex("#e2ddd2");
  P(0, 0, -5, [w, 4.2, 10], wall);
  P(0, 0.2, 0.02, [w * 0.7, 2.9, 0.05], o.lit > 0.02 ? hex("#fff0c8") : hex("#1d2530"), { glow: o.lit * 0.75, zBias: -0.05 });
  P(0, 3.2, 0.5, [w + 0.4, 0.15, 1.6], sign);
  P(0, 3.5, 0.06, [w * 0.8, 0.7, 0.08], o.lit > 0.02 ? mixRGB(sign, WHITE, 0.4) : mixRGB(sign, DARK, 0.4), { glow: o.lit * 0.8, zBias: -0.06 });
  // Shelves seen through the glass: emptier as `shelves` falls.
  const full = o.shelves ?? 1;
  const r = rng(5);
  for (let s = 0; s < 3; s++)
    for (let k = 0; k < 10; k++) {
      if (r() > full) continue;
      P(-w * 0.32 + (k / 9) * w * 0.64, 0.5 + s * 0.8, -1.2, [w * 0.05, 0.4, 0.4], [hex("#d04a3a"), hex("#3a7ad0"), hex("#e0c04a"), hex("#4aa060")][Math.floor(r() * 4)]);
    }
  if (o.lit > 0.02) glows.push({ p: T([0, 1.6, 1]), radius: w * 0.5, color: hex("#fff1d0"), alpha: 0.35 * o.lit });
}

/** A relief tent: a box with a pitched top. */
export function tent(out: Tri[], pos: V3, yaw: number, color: RGB = hex("#e8e2d0"), w = 5, d = 4) {
  const T = poseFn({ pos, yaw });
  const h = 2.1, top = 3.2;
  const v = (x: number, y: number, z: number) => T([x, y, z]);
  const shade = mixRGB(color, [0, 0, 0], 0.12);
  poly(out, [v(-w / 2, 0, d / 2), v(w / 2, 0, d / 2), v(w / 2, h, d / 2), v(-w / 2, h, d / 2)], color);
  poly(out, [v(-w / 2, 0, -d / 2), v(w / 2, 0, -d / 2), v(w / 2, h, -d / 2), v(-w / 2, h, -d / 2)], shade);
  poly(out, [v(-w / 2, h, d / 2), v(w / 2, h, d / 2), v(w / 2, top, 0), v(-w / 2, top, 0)], color);
  poly(out, [v(-w / 2, h, -d / 2), v(w / 2, h, -d / 2), v(w / 2, top, 0), v(-w / 2, top, 0)], shade);
  for (const x of [-w / 2, w / 2]) poly(out, [v(x, 0, -d / 2), v(x, 0, d / 2), v(x, h, d / 2), v(x, top, 0), v(x, h, -d / 2)], mixRGB(color, [0, 0, 0], 0.06));
}

/** A water tanker: a truck carrying a round tank. */
export function tanker(out: Tri[], pos: V3, yaw: number) {
  truck(out, pos, yaw, hex("#2f6db0"));
  const T = poseFn({ pos, yaw });
  limb(out, T([0, 1.9, 0.6]), T([0, 1.9, -3.4]), 1.05, 1.05, hex("#dfe3e6"), 8);
  box(out, { pos: T([0, 1.8, -3.45]), yaw, size: [0.3, 0.3, 0.3] }, { color: hex("#2f6db0") });
}

/** A rescue truck with a light bar flashing red and blue. */
export function rescueTruck(out: Tri[], glows: Glow[], pos: V3, yaw: number, t: number) {
  truck(out, pos, yaw, hex("#e8e4da"));
  const T = poseFn({ pos, yaw });
  box(out, { pos: T([0, 0.9, -1.25]), yaw, size: [2.32, 1.2, 4.6] }, { color: hex("#e8e4da") });
  box(out, { pos: T([0, 1.35, -1.25]), yaw, size: [2.34, 0.25, 4.62] }, { color: hex("#d8332a") });
  const phase = Math.floor(t * 6) % 2;
  for (const side of [-1, 1]) {
    const red = (side < 0) === (phase === 0);
    const c = red ? hex("#ff2a22") : hex("#2a6bff");
    const p = T([side * 0.55, 2.1, 2.3]);
    octa(out, { pos: p, size: [0.4, 0.14, 0.2] }, { color: c, glow: 1 });
    glows.push({ p, radius: 3.2, color: c, alpha: 0.7 }, { p, radius: 0.8, color: hex("#ffffff"), alpha: 0.6 });
  }
}

/** A lattice cell tower with antennas and a red beacon on top. */
export function cellTower(out: Tri[], glows: Glow[], pos: V3, h: number, beacon: number) {
  const legs: V3[] = [[-2.2, 0, -2.2], [2.2, 0, -2.2], [2.2, 0, 2.2], [-2.2, 0, 2.2]];
  const at = (k: V3, y: number): V3 => {
    const s = 1 - (y / h) * 0.78;
    return [pos[0] + k[0] * s, pos[1] + y, pos[2] + k[2] * s];
  };
  const steel = hex("#8a9098");
  for (const k of legs) limb(out, at(k, 0), at(k, h), 0.12, 0.08, steel, 3);
  for (let y = 0; y < h - 1; y += 5) {
    for (let i = 0; i < 4; i++) {
      const a = legs[i], b = legs[(i + 1) % 4];
      limb(out, at(a, y), at(b, y + 5), 0.05, 0.05, steel, 3);
      limb(out, at(b, y), at(a, y + 5), 0.05, 0.05, steel, 3);
    }
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    box(out, { pos: [pos[0] + Math.cos(a) * 1.3, pos[1] + h - 4.5, pos[2] + Math.sin(a) * 1.3], yaw: -a + Math.PI / 2, size: [0.5, 2.4, 0.2] }, { color: WHITE });
  }
  const top: V3 = [pos[0], pos[1] + h + 0.6, pos[2]];
  limb(out, [pos[0], pos[1] + h - 1, pos[2]], top, 0.08, 0.05, steel, 3);
  octa(out, { pos: top, size: 0.3 }, { color: beacon > 0.05 ? hex("#ff3a2c") : hex("#4a1a18"), glow: beacon });
  if (beacon > 0.05) glows.push({ p: top, radius: 8, color: hex("#ff3a2c"), alpha: 0.9 * beacon });
  box(out, { pos: [pos[0] + 4, pos[1], pos[2] + 3], size: [3, 2.4, 2] }, { color: hex("#c8c4b8") });
}

/** A diesel generator: a box with a stack, puffing smoke while it runs. */
export function generator(out: Tri[], pos: V3, yaw: number, t: number, running = 1) {
  const { P, T } = parts(out, pos, yaw);
  P(0, 0, 0, [3.2, 1.8, 1.6], hex("#d9b23a"));
  P(0, 0, 0, [3.3, 0.25, 1.7], DARK);
  P(-0.9, 1.8, 0, [0.25, 0.9, 0.25], DARK);
  if (running <= 0) return;
  const shake = Math.sin(t * 90) * 0.01;
  P(0.6, 1.8 + shake, 0, [1.2, 0.2, 1], hex("#b8952e"));
  smoke(out, T([-0.9, 2.8, 0]), t, running, 7);
}

/** Smoke rising and spreading from a point. */
export function smoke(out: Tri[], from: V3, t: number, amount = 1, seed = 1, rise = 1.4) {
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const life = 3.2, off = r() * life;
    const age = (t + off) % life;
    const k = age / life;
    const p: V3 = [from[0] + Math.sin(i * 2.3) * k * 1.5 + k * 1.2, from[1] + age * rise, from[2] + Math.cos(i * 1.7) * k * 1.2];
    octa(out, { pos: p, yaw: i + t * 0.3, size: 0.35 + k * 1.3 }, { color: mixRGB(hex("#6a6a6a"), hex("#a8a8a4"), k), alpha: (1 - k) * 0.5 * amount });
  }
}

/** A flashlight's beam: a see-through cone of light from `from` towards `to`, and a spot where it lands. */
export function beam(out: Tri[], glows: Glow[], from: V3, to: V3, strength = 1, spread = 0.28) {
  const d: V3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const n: V3 = [d[0] / len, d[1] / len, d[2] / len];
  const up: V3 = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u: V3 = [n[1] * up[2] - n[2] * up[1], n[2] * up[0] - n[0] * up[2], n[0] * up[1] - n[1] * up[0]];
  const ul = Math.hypot(u[0], u[1], u[2]);
  const w: V3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const R = len * spread;
  const ring = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    const c = Math.cos(a) * R / ul, s = Math.sin(a) * R / ul;
    return [to[0] + u[0] * c + w[0] * s, to[1] + u[1] * c + w[1] * s, to[2] + u[2] * c + w[2] * s] as V3;
  });
  for (let i = 0; i < 6; i++) out.push({ a: from, b: ring[i], c: ring[(i + 1) % 6], color: hex("#fff3d0"), glow: 1, alpha: 0.13 * strength, zBias: -0.5 });
  glows.push({ p: from, radius: 0.6, color: hex("#ffffff"), alpha: 0.9 * strength }, { p: to, radius: R * 1.4, color: hex("#ffe9b8"), alpha: 0.4 * strength });
}

/** A small hand-held light: a phone screen, a candle. */
export const handLight = (glows: Glow[], p: V3, color: RGB, alpha: number, radius = 0.9) => glows.push({ p, radius, color, alpha }, { p, radius: radius * 0.25, color: hex("#ffffff"), alpha: alpha * 0.8 });

/** A jug of water, carried or stacked. */
export const jug = (out: Tri[], p: V3, size = 1) => box(out, { pos: p, size: [0.28 * size, 0.42 * size, 0.28 * size] }, { color: hex("#5aa8e6") });
