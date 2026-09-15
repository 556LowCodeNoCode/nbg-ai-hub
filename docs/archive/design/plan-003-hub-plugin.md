# Plan 003 — Hub Plugin (`/hub-*` Claude Code Plugin)

**Refined request:** `docs/refined-requests/hub-plugin.md`
**Investigation:** `docs/reference/investigation-hub-plugin.md`
**Codebase scan:** `docs/reference/codebase-scan-hub-plugin.md`
**Created:** 2026-05-19

This plan sequences the implementation of the `plugin/` workspace — the third sibling to `pipeline/` and `site/`, distributed as a Claude Code marketplace plugin and installable via `/plugin marketplace add chomovazuzana/NbgAiHub`. The plugin exposes eleven `/hub-*` slash commands backed by compiled TypeScript scripts and a bundled markdown snapshot of the five content pillars.

The plan owns *sequencing, dependencies, files-to-modify, and verification criteria*. Architecture, interfaces, function signatures, error-class catalogue, command-script CLI contracts, and the snapshot-loader API surface are deferred to Phase 5 (Designer) — `project-design.md` "Plugin architecture" section.

---

## 1. Refinement reconciliations

Contradictions and corrections from Phase 3a investigation must be respected before Coders pick up the work. Each item below is either applied in this plan or flagged for the Designer / Coders at the indicated step.

- **R-1 — Plugin manifest path is `plugin/.claude-plugin/plugin.json`, NOT `plugin/plugin.json`.** Refined-request F1 and F2 use the latter; investigation §1b confirms the canonical location is `<plugin-root>/.claude-plugin/plugin.json`. **Applied at Step 3.** F1/F2 stand otherwise.

- **R-2 — Marketplace manifest lives at repo-root `.claude-plugin/marketplace.json`, NOT inside `plugin/`.** Refined-request F3 says `plugin/marketplace.json`; investigation §1c shows the marketplace manifest must live at the **marketplace** repo root with `"source": "./plugin"` pointing into the plugin workspace. Since this repo IS the marketplace, the file goes at `.claude-plugin/marketplace.json` at the repo root. **Applied at Step 4.**

- **R-3 — Plugin manifest does NOT enumerate commands.** Refined-request F2/AC23 ("`commands` array listing exactly eleven commands") describes a schema field that does not exist. Slash commands are filesystem-discovered: a markdown file at `plugin/commands/<name>.md` automatically produces `/<name>` when the plugin is enabled. **AC23 is reinterpreted at Step 9** as *"`plugin/commands/` contains exactly eleven `.md` files whose basenames match `{hub, hub-search, hub-skills, hub-tips, hub-news, hub-glossary, hub-onboard, hub-install, hub-audience, hub-refresh, hub-open}`, each with valid YAML frontmatter."* The manifest test (originally AC23) becomes a directory-listing assertion in `plugin/tests/manifest.test.ts`.

