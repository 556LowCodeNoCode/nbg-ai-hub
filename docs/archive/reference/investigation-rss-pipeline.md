# Investigation: RSS News Pipeline (Daily Action -> Azure OpenAI Triage -> Editorial PR)

## Executive Summary

The refined request's pre-committed library choices are mostly sound for mid-2026, with **one material concern**: `rss-parser` (A6) has had no npm release in ~3 years, multiple open 2024 bugs, and is widely treated as effectively unmaintained. We recommend swapping to `@rowanmanning/feed-parser` (actively maintained, simpler API surface, lenient real-world parsing) before code is written. The Azure OpenAI SDK choice (A7) is correct — use the `AzureOpenAI` class from the `openai` npm package with `endpoint + apiKey + apiVersion + deployment`; this is the canonical Microsoft pattern. Vitest (A9) and the `gh` CLI on `ubuntu-latest` (A10) are both unambiguously correct for 2026. The PR-creation pattern works with the workflow `permissions:` block plus the repo-level "Allow GitHub Actions to create and approve pull requests" toggle (under Settings → Actions → General → Workflow permissions). Two underspecified areas warrant guidance in this document: (1) module decomposition and DI seams under `pipeline/` to make tests natural, and (2) workflow concurrency control to prevent overlapping cron runs. A live secondary concern is **Reddit's `.rss` endpoint anonymous-throttling**: r/ClaudeAI.rss likely returns 429 from GitHub-Actions IP ranges, so the per-feed-failure-is-non-fatal contract (A14) is doing real work here. Net: proceed to planning, with the `rss-parser` → `@rowanmanning/feed-parser` swap and the Reddit feed flagged as known weak spots.

## Context

- **What was investigated**: viability and gotchas of the eight library/pattern decisions pre-committed in `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/rss-pipeline.md`, plus the underspecified module layout, failure-mode semantics, and workflow concurrency strategy.
- **Constraints driving evaluation**:
  - TypeScript-only implementation (global CLAUDE.md).
  - No fallback values for missing config — must throw (global CLAUDE.md).
  - Azure OpenAI for AI inference (DECISIONS.md "AI strategy" entry).
  - Private personal repo; free Actions minutes; greenfield (no existing patterns to match).
  - Curated, PR-gated content flow (DECISIONS.md "Curated RSS").
- **Refined request**: `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/rss-pipeline.md`

---

## Per-area findings

### 1. Azure OpenAI via `openai` npm SDK (A7) — CONFIRMED, with notes

The current canonical Microsoft-recommended pattern in 2026 uses the `AzureOpenAI` class exported by the `openai` npm package (not `@azure/openai`, which is deprecated/companion-only). Construction with API key:

```ts
import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  endpoint:   process.env.AZURE_OPENAI_ENDPOINT,    // e.g. https://my-resource.openai.azure.com
  apiKey:     process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION, // e.g. 2024-10-21
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,  // deployment name, e.g. gpt-4o-mini
});
```

When `deployment` is passed to the constructor, the SDK routes to:

```
POST {endpoint}/openai/deployments/{deployment}/chat/completions?api-version={apiVersion}
```

with `api-key: {apiKey}` as the auth header. This matches what the refined request describes.

**Known surprises / gotchas to bake into design:**

1. **`model` parameter is required by the type signature but ignored for routing.** When `deployment` is set in the constructor, Azure routes by the URL path. The Node SDK still requires you to pass `model` in `chat.completions.create({ model, messages, ... })`. The convention in Microsoft samples is to repeat the deployment name as `model`. Plan for: pass `process.env.AZURE_OPENAI_DEPLOYMENT` as both constructor `deployment` and call-site `model`.

2. **JSON mode is supported, with version caveats.** `response_format: { type: "json_object" }` works on Azure chat completions from `apiVersion: 2024-02-01` onward (preview from `2023-12-01-preview`). The SDK will pass it through. JSON mode requires the prompt to explicitly mention "JSON" or the API errors. **Practical design rule**: include the literal word "JSON" in the system prompt; assert the parsed response shape rigorously (relevant/audience/topics/summary) and reject malformed responses (per AC8) rather than trusting the model.

3. **Structured outputs (`response_format: { type: "json_schema", ... }`) is a stronger alternative** to JSON mode, available on `gpt-4o-2024-08-06` and later. It's stricter (guarantees schema conformance) but pinned to specific deployments. Recommendation for MVP: use plain `json_object` mode for portability across deployments — and validate with Zod (or a hand-written validator) before trusting the output. Upgrade to `json_schema` later if the OQ5 deployment is `gpt-4o-2024-08-06`+.

