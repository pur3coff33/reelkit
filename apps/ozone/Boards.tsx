// The drawn pictures: the plan (the film's recurring image, the door's swing in red), the section with the smoke coming down,
// the court's words on paper, the street map with the 2008 photo, and the cards. All in the documentary's quiet type.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { DOC_FONT } from "../../src/kit/doc/Text";
import { APPROVED, BAR, BOOTH, D, DANCE, DESK, DOORS, HALL, MEZZ, MEZZ_Y, ROOMS, STAIRS, STOREY, TABLES, UNKNOWN, W, WALLS, crowd, type Door } from "./plan";
import { BUILDINGS, ROADS } from "./streets.gen";
import { BULBS, SIGN, offAt } from "./marquee";
import { coverTransform, moveAt, type Move } from "../../src/kit/doc/film";
import { Grade } from "../../src/kit/doc/Still";

export const INK = "#d5dadc";
export const PAPER = "#0d1215";
export const RED = "#e0483f";
const AMBER = "#e9b25c";
const label: CSSProperties = { fontFamily: DOC_FONT, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(230,234,236,0.78)" };
const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** `push` 0 … 1: a slow push-in on the drawing (up to 6%), so a board that holds for a while still moves. */
function Paper({ children, push = 0 }: { children: ReactNode; push?: number }) {
  const z = 1 + 0.06 * push;
  return (
    <AbsoluteFill style={{ background: PAPER, transform: `scale(${z})`, transformOrigin: "50% 48%" }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <pattern id="g1" width={31} height={31} patternUnits="userSpaceOnUse"><path d="M31 0H0V31" fill="none" stroke="rgba(255,255,255,0.035)" /></pattern>
          <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stopColor="#000" stopOpacity={0} /><stop offset="100%" stopColor="#000" stopOpacity={0.6} /></radialGradient>
        </defs>
        <rect width={1920} height={1080} fill="url(#g1)" />
        <rect width={1920} height={1080} fill="url(#vig)" />
      </svg>
      {children}
    </AbsoluteFill>
  );
}

/** The quiet mark on every drawn or rebuilt picture. */
export function Mark({ text }: { text: string }) {
  return <div style={{ ...label, position: "absolute", left: 56, top: 50, fontSize: 21, color: "rgba(255,255,255,0.66)", border: "1px solid rgba(255,255,255,0.4)", padding: "5px 12px 4px" }}>{text}</div>;
}

// ── The plan ─────────────────────────────────────────────────────────────────────────────────────────

const S = 62, OX = (1920 - D * S) / 2 + 30, OY = (1080 - W * S) / 2 + 30;
/** Plan metres to the frame: depth runs left (Timog) to right (the back wall), the left wall at the top. */
const P = (x: number, z: number): [number, number] => [OX + z * S, OY + x * S];

function swing(d: Door) {
  const w = d.to - d.from, h = d.hinge === "from" ? d.from : d.to;
  const c = d.along === "x" ? P(h, d.at) : P(d.at, h);
  const shut = d.along === "x" ? P(d.hinge === "from" ? d.to : d.from, d.at) : P(d.at, d.hinge === "from" ? d.to : d.from);
  const open = d.along === "x" ? P(h, d.at + w) : P(d.at + w, h);
  const cross = (shut[0] - c[0]) * (open[1] - c[1]) - (shut[1] - c[1]) * (open[0] - c[0]);
  const r = w * S;
  return { c, shut, open, path: `M${c[0]},${c[1]} L${shut[0]},${shut[1]} A${r},${r} 0 0 ${cross > 0 ? 1 : 0} ${open[0]},${open[1]} Z`, arc: `M${shut[0]},${shut[1]} A${r},${r} 0 0 ${cross > 0 ? 1 : 0} ${open[0]},${open[1]}` };
}

export function PlanDrawing({ people = 0, flow = 0, red = 1, show = 1, labels = true }: { people?: number; flow?: number; red?: number; show?: number; labels?: boolean }) {
  const rect = (x0: number, x1: number, z0: number, z1: number) => {
    const [a, b] = P(x0, z0), [c, d] = P(x1, z1);
    return { x: Math.min(a, c), y: Math.min(b, d), width: Math.abs(c - a), height: Math.abs(d - b) };
  };
  const dots = crowd(Math.round(people), 4242, flow);
  // The semi-circular bar: its outer and inner edges, from one end at the wall round to the other.
  const barEdge = (rad: number, back = false) => Array.from({ length: 33 }, (_, i) => {
    const a = Math.PI / 2 + (Math.PI * (back ? 32 - i : i)) / 32;
    return P(BAR.cx + rad * Math.cos(a), BAR.cz + rad * Math.sin(a)).join(",");
  });
  const barPath = `M${barEdge(BAR.r + BAR.w / 2).join(" L")} L${barEdge(BAR.r - BAR.w / 2, true).join(" L")} Z`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", opacity: show }}>
      <defs>
        <pattern id="hatch" width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={12} stroke={INK} strokeOpacity={0.13} strokeWidth={2} /></pattern>
      </defs>
      {/* parts of the building no source describes */}
      {UNKNOWN.map((u, i) => <rect key={i} {...rect(u.x0, u.x1, u.z0, u.z1)} fill="url(#hatch)" />)}
      {/* street and pavement */}
      <line x1={OX - 0.1 * S} y1={OY - 90} x2={OX - 0.1 * S} y2={OY + W * S + 90} stroke={INK} strokeOpacity={0.35} strokeDasharray="2 8" />
      <text x={OX - 70} y={OY + (W * S) / 2} fill={INK} fillOpacity={0.6} fontFamily={DOC_FONT} fontWeight={600} fontSize={22} letterSpacing="0.3em" textAnchor="middle" transform={`rotate(-90 ${OX - 70} ${OY + (W * S) / 2})`}>TIMOG AVENUE</text>
      {/* floor features */}
      <rect {...rect(DANCE.x0, DANCE.x1, DANCE.z0, DANCE.z1)} fill="none" stroke={INK} strokeOpacity={0.45} strokeDasharray="10 7" />
      {MEZZ.map((m, i) => <rect key={i} {...rect(m.x0, m.x1, m.z0, m.z1)} fill="rgba(213,218,220,0.04)" stroke={INK} strokeOpacity={0.3} strokeDasharray="3 6" />)}
      <rect {...rect(BOOTH.x0, BOOTH.x1, BOOTH.z0, BOOTH.z1)} fill="rgba(213,218,220,0.12)" stroke={INK} strokeWidth={1.5} />
      <path d={barPath} fill="rgba(213,218,220,0.12)" stroke={INK} strokeWidth={1.5} />
      <rect {...rect(DESK.x0, DESK.x1, DESK.z0, DESK.z1)} fill="rgba(213,218,220,0.12)" stroke={INK} strokeWidth={1.2} />
      {TABLES.map(([x, z], i) => {
        const [cx, cy] = P(x, z);
        return (
          <g key={i} stroke={INK} strokeOpacity={0.6} fill="none">
            <circle cx={cx} cy={cy} r={0.36 * S} />
            {[-0.55, 0.55].map((dz) => <rect key={dz} x={cx + dz * S - 0.2 * S} y={cy - 0.2 * S} width={0.4 * S} height={0.4 * S} strokeOpacity={0.35} />)}
          </g>
        );
      })}
      {Array.from({ length: 13 }, (_, i) => {
        const z = STAIRS.z0 + ((STAIRS.z1 - STAIRS.z0) * i) / 12, [a, b] = P(STAIRS.x0, z), [, d] = P(STAIRS.x1, z);
        return <line key={i} x1={a} y1={b} x2={a} y2={d} stroke={INK} strokeOpacity={0.5} />;
      })}
      {/* walls */}
      {WALLS.map((w, i) => {
        const r = w.along === "x" ? rect(w.from, w.to, w.at - 0.1, w.at + 0.1) : rect(w.at - 0.1, w.at + 0.1, w.from, w.to);
        return <rect key={i} {...r} fill={INK} />;
      })}
      {/* crowd */}
      {dots.map(([x, z], i) => {
        const [px, py] = P(x, z);
        return <circle key={i} cx={px} cy={py} r={4.2} fill={i < APPROVED ? "#f4f1ea" : AMBER} fillOpacity={0.92} />;
      })}
      {/* the doors: every one swings in, towards the dance floor */}
      {DOORS.map((d) => {
        const s = swing(d);
        return (
          <g key={d.id} opacity={red}>
            <path d={s.path} fill={RED} fillOpacity={0.16} />
            <path d={s.arc} fill="none" stroke={RED} strokeWidth={2.5} />
            <line x1={s.c[0]} y1={s.c[1]} x2={s.open[0]} y2={s.open[1]} stroke={RED} strokeWidth={4} />
          </g>
        );
      })}
      {labels ? (
        <g fontFamily={DOC_FONT} fontWeight={600} fontSize={17} letterSpacing="0.16em" fill={INK} fillOpacity={0.7}>
          {ROOMS.filter((r) => r.name !== "Corridor").map((r) => {
            const [x, y] = P((r.r.x0 + r.r.x1) / 2, (r.r.z0 + r.r.z1) / 2);
            return <text key={r.name} x={x} y={y + 6} textAnchor="middle">{r.name.toUpperCase()}</text>;
          })}
          {UNKNOWN.map((u, i) => {
            const [x, y] = P((u.x0 + u.x1) / 2, (u.z0 + u.z1) / 2);
            return <text key={i} x={x} y={y + 6} textAnchor="middle" fontSize={14} fillOpacity={0.45}>NO RECORD</text>;
          })}
          <text {...(() => { const [x, y] = P((HALL.x0 + HALL.x1) / 2, HALL.z1 / 2); return { x, y: y + 6 }; })()} textAnchor="middle" fontSize={15}>CORRIDOR</text>
          <text {...(() => { const [x, y] = P((DANCE.x0 + DANCE.x1) / 2, (DANCE.z0 + DANCE.z1) / 2); return { x, y: y + 6 }; })()} textAnchor="middle" fillOpacity={0.5}>DANCE FLOOR</text>
          <text {...(() => { const [x, y] = P((BOOTH.x0 + BOOTH.x1) / 2, (BOOTH.z0 + BOOTH.z1) / 2); return { x, y: y + 6 }; })()} textAnchor="middle" fontSize={15}>DJ</text>
          <text {...(() => { const [x, y] = P(BAR.cx - BAR.r - 0.9, BAR.cz); return { x, y: y + 6 }; })()} textAnchor="middle" fontSize={14} fillOpacity={0.6}>BAR</text>
          <text {...(() => { const [x, y] = P(4, 19.3); return { x, y: y + 6 }; })()} textAnchor="middle" fontSize={13} fillOpacity={0.45}>MEZZANINE ABOVE</text>
          <text {...(() => { const [x, y] = P(-0.55, 15.8); return { x, y }; })()} textAnchor="middle" fontSize={13} fillOpacity={0.55}>TO THE BUILDING NEXT DOOR</text>
          {DOORS.filter((d) => d.label).map((d) => {
            const s = swing(d), x = d.along === "x" ? s.open[0] + 16 : s.shut[0] + 60, y = d.along === "x" ? s.c[1] + (d.group ? 56 : 0) : s.open[1] + 22;
            return <text key={d.id} x={x} y={y} textAnchor="start" fill={RED} fillOpacity={red}>{d.label.toUpperCase()}</text>;
          })}
        </g>
      ) : null}
      {/* title block */}
      <g transform="translate(1440 56)" fontFamily={DOC_FONT} fontWeight={600} letterSpacing="0.14em" fill={INK}>
        <rect width={420} height={110} fill="none" stroke={INK} strokeOpacity={0.4} />
        <line x1={0} y1={40} x2={420} y2={40} stroke={INK} strokeOpacity={0.3} />
        <text x={16} y={28} fontSize={18} fillOpacity={0.85}>OZONE DISCO · GROUND FLOOR</text>
        <text x={16} y={66} fontSize={15} fillOpacity={0.6}>TIMOG AVENUE, QUEZON CITY · 1996</text>
        <text x={16} y={92} fontSize={15} fill={AMBER} fillOpacity={0.85}>ILLUSTRATIVE LAYOUT · NOT TO SCALE</text>
      </g>
    </svg>
  );
}

/** 35 allowed, 390 inside: the plan fills as the count climbs. `k` 0 … 1 through the count. */
export function PlanBoard({ k, flow = 0, red = 1, counter = true }: { k: number; flow?: number; red?: number; counter?: boolean }) {
  const n = k < 0.35 ? APPROVED * clamp(k / 0.3) : APPROVED + (390 - APPROVED) * clamp((k - 0.4) / 0.6) ** 0.8;
  return (
    <Paper>
      <PlanDrawing people={n} flow={flow} red={red} />
      {counter ? (
        <div style={{ position: "absolute", left: 120, top: 92, display: "flex", gap: 64, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 96, lineHeight: 1, color: "#f4f1ea" }}>{APPROVED}</div>
            <div style={{ ...label, fontSize: 20, marginTop: 6 }}>Approved</div>
          </div>
          <div style={{ opacity: clamp((k - 0.35) / 0.1) }}>
            <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 96, lineHeight: 1, color: AMBER }}>{Math.round(Math.max(n, APPROVED))}</div>
            <div style={{ ...label, fontSize: 20, marginTop: 6, color: AMBER }}>Inside that night</div>
          </div>
        </div>
      ) : null}
      <Mark text="Illustration" />
    </Paper>
  );
}

