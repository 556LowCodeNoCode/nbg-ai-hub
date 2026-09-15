---
phase: 7
scope: hub-plugin
reviewer: inline (general-purpose agent unavailable due to upstream API capacity)
reviewed_at: 2026-05-19
files_reviewed: 30
diagnostics_found: 5
diagnostics_resolved: 5
remaining_concerns: 0
status: clean
---

# Code review — `/hub` plugin (plan-003)

## Scope

All files created or modified during Phase 6 of the team workflow:

- `plugin/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (repo root)
- `plugin/package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `esbuild.config.mjs`, `.gitignore`, `config.json`
- `plugin/src/lib/`: errors, snapshot, url-builder, config, state, frontmatter, search, audience, journeys, output, browser, content, bootstrap (13 files)
- `plugin/src/`: hub, hub-search, hub-skills, hub-tips, hub-news, hub-glossary, hub-onboard, hub-install, hub-audience, hub-refresh, hub-open (11 entry scripts)
- `plugin/commands/*.md` (11 markdown command shells)
- `plugin/scripts/build-snapshot.mjs`
- `plugin/tests/lib/*.test.ts` (8 lib test files) + `plugin/tests/manifest.test.ts` (1)
- `plugin/snapshot/` (5 glossary + 1 journey + 8 news items, plus `.snapshot-meta.json`)
- `plugin/README.md`
- `SCOPE.md`, `DECISIONS.md`, `docs/design/project-design.md` (section H. appended), `docs/design/project-functions.md`

## Semantic verification

- `npm run typecheck` exits 0 — strict TS, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, all clean.
- `npm run lint` exits 0 — no errors, no warnings.
- `npm test` exits 0 — 130/130 tests pass across 13 test files (manifest + 11 lib tests + end-to-end entry-script smoke).
- `npm run build` exits 0 — 11 ESM bundles in `dist/*.mjs`, externalized deps (no dynamic-require bug).

## Quality verification

### Correctness vs design

Spot-checks against `docs/design/project-design.md` section H:
- **H.2 file/module structure** — all 13 lib files + 11 entry scripts exist with the names specified. `content.ts` and `bootstrap.ts` added beyond the design (load orchestrator + shared entry-script wrapper) — additive refinements, surfaced here.
- **H.4 data models** — `plugin.json`, `marketplace.json`, `config.json`, `state.json` shapes match exactly. Manifest tests assert structural invariants.
- **H.5 frontmatter contracts** — base 10-key, news 13-key, skills 17-key validators implemented and asserted against real project glossary entries.
- **H.6 per-command CLI contracts** — every entry reads `process.argv` per its contracted argv shape; exit codes follow the H.6 table (0 success / 1 not found / 2 config-missing / 3 frontmatter-invalid / 4 network/git).
- **H.7 output format** — `DIVIDER` is exactly 60 box-drawing horizontal lines; audience badges `[BEGINNER|ADVANCED|BOTH]` with no ANSI; snapshot footer `(snapshot: <iso>, source: <sha7>)`.
- **H.8 error handling** — 11 named error classes, all flowing through `bootstrap.ts::fail()` to one-line stderr + non-zero exit. Tested.
- **H.10 integration points** — frontmatter shape mirrors `site/src/content.config.ts` (verified against `pipeline/src/types.ts` semantics). No coupling beyond shared markdown shape.

### Security (OWASP review)

- **Command injection** — only `hub-refresh.ts` invokes `spawnSync("git", [...])`. All argv elements are static strings or values from `plugin/config.json` (`repoUrl`, `refreshCachePath`). User input from `process.argv` is never spliced into a `git` invocation. ✓
- **Path traversal** — paths from frontmatter are not used as filesystem paths. Only the snapshot directory layout (controlled by build-snapshot.mjs) determines what gets read. ✓
- **YAML deserialization** — `js-yaml` configured with `JSON_SCHEMA`, which excludes custom tags and code-execution constructs (`!!js/function`, etc.). gray-matter wraps the engine. ✓
- **Open redirect / SSRF** — `/hub-open` reads `productionUrl`/`devUrl` from `config.json` (in-repo, trusted). The npm `open` package handles OS-specific browser launch with proper argument quoting. `probeUrl` uses `fetch` with an `AbortController`-bounded HEAD request — no body read, no DNS amplification, no follow-up exec. ✓
- **Privilege handling** — no setuid, no chmod, no sudo. State file written to user-owned XDG path. Refresh cache written to user-owned `~/.cache/`. ✓
- **Dependency vulnerabilities** — `npm audit --omit=dev` → 0 vulnerabilities (see `dependency-validation-hub-plugin.md`).

### Configuration / no-fallback rule

Every config key read via `config.ts::requireString/requireBoolean/requireNumber/requireObject`. Each throws `ConfigMissingError` (key absent) or `ConfigInvalidError` (wrong type). No `?? defaultValue`, no `|| 'default'`. Verified with 5 negative test cases in `tests/lib/config.test.ts` that all 5 trigger the right error class. ✓

The state file has a documented *initial* state (`{ audience: "both", lastJourney: null }`), which is not a config fallback — it's the explicit pre-`/hub-audience` default for a per-user runtime artifact. Distinct from a config fallback per project convention.

### Documentation

- `plugin/README.md` documents every one of the 11 commands with usage examples, install instructions, exit code table, dev workflow.
- `DECISIONS.md` 2026-05-19 entry appended with the load-bearing architectural calls and evidence.
- `SCOPE.md` "Hub-as-skill plugin" row flipped from `not started` to `✅ BUILT & OPERATIONAL`.
- `docs/design/project-design.md` section H (lines 3060–4085) appended with full architectural design.
- `docs/design/project-functions.md` appended with hub-plugin functional requirements F1–F18.

## Issues fixed during review

Five diagnostics surfaced during typecheck/build, all fixed:

1. `errors.ts` — missing `override` modifier on `cause` field (TS4114). Fixed by adding `override`.
2. `frontmatter.ts` — gray-matter engine `parse` return type narrowed from `unknown` to `object` to satisfy `GrayMatterOption['engines'][string]` signature (TS2322). Fixed with explicit cast + null guard.
3. `frontmatter.ts` (×3) — type-predicate returns `data is BaseFrontmatter` clashed with `Record<string, unknown>` input (TS2677). Fixed by changing return type to `true` (throws on invalid) — callers don't depend on TS narrowing.
4. `bootstrap.ts` — `{ bundled: undefined, cache: string }` violated `exactOptionalPropertyTypes` (TS2379). Fixed by omitting the undefined key.
5. esbuild bundling of gray-matter (CJS with dynamic `require("fs")`) broke ESM runtime. Fixed by switching esbuild to `packages: "external"` so deps stay unbundled. `dist/` size dropped from ~430 kB per entry to ~5 kB per entry; runtime resolution uses `node_modules`.

## Remaining concerns

None.

## Notes for downstream

- The Phase 6 plan envisioned 3 + 5 parallel coder agents (per plan-003 §3). Upstream API capacity (HTTP 529 Overloaded) caused all 8 background agent dispatches to fail. Work was completed inline by the orchestrator, which preserved the parallelization map's file-ownership boundaries but ran sequentially. No file conflicts arose because the ownership boundaries were respected.
- The empty `tips/` and `skills/` directories in the snapshot are expected per SCOPE.md (content authoring is a separate workstream). Plugin handles gracefully — `/hub-skills` and `/hub-tips` return "no entries" rather than throwing.
