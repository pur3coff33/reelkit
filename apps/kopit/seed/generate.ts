// The demo household's spending: about six months of a believable Filipino household (Maya and Leo), ending yesterday.
// Pure and seeded, so the same day always gives the same data. Amounts are whole centavos, times are Manila time
// (kop.it's own conventions), and later months spend a little less on wants so the gallery has months that bloom.

export type CategoryKey =
  | "groceries" | "meals" | "bills" | "transport" | "health" | "school" | "household"
  | "eating-out" | "shopping" | "fun" | "gifts" | "vices";

export type Entry = { id: string; profile: "maya" | "leo"; category: CategoryKey; centavos: number; note: string | null; spentAt: number };

export const DAY_MS = 86_400_000;
export const MANILA_OFFSET_MS = 8 * 3_600_000;

/** kop.it's day key: days since the epoch in Manila time. */
export const dayKey = (ms: number) => Math.floor((ms + MANILA_OFFSET_MS) / DAY_MS);
/** The UTC ms when Manila day `day` starts. */
export const startOf = (day: number) => day * DAY_MS - MANILA_OFFSET_MS;

/** mulberry32: small, fast, good enough for demo data. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const between = (r: Rand, lo: number, hi: number, step = 5) => Math.round((lo + r() * (hi - lo)) / step) * step;
const pick = <T,>(r: Rand, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const peso = (p: number) => p * 100;

function uuid(r: Rand) {
  const h = Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16));
  h[12] = "4";
  h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Calendar parts of a Manila day. */
function parts(day: number) {
  const d = new Date(startOf(day) + MANILA_OFFSET_MS);
  return { date: d.getUTCDate(), weekday: d.getUTCDay(), monthIndex: d.getUTCFullYear() * 12 + d.getUTCMonth() };
}

/**
 * How much of their usual wants a month spends, oldest first: a few ups, more downs, so at least two months come in
 * cheaper than the one before. Indexed from the end (the current month is the last).
 */
const WANT_FACTOR = [1.25, 1.1, 1.2, 1.0, 0.9, 0.8, 0.75];

/** The days the household has been using kop.it: from `firstDay` up to and including yesterday. */
export function generate(opts: { today: number; days: number; seed?: number }): { firstDay: number; entries: Entry[] } {
  const r = rng(opts.seed ?? 20261025);
  const yesterday = opts.today - 1;
  const firstDay = opts.today - opts.days;
  const lastMonth = parts(yesterday).monthIndex;
  const out: Entry[] = [];
  const add = (day: number, profile: Entry["profile"], category: CategoryKey, pesos: number, note: string | null, hour?: number) => {
    const h = hour ?? 7 + r() * 14;
    out.push({ id: uuid(r), profile, category, centavos: peso(pesos), note, spentAt: startOf(day) + Math.floor(h * 3_600_000) });
  };

  for (let day = firstDay; day < yesterday; day++) {
    const { date, weekday, monthIndex } = parts(day);
    const f = WANT_FACTOR[Math.max(0, WANT_FACTOR.length - 1 - (lastMonth - monthIndex))];
    const weekend = weekday === 0 || weekday === 6;

    // A quiet day now and then: nothing at all (History shows a butterfly).
    if (r() < 0.04) continue;

    // Needs.
    if (weekday === 3 || weekday === 6) add(day, "maya", "groceries", between(r, 650, 1900), pick(r, ["Puregold", "SM Supermarket", "Palengke", null]));
    if (!weekend) add(day, "leo", "meals", between(r, 110, 230), pick(r, ["Lunch", "Carinderia", null]), 12 + r());
    if (!weekend) add(day, "leo", "transport", between(r, 40, 160), pick(r, ["Jeep", "Grab", "MRT", null]), 8 + r());
    if (date === 5) add(day, "maya", "bills", 1699, "Internet");
    if (date === 10) add(day, "maya", "bills", between(r, 2800, 3600, 1), "Electricity");
    if (date === 15) add(day, "maya", "bills", between(r, 380, 520, 1), "Water");
    if (date === 20) add(day, "leo", "bills", 299, "Load");
    if (r() < 0.08) add(day, pick(r, ["maya", "leo"] as const), "health", between(r, 150, 800), pick(r, ["Mercury Drug", "Haircut", null]));
    if (r() < 0.06) add(day, "maya", "household", between(r, 300, 1500), pick(r, ["Padala kay Mama", "Pamangkin", null]));
    if (r() < 0.04) add(day, "leo", "school", between(r, 200, 900), pick(r, ["Online course", "Printing", null]));

    // Wants, scaled by the month.
    if (r() < 0.38 * f) add(day, pick(r, ["maya", "leo"] as const), "eating-out", Math.round(between(r, 150, 650) * f), pick(r, ["Jollibee", "Milk tea", "Mang Inasal", "Coffee", null]));
    if (r() < 0.14 * f) add(day, "maya", "shopping", Math.round(between(r, 250, 1500) * f), pick(r, ["Shopee", "Lazada", "Uniqlo", null]));
    if (weekend && r() < 0.4 * f) add(day, pick(r, ["maya", "leo"] as const), "fun", Math.round(between(r, 300, 1200) * f), pick(r, ["Sine", "Netflix", "Out with friends", null]));
    if (r() < 0.03) add(day, "maya", "gifts", between(r, 400, 1500), pick(r, ["Birthday gift", "Ninang", null]));
    // Leo quit five weeks ago: no vices in the 28 days today's missions are drawn from, so none of them names one.
    if (day < yesterday - 35 && r() < 0.12 * f) add(day, "leo", "vices", Math.round(between(r, 60, 220) * f), pick(r, ["Yosi", "Beer", null]));
  }

  // Yesterday: a calm, good day for the AI note to talk about. Under the usual, no vices, wants small.
  add(yesterday, "leo", "transport", 85, "Jeep", 8.2);
  add(yesterday, "leo", "meals", 165, "Lunch", 12.3);
  add(yesterday, "maya", "groceries", 380, "Palengke", 9.5);
  add(yesterday, "maya", "eating-out", 120, "Milk tea", 16.1);

  out.sort((a, b) => a.spentAt - b.spentAt);
  return { firstDay, entries: out };
}