// ── The section ──────────────────────────────────────────────────────────────────────────────────────

/** Side view along the line of the three doors, the smoke coming down from the ceiling. `seconds` on the timer. */
/** `rush` 0 … 1: the fire surging out through the inner door and down the corridor toward the air when the doors opened.
 *  `notes`: callouts placed in the section (z along the building, y height, metres), shown at opacity `o`. */
export function SectionBoard({ smoke, seconds, heat, dark = 0, rush = 0, notes = [], showTimer = true }: { smoke: number; seconds: number; heat: number; dark?: number; rush?: number; notes?: { text: string; z: number; y: number; o: number }[]; showTimer?: boolean }) {
  const s = 74, ox = (1920 - D * s) / 2, gy = 760;
  const X = (z: number) => ox + z * s, Y = (y: number) => gy - y * s;
  let rs = 5;
  const r = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  const people = Array.from({ length: 70 }, () => HALL.z1 + 0.5 + r() * 8.8);
  const edge = Array.from({ length: 81 }, (_, i) => {
    const z = (i / 80) * D, wob = Math.sin(z * 1.7 + seconds * 0.8) * 0.08 + Math.sin(z * 4.3 - seconds * 1.3) * 0.04;
    // The layer is deepest over the fire and thins towards the front.
    const y = Math.max(smoke, Math.min(STOREY, smoke + (1 - z / D) * 0.5 + wob));
    return `${X(z)},${Y(y)}`;
  });
  const timer = `00:${String(Math.floor(seconds)).padStart(2, "0")}`;
  return (
    <Paper>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="smk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a524a" stopOpacity={0.95} /><stop offset="1" stopColor="#3b3631" stopOpacity={0.7} /></linearGradient>
          <radialGradient id="heat" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ff8a3a" stopOpacity={0.95} /><stop offset="0.5" stopColor="#ff5a1a" stopOpacity={0.35} /><stop offset="1" stopColor="#ff5a1a" stopOpacity={0} /></radialGradient>
        </defs>
        <ellipse cx={X((BOOTH.z0 + BOOTH.z1) / 2)} cy={Y(1.6)} rx={220 * heat + 1} ry={200 * heat + 1} fill="url(#heat)" />
        {rush > 0 && rush < 1 ? (() => {
          const z = HALL.z1 + 3 - (HALL.z1 + 3.4) * rush, o = Math.sin(Math.PI * rush);
          return <g opacity={o}><ellipse cx={X(z + 2.5)} cy={Y(1.7)} rx={420} ry={150} fill="url(#heat)" opacity={0.6} /><ellipse cx={X(z)} cy={Y(1.5)} rx={250} ry={130} fill="url(#heat)" /></g>;
        })() : null}
        {people.map((z, i) => (
          <g key={i} fill="#8f8a83" opacity={0.85}>
            <rect x={X(z) - 5} y={Y(1.45)} width={10} height={1.45 * s - 2} rx={5} />
            <circle cx={X(z)} cy={Y(1.6)} r={7} />
          </g>
        ))}
        <polygon points={`${X(0.12)},${Y(STOREY)} ${edge.join(" ")} ${X(D - 0.12)},${Y(STOREY)}`} fill="url(#smk)" opacity={smoke < STOREY - 0.05 ? 1 : 0} />
        {/* the building in section */}
        <g fill={INK}>
          <rect x={X(-0.1)} y={Y(STOREY + 0.25)} width={(D + 0.2) * s} height={0.25 * s} />
          <rect x={X(-0.1)} y={Y(0)} width={(D + 0.2) * s} height={8} />
          <rect x={X(D - 0.1)} y={Y(STOREY)} width={0.2 * s} height={STOREY * s} />
          {[0, HALL.z1].map((z) => <rect key={z} x={X(z - 0.1)} y={Y(STOREY)} width={0.2 * s} height={(STOREY - 2.1) * s} />)}
          <rect x={X(MEZZ[0].z0)} y={Y(MEZZ_Y + 0.22)} width={(D - MEZZ[0].z0) * s} height={0.22 * s} />
          <rect x={X(BOOTH.z0)} y={Y(1.45)} width={(BOOTH.z1 - BOOTH.z0) * s} height={1.45 * s} fillOpacity={0.5} />
        </g>
        {[0, HALL.z1].map((z, i) => (
          <text key={z} x={X(z)} y={Y(0) + 40} fill={RED} fontFamily={DOC_FONT} fontWeight={600} fontSize={17} letterSpacing="0.14em" textAnchor="middle">{["MAIN DOORS", "INNER DOOR"][i]}</text>
        ))}
        <text x={X(HALL.z1 / 2)} y={Y(0) - 14} fill={INK} fillOpacity={0.5} fontFamily={DOC_FONT} fontWeight={600} fontSize={15} letterSpacing="0.14em" textAnchor="middle">CORRIDOR</text>
        <text x={X((BOOTH.z0 + BOOTH.z1) / 2)} y={Y(0) + 40} fill={INK} fillOpacity={0.6} fontFamily={DOC_FONT} fontWeight={600} fontSize={17} letterSpacing="0.14em" textAnchor="middle">DJ BOOTH</text>
        <g opacity={smoke < STOREY - 0.2 ? 1 : 0} fontFamily={DOC_FONT} fontWeight={600} fontSize={18} letterSpacing="0.16em" fill="#e8e2d8">
          <text x={X(11.5)} y={Y(STOREY) + 34} textAnchor="middle">HOT SMOKE</text>
          <path d={`M${X(11.5)} ${Y(STOREY) + 44} V ${Y(smoke) - 8}`} stroke="#e8e2d8" strokeOpacity={0.7} />
          <path d={`M${X(11.5) - 7} ${Y(smoke) - 16} L${X(11.5)} ${Y(smoke) - 6} L${X(11.5) + 7} ${Y(smoke) - 16}`} fill="none" stroke="#e8e2d8" strokeOpacity={0.8} />
        </g>
      </svg>
      {notes.map((n) => (
        <div key={n.text} style={{ position: "absolute", left: X(n.z), top: Y(n.y), transform: "translate(-50%, -50%)", opacity: n.o, textAlign: "center" }}>
          <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 30, letterSpacing: "0.14em", color: "#f4f1ea", textShadow: "0 2px 10px rgba(0,0,0,0.8)", whiteSpace: "nowrap" }}>{n.text}</div>
        </div>
      ))}
      <div style={{ position: "absolute", right: 120, top: 96, textAlign: "right", opacity: showTimer ? 1 : 0 }}>
        <div style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 92, color: "#f4f1ea", letterSpacing: "0.04em" }}>{timer}</div>
        <div style={{ ...label, fontSize: 19 }}>Since the smoke was seen</div>
      </div>
      <Mark text="Illustration" />
      <AbsoluteFill style={{ background: "#000", opacity: dark }} />
    </Paper>
  );
}

