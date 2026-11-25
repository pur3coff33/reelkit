// The things in the typhoon world as low-poly solids: people with faces and jointed limbs, Philippine houses, bangkas,
// jeepneys and tricycles, palms and power poles. Everything is 1 unit = 1 metre and faces +z at yaw 0.
import { add, clamp01, cross, dot, hex, length, mixRGB, norm, scale, sub, type RGB, type Tri, type V3 } from "../../src/kit/lowpoly/engine";
import { box, hash2, icosphere, octa, poseFn, rng, tetra } from "../../src/kit/lowpoly/world";

type T3 = (v: V3) => V3;

const shadeBy = (c: RGB, k: number): RGB => mixRGB(c, [0, 0, 0], k);

/** A convex polygon, fanned into triangles. */
export function poly(out: Tri[], pts: V3[], color: RGB, extra: Partial<Tri> = {}) {
  for (let i = 1; i < pts.length - 1; i++) out.push({ a: pts[0], b: pts[i], c: pts[i + 1], color, ...extra });
}

/** A tapered prism between two points, for limbs, trunks and poles. */
export function limb(out: Tri[], a: V3, b: V3, ra: number, rb: number, color: RGB, sides = 5, extra: Partial<Tri> = {}) {
  const axis = norm(sub(b, a));
  const u = norm(cross(axis, Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const v = cross(axis, u);
  const ring = (c: V3, r: number) => Array.from({ length: sides }, (_, i) => {
    const q = (i / sides) * Math.PI * 2;
    return add(c, add(scale(u, Math.cos(q) * r), scale(v, Math.sin(q) * r)));
  });
  const A = ring(a, ra), B = ring(b, rb);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const c = i % 2 ? color : shadeBy(color, 0.05);
    out.push({ a: A[i], b: A[j], c: B[j], color: c, ...extra }, { a: A[i], b: B[j], c: B[i], color: c, ...extra });
  }
  poly(out, B, color, extra);
}

/** The middle joint of a two-bone limb from `a` reaching for `target`, bent towards `hint`. */
function ik(a: V3, target: V3, l1: number, l2: number, hint: V3): V3 {
  const d = sub(target, a);
  const dist = Math.min(length(d), l1 + l2 - 1e-3);
  const dir = norm(d);
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist || 1);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const perp = norm(sub(hint, scale(dir, dot(hint, dir))));
  return add(add(a, scale(dir, x)), scale(perp, h));
}

// ── People ───────────────────────────────────────────────────────────────────────────────────────────

export type Look = {
  skin: RGB;
  hair: RGB;
  top: RGB;
  bottom: RGB;
  shoes: RGB;
  height: number;
  /** Shoulder width factor. */
  build?: number;
  hairStyle: "short" | "bob" | "long" | "grey" | "kid" | "bun";
  skirt?: boolean;
  shorts?: boolean;
  cap?: RGB;
  hardhat?: RGB;
  glasses?: boolean;
  /** A lighter inner layer at the collar (a shirt under a blazer or jacket). */
  collar?: RGB;
  /** A life vest or hi-vis worn over the top. */
  vest?: RGB;
  /** A small gold pin on the left of the chest. */
  pin?: boolean;
  /** No eyes, brows, nose or mouth at any lod: a smooth faceted head. */
  faceless?: boolean;
};

export type Pose = {
  pos: V3;
  yaw: number;
  /** Lean forward, metres at the shoulders. */
  lean?: number;
  /** How far the hips drop (metres): crouching, sitting. */
  drop?: number;
  /** Walk phase (radians) and how much of a stride. */
  phase?: number;
  walk?: number;
  /** Targets in body space (+z forward, +x to the side, y up from the ground). */
  handL?: V3;
  handR?: V3;
  footL?: V3;
  footR?: V3;
  headYaw?: number;
  headPitch?: number;
  /** 0 closed … 1 wide open. */
  mouth?: number;
  blink?: boolean;
  /** 0 a distant figure, 1 mid shot, 2 close-up. */
  lod?: number;
};

const SKIN_A = hex("#a87a55"), SKIN_B = hex("#8f6242"), SKIN_C = hex("#b98a63"), SKIN_D = hex("#7b5238");
const BLACK_HAIR = hex("#14100e");
const DARK = hex("#23252b");

export const CAST: Record<string, Look> = {
  carmela: { skin: SKIN_C, hair: BLACK_HAIR, top: hex("#16305c"), collar: hex("#f1ece2"), bottom: hex("#16305c"), shoes: DARK, height: 1.62, hairStyle: "bob", pin: true, build: 0.92 },
  ocampo: { skin: SKIN_A, hair: hex("#3c3a3a"), top: hex("#3a3e46"), collar: hex("#dfe6ee"), bottom: hex("#2c2f35"), shoes: DARK, height: 1.72, hairStyle: "short", glasses: true },
  liza: { skin: SKIN_C, hair: BLACK_HAIR, top: hex("#1c62b8"), collar: hex("#123f7c"), bottom: hex("#25282e"), shoes: DARK, height: 1.6, hairStyle: "bun", build: 0.92 },
  miguel: { skin: SKIN_A, hair: BLACK_HAIR, top: hex("#1c62b8"), collar: hex("#123f7c"), bottom: hex("#25282e"), shoes: DARK, height: 1.74, hairStyle: "short" },
  tomas: { skin: SKIN_D, hair: hex("#8d8a84"), top: hex("#76876e"), bottom: hex("#4c4336"), shorts: true, shoes: hex("#2f5c70"), height: 1.66, hairStyle: "grey", cap: hex("#a8562f") },
  nena: { skin: SKIN_B, hair: BLACK_HAIR, top: hex("#c75b6b"), bottom: hex("#3b4a68"), shoes: hex("#b0523d"), height: 1.56, hairStyle: "long", build: 0.9 },
  jun: { skin: SKIN_B, hair: BLACK_HAIR, top: hex("#e0b13c"), bottom: hex("#2f4d7a"), shorts: true, shoes: hex("#3d8f6b"), height: 1.26, hairStyle: "kid", build: 0.72 },
  cora: { skin: SKIN_C, hair: hex("#2c2826"), top: hex("#e8e4d8"), bottom: hex("#39506e"), skirt: true, shoes: DARK, height: 1.58, hairStyle: "bun", glasses: true, build: 0.92 },
  kap: { skin: SKIN_A, hair: BLACK_HAIR, top: hex("#d9c44a"), bottom: hex("#2d3036"), shoes: DARK, height: 1.7, hairStyle: "short", cap: hex("#24355c") },
  pacing: { skin: SKIN_B, hair: hex("#c9c6c0"), top: hex("#8a6aa0"), bottom: hex("#5e4a6e"), skirt: true, shoes: hex("#6e5a48"), height: 1.46, hairStyle: "bun", build: 0.86 },
  cruz: { skin: SKIN_A, hair: hex("#2a2826"), top: hex("#e7e1cf"), bottom: hex("#2a2c32"), shoes: DARK, height: 1.7, hairStyle: "short", glasses: true },
};

