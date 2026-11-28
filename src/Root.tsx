// Every app's reel, registered for Remotion. Each renders with its own app folder as the public dir
// (npm run render -- <app>), so a composition's staticFile("out/…") reads that app's pipeline output.
import { Composition, staticFile } from "remotion";
import { CallmaskReel, loadLato, type CallmaskData } from "../apps/callmask/Reel";
import { config as callmask } from "../apps/callmask/reel.config";
import { FixtmanReel, loadFixtmanFonts, type FixtmanData } from "../apps/fixtman/Reel";
import { config as fixtman } from "../apps/fixtman/reel.config";
import { FixtmanProsReel } from "../apps/fixtman-pros/Reel";
import { config as fixtmanPros } from "../apps/fixtman-pros/reel.config";
import { FixtmanPartnersReel } from "../apps/fixtman-partners/Reel";
import { config as fixtmanPartners } from "../apps/fixtman-partners/reel.config";
import type { AdData } from "../apps/fixtman/ad";
import { KopitReel, type KopitData } from "../apps/kopit/Reel";
import { config as kopit } from "../apps/kopit/reel.config";
import type { Cue } from "../apps/leadsales/app";
import { LeadSalesReel, type LeadSalesData } from "../apps/leadsales/Reel";
import { config as leadsales } from "../apps/leadsales/reel.config";
import { loadNunito, loadReelData } from "./kit/remotion/base";
import { TsunamiReel } from "../apps/tsunami/Reel";
import { config as tsunami } from "../apps/tsunami/reel.config";
import { VolcanoReel } from "../apps/volcano/Reel";
import { config as volcano } from "../apps/volcano/reel.config";
import { AsteroidReel } from "../apps/asteroid/Reel";
import { config as asteroid } from "../apps/asteroid/reel.config";
import { SantelmoReel, loadCormorant, loadSantelmoData, type SantelmoData } from "../apps/santelmo/Reel";
import { config as santelmo } from "../apps/santelmo/reel.config";
import { TyphoonReel, loadBarlow } from "../apps/typhoon/Reel";
import { config as typhoon } from "../apps/typhoon/reel.config";
import { SpaceTest } from "../apps/typhoon/SpaceTest";
import { KalakasReel, loadKalakasFonts } from "../apps/kalakas/Reel";
import { config as kalakas } from "../apps/kalakas/reel.config";
import { FalloutReel, loadFalloutFonts } from "../apps/fallout/Reel";
import { config as fallout } from "../apps/fallout/reel.config";
import { Saf44Reel, loadSaf44Fonts } from "../apps/saf44/Reel";
import { AiReel } from "../apps/whatif-ai/Reel";
import { config as whatifAi } from "../apps/whatif-ai/reel.config";
import { BlackoutReel } from "../apps/whatif-blackout/Reel";
import { GoneReel } from "../apps/whatif-gone/Reel";
import { config as whatifGone } from "../apps/whatif-gone/reel.config";
import { config as whatifBlackout } from "../apps/whatif-blackout/reel.config";
import { loadWhatIfFonts } from "./kit/whatif/Reel";
import { FloodReel } from "../apps/whatif-flood/Reel";
import { config as whatifFlood } from "../apps/whatif-flood/reel.config";
import { BaleteReel } from "../apps/whatif-balete/Reel";
import { config as whatifBalete } from "../apps/whatif-balete/reel.config";
import { SummitReel } from "../apps/whatif-summit/Reel";
import { config as whatifSummit } from "../apps/whatif-summit/reel.config";
import { LostReel } from "../apps/whatif-lost/Reel";
import { config as whatifLost } from "../apps/whatif-lost/reel.config";
import { LightningReel } from "../apps/whatif-lightning/Reel";
import { config as whatifLightning } from "../apps/whatif-lightning/reel.config";
import { LOOK as OCEAN_LOOK, OceanReel } from "../apps/ocean-bluewhale/Reel";
import { config as oceanBluewhale } from "../apps/ocean-bluewhale/reel.config";
import { LOOKS } from "../apps/looks/Reel";
import { config as looks } from "../apps/looks/reel.config";
import { LookFilm, loadLookFonts } from "./kit/looks/Film";
import { STILLS as STRANGERS_STILLS, StrangersReel, loadStrangers } from "../apps/strangers/Reel";
import { config as strangers } from "../apps/strangers/reel.config";
import { COMPARE as PORCHLIGHT_COMPARE, FILM as PORCHLIGHT, LOWPOLY as PORCHLIGHT_LOWPOLY, LOWPOLY_STILLS as PORCHLIGHT_LP_STILLS, PREVIEW as PORCHLIGHT_PREVIEW, STILLS as PORCHLIGHT_STILLS } from "../apps/porchlight/Reel";
import { config as porchlight } from "../apps/porchlight/reel.config";
import { FILM as PASKO, STILLS as PASKO_STILLS } from "../apps/pasko/Reel";
import { config as pasko } from "../apps/pasko/reel.config";
import { STYLE_FRAMES as PASKO_STYLE_FRAMES, stylePaint as paskoStyles } from "../apps/pasko/styles";
import { CosmicEggReel, STILLS as EGG_STILLS } from "../apps/cosmic-egg/Reel";
import { config as cosmicEgg } from "../apps/cosmic-egg/reel.config";
import { MOCKS as EGG_MOCKS, MOCK_STILLS as EGG_MOCK_STILLS } from "../apps/cosmic-egg/mocks";
import { MIX as EGG_MIX, MIX_STILLS as EGG_MIX_STILLS } from "../apps/cosmic-egg/mix";
import { config as saf44 } from "../apps/saf44/reel.config";
import { MOCK_STILLS as MIDDLE_MOCKS, MiddleReel, REVIEW_STILLS as MIDDLE_REVIEW, STILLS as MIDDLE_STILLS, loadMiddle } from "../apps/middle/Reel";
import { config as middle } from "../apps/middle/reel.config";
import { MOCK_STILLS as UNDER_MOCKS, REVIEW_STILLS as UNDER_REVIEW, STILLS as UNDER_STILLS, UnderneathReel, loadUnderneath } from "../apps/underneath/Reel";
import { config as underneath } from "../apps/underneath/reel.config";
import { LOOK_AT as PINATUBO_LOOK, PinatuboReel, loadPinatubo } from "../apps/pinatubo/Reel";
import { config as pinatubo } from "../apps/pinatubo/reel.config";
import { FILMS as OZONE_FILMS } from "../apps/ozone/films";
import { BOARDS as OZONE_BOARDS, OzoneBoards, loadOzone } from "../apps/ozone/Mock";
import { PartFilm as OzonePart } from "../apps/ozone/PartFilm";
import { ORDER as OZONE_PARTS } from "../apps/ozone/parts";
import { config as ozone } from "../apps/ozone/reel.config";

