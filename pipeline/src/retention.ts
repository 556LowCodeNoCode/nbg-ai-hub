// retention.ts — Rolling-window deletion of stale news/published/*.md files.
//
// Policy (DECISIONS 2026-05-19, third entry of the day): the site keeps the
// last 7 days of news on a rolling basis. Each daily pipeline run prunes any
// news/published/<YYYY-MM-DD>-*.md whose date prefix is strictly older than
// (today - RETENTION_DAYS). Deletions land in the same commit as the day's
// new items; the workflow pushes both in one push to main.
//
// Pure parse + filesystem unlink. No git operations — those happen in the
// workflow YAML, which already stages news/published/ (including deletions
// via `git add` in Git 2+).

import nodeFs from "node:fs/promises";
import path from "node:path";

type FsLike = typeof import("node:fs/promises");

export const RETENTION_DAYS = 7;

const DATE_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})-/;

/**
 * Parses the YYYY-MM-DD prefix from a news filename like "2026-05-19-foo.md".
 * Returns the UTC midnight Date if the prefix matches; null otherwise (the
 * file isn't an RSS-pipeline emission and should be left alone).
 *
 * Pure.
 */
export function parseFileDate(filename: string): Date | null {
  const m = DATE_PREFIX_RE.exec(filename);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d));
}

/**
 * True iff the file's date prefix is strictly older than (today - retentionDays).
 * Files lacking a date prefix are never stale (tolerated hand-curated content).
 *
 * Pure.
 */
export function isStale(
  filename: string,
  today: Date,
  retentionDays: number = RETENTION_DAYS,
): boolean {
  const fileDate = parseFileDate(filename);
  if (!fileDate) return false;
  const cutoff = today.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return fileDate.getTime() < cutoff;
}

/**
 * Lists absolute paths of stale *.md files under publishedDir. Tolerates a
 * missing publishedDir (returns []). Skips non-md files and files without a
 * date prefix.
 */
export async function findStalePublished(
  publishedDir: string,
  today: Date,
  retentionDays: number = RETENTION_DAYS,
  fs: FsLike = nodeFs,
): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(publishedDir);
  } catch {
    return [];
  }
  const stale: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    if (isStale(entry, today, retentionDays)) {
      stale.push(path.join(publishedDir, entry));
    }
  }
  return stale;
}

/**
 * Deletes the given files. Returns the count actually unlinked. Tolerates
 * paths that have already vanished (concurrent cleanup / manual rm).
 */
export async function pruneStalePublished(
  paths: readonly string[],
  fs: FsLike = nodeFs,
): Promise<number> {
  let count = 0;
  for (const p of paths) {
    try {
      await fs.unlink(p);
      count++;
    } catch {
      // Vanished or unreadable — ignore.
    }
  }
  return count;
}
