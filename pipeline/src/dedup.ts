// dedup.ts — Walk /news/incoming/ + /news/published/, collect fingerprints
// from frontmatter. Missing folders are tolerated (returns empty set).
// See project-design.md §3.6.

import nodeFs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { Dirent } from "node:fs";

type FsLike = typeof import("node:fs/promises");

const SUBFOLDERS = ["incoming", "published"] as const;

/**
 * Walks both folders recursively, reads the YAML frontmatter of every *.md
 * file (via gray-matter), collects the `fingerprint` field. Files without a
 * `fingerprint` field are tolerated (skipped silently) — they're pre-pipeline
 * content, not RSS emissions.
 *
 * Missing folders are tolerated and treated as empty.
 */
export async function loadSeenFingerprints(
  newsRoot: string,
  fs: FsLike = nodeFs,
): Promise<Set<string>> {
  const seen = new Set<string>();

  for (const sub of SUBFOLDERS) {
    const dir = path.join(newsRoot, sub);
    await collectFromDir(dir, fs, seen);
  }

  return seen;
}

async function collectFromDir(
  dir: string,
  fs: FsLike,
  out: Set<string>,
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = (await fs.readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    // Missing folder is fine: treat as empty.
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFromDir(full, fs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;

    let raw: string;
    try {
      raw = await fs.readFile(full, "utf8");
    } catch {
      continue;
    }

    let parsed: ReturnType<typeof matter>;
    try {
      parsed = matter(raw);
    } catch {
      continue;
    }

    const data = parsed.data as Record<string, unknown>;
    const fp = data["fingerprint"];
    if (typeof fp === "string" && fp.length > 0) {
      out.add(fp);
    }
  }
}

/**
 * Convenience predicate. Pure — no I/O. Returns true iff the fingerprint
 * should be processed (NOT yet seen).
 */
export function isUnseen(fingerprint: string, seen: Set<string>): boolean {
  return !seen.has(fingerprint);
}

/**
 * Normalises a title for cross-feed duplicate detection.
 *
 * Pure. Lowercases, strips Reddit/HN-style leading prefixes (`Re:`, `[Update]`,
 * `[Discussion]`), collapses internal whitespace, and strips trailing
 * punctuation. Two titles that normalise to the same string are treated as
 * the same item even if they come from different feeds.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^\s*(re|fwd|fw):\s*/i, "")
    .replace(/^\s*\[[^\]]+\]\s*/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/g, "");
}

/**
 * Second-pass cross-feed dedup. Runs AFTER fingerprint dedup; catches items
 * that have distinct fingerprints (different feedName / guid / link) but
 * identical normalised titles (the same story cross-posted to multiple feeds).
 *
 * Tie-breaker among same-title candidates:
 *   1. Prefer the candidate from an `auto_promote_eligible: true` feed
 *      (HN/Wired/Verge wins over Reddit).
 *   2. Otherwise preserve insertion order (first seen wins, which mirrors
 *      the feed-list order in config/rss-sources.json).
 *
 * Pure. Returns `kept` in the original input order so downstream stages see a
 * deterministic, config-driven sequence.
 */
export function dedupByTitle<
  T extends { item: { feedName: string; title: string } },
>(
  candidates: readonly T[],
  feedMap: ReadonlyMap<string, { auto_promote_eligible: boolean }>,
): { kept: T[]; dropped: { dropped: T; survivor: T }[] } {
  const survivorByTitle = new Map<string, T>();
  const dropped: { dropped: T; survivor: T }[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeTitle(candidate.item.title);
    const existing = survivorByTitle.get(normalized);
    if (!existing) {
      survivorByTitle.set(normalized, candidate);
      continue;
    }
    const existingEligible =
      feedMap.get(existing.item.feedName)?.auto_promote_eligible ?? false;
    const candidateEligible =
      feedMap.get(candidate.item.feedName)?.auto_promote_eligible ?? false;
    if (candidateEligible && !existingEligible) {
      dropped.push({ dropped: existing, survivor: candidate });
      survivorByTitle.set(normalized, candidate);
    } else {
      dropped.push({ dropped: candidate, survivor: existing });
    }
  }

  const keptSet = new Set(survivorByTitle.values());
  const kept = candidates.filter((c) => keptSet.has(c));
  return { kept, dropped };
}
