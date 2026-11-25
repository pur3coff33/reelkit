// Records the Lead Sales Report from the local ERP as one continuous desktop take. Run voice, capture, sync, render, export
// (not `reel`): each step waits for its line's length and flips a marker in the page, and sync.ts finds the flips in the
// footage, so the voice lands on what's on screen even when the screencast falls behind.
// Needs the local ERP running with the demo rows seeded; the QA login is read from fm_qa, never stored here.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, Route } from "playwright";
import type { Helpers } from "../../src/kit/capture/record";
import type { AppModule } from "../../src/kit/config";
import { outDir, ROOT } from "../../src/kit/paths";
import { config, MARK_SIZE } from "./reel.config";

const APP_URL = "http://erp_fe.localhost";
const API_URL = "http://erp_be.localhost";
const QA_ENV = join(ROOT, "..", "..", "fixtman", "fm_qa", "e2e", ".env");
const TEST_PLATFORM_PREFIX = "LSR Test ";

const CARDS = 'section[aria-label="Key figures"]';
const CHARTS = 'section[aria-label="Daily charts"]';
const BREAKDOWN = 'section[aria-label="Breakdown"]';
const TABS = 'nav[aria-label="Report view"]';

export type Box = { x: number; y: number; width: number; height: number };
export type Cue = { id: string; t: number; focus: Box | null };

// Real staff names stay out of the video.
const agentNames = new Map<string, string>();
function agentLabel(name: string) {
  if (!agentNames.has(name)) {
    const n = agentNames.size;
    agentNames.set(name, `Agent ${n < 26 ? String.fromCharCode(65 + n) : n + 1}`);
  }
  return agentNames.get(name) as string;
}
const platformLabel = (name: string) => name.replace(TEST_PLATFORM_PREFIX, "");

type Row = { name?: string | null; agent_name?: string | null; platform_name?: string | null };
function scrubSummary(json: { byAgent?: Row[]; byPlatform?: Row[]; data?: Row[] }) {
  json.byAgent?.forEach((r) => { if (r.name) r.name = agentLabel(r.name); });
  json.byPlatform?.forEach((r) => { if (r.name) r.name = platformLabel(r.name); });
  json.data?.forEach((r) => {
    if (r.agent_name) r.agent_name = agentLabel(r.agent_name);
    if (r.platform_name) r.platform_name = platformLabel(r.platform_name);
  });
  return json;
}

type Option = { value: number; label: string };
let testPlatforms: Promise<number[]> | null = null;

// Local data also holds real leads, so every report request is narrowed to the seeded test platforms.
async function throughTestData(route: Route, page: Page) {
  const request = route.request();
  if (request.method() === "OPTIONS") return route.continue();
  if (request.url().endsWith("/filter-options")) {
    const response = await route.fetch();
    const json = (await response.json()) as { agents: Option[]; platforms: Option[] };
    json.agents.forEach((o) => { o.label = agentLabel(o.label); });
    json.platforms = json.platforms.filter((o) => o.label.startsWith(TEST_PLATFORM_PREFIX)).map((o) => ({ ...o, label: platformLabel(o.label) }));
    return route.fulfill({ response, json });
  }
  testPlatforms ??= page.context().request
    .get(`${API_URL}/leads/reports/sales-date/filter-options`, { headers: { authorization: request.headers().authorization } })
    .then(async (r) => ((await r.json()) as { platforms: Option[] }).platforms.filter((o) => o.label.startsWith(TEST_PLATFORM_PREFIX)).map((o) => o.value));
  const platformIds = await testPlatforms;
  if (platformIds.length === 0) throw new Error("no test platforms found: seed the demo rows first");
  const body = JSON.parse(request.postData() ?? "{}") as { report?: Record<string, unknown> };
  const response = await route.fetch({ postData: JSON.stringify({ ...body, report: { ...body.report, platformIds } }) });
  return route.fulfill({ response, json: scrubSummary(await response.json()) });
}

