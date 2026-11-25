// The three looks folded into points of light, one per part (composition cosmic-egg-mix). Everything is dots of light,
// added up and glowing; what changes is what the dots do.
//   salt, lives:      dots that hold a shape and stream away in a curl-noise current (ember, sea glass).
//   kindness, open:   dots gathered in shards like stained glass, a seam of dark between every life.
//   egg myths:        dots laid like gold engraving on lapis: rings, halos, the flower of life.
//   hatch:            all of them at once.
import { H, TAU, W, lerp, rng, smooth, type Pen } from "../../src/kit/looks/core";
import type { Film } from "../../src/kit/looks/Film";
import { COLD, EMBER, GOLD, GOLD_PALE, Light, SEA_GLASS, WARM, bloom, colorAt, crackLine, egg, finish, ground, hash, headAt, maskOf, perlin, ring, rgb, seeds, shard, type C3, type P, type Stops } from "../../src/kit/looks/glow";

// ---------------------------------------------------------------- salt: one crystal going everywhere
function salt(g: Pen) {
  ground(g, "#0a1430", "#020409");
  const L = new Light(), r = rng(2), n = perlin(6), cx = W / 2, cy = 640, s = 250;
  const X: P = [0.866 * s, -0.5 * s], Z: P = [-0.866 * s, -0.5 * s], Y: P = [0, s];
  const faces: [P, P, number][] = [[X, Z, 1], [Z, Y, 0.55], [X, Y, 0.8]];
  for (const [u, v, lit] of faces)
    for (let a = 0; a <= 1; a += 1 / 46)
      for (let b = 0; b <= 1; b += 1 / 46) {
        const x = cx + u[0] * a + v[0] * b + (r() - 0.5) * 2, y = cy + u[1] * a + v[1] * b + (r() - 0.5) * 2;
        // It goes from the bottom first, and unevenly.
        const go = smooth(cy - s * 0.3, cy + s * 1.05, y) + 0.4 * n(x / 70, y / 70);
        const edge = a < 0.03 || b < 0.03 || a > 0.97 || b > 0.97;
        if (go < 0.38) L.dot(x, y, [0.85, 0.95, 1], (edge ? 1.6 : 0.6) * lit, edge ? 1.7 : 1.3);
        else if (r() < 0.9) L.stream(x, y, Math.floor(300 + r() * 1300), [(r() - 0.5) * 0.5, 0.45], SEA_GLASS, 0.5 * lit, 7, 1.4);
      }
  // Dissolved: it is in every part of the water.
  for (let i = 0; i < 9000; i++) L.dot(r() * W, r() * H, colorAt(SEA_GLASS, 0.2 + r() * 0.8), 0.3 + r() * 0.5, 0.9 + r());
  L.draw(g, 1.3);
  bloom(g, 22, 0.75);
  finish(g, 3, 10);
}

