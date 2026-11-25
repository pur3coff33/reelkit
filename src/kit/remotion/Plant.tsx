// kop.it-style plant, drawn to grow: a terracotta pot, a straight stem, alternating oval leaves and an optional flower.
// `grow` 0 → 1 raises the stem and opens the leaves in order; `bloom` 0 → 1 opens the flower.
const GREENS = ["#7FB08C", "#6AA279", "#8FC19B", "#9FD0AA"];

export function Plant(props: { leaves: number; grow: number; bloom?: number; width: number; stem?: string; pot?: string; petals?: string; potIn?: number }) {
  const n = props.leaves;
  const base = 124;
  const gap = Math.min(12, 100 / Math.max(1, n));
  const fullTop = Math.max(16, base - 14 - gap * n);
  const top = base - (base - fullTop) * props.grow;
  const potIn = props.potIn ?? 1;
  return (
    <svg viewBox="0 0 120 150" width={props.width} height={props.width * 1.25} style={{ overflow: "visible" }}>
      <g style={{ transform: `translateY(${(1 - potIn) * 60}px)`, opacity: potIn }}>
        <path d="M40 148 L80 148 L75 128 L45 128 Z" fill={props.pot ?? "#C98B5E"} />
        <rect x="42" y="122" width="36" height="8" rx="4" fill="#B07548" />
      </g>
      {props.grow > 0 && (
        <path d={`M60 ${base} C60 ${(base + top) / 2} 59 ${top + 10} 61 ${top}`} stroke={props.stem ?? "#3E7A4A"} strokeWidth={3} fill="none" strokeLinecap="round" />
      )}
      {Array.from({ length: n }, (_, i) => {
        const appear = Math.max(0, Math.min(1, props.grow * (n + 2) - i - 1));
        if (appear <= 0) return null;
        const y = base - 10 - gap * (i + 0.5);
        const left = i % 2 === 0;
        const size = (15 - Math.min(4, (i / Math.max(1, n)) * 4)) * appear;
        const cx = left ? 60 - size + 1 : 60 + size - 1;
        return (
          <g key={i} transform={`rotate(${left ? -28 : 28} ${cx} ${y})`}>
            <ellipse cx={cx} cy={y} rx={size} ry={size * 0.5} fill={GREENS[i % GREENS.length]} />
          </g>
        );
      })}
      {(props.bloom ?? 0) > 0 && (
        <g transform={`translate(61 ${top - 6}) scale(${props.bloom})`}>
          <g fill={props.petals ?? "#F0A3B5"}>
            <ellipse cx="0" cy="-7" rx="4.5" ry="6.5" />
            <ellipse cx="7" cy="0" rx="6.5" ry="4.5" />
            <ellipse cx="0" cy="7" rx="4.5" ry="6.5" />
            <ellipse cx="-7" cy="0" rx="6.5" ry="4.5" />
          </g>
          <circle r="4.5" fill="#F2C94C" />
        </g>
      )}
    </svg>
  );
}
