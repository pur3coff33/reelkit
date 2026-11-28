// A documentary's media list: every photo, clip, music track and sound effect, with where it came from and why the film
// may use it. `fetch` reads it (apps/<app>/media.ts exports MEDIA), checks these rules, and downloads into out/media/.
//
// Rights: "free" is public domain, CC or a royalty-free licence. "fair-use" is copyrighted material the film comments on:
// it needs a written reason; video is used ≤ 5 s at a time and always muted; audio is never fair use (it is what Content
// ID and Rights Manager match hardest).

export type Media = {
  id: string;
  kind: "image" | "video" | "audio";
  /** The file itself, or a commons.wikimedia.org/wiki/File:… page (resolved to the original through the API). */
  url: string;
  /** Where a person can check the licence. */
  page: string;
  author: string;
  licence: string;
  rights: "free" | "fair-use";
  /** As shown in the credits. */
  credit: string;
  /** Fair use: what the film comments on, how much it uses, how it changes it. */
  fairUse?: string;
  /** Video: the seconds of the source the film uses. */
  use?: { from: number; to: number };
  /** Music: what the source says about Content ID registration. */
  contentId?: string;
};

export const FAIR_USE_MAX_SECONDS = 5;

export function mediaProblems(list: Media[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const m of list) {
    const k = m.id.toLowerCase();
    if (seen.has(k)) problems.push(`media id ${m.id} is used twice (ids that differ only in case name one file on Windows)`);
    seen.add(k);
    if (!m.licence.trim()) problems.push(`${m.id}: no licence`);
    if (!m.credit.trim()) problems.push(`${m.id}: no credit`);
    if (m.use && m.use.to <= m.use.from) problems.push(`${m.id}: use ends at ${m.use.to} s, before it starts at ${m.use.from} s`);
    if (m.rights !== "fair-use") continue;
    if (m.kind === "audio") problems.push(`${m.id}: fair-use audio is refused: use royalty-free music and effects`);
    if (!m.fairUse?.trim()) problems.push(`${m.id}: fair use needs a reason (what the film comments on, how much, how it's changed)`);
    if (m.kind === "video") {
      if (!m.use) problems.push(`${m.id}: fair-use video needs a use { from, to }`);
      else if (m.use.to - m.use.from > FAIR_USE_MAX_SECONDS) problems.push(`${m.id}: fair-use video runs ${(m.use.to - m.use.from).toFixed(1)} s, over ${FAIR_USE_MAX_SECONDS} s`);
    }
  }
  return problems;
}

/** "File:Name.jpg" for a Commons file page, else null. */
export function commonsTitle(url: string): string | null {
  const m = /^https?:\/\/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

export function commonsApi(title: string) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.search = new URLSearchParams({ action: "query", format: "json", prop: "imageinfo", iiprop: "url|size|mime", titles: title }).toString();
  return u.toString();
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav", "audio/ogg": "ogg", "audio/flac": "flac",
};

/** The file extension for a media type, or null for anything that isn't image, video or audio Chrome can draw or play
 *  (TIFF is refused: Commons scans are often TIFF, and the render would fail late; link a JPEG rendition instead). */
export const extFor = (mime: string) => EXT[mime.split(";")[0].trim().toLowerCase()] ?? null;

const GROUPS: [Media["kind"], string][] = [["image", "Images"], ["video", "Footage"], ["audio", "Music & sound"]];

/** The credits, for post.md: one line per item, grouped. */
export function creditsMarkdown(list: Media[]) {
  return GROUPS.filter(([k]) => list.some((m) => m.kind === k))
    .map(([k, title]) => `**${title}**\n\n` + list.filter((m) => m.kind === k).map((m) => `- ${m.credit} — ${m.licence} (${m.rights === "fair-use" ? "fair use" : "free"}) ${m.page}`).join("\n"))
    .join("\n\n") + "\n";
}
