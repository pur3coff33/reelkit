// Part 01-birdland, the picture: the chapter card → the real building in 2008, shuttered → its front traced off the photo,
// the title block naming what it was (Birds of the Same Feather, then Birdland) → Birdland's sign lit, the people who sang
// there going up on it, the turned-away count → the bulbs dying on "the jazz stopped" → Westwood as a board table, a chair
// for each name, Chua's left empty → the court's words ("good luck") → the man behind the empty chair → the refit going
// in → the dance floor → the scout streets lit on the map → the plan filling to its legal 35.
import { BoardTable, ChapterCard, MapBoard, Mark, MarqueeBoard, NamesBoard, Photo, PlanBoard, PortraitWall, QuoteBoard } from "../../Boards";
import { lightsOut } from "../../marquee";
import type { Layout } from "../../parts";
import { Shade, type Shot } from "../../PartFilm";
import { Recon, camAt } from "../../recon/Recon";
import { R, ease } from "../../recon/poses";

const BIRDS = { name: "Birds of the Same Feather", year: "1978" };
const BIRDLAND = { name: "Birdland", year: "1986" };
/** Who sang at Birdland (Philstar, 2010). */
const SANG = ["Regine Velasquez", "Ogie Alcasid", "Gary Valenciano", "Janno Gibbs", "Jamie Rivera", "Gino Padilla", "Lee Ritenour", "David Benoit", "Ramsey Lewis"];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** Their faces, from Wikimedia Commons (licence and author on each). Janno Gibbs has no free photo. */
const FACES = [
  { name: "Regine Velasquez", src: "assets/people/regine-velasquez.jpg", credit: "Rex Martin Gabriel · CC BY-SA 2.0" },
  { name: "Ogie Alcasid", src: "assets/people/ogie-alcasid.jpg", credit: "NCCA Philippines · public domain" },
  { name: "Gary Valenciano", src: "assets/people/gary-valenciano.jpg", credit: "001Jrm · CC BY-SA 3.0", pos: "50% 15%" },
  { name: "Jamie Rivera", src: "assets/people/jamie-rivera.jpg", credit: "J42K · CC BY 2.0" },
  { name: "Gino Padilla", src: "assets/people/gino-padilla.jpg", credit: "TheGreatMobistarMusicTV · CC BY 3.0", pos: "50% 20%" },
  { name: "Lee Ritenour", src: "assets/people/lee-ritenour.jpg", credit: "Henryk Kotowski · CC BY-SA 3.0" },
  { name: "David Benoit", src: "assets/people/david-benoit.jpg", credit: "Werner Nieke · CC BY-SA 2.0" },
  { name: "Ramsey Lewis", src: "assets/people/ramsey-lewis.jpg", credit: "KPLU Radio · CC BY-SA 2.0" },
];

