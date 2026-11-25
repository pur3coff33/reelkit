// Running kop.it from its own repo, but with every bit of local state in reelkit/.state/kopit: the user's own
// local data (kopit/.wrangler) is never touched, and kop.it's code is never changed.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ROOT, appDir } from "../../src/kit/paths";
import { run, serve } from "../../src/kit/proc";

export const KOPIT = resolve(appDir("kopit"), "..", "..", "..", "kopit");
// Outside the app folder: that folder is Remotion's public dir, copied into every render.
export const STATE = join(ROOT, ".state", "kopit");
export const PORT = 8790;
export const BASE = `http://127.0.0.1:${PORT}`;

export const DEMO = { username: "demo-garden", pin: "246810", people: ["Maya", "Leo"] };

const wrangler = (args: string[], quiet = true) => run("npx", ["wrangler", ...args], { cwd: KOPIT, quiet });

export function resetState() {
  rmSync(STATE, { recursive: true, force: true });
  mkdirSync(STATE, { recursive: true });
}

export const migrate = () => wrangler(["d1", "migrations", "apply", "kopit", "--local", "--persist-to", STATE], false);

/** Runs SQL against the isolated database and returns the rows of its last statement. */
export async function sql<T = Record<string, unknown>>(statements: string): Promise<T[]> {
  const file = join(tmpdir(), `reelkit-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(file, statements);
  let out: string;
  try {
    out = await wrangler(["d1", "execute", "kopit", "--local", "--persist-to", STATE, "--file", file, "--json"]);
  } finally {
    rmSync(file, { force: true });
  }
  const json = JSON.parse(out.slice(out.indexOf("[")));
  return (json.at(-1)?.results ?? []) as T[];
}

/**
 * kop.it's dev server on the isolated state. `realNotes`: without DUMMY_NOTES, so a day's note comes from the real
 * Workers AI (kop.it's AI binding is remote; this needs `wrangler login`).
 */
export async function dev(opts: { realNotes: boolean }) {
  // --local would switch the remote AI binding off; the database stays local either way.
  const args = ["wrangler", "dev", "--port", String(PORT), "--ip", "127.0.0.1", "--persist-to", STATE];
  if (!opts.realNotes) args.push("--local", "--var", "DUMMY_NOTES:1");
  const s = await serve("npx", args, `${BASE}/login`, { cwd: KOPIT, timeoutMs: 120_000 });
  return { url: BASE, stop: s.stop, log: s.log };
}

export const q = (s: string | null) => (s === null ? "NULL" : `'${s.replaceAll("'", "''")}'`);
