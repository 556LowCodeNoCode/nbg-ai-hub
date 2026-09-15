---
language: TypeScript
framework: Astro (site), none (pipeline)
package_manager: npm
build_command: "tsc"
test_command: "vitest run"
lint_command: "eslint \"src/**/*.ts\" \"tests/**/*.ts\""
entry_points:
  - pipeline/src/index.ts
  - site/src/content.config.ts
  - glossary/
  - tips/
  - skills/
  - news/published/
  - journeys/
last_scanned_commit: c73c36d480f112ec6e47d50a94d203ea48979246
scanned_for_request: hub-plugin.md
scanned_at: "2026-05-18T21:30:00Z"
---

# Codebase Scan — NbgAiHub (Hub Plugin Integration Focus)

## 1. Project Overview

NbgAiHub is a TypeScript Node 22 ESM monorepo with two operational workspaces (`pipeline/`, `site/`) and five content directories (`glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`) serving as the single source of truth for a Claude Code knowledge hub. The `pipeline/` workspace is an RSS news curation pipeline built with Vitest 4.x, gray-matter, and Azure OpenAI. The `site/` workspace is an Astro 6.3.5 + Starlight 0.39.2 static site generator that reads the shared markdown content via Astro's glob loaders. The pending `/hub` Claude Code plugin will be the third sibling workspace, reading the same five content directories to expose eleven `/hub-*` commands in-terminal. The project is private, hosted at `github.com/chomovazuzana/NbgAiHub`, and enforces a no-fallback-on-missing-config rule globally.

## 2. Module Map

### Workspaces

- **`pipeline/`** — RSS news curation pipeline (TypeScript, Node 22 ESM, Vitest 4.x)
  - `src/index.ts` — orchestrator: fetch feeds, dedup, Azure OpenAI triage, write markdown, emit PR body
  - `src/types.ts` — 13-key `NewsFrontmatter` type (mirrors `site/src/content.config.ts` news schema)
  - `src/env.ts` — validates four `AZURE_OPENAI_*` env vars; throws `MissingEnvVarError` on missing values (no fallbacks)
  - `src/triage.ts` — Azure OpenAI chat call; emits `editor_confidence` field
  - `src/frontmatter.ts` — builds 13-key YAML block matching the canonical "Shared content shape"
  - 10 additional modules: `config.ts`, `dedup.ts`, `fetch.ts`, `parse.ts`, `fingerprint.ts`, `slug.ts`, `write.ts`, `pr.ts`, `azure-client.ts`, `logger.ts`
  - 93 tests (17 files under `tests/`), all green

- **`site/`** — Astro 6 + Starlight 0.39 static site; serves at `localhost:4321`; production hosting deferred
  - `src/content.config.ts` — authoritative schema: 10-key base shape shared by all pillars, 13-key news shape (adds `editor_confidence`, `source`, `fingerprint`, optional `hero_image`)
  - `src/components/` — 7 Astro components: `HomeHero`, `NewsPanel`, `NewsList`, `AudienceBadge`, `SkillCard`, `AudienceFilter`, `ConfidenceChip`
  - `src/pages/` — 10 pages: Home, Start Here (Day 1 / Week 1), News, Skills, Tips, Glossary, Reference, Contribute, 404
  - No plugin manifest yet

### Content directories (single source of truth for site + plugin)

- **`glossary/`** — 5 term files (`agent.md`, `claudemd.md`, `mcp.md`, `plugin.md`, `skill.md`); each has 10-key frontmatter (`type: glossary`, `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`) plus markdown body
- **`news/published/`** — 8 published news items (as of scan time); files named `YYYY-MM-DD-<slug>.md`; 13-key frontmatter per `NewsFrontmatter` type; emitted by pipeline after editorial review
- **`journeys/`** — 1 file: `day-1.md` (placeholder content "coming soon" with 6-step outline)
- **`tips/`** — empty (`.gitkeep` only)
- **`skills/`** — empty (`.gitkeep` only)

### Repo root metadata

- **`DECISIONS.md`** — append-only decision log; 13 entries as of 2026-05-18; documents "Vitest 4.x" upgrade (line 218), "Shared content shape" schema (line 99), "Hub ships as its own Claude Code skill plugin" (line 134), "Triangle architecture: GitHub repo as CMS + Astro Starlight + Claude Code skill" (line 19), "AI strategy: build-time + Claude skill, not web runtime" (line 157), "Repo visibility: PRIVATE" (line 191)
- **`SCOPE.md`** — mutable project state; last updated 2026-05-18; MVP table shows "Hub-as-skill plugin" as "not started"
- **`CLAUDE.md`** — project-level agent config; imports SCOPE.md; sets tone ("what I wish I knew a year ago"), enforces no-fallback-on-missing-config rule, singular table names

