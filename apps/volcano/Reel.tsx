// SIM-02, volcanic eruption: the swelling summit → the blast and the column → lava and the pyroclastic flow → the
// village → the umbrella cloud and the summary.
import { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { projector, type V3 } from "../../src/kit/lowpoly/engine";
import { Alert, Callout, EndCard, Flash, Frame, Graph, HUD, Header, Marker, Overlay, Panel, PhaseBar, fmt } from "../../src/kit/lowpoly/Hud";
import { SimCanvas } from "../../src/kit/lowpoly/SimCanvas";
import { rng } from "../../src/kit/lowpoly/world";
import { ERUPT, LIGHTNING, PYRO, PYRO_DIR, columnTop, ground, lavaFront, pyroReach, readouts, seismo, volcanoFrame } from "./sim";

/** Volcanic lightning: jagged bolts inside the ash column, projected from the 3D view. */
function Lightning({ proj, t }: { proj: ReturnType<typeof projector>; t: number }) {
  const i = LIGHTNING.findIndex((l) => t >= l && t < l + 0.2);
  if (i < 0) return null;
  const r = rng(i * 31 + 7);
  const a: V3 = [(r() - 0.5) * 16, 24 + columnTop(t) * (0.55 + r() * 0.3), (r() - 0.5) * 16];
  const b: V3 = [a[0] + (r() - 0.5) * 22, 24 + columnTop(t) * (0.15 + r() * 0.2), a[2] + (r() - 0.5) * 10];
  const pa = proj(a), pb = proj(b);
  if (!pa.visible || !pb.visible) return null;
  const pts: string[] = [];
  for (let k = 0; k <= 9; k++) {
    const f = k / 9;
    const jx = k === 0 || k === 9 ? 0 : (r() - 0.5) * 60;
    pts.push(`${(pa.x + (pb.x - pa.x) * f + jx).toFixed(1)},${(pa.y + (pb.y - pa.y) * f).toFixed(1)}`);
  }
  const alpha = t < LIGHTNING[i] + 0.12 ? 1 : 0.35;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: alpha }}>
      <polyline points={pts.join(" ")} fill="none" stroke="#e9e6ff" strokeWidth={5} style={{ filter: "drop-shadow(0 0 10px #a99cff) drop-shadow(0 0 22px #ffffff)" }} />
    </svg>
  );
}