const CROWD_TOPS = ["#c94f3d", "#3f7ea6", "#e6e0d0", "#5d8a55", "#d9a441", "#7a5a9a", "#2f4f6f", "#b86a8c", "#8c8c84"].map(hex);
const CROWD_BOTTOMS = ["#2c3b52", "#3d3a36", "#5a4c3a", "#22252a", "#6a6f78"].map(hex);
const SKINS = [SKIN_A, SKIN_B, SKIN_C, SKIN_D];

/** A stranger, the same every frame for the same seed. */
export function villager(seed: number, kind: "man" | "woman" | "child" | "elder" = "man"): Look {
  const r = rng(seed * 31 + 7);
  const top = CROWD_TOPS[Math.floor(r() * CROWD_TOPS.length)], bottom = CROWD_BOTTOMS[Math.floor(r() * CROWD_BOTTOMS.length)], skin = SKINS[Math.floor(r() * 4)];
  const base: Look = { skin, hair: BLACK_HAIR, top, bottom, shoes: DARK, height: 1.66, hairStyle: "short" };
  if (kind === "woman") return { ...base, height: 1.54 + r() * 0.08, hairStyle: r() < 0.5 ? "long" : "bob", build: 0.9, skirt: r() < 0.3 };
  if (kind === "child") return { ...base, height: 1.0 + r() * 0.3, hairStyle: "kid", build: 0.7, shorts: true };
  if (kind === "elder") return { ...base, height: 1.5, hair: hex("#bdbab4"), hairStyle: "grey", build: 0.88 };
  return { ...base, height: 1.62 + r() * 0.12, shorts: r() < 0.3, cap: r() < 0.25 ? CROWD_TOPS[Math.floor(r() * CROWD_TOPS.length)] : undefined };
}

function isHair(d: V3, style: Look["hairStyle"]) {
  const front = clamp01((d[2] + 0.2) / 0.9);
  const line = -0.38 + front * front * (3 - 2 * front) * 0.92;
  const low = style === "long" ? -0.62 : style === "bob" ? -0.5 : style === "bun" ? -0.42 : -0.32;
  const hairline = d[2] < 0 ? Math.max(low, line) : line;
  return d[1] > (d[2] < 0 ? low : hairline) && !(d[2] > 0.25 && d[1] < 0.5 && Math.abs(d[0]) < 0.82);
}

