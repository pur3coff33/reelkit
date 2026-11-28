// npx tsx apps/ozone/say.ts "word" "other spelling" …: the phonemes Kokoro will read for each spelling (British voices
// use espeak's "en", American "en-us"), so a name can be spelled until it reads right, without listening.
import { phonemize } from "phonemizer";

const words = process.argv.slice(2);
for (const w of words) {
  const [gb] = await phonemize(w, "en");
  const [us] = await phonemize(w, "en-us");
  console.log(`${w.padEnd(28)} en: ${gb.padEnd(30)} en-us: ${us}`);
}