// ── The record ───────────────────────────────────────────────────────────────────────────────────────

/** A line from a ruling, typed on paper as it's read, the key words highlighted. Shown as a quotation, never as a facsimile. */
export function QuoteBoard({ k, before, mark, after, source, kicker = "Quoted from the decision" }: { k: number; before: string; mark: string; after: string; source: string; kicker?: string }) {
  const all = before + mark + after, shown = Math.round(all.length * clamp(k / 0.6));
  const hl = clamp((k - 0.62) / 0.25);
  const part = (s: string, from: number) => s.slice(0, Math.max(0, shown - from));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1b1a18 0%, #0a0a09 75%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1180, padding: "90px 110px 80px", background: "linear-gradient(#efe9dc, #e6dfcf)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", transform: `rotate(-0.6deg) translateY(${(1 - k) * 8}px)` }}>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 20, letterSpacing: "0.2em", color: "#6b6357", marginBottom: 34, textTransform: "uppercase" }}>{kicker}</div>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 44, lineHeight: 1.45, color: "#23201b" }}>
          {part(before, 0)}
          <span style={{ backgroundImage: `linear-gradient(90deg, rgba(240,196,70,0.75) ${hl * 100}%, transparent ${hl * 100}%)` }}>{part(mark, before.length)}</span>
          {part(after, before.length + mark.length)}
          <span style={{ opacity: shown < all.length ? 1 : 0 }}>▍</span>
        </div>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 22, letterSpacing: "0.12em", color: "#6b6357", marginTop: 44, textTransform: "uppercase" }}>{source}</div>
      </div>
    </AbsoluteFill>
  );
}

/** The street map around the Scout circle, the club's corner pinned, the 2008 photo flying in from the pin. */
/** `scouts` 0 … 1 lights the streets named after the 24 scouts and marks their memorial (and leaves the photo out). */
export function MapBoard({ k, scouts = 0 }: { k: number; scouts?: number }) {
  const sc = 1.55 + 0.35 * k, cx = 960, cy = 560, fx = 25, fy = -8;
  const M = (x: number, y: number): [number, number] => [cx + (x - fx) * sc, cy - (y - fy) * sc];
  const width = (kind: string) => ({ primary: 16, trunk: 18, secondary: 11, tertiary: 8 } as Record<string, number>)[kind] ?? 4;
  const PIN: [number, number] = [70, -31];
  const [px, py] = M(...PIN);
  /** A street's name along the stretch from p to q (map metres). */
  const tag = (name: string, p: [number, number], q: [number, number], dy = -16) => {
    const a = M(...p), b = M(...q);
    let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    if (ang > 90) ang -= 180;
    if (ang < -90) ang += 180;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    return <text x={mx} y={my + dy} transform={`rotate(${ang} ${mx} ${my})`} fill={INK} fillOpacity={0.75} fontFamily={DOC_FONT} fontWeight={600} fontSize={22} letterSpacing="0.22em" textAnchor="middle">{name.toUpperCase()}</text>;
  };
  const photo = scouts > 0 ? 0 : clamp((k - 0.25) / 0.35), PX = 300, PY = 110;
  const scoutRoads = ROADS.filter((r) => r.name.startsWith("Scout ") && r.name !== "Scout Memorial Circle");
  const [mx0, my0] = M(22, -3);
  return (
    <AbsoluteFill style={{ background: "#0b0e11" }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {BUILDINGS.map((b, i) => <polygon key={i} points={b.map((p) => M(...p).join(",")).join(" ")} fill="rgba(213,218,220,0.06)" stroke="rgba(213,218,220,0.12)" />)}
        {ROADS.map((r, i) => <polyline key={i} points={r.pts.map((p) => M(...p).join(",")).join(" ")} fill="none" stroke={r.kind === "primary" ? "#59626b" : "#343b42"} strokeWidth={width(r.kind) * (sc / 1.6)} strokeLinecap="round" strokeLinejoin="round" />)}
        {scouts > 0 ? (
          <g opacity={scouts}>
            {scoutRoads.map((r, i) => <polyline key={i} points={r.pts.map((p) => M(...p).join(",")).join(" ")} fill="none" stroke={AMBER} strokeOpacity={0.55} strokeWidth={4.5 * (sc / 1.6)} strokeLinecap="round" strokeLinejoin="round" />)}
            {Array.from(new Set(scoutRoads.map((r) => r.name))).map((name, i) => {
              const r = scoutRoads.filter((x) => x.name === name).sort((a, b) => b.pts.length - a.pts.length)[0];
              const [x, y] = M(...r.pts[Math.floor(r.pts.length / 2)]);
              if (x < 40 || x > 1880 || y < 40 || y > 1000) return null;
              return <text key={name} x={x} y={y - 8} fill={AMBER} fillOpacity={0.8 * clamp((k * 24 - i) / 3)} fontFamily={DOC_FONT} fontWeight={600} fontSize={15} letterSpacing="0.12em" textAnchor="middle">{name.replace(" Street", "").replace(" Extension", "").toUpperCase()}</text>;
            })}
            <circle cx={mx0} cy={my0} r={9} fill={AMBER} />
            <text x={mx0} y={my0 - 56} fill="#f2ede4" fontFamily={DOC_FONT} fontWeight={700} fontSize={22} letterSpacing="0.14em" textAnchor="middle">MEMORIAL TO THE 24 SCOUTS</text>
            <text x={mx0} y={my0 - 32} fill={AMBER} fontFamily={DOC_FONT} fontWeight={600} fontSize={17} letterSpacing="0.14em" textAnchor="middle">FLIGHT 869 · 28 JULY 1963</text>
          </g>
        ) : null}
        {tag("Timog Avenue", [-194.9, 47.5], [-35.3, 10.8], -14)}
        {tag("Timog Avenue", [111.8, -24.6], [223.3, -49.9], -14)}
        {tag("Tomas Morato Avenue", [-19.4, -188.8], [-2.6, -115.7], -12)}
        <circle cx={px} cy={py} r={34 + 10 * Math.sin(k * 12)} fill="none" stroke={RED} strokeOpacity={0.35} />
        <circle cx={px} cy={py} r={11} fill={RED} />
        <text x={px + 24} y={py + 46} fill="#f2ede4" fontFamily={DOC_FONT} fontWeight={700} fontSize={28} letterSpacing="0.12em">OZONE DISCO</text>
        <text x={px + 24} y={py + 74} fill={INK} fillOpacity={0.6} fontFamily={DOC_FONT} fontWeight={600} fontSize={18} letterSpacing="0.14em">APPROXIMATE SITE</text>
        <line x1={px} y1={py} x2={PX + 164} y2={PY + 560} stroke={INK} strokeOpacity={0.5 * photo} strokeDasharray="3 6" />
      </svg>
      <div style={{ position: "absolute", left: PX + 164 + (px - PX - 164) * (1 - photo), top: PY + (py - PY) * (1 - photo), transform: `translate(-50%, 0) rotate(${2 - 2 * photo}deg) scale(${0.2 + 0.8 * photo})`, transformOrigin: "50% 0", opacity: photo, background: "#f3efe6", padding: "14px 14px 54px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        <Img src={staticFile("assets/ozone-2008.jpg")} style={{ width: 300, height: 467, display: "block", filter: "grayscale(0.35) contrast(1.05)" }} />
        <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 18, letterSpacing: "0.12em", color: "#4b463e", marginTop: 12 }}>THE BUILDING · MAY 2008</div>
      </div>
      <div style={{ ...label, position: "absolute", left: 56, bottom: 44, fontSize: 15, color: "rgba(255,255,255,0.45)" }}>Map © OpenStreetMap contributors · Photo: Anyo Niminus, 2008, public domain</div>
    </AbsoluteFill>
  );
}

// ── Cards ────────────────────────────────────────────────────────────────────────────────────────────

/** The title: the name, the date, and the door's swing drawn faintly behind. */
export function TitleCard({ t }: { t: number }) {
  const o = clamp(t / 1.2), arc = clamp((t - 0.3) / 1.8);
  // A door leaf swinging a quarter turn from its hinge, its arc drawn behind it, as on the plan.
  const r = 300, hx = 960 - r / 2, hy = 540 + r / 2 + 40, th = (arc * Math.PI) / 2, len = (Math.PI / 2) * r;
  return (
    <AbsoluteFill style={{ background: "#08090b", alignItems: "center", justifyContent: "center" }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <path d={`M ${hx + r} ${hy} A ${r} ${r} 0 0 0 ${hx} ${hy - r}`} fill="none" stroke={RED} strokeOpacity={0.4} strokeWidth={2} strokeDasharray={len} strokeDashoffset={len * (1 - arc)} />
        <line x1={hx} y1={hy} x2={hx + r * Math.cos(th)} y2={hy - r * Math.sin(th)} stroke={RED} strokeOpacity={0.5} strokeWidth={3} />
      </svg>
      <div style={{ fontFamily: DOC_FONT, fontWeight: 800, fontSize: 210, letterSpacing: "0.32em", paddingLeft: "0.32em", color: "#f2efe8", opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}>OZONE</div>
      <div style={{ ...label, fontSize: 30, letterSpacing: "0.42em", opacity: clamp((t - 0.9) / 0.9) }}>Quezon City · 18 March 1996</div>
    </AbsoluteFill>
  );
}

export function ChapterCard({ t, n, title }: { t: number; n: string; title: string }) {
  return (
    <AbsoluteFill style={{ background: "#08090b", alignItems: "flex-start", justifyContent: "center", paddingLeft: 220 }}>
      <div style={{ ...label, fontSize: 26, letterSpacing: "0.4em", color: RED, opacity: clamp(t / 0.6) }}>Chapter {n}</div>
      <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 120, color: "#f2efe8", marginTop: 6, opacity: clamp((t - 0.3) / 0.8), transform: `translateX(${(1 - clamp((t - 0.3) / 0.8)) * -14}px)` }}>{title}</div>
      <div style={{ width: 220 * clamp((t - 0.5) / 1), height: 3, background: RED, marginTop: 22, opacity: 0.8 }} />
    </AbsoluteFill>
  );
}

export function WarningCard({ t }: { t: number }) {
  return (
    <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 1100, textAlign: "center", opacity: clamp(t / 0.8) }}>
        <div style={{ ...label, fontSize: 24, letterSpacing: "0.3em", color: RED, marginBottom: 30 }}>Viewer discretion</div>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 44, lineHeight: 1.4, color: "#e9e6df" }}>
          This film tells the story of a fire in which 162 people died, most of them students. It contains descriptions some viewers may find distressing.
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** A person's name, lower left, the way the film introduces anyone it follows. */
export function NameTag({ name, role, t }: { name: string; role: string; t: number }) {
  return (
    <div style={{ position: "absolute", left: 96, bottom: 190, opacity: clamp((t - 0.5) / 0.6) }}>
      <div style={{ width: 54, height: 3, background: RED, marginBottom: 14 }} />
      <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 46, color: "#f2efe8", letterSpacing: "0.04em" }}>{name}</div>
      <div style={{ ...label, fontSize: 21, marginTop: 4 }}>{role}</div>
    </div>
  );
}

