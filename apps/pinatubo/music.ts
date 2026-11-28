// The soundtrack: the narration over a score cut from four Kevin MacLeod cues (CC BY 4.0), one per act, so the music
// follows the story instead of running under it:
//   the sleeping mountain   "Lightless Dawn"       a dark, quiet drone
//   the warning, the exodus "Echoes of Time v2"    a pulse that climbs
//   the eruption            "Despair and Triumph"  its climax, hitting on the cut to the column after a beat of silence
//   the aftermath           "Heart of Nowhere"     mournful, thinning to almost nothing on "Hundreds died."
//   the warnings worked     "Despair and Triumph"  its later lift, through the title
// Each cue is set to the same loudness, then given its act's level; they cross over 1.2 s (the eruption cuts hard).
// The music leans back under the voice. Effects are drawn in code (nothing to license).
import { readFileSync } from "node:fs";
import { staleLines } from "../../src/kit/doc/timing";
import { leanBack, readVoice } from "../../src/kit/music/narration";
import { parseWav } from "../../src/kit/music/sampler";
import { blast, boom, swell } from "../../src/kit/music/sfx";
import { Session, lufs } from "../../src/kit/music/studio";
import { SR, writeWav } from "../../src/kit/music/synth";
import { buzz, river, thunder } from "../../src/kit/whatif/campsound";
import { appDir, outDir } from "../../src/kit/paths";
import { LAYOUT } from "./layout.gen";
import { config } from "./reel.config";
import { LINES } from "./script";

const shot = (id: string) => {
  const s = LAYOUT.shots.find((x) => x.id === id);
  if (!s) throw new Error(`no shot ${id}`);
  return s;
};

/** A cue: `src` seconds into track `id`, placed from film time `from` to `to`, at `db` relative to the others.
 *  `fadeIn`/`fadeOut`: seconds of crossfade at each end (0 = a hard cut). */
type Cue = { id: string; src: number; from: number; to: number; db: number; fadeIn: number; fadeOut: number };

function cueSheet(): Cue[] {
  const at = (id: string) => shot(id).from;
  const exploded = at("height"); // "…it exploded." lands on the cut to the column
  const saved = LAYOUT.lines.saved;
  return [
    { id: "dawn", src: 8, from: 0, to: at("zones") + 0.6, db: -4, fadeIn: 1.5, fadeOut: 1.2 },
    { id: "echoes", src: 6, from: at("zones") - 0.6, to: exploded - 1.1, db: -1.5, fadeIn: 1.2, fadeOut: 0.5 },
    { id: "despair", src: 168, from: exploded, to: at("subic") + 0.6, db: 2, fadeIn: 0, fadeOut: 1.2 },
    { id: "heart", src: 62, from: at("subic") - 0.6, to: saved + 0.4, db: -2, fadeIn: 1.2, fadeOut: 0.8 },
    { id: "despair", src: 186, from: saved - 0.2, to: config.seconds, db: -1, fadeIn: 1.0, fadeOut: 2.2 },
  ].map((c) => ({ ...c, from: Math.max(0, c.from) }));
}

const tracks = new Map<string, [Float32Array, Float32Array]>();
function track(id: string): [Float32Array, Float32Array] {
  const hit = tracks.get(id);
  if (hit) return hit;
  const media = JSON.parse(readFileSync(outDir("pinatubo", "media.json"), "utf8")) as Record<string, { wav?: string }>;
  if (!media[id]?.wav) throw new Error(`no mix copy of ${id}: run npm run fetch -- pinatubo`);
  const wav = parseWav(readFileSync(`${appDir("pinatubo")}/${media[id].wav}`));
  if (wav.rate !== SR) throw new Error(`${id} is ${wav.rate} Hz, the mix is ${SR}`);
  const out: [Float32Array, Float32Array] = [wav.channels[0], wav.channels[1] ?? wav.channels[0]];
  tracks.set(id, out);
  return out;
}

