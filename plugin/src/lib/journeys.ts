import { basename } from "node:path";
import { listPillarFiles } from "./snapshot.js";
import { parseMarkdownFile } from "./frontmatter.js";
import type { ParsedMarkdown } from "./frontmatter.js";
import { JourneyMissingError } from "./errors.js";

export interface JourneyEntry {
  slug: string;
  sourcePath: string;
  parsed: ParsedMarkdown;
}

export function slugFromPath(path: string): string {
  return basename(path).replace(/\.md$/, "");
}

export function listJourneys(snapshotPath: string): JourneyEntry[] {
  const files = listPillarFiles(snapshotPath, "journeys");
  return files.map((f) => ({
    slug: slugFromPath(f),
    sourcePath: f,
    parsed: parseMarkdownFile(f),
  }));
}

export function findJourney(snapshotPath: string, slug: string): JourneyEntry {
  const all = listJourneys(snapshotPath);
  const match = all.find((j) => j.slug === slug);
  if (!match) throw new JourneyMissingError(slug);
  return match;
}

const PLACEHOLDER_PATTERNS = [
  /content (is )?coming soon/i,
  /\[content in progress\]/i,
  /TBD\b/i,
  /to be (authored|written)/i,
];

export function isPlaceholderBody(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 50) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed));
}
