// Shared type aliases for the RSS news pipeline.
// No runtime code — pure type declarations.
// See project-design.md §2 for the canonical contract.

/**
 * One feed entry as it appears in config/rss-sources.json after JSON.parse.
 * Loader (config.ts) validates this shape and throws ConfigSchemaError on mismatch.
 *
 * `type` (DECISIONS 2026-05-21) selects the fetch+parse path:
 *   - "rss"         — Atom or RSS 2.0 XML, parsed by @rowanmanning/feed-parser.
 *   - "reddit-json" — Reddit's `/r/<sub>/new.json` endpoint. Required because
 *                     Atom doesn't carry `score` / `num_comments` / `stickied`
 *                     which the engagement filter (reddit-filter.ts) needs.
 *
 * `auto_promote_eligible` is variant C policy (DECISIONS 2026-05-19): when an
 * item from this feed comes back from triage with `editor_confidence: "high"`,
 * the orchestrator writes it directly under `news/published/` rather than
 * `news/incoming/` — bypassing the editorial PR review. Reserved for
 * professional sources whose worst output is still acceptable hub content
 * (e.g. HN frontpage, Wired AI, The Verge). Reddit feeds keep this false.
 */
export type FeedSource = {
  name: string;
  url: string;
  type: "rss" | "reddit-json";
  enabled: boolean;
  auto_promote_eligible: boolean;
};

/**
 * Normalized item shape emitted by parse.ts. F3 contract.
 * `guid` / `link` may be absent depending on feed quality; fingerprint walks
 * the fallback chain (guid -> link -> title).
 *
 * `reddit` is set only when the source was a `reddit-json` feed (DECISIONS
 * 2026-05-21). The engagement filter consumes these fields and drops them
 * downstream — triage / fingerprint / write never read this field, so non-Reddit
 * code paths can ignore it.
 */
export type FeedItem = {
  feedName: string;
  guid: string | null;
  link: string | null;
  title: string;
  publishedAt: Date | null;
  rawContent: string | null;
  reddit?: {
    score: number;
    num_comments: number;
    stickied: boolean;
  };
};

/**
 * The five-field JSON object Azure OpenAI must return. F5 contract.
 *
 * `editor_confidence` is the model's self-rated certainty about the
 * `relevant` verdict — "high" for clear accept/reject, "low" when
 * borderline. The editor uses it to triage the review PR quickly.
 */
export type TriageResult = {
  relevant: boolean;
  audience: "beginner" | "advanced" | "both";
  topics: string[];
  summary: string;
  editor_confidence: "high" | "medium" | "low";
};

/**
 * The triaged item ready to be written. write.ts and pr.ts both consume this.
 */
export type EmittedItem = {
  item: FeedItem;
  triage: TriageResult;
  runDateUtc: string;
  fingerprint: string;
  slug: string;
  filename: string;
};

/**
 * The 13-key frontmatter object. AC11 asserts EXACTLY these keys, no more, no less.
 * `editor_confidence` is editorial metadata from the triage model — see TriageResult.
 */
export type NewsFrontmatter = {
  type: "news";
  title: string;
  audience: "beginner" | "advanced" | "both";
  topics: string[];
  editor_confidence: "high" | "medium" | "low";
  internal: false;
  authored: string;
  last_reviewed: string;
  external_link: string | null;
  deeper_link: null;
  ai_summary: string;
  source: string;
  fingerprint: string;
};

/**
 * Aggregate result returned by the orchestrator. Drives the step output and exit code.
 *
 * `autoPromoted` and `reviewNeeded` partition `itemsWritten` per variant C
 * (DECISIONS 2026-05-19). `itemsWritten` is their union, preserved for any
 * caller that doesn't care about the split.
 */
export type RunResult = {
  feedsAttempted: number;
  feedsFailed: { name: string; reason: string }[];
  itemsFetched: number;
  itemsDeduped: number;
  /** Cross-feed near-duplicates dropped by title normalisation. */
  itemsDedupedByTitle: number;
  itemsJudgedIrrelevant: number;
  itemsWritten: EmittedItem[];
  autoPromoted: EmittedItem[];
  reviewNeeded: EmittedItem[];
  exitCode: 0 | 1;
};

/**
 * Output of env.ts — the four validated AZURE_OPENAI_* values.
 */
export type EnvConfig = {
  endpoint: string;
  deployment: string;
  apiVersion: string;
  apiKey: string;
};
