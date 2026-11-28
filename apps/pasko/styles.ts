// Style mocks: the same two moments of "Seven Plates" (the 1998 toast, the 2026 hands) drawn four ways, all on the CPU
// with a 2D canvas: the current low-poly, cel-shaded with ink lines, pixel art, and shadow puppets on a lit screen.
// Frame i of the mock composition: style i % 4, moment ⌊i / 4⌋.
import { render, type Frame } from "../../src/kit/lowpoly/engine";
import { H, W, type Painter } from "../../src/kit/looks/core";
import { frameAt } from "./scene";
import { TX, TZ, type SegId } from "./story";

const MOMENTS: [SegId, number][] = [["y1998", 11.45], ["y2026", 54.6]];
const STYLES = ["Low poly (now)", "Cel-shaded + ink", "Pixel art", "Shadow puppets"];

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function backdrop(g: CanvasRenderingContext2D, w: number, h: number, sky: { top: number[]; bottom: number[] }) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgb(${sky.top.map((c) => Math.min(255, c * 255) | 0).join(",")})`);
  grad.addColorStop(1, `rgb(${sky.bottom.map((c) => Math.min(255, c * 255) | 0).join(",")})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}
/** The engine clears what it draws on when it leaves out the sky: draw on a layer, then lay that over. */
function over(g: CanvasRenderingContext2D, w: number, h: number, frame: Frame) {
  const c = canvas(w, h);
  render(c.getContext("2d")!, w, h, frame);
  g.drawImage(c, 0, 0);
}
const plain = (f: ReturnType<typeof frameAt>): Frame => ({ tris: f.tris, camera: f.camera, env: f.env, lights: f.lights, glowsFront: f.glowsFront, noSky: true });

/** Cel shading: colours pushed to three flat steps, a thick ink line round every shape against the sky, thinner ink
 *  where colours meet. */
function cel(g: CanvasRenderingContext2D, f: ReturnType<typeof frameAt>) {
  backdrop(g, W, H, f.sky);
  const c = canvas(W, H), s = c.getContext("2d")!;
  render(s, W, H, { ...plain(f), glowsFront: [] });
  const shape = s.getImageData(0, 0, W, H).data;
  g.drawImage(c, 0, 0);
  const img = g.getImageData(0, 0, W, H), d = img.data, key = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], v = Math.max(r, gg, b) + 1;
    const step = [0.36, 0.66, 0.97][Math.min(2, Math.floor((v / 256) * 3.2))] * 255, k = step / v;
    d[i * 4] = Math.min(255, r * k);
    d[i * 4 + 1] = Math.min(255, gg * k);
    d[i * 4 + 2] = Math.min(255, b * k);
    key[i] = d[i * 4] * 0.5 + d[i * 4 + 1] * 0.8 + d[i * 4 + 2] * 0.3;
  }
  const ink = new Uint8Array(W * H);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x, edgeA = (shape[i * 4 + 3] > 128) !== (shape[(i + 1) * 4 + 3] > 128) || (shape[i * 4 + 3] > 128) !== (shape[(i + W) * 4 + 3] > 128);
    const gx = key[i + 1] - key[i - 1], gy = key[i + W] - key[i - W];
    if (edgeA) ink[i] = 2;
    else if (gx * gx + gy * gy > 60 * 60) ink[i] = 1;
  }
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    const thick = ink[i] === 2 || ink[i - 1] === 2 || ink[i + 1] === 2 || ink[i - W] === 2 || ink[i + W] === 2 || ink[i - 2] === 2 || ink[i + W * 2] === 2;
    if (thick || ink[i] === 1 || ink[i + 1] === 1) { d[i * 4] = 30; d[i * 4 + 1] = 18; d[i * 4 + 2] = 36; }
  }
  g.putImageData(img, 0, 0);
  over(g, W, H, { ...plain(f), tris: [], glowsFront: f.glowsFront });
}