// ---------------------------------------------------------------- lives: the fisherman, the dawn inside him
function fisherman(g: Pen) {
  ground(g, "#1a0b20", "#040206", 600);
  const S = 1.25, OX = 0, OY = 170, h = headAt(S, OX, OY), m = maskOf(h), L = new Light(), r = rng(5), n = perlin(4);
  const inHead = (x: number, y: number) => m[Math.round(y) * W + Math.round(x)] === 1;
  const go = (x: number, y: number) => smooth(820, 280, x) * (0.5 + 0.9 * Math.max(0, n(x / 90, y / 90) + 0.35));

  // His outline, held where the face is, streaming away behind.
  for (const [x, y] of seeds(m, 40000, 0.62, 1)) {
    const d = go(x, y);
    if (d > 0.35 && r() < 0.7) L.stream(x, y, Math.floor(d * (100 + r() * 520)), [-0.6, -0.7], EMBER, 0.32, 6, 1.3);
    else L.dot(x, y, d > 0.2 ? colorAt(EMBER, 0.15) : [1, 0.7, 0.4], 0.5, 1.2);
  }
  // The dawn inside his head: a sun on the horizon, rays, the sea in rows of dots, his boat.
  const horizon = OY + 560 * S, sunX = OX + 560 * S;
  for (let k = 0; k < 2600; k++) {
    const a = Math.PI + r() * Math.PI, rr = Math.sqrt(r()) * 82;
    L.dot(sunX + Math.cos(a) * rr, horizon + Math.sin(a) * rr, GOLD_PALE, 0.55, 1.4);
  }
  for (let k = 0; k < 12; k++) L.along(ring(sunX, horizon, 100 + k * 20, 100 + k * 20, Math.PI, TAU), 7, GOLD, 0.7 - k * 0.045, 1.3, inHead);
  for (let k = 0; k < 70; k++) {
    const a = Math.PI + ((k + 0.5) / 70) * Math.PI;
    L.along([[sunX + Math.cos(a) * 360, horizon + Math.sin(a) * 360], [sunX + Math.cos(a) * 900, horizon + Math.sin(a) * 900]], 11, GOLD, 0.35, 1.1, inHead);
  }
  for (let k = 0; k < 40; k++) {
    const f = k / 39, y = horizon + 8 + f ** 1.7 * 560, amp = 1 + f * 10, pts: P[] = [];
    for (let x = 0; x <= W; x += 5) pts.push([x, y + Math.sin(x * (0.012 + f * 0.03) + k * 1.7) * amp]);
    L.along(pts, 5 + f * 5, colorAt(EMBER, f * 0.7), 0.55 - f * 0.2, 1.2 + f * 0.6, (x, y) => inHead(x, y) && r() > 0.12);
  }
  for (let k = 0; k < 26; k++) {
    const y = horizon + 10 + k ** 1.5 * 6, w = (90 - k * 2.6) * (0.6 + r() * 0.6), x0 = sunX - w / 2 + (r() - 0.5) * 20;
    L.along([[x0, y], [x0 + w, y]], 3, GOLD_PALE, 0.6, 1.2, inHead);
  }
  const bx = OX + 370 * S, by = horizon + 4;
  L.along([[bx - 72, by - 14], [bx - 30, by + 2], [bx + 30, by + 2], [bx + 76, by - 16]], 2, GOLD_PALE, 0.9, 1.4);
  L.along([[bx + 6, by - 4], [bx + 6, by - 30], [bx - 10, by - 44]], 2, GOLD_PALE, 0.9, 1.6);
  L.along(ring(bx - 12, by - 52, 8, 8), 2, GOLD_PALE, 0.9, 1.4);
  for (let k = 0; k < 6; k++) L.along([[bx - 8, by - 30], [bx - 40 - k * 6, by - 4 + k * 4], [bx - 66 - k * 8, by + 14 + k * 7]], 4, GOLD, 0.5);
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = OY + r() * (horizon - OY);
    if (inHead(x, y)) L.dot(x, y, [1, 0.9, 0.8], 0.3 + r() * 0.6, 1 + r());
  }
  // His eye, closed.
  const ex = OX + 700 * S, ey = OY + 455 * S;
  L.along([[ex - 26, ey - 4], [ex - 6, ey + 6], [ex + 14, ey - 2]], 2.5, [1, 0.8, 0.5], 0.8, 1.3);
  L.draw(g, 1.25);
  bloom(g, 22, 0.7);
  finish(g, 5, 12);
}

// ---------------------------------------------------------------- kindness: two people in glass, light in the space between
function kindness(g: Pen) {
  ground(g, "#0a0a24", "#020208");
  const S = 0.86, left = headAt(S, -175, 250), right = headAt(S, W + 175, 250, true), ml = maskOf(left), mr = maskOf(right);
  const L = new Light(), r = rng(7), n = perlin(8);
  // The window goes on behind them, faintly.
  for (let y = 0; y < H; y += 7)
    for (let x = (y / 7) % 2 ? 3.5 : 0; x < W; x += 7) {
      if (ml[y * W + Math.floor(x)] || mr[y * W + Math.floor(x)]) continue;
      const sh = shard(x, y, 90, 3);
      if (sh.edge < 5) continue;
      L.dot(x + (r() - 0.5) * 2, y + (r() - 0.5) * 2, rgb(COLD[Math.floor(hash(sh.i, sh.j, 4) * COLD.length)]), 0.14 * (0.5 + hash(sh.i, sh.j, 2)), 1.1);
    }
  // Them: every shard a life, a dark seam between each.
  for (const [mask, pal, salt] of [[ml, COLD, 11], [mr, WARM, 12]] as const)
    for (let y = 0; y < H; y += 4.2)
      for (let x = 0; x < W; x += 4.2) {
        const jx = x + (r() - 0.5) * 3, jy = y + (r() - 0.5) * 3;
        if (!mask[Math.round(jy) * W + Math.round(jx)]) continue;
        const sh = shard(jx, jy, 30, salt);
        if (sh.edge < 2.6) continue;
        const c = rgb(pal[Math.floor(hash(sh.i, sh.j, salt) * pal.length)]).map((v) => Math.min(1, v * (pal === COLD ? 2.2 : 1.1))), lit = 0.35 + 0.65 * hash(sh.i, sh.j, 2) * (1 + 0.3 * n(jx / 120, jy / 120));
        L.dot(jx, jy, c, 1.1 * lit * (1 - smooth(960, 1110, jy)), 1.4);
      }
  // The shape between their faces fills with gold, rising.
  for (let y = 400; y < 950; y += 3) {
    let a = -1, b = W;
    for (let x = W / 2; x >= 0; x--) if (ml[y * W + x]) { a = x; break; }
    for (let x = W / 2; x < W; x++) if (mr[y * W + x]) { b = x; break; }
    if (a < 0 || b >= W || b - a > 300) continue;
    for (let x = a + 6; x < b - 6; x += 3 + r() * 3) {
      if (r() < 0.04) L.stream(x, y, Math.floor(60 + r() * 260), [0, -1.2], [[0, [1, 0.9, 0.6]], [0.5, [1, 0.65, 0.3]], [1, [1, 0.4, 0.5]]], 0.35, 5, 1.2);
      else L.dot(x, y, GOLD, 0.5 + 0.4 * r(), 1.3);
    }
  }
  L.draw(g, 1.35);
  bloom(g, 22, 0.65);
  finish(g, 7, 10);
}

