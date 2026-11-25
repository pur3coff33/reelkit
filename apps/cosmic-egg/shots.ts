// The picture of "The Cosmic Egg", one idea for every line, all of it points of light (src/kit/looks/glow.ts). Each part has
// its own treatment: heads nested forever (hook); salt as sea-glass light that dissolves (salt); lives drawn inside heads
// that stream away like embers (lives); stained glass where every shard is a life (kindness, open); gold and silver
// engraving on lapis (the egg myths); and all of it at once when the egg hatches. Shots melt into each other, timed to
// the words (timeline.ts). Nothing inside a frame is random: chance(i) keeps every point where it was.
import { H, TAU, W, between, canvas, lerp, smooth, type Pen } from "../../src/kit/looks/core";
import {
  CHILD_FORM, COLD, EMBER, Form, GOLD, GOLD_PALE, HEAD_FORM, Light, SEA_GLASS, WARM, bloom, chance, colorAt, crackLine, egg,
  finish, ground, hash, perlin, placer, ring, rgb, shard, type C3, type P, type Place, type Stops,
} from "../../src/kit/looks/glow";
import { PARTS, SECONDS, at, end } from "./timeline";

// ── Colours ───────────────────────────────────────────────────────────────────────────────────────────
const LIVES: C3[] = [[1, 0.55, 0.25], [0.35, 0.85, 1], [1, 0.78, 0.35], [1, 0.35, 0.6], [0.6, 0.45, 1]];
const GLASS_COLD: C3[] = COLD.map((c) => rgb(c).map((v) => Math.min(1, v * 2.2)) as C3);
const GLASS_WARM: C3[] = WARM.map((c) => rgb(c));
const GLASS_ALL = [...GLASS_COLD, ...GLASS_WARM];
const SILVER: C3 = [0.82, 0.88, 1];
const ICE: C3 = [0.6, 0.9, 1];
const ROSE: Stops = [[0, [1, 0.55, 0.75]], [0.4, [0.85, 0.3, 0.8]], [1, [0.35, 0.25, 0.95]]];
const TEAL: Stops = [[0, [0.55, 1, 0.85]], [0.45, [0.2, 0.6, 0.9]], [1, [0.4, 0.25, 0.85]]];
const GOLDEN: Stops = [[0, [1, 0.92, 0.7]], [0.4, [1, 0.7, 0.3]], [1, [1, 0.35, 0.45]]];
const RED: Stops = [[0, [1, 0.45, 0.3]], [0.5, [0.9, 0.1, 0.2]], [1, [0.35, 0.05, 0.25]]];
const mix3 = (a: C3, b: C3, k: number): C3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const hue = (c: C3): Stops => [[0, mix3(c, [1, 1, 1], 0.5)], [0.06, c], [1, c]];

// ── Pieces every shot shares ─────────────────────────────────────────────────────────────────────────
type Look = { bg: [string, string, number?]; gain?: number; glow?: [number, number] };
function frame(g: Pen, T: number, look: Look, paint: (L: Light) => void) {
  ground(g, look.bg[0], look.bg[1], look.bg[2] ?? 760);
  const L = Light.frame(T);
  paint(L);
  L.draw(g, look.gain ?? 1.3);
  bloom(g, look.glow?.[0] ?? 22, look.glow?.[1] ?? 0.65);
  finish(g, Math.floor(T * 30), 7);
}

const noise = perlin(4);
const twinkle = (i: number, T: number) => 0.7 + 0.3 * Math.sin(T * (0.5 + chance(i, 9)) + i * 1.7);

function stars(L: Light, T: number, n: number, c: C3, w: number, salt = 1, top = 0, bottom = H) {
  for (let i = 0; i < n; i++) L.dot(chance(i, salt) * W, top + chance(i, salt + 1) * (bottom - top), c, w * twinkle(i, T) * (0.3 + chance(i, salt + 2)), 0.9 + chance(i, salt + 3));
}

/** A person: a head's outline in dots, a little light inside, and (where `go` says) streaming away. */
type Body = { form?: Form; edge: C3; fill?: C3; n?: number; edgeW?: number; fillW?: number; go?: (u: P) => number; stops?: Stops; wind?: P; length?: number; share?: number };
function body(L: Light, p: Place, o: Body) {
  const form = o.form ?? HEAD_FORM, pl = placer({ a: form.anchor, ...p }), pts = form.points(o.n ?? 24000, 0.6, 1), nEdge = Math.floor(pts.length * 0.6);
  for (let i = 0; i < pts.length; i++) {
    const u = pts[i], [x, y] = pl.to(u), d = o.go ? o.go(u) : 0;
    if (d > 0.35) {
      if (chance(i, 4) < (o.share ?? 0.22)) L.stream(x, y, Math.floor(d * (o.length ?? 1) * (90 + chance(i, 5) * 460)), o.wind ?? [-0.6, -0.7], o.stops ?? EMBER, 0.32 * (o.edgeW ?? 0.55) / 0.55, 6, 1.3);
      else if (chance(i, 6) > d) L.dot(x, y, o.edge, 0.25, 1.1);
      continue;
    }
    if (i < nEdge) L.dot(x, y, o.edge, (o.edgeW ?? 0.8) * (1 - d * 0.5), 1.3);
    else if (o.fill && chance(i, 7) < 0.6) L.dot(x, y, o.fill, o.fillW ?? 0.16, 1.2);
  }
  return pl;
}
/** The back of a head going first, unevenly; `k` is how far it's gone (0…1+). */
const backFirst = (k: number) => (u: P) => k * smooth(660, 240, u[0]) * (0.5 + 0.9 * Math.max(0, noise(u[0] / 72, u[1] / 72) + 0.35));
const inHead = (pl: ReturnType<typeof placer>, form = HEAD_FORM) => (x: number, y: number) => form.inside(pl.from(x, y));

function closedEye(L: Light, pl: ReturnType<typeof placer>, c: C3, w: number) {
  L.along([[674, 451], [694, 461], [714, 453]].map((u) => pl.to(u as P)), 2.2, c, w, 1.3);
}

/** A person in stained glass: dots gathered in shards with dark seams. Mirrored people share one pattern. */
function glassBody(L: Light, p: Place, pal: C3[] | ((h: number, x: number, y: number) => C3), w: number, T: number, o: { hurt?: number; fade?: (y: number) => number; form?: Form } = {}) {
  const form = o.form ?? HEAD_FORM, pl = placer({ a: form.anchor, ...p }), g = form.glass(5, 34, 11);
  for (let k = 0; k < g.length; k += 4) {
    if (g[k + 3] < 3) continue;
    const [x, y] = pl.to([g[k], g[k + 1]]), h = g[k + 2], h2 = hash(Math.floor(h * 1e6), 3, 5);
    let c = typeof pal === "function" ? pal(h, x, y) : pal[Math.floor(h * pal.length)], lit = (0.35 + 0.65 * h2) * (0.85 + 0.15 * Math.sin(T * 0.7 + h * 40));
    if (o.hurt && h2 < o.hurt * 0.55) {
      c = mix3(c, [0.9, 0.1, 0.15], 0.8);
      lit *= 0.35;
    }
    L.dot(x, y, c, w * lit * (o.fade ? o.fade(y) : 1), 1.35);
  }
  return pl;
}

/** The rows of space between two people facing each other: [y, left edge, right edge]. */
function gapRows(left: (x: number, y: number) => boolean, right: (x: number, y: number) => boolean, y0: number, y1: number, widest: number) {
  const rows: [number, number, number][] = [];
  for (let y = y0; y < y1; y += 3) {
    let a = -1, b = W;
    for (let x = W / 2; x >= 0; x -= 2) if (left(x, y)) { a = x; break; }
    for (let x = W / 2; x < W; x += 2) if (right(x, y)) { b = x; break; }
    if (a >= 0 && b < W && b - a > 10 && b - a < widest) rows.push([y, a, b]);
  }
  return rows;
}
function fillGap(L: Light, T: number, rows: [number, number, number][], c: C3, stops: Stops, w: number, rise = -1.2) {
  rows.forEach(([y, a, b], r) => {
    for (let x = a + 6, k = 0; x < b - 6; x += 3.4, k++) {
      const h = hash(r, k, 21);
      if (h < 0.035) L.stream(x, y, Math.floor(60 + hash(r, k, 22) * 240), [0, rise], stops, w * 0.8, 5, 1.2);
      else L.dot(x + (h - 0.5) * 2.5, y, c, w * (0.5 + 0.5 * twinkle(r * 31 + k, T)), 1.3);
    }
  });
}