export function shots(L: Layout): Shot[] {
  const l = L.lines, S = L.spoken;
  const out = lightsOut(l.b6, S.b6), wall = l.b5 + S.b5 * 0.44;
  // The memorial line's three beats: "the roundabout outside… a memorial to 24 scouts", "killed in a plane crash…", "the streets…".
  const m1 = l.b14 + S.b14 * 0.2, m2 = l.b14 + S.b14 * 0.4, m3 = l.b14 + S.b14 * 0.73;
  // The front: the photo alone for b0, the lines traced over it as b1 begins, the photo gone by the end of b1.
  const front = (T: number) => {
    const t = T - l.b0;
    const photo = 1 - clamp((T - (l.b1 + 1.6)) / 2.2), draw = clamp((T - (l.b1 - 0.4)) / 2.6);
    const names = T < l.b2 ? [] : T < l.b4 ? [BIRDS] : [BIRDS, BIRDLAND];
    const note = T < l.b4 ? [{ text: "A jazz lounge", at: l.b2 + 1 - l.b0 }, { text: "Owner: Serafin Pua", at: l.b3 + 1.2 - l.b0 }] : [{ text: "Three times the size of Birds", at: l.b4 + 2.4 - l.b0 }];
    return <NamesBoard t={t} photo={photo} draw={draw} names={names} note={note} head={{ kicker: "Timog Avenue, Quezon City", big: "May 2008", sub: "Twelve years after the fire" }} />;
  };
  return [
    { from: 0, to: l.b0, cut: true, draw: (t) => <ChapterCard t={t} n="One" title="Birdland" /> },
    { from: l.b0, to: l.b5, draw: (t) => front(l.b0 + t) },
    // "Some of the biggest names in Filipino music sang there": their faces (Wikimedia Commons), then the sign.
    { from: l.b5, to: wall, cut: true, draw: (t, len) => <PortraitWall k={t / (len * 0.75)} people={FACES} title="Who played Birdland" note="Photos: Wikimedia Commons, used under their licences (CC BY, CC BY-SA, public domain) · names: The Philippine Star, 2010" /> },
    {
      from: wall, to: l.b7, cut: true,
      draw: (t, len) => {
        const T = wall + t, half = l.b5 + S.b5 * 0.46;
        return (<><MarqueeBoard names={SANG} shown={clamp((T - wall) / 1.2)} turned={clamp((T - half) / 2.2)} off={clamp((T - out.from) / out.len)} /><Shade o={(t - (len - 0.9)) / 0.9} /></>);
      },
    },
    { from: l.b7, to: l.b10, draw: (t) => <BoardTable t={t} at={[l.b8 + 1.0 - l.b7, l.b8 + 3.0 - l.b7, l.b8 + 3.6 - l.b7, l.b9 + 4.6 - l.b7]} /> },
    { from: l.b10, to: l.b11, draw: (t, len) => <QuoteBoard k={Math.min(1, t / (len * 0.75))} before="“Since Pua is his brother-in-law and purportedly the use of his name would be “" mark="good luck" after="”, Chua acceded to this request.”" source="Court of Appeals · Chua v. Pua · 25 October 2005" /> },
    { from: l.b11, to: l.b12, draw: (t, len) => <BoardTable t={t + 30} at={[0, 0, 0, 0]} truth={ease(t / (len * 0.6))} /> },
    { from: l.b12, to: l.b13, draw: (t, len) => (<><Recon pose={{ mode: "study", t, cut: 0.15 + 2.25 * ease(t / (len * 0.45)), mezz: ease((t - len * 0.45) / (len * 0.4)), people: 0, cam: camAt([{ at: 0, pos: [15.5, 12.5, -0.5], look: [4, 0.6, 11], fov: 36 }, { at: len, pos: [13.5, 10.5, 1.5], look: [4, 0.8, 11.5], fov: 36 }], t) }} /><Mark text="Reconstruction · illustrative layout" /></>) },
    { from: l.b13, to: l.b14, draw: (t, len) => (<><Recon pose={R.mezz(t, len)} /><Mark text="Reconstruction" /></>) },
    // The memorial, in real photographs: the roundabout from above → the bronze scouts round its base → the plaque's words
    // (the crash, the date, the jamboree) ringed as they're said → the streets named after them lit on the map.
    { from: l.b14, to: m1, draw: (t, len) => <Photo src="assets/scout-circle-2009.jpg" size={{ width: 2700, height: 1800 }} move={{ from: [0.58, 0.52, 1.0], to: [0.6, 0.62, 1.18] }} k={t / (len + 0.6)} tag="Scout Memorial Circle · 2009" credit="Photo: Richmond Chi, 2009, CC BY-SA 4.0 · Wikimedia Commons" /> },
    { from: m1, to: m2, draw: (t, len) => <Photo src="assets/scout-monument.jpg" size={{ width: 2055, height: 2742 }} move={{ from: [0.5, 0.8, 1.0], to: [0.5, 0.86, 1.16] }} k={t / (len + 0.6)} tag="The memorial" credit="Photo: Anonymous742621, CC BY-SA 4.0 · Wikimedia Commons" /> },
    { from: m2, to: m3, draw: (t, len) => <Photo src="assets/scout-plaque-2016.jpg" size={{ width: 3000, height: 2250 }} move={{ from: [0.5, 0.3, 1.2], to: [0.5, 0.15, 1.4] }} k={t / (len + 0.6)} box={{ x0: 0.2, y0: 0.105, x1: 0.81, y1: 0.195 }} boxed={(t - 0.8) / 1.4} tag="The dedication plaque · 2016" credit="Photo: Judgefloro, 2016, public domain · Wikimedia Commons" /> },
    { from: m3, to: l.b15, draw: (t, len) => <MapBoard k={Math.min(1, t / (len * 0.85))} scouts={ease(t / 1.2)} /> },
    { from: l.b15, to: L.seconds, draw: (t, len) => (<><PlanBoard k={0.33 * ease(t / (len * 0.75))} /><Shade o={(t - (len - 1.2)) / 1.2} /></>) },
  ];
}
