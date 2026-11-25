// SIM-03, asteroid impact: tracking in orbit → atmospheric entry → the fireball over the city → impact, crater and
// ejecta → the shockwave through the city → the scar from orbit and the summary.
import { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { add, projector, scale, type V3 } from "../../src/kit/lowpoly/engine";
import { Alert, Callout, EndCard, Flash, Frame, Graph, HUD, HUD_FONT, Header, Marker, Overlay, Panel, PhaseBar, fmt } from "../../src/kit/lowpoly/Hud";
import { SimCanvas } from "../../src/kit/lowpoly/SimCanvas";
import { ENTRY, GROUND, IMPACT, IMPACT_AT, IMPACT_DIR, IMPACT_POINT, ORBIT, asteroidFrame, asteroidPos, fireballPos, readouts, shockAtCity, shockRadius, trace } from "./sim";

type Proj = ReturnType<typeof projector>;

/** The predicted path, dashed, from the asteroid to the impact point. */
function Trajectory({ proj, t }: { proj: Proj; t: number }) {
  if (t >= GROUND) return null;
  const A = asteroidPos(t);
  const pts = Array.from({ length: 24 }, (_, i): V3 => add(scale(A, 1 - i / 23), scale(IMPACT_POINT, i / 23)))
    .map((p) => proj(p))
    .filter((p) => p.visible)
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <polyline points={pts} fill="none" stroke={HUD.red} strokeWidth={3} strokeDasharray="14 12" opacity={0.85} style={{ filter: `drop-shadow(0 0 6px ${HUD.red})` }} />
    </svg>
  );
}

