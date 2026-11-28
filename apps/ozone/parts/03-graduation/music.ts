// Part 03-graduation, the sound:
//   the card, the street (g1–g3)   the night outside: the club's track through the walls, low traffic hush
//   Bruan walks in (g4–g5)         the track stays muffled until her dot passes the inner door, then opens into the room
//   the floor (g6)                 the room at full tilt
//   Jhunie (g7)                    the track leans back under her line
//   seventeen friends (g8)         the track falls away; one long cello note, the piano once
//   the count (g9–g10)             the track back, muffled, far off; a low pulse that climbs with the count and stops
import { readFileSync } from "node:fs";
import { leanBack } from "../../../../src/kit/music/narration";
import { Session } from "../../../../src/kit/music/studio";
import { SR, writeWav } from "../../../../src/kit/music/synth";
import { outDir } from "../../../../src/kit/paths";
import { heartbeat } from "../../../../src/kit/whatif/campsound";
import { checkFresh, clubTrack, loadInstruments, narrate, street, throughWalls } from "../../sound";
import { LAYOUT } from "./layout.gen";
import { SCRIPT } from "./script";
import { events } from "./times";

export async function writeMusic(file: string) {
  const L = LAYOUT, l = L.lines, S = L.spoken, e = events(L);
  checkFresh(SCRIPT, L, JSON.parse(readFileSync(outDir("ozone", "parts", SCRIPT.id, "voice.json"), "utf8")).lines);
  const { upright, cellos, contra } = await loadInstruments();
  const s = new Session(L.seconds, 23);
  const lines = narrate(s, SCRIPT, L);

  // ── The club's track: one take for the whole part, muffled outside, open inside, gone for the lost friends.
  const quiet = l.g8 - 0.4, back = l.g9 - 0.2;
  const [tl, tr] = clubTrack(L.seconds, 17);
  const ml = throughWalls(tl), mr = throughWalls(tr);
  const open = (t: number) => (t < e.inside ? 0 : t < e.inside + 0.35 ? (t - e.inside) / 0.35 : t < back ? 1 : 0);
  const level = (t: number) => {
    if (t < 1.5) return t / 1.5;
    if (t < quiet) return 1;
    if (t < quiet + 1.4) return 1 - (t - quiet) / 1.4;
    if (t < back) return 0;
    return Math.min(0.75, (t - back) / 2.5);
  };
  const outL = new Float32Array(tl.length), outR = new Float32Array(tr.length);
  for (let i = 0; i < tl.length; i++) {
    const t = i / SR, o = open(t), g = level(t);
    outL[i] = g * (o * tl[i] + (1 - o) * ml[i] * 1.6);
    outR[i] = g * (o * tr[i] + (1 - o) * mr[i] * 1.6);
  }
  const club = s.stem("club track", { lufs: -24 });
  club.add([outL, outR], 0);
  club.ride(leanBack(lines, 0.5));

  // ── The street outside, under the first lines.
  const night = s.stem("street", { lufs: -36, high: 3000 });
  const [sl, sr] = street(e.inside + 1, 4);
  for (let i = 0; i < sl.length; i++) {
    const t = i / SR, g = Math.min(1, t / 1.5) * Math.max(0, Math.min(1, (e.inside + 1 - t) / 1));
    sl[i] *= g;
    sr[i] *= g;
  }
  night.add([sl, sr], 0);

  // ── Seventeen friends: one long cello note, the piano once.
  const strings = s.stem("strings", { lufs: -25, low: 40, high: 3200, warmth: 0.3, hall: { seconds: 4.5, mix: 0.55, gap: 0.03 }, loose: { time: 0.08, velocity: 0.05 } });
  strings.note(cellos, "A2", quiet + 0.4, back - quiet + 2, 0.32, { attack: 1.4, release: 2.5, swell: 0.4 });
  strings.note(contra, "A1", quiet + 1, back - quiet + 1.5, 0.22, { attack: 2, release: 2.5 });
  const piano = s.stem("piano", { lufs: -25, low: 50, high: 4500, hall: { seconds: 3.6, mix: 0.5, gap: 0.04 }, loose: { time: 0.02, velocity: 0.06 } });
  for (const [dt, n, v] of [[1.0, "E4", 0.24], [2.0, "D4", 0.21], [3.2, "A3", 0.24]] as const) piano.note(upright, n, l.g8 + dt, 3, v, { attack: 0.003, release: 2.4 });

  // ── The count: a low pulse quickening with the number, stopping on "thirty-five".
  const pulse = s.stem("pulse", { lufs: -30, high: 900 });
  const stop = l.g10 + S.g10 - 0.5;
  for (let t = e.count.from; t < stop; ) {
    const k = (t - e.count.from) / (stop - e.count.from);
    pulse.add(heartbeat(5 + Math.round(t)), t, 0.5 + 0.4 * k);
    t += 0.95 - 0.4 * k;
  }
  strings.note(cellos, "D2", stop, L.seconds - stop, 0.3, { attack: 0.6, release: 1.5, swell: 0.3 });

  const { L: left, R: right, reduced, loudness } = s.master({ target: process.env.OZONE_SCORE_ONLY ? -20 : -18, fade: 0.5 });
  writeWav(file, left, right);
  console.log(`  ${SCRIPT.id}: ${L.seconds.toFixed(1)} s, ${loudness.toFixed(1)} LUFS, limiter took ${reduced.toFixed(1)} dB (inside at ${e.inside.toFixed(2)})`);
}
