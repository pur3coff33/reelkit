// SIM-01, tsunami: epicentre → the wave crossing the ocean → the sea drawing back → the wave over the town → summary.
import { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { projector, type V3 } from "../../src/kit/lowpoly/engine";
import { Alert, Callout, EndCard, Flash, Frame, Graph, HUD, Header, Marker, Overlay, Panel, PhaseBar, fmt } from "../../src/kit/lowpoly/Hud";
import { SimCanvas } from "../../src/kit/lowpoly/SimCanvas";
import { ARRIVE, QUAKE, crestPoint, readouts, seismo, tideGauge, tsunamiFrame } from "./sim";

/** The rupture drawn on the sea: the fault line and rings spreading from it, projected from the 3D view. */
function Rupture({ proj, t }: { proj: ReturnType<typeof projector>; t: number }) {
  if (t < QUAKE || t > 7) return null;
  const line = (pts: V3[]) =>
    pts
      .map((p) => proj(p))
      .filter((p) => p.visible)
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
  const fault = line(Array.from({ length: 30 }, (_, i): V3 => [-100 + Math.sin(i * 1.7) * 0.8, 0.3, -45 + i * 3]));
  const fade = Math.min(1, (7 - t) / 1.5);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fade }}>
      <polyline points={fault} fill="none" stroke={HUD.red} strokeWidth={5} strokeDasharray="18 10" style={{ filter: `drop-shadow(0 0 8px ${HUD.red})` }} />
      {[0, 0.7, 1.4].map((delay) => {
        const age = t - QUAKE - delay;
        if (age < 0) return null;
        const R = age * 14;
        const ring = line(Array.from({ length: 49 }, (_, i): V3 => [-100 + R * Math.cos((i / 48) * Math.PI * 2), 0.4, R * Math.sin((i / 48) * Math.PI * 2)]));
        return <polyline key={delay} points={ring} fill="none" stroke={HUD.amber} strokeWidth={3} opacity={Math.max(0, 1 - age / 4)} />;
      })}
    </svg>
  );
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function TsunamiReel() {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const frame = useMemo(() => tsunamiFrame(t), [t]);
  const proj = projector(frame.camera, width, height);
  const r = readouts(t);
  const quaked = t >= QUAKE;
  const arrived = t >= ARRIVE;
  const s = (sec: number) => Math.round(sec * fps);
  const appear = (from: number) => Math.min(1, Math.max(0, (t - from) / 0.4));
  const tide = tideGauge(t);

  return (
    <AbsoluteFill style={{ background: "#02080e" }}>
      <SimCanvas frame={frame} width={width} height={height} />
      <Overlay frame={f} />
      <Rupture proj={proj} t={t} />
      <Flash frame={f} at={s(QUAKE)} peak={0.3} decay={8} />
      <Flash frame={f} at={s(ARRIVE)} peak={0.45} decay={10} />

      {t < 4 ? <Marker at={proj([-100, 0, 0])} label="EPICENTER" sub="M9.1 · DEPTH 24 KM" tone="red" appear={appear(QUAKE + 0.3)} /> : null}
      {t >= 4 && t < 9 ? <Marker at={proj(crestPoint(t))} label="WAVE FRONT" sub={`${fmt(r.speed)} KM/H`} appear={appear(4.3)} side="left" /> : null}
      {t >= 9 && t < 15 ? <Marker at={proj([12, 2, 0])} label="COASTAL TOWN" sub="POP. 12,400" tone="cyan" appear={appear(9.3)} /> : null}
      {t >= 15 && t < 19.5 ? <Marker at={proj(crestPoint(t))} label="CREST" sub={`${r.heightM.toFixed(1)} M`} tone="red" appear={appear(15.4)} side="left" lift={-160} /> : null}
      {t >= 19.5 && t < 26 ? <Marker at={proj(crestPoint(t))} label="INUNDATION LINE" sub={`${r.inundation.toFixed(2)} KM INLAND`} tone="amber" appear={appear(20)} /> : null}

      <Header code="SIM-01" title="TSUNAMI" region="SUBDUCTION ZONE · 120 KM OFFSHORE" simSeconds={t * 60} frame={f} />
      <Panel
        x={60}
        y={520}
        w={480}
        title="WAVE TRACK"
        appear={appear(0.2)}
        rows={[
          { k: "SPEED", v: quaked ? fmt(r.speed) : "---", unit: "KM/H" },
          { k: "HEIGHT", v: quaked ? r.heightM.toFixed(1) : "---", unit: "M", tone: r.heightM > 8 ? "red" : r.heightM > 3 ? "amber" : "white" },
          arrived ? { k: "INLAND", v: r.inundation.toFixed(2), unit: "KM", tone: "amber" } : { k: "TO COAST", v: quaked ? fmt(r.distKm) : "---", unit: "KM" },
          { k: "ETA", v: arrived ? "IMPACT" : quaked ? mmss(r.etaSim) : "---", tone: arrived ? "red" : r.etaSim < 300 ? "amber" : "white" },
        ]}
      />
      <Panel
        x={590}
        y={520}
        w={430}
        title="SEISMIC"
        tone={quaked ? "red" : "cyan"}
        align="right"
        appear={appear(0.4)}
        rows={[
          { k: "MAGNITUDE", v: quaked ? "9.1" : "0.4", unit: "Mw", tone: quaked ? "red" : "white" },
          { k: "DEPTH", v: "24", unit: "KM" },
          { k: "BUILDINGS HIT", v: `${r.hits}/${r.houses}`, tone: r.hits ? "red" : "white" },
        ]}
      />
      {t < 9 ? (
        <Graph x={590} y={790} w={430} h={110} label="SEISMOGRAPH" values={seismo(t)} min={-1.2} max={1.2} tone={quaked ? "red" : "cyan"} appear={appear(0.6)} />
      ) : (
        <Graph x={590} y={790} w={430} h={110} label="TIDE GAUGE · BEACH" readout={`${tide[tide.length - 1] >= 0 ? "+" : ""}${(tide[tide.length - 1] * 3).toFixed(1)} M`} values={tide} min={-3} max={7} tone={tide[tide.length - 1] < -0.6 ? "amber" : "cyan"} />
      )}

      <Callout text="M 9.1" sub="MEGATHRUST EARTHQUAKE" frame={f} start={s(QUAKE)} end={s(3.8)} fps={fps} tone="red" y={1000} />
      <Callout text="18 M" sub="WAVE HEIGHT AT SHORE" frame={f} start={s(17.5)} end={s(19.4)} fps={fps} y={1000} />
      <Alert text="TSUNAMI WARNING ISSUED" frame={f} start={s(4.5)} end={s(8.6)} y={1320} />
      <Alert text="SEA RECEDING · EVACUATE NOW" frame={f} start={s(12)} end={s(15)} y={1320} tone="amber" />
      <Alert text="COASTLINE BREACHED" frame={f} start={s(19.6)} end={s(24)} y={1320} />
      <PhaseBar
        t={t}
        total={30}
        phases={[
          { at: 0, label: "RUPTURE" },
          { at: 4, label: "OPEN OCEAN" },
          { at: 12, label: "DRAWBACK" },
          { at: ARRIVE, label: "INUNDATION" },
          { at: 26.5, label: "AFTERMATH" },
        ]}
      />
      <Frame />
      <EndCard
        frame={f}
        start={s(26.5)}
        fps={fps}
        index="01 / 03"
        title="TSUNAMI"
        stats={[
          { k: "PEAK WAVE", v: "18.0 M" },
          { k: "ARRIVAL", v: "T+19 MIN" },
          { k: "REACHED INLAND", v: "2.6 KM" },
          { k: "BUILDINGS HIT", v: `${r.hits}/${r.houses}` },
        ]}
      />
      <Audio src={staticFile("out/music.wav")} />
    </AbsoluteFill>
  );
}