// ── Chapter 1: the building's names, the sign, the company ───────────────────────────────────────────

/** Where the 2008 photo sits (shown at 2×, its full size limit), and the front traced from it in the photo's own pixels
 *  (at 2×), so the drawing lies exactly on the photograph as one turns into the other. */
const PH = { x: 150, y: 40, w: 642, h: 1000 };
const ph = (x: number, y: number): [number, number] => [PH.x + x, PH.y + y];

/** The front of the building, traced from the May 2008 photo (two storeys: a roof slab, a recessed window band, a
 *  corrugated awning, a metal shutter, a pillar either side), and the drawing's title block naming what it was.
 *  `photo` 0 … 1 shows the photograph under the lines; `draw` 0 … 1 traces them; `t` pushes in slowly.
 *  `block` is the title block's content (the photo's caption, then the names; the last current, earlier ones struck). */
export function NamesBoard({ t, photo = 0, draw = 1, names, head, note = [] }: { t: number; photo?: number; draw?: number; names: { name: string; year: string }[]; head?: { kicker: string; big: string; sub: string }; note?: { text: string; at: number }[] }) {
  const line = { stroke: INK, strokeWidth: 2.4, fill: "none" } as const;
  const R = (x0: number, y0: number, x1: number, y1: number, o = 1) => {
    const [a, b] = ph(x0, y0), [c, d] = ph(x1, y1);
    return <rect x={a} y={b} width={c - a} height={d - b} {...line} strokeOpacity={o} />;
  };
  const L = (x0: number, y0: number, x1: number, y1: number, o = 1) => {
    const [a, b] = ph(x0, y0), [c, d] = ph(x1, y1);
    return <line x1={a} y1={b} x2={c} y2={d} {...line} strokeOpacity={o} />;
  };
  const awning = [ph(172, 452), ph(528, 452), ph(540, 502), ph(160, 502)].map((p) => p.join(",")).join(" ");
  const cur = names[names.length - 1];
  return (
    <Paper push={Math.min(1, t / 30)}>
      <Img src={staticFile("assets/ozone-2008.jpg")} style={{ position: "absolute", left: PH.x, top: PH.y, width: PH.w, height: PH.h, opacity: photo, filter: "grayscale(0.55) contrast(1.06) brightness(0.92)" }} />
      <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(13,18,21,0) 0%, rgba(13,18,21,0) ${PH.x + PH.w - 120}px, ${PAPER} ${PH.x + PH.w + 10}px)`, opacity: photo }} />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <g strokeDasharray={1400} strokeDashoffset={1400 * (1 - draw)} style={{ filter: photo > 0.05 ? "drop-shadow(0 0 3px rgba(0,0,0,0.9))" : undefined }}>
          {L(-150, 800, 760, 800, 0.5)}
          {R(108, 198, 562, 242)}
          {R(108, 242, 160, 800)}
          {R(205, 242, 520, 446)}
          {R(235, 292, 498, 440)}
          {[300, 366, 432].map((x) => <g key={x}>{L(x, 292, x, 440, 0.45)}</g>)}
          <polygon points={awning} {...line} />
          {R(205, 530, 505, 792)}
          {L(355, 530, 355, 792, 0.6)}
          {R(522, 502, 556, 800)}
          {R(-150, -40, 108, 800, 0.22)}
          {R(556, 250, 760, 800, 0.22)}
        </g>
        <text x={PH.x + 320} y={PH.y + 846} fill={INK} fillOpacity={0.55 * draw} fontFamily={DOC_FONT} fontWeight={600} fontSize={16} letterSpacing="0.2em" textAnchor="middle">FRONT ELEVATION · TIMOG AVENUE · TRACED FROM A 2008 PHOTOGRAPH</text>
      </svg>
      {head ? (
        <div style={{ position: "absolute", left: 1000, top: 330, width: 760, opacity: photo }}>
          <div style={{ ...label, fontSize: 22 }}>{head.kicker}</div>
          <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 80, color: "#f2ede4", lineHeight: 1.05, marginTop: 10 }}>{head.big}</div>
          <div style={{ ...label, fontSize: 24, color: AMBER, marginTop: 14 }}>{head.sub}</div>
        </div>
      ) : null}
      {cur ? (
        <div style={{ position: "absolute", left: 1000, top: 300, width: 760, border: "1px solid rgba(213,218,220,0.45)", padding: "28px 34px", opacity: 1 - photo }}>
          {names.slice(0, -1).map((n) => (
            <div key={n.name} style={{ ...label, fontSize: 26, color: "rgba(230,234,236,0.42)", textDecoration: "line-through", marginBottom: 10 }}>{n.name} · {n.year}</div>
          ))}
          <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: cur.name.length > 16 ? 62 : 92, color: "#f2ede4", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.04 }}>{cur.name}</div>
          <div style={{ ...label, fontSize: 30, color: AMBER, marginTop: 12 }}>{cur.year}</div>
          {note.map((n, i) => <div key={n.text} style={{ ...label, fontSize: 22, marginTop: i ? 8 : 26, opacity: clamp((t - n.at) / 0.6) }}>{n.text}</div>)}
        </div>
      ) : null}
      {photo > 0.02 ? <div style={{ ...label, position: "absolute", left: 56, bottom: 44, fontSize: 15, color: "rgba(255,255,255,0.45)", opacity: photo }}>Photo: Anyo Niminus, May 2008, public domain</div> : null}
      <Mark text={photo > 0.5 ? "Photograph · 2008" : "Illustration"} />
    </Paper>
  );
}

/** Birdland's sign, lit, the people who sang there going up on it one by one; then (`off` 0 … 1) the bulbs dying a
 *  circuit at a time. `shown` 0 … 1 puts the names up; `turned` 0 … 1 runs the turned-away counter. Illustrative: no
 *  record of the real sign survives in our sources; the names are Philstar's (2010). */
export function MarqueeBoard({ names, shown, turned, off }: { names: string[]; shown: number; turned: number; off: number }) {
  const { x0, y0, x1, y1 } = SIGN, w = x1 - x0;
  const lit = (i: number) => {
    const at = offAt(i);
    if (off <= at) return 1;
    const d = (off - at) / 0.05;
    return d > 1 ? 0 : (Math.sin(i * 7 + off * 300) > 0 ? 0.9 : 0.15) * (1 - d);
  };
  const sign = clamp(1 - (off - 0.55) / 0.4), words = 0.18 + 0.82 * clamp(1 - (off - 0.25) / 0.6);
  const cols = 3, rowH = 96, inset = 50, gx = (w - 2 * inset) / cols;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, rgba(70,44,18,${0.55 * sign}) 0%, #070605 70%)` }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="bulb"><stop offset="0" stopColor="#fff3d0" /><stop offset="0.25" stopColor="#ffc56a" stopOpacity={0.9} /><stop offset="1" stopColor="#ff9a2a" stopOpacity={0} /></radialGradient>
          <pattern id="felt" width={8} height={14} patternUnits="userSpaceOnUse"><rect width={8} height={14} fill="#121110" /><line x1={0} y1={13} x2={8} y2={13} stroke="#000" strokeOpacity={0.7} /></pattern>
        </defs>
        <rect x={x0 - 34} y={y0 - 34} width={w + 68} height={y1 - y0 + 68} rx={10} fill="#0e0c0a" stroke="#3a3128" strokeWidth={3} />
        <rect x={x0 + 40} y={y0 + 178} width={w - 80} height={y1 - y0 - 218} fill="url(#felt)" stroke="#2a241e" />
        {BULBS.map(([x, y], i) => {
          const o = lit(i);
          return (
            <g key={i}>
              {o > 0.01 ? <circle cx={x} cy={y} r={30} fill="url(#bulb)" opacity={0.75 * o} /> : null}
              <circle cx={x} cy={y} r={8} fill={o > 0.01 ? "#fff1cf" : "#3b342c"} fillOpacity={o > 0.01 ? 0.4 + 0.6 * o : 1} stroke="#1c1814" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: x0, top: y0 + 38, width: w, textAlign: "center", fontFamily: DOC_FONT, fontWeight: 800, fontSize: 112, letterSpacing: "0.34em", paddingLeft: "0.34em", color: sign > 0.05 ? "#ffe7b8" : "#3b342c", opacity: 0.25 + 0.75 * sign, textShadow: sign > 0.05 ? `0 0 ${18 * sign}px rgba(255,170,70,${0.9 * sign}), 0 0 ${60 * sign}px rgba(255,140,40,${0.5 * sign})` : "none" }}>BIRDLAND</div>
      {names.map((n, i) => {
        const o = clamp(shown * names.length - i), col = i % cols, row = Math.floor(i / cols);
        return (
          <div key={n} style={{ position: "absolute", left: x0 + inset + col * gx, top: y0 + 226 + row * rowH + (1 - o) * -10, width: gx, textAlign: "center", fontFamily: DOC_FONT, fontWeight: 700, fontSize: 40, letterSpacing: "0.05em", textTransform: "uppercase", color: "#f1ece2", opacity: o * words }}>{n}</div>
        );
      })}
      <div style={{ position: "absolute", left: 0, width: 1920, top: 790, textAlign: "center", opacity: clamp(turned * 4) * clamp(1 - off * 3) }}>
        <span style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 84, color: AMBER, verticalAlign: "middle" }}>{Math.round(150 * clamp(turned) ** 0.7)}</span>
        <span style={{ ...label, fontSize: 24, color: AMBER, marginLeft: 26, verticalAlign: "middle" }}>Turned away on its busiest nights</span>
      </div>
      <Mark text="Illustration" />
    </AbsoluteFill>
  );
}

