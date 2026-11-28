// Part 03-graduation, the picture: the chapter card → March 1996 on a calendar, the 18th circled → UPI's words on the
// promotion as a clipping → Sherilyn Bruan's portrait (2015) → her way in drawn on the plan → the packed floor from the
// DJ booth back to the door (3D) → Jhunie Mallari's portrait at the site (2015) → Jhunie's knot of friends on the floor,
// seventeen dimming → the plan filling from 35 to 390.
import { ChapterCard, DateCard, Mark, NewsClip, PlanBoard, PlanStudy, Portrait } from "../../Boards";
import type { Layout } from "../../parts";
import { Shade, type Shot } from "../../PartFilm";
import { Recon } from "../../recon/Recon";
import { R, ease } from "../../recon/poses";
import { BRUAN_PATH, events } from "./times";

export function shots(L: Layout): Shot[] {
  const l = L.lines, S = L.spoken, e = events(L);
  return [
    { from: 0, to: l.g1, cut: true, draw: (t) => <ChapterCard t={t} n="Three" title="Graduation Night" /> },
    { from: l.g1, to: l.g3, draw: (t, len) => <DateCard k={t / 2.4} month="March" year={1996} firstWeekday={5} days={31} day={18} /> },
    { from: l.g3, to: l.g4, draw: (t, len) => <NewsClip k={Math.min(1, t / (len * 0.9))} outlet="UPI" date="20 March 1996" headline="Manila fire causes disco phobia" byline="Abe de Ramos" before="“The majority of victims in the Ozone fire were high school students who took advantage of the disco's " mark="50 percent discount promotion" after=" on entrance fees and drinks to celebrate graduation.”" /> },
    { from: l.g4, to: l.g5, draw: (t, len) => <Portrait src="assets/people/sherilyn-bruan-2015.jpg" k={t / (len + 1)} pos="10% 45%" zoom={1.32} box={{ w: 860, h: 760 }} name="Sherilyn Bruan" role="18 in 1996 · survivor" tag="Sherilyn Bruan · 2015" credit="Photo: GirlandBoyThing, ‘SCARvivors’, 2015 · used under fair use" /> },
    { from: l.g5, to: l.g6, draw: (t) => <PlanStudy path={{ pts: BRUAN_PATH, k: ease((l.g5 + t - e.walk.from) / e.walk.len) }} push={t / 25} /> },
    { from: l.g6, to: l.g7, draw: (t, len) => (<><Recon pose={R.reverse(t, len)} /><Mark text="Reconstruction" /></>) },
    { from: l.g7, to: l.g8, draw: (t, len) => <Portrait src="assets/people/jhunie-mallari-2015.jpg" k={t / (len + 1)} pos="50% 30%" box={{ w: 640, h: 857 }} name="Jhunie Mallari" role="Just out of high school in 1996 · survivor" tag="Jhunie Mallari at the site · 2015" credit="Photo: Rappler, March 2015 · used under fair use" /> },
    { from: l.g8, to: l.g9, draw: (t) => <PlanStudy group={{ at: [3.9, 13.2], n: 18, show: ease((t - 0.2) / 1.2), lost: ease((l.g8 + t - e.lost) / 2.2) }} push={t / 25} /> },
    { from: l.g9, to: L.seconds, draw: (t, len) => (<><PlanBoard k={0.33 + 0.67 * ease((l.g9 + t - e.count.from) / e.count.len)} /><Shade o={(t - (len - 0.6)) / 0.6} /></>) },
  ];
}
