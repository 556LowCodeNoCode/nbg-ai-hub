---
language: typescript
framework: astro+starlight
package_manager: npm
build_command: cd site && npm run build
test_command: cd pipeline && npm test
lint_command: cd pipeline && npm run lint
entry_points:
  - pipeline/src/index.ts
  - site/src/content.config.ts
  - site/astro.config.mjs
last_scanned_commit: 3a601d24804d71c4bce614ee2144936ede353613
scanned_for_request: personalization-and-contributions.md
scanned_at: 2026-05-18T20:13:32Z
---

# Codebase Scan — NbgAiHub (Personalization & Contributions)

## 1. Project Overview

NbgAiHub is a TypeScript monorepo (informal; no workspaces tooling) containing two independent build artifacts: a **Node 22 ESM pipeline** for daily RSS triage backed by Azure OpenAI, and an **Astro 6 + Starlight 0.39 static site** that renders the curated content. Both enforce TypeScript strict mode with `noUncheckedIndexedAccess: true`. The pipeline uses Vitest 4.x (101 tests across 14 files); the site has no test infrastructure. Content lives in five top-level directories (`news/`, `skills/`, `tips/`, `glossary/`, `journeys/`) consumed by Astro's glob loader pattern. The repo is private (`chomovazuzana/NbgAiHub`), hosted on a personal GitHub account in bootstrap mode. No auth, no backend, no runtime AI — the site is a pure static build. The personalization request will add GitHub OAuth Device Flow + private-gist-backed pinning + submission-form PR automation, all client-side against `https://api.github.com`.

## 2. Module Map

### Top-level layout
```
.
├── pipeline/          → RSS triage: fetch, dedup, Azure OpenAI triage, emit markdown, open editorial PR
├── site/              → Astro 6 + Starlight 0.39; 10 pages, 7 components, 5 content collections
├── .github/workflows/ → rss-triage.yml (daily cron + manual dispatch)
├── config/            → rss-sources.json (5 feeds: 2 Reddit + HN + Wired + Verge)
├── news/              → incoming/ (Action writes) + published/ (editorial promotion target)
├── skills/            → .gitkeep only — catalog TBD; schema extension target for this request
├── tips/              → .gitkeep only
├── glossary/          → 5 seeded terms (claudemd, mcp, skill, plugin, agent)
├── journeys/          → day-1.md placeholder
└── docs/              → design/, reference/, refined-requests/
```

### `pipeline/src/` — RSS orchestrator (15 modules, ESM-only)

| Module | Purpose | Key exports |
|---|---|---|
| `index.ts` | Orchestrator: fetch → dedup → triage → write → PR | `main()` entry point (9877 lines total in the module) |
| `env.ts` | Read/validate AZURE_OPENAI_* env vars, no fallbacks | `readEnv()` → `EnvConfig`, throws `MissingEnvVarError` on missing config |
| `slug.ts` | **Title → kebab-case slug converter (60 char max)** | `slugify(title: string): string`, `resolveSlugCollision()` — **reuse target for submission form per A23** |
| `types.ts` | Shared type aliases (no runtime code) | `NewsFrontmatter` (13 keys), `TriageResult`, `FeedItem`, `EmittedItem` |
| `frontmatter.ts` | Build + serialize NewsFrontmatter to YAML | `buildFrontmatter(EmittedItem): NewsFrontmatter`, `serializeFrontmatter()` uses `yaml` pkg |
| `config.ts` | Load config/rss-sources.json | `loadFeedSources()`, throws `ConfigSchemaError` on invalid shape |
| `fetch.ts` | HTTP fetch wrapper for RSS feeds | `fetchFeed(url: string): Promise<string>`, throws `FeedFetchError` on network failure |
| `parse.ts` | Parse RSS/Atom XML → `FeedItem[]` | Uses `@rowanmanning/feed-parser` v2.1.3 |
| `dedup.ts` | Scan `news/incoming/` + `news/published/` for existing fingerprints | `deduplicate(items, fs)` |
| `fingerprint.ts` | Hash `guid \|\| link \|\| title` → 16-char hex | `makeFingerprint(FeedItem): string` |
| `triage.ts` | Azure OpenAI triage orchestration, source-aware prompts | `triageItems(items[], azureClient): Promise<TriageResult[]>`, 2 prompt variants (Reddit vs major-news) |
| `azure-client.ts` | Azure OpenAI API wrapper | `AzureClient` class, `.chat.completions.create()` |
| `write.ts` | Emit markdown files to `news/incoming/` | `writeItems(emitted[], fs)` |
| `pr.ts` | Generate `pipeline/pr-body.md` + set GH Actions step output | `writePrBody(emitted[], fs)`, `setStepOutput()` |
| `logger.ts` | Console logging helpers | `log()`, `error()`, `warn()` |

### `site/src/` — Astro 6 static site (18 source files)