function head(out: Tri[], c: V3, yaw: number, pitch: number, R: number, L: Look, mouth: number, blink: boolean, lod: number) {
  const T = poseFn({ pos: c, yaw, pitch });
  const { v, f } = icosphere(lod >= 2 ? 2 : lod >= 1 ? 1 : 0);
  const skinShade = L.skin;
  const place = (d: V3, grow = 1): V3 => {
    let x = d[0] * 0.84, y = d[1] * 1.12, z = d[2] * 0.96;
    if (d[1] < -0.15) {
      const k = (-d[1] - 0.15) / 0.85;
      x *= 1 - 0.42 * k;
      z *= 1 - 0.14 * k;
    }
    return T([x * R * grow, y * R * grow, z * R * grow]);
  };
  for (const [ia, ib, ic] of f) {
    const cd = norm(add(add(v[ia], v[ib]), v[ic]));
    const hair = isHair(cd, L.hairStyle);
    const grow = hair ? 1.07 : 1;
    out.push({ a: place(v[ia], grow), b: place(v[ib], grow), c: place(v[ic], grow), color: hair ? L.hair : skinShade, glow: hair ? 0 : 0.5 });
  }
  if (lod >= 1 && !L.faceless) {
    // The face sits on the head's surface, a hair proud of it and drawn after it.
    const S = (x: number, y: number, off = 0.015): V3 => {
      const q = 1 - (x / 0.84) ** 2 - (y / 1.12) ** 2;
      return T([x * R, y * R, (Math.sqrt(Math.max(0.02, q)) * 0.96 + off) * R]);
    };
    const feat = { zBias: -0.04 };
    const quad = (x: number, y: number, w: number, h: number, color: RGB, off = 0.015, z = feat) => poly(out, [S(x - w, y - h, off), S(x + w, y - h, off), S(x + w, y + h, off), S(x - w, y + h, off)], color, z);
    for (const side of [-1, 1]) {
      const ex = 0.33 * side, ey = 0.16;
      if (blink) quad(ex, ey - 0.01, 0.13, 0.016, shadeBy(L.skin, 0.4));
      else {
        quad(ex, ey, 0.125, 0.06, hex("#efe9df"));
        quad(ex, ey, 0.062, 0.058, hex("#1e140e"), 0.03, { zBias: -0.06 });
      }
      // Brow and the shadow of the socket.
      poly(out, [S(ex - 0.15, ey + 0.11), S(ex + 0.15, ey + 0.12 + 0.015 * side), S(ex + 0.15, ey + 0.17 + 0.015 * side), S(ex - 0.15, ey + 0.16)], shadeBy(L.hair, 0.1), feat);
      if (L.glasses && lod >= 2) {
        const G = hex("#191a1d");
        quad(ex, ey + 0.09, 0.19, 0.012, G, 0.06, { zBias: -0.07 });
        quad(ex, ey - 0.09, 0.19, 0.012, G, 0.06, { zBias: -0.07 });
        quad(ex - 0.18, ey, 0.012, 0.1, G, 0.06, { zBias: -0.07 });
        quad(ex + 0.18, ey, 0.012, 0.1, G, 0.06, { zBias: -0.07 });
      }
      // The ear.
      if (lod >= 2) octa(out, { pos: T([0.86 * R * side, 0.02 * R, -0.02 * R]), yaw, size: [R * 0.08, R * 0.17, R * 0.12] }, { color: shadeBy(L.skin, 0.08) });
    }
    if (L.glasses && lod >= 1 && lod < 2) quad(0, 0.17, 0.5, 0.018, hex("#191a1d"), 0.04, { zBias: -0.07 });
    // The nose: a wedge standing off the face.
    const tip = T([0, -0.05 * R, 1.13 * R]);
    const nl = S(-0.12, -0.1, 0), nr = S(0.12, -0.1, 0), nb = S(0, 0.16, 0);
    out.push({ a: nb, b: nl, c: tip, color: shadeBy(L.skin, 0.02), zBias: -0.05 }, { a: nb, b: nr, c: tip, color: shadeBy(L.skin, 0.1), zBias: -0.05 }, { a: nl, b: nr, c: tip, color: shadeBy(L.skin, 0.3), zBias: -0.05 });
    // The mouth: a dark gap between the lips that opens with speech.
    const lip = mixRGB(shadeBy(L.skin, 0.25), hex("#8e3f3a"), L.hairStyle === "grey" || L.hairStyle === "short" || L.hairStyle === "kid" ? 0.18 : 0.5);
    const open = 0.012 + mouth * 0.085;
    const my = -0.4;
    quad(0, my - open * 0.6, 0.15, open, hex("#2a1210"));
    poly(out, [S(-0.2, my + 0.015), S(0.2, my + 0.015), S(0.13, my + 0.055), S(-0.13, my + 0.055)], lip, feat);
    poly(out, [S(-0.17, my - 2 * open * 0.6 - 0.01), S(0.17, my - 2 * open * 0.6 - 0.01), S(0.1, my - 2 * open * 0.6 - 0.06), S(-0.1, my - 2 * open * 0.6 - 0.06)], shadeBy(lip, 0.1), feat);
  }
  if (L.hairStyle === "bun") octa(out, { pos: T([0, 0.55 * R, -1.02 * R]), size: R * 0.42 }, { color: L.hair });
  if (L.hairStyle === "long") box(out, { pos: T([0, 0.3 * R, -0.75 * R]), yaw, pitch: pitch + 0.04, size: [R * 1.35, -R * 3, R * 0.34] }, { color: L.hair });
  if (L.hairStyle === "bob") for (const side of [-1, 1]) box(out, { pos: T([0.74 * R * side, 0.35 * R, -0.3 * R]), yaw, size: [R * 0.34, -R * 1.25, R * 1.0] }, { color: L.hair });
  if (L.cap) {
    const circle = (r: number, y: number) => Array.from({ length: 8 }, (_, i) => T([Math.cos((i / 8) * Math.PI * 2) * R * r, y * R, Math.sin((i / 8) * Math.PI * 2) * R * r - 0.02 * R]));
    const lo = circle(1.02, 0.4), hi = circle(0.84, 1.04);
    const top = T([0, 1.32 * R, -0.04 * R]);
    lo.forEach((p, i) => {
      const j = (i + 1) % 8, col = i % 2 ? L.cap! : shadeBy(L.cap!, 0.08);
      out.push({ a: p, b: lo[j], c: hi[j], color: col, zBias: -0.03 }, { a: p, b: hi[j], c: hi[i], color: col, zBias: -0.03 }, { a: hi[i], b: hi[j], c: top, color: col, zBias: -0.03 });
    });
    poly(out, [T([-0.72 * R, 0.5 * R, 0.72 * R]), T([0.72 * R, 0.5 * R, 0.72 * R]), T([0.55 * R, 0.38 * R, 1.5 * R]), T([-0.55 * R, 0.38 * R, 1.5 * R])], shadeBy(L.cap, 0.15), { zBias: -0.06 });
  }
  if (L.hardhat) {
    const ring = Array.from({ length: 8 }, (_, i) => T([Math.cos((i / 8) * Math.PI * 2) * R * 1.2, 0.42 * R, Math.sin((i / 8) * Math.PI * 2) * R * 1.25]));
    const top = T([0, 1.35 * R, 0]);
    ring.forEach((p, i) => out.push({ a: top, b: p, c: ring[(i + 1) % 8], color: i % 2 ? L.hardhat! : shadeBy(L.hardhat!, 0.08) }));
  }
}

