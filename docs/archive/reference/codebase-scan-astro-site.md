---
language: typescript
framework: none
package_manager: npm
build_command: "cd pipeline && npm run build"
test_command: "cd pipeline && npm run test"
lint_command: "cd pipeline && npm run lint"
entry_points:
  - pipeline/src/index.ts
last_scanned_commit: 32f35eac876ef459db9d9d20e18e0158769e7db5
scanned_for_request: astro-starlight-site.md
scanned_at: 2026-05-18T18:15:36Z
---

# Codebase Scan — NbgAiHub (Astro Starlight Site Focus)

## 1. Project Overview

NbgAiHub is a curated Claude Code knowledge hub housed in a private GitHub repository. The project is TypeScript-based with ESM modules and Node 22 LTS. The existing `pipeline/` workspace implements an RSS news triage pipeline (fetch → dedup → Azure OpenAI triage → markdown emit → editorial PR). The pipeline produces markdown files with a canonical 12-key frontmatter shape that will be consumed by the planned Astro Starlight site. The repository uses strict TypeScript configuration, npm for package management, Vitest 4.x for testing, and ESLint 9 with typescript-eslint flat config. The codebase follows kebab-case file naming, PascalCase types, and custom error classes suffixed with `Error`.

## 2. Module Map

### Existing Structure

**`pipeline/`** — RSS news triage workspace (Node 22, ESM, TypeScript strict)
- **`src/`** — 15 TypeScript modules implementing fetch-parse-triage-write-PR orchestration
  - `index.ts` — orchestrator entry point; wires all modules together; CLI runner (275 lines)
  - `types.ts` — shared type aliases: `FeedSource`, `FeedItem`, `TriageResult`, `EmittedItem`, `NewsFrontmatter` (6 types, no runtime code)
  - `frontmatter.ts` — builds and serializes the 12-key frontmatter object from EmittedItem (39 lines, pure functions: `buildFrontmatter`, `serializeFrontmatter`)
  - `slug.ts` — title → kebab-case slug + collision resolution (52 lines, pure: `slugify`, `resolveSlugCollision`)
  - `parse.ts` — XML → normalized `FeedItem[]` via `@rowanmanning/feed-parser` (pure, ~80 lines, `FeedParseError` custom exception)
  - `triage.ts` — Azure OpenAI chat completion per item; JSON-mode response validation (pure logic, ~150 lines, `MalformedTriageResponseError`)
  - `config.ts`, `env.ts`, `dedup.ts`, `fetch.ts`, `fingerprint.ts`, `write.ts`, `pr.ts`, `azure-client.ts`, `logger.ts` (other pipeline modules)