## 3. Conventions

Observed patterns from `pipeline/src/` (the reference workspace for plugin scaffolding):

1. **No fallback values for missing configuration** — `pipeline/src/env.ts:7-14` defines `MissingEnvVarError` thrown when `AZURE_OPENAI_*` env vars are missing/empty; no defaults. Global rule per `CLAUDE.md` line 15. Plugin must mirror this for its config (production URL, snapshot path, persistence file path).

2. **TypeScript strict mode + extended strictness** — `pipeline/tsconfig.json:9-16` enables `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`, `"noFallthroughCasesInSwitch": true`, `"noImplicitReturns": true`. Plugin workspace must match.

3. **Vitest 4.x for tests** — `pipeline/package.json:32` pins `"vitest": "^4.1.6"`. `DECISIONS.md` line 218 documents the upgrade from 2.x due to security advisories. Plugin workspace must use the same framework and version range.

4. **ESLint + @typescript-eslint stack** — `pipeline/package.json:25-28` lists `eslint@^9.0.0`, `@typescript-eslint/eslint-plugin@^8.0.0`, `@typescript-eslint/parser@^8.0.0`, `typescript-eslint@^8.0.0`. No `.eslintrc.json` found (likely flat config mode or inline). Plugin workspace must match versions.

5. **Named error classes for failure semantics** — `pipeline/src/env.ts:7`, `src/index.ts:39`, `src/triage.ts` (MalformedTriageResponseError), `src/fetch.ts` (FeedFetchError), `src/parse.ts` (FeedParseError), `src/config.ts` (ConfigSchemaError) — pattern of explicit named exception classes. Plugin should define `MissingPluginConfigError`, `InvalidAudienceError`, `SnapshotNotFoundError`, etc.

6. **Import style: explicit `.js` extensions in TypeScript** — `pipeline/src/index.ts:23` imports `./types.js`, `./config.js` despite source being `.ts`. Node ESM + `"module": "NodeNext"` requires explicit `.js` in imports. Plugin workspace must follow.

## 4. Integration Points

### In-Scope (plugin reads/uses)

1. **Content directories — five pillars**
   - **Location:** `glossary/*.md`, `tips/*.md`, `skills/*.md`, `news/published/*.md`, `journeys/*.md` (relative to repo root)
   - **Frontmatter schema:** plugin must parse the 10-key base shape defined in `site/src/content.config.ts:44-57` (type, title, audience, topics, internal, authored, last_reviewed, external_link, deeper_link, ai_summary). News items add `editor_confidence` (line 78), `source` (line 80), `fingerprint` (line 81), optional `hero_image` (line 83).
   - **Audience filter semantics:** `audience` values are `"beginner" | "advanced" | "both"` (line 27). Filter logic: `both` shows all; `beginner` shows `beginner` + `both` items; `advanced` shows `advanced` + `both` items. Matches the site's `localStorage.nbgaihub.audience` behavior. Plugin persists this setting to `~/.claude/plugins/nbg-ai-hub/state.json` (per refined request A6).
   - **Topics field:** `topics: string[]` array is filterable — `/hub-skills [topic]` and `/hub-tips [topic]` filter by exact match (case-insensitive) in this array.
   - **Date handling quirk:** `site/src/content.config.ts:34-37` shows Astro's YAML parser auto-converts unquoted `YYYY-MM-DD` strings to JS Date objects (YAML 1.1 behavior). Plugin's frontmatter parser (likely `gray-matter`) must normalize dates — use the `yaml` engine (not `js-yaml`) for round-trip parity per `pipeline/tests/write.test.ts` fix during Vitest 4 upgrade (DECISIONS.md line 224).

2. **Site's content.config.ts — authoritative schema**
   - **Location:** `site/src/content.config.ts`
   - **13-key news shape:** lines 72-84 define the news collection schema mirroring `pipeline/src/types.ts:60-74` (NewsFrontmatter). Plugin's TypeScript types must match — any divergence breaks the single-source-of-truth contract (DECISIONS.md line 99).
   - **Base shape function:** line 44 `baseShape(typeLiteral)` is the DRY helper for the 10 keys shared by all non-news pillars. Plugin can inline an equivalent or import if building a shared schema module.

