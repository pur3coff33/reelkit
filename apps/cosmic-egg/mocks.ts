// Three looks tried for "The Cosmic Egg", two stills each (a person, the egg): composition cosmic-egg-mocks.
//   gold:  an illuminated manuscript in motion. Gold engraving on lapis, nimbus and mandala, worlds drawn inside people.
//   smoke: everything is ember smoke in a curl-noise wind. People and eggs hold their shape and dissolve, like the salt.
//   glass: the world as one stained-glass window. Every shard a life, one light behind all of them.
import { H, TAU, W, lerp, rng, smooth, type Pen } from "../../src/kit/looks/core";
import type { Film } from "../../src/kit/looks/Film";
import { COLD, EMBER, HEAD, WARM, WHITE_GOLD, bloom, colorAt, crackLine, egg, finish, hash, lineDist, maskOf, path, perlin, seeds, shard, spline, type P, type Stops } from "../../src/kit/looks/glow";

const HEAD_S = 1.25, HEAD_X = 0, HEAD_Y = 170;
const toFrame = ([x, y]: P): P => [HEAD_X + x * HEAD_S, HEAD_Y + y * HEAD_S];
const head = (): P[] => spline(HEAD).map(toFrame);

// ---------------------------------------------------------------- gold: engraving on lapis
const GOLD = "#e9c46a";
function goldPaint(g: Pen) {
  const s = g.createLinearGradient(0, 0, W, H);
  s.addColorStop(0, "#b07a26");
  s.addColorStop(0.3, "#f2c35a");
  s.addColorStop(0.45, "#ffe08a");
  s.addColorStop(0.6, "#d8962c");
  s.addColorStop(0.8, "#f0bd4e");
  s.addColorStop(1, "#b07a26");
  return s;
}

function lapis(g: Pen, cx: number, cy: number, seed: number) {
  const bg = g.createRadialGradient(cx, cy, 50, cx, cy, 1300);
  bg.addColorStop(0, "#1c3a96");
  bg.addColorStop(0.5, "#0e2068");
  bg.addColorStop(1, "#040a2a");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Gold leaf flaking off the ground, and the grain of the paint.
  const r = rng(seed);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(240,180,70,${0.05 + r() ** 3 * 0.5})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2.2, 1 + r() * 1.6);
  }
}

/** A thangka halo: rings, a band of petals, and fine rays. */
function nimbus(g: Pen, cx: number, cy: number, r0: number, petals = 36, seed = 1) {
  const r = rng(seed);
  g.save();
  g.strokeStyle = goldPaint(g);
  for (let k = 0; k < 220; k++) {
    const a = (k / 220) * TAU, long = k % 2 ? 1.35 : 1.7 + r() * 0.3;
    g.globalAlpha = 0.18 + 0.12 * (k % 2);
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0 * 1.18, cy + Math.sin(a) * r0 * 1.18);
    g.lineTo(cx + Math.cos(a) * r0 * long, cy + Math.sin(a) * r0 * long);
    g.stroke();
  }
  g.globalAlpha = 0.85;
  for (const [rr, w] of [[0.82, 1.4], [0.86, 3], [1.12, 1.4], [1.16, 3.2]] as const) {
    g.lineWidth = w;
    g.beginPath();
    g.arc(cx, cy, r0 * rr, 0, TAU);
    g.stroke();
  }
  g.lineWidth = 2;
  for (let k = 0; k < petals; k++) {
    const a = (k / petals) * TAU, d = TAU / petals;
    g.beginPath();
    g.moveTo(cx + Math.cos(a - d / 2) * r0 * 0.88, cy + Math.sin(a - d / 2) * r0 * 0.88);
    g.quadraticCurveTo(cx + Math.cos(a) * r0 * 1.2, cy + Math.sin(a) * r0 * 1.2, cx + Math.cos(a + d / 2) * r0 * 0.88, cy + Math.sin(a + d / 2) * r0 * 0.88);
    g.stroke();
    g.beginPath();
    g.arc(cx + Math.cos(a) * r0 * 0.98, cy + Math.sin(a) * r0 * 0.98, 3, 0, TAU);
    g.fillStyle = GOLD;
    g.fill();
  }
  g.restore();
}