/** One person at the table seen from above: shoulders and head, the grey of the reconstruction's figures. */
const Sitter = ({ x, y, turn, o }: { x: number; y: number; turn: number; o: number }) => (
  <g transform={`translate(${x} ${y + (1 - o) * -8}) rotate(${turn})`} opacity={o}>
    <ellipse rx={34} ry={20} fill="#8f8a83" />
    <circle cy={-2} r={14} fill="#aca69d" />
  </g>
);

/** Westwood Entertainment as a board table drawn from above: a chair for each name on its papers, filling as they're
 *  named (`at`: seconds into the shot each sits down), and Alfredo Chua's chair left empty, as the court found he never
 *  attended a board meeting. `truth` 0 … 1 brings in the man the court found behind his name. Seating is illustrative. */
export function BoardTable({ t, at, truth = 0 }: { t: number; at: [number, number, number, number]; truth?: number }) {
  const T = { x0: 600, y0: 470, x1: 1320, y1: 660 };
  const seats = [
    { name: "Hermilo Ocampo", role: "President", x: 530, y: 565, turn: 90, lx: 470, ly: 565, anchor: "end" },
    { name: "Ramon Ng", role: "Treasurer", x: 800, y: 420, turn: 180, lx: 800, ly: 330, anchor: "middle" },
    { name: "Rosita Ku", role: "Director", x: 1120, y: 420, turn: 180, lx: 1120, ly: 330, anchor: "middle" },
    { name: "Alfredo Chua", role: "Incorporator", x: 960, y: 712, turn: 0, lx: 900, ly: 712, anchor: "end" },
  ] as const;
  const show = (i: number) => clamp((t - at[i]) / 0.6), chua = show(3), empty = clamp((t - at[3] - 1.4) / 0.8);
  const pua = { x: 1500, y: 790 };
  const text = (x: number, y: number, a: "start" | "middle" | "end", big: string, small: string, o: number, color = "#f2ede4") => (
    <g opacity={o} fontFamily={DOC_FONT} textAnchor={a}>
      <text x={x} y={y} fill={color} fontWeight={700} fontSize={34}>{big}</text>
      <text x={x} y={y + 30} fill={INK} fillOpacity={0.75} fontWeight={600} fontSize={17} letterSpacing="0.14em">{small.toUpperCase()}</text>
    </g>
  );
  return (
    <Paper push={Math.min(1, t / 25)}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <g transform="translate(960 575) scale(1.15) translate(-960 -575)">
        <rect x={T.x0} y={T.y0} width={T.x1 - T.x0} height={T.y1 - T.y0} rx={22} fill="rgba(213,218,220,0.05)" stroke={INK} strokeWidth={2} strokeOpacity={0.8} />
        {seats.map((s, i) => (
          <g key={s.name}>
            <rect x={s.x - 38} y={s.y - 32} width={76} height={64} rx={14} fill="none" stroke={i === 3 ? RED : INK} strokeOpacity={i === 3 ? 0.35 + 0.65 * Math.max(chua, empty) : 0.55} strokeWidth={i === 3 ? 3 : 2} strokeDasharray={i === 3 ? "7 6" : undefined} />
            {i < 3 ? <Sitter x={s.x} y={s.y} turn={s.turn} o={show(i)} /> : null}
          </g>
        ))}
        {/* Chua's place card on the table, in front of the empty chair */}
        <g opacity={chua}>
          <rect x={910} y={624} width={100} height={26} fill="#e9e3d6" />
          <text x={960} y={643} textAnchor="middle" fontFamily={DOC_FONT} fontWeight={700} fontSize={16} letterSpacing="0.1em" fill="#2a2621">A. CHUA</text>
        </g>
        {seats.map((s, i) => <g key={s.name}>{text(s.lx, s.ly + (s.anchor === "middle" ? 0 : -4), s.anchor, s.name, s.role, show(i))}</g>)}
        <text x={900} y={772} textAnchor="end" fontFamily={DOC_FONT} fontWeight={600} fontSize={18} letterSpacing="0.14em" fill={RED} opacity={empty}>NEVER ATTENDED A BOARD MEETING</text>
        {/* the man behind the name */}
        <path d={`M${1000} ${712} C 1150 760, 1300 820, ${pua.x - 50} ${pua.y}`} fill="none" stroke={RED} strokeWidth={2.5} strokeDasharray="10 8" strokeDashoffset={0} opacity={truth} />
        <text x={1190} y={808} textAnchor="middle" fontFamily={DOC_FONT} fontWeight={600} fontSize={18} letterSpacing="0.14em" fill={RED} opacity={truth}>A NOMINEE, THE COURT FOUND</text>
        <Sitter x={pua.x} y={pua.y} turn={-70} o={truth} />
        {text(pua.x, pua.y - 92, "middle", "Serafin Pua", "Executive committee · beneficial owner", truth)}
        </g>
      </svg>
      <div style={{ position: "absolute", left: 0, width: 1920, top: 118, textAlign: "center", opacity: clamp(t / 0.8) }}>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 52, color: "#f2ede4", letterSpacing: "0.06em" }}>WESTWOOD ENTERTAINMENT CO., INC.</div>
        <div style={{ ...label, fontSize: 19, marginTop: 6 }}>Set up in 1990 to run the Ozone Disco · Court of Appeals, CA-G.R. CV No. 80583, 2005</div>
      </div>
      <Mark text="Illustration" />
    </Paper>
  );
}