/** A person standing on `pos`. Hands and feet reach for their targets, and the elbows and knees follow. */
export function person(out: Tri[], L: Look, P: Pose) {
  const H = L.height / 1.7, B = (L.build ?? 1) * H, lod = P.lod ?? 1;
  const T = poseFn({ pos: P.pos, yaw: P.yaw });
  const walk = P.walk ?? 0, phase = P.phase ?? 0;
  const drop = P.drop ?? 0, lean = P.lean ?? 0;
  const bob = walk * Math.abs(Math.cos(phase)) * 0.025;
  const hip: V3 = [0, 0.92 * H - drop + bob, 0];
  const chest: V3 = [0, hip[1] + 0.34 * H, lean * 0.6];
  const neck: V3 = [0, hip[1] + 0.55 * H, lean];
  const headC: V3 = [0, neck[1] + 0.135 * H, lean * 1.1 + 0.01];
  const sides = lod >= 2 ? 6 : lod >= 1 ? 5 : 3;
  const yaw = P.yaw;

  const legLen = 0.46 * H;
  for (const side of [-1, 1]) {
    const hipJ: V3 = [0.09 * B * side, hip[1], 0];
    const stride = Math.sin(phase) * side * 0.3 * walk;
    const foot = (side < 0 ? P.footL : P.footR) ?? ([0.1 * B * side, 0.04 + walk * 0.07 * Math.max(0, Math.cos(phase) * side), stride] as V3);
    const knee = ik(hipJ, foot, legLen, legLen, [0, 0, 1]);
    const legTop = L.skirt ? L.skin : L.bottom, legLow = L.skirt || L.shorts ? L.skin : L.bottom;
    limb(out, T(hipJ), T(knee), 0.075 * B, 0.055 * B, legTop === L.skin && L.shorts ? L.bottom : legTop, sides);
    limb(out, T(knee), T(foot), 0.052 * B, 0.04 * B, legLow, sides);
    box(out, { pos: T([foot[0], Math.max(0, foot[1] - 0.04), foot[2] + 0.05]), yaw, size: [0.09 * B, 0.06, 0.24 * H] }, { color: L.shoes });
  }
  // Torso: a shaped tube, hips to shoulders.
  const rings: [V3, number, number, RGB][] = [
    [[0, hip[1] - 0.05, 0], 0.16, 0.11, L.bottom],
    [[0, hip[1] + 0.1 * H, lean * 0.2], 0.145, 0.1, L.top],
    [[0, hip[1] + 0.3 * H, lean * 0.55], 0.175, 0.115, L.top],
    [[0, hip[1] + 0.47 * H, lean * 0.88], 0.205, 0.1, L.top],
    [[0, neck[1], lean], 0.06, 0.055, L.collar ?? L.top],
  ];
  const n = lod >= 1 ? 8 : 4;
  for (let k = 0; k < rings.length - 1; k++) {
    const [c0, rx0, rz0] = rings[k], [c1, rx1, rz1, col] = rings[k + 1];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const p = (c: V3, rx: number, rz: number, a: number) => T([c[0] + Math.cos(a) * rx * B, c[1], c[2] + Math.sin(a) * rz * B]);
      const shade = i % 2 ? col : shadeBy(col, 0.05);
      out.push({ a: p(c0, rx0, rz0, a0), b: p(c0, rx0, rz0, a1), c: p(c1, rx1, rz1, a1), color: shade }, { a: p(c0, rx0, rz0, a0), b: p(c1, rx1, rz1, a1), c: p(c1, rx1, rz1, a0), color: shade });
    }
  }
  if (L.skirt) {
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
      const p = (y: number, r: number, a: number) => T([Math.cos(a) * r * B, y, Math.sin(a) * r * 0.85 * B]);
      const col = i % 2 ? L.bottom : shadeBy(L.bottom, 0.08);
      out.push({ a: p(hip[1], 0.17, a0), b: p(hip[1], 0.17, a1), c: p(hip[1] - 0.5 * H, 0.23, a1), color: col }, { a: p(hip[1], 0.17, a0), b: p(hip[1] - 0.5 * H, 0.23, a1), c: p(hip[1] - 0.5 * H, 0.23, a0), color: col });
    }
  }
  if (L.vest) {
    box(out, { pos: T([0, hip[1] + 0.1 * H, lean * 0.3]), yaw, size: [0.35 * B, 0.36 * H, 0.235 * B] }, { color: L.vest });
    box(out, { pos: T([0, hip[1] + 0.26 * H, lean * 0.45 + 0.12 * B]), yaw, size: [0.35 * B, 0.028, 0.008] }, { color: hex("#efeadb"), zBias: -0.02 });
  }
  if (L.collar && lod >= 1) {
    // Lapels: an open V of the inner layer at the throat.
    const y0 = hip[1] + 0.3 * H, y1 = hip[1] + 0.5 * H, z = (y: number) => lean * ((y - hip[1]) / (0.55 * H)) + 0.118 * B;
    poly(out, [T([0, y0 + 0.08, z(y0)]), T([0.055 * B, y1, z(y1)]), T([-0.055 * B, y1, z(y1)])], L.collar, { zBias: -0.03 });
  }
  if (L.pin && lod >= 1) octa(out, { pos: T([-0.12 * B, hip[1] + 0.38 * H, lean * 0.7 + 0.12 * B]), size: 0.014 }, { color: hex("#e0b94a"), glow: 0.6, zBias: -0.05 });
  // Arms.
  const armLen = 0.3 * H;
  for (const side of [-1, 1]) {
    const sh: V3 = [0.205 * B * side, hip[1] + 0.46 * H, lean * 0.85];
    const swing = -Math.sin(phase) * side * 0.28 * walk;
    const hand = (side < 0 ? P.handL : P.handR) ?? ([0.25 * B * side, hip[1] - 0.04, swing + lean * 0.5 + 0.03] as V3);
    const elbow = ik(sh, hand, armLen, armLen, [0.5 * side, -0.2, -1]);
    limb(out, T(sh), T(elbow), 0.052 * B, 0.044 * B, L.top, sides);
    limb(out, T(elbow), T(hand), 0.043 * B, 0.034 * B, L.collar === undefined && !L.vest ? L.skin : L.top, sides);
    octa(out, { pos: T(hand), yaw, size: [0.042 * B, 0.05 * H, 0.04 * B] }, { color: L.skin });
  }
  limb(out, T([0, neck[1] - 0.02, lean]), T([0, neck[1] + 0.05, lean * 1.05]), 0.05 * B, 0.048 * B, L.skin, sides);
  head(out, T(headC), yaw + (P.headYaw ?? 0), P.headPitch ?? 0, 0.112 * H, L, P.mouth ?? 0, P.blink ?? false, lod);
}

// ── Trees and wires ──────────────────────────────────────────────────────────────────────────────────

const TRUNK = hex("#6b5540");
const FROND = hex("#3c7a38"), FROND2 = hex("#2f6a32"), COCONUT = hex("#5a4a2c");

