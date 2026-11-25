import { simConfig } from "../../src/kit/lowpoly/app";
import { SECONDS } from "./timeline";

// No voice (Kokoro has no Tagalog): the story is told in on-screen text. Music and sound are generated.
export const config = simConfig("santelmo", "Huwag Mong Sundan", "A Filipino santelmo story, told in Tagalog", { bg: "#000000" }, SECONDS);
