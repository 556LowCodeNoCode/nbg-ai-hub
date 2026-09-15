# Refined Request: RSS News Pipeline (Daily GitHub Action -> Azure OpenAI Triage -> Editorial PR)

## Category
Development (with Infrastructure/CI elements — GitHub Action workflow + TypeScript runtime + external AI API integration)

## Objective
Implement a daily-scheduled, TypeScript-based GitHub Action for the private `chomovazuzana/NbgAiHub` repository that fetches a configurable list of RSS/Atom feeds, deduplicates against previously seen items, calls Azure OpenAI to filter for audience relevance and to generate per-item metadata (audience tag, topical tags, two-sentence summary), writes each new relevant item as a markdown file conforming to the hub's shared frontmatter schema into `/news/incoming/`, and opens an editorial pull request titled `News triage YYYY-MM-DD`. The pipeline must be the **curated** gate described in `DECISIONS.md` ("Curated RSS, not auto-aggregated") — fully automated up to the PR; humans take over from there.

## Scope

### In scope
- TypeScript implementation of the RSS fetch / triage / write pipeline (per global rule "Tool implementations are TypeScript").
- A GitHub Action workflow file under `.github/workflows/` that runs the pipeline on a daily schedule (placeholder cron — see Assumptions).
- An externalized RSS source list at `config/rss-sources.json` (so the cadence-and-list open questions in `SCOPE.md` can be resolved without code changes).
- Azure OpenAI integration through GitHub Action secrets: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY`. Strictly no fallback values (per global CLAUDE.md): missing secret => explicit exception, pipeline fails loudly.
- Per-item triage via Azure OpenAI producing: relevance verdict (in/out), `audience` (`beginner | advanced | both`), `topics` (tags like `setup`, `workflow`, `github`, `mcp`, `claudemd`, …), and a two-sentence `ai_summary`.
- Frontmatter conforming to the canonical "Shared content shape" (`DECISIONS.md` 2026-05-18 entry). `type: news`, `internal: false` by default for public RSS content.
- Markdown file emission to `/news/incoming/<YYYY-MM-DD>-<slug>.md`.
- Deduplication across runs against items already present in `/news/incoming/` AND `/news/published/` (since the editorial workflow moves files from incoming -> published).
- Automated PR creation titled `News triage YYYY-MM-DD` on a per-run branch.
- Graceful per-feed failure handling (one broken feed must not abort the whole run).
- Unit / integration tests covering: feed parsing, dedup, frontmatter shape, slug generation, Azure OpenAI client (mocked), and error paths (missing env vars, unreachable feed).
- Documentation of the four required secrets in a `SECRETS.md` (or under a "Secrets" section in `CLAUDE.md`).
- Updates to `docs/design/project-design.md` and `docs/design/project-functions.md` to reflect this pipeline (create the files if they do not yet exist — currently they don't).

### Out of scope
- Deciding the final RSS source list (deferred — open question in `SCOPE.md`).
- Deciding the final cron cadence (deferred — open question in `SCOPE.md`).
- Astro Starlight static site generation, rendering of news items on the web UI, or any Pages deployment workflow.
- The `/hub-*` skill plugin and any runtime AI features.
- Moving items from `/news/incoming/` to `/news/published/` automatically — that is the **editorial gate** by design.
- Deleting stale incoming items (no auto-pruning in this iteration; flagged as Assumption).
- Bank-confidential content handling (the pipeline processes only public RSS).
- Backfilling history (the pipeline starts from "now"; older items are not retroactively triaged).
- Semantic clustering or de-duplication across feeds (e.g., the same story on HN and Anthropic). Exact-fingerprint dedup only.
- Cost control / token budget enforcement beyond what the Azure OpenAI deployment quota provides.

## Requirements

### Functional

1. **F1 — Scheduled execution.** A GitHub Action workflow at `.github/workflows/rss-triage.yml` runs on a daily cron schedule (placeholder value; see Assumptions A2). The workflow must also support manual triggering via `workflow_dispatch`.

2. **F2 — Configurable feed list.** Feeds are read from `config/rss-sources.json`. Each entry has at minimum: `name` (human label), `url`, `enabled` (boolean). The five candidate URLs from `SCOPE.md` ship as the initial seed list with `enabled: true`, but the list is data, not code.

3. **F3 — Feed fetching.** The pipeline fetches all enabled feeds, parses RSS 2.0 and Atom, and yields a normalized item shape: `{ feedName, guid, link, title, publishedAt, rawContent }`. Network or parse failure for an individual feed is logged and skipped; remaining feeds proceed.

4. **F4 — Deduplication.** For each fetched item, the pipeline computes a stable fingerprint and skips items whose fingerprint already appears in `/news/incoming/` or `/news/published/` (fingerprint stored in frontmatter — see F8). No item is processed by Azure OpenAI twice across runs.

5. **F5 — Azure OpenAI triage call.** For each new, non-duplicate item, the pipeline calls Azure OpenAI (chat completions) with a single prompt that returns a JSON object:
   ```json
   {
     "relevant": true,
     "audience": "beginner" | "advanced" | "both",
     "topics": ["setup", "workflow", "..."],
     "summary": "Two sentences."
   }
   ```
   If `relevant === false`, the item is dropped (not written to disk).

6. **F6 — No fallback config.** On invocation, the pipeline reads `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY` from `process.env`. If any is missing or empty, the pipeline throws an explicit, named exception identifying the missing variable, and the Action step fails. **No silent defaults. No `||` fallbacks. No `.env` file lookup in production runs.**

7. **F7 — Markdown file emission.** Each relevant item is written to `/news/incoming/<YYYY-MM-DD>-<slug>.md`. Date is the run date (UTC). Slug is derived from the item title (see Assumption A4).

8. **F8 — Frontmatter conformance.** Each emitted file's frontmatter conforms to the canonical "Shared content shape" from `DECISIONS.md`. Concretely:
   ```yaml
   ---
   type: news
   title: "<item title>"
   audience: beginner | advanced | both
   topics: [...]
   internal: false
   authored: <YYYY-MM-DD run date>
   last_reviewed: <YYYY-MM-DD run date>
   external_link: <item link>
   deeper_link: null      # left null for news; humans fill in if relevant
   ai_summary: "<two-sentence summary>"
   # pipeline-specific:
   source: "<feed name>"
   fingerprint: "<dedup key>"
   ---
   ```
   The body of the file is the two-sentence summary followed by a `> Source: [<feed name>](<link>)` line.

9. **F9 — Pull request creation.** After all items are written, if at least one new file exists, the workflow commits the changes on a new branch named `news-triage/YYYY-MM-DD-<short-run-id>` and opens a PR with title `News triage YYYY-MM-DD`. PR body lists the new items (title + source + link) for editorial scan. If no new items are emitted, no PR is opened (idempotent no-op run).

10. **F10 — Editorial workflow shape (documented, not coded).** Editors review the PR, optionally delete or edit files in `/news/incoming/`, **move** approved files to `/news/published/` (either by editing the PR before merge, or in a follow-up PR), then merge. The pipeline does not enforce this — but `SECRETS.md` (or `docs/design/project-design.md`) documents the workflow.

### Non-functional

11. **NF1 — TypeScript only.** All pipeline code is TypeScript, compiled with strict mode (`"strict": true` in `tsconfig.json`).

12. **NF2 — Build green.** `npx tsc --noEmit` exits 0.

13. **NF3 — Lint clean.** ESLint (or equivalent — see Assumption A8) passes with zero errors on all pipeline source files.

14. **NF4 — Test coverage.** Unit + integration tests for the modules listed in Acceptance Criteria below; the test suite passes via a single npm script.

15. **NF5 — Free-tier-friendly.** The Action runs on `ubuntu-latest`, completes within a few minutes for ~5 feeds × ~20 items each, and stays well within the 2,000 free private Action minutes/month.

16. **NF6 — Observability.** Each run logs (to Action stdout): feeds attempted, feeds failed (with reason), items fetched per feed, items deduped, items judged irrelevant, items written, PR URL.

17. **NF7 — No version-control side effects beyond the workflow's own commit and PR.** The pipeline does not push to `main`, does not delete files, does not rewrite history. (Aligns with global rule "Do not perform version control operations unless explicitly requested" — here, the PR creation IS the explicit request encoded in the workflow.)

## Constraints

- **TypeScript implementation** (global CLAUDE.md, "Tool implementations are TypeScript").
- **Azure OpenAI only** (DECISIONS.md, "AI strategy: build-time + Claude skill, not web runtime" — Azure for bank-policy alignment).
- **No fallback values for missing configuration** (global CLAUDE.md). Required env vars must throw on absence.
- **Curated, not auto-aggregated** (DECISIONS.md, "Curated RSS, not auto-aggregated") — PR is the editorial gate; merges to `main` are human-only.
- **Private repo, personal GitHub account** (DECISIONS.md, 2026-05-18 PRIVATE override). Workflow's default `GITHUB_TOKEN` permissions must explicitly include `contents: write` and `pull-requests: write` in the workflow YAML — flagged because private personal repos default to read-only tokens in some org configurations.
- **Singular database table names** (global rule) — not applicable here (no DB), but noted.
- **Shared content shape** (DECISIONS.md) is canonical and not negotiable in this work.
- **Pre-MVP design phase** — code should be simple, readable, and easy to revise. No premature abstraction.
- **Ports rule** — not applicable (no dev server); noted for completeness.

## Acceptance Criteria

Each criterion below is falsifiable: a reviewer must be able to produce concrete evidence (test name, `file:line`, observed run log) showing pass or fail.

- **AC1 — Workflow file exists and is valid.** A file at `.github/workflows/rss-triage.yml` exists, contains a `schedule: cron` trigger and a `workflow_dispatch` trigger, declares `permissions: contents: write, pull-requests: write`, and references the four `AZURE_OPENAI_*` secrets by name. Evidence: file contents + `actionlint` (or GitHub's UI) reporting no syntax errors.

- **AC2 — TypeScript build is clean.** `npx tsc --noEmit` exits 0 on a clean checkout after `npm install`. Evidence: CI log line or local terminal output.

- **AC3 — Lint is clean.** The lint script (`npm run lint`) exits 0. Evidence: CI log or local output.

- **AC4 — RSS sources are externalized.** `config/rss-sources.json` exists, is read by the pipeline at runtime, and contains all five candidate feeds from `SCOPE.md`. Adding a sixth feed requires editing only this file. Evidence: test `loads sources from config/rss-sources.json` in `tests/config.test.ts` (or equivalent).

- **AC5 — Fetch stage parses RSS and Atom.** Given a fixture RSS 2.0 feed and a fixture Atom feed, the parser produces normalized items with `guid`, `link`, `title`, `publishedAt`. Evidence: tests `parses RSS 2.0 fixture` and `parses Atom fixture` in `tests/fetch.test.ts`.

- **AC6 — Fetch stage is resilient to per-feed failure.** Given one good feed and one feed that returns HTTP 500 (or malformed XML), the pipeline logs the failure and still emits items from the good feed. Evidence: test `continues after individual feed failure` in `tests/fetch.test.ts`.

- **AC7 — Dedup blocks already-seen items.** Given an item whose fingerprint matches an existing file under `/news/incoming/` or `/news/published/`, the pipeline skips it and does not call Azure OpenAI for it. Evidence: test `skips items whose fingerprint exists in incoming or published` in `tests/dedup.test.ts`.

- **AC8 — Triage stage produces structured output.** Given a mocked Azure OpenAI client returning the JSON shape from F5, the pipeline correctly extracts `relevant`, `audience`, `topics`, `summary` and rejects malformed responses. Evidence: tests `parses well-formed triage response` and `rejects malformed triage response` in `tests/triage.test.ts`.

- **AC9 — Irrelevant items are dropped.** When Azure OpenAI returns `relevant: false`, no markdown file is emitted for that item. Evidence: test `drops items marked irrelevant` in `tests/triage.test.ts`.

- **AC10 — Missing env var throws explicit named exception.** With `AZURE_OPENAI_API_KEY` unset (and the other three set), invoking the Azure OpenAI client constructor throws an exception whose message names the missing variable. No fallback, no silent default. Evidence: test `throws when AZURE_OPENAI_API_KEY missing` (and three sibling tests for the other variables) in `tests/azure-client.test.ts`.

- **AC11 — Frontmatter conforms to shared content shape.** Each emitted file's frontmatter contains exactly these keys: `type`, `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`, `source`, `fingerprint`. `type === 'news'` and `internal === false`. Evidence: test `emits frontmatter matching shared content shape` in `tests/write.test.ts` that parses the emitted file with a YAML parser and asserts key set + values.

- **AC12 — Filename format is correct.** Emitted files match the pattern `^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$` and live under `/news/incoming/`. Evidence: test `emits files with date-slug.md name` in `tests/write.test.ts`.

- **AC13 — PR creation runs end-to-end (smoke).** A scripted dry run (or a recorded integration test against a fixture git directory) demonstrates: branch created, commit made, PR title equals `News triage YYYY-MM-DD`. Evidence: test `creates triage PR with correct title and branch` in `tests/pr.test.ts` using a mocked Octokit / `gh` client.

- **AC14 — Empty-run no-op.** When zero new relevant items are produced, no commit and no PR is created; the workflow exits 0 with a log line `no new items, skipping PR`. Evidence: test `does not open PR when no new items` in `tests/pr.test.ts`.

- **AC15 — Secrets are documented.** A `SECRETS.md` at the repo root (or a `## Secrets` section in `CLAUDE.md`) lists each of the four `AZURE_OPENAI_*` secrets, what value goes in, and where to set it in GitHub. Evidence: file path + grep for each variable name.

