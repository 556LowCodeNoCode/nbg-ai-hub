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
