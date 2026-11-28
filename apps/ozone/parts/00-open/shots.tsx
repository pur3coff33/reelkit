// Part 00-open, the picture: Timog at night → the map and the 2008 photo → 390 against 35 → the white model full → the crowd flowing to the
// door → the door study → black under "162 people never came home" → the title.
import { DateLine } from "../../../../src/kit/doc/Text";
import { MapBoard, Mark, Numbers, PlanBoard, TitleCard } from "../../Boards";
import type { Layout } from "../../parts";
import { Black, Shade, type Shot } from "../../PartFilm";
import { Recon } from "../../recon/Recon";
import { R, ease } from "../../recon/poses";

export function shots(L: Layout): Shot[] {
  const l = L.lines;
  // The street holds only until the line reaches "a disco on Timog Avenue": the map takes it from there.
  const toMap = l.o1 + 3.4;
  return [
    { from: 0, to: toMap, cut: true, draw: (t, len) => (<><Recon pose={R.street(t, len + 3)} /><Mark text="Reconstruction" /><DateLine text="Timog Avenue, Quezon City · Monday, 18 March 1996" t={t - 1.2} to={l.o1 - 0.6} /><Shade o={1 - t / 2.5} /></>) },
    { from: toMap, to: l.o2, draw: (t, len) => <MapBoard k={Math.min(1, t / (len * 0.8))} /> },
    { from: l.o2, to: l.o3, cut: true, draw: (t, len) => <Numbers k={1} k2={(t - 0.5) / 0.8} /> },
    { from: l.o3, to: l.o4, draw: (t, len) => (<><Recon pose={R.model(t, len)} /><Mark text="Reconstruction · illustrative layout" /></>) },
    { from: l.o4, to: l.o5, draw: (t, len) => <PlanBoard k={1} flow={ease(t / (len * 0.9))} red={ease((t - 0.5) / 1.5)} /> },
    { from: l.o5, to: l.o6, cut: true, draw: (t, len) => (<><Recon pose={R.arc(t, len)} /><Mark text="Reconstruction · illustrative layout" /></>) },
    { from: l.o6, to: L.end, cut: true, draw: () => <Black /> },
    { from: L.end, to: L.seconds, cut: true, draw: (t, len) => (<><TitleCard t={t} /><Shade o={(t - (len - 1)) / 1} /></>) },
  ];
}
