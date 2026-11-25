// Paper-cut lightbox: sheets of coloured paper, each cut with the pen, stacked back to front with real shadows, lit from
// behind, and pushed in on so near sheets slide past far ones. Sheets are cut once and moved every frame.
import { H, W, backOut, canvas, keepLast, rng, type Painter, type Pen } from "../core";

/** Sheets are cut this much bigger than the frame all round, so pushing in or swaying never shows an edge. */
export const EDGE = 420;
const SW = W + EDGE * 2;
const SH = H + EDGE * 2;

export type Cut = (g: Pen) => void;
/** Light falling on a sheet, painted into it when it's cut. */
export type Glow = { x: number; y: number; r: number; color: string };
export type Move = { x?: number; y?: number; turn?: number; scale?: number; alpha?: number; about?: [number, number] };
/** A piece on a brad: it turns about its pivot. Parts are drawn in order. */
export type Part = { cut: Cut; color?: string; glow?: Glow; pivot: [number, number]; turn?: (t: number) => number };

export type Sheet = {
  /** Depth: 1 is the front frame, 2 the middle ground, 5 the far backing. */
  z: number;
  color: string;
  cut?: Cut;
  parts?: Part[];
  glow?: Glow;
  /** Pops up into place, this many seconds after the start (0 = already rising on frame one). */
  rise?: number;
  /** Sideways drift, px a second (clouds, water). */
  drift?: number;
  blur?: number;
  /** Shines instead of casting a shadow (moon, sun, lit paper). */
  halo?: { color: string; blur: number };
  /** Casts nothing: the far backing. */
  flat?: boolean;
  /** Stays put and barely scales: the lightbox's front frame. */
  frame?: boolean;
  move?: (t: number) => Move;
  /** Drawn on the sheet every frame, in its coordinates: lanterns, eyes, embers. */
  after?: Painter;
};

/** A layer that isn't paper: drawn fresh each frame at its depth (smoke, a creature of light). */
export type Live = { z: number; live: Painter; move?: (t: number) => Move };

export type PaperStage = {
  layers: (Sheet | Live)[];
  /** What the push-in heads for. */
  vanish?: [number, number];
  /** How far in the camera is: 0 → about 0.25. */
  push?: (t: number) => number;
  /** Sideways sway in px. */
  sway?: (t: number) => number;
  /** Dark edges 0…1 and a colour wash, as the mood turns. */
  mood?: (t: number) => { edges?: number; wash?: string };
};

// ── Cutting ────────────────────────────────────────────────────────────────────────────────────────────

let fibre: HTMLCanvasElement | undefined;
/** Paper texture: grain, short fibres and soft blotches. */
function texture() {
  if (fibre) return fibre;
  const S = 700;
  fibre = canvas(S, S);
  const g = fibre.getContext("2d")!;
  const r = rng(5);
  const d = g.createImageData(S, S);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i] = d.data[i + 1] = d.data[i + 2] = 128 + (r() - 0.5) * 46;
    d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  g.globalAlpha = 0.16;
  for (let i = 0; i < 900; i++) {
    g.strokeStyle = r() < 0.5 ? "#fff" : "#000";
    g.lineWidth = 0.6 + r();
    const x = r() * S, y = r() * S, a = r() * 6.3;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9, x + Math.cos(a + 0.6) * 20, y + Math.sin(a + 0.6) * 20);
    g.stroke();
  }
  g.globalAlpha = 0.05;
  for (let i = 0; i < 120; i++) {
    g.fillStyle = r() < 0.5 ? "#fff" : "#000";
    g.beginPath();
    g.arc(r() * S, r() * S, 20 + r() * 70, 0, 7);
    g.fill();
  }
  return fibre;
}

type Sprite = { img: HTMLCanvasElement; x: number; y: number };

/** Cuts one piece: fill, light, fibre, and the sheet's thickness catching light along its top edge. */
export function cutPaper(color: string, cut: Cut, glow?: Glow): Sprite {
  const c = canvas(SW, SH), g = c.getContext("2d", { willReadFrequently: true })!;
  g.translate(EDGE, EDGE);
  g.fillStyle = g.strokeStyle = color;
  g.lineCap = g.lineJoin = "round";
  g.save();
  cut(g);
  g.restore();
  const b = bounds(g);
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  // Everything after the cut works on the cropped piece.
  const img = canvas(w, h), p = img.getContext("2d")!;
  p.drawImage(c, -b.x0, -b.y0);
  const shape = canvas(w, h);
  shape.getContext("2d")!.drawImage(img, 0, 0);
  if (glow) {
    const gx = glow.x + EDGE - b.x0, gy = glow.y + EDGE - b.y0;
    const gr = p.createRadialGradient(gx, gy, Math.min(30, glow.r / 4), gx, gy, glow.r);
    gr.addColorStop(0, glow.color);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    p.globalCompositeOperation = "source-atop";
    p.fillStyle = gr;
    p.fillRect(0, 0, w, h);
  }
  const t = canvas(w, h), tg = t.getContext("2d")!;
  tg.fillStyle = tg.createPattern(texture(), "repeat")!;
  tg.fillRect(0, 0, w, h);
  tg.globalCompositeOperation = "destination-in";
  tg.drawImage(shape, 0, 0);
  p.globalCompositeOperation = "overlay";
  p.globalAlpha = 0.5;
  p.drawImage(t, 0, 0);
  p.globalAlpha = 1;
  tg.globalCompositeOperation = "copy";
  tg.drawImage(shape, 0, 0);
  tg.globalCompositeOperation = "destination-out";
  tg.drawImage(shape, 0, 3.2);
  tg.globalCompositeOperation = "source-in";
  tg.fillStyle = "rgba(255,236,205,0.38)";
  tg.fillRect(0, 0, w, h);
  p.globalCompositeOperation = "source-over";
  p.drawImage(t, 0, 0);
  return { img, x: b.x0 - EDGE, y: b.y0 - EDGE };
}