// ---------------------------------------------------------------- the egg myths: gold engraved in dots on lapis
function goldEgg(g: Pen) {
  ground(g, "#0d1d58", "#02051a", 700);
  const L = new Light(), r = rng(9), cx = W / 2, cy = 680, a = 230, b = 300, e = egg(cx, cy, a, b), m = maskOf(e);
  const out = (x: number, y: number) => !m[Math.round(y) * W + Math.round(x)];
  const base = cy + b - 8;
  const aboveWater = (x: number, y: number) => out(x, y) && y < base;
  const inside = g.createRadialGradient(cx + 60, cy - 80, 10, cx, cy, b);
  inside.addColorStop(0, "#4a2a08");
  inside.addColorStop(1, "#0a0614");
  g.fillStyle = inside;
  g.beginPath();
  e.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.fill();
  // The flower of life, then a halo of petals and rays.
  const R = 105;
  for (let i = -6; i <= 6; i++)
    for (let j = -8; j <= 8; j++) {
      const x = cx + (i + (j % 2 ? 0.5 : 0)) * R, y = cy + j * R * 0.866;
      if (Math.hypot(x - cx, y - cy) > 540) continue;
      L.along(ring(x, y, R, R), 8, GOLD, 0.22, 1.1, (px, py) => aboveWater(px, py) && Math.hypot(px - cx, py - cy) < 600);
    }
  const r0 = 440;
  for (const rr of [0.84, 0.87, 1.13, 1.16]) L.along(ring(cx, cy, r0 * rr, r0 * rr), 4, GOLD, 0.6, 1.3, aboveWater);
  for (let k = 0; k < 48; k++) {
    const t0 = (k / 48) * TAU, d = TAU / 48, pts: P[] = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, ang = t0 - d / 2 + d * u, rr = r0 * (0.88 + 0.3 * Math.sin(u * Math.PI));
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    L.along(pts, 4, GOLD, 0.6, 1.3, aboveWater);
  }
  for (let k = 0; k < 160; k++) {
    const ang = (k / 160) * TAU, long = k % 2 ? 1.4 : 1.75;
    L.along([[cx + Math.cos(ang) * r0 * 1.2, cy + Math.sin(ang) * r0 * 1.2], [cx + Math.cos(ang) * r0 * long, cy + Math.sin(ang) * r0 * long]], 9, GOLD, 0.3, 1.1, aboveWater);
  }
  // The egg: rings that follow its curve, lit from the upper right, crossed in shade.
  for (let k = 1; k < 64; k++) {
    const v = -1 + (2 * k) / 64, y = cy + b * v, w = a * Math.sqrt(1 - v * v) * (1 + 0.13 * v);
    const pts = ring(cx, y, w, w * 0.16, 0, Math.PI);
    for (let i = 0; i < pts.length; i += 1) {
      const [x, py] = pts[i], u = (x - cx) / a, lit = 0.25 + 0.75 * smooth(-0.9, 0.8, u * 0.75 - v * 0.6);
      if (i % 2 === 0) L.dot(x, py, lit > 0.85 ? GOLD_PALE : GOLD, 0.2 + 0.7 * lit, 1.5);
    }
  }
  for (let k = 0; k < 22; k++) {
    const u = k / 21, rx = a * (1 - u * 0.9);
    L.along(ring(cx, cy, rx, b * 1.03, Math.PI / 2, (Math.PI * 3) / 2), 6, GOLD, 0.35 * (1 - u), 1.1, (x, y) => !out(x, y));
  }
  L.along(e, 2.5, GOLD_PALE, 0.9, 1.5);
  // Dark water: rings spreading, its reflection broken into dashes.
  for (let k = 0; k < 16; k++) {
    const rx = 150 + k ** 1.35 * 34;
    L.along(ring(cx, base + 8 + k * 7, rx, rx * 0.11), 5, GOLD, 0.6 - k * 0.032, 1.3);
  }
  for (let k = 0; k < 34; k++) {
    const y = base + 40 + k * 13, w = (190 - k * 4.5) * (0.5 + r()), x0 = cx - w / 2 + (r() - 0.5) * 40;
    L.along([[x0, y], [x0 + w, y]], 4, GOLD, 0.45 - k * 0.011, 1.2);
  }
  L.draw(g, 1.1);
  bloom(g, 20, 0.5);
  finish(g, 9, 8);
}

