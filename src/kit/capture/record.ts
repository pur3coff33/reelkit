// Recording an app at phone size. Frames come from Chrome's own screencast at 2× (crisp in a 1080-wide reel, unlike
// Playwright's recordVideo), timestamped, and are turned into a constant 30 fps clip with ffmpeg. Taps show a soft
// ripple so viewers can follow them, and typing and scrolling go at a human pace.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { AppModule, Shot } from "../config";
import { ffmpeg } from "../ffmpeg";
import { ensureOut, outDir } from "../paths";

export const PHONE = { width: 390, height: 844, scale: 2 };

export type Helpers = {
  page: Page;
  context: BrowserContext;
  /** Taps the element (ripple, then a real tap) and waits a beat. */
  tap: (selector: string, pauseMs?: number) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  /** Scrolls the page by `px` over `ms`, eased. */
  scroll: (px: number, ms?: number) => Promise<void>;
  /** Keeps a value for the composition (written to out/capture.json). */
  keep: (key: string, value: unknown) => void;
};

/** Injected into every page: a ripple at a point. */
const RIPPLE = `
  window.__reelTap = (x, y) => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;left:" + (x - 22) + "px;top:" + (y - 22) + "px;width:44px;height:44px;border-radius:50%;" +
      "background:rgba(255,255,255,.55);box-shadow:0 0 0 2px rgba(31,51,38,.25);pointer-events:none;z-index:2147483647;" +
      "transform:scale(.4);opacity:1;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .45s ease .1s";
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = "scale(1.2)"; d.style.opacity = "0"; }));
    setTimeout(() => d.remove(), 700);
  };`;

function helpers(page: Page, context: BrowserContext, kept: Record<string, unknown>): Helpers {
  const wait = (ms: number) => page.waitForTimeout(ms);
  return {
    page,
    context,
    wait,
    async tap(selector, pauseMs = 260) {
      const el = page.locator(selector).first();
      await el.scrollIntoViewIfNeeded();
      const box = await el.boundingBox();
      if (!box) throw new Error(`can't tap ${selector}: not visible`);
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.evaluate(([x, y]) => (window as unknown as { __reelTap: (x: number, y: number) => void }).__reelTap(x, y), [x, y]);
      await el.tap();
      await wait(pauseMs);
    },
    async scroll(px, ms = 900) {
      // A string, not a function: tsx wraps named functions in a helper the page doesn't have.
      await page.evaluate(`new Promise((done) => {
        const from = window.scrollY, start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / ${ms});
          const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          window.scrollTo(0, from + ${px} * e);
          if (t < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      })`);
    },
    keep(key, value) {
      kept[key] = value;
    },
  };
}

type Frame = { data: Buffer; t: number };

/** Records whatever `act` does on `page` and writes it to `file` as a 30 fps H.264 clip. Returns its length in seconds. */
async function recordShot(page: Page, act: () => Promise<void>, file: string, size: { width: number; height: number; scale: number }): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  const frames: Frame[] = [];
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ data: Buffer.from(f.data, "base64"), t: f.metadata.timestamp ?? Date.now() / 1000 });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 95,
    maxWidth: size.width * size.scale,
    maxHeight: size.height * size.scale,
    everyNthFrame: 1,
  });
  // Nudge one frame out even when nothing moves, so the clip starts at once.
  await page.evaluate(() => document.body.style.setProperty("outline", "0px solid transparent"));
  await page.waitForTimeout(150);
  const start = frames[0]?.t ?? Date.now() / 1000;
  await act();
  const end = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  await cdp.detach();
  if (frames.length === 0) throw new Error(`no frames for ${file}`);

  // Frames only come when the screen changes: each one lasts until the next (the last until the end).
  // Outside the app folder: it's Remotion's public dir, and Studio watching it trips over a folder that comes and goes.
  const dir = join(tmpdir(), `reelkit-${basename(file)}-${Date.now()}.frames`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const usable = frames.filter((f) => f.t >= start - 0.001);
  const lines: string[] = [];
  usable.forEach((f, i) => {
    const name = `${String(i).padStart(5, "0")}.jpg`;
    writeFileSync(join(dir, name), f.data);
    const next = usable[i + 1]?.t ?? Math.max(end, f.t + 1 / 30);
    lines.push(`file '${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${String(usable.length - 1).padStart(5, "0")}.jpg'`);
  writeFileSync(join(dir, "list.txt"), lines.join("\n"));
  await ffmpeg([
    "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
    "-vf", `fps=30,scale=${size.width * size.scale}:${size.height * size.scale}:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-movflags", "+faststart", file,
  ]);
  rmSync(dir, { recursive: true, force: true });
  return end - (usable[0]?.t ?? start);
}

/**
 * Brings the app up, runs every shot (or only `only`) and writes out/clips/<shot>.mp4 plus out/capture.json (clip
 * lengths and whatever the shots kept). With `peek`, takes a screenshot per shot instead of recording.
 */
export async function captureAll(mod: AppModule, opts: { only?: string; peek?: boolean } = {}) {
  const app = mod.config.app;
  const clips = ensureOut(app, "clips");
  const server = await mod.serve();
  const browser = await chromium.launch();
  const kept: Record<string, unknown> = {};
  const lengths: Record<string, number> = {};
  try {
    const size = mod.viewport ?? PHONE;
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.scale,
      locale: "en-PH",
      timezoneId: "Asia/Manila",
      ...(mod.viewport
        ? {}
        : {
            isMobile: true,
            hasTouch: true,
            userAgent:
              "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
          }),
    });
    await context.addInitScript(RIPPLE);
    const page = await context.newPage();
    const h = helpers(page, context, kept);
    await mod.beforeCapture?.(h, server.url);
    for (const shot of mod.shots as Shot[]) {
      if (opts.only && shot.name !== opts.only) continue;
      console.log(`  ${shot.name}`);
      await page.goto(server.url + shot.path, { waitUntil: "networkidle" });
      await shot.prepare?.(h);
      if (opts.peek) {
        await page.screenshot({ path: join(clips, `${shot.name}.png`) });
        writeFileSync(join(clips, `${shot.name}.html`), await page.content());
        await shot.after?.(h);
        continue;
      }
      lengths[shot.name] = await recordShot(page, () => shot.act(h), join(clips, `${shot.name}.mp4`), size);
      await shot.after?.(h);
      console.log(`    ${lengths[shot.name].toFixed(2)}s`);
    }
  } finally {
    await browser.close();
    await mod.afterCapture?.().catch((e) => console.warn(`  afterCapture: ${e.message}`));
    await server.stop();
  }
  if (opts.peek) return;
  // With --only, the other shots' lengths and kept values stay as they were.
  const file = outDir(app, "capture.json");
  const prev = opts.only && existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as { clips: object; kept: object }) : { clips: {}, kept: {} };
  writeFileSync(file, JSON.stringify({ clips: { ...prev.clips, ...lengths }, kept: { ...prev.kept, ...kept } }, null, 2));
}