/** A coconut palm. `wind` 0…1 bends it down-wind (+x, inland) and streams its fronds; `fall` 0…1 topples it. */
export function palmTree(out: Tri[], base: V3, seed: number, t: number, wind = 0, fall = 0, lod = 1) {
  const r = rng(seed);
  const h = 8.5 + r() * 5, dir = r() * Math.PI * 2, bend = 0.25 + r() * 0.5;
  const gust = wind * (0.72 + 0.28 * Math.sin(t * 2.3 + seed));
  const segs = lod ? 5 : 2;
  let p: V3 = base;
  const fallK = fall * fall * (Math.PI / 2 - 0.05);
  const pts: V3[] = [p];
  for (let i = 1; i <= segs; i++) {
    const k = i / segs, y = k * h;
    const lean = bend * k * k * 1.2;
    const blown = gust * 7 * k * k;
    const x = Math.cos(dir) * lean + blown, z = Math.sin(dir) * lean;
    // Toppling turns the whole tree about its base, towards +x.
    const px = x * Math.cos(fallK) + y * Math.sin(fallK), py = -x * Math.sin(fallK) + y * Math.cos(fallK);
    p = [base[0] + px, base[1] + py, base[2] + z];
    pts.push(p);
  }
  for (let i = 0; i < segs; i++) limb(out, pts[i], pts[i + 1], 0.2 - i * 0.022, 0.2 - (i + 1) * 0.022, TRUNK, lod ? 5 : 3);
  const top = pts[segs];
  const fronds = lod ? 9 : 5;
  for (let k = 0; k < fronds; k++) {
    const a = (k / fronds) * Math.PI * 2 + r() * 0.3;
    const len = 3.2 + r() * 1.3;
    const flap = 0.15 * Math.sin(t * (1.3 + wind * 7) + k * 2.1 + seed) * (0.3 + wind);
    let dx = Math.cos(a), dz = Math.sin(a);
    // Down-wind, every frond streams the same way.
    dx = dx * (1 - gust * 0.85) + gust * 1.1;
    dz = dz * (1 - gust * 0.85) + flap * gust;
    const tip: V3 = [top[0] + dx * len, top[1] - 1.3 * (1 - gust * 0.6) + flap, top[2] + dz * len];
    const mid: V3 = [top[0] + dx * len * 0.5, top[1] + 0.55 * (1 - gust), top[2] + dz * len * 0.5];
    const sx = -dz * 0.55, sz = dx * 0.55;
    const c = k % 2 ? FROND : FROND2;
    out.push({ a: top, b: [mid[0] + sx, mid[1], mid[2] + sz], c: tip, color: c }, { a: top, b: [mid[0] - sx, mid[1], mid[2] - sz], c: tip, color: shadeBy(c, 0.14) });
  }
  if (lod) for (let k = 0; k < 3; k++) octa(out, { pos: [top[0] + Math.cos(k * 2.1) * 0.25, top[1] - 0.25, top[2] + Math.sin(k * 2.1) * 0.25], size: 0.2 }, { color: COCONUT });
}

/** A broad tree (mango, acacia): a trunk and a few faceted crowns. */
export function broadTree(out: Tri[], base: V3, seed: number, wind = 0, lod = 1, bare = 0) {
  const r = rng(seed);
  const h = 3.5 + r() * 2.5;
  limb(out, base, [base[0] + wind * 1.2, base[1] + h, base[2]], 0.28, 0.2, TRUNK, lod ? 5 : 3);
  if (bare > 0.5) {
    for (let k = 0; k < 3; k++) limb(out, [base[0] + wind, base[1] + h, base[2]], [base[0] + wind + (r() - 0.5) * 4, base[1] + h + 1.5 + r(), base[2] + (r() - 0.5) * 4], 0.12, 0.03, TRUNK, 3);
    return;
  }
  for (let k = 0; k < (lod ? 3 : 1); k++) {
    const g = mixRGB(hex("#2f6e34"), hex("#4f8c3d"), r());
    octa(out, { pos: [base[0] + wind * 2 + (r() - 0.5) * 2.2, base[1] + h + r() * 1.4, base[2] + (r() - 0.5) * 2.2], yaw: r() * 6, size: [2.1 + r(), 1.6 + r() * 0.5, 2.1 + r()] }, (i) => ({ color: shadeBy(g, (i % 4) * 0.06) }));
  }
}

const POLE = hex("#5a5148");

/** A power pole. `fall` 0…1 topples it towards +x. */
export function powerPole(out: Tri[], base: V3, fall = 0) {
  const a = fall * fall * 1.45;
  const up = (y: number, x = 0): V3 => [base[0] + x * Math.cos(a) + y * Math.sin(a), base[1] + y * Math.cos(a) - x * Math.sin(a), base[2]];
  limb(out, base, up(8.5), 0.13, 0.09, POLE, 4);
  const top = up(8.2);
  box(out, { pos: top, yaw: Math.PI / 2, roll: -a, size: [1.9, 0.08, 0.1] }, { color: POLE });
}

/** The top of a standing pole, where its wires hang from. */
export const poleTop = (base: V3): V3 => [base[0], base[1] + 8.25, base[2]];

/** A sagging wire, as thin ribbons. */
export function wire(out: Tri[], a: V3, b: V3, sag = 0.7, color: RGB = hex("#1b1b1d")) {
  const n = 5;
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const p: V3 = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - sag * 4 * k * (1 - k), a[2] + (b[2] - a[2]) * k];
    poly(out, [prev, p, add(p, [0, 0.035, 0]), add(prev, [0, 0.035, 0])], color);
    prev = p;
  }
}

// ── Houses ───────────────────────────────────────────────────────────────────────────────────────────

export type HouseStyle = "concrete" | "stilt" | "two" | "store";

export type HouseSpec = {
  x: number; z: number; yaw: number; w: number; d: number; h: number;
  style: HouseStyle; wall: RGB; roof: RGB; seed: number;
};

export type HouseState = {
  /** 0…1: plywood going on the windows and tires onto the roof. */
  boarded: number;
  /** 0…1: the storm's damage so far. Each house loses its roof and walls at its own threshold. */
  damage: number;
  /** 0…1: fresh frames and roofs going up on the wrecks. */
  rebuild: number;
  mud: number;
  lod: number;
  /** Wind flap on loose roof sheets. */
  t: number;
};

const WOOD = hex("#8f7350"), PLY = hex("#c9a874"), WINDOW = hex("#1d2530"), TIRE = hex("#1a1a1c"), FRAME = hex("#d8bc8a");