- **`tests/`** — 14 test files, 88 tests total, Vitest runner
- **`vitest.config.ts`** — Vitest 4.x config: node environment, `tests/**/*.test.ts` include pattern, globals off, mocks cleared/restored, `unstubEnvs: true`
- **`eslint.config.js`** — ESLint 9 flat config with typescript-eslint recommended preset; warns on `@typescript-eslint/no-explicit-any`, errors on unused vars (ignores `^_` pattern)
- **`package.json`** — `"type": "module"`, engines `"node": ">=22"`, scripts: `build` (tsc), `start` (node dist/index.js), `typecheck`, `lint`, `test`, `test:watch`
- **`tsconfig.json`** — target ES2023, module NodeNext, strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitOverride` + `noFallthroughCasesInSwitch` + `noImplicitReturns`
- **`.nvmrc`** — `22`

**`config/`** — data-driven feed configuration
- `rss-sources.json` — feed list with `name`, `url`, `enabled` fields

**`news/`** — content folders for pipeline output
- `incoming/` — pipeline writes triaged markdown here (staging area, currently empty with `.gitkeep`)
- `published/` — editor-approved items move here (permanent archive, currently empty with `.gitkeep`)

**`docs/`** — project documentation
- `design/` — `project-design.md` (61KB, full architecture), `plan-001-rss-pipeline.md`, `project-functions.md`
- `reference/` — `code-review-rss-pipeline.md`, `dependency-validation-rss-pipeline.md`, `integration-verification-rss-pipeline.md`, `investigation-rss-pipeline.md`
- `refined-requests/` — `rss-pipeline.md`, `astro-starlight-site.md` (refined spec for the site build)

**`.github/workflows/`** — CI/CD
- `rss-triage.yml` — daily cron 06:00 UTC + workflow_dispatch; runs pipeline in GitHub Actions (Node 22, npm ci, build, triage step, conditional editorial PR creation via `gh pr create`)

**Root files**
- `CLAUDE.md` — project instructions, repo layout, working rules, tone guidance ("what I wish I knew a year ago"), port assignments (site: 4321)
- `SCOPE.md` — mutable MVP scope (auto-imported into CLAUDE.md)
- `DECISIONS.md` — append-only decision log (17KB, 10+ dated decisions including "shared content shape", "Astro Starlight as SSG", "triangle architecture")
- `SECRETS.md` — operator setup checklist for GitHub Action secrets
- `Issues - Pending Items.md` — pending items tracker (global rules)
- `.gitignore` — ignores node_modules, dist, .astro, .cache, .env*, .DS_Store, IDE files

### Not Yet Created (Future Content Folders)

- `skills/` — will hold skill catalog entries (not yet created per scan)
- `tips/` — tips & tricks entries (not yet created)
- `glossary/` — glossary term definitions (not yet created; request specifies ~5 seed terms to be added)
- `journeys/` — onboarding journey markdown (not yet created; request specifies `day-1.md` placeholder to be added)
- `site/` — Astro Starlight workspace (not yet created; the target of this request)

## 3. Conventions

**Import style** (`pipeline/src/index.ts:1-35`, `pipeline/src/frontmatter.ts:1-5`, `pipeline/src/types.ts:1-91`)
- ESM-only. Named imports from local modules with `.js` extension in import path (Node ESM requirement even for `.ts` sources).
- Type-only imports use `import type { ... }` for maximum clarity.
- External imports use named style (`import { parseFeed } from "@rowanmanning/feed-parser"`).
- No default exports observed; all modules export named functions/types.

**Error handling** (`pipeline/src/parse.ts:7-15`, `pipeline/src/triage.ts:11-21`, `pipeline/src/index.ts:39-47`)
- Custom exception classes extend `Error`, always have PascalCase name ending in `Error` (`FeedParseError`, `MalformedTriageResponseError`, `AllFeedsFailedError`).
- Public readonly properties capture context (e.g., `feedName: string`, `rawPayload: string`, `issue: string`).
- Constructor signature: `constructor(contextArgs, cause?)` with explicit `this.name = "ClassName"`.
- Orchestrator catches typed errors, logs structured warnings, and continues or propagates based on severity.

**Code style** (`pipeline/src/slug.ts:1-52`, `pipeline/src/frontmatter.ts:1-40`)
- **Semicolons:** no trailing semicolons (TypeScript convention).
- **Naming:** files are kebab-case (`frontmatter.ts`, `azure-client.ts`), types are PascalCase (`NewsFrontmatter`, `EmittedItem`), functions are camelCase (`buildFrontmatter`, `slugify`).
- **Pure functions explicitly documented:** many modules contain top-of-file comment "Pure: no I/O" or "Pure. See project-design.md §X".
- **Exported constants:** SCREAMING_SNAKE_CASE (`SLUG_MAX_LENGTH`, `DEFAULT_TRIAGE_TEMPERATURE`, `SYSTEM_PROMPT`).
- **Config loading:** throws explicit exceptions when required config is missing — **no fallback values** per CLAUDE.md global rules and observable pattern in `env.ts`, `config.ts`.

**Logging and structured output** (`pipeline/src/index.ts:83-271`)
- Structured JSON logging via `logger.info(eventName, { ...context })`, `logger.warn(...)`, `logger.error(...)`.
- GitHub Actions step outputs set via dedicated function (`setStepOutput("new_items", "true|false", ...)`).
- No `console.log` calls observed; all logging goes through `Logger` interface.

**Testing** (`pipeline/vitest.config.ts:1-12`, `pipeline/tests/` directory)
- Vitest 4.x; test files named `*.test.ts` in `tests/` directory (not colocated with source).
- Config: `environment: "node"`, `globals: false` (explicit imports), `clearMocks: true`, `restoreMocks: true`, `unstubEnvs: true`.
- Fixtures in `tests/fixtures/` subdirectory.

## 4. Integration Points

**Request-driven narrowing applied.** Focus areas: existing `pipeline/` conventions to mirror in `site/`; canonical frontmatter shape; content folder layout; CI workflow structure; test patterns.

### In-Scope for Site Build

**Frontmatter schema** (`pipeline/src/types.ts:54-67`, `pipeline/src/frontmatter.ts:14-28`)
- **Canonical 12 keys for news content:** `type` (always `"news"`), `title`, `audience` (`"beginner" | "advanced" | "both"`), `topics` (string array), `internal` (always `false`), `authored` (YYYY-MM-DD string), `last_reviewed` (YYYY-MM-DD string), `external_link` (string | null), `deeper_link` (always `null`), `ai_summary` (string), `source` (feed name string), `fingerprint` (string hash).
- News-specific extras: `source`, `fingerprint` (not present in general shared shape per DECISIONS.md, but required for news per `NewsFrontmatter` type).
- Forward-compatible optional: `hero_image` (string URL, optional, not yet emitted by pipeline but site should accept per request AC4 + A16).
- **Site's `content.config.ts` must duplicate this schema in Zod** (no shared TypeScript module per request A4). Schema drift risk acknowledged; duplication is MVP trade-off.

**Content folder paths** (existing: `news/incoming/`, `news/published/`; to be created: `skills/`, `tips/`, `glossary/`, `journeys/`)
- Site's Astro 5 `glob()` loader will read from `../news/published/*.md`, `../skills/*.md`, `../tips/*.md`, `../glossary/*.md`, `../journeys/*.md`.
- No conflicts detected; folders currently empty (`.gitkeep` files only in `news/` subfolders).

**TypeScript config conventions** (`pipeline/tsconfig.json`)
- Site should mirror: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"esModuleInterop": true`, `"forceConsistentCasingInFileNames": true`, `"resolveJsonModule": true`, `"skipLibCheck": true`.
- Target ES2023 or equivalent; module `NodeNext` for pipeline (Astro uses own module resolution so site's `tsconfig.json` will extend Starlight's recommended config instead).

**Package.json conventions** (`pipeline/package.json`)
- `"type": "module"`, `"engines": { "node": ">=22" }`.
- Standard scripts: `build`, `typecheck`, `lint`, `test` (if applicable).
- Site should add: `dev` (astro dev --port 4321), `preview` (astro preview).

**ESLint config** (`pipeline/eslint.config.js`)
- ESLint 9 flat config with typescript-eslint.
- Site can reuse the same pattern if linting is configured (Astro projects often skip eslint in MVP and rely on `astro check`).

**Vitest config** (`pipeline/vitest.config.ts`)
- If site adds any utility tests (e.g., slug helpers, schema validation helpers), reuse Vitest 4.x with similar config.
- Request A9 explicitly defers component tests, so `test` script may be omitted from site MVP.

**CI workflow pattern** (`.github/workflows/rss-triage.yml`)
- Workflow structure: checkout with `fetch-depth: 0`, setup Node 22 via `.nvmrc`, `npm ci`, `npm run build`, run script, conditional step gated on output.
- Permissions: `contents: write`, `pull-requests: write` (minimal required set per investigation).
- Concurrency control: single group name, `cancel-in-progress: false`.
- Site does NOT need a deploy workflow yet (deployment deferred per request A17), but future workflow can follow this pattern.

**Naming conventions** (observed across `pipeline/src/`)
- Files: kebab-case (`frontmatter.ts`, `azure-client.ts`).
- Types/interfaces: PascalCase (`NewsFrontmatter`, `EmittedItem`, `TriageResult`).
- Functions: camelCase (`buildFrontmatter`, `slugify`, `triageItem`).
- Custom errors: PascalCase + `Error` suffix (`FeedParseError`, `MalformedTriageResponseError`).
- Site components should follow same pattern: PascalCase for `.astro` component filenames (`HomeHero.astro`, `AudienceBadge.astro`).

**No fallback values rule** (`pipeline/src/env.ts`, `pipeline/src/config.ts` observable behavior)
- Missing required config throws explicit exception.
- Site's Zod schemas must be strict; invalid frontmatter must fail `astro check` and `npm run build` with named-file error (request AC18, NF8).

### Out-of-Scope (Modules Site Does NOT Interact With)

- **Pipeline runtime logic** (`pipeline/src/fetch.ts`, `parse.ts`, `triage.ts`, `dedup.ts`, `write.ts`, `pr.ts`, `azure-client.ts`, `logger.ts`) — site reads pipeline output (markdown files) but never calls into pipeline code at runtime. Coder does NOT need to modify these modules.
- **RSS workflow** (`.github/workflows/rss-triage.yml`) — no changes needed; site build is separate workstream.
- **Config files** (`config/rss-sources.json`) — pipeline-specific, not site input.
- **Pipeline tests** (`pipeline/tests/`) — no site dependency on pipeline test fixtures or test helpers.

### New Integration Points (Site-Specific, Not in Codebase Yet)

- **`site/` workspace** — new sibling to `pipeline/` at repo root; own `package.json`, `node_modules/`, `tsconfig.json`.
- **Astro 5 + Starlight** — new dependencies (`astro ^5.x`, `@astrojs/starlight ^0.x` per request A1, A2).
- **Content collections** — `site/content.config.ts` defines 5 collections with Zod schemas mirroring frontmatter shape; `glob()` loaders point at `../news/published/`, `../skills/`, `../tips/`, `../glossary/`, `../journeys/`.
- **Custom components** — `site/src/components/HomeHero.astro`, `NewsPanel.astro`, `NewsList.astro`, `AudienceBadge.astro`, `SkillCard.astro`, `AudienceFilter.astro` (6 components per request F12).
- **Sidebar config** — `site/astro.config.mjs` defines 9 sidebar entries per request F3 and A11.
- **Custom CSS** — minimal (~100 lines per request A6): hero layout, news card styling, audience badge colors (Beginner green #0a7, Advanced orange #e60, Both blue #08c per request A7).
- **Empty-state fallbacks** — each collection page renders "No items yet. See [Contribute](/contribute) for how to add one." when source folder is empty (request F9, A8).
- **Client-side filter** — `AudienceFilter.astro` contains `<script>` block reading checkboxes, toggling DOM visibility via `data-audience` attribute, persisting state to `localStorage` (request F10, A12).
- **Seed content folders** — `skills/.gitkeep`, `tips/.gitkeep`, `glossary/claudemd.md` + 4 others, `journeys/day-1.md` placeholder (request A15, F8).

## 5. Notes

- **Monorepo without monorepo tooling.** Two independent workspaces (`pipeline/`, `site/`) with separate `package.json` and `node_modules/`. No shared TypeScript module for frontmatter schema (request A4 explicitly documents this trade-off: duplication is accepted to avoid cross-workspace TS import complexity in MVP). Future refactor possible if drift becomes painful.
- **Content folders not yet created.** `skills/`, `tips/`, `glossary/`, `journeys/` do not exist yet. Site build must account for empty source folders (request F9). `news/published/` exists but is currently empty (`.gitkeep` only); pipeline PR #1 will populate it.
- **Strict TypeScript everywhere.** Pipeline uses `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, multiple additional strict flags. Site should match this rigor per request NF2.
- **No test coverage on entry points yet.** Pipeline has 88 tests for utilities (slug, fingerprint, parse, triage, config, env, dedup, fetch, write, PR, Azure client) but `index.ts` orchestrator is not unit-tested (tested via integration verification runs). Site will have no component tests in MVP per request A9; verification is via `astro check`, `npm run build`, and manual click-through.
- **GitHub Actions concurrency model.** Workflow uses `concurrency: { group: rss-triage, cancel-in-progress: false }` so that queued runs complete their PR rather than being killed mid-push. Site build workflow (when added later) should consider similar pattern if PR creation is involved.
- **Port management.** CLAUDE.md declares port 4321 for site dev server (Astro default); no collision with pipeline (pipeline has no dev server, only CLI runner). Global port rules apply: check `lsof -i :4321` before starting, increment within band 4322–4329 if occupied.
- **Tone and voice consistency.** All hand-authored content (Reference page, Contribute page, Day 1 journey placeholder) must carry "what I wish I knew a year ago" tone per CLAUDE.md working rule. Opinionated, plainspoken, no AI-slop hedging, no marketing voice. This is a team field manual, not a vendor doc site.

---

**End of scan.** Downstream Designer agent can extract required schema keys, build command, test command, sidebar structure, and component list from this document. Downstream Coder agent can reference frontmatter shape, TS config, naming conventions, and error handling patterns when implementing the site workspace.
