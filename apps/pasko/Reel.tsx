// "Seven Plates": one Filipino yard, one Christmas a year, 1998 to 2026, in one unbroken camera move. No voice: the
// year as each one arrives, and the title in bulbs.
import type { Film, Line } from "../../src/kit/looks/Film";
import { STILLS as AT, paint } from "./scene";
import { SECONDS } from "./story";

/** The year as each one arrives, low in the frame. */
const year = (at: number, text: string, to = at + 2.2): Line => ({ at, to, text, voice: "paper", size: 112, y: 1420, color: "#ffeccb" });

export const FILM: Film = {
  seconds: SECONDS,
  music: true,
  bg: "#0a0816",
  scenes: [{ from: 0, to: SECONDS, paint }],
  lines: [year(5.4, "1998"), year(14.6, "2003", 16.2), year(18.6, "2006"), year(28.3, "2009"), year(32.3, "2013"), year(36.3, "2018"), year(39.9, "2019"), year(45.4, "2026")],
};
export const STILLS = AT;
