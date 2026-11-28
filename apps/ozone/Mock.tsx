// The look boards: one still per kind of picture the film uses (ozone-boards), to judge the look without rendering a part.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DateLine, DocCaptions, loadDocFonts } from "../../src/kit/doc/Text";
import { ChapterCard, MapBoard, Mark, NameTag, PlanBoard, QuoteBoard, SectionBoard, TitleCard, WarningCard } from "./Boards";
import { Recon } from "./recon/Recon";
import { R } from "./recon/poses";

export const loadOzone = async () => {
  await loadDocFonts();
  return {};
};

const caption = (text: string) => <DocCaptions cues={[{ at: 0, to: 9, text }]} t={1} />;
export const BOARDS: (() => ReactNode)[] = [
  () => <WarningCard t={3} />,
  () => (<><Recon pose={R.street(3, 9)} /><Mark text="Reconstruction" /><DateLine text="Timog Avenue, Quezon City · Monday, 18 March 1996" t={2} to={9} /></>),
  () => <MapBoard k={1} />,
  () => (<><PlanBoard k={1} />{caption("It had been approved for 35.")}</>),
  () => (<><Recon pose={R.model(2, 8)} /><Mark text="Reconstruction · illustrative layout" /></>),
  () => (<><Recon pose={R.party(2, 6)} /><Mark text="Reconstruction" />{caption("Most of them were students, celebrating the end of the school year.")}</>),
  () => <PlanBoard k={1} flow={1} />,
  () => (<><Recon pose={R.arc(4, 6)} /><Mark text="Reconstruction · illustrative layout" />{caption("It opened inward.")}</>),
  () => <TitleCard t={3} />,
  () => <ChapterCard t={3} n="Four" title="Fifteen Seconds" />,
  () => <SectionBoard smoke={2.5} seconds={11} heat={0.7} />,
  () => (<><Recon pose={R.party(3, 6, 0.55, 3.0)} /><Mark text="Reconstruction" />{caption("On the dance floor, people saw the smoke and thought it was part of the show.")}</>),
  () => (<><Recon pose={R.jam(2, 6)} /><Mark text="Reconstruction" /></>),
  () => (<><Recon pose={R.crowd(3, 6)} /><Mark text="Reconstruction" /><NameTag name="Jhunie Mallari" role="Survivor · had just finished high school" t={3} /></>),
  () => (<><Recon pose={R.handle(4, 6, 1)} /><Mark text="Reconstruction" />{caption("Everyone around her was pushing. She found the handle, and pulled.")}</>),
  () => <QuoteBoard k={1} before="“There can never be a " mark="slapdash approval" after=" of a building permit and certificate of occupancy.”" source="Sandiganbayan, Fifth Division · November 2014" />,
];

export function OzoneBoards() {
  loadDocFonts();
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#000" }}>{BOARDS[Math.min(f, BOARDS.length - 1)]()}</AbsoluteFill>;
}
