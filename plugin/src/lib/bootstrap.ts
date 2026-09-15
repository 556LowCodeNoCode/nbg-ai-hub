import { loadConfig, type HubConfig } from "./config.js";
import { resolveSnapshotPath, readSnapshotMeta, type SnapshotMeta } from "./snapshot.js";
import { readState, type HubState } from "./state.js";
import { isHubError, exitCodeFor } from "./errors.js";

export interface Bootstrap {
  config: HubConfig;
  snapshotPath: string;
  meta: SnapshotMeta;
  state: HubState;
}

export function bootstrap(): Bootstrap {
  const config = loadConfig();
  const snapshotPath = resolveSnapshotPath({ cache: config.refreshCachePath });
  const meta = readSnapshotMeta(snapshotPath);
  const state = readState();
  return { config, snapshotPath, meta, state };
}

export function fail(err: unknown): never {
  if (isHubError(err)) {
    process.stderr.write(`${err.code}: ${err.message}\n`);
    process.exit(exitCodeFor(err));
  }
  if (err instanceof Error) {
    process.stderr.write(`E_UNKNOWN: ${err.message}\n`);
    process.exit(1);
  }
  process.stderr.write(`E_UNKNOWN: ${String(err)}\n`);
  process.exit(1);
}

export function run(main: () => void | Promise<void>): void {
  try {
    const result = main();
    if (result instanceof Promise) {
      result.catch((err) => fail(err));
    }
  } catch (err) {
    fail(err);
  }
}
