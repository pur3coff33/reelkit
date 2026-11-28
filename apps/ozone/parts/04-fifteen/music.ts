// Part 04-fifteen, the sound: one low piano note under the chapter card; the club's track inside the room, bright; from the
// moment the smoke is seen a low cello swells under it and a riser climbs; the track dies like the power did (slows to a
// stop in half a second, a breaker thunks), then nothing but room tone, a slow pulse and a pressure that never resolves;
// one long cello note on "pulled"; a rush of air and the fire's surge when the doors open; ringing ears over Bruan's
// words and the crawl; the cello for Jhunie, a step up on "forty-six percent"; a cold drone and slow piano for the
// science; silence on the corridor, then one low note.
import { readFileSync } from "node:fs";
import { leanBack } from "../../../../src/kit/music/narration";
import { boom } from "../../../../src/kit/music/sfx";
import { Session } from "../../../../src/kit/music/studio";
import { SR, riser, svf, writeWav } from "../../../../src/kit/music/synth";
import { outDir } from "../../../../src/kit/paths";
import { fire, heartbeat, roar, snap } from "../../../../src/kit/whatif/campsound";
import { checkFresh, clubTrack, loadInstruments, narrate, powerDown } from "../../sound";
import { LAYOUT } from "./layout.gen";
import { SCRIPT } from "./script";
import { events } from "./times";