- **AC16 — Design docs updated.** `docs/design/project-design.md` and `docs/design/project-functions.md` exist and contain a section describing the RSS pipeline. Evidence: file paths + grep for "RSS" in each.

- **AC17 — No deprecated dependencies introduced.** `npm install` produces no `deprecated` warnings for direct dependencies in `package.json`. Evidence: install log.

- **AC18 — Workflow permissions are explicit.** The workflow YAML contains an explicit `permissions:` block granting `contents: write` and `pull-requests: write` and nothing else. Evidence: workflow file inspection.

## Assumptions

These were inferred during refinement. They are listed so they can be challenged before downstream phases run. Items (a)-(d) are flagged explicitly as required by the raw request.

- **A1 (a) — RSS source list is the five candidates from `SCOPE.md`.** This list is still an OPEN QUESTION in `SCOPE.md` and is **not locked**. The implementation will treat the five URLs as a starting seed in `config/rss-sources.json`; sign-off is required before they are considered final. The pipeline must be data-driven so swapping the list requires no code change.

- **A2 (b) — Cron cadence is `0 6 * * *` (06:00 UTC daily) as a placeholder.** Editorial cadence is OPEN in `SCOPE.md`. The chosen value is a stake-in-the-ground; flipping to weekly or twice-weekly means changing one line of the workflow YAML, not the code.