/** The drawn part of a sheet, with a little room round it. An empty cut gives one pixel. */
function bounds(g: Pen) {
  const { data } = g.getImageData(0, 0, SW, SH);
  let x0 = SW, y0 = SH, x1 = -1, y1 = -1;
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++)
      if (data[(y * SW + x) * 4 + 3]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
  if (x1 < 0) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  return { x0: Math.max(0, x0 - 4), y0: Math.max(0, y0 - 4), x1: Math.min(SW, x1 + 5), y1: Math.min(SH, y1 + 5) };
}

type Built = { sprite?: Sprite; parts?: Sprite[] };
const build = keepLast(3, (stage: PaperStage): Built[] =>
  stage.layers.map((l) =>
    "live" in l
      ? {}
      : { sprite: l.cut && cutPaper(l.color, l.cut, l.glow), parts: l.parts?.map((p) => cutPaper(p.color ?? l.color, p.cut, p.glow ?? l.glow)) },
  ),
);

// ── Showing ────────────────────────────────────────────────────────────────────────────────────────────

/** Where a layer sits in the frame: how much the push-in scales it, and how far sway, drift and popping up shift it. */
export function place(l: Pick<Sheet, "z" | "frame" | "drift" | "rise">, push: number, sway: number, t: number) {
  const scale = l.frame ? 1 / (1 - push * 0.25) : l.z / Math.max(0.2, l.z - push * 2.1);
  const x = sway * (1 / l.z - 0.35) + (l.drift ?? 0) * t;
  const y = l.rise === undefined ? 0 : ((1 - backOut((t + 0.45 - l.rise * 1.1) / 0.6)) * 900) / l.z;
  return { scale, x, y };
}

export function paperLook(stage: PaperStage): Painter {
  const [vx, vy] = stage.vanish ?? [W / 2, 1000];
  return (g, t) => {
    const built = build(stage);
    const push = stage.push?.(t) ?? 0, sway = stage.sway?.(t) ?? 0;
    g.save();
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    stage.layers.forEach((l, i) => {
      const m = l.move?.(t) ?? {};
      if (m.alpha === 0) return;
      const p = place(l as Sheet, push, sway, t);
      g.save();
      g.globalAlpha = m.alpha ?? 1;
      g.translate(vx + p.x, vy + p.y);
      g.scale(p.scale, p.scale);
      g.translate(-vx + (m.x ?? 0), -vy + (m.y ?? 0));
      if (m.turn || m.scale !== undefined) {
        const [ax, ay] = m.about ?? [vx, vy];
        g.translate(ax, ay);
        g.rotate(m.turn ?? 0);
        g.scale(m.scale ?? 1, m.scale ?? 1);
        g.translate(-ax, -ay);
      }
      if ("live" in l) l.live(g, t);
      else {
        if (l.blur) g.filter = `blur(${l.blur}px)`;
        const shadow = (blur: number, dx: number, dy: number) => {
          g.shadowColor = "rgba(18,6,30,0.62)";
          g.shadowBlur = blur;
          g.shadowOffsetX = dx;
          g.shadowOffsetY = dy;
        };
        if (l.halo) {
          g.shadowColor = l.halo.color;
          g.shadowBlur = l.halo.blur;
        } else if (!l.flat) shadow(l.frame ? 70 : 34, -7, 20);
        const { sprite, parts } = built[i];
        if (sprite) g.drawImage(sprite.img, sprite.x, sprite.y);
        // Pieces of one puppet sit close together, so they shade each other only softly.
        if (parts?.length && !l.halo && !l.flat) shadow(14, -3, 8);
        parts?.forEach((s, k) => {
          const part = l.parts![k];
          g.save();
          g.translate(...part.pivot);
          g.rotate(part.turn?.(t) ?? 0);
          g.translate(-part.pivot[0], -part.pivot[1]);
          g.drawImage(s.img, s.x, s.y);
          g.restore();
        });
        g.filter = "none";
        g.shadowColor = "transparent";
        g.shadowBlur = g.shadowOffsetX = g.shadowOffsetY = 0;
        l.after?.(g, t);
      }
      g.restore();
    });
    const { edges = 0.3, wash } = stage.mood?.(t) ?? {};
    const v = g.createRadialGradient(vx, vy, 380, vx, vy, 1250);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(8,3,20,${edges})`);
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    if (wash) {
      g.globalCompositeOperation = "multiply";
      g.fillStyle = wash;
      g.fillRect(0, 0, W, H);
    }
    g.restore();
  };
}