/** A crystal of salt: a cube of dots turned `turn`, `s` px across; `gone` (0…1) of it has dissolved, bottom first. */
function crystal(L: Light, cx: number, cy: number, s: number, turn: number, gone: number, o: { wind?: P; long?: number; share?: number } = {}) {
  const N = Math.max(6, Math.round(s / 6)), tilt = 0.55, ct = Math.cos(turn), st = Math.sin(turn), ctl = Math.cos(tilt), stl = Math.sin(tilt);
  const faces: [number, number][] = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]];
  let i = 0;
  for (const [ax, sg] of faces)
    for (let a = 0; a <= N; a++)
      for (let b = 0; b <= N; b++, i++) {
        const u = (a / N) * 2 - 1, v = (b / N) * 2 - 1, q = [0, 0, 0];
        q[ax] = sg;
        q[(ax + 1) % 3] = u;
        q[(ax + 2) % 3] = v;
        // Turn about the vertical, then tip towards us.
        const x1 = q[0] * ct + q[2] * st, z1 = -q[0] * st + q[2] * ct, y2 = q[1] * ctl - z1 * stl;
        const x = cx + (x1 * s) / 2, y = cy - (y2 * s) / 2, height = (q[1] + 1) / 2;
        const n = [0, 0, 0];
        n[ax] = sg;
        const nz = n[1] * stl + (-n[0] * st + n[2] * ct) * ctl, lit = nz > 0 ? 0.5 + 0.5 * nz : 0.18;
        const edge = Math.abs(u) > 0.94 || Math.abs(v) > 0.94;
        if (height * 0.65 + chance(i, 1) * 0.35 < gone) {
          if (chance(i, 2) < (o.share ?? 0.4)) L.stream(x, y, Math.floor((200 + chance(i, 3) * 900) * (o.long ?? 1)), o.wind ?? [(chance(i, 4) - 0.5) * 0.5, 0.45], SEA_GLASS, 0.45 * lit, 7, 1.4);
          continue;
        }
        L.dot(x, y, [0.85, 0.95, 1], (edge ? 1.5 : 0.5) * lit, edge ? 1.6 : 1.25);
      }
}

/** An egg engraved in dots: rings that follow its curve, lit from the upper right, and its edge. */
function engravedEgg(L: Light, cx: number, cy: number, a: number, b: number, c: C3, pale: C3, w: number, o: { rings?: number; meridians?: boolean; spin?: number; skip?: (x: number, y: number) => boolean; lift?: (y: number) => [number, number, number] } = {}) {
  const n = o.rings ?? 64;
  for (let k = 1; k < n; k++) {
    const v = -1 + (2 * k) / n, y = cy + b * v, wd = a * Math.sqrt(1 - v * v) * (1 + 0.13 * v), [dx, dy, turn] = o.lift ? o.lift(y) : [0, 0, 0];
    const pts = ring(cx, y, wd, wd * 0.16, 0, Math.PI);
    for (let i = 0; i < pts.length; i += 2) {
      let [x, py] = pts[i];
      if (turn) [x, py] = [cx + (x - cx) * Math.cos(turn) - (py - y) * Math.sin(turn), py + (x - cx) * Math.sin(turn)];
      x += dx;
      py += dy;
      if (o.skip && o.skip(x, py)) continue;
      const u = (pts[i][0] - cx) / a, lit = 0.25 + 0.75 * smooth(-0.9, 0.8, u * 0.75 - v * 0.6 + 0.15 * Math.sin((o.spin ?? 0) + v * 3));
      L.dot(x, py, lit > 0.85 ? pale : c, w * (0.2 + 0.7 * lit), 1.45);
    }
  }
  if (o.meridians !== false)
    for (let k = 0; k < 20; k++) {
      const u = k / 19, rx = a * (1 - u * 0.9);
      L.along(ring(cx, cy, rx, b * 1.03, Math.PI / 2, (Math.PI * 3) / 2), 6, c, 0.3 * w * (1 - u), 1.1, (x, y) => (x - cx) ** 2 / a ** 2 + (y - cy) ** 2 / b ** 2 < 0.97 && !(o.skip && o.skip(x, y)));
    }
  if (!o.lift) L.along(egg(cx, cy, a, b), 2.5, pale, w * 0.95, 1.5, o.skip ? (x, y) => !o.skip!(x, y) : undefined);
}

/** A thangka halo in dots: rings, a band of petals turning slowly, and rays. */
function halo(L: Light, cx: number, cy: number, r0: number, T: number, c: C3, w: number, keep?: (x: number, y: number) => boolean) {
  const turn = T * 0.025;
  for (const rr of [0.84, 0.87, 1.13, 1.16]) L.along(ring(cx, cy, r0 * rr, r0 * rr), 4, c, 0.6 * w, 1.3, keep);
  for (let k = 0; k < 48; k++) {
    const t0 = (k / 48) * TAU + turn, d = TAU / 48, pts: P[] = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, ang = t0 - d / 2 + d * u, rr = r0 * (0.88 + 0.3 * Math.sin(u * Math.PI));
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    L.along(pts, 4, c, 0.6 * w, 1.3, keep);
  }
  for (let k = 0; k < 160; k++) {
    const ang = (k / 160) * TAU - turn * 0.5, long = k % 2 ? 1.4 : 1.75;
    L.along([[cx + Math.cos(ang) * r0 * 1.2, cy + Math.sin(ang) * r0 * 1.2], [cx + Math.cos(ang) * r0 * long, cy + Math.sin(ang) * r0 * long]], 9, c, 0.3 * w, 1.1, keep);
  }
}

/** Water in rows of dots from `top` down, swelling as it comes near. */
function sea(L: Light, T: number, top: number, stops: Stops, w: number, keep?: (x: number, y: number) => boolean, rows = 40, depth = 560) {
  for (let k = 0; k < rows; k++) {
    const f = k / (rows - 1), y = top + 8 + f ** 1.7 * depth, amp = 1 + f * 10, pts: P[] = [];
    for (let x = -10; x <= W + 10; x += 5) pts.push([x, y + Math.sin(x * (0.012 + f * 0.03) + k * 1.7 + T * (0.5 + f)) * amp]);
    L.along(pts, 5 + f * 5, colorAt(stops, f * 0.7), w * (1 - f * 0.4), 1.2 + f * 0.6, keep ? (x, y) => keep(x, y) && hash(Math.round(x), k, 3) > 0.12 : undefined);
  }
}

// ── Hook: every person you have ever met, one inside the other ──────────────────────────────────────────
const MIND: P = [520, 430];
function hook(g: Pen, T: number) {
  frame(g, T, { bg: ["#140a24", "#020106", 700] }, (L) => {
    stars(L, T, 500, [0.7, 0.7, 1], 0.25);
    const z = 0.085 * T + 0.5 * smooth(at("h3") - 1, at("h3") + 5, T), Z = 3, F: P = [540, 720];
    for (let n = Math.floor(z - 1.6); n <= Math.ceil(z + 3.4); n++) {
      const s = Z ** (z - n), w = smooth(0.035, 0.14, s) * (1 - smooth(2.2, 4.6, s));
      if (w <= 0) continue;
      const pl = placer({ a: MIND, x: F[0], y: F[1], s, flip: ((n % 2) + 2) % 2 === 1 }), c = LIVES[((n % 5) + 5) % 5];
      L.along(HEAD_FORM.outline.map(pl.to), 1.8, c, 1.3 * w, 1.7);
      closedEye(L, pl, c, 0.8 * w);
      // Each one is alive: a breath of light comes off them.
      if (s > 0.15 && s < 2.6) {
        const pts = HEAD_FORM.points(2400, 1, 3);
        for (let i = 0; i < pts.length; i += 4) {
          const [x, y] = pl.to(pts[i]);
          L.stream(x, y, Math.floor(30 + chance(i + n * 7, 5) * 110), [0, -0.5], hue(c), 0.3 * w, 5, 1.2);
        }
      }
    }
  });
}

// ── Salt ──────────────────────────────────────────────────────────────────────────────────────────────
const NIGHT: Look = { bg: ["#0a1430", "#020409", 700] };

function father(g: Pen, T: number) {
  frame(g, T, NIGHT, (L) => {
    stars(L, T, 700, [0.75, 0.85, 1], 0.35);
    const dad = body(L, { x: 255, y: 800, s: 0.95 }, { edge: [0.55, 0.85, 1], fill: [0.3, 0.5, 0.9], go: backFirst(0.45), stops: SEA_GLASS, n: 22000, edgeW: 1 });
    closedEye(L, dad, [0.7, 0.9, 1], 0.7);
    body(L, { x: 905, y: 960, s: 0.6, flip: true }, { form: CHILD_FORM, edge: [0.85, 0.95, 1], fill: [0.4, 0.6, 1], n: 14000, edgeW: 1 });
    crystal(L, 600, 700 + 6 * Math.sin(T * 0.8), 56, T * 0.35, 0);
    // A soft light round the salt.
    for (let i = 0; i < 300; i++) {
      const a = chance(i, 1) * TAU, r = 30 + chance(i, 2) ** 2 * 120;
      L.dot(600 + Math.cos(a + T * 0.2) * r, 700 + Math.sin(a + T * 0.2) * r, ICE, 0.12, 1);
    }
  });
}

