// The partner page on the live site: the three ways to plug in, then the shop platforms.
import type { Helpers } from "../../src/kit/capture/record";
import type { Shot } from "../../src/kit/config";

const top = (h: Helpers, text: string, y: number) =>
  h.page.evaluate(`[...document.querySelectorAll("h2,h3")].find((e) => e.innerText.trim() === ${JSON.stringify(text)}).getBoundingClientRect().top - ${y}`) as Promise<number>;

const still = (name: string, heading: string, y: number): Shot => ({
  name,
  path: "/become-partner",
  prepare: async (h) => {
    await h.page.addStyleTag({ content: ".whatsapp-floating-widget{display:none!important}" });
    await h.page.waitForTimeout(2500);
    for (let p = 0; p < 4600; p += 500) {
      await h.page.evaluate(`scrollTo(0, ${p})`);
      await h.wait(200);
    }
    await h.page.evaluate(`scrollBy(0, ${(await top(h, heading, y)) - 260})`);
    await h.wait(700);
  },
  act: async (h) => {
    await h.scroll(260, 900);
    await h.wait(2600);
  },
});

export const shots: Shot[] = [still("standard", "Standard", 190), still("widget", "Widget", 190), still("api", "API", 190), still("shops", "Works With Your Ecommerce Platform", 240)];