- **A3 (c) — Dedup mechanism: fingerprint in frontmatter, scanned at runtime.** Two options were considered: (i) commit a JSON state file (`config/seen-fingerprints.json`); (ii) recompute by scanning existing `/news/incoming/` and `/news/published/` files at runtime. **Chosen: option (ii)** — recompute by walking those two folders and reading the `fingerprint` field from each file's frontmatter. Rationale: avoids a separate state file that could drift from reality; the markdown files themselves are the source of truth; an editor who deletes a file from `/news/incoming/` (rejecting an item) won't have the item re-emitted because the fingerprint also exists in a `seen.json` — but with option (ii), a rejected-and-deleted item COULD reappear. This is a known trade-off; if rejection-stickiness becomes important, we add option (i) as an overlay (a small `config/rejected-fingerprints.json` of explicit rejects). Flagged for sign-off.

- **A4 (d) — Slug format: lowercase kebab-case of the title, truncated to 60 characters at a word boundary, with non-alphanumeric stripped.** Example: `Anthropic ships Claude 4 with vision` -> `anthropic-ships-claude-4-with-vision`. Collisions within the same day are resolved by appending `-2`, `-3`, etc. No hash suffix in normal cases (keeps filenames human-scannable in PRs). Flagged for sign-off.

- **A5 — Fingerprint format: SHA-256 of `feedName + '\n' + (guid || link || title)`.** Hex-encoded, truncated to 16 characters in the frontmatter for readability. The truncation gives ~10^19 distinct values — collision-safe at the scale of this hub.