function drop(g: Pen, T: number) {
  const surface = 820, t0 = at("s2") + 0.2, fall = smooth(t0, t0 + 2.2, T), y = lerp(430, 1100, fall ** 1.5), hit = t0 + 2.2 * Math.pow((surface - 430) / 670, 1 / 1.5);
  frame(g, T, NIGHT, (L) => {
    stars(L, T, 500, [0.75, 0.85, 1], 0.3, 1, 0, surface - 20);
    // The moon, engraved.
    L.along(ring(820, 300, 70, 70), 2.5, [0.85, 0.92, 1], 0.9, 1.4);
    for (let k = 1; k < 7; k++) L.along(ring(820, 300, 70 + k * 16, 70 + k * 16), 7, ICE, 0.25 - k * 0.03, 1.1);
    sea(L, T, surface, SEA_GLASS, 0.85);
    // Rings where it went in.
    if (T > hit)
      for (let k = 0; k < 5; k++) {
        const r = (T - hit) * 140 + k * 34;
        L.along(ring(540, surface + 6, r, r * 0.12), 5, ICE, 0.9 * (1 - smooth(0, 520, r)), 1.3);
      }
    const under = smooth(hit, hit + 3, T);
    crystal(L, 540, y, 96, T * 0.6, 0.18 * under, { long: 0.5 });
    // Bubbles going up from it once it's under.
    if (T > hit)
      for (let i = 0; i < 60; i++) L.stream(540 + (chance(i, 1) - 0.5) * 70, y - 20, Math.floor(40 + chance(i, 2) * 160), [(chance(i, 3) - 0.5) * 0.3, -1.4], SEA_GLASS, 0.5 * under, 9, 1.6);
  });
}

function gone(g: Pen, T: number) {
  const k = lerp(0.12, 0.97, smooth(at("s3") - 0.6, end("s3") + 1, T));
  frame(g, T, { bg: ["#07203a", "#01050b", 640] }, (L) => {
    for (let i = 0; i < 9000 * k; i++) L.dot(chance(i, 1) * W, chance(i, 2) * H, colorAt(SEA_GLASS, 0.2 + chance(i, 3) * 0.8), (0.25 + chance(i, 4) * 0.4) * twinkle(i, T), 0.9 + chance(i, 5));
    crystal(L, 540, 640, 250, 0.4 + T * 0.05, k, { share: 0.32 });
  });
}

function everywhere(g: Pen, T: number) {
  const tastes = [at("s4", 0.47), at("s4", 0.67), at("s4", 0.86)], bands = [380, 760, 1140], all = smooth(at("s5"), at("s5") + 1.6, T);
  frame(g, T, { bg: ["#06243c", "#01060c", 760] }, (L) => {
    for (let i = 0; i < 11000; i++) {
      const x0 = chance(i, 1) * W, y0 = chance(i, 2) * H, x = (x0 + T * (8 + chance(i, 6) * 14) + 30 * Math.sin(T * 0.3 + i)) % W, y = y0 + 10 * Math.sin(T * 0.4 + i * 0.7);
      let lit = 0.4 + 0.6 * all;
      tastes.forEach((t0, b) => (lit += 1.4 * between(T, t0, t0 + 0.5, t0 + 2.4, t0 + 4) * Math.exp(-(((y - bands[b]) / 110) ** 2))));
      L.dot(x, y, colorAt(SEA_GLASS, 0.1 + chance(i, 3) * 0.7), lit * twinkle(i, T), 1.1 + chance(i, 5) * 1.3);
    }
    // Where he tastes it: rings spreading.
    tastes.forEach((t0, b) => {
      if (T < t0) return;
      for (let k = 0; k < 4; k++) {
        const r = (T - t0) * 150 + k * 26;
        L.along(ring(540, bands[b], r, r * 0.3), 4, [0.9, 1, 1], 1.6 * (1 - smooth(0, 480, r)), 1.6);
      }
    });
    // It's everywhere: the water itself starts to move with it.
    if (all > 0) for (let i = 0; i < 500; i++) L.stream(chance(i, 11) * W, chance(i, 12) * H, Math.floor(120 + chance(i, 13) * 300), [0.3, 0.2], SEA_GLASS, 0.35 * all, 7, 1.3);
  });
}

function thatIsYou(g: Pen, T: number) {
  const c = smooth(at("s6") - 0.8, at("s6") + 2.8, T), tat = smooth(at("s6", 0.5), at("s6", 0.5) + 1.6, T);
  const pl = placer({ a: HEAD_FORM.anchor, x: 650, y: 920, s: 1.25 }), inside = inHead(pl);
  frame(g, T, { bg: ["#07203a", "#01050b", 760] }, (L) => {
    const pts = HEAD_FORM.points(24000, 0.55, 2), nEdge = Math.floor(pts.length * 0.55);
    for (let i = 0; i < pts.length; i++) {
      const [tx, ty] = pl.to(pts[i]), ci = smooth(0, 1, c * 1.5 - chance(i, 3) * 0.5), sx = chance(i, 1) * W, sy = chance(i, 2) * H;
      const x = lerp(sx, tx, ci) + (1 - ci) * 20 * Math.sin(T + i), y = lerp(sy, ty, ci);
      const col = mix3(colorAt(SEA_GLASS, 0.15 + chance(i, 4) * 0.5) as C3, i < nEdge ? GOLD_PALE : GOLD, tat);
      L.dot(x, y, col, (i < nEdge ? 0.95 : 0.22) * (0.4 + 0.6 * ci) * twinkle(i, T), 1.3);
    }
    // The salt is in him too.
    for (let i = 0; i < 1500; i++) {
      const x = chance(i, 21) * W, y = 300 + chance(i, 22) * 1100;
      if (inside(x, y)) L.dot(x + 8 * Math.sin(T * 0.5 + i), y, mix3(ICE, GOLD_PALE, tat), 0.35 * c * twinkle(i, T), 1.1);
    }
    closedEye(L, pl, GOLD_PALE, 0.9 * tat);
    const [ex, ey] = pl.to([694, 458]);
    for (let i = 0; i < 200; i++) {
      const a = chance(i, 31) * TAU, r = chance(i, 32) ** 2 * 60 * tat;
      L.dot(ex + Math.cos(a) * r, ey + Math.sin(a) * r, GOLD_PALE, 0.3 * tat, 1.2);
    }
  });
}

// ── One life, lived again and again ───────────────────────────────────────────────────────────────────
const DUSK: Look = { bg: ["#1a0b20", "#040206", 600] };

function onePoint(g: Pen, T: number) {
  frame(g, T, { bg: ["#0e0718", "#010103", 760] }, (L) => {
    stars(L, T, 900, [0.6, 0.6, 0.9], 0.08);
    const breath = 1 + 0.15 * Math.sin(T * 1.1);
    for (let i = 0; i < 60; i++) L.dot(540 + (chance(i, 1) - 0.5) * 6, 760 + (chance(i, 2) - 0.5) * 6, [1, 0.92, 0.78], 0.5 * breath, 2.2);
    for (let k = 0; k < 4; k++) {
      const r = 30 + ((T * 14 + k * 45) % 180);
      L.along(ring(540, 760, r, r), 5, [1, 0.8, 0.55], 0.9 * (1 - r / 210), 1.4, undefined, T * 10);
    }
  });
}

function again(g: Pen, T: number) {
  const reach = lerp(0.2, 14.5, smooth(at("v2") - 0.8, end("v2") + 2, T)) + 0.15 * Math.max(0, T - end("v2") - 2);
  const p = (u: number): P => [540 + 330 * (0.6 * Math.cos(u) + 0.4 * Math.cos(-5.3 * u)), 760 + 330 * (0.6 * Math.sin(u) + 0.4 * Math.sin(-5.3 * u))];
  frame(g, T, { bg: ["#120a20", "#010103", 760] }, (L) => {
    stars(L, T, 600, [0.6, 0.6, 0.9], 0.08);
    for (let u = 0, i = 0; u < reach; u += 0.0055, i++) {
      const life = Math.floor((u * 5.3) / TAU), fresh = smooth(reach - 1.2, reach, u);
      const [x, y] = p(u);
      L.dot(x, y, mix3(LIVES[life % 5], [1, 1, 1], fresh * 0.6), 0.8 + 0.7 * fresh, 1.7);
    }
    const [hx, hy] = p(reach);
    for (let i = 0; i < 40; i++) L.dot(hx + (chance(i, 1) - 0.5) * 5, hy + (chance(i, 2) - 0.5) * 5, [1, 0.95, 0.85], 0.5, 2);
  });
}

/** One of his lives: his head, a world inside it, and the back of it already streaming away. */
const LIFE_PLACE: Place = { x: 650, y: 920, s: 1.25 };
const LIFE_FLIP: Place = { x: 430, y: 920, s: 1.25, flip: true };

