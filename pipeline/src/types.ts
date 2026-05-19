// Shared type aliases for the RSS news pipeline.
// No runtime code — pure type declarations.
// See project-design.md §2 for the canonical contract.

/**
 * One feed entry as it appears in config/rss-sources.json after JSON.parse.
 * Loader (config.ts) validates this shape and throws ConfigSchemaError on mismatch.
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
  enabled: boolean;
  auto_promote_eligible: boolean;
};

/**
 * Normalized item shape emitted by parse.ts. F3 contract.
 * `guid` / `link` may be absent depending on feed quality; fingerprint walks
 * the fallback chain (guid -> link -> title).
 */
export type FeedItem = {
  feedName: string;
  guid: string | null;
  link: string | null;
  title: string;
  publishedAt: Date | null;
  rawContent: string | null;
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
