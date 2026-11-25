// The kop.it shots. Every run starts from the same viewer state: logged in as Maya, no tours, no install page, the
// morning card due, a clear daytime sky (no location, the browser clock at 10 AM Manila).
import { readFileSync } from "node:fs";
import type { Shot } from "../../src/kit/config";
import type { Helpers } from "../../src/kit/capture/record";
import { outDir } from "../../src/kit/paths";
import { BASE, sql } from "./kopit";
import { login } from "./session";
import { MANILA_OFFSET_MS, dayKey, startOf } from "./seed/generate";

type Demo = { householdId: number; profiles: { maya: number; leo: number }; day: number };
const demo = (): Demo => JSON.parse(readFileSync(outDir("kopit", "demo.json"), "utf8"));

let startedAt = 0;

const ymd = (day: number) => new Date(startOf(day) + MANILA_OFFSET_MS).toISOString().slice(0, 10);

/** What Maya has "already had" so only the morning card plays: last month's Wrapped and last week's recap. */
function seenRecaps(today: number) {
  const d = new Date(startOf(today) + MANILA_OFFSET_MS);
  const lastMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const monday = today - ((d.getUTCDay() + 6) % 7);
  return { wrapped: lastMonth, week: ymd(monday - 7) };
}

export async function beforeCapture(h: Helpers, base: string) {
  const { householdId, profiles } = demo();
  const today = dayKey(Date.now());
  startedAt = Date.now();
  await sql(
    `UPDATE profiles SET morning_seen = '${JSON.stringify(seenRecaps(today))}', tours_seen = 'add,garden,history,shed' WHERE household_id = ${householdId};`,
  );
  const jar = await login(base, "Maya", profiles.maya);
  await h.context.addCookies(Object.entries(jar).map(([name, value]) => ({ name, value, url: base })));
  await h.context.addInitScript((id) => {
    try {
      localStorage.setItem("kopit-install-seen", "1");
      localStorage.setItem("kopit-install-dismissed", "1");
      localStorage.setItem("kopit-sky-asked", "1");
      localStorage.setItem(`kopit-tours-seen-${id}`, "add,garden,history,shed");
    } catch {}
  }, profiles.maya);
  await h.page.clock.install({ time: hour(10) });
}

/** Today at `h` o'clock, Manila time: the browser clock the sky follows. */
const hour = (h: number) => startOf(dayKey(Date.now())) + h * 3_600_000;

/** Anything a shot saved is taken back out, so the next run starts from the seeded data again. */
export async function afterCapture() {
  const { householdId } = demo();
  await sql(`DELETE FROM entries WHERE household_id = ${householdId} AND created_at >= ${startedAt - 60_000};`);
}

export const shots: Shot[] = [
  {
    // The morning card with yesterday's real AI note.
    name: "morning",
    path: "/",
    act: async (h) => {
      await h.page.locator("#morning[open], dialog[open]").first().waitFor({ timeout: 20_000 });
      await h.wait(4200);
    },
    after: async (h) => {
      const close = h.page.locator("dialog[open] button").last();
      if (await close.isVisible()) await close.tap();
      await h.wait(500);
    },
  },
  {
    // Logging ₱285 for a meal: keypad, one of the usual chips, Save.
    name: "add",
    path: "/?fresh=1",
    act: async (h) => {
      await h.wait(300);
      for (const k of ["2", "8", "5"]) await h.tap(`.keys button[data-key="${k}"]`, 170);
      await h.tap(`.usual .cat[data-key="meals"]`, 500);
      // Its notes slide up: pick the first ready-made one.
      await h.tap(`#note-chips button`, 450);
      await h.tap(`#save`, 200);
      await h.wait(1400);
    },
  },
  {
    // Everyone's flower on the "Who's gardening?" shelf, then Maya picks hers.
    name: "people",
    path: "/profile",
    act: async (h) => {
      await h.wait(1600);
      await h.tap(`button.who-card`, 0);
      await h.wait(900);
    },
  },
  {
    // The garden: this month's plant under the sky, then today's missions.
    name: "garden",
    path: "/spending",
    act: async (h) => {
      await h.wait(900);
      await h.scroll(380, 1100);
      await h.wait(1300);
      const missions = await h.page.locator(".missions li.m .t").allInnerTexts();
      h.keep("missions", missions.map((m) => m.split("\n")[0].replace(/^(On track|Not today): /, "").trim()).filter(Boolean));
    },
  },
  {
    // The same garden at 8 PM: moon, stars and fireflies (the sky follows the browser clock).
    name: "night",
    path: "/spending",
    prepare: async (h) => {
      await h.page.clock.setSystemTime(hour(20));
      await h.page.reload({ waitUntil: "networkidle" });
    },
    act: async (h) => {
      await h.wait(2600);
    },
    after: async (h) => {
      await h.page.clock.setSystemTime(hour(10));
    },
  },
  {
    // The gallery building itself in, shelf by shelf, opened from the garden.
    name: "gallery",
    path: "/spending",
    act: async (h) => {
      await h.wait(250);
      await h.tap(`a[href="/gallery"]`, 0);
      await h.page.waitForURL(/\/gallery/);
      await h.wait(1800);
      await h.scroll(420, 1400);
      await h.wait(600);
    },
  },
  {
    // History: the greenhouse, a shelf of daily pots per week, scrolling back through the weeks.
    name: "history",
    path: "/history",
    act: async (h) => {
      await h.wait(900);
      await h.scroll(1100, 2400);
      await h.wait(500);
    },
  },
];
