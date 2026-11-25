// Running other programs: one-off commands, and long-lived servers that are waited on until they answer.
import { spawn, type ChildProcess } from "node:child_process";

export type RunOptions = { cwd?: string; env?: Record<string, string | undefined>; quiet?: boolean };

/** Runs a command to the end and returns its output; throws with the output when it fails. */
export function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, env: { ...process.env, ...opts.env }, shell: process.platform === "win32" && !cmd.includes("\\") });
    let out = "";
    const take = (b: Buffer) => {
      out += b.toString();
      if (!opts.quiet) process.stdout.write(b);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}\n${out.slice(-2000)}`))));
  });
}

/** Starts a server and resolves once `url` answers. `stop()` ends it and everything it started. */
export async function serve(cmd: string, args: string[], url: string, opts: RunOptions & { timeoutMs?: number } = {}) {
  const child = spawn(cmd, args, { cwd: opts.cwd, env: { ...process.env, ...opts.env }, shell: process.platform === "win32" });
  let log = "";
  child.stdout.on("data", (b) => (log += b));
  child.stderr.on("data", (b) => (log += b));
  const stop = () => kill(child);
  const deadline = Date.now() + (opts.timeoutMs ?? 90_000);
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${cmd} exited early:\n${log.slice(-2000)}`);
    try {
      await fetch(url, { redirect: "manual" });
      return { stop, log: () => log };
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await stop();
  throw new Error(`${url} never answered:\n${log.slice(-2000)}`);
}

/** Ends a process and its children (on Windows a shell-started server is a tree). */
function kill(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || !child.pid) return resolve();
    child.once("close", () => resolve());
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"]);
    else child.kill("SIGTERM");
  });
}
