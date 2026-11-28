// When things happen in part 04-fifteen, from its layout: the picture (shots.tsx) and the sound (music.ts) both read these.
import type { Layout } from "../../parts";

export function events(L: Layout) {
  const l = L.lines, S = L.spoken, lead = L.lead;
  const lightsOut = l.f5 + S.f5 - 0.25; // as "…the lights went out" ends
  return {
    in: l.f1 - 0.6, // the track inside the room
    sparks: l.f1 + 2.9, // "Sparks flew"
    micDead: l.f4 + lead.f4 - 0.1, // "It had stopped working."
    smoke: lightsOut - 15, // "about fifteen seconds" of smoke before the power failed
    lightsOut,
    pulled: l.f9 + S.f9 - 0.45, // "…and pulled."
    guards: l.f10,
    opened: l.f11 + S.f11 * 0.62, // "When the doors finally opened"
    rush: l.f12 + 0.15, // "and the fire came with it"
    hit: l.f14 + S.f14 * 0.55, // "…was hit"
    crawl: l.f15,
    jhunie: l.f16,
    burned: l.f17,
    science: l.f18,
    co: l.f19 + S.f19 * 0.45,
    hcn: l.f20 + S.f20 * 0.3,
    corridor: l.f21,
    end: L.seconds,
  };
}
