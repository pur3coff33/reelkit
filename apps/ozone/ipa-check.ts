// npx tsx apps/ozone/ipa-check.ts: checks that phonemesOf (the voice step's [word](/ipa/) path) gives the same phonemes as
// kokoro-js for lines without markup, then shows the marked-up lines.
import { KokoroTTS, TextSplitterStream } from "kokoro-js";
import { phonemesOf } from "../../src/kit/voice/kokoro";
import { SCRIPT as OPEN } from "./parts/00-open/script";
import { SCRIPT as BIRDLAND } from "./parts/01-birdland/script";
import { SCRIPT as FIFTEEN } from "./parts/04-fifteen/script";

const LINES = [...OPEN.lines, ...BIRDLAND.lines, ...FIFTEEN.lines];

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
let same = 0, diff = 0;
for (const l of LINES) {
  const plain = l.text.replace(/\[([^\]]+)\]\(\/[^/]+\/\)/g, "$1");
  let theirs = "";
  // A closed splitter, so the stream ends; join its sentences' phonemes as one line.
  const split = new TextSplitterStream();
  split.push(plain);
  split.close();
  for await (const chunk of tts.stream(split, { voice: "bm_fable" })) theirs += (theirs ? " " : "") + chunk.phonemes;
  const ours = await phonemesOf(plain, "en");
  if (ours === theirs) same++;
  else { diff++; console.log(`DIFF ${l.id}\n  kokoro: ${theirs}\n  ours:   ${ours}`); }
  if (plain !== l.text) console.log(`${l.id} with pronunciations: ${await phonemesOf(l.text, "en")}`);
}
console.log(`${same} same, ${diff} different`);
