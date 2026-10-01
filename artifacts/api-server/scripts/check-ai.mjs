import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(here, "..");
const live = process.argv.length === 3 && process.argv[2] === "--live";
const hasUnsupportedArguments = process.argv.length > 2 && !live;

if (hasUnsupportedArguments) {
  console.error("Usage: node scripts/check-ai.mjs [--live]");
  process.exit(2);
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "somiren-ai-check-"));

try {
  const entry = live
    ? join(apiRoot, "src/lib/ai/smoke.ts")
    : join(apiRoot, "src/lib/ai/AIService.test.ts");
  const output = join(temporaryDirectory, live ? "smoke.mjs" : "AIService.test.mjs");
  await build({
    entryPoints: [entry],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    sourcemap: "inline",
    packages: "external",
  });

  const command = live
    ? [output]
    : ["--test", output];
  const result = spawnSync(process.execPath, command, {
    cwd: apiRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error("Unable to run the Somiren AI check.");
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
} catch {
  console.error("Unable to bundle the Somiren AI check.");
  process.exitCode = 1;
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}