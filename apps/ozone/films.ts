// Every part's script, layout and shots, for the compositions (src/Root.tsx registers ozone-part-<id> for each).
import type { Layout, PartId, PartScript } from "./parts";
import type { Shot } from "./PartFilm";
import { LAYOUT as OPEN_LAYOUT } from "./parts/00-open/layout.gen";
import { SCRIPT as OPEN } from "./parts/00-open/script";
import { shots as openShots } from "./parts/00-open/shots";
import { LAYOUT as BIRDLAND_LAYOUT } from "./parts/01-birdland/layout.gen";
import { SCRIPT as BIRDLAND } from "./parts/01-birdland/script";
import { shots as birdlandShots } from "./parts/01-birdland/shots";
import { LAYOUT as PAPER_LAYOUT } from "./parts/02-paper/layout.gen";
import { SCRIPT as PAPER } from "./parts/02-paper/script";
import { shots as paperShots } from "./parts/02-paper/shots";
import { LAYOUT as GRADUATION_LAYOUT } from "./parts/03-graduation/layout.gen";
import { SCRIPT as GRADUATION } from "./parts/03-graduation/script";
import { shots as graduationShots } from "./parts/03-graduation/shots";
import { LAYOUT as FIFTEEN_LAYOUT } from "./parts/04-fifteen/layout.gen";
import { SCRIPT as FIFTEEN } from "./parts/04-fifteen/script";
import { shots as fifteenShots } from "./parts/04-fifteen/shots";

export const FILMS: Record<PartId, { script: PartScript; layout: Layout; shots: (l: Layout) => Shot[] }> = {
  "00-open": { script: OPEN, layout: OPEN_LAYOUT, shots: openShots },
  "01-birdland": { script: BIRDLAND, layout: BIRDLAND_LAYOUT, shots: birdlandShots },
  "02-paper": { script: PAPER, layout: PAPER_LAYOUT, shots: paperShots },
  "03-graduation": { script: GRADUATION, layout: GRADUATION_LAYOUT, shots: graduationShots },
  "04-fifteen": { script: FIFTEEN, layout: FIFTEEN_LAYOUT, shots: fifteenShots },
};