// ── Real photographs ─────────────────────────────────────────────────────────────────────────────────

/** A real photo filling the frame, moved slowly (`move`: [x, y, zoom] from → to, x and y 0 … 1 of the image), graded like
 *  the rest of the record. `box` rings a detail in the photo (image fractions) as `boxed` goes 0 … 1: the evidence the
 *  line is about. `credit` sits bottom left, `tag` top left (what and when). */
export function Photo({ src, size, move, k, box, boxed = 0, credit, tag }: { src: string; size: { width: number; height: number }; move: Move; k: number; box?: { x0: number; y0: number; x1: number; y1: number }; boxed?: number; credit: string; tag: string }) {
  const frame = { width: 1920, height: 1080 };
  const { scale, tx, ty } = coverTransform(size, frame, moveAt(move, k));
  const at = (x: number, y: number): [number, number] => [tx + x * size.width * scale, ty + y * size.height * scale];
  const b = box ? [...at(box.x0, box.y0), ...at(box.x1, box.y1)] : null;
  const e = clamp(boxed);
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: size.width * scale, height: size.height * scale, transform: `translate(${tx}px, ${ty}px)`, filter: "contrast(1.05) saturate(0.78) brightness(0.94)" }} />
      <Grade />
      {b ? (
        <svg width={1920} height={1080} style={{ position: "absolute" }}>
          <defs>
            <mask id="spot"><rect width={1920} height={1080} fill="#fff" /><rect x={b[0] - 14} y={b[1] - 12} width={b[2] - b[0] + 28} height={b[3] - b[1] + 24} rx={6} fill="#000" /></mask>
          </defs>
          <rect width={1920} height={1080} fill="#000" opacity={0.5 * e} mask="url(#spot)" />
          <rect x={b[0] - 14} y={b[1] - 12} width={b[2] - b[0] + 28} height={b[3] - b[1] + 24} rx={6} fill="none" stroke={AMBER} strokeWidth={3} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - e} />
        </svg>
      ) : null}
      <div style={{ ...label, position: "absolute", left: 56, top: 50, fontSize: 21, color: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.4)", padding: "5px 12px 4px" }}>{tag}</div>
      <div style={{ ...label, position: "absolute", left: 56, bottom: 44, fontSize: 15, color: "rgba(255,255,255,0.6)", textShadow: "0 1px 3px #000" }}>{credit}</div>
    </AbsoluteFill>
  );
}

// ── Chapter 2 and 3: the papers, the findings, studies on the plan ───────────────────────────────────

/** The papers that let the club open, drawn as plain forms (never the real documents, whose look we don't have), each
 *  sliding in at `in` and stamped at `at` (seconds into the shot). `note` is a line written on a sheet at `noteAt`.
 *  `focus` dims the others by `dim`. */
export type Sheet = { title: string; sub: string; stamp: string; in: number; at: number; note?: string; noteAt?: number };
export function PaperStack({ t, sheets, focus = -1, dim = 0 }: { t: number; sheets: Sheet[]; focus?: number; dim?: number }) {
  const n = sheets.length, w = Math.min(520, 1560 / n + 110), h = w * 1.3, step = n > 1 ? (1560 - w) / (n - 1) : 0;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #1e1b17 0%, #0a0908 75%)" }}>
      {sheets.map((s, i) => {
        const o = clamp((t - s.in) / 0.5), st = clamp((t - s.at) / 0.18), fo = focus < 0 || focus === i ? 1 : 0.35;
        const x = 180 + i * step + (n === 1 ? (1560 - w) / 2 : 0), y = 130 + (i % 2) * 34 + (1 - o) * 60;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: h, background: "linear-gradient(#eee8db, #e2dccd)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", transform: `rotate(${-3 + ((i * 37) % 7)}deg)`, opacity: o * (1 - dim * (1 - fo)), padding: w * 0.08, boxSizing: "border-box" }}>
            <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: w * 0.075, color: "#2a2620", letterSpacing: "0.04em", lineHeight: 1.1, textTransform: "uppercase" }}>{s.title}</div>
            <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: w * 0.036, color: "#6b6357", letterSpacing: "0.1em", marginTop: w * 0.025, textTransform: "uppercase" }}>{s.sub}</div>
            {Array.from({ length: 9 }, (_, k) => <div key={k} style={{ height: w * 0.016, width: `${[92, 80, 88, 70, 95, 60, 85, 75, 50][k]}%`, background: "rgba(60,54,46,0.18)", marginTop: w * 0.045 }} />)}
            {s.note ? <div style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: w * 0.06, color: "#23201b", marginTop: w * 0.06, opacity: clamp((t - (s.noteAt ?? 0)) / 0.4) }}>{s.note}</div> : null}
            <div style={{ position: "absolute", right: w * 0.08, bottom: w * 0.1, border: `${w * 0.008}px solid rgba(190,40,34,0.85)`, borderRadius: w * 0.02, padding: `${w * 0.015}px ${w * 0.03}px`, fontFamily: DOC_FONT, fontWeight: 800, fontSize: w * 0.07, letterSpacing: "0.08em", color: "rgba(190,40,34,0.85)", transform: `rotate(-9deg) scale(${1 + 0.6 * (1 - st)})`, opacity: st, textTransform: "uppercase", textAlign: "center", lineHeight: 1.05 }}>{s.stamp}</div>
          </div>
        );
      })}
      <Mark text="Illustration · not the actual documents" />
    </AbsoluteFill>
  );
}

/** What the record found, typed as a checklist: each item's verdict stamps in red at `at` (seconds into the shot). */
export function Checklist({ t, title, items, source }: { t: number; title: string; items: { item: string; found: string; at: number }[]; source: string }) {
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1b1a18 0%, #0a0a09 75%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1180, padding: "64px 100px 58px", background: "linear-gradient(#efe9dc, #e6dfcf)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", transform: "rotate(0.5deg)", marginTop: -90 }}>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 22, letterSpacing: "0.2em", color: "#6b6357", marginBottom: 26, textTransform: "uppercase" }}>{title}</div>
        {items.map((it) => {
          const k = clamp((t - it.at) / 0.25);
          return (
            <div key={it.item} style={{ display: "flex", alignItems: "baseline", borderBottom: "1px solid rgba(60,54,46,0.25)", padding: "14px 0" }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 42, color: "#23201b", flex: 1 }}>{it.item}</div>
              <div style={{ fontFamily: DOC_FONT, fontWeight: 800, fontSize: 38, letterSpacing: "0.08em", color: "#b8261f", opacity: k, transform: `scale(${1 + 0.4 * (1 - k)})`, textTransform: "uppercase" }}>{it.found}</div>
            </div>
          );
        })}
        <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 19, letterSpacing: "0.12em", color: "#6b6357", marginTop: 30, textTransform: "uppercase" }}>{source}</div>
      </div>
    </AbsoluteFill>
  );
}

/** The plan with one thing studied on it: `dims` (its size, 0 … 1), `exit` (the fire exit and the building next door that
 *  blocked it, 0 … 1; `differ` adds where it may have led), `corridor` (the way in, lit), `path` (someone's way in, drawn as
 *  `k` goes 0 … 1), `group` (a knot of friends on the dance floor; `lost` 0 … 1 dims all but the first). */
