import { simConfig } from "../../src/kit/lowpoly/app";
import { SECONDS } from "./timeline";

// The life of a blue whale. Drawn from code: no voice, no HUD, a few soft lines of words over a slow score.
export const config = simConfig("ocean-bluewhale", "The Life of a Blue Whale", "From first breath to first calf", { bg: "#04182c" }, SECONDS);
