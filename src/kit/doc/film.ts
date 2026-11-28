// A documentary laid out as shots end to end, and the arithmetic its components share: which shots are on screen,
// slow moves over a photo, a map's projection, and captions timed from the voice. Pure, so it's tested without a render.
import { wordTimes } from "../remotion/Captions";

/** [x, y, zoom]: the point of the image (0–1 across and down) held at the frame's centre, and how far in (1 = just covers). */
export type Move = { from: [number, number, number]; to: [number, number, number] };
export type View = { lon: number; lat: number; spanDeg: number };
/** A radius drawn around a place (an evacuation zone), appearing `at` (0…1) through the shot. */
export type Circle = { lon: number; lat: number; km: number; label: string; at: number };
/** An ash cloud spreading from a place: grows to `km` across over the shot, drifting toward `drift` (degrees, lon/lat). */
export type Plume = { lon: number; lat: number; km: number; label: string; drift?: [number, number] };
export type ShotSpec =
  | { kind: "still"; media: string; move: Move; date?: string; print?: true }
  | { kind: "clip"; media: string; date?: string }
  | { kind: "map"; view: View; pins: { lon: number; lat: number; label: string; tone?: "white" | "red" }[]; path?: [number, number][]; pathLabel?: string; circles?: Circle[]; storm?: true; plume?: Plume; date?: string }
  | { kind: "height"; topKm: number; maxKm: number; marks: { km: number; label: string }[]; columnLabel: string; base: string }
  | { kind: "sim"; scene: string; date?: string }
  | { kind: "title"; text: string; sub?: string; note?: string };
/** Seconds. `cut`: a hard cut in; otherwise the shot fades in over the one before. */
export type Placed = ShotSpec & { id: string; from: number; to: number; cut?: boolean };

export const CROSSFADE = 0.5;

const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** The shots on screen at t, bottom first: during a fade, the old one whole and the new one coming in over it. */
export function activeAt(shots: Placed[], t: number): { shot: Placed; opacity: number }[] {
  const i = shots.findIndex((s) => t >= s.from && t < s.to);
  const k = i < 0 ? (t < shots[0]?.from ? 0 : shots.length - 1) : i;
  const s = shots[k];
  if (!s) return [];
  const into = (t - s.from) / CROSSFADE;
  if (k > 0 && !s.cut && into < 1) return [{ shot: shots[k - 1], opacity: 1 }, { shot: s, opacity: clamp01(into) }];
  return [{ shot: s, opacity: 1 }];
}

export function moveAt(m: Move, k: number) {
  const e = inOut(clamp01(k));
  const [x, y, zoom] = m.from.map((a, j) => a + (m.to[j] - a) * e);
  return { x, y, zoom };
}

/** Scale and offset (px) that cover the frame with the image, aimed at p, without ever showing past the image's edge. */
export function coverTransform(img: { width: number; height: number }, frame: { width: number; height: number }, p: { x: number; y: number; zoom: number }) {
  const scale = Math.max(frame.width / img.width, frame.height / img.height) * Math.max(1, p.zoom);
  const w = img.width * scale, h = img.height * scale;
  const tx = Math.min(0, Math.max(frame.width - w, frame.width / 2 - p.x * w));
  const ty = Math.min(0, Math.max(frame.height - h, frame.height / 2 - p.y * h));
  return { scale, tx, ty };
}

/** A place on the frame: equirectangular around the view's centre, north up, `spanDeg` (of latitude's length) across. */
export function mapXY(lon: number, lat: number, view: View, frame: { width: number; height: number }): [number, number] {
  const px = frame.width / view.spanDeg;
  return [frame.width / 2 + (lon - view.lon) * Math.cos((view.lat * Math.PI) / 180) * px, frame.height / 2 - (lat - view.lat) * px];
}

/** Captions from the spoken lines: a "|" splits a line into halves, each shown as it's said. */
export function captionCues(lines: { id: string; caption: string; at: number; seconds: number; lead: number }[]) {
  return lines.flatMap((l) => {
    const halves = l.caption.split("|").map((h) => h.trim());
    const words = halves.map((h) => h.split(/\s+/));
    const times = wordTimes(words.flat(), Math.max(0.5, l.seconds - l.lead));
    let n = 0;
    return halves.map((text, i) => {
      const at = l.at + l.lead + times[n];
      n += words[i].length;
      const to = i < halves.length - 1 ? l.at + l.lead + times[n] : l.at + l.seconds + 0.4;
      return { at, to, text };
    });
  });
}

/** Media ids the shots use that aren't in `media` (out/media.json): fetch them, or fix the id. */
export function missingMedia(shots: ShotSpec[], media: Record<string, unknown>) {
  const ids = shots.flatMap((s) => ("media" in s ? [s.media] : []));
  return [...new Set(ids)].filter((id) => !(id in media));
}

/** A small archival photo shown as a print on the dark: at most twice its size, inside the frame with a margin. */
export function printFit(img: { width: number; height: number }, frame: { width: number; height: number }) {
  const s = Math.min(2, (frame.height * 0.72) / img.height, (frame.width * 0.8) / img.width);
  return { width: Math.round(img.width * s), height: Math.round(img.height * s) };
}

/** A distance on the ground as pixels on a map (a degree of latitude is 111.2 km). */
export const kmToPx = (km: number, view: View, frame: { width: number; height: number }) => (km / 111.2) * (frame.width / view.spanDeg);

/** Clip shots that would run past the footage their media entry allows (fair use is ≤ 5 s): fix the shot or the use. */
export function clipOverruns(shots: Placed[], uses: Record<string, { from: number; to: number } | undefined>) {
  return shots.flatMap((s) => {
    if (s.kind !== "clip") return [];
    const u = uses[s.media];
    if (!u) return [`${s.id}: a clip needs a use { from, to } in the media list`];
    const len = s.to - s.from, allowed = u.to - u.from;
    return len > allowed + 0.05 ? [`${s.id}: the shot runs ${len.toFixed(2)} s but its use is ${allowed.toFixed(2)} s`] : [];
  });
}

/** The point a fraction k (0…1) of the way along a line of points, by distance (a storm moving along its track). */
export function alongPath(path: [number, number][], k: number): [number, number] {
  const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  let left = Math.min(1, Math.max(0, k)) * segs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < segs.length; i++) {
    if (left <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? Math.min(1, left / segs[i]) : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
    }
    left -= segs[i];
  }
  return path[0];
}