3. **Workspace conventions from pipeline/**
   - **Node version:** `pipeline/.nvmrc` (if present) or `pipeline/package.json:8` engines field `"node": ">=22"` — plugin workspace must match.
   - **package.json structure:** `"type": "module"` (line 5), `"private": true` (line 4), scripts for `build`, `typecheck`, `lint`, `test` (lines 11-16). Plugin mirrors this.
   - **tsconfig.json:** `pipeline/tsconfig.json` sets `"target": "ES2023"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"outDir": "dist"`, `"rootDir": "src"`. Plugin workspace duplicates these settings.
   - **Test layout:** `pipeline/tests/` holds 17 `.test.ts` files, one per source module plus `orchestrator.test.ts` and `smoke.test.ts`. Plugin should follow `plugin/tests/` with per-command test files.

4. **DECISIONS.md entries bearing on plugin scope**
   - Line 19: "Triangle architecture: GitHub repo as CMS + Astro Starlight + Claude Code skill" — the plugin is the third leg of the triangle.
   - Line 99: "Shared content shape across all pillars" — plugin reads the same 10-key base + 13-key news frontmatter as the site.
   - Line 134: "Hub ships as its own Claude Code skill plugin" — marketplace path is `/plugin marketplace add chomovazuzana/NbgAiHub`.
   - Line 157: "AI strategy: build-time + Claude skill, not web runtime" — plugin commands like `/hub-search` run in the user's Claude session; no separate AI backend.
   - Line 191: "Repo visibility: PRIVATE" — hosting question open (SCOPE.md line 18); plugin's `/hub-open` must handle "site not yet deployed" gracefully.
   - Line 218: "Vitest 4.x" upgrade — plugin uses `"vitest": "^4.1.6"` for consistency.

5. **SCOPE.md "Hub-as-skill plugin" MVP row**
   - Line 53: current status is "not started"
   - Completion criteria: plugin workspace scaffolded, `plugin.json` valid, eleven `/hub-*` commands implemented, all ACs from refined request pass, README documents all commands, DECISIONS.md entry appended, SCOPE.md row flipped to `✅`.

6. **Global ~/.claude config patterns** (not accessible from scan — plugin must align with Claude Code plugin manifest spec v1.x; OQ5 in refined request flags schema version confirmation as an implementation-time concern)

### Out-of-Scope (plugin does not touch)

1. **RSS pipeline internals** (`pipeline/src/triage.ts`, `src/azure-client.ts`, `src/dedup.ts`, etc.) — plugin consumes the emitted markdown in `news/published/`; does not invoke the pipeline or Azure OpenAI.

2. **Site rendering beyond content.config.ts** — `site/src/components/`, `site/src/pages/` are web-UI-specific. Plugin does not import Astro components or layouts.

3. **GitHub Actions workflows** (`.github/workflows/rss-triage.yml`) — plugin operates at runtime in the user's Claude Code session, not in CI.

4. **Config/rss-sources.json** — RSS source list is pipeline-specific; plugin does not read it.

5. **Azure OpenAI credentials** — `AZURE_OPENAI_*` env vars are pipeline-only. Plugin has no Azure dependency.

6. **New content authoring** — plugin reads existing markdown; does not create/edit glossary entries, tips, skills, or journeys. That's the contributor workflow (PR into the repo).

### New Integration Points (plugin introduces)

1. **Plugin manifest files** (greenfield)
   - `plugin/plugin.json` — declares plugin name (`nbg-ai-hub`), version (`0.1.0`), description, and eleven command entries (`/hub`, `/hub-search`, `/hub-skills`, `/hub-tips`, `/hub-news`, `/hub-glossary`, `/hub-onboard`, `/hub-install`, `/hub-audience`, `/hub-refresh`, `/hub-open`)
   - `plugin/marketplace.json` — marketplace entry loadable by `/plugin marketplace add chomovazuzana/NbgAiHub`
   - No existing `plugin.json` or `marketplace.json` at repo root — these are new files for the plugin workspace

2. **Per-user state file** (new persistence layer)
   - **Location:** `~/.claude/plugins/nbg-ai-hub/state.json` (per refined request A6)
   - **Format:** JSON `{ audience: "beginner"|"advanced"|"both", lastJourney: string|null }`
   - **Rationale:** plugin-side audience filter must survive Claude Code session restarts; storing in the repo would cause user-pref collisions on `/hub-refresh`
   - **Plugin behavior:** create parent dir on first write, read on every browse command, throw `MissingPluginConfigError` if not found but expected (adhering to no-fallback rule — though initial bootstrap writes a default; see refined request F12)

3. **Bundled snapshot directory** (new build artifact)
   - **Location:** `plugin/snapshot/` (or equivalent)
   - **Contents:** frozen copies of `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/` at plugin build time
   - **Metadata:** `plugin/snapshot/.snapshot-meta.json` with `{ generatedAt: ISO8601, sourceCommit: <git-sha> }` for freshness footer (refined request NF7, A13)
   - **Build script:** `plugin/scripts/build-snapshot.ts` or `npm run snapshot` copies from repo root into `plugin/snapshot/`

4. **Plugin config file** (new config surface)
   - **Location:** `plugin/config.json` (per refined request A1, A3)
   - **Keys:** `{ productionUrl: string, devMode: boolean, ... }` — production URL defaults to `https://chomovazuzana.github.io/NbgAiHub` (not yet live); `devMode: true` during dev (opens `localhost:4321`), flip to `false` on GH Pages deployment
   - **No-fallback enforcement:** missing `plugin/config.json` at runtime throws `MissingPluginConfigError` (refined request F18, AC27)

5. **User-local cache directory for /hub-refresh** (new git clone location)
   - **Location:** `~/.cache/nbg-ai-hub/snapshot/` (XDG-style; refined request A11)
   - **Mechanism:** first `/hub-refresh` clones the hub repo here; subsequent calls run `git pull`
   - **Atomic replace:** on success, replace `plugin/snapshot/` (or symlink to cache); on failure, preserve prior snapshot and surface error verbatim (refined request F13, AC14, AC15)

## 5. Notes

1. **Empty pillars as of scan time** — `tips/` and `skills/` contain only `.gitkeep` files; plugin commands must handle empty directories gracefully per refined request A16 (return "no tips/skills in this snapshot yet — see /hub-refresh or contribute via PR" without throwing).

2. **Journey content is placeholder** — `journeys/day-1.md` body is "coming soon" skeleton. Plugin's `/hub-onboard day-1` must render the placeholder + a `[content in progress]` note per refined request F10, AC9. By-role journeys (`backend`, `data-scientist`, `ml-engineer`) are named in `SCOPE.md` line 59 as deferred but plugin-supported — OQ4 in refined request flags slug-spelling confirmation during implementation.

3. **No plugin.json at repo root yet** — this is truly greenfield. No existing Claude Code plugin patterns to inherit from within the repo; plugin workspace will establish these patterns.

4. **Site production hosting deferred** — `SCOPE.md` line 18 and `DECISIONS.md` line 191 note that private repo on personal account requires GitHub Pro for Pages. Plugin's `/hub-open` must probe the configured URL and degrade gracefully if site returns 404 or is unreachable (refined request F14, AC17, AC21).

5. **News items carry editor_confidence** — this field (values `high | medium | low`) is editorial metadata from Azure OpenAI triage (refined request line 77-78, `pipeline/src/types.ts:65`). OQ6 asks whether `/hub-news` should surface it in output (e.g., `[confidence: medium]` marker). Not yet decided — flag for planner phase.

6. **Frontmatter date normalization quirk** — `site/src/content.config.ts:34-37` documents the YAML 1.1 auto-Date-conversion issue. Plugin's frontmatter parser (gray-matter) should use the `yaml` engine to avoid round-trip drift with the pipeline's emitter (same fix applied in `pipeline/tests/write.test.ts` during Vitest 4 upgrade).

7. **DECISIONS.md entry for plugin is pending** — refined request AC25 requires a dated entry locking bundled-snapshot + opt-in-refresh model, marketplace distribution path, TypeScript-for-non-trivial policy, audience-filter persistence approach. Not yet written; plugin workstream will append it.

8. **Two sibling workspaces already operational** — `pipeline/` and `site/` are built, tested, green, and documented (`docs/reference/integration-verification-rss-pipeline.md`, `docs/reference/integration-verification-astro-site.md`). Plugin workspace will be the third sibling, following the same `package.json` / `tsconfig.json` / `tests/` layout.
