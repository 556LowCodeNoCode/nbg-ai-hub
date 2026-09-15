# Plan 001 — RSS News Pipeline

**Source request:** `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/rss-pipeline.md`
**Investigation:** `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/investigation-rss-pipeline.md`
**Created:** 2026-05-18
**Status:** Draft — awaiting Phase 5 (Designer) consumption

This plan covers **sequencing, dependencies, files-to-modify, and verification criteria**. It does NOT define interfaces, data models, function signatures, error-handling strategy, or class structures — those are owned by Phase 5 (Designer).

---

## 1. Refinement reconciliations

The plan deviates from the refined request in exactly one place. All other Assumptions (A1–A5, A7–A19) carry through as written.

| # | Refined assumption | Plan resolution | Reason |
|---|--------------------|-----------------|--------|
| R-1 | **A6** — Use `rss-parser` for RSS/Atom parsing. | **Superseded.** Use `@rowanmanning/feed-parser` plus native `fetch` (Node 22+) instead. | Investigation §2 — `rss-parser` has had no npm release in ~3 years, ~20 unresolved 2024 issues, and is widely treated as effectively unmaintained. `@rowanmanning/feed-parser` is actively maintained, ships first-class TS types, is tested against ~40 real-world feeds, throws a typed `INVALID_FEED` on garbage, and forces a clean fetch/parse split (a testability win for the per-feed-failure path). Recorded in `Issues - Pending Items.md` per A19; a DECISIONS.md entry follows on acceptance. |
| R-2 | (No explicit assumption) — Workflow concurrency strategy. | **Add** a top-level `concurrency: { group: rss-triage, cancel-in-progress: false }` block to `rss-triage.yml`. | Investigation §7 — prevents overlapping cron + `workflow_dispatch` runs. Fixed group name (no ref parameterization since cron is default-branch only); `cancel-in-progress: false` so a running pipeline finishes its PR rather than being killed mid-`gh pr create`. |
| R-3 | (Implicit) — Reddit `r/ClaudeAI` 429 risk. | **No special-case.** A14 (per-feed failure is non-fatal) absorbs it. Document the known weak-spot in `SECRETS.md` / `pipeline/README.md`. | Investigation §2 — anonymous Reddit `.rss` from GH Actions IP ranges frequently returns 429. The non-fatal-feed contract is the correct level at which to handle it. OAuth replacement is OQ1 territory, not this plan. |
| R-4 | (Underspecified) — Node version, ESM. | Pin **Node 22 LTS** via `pipeline/.nvmrc`; project is **ESM** (`"type": "module"`). | Investigation §8 (a), (b). `@rowanmanning/feed-parser` and `openai` v5+ both require Node 18+; greenfield 2026 project, no CJS legacy. |
| R-5 | (Underspecified) — PR body content. | PR body lists, per item: `title`, `source`, `external_link`, `ai_summary` (the two sentences). Grouped/sorted by source. | Investigation §8 (d). Editorial-review-at-a-glance minimum useful payload. |
| R-6 | (Underspecified) — `model` parameter at call site. | Pass `process.env.AZURE_OPENAI_DEPLOYMENT` as **both** the constructor `deployment` AND the `chat.completions.create({ model, … })` argument. | Investigation §1, gotcha 1 — Microsoft sample convention; the SDK requires `model` even though routing is by deployment. |
| R-7 | (Underspecified) — `cwd` for shelled-out `git`/`gh`. | `pr.ts` must pass `cwd: process.env.GITHUB_WORKSPACE ?? process.cwd()` to `execFile`. | Investigation §8 (c) — avoids `fatal: not a git repository` if cwd ever drifts. |

No other deviations. Phase 5 should treat the rest of the refined request's Assumptions section as locked-in for this work.

---

## 2. Phase breakdown

Steps are numbered in implementation order. Dependencies are explicit. "Effort" is S (≤1h), M (1–4h), L (4–8h). All paths absolute unless they are repository-relative working files (those are relative to repo root `/Users/suzy/ClaudeCode/Projects/NbgAiHub/`).

### Step 1 — Scaffold the `pipeline/` workspace