4. **Deployment name vs. model name confusion is the classic Azure foot-gun.** `AZURE_OPENAI_DEPLOYMENT` is the *deployment name* the user created in Azure Portal — it can equal the model family name (`gpt-4o-mini`) or be a custom string (`hub-triage-prod`). Document this in `SECRETS.md` to spare future readers.

5. **There is a newer "v1 GA" Azure API path** (`{endpoint}/openai/v1/...`, no `apiVersion` needed) where you'd use the plain `OpenAI` client with a `baseURL`. It's GA as of late-2025 but not yet universal across all deployment types. **Recommendation: stick with the classic `AzureOpenAI({ endpoint, apiKey, apiVersion, deployment })` pattern** — it's explicitly versioned (good for auditability and no-fallback-config discipline), works with every Azure deployment SKU, and matches every current Microsoft sample. Revisit once v1 API is universal.

### 2. `rss-parser` library health (A6) — CONCERN; recommend swap

**Finding:** `rss-parser` is effectively unmaintained.

- Latest npm version 3.13.0 published roughly 3 years ago.
- Snyk and Cloudsmith both flag it as "could be considered as a discontinued project, or that which receives low attention from its maintainers."
- ~20 open issues from 2024 (bugs and enhancements) with no maintainer responses in the past 12 months.
- Still extremely popular by download count (~530K/week, 494 dependents) — so it works, but it's frozen.