function fisherman(g: Pen, T: number) {
  const pl = placer({ a: HEAD_FORM.anchor, ...LIFE_PLACE }), inside = inHead(pl);
  frame(g, T, DUSK, (L) => {
    body(L, LIFE_PLACE, { edge: [1, 0.7, 0.4], go: backFirst(1), stops: EMBER });
    const horizon = pl.to([0, 560])[1], sunX = pl.to([560, 0])[0], rise = 40 * smooth(at("v3") - 1, end("v3") + 3, T), sunY = horizon + 30 - rise;
    for (let k = 0; k < 2600; k++) {
      const a = Math.PI + chance(k, 1) * Math.PI, rr = Math.sqrt(chance(k, 2)) * 82, x = sunX + Math.cos(a) * rr, y = sunY + Math.sin(a) * rr;
      if (y < horizon) L.dot(x, y, GOLD_PALE, 0.55, 1.4);
    }
    for (let k = 0; k < 12; k++) L.along(ring(sunX, sunY, 100 + k * 20, 100 + k * 20, Math.PI, TAU), 7, GOLD, 0.7 - k * 0.045, 1.3, (x, y) => inside(x, y) && y < horizon, T * 6);
    for (let k = 0; k < 70; k++) {
      const a = Math.PI + ((k + 0.5) / 70) * Math.PI;
      L.along([[sunX + Math.cos(a) * 360, sunY + Math.sin(a) * 360], [sunX + Math.cos(a) * 900, sunY + Math.sin(a) * 900]], 11, GOLD, 0.35, 1.1, (x, y) => inside(x, y) && y < horizon, T * 8);
    }
    sea(L, T, horizon, EMBER, 0.55, inside);
    for (let k = 0; k < 26; k++) {
      const y = horizon + 10 + k ** 1.5 * 6, w = (90 - k * 2.6) * (0.6 + 0.6 * twinkle(k, T * 2)), x0 = sunX - w / 2 + 10 * Math.sin(T * 1.3 + k);
      L.along([[x0, y], [x0 + w, y]], 3, GOLD_PALE, 0.6, 1.2, inside);
    }
    const bx = pl.to([370, 0])[0], by = horizon + 4 + 3 * Math.sin(T * 1.2);
    L.along([[bx - 72, by - 14], [bx - 30, by + 2], [bx + 30, by + 2], [bx + 76, by - 16]], 2, GOLD_PALE, 0.9, 1.4);
    L.along([[bx + 6, by - 4], [bx + 6, by - 30], [bx - 10, by - 44]], 2, GOLD_PALE, 0.9, 1.6);
    L.along(ring(bx - 12, by - 52, 8, 8), 2, GOLD_PALE, 0.9, 1.4);
    const pull = Math.sin(T * 0.9) * 6;
    for (let k = 0; k < 6; k++) L.along([[bx - 8, by - 30], [bx - 40 - k * 6, by - 4 + k * 4 + pull], [bx - 66 - k * 8, by + 14 + k * 7 + pull]], 4, GOLD, 0.5);
    for (let i = 0; i < 260; i++) {
      const x = chance(i, 41) * W, y = 200 + chance(i, 42) * (horizon - 200);
      if (inside(x, y)) L.dot(x, y, [1, 0.9, 0.8], (0.3 + chance(i, 43) * 0.6) * twinkle(i, T), 1 + chance(i, 44));
    }
    closedEye(L, pl, [1, 0.8, 0.5], 0.8);
  });
}

function queen(g: Pen, T: number) {
  const pl = placer({ a: HEAD_FORM.anchor, ...LIFE_FLIP }), inside = inHead(pl);
  frame(g, T, { bg: ["#1c0a24", "#050208", 600] }, (L) => {
    body(L, LIFE_FLIP, { edge: [1, 0.55, 0.78], go: backFirst(0.9), stops: ROSE, wind: [0.6, -0.7] });
    // Her crown, with a jewel at every point.
    const crown: P[] = [[350, 262], [372, 128], [438, 214], [500, 92], [562, 200], [628, 112], [656, 236]];
    L.along(crown.map(pl.to), 2.4, GOLD_PALE, 1, 1.5);
    L.along([crown[0], crown[6]].map(pl.to), 2.4, GOLD, 0.8, 1.4);
    for (const i of [1, 3, 5]) {
      const [x, y] = pl.to(crown[i]);
      for (let k = 0; k < 30; k++) L.dot(x + (chance(k + i * 50, 1) - 0.5) * 10, y + (chance(k + i * 50, 2) - 0.5) * 10, [1, 0.35, 0.6], 0.35, 1.6);
    }
    // Inside: her palace, arch after arch, and far at the end a window onto a sea she never saw.
    const [vx, vy] = pl.to([470, 560]);
    for (let k = 0; k < 9; k++) {
      const s = 0.8 ** k, w = 330 * s, h = 470 * s, base = vy + 300 * s, arch: P[] = [[vx - w, base], [vx - w, base - h + w], ...ring(vx, base - h + w, w, w, Math.PI, TAU), [vx + w, base]];
      L.along(arch, 4, mix3(GOLD, [1, 0.5, 0.7], k / 9), 0.75 * (1 - k * 0.07), 1.3, inside, T * 5);
    }
    for (let k = 0; k < 14; k++) {
      const f = k / 13, x = vx - 700 + f * 1400;
      L.along([[vx, vy + 40], [x, vy + 700]], 7, [0.9, 0.5, 0.7], 0.3, 1.1, inside);
    }
    for (let k = 0; k < 10; k++) {
      const y = vy + 40 + (k / 9) ** 2 * 660;
      L.along([[vx - 800, y], [vx + 800, y]], 7, [0.9, 0.5, 0.7], 0.25, 1.1, inside);
    }
    const s = 0.8 ** 9, ww = 330 * s * 0.6;
    for (let k = 0; k < 4; k++) L.along([[vx - ww, vy + 2 + k * 4], [vx + ww, vy + 2 + k * 4]], 3, ICE, 0.9, 1.3, undefined, T * 12 * (k % 2 ? 1 : -1));
  });
}

function helmet(L: Light, pl: ReturnType<typeof placer>, c: C3, w: number) {
  const dome = ring(505, 430, 262, 252, Math.PI * 1.04, Math.PI * 1.96);
  L.along(dome.map(pl.to), 2.4, c, w, 1.5);
  L.along(([[228, 470], [790, 428]] as P[]).map(pl.to), 2.4, c, w, 1.5);
  L.along(ring(505, 430, 236, 226, Math.PI * 1.1, Math.PI * 1.9).map(pl.to), 6, c, w * 0.5, 1.2);
}

function soldier(g: Pen, T: number) {
  const pl = placer({ a: HEAD_FORM.anchor, ...LIFE_PLACE }), inside = inHead(pl);
  frame(g, T, { bg: ["#081a1c", "#010304", 600] }, (L) => {
    body(L, LIFE_PLACE, { edge: [0.55, 1, 0.85], go: backFirst(0.9), stops: TEAL });
    helmet(L, pl, [0.7, 0.95, 0.8], 0.9);
    // Inside: a field at night, and far off on the edge of it, home.
    const horizon = pl.to([0, 600])[1], [vx] = pl.to([470, 0]);
    for (let k = 0; k < 18; k++) {
      const x = vx - 900 + (k / 17) * 1800;
      L.along([[vx, horizon], [x, horizon + 700]], 6, [0.35, 0.75, 0.65], 0.35, 1.1, inside);
    }
    for (let k = 0; k < 12; k++) L.along([[0, horizon + (k / 11) ** 2 * 600], [W, horizon + (k / 11) ** 2 * 600]], 8, [0.35, 0.7, 0.6], 0.2, 1.1, inside);
    for (let i = 0; i < 300; i++) {
      const x = chance(i, 51) * W, y = 200 + chance(i, 52) * (horizon - 200);
      if (inside(x, y)) L.dot(x, y, [0.8, 0.95, 1], (0.3 + chance(i, 53) * 0.5) * twinkle(i, T), 1.1);
    }
    const hx = vx - 60, hy = horizon - 2, warm = 0.8 + 0.2 * Math.sin(T * 0.7);
    L.along([[hx - 16, hy], [hx - 16, hy - 16], [hx, hy - 28], [hx + 16, hy - 16], [hx + 16, hy]], 2, [0.5, 0.8, 0.7], 0.8, 1.2);
    for (let k = 0; k < 40; k++) L.dot(hx + (chance(k, 61) - 0.5) * 8, hy - 9 + (chance(k, 62) - 0.5) * 7, [1, 0.75, 0.35], 0.4 * warm, 1.6);
    for (let k = 0; k < 120; k++) {
      const a = chance(k, 63) * TAU, r = chance(k, 64) ** 2 * 40;
      L.dot(hx + Math.cos(a) * r, hy - 9 + Math.sin(a) * r, [1, 0.7, 0.3], 0.12 * warm, 1.2);
    }
  });
}