/** The cue's audio: its stretch of the track, brought to −20 LUFS (capped by its peaks), then its act's level, with its fades. */
function render(c: Cue): [Float32Array, Float32Array] {
  const [l, r] = track(c.id);
  const from = Math.round(c.src * SR), n = Math.round((c.to - c.from) * SR);
  const L = l.slice(from, from + n), R = r.slice(from, from + n);
  // Level by loudness, but never let a cue's own hits (the climax's drums) peak past −8 dBFS before the mix:
  // otherwise the limiter flattens the impact it's meant to carry.
  const raw = L.reduce((m, v, i) => Math.max(m, Math.abs(v), Math.abs(R[i])), 1e-6);
  const g = Math.min(10 ** ((-20 - lufs(L, R) + c.db) / 20), 10 ** (-8 / 20) / raw);
  const fi = c.fadeIn * SR, fo = c.fadeOut * SR;
  for (let i = 0; i < L.length; i++) {
    const k = g * (fi ? Math.min(1, i / fi) : 1) * (fo ? Math.min(1, (L.length - i) / fo) : 1);
    L[i] *= k;
    R[i] *= k;
  }
  if (process.env.CUE_PEAKS) {
    const pk = L.reduce((m, v, i) => Math.max(m, Math.abs(v), Math.abs(R[i])), 0);
    console.log(`  peak ${c.id}@${c.src}: ${(20 * Math.log10(pk)).toFixed(1)} dBFS, gain ${(20 * Math.log10(g)).toFixed(1)} dB`);
  }
  return [L, R];
}

/** A narrator's compressor: above −22 dBFS, every 3 dB in gives 1 dB out (5 ms attack, 120 ms release). Evens the
 *  read and tames consonant spikes, so the limiter isn't left to flatten the voice. */
function compress(x: Float32Array, thresholdDb = -22, ratio = 3) {
  const out = new Float32Array(x.length), th = 10 ** (thresholdDb / 20);
  const att = Math.exp(-1 / (0.005 * SR)), rel = Math.exp(-1 / (0.12 * SR));
  let env = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
    const gain = env > th ? (th * (env / th) ** (1 / ratio)) / env : 1;
    out[i] = x[i] * gain;
  }
  return out;
}

export async function writeMusic(file: string) {
  const seconds = config.seconds;
  const recorded = (JSON.parse(readFileSync(outDir("pinatubo", "voice.json"), "utf8")) as { lines: { id: string; seconds: number }[] }).lines;
  const stale = staleLines(LAYOUT.spoken, recorded);
  if (stale.length) throw new Error(`the voice changed since the layout (${stale.join(", ")}): run npx tsx apps/pinatubo/layout.ts first`);
  const lines = readVoice("pinatubo", LINES.map((l) => ({ ...l, beat: LAYOUT.lines[l.id] })));
  const s = new Session(seconds, 15);

  const voice = s.stem("voice", { lufs: -16.5, low: 70, high: 11000, hall: { seconds: 2.2, mix: 0.1, gap: 0.03 } });
  for (const l of lines) voice.add(compress(l.sound), l.at);

  const music = s.stem("music", { lufs: -22.5 });
  for (const c of cueSheet()) music.add(render(c), c.from);
  // Under "Hundreds died." the music all but stops; it leans back under every other line.
  const died = LAYOUT.lines.died;
  music.ride([...leanBack(lines, 0.5)].map(([t, v]): [number, number] => [t, t > died - 0.3 && t < LAYOUT.lines.saved ? Math.min(v, 0.18) : v]));

  const fx = s.stem("effects", { lufs: -26.5, high: 9000 });
  fx.add(thunder(6, 4, 0.15), 0, 0.8);
  fx.add(buzz(2.4, 7), shot("watched").from + 0.3, 0.25);
  const exploded = shot("height").from;
  fx.add(swell(1.1, 11), exploded - 1.1, 0.5);
  fx.add(blast(4, 3), exploded, 0.8);
  fx.add(boom(1.4, 5), exploded, 0.8);
  const storm = shot("storm").from;
  fx.add(river(6, 21, 0.7), storm, 0.6);
  fx.add(thunder(4, 9, 0.8), storm + 1.2, 0.8);
  fx.add(river(5, 23, 0.4), shot("subic").from, 0.3);
  fx.add(boom(0.8, 13), shot("title").from, 0.55);

  // −18 here, with headroom for speech peaks; export brings the finished file to −14 LUFS.
  const { L, R, reduced, loudness } = s.master({ target: -18, fade: 2 });
  writeWav(file, L, R);
  console.log(`  music.wav: ${seconds} s, ${loudness.toFixed(1)} LUFS, limiter took ${reduced.toFixed(1)} dB`);
  for (const c of cueSheet()) console.log(`  ${c.id.padEnd(8)} ${c.from.toFixed(2).padStart(6)}–${c.to.toFixed(2).padStart(6)} s  (from ${c.src} s of the track, ${c.db >= 0 ? "+" : ""}${c.db} dB)`);
}
