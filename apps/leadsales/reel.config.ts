// A walkthrough of Fixtman's Lead Sales Report for the managers who asked for the changes. Calm and clear, not punchy:
// desktop footage at 16:9, no music, the voice carries it. Lines start when capture reaches them, so `beat` is unused.
import type { ReelConfig } from "../../src/kit/config";

/** The sync marker's size in page pixels: capture draws it, the composition covers it. */
export const MARK_SIZE = 6;

export const config = {
  app: "leadsales",
  title: "Lead Sales Report",
  url: "",
  tagline: "What's new",
  fps: 30,
  width: 1920,
  height: 1080,
  // An upper limit for export; the composition takes its real length from the recording.
  seconds: 180,

  voice: {
    name: "am_michael",
    compare: "am_puck",
    speed: 1,
    lines: [
      { id: "intro", text: "This is the new Lead Sales Report, rebuilt around the requests you sent us. The figures in this demo are test data.", caption: "Rebuilt around *your requests*", beat: 0 },
      { id: "views", text: "Instead of one mixed view, there are now three, and each one answers a different question.", caption: "Three views, *three questions*", beat: 0 },
      { id: "sales", text: "Sales Date is the default. It shows what we sold.", caption: "Sales Date: *what did we sell?*", beat: 0 },
      { id: "booked", text: "The biggest number is Booked Sales, the value of the jobs we sold. It includes jobs that were later cancelled, so it isn't earned revenue yet.", caption: "Booked Sales *isn't earned revenue yet*", beat: 0 },
      { id: "completed", text: "Beside it, Completed Jobs Revenue is the money from finished work, with how much of Booked Sales has finished so far.", caption: "Completed Jobs Revenue: *finished work*", beat: 0 },
      { id: "lead", text: "Lead Date shows how the leads we received turned out, so it adds the lead count and the conversion rate.", caption: "Lead Date: *how did the leads turn out?*", beat: 0 },
      { id: "done", text: "Completed Date shows the work we finished. Booked Sales isn't shown here at all, so the two can't be mixed up.", caption: "Completed Date: *what did we finish?*", beat: 0 },
      { id: "compare", text: "Percent changes now follow the calendar. October is compared with all of September, not with a count of days.", caption: "Changes *follow the calendar*", beat: 0 },
      { id: "progress", text: "While a month is still running, it's compared with the whole of last month, so changes stay grey instead of looking like bad news.", caption: "A month in progress *stays grey*", beat: 0 },
      { id: "chart", text: "On the charts, the dashed line is the previous period, and the days still to come are shaded.", caption: "Dashed line: *the previous period*", beat: 0 },
      { id: "breakdown", text: "The breakdown shows what drove the numbers, by agent, platform, job type, area and lead status.", caption: "One breakdown, *five angles*", beat: 0 },
      { id: "agent", text: "Agents are now credited through the assignee first, then the starter.", caption: "Credit: *assignee first, then starter*", beat: 0 },
      { id: "filters", text: "The Lead Status and Job Status filters you asked for are under More filters. Each filter in use shows as a chip, and one click removes it.", caption: "Lead Status and Job Status *filters*", beat: 0 },
      { id: "leads", text: "And the leads table puts the money first, with every lead behind these numbers.", caption: "Every lead *behind the numbers*", beat: 0 },
    ],
  },

  // No music: the beat grid is only a clock, and nothing reads it.
  music: { bpm: 60, offset: 0, file: "" },

  theme: {
    bg: "#222222",
    yellow: "#f7bc2e",
    ink: "#0f172a",
    white: "#ffffff",
  },
} satisfies ReelConfig;