**Goal:** Establish the Node 22 LTS / TypeScript / Vitest / ESLint workspace under `pipeline/` so every later step lands in green tooling.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/package.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tsconfig.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/vitest.config.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/.eslintrc.cjs`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/.nvmrc`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/.gitignore`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/index.ts` (stub: throws `"not implemented"`)
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/smoke.test.ts` (asserts `true`)

**Dependencies:** none.

**Verification:**
- `cd pipeline && npm install` exits 0 and produces **no `deprecated` warnings for direct deps** (AC17).
- `cd pipeline && npx tsc --noEmit` exits 0 (AC2).
- `cd pipeline && npm run lint` exits 0 (AC3).
- `cd pipeline && npm test` exits 0 (smoke).
- `cd pipeline && cat .nvmrc` reads `22` (or a `22.x.y` pin).
- `cd pipeline && node -e "import('./package.json', {assert:{type:'json'}}).then(m=>console.log(m.default.type))"` prints `module`.

**Effort:** M

---

### Step 2 — Seed `config/rss-sources.json` with the five candidate feeds

**Goal:** Externalize the feed list (F2, AC4). Five seed feeds from SCOPE.md ship `enabled: true`.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/config/rss-sources.json`

**Dependencies:** none (parallel-safe with Step 1).

**Verification:**
- File exists; `jq '. | length' config/rss-sources.json` returns `5`.
- All five candidate URLs from SCOPE.md (Anthropic, Claude Code releases, Simon Willison, r/ClaudeAI, hnrss.org) appear in the file.
- Each entry has the keys `name`, `url`, `enabled` (boolean).

**Effort:** S

---

### Step 3 — Pure modules: `fingerprint`, `slug`, `frontmatter`

**Goal:** Land the three I/O-free building blocks first (no mocks, fastest feedback loop). Implements the deterministic parts of A4 (slug), A5 (fingerprint), F8 (frontmatter shape).

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/fingerprint.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/slug.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/frontmatter.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/fingerprint.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/slug.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/frontmatter.test.ts`

**Dependencies:** Step 1 (scaffold).

**Verification:**
- `npm test -- fingerprint slug frontmatter` runs all three test files green.
- `tests/fingerprint.test.ts` asserts SHA-256 + 16-char hex truncation, deterministic across calls, fallback chain `guid → link → title`.
- `tests/slug.test.ts` asserts kebab-case, 60-char cap at word boundary, non-alphanumerics stripped, collision suffix `-2`/`-3`.
- `tests/frontmatter.test.ts` asserts emitted frontmatter contains exactly the 12 keys named in AC11 with the values prescribed by F8 (`type === 'news'`, `internal === false`, etc.) (AC11).

**Effort:** M. Parallelizable internally — three independent units of work.

---

### Step 4 — Env reader (`env.ts`) + Azure OpenAI client constructor (`azure-client.ts`)

**Goal:** Implement the no-fallback-config discipline (F6, AC10) before any code consumes the env. The Azure client constructor reads `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY` and throws an explicit named exception on any missing value.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/env.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/azure-client.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/env.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/azure-client.test.ts`

**Dependencies:** Step 1.

**Verification:**
- `tests/azure-client.test.ts` contains four tests, one per env var: `throws when AZURE_OPENAI_ENDPOINT missing`, `throws when AZURE_OPENAI_DEPLOYMENT missing`, `throws when AZURE_OPENAI_API_VERSION missing`, `throws when AZURE_OPENAI_API_KEY missing` (AC10). Each thrown error message names the missing variable.
- Tests use `vi.stubEnv` / `vi.unstubAllEnvs` (per Investigation §4) — never mutate `process.env` directly.
- A positive test confirms successful construction when all four vars are present (no fallback short-circuits a missing var).

**Effort:** M

---

### Step 5 — Config loader (`config.ts`)

