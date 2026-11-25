// The kop.it reel's music, written for its beat grid (timeline.ts), in D major. The coin falls on a run of plucks and
// lands on a hit, the plant rises and flowers; then sections that follow the scenes: a warm four-on-the-floor groove
// (match cut, logging), the groove for the missions (a rising pluck per tick, a chord for the flower), a drumless
// household, a dreamy night, the groove for History and the gallery, a lighter morning-note beat, the logo's hit, and a
// soft outro under it.
import { BPM, CUES, SCENES, TOTAL_BEATS } from "./timeline";
import { Mix, bass, chord, clap, hat, hz, impact, kick, pluck, riser } from "../../src/kit/music/synth";

const B = 60 / BPM; // seconds per beat
const at = (beat: number) => beat * B;
const chordOf = (names: string) => names.split(" ").map(hz);

const D = "D3 F#3 A3 D4", Bm = "B2 D3 F#3 B3", G = "G2 B2 D3 G3", A = "A2 C#3 E3 A3";
/** Two beats per chord, round and round. */
const PROGRESSION = [D, A, Bm, G];
const chordAt = (beat: number) => PROGRESSION[Math.floor(beat / 2) % PROGRESSION.length];

/** Arpeggio notes for each chord, an octave up. */
const ARP: Record<string, string[]> = {
  [D]: ["D5", "A5", "F#5", "A5"],
  [A]: ["C#5", "A5", "E5", "A5"],
  [Bm]: ["D5", "B5", "F#5", "B5"],
  [G]: ["D5", "B5", "G5", "B5"],
};