/** Pixel art: drawn at a sixth of the size, colours stepped with an ordered dither, blown up with hard edges. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function pixel(g: CanvasRenderingContext2D, f: ReturnType<typeof frameAt>) {
  const w = W / 8, h = H / 8, c = canvas(w, h), s = c.getContext("2d")!;
  backdrop(s, w, h, f.sky);
  over(s, w, h, plain(f));
  const img = s.getImageData(0, 0, w, h), d = img.data, levels = 4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, th = (BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * (255 / levels);
    for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round(((d[i + k] + th) / 255) * (levels - 1)) * (255 / (levels - 1))));
  }
  s.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(c, 0, 0, W, H);
  g.imageSmoothingEnabled = true;
}

/** Shadow puppets: every shape a black cut-out against a glowing paper screen; only the lights keep their colour. */
function puppets(g: CanvasRenderingContext2D, f: ReturnType<typeof frameAt>, warm: boolean) {
  const glow = g.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.45, H * 0.62);
  glow.addColorStop(0, warm ? "#ffd9a0" : "#bcd4ff");
  glow.addColorStop(0.55, warm ? "#e8862e" : "#5a78c8");
  glow.addColorStop(1, warm ? "#4a1608" : "#0d1430");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // Paper fibres.
  for (let i = 0; i < 2600; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * W, y = (Math.sin(i * 78.233) * 12345.678 % 1 + 1) % 1 * H;
    g.fillStyle = `rgba(255,240,220,${0.05 + 0.05 * ((i * 7) % 3)})`;
    g.fillRect(x, y, 1 + (i % 4), 1);
  }
  // A low camera from the end of the table: the family in profile, facing each other across it.
  const cam = { pos: [TX + 0.02, 0.3, TZ + 1.35] as [number, number, number], target: [TX, 0.36, TZ - 0.2] as [number, number, number], fov: f.camera.fov };
  // Layers of cut paper: near shapes black, the house and trees behind fading into the screen's colour.
  const tint: [number, number, number] = warm ? [196, 104, 40] : [70, 92, 160];
  const tris = f.tris.map((t) => {
    if ((t.glow ?? 0) > 0.3) return { ...t, glow: 1 };
    const c = [(t.a[0] + t.b[0] + t.c[0]) / 3, (t.a[1] + t.b[1] + t.c[1]) / 3, (t.a[2] + t.b[2] + t.c[2]) / 3];
    const far = Math.min(1, Math.max(0, (Math.hypot(c[0] - cam.pos[0], c[1] - cam.pos[1], c[2] - cam.pos[2]) - 1.75) / 1.2)) * 0.62;
    return { ...t, color: [18 + (tint[0] - 18) * far, 10 + (tint[1] - 10) * far, 12 + (tint[2] - 12) * far] as [number, number, number], glow: 1, alpha: 1 };
  });
  over(g, W, H, { tris, camera: cam, env: f.env, noSky: true, glowsFront: f.glowsFront.map((x) => ({ ...x, alpha: x.alpha * 0.6 })) });
  // The stage's edge: a black floor under the screen.
  g.fillStyle = "#120a0c";
  g.fillRect(0, H * 0.8, W, H * 0.2);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
}

export const stylePaint: Painter = (g, t) => {
  const i = Math.round(t), style = i % 4, [id, time] = MOMENTS[Math.floor(i / 4) % MOMENTS.length], f = frameAt(id, time);
  if (style === 0) {
    backdrop(g, W, H, f.sky);
    over(g, W, H, plain(f));
  } else if (style === 1) cel(g, f);
  else if (style === 2) pixel(g, f);
  else puppets(g, frameAt(id, time, { noSlab: true }), id === "y1998");
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0, 70, W, 120);
  g.fillStyle = "#fff";
  g.font = "bold 64px sans-serif";
  g.textAlign = "center";
  g.fillText(STYLES[style], W / 2, 152);
};
export const STYLE_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7];