export async function writeMusic(file: string) {
  const L = LAYOUT, e = events(L);
  checkFresh(SCRIPT, L, JSON.parse(readFileSync(outDir("ozone", "parts", SCRIPT.id, "voice.json"), "utf8")).lines);
  const { upright, cellos, contra } = await loadInstruments();
  const s = new Session(L.seconds, 19);
  const lines = narrate(s, SCRIPT, L);

  // The track inside the room, from just before the first line to the power failing.
  const club = s.stem("club track", { lufs: -25.5 });
  const len = e.lightsOut - e.in;
  const [il, ir] = clubTrack(len + 0.05, 5);
  powerDown(il, len, 0.55);
  powerDown(ir, len, 0.55);
  for (let i = 0; i < Math.round(1.2 * SR); i++) {
    il[i] *= i / (1.2 * SR);
    ir[i] *= i / (1.2 * SR);
  }
  club.add([il, ir], e.in);
  club.ride(leanBack(lines.filter((x) => x.at < e.lightsOut), 0.5));

  const score = s.stem("score", { lufs: -23.5, low: 45, high: 4000, warmth: 0.25, hall: { seconds: 4.5, mix: 0.55, gap: 0.03 }, loose: { time: 0.05, velocity: 0.06 } });
  const piano = s.stem("piano", { lufs: -25, low: 60, high: 5000, hall: { seconds: 4.8, mix: 0.5, gap: 0.045 }, loose: { time: 0.02, velocity: 0.08 } });
  piano.note(upright, "A2", 0.3, 4, 0.22, { attack: 0.003, release: 2.6 });
  // From the first smoke to the dark: a low cello that rises a half step and grows, cut with the lights.
  score.note(cellos, "E2", e.smoke, 9, 0.22, { attack: 3, release: 0.4, swell: 0.6 });
  score.note(cellos, "F2", e.smoke + 8.4, e.lightsOut - e.smoke - 8.4, 0.4, { attack: 1.5, release: 0.05, swell: 0.7 });
  // "…and pulled": one long cello note, held under the guards and the opening doors.
  score.note(cellos, "A2", e.pulled, e.rush - e.pulled + 0.3, 0.4, { attack: 0.9, release: 0.3, swell: 0.3 });
  score.note(contra, "A1", e.pulled + 0.2, e.rush - e.pulled, 0.32, { attack: 1.2, release: 0.3 });
  piano.note(upright, "A1", e.pulled, 6, 0.3, { attack: 0.003, release: 3 });
  // Bruan's words, the crawl: a high thin note, as if the ears were ringing, and a low drone.
  score.note(cellos, "D2", e.hit - 1, e.jhunie - e.hit + 2, 0.3, { attack: 2, release: 2, swell: 0.3 });
  // Jhunie through the doors: the cello again, rising a step on "forty-six percent".
  score.note(cellos, "A2", e.jhunie, e.burned - e.jhunie + 0.5, 0.36, { attack: 1.4, release: 1.2, swell: 0.4 });
  score.note(cellos, "B2", e.burned, e.science - e.burned + 1, 0.38, { attack: 0.8, release: 2, swell: 0.4 });
  score.note(contra, "B1", e.burned + 0.3, e.science - e.burned, 0.26, { attack: 1.4, release: 2 });
  // The science: a cold low drone, a few slow piano notes.
  score.note(cellos, "E2", e.science + 0.4, e.corridor - e.science, 0.26, { attack: 2.5, release: 2, swell: 0.3 });
  score.note(contra, "E1", e.science + 1.2, e.corridor - e.science - 1, 0.2, { attack: 3, release: 2 });
  for (const [dt, n] of [[1.5, "B3"], [5.5, "G3"], [10.5, "E3"], [16, "F#3"]] as const) if (e.science + dt < e.corridor - 1) piano.note(upright, n, e.science + dt, 3, 0.16, { attack: 0.003, release: 2.4 });
  // The corridor: silence, then one low note as the photo holds.
  piano.note(upright, "E1", e.corridor + 2.2, 6, 0.28, { attack: 0.003, release: 3.5 });
  score.ride([[0, 1], [e.lightsOut - 0.02, 1], [e.lightsOut, 0], [e.pulled - 0.05, 0], [e.pulled, 1]]);

  const fx = s.stem("effects", { lufs: -27, high: 10000 });
  fx.add(svf(fire(4.5, 31, 0.55), 5000, 0.7, "low"), e.sparks, 0.5);
  fx.add(snap(41), e.sparks + 0.2, 0.7);
  fx.add(snap(43), e.sparks + 0.9, 0.5);
  fx.add(snap(47), e.micDead, 0.9);
  fx.add(riser(6), e.lightsOut - 6, 0.25);
  fx.add(boom(0.6, 17), e.lightsOut + 0.02, 0.9);
  // The doors open: a rush of air, then the fire's surge and a deep thump.
  fx.add(riser(1.6), e.rush - 1.5, 0.35);
  fx.add(svf(fire(3.2, 61, 1), 3000, 0.7, "low"), e.rush, 0.9);
  fx.add(boom(0.9, 23), e.rush + 0.1, 1);
  // Ringing ears after the hit, fading over the crawl.
  const ring = new Float32Array(Math.round((e.jhunie - e.hit) * SR));
  for (let i = 0; i < ring.length; i++) { const t = i / SR; ring[i] = Math.sin(2 * Math.PI * 3900 * t) * 0.018 * Math.min(1, t / 0.05) * Math.max(0, 1 - t / (ring.length / SR)); }
  fx.add(ring, e.hit, 1);
  // In the dark: a pressure that never resolves, and a slow pulse, until the pull; then outside, a muffled roar behind the doors.
  const dark = s.stem("dark", { lufs: -31, high: 2000 });
  dark.add(svf(roar(e.rush - e.lightsOut, 51), 260, 0.7, "low"), e.lightsOut + 1.0, 1);
  for (let t = e.lightsOut + 2.2; t < e.pulled - 0.4; t += 1.25) dark.add(heartbeat(3), t, 0.9);

  const { L: left, R: right, reduced, loudness } = s.master({ target: process.env.OZONE_SCORE_ONLY ? -20 : -18, fade: 2.5 });
  writeWav(file, left, right);
  console.log(`  ${SCRIPT.id}: ${L.seconds.toFixed(1)} s, ${loudness.toFixed(1)} LUFS, limiter took ${reduced.toFixed(1)} dB (lights out ${e.lightsOut.toFixed(2)})`);
}
