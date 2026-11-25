// The narration: the girl telling her own story in Tagalog, one file per on-screen line, read by ElevenLabs (Eleven v3,
// whose [tags] set the delivery). Kokoro has no Tagalog. Writes out/voice/<i>.wav (48 kHz mono) and out/voice.json.
// Lines already read with the same text and voice are kept, so re-running costs nothing.
// Needs ELEVENLABS_API_KEY in the environment or in reelkit/.env. `--fresh` reads every line again.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { duration, ffmpeg } from "../../src/kit/ffmpeg";
import { ROOT, ensureOut, outDir } from "../../src/kit/paths";
import { LINES } from "./timeline";

/** Sarah, one of ElevenLabs' own voices (usable on the free plan). */
export const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MODEL = "eleven_v3";

/** What she says for each line of LINES (same order), with the delivery tags. */
export const SPOKEN: string[] = [
  "[whispers] Sabi ni Lola,",
  "[whispers] kapag may ilaw na lumulutang sa gabi...",
  "[whispers] huwag mong sundan.",
  "Pista noon sa amin.",
  "[softly] Suot ko ang bagong tsinelas na bigay ni Lola.",
  "Hatinggabi na nang umuwi ako.",
  "Mag-isa ako sa pilapil.",
  "[curious] May ilaw sa unahan.",
  "Akala ko si Kuya, sinusundo ako.",
  "[shouts] Kuya!",
  "[nervous] Hindi siya sumagot.",
  "Sinundan ko pa rin.",
  "Limang minuto lang dapat ang lakad pauwi.",
  "[nervous] Pero hindi ko na matanaw ang bahay namin.",
  "Dinaanan ko ang tulay na kawayan.",
  "[nervous] Dinaanan ko ulit.",
  "[whispers] Tumahimik ang mga palaka.",
  "[whispers] Pati ang mga kuliglig.",
  "[scared] Hindi pala flashlight.",
  "[screams] Apoy!",
  "[sad] Dinala ako nito sa ilog.",
  "[sad] Naalala ko si Lola.",
  "[whispers] Huli na.",
  "[sad] Kinabukasan... tsinelas ko lang ang nakita nila.",
  "[whispers] Kaya kapag may nakita kang ilaw...",
  "[whispers] huwag mong sundan.",
];

export type VoiceTake = { i: number; file: string; seconds: number; hash: string };

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const env = join(ROOT, ".env");
  const m = existsSync(env) ? /ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/.exec(readFileSync(env, "utf8")) : null;
  if (!m) throw new Error("ELEVENLABS_API_KEY is not set (environment or reelkit/.env)");
  return m[1].trim();
}

export async function writeVoice(flags: string[] = []) {
  if (SPOKEN.length !== LINES.length) throw new Error(`SPOKEN has ${SPOKEN.length} lines, LINES has ${LINES.length}`);
  const dir = ensureOut("santelmo", "voice");
  const index = outDir("santelmo", "voice.json");
  const old: VoiceTake[] = existsSync(index) && !flags.includes("--fresh") ? JSON.parse(readFileSync(index, "utf8")) : [];
  const key = apiKey();
  const takes: VoiceTake[] = [];
  for (let i = 0; i < SPOKEN.length; i++) {
    const hash = createHash("sha1").update(`${VOICE_ID}|${MODEL}|${SPOKEN[i]}`).digest("hex").slice(0, 12);
    const wav = join(dir, `${String(i).padStart(2, "0")}.wav`);
    const kept = old.find((t) => t.i === i && t.hash === hash);
    if (kept && existsSync(wav)) {
      takes.push(kept);
      continue;
    }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: SPOKEN[i], model_id: MODEL, language_code: "fil" }),
    });
    if (!res.ok) throw new Error(`line ${i}: ElevenLabs ${res.status} ${(await res.text()).slice(0, 200)}`);
    const mp3 = join(dir, `${String(i).padStart(2, "0")}.mp3`);
    writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
    // Trimmed of leading and trailing silence, so the line starts when its caption does.
    await ffmpeg(["-i", mp3, "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
    rmSync(mp3);
    const seconds = await duration(wav);
    takes.push({ i, file: `out/voice/${String(i).padStart(2, "0")}.wav`, seconds, hash });
    console.log(`  ${String(i).padStart(2)}  ${seconds.toFixed(2)} s  ${SPOKEN[i]}`);
  }
  writeFileSync(index, JSON.stringify(takes, null, 2));
  for (const t of takes) {
    const l = LINES[t.i];
    const end = l.at + t.seconds;
    if (end > l.to) console.warn(`  ⚠ line ${t.i} runs ${(end - l.to).toFixed(2)} s past its caption ("${l.text}")`);
  }
  console.log(`  ✓ ${takes.length} lines → ${index}`);
}
