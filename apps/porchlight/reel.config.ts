// "Leave the Light On": a boy's dog is lost in a storm and never found; he leaves the light at the gate on for the rest
// of his life. A world in a box, no voice, only music. Story and timing live in story.ts.
import { simConfig } from "../../src/kit/lowpoly/app";
import { SECONDS } from "./story";

export const config = { ...simConfig("porchlight", "Leave the Light On", "He left the light on for seventy years.", { bg: "#0b0a14" }, SECONDS), gl: "swangle" as const };