/** Gold outline drawn twice, like an engraved border. */
function engravedEdge(g: Pen, pts: P[], dark: string) {
  g.save();
  g.lineJoin = "round";
  path(g, pts);
  g.strokeStyle = goldPaint(g);
  g.lineWidth = 15;
  g.stroke();
  g.strokeStyle = dark;
  g.lineWidth = 8;
  g.stroke();
  g.restore();
}

function goldHead(g: Pen) {
  const h = head(), [cx, cy] = toFrame([520, 470]);
  lapis(g, cx, cy, 3);
  nimbus(g, cx, cy, 420, 40, 2);
  path(g, h);
  g.fillStyle = "#06102f";
  g.fill();

  // Inside his head: the sea before sunrise, and a boat.
  g.save();
  path(g, h);
  g.clip();
  const gold = goldPaint(g), horizon = toFrame([0, 560])[1], sunX = toFrame([540, 0])[0];
  g.strokeStyle = gold;
  // The sky: fine rays fanning from the sun under the horizon, and rings around it.
  for (let k = 0; k < 90; k++) {
    const a = Math.PI + (k / 89) * Math.PI;
    g.globalAlpha = 0.35;
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(sunX + Math.cos(a) * 120, horizon + Math.sin(a) * 120);
    g.lineTo(sunX + Math.cos(a) * 900, horizon + Math.sin(a) * 900);
    g.stroke();
  }
  for (let k = 0; k < 9; k++) {
    g.globalAlpha = 0.7 - k * 0.06;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(sunX, horizon, 96 + k * 18, Math.PI, TAU);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = gold;
  g.beginPath();
  g.arc(sunX, horizon, 80, Math.PI, TAU);
  g.fill();
  // The sea: engraved swell lines, further apart and heavier as they come near.
  const r = rng(9);
  for (let k = 0; k < 46; k++) {
    const f = k / 45, y = horizon + 6 + f ** 1.7 * 560, amp = 1 + f * 9, len = 0.004 + f * 0.012;
    g.lineWidth = 0.8 + f * 2;
    g.globalAlpha = 0.95 - f * 0.25;
    g.setLineDash([30 + r() * 200, 8 + r() * 30]);
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const yy = y + Math.sin(x * len * 3 + k * 1.7) * amp;
      x ? g.lineTo(x, yy) : g.moveTo(x, yy);
    }
    g.stroke();
  }
  g.setLineDash([]);
  // The sun on the water.
  g.globalAlpha = 1;
  for (let k = 0; k < 22; k++) {
    const y = horizon + 10 + k ** 1.5 * 6, w = (80 - k * 2.4) * (0.6 + r() * 0.6);
    g.fillRect(sunX - w / 2 + (r() - 0.5) * 20, y, w, 2 + k * 0.12);
  }
  // A small boat on the horizon, a man in it bent over his net.
  const bx = toFrame([360, 0])[0], by = horizon + 4;
  g.fillStyle = gold;
  g.beginPath();
  g.moveTo(bx - 70, by - 14);
  g.quadraticCurveTo(bx, by + 18, bx + 74, by - 16);
  g.lineTo(bx + 60, by - 4);
  g.quadraticCurveTo(bx, by + 6, bx - 58, by - 4);
  g.fill();
  g.beginPath();
  g.arc(bx + 8, by - 46, 8, 0, TAU);
  g.fill();
  g.lineWidth = 7;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(bx + 4, by - 36);
  g.quadraticCurveTo(bx - 12, by - 22, bx - 16, by - 12);
  g.stroke();
  g.lineWidth = 1;
  for (let k = 0; k < 7; k++) {
    g.beginPath();
    g.moveTo(bx - 8, by - 26);
    g.quadraticCurveTo(bx - 40 - k * 4, by - 10 + k * 3, bx - 60 - k * 6, by + 10 + k * 6);
    g.stroke();
  }
  // Stars.
  for (let i = 0; i < 160; i++) {
    const x = r() * W, y = r() * horizon;
    g.globalAlpha = 0.3 + r() * 0.7;
    g.fillRect(x, y, 1.6, 1.6);
  }
  g.restore();

  engravedEdge(g, h, "#06102f");
  // His eye, closed.
  const [ex, ey] = toFrame([700, 455]);
  g.save();
  g.strokeStyle = goldPaint(g);
  g.lineWidth = 3;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(ex - 26, ey - 4);
  g.quadraticCurveTo(ex - 6, ey + 10, ex + 14, ey - 2);
  g.stroke();
  for (let k = 0; k < 5; k++) {
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(ex - 20 + k * 7, ey + 3);
    g.lineTo(ex - 23 + k * 7, ey + 12);
    g.stroke();
  }
  g.restore();
  bloom(g, 18, 0.45);
  finish(g, 4);
}