const PAIR_L: Place = { x: 272, y: 766, s: 0.86 };
const PAIR_R: Place = { x: 808, y: 766, s: 0.86, flip: true };

function enemies(g: Pen, T: number) {
  const same = smooth(at("v6", 0.3), end("v6") + 0.8, T);
  const l = placer({ a: HEAD_FORM.anchor, ...PAIR_L }), r = placer({ a: HEAD_FORM.anchor, ...PAIR_R });
  frame(g, T, { bg: ["#140a12", "#020103", 760] }, (L) => {
    const cl = mix3([0.55, 1, 0.85], GOLD_PALE, same), cr = mix3([1, 0.55, 0.3], GOLD_PALE, same);
    body(L, PAIR_L, { edge: cl, go: backFirst(0.5), stops: TEAL, n: 18000 });
    body(L, PAIR_R, { edge: cr, go: backFirst(0.5), stops: EMBER, wind: [0.6, -0.7], n: 18000 });
    helmet(L, l, cl, 0.8);
    helmet(L, r, cr, 0.8);
    const rows = gapRows(inHead(l), inHead(r), 380, 960, 320);
    rows.forEach(([y, a, b], k) => {
      for (let x = a + 8, j = 0; x < b - 8; x += 9, j++) if (hash(k, j, 5) < 0.25) L.dot(x, y + 6 * Math.sin(T * 2 + k + j), mix3([1, 0.25, 0.2], GOLD_PALE, same), 0.35 * twinkle(k * 13 + j, T * 2), 1.2);
    });
  });
}

function child(g: Pen, T: number) {
  const place: Place = { x: 440, y: 920, s: 1.1 }, pl = placer({ a: CHILD_FORM.anchor, ...place }), inside = inHead(pl, CHILD_FORM), word = at("v7", 0.72);
  frame(g, T, { bg: ["#1a1426", "#030206", 700] }, (L) => {
    body(L, place, { form: CHILD_FORM, edge: [1, 0.88, 0.65], fill: [0.9, 0.7, 0.5], fillW: 0.12, n: 24000 });
    for (let i = 0; i < 400; i++) {
      const x = chance(i, 71) * W, y = 200 + chance(i, 72) * 900;
      if (inside(x, y)) L.dot(x + 10 * Math.sin(T * 0.4 + i), y, LIVES[i % 5], 0.7 * twinkle(i, T), 1.5);
    }
    // The first word: rings of light leaving the mouth, each a new colour.
    const [mx, my] = pl.to([772, 652]);
    for (let k = 0; k < 40; k++) {
      const t0 = word + k * 0.42;
      if (T < t0) break;
      const r = (T - t0) * 170 + 6;
      L.along(ring(mx, my, r, r, -0.85, 0.85), 4, LIVES[k % 5], 1.1 * (1 - smooth(60, 760, r)), 1.4);
    }
  });
}

function bus(g: Pen, T: number) {
  const place: Place = { x: 420, y: 960, s: 1.1 }, pl = placer({ a: HEAD_FORM.anchor, ...place }), inside = inHead(pl), forget = smooth(at("v8", 0.5), end("v8") + 1.2, T);
  const city: C3[] = [[1, 0.7, 0.3], [0.3, 0.9, 1], [1, 0.4, 0.6], [1, 0.95, 0.85], [0.7, 0.5, 1]];
  frame(g, T, { bg: ["#0c0a1a", "#020104", 760] }, (L) => {
    // The window, and the city going past it.
    const win: P[] = [[100, 380], [980, 380], [980, 1180], [100, 1180], [100, 380]];
    L.along(win, 5, [0.6, 0.65, 0.9], 0.3, 1.2);
    for (let i = 0; i < 90; i++) {
      const y = 400 + chance(i, 1) * 760, near = chance(i, 2), v = 120 + near * 900, len = 40 + near * 380, span = W + 800;
      const x = ((chance(i, 3) * span - T * v) % span + span) % span - 400;
      L.along([[Math.max(104, x), y], [Math.min(976, x + len), y]], 3 + near * 2, city[i % 5], 0.5 + near * 0.6, 1.3 + near * 0.8, (px, py) => !inside(px, py));
    }
    const pts = HEAD_FORM.points(9000, 1, 4);
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pl.to(pts[i]);
      L.dot(x, y, [0.75, 0.8, 1], 0.8 * (1 - 0.8 * forget), 1.3);
      const [rx, ry] = [W - x + 260, y - 30];
      if (i % 3 === 0 && rx < 976 && ry > 384 && ry < 1176) L.dot(rx, ry, [0.6, 0.7, 1], 0.08 * (1 - forget), 1.1);
    }
  });
}

function forget(g: Pen, T: number) {
  const go = smooth(at("v9") - 0.5, at("v9", 0.5), T), home = smooth(at("v9", 0.55), end("v9") + 1.4, T), C: P = [540, 760];
  const pl = placer({ a: HEAD_FORM.anchor, ...LIFE_PLACE });
  frame(g, T, { bg: ["#120a20", "#010103", 760] }, (L) => {
    const pts = HEAD_FORM.points(16000, 0.6, 5);
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pl.to(pts[i]), d = go * 1.4 - chance(i, 2) * 0.4, col = LIVES[Math.floor(chance(i, 3) * 5)];
      const px = lerp(x, C[0], home), py = lerp(y, C[1], home);
      if (d > 0.2 && chance(i, 1) < 0.18) L.stream(px, py, Math.floor(d * (80 + chance(i, 4) * 400) * (1 - home)), [-0.5, -0.7], hue(col), 0.3 * (1 - home), 6, 1.3);
      else if (d < 0.6) L.dot(px, py, col, (i < 9600 ? 0.5 : 0.12) * (1 - Math.max(0, d)) * (1 - home * 0.9), 1.2);
    }
    for (let i = 0; i < 60; i++) L.dot(540 + (chance(i, 7) - 0.5) * 6, 760 + (chance(i, 8) - 0.5) * 6, [1, 0.92, 0.78], 0.5 * home, 2.2);
  });
}

// ── Kindness: stained glass, every shard a life ─────────────────────────────────────────────────────────
const GLASS: Look = { bg: ["#0a0a24", "#020208", 760], gain: 1.35 };
let WINDOW: Float32Array | undefined;
function windowGlass() {
  if (WINDOW) return WINDOW;
  const out: number[] = [];
  for (let y = 0; y < H; y += 6)
    for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) {
      const jx = x + (hash(x, y, 1) - 0.5) * 3, jy = y + (hash(x, y, 2) - 0.5) * 3, sh = shard(jx, jy, 80, 3);
      if (sh.edge > 4) out.push(jx, jy, hash(sh.i, sh.j, 4));
    }
  return (WINDOW = Float32Array.from(out));
}
function backWindow(L: Light, T: number, lit: (x: number, y: number, h: number) => number, w = 0.14) {
  const g = windowGlass();
  for (let k = 0; k < g.length; k += 3) {
    const h = g[k + 2], m = lit(g[k], g[k + 1], h);
    if (m > 0.01) L.dot(g[k], g[k + 1], GLASS_ALL[Math.floor(h * GLASS_ALL.length)], w * m * (0.5 + 0.5 * h) * (0.85 + 0.15 * Math.sin(T * 0.6 + h * 50)), 1.2);
  }
}

function lightsUp(g: Pen, T: number) {
  const R = 1500 * smooth(PARTS.kindness.from + 0.5, end("k1") + 1.5, T);
  frame(g, T, GLASS, (L) => backWindow(L, T, (x, y, h) => smooth(0, 1, (R - Math.hypot(x - 540, y - 760)) / 180 + h * 0.6), 0.55));
}

function given(g: Pen, T: number, o: { hurt?: number; warm?: boolean } = {}) {
  const l = placer({ a: HEAD_FORM.anchor, ...PAIR_L }), r = placer({ a: HEAD_FORM.anchor, ...PAIR_R }), hurt = o.hurt ?? 0;
  frame(g, T, GLASS, (L) => {
    backWindow(L, T, () => 1 - hurt * 0.5, 0.12);
    const fade = (y: number) => 1 - smooth(960, 1110, y);
    glassBody(L, PAIR_L, o.warm ? GLASS_WARM : GLASS_COLD, 1.1, T, { hurt, fade });
    glassBody(L, PAIR_R, GLASS_WARM, 1.1, T, { hurt, fade });
    const rows = gapRows(inHead(l), inHead(r), 400, 950, 300);
    fillGap(L, T, rows, mix3(GOLD, [0.9, 0.12, 0.15], hurt), hurt > 0.5 ? RED : GOLDEN, 0.7, lerp(-1.2, 1.4, hurt));
  });
}
const kindness = (g: Pen, T: number) => given(g, T);
const cruel = (g: Pen, T: number) => given(g, T, { hurt: smooth(at("k3") - 0.3, at("k3") + 1.4, T) });

