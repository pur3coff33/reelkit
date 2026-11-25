// For narrated films whose music.ts mixes the voice in: the voice lines as sound, the music leaning back under them, air for
// a change of shape, and a hum to sit underneath. Used by apps/strangers and apps/cosmic-egg.
import { existsSync, readFileSync } from "node:fs";
import type { VoiceLine } from "../config";
import { appDir, outDir } from "../paths";
import { parseWav } from "./sampler";
import { seeded } from "./studio";
import { SR, svf } from "./synth";

export type Spoken = { id: string; at: number; seconds: number; sound: Float32Array };

/** Each line as the voice step left it, at the mix's sample rate, with when it starts. */
export function readVoice(app: string, lines: VoiceLine[]): Spoken[] {
  const file = outDir(app, "voice.json");
  if (!existsSync(file)) throw new Error(`no voice yet: run npm run voice -- ${app} first`);
  const made = (JSON.parse(readFileSync(file, "utf8")) as { lines: { id: string; file: string; seconds: number }[] }).lines;
  return lines.map((l) => {
    const v = made.find((x) => x.id === l.id);
    if (!v) throw new Error(`line ${l.id} has no voice: run npm run voice -- ${app} again`);
    const wav = parseWav(readFileSync(`${appDir(app)}/${v.file}`)), x = wav.channels[0], k = wav.rate / SR;
    const out = new Float32Array(Math.floor((x.length - 1) / k));
    for (let i = 0; i < out.length; i++) {
      const p = i * k, j = Math.floor(p);
      out[i] = x[j] + ((x[j + 1] ?? 0) - x[j]) * (p - j);
    }
    return { id: l.id, at: l.beat, seconds: v.seconds, sound: out };
  });
}

/** How loud the music is: down to `low` while he speaks, easing over half a second either side. Keys for `Stem.ride`. */
export function leanBack(lines: { at: number; seconds: number }[], low: number): [number, number][] {
  const keys: [number, number][] = [[0, 1]];
  const E = 0.55;
  for (const l of lines) {
    const from = l.at - 0.35, to = l.at + l.seconds;
    const last = keys[keys.length - 1];
    // Sentences close together: stay down between them.
    if (last[0] > from - E - 0.5 && keys.length > 1) {
      keys.pop();
      keys[keys.length - 1] = [Math.max(keys[keys.length - 1][0], to - 0.01), low];
    } else keys.push([Math.max(0.01, from - E), 1], [from, low], [to - 0.01, low]);
    keys.push([to + 0.8, 1]);
  }
  return keys;
}

/** Air: noise through a band that rises and falls, for one thing turning into another. */
export function air(seconds: number, seed: number) {
  const r = seeded(seed), n = Math.round(seconds * SR);
  const raw = Float32Array.from({ length: n }, (_, i) => (r() * 2 - 1) * Math.sin((Math.PI * i) / n) ** 2.4);
  return svf(raw, (t) => 350 + 2200 * Math.sin((Math.PI * t) / seconds) ** 2, 1.1, "band");
}

/** A hum underneath: a root (D by default), its fifth and octave, beating slowly against themselves. */
export function hum(seconds: number, detune: number, root = 73.42) {
  let a = 0, b = 0, c = 0;
  return Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => {
    const t = i / SR;
    a += (2 * Math.PI * (root + detune)) / SR;
    b += (2 * Math.PI * (root * 1.4996 - detune * 0.7)) / SR;
    c += (2 * Math.PI * (root * 2 + detune * 1.6)) / SR;
    const breath = 0.72 + 0.28 * Math.sin((2 * Math.PI * t) / 8 - 1.3);
    return breath * Math.min(1, t / 2) * (Math.sin(a) + 0.35 * Math.sin(2 * a) + 0.14 * Math.sin(3 * a) + 0.42 * Math.sin(b) + 0.3 * Math.sin(c));
  });
}
