// Every scene's shape, by scene name.
import type { SceneName } from "../timeline";
import { ANCIENT } from "./ancient";
import { COSMOS } from "./cosmos";
import { FOREST } from "./forest";
import { INSIDE } from "./inside";
import type { Make } from "./make";
import { TRADE } from "./trade";

export const SHAPES: Partial<Record<SceneName, Make>> = { ...COSMOS, ...ANCIENT, ...TRADE, ...INSIDE, ...FOREST };