- **R-4 — Commands are LLM prompts that pre-execute Node scripts; the manifest has no "TS entry point" field.** Refined-request F1/NF1/A7 phrasing implies a TS-as-command-entry-point model. Investigation §2 corrects this: a command markdown file's body invokes a compiled Node script via `` !`node ${CLAUDE_PLUGIN_ROOT}/dist/<name>.mjs $ARGUMENTS` ``; the script's stdout is inlined into the LLM prompt, and the LLM is instructed to present that output. TypeScript sources at `plugin/src/<name>.ts` compile to `plugin/dist/<name>.mjs` (this plan uses `dist/` to mirror `pipeline/`'s `outDir: dist` convention — investigation §3a suggests `scripts/` but `dist/` is cheaper to align with the existing workspace tsconfig and the codebase scan §3). **Applied at Steps 5–9.**

- **R-5 — Per-user state lives at `${CLAUDE_PLUGIN_DATA}/state.json`, NOT a hardcoded `~/.claude/plugins/nbg-ai-hub/state.json`.** Refined-request A6 (revised 2026-05-19) and investigation §7 lock the env-var-driven path with an XDG fallback `${XDG_DATA_HOME:-$HOME/.local/share}/claude-code/plugins/nbg-ai-hub/` for non-Claude-Code invocations (test runs, manual debugging). **Applied at Step 5 (state module).**

- **R-6 — `/hub-refresh` writes the refreshed snapshot to `${CLAUDE_PLUGIN_DATA}/snapshot/`** (investigation §4b), refining refined-request A11 which named `~/.cache/nbg-ai-hub/snapshot/`. The git clone lives at `${CLAUDE_PLUGIN_DATA}/snapshot-clone/`; the staging dir is `${CLAUDE_PLUGIN_DATA}/snapshot-new/`; atomic rename produces `${CLAUDE_PLUGIN_DATA}/snapshot/`. The bundled-snapshot at `${CLAUDE_PLUGIN_ROOT}/snapshot/` remains the install-time baseline. The snapshot loader prefers `${CLAUDE_PLUGIN_DATA}/snapshot/` when present, else falls back to the bundled path. This dual lookup is a runtime branch on path existence, NOT a silent config fallback, so the no-fallback rule (CLAUDE.md) is preserved. **Applied at Steps 5 and 7.**

- **R-7 — `version` field deliberately omitted from `plugin.json` during active development.** Refined-request F2 names `0.1.0` as the start version. Investigation §1a clarifies that without `version`, Claude Code uses the git commit SHA as the cache key — preferred for active iteration. Pin `version` only when cutting a stable release. **Applied at Step 3.**

- **R-8 — `/hub-open` config gating.** Refined-request F14 / A3 specifies devMode-default-`true` with `localhost:4321` until GH Pages goes live. The plugin probes `localhost:4321` with a 1.5s timeout before opening; if no dev server is running, it prints a friendly "run `cd site && npm run dev`" hint and exits 0 without launching the browser. When `devMode: false` AND `productionUrl` equals the literal sentinel `PLACEHOLDER_NOT_YET_DEPLOYED`, the command prints the would-be URL and a "not yet deployed" message. **Applied at Step 6 (`open` command) and Step 5 (`config.ts`).**

- **R-9 — Dependencies bundled via esbuild, no `node_modules/` shipped in the plugin.** Investigation §8 notes that Claude Code does NOT run `npm install` on the user's machine for `source: "./plugin"` marketplaces — only `npm`-sourced plugins do. The plugin must ship a self-contained `dist/` directory. esbuild bundles `gray-matter`, `yaml`, and `open` into each `dist/<command>.mjs`. **Applied at Step 5 (build pipeline) and Step 8 (build step).**

- **R-10 — Search engine module is pure and independent of I/O.** Refined-request AC2 and investigation §6 lock title×5, frontmatter `topics`×3, body×1, case-insensitive substring match, 200-char snippets centered on first match, top-10 default. The ranking module exports a pure function (no I/O); the command-side glue passes in already-loaded `SearchItem[]`. **Applied at Step 5 (`lib/search.ts`).**

- **R-11 — Marketplace and plugin names.** Per investigation §8, marketplace name `nbg-ai-hub-marketplace` and plugin name `nbg-ai-hub`. Install command: `/plugin install nbg-ai-hub@nbg-ai-hub-marketplace`. Slightly redundant but unambiguous; document in `plugin/README.md` and the DECISIONS.md entry. **Applied at Steps 3, 4, 11.**

- **R-12 — Bundled snapshot built before publish.** Refined-request F15 says a build script copies `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/` into `plugin/snapshot/`. Step 10 below executes this; output is committed to the repo so first install needs no network. Mirror the manifest `.snapshot-meta.json` shape from investigation §4a: `{ generatedAt: ISO8601, sourceCommit: <git-sha> }`. **Applied at Step 10.**

- **R-13 — `noUncheckedIndexedAccess` propagation.** The plugin workspace inherits the strict tsconfig from `pipeline/` (codebase scan §3.2). Coders must use `.at(0)`, length guards, or destructuring instead of bare `arr[0]` access. **Documented; surfaces in Step 5 / Step 7.**

- **R-14 — `gray-matter` with `yaml` engine.** Codebase scan §4.1 and investigation §"Implementation considerations" call out the YAML 1.1 date-coercion quirk — gray-matter must be wired with the explicit `yaml` engine (matching `pipeline/`'s fix in DECISIONS.md 2026-05-18). **Applied at Step 5 (`lib/frontmatter.ts`).**

- **R-15 — Tone applies to all user-facing output.** README, command help, error messages, the DECISIONS.md entry, and the markdown-shell instruction lines all carry the *"what I wish I knew a year ago"* voice — opinionated, plainspoken, no AI-slop, no marketing voice (CLAUDE.md, refined-request NF8/A8, AC29). **Reviewer-judged at Step 13 + Step 14.**

---

## 2. Phase breakdown

Phases are ordered Phase 0 → Phase 4 per the task brief, with discrete steps inside each. Each step lists its goal, files created/modified, dependencies on prior steps, verification, and effort (S = ≤30 min, M = 30–90 min, L = ≥90 min).

### Phase 0 — Workspace scaffolding

#### Step 1 — Scaffold `plugin/` workspace structure

**Goal:** Create the `plugin/` sibling workspace mirroring `pipeline/`'s layout. Greenfield; no `npm create` template available for Claude Code plugins.

**Files created:**
- `plugin/` (directory)
- `plugin/.gitignore` (ignore `node_modules/`, keep `dist/` tracked per R-9)
- `plugin/.nvmrc` containing `22`
- `plugin/README.md` (placeholder; filled in at Step 13)
- `plugin/tsconfig.json` (mirrors `pipeline/tsconfig.json` exactly — strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `target: ES2023`, `module: NodeNext`, `outDir: ./dist`, `rootDir: ./src`)
- `plugin/eslint.config.js` (mirrors `pipeline/`'s ESLint 9 flat config)
- `plugin/vitest.config.ts` (mirrors `pipeline/vitest.config.ts`)
- `plugin/src/` (empty; populated at Step 5)
- `plugin/tests/` (empty; populated at Step 7)
- `plugin/commands/` (empty; populated at Step 9)
- `plugin/snapshot/` with `.gitkeep` (populated by Step 10's build script)
- `plugin/scripts-build/` (empty; populated at Step 8)
- `plugin/dist/` with `.gitkeep` (populated by Step 8's build; tracked in git per R-9)

**Dependencies:** none.

**Verification:**
- `ls plugin/.nvmrc plugin/tsconfig.json plugin/eslint.config.js plugin/vitest.config.ts` returns all four paths.
- `cat plugin/.nvmrc` prints `22`.
- `grep '"noUncheckedIndexedAccess": true' plugin/tsconfig.json` matches.
- `grep '"outDir": "./dist"' plugin/tsconfig.json` matches.

**Effort:** S.

---

#### Step 2 — Author `plugin/package.json`

**Goal:** Wire Node 22, ESM, vitest 4.x, ESLint 9, the three runtime deps (`gray-matter`, `yaml`, `open`), esbuild as a devDep (R-9), and the standard scripts.

**Files created:**
- `plugin/package.json`

**Required keys (Designer finalizes the exact shape):**
- `"name": "nbg-ai-hub-plugin"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=22" }`
- `"scripts": { "build": "node scripts-build/build.mjs", "typecheck": "tsc --noEmit", "lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\"", "test": "vitest run", "snapshot": "node scripts-build/build-snapshot.mjs" }`
- `"dependencies": { "gray-matter": "^4.0.3", "yaml": "^2.5.0", "open": "^10.1.0" }`
- `"devDependencies"` matches `pipeline/` for `typescript@^5.8.0`, `vitest@^4.1.6`, `eslint@^9.0.0`, `@typescript-eslint/*@^8.0.0`, `typescript-eslint@^8.0.0`, plus `esbuild@^0.24.0`

**Dependencies:** Step 1.

**Verification:**
- `cd plugin && npm install` exits 0 with no `deprecated` warnings on direct deps (NF6).
- `grep -E '"vitest": "\\^4' plugin/package.json` matches.
- `grep -E '"esbuild"' plugin/package.json` matches.
- `grep -E '"open": "\\^10' plugin/package.json` matches.

**Effort:** S.

---

### Phase 1 — Shared modules (`src/lib/`)

Phase 1 builds the pure-function core. Every per-command entry point in Phase 2 composes these modules. All Phase 1 modules are unit-tested in this phase before any command code lands.

#### Step 3 — Plugin manifest, marketplace manifest, plugin config

**Goal:** Land the three declarative files that Claude Code reads at install time and the in-repo plugin config that runtime code reads.

**Files created:**
- `plugin/.claude-plugin/plugin.json` — minimal manifest per investigation §1a. Required keys: `name: "nbg-ai-hub"`. Recommended: `$schema: "https://json.schemastore.org/claude-code-plugin-manifest.json"`, `description`, `author: { name: "chomovazuzana" }`, `repository: "https://github.com/chomovazuzana/NbgAiHub"`, `license: "MIT"`, `keywords: ["claude-code", "knowledge-hub", "onboarding", "skills"]`. **Omit `version`** per R-7.
- `.claude-plugin/marketplace.json` at repo root — schema per investigation §1c. Required: `name: "nbg-ai-hub-marketplace"`, `owner: { name: "chomovazuzana" }`, `plugins: [{ name: "nbg-ai-hub", source: "./plugin", description, category: "knowledge-management", keywords: [...] }]`. Recommended: `$schema: "https://json.schemastore.org/claude-code-marketplace.json"`.
- `plugin/config.json` — `{ "productionUrl": "PLACEHOLDER_NOT_YET_DEPLOYED", "devMode": true, "refreshUrl": "https://github.com/chomovazuzana/NbgAiHub.git", "search": { "weights": { "title": 5, "topics": 3, "body": 1 }, "snippetLength": 200, "topN": 10 } }`

**Dependencies:** Step 1, Step 2.

**Verification:**
- `ls plugin/.claude-plugin/plugin.json .claude-plugin/marketplace.json plugin/config.json` returns all three paths.
- `grep '"name": "nbg-ai-hub"' plugin/.claude-plugin/plugin.json` matches.
- `grep '"source": "./plugin"' .claude-plugin/marketplace.json` matches.
- `grep -v '"version"' plugin/.claude-plugin/plugin.json` (i.e., no version key) — confirm absence per R-7.
- `grep '"productionUrl"' plugin/config.json` matches and value is the sentinel.

**Effort:** S.

---

#### Step 4 — Skeleton entry point for marketplace + plugin manifest tests

**Goal:** Get Vitest running against trivial manifest-shape tests so subsequent tests have a green baseline.

**Files created:**
- `plugin/tests/manifest.test.ts` — asserts `plugin/.claude-plugin/plugin.json` parses, `name === "nbg-ai-hub"`, no `version` key, `commands/` directory exists.
- `plugin/tests/marketplace.test.ts` — asserts `.claude-plugin/marketplace.json` parses, `name === "nbg-ai-hub-marketplace"`, `plugins[0].source === "./plugin"`, `plugins[0].name === "nbg-ai-hub"`.

**Dependencies:** Step 3.

**Verification:**
- `cd plugin && npm test` runs both files and exits 0.
- Per AC22 / AC23: these two test files together cover the rewritten AC23 (eleven `.md` files in `commands/` — the directory-existence assertion is here; the eleven-files assertion lands at Step 9's test).

**Effort:** S.

---

#### Step 5 — Shared library modules under `plugin/src/lib/`

**Goal:** Build the seven pure-function modules that every command composes. Each module has corresponding unit tests landed in Step 7's same-phase test list (or earlier — they're independent). Designer owns the public interfaces; this step locks the file presence and intended responsibility.

**Files created:**
- `plugin/src/lib/errors.ts` — exports named error classes: `MissingPluginConfigError`, `InvalidAudienceError`, `SnapshotNotFoundError`, `UnknownSectionError`, `JourneyNotFoundError`, `SkillNotFoundError`, `RefreshFailedError`. Mirrors `pipeline/src/`'s naming pattern (codebase scan §3.5).
- `plugin/src/lib/config.ts` — reads `plugin/config.json` (path resolved via `${CLAUDE_PLUGIN_ROOT}/config.json` with a `path.resolve(import.meta.url, '../../config.json')` fallback for non-Claude-invoked runs). Throws `MissingPluginConfigError` when file absent (AC27, R-15). Exposes typed `{ productionUrl, devMode, refreshUrl, search }` shape.
- `plugin/src/lib/frontmatter.ts` — wraps `gray-matter` with the explicit `yaml` engine (R-14). Exports a typed parser that returns `{ data, content }` matching the canonical 10-key shape + news-specific extras (codebase scan §4.1).
- `plugin/src/lib/snapshot.ts` — walks the snapshot directory, parses each `*.md` per pillar via `frontmatter.ts`, returns typed items. **Implements R-6 dual lookup:** prefer `${CLAUDE_PLUGIN_DATA}/snapshot/` if it exists; else fall back to `${CLAUDE_PLUGIN_ROOT}/snapshot/`. Throws `SnapshotNotFoundError` if neither exists. Also reads `.snapshot-meta.json` and exposes the `generatedAt` timestamp for NF7's freshness footer.
- `plugin/src/lib/state.ts` — read/write `${CLAUDE_PLUGIN_DATA}/state.json` with the XDG fallback path (R-5). First-run bootstrap returns `{ audience: 'both', lastJourney: null }` per investigation §7's no-preferences-set rationale. Documented in the DECISIONS.md entry (Step 13) as user-state initialization, not a config fallback.
- `plugin/src/lib/search.ts` — pure ranking function per R-10. Signature (designer-final): `search(items: SearchItem[], query: string, audience: 'beginner'|'advanced'|'both', limit?: number): Hit[]`. Implements title×5 + topics×3 + body×1 scoring, case-insensitive substring, top-N=10, 200-char snippets centered on first match (A14, A15).
- `plugin/src/lib/url-builder.ts` — pure deep-link builder per AC20. Signature (designer-final): `buildUrl(baseUrl: string, section?: string, subsection?: string): string`. Handles the route table from AC16: bare base, the 5 pillars, glossary-with-anchor (`<base>/glossary#mcp`), journey shortcut (`<base>/start-here/day-1/`), `reference`, `contribute`. Unknown section throws `UnknownSectionError` naming the valid set.
- `plugin/src/lib/audience.ts` — exports the audience-filter predicate that takes an `audience: 'beginner'|'advanced'|'both'` setting and an item's frontmatter audience, returns boolean (matching site's filter semantics per F17).
- `plugin/src/lib/journeys.ts` — resolves a journey by slug from `snapshot/journeys/`, detects the "placeholder template" condition for AC9 (coming-soon marker in body), returns `{ slug, title, body, isPlaceholder }`.

**Dependencies:** Step 2 (deps installed), Step 3 (config file exists for `config.ts` tests).

**Verification:**
- `ls plugin/src/lib/` returns the nine `.ts` files above.
- `cd plugin && npm run typecheck` exits 0.
- `cd plugin && npm run lint` exits 0.

**Effort:** L. (Largest single step in Phase 1; ~8 modules of meaningful logic. The Designer's per-module contracts must be ready before this step starts.)

---

#### Step 6 — Per-command entry points under `plugin/src/`

**Goal:** Eleven thin TypeScript files, one per command, that parse `process.argv`, compose lib modules, and print to stdout. Each file is ~30–120 lines.

**Files created:**
- `plugin/src/hub.ts` — `/hub` entry-point. Loads state (audience, lastJourney) and config, prints pillar menu + last-used journey + current audience filter (F4 / AC1).
- `plugin/src/hub-search.ts` — `/hub-search`. Parses query + optional `--all` flag, loads snapshot, calls `lib/search.ts`, formats ranked snippets (F5 / AC2).
- `plugin/src/hub-skills.ts` — `/hub-skills [topic]`. Loads snapshot, optional topic filter, applies audience filter, prints list with name + description + location + install command + audience badge (F6 / AC3).
- `plugin/src/hub-tips.ts` — `/hub-tips [topic]`. Mirrors `hub-skills.ts` against tips (F7 / AC4).
- `plugin/src/hub-news.ts` — `/hub-news [--week|--today]`. Parses flag, sorts by `authored` desc, applies audience filter, prints title + audience + topics + source + summary + "Read on source" link (F8 / AC5). Decision on `editor_confidence` surfacing (OQ6) deferred to Designer.
- `plugin/src/hub-glossary.ts` — `/hub-glossary <term>`. Looks up by filename basename or frontmatter title (case-insensitive); discovers related terms via `[term]` link scan across other glossary entries (F9 / AC6). Missing term: print three closest matches by Levenshtein-like distance (AC7).
- `plugin/src/hub-onboard.ts` — `/hub-onboard <journey>`. Resolves journey via `lib/journeys.ts`, prints body + `[content in progress]` note when `isPlaceholder` (AC8 / AC9). Updates `lastJourney` in state.
- `plugin/src/hub-install.ts` — `/hub-install <skill-id>`. Loads skill, echoes its frontmatter `install_command` verbatim (F11 / AC10). Missing skill: print suggestions (AC11).
- `plugin/src/hub-audience.ts` — `/hub-audience [beginner|advanced|both]`. No arg: prints current value. With arg: validates against the three-value set (throws `InvalidAudienceError` per AC13) and persists via `lib/state.ts` (F12 / AC12 / AC19).
- `plugin/src/hub-refresh.ts` — `/hub-refresh`. Implements the clone-or-pull → staging → atomic-rename flow from investigation §4b (R-6). Preserves prior snapshot on failure (AC15). Prints counts per pillar + freshness timestamp on success (AC14). Surfaces git error verbatim on failure.
- `plugin/src/hub-open.ts` — `/hub-open [section] [subsection]`. Composes `lib/config.ts` + `lib/url-builder.ts` + the `open` npm package. Implements R-8: probes `localhost:4321` in devMode, prints would-be URL + "not yet deployed" when sentinel detected (AC16 / AC17 / AC21).

**Dependencies:** Step 5 (lib modules exist).

**Verification:**
- `ls plugin/src/*.ts` returns 11 entry-point files (excluding the `lib/` subdir).
- `cd plugin && npm run typecheck` exits 0.
- `cd plugin && npm run lint` exits 0.

**Effort:** L. (All eleven entry points; parallelizable in Phase 6 per §3.)

---

### Phase 2 — Tests for shared modules and commands

#### Step 7 — Per-command and per-lib tests

**Goal:** Land tests under `plugin/tests/` covering every AC1–AC17 and the cross-cutting AC18–AC28. Manifest tests already landed at Step 4.

**Files created:**

*Lib tests (cover the pure-function core):*
- `plugin/tests/config.test.ts` — AC27 (`MissingPluginConfigError` when `plugin/config.json` renamed during test).
- `plugin/tests/frontmatter.test.ts` — AC28 (canonical 10-key shape + news extras; rejects malformed entries; YAML date-coercion handled).
- `plugin/tests/snapshot.test.ts` — verifies dual-lookup (R-6) prefers `${CLAUDE_PLUGIN_DATA}/snapshot/` over bundled when both exist; falls back when only bundled present. Covers AC18's bundled-snapshot mechanism in part.
- `plugin/tests/snapshot-build.test.ts` — AC18 (snapshot build copies all five content folders; `.snapshot-meta.json` shape correct).
- `plugin/tests/state.test.ts` — first-run bootstrap returns `{ audience: 'both', lastJourney: null }`; round-trip write+read preserves values across simulated reloads (AC12 / AC19).
- `plugin/tests/search.test.ts` — AC2 (title > topics > body weighting with fixture items).
- `plugin/tests/url-builder.test.ts` — AC16 parameterized table (each invocation form maps to the right URL; unknown section throws `UnknownSectionError`).

*Per-command tests:*
- `plugin/tests/hub-entry.test.ts` — AC1 (`/hub` renders pillar menu + audience + last journey).
- `plugin/tests/skills.test.ts` — AC3 (`/hub-skills mcp` filters to topic-tagged skills).
- `plugin/tests/tips.test.ts` — AC4 (mirrors AC3 against tips).
- `plugin/tests/news.test.ts` — AC5 (default 7-day window; `--today`; `--week`).
- `plugin/tests/glossary.test.ts` — AC6 (definition + related terms via `[term]` scan) and AC7 (suggestions for unknown term).
- `plugin/tests/onboard.test.ts` — AC8 (parameterized across `day-1`, `week-1`, `backend`, `data-scientist`, `ml-engineer`; updates `lastJourney`) and AC9 (placeholder graceful).
- `plugin/tests/install.test.ts` — AC10 (echoes `install_command`) and AC11 (missing-skill clear).
- `plugin/tests/audience.test.ts` — AC12 (persistence across reloads), AC13 (`InvalidAudienceError`), AC19 (round-trip from disk).
- `plugin/tests/refresh.test.ts` — AC14 (atomic replace on success, mocked git) and AC15 (preserves cache on failure, mocked git).
- `plugin/tests/open.test.ts` — AC16 (URLs), AC17 (placeholder behavior; mocks the `open` package and `fetch`).
- `plugin/tests/deployment.test.ts` — AC21 (commands operate against snapshot when site URL is placeholder).

**Test conventions** (mirroring `pipeline/tests/`):
- One test file per source module + cross-cutting suites.
- Fixtures under `plugin/tests/fixtures/snapshot/` mirror the snapshot layout: `glossary/*.md`, `tips/*.md`, `skills/*.md`, `news/published/*.md`, `journeys/*.md`. Designer specifies the fixture set; Coders populate.
- Network and git calls in `refresh.test.ts` mocked via `vi.mock('node:child_process')` and a controlled fake `git`.
- `open` package mocked in `open.test.ts` via `vi.mock('open')`.

**Dependencies:** Step 5 (lib), Step 6 (commands).

**Verification:**
- `cd plugin && npm test` exits 0.
- Test count comfortably covers all per-command + cross-cutting ACs (target: ≥40 test cases across ≥18 files).

**Effort:** L. (Parallelizable — see §3.)

---

#### Step 8 — esbuild build pipeline → `plugin/dist/*.mjs`

**Goal:** Produce self-contained ESM bundles for each command entry point, with `gray-matter`, `yaml`, and `open` inlined (R-9). The compiled `dist/` is committed to the repo because Claude Code does not run `npm install` on the user's machine for `source: "./plugin"` installs (investigation §8).

**Files created:**
- `plugin/scripts-build/build.mjs` — wraps esbuild's API. For each of the eleven entry points in `src/<name>.ts`, builds `dist/<name>.mjs` with `--platform=node --target=node22 --bundle --format=esm`. Externals: only `node:*` builtins. Output: one bundled file per command.
- `plugin/dist/<11 .mjs files>` — generated artifacts. Tracked in git per R-9.

**Files modified:**
- `plugin/.gitignore` — confirm `dist/` is NOT in the ignore list (the directory is shipped runtime payload). Add `node_modules/` and `*.tsbuildinfo`.

**Dependencies:** Step 6 (sources exist).

**Verification:**
- `cd plugin && npm run build` exits 0.
- `ls plugin/dist/*.mjs` returns 11 files (one per command).
- For each bundle: `node plugin/dist/<command>.mjs --help` (or `node plugin/dist/<command>.mjs` with no args) exits cleanly (or surfaces a documented `MissingPluginConfigError` when `CLAUDE_PLUGIN_ROOT` env not set — both acceptable; the harness env is provided by Claude Code at runtime).
- Each bundle is self-contained: `node -e "import('./plugin/dist/hub-open.mjs')"` does NOT resolve `open` from `node_modules/` (the dep is inlined). Confirm via `grep "from 'open'" plugin/dist/hub-open.mjs` returning ZERO hits (the require has been inlined into the bundle).

**Effort:** M.

---

### Phase 2 (continued) — Slash command markdown shells

#### Step 9 — Eleven `plugin/commands/<name>.md` shell files

**Goal:** Land the eleven thin markdown files that Claude Code filesystem-discovers as slash commands. Each file is ~10–20 lines: frontmatter declaring `description`, `argument-hint`, `allowed-tools: Bash(node *)`, plus a body that pre-executes the corresponding `dist/<name>.mjs` script and instructs the LLM to present the stdout verbatim (R-4, investigation §2 Pattern A).

**Files created (eleven, one per command):**
- `plugin/commands/hub.md`
- `plugin/commands/hub-search.md`
- `plugin/commands/hub-skills.md`
- `plugin/commands/hub-tips.md`
- `plugin/commands/hub-news.md`
- `plugin/commands/hub-glossary.md`
- `plugin/commands/hub-onboard.md`
- `plugin/commands/hub-install.md`
- `plugin/commands/hub-audience.md`
- `plugin/commands/hub-refresh.md`
- `plugin/commands/hub-open.md`

**Per-file shape (Designer finalizes the exact prompt wording):**
- YAML frontmatter: `description` (one-line, in tone), `argument-hint` (e.g., `<query> [--all]` for hub-search; empty for hub), `allowed-tools: Bash(node *)`.
- Body opens with a one-sentence framing line ("Search NbgAiHub content for the user's query.").
- Pre-execution directive: `` ```! `` followed by `` node ${CLAUDE_PLUGIN_ROOT}/dist/<command>.mjs $ARGUMENTS `` and a closing `` ``` ``.
- Closing instruction line tells the LLM how to present the inlined stdout — "Present the output above verbatim. Do not add commentary." for pass-through cases; "If the output shows 'OK <timestamp>', confirm success. If it shows 'ERROR', surface the error verbatim and tell the user the cache is unchanged." for `/hub-refresh`; etc. (investigation §2 Patterns A/B/C).

**Files modified:**
- `plugin/tests/manifest.test.ts` (extended) — adds the assertion that `plugin/commands/` contains exactly 11 `.md` files whose basenames match the locked set `{hub, hub-search, hub-skills, hub-tips, hub-news, hub-glossary, hub-onboard, hub-install, hub-audience, hub-refresh, hub-open}`. This is the rewritten AC23 (R-3).

**Dependencies:** Step 6 (TS sources exist, so the build of Step 8 produces the `dist/<name>.mjs` referenced from each command file), Step 8 (`dist/` populated — required for the manifest test to be meaningful; the markdown reference is a path-string check, not a load-time check, so technically command files can land before the build, but verification is cleaner after Step 8).

**Verification:**
- `ls plugin/commands/*.md | wc -l` prints `11`.
- For each command file, frontmatter parses cleanly (gray-matter or direct YAML parse in `manifest.test.ts`).
- Each file's body contains the literal substring `node ${CLAUDE_PLUGIN_ROOT}/dist/<command>.mjs`.
- `cd plugin && npm test -- manifest.test.ts` (or full test run) exits 0 with the eleven-files assertion passing (rewritten AC23).

**Effort:** M.

---

### Phase 3 — Manifests, marketplace, README

Step 3 (plugin manifest, marketplace manifest, plugin config) and Step 4 (manifest-shape tests) already landed earlier; this phase finalizes the documentation and snapshot delivery.

#### Step 10 — Snapshot build script + populate `plugin/snapshot/`

**Goal:** Implement and run the snapshot build (R-12 / F15 / AC18). Copies the five content pillars from repo root into `plugin/snapshot/` and writes the meta manifest.

**Files created:**
- `plugin/scripts-build/build-snapshot.mjs` — per investigation §4a pseudocode. Removes `plugin/snapshot/` then recreates it. For each pillar in `['glossary', 'tips', 'skills', 'news/published', 'journeys']`, `cpSync('../' + p, 'snapshot/' + p, { recursive: true })`. Writes `plugin/snapshot/.snapshot-meta.json` with `{ generatedAt: ISO8601, sourceCommit: git rev-parse HEAD }`.

**Files generated (committed to repo):**
- `plugin/snapshot/glossary/*.md` (currently 5 entries)
- `plugin/snapshot/tips/.gitkeep` (currently empty)
- `plugin/snapshot/skills/.gitkeep` (currently empty)
- `plugin/snapshot/news/published/*.md` (currently 8 entries)
- `plugin/snapshot/journeys/day-1.md` (placeholder)
- `plugin/snapshot/.snapshot-meta.json`

**Dependencies:** Step 1 (snapshot dir exists), Step 2 (Node available).

**Verification:**
- `cd plugin && npm run snapshot` exits 0.
- `ls plugin/snapshot/glossary plugin/snapshot/tips plugin/snapshot/skills plugin/snapshot/news/published plugin/snapshot/journeys plugin/snapshot/.snapshot-meta.json` returns all six paths.
- `cd plugin && npm test -- snapshot-build` exits 0.
- `cat plugin/snapshot/.snapshot-meta.json | grep generatedAt` matches.
- Idempotent: running `npm run snapshot` twice produces the same file set; only `.snapshot-meta.json` timestamp changes.

**Effort:** S.

---

#### Step 11 — `plugin/README.md`

**Goal:** Document all eleven commands per AC24, with the *"what I wish I knew a year ago"* tone (NF8 / R-15). Include the install command (R-11), the dev-mode caveat (R-8), the `/hub-refresh` private-repo prerequisite (investigation §4c — user needs `gh auth login` or SSH keys), the rebuild-after-source-changes note (R-9).

**Files created/modified:**
- `plugin/README.md` (overwrite Step 1's placeholder).

**Required sections** (Designer finalizes prose):
1. One-paragraph "what this is" framing — bank colleagues, knowledge hub, in-terminal.
2. Install: `/plugin marketplace add chomovazuzana/NbgAiHub` then `/plugin install nbg-ai-hub@nbg-ai-hub-marketplace`.
3. Eleven command sections (AC24): each command name as a heading (so `grep -E "^#+ /hub" plugin/README.md | wc -l` returns 11), one-line description, at least one usage example.
4. "Configuring" section: how `plugin/config.json` works (`productionUrl`, `devMode`), how to flip devMode to false when GH Pages goes live.
5. "Refreshing content" section: what `/hub-refresh` does, the `gh auth` / SSH prerequisite for private-repo access.
6. "Development" section: `npm install`, `npm run build`, `npm run snapshot`, `npm run test`. Note that `dist/` is committed (R-9 rationale).
7. "Where state lives" section: `${CLAUDE_PLUGIN_DATA}/state.json` for audience + last journey (R-5).

**Dependencies:** Steps 3–10 (all functionality exists so the README describes the real shape).

**Verification:**
- `grep -E "^#+ /hub" plugin/README.md | wc -l` returns 11 (AC24).
- `grep "nbg-ai-hub@nbg-ai-hub-marketplace" plugin/README.md` matches.
- `grep "PLACEHOLDER_NOT_YET_DEPLOYED" plugin/README.md` matches OR an equivalent sentinel-aware framing.
- Tone-check (AC29): manual reviewer pass — no marketing voice, no emoji-heavy decoration, no AI-slop hedging.

**Effort:** M.

---

### Phase 4 — Integration, DECISIONS.md, SCOPE.md, end-to-end smoke

#### Step 12 — Local end-to-end install smoke + integration verification doc

**Goal:** DoD #13 / AC22 — install the plugin into a fresh Claude Code session via the local-marketplace flow, invoke all eleven commands against the bundled snapshot, capture evidence in `docs/reference/integration-verification-hub-plugin.md`.

**Files created:**
- `docs/reference/integration-verification-hub-plugin.md` — matches the format of the existing `integration-verification-rss-pipeline.md` and `integration-verification-astro-site.md`. Sections: (1) Install steps and output, (2) Each of the eleven commands invoked + observed output, (3) `/hub-refresh` mocked run against a local git fixture (or the real repo if accessible), (4) `/hub-open` devMode probe outcome, (5) `claude plugin validate .` CLI output, (6) any deviations or follow-ups.

**Procedure:**
1. From a fresh Claude Code session: `/plugin marketplace add ./` (or the full `chomovazuzana/NbgAiHub` shorthand once published).
2. `/plugin install nbg-ai-hub@nbg-ai-hub-marketplace`.
3. Run each of the eleven commands. Capture the output. Confirm no errors against the bundled snapshot.
4. Run `npx --package=@anthropic-ai/claude-code claude plugin validate .` from repo root; capture stdout/stderr.
5. Record everything in the integration-verification doc.

**Dependencies:** Steps 1–11 all complete and committed.

**Verification:**
- File `docs/reference/integration-verification-hub-plugin.md` exists with the six sections.
- Each command has a capture of stdout demonstrating non-error behavior.
- `claude plugin validate .` reports no schema errors against either manifest (AC22).

**Effort:** M.

---

#### Step 13 — DECISIONS.md entry + Designer's "Plugin architecture" section + Issues - Pending Items update

**Goal:** DoD #8 / AC25 + DoD #14. Add the dated DECISIONS.md entry, append the Designer's architecture section to `project-design.md`, register follow-ups.

**Files modified:**
- `DECISIONS.md` — append a `2026-05-19` entry titled "Hub-as-skill plugin ships as Claude Code marketplace plugin." Bullets: (a) bundled-snapshot + opt-in `/hub-refresh` delivery model, (b) marketplace distribution path `/plugin marketplace add chomovazuzana/NbgAiHub`, plugin name `nbg-ai-hub`, marketplace name `nbg-ai-hub-marketplace`, (c) markdown-shell-invokes-Node-script command pattern (R-4), (d) `${CLAUDE_PLUGIN_DATA}/state.json` for per-user state (R-5), (e) `${CLAUDE_PLUGIN_DATA}/snapshot/` for refreshed content (R-6), (f) `version` field omitted during active development (R-7), (g) esbuild-bundled `dist/*.mjs` committed to repo (R-9), (h) `.claude-plugin/` directories at both repo root and `plugin/` root (R-1, R-2), (i) tone non-negotiable for all user-facing output (R-15). Dated to current date at merge (currently 2026-05-19).
- `docs/design/project-design.md` — append a new "Plugin architecture" section authored by the Designer (Phase 5). Documents the per-command interfaces, the lib module APIs, the error-class catalogue, the build pipeline. (Not produced by this plan; the *placeholder* hook is captured here so Phase 5 has a known append location.)
- `Issues - Pending Items.md` — register follow-ups: (a) OQ4 by-role journey slug confirmation, (b) OQ5 marketplace `schemaVersion` if Claude Code introduces one before publish, (c) OQ6 surface `editor_confidence` in `/hub-news`, (d) CI step to enforce `dist/` is in sync with `src/` (investigation R6 — `cd plugin && npm run build && git diff --exit-code dist/`), (e) optional `refreshUrlSsh` config key for users without HTTPS git auth.

**Dependencies:** Step 12 (smoke complete so the DECISIONS entry reflects the as-built state).

**Verification:**
- `grep "Hub-as-skill plugin ships as Claude Code marketplace plugin" DECISIONS.md` matches (AC25).
- `grep "Plugin architecture" docs/design/project-design.md` matches (DoD #14).
- `grep -E "OQ4|OQ5|OQ6" "Issues - Pending Items.md"` matches (or an equivalent paraphrase per the global pending-items convention).

**Effort:** M.

---

#### Step 14 — SCOPE.md update

**Goal:** AC26 / DoD #9. Flip the MVP table row, check demo-ability boxes, bump `*Last updated*`.

**Files modified:**
- `SCOPE.md` — locate the "Hub-as-skill plugin" row in the MVP table; change status from `not started` to the done marker matching how the RSS pipeline and Astro site rows are marked (the user's chosen emoji/text, currently `✅` per other rows). Check the demo-ability checklist items "Hub installable as a plugin..." and "/hub commands work from a fresh Claude Code install." Bump `*Last updated*` at the top to current date.

**Dependencies:** Step 12 (smoke proves the demo-ability items).

**Verification:**
- `grep -A 1 "Hub-as-skill plugin" SCOPE.md` shows the done marker.
- `grep "/hub commands work from a fresh Claude Code install" SCOPE.md` — checkbox is checked (`- [x]` or equivalent).
- `grep "Last updated" SCOPE.md` shows the current date.

**Effort:** S.

---

#### Step 15 — Project-functions.md append (concurrent with this plan)

**Goal:** DoD #14 second half. Append the F1–F18 functional contract entries for the plugin to `docs/design/project-functions.md`.

**Files modified:**
- `docs/design/project-functions.md` — append a new section `## Hub plugin (plan-003-hub-plugin)` containing F1–F18 from the refined request (verbatim or lightly trimmed for the functional-contract style).

**Dependencies:** This plan itself (the section is appended in the same commit as this plan file).

**Verification:**
- `grep "Hub plugin (plan-003-hub-plugin)" docs/design/project-functions.md` matches.
- `grep -E "F1 —|F2 —|F3 —|F4 —|F5 —|F6 —|F7 —|F8 —|F9 —|F10 —|F11 —|F12 —|F13 —|F14 —|F15 —|F16 —|F17 —|F18 —" docs/design/project-functions.md` returns at least 18 matches within the plugin section (existing pipeline and site sections also have F-numbers, so count the slice within the plugin heading).

**Effort:** S.

---

## 3. Parallelization map

Identifies independent work units that Phase 6 (parallel Coders) can pick up simultaneously.

### Strict sequential — must run in order

```
Step 1 (scaffold) → Step 2 (package.json)
  ↓
Step 3 (manifests + config) → Step 4 (manifest tests)
  ↓
[Step 5 fans out — see parallel block below]
  ↓
[Step 6 fans out — see parallel block below]  ← depends on Step 5 lib modules
  ↓
[Step 7 fans out — see parallel block below]  ← depends on Step 5 + Step 6
  ↓
Step 8 (esbuild build) → Step 9 (command markdown files)
  ↓
Step 10 (snapshot build)  ← can start earlier; see below
  ↓
Step 11 (README)
  ↓
Step 12 (E2E smoke) → Step 13 (DECISIONS + design) → Step 14 (SCOPE)
```

### Parallelizable within Step 5 (nine lib modules)

| Worker A | Worker B | Worker C |
|---|---|---|
| `errors.ts` | `config.ts` | `frontmatter.ts` |
| `snapshot.ts` | `state.ts` | `search.ts` |
| `url-builder.ts` | `audience.ts` | `journeys.ts` |

Coupling: `state.ts`, `snapshot.ts`, `config.ts` all depend on `errors.ts`. Land `errors.ts` first (10 min), then the other eight in parallel. `journeys.ts` depends on `snapshot.ts` and `frontmatter.ts`; sequence inside Worker C.

### Parallelizable within Step 6 (eleven entry points)

All eleven entry points are independent files. Phase 6 can dispatch up to 11 Coders simultaneously:

| Worker | Files |
|---|---|
| A | `hub.ts`, `hub-search.ts` |
| B | `hub-skills.ts`, `hub-tips.ts` |
| C | `hub-news.ts`, `hub-glossary.ts` |
| D | `hub-onboard.ts`, `hub-install.ts` |
| E | `hub-audience.ts`, `hub-refresh.ts`, `hub-open.ts` |

No cross-coupling — each entry point composes lib modules independently.

### Parallelizable within Step 7 (≥18 test files)

Lib tests and per-command tests are all independent. Five-worker dispatch matches Step 6's worker split; each Coder writes the tests for the entry points they implemented, plus optionally a lib test alongside.

### Parallelizable across step boundaries

- **Step 10 (snapshot build)** depends only on Step 1 (snapshot dir exists) and Step 2 (Node available). Can run any time from Step 2 onward — overlap with Step 5 / Step 6 / Step 7 to shorten wall-clock time.
- **Step 11 (README)** can be drafted in parallel with Steps 7–10 (the eleven command behaviors are locked by the refined request; README writes against the spec, not against actual stdout). Tone-pass the draft after Step 12 completes for accuracy.
- **Step 15 (project-functions.md append)** is delivered with this plan in the same commit.

### Critical-path summary

Critical path: **Step 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 12 → 13 → 14**.
With the parallel fan-out at Steps 5, 6, 7, the critical path collapses to roughly:
- Phase 0 (Steps 1–2): ~30 min.
- Phase 1 (Steps 3–5, with Step 5 parallelized across 3 workers): ~1.5 hours.
- Phase 2 (Steps 6–9, with Steps 6+7 parallelized across 5 workers): ~3 hours.
- Phase 3 (Steps 10–11): ~1 hour.
- Phase 4 (Steps 12–14): ~1 hour.
- **Total ≈ 6–7 hours of parallel-team work; ~2–3 days for a single coder.**

---

## 4. AC coverage table

Every AC1–AC29 from the refined request maps to at least one plan step. Evidence is the artifact/command that proves the AC at verification time.

| AC | Covered by step(s) | Evidence at verification time |
|----|---|---|
| AC1 — `/hub` entry point | Step 6 (`hub.ts`), Step 7 (`hub-entry.test.ts`) | `vitest run hub-entry.test.ts` passes `renders pillar menu with audience filter and last-used journey`. |
| AC2 — `/hub-search` ranking | Step 5 (`lib/search.ts`), Step 6 (`hub-search.ts`), Step 7 (`search.test.ts`) | `vitest run search.test.ts` passes `ranks results by title > topics > body match`. |
| AC3 — `/hub-skills [topic]` | Step 6 (`hub-skills.ts`), Step 7 (`skills.test.ts`) | `vitest run skills.test.ts` passes `lists skills filtered by topic`. |
| AC4 — `/hub-tips [topic]` | Step 6 (`hub-tips.ts`), Step 7 (`tips.test.ts`) | `vitest run tips.test.ts` passes `lists tips filtered by topic`. |
| AC5 — `/hub-news` range flags | Step 6 (`hub-news.ts`), Step 7 (`news.test.ts`) | `vitest run news.test.ts` passes the three cases (`defaults to last 7 days`, `--today filters to today`, `--week is explicit 7-day window`). |
| AC6 — `/hub-glossary <term>` | Step 6 (`hub-glossary.ts`), Step 7 (`glossary.test.ts`) | `vitest run glossary.test.ts` passes `returns definition and discovers related terms`. |
| AC7 — `/hub-glossary` missing | Step 6, Step 7 (`glossary.test.ts`) | `vitest run glossary.test.ts` passes `returns suggestions for unknown term`. |
| AC8 — `/hub-onboard` journeys | Step 5 (`lib/journeys.ts`), Step 6 (`hub-onboard.ts`), Step 7 (`onboard.test.ts`) | `vitest run onboard.test.ts` parameterized pass `renders each named journey and updates last-used state`. |
| AC9 — Placeholder graceful | Step 5 (`lib/journeys.ts`), Step 7 (`onboard.test.ts`) | `vitest run onboard.test.ts` passes `renders placeholder note when journey body is unfinished`. |
| AC10 — `/hub-install` echo | Step 6 (`hub-install.ts`), Step 7 (`install.test.ts`) | `vitest run install.test.ts` passes `echoes the install_command from skill frontmatter`. |
| AC11 — `/hub-install` missing | Step 6, Step 7 (`install.test.ts`) | `vitest run install.test.ts` passes `reports missing skill clearly`. |
| AC12 — `/hub-audience` persists | Step 5 (`lib/state.ts`), Step 6 (`hub-audience.ts`), Step 7 (`audience.test.ts`) | `vitest run audience.test.ts` passes `persists audience preference across plugin reloads`. |
| AC13 — `/hub-audience` invalid | Step 5 (`lib/errors.ts`), Step 6, Step 7 (`audience.test.ts`) | `vitest run audience.test.ts` passes `throws InvalidAudienceError for unknown value`. |
| AC14 — `/hub-refresh` atomic | Step 6 (`hub-refresh.ts`), Step 7 (`refresh.test.ts`) | `vitest run refresh.test.ts` passes `replaces snapshot atomically on success` (mocked git). |
| AC15 — `/hub-refresh` failure preserves | Step 6, Step 7 (`refresh.test.ts`) | `vitest run refresh.test.ts` passes `preserves cache on network failure`. |
| AC16 — `/hub-open` URL builder | Step 5 (`lib/url-builder.ts`), Step 6 (`hub-open.ts`), Step 7 (`url-builder.test.ts`, `open.test.ts`) | `vitest run url-builder.test.ts` parameterized pass `builds correct deep-link URL for each invocation`; covers all 10 invocation forms. |
| AC17 — `/hub-open` not deployed | Step 6 (`hub-open.ts`), Step 7 (`open.test.ts`) | `vitest run open.test.ts` passes `prints would-be URL when site not deployed`. |
| AC18 — Bundled snapshot | Step 10 (`build-snapshot.mjs`), Step 7 (`snapshot-build.test.ts`) | `cd plugin && npm run snapshot` exits 0; `ls plugin/snapshot/{glossary,tips,skills,news/published,journeys}` returns all five; `vitest run snapshot-build.test.ts` passes `snapshot build copies all five content folders`. |
| AC19 — Audience persists across sessions | Step 5 (`lib/state.ts`), Step 7 (`audience.test.ts`) | `vitest run audience.test.ts` passes `audience preference survives plugin reload from disk`. |
| AC20 — URL builder pure and unit-tested | Step 5 (`lib/url-builder.ts`), Step 7 (`url-builder.test.ts`) | File `plugin/src/lib/url-builder.ts` exists with named export; AC16 tests all pass; module imports zero I/O symbols (`grep -E "fs|net|child_process|fetch" plugin/src/lib/url-builder.ts` returns nothing). |
| AC21 — Graceful not-deployed E2E | Step 6 (`hub-open.ts`), Step 7 (`deployment.test.ts`) | `vitest run deployment.test.ts` passes `commands operate against snapshot when site URL is placeholder`. |
| AC22 — Marketplace manifest valid | Step 3 (`.claude-plugin/marketplace.json`), Step 4 (`marketplace.test.ts`), Step 12 (`claude plugin validate .`) | `vitest run marketplace.test.ts` passes `marketplace.json conforms to required schema`; AND `claude plugin validate .` from repo root reports no errors (captured in `docs/reference/integration-verification-hub-plugin.md`). |
| AC23 — Eleven commands present (rewritten per R-3) | Step 9 (`commands/*.md`), extended `manifest.test.ts` | `ls plugin/commands/*.md \| wc -l` returns 11; `vitest run manifest.test.ts` passes `commands directory contains the exact eleven .md files`. |
| AC24 — README documents 11 commands | Step 11 (`plugin/README.md`) | `grep -E "^#+ /hub" plugin/README.md \| wc -l` returns 11. |
| AC25 — DECISIONS.md entry | Step 13 (`DECISIONS.md`) | `grep "Hub-as-skill plugin ships as Claude Code marketplace plugin" DECISIONS.md` matches and entry is dated. |
| AC26 — SCOPE.md updated | Step 14 (`SCOPE.md`) | `grep -A 1 "Hub-as-skill plugin" SCOPE.md` shows done marker; demo-ability checkboxes show `[x]`. |
| AC27 — No-fallback rule | Step 5 (`lib/config.ts`, `lib/errors.ts`), Step 7 (`config.test.ts`) | `vitest run config.test.ts` passes `throws MissingPluginConfigError when plugin/config.json absent`. |
| AC28 — Frontmatter schema | Step 5 (`lib/frontmatter.ts`), Step 7 (`frontmatter.test.ts`) | `vitest run frontmatter.test.ts` passes `parses canonical frontmatter and rejects malformed entries`; date-coercion test passes (`yaml` engine wired per R-14). |
| AC29 — Tone | Step 11 (`README`), Step 13 (`DECISIONS.md`), Step 9 (`commands/*.md` body wording) | Reviewer-judged in PR description; checklist filed in `docs/reference/integration-verification-hub-plugin.md` per Step 12. No marketing voice, no AI-slop hedging, no emoji-heavy decoration. |

**Coverage check:** All 29 ACs covered. The plan is complete.

---

## 5. Risks and mitigations

Concrete risks for *this plan's execution* (product-design risks are in the investigation §"Risks and mitigations"). Each tied to a step.

| # | Risk | Likelihood | Severity | Tied to step | Mitigation |
|---|---|---|---|---|---|
| P-R1 | The eleven entry-point CLIs drift in stdout shape between commands, breaking the LLM-as-pass-through pattern. | Medium | Medium | Steps 6, 9 | Designer specifies a single output style in `project-design.md` (header line + body block + freshness footer); Coders follow. AC29 reviewer pass catches drift. |
| P-R2 | `noUncheckedIndexedAccess: true` (R-13) trips Coders on `parts[0]`-style access in command argv parsing. | Medium (will hit once) | Low | Steps 5, 6 | Designer prescribes `.at(0)`, length guards, or destructuring. Lint catches at PR review. |
| P-R3 | esbuild bundle includes a Node-builtin without the `node:` prefix and runtime fails on Node 22. | Low | Medium | Step 8 | Designer specifies `node:fs`, `node:path`, `node:child_process` imports throughout. esbuild `--external:none` plus `--target=node22` validates at build. |
| P-R4 | `gray-matter` + YAML 1.1 date coercion breaks news frontmatter round-trips (same wart as pipeline). | Medium | Medium | Step 5 (`lib/frontmatter.ts`), Step 7 (`frontmatter.test.ts`) | R-14: wire `gray-matter` with the explicit `yaml` engine. Frontmatter test covers the date-coercion case. |
| P-R5 | `${CLAUDE_PLUGIN_DATA}` env var absent during `vitest run` (R-5 fallback path). | Medium | Low | Steps 5, 7 | XDG fallback in `lib/state.ts` (`${XDG_DATA_HOME:-$HOME/.local/share}/claude-code/plugins/nbg-ai-hub/`). Tests set a per-test `tmpdir` via `vi.stubEnv('CLAUDE_PLUGIN_DATA', tmp)` for hermeticity. |
| P-R6 | `dist/` and `src/` drift over time because the committed bundles aren't rebuilt before commit. | Medium | Low-medium | Step 8 | Register CI follow-up in `Issues - Pending Items.md` (Step 13): `cd plugin && npm run build && git diff --exit-code dist/`. MVP relies on manual rebuild discipline. |
| P-R7 | `/hub-refresh` mocked git tests pass but real `git pull` fails for users without `gh auth login` or SSH keys (private repo). | Medium | Medium | Step 6 (`hub-refresh.ts`), Step 11 (README) | README documents the prerequisite. AC15 covers the failure surface (error printed verbatim, cache preserved). Optional `refreshUrlSsh` config key registered as follow-up in Step 13. |
| P-R8 | Markdown command files reference `${CLAUDE_PLUGIN_ROOT}` but Claude Code resolves a different env name (drift in spec). | Low | Medium | Step 9 | Manifest test could probe — but the env name is the documented stable contract per investigation §1c. If it drifts, the integration-verification step (Step 12) catches it before publish. |
| P-R9 | Marketplace install via `source: "./plugin"` fails because `plugin/.gitignore` excludes a file Claude Code needs at install time. | Low | Medium | Steps 1, 8 | Verify `.gitignore` ignores only `node_modules/` and `*.tsbuildinfo`. `dist/`, `snapshot/`, `config.json`, `.claude-plugin/`, `commands/`, `README.md` all tracked. Confirm at Step 12. |
| P-R10 | LLM editorializes script output instead of presenting verbatim (Pattern A breakage). | Low-medium | Medium | Step 9 | Each command markdown body ends with a strong instruction ("Present the output above verbatim. Do not add commentary."). Tested manually at Step 12. |
| P-R11 | Empty `tips/` and `skills/` folders (currently `.gitkeep`-only) cause `/hub-tips` or `/hub-skills` to throw. | Low | Low | Step 5 (`lib/snapshot.ts`), Step 6 (`hub-tips.ts`, `hub-skills.ts`) | A16: empty pillar returns "no items in this snapshot yet" without throwing. Designer specifies the empty-state branch; Coders implement. Tests can include an empty-pillar fixture. |
| P-R12 | `journeys/` has only `day-1.md` so AC8's parameterized test for `week-1`, `backend`, `data-scientist`, `ml-engineer` runs against fixtures, not real files. | Medium | Low | Step 7 (`onboard.test.ts`) | Test uses fixture journey files under `plugin/tests/fixtures/snapshot/journeys/`. Real-snapshot smoke at Step 12 covers `day-1` only. AC9 (placeholder graceful) covers the other journeys when their real content is still TBD. |
| P-R13 | Snapshot build at Step 10 copies stale content if run before recent content edits. | Low | Low | Step 10 | `.snapshot-meta.json` `sourceCommit` records the commit SHA at build time, making staleness visible at runtime (NF7 footer). Operators run `npm run snapshot` before publish; tracked in Step 13 as a release-time checklist item. |
| P-R14 | Port 4321 (used by `/hub-open` devMode probe) is occupied by another Claude session in another project. | Low | Cosmetic | Step 6 (`hub-open.ts`) | Per CLAUDE.md → Ports global rule: probe with timeout, report cleanly. The plugin does NOT start a server on 4321 — only probes one. No collision possible. |

---

## 6. Ambiguities for user input

**None — proceed.**

Phase 3a investigation resolved all three design-level corrections (manifest paths, no `commands` array, command-as-LLM-prompt model). The refined request's remaining Open Questions (OQ4 by-role journey slugs, OQ5 marketplace schemaVersion, OQ6 `editor_confidence` surfacing) are deferred and registered in `Issues - Pending Items.md` at Step 13 — none block this plan.

If the Designer or Coders encounter a real ambiguity mid-implementation, the protocol is: stop, append a question to `Issues - Pending Items.md`, ping the user. Do not invent answers.

---

## Concurrent deliverable: `docs/design/project-functions.md`

This plan ships alongside an append to `docs/design/project-functions.md` capturing F1–F18 for the plugin workspace. Step 15 above re-confirms it as a post-build doc step; the *content* is delivered now in the same commit as this plan file's creation.

---

**End of plan-003-hub-plugin.md.**
