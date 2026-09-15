// parse-reddit.ts — Parses Reddit's `/r/<sub>/new.json` payload into FeedItem[].
// Atom's `.rss` carries no engagement metadata (no score, no num_comments, no
// stickied flag) — DECISIONS 2026-05-21 switches Reddit feeds to JSON so the
// engagement filter (reddit-filter.ts) can work. Pure: no I/O.

import { FeedParseError } from "./parse.js";
import type { FeedItem } from "./types.js";

type RedditChild = {
  kind?: string;
  data?: Record<string, unknown>;
};

type RedditListing = {
  kind?: string;
  data?: {
    children?: RedditChild[];
  };
};

function pickString(data: Record<string, unknown>, key: string): string | null {
  const v = data[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function pickNumber(data: Record<string, unknown>, key: string): number | null {
  const v = data[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function pickBoolean(data: Record<string, unknown>, key: string): boolean {
  return data[key] === true;
}

/**
 * Parses one Reddit JSON listing into normalized FeedItem[]. Each item carries
 * `reddit.{score, num_comments, stickied}` for the downstream engagement filter.
 *
 * Throws FeedParseError on malformed input — same error type as parse.ts so
 * the orchestrator's per-feed failure handling treats both the same.
 *
 * Skips children whose `kind !== "t3"` (Reddit can return `t1`/`more`/etc. in
 * some listings; for `/new.json` only posts ("t3") matter).
 */
export function parseRedditJson(feedName: string, body: string): FeedItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    throw new FeedParseError(feedName, err);
  }

  const listing = parsed as RedditListing;
  if (!listing || typeof listing !== "object") {
    throw new FeedParseError(feedName, new Error("root must be an object"));
  }

  const children = listing.data?.children;
  if (!Array.isArray(children)) {
    throw new FeedParseError(
      feedName,
      new Error("data.children must be an array"),
    );
  }

  const items: FeedItem[] = [];
  for (const child of children) {
    if (!child || child.kind !== "t3") continue;
    const data = child.data;
    if (!data || typeof data !== "object") continue;

    const title = pickString(data, "title");
    if (!title) continue;

    const id = pickString(data, "name");
    const permalink = pickString(data, "permalink");
    const createdUtc = pickNumber(data, "created_utc");
    const score = pickNumber(data, "score") ?? 0;
    const numComments = pickNumber(data, "num_comments") ?? 0;
    const stickied = pickBoolean(data, "stickied");
    const selftext = pickString(data, "selftext");

    items.push({
      feedName,
      guid: id,
      link: permalink ? `https://www.reddit.com${permalink}` : null,
      title,
      publishedAt: createdUtc !== null ? new Date(createdUtc * 1000) : null,
      rawContent: selftext,
      reddit: {
        score,
        num_comments: numComments,
        stickied,
      },
    });
  }

  return items;
}
