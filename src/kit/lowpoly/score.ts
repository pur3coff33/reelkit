// A disaster-sim score on the synth: a dark pad, a clock tick that tightens, a pulsing bass, half-time trailer drums,
// risers into big hits, HUD alert beeps and low rumbles under the events. Each reel fills in its own cues.
import { Mix, SR, bass, chord, clap, hat, hz, impact, kick, pluck, riser } from "../music/synth";

export type ScoreSpec = {
  seconds: number;
  bpm: number;
  /** One chord per bar (4 beats), as note names: "D2 A2 D3 F3". Loops. */
  progression: string[];
  /** Beats: where the bass pulse starts, the drums play, the outro starts (drums stop, the pad rings on). */
  pulseFrom: number;
  drums: [number, number];
  outro: number;
  /** Beats of the big hits; each gets a riser over the `riserBeats` before it. */
  hits: { beat: number; riserBeats?: number; size?: number }[];
  /** Beats of HUD alert beeps. */
  beeps: number[];
  /** Seconds: low rumbles (quakes, eruptions, shockwaves). */
  rumbles: { from: number; to: number; gain: number }[];
};

function noiseGen(seed: number) {
  let a = seed >>> 0;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 2147483648 - 1);
}

/** Low, rolling noise with a swell and a slow flutter. */
function rumble(seconds: number, seed = 3) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  const rnd = noiseGen(seed);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    lp1 += 0.012 * (rnd() - lp1);
    lp2 += 0.02 * (lp1 - lp2);
    const env = Math.min(1, t / 0.4) * Math.min(1, (seconds - t) / 0.8);
    const flutter = 0.7 + 0.3 * Math.sin(t * 9.1) * Math.sin(t * 3.7);
    out[i] = lp2 * 9 * env * flutter;
  }
  return out;
}

/** A sustained sub sine. */
function sub(freq: number, seconds: number) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = Math.sin(2 * Math.PI * freq * t) * Math.min(1, t / 0.3) * Math.min(1, (seconds - t) / 0.3);
  }
  return out;
}

export function writeScore(file: string, s: ScoreSpec) {
  const B = 60 / s.bpm;
  const at = (beat: number) => beat * B;
  const total = s.seconds / B;
  const m = new Mix(s.seconds + 0.5);
  const kicks: number[] = [];
  const chordAt = (beat: number) => s.progression[Math.floor(beat / 4) % s.progression.length].split(" ").map(hz);

  // Pad and sub, a bar at a time.
  for (let b = 0; b < total; b += 4) {
    const notes = chordAt(b);
    const len = Math.min(4, total - b) * B + 0.4;
    m.add(chord(notes.slice(1).map((f) => f * 2), len, { attack: 0.6, bright: b >= s.outro ? 1400 : 900 }), at(b), 0.24, 0, 0.7);
    m.add(sub(notes[0], len), at(b), 0.22);
  }

  // The clock: a tick a beat, eighths once the pulse starts, sixteenths in the drums.
  for (let b = 0; b < s.outro; b += 0.25) {
    const step = b < s.pulseFrom ? 1 : b < s.drums[0] ? 0.5 : 0.25;
    if (Math.abs(b / step - Math.round(b / step)) > 1e-6) continue;
    m.add(hat(), at(b), b % 1 === 0 ? 0.12 : 0.06, (b * 4) % 2 ? 0.35 : -0.35);
  }

  // Pulsing bass in eighths, growing towards the drums.
  for (let b = s.pulseFrom; b < s.outro; b += 0.5) {
    const g = 0.22 + 0.22 * Math.min(1, (b - s.pulseFrom) / Math.max(1, s.drums[0] - s.pulseFrom));
    m.add(bass(chordAt(b)[0] * (b % 1 ? 2 : 1), B * 0.42), at(b), g);
  }

  // Half-time trailer drums: kick on 1 and the "and" of 2, clap on 3.
  for (let b = s.drums[0]; b < s.drums[1]; b++) {
    const inBar = b % 4;
    if (inBar === 0 || inBar === 3) {
      m.add(kick(1.2), at(b), 0.95);
      kicks.push(at(b));
    }
    if (inBar === 1) m.add(kick(), at(b + 0.5), 0.6);
    if (inBar === 2) m.add(clap(), at(b), 0.5, 0, 0.5);
    m.add(hat(true), at(b + 0.5), 0.05, 0.4, 0.2);
  }

  for (const h of s.hits) {
    const size = h.size ?? 1;
    const rb = h.riserBeats ?? 4;
    if (rb > 0) m.add(riser(at(rb)), at(h.beat - rb), 0.4 * size, 0, 0.4);
    m.add(kick(1.6), at(h.beat), 1.0 * size);
    m.add(impact(), at(h.beat), 0.95 * size);
    m.add(hat(true), at(h.beat), 0.3 * size, 0, 0.8);
    m.add(chord(chordAt(h.beat).map((f) => f), 1.6, { attack: 0.005, bright: 2600 }), at(h.beat), 0.4 * size, 0, 0.6);
    kicks.push(at(h.beat));
  }

  for (const b of s.beeps) {
    m.add(pluck(hz("A6"), 0.18), at(b), 0.16, 0.2, 0.2);
    m.add(pluck(hz("E6"), 0.18), at(b + 0.25), 0.16, -0.2, 0.2);
  }

  s.rumbles.forEach((r, i) => m.add(rumble(r.to - r.from, 11 + i), r.from, r.gain));

  m.duck(kicks, 0.35, 0.25);
  m.finish(1.2);
  m.write(file);
}
