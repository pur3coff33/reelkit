// Part 02-paper, the sound:
//   the card, City Hall (p1)     one low piano note, then a cold drone (cello and bass on D) and a clock
//   the papers (p2–p3)           a stamp's thud for each paper as it's named; a pen scratch for "35"
//   plan, exit, doors (p4–p7)    the drone climbs a step; one low note on "Inward."
//   the waiter (p8–p9)           typewriter keys as his words type; near silence after "bring the money in"
//   the checklist (p10)          a thud for each verdict
//   1995, the owner (p11–p13)    a thud for 1995, keys for the prosecutors' words, the last stamp ("claimed")
//   a crowd (p14)                the club's track, far off through the walls, coming up as the chapter ends
import { readFileSync } from "node:fs";
import { leanBack } from "../../../../src/kit/music/narration";
import { boom } from "../../../../src/kit/music/sfx";
import { Session, seeded } from "../../../../src/kit/music/studio";
import { SR, svf, writeWav } from "../../../../src/kit/music/synth";
import { outDir } from "../../../../src/kit/paths";
import { snap } from "../../../../src/kit/whatif/campsound";
import { checkFresh, clubTrack, loadInstruments, narrate, throughWalls } from "../../sound";
import { LAYOUT } from "./layout.gen";
import { SCRIPT } from "./script";
import { events } from "./times";

export async function writeMusic(file: string) {
  const L = LAYOUT, l = L.lines, S = L.spoken, e = events(L);
  checkFresh(SCRIPT, L, JSON.parse(readFileSync(outDir("ozone", "parts", SCRIPT.id, "voice.json"), "utf8")).lines);
  const { upright, cellos, contra } = await loadInstruments();
  const s = new Session(L.seconds, 22);
  const lines = narrate(s, SCRIPT, L);

  // ── The drone: D under the papers, up to E for the plan and the doors, back to D for the findings.
  const strings = s.stem("strings", { lufs: -25, low: 40, high: 3200, warmth: 0.3, hall: { seconds: 4.5, mix: 0.55, gap: 0.03 }, loose: { time: 0.1, velocity: 0.06 } });
  const step = l.p4 - 0.3, back = l.p10 - 0.3, end = e.crowd + 1.5;
  strings.note(cellos, "D2", 1.2, step - 1.2 + 1.5, 0.3, { attack: 2.5, release: 2, swell: 0.4 });
  strings.note(contra, "D1", 2.2, step - 2.2, 0.24, { attack: 3, release: 2 });
  strings.note(cellos, "E2", step, back - step + 1.5, 0.3, { attack: 2, release: 2, swell: 0.4 });
  strings.note(cellos, "B2", l.p5, back - l.p5, 0.2, { attack: 2.5, release: 2, swell: 0.3 });
  strings.note(cellos, "D2", back, end - back, 0.3, { attack: 2, release: 2.5, swell: 0.4 });
  strings.note(contra, "D1", back + 0.6, end - back - 0.6, 0.24, { attack: 3, release: 2.5 });
  strings.note(cellos, "A2", l.p12, end - l.p12, 0.22, { attack: 2, release: 2.5, swell: 0.3 });

  // ── Piano: one low note under the card, one on "Inward.", one after the waiter's words, one on "Every paper said yes."
  const piano = s.stem("piano", { lufs: -24, low: 50, high: 4500, hall: { seconds: 3.4, mix: 0.45, gap: 0.04 }, loose: { time: 0.02, velocity: 0.08 } });
  piano.note(upright, "D2", 0.5, 6, 0.3, { attack: 0.003, release: 2.8 });
  const inward = l.p7 + S.p7 - 0.6;
  piano.note(upright, "E2", inward, 5, 0.32, { attack: 0.003, release: 2.6 });
  piano.note(upright, "E3", inward + 0.02, 5, 0.18, { attack: 0.003, release: 2.6 });
  piano.note(upright, "F2", l.p9 + S.p9 + 0.2, 5, 0.26, { attack: 0.003, release: 2.6 });
  piano.note(upright, "D2", l.p13 + 0.1, 6, 0.3, { attack: 0.003, release: 3 });
  piano.note(upright, "A2", l.p13 + 0.14, 6, 0.2, { attack: 0.003, release: 3 });

  // ── Effects: a clock under the papers and findings, stamps, keys, a pen.
  const fx = s.stem("effects", { lufs: -29, high: 8000 });
  for (let t = 1.6; t < step; t += 1.0) fx.add(svf(snap(Math.round(t * 7)), 2400, 0.8, "band"), t, 0.4);
  for (let t = back + 0.5; t < e.crowd; t += 1.0) fx.add(svf(snap(Math.round(t * 7)), 2400, 0.8, "band"), t, 0.35);
  const stamps = s.stem("stamps", { lufs: -27, high: 6000 });
  const thud = (at: number, k: number) => {
    stamps.add(svf(boom(0.35, k), 180, 0.7, "low"), at, 0.9);
    stamps.add(svf(snap(500 + k), 1200, 0.6, "band"), at, 0.7);
  };
  e.stamps.forEach((t, i) => thud(t, i + 1));
  e.verdicts.forEach((t, i) => thud(t, i + 10));
  thud(e.stamp1995, 20);
  thud(e.claimed, 21);
  const rnd = seeded(7);
  const keys = (from: number, to: number) => { for (let t = from; t < to; t += 0.07 + rnd() * 0.1) fx.add(snap(1000 + Math.round(t * 100)), t, 0.22 + rnd() * 0.18, rnd() * 0.4 - 0.2); };
  keys(l.p8 + 0.1, l.p8 + (l.p10 - l.p8) * 0.6);
  keys(e.quote1995 + 0.1, e.quote1995 + (l.p12 - e.quote1995) * 0.5);
  for (let t = e.thirtyFive; t < e.thirtyFive + 0.8; t += 0.05 + rnd() * 0.05) fx.add(svf(snap(2000 + Math.round(t * 50)), 5000, 0.5, "high"), t, 0.12);

  // ── A crowd: the club's track, far down the street, through the walls.
  const club = s.stem("club track", { lufs: -28 });
  const len = L.seconds - e.crowd;
  const [cl, cr] = clubTrack(len, 13);
  const fl = throughWalls(cl), fr = throughWalls(cr);
  for (let i = 0; i < fl.length; i++) {
    const g = Math.min(1, i / SR / 2.5);
    fl[i] *= g;
    fr[i] *= g;
  }
  club.add([fl, fr], e.crowd);
  club.ride(leanBack(lines.filter((x) => x.at >= e.crowd - 1), 0.5));

  const { L: left, R: right, reduced, loudness } = s.master({ target: process.env.OZONE_SCORE_ONLY ? -20 : -18, fade: 1.2 });
  writeWav(file, left, right);
  console.log(`  ${SCRIPT.id}: ${L.seconds.toFixed(1)} s, ${loudness.toFixed(1)} LUFS, limiter took ${reduced.toFixed(1)} dB`);
}
