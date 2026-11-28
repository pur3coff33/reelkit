// `npm run <step> -- <app> [flags]`. Each step reads the app's module (apps/<app>/app.ts) and writes into apps/<app>/out/.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { AppModule } from "./kit/config";
import { appDir, ensureOut } from "./kit/paths";

const [step, app, ...flags] = process.argv.slice(2);
const STEPS = ["seed", "capture", "voice", "music", "beats", "render", "export", "reel", "studio", "post", "fetch"] as const;

function flag(name: string) {
  const i = flags.indexOf(`--${name}`);
  return i < 0 ? undefined : (flags[i + 1] ?? "");
}

async function load(name: string): Promise<AppModule> {
  const file = join(appDir(name), "app.ts");
  if (!existsSync(file)) throw new Error(`no app "${name}" (looked for ${file})`);
  return (await import(pathToFileURL(file).href)).app;
}

async function main() {
  if (!STEPS.includes(step as never) || !app) {
    console.log(`usage: npm run <${STEPS.join("|")}> -- <app>`);
    process.exit(1);
  }
  const mod = await load(app);
  ensureOut(app);
  const steps = step === "reel" ? (["capture", "voice", "music", "beats", "render", "export"] as const) : [step];
  for (const s of steps) {
    console.log(`\n▶ ${s} ${app}`);
    switch (s) {
      case "seed":
        if (!mod.seed) throw new Error(`${app} has no seed`);
        await mod.seed(flags);
        break;
      case "capture":
        await (await import("./kit/capture/record")).captureAll(mod, { only: flag("only"), peek: flags.includes("--peek") });
        break;
      case "voice":
        if (mod.voice) await mod.voice(flags);
        else await (await import("./kit/voice/kokoro")).voice(mod.config, flag("voice"));
        break;
      case "music":
        if (mod.music && mod.config.music.generated) await mod.music(join(appDir(app), mod.config.music.file));
        else console.log("  using the music file as it is");
        break;
      case "beats":
        await (await import("./kit/beats/beats")).writeBeats(mod.config);
        break;
      case "render":
        await (await import("./kit/render")).render(mod.config);
        break;
      case "export":
        await (await import("./kit/export/export")).exportReel(mod.config, flags.includes("--extras"));
        break;
      case "studio":
        await (await import("./kit/render")).studio(mod.config);
        break;
      case "fetch":
        await (await import("./kit/doc/fetch")).fetchMedia(app);
        break;
      case "post":
        await (await import("./kit/post/facebook")).post(mod.config, flags);
        break;
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
