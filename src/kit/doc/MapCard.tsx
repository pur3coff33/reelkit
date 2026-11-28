// A dark map: coastlines, pins that come in one after another with a soft pulse, and a path that draws itself (a
// typhoon's track, a route). Extra rings (finer coasts for a close view) can be passed in. `t` is the shot's seconds.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { alongPath, kmToPx, mapXY, type Circle, type Plume, type View } from "./film";
import { RINGS } from "./geo";
import { DOC_FONT } from "./Text";

export type Pin = { lon: number; lat: number; label: string; tone?: "white" | "red" };

export function MapCard({ view, pins, path, pathLabel, circles, storm, plume, t, seconds, rings }: { view: View; pins: Pin[]; path?: [number, number][]; pathLabel?: string; circles?: Circle[]; storm?: boolean; plume?: Plume; t: number; seconds: number; rings?: number[][][] }) {
  const frame = useVideoConfig();
  const xy = (lon: number, lat: number) => mapXY(lon, lat, view, frame);
  const d = (ring: number[][], close = true) => ring.map(([lon, lat], i) => `${i ? "L" : "M"}${xy(lon, lat).map((v) => v.toFixed(1)).join(",")}`).join("") + (close ? "Z" : "");
  const land = rings ?? Object.values(RINGS);
  // The view drifts in a little over the shot.
  const zoom = 1 + 0.04 * Math.min(1, t / seconds);
  const drawn = Math.min(1, Math.max(0, (t - 0.6) / Math.max(0.5, seconds - 1.6)));
  // A faint one-degree graticule.
  const span = Math.ceil(view.spanDeg);
  const degs = Array.from({ length: 2 * span + 1 }, (_, i) => i - span);
  return (
    <AbsoluteFill style={{ background: "#0b0e12", overflow: "hidden" }}>
      <svg width={frame.width} height={frame.height} style={{ transform: `scale(${zoom})` }}>
        {degs.map((g) => {
          const x = xy(Math.round(view.lon) + g, view.lat)[0], y = xy(view.lon, Math.round(view.lat) + g)[1];
          return (
            <g key={g} stroke="rgba(255,255,255,0.05)" strokeWidth={1}>
              <line x1={x} x2={x} y1={0} y2={frame.height} />
              <line x1={0} x2={frame.width} y1={y} y2={y} />
            </g>
          );
        })}
        {land.map((r, i) => <path key={i} d={d(r)} fill="#1c232b" stroke="#3a4654" strokeWidth={1.5} strokeLinejoin="round" />)}
        {path ? <path d={d(path, false)} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={3} strokeDasharray="1" strokeDashoffset={1 - drawn} pathLength={1} strokeLinecap="round" /> : null}
        {plume ? <PlumeCloud plume={plume} k={Math.min(1, Math.max(0, (t - 0.3) / (seconds * 0.8)))} xy={xy} r={(km) => kmToPx(km, view, frame)} /> : null}
        {path && storm ? <Spiral at={xy(...alongPath(path, drawn))} spin={t * 2.2} /> : null}
        {(circles ?? []).map((c) => {
          const [x, y] = xy(c.lon, c.lat), r = kmToPx(c.km, view, frame), on = Math.min(1, Math.max(0, (t / seconds - c.at) / 0.08));
          return (
            <g key={c.label} opacity={on}>
              <circle cx={x} cy={y} r={r * (0.85 + 0.15 * on)} fill="rgba(255,90,60,0.06)" stroke="rgba(255,120,90,0.8)" strokeWidth={2} strokeDasharray="10 8" />
              <text x={x} y={y - r - 12} textAnchor="middle" fill="rgba(255,170,150,0.95)" style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 26, letterSpacing: "0.1em", textTransform: "uppercase" }}>{c.label}</text>
            </g>
          );
        })}
        {path && pathLabel ? (
          <text x={xy(...path[0])[0]} y={xy(...path[0])[1] - 22} textAnchor="middle" fill="rgba(255,255,255,0.8)" opacity={Math.min(1, Math.max(0, (t - 0.3) / 0.4))} style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 30, letterSpacing: "0.12em", textTransform: "uppercase" }}>{pathLabel}</text>
        ) : null}
        {pins.map((p, i) => {
          const [x, y] = xy(p.lon, p.lat), on = Math.min(1, Math.max(0, (t - 0.4 - i * 0.45) / 0.35));
          const pulse = ((((t - i * 0.45) % 1.6) + 1.6) % 1.6) / 1.6, color = p.tone === "red" ? "#ff5a3c" : "#ffffff";
          return (
            <g key={p.label} opacity={on}>
              <circle cx={x} cy={y} r={8 + 26 * pulse} fill="none" stroke={color} strokeOpacity={0.5 * (1 - pulse)} strokeWidth={2} />
              <circle cx={x} cy={y} r={7} fill={color} />
              <text x={x + 18} y={y + 11} fill="rgba(255,255,255,0.88)" style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 34, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.label}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

/** The ash cloud: soft, roughened, growing from the vent to its full width and drifting as it spreads. */
function PlumeCloud({ plume, k, xy, r }: { plume: Plume; k: number; xy: (lon: number, lat: number) => [number, number]; r: (km: number) => number }) {
  const e = 1 - (1 - k) ** 2;
  const [dx, dy] = plume.drift ?? [0, 0];
  const [x, y] = xy(plume.lon + dx * e, plume.lat + dy * e);
  const rad = r((plume.km / 2) * e);
  return (
    <g>
      <defs>
        <radialGradient id="ash">
          <stop offset="0" stopColor="#b8b0a6" stopOpacity="0.8" />
          <stop offset="0.65" stopColor="#8f877e" stopOpacity="0.55" />
          <stop offset="1" stopColor="#6f675f" stopOpacity="0" />
        </radialGradient>
        <filter id="ashEdge" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed={7} />
          <feDisplacementMap in="SourceGraphic" scale="60" />
        </filter>
      </defs>
      <circle cx={x} cy={y} r={Math.max(1, rad)} fill="url(#ash)" filter="url(#ashEdge)" />
      {k > 0.6 ? (
        <text x={x} y={y + rad * 0.62} textAnchor="middle" fill="rgba(255,255,255,0.85)" opacity={Math.min(1, (k - 0.6) / 0.2)} style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 30, letterSpacing: "0.12em", textTransform: "uppercase" }}>{plume.label}</text>
      ) : null}
    </g>
  );
}

/** A typhoon's mark: two curved arms turning about the eye. */
function Spiral({ at, spin }: { at: [number, number]; spin: number }) {
  const arm = "M0,0 C22,-6 38,-28 30,-58";
  return (
    <g transform={`translate(${at[0]},${at[1]}) rotate(${(-spin * 180) / Math.PI})`} opacity={0.9}>
      <circle r={9} fill="none" stroke="#e8eef5" strokeWidth={3} />
      <path d={arm} fill="none" stroke="#e8eef5" strokeWidth={6} strokeLinecap="round" />
      <path d={arm} fill="none" stroke="#e8eef5" strokeWidth={6} strokeLinecap="round" transform="rotate(180)" />
    </g>
  );
}