/** A cursor viewers can see, a ring on each click (headless Chrome draws neither), and the sync marker. */
const POINTER = `
  window.__mark = (on) => {
    let m = document.getElementById("__mark");
    if (!m) {
      m = document.createElement("div");
      m.id = "__mark";
      m.style.cssText = "position:fixed;left:0;top:0;width:${MARK_SIZE}px;height:${MARK_SIZE}px;pointer-events:none;z-index:2147483647";
      document.documentElement.appendChild(m);
    }
    m.style.background = on ? "#fff" : "#000";
  };
  window.__cursor = (x, y) => {
    let c = document.getElementById("__cursor");
    if (!c) {
      c = document.createElement("div");
      c.id = "__cursor";
      c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 11-7 1.5L9.500 21z" fill="#0f172a" stroke="#fff" stroke-width="1.500"/></svg>';
      c.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:2147483647;transition:transform .55s cubic-bezier(.65,0,.35,1)";
      document.documentElement.appendChild(c);
    }
    c.style.transform = "translate(" + x + "px," + y + "px)";
  };
  window.__ring = (x, y) => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;left:" + (x - 20) + "px;top:" + (y - 20) + "px;width:40px;height:40px;border-radius:50%;background:rgba(247,188,46,.45);" +
      "pointer-events:none;z-index:2147483646;transform:scale(.4);transition:transform .35s ease,opacity .45s ease .1s";
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = "scale(1.3)"; d.style.opacity = "0"; }));
    setTimeout(() => d.remove(), 700);
  };`;

async function pointAt(h: Helpers, selector: string) {
  const el = h.page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) throw new Error(`can't reach ${selector}: not visible`);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await h.page.evaluate(`window.__cursor(${x}, ${y})`);
  await h.page.mouse.move(x, y, { steps: 10 });
  await h.wait(600);
  return { x, y };
}

async function click(h: Helpers, selector: string) {
  const { x, y } = await pointAt(h, selector);
  await h.page.evaluate(`window.__ring(${x}, ${y})`);
  await h.page.mouse.click(x, y);
}

/** Scrolls whatever really scrolls this page until the element sits `offset` px below the top of it. */
function scrollTo(h: Helpers, selector: string, offset = 90, ms = 1100) {
  return h.page.evaluate(`new Promise((done) => {
    const el = document.querySelector(${JSON.stringify(selector)});
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const o = getComputedStyle(p).overflowY;
      if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) break;
      p = p.parentElement;
    }
    const sc = p && p !== document.documentElement ? p : document.scrollingElement;
    const top = sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top;
    const from = sc.scrollTop, by = el.getBoundingClientRect().top - top - ${offset}, start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / ${ms});
      sc.scrollTop = from + by * (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  })`);
}

async function pickRange(h: Helpers, name: string) {
  await click(h, ".p-dropdown");
  await h.wait(250);
  await click(h, `.p-dropdown-panel li[aria-label="${name}"]`);
}

