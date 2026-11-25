// Builds the demo household from scratch in the isolated database, then has the real Workers AI write yesterday's note.
// `--note` only asks for yesterday's note again (to re-roll one you don't like), keeping the household as it is.
import { readFileSync, writeFileSync } from "node:fs";
import { outDir } from "../../../src/kit/paths";
import { DEMO, dev, migrate, q, resetState, sql } from "../kopit";
import { get, login, post, type Cookies } from "../session";
import { dayKey, generate, startOf } from "./generate";
import { FALLBACK_NOTE, checkNote, type DayNote } from "./note";

/** Months of history before the current one: the data starts on the 1st, so the gallery has no half month. */
const MONTHS_BACK = 4;

type Demo = { householdId: number; profiles: { maya: number; leo: number }; day: number; days: number };

export async function seed(flags: string[] = []) {
  if (flags.includes("--note")) {
    const demo: Demo = JSON.parse(readFileSync(outDir("kopit", "demo.json"), "utf8"));
    if (demo.day !== dayKey(Date.now()) - 1) throw new Error("the seed is from another day: run the full seed instead");
    return writeNote(demo, false);
  }

  console.log("· fresh database");
  resetState();
  await migrate();

  // The household and its people, through kop.it's own forms (so the PIN is hashed the real way).
  console.log("· household and people");
  const server = await dev({ realNotes: false });
  try {
    const jar: Cookies = {};
    await post(server.url, "/setup", { username: DEMO.username, pin: DEMO.pin, pinConfirm: DEMO.pin }, jar);
    for (const name of DEMO.people) await post(server.url, "/setup/profiles", { name }, jar);
  } finally {
    await server.stop();
  }

  // Months of spending, straight into the database.
  console.log("· spending");
  const today = dayKey(Date.now());
  const now = new Date(startOf(today) + 8 * 3_600_000);
  const first = dayKey(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_BACK, 1) - 8 * 3_600_000);
  const days = today - first;
  const { firstDay, entries } = generate({ today, days });
  const [h] = await sql<{ id: number }>(`SELECT id FROM households WHERE username = ${q(DEMO.username)};`);
  const people = await sql<{ id: number; name: string }>(`SELECT id, name FROM profiles WHERE household_id = ${h.id} ORDER BY id;`);
  const cats = await sql<{ id: number; key: string }>(`SELECT id, key FROM categories WHERE household_id = ${h.id} AND key IS NOT NULL;`);
  const pid = { maya: people.find((p) => p.name === "Maya")!.id, leo: people.find((p) => p.name === "Leo")!.id };
  const cid = Object.fromEntries(cats.map((c) => [c.key, c.id]));
  const since = startOf(firstDay);
  const rows = entries.map(
    (e) => `(${q(e.id)}, ${h.id}, ${pid[e.profile]}, ${cid[e.category]}, ${e.centavos}, ${q(e.note)}, ${e.spentAt}, ${e.spentAt}, ${e.spentAt})`,
  );
  let s = `UPDATE households SET created_at = ${since} WHERE id = ${h.id};\n`;
  s += `UPDATE profiles SET created_at = ${since}, tours_seen = 'add,garden,history,shed' WHERE household_id = ${h.id};\n`;
  for (let i = 0; i < rows.length; i += 200) {
    s += `INSERT INTO entries (id, household_id, profile_id, category_id, amount_centavos, note, spent_at, created_at, updated_at) VALUES\n${rows.slice(i, i + 200).join(",\n")};\n`;
  }
  await sql(s);
  console.log(`  ${entries.length} expenses over ${days} days`);

  const demo: Demo = { householdId: h.id, profiles: pid, day: today - 1, days };
  writeFileSync(outDir("kopit", "demo.json"), JSON.stringify(demo, null, 2));
  await writeNote(demo, true);
}

/**
 * Yesterday's note, by the real AI. A rejected note is cleared and asked for once more; then the hand-written one is
 * stored instead and marked as a sample. `warm`: also work out every past day's missions (after a fresh seed).
 */
async function writeNote(demo: Demo, warm: boolean) {
  console.log("· yesterday's note (Workers AI)");
  const { householdId: id, day } = demo;
  const date = new Date(startOf(day) + 8 * 3_600_000).toISOString().slice(0, 10);
  let note: DayNote | null = null;
  let real = false;
  const server = await dev({ realNotes: true });
  try {
    const jar = await login(server.url, "Maya", demo.profiles.maya);
    for (let attempt = 1; attempt <= 2 && !note; attempt++) {
      await sql(`DELETE FROM day_notes WHERE household_id = ${id} AND day = ${day};`);
      const res = await askNote(server.url, date, jar);
      const [row] = await sql<{ note: string | null }>(`SELECT note FROM day_notes WHERE household_id = ${id} AND day = ${day};`);
      const got = row?.note ? (JSON.parse(row.note) as DayNote) : null;
      const problem = got ? checkNote(got) : `no note (HTTP ${res})`;
      if (!problem) {
        note = got;
        real = true;
      } else console.warn(`  try ${attempt}: ${problem}`);
    }
    if (warm) {
      // kop.it works out past days' missions lazily, 31 at a time per page; open the gallery until every day is in.
      console.log("· working out every day's missions");
      for (let i = 0; i < 12; i++) {
        await get(server.url, "/gallery", jar);
        const [{ n }] = await sql<{ n: number }>(`SELECT count(*) AS n FROM garden_days WHERE household_id = ${id};`);
        if (n >= demo.days - 1) break;
      }
    }
  } finally {
    await server.stop();
  }
  if (!note) {
    note = FALLBACK_NOTE;
    await sql(
      `DELETE FROM day_notes WHERE household_id = ${id} AND day = ${day};
       INSERT INTO day_notes (household_id, day, note, tries, created_at) VALUES (${id}, ${day}, ${q(JSON.stringify(note))}, 1, ${Date.now()});`,
    );
    console.warn("\n  ⚠ ⚠ ⚠  The AI note fell back to the HAND-WRITTEN sample. The reel will mark it as a sample.\n");
  }
  writeFileSync(outDir("kopit", "note.json"), JSON.stringify({ real, date, note }, null, 2));
  console.log(real ? "  ✓ real AI note kept (not happy with it? npm run seed -- kopit --note)" : "  sample note used");
  for (const l of note.lines) console.log(`  ${l.emoji} ${l.text}`);
  console.log(`  💡 ${note.tip}`);
}

/** Asks for the day's note like the morning card does, waiting out "later" answers. Returns the last HTTP status. */
async function askNote(base: string, date: string, jar: Cookies) {
  let status = 0;
  for (let i = 0; i < 6; i++) {
    const res = await get(base, `/api/day-note/${date}?full`, jar);
    status = res.status;
    if (status !== 503) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return status;
}