/** The feed dying as the dust wall hits the camera. */
function SignalLost({ t, frame }: { t: number; frame: number }) {
  const hit = shockAtCity();
  if (t < hit - 0.2 || t >= ORBIT) return null;
  const dust = interpolate(t, [hit - 0.2, hit + 0.5], [0, 0.92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const jitter = (frame * 37) % 19;
  return (
    <AbsoluteFill style={{ background: `rgba(92,66,46,${dust})` }}>
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 3px, transparent 3px 7px)", transform: `translateY(${jitter}px)` }} />
      {t > hit + 0.4 ? (
        <div style={{ position: "absolute", top: 900, width: "100%", textAlign: "center", fontFamily: HUD_FONT, fontSize: 84, fontWeight: 700, letterSpacing: 10, color: HUD.red, opacity: frame % 8 < 5 ? 1 : 0.3, textShadow: `0 0 20px ${HUD.red}` }}>
          SIGNAL LOST
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

export function AsteroidReel() {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const frame = useMemo(() => asteroidFrame(t), [t]);
  const proj = projector(frame.camera, width, height);
  const r = readouts(t);
  const s = (sec: number) => Math.round(sec * fps);
  const appear = (from: number) => Math.min(1, Math.max(0, (t - from) / 0.4));
  const hit = t >= IMPACT;
  const inOrbit = t < GROUND || t >= ORBIT;
  const S = shockRadius(t);
  const shockFront: V3 = [IMPACT_AT[0] + 0, 4, IMPACT_AT[2] + S];

  return (
    <AbsoluteFill style={{ background: "#02080e" }}>
      <SimCanvas frame={frame} width={width} height={height} />
      <Trajectory proj={proj} t={t} />
      <Overlay frame={f} tint={hit ? HUD.amber : HUD.cyan} />
      <Flash frame={f} at={s(IMPACT)} peak={1} decay={16} />
      <Flash frame={f} at={s(GROUND)} peak={0.5} decay={6} color="#ffd9a0" />

      {t < GROUND ? <Marker at={proj(asteroidPos(t))} label="2026 XR" sub={`${fmt(r.distKm)} KM`} tone={t > ENTRY ? "red" : "amber"} appear={appear(0.3)} size={90} /> : null}
      {t >= 5.5 && t < GROUND ? <Marker at={proj(add(IMPACT_POINT, scale(IMPACT_DIR, 0.6)))} label="IMPACT ZONE" sub="PROBABILITY 99.98%" tone="red" appear={appear(5.9)} side="left" lift={-140} /> : null}
      {t >= GROUND && t < IMPACT ? <Marker at={proj(fireballPos(t))} label="FIREBALL" sub={`${r.v.toFixed(1)} KM/S`} tone="red" appear={appear(GROUND + 0.4)} side="left" /> : null}
      {t >= IMPACT + 0.8 && t < 18.5 ? <Marker at={proj([IMPACT_AT[0], 2, IMPACT_AT[2]])} label="CRATER" sub="Ø 22 KM" tone="amber" appear={appear(IMPACT + 1)} lift={-140} /> : null}
      {t >= 16.5 && t < shockAtCity() - 0.4 ? <Marker at={proj(shockFront)} label="SHOCKWAVE" sub={`${fmt(r.shockKmh)} KM/H`} tone="red" appear={appear(16.8)} side="left" /> : null}
      {t >= ORBIT + 0.4 && t < 26.5 ? <Marker at={proj(scale(IMPACT_DIR, 31))} label="IMPACT SITE" sub="DUST PLUME SPREADING" tone="amber" appear={appear(ORBIT + 0.6)} /> : null}

      <Header code="SIM-03" title="ASTEROID IMPACT" region="OBJECT 2026 XR · Ø 1.4 KM" simSeconds={t * 90} frame={f} accent={hit ? HUD.amber : HUD.cyan} />
      <Panel
        x={60}
        y={520}
        w={480}
        title={hit ? "BLAST" : "TRACKING"}
        tone={hit ? "red" : t > ENTRY ? "amber" : "cyan"}
        appear={appear(0.2)}
        rows={
          hit
            ? [
                { k: "SHOCKWAVE", v: fmt(r.shockKmh), unit: "KM/H", tone: "red" },
                { k: "BLAST RADIUS", v: r.shockKm.toFixed(1), unit: "KM", tone: "amber" },
                { k: "TOWERS DOWN", v: `${r.down}/${r.towers}`, tone: r.down ? "red" : "white" },
              ]
            : [
                { k: t < GROUND ? "DISTANCE" : "ALTITUDE", v: fmt(r.distKm), unit: "KM" },
                { k: "VELOCITY", v: r.v.toFixed(1), unit: "KM/S", tone: t > ENTRY ? "amber" : "white" },
                { k: "IMPACT IN", v: `${String(Math.floor(r.tti / 60)).padStart(2, "0")}:${String(Math.floor(r.tti % 60)).padStart(2, "0")}`, tone: r.tti < 300 ? "red" : "white" },
              ]
        }
      />
      <Panel
        x={590}
        y={520}
        w={430}
        title="OBJECT"
        tone="amber"
        align="right"
        appear={appear(0.4)}
        rows={[
          { k: "DIAMETER", v: "1.4", unit: "KM" },
          { k: "MASS", v: "3.7e12", unit: "KG" },
          { k: "ENERGY", v: "200K", unit: "MT", tone: "red" },
        ]}
      />
      <Graph x={590} y={790} w={430} h={110} label={hit ? "SEISMIC" : "LIGHT CURVE"} values={trace(t)} min={-1.2} max={1.2} tone={hit ? "red" : "cyan"} appear={appear(0.6)} />

      <Callout text="IMPACT" sub="200,000 MEGATONS" frame={f} start={s(IMPACT + 0.2)} end={s(18)} fps={fps} tone="amber" y={1010} />
      <Alert text="IMPACT TRAJECTORY CONFIRMED" frame={f} start={s(1)} end={s(4.6)} y={1320} tone="amber" />
      <Alert text="ATMOSPHERIC ENTRY" frame={f} start={s(ENTRY - 1)} end={s(GROUND - 0.1)} y={1320} />
      <Alert text="SHOCKWAVE INBOUND" frame={f} start={s(18.6)} end={s(shockAtCity() - 0.2)} y={1320} />
      {!inOrbit || t < 26.5 ? (
        <PhaseBar
          t={t}
          total={30}
          tone={hit ? "amber" : "cyan"}
          phases={[
            { at: 0, label: "APPROACH" },
            { at: ENTRY, label: "ENTRY" },
            { at: IMPACT, label: "IMPACT" },
            { at: 18.5, label: "SHOCKWAVE" },
            { at: ORBIT, label: "AFTERMATH" },
          ]}
        />
      ) : null}
      <SignalLost t={t} frame={f} />
      <Frame color={hit ? HUD.amber : HUD.cyan} />
      <EndCard
        frame={f}
        start={s(26.5)}
        fps={fps}
        index="03 / 03"
        title="IMPACT"
        tone="amber"
        stats={[
          { k: "ENERGY", v: "200,000 MT" },
          { k: "CRATER", v: "22 KM" },
          { k: "BLAST RADIUS", v: "60 KM" },
          { k: "TOWERS DOWN", v: `${r.down}/${r.towers}` },
        ]}
      />
      <Audio src={staticFile("out/music.wav")} />
    </AbsoluteFill>
  );
}