**Goal:** Read and validate `config/rss-sources.json` at runtime; expose the enabled subset (F2, AC4).

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/config.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/config.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/fixtures/rss-sources.valid.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/fixtures/rss-sources.invalid.json`

**Dependencies:** Step 1. **Parallel-safe with Step 2** — the test uses a fixture, not the real config file; but real-file presence is also asserted.

**Verification:**
- `tests/config.test.ts` has a test `loads sources from config/rss-sources.json` (AC4) that loads the real seed file and asserts `length === 5`.
- A separate test loads `rss-sources.invalid.json` and asserts the loader throws on schema violation.
- A test asserts that adding a sixth fixture entry surfaces six items from the loader — proving the "edit only the JSON file" property required by AC4.

**Effort:** S

---

### Step 6 — Parser (`parse.ts`) on `@rowanmanning/feed-parser`

**Goal:** XML → normalized `{ feedName, guid, link, title, publishedAt, rawContent }` items (F3, AC5). No HTTP — input is an XML string.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/parse.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/parse.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/fixtures/rss-2.0.xml` (real Anthropic-ish RSS 2.0 sample)
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/fixtures/atom.xml` (real GitHub releases Atom sample)
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/fixtures/malformed.xml`

**Dependencies:** Step 1. Parallel-safe with Steps 3, 4, 5.

**Verification:**
- `tests/parse.test.ts` includes `parses RSS 2.0 fixture` and `parses Atom fixture` (AC5).
- A test on `malformed.xml` asserts the parser throws (typed `INVALID_FEED` from the library) — this is the input shape for Step 7's failure handler.

**Effort:** M

---

### Step 7 — Fetcher (`fetch.ts`) with injectable HTTP

**Goal:** Fetch a single feed URL → raw XML string. Wrap native `fetch` behind a DI seam so tests can inject `vi.fn()`. Per-feed network failure is the caller's responsibility to handle (Step 11), but `fetch.ts` itself surfaces clean errors for non-2xx and timeouts.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/fetch.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/fetch.test.ts`

**Dependencies:** Step 1.

**Verification:**
- `tests/fetch.test.ts` test `fetches feed and returns XML` (200 OK path).
- Test `throws on HTTP 500` and `throws on network error` (the shape Step 11 catches).
- Note: AC5 and AC6 are split across `parse.test.ts` (Step 6) and the orchestrator-level test in Step 11. This step covers the HTTP half.

**Effort:** S–M

---

### Step 8 — Dedup (`dedup.ts`) over `/news/incoming/` + `/news/published/`

**Goal:** Walk both folders, parse frontmatter of every `*.md`, return the set of seen fingerprints (F4, AC7). Uses A3 option (ii): markdown files are the source of truth, no separate state file.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/dedup.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/dedup.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/news/incoming/.gitkeep` (so folder exists in repo)
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/news/published/.gitkeep`

**Dependencies:** Step 3 (fingerprint module for typing only — pure module reuse).

**Verification:**
- `tests/dedup.test.ts` uses **memfs** (per Investigation §4) to build an in-memory tree with two pre-existing `.md` files (one in `incoming/`, one in `published/`) and asserts the loader returns both fingerprints.
- Test `skips items whose fingerprint exists in incoming or published` (AC7) — asserts a candidate item whose fingerprint is in the seen set is filtered out without an Azure call.
- Test `handles empty incoming and published folders` returns an empty set, no errors.

**Effort:** M

---

### Step 9 — Triage (`triage.ts`) — Azure OpenAI call + response validation

**Goal:** Single chat completion per item, JSON-mode response, strict shape validation, drop irrelevant items (F5, AC8, AC9).

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/triage.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/triage.test.ts`

**Dependencies:** Step 4 (azure-client) — but `triage.ts` takes a client *as a parameter*, so the dependency is via the type only. Tests mock the client end-to-end using the `vi.hoisted` pattern from Investigation §4.

**Verification:**
- `tests/triage.test.ts` tests: `parses well-formed triage response`, `rejects malformed triage response` (AC8 — both shapes from F5), `drops items marked irrelevant` (AC9), `forwards correct model parameter` (R-6 — confirms deployment name is passed as `model`).
- `temperature: 0` and `response_format: { type: "json_object" }` are asserted on the mocked call args.
- System prompt assertion: the literal word "JSON" appears in the system prompt (Investigation §1, gotcha 2).

**Effort:** M

---

### Step 10 — Write (`write.ts`) — Markdown emission to `/news/incoming/`

**Goal:** Given a triaged item + metadata, write the `.md` file at `/news/incoming/<YYYY-MM-DD>-<slug>.md` with the F8 frontmatter (F7, AC11, AC12).

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/write.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/write.test.ts`

