// FixtMan's 60 s ad for brands and retailers: the product they loved comes back because it had to be built, then what FixtMan
// adds to a shop. Every claim is from fixtman.com/become-partner. No other company's logo or brand is named as a customer.
import type { ReelConfig } from "../../src/kit/config";
import { config as base } from "../fixtman/reel.config";

export const config = {
  ...base,
  app: "fixtman-partners",
  title: "FixtMan for partners",
  url: "fixtman.com/become-partner",
  tagline: "You sell it. We handle everything after.",

  voice: {
    name: "am_michael",
    compare: "am_fenrir",
    speed: 1.04,
    // "Fixed-man" is spelled for the voice; captions use `caption`.
    lines: [
      { id: "loved", text: "They loved it on your website. Then the box arrived.", caption: "They loved it on your website. *Then the box arrived.*", beat: 0 },
      { id: "parts", text: "A hundred parts. No tools. One star.", caption: "A hundred parts. No tools. *One star.*", beat: 6.74 },
      { id: "back", text: "And now, it's coming back.", caption: "And now, it's *coming back.*", beat: 12.6 },
      { id: "brand", text: "You sell it. Fixed-man builds it.", caption: "You sell it. *FixtMan builds it.*", beat: 17.84 },
      { id: "checkout", text: "Offer assembly and installation, right at your checkout.", caption: "Offer assembly and installation, *right at your checkout.*", beat: 23.74 },
      { id: "kinds", text: "Furniture. Fitness. Smart home. Outdoor. Property.", caption: "Furniture. Fitness. Smart home. Outdoor. Property.", beat: 31.44 },
      { id: "cover", text: "Assembly. Installation. Even measurement.", caption: "Assembly. Installation. *Even measurement.*", beat: 38.74 },
      { id: "ways", text: "Three ways to plug in.", caption: "*Three ways* to plug in.", beat: 44.74 },
      { id: "standard", text: "A branded page, with zero code. It's free, and live in days.", caption: "A branded page, zero code. *Free, and live in days.*", beat: 48.64 },
      { id: "widget", text: "A widget, with real-time quotes on your own site.", caption: "A widget, with *real-time quotes* on your site.", beat: 57.64 },
      { id: "api", text: "Or the API, and build it your way.", caption: "Or the API, and *build it your way.*", beat: 63.64 },
      { id: "shops", text: "It works with Shopify, and the major platforms.", caption: "Works with Shopify and the *major platforms.*", beat: 69.64 },
      { id: "match", text: "Vetted pros, matched to your product. Every job tracked in real time.", caption: "*Vetted pros,* matched to your product. Tracked in *real time.*", beat: 76.74 },
      { id: "dash", text: "You get your own dashboard, and a dedicated sales person.", caption: "Your own *dashboard,* and a *dedicated sales person.*", beat: 86.74 },
      { id: "why", text: "Fewer returns. Fewer bad reviews. And a new revenue stream.", caption: "Fewer returns. Fewer bad reviews. *A new revenue stream.*", beat: 93.74 },
      { id: "end", text: "You sell it. We handle everything after. Partner with us, at Fixed-man dot com.", caption: "You sell it. We handle everything after. *Partner with us.*", beat: 102.74 },
    ],
  },
} satisfies ReelConfig;
