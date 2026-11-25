import { simConfig } from "../../src/kit/lowpoly/app";

// The demo of the paper, box and dots looks: four 6 s films, one after another. Silent.
export const config = { ...simConfig("looks", "The looks", "Paper, box, dots, and paper with light", {}, 24), gl: "swangle" as const };