/** A Philippine house: painted block or nipa-and-bamboo, tin roof, shuttered windows. */
export function phHouse(out: Tri[], h: HouseSpec, g: number, S: HouseState) {
  const stilt = h.style === "stilt" ? 1.5 : 0;
  const T = poseFn({ pos: [h.x, g, h.z], yaw: h.yaw });
  const wall = mixRGB(h.wall, hex("#6b5a43"), S.mud * 0.7);
  // Weak buildings go first: nipa, then single-storey block, then the two-storey block.
  const strength = h.style === "stilt" ? 0.05 : h.style === "two" ? 0.55 : 0.28;
  const roll = hash2(h.seed, 3, 11);
  const roofGone = S.damage > strength + roll * 0.25;
  const wallsDown = S.damage > strength + 0.28 + roll * 0.42;
  const yaw = h.yaw;

  if (stilt) for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]]) box(out, { pos: T([x * h.w, 0, z * h.d]), yaw, size: [0.16, stilt + 0.1, 0.16] }, { color: WOOD });

  if (wallsDown) {
    // Rubble: a low broken slab and scattered pieces, then new frames on top.
    box(out, { pos: T([0, 0, 0]), yaw, size: [h.w * 0.95, 0.25, h.d * 0.95] }, { color: shadeBy(wall, 0.25) });
    if (S.lod) {
      const r = rng(h.seed * 3 + 1);
      for (let i = 0; i < 7; i++) tetra(out, { pos: T([(r() - 0.5) * h.w, 0.3, (r() - 0.5) * h.d]), yaw: r() * 6, pitch: r() * 3, size: [0.5 + r(), 0.4 + r() * 0.5, 0.5 + r()] }, { color: r() < 0.5 ? shadeBy(wall, 0.2) : hex("#70757a") });
    }
    if (S.rebuild > roll * 0.8) buildFrame(out, T, h, yaw, S.rebuild);
    return;
  }

  const base = stilt;
  const levels = h.style === "two" ? 2 : 1;
  const wallH = h.h * levels;
  // Damage bites the top of the wall once the roof has gone.
  const shown = roofGone ? wallH * (0.72 + roll * 0.2) : wallH;
  // Large faces sort behind whatever stands against them (the painter sorts by a face's middle).
  box(out, { pos: T([0, base, 0]), yaw, size: [h.w, shown, h.d] }, (i) => ({ color: i === 2 || i === 4 ? shadeBy(wall, 0.05) : wall, zBias: 2.2 }));
  if (h.style === "two") box(out, { pos: T([0, base + h.h - 0.08, h.d / 2 + 0.35]), yaw, size: [h.w, 0.14, 0.72] }, { color: shadeBy(wall, 0.14) });

  if (S.lod) {
    const zf = h.d / 2 + 0.03;
    const board = S.boarded > hash2(h.seed, 5, 2) * 0.9;
    for (let lv = 0; lv < levels; lv++) {
      const y0 = base + lv * h.h;
      for (const sx of [-0.28, 0.28]) {
        const cx = sx * h.w, wy = y0 + h.h * 0.42;
        if (lv === 0 && sx < 0 && h.style !== "stilt") continue;
        if (wy + 0.5 > base + shown) continue;
        poly(out, [T([cx - 0.55, wy, zf]), T([cx + 0.55, wy, zf]), T([cx + 0.55, wy + 0.9, zf]), T([cx - 0.55, wy + 0.9, zf])], board ? PLY : WINDOW, { zBias: -0.03 });
        if (board) for (const k of [0.2, 0.7]) poly(out, [T([cx - 0.62, wy + k, zf + 0.01]), T([cx + 0.62, wy + k + 0.12, zf + 0.01]), T([cx + 0.62, wy + k + 0.2, zf + 0.01]), T([cx - 0.62, wy + k + 0.08, zf + 0.01])], shadeBy(PLY, 0.2), { zBias: -0.04 });
        else poly(out, [T([cx - 0.03, wy, zf + 0.01]), T([cx + 0.03, wy, zf + 0.01]), T([cx + 0.03, wy + 0.9, zf + 0.01]), T([cx - 0.03, wy + 0.9, zf + 0.01])], hex("#c9c2b0"), { zBias: -0.04 });
      }
    }
    if (h.style !== "stilt") poly(out, [T([-0.28 * h.w - 0.45, base, zf]), T([-0.28 * h.w + 0.45, base, zf]), T([-0.28 * h.w + 0.45, base + 2, zf]), T([-0.28 * h.w - 0.45, base + 2, zf])], hex("#5c3d2a"), { zBias: -0.03 });
  }

  if (h.style === "store" && S.lod) {
    // The sari-sari awning, and a red counter.
    poly(out, [T([-h.w / 2, base + 2.5, h.d / 2]), T([h.w / 2, base + 2.5, h.d / 2]), T([h.w / 2 + 0.2, base + 2, h.d / 2 + 1.6]), T([-h.w / 2 - 0.2, base + 2, h.d / 2 + 1.6])], hex("#c8402f"));
    box(out, { pos: T([0.28 * h.w, base, h.d / 2 + 0.3]), yaw, size: [h.w * 0.42, 1, 0.5] }, { color: hex("#d9c79a") });
  }

  if (roofGone) {
    if (S.rebuild > roll) buildFrame(out, T, h, yaw, S.rebuild, base + shown);
    return;
  }
  // The roof: a tin gable that overhangs, ribbed up close.
  const top = base + wallH, over = 0.42, ridge = top + h.w * (h.style === "stilt" ? 0.62 : 0.3);
  const c: V3[] = [
    T([-h.w / 2 - over, top - 0.12, -h.d / 2 - over]), T([h.w / 2 + over, top - 0.12, -h.d / 2 - over]),
    T([h.w / 2 + over, top - 0.12, h.d / 2 + over]), T([-h.w / 2 - over, top - 0.12, h.d / 2 + over]),
    T([0, ridge, -h.d / 2 - over]), T([0, ridge, h.d / 2 + over]),
  ];
  const roof = mixRGB(h.roof, hex("#6b5a43"), S.mud * 0.4);
  poly(out, [c[0], c[4], c[5], c[3]], roof, { zBias: 1.6 });
  poly(out, [c[1], c[2], c[5], c[4]], shadeBy(roof, 0.1), { zBias: 1.6 });
  poly(out, [T([-h.w / 2, top, h.d / 2]), T([h.w / 2, top, h.d / 2]), T([0, ridge - 0.08, h.d / 2])], wall, { zBias: 2.2 });
  poly(out, [T([-h.w / 2, top, -h.d / 2]), T([h.w / 2, top, -h.d / 2]), T([0, ridge - 0.08, -h.d / 2])], wall, { zBias: 2.2 });
  if (S.lod && h.style !== "stilt") {
    const ribs = 5;
    for (let i = 1; i < ribs; i++) {
      const k = i / ribs, z = -h.d / 2 - over + k * (h.d + 2 * over);
      for (const sx of [-1, 1]) poly(out, [T([sx * (h.w / 2 + over), top - 0.1, z]), T([0, ridge + 0.01, z]), T([0, ridge + 0.01, z + 0.05]), T([sx * (h.w / 2 + over), top - 0.1, z + 0.05])], shadeBy(roof, 0.22), { zBias: -0.02 });
    }
  }
  if (S.boarded > 0.4 && S.lod && h.style !== "stilt" && hash2(h.seed, 9, 4) < S.boarded) {
    // Old tires and a rope holding the tin down.
    const y = (top - 0.12 + ridge) / 2 + 0.05;
    for (const z of [-0.25, 0.25]) octa(out, { pos: T([-h.w * 0.27, y + 0.08, z * h.d]), yaw, size: [0.42, 0.14, 0.42] }, { color: TIRE, zBias: -0.03 });
  }
}