function goldEgg(g: Pen) {
  const cx = W / 2, cy = 690, a = 230, b = 300, e = egg(cx, cy, a, b);
  lapis(g, cx, cy, 5);
  // The flower of life behind it.
  g.save();
  g.strokeStyle = goldPaint(g);
  g.lineWidth = 1.2;
  g.globalAlpha = 0.28;
  const R = 105;
  for (let i = -6; i <= 6; i++)
    for (let j = -8; j <= 8; j++) {
      const x = cx + (i + (j % 2 ? 0.5 : 0)) * R, y = cy + j * R * 0.866;
      if (Math.hypot(x - cx, y - cy) > 560) continue;
      g.beginPath();
      g.arc(x, y, R, 0, TAU);
      g.stroke();
    }
  g.restore();
  nimbus(g, cx, cy, 440, 48, 6);

  // The dark water it floats on.
  const base = cy + b - 10;
  g.save();
  g.fillStyle = "#040a24";
  g.fillRect(0, base, W, H - base);
  g.strokeStyle = goldPaint(g);
  for (let k = 0; k < 14; k++) {
    const rx = 150 + k ** 1.35 * 34;
    g.globalAlpha = 0.9 - k * 0.055;
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(cx, base + 8 + k * 6, rx, rx * 0.11, 0, 0, TAU);
    g.stroke();
  }
  const r = rng(12);
  for (let k = 0; k < 30; k++) {
    const y = base + 30 + k * 13, w = (180 - k * 4) * (0.5 + r());
    g.globalAlpha = 0.6 - k * 0.015;
    g.fillStyle = GOLD;
    g.fillRect(cx - w / 2 + (r() - 0.5) * 40, y, w, 2);
  }
  g.restore();

  // The egg, engraved: rings that follow its curve, crossed in the shade.
  path(g, e);
  g.fillStyle = "#081436";
  g.fill();
  g.save();
  path(g, e);
  g.clip();
  g.strokeStyle = goldPaint(g);
  for (let k = 1; k < 60; k++) {
    const v = -1 + (2 * k) / 60, y = cy + b * v, w = a * Math.sqrt(1 - v * v) * (1 + 0.13 * v);
    g.lineWidth = 1 + 1.2 * smooth(-0.5, 1, v);
    g.globalAlpha = 0.9;
    g.beginPath();
    g.ellipse(cx, y, w, w * 0.16, 0, 0, Math.PI);
    g.stroke();
  }
  for (let k = 0; k < 30; k++) {
    const u = k / 29, x = cx - a * (1 - u * 0.9);
    g.lineWidth = 0.9;
    g.globalAlpha = 0.65 * (1 - u);
    g.beginPath();
    g.ellipse(cx, cy, Math.abs(cx - x) + 1, b * 1.05, 0, Math.PI / 2, (Math.PI * 3) / 2);
    g.stroke();
  }
  const hl = g.createRadialGradient(cx + a * 0.35, cy - b * 0.4, 5, cx + a * 0.35, cy - b * 0.4, a * 0.9);
  hl.addColorStop(0, "rgba(255,200,90,0.6)");
  hl.addColorStop(1, "rgba(255,200,90,0)");
  g.globalAlpha = 1;
  g.globalCompositeOperation = "lighter";
  g.fillStyle = hl;
  g.fillRect(cx - a * 1.2, cy - b * 1.1, a * 2.4, b * 2.2);
  g.restore();
  engravedEdge(g, e, "#081436");
  bloom(g, 22, 0.5);
  finish(g, 6);
}

