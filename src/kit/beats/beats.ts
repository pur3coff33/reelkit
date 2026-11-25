// The music's beats, for cutting on them: from the config's BPM and offset when it has them (exact for generated music),
// otherwise estimated from the track (onset strength, autocorrelation for the tempo, then the best-fitting phase).
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { join } from "node:path";
import type { ReelConfig } from "../config";
import { appDir, outDir } from "../paths";

export type Beats = { bpm: number; offset: number; beats: number[] };

export function grid(bpm: number, offset: number, seconds: number): number[] {
  const out: number[] = [];
  for (let t = offset; t <= seconds + 1e-9; t += 60 / bpm) out.push(Math.round(t * 1000) / 1000);
  return out;
}

/** The beat nearest to `t` (seconds). */
export function snap(t: number, beats: number[]): number {
  let best = beats[0] ?? t;
  for (const b of beats) if (Math.abs(b - t) < Math.abs(best - t)) best = b;
  return best;
}

const RATE = 11_025;
const HOP = 256;

/** Tempo and phase from a mono signal. */
export function detect(samples: Float32Array, rate = RATE): { bpm: number; offset: number } {
  // Onset strength: positive change in short-time energy.
  const frames = Math.floor(samples.length / HOP);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let e = 0;
    for (let i = 0; i < HOP; i++) e += samples[f * HOP + i] ** 2;
    energy[f] = Math.log1p(e * 100);
  }
  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f++) onset[f] = Math.max(0, energy[f] - energy[f - 1]);

  const fps = rate / HOP;
  // How well the onsets line up with themselves a few beats later (several lags sharpen the peak).
  const score = (bpm: number) => {
    let s = 0;
    for (const k of [1, 2, 4]) {
      const lag = (60 / bpm) * fps * k;
      for (let f = 0; f + lag < frames; f++) s += onset[f] * interp(onset, f + lag);
    }
    // A mild preference for the 90–140 range, where most pop tempos sit, to avoid halving/doubling.
    return s * (bpm >= 90 && bpm <= 140 ? 1.1 : 1);
  };
  let bestBpm = 120, bestScore = -1;
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const s = score(bpm);
    if (s > bestScore) [bestScore, bestBpm] = [s, bpm];
  }
  // Then tempo and phase together: a grid at the wrong tempo drifts off the onsets over the track, so the best-fitting
  // grid near the rough tempo pins both down.
  // Mostly the exact frame, a little of its neighbours: forgiving enough to find the grid, sharp enough not to tie.
  const peak = (x: number) => interp(onset, x) + 0.25 * (interp(onset, x - 1) + interp(onset, x + 1));
  let best = { bpm: bestBpm, phase: 0, score: -1 };
  for (let bpm = bestBpm - 1; bpm <= bestBpm + 1 + 1e-9; bpm += 0.05) {
    const period = (60 / bpm) * fps;
    for (let p = 0; p < period; p += 0.25) {
      let s = 0;
      for (let f = p; f < frames; f += period) s += peak(f);
      if (s > best.score) best = { bpm: Math.round(bpm * 100) / 100, phase: p, score: s };
    }
  }
  // The onset frame comes one hop after the energy rises; step back half a hop to centre on the hit.
  return { bpm: best.bpm, offset: Math.max(0, Math.round(((best.phase - 0.5) / fps) * 1000) / 1000) };
}

function interp(a: Float32Array, x: number) {
  const i = Math.floor(x), f = x - i;
  return (a[i] ?? 0) * (1 - f) + (a[i + 1] ?? 0) * f;
}

function decode(file: string): Promise<Float32Array> {
  const ffmpeg: string = createRequire(import.meta.url)("ffmpeg-static");
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, ["-hide_banner", "-i", file, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"]);
    const chunks: Buffer[] = [];
    p.stdout.on("data", (c) => chunks.push(c));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`could not decode ${file}`));
      const b = Buffer.concat(chunks);
      resolve(new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4)));
    });
  });
}

export async function writeBeats(config: ReelConfig) {
  let { bpm, offset } = config.music;
  if (bpm === undefined) {
    const found = detect(await decode(join(appDir(config.app), config.music.file)));
    bpm = found.bpm;
    offset = offset ?? found.offset;
    console.log(`  detected ${bpm} BPM, first beat at ${offset}s (set music.bpm/offset in reel.config.ts to override)`);
  }
  const beats: Beats = { bpm, offset: offset ?? 0, beats: grid(bpm, offset ?? 0, config.seconds) };
  writeFileSync(outDir(config.app, "beats.json"), JSON.stringify(beats, null, 2));
  console.log(`  ${beats.beats.length} beats at ${bpm} BPM`);
}
