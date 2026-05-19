// index.ts — Orchestrator. The only file that wires real implementations
// together. See project-design.md §3.14 + §4.
//
// Failure semantics summary:
//  - MissingEnvVarError, ConfigSchemaError -> propagate, exit 1.
//  - "no enabled feeds in config" -> log error, exit 1.
//  - per-feed FeedFetchError / FeedParseError -> log ::warning::, continue.
//  - all feeds failed -> throw AllFeedsFailedError, exit 1.
//  - per-item MalformedTriageResponseError -> log ::warning::, skip item.
//  - per-item writeNewsItem throws -> log ::error::, exit 1.

import nodeFs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AzureOpenAI } from "openai";

import type {
  EmittedItem,
  FeedItem,
  FeedSource,
  RunResult,
  TriageResult,
} from "./types.js";
import { loadConfig } from "./config.js";
import { dedupByTitle, loadSeenFingerprints } from "./dedup.js";
import { fetchFeedXml, FeedFetchError } from "./fetch.js";
import { parseFeed, FeedParseError } from "./parse.js";
import { computeFingerprint } from "./fingerprint.js";
import { resolveSlugCollision, slugify } from "./slug.js";
import { triageItem, MalformedTriageResponseError } from "./triage.js";
import { writeNewsItem } from "./write.js";
import { buildPrBody, setStepOutput, writePrBodyFile } from "./pr.js";
import { buildFeedMap, shouldAutoPromote } from "./auto-promote.js";
import {
  findStalePublished,
  pruneStalePublished,
  RETENTION_DAYS,
} from "./retention.js";
import { makeAzureClient } from "./azure-client.js";
import { readEnv } from "./env.js";
import { makeLogger, type Logger } from "./logger.js";

type FsLike = typeof import("node:fs/promises");

export class AllFeedsFailedError extends Error {
  public readonly failures: { name: string; reason: string }[];

  constructor(failures: { name: string; reason: string }[]) {
    super(`All ${failures.length} feeds failed`);
    this.name = "AllFeedsFailedError";
    this.failures = failures;
  }
}

export type RunOptions = {
  repoRoot?: string;
  configPath?: string;
  newsRoot?: string;
  pipelineDir?: string;
  now?: () => Date;
  fetchImpl?: typeof globalThis.fetch;
  fs?: FsLike;
  makeClient?: () => AzureOpenAI;
  logger?: Logger;
};

function defaultRepoRoot(): string {
  // From pipeline/src/index.ts (compiled to pipeline/dist/index.js), the repo
  // root is two levels up.
  const here = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(here), "..", "..");
}

function ymdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function run(options: RunOptions = {}): Promise<RunResult> {
  const fs = options.fs ?? nodeFs;
  const repoRoot = options.repoRoot ?? defaultRepoRoot();
  const configPath = options.configPath ?? path.join(repoRoot, "config", "rss-sources.json");
  const newsRoot = options.newsRoot ?? path.join(repoRoot, "news");
  const pipelineDir = options.pipelineDir ?? path.join(repoRoot, "pipeline");
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const logger = options.logger ?? makeLogger(process.stdout);

  const startMs = Date.now();
  const runDateUtc = ymdUtc(now());

  logger.info("pipeline_start", { repoRoot, configPath, newsRoot, runDateUtc });

  // 1. Load config.
  const allSources = await loadConfig(configPath, fs);
  const enabled = allSources.filter((s) => s.enabled);
  if (enabled.length === 0) {
    logger.error("no_enabled_feeds", { configuredCount: allSources.length });
    await setStepOutput("new_items", "false", process.env, fs);
    await setStepOutput("auto_promote_count", "0", process.env, fs);
    await setStepOutput("review_count", "0", process.env, fs);
    await setStepOutput("mode", "empty", process.env, fs);
    return {
      feedsAttempted: 0,
      feedsFailed: [],
      itemsFetched: 0,
      itemsDeduped: 0,
      itemsDedupedByTitle: 0,
      itemsJudgedIrrelevant: 0,
      itemsWritten: [],
      autoPromoted: [],
      reviewNeeded: [],
      exitCode: 1,
    };
  }

  logger.info("feeds_attempted", { count: enabled.length });

  // 2. Load seen fingerprints.
  const seen = await loadSeenFingerprints(newsRoot, fs);

  // 3. Per feed: fetch + parse. Promise.allSettled so one failure does not abort.
  type FeedOutcome =
    | { ok: true; feed: FeedSource; items: FeedItem[] }
    | { ok: false; feed: FeedSource; reason: string };

  const feedResults = await Promise.allSettled(
    enabled.map(async (feed): Promise<FeedOutcome> => {
      try {
        const xml = await fetchFeedXml(feed.url, fetchImpl);
        const items = parseFeed(feed.name, xml);
        return { ok: true, feed, items };
      } catch (err) {
        if (err instanceof FeedFetchError || err instanceof FeedParseError) {
          return { ok: false, feed, reason: err.message };
        }
        return { ok: false, feed, reason: String(err) };
      }
    }),
  );

  const successes: { feed: FeedSource; items: FeedItem[] }[] = [];
  const failures: { name: string; reason: string }[] = [];

  for (const result of feedResults) {
    if (result.status === "fulfilled") {
      const outcome = result.value;
      if (outcome.ok) {
        successes.push({ feed: outcome.feed, items: outcome.items });
        logger.info("feed_succeeded", { name: outcome.feed.name, itemsFetched: outcome.items.length });
      } else {
        failures.push({ name: outcome.feed.name, reason: outcome.reason });
        logger.warn("feed_failed", { name: outcome.feed.name, reason: outcome.reason });
      }
    } else {
      // Should not happen — mapper always resolves — but be defensive.
      failures.push({ name: "unknown", reason: String(result.reason) });
      logger.warn("feed_failed", { name: "unknown", reason: String(result.reason) });
    }
  }

  // 4. If all feeds failed, that's fatal.
  if (successes.length === 0 && failures.length > 0) {
    logger.error("all_feeds_failed", { count: failures.length });
    await setStepOutput("new_items", "false", process.env, fs);
    await setStepOutput("auto_promote_count", "0", process.env, fs);
    await setStepOutput("review_count", "0", process.env, fs);
    await setStepOutput("mode", "empty", process.env, fs);
    throw new AllFeedsFailedError(failures);
  }

  // 5. Flatten items, dedup, triage, write.
  const allItems = successes.flatMap((s) => s.items);
  const itemsFetched = allItems.length;
  logger.info("items_fetched_total", { count: itemsFetched });

  // Compute fingerprints and filter unseen BEFORE Azure calls.
  type WithFingerprint = { item: FeedItem; fingerprint: string };
  const candidates: WithFingerprint[] = [];
  let itemsDeduped = 0;
  for (const item of allItems) {
    const fp = computeFingerprint({
      feedName: item.feedName,
      guid: item.guid,
      link: item.link,
      title: item.title,
    });
    if (seen.has(fp)) {
      itemsDeduped++;
      continue;
    }
    candidates.push({ item, fingerprint: fp });
  }
  logger.info("items_deduped", { count: itemsDeduped });

  // Variant C (DECISIONS 2026-05-19): `feedMap` powers both the cross-feed
  // title dedup (below) and the auto-promote / review partition (later).
  const feedMap = buildFeedMap(allSources);

  // Cross-feed title dedup — catches items whose fingerprints already differ
  // (distinct feedName / guid / link) but whose normalised titles collide,
  // e.g. the same article cross-posted to r/ClaudeAI AND r/ClaudeCode. Among
  // ties, prefer an auto_promote_eligible feed.
  const { kept: dedupedCandidates, dropped: crossFeedDuplicates } =
    dedupByTitle(candidates, feedMap);
  for (const { dropped, survivor } of crossFeedDuplicates) {
    logger.warn("cross_feed_duplicate_dropped", {
      droppedFeed: dropped.item.feedName,
      droppedTitle: dropped.item.title,
      survivorFeed: survivor.item.feedName,
    });
  }
  const itemsDedupedByTitle = crossFeedDuplicates.length;
  logger.info("items_deduped_by_title", { count: itemsDedupedByTitle });

  // Build Azure client only if we actually need it (post-title-dedup).
  let client: AzureOpenAI | null = null;
  let deployment = "";
  if (dedupedCandidates.length > 0) {
    const env = readEnv();
    deployment = env.deployment;
    client = options.makeClient ? options.makeClient() : makeAzureClient(env);
  }

  // Triage each candidate, write each relevant one.
  // Variant C: partition writes between `incoming/` (editorial review) and
  // `published/` (auto-promote — high confidence + professional source).
  let itemsJudgedIrrelevant = 0;
  const takenSlugs = new Set<string>();
  const written: EmittedItem[] = [];
  const autoPromoted: EmittedItem[] = [];
  const reviewNeeded: EmittedItem[] = [];

  for (const c of dedupedCandidates) {
    let triageResult: TriageResult | null;
    try {
      triageResult = await triageItem(client!, deployment, c.item);
    } catch (err) {
      if (err instanceof MalformedTriageResponseError) {
        logger.warn("triage_malformed", {
          item: c.item.title,
          issue: err.issue,
          payloadPreview: err.rawPayload.slice(0, 500),
        });
      } else {
        logger.warn("triage_error", { item: c.item.title, reason: String(err) });
      }
      continue;
    }

    if (triageResult === null) {
      itemsJudgedIrrelevant++;
      continue;
    }

    const triage: TriageResult = triageResult;
    const baseSlug = slugify(c.item.title);
    const slug = resolveSlugCollision(baseSlug, takenSlugs);
    takenSlugs.add(slug);

    const filename = `${runDateUtc}-${slug}.md`;
    const emitted: EmittedItem = {
      item: c.item,
      triage,
      runDateUtc,
      fingerprint: c.fingerprint,
      slug,
      filename,
    };

    const destination: "incoming" | "published" = shouldAutoPromote(
      emitted,
      feedMap,
    )
      ? "published"
      : "incoming";

    try {
      await writeNewsItem(emitted, newsRoot, destination, fs);
    } catch (err) {
      logger.error("write_failed", { filename, reason: String(err) });
      await setStepOutput("new_items", "false", process.env, fs);
      await setStepOutput("auto_promote_count", String(autoPromoted.length), process.env, fs);
      await setStepOutput("review_count", String(reviewNeeded.length), process.env, fs);
      await setStepOutput("mode", "empty", process.env, fs);
      return {
        feedsAttempted: enabled.length,
        feedsFailed: failures,
        itemsFetched,
        itemsDeduped,
        itemsDedupedByTitle,
        itemsJudgedIrrelevant,
        itemsWritten: written,
        autoPromoted,
        reviewNeeded,
        exitCode: 1,
      };
    }

    written.push(emitted);
    if (destination === "published") {
      autoPromoted.push(emitted);
    } else {
      reviewNeeded.push(emitted);
    }
  }

  logger.info("items_judged_irrelevant", { count: itemsJudgedIrrelevant });
  logger.info("items_written", {
    count: written.length,
    autoPromoted: autoPromoted.length,
    reviewNeeded: reviewNeeded.length,
    filenames: written.map((w) => w.filename),
  });

  // 5b. Rolling-window retention. Delete published items older than
  // RETENTION_DAYS (default 7) per DECISIONS 2026-05-19 (third entry).
  // Workflow stages news/published/ with `git add` which picks up deletions.
  const publishedDir = path.join(newsRoot, "published");
  const stalePaths = await findStalePublished(
    publishedDir,
    now(),
    RETENTION_DAYS,
    fs,
  );
  for (const p of stalePaths) {
    logger.info("prune_stale_published", { file: path.basename(p) });
  }
  const prunedCount = await pruneStalePublished(stalePaths, fs);
  logger.info("items_pruned", { count: prunedCount, retentionDays: RETENTION_DAYS });

  // 6. PR signaling.
  // Variant C three-mode contract (DECISIONS 2026-05-19):
  //  - auto_only:   review==0, auto>0  → workflow commits directly to main
  //  - mixed:       review>0,  auto>0  → workflow opens editorial PR
  //  - review_only: review>0,  auto==0 → workflow opens editorial PR (current flow)
  //  - empty:       both 0             → no-op
  const autoCount = autoPromoted.length;
  const reviewCount = reviewNeeded.length;
  let mode: "auto_only" | "mixed" | "review_only" | "empty";
  if (autoCount === 0 && reviewCount === 0) {
    mode = "empty";
  } else if (reviewCount === 0) {
    mode = "auto_only";
  } else if (autoCount === 0) {
    mode = "review_only";
  } else {
    mode = "mixed";
  }

  // PR body is only needed when the workflow will open a PR (mixed or
  // review_only). For auto_only the body is unused; we still emit it for
  // visibility in case the workflow logs it.
  if (written.length > 0) {
    const body = buildPrBody(autoPromoted, reviewNeeded, runDateUtc);
    await writePrBodyFile(body, pipelineDir, fs);
    await setStepOutput("new_items", "true", process.env, fs);
  } else {
    logger.info("no_new_items", { message: "no new items, skipping PR" });
    await setStepOutput("new_items", "false", process.env, fs);
  }
  await setStepOutput("auto_promote_count", String(autoCount), process.env, fs);
  await setStepOutput("review_count", String(reviewCount), process.env, fs);
  await setStepOutput("mode", mode, process.env, fs);
  await setStepOutput("pruned_count", String(prunedCount), process.env, fs);
  const hadChanges = written.length > 0 || prunedCount > 0;
  await setStepOutput("had_changes", String(hadChanges), process.env, fs);

  const durationMs = Date.now() - startMs;
  logger.info("pipeline_end", { exitCode: 0, durationMs, mode, prunedCount });

  return {
    feedsAttempted: enabled.length,
    feedsFailed: failures,
    itemsFetched,
    itemsDeduped,
    itemsDedupedByTitle,
    itemsJudgedIrrelevant,
    itemsWritten: written,
    autoPromoted,
    reviewNeeded,
    exitCode: 0,
  };
}

// CLI entry: only runs when this module is executed directly.
const isMain = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
})();

if (isMain) {
  const logger = makeLogger(process.stdout);
  run()
    .then((result) => {
      process.exit(result.exitCode);
    })
    .catch((err: unknown) => {
      logger.error("pipeline_fatal", { reason: String(err) });
      process.exit(1);
    });
}