export function VolcanoReel() {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const frame = useMemo(() => volcanoFrame(t), [t]);
  const proj = projector(frame.camera, width, height);
  const r = readouts(t);
  const erupted = t >= ERUPT;
  const s = (sec: number) => Math.round(sec * fps);
  const appear = (from: number) => Math.min(1, Math.max(0, (t - from) / 0.4));
  const reach = pyroReach(t);
  const pyroAt: V3 = [reach * Math.cos(PYRO_DIR), 0, reach * Math.sin(PYRO_DIR)];
  pyroAt[1] = ground(pyroAt[0], pyroAt[2], t) + 4;

  return (
    <AbsoluteFill style={{ background: "#02080e" }}>
      <SimCanvas frame={frame} width={width} height={height} />
      <Lightning proj={proj} t={t} />
      <Overlay frame={f} tint={erupted ? HUD.amber : HUD.cyan} />
      <Flash frame={f} at={s(ERUPT)} peak={0.75} decay={9} color="#fff2dc" />
      {LIGHTNING.map((l) => (
        <Flash key={l} frame={f} at={s(l)} peak={0.18} decay={3} color="#e8e4ff" />
      ))}

      {t < 3.5 ? <Marker at={proj([0, 27, 0])} label="STRATOVOLCANO" sub="SUMMIT 3,240 M" tone="cyan" appear={appear(0.6)} /> : null}
      {t >= 3.5 && t < ERUPT ? <Marker at={proj([0, 25.5, 0])} label="SUMMIT BULGE" sub={`+${r.bulgeM.toFixed(2)} M`} tone={r.bulgeM > 1 ? "red" : "amber"} appear={appear(3.9)} side="left" /> : null}
      {t >= ERUPT + 1 && t < PYRO ? <Marker at={proj([0, 24 + columnTop(t), 0])} label="ERUPTION COLUMN" sub={`${r.colKm.toFixed(1)} KM`} tone="red" appear={appear(ERUPT + 1.2)} lift={-120} /> : null}
      {t >= PYRO && t < 19 ? <Marker at={proj(pyroAt)} label="PYROCLASTIC FLOW" sub="480 KM/H · 700 °C" tone="red" appear={appear(PYRO + 0.5)} side="left" /> : null}
      {t >= PYRO && t < 19 ? <Marker at={proj(lavaFront(0, t))} label="LAVA FRONT" sub={`${r.toVillageKm.toFixed(1)} KM TO VILLAGE`} tone="amber" appear={appear(PYRO + 1)} /> : null}
      {t >= 19 && t < 24.5 ? <Marker at={proj([33, 4, 2])} label="VILLAGE" sub="POP. 3,200" tone="cyan" appear={appear(19.3)} lift={-150} /> : null}

      <Header code="SIM-02" title="VOLCANIC ERUPTION" region="STRATOVOLCANO · SUBDUCTION ARC" simSeconds={t * 120} frame={f} accent={erupted ? HUD.amber : HUD.cyan} />
      <Panel
        x={60}
        y={520}
        w={480}
        title="VOLCANO STATUS"
        tone={erupted ? "red" : "amber"}
        appear={appear(0.2)}
        rows={[
          { k: "ALERT", v: erupted ? "WARNING" : t > 4 ? "WATCH" : "ADVISORY", tone: erupted ? "red" : "amber" },
          { k: "COLUMN", v: erupted ? r.colKm.toFixed(1) : "0.0", unit: "KM", tone: r.colKm > 10 ? "red" : "white" },
          { k: "SO₂ FLUX", v: fmt(r.so2), unit: "T/D" },
          { k: "LAVA", v: erupted ? "1,150" : "---", unit: "°C", tone: erupted ? "amber" : "white" },
        ]}
      />
      <Panel
        x={590}
        y={520}
        w={430}
        title="IMPACT"
        tone={r.lost ? "red" : "cyan"}
        align="right"
        appear={appear(0.4)}
        rows={[
          { k: "TO VILLAGE", v: r.toVillageKm.toFixed(1), unit: "KM", tone: r.toVillageKm < 2 ? "red" : "white" },
          { k: "PYRO FLOW", v: r.pyroKm.toFixed(1), unit: "KM", tone: r.pyroKm > 0 ? "red" : "white" },
          { k: "BUILDINGS", v: `${r.lost}/${r.houses}`, tone: r.lost ? "red" : "white" },
        ]}
      />
      <Graph x={590} y={790} w={430} h={110} label="TREMOR · RSAM" readout={fmt(r.tremor)} values={seismo(t)} min={-1.2} max={1.2} tone={erupted ? "red" : "amber"} appear={appear(0.6)} />

      <Callout text="ERUPTION" sub="VEI 5 · PLINIAN" frame={f} start={s(ERUPT)} end={s(11.2)} fps={fps} tone="amber" y={1010} />
      <Alert text="SEISMIC SWARM · 340 QUAKES/HR" frame={f} start={s(1.5)} end={s(4.6)} y={1320} tone="amber" />
      <Alert text="SUMMIT INFLATING · ERUPTION IMMINENT" frame={f} start={s(5.2)} end={s(ERUPT - 0.1)} y={1320} />
      <Alert text="PYROCLASTIC FLOW DETECTED" frame={f} start={s(PYRO + 0.3)} end={s(18.5)} y={1320} />
      <Alert text="LAVA ENTERING VILLAGE" frame={f} start={s(20.5)} end={s(24.3)} y={1320} />
      <PhaseBar
        t={t}
        total={30}
        tone={erupted ? "amber" : "cyan"}
        phases={[
          { at: 0, label: "UNREST" },
          { at: ERUPT, label: "PLINIAN ERUPTION" },
          { at: PYRO, label: "PYROCLASTIC FLOW" },
          { at: 19, label: "LAVA INUNDATION" },
          { at: 26.5, label: "ASHFALL" },
        ]}
      />
      <Frame color={erupted ? HUD.amber : HUD.cyan} />
      <EndCard
        frame={f}
        start={s(26.5)}
        fps={fps}
        index="02 / 03"
        title="ERUPTION"
        tone="amber"
        stats={[
          { k: "ASH COLUMN", v: "18.4 KM" },
          { k: "LAVA FLOWS", v: "3" },
          { k: "PYROCLASTIC RUNOUT", v: "15.5 KM" },
          { k: "BUILDINGS LOST", v: `${r.lost}/${r.houses}` },
        ]}
      />
      <Audio src={staticFile("out/music.wav")} />
    </AbsoluteFill>
  );
}