| Area | Files | Purpose | Key patterns |
|---|---|---|---|
| **Content config** | `content.config.ts` (120 lines) | Zod schemas for 5 content collections | **`baseShape(typeLiteral)` factory** (lines 44–57) — returns the 10 canonical keys shared by all content types. **Skills schema extension target**: `z.object(baseShape('skill'))` at line 90; new fields layer on top via spread. |
| **Components** | 7 `.astro` files under `components/` | Reusable UI building blocks | `AudienceFilter.astro` (79 lines) uses `localStorage.nbgaihub.audience` — **same `nbgaihub.*` key prefix** that auth/pin state will use. `SkillCard.astro` renders skill catalog cards (39 lines) — **pin button insertion point**. |
| **Pages** | 9 route files under `pages/` | `/news`, `/skills`, `/tips`, `/glossary`, `/reference`, `/contribute`, `/start-here/day-1`, `/start-here/week-1` | All use relative imports (`../components/Foo.astro`, `astro:content`). **`/contribute.astro`** (50 lines) is a placeholder describing manual PR flow — **submission form replacement target**. |
| **Lib** | `lib/news.ts` | Shared content query helpers | `getRecentNews(limit?)` uses `getCollection('news')` and sorts by `authored` descending — pattern to replicate for other collections. |
| **Styles** | `styles/custom.css` (134 lines) | Minimal site-specific styles | Class-based (no global resets), covers `.home-hero`, `.news-card`, `.skill-card`, `.audience-badge`, `.confidence-chip`, `.audience-hidden` — **Starlight 0.39 customisation via `customCss` in astro.config.mjs line 18**. |
| **Config** | `astro.config.mjs` (39 lines) | Astro 6 + Starlight integration config | `server: { port: 4321 }`, `sidebar: [...]` 9 entries — **sidebar extension point for "My Pins" link**. |

### `.github/workflows/` — CI automation

- **`rss-triage.yml`** (99 lines) — daily cron (05:00 UTC = 08:00 Athens DST), runs `pipeline/src/index.ts`, opens editorial PR on non-empty result. Permissions: `contents: write`, `pull-requests: write`. **No secrets beyond `GITHUB_TOKEN` + 4 `AZURE_OPENAI_*` secrets**. Pattern to mirror for the new `validate-skill-submission.yml` workflow.

### Content directories (5 collections)

