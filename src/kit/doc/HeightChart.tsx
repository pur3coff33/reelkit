// How high, to scale: an altitude ruler on the dark, the mountain a sliver at the bottom, and the eruption column climbing
// past marked heights (the stratosphere) to its top, a counter riding up with it. Smoke is a gradient roughened by
// turbulence, so it reads as cloud on a diagram rather than a cartoon. `t` is the shot's seconds.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DOC_FONT } from "./Text";

const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const label = { fontFamily: DOC_FONT, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const };

export function HeightChart({ topKm, maxKm, marks, columnLabel, base, t, seconds }: { topKm: number; maxKm: number; marks: { km: number; label: string }[]; columnLabel: string; base: string; t: number; seconds: number }) {
  const { width, height } = useVideoConfig();
  const ground = height - 250, sky = 100, px = (ground - sky) / maxKm;
  const y = (km: number) => ground - km * px;
  const cx = width * 0.56;
  const grow = ease(t / (seconds * 0.7));
  const top = topKm * grow;
  // A narrow stem that widens slowly, then the umbrella: a broad, flat cap spreading over the top fifth.
  const stem = (km: number) => 16 + km * 2.6;
  const capBase = top * 0.8, capW = 60 + 360 * Math.min(1, Math.max(0, (top - topKm * 0.6) / (topKm * 0.4)));
  const pts: string[] = [];
  const steps = 20;
  const side = (sign: number) => {
    for (let i = 0; i <= steps; i++) {
      const km = (capBase * i) / steps;
      pts.push(`${cx + sign * stem(km)},${y(km)}`);
    }
    // The cap: out to its edge, a rounded top, back in.
    pts.push(`${cx + sign * (stem(capBase) + capW * 0.9)},${y(capBase + (top - capBase) * 0.15)}`);
    pts.push(`${cx + sign * (stem(capBase) + capW)},${y(capBase + (top - capBase) * 0.55)}`);
    pts.push(`${cx + sign * capW * 0.55},${y(top)}`);
  };
  side(1);
  const right = pts.splice(0);
  side(-1);
  const outline = [...right, ...pts.reverse()];
  const half = (km: number) => (km >= capBase ? capW * 0.55 : stem(km));
  const ticks = Array.from({ length: Math.floor(maxKm / 5) + 1 }, (_, i) => i * 5);
  const fadeIn = (from: number) => Math.min(1, Math.max(0, (t - from) / 0.4));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 56% 80%, #161b22 0%, #0b0e12 70%)" }}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="smoke" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#6b625b" />
            <stop offset="0.5" stopColor="#8d857c" />
            <stop offset="1" stopColor="#b9b2a8" />
          </linearGradient>
          <filter id="billow" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed={3} />
            <feDisplacementMap in="SourceGraphic" scale="38" />
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        {/* Ruler */}
        <line x1={260} x2={260} y1={sky - 20} y2={ground} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        {ticks.map((km) => (
          <g key={km} opacity={0.75}>
            <line x1={248} x2={272} y1={y(km)} y2={y(km)} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
            <text x={232} y={y(km) + 10} textAnchor="end" fill="rgba(255,255,255,0.6)" style={{ ...label, fontSize: 26 }}>{km} km</text>
          </g>
        ))}
        {/* Marked heights */}
        {marks.map((m, i) => (
          <g key={m.label} opacity={fadeIn(0.3 + i * 0.3)}>
            <line x1={272} x2={width - 120} y1={y(m.km)} y2={y(m.km)} stroke="rgba(140,190,255,0.55)" strokeWidth={2} strokeDasharray="12 10" />
            <text x={width - 120} y={y(m.km) - 14} textAnchor="end" fill="rgba(170,205,255,0.9)" style={{ ...label, fontSize: 28 }}>{m.label}</text>
          </g>
        ))}
        {/* The column */}
        {top > 0.2 ? <polygon points={outline.join(" ")} fill="url(#smoke)" filter="url(#billow)" opacity={0.95} /> : null}
        {top > 0.2 ? <ellipse cx={cx} cy={ground - 6} rx={60} ry={14} fill="rgba(255,120,60,0.35)" filter="url(#billow)" /> : null}
        {/* Ground and the mountain, to scale */}
        <line x1={260} x2={width - 120} y1={ground} y2={ground} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        <polygon points={`${cx - 150},${ground} ${cx - 30},${ground - 1.7 * px} ${cx + 30},${ground - 1.6 * px} ${cx + 160},${ground}`} fill="#2a323c" stroke="#56626f" strokeWidth={1.5} />
        <text x={cx} y={ground + 46} textAnchor="middle" fill="rgba(255,255,255,0.75)" style={{ ...label, fontSize: 28 }}>{base}</text>
        {/* The counter riding the top */}
        {top > 0.2 ? (
          <g>
            <line x1={cx + half(top) + 24} x2={cx + half(top) + 90} y1={y(top)} y2={y(top)} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
            <text x={cx + half(top) + 104} y={y(top) + 14} fill="#fff" style={{ ...label, fontWeight: 800, fontSize: 52 }}>{top.toFixed(0)} km</text>
            <text x={cx + half(top) + 106} y={y(top) + 50} fill="rgba(255,255,255,0.7)" opacity={grow > 0.98 ? 1 : 0} style={{ ...label, fontSize: 24 }}>{columnLabel}</text>
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
}
