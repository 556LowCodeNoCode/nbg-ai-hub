// parse.ts — XML string -> FeedItem[] via @rowanmanning/feed-parser.
// Pure: no I/O. See project-design.md §3.4.

import { parseFeed as rmParseFeed } from "@rowanmanning/feed-parser";
import type { FeedItem } from "./types.js";

export class FeedParseError extends Error {
  public readonly feedName: string;

  constructor(feedName: string, cause: unknown) {
    super(`Failed to parse feed "${feedName}": ${String(cause)}`);
    this.name = "FeedParseError";
    this.cause = cause;
    this.feedName = feedName;
  }
}

function pickString(entry: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = entry[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function pickDate(entry: Record<string, unknown>, ...keys: string[]): Date | null {
  for (const k of keys) {
    const v = entry[k];
    if (v instanceof Date) return v;
    if (typeof v === "string" && v.length > 0) {
      const parsed = new Date(v);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

/**
 * Parses one feed's XML into normalized items.
 *
 * @rowanmanning/feed-parser transparently handles RSS 2.0 and Atom and throws
 * `INVALID_FEED` (or related) on garbage; we wrap that in FeedParseError so
 * the orchestrator catches a single typed error per per-feed failure path.
 *
 * We read fields defensively (string-or-null) because the library's exact
 * property names have evolved: `id`/`guid`, `url`/`link`, `published`/`pubDate`.
 */
export function parseFeed(feedName: string, xml: string): FeedItem[] {
  let feed: { items: unknown[] };
  try {
    feed = rmParseFeed(xml) as unknown as { items: unknown[] };
  } catch (err) {
    throw new FeedParseError(feedName, err);
  }

  return feed.items.map((rawEntry): FeedItem => {
    const entry = (rawEntry ?? {}) as Record<string, unknown>;
    const guid = pickString(entry, "id", "guid");
    const link = pickString(entry, "url", "link");
    const title = pickString(entry, "title") ?? "(untitled)";
    const publishedAt = pickDate(entry, "published", "pubDate", "updated");
    const rawContent = pickString(entry, "content", "description", "summary");

    return {
      feedName,
      guid,
      link,
      title,
      publishedAt,
      rawContent,
    };
  });
}
