import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { SnapshotMissingError } from "./errors.js";

export type Pillar = "glossary" | "tips" | "skills" | "journeys";

function defaultBundledPath(): string {
  const fromEnv = process.env["CLAUDE_PLUGIN_ROOT"];
  if (fromEnv) return resolve(fromEnv, "snapshot");
  return resolve(process.cwd(), "snapshot");
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function isNonEmptyDir(p: string): boolean {
  if (!existsSync(p)) return false;
  try {
    const stat = statSync(p);
    if (!stat.isDirectory()) return false;
    return readdirSync(p).filter((f) => !f.startsWith(".")).length > 0;
  } catch {
    return false;
  }
}

export function resolveSnapshotPath(opts?: {
  bundled?: string;
  cache?: string;
}): string {
  const bundled = opts?.bundled ?? defaultBundledPath();
  const cache = opts?.cache ? expandHome(opts.cache) : undefined;

  if (cache && isNonEmptyDir(cache)) return cache;
  if (isNonEmptyDir(bundled)) return bundled;
  throw new SnapshotMissingError(bundled);
}

export interface SnapshotMeta {
  generatedAt: string;
  sourceCommit: string;
}

export function readSnapshotMeta(snapshotPath: string): SnapshotMeta {
  const metaPath = join(snapshotPath, ".snapshot-meta.json");
  if (!existsSync(metaPath)) {
    throw new SnapshotMissingError(metaPath);
  }
  try {
    const raw = readFileSync(metaPath, "utf-8");
    const data = JSON.parse(raw) as Partial<SnapshotMeta>;
    if (typeof data.generatedAt !== "string" || typeof data.sourceCommit !== "string") {
      throw new SnapshotMissingError(metaPath, "malformed .snapshot-meta.json");
    }
    return { generatedAt: data.generatedAt, sourceCommit: data.sourceCommit };
  } catch (err) {
    if (err instanceof SnapshotMissingError) throw err;
    throw new SnapshotMissingError(metaPath, err instanceof Error ? err.message : String(err));
  }
}

function pillarDir(snapshotPath: string, pillar: Pillar): string {
  return join(snapshotPath, pillar);
}

export function listPillarFiles(snapshotPath: string, pillar: Pillar): string[] {
  const dir = pillarDir(snapshotPath, pillar);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(dir, f))
      .sort();
  } catch {
    return [];
  }
}