**Dependencies:** Steps 3 (slug, frontmatter), 8 (folder layout convention from dedup). Tests use memfs.

**Verification:**
- `tests/write.test.ts` test `emits files with date-slug.md name` (AC12) — asserts pattern `^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$`.
- Test `emits frontmatter matching shared content shape` (AC11) — parses with a YAML parser and asserts the exact 12-key set with the F8 values.
- Test `appends -2 on same-day slug collision` — covers A4 collision rule on actual file emission.
- Test `body contains two-sentence summary and source line` — asserts `> Source: [<feed name>](<link>)` line exists.

**Effort:** M

---

### Step 11 — Logger (`logger.ts`) + Orchestrator (`index.ts`)

**Goal:** Wire everything together (F1–F9). `index.ts` is the only non-pure file in `src/` — it composes config → fetch (per feed, `Promise.allSettled`) → parse → dedup → triage → write, then sets a `new_items` step output for the workflow YAML to read. Logger handles NF6 — structured stdout lines per Investigation §6.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/logger.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/index.ts` (replace the Step 1 stub)
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/orchestrator.test.ts`

**Dependencies:** Steps 3, 4, 5, 6, 7, 8, 9, 10. **All prior `src/` modules must be green.**

**Verification:**
- `tests/orchestrator.test.ts` end-to-end test using injected fakes for fetch + Azure client + fs (memfs):
  - **`continues after individual feed failure`** (AC6) — one good feed, one HTTP-500 feed; pipeline emits items from the good feed, logs a `::warning::` for the bad feed, exits 0.
  - **`exits non-zero when all feeds fail`** (Investigation §6, A14 strict reading).
  - **`exits non-zero with empty config`** (Investigation §6 point 2).
  - **`empty-run produces no commits and no PR signal`** — sets `new_items === 'false'` and step output reflects this; orchestrator returns 0 (AC14 — PR side is asserted in Step 13).
  - Asserts NF6 log lines: feeds attempted, feeds failed (with reason), items fetched per feed, items deduped, items judged irrelevant, items written.

**Effort:** L

---

### Step 12 — PR creation (`pr.ts`) — `gh` CLI shell-out + body file

**Goal:** Create branch, commit, push, run `gh pr create` (F9, AC13, AC14). Body is built from the new items and written to a file passed via `--body-file`. Idempotent no-op when no new items.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/pr.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/pr.test.ts`

**Dependencies:** Step 11 (index.ts emits the data `pr.ts` consumes). `pr.ts` is exercised only by the workflow YAML step that runs after the Node entry point — see Step 13 for how the wiring goes.

**Note on division of labor with Step 13:** The actual `git checkout/commit/push/gh pr create` shell commands live inline in the workflow YAML (matches Investigation §3 minimum-viable shape). `pr.ts` is the Node-side helper that **builds the PR body file** (`pr-body.md`) and **signals the workflow** (via `new_items` step output). Tests in `pr.test.ts` cover the body builder. The shell side is exercised by Step 14's smoke test.

**Verification:**
- `tests/pr.test.ts` test `creates triage PR with correct title and branch` (AC13) — asserts the `gh pr create` invocation (mocked `execFile`) is called with `--title "News triage YYYY-MM-DD"` and the expected `--head` branch matching A11's pattern. **(See Step 14 for the shell-level smoke.)**
- Test `does not open PR when no new items` (AC14) — asserts `new_items === 'false'` step output and no `gh pr create` mock call.
- Test `PR body file contains title, source, link, ai_summary per item` — R-5 enforcement.
- Test `cwd passed to execFile is GITHUB_WORKSPACE when set` — R-7 enforcement.

**Effort:** M

---

### Step 13 — Workflow YAML (`.github/workflows/rss-triage.yml`)

**Goal:** The GitHub Action wiring (F1, AC1, AC18). Schedule + `workflow_dispatch`, explicit permissions, concurrency block, four `AZURE_OPENAI_*` secrets, branch+commit+push+`gh pr create` step.

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/.github/workflows/rss-triage.yml`

