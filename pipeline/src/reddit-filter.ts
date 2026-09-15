// reddit-filter.ts — Engagement-floor pre-filter for Reddit feeds.
// Runs BEFORE triage so we don't waste Azure calls on low-engagement posts.
// DECISIONS 2026-05-21: drop stickies + score>=50 + num_comments>=10.
// Pure: no I/O.

import type { FeedItem } from "./types.js";

/** DECISIONS 2026-05-21. Tune by editing the constant; uniform across subs. */
export const REDDIT_MIN_SCORE = 50;
/** DECISIONS 2026-05-21. Engagement floor — filters out announcement-only posts. */
export const REDDIT_MIN_COMMENTS = 10;

export type FilterReason =
  | "stickied"
  | "score_below_floor"
  | "comments_below_floor"
  | "missing_engagement";

export type FilterDecision = {
  item: FeedItem;
  reason: FilterReason;
};

/**
 * Drops Reddit posts that:
 *   1. are stickied (Reddit pins old posts indefinitely; they keep reappearing
 *      in /new.json forever and would otherwise leak in repeatedly until the
 *      retention window expires).
 *   2. have score < REDDIT_MIN_SCORE.
 *   3. have num_comments < REDDIT_MIN_COMMENTS.
 *
 * Both gates apply (AND, not OR) — a post must clear BOTH floors. Net upvotes
 * alone catch viral noise; comments alone catch high-engagement announcements
 * without substance. Together they isolate the field-report / discussion
 * pattern the hub wants.
 *
 * Pure. Returns the survivors and the rejects (with reason) so callers can log.
 *
 * Items WITHOUT a `reddit` block are dropped with `missing_engagement` — this
 * function should only see items from `reddit-json` feeds. If a non-Reddit item
 * reaches here, that's a wiring bug, not data we want to pass through silently.
 */
export function applyRedditEngagementFilter(
  items: readonly FeedItem[],
): { kept: FeedItem[]; dropped: FilterDecision[] } {
  const kept: FeedItem[] = [];
  const dropped: FilterDecision[] = [];

  for (const item of items) {
    if (!item.reddit) {
      dropped.push({ item, reason: "missing_engagement" });
      continue;
    }
    if (item.reddit.stickied) {
      dropped.push({ item, reason: "stickied" });
      continue;
    }
    if (item.reddit.score < REDDIT_MIN_SCORE) {
      dropped.push({ item, reason: "score_below_floor" });
      continue;
    }
    if (item.reddit.num_comments < REDDIT_MIN_COMMENTS) {
      dropped.push({ item, reason: "comments_below_floor" });
      continue;
    }
    kept.push(item);
  }

  return { kept, dropped };
}
