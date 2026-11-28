// Part 02-paper, the picture: the chapter card → Quezon City Hall (a real photo) → the papers sliding in, stamped as
// they're named, "for 35 persons" written on the certificate → the plan, its size, the corridor → the fire exit and the
// building that went up over it, and where it may have led → the inner door swinging in (3D) → the waiter's words as a
// clipping → the
// court's checklist → the 1995 certificate stamped, the prosecutors' words → the owner's certificate, "claimed" → every
// paper stamped → the front, traced, its title block now reading Ozone: the building waiting.
import { ChapterCard, Checklist, Mark, NamesBoard, NewsClip, PaperStack, Photo, PlanStudy, QuoteBoard, type Sheet } from "../../Boards";
import type { Layout } from "../../parts";
import { Shade, type Shot } from "../../PartFilm";
import { Recon } from "../../recon/Recon";
import { R, ease } from "../../recon/poses";
import { events } from "./times";

export function shots(L: Layout): Shot[] {
  const l = L.lines, S = L.spoken, e = events(L);
  const sheets = (from: number): Sheet[] => [
    { title: "Building permit", sub: "Construction · 1991", stamp: "Approved", in: e.papers - from, at: e.stamps[0] - from },
    { title: "Building permit", sub: "Renovation · 1992", stamp: "Approved", in: e.papers + 0.3 - from, at: e.stamps[1] - from },
    { title: "Certificate of occupancy", sub: "Ozone Disco · Timog Avenue", stamp: "Approved", in: e.papers + 0.6 - from, at: e.stamps[2] - from, note: "For 35 persons", noteAt: e.thirtyFive - from },
  ];
  const later = (from: number): Sheet[] => [
    ...sheets(from),
    { title: "Certificate of annual inspection", sub: "1995", stamp: "Approved", in: l.p11 + 0.2 - from, at: e.stamp1995 - from },
    { title: "Fire safety certificate", sub: "Bureau of Fire Protection · as the owner said", stamp: "Claimed", in: l.p12 + S.p12 * 0.4 - from, at: e.claimed - from },
  ];
  return [
    { from: 0, to: l.p1, cut: true, draw: (t) => <ChapterCard t={t} n="Two" title="The Paper" /> },
    { from: l.p1, to: e.papers, draw: (t, len) => <Photo src="assets/qc-hall-2021.jpg" size={{ width: 2700, height: 2026 }} move={{ from: [0.5, 0.45, 1.0], to: [0.52, 0.38, 1.12] }} k={t / (len + 0.6)} tag="Quezon City Hall · 2021" credit="Photo: patrickroque01, 2021, CC BY-SA 4.0 · Wikimedia Commons" /> },
    { from: e.papers, to: l.p4, draw: (t) => <PaperStack t={t} sheets={sheets(e.papers)} focus={e.papers + t > l.p3 ? 2 : -1} dim={ease((e.papers + t - l.p3) / 0.8)} /> },
    { from: l.p4, to: l.p5, draw: (t) => <PlanStudy dims={ease(t / 1.2)} corridor={ease((l.p4 + t - e.corridor) / 0.8)} push={t / 20} /> },
    { from: l.p5, to: l.p7, draw: (t) => <PlanStudy exit={ease((l.p5 + t - e.blocked) / 0.8)} differ={ease((l.p5 + t - l.p6 - S.p6 * 0.35) / 0.8)} push={t / 30} /> },
    { from: l.p7, to: l.p8, cut: true, draw: (t, len) => (<><Recon pose={R.door(t, len, t / (len * 0.8))} /><Mark text="Reconstruction · illustrative layout" /></>) },
    { from: l.p8, to: l.p10, draw: (t, len) => <NewsClip k={Math.min(1, t / len)} outlet="Philippine Daily Inquirer" date="22 November 2014" headline="Nightclub door that trapped fire victims supposedly ‘good feng shui’" byline="Jaymee T. Gamil · quoting former waiter Gerald Loyola" before="“… good feng shui… " mark="It would bring the money in" after=".”" /> },
    { from: l.p10, to: l.p11, draw: (t) => <Checklist t={t} title="What the record found" source="Quezon City trial court, 16 March 2001 · investigators, March 1996" items={[{ item: "Sprinklers", found: "None", at: e.verdicts[0] - l.p10 }, { item: "Fire extinguishers", found: "Defective", at: e.verdicts[1] - l.p10 }, { item: "Fire exit", found: "Blocked", at: e.verdicts[2] - l.p10 }, { item: "Doors", found: "Swing inward", at: e.verdicts[3] - l.p10 }]} /> },
    { from: l.p11, to: e.quote1995, draw: (t) => <PaperStack t={t} sheets={later(l.p11).slice(3, 4)} /> },
    { from: e.quote1995, to: l.p12, draw: (t, len) => <QuoteBoard k={Math.min(1, t / (len * 0.85))} before="“… despite the " mark="inadequacy, insufficiency and impropriety" after=" …”" kicker="Quoted from the charges" source="Charges filed before the Sandiganbayan, November 2001 (as quoted on Wikipedia)" /> },
    { from: l.p12, to: e.crowd, draw: (t, len) => <PaperStack t={t} sheets={later(l.p12)} focus={l.p12 + t < l.p13 ? 4 : -1} dim={l.p12 + t < l.p13 ? ease(t / 0.8) : 1 - ease((l.p12 + t - l.p13) / 0.6)} /> },
    { from: e.crowd, to: L.seconds, draw: (t, len) => (<><NamesBoard t={t + 6} names={[{ name: "Birds of the Same Feather", year: "1978" }, { name: "Birdland", year: "1986" }, { name: "Ozone", year: "1991" }]} /><Shade o={(t - (len - 1.2)) / 1.2} /></>) },
  ];
}
