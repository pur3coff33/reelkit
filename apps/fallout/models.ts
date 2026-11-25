// The story's own things: the family, the clock that runs through it, the phone, and ash. 1 unit = 1 metre.
import { hex, mixRGB, type Camera, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { octa, poseFn, rng } from "../../src/kit/lowpoly/world";
import { limb, poly, villager, type Look } from "../typhoon/models";

const SKIN = hex("#a87a55");
const HAIR = hex("#17120f");
const DARK = hex("#23252b");
const MUSTARD = hex("#d6a01c"), NAVY = hex("#1f3560"), RED = hex("#d22a24");

/** The parent downtown: the mustard coat. */
export const CITY_PARENT: Look = { skin: SKIN, hair: HAIR, top: MUSTARD, collar: MUSTARD, bottom: hex("#2b2f38"), shoes: DARK, height: 1.72, hairStyle: "short", faceless: true };
/** The parent at the station: the navy jacket. */
export const STATION_PARENT: Look = { skin: SKIN, hair: HAIR, top: NAVY, collar: NAVY, bottom: hex("#39404c"), shoes: DARK, height: 1.66, hairStyle: "bun", build: 0.92, faceless: true };
/** The child, about 8: the red raincoat. */
export const CHILD: Look = { skin: SKIN, hair: HAIR, top: RED, collar: RED, bottom: hex("#2e3a52"), shoes: hex("#6e2a26"), height: 1.26, hairStyle: "kid", build: 0.72, faceless: true };

/** A stranger, with no face like everyone else. */
export function stranger(seed: number): Look {
  const r = rng(seed * 13 + 5)();
  const v = villager(seed, r < 0.14 ? "child" : r < 0.56 ? "woman" : "man");
  // The mustard coat and the red raincoat have to stand out in any crowd, so nobody else wears anything near them.
  const clash = v.top[0] > 180 && v.top[2] < 90;
  return { ...v, top: clash ? hex("#4a6a82") : v.top, cap: undefined, faceless: true };
}

/** The same person, in less light: the kit's heads glow a little, so a dark scene has to darken the skin itself. */
export const inDark = (L: Look, k: number): Look => ({ ...L, skin: mixRGB(L.skin, [0, 0, 0], k), hair: mixRGB(L.hair, [0, 0, 0], k) });

/** A far-off figure: a three-sided body and a small head. */
export function tinyPerson(out: Tri[], x: number, y: number, z: number, color: RGB, height = 1.7, lean = 0) {
  limb(out, [x, y, z], [x, y + height * 0.8, z + lean], 0.2, 0.24, color, 3);
  octa(out, { pos: [x, y + height * 0.92, z + lean], size: 0.14 }, { color: SKIN });
}

/** `lift` moves the whole clock forward in the painter's order, so a big wall behind it can't be drawn over it. */
/** Where a point's shadow lands on the plane y = `y`, for light from direction `sun`. */
export const onGround = (p: V3, sun: V3, y: number): V3 => {
  const k = (p[1] - y) / sun[1];
  return [p[0] - sun[0] * k, y, p[2] - sun[2] * k];
};

function hull(pts: V3[]): V3[] {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  const turn = (o: V3, a: V3, b: V3) => (a[0] - o[0]) * (b[2] - o[2]) - (a[2] - o[2]) * (b[0] - o[0]);
  const half = (list: V3[]) => {
    const h: V3[] = [];
    for (const p of list) {
      while (h.length >= 2 && turn(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...half(s), ...half([...s].reverse())];
}

/** The shadow a box throws: one flat, see-through shape on the ground, so a wall's faces don't stack up darker. */
export function boxShadow(out: Tri[], x0: number, x1: number, z0: number, z1: number, h: number, sun: V3, y: number, alpha: number, zBias: number, color: RGB = [8, 12, 26]) {
  const foot: V3[] = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
  const top = foot.map((p): V3 => onGround([p[0], y + h, p[2]], sun, y));
  poly(out, hull([...foot, ...top]), color, { alpha, zBias });
}

/** A person's shadow: a long tapering shape from their feet. */
export function personShadow(out: Tri[], x: number, y: number, z: number, height: number, sun: V3, alpha: number, zBias: number, color: RGB = [8, 12, 26]) {
  const tip = onGround([x, y + height, z], sun, y);
  const dx = tip[0] - x, dz = tip[2] - z, len = Math.hypot(dx, dz) || 1;
  const px = (-dz / len) * 0.2, pz = (dx / len) * 0.2;
  poly(out, [[x + px, y + 0.005, z + pz], [tip[0] + px * 0.3, y + 0.005, tip[2] + pz * 0.3], [tip[0] - px * 0.3, y + 0.005, tip[2] - pz * 0.3], [x - px, y + 0.005, z - pz]], color, { alpha, zBias });
}

export type ClockLook = { rim?: RGB; dial?: RGB; hands?: RGB; glow?: number; broken?: boolean; lift?: number };

/** A clock face, facing +z at yaw 0, on a rim. The hands read `hours` : `minutes`. */
export function clockFace(out: Tri[], c: V3, yaw: number, R: number, hours: number, minutes: number, look: ClockLook = {}, pitch = 0, roll = 0) {
  const T = poseFn({ pos: c, yaw, pitch, roll });
  const rim = look.rim ?? hex("#2c2f35"), dial = look.dial ?? hex("#f3ecd8"), hands = look.hands ?? hex("#14161b");
  const glow = look.glow ?? 0, lift = -(look.lift ?? 0);
  const disc = (r: number, z: number, n = 24): V3[] => Array.from({ length: n }, (_, i) => T([Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r, z]));
  poly(out, disc(R * 1.1, -0.02 * R), rim, { zBias: lift });
  poly(out, disc(R, 0), dial, { zBias: lift - R * 0.1, glow });
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2, big = h % 3 === 0;
    const s = Math.sin(a), k = Math.cos(a), r0 = R * (big ? 0.72 : 0.8), r1 = R * 0.93, w = R * (big ? 0.05 : 0.025);
    poly(out, [T([s * r0 - k * w, k * r0 + s * w, 0.01 * R]), T([s * r1 - k * w, k * r1 + s * w, 0.01 * R]), T([s * r1 + k * w, k * r1 - s * w, 0.01 * R]), T([s * r0 + k * w, k * r0 - s * w, 0.01 * R])], hands, { zBias: lift - R * 0.2 });
  }
  const hand = (a: number, len: number, w: number, z: number) => {
    const s = Math.sin(a), k = Math.cos(a);
    poly(out, [T([-k * w - s * R * 0.08, s * w - k * R * 0.08, z]), T([s * len - k * w * 0.35, k * len + s * w * 0.35, z]), T([s * len + k * w * 0.35, k * len - s * w * 0.35, z]), T([k * w - s * R * 0.08, -s * w - k * R * 0.08, z])], hands, { zBias: lift - R * 0.3 - z });
  };
  const minuteA = (minutes / 60) * Math.PI * 2;
  const hourA = (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;
  hand(hourA, R * 0.52, R * 0.075, 0.02 * R);
  hand(minuteA, R * 0.84, R * 0.052, 0.03 * R);
  poly(out, Array.from({ length: 8 }, (_, i) => T([Math.cos((i / 8) * Math.PI * 2) * R * 0.08, Math.sin((i / 8) * Math.PI * 2) * R * 0.08, 0.04 * R])), hands, { zBias: lift - R * 0.5 });
  if (look.broken) {
    // Cracks across the glass.
    for (const [a, b, w] of [[0.4, 2.7, 0.018], [1.5, 4.4, 0.012], [3.1, 5.6, 0.015]] as const) {
      const p = (q: number): V3 => T([Math.cos(q) * R * 0.96, Math.sin(q) * R * 0.96, 0.05 * R]);
      const A = p(a), B = p(b);
      poly(out, [A, B, [B[0], B[1] + w * R, B[2]], [A[0], A[1] + w * R, A[2]]], hex("#6d6a60"), { zBias: lift - R * 0.6 });
    }
  }
}

export const PHONE_W = 0.075, PHONE_H = 0.16;

/**
 * A phone standing in its own plane (facing +z at yaw 0), centred on `c`. Returns the screen's corners, top-left and
 * bottom-right, for laying text over it.
 */
export function phone(out: Tri[], c: V3, yaw: number, screen: RGB, lit: number, pitch = 0, roll = 0, zBias = -0.05): { tl: V3; br: V3 } {
  const T = poseFn({ pos: c, yaw, pitch, roll });
  const w = PHONE_W / 2, h = PHONE_H / 2, d = 0.004;
  const body = hex("#15171c");
  const q = (a: V3, b: V3, e: V3, f: V3, color: RGB, extra: Partial<Tri> = {}) => poly(out, [T(a), T(b), T(e), T(f)], color, extra);
  q([-w, -h, -d], [w, -h, -d], [w, h, -d], [-w, h, -d], body);
  q([-w, -h, -d], [-w, -h, d], [-w, h, d], [-w, h, -d], body);
  q([w, -h, -d], [w, -h, d], [w, h, d], [w, h, -d], body);
  q([-w, h, -d], [w, h, -d], [w, h, d], [-w, h, d], body);
  q([-w, -h, -d], [w, -h, -d], [w, -h, d], [-w, -h, d], body);
  q([-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d], body, { zBias });
  const m = 0.004;
  q([-w + m, -h + m, d + 0.0005], [w - m, -h + m, d + 0.0005], [w - m, h - m, d + 0.0005], [-w + m, h - m, d + 0.0005], mixRGB(body, screen, lit), { glow: lit, zBias: zBias * 2 });
  return { tl: T([-w + m, h - m, d]), br: T([w - m, -h + m, d]) };
}

/** Ash falling around the camera: a box of flakes that follows it and wraps, so it never runs out. */
export function ashfall(out: Tri[], cam: Camera, t: number, amount: number, opts: { n?: number; color?: RGB; reach?: number; speed?: number; size?: number; lens?: V3 } = {}) {
  if (amount <= 0) return;
  const n = Math.round((opts.n ?? 420) * amount);
  const reach = opts.reach ?? 26, speed = opts.speed ?? 0.9, size = opts.size ?? 0.045;
  const color = opts.color ?? hex("#c9c7bb");
  const r = rng(77);
  const wrap = (v: number, c: number) => c + (((v - c) % reach) + reach * 1.5) % reach - reach / 2;
  for (let i = 0; i < n; i++) {
    const a = r(), b = r(), e = r(), f = r();
    const fall = t * speed * (0.7 + 0.6 * f);
    const x = wrap(a * reach + Math.sin(t * 0.7 + i) * 0.4, cam.pos[0]);
    const y = wrap(b * reach - fall, cam.pos[1]);
    const z = wrap(e * reach + Math.cos(t * 0.5 + i * 2) * 0.4, cam.pos[2]);
    if (y < 0.02) continue;
    // A flake right up against the lens would fill the frame.
    const lens = opts.lens ?? cam.pos;
    if (Math.hypot(x - lens[0], y - lens[1], z - lens[2]) < 1.5) continue;
    const s = size * (0.6 + f);
    out.push({ a: [x, y, z], b: [x + s * 1.3, y + s * 0.4, z + s * 0.2], c: [x + s * 0.3, y - s, z - s * 0.4], color, glow: 0.55, alpha: 0.85, zBias: -0.01 });
  }
}
