// Where each app's files live. An app's folder is also Remotion's public dir when its reel renders,
// so everything a composition reads is under it: `out/…` (generated) and `assets/…` (kept in git).
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const appDir = (app: string) => join(ROOT, "apps", app);
export const outDir = (app: string, ...parts: string[]) => join(appDir(app), "out", ...parts);

/** `outDir`, created if missing. */
export function ensureOut(app: string, ...parts: string[]) {
  const dir = outDir(app, ...parts);
  mkdirSync(dir, { recursive: true });
  return dir;
}
