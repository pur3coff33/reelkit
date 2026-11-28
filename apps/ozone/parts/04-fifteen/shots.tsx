// Part 04-fifteen, the picture: the chapter card → the dance floor as the sparks start and the smoke gathers → the section
// with the timer → black when the lights go → the jam in the dark → Jhunie in the crush → the door diagram (it has to
// swing into the crowd) → the handle, the door coming open → the main doors from the pavement, shut → down the corridor
// as the doors open and the fire comes → Bruan's portrait and words → black → Jhunie's portrait (2026) → the empty room,
// the first fire lighting the foam and cartons → the gases → the real doorway, the morning after (AFP).
import { Print } from "../../../../src/kit/doc/Still";
import { AbsoluteFill } from "remotion";
import { ChapterCard, Credit, DoorDiagram, GasCard, Mark, NameTag, Portrait, SectionBoard } from "../../Boards";
import type { Layout } from "../../parts";
import { Black, Shade, type Shot } from "../../PartFilm";
import { Recon } from "../../recon/Recon";
import { R, ease } from "../../recon/poses";
import { events } from "./times";

export function shots(L: Layout): Shot[] {
  const l = L.lines, S = L.spoken, E = events(L);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const smokeAt = (at: number) => 5.3 - 3.3 * ease((at - E.smoke) / 15);
  return [
    { from: 0, to: l.f1, cut: true, draw: (t) => <ChapterCard t={t} n="Four" title="Fifteen Seconds" /> },
    { from: l.f1, to: l.f3, draw: (t, len) => { const at = l.f1 + t; return (<><Recon pose={R.party(t, len, 0.45 * ease((at - E.sparks) / 6), at > E.smoke ? smokeAt(at) : undefined)} /><Mark text="Reconstruction" /></>); } },
    { from: l.f3, to: E.lightsOut, draw: (t) => { const at = l.f3 + t; return <SectionBoard smoke={smokeAt(at)} seconds={clamp((at - E.smoke) / 15) * 15} heat={0.3 + 0.7 * ease((at - E.smoke) / 15)} />; } },
    { from: E.lightsOut, to: l.f6, cut: true, draw: () => <Black /> },
    { from: l.f6, to: l.f7, cut: true, draw: (t, len) => (<><Recon pose={R.jam(t, len)} /><Mark text="Reconstruction" /><Shade o={1 - t / 1.2} /></>) },
    { from: l.f7, to: l.f8, draw: (t, len) => (<><Recon pose={R.crowd(t, len)} /><Mark text="Reconstruction" /><NameTag name="Jhunie Mallari" role="Survivor" t={t} /></>) },
    { from: l.f8, to: l.f9, draw: (t, len) => <DoorDiagram k={t / (len * 0.8)} t={t} /> },
    { from: l.f9, to: E.guards, draw: (t, len) => (<><Recon pose={R.handle(t, len, (l.f9 + t - (E.pulled - 0.3)) / 1.4)} /><Mark text="Reconstruction" /></>) },
    { from: E.guards, to: l.f11, cut: true, draw: (t, len) => (<><Recon pose={R.shut(t, len)} /><Mark text="Reconstruction" /></>) },
    { from: l.f11, to: l.f13, cut: true, draw: (t, len) => { const at = l.f11 + t, r = clamp((at - E.rush) / 1.6); return (<><Recon pose={R.rush(t, len)} /><AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 52%, rgba(255,190,110,${0.95 * Math.sin(Math.PI * r)}) 0%, rgba(255,110,30,${0.7 * Math.sin(Math.PI * r)}) ${20 + 50 * r}%, rgba(0,0,0,0) ${30 + 70 * r}%)`, mixBlendMode: "screen" }} /><Shade o={0.8 * (1 - clamp((at - E.opened) / 0.6))} /><Mark text="Reconstruction" /></>); } },
    { from: l.f13, to: E.crawl, cut: true, draw: (t, len) => <Portrait src="assets/people/sherilyn-bruan-2015.jpg" k={t / (len + 1)} pos="33% 28%" zoom={1.35} box={{ w: 700, h: 760 }} name="Sherilyn Bruan" role="In the hallway · second-degree burns over about 30%" quote="The impact was so strong, everyone in the hallway was hit and fell down." typed={(l.f13 + t - l.f14) / (S.f14 * 0.95)} tag="Sherilyn Bruan · 2015" credit="Photo: GirlandBoyThing, ‘SCARvivors’, 2015 · words: Esquire Philippines, 2017 · used under fair use" /> },
    { from: E.crawl, to: E.jhunie, cut: true, draw: () => <Black /> },
    { from: E.jhunie, to: E.science, cut: true, draw: (t, len) => (<><Portrait src="assets/people/jhunie-mallari-2026.jpg" k={t / (len + 1)} pos="18% 45%" zoom={1.15} box={{ w: 760, h: 760 }} name="Jhunie Mallari" role={l.f16 + t > E.burned ? "Survivor · burns over 46% of the body" : "Survivor · through three doors"} tag="Jhunie Mallari · GMA News ‘i-Listen’, 2026" credit="Photo: GMA News, May 2026 · used under fair use" /><Shade o={(t - (len - 1)) / 1} /></>) },
    { from: E.science, to: l.f19, cut: true, draw: (t, len) => (<><Recon pose={R.materials(t, len)} /><Mark text="Reconstruction · materials as reported" /></>) },
    { from: l.f19, to: E.corridor, draw: (t) => { const at = l.f19 + t; return <GasCard t={t} a={(at - E.co) / 0.6} b={(at - E.hcn) / 0.6} />; } },
    { from: E.corridor, to: L.seconds, cut: true, draw: (t, len) => (<><Print src="assets/afp-1996-doorway.jpg" size={{ width: 660, height: 506 }} k={t / len} /><Credit tag="The doorway · March 1996" credit="Photo: AFP, March 1996 · via INQUIRER.net · used under fair use" /><Shade o={1 - t / 1.5} /><Shade o={(t - (len - 1.5)) / 1.5} /></>) },
  ];
}