function merge(g: Pen, T: number) {
  const m = smooth(at("k4") - 0.4, end("k4") + 0.8, T), s = lerp(0.86, 0.95, m);
  const pL: Place = { x: lerp(272, 540, m), y: 766, s }, pR: Place = { x: lerp(808, 540, m), y: 766, s, flip: true };
  frame(g, T, GLASS, (L) => {
    backWindow(L, T, () => 1, 0.12);
    const fade = (y: number) => 1 - smooth(980, 1140, y);
    glassBody(L, pL, GLASS_COLD, 1.1, T, { fade });
    glassBody(L, pR, GLASS_WARM, 1.1, T, { fade });
    const rows = gapRows(inHead(placer({ a: HEAD_FORM.anchor, ...pL })), inHead(placer({ a: HEAD_FORM.anchor, ...pR })), 400, 950, 300);
    fillGap(L, T, rows, GOLD, GOLDEN, 0.7 * (1 - m));
    // Where they become one, a light.
    for (let i = 0; i < 500 * m; i++) {
      const a = chance(i, 1) * TAU, rr = chance(i, 2) ** 1.5 * 260;
      L.dot(540 + Math.cos(a) * rr, 600 + Math.sin(a) * rr, GOLD_PALE, 0.25 * m * twinkle(i, T), 1.3);
    }
  });
}

function waiting(g: Pen, T: number) {
  const place: Place = { x: 540, y: 560, s: 0.32 }, glow = 0.75 + 0.25 * Math.sin(T * 0.6);
  frame(g, T, { bg: ["#0a0c22", "#010206", 600] }, (L) => {
    stars(L, T, 900, [0.7, 0.75, 1], 0.22, 3, 0, 900);
    glassBody(L, place, GLASS_WARM, 1.6 * glow, T);
    // The road home, its lights moving towards them.
    for (let k = -6; k <= 6; k++) L.along([[540 + k * 160, 1700], [540 + k * 6, 780]], 9, k % 3 ? [0.4, 0.5, 0.9] : [1, 0.75, 0.4], k % 3 ? 0.25 : 0.45, 1.2, undefined, -T * 30);
    for (let i = 0; i < 300; i++) {
      const a = chance(i, 1) * TAU, rr = 40 + chance(i, 2) ** 2 * 200;
      L.dot(540 + Math.cos(a) * rr, 560 + Math.sin(a) * rr * 1.3, [1, 0.7, 0.35], 0.08 * glow, 1.2);
    }
  });
}

// ── Open individualism ────────────────────────────────────────────────────────────────────────────────
function net(g: Pen, T: number) {
  frame(g, T, { bg: ["#0c0820", "#010104", 760] }, (L) => {
    const zc = T * 0.5, f = 620, turn = T * 0.03, c = Math.cos(turn), s = Math.sin(turn);
    const proj = (x: number, y: number, z: number): P => [540 + ((x * c - y * s) * f) / z, 760 + ((x * s + y * c) * f) / z];
    const z0 = Math.floor(zc) + 1;
    for (let k = 0; k < 14; k++) {
      const zi = z0 + k, z = zi - zc, fade = smooth(0.3, 1.2, z) * (1 - smooth(9, 14, z));
      for (let i = -4; i <= 4; i++)
        for (let j = -6; j <= 6; j++) {
          const [x, y] = proj(i, j, z), h = hash(i, j * 31 + zi, 7), col = GLASS_ALL[Math.floor(h * GLASS_ALL.length)], size = Math.min(5, 2.6 / z + 0.8);
          if (x < -50 || x > W + 50 || y < -50 || y > H + 50) continue;
          L.dot(x, y, col, 2.4 * fade, size + 0.6);
          // Each jewel holds the lights of its neighbours.
          for (let q = 0; q < 6; q++) {
            const a = (q / 6) * TAU + T * 0.4, rr = 7 / z + 2;
            L.dot(x + Math.cos(a) * rr, y + Math.sin(a) * rr, GLASS_ALL[Math.floor(hash(i + q, j, zi) * GLASS_ALL.length)], 0.8 * fade, 1.2);
          }
          if (z < 6) {
            L.along([[x, y], proj(i + 1, j, z)], 6, col, 0.25 * fade, 1.1);
            L.along([[x, y], proj(i, j + 1, z)], 6, col, 0.25 * fade, 1.1);
          }
        }
    }
  });
}

function wall(g: Pen, T: number) {
  const fall = smooth(at("o2", 0.5), end("o2") + 1.6, T);
  const pL: Place = { x: 210, y: 766, s: 0.82 }, pR: Place = { x: 870, y: 766, s: 0.82, flip: true };
  frame(g, T, GLASS, (L) => {
    backWindow(L, T, () => 1, 0.1);
    const fade = (y: number) => 1 - smooth(960, 1110, y);
    glassBody(L, pL, GLASS_COLD, 1.1, T, { fade });
    glassBody(L, pR, GLASS_WARM, 1.1, T, { fade });
    // The wall: pale glass between them, coming apart shard by shard.
    for (let y = 0, i = 0; y < H; y += 5)
      for (let x = 430; x < 650; x += 5, i++) {
        const sh = shard(x, y, 46, 9);
        if (sh.edge < 3) continue;
        const h = hash(sh.i, sh.j, 9), goneK = smooth(h - 0.15, h + 0.05, fall * 1.2);
        if (goneK > 0.02 && hash(x, y, 4) < 0.05) L.stream(x, y, Math.floor(goneK * (100 + hash(x, y, 5) * 300)), [0, 0.9], SEA_GLASS, 0.35 * (1 - goneK * 0.6), 6, 1.2);
        if (goneK < 1) L.dot(x, y, [0.75, 0.85, 1], 0.4 * (1 - goneK) * (0.5 + 0.5 * h), 1.3);
      }
    const rows = gapRows(inHead(placer({ a: HEAD_FORM.anchor, ...pL })), inHead(placer({ a: HEAD_FORM.anchor, ...pR })), 400, 950, 600);
    fillGap(L, T, rows, GOLD, GOLDEN, 0.55 * smooth(0.5, 1, fall));
  });
}

function skin(g: Pen, T: number) {
  const out = smooth(at("o3", 0.5), end("o3") + 1.5, T), pl = placer({ a: HEAD_FORM.anchor, ...LIFE_PLACE }), inside = inHead(pl);
  frame(g, T, { bg: ["#0a1220", "#010204", 760] }, (L) => {
    const pts = HEAD_FORM.points(20000, 0.6, 6);
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pl.to(pts[i]);
      if (i < 12000) L.dot(x, y, [0.75, 1, 0.95], 0.9, 1.3);
      else if (out > 0 && chance(i, 1) < 0.09) L.stream(x, y, Math.floor(out * (150 + chance(i, 2) * 700)), [0.4, -0.3], GOLDEN, 0.35 * out, 6, 1.3);
    }
    // His memories, inside.
    for (let m = 0; m < 34; m++) {
      const cx = pl.to([520, 520])[0] + 260 * Math.sin(T * (0.11 + chance(m, 1) * 0.1) + m * 2.1), cy = 780 + 300 * Math.cos(T * (0.09 + chance(m, 2) * 0.1) + m * 1.3);
      const r = 10 + chance(m, 3) * 22, col = LIVES[m % 5];
      for (let q = 0; q < 18; q++) {
        const a = (q / 14) * TAU + T * 0.5, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (inside(x, y)) L.dot(x, y, col, 1.1, 1.6);
      }
    }
  });
}

function eye(g: Pen, T: number) {
  const Z = 1 + 9 * smooth(at("o4") + 0.5, PARTS.open.to + 0.6, T) ** 2.2, C: P = [540, 760];
  frame(g, T, { bg: ["#0c0a1c", "#010103", 760], gain: 1.3 }, (L) => {
    const lid = (u: number) => (1 - u * u) * Z;
    for (const sgn of [-1, 1]) {
      const pts: P[] = [];
      for (let u = -1; u <= 1; u += 0.01) pts.push([C[0] + 420 * u * Z, C[1] + sgn * (sgn < 0 ? 190 : 160) * lid(u)]);
      L.along(pts, 3, [1, 0.85, 0.65], 0.8, 1.4);
    }
    const R = 160 * Z, P0 = 58 * Z, spin = T * 0.02;
    for (let k = 0; k < 520; k++) {
      const a = (k / 520) * TAU + spin, col = GLASS_ALL[Math.floor(hash(k, 1, 3) * GLASS_ALL.length)], r1 = P0 + 4, r2 = R * (0.9 + 0.1 * hash(k, 2, 3));
      L.along([[C[0] + Math.cos(a) * r1, C[1] + Math.sin(a) * r1], [C[0] + Math.cos(a) * r2, C[1] + Math.sin(a) * r2]], 5, col, 0.5 * (0.5 + hash(k, 4, 3)), 1.2, (x, y) => {
        const u = (x - C[0]) / (420 * Z);
        return Math.abs(u) < 1 && y > C[1] - 190 * lid(u) && y < C[1] + 160 * lid(u);
      }, T * 4);
    }
    L.along(ring(C[0], C[1], R, R), 3, [0.4, 0.5, 1], 0.6, 1.3);
    L.along(ring(C[0], C[1], P0 * 1.7, P0 * 1.7), 4, GOLD, 0.4, 1.2);
    // In the pupil, the one who is looking: the same point of light as before.
    for (let i = 0; i < 60; i++) L.dot(C[0] + (chance(i, 1) - 0.5) * 6, C[1] + (chance(i, 2) - 0.5) * 6, [1, 0.92, 0.78], 0.5 * (1 + 0.15 * Math.sin(T * 1.1)), 2.2);
  });
}