- **A6 — RSS parser library: `rss-parser` (npm).** Maintained, widely used, handles RSS 2.0 + Atom transparently. Alternatives considered: `feedparser` (older API), hand-rolling (rejected, scope creep).

- **A7 — Azure OpenAI SDK: official `openai` npm package configured for Azure** (set `baseURL` from `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_DEPLOYMENT` + `AZURE_OPENAI_API_VERSION`, auth via `api-key` header from `AZURE_OPENAI_API_KEY`). Alternative `@azure/openai` is deprecated in favor of the unified `openai` client per Microsoft guidance — chosen accordingly.

- **A8 — Lint stack: ESLint + `@typescript-eslint`** with a minimal recommended ruleset. No Prettier wired in for MVP; left as a follow-up.

- **A9 — Test framework: Vitest.** Native ESM + TypeScript support, fast, no transformer config. Alternative `jest` requires more setup for TS.

- **A10 — PR creation tool: the `gh` CLI** (preinstalled on `ubuntu-latest` runners). Authenticated via `GITHUB_TOKEN`. Alternative: `peter-evans/create-pull-request` Action (heavier dependency, more magic). The `gh` route is more transparent and keeps the pipeline a single Node entry point.

- **A11 — Branch naming: `news-triage/YYYY-MM-DD-<short-run-id>`** where short-run-id is the first 7 chars of `GITHUB_RUN_ID`. Multiple manual runs on the same day will not collide.