/** Raw coco-lumber frames going up: posts, a top beam and rafters, as much as `k` allows. */
function buildFrame(out: Tri[], T: T3, h: HouseSpec, yaw: number, k: number, from = 0.2) {
  const hh = from + Math.max(0.8, 2.4 - from) * Math.min(1, k * 1.2);
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]]) limb(out, T([x * h.w, from, z * h.d]), T([x * h.w, hh, z * h.d]), 0.07, 0.07, FRAME, 4);
  if (k < 0.4) return;
  for (const [a, b] of [[[-0.45, -0.45], [0.45, -0.45]], [[-0.45, 0.45], [0.45, 0.45]], [[-0.45, -0.45], [-0.45, 0.45]], [[0.45, -0.45], [0.45, 0.45]]] as const) limb(out, T([a[0] * h.w, hh, a[1] * h.d]), T([b[0] * h.w, hh, b[1] * h.d]), 0.05, 0.05, FRAME, 4);
  if (k < 0.7) return;
  for (let i = 0; i < 4; i++) {
    const z = (-0.45 + (i / 3) * 0.9) * h.d;
    limb(out, T([-0.45 * h.w, hh, z]), T([0, hh + h.w * 0.26, z]), 0.04, 0.04, FRAME, 3);
    limb(out, T([0.45 * h.w, hh, z]), T([0, hh + h.w * 0.26, z]), 0.04, 0.04, FRAME, 3);
  }
  if (k > 0.85) poly(out, [T([0, hh + h.w * 0.27, -0.5 * h.d]), T([0, hh + h.w * 0.27, 0.5 * h.d]), T([-0.5 * h.w, hh, 0.5 * h.d]), T([-0.5 * h.w, hh, -0.5 * h.d])], hex("#aeb6ba"));
}

// ── The bangka ───────────────────────────────────────────────────────────────────────────────────────

const HULL = hex("#eef1ec"), STRIPE = hex("#1f6fb5"), HULL_IN = hex("#6e5a44"), BAMBOO = hex("#b39a5e");

/** A bangka: a slim double-ended hull with bamboo outriggers. Length 8 m along its own z. `wreck` stoves in the hull. */
export function bangka(out: Tri[], pos: V3, yaw: number, opts: { pitch?: number; roll?: number; wreck?: boolean; stripe?: RGB } = {}) {
  const T = poseFn({ pos, yaw, pitch: opts.pitch ?? 0, roll: opts.roll ?? 0 });
  const L = 4.1, stripe = opts.stripe ?? STRIPE;
  const st = [-1, -0.75, -0.4, 0, 0.4, 0.75, 1].map((k) => k * L);
  const halfW = (z: number) => 0.52 * Math.max(0, 1 - (z / L) ** 2) ** 0.6;
  const sheer = (z: number) => 0.62 + 0.42 * (z / L) ** 2;
  for (let i = 0; i < st.length - 1; i++) {
    const z0 = st[i], z1 = st[i + 1];
    const hole = opts.wreck && i === 2;
    for (const side of [-1, 1]) {
      const a = T([side * halfW(z0), sheer(z0), z0]), b = T([side * halfW(z1), sheer(z1), z1]);
      const c = T([side * halfW(z1) * 0.35, 0, z1]), d = T([side * halfW(z0) * 0.35, 0, z0]);
      const mid0 = T([side * halfW(z0), sheer(z0) - 0.14, z0]), mid1 = T([side * halfW(z1), sheer(z1) - 0.14, z1]);
      poly(out, [a, b, mid1, mid0], stripe);
      if (hole && side === 1) {
        // The stove-in plank: a dark gap with broken edges.
        poly(out, [mid0, mid1, c, d], hex("#23201c"));
        const g = T([side * halfW(z0) * 0.9, 0.25, (z0 + z1) / 2]);
        out.push({ a: mid0, b: g, c: d, color: HULL, zBias: -0.02 });
      } else poly(out, [mid0, mid1, c, d], side > 0 ? HULL : shadeBy(HULL, 0.08));
    }
    poly(out, [T([-halfW(z0), sheer(z0) - 0.1, z0]), T([halfW(z0), sheer(z0) - 0.1, z0]), T([halfW(z1), sheer(z1) - 0.1, z1]), T([-halfW(z1), sheer(z1) - 0.1, z1])], HULL_IN, { zBias: 0.05 });
  }
  // Cross-arms and the outrigger floats.
  const armY = 0.82;
  for (const z of [-1.7, 1.7]) {
    const broken = opts.wreck && z > 0;
    limb(out, T([-3, armY - 0.1, z]), T([broken ? 0.7 : 3, armY - 0.1, z]), 0.05, 0.05, BAMBOO, 3);
    limb(out, T([-3, armY, z]), T([-3, 0.28, z]), 0.03, 0.03, BAMBOO, 3);
    if (!broken) limb(out, T([3, armY, z]), T([3, 0.28, z]), 0.03, 0.03, BAMBOO, 3);
  }
  limb(out, T([-3, 0.26, -3.4]), T([-3, 0.26, 3.4]), 0.08, 0.08, BAMBOO, 4);
  if (!opts.wreck) limb(out, T([3, 0.26, -3.4]), T([3, 0.26, 3.4]), 0.08, 0.08, BAMBOO, 4);
  else limb(out, T([3.3, 0.1, -3.4]), T([1.6, 0.05, 0.2]), 0.08, 0.08, BAMBOO, 4);
}