// The disaster sims are drawn from code alone: no props, no pipeline JSON (only out/music.wav).
const SIMS = [
  { config: tsunami, component: TsunamiReel },
  { config: volcano, component: VolcanoReel },
  { config: asteroid, component: AsteroidReel },
];

const WHATIF = [
  { config: whatifAi, component: AiReel },
  { config: whatifBlackout, component: BlackoutReel },
  { config: whatifGone, component: GoneReel },
  { config: whatifFlood, component: FloodReel },
  { config: whatifBalete, component: BaleteReel },
  { config: whatifSummit, component: SummitReel },
  { config: whatifLost, component: LostReel },
  { config: whatifLightning, component: LightningReel },
  { config: oceanBluewhale, component: OceanReel },
];

export function Root() {
  return (
    <>
      <Composition
        id="kopit"
        component={KopitReel}
        width={kopit.width}
        height={kopit.height}
        fps={kopit.fps}
        durationInFrames={kopit.seconds * kopit.fps}
        defaultProps={{} as KopitData}
        calculateMetadata={async () => {
          await loadNunito();
          return { props: (await loadReelData({ note: "out/note.json" })) as KopitData };
        }}
      />
      <Composition
        id="fixtman"
        component={FixtmanReel}
        width={fixtman.width}
        height={fixtman.height}
        fps={fixtman.fps}
        durationInFrames={fixtman.seconds * fixtman.fps}
        defaultProps={{} as FixtmanData}
        calculateMetadata={async () => {
          await loadFixtmanFonts();
          return { props: (await loadReelData({})) as FixtmanData };
        }}
      />
      <Composition
        id="fixtman-pros"
        component={FixtmanProsReel}
        width={fixtmanPros.width}
        height={fixtmanPros.height}
        fps={fixtmanPros.fps}
        durationInFrames={fixtmanPros.seconds * fixtmanPros.fps}
        defaultProps={{} as AdData}
        calculateMetadata={async () => {
          await loadFixtmanFonts();
          return { props: (await loadReelData({})) as AdData };
        }}
      />
      <Composition
        id="fixtman-partners"
        component={FixtmanPartnersReel}
        width={fixtmanPartners.width}
        height={fixtmanPartners.height}
        fps={fixtmanPartners.fps}
        durationInFrames={fixtmanPartners.seconds * fixtmanPartners.fps}
        defaultProps={{} as AdData}
        calculateMetadata={async () => {
          await loadFixtmanFonts();
          return { props: (await loadReelData({})) as AdData };
        }}
      />
      <Composition
        id="callmask"
        component={CallmaskReel}
        width={callmask.width}
        height={callmask.height}
        fps={callmask.fps}
        durationInFrames={callmask.seconds * callmask.fps}
        defaultProps={{} as CallmaskData}
        calculateMetadata={async () => {
          // Drawn, not captured, and no music: the voice is the only pipeline output it reads.
          await loadLato();
          const res = await fetch(staticFile("out/voice.json"));
          if (!res.ok) throw new Error("out/voice.json is missing: run npm run voice -- callmask first");
          return { props: { voice: (await res.json()) as CallmaskData["voice"] } };
        }}
      />
      <Composition
        id="leadsales"
        component={LeadSalesReel}
        width={leadsales.width}
        height={leadsales.height}
        fps={leadsales.fps}
        durationInFrames={leadsales.seconds * leadsales.fps}
        defaultProps={{} as LeadSalesData}
        calculateMetadata={async () => {
          // Its length is the recording's, since the capture paces itself to the voice.
          await loadNunito();
          const voice = await (await fetch(staticFile("out/voice.json"))).json();
          const capture = await (await fetch(staticFile("out/capture.json"))).json();
          // Ends just after the last line, with time for the end card.
          const cues = capture.kept.cues as Cue[];
          const last = cues[cues.length - 1];
          const spoken = voice.lines.find((l: { id: string }) => l.id === last.id).seconds;
          return {
            durationInFrames: Math.round((last.t + spoken + 3.2) * leadsales.fps),
            props: { voice, clip: "out/clips/tour.mp4", seconds: capture.clips.tour, cues },
          };
        }}
      />
      <Composition
        id="santelmo"
        component={SantelmoReel}
        width={santelmo.width}
        height={santelmo.height}
        fps={santelmo.fps}
        durationInFrames={santelmo.seconds * santelmo.fps}
        defaultProps={{ spoken: {} } as SantelmoData}
        calculateMetadata={async () => {
          await loadCormorant();
          return { props: await loadSantelmoData() };
        }}
      />
      <Composition
        id="typhoon"
        component={TyphoonReel}
        width={typhoon.width}
        height={typhoon.height}
        fps={typhoon.fps}
        durationInFrames={typhoon.seconds * typhoon.fps}
        calculateMetadata={async () => {
          await loadBarlow();
          return {};
        }}
      />
      <Composition
        id="kalakas"
        component={KalakasReel}
        width={kalakas.width}
        height={kalakas.height}
        fps={kalakas.fps}
        durationInFrames={kalakas.seconds * kalakas.fps}
        calculateMetadata={async () => {
          await loadKalakasFonts();
          return {};
        }}
      />
      <Composition
        id="fallout"
        component={FalloutReel}
        width={fallout.width}
        height={fallout.height}
        fps={fallout.fps}
        durationInFrames={fallout.seconds * fallout.fps}
        calculateMetadata={async () => {
          await loadFalloutFonts();
          return {};
        }}
      />
      {/* The same reel at two frames a second with no sound, for reviewing the whole thing in about a minute. */}
      <Composition
        id="fallout-contact"
        component={FalloutReel}
        width={fallout.width}
        height={fallout.height}
        fps={fallout.fps}
        durationInFrames={(fallout.seconds * fallout.fps) / 15}
        defaultProps={{ step: 15 }}
        calculateMetadata={async () => {
          await loadFalloutFonts();
          return {};
        }}
      />
      <Composition
        id="saf44"
        component={Saf44Reel}
        width={saf44.width}
        height={saf44.height}
        fps={saf44.fps}
        durationInFrames={saf44.seconds * saf44.fps}
        calculateMetadata={async () => {
          await loadSaf44Fonts();
          return {};
        }}
      />
      {/* Two frames a second with no sound: the whole film reviewed in a few minutes. */}
      <Composition
        id="saf44-contact"
        component={Saf44Reel}
        width={saf44.width}
        height={saf44.height}
        fps={saf44.fps}
        durationInFrames={(saf44.seconds * saf44.fps) / 15}
        defaultProps={{ step: 15 }}
        calculateMetadata={async () => {
          await loadSaf44Fonts();
          return {};
        }}
      />
      <Composition
        id="typhoon-space-test"
        component={SpaceTest}
        width={typhoon.width}
        height={typhoon.height}
        fps={typhoon.fps}
        durationInFrames={15 * typhoon.fps}
        calculateMetadata={async () => {
          await loadBarlow();
          return {};
        }}
      />
      {/* What If? series: each episode, and its two-frames-a-second contact sheet. */}
      {WHATIF.flatMap(({ config, component: C }) => [
        <Composition key={config.app} id={config.app} component={C} width={config.width} height={config.height} fps={config.fps} durationInFrames={config.seconds * config.fps} defaultProps={{ step: 1 }} calculateMetadata={async () => { await loadWhatIfFonts(); return {}; }} />,
        <Composition key={`${config.app}-contact`} id={`${config.app}-contact`} component={C} width={config.width} height={config.height} fps={config.fps} durationInFrames={(config.seconds * config.fps) / 15} defaultProps={{ step: 15 }} calculateMetadata={async () => { await loadWhatIfFonts(); return {}; }} />,
      ])}
      {/* The ocean film's quick look: one still per shot and a few key moments. */}
      <Composition id="ocean-bluewhale-look" component={OceanReel} width={oceanBluewhale.width} height={oceanBluewhale.height} fps={oceanBluewhale.fps} durationInFrames={OCEAN_LOOK.length} defaultProps={{ step: 15, at: OCEAN_LOOK }} calculateMetadata={async () => { await loadWhatIfFonts(); return {}; }} />
      <Composition id="strangers" component={StrangersReel} width={strangers.width} height={strangers.height} fps={strangers.fps} durationInFrames={strangers.seconds * strangers.fps} defaultProps={{ step: 1 }} calculateMetadata={async () => ({ props: { spoken: await loadStrangers() } })} />
      <Composition id="strangers-contact" component={StrangersReel} width={strangers.width} height={strangers.height} fps={strangers.fps} durationInFrames={STRANGERS_STILLS.length} defaultProps={{ at: STRANGERS_STILLS }} calculateMetadata={async ({ props }) => ({ props: { ...props, spoken: await loadStrangers() } })} />
      <Composition id="cosmic-egg" component={CosmicEggReel} width={cosmicEgg.width} height={cosmicEgg.height} fps={cosmicEgg.fps} durationInFrames={cosmicEgg.seconds * cosmicEgg.fps} defaultProps={{ step: 1 }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="cosmic-egg-contact" component={CosmicEggReel} width={cosmicEgg.width} height={cosmicEgg.height} fps={cosmicEgg.fps} durationInFrames={EGG_STILLS.length} defaultProps={{ at: EGG_STILLS }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="cosmic-egg-mocks" component={(p: { at?: number[] }) => <LookFilm film={EGG_MOCKS} {...p} />} width={1080} height={1920} fps={30} durationInFrames={EGG_MOCK_STILLS.length} defaultProps={{ at: EGG_MOCK_STILLS }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="cosmic-egg-mix" component={(p: { at?: number[] }) => <LookFilm film={EGG_MIX} {...p} />} width={1080} height={1920} fps={30} durationInFrames={EGG_MIX_STILLS.length} defaultProps={{ at: EGG_MIX_STILLS }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      {/* Pinatubo, 1991: the first documentary (src/kit/doc). The look renders one still per shot, for review. */}
      <Composition id="pinatubo" component={PinatuboReel} width={pinatubo.width} height={pinatubo.height} fps={pinatubo.fps} durationInFrames={pinatubo.seconds * pinatubo.fps} defaultProps={{ media: {} }} calculateMetadata={async () => ({ props: await loadPinatubo() })} />
      <Composition id="pinatubo-look" component={PinatuboReel} width={pinatubo.width} height={pinatubo.height} fps={pinatubo.fps} durationInFrames={PINATUBO_LOOK.length} defaultProps={{ media: {}, at: PINATUBO_LOOK }} calculateMetadata={async ({ props }) => ({ props: { ...props, ...(await loadPinatubo()) } })} />
      {/* Ozone, 1996 (long-form documentary, made in parts: apps/ozone/parts.ts). Boards: one still per look. */}
      <Composition id="ozone-boards" component={OzoneBoards} width={ozone.width} height={ozone.height} fps={ozone.fps} durationInFrames={OZONE_BOARDS.length} calculateMetadata={async () => ({ props: await loadOzone() })} />
      {OZONE_PARTS.map((id) => (
        <Composition key={id} id={`ozone-part-${id}`} component={OzonePart} width={ozone.width} height={ozone.height} fps={ozone.fps} durationInFrames={Math.ceil(OZONE_FILMS[id].layout.seconds * ozone.fps)} defaultProps={{ id }} calculateMetadata={async () => ({ props: { ...(await loadOzone()), id } })} />
      ))}
      <Composition id="middle" component={MiddleReel} width={middle.width} height={middle.height} fps={middle.fps} durationInFrames={middle.seconds * middle.fps} defaultProps={{ step: 1 }} calculateMetadata={async () => ({ props: { spoken: await loadMiddle() } })} />
      <Composition id="middle-contact" component={MiddleReel} width={middle.width} height={middle.height} fps={middle.fps} durationInFrames={MIDDLE_STILLS.length} defaultProps={{ at: MIDDLE_STILLS }} calculateMetadata={async ({ props }) => ({ props: { ...props, spoken: await loadMiddle() } })} />
      <Composition id="middle-review" component={MiddleReel} width={middle.width} height={middle.height} fps={middle.fps} durationInFrames={MIDDLE_REVIEW.length} defaultProps={{ at: MIDDLE_REVIEW }} calculateMetadata={async ({ props }) => ({ props: { ...props, spoken: await loadMiddle() } })} />
      <Composition id="middle-mocks" component={MiddleReel} width={middle.width} height={middle.height} fps={middle.fps} durationInFrames={MIDDLE_MOCKS.length} defaultProps={{ at: MIDDLE_MOCKS }} calculateMetadata={async ({ props }) => ({ props: { ...props, spoken: await loadMiddle() } })} />
      {/* The Forest Underneath: the fungal network in points of light (apps/underneath). Mocks: one still mid-scene. */}
      <Composition id="underneath" component={UnderneathReel} width={underneath.width} height={underneath.height} fps={underneath.fps} durationInFrames={Math.ceil(underneath.seconds * underneath.fps)} defaultProps={{ step: 1 }} calculateMetadata={async () => ({ props: { spoken: await loadUnderneath() } })} />
      <Composition id="underneath-contact" component={UnderneathReel} width={underneath.width} height={underneath.height} fps={underneath.fps} durationInFrames={UNDER_STILLS.length} defaultProps={{ at: UNDER_STILLS }} calculateMetadata={async ({ props }) => ({ props: { ...props, spoken: await loadUnderneath() } })} />
      <Composition id="underneath-review" component={UnderneathReel} width={underneath.width} height={underneath.height} fps={underneath.fps} durationInFrames={UNDER_REVIEW.length} defaultProps={{ at: UNDER_REVIEW }} calculateMetadata={async ({ props }) => ({ props: { ...props, spoken: await loadUnderneath() } })} />
      <Composition id="underneath-mocks" component={UnderneathReel} width={underneath.width} height={underneath.height} fps={underneath.fps} durationInFrames={UNDER_MOCKS.length} defaultProps={{ at: UNDER_MOCKS }} calculateMetadata={async ({ props }) => ({ props: { ...props, spoken: await loadUnderneath() } })} />
      <Composition id="porchlight" component={(p: { step?: number; at?: number[] }) => <LookFilm film={PORCHLIGHT} {...p} />} width={porchlight.width} height={porchlight.height} fps={porchlight.fps} durationInFrames={porchlight.seconds * porchlight.fps} defaultProps={{ step: 1 }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="porchlight-preview" component={(p: { step?: number }) => <LookFilm film={PORCHLIGHT_PREVIEW} {...p} />} width={porchlight.width} height={porchlight.height} fps={porchlight.fps} durationInFrames={porchlight.seconds * 4} defaultProps={{ step: 7.5 }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="porchlight-compare" component={(p: { at?: number[] }) => <LookFilm film={PORCHLIGHT} {...p} />} width={porchlight.width} height={porchlight.height} fps={porchlight.fps} durationInFrames={PORCHLIGHT_COMPARE.length} defaultProps={{ at: PORCHLIGHT_COMPARE }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="porchlight-lowpoly" component={(p: { step?: number; at?: number[] }) => <LookFilm film={PORCHLIGHT_LOWPOLY} {...p} />} width={porchlight.width} height={porchlight.height} fps={porchlight.fps} durationInFrames={porchlight.seconds * porchlight.fps} defaultProps={{ step: 1 }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="porchlight-lowpoly-stills" component={(p: { at?: number[] }) => <LookFilm film={PORCHLIGHT_LOWPOLY} {...p} />} width={porchlight.width} height={porchlight.height} fps={porchlight.fps} durationInFrames={PORCHLIGHT_LP_STILLS.length} defaultProps={{ at: PORCHLIGHT_LP_STILLS }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="porchlight-stills" component={(p: { step?: number; at?: number[] }) => <LookFilm film={PORCHLIGHT} {...p} />} width={porchlight.width} height={porchlight.height} fps={porchlight.fps} durationInFrames={PORCHLIGHT_STILLS.length} defaultProps={{ at: PORCHLIGHT_STILLS }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="pasko" component={(p: { step?: number; at?: number[] }) => <LookFilm film={PASKO} {...p} />} width={pasko.width} height={pasko.height} fps={pasko.fps} durationInFrames={pasko.seconds * pasko.fps} defaultProps={{ step: 1 }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="pasko-styles" component={(p: { at?: number[] }) => <LookFilm film={{ seconds: 8, scenes: [{ from: 0, to: 8, paint: paskoStyles }], lines: [] }} {...p} />} width={pasko.width} height={pasko.height} fps={pasko.fps} durationInFrames={PASKO_STYLE_FRAMES.length} defaultProps={{ at: PASKO_STYLE_FRAMES }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      <Composition id="pasko-stills" component={(p: { at?: number[] }) => <LookFilm film={{ ...PASKO, music: false }} {...p} />} width={pasko.width} height={pasko.height} fps={pasko.fps} durationInFrames={PASKO_STILLS.length} defaultProps={{ at: PASKO_STILLS }} calculateMetadata={async () => (await loadLookFonts(), {})} />
      {/* Paper, box and dots: the demo film of each, a contact sheet of it, and the parts each look has. */}
      {LOOKS.flatMap(({ id, film, stills }) => {
        const size = { width: looks.width, height: looks.height, fps: looks.fps, calculateMetadata: async () => (await loadLookFonts(), {}) };
        const C = (p: { step?: number; at?: number[] }) => <LookFilm film={film} {...p} />;
        return [
          <Composition key={id} id={id} component={C} durationInFrames={Math.round(film.seconds * looks.fps)} defaultProps={{ step: 1 }} {...size} />,
          <Composition key={`${id}-contact`} id={`${id}-contact`} component={C} durationInFrames={stills.length} defaultProps={{ at: stills }} {...size} />,
        ];
      })}
      {SIMS.map(({ config, component }) => (
        <Composition
          key={config.app}
          id={config.app}
          component={component}
          width={config.width}
          height={config.height}
          fps={config.fps}
          durationInFrames={config.seconds * config.fps}
        />
      ))}
    </>
  );
}