export function PlanStudy({ people = 0, dims = 0, exit = 0, differ = 0, corridor = 0, red = 1, path, group, push = 0 }: { people?: number; dims?: number; exit?: number; differ?: number; corridor?: number; red?: number; path?: { pts: [number, number][]; k: number }; group?: { at: [number, number]; n: number; show: number; lost: number }; push?: number }) {
  const [ax, ay] = P(0, 0), [bx, by] = P(W, D);
  const lab = { fontFamily: DOC_FONT, fontWeight: 600, letterSpacing: "0.16em" } as const;
  // The path: walked at an even pace along its segments.
  let trail = "", dot: [number, number] | null = null;
  if (path) {
    const seg = path.pts.slice(1).map((p, i) => Math.hypot(p[0] - path.pts[i][0], p[1] - path.pts[i][1]));
    let left = seg.reduce((a, b) => a + b, 0) * clamp(path.k);
    const pts: [number, number][] = [path.pts[0]];
    for (let i = 0; i < seg.length && left > 0; i++) {
      const f = Math.min(1, left / seg[i]), a = path.pts[i], b = path.pts[i + 1];
      pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      left -= seg[i];
    }
    trail = pts.map((p) => P(...p).join(",")).join(" ");
    dot = P(...pts[pts.length - 1]);
  }
  const friends = group ? Array.from({ length: group.n }, (_, i) => {
    const r = 0.24 * Math.sqrt(i + 0.3), a = i * 2.39996;
    return P(group.at[0] + r * Math.cos(a), group.at[1] + r * Math.sin(a));
  }) : [];
  return (
    <Paper push={push}>
      <PlanDrawing people={people} red={red} />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <pattern id="nb" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1={0} y1={0} x2={0} y2={10} stroke={RED} strokeOpacity={0.45} strokeWidth={2} /></pattern>
        </defs>
        {dims > 0 ? (
          <g opacity={dims} stroke={AMBER} fill={AMBER} style={lab}>
            <line x1={ax} y1={by + 46} x2={bx} y2={by + 46} strokeWidth={1.5} />
            {[ax, bx].map((x) => <line key={x} x1={x} y1={by + 34} x2={x} y2={by + 58} strokeWidth={1.5} />)}
            <text x={(ax + bx) / 2} y={by + 84} textAnchor="middle" stroke="none" fontSize={22}>ABOUT 20 M</text>
            <line x1={bx + 46} y1={ay} x2={bx + 46} y2={by} strokeWidth={1.5} />
            {[ay, by].map((y) => <line key={y} x1={bx + 34} y1={y} x2={bx + 58} y2={y} strokeWidth={1.5} />)}
            <text x={bx + 70} y={(ay + by) / 2 + 8} stroke="none" fontSize={22}>8 M</text>
            <text x={(ax + bx) / 2} y={ay - 40} textAnchor="middle" stroke="none" fontSize={30} fill="#f2ede4">160 M² · TWO LEVELS</text>
          </g>
        ) : null}
        {corridor > 0 ? (() => { const [x0, y0] = P(HALL.x0, 0), [x1, y1] = P(HALL.x1, HALL.z1); return <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={AMBER} fillOpacity={0.16 * corridor} stroke={AMBER} strokeOpacity={0.8 * corridor} strokeWidth={2} />; })() : null}
        {exit > 0 ? (() => {
          const [x0, y0] = P(-2.3, 13.6), [x1, y1] = P(-0.14, 18.2), [ex, ey] = P(0, 15.8);
          return (
            <g opacity={exit}>
              <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={PAPER} />
              <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="url(#nb)" stroke={RED} strokeOpacity={0.7} />
              <text x={(x0 + x1) / 2} y={y0 + 30} textAnchor="middle" fill={RED} fontSize={19} style={lab}>NEW BUILDING NEXT DOOR</text>
              <path d={`M${ex - 24} ${ey - 24} L${ex + 24} ${ey + 24} M${ex + 24} ${ey - 24} L${ex - 24} ${ey + 24}`} stroke={RED} strokeWidth={5} />
              <g opacity={differ} fill="#f2ede4" fontSize={19} style={lab} textAnchor="end">
                <text x={x0 - 18} y={y0 + 30}>A KITCHEN? (FLIPSCIENCE)</text>
                <text x={x0 - 18} y={y0 + 58}>A WOMEN&apos;S RESTROOM? (REPORTS, 1996)</text>
              </g>
            </g>
          );
        })() : null}
        {path ? (
          <g>
            <polyline points={trail} fill="none" stroke={AMBER} strokeWidth={4} strokeDasharray="2 9" strokeLinecap="round" />
            {dot ? <><circle cx={dot[0]} cy={dot[1]} r={18} fill={AMBER} fillOpacity={0.25} /><circle cx={dot[0]} cy={dot[1]} r={8} fill={AMBER} /></> : null}
          </g>
        ) : null}
        {group ? friends.map(([x, y], i) => {
          const o = clamp(group.show * group.n - i), gone = i === 0 ? 0 : clamp(group.lost * 1.6 - (i / group.n) * 0.6);
          return <circle key={i} cx={x} cy={y} r={i === 0 ? 8 : 6.5} fill={i === 0 ? AMBER : "#f4f1ea"} fillOpacity={o * (1 - 0.92 * gone)} stroke="#f4f1ea" strokeOpacity={i === 0 ? 0 : 0.55 * o} />;
        }) : null}
      </svg>
      <Mark text="Illustration" />
    </Paper>
  );
}

/** The tag (what and when) and credit of a real picture shown some other way than `Photo` (a print, a clip). */
export function Credit({ tag, credit }: { tag: string; credit: string }) {
  return (
    <>
      <div style={{ ...label, position: "absolute", left: 56, top: 50, fontSize: 21, color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.4)", padding: "5px 12px 4px" }}>{tag}</div>
      <div style={{ ...label, position: "absolute", left: 56, bottom: 44, fontSize: 15, color: "rgba(255,255,255,0.6)" }}>{credit}</div>
    </>
  );
}

// ── People, the press, dates, diagrams ───────────────────────────────────────────────────────────────

/** Two numbers set against each other: `big` first, `small` arriving at `k2` 0 … 1. */
export function Numbers({ k, k2 }: { k: number; k2: number }) {
  const a = clamp(k / 0.4), b = clamp(k2);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #15191d 0%, #07090b 75%)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 180 }}>
      <div style={{ textAlign: "center", opacity: a }}>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 800, fontSize: 300, lineHeight: 0.9, color: AMBER }}>{Math.round(390 * clamp(k / 0.7) ** 0.6)}</div>
        <div style={{ ...label, fontSize: 30, color: AMBER, marginTop: 18 }}>Inside that night</div>
      </div>
      <div style={{ width: 3, height: 360, background: "rgba(255,255,255,0.25)", opacity: b }} />
      <div style={{ textAlign: "center", opacity: b, transform: `translateY(${(1 - b) * 20}px)` }}>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 800, fontSize: 300, lineHeight: 0.9, color: "#f4f1ea" }}>35</div>
        <div style={{ ...label, fontSize: 30, marginTop: 18 }}>Approved</div>
      </div>
    </AbsoluteFill>
  );
}

/** Real portraits in a row of frames, each arriving in turn (`k` 0 … 1), its name under it and a small credit. */
export function PortraitWall({ k, people, title, note }: { k: number; people: { name: string; src: string; credit: string; pos?: string }[]; title: string; note: string }) {
  const n = people.length, cols = Math.ceil(n / 2), w = 330, h = 330, gap = 36;
  const x0 = (1920 - (cols * w + (cols - 1) * gap)) / 2;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1c1712 0%, #070605 75%)" }}>
      <div style={{ ...label, position: "absolute", left: 0, width: 1920, top: 48, textAlign: "center", fontSize: 24, color: AMBER }}>{title}</div>
      {people.map((p, i) => {
        const o = clamp(k * n * 1.2 - i), col = i % cols, row = Math.floor(i / cols);
        return (
          <div key={p.name} style={{ position: "absolute", left: x0 + col * (w + gap), top: 110 + row * (h + 92), width: w, opacity: o, transform: `translateY(${(1 - o) * 14}px)` }}>
            <div style={{ width: w, height: h, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: p.pos ?? "50% 25%", filter: "saturate(0.8) contrast(1.05)" }} />
            </div>
            <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 30, color: "#f2ede4", marginTop: 10 }}>{p.name}</div>
            <div style={{ ...label, fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2, letterSpacing: "0.08em" }}>{p.credit}</div>
          </div>
        );
      })}
      <div style={{ ...label, position: "absolute", left: 56, bottom: 44, fontSize: 15, color: "rgba(255,255,255,0.5)" }}>{note}</div>
    </AbsoluteFill>
  );
}

/** A real person: their photo large on the right (cropped at `pos`, pushed in slowly by `k`), their name and what they
 *  were on the left, and optionally their words typed beside them (`quote`, typed as `typed` goes 0 … 1). */
export function Portrait({ src, k, pos = "50% 30%", zoom = 1, name, role, credit, tag, quote, typed = 1, box = { w: 820, h: 900 } }: { src: string; k: number; pos?: string; zoom?: number; name: string; role: string; credit: string; tag: string; quote?: string; typed?: number; box?: { w: number; h: number } }) {
  const o = clamp(k * 6), shown = quote ? quote.slice(0, Math.round(quote.length * clamp(typed))) : "";
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 70% 45%, #1a1d21 0%, #07080a 70%)" }}>
      <div style={{ position: "absolute", right: 100, top: (1080 - box.h) / 2 - 20, width: box.w, height: box.h, overflow: "hidden", opacity: o, boxShadow: "0 30px 80px rgba(0,0,0,0.7)" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, transform: `scale(${zoom * (1 + 0.05 * k)})`, transformOrigin: pos, filter: "contrast(1.05) saturate(0.85)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)" }} />
      </div>
      <div style={{ position: "absolute", left: 130, top: quote ? 250 : 400, width: 1920 - box.w - 330, opacity: clamp((k * 6) - 0.5) }}>
        <div style={{ width: 64, height: 4, background: RED, marginBottom: 22 }} />
        <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 76, color: "#f2efe8", lineHeight: 1.02 }}>{name}</div>
        <div style={{ ...label, fontSize: 24, marginTop: 14 }}>{role}</div>
        {quote ? <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 46, lineHeight: 1.35, color: "#efe9dc", marginTop: 54 }}>“{shown}{shown.length < quote.length ? "" : "”"}</div> : null}
      </div>
      <Credit tag={tag} credit={credit} />
    </AbsoluteFill>
  );
}

/** A news report quoted as a clipping in our own type (not a facsimile of the page): the outlet and date, the headline,
 *  the quoted sentence with the words that matter highlighted (`k` types it, the highlight follows). */