// ── Vehicles ─────────────────────────────────────────────────────────────────────────────────────────

function wheels(out: Tri[], T: T3, yaw: number, pts: [number, number][], r: number) {
  for (const [x, z] of pts) box(out, { pos: T([x, 0, z - r]), yaw, size: [0.22, r * 2, r * 2] }, { color: TIRE });
}

/** A jeepney: chrome nose, long roof, open back, bright sides. */
export function jeepney(out: Tri[], pos: V3, yaw: number, color: RGB = hex("#c63d32"), roll = 0) {
  const T = poseFn({ pos, yaw, roll });
  const P = (x: number, y: number, z: number, s: V3, c: RGB) => box(out, { pos: T([x, y, z]), yaw, roll, size: s }, { color: c });
  wheels(out, T, yaw, [[-0.85, 1.9], [0.85, 1.9], [-0.85, -1.9], [0.85, -1.9]], 0.38);
  P(0, 0.4, 2.55, [1.6, 0.75, 1.2], hex("#d9dde0"));
  P(0, 0.4, -0.65, [1.8, 0.8, 5], color);
  P(0, 1.2, -0.65, [1.82, 0.18, 5], hex("#f1d24a"));
  for (const x of [-0.85, 0.85]) for (const z of [-2.9, -1.3, 0.3, 1.8]) P(x, 1.3, z, [0.08, 0.8, 0.08], hex("#d9dde0"));
  P(0, 2.1, -0.4, [1.95, 0.14, 5.6], hex("#f2efe6"));
  P(0, 1.2, 1.85, [1.7, 0.75, 0.05], hex("#16202a"));
  P(0, 2.24, 2.2, [0.3, 0.24, 0.3], hex("#2f6db0"));
}

/** A cargo truck with a slatted bed. */
export function truck(out: Tri[], pos: V3, yaw: number, color: RGB = hex("#2f6d8f"), roll = 0) {
  const T = poseFn({ pos, yaw, roll });
  const P = (x: number, y: number, z: number, s: V3, c: RGB) => box(out, { pos: T([x, y, z]), yaw, roll, size: s }, { color: c });
  wheels(out, T, yaw, [[-1, 2.1], [1, 2.1], [-1, -1.6], [1, -1.6]], 0.46);
  P(0, 0.55, 2.2, [2.15, 1.45, 1.9], color);
  P(0, 1.3, 3.16, [1.9, 0.6, 0.04], hex("#14202b"));
  P(0, 0.7, -1.25, [2.3, 0.2, 4.6], hex("#4c4034"));
  for (const x of [-1.12, 1.12]) P(x, 0.9, -1.25, [0.07, 0.9, 4.6], hex("#7a6a50"));
  P(0, 0.9, -3.53, [2.3, 0.9, 0.07], hex("#7a6a50"));
}

/** A motor tricycle with its sidecar. */
export function tricycle(out: Tri[], pos: V3, yaw: number, color: RGB = hex("#2f8f6b"), roll = 0) {
  const T = poseFn({ pos, yaw, roll });
  const P = (x: number, y: number, z: number, s: V3, c: RGB) => box(out, { pos: T([x, y, z]), yaw, roll, size: s }, { color: c });
  wheels(out, T, yaw, [[-0.4, 0.8], [-0.4, -0.5], [0.7, -0.2]], 0.28);
  P(-0.4, 0.42, 0.1, [0.32, 0.5, 1.3], hex("#2a2c30"));
  P(0.45, 0.3, -0.2, [1.1, 0.95, 1.4], color);
  P(0.45, 1.25, -0.2, [1.25, 0.1, 1.7], hex("#f2e4c0"));
  P(0.45, 0.85, 0.5, [1.05, 0.42, 0.04], hex("#1a232c"));
}

/** A small passenger car. */
export function car(out: Tri[], pos: V3, yaw: number, color: RGB, roll = 0) {
  const T = poseFn({ pos, yaw, roll });
  const P = (x: number, y: number, z: number, s: V3, c: RGB) => box(out, { pos: T([x, y, z]), yaw, roll, size: s }, { color: c });
  wheels(out, T, yaw, [[-0.75, 1.25], [0.75, 1.25], [-0.75, -1.25], [0.75, -1.25]], 0.32);
  P(0, 0.32, 0, [1.7, 0.6, 4.1], color);
  P(0, 0.92, -0.25, [1.5, 0.5, 2.1], hex("#1a232c"));
  P(0, 1.42, -0.25, [1.5, 0.06, 2.1], color);
}

/** Flying or settled debris: a sheet of tin, spun at will. */
export function tinSheet(out: Tri[], p: V3, yaw: number, pitch: number, roll: number, size = 2) {
  const T = poseFn({ pos: p, yaw, pitch, roll });
  poly(out, [T([-size / 2, 0, -size * 0.35]), T([size / 2, 0, -size * 0.35]), T([size / 2, 0, size * 0.35]), T([-size / 2, 0, size * 0.35])], hex("#8d979c"));
}

/** The figure's lod from the camera's distance. */
export const lodFor = (dist: number) => (dist < 9 ? 2 : dist < 45 ? 1 : 0);
