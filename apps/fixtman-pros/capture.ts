// The pro application on the live site, filled in with a made-up person and never sent: requests that aren't lookups are blocked
// (apps/fixtman/capture.ts) and the take stops before Submit.
import type { Shot } from "../../src/kit/config";

export const shots: Shot[] = [
  {
    name: "form",
    path: "/become-pro",
    prepare: async (h) => {
      await h.page.locator("#firstName").waitFor();
      await h.page.waitForTimeout(3000);
      for (let y = 0; y < 2600; y += 500) {
        await h.page.evaluate(`scrollTo(0, ${y})`);
        await h.wait(200);
      }
      await h.page.evaluate(`scrollTo(0, document.querySelector("#firstName").getBoundingClientRect().top + scrollY - 250)`);
      await h.wait(900);
    },
    act: async (h) => {
      await h.wait(400);
      for (const [id, text] of [["firstName", "Alex"], ["lastName", "Rivera"], ["email", "alex@example.com"], ["phone", "2145550142"]]) {
        await h.tap(`#${id}`, 60);
        await h.page.keyboard.type(text, { delay: 28 });
        await h.wait(60);
      }
      await h.tap("#generalLiabilityInsuranceYes", 400);
      await h.wait(1600);
    },
  },
];
