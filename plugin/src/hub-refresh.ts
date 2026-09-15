import { run, fail } from "./lib/bootstrap.js";
import { loadConfig } from "./lib/config.js";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { GitUnavailableError, NetworkError } from "./lib/errors.js";

function expandHome(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function ensureGit(): void {
  const probe = spawnSync("git", ["--version"], { stdio: "ignore" });
  if (probe.status !== 0) throw new GitUnavailableError();
}

run(() => {
  const config = loadConfig();
  ensureGit();

  const cache = expandHome(config.refreshCachePath);
  const tmpCache = `${cache}.tmp-${Date.now()}`;

  process.stdout.write(`Refreshing hub content from ${config.repoUrl}\n`);
  process.stdout.write(`Target: ${cache}\n`);

  if (existsSync(cache)) {
    process.stdout.write(`Pulling updates into existing cache…\n`);
    const pull = spawnSync("git", ["-C", cache, "pull", "--ff-only", "--depth", "1"], {
      stdio: "inherit",
    });
    if (pull.status !== 0) {
      fail(new NetworkError(`git pull failed (exit ${pull.status})`));
    }
    process.stdout.write("Refresh complete (pull).\n");
    return;
  }

  const parent = dirname(cache);
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });

  process.stdout.write(`Cloning fresh snapshot (shallow)…\n`);
  const clone = spawnSync(
    "git",
    ["clone", "--depth", "1", config.repoUrl, tmpCache],
    { stdio: "inherit" },
  );
  if (clone.status !== 0) {
    try {
      if (existsSync(tmpCache)) rmSync(tmpCache, { recursive: true, force: true });
    } catch {
      // best effort
    }
    fail(new NetworkError(`git clone failed (exit ${clone.status})`));
  }

  renameSync(tmpCache, cache);
  process.stdout.write("Refresh complete (clone).\n");
});
