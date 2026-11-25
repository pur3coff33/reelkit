import { simConfig } from "../../src/kit/lowpoly/app";
import { SECONDS } from "./timeline";

// Drawn from code: no app footage and no voices. out/music.wav holds the score and sound effects, already mixed.
export const config = simConfig("kalakas", "Kalakas", "Fictional disaster simulation", { bg: "#000000" }, SECONDS);
