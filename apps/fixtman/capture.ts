// The FixtMan shots, on the live site as a customer sees it. Nothing is ever ordered: the only writes let through are the
// lookups any visitor's page makes (session, location, price), and the take stops before "Confirm".
import type { Helpers } from "../../src/kit/capture/record";
import type { Shot } from "../../src/kit/config";

const TRACKERS = /googletagmanager|google-analytics|doubleclick|facebook|tawk|clarity|hotjar|bing\.com|tiktok|segment|cdn-cgi\/rum/;
const LOOKUPS = /session\/new|pageScripts|getIpLocation|zip|location|search|price/i;

export async function beforeCapture(h: Helpers) {
  h.page.setDefaultNavigationTimeout(90_000);
  // Answered, not dropped: a dropped request makes the site say it's offline.
  await h.context.route(TRACKERS, (r) =>
    r.fulfill({ status: 200, body: "", contentType: "application/javascript", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } }),
  );
  await h.context.route(/api\.[^/]*fixtman\.com|\.live-api\.fixtman\.com/, (r) => {
    const q = r.request();
    if (["GET", "HEAD", "OPTIONS"].includes(q.method()) || LOOKUPS.test(q.url())) return r.continue();
    console.log(`    blocked ${q.method()} ${q.url()}`);
    return r.abort();
  });
  // The empty cart tab and the chat bubble would sit over the form.
  await h.context.addInitScript(`addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = ".openbtn,.floating-widget{display:none!important}";
    document.head.appendChild(s);
  })`);
}


export const shots: Shot[] = [
  {
    // ZIP → Start Booking → Mounting → a size with its price → wall type: the price is on screen before anything is booked.
    name: "book",
    path: "/services/tv-wall-mounting",
    prepare: async (h) => {
      await h.page.locator(".tv-hero__zip-input").waitFor();
      await h.page.waitForTimeout(3500);
    },
    act: async (h) => {
      const t0 = Date.now();
      const cue = (name: string) => h.keep(name, (Date.now() - t0) / 1000);
      await h.wait(900);
      await h.tap(".tv-hero__zip-input", 250);
      await h.page.keyboard.type("75201", { delay: 130 });
      await h.wait(350);
      await h.tap(".tv-hero__start-btn", 0);
      await h.page.waitForURL(/\/booking\//);
      await h.page.locator('button.text-btn:has-text("MOUNTING")').first().waitFor();
      cue("form");
      await h.wait(900);
      await h.tap('button.text-btn:has-text("MOUNTING")', 1500);
      cue("sizes");
      await h.wait(900);
      await h.tap('button:has-text("50-65")', 1600);
      cue("picked");
      await h.tap('button.text-btn:has-text("yes")', 900);
      await h.tap('button:has-text("FLAT")', 1300);
      await h.tap('button:has-text("DRY WALL")', 1300);
      await h.tap('button.main-btn:has-text("no")', 1300);
      cue("done");
      await h.wait(2500);
    },
  },
  {
    // The home page, from the headline down through the most requested services.
    name: "home",
    path: "/",
    prepare: async (h) => {
      await h.page.waitForTimeout(3000);
      // Loads the lazy images once, then starts from the top.
      for (let y = 0; y < 4000; y += 500) {
        await h.page.evaluate(`scrollTo(0, ${y})`);
        await h.wait(250);
      }
      await h.page.evaluate("scrollTo(0, 0)");
      await h.wait(800);
    },
    act: async (h) => {
      await h.wait(700);
      await h.scroll(1150, 1400);
      await h.wait(500);
      await h.scroll(1500, 2600);
      await h.wait(600);
    },
  },
];

