# NbgAiHub — Project Design

Single source of truth for **how the project's components are built**: interfaces, contracts, data models, module structure, error-handling strategy, and architecture-level decisions.

Functional contract ("what the components do") lives in `project-functions.md`. Sequencing and verification criteria live in per-feature plan files (`plan-NNN-*.md`).

**Last updated:** 2026-05-19

---

## Conflicts requiring user input

**None.** The refined request (`docs/refined-requests/rss-pipeline.md`), the plan (`docs/design/plan-001-rss-pipeline.md`), and the investigation (`docs/reference/investigation-rss-pipeline.md`) are internally consistent on every load-bearing decision. The seven reconciliations in plan §1 (R-1 through R-7) are accepted as locked-in for this design. The five open questions (OQ1–OQ5) are non-blocking and need no design accommodation.

---

## 1. RSS news pipeline (plan-001-rss-pipeline)

### 1.1 System architecture and component diagram

The pipeline is a single GitHub Action workflow that invokes a Node 22 / ESM / TypeScript program under `pipeline/`. The program is the orchestrator; the workflow YAML is the shell wrapper that performs the git/PR side effects. Five dependency-injection seams isolate the orchestrator from real I/O so every module is testable without network, filesystem, or process access.

```
                       GitHub Actions runner (ubuntu-latest)
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  ┌─────────────────────────────────────────────────────────────────┐    │
  │  │  cron: 0 5 * * *      OR      workflow_dispatch                 │    │
  │  └────────────────────────────────┬────────────────────────────────┘    │
  │                                   │                                     │
  │                                   v                                     │
  │            .github/workflows/rss-triage.yml                             │
  │   ┌─────────────────────────────────────────────────────────────┐      │
  │   │ 1. actions/checkout@v4    (persists credentials; depth=1)   │      │
  │   │ 2. actions/setup-node@v4  (node-version-file=.nvmrc)        │      │
  │   │ 3. npm ci             working-directory: pipeline           │      │
  │   │ 4. npm run build      working-directory: pipeline           │      │
  │   │ 5. id: pipeline   npm run start                             │      │
  │   │       AZURE_OPENAI_* injected via secrets                   │      │
  │   │       step output: new_items = "true" | "false"             │      │
  │   │ 6. if new_items == "true":                                  │      │
  │   │       git branch / commit / push / gh pr create             │      │
  │   │       --body-file pipeline/pr-body.md                       │      │
  │   └─────────────────────────────┬───────────────────────────────┘      │
  │                                 │                                       │
  │                                 v                                       │
  │   ┌─────────────────────────────────────────────────────────────────┐   │
  │   │  pipeline/dist/index.js     (compiled from pipeline/src/)       │   │
  │   │                                                                 │   │
  │   │   readEnv()  ──[ ★ SEAM: process.env (read-only) ]              │   │
  │   │       │                                                         │   │
  │   │       v                                                         │   │
  │   │   loadConfig(configPath)  ──[ ★ SEAM: fs ]                      │   │
  │   │       │ FeedSource[]                                            │   │
  │   │       v                                                         │   │
  │   │   loadSeenFingerprints(newsRoot)  ──[ ★ SEAM: fs ]              │   │
  │   │       │ Set<string>                                             │   │
  │   │       v                                                         │   │
  │   │   for each enabled feed (Promise.allSettled):                   │   │
  │   │       fetchFeedXml(url)        ──[ ★ SEAM: fetch ]              │   │
  │   │           │ string (raw XML)                                    │   │
  │   │           v                                                     │   │
  │   │       parseFeed(feedName, xml)                                  │   │
  │   │           │ FeedItem[]                                          │   │
  │   │           v                                                     │   │
  │   │       filter by fingerprint not in seen                         │   │
  │   │           │ FeedItem[]                                          │   │
  │   │           v                                                     │   │
  │   │       for each new item:                                        │   │
  │   │           triageItem(client, item)  ──[ ★ SEAM: AzureOpenAI ]   │   │
  │   │               │ TriageResult | null                             │   │
  │   │               v                                                 │   │
  │   │           writeNewsItem(emittedItem, newsRoot, now)             │   │
  │   │                              ──[ ★ SEAM: fs, ★ SEAM: clock ]    │   │
  │   │       │                                                         │   │
  │   │       v                                                         │   │
  │   │   if (newItems.length > 0):                                     │   │
  │   │       buildPrBody(emitted) -> pipeline/pr-body.md               │   │
  │   │       setStepOutput("new_items", "true")                        │   │
  │   │   else:                                                         │   │
  │   │       setStepOutput("new_items", "false")                       │   │
  │   │                                                                 │   │
  │   └─────────────────────────┬───────────────────────────────────────┘   │
  │                             │                                           │
  │                             v                                           │
  │   ┌───────────────────────────────────────────────────────────────┐     │
  │   │  filesystem under repo root:                                  │     │
  │   │      /news/incoming/<YYYY-MM-DD>-<slug>.md  (new files)       │     │
  │   │      /pipeline/pr-body.md                   (transient)       │     │
  │   └───────────────────────────────────────────────────────────────┘     │
  │                             │                                           │
  │                             v                                           │
  │   ┌───────────────────────────────────────────────────────────────┐     │
  │   │  Workflow shell step (gated on new_items=="true"):            │     │
  │   │     git config user.name/email = github-actions[bot]          │     │
  │   │     git checkout -b news-triage/<DATE>-<RUN_ID:0:7>           │     │
  │   │     git add news/incoming                                     │     │
  │   │     git commit -m "News triage <DATE>"                        │     │
  │   │     git push origin <branch>                                  │     │
  │   │     gh pr create --title "News triage <DATE>" \               │     │
  │   │         --body-file pipeline/pr-body.md --base main           │     │
  │   │                ──[ ★ SEAM: execFile (only at unit-test       │     │
  │   │                    level; the YAML calls bare shell here)    │     │
  │   └───────────────────────────────────────────────────────────────┘     │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘

  External services (over HTTPS, native fetch):
      - Anthropic, GitHub releases, Simon Willison, Reddit, hnrss.org (feeds)
      - Azure OpenAI chat completions endpoint
      - GitHub API (via `gh` CLI; auth via $GITHUB_TOKEN)
```

**Five DI seams** (★ markers above). Each is described in §7.

**Note on `pr.ts` vs the shell step.** The plan (Step 12) split PR creation into a Node-side helper (`pr.ts`, which builds `pr-body.md` and signals `new_items`) and an inline workflow-shell block that actually invokes `git` and `gh`. This design preserves that split. `pr.ts` exports a body-builder + step-output writer that is fully unit-testable; the workflow YAML does the shell-out. A unit-test-only path inside `pr.ts` exercises a mocked `execFile` to verify the seam contract (see §3.7), but in production the YAML's inline commands are what actually run.

### 1.2 Module structure under `pipeline/`

All paths absolute. Every `.ts` file in `src/` has a matching `.test.ts` in `tests/`.

```
/Users/suzy/ClaudeCode/Projects/NbgAiHub/
├── .github/workflows/
│   └── rss-triage.yml                       (workflow YAML — §6)
├── config/
│   └── rss-sources.json                     (feed list; AC4)
├── news/
│   ├── incoming/.gitkeep                    (folder must exist for dedup walk)
│   └── published/.gitkeep
├── pipeline/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json                        (strict, ESM, Node 22; "target": "ES2023")
│   ├── vitest.config.ts
│   ├── .eslintrc.cjs
│   ├── .nvmrc                               (contents: 22)
│   ├── .gitignore                           (dist/, node_modules/, pr-body.md, coverage/)
│   ├── README.md                            (editorial workflow + known weak-spots)
│   ├── src/
│   │   ├── index.ts                         (orchestrator)
│   │   ├── env.ts                           (no-fallback env reader)
│   │   ├── config.ts                        (rss-sources.json loader + validator)
│   │   ├── fetch.ts                         (HTTP layer — SEAM)
│   │   ├── parse.ts                         (XML → FeedItem[] via @rowanmanning/feed-parser)
│   │   ├── fingerprint.ts                   (SHA-256 fingerprint, pure)
│   │   ├── dedup.ts                         (walks /news/* for seen fingerprints)
│   │   ├── azure-client.ts                  (AzureOpenAI constructor — SEAM)
│   │   ├── triage.ts                        (relevance + metadata via Azure)
│   │   ├── slug.ts                          (title → kebab-case slug, pure)
│   │   ├── frontmatter.ts                   (builds frontmatter object, pure)
│   │   ├── write.ts                         (emits markdown to /news/incoming/)
│   │   ├── pr.ts                            (PR body builder + step-output + exec seam)
│   │   ├── logger.ts                        (NF6 structured stdout)
│   │   └── types.ts                         (shared type aliases; no runtime code)
│   └── tests/
│       ├── env.test.ts
│       ├── config.test.ts
│       ├── fetch.test.ts
│       ├── parse.test.ts
│       ├── fingerprint.test.ts
│       ├── dedup.test.ts
│       ├── azure-client.test.ts
│       ├── triage.test.ts
│       ├── slug.test.ts
│       ├── frontmatter.test.ts
│       ├── write.test.ts
│       ├── pr.test.ts
│       ├── orchestrator.test.ts
│       ├── smoke.test.ts                    (scaffold sanity check)
│       └── fixtures/
│           ├── rss-2.0.xml                  (Anthropic-style RSS 2.0)
│           ├── atom.xml                     (GitHub releases-style Atom)
│           ├── malformed.xml                (for INVALID_FEED test)
│           ├── rss-sources.valid.json
│           ├── rss-sources.invalid.json
│           ├── triage-response.valid.json
│           ├── triage-response.malformed.json
│           └── existing-news/               (memfs seed for dedup test)
│               ├── incoming/2026-05-17-seen-item.md
│               └── published/2026-04-01-old-item.md
├── SECRETS.md                               (AC15)
├── SCOPE.md
├── DECISIONS.md
├── CLAUDE.md
└── Issues - Pending Items.md
```

**Single-responsibility summary** (one sentence each):

| File | Single responsibility | Pure? |
|---|---|---|
| `types.ts` | Shared TypeScript type aliases used across modules. | n/a |
| `env.ts` | Read four `AZURE_OPENAI_*` env vars; throw `MissingEnvVarError` if any is empty. | No (reads `process.env`) |
| `config.ts` | Read and validate `config/rss-sources.json`; return `FeedSource[]`. | No (fs) |
| `fetch.ts` | Fetch one URL → raw XML string; throw on non-2xx or network error. | No (HTTP, via SEAM) |
| `parse.ts` | Parse XML string → `FeedItem[]` using `@rowanmanning/feed-parser`. | Yes (in-memory only) |
| `fingerprint.ts` | SHA-256-of-(feedName + (guid\|\|link\|\|title)), hex, 16-char trunc. | Yes |
| `dedup.ts` | Walk `/news/incoming/` and `/news/published/`, collect fingerprints from frontmatter. | No (fs) |
| `azure-client.ts` | Construct an `AzureOpenAI` client from env; throw on missing env. | No (env + SDK ctor) |
| `triage.ts` | One Azure chat-completion per item, validate response shape, return `TriageResult \| null`. | No (Azure, via SEAM) |
| `slug.ts` | Title → kebab-case slug + same-day collision suffix. | Yes |
| `frontmatter.ts` | Build the 12-key frontmatter object and serialize to YAML. | Yes |
| `write.ts` | Write `<date>-<slug>.md` under `/news/incoming/` with frontmatter + body. | No (fs) |
| `pr.ts` | Build `pr-body.md` from emitted items; write `$GITHUB_OUTPUT` step output; expose `execFile`-wrapped helper used only in tests. | No (fs + exec seam) |
| `logger.ts` | NF6 structured stdout lines; `::warning::`/`::error::` workflow commands. | No (stdout) |
| `index.ts` | Compose everything; the only file that wires real implementations together. | No |

### 1.3 Naming conventions

| Asset | Convention | Example |
|---|---|---|
| Source files | lowercase-kebab-case `.ts`, one per module | `azure-client.ts` |
| Test files | mirror source file with `.test.ts` suffix | `azure-client.test.ts` |
| Test fixtures | descriptive lowercase, under `tests/fixtures/` | `rss-2.0.xml` |
| Type aliases / interfaces | `PascalCase` | `FeedItem`, `TriageResult`, `FeedSource` |
| Type alias for unions / DTOs | `PascalCase`, no `I` prefix | `EnvConfig`, `EmittedItem` |
| Exception classes | `PascalCase` ending in `Error` | `MissingEnvVarError`, `MalformedTriageResponseError`, `ConfigSchemaError`, `AllFeedsFailedError`, `FeedFetchError`, `FeedParseError` |
| Functions | `camelCase`, verb-first | `loadConfig`, `fetchFeedXml`, `triageItem` |
| Constants | `SCREAMING_SNAKE_CASE` for module-level immutables | `FINGERPRINT_HEX_LENGTH`, `SLUG_MAX_LENGTH` |
| Test names | Sentence-form lowercase, matching the AC verbiage where possible | `it("skips items whose fingerprint exists in incoming or published")` |
| Branch | `news-triage/<YYYY-MM-DD>-<short-run-id>` (A11) | `news-triage/2026-05-18-a1b2c3d` |
| Commit message | `News triage <YYYY-MM-DD>` (matches PR title) | `News triage 2026-05-18` |

---

## 2. Data models

All shared types live in `pipeline/src/types.ts` and are re-exported from `index.ts`. Modules import from `./types.js` (note the `.js` extension — required by Node 22 ESM resolution).

```ts
// pipeline/src/types.ts

/**
 * One feed entry as it appears in config/rss-sources.json after JSON.parse.
 * Loader (config.ts) validates this shape and throws ConfigSchemaError on mismatch.
 */
export type FeedSource = {
  name: string;        // human label, e.g. "Anthropic news"
  url: string;         // absolute https URL
  enabled: boolean;    // disabled entries are skipped at the orchestrator level
};

/**
 * Normalized item shape emitted by parse.ts. F3 contract.
 * `guid` / `link` may be absent depending on feed quality — fingerprint.ts
 * walks the fallback chain (guid -> link -> title).
 */
export type FeedItem = {
  feedName: string;            // copied from FeedSource.name
  guid: string | null;         // feed-provided unique id when present
  link: string | null;         // canonical http(s) URL when present
  title: string;               // always present (used as last-resort fingerprint input)
  publishedAt: Date | null;    // null if feed omits the date
  rawContent: string | null;   // raw description/content for the AI prompt
};

/**
 * The four-field JSON object Azure OpenAI must return. F5 contract.
 * Validated by triage.ts before being used. Malformed -> MalformedTriageResponseError
 * (caught by the orchestrator, item dropped, raw payload logged).
 */
export type TriageResult = {
  relevant: boolean;
  audience: "beginner" | "advanced" | "both";
  topics: string[];           // non-empty array of short kebab-case-ish tags
  summary: string;            // two sentences
};

/**
 * The triaged item ready to be written. Combines FeedItem + TriageResult + the
 * run-date the orchestrator chose. write.ts and pr.ts both consume this.
 */
export type EmittedItem = {
  item: FeedItem;
  triage: TriageResult;        // guaranteed relevant === true at this point
  runDateUtc: string;          // YYYY-MM-DD
  fingerprint: string;         // 16 hex chars
  slug: string;                // post collision-resolution; final filename slug
  filename: string;            // <runDateUtc>-<slug>.md
};

/**
 * The 12-key frontmatter object. AC11 asserts EXACTLY these keys, no more, no less.
 * Order is the canonical emission order (matches DECISIONS.md "Shared content shape"
 * with `source` and `fingerprint` appended).
 */
export type NewsFrontmatter = {
  type: "news";
  title: string;
  audience: "beginner" | "advanced" | "both";
  topics: string[];
  internal: false;
  authored: string;            // YYYY-MM-DD
  last_reviewed: string;       // YYYY-MM-DD; equal to authored at emission
  external_link: string | null;
  deeper_link: null;           // always null at emission; humans fill in later
  ai_summary: string;
  source: string;              // feedName
  fingerprint: string;         // 16-char hex
};

/**
 * Aggregate result returned by the orchestrator to its caller (index.ts main()).
 * Drives the step-output and exit code.
 */
export type RunResult = {
  feedsAttempted: number;
  feedsFailed: { name: string; reason: string }[];
  itemsFetched: number;
  itemsDeduped: number;
  itemsJudgedIrrelevant: number;
  itemsWritten: EmittedItem[];
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
```

---

## 3. Public interfaces / contracts per module

Function signatures below are the contract Phase 6 Coders must respect. Where a parameter has a default value, that default IS the production wiring; tests override it through the DI seam (§7).

### 3.1 `env.ts`

```ts
import type { EnvConfig } from "./types.js";

export class MissingEnvVarError extends Error {
  constructor(public readonly variableName: string) {
    super(`Required environment variable ${variableName} is missing or empty`);
    this.name = "MissingEnvVarError";
  }
}

/**
 * Reads AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION,
 * AZURE_OPENAI_API_KEY from the supplied process-env-like object (defaults to
 * `process.env`). Throws MissingEnvVarError on the FIRST missing/empty value
 * — checked in declaration order — with the variable name in the message and
 * on the .variableName property (AC10).
 *
 * No fallbacks, no defaults, no `.env` file lookup.
 */
export function readEnv(env?: NodeJS.ProcessEnv): EnvConfig;
```

### 3.2 `config.ts`

```ts
import type { FeedSource } from "./types.js";

export class ConfigSchemaError extends Error {
  constructor(public readonly path: string, public readonly issue: string) {
    super(`Invalid config at ${path}: ${issue}`);
    this.name = "ConfigSchemaError";
  }
}

/**
 * Loads and validates config/rss-sources.json. Returns the FULL list (both
 * enabled and disabled entries); callers filter on .enabled themselves.
 *
 * Throws ConfigSchemaError if:
 *  - file is missing or not JSON
 *  - root is not an array
 *  - any entry is missing `name` (string), `url` (string), or `enabled` (boolean)
 *  - `url` is not an http(s) URL
 *
 * `fs` is injected for testability (memfs in tests; node:fs/promises in production).
 */
export function loadConfig(
  configPath: string,
  fs?: typeof import("node:fs/promises"),
): Promise<FeedSource[]>;
```

### 3.3 `fetch.ts`

```ts
export class FeedFetchError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number | null,  // null => network/timeout error
    message: string,
  ) {
    super(message);
    this.name = "FeedFetchError";
  }
}

/**
 * Fetches one feed URL over HTTPS. Returns the response body as a string.
 * Throws FeedFetchError on:
 *  - non-2xx status (status set, message includes URL + status code)
 *  - network error / timeout (status = null)
 *
 * Default request timeout: 15 seconds via AbortController.
 * `fetchImpl` defaults to `globalThis.fetch` (Node 22 native); tests inject vi.fn().
 */
export function fetchFeedXml(
  url: string,
  fetchImpl?: typeof globalThis.fetch,
  options?: { timeoutMs?: number },
): Promise<string>;
```

### 3.4 `parse.ts`

```ts
import type { FeedItem } from "./types.js";

export class FeedParseError extends Error {
  constructor(public readonly feedName: string, cause: unknown) {
    super(`Failed to parse feed "${feedName}": ${String(cause)}`);
    this.name = "FeedParseError";
    this.cause = cause;
  }
}

/**
 * Parses one feed's XML into normalized items. Uses @rowanmanning/feed-parser
 * under the hood; that library transparently handles RSS 2.0 and Atom and
 * throws `INVALID_FEED` on garbage — we wrap that in FeedParseError so the
 * orchestrator catches a single typed error per per-feed failure path (AC6).
 *
 * Pure: no I/O, only string-in/array-out.
 */
export function parseFeed(feedName: string, xml: string): FeedItem[];
```

### 3.5 `fingerprint.ts`

```ts
export const FINGERPRINT_HEX_LENGTH = 16;

/**
 * SHA-256 of (`feedName` + "\n" + (guid ?? link ?? title)), hex-encoded,
 * truncated to FINGERPRINT_HEX_LENGTH characters (A5).
 *
 * Deterministic, pure. Same input -> same output across machines/runs.
 * Uses node:crypto.createHash, NOT subtle crypto.
 */
export function computeFingerprint(item: {
  feedName: string;
  guid: string | null;
  link: string | null;
  title: string;
}): string;
```

### 3.6 `dedup.ts`

```ts
/**
 * Walks both folders recursively, reads the YAML frontmatter of every *.md
 * file (via gray-matter), collects the `fingerprint` field. Files without a
 * `fingerprint` field are tolerated (logged at warn, not fatal) — they're
 * pre-pipeline content, not RSS emissions.
 *
 * Missing folders are tolerated and treated as empty (returns Set<string>()
 * without error). This is the path the very first run takes before any
 * news file exists.
 *
 * `fs` is injected for testability (memfs in tests).
 *
 * Returns a SYNC-friendly Set<string> — the orchestrator calls this once
 * up-front and uses .has() in a tight per-item loop.
 */
export function loadSeenFingerprints(
  newsRoot: string,                                 // e.g. "/<repo>/news"
  fs?: typeof import("node:fs/promises"),
): Promise<Set<string>>;

/**
 * Convenience predicate for the orchestrator loop. Pure function over a
 * pre-loaded set — no I/O. Returns true iff the fingerprint should be
 * processed (i.e., NOT yet seen).
 */
export function isUnseen(
  fingerprint: string,
  seen: Set<string>,
): boolean;
```

> **Note on sync vs async.** `loadSeenFingerprints` is async (reads many files). `isUnseen` is sync (set membership). The orchestrator does I/O once, then loops in memory. This matches AC7's "no Azure call for skipped items" performance contract.

### 3.7 `azure-client.ts`

```ts
import type { AzureOpenAI } from "openai";
import type { EnvConfig } from "./types.js";

/**
 * Constructs an AzureOpenAI client from a validated EnvConfig (or from
 * process.env when called without args — env.ts is invoked internally).
 *
 * MissingEnvVarError is thrown by env.ts before the AzureOpenAI constructor
 * is reached, so AC10 fails cleanly with the variable name in the message.
 *
 * The returned client routes by deployment URL path. Callers MUST still pass
 * `model: <deployment>` to chat.completions.create (R-6 / Investigation §1
 * gotcha 1). See triage.ts.
 */
export function makeAzureClient(env?: EnvConfig): AzureOpenAI;
```

### 3.8 `triage.ts`

```ts
import type { AzureOpenAI } from "openai";
import type { FeedItem, TriageResult } from "./types.js";

export class MalformedTriageResponseError extends Error {
  constructor(public readonly rawPayload: string, public readonly issue: string) {
    super(`Malformed Azure OpenAI triage response: ${issue}`);
    this.name = "MalformedTriageResponseError";
  }
}

/**
 * Calls Azure OpenAI chat completions for one item. Returns:
 *  - TriageResult when the response is well-formed AND relevant === true
 *  - null when the response is well-formed AND relevant === false (drop item, AC9)
 *
 * Throws MalformedTriageResponseError on shape mismatch (AC8 negative path);
 * the orchestrator catches this per-item and continues with the next item.
 *
 * Call-site contract (R-6):
 *   client.chat.completions.create({
 *     model: deployment,                       // deployment name, passed explicitly
 *     messages: [{role:"system", content: SYSTEM_PROMPT}, {role:"user", ...}],
 *     temperature: 0,
 *     response_format: { type: "json_object" },
 *   })
 *
 * SYSTEM_PROMPT MUST contain the literal word "JSON" (Investigation §1 gotcha 2).
 */
export function triageItem(
  client: AzureOpenAI,
  deployment: string,
  item: FeedItem,
): Promise<TriageResult | null>;
```

### 3.9 `slug.ts`

```ts
export const SLUG_MAX_LENGTH = 60;

/**
 * Title -> kebab-case slug:
 *  - lowercase
 *  - strip non-alphanumerics (replace with "-")
 *  - collapse runs of "-"; trim leading/trailing "-"
 *  - truncate to SLUG_MAX_LENGTH at a word boundary (last "-" before the cap)
 *
 * Pure. Does NOT apply collision suffix — that's caller's job.
 */
export function slugify(title: string): string;

/**
 * Given a base slug and the set of slugs already taken on the SAME run-date,
 * returns a unique slug: the base if untaken, else `<base>-2`, `<base>-3`, …
 * (A4 collision rule).
 */
export function resolveSlugCollision(
  baseSlug: string,
  takenSlugsForDate: Set<string>,
): string;
```

### 3.10 `frontmatter.ts`

```ts
import type { EmittedItem, NewsFrontmatter } from "./types.js";

/**
 * Builds the 12-key frontmatter object from an EmittedItem.
 *  - `type` is always "news"
 *  - `internal` is always false
 *  - `deeper_link` is always null
 *  - `last_reviewed` equals `authored` (the run date)
 * AC11 asserts the exact key set; the function MUST produce no extra keys.
 *
 * Pure.
 */
export function buildFrontmatter(emitted: EmittedItem): NewsFrontmatter;

/**
 * Serializes a NewsFrontmatter object to a YAML block (no leading/trailing "---"
 * fence; callers add the fence in the markdown file). Uses gray-matter or
 * js-yaml under the hood; both preserve key order if we pass a plain object
 * with insertion-order keys.
 *
 * Pure.
 */
export function serializeFrontmatter(fm: NewsFrontmatter): string;
```

### 3.11 `write.ts`

```ts
import type { EmittedItem } from "./types.js";

/**
 * Writes <newsRoot>/incoming/<filename> with:
 *
 *   ---
 *   <yaml frontmatter>
 *   ---
 *
 *   <triage.summary>
 *
 *   > Source: [<feedName>](<link>)
 *
 * Creates the incoming/ folder if missing (already enforced via .gitkeep,
 * but mkdir -p is cheap insurance for fresh checkouts).
 *
 * Throws if the file already exists at the target path (slug collision MUST
 * have been resolved upstream by resolveSlugCollision; throwing here is a
 * loud-failure invariant guard).
 *
 * `fs` is injected for testability.
 */
export function writeNewsItem(
  emitted: EmittedItem,
  newsRoot: string,
  fs?: typeof import("node:fs/promises"),
): Promise<string>;   // returns absolute path written
```

### 3.12 `pr.ts`

```ts
import type { EmittedItem } from "./types.js";

/**
 * Builds the markdown body of the editorial PR. Grouped/sorted by source
 * (feed name), with one bullet per item showing: title, source, external_link,
 * ai_summary (R-5).
 *
 * Pure. Output is a single string.
 */
export function buildPrBody(items: EmittedItem[], runDateUtc: string): string;

/**
 * Writes the PR body to <pipelineDir>/pr-body.md so the workflow's
 * shell step can `gh pr create --body-file pipeline/pr-body.md`.
 *
 * Returns the absolute path written.
 */
export function writePrBodyFile(
  body: string,
  pipelineDir: string,
  fs?: typeof import("node:fs/promises"),
): Promise<string>;

/**
 * Appends `<name>=<value>\n` to the file at $GITHUB_OUTPUT (which the
 * GitHub Actions runner provides). When $GITHUB_OUTPUT is unset (e.g.,
 * local dev), prints to stdout with the prefix "::set-output (legacy)::"
 * for visibility but does not throw.
 *
 * `name === "new_items"`, `value === "true" | "false"`.
 */
export function setStepOutput(
  name: string,
  value: string,
  env?: NodeJS.ProcessEnv,
  fs?: typeof import("node:fs/promises"),
): Promise<void>;

/**
 * Test-only helper. The production path is the workflow YAML's inline
 * shell block (Investigation §3); this function exists so pr.test.ts can
 * assert the contract for `gh pr create` invocations against a mocked
 * execFile (R-7 cwd assertion). NOT called by index.ts in production.
 *
 * Default `exec` is a thin wrapper around child_process.execFile that
 * passes `cwd: process.env.GITHUB_WORKSPACE ?? process.cwd()` per R-7.
 */
export function createPullRequest(args: {
  branch: string;
  title: string;
  bodyFilePath: string;
  baseBranch?: string;                 // default "main"
  exec?: (cmd: string, args: string[], opts: { cwd: string }) => Promise<{ stdout: string; stderr: string }>;
  env?: NodeJS.ProcessEnv;
}): Promise<{ prUrl: string }>;
```

### 3.13 `logger.ts`

```ts
/**
 * Structured stdout logging for NF6. Each method emits a single line.
 * `warn` and `error` use GitHub Actions workflow commands (`::warning::`
 * and `::error::`) so they surface in the run summary UI (Investigation §6).
 *
 * All methods accept a free-form object that gets JSON-stringified onto
 * the same line for grep-friendliness.
 */
export type Logger = {
  info: (event: string, fields?: Record<string, unknown>) => void;
  warn: (event: string, fields?: Record<string, unknown>) => void;
  error: (event: string, fields?: Record<string, unknown>) => void;
};

export function makeLogger(stream?: NodeJS.WritableStream): Logger;
```

### 3.14 `index.ts`

```ts
import type { RunResult } from "./types.js";

/**
 * Composition root. Reads env, loads config, walks /news for seen fingerprints,
 * processes each enabled feed with Promise.allSettled (per-feed failure
 * non-fatal — AC6), triages new items, writes markdown, builds PR body,
 * sets step output. Returns a structured RunResult; the CLI entry point
 * (the `main()` IIFE at the bottom of the file) translates exit code 0/1.
 *
 * Failure semantics:
 *  - MissingEnvVarError -> propagates, exit 1 (no orchestrator wrapping)
 *  - ConfigSchemaError -> propagates, exit 1
 *  - "no enabled feeds in config" -> log error, exit 1 (Investigation §6 #2)
 *  - per-feed FeedFetchError / FeedParseError -> log ::warning::, continue
 *  - all feeds failed -> log ::error::, throw AllFeedsFailedError, exit 1
 *  - per-item MalformedTriageResponseError -> log ::warning::, skip item
 *  - per-item writeNewsItem throws -> log ::error::, exit 1
 *    (write failure is a runner-environment problem, not a content problem)
 *
 * All five DI seams (§7) are exposed as parameters with sensible defaults.
 */
export type RunOptions = {
  repoRoot?: string;                   // default: process.cwd() resolved up to nearest git root
  configPath?: string;                 // default: <repoRoot>/config/rss-sources.json
  newsRoot?: string;                   // default: <repoRoot>/news
  pipelineDir?: string;                // default: <repoRoot>/pipeline
  now?: () => Date;                    // default: () => new Date()
  fetchImpl?: typeof globalThis.fetch; // default: globalThis.fetch
  fs?: typeof import("node:fs/promises");
  makeClient?: () => AzureOpenAI;      // default: () => makeAzureClient()
  logger?: Logger;                     // default: makeLogger(process.stdout)
};

export class AllFeedsFailedError extends Error {
  constructor(public readonly failures: { name: string; reason: string }[]) {
    super(`All ${failures.length} feeds failed`);
    this.name = "AllFeedsFailedError";
  }
}

export async function run(options?: RunOptions): Promise<RunResult>;

// CLI bottom of file (no exported symbol):
//   run().then(r => process.exit(r.exitCode)).catch(err => { logger.error(...); process.exit(1) });
```

---

## 4. Error handling strategy

### 4.1 Exception class catalogue

All named exceptions live with the module that owns them (declared above). The full catalogue:

| Class | Thrown by | Caught by | Propagates? |
|---|---|---|---|
| `MissingEnvVarError` | `env.ts` | `index.ts` top-level only | Yes — exit 1 (AC10) |
| `ConfigSchemaError` | `config.ts` | `index.ts` top-level only | Yes — exit 1 |
| `FeedFetchError` | `fetch.ts` | per-feed `try/catch` in `index.ts` | No — logged as `::warning::`, feed counted as failed |
| `FeedParseError` | `parse.ts` | per-feed `try/catch` in `index.ts` | No — logged as `::warning::`, feed counted as failed |
| `MalformedTriageResponseError` | `triage.ts` | per-item `try/catch` in `index.ts` | No — logged as `::warning::`, item dropped |
| `AllFeedsFailedError` | `index.ts` (synthesized when every feed in `Promise.allSettled` rejected AND `feeds.length > 0`) | `index.ts` main()  | Yes — exit 1 (Investigation §6, A14 strict reading) |
| Unknown errors (fs write failures, OS-level) | anywhere | `index.ts` main() catch-all | Yes — `::error::` log, exit 1 |

### 4.2 Decision rules

- **Configuration errors (env, config file) are fatal.** They are programming/operator mistakes, never transient. No retry, no fallback. Exit 1 with a message that names the offender (variable name, file path).
- **Per-feed network/parse errors are NOT fatal.** A14, AC6 — a 429 from Reddit must not block the four other feeds. `Promise.allSettled` is the wrap; each `rejected` result is logged with the feed name and the error message at warn level, then dropped.
- **All feeds failed is fatal.** Distinguished from "zero items emitted after triage" by counting rejections from `Promise.allSettled` against feed count. A14 strict reading.
- **Empty config is fatal.** `config.ts` returns the loaded array; `index.ts` filters to enabled, asserts `enabled.length > 0` before the feed loop, exits 1 if not.
- **Per-item triage errors are NOT fatal.** A malformed Azure response, an Azure 5xx, a network blip mid-call — log at warn level (with the raw payload truncated to 500 chars for diagnosis), drop the item, continue with the next.
- **Filesystem write errors ARE fatal.** If we can't write to `/news/incoming/`, the runner is broken and the whole run is suspect. Exit 1.
- **PR-creation failures are workflow-level, not pipeline-level.** The Node program completes successfully (exit 0) once it has emitted files and set `new_items=true`; if the subsequent `gh pr create` shell step fails, the workflow job goes red but `index.ts` has already finished.

### 4.3 Workflow-level error surface

NF6 dictates the per-run log contents; §3.13 specifies the logger. The orchestrator emits exactly these structured lines on stdout:

```
INFO  pipeline_start            { repo, configPath, newsRoot, runDateUtc }
INFO  feeds_attempted           { count: 5 }
WARN  feed_failed               { name, reason }            ← one per failed feed
INFO  feed_succeeded            { name, itemsFetched }      ← one per OK feed
INFO  items_fetched_total       { count }
INFO  items_deduped             { count }
INFO  items_judged_irrelevant   { count }
INFO  items_written             { count, filenames: [...] }
INFO  pipeline_end              { exitCode, durationMs }
```

`WARN` lines also emit a `::warning file=...,line=...::<msg>` GitHub workflow command to bubble into the run UI; `ERROR` emits `::error::`.

---

## 5. Configuration model

### 5.1 `config/rss-sources.json` schema

JSON, top-level array. TypeScript type (for the parsed-and-validated result):

```ts
type RssSourcesFile = FeedSource[];

// FeedSource defined in §2:
//   { name: string; url: string; enabled: boolean }
```

Validation rules in `config.ts`:

| Rule | On violation |
|---|---|
| File exists and is readable | `ConfigSchemaError("rss-sources.json", "file missing or unreadable")` |
| Parses as JSON | `ConfigSchemaError("rss-sources.json", "invalid JSON: <reason>")` |
| Root is an array | `ConfigSchemaError("rss-sources.json", "root must be an array")` |
| Each entry has `name` (non-empty string) | `ConfigSchemaError("rss-sources.json[<i>].name", "missing or empty")` |
| Each entry has `url` (non-empty string starting with `https://`) | `ConfigSchemaError("rss-sources.json[<i>].url", "must be https URL")` |
| Each entry has `enabled` (boolean) | `ConfigSchemaError("rss-sources.json[<i>].enabled", "must be boolean")` |
| No extra top-level keys per entry | Tolerated (forward-compatible — fields like `tags`, `notes` may be added later without breaking the loader) |
| Array may be empty at parse time, but `enabled.length > 0` check in orchestrator catches it | `index.ts` exits 1 with "no enabled feeds in config" message |

### 5.2 Seed contents (Step 2)

```json
[
  { "name": "Anthropic news",            "url": "https://www.anthropic.com/rss.xml",                                                          "enabled": true },
  { "name": "Claude Code releases",      "url": "https://github.com/anthropics/claude-code/releases.atom",                                    "enabled": true },
  { "name": "Simon Willison",            "url": "https://simonwillison.net/atom/everything/",                                                  "enabled": true },
  { "name": "r/ClaudeAI",                "url": "https://www.reddit.com/r/ClaudeAI/.rss",                                                      "enabled": true },
  { "name": "Hacker News (Claude/Anthropic)", "url": "https://hnrss.org/frontpage?q=Claude+OR+%22Claude+Code%22+OR+Anthropic",                "enabled": true }
]
```

### 5.3 Environment variable enumeration

| Variable | Owner | Type | On missing |
|---|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | env.ts | string (https URL) | `MissingEnvVarError("AZURE_OPENAI_ENDPOINT")` |
| `AZURE_OPENAI_DEPLOYMENT` | env.ts | string (deployment name) | `MissingEnvVarError("AZURE_OPENAI_DEPLOYMENT")` |
| `AZURE_OPENAI_API_VERSION` | env.ts | string (e.g., `2024-10-21`) | `MissingEnvVarError("AZURE_OPENAI_API_VERSION")` |
| `AZURE_OPENAI_API_KEY` | env.ts | string (Azure key, treated as opaque) | `MissingEnvVarError("AZURE_OPENAI_API_KEY")` |
| `GITHUB_WORKSPACE` | pr.ts (R-7) | string (absolute path) | Falls back to `process.cwd()` — this is the ONE permitted fallback in the codebase, narrowly scoped to `cwd` for `execFile` and documented inline. Not a configuration value. |
| `GITHUB_OUTPUT` | pr.ts | string (absolute path to step-output file) | Treated as "we're not in CI" — `setStepOutput` logs to stdout instead of throwing |
| `GITHUB_RUN_ID` | workflow YAML (not Node) | string | Workflow uses `${GITHUB_RUN_ID:0:7}` for branch suffix |
| `GH_TOKEN` | workflow YAML | string | `gh pr create` fails if absent; workflow YAML sets it from `secrets.GITHUB_TOKEN` |

### 5.4 Where defaults live (or don't)

**Configuration: nowhere.** No `||` fallbacks in any source file for `AZURE_OPENAI_*`. No `.env` file lookup. Per the global rule, missing = throw.

**Operational defaults** (not configuration) live as named constants at the top of their owning module:

- `FINGERPRINT_HEX_LENGTH = 16` in `fingerprint.ts`
- `SLUG_MAX_LENGTH = 60` in `slug.ts`
- `DEFAULT_FETCH_TIMEOUT_MS = 15_000` in `fetch.ts`
- `DEFAULT_TRIAGE_TEMPERATURE = 0` in `triage.ts`
- `DEFAULT_TRIAGE_MAX_TOKENS = 400` in `triage.ts` (room for the four-field JSON plus a 200-char summary)
- Branch-prefix `"news-triage/"` in pr.ts and in the workflow YAML's inline shell (must match)

These are code constants, not configuration. Changing them requires a code change; that's intentional.

---

## 6. Workflow YAML structure

File: `/Users/suzy/ClaudeCode/Projects/NbgAiHub/.github/workflows/rss-triage.yml`

```yaml
name: rss-triage

on:
  schedule:
    - cron: "0 5 * * *"        # daily 05:00 UTC = 08:00 Athens (DST) / 07:00 (winter)
  workflow_dispatch: {}

permissions:
  contents: write              # to push the news-triage/... branch
  pull-requests: write         # to open the PR

concurrency:
  group: rss-triage            # fixed; cron is default-branch-only (R-2)
  cancel-in-progress: false    # finish a running pipeline rather than killing mid-PR

jobs:
  triage:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4
        # NOTE: default persist-credentials=true is load-bearing for `git push` below.
        # Do not set persist-credentials: false without re-wiring auth.

      - uses: actions/setup-node@v4
        with:
          node-version-file: pipeline/.nvmrc
          cache: npm
          cache-dependency-path: pipeline/package-lock.json

      - run: npm ci
        working-directory: pipeline

      - run: npm run build
        working-directory: pipeline

      - id: pipeline
        run: npm run start
        working-directory: pipeline
        env:
          AZURE_OPENAI_ENDPOINT:    ${{ secrets.AZURE_OPENAI_ENDPOINT }}
          AZURE_OPENAI_DEPLOYMENT:  ${{ secrets.AZURE_OPENAI_DEPLOYMENT }}
          AZURE_OPENAI_API_VERSION: ${{ secrets.AZURE_OPENAI_API_VERSION }}
          AZURE_OPENAI_API_KEY:     ${{ secrets.AZURE_OPENAI_API_KEY }}

      - name: Open editorial PR
        if: steps.pipeline.outputs.new_items == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          DATE_UTC=$(date -u +%F)
          BRANCH="news-triage/${DATE_UTC}-${GITHUB_RUN_ID:0:7}"
          git config user.name  "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git checkout -b "$BRANCH"
          git add news/incoming
          git commit -m "News triage ${DATE_UTC}"
          git push origin "$BRANCH"
          gh pr create \
            --base main \
            --head "$BRANCH" \
            --title "News triage ${DATE_UTC}" \
            --body-file pipeline/pr-body.md
```

**AC18 compliance:** the `permissions:` block contains exactly two entries and nothing else.

**AC1 compliance:** schedule + workflow_dispatch triggers; permissions present; four `AZURE_OPENAI_*` secrets referenced by name.

**R-2 compliance:** concurrency block present with fixed group and `cancel-in-progress: false`.

**Pipeline ↔ workflow contract:** the Node program sets `new_items=true|false` via `$GITHUB_OUTPUT`; the workflow gates the PR step on `steps.pipeline.outputs.new_items == 'true'`. This is the single load-bearing inter-step contract.

---

## 7. Dependency-injection seams

Five seams, all parameterized through optional function arguments with production defaults. No DI container, no class hierarchies — just function parameters. This is the minimum that lets every test substitute mocks without monkey-patching globals.

| # | Seam | Production wiring | Test substitution |
|---|---|---|---|
| 1 | **HTTP** (`fetch.ts`) | `fetchImpl = globalThis.fetch` | `vi.fn()` returning a `Response`-shaped object; or a hand-rolled fake that throws to exercise the FeedFetchError path. |
| 2 | **Filesystem** (`config.ts`, `dedup.ts`, `write.ts`, `pr.ts`) | `fs = node:fs/promises` | `memfs.promises` — investigated and approved (Investigation §4 point 3). Pass into each function call. The orchestrator (`index.ts`) accepts a single `fs` option and threads it through. |
| 3 | **AzureOpenAI client** (`azure-client.ts` + `triage.ts`) | `makeClient = () => makeAzureClient()` returning `new AzureOpenAI(...)` | The `vi.hoisted` pattern from Investigation §4 point 1. `vi.mock("openai", () => ({ AzureOpenAI: vi.fn().mockImplementation(() => ({ chat: { completions: { create: mocks.create } } })) }))`. Tests assert `mocks.create.mock.calls[0]` to verify R-6's model parameter and the system prompt content. |
| 4 | **exec / `gh` CLI** (`pr.ts.createPullRequest` only — production path is the YAML's inline shell) | `exec = (cmd, args, opts) => util.promisify(execFile)(cmd, args, opts)` with `cwd: GITHUB_WORKSPACE ?? cwd` per R-7 | `vi.fn(async (cmd, args, opts) => ({ stdout: "...", stderr: "" }))`. Tests assert the call shape: command was `gh`, args contain `["pr","create","--title","News triage 2026-05-18", ...]`, `opts.cwd` equals `GITHUB_WORKSPACE` when set. |
| 5 | **Clock** (`index.ts`) | `now = () => new Date()` | `now = () => new Date("2026-05-18T06:00:00Z")` — fixes the run date that flows into filename, frontmatter `authored`/`last_reviewed`, PR title, branch name. |

**Wiring pattern.** Each seam is the LAST parameter of the function (or the LAST property of an options object) with a default. Tests pass an override; production code passes nothing. Example:

```ts
// production:    await fetchFeedXml(url);
// test:          await fetchFeedXml(url, fakeFetch);
```

The orchestrator (`index.ts`) accepts a single `RunOptions` object exposing all five seams. `tests/orchestrator.test.ts` constructs a fully-mocked options bundle and runs the end-to-end flow in-memory with no real network/fs/Azure.

**Explicit non-seams.** Logger, crypto (for fingerprint), YAML serializer, and the feed parser library itself are NOT seams. They are deterministic, side-effect-free or stdout-only, and have no testability problem requiring substitution.

---

## 8. Integration points

### 8.1 GitHub Action runner ↔ pipeline

- Runner invokes `npm run start` (defined in `pipeline/package.json` as `node dist/index.js`).
- Working directory is `pipeline/`; the runner has already `actions/checkout`-ed the repo, so the parent directory is the repo root.
- The pipeline locates the repo root by walking up from `pipeline/` (one level — `path.resolve(import.meta.url, "..", "..")`). `index.ts` resolves `configPath`, `newsRoot`, and `pipelineDir` from that root unless overridden.
- Exit code: 0 = success (with or without new items); 1 = any fatal error per §4.2.
- Step output `new_items` is set on `$GITHUB_OUTPUT` via the standard `<name>=<value>\n` append protocol.

### 8.2 Pipeline ↔ filesystem

- **Read** `<repoRoot>/config/rss-sources.json` (one read per run, sync to the orchestrator).
- **Read** every `.md` under `<repoRoot>/news/incoming/` and `<repoRoot>/news/published/` (recursive, frontmatter only — body parsed but discarded). One pass per run.
- **Write** `<repoRoot>/news/incoming/<YYYY-MM-DD>-<slug>.md` per emitted item.
- **Write** `<repoRoot>/pipeline/pr-body.md` once per run if any item was emitted.
- **Write** `$GITHUB_OUTPUT` (append) once per run.

The pipeline never deletes, never reads outside these locations, never writes outside these locations.

### 8.3 Pipeline ↔ Azure OpenAI

- One `chat.completions.create` call per new, non-duplicate item. Call shape per R-6 / §3.8.
- Auth: `api-key` header injected by the SDK from the constructor's `apiKey`.
- Timeouts: rely on the SDK's defaults (60s). No custom retry on top — per-item failures are caught and logged; one transient blip means one dropped item, not a stalled run.
- Cost estimate (Investigation): ~5 feeds × ~20 items × ~500 input tokens × `gpt-4o-mini` rates ≈ $0.10/day. Documented in `SECRETS.md`.

### 8.4 Pipeline ↔ `gh` CLI

- **Production path:** the workflow YAML's inline shell step is the actual integration. The Node program only WRITES `pr-body.md` and signals `new_items=true`; the shell does branch/commit/push/`gh pr create`.
- **Test-only path:** `pr.ts.createPullRequest` exists so `pr.test.ts` can assert the call shape that the YAML emits. The function is exported but not called from `index.ts`.
- `gh` finds its auth via `GH_TOKEN` (env var; workflow sets it to `secrets.GITHUB_TOKEN`).
- `cwd` for any `execFile` call is `process.env.GITHUB_WORKSPACE ?? process.cwd()` — R-7. Asserted in `pr.test.ts`.

---

## 9. Parallel implementation unit assignments

This is the Phase 6 Coder contract. **Confirms the plan §3 parallelization map.** Each unit owns a set of files, depends on a set of barriers, and respects a contract surface (the type aliases, function signatures, and exception classes from §3 above). **No two units write to the same file.**

### Unit A — Pure modules (one Coder)
**Plan steps:** 3a, 3b, 3c.
**Files owned (writes):**
- `pipeline/src/fingerprint.ts`
- `pipeline/src/slug.ts`
- `pipeline/src/frontmatter.ts`
- `pipeline/tests/fingerprint.test.ts`
- `pipeline/tests/slug.test.ts`
- `pipeline/tests/frontmatter.test.ts`

**Depends on:** Unit "Scaffold" (Step 1) — must be complete before this unit starts. Also reads `pipeline/src/types.ts` (created as part of scaffold; if not, this unit creates it).

**Contract surface (must respect):**
- Function signatures in §3.5, §3.9, §3.10 exactly.
- `FINGERPRINT_HEX_LENGTH = 16`, `SLUG_MAX_LENGTH = 60` exported.
- `buildFrontmatter` returns exactly the 12 keys in §2's `NewsFrontmatter` order.

**Must not touch:** any other `src/` or `tests/` file.

---

### Unit B — Env + Azure client (one Coder)
**Plan step:** 4.
**Files owned (writes):**
- `pipeline/src/env.ts`
- `pipeline/src/azure-client.ts`
- `pipeline/tests/env.test.ts`
- `pipeline/tests/azure-client.test.ts`

**Depends on:** Scaffold; reads `pipeline/src/types.ts` for `EnvConfig`.

**Contract surface:**
- Function signatures in §3.1, §3.7 exactly.
- `MissingEnvVarError` exported with `variableName` public readonly field.
- `readEnv()` checks env vars in the declaration order `ENDPOINT, DEPLOYMENT, API_VERSION, API_KEY` and throws on the FIRST missing — required so AC10's four sibling tests can assert deterministic ordering.

**Must not touch:** any other file.

---

### Unit C — Config + parser + fetcher (one Coder)
**Plan steps:** 5, 6, 7.
**Files owned (writes):**
- `pipeline/src/config.ts`
- `pipeline/src/parse.ts`
- `pipeline/src/fetch.ts`
- `pipeline/tests/config.test.ts`
- `pipeline/tests/parse.test.ts`
- `pipeline/tests/fetch.test.ts`
- `pipeline/tests/fixtures/rss-sources.valid.json`
- `pipeline/tests/fixtures/rss-sources.invalid.json`
- `pipeline/tests/fixtures/rss-2.0.xml`
- `pipeline/tests/fixtures/atom.xml`
- `pipeline/tests/fixtures/malformed.xml`

**Depends on:** Scaffold; reads `pipeline/src/types.ts` for `FeedSource`, `FeedItem`.

**Contract surface:**
- Function signatures in §3.2, §3.3, §3.4 exactly.
- `ConfigSchemaError`, `FeedFetchError`, `FeedParseError` exported with the fields declared in §3.
- `parseFeed` returns `FeedItem[]` matching §2 (guid/link nullable, publishedAt nullable, rawContent nullable).

**Must not touch:** any other file. (`config/rss-sources.json` is owned by the "Seed" unit below.)

---

### Unit Seed — Seed config (can be done by Unit C's Coder or any other; trivial)
**Plan step:** 2.
**Files owned (writes):**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/config/rss-sources.json` (the five seed feeds per §5.2)

**Depends on:** nothing.

---

### ── Barrier 1 ──

After Units A, B, C, Seed: types are stable, env reading is testable, parser produces `FeedItem[]`, fetch is mockable.

---

### Unit D — Dedup + triage + write (three parallel Coders — D1, D2, D3)
**Plan steps:** 8, 9, 10.

**Unit D1 — dedup**
- Writes: `pipeline/src/dedup.ts`, `pipeline/tests/dedup.test.ts`, `pipeline/tests/fixtures/existing-news/*`
- Also writes the `.gitkeep` files: `/Users/suzy/ClaudeCode/Projects/NbgAiHub/news/incoming/.gitkeep`, `/Users/suzy/ClaudeCode/Projects/NbgAiHub/news/published/.gitkeep`
- Depends on Unit A (`fingerprint.ts` for typing only).
- Contract: §3.6 exactly. `loadSeenFingerprints` is async; `isUnseen` is sync.

**Unit D2 — triage**
- Writes: `pipeline/src/triage.ts`, `pipeline/tests/triage.test.ts`, `pipeline/tests/fixtures/triage-response.valid.json`, `pipeline/tests/fixtures/triage-response.malformed.json`
- Depends on Unit B (`AzureOpenAI` client type; the client is injected).
- Contract: §3.8 exactly. `MalformedTriageResponseError` exported. System prompt MUST contain literal "JSON". Call site MUST pass `model: deployment`, `temperature: 0`, `response_format: { type: "json_object" }` — all three asserted in tests.

**Unit D3 — write**
- Writes: `pipeline/src/write.ts`, `pipeline/tests/write.test.ts`
- Depends on Unit A (`slug.ts`, `frontmatter.ts`).
- Contract: §3.11 exactly. Throws if target file already exists (slug-collision invariant guard). Returns the absolute path written.

**No two D-units write to the same file.** All three can ship in parallel after Barrier 1.

---

### ── Barrier 2 ──

After Unit D: all building blocks exist. Only orchestration and the PR helper remain.

---

### Unit E — Orchestrator + PR helper (two parallel Coders — E1, E2)

**Unit E1 — orchestrator + logger**
- Writes: `pipeline/src/logger.ts`, `pipeline/src/index.ts`, `pipeline/tests/orchestrator.test.ts`
- Depends on ALL prior `src/` modules.
- Contract: §3.13, §3.14 exactly. Exposes the five-seam `RunOptions`. Exits 0 on success, 1 on fatal. Emits the eight NF6 log lines from §4.3.

**Unit E2 — pr.ts**
- Writes: `pipeline/src/pr.ts`, `pipeline/tests/pr.test.ts`
- Depends on Unit A (`EmittedItem` type), Unit D3 conceptually (consumes the items it emits).
- Contract: §3.12 exactly. `buildPrBody` is pure and groups by source. `setStepOutput` writes to `$GITHUB_OUTPUT`. `createPullRequest` is test-only (production path is YAML shell) but exists so the seam contract is asserted.

**E1 and E2 do not share files.** E1's `index.ts` imports from `pr.ts` (Unit E2) by name only — the import works as soon as E2's file exists at compile time.

---

### ── Barrier 3 ──

After Unit E: the Node program is complete and tests pass.

---

### Unit F — Workflow YAML + docs (two parallel Coders — F1, F2)

**Unit F1 — workflow YAML**
- Writes: `/Users/suzy/ClaudeCode/Projects/NbgAiHub/.github/workflows/rss-triage.yml`
- Contract: §6 exactly. AC1 + AC18 + R-2 + R-7 references explicit.

**Unit F2 — docs**
- Writes: `/Users/suzy/ClaudeCode/Projects/NbgAiHub/SECRETS.md`, `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/README.md`
- Per plan Step 14: documents the four secrets, the repo-level "Allow GitHub Actions to create and approve pull requests" toggle (A15), the Reddit 429 known weak-spot (R-3), the deployment-vs-model gotcha, the cost estimate, and the editorial workflow (F10).

**Project-design.md updates (Phase 5, this file)** and **project-functions.md** are already authored — they live in `docs/design/` and are owned by the Designer + planner.

---

### Critical path

`Scaffold → Unit B → Unit D2 (triage) → Unit E1 (orchestrator) → Unit F1 (workflow) → Phase 9 (live demo run)`.

Six serial gates. Every other unit can ship in parallel within its barrier window.

### File-ownership invariant

No two units write to the same path. Each file in §1.2 is owned by exactly one unit. The Designer (this document) does not touch source files; Phase 6 Coders do not touch design docs. This is the contract that makes parallel Coder execution safe.

---

## 10. Cross-cutting design rules

1. **ESM-only.** Every import path includes the `.js` extension (Node 22 ESM resolution requirement). `package.json` has `"type": "module"`.
2. **TypeScript strict.** `tsconfig.json` sets `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`. No `any`.
3. **No fallback for required config.** Enforced at code-review time by §4.2; tested by AC10's four-sibling test.
4. **No mutation of `process.env`** in any test. Use `vi.stubEnv` + `vi.unstubAllEnvs` in `afterEach` (Investigation §4 point 2).
5. **`memfs` for filesystem tests.** No real fs writes in unit tests. The orchestrator test uses `memfs` + injected `now` + mocked `fetch` + mocked AzureOpenAI for a fully hermetic end-to-end run.
6. **No `--no-verify`** on commits, no `--force` pushes, no rebases — the workflow YAML's shell does plain `commit`/`push` only.
7. **`last_reviewed` semantics** (Investigation §8e): at emission, equal to `authored` (the run date UTC). When a human editor moves the file from `/incoming/` to `/published/`, they MUST bump `last_reviewed` to their date. This is documented in `pipeline/README.md` (Unit F2) and in project-functions.md F10.
8. **No premature abstraction.** No interfaces for single implementations. No generic "FeedSourceAdapter" — all feeds are RSS/Atom parsed by one library. If Reddit-OAuth or a JSON-API feed is ever added, refactor then.

---

## 11. Verification checklist for this design

The design is correct iff every row below holds. The Phase 6 Coder spec is exactly this table + §9.

| Requirement | Where in this doc |
|---|---|
| 18 ACs from refined-request §Acceptance Criteria mapped to modules | §3 + §6 (per-AC mapping in plan §4 is unchanged) |
| F1–F10 functional contract honored | §1.1, §2, §3, §6 |
| 5 DI seams from Investigation §5 | §7 |
| No-fallback-config rule (global CLAUDE.md) | §4.1, §4.2, §5.4 |
| Shared content shape (DECISIONS.md) for frontmatter | §2 (`NewsFrontmatter`) — 10 canonical keys + `source` + `fingerprint` |
| `concurrency` block (R-2) | §6 |
| `cwd: GITHUB_WORKSPACE ?? cwd` (R-7) | §3.12, §7 row 4 |
| Node 22 + ESM (R-4) | §1.2, §10 |
| `model: deployment` at chat.completions.create (R-6) | §3.8 |
| `@rowanmanning/feed-parser` (R-1) | §1.2, §3.4 |
| PR body content shape (R-5) | §3.12 (`buildPrBody`) |
| File-ownership / parallel-unit map | §9 |

---

*End of project-design.md, version 1 — RSS news pipeline. Subsequent features append new top-level sections (`## 2. <feature> …`).*

---

## Site architecture

**Feature:** Astro 6 + Starlight 0.39 static site at `site/` (sibling workspace to `pipeline/`).
**Plan of record:** `docs/design/plan-002-astro-starlight-site.md` (13 steps).
**Refined request:** `docs/refined-requests/astro-starlight-site.md` (20 ACs, 18 Assumptions, A1/A2 superseded to Astro 6 + Starlight 0.39 per DECISIONS.md 2026-05-18).
**Investigation:** `docs/reference/investigation-astro-site.md`.
**Codebase scan:** `docs/reference/codebase-scan-astro-site.md`.

This section defines **interfaces, contracts, data models, module structure, and architecture-level decisions** for the site workspace. It does NOT re-sequence the work — Steps 1–13 in plan-002 are authoritative. Where this design adds detail beyond the plan, it expands inside the plan's step boundaries; it does not reorder them.

### Conflicts requiring user input

**None.** The refined request (post A1/A2 supersession), plan-002 (13 steps, 7 reconciliations R-1 through R-7), and the investigation are internally consistent. The three open questions (OQ1 hosting, OQ2 branding, OQ3 skill catalog fields) are all explicitly deferred and need no design accommodation. AC16 (lint script) is vacuously satisfied per plan §4 — no ESLint configured for `site/` in MVP; `astro check` covers the static-analysis surface.

A note on A9 rationale refresh (plan R-6): this is a cosmetic update to refined-request A9 that the Designer should propagate during Step 13 documentation work. It does not change any contract here.

---

### S.1 System architecture and component diagram

The site is a **purely static** SSG build. There is no runtime backend, no client islands beyond a single vanilla `<script>` for the audience filter, and no fetch from the browser to any service except Pagefind's pre-built index loaded as static JSON.

**Data flow** — content folders at the repo root flow through Astro's content collection layer into page templates and out to a static `dist/` directory:

```
┌────────────────────────── repo root ───────────────────────────────┐
│                                                                    │
│   news/published/*.md  ─┐                                          │
│   skills/*.md          ─┤                                          │
│   tips/*.md            ─┼──► glob() loader  ──► Zod validation     │
│   glossary/*.md        ─┤    (../<folder>)    (5 collections)      │
│   journeys/*.md        ─┘                          │               │
│                                                    ▼               │
│                                            ┌──────────────┐        │
│                                            │ astro:content│        │
│                                            │ getCollection│        │
│                                            └──────┬───────┘        │
│                                                   │                │
│   site/                                           ▼                │
│   ├── astro.config.mjs ◄─── starlight({ sidebar, customCss })      │
│   ├── src/                                                         │
│   │   ├── content.config.ts ◄── 5 defineCollection() entries       │
│   │   ├── content/docs/index.mdx  (template: splash)               │
│   │   │     │   imports HomeHero, NewsPanel                        │
│   │   │     ▼                                                      │
│   │   ├── pages/                                                   │
│   │   │   ├── news/index.astro      ─► /news/                      │
│   │   │   ├── news/[slug].astro     ─► /news/<slug>/    (getStaticPaths)
│   │   │   ├── skills.astro          ─► /skills/                    │
│   │   │   ├── tips.astro            ─► /tips/                      │
│   │   │   ├── glossary.astro        ─► /glossary/  (anchor links)  │
│   │   │   ├── reference.astro       ─► /reference/                 │
│   │   │   ├── contribute.astro      ─► /contribute/                │
│   │   │   └── start-here/                                          │
│   │   │       ├── day-1.astro       ─► /start-here/day-1/          │
│   │   │       └── week-1.astro      ─► /start-here/week-1/         │
│   │   ├── components/                                              │
│   │   │   ├── HomeHero.astro                                       │
│   │   │   ├── NewsPanel.astro       (uses getRecentNews helper)    │
│   │   │   ├── NewsList.astro        (uses getRecentNews helper)    │
│   │   │   ├── AudienceBadge.astro                                  │
│   │   │   ├── SkillCard.astro                                      │
│   │   │   └── AudienceFilter.astro  (inline <script>, localStorage)│
│   │   ├── lib/                                                     │
│   │   │   └── news.ts               (getRecentNews helper)         │
│   │   └── styles/                                                  │
│   │       └── custom.css            (~100 LOC max)                 │
│   │                                                                │
│   └── (build output, gitignored)                                   │
│       └── dist/                                                    │
│           ├── index.html                  (homepage)               │
│           ├── news/index.html             (+ news/<slug>/index.html)
│           ├── skills/index.html                                    │
│           ├── tips/index.html                                      │
│           ├── glossary/index.html         (#term anchors)          │
│           ├── reference/index.html                                 │
│           ├── contribute/index.html                                │
│           ├── start-here/{day-1,week-1}/index.html                 │
│           ├── _astro/*.css                (Starlight + custom.css) │
│           └── pagefind/                   (search index, AC17)     │
└────────────────────────────────────────────────────────────────────┘
```

**Key architectural facts:**

1. **Reads are cross-workspace, writes are not.** Site reads markdown from `../news/published/`, `../skills/`, `../tips/`, `../glossary/`, `../journeys/`. It never writes back. The pipeline writes; the site consumes.
2. **No runtime AI, no runtime fetch.** Per DECISIONS.md "AI strategy: build-time + Claude skill, not web runtime". The browser only loads static HTML + CSS + the Pagefind index + the AudienceFilter `<script>`.
3. **No client islands.** The audience filter is a single inline `<script>` block — vanilla JS, no hydration boundary, no framework. Starlight does not enable `<ClientRouter />` by default, so every navigation is a full page load and the script runs from scratch on each page (investigation §5a).
4. **Two routing surfaces, by design.** Homepage at `src/content/docs/index.mdx` (uses Starlight's `template: splash`); every other page is `.astro` under `src/pages/` wrapped in `<StarlightPage>`. The homepage needs MDX for component imports; the catalog pages need `getCollection()` and programmatic rendering. (Plan R-4, R-5.)
5. **Content layer is strict.** Astro's `astro sync` validates every markdown file's frontmatter against its Zod schema; violations fail `astro check` and (transitively) `npm run build`. No silent skipping (AC18 / NF8).

### S.2 Module structure under `site/`

Concrete file inventory with responsibilities. Every path is relative to repo root.

| Path | Responsibility | Owner step |
|---|---|---|
| `site/package.json` | Deps (`astro ^6`, `@astrojs/starlight ^0.39`, `@astrojs/check`), scripts per S.6, `"type": "module"`, `engines.node: ">=22"`. | Step 1, 3 |
| `site/tsconfig.json` | Extends `astro/tsconfigs/strict`. Sets `noUncheckedIndexedAccess: true`. No other overrides. | Step 3 |
| `site/.nvmrc` | Contains `22\n`. | Step 2 |
| `site/.gitignore` | Astro emits this on scaffold: `node_modules/`, `dist/`, `.astro/`, `.env*`, `.DS_Store`. No changes needed. | Step 1 |
| `site/astro.config.mjs` | `defineConfig({ server: { port: 4321, host: false }, integrations: [starlight({ title, sidebar: [...9 entries], customCss: ['./src/styles/custom.css'] })] })`. | Steps 2, 5, 6 |
| `site/src/content.config.ts` | 5 `defineCollection()` entries via `glob()` loader. News uses `generateId` callback for date-stripped slugs. Zod schemas per S.4. | Step 4 |
| `site/src/lib/news.ts` | `getRecentNews(limit?: number)` helper shared by `NewsPanel` and `NewsList`. Centralises sort-by-`authored`-desc. | Step 7 (created in Step 7a per plan §3 "Parallelizable within Step 7") |
| `site/src/components/HomeHero.astro` | Hero with title + tagline + 2 CTAs. Root has `class="not-content"`. | Step 7 |
| `site/src/components/NewsPanel.astro` | Top-N news cards for homepage. Calls `getRecentNews(5)`. Empty-state branch. | Step 7 |
| `site/src/components/NewsList.astro` | Full news list with topic filter chips + audience filter slot. | Step 7 |
| `site/src/components/AudienceBadge.astro` | `<span class="audience-badge {audience}">…</span>`. Color via CSS class (S.4 / A7). | Step 7 |
| `site/src/components/SkillCard.astro` | Card layout for a skill entry. | Step 7 |
| `site/src/components/AudienceFilter.astro` | 3 checkboxes + inline `<script>` block; `localStorage` key `nbgaihub.audience`. | Step 7 |
| `site/src/content/docs/index.mdx` | Homepage. Frontmatter `template: splash`. Imports + renders `<HomeHero />` and `<NewsPanel />`. | Step 8 |
| `site/src/pages/news/index.astro` | `/news/` index. Wraps `NewsList` + `AudienceFilter` in `StarlightPage`. Empty-state branch. | Step 9 |
| `site/src/pages/news/[slug].astro` | Dynamic per-item page. `getStaticPaths()` yields `{ params: { slug: item.id }, props: { item } }`. Renders title, `AudienceBadge`, topic chips, source, external link, `<Content />`. | Step 9 |
| `site/src/pages/skills.astro` | `/skills/`. Card grid via `SkillCard` + `AudienceFilter`. Empty-state branch. | Step 9 |
| `site/src/pages/tips.astro` | `/tips/`. Card grid + `AudienceFilter`. Empty-state branch. | Step 9 |
| `site/src/pages/glossary.astro` | `/glossary/`. Single page; loops glossary entries; each rendered with `id="<entry.id>"` for anchor links (AC15). Empty-state branch. | Step 9 |
| `site/src/pages/reference.astro` | Hand-authored cheatsheet inside `StarlightPage`. Opinionated tone. | Step 9 |
| `site/src/pages/contribute.astro` | Hand-authored PR contribution flow inside `StarlightPage`. Opinionated tone. | Step 9 |
| `site/src/pages/start-here/day-1.astro` | Placeholder with 6 step headings + "coming soon" body. | Step 9 |
| `site/src/pages/start-here/week-1.astro` | Single-line "Week 1 — coming soon." placeholder. | Step 9 |
| `site/src/styles/custom.css` | ≤100 LOC: `.home-hero`, `.news-card`, `.news-card-grid`, `.audience-badge.{beginner,advanced,both}`, `.audience-hidden`, optional `.card-grid`. | Step 6 |
| `site/README.md` | HMR caveat (R-7), port assignment (4321), run commands. | Step 13 |

**Path convention notes:**

- The site does **not** use `.md`/`.mdx` files under `src/content/docs/` for catalog pages — they need `getCollection()` and conditional rendering, which only `.astro` under `src/pages/` provides cleanly (investigation §4e, plan R-5). The single MDX file under `src/content/docs/` is `index.mdx` for the splash homepage (plan R-4).
- `src/lib/` is a project-conventional location for helpers not specific to a component or page. Mirrors pipeline's `pipeline/src/` module style. Holds `news.ts` only for MVP.
- `public/` is created by the scaffold; we do not put anything in it for MVP (no logo, no static images per A6 / OQ2).

### S.3 Public interfaces / contracts per component

Each component's prop shape, render contract, and behavioural contract.

#### S.3.1 `HomeHero.astro`

```ts
// Props (Astro frontmatter section)
interface Props {
  title: string                          // e.g., "NbgAiHub — what I wish I knew a year ago"
  tagline: string                        // one-line subtitle
  ctaPrimary?: { label: string; href: string }    // default: { label: 'Start Here → Day 1', href: '/start-here/day-1/' }
  ctaSecondary?: { label: string; href: string }  // default: { label: 'Browse Skills', href: '/skills/' }
}
```

**Render contract:**

```html
<section class="home-hero not-content">
  <h1>{title}</h1>
  <p class="home-hero__tagline">{tagline}</p>
  <div class="home-hero__cta-row">
    <a class="home-hero__cta home-hero__cta--primary" href={ctaPrimary.href}>{ctaPrimary.label}</a>
    <a class="home-hero__cta home-hero__cta--secondary" href={ctaSecondary.href}>{ctaSecondary.label}</a>
  </div>
</section>
```

- Root has `class="not-content"` (investigation §4d) to opt out of Starlight prose margins.
- No client behaviour.
- Imported and used by `src/content/docs/index.mdx` only.

#### S.3.2 `NewsPanel.astro`

```ts
interface Props {
  limit?: number                         // default 5
}
```

**Render contract:**

- Calls `getRecentNews(limit ?? 5)` from `src/lib/news.ts`.
- Renders one of two branches:
  - **Non-empty:** `<div class="news-card-grid">` containing N `<article class="news-card" data-audience={item.data.audience} data-topics={item.data.topics.join(',')}>…</article>` items. Each card shows title (linked to `/news/<id>/`), `<AudienceBadge audience={item.data.audience} />`, topic chips, source name, authored date.
  - **Empty:** `<p class="empty-state">No items yet. See <a href="/contribute/">Contribute</a> for how to add one.</p>` (A8 canonical copy).
- No client behaviour; relies on `AudienceFilter` (mounted elsewhere on the page) to toggle `.audience-hidden` on `[data-audience]` cards.
- Imported by `src/content/docs/index.mdx`.

#### S.3.3 `NewsList.astro`

```ts
interface Props {
  // Component reads collection internally; no consumer props.
}
```

**Render contract:**

- Calls `getRecentNews()` (no limit; full list).
- Renders topic-filter chip toolbar (derived from the union of all `topics[]` across the collection) above the card grid. **Topic-filter chips are nice-to-have for MVP** — if scope pressure surfaces, defer to a follow-up; the audience filter alone satisfies F10.
- Otherwise identical rendering shape to `NewsPanel` (same `.news-card-grid`, same `data-audience` + `data-topics` attributes so `AudienceFilter` works without re-wiring).
- Empty-state branch identical to `NewsPanel`.
- Imported by `src/pages/news/index.astro`.

#### S.3.4 `AudienceBadge.astro`

```ts
interface Props {
  audience: 'beginner' | 'advanced' | 'both'
}
```

**Render contract:**

```html
<span class={`audience-badge audience-badge--${audience}`}>{audience}</span>
```

- Color comes from CSS class (S.4 / A7), not inline style: `.audience-badge--beginner { background: #0a7; color: #fff }` etc.
- AC13 evidence: grep for the three hex values + the three modifier classes.
- No props beyond `audience`. Calling code spells `audience` lowercase exactly.

#### S.3.5 `SkillCard.astro`

```ts
import type { CollectionEntry } from 'astro:content'

interface Props {
  entry: CollectionEntry<'skills'>
}
```

**Render contract:**

```html
<article class="skill-card" data-audience={entry.data.audience} data-topics={entry.data.topics.join(',')}>
  <h3>
    {entry.data.external_link
      ? <a href={entry.data.external_link}>{entry.data.title} ↗</a>
      : entry.data.title}
  </h3>
  <AudienceBadge audience={entry.data.audience} />
  <div class="skill-card__topics">
    {entry.data.topics.map((t) => <span class="topic-chip">{t}</span>)}
  </div>
  <p class="skill-card__summary">{entry.data.ai_summary}</p>
</article>
```

- `external_link` is the install / repo URL; if null, render plain title.
- Carries `data-audience` and `data-topics` so `AudienceFilter` can hide it.

#### S.3.6 `AudienceFilter.astro`

```ts
interface Props {
  scope?: string                         // CSS selector for filterable items; default '[data-audience]'
}
```

**Render contract:**

```html
<form class="audience-filter not-content" data-scope={scope ?? '[data-audience]'}>
  <label><input type="checkbox" value="beginner" checked /> Beginner</label>
  <label><input type="checkbox" value="advanced" checked /> Advanced</label>
  <label><input type="checkbox" value="both" checked /> Both</label>
</form>

<script>
  // Inline module script (vanilla, no framework).
  // Executes on every page load — Starlight does NOT enable <ClientRouter />,
  // so no astro:page-load hookup is needed.
  const KEY = 'nbgaihub.audience'
  const DEFAULT = ['beginner', 'advanced', 'both']

  function applyAll() {
    document.querySelectorAll('.audience-filter').forEach((form) => {
      const scope = form.getAttribute('data-scope') ?? '[data-audience]'
      const boxes = form.querySelectorAll('input[type="checkbox"]')
      const visible = new Set(
        Array.from(boxes).filter((b) => b.checked).map((b) => b.value)
      )
      document.querySelectorAll(scope).forEach((el) => {
        const a = el.getAttribute('data-audience') ?? 'both'
        el.classList.toggle('audience-hidden', !visible.has(a))
      })
      try {
        localStorage.setItem(KEY, JSON.stringify([...visible]))
      } catch { /* private-mode / quota: ignore */ }
    })
  }

  // Restore from localStorage on load
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? JSON.stringify(DEFAULT))
    document.querySelectorAll('.audience-filter input[type="checkbox"]').forEach((box) => {
      box.checked = saved.includes(box.value)
    })
  } catch { /* malformed or unavailable: keep defaults */ }

  applyAll()
  document.querySelectorAll('.audience-filter input[type="checkbox"]').forEach((box) => {
    box.addEventListener('change', applyAll)
  })
</script>
```

**Behavioural contract:**

- On `DOMContentLoaded` (or end-of-body parse, whichever comes first), restore checkbox state from `localStorage["nbgaihub.audience"]`, then apply filter once.
- On any checkbox `change`, recompute visible set, toggle `.audience-hidden` on every matching scope element, persist to `localStorage`.
- If multiple `.audience-filter` forms exist on a page (e.g., one in `NewsList`, one elsewhere), all share the same `localStorage` state via `applyAll()` looping over every form. State stays consistent because both forms restore the same values on the same page load.
- Persists across page navigations (Starlight uses full page loads, so `localStorage` is read fresh on every render).

**AC14 evidence:** the inline `<script>` block contains `localStorage`, `data-audience`, and the `audience-hidden` class toggle.

#### S.3.7 `getRecentNews(limit?: number)` (helper, `src/lib/news.ts`)

```ts
import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

/**
 * Returns published news entries sorted by `authored` descending,
 * optionally sliced to the first `limit` items.
 *
 * Used by NewsPanel (limit=5) and NewsList (no limit).
 * Pure (no side effects). Astro caches getCollection() per build.
 */
export async function getRecentNews(limit?: number): Promise<CollectionEntry<'news'>[]> {
  const items = await getCollection('news')
  const sorted = items.sort((a, b) => b.data.authored.localeCompare(a.data.authored))
  return limit === undefined ? sorted : sorted.slice(0, limit)
}
```

- `authored` is a `YYYY-MM-DD` string per the canonical shape, so `localeCompare` gives correct chronological ordering.
- No filtering by `internal` flag for MVP — every published item is renderable. (If/when bank-internal items land, this is the choke point to add a filter.)

### S.4 Data models — Zod schemas for 5 content collections

**Critical coupling:** The news schema is a 1:1 mirror of the pipeline's `NewsFrontmatter` type at `pipeline/src/types.ts:54-67` and `pipeline/src/frontmatter.ts:14-28`. **Any change to the pipeline's frontmatter shape must be reflected here in the same PR**, and vice versa. Drift risk is accepted for MVP per refined-request A4; a future shared package can be extracted if drift becomes painful. Tracked in `Issues - Pending Items.md` per plan Step 13.

Other collections (skills, tips, glossary, journeys) use the same canonical 12-key shape per DECISIONS.md "Shared content shape", differing only in the `type` literal and **without** the news-specific `source`, `fingerprint`, `hero_image` extras.

**File: `site/src/content.config.ts`**

```ts
// site/src/content.config.ts
//
// Zod schemas for the 5 content collections.
//
// IMPORTANT — schema coupling:
//   The `news` schema below is a 1:1 mirror of the pipeline's
//   NewsFrontmatter type. The pipeline owns the canonical shape.
//   Sources to keep in sync:
//     - pipeline/src/types.ts:54-67   (NewsFrontmatter type alias)
//     - pipeline/src/frontmatter.ts:14-28  (buildFrontmatter() emitter)
//     - DECISIONS.md "Shared content shape"
//   If either side changes, update the other in the same PR.
//   See Issues - Pending Items.md follow-up: "extract shared
//   frontmatter schema package if drift becomes painful".

import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'        // Astro 6 idiom (investigation §2b)

// ─── Shared field shapes (DRY: built once, reused across schemas) ────

const audienceEnum = z.enum(['beginner', 'advanced', 'both'])
const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

/**
 * The 12 canonical keys shared by every content type per DECISIONS.md
 * "Shared content shape". Each per-type schema layers a `type` literal
 * on top of this base.
 */
function baseShape(typeLiteral: string) {
  return {
    type: z.literal(typeLiteral),
    title: z.string().min(1),
    audience: audienceEnum,
    topics: z.array(z.string()),
    internal: z.boolean(),
    authored: isoDateString,
    last_reviewed: isoDateString,
    external_link: z.string().url().nullable(),
    deeper_link: z.string().url().nullable(),
    ai_summary: z.string(),
  } as const
}

// ─── news ────────────────────────────────────────────────────────────
// 12 canonical keys + news-specific `source` + `fingerprint`
// + optional `hero_image` (forward-compat per A16).
// Mirror of NewsFrontmatter at pipeline/src/types.ts:54-67.
const news = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: '../news/published',
    // Plan R-2: strip date prefix so /news/<slug> drops the date.
    // 2026-05-18-foo-bar.md → entry.id === 'foo-bar' → /news/foo-bar/.
    generateId: ({ entry }) => {
      const withoutExt = entry.replace(/\.[^.]+$/, '')
      return withoutExt.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    },
  }),
  schema: z.object({
    ...baseShape('news'),
    // News-specific:
    source: z.string().min(1),
    fingerprint: z.string().min(1),
    hero_image: z.string().url().optional(),
  }),
})

// ─── skills ──────────────────────────────────────────────────────────
const skills = defineCollection({
  loader: glob({ pattern: '*.md', base: '../skills' }),
  schema: z.object(baseShape('skill')),
})

// ─── tips ────────────────────────────────────────────────────────────
const tips = defineCollection({
  loader: glob({ pattern: '*.md', base: '../tips' }),
  schema: z.object(baseShape('tip')),
})

// ─── glossary ────────────────────────────────────────────────────────
const glossary = defineCollection({
  loader: glob({ pattern: '*.md', base: '../glossary' }),
  schema: z.object(baseShape('glossary')),
})

// ─── journeys ────────────────────────────────────────────────────────
const journeys = defineCollection({
  loader: glob({ pattern: '*.md', base: '../journeys' }),
  schema: z.object(baseShape('journey-step')),
})

export const collections = { news, skills, tips, glossary, journeys }
```

**AC4 evidence:** every one of the news-schema keys (`type`, `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`, `source`, `fingerprint`, `hero_image`) is grep-findable in `content.config.ts`.

**Type literal mapping** (per DECISIONS.md "Shared content shape" enum):

| Collection | `type` literal |
|---|---|
| `news` | `'news'` |
| `skills` | `'skill'` |
| `tips` | `'tip'` |
| `glossary` | `'glossary'` |
| `journeys` | `'journey-step'` |

**`deeper_link` nuance:** the pipeline emits `deeper_link: null` literally (it's an `always-null` field for news per `frontmatter.ts:24`). For non-news collections it's `string | null`. The site's schema permits both `string().url().nullable()` for every collection, which is a strict superset of the pipeline's `null`-only emission — pipeline output validates fine, hand-authored skill/glossary content can supply a URL or leave it null.

### S.5 Error handling strategy

Site is static; "errors" are build-time or browser-side, not server-side. The strategy is **fail loud at build, render empty-state at runtime**.

| Error class | When | Strategy | Where it surfaces |
|---|---|---|---|
| **Schema validation failure** | `astro sync` parses a frontmatter block that fails its Zod schema. | **Fail loudly.** `astro check` exits non-zero with file path + field name + Zod issue. `npm run build` chains `astro check` (plan R-3) so build fails too. No silent skipping (AC18 / NF8). | Step 3 wires the scripts; Step 11 negative test confirms with `_invalid.md` fixture. |
| **Empty collection** | `getCollection('skills')` returns `[]` because `../skills/` has only `.gitkeep` (or doesn't exist at all). | **Not an error.** Each catalog page has an `items.length === 0` branch rendering canonical empty-state copy (A8). Per investigation §10c, Astro 5/6 treats missing/empty base directory as empty array; does not error. | Pages in Step 9. |
| **Missing config file** | Someone deletes `astro.config.mjs` or `content.config.ts`. | **Astro fails to start/build with a clear error.** Loud, expected. No fallback. | Astro core behaviour; no site code needed. |
| **Cross-workspace path missing** | `glob({ base: '../news/published' })` and the directory does not exist. | Astro logs a warning and the collection is empty. **Not an error.** Empty-state branch handles it. Documented in `site/README.md` (R-7) so contributors aren't surprised. | Step 13 docs. |
| **`getStaticPaths` slug collision** | Two news items generate the same date-stripped slug. | Astro build throws a duplicate-route error. Caller renames one file. Pipeline's `resolveSlugCollision` (slug.ts) prevents this upstream by appending `-2`, `-3`. Near-zero edge case. | Caught at `npm run build`. Logged as plan risk P-R5. |
| **`localStorage` unavailable / quota exceeded** | Private browsing mode, full quota. | `AudienceFilter` catches and ignores; falls back to defaults (all three audiences checked). Filter remains usable for the session. | `try { … } catch { /* ignore */ }` wrappers in the inline script. |
| **Pagefind index missing** | User runs `npm run dev` and clicks search. | Starlight's default behaviour: shows a toast that search needs production build. Not a defect. Demo against `npm run preview`. Documented in `site/README.md`. | Starlight built-in. |
| **TypeScript strict violation** (e.g., `posts[0].data.title` under `noUncheckedIndexedAccess`) | A coder writes index access on a collection array. | `npm run check` fails with TS2532 / TS18048. Fix: use `.at(0)`, length-guard, or destructure inside `.map()`. Flagged in plan risk P-R6. | Step 7 / Step 9. |

**No silent fallbacks.** The site honours the global rule "never create fallback values for missing configuration." There is no try/catch around `getCollection()` calls that silently substitutes an empty array — Astro already returns `[]` for empty/missing collections, which is the *correct, observable* behaviour (the empty-state branch is a domain choice, not a silenced error).

### S.6 Configuration model

#### S.6.1 `astro.config.mjs` shape

```js
// site/astro.config.mjs
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  // CLAUDE.md → Ports: dev server pinned to 4321.
  // CLI flag `--port 4322` is the escape hatch on collision (don't edit this).
  server: { port: 4321, host: false },

  integrations: [
    starlight({
      title: 'NbgAiHub',
      description: 'A field manual for newcomers to Claude Code.',
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { label: 'Home', link: '/' },
        {
          label: 'Start Here',
          collapsed: false,
          items: [
            { label: 'Day 1', link: '/start-here/day-1/' },
            { label: 'Week 1 (coming soon)', link: '/start-here/week-1/' },
          ],
        },
        { label: 'News', link: '/news/' },
        { label: 'Skills', link: '/skills/' },
        { label: 'Tips & Tricks', link: '/tips/' },
        { label: 'Glossary', link: '/glossary/' },
        { label: 'Reference', link: '/reference/' },
        { label: 'Contribute', link: '/contribute/' },
      ],
    }),
  ],
})
```

- **No additional integrations.** MDX is bundled with Starlight; do NOT add `@astrojs/mdx` separately (investigation §11). No Tailwind, no React/Vue/etc., no sitemap, no view transitions.
- `trailingSlash` is Starlight's default (`'always'`); sidebar `link:` values include trailing slashes to match.
- Pagefind is enabled by Starlight default — no config knob needed (AC17).

#### S.6.2 `tsconfig.json` shape

```jsonc
// site/tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- Extends Starlight's recommended preset (which itself extends Astro's strict preset).
- `noUncheckedIndexedAccess: true` adds the one extra knob NF2 specifies. Other strict-family flags from `pipeline/tsconfig.json` (`exactOptionalPropertyTypes`, `noImplicitOverride`, etc.) are inherited via `astro/tsconfigs/strict` where applicable; we don't second-guess Astro's recommendation here.

#### S.6.3 `content.config.ts` shape

See §S.4 above for the complete file.

#### S.6.4 `package.json` scripts

```jsonc
{
  "name": "site",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "check": "astro sync && astro check",
    "typecheck": "astro check"
  },
  "dependencies": {
    "astro": "^6.0.0",
    "@astrojs/starlight": "^0.39.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.x.x",
    "typescript": "^5.x.x"
  }
}
```

- `check` = `astro sync && astro check` per plan R-3 (workaround for the silent-exit wart, language-tools discussion #982).
- `build` = `astro check && astro build` per plan R-3 (chains schema/TS validation into the build so AC18 / NF8 hold).
- `start` aliases `dev` for consistency with other workspaces.
- `typecheck` reuses `astro check` (the canonical TS-only check command in Astro projects is `astro check`).
- No `lint` script — AC16 is "if configured"; for MVP, `astro check` is the static-analysis surface (plan §4 AC coverage note).
- No `test` script in MVP per A9.

#### S.6.5 Environment variables

**None.** The site is static and reads no secrets. There is no `.env*` file. No process.env access anywhere in `site/` source.

### S.7 Sidebar navigation structure

The 9-entry sidebar — already shown inline in §S.6.1. Listed here standalone for AC2 evidence:

```js
sidebar: [
  { label: 'Home', link: '/' },
  {
    label: 'Start Here',
    collapsed: false,
    items: [
      { label: 'Day 1', link: '/start-here/day-1/' },
      { label: 'Week 1 (coming soon)', link: '/start-here/week-1/' },
    ],
  },
  { label: 'News', link: '/news/' },
  { label: 'Skills', link: '/skills/' },
  { label: 'Tips & Tricks', link: '/tips/' },
  { label: 'Glossary', link: '/glossary/' },
  { label: 'Reference', link: '/reference/' },
  { label: 'Contribute', link: '/contribute/' },
]
```

- 8 top-level entries + 2 children inside "Start Here" = 9 visible labels in the rendered sidebar (newcomer journey first, catalog second, meta last — A11 order).
- All entries use `link:` (not `slug:`) because every page in §S.2 is implemented under `src/pages/`, not as a `.md`/`.mdx` page under `src/content/docs/`. The homepage is the one exception (`src/content/docs/index.mdx`), and Starlight is happy to accept `link: '/'` for it.
- Week 1 link dead-ends to a placeholder page (just so the sidebar entry doesn't 404). The label includes "(coming soon)" so the user isn't surprised.
- No badges, no icons, no per-entry styling — minimal MVP.

### S.8 Cross-workspace coupling and integration points

**Read-only contract with pipeline:**

| Site reads | Pipeline writes | Contract |
|---|---|---|
| `../news/published/*.md` | Editor PR moves files from `news/incoming/` to `news/published/` (pipeline produces `incoming/`; site does not read `incoming/`). | Filenames match `^\d{4}-\d{2}-\d{2}-<slug>\.md$`. Frontmatter matches `NewsFrontmatter` shape exactly. Pipeline's `frontmatter.ts` is the producer of record. |
| `../skills/*.md` | Hand-authored via PR (no pipeline path today). | Frontmatter matches `baseShape('skill')`. |
| `../tips/*.md` | Hand-authored via PR. | Frontmatter matches `baseShape('tip')`. |
| `../glossary/*.md` | Hand-authored via PR. | Frontmatter matches `baseShape('glossary')`. Filename without `.md` is the anchor slug (AC15). |
| `../journeys/*.md` | Hand-authored via PR. | Frontmatter matches `baseShape('journey-step')`. |

**Schema drift risk:** documented in §S.4 (the news schema is a duplicated mirror of `NewsFrontmatter`). Mitigation: prominent comment block at the top of `content.config.ts` pointing at the pipeline's source-of-truth files. Tracked as a follow-up in `Issues - Pending Items.md` per plan Step 13. Future "shared schema package" extraction possible but explicitly out of MVP scope.

**HMR caveat (plan R-7):** Astro's dev-server file watcher watches the project root (`site/`) and `src/`. Files under sibling folders (`../news/published/*.md`, `../skills/*.md`, etc.) may not trigger hot-reload on edit. Workaround: restart `npm run dev` after content edits. Optional widening of the Vite watcher (`vite.server.watch.ignored`) is a follow-up, not MVP-blocking, because content authoring happens via PR + file write, not live editing during dev. Documented in `site/README.md` per Step 13.

**No code-level dependency on the pipeline workspace.** No `import` ever crosses workspace boundaries. No shared `tsconfig.json` paths. No npm workspace / pnpm / turbo wiring. The two workspaces are siblings that happen to share a frontmatter contract via documentation, not via TypeScript.

**No deploy integration in MVP** (A17). `dist/` is git-ignored. `npm run preview` validates the production output locally without deploying. Hosting decision (OQ1) deferred.

### S.9 Parallel implementation unit assignments

Plan §3 establishes the sequential spine (Steps 1–6 → fan-out Step 7 → Step 8 → Step 9 → Steps 10–12 → Step 13). This section confirms / refines the within-Step-7 parallelization with **strict file-ownership boundaries — no two units write to the same file.**

**Sequential block (no parallelism, single owner):**

| Step | Files owned | Why sequential |
|---|---|---|
| 1 | scaffolds the entire `site/` tree | foundational; nothing else can start until it lands |
| 2 | `.nvmrc`, edits `package.json` (`type`/engines confirm), edits `astro.config.mjs` (server.port) | trivial; piggybacks on Step 1's working tree |
| 3 | edits `package.json` (scripts block), edits `tsconfig.json` | trivial; piggybacks |
| 4 | writes `src/content.config.ts` | gates everything below — components and pages can't typecheck without collections |
| 5 | edits `astro.config.mjs` (sidebar) | piggybacks; small surface |
| 6 | writes `src/styles/custom.css`, edits `astro.config.mjs` (customCss) | tiny |

**Step 7 fan-out** (after Step 6 lands), 6 components + 1 helper. **Recommended worker assignment** (3 workers, balanced load):

| Worker | Files owned | Depends on | Contract surface respected |
|---|---|---|---|
| **A** | `src/lib/news.ts`<br>`src/components/NewsPanel.astro`<br>`src/components/NewsList.astro` | Step 4 (`news` collection); `AudienceBadge` (Worker C) for import resolution at compile time — but since Worker C's contract is the public interface from §S.3.4, Worker A can stub-import `AudienceBadge` before Worker C finishes its body (Astro doesn't typecheck the import target's body to satisfy the import).<br>NOTE: in practice the workers can run truly concurrently because the file boundary is hard; the only sync point is the final `npm run check` in Step 7's exit gate. | §S.3.2, §S.3.3, §S.3.7 |
| **B** | `src/components/HomeHero.astro`<br>`src/components/AudienceFilter.astro` | Step 6 (CSS classes) | §S.3.1, §S.3.6 |
| **C** | `src/components/AudienceBadge.astro`<br>`src/components/SkillCard.astro` | Step 4 (`skills` collection); `AudienceBadge` ships first within the worker so `SkillCard` can import it | §S.3.4, §S.3.5 |

**File-ownership invariant:** every file in the matrix is in exactly one row. No two workers write the same file. Cross-worker imports respect the public interfaces in §S.3.x as the only contact surface.

**Step 8** (`index.mdx`) is single-owner; runs after Step 7. Imports `HomeHero` and `NewsPanel` from Workers B and A respectively.

**Step 9 fan-out** (after Step 8 lands), 8 page files. Suggested 3-worker split:

| Worker | Files owned | Depends on |
|---|---|---|
| **D** | `src/pages/news/index.astro`<br>`src/pages/news/[slug].astro` | Worker A's `NewsList`, Worker B's `AudienceFilter`, Worker C's `AudienceBadge`; Step 4 `news` collection |
| **E** | `src/pages/skills.astro`<br>`src/pages/tips.astro`<br>`src/pages/glossary.astro` | Worker B's `AudienceFilter`, Worker C's `SkillCard`, Worker C's `AudienceBadge`; Step 4 collections |
| **F** | `src/pages/reference.astro`<br>`src/pages/contribute.astro`<br>`src/pages/start-here/day-1.astro`<br>`src/pages/start-here/week-1.astro` | none beyond `StarlightPage` wrapper — hand-authored content, no collection reads |

**Step 10** (seed content under `glossary/`, `journeys/`, plus `.gitkeep`s under `skills/`, `tips/`) is a separate Coder, **runs in parallel with Steps 5–9** as soon as Step 4 (schemas) lands. Files owned: all under `glossary/`, `journeys/`, `skills/`, `tips/` at repo root. No file overlap with site workspace.

**Steps 11–13** are single-owner sequential.

**Critical-path summary** (revisited): Step 1 → 2 → 3 → 4 → (5 ∥ 6 ∥ 10-start) → 7 (3 workers in parallel) → 8 → 9 (3 workers in parallel) → 11 → 12 → 13. Roughly 1 day wall-clock with the parallelization; ~1.5 days sequential.

### S.10 Naming conventions

- **File names:** kebab-case for `.ts`/`.css`/`.md`/`.mdx`/`.json` (`content.config.ts`, `custom.css`, `day-1.md`, `[slug].astro`). PascalCase for `.astro` component files (`HomeHero.astro`, `AudienceBadge.astro`). This matches Astro/Starlight convention and stays distinct from pipeline's pure kebab-case (`frontmatter.ts`, `azure-client.ts`) — the difference is component-vs-module, not project-vs-project.
- **Astro component names** (the value imported): PascalCase, matching the file (`import HomeHero from '.../HomeHero.astro'`).
- **Exported function / variable identifiers:** camelCase (`getRecentNews`, `baseShape`, `audienceEnum`).
- **Type / interface names:** PascalCase (`Props`, `CollectionEntry<'news'>` from Astro core).
- **CSS class names:** kebab-case with BEM-light modifiers (`.audience-badge`, `.audience-badge--beginner`, `.news-card`, `.news-card-grid`, `.home-hero__cta-row`). Aligns with Astro/Starlight idioms.
- **Sidebar entry labels:** Title Case with `&` and ampersands literal where they appear in the spec ("Tips & Tricks", not "Tips and Tricks").
- **Data attributes** used by the audience filter: `data-audience`, `data-topics`, `audience-hidden` (the toggle class).
- **`localStorage` key:** `nbgaihub.audience` (single, namespaced; no other site state persisted client-side in MVP).
- **Route paths:** trailing slash always (Starlight default). Sidebar `link:` and internal `<a href>` values include them.

### S.11 Cross-cutting design rules

1. **TypeScript strict** — `noUncheckedIndexedAccess: true` on top of Starlight's strict preset. Components and pages use `.at(0)`, length guards, or destructure-in-`.map()` to satisfy it (plan risk P-R6).
2. **ESM only** — `"type": "module"` in `site/package.json`. Astro 6 requires it. Matches pipeline.
3. **No fallback values for missing configuration** — global rule + NF8. Schema violations, missing config files, missing dependencies all fail loudly via `astro check` / `astro build`. The only "silent acceptance" surface is empty collection folders, where Astro itself returns `[]` and the catalog pages branch on `items.length === 0`. That's a domain rendering choice, not a silenced error.
4. **No premature abstraction** — six components are six files; do not collapse `NewsPanel` and `NewsList` into one parameterised component for MVP (`getRecentNews` already de-duplicates the data fetch). No `<EmptyState>` shared component for MVP; inline the canonical copy in each catalog page (A8). Revisit if/when the same string appears in 4+ places.
5. **Minimal custom CSS** — `site/src/styles/custom.css` ≤100 LOC per A6. Class-based rules only; no global resets; no Tailwind, no `@apply`, no preprocessor. Defaults from Starlight do the heavy lifting.
6. **No client islands** — `AudienceFilter` is the only client behaviour and it's a vanilla `<script>` block in an `.astro` component, not a `client:*` directive. No `@astrojs/react` / `vue` / etc. integration.
7. **No `console.log`** — same convention as pipeline. The audience filter's inline script is fire-and-forget; no logging emitted. Build-time output is owned by Astro.
8. **No version-control side effects from site code** — site code never invokes `git`, never writes to repo content folders. Read-only contract per refined-request "Constraints".
9. **No environment variables** — the site is static; no API keys, no runtime config. `.env*` files are not used in `site/`.
10. **Trailing slash always** — sidebar `link:`, internal `<a href>`, dynamic route slugs (the `getStaticPaths` shape produces `/news/<slug>/index.html` which Starlight serves at `/news/<slug>/`).

### S.12 Verification checklist (design-level)

Reconciliation: every plan-002 reconciliation item maps to a section of this design.

| Plan reconciliation | Realised in design |
|---|---|
| R-1 (Astro 6 + Starlight 0.39) | §S.6.4 deps; §S.6.1 config |
| R-2 (`generateId` for news slugs) | §S.4 news collection definition |
| R-3 (hardened scripts) | §S.6.4 scripts block |
| R-4 (homepage as `index.mdx` with `template: splash`) | §S.2 file inventory; §S.3.1 + §S.3.2 mounted by it |
| R-5 (catalog pages as `.astro` under `src/pages/` wrapped in `StarlightPage`) | §S.2 file inventory; §S.7 sidebar uses `link:`, not `slug:` |
| R-6 (A9 rationale refresh) | Surface for refined-request edit in plan Step 13; not a contract change |
| R-7 (HMR caveat) | §S.8 cross-workspace coupling; documented in `site/README.md` at Step 13 |

Every AC1–AC20 from the refined request is addressed by either a contract above or a verification step in plan-002 §4. Cross-reference table (design → AC) below for the load-bearing ones:

| AC | Design anchor |
|---|---|
| AC1 | §S.6.4 (versions in `package.json`) |
| AC2 | §S.7 (sidebar shape) |
| AC3 | §S.4 (5 `defineCollection` entries) |
| AC4 | §S.4 (news schema fields) |
| AC5 / AC6 | §S.6.4 (hardened scripts chain `astro check`) |
| AC7 | §S.6.1 (server.port pin) |
| AC8 | §S.7 (9 labels render in sidebar) |
| AC9 / AC11 | §S.2 (page file inventory) + §S.5 (empty-state) |
| AC10 | §S.2 (`[slug].astro`) + §S.3.7 (`getStaticPaths` shape) |
| AC12 | §S.2 (component file inventory) + §S.3.x |
| AC13 | §S.3.4 (AudienceBadge classes) + §S.2 custom.css |
| AC14 | §S.3.6 (AudienceFilter inline script) |
| AC15 | §S.2 (`glossary.astro` anchors via `id={entry.id}`) |
| AC17 | §S.6.1 (Pagefind default-on) |
| AC18 | §S.5 (schema-failure strategy) + §S.6.4 (hardened scripts) |
| AC19 | §S.4 (`hero_image` optional URL) |
| AC20 | §S.6.4 (dep declarations, no deprecated direct deps) |

---

*End of Site architecture section.*

## Personalization architecture

> **Plan reference:** `docs/design/plan-003-personalization-and-contributions.md` is authoritative for *what* gets done in *what order*. This section is authoritative for *interfaces, contracts, data models, and module structure*. Phase 6 (Coders) reads both side-by-side: plan = wave/step sequence + AC mapping; design = function signatures + types + error classes + file ownership.
>
> **Pivot context:** post-2026-05-18, the Option C architecture is in force — PAT-paste auth, unlisted-gist-per-user storage, URL-redirect submissions, CI validator on `pull_request`. No Device Flow, no OAuth App, no Cloudflare Worker, no browser-side write APIs.

### P.0 Plan-level concerns surfaced to orchestrator

The plan is structurally sound. Two items surfaced during design that warrant orchestrator attention (neither is a re-sequence; both are clarifications to record before Phase 6 starts):

1. **`astro.config.mjs` lock between Step 10 and Step 14.** The plan calls this out as a coordination point. The design resolves it by assigning **Unit P-C1** (single Coder) ownership of *all* `astro.config.mjs` edits across Wave C — the `components.SocialIcons` override AND the sidebar `My Pins` + `Submit a skill` entries — in one commit. No serialised-edit coordination needed; ownership is exclusive.
2. **Plan Step 18 proposes new F-codes `F-P-PIN-1` and `F-P-SUB-1`.** Plan §9 item 13 defers the decision to the Designer. **Design decision:** fold both into the existing F-P1..F-P25 set — `F-P-PIN-1` is fully covered by F-P11 (the build-time pin index is mentioned there), and `F-P-SUB-1` is fully covered by F-P14 + F-P15. No new F-codes. Phase 6 must NOT introduce them.

### P.1 System architecture and component diagram

```
                    ┌─────────────────────────────────────────────────────┐
                    │                BROWSER (static Astro)               │
                    │                                                     │
                    │  ┌──────────────┐    ┌─────────────────────┐        │
                    │  │ SignIn.astro │───▶│   auth.ts           │        │
                    │  │ (<dialog>)   │    │   validateToken()   │────────┼──▶ GET api.github.com/user
                    │  └──────────────┘    │   storeToken()      │        │     (PAT validate)
                    │                      └─────────┬───────────┘        │
                    │                                │ subscribe()        │
                    │  ┌──────────────┐              ▼                    │
                    │  │PinButton     │    ┌─────────────────────┐        │
                    │  │.astro        │───▶│   gist.ts           │        │
                    │  └──────────────┘    │   findOrCreate(),   │────────┼──▶ GET  /gists       (discover)
                    │                      │   addFavorite(),    │────────┼──▶ POST /gists       (lazy create)
                    │                      │   removeFavorite()  │────────┼──▶ GET  /gists/<id>  (read)
                    │                      └─────────────────────┘────────┼──▶ PATCH /gists/<id> (write)
                    │                                                     │
                    │  ┌──────────────┐    ┌─────────────────────┐        │
                    │  │ submit-skill │───▶│   submission.ts     │        │
                    │  │ .astro       │    │   serialize()       │        │
                    │  └──────────────┘    │   buildEditorUrl()  │        │
                    │                      │   copyToClipboard() │        │
                    │                      │   checkSlug()       │────────┼──▶ GET  api.github.com/repos/.../contents/skills/<slug>.md
                    │                      └─────────┬───────────┘        │       (anonymous; 200/404/429)
                    │                                │ window.open()       │
                    │  ┌──────────────┐              ▼                    │
                    │  │my-pins.astro │   ┌────────────────────┐          │
                    │  │              │──▶│  pin-store.ts      │          │
                    │  └──────────────┘   │  joinWithIndex()   │          │
                    │                     └─────────┬──────────┘          │
                    │                               │ fetch('/_data/...')│
                    │  ┌──────────────┐             │                    │
                    │  │ localStorage │             │                    │
                    │  │ nbgaihub.gh_*│◀────────────┘                    │
                    │  │ .gist_id     │                                  │
                    │  └──────────────┘                                  │
                    └─────────────────────────────────────────────────────┘
                                          │                          │
                                          ▼                          ▼
                            github.com/.../new/main/skills      (build time, once)
                            ?filename=<slug>.md&value=<...>      ┌──────────────────────┐
                            (URL redirect; user reviews;         │ scripts/             │
                             GitHub UI handles fork/branch/PR)   │ build-pin-index.ts   │
                                          │                      │ → public/_data/      │
                                          ▼                      │   <type>-index.json  │
                            ┌─────────────────────┐              └──────────────────────┘
                            │ chomovazuzana/      │
                            │ NbgAiHub PR         │                      │ during astro build
                            │ (skills/*.md)       │                      ▼
                            └──────────┬──────────┘                ┌──────────────────┐
                                       │ pull_request trigger      │ dist/_data/      │
                                       ▼                           │ <type>-index.json│
                            ┌──────────────────────────┐           └──────────────────┘
                            │ .github/workflows/       │
                            │ validate-skill-          │
                            │ submission.yml           │
                            │   └─▶ pipeline/dist/     │
                            │       validators/cli.js  │
                            │       (reads            │
                            │        config/          │
                            │        maintainers.json)│
                            └──────────┬───────────────┘
                                       ▼
                            GitHub Check annotations
                            (::error file=... — green/red)

                    [out of scope for this phase, on diagram for context:]

                            ┌───────────────────────────────┐
                            │ Future Claude `/hub-*` skill  │
                            │   gh api gists/<id>           │──── reads/writes the same
                            │   (same wrapped JSON shape)   │     gist.files["nbgaihub-
                            │   (same dedup rules)          │      favorites.json"]
                            └───────────────────────────────┘
```

**Data-flow summary.**
- **Auth path:** browser ↔ `https://api.github.com/user` only. PAT never leaves the user's machine for any other origin.
- **Pin path:** browser ↔ `https://api.github.com/gists*`. Two API calls per write (GET + PATCH; read-modify-write per F-P9).
- **Submission path:** browser → `https://github.com/.../new/main/skills?...` redirect. Hub never calls a write API for submissions. Optional pre-check `GET .../contents/skills/<slug>.md` unauthenticated for slug collision.
- **Pin-display path:** browser → static `/_data/<type>-index.json` (served from `dist/`); joined client-side with gist `favourites[]` to render `/my-pins/`.
- **CI path:** `pull_request` event on `skills/**/*.md` → workflow checks out PR diff → invokes compiled `pipeline/dist/validators/cli.js` → posts `::error` annotations on failure → exits 0/1.

### P.2 Module structure under `site/`

#### P.2.1 New modules

| Path | Kind | Purpose |
|---|---|---|
| `site/src/lib/auth.ts` | TS module (pure + side-effecting on `localStorage` + `fetch`) | PAT validation, token IO, subscribe/notify auth state. |
| `site/src/lib/gist.ts` | TS module | Discovery, lazy create, read-modify-write of the favourites gist. Imports `auth.ts` for `getToken()`. |
| `site/src/lib/submission.ts` | TS module | Skill markdown serialiser, GitHub new-file URL builder, clipboard fallback, slug-collision pre-check. Imports `slug.ts`. |
| `site/src/lib/pin-store.ts` | TS module | Joins gist `favourites[]` against the build-time `<type>-index.json`. Pure transform + a single `fetch` per type. |
| `site/src/lib/slug.ts` | TS module | Duplicate of `pipeline/src/slug.ts`; drift-tested. Exports `slugify`. |
| `site/src/lib/api-fetch.ts` | TS module | Single `apiFetch()` wrapper used by `auth.ts` and `gist.ts` for all `api.github.com` calls. Centralises CORS + error mapping (P.6). |
| `site/src/components/PinButton.astro` | `.astro` component | Pin/unpin button; gated by sign-in state. Inline `<script is:inline>` for client behaviour (matches `AudienceFilter.astro` precedent). |
| `site/src/components/SignInModal.astro` | `.astro` component | Native `<dialog>` modal hosting PAT-paste UX. Opened by `SocialIconsOverride.astro` and by `PinButton.astro` when anonymous. |
| `site/src/components/SocialIconsOverride.astro` | `.astro` component | Starlight `SocialIcons` slot override (per A15 + R6). Renders Sign-in button (anon) or `@login` + Sign-out chip (auth). |
| `site/src/pages/my-pins.astro` | Astro page | `/my-pins/` — anonymous panel OR client-rendered pin sections grouped by type. |
| `site/src/pages/submit-skill.astro` | Astro page | `/submit-skill/` — anonymous-accessible form. |
| `site/scripts/build-pin-index.ts` | TS script (invoked pre-`astro build`) | Reads `*.md` from the five content folders, emits `public/_data/<type>-index.json` per type. |

#### P.2.2 Modified files (Wave C ownership)

| Path | Owner Unit | Edits |
|---|---|---|
| `site/src/content.config.ts` | P-A0 | Extend `skills` collection with 7 new fields (spread `baseShape('skill')`). |
| `site/astro.config.mjs` | **P-C1 (exclusive)** | Add `components.SocialIcons` override; add 2 sidebar entries (`My Pins`, `Submit a skill`). One commit. |
| `site/package.json` | P-A1 | Add `vitest`, `tsx` to `devDependencies`; add `test`, `test:watch` scripts; update `build` to chain `tsx scripts/build-pin-index.ts && astro check && astro build`. |
| `site/src/components/NewsPanel.astro` | P-C3 | Insert `<PinButton type="news" slug={item.id} />`. |
| `site/src/components/NewsList.astro` | P-C3 | Insert `<PinButton type="news" slug={item.id} />`. |
| `site/src/components/SkillCard.astro` | P-C3 | Insert `<PinButton type="skill" slug={entry.id} />`. |
| `site/src/pages/tips.astro` | P-C3 | Insert `<PinButton type="tip" slug={entry.id} />`. |
| `site/src/pages/glossary.astro` | P-C3 | Insert `<PinButton type="glossary" slug={entry.id} />`. |
| `site/src/pages/news/[slug].astro` | P-C3 | Insert `<PinButton type="news" slug={entry.id} />`. |

### P.3 Module structure under `pipeline/`

| Path | Kind | Purpose |
|---|---|---|
| `pipeline/src/validators/skill.ts` | TS module (pure) | Frontmatter validator core. Exports `validateSkillFrontmatter()` and `validateSkillFile()`. No side effects beyond optional `HEAD` request for `external_link`. |
| `pipeline/src/validators/cli.ts` | TS executable | CLI wrapper for GH Actions. Reads file paths from argv, loads `config/maintainers.json` via `loadMaintainers()`, runs validator, prints `::error file=...,line=1::...`, exits 0/1. |
| `pipeline/src/validators/config.ts` | TS module | Loads `config/maintainers.json`. Throws `ConfigNotFoundError` (no fallback per global CLAUDE.md). |
| `pipeline/tests/validators/skill.test.ts` | Vitest spec | Covers AC16–AC20 + missing-config case. |
| `pipeline/tests/validators/fixtures/*.md` | Fixtures | 4 fixture files per plan Step 9. |
| `config/maintainers.json` | Config (repo root) | `{"team_aliases": ["@nbg-ai-team", ...]}`. Singular naming applied: this is a config artifact, not a table — the *array* is plural because it expresses a collection. |

### P.4 Public interfaces / contracts per module

Conventions: all signatures are TypeScript strict + `noUncheckedIndexedAccess`. ESM-only. PascalCase types, camelCase functions, `XxxError` for error classes (per §3.8 codebase scan). Where a parameter is a discriminated-union narrow type, the union literal set is declared inline.

#### P.4.1 `site/src/lib/api-fetch.ts`

```ts
export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'HEAD';
  token?: string;                    // omit for unauthenticated calls (e.g. slug-collision check)
  body?: unknown;                    // JSON-serialised when present; sets Content-Type automatically
  acceptJson?: boolean;              // default true; sets Accept: application/vnd.github+json
  signal?: AbortSignal;
}

export interface ApiFetchResult<T> {
  status: number;                    // HTTP status as observed
  data: T;                           // parsed JSON body (or `undefined as unknown as T` for 204)
  headers: Headers;
}

/**
 * Centralised wrapper for every call against api.github.com.
 * - Asserts the URL hostname is exactly `api.github.com` (AC23).
 * - Maps 401 -> TokenInvalidError, 403 (rate-limit) -> RateLimitedError,
 *   429 -> RateLimitedError, 404 -> NotFoundError, network -> NetworkError.
 * - All other non-2xx surfaces as GitHubApiError with the status + parsed message.
 * - Always sets Accept: application/vnd.github+json unless opted out.
 */
export function apiFetch<T = unknown>(
  url: string,
  options?: ApiFetchOptions,
): Promise<ApiFetchResult<T>>;

export class NetworkError extends Error { name: 'NetworkError' }
export class NotFoundError extends Error { name: 'NotFoundError'; status: 404 }
export class RateLimitedError extends Error { name: 'RateLimitedError'; status: number; retryAfterSeconds?: number }
export class GitHubApiError extends Error { name: 'GitHubApiError'; status: number; body?: unknown }
// TokenInvalidError is owned by auth.ts (re-exported through here for callers).
```

**Side effects:** issues `fetch()`; no `localStorage` access. **Purity:** non-pure (network).

#### P.4.2 `site/src/lib/auth.ts`

```ts
export interface GitHubUser {
  login: string;
  // The site reads only `login`. Other fields are present but unspecified —
  // we deliberately do NOT type them, to keep the contract narrow.
}

export interface StoredAuthState {
  token: string;
  user: GitHubUser;
}

export type AuthSubscriber = (state: StoredAuthState | null) => void;

/** Validates the PAT by issuing GET /user. 200 -> resolve. 401 -> TokenInvalidError. */
export function validateToken(token: string): Promise<GitHubUser>;

/** Writes nbgaihub.gh_token + nbgaihub.gh_user; notifies subscribers. */
export function storeToken(token: string, user: GitHubUser): void;

/** Synchronous read of the persisted state, or null when signed out. */
export function readToken(): StoredAuthState | null;

/** Removes nbgaihub.gh_token, nbgaihub.gh_user, nbgaihub.gist_id; notifies subscribers. */
export function clearToken(): void;

/** Convenience: returns the bearer string when present, else null. */
export function getToken(): string | null;

/** Convenience: returns the GitHubUser when signed in, else null. */
export function getUser(): GitHubUser | null;

/** End-to-end sign-in. validateToken() + storeToken() composed. */
export function signIn(token: string): Promise<StoredAuthState>;

/** Alias for clearToken(). Provided for symmetry. */
export function signOut(): void;

/** Subscribe to auth changes (sign-in, sign-out, external storage events from other tabs). Returns an unsubscribe function. */
export function subscribe(callback: AuthSubscriber): () => void;

export class TokenInvalidError extends Error { name: 'TokenInvalidError' }
export class TokenRevokedError extends Error { name: 'TokenRevokedError' }
// (Revoked = a previously-valid token returned 401 from a downstream gist call. Different surface than `Invalid`.)
```

**Side effects:** `localStorage` reads/writes under exactly three keys (`nbgaihub.gh_token`, `nbgaihub.gh_user`, `nbgaihub.gist_id`); subscribes to `window.addEventListener('storage', ...)` so multi-tab sign-in/out propagates. **Purity:** `validateToken` is non-pure (network); `readToken`, `getToken`, `getUser` are reads; `storeToken`, `clearToken`, `signIn`, `signOut` mutate localStorage + notify subscribers.

**DI seam:** `validateToken` calls `apiFetch` from `api-fetch.ts`; tests inject a mocked `fetch` via `globalThis.fetch` per vitest's standard pattern (no constructor injection needed — vanilla `fetch` is the seam).

#### P.4.3 `site/src/lib/gist.ts`

```ts
export type FavoriteType = 'news' | 'skill' | 'tip' | 'glossary' | 'journey-step';

export interface FavoriteEntry {
  type: FavoriteType;
  slug: string;
  pinned_at: string;                 // YYYY-MM-DD
}

export interface FavoritesDocument {
  schema_version: 1;
  favourites: FavoriteEntry[];
}

export interface FavoritesGistRef {
  gistId: string;
  document: FavoritesDocument;
}

/**
 * Discovery + lazy-create.
 *   1. Reads cached gist id from localStorage (nbgaihub.gist_id) if present;
 *      attempts a GET on it. On 404 -> rediscover. On 200 -> return.
 *   2. Otherwise issues GET /gists (paginated) and scans `files` map for the
 *      key `nbgaihub-favorites.json`. Returns the first match's id (OQ2).
 *   3. If no match, POST /gists with public: false, the canonical filename,
 *      and an initial {schema_version:1, favourites:[]} document.
 * Throws TokenInvalidError on 401 (bubbles up to UI to clear state per OQ4).
 */
export function findOrCreateFavoritesGist(token: string): Promise<FavoritesGistRef>;

/** GET /gists/<id>; parses content; tolerates missing schema_version per AC22. */
export function readFavoritesGist(token: string, gistId: string): Promise<FavoritesDocument>;

/** Read-modify-write: adds an entry deduped on (type, slug). Returns the new document. */
export function addFavorite(
  token: string,
  gistId: string,
  entry: FavoriteEntry,
): Promise<FavoritesDocument>;

/** Read-modify-write: removes by (type, slug). No-op if absent. Returns the new document. */
export function removeFavorite(
  token: string,
  gistId: string,
  ref: { type: FavoriteType; slug: string },
): Promise<FavoritesDocument>;

/** Pure: serialises a FavoritesDocument to the canonical JSON string written to gist.files. */
export function serializeFavoritesDocument(doc: FavoritesDocument): string;

/** Pure: parses + validates a gist file string. Treats missing schema_version as 1 (AC22). */
export function parseFavoritesDocument(raw: string): FavoritesDocument;

export class GistNotFoundError extends Error { name: 'GistNotFoundError' }
export class GistSchemaError extends Error { name: 'GistSchemaError' }
export class GistWriteConflictError extends Error { name: 'GistWriteConflictError' }
// (WriteConflict is reserved for future ETag use; documented but not thrown in MVP — last-write-wins is accepted per PR-4.)

export const FAVORITES_FILENAME = 'nbgaihub-favorites.json' as const;
```

**Side effects:** non-pure (network) except `serializeFavoritesDocument` / `parseFavoritesDocument`. **DI seam:** all network calls go through `api-fetch.ts`.

#### P.4.4 `site/src/lib/submission.ts`

```ts
import type { SkillForm, SkillFrontmatter } from './skill-types';

export interface BuildEditorUrlResult {
  url: string;                       // the URL to navigate to
  fitsInUrl: boolean;                // true => direct redirect; false => clipboard fallback path
}

export interface SlugCollisionResult {
  status: 'collision' | 'free' | 'unknown';
  // 'collision' = GET .../contents/skills/<slug>.md returned 200
  // 'free'      = returned 404
  // 'unknown'   = 403, 429, or network error — non-blocking warning per F-P16
}

/** Pure: builds the YAML-frontmatter + body markdown string in canonical key order (see P.5.4). */
export function serializeSkillToMarkdown(form: SkillForm): string;

/** Pure: builds the github.com new-file URL. Sets `fitsInUrl: false` if url.length > 7000. */
export function buildEditorUrl(slug: string, markdown: string): BuildEditorUrlResult;

/** Pure: validates one SkillForm against the same rules as the CI validator. Returns ValidationIssue[]. */
export function validateSkillForm(form: SkillForm): ValidationIssue[];

/** Non-pure: writes to clipboard via navigator.clipboard.writeText(). Throws ClipboardUnavailableError on rejection. */
export function copyToClipboard(markdown: string): Promise<void>;

/** Non-pure: unauthenticated GET against api.github.com/repos/.../contents/skills/<slug>.md. */
export function checkSlugCollision(slug: string): Promise<SlugCollisionResult>;

/** Pure: derives the slug from the title using the duplicated slug.ts. Exposed for live preview in the form. */
export function deriveSlugFromTitle(title: string): string;

export class ClipboardUnavailableError extends Error { name: 'ClipboardUnavailableError' }
export class SubmissionUrlTooLongError extends Error { name: 'SubmissionUrlTooLongError' }
// (UrlTooLong is documented but typically never thrown — buildEditorUrl returns fitsInUrl:false
//  and the caller chooses the clipboard branch. The class exists for callers that want exception flow.)

export interface ValidationIssue {
  field: keyof SkillForm | 'slug' | 'body';
  rule: string;                      // e.g. 'install_command/prefix', 'skill_id/regex', 'required'
  message: string;                   // human-readable, shown inline in the form
}
```

**Side effects:** `copyToClipboard` (clipboard API) and `checkSlugCollision` (network). Everything else pure. **DI seam:** the slug-collision call uses `apiFetch` with `token: undefined`.

**Hardcoded constants** (acceptable for MVP per NF-P2 note): `REPO_OWNER = 'chomovazuzana'`, `REPO_NAME = 'NbgAiHub'`, `DEFAULT_BRANCH = 'main'`, `SKILLS_PATH_PREFIX = 'skills'`, `URL_LENGTH_THRESHOLD = 7000`. Centralised at the top of `submission.ts`. If/when these become env vars in a future phase, the **no-fallback** rule kicks in (P.6).

#### P.4.5 `site/src/lib/skill-types.ts`

This is a new lightweight type-only module so `submission.ts` and `submit-skill.astro` import the same shape. **No runtime code.**

```ts
export type SkillOrigin = 'internal' | 'community' | 'external';
export type SkillCategory =
  | 'workflow' | 'code' | 'docs' | 'integration' | 'productivity' | 'testing' | 'other';
export type SkillStatus = 'active' | 'experimental' | 'deprecated';
export type SkillAudience = 'beginner' | 'advanced' | 'both';

/** The 17-field frontmatter shape that lands in skills/<slug>.md. Matches the extended Zod schema in P.5.6. */
export interface SkillFrontmatter {
  // 10 canonical fields (baseShape):
  type: 'skill';
  title: string;
  audience: SkillAudience;
  topics: string[];
  internal: boolean;
  authored: string;                  // YYYY-MM-DD
  last_reviewed: string;             // YYYY-MM-DD
  external_link: string | null;
  deeper_link: string | null;
  ai_summary: string;
  // 7 new fields (this phase):
  install_command: string;           // starts with `/plugin marketplace add ` or `/plugin install `
  skill_id: string;                  // matches /^[a-z0-9-]+$/
  origin: SkillOrigin;
  category: SkillCategory;
  status: SkillStatus;
  maintainer: string;                // `@<handle>` or appears in maintainers.json team_aliases
  requires?: string[];               // optional, free-text array (A11)
}

/** What the form holds before serialisation — same as frontmatter + the body string. */
export interface SkillForm extends SkillFrontmatter {
  body: string;
}
```

#### P.4.6 `site/src/lib/pin-store.ts`

```ts
import type { FavoriteType, FavoriteEntry } from './gist';

export interface PinIndexEntry {
  slug: string;
  title: string;
  audience: 'beginner' | 'advanced' | 'both';
  topics: string[];
}

export interface PinIndexFile {
  schema_version: 1;
  items: PinIndexEntry[];
}

export interface ResolvedPin {
  entry: FavoriteEntry;
  resolved: PinIndexEntry | null;    // null => stale (AC10)
}

/** Non-pure: fetches /_data/<type>-index.json. Static asset — no auth. Returns parsed PinIndexFile. */
export function fetchPinIndex(type: FavoriteType): Promise<PinIndexFile>;

/** Pure: joins a list of favourites against an index. */
export function joinFavoritesWithIndex(
  favourites: FavoriteEntry[],
  index: PinIndexFile,
  filterType: FavoriteType,
): ResolvedPin[];

/** Pure: groups a flat favourites list by type, in the canonical display order (skill, tip, news, journey-step, glossary). */
export function groupFavoritesByType(
  favourites: FavoriteEntry[],
): Record<FavoriteType, FavoriteEntry[]>;

export const DISPLAY_ORDER: readonly FavoriteType[] = [
  'skill',
  'tip',
  'news',
  'journey-step',
  'glossary',
] as const;

export class PinIndexNotFoundError extends Error { name: 'PinIndexNotFoundError' }
export class PinIndexSchemaError extends Error { name: 'PinIndexSchemaError' }
```

**Side effects:** `fetchPinIndex` calls `fetch('/_data/<type>-index.json')` (same origin; not via `apiFetch` because it's a static asset). Others are pure.

#### P.4.7 `site/src/lib/slug.ts`

```ts
export const SLUG_MAX_LENGTH = 60;

/** Byte-for-byte mirror of pipeline/src/slug.ts. Drift test asserts parity. */
export function slugify(title: string): string;
```

#### P.4.8 `site/src/components/PinButton.astro`

**Props:**

```ts
interface Props {
  type: 'news' | 'skill' | 'tip' | 'glossary' | 'journey-step';
  slug: string;
  initialPinned?: boolean;           // optional SSR-time hint; default false
}
```

**Client-side state machine** (vanilla inline `<script is:inline>`, mirroring `AudienceFilter.astro`):

```
        signed-out
         │
         │ click → window.dispatchEvent('nbgaihub:open-signin')
         │   (consumed by SignInModal.astro)
         ▼
        opens modal; PinButton stays in signed-out state until subscribe() fires

        signed-in & unpinned
         │
         │ click → optimistic UI toggle to "pinned" + spinner
         │       → gist.addFavorite(token, gistId, entry)
         │       ├─ success → spinner off; stays "pinned"
         │       └─ error   → revert UI; dispatch 'nbgaihub:toast' with the error
         ▼
        signed-in & pinned
         │
         │ click → optimistic UI toggle to "unpinned" + spinner
         │       → gist.removeFavorite(token, gistId, {type, slug})
         │       ├─ success → spinner off; stays "unpinned"
         │       └─ error   → revert UI; dispatch 'nbgaihub:toast'
         ▼
        signed-in & unpinned
```

**DOM hooks:** `<button data-pin-type="skill" data-pin-slug="foo-bar" data-pin-state="unpinned">`. The inline script binds via `document.querySelectorAll('[data-pin-type]')` and subscribes to `auth.subscribe()` to switch between signed-in / signed-out renderings without a full re-render.

**Visual contract (Designer-final per plan §9 item 6):** outline icon when unpinned, filled when pinned, spinner overlay during the network call. CSS uses Starlight tokens (`var(--sl-color-accent)`, `var(--sl-color-text)`); no hardcoded hex. Class names `pin-button`, `pin-button--pinned`, `pin-button--busy`, `pin-button--signed-out`.

**Toast surface:** a single `<div id="nbgaihub-toast" role="status" aria-live="polite">` injected by `SocialIconsOverride.astro` once per page. Components dispatch `window.dispatchEvent(new CustomEvent('nbgaihub:toast', { detail: { message, kind: 'error'|'info' } }))`; the toast container's inline script renders + auto-dismisses after 4 s. **No third-party toast library.**

#### P.4.9 `site/src/components/SocialIconsOverride.astro`

**Props:** inherits Starlight's `SocialIcons` slot context; no custom props.

**Slot anchors:**
- Default (anonymous): renders `<button id="signin-trigger" class="signin-trigger">Sign in</button>`.
- Authenticated: renders `<span class="auth-chip">@{login}</span><button id="signout-trigger">Sign out</button>`.

**Inline script:** subscribes to `auth.subscribe()`; toggles the two renderings; opens the modal on `#signin-trigger` click; calls `auth.signOut()` on `#signout-trigger` click. Also mounts the global toast container exactly once.

#### P.4.10 `site/src/components/SignInModal.astro`

**Markup:** a single `<dialog id="nbgaihub-signin-modal">` with the PAT-paste UX copy (Designer-final per plan §9 item 5; investigation §5 is the starting point). Includes:
- Explainer paragraph.
- External link button to `https://github.com/settings/tokens/new?scopes=gist&description=NbgAiHub` (target=`_blank`, `rel="noopener"`).
- `<input type="password" id="pat-input" autocomplete="off" spellcheck="false">`.
- `<button id="pat-submit">Validate & sign in</button>`.
- `<p id="pat-error" aria-live="polite">` for inline error display.

**Inline script:** listens for `window.addEventListener('nbgaihub:open-signin', () => dialog.showModal())`. On submit:

```
await auth.signIn(token)            // calls validateToken + storeToken
  .then(() => dialog.close())
  .catch(err => {
    if (err instanceof TokenInvalidError) errorEl.textContent = 'Invalid or expired token.';
    else if (err instanceof NetworkError) errorEl.textContent = 'Network error — try again.';
    else errorEl.textContent = `Validation failed (${err.message}).`;
  });
```

#### P.4.11 `site/src/pages/my-pins.astro`

**Front matter (Astro):** `import { StarlightPage } ...` wrapper per S.2 conventions. Page title `My Pins`.

**Behaviour:**
- Anonymous (no `nbgaihub.gh_token` in `localStorage`): renders a `<section>` with the "Sign in to see your pins" copy + a button that dispatches `nbgaihub:open-signin`.
- Authenticated: an inline `<script type="module">` calls:
  1. `auth.readToken()` → `{token, user}`.
  2. `gist.findOrCreateFavoritesGist(token)` → `{gistId, document}`.
  3. For each `FavoriteType` in `DISPLAY_ORDER`: `pin-store.fetchPinIndex(type)`, then `joinFavoritesWithIndex(document.favourites, index, type)`.
  4. Renders one `<section data-pin-type="X">` per type, each populated by a `<ul>` of resolved entries; stale entries render with `class="pin--stale"` and an unpin button.

**Privacy callout footer** (F-P21 verbatim): rendered server-side inside the page shell.

#### P.4.12 `site/src/pages/submit-skill.astro`

Anonymous-accessible (per F-P12). Multi-section `<form id="submit-skill-form">` with:
- Inputs for all 17 frontmatter fields (Designer-final layout per plan §9 item 7).
- `<textarea id="body">` for markdown body.
- Live slug preview `<output id="slug-preview">` driven by `deriveSlugFromTitle()`.
- Inline validation: every input has a sibling `<p class="field-error" aria-live="polite">` populated from `validateSkillForm()`.
- `<button id="submit-skill-button" disabled>` enabled only when `validateSkillForm()` returns `[]` and `checkSlugCollision()` returned `'free'` or `'unknown'`.

**Submit handler:**
```
const issues = validateSkillForm(form);
if (issues.length > 0) { render issues; return; }
const collision = await checkSlugCollision(form.skill_id);
if (collision.status === 'collision') { show "exists" error; return; }
const md = serializeSkillToMarkdown(form);
const { url, fitsInUrl } = buildEditorUrl(form.skill_id, md);
if (fitsInUrl) {
  window.open(url, '_blank', 'noopener');           // A24 — new tab
} else {
  try { await copyToClipboard(md); show toast 'Copied'; }
  catch { reveal the read-only <textarea> + manual "Copy" button; }
  const bareUrl = buildEditorUrl(form.skill_id, '').url;  // no value=
  window.open(bareUrl, '_blank', 'noopener');
}
```

**Privacy callout** (different wording from `/my-pins/` per DoD #19): rendered above the form. Designer-final copy.

#### P.4.13 `site/scripts/build-pin-index.ts`

```ts
import { getCollection } from 'astro:content';   // requires `astro sync` first; chained in package.json

export interface BuildPinIndexOptions {
  outDir?: string;                   // default 'site/public/_data'
}

/** Reads the 5 collections, emits site/public/_data/<type>-index.json. Throws ConfigNotFoundError if outDir resolves to a non-writable path. */
export async function buildPinIndex(opts?: BuildPinIndexOptions): Promise<void>;

// CLI entry point (top of file):
//   if (import.meta.url === `file://${process.argv[1]}`) buildPinIndex().catch(err => { console.error(err); process.exit(1); });
```

**Emitted file shape:** `PinIndexFile` from P.4.6 — `{ schema_version: 1, items: PinIndexEntry[] }`. **Designer decision (plan §9 item 3):** the minimal shape `{slug, title, audience, topics}` is chosen — richer fields (`internal`, `external_link`, `last_reviewed`) are NOT included in the index, because `/my-pins/` only needs them for card rendering and the card style (Designer-final at plan Step 13) does not surface them. If a future phase needs more, the schema bump is `schema_version: 2`.

#### P.4.14 `pipeline/src/validators/skill.ts`

```ts
import type { SkillFrontmatter } from '../types.js';   // OR a new types-validator.ts; Designer keeps it local to validators/

export interface ValidationIssue {
  filePath: string;                  // populated by validateSkillFile; absent in validateSkillFrontmatter
  field: string;                     // e.g. 'install_command', 'skill_id', 'maintainer'
  rule: string;                      // e.g. 'install_command/prefix', 'enum/category', 'required'
  message: string;
  line?: number;                     // for GH Actions annotation (1 for frontmatter-level)
  severity: 'error' | 'warning';
}

export type ValidationResult =
  | { ok: true; value: SkillFrontmatter; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

export interface MaintainersConfig {
  team_aliases: string[];
}

/** Pure (no IO except optional external_link HEAD). Accepts already-parsed frontmatter. */
export function validateSkillFrontmatter(
  parsed: unknown,
  maintainers: MaintainersConfig,
  options?: { checkExternalLink?: boolean; fetch?: typeof fetch },
): Promise<ValidationResult>;

/** Reads file, parses with gray-matter, calls validateSkillFrontmatter. Also enforces the path-vs-skill_id rule. */
export function validateSkillFile(
  filePath: string,
  content: string,
  maintainers: MaintainersConfig,
  options?: { checkExternalLink?: boolean; fetch?: typeof fetch },
): Promise<ValidationResult>;

export const INSTALL_COMMAND_PREFIXES: readonly string[] = [
  '/plugin marketplace add ',
  '/plugin install ',
];

export const SKILL_ID_REGEX = /^[a-z0-9-]+$/;
export const GITHUB_HANDLE_REGEX = /^@[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
```

**DI seam:** `fetch` is injectable via the `options` parameter so unit tests stub the `external_link` HEAD without intercepting `globalThis.fetch`. Pipeline convention (codebase scan note 7 of §3) is to accept the dependency explicitly when feasible.

#### P.4.15 `pipeline/src/validators/config.ts`

```ts
import type { MaintainersConfig } from './skill.js';

/** Reads config/maintainers.json from the path relative to repo root. Throws ConfigNotFoundError if absent. */
export function loadMaintainers(configPath?: string): MaintainersConfig;

export class ConfigNotFoundError extends Error { name: 'ConfigNotFoundError' }
export class ConfigSchemaError extends Error { name: 'ConfigSchemaError' }
```

#### P.4.16 `pipeline/src/validators/cli.ts`

```ts
/** Entry point. Reads file paths from argv, validates each, prints ::error annotations, exits 0/1. */
export function main(argv: string[]): Promise<number>;

/** Pure: formats a ValidationIssue as a GitHub Actions annotation. */
export function formatAnnotation(issue: ValidationIssue): string;
//   → '::error file=skills/bad.md,line=1::install_command: must start with /plugin marketplace add or /plugin install'
```

### P.5 Data models

#### P.5.1 `FavoritesDocument` (gist file)

```jsonc
{
  "schema_version": 1,
  "favourites": [
    { "type": "skill", "slug": "create-api", "pinned_at": "2026-05-18" },
    { "type": "tip", "slug": "esc-esc", "pinned_at": "2026-05-18" }
  ]
}
```

- `schema_version` literal `1`. Absent on legacy reads → treated as `1` with a one-time `console.warn` (AC22).
- `favourites` is an array deduped by `(type, slug)`. Insertion order; new pins append.
- `type` is one of the 5 collection literals. `slug` is the URL slug used by the site routes. `pinned_at` is `YYYY-MM-DD`.

#### P.5.2 `PinIndexFile` (build artifact)

```jsonc
{
  "schema_version": 1,
  "items": [
    { "slug": "create-api", "title": "Create API", "audience": "beginner", "topics": ["api", "backend"] }
  ]
}
```

One file per `FavoriteType` under `site/public/_data/<type>-index.json` → `site/dist/_data/<type>-index.json` after build. `schema_version` bumps if the shape changes.

#### P.5.3 `SkillFrontmatter` (extended; 17 fields)

See P.4.5 for the TypeScript shape. The frontmatter is what lands in `skills/<slug>.md`.

#### P.5.4 `SkillForm` and canonical YAML key order

The YAML frontmatter block written by `serializeSkillToMarkdown()` uses the following **stable canonical key order** (Designer-final per plan §9 item 4):

```
type
title
audience
topics
internal
authored
last_reviewed
external_link
deeper_link
ai_summary
install_command
skill_id
origin
category
status
maintainer
requires
```

The 10 base-shape keys come first (matching `baseShape('skill')` declaration order in `content.config.ts`), then the 7 new keys in the order they're added to the schema. **Rationale:** deterministic ordering means PR diffs are clean across submissions, and CI validator output references stable line offsets. `requires` is omitted entirely when absent (not `requires: []`) to keep diffs minimal.

#### P.5.5 `ValidationIssue` (validator output)

See P.4.14 for the shape. The CLI prints each issue as one `::error file=<path>,line=<n>::<field>: <rule violated>` line. Multiple issues → multiple lines. `warnings` (e.g., `external_link` 429) print as `::warning file=...` and do not fail the build.

#### P.5.6 Extended Zod schema for `skills` collection

```ts
// site/src/content.config.ts — replaces lines 88-91 of the current file.
const skills = defineCollection({
  loader: glob({ pattern: '*.md', base: '../skills' }),
  schema: z.object({
    ...baseShape('skill'),
    install_command: z
      .string()
      .refine(
        (cmd) => cmd.startsWith('/plugin marketplace add ') || cmd.startsWith('/plugin install '),
        { message: 'install_command must start with `/plugin marketplace add ` or `/plugin install `' },
      ),
    skill_id: z
      .string()
      .regex(/^[a-z0-9-]+$/, { message: 'skill_id must match /^[a-z0-9-]+$/' }),
    origin: z.enum(['internal', 'community', 'external']),
    category: z.enum(['workflow', 'code', 'docs', 'integration', 'productivity', 'testing', 'other']),
    status: z.enum(['active', 'experimental', 'deprecated']),
    maintainer: z.string().min(1),            // CI validator enforces handle-or-allowlist; site does shape-only
    requires: z.array(z.string()).optional(), // free-text per A11; `undefined` when absent (NOT `[]`)
  }),
});
```

**Notes for the Coder:**
- Spread `...baseShape('skill')` first — must remain the canonical 10-key prefix.
- `astro check` must remain green against the empty `skills/` directory (PR-2: there are no files to validate yet).
- The `.refine()` message text is load-bearing for AC13; do not paraphrase.
- The regex literal must be the same regex string as in `INSTALL_COMMAND_PREFIXES` / `SKILL_ID_REGEX` in `pipeline/src/validators/skill.ts` — both sides enforce identical rules.

#### P.5.7 `MaintainersConfig`

```jsonc
// config/maintainers.json
{
  "team_aliases": ["@nbg-ai-team"]
}
```

`team_aliases` is a string array of allowlisted aliases (at least one initial entry seeded per AC27). The validator accepts `maintainer` if it matches `GITHUB_HANDLE_REGEX` OR appears verbatim in `team_aliases`.

#### P.5.8 No new database tables

This phase introduces zero database tables — all persistence is `localStorage` + the user's gist + the static build artifact. The **singular-naming** rule (global CLAUDE.md) is therefore vacuously satisfied for this phase. Asserted here for the record.

### P.6 Error handling strategy

#### P.6.1 Custom error classes

All new error classes follow the pipeline precedent (codebase scan §3.8): named `XxxError`, extending `Error`, setting `this.name` in the constructor. **No shared base class.** Flat per-module hierarchy (Designer's resolution of plan §9 item 1) — a shared `NbgAiHubError` would couple modules unnecessarily; current pipeline practice (`MissingEnvVarError`, `FeedFetchError`, `ConfigSchemaError`, etc.) is flat and we mirror it.

| Class | Module | Thrown when | UI surface |
|---|---|---|---|
| `NetworkError` | `api-fetch.ts` | `fetch()` rejects or response unparsable. | Toast: "Network error — try again." |
| `NotFoundError` | `api-fetch.ts` | Any 404 from `api.github.com`. | Caller-specific (e.g. gist 404 → re-discover). |
| `RateLimitedError` | `api-fetch.ts` | 403 with rate-limit headers, or 429. | Toast: "Rate-limited — try again in a few minutes." (OQ3) |
| `GitHubApiError` | `api-fetch.ts` | Other non-2xx from `api.github.com`. | Toast with the GitHub-provided message. |
| `TokenInvalidError` | `auth.ts` | 401 during `validateToken`. | Inline error in `SignInModal` ("Invalid or expired token"). |
| `TokenRevokedError` | `auth.ts` | A previously-valid token returns 401 from a downstream call. | Caller (`gist.ts` / `PinButton`) catches → calls `auth.clearToken()` → toast "Your token was revoked — please sign in again." (OQ4) |
| `GistNotFoundError` | `gist.ts` | 404 on cached `nbgaihub.gist_id`. | Internal: triggers re-discovery; no UI surface unless re-discovery also fails. |
| `GistSchemaError` | `gist.ts` | Parsed gist content doesn't conform to `FavoritesDocument`. | Toast "Your favourites file is corrupt — open the gist at github.com to inspect." Do NOT auto-overwrite. |
| `GistWriteConflictError` | `gist.ts` | Reserved for future use (ETag). Not thrown in MVP. | n/a |
| `ClipboardUnavailableError` | `submission.ts` | `navigator.clipboard.writeText` rejects (permission, insecure context). | Falls back to the read-only `<textarea>` + manual Copy button (A5). |
| `SubmissionUrlTooLongError` | `submission.ts` | Optional surface — never thrown in MVP (the caller branches on `fitsInUrl`). | n/a |
| `PinIndexNotFoundError` | `pin-store.ts` | `fetch('/_data/<type>-index.json')` returns 404. | Toast "Pin index missing — rebuild the site." (Build-time bug, never user-facing under normal operation.) |
| `PinIndexSchemaError` | `pin-store.ts` | Index file parses but doesn't match `PinIndexFile`. | Same as above. |
| `ConfigNotFoundError` | `pipeline/src/validators/config.ts` | `config/maintainers.json` missing at validator runtime. | CLI prints the error to stderr, exits 1. No fallback (NF-P2). |
| `ConfigSchemaError` | `pipeline/src/validators/config.ts` | `maintainers.json` parses but doesn't match `MaintainersConfig`. | Same as above. |

#### P.6.2 No-fallback rule for configuration

Per global CLAUDE.md: **never substitute defaults silently.**

- **Validator** loads `config/maintainers.json` once at process start; absent file → `ConfigNotFoundError`. The validator does NOT proceed with an empty allowlist.
- **Site build** does NOT require any environment variables (the PAT-paste architecture has no `client_id`). The hardcoded `chomovazuzana/NbgAiHub` repo path in `submission.ts` is acceptable as a constant for MVP, per refined-request NF-P2.
- **`build-pin-index.ts`** does NOT default `outDir`; the caller passes it explicitly (or omits to use the documented default — but the script asserts the directory is writable and throws on failure).

**Required env vars for this phase: NONE.** (If a future phase promotes `REPO_OWNER`, `REPO_NAME`, `DEFAULT_BRANCH` to `import.meta.env.PUBLIC_*` variables, the no-fallback rule will require an explicit build-time check that throws `MissingConfigError` if absent.)

#### P.6.3 Global 401 detection

`api-fetch.ts` wraps every `api.github.com` call. On any 401 from a *post-validation* call (i.e. the user is supposedly signed in), `apiFetch` throws `TokenInvalidError`. The caller's `catch` (typically `PinButton.astro`'s click handler) clears auth state via `auth.clearToken()` and dispatches the toast (OQ4). This is the global revocation detector.

### P.7 Configuration model

#### P.7.1 Required configuration files

| File | Required by | Behaviour on absence |
|---|---|---|
| `config/maintainers.json` | CI validator (Wave B / B5) | `ConfigNotFoundError` thrown by `loadMaintainers()`. Validator exits 1. CI workflow goes red. |
| `site/public/_data/<type>-index.json` | `/my-pins/` page client script | `PinIndexNotFoundError`. Surfaces a toast. Indicates a broken build, not a user problem. |
| `pipeline/.nvmrc` (existing) | CI validator workflow | n/a — already exists per codebase scan. |

#### P.7.2 Build-time environment variables (this phase)

**None.** The PAT-paste architecture eliminates the need for `PUBLIC_GH_CLIENT_ID` that the original spec envisioned. Hardcoded constants live in `submission.ts` (P.4.4).

**Future-proofing note:** if `REPO_OWNER`/`REPO_NAME` are promoted to env vars in a later phase (e.g., when the project transfers to a team org), the Coder must:
1. Read via `import.meta.env.PUBLIC_REPO_OWNER` / `import.meta.env.PUBLIC_REPO_NAME`.
2. Throw a named `MissingConfigError` at module init time if either is unset — **not at first use** and **not with a fallback**.
3. Register the var in `site/README.md`.

#### P.7.3 CI workflow configuration

`.github/workflows/validate-skill-submission.yml`:

```
trigger:        pull_request
                  types: [opened, synchronize, reopened]
                  paths: ['skills/**/*.md']
permissions:    contents: read           # nothing else
secrets:        (none beyond default GITHUB_TOKEN)
runner:         ubuntu-latest
node:           via pipeline/.nvmrc (Node 22)
working dir:    pipeline/
steps:          checkout (fetch-depth: 0)
                setup-node
                npm ci
                npm run build
                compute changed files via git diff
                node dist/validators/cli.js <files...>
```

`pull_request` (NOT `pull_request_target`) per R7 — fork-PR safety.

#### P.7.4 Maintainers allowlist format

```jsonc
{ "team_aliases": ["@nbg-ai-team", "@hub-editors"] }
```

- `team_aliases` is required, must be a string array, at least one entry. Empty array → `ConfigSchemaError`.
- Entries are matched verbatim against the `maintainer` frontmatter value.
- File is checked into the repo (not a secret).

### P.8 Integration points

#### P.8.1 Browser ↔ `api.github.com`

All calls go through `apiFetch` (P.4.1). Hostname assertion in `apiFetch` guarantees AC23.

| Endpoint | Method | Auth | Body | Expected status | Retry policy |
|---|---|---|---|---|---|
| `/user` | GET | `Authorization: token <pat>` | — | 200 → valid; 401 → invalid | None (UX-driven retry: user re-pastes) |
| `/gists` | GET | yes | — | 200 (paginated) | None |
| `/gists` | POST | yes | `{public:false, description, files:{"nbgaihub-favorites.json":{content}}}` | 201 | None |
| `/gists/<id>` | GET | yes | — | 200; 404 → `GistNotFoundError` → rediscover | None |
| `/gists/<id>` | PATCH | yes | `{files:{"nbgaihub-favorites.json":{content}}}` | 200; 422 → `GistSchemaError` | None |
| `/repos/chomovazuzana/NbgAiHub/contents/skills/<slug>.md` | GET | no | — | 200 → collision; 404 → free; 403/429 → unknown | None (non-blocking) |

**Content-Type:** `application/vnd.github+json` (set by `apiFetch` `acceptJson: true` default).

**Pagination:** `findOrCreateFavoritesGist` handles `Link: rel="next"` by iterating until exhausted or until a match is found. First match wins (OQ2).

**Rate-limit signals:** 403 with `X-RateLimit-Remaining: 0` OR 429 → `RateLimitedError` (with `retryAfterSeconds` populated from `Retry-After` when present).

#### P.8.2 Browser ↔ `localStorage`

**Key namespace:** `nbgaihub.*` (matches existing `nbgaihub.audience` precedent).

| Key | Owner module | Shape |
|---|---|---|
| `nbgaihub.gh_token` | `auth.ts` | `string` (the raw PAT) |
| `nbgaihub.gh_user` | `auth.ts` | JSON-stringified `GitHubUser` (`{login: string}`) |
| `nbgaihub.gist_id` | `gist.ts` (set), `auth.ts` (cleared on sign-out) | `string` (32-char hex gist id) |
| `nbgaihub.audience` | `AudienceFilter.astro` (existing; untouched) | `string[]` JSON |

**Strict containment:** `localStorage.getItem` / `setItem` are called ONLY in `auth.ts`, `gist.ts`, and `pin-store.ts`. No other module reads or writes `localStorage` directly. Components consume state via `auth.subscribe()`.

**Cross-tab sync:** `auth.ts` listens to `window.addEventListener('storage', ...)` and re-fires `subscribe` callbacks when a sibling tab signs in/out.

#### P.8.3 Browser ↔ `github.com` new-file URL

```
https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=<encodeURIComponent(markdown)>
```

- `<slug>` = `deriveSlugFromTitle(form.title)` = `slugify(form.title)`. **Must equal** `form.skill_id` (the CI validator enforces this).
- `<markdown>` = `serializeSkillToMarkdown(form)`.
- Encoding: `encodeURIComponent` for both query param values.
- Length cutoff: 7000 chars total URL length. Above → clipboard fallback (P.4.4 / AC12).
- Navigation: `window.open(url, '_blank', 'noopener')` per A24.

#### P.8.4 Build script ↔ Astro build pipeline

`scripts/build-pin-index.ts` runs **before** `astro check` and `astro build` via `site/package.json` `scripts.build`:

```jsonc
{
  "scripts": {
    "build": "tsx scripts/build-pin-index.ts && astro check && astro build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Rationale (plan §9 item 3 + investigation R6 secondary):** standalone script over Astro integration hook chosen for surface-area minimisation. The script reads via `getCollection()` which requires `astro sync` to have run; `astro check` triggers `astro sync` as a side effect, so chaining works. **If the order causes `getCollection` to read stale types**, the Coder swaps to invoking `astro sync` explicitly first: `astro sync && tsx scripts/build-pin-index.ts && astro check && astro build`.

#### P.8.5 CI workflow ↔ `pull_request` event

- Trigger: `on: pull_request: types: [opened, synchronize, reopened] paths: ['skills/**/*.md']`.
- Default `GITHUB_TOKEN` permissions: `contents: read` only.
- Workflow runs in the fork's security context per R7. No repo secrets, no write access — token alteration in a malicious fork PR cannot leak anything.
- Annotations posted via `::error file=...,line=...::...` stdout commands. GitHub's runner picks them up and surfaces in the Files Changed tab.

### P.9 Parallel implementation unit assignments

Translation of plan Wave B + Wave C to Coder units. Each unit is **sole writer** of the files listed. Cross-unit dependencies are on *exported contracts* (already specified above), not file content, so contracts are sufficient for compile-time integration.

#### Wave A — Foundations (single Coder or any subset in parallel; trivial files)

| Unit | Files owned | Plan step(s) | Depends on |
|---|---|---|---|
| **P-A0** | `site/src/content.config.ts` | Step 1 | none |
| **P-A1** | `site/package.json`, `site/vitest.config.ts`, `site/tests/.gitkeep` | Step 3 | none |
| **P-A2** | `config/maintainers.json` | Step 2 | none |
| **P-A3** | `site/src/lib/slug.ts`, `site/tests/slug.test.ts` | Step 4 | P-A1 (vitest) |

**Barrier α** (Wave A complete): the schema, the vitest harness, the maintainers config, and `slug.ts` all in main.

#### Wave B — Core libraries (5 parallel units)

| Unit | Files owned (sole writer) | Plan step(s) | Depends on (contracts) |
|---|---|---|---|
| **P-B1** | `site/scripts/build-pin-index.ts`, `site/tests/build-pin-index.test.ts` + `site/package.json` *build* script update | Step 5 | P-A0 (schema), P-A1 (vitest, tsx) — **edits `package.json` again**; serialise with P-A1 if both run together. **Resolution:** P-A1 lands `vitest` + `test` script; P-B1 *amends* `package.json` to update `build`. Coordinate in one commit if both done by same coder. |
| **P-B2** | `site/src/lib/auth.ts`, `site/src/lib/api-fetch.ts`, `site/tests/auth.test.ts`, `site/tests/api-fetch.test.ts` | Step 6 | P-A1 |
| **P-B3** | `site/src/lib/gist.ts`, `site/tests/gist.test.ts` | Step 7 | P-A1, **P-B2** (auth.ts + api-fetch.ts contracts) |
| **P-B4** | `site/src/lib/submission.ts`, `site/src/lib/skill-types.ts`, `site/tests/submission.test.ts` | Step 8 | P-A1, P-A3 (slug.ts) |
| **P-B5** | `pipeline/src/validators/skill.ts`, `pipeline/src/validators/cli.ts`, `pipeline/src/validators/config.ts`, `pipeline/tests/validators/skill.test.ts`, `pipeline/tests/validators/fixtures/*.md` | Step 9 | P-A2 (maintainers.json) |

**Critical path inside Wave B:** P-B2 → P-B3 (gist.ts imports `auth.ts` and `api-fetch.ts`). The other three can start in parallel.

**Barrier β** (Wave B complete): all `site/src/lib/*.ts` modules typecheck and pass their unit tests; the validator passes its suite; `dist/_data/<type>-index.json` builds cleanly.

#### Wave C — UI + page wiring (4 effective parallel units)

| Unit | Files owned (sole writer) | Plan step(s) | Depends on |
|---|---|---|---|
| **P-C1 (exclusive lock)** | `site/astro.config.mjs`, `site/src/components/SocialIconsOverride.astro`, `site/src/components/SignInModal.astro` | Steps 10 + sidebar bits of Step 14 | P-B2 (auth.ts), `site/src/lib/pin-store.ts` only for toast wiring imports |
| **P-C2** | `site/src/components/PinButton.astro` | Step 11 | P-B2, P-B3 |
| **P-C3** | `site/src/components/NewsPanel.astro`, `NewsList.astro`, `SkillCard.astro`; `site/src/pages/tips.astro`, `glossary.astro`, `news/[slug].astro` | Step 12 | **P-C2** (`<PinButton />` must exist) |
| **P-C4** | `site/src/pages/my-pins.astro`, `site/src/lib/pin-store.ts`, `site/tests/pin-store.test.ts` | Step 13 | P-B1 (build-time index), P-B2, P-B3 |
| **P-C5** | `site/src/pages/submit-skill.astro` (page body only — NOT the sidebar wiring, which is P-C1) | Step 14 page-body | P-A0, P-B4 |
| **P-C6** | `.github/workflows/validate-skill-submission.yml` | Step 15 | P-B5 (validator must build) |

**Critical path inside Wave C:** P-C2 → P-C3 (the embed step waits on the button file). All others can run after their B dependencies. **P-C1 owns ALL `astro.config.mjs` edits** for Wave C — no other unit touches that file (resolves the plan §4 file-coordination concern).

**Barrier γ** (Wave C complete): `cd site && npm run build` exits 0; `dist/my-pins/index.html` and `dist/submit-skill/index.html` exist; pin buttons render in all targeted cards; sign-in flow integrates end-to-end.

#### Wave D — Docs (7 parallel units, plan Steps 16–22)

Each plan step owns a distinct doc file. No design-level coordination needed; the contracts above are sufficient input for each doc writer.

#### Wave E — Integration verification (single Coder, plan Step 23)

Terminal. Produces `docs/reference/integration-verification-personalization.md` with the AC1..AC31 evidence matrix.

#### Unit dependency DAG (terse)

```
P-A0, P-A1, P-A2 (parallel)
  └─ P-A3 ← P-A1
       └─ Barrier α
            ├─ P-B1 ← P-A0, P-A1
            ├─ P-B2 ← P-A1
            │    └─ P-B3 ← P-B2
            ├─ P-B4 ← P-A1, P-A3
            └─ P-B5 ← P-A2
                 └─ Barrier β
                      ├─ P-C1 ← P-B2
                      ├─ P-C2 ← P-B2, P-B3
                      │    └─ P-C3 ← P-C2
                      ├─ P-C4 ← P-B1, P-B2, P-B3
                      ├─ P-C5 ← P-A0, P-B4
                      └─ P-C6 ← P-B5
                           └─ Barrier γ
                                └─ Wave D (7 parallel)
                                     └─ Wave E (Step 23)
```

#### File-ownership invariant

For every file listed under "Files owned" in P.9, exactly one Coder writes it. Any cross-unit need touches only **exported symbols** (types, function signatures, error classes) from this document — never another unit's file content. If a Coder finds a need to edit a file outside their unit, they STOP and escalate to the orchestrator. This invariant is the load-bearing parallelism guarantee.

### P.10 Naming conventions (reiterated, not redesigned)

- **File names:** kebab-case for `.ts`, `.css`, `.md`, `.json` (`auth.ts`, `pin-store.ts`, `maintainers.json`). PascalCase for `.astro` components (`PinButton.astro`, `SignInModal.astro`, `SocialIconsOverride.astro`).
- **Type / interface names:** PascalCase (`FavoritesDocument`, `SkillForm`, `ValidationIssue`).
- **Function / variable names:** camelCase (`validateToken`, `findOrCreateFavoritesGist`, `slugify`).
- **Custom error classes:** `XxxError` suffix; flat hierarchy, each `extends Error` and sets `this.name` in the constructor (per pipeline precedent).
- **localStorage keys:** `nbgaihub.<field>` (matches `nbgaihub.audience` precedent).
- **CSS class names:** kebab-case with BEM-light modifiers (`pin-button`, `pin-button--pinned`, `pin-button--busy`, `auth-chip`, `signin-trigger`).
- **Custom DOM events:** `nbgaihub:<verb>-<noun>` (`nbgaihub:open-signin`, `nbgaihub:toast`).
- **Public env-var prefix:** `PUBLIC_*` per Astro convention (none used in this phase; reserved for future).
- **No `index.ts` aggregators** — every import is explicit per pipeline convention (codebase scan §3.2).

### P.11 Cross-cutting design rules

1. **TypeScript strict + `noUncheckedIndexedAccess`** in both workspaces. All new code conforms.
2. **ESM only** (matches existing site + pipeline). Pipeline imports use `.js` extensions (`from './types.js'`); site imports do not (`from './types'`). New modules follow each workspace's existing convention.
3. **No fallback configuration values.** See P.6.2.
4. **Centralised network access.** All client-side calls to `api.github.com` go through `apiFetch` from `api-fetch.ts`. No raw `fetch('https://api.github.com/...')` anywhere else. Hostname assertion in `apiFetch` is the AC23 guard.
5. **Centralised `localStorage` access.** Only `auth.ts`, `gist.ts`, and `pin-store.ts` touch `localStorage` for new keys; existing `AudienceFilter.astro` retains its own access for `nbgaihub.audience`. No scattered `localStorage.getItem`/`setItem` in components.
6. **Centralised YAML serialisation.** `submission.ts` reuses the `yaml` npm package version already present in `pipeline/`. Add `yaml@<same-major>` to `site/package.json` `devDependencies` for client-side use. **Do NOT bring in a second YAML library.**
7. **No client framework islands.** All client behaviour is vanilla `<script is:inline>` or `<script type="module">` in `.astro` components, mirroring `AudienceFilter.astro`. No `@astrojs/react` / vue / svelte / preact.
8. **No new direct dependencies that emit deprecation warnings** (NF-P13). Validator dependencies (`gray-matter`, `yaml`) are already in `pipeline/`. Site additions: `vitest`, `tsx`, `yaml` — all current.
9. **No version-control side effects** from site or pipeline runtime code (NF-P8). The validator workflow READS the PR diff, never writes.
10. **CSP-friendly client code.** Per A7, `connect-src 'self' https://api.github.com`. Inline scripts use `is:inline`; no eval; no third-party origins for scripts, styles, or fonts. Designer-final CSP `<meta http-equiv>` placement (plan §9 item 14): inside the Starlight layout's `<head>` slot via a small `site/src/components/CspMeta.astro` component referenced from `astro.config.mjs` `head:` config — alternatively, the meta tag is injected via Starlight's `head` config option directly in `astro.config.mjs` (Coder picks whichever is shorter; both achieve identical output).
11. **No third-party scripts on the site.** Reaffirmed for this phase. The toast container, modal, pin buttons are all hand-rolled in `.astro`.

### P.12 Verification checklist (design-level)

Reverse-mapping each plan step to its design anchor (Coder picks up step N → reads design anchor M):

| Plan step | Design anchor | Coder hand-off complete? |
|---|---|---|
| Step 1 (extend schema) | P.5.6 | YES — full Zod schema written |
| Step 2 (maintainers.json) | P.5.7 | YES — shape + seed example |
| Step 3 (vitest in site) | P.4.x test signatures + P.11 #6 (`yaml` add) | YES |
| Step 4 (slug.ts duplicate) | P.4.7 | YES |
| Step 5 (build-pin-index) | P.4.13 + P.5.2 + P.8.4 | YES — signature, output shape, invocation chain |
| Step 6 (auth.ts) | P.4.2 + P.6.1 (errors) + P.8.2 (localStorage) | YES |
| Step 7 (gist.ts) | P.4.3 + P.5.1 + P.6.1 + P.8.1 | YES |
| Step 8 (submission.ts) | P.4.4 + P.4.5 + P.5.4 + P.8.3 | YES |
| Step 9 (validator) | P.4.14 + P.4.15 + P.4.16 + P.5.5 + P.6.1 + P.6.2 | YES |
| Step 10 (sign-in + override) | P.4.9 + P.4.10 + P.9 (P-C1) | YES |
| Step 11 (PinButton) | P.4.8 + P.6.1 (toast surface) | YES |
| Step 12 (embed buttons) | P.2.2 (modified files table) + P.9 (P-C3) | YES |
| Step 13 (/my-pins/) | P.4.6 + P.4.11 + P.5.2 | YES |
| Step 14 (/submit-skill/) | P.4.4 + P.4.5 + P.4.12 + P.5.4 + P.9 (P-C5 + P-C1 split) | YES |
| Step 15 (CI workflow) | P.7.3 + P.8.5 | YES |
| Steps 16–22 (docs) | P.9 Wave D (contracts above are inputs) | YES |
| Step 23 (verification) | All ACs map to a design anchor — see below | YES |

**AC-level evidence anchors:**

| AC | Design anchor backing the AC |
|---|---|
| AC1 (PAT sign-in end-to-end) | P.4.2 + P.4.10 |
| AC2 (token persistence) | P.4.2 `readToken` + P.8.2 |
| AC3 (sign-out clears all keys) | P.4.2 `clearToken` + P.8.2 |
| AC4 (anonymous unchanged) | P.4.8 signed-out branch + P.4.11 anon panel + P.4.12 anon access |
| AC5 (first pin creates gist) | P.4.3 `findOrCreateFavoritesGist` |
| AC6 (RMW on subsequent pin) | P.4.3 `addFavorite` |
| AC7 (unpin via RMW) | P.4.3 `removeFavorite` |
| AC8 (/my-pins/ renders) | P.4.11 + P.4.6 |
| AC9 (/my-pins/ anon) | P.4.11 anonymous branch |
| AC10 (stale references) | P.4.6 `joinFavoritesWithIndex` returning `resolved: null` |
| AC11 (submission happy path) | P.4.12 + P.8.3 |
| AC12 (URL-length fallback) | P.4.4 `buildEditorUrl.fitsInUrl` + P.4.12 submit handler |
| AC13 (install_command invalid) | P.4.4 `validateSkillForm` + P.5.4 (rule wording in P.5.6) |
| AC14 (skill_id invalid) | P.4.4 + P.5.6 |
| AC15 (slug collision) | P.4.4 `checkSlugCollision` |
| AC16–AC20 (CI validator) | P.4.14 + P.4.15 + P.4.16 + P.7.3 |
| AC21 (gist JSON shape) | P.5.1 + P.4.3 `serializeFavoritesDocument` |
| AC22 (schema_version tolerance) | P.4.3 `parseFavoritesDocument` (treats absent as 1, warns once) |
| AC23 (token only to api.github.com) | P.4.1 hostname assertion |
| AC24 (SCOPE.md updated) | plan Step 19 (no design contract; doc edit) |
| AC25 (DECISIONS.md appended) | plan Step 20 |
| AC26 (schema 7 new fields) | P.5.6 |
| AC27 (maintainers.json) | P.5.7 |
| AC28 (gist-contract.md) | plan Step 16 + P.5.1 |
| AC29 (project-design.md) | THIS section |
| AC30 (project-functions.md) | plan Step 18 |
| AC31 (no VCS side effects) | P.11 #9 + workflow rule |

**Result:** every plan step has a design anchor; every AC has a backing design contract or an explicit doc-only step. A Coder can pick up any unit P-A0..P-C6 and execute given only this design + the plan.

### P.13 Implementation notes (post-build)

The Option C personalization + contributions architecture documented in §P.0–§P.12 above shipped across three commits in Wave A–C of plan-003-personalization:

| Wave | Commit | Scope |
|---|---|---|
| A — Foundations | `c1df291` | Vitest setup in `site/`, `slug.ts` duplicate from `pipeline/src/slug.ts`, `config/maintainers.json`, schema extension for the 7 new skill fields (`install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`, `requires`). |
| B — Core libs | `5a08260` | `site/src/lib/auth.ts`, `site/src/lib/gist.ts`, `site/src/lib/submission.ts`, `site/src/lib/pin-store.ts`, `site/scripts/build-pin-index.ts`, `pipeline/src/validators/{skill,cli,config}.ts`. |
| C — UI + workflow | `64f83b2` | `SignIn.astro` (Starlight `SocialIcons` slot override), `PinButton.astro` embedded across content cards, `/my-pins/` page, `/submit-skill/` page with URL-redirect + clipboard fallback, `.github/workflows/validate-skill-submission.yml`. |

**Test counts at hand-off:**

- `site/` — **127 tests** pass (Vitest 4.x). Covers `auth.ts` (token validate + storage), `gist.ts` (RMW + dedup + schema-version tolerance), `submission.ts` (serialiser + URL builder + 7000-char gate + slug pre-check), `pin-store.ts` (join with `<type>-index.json`), `slug.ts` (drift-test against pipeline copy).
- `pipeline/` — **112 tests** pass (was 93 before Wave B). +19 tests cover the new validator suite (`pipeline/tests/validators/skill.test.ts`: 11 tests) plus extras for the CLI entry point and config loader.

**Key files shipped:**

- Web: `site/src/lib/{auth,gist,submission,pin-store,slug}.ts`, `site/src/components/{SignIn,PinButton}.astro`, `site/src/pages/{my-pins,submit-skill}.astro`, `site/scripts/build-pin-index.ts`, `site/public/_data/<type>-index.json` (5 files, emitted by build script).
- Pipeline: `pipeline/src/validators/{skill,cli,config}.ts`, `pipeline/tests/validators/skill.test.ts`.
- Config: `config/maintainers.json`.
- Workflow: `.github/workflows/validate-skill-submission.yml`.
- Schema: `site/src/content.config.ts` skills collection layered the 7 new fields.

**Deviations from design.** None of structural import. Minor:

- `slug.ts` is a literal copy of `pipeline/src/slug.ts` rather than a shared package (carried over from astro-starlight-site A4); drift-tested by both workspaces. Tracked as a follow-up in `Issues - Pending Items.md` for a future monorepo cleanup.
- The `SocialIcons` slot override is the chosen wiring point (P.4.10); a Header override was considered and rejected as fragile against Starlight upgrades.

---

*End of Personalization architecture section.*

---

## H. Hub plugin (plan-003-hub-plugin)

The `plugin/` workspace is the third sibling to `pipeline/` and `site/`. It packages the NbgAiHub knowledge hub as a Claude Code marketplace plugin (`nbg-ai-hub`) installable via `/plugin marketplace add chomovazuzana/NbgAiHub` and exposing eleven `/hub-*` slash commands backed by compiled TypeScript scripts.

**Section prefix note:** `P.x` is taken by the Personalization architecture; this section uses **`H.x`** (Hub) for sub-sections H.1–H.13. Coders consuming this document should resolve `H.<n>` references against the headings below.

### H.0 Conflicts requiring user input

**None.** Phase 3a investigation resolved the three load-bearing unknowns (manifest paths, no `commands` array in the manifest, command-as-LLM-prompt model). Plan-003 §1 records fifteen Reconciliations (R-1 .. R-15) that are accepted as locked-in for this design.

OQ4 (by-role journey slugs), OQ5 (marketplace `schemaVersion`), OQ6 (`editor_confidence` surfacing in `/hub-news`) are deferred to follow-ups in `Issues - Pending Items.md` (plan Step 13) — none block this design.

One **flagged-but-not-changed** observation surfaced during design review:

- **Refined-request AC23 wording is obsolete** (plan R-3 already rewrote it). The plan correctly redefines AC23 as "eleven `.md` files in `plugin/commands/` whose basenames match the locked set." This design treats the rewritten AC23 as authoritative; the original "`plugin.json` declares the exact eleven commands" wording is dead-letter.

### H.1 System architecture and component diagram

The plugin has four distinct layers (manifest, LLM-prompt, script, content snapshot) plus per-user state. Each `/hub-*` invocation traverses three of them.

```text
                                ┌──────────────────────────────────────────────┐
                                │ User runs `/plugin marketplace add           │
                                │            chomovazuzana/NbgAiHub`           │
                                └─────────────────┬────────────────────────────┘
                                                  │ git clone
                                                  ▼
              ┌────────────────────────────────────────────────────────────────────┐
              │ Repo root  (= marketplace root)                                    │
              │                                                                    │
              │  .claude-plugin/marketplace.json   → { plugins: [{ source:        │
              │                                                  "./plugin" }] }  │
              │                                                                    │
              │  plugin/                            ← the plugin workspace        │
              │  ├── .claude-plugin/plugin.json     ← manifest (name only req.)   │
              │  ├── config.json                    ← productionUrl, devMode, …   │
              │  ├── commands/<11 .md>              ← LLM-prompt layer            │
              │  │     hub.md, hub-search.md, …                                   │
              │  ├── dist/<11 .mjs>                 ← compiled+bundled scripts    │
              │  │     hub-search.mjs invokes lib/* inline                        │
              │  ├── src/<11 .ts> + src/lib/<9 .ts> ← TypeScript source           │
              │  ├── snapshot/                      ← bundled markdown content   │
              │  │     glossary/  tips/  skills/                                  │
              │  │     news/published/  journeys/                                 │
              │  │     .snapshot-meta.json                                        │
              │  ├── scripts-build/build.mjs        ← esbuild driver              │
              │  ├── scripts-build/build-snapshot.mjs                             │
              │  └── tests/<18+ .test.ts>           ← Vitest 4 suites             │
              │                                                                    │
              │  glossary/  tips/  skills/  news/published/  journeys/             │
              │     ▲ source-of-truth content; snapshot/ is a build-time mirror   │
              └────────────────────────────────────────────────────────────────────┘

                                          │
                  Claude Code copies plugin/ into ~/.claude/plugins/cache/<id>/
                  Sets env: CLAUDE_PLUGIN_ROOT = <cache path>
                            CLAUDE_PLUGIN_DATA = ~/.claude/plugins/data/<id>/
                                          │
                                          ▼
                  ┌───────────────────────────────────────────────────────────┐
                  │ At runtime, per `/hub-*` invocation                       │
                  └───────────────────────────────────────────────────────────┘
```

**Runtime flow for a read-only command — `/hub-glossary mcp`:**

```text
  user types: /hub-glossary mcp
        │
        ▼
  Claude Code reads commands/hub-glossary.md
        │  ─ substitutes $ARGUMENTS → "mcp"
        │  ─ substitutes ${CLAUDE_PLUGIN_ROOT} → cache path
        │  ─ executes `!`-fenced block
        ▼
  node ${CLAUDE_PLUGIN_ROOT}/dist/hub-glossary.mjs mcp
        │
        ▼
  dist/hub-glossary.mjs (bundle of src/hub-glossary.ts + lib/*):
        │  1. lib/config.ts        loads plugin/config.json or throws
        │  2. lib/snapshot.ts      dual-lookup: prefer ${CLAUDE_PLUGIN_DATA}/snapshot/,
        │                            else ${CLAUDE_PLUGIN_ROOT}/snapshot/
        │  3. lib/state.ts         reads ${CLAUDE_PLUGIN_DATA}/state.json (audience)
        │  4. lib/frontmatter.ts   gray-matter + yaml engine
        │  5. command logic        match "mcp" → mcp.md; scan others for [mcp] refs
        │  6. lib/output.ts        format definition + related terms + freshness
        ▼
  stdout (formatted block) — script exits 0
        │
        ▼
  Claude Code inlines stdout into the rendered prompt at the `!`-block site
        │
        ▼
  LLM sees the prompt: "<frame line>\n<stdout>\n<present-verbatim instruction>"
        │
        ▼
  user sees the formatted block in the conversation
```

**Runtime flow for a side-effect command — `/hub-refresh`:**

```text
  user types: /hub-refresh
        │
        ▼
  commands/hub-refresh.md → node dist/hub-refresh.mjs
        │
        ▼
  dist/hub-refresh.mjs:
        │  1. lib/config.ts        load productionUrl, refreshUrl
        │  2. preflight            CLAUDE_PLUGIN_DATA set? else throw
        │  3. resolve              CACHE   = $DATA/snapshot-clone
        │                          STAGING = $DATA/snapshot-new
        │                          LIVE    = $DATA/snapshot
        │  4. git clone (first run) OR git fetch --depth 1 + reset --hard
        │     against CACHE                              ← user's git auth used
        │  5. build STAGING by cpSync of 5 pillars from CACHE
        │  6. write STAGING/.snapshot-meta.json
        │  7. atomic: if LIVE exists, rename LIVE → trash; rename STAGING → LIVE
        │  8. cleanup trash
        ▼
  stdout: "OK <sha> <ISO timestamp> | glossary: 5  tips: 0  skills: 0
                                       news: 8  journeys: 1"
        │
        ▼
  LLM presents the success line; future `/hub-*` commands now read from $DATA/snapshot/
```

**Failure path for `/hub-refresh`:** the `git` subprocess throws → `RefreshFailedError` → entry script writes the error to stderr, prints `ERROR <reason>` to stdout, exits 1. The LIVE snapshot is untouched (STAGING was never renamed in).

### H.2 File/module structure

All paths relative to `plugin/`. **`src/**/*.ts` files use the canonical Node-ESM `.js`-extension import convention** (matching `pipeline/`'s `import './types.js'` precedent, codebase scan §3.6). The compiled bundle in `dist/` inlines everything; no `node_modules/` is shipped (R-9).

#### H.2.1 Shared library modules — `src/lib/`

Each lib module is pure or has a single I/O surface; they are composed by the eleven entry scripts. Imports use explicit `.js` extensions in TS sources (Node-ESM convention).

| Path | Public exports | Imports | Side effects |
|---|---|---|---|
| `src/lib/errors.ts` | `MissingPluginConfigError`, `InvalidAudienceError`, `SnapshotNotFoundError`, `UnknownSectionError`, `JourneyNotFoundError`, `SkillNotFoundError`, `GlossaryTermNotFoundError`, `RefreshFailedError`, `FrontmatterInvalidError`, `GitUnavailableError`, `BrowserOpenError`, `StateWriteError`, `ContentNotFoundError` | (none — pure) | none |
| `src/lib/config.ts` | `loadConfig(): PluginConfig`, `type PluginConfig` | `node:fs`, `node:path`, `errors.js` | reads `config.json` once per process |
| `src/lib/snapshot.ts` | `loadSnapshot(): Snapshot`, `type Snapshot`, `type SnapshotItem`, `type Pillar` | `node:fs`, `node:path`, `frontmatter.js`, `errors.js` | reads `snapshot/` directory tree |
| `src/lib/frontmatter.ts` | `parseFrontmatter<T>(raw: string, type: Pillar): { data: T; body: string }`, `type BaseFrontmatter`, `type NewsFrontmatter`, `type SkillFrontmatter` | `gray-matter`, `yaml`, `errors.js` | none (pure parser) |
| `src/lib/state.ts` | `readState(): UserState`, `writeState(s: UserState): void`, `type UserState`, `type Audience` | `node:fs`, `node:path`, `node:os`, `errors.js` | reads/writes `state.json` |
| `src/lib/search.ts` | `search(items, query, audience, limit?): Hit[]`, `type SearchItem`, `type Hit` | (none — pure) | none |
| `src/lib/url-builder.ts` | `buildUrl(baseUrl, section?, subsection?): string`, `type SectionKey` | `errors.js` | none (pure) |
| `src/lib/audience.ts` | `filterByAudience<T extends { audience: Audience }>(items: T[], pref: Audience): T[]`, `passesAudience(item, pref): boolean` | (none — pure) | none |
| `src/lib/journeys.ts` | `loadJourney(slug, snapshot): Journey`, `type Journey`, `isPlaceholder(body): boolean` | `errors.js` | none (pure given snapshot) |
| `src/lib/browser.ts` | `openInBrowser(url: string): Promise<void>`, `probeDevServer(url: string, timeoutMs: number): Promise<boolean>` | `open` (npm), `node:net` | spawns browser; probes localhost |
| `src/lib/output.ts` | `renderList(items, opts): string`, `renderItem(item, opts): string`, `renderBadge(a: Audience): string`, `renderFreshness(meta): string`, `divider(): string`, `truncate(body, query?, length?): string` | `errors.js` | none (pure text) |

**Sequencing inside Step 5 (lib build):** `errors.ts` first (10 min, no deps). Then everything else fans out per plan §3 Workers A/B/C. `journeys.ts` depends on `snapshot.ts` + `frontmatter.ts` — Worker C builds those first internally. `state.ts`, `snapshot.ts`, `config.ts` depend on `errors.ts` only.

#### H.2.2 Per-command entry scripts — `src/<command>.ts`

Each entry script is 30–120 lines: parse `process.argv`, compose lib modules, write to stdout via `lib/output.ts`, exit with an explicit code. All eleven entry points are independent (no cross-imports) — Phase 6 fan-out is unblocked once the lib layer lands.

| Path | Responsibility | Composes |
|---|---|---|
| `src/hub.ts` | Pillars menu + last journey + current audience | `config`, `state`, `snapshot`, `output` |
| `src/hub-search.ts` | Cross-pillar ranked search; respects audience unless `--all` | `config`, `snapshot`, `state`, `audience`, `search`, `output` |
| `src/hub-skills.ts` | List skills, optional topic filter, surfaces extended 17-key fields | `config`, `snapshot`, `state`, `audience`, `output` |
| `src/hub-tips.ts` | List tips, optional topic filter | `config`, `snapshot`, `state`, `audience`, `output` |
| `src/hub-news.ts` | List news; flags `--today` / `--week`; default 7-day window | `config`, `snapshot`, `state`, `audience`, `output` |
| `src/hub-glossary.ts` | Term lookup + related-terms scan; 3-closest on miss | `config`, `snapshot`, `output`, `errors` |
| `src/hub-onboard.ts` | Resolve journey; render body; mark placeholder; update `lastJourney` | `config`, `snapshot`, `state`, `journeys`, `output` |
| `src/hub-install.ts` | Echo `install_command` from skill frontmatter | `config`, `snapshot`, `output`, `errors` |
| `src/hub-audience.ts` | Get/set audience; validate against the three-value set | `state`, `output`, `errors` |
| `src/hub-refresh.ts` | Clone-or-pull → staging → atomic rename → meta | `config`, `node:child_process`, `node:fs`, `errors` |
| `src/hub-open.ts` | URL build + dev-server probe + cross-platform browser launch | `config`, `url-builder`, `browser`, `output` |

#### H.2.3 Top-level files

| Path | Purpose |
|---|---|
| `.claude-plugin/plugin.json` | Minimal manifest. `name: "nbg-ai-hub"`; no `version` (R-7). |
| `config.json` | Plugin-wide config (productionUrl, devMode, search weights). |
| `commands/<11>.md` | LLM-prompt shells that invoke `dist/<name>.mjs`. |
| `dist/<11>.mjs` | esbuild bundles, committed to repo (R-9). |
| `snapshot/` | Bundled markdown mirror (build-time). |
| `scripts-build/build.mjs` | esbuild driver: 11 entries → 11 bundles. |
| `scripts-build/build-snapshot.mjs` | Copies 5 pillars from repo root → `snapshot/`; writes meta. |
| `tests/` | Vitest 4 suites (≥18 files). |
| `package.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `.nvmrc`, `.gitignore` | Standard workspace plumbing mirroring `pipeline/`. |

Repo-root files added: **`.claude-plugin/marketplace.json`** only.

### H.3 Public interface contracts

TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` are inherited from `pipeline/`'s tsconfig.

#### H.3.1 `src/lib/errors.ts`

```ts
export class MissingPluginConfigError extends Error {
  constructor(path: string) {
    super(`Plugin config not found at ${path}. The plugin requires config.json; no fallbacks.`);
    this.name = 'MissingPluginConfigError';
  }
}
export class SnapshotNotFoundError extends Error {
  constructor(searched: readonly string[]) {
    super(`No snapshot directory found. Tried: ${searched.join(', ')}. Run /hub-refresh or reinstall.`);
    this.name = 'SnapshotNotFoundError';
  }
}
export class InvalidAudienceError extends Error {
  constructor(value: string) {
    super(`Invalid audience "${value}". Valid: beginner | advanced | both.`);
    this.name = 'InvalidAudienceError';
  }
}
export class UnknownSectionError extends Error {
  constructor(section: string, valid: readonly string[]) {
    super(`Unknown section "${section}". Valid sections: ${valid.join(', ')}.`);
    this.name = 'UnknownSectionError';
  }
}
export class JourneyNotFoundError extends Error {
  constructor(slug: string, available: readonly string[]) {
    super(`Journey "${slug}" not found. Available: ${available.join(', ') || '(none)'}.`);
    this.name = 'JourneyNotFoundError';
  }
}
export class SkillNotFoundError extends Error {
  constructor(id: string, suggestions: readonly string[]) {
    super(`Skill "${id}" not found.${suggestions.length ? ` Did you mean: ${suggestions.join(', ')}?` : ''}`);
    this.name = 'SkillNotFoundError';
  }
}
export class GlossaryTermNotFoundError extends Error {
  constructor(term: string, suggestions: readonly string[]) {
    super(`Glossary term "${term}" not found.${suggestions.length ? ` Closest: ${suggestions.join(', ')}.` : ''}`);
    this.name = 'GlossaryTermNotFoundError';
  }
}
export class FrontmatterInvalidError extends Error {
  constructor(file: string, reason: string) {
    super(`Frontmatter invalid in ${file}: ${reason}`);
    this.name = 'FrontmatterInvalidError';
  }
}
export class RefreshFailedError extends Error {
  constructor(stage: 'clone' | 'pull' | 'stage' | 'rename', cause: unknown) {
    super(`/hub-refresh failed at "${stage}": ${cause instanceof Error ? cause.message : String(cause)}. Cache unchanged.`);
    this.name = 'RefreshFailedError';
  }
}
export class GitUnavailableError extends Error {
  constructor() {
    super('git executable not found on PATH. /hub-refresh requires git.');
    this.name = 'GitUnavailableError';
  }
}
export class BrowserOpenError extends Error {
  constructor(url: string, cause: unknown) {
    super(`Could not open browser to ${url}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'BrowserOpenError';
  }
}
export class StateWriteError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Could not write state to ${path}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'StateWriteError';
  }
}
export class ContentNotFoundError extends Error {
  constructor(pillar: string) {
    super(`No items in snapshot for "${pillar}". Run /hub-refresh or contribute via PR.`);
    this.name = 'ContentNotFoundError';
  }
}

export type ExitCode = 0 | 1 | 2 | 3 | 4;
// 0 = ok; 1 = no matches / known not-found; 2 = snapshot missing;
// 3 = config missing; 4 = unexpected runtime error.
```

#### H.3.2 `src/lib/config.ts`

```ts
export interface SearchWeights {
  readonly title: number;
  readonly topics: number;
  readonly body: number;
}
export interface SearchConfig {
  readonly weights: SearchWeights;
  readonly snippetLength: number;
  readonly topN: number;
}
export interface PluginConfig {
  readonly productionUrl: string;       // literal "PLACEHOLDER_NOT_YET_DEPLOYED" when undeployed
  readonly devMode: boolean;
  readonly refreshUrl: string;          // HTTPS git URL to clone for /hub-refresh
  readonly search: SearchConfig;
}

/** Resolve path: $CLAUDE_PLUGIN_ROOT/config.json, else path-relative-to-this-module/../config.json. */
export function resolveConfigPath(): string;
/** Throws MissingPluginConfigError if absent; JSON-parses; runtime-validates shape. */
export function loadConfig(): PluginConfig;
```

No fallback values inside the loader: every key listed above must be present in `config.json` or the loader throws `MissingPluginConfigError` with the offending key named.

#### H.3.3 `src/lib/frontmatter.ts`

```ts
export type Audience = 'beginner' | 'advanced' | 'both';
export type Pillar = 'glossary' | 'tip' | 'skill' | 'news' | 'journey-step';

export interface BaseFrontmatter {
  readonly type: Pillar;
  readonly title: string;
  readonly audience: Audience;
  readonly topics: readonly string[];
  readonly internal: boolean;
  readonly authored: string;        // YYYY-MM-DD (normalised if YAML coerced to Date)
  readonly last_reviewed: string;   // YYYY-MM-DD
  readonly external_link: string | null;
  readonly deeper_link: string | null;
  readonly ai_summary: string;
}
export interface NewsFrontmatter extends BaseFrontmatter {
  readonly type: 'news';
  readonly editor_confidence: 'high' | 'medium' | 'low';
  readonly source: string;
  readonly fingerprint: string;
  readonly hero_image?: string;
}
export interface SkillFrontmatter extends BaseFrontmatter {
  readonly type: 'skill';
  readonly install_command: string;        // starts with "/plugin marketplace add " or "/plugin install "
  readonly skill_id: string;               // /^[a-z0-9-]+$/
  readonly origin: 'internal' | 'community' | 'external';
  readonly category: 'workflow' | 'code' | 'docs' | 'integration' | 'productivity' | 'testing' | 'other';
  readonly status: 'active' | 'experimental' | 'deprecated';
  readonly maintainer: string;
  readonly requires?: readonly string[];
}

/**
 * Parses a single .md file's frontmatter using gray-matter with the explicit `yaml` engine
 * (R-14, matches pipeline/'s fix). Normalises authored/last_reviewed (Date → "YYYY-MM-DD"
 * when YAML 1.1 coerced). Throws FrontmatterInvalidError naming the offending key.
 */
export function parseFrontmatter(raw: string, file: string): { data: BaseFrontmatter | NewsFrontmatter | SkillFrontmatter; body: string };
```

**Validation approach:** simple TS guards (no Zod runtime dep — the bundle stays small; site already pays the Zod cost). Each required key is checked by name; missing or wrong-type → `FrontmatterInvalidError(file, reason)`. Justification: pipeline-side already enforces the canonical shape; the plugin is read-only and the site's Zod schemas are the canonical authority. A TS-guard duplicates ~50 lines vs. shipping Zod's ~50KB bundle to every command.

#### H.3.4 `src/lib/snapshot.ts`

```ts
export interface SnapshotMeta {
  readonly generatedAt: string;     // ISO8601
  readonly sourceCommit: string;    // 40-char SHA
}
export interface SnapshotItem<F extends BaseFrontmatter = BaseFrontmatter> {
  readonly slug: string;            // basename without ".md"; for news, with date prefix
  readonly file: string;            // absolute path
  readonly frontmatter: F;
  readonly body: string;
}
export interface Snapshot {
  readonly root: string;            // resolved path (either DATA or ROOT branch)
  readonly source: 'bundled' | 'refreshed';
  readonly meta: SnapshotMeta;
  readonly glossary: readonly SnapshotItem[];
  readonly tips: readonly SnapshotItem[];
  readonly skills: readonly SnapshotItem<SkillFrontmatter>[];
  readonly news: readonly SnapshotItem<NewsFrontmatter>[];
  readonly journeys: readonly SnapshotItem[];
}

/**
 * Dual-lookup per R-6: prefer $CLAUDE_PLUGIN_DATA/snapshot/ if it exists, else fall back to
 * $CLAUDE_PLUGIN_ROOT/snapshot/. Throws SnapshotNotFoundError with both paths in the message
 * if neither is present. Walks each pillar, parses every *.md via frontmatter.ts, returns
 * the typed Snapshot. Empty pillar → empty array (NOT throw).
 */
export function loadSnapshot(): Snapshot;
```

#### H.3.5 `src/lib/state.ts`

```ts
export type Audience = 'beginner' | 'advanced' | 'both';
export interface UserState {
  readonly audience: Audience;
  readonly lastJourney: string | null;
}

/** Resolves $CLAUDE_PLUGIN_DATA, else $XDG_DATA_HOME/claude-code/plugins/nbg-ai-hub/, else $HOME/.local/share/... */
export function resolveStateDir(): string;
/** First-run bootstrap returns { audience: 'both', lastJourney: null } if file absent (documented as bootstrap, NOT a config fallback). */
export function readState(): UserState;
/** Creates parent dir if missing; atomic write via tmp + rename. Throws StateWriteError on failure. */
export function writeState(state: UserState): void;
```

#### H.3.6 `src/lib/search.ts`

```ts
export interface SearchItem {
  readonly pillar: Pillar;
  readonly slug: string;
  readonly title: string;
  readonly topics: readonly string[];
  readonly body: string;
  readonly audience: Audience;
  readonly file: string;
}
export interface Hit {
  readonly item: SearchItem;
  readonly score: number;
  readonly snippet: string;        // 200-char window centred on first match
}

/**
 * Pure ranking: title × weights.title + topics × weights.topics + body × weights.body
 * (defaults 5/3/1, configurable via PluginConfig). Case-insensitive substring match.
 * Returns top-N (default 10) by descending score. Tie-break: pillar order → slug.
 * Empty query → []. No I/O.
 */
export function search(
  items: readonly SearchItem[],
  query: string,
  audience: Audience,
  options?: { readonly weights?: SearchWeights; readonly snippetLength?: number; readonly limit?: number; readonly includeAll?: boolean }
): readonly Hit[];
```

#### H.3.7 `src/lib/url-builder.ts`

```ts
export type SectionKey =
  | 'news' | 'glossary' | 'skills' | 'tips' | 'journeys'
  | 'reference' | 'contribute'
  | 'day-1' | 'week-1' | 'backend' | 'data-scientist' | 'ml-engineer';

export const VALID_SECTIONS: readonly SectionKey[];

/**
 * Pure URL builder per AC16. Rules:
 *   buildUrl(base)                              → `${base}/`
 *   buildUrl(base, "news")                      → `${base}/news/`
 *   buildUrl(base, "glossary", "mcp")           → `${base}/glossary#mcp`
 *   buildUrl(base, "day-1")                     → `${base}/start-here/day-1/`
 *   buildUrl(base, "<pillar>")                  → `${base}/<pillar>/`   (skills|tips|news|glossary|journeys|reference|contribute)
 *   buildUrl(base, "<unknown>")                 → throws UnknownSectionError
 * Strips trailing "/" on `base` before composing.
 */
export function buildUrl(baseUrl: string, section?: string, subsection?: string): string;
```

#### H.3.8 `src/lib/browser.ts`

```ts
/** Opens the URL in the user's default browser via the `open` npm package. Throws BrowserOpenError on failure. */
export function openInBrowser(url: string): Promise<void>;
/** TCP-connect probe with timeout; resolves true if anything answers on the host:port, false otherwise. No HTTP fetch. */
export function probeDevServer(url: string, timeoutMs: number): Promise<boolean>;
```

#### H.3.9 `src/lib/audience.ts`

```ts
export function passesAudience(itemAudience: Audience, preference: Audience): boolean;
export function filterByAudience<T extends { audience: Audience }>(items: readonly T[], preference: Audience): readonly T[];
```

Semantics: `both` matches all; `beginner` matches `beginner` + `both`; `advanced` matches `advanced` + `both`. Mirrors `site/src/components/AudienceFilter.astro` exactly (F17).

#### H.3.10 `src/lib/journeys.ts`

```ts
export interface Journey {
  readonly slug: string;
  readonly title: string;
  readonly body: string;
  readonly isPlaceholder: boolean;
}
/** Resolves a journey by slug from snapshot.journeys; throws JourneyNotFoundError listing available slugs on miss. */
export function loadJourney(slug: string, snapshot: Snapshot): Journey;
/** Detects body text matching /coming soon|content in progress|placeholder/i (case-insensitive). */
export function isPlaceholder(body: string): boolean;
```

#### H.3.11 `src/lib/output.ts`

```ts
export interface ListOptions {
  readonly showBadge: boolean;
  readonly showTopics: boolean;
  readonly showDescription: boolean;
  readonly emptyMessage: string;          // e.g., "no tips in this snapshot yet — see /hub-refresh"
}
export function divider(): string;        // "─" × 60
export function renderBadge(a: Audience): '[BEGINNER]' | '[ADVANCED]' | '[BOTH]';
export function truncate(body: string, query?: string, length?: number): string;  // 200-char window centred on first match
export function renderItem<T extends BaseFrontmatter>(item: SnapshotItem<T>, opts: ListOptions): string;
export function renderList<T extends BaseFrontmatter>(items: readonly SnapshotItem<T>[], opts: ListOptions): string;
export function renderFreshness(meta: SnapshotMeta): string;  // "(snapshot: 2026-05-19, source: c73c36d)"
export function renderHits(hits: readonly Hit[]): string;
```

### H.4 Data models

#### H.4.1 `plugin/.claude-plugin/plugin.json`

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "nbg-ai-hub",
  "description": "Hub-as-skill: /hub-* commands for the NbgAiHub knowledge hub.",
  "author": { "name": "chomovazuzana" },
  "repository": "https://github.com/chomovazuzana/NbgAiHub",
  "license": "MIT",
  "keywords": ["claude-code", "knowledge-hub", "onboarding", "skills"]
}
```

**Required:** `name`. **Deliberately omitted:** `version` (R-7 — during active development the git SHA is the cache key; pin `version` only at stable release).

#### H.4.2 `.claude-plugin/marketplace.json` (repo root)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-marketplace.json",
  "name": "nbg-ai-hub-marketplace",
  "description": "NbgAiHub Claude Code plugin marketplace.",
  "owner": { "name": "chomovazuzana" },
  "plugins": [
    {
      "name": "nbg-ai-hub",
      "source": "./plugin",
      "description": "Hub-as-skill: /hub-* commands for the NbgAiHub knowledge hub.",
      "category": "knowledge-management",
      "keywords": ["claude-code", "knowledge-hub", "onboarding"]
    }
  ]
}
```

**Required:** `name`, `owner.name`, `plugins[].name`, `plugins[].source`. Install path: `/plugin install nbg-ai-hub@nbg-ai-hub-marketplace`.

#### H.4.3 `plugin/config.json`

```json
{
  "$schema": "./config.schema.json",
  "productionUrl": "PLACEHOLDER_NOT_YET_DEPLOYED",
  "devMode": true,
  "refreshUrl": "https://github.com/chomovazuzana/NbgAiHub.git",
  "search": {
    "weights": { "title": 5, "topics": 3, "body": 1 },
    "snippetLength": 200,
    "topN": 10
  }
}
```

All five keys mandatory. No fallbacks. `productionUrl` sentinel `PLACEHOLDER_NOT_YET_DEPLOYED` is a normal string value (recognised by `/hub-open`), NOT a missing-value default.

#### H.4.4 `${CLAUDE_PLUGIN_DATA}/state.json`

```json
{
  "audience": "both",
  "lastJourney": null
}
```

`audience: 'beginner' | 'advanced' | 'both'`; `lastJourney: string | null`. Initial bootstrap (file absent) returns the literal `{ audience: 'both', lastJourney: null }` — documented in DECISIONS.md as **user-state initialization**, not a missing-config fallback (the global no-fallback rule applies to *configuration*; first-run UX is a separate concern).

#### H.4.5 `plugin/snapshot/.snapshot-meta.json`

```json
{
  "generatedAt": "2026-05-19T07:00:00Z",
  "sourceCommit": "c73c36d480f112ec6e47d50a94d203ea48979246"
}
```

`generatedAt: string` (ISO8601, UTC, milliseconds optional); `sourceCommit: string` (40-char SHA). Both mandatory. Used by `renderFreshness()` (NF7).

### H.5 Frontmatter contracts

The plugin parses frontmatter from snapshot `.md` files. The shapes below mirror `site/src/content.config.ts` exactly.

#### H.5.1 Base 10-key shape (glossary / tips / journeys)

```yaml
type: glossary | tip | journey-step
title: string (≥1 char)
audience: beginner | advanced | both
topics: string[]
internal: boolean
authored: "YYYY-MM-DD"
last_reviewed: "YYYY-MM-DD"
external_link: URL | null
deeper_link: URL | null
ai_summary: string
```

#### H.5.2 News 14-key shape

Base 10 keys (`type: 'news'`) plus:

```yaml
editor_confidence: high | medium | low
source: string (≥1 char)
fingerprint: string (≥1 char)
hero_image?: URL          # optional
```

**`editor_confidence` surfacing (OQ6):** design rules that `/hub-news` displays `[confidence: medium]` only when value is `medium` or `low` (i.e., omit when `high` — the common case stays clean; the lower-confidence cases get the marker so users notice). This is a Designer-resolved choice for OQ6; revisit if user prefers always-on.

#### H.5.3 Extended skill 17-key shape

Base 10 keys (`type: 'skill'`) plus:

```yaml
install_command: string         # must start with "/plugin marketplace add " or "/plugin install "
skill_id: string                # /^[a-z0-9-]+$/
origin: internal | community | external
category: workflow | code | docs | integration | productivity | testing | other
status: active | experimental | deprecated
maintainer: string (≥1 char)
requires?: string[]             # optional
```

**`/hub-skills` MUST surface these.** The plugin's list output for skills includes:

```text
<title>  [BADGE]                                              [<status>]
  <skill_id> · <category> · <origin> · maintainer: <maintainer>
  <ai_summary>
  Install: <install_command>
  Requires: <requires.join(', ')>     ← line omitted if `requires` absent
```

#### H.5.4 Validation strategy

`lib/frontmatter.ts` uses **simple TS guards** (not Zod) — one explicit check per required key, named-error on miss. Rationale: (a) keeps the bundle small (Zod ≈ 50KB per command bundle × 11 commands), (b) the canonical authority is `pipeline/`'s emitter + `site/`'s Zod schema; the plugin is a downstream reader and a duplicate Zod schema would be the *third* place to keep in sync. The TS-guard implementation is roughly 80 lines and mechanical to maintain.

**Date-coercion handling (R-14):** `gray-matter` is wired with the explicit `yaml` engine; `parseFrontmatter()` normalises any `authored` or `last_reviewed` that arrives as a `Date` object to `YYYY-MM-DD` via `d.toISOString().slice(0, 10)`. Matches `site/src/content.config.ts` line 34–37 and `pipeline/`'s precedent.

### H.6 Per-command CLI contracts

For each command, the table shows: the markdown invocation, the script argv after `$ARGUMENTS` expansion, stdout shape, stderr shape, and exit code semantics.

Stdout is the LLM-presentation surface (Pattern A/B/C from investigation §2). Stderr is for failure detail; the entry script writes a one-line user-friendly message to stderr and a machine-parseable `ERROR <name>: <message>` to stdout when failing, so the LLM (instructed by the command markdown body) can surface the error verbatim.

| # | Command | Script | Argv | Stdout (success) | Exit |
|---|---|---|---|---|---|
| 1 | `/hub` | `hub.mjs` | (none) | Menu header + 5 pillar lines + `Audience: <X>` + `Last journey: <slug \| (none)>` + freshness footer | 0 |
| 2 | `/hub-search <query> [--all]` | `hub-search.mjs <query...> [--all]` | varargs; `--all` skips audience filter | `Top N results for "<q>":` + 1..N hit blocks (title, pillar, badge, snippet, file) + freshness | 0 success; 1 no matches |
| 3 | `/hub-skills [topic]` | `hub-skills.mjs [topic]` | 0..1 positional | List header + per-skill 4-line block (see H.5.3) + freshness | 0 success; 1 empty pillar (graceful message, not error) |
| 4 | `/hub-tips [topic]` | `hub-tips.mjs [topic]` | 0..1 positional | List of tips (title, badge, topics, ai_summary) + freshness | 0; 1 empty (graceful) |
| 5 | `/hub-news [--today\|--week]` | `hub-news.mjs [flag]` | 0..1 flag | List of news (title, badge, topics, source, ai_summary, "Read on source: <url>"), `editor_confidence` marker per H.5.2 | 0; 1 no items in range |
| 6 | `/hub-glossary <term>` | `hub-glossary.mjs <term>` | 1 positional | Definition body verbatim + `Related terms: a, b, c` + freshness | 0 found; 1 not-found-with-suggestions |
| 7 | `/hub-onboard <journey>` | `hub-onboard.mjs <slug>` | 1 positional | Journey body verbatim + `[content in progress]` marker if placeholder + freshness | 0 found; 1 not-found |
| 8 | `/hub-install <skill-id>` | `hub-install.mjs <id>` | 1 positional | `Run this to install: <install_command>` + skill summary + freshness | 0 found; 1 not-found |
| 9 | `/hub-audience [beginner\|advanced\|both]` | `hub-audience.mjs [value]` | 0..1 positional | No arg: `Current audience: <X>`; with arg: `Audience set to: <X>` | 0; 1 invalid value |
| 10 | `/hub-refresh` | `hub-refresh.mjs` | (none) | `OK <sha> <iso>` + per-pillar count line + freshness | 0 success; 1 refresh failed (cache untouched) |
| 11 | `/hub-open [section] [subsection]` | `hub-open.mjs [section] [subsection]` | 0..2 positional | `Opened: <url>` or `Not opened: <url> (reason: <r>)` | 0 always (graceful) |

#### H.6.1 Cross-cutting exit-code policy

| Code | Meaning |
|---|---|
| 0 | Success (or graceful "nothing to show" with a user-friendly message). |
| 1 | Known not-found / no-matches / invalid-input. Stdout carries the user-facing message; LLM presents verbatim. |
| 2 | Snapshot directory missing entirely. Stdout: `ERROR SnapshotNotFoundError: <message>`. Stderr: developer detail. |
| 3 | `config.json` missing or malformed. Stdout: `ERROR MissingPluginConfigError: <message>`. |
| 4 | Unexpected runtime error (uncaught throw). Stdout: `ERROR <ErrorClass>: <message>`. Stderr: stack. |

#### H.6.2 stdout/stderr conventions

- **stdout:** the LLM-presentation surface. Always plain text. Never includes ANSI colour codes (A18). Never includes a stack trace.
- **stderr:** for developer-facing detail (full error message, stack). The LLM does NOT see stderr (Pattern A inlines only stdout).
- **Final newline:** every script ends with exactly one trailing `\n`.
- **Argument parsing:** simple positional parsing — no `commander` / `yargs` (keeps the bundle small). The only flags in scope: `--all` (`/hub-search`), `--today`, `--week` (`/hub-news`). All other tokens are positionals.

### H.7 Output format style guide

Uniform text shape across all eleven commands, so the LLM never has to reformat. No ANSI colours (A18).

#### H.7.1 Visual primitives

| Element | Rendering |
|---|---|
| Section divider | `──────────────────────────────────────────────────────────` (`─` × 60) |
| Audience badge | `[BEGINNER]`, `[ADVANCED]`, `[BOTH]` (uppercase, brackets, no colour) |
| Topics list | `topic-a, topic-b, topic-c` (comma + space, no brackets, lowercase as in frontmatter) |
| Snippet ellipsis | ` … ` (space + Unicode horizontal ellipsis + space) on left/right of truncation |
| Empty-pillar message | `(no <pillar> in this snapshot yet — run /hub-refresh or contribute via PR)` |
| Freshness footer | `(snapshot: 2026-05-19, source: c73c36d)` — short SHA = first 7 chars |
| `editor_confidence` marker | `[confidence: medium]` or `[confidence: low]` — omit when `high` (H.5.2) |
| Status marker (skills) | `[experimental]` or `[deprecated]` — omit when `active` |

#### H.7.2 Per-item block shape

```text
<title>  [BADGE]
  <topic-a, topic-b, …>
  <ai_summary or excerpt>
```

For news, add `Source: <source>` and `Read on source: <external_link>` lines.

For skills, see H.5.3 (4-line extended block).

For search hits, add `Pillar: <pillar>` and `<file path>`:

```text
<title>  [BADGE]   (score: 17)
  Pillar: glossary  ·  topics: protocol, integrations
  … the protocol Claude Code uses to plug into the outside world: databases, file systems, APIs … 
  plugin/snapshot/glossary/mcp.md
```

#### H.7.3 List frame

```text
──────────────────────────────────────────────────────────
<List header>   (audience: <X>)
──────────────────────────────────────────────────────────

<item block>

<item block>

──────────────────────────────────────────────────────────
(snapshot: 2026-05-19, source: c73c36d)
```

### H.8 Error handling strategy

#### H.8.1 Catalogue (cross-reference H.3.1)

Every failure category has a named error class. The flat hierarchy mirrors `pipeline/`'s pattern (codebase scan §3.5).

| Class | Where raised | Exit code |
|---|---|---|
| `MissingPluginConfigError` | `lib/config.ts` when `config.json` absent or unparsable | 3 |
| `FrontmatterInvalidError` | `lib/frontmatter.ts` on missing required key / wrong type | 4 (or surfaced as warning per-file with skip — Designer rule: skip file, log to stderr, continue; throw only when *every* file in a pillar is invalid) |
| `SnapshotNotFoundError` | `lib/snapshot.ts` when both DATA and ROOT snapshots absent | 2 |
| `ContentNotFoundError` | per-command when audience-filtered list is empty AND user asked for a specific topic that matched zero items (distinguished from empty-pillar) | 1 |
| `InvalidAudienceError` | `lib/state.ts` (validation) and `src/hub-audience.ts` | 1 |
| `UnknownSectionError` | `lib/url-builder.ts` | 1 |
| `JourneyNotFoundError` | `lib/journeys.ts` | 1 |
| `SkillNotFoundError` | `src/hub-install.ts` | 1 |
| `GlossaryTermNotFoundError` | `src/hub-glossary.ts` | 1 (stdout includes 3-closest suggestions) |
| `RefreshFailedError` | `src/hub-refresh.ts` wraps any of: GitUnavailableError, clone/pull failure, rename failure | 1 |
| `GitUnavailableError` | `src/hub-refresh.ts` preflight | 1 |
| `BrowserOpenError` | `src/hub-open.ts` when `open()` rejects | 0 (graceful — print "could not open <url>", do not error) |
| `StateWriteError` | `lib/state.ts` write failure | 4 |

#### H.8.2 Decision rules

1. **No fallback values for missing configuration** (CLAUDE.md). Loader throws `MissingPluginConfigError`; the entry script catches at top level, writes the message to stderr AND stdout (so the LLM surfaces it to the user), exits 3.
2. **Bootstrap is not a fallback.** First-run `state.json` returning `{ audience: 'both', lastJourney: null }` is initialization. Documented in DECISIONS.md to forestall confusion.
3. **All errors flow up to the entry script.** No try/catch inside lib modules except where translating a low-level error to a named class (`fs` ENOENT → `SnapshotNotFoundError`, `git` non-zero → `RefreshFailedError`, etc.).
4. **Entry-script top-level shape (per script):**

```ts
// src/<command>.ts (skeleton applied by all 11)
try {
  await main(process.argv.slice(2));
  process.exit(0);
} catch (err) {
  const e = err as Error;
  process.stderr.write(`${e.stack ?? e.message ?? String(e)}\n`);
  process.stdout.write(`ERROR ${e.name}: ${e.message}\n`);
  process.exit(exitCodeFor(e));
}
```

5. **Frontmatter-invalid is per-file, not fatal.** Skip the offending file with a single stderr line; continue the listing. Only when *zero* valid items remain in a pillar do we surface a user-visible warning.
6. **`/hub-open` never errors out.** Even browser-launch failure is presented as `Not opened: <url> (reason: <r>)` — exit 0. Rationale: opening a URL is fundamentally best-effort; the user gets the URL and can copy/paste.

#### H.8.3 LLM presentation contract

The command markdown body (H.9) instructs the LLM:
- On `ERROR <ClassName>:` stdout: surface verbatim, do not retry, do not editorialise.
- On normal stdout: present verbatim in the original ordering (especially for ranked search results).

### H.9 `commands/*.md` body prompt wording

Each command markdown file has YAML frontmatter declaring `description`, `argument-hint`, and `allowed-tools`, followed by a one-sentence frame, the `!`-fenced execution, and a closing presentation instruction. Investigation §2 Pattern A is the dominant shape.

#### H.9.1 Universal frontmatter template

```yaml
---
description: <one-line in tone — no marketing voice, no AI-slop>
argument-hint: <e.g. "<query> [--all]"; empty if no args>
allowed-tools: Bash(node *)
---
```

#### H.9.2 Body template (Pattern A — pass-through)

```markdown
<One-sentence frame: "Search NbgAiHub content for the user's query.">

```!
node ${CLAUDE_PLUGIN_ROOT}/dist/<command>.mjs $ARGUMENTS
```

The block above is the script's output. Present it to the user verbatim, in the original order. Do not summarise, rerank, or add commentary. If the output starts with `ERROR `, surface that line and tell the user no changes were made.
```

#### H.9.3 Full example — `commands/hub-search.md`

```markdown
---
description: Search NbgAiHub content (glossary, tips, skills, news, journeys) and return ranked snippets.
argument-hint: <query> [--all]
allowed-tools: Bash(node *)
---

Search NbgAiHub for the user's query. Results are ranked by where the match lands (title > topics > body) and respect the user's audience filter unless `--all` is passed.

```!
node ${CLAUDE_PLUGIN_ROOT}/dist/hub-search.mjs $ARGUMENTS
```

The block above is the ranked result list. Present it to the user verbatim, in the order shown — do not rerank, do not summarise, do not collapse entries. If the block reads `(no results for "<q>")`, surface that line so the user knows to try a broader query. If the block starts with `ERROR `, surface that line verbatim and tell the user the snapshot may be missing — they can run `/hub-refresh` to fetch it.
```

#### H.9.4 Full example — `commands/hub.md` (entry point)

```markdown
---
description: NbgAiHub entry point — shows the five pillars, your last journey, and your audience filter.
argument-hint:
allowed-tools: Bash(node *)
---

The user is opening the NbgAiHub menu.

```!
node ${CLAUDE_PLUGIN_ROOT}/dist/hub.mjs
```

The block above is the hub menu. Present it verbatim. After the menu, you may briefly remind the user that each pillar has its own command (`/hub-skills`, `/hub-tips`, `/hub-news`, `/hub-glossary`, `/hub-onboard`) and that they can search across everything with `/hub-search <query>`. Do not add any other commentary, especially not marketing-style framing.
```

#### H.9.5 Side-effect example — `commands/hub-refresh.md` (Pattern B)

```markdown
---
description: Pull the latest snapshot of NbgAiHub content into your local cache.
argument-hint:
allowed-tools: Bash(node *)
---

Refreshing the content snapshot from the source repo. This uses your local git credentials.

```!
node ${CLAUDE_PLUGIN_ROOT}/dist/hub-refresh.mjs
```

If the block above starts with `OK `, the snapshot was replaced atomically — confirm success to the user with the timestamp and per-pillar counts. If it starts with `ERROR `, surface the error verbatim and tell the user their previous snapshot is unchanged. Do not invent counts or timestamps if they are not in the output.
```

#### H.9.6 Browser-launch example — `commands/hub-open.md` (Pattern C)

```markdown
---
description: Open the NbgAiHub website in your browser. Deep-links into pillars and journeys.
argument-hint: [section] [subsection]
allowed-tools: Bash(node *)
---

```!
node ${CLAUDE_PLUGIN_ROOT}/dist/hub-open.mjs $ARGUMENTS
```

The block above reports whether the browser was launched. If it says `Opened: <url>`, confirm the URL to the user. If it says `Not opened: <url> (reason: <r>)`, surface that line — the user should know which URL was *intended* even if it didn't open (this happens when the site isn't deployed yet or no dev server is running).
```

The other seven command files follow the H.9.2 template with command-specific frame and instruction adjustments. Tone-pass is reviewer-judged at plan Step 12 (R-15).

### H.10 Integration points

Every contract crossing the plugin boundary into the rest of the project.

| # | Boundary | Direction | Contract | Owner of the contract |
|---|---|---|---|---|
| 1 | Repo content folders (`glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`) | read (build-time, via `scripts-build/build-snapshot.mjs`) | Filesystem layout 1:1; markdown files with canonical frontmatter (H.5) | DECISIONS.md "Shared content shape" (2026-05-18) |
| 2 | `site/src/content.config.ts` schemas | informal — schemas must stay in sync | When site changes Zod schema, plugin's TS guards must mirror within the same PR | DECISIONS.md entry (Step 13) to document the coupling |
| 3 | Pipeline's NewsFrontmatter (`pipeline/src/types.ts`) | informal — read alignment | News file shape (14 keys) emitted by pipeline = shape parsed by plugin | DECISIONS.md "Shared content shape" |
| 4 | Claude Code marketplace install flow | external API | `/plugin marketplace add chomovazuzana/NbgAiHub` resolves `.claude-plugin/marketplace.json`, installs `nbg-ai-hub` via `source: "./plugin"`; no `npm install` runs on user machine (R-9) | Claude Code docs |
| 5 | Local user environment for `/hub-refresh` | shell exec | `git` on PATH; user's existing `gh auth` / SSH keys for private repo. Plugin invokes `git clone` / `git fetch` / `git reset` — read-only against user cache. | README documents prerequisite |
| 6 | `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` env vars | input from harness | Claude Code sets these per plugin spec; plugin reads via `process.env`. Fallbacks (R-5) for non-Claude invocation (tests, manual runs). | Claude Code plugin reference |
| 7 | The `open` npm package (cross-platform browser) | dep | Bundled via esbuild; no runtime fetch | upstream (`open@^10`) |
| 8 | Snapshot freshness signal | output | `renderFreshness()` shape `(snapshot: YYYY-MM-DD, source: <sha7>)` consumed by user; not by other code | H.7.1 |

### H.11 Technology choices with justification

| Tech | Choice | Justification |
|---|---|---|
| Frontmatter parser | `gray-matter@^4` + `yaml@^2` engine | R-14; matches pipeline's fix for YAML 1.1 date coercion. Stable, tiny, no async. |
| Browser launch | `open@^10` | De-facto Node cross-platform browser launcher; actively maintained successor to `opn`. Bundled via esbuild (~3KB). |
| Bundler | `esbuild@^0.24` | R-9; produces self-contained `.mjs` per command; no `node_modules/` shipped; sub-100ms per bundle. Aligned with the no-`tsx` decision (investigation §3b). |
| Test framework | `vitest@^4.1.6` | Pipeline precedent; DECISIONS.md 2026-05-18 entry locks Vitest 4.x. Matches the workspace's `vi.stubEnv`, `vi.mock` patterns. |
| Lint | ESLint 9 flat config + `@typescript-eslint@^8` | Pipeline precedent. |
| TS compiler | `typescript@^5.8` | Pipeline precedent; `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. |
| Runtime | Node 22 (LTS) ESM | NF2; matches `pipeline/` and `site/`. |
| Schema validation | TS guards (no Zod) | Bundle size; site already pays Zod's cost; plugin is downstream reader. See H.5.4. |
| Web framework | **none** | Plugin runs as one-shot CLI per command. No long-running server. |
| HTTP server | **none** | Same as above. |
| Database | **none** | State is one JSON file. |

### H.12 Parallel implementation units for Phase 6

Mapped from plan-003 §3. Each unit owns a non-overlapping file set; cross-unit needs flow through the public interfaces in H.3 only.

#### H.12.1 Lib layer (Step 5) — 3 workers

| Worker | Owned files | Shared interfaces depended on | Verification |
|---|---|---|---|
| **H-L1** | `src/lib/errors.ts`, `src/lib/snapshot.ts`, `src/lib/url-builder.ts` | none (errors.ts) → H.3.1; then H.3.3 (frontmatter API) for snapshot.ts | `cd plugin && npm run typecheck && npm test -- snapshot.test url-builder.test` |
| **H-L2** | `src/lib/config.ts`, `src/lib/state.ts`, `src/lib/audience.ts` | H.3.1 | `cd plugin && npm test -- config.test state.test` |
| **H-L3** | `src/lib/frontmatter.ts`, `src/lib/search.ts`, `src/lib/journeys.ts`, `src/lib/output.ts`, `src/lib/browser.ts` | H.3.1, H.3.3 (frontmatter types) | `cd plugin && npm test -- frontmatter.test search.test` |

**Sequencing inside the wave:** `errors.ts` ships first from H-L1 (10 min). Once landed, H-L2 and H-L3 can start; H-L1 continues with `snapshot.ts` which needs H-L3's `frontmatter.ts` interface (just the exported types — the implementation can lag). Use **interface-first** discipline: H-L3 commits the `.d.ts`-equivalent (signatures + empty bodies) on day one so H-L1 can typecheck against it.

#### H.12.2 Entry-point layer (Step 6) — 5 workers

| Worker | Owned files | Shared interfaces depended on | Verification |
|---|---|---|---|
| **H-E1** | `src/hub.ts`, `src/hub-search.ts` | H.3.2/4/5/6/9/11 | `cd plugin && npm test -- hub-entry.test search.test` |
| **H-E2** | `src/hub-skills.ts`, `src/hub-tips.ts` | H.3.4/5/9/11 | `cd plugin && npm test -- skills.test tips.test` |
| **H-E3** | `src/hub-news.ts`, `src/hub-glossary.ts` | H.3.3/4/9/11 | `cd plugin && npm test -- news.test glossary.test` |
| **H-E4** | `src/hub-onboard.ts`, `src/hub-install.ts` | H.3.4/5/10/11 | `cd plugin && npm test -- onboard.test install.test` |
| **H-E5** | `src/hub-audience.ts`, `src/hub-refresh.ts`, `src/hub-open.ts` | H.3.2/5/7/8/11 | `cd plugin && npm test -- audience.test refresh.test open.test` |

**File-ownership invariant:** every file in H.12.1 and H.12.2 has exactly one writer. The eleven command markdown files (`plugin/commands/*.md`, Step 9) are also independent — the same 5-worker split can own them, each writer's commands paired with the entry scripts they implemented. The two manifest files (`plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`) and `config.json` (Step 3) are written by whichever worker picks up Step 3 first — single small commit.

#### H.12.3 Test layer (Step 7) — fans out alongside Step 6

Each entry-point worker writes the tests for the entry points they implemented (plus optionally a lib test). The manifest tests (`plugin/tests/manifest.test.ts`, `plugin/tests/marketplace.test.ts`) land at plan Step 4 by the same worker that did Step 3.

#### H.12.4 Critical path

```text
Step 1 (scaffold) → Step 2 (package.json) → Step 3 (manifests + config) → Step 4 (manifest tests)
                                                ↓
                                  Step 5: H-L1, H-L2, H-L3 parallel  (~1.5h)
                                                ↓
                                  Step 6: H-E1..H-E5 parallel        (~2h)
                                                ↓
                              Step 7 (tests fan out per H-E worker)
                                                ↓
                                Step 8 (esbuild) → Step 9 (commands)
                                                ↓
                                  Step 10 (snapshot) → Step 11 (README)
                                                ↓
                                  Step 12 (smoke) → Step 13 (DECISIONS) → Step 14 (SCOPE)
```

Plan §3 estimates 6–7 hours of parallel-team work end-to-end; this design preserves that estimate.

### H.13 Verification checklist (design-level)

Plan-step → design-anchor mapping. A Coder picks a plan step, reads the anchor, executes.

| Plan step | Design anchor | Hand-off ready? |
|---|---|---|
| Step 1 (scaffold) | H.2.3 | YES |
| Step 2 (package.json) | H.11 (tech choices), H.2.3 | YES |
| Step 3 (manifests + config) | H.4.1, H.4.2, H.4.3 | YES — all three JSON shapes locked |
| Step 4 (manifest tests) | H.4.1, H.4.2 | YES |
| Step 5 (lib modules) | H.3.1..H.3.11 | YES — every signature given |
| Step 6 (entry scripts) | H.6 (CLI contracts), H.7 (output style), H.8.2 #4 (top-level wrapper) | YES |
| Step 7 (tests) | H.3 (signatures to assert), H.6 (exit codes), H.8 (error classes) | YES |
| Step 8 (esbuild) | H.11 (esbuild rationale), H.2.3 (`dist/` layout) | YES |
| Step 9 (commands/*.md) | H.9 (all four pattern examples) | YES |
| Step 10 (snapshot build) | H.4.5 (meta shape), H.2.3 | YES |
| Step 11 (README) | H.6 (per-command CLI), H.11 (tech list) | YES |
| Step 12 (smoke) | H.1 (system diagram), H.6 (CLI), H.10 (integration points) | YES |
| Step 13 (DECISIONS + design append) | THIS section | YES |
| Step 14 (SCOPE.md) | (doc edit, no contract) | N/A |
| Step 15 (project-functions.md) | (doc edit, no contract) | N/A |

**AC-level evidence anchors:**

| AC | Design anchor |
|---|---|
| AC1 (`/hub` menu) | H.6 row 1, H.3.5 (state), H.7 (format) |
| AC2 (search ranking) | H.3.6, H.6 row 2 |
| AC3–AC4 (skills/tips listing) | H.5.3, H.6 rows 3–4, H.7.2 |
| AC5 (news flags) | H.5.2, H.6 row 5 |
| AC6–AC7 (glossary lookup + suggestions) | H.6 row 6, H.3.1 (GlossaryTermNotFoundError) |
| AC8–AC9 (journeys + placeholder) | H.3.10, H.6 row 7 |
| AC10–AC11 (install echo + missing) | H.3.1 (SkillNotFoundError), H.5.3, H.6 row 8 |
| AC12–AC13 (audience persist + invalid) | H.3.5, H.3.1 (InvalidAudienceError), H.6 row 9 |
| AC14–AC15 (refresh atomic + cache preserved) | H.1 (failure path), H.6 row 10, H.8.1 (RefreshFailedError) |
| AC16 (URL builder) | H.3.7 |
| AC17 (not-yet-deployed) | H.3.8 (probe), H.6 row 11 |
| AC18 (bundled snapshot) | H.4.5, H.2.3 |
| AC19 (audience cross-session) | H.3.5 |
| AC20 (URL builder pure) | H.3.7 (no I/O imports) |
| AC21 (graceful undeployed E2E) | H.6 row 11 + H.6.1 exit-code policy |
| AC22 (marketplace.json valid) | H.4.2 |
| AC23 — rewritten (11 commands files) | H.2.3 + H.9 |
| AC24 (README docs 11) | H.6 (table feeds README) |
| AC25 (DECISIONS.md entry) | plan Step 13 (doc edit) |
| AC26 (SCOPE.md) | plan Step 14 (doc edit) |
| AC27 (no-fallback) | H.4.3 + H.3.2 + H.8.2 #1 |
| AC28 (frontmatter shape) | H.3.3 + H.5 |
| AC29 (tone) | H.9 templates + reviewer pass |

**Result:** every plan step and every AC has a backing design contract. Coders can pick up any unit H-L1..H-L3 or H-E1..H-E5 and execute from this section alone plus the plan.

---

*End of Hub plugin section.*

---

## §S.13 — UI Redesign: Linear/Vercel/Stripe-leaning Design System

> **Plan reference:** `docs/design/plan-004-ui-redesign.md` is authoritative for *what gets done in what order* across phases P4.A through P4.L. This section is authoritative for *interfaces, contracts, data models (token shape, component prop signatures), file/module structure, error-handling strategy, motion/a11y/dark-mode strategy, and architecture-level decisions*. Phase 6 coders read both side-by-side: plan = wave/file ownership; design = contracts that make the wave executable without further design judgement.
>
> **Locked context:** the user has committed to **Option 1 hybrid** — keep Starlight, build a portable design-token layer, use `template: splash` + one `MarketingShell.astro` for all 11 marketing surfaces, deep-theme the content-detail page via `--sl-color-*` token re-mapping. The escalation gate to Option 2 (replace Starlight) sits **after** Phase 6 evaluation. The design hedges for that gate: ~73% of the work survives an Option 2 rewrite verbatim. Only `MarketingShell.astro` (~80 LOC) + `tokens/aliases.css` (the `--sl-*` block) + `SocialIconsOverride.astro` (already isolated) get rewritten.

### §S.13.0 — Plan-level concerns surfaced to orchestrator

The plan (plan-004-ui-redesign.md) is structurally sound. The design surfaces **two** items for orchestrator/user attention before Phase 6 dispatches. Neither is a re-sequence; both are clarifications that prevent silent ambiguity from forcing a Phase-6 coder to invent answers.

1. **Day-1 step segmentation is a content-vs-layout boundary call.** AC6 wants six `<section id="step-N">` blocks with sticky desktop indicator. The plan (P4.G) leaves the *how* to the Designer. **Design decision:** Phase 6 hand-codes the six section wrappers in `day-1.astro` and renders `journeys/day-1.md`'s body in-place via the collection's `render()` slot, **without** programmatically parsing the markdown. The six section boundaries are derived from the markdown's `## Step N` headings (which already exist in `journeys/day-1.md`). The redesign supplies wrappers, not new content — the visible step copy is unchanged. This avoids a fragile build-time markdown-parsing detour and keeps content edits cleanly out of scope.
2. **`MarketingShellExtended.astro` is dropped.** Plan P4.D listed it as an OPTIONAL variant for the Day-1 `progressIndicator` slot. Design decision: one shell, not two. Day-1 renders the `StepIndicator` primitive inline in its default slot, positioned-sticky via CSS — no shell variant needed. Reduces the Phase-6 surface by one component.

Both items are documented under their respective §S.13.x sections below. Neither blocks Phase 6 dispatch.

### §S.13.1 — Scope & references

This section designs the technical contracts behind the NbgAiHub UI redesign: the design-token layer (three tiers as CSS custom properties), the typography system (Astro Fonts API + Inter Variable + JetBrains Mono Variable), the primitive component library (14 portable `.astro` files), the `MarketingShell.astro` Starlight isolation boundary, the per-surface compositional sketches for the 11 marketing pages, the Starlight content-detail theme override, the motion strategy (CSS + IntersectionObserver + native `@view-transition`), the accessibility contract, the dark/light scoping mechanics, and the migration/removal list.

**Inputs** (read in this order, anchored verbatim):

- `docs/refined-requests/ui-redesign.md` — 39 ACs, 18 assumptions, 14-item Definition of Done.
- `docs/design/plan-004-ui-redesign.md` — 12 phases (P4.A–P4.L), file lists, AC coverage, parallelization DAG.
- `docs/reference/investigation-ui-redesign.md` — 10-axis execution recommendations.
- `docs/research/astro-fonts-api-experimental-stability.md` — concrete `astro.config.mjs` fonts block, Starlight integration notes.
- `docs/research/pagefind-ui-variant-in-starlight-0-39.md` — concrete `--sl-color-*` alias map, theme-scope rules.
- `docs/reference/codebase-scan-ui-redesign.md` — current 10-component / 11-page / 8-lib / 7-test inventory.
- `docs/design/project-design.md` §S.1–§S.12 (site architecture) and §P.1–§P.13 (personalization), for style and contract anchors. The new section §S.13 inherits all conventions from §S.6 (Astro Starlight site), §S.7 (sidebar), §S.11 (personalization integration with sidebar) and adds none that conflict.

**Constraint inheritance from prior sections:**

- The 8 `lib/` modules under `site/src/lib/` (§S.3.x equivalents in plan-002 / §P.3.x in personalization) are **CONTRACT**. The redesign reads them; it never modifies them. AC23 + A17.
- The 11-entry sidebar in `astro.config.mjs` (§S.7) is **frozen**. The redesign restyles entries visually; it does not change labels/links/order. AC32.
- The pre-build script `site/scripts/build-pin-index.ts` (§P.x) is **untouched**. AC18.
- The 127-test floor (§S.12-equivalent) is **the floor, not a ceiling**. Updates that preserve coverage intent are allowed; deletions are not. AC30.

### §S.13.2 — Design tokens: the full three-tier contract

The token layer is the cornerstone of the redesign. Three tiers compose a single coherent vocabulary that every primitive, page, and Starlight chrome element resolves against. The tiers run primitives → semantic → component. The `--sl-color-*` alias block (cross-system) sits in the semantic-equivalent tier and binds new tokens onto Starlight's surface so Pagefind + sidebar + TOC + callouts retint automatically.

#### §S.13.2.1 — Layer order

The cascade is declared **once** at the top of `site/src/styles/tokens.css`:

```css
@layer reset, tokens, starlight.base, starlight.core, starlight.components, nbg.primitives, nbg.components, nbg.utilities;
```

Layer purpose, in cascade order (later wins on ties):

| Layer | Owner | What lives here |
|---|---|---|
| `reset` | empty for now | Reserved for a future `reset.css`. Today contains nothing. |
| `tokens` | `tokens/primitives.css` + `tokens/semantic.css` + `tokens/aliases.css` | The three-tier token declarations. Every `--nbg-*` and `--sl-color-*` lives here. |
| `starlight.base` | Starlight | Starlight's base reset + element styles. We do not author into this layer. |
| `starlight.core` | Starlight | Starlight's core component CSS (sidebar, header, search modal, prose chrome). Imported by Starlight; we do not author into this. |
| `starlight.components` | Starlight | Starlight's per-component CSS (asides, code blocks, link-cards, TOC). Imported by Starlight. |
| `nbg.primitives` | `site/src/components/primitives/*.astro` scoped styles | Each primitive's own scoped `<style>` block — wins over `starlight.*` tiers for any selector they share. |
| `nbg.components` | `site/src/styles/components.css` + the 10 existing components' scoped `<style>` blocks | The redesigned versions of HomeHero, NewsPanel, SkillCard, PinButton, SignInModal, etc. Wins over primitives where overlapping selectors exist (rare). |
| `nbg.utilities` | `tokens/utilities.css` (or appended to `components.css`) | `.audience-hidden`, `.visually-hidden`, `.motion-reveal` state classes. Highest specificity-free precedence. |

The Pagefind research doc is explicit: Starlight ships its Pagefind CSS at `@layer starlight.core`. Our `nbg.components` layer follows starlight.* layers, so any direct override we write to Pagefind's `.pagefind-ui__*` selectors will win without `!important` — but the recommended pattern (per Pagefind research §"Recommended approach in our redesign") is to override the upstream `--sl-color-*` tokens and let Starlight's own aliasing into `--pagefind-ui-*` cascade. We follow that pattern. The `nbg.components` layer exists for cases where token aliasing is insufficient (rare).

#### §S.13.2.2 — Primitive tier — raw values

File: `site/src/styles/tokens/primitives.css`. Scoped `:root` (theme-neutral; primitive values do not change between dark and light — only semantic and component tiers map differently).

**Color primitives** — three ramps. Every ramp has 11 steps (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) for compositional flexibility. Hue families:

| Ramp | Family | Use |
|---|---|---|
| `--nbg-c-slate-{50..950}` | Cool gray, ~220° H | Surfaces, borders, body type. The dominant ramp. |
| `--nbg-c-violet-{50..950}` | Accent, ~265° H | Brand accent — buttons, links, focus rings, lead-card outlines. |
| `--nbg-c-amber-{50..950}` | Confidence-medium / warning, ~38° H | Confidence chips (`medium`), audience-advanced tint, warning callouts. |
| `--nbg-c-emerald-{50..950}` | Audience-beginner / success, ~155° H | Audience-beginner, success callouts, `:tip` aside. |
| `--nbg-c-rose-{50..950}` | Danger / confidence-low, ~350° H | Danger callouts, validation errors. Confidence-low borrows. |
| `--nbg-c-sky-{50..950}` | Info / audience-both, ~210° H | Audience-both tint, info callouts. |

Each ramp follows OKLCH-tuned lightness steps so dark-mode and light-mode swap step-numbers symmetrically (50↔950, 100↔900, …). Concrete values (HSL/OKLCH chosen for accessibility; Designer may shift hue within ±5° during implementation if specific contrast pairs fail AA):

```css
:root {
  /* Slate (the workhorse) — neutral cool gray */
  --nbg-c-slate-50:  hsl(220 25% 98%);
  --nbg-c-slate-100: hsl(220 22% 95%);
  --nbg-c-slate-200: hsl(220 20% 88%);
  --nbg-c-slate-300: hsl(220 18% 75%);
  --nbg-c-slate-400: hsl(220 15% 58%);
  --nbg-c-slate-500: hsl(220 12% 45%);
  --nbg-c-slate-600: hsl(220 14% 32%);
  --nbg-c-slate-700: hsl(220 16% 22%);
  --nbg-c-slate-800: hsl(220 18% 14%);
  --nbg-c-slate-900: hsl(220 22% 9%);
  --nbg-c-slate-950: hsl(220 25% 5%);

  /* Violet (accent) — Linear/Vercel-leaning */
  --nbg-c-violet-50:  hsl(265 100% 97%);
  --nbg-c-violet-100: hsl(265 95%  92%);
  --nbg-c-violet-200: hsl(265 92%  85%);
  --nbg-c-violet-300: hsl(265 90%  75%);
  --nbg-c-violet-400: hsl(265 88%  68%);
  --nbg-c-violet-500: hsl(265 85%  60%);   /* the accent */
  --nbg-c-violet-600: hsl(265 78%  50%);
  --nbg-c-violet-700: hsl(265 70%  40%);
  --nbg-c-violet-800: hsl(265 65%  30%);
  --nbg-c-violet-900: hsl(265 60%  22%);
  --nbg-c-violet-950: hsl(265 55%  14%);

  /* Emerald (audience-beginner, success) */
  --nbg-c-emerald-50:  hsl(155 70% 96%);
  --nbg-c-emerald-100: hsl(155 65% 88%);
  --nbg-c-emerald-200: hsl(155 60% 78%);
  --nbg-c-emerald-300: hsl(155 55% 65%);
  --nbg-c-emerald-400: hsl(155 50% 52%);
  --nbg-c-emerald-500: hsl(155 60% 42%);
  --nbg-c-emerald-600: hsl(155 65% 33%);
  --nbg-c-emerald-700: hsl(155 60% 25%);
  --nbg-c-emerald-800: hsl(155 55% 18%);
  --nbg-c-emerald-900: hsl(155 50% 12%);
  --nbg-c-emerald-950: hsl(155 45% 7%);

  /* Amber (audience-advanced, confidence-medium, warning) */
  --nbg-c-amber-50:  hsl(38 95% 96%);
  --nbg-c-amber-100: hsl(38 92% 88%);
  --nbg-c-amber-200: hsl(38 90% 78%);
  --nbg-c-amber-300: hsl(38 88% 68%);
  --nbg-c-amber-400: hsl(38 85% 58%);
  --nbg-c-amber-500: hsl(38 88% 50%);
  --nbg-c-amber-600: hsl(34 85% 42%);
  --nbg-c-amber-700: hsl(30 80% 32%);
  --nbg-c-amber-800: hsl(28 70% 22%);
  --nbg-c-amber-900: hsl(26 60% 15%);
  --nbg-c-amber-950: hsl(24 50% 9%);

  /* Rose (danger, validation-error, confidence-low) */
  --nbg-c-rose-50:  hsl(350 90% 96%);
  --nbg-c-rose-100: hsl(350 88% 90%);
  --nbg-c-rose-200: hsl(350 85% 80%);
  --nbg-c-rose-300: hsl(350 82% 70%);
  --nbg-c-rose-400: hsl(350 78% 60%);
  --nbg-c-rose-500: hsl(350 75% 52%);
  --nbg-c-rose-600: hsl(350 70% 42%);
  --nbg-c-rose-700: hsl(350 65% 32%);
  --nbg-c-rose-800: hsl(350 60% 22%);
  --nbg-c-rose-900: hsl(350 55% 15%);
  --nbg-c-rose-950: hsl(350 50% 9%);

  /* Sky (info, audience-both) */
  --nbg-c-sky-50:  hsl(210 90% 96%);
  --nbg-c-sky-100: hsl(210 88% 88%);
  --nbg-c-sky-200: hsl(210 85% 78%);
  --nbg-c-sky-300: hsl(210 82% 68%);
  --nbg-c-sky-400: hsl(210 78% 58%);
  --nbg-c-sky-500: hsl(210 75% 50%);
  --nbg-c-sky-600: hsl(210 70% 42%);
  --nbg-c-sky-700: hsl(210 65% 32%);
  --nbg-c-sky-800: hsl(210 60% 22%);
  --nbg-c-sky-900: hsl(210 55% 14%);
  --nbg-c-sky-950: hsl(210 50% 8%);
}
```

That's 66 color primitives. Combined with type/space/radius/shadow/motion below, the file lands at ~120 primitive tokens — comfortably past AC1's 60-token floor.

**Type primitives** — family + scale + weights + line-heights + letter-spacings.

```css
:root {
  /* Family aliases. Astro Fonts API emits --nbg-font-body and --nbg-font-mono;
     we keep --nbg-ff-* as the canonical primitive names and point them at the
     fonts-API outputs. Display reuses body family at higher opsz — single font file. */
  --nbg-ff-body:    var(--nbg-font-body);          /* Inter Variable, fallback stack via fonts API */
  --nbg-ff-mono:    var(--nbg-font-mono);          /* JetBrains Mono Variable */
  --nbg-ff-display: var(--nbg-font-body);          /* Same family, larger opsz via variation-settings */

  /* Size scale — 10 steps, modular ~1.2 ratio, with two outsized display steps for hero headlines */
  --nbg-fs-2xs:        0.6875rem; /* 11px — kbd, eyebrow micro */
  --nbg-fs-xs:         0.75rem;   /* 12px — eyebrow, chip, badge */
  --nbg-fs-sm:         0.875rem;  /* 14px — secondary body, captions */
  --nbg-fs-md:         1rem;      /* 16px — body default */
  --nbg-fs-lg:         1.125rem;  /* 18px — lede small */
  --nbg-fs-xl:         1.375rem;  /* 22px — h3 / lede large */
  --nbg-fs-2xl:        1.75rem;   /* 28px — h2 */
  --nbg-fs-display-sm: 2.25rem;   /* 36px — section eyebrow display */
  --nbg-fs-display-md: 3rem;      /* 48px — h1 marketing */
  --nbg-fs-display-lg: 4rem;      /* 64px — hero h1 minimum (AC5) */
  --nbg-fs-display-xl: 5rem;      /* 80px — hero h1 desktop wide */
  --nbg-fs-display-2xl: 6.5rem;   /* 104px — reserved for if Designer wants oversized hero */

  /* Weights — Inter Variable axis 100..900 */
  --nbg-fw-thin:       200;
  --nbg-fw-light:      300;
  --nbg-fw-regular:    400;
  --nbg-fw-medium:     500;
  --nbg-fw-semibold:   600;
  --nbg-fw-bold:       700;
  --nbg-fw-extrabold:  800;

  /* Line-heights — tight for display, comfortable for body */
  --nbg-lh-display:    1.05;     /* hero h1 */
  --nbg-lh-headline:   1.15;     /* h2/h3 */
  --nbg-lh-tight:      1.3;      /* lede */
  --nbg-lh-snug:       1.45;     /* secondary body */
  --nbg-lh-base:       1.6;      /* body — exceeds R6.4 floor of 1.55 */
  --nbg-lh-relaxed:    1.75;     /* long-form prose */

  /* Letter-spacing — tighten display, open mono/eyebrow slightly */
  --nbg-ls-tight:      -0.02em;  /* display headlines */
  --nbg-ls-snug:       -0.01em;  /* h2/h3 */
  --nbg-ls-normal:     0;        /* body */
  --nbg-ls-loose:      0.02em;   /* eyebrow */
  --nbg-ls-wide:       0.08em;   /* uppercase eyebrow, kbd */

  /* Optical-size axis — Inter exposes `opsz`; display engages display-optimized glyph forms */
  --nbg-opsz-body:     14;       /* body default — Inter's text-optimized */
  --nbg-opsz-lede:     20;
  --nbg-opsz-display:  32;       /* h1/h2 marketing — engages display alts */

  /* Font-feature-settings — enabled globally on body via tokens below */
  --nbg-ff-features-body:     "'ss01' on, 'cv11' on, 'cv05' on";  /* Inter stylistic alts (single-storey a, alt-1) */
  --nbg-ff-features-mono:     "'zero' on, 'liga' off";             /* slashed zero, no ligatures in code */
  --nbg-ff-features-tabular:  "'tnum' on, 'cv11' on";              /* tabular figures for data rows */
}
```

**Space primitives** — 4px-base modular scale, 17 steps (`0` through `32`). Tokens cover 0px–8rem.

```css
:root {
  --nbg-sp-0:   0;
  --nbg-sp-px:  1px;
  --nbg-sp-0-5: 0.125rem;  /* 2px */
  --nbg-sp-1:   0.25rem;   /* 4px — base unit */
  --nbg-sp-1-5: 0.375rem;  /* 6px */
  --nbg-sp-2:   0.5rem;    /* 8px */
  --nbg-sp-3:   0.75rem;   /* 12px */
  --nbg-sp-4:   1rem;      /* 16px */
  --nbg-sp-5:   1.25rem;   /* 20px */
  --nbg-sp-6:   1.5rem;    /* 24px */
  --nbg-sp-8:   2rem;      /* 32px */
  --nbg-sp-10:  2.5rem;    /* 40px */
  --nbg-sp-12:  3rem;      /* 48px */
  --nbg-sp-16:  4rem;      /* 64px */
  --nbg-sp-20:  5rem;      /* 80px */
  --nbg-sp-24:  6rem;      /* 96px */
  --nbg-sp-32:  8rem;      /* 128px */
}
```

17 space primitives — well past AC1's 10-step floor. The `0-5` / `1-5` half-steps exist for kbd-internal padding and tight badge geometry.

**Radius primitives:**

```css
:root {
  --nbg-r-xs:   2px;
  --nbg-r-sm:   4px;
  --nbg-r-md:   8px;     /* card default */
  --nbg-r-lg:   12px;
  --nbg-r-xl:   16px;
  --nbg-r-2xl:  24px;
  --nbg-r-pill: 9999px;
  --nbg-r-full: 50%;
}
```

8 radius primitives — past AC1's 4-step floor.

**Shadow primitives** — five elevation steps plus accent glow plus focus. Dark-mode uses richer black with longer y-offsets; light-mode uses softer black with shorter offsets. The primitives below are the dark defaults; semantic-tier rebinds them under `[data-theme='light']`.

```css
:root {
  --nbg-sh-xs: 0 1px 2px hsl(220 30% 0% / 0.4);
  --nbg-sh-sm: 0 2px 4px hsl(220 30% 0% / 0.5),
               0 1px 2px hsl(220 30% 0% / 0.4);
  --nbg-sh-md: 0 4px 12px hsl(220 30% 0% / 0.5),
               0 2px 4px hsl(220 30% 0% / 0.4);
  --nbg-sh-lg: 0 12px 32px hsl(220 30% 0% / 0.55),
               0 4px 12px hsl(220 30% 0% / 0.4);
  --nbg-sh-xl: 0 24px 60px hsl(220 30% 0% / 0.6),
               0 8px 24px hsl(220 30% 0% / 0.4);

  /* Accent glow — soft violet halo for hover/focus, used by Card.variant='feature' + Button.variant='primary' */
  --nbg-sh-glow-accent: 0 0 0 1px var(--nbg-c-violet-500),
                        0 0 24px hsl(265 85% 60% / 0.35);

  /* Focus ring — dedicated, never composed; used by every focusable element */
  --nbg-sh-focus-ring:  0 0 0 2px var(--nbg-c-slate-950),
                        0 0 0 4px var(--nbg-c-violet-500);
}
```

7 shadow primitives — past AC1's 4-step floor (4 elevation + focus).

**Motion primitives:**

```css
:root {
  --nbg-dur-instant:        0.01ms;   /* used by reduced-motion media query overrides */
  --nbg-dur-fast:           120ms;    /* hover transforms, chip presses */
  --nbg-dur-base:           200ms;    /* button hover, card lift */
  --nbg-dur-slow:           400ms;    /* modal enter/exit, focused card outline */
  --nbg-dur-scroll-reveal:  700ms;    /* MotionReveal default */

  --nbg-ease-out:           cubic-bezier(0.22, 1, 0.36, 1);     /* default for entering elements */
  --nbg-ease-in-out:        cubic-bezier(0.65, 0, 0.35, 1);     /* default for symmetric transitions */
  --nbg-ease-bounce-soft:   cubic-bezier(0.34, 1.56, 0.64, 1);  /* card lift, chip selection */
  --nbg-ease-emphasized:    cubic-bezier(0.2, 0, 0, 1);         /* hero entrance */
}
```

5 duration + 4 easing primitives — past AC1's 3+4 floor.

**Z-index primitives:**

```css
:root {
  --nbg-z-base:    0;
  --nbg-z-sticky:  10;
  --nbg-z-fixed:   20;
  --nbg-z-overlay: 100;
  --nbg-z-modal:   200;
  --nbg-z-toast:   300;
}
```

6 z-index tokens — past AC1's 5-step floor.

**Breakpoint custom-media tokens** (Stage-2 CSS feature; safe under Astro's Vite build because we only read them via `var()` in container-query expressions, not in real `@media` rules — Designer can drop them to plain values if Vite/PostCSS complains during P4.A):

```css
:root {
  --nbg-bp-sm: 40rem;   /* 640px — mobile/tablet boundary */
  --nbg-bp-md: 64rem;   /* 1024px — tablet/desktop boundary */
  --nbg-bp-lg: 80rem;   /* 1280px — wide-desktop boundary */
  --nbg-bp-xl: 96rem;   /* 1536px — ultra-wide */
}
```

**Primitive tier total:** ~135 tokens. Floor under AC1 (which asks for 60+) cleared at the primitive tier alone.

#### §S.13.2.3 — Semantic tier — meaning, not value

File: `site/src/styles/tokens/semantic.css`. Scoped under **both** `:root, :root[data-theme='dark']` (dark defaults) and `:root[data-theme='light']` (light overrides). Every semantic token is theme-dependent.

The semantic tier names what a primitive *means* in context. Components read semantic tokens; they do not read primitives directly (with the rare exception of one-off accent shifts). This indirection is what makes the Option-2 escalation cheap: replacing Starlight means rewriting `aliases.css` (the cross-system tier) and leaving primitives + semantic + component layers intact.

**Surface tokens** — six steps from canvas to highest elevation:

| Token | Dark value | Light value | Used by |
|---|---|---|---|
| `--nbg-color-bg-canvas` | `var(--nbg-c-slate-950)` | `var(--nbg-c-slate-50)` | `<html>`, `<body>` |
| `--nbg-color-bg-page` | `var(--nbg-c-slate-900)` | `var(--nbg-c-slate-100)` | `<main>` outer |
| `--nbg-color-bg-surface` | `var(--nbg-c-slate-800)` | `var(--nbg-c-slate-50)` | Cards, panels, popovers |
| `--nbg-color-bg-surface-hover` | `var(--nbg-c-slate-700)` | `var(--nbg-c-slate-100)` | Hover state of surfaces |
| `--nbg-color-bg-elevated` | `var(--nbg-c-slate-700)` | `#ffffff` | Modal background, Pagefind dropdown |
| `--nbg-color-bg-overlay` | `hsl(220 25% 3% / 0.75)` | `hsl(220 25% 30% / 0.45)` | Modal scrim, sticky-header backdrop |

Six surface steps — past AC1's 6-step floor.

**Foreground tokens** — four steps:

| Token | Dark | Light | Used by |
|---|---|---|---|
| `--nbg-color-fg-primary` | `var(--nbg-c-slate-50)` | `var(--nbg-c-slate-950)` | Body, headlines |
| `--nbg-color-fg-secondary` | `var(--nbg-c-slate-200)` | `var(--nbg-c-slate-700)` | Secondary copy, metadata |
| `--nbg-color-fg-muted` | `var(--nbg-c-slate-400)` | `var(--nbg-c-slate-500)` | Captions, placeholders, timestamps |
| `--nbg-color-fg-on-accent` | `var(--nbg-c-slate-50)` | `#ffffff` | Text on accent backgrounds — verified AA against accent-bg |

**Border tokens** — three steps:

| Token | Dark | Light |
|---|---|---|
| `--nbg-color-border-subtle` | `var(--nbg-c-slate-800)` | `var(--nbg-c-slate-200)` |
| `--nbg-color-border-default` | `var(--nbg-c-slate-700)` | `var(--nbg-c-slate-300)` |
| `--nbg-color-border-strong` | `var(--nbg-c-slate-500)` | `var(--nbg-c-slate-500)` |

**Accent tokens:**

| Token | Dark | Light | Use |
|---|---|---|---|
| `--nbg-color-accent` | `var(--nbg-c-violet-400)` | `var(--nbg-c-violet-600)` | Brand accent — buttons, links |
| `--nbg-color-accent-hover` | `var(--nbg-c-violet-300)` | `var(--nbg-c-violet-700)` | Hover for accent |
| `--nbg-color-accent-bg` | `hsl(265 85% 60% / 0.12)` | `hsl(265 85% 60% / 0.08)` | Tinted accent background (chip-selected, focused card) |
| `--nbg-color-accent-fg` | `var(--nbg-c-violet-300)` | `var(--nbg-c-violet-700)` | Text on accent-bg |
| `--nbg-color-accent-strong` | `var(--nbg-c-violet-500)` | `var(--nbg-c-violet-500)` | Solid accent surface (primary button) |
| `--nbg-color-accent-glow` | `var(--nbg-sh-glow-accent)` | `0 0 0 1px var(--nbg-c-violet-500), 0 0 16px hsl(265 85% 60% / 0.18)` | Hover glow |

**Link tokens** — link state never falls back to "blue":

| Token | Dark | Light |
|---|---|---|
| `--nbg-color-link` | `var(--nbg-c-violet-300)` | `var(--nbg-c-violet-700)` |
| `--nbg-color-link-hover` | `var(--nbg-c-violet-200)` | `var(--nbg-c-violet-900)` |
| `--nbg-color-link-visited` | `var(--nbg-c-violet-400)` | `var(--nbg-c-violet-800)` |

**Focus ring token** — single source of truth; referenced verbatim by every focusable element:

| Token | Dark | Light |
|---|---|---|
| `--nbg-color-focus-ring` | `var(--nbg-c-violet-400)` | `var(--nbg-c-violet-600)` |

The actual ring shadow lives in `--nbg-sh-focus-ring` from primitives (2px transparent + 2px focus-ring color); semantic only owns the color of the ring.

**Audience semantic tokens** — three pairs (bg + fg), each verified AA contrast in both modes. Mirror the legacy `#0a7 / #e60 / #08c` intent in tokenized form. Audience semantics drive `AudienceBadge.astro` and any chip that filters by audience.

| Token | Dark bg | Dark fg | Light bg | Light fg |
|---|---|---|---|---|
| `--nbg-color-audience-beginner-bg` / `-fg` | `hsl(155 60% 18%)` | `var(--nbg-c-emerald-200)` | `var(--nbg-c-emerald-100)` | `var(--nbg-c-emerald-800)` |
| `--nbg-color-audience-advanced-bg` / `-fg` | `hsl(28 70% 18%)` | `var(--nbg-c-amber-200)` | `var(--nbg-c-amber-100)` | `var(--nbg-c-amber-800)` |
| `--nbg-color-audience-both-bg` / `-fg` | `hsl(210 60% 20%)` | `var(--nbg-c-sky-200)` | `var(--nbg-c-sky-100)` | `var(--nbg-c-sky-800)` |

**Confidence semantic tokens** — three pairs:

| Token | Dark bg | Dark fg | Light bg | Light fg |
|---|---|---|---|---|
| `--nbg-color-confidence-high-bg` / `-fg` | `hsl(155 60% 18%)` | `var(--nbg-c-emerald-200)` | `var(--nbg-c-emerald-50)` | `var(--nbg-c-emerald-700)` |
| `--nbg-color-confidence-medium-bg` / `-fg` | `hsl(28 70% 18%)` | `var(--nbg-c-amber-200)` | `var(--nbg-c-amber-50)` | `var(--nbg-c-amber-700)` |
| `--nbg-color-confidence-low-bg` / `-fg` | `hsl(350 55% 22%)` | `var(--nbg-c-rose-200)` | `var(--nbg-c-rose-50)` | `var(--nbg-c-rose-700)` |

**Status semantic tokens** — for callouts and form validation:

| Token | Dark | Light |
|---|---|---|
| `--nbg-color-status-success-bg` / `-fg` | `hsl(155 60% 12%)` / `var(--nbg-c-emerald-300)` | `var(--nbg-c-emerald-50)` / `var(--nbg-c-emerald-700)` |
| `--nbg-color-status-warning-bg` / `-fg` | `hsl(38 70% 12%)` / `var(--nbg-c-amber-300)` | `var(--nbg-c-amber-50)` / `var(--nbg-c-amber-700)` |
| `--nbg-color-status-danger-bg` / `-fg` | `hsl(350 55% 14%)` / `var(--nbg-c-rose-300)` | `var(--nbg-c-rose-50)` / `var(--nbg-c-rose-700)` |
| `--nbg-color-status-info-bg` / `-fg` | `hsl(210 55% 14%)` / `var(--nbg-c-sky-300)` | `var(--nbg-c-sky-50)` / `var(--nbg-c-sky-700)` |

**Type semantic tokens** — three named uses for the three font families:

```css
--nbg-type-body:    var(--nbg-ff-body);     /* Inter */
--nbg-type-mono:    var(--nbg-ff-mono);     /* JetBrains Mono */
--nbg-type-display: var(--nbg-ff-display);  /* Inter at higher opsz */
```

**Semantic tier total:** ~38 tokens. With primitives, the file count of `--` declarations across `tokens/primitives.css` + `tokens/semantic.css` lands at ~175 — far past AC1.

#### §S.13.2.4 — Component tier — bound by individual components

Component tokens are scoped to individual primitives. They live **inside** each primitive's scoped `<style>` block (not in a global file), but the tier-3 contract names them here so the design is reviewable in one place. Naming convention: `--nbg-{component-name}-{property}`.

**Card.astro** — generic card primitive (consumed by SkillCard, NewsPanel cards, my-pins panels, glossary terms):

```css
--nbg-card-bg:          var(--nbg-color-bg-surface);
--nbg-card-bg-hover:    var(--nbg-color-bg-surface-hover);
--nbg-card-fg:          var(--nbg-color-fg-primary);
--nbg-card-border:      var(--nbg-color-border-subtle);
--nbg-card-border-hover: var(--nbg-color-border-default);
--nbg-card-radius:      var(--nbg-r-lg);
--nbg-card-padding:     var(--nbg-sp-6);
--nbg-card-shadow:      var(--nbg-sh-sm);
--nbg-card-shadow-hover: var(--nbg-sh-md);
--nbg-card-feature-outline: var(--nbg-color-accent);
--nbg-card-feature-shadow:  var(--nbg-sh-lg);
```

**Button.astro:**

```css
--nbg-button-bg-primary:        var(--nbg-color-accent-strong);
--nbg-button-bg-primary-hover:  var(--nbg-color-accent-hover);
--nbg-button-fg-primary:        var(--nbg-color-fg-on-accent);
--nbg-button-bg-secondary:      transparent;
--nbg-button-fg-secondary:      var(--nbg-color-fg-primary);
--nbg-button-border-secondary:  var(--nbg-color-border-default);
--nbg-button-bg-ghost:          transparent;
--nbg-button-fg-ghost:          var(--nbg-color-fg-secondary);
--nbg-button-fg-ghost-hover:    var(--nbg-color-fg-primary);
--nbg-button-radius:            var(--nbg-r-md);
--nbg-button-padding-sm:        var(--nbg-sp-1-5) var(--nbg-sp-3);
--nbg-button-padding-md:        var(--nbg-sp-2) var(--nbg-sp-4);
--nbg-button-padding-lg:        var(--nbg-sp-3) var(--nbg-sp-6);
--nbg-button-fs-sm:             var(--nbg-fs-sm);
--nbg-button-fs-md:             var(--nbg-fs-md);
--nbg-button-fs-lg:             var(--nbg-fs-lg);
```

**Badge.astro:**

```css
--nbg-badge-radius:    var(--nbg-r-pill);
--nbg-badge-padding:   var(--nbg-sp-0-5) var(--nbg-sp-2);
--nbg-badge-fs:        var(--nbg-fs-xs);
--nbg-badge-fw:        var(--nbg-fw-medium);
--nbg-badge-ls:        var(--nbg-ls-loose);
/* tone-specific bg/fg pulled from semantic audience/confidence/status tokens via prop */
```

**Chip.astro:**

```css
--nbg-chip-bg:           var(--nbg-color-bg-surface);
--nbg-chip-bg-hover:     var(--nbg-color-bg-surface-hover);
--nbg-chip-bg-selected:  var(--nbg-color-accent-bg);
--nbg-chip-fg:           var(--nbg-color-fg-secondary);
--nbg-chip-fg-selected:  var(--nbg-color-accent-fg);
--nbg-chip-border:       var(--nbg-color-border-subtle);
--nbg-chip-border-selected: var(--nbg-color-accent);
--nbg-chip-radius:       var(--nbg-r-pill);
--nbg-chip-padding:      var(--nbg-sp-1) var(--nbg-sp-3);
--nbg-chip-fs:           var(--nbg-fs-xs);
```

**Input (text/search/textarea, consumed by AudienceFilter, glossary filter, submit-skill form):**

```css
--nbg-input-bg:              var(--nbg-color-bg-page);
--nbg-input-fg:              var(--nbg-color-fg-primary);
--nbg-input-border-default:  var(--nbg-color-border-default);
--nbg-input-border-focus:    var(--nbg-color-accent);
--nbg-input-border-error:    var(--nbg-color-status-danger-fg);
--nbg-input-radius:          var(--nbg-r-md);
--nbg-input-padding:         var(--nbg-sp-2) var(--nbg-sp-3);
--nbg-input-fs:              var(--nbg-fs-md);
```

**Kbd.astro:**

```css
--nbg-kbd-bg:       var(--nbg-color-bg-page);
--nbg-kbd-fg:       var(--nbg-color-fg-secondary);
--nbg-kbd-border:   var(--nbg-color-border-default);
--nbg-kbd-radius:   var(--nbg-r-sm);
--nbg-kbd-padding:  var(--nbg-sp-px) var(--nbg-sp-1-5);
--nbg-kbd-fs:       var(--nbg-fs-2xs);
--nbg-kbd-family:   var(--nbg-ff-mono);
```

**Component tier estimate:** ~70 tokens across all primitives. Most never leak outside their owning `<style>` block — they exist to make a primitive's internal rules readable and overridable from a consumer if needed.

**Total token surface:** ~245 declarations (135 primitive + 38 semantic + ~70 component). The `grep -c '^\s*--' site/src/styles/tokens/*.css` AC1-floor of 60 is exceeded by 3×.

#### §S.13.2.5 — Starlight alias block (cross-system tier)

File: `site/src/styles/tokens/aliases.css`. This is the **one file that binds the redesign to Starlight**. In an Option-2 escalation, this file is deleted.

The map below is sourced from the Pagefind research doc lines 99–138 plus the additional `--sl-font*` aliases for the Astro Fonts API.

```css
@layer tokens {
  :root,
  :root[data-theme='dark'] {
    /* --- Color aliases --- */
    /* Modal/surface backgrounds */
    --sl-color-black:            var(--nbg-color-bg-elevated);    /* modal bg */
    --sl-color-gray-6:           var(--nbg-color-bg-page);        /* search-button bg, accordion header */
    --sl-color-gray-5:           var(--nbg-color-border-default); /* borders, dividers */
    --sl-color-gray-4:           var(--nbg-c-slate-500);           /* tree-diagram icon */
    --sl-color-gray-3:           var(--nbg-c-slate-400);           /* page icon */
    --sl-color-gray-2:           var(--nbg-color-fg-muted);       /* result-excerpt, mark */
    --sl-color-gray-1:           var(--nbg-c-slate-200);          /* placeholder, button text */

    /* Foreground roles */
    --sl-color-white:            var(--nbg-color-fg-primary);     /* result-link text */
    --sl-color-text:             var(--nbg-color-fg-primary);     /* pagefind primary */
    --sl-color-text-accent:      var(--nbg-color-accent);         /* close button, clear ::before */
    --sl-color-text-invert:      var(--nbg-color-bg-canvas);      /* filter checkbox checkmark */

    /* Accent roles */
    --sl-color-accent:           var(--nbg-color-accent);
    --sl-color-accent-high:      var(--nbg-color-accent-hover);
    --sl-color-accent-low:       var(--nbg-color-accent-bg);

    /* Backdrop + shadow */
    --sl-color-backdrop-overlay: var(--nbg-color-bg-overlay);
    --sl-shadow-lg:              var(--nbg-sh-xl);                /* dialog shadow */

    /* --- Font aliases --- */
    --sl-font:                   var(--nbg-type-body);
    --sl-font-mono:              var(--nbg-type-mono);
  }

  :root[data-theme='light'] {
    /* Same alias surface, semantic tokens already rebind under [data-theme='light'] */
    --sl-color-black:            var(--nbg-color-bg-elevated);
    --sl-color-gray-6:           var(--nbg-color-bg-page);
    --sl-color-gray-5:           var(--nbg-color-border-default);
    --sl-color-gray-4:           var(--nbg-c-slate-400);
    --sl-color-gray-3:           var(--nbg-c-slate-500);
    --sl-color-gray-2:           var(--nbg-color-fg-muted);
    --sl-color-gray-1:           var(--nbg-c-slate-700);

    --sl-color-white:            var(--nbg-color-fg-primary);
    --sl-color-text:             var(--nbg-color-fg-primary);
    --sl-color-text-accent:      var(--nbg-color-accent);
    --sl-color-text-invert:      #ffffff;

    --sl-color-accent:           var(--nbg-color-accent);
    --sl-color-accent-high:      var(--nbg-color-accent-hover);
    --sl-color-accent-low:       var(--nbg-color-accent-bg);

    --sl-color-backdrop-overlay: var(--nbg-color-bg-overlay);
    --sl-shadow-lg:              var(--nbg-sh-lg);

    --sl-font:                   var(--nbg-type-body);
    --sl-font-mono:              var(--nbg-type-mono);
  }
}
```

That's 16 `--sl-color-*` + 1 `--sl-shadow-*` + 2 `--sl-font*` = 19 aliases per theme scope × 2 scopes = 38 lines of cross-system binding. Pagefind retints; sidebar retints; TOC retints; callouts retint. No `--pagefind-ui-*` overrides required (per Pagefind research doc §"Key insight — Starlight already does the work").

#### §S.13.2.6 — Reduced-motion overrides

File: `site/src/styles/reduced-motion.css`. Loaded last after `tokens.css`. Collapses every motion-duration token to `--nbg-dur-instant` so any rule using `transition-duration: var(--nbg-dur-base)` (or fast, slow, scroll-reveal) becomes instant.

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --nbg-dur-fast:          var(--nbg-dur-instant);
    --nbg-dur-base:          var(--nbg-dur-instant);
    --nbg-dur-slow:          var(--nbg-dur-instant);
    --nbg-dur-scroll-reveal: var(--nbg-dur-instant);
  }
}
```

That single block satisfies AC22's cascade-level requirement. The IntersectionObserver script (§S.13.7) also early-returns under reduced-motion, so reveals don't even register — defense in depth.

### §S.13.3 — Typography system

Inter Variable (body + display via opsz axis) + JetBrains Mono Variable. Both self-hosted by Astro Fonts API. The exact `astro.config.mjs` block is in the Astro Fonts research doc §"Recommended astro.config.mjs". Adopted verbatim with `cssVariable: '--nbg-font-body'` and `cssVariable: '--nbg-font-mono'`.

#### §S.13.3.1 — Full type-scale table

| Token | Size (rem) | Line-height | Letter-spacing | Weight | `opsz` axis | Use |
|---|---|---|---|---|---|---|
| `--nbg-fs-2xs` (0.6875rem / 11px) | 0.6875 | `--nbg-lh-snug` | `--nbg-ls-wide` (0.08em) | `--nbg-fw-medium` (500) | `--nbg-opsz-body` (14) | `<Kbd>`, eyebrow micro, badge micro |
| `--nbg-fs-xs` (0.75rem / 12px) | 0.75 | `--nbg-lh-snug` | `--nbg-ls-loose` (0.02em) | `--nbg-fw-medium` | `--nbg-opsz-body` | `<Eyebrow>`, `<Chip>`, `<Badge>`, metadata |
| `--nbg-fs-sm` (0.875rem / 14px) | 0.875 | `--nbg-lh-base` | `--nbg-ls-normal` | `--nbg-fw-regular` | `--nbg-opsz-body` | Secondary body, captions, table cells |
| `--nbg-fs-md` (1rem / 16px) | 1 | `--nbg-lh-base` (1.6) | `--nbg-ls-normal` | `--nbg-fw-regular` | `--nbg-opsz-body` | Body default. Inherits to all `<p>` |
| `--nbg-fs-lg` (1.125rem / 18px) | 1.125 | `--nbg-lh-tight` (1.3) | `--nbg-ls-normal` | `--nbg-fw-regular` | `--nbg-opsz-lede` (20) | `<Lede>` (paragraph lede) small |
| `--nbg-fs-xl` (1.375rem / 22px) | 1.375 | `--nbg-lh-headline` (1.15) | `--nbg-ls-snug` | `--nbg-fw-semibold` | `--nbg-opsz-lede` | h3, `<Lede>` large |
| `--nbg-fs-2xl` (1.75rem / 28px) | 1.75 | `--nbg-lh-headline` | `--nbg-ls-snug` | `--nbg-fw-semibold` | `--nbg-opsz-lede` | h2 section title |
| `--nbg-fs-display-sm` (2.25rem / 36px) | 2.25 | `--nbg-lh-display` (1.05) | `--nbg-ls-tight` | `--nbg-fw-bold` | `--nbg-opsz-display` (32) | `<Display size="sm">` — secondary marketing |
| `--nbg-fs-display-md` (3rem / 48px) | 3 | `--nbg-lh-display` | `--nbg-ls-tight` | `--nbg-fw-bold` | `--nbg-opsz-display` | h1 on most marketing pages |
| `--nbg-fs-display-lg` (4rem / 64px) | 4 | `--nbg-lh-display` | `--nbg-ls-tight` | `--nbg-fw-extrabold` | `--nbg-opsz-display` | Homepage h1 minimum (AC5 floor) |
| `--nbg-fs-display-xl` (5rem / 80px) | 5 | `--nbg-lh-display` | `--nbg-ls-tight` | `--nbg-fw-extrabold` | `--nbg-opsz-display` | Homepage h1 desktop wide |
| `--nbg-fs-display-2xl` (6.5rem / 104px) | 6.5 | `--nbg-lh-display` | -0.03em | `--nbg-fw-extrabold` | `--nbg-opsz-display` | Reserved — only if Designer wants oversized hero. Not used by default. |

**Font-feature-settings, global application:**

```css
html, body {
  font-family: var(--nbg-type-body);
  font-size: var(--nbg-fs-md);
  line-height: var(--nbg-lh-base);
  font-feature-settings: 'ss01' on, 'cv11' on, 'cv05' on;
}

code, pre, kbd, samp {
  font-family: var(--nbg-type-mono);
  font-feature-settings: 'zero' on, 'liga' off;
}

[data-tabular] {
  font-feature-settings: 'tnum' on, 'cv11' on;
}

.display,
h1.display,
[data-display] {
  font-family: var(--nbg-type-display);
  font-variation-settings: 'opsz' var(--nbg-opsz-display), 'wght' 720;
  letter-spacing: var(--nbg-ls-tight);
  line-height: var(--nbg-lh-display);
}
```

`'ss01'` is Inter's single-storey `a` stylistic set; `'cv11'` is the alt-1 form (slashed open `1` without footers); `'cv05'` is the lower-case `l` with serif. The combination reads more "Linear-like" — refined, less generic. The mono override turns ligatures **off** (we want code that looks like code, not arrow-arrow ligatures masquerading as `>=`).

**Fallback strategy** — handled automatically by Astro Fonts API. The `optimizedFallbacks: true` flag in `astro.config.mjs` causes Astro to compute `size-adjust` + `ascent-override` metrics on the local fallback (Arial for body, Menlo for mono) so the swap is visually undetectable. We do not write `@font-face` boilerplate ourselves. If the Fontsource provider misbehaves, the documented fallback (Astro Fonts research §"Fallback path") is to switch to `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono` direct NPM imports. Phase 6 does not pre-pay this; it's a contingency.

#### §S.13.3.2 — Heading semantics

Headings on marketing surfaces are produced by `<Display>` primitive. On content-detail pages (`/news/[slug]/`), heading semantics come from MDX (`#`, `##`, `###`) and are themed via `content-override.css` selectors (§S.13.11).

| Element | Primitive / source | Token | Marketing example |
|---|---|---|---|
| Hero h1 (homepage) | `<Display level={1} size="xl">` | `--nbg-fs-display-xl` (80px) | Homepage hero |
| Marketing h1 | `<Display level={1} size="lg">` | `--nbg-fs-display-lg` (64px) | All other marketing surfaces |
| Section h2 | `<Display level={2} size="sm">` or plain `<h2>` | `--nbg-fs-display-sm` (36px) / `--nbg-fs-2xl` (28px) | Per-section heads on pillar landings |
| h3 | plain `<h3>` | `--nbg-fs-xl` (22px) | Card titles |
| Content h1 (slug page) | MDX `#` | `--nbg-fs-display-md` (48px) via content-override.css | News detail |

### §S.13.4 — Spacing, layout, responsive

#### §S.13.4.1 — Layout primitives — prop signatures

**`<Container>`** — width-capped wrapper with horizontal padding. Always block-level. Always horizontally centers when narrower than viewport.

```ts
interface ContainerProps {
  width?: 'narrow' | 'default' | 'wide' | 'full';
  // narrow  = 56rem  (prose, single-column reading)
  // default = 72rem  (most marketing surfaces)
  // wide    = 88rem  (homepage, skills grid)
  // full    = 100%   (hero full-bleed)
  as?: 'div' | 'section' | 'article' | 'main';
  // default 'div'
}
```

DOM: `<{as} class="nbg-container" data-width={width}>{slot}</{as}>`. CSS resolves max-width per `data-width`.

**`<Section>`** — full-bleed vertical-rhythm container. Sits between page-level wrappers; supplies vertical padding. Optional tone for tinted backgrounds.

```ts
interface SectionProps {
  spacing?: 'snug' | 'default' | 'spacious' | 'epic';
  // snug      = padding-block: var(--nbg-sp-8)   (32px)
  // default   = padding-block: var(--nbg-sp-12)  (48px)
  // spacious  = padding-block: var(--nbg-sp-16)  (64px)
  // epic      = padding-block: var(--nbg-sp-24)  (96px)  — heroes
  tone?: 'default' | 'subtle' | 'inverse';
  // default = canvas
  // subtle  = page (one shade lighter / darker)
  // inverse = elevated (panel)
  as?: 'section' | 'div' | 'article' | 'aside';
  surfaceId?: string;  // optional data-surface hook
}
```

DOM: `<{as} class="nbg-section" data-spacing={spacing} data-tone={tone} data-surface={surfaceId ?? undefined}>{slot}</{as}>`.

**`<Stack>`** — vertical flex with consistent gap.

```ts
interface StackProps {
  gap?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20' | '24';
  // strings map 1:1 to --nbg-sp-{n} tokens
  align?: 'start' | 'center' | 'end' | 'stretch';
  as?: 'div' | 'ul' | 'ol' | 'nav';
}
```

DOM: `<{as} class="nbg-stack" data-gap={gap} data-align={align}>{slot}</{as}>`. CSS: `display: flex; flex-direction: column; gap: var(--nbg-sp-{gap})`.

**`<Cluster>`** — wrapping horizontal flex.

```ts
interface ClusterProps {
  gap?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8';
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;  // default true
  as?: 'div' | 'ul';
}
```

**`<Grid>`** — CSS grid with auto-fit semantics OR fixed column count.

```ts
interface GridProps {
  columns?: 'auto-fit' | number;
  // 'auto-fit' uses minmax(min, 1fr); number sets explicit count
  min?: string;
  // minimum cell width when columns='auto-fit' — required in that mode
  // e.g. '20rem'. Plan-002 used '18rem'; redesign abandons uniform '18rem' grids
  // but Grid primitive itself supports auto-fit when a marketing surface wants it.
  gap?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10';
  as?: 'div' | 'ul';
}
```

DOM: `<{as} class="nbg-grid" data-columns={columns} data-min={min} data-gap={gap}>{slot}</{as}>`.

**`<Split>`** — two-column asymmetric split for hero layouts.

```ts
interface SplitProps {
  ratio?: '1/2' | '1/3' | '2/3' | '3/5' | '2/5';
  // start fraction:end fraction. Defaults to '3/5' (60% / 40%).
  gap?: '0' | '4' | '6' | '8' | '12' | '16';
  stack?: 'sm' | 'md' | 'lg';
  // breakpoint below which the split collapses to a stack
  // sm = below --nbg-bp-sm (640px)
  // md = below --nbg-bp-md (1024px)
  // lg = below --nbg-bp-lg (1280px)
  as?: 'div' | 'section';
}
```

DOM: `<{as} class="nbg-split" data-ratio={ratio} data-gap={gap} data-stack={stack}><div class="nbg-split__start">{start slot}</div><div class="nbg-split__end">{end slot}</div></{as}>`. Slots are named `start` and `end`.

#### §S.13.4.2 — Breakpoint contract

```css
/* Token aliases for use in @media rules */
/* Note: declared as primitives in §S.13.2.2; restated here for design clarity */
--nbg-bp-sm: 40rem;   /* 640px  — mobile/tablet boundary */
--nbg-bp-md: 64rem;   /* 1024px — tablet/desktop boundary */
--nbg-bp-lg: 80rem;   /* 1280px — wide-desktop boundary */
--nbg-bp-xl: 96rem;   /* 1536px — ultra-wide */
```

Real `@media` queries inline the values because no browser supports `@media (min-width: var(--nbg-bp-md))` yet (custom-media is Stage 2 CSS). The token names exist for documentation and for container-query expressions that DO accept `var()`. Designer enforces consistency via lint or PR review; the primitives' scoped styles only use the four canonical pixel values above.

#### §S.13.4.3 — Container queries

`<Section>`, `<Grid>`, `<Card>` declare `container-type: inline-size; container-name: nbg-section / nbg-grid / nbg-card`. Primitive internals may use `@container (min-width: 30rem) { ... }` to adapt regardless of viewport — useful when the same card sits in a 1-col mobile layout vs a 2-col asymmetric grid on tablet.

### §S.13.5 — Primitive components (14 components)

Each primitive lives at `site/src/components/primitives/<Name>.astro`. All primitives obey:

- **Pure visual**. No `lib/` imports.
- **Portable**. No `@astrojs/starlight/*` imports. Verifiable: `grep -r '@astrojs/starlight' site/src/components/primitives/` returns 0 matches.
- **Token-driven**. Every color/space/radius/shadow/duration referenced via `var(--nbg-*)`.
- **A11y-clean defaults**. Real HTML elements; ARIA only when required; focus-visible always.
- **Header comment**. Each file starts with `<!-- … -->` block citing purpose, related §S.13 subsection, and the AC numbers it backs.

The 14 primitives in P4.C dependency order (alphabetical within each tier):

#### §S.13.5.1 — `Container.astro`

- **Path**: `site/src/components/primitives/Container.astro`.
- **Purpose**: Width-capped horizontal wrapper. Centers content; applies side padding.
- **Props**: as defined in §S.13.4.1. `width: 'narrow' | 'default' | 'wide' | 'full'` (default 'default'), `as: 'div' | 'section' | 'article' | 'main'` (default 'div').
- **Slots**: default.
- **DOM**: `<{as} class="nbg-container" data-width={width}><slot /></{as}>`.
- **Tokens consumed**: `--nbg-sp-4`, `--nbg-sp-6` (side padding).
- **A11y**: no ARIA; semantic element via `as` prop.
- **Portability check**: `grep '@astrojs/starlight' site/src/components/primitives/Container.astro` → 0 matches.

#### §S.13.5.2 — `Section.astro`

- **Path**: `site/src/components/primitives/Section.astro`.
- **Purpose**: Full-bleed vertical-rhythm region with optional tinted background. Establishes `container-type: inline-size; container-name: nbg-section`.
- **Props**: `spacing: 'snug' | 'default' | 'spacious' | 'epic'` (default 'default'), `tone: 'default' | 'subtle' | 'inverse'` (default 'default'), `as: 'section' | 'div' | 'article' | 'aside'` (default 'section'), `surfaceId?: string`.
- **Slots**: default.
- **DOM**: `<{as} class="nbg-section" data-spacing={spacing} data-tone={tone} {...(surfaceId ? { 'data-surface': surfaceId } : {})}><slot /></{as}>`.
- **Tokens**: `--nbg-sp-8/12/16/24`, `--nbg-color-bg-canvas/page/elevated`.
- **A11y**: none required.

#### §S.13.5.3 — `Stack.astro`

- **Path**: `site/src/components/primitives/Stack.astro`.
- **Purpose**: Vertical flex column with uniform gap.
- **Props**: `gap` (token name, default '4'), `align` (default 'stretch'), `as` (default 'div').
- **Slots**: default.
- **DOM**: `<{as} class="nbg-stack" data-gap={gap} data-align={align}><slot /></{as}>`.
- **Tokens**: `--nbg-sp-{gap}`.
- **A11y**: if `as='ul' | 'ol' | 'nav'`, callers responsible for inner `<li>` semantics.

#### §S.13.5.4 — `Cluster.astro`

- **Path**: `site/src/components/primitives/Cluster.astro`.
- **Purpose**: Horizontal wrapping flex (chip rows, CTA rows, button clusters).
- **Props**: `gap`, `align`, `justify`, `wrap` (default true), `as` (default 'div').
- **DOM**: `<{as} class="nbg-cluster" data-gap={gap} data-align={align} data-justify={justify} data-wrap={String(wrap)}><slot /></{as}>`.

#### §S.13.5.5 — `Grid.astro`

- **Path**: `site/src/components/primitives/Grid.astro`.
- **Purpose**: CSS grid wrapper. Two modes: explicit column count or `auto-fit` with `minmax(min, 1fr)`.
- **Props**: `columns: 'auto-fit' | number` (default 'auto-fit'), `min?: string` (required when columns='auto-fit'), `gap` (default '4'), `as` (default 'div').
- **Validation**: if `columns === 'auto-fit'` and `min` is undefined, the Astro frontmatter throws — `throw new Error('Grid columns="auto-fit" requires a min prop')`. Per global CLAUDE.md no-fallback rule.
- **DOM**: `<{as} class="nbg-grid" data-columns={String(columns)} data-min={min ?? null} data-gap={gap}><slot /></{as}>`.
- **Caution**: Phase 6 coders must NOT use `min="18rem"` on `/skills/`, `/news/`, or `/tips/` — those surfaces' acceptance criteria forbid uniform `auto-fit minmax(18rem, 1fr)` grids. `min` values like `'22rem'` for non-pillar grids and explicit `columns={N}` for pillar grids are the documented usages.

#### §S.13.5.6 — `Split.astro`

- **Path**: `site/src/components/primitives/Split.astro`.
- **Purpose**: Two-column asymmetric split. Named slots `start` and `end`.
- **Props**: `ratio` (default '3/5'), `gap` (default '8'), `stack` (default 'md'), `as` (default 'section').
- **Slots**: `start`, `end`. Default slot ignored (Designer may warn at runtime if accidentally used).
- **DOM**: `<{as} class="nbg-split" data-ratio={ratio} data-gap={gap} data-stack={stack}><div class="nbg-split__start"><slot name="start" /></div><div class="nbg-split__end"><slot name="end" /></div></{as}>`.

#### §S.13.5.7 — `Card.astro`

- **Path**: `site/src/components/primitives/Card.astro`.
- **Purpose**: The generic card primitive. Four variants control visual weight. Used by SkillCard, NewsPanel/NewsList cards, my-pins panels, glossary terms, contribute CTA cards.
- **Props**:

```ts
interface CardProps {
  variant?: 'feature' | 'content' | 'link' | 'stat';
  // feature = lead card — outlined w/ accent + larger shadow + accent glow on hover
  // content = standard card — bg surface, subtle border, sm shadow
  // link    = clickable card — content + cursor pointer + accent border on hover; renders as <a> if href
  // stat    = numeric callout — bg subtle, large numeric content via slot
  as?: 'article' | 'div' | 'a' | 'li';
  // default 'article' unless href is provided → 'a'
  href?: string;
  // when set, card renders as <a> with role=undefined (the link semantics suffice)
  target?: '_blank' | '_self';
  rel?: string;
}
```

- **Slots**: default; named `header` / `footer` / `media` (optional).
- **DOM**:
  ```html
  <{as} class="nbg-card" data-variant={variant} {...(href ? { href, target, rel } : {})}>
    <slot name="media" />
    <header class="nbg-card__header"><slot name="header" /></header>
    <div class="nbg-card__body"><slot /></div>
    <footer class="nbg-card__footer"><slot name="footer" /></footer>
  </{as}>
  ```
  Header/footer wrappers only render when their slots have content (use Astro's `Astro.slots.has('header')`).
- **Tokens**: full `--nbg-card-*` component-tier set from §S.13.2.4.
- **A11y**: if `variant='link'` or `href` provided, the card itself is the link (single `<a>` wraps content); no role="article" inside an anchor. If multiple links live inside a content card, the card stays `<article>` and inner `<a>`s carry their own semantics.

#### §S.13.5.8 — `Button.astro`

- **Path**: `site/src/components/primitives/Button.astro`.
- **Purpose**: Accessible button or anchor with three variants and three sizes.
- **Props**:

```ts
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  as?: 'button' | 'a';
  // when href is provided, as defaults to 'a'
  href?: string;
  type?: 'button' | 'submit' | 'reset';  // when as='button'; defaults to 'button'
  target?: '_blank' | '_self';
  rel?: string;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  // forwarded raw to the underlying element — PinButton uses aria-pressed
}
```

- **DOM**: `<{as} class="nbg-button" data-variant={variant} data-size={size} disabled={disabled} ...><slot /></{as}>`.
- **Tokens**: full `--nbg-button-*` set.
- **A11y**: button gets implicit role; anchor gets explicit `role` only if href is omitted (which would be an error — Astro frontmatter throws in that case per global no-fallback rule).
- **Critical contract for PinButton restyle**: PinButton.astro's outer element MAY remain a `<button>` directly with the same `data-pin-type`/`data-pin-slug`/`aria-pressed`/`aria-label` attributes — its script reads those attributes. Designer's call at P4.I whether to compose `<Button>` internally or just use Button's `<style>` system inline; the contract is "Button primitive's CSS tokens drive PinButton's visual; PinButton's script-driven attributes are preserved bit-for-bit." See §S.13.12.

#### §S.13.5.9 — `Badge.astro`

- **Path**: `site/src/components/primitives/Badge.astro`.
- **Purpose**: Pill-shaped colored label. Drives `AudienceBadge` and `ConfidenceChip` internally.
- **Props**:

```ts
interface BadgeProps {
  tone?:
    | 'neutral'
    | 'beginner' | 'advanced' | 'both'           // audience tones
    | 'high' | 'medium' | 'low'                  // confidence tones
    | 'success' | 'warning' | 'danger' | 'info'; // status tones
  // default 'neutral'
  as?: 'span' | 'div';
  // default 'span' — inline by default
}
```

- **DOM**: `<{as} class="nbg-badge" data-tone={tone}><slot /></{as}>`.
- **Tokens**: switches `background-color` and `color` via `data-tone` attribute, consuming semantic tokens (`--nbg-color-audience-{beginner|advanced|both}-{bg|fg}`, `--nbg-color-confidence-{high|medium|low}-{bg|fg}`, `--nbg-color-status-{success|warning|danger|info}-{bg|fg}`). Neutral uses `--nbg-color-bg-surface` / `--nbg-color-fg-secondary`.
- **A11y**: inline by default; no role. If used as a status indicator (e.g., in form validation), the consumer wraps with `role="status"` externally.

#### §S.13.5.10 — `Chip.astro`

- **Path**: `site/src/components/primitives/Chip.astro`.
- **Purpose**: Tag chip. Replaces legacy `.topic-chip`. Supports selectable filter chips.
- **Props**:

```ts
interface ChipProps {
  selected?: boolean;        // default false
  interactive?: boolean;     // default false — when true, renders as <button>
  href?: string;             // when set + !interactive, renders as <a>
  as?: 'span' | 'a' | 'button';  // auto-resolved if not provided
}
```

- **DOM**:
  - `selected=false, interactive=false, href=undefined` → `<span class="nbg-chip" data-selected="false">{slot}</span>`.
  - `interactive=true` → `<button type="button" class="nbg-chip" data-selected={String(selected)} aria-pressed={String(selected)}>{slot}</button>`.
  - `href` set → `<a class="nbg-chip" data-selected="false" href={href}>{slot}</a>`.
- **Tokens**: `--nbg-chip-*` component-tier set.
- **A11y**: when interactive, `aria-pressed` reflects selected. Real `<button>` element — keyboard-accessible by default.

#### §S.13.5.11 — `Kbd.astro`

- **Path**: `site/src/components/primitives/Kbd.astro`.
- **Purpose**: Keyboard shortcut display. Renders `<kbd>` with mono font and 1px border.
- **Props**: none. Slot only.
- **DOM**: `<kbd class="nbg-kbd"><slot /></kbd>`.
- **Tokens**: `--nbg-kbd-*` component-tier set.
- **Use case**: Inside `<Cluster>` for a chord (e.g., `<Cluster gap="1"><Kbd>Cmd</Kbd><Kbd>K</Kbd></Cluster>`). The visual gap mirrors the Search.astro current `<kbd>+<kbd>` pattern.

#### §S.13.5.12 — `Eyebrow.astro`

- **Path**: `site/src/components/primitives/Eyebrow.astro`.
- **Purpose**: Pre-heading label — small, mono, uppercase, tracked-out. Sits above a `<Display>` or `<h2>`.
- **Props**: `as?: 'p' | 'span' | 'div'` (default 'p'), `tone?: 'default' | 'accent'` (default 'default').
- **DOM**: `<{as} class="nbg-eyebrow" data-tone={tone}><slot /></{as}>`.
- **Tokens**: `--nbg-fs-xs`, `--nbg-ff-mono`, `--nbg-fw-medium`, `--nbg-ls-wide`, `--nbg-color-fg-muted` (default) or `--nbg-color-accent` (accent tone).
- **CSS**: `text-transform: uppercase`.

#### §S.13.5.13 — `Lede.astro`

- **Path**: `site/src/components/primitives/Lede.astro`.
- **Purpose**: Oversized intro paragraph that sits below a hero h1. Sets reading tone.
- **Props**: `as?: 'p' | 'div'` (default 'p'), `size?: 'sm' | 'lg'` (default 'sm').
- **DOM**: `<{as} class="nbg-lede" data-size={size}><slot /></{as}>`.
- **Tokens**: `--nbg-fs-lg` (sm) or `--nbg-fs-xl` (lg), `--nbg-fw-regular`, `--nbg-lh-tight`, `--nbg-color-fg-secondary`.

#### §S.13.5.14 — `Display.astro`

- **Path**: `site/src/components/primitives/Display.astro`.
- **Purpose**: Oversized display heading. Polymorphic via `level` prop. Engages `opsz` axis.
- **Props**:

```ts
interface DisplayProps {
  level: 1 | 2 | 3 | 4;   // required — maps to <h1>..<h4>
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  // default depends on level: level=1 → 'lg', level=2 → 'md', level=3 → 'sm', level=4 → 'sm'
  weight?: 'medium' | 'semibold' | 'bold' | 'extrabold';
  // default 'extrabold' for size 'xl' / '2xl', 'bold' otherwise
}
```

- **DOM**: `<h{level} class="nbg-display" data-size={size} data-weight={weight} data-display><slot /></h{level}>`.
- **Tokens**: `--nbg-fs-display-{size}`, `--nbg-fw-{weight}`, `--nbg-ff-display`, `--nbg-ls-tight`, `--nbg-lh-display`. Sets `font-variation-settings: 'opsz' var(--nbg-opsz-display), 'wght' var(--nbg-fw-{weight} from above);` to engage Inter's display optical-size glyph forms.
- **A11y**: heading semantics from `<h{level}>`.

#### §S.13.5.15 — `MotionReveal.astro`

- **Path**: `site/src/components/primitives/MotionReveal.astro`.
- **Purpose**: Wrapper that marks its child with `data-reveal="true"`. The IntersectionObserver in `motion.ts` (§S.13.7) reads this and toggles `.is-revealed` when the element crosses the threshold.
- **Props**:

```ts
interface MotionRevealProps {
  delay?: number;     // ms — staggered reveal sequences
  as?: 'div' | 'section' | 'article' | 'li';   // default 'div'
}
```

- **DOM**: `<{as} class="nbg-motion-reveal" data-reveal="true" {...(delay ? { 'data-reveal-delay': String(delay) } : {})}><slot /></{as}>`.
- **CSS**: initial `opacity: 0; transform: translateY(16px); transition: opacity var(--nbg-dur-scroll-reveal) var(--nbg-ease-out), transform var(--nbg-dur-scroll-reveal) var(--nbg-ease-out);`. With `[data-reveal-delay]` applied via `transition-delay: calc(var(--reveal-delay-val, 0) * 1ms);` and JS sets `--reveal-delay-val` from the attribute.
- **Reveal trigger**: `.nbg-motion-reveal.is-revealed { opacity: 1; transform: translateY(0); }`.
- **Reduced motion**: under `@media (prefers-reduced-motion: reduce)`, initial state already collapses to `opacity: 1; transform: none;` via:

```css
@media (prefers-reduced-motion: reduce) {
  .nbg-motion-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

Defense in depth alongside the script's early-return.

#### §S.13.5.16 — Bonus primitive — `StepIndicator.astro`

Plan P4.C lists 14 primitives. The investigator's list says 13. The deviation is `StepIndicator` — added to support AC6 (Day-1 step layout). Lives at `site/src/components/primitives/StepIndicator.astro`.

- **Path**: `site/src/components/primitives/StepIndicator.astro`.
- **Purpose**: Vertical list of step labels with a current-step highlight. Sticky on desktop; transforms into a horizontal accordion-like compact bar on mobile.
- **Props**:

```ts
interface StepIndicatorProps {
  steps: Array<{ id: string; label: string }>;
  current?: string;   // id of the currently-active step (controlled by IntersectionObserver)
  sticky?: boolean;   // default true
  ariaLabel?: string; // default 'Steps'
}
```

- **DOM**: `<nav class="nbg-step-indicator" data-sticky={String(sticky)} aria-label={ariaLabel}><ol>{steps.map(step => <li data-step-id={step.id} data-current={step.id === current ? 'true' : 'false'}><a href={`#${step.id}`}>{step.label}</a></li>)}</ol></nav>`.
- **Behavior**: a small inline `<script>` (~20 lines, inlined within `StepIndicator.astro`) sets up an IntersectionObserver on `section[id^='step-']` elements within the same page; updates `[data-current]` on the nav lis to track scroll position. Reduced-motion: observer still runs (it's an attribute toggle, not animation); but no smooth-scroll on link click.
- **A11y**: `<nav aria-label>` provides landmark; inner `<ol>` provides sequence; current step indicated with `aria-current="true"` mirroring `[data-current]`.
- **Mobile responsiveness**: at viewports below `--nbg-bp-md`, the indicator transforms to horizontal scrollable strip via `flex-direction: row; overflow-x: auto;`. No accordion (per design discussion §S.13.0 item 1 — accordion adds complexity that the AC6 wording doesn't actually require; the horizontal compact bar is "collapsible/accordion or vertical-progress affordance" per AC6).

**Final primitive count: 15** (14 from plan + StepIndicator). Plan's mention of 14 in the file list already includes StepIndicator; the investigator's "13" was pre-AC6 analysis. No deviation needs to be flagged.

### §S.13.6 — `MarketingShell.astro` contract

A Starlight isolation boundary — one of four. The four files that import from `@astrojs/starlight/*` are: this file, `tokens/aliases.css`, `SocialIconsOverride.astro`, and `SplashAwareHeader.astro` (see §S.13.6.1 for the header). **MarketingShell stays around ~95 LOC** after the 2026-05-19 unified-header refactor moved the nbg-topnav markup out into SplashAwareHeader.

- **Path**: `site/src/components/MarketingShell.astro`.
- **Props**:

```ts
interface MarketingShellProps {
  title: string;
  description?: string;
  surfaceId?: string;      // 'home' | 'skills' | 'news' | 'tips' | 'glossary' | 'reference'
                           //  | 'contribute' | 'day-1' | 'week-1' | 'my-pins' | 'submit-skill'
  width?: 'default' | 'wide' | 'full';
  // controls outer <Container> width — defaults to 'wide' for most surfaces
  hero?: 'auto' | 'none';
  // when 'auto', renders the named `hero` slot inside a `<Section spacing="epic" tone="default">`
  // when 'none', renders nothing for hero; consumer composes their own
  // default 'auto' if `hero` slot is provided, 'none' otherwise — Astro decides at render time via Astro.slots.has('hero')
  theme?: 'default' | 'inverse';
  // 'inverse' flips the canvas brightness for full-bleed sections
}
```

- **Slots**: `default` (page body), `hero` (optional), `footer` (optional — rendered inside a `<Section spacing="default" tone="subtle">`).
- **DOM**:

```astro
---
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro';
import Container from './primitives/Container.astro';
import Section from './primitives/Section.astro';
const { title, description, surfaceId, width = 'wide', theme = 'default' } = Astro.props;
const hasHero = Astro.slots.has('hero');
const hasFooter = Astro.slots.has('footer');
---
<StarlightPage frontmatter={{ template: 'splash', title, description }}>
  <main class="nbg-marketing" data-marketing="true" data-surface={surfaceId} data-theme-mode={theme}>
    {hasHero && (
      <Section spacing="epic" tone="default" as="header">
        <Container width={width}>
          <slot name="hero" />
        </Container>
      </Section>
    )}
    <Container width={width}>
      <slot />
    </Container>
    {hasFooter && (
      <Section spacing="default" tone="subtle" as="footer">
        <Container width={width}>
          <slot name="footer" />
        </Container>
      </Section>
    )}
  </main>
</StarlightPage>
```

- **What it renders**: a `<StarlightPage>` outer with `template: 'splash'` (drops sidebar + TOC), wrapping a `<main data-marketing>` region scoped to the redesign's CSS. Header chrome (brand + section links + Pagefind search + AuthControls + ThemeSelect + mobile drawer + SignInModal mount) is **not** part of this file — it lives in `SplashAwareHeader.astro` and renders into the Starlight header slot (see §S.13.6.1). Page bodies live inside this `<main>`; no Starlight chrome inside it.
- **Why this file is one of the Option-2 escape hatches**: an Option-2 escalation deletes the `<StarlightPage>` outer and replaces with a custom layout (`<html><head>…</head><body>…</body></html>`). The header content already exists in `SplashAwareHeader.astro` (unified-nav branch), so the migration is mostly: lift that branch out of SplashAwareHeader, drop the StarlightPage wrapper here, drop `tokens/aliases.css`, retire `SocialIconsOverride.astro`. Every primitive and every marketing page below remains unchanged.
- **DOM-structure decision** (per design §S.13.0 item 2): MarketingShell takes the page body through `<slot />`, not via prescriptive props. There is no `<MarketingShell.Hero />` subcomponent — Astro doesn't support compound components naturally. Hero composition lives in the named `hero` slot. Day-1 journey renders `StepIndicator` inline in its default slot (positioned sticky via the indicator's own CSS), not as a shell variant.

### §S.13.6.1 — `SplashAwareHeader.astro` contract (unified header)

The header override that fixes the "two stacked nav bars" pattern from the pre-2026-05-19 layout. Wired in `astro.config.mjs` via `components: { Header: './src/components/SplashAwareHeader.astro' }`.

- **Path**: `site/src/components/SplashAwareHeader.astro`.
- **What it does**: branches on `Astro.locals.starlightRoute.entry.data.template === 'splash'`.
  - **Splash branch** → renders ONE unified `<nav class="nbg-topnav">` containing: brand (NbgAiHub) · primary section links (Start Here / Skills / Tips / News / Glossary / Reference / My Pins / Contribute) · Pagefind `<Search />` trigger · `<AuthControls />` (Sign in XOR signed-in chip) · `<ThemeSelect />` · mobile hamburger + drawer · `<SignInModal />` mount.
  - **Non-splash branch** → renders the default Starlight Header markup verbatim (a copy of `@astrojs/starlight/components/Header.astro` for 0.39.x). `SocialIcons` resolves to `SocialIconsOverride.astro`, which on non-splash pages renders `<AuthControls />` + `<SignInModal />`.
- **Why the override**: a single, coherent header on every marketing surface. Before the refactor, MarketingShell rendered its own nbg-topnav INSIDE Starlight's content slot, producing two stacked navs and (because of the auth-state CSS bug — see §S.13.6.2) a Sign in + user chip pair visible at the same time. The override consolidates everything into the existing Starlight header position.
- **Decision reversal**: §S.13.14.3 (and DECISIONS.md 2026-05-14) previously rejected a Header override "as fragile against Starlight upgrades." Reversed here on 2026-05-19. The override is narrow — one conditional, one DOM tree, no behavioral wrappers around Starlight components — and reuses Starlight's own `Search` and `ThemeSelect` via `virtual:starlight/components/*` imports. The fragility surface is small enough that the unified-nav benefit outweighs it.
- **Type wiring**: the `virtual:starlight/components/*` modules are not in Starlight's exported types. The project ships a local `site/src/env.d.ts` that re-declares the five modules SplashAwareHeader uses (`Search`, `ThemeSelect`, `SocialIcons`, `SiteTitle`, `LanguageSelect`) so `astro check` passes. If a future Starlight version renames or adds a virtual component, this file needs updating.
- **Option-2 implication**: this file is on the rewrite list alongside MarketingShell, `tokens/aliases.css`, and `SocialIconsOverride.astro`. The unified-nav branch *is* the post-Starlight header — Option-2 migration is mostly "delete the non-splash branch + swap the virtual imports for project-owned equivalents".

### §S.13.6.2 — Auth-state mutual exclusion CSS contract

The Sign in button (`.nbg-auth__signin`) and signed-in chip (`.nbg-auth__chip`) live in the same DOM at render time. Client-side JS toggles `element.hidden` based on `auth.readToken()`. Two paired CSS selectors enforce that `[hidden]` actually hides the inactive variant:

```css
.nbg-auth__signin[hidden],
.nbg-auth__chip[hidden] {
  display: none !important;
}
```

Without these, the author rules `.nbg-auth__signin { display: inline-flex }` and `.nbg-auth__chip { display: inline-flex }` (same specificity as `[hidden]`, source-order later in author CSS) override the UA's `[hidden] { display: none }` default, and BOTH variants render simultaneously. The bug surfaced on 2026-05-19: a signed-in user saw "Sign in" + "@chomovazuzana | Sign out" together. Build-output test guards the rule's presence in compiled CSS.

### §S.13.7 — Motion contract

#### §S.13.7.1 — IntersectionObserver utility

- **Path**: `site/src/scripts/motion.ts`.
- **Module shape** (exact contract for P4.K):

```ts
// site/src/scripts/motion.ts

const REVEAL_SELECTOR = '[data-reveal="true"]';
const REVEALED_CLASS  = 'is-revealed';
const ROOT_MARGIN     = '0px 0px -20% 0px';   // fire when element is 20% above bottom of viewport
const THRESHOLD       = 0.5;                  // 50% of the element must be visible

function init(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Skip observer entirely; CSS already renders final state under reduced-motion.
    return;
  }

  const targets = document.querySelectorAll(REVEAL_SELECTOR);
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          const delay = target.dataset.revealDelay;
          if (delay) {
            target.style.setProperty('--reveal-delay-val', delay);
          }
          target.classList.add(REVEALED_CLASS);
          observer.unobserve(target);  // first-trigger only
        }
      }
    },
    { rootMargin: ROOT_MARGIN, threshold: THRESHOLD },
  );

  for (const target of targets) {
    observer.observe(target);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

Loaded via a single `<script src="/src/scripts/motion.ts" type="module">` tag inside `MarketingShell.astro`'s top-level (so it runs once per page navigation; with native `@view-transition` the script re-evaluates on cross-document nav per browser's reset semantics).

#### §S.13.7.2 — CSS contract

```css
@layer nbg.primitives {
  .nbg-motion-reveal {
    opacity: 0;
    transform: translateY(16px);
    transition:
      opacity var(--nbg-dur-scroll-reveal) var(--nbg-ease-out),
      transform var(--nbg-dur-scroll-reveal) var(--nbg-ease-out);
    transition-delay: calc(var(--reveal-delay-val, 0) * 1ms);
  }

  .nbg-motion-reveal.is-revealed {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nbg-motion-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

Defense-in-depth: cascade collapses durations to instant (§S.13.2.6), CSS overrides initial state under reduced-motion, and the JS skips observer registration under reduced-motion.

#### §S.13.7.3 — View Transitions

- **Path**: `site/src/styles/view-transitions.css`.
- **Contents**:

```css
@view-transition {
  navigation: auto;
}

/* Optional — Designer may tune at P4.K. Default is a fade. */
::view-transition-old(root) {
  animation: fade-out var(--nbg-dur-base) var(--nbg-ease-out);
}

::view-transition-new(root) {
  animation: fade-in var(--nbg-dur-base) var(--nbg-ease-out);
}

@keyframes fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes fade-in  { from { opacity: 0 } to { opacity: 1 } }
```

- **Browser support**: Chrome 111+, Safari 18+, Firefox 144+ (Sept 2025). The project's evergreen-floor (A16) is well past all three. Falls back to a normal navigation in unsupported browsers — no broken UX.
- **No `view-transition-name` per-element morphing**. Cross-document view transitions don't support `transition:persist` from Astro's ClientRouter; only the root crossfade plays. This is by design — if Phase 6 evaluation flags the auth-chip flicker as a blocker, escalating to Astro's `<ClientRouter />` (investigation Axis 8 Option 8C) is the next step. Don't pre-pay that complexity.

### §S.13.8 — Dark/Light mode contract

#### §S.13.8.1 — Theme toggle is owned by Starlight

The Starlight header includes a theme toggle. The redesign **does not add a new toggle**. The toggle's behavior (read/write `localStorage` key per Starlight's ThemeProvider; set `data-theme` attribute on `<html>`) is unchanged. AC33 is satisfied without code.

#### §S.13.8.2 — Token resolution under theme

Every semantic and component token has values under both:

- `:root, :root[data-theme='dark']` — defaults (also catches the no-attribute case before Starlight's inline script runs).
- `:root[data-theme='light']` — light overrides.

Primitives (color ramps, type primitives, space, radius, shadow, motion, z-index) are theme-neutral. They don't change between dark and light. Only the semantic layer rebinds them.

Failure mode the design rules out: defining tokens only under `:root` (without theme scope) locks the page to dark even when the user toggles. Pagefind research §"Dark/light mode behaviour" cites this verbatim. The contract above prevents it.

#### §S.13.8.3 — Override hierarchy

When the same token is defined at multiple tiers:

1. **Primitives win when overridden in semantic** — `--nbg-color-bg-canvas: var(--nbg-c-slate-950)` in semantic uses the primitive but binds it under a theme scope; the binding wins.
2. **Components win when they declare their own component token** — `--nbg-card-bg: var(--nbg-color-bg-surface)` is the default, but a consumer can set `--nbg-card-bg: var(--nbg-c-slate-900)` directly on `[data-variant='feature']` if Designer wants.
3. **Inline style wins everything** — exits the token system; reserved for emergencies (Phase 6 should never reach for it).

#### §S.13.8.4 — Pagefind retint

The 16-line `--sl-color-*` alias block in `tokens/aliases.css` (§S.13.2.5) is the entire Pagefind theming surface. The modal retints automatically on theme toggle via Starlight's existing `--pagefind-ui-*` aliasing of `--sl-color-*`. AC31 is met without any `--pagefind-ui-*` overrides.

### §S.13.9 — Accessibility contract

Mandatory for every primitive and marketing surface. Verified in P4.L via axe-core + Playwright + manual keyboard walks.

| Concern | Rule | Token / mechanism |
|---|---|---|
| Focus visibility | Every focusable element shows a 2px ring of `--nbg-color-focus-ring` with 2px offset on `:focus-visible`. Never `outline: none` without an equivalent replacement. | `box-shadow: var(--nbg-sh-focus-ring)` (which composes 2px transparent + 2px focus color). |
| Color contrast | Body text ≥ 4.5:1 (WCAG AA) on its surface in both modes. Display headlines ≥ 3:1 (AA large). AA AAA where palette permits — verified at P4.L via axe-core. | Semantic token pairs chosen for AA — see §S.13.2.3 audience/confidence/status pair definitions. |
| Keyboard navigation | Tab order matches visual order. No positive `tabindex` introduced. Skip link preserved (Starlight provides). | Native HTML element semantics; primitives don't use `tabindex` except `0` when promoting a non-interactive element to focusable (rare; documented per use). |
| Reduced motion | Every motion-using rule honors `prefers-reduced-motion: reduce`. Three-layer defense: tokens (§S.13.2.6), per-component CSS (§S.13.5.15, §S.13.7.2), and JS observer early-return (§S.13.7.1). | `@media (prefers-reduced-motion: reduce)` + `window.matchMedia(...).matches` checks. |
| Semantic HTML | Buttons are `<button>`; links are `<a>`. Real inputs for AudienceFilter (AC35). Real `<dialog>` for SignInModal. Real `<form>` for submit-skill. | Primitive defaults; consumer override only for documented reasons. |
| ARIA preservation | All pre-existing ARIA attributes on PinButton, SignInModal, AudienceFilter, SocialIconsOverride, my-pins.astro, submit-skill.astro stay bit-for-bit (AC23). | P4.I review compares pre/post-restyle diffs of these files; no `aria-*` removed. |
| Form labels | Every `<input>` has an associated `<label>` (via `for` or wrapping). Validation errors use `role="alert"` and reference inputs via `aria-describedby`. | Existing submit-skill ARIA preserved; new fieldset labels follow same pattern. |
| Card-as-link semantics | When `<Card variant='link' href=...>`, the card itself is the `<a>`; inner `<a>`s are forbidden (multi-link cards stay `<article>`). | Documented in `Card.astro` JSDoc; Astro frontmatter warning if both `href` prop and nested `<a>` slot content (best-effort dev-only warning). |
| StepIndicator | `<nav aria-label>` provides landmark. Current step has `aria-current="true"`. Anchor links jump to step IDs. | §S.13.5.16. |
| Glossary filter input | `<input type="search" aria-label="Filter glossary">` per AC11. Filter doesn't break keyboard nav of the remaining visible entries. | §S.13.10 `/glossary/` surface. |
| SignInModal restyle | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` preserved. Focus trap script unchanged. | AC23 + AC34 — visual restyle only. |
| Touch target ≥ 44×44 | All interactive primitives (Button, Chip when interactive, PinButton, AudienceFilter checkbox label) have a min hit area of 44×44 CSS pixels on mobile. | Achieved via `min-height` + padding on small variants; touch-target padding in `<input>` labels for AudienceFilter. |
| Skip link | Starlight provides a "Skip to content" link; we do not add a second. | Untouched. |

### §S.13.10 — Per-surface design — the 11 marketing pages

Each surface gets a brief compositional sketch. Phase 6 coders use these as the layout north-star; precise pixel placement is the implementer's call within the contract.

#### §S.13.10.1 — Homepage `/`

- **File**: `site/src/content/docs/index.mdx` (stays MDX so it can import components; frontmatter keeps `template: splash`).
- **Composition**: `MarketingShell` with `hero` slot. Hero is a `<Split ratio="3/5" stack="md">`:
  - **start slot** — `<Stack gap="6">`:
    - `<Eyebrow tone="accent">NbgAiHub</Eyebrow>`
    - `<Display level={1} size="xl">What I wish I knew a year ago.</Display>` (computes ≥ 80px desktop → exceeds AC5's 64px floor)
    - `<Lede size="lg">A curated Claude Code knowledge hub for bank colleagues. Skills, tips, news, and onboarding paths — opinionated, plainspoken, no AI-slop hedging.</Lede>`
    - `<Cluster gap="3" align="center">` containing two `<Button>`s (primary → Day 1, secondary → Skills) and a `<Kbd>` keyboard-shortcut hint chord (`Cmd K` to search).
  - **end slot** — `<HomeStats>` component (build-time `getCollection()` counts; styled as a `<dl>` with display-sized numerals). Lives at `site/src/components/HomeStats.astro` (created in P4.E).
- After the hero `<Section>`, the page body contains:
  - `<Section spacing="spacious">` — "Latest news" with restyled `<NewsPanel limit={3}>` showing motion-revealed cards.
  - `<Section spacing="spacious" tone="subtle">` — "Where to start" teaser grid linking to Day 1, Skills, Tips, Glossary (4 `<Card variant="link">` items).
  - `<Section spacing="spacious">` — "Submit your own" CTA card (`<Card variant="feature">`).
- **Motion**: `<MotionReveal>` wraps the news panel and the "Where to start" grid. View Transitions handle cross-page fades on click.
- **HomeStats DOM**:

```astro
<dl class="home-stats" data-tabular>
  <div><dt>skills</dt><dd>{stats.skills}</dd></div>
  <div><dt>tips</dt><dd>{stats.tips}</dd></div>
  <div><dt>news</dt><dd>{stats.news}</dd></div>
  <div><dt>glossary</dt><dd>{stats.glossary}</dd></div>
</dl>
```

#### §S.13.10.2 — `/start-here/day-1/`

- **File**: `site/src/pages/start-here/day-1.astro`.
- **Composition**: `MarketingShell` with `hero` slot showing `<Eyebrow>Start here</Eyebrow>` + `<Display level={1} size="md">Day 1 — what I wish I knew</Display>` + `<Lede>`. Below the hero, a two-column layout via `<Split ratio="1/3" stack="md">`:
  - **start slot** — `<StepIndicator>` sticky (desktop only via `position: sticky`).
  - **end slot** — six `<section id="step-N">` blocks (1..6), each wrapped in `<MotionReveal delay={N * 100}>`. Each section header is `<Display level={2} size="sm">` rendering the markdown step's `## Step N` heading. The step body renders the corresponding markdown content via Astro's `<Content />` rendered from the day-1.md entry's `render()` output, **but** scoped per step. The implementation pattern (per §S.13.0 item 1):
    - Either: split the markdown source by `## ` headings at render time within the Astro frontmatter (cheap, no content edits).
    - Or: hand-code the 6 section wrappers with `<Content />` rendering only the relevant slice (uses Astro's markdown `<Content />` slot mechanism — Designer chooses at P4.G between these two; both are layout-only, no content changes).
  - Between steps 3 and 4, a "What I wish I knew" pull-quote (a `<Section tone="subtle">` with mono-styled large text).
- **Motion**: each step `MotionReveal`s in sequence.

#### §S.13.10.3 — `/start-here/week-1/`

- **File**: `site/src/pages/start-here/week-1.astro`.
- **Composition**: `MarketingShell` with hero `<Eyebrow>Coming soon</Eyebrow>` + `<Display level={1} size="md">Week 1 is being written.</Display>` + `<Lede>`. Page body: `<Stack gap="8">` containing:
  - A short opinionated copy block — "Here's what to do while we finish writing it" (project tone, plain-spoken).
  - A `<Grid columns={3} gap="6">` of three `<Card variant="link">` items deep-linking to `/start-here/day-1/`, `/skills/`, `/tips/`. Each card has its own `<Eyebrow>`, title, and one-line description.
- **No centered "Coming soon" + button** — AC7 satisfied by an editorial composition with deep links.

#### §S.13.10.4 — `/skills/`

- **File**: `site/src/pages/skills.astro`.
- **Composition**: `MarketingShell` with hero `<Eyebrow>9 skills</Eyebrow>` + `<Display>` + `<Lede>` + `<AudienceFilter>` (restyled per §S.13.12).
- **Layout** — editorial:
  - **Lead skill** — the featured-lead card uses `<Card variant="feature">` and spans full container width. Title at `--nbg-fs-display-sm`, badge row, topic chips, "Install" CTA. The lead is the freshest skill (sort by frontmatter date desc; first item).
  - **Remaining 8 skills** — `<Grid columns={2} gap="6">` with two alternating card sizes: a wider `<Card variant="content">` and a narrower `<Card variant="content" data-density="compact">`. The alternation creates visual rhythm without going to a magazine-masonry library.
- **AudienceFilter** still applies — restyled visually (segmented-control-looking) but underlying `<input type="checkbox">` real (AC35 + A6).
- All 9 skills render.

#### §S.13.10.5 — `/news/`

- **File**: `site/src/pages/news/index.astro`.
- **Composition**: `MarketingShell` with hero `<Eyebrow>Updates</Eyebrow>` + `<Display>News</Display>` + `<Lede>` + `<AudienceFilter>`.
- **Layout**:
  - **Lead news item** — `<Card variant="feature">` full-width with display-sized title, source name in mono `<Eyebrow>`, confidence chip + audience badge, longer summary.
  - **Remaining items** — `<Stack gap="6">` of `<Card variant="content" data-density="compact">`; each card is a magazine-style row with: title (h3), one-line `Lede`, mono source + date, `<ConfidenceChip>` + `<AudienceBadge>`, `<PinButton>` aligned right.
- **AudienceFilter** + **ConfidenceChip** both functional.
- **PinButton** appearance restyled per P4.I; logic + ARIA preserved (AC23).

#### §S.13.10.6 — `/tips/`

- **File**: `site/src/pages/tips.astro`.
- **Composition**: `MarketingShell` with hero + `<AudienceFilter>`.
- **Layout** — grouped by thematic cluster (the existing 12 tips group naturally into prompting, survival, context, compliance):
  - Four `<Section spacing="default">` blocks, one per cluster.
  - Each section starts with `<Eyebrow>{cluster}</Eyebrow>` + `<Display level={2} size="sm">{cluster title}</Display>` + `<Lede>`.
  - Inside: `<Stack gap="4">` of `<Card variant="content">` for tips in that cluster, OR a single oversized "pull quote" tip (1 per cluster) rendered as `<blockquote>` styled via tokens.
- Not a uniform grid; not a clone of skills.

#### §S.13.10.7 — `/glossary/`

- **File**: `site/src/pages/glossary.astro`.
- **Composition**: `MarketingShell` with hero. Below hero:
  - `<Cluster gap="3">` of an `<input type="search" data-glossary-filter aria-label="Filter glossary">` and an A-Z anchor strip (`<Cluster>` of `<Chip href={#a}>A</Chip>…<Chip href={#z}>Z</Chip>`). Letters with no entries are dimmed (use `[data-empty]`).
- **Layout**: `<Stack gap="6">` of `<article data-term data-term-label={entry.data.term.toLowerCase()} id={entry.slug}>` items. Each term entry renders as a `<Card variant="content">` with:
  - `<Eyebrow tone="accent">{first letter}</Eyebrow>`
  - `<h2>{term}</h2>`
  - Definition body
  - `<PinButton>` aligned right.
- **Filter script**: `site/src/scripts/glossary-filter.ts` (~30 lines, vanilla JS). On input change, iterates `[data-term]`, sets `[hidden]` if `data-term-label` doesn't contain the search query (case-insensitive). Reduces in-page anchor letter strip's active states accordingly. Respects `prefers-reduced-motion`.
- All 15 entries render initially; filter narrows.

#### §S.13.10.8 — `/reference/`

- **File**: `site/src/pages/reference.astro`.
- **Composition**: `MarketingShell` with hero + body. Current content is sparse; the design is to render the existing copy with the new typographic system + an editorial placeholder for sections that will fill out later. Specifically:
  - `<Section>` with a `<Display level={2}>` for each future reference category ("Commands", "Skills index", "Plugin reference").
  - For categories without content yet: a `<Card variant="link">` saying "Where this goes — and what you'll find here" in project tone. Links to the underlying source of truth (e.g., the plugin's `commands/` folder on GitHub).
- AC12 satisfied — no naked default Starlight chrome.

#### §S.13.10.9 — `/contribute/`

- **File**: `site/src/pages/contribute.astro`.
- **Composition**: `MarketingShell` with hero. Body:
  - `<Split ratio="1/2" stack="md">`:
    - **start slot** — "Submit a skill" path (`<Card variant="feature">` with `<Eyebrow>The fast path</Eyebrow>`, lede, `<Button variant="primary">` linking to `/submit-skill/`).
    - **end slot** — "Open a PR" path (`<Card variant="content">` describing the GitHub PR flow with a `<Kbd>` mock of `gh pr create`).
- AC13: existing copy preserved/rewritten in project tone; Submit-Skill CTA visually integrated.

#### §S.13.10.10 — `/my-pins/`

- **File**: `site/src/pages/my-pins.astro`.
- **Composition**: `MarketingShell` with hero `<Eyebrow>Personal</Eyebrow>` + `<Display>My Pins</Display>` + `<Lede>`. Body renders three visually distinct states via existing client script:
  - **Loading** — `<Section tone="subtle">` with a tokenized skeleton row (no spinner; opacity-pulsing placeholders).
  - **Anonymous** — `<Card variant="feature">` with copy "Sign in with a personal access token. Pins live in your own unlisted gist — we never touch them." + `<Button variant="primary">` that triggers `nbgaihub:open-signin-modal`. Privacy callout rendered as `<Section tone="subtle">` with a `<Display level={3}>What this means` + body.
  - **Signed-in** — five `<Section spacing="default">` blocks, one per pin type (skills, tips, news, journey-step, glossary). Each section is `<Stack gap="4">` of `<Card variant="content">` rows, or a tokenized empty-state if no pins for that type.
- **All data-attributes and event hooks preserved**. The `<script>` block (auth.ts + pin-store.ts wiring) is unchanged.
- Sign-in modal opens via `nbgaihub:open-signin-modal` event (existing contract, preserved AC34).

#### §S.13.10.11 — `/submit-skill/`

- **File**: `site/src/pages/submit-skill.astro`.
- **Composition**: `MarketingShell` with hero + body. Body is the form, restructured into numbered fieldsets:
  - `<fieldset>` 1 — Identity: title, slug (auto-derived, editable), origin.
  - `<fieldset>` 2 — Audience & category: audience badge group, category select, status.
  - `<fieldset>` 3 — Skills metadata: minimum claude version, last verified, links.
  - `<fieldset>` 4 — Content body (markdown textarea).
  - `<fieldset>` 5 — Maintainer + tags.
- Each fieldset gets `<Eyebrow>Step {N}</Eyebrow>` + `<Display level={2} size="sm">{fieldset title}</Display>` + descriptive `<Lede>`. The 17 validation rules from `submission.ts` surface as inline checkmarks (✓ in `--nbg-color-status-success-fg` when satisfied, `–` in muted when pending, `✗` in `--nbg-color-status-danger-fg` when violated). Errors use existing `role="alert"` + `aria-describedby` (AC23 — bit-for-bit preserved).
- Slug-collision indicator: a `<Badge tone="warning">` adjacent to the slug input when `checkSlugCollision()` returns true.
- Submit affordance: `<Button variant="primary" size="lg">Open in GitHub editor</Button>` at the form bottom. Logic untouched.

### §S.13.11 — Content-detail theme override

For `/news/[slug]/`. Starlight chrome stays — sidebar, top bar with theme toggle + search + sign-in chip, in-page TOC, prev/next. Visual reskin via `tokens/aliases.css` (already done) + `content-override.css` (new, owned by P4.J).

#### §S.13.11.1 — `content-override.css` contract

- **Path**: `site/src/styles/content-override.css`.
- **Layer**: `@layer nbg.components` (so it wins over Starlight's components but never accidentally overrides primitives).
- **Selectors targeted** — exhaustive list:

| Selector | Property changes | Token |
|---|---|---|
| `.sl-markdown-content h1` | font, size, line-height, letter-spacing, weight, optical-size | `--nbg-ff-display`, `--nbg-fs-display-md`, `--nbg-lh-display`, `--nbg-ls-tight`, `--nbg-fw-bold`, opsz 32 |
| `.sl-markdown-content h2` | same with `--nbg-fs-2xl` | semantic h2 |
| `.sl-markdown-content h3` | same with `--nbg-fs-xl` | h3 |
| `.sl-markdown-content h4` | `--nbg-fs-lg`, semibold | h4 |
| `.sl-markdown-content p` | `font-family`, `font-size`, `line-height`, `color` | `--nbg-ff-body`, `--nbg-fs-md`, `--nbg-lh-relaxed`, `--nbg-color-fg-primary` |
| `.sl-markdown-content li` | inherits + tighter line-height (1.55) | `--nbg-lh-base` |
| `.sl-markdown-content blockquote` | left-border accent + tinted bg + italic | `--nbg-color-accent`, `--nbg-color-bg-surface`, padding |
| `.sl-markdown-content a` | color, underline-offset, hover | `--nbg-color-link`, `--nbg-color-link-hover` |
| `.sl-markdown-content code` (inline) | bg, fg, font, padding, radius | `--nbg-c-slate-800` (dark) / `--nbg-c-slate-100` (light), `--nbg-color-accent`, `--nbg-ff-mono`, `--nbg-sp-0-5 --nbg-sp-1`, `--nbg-r-sm` |
| `.sl-markdown-content pre code` (block) | bg, padding, radius, scrollbar | `--nbg-color-bg-elevated`, `--nbg-sp-4`, `--nbg-r-md` |
| `.sl-markdown-content table` | border-collapse, header bg, cell padding | `--nbg-color-bg-surface`, `--nbg-color-border-default`, `--nbg-sp-2` |
| `.starlight-aside` | base padding, radius, border-left tinted to status | shared base across aside variants |
| `.starlight-aside--note` | info colors | `--nbg-color-status-info-bg/-fg` |
| `.starlight-aside--tip` | success colors | `--nbg-color-status-success-bg/-fg` |
| `.starlight-aside--caution` | warning colors | `--nbg-color-status-warning-bg/-fg` |
| `.starlight-aside--danger` | danger colors | `--nbg-color-status-danger-bg/-fg` |
| `starlight-toc nav` | font, color, spacing | `--nbg-ff-body`, `--nbg-fs-sm`, `--nbg-color-fg-secondary`, `--nbg-sp-2` |
| `starlight-toc nav [aria-current="true"]` | accent color, left-bar indicator | `--nbg-color-accent`, `2px solid` |
| `.sidebar-content a, .sl-link-card` | typography + hover/active treatments | tokens |
| `.sidebar-content a[aria-current="page"]` | non-pill active state — left-bar `2px solid var(--nbg-color-accent)` plus bg tint via `--nbg-color-accent-bg` | (AC17 — replaces Starlight's default pill) |
| `.sidebar-content .group-label` | mono eyebrow style for sidebar group labels | `--nbg-ff-mono`, `--nbg-fs-xs`, `--nbg-ls-wide` |

#### §S.13.11.2 — Pagefind modal

Already retinted via the `--sl-color-*` alias block (§S.13.2.5). No additional selectors targeted. The modal looks like the new design simply because Starlight's existing internal aliasing now points at the new tokens. AC31 met.

### §S.13.12 — Migration / removal contract

For each pre-existing file/asset, the redesign decides keep / delete / rewrite-in-place. Plan-004 §3–§4 lists which phase performs each change.

| Item | Decision | Owning phase | Rationale |
|---|---|---|---|
| `site/src/styles/custom.css` | **Delete** | P4.A | Content absorbed into `tokens/*.css` + per-component scoped styles + `components.css`. `.audience-hidden` rule preserved verbatim in `components.css` (or a new `tokens/utilities.css` — Designer's call at P4.A). |
| `site/src/components/HomeHero.astro` | **Delete** | P4.E | Centered-single-column pattern is exactly what AC5 forbids. Homepage hero is composed directly in `index.mdx` using primitives + `HomeStats`. Designer at P4.E may keep `HomeHero.astro` as a thin composed wrapper if Phase 6 prefers separation of concerns; if kept, it must NOT be a centered single-column with two CTAs. Default: delete. |
| `site/src/components/AudienceBadge.astro` | **Rewrite in place** | P4.I | Internally renders `<Badge tone={audience}>...</Badge>`. Keeps name + import path. Same prop signature (`{ audience: 'beginner' | 'advanced' | 'both' }`). The component remains a thin semantic wrapper — Designer chose not to alias-rename because consumers across pages + cards consistently use `AudienceBadge` as a noun. |
| `site/src/components/ConfidenceChip.astro` | **Rewrite in place** | P4.I | Internally renders `<Badge tone={confidence}>...</Badge>` with `confidence: 'high' | 'medium' | 'low'` mapping to `Badge`'s `'high' | 'medium' | 'low'` tones. Same name + import path. |
| `site/src/components/NewsPanel.astro` | **Rewrite in place** | P4.I | Composes primitives. `getRecentNews()` call unchanged. The legacy `.news-card-grid` class is gone; replaced by `<Stack>` + `<Card variant="feature">` (lead) + `<Card variant="content">` (rest). |
| `site/src/components/NewsList.astro` | **Rewrite in place** | P4.I | Mirrors NewsPanel layout pattern. Same `getRecentNews()` call. |
| `site/src/components/SkillCard.astro` | **Rewrite in place** | P4.I | Composes `<Card variant>` per featured/lead vs content. Same `entry: CollectionEntry<'skills'>` prop. |
| `site/src/components/AudienceFilter.astro` | **Visual restyle in place** | P4.I | `<input type="checkbox">` × 3 stays real (AC35 + A6). `<script>` block preserved verbatim. Only the wrapping `<form>` and label styling change — visually reads as a segmented control. |
| `site/src/components/PinButton.astro` | **Visual restyle in place** | P4.I | All ARIA, data-attributes, and `<script>` preserved bit-for-bit (AC23). Styles internally compose Button's CSS-token consumer pattern. |
| `site/src/components/SignInModal.astro` | **Visual restyle in place** | P4.I | All ARIA, `data-nbg-signin-*`, focus-trap `<script>` preserved bit-for-bit. Token-driven bg/border/shadows. |
| `site/src/components/SocialIconsOverride.astro` | **Visual restyle in place** | P4.I | Slot override mechanism (`components.SocialIcons` in astro.config.mjs) untouched. Chip styling consumes tokens. |
| `astro.config.mjs` `customCss` array | **Replace** | P4.A → P4.B → P4.J → P4.K | Initial `customCss: ['./src/styles/custom.css']` replaced with `['./src/styles/tokens.css']`. Subsequent phases append `content-override.css` (P4.J) and `view-transitions.css` (P4.K) and `reduced-motion.css` (P4.A). `components.css` is `@import`ed by `tokens.css` so it doesn't appear in the array. |
| `astro.config.mjs` `fonts` block | **Add** | P4.B | Astro Fonts API + Fontsource for Inter + JetBrains Mono. Block sourced verbatim from Astro Fonts research doc. |
| `astro.config.mjs` `sidebar` array | **Untouched** | n/a | Frozen per AC32. |
| Test files under `site/tests/*.test.ts` | **Read-only unless asserting changed DOM** | P4.I + P4.H verify | Per plan §5 + Investigation §"Test rewriting cost": 104/127 are pure unit tests of `lib/`, immune. The remaining ~23 (PinButton, modal, my-pins integration) target behavior, not DOM structure. Budget: ≤ 5 assertion updates, 0 deletions. AC30 floor of 127 stays. |
| `site/src/lib/*.ts` | **Untouched** | n/a | CONTRACT per A17. AC23 ARIA preservation includes the events lib modules dispatch. |
| `site/src/content.config.ts` | **Untouched** | n/a | Out-of-scope per refined spec. |
| `site/scripts/build-pin-index.ts` | **Untouched** | n/a | A18. |
| `site/public/_data/*.json` | **Untouched** | n/a | Build-emitted artifacts. |
| Plan-002 design A6 "100-line cap on custom.css" | **Formally lifted** | n/a | Per refined-request A7. The redesign produces a real design system; the 100-line cap is now satisfied by the act of replacement (custom.css is deleted; the cap doesn't apply to the new token system). |
| Flat color literals (`#0a7`, `#e60`, `#08c`, `#aa6`, `#666`) | **Eradicated** | P4.I | Replaced with semantic tokens. Verifiable via `grep -E "#0a7|#e60|#08c|#aa6|#666" site/src/components/*.astro` returning 0 matches post-P4.I. |
| `.news-card-grid`, `.card-grid`, `repeat(auto-fill, minmax(18rem, 1fr))` | **Eradicated on marketing surfaces** | P4.E + P4.F + P4.I | Replaced by editorial layouts (`<Grid columns={N}>`, `<Split>`, `<Stack>`). Allowed in `Grid` primitive abstractly with non-`18rem` min if a future surface wants auto-fit semantics; the three pillar pages must not use it (per refined spec R2.2). |

### §S.13.13 — File map (deliverable shape)

The complete file inventory for Phase 6 dispatch, grouped by category.

**New token files** (P4.A):

```
site/src/styles/
├── tokens.css                          (aggregator: declares @layer order; @import primitives, semantic, aliases)
├── tokens/
│   ├── primitives.css                  (Tier 1 — raw values)
│   ├── semantic.css                    (Tier 2 — meaning, both [data-theme] scopes)
│   └── aliases.css                     (cross-system — --sl-color-* + --sl-font* bindings)
├── components.css                      (.audience-hidden utility + any Starlight-chrome class overrides absorbed from legacy custom.css)
├── reduced-motion.css                  (motion-duration token collapse under prefers-reduced-motion: reduce)
├── content-override.css                (P4.J — Starlight content-region selector overrides for /news/[slug]/)
└── view-transitions.css                (P4.K — @view-transition + crossfade keyframes)
```

**New primitive components** (P4.C):

```
site/src/components/primitives/
├── Container.astro
├── Section.astro
├── Stack.astro
├── Cluster.astro
├── Grid.astro
├── Split.astro
├── Card.astro
├── Button.astro
├── Badge.astro
├── Chip.astro
├── Kbd.astro
├── Eyebrow.astro
├── Lede.astro
├── Display.astro
├── MotionReveal.astro
└── StepIndicator.astro                 (15 files total)
```

**New shared components** (P4.D, P4.E):

```
site/src/components/
├── MarketingShell.astro                (P4.D — Starlight isolation boundary)
└── HomeStats.astro                     (P4.E — build-time getCollection() stats element)
```

**Modified existing components** (P4.I; restyled, behavior preserved):

```
site/src/components/
├── AudienceBadge.astro                 (rewritten — composes <Badge>)
├── ConfidenceChip.astro                (rewritten — composes <Badge>)
├── NewsPanel.astro                     (composes <Stack> + <Card variant="feature"|"content">)
├── NewsList.astro                      (composes <Stack> + <Card>)
├── SkillCard.astro                     (composes <Card variant="feature"|"content">)
├── AudienceFilter.astro                (visual restyle, real <input> preserved, script preserved)
├── PinButton.astro                     (visual restyle, all ARIA + data-* + script preserved)
├── SignInModal.astro                   (visual restyle, dialog ARIA + script preserved)
└── SocialIconsOverride.astro           (sign-in chip restyle; slot override untouched)
```

**Modified page files** (P4.E, P4.F, P4.G, P4.H):

```
site/src/content/docs/
└── index.mdx                           (P4.E — homepage rewritten with primitives + HomeStats)

site/src/pages/
├── skills.astro                        (P4.F — MarketingShell + editorial layout)
├── news/index.astro                    (P4.F)
├── news/[slug].astro                   (P4.J — minor data-attribute additions only)
├── tips.astro                          (P4.F)
├── glossary.astro                      (P4.F — adds search filter + A-Z chip strip)
├── reference.astro                     (P4.F)
├── contribute.astro                    (P4.F)
├── my-pins.astro                       (P4.H — restyled three states)
├── submit-skill.astro                  (P4.H — fieldset progress)
└── start-here/
    ├── day-1.astro                     (P4.G — StepIndicator + 6 section wrappers)
    └── week-1.astro                    (P4.G — opinionated "coming soon")
```

**New scripts** (P4.F, P4.K):

```
site/src/scripts/
├── glossary-filter.ts                  (P4.F — vanilla JS filter for /glossary)
└── motion.ts                           (P4.K — IntersectionObserver for [data-reveal])
```

**Deleted files:**

```
site/src/styles/custom.css              (P4.A)
site/src/components/HomeHero.astro      (P4.E — unless Designer keeps as thin composed wrapper)
```

**Config-edited files (sequenced):**

```
site/astro.config.mjs
  └─ P4.A — replace customCss array
  └─ P4.B — add fonts: [...] block
  └─ P4.J — append content-override.css to customCss
  └─ P4.K — append view-transitions.css to customCss
```

**Untouched (CONTRACT):**

```
site/src/lib/                           (all 8 modules — A17)
site/src/content.config.ts              (refined-spec out-of-scope)
site/scripts/build-pin-index.ts         (A18)
site/public/_data/*.json                (build-emitted)
astro.config.mjs sidebar: [...]         (AC32)
site/tests/*.test.ts                    (≤5 update budget, 0 deletions)
content folders (news/, skills/, tips/, glossary/, journeys/)
sibling workspaces (pipeline/, plugin/)
```

**Documentation files (P4.L):**

```
docs/design/project-design.md           (this section — §S.13)
docs/refined-requests/ui-redesign-evidence/
├── screenshots/                        (34 PNGs: 11 surfaces × 3 breakpoints + 1 light-mode example)
├── validation-script.md
└── axe-results.json
```

### §S.13.14 — Architectural decisions log

Each decision below is locked in by this design. Phase 6 implements against them; if a coder thinks a decision is wrong, they stop and surface it via `Issues - Pending Items.md`, not by silently inventing a different answer.

#### Decision §S.13.14.1 — Three-tier token system (primitive → semantic → component) instead of two

**Decision**: tokens split into three tiers. Primitive raw values. Semantic meanings under `[data-theme]` scopes. Component bindings inside each primitive's scoped style.

**Alternatives considered**: two-tier (primitives → semantic only).

**Rationale**: component-tier tokens let each primitive own its property bindings without polluting the semantic namespace with one-off names like `--nbg-card-bg`. Two-tier forces every component-internal-property either to be named at the semantic tier (pollution) or to reference primitives directly (loses the theme indirection). Three-tier keeps each layer honest: primitives = values, semantic = roles, component = bindings. Per Muz.li design-systems guide (investigation reference 14) — the dominant 2026 production pattern.

#### Decision §S.13.14.2 — `@layer` cascade order

**Decision**: `@layer reset, tokens, starlight.base, starlight.core, starlight.components, nbg.primitives, nbg.components, nbg.utilities;`.

**Rationale**: Starlight imports its CSS into `@layer starlight.*` layers. Our layers must come after to win specificity-free. Splitting `nbg.*` into primitives, components, utilities lets primitive defaults lose to component customizations (rare) and utility classes (`.audience-hidden`) lose to nothing. `reset` is reserved for a future reset.css. `tokens` is theme-neutral. The whole order is documented at the top of `tokens.css` so Phase 6 coders see it on first read.

#### Decision §S.13.14.3 — `MarketingShell.astro` as the single Starlight isolation boundary

**Decision**: one `MarketingShell.astro` wraps every marketing surface. The 11 pages become ~30-line consumers. The shell is the only file outside `tokens/aliases.css` and `SocialIconsOverride.astro` that imports from `@astrojs/starlight/*`.

**Alternatives considered**: per-page custom layouts (Option 2B in investigation), Starlight `components` deep overrides (Option 2C).

**Rationale**: Option-2 escalation cost is minimized by isolating Starlight's surface area at one file. ~73% of the work (primitives + tokens + page composition) survives an Option-2 rewrite verbatim. The investigator (Axis 2D), the plan (R-5), and this design agree.

#### Decision §S.13.14.4 — No new motion library

**Decision**: CSS transitions + ~20-line IntersectionObserver + native `@view-transition`. No `motion`, no `gsap`, no `@motionone/dom`.

**Alternatives considered**: `motion/react` (32 KB), `@motionone/dom` (10 KB), `gsap` (37 KB).

**Rationale**: aesthetic target (Linear/Vercel/Stripe) ships modest motion that doesn't need a runtime library. Refined-request A4 makes this explicit. ~50 LOC of new JS total is enough. If Phase 6 evaluation flags motion as insufficient, escalate; do not pre-pay.

#### Decision §S.13.14.5 — `[data-theme]` attribute scoping (not `@media (prefers-color-scheme)` only)

**Decision**: semantic tokens scoped under `:root, :root[data-theme='dark']` and `:root[data-theme='light']`. Primitives stay under `:root`. No `@media (prefers-color-scheme)` blocks in token files.

**Rationale**: Starlight's theme toggle sets `data-theme` on `<html>`. Matching it makes the toggle work. Pagefind research §"Dark/light mode behaviour" explicitly documents this trap. A12 (light mode is best-effort) means the design target is dark, but both modes must pass contrast.

#### Decision §S.13.14.6 — Font choice: Inter Variable + JetBrains Mono Variable via Astro Fonts API

**Decision**: Inter Variable for body + display (via `opsz` axis), JetBrains Mono Variable for code. Self-hosted via Astro Fonts API + Fontsource provider.

**Alternatives considered**: Geist Sans + Geist Mono (more distinctive but two families); system stacks (no character).

**Rationale**: one variable file covers body + display (Inter's opsz axis engages display-optimized glyphs at higher sizes). Identical bundle cost to two-file Geist. Stable Astro 6.3.5 API per research doc — no experimental flag. Lower-risk on dark-mode body legibility than Geist's heavier glyphs. If first preview reads as too neutral, Designer can swap to Geist in one config change at P4.B.

#### Decision §S.13.14.7 — Pagefind retint via `--sl-color-*` aliases, not `--pagefind-ui-*` overrides

**Decision**: our `tokens/aliases.css` overrides Starlight's `--sl-color-*` tokens. Starlight's own internal aliasing pipes them into `--pagefind-ui-*`. We do not write any `--pagefind-ui-*` lines.

**Rationale**: Pagefind research doc §"Key insight — Starlight already does the work" found Starlight's `Search.astro` already aliases `--sl-color-*` → `--pagefind-ui-*` in `<style is:global>` lines 257–270. Overriding at Starlight's layer is one fewer indirection, picks up Starlight's BEM-selector overrides for free, and survives any future Starlight upgrade that tweaks its own aliasing.

#### Decision §S.13.14.8 — 14 primitives + StepIndicator = 15 total, hand-rolled

**Decision**: 15 primitive `.astro` files. No utility CSS framework. No component library import.

**Alternatives considered**: bejamas/ui, shadcn-style copy-and-own libraries, Tailwind v4 + `@astrojs/starlight-tailwind`.

**Rationale**: portability is binding (AC36–AC37). Hand-rolled primitives travel verbatim through an Option-2 escalation. Tailwind's `@theme` block creates a two-sources-of-truth risk against R11. bejamas/ui couples to Tailwind v4. ~360 LOC of `.astro` is two days of writing for a design system that's exact-fit.

#### Decision §S.13.14.9 — `<Grid columns="auto-fit">` is a primitive but never used with `min="18rem"` on the three pillar pages

**Decision**: the `Grid` primitive supports auto-fit semantics (for surfaces where it genuinely fits — e.g., the homepage "Where to start" 4-card grid). It is explicitly forbidden with `min` value of `18rem` (or near-equivalents) on `/skills/`, `/news/`, `/tips/` per refined spec R2.2 + AC8/AC9/AC10. Phase 6 lint at P4.F verifies via `grep`.

**Rationale**: the redesign brief names uniform `repeat(auto-fill, minmax(18rem, 1fr))` as a specific anti-pattern to eradicate. Primitives are general-purpose; per-surface constraints enforce the brief.

#### Decision §S.13.14.10 — Day-1 step segmentation via hand-coded section wrappers, not markdown re-parsing

**Decision**: `day-1.astro` hand-codes six `<section id="step-N">` wrappers and renders the corresponding markdown chunks via Astro's `<Content />` slot mechanism. No build-time markdown parsing.

**Rationale**: programmatically parsing `journeys/day-1.md` at build time adds fragility (depends on the markdown's heading structure surviving content edits). Hand-coded wrappers around `<Content />` slices is a layout decision, not a content edit — the visible copy remains the markdown's. AC6 requires `#step-N` anchors, not derivation from the source. Cleaner contract for Phase 6.

#### Decision §S.13.14.11 — `AudienceBadge` and `ConfidenceChip` stay as named components, internally composing `<Badge>`

**Decision**: do not alias `AudienceBadge.astro` to a direct `<Badge tone>` call site at every consumer. Keep both component names; internally each renders `<Badge>`.

**Alternatives considered**: delete both, replace usages with `<Badge tone={...}>` at consumers.

**Rationale**: semantic naming. Consumers reading the JSX should see `<AudienceBadge audience={item.data.audience} />` and know what they're rendering. The `<Badge>` primitive exists for the *new* tones (status, neutral). Wrapping at the named-component level keeps the existing import graph stable (10 files import `AudienceBadge`; updating them all to `<Badge tone="beginner">` is busywork that breaks the diff against AC23 ARIA preservation).

#### Decision §S.13.14.12 — Reduced-motion is enforced at three layers (defense in depth)

**Decision**: motion-disabled enforcement at the cascade layer (token collapse via `reduced-motion.css`), at component-level CSS (per-component `@media (prefers-reduced-motion: reduce)` blocks), and at JS (early-return in `motion.ts`).

**Rationale**: AC22 is a hard gate. Any one layer breaking shouldn't break the overall guarantee. Token-level collapse covers every `transition: ... var(--nbg-dur-*)` rule the project will ever write. CSS overrides catch primitives that don't use duration tokens (rare). JS early-return ensures observer state machines don't fire even if CSS missed something.

#### Decision §S.13.14.13 — `prefers-color-scheme` is honored only insofar as Starlight already honors it

**Decision**: we don't add `@media (prefers-color-scheme)` blocks. Starlight's ThemeProvider does the OS-preference detection on first paint and sets `data-theme` accordingly. Our tokens scope under `[data-theme]`, so the system-honoring path goes Starlight → `data-theme` → tokens.

**Rationale**: AC24 (dark default, no flicker) is Starlight's responsibility, not ours. Adding our own `@media` rules would race against Starlight's inline script.

#### Decision §S.13.14.14 — Cross-document view transitions only; no `<ClientRouter />`

**Decision**: `@view-transition { navigation: auto; }` in `view-transitions.css`. No `<ClientRouter />` import in `MarketingShell.astro`.

**Rationale**: investigation Axis 8B is the cheapest aesthetic win. `<ClientRouter />` (Option 8C) forces every client script (PinButton, SignInModal, AudienceFilter, my-pins, submit-skill, SocialIconsOverride) to listen for `astro:page-load` instead of `DOMContentLoaded` — a real refactor across 5+ files with test fragility risk. If Phase 6 evaluation says "auth-chip flicker on navigation is a blocker," escalate to 8C; do not pre-pay.

#### Decision §S.13.14.15 — File deletion is part of the deliverable

**Decision**: `site/src/styles/custom.css` is deleted (P4.A). `site/src/components/HomeHero.astro` is deleted (P4.E, default — Designer may keep as composed wrapper). The redesign produces a real design system; the legacy `custom.css` was an MVP shim and the legacy `HomeHero` is exactly the anti-pattern.

**Rationale**: keeping deprecated files around as "for reference" silently degrades the codebase. Phase 6 coders should see a clean tree on first scan.

### §S.13.15 — AC ↔ §S.13 cross-reference

Every AC1–AC39 from the refined request has at least one §S.13.x section as its design anchor. Where the plan (plan-004) is the primary evidence, that's noted too.

| AC | §S.13 anchor | Plan-004 phase | What the design fixes |
|---|---|---|---|
| AC1 | §S.13.2.2–§S.13.2.4 | P4.A | Token surface ≥ 60 (delivers ~245); audience/confidence/status/focus all defined; sizes 8+ (12 steps); weights, spacing 10+ (17), radii 4+ (8), shadow 4+ (5+focus+glow), motion 3 dur + 4 ease, z-index 5+ (6) |
| AC2 | §S.13.13 (file map) | P4.A | `customCss` references `tokens.css` |
| AC3 | §S.13.2.3 + §S.13.8 | P4.A | Both `[data-theme='dark']` and `[data-theme='light']` override blocks |
| AC4 | §S.13.2.2 → §S.13.2.5 ordering | P4.A | `--nbg-*` defined first; `--sl-color-*` aliased to them in `aliases.css` |
| AC5 | §S.13.10.1 | P4.E | Asymmetric hero via `<Split>`, ≥ 80vh via `Section spacing="epic"`, headline `<Display level={1} size="xl">` computes ≥ 80px → exceeds 64px floor |
| AC6 | §S.13.5.16 + §S.13.10.2 + §S.13.14.10 | P4.G | StepIndicator + 6 `<section id="step-N">` blocks; sticky desktop; horizontal compact mobile |
| AC7 | §S.13.10.3 | P4.G | Opinionated "what's coming" with 3 deep-link cards; no centered button stub |
| AC8 | §S.13.10.4 | P4.F | Featured-lead `<Card variant="feature">` + alternating-density grid; AudienceFilter still works |
| AC9 | §S.13.10.5 | P4.F | Lead news in feature card; magazine stack of remaining items |
| AC10 | §S.13.10.6 | P4.F | Grouped-by-cluster sections with pull-quotes; not a uniform grid |
| AC11 | §S.13.10.7 | P4.F | `<input data-glossary-filter>` + A-Z chip strip + `[data-term]` wrappers |
| AC12 | §S.13.10.8 | P4.F | New typographic style; no naked Starlight chrome on reference page |
| AC13 | §S.13.10.9 | P4.F | `<Split>` two-path layout; `<Button variant="primary">` CTA visually integrated |
| AC14 | §S.13.10.10 | P4.H | Three states distinct; 5 pin-type sections; editorial privacy callout; modal trigger preserved |
| AC15 | §S.13.10.11 | P4.H | Numbered fieldsets; inline validation via status tokens; slug-collision Badge; logic untouched |
| AC16 | §S.13.11.1 | P4.J | `content-override.css` targets `.sl-markdown-content {h*,p,a,code,pre,blockquote,table}` with tokens |
| AC17 | §S.13.11.1 (sidebar selector) | P4.J | Non-pill active state via 2px accent left-bar |
| AC18 | §S.13.11.1 (TOC selectors) | P4.J | TOC restyled with `--nbg-fs-sm`, `--nbg-color-fg-secondary`, accent current marker |
| AC19 | §S.13.11.1 (aside selectors) | P4.J | All four aside variants use status semantic tokens |
| AC20 | §S.13.9 (focus row) | P4.K verifies | `--nbg-color-focus-ring` 2px on every `:focus-visible` via `--nbg-sh-focus-ring` |
| AC21 | §S.13.2.3 contrast pairs + §S.13.9 | P4.L verifies | Audience/confidence/status pairs chosen for AA both modes; axe-core run in P4.L |
| AC22 | §S.13.7.2 + §S.13.2.6 + §S.13.7.1 | P4.A + P4.K | Three-layer reduced-motion enforcement |
| AC23 | §S.13.12 + §S.13.9 | P4.I + P4.H | Restyle-in-place rule preserves all `aria-*`/`role`/`data-*`/script verbatim |
| AC24 | §S.13.8.1 (Starlight ThemeProvider untouched) | P4.A | Inline `<head>` script that sets `data-theme` is not touched |
| AC25 | §S.13.2.3 light overrides | P4.A | Light tokens cover every semantic role |
| AC26 | §S.13.4.2 + §S.13.9 touch-target row | P4.E + P4.F + P4.H | Mobile breakpoint primitives; ≥44px touch targets |
| AC27 | §S.13.4.1 layout primitives | P4.F | `<Grid columns={N}>` adapts via container queries |
| AC28 | §S.13.4 + §S.13.10 each surface | P4.E + P4.F + P4.G + P4.H | Each surface chooses its `Container width` deliberately |
| AC29 | n/a (verification) | P4.L | No new deprecation warnings (plan §11 R-12) |
| AC30 | §S.13.12 test-floor rule | P4.L | ≤5 updates, 0 deletions; floor stays 127 |
| AC31 | §S.13.8.4 + §S.13.11.2 | P4.A | Pagefind retints via `--sl-color-*` aliases automatically |
| AC32 | §S.13.12 (sidebar untouched) | n/a | Sidebar config frozen |
| AC33 | §S.13.8.1 | n/a | Starlight toggle untouched; `[data-theme]` scoping makes it work |
| AC34 | §S.13.10.10 + §S.13.12 SignInModal row | P4.H + P4.I | Modal restyle preserves ARIA + script; sign-in chip retained in SocialIconsOverride |
| AC35 | §S.13.10.4 / §S.13.10.5 / §S.13.12 AudienceFilter row | P4.I | Real checkboxes; localStorage; `.audience-hidden` preserved |
| AC36 | §S.13.5 portability rule + §S.13.6 isolation | P4.C + P4.D | Primitives grep clean; shell is sole Starlight importer |
| AC37 | §S.13.14.3 (Option-2 cost analysis) | P4.L smoke | Token file loadable standalone in blank Astro page |
| AC38 | §S.13.13 evidence folder | P4.L | 34 PNGs captured |
| AC39 | §S.13.13 + plan §2 P4.L | P4.L | validation-script.md filled in |

Every AC has a backing design anchor. Phase 6 coders can pick up any phase P4.* and execute from this section alone plus the plan.

---

## §S.13.16 — AgentNews aesthetic anchor (2026-05-24)

This is a **value-only retune** of the §S.13 token system to match the AgentNews design language captured in `docs/reference/investigation-agentnews-aesthetic.md`. The three-tier architecture (primitives → semantic → aliases), the portability gate (AC36/AC37 of the AgentNews refined spec), and the 16 primitives under `site/src/components/primitives/` are all preserved. Token *names* survive; token *values* change. A new layout-class CSS file (`site/src/styles/agentnews-layout.css`) is added to host AgentNews's `.site-header`, `.hero`, `.section`, `.feature`, `.card`, `.tag`, `.eyebrow`, `.dates`, `.empty`, `.theme-toggle` class APIs. The 11 marketing surface page bodies are rewritten to use these class APIs.

### §S.13.16.1 — Anchor source

The AgentNews homepage at `https://biks2013.github.io/AgentNews/` is the source of truth. Its entire design system fits in a single 13,636-byte inline `<style>` block (preserved at `docs/research/agentnews-source/home-inline-styles.css`) plus three Google Fonts (`IBM Plex Sans`, `IBM Plex Mono`, `Newsreader`). The full investigation is at `docs/reference/investigation-agentnews-aesthetic.md` — it captures the 14-token palette, 3-font type scale, full-bleed surface + contained `.wrap` layout, three-section card pattern, single transition motion budget, and `data-theme` toggle mechanism.

### §S.13.16.2 — Palette (replaces §S.13.2)

Light is the default theme on AgentNews. The retune flips the NbgAiHub default to light, matching AgentNews. Dark is opt-in via `:root[data-theme="dark"]` OR `prefers-color-scheme: dark` AND no explicit `data-theme="light"`. Persisted under `localStorage.starlight-theme` (sharing key with Starlight `ThemeSelect`).

| Semantic token   | Light  | Dark   | Role |
|------------------|--------|--------|------|
| `--nbg-bg`       | `#f4f6f9` | `#0b1419` | App background |
| `--nbg-bg-2`     | `#eef2f7` | `#0f1c24` | Subdued bg |
| `--nbg-surface`  | `#ffffff` | `#14232c` | Card / panel base |
| `--nbg-surface-2`| `#f8fafc` | `#1a2d38` | Card art bg, search-trigger bg |
| `--nbg-ink`      | `#0b1e2e` | `#e6edf3` | Primary text |
| `--nbg-ink-2`    | `#1a3148` | `#c5d1dc` | Secondary text |
| `--nbg-muted`    | `#5b6b80` | `#8b9aab` | Muted text |
| `--nbg-muted-2`  | `#8392a6` | `#6b7a8c` | Hairline icons |
| `--nbg-border`   | `#dce3eb` | `#243441` | Solid borders |
| `--nbg-hairline` | `#ebeff5` | `#1c2b36` | 1px dividers |
| `--nbg-accent`   | `#007a8a` | `#2dd4bf` | Active nav / link hover / accents (teal) |
| `--nbg-accent-ink`| `#00525c` | `#67e8f9` | High-emphasis accent |
| `--nbg-accent-soft`| `#e0f2f4` | `#0a3a42` | Tag-as-link background |
| `--nbg-header-bg`| `rgba(244,246,249,.82)` | `rgba(11,20,25,.85)` | Sticky-nav backdrop |

Shadow (single token): `--nbg-shadow-md` carries AgentNews's compound (soft drop + 1px hairline outline).

Radii: `--nbg-radius-sm 6px`, `--nbg-radius 10px`, `--nbg-radius-lg 16px`, `--nbg-radius-pill 999px`.

### §S.13.16.3 — Type (replaces §S.13.3)

Three families:
- `--nbg-font-sans` = `'IBM Plex Sans', system-ui, -apple-system, sans-serif`
- `--nbg-font-mono` = `'IBM Plex Mono', ui-monospace, monospace`
- `--nbg-font-serif` = `'Newsreader', Georgia, serif` (NEW — display serif for hero / feature / empty-state titles)

Full type scale documented in investigation §2. Hero: `clamp(40px, 5vw, 64px)` Newsreader 500. Feature title: `clamp(28px, 3vw, 40px)`. Card title: 22px. Mono eyebrows: 11px uppercase tracked `.12em`. Italic-em accent on hero is the signature flourish.

### §S.13.16.4 — Layout (replaces §S.13.4)

**Container `.wrap`:** `max-width: 1240px; margin: 0 auto; padding: 0 32px;`. Mobile (≤720px): `padding: 0 20px;`.

**Full-bleed strategy:** the section elements span full viewport width with their background colour. The `.wrap` inside each section caps the content at 1240px. So "full-bleed surfaces, contained content" — NOT edge-to-edge content. AC6-AC9 satisfied by computed `getBoundingClientRect().width` on the outer section equalling the viewport width.

**Grids:** `.grid-3` `repeat(3, 1fr)` → `1fr` at ≤880px. `.feature` `1.4fr 1fr` → `1fr`. `.hero__intro` `2fr 1fr` → `1fr`. `.footer-grid` `2fr repeat(3, 1fr)` → `1fr 1fr`.

**Breakpoints in practice:** 720 / 880 / 920.

### §S.13.16.5 — Layout class API (new file)

`site/src/styles/agentnews-layout.css` hosts the AgentNews class APIs. Primitives under `site/src/components/primitives/` are **not** restructured — they continue to consume only `--nbg-*` tokens and remain Starlight-free (AC37). The new file is a parallel layer used by marketing-surface page bodies.

Class API (14 named atoms + their modifiers): `.wrap`, `.site-header`, `.brand`, `.nav`, `.header-actions`, `.search-trigger`, `.theme-toggle`, `.hero`, `.hero__intro`, `.hero__title`, `.hero__lede`, `.section`, `.section__head`, `.feature` (+`.feature__art`, `.feature__body`, `.feature__title`, `.feature__cta`), `.grid-3`, `.card` (+`.card__art`, `.card__body`, `.card__meta`, `.card__title`, `.card__summary`), `.tag` (+`.tag--link`), `.eyebrow` (+`.eyebrow.accent`), `.dot`, `.dates` (+`.date-item`, `.date-label`, `.date-value`), `.external-host`, `.empty`, `.site-footer`, `.footer-grid`.

### §S.13.16.6 — Theme switching (refines §S.13.8)

AgentNews's `data-theme` + localStorage mechanism is structurally identical to Starlight's `ThemeSelect`. NbgAiHub delegates the marketing-surface theme-toggle button to the SAME `data-theme` attribute and the SAME `starlight-theme` localStorage key — no JS conflict, both surfaces honour the same persisted choice.

**Default theme: `light`** (was `dark`). Intentional flip to match AgentNews. Accessibility floor remains WCAG AA in both modes.

**No-flash early-applied script** in `MarketingShell` so initial paint carries the correct theme. AgentNews itself omits this; NbgAiHub improves on it.

### §S.13.16.7 — Motion (refines §S.13.7)

AgentNews has **no scroll-reveal motion**. Only three hover transitions exist, each 120-150ms. `MotionReveal` stays a no-op (closes pending #5).

`prefers-reduced-motion: reduce` is honoured via a single `@media` block in `agentnews-layout.css` that collapses all transitions to 0.01ms.

### §S.13.16.8 — News three-section pattern

Render-time discrimination via a new pure-function helper `site/src/lib/news-sections.ts`. **No schema change** to `site/src/content.config.ts`. Heuristic: `source` starts `r/` → AI-News; `source` matches `youtube\.com|youtu\.be` → Deep Dives; otherwise → Articles.

### §S.13.16.9 — Reference

- Investigation: `docs/reference/investigation-agentnews-aesthetic.md`
- Plan: `docs/design/plan-005-agentnews-aesthetic.md`
- Refined request: `docs/refined-requests/agentnews-aesthetic-match.md`
- AgentNews source HTML: `docs/research/agentnews-source/home.html`
- AgentNews source CSS: `docs/research/agentnews-source/home-inline-styles.css`

§S.13.16 supersedes §S.13.2 colour values, §S.13.3 type scale, §S.13.4 layout primitives, and §S.13.8 theme defaults for marketing surfaces.

---

*End of UI Redesign section.*

---

## §S.14 — Glossary Tooltips

Design contract for the glossary auto-linking + hover tooltip feature. Authoritative companions:
- Refined spec: `docs/refined-requests/glossary-tooltips.md` (31 ACs, 10 assumptions).
- Plan: `docs/design/plan-006-glossary-tooltips.md` (phases A → B → C → D — locked, not re-sequenced here).
- Glossary count after Phase A: **28** (21 existing + 7 new — `cli`, `frontmatter`, `yaml`, `markdown`, `rss`, `model`, `hook`). Plan still says 27 in places; see §S.14.10 R-1.

This section specifies interfaces, data models, file paths, the remark plugin contract, the `GlossaryTerm.astro` component API, error handling, token usage, and the test contracts. Coders execute against these interfaces in parallel without re-reading each other's code.

### §S.14.1 — Schema delta

`site/src/content.config.ts` — extend the `glossary` collection's `z.object()` with **two** new keys layered on top of `baseShape('glossary')`. No other collection is touched.

```ts
// site/src/content.config.ts — glossary collection (after edit)
const glossary = defineCollection({
  loader: glob({ pattern: '*.md', base: '../glossary' }),
  schema: z.object({
    ...baseShape('glossary'),
    // §S.14.1 — Glossary tooltips feature. Required short form, ≤160 chars,
    // plain text (no markdown). Build fails loud if missing or oversize —
    // per global CLAUDE.md "Never create fallback values for missing
    // configuration."
    tldr: z
      .string({ required_error: 'glossary entry missing required field "tldr"' })
      .min(1, 'tldr must be a non-empty string')
      .max(160, 'tldr must be ≤160 characters (plain text, no markdown)'),
    // §S.14.1 — Optional alias list. Defaults to [] so remark plugin can
    // iterate uniformly without nullish guards. Lowercase or original
    // casing both acceptable in source; matcher is case-insensitive.
    aliases: z
      .array(z.string().min(1))
      .default([]),
  }),
});
```

**Field constraints — table form:**

| Field | Type | Constraint | Required | Default |
|---|---|---|---|---|
| `tldr` | `z.string()` | `.min(1).max(160)` plain text | **yes** | n/a — Zod throws on missing |
| `aliases` | `z.array(z.string().min(1))` | each alias `.min(1)` (no empty strings) | no | `[]` (NOT `undefined`) |

**Validation error wording (frozen — tests assert exact substrings):**
- Missing `tldr` → `'glossary entry missing required field "tldr"'` (via `required_error`).
- Oversize `tldr` → `'tldr must be ≤160 characters (plain text, no markdown)'`.
- Empty `tldr` (empty string) → `'tldr must be a non-empty string'`.
- Non-array `aliases` → standard Zod `'Expected array, received …'` (not custom-overridden — Zod's wording is clear enough).

**Why `.default([])` not `.optional()`:** the remark plugin's index-builder iterates `[entry.id, ...entry.data.aliases]` for every glossary entry to build the term→slug map. A default of `[]` removes a per-entry nullish guard from the hot loop. The spec §3 mandates `.default([])` explicitly.

**Why NOT extend `baseShape`:** only the glossary collection consumes these fields. Folding `tldr` into `baseShape` would force every news / skill / tip / journey entry to carry a tldr — out of scope. Glossary-only is the deliberate placement.

### §S.14.2 — Glossary MD frontmatter template

The complete **12-key** frontmatter shape for new glossary entries (10 inherited from `baseShape` + 2 new):

```yaml
---
type: glossary                    # 1. literal, enforced by baseShape
title: "Command-line interface (CLI)"  # 2. string, min 1
audience: beginner                # 3. enum beginner|advanced|both
topics: [foundations, terminal]   # 4. string array
internal: false                   # 5. bool
authored: "2026-05-25"            # 6. YYYY-MM-DD
last_reviewed: "2026-05-25"       # 7. YYYY-MM-DD
external_link: null               # 8. URL or null
deeper_link: null                 # 9. URL or null
ai_summary: "A CLI is the text-based interface for invoking commands by typing them — claude, gh, git, npm all live here." # 10. string
tldr: "The text interface for running tools like claude, gh, git, and npm. You type a command and it runs." # 11. NEW — ≤160 chars
aliases: ["command-line interface", "command line"] # 12. NEW — defaults to [] when omitted
---

A **CLI** (command-line interface) is …
```

**Worked `cli.md` example** (tldr is 102 chars including spaces — comfortably ≤160):

```
tldr: "The text interface for running tools like claude, gh, git, and npm. You type a command and it runs."
```

**Slug derivation:** Astro's `glob` loader derives `entry.id` from the filename minus `.md`. So `glossary/cli.md` → `entry.id === 'cli'`. The `slug` is NOT a separate frontmatter key — it's the filename. This is consistent with the existing 21 entries; no change.

**Alias contract (frozen for Phase A authors):**

| Slug | Aliases |
|---|---|
| `pull-request` | `["PR", "PRs"]` |
| `repository` | `["repo", "repos"]` |
| `hook` | `["hooks"]` (new entry — see §S.14.10 R-1) |
| `skill` | `["skills"]` |
| `plugin` | `["plugins"]` |
| `large-language-model` | `["LLM", "LLMs"]` |
| `claudemd` | `["CLAUDE.md"]` |
| all other 21 entries | author's discretion, `[]` if no obvious alias |

### §S.14.3 — Remark plugin contract

**File path (overrides plan + refined spec):** `site/src/plugins/remark-glossary-link.ts`.

Justification for override: the plan suggests `site/src/lib/remark-glossary.ts` and the refined spec suggests `site/src/lib/remark-glossary.ts`. The `site/src/lib/` folder is for runtime-import shared modules (slug, auth, api-fetch, etc.). A build-time remark plugin is **not** runtime code — it's loaded only by `astro.config.mjs`. Placing it under `src/plugins/` matches Astro convention and prevents future contributors from accidentally importing the plugin into a page component (which would explode at runtime — node-only deps). All test files still live in `site/tests/` per plan.

#### Module signature

```ts
// site/src/plugins/remark-glossary-link.ts
import type { Plugin } from 'unified';
import type { Root, Text, Parent } from 'mdast';

export interface GlossaryEntry {
  /** Canonical slug — filename minus `.md`, e.g. "pull-request". */
  slug: string;
  /** Display title from frontmatter — used as fallback if `display` is omitted at render. */
  title: string;
  /** Lower-cased term variants (slug + each alias) — what the matcher actually scans for. */
  variants: string[];
}

export interface RemarkGlossaryLinkOptions {
  /** Absolute or relative path to the glossary content dir. Required. */
  glossaryDir: string;
  /**
   * Path substring tests. If `file.path` includes ANY of these, the plugin
   * returns early without mutating the AST. Default: ['/news/published/'].
   */
  excludePaths?: string[];
  /**
   * Optional. When set, the plugin emits raw HTML nodes (type: 'html')
   * instead of MDX JSX nodes. Used as a fallback if Astro/Starlight's MDX
   * processor strips unknown component refs (refined spec A10, plan R2).
   * Default: false (try JSX first; switch to true via env var if needed).
   */
  emitHtmlFallback?: boolean;
}

export default function remarkGlossaryLink(
  options: RemarkGlossaryLinkOptions,
): Plugin<[], Root, Root>;
```

#### Initialization contract

The glossary index is built **once at plugin factory time** (the outer `remarkGlossaryLink(options)` call), NOT on every file pass.

```ts
// pseudo-code — actual code in site/src/plugins/remark-glossary-link.ts
export default function remarkGlossaryLink(options: RemarkGlossaryLinkOptions): Plugin<[], Root, Root> {
  if (!options?.glossaryDir) {
    throw new Error('remark-glossary-link: options.glossaryDir is required (no fallback).');
  }
  const index: Map<string, GlossaryEntry> = buildGlossaryIndex(options.glossaryDir);
  // index: keyed by lower-cased variant (slug OR alias), value is the canonical entry.
  // Built ONCE. Astro re-invokes the factory between dev hot-reloads when the config
  // changes, so HMR-on-glossary-edits is acceptable as a known limitation.

  const excludePaths = options.excludePaths ?? ['/news/published/'];
  const emitHtml = options.emitHtmlFallback ?? false;

  return function transformer(tree, file) {
    // per-file state — first-occurrence tracking lives here
    if (excludePaths.some(p => (file.path ?? '').includes(p))) return;
    const matched: Set<string> = new Set();              // canonical slugs already wrapped in this file
    const currentSlug = deriveCurrentGlossarySlug(file); // null if file isn't under glossary/
    visit(tree, predicate, (node, idx, parent) => {
      // ... see "AST visitor contract" below
    });
  };
}
```

**Index structure:** `Map<string, GlossaryEntry>` keyed by `variant.toLowerCase()`. Conflict resolution: see §S.14.7.

#### AST visitor contract

Use `unist-util-visit` with **an inclusion test + an ancestor-aware skip filter**:

```ts
import { visit, SKIP } from 'unist-util-visit';

// Skip subtrees whose root we shouldn't descend into.
// Returns SKIP to halt traversal into the node + its children.
visit(tree, (node: any, _index: number | undefined, parent: any) => {
  if (parent === null || parent === undefined) return; // root
  // Skip these subtrees entirely (don't descend):
  if (node.type === 'code')           return SKIP; // fenced code blocks
  if (node.type === 'inlineCode')     return SKIP; // `…` inline code
  if (node.type === 'heading')        return SKIP; // h1–h6
  if (node.type === 'link')           return SKIP; // [text](url) — existing links
  if (node.type === 'linkReference')  return SKIP;
  if (node.type === 'definition')     return SKIP;
  if (node.type === 'html')           return SKIP; // raw HTML — leave alone
  // Starlight asides (remark-directive): containerDirective with name in
  // {note, tip, caution, danger}.
  if (
    node.type === 'containerDirective' &&
    ['note', 'tip', 'caution', 'danger'].includes(node.name)
  ) return SKIP;

  // We DO descend into: paragraph, listItem, tableCell, blockquote,
  // emphasis, strong, delete (formatting nodes nest), and into the actual
  // 'text' leaves. Matching happens on 'text' nodes only.
  if (node.type !== 'text') return; // descend, don't match
  // ... matching logic — see next subsection
});
```

**Why `SKIP` not `'skip'`:** `unist-util-visit` returns the `SKIP` constant; semantics: do NOT descend into this subtree, continue with the next sibling. This is the cleanest way to enforce the skip rules without per-text-node ancestor inspection.

**Nested-formatting matching:** because `emphasis` / `strong` / `delete` are NOT in the skip list, the visitor descends into them and matches on their inner `text` leaves. So `*pull request*` in source markdown becomes `emphasis > text("pull request")` — the visitor reaches the text and wraps it. Edge case: if a term is split across formatting (e.g. `pull *request*` → two siblings `text("pull ")` + `emphasis > text("request")`), the visitor sees only `"pull "` and `"request"` in isolation — neither matches `"pull request"`. **Accepted limitation** — see §S.14.10 R-3.

#### Match algorithm

Build **one alternation regex** at index-build time, sorted **longest-first** so multi-word aliases win against single-word substrings (e.g. `command-line interface` matches before `command-line` ever has a chance):

```ts
function buildMatcherRegex(index: Map<string, GlossaryEntry>): RegExp {
  const variants = [...index.keys()]
    .sort((a, b) => b.length - a.length)        // longest first
    .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // regex-escape
  // Boundary rule:
  //   left  = start-of-string, or a non-[A-Za-z0-9_] char (so hyphen, space,
  //           punctuation, opening quote all count as boundaries).
  //   right = end-of-string, or a non-[A-Za-z0-9_] char.
  // Using \b is WRONG here: \b treats hyphen as a word boundary BUT also
  // matches inside hyphenated compounds in ways we don't want. We use
  // explicit lookarounds.
  return new RegExp(
    `(?<![A-Za-z0-9_])(${variants.join('|')})(?![A-Za-z0-9_])`,
    'gi',
  );
}
```

**Boundary table:**

| Source text | Variant `cli` | Match? |
|---|---|---|
| `"use the cli now"` | `cli` | ✅ yes — surrounded by spaces |
| `"click here"` | `cli` | ❌ no — `c` after is `[A-Za-z]` (right boundary fails) |
| `"command-line"` | `cli` | ❌ no — `cli` does not appear; but if it did, the hyphen IS a boundary |
| `"agent2"` | `agent` | ❌ no — `2` is `[0-9]` (right boundary fails) |
| `"agent."` | `agent` | ✅ yes — `.` is a boundary |
| `"ALLOWED"` | `LLM` (lowercase-keyed) | ❌ no — match is case-insensitive but `LLOW` surrounds `LLM`; specifically `A`/`O` are alphanumeric, both lookarounds fail |
| `"LLMs"` (with `LLMs` as alias) | `LLMs` | ✅ yes — variant exists, full word |
| `"LLMs"` (without `LLMs` alias, only `LLM`) | `LLM` | ❌ no — `s` after fails right boundary |

The regex is **case-insensitive** (`i` flag) but **case-preserving** in display: the matched substring (from `match[1]`) is what gets passed as the `display` prop. Lookup of the canonical slug uses `match[1].toLowerCase()` against the index.

#### First-occurrence tracking

Per-file `Set<string>` keyed by **canonical slug** (not by variant) — so matching `"PR"` then `"pull request"` in the same file wraps only the first one (both resolve to slug `pull-request`):

```ts
const matched: Set<string> = new Set();
// inside the text-node handler:
const m = textValue.matchAll(matcherRegex);
for (const hit of m) {
  const variant = hit[1].toLowerCase();
  const entry = index.get(variant)!;             // guaranteed by regex source
  if (matched.has(entry.slug)) continue;          // already wrapped earlier on this page
  if (entry.slug === currentSlug) continue;       // self-page skip
  matched.add(entry.slug);
  // ... split text node at hit, insert wrapper node, see "Replacement node shape"
  break; // exit this text node — we wrap at most one term per text node
}
```

**`break` after first hit per text node:** the visitor still continues to subsequent text nodes (visit traverses in document order), but `matched` blocks any further occurrences of the same canonical slug. Different slugs can still hit later in the file. Document-order traversal IS the "first textual occurrence" interpretation per assumption A3.

#### Self-page derivation

```ts
function deriveCurrentGlossarySlug(file: VFile): string | null {
  const p = file.path ?? '';
  // Match …/glossary/<slug>.md (forward or back slashes).
  const m = p.match(/[\\/]glossary[\\/]([^\\/]+)\.md$/);
  return m ? m[1] : null;
}
```

If `currentSlug === null` (file is not in `glossary/`), self-page skipping is a no-op — correct.

#### News skip

Already covered by `excludePaths` in the factory. The default `['/news/published/']` substring match is enough; `file.path` will always include forward slashes after Astro's normalisation. The check happens **before** any visit — zero AST work on news files.

#### Replacement node shape

**Primary path — MDX JSX node (`mdxJsxTextElement`):**

```ts
const wrapper = {
  type: 'mdxJsxTextElement',
  name: 'GlossaryTerm',
  attributes: [
    { type: 'mdxJsxAttribute', name: 'slug', value: entry.slug },
    { type: 'mdxJsxAttribute', name: 'display', value: matchedSourceText },
  ],
  children: [], // self-closing
};
```

This requires the markdown file to be processed through Astro's MDX transform AND for `GlossaryTerm` to be in-scope. Starlight 0.39's `.md` files are processed through `remark-rehype` but **components are not auto-resolved** in pure `.md` (unlike `.mdx`). So in practice:

**Fallback path — raw HTML node (`type: 'html'`)** — emitted always for `.md` files, JSX only for `.mdx`:

```ts
const wrapper = {
  type: 'html',
  value: `<button type="button" class="nbg-glossary-trigger" data-glossary-slug="${entry.slug}">${escapeHtml(matchedSourceText)}</button>`,
};
```

**Decision rule (frozen):** emit raw HTML always. The popover surface element (the `<div popover>`) is NOT injected by the remark plugin — it's hydrated at runtime by a single `<script>` tag that the `GlossaryTerm.astro` "registry" component injects on every page once (see §S.14.4 "Page-level registry"). This decouples plugin output from MDX availability, satisfies the AC contract ("HTML contains `popovertarget="gloss-"`") on the final rendered page, and keeps the plugin's emitted markdown identical across `.md` and `.mdx` sources.

**The plugin emits only a trigger `<button>` with `data-glossary-slug="…"` and the display text.** The popover `<div>` and the wiring of `popovertarget` are produced by a small inline `<script>` that runs **once per page** at parse time, walks all `[data-glossary-slug]` triggers, generates unique IDs, and creates the sibling popover div with the term title + tldr + Read-more link.

**Why this works:** the remark plugin output is pure static HTML. No JSX dependency. No MDX requirement. The registry script (≤80 LOC, no framework) does the popover wiring after DOM parse. AC15 ("rendered HTML contains `popovertarget="gloss-"`") is satisfied because the script runs synchronously in the body before tests inspect the DOM. For build-output test purposes (AC15 evidence — grep on `dist/`), we test the SCRIPT'S output by running it through jsdom — see §S.14.9.

**Text-node splitting** when a match hits mid-string `"… a pull request landed today …"`:

```ts
// Original text node: { type: 'text', value: '… a pull request landed today …' }
// After replacement, parent.children gets three siblings:
// 1. { type: 'text', value: '… a ' }
// 2. { type: 'html', value: '<button … data-glossary-slug="pull-request">pull request</button>' }
// 3. { type: 'text', value: ' landed today …' }
parent.children.splice(index, 1, before, wrapper, after);
return [SKIP, index + 3]; // tell visit to continue after the inserted nodes
```

#### Edge cases enumerated

| Case | Behavior |
|---|---|
| Empty `aliases: []` | Only the slug is a variant. No-op for aliases. |
| Alias conflicts with a different entry's primary slug | Plugin logs `WARN: alias collision: "X" claimed by both slug "a" and slug "b" — first-wins` and uses the slug that comes first in lexical order. |
| Two entries claim the same alias | Same rule — first-wins by slug alphabetical order. WARN logged. |
| Term split across formatting (`pull *request*`) | Accepted limitation — no match. §S.14.10 R-3. |
| Term inside `**bold**` / `*italic*` (formatting wraps the whole term) | ✅ matches — visitor descends into emphasis/strong nodes; their child `text` leaf carries the full term. |
| Term inside `:::tip` aside | ❌ skipped — `containerDirective` with `name: 'tip'` is in skip list. |
| Term inside table cell text | ✅ matches — `tableCell` is descended into. |
| Term inside blockquote | ✅ matches — `blockquote` is descended into. |
| Term in `file.path` matching `/news/published/` | ❌ file skipped at top of transformer. |
| Term IS the file's own slug (e.g. `agent` in `glossary/agent.md`) | ❌ skipped via `currentSlug` check. |
| Plugin encounters zero glossary entries (index empty) | Plugin runs as no-op — no regex, no transforms. WARN logged at factory time. |
| `glossaryDir` doesn't exist | Throw at factory time: `'remark-glossary-link: glossary directory not found at <path>'`. No fallback. |

### §S.14.4 — `GlossaryTerm.astro` component API

**File path:** `site/src/components/primitives/GlossaryTerm.astro`.

Per the spec, the visible button + tooltip surface is one primitive. Because the remark plugin emits a plain `<button data-glossary-slug="…">` (not a JSX tag — see §S.14.3 "Replacement node shape"), the `.astro` component is consumed **not by pages but by `MarketingShell.astro` + content-page layouts**: it slots in a single registry instance that wires every `[data-glossary-slug]` on the page.

Two responsibilities collapse into one `.astro` file:

1. **Registry / wiring script** — injects the popover `<div>` siblings, generates unique IDs, attaches keydown handlers, applies reduced-motion.
2. **Style block** — the `--nbg-*` token-driven CSS for both the trigger button and the popover surface.

#### Props interface (TypeScript)

```ts
// site/src/components/primitives/GlossaryTerm.astro — frontmatter script

interface Props {
  /**
   * Mode of operation.
   * - 'registry' (default): renders no inline UI; injects the page-level
   *   wiring script + popover-surface template. Place ONCE per page (in
   *   the global layout or MarketingShell).
   * - 'inline': renders one trigger+popover pair. Used for JSX/MDX
   *   consumption (e.g. a page that wants to hand-place a tooltip).
   *   In 'inline' mode, `slug` is required.
   */
  mode?: 'registry' | 'inline';
  /** Required when mode === 'inline'. Canonical glossary slug. */
  slug?: string;
  /** Optional override for the display text when mode === 'inline'. Defaults to the entry's `title`. */
  display?: string;
}
```

Both modes are supported but Phase B only needs `'registry'`. Inline mode is a stretch surface for content authors who want explicit tooltips (e.g. inside a Starlight aside, which the plugin skips). The plan does not require inline; we ship the prop to keep the door open.

#### Glossary lookup strategy

The component imports its lookup via `getCollection('glossary')` at the top of the frontmatter script. This is a **build-time** call — works in `.astro` files; resolves to the same data the remark plugin's index was built from.

```ts
// frontmatter script
import { getCollection } from 'astro:content';
const allTerms = await getCollection('glossary');
// Build a serialisable lookup the inline script can consume.
const lookup = Object.fromEntries(
  allTerms.map(t => [t.id, { title: t.data.title, tldr: t.data.tldr }]),
);
```

The lookup is **inlined into the page** as a JSON `<script type="application/json" id="nbg-glossary-data">` block on every page (registry mode). The wiring script reads from `document.getElementById('nbg-glossary-data').textContent` and parses it. Page weight: ~28 entries × ~200 bytes ≈ 5.6 KB JSON, gzipped ≈ 1.5 KB. Acceptable. §S.14.10 R-2 for the soft cap.

#### DOM contract — registry mode

```html
<!-- Emitted by GlossaryTerm.astro in registry mode -->
<script type="application/json" id="nbg-glossary-data">
{"agent":{"title":"Agent (vs chatbot, …)","tldr":"…"},"cli":{"title":"CLI","tldr":"…"}, …}
</script>
<script>
  (function() {
    var data = JSON.parse(document.getElementById('nbg-glossary-data').textContent);
    var triggers = document.querySelectorAll('button[data-glossary-slug]');
    var counter = 0;
    triggers.forEach(function(btn) {
      var slug = btn.getAttribute('data-glossary-slug');
      var entry = data[slug];
      if (!entry) {
        // §S.14.7 — referenced slug has no MD. Throw loud.
        throw new Error('GlossaryTerm: no glossary entry for slug "' + slug + '". Add glossary/' + slug + '.md or remove the reference.');
      }
      var id = 'gloss-' + slug + '-' + (counter++);
      btn.setAttribute('popovertarget', id);
      btn.setAttribute('aria-describedby', id);
      var pop = document.createElement('div');
      pop.id = id;
      pop.setAttribute('popover', 'auto');
      pop.setAttribute('role', 'tooltip');
      pop.className = 'nbg-glossary-popover';
      pop.innerHTML =
        '<strong class="nbg-glossary-popover__title">' + escapeHtml(entry.title) + '</strong>' +
        '<p class="nbg-glossary-popover__tldr">' + escapeHtml(entry.tldr) + '</p>' +
        '<a class="nbg-glossary-popover__more" href="/glossary#' + slug + '">Read more →</a>';
      btn.insertAdjacentElement('afterend', pop);
      // Hover-to-show (popover attr is click-toggle by default — add hover):
      var showT, hideT;
      btn.addEventListener('mouseenter', function() {
        clearTimeout(hideT);
        showT = setTimeout(function() { pop.showPopover(); }, 80);
      });
      btn.addEventListener('mouseleave', function() {
        clearTimeout(showT);
        hideT = setTimeout(function() { pop.hidePopover(); }, 120);
      });
      pop.addEventListener('mouseenter', function() { clearTimeout(hideT); });
      pop.addEventListener('mouseleave', function() {
        hideT = setTimeout(function() { pop.hidePopover(); }, 120);
      });
      // Belt-and-braces ESC handler (native popover also handles this):
      btn.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && pop.matches(':popover-open')) {
          pop.hidePopover();
          btn.focus();
        }
      });
    });
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function(c) {
        return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
      });
    }
  })();
</script>
```

The script is inlined (not `defer`/`module`) so it runs at parse time, BEFORE any test or screenshot inspects the DOM. Total inline JS: ≈80 LOC. No client framework imports.

#### Hover behavior — exact mechanism

The HTML `popover` attribute makes the popover **click-toggle by default**. Hover-to-show is achieved by JS (above): `mouseenter` on trigger → `setTimeout(80ms) → showPopover()`. The 80ms delay prevents flicker on cursor passing through. `mouseleave` cancels the show timer; if popover is open, schedules a 120ms hide timer (which is cancelled if cursor enters the popover itself — so the popover is reachable for clicking the "Read more" link).

**Reduced-motion override** for the show/hide animation (the JS timing stays — it's anti-flicker, not animation):

```css
@media (prefers-reduced-motion: reduce) {
  .nbg-glossary-popover { transition: none !important; animation: none !important; }
}
```

The 80ms / 120ms JS timers are **NOT** zeroed under reduced-motion — they exist to debounce hover, not to animate. Removing them would cause flicker; keeping them is in the spirit of reduced-motion (no perceived motion happens during the timer).

**Keyboard equivalents:** because the trigger is a real `<button>`, Tab focuses it. Native popover semantics open via `popovertarget` on Enter/Space (the user-agent default for buttons with `popovertarget`). No JS needed for keyboard.

#### Positioning — anchored at the trigger's bottom-right (2026-05-25 follow-on)

The HTML `popover` attribute puts the popover in the top layer with a user-agent default of `inset: 0; margin: auto;` which **centers** it in the viewport — not what we want for a tooltip. The wiring script overrides this by setting explicit inline `position: fixed; top/left/right/bottom; margin: 0;` styles right before each `showPopover()` call.

**Anchor rule:** the popover's top-left corner sits at the trigger's `getBoundingClientRect().right` (horizontal) and `bottom + 6px` (vertical) — so the popover hangs from the bottom-right of the term.

**Viewport clamping**:

- If `left + popWidth` would overflow the right edge by more than 8px (the gutter), shift `left` so the popover hugs the gutter instead.
- If `top + popHeight` would overflow the bottom edge, **flip** the popover above the trigger (`top = triggerRect.top - popHeight - 6`). If that would now overflow the top edge, clamp to the gutter at the top.

**Re-measure cycle**: positioning runs twice per show — once with an estimate (320px max-width, 120px height fallback when `offsetWidth === 0` pre-show), then again in the next `requestAnimationFrame` after `showPopover()` has triggered layout, using actual measurements. The estimate-first approach prevents a visible flicker (popover never paints at the wrong spot); the rAF refinement catches cases where the actual width is narrower than 320px due to shorter content.

**Scroll + resize**: while the popover is open, both events trigger a `positionAt()` recompute so the tooltip stays glued to the trigger. Both listeners are added to `window` and check `pop.matches(':popover-open')` before doing work — a no-op when the popover is closed.

The four edges (top, left, right, bottom) are all explicitly set on the inline style each time, so the user-agent default `inset: 0` is fully overridden — no leftover `right: 0` or `bottom: 0` from the UA stylesheet can interfere.

#### ESC dismissal

Native popover `popover="auto"` closes on ESC automatically (light-dismiss). The belt-and-braces handler above ensures focus returns to the trigger button after ESC — a small UX improvement over the native behavior which leaves focus on `document.body`.

#### Reduced-motion handling

Single `@media (prefers-reduced-motion: reduce)` block in the component's `<style>`:

```css
@media (prefers-reduced-motion: reduce) {
  .nbg-glossary-trigger,
  .nbg-glossary-popover {
    transition: none !important;
    animation: none !important;
  }
}
```

Targets: any `transition` on the trigger button (hover underline animation) and any `transition`/`animation` on the popover (opacity/transform on open).

#### Styling token map

| Property | Token (light) | Token (dark — inherits via theme override) |
|---|---|---|
| Trigger underline color | `var(--nbg-color-accent)` | inherits via accent flip |
| Trigger hover color | `var(--nbg-color-accent-hover)` | same |
| Trigger underline thickness | `1px` (literal — no token; matches Starlight links) | same |
| Popover background | `var(--nbg-color-bg-elevated)` | same |
| Popover border | `1px solid var(--nbg-color-border-default)` | same |
| Popover shadow | `var(--nbg-sh-lg)` | same |
| Popover radius | `var(--nbg-r-md)` | same |
| Popover padding | `var(--nbg-sp-3) var(--nbg-sp-4)` | same |
| Popover max-width | `min(320px, calc(100vw - var(--nbg-sp-8)))` | same |
| Popover title color | `var(--nbg-color-fg-primary)` | same |
| Popover title font | `var(--nbg-type-body)` `var(--nbg-fw-semibold)` | same |
| Popover title size | `var(--nbg-fs-md)` (14.5px) | same |
| Popover tldr color | `var(--nbg-color-fg-secondary)` | same |
| Popover tldr size | `var(--nbg-fs-sm-2)` (14px) | same |
| Popover tldr margin | `var(--nbg-sp-2) 0 var(--nbg-sp-3)` | same |
| Read-more link color | `var(--nbg-color-link)` | same |
| Read-more link hover color | `var(--nbg-color-link-hover)` | same |
| Read-more link size | `var(--nbg-fs-sm)` | same |
| Focus ring | `var(--nbg-color-focus-ring)` via `box-shadow` | same |

Zero raw hex / rgb / hsl literals. The `1px` thicknesses are not colours.

#### Accessibility audit

| A11y vector | Behavior |
|---|---|
| Keyboard nav — Tab | Tab moves focus through triggers in document order. Each trigger is a focusable `<button>`. |
| Open popover with keyboard | Enter or Space on a focused trigger button with `popovertarget` opens the popover (native). |
| Close popover with keyboard | ESC closes (native + belt-and-braces). Focus returns to the trigger button (belt-and-braces handler). |
| Screen-reader announcement (trigger) | `<button>` element with text content → "<term>, button". `aria-describedby` points at the popover, so SRs read the tooltip body when the button gains focus. |
| Screen-reader announcement (popover) | `role="tooltip"` (set by registry script) → announced as a tooltip when referenced by `aria-describedby`. |
| Focus management | Popover is NOT a focus trap. Focus stays on trigger button when popover opens. Tab from the trigger moves to the next focusable in document order (which may be inside the popover — the "Read more" link — that's fine and expected). |
| Mobile / touch | Native popover toggles on tap. Hover handlers are inert on touch (no `mouseenter`). |

### §S.14.5 — Wiring in `astro.config.mjs`

Current state: `markdown.remarkPlugins` does NOT exist in `astro.config.mjs`. Astro 6 accepts `markdown.remarkPlugins` at the top level of `defineConfig({})`. Insertion point: a new top-level `markdown` key, placed **before** the `integrations` block to keep markdown config visually grouped.

```js
// site/astro.config.mjs — diff (additions only)
import remarkGlossaryLink from './src/plugins/remark-glossary-link.ts';

export default defineConfig({
  // ... existing keys (server, devToolbar, redirects, fonts) unchanged ...

  // §S.14.5 — Glossary auto-linking. See docs/refined-requests/glossary-tooltips.md
  // and DECISIONS.md 2026-05-25 ("Glossary tooltips — build-time auto-linking").
  // Plugin runs at build-time only. Skips news/published/* per resolved OQ1.
  markdown: {
    remarkPlugins: [
      [remarkGlossaryLink, {
        glossaryDir: '../glossary',           // relative to site/
        excludePaths: ['/news/published/'],
      }],
    ],
  },

  integrations: [ /* ... existing Starlight config unchanged ... */ ],
});
```

**Plugin ordering rationale:** Astro composes `markdown.remarkPlugins` BEFORE Starlight's internal remark transforms (asides expansion, code-block decoration, etc.). Our plugin sees the raw markdown AST with `containerDirective` nodes still intact — that's why we can skip them by `node.type === 'containerDirective' && node.name in {note,tip,caution,danger}`. If Astro/Starlight ever flips this order (R1), the plugin's behavior on asides may degrade — covered by the `:::note` integration test in Phase B-2.

**Import path note:** Astro 6 supports `.ts` imports in `astro.config.mjs` via tsx-on-the-fly. Existing project already imports `.astro` components in `astro.config.mjs#integrations.starlight.components`, so the `.ts` import is consistent.

**Implementation discovery (2026-05-25, after the team-flow run):** Astro 6's content-collection `render(entry)` path uses a markdown processor that does NOT inherit the project's `markdown.remarkPlugins`. So wiring at `astro.config.mjs` alone is not sufficient — any page that calls `createMarkdownProcessor()` directly OR calls `render()` on a collection entry will bypass the plugin unless it's passed explicitly. The three site surfaces that need explicit re-wiring:

1. `site/src/pages/start-here/foundations.astro` (segmented step rendering)
2. `site/src/pages/start-here/day-1.astro` (segmented step rendering)
3. `site/src/pages/glossary.astro` (per-entry body rendering — was using `render(entry)` returning `<Content/>`; rewritten to use `createMarkdownProcessor()` to pick up the plugin)

Pattern in each (cast required because `createMarkdownProcessor`'s `remarkPlugins` is typed against unified's generic Plugin shape while our factory returns a narrower `Plugin<[RemarkGlossaryLinkOptions], Root, Root>`):

```ts
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkGlossaryLink from '../plugins/remark-glossary-link.ts';

const processor = await createMarkdownProcessor({
  remarkPlugins: [
    [remarkGlossaryLink as any, { glossaryDir: '../glossary', excludePaths: ['/news/published/'] }],
  ],
});

// For per-entry rendering, pass a synthesised fileURL so the plugin's
// self-page skip (don't link a term inside its own glossary page) still works:
const result = await processor.render(entry.body, {
  fileURL: new URL(`file:///glossary/${entry.id}.md`),
});
```

When a future page lands that also bypasses the project markdown config, it must be added to this list and to `Issues - Pending Items.md` #15.

### §S.14.6 — Audit script architecture

**File path:** `scripts/audit-glossary-candidates.mjs` (repo root, NOT under `site/scripts/` — this matches the existing `scripts/sync-doc-counts.mjs` placement convention).

**Runtime:** Node 22 ESM. No npm deps beyond Node built-ins (`fs/promises`, `path`, `url`, `process`).

#### CLI signature

```
node scripts/audit-glossary-candidates.mjs [--out <path>] [--corpus <dir>...]

Options:
  --out <path>      Output markdown report path.
                    Default: docs/reference/glossary-audit-YYYY-MM-DD.md
                    (today's UTC date).
  --corpus <dir>    Add a corpus directory. Default corpus (when no --corpus
                    flags given) is:
                      glossary/, tips/, skills/, journeys/, news/published/,
                      site/src/pages/, site/src/content/docs/
  --help            Print this message.
```

#### Three detector functions

Each returns a `Map<string, { count: number, samples: Array<{file: string, line: number}> }>`. Detectors share **one corpus walk**:

```js
// pseudo-shape — actual code in scripts/audit-glossary-candidates.mjs

const STOPWORDS = new Set([
  'the','a','an','and','or','but','of','in','on','at','to','for','with',
  'is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','should','could','may','might','must',
  'this','that','these','those','it','its','they','them','their','there',
  'you','your','yours','we','our','us','i','me','my','if','then','else',
  'when','where','why','how','what','which','who','whom','as','by','from',
  'so','too','also','just','only','very','more','most','some','any','all',
  'no','not','than','because','about','into','over','under','out','up',
  'down','off','through','can','one','two','three','first','last',
  // tech-noisy stopwords:
  'code','file','files','use','using','used','run','running','runs',
  'see','set','get','make','made','new','old','same','different',
]);

async function detectAcronyms(corpusFiles, existingVariants) {
  // Regex per spec §10: /\b[A-Z]{2,5}s?\b/g — limit to 5 chars to avoid
  // matching long all-caps headings; the trailing 's?' covers plurals.
  // Threshold: count >= 3. Exclude variants present in existingVariants
  // (slug-lowered AND alias-lowered).
}
async function detectBackticked(corpusFiles, existingVariants) {
  // Regex: /`([^`\n]+)`/g. Captured group → lowercase → dedupe per file.
  // Threshold: count >= 3. Exclude existingVariants.
}
async function detectFrequentNouns(corpusFiles, existingVariants) {
  // Tokenize: word.toLowerCase().match(/^[a-z][a-z-]{2,}$/) — 3+ chars,
  // alphabetic + hyphen. Drop STOPWORDS. Threshold: count >= 5.
}
```

#### Output format

```markdown
# Glossary audit — 2026-05-25

Generated by scripts/audit-glossary-candidates.mjs. Triage these candidates
manually — the script does NOT auto-add glossary entries.

## Capitalised acronyms (≥3 occurrences, not in glossary)

| Term | Count | Sample |
|---|---|---|
| `API` | 12 | `tips/working-with-claude.md:42` |
| `JSON` | 8 | `skills/claudemd.md:17` |

## Backticked terms (≥3 occurrences, not in glossary)

| Term | Count | Sample |
|---|---|---|
| `npm` | 14 | `journeys/day-1.md:88` |

## Recurring nouns (≥5 occurrences, alphabetic, stop-words excluded)

| Term | Count | Sample |
|---|---|---|
| `context` | 23 | `tips/context-discipline.md:5` |

*End of report.*
```

#### Hard write-isolation guarantee

The script makes filesystem writes via **exactly one** code path:

```js
// One sentinel constant, one fs.writeFile call, one defensive check.
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

async function writeReport(reportPath, markdown) {
  const abs = resolve(reportPath);
  // Defensive: never allow a write that would land inside glossary/.
  if (abs.includes(`${resolve('glossary')}/`) || abs.endsWith('glossary')) {
    throw new Error(
      `audit-glossary-candidates: refusing to write into glossary/ (path: ${abs})`
    );
  }
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, markdown, 'utf8');
}
```

The script has NO OTHER fs.write* / fs.append* / fs.copy* / fs.rm / fs.unlink calls. Verified by C-2 test (`audit-glossary-no-mutation.test.ts`): the test snapshots `glossary/` dir mtimes pre- and post-run; asserts every file's mtime is byte-identical.

### §S.14.7 — Error handling strategy

Per global CLAUDE.md "Never create fallback values for missing configuration":

| Scenario | Error path | Wording |
|---|---|---|
| Glossary MD missing `tldr` | Zod validation error in `getCollection('glossary')`. `astro build` exits non-zero. | `'glossary entry missing required field "tldr"'` + Astro's per-field path prefix (e.g. `[content/glossary/agent.md] tldr: …`). |
| Glossary MD has `tldr` longer than 160 chars | Zod validation error. Build fails. | `'tldr must be ≤160 characters (plain text, no markdown)'`. |
| Glossary MD has empty `tldr: ""` | Zod validation error. Build fails. | `'tldr must be a non-empty string'`. |
| Page references a slug via `<GlossaryTerm slug="…">` (inline mode) and that slug doesn't exist in `glossary/` | Frontmatter script throws via explicit lookup check (component code throws if `lookup[slug] === undefined` in inline mode). Build fails. | `'GlossaryTerm: no glossary entry for slug "<slug>". Add glossary/<slug>.md or remove the reference.'`. |
| Registry script encounters a `[data-glossary-slug]` button whose slug isn't in the JSON lookup at runtime (only possible if remark plugin and content collection drift — should never happen in practice) | Registry script throws an `Error` at page load. | Same wording as above (string is shared). |
| Two glossary entries claim the same alias | Remark plugin logs `WARN` at factory init AND continues. "First" = alphabetical by slug. | `'remark-glossary-link: alias "<alias>" claimed by both slug "<a>" and slug "<b>" — using "<a>" (alphabetical first-wins)'`. |
| `glossaryDir` option missing | Plugin factory throws. Build fails. | `'remark-glossary-link: options.glossaryDir is required (no fallback).'`. |
| `glossaryDir` path doesn't exist on disk | Plugin factory throws. Build fails. | `'remark-glossary-link: glossary directory not found at <path>'`. |
| Glossary directory exists but is empty (no `.md` files) | Plugin logs `WARN` at factory init. Plugin becomes a no-op (no matches, no errors). | `'remark-glossary-link: glossary directory is empty — auto-linking disabled.'`. |

### §S.14.8 — Token usage map

Concrete `--nbg-*` token consumption by `GlossaryTerm.astro` styles:

| Component property | Token reference |
|---|---|
| Trigger button base color | inherits text color (`currentColor`) |
| Trigger underline | `text-decoration: underline dotted; text-underline-offset: 3px; text-decoration-color: var(--nbg-color-accent);` |
| Trigger hover decoration color | `var(--nbg-color-accent-hover)` |
| Trigger focus ring | `box-shadow: 0 0 0 2px var(--nbg-color-bg-canvas), 0 0 0 4px var(--nbg-color-focus-ring);` (token-only; the `2px`/`4px` are layout literals not colours) |
| Popover surface background | `var(--nbg-color-bg-elevated)` |
| Popover surface border | `var(--nbg-color-border-default)` (1px width literal) |
| Popover shadow (elevation 3) | `var(--nbg-sh-lg)` |
| Popover radius | `var(--nbg-r-md)` |
| Popover padding (block × inline) | `var(--nbg-sp-3) var(--nbg-sp-4)` |
| Popover gap (between title / tldr / link) | `var(--nbg-sp-2)` |
| Popover title color | `var(--nbg-color-fg-primary)` |
| Popover title font-family | `var(--nbg-type-body)` |
| Popover title font-weight | `var(--nbg-fw-semibold)` |
| Popover title font-size | `var(--nbg-fs-md)` |
| Popover tldr color | `var(--nbg-color-fg-secondary)` |
| Popover tldr font-size | `var(--nbg-fs-sm-2)` |
| Popover tldr line-height | `1.45` (literal — no token; the existing project uses bare line-height numbers throughout) |
| Read-more link color (idle) | `var(--nbg-color-link)` |
| Read-more link color (hover) | `var(--nbg-color-link-hover)` |
| Read-more link font-size | `var(--nbg-fs-sm)` |
| Read-more link font-weight | `var(--nbg-fw-medium)` |
| Reduced-motion guard target props | `transition`, `animation` (zeroed) |

No new tokens are added to `semantic.css` or `primitives.css`. Every value already exists.

### §S.14.9 — Test contracts

Phase 9 test-builder agents implement these as Vitest cases. One line per case; the test-builder fills in fixtures + asserts.

#### `site/tests/glossary-schema.test.ts`

- "accepts a valid glossary entry with all 12 keys"
- "rejects when `tldr` is missing — error message matches /missing required field "tldr"/"
- "rejects when `tldr` is empty string — error matches /non-empty string/"
- "rejects when `tldr` is 161 characters — error matches /≤160 characters/"
- "accepts exactly 160-character `tldr`"
- "defaults `aliases` to `[]` when omitted from frontmatter"
- "round-trips `aliases: ['PR', 'PRs']` unchanged"
- "rejects when `aliases` contains an empty string"
- "rejects when `aliases` is not an array (e.g. a single string)"

#### `site/tests/remark-glossary-word-boundary.test.ts`

- "wraps `cli` in `'use the cli now'`"
- "does NOT wrap `cli` inside `'click here'`"
- "does NOT wrap `cli` inside `'command-line'` (no occurrence anyway, but verifies no false positive)"
- "wraps `agent` in `'an agent does X'`"
- "does NOT wrap `agent` inside `'agents are great'` when no `agents` alias is configured"
- "wraps `agents` in `'agents are great'` when `agents` IS an alias of `agent`"
- "does NOT wrap inside `'agent2'` (numeric adjacency)"
- "does NOT match inside `'LLOWED'` for variant `LLM` (case-insensitive, but no boundary)"
- "preserves source casing in display attribute — input `'Pull Request'` yields button text `'Pull Request'`"
- "preserves source casing for lowercase — input `'pr'` yields button text `'pr'`"
- "case-insensitively matches `'PR'`, `'pr'`, `'Pr'` to the same canonical slug"
- "longest-first alternation: matches `command-line interface` ahead of `command-line` when both are variants"

#### `site/tests/remark-glossary-first-occurrence.test.ts`

- "wraps only the first of three occurrences of the same slug in one file"
- "wraps the first occurrence even when the second is in a different paragraph"
- "treats slug-and-alias as the same canonical: `PR` followed by `pull request` wraps only `PR`"
- "different slugs each wrap once — `agent` and `cli` in the same file both get wrapped on first occurrence"

#### `site/tests/remark-glossary-skip-rules.test.ts`

- "skips fenced code blocks (``` … ```)"
- "skips inline code (\`…\`)"
- "skips headings h1 through h6 — iterates six levels"
- "skips existing markdown links `[text](url)`"
- "skips link reference syntax `[text][ref]`"
- "skips the term on its own glossary page (file path under `glossary/<slug>.md`)"
- "skips Starlight aside `:::note … :::`"
- "skips Starlight aside `:::tip … :::`"
- "skips Starlight aside `:::caution … :::`"
- "skips Starlight aside `:::danger … :::`"
- "DOES descend into emphasis nodes (`*term*` is matched)"
- "DOES descend into strong nodes (`**term**` is matched)"
- "DOES descend into blockquote children"
- "DOES descend into table cell children"
- "skips raw HTML nodes (`<div>term</div>` is left alone)"

#### `site/tests/remark-glossary-news-skip.test.ts`

- "returns early when `file.path` includes `/news/published/` — no AST mutation"
- "still wraps terms when `file.path` includes `/news/` but not `/news/published/` (defensive — should not happen in practice, but covers the path-substring contract)"
- "honors a custom `excludePaths` option overriding the default"

#### `site/tests/glossary-term-component.test.ts`

- "registry mode emits `<script type=\"application/json\" id=\"nbg-glossary-data\">`"
- "registry mode emits the inline wiring script"
- "registry-script-output (when run through jsdom) adds `popovertarget=\"gloss-<slug>-<n>\"` to every `[data-glossary-slug]` button"
- "registry-script-output adds `aria-describedby` with matching id"
- "registry-script-output creates a sibling `<div id=\"gloss-<slug>-<n>\" popover=\"auto\" role=\"tooltip\">`"
- "popover contains the term title, tldr text, and a `Read more →` link to `/glossary#<slug>`"
- "inline mode renders one trigger+popover pair when given `slug` prop"
- "inline mode uses `display` prop when provided, else falls back to entry `title`"
- "inline mode throws when slug is unknown — error matches /no glossary entry for slug/"
- "component file contains zero `from '@astrojs/starlight` imports"
- "component file contains zero `client:` directives"
- "component CSS contains no raw hex / rgb() / hsl() colour literals (regex check)"
- "component CSS contains `@media (prefers-reduced-motion: reduce)`"
- "registry script attaches a `keydown` ESC listener (grep on script source)"

#### `site/tests/build-output-glossary-tooltips.test.ts` (extends existing `build-output.test.ts` OR new file)

- "at least one tip page output contains `data-glossary-slug=` (auto-linking active on tips)"
- "at least one skill page output contains `data-glossary-slug=` (auto-linking active on skills)"
- "at least one journey page output contains `data-glossary-slug=` (auto-linking active on journeys)"
- "the glossary index page (`/glossary/index.html`) does NOT contain `data-glossary-slug=` for its own entry's slug (self-page skip on the canonical page renders)"
- "no `news/<slug>/index.html` page output contains `data-glossary-slug=` (news-skip confirmed)"
- "every page that emits a `data-glossary-slug=` button also emits the `<script id=\"nbg-glossary-data\">` registry block"

#### `site/tests/audit-glossary-no-mutation.test.ts`

- "snapshot `glossary/` file mtimes pre-run, invoke the audit module programmatically, snapshot post-run, assert byte-identical"
- "the audit module throws if asked to write to a path inside `glossary/`"

### §S.14.10 — Risks not addressed by the plan

#### R-1 — Plan undercount: glossary count is 28, not 27

The refined spec's "Defect surfaced during planning" section (lines 211–224) raises the new-entries count from 6 to 7 (adds `hook.md`), making the final glossary count **28** (21 existing + 7 new). The plan (lines 25, 47, 91, 234, 291) still reports 27 throughout — including in `npm run build`'s `ls glossary/*.md | wc -l` verification.

**Surfaced at top of output.** Phase A executors must:
1. Author `hook.md` as a 7th new entry (assigned to PAR-A.6 or a new PAR-A.7).
2. Update the verification command from `wc -l` returns `27` → returns `28`.
3. Update AC26's evidence to "Glossary = 28".
4. Update DECISIONS.md / SCOPE.md content-count entries accordingly when D-4 runs `sync-doc-counts.mjs`.

The plan's sequencing remains valid — this is a count delta, not a phase change.

#### R-2 — Inline JSON data inflates page weight

Every page emits the full `nbg-glossary-data` JSON (~5.6 KB raw, ~1.5 KB gzipped) regardless of how many terms that page actually references. With 28 entries this is acceptable. Soft cap: if the glossary ever crosses 100 entries (~20 KB raw / ~5 KB gzipped), revisit by splitting into a fetch-on-demand JSON file under `/public/_data/glossary-tooltips.json` referenced via a separate `<script>` tag. Not a Phase B concern — recorded as a Pending Item.

#### R-3 — Term split across markdown formatting boundaries

`pull *request*` (one word emphasised) → two AST nodes (`text("pull ")` + `emphasis > text("request")`). The visitor only sees the leaves in isolation; neither matches `"pull request"`. **Accepted limitation.** Authors who want the auto-link can write `*pull request*` (emphasis around the whole term) which the visitor handles correctly. Document in DECISIONS.md 2026-05-25 as "split-formatting terms — author responsibility".

#### R-4 — `<div popover>` injected after a `<button>` inside a `<p>` produces invalid HTML

`<p>` cannot contain block-level `<div>` children — when the registry script does `btn.insertAdjacentElement('afterend', pop)`, and `btn` is inside a `<p>`, the resulting markup is `<p>… <button>term</button> <div popover>…</div> …</p>`. Browsers auto-close the `<p>` at the first block-level child, which mangles the rendered text flow.

**Fix:** emit the popover as a **`<span popover>`** instead of `<div popover>`. The HTML spec allows `popover` on any element (it's a global attribute as of 2024). The popover's three children (title, tldr, link) become `<strong>` (inline), `<span>` (inline, was `<p>`), `<a>` (inline). All inline-flow content — valid inside a `<p>`.

**Registry script revision (final):**

```js
var pop = document.createElement('span');
pop.setAttribute('popover', 'auto');
// ... other attrs same ...
pop.innerHTML =
  '<strong class="nbg-glossary-popover__title">' + ... + '</strong>' +
  '<span class="nbg-glossary-popover__tldr">' + ... + '</span>' +
  '<a class="nbg-glossary-popover__more" href="…">Read more →</a>';
```

The CSS uses `display: block` on the children so they still stack vertically, regardless of the inline element shells. **This is the load-bearing fix for the HTML-validity risk.**

#### R-5 — Astro may strip unknown `popover` attribute on `<span>`

Astro's HTML processor (`rehype-raw` chain) should preserve the `popover` attribute — it's a standard HTML global attribute since 2024. If it doesn't (older rehype-stringify cleanup), the workaround is to set `popover` via JS (`pop.setAttribute('popover','auto')`) which we already do. **No Astro-config change needed** — the registry script applies the attribute at runtime, not at SSR time. The static HTML emitted by remark only contains the trigger `<button data-glossary-slug>`; the popover element doesn't exist until the script runs.

#### R-6 — Headless Chromium SSR baseline

The Phase D headless-Chromium screenshots will run against the dev server (or `dist/`). The registry script must execute before the screenshot. Puppeteer's `page.goto(…, { waitUntil: 'networkidle0' })` is sufficient — inline scripts run synchronously at parse time. No explicit `page.evaluate('document.querySelectorAll("[popovertarget]")')` wait needed.

---

*End of §S.14 — Glossary Tooltips section.*