**Implications for this pipeline:**
- No active security patches (low risk for a feed parser, but non-zero).
- The known issue around `<guid>` / `<content:encoded>` extraction (Issue #8 on the repo) is a real foot-gun: rss-parser sometimes does not surface `guid` even when present, depending on namespace handling. Our fingerprint derivation (A5: SHA-256 of `feedName + guid || link || title`) already has the right fallback chain, so this is mitigated — but worth noting as the reason the fallback exists.

**Feed-specific concerns:**

- **`https://www.anthropic.com/rss.xml`** (Anthropic news) — standard RSS 2.0, no known issues.
- **`https://github.com/anthropics/claude-code/releases.atom`** (Claude Code GitHub releases) — standard Atom from GitHub, no known issues. Both `rss-parser` and `@rowanmanning/feed-parser` handle this transparently.
- **`https://simonwillison.net/atom/everything/`** — standard Atom, no known issues.
- **`https://www.reddit.com/r/ClaudeAI/.rss`** — **significant concern**. Reddit has been throttling unauthenticated `.rss` access aggressively since 2023; multiple sources (BazQux community, Reddit API rate-limit docs) confirm anonymous IP-based 429s are now the norm. GitHub Actions runners share IP ranges with millions of users, so 429s from this endpoint are likely. The pipeline's "per-feed failure non-fatal" contract (A14) absorbs this gracefully — the run continues — but the team should accept that **r/ClaudeAI may yield zero items per run more often than not**. Long-term fix is OAuth-authenticated Reddit API access (adds three more secrets and ~30 lines of code). Flag for OQ1 sign-off: keep it, drop it, or replace it with an authenticated alternative.
- **`https://hnrss.org/frontpage?q=Claude+OR+%22Claude+Code%22+OR+Anthropic`** — `hnrss.org` is actively serving feeds in 2026; it's a single-maintainer donation-funded service on DigitalOcean, backed by Algolia's HN API. No SLA but historically reliable. Treat occasional 5xx as expected (per A14).

**Recommendation:** swap `rss-parser` for **`@rowanmanning/feed-parser`** before implementation begins.

| Aspect | `rss-parser` | `@rowanmanning/feed-parser` |
|---|---|---|
| Last release | ~3 years ago | Actively maintained |
| RSS 2.0 + Atom | Yes | Yes |
| TypeScript | Yes (typings shipped) | Yes (first-class TS) |
| Real-world feed resilience | Battle-tested but stale | Explicitly tested against ~40 real feeds, designed to be lenient |
| Fetches URL directly | Yes (built-in HTTP) | No — you pass it XML; you fetch separately |
| Migration effort from `rss-parser` mental model | n/a | Low — both expose `feed.items[]` with `title/link/guid/...` |

The "fetches URL directly" gap in `@rowanmanning/feed-parser` is actually a **design win** for us: it forces us to separate `fetch.ts` (HTTP) from `parse.ts` (XML→objects), which is exactly the seam we want for testing (mock `fetch`, feed fixtures into `parseFeed`).

`@rowanmanning/feed-parser` also throws a typed `INVALID_FEED` error on garbage input, which gives the per-feed-failure handler (A14) a clean code path.

**Action:** treat A6 as superseded by this finding; record the swap in `Issues - Pending Items.md` and add a DECISIONS.md entry once accepted.

### 3. GitHub Actions: commit-and-PR pattern — CONFIRMED

The cleanest single-workflow pattern in 2026 is `gh` CLI + workflow-scoped `GITHUB_TOKEN` permissions. `gh` is preinstalled on `ubuntu-latest` (confirmed across GitHub's runner image docs and dozens of 2026 community guides).

**Minimum-viable shape of the post-pipeline step:**

```yaml
- name: Open editorial PR
  if: steps.pipeline.outputs.new_items == 'true'
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    BRANCH="news-triage/$(date -u +%F)-${GITHUB_RUN_ID:0:7}"
    git config user.name  "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git checkout -b "$BRANCH"
    git add news/incoming
    git commit -m "News triage $(date -u +%F)"
    git push origin "$BRANCH"
    gh pr create \
      --base main \
      --head "$BRANCH" \
      --title "News triage $(date -u +%F)" \
      --body-file pr-body.md
```

**The two-layer permission model** (both layers must be satisfied):

1. **Workflow YAML** — the file must declare:
   ```yaml
   permissions:
     contents: write          # to push the branch
     pull-requests: write     # to open the PR
   ```
   The refined request already specifies this (AC18).

2. **Repo setting (one-time, manual)** — `Settings → Actions → General → Workflow permissions` section → tick **"Allow GitHub Actions to create and approve pull requests"**. Without this, `gh pr create` returns "GitHub Actions is not permitted to create or approve pull requests" even with full token permissions. This is exactly A15 in the refined request, and the exact UI path confirmed across GitHub's own docs and codestudy.net's guide on the "grayed out" failure mode.

**Confirmed it works on private personal repos:** `GITHUB_TOKEN` with explicit workflow permissions + the repo toggle is sufficient. No PAT needed for the MVP. (PAT becomes necessary only if you need the PR-creation event to itself trigger other workflows — out of scope here.)

**Two subtle pitfalls worth flagging in implementation:**

- **`actions/checkout@v4` defaults to depth=1 and persists credentials.** That's exactly what we need for the commit+push flow — but if any future change adds `persist-credentials: false` for security reasons, `git push` will fail silently. Document this in `pipeline/README.md`.
- **PR body via `--body-file`, not `--body "..."`** when the body is multi-line. Shell-escaping a multi-item PR body inline is fragile; writing it to a file and using `--body-file` is the clean path.

### 4. Vitest vs Jest in 2026 (A9) — CONFIRMED

Vitest is unambiguously the right call for a new Node-only TypeScript project in 2026:

- Native TypeScript + ESM with zero transformer config — `vitest.config.ts` plus a `tsconfig.json` is enough.
- Mocking API (`vi.mock`, `vi.fn`, `vi.spyOn`) is Jest-compatible-ish but works correctly for both CJS and ESM (Jest's `jest.mock` still needs `unstable_mockModule` for ESM in v30).
- Multiple 2026 benchmarks put it 5–8× faster on cold runs than Jest for Node-only TS suites.

**Gotchas to design around (small but real):**

1. **`vi.mock()` is hoisted, like `jest.mock()`.** A common stumbling block: if your mock factory needs to reference a local variable, you need `vi.hoisted()` to declare that variable before the mock. Pattern when mocking the `openai` client:
   ```ts
   import { vi, describe, it, expect } from "vitest";
   const mocks = vi.hoisted(() => ({
     create: vi.fn(),
   }));
   vi.mock("openai", () => ({
     AzureOpenAI: vi.fn().mockImplementation(() => ({
       chat: { completions: { create: mocks.create } },
     })),
   }));
   ```
   This is the pattern the test plan should standardize on.

2. **Environment variables in tests.** For the AC10 family ("throws when `AZURE_OPENAI_API_KEY` missing"), use `vi.stubEnv("AZURE_OPENAI_API_KEY", "")` (Vitest >= 0.26) inside the test, and `vi.unstubAllEnvs()` in `afterEach`. Do NOT mutate `process.env` directly — it leaks between tests in parallel mode.

3. **File-system mocks.** For `write.ts` and `dedup.ts` tests, prefer `memfs` over Vitest's built-in `fs` mocking — cleaner, isolates each test, and mirrors real `fs/promises` semantics.

### 5. Module organization under `pipeline/` (A18) — Concrete proposal

Recommended layout:

```
pipeline/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.cjs
├── src/
│   ├── index.ts             # orchestrator: composes everything, exits 0/non-0
│   ├── config.ts            # loads + validates rss-sources.json
│   ├── env.ts               # reads AZURE_OPENAI_* env vars; throws on missing
│   ├── fetch.ts             # HTTP fetch of a single feed URL (returns raw XML)
│   ├── parse.ts             # parses XML → normalized items via @rowanmanning/feed-parser
│   ├── dedup.ts             # scans /news/incoming/ + /news/published/ for existing fingerprints
│   ├── fingerprint.ts       # SHA-256(feedName + (guid||link||title)) → 16 hex chars
│   ├── azure-client.ts      # constructs AzureOpenAI; throws on missing env
│   ├── triage.ts            # calls Azure OpenAI, validates response shape
│   ├── slug.ts              # title → kebab-case-truncated slug + collision suffix
│   ├── frontmatter.ts       # builds the YAML frontmatter object
│   ├── write.ts             # writes one markdown file under /news/incoming/
│   ├── pr.ts                # shells out to `gh` to create the PR; returns URL
│   └── logger.ts            # NF6 structured stdout logging
└── tests/
    ├── config.test.ts
    ├── env.test.ts          # AC10 family
    ├── fetch.test.ts        # AC5, AC6 — uses fixture XML + mock fetch
    ├── parse.test.ts        # RSS 2.0 fixture, Atom fixture
    ├── dedup.test.ts        # AC7 — uses memfs
    ├── fingerprint.test.ts  # deterministic-output test
    ├── triage.test.ts       # AC8, AC9 — mocks AzureOpenAI per Section 4
    ├── slug.test.ts         # incl. collision suffix
    ├── frontmatter.test.ts  # AC11
    ├── write.test.ts        # AC11, AC12 — uses memfs
    └── pr.test.ts           # AC13, AC14 — mocks child_process.execFile
```

**Why this layout is good for tests:**

- Each pure function lives in its own file. Most tests need zero mocking (`fingerprint`, `slug`, `frontmatter`, `parse`).
- Five clean DI seams (one mock per seam):
  1. **HTTP** — `fetch.ts` exports `fetchFeedXml(url, fetchImpl = globalThis.fetch)`; tests inject `vi.fn()`.
  2. **Filesystem** — `dedup.ts` and `write.ts` import `fs/promises` via a tiny `fs-adapter.ts` re-export so `memfs` can replace it in tests.
  3. **AzureOpenAI** — `azure-client.ts` exports `makeClient(env)`; `triage.ts` takes the client as a parameter. Tests inject a fake client (the `vi.hoisted` pattern from Section 4).
  4. **`gh` CLI** — `pr.ts` exports `createPullRequest({ exec = nodeExec, ... })` where `nodeExec` defaults to a wrapper around `child_process.execFile`. Tests inject a fake `exec`.
  5. **Clock** — `index.ts` takes `now: () => Date` defaulting to `() => new Date()`; tests inject a fixed Date. Affects filename date, frontmatter `authored`/`last_reviewed`, and PR title.

- `index.ts` is the only file that wires real implementations together. It's the thinnest possible top-level: parse args/env → load config → for-each-feed (await with try/catch per feed) → dedup → triage → write → maybe-PR → return exit code. Easy to read, easy to skip while reviewing the pure modules.

**One discipline note:** keep `index.ts` under ~100 lines. If it grows, that's a sign a sub-orchestrator (e.g., `process-one-feed.ts`) should be extracted.

### 6. Failure-mode strategy (A14) — Confirmed safe, with three notes

The spec: "per-feed failures non-fatal; if ALL feeds fail, exit non-zero."

**This is implementable cleanly.** The natural shape:

```ts
const results = await Promise.allSettled(
  enabledFeeds.map(feed => processFeed(feed).catch(err => { log.warn(...); throw err; }))
);
const allFailed = results.every(r => r.status === "rejected");
if (allFailed && results.length > 0) {
  log.error("All feeds failed");
  process.exit(1);
}
```

**Three subtle points:**

1. **GitHub Actions UI is binary** — a job is either green or red. Partial-failure (some feeds errored, run still wrote items, PR opened) is "green" but the failures only surface in the logs. NF6's per-feed log lines are doing the work — make sure they're prominent (e.g., a `::warning::` workflow command for each failed feed so they bubble up in the Actions UI summary; and a final summary line `Feeds: 5 attempted, 1 failed, 4 succeeded` at INFO level).
2. **Distinguish "no enabled feeds in config" from "all feeds failed".** Empty config should exit 1 with a clear "no feeds configured" message — that's a misconfiguration, not a transient failure. The `results.length > 0` guard above handles this.
3. **Distinguish "all feeds fetched OK but every item was deemed irrelevant" from "all feeds failed".** The former is a legitimate quiet day (exit 0, no PR — AC14). The failure check must only fire on actual fetch/parse failures, not on legitimate zero-items-after-triage.

### 7. Workflow concurrency — Recommended block

Add this to `rss-triage.yml`:

```yaml
concurrency:
  group: rss-triage
  cancel-in-progress: false
```

**Why these values:**

- **Fixed group name** (`rss-triage`, not `${{ github.workflow }}-${{ github.ref }}`) because cron runs always fire on the default branch — there's no parameterization to do.
- **`cancel-in-progress: false`** because we'd rather let a running pipeline finish (and write its PR) than cancel mid-`gh pr create` and risk an orphan branch with a partial commit. The cost is small: cron is daily, run-time is <5 min, so a stuck run blocking a fresh one is very unlikely.
- **Manual `workflow_dispatch` is also throttled by this group** — that's desirable. If someone manually triggers a run while another is in flight, they get queued behind it (or replaced if a queued one was already waiting), not running in parallel.

### 8. Other load-bearing items underspecified in the refined request

Three items not covered by the requested investigation areas but worth surfacing:

**(a) Node version pinning.** The refined request doesn't pin a Node version. `@rowanmanning/feed-parser` and `openai` v5+ both require Node 18+. Recommend Node 22 LTS (LTS through 2027), pinned via `.nvmrc` and the workflow's `actions/setup-node@v4` `node-version-file: .nvmrc`. Avoids "works locally, breaks in CI" surprise.

**(b) ESM vs CommonJS.** Greenfield 2026 project, no legacy constraints — go ESM (`"type": "module"` in `package.json`). Vitest, `openai`, and `@rowanmanning/feed-parser` are all ESM-first. The only friction is `__dirname` (use `import.meta.url` + `fileURLToPath`) — small price.

**(c) Where the pipeline actually runs `git`.** A subtle thing: `actions/checkout@v4` runs in `$GITHUB_WORKSPACE`, but the TypeScript pipeline runs as a Node child process in the same directory by default. `pr.ts` will shell out to `git` and `gh`, which both rely on `cwd === $GITHUB_WORKSPACE`. Make this explicit in `pr.ts`: pass `cwd: process.env.GITHUB_WORKSPACE ?? process.cwd()` to `execFile`. Easy to forget; surfaces as `fatal: not a git repository` if the test harness ever changes cwd.

**(d) PR body content.** Refined request says "PR body lists the new items (title + source + link) for editorial scan." Worth specifying: should the body include the AI-generated summary too? Or just the bare list? Recommendation for MVP: include `title`, `source`, `link`, and the two-sentence `ai_summary` per item — that's the minimum useful editorial-review-at-a-glance. Sortable by source. No images, no fancy formatting.

**(e) `last_reviewed` semantics.** The shared content shape says `last_reviewed: YYYY-MM-DD`. For freshly-emitted news items, A4 + F8 set this equal to `authored` (the run date). That's defensible (the AI did "review" it), but a future human editor moving the file from `/incoming/` to `/published/` should bump `last_reviewed` to their date. Document this in `docs/design/project-design.md` so it doesn't get lost.

**(f) Network egress allowance.** The pipeline makes ~5–10 outbound HTTPS calls per run (5 feeds + N triage calls). `ubuntu-latest` runners have unrestricted egress, so no firewall configuration needed — but worth noting that if the project ever moves to a self-hosted runner, the egress allowlist must include the Azure OpenAI endpoint, every feed host, plus `github.com` and `api.github.com` for `gh`.

---

## Recommended approach

A concrete, actionable summary the planning phase can pick up:

**Libraries (final picks):**
- TypeScript 5.x, Node 22 LTS, ESM (`"type": "module"`).
- `openai` (npm, v5+) — use `AzureOpenAI` class, classic Azure deployment routing.
- `@rowanmanning/feed-parser` — **replaces `rss-parser`** from A6. Pair with native `fetch` (Node 22+).
- `gray-matter` or `js-yaml` for frontmatter emission; `gray-matter` is the more common pick.
- `vitest` for tests, `@vitest/coverage-v8` for coverage.
- `memfs` for filesystem mocking.
- `eslint` + `@typescript-eslint` for lint (A8 stands).
- No new dependency on `octokit`/`@octokit/rest` — keep PR creation via `gh` CLI (A10).

**Module layout:** As in Section 5 — `src/{config,env,fetch,parse,dedup,fingerprint,azure-client,triage,slug,frontmatter,write,pr,logger,index}.ts`. Mirror under `tests/`. Five DI seams: `fetch`, `fs`, `AzureOpenAI`, `exec` (for gh), and `now`.

**Workflow YAML skeleton:**

```yaml
name: rss-triage
on:
  schedule:
    - cron: '0 6 * * *'     # placeholder (OQ2)
  workflow_dispatch:
permissions:
  contents: write
  pull-requests: write
concurrency:
  group: rss-triage
  cancel-in-progress: false
jobs:
  triage:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: pipeline/.nvmrc
          cache: 'npm'
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
      - if: steps.pipeline.outputs.new_items == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # branch + commit + push + gh pr create as in Section 3
```

**Repo-setting one-shot:** Settings → Actions → General → Workflow permissions → tick "Allow GitHub Actions to create and approve pull requests". Document in `SECRETS.md`.

**Per-feed-failure behavior:** `Promise.allSettled` across feeds; per-failed-feed `::warning::` workflow command; exit non-zero only if every feed failed. Per Section 6.

**Triage prompt strategy:** single chat completion with `temperature: 0`, `response_format: { type: "json_object" }`, system prompt explicitly using the word "JSON" and naming the four required fields. Validate the response shape with Zod; reject and log if malformed. Drop items with `relevant: false`.

---

## Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | Reddit `.rss` returns 429 from GH Actions IP ranges, r/ClaudeAI yields zero items per run | High | Low (one of five feeds; A14 absorbs) | Per-feed-failure-non-fatal. Flag to OQ1: keep, drop, or replace with OAuth (adds 3 secrets, ~30 LOC). |
| R2 | Azure OpenAI returns valid JSON but with unexpected field types ("topics" as a string, not array; "relevant" as "yes" not boolean) | Medium | Medium (silently emits bad frontmatter) | Strict Zod validation with rejection on shape mismatch (AC8). Log raw response on rejection for diagnosis. |
| R3 | `gh pr create` fails because repo-level "Allow GitHub Actions to create..." toggle was forgotten | Medium (one-time) | High (workflow red, no PR) | Document in `SECRETS.md` as a "must do before first run" checklist item. Surface as a clear error in `pr.ts`. |
| R4 | Slug collisions within a day (two items with the same title) write to the same file | Low | Medium (data loss for one item) | A4 already specifies `-2`/`-3` suffix on collision; test it in `tests/slug.test.ts` and `tests/write.test.ts`. |
| R5 | hnrss.org outage (single-maintainer service) | Low–Medium | Low (one feed) | A14 covers it. No mitigation needed beyond logging. |
| R6 | Azure OpenAI quota exhaustion mid-run | Low | Medium (partial output, PR opens with subset) | Treat per-item API failure same as per-feed failure: log, skip, continue. Document as known behavior. |
| R7 | Branch-name collision when two manual runs land on the same day (A11 uses 7-char run-id suffix → 10^9-ish space, safe) | Very Low | Low | A11 suffix handles it; surface "branch already exists" as a clear error if it ever does. |
| R8 | rss-parser drift (if A6 is kept against this recommendation): a real-world feed produces missing-guid items → fingerprint collisions on `link \|\| title` | Low | Low (fingerprint truncation gives 10^19 distinct values; `link \|\| title` is generally unique per item) | Either swap to `@rowanmanning/feed-parser` (recommended) or pin `rss-parser` and accept the staleness with a note in `Issues - Pending Items.md`. |
| R9 | `actions/setup-node@v4` cache key drift on Node version bumps causes longer cold runs | Very Low | Low (a minute per run) | Acceptable; ignore unless run-time becomes an issue. |
| R10 | Editorial workflow drift — editor deletes a rejected item from `/incoming/`, item reappears in next run (A3 known trade-off) | Medium | Low (one extra editorial reject per item) | Documented as known trade-off; OQ3 may add a `rejected-fingerprints.json` overlay if it becomes painful. |

---

## Technical Research Guidance

**Research needed: No**

The investigation surfaced enough detail for confident planning across all eight areas. The library swap recommendation (`rss-parser` → `@rowanmanning/feed-parser`) is well-supported by direct evidence (npm publish dates, open-issue counts, side-by-side feature comparison) and does not require further research before planning. The Azure OpenAI SDK pattern is well-documented by Microsoft and matches the refined request's expectations precisely; the JSON-mode and structured-outputs notes are already actionable.

Two areas where the implementation team will need to *experiment* (not research) during the implementation phase, but neither needs upfront investigation:

- **Triage prompt engineering** — the exact wording of the system prompt that yields stable, well-shaped JSON for the four required fields will require a few rounds of iteration against real feed items. This is implementation craft, not technology research; the SDK and response-format behavior are known.
- **Slug truncation edge cases** — non-Latin characters in titles (e.g., a French accent from Simon Willison's blog), emoji in HN titles. The A4 spec ("non-alphanumeric stripped") covers it, but exercising it on real data may surface a tweak. Implementation-time, not research-time.

If, during planning, the team decides to *change* the recommended approach in a non-trivial way (e.g., adopt structured outputs / `json_schema` mode instead of `json_object`, or move to OAuth-authenticated Reddit access), then a targeted Topic 1 / Topic 2 research pass would be appropriate at that point — but not before.

---

## Implementation considerations

Practical notes for the planning and implementation phases:

- **First commit should be the scaffold, not the pipeline.** `pipeline/package.json`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.cjs`, `.nvmrc`, and a stub `src/index.ts` that just throws "not implemented" — verify the lint/build/test toolchain is green before any real code lands.
- **Then the pure modules** (`fingerprint.ts`, `slug.ts`, `frontmatter.ts`) with their tests — no I/O, no mocking, fastest feedback loop.
- **Then `env.ts` and `azure-client.ts`** — wire the no-fallback-config discipline before any code that depends on it.
- **Then `parse.ts`** with RSS 2.0 and Atom XML fixtures (Anthropic's actual `rss.xml` content from a one-shot manual fetch, and the Claude Code Atom feed similarly) — fixtures live under `tests/fixtures/`.
- **Then `fetch.ts`** with mocked fetch — and verify the per-feed-failure path with a fixture that returns HTTP 500.
- **Then `dedup.ts` + `write.ts`** with `memfs`.
- **Then `triage.ts`** with the `vi.hoisted` AzureOpenAI mock pattern.
- **Then `pr.ts`** with mocked `execFile`.
- **Then `index.ts`** wiring everything together.
- **Finally the workflow YAML and the one-time repo setting.** Validate with `actionlint` (a homebrew/npm tool) before pushing — saves a round-trip to GitHub.
- **Pre-MVP: do not over-abstract.** No interfaces for single implementations. No generic "feed source adapter" pattern — the feeds are all RSS/Atom, parsed by the same library. If the team later adds Reddit-OAuth or a JSON-API-based feed, refactor then; don't anticipate.
- **Cost note:** the entire daily run is well under $0.10 of Azure OpenAI spend at `gpt-4o-mini` rates (~5 feeds × ~20 items × ~500 input tokens × $0.15/M input + small output) — quota is not a concern for daily cadence. Worth mentioning in `SECRETS.md` so the team isn't surprised.

---

## References

| # | Source | URL | What was learned |
|---|--------|-----|-----------------|
| 1 | npm — `openai` package overview (Better Stack / DeepWiki / Microsoft Learn distillation) | https://learn.microsoft.com/en-us/javascript/api/overview/azure/openai-readme | The `AzureOpenAI` class in the official `openai` package is the canonical 2026 path; `@azure/openai` is the deprecated companion. |
| 2 | Microsoft Learn — Azure OpenAI structured outputs (Node) | https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs | Deployment-name-as-`model` convention; structured outputs require `gpt-4o-2024-08-06`+; `json_object` mode is portable across deployments. |
| 3 | Microsoft Learn — Azure OpenAI v1 API lifecycle | https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle | v1 GA is available; classic deployment-path API remains supported and is the recommendation for explicit version pinning. |
| 4 | Snyk Advisor — rss-parser | https://snyk.io/advisor/npm-package/rss-parser | rss-parser has had no npm publish in ~3 years; flagged as potentially discontinued. |
| 5 | GitHub — rbren/rss-parser issues | https://github.com/rbren/rss-parser/issues | ~20 open 2024 issues unresolved, including the known `<guid>` / `<content:encoded>` extraction edge case. |
| 6 | GitHub — rowanmanning/feed-parser | https://github.com/rowanmanning/feed-parser | Actively maintained alternative; tests against ~40 real-world feeds; lenient parsing; throws `INVALID_FEED` on garbage. |
| 7 | npm — @rowanmanning/feed-parser | https://www.npmjs.com/package/@rowanmanning/feed-parser | TypeScript-friendly API; `parseFeed(xmlString)` shape; URL fetching is left to caller (a design win for testability). |
| 8 | BazQux Reader community — Reddit RSS 429s | https://discourse.bazqux.com/t/reddit-rss-feeds-returning-http-429-too-many-requests/323 | Reddit has been throttling anonymous `.rss` access aggressively since 2023; anonymous IP-based 429s are now the norm. |
| 9 | Reddit API rate limits 2026 | https://painonsocial.com/blog/reddit-api-rate-limits-guide | Authenticated OAuth limit is 100 QPM per app; anonymous is heavily throttled. |
| 10 | hnrss.org — overview & 2026 status | https://dupple.com/blog/hacker-news-rss | hnrss.org is actively serving feeds in 2026; treated as the de facto power-user HN RSS solution. |
| 11 | GitHub Docs — controlling permissions for `GITHUB_TOKEN` | https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token | Workflow `permissions:` block grants `contents: write` and `pull-requests: write`; both are needed for `gh pr create`. |
| 12 | codestudy.net — "Allow GitHub Actions to create and approve pull requests" toggle | https://www.codestudy.net/blog/github-actions-is-not-permitted-to-create-or-approve-pull-requests-createpullrequest/ | The repo-level toggle under Settings → Actions → General → Workflow permissions is mandatory; workflow-level perms alone are insufficient. |
| 13 | Baeldung on Ops — Create PR with GitHub Actions | https://www.baeldung.com/ops/github-actions-create-pr | Canonical minimal workflow pattern for `gh pr create` with `GITHUB_TOKEN`. |
| 14 | GitHub Docs — Concurrency | https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency | `concurrency.group` + `cancel-in-progress: false` is the right pattern for non-overlapping cron workflows. |
| 15 | SitePoint — Vitest vs Jest 2026 | https://www.sitepoint.com/vitest-vs-jest-2026-migration-benchmark/ | Vitest is 5–8× faster than Jest on Node-only TS suites; native ESM + TS, no transformer config. |
| 16 | Better Stack — Vitest vs Jest | https://betterstack.com/community/guides/scaling-nodejs/vitest-vs-jest/ | `vi.mock` Jest-compatible; `vi.hoisted` pattern for mocks that need closure variables. |
| 17 | PkgPulse — node:test vs Vitest vs Jest 2026 | https://www.pkgpulse.com/guides/node-test-vs-vitest-vs-jest-native-test-runner-2026 | 2026 split: ~50% Jest legacy, ~40% Vitest, ~10% node:test; Vitest is recommended for greenfield. |
| 18 | Mozilla Bugzilla — RSS feeds without GUID | https://bugzilla.mozilla.org/show_bug.cgi?id=264482 | Standard fallback chain when GUID is missing: link → title; some feeds omit both. Supports A5's fingerprint design. |

---

## Original request

The orchestrator passed the following refined request and instructions:

- Refined request file: `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/rss-pipeline.md`
- Greenfield repo at `/Users/suzy/ClaudeCode/Projects/NbgAiHub/` — no existing code; SCOPE.md, DECISIONS.md, CLAUDE.md, `Issues - Pending Items.md`, `.gitignore`, empty `docs/` subdirs only.
- The eight investigation areas listed in the orchestrator brief — Azure OpenAI SDK pattern, `rss-parser` health, GitHub Actions commit-and-PR pattern, Vitest vs Jest, module organization, failure-mode strategy, workflow concurrency, and other underspecified load-bearing items — are addressed above in the corresponding numbered sections.