- **A12 — PR title format: literal `News triage YYYY-MM-DD`** as specified in the raw request. PR body is auto-generated and lists each new item.

- **A13 — Pipeline does NOT delete stale incoming items.** Items left in `/news/incoming/` indefinitely are an editorial backlog, not garbage. A future enhancement could auto-close PRs older than N days, but it's out of scope here.

- **A14 — Source failures are non-fatal.** A 5xx, 4xx, network timeout, or malformed-feed condition on one source logs and continues. If ALL configured feeds fail, the run exits non-zero (loud failure, no silent zero-item run).

- **A15 — Workflow permissions for PR creation.** The repo's Actions settings must allow workflows to create pull requests (Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"). This is a one-time repo setting documented in `SECRETS.md`. The token permissions are scoped in the workflow YAML (`contents: write`, `pull-requests: write`).

- **A16 — UTC timezone.** All dates (filename, frontmatter `authored`, `last_reviewed`, PR title) use UTC. No timezone-locality at this stage.

- **A17 — Prompt structure for Azure OpenAI.** A single user-message JSON-mode call ("respond with this JSON schema only"); model parameter pulled from `AZURE_OPENAI_DEPLOYMENT` (deployment name, not model name — this is Azure's convention). Temperature 0 for stability.

- **A18 — Project root for source code.** Pipeline lives under `pipeline/` (TypeScript sources), with `pipeline/src/`, `pipeline/tests/`, `pipeline/package.json`, `pipeline/tsconfig.json`. Alternative: top-level `src/`. Putting it under `pipeline/` leaves room for the future Astro Starlight site at the repo root without entangling tsconfigs.

- **A19 — Issues - Pending Items.md updates.** Any deviation discovered during implementation (e.g., an env-var-fallback case found to be genuinely needed) is registered there per global rules before being implemented.

## Open Questions

These remain after refinement and must be resolved before or during implementation:

- **OQ1 — RSS source list final sign-off.** The five candidates are seed values, not locked. *(Tracked in `SCOPE.md` → Open questions.)*
- **OQ2 — Editorial cadence final sign-off.** Daily action + weekly PR review? Daily PR review? Other? Affects the cron expression but not the code. *(Tracked in `SCOPE.md` → Open questions.)*
- **OQ3 — Dedup overlay needed?** Does the team want rejected-item stickiness (Assumption A3)? If yes, add a small `config/rejected-fingerprints.json` mechanism.
- **OQ4 — Slug collisions across days.** Same-title item appearing on two different days will produce two different filenames (`2026-05-18-foo.md` and `2026-05-19-foo.md`) but the same `fingerprint` — so the second is correctly skipped by dedup. Confirm this is desired (yes, per A3 logic — but worth surfacing).
- **OQ5 — Azure OpenAI deployment SKU.** Which deployment name is provisioned (e.g., `gpt-4o-mini` vs `gpt-4o`)? Cost/quality trade-off; chosen value lives in the `AZURE_OPENAI_DEPLOYMENT` secret, but the test suite should ideally pin to a known-good deployment for repeatability.

## Definition of Done

This work is mergeable when **all** of the following hold:

1. **AC1–AC18 all pass** with concrete evidence linked in the PR description.
2. **Build green:** `npx tsc --noEmit` exits 0.
3. **Lint green:** `npm run lint` exits 0.
4. **Tests green:** `npm test` exits 0 and the suite covers fetch, dedup, triage, write, PR-creation, and azure-client modules.
5. **Configuration externalized:** `config/rss-sources.json` exists; the five seed feeds live there; no feed URL is hardcoded in TypeScript.
6. **Workflow file exists:** `.github/workflows/rss-triage.yml` is present, declares the cron + `workflow_dispatch` triggers, scopes `permissions` explicitly, and references the four `AZURE_OPENAI_*` secrets by name.
7. **Secrets documented:** `SECRETS.md` at the repo root lists each of the four `AZURE_OPENAI_*` secrets with purpose and where to set them; mentions the repo Actions setting "Allow GitHub Actions to create and approve pull requests" (Assumption A15).
8. **Design docs updated:** `docs/design/project-design.md` and `docs/design/project-functions.md` exist and describe the pipeline; `SCOPE.md` Open Questions section cross-references this refined request.
9. **No deprecated dependencies:** `npm install` produces no `deprecated` warnings for direct dependencies.
10. **No new entries in `Issues - Pending Items.md`** beyond ones the team consciously accepts (e.g., OQ3 if not resolved).
11. **No version-control side effects** outside the PR-creation behavior the workflow is built to perform (per global rule).
12. **A real end-to-end run** has been demonstrated at least once on a non-`main` branch — workflow triggers, pipeline runs, PR appears titled `News triage YYYY-MM-DD`, files in `/news/incoming/` conform to schema. (Aligns with the demo-ability checklist item in `SCOPE.md`: "One full end-to-end RSS pipeline run completed".)

## Original Request

> Build the RSS news pipeline for NbgAiHub — a curated Claude Code knowledge hub at github.com/chomovazuzana/NbgAiHub (private personal repo, pre-MVP design phase).
>
> The pipeline is a GitHub Action that:
> 1. Runs on a daily schedule (cadence is still an OPEN QUESTION — see SCOPE.md → Open questions → Editorial cadence)
> 2. Fetches 5 RSS sources. The candidate list (PENDING SIGN-OFF — listed under SCOPE.md → Open questions → RSS starter list):
>    - Anthropic news — https://www.anthropic.com/rss.xml
>    - Claude Code GitHub releases — https://github.com/anthropics/claude-code/releases.atom
>    - Simon Willison's blog — https://simonwillison.net/atom/everything/
>    - r/ClaudeAI — https://www.reddit.com/r/ClaudeAI/.rss
>    - Hacker News filtered — https://hnrss.org/frontpage?q=Claude+OR+%22Claude+Code%22+OR+Anthropic
> 3. For each new item not seen before (dedup), calls Azure OpenAI to:
>    - Filter for relevance to the hub's audience (bank colleagues learning Claude Code)
>    - Assign audience tag: [beginner | advanced | both]
>    - Assign topical tags (setup, workflow, github, mcp, claudemd, etc.)
>    - Generate a 2-sentence summary
> 4. Writes each relevant item as a markdown file with the shared frontmatter schema (see DECISIONS.md → "Shared content shape") to /news/incoming/<date>-<slug>.md
> 5. Opens a pull request titled "News triage YYYY-MM-DD" with all new items for editorial review
> 6. After review, an editor moves approved files from /news/incoming/ to /news/published/ — typically by editing the PR before merging
>
> Hard constraints:
> - TypeScript implementation per global CLAUDE.md (~/.claude/CLAUDE.md → "Tool implementations are TypeScript")
> - Azure OpenAI (not direct Anthropic), per DECISIONS.md → "AI strategy" entry. Aligns with the bank-data-runtime rule from the Onboarding guide §5 even though RSS is public.
> - Credentials provided as GitHub Action secrets: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_API_KEY. No fallback values for missing config per global CLAUDE.md.
> - Curated, NOT auto-aggregated — the PR step is the editorial gate per DECISIONS.md → "Curated RSS, not auto-aggregated".
> - Repo is private; the GitHub Action runs on free private Actions minutes (2000/month on free tier — generous for daily runs).
>
> Mandatory project context to read before refining:
> - /Users/suzy/ClaudeCode/Projects/NbgAiHub/SCOPE.md (especially the 5-pillar IA, the "Repo & hosting" section flagging private/personal repo, and the Open questions on RSS list + editorial cadence)
> - /Users/suzy/ClaudeCode/Projects/NbgAiHub/DECISIONS.md (especially: Curated RSS, Shared content shape, AI strategy, Hub-as-skill plugin — these all touch the pipeline)
> - /Users/suzy/ClaudeCode/Projects/NbgAiHub/CLAUDE.md
> - ~/.claude/CLAUDE.md (global rules: TypeScript for tools, no fallback for missing config, port discipline, no VC ops without explicit request)
>
> Important context cues the refiner should pick up and reflect in Assumptions:
> - The RSS source list and the editorial cadence are STILL OPEN in SCOPE.md. The pipeline implementation must not hardcode them as if locked — load sources from a config file (e.g., config/rss-sources.json) and cadence from the workflow YAML schedule expression that's easy to change.
> - The "shared content shape" frontmatter (type, title, audience, topics, internal, authored, last_reviewed, external_link, deeper_link, ai_summary) is canonical across all content types — the pipeline writes news items conforming to this schema. The `type` for these files is `news`. The `internal` flag should default to `false` for public RSS content.
> - Dedup mechanism is a real design choice — fingerprint by GUID/link/title, persisted between Action runs (commit a JSON state file, or compute fingerprints by scanning the existing /news/incoming/ and /news/published/ folders at runtime?). The refiner should flag this as an Assumption to surface.
> - Slug format for filenames is a design choice (truncated title? hash? combination?). Flag as Assumption.
> - The Action needs to gh-PR-create automatically; the workflow's default GITHUB_TOKEN has the permissions to create PRs IF the repo has Actions configured to allow it. Worth flagging.
>
> This specification will drive a full development workflow (investigation, planning, design, implementation, review, and testing), so ensure the refinement is thorough and development-oriented.