export function NewsClip({ k, outlet, date, headline, byline, before, mark, after }: { k: number; outlet: string; date: string; headline: string; byline: string; before: string; mark: string; after: string }) {
  const all = before + mark + after, shown = Math.round(all.length * clamp(k / 0.65)), hl = clamp((k - 0.68) / 0.22);
  const part = (s: string, from: number) => s.slice(0, Math.max(0, shown - from));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1b1a18 0%, #0a0a09 75%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1100, padding: "54px 80px 60px", background: "linear-gradient(#e8e1cf, #ddd5c0)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", transform: `rotate(-1deg) translateY(${(1 - clamp(k * 4)) * 10}px)`, marginTop: -70 }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #3a342a", paddingBottom: 10, fontFamily: DOC_FONT, fontWeight: 700, fontSize: 22, letterSpacing: "0.16em", color: "#3a342a", textTransform: "uppercase" }}><span>{outlet}</span><span>{date}</span></div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 54, lineHeight: 1.1, color: "#1d1a15", marginTop: 26 }}>{headline}</div>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 18, letterSpacing: "0.14em", color: "#6b6357", marginTop: 14, textTransform: "uppercase" }}>{byline}</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 36, lineHeight: 1.45, color: "#23201b", marginTop: 26 }}>
          {part(before, 0)}
          <span style={{ backgroundImage: `linear-gradient(90deg, rgba(240,196,70,0.8) ${hl * 100}%, transparent ${hl * 100}%)` }}>{part(mark, before.length)}</span>
          {part(after, before.length + mark.length)}
        </div>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 15, letterSpacing: "0.14em", color: "#8a8173", marginTop: 26, textTransform: "uppercase" }}>Quoted · set in our type, not the original page</div>
      </div>
    </AbsoluteFill>
  );
}

/** A month on a wall calendar, one day circled in red as `k` goes 0 … 1. March 1996 began on a Friday. */
export function DateCard({ k, month, year, firstWeekday, days, day }: { k: number; month: string; year: number; firstWeekday: number; days: number; day: number }) {
  const cell = 132, x0 = (1920 - 7 * cell) / 2, y0 = 300, circ = clamp((k - 0.3) / 0.5);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1d1b18 0%, #0a0908 75%)" }}>
      <div style={{ position: "absolute", left: x0 - 50, top: 110, width: 7 * cell + 100, height: 800, background: "linear-gradient(#eee8db, #e2dccd)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", transform: "rotate(-0.8deg)" }} />
      <div style={{ position: "absolute", left: x0, top: 150, width: 7 * cell, display: "flex", justifyContent: "space-between", alignItems: "baseline", transform: "rotate(-0.8deg)" }}>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 800, fontSize: 84, color: "#2a2620", letterSpacing: "0.04em" }}>{month.toUpperCase()}</div>
        <div style={{ fontFamily: DOC_FONT, fontWeight: 700, fontSize: 56, color: "#8a8173" }}>{year}</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", transform: "rotate(-0.8deg)" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <text key={i} x={x0 + i * cell + cell / 2} y={y0 - 12} textAnchor="middle" fontFamily={DOC_FONT} fontWeight={700} fontSize={26} fill="#8a8173">{d}</text>)}
        {Array.from({ length: days }, (_, i) => {
          const n = i + 1, slot = firstWeekday + i, cx = x0 + (slot % 7) * cell + cell / 2, cy = y0 + Math.floor(slot / 7) * 96 + 56;
          return <text key={n} x={cx} y={cy} textAnchor="middle" fontFamily={DOC_FONT} fontWeight={n === day ? 800 : 600} fontSize={48} fill={n === day ? "#2a2620" : "#6b6357"}>{n}</text>;
        })}
        {(() => {
          const slot = firstWeekday + day - 1, cx = x0 + (slot % 7) * cell + cell / 2, cy = y0 + Math.floor(slot / 7) * 96 + 40, r = 54;
          return <ellipse cx={cx} cy={cy} rx={r + 8} ry={r - 4} fill="none" stroke="rgba(190,40,34,0.85)" strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - circ} transform={`rotate(-8 ${cx} ${cy})`} />;
        })()}
      </svg>
      <Mark text="Illustration" />
    </AbsoluteFill>
  );
}

/** The inner door from above, close: its leaf has to swing into the room to open, and the room is full of people
 *  pressing the other way. `k` 0 … 1 fills the swing with the crowd and brings the arrows in. */
export function DoorDiagram({ k, t }: { k: number; t: number }) {
  const hx = 760, hy = 400, r = 380, fill = clamp(k / 0.6), arrows = clamp((k - 0.4) / 0.4);
  let rs = 11;
  const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  const dots = Array.from({ length: 150 }, () => [hx - 140 + rnd() * 700, hy + 30 + rnd() * 560] as [number, number]).filter(([x, y]) => Math.hypot(x - hx, y - hy) > 40);
  return (
    <Paper>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* the wall, with the doorway */}
        <rect x={180} y={hy - 12} width={hx - 180} height={24} fill={INK} />
        <rect x={hx + r} y={hy - 12} width={1740 - hx - r} height={24} fill={INK} />
        <text x={hx + r / 2} y={hy - 60} textAnchor="middle" fill={INK} fillOpacity={0.6} fontFamily={DOC_FONT} fontWeight={600} fontSize={22} letterSpacing="0.2em">CORRIDOR · THE WAY OUT</text>
        <text x={hx + r / 2} y={1000} textAnchor="middle" fill={INK} fillOpacity={0.6} fontFamily={DOC_FONT} fontWeight={600} fontSize={22} letterSpacing="0.2em">THE CLUB</text>
        {/* the swing: where the leaf must go to open */}
        <path d={`M${hx} ${hy} L${hx + r} ${hy} A${r} ${r} 0 0 1 ${hx} ${hy + r} Z`} fill={RED} fillOpacity={0.14} />
        <path d={`M${hx + r} ${hy} A${r} ${r} 0 0 1 ${hx} ${hy + r}`} fill="none" stroke={RED} strokeWidth={3} strokeDasharray="12 9" />
        <line x1={hx} y1={hy} x2={hx + r} y2={hy} stroke={RED} strokeWidth={10} />
        <circle cx={hx} cy={hy} r={9} fill={RED} />
        {dots.map(([x, y], i) => <circle key={i} cx={x + Math.sin(t * 2 + i) * 2} cy={y - fill * 26 * (1 - (y - hy) / 600) + Math.cos(t * 2.3 + i) * 2} r={9} fill="#f4f1ea" fillOpacity={0.9 * clamp(fill * 160 / 100 - i / 100)} />)}
        {[0, 1, 2, 3, 4].map((i) => {
          const x = hx + 60 + i * 150, y0 = hy + 330, y1 = hy + 80;
          return <g key={i} opacity={arrows}><line x1={x} y1={y0} x2={x} y2={y1 + 18} stroke={AMBER} strokeWidth={5} /><path d={`M${x - 14} ${y1 + 26} L${x} ${y1} L${x + 14} ${y1 + 26} Z`} fill={AMBER} /></g>;
        })}
        <text x={1500} y={hy + 150} fill={RED} fontFamily={DOC_FONT} fontWeight={700} fontSize={26} letterSpacing="0.12em">TO OPEN, THE DOOR</text>
        <text x={1500} y={hy + 186} fill={RED} fontFamily={DOC_FONT} fontWeight={700} fontSize={26} letterSpacing="0.12em">MUST SWING INTO HERE</text>
        <text x={1500} y={hy + 300} fill={AMBER} fontFamily={DOC_FONT} fontWeight={700} fontSize={26} letterSpacing="0.12em" opacity={arrows}>THE CROWD PUSHES</text>
        <text x={1500} y={hy + 336} fill={AMBER} fontFamily={DOC_FONT} fontWeight={700} fontSize={26} letterSpacing="0.12em" opacity={arrows}>THE OTHER WAY</text>
      </svg>
      <Mark text="Illustration" />
    </Paper>
  );
}

/** Why the smoke killed, as a card: each gas arrives at its time (`a`, `b` 0 … 1) over a slow drift of smoke. */
export function GasCard({ t, a, b }: { t: number; a: number; b: number }) {
  const gas = (o: number, sym: string, name: string, line: string) => (
    <div style={{ width: 640, opacity: o, transform: `translateY(${(1 - o) * 16}px)` }}>
      <div style={{ fontFamily: DOC_FONT, fontWeight: 800, fontSize: 200, lineHeight: 0.9, color: "#f4f1ea" }}>{sym}</div>
      <div style={{ ...label, fontSize: 30, color: AMBER, marginTop: 18 }}>{name}</div>
      <div style={{ fontFamily: DOC_FONT, fontWeight: 600, fontSize: 34, color: "rgba(240,236,228,0.85)", marginTop: 16, lineHeight: 1.3 }}>{line}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: "#0b0a09" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", opacity: 0.55 }}>
        <filter id="smog"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.009" numOctaves={4} seed={3} /><feOffset dx={-t * 12} dy={t * 3} /><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.26  0 0 0 1.4 -0.35" /></filter>
        <rect width={1920} height={1080} filter="url(#smog)" />
      </svg>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 160, marginTop: -60 }}>
        {gas(clamp(a), "CO", "Carbon monoxide", "Takes the place of oxygen in the blood.")}
        {gas(clamp(b), "HCN", "Hydrogen cyanide", "From burning foam and fabric. Enough of it kills within minutes.")}
      </AbsoluteFill>
      <div style={{ ...label, position: "absolute", left: 56, bottom: 44, fontSize: 15, color: "rgba(255,255,255,0.5)" }}>Source: FlipScience, “Playing with fire”, 2021</div>
    </AbsoluteFill>
  );
}
