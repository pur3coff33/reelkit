// Every scene's shape, by scene name.
import type { SceneName } from "../timeline";
import { CELLS } from "./cells";
import { COSMIC } from "./cosmic";
import { EARTH } from "./earth";
import type { Make } from "./make";
import { MOLECULES } from "./molecules";
import { STARS } from "./stars";
import { SUBATOMIC } from "./subatomic";

export const SHAPES: Partial<Record<SceneName, Make>> = { ...SUBATOMIC, ...MOLECULES, ...CELLS, ...EARTH, ...STARS, ...COSMIC };
