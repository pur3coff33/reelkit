// `npm run fetch -- <app>`: downloads a documentary's media list (apps/<app>/media.ts, `MEDIA`) into out/media/, checks
// its rights rules first, probes each file, and writes out/media.json (what the composition reads) and out/credits.md
// (for post.md). Files already there are kept. Downloads are untrusted: only ffmpeg and Remotion ever read them.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ffmpeg } from "../ffmpeg";
import { appDir, ensureOut, outDir } from "../paths";
import { commonsApi, commonsTitle, creditsMarkdown, extFor, mediaProblems, type Media } from "./media";

/** Paths are relative to the app folder (Remotion's public dir). `wav`: an audio item, decoded for the mix. */
export type Probed = { file: string; width?: number; height?: number; seconds?: number; wav?: string };

const AGENT = "reelkit-doc/0.1 (local research tool)";

/** Size and length from ffmpeg's report on its input (ffmpeg-static ships no ffprobe). Images have no useful length. */
export function parseProbe(stderr: string): { width?: number; height?: number; seconds?: number } {
  const out: { width?: number; height?: number; seconds?: number } = {};
  const size = /Stream #\S+.*?Video: .*?(\d{2,5})x(\d{2,5})/.exec(stderr);
  if (size) [out.width, out.height] = [Number(size[1]), Number(size[2])];
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr);
  const seconds = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0;
  if (seconds > 0.1) out.seconds = seconds;
  return out;
}

/** The items with no file in out/media yet. */
export function planDownloads(list: Media[], existing: string[]): Media[] {
  const have = new Set(existing.map((f) => f.replace(/\.[^.]+$/, "").toLowerCase()));
  return list.filter((m) => !have.has(m.id.toLowerCase()));
}

/** The file already downloaded for an id (its mix copy, `<id>.mix.wav`, has another stem). */
function onDisk(files: string[], id: string) {
  return files.find((f) => f.replace(/\.[^.]+$/, "").toLowerCase() === id.toLowerCase())!;
}

/** An audio item decoded for the mix: always its own file, 48 kHz stereo, whatever the original's format or rate. */
export const mixFile = (id: string) => `${id}.mix.wav`;

const BY_EXT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", flac: "audio/flac" };

/** The response's media type; when a server only says "some bytes" (octet-stream, or nothing), the URL's extension. */
export function mimeOf(contentType: string, url: string) {
  const t = contentType.split(";")[0].trim().toLowerCase();
  if (t && t !== "application/octet-stream" && t !== "binary/octet-stream") return t;
  const ext = /\.([a-z0-9]+)$/i.exec(new URL(url).pathname)?.[1]?.toLowerCase();
  return (ext && BY_EXT[ext]) ?? t;
}

export const kindMatches = (kind: Media["kind"], mime: string) => mime.trim().toLowerCase().startsWith(`${kind}/`);

/** How long to wait before trying again (ms), or null to give up: servers that are busy or rate-limiting (429, 503)
 *  get what they ask for in Retry-After, else 4 s doubling, for up to four tries. */
export function retryDelay(status: number, retryAfter: string | null, attempt: number): number | null {
  if ((status !== 429 && status !== 503) || attempt >= 4) return null;
  const asked = Number(retryAfter);
  return retryAfter !== null && Number.isFinite(asked) ? asked * 1000 : 4000 * 2 ** attempt;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch, waiting and trying again while the server says it's busy. */
async function politeFetch(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": AGENT } });
    const wait = res.ok ? null : retryDelay(res.status, res.headers.get("retry-after"), attempt);
    if (wait === null) return res;
    console.log(`  … ${res.status}, waiting ${Math.round(wait / 1000)} s`);
    await sleep(wait);
  }
}

async function resolve(m: Media): Promise<string> {
  const title = commonsTitle(m.url);
  if (!title) return m.url;
  const res = await politeFetch(commonsApi(title));
  if (!res.ok) throw new Error(`${m.id}: the Commons API answered ${res.status} for ${title}`);
  const body = (await res.json()) as { query?: { pages?: Record<string, { imageinfo?: { url: string }[] }> } };
  const url = Object.values(body.query?.pages ?? {})[0]?.imageinfo?.[0]?.url;
  if (!url) throw new Error(`${m.id}: Commons has no file ${title}`);
  return url;
}

async function download(m: Media, dir: string): Promise<string> {
  const url = await resolve(m);
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`${m.id}: ${url} answered ${res.status}`);
  const mime = mimeOf(res.headers.get("content-type") ?? "", res.url || url);
  const ext = extFor(mime);
  if (!kindMatches(m.kind, mime) || !ext) throw new Error(`${m.id}: ${url} sent ${mime || "no type"}, not ${m.kind}: link the file itself, not its page`);
  const file = `${m.id}.${ext}`;
  writeFileSync(join(dir, file), Buffer.from(await res.arrayBuffer()));
  return file;
}

export async function fetchMedia(app: string) {
  const file = join(appDir(app), "media.ts");
  if (!existsSync(file)) throw new Error(`no apps/${app}/media.ts`);
  const { MEDIA } = (await import(pathToFileURL(file).href)) as { MEDIA: Media[] };
  const problems = mediaProblems(MEDIA);
  if (problems.length) throw new Error(`the media list has problems:\n  ${problems.join("\n  ")}`);
  const dir = ensureOut(app, "media");
  const todo = new Set(planDownloads(MEDIA, readdirSync(dir)).map((m) => m.id));
  const probed: Record<string, Probed> = {};
  for (const m of MEDIA) {
    // A pause between downloads, so a long list doesn't trip the server's rate limit.
    if (todo.has(m.id)) await sleep(1200);
    const name = todo.has(m.id) ? await download(m, dir) : onDisk(readdirSync(dir), m.id);
    const path = join(dir, name);
    const p: Probed = { file: `out/media/${name}`, ...parseProbe(await ffmpeg(["-i", path, "-t", "0.05", "-f", "null", "-"])) };
    if (m.kind === "audio") {
      const wav = join(dir, mixFile(m.id));
      if (!existsSync(wav)) await ffmpeg(["-i", path, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", wav]);
      p.wav = `out/media/${mixFile(m.id)}`;
    }
    if (m.kind === "video" && m.use && p.seconds !== undefined && m.use.to > p.seconds + 0.05) throw new Error(`${m.id}: use ends at ${m.use.to} s but the clip is ${p.seconds.toFixed(2)} s`);
    probed[m.id] = p;
    const size = p.width ? `${p.width}×${p.height}` : "";
    console.log(`  ${todo.has(m.id) ? "✓" : "·"} ${m.id.padEnd(18)} ${size} ${p.seconds ? `${p.seconds.toFixed(1)} s` : ""}${todo.has(m.id) ? "" : "  (already there)"}`);
  }
  writeFileSync(outDir(app, "media.json"), JSON.stringify(probed, null, 2));
  writeFileSync(outDir(app, "credits.md"), creditsMarkdown(MEDIA));
  console.log(`  wrote out/media.json and out/credits.md (${MEDIA.length} items)`);
}
