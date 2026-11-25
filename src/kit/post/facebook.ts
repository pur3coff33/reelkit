// Posting a finished reel to a Facebook Page as a Reel, through the Graph API's Reels publishing flow for Pages:
// start an upload session, send the file to rupload, then finish it with the caption and how it should go out.
//
// Needs, in the repo's .env (gitignored):
//   FB_PAGE_ID=123…          the Page's id
//   FB_PAGE_TOKEN=EAA…       a Page access token with pages_manage_posts, pages_read_engagement, pages_show_list
//   FB_GRAPH_VERSION=v27.0   optional
//
// Nothing goes out unless asked: with no mode flag the step only checks the token and shows what it would post.
//   --draft             uploads it as a draft on the Page (not public; publish it from Meta Business Suite)
//   --schedule <time>   schedules it (ISO time with offset, 10 min to 30 days ahead), e.g. 2026-11-12T19:00+08:00
//   --publish           posts it now, publicly
//   --again             allows posting an app that out/post.json says already went out
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReelConfig } from "../config";
import { appDir, outDir, ROOT } from "../paths";

type Mode = "check" | "draft" | "schedule" | "publish";

function env() {
  const file = join(ROOT, ".env");
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* fall back to the process environment */
    }
  }
  const page = process.env.FB_PAGE_ID, token = process.env.FB_PAGE_TOKEN;
  if (!page || !token || page.startsWith("PASTE_") || token.startsWith("PASTE_")) throw new Error("FB_PAGE_ID and FB_PAGE_TOKEN must be set in .env (replace the PASTE_… placeholders; see .env.example)");
  return { page, token, version: process.env.FB_GRAPH_VERSION ?? "v27.0" };
}

async function graph(method: "GET" | "POST", url: string, params: Record<string, string>) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u, { method });
  const body = (await res.json()) as Record<string, unknown> & { error?: { message: string; code: number } };
  if (!res.ok || body.error) throw new Error(`Facebook: ${body.error?.message ?? res.statusText} (${body.error?.code ?? res.status})`);
  return body;
}

/** The file to post: the small upload copy if there is one, else the export. */
function videoFile(app: string) {
  for (const f of [outDir(app, `${app}-9x16-small.mp4`), outDir(app, `${app}-9x16.mp4`)]) if (existsSync(f)) return f;
  throw new Error(`no finished video for ${app}: run render and export first`);
}

function caption(app: string) {
  const f = join(appDir(app), "caption.txt");
  if (!existsSync(f)) throw new Error(`no caption: write apps/${app}/caption.txt`);
  return readFileSync(f, "utf8").trim();
}

export async function post(config: ReelConfig, flags: string[]) {
  const value = (name: string) => {
    const i = flags.indexOf(`--${name}`);
    return i < 0 ? undefined : flags[i + 1];
  };
  const mode: Mode = flags.includes("--publish") ? "publish" : flags.includes("--draft") ? "draft" : value("schedule") ? "schedule" : "check";
  const app = config.app;
  const file = videoFile(app), text = caption(app);
  const record = outDir(app, "post.json");
  if (mode !== "check" && existsSync(record) && !flags.includes("--again")) {
    const prev = JSON.parse(readFileSync(record, "utf8"));
    throw new Error(`${app} already went out (${prev.mode}, video ${prev.videoId}, ${prev.at}); pass --again to post it again`);
  }
  let when: number | undefined;
  if (mode === "schedule") {
    when = Math.floor(new Date(value("schedule")!).getTime() / 1000);
    const ahead = when - Date.now() / 1000;
    if (!Number.isFinite(when) || ahead < 600 || ahead > 30 * 86400) throw new Error("--schedule must be a time 10 minutes to 30 days from now, e.g. 2026-11-12T19:00+08:00");
  }

  const { page, token: given, version } = env();
  // A user token (long-lived, from the Access Token Debugger) is swapped for the Page's own token, which doesn't expire.
  const me = await graph("GET", `https://graph.facebook.com/${version}/${page}`, { fields: "name,access_token", access_token: given });
  const token = typeof me.access_token === "string" ? me.access_token : given;
  const size = statSync(file).size;
  console.log(`  page: ${me.name} (${page})`);
  console.log(`  video: ${file} (${(size / 1048576).toFixed(1)} MB)`);
  console.log(`  caption:\n${text.split("\n").map((l) => `    ${l}`).join("\n")}`);
  if (mode === "check") {
    console.log("\n  token works. Nothing posted: add --draft, --schedule <time> or --publish.");
    return;
  }

  // 1. Start an upload session.
  const start = await graph("POST", `https://graph.facebook.com/${version}/${page}/video_reels`, { upload_phase: "start", access_token: token });
  const videoId = String(start.video_id);
  // 2. Send the file.
  const up = await fetch(`https://rupload.facebook.com/video-upload/${version}/${videoId}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(size), "Content-Type": "application/octet-stream" },
    body: readFileSync(file),
  });
  const upBody = (await up.json()) as { success?: boolean; error?: { message: string } };
  if (!up.ok || !upBody.success) throw new Error(`Facebook upload: ${upBody.error?.message ?? up.statusText}`);
  // 3. Finish: caption, and published, draft or scheduled.
  const state = mode === "publish" ? "PUBLISHED" : mode === "draft" ? "DRAFT" : "SCHEDULED";
  await graph("POST", `https://graph.facebook.com/${version}/${page}/video_reels`, {
    upload_phase: "finish",
    video_id: videoId,
    video_state: state,
    description: text,
    ...(when ? { scheduled_publish_time: String(when) } : {}),
    access_token: token,
  });
  writeFileSync(record, JSON.stringify({ mode, videoId, at: new Date().toISOString(), scheduledFor: when ? new Date(when * 1000).toISOString() : undefined }, null, 2));
  console.log(`\n  ${state.toLowerCase()}: video ${videoId}${when ? ` for ${new Date(when * 1000).toString()}` : ""}`);
  // Facebook processes the video after upload; report where it's at.
  const status = await graph("GET", `https://graph.facebook.com/${version}/${videoId}`, { fields: "status", access_token: token }).catch(() => null);
  if (status) console.log(`  processing: ${JSON.stringify(status.status)}`);
}
