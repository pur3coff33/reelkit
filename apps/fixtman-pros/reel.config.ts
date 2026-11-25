// FixtMan's 60 s ad for technicians: paying for leads that go nowhere, then what FixtMan offers independent pros. Every claim
// is from fixtman.com/become-pro and its technician terms. They're contractors (1099), so it never says hired or employed.
import type { ReelConfig } from "../../src/kit/config";
import { config as base } from "../fixtman/reel.config";

export const config = {
  ...base,
  app: "fixtman-pros",
  title: "FixtMan for pros",
  url: "fixtman.com/become-pro",
  tagline: "Your skills. Your schedule.",

  voice: {
    name: "am_michael",
    compare: "am_fenrir",
    speed: 1.04,
    // "Fixed-man" is spelled for the voice; captions use `caption`.
    lines: [
      { id: "lead", text: "You paid for the lead. They never wrote back.", caption: "You paid for the lead. They *never wrote back.*", beat: 0 },
      { id: "another", text: "So you paid for another. They hired someone else.", caption: "So you paid for another. They *hired someone else.*", beat: 6.24 },
      { id: "brand", text: "Stop paying for maybes. Join Fixed-man.", caption: "Stop paying for maybes. *Join FixtMan.*", beat: 12.96 },
      { id: "fees", text: "No lead costs. No subscription fees.", caption: "No lead costs. *No subscription fees.*", beat: 20.74 },
      { id: "pick", text: "See jobs in your area, and pick the ones you want.", caption: "See jobs in your area. *Pick the ones you want.*", beat: 27.74 },
      { id: "kinds", text: "TV mounting. Furniture. Gyms. Lighting. Gazebos. Playsets.", caption: "TV mounting. Furniture. Gyms. Lighting. Gazebos. Playsets.", beat: 34.48 },
      { id: "size", text: "From quick fixes, to big installs.", caption: "From quick fixes *to big installs.*", beat: 43.74 },
      { id: "own", text: "Set your own schedule. Set your own radius.", caption: "Set your own *schedule.* Set your own *radius.*", beat: 48.74 },
      { id: "no", text: "Don't like an offer? Turn it down. No penalty.", caption: "Don't like an offer? Turn it down. *No penalty.*", beat: 55.64 },
      { id: "paid", text: "Finish the job, and get paid every week, on Friday.", caption: "Finish the job. Get paid *every week, on Friday.*", beat: 62.74 },
      { id: "back", text: "The ads, the leads, the back office? Already handled.", caption: "The ads, the leads, the back office? *Already handled.*", beat: 70.74 },
      { id: "numbers", text: "Over seven hundred technicians. More than a hundred thousand projects done.", caption: "Over *700 technicians.* 100,000+ *projects done.*", beat: 77.74 },
      { id: "bring", text: "Bring your tools, your license, and your ride.", caption: "Bring your tools, your license, *and your ride.*", beat: 88.74 },
      { id: "form", text: "The application is one short form.", caption: "The application is *one short form.*", beat: 94.74 },
      { id: "end", text: "Your skills. Your schedule. Apply now, at Fixed-man dot com.", caption: "Your skills. Your schedule. *Apply now.*", beat: 102.74 },
    ],
  },
} satisfies ReelConfig;
