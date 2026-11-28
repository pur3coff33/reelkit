// The voice-over: one WAV per line with Kokoro (kokoro-js, on the CPU, no API key), and voice.json with each line's
// length so the reel can time scenes and captions to it. The model is downloaded once and cached.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import type { ReelConfig } from "../config";
import { ensureOut } from "../paths";

/** `seconds`: until the speech ends. `lead`: the silence before it starts (captions should wait for it). */
export type VoiceManifest = { voice: string; lines: { id: string; caption: string; beat: number; file: string; seconds: number; lead: number }[] };

/** Ids that name the same file on a case-insensitive disk (Windows, macOS): "a1" and "A1" would overwrite each other. */
export function clashingIds(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const k = id.toLowerCase(), dup = seen.has(k);
    seen.add(k);
    return dup;
  });
}

/** Seconds of near-silence before the speech starts. */
export function speechStart(samples: Float32Array, rate: number) {
  let i = 0;
  while (i < samples.length && Math.abs(samples[i]) < 0.01) i++;
  return i < samples.length ? i / rate : 0;
}

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

/** "af_heart" or "af_heart:0.7,af_bella:0.3" → voices with weights that add up to 1 (a missing weight counts as 1). */
export function parseVoice(spec: string) {
  const parts = spec.split(",").map((p) => p.trim()).filter(Boolean).map((p) => {
    const [name, w] = p.split(":").map((x) => x.trim());
    const weight = w === undefined ? 1 : Number(w);
    if (!name || !(weight > 0)) throw new Error(`voice "${spec}": "${p}" should be name or name:weight with a weight above 0`);
    return { name, weight };
  });
  if (!parts.length) throw new Error("voice name is empty");
  const total = parts.reduce((a, p) => a + p.weight, 0);
  return parts.map((p) => ({ name: p.name, weight: p.weight / total }));
}

/** A folder-safe form of a voice spec ("af_heart:0.7,af_bella:0.3" → "af_heart-0.7-af_bella-0.3"). */
export const voiceSlug = (spec: string) => spec.replace(/[^\w.]+/g, "-").replace(/^-|-$/g, "");

/** Weighted sum of style tables (Kokoro's voice files: 510 rows × 256, one row per input length). */
export function blendStyles(tables: Float32Array[], weights: number[]) {
  const out = new Float32Array(tables[0].length);
  tables.forEach((t, k) => {
    if (t.length !== out.length) throw new Error("voice files differ in size");
    for (let i = 0; i < out.length; i++) out[i] += weights[k] * t[i];
  });
  return out;
}

function voiceTable(name: string) {
  const dist = dirname(createRequire(import.meta.url).resolve("kokoro-js"));
  const buf = readFileSync(join(dist, "..", "voices", `${name}.bin`));
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

/** Renders every line. `voiceName` overrides the config's voice (e.g. its `compare` one) into out/voice-<name>/. `under`
 *  puts the folder (and its .json) inside out/<under>/, for films made in parts (apps/ozone/parts). */
export async function voice(config: ReelConfig, voiceName?: string, under?: string) {
  const { KokoroTTS } = await import("kokoro-js");
  const clash = clashingIds(config.voice.lines.map((l) => l.id));
  if (clash.length) throw new Error(`voice line ids ${clash.join(", ")} clash with others that differ only in case: their WAVs would overwrite each other`);
  const name = voiceName || config.voice.name;
  const folder = (under ? `${under}/` : "") + (name === config.voice.name ? "voice" : `voice-${voiceSlug(name)}`);
  const parts = parseVoice(name);
  const dir = ensureOut(config.app, folder);
  console.log(`  loading Kokoro (${MODEL}), voice ${name}`);
  const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "fp32", device: "cpu" });
  const unknown = parts.filter((p) => !(p.name in tts.voices)).map((p) => p.name);
  if (unknown.length) throw new Error(`unknown voice ${unknown.join(", ")}; voices: ${Object.keys(tts.voices).join(", ")}`);
  if (parts.length > 1) await useBlend(tts, parts);
  const manifest: VoiceManifest = { voice: name, lines: [] };
  for (const line of config.voice.lines) {
    // A blend reads with the first voice's accent (en-us for a…, en-gb for b…). A line with [word](/ipa/) in it is
    // turned into phonemes here, so those words are read as written; any other line goes through kokoro-js unchanged.
    const opts = { voice: parts[0].name as never, speed: line.speed ?? config.voice.speed };
    const audio = hasIpa(line.text)
      ? await tts.generate_from_ids(tts.tokenizer(await phonemesOf(line.text, parts[0].name[0] === "a" ? "en-us" : "en"), { truncation: true }).input_ids, opts)
      : await tts.generate(line.text, opts);
    const file = join(dir, `${line.id}.wav`);
    await audio.save(file);
    const seconds = trimmedLength(audio.audio, audio.sampling_rate);
    manifest.lines.push({ id: line.id, caption: line.caption, beat: line.beat, file: `out/${folder}/${line.id}.wav`, seconds, lead: speechStart(audio.audio, audio.sampling_rate) });
    console.log(`  ${line.id}: ${seconds.toFixed(2)}s${line.speed ? ` @${line.speed}` : ""}  "${line.text}"`);
  }
  writeFileSync(join(dir, "..", `${basename(folder)}.json`), JSON.stringify(manifest, null, 2));
  if (!voiceName && config.voice.compare) console.log(`  (compare with: npm run voice -- ${config.app} --voice ${config.voice.compare})`);
}