// ── The egg myths: gold and silver engraved on lapis ────────────────────────────────────────────────────
const LAPIS: Look = { bg: ["#0d1d58", "#02051a", 700], gain: 1.1, glow: [20, 0.5] };

function flowerOfLife(g: Pen, T: number) {
  const t0 = PARTS.egg.from + 0.3, cx = 540, cy = 720, R = 105;
  const centres: P[] = [];
  for (let i = -6; i <= 6; i++)
    for (let j = -8; j <= 8; j++) {
      const x = cx + (i + (j % 2 ? 0.5 : 0)) * R, y = cy + j * R * 0.866;
      if (Math.hypot(x - cx, y - cy) < 540) centres.push([x, y]);
    }
  centres.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
  frame(g, T, LAPIS, (L) => {
    stars(L, T, 400, GOLD, 0.15);
    centres.forEach(([x, y], n) => {
      const k = smooth(t0 + n * 0.13, t0 + n * 0.13 + 1.6, T);
      if (k <= 0) return;
      const a0 = hash(n, 1, 2) * TAU;
      L.along(ring(x, y, R, R, a0, a0 + TAU * k), 5, GOLD, 0.75, 1.4);
    });
    const e = smooth(end("e1") - 1, end("e1") + 1.5, T);
    if (e > 0) {
      const pts = egg(cx, cy, 230, 300);
      L.along(pts.slice(0, Math.floor(pts.length * e)), 2.5, GOLD_PALE, 1, 1.6);
    }
  });
}

function golden(g: Pen, T: number) {
  const cx = 540, cy = 680, a = 230, b = 300, base = cy + b - 8;
  const out = (x: number, y: number) => (x - cx) ** 2 / (a * 1.02) ** 2 + (y - cy) ** 2 / (b * 1.02) ** 2 > 1 && y < base;
  frame(g, T, LAPIS, (L) => {
    const R = 105;
    for (let i = -6; i <= 6; i++)
      for (let j = -8; j <= 8; j++) {
        const x = cx + (i + (j % 2 ? 0.5 : 0)) * R, y = cy + j * R * 0.866;
        if (Math.hypot(x - cx, y - cy) > 540) continue;
        L.along(ring(x, y, R, R), 8, GOLD, 0.22, 1.1, (px, py) => out(px, py) && Math.hypot(px - cx, py - cy) < 600);
      }
    halo(L, cx, cy, 440, T, GOLD, 1, out);
    engravedEgg(L, cx, cy, a, b, GOLD, GOLD_PALE, 1, { spin: T * 0.3 });
    for (let k = 0; k < 16; k++) {
      const rx = 150 + ((k * 40 + T * 22) % 640), fade = 1 - rx / 800;
      L.along(ring(cx, base + 8 + rx * 0.05, rx, rx * 0.11), 5, GOLD, 0.6 * fade, 1.3);
    }
    for (let k = 0; k < 34; k++) {
      const y = base + 40 + k * 13, w = (190 - k * 4.5) * (0.6 + 0.5 * twinkle(k, T * 2)), x0 = cx - w / 2 + 14 * Math.sin(T * 1.2 + k * 0.7);
      L.along([[x0, y], [x0 + w, y]], 4, GOLD, 0.45 - k * 0.011, 1.2);
    }
  });
}

function pangu(g: Pen, T: number) {
  const cx = 540, cy = 760, a = 300, b = 390;
  frame(g, T, { bg: ["#0a1238", "#02040f", 760], gain: 1.15, glow: [22, 0.55] }, (L) => {
    stars(L, T, 300, GOLD, 0.12);
    // Rings of years, slowly widening.
    for (let k = 0; k < 7; k++) {
      const r = (k * 55 + T * 5) % 385, f = r / 385;
      L.along(ring(cx, cy, r * (a / b), r), 7, GOLD, 0.25 * Math.sin(f * Math.PI), 1.1);
    }
    // Yin and yang: two currents turning round each other.
    for (let i = 0; i < 1000; i++) {
      const warm = i % 2 === 0, ang = chance(i, 1) * TAU, rr = (0.25 + chance(i, 2) * 0.6) * a;
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * (b / a);
      L.stream(x, y, Math.floor(60 + chance(i, 3) * 140), (px, py) => {
        const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) + 1, sg = warm ? 1 : -1;
        return [(-dy / d) * 2.2 * sg - (dx / d) * 0.3, (dx / d) * 2.2 * sg - (dy / d) * 0.3];
      }, warm ? GOLDEN : [[0, [0.35, 0.5, 1]], [1, [0.3, 0.2, 0.8]]], 0.45, 6, 1.3);
    }
    // The giant, asleep, curled in the middle of it.
    const s = 0.4 * (1 + 0.012 * Math.sin(T * 0.9)), pl = placer({ a: HEAD_FORM.anchor, x: cx - 10, y: cy + 30, s });
    L.along(HEAD_FORM.outline.map(pl.to), 2.2, GOLD_PALE, 0.95, 1.4);
    closedEye(L, pl, GOLD_PALE, 0.9);
    engravedEgg(L, cx, cy, a, b, GOLD, GOLD_PALE, 1.2, { rings: 44, meridians: false });
  });
}

function silver(g: Pen, T: number) {
  const cx = 540, cy = 760, a = 240, b = 310, crack = crackLine(cx + 10, cy - b + 6, cy + 140, 4), grow = smooth(at("e4") - 0.4, at("e4", 0.5), T), burst = smooth(at("e4", 0.42), end("e4") + 1.2, T);
  frame(g, T, { bg: ["#0b1230", "#010208", 760], gain: 1.15 }, (L) => {
    stars(L, T, 500, SILVER, 0.18);
    engravedEgg(L, cx, cy, a, b, [0.55, 0.65, 0.9], SILVER, 1, { spin: T * 0.3 });
    const shown = crack.slice(0, Math.max(2, Math.ceil(crack.length * grow)));
    L.along(shown, 1.8, [1, 0.97, 0.9], 1.4 * Math.min(1, grow * 3), 1.6);
    // The first light breaking out.
    const [ox, oy] = crack[Math.floor(crack.length * 0.35)];
    for (let k = 0; k < 140; k++) {
      const ang = (k / 140) * TAU + hash(k, 1, 1) * 0.04, len = burst * (300 + hash(k, 2, 1) * 700);
      L.along([[ox + Math.cos(ang) * 30, oy + Math.sin(ang) * 30], [ox + Math.cos(ang) * len, oy + Math.sin(ang) * len]], 8, k % 3 ? [1, 0.92, 0.75] : SILVER, 0.85 * burst, 1.4, undefined, T * 40);
    }
    for (let i = 0; i < 900 * burst; i++) {
      const p = shown[Math.floor(chance(i, 1) * shown.length)] ?? [ox, oy];
      L.stream(p[0], p[1], Math.floor(80 + chance(i, 2) * 400), [(chance(i, 3) - 0.5) * 1.2, -1.1], GOLDEN, 0.3 * burst, 7, 1.3);
    }
  });
}

function threeEggs(g: Pen, T: number) {
  const m = smooth(at("e5", 0.25), end("e5") + 1.4, T);
  const eggs: [number, C3, C3][] = [[220, GOLD, GOLD_PALE], [540, [1, 0.35, 0.3], [1, 0.7, 0.55]], [860, [0.55, 0.65, 0.9], SILVER]];
  frame(g, T, LAPIS, (L) => {
    stars(L, T, 400, GOLD, 0.14);
    for (const [x0, c, pale] of eggs) engravedEgg(L, lerp(x0, 540, m), 760, lerp(120, 200, m), lerp(155, 260, m), c, pale, 0.7, { rings: 40, meridians: false, spin: T * 0.3 });
    if (m > 0.3) halo(L, 540, 760, lerp(200, 400, m), T, GOLD, smooth(0.3, 1, m));
  });
}

