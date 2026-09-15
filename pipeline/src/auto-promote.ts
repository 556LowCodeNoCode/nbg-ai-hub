// auto-promote.ts — Auto-promote-everything policy gate.
//
// Returns true iff a triaged item should be written directly under
// `news/published/` rather than `news/incoming/`, bypassing the editorial
// PR review. Single criterion:
//
//   - The originating feed is marked `auto_promote_eligible: true` in
//     `config/rss-sources.json`.
//
// All feeds are currently `auto_promote_eligible: true` per DECISIONS
// 2026-05-19 (second entry) — unconditional auto-promote. The
// `auto_promote_eligible` field is retained so an operator can re-introduce
// per-feed gating later by flipping the flag in config without code change.
//
// Unknown feed → false. We never auto-promote something whose policy we
// can't read. Pure — no I/O.

import type { EmittedItem, FeedSource } from "./types.js";

/**
 * Policy gate. See module header for rationale.
 *
 * Pure. Returns true iff the originating feed has
 * `auto_promote_eligible === true`. Unknown feed (not present in `feeds`
 * map) → false.
 */
export function shouldAutoPromote(
  emitted: EmittedItem,
  feeds: ReadonlyMap<string, FeedSource>,
): boolean {
  const feed = feeds.get(emitted.item.feedName);
  if (!feed) return false;
  return feed.auto_promote_eligible === true;
}

/**
 * Convenience: build a feedName → FeedSource lookup. Orchestrator builds this
 * once per run.
 */
export function buildFeedMap(
  feeds: readonly FeedSource[],
): Map<string, FeedSource> {
  return new Map(feeds.map((f) => [f.name, f]));
}