/** Makes `tts` speak with a blend of voices. kokoro-js has no blend option, so this replaces its last step (the same code
 *  as its `generate_from_ids`, with the blended style table instead of one voice's). */
async function useBlend(tts: { model: unknown; generate_from_ids: unknown }, parts: { name: string; weight: number }[]) {
  const { Tensor, RawAudio } = await import("@huggingface/transformers");
  const table = blendStyles(parts.map((p) => voiceTable(p.name)), parts.map((p) => p.weight));
  const model = tts.model as (inputs: Record<string, unknown>) => Promise<{ waveform: { data: Float32Array } }>;
  tts.generate_from_ids = async (ids: { dims: number[] }, { speed = 1 }: { speed?: number } = {}) => {
    const row = 256 * Math.min(Math.max(ids.dims.at(-1)! - 2, 0), 509);
    const style = new Tensor("float32", table.slice(row, row + 256), [1, 256]);
    const { waveform } = await model({ input_ids: ids, style, speed: new Tensor("float32", [speed], [1]) });
    return new RawAudio(waveform.data, 24000);
  };
  console.log(`  blend: ${parts.map((p) => `${p.name} ${Math.round(p.weight * 100)}%`).join(" + ")}`);
}

// ── Pronunciations ────────────────────────────────────────────────────────────────────────────────────

/** `[Timog](/tiˈmoɡ/)`: a word read from the phonemes given (Kokoro's IPA, as `apps/ozone/say.ts` prints it). */
const IPA = /\[([^\]]+)\]\(\/([^/]+)\/\)/g;
export const hasIpa = (text: string) => /\[[^\]]+\]\(\/[^/]+\/\)/.test(text);
/** The text as plain runs and given pronunciations, in order. */
export function splitIpa(text: string): ({ text: string } | { ipa: string })[] {
  const out: ({ text: string } | { ipa: string })[] = [];
  let at = 0;
  for (const m of text.matchAll(IPA)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ ipa: m[2] });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

const PUNCT = ';:,.!?¡¿—…"«»“”(){}[]';
const PUNCT_RUN = new RegExp(`(\\s*[${PUNCT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]+\\s*)+`, "g");

/** Phonemes for a line, as kokoro-js makes them (punctuation kept, espeak for the words, the same clean-up after), with any
 *  [word](/ipa/) taken as given. Only for lines without numbers or abbreviations: kokoro-js's own text clean-up is skipped. */
export async function phonemesOf(text: string, lang: "en" | "en-us") {
  const { phonemize } = await import("phonemizer");
  const plain = async (t: string) => {
    let out = "", at = 0;
    for (const m of t.matchAll(PUNCT_RUN)) {
      if (m.index > at) out += (await phonemize(t.slice(at, m.index), lang)).join(" ");
      out += m[0];
      at = m.index + m[0].length;
    }
    if (at < t.length) out += (await phonemize(t.slice(at), lang)).join(" ");
    return out;
  };
  let s = "";
  for (const part of splitIpa(text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'))) {
    if ("ipa" in part) s += part.ipa;
    else {
      const lead = /^\s/.test(part.text) ? " " : "", tail = /\s$/.test(part.text) ? " " : "";
      const body = part.text.trim() ? await plain(part.text.trim()) : "";
      s += (body ? lead + body + tail : lead || tail);
    }
  }
  s = s.replace(/ʲ/g, "j").replace(/r/g, "ɹ").replace(/x/g, "k").replace(/ɬ/g, "l").replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, "z").replace(/  +/g, " ");
  if (lang === "en-us") s = s.replace(/(?<=nˈaɪn)ti(?!ː)/g, "di");
  return s.trim();
}

/** Seconds until the speech really ends (Kokoro leaves a little silence at the end). */
function trimmedLength(samples: Float32Array, rate: number) {
  let end = samples.length - 1;
  while (end > 0 && Math.abs(samples[end]) < 0.01) end--;
  return Math.min(samples.length, end + Math.round(rate * 0.05)) / rate;
}