/** The egg of lives: every life a small head inside it; they light up, the shell cracks, and everything pours out. */
const HEADS = Array.from({ length: 46 }, (_, i) => ({ ang: chance(i, 1) * TAU, rad: 0.2 + Math.sqrt(chance(i, 2)) * 0.62, speed: 0.04 + chance(i, 3) * 0.08, s: 0.07 + chance(i, 4) * 0.05, flip: chance(i, 5) < 0.5, col: GLASS_ALL[Math.floor(chance(i, 6) * GLASS_ALL.length)], lights: chance(i, 7) }));
function lives(g: Pen, T: number) {
  const cx = 540, cy = 780, a = 360, b = 470, lit = smooth(at("x1") - 0.5, end("x1") + 1.2, T), crk = smooth(at("x2") - 0.1, end("x2") + 0.2, T), burst = smooth(end("x2") + 0.3, end("x2") + 3.2, T);
  const crack = crackLine(cx + 14, cy - b + 8, cy - 60, 7), split = cy - 150, beat = 1 + 0.2 * Math.sin(T * 2.1) * (1 - burst);
  const pals: Stops[] = [hue([1, 0.55, 0.15]), hue([0.2, 0.85, 1]), hue([1, 0.25, 0.5]), hue([1, 0.82, 0.3]), hue([0.45, 0.3, 1]), hue([0.3, 1, 0.6])];
  frame(g, T, { bg: ["#151030", "#020108", 780], gain: 1.2, glow: [26, 0.7] }, (L) => {
    stars(L, T, 400, [0.8, 0.8, 1], 0.14);
    // The shell: its top lifts away when it breaks.
    engravedEgg(L, cx, cy, a, b, GOLD, GOLD_PALE, 0.5 * (1 - burst * 0.4), { rings: 56, meridians: false, lift: (y) => (y < split ? [30 * burst, -320 * burst - (split - y) * 0.2 * burst, 0.25 * burst] : [0, 0, 0]) });
    if (burst < 1) L.along(egg(cx, cy, a, b), 2.5, GOLD_PALE, 0.7 * (1 - burst), 1.5, (x, y) => y > split);
    if (burst < 1) L.along(egg(cx, cy, a, b), 2.5, GOLD_PALE, 0.7 * (1 - burst), 1.5, (x, y) => y <= split && burst < 0.05);
    // Something growing, not yet born: a slow heartbeat of light.
    for (let i = 0; i < 400; i++) {
      const ang = chance(i, 11) * TAU, rr = chance(i, 12) ** 1.6 * 160 * beat;
      L.dot(cx + Math.cos(ang) * rr, cy + 40 + Math.sin(ang) * rr, [1, 0.75, 0.45], 0.1 * (1 + lit), 1.3);
    }
    HEADS.forEach((h, i) => {
      const ang = h.ang + T * h.speed, out = 1 + burst * 2.2, x = cx + Math.cos(ang) * h.rad * a * 0.85 * out, y = cy + 30 + Math.sin(ang) * h.rad * b * 0.8 * out;
      const on = smooth(h.lights * 0.8, h.lights * 0.8 + 0.2, lit), pl = placer({ a: HEAD_FORM.anchor, x, y, s: h.s * (1 + burst), flip: h.flip, rot: 0.2 * Math.sin(T * 0.3 + i) });
      L.along(HEAD_FORM.outline.map(pl.to), 2.4, mix3(h.col, GOLD_PALE, on), (0.55 + 0.6 * on) * (1 - burst * 0.6), 1.3);
    });
    if (crk > 0) {
      const shown = crack.slice(0, Math.max(2, Math.ceil(crack.length * crk)));
      L.along(shown, 1.8, [1, 0.97, 0.9], 1.3 * (1 - burst), 1.7);
      for (let i = 0; i < 300 * (1 - burst); i++) {
        const p = shown[Math.floor(chance(i, 21) * shown.length)];
        L.stream(p[0], p[1], Math.floor(30 + chance(i, 22) * 80), [(chance(i, 23) - 0.5) * 1.6, -0.6], GOLDEN, 0.35 * crk, 5, 1.2);
      }
    }
    // What comes out, remembering everyone: every kind of light, opening like a flower.
    for (let k = 0; k < 1300 * burst; k++) {
      const ang = -Math.PI / 2 + (chance(k, 31) - 0.5) * 3.6, sp = 1.4 + chance(k, 32) * 1.2;
      L.stream(cx + (chance(k, 33) - 0.5) * 520, split - 10 - chance(k, 34) * 40, Math.floor((200 + chance(k, 35) * 1000) * burst), (px, py) => {
        const dx = px - cx, dy = py - split, d = Math.hypot(dx, dy) + 1;
        return [(dx / d) * sp + Math.cos(ang) * 0.6, (dy / d) * sp + Math.sin(ang) * 0.6];
      }, pals[k % pals.length], 0.4, 8, 1.5);
    }
  });
}

function gentle(g: Pen, T: number) {
  const l = placer({ a: HEAD_FORM.anchor, ...PAIR_L }), r = placer({ a: HEAD_FORM.anchor, ...PAIR_R }), breath = 0.85 + 0.15 * Math.sin(T * 0.8);
  frame(g, T, { bg: ["#1a1020", "#040206", 760], gain: 1.3 }, (L) => {
    backWindow(L, T, () => 0.7, 0.1);
    const fade = (y: number) => 1 - smooth(960, 1110, y);
    glassBody(L, PAIR_L, GLASS_WARM, 1.05 * breath, T, { fade });
    glassBody(L, PAIR_R, GLASS_WARM, 1.05 * breath, T, { fade });
    fillGap(L, T, gapRows(inHead(l), inHead(r), 400, 950, 300), GOLD_PALE, GOLDEN, 0.6 * breath, -0.8);
  });
}

function you(g: Pen, T: number) {
  const pl = placer({ a: HEAD_FORM.anchor, ...LIFE_PLACE }), shine = smooth(at("x5") - 0.3, end("x5") + 0.6, T), fade = smooth(end("x5") + 0.8, end("x5") + 4, T);
  frame(g, T, { bg: ["#140c1e", "#010103", 760] }, (L) => {
    const pts = HEAD_FORM.points(14000, 0.7, 7);
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pl.to(pts[i]);
      L.dot(x, y, GOLD_PALE, (i < 9800 ? 0.5 : 0.08) * (1 - fade) * twinkle(i, T), 1.2);
    }
    const [ex, ey] = pl.to([694, 456]);
    for (let i = 0; i < 80; i++) L.dot(ex + (chance(i, 1) - 0.5) * 7, ey + (chance(i, 2) - 0.5) * 7, [1, 0.94, 0.82], 0.35 + 0.5 * shine, 2.2);
    for (let i = 0; i < 300 * shine; i++) {
      const ang = chance(i, 3) * TAU, rr = chance(i, 4) ** 2 * 120;
      L.dot(ex + Math.cos(ang) * rr, ey + Math.sin(ang) * rr, [1, 0.8, 0.5], 0.12 * shine, 1.2);
    }
  });
}

// ── The film ──────────────────────────────────────────────────────────────────────────────────────────
type Shot = [from: number, paint: (g: Pen, T: number) => void];
const before = (id: string, s = 0.6) => at(id) - s;
export const SHOTS: Shot[] = [
  [0, hook],
  [PARTS.salt.from, father], [before("s2"), drop], [before("s3"), gone], [before("s4"), everywhere], [before("s6"), thatIsYou],
  [PARTS.lives.from, onePoint], [before("v2"), again], [before("v3"), fisherman], [before("v4"), queen], [before("v5"), soldier], [before("v6"), enemies], [before("v7"), child], [before("v8"), bus], [before("v9"), forget],
  [PARTS.kindness.from, lightsUp], [before("k2"), kindness], [before("k3"), cruel], [before("k4"), merge], [before("k5"), waiting],
  [PARTS.open.from, net], [before("o2"), wall], [before("o3"), skin], [before("o4"), eye],
  [PARTS.egg.from, flowerOfLife], [before("e2"), golden], [before("e3"), pangu], [before("e4"), silver], [before("e5"), threeEggs], [before("e6"), lives],
  [before("x4", 1), gentle], [before("x5"), you],
];

const MELT = 1.4;
let spare: HTMLCanvasElement | undefined;
/** The film's picture at T seconds: the shot, melting in over the one before. */
export function picture(g: Pen, T: number) {
  const i = SHOTS.findLastIndex(([from]) => T >= from), [from, paint] = SHOTS[Math.max(0, i)], k = i > 0 ? smooth(from, from + MELT, T) : 1;
  if (k < 1) {
    SHOTS[i - 1][1](g, T);
    spare ??= canvas();
    const s = spare.getContext("2d")!;
    paint(s, T);
    g.save();
    g.globalAlpha = k;
    g.drawImage(spare, 0, 0);
    g.restore();
  } else paint(g, T);
  const dark = Math.max(1 - smooth(-0.3, 1.2, T), smooth(SECONDS - 3, SECONDS - 0.1, T));
  if (dark > 0) {
    g.fillStyle = `rgba(2,1,6,${dark})`;
    g.fillRect(0, 0, W, H);
  }
}