/** A "text:" selector measures the words themselves, since a paragraph's box runs the full width of the page. */
function boxOf(h: Helpers, selector: string): Promise<Box | null> {
  if (!selector.startsWith("text:")) return h.page.locator(selector).first().boundingBox();
  return h.page.locator(selector.slice(5)).first().evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

async function union(h: Helpers, selectors: string[]): Promise<Box> {
  const boxes = await Promise.all(selectors.map((s) => boxOf(h, s)));
  const found = boxes.filter((b): b is Box => !!b);
  if (found.length === 0) throw new Error(`nothing to focus: ${selectors.join(", ")}`);
  const x = Math.min(...found.map((b) => b.x)), y = Math.min(...found.map((b) => b.y));
  return { x, y, width: Math.max(...found.map((b) => b.x + b.width)) - x, height: Math.max(...found.map((b) => b.y + b.height)) - y };
}

async function tour(h: Helpers) {
  const voice = JSON.parse(readFileSync(outDir(config.app, "voice.json"), "utf8")) as { lines: { id: string; seconds: number }[] };
  const started = Date.now();
  const cues: Cue[] = [];
  const say = async (id: string, focus: string[] = [], pause = 450) => {
    const line = voice.lines.find((l) => l.id === id);
    if (!line) throw new Error(`no voice line "${id}": run npm run voice -- ${config.app} first`);
    const box = focus.length ? await union(h, focus) : null;
    await h.page.evaluate(`window.__mark(${cues.length % 2 === 0})`);
    cues.push({ id, t: (Date.now() - started) / 1000, focus: box });
    await h.wait(line.seconds * 1000 + pause);
  };
  const tab = (name: string) => `${TABS} button:has-text("${name}")`;

  await h.page.evaluate(`window.__mark(false); window.__cursor(1100, 300)`);
  await h.wait(2800); // Under the title card.
  await say("intro");
  const allTabs = ["Sales Date", "Lead Date", "Completed Date"].map(tab);
  const salesLine = 'text:p:has-text("What did we sell?")';
  await say("views", allTabs);
  await say("sales", [...allTabs, salesLine]);
  await say("booked", [`${CARDS} article:nth-child(1)`]);
  await say("completed", [`${CARDS} article:nth-child(2)`]);

  await click(h, tab("Lead Date"));
  await h.wait(1500);
  await say("lead", [CARDS]);
  await click(h, tab("Completed Date"));
  await h.wait(1500);
  await say("done", [CARDS]);
  await click(h, tab("Sales Date"));
  await h.wait(1500);

  const comparedLine = 'text:p:has-text("Compared with")';
  await say("compare", [comparedLine, `${CARDS} article:nth-child(1)`]);
  await pickRange(h, "This month");
  await h.wait(1500);
  await say("progress", [comparedLine, `${CARDS} article:nth-child(1)`]);
  await scrollTo(h, `${CHARTS} article:first-child`, 100);
  await h.wait(300);
  await say("chart", [`${CHARTS} article:first-child`]);

  await pickRange(h, "Last month");
  await h.wait(1000);
  await scrollTo(h, BREAKDOWN, 100);
  await h.wait(300);
  const dimension = (name: string) => `${BREAKDOWN} button:text-is("${name}")`;
  const dimensions = (async () => {
    await h.wait(1400);
    for (const name of ["Platform", "Job Type", "Area", "Lead Status"]) {
      await click(h, dimension(name));
      await h.wait(450);
    }
  })();
  await say("breakdown", [BREAKDOWN]);
  await dimensions;
  await click(h, dimension("Agent"));
  await h.wait(300);
  await say("agent", [BREAKDOWN]);

  await scrollTo(h, TABS, 20);
  await h.wait(200);
  await click(h, 'section[aria-label="Filters"] button:has-text("More filters")');
  await h.wait(400);
  const filters = (async () => {
    await h.wait(1500);
    await click(h, 'section[aria-label="More filters"] div:has(> label:text-is("Job Status")) .p-multiselect');
    await h.wait(450);
    await click(h, '.p-multiselect-panel .p-multiselect-item:has(span:text-is("Completed"))');
    await h.wait(350);
    // PrimeReact closes the panel by itself if the new figures change the page's scroll position.
    if (await h.page.locator(".p-multiselect-close").count()) await click(h, ".p-multiselect-close");
    await h.wait(1500);
    await click(h, 'button[aria-label="Remove filter Job Status: Completed"]');
    await h.wait(300);
  })();
  await say("filters", ['section[aria-label="Filters"]', 'section[aria-label="More filters"]'], 900);
  await filters;
  await click(h, 'section[aria-label="Filters"] button:has-text("More filters")');
  await h.wait(500);

  const leads = "section:has(> div > h2)";
  await h.page.evaluate(`document.querySelectorAll(${JSON.stringify(leads)}).forEach((s) => { if (s.querySelector("h2").textContent === "Leads") s.id = "__leads"; })`);
  await scrollTo(h, "#__leads", 100);
  await h.wait(300);
  await say("leads", ["#__leads"], 700);
  await h.wait(6000); // The footage can run behind, and the end card needs something under it.
  h.keep("cues", cues);
}

export const app: AppModule = {
  config,
  // Lighter than 2×, which made the screencast fall further behind. Still sharp under the camera's zoom.
  viewport: { width: 1440, height: 810, scale: 1.6 },
  serve: async () => ({ url: APP_URL, stop: async () => {} }),
  async beforeCapture(h, base) {
    process.loadEnvFile(QA_ENV);
    const { context, page } = h;
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(180000);
    await context.addInitScript(POINTER);
    await context.route(/^https:\/\/cdn\.segment\.com\//, (route) =>
      /\/settings$/.test(new URL(route.request().url()).pathname)
        ? route.fulfill({ json: { integrations: { "Segment.io": { apiKey: "stub" } }, plan: { track: { __default: { enabled: true } } } } })
        : route.fulfill({ body: "", contentType: "application/javascript" }),
    );
    await context.route(/^https:\/\/api\.segment\.io\//, (route) => route.fulfill({ json: { success: true } }));
    await context.route(/\/leads\/reports\/sales-date/, (route) => throughTestData(route, page));
    await page.goto(`${base}/login`);
    await page.getByPlaceholder("Enter your email address").fill(process.env.QA_ERP_WEB_EMAIL ?? "");
    await page.getByPlaceholder("Enter your password").fill(process.env.QA_ERP_WEB_PASSWORD ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  },
  shots: [
    {
      name: "tour",
      path: "/leads/sales-report",
      async prepare(h) {
        await h.page.locator(CARDS).waitFor();
        await h.page.waitForTimeout(1500);
        await pickRange(h, "Last month");
        await h.wait(2000);
        await h.page.mouse.move(1100, 300);
      },
      act: tour,
    },
  ],
};