export async function writeMusic(file: string) {
  const m = new Mix(TOTAL_BEATS * B);
  const kicks: number[] = [];

  const hit = (beat: number, big = false) => {
    m.add(kick(1.4), at(beat), 1.0);
    m.add(impact(), at(beat), big ? 0.8 : 0.5);
    m.add(clap(), at(beat), 0.25, 0, 0.4);
    kicks.push(at(beat));
  };

  /** Kick on every beat, clap on the offbeat beats, hats in between, bass in eighths, a pad per chord. */
  const groove = (from: number, to: number, opts: { kick?: boolean; pad?: number } = {}) => {
    for (let b = from; b < to; b++) {
      if (opts.kick !== false) {
        m.add(kick(), at(b), 0.9);
        kicks.push(at(b));
      }
      if (b % 2 === 1) m.add(clap(), at(b), opts.kick === false ? 0.3 : 0.42, 0, 0.3);
      m.add(hat(), at(b + 0.5), 0.2, 0.3);
      m.add(hat(), at(b + 0.25), 0.07, -0.3);
      m.add(hat(), at(b + 0.75), 0.07, -0.3);
    }
    for (let b = from; b < to; b += 2) {
      const c = chordAt(b), len = Math.min(2, to - b);
      const root = chordOf(c)[0] / 2;
      for (let e = b; e < b + len; e += 0.5) m.add(bass(root * (e % 1 ? 2 : 1), B * 0.45), at(e), 0.48);
      m.add(chord(chordOf(c), at(len), { attack: 0.05, bright: 1800 }), at(b), opts.pad ?? 0.3, 0, 0.6);
    }
  };

  /** Plucked arpeggio in eighths over the chords. */
  const arpeggio = (from: number, to: number, gain = 0.13, octave = 1) => {
    for (let b = from; b < to; b += 0.5) {
      const notes = ARP[chordAt(b)];
      m.add(pluck(hz(notes[Math.round((b - from) * 2) % 4]) * octave, 0.6), at(b), gain, (b * 2) % 2 ? 0.45 : -0.45, 0.6);
    }
  };

  /** A soft lift into a new section: an open hat and a low boom. */
  const lift = (beat: number) => {
    m.add(hat(true), at(beat), 0.14, 0.2, 0.5);
    m.add(impact(), at(beat), 0.25);
  };

  // Hook: the coin falls on a run of falling plucks over a swelling A pad, lands on a hit, then the plant rises on
  // climbing plucks and flowers with a shimmer. A riser carries it into the match cut.
  m.add(chord(chordOf(A), at(2), { attack: 1.2, bright: 1200 }), 0, 0.3, 0, 0.6);
  ["A6", "F#6", "E6", "D6", "C#6", "A5", "F#5", "D5"].forEach((n, i) => m.add(pluck(hz(n), 0.45), at(i * 0.25), 0.18, i % 2 ? 0.4 : -0.4, 0.5));
  hit(CUES.coinLand);
  m.add(chord(chordOf(D).map((f) => f * 2), 0.6, { bright: 4200 }), at(CUES.coinLand), 0.5, 0, 0.5);
  m.add(bass(hz("D2"), 0.9), at(CUES.coinLand), 0.55);
  m.add(chord(chordOf(D), at(SCENES.hook.to - CUES.coinLand), { attack: 0.4, bright: 1500 }), at(CUES.coinLand), 0.3, 0, 0.6);
  ["D5", "F#5", "A5", "D6"].forEach((n, i) => m.add(pluck(hz(n), 0.5), at(CUES.sprout + i * 0.5), 0.3, i % 2 ? 0.3 : -0.3, 0.4));
  ["D6", "F#6", "A6", "D7", "F#7"].forEach((n, i) => m.add(pluck(hz(n), 0.8), at(CUES.hookFlower) + i * 0.045, 0.22, i % 2 ? 0.5 : -0.5, 0.6));
  m.add(riser(at(1.5)), at(SCENES.hook.to - 1.5), 0.3, 0, 0.3);

  // Match cut and logging: in on a hit, the groove, the arpeggio over logging, a chime for "even offline".
  hit(SCENES.match.from);
  groove(SCENES.match.from + 1, SCENES.add.to);
  arpeggio(SCENES.add.from, SCENES.add.to, 0.09);
  lift(SCENES.add.from);
  ["A6", "D7"].forEach((n, i) => m.add(pluck(hz(n), 0.6), at(CUES.offline) + i * 0.08, 0.2, 0, 0.6));

  // Missions: a hit, three rising ticks and the flower.
  hit(SCENES.garden.from);
  groove(SCENES.garden.from + 1, SCENES.garden.to);
  ["A5", "B5", "D6"].forEach((n, i) => m.add(pluck(hz(n), 0.5), at(CUES.ticks[i]), 0.42, 0, 0.35));
  ["D6", "F#6", "A6"].forEach((n, i) => m.add(pluck(hz(n), 0.8), at(CUES.flower) + i * 0.03, 0.3, i - 1, 0.6));

  // Household: drums drop out, the arpeggio carries it, a pluck for each person.
  groove(SCENES.people.from, SCENES.people.to, { kick: false, pad: 0.36 });
  arpeggio(SCENES.people.from, SCENES.people.to, 0.15);
  ["F#6", "A6"].forEach((n, i) => m.add(pluck(hz(n), 0.7), at(CUES.people[i]), 0.26, i ? 0.4 : -0.4, 0.6));

  // Night: no drums, a dark soft pad, high plucks like fireflies.
  for (let b = SCENES.night.from; b < SCENES.night.to; b += 2) {
    const c = chordAt(b);
    m.add(chord(chordOf(c), at(2.4), { attack: 0.3, bright: 1100 }), at(b), 0.5, 0, 0.8);
    m.add(bass(chordOf(c)[0] / 2, at(2) * 0.95), at(b), 0.28);
  }
  ["A6", "F#6", "D7", "B6", "A6", "E7", "D7", "A6"].forEach((n, i) => m.add(pluck(hz(n), 1.0), at(SCENES.night.from + 0.25 + i * 0.7), 0.2, i % 2 ? 0.6 : -0.6, 0.8));
  lift(SCENES.night.from);
  m.add(riser(at(2)), at(SCENES.night.to - 2), 0.25, 0, 0.3);

  // History: the groove again, with the arpeggio.
  hit(SCENES.history.from);
  groove(SCENES.history.from + 1, SCENES.history.to);
  arpeggio(SCENES.history.from, SCENES.history.to, 0.08);

  // Gallery: sixteenth-note arpeggio climbing, over the groove.
  groove(SCENES.gallery.from, SCENES.gallery.to, { pad: 0.24 });
  const climb = ["D5", "F#5", "A5", "D6", "F#5", "A5", "D6", "F#6", "E5", "A5", "C#6", "E6", "A5", "C#6", "E6", "A6"];
  climb.forEach((n, i) => m.add(pluck(hz(n), 0.35), at(SCENES.gallery.from + i * 0.25), 0.2, i % 2 ? 0.4 : -0.4, 0.4));

  // The morning note: lighter (no kick), a soft shimmer, and a riser into the logo.
  groove(SCENES.note.from, SCENES.note.to, { kick: false, pad: 0.3 });
  ["A6", "D7", "F#7"].forEach((n, i) => m.add(pluck(hz(n), 0.7), at(SCENES.note.from + 0.25) + i * 0.05, 0.18, i % 2 ? 0.5 : -0.5, 0.6));
  m.add(riser(at(SCENES.note.to - SCENES.note.from)), at(SCENES.note.from), 0.3, 0, 0.3);

  m.duck(kicks, 0.45);

  // Logo: one big hit and a ringing D chord (added after ducking, so it rings out clean)...
  hit(CUES.final, true);
  m.add(kick(1.4), at(CUES.final), 0.6);
  m.add(chord(chordOf(D).concat(chordOf(D).map((f) => f * 2)), at(3), { attack: 0.01, bright: 3000 }), at(CUES.final), 0.5, 0, 0.8);
  ["D5", "A5", "D6", "F#6"].forEach((n, i) => m.add(pluck(hz(n), 1.5), at(CUES.final) + i * 0.02, 0.25, i % 2 ? 0.4 : -0.4, 0.8));
  m.add(bass(hz("D2"), 1.4), at(CUES.final), 0.6);

  // ...then the outro while it holds: slow pads round the progression, a gentle pluck pattern, a soft bass.
  for (let b = CUES.final + 2; b < TOTAL_BEATS; b += 2) {
    const c = chordAt(b), len = Math.min(2, TOTAL_BEATS - b);
    m.add(chord(chordOf(c), at(len + 0.5), { attack: 0.35, bright: 1300 }), at(b), 0.3, 0, 0.7);
    m.add(bass(chordOf(c)[0] / 2, at(len) * 0.95), at(b), 0.3);
  }
  arpeggio(CUES.final + 2, TOTAL_BEATS, 0.12);
  m.add(hat(true), at(CUES.final + 2), 0.08, 0.2, 0.5);

  m.finish(1.8);
  m.write(file);
  console.log(`  wrote ${file} (${m.seconds}s, ${BPM} BPM)`);
}
