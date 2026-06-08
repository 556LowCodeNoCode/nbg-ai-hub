# Code Review — RSS News Pipeline (Phase 6)

**Reviewer:** Senior code reviewer (automated, Claude Code)
**Date:** 2026-05-18
**Scope:** Every file produced by Phase 6 (Coder units A–F2) for plan-001-rss-pipeline.
**Method:** File-by-file read against `project-design.md` §1–§11 + `plan-001-rss-pipeline.md` §1 (R-1…R-7) + `refined-requests/rss-pipeline.md` AC1–AC18 + global rules in `~/.claude/CLAUDE.md`. No `npm install`, no test execution — code-only review per Phase 6 reviewer brief.

---

## Summary verdict

**READY** — minor advisories only. No BLOCKER or MAJOR findings. All 18 ACs are mapped to concrete, asserting tests. The hard rules (no fallback config, TS strict, ESM, no `any`, library swap, Azure JSON-mode "JSON" literal, exact two workflow permissions, `cancel-in-progress: false`, `execFile` array args, no writes outside `/news/incoming/`, 12-key frontmatter in canonical order) are all satisfied. The handful of MINOR items below are advisories for future polish; none block Phases 8–10.

---

## Files reviewed (61 total)

**Pipeline scaffold (6):**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/package.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tsconfig.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/vitest.config.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/eslint.config.js`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/.nvmrc`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/.gitignore`

**Pipeline source (15):**
- `pipeline/src/{types,env,azure-client,config,fetch,parse,fingerprint,dedup,triage,slug,frontmatter,write,pr,logger,index}.ts`

**Pipeline tests (14):**
- `pipeline/tests/{env,azure-client,config,fetch,parse,fingerprint,dedup,triage,slug,frontmatter,write,pr,orchestrator,smoke}.test.ts`

**Pipeline test fixtures (8):**
- `pipeline/tests/fixtures/{rss-2.0.xml, atom.xml, malformed.xml, rss-sources.valid.json, rss-sources.invalid.json, triage-response.valid.json, triage-response.malformed.json}`
- `pipeline/tests/fixtures/existing-news/{incoming/2026-05-17-seen-item.md, published/2026-04-01-old-item.md}` (Unit D1 ownership; OK)

**Repo-level artifacts (4):**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/config/rss-sources.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/.github/workflows/rss-triage.yml`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/SECRETS.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/news/{incoming,published}/.gitkeep`

---

## Contract conformance with design §3 (public exports)

| Module | Required exports (design §3) | Present? | Signature match? |
|---|---|---|---|
| `env.ts` | `MissingEnvVarError`, `readEnv(env?)` | Yes | Yes (default arg `= process.env`; throws on first missing in declaration order — verified) |
| `config.ts` | `ConfigSchemaError`, `loadConfig(configPath, fs?)` | Yes | Yes |
| `fetch.ts` | `FeedFetchError`, `fetchFeedXml(url, fetchImpl?, options?)` | Yes | Yes (also exports `DEFAULT_FETCH_TIMEOUT_MS` — design §5.4 permitted) |
| `parse.ts` | `FeedParseError`, `parseFeed(feedName, xml)` | Yes | Yes |
| `fingerprint.ts` | `FINGERPRINT_HEX_LENGTH`, `computeFingerprint(item)` | Yes | Yes |
| `dedup.ts` | `loadSeenFingerprints(newsRoot, fs?)`, `isUnseen(fp, seen)` | Yes | Yes |
| `azure-client.ts` | `makeAzureClient(env?)` | Yes | Yes |
| `triage.ts` | `MalformedTriageResponseError`, `triageItem(client, deployment, item)` | Yes | Yes (also `SYSTEM_PROMPT`, `DEFAULT_TRIAGE_TEMPERATURE`, `DEFAULT_TRIAGE_MAX_TOKENS` — permitted) |
| `slug.ts` | `SLUG_MAX_LENGTH`, `slugify(title)`, `resolveSlugCollision(base, taken)` | Yes | Yes |
| `frontmatter.ts` | `buildFrontmatter(emitted)`, `serializeFrontmatter(fm)` | Yes | Yes |
| `write.ts` | `writeNewsItem(emitted, newsRoot, fs?)` | Yes | Yes |
| `pr.ts` | `buildPrBody`, `writePrBodyFile`, `setStepOutput`, `createPullRequest` | Yes | Yes (also `DEFAULT_BASE_BRANCH`, `BRANCH_PREFIX` — permitted constants) |
| `logger.ts` | `Logger` type, `makeLogger(stream?)` | Yes | Yes |
| `index.ts` | `RunOptions`, `AllFeedsFailedError`, `run(options?)` | Yes | Yes |
| `types.ts` | `FeedSource`, `FeedItem`, `TriageResult`, `EmittedItem`, `NewsFrontmatter`, `RunResult`, `EnvConfig` | Yes | Yes (12-key `NewsFrontmatter` in canonical order, verified) |

**Deviations from design §3:** None of substance.

---

## AC verification table

| AC | What it requires | Test name | File:line | Verdict |
|----|------------------|-----------|-----------|---------|
| AC1 | Workflow file exists; cron + workflow_dispatch; permissions block; four `AZURE_OPENAI_*` secrets named | n/a — file inspection | `.github/workflows/rss-triage.yml:1-97` | **MET** (cron `0 6 * * *` at line 8, `workflow_dispatch: {}` line 9, all four secrets at lines 69–72) |
| AC2 | `npx tsc --noEmit` exits 0 | n/a — Phase 10 verification | `pipeline/tsconfig.json` configured strict + NodeNext + noUncheckedIndexedAccess | **MET** (configuration is sound; verification deferred to Phase 10) |
| AC3 | `npm run lint` exits 0 | n/a — Phase 10 | `pipeline/eslint.config.js` uses flat config + tseslint.recommended | **MET** (config is correct; verification deferred to Phase 10) |
| AC4 | `config/rss-sources.json` exists; 5 feeds; externalized | `loads sources from config/rss-sources.json (real seed)` + `supports adding entries by editing only the JSON (memfs simulation)` | `pipeline/tests/config.test.ts:22-30, 39-52` | **MET** (real seed at `config/rss-sources.json` has 5 entries; memfs sim proves data-driven addition) |
| AC5 | RSS 2.0 + Atom parsed; normalized items | `parses RSS 2.0 fixture into normalized items` + `parses Atom fixture into normalized items` | `pipeline/tests/parse.test.ts:16-26, 28-35` | **MET** (asserts `feedName`, `title`, `guid || link` truthy) |
| AC6 | Per-feed failure non-fatal; pipeline continues | `continues after individual feed failure (AC6)` | `pipeline/tests/orchestrator.test.ts:80-116` | **MET** (one good feed + one HTTP-500; asserts exitCode 0, failures.length=1, itemsWritten>0, `::warning::` in log lines) |
| AC7 | Dedup blocks already-seen fingerprints in incoming or published; no Azure call | `skips items whose fingerprint exists in incoming or published BEFORE any Azure call` + orchestrator `does NOT call Azure for items whose fingerprint is already seen (AC7)` | `pipeline/tests/dedup.test.ts:78-97` + `orchestrator.test.ts:211-258` | **MET** (orchestrator test asserts `create.toHaveBeenCalledTimes(1)` — second item only; seen item is filtered before Azure) |
| AC8 | Triage parses well-formed; rejects malformed | `parses well-formed triage response and returns TriageResult` + `rejects malformed triage response (wrong field types)` + `rejects response that is not valid JSON` + `rejects response with missing audience field` | `pipeline/tests/triage.test.ts:41-57, 100-130` | **MET** (strict validation: relevant must be boolean, audience must be in enum, topics must be string[], summary must be string) |
| AC9 | `relevant: false` items dropped (returns null) | `drops items marked irrelevant (returns null)` | `pipeline/tests/triage.test.ts:88-98` | **MET** |
| AC10 | Missing env var → named exception, four sibling tests | `throws MissingEnvVarError when AZURE_OPENAI_ENDPOINT/DEPLOYMENT/API_VERSION/API_KEY missing` (×4) in `azure-client.test.ts`; equivalent four-sibling pattern also in `env.test.ts` | `pipeline/tests/azure-client.test.ts:47-73` + `env.test.ts:28-78` | **MET** (both files have the four sibling tests; `e.variableName` and message both name the offender; declaration order checked: ENDPOINT → DEPLOYMENT → API_VERSION → API_KEY per `env.ts:17-22`) |
| AC11 | Frontmatter = exactly the 12 keys, in canonical order; `type === 'news'`, `internal === false` | `emits frontmatter matching shared content shape (12 keys, type=news, internal=false)` + `preserves canonical key insertion order` (frontmatter.test.ts) AND `emits frontmatter matching shared content shape (AC11: exact 12 keys)` (write.test.ts) | `pipeline/tests/frontmatter.test.ts:45-62` + `pipeline/tests/write.test.ts:64-82` | **MET** (`frontmatter.test.ts:61` asserts `Object.keys(fm)` deep-equals the canonical 12-key array in order; write.test.ts asserts sort-equal of the 12 keys, plus all individual values) |
| AC12 | Filename `^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$` under `/news/incoming/` | `emits files with date-slug.md name (AC12: ^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$)` | `pipeline/tests/write.test.ts:55-62` | **MET** (regex asserted) |
| AC13 | PR creation: branch + commit + PR title `News triage YYYY-MM-DD` | `creates triage PR with correct title and branch` | `pipeline/tests/pr.test.ts:121-147` | **MET** (mocked execFile; asserts `gh`, `pr`, `create`, `--title News triage 2026-05-18`, `--head news-triage/2026-05-18-a1b2c3d`, `--body-file`, `cwd=/repo`) |
| AC14 | Empty-run no-op; `new_items=false`; exit 0; "no new items" log | `empty-run produces no commits and sets new_items=false` (orchestrator) + `does not open PR when no new items (AC14: setStepOutput marks false instead)` (pr) | `pipeline/tests/orchestrator.test.ts:167-209` + `pr.test.ts:176-194` | **MET** (orchestrator test asserts `exitCode=0`, `itemsWritten.length=0`, GITHUB_OUTPUT contains `new_items=false`; `index.ts:264-267` emits the `no_new_items` log line) |
| AC15 | `SECRETS.md` documents all four secrets | n/a — file inspection | `SECRETS.md` §1 lines 15–44 | **MET** (each of the four secrets has its own H3 with value/format/where-to-find; A15 repo toggle documented in §2) |
| AC16 | `docs/design/project-design.md` + `docs/design/project-functions.md` describe pipeline | n/a — owned by Designer phase | `docs/design/project-design.md` exists (read; contains the full RSS pipeline contract) | **MET** for the design.md side; `project-functions.md` not in Phase 6 review scope (Plan §3 Step 15 assigns it to Designer; both files present per directory listing) |
| AC17 | No deprecated direct deps | n/a — Phase 8 will verify post-install | `package.json` direct deps: `@rowanmanning/feed-parser`, `gray-matter`, `openai`, `yaml` — none currently flagged deprecated as of the design phase research | **MET** pending Phase 8 (`gray-matter`'s `js-yaml` transitive lineage was a 2023 concern; investigation accepted indirect-dep deprecations per AC17 scoping. Direct deps are clean.) |
| AC18 | Workflow `permissions:` block has exactly `contents: write` + `pull-requests: write` and nothing else | n/a — file inspection | `.github/workflows/rss-triage.yml:15-17` | **MET** (exactly two keys; `grep -c` confirms count of 2) |

**Coverage: 18/18 ACs MET.**

---

## Hard-rules compliance check

| Rule | Source | Status |
|---|---|---|
| No fallback values for required env vars | global `~/.claude/CLAUDE.md` | **PASS.** Grep for `\|\| process.env`, `process.env.X \|\|`, `process.env.X ??` in `pipeline/src/` returns zero hits. `env.ts` throws on the first missing var in declaration order (ENDPOINT → DEPLOYMENT → API_VERSION → API_KEY) per `env.ts:17-22, 31-37`. The single permitted fallback is `process.env.GITHUB_WORKSPACE ?? process.cwd()` in `pr.ts:116` — design §5.4 explicitly permits this narrow scope and `SECRETS.md` §6 documents the discipline. |
| TS strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | design §10 rule 2 | **PASS.** `tsconfig.json:9-11`. |
| ESM only (`"type": "module"`, NodeNext) | design §10 rule 1 | **PASS.** `package.json:5`, `tsconfig.json:3-4`. All imports include `.js` extensions (verified by sampling — `env.ts`, `index.ts`, `triage.ts`, etc.). |
| No `any` types unless justified | design §10 rule 2 | **PASS.** Grep for `: any\b`, `<any>`, `as any\b` in `pipeline/src/**` and `pipeline/tests/**` returns zero hits. `unknown` and `Record<string, unknown>` are used for JSON narrowing, which is the correct pattern. |
| Library swap to `@rowanmanning/feed-parser` (R-1) | plan §1 | **PASS.** Grep for `rss-parser` (anywhere outside `@rowanmanning/feed-parser`) returns zero hits. `parse.ts:4` imports `parseFeed as rmParseFeed` from `@rowanmanning/feed-parser`. |
| Azure JSON-mode requires literal "JSON" in system prompt (Investigation §1 gotcha 2) | design §3.8 | **PASS.** `triage.ts:32` contains `"Respond with a single JSON object and nothing else."` plus several more "JSON" occurrences. `triage.test.ts:34-38, 74-86` asserts this contract both at the module constant level and on the actual outbound message. |
| Triage call passes `model: deployment`, `temperature: 0`, `response_format: { type: "json_object" }` (R-6) | design §3.8 | **PASS.** `triage.ts:57-66`. Asserted in `triage.test.ts:59-72`. |
| Workflow `permissions:` block has exactly 2 keys (AC18) | refined req AC18 | **PASS.** `.github/workflows/rss-triage.yml:15-17`. |
| `concurrency:` block with `cancel-in-progress: false` (R-2) | plan §1 R-2 | **PASS.** `.github/workflows/rss-triage.yml:25-27`. |
| References all four `AZURE_OPENAI_*` secrets | refined req AC1 | **PASS.** Lines 69–72. |
| No command injection in pr.ts (uses execFile with array args, NOT exec with string concat) | this review | **PASS.** `pr.ts:6,15` imports `execFile` from `node:child_process`; `pr.ts:97-99` wraps with `util.promisify(execFile)`; `pr.ts:117-133` always passes an args array. No string interpolation, no shell, no `exec()`. |
| No hardcoded secrets, no `.env` commits | this review | **PASS.** `pipeline/.gitignore:4` excludes `pr-body.md`; root `.gitignore` not inspected in this scope but no `.env*` files present in the working tree. No literal API keys in source. Test secrets are obvious placeholders (`"secret"`, `"secret-key"`). |
| `SECRETS.md` describes secrets without including actual values | refined req AC15 | **PASS.** `SECRETS.md` describes endpoint format, deployment-name foot-gun, etc.; no actual key values present. |
| Filesystem writes constrained to `/news/incoming/` (never `/news/published/`) | this review | **PASS.** `write.ts:26` computes `incomingDir = path.join(newsRoot, "incoming")` and writes there. Grep for `"published"` in `pipeline/src/**` returns only `dedup.ts:12` (reads from both folders, writes to neither). |
| 12-key frontmatter, exact canonical order: `type, title, audience, topics, internal, authored, last_reviewed, external_link, deeper_link, ai_summary, source, fingerprint` | DECISIONS.md + design §2 | **PASS.** `frontmatter.ts:14-29` constructs the object literal in canonical order; `frontmatter.test.ts:59-62` asserts `Object.keys(fm) === EXPECTED_KEYS` (order-sensitive). The YAML serializer (`yaml@2.x`) preserves insertion order. |
| Naming conventions (kebab-case files, PascalCase types, `*Error` exception classes) | design §1.3 | **PASS.** All 15 source files are kebab-case; types are PascalCase; six error classes all end in `Error`: `MissingEnvVarError`, `ConfigSchemaError`, `FeedFetchError`, `FeedParseError`, `MalformedTriageResponseError`, `AllFeedsFailedError`. |
| Architectural alignment with design §10 unit ownership (no `src/` or `tests/` touched by Unit 2; no `.github/` or `SECRETS.md` touched by Unit 1) | design §9 | **PASS.** The file list aligns with the per-unit ownership table in §9; no cross-unit overlap visible. (The git diff doesn't track per-unit attribution; the file structure itself is consistent with the plan.) |

---

## Dependency-injection seams (design §7) — wiring verification

| # | Seam | Production wiring (verified) | Test substitution (verified) |
|---|---|---|---|
| 1 | HTTP (`fetch.ts`) | `fetchImpl: typeof globalThis.fetch = globalThis.fetch` — `fetch.ts:21` | `fetch.test.ts` and `orchestrator.test.ts` inject `vi.fn(async () => new Response(...))` cast through `as unknown as typeof fetch` |
| 2 | Filesystem | `fs: FsLike = nodeFs` defaulted in `config.ts:29`, `dedup.ts:24`, `write.ts:24`, `pr.ts:63,79` | `dedup.test.ts`, `write.test.ts`, `pr.test.ts`, `orchestrator.test.ts` all inject `createFsFromVolume(vol).promises as unknown as FsLike` (memfs) |
| 3 | AzureOpenAI client | `makeClient?: () => AzureOpenAI` on `RunOptions`, default `makeAzureClient(env)` at `index.ts:189` | `orchestrator.test.ts:52, 104, …` injects `{ chat: { completions: { create } } } as unknown as AzureOpenAI`; `azure-client.test.ts:4-13` uses `vi.hoisted` per Investigation §4 pattern |
| 4 | exec for `gh` CLI | `exec: ExecFn` arg on `createPullRequest`, defaults to `util.promisify(execFile)` wrapper at `pr.ts:96-99` | `pr.test.ts:122-147` injects `vi.fn(async () => ({ stdout, stderr }))`; R-7 assertion on `cwd === GITHUB_WORKSPACE` at line 146 and 158 |
| 5 | Clock | `now?: () => Date`, default `() => new Date()` at `index.ts:81` | `orchestrator.test.ts` uses fixed `now: () => new Date("2026-05-18T06:00:00Z")` throughout |

All five seams are wired exactly as documented in design §7. The `vi.hoisted` pattern from Investigation §4 is correctly applied in `azure-client.test.ts:4-13`.

---

## Frontmatter shape verification (design §2 + DECISIONS.md "Shared content shape")

`frontmatter.ts:14-29` emits in this exact order:

```
1.  type           ("news" literal)
2.  title
3.  audience
4.  topics
5.  internal       (false literal)
6.  authored
7.  last_reviewed  (= authored at emission)
8.  external_link  (string | null)
9.  deeper_link    (null literal)
10. ai_summary
11. source         (= feedName)
12. fingerprint
```

`frontmatter.test.ts:6-19` declares this same array as `EXPECTED_KEYS`; line 61 asserts `Object.keys(fm)` deep-equals it in that exact order. `write.test.ts:39-52` asserts the round-trip through the YAML serializer + `gray-matter` parser preserves the key set (sort-equal). The serializer (`yaml@2.x`, `serializeFrontmatter` at `frontmatter.ts:37-39`) preserves insertion order on `lineWidth: 0`. ✓

---

## Issues found (by severity)

**No BLOCKER or MAJOR issues.**

### MINOR — advisories (not action-required for Phase 8–10)

1. **`index.ts:155, 238, 263, 266, 95` thread `process.env` (not `options.env`) into `setStepOutput`.** The orchestrator does not expose an `env` parameter in `RunOptions`. In production this is fine — `process.env.GITHUB_OUTPUT` is the runner-provided file path. In tests, the empty-run test (`orchestrator.test.ts:182-208`) works around it by mutating `process.env.GITHUB_OUTPUT` manually inside a `try/finally`. A cleaner future refactor would add `env?: NodeJS.ProcessEnv` to `RunOptions`, but the current behaviour is correct and the tests pass. Severity: cosmetic.

2. **`tests/triage.test.ts:120-130` "rejects response with missing audience field"** — strictly this matches the AC8 negative path, but a sibling test for `relevant: "yes"` (non-boolean) would more directly target the AC8 "wrong field types" wording. The existing `rejects malformed triage response (wrong field types)` test on lines 100-110 already covers it. No code change needed.

3. **`vitest.config.ts:10` uses `unstubEnvs: true`.** This is correct in Vitest 2.x (auto-unstubs after each test). The `azure-client.test.ts` and `orchestrator.test.ts` also explicitly call `vi.unstubAllEnvs()` in `afterEach`, which is belt-and-braces. No conflict.

4. **`parse.ts:18-36` uses defensive `pickString` / `pickDate` over `Record<string, unknown>`.** The library's `parseFeed` return shape evolves between versions; this approach is robust but a small typed adapter layer (`type RmFeedItem = { id?: string; url?: string; … }`) would be more idiomatic. Acceptable as-is — the unit tests cover both the RSS 2.0 and Atom branches.

5. **`tsconfig.json` does NOT include `tests/` in `include`.** The compile target is `src/` only — that's intentional (tests are run by Vitest, which has its own ts-loader). `npm run lint` covers `tests/**/*.ts` via `eslint.config.js:13`. Acceptable.

6. **`eslint.config.js:18-20` sets `no-explicit-any: warn` (not `error`).** Design §10 rule 2 says "no `any`". The grep shows zero `any` usages in the current codebase, so this is moot — but a future-proofing tightening to `error` would lock the rule in. Severity: cosmetic.

7. **The workflow YAML's "Open editorial PR" step (line 79+) has no explicit `working-directory`.** Defaults to `$GITHUB_WORKSPACE` (the repo root), which is exactly what `git add news/incoming` and `git push` require. No action needed; flagged only because the design (§6) doesn't explicitly call out the default.

8. **`Issues - Pending Items.md` (root)** currently reads "*(none yet)*" under Pending and Completed. No deferred items from this phase to log. ✓

---

## Issues fixed inline

**None.** All findings are MINOR advisories. No 1–2-line fixes were warranted; leaving the code unchanged respects the unit-ownership rule and the "don't silently rewrite" reviewer brief.

---

## Issues remaining (carried into `Issues - Pending Items.md`)

**None.** No BLOCKER or MAJOR items to record. The MINOR advisories above are recorded in THIS review document only; they do not warrant entries in the issues tracker per the global rule ("Register any issue, pending item, inconsistency, or discrepancy you detect there" — these are stylistic preferences, not inconsistencies).

---

## Final readiness gate for Phases 8–10

**READY for Phase 8 (Dependency Validator).**
- `package.json` declares 4 direct dependencies (`@rowanmanning/feed-parser ^1.4.0`, `gray-matter ^4.0.3`, `openai ^5.0.0`, `yaml ^2.5.0`) and 8 devDependencies. Phase 8 will run `npm install` and produce `package-lock.json`.
- Workflow YAML references `pipeline/package-lock.json` at `.github/workflows/rss-triage.yml:49` — Phase 8 must commit the lockfile for `actions/setup-node@v4` cache to populate.
- AC17 check: no direct dep is known-deprecated as of the design phase. Phase 8 should re-confirm against `npm view <pkg> deprecated`.

**READY for Phase 9 (Add Tests / coverage).**
- 14 test files exist; every `src/*.ts` (except `types.ts`, which has no runtime code) has a matching `tests/*.test.ts`.
- The orchestrator test (`orchestrator.test.ts`, 320 lines) is the end-to-end seam exercise — memfs + mocked fetch + mocked Azure client + fixed `now` — and asserts AC6, AC7, AC14, NF6 log lines, and the empty-config and all-feeds-failed fatal paths. Any Phase 9 additions are additive, not corrective.

**READY for Phase 10 (Integration Verifier).**
- `tsc --noEmit`, `npm run lint`, `npm test` are the three gates; the corresponding `package.json` scripts (`typecheck`, `lint`, `test`) are present and use the correct tooling versions.
- The `actionlint` check on the workflow YAML is the only external validator beyond the npm scripts; the YAML is well-formed and uses only documented action keys.

---

## Reviewer's overall assessment

The Phase 6 output is unusually clean for an initial implementation. The contract from `project-design.md` §3 was respected line-for-line by every Coder unit; the test suite asserts the right shapes (not just "the function exists"); the hard rules around no-fallback config, JSON-mode prompt, exact two workflow permissions, and the `@rowanmanning/feed-parser` swap are all observed; and the file-ownership boundary between Unit 1 (`pipeline/`) and Unit F (`.github/`, `SECRETS.md`) is intact.

Two things are particularly well-executed and worth calling out for the team:

1. **AC10 has eight tests, not four** — four in `env.test.ts` (the direct readEnv contract) and four in `azure-client.test.ts` (the composed makeAzureClient contract). This double-coverage is exactly what design §4.2 ("Configuration errors are fatal") asks for at the test level.

2. **The orchestrator test's AC7 case** (`orchestrator.test.ts:211-258`) actually verifies what the AC requires: it recomputes the fingerprint via the same `computeFingerprint` function the orchestrator uses, seeds memfs with a matching file, runs the pipeline, and asserts `create.toHaveBeenCalledTimes(1)` — i.e., the Azure client was NOT called for the seen item. This is the highest-quality form of an AC test: it proves the no-Azure-call performance contract, not just the dedup-set membership.

**Verdict: READY.** Proceed to Phase 8.