class Smoke {
  acc = new Float32Array(W * H * 3);
  noise = perlin(11);
  curl(x: number, y: number) {
    const n = this.noise, s = 1 / 260, e = 0.01;
    const f = (x: number, y: number) => n(x * s, y * s) + 0.45 * n(x * s * 2.3 + 7, y * s * 2.3 + 3);
    return [(f(x, y + e / s) - f(x, y - e / s)) / (2 * e), -(f(x + e / s, y) - f(x - e / s, y)) / (2 * e)];
  }
  /** One wisp from (x, y): `steps` px long, drifting with `wind`, coloured along its length. */
  trail(x: number, y: number, steps: number, wind: P, stops: Stops, weight: number) {
    for (let k = 0; k <= steps; k++) {
      const f = steps ? k / steps : 0, [cr, cg, cb] = colorAt(stops, f), w = weight * (1 - f) ** 1.3;
      const i = Math.round(x), j = Math.round(y);
      if (i >= 0 && j >= 0 && i < W && j < H) {
        const o = (j * W + i) * 3;
        this.acc[o] += cr * w;
        this.acc[o + 1] += cg * w;
        this.acc[o + 2] += cb * w;
      }
      const [vx, vy] = this.curl(x, y), sp = 1.25 / Math.max(0.3, Math.hypot(vx + wind[0], vy + wind[1]));
      x += (vx + wind[0]) * sp;
      y += (vy + wind[1]) * sp;
    }
  }
  draw(g: Pen, gain = 1.4) {
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let p = 0; p < W * H; p++) {
      const o = p * 3, q = p * 4;
      d[q] = Math.min(255, d[q] + 255 * (1 - Math.exp(-this.acc[o] * gain)));
      d[q + 1] = Math.min(255, d[q + 1] + 255 * (1 - Math.exp(-this.acc[o + 1] * gain)));
      d[q + 2] = Math.min(255, d[q + 2] + 255 * (1 - Math.exp(-this.acc[o + 2] * gain)));
    }
    g.putImageData(img, 0, 0);
  }
}

function smokeBg(g: Pen) {
  const bg = g.createRadialGradient(W / 2, 700, 100, W / 2, 800, 1300);
  bg.addColorStop(0, "#160b1c");
  bg.addColorStop(1, "#030206");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
}

function smokeHead(g: Pen) {
  smokeBg(g);
  const h = head(), m = maskOf(h), s = new Smoke(), n = perlin(4), r = rng(8);
  for (const [x, y] of seeds(m, 70000, 0.6, 1)) {
    // The back of his head is already going; the face still holds.
    const go = smooth(820, 300, x) * (0.6 + 0.8 * Math.max(0, n(x / 90, y / 90) + 0.35));
    s.trail(x, y, Math.floor(go * (60 + r() * 380)), [-0.55, -0.75], EMBER, 0.05 + 0.04 * r());
    // What still holds glows hot.
    s.trail(x, y, 3 + Math.floor(r() * 10 * (1 - go)), [-0.2, -0.3], EMBER, 0.5 * (1 - Math.min(1, go)));
  }
  s.draw(g, 1.5);
  bloom(g, 20, 0.7);
  finish(g, 9, 14);
}

function smokeEgg(g: Pen) {
  smokeBg(g);
  const cx = W / 2, cy = 720, e = egg(cx, cy, 230, 300), m = maskOf(e), s = new Smoke(), r = rng(3);
  const crack = crackLine(cx + 20, cy - 290, cy + 120, 5);
  // The shell: smoke held in a curve, barely leaving.
  for (const [x, y] of seeds(m, 46000, 0.75, 2)) s.trail(x, y, Math.floor(4 + r() * 90), [0, -0.4], EMBER, 0.16);
  // What's inside pours out of the crack.
  for (let k = 0; k < 16000; k++) {
    const i = Math.floor(r() * (crack.length - 1)), f = r(), [ax, ay] = crack[i], [bx, by] = crack[i + 1];
    s.trail(lerp(ax, bx, f) + (r() - 0.5) * 6, lerp(ay, by, f), Math.floor(80 + r() * 520), [(r() - 0.5) * 0.6, -1.1], WHITE_GOLD, 0.06);
  }
  // A glow inside.
  const in_ = g.createRadialGradient(cx + 20, cy, 10, cx, cy, 260);
  in_.addColorStop(0, "rgba(255,170,80,0.35)");
  in_.addColorStop(1, "rgba(255,120,60,0)");
  g.fillStyle = in_;
  g.fillRect(0, 0, W, H);
  s.draw(g, 1.6);
  bloom(g, 26, 0.8);
  finish(g, 10, 14);
}