// ---------------------------------------------------------------- hatch: everything at once
function hatch(g: Pen) {
  ground(g, "#1a0e2e", "#020106", 900);
  const L = new Light(), r = rng(13), cx = W / 2, cy = 980, a = 190, b = 245;
  const crack = crackLine(cx + 10, cy - 240, cy + 40, 7), split = cy - 40;
  // The shell: gold rings, its top lifting away along the crack.
  for (let k = 1; k < 48; k++) {
    const v = -1 + (2 * k) / 48, y0 = cy + b * v, w = a * Math.sqrt(1 - v * v) * (1 + 0.13 * v), top = y0 < split;
    const lift = top ? -150 - (split - y0) * 0.3 : 0, tilt = top ? 0.18 : 0;
    const pts = ring(cx, y0, w, w * 0.16, 0, Math.PI).map(([x, y]) => [cx + (x - cx) * Math.cos(tilt) - (y - y0) * Math.sin(tilt) + (top ? 30 : 0), y + lift + (x - cx) * Math.sin(tilt)] as P);
    L.along(pts, 3, top ? GOLD_PALE : GOLD, 0.8, 1.5);
  }
  // Out of it, every kind of light: ember, sea glass, gold, the glass colours.
  const hue = (c: C3): Stops => [[0, [1, 0.95, 0.85]], [0.12, c], [1, c]];
  const pals: Stops[] = [hue([1, 0.55, 0.15]), hue([0.2, 0.85, 1]), hue([1, 0.25, 0.5]), hue([1, 0.82, 0.3]), hue([0.45, 0.3, 1]), hue([0.3, 1, 0.6])];
  for (let k = 0; k < 3200; k++) {
    const ang = -Math.PI / 2 + (r() - 0.5) * 3.4, sp = 1.4 + r() * 1.2;
    const x = cx + (r() - 0.5) * 220, y = split - 30 - r() * 60;
    L.stream(x, y, Math.floor(200 + r() * 1100), (px, py) => {
      const dx = px - cx, dy = py - split, d = Math.hypot(dx, dy) + 1;
      return [(dx / d) * sp + Math.cos(ang) * 0.6, (dy / d) * sp + Math.sin(ang) * 0.6];
    }, pals[k % pals.length], 0.35, 8, 1.3);
  }
  // White heat at the crack.
  for (let k = 0; k < 700; k++) L.dot(cx + (r() - 0.5) * 240 * r(), split - 20 - r() * 50, [1, 0.9, 0.7], 0.4, 1.6);
  void crack;
  L.draw(g, 1.2);
  bloom(g, 30, 0.8);
  finish(g, 11, 10);
}

const SHOTS = [salt, fisherman, kindness, goldEgg, hatch];
const WORDS = [
  "In the morning, the boy looked for the salt.\nIt was gone.",
  "You are a fisherman,\nmending a net before the sun comes up.",
  "Every kindness you have ever given,\nyou have also received.",
  "In India, a golden egg floated on the dark water,\nbefore there was a world.",
  "the shell will crack.",
];
export const MIX: Film = {
  seconds: SHOTS.length,
  bg: "#000",
  scenes: SHOTS.map((paint, i) => ({ from: i, to: i + 1, paint: (g: Pen) => paint(g) })),
  lines: SHOTS.map((_, i) => ({ at: i, to: i + 1, text: WORDS[i], voice: "dots" as const, y: 1375, size: 64 })),
};
export const MIX_STILLS = SHOTS.map((_, i) => i + 0.5);
void lerp;
