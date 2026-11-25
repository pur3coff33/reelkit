// FixtMan's 60 s ad for Reels: unfinished jobs, then FixtMan, then how booking works. Every claim is one fixtman.com makes.
import type { ReelConfig } from "../../src/kit/config";

export const config = {
  app: "fixtman",
  title: "FixtMan",
  url: "fixtman.com",
  tagline: "Take it off your list.",
  fps: 30,
  width: 1080,
  height: 1920,
  seconds: 60,

  voice: {
    name: "am_michael",
    compare: "am_fenrir",
    speed: 1.04,
    // "Fixed-man" is spelled for the voice; captions use `caption`.
    lines: [
      { id: "tv", text: "You bought the TV. It's been in the box ever since.", caption: "You bought the TV. It's been *in the box* ever since.", beat: 0 },
      { id: "bed", text: "The bed? Still flat-packed.", caption: "The bed? *Still flat-packed.*", beat: 7.24 },
      { id: "swing", text: "The swing set? The kids stopped asking.", caption: "The swing set? The kids *stopped asking.*", beat: 11.24 },
      { id: "brand", text: "Put the drill down. Book Fixed-man.", caption: "Put the drill down. *Book FixtMan.*", beat: 17.14 },
      { id: "pro", text: "A vetted pro comes to your home, and gets it done.", caption: "A *vetted pro* comes to your home, and gets it done.", beat: 23.24 },
      { id: "jobs", text: "TVs. Furniture. Home gyms. Lights. Gazebos. Even that giant playset.", caption: "TVs. Furniture. Home gyms. Lights. Gazebos. Even that giant playset.", beat: 30.26 },
      { id: "zip", text: "Booking takes minutes. Enter your zip code, and pick your job.", caption: "Booking takes *minutes.* Enter your ZIP, pick your job.", beat: 42.24 },
      { id: "price", text: "You see the price upfront. No hidden fees.", caption: "See the *price upfront.* No hidden fees.", beat: 50.24 },
      { id: "time", text: "Pick a time that works for you. Same-day is available in many areas.", caption: "Pick a time that works. *Same-day* in many areas.", beat: 57.24 },
      { id: "ready", text: "Your pro shows up with the tools, does the work, and checks it all before leaving.", caption: "Your pro brings the tools, does the work, and *checks it all.*", beat: 67.24 },
      { id: "warranty", text: "And it's backed by a thirty-day service warranty.", caption: "Backed by a *30-day service warranty.*", beat: 78.24 },
      { id: "redo", text: "If we got it wrong, we redo it.", caption: "If we got it wrong, *we redo it.*", beat: 84.24 },
      { id: "stars", text: "TV mounting alone? Four point nine stars, from over four thousand reviews.", caption: "TV mounting alone? *4.9 stars,* 4,000+ reviews.", beat: 89.24 },
      { id: "ask", text: "So, what's still sitting in your garage?", caption: "So, what's still sitting in *your garage?*", beat: 101.24 },
      { id: "end", text: "Take it off your list. Book now, at Fixed-man dot com.", caption: "Take it off your list. *Book now.*", beat: 106.24 },
    ],
  },

  music: { bpm: 120, offset: 0, generated: true, file: "out/music.wav" },

  theme: {
    bg: "#f5efe6",
    navy: "#1f3b4b",
    deep: "#132a37",
    orange: "#f26a35",
    peach: "#ff8250",
    white: "#ffffff",
    card: "#c99b6a",
  },
} satisfies ReelConfig;