function glass(g: Pen, inner: Uint8Array, light: (x: number, y: number) => number, extra?: (x: number, y: number) => number) {
  const img = g.createImageData(W, H), d = img.data, n = perlin(21);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const inside = inner[y * W + x], sh = inside ? shard(x, y, 30, 7) : shard(x, y, 74, 3);
      const pal = inside ? WARM : COLD, c = pal[Math.floor(hash(sh.i, sh.j, inside ? 9 : 5) * pal.length)];
      // Glass is thicker by the lead, and never quite even.
      const tex = 1 + 0.16 * n(x / 46, y / 46) + 0.07 * n(x / 7, y / 11), rim = 0.6 + 0.4 * smooth(0, 16, sh.edge);
      let k = light(x, y) * tex * rim * (inside ? 1.15 : 0.75) * (0.85 + 0.3 * hash(sh.i, sh.j, 13));
      const hot = extra ? extra(x, y) : 0;
      const lead = smooth(inside ? 2.4 : 3.6, inside ? 3.8 : 5.2, sh.edge), o = (y * W + x) * 4;
      for (let ch = 0; ch < 3; ch++) d[o + ch] = (Math.min(255, c[ch] * k + 255 * hot) * lead + (1 - lead) * 14);
      d[o + 3] = 255;
    }
  g.putImageData(img, 0, 0);
}

function leadEdge(g: Pen, pts: P[]) {
  g.save();
  path(g, pts);
  g.lineJoin = "round";
  g.strokeStyle = "#0b0909";
  g.lineWidth = 11;
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.08)";
  g.lineWidth = 2;
  g.stroke();
  g.restore();
}

function glassHead(g: Pen) {
  const h = head(), m = maskOf(h), [lx, ly] = toFrame([560, 430]);
  glass(g, m, (x, y) => 0.45 + 1.15 * Math.exp(-((x - lx) ** 2 + (y - ly) ** 2) / 420 ** 2));
  leadEdge(g, h);
  bloom(g, 28, 0.55);
  finish(g, 12, 8);
}

function glassEgg(g: Pen) {
  const cx = W / 2, cy = 720, e = egg(cx, cy, 250, 320), m = maskOf(e), crack = crackLine(cx + 20, cy - 310, cy + 150, 5);
  glass(
    g,
    m,
    (x, y) => 0.4 + 1.2 * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / 480 ** 2),
    (x, y) => {
      if (Math.abs(x - cx) > 300 || y < cy - 340 || y > cy + 180) return 0;
      const dd = lineDist(x, y, crack);
      return 1.1 * Math.exp(-dd / 5) + 0.35 * Math.exp(-dd / 40);
    },
  );
  leadEdge(g, e);
  bloom(g, 30, 0.7);
  finish(g, 13, 8);
}

// ---------------------------------------------------------------- the mock film
const SHOTS = [goldHead, goldEgg, smokeHead, smokeEgg, glassHead, glassEgg];
const WORDS = ["You are a fisherman,\nmending a net before the sun comes up.", "In India, a golden egg floated on the dark water,\nbefore there was a world."];
export const MOCKS: Film = {
  seconds: SHOTS.length,
  bg: "#000",
  scenes: SHOTS.map((paint, i) => ({ from: i, to: i + 1, paint: (g: Pen) => paint(g) })),
  lines: SHOTS.map((_, i) => ({ at: i, to: i + 1, text: WORDS[i % 2], voice: "dots" as const, y: 1375, size: 64 })),
};
export const MOCK_STILLS = SHOTS.map((_, i) => i + 0.5);