- **`news/published/`** — 43 `.md` files (from triage PR #1, pending merge); each has 13-key frontmatter (type, title, audience, topics, editor_confidence, internal, authored, last_reviewed, external_link, deeper_link, ai_summary, source, fingerprint).
- **`skills/`** — `.gitkeep` only. **Schema extension target**. Current schema: `baseShape('skill')` (10 keys). Request adds 7 more: `install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`, `requires[]`.
- **`tips/`, `glossary/`, `journeys/`** — glossary has 5 seeded `.md` files; others are `.gitkeep` only.

## 3. Conventions

Observed from **`pipeline/src/env.ts:1-47`**, **`pipeline/src/slug.ts:1-52`**, **`site/src/content.config.ts:1-120`**, **`site/src/components/AudienceFilter.astro:1-79`**:

1. **No fallback config (global CLAUDE.md rule).** `pipeline/src/env.ts:24-36` — `readEnv()` throws `MissingEnvVarError` on the first missing/empty var; no defaults. Custom error classes suffixed with `Error` (line 7: `MissingEnvVarError extends Error`). Pattern: fail-loud, no silent substitutions.

2. **Import style is relative, ESM-only, with `.js` extensions in pipeline, none in site.** Pipeline: `import type { EnvConfig } from "./types.js";` (env.ts:5). Site: `import { getCollection } from 'astro:content';` (lib/news.ts:5), `import AudienceBadge from './AudienceBadge.astro';` (SkillCard.astro:6). **No path aliases (`@/*`)**, no barrel exports.

3. **TypeScript strict + `noUncheckedIndexedAccess: true` in both workspaces.** Pipeline `tsconfig.json:8`: `"strict": true, "noUncheckedIndexedAccess": true`. Site `tsconfig.json:3`: `"extends": "astro/tsconfigs/strict", "noUncheckedIndexedAccess": true`. **All new code must conform**.

4. **Kebab-case for filenames, PascalCase for types, camelCase for functions/vars.** `pipeline/src/slug.ts:14` — `export function slugify(title: string)`. `pipeline/src/types.ts:60` — `export type NewsFrontmatter = { ... }`. Component files: `AudienceFilter.astro`, `SkillCard.astro`.

5. **Zod schema layering via factory pattern.** `site/src/content.config.ts:44-57` — `function baseShape(typeLiteral: string)` returns a `const` object of 10 Zod fields. Consumers spread it: `z.object(baseShape('skill'))` (line 90). **Skills schema extension must use this pattern**: `z.object({ ...baseShape('skill'), install_command: z.string(), ... })`.

6. **Client-side state uses `localStorage` with `nbgaihub.*` prefix.** `site/src/components/AudienceFilter.astro:25` — `const KEY = 'nbgaihub.audience';`. Auth token will use `nbgaihub.gh_token`, gist ID will use `nbgaihub.gist_id` per the refined request. **Key namespace is established**.

7. **Vitest 4.x for pipeline tests, file-per-module convention.** 14 test files (`*.test.ts`) mirroring the 15 `src/*.ts` modules. Test count: 101 passing (as of scan time). No site-side tests; `astro check` is the site's type-safety gate. **New validator code (A6) will live in `pipeline/src/validators/skill.ts` + `pipeline/tests/validators/skill.test.ts`**.

8. **Error handling: named custom error classes, no generic `Error()`.** Pipeline has `MissingEnvVarError`, `FeedFetchError`, `ConfigSchemaError` — each a class extending `Error` with a descriptive name. **Auth/gist/submission errors must follow this pattern**: `class GistNotFoundError extends Error`, `class TokenInsufficientScopeError extends Error`, etc.

## 4. Integration Points

### In-Scope: Files & modules the personalization + contributions request will modify or create

#### **A. Site workspace — auth, pinning, submission form**

1. **`site/src/lib/auth.ts`** (new) — Client-side auth module. **Exports:**
   - `getToken(): string | null` — read `localStorage.nbgaihub.gh_token`
   - `signIn(): Promise<void>` — Device Flow orchestration (POST `/login/device/code`, poll `/oauth/access_token`, store token)
   - `signOut(): void` — remove token + gist_id from localStorage
   - `subscribe(callback: (authenticated: boolean) => void): () => void` — reactive auth state propagation (F-P3)
   - **Pattern:** mirror `AudienceFilter.astro:23-78` (inline script with localStorage + event listeners) but as an importable TS module for component reuse.

2. **`site/src/lib/gist.ts`** (new) — Gist read/write client. **Exports:**
   - `discoverGist(token: string): Promise<string>` — `GET /gists`, scan for `nbgaihub-favorites.json`, return gist `id`
   - `createGist(token: string): Promise<string>` — `POST /gists` with `public: false`, empty JSON array
   - `readGist(token: string, gistId: string): Promise<PinRecord[]>` — `GET /gists/<id>`, parse `files['nbgaihub-favorites.json'].content`
   - `writeGist(token: string, gistId: string, pins: PinRecord[]): Promise<void>` — `PATCH /gists/<id>` with full array rewrite
   - **Types:** `type PinRecord = { type: 'news' | 'skill' | 'tip' | 'glossary' | 'journey-step', slug: string, pinned_at: string }`
   - **Pattern:** each function throws a named error on failure (404 → `GistNotFoundError`, 401 → `TokenInvalidError`).

3. **`site/src/lib/submission.ts`** (new) — PR submission orchestrator. **Exports:**
   - `submitSkill(token: string, frontmatter: SkillFrontmatter, body: string): Promise<string>` — returns PR URL
   - Implements F-P12 API sequence (ensure fork → create branch → commit file → open PR)
   - **Depends on:** `pipeline/src/slug.ts` for slug generation — **either import directly (if possible) or duplicate with a note in Issues - Pending Items.md per A23**.
   - **Error handling:** 403 → `TokenInsufficientScopeError`, 422 → `SkillSlugCollisionError`, network → `SubmissionNetworkError`.

4. **`site/src/components/PinButton.astro`** (new) — Pin/unpin affordance. **Props:** `{ type: string, slug: string }`. **Behavior:**
   - When anonymous: renders "Sign in to pin" text + click opens Device Flow modal (via auth module `signIn()`)
   - When authenticated: renders pin icon (filled if pinned, outline if not) + click toggles state optimistically, then calls `gist.writeGist()`. On failure, reverts UI + toasts error.
   - **Pattern:** inline `<script>` like `AudienceFilter.astro:23-78` (reactive to auth state via `auth.subscribe()`).

5. **`site/src/components/AuthHeader.astro`** (new) — Header augmentation for "Sign in" / "Sign out" + avatar. **Integration with Starlight 0.39:**
   - **Option 1 (preferred):** Starlight 0.39 component override via `astro.config.mjs` `components` prop — set `components: { Header: './src/components/AuthHeader.astro' }` to replace the default header. Astro docs: [Starlight component overrides](https://starlight.astro.build/reference/overrides/).
   - **Option 2 (fallback):** Inject via CSS `::before` pseudo-element on `.header` — fragile, not recommended.
   - **A15 investigation:** Starlight 0.39 supports full component replacement via `components` prop. **AuthHeader must wrap Starlight's default `<Header />` and inject auth UI into the top-right corner**.

6. **`site/src/pages/my-pins.astro`** (new) — "My Pins" page at `/my-pins/`. **Behavior:**
   - Anonymous: "Sign in to see your pins" panel (no auth gate at route level — page always renders).
   - Authenticated: client-side script fetches gist → joins `(type, slug)` against build-time JSON index (`/_data/<type>-index.json` per A21) → renders sections for each type with cards.
   - **Depends on:** build-time index generation (see item 8 below) + `gist.readGist()`.
   - **Pattern:** shell HTML + inline `<script type="module">` that fetches data client-side (similar to `AudienceFilter.astro` but with async API calls).

7. **`site/src/pages/submit-skill.astro`** (new) — Skill submission form at `/submit-skill/`. **Behavior:**
   - Anonymous: "Sign in to submit a skill" panel.
   - Authenticated: multi-section form for all required Skill frontmatter fields + markdown body textarea. **Form validation:**
     - Client-side Zod schema matching `site/src/content.config.ts` skills schema (after extension).
     - Live slug preview (computed via `pipeline/src/slug.ts` logic).
     - Slug collision check: `GET /repos/chomovazuzana/NbgAiHub/contents/skills/<slug>.md` → if 200, disable submit + show "slug already exists" error.
   - On submit: calls `submission.submitSkill()` → shows loading spinner → on success, renders PR URL + "View PR" link + "Submit another" button.
   - **No markdown preview** per A16 (deferred).

8. **Build-time JSON index generation** (new) — per A21. **Two options:**
   - **Option A:** Astro integration hook (`astro:build:done`) that emits `public/_data/{news,skills,tips,glossary,journeys}-index.json` — each file is `[{slug, title, audience, topics}, ...]`.
   - **Option B:** Standalone `scripts/build-pin-index.ts` invoked via `"build": "node scripts/build-pin-index.ts && astro check && astro build"` in `site/package.json`.
   - **Recommendation:** Option B (simpler, no integration API surface to learn). Script uses `getCollection()` API (requires `astro sync` to have run first → chain it in `package.json`).

9. **`site/src/content.config.ts`** modification — extend skills schema (lines 88-91). **Current:**
   ```typescript
   const skills = defineCollection({
     loader: glob({ pattern: '*.md', base: '../skills' }),
     schema: z.object(baseShape('skill')),
   });
   ```
   **After extension (7 new fields):**
   ```typescript
   const skills = defineCollection({
     loader: glob({ pattern: '*.md', base: '../skills' }),
     schema: z.object({
       ...baseShape('skill'),
       install_command: z.string().refine(cmd => 
         cmd.startsWith('/plugin marketplace add ') || cmd.startsWith('/plugin install '),
         { message: 'install_command must start with /plugin marketplace add or /plugin install' }
       ),
       skill_id: z.string().regex(/^[a-z0-9-]+$/, 'skill_id must be lowercase alphanumeric + hyphens'),
       origin: z.enum(['internal', 'community', 'external']),
       category: z.enum(['workflow', 'code', 'docs', 'integration', 'productivity', 'testing', 'other']),
       status: z.enum(['active', 'experimental', 'deprecated']),
       maintainer: z.string(), // validated by CI validator, not here
       requires: z.array(z.string()).optional(),
     }),
   });
   ```
   **Impact:** `npm run build` will fail if any `.md` file in `skills/` lacks these fields → forces schema compliance at build time. **Currently `skills/.gitkeep` → no files to validate → build stays green**.

10. **`site/astro.config.mjs`** modification — add "My Pins" to sidebar. **Line 19-36**, append after "Glossary" entry:
    ```javascript
    { label: 'My Pins', link: '/my-pins/' },
    ```
    Result: sidebar will have 10 entries (was 9).

11. **`site/package.json`** — may gain new dependencies:
    - No new deps needed for auth/gist (vanilla `fetch()` + `localStorage`).
    - **If A16 flips to "yes preview"**: add a markdown renderer (e.g. `marked` or `remark`) for submission form preview tab. Currently A16 is "no preview" → no new deps.

#### **B. Pipeline workspace — CI validator**

12. **`pipeline/src/validators/skill.ts`** (new) — TypeScript validator entry point. **Exports:**
    - `validateSkillFile(filePath: string, content: string): ValidationResult` — parses frontmatter, runs all F-P15 validation rules (required fields present, enums valid, `install_command` prefix check, `skill_id` regex, `maintainer` allowlist or GitHub handle, `external_link` HEAD request with 429 tolerance, `authored` / `last_reviewed` date format).
    - `type ValidationResult = { valid: boolean, errors: Array<{field: string, rule: string, message: string}> }`
    - **Depends on:** `gray-matter` (already in pipeline deps line 4 of package.json), `config/maintainers.json` (see item 15 below).
    - **Pattern:** pure validation, no side effects, no console.log (return structured errors instead). Fails on missing `config/maintainers.json` with `ConfigNotFoundError` (no fallback per global CLAUDE.md rule).

13. **`pipeline/src/validators/cli.ts`** (new) — CLI wrapper for GH Actions invocation. **Exports:**
    - `main(args: string[]): Promise<void>` — entry point; expects `node dist/validators/cli.js <file1> <file2> ...`, validates each, prints errors to stdout (one line per error: `<file>:<field>: <rule violated>`), exits 1 if any invalid, 0 if all valid.
    - **Output format:** GitHub Actions [error commands](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message) — `::error file=skills/bad.md,line=1::install_command: must start with /plugin marketplace add`.

14. **`pipeline/tests/validators/skill.test.ts`** (new) — Vitest suite for the validator. **Coverage:**
    - Happy path: well-formed `skills/example.md` → `valid: true, errors: []`.
    - Missing required field: `install_command` absent → error with field name.
    - Invalid enum: `category: 'nonsense'` → enum error.
    - Bad `install_command` prefix: `install_command: 'rm -rf /'` → prefix-mismatch error.
    - Invalid `skill_id` regex: `skill_id: 'Skill_ID!'` → regex error.
    - Invalid `maintainer`: neither GitHub handle nor in allowlist → error.
    - `external_link` 429 rate-limit → warning logged, validation continues, exits 0 (AC20).
    - Missing `config/maintainers.json` → `ConfigNotFoundError` thrown.
    - **Pattern:** 14 existing test files in `pipeline/tests/` use vitest 4.x with `describe`/`it`/`expect`. Match that style.

15. **`config/maintainers.json`** (new) — Maintainer allowlist. **Shape (per F-P16):**
    ```json
    {
      "team_aliases": ["@nbg-ai-team", "@hub-editors"]
    }
    ```
    **Validator rule:** `maintainer` value passes if it matches `^@[A-Za-z0-9][A-Za-z0-9-]{0,38}$` (GitHub handle regex) OR appears in `team_aliases` array.

16. **`pipeline/package.json`** — may need a new script entry for the validator:
    ```json
    "scripts": {
      "validate-skill": "node dist/validators/cli.js"
    }
    ```
    Or leave it implicit (workflow calls `node dist/validators/cli.js` directly). **No new dependencies needed** — `gray-matter` and `yaml` are already present.

#### **C. GitHub Actions — new workflow**

17. **`.github/workflows/validate-skill-submission.yml`** (new) — CI workflow for PR validation. **Triggers:**
    ```yaml
    on:
      pull_request:
        types: [opened, synchronize, reopened]
        paths:
          - 'skills/**/*.md'
    ```
    **Permissions:** `contents: read` only (no write needed; validator just reads PR diff). **Job steps:**
    1. `actions/checkout@v4` with `fetch-depth: 0` (needed to diff against base).
    2. `actions/setup-node@v4` with `node-version-file: pipeline/.nvmrc`, `cache: npm`, `cache-dependency-path: pipeline/package-lock.json`.
    3. `npm ci` + `npm run build` in `pipeline/` working directory.
    4. **Get changed files:** `git diff --name-only ${{ github.event.pull_request.base.sha }} ${{ github.sha }} -- 'skills/*.md'`.
    5. **Run validator:** `node dist/validators/cli.js <changed-files>` (pass the list from step 4).
    6. Exit code 0 → GH Check passes green. Exit code 1 → fails red + error annotations in Files Changed tab.
    - **Pattern:** mirror `rss-triage.yml:1-99` structure (checkout → setup node → install → build → run). Differences: no secrets needed (validator is read-only), no PR creation (validator only posts check results).

#### **D. Documentation — new files + updates**

18. **`docs/reference/gist-contract.md`** (new) — Gist data contract per F-P17. **Sections:**
    - localStorage keys: `nbgaihub.gh_token`, `nbgaihub.gist_id`
    - Gist filename: `nbgaihub-favorites.json`
    - Gist visibility: private (`public: false`)
    - JSON schema (per A12, the request's canonical shape is wrapped in an object): `{"schema_version": 1, "favourites": [{"type":"skill","slug":"create-api","pinned_at":"2026-05-18"}, ...]}`
    - Read protocol: `GET /gists/<id>`, parse `files['nbgaihub-favorites.json'].content`
    - Write protocol: `PATCH /gists/<id>` with full array rewrite (no in-place mutation)
    - Dedup rule: `(type, slug)` is unique; last write wins
    - Idempotency: multiple reads/writes of the same state are safe (no race conditions beyond GitHub's eventual consistency)
    - Error modes: 404 → gist deleted, re-discover; 401 → token revoked, prompt re-auth
    - Privacy callout: "Your pins live in a private gist on your own GitHub account. NbgAiHub does not see or store them."
    - **Claude-side MUST-follow callout:** future `/hub-*` skill MUST use this exact contract (same filename, same key names, same localStorage keys).

19. **`docs/design/project-design.md`** update — new section (or subsection under existing structure) describing:
    - Device Flow sequence diagram (7 steps: POST `/login/device/code` → show user_code → user enters on github.com → site polls `/oauth/access_token` → store token)
    - Gist read/write sequence (discovery → lazy creation → read → write with optimistic UI)
    - `/my-pins/` page wiring (client-side fetch + build-time JSON index join)
    - Submission flow API sequence (5 steps per F-P12: ensure fork → create branch → commit file → open PR → render URL)
    - Validator workflow architecture (PR event → changed-files diff → validator CLI invocation → GitHub Check annotation)
    - Skills schema extension: 7 new fields added to `baseShape('skill')` spread.

20. **`docs/design/project-functions.md`** update — append new `## Personalization & contributions (plan-NNN-personalization)` block listing F-P1..F-P22 with descriptions (not just titles). **Pattern:** existing file has `## RSS pipeline (plan-001)` and `## Astro Starlight site (plan-002)` — this becomes plan-003 (or whatever number the user assigns).

21. **`SCOPE.md`** update — per F-P19, move two entries:
    - Line 73 (current): "Per-user personalization or bookmarking" from "Out of scope — NO" → "MVP scope — IN".
    - Line 63 (current): "Community contributions (PRs from outside the team)" from "Deferred — LATER" → "MVP scope — IN".
    - Add rows to MVP scope table: "Per-user favourites (private-gist-backed)", "Skill submission web form".
    - Add row to demo-ability checklist: "Authenticated user can pin and see pins on /my-pins/".
    - Bump "Last updated" timestamp.

22. **`DECISIONS.md`** append — new dated entry (2026-05-18, or later if implementation starts later) titled "Personalization + community contributions: GitHub-as-backend (Device Flow + private gist + token-scoped PRs)". **Captures:**
    - Reversal of two SCOPE.md entries with reasoning (GitHub-as-backend made the MVP feasible).
    - Architectural choice of Device Flow over web flow (no client secret needed → no serverless function).
    - Choice of private user-owned gist over project-side storage (privacy-first, no server).
    - Choice of OAuth App over GitHub App for MVP (simpler, user-installable; GitHub App fine-grained permissions deferred).
    - Privacy posture: user owns the gist, can revoke token, can delete gist; site never sees pin data server-side.
    - **Status:** accepted.

23. **`Issues - Pending Items.md`** update — add pending items per A26:
    - "Investigate moving from OAuth App to GitHub App with fine-grained permissions (post-MVP, low priority)".
    - "If/when team-wide aggregate stats become desirable, design an opt-in aggregation that respects gist privacy (post-MVP)".
    - "Consider extracting a shared schema package between site and pipeline to retire schema duplication (carries over from astro-starlight-site A4)".
    - **If slug.ts is duplicated instead of imported:** "Deduplicate slug.ts between pipeline and site (currently duplicated due to lack of monorepo tooling)".

24. **`docs/tools/skill-validator.md`** (new, optional but recommended per global CLAUDE.md) — Tool entry documenting the CI validator. **Sections:**
    - Tool name: `skill-validator`
    - Purpose: Enforce frontmatter discipline on `skills/*.md` PRs
    - Entry point: `pipeline/src/validators/cli.ts` → `node dist/validators/cli.js <files...>`
    - Validation rules: (list all F-P15 rules)
    - Exit codes: 0 = valid, 1 = invalid
    - Error format: GitHub Actions error commands (`::error file=...`)
    - Dependencies: `gray-matter`, `config/maintainers.json`
    - Test coverage: `pipeline/tests/validators/skill.test.ts`
    - Invoked by: `.github/workflows/validate-skill-submission.yml`

### Out-of-Scope: Modules unaffected by this request

- **`pipeline/src/index.ts`, `triage.ts`, `azure-client.ts`, `fetch.ts`, `parse.ts`, `dedup.ts`, `write.ts`, `pr.ts`** — RSS orchestrator modules. **No changes**. The validator may reuse `slug.ts`, `types.ts`, `env.ts` patterns, but the triage/PR code is untouched.
- **`.github/workflows/rss-triage.yml`** — daily RSS workflow. **No changes** per constraint (NF-P12 in refined request: "No changes to the existing RSS pipeline behaviour"). The new validator workflow is a sibling, not a modification.
- **`news/`, `tips/`, `glossary/`, `journeys/` content directories** — not modified by this request. Only `skills/` is the target for new entries (via submission form → PR).
- **`site/src/pages/news/`, `site/src/pages/start-here/`, `site/src/pages/reference.astro`, `site/src/pages/glossary.astro`, `site/src/pages/tips.astro`** — existing pages unchanged except for the addition of `<PinButton />` components embedded in card layouts (see next section for embedding points).
- **`site/src/components/HomeHero.astro`, `NewsPanel.astro`, `NewsList.astro`, `AudienceBadge.astro`, `ConfidenceChip.astro`** — existing components unchanged **except** `NewsPanel.astro` and `NewsList.astro` will need `<PinButton />` import + insertion (minor modification, not a rewrite).

### New Integration Points (request introduces capabilities the codebase doesn't currently have)

1. **GitHub OAuth App** — must be registered at `https://github.com/settings/developers` (personal account `chomovazuzana`). **Required fields:**
   - Application name: `NbgAiHub` (or similar)
   - Homepage URL: production site URL (or `http://localhost:4321` for local dev)
   - Authorization callback URL: **not needed for Device Flow** (Device Flow has no redirect; user completes auth on github.com)
   - Requested scopes: `repo` (per A5 in refined request — needed for private repo fork/PR; `public_repo` insufficient)
   - **Result:** `client_id` (public, safe to check in or store in `.env`) — **no client secret** for Device Flow.
   - **Action:** user must register the app and provide `client_id` before implementation phase starts (per A20 in refined request).

2. **`PUBLIC_GH_CLIENT_ID` env var** — Vite/Astro build-time public constant (per A7 in refined request). **Storage:**
   - `site/.env` (gitignored, local dev):
     ```
     PUBLIC_GH_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
     ```
   - Astro exposes it as `import.meta.env.PUBLIC_GH_CLIENT_ID`.
   - Production build: pass via hosting platform's env var UI (Vercel/Netlify/Cloudflare Pages all support this).
   - **Missing-config behavior:** `auth.ts` throws `MissingConfigError` on `getToken()` if `PUBLIC_GH_CLIENT_ID` is undefined (no fallback per global CLAUDE.md rule).

3. **Starlight 0.39 component override mechanism** — per A15 investigation. **Confirmed available:** Starlight 0.39 supports `components` prop in `astro.config.mjs` for full component replacement. **Usage (for AuthHeader):**
   ```javascript
   // site/astro.config.mjs line 14
   starlight({
     title: 'NbgAiHub',
     // ...
     components: {
       Header: './src/components/AuthHeader.astro',
     },
   }),
   ```
   **AuthHeader.astro structure:**
   ```astro
   ---
   import StarlightHeader from '@astrojs/starlight/components/Header.astro';
   // ... auth state logic
   ---
   <StarlightHeader {...Astro.props}>
     <!-- Inject sign-in/sign-out UI into top-right via slot or CSS positioning -->
   </StarlightHeader>
   ```
   - **Pitfall:** Starlight may not expose a named slot for header-right injection. If not, fallback to CSS `position: absolute` on a `<div>` inside the header. Investigation (Phase 3a) will confirm the exact API.

4. **Pin button embedding points** — content cards that currently exist need `<PinButton />` added:
   - `site/src/components/NewsPanel.astro:17` — inside `<article class="news-card">`, after the meta line.
   - `site/src/components/NewsList.astro:15` — same location (NewsPanel and NewsList render the same card shape).
   - `site/src/components/SkillCard.astro:19` — after the `<h3>` heading.
   - `site/src/pages/tips.astro:14` — tips page renders cards inline (no dedicated component yet); add `<PinButton type="tip" slug={entry.id} />` after the title.
   - `site/src/pages/glossary.astro:18` — glossary renders as a long page with anchored sections; add `<PinButton type="glossary" slug={entry.id} />` after each term heading.
   - `site/src/pages/start-here/day-1.astro` (if journey steps are pinnable) — currently a placeholder; defer pin button until content exists.
   - **Per-item pages:** `site/src/pages/news/[slug].astro` — add `<PinButton type="news" slug={entry.id} />` near the top of the article. Skills/tips per-item pages don't exist yet (catalog is empty); defer.

5. **GitHub API endpoints the site will call** (all against `https://api.github.com`):
   - **Device Flow auth:**
     - `POST /login/device/code` (body: `client_id`, `scope`)
     - `POST /login/oauth/access_token` (body: `client_id`, `device_code`, `grant_type: urn:ietf:params:oauth:grant-type:device_code`)
   - **Gist operations:**
     - `GET /gists` (with `Authorization: token <user-token>`)
     - `POST /gists` (body: `{"public": false, "description": "...", "files": {"nbgaihub-favorites.json": {"content": "[]"}}}`)
     - `GET /gists/<id>`
     - `PATCH /gists/<id>` (body: `{"files": {"nbgaihub-favorites.json": {"content": "<json>"}}}`)
   - **Submission flow:**
     - `GET /repos/<user>/NbgAiHub` (check fork exists)
     - `POST /repos/chomovazuzana/NbgAiHub/forks`
     - `GET /repos/<user>/NbgAiHub/git/ref/heads/<default_branch>`
     - `POST /repos/<user>/NbgAiHub/git/refs` (create branch)
     - `PUT /repos/<user>/NbgAiHub/contents/skills/<slug>.md` (commit file)
     - `POST /repos/chomovazuzana/NbgAiHub/pulls` (open PR)
   - **Validator (CI-side only, not site-side):**
     - `HEAD <external_link>` (to verify link reachability; tolerates 429 rate-limit per AC20).
   - **All calls use `fetch()` with `Accept: application/vnd.github+json` header**. No GitHub SDK dependency (site side is static; adding `@octokit/rest` would bloat the bundle).

## 5. Notes

1. **Monorepo without tooling.** Two independent workspaces (`pipeline/`, `site/`) with separate `package.json`, `tsconfig.json`, `node_modules/`. No `npm workspaces`, no `lerna`, no `turbo`. **Implication for A23 (slug reuse):** `site/` cannot import from `pipeline/` without a monorepo setup. **Decision needed:** duplicate `slug.ts` in site (with an Issues item to deduplicate post-MVP) OR set up npm workspaces (adds complexity mid-project). **Recommendation:** duplicate for MVP, track in Issues.

2. **No test infrastructure on site side.** `site/` has no `tests/` directory, no vitest, no test script in `package.json`. `astro check` (TypeScript + Zod validation) is the only gate. **Implication:** new site-side modules (`auth.ts`, `gist.ts`, `submission.ts`) should have unit tests per NF-P11 in refined request. **Two options:**
   - **Option A:** Add vitest to `site/devDependencies` + create `site/tests/`.
   - **Option B:** Move `auth.ts`, `gist.ts`, `submission.ts` into `pipeline/src/` (despite being site-consumed) so they can use pipeline's vitest setup.
   - **Recommendation:** Option A (cleaner separation of concerns). Add `"test": "vitest run"` to `site/package.json`.

3. **Generated code warning.** If any auto-generated files appear in `site/src/` (e.g., `.astro/types.d.ts`), do NOT sample them for conventions in future scans. Currently `.astro/` is gitignored; no risk.

4. **Content collection count discrepancy.** `SCOPE.md` says "5 content collections" (news, skill, tip, glossary, journey-step), but `site/src/content.config.ts` exports **6** collections: the 5 canonical ones + `docs` (Starlight's built-in collection for `src/content/docs/` — backs the homepage). **Clarification:** the 5 canonical collections are the user-facing content; `docs` is infrastructure. Pinning is **only** for the 5 canonical types (per refined request scope).

5. **Cosmetic Zod 4 deprecation.** `site/src/content.config.ts:53` uses `z.string().url()` — Zod 4 deprecated this in favor of `z.url()`. **Not a blocker** (still works), but flagged in SCOPE.md "Deferred — LATER" section line 130: "Cosmetic refactor of Zod 4 deprecations". **Action for this request:** ignore (don't fix unrelated deprecations).

6. **Test count update.** Scan detected 101 passing tests (was 93 in SCOPE.md). **Explanation:** triage tightening (PR #2/#3 per SCOPE.md line 82) added 8 tests for `editor_confidence` field validation. **Updated test file list:** 14 files (was 14), lines ~1584 total.

7. **Starlight dark theme default.** `site/src/styles/custom.css:1-134` defines color classes referencing `--sl-color-*` CSS custom properties. Starlight's dark theme is the default (no `color-mode` override in `astro.config.mjs`). **Implication:** auth UI (sign-in modal, pin buttons) must respect dark-mode colors. Use Starlight's built-in color tokens (`var(--sl-color-text)`, `var(--sl-color-accent)`, etc.) — do NOT hardcode hex colors.

8. **Missing `.nvmrc` in site workspace.** `pipeline/.nvmrc` exists (contains `22` per Node 22 requirement). `site/` has no `.nvmrc`, but `package.json:7` specifies `"engines": { "node": ">=22" }`. **Action:** CI workflow for validator uses `pipeline/.nvmrc` (line 48 of `rss-triage.yml`). No action needed for site (no separate site CI workflow exists; site is built manually or via hosting platform auto-deploy).

---

## Quick Reference: Key File Paths

| Category | File | Line Range | Purpose |
|---|---|---|---|
| **Schema extension target** | `site/src/content.config.ts` | 88-91 | Skills collection schema; spread `baseShape('skill')` and add 7 new fields |
| **Slug reuse source** | `pipeline/src/slug.ts` | 14-32 | `slugify()` function; 60-char max, kebab-case, word-boundary truncation |
| **localStorage key precedent** | `site/src/components/AudienceFilter.astro` | 25 | `const KEY = 'nbgaihub.audience';` — establishes `nbgaihub.*` prefix |
| **Error-handling pattern** | `pipeline/src/env.ts` | 7-15 | `MissingEnvVarError extends Error` — custom error class template |
| **Zod schema factory** | `site/src/content.config.ts` | 44-57 | `baseShape(typeLiteral)` returns 10 canonical fields as a const object |
| **Component import style** | `site/src/components/SkillCard.astro` | 6 | Relative import: `import AudienceBadge from './AudienceBadge.astro';` |
| **Pipeline import style** | `pipeline/src/env.ts` | 5 | Relative ESM import with `.js` extension: `from "./types.js"` |
| **TypeScript strict config (pipeline)** | `pipeline/tsconfig.json` | 8 | `"strict": true, "noUncheckedIndexedAccess": true` |
| **TypeScript strict config (site)** | `site/tsconfig.json` | 2-3 | `"extends": "astro/tsconfigs/strict", "noUncheckedIndexedAccess": true` |
| **Vitest pattern** | `pipeline/tests/env.test.ts` | 1-60 | `describe('readEnv', () => { it('...', () => { expect(...) }) })` |
| **GH Actions workflow pattern** | `.github/workflows/rss-triage.yml` | 1-99 | Cron trigger, permissions, Node setup, build, run, PR creation |
| **Existing sidebar config** | `site/astro.config.mjs` | 19-36 | 9 entries; "My Pins" will be entry #10 after "Glossary" |
| **Custom CSS for Starlight** | `site/src/styles/custom.css` | 1-134 | Class-based styles; use `var(--sl-color-*)` tokens for theme compat |
| **Placeholder contribute page** | `site/src/pages/contribute.astro` | 1-51 | To be replaced with submission form (or move to `/how-to-contribute.astro`) |
