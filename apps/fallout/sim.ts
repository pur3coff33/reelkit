// What's on screen at reel time t: picks the set and shot from the timeline. Every frame is built from t alone.
import type { Frame } from "../../src/kit/lowpoly/engine";
import { hex } from "../../src/kit/lowpoly/engine";
import { NO_FX, alertFrame, blastFrame, lookFrame, panicFrame, parentCloseFrame, type Fx } from "./downtown";
import { fireballFrame, mapDecayFrame, plumeFrame, riseFrame } from "./region";
import { callFrame, lapseTunnelFrame, lightFrame, outFrame, stationFrame, tunnelFrame, voicemailFrame, waveFrame } from "./station";
import { townFrame } from "./town";
import { CALL_CUT, STREET_BLAST, TOWN, lapseView, partAt, plumeLeft } from "./timeline";

export type { Fx };
export type Built = { frame: Frame; fx: Fx };

const BLACK: Built = {
  frame: { tris: [], camera: { pos: [0, 0, 0], target: [0, 0, -1], fov: 40 }, env: { skyTop: hex("#000000"), skyBottom: hex("#000000"), fog: hex("#000000"), fogNear: 1, fogFar: 2, sun: [0, 1, 0], sunColor: [0, 0, 0], ambient: [0, 0, 0] } },
  fx: { ...NO_FX, black: 1 },
};

export function falloutFrame(t: number): Built {
  switch (partAt(t)) {
    case "alert":
      return alertFrame(t);
    case "panic":
      return panicFrame(t);
    case "station":
      return stationFrame(t);
    case "call":
      return t >= CALL_CUT.from && t < CALL_CUT.to ? parentCloseFrame(t) : callFrame(t);
    case "look":
      return t < 29.6 ? lookFrame(t) : { ...BLACK, fx: { ...NO_FX, white: 1 } };
    case "fireball":
      return t >= STREET_BLAST.from && t < STREET_BLAST.to ? blastFrame(t) : fireballFrame(t);
    case "rise":
      return riseFrame(t);
    case "light":
      return lightFrame(t);
    case "wave":
      return waveFrame(t);
    case "plume":
      return t >= TOWN.from && t < TOWN.to ? townFrame(t) : plumeFrame(t);
    case "tunnel":
      return tunnelFrame(t);
    case "lapse":
      return lapseView(t) === "tunnel" ? lapseTunnelFrame(t) : mapDecayFrame(t, plumeLeft(t));
    case "voicemail":
      return voicemailFrame(t);
    case "out":
      return outFrame(t);
    default:
      return BLACK;
  }
}