**Dependencies:** Steps 11, 12 (the workflow invokes the orchestrator and the PR step's inline shell consumes the `new_items` output from index.ts).

**Verification:**
- File exists at the path above.
- `actionlint` (or `npx -y @action-validator/cli`) reports zero syntax errors.
- `grep` confirms:
  - `schedule:` with cron `0 6 * * *` (A2 placeholder).
  - `workflow_dispatch:` trigger present.
  - `permissions:` block at workflow level with exactly `contents: write` and `pull-requests: write` (AC18 — "and nothing else").
  - `concurrency: { group: rss-triage, cancel-in-progress: false }` present (R-2).
  - `timeout-minutes: 10`.
  - All four `AZURE_OPENAI_*` secrets referenced by name in `env:` of the run step (AC1).
  - `gh pr create` step gated on `steps.pipeline.outputs.new_items == 'true'`.
  - `--body-file pr-body.md` used (Investigation §3 pitfall).
  - `actions/setup-node@v4` with `node-version-file: pipeline/.nvmrc`.
  - `working-directory: pipeline` on Node steps.

**Effort:** M

---

### Step 14 — `SECRETS.md` + `pipeline/README.md` documentation

**Goal:** Document the four secrets, the repo-level "Allow GitHub Actions to create and approve pull requests" toggle (A15), the known Reddit 429 weak-spot (R-3), the deployment-vs-model naming gotcha (Investigation §1 gotcha 4), and the per-month free-tier cost estimate (Investigation §practical notes) (AC15, F10 documentation).

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/SECRETS.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/README.md`

**Dependencies:** Step 13 (workflow file's exact references need to be reflected).

**Verification:**
- `grep AZURE_OPENAI_ENDPOINT SECRETS.md` matches.
- `grep AZURE_OPENAI_DEPLOYMENT SECRETS.md` matches.
- `grep AZURE_OPENAI_API_VERSION SECRETS.md` matches.
- `grep AZURE_OPENAI_API_KEY SECRETS.md` matches (AC15 — all four documented).
- `grep -i "allow github actions to create" SECRETS.md` matches (A15 repo-setting documented).
- `grep -i "reddit" SECRETS.md` matches (R-3 documented).
- `grep -i "editorial workflow" pipeline/README.md` matches (F10 documented — editors review the PR, optionally edit/delete files, move approved to `/news/published/`, merge).

**Effort:** S

---

### Step 15 — `docs/design/project-design.md` + functions doc

**Goal:** Stand up the project-level design doc and ensure the functional contract doc exists (AC16).

**Files created:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/design/project-design.md` — owned by Phase 5 (Designer). Step 15 only adds the **RSS pipeline section** to it after Designer authors the file.
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/design/project-functions.md` — F1–F10 functional contract (created out-of-band by this planner; see end of this document).

**Dependencies:** Steps 11–14 (the design doc needs to describe what was actually built, not what was sketched).

**Verification:**
- Both files exist.
- `grep -i RSS docs/design/project-design.md` matches (AC16).
- `grep -i RSS docs/design/project-functions.md` matches.
- `docs/design/project-design.md` documents the `last_reviewed` semantics noted in Investigation §8 (e): freshly-emitted news items get `last_reviewed = authored = run date`; a human editor moving the file from `/incoming/` to `/published/` should bump `last_reviewed` to their date.

**Effort:** S

---

### Step 16 — End-to-end demo run (Definition of Done #12)

**Goal:** A real, demonstrated workflow run on a non-`main` branch. Workflow triggers, pipeline runs against live Azure OpenAI + live feeds, PR appears titled `News triage YYYY-MM-DD`, files in `/news/incoming/` conform to schema.

**Files created/modified:** none in source. Produces a PR + Action run log as evidence.

**Dependencies:** All prior steps green; the four `AZURE_OPENAI_*` secrets configured in the repo; the repo-level "Allow GitHub Actions to create and approve pull requests" toggle enabled.

**Verification:**
- Action run log link captured.
- PR URL captured; PR title equals `News triage YYYY-MM-DD` (literal, today's UTC date).
- At least one file under `/news/incoming/` parses with `gray-matter` and exposes the 12-key frontmatter from F8.
- NF6 log lines visible in the Action run summary.
- `Issues - Pending Items.md` has no new unresolved entries from this run (Definition of Done #10).

**Effort:** M (mostly waiting + verifying).

---

## 3. Parallelization map

For Phase 6, work units that can be assigned to separate Coders without merge conflict:

```
Step 1 (scaffold) ──┬─> Step 3a (fingerprint.ts + test)         [PURE]
                    ├─> Step 3b (slug.ts + test)                [PURE]
                    ├─> Step 3c (frontmatter.ts + test)         [PURE]
                    ├─> Step 4  (env.ts + azure-client.ts)
                    ├─> Step 5  (config.ts + test)              [needs Step 2]
                    ├─> Step 6  (parse.ts + test)
                    └─> Step 7  (fetch.ts + test)

Step 2 (seed config) — independent, can ship with Step 1.

──── synchronization barrier ────

Step 8  (dedup.ts)        ← needs Step 3 (fingerprint)
Step 9  (triage.ts)       ← needs Step 4 (azure-client)
Step 10 (write.ts)        ← needs Step 3 (slug, frontmatter)
                          (Steps 8, 9, 10 are parallel to each other)

──── synchronization barrier ────

Step 11 (logger.ts + index.ts) — single Coder; integrates everything.
Step 12 (pr.ts)                — can run in parallel with Step 11 (separate file, no overlap).

──── synchronization barrier ────

Step 13 (workflow YAML)         — needs Step 11 + Step 12.
Step 14 (SECRETS.md + README)   — can parallel-run with Step 13.

──── synchronization barrier ────

Step 15 (design docs)           — after Designer finishes project-design.md.
Step 16 (live demo run)         — last.
```

**Independent parallel work units (assignable to separate Coders):**
- **Unit A** — pure modules: Steps 3a, 3b, 3c (one Coder for all three; they share a test patterning idiom).
- **Unit B** — env + Azure client: Step 4 (one Coder).
- **Unit C** — config loader + parser + fetcher: Steps 5, 6, 7 (one Coder; all are leaf modules with small file fixtures).
- **Unit D** — after barrier 1: dedup (Step 8), triage (Step 9), write (Step 10) — three parallel Coders.
- **Unit E** — after barrier 2: orchestrator (Step 11) + PR helper (Step 12) — two parallel Coders.
- **Unit F** — after barrier 3: workflow YAML (Step 13) + docs (Step 14) — two parallel Coders.

Critical path: Step 1 → Step 4 → Step 9 → Step 11 → Step 13 → Step 16 (six serial gates).

---

## 4. AC coverage table

Every AC from the refined request is mapped below. If any row is missing or has no step, the plan is incomplete.

| AC | Covered by step(s) | Evidence at verification time |
|----|--------------------|-------------------------------|
| AC1 — Workflow file exists and is valid (schedule + dispatch + permissions + four secrets named) | Step 13 | `.github/workflows/rss-triage.yml` exists; `actionlint` reports zero errors; `grep` finds `schedule:`, `workflow_dispatch:`, `permissions:`, and each of `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY`. |
| AC2 — `npx tsc --noEmit` exits 0 | Step 1 (scaffold), maintained by every subsequent step | Terminal output: `cd pipeline && npx tsc --noEmit` exit code `0`. Workflow CI step `npm run build` is green. |
| AC3 — Lint clean | Step 1, maintained throughout | `cd pipeline && npm run lint` exit code `0`. |
| AC4 — RSS sources externalized in `config/rss-sources.json`; five seed feeds present | Steps 2, 5 | File exists; `jq length` returns 5; `tests/config.test.ts` test `loads sources from config/rss-sources.json` passes; adding a sixth fixture entry yields six items (the "edit-only-the-JSON" property). |
| AC5 — Fetch stage parses RSS and Atom | Step 6 (parser; fixture-driven) | `tests/parse.test.ts` tests `parses RSS 2.0 fixture` and `parses Atom fixture` pass; emitted items have `guid`, `link`, `title`, `publishedAt`. |
| AC6 — Per-feed failure is non-fatal; pipeline continues | Step 11 (orchestrator) | `tests/orchestrator.test.ts` test `continues after individual feed failure`: one good feed + one HTTP-500 feed → good-feed items emitted, `::warning::` log line for the bad feed, exit 0. |
| AC7 — Dedup blocks already-seen items in `/news/incoming/` + `/news/published/` | Step 8 | `tests/dedup.test.ts` test `skips items whose fingerprint exists in incoming or published` passes; no Azure call made for skipped items (mocked client recorded zero invocations). |
| AC8 — Triage parses well-formed response; rejects malformed | Step 9 | `tests/triage.test.ts` tests `parses well-formed triage response` and `rejects malformed triage response` pass. |
| AC9 — Irrelevant items dropped | Step 9 | `tests/triage.test.ts` test `drops items marked irrelevant` — no markdown file emission for `relevant: false`. |
| AC10 — Missing env var throws explicit named exception (×4) | Step 4 | `tests/azure-client.test.ts` four tests, one per env var; each error message names the missing variable. |
| AC11 — Frontmatter conforms to shared content shape (12 keys, `type === 'news'`, `internal === false`) | Steps 3 (frontmatter), 10 (write) | `tests/frontmatter.test.ts` AND `tests/write.test.ts` test `emits frontmatter matching shared content shape` — parsed YAML asserts exactly the 12 keys with prescribed values. |
| AC12 — Filename format `^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$` under `/news/incoming/` | Step 10 | `tests/write.test.ts` test `emits files with date-slug.md name`. |
| AC13 — PR creation end-to-end smoke: branch + commit + PR title equals `News triage YYYY-MM-DD` | Step 12 (mocked); Step 16 (real) | `tests/pr.test.ts` test `creates triage PR with correct title and branch` (mocked `execFile`); Step 16 demonstrates the real PR with that title on the live repo. |
| AC14 — Empty-run no-op (no commit, no PR; exit 0; log line) | Steps 11, 12 | `tests/orchestrator.test.ts` `empty-run produces no commits and no PR signal`; `tests/pr.test.ts` `does not open PR when no new items`; orchestrator emits log line `no new items, skipping PR`. |
| AC15 — Secrets documented in `SECRETS.md` | Step 14 | `SECRETS.md` exists at repo root; `grep` finds each of the four `AZURE_OPENAI_*` names; A15 repo-setting toggle is documented. |
| AC16 — `docs/design/project-design.md` and `docs/design/project-functions.md` describe the pipeline | Step 15 | Both files exist; `grep -i RSS` matches in each. |
| AC17 — No deprecated dependency warnings | Step 1 | `npm install` log under `pipeline/` contains no `deprecated` lines for direct deps. (Indirect-dep `deprecated` warnings are tolerated; the AC scopes to direct deps.) |
| AC18 — Workflow `permissions:` block contains exactly `contents: write` + `pull-requests: write` | Step 13 | YAML inspection: the block contains exactly those two entries and nothing else. |

**Coverage verified: 18 of 18 ACs mapped.**

Non-functional requirements (not numbered as ACs but part of Definition of Done):
- **NF1 (TypeScript strict)** — Step 1's `tsconfig.json` sets `"strict": true`.
- **NF2 (build green)** — see AC2 row.
- **NF3 (lint clean)** — see AC3 row.
- **NF4 (test coverage)** — Steps 3–12 each ship a test file; aggregated in Step 11 via the orchestrator test.
- **NF5 (free-tier-friendly)** — Step 13's workflow uses `ubuntu-latest`, `timeout-minutes: 10`. Validated by Step 16's real run wall-clock.
- **NF6 (observability)** — Step 11's `logger.ts` emits the seven required log lines; asserted in `tests/orchestrator.test.ts`.
- **NF7 (no VC side effects)** — Step 13's workflow only commits to the new branch and opens a PR; never pushes to `main`, never deletes, never rewrites history.

---

## 5. Risks and mitigations

Plan-level risks (mostly carried from Investigation §risks; concrete actions wired to specific steps).

| # | Risk | Step that mitigates | Mitigation summary |
|---|------|---------------------|--------------------|
| P1 | **Reddit `.rss` 429s** from GH Actions IP ranges; `r/ClaudeAI` may yield zero items most runs. | Step 11 (orchestrator) + Step 14 (docs) | A14 / Step 11's `Promise.allSettled` treats the 429 as a per-feed failure; Step 14 documents this as a known weak-spot. No code change; OQ1 owns the keep/drop/OAuth decision. |
| P2 | **Azure OpenAI returns valid JSON but with wrong field types** (e.g., `topics` as string, `relevant` as `"yes"`). | Step 9 (triage validation) | Strict shape validation in `triage.ts`; malformed responses are rejected and logged with the raw payload for diagnosis. AC8's malformed test exercises this. |
| P3 | **Repo-level "Allow GitHub Actions to create and approve pull requests" toggle was forgotten.** | Steps 14, 16 | Step 14 documents the toggle in `SECRETS.md`'s pre-first-run checklist. Step 16 catches it during the live demo run if missed. |
| P4 | **Slug collisions within a day** (two items, same title) overwrite each other. | Steps 3 (slug), 10 (write) | A4 collision suffix `-2`/`-3`; tested at the unit level in `tests/slug.test.ts` and the file-emission level in `tests/write.test.ts`. |
| P5 | **`hnrss.org` outage.** | Step 11 | Per-feed-failure-non-fatal absorbs it. No mitigation beyond logging. |
| P6 | **Azure OpenAI quota exhaustion mid-run** — partial output, PR opens with subset. | Step 9 (triage) + Step 11 (orchestrator) | Per-item Azure failure logged + skipped, same code path as parse failure. Documented as known behavior in Step 14. |
| P7 | **Branch-name collision** across two manual runs on the same day. | Step 12 | A11's 7-char `GITHUB_RUN_ID` suffix gives ~10⁸ branch-name distinct values per day; orchestrator surfaces "branch already exists" cleanly if it ever happens. |
| P8 | **`rss-parser` drift** (if R-1 swap is rejected during plan review). | Step 6 | The swap to `@rowanmanning/feed-parser` is the mitigation. If reversed, log a known-issue entry in `Issues - Pending Items.md` accepting the staleness. |
| P9 | **Editorial-workflow drift**: editor deletes a rejected item from `/incoming/`, item reappears next run. | Step 8 + Step 14 | Documented as the A3 known trade-off. OQ3 owns the rejected-fingerprints overlay if it becomes painful. |
| P10 | **Azure deployment SKU drift** — tests pinned against `gpt-4o-mini`, prod deployment is something else (OQ5). | Step 9 + Step 14 | Step 9 tests use mocked client (deployment-agnostic). Step 14's `SECRETS.md` documents the deployment-name-vs-model-name foot-gun. |
| P11 | **`actions/checkout@v4` defaults change** — if a future config sets `persist-credentials: false`, `git push` fails silently. | Step 13 | Inline comment in `rss-triage.yml` calls out that the default behavior (credential persistence) is load-bearing. |
| P12 | **cwd drift for shelled-out `git`/`gh`** in `pr.ts`. | Step 12 | R-7 — `pr.ts` explicitly passes `cwd: process.env.GITHUB_WORKSPACE ?? process.cwd()` to `execFile`. Asserted in `tests/pr.test.ts`. |

---

## 6. Ambiguities for user input

**None — proceed.**

All open questions from the refined request (OQ1–OQ5) are non-blocking for implementation:
- **OQ1** (final RSS source sign-off) — pipeline is data-driven; resolved by editing `config/rss-sources.json`, not code.
- **OQ2** (cron cadence) — placeholder `0 6 * * *` is sufficient; one-line YAML change to flip.
- **OQ3** (rejected-fingerprints overlay) — documented as a known trade-off; future enhancement.
- **OQ4** (cross-day slug collisions with same fingerprint) — A3 + A5 logic already handles correctly (second occurrence is dedup-skipped); confirmed in Step 8's tests.
- **OQ5** (Azure deployment SKU) — runtime-only concern; tests use mocked client, so test suite is deployment-independent.

The Phase 5 Designer should treat all of R-1 through R-7 in §1 above as locked-in and not relitigate them.

---

## Companion deliverable

A companion file at `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/design/project-functions.md` records the F1–F10 functional contract for this pipeline as the initial entry in the project's functional requirements doc. That file is the single source of truth for what the pipeline **does**; this plan is the source of truth for **how the work is sequenced**.
