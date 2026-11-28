// Part 00-open, the sound: the club's track heard through the walls under street sound; it CUTS as "It opened inward"
// begins; cello and bass come up from nothing; the title gets a falling figure on a soft upright.
import { readFileSync } from "node:fs";
import { leanBack } from "../../../../src/kit/music/narration";
import { Session } from "../../../../src/kit/music/studio";
import { SR, writeWav } from "../../../../src/kit/music/synth";
import { outDir } from "../../../../src/kit/paths";
import { checkFresh, clubTrack, loadInstruments, narrate, street, throughWalls } from "../../sound";
import { LAYOUT } from "./layout.gen";
import { SCRIPT } from "./script";

export async function writeMusic(file: string) {
  const L = LAYOUT, l = L.lines;
  checkFresh(SCRIPT, L, JSON.parse(readFileSync(outDir("ozone", "parts", SCRIPT.id, "voice.json"), "utf8")).lines);
  const cut = l.o5 + L.lead.o5 - 0.08, title = L.end;
  const { upright, cellos, contra } = await loadInstruments();
  const s = new Session(L.seconds, 18);
  const lines = narrate(s, SCRIPT, L);

  // The track through the walls: in over 2.5 s, out in 60 ms on the cut.
  const club = s.stem("club track", { lufs: -25.5 });
  const [ol, or] = clubTrack(cut + 0.2, 3);
  const outL = throughWalls(ol), outR = throughWalls(or), fall = Math.round(0.06 * SR);
  for (let i = 0; i < outL.length; i++) {
    const g = Math.min(1, i / SR / 2.5) * (i > outL.length - fall ? (outL.length - i) / fall : 1) * 0.55;
    outL[i] *= g;
    outR[i] *= g;
  }
  club.add([outL, outR], 0);
  club.ride(leanBack(lines, 0.5));

  const score = s.stem("score", { lufs: -23.5, low: 45, high: 4000, warmth: 0.25, hall: { seconds: 4.5, mix: 0.55, gap: 0.03 }, loose: { time: 0.05, velocity: 0.06 } });
  const piano = s.stem("piano", { lufs: -24, low: 60, high: 5000, hall: { seconds: 4.8, mix: 0.5, gap: 0.045 }, loose: { time: 0.02, velocity: 0.08 } });
  score.note(cellos, "A2", cut + 0.3, title - cut + 2.5, 0.42, { attack: 2.2, release: 3, swell: 0.4 });
  score.note(contra, "A1", cut + 1.2, title - cut + 2, 0.36, { attack: 2.5, release: 3, swell: 0.3 });
  score.note(cellos, "E3", cut + 4.5, title - cut, 0.3, { attack: 2.5, release: 3, swell: 0.4 });
  // The title: A – G – E … D – E, falling home.
  for (const [dt, n, len, v] of [[0.2, "A4", 1.6, 0.34], [1.8, "G4", 0.9, 0.3], [2.7, "E4", 1.8, 0.32], [4.5, "D4", 1, 0.28], [5.5, "E4", 2.6, 0.3]] as const) piano.note(upright, n, title + dt, len + 2, v, { attack: 0.003, release: 2.4 });
  piano.note(upright, "A2", title + 0.2, 6, 0.24, { attack: 0.003, release: 2.6 });
  piano.note(upright, "E3", title + 0.9, 5, 0.18, { attack: 0.003, release: 2.6 });

  const fx = s.stem("effects", { lufs: -27, high: 10000 });
  fx.add(street(cut + 1.5, 9), 0, 1);

  const { L: left, R: right, reduced, loudness } = s.master({ target: process.env.OZONE_SCORE_ONLY ? -20 : -18, fade: 1.5 });
  writeWav(file, left, right);
  console.log(`  ${SCRIPT.id}: ${L.seconds.toFixed(1)} s, ${loudness.toFixed(1)} LUFS, limiter took ${reduced.toFixed(1)} dB (cut ${cut.toFixed(2)}, title ${title.toFixed(2)})`);
}
