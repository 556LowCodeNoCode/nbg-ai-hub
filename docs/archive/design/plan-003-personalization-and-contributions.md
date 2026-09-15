# Plan 003 — Personalization & Community Contributions

**Refined request:** `docs/refined-requests/personalization-and-contributions.md` (31 ACs, 26 assumptions, 21-item DoD)
**Investigation:** `docs/reference/investigation-personalization.md` (pivot to Option C applied; read banner + "Option C Implementation Notes")
**Codebase scan:** `docs/reference/codebase-scan-personalization.md` (24 integration points)
**Created:** 2026-05-18

This plan sequences the implementation of per-user favourites + community-contribution submission for NbgAiHub under the **Option C** architecture (PAT-paste auth + unlisted-gist-per-user + URL-redirect submissions + CI validator). It owns *sequencing, dependencies, files-to-modify, and verification criteria*. Architecture, interfaces, function signatures, Zod refinement details, error-class hierarchy, and Astro component contracts are deferred to Phase 5 (Designer) — `project-design.md` "Personalization architecture" section.

---

## 1. Plan summary

We are adding **two user-facing capabilities** to the existing static Astro site, both backed by GitHub itself (no servers, no proxies, no runtime AI):

1. **Per-user favourites.** A "Sign in" affordance in the Starlight header opens a modal where the user pastes a **classic GitHub PAT with `gist` scope only**. The token is validated against `GET https://api.github.com/user` (CORS-enabled), stored in `localStorage` under `nbgaihub.gh_token`, and used to read/write a single unlisted gist `nbgaihub-favorites.json` per user. Pins live in `{schema_version:1, favourites:[{type, slug, pinned_at}, …]}`. A **`/my-pins/` page** joins gist records against a **build-time pin index** at `public/_data/<type>-index.json` to render titles/audience/topics. Read-modify-write on every pin (last-write-wins; two-tab race acceptable for MVP).
2. **Community contributions.** A **`/submit-skill/` form** (anonymous-accessible, no PAT required) collects all 17 Skill frontmatter fields + body, serialises the result to a YAML-frontmatter markdown string, URL-encodes it, and redirects to `github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=<encoded>` in a new tab. GitHub's editor opens with the file pre-filled and handles fork/branch/PR mechanics natively. A **CI validator** (`pipeline/src/validators/skill.ts` invoked by `.github/workflows/validate-skill-submission.yml`) enforces all 17 frontmatter fields on every PR touching `skills/*.md`.

**Architectural shape:** static Astro 6 + Starlight 0.39 site → vanilla `fetch` against `https://api.github.com` (no SDK) → unlisted gist as KV store; anonymous browser → URL redirect to GitHub's UI for writes; CI runs TypeScript validator on PRs from forks under `pull_request` (read-only `GITHUB_TOKEN`). All new code is **TypeScript strict + `noUncheckedIndexedAccess`**, ESM-only. No fallback values for missing configuration (per global CLAUDE.md).

## 2. Out-of-scope statement (re-stated from refined request)

So the Coders do not drift, the following are **explicitly out of scope** for plan-003:

- The Claude-side `/hub-*` skill. Plan-003 delivers the data contract and the web reader/writer only.
- OAuth App / Device Flow / Cloudflare Worker proxy. Removed by the 2026-05-18 pivot.
- Browser-side write APIs for submissions (no `POST /forks`, no `PUT /contents`, no `POST /pulls` from the hub).
- Aggregated team-wide stats ("most pinned", "trending skills").
- Backend search / personalised recommendations.
- Pinning UX for non-content pages (homepage, `/reference`, `/contribute`).
- Editing or deleting existing skills via the web form (new entries only).
- Multi-account support (signing in as more than one GitHub identity simultaneously).
- Server-side rate limiting, abuse mitigation, anti-spam.
- Pin order persistence beyond `pinned_at` sort.
- Pinning gating by `audience` or `internal` flag.
- In-browser markdown preview for the submission form.
- Bumping Astro, Starlight, Node, or Vitest versions as a side effect.

## 3. Phase / step breakdown

Steps are numbered in execution order. Each step lists **outcome / files / deps / verification / parallelisable?**. Parallelism is keyed off file ownership: two coders MUST NOT modify the same file simultaneously. Steps tagged **"parallel-safe with [set]"** can run concurrently within the same wave once their declared dependencies are satisfied.

### Wave A — Foundations (must complete before any other work)

#### Step 1 — Extend Skills frontmatter schema in `site/src/content.config.ts`

- **Outcome:** the `skills` collection accepts the 7 new required fields (`install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`, `requires?`) on top of `baseShape('skill')`, and `astro check` exits 0 against the (currently empty) `skills/` directory.
- **Files modified:** `site/src/content.config.ts` (lines 88–91 region; spread `baseShape('skill')` and add the 7 fields per codebase scan §I.9).
- **Dependencies:** none.
- **Verification:** `cd site && astro check` exits 0. `grep -E 'install_command|skill_id|origin|category|status|maintainer|requires' site/src/content.config.ts` returns 7+ hits. (AC26)
- **Parallel-safe with:** Step 2, Step 3, Step 4, Step 6, Step 7, Step 8, Step 9, Step 14 (different files).

#### Step 2 — Create `config/maintainers.json` with the documented shape

- **Outcome:** `config/maintainers.json` exists at repo root with `{"team_aliases": ["@nbg-ai-team", ...]}` and at least one seeded alias.
- **Files created:** `config/maintainers.json`.
- **Dependencies:** none.
- **Verification:** file exists; `jq '.team_aliases | length' config/maintainers.json` ≥ 1. (AC27)
- **Parallel-safe with:** Step 1, Step 3, Step 4, Step 6, Step 7, Step 8, Step 9, Step 14.

#### Step 3 — Add Vitest to `site/` workspace

- **Outcome:** `site/package.json` gains `vitest` (matching pipeline's `^4.x`) under `devDependencies`, plus `"test": "vitest run"` and `"test:watch": "vitest"` scripts. A minimal `site/vitest.config.ts` is added (default node env). `site/tests/.gitkeep` placeholder added.
- **Files created:** `site/vitest.config.ts`, `site/tests/.gitkeep`.
- **Files modified:** `site/package.json` (devDependencies + scripts).
- **Dependencies:** none.
- **Verification:** `cd site && npm install` clean (no deprecation warnings — NF-P13); `cd site && npm test` exits 0 with "no test files" (or 0-passed). (Enables NF-P11.)
- **Parallel-safe with:** Step 1, Step 2, Step 4, Step 6 (does not touch `content.config.ts`, `maintainers.json`, or `pipeline/`).

#### Step 4 — Duplicate `slug.ts` into `site/src/lib/slug.ts` with drift test

- **Outcome:** `site/src/lib/slug.ts` exports the same `slugify(title: string): string` function as `pipeline/src/slug.ts`. A drift test in `site/tests/slug.test.ts` asserts byte-for-byte parity on a fixture table of ≥ 10 title/slug pairs (mirroring the pipeline's existing slug fixtures).
- **Files created:** `site/src/lib/slug.ts`, `site/tests/slug.test.ts`.
- **Dependencies:** Step 3 (vitest must be wired in `site/`).
- **Verification:** `cd site && npm test -- slug` passes ≥ 10 fixture assertions. (Feeds AC14 + AC15.)
- **Parallel-safe with:** Step 1, Step 2, Step 6, Step 7, Step 8, Step 9, Step 14 (independent file set).
- **Issues - Pending Items.md item added:** "Site — slug.ts duplicated from pipeline. Deduplicate when monorepo tooling lands." (per A23).

### Wave B — Core libraries (depend on Wave A; can run in parallel inside Wave B)

#### Step 5 — Build pin index generator script

- **Outcome:** `site/scripts/build-pin-index.ts` reads every `*.md` file under each of the 5 content folders (`../news/published/`, `../skills/`, `../tips/`, `../glossary/`, `../journeys/`) at build time and emits one file per type at `site/public/_data/<type>-index.json` whose shape is an array of `{slug, title, audience, topics}` (exact shape designed in Phase 5). The `site/package.json` `"build"` script is updated to chain `tsx scripts/build-pin-index.ts && astro check && astro build` (R-3 hardening from plan-002 preserved). A unit test in `site/tests/build-pin-index.test.ts` exercises the script against a fixture content tree.
- **Files created:** `site/scripts/build-pin-index.ts`, `site/tests/build-pin-index.test.ts`.
- **Files modified:** `site/package.json` (scripts).
- **Dependencies:** Step 3 (vitest), Step 1 (schema extension — script reads canonical frontmatter shape).
- **Verification:** after `npm run build`, `site/dist/_data/news-index.json`, `…/skills-index.json`, `…/tips-index.json`, `…/glossary-index.json`, `…/journeys-index.json` all exist; each parses as a JSON array; `jq 'length' <each>` ≥ 0 (≥ 1 for `news-index.json` if `news/published/` is non-empty). (DoD #2 evidence.)
- **Parallel-safe with:** Step 6, Step 7, Step 8, Step 9, Step 14 (different files).

#### Step 6 — Build the auth module (`site/src/lib/auth.ts`)

- **Outcome:** a pure TS module exposing `getToken()`, `getUser()`, `signIn(token)`, `signOut()`, and `subscribe(callback)`. `signIn(token)` validates against `GET https://api.github.com/user` with `Authorization: token <token>`; on 200, stores `nbgaihub.gh_token` + `nbgaihub.gh_user` in `localStorage` and notifies subscribers; on 401, throws a named `TokenInvalidError`; on other status, throws `TokenValidationError` with the response status/message. `signOut()` clears `nbgaihub.gh_token`, `nbgaihub.gh_user`, and `nbgaihub.gist_id`. No fallback config — there is no required env var for auth (the GitHub endpoint is hardcoded at `api.github.com` per NF-P2 note in refined request). Unit tests in `site/tests/auth.test.ts` cover: valid token → stored; invalid → `TokenInvalidError`; sign-out clears all three keys; `subscribe` fires on `signIn` / `signOut`; fetch is intercepted to assert the only outbound `Authorization` header goes to `api.github.com` (AC23).
- **Files created:** `site/src/lib/auth.ts`, `site/tests/auth.test.ts`.
- **Dependencies:** Step 3 (vitest).
- **Verification:** `cd site && npm test -- auth` exits 0 with all named tests passing. AC1, AC2, AC3, AC23 verifiable from these tests + the UI integration that follows.
- **Parallel-safe with:** Step 4, Step 5, Step 7, Step 8, Step 9, Step 14.

#### Step 7 — Build the gist client (`site/src/lib/gist.ts`)

- **Outcome:** a pure TS module exposing discovery (`GET /gists` paginated, find first whose `files` contains `nbgaihub-favorites.json`), lazy creation (`POST /gists` with `public: false`), read (`GET /gists/<id>`), and read-modify-write `pin` / `unpin` operations. The wrapped JSON shape (`{schema_version:1, favourites:[…]}`) is parsed defensively (absence of `schema_version` is treated as `1` with a one-time `console.warn` — AC22). Dedup is by `(type, slug)`. Named errors: `GistNotFoundError` (404 on a known id triggers re-discovery), `TokenInvalidError` (401 — bubbles up to `auth.ts` to clear state per OQ4), `RateLimitedError` (429). Unit tests in `site/tests/gist.test.ts` cover: discovery happy path; lazy create issues `POST /gists` with `public:false` (AC5); read-modify-write performs `GET + PATCH` (AC6); unpin's PATCH omits the targeted record (AC7); every write conforms to the wrapped JSON schema (AC21); a legacy gist without `schema_version` is read as v1 with one warning (AC22).
- **Files created:** `site/src/lib/gist.ts`, `site/tests/gist.test.ts`.
- **Dependencies:** Step 3, Step 6 (gist client consumes `getToken()`).
- **Verification:** `cd site && npm test -- gist` passes all named tests. AC5, AC6, AC7, AC21, AC22 covered.
- **Parallel-safe with:** Step 4, Step 5, Step 8, Step 9, Step 14.

#### Step 8 — Build submission serialiser + URL builder + clipboard fallback (`site/src/lib/submission.ts`)

- **Outcome:** a pure TS module that (a) serialises a `SkillFrontmatter` + body to a YAML-frontmatter markdown string in a stable canonical key order (designed in Phase 5), (b) builds the `github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=<encoded>` URL, (c) chooses direct-redirect vs clipboard-fallback at the **7000-char URL length cutoff** (A4), (d) performs the slug-collision pre-check via unauthenticated `GET https://api.github.com/repos/chomovazuzana/NbgAiHub/contents/skills/<slug>.md` (200 → collision, 404 → free, 403/429/network → non-blocking warning). Unit tests in `site/tests/submission.test.ts` cover: serialiser emits stable canonical key order; URL builder URL-encodes correctly; the 7000-char threshold switches branches (AC12); slug collision pre-check (200/404/429 paths — AC15); install_command validation surfaces inline error for non-allowed prefixes (AC13); skill_id regex error (AC14).
- **Files created:** `site/src/lib/submission.ts`, `site/tests/submission.test.ts`.
- **Dependencies:** Step 3, Step 4 (uses `slug.ts`).
- **Verification:** `cd site && npm test -- submission` passes all named tests including AC12, AC13, AC14, AC15.
- **Parallel-safe with:** Step 5, Step 6, Step 7, Step 9, Step 14.

#### Step 9 — Build CI validator (`pipeline/src/validators/skill.ts` + CLI)

- **Outcome:** TypeScript validator at `pipeline/src/validators/skill.ts` exporting `validateSkillFile(filePath, content): ValidationResult`. Uses `gray-matter` (already in pipeline deps) for frontmatter parsing. Loads `config/maintainers.json` at process start; throws a named `ConfigNotFoundError` (no fallback) if missing per NF-P2. Validates per spec §1.4 (all 17 fields present; enum values; `install_command` prefix allowlist; `skill_id` regex; `maintainer` GH-handle regex OR allowlist; `authored` / `last_reviewed` YYYY-MM-DD; file path matches `skills/<slug>.md` where `<slug> === skill_id`). Validates `external_link` via `HEAD` with 10s timeout; HTTP 429 → log warning, do not fail (AC20). A sibling `pipeline/src/validators/cli.ts` is the GH Actions entry point — reads file paths from argv, prints `::error file=...,line=1::<field>: <rule>` annotations, exits 1 on any invalid file, 0 if all valid. Tests at `pipeline/tests/validators/skill.test.ts` cover: happy path (AC16); missing `install_command` (AC17); `category: nonsense` (AC18); `install_command: rm -rf /` (AC19); 429 on `external_link` (AC20); missing `config/maintainers.json` → `ConfigNotFoundError`.
- **Files created:** `pipeline/src/validators/skill.ts`, `pipeline/src/validators/cli.ts`, `pipeline/tests/validators/skill.test.ts`, `pipeline/tests/validators/fixtures/valid-skill.md`, `pipeline/tests/validators/fixtures/missing-install-command.md`, `pipeline/tests/validators/fixtures/bad-category.md`, `pipeline/tests/validators/fixtures/bad-install-command.md`.
- **Dependencies:** Step 2 (`config/maintainers.json` must exist).
- **Verification:** `cd pipeline && npm test` exits 0; total test count goes from 101 → 101 + (new tests count); typecheck clean. AC16–AC20 covered.
- **Parallel-safe with:** Step 5, Step 6, Step 7, Step 8, Step 14 (different files).

### Wave C — UI components & pages (depend on Wave B libs)

#### Step 10 — Sign-in modal + `SocialIcons` slot override (`site/src/components/SignIn.astro` + `SocialIconsOverride.astro`)

- **Outcome:** a new Astro component overrides Starlight 0.39's `SocialIcons` slot (NOT `Header` — R6 from investigation) to render a "Sign in" button when anonymous and a `user @login` chip + "Sign out" button when authenticated. Clicking "Sign in" opens a native `<dialog>` modal (per investigation refs 17–18) with the PAT-paste UX copy from the investigation's §5 draft. Modal: explainer text, deep-link to `https://github.com/settings/tokens/new?scopes=gist&description=NbgAiHub` (target=_blank), password-style input, "Validate & sign in" button. On submit, calls `auth.signIn(token)`; on success, closes modal and triggers re-render via `auth.subscribe`. `astro.config.mjs` is updated with `components: { SocialIcons: './src/components/SocialIconsOverride.astro' }`.
- **Files created:** `site/src/components/SignIn.astro`, `site/src/components/SocialIconsOverride.astro`.
- **Files modified:** `site/astro.config.mjs` (add `components` override per investigation R6).
- **Dependencies:** Step 6 (`auth.ts`).
- **Verification:** `cd site && astro check` exits 0; `cd site && npm run build` exits 0; `dist/index.html` contains the sign-in markup; manual smoke test (DoD #18 entry) confirms modal opens, invalid token → 401 error inline, valid token → modal closes + header updates. AC1, AC2, AC3 evidence.
- **Parallel-safe with:** Step 11, Step 12 (different files); SERIALISES with Step 14 (both touch `astro.config.mjs`) — Step 10 must finish before Step 14, OR they must coordinate edits.

#### Step 11 — Pin button component (`site/src/components/PinButton.astro`)

- **Outcome:** a reusable `<PinButton type="news" slug={entry.id} />` component renders a state-aware pin button per F-P7. When anonymous (per A10), renders "Sign in to pin" CTA that opens the sign-in modal via `auth.signIn()` flow. When authenticated, renders an icon button; click optimistically toggles UI state then calls `gist.pin()` / `gist.unpin()`; on failure, reverts UI and surfaces a toast. Reacts to `auth.subscribe()` for re-render on sign-in / sign-out. Embeds into existing cards via insertion points listed in Step 12 below.
- **Files created:** `site/src/components/PinButton.astro`.
- **Dependencies:** Step 6, Step 7.
- **Verification:** `cd site && astro check` clean; `cd site && npm run build` clean; visual smoke test on `/news/` after manual pin shows filled-icon state. AC4 (anonymous), AC5–AC7 (signed-in pin/unpin flow) evidence via integration smoke.
- **Parallel-safe with:** Step 10, Step 12 (different files).

#### Step 12 — Embed `<PinButton />` into existing content cards / per-item pages

- **Outcome:** `<PinButton />` is inserted at the integration points from codebase scan §I.4:
  - `site/src/components/NewsPanel.astro` — after meta line in `<article class="news-card">`.
  - `site/src/components/NewsList.astro` — same location.
  - `site/src/components/SkillCard.astro` — after `<h3>`.
  - `site/src/pages/tips.astro` — after each tip's title.
  - `site/src/pages/glossary.astro` — after each term heading.
  - `site/src/pages/news/[slug].astro` — near the top of the article body.
  - `site/src/pages/start-here/day-1.astro` — DEFER (placeholder; no content yet).
  - Skills / tips per-item pages: not yet routed (catalogs empty) — DEFER.
- **Files modified:** `site/src/components/NewsPanel.astro`, `site/src/components/NewsList.astro`, `site/src/components/SkillCard.astro`, `site/src/pages/tips.astro`, `site/src/pages/glossary.astro`, `site/src/pages/news/[slug].astro`.
- **Dependencies:** Step 11.
- **Verification:** `cd site && astro check` clean; `cd site && npm run build` clean; rendered `dist/news/index.html` contains pin buttons; anonymous browse (AC4) confirms "Sign in to pin" CTA in DOM with no console errors.
- **Parallel-safe with:** Step 10, Step 11, Step 13, Step 14, Step 15 (different files).

#### Step 13 — `/my-pins/` page (`site/src/pages/my-pins.astro`)

- **Outcome:** new page at `/my-pins/` rendering a shell + inline client-side `<script type="module">` that calls `auth.getToken()`. Anonymous → renders "Sign in to see your pins" panel (AC9). Signed-in → calls `gist.readGist()`, fetches the 5 build-time indices from `/_data/<type>-index.json`, joins, renders one section per content type in the order **skill, tip, news, journey-step, glossary** (F-P11), sorted by `pinned_at` descending. Stale references (pin's `(type, slug)` not in the index) render a dimmed "Pinned item no longer available — [unpin]" row (AC10). Privacy callout (F-P21) at the page footer.
- **Files created:** `site/src/pages/my-pins.astro`.
- **Dependencies:** Step 5 (build-time index), Step 6, Step 7.
- **Verification:** `cd site && astro check` clean; `cd site && npm run build` produces `dist/my-pins/index.html`. Anonymous load shows the sign-in panel; signed-in manual smoke test (DoD #18) shows two sections with one card each after pinning two items of different types. AC8, AC9, AC10 evidence.
- **Parallel-safe with:** Step 14, Step 15 (different files).

#### Step 14 — `/submit-skill/` page (`site/src/pages/submit-skill.astro`) + sidebar wiring

- **Outcome:** new anonymous-accessible form page at `/submit-skill/`. Multi-section form for all 17 Skill frontmatter fields + body `<textarea>`. Client-side validation mirrors the CI validator rules (Step 9). Submit button disabled until valid. On submit: runs slug-collision pre-check (`submission.checkSlug()`), then either (a) opens the GitHub editor URL in a new tab via `window.open(url, '_blank')` (per A24) if URL ≤ 7000 chars, or (b) copies serialised content to clipboard and navigates to the bare URL with on-screen "paste into the editor" instructions (AC12 fallback path). Sidebar gains a new "Submit a skill" entry under "Contribute" (or as a sibling — Phase 5 finalises the sidebar ordering). Privacy callout for anonymous flow (DoD #19) included.
- **Files created:** `site/src/pages/submit-skill.astro`.
- **Files modified:** `site/astro.config.mjs` (sidebar entry — coordinate with Step 10 if same file).
- **Dependencies:** Step 8, Step 1 (schema for client-side validation parity).
- **Verification:** `cd site && astro check` clean; `cd site && npm run build` produces `dist/submit-skill/index.html`. Anonymous load shows form, no auth gate. Manual smoke (DoD #18) fills form → clicks Submit → new tab opens at `github.com/.../new/main/skills?filename=…&value=…` with content pre-filled. AC11, AC12, AC13, AC14, AC15 evidence.
- **Parallel-safe with:** Step 12, Step 13, Step 15 (different files).
- **NOTE on `astro.config.mjs`:** if Step 10 has not landed yet, Step 14 must wait or coordinate the sidebar edit with the `components.SocialIcons` override edit (same file).

#### Step 15 — CI validator workflow (`.github/workflows/validate-skill-submission.yml`)

- **Outcome:** new GitHub Actions workflow file. Triggers on `pull_request` (NOT `pull_request_target` — R7). `types: [opened, synchronize, reopened]`. `paths: ['skills/**/*.md']`. Permissions: `contents: read` only. Steps: checkout (`fetch-depth: 0`); setup Node from `pipeline/.nvmrc`; `npm ci` + `npm run build` in `pipeline/`; compute changed files via `git diff --name-only ${{ github.event.pull_request.base.sha }} ${{ github.sha }} -- 'skills/*.md'`; invoke `node dist/validators/cli.js <files>`. No PR creation, no `GITHUB_TOKEN` write.
- **Files created:** `.github/workflows/validate-skill-submission.yml`.
- **Dependencies:** Step 9.
- **Verification:** YAML lint clean; workflow appears under "Actions" tab on the next push; a fixture PR exercising both green (well-formed skill) and red (missing field) paths runs the workflow and produces the expected check conclusion. AC16, AC17, AC18, AC19, AC20 verified via the fixture PR (DoD #5).
- **Parallel-safe with:** Step 12, Step 13, Step 14, Step 16 onward.

### Wave D — Docs, scope, decisions (depend on Waves A–C being structurally settled, but can run in parallel with each other)

#### Step 16 — Create gist contract document (`docs/reference/gist-contract.md`)

- **Outcome:** new reference doc per F-P20. Sections: localStorage keys (`nbgaihub.gh_token`, `nbgaihub.gh_user`, `nbgaihub.gist_id`); gist filename (`nbgaihub-favorites.json`); **unlisted (not private) visibility** explicit per R2 + investigation Topic 2; JSON schema with example; read-modify-write protocol; dedup rule; idempotency guarantees; schema-versioning tolerance (AC22); error modes; privacy callout (F-P21 verbatim); explicit "Claude-side `/hub-*` skill MUST follow this contract" callout.
- **Files created:** `docs/reference/gist-contract.md`.
- **Dependencies:** Step 7 (so contract wording reflects the implemented protocol verbatim).
- **Verification:** file exists; grep confirms "unlisted", "schema_version", "read-modify-write", "MUST" all present. AC28 evidence.
- **Parallel-safe with:** Step 17, Step 18, Step 19, Step 20, Step 21, Step 22.

#### Step 17 — Update `docs/design/project-design.md` with personalization architecture

- **Outcome:** new top-level section (likely "§T — Personalization & contributions architecture") added to project-design.md describing: PAT-paste sign-in sequence; gist read-modify-write sequence; `/my-pins/` page wiring (build-time index + client-side join); URL-redirect submission flow (happy path + clipboard fallback); validator workflow architecture. Existing §S.4 (skill schema) is updated to reflect the 7 new fields. TOC at top of file updated to include the new section.
- **Files modified:** `docs/design/project-design.md`.
- **Dependencies:** Step 7, Step 8, Step 13, Step 14, Step 15 (architecture reflects shipped shape).
- **Verification:** TOC entry exists; section contains five labelled sub-sections matching the bulleted outcomes above. AC29 evidence.
- **Parallel-safe with:** Step 16, Step 18, Step 19, Step 20, Step 21, Step 22 (different files).

#### Step 18 — Update `docs/design/project-functions.md` with F-P1..F-P25

- **Outcome:** append a new `## Personalization & contributions (plan-003-personalization)` section to project-functions.md listing the F-P1..F-P25 functional contracts (titles + one-paragraph descriptions transcribed from refined-request §Functional). Also append two new unambiguous web-side functional codes proposed by this plan: **F-P-PIN-1 (Build-time pin index emission)** and **F-P-SUB-1 (URL-redirect submission with 7000-char fallback)** if the Designer agrees during Phase 5. Bump `Last updated` timestamp.
- **Files modified:** `docs/design/project-functions.md`.
- **Dependencies:** Step 5, Step 6, Step 7, Step 8, Step 13, Step 14 (text reflects shipped functional shape).
- **Verification:** grep `F-P1`, `F-P25`, `F-P-PIN-1`, `F-P-SUB-1` returns ≥ 1 hit each (Designer may merge the latter two into F-Pn numbering — that's fine). AC30 evidence.
- **Parallel-safe with:** Step 16, Step 17, Step 19, Step 20, Step 21, Step 22.

#### Step 19 — Update `SCOPE.md` to record the two reversals

- **Outcome:** in `SCOPE.md`: remove "Per-user personalization or bookmarking" from "Out of scope — NO"; remove "Community contributions (PRs from outside the team)" from "Deferred — LATER"; add two new rows to "MVP scope — IN" table for "Per-user favourites (PAT + unlisted-gist-backed)" and "Skill submission web form (URL-redirect to GitHub editor)" with their initial status; add two new rows to demo-ability checklist ("Signed-in user can pin and see pins on /my-pins/" and "Anonymous visitor can submit a skill via /submit-skill/ and reach GitHub's editor with the content pre-filled"); bump `Last updated`.
- **Files modified:** `SCOPE.md`.
- **Dependencies:** none structurally (depends only on the user-greenlight that this plan ships).
- **Verification:** grep confirms entries removed from out-of-scope/deferred and added to MVP-IN; demo-ability checklist contains the new rows; `Last updated:` is dated `2026-05-18` or later. AC24 evidence.
- **Parallel-safe with:** Step 16, Step 17, Step 18, Step 20, Step 21, Step 22.

#### Step 20 — Append dated entry to `DECISIONS.md`

- **Outcome:** append (never edit prior entries) a new dated entry titled (proposed) *"2026-05-18 — Personalization + community contributions: PAT-scoped gist + URL-redirect submissions (no OAuth App, no proxy)"*. Captures: the two SCOPE reversals; the architectural choice of **PAT paste over Device Flow** (driven by R1 CORS finding); the unlisted user-owned gist choice; the URL-redirect submissions choice over browser-side write APIs; the explicit privacy posture; alternatives considered (OAuth App + Cloudflare Worker → rejected; browser-side write APIs → rejected). Status: accepted.
- **Files modified:** `DECISIONS.md`.
- **Dependencies:** none.
- **Verification:** new entry exists with the 2026-05-18 date and `Status: accepted` line; references SCOPE.md reversals + investigation pivot. AC25 evidence.
- **Parallel-safe with:** Step 16, Step 17, Step 18, Step 19, Step 21, Step 22.

#### Step 21 — Update `Issues - Pending Items.md` with the A26 follow-ups

- **Outcome:** add three new pending items to `Issues - Pending Items.md` per A26:
  1. "If PAT-paste UX proves clunky, consider migrating to OAuth App + Cloudflare Worker proxy later" (softer follow-up — explicitly NOT a blocker).
  2. "If/when team-wide aggregate stats become desirable, design an opt-in aggregation that respects gist unlinkedness" (low priority).
  3. "Consider extracting a shared schema package between site and pipeline to retire schema duplication" (carries over from astro-starlight-site A4).
  Plus the slug-dup item registered at Step 4.
- **Files modified:** `Issues - Pending Items.md`.
- **Dependencies:** none.
- **Verification:** file contains 3+ new pending entries with the required text snippets.
- **Parallel-safe with:** Step 16, Step 17, Step 18, Step 19, Step 20, Step 22.

#### Step 22 — Create `docs/tools/skill-validator.md` tool entry

- **Outcome:** new file documenting the CI validator as a reusable project tool per global CLAUDE.md (`docs/tools/<name>.md` convention) and NF-P3. Required XML format per project convention (mirroring whatever shape existing `docs/tools/*.md` files use; if `docs/tools/` is empty today, the Designer establishes the format in Phase 5). Sections: tool name (`skill-validator`); purpose; entry point (`pipeline/dist/validators/cli.js`); validation rules (all 7 listed); exit codes; error annotation format; dependencies (`gray-matter`, `config/maintainers.json`); test coverage location; invoking workflow.
- **Files created:** `docs/tools/skill-validator.md`.
- **Files modified:** `CLAUDE.md` (project) — add a one-line reference to the new tool entry under a tools section if the convention requires it.
- **Dependencies:** Step 9, Step 15.
- **Verification:** file exists; required sections present. DoD #16 evidence.
- **Parallel-safe with:** Step 16, Step 17, Step 18, Step 19, Step 20, Step 21.

### Wave E — Verification (sequential, last)

#### Step 23 — Integration smoke + AC matrix walkthrough

- **Outcome:** Phase 10 Integration Verifier runs the manual end-to-end smoke (DoD #18 + DoD #20) and produces `docs/reference/integration-verification-personalization.md` walking each of AC1–AC31 with concrete evidence (test names, file:line refs, HTTP responses, dist artifact contents).
- **Files created:** `docs/reference/integration-verification-personalization.md`.
- **Dependencies:** all prior steps complete.
- **Verification:** every AC row has a populated "Evidence" column; final report concludes "all 31 ACs pass". This step IS the AC31 evidence (no rogue commits / branches / pushes — `git status` clean between phases).
- **Parallel-safe with:** none (terminal).

---

## 4. Parallel-execution map

The waves are sequential; steps **within a wave** can run concurrently for the most part, with the file-ownership exceptions called out below.

| Wave | Steps | Parallelism | File-coordination notes |
|------|-------|-------------|--------------------------|
| **A — Foundations** | 1, 2, 3, 4 | All 4 in parallel. | Step 4 strictly depends on Step 3 (vitest install). Steps 1, 2, 3 are independent. |
| **B — Core libs** | 5, 6, 7, 8, 9 | All 5 in parallel. | Step 7 imports `auth.ts` (Step 6) — kick Step 7 right after Step 6 finishes if same coder. Step 8 imports `slug.ts` (Step 4). Step 9 depends on Step 2 (`maintainers.json`). Each step touches a disjoint file set, so different coders may take them. |
| **C — UI + workflow** | 10, 11, 12, 13, 14, 15 | 11 and 12 must serialise (12 imports the file built in 11; one coder can take both). 10 and 14 both edit `astro.config.mjs` — serialise these two OR have one coder own both edits in a single commit. 13 and 14 are independent. 15 (workflow YAML) is fully independent. | At most 4 effective parallel units in Wave C: {10+14 serialised}, {11→12 serialised}, {13}, {15}. |
| **D — Docs** | 16, 17, 18, 19, 20, 21, 22 | All 7 in parallel. | Each step owns its own doc file. No conflicts. Wave D may begin while Wave C is still in flight as long as the doc author can describe the shape from the design contract (Phase 5 Designer's output). |
| **E — Verification** | 23 | Solo. | Terminal. |

**Identified parallel units in Wave B + Wave C (the Coders' main attack surface):**

- **B1** = Step 5 (build-pin-index)
- **B2** = Step 6 (auth.ts)
- **B3** = Step 7 (gist.ts) — depends on B2
- **B4** = Step 8 (submission.ts) — depends on Step 4 (Wave A)
- **B5** = Step 9 (CI validator) — depends on Step 2 (Wave A)
- **C1** = Step 10 + Step 14 sidebar-edit serialised (or single coder owns both `astro.config.mjs` edits)
- **C2** = Step 11 → Step 12 (one coder, sequential — PinButton then embed)
- **C3** = Step 13 (/my-pins/ page)
- **C4** = Step 14 page body (`/submit-skill/`)
- **C5** = Step 15 (validator workflow YAML)

**Wave B = 5 parallel units. Wave C = 5 parallel units.** A team of 3–5 coders can fan out across these waves with the file-coordination notes above as the only locks.

### DAG (text form)

```
Step 1 ─┐
Step 2 ─┤
Step 3 ──→ Step 4 ──→ Step 5
        ├─→ Step 6 ──→ Step 7
        ├─→ Step 8 (also ← Step 4)
        └─→ Step 9 (also ← Step 2)
Step 6 ──→ Step 10 ──→ (astro.config.mjs lock) ──→ Step 14
Step 6, Step 7 ──→ Step 11 ──→ Step 12
Step 5, Step 6, Step 7 ──→ Step 13
Step 8, Step 1 ──→ Step 14
Step 9 ──→ Step 15
Step 7 ──→ Step 16
Step 5, 6, 7, 8, 13, 14, 15 ──→ Step 17
Step 5, 6, 7, 8, 13, 14 ──→ Step 18
(no code deps) ──→ Step 19, Step 20, Step 21
Step 9, Step 15 ──→ Step 22
all prior ──→ Step 23
```

## 5. Files to create

| Path | Purpose |
|---|---|
| `config/maintainers.json` | Maintainer allowlist for the CI validator (F-P19). |
| `site/vitest.config.ts` | Vitest config for site workspace (NF-P11). |
| `site/tests/.gitkeep` | Placeholder for site test directory. |
| `site/src/lib/slug.ts` | Slug function duplicated from `pipeline/src/slug.ts` (A23). |
| `site/tests/slug.test.ts` | Drift test asserting site-side slug matches pipeline-side. |
| `site/src/lib/auth.ts` | PAT-paste auth module (F-P1..F-P5). |
| `site/tests/auth.test.ts` | Unit tests for auth module (AC1, AC2, AC3, AC23). |
| `site/src/lib/gist.ts` | Unlisted-gist read-modify-write client (F-P8, F-P9, F-P10). |
| `site/tests/gist.test.ts` | Unit tests for gist client (AC5, AC6, AC7, AC21, AC22). |
| `site/src/lib/submission.ts` | Skill-submission serialiser + URL builder + clipboard fallback + collision pre-check (F-P12..F-P16). |
| `site/tests/submission.test.ts` | Unit tests for submission module (AC12, AC13, AC14, AC15). |
| `site/scripts/build-pin-index.ts` | Build-time generator for `public/_data/<type>-index.json` (A21). |
| `site/tests/build-pin-index.test.ts` | Unit test for build-pin-index script. |
| `site/src/components/SignIn.astro` | Sign-in modal (native `<dialog>`) with PAT-paste UX. |
| `site/src/components/SocialIconsOverride.astro` | Starlight `SocialIcons` slot override hosting sign-in/out chip (A15, R6). |
| `site/src/components/PinButton.astro` | State-aware pin/unpin button (F-P7). |
| `site/src/pages/my-pins.astro` | `/my-pins/` page rendering pinned items grouped by type (F-P11). |
| `site/src/pages/submit-skill.astro` | `/submit-skill/` anonymous-accessible form (F-P12). |
| `pipeline/src/validators/skill.ts` | TypeScript skill-frontmatter validator (F-P18). |
| `pipeline/src/validators/cli.ts` | CLI wrapper for the validator (entry point for the GH Action). |
| `pipeline/tests/validators/skill.test.ts` | Vitest suite for the validator. |
| `pipeline/tests/validators/fixtures/valid-skill.md` | Happy-path fixture. |
| `pipeline/tests/validators/fixtures/missing-install-command.md` | Negative fixture (AC17). |
| `pipeline/tests/validators/fixtures/bad-category.md` | Negative fixture (AC18). |
| `pipeline/tests/validators/fixtures/bad-install-command.md` | Negative fixture (AC19). |
| `.github/workflows/validate-skill-submission.yml` | CI workflow invoking the validator on `skills/**/*.md` PRs (F-P18). |
| `docs/reference/gist-contract.md` | Gist data contract for Claude-skill parity (F-P20, AC28). |
| `docs/tools/skill-validator.md` | Tool entry for the CI validator (NF-P3, DoD #16). |
| `docs/design/plan-003-personalization-and-contributions.md` | THIS PLAN. |
| `docs/reference/integration-verification-personalization.md` | Phase 10 verifier output mapping AC1..AC31 to evidence. |

## 6. Files to modify

| Path | Change |
|---|---|
| `site/src/content.config.ts` | Extend `skills` collection schema with 7 new fields (`install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`, `requires?`) layered onto `baseShape('skill')` (AC26). |
| `site/package.json` | Add `vitest` devDependency + `test`/`test:watch` scripts (NF-P11). Add `tsx` as devDep for `build-pin-index.ts`. Update `build` script to chain `tsx scripts/build-pin-index.ts && astro check && astro build`. |
| `site/astro.config.mjs` | Add `components: { SocialIcons: './src/components/SocialIconsOverride.astro' }` (R6, A15). Add `{ label: 'My Pins', link: '/my-pins/' }` and (per Phase 5) a `/submit-skill/` entry to the sidebar. |
| `site/src/components/NewsPanel.astro` | Insert `<PinButton type="news" slug={item.id} />` after meta line. |
| `site/src/components/NewsList.astro` | Same as above. |
| `site/src/components/SkillCard.astro` | Insert `<PinButton type="skill" slug={entry.id} />` after `<h3>`. |
| `site/src/pages/tips.astro` | Insert `<PinButton type="tip" slug={entry.id} />` after each tip's title. |
| `site/src/pages/glossary.astro` | Insert `<PinButton type="glossary" slug={entry.id} />` after each term heading. |
| `site/src/pages/news/[slug].astro` | Insert `<PinButton type="news" slug={entry.id} />` near top of article. |
| `pipeline/package.json` | Optionally add `"validate-skill": "node dist/validators/cli.js"` script convenience. No new runtime deps (`gray-matter`, `yaml` already present). |
| `SCOPE.md` | Move two entries into MVP-IN; add new MVP table rows; add demo-ability checklist rows; bump `Last updated` (AC24, F-P22). |
| `DECISIONS.md` | Append new 2026-05-18 entry (AC25, F-P23). |
| `Issues - Pending Items.md` | Add 3 follow-up items from A26 + slug-dup item (DoD #15). |
| `docs/design/project-design.md` | New top-level personalization section + update §S.4 skill schema description (AC29, F-P24). |
| `docs/design/project-functions.md` | Append `## Personalization & contributions (plan-003-personalization)` section with F-P1..F-P25 (and optionally F-P-PIN-1 / F-P-SUB-1) (AC30, F-P25). |
| `CLAUDE.md` (project) | Add one-line cross-reference to `docs/tools/skill-validator.md` if the project convention requires it (DoD #16). |

## 7. AC coverage table (HARD GATE)

| AC | Covered by plan step(s) | Evidence at verification time |
|----|-------------------------|-------------------------------|
| AC1 — PAT-paste sign-in completes end-to-end | Steps 6, 10 | `site/tests/auth.test.ts` test "valid token → stored, subscribers notified" passes; manual smoke (DoD #18): modal closes and header shows user login. |
| AC2 — Token persistence across page reloads | Steps 6, 10 | `site/tests/auth.test.ts` test "getToken() returns persisted token after module reload" passes; manual smoke: reload, header still shows login. |
| AC3 — Sign-out clears all auth state | Steps 6, 10 | `site/tests/auth.test.ts` test "signOut clears gh_token, gh_user, gist_id" passes; manual smoke: click sign-out, `localStorage` is empty for all 3 keys. |
| AC4 — Anonymous browsing unchanged | Steps 11, 12, 13, 14 | Manual smoke: open every existing page with no `localStorage`; all return 200; no JS errors; pin buttons render the "Sign in to pin" CTA. `cd site && npm run build` exits 0. |
| AC5 — First pin creates an unlisted gist | Steps 7, 11 | `site/tests/gist.test.ts` test "first pin issues POST /gists with public:false and wrapped JSON shape" passes; intercepted fetch payload asserted. |
| AC6 — Subsequent pin uses read-modify-write | Steps 7, 11 | `site/tests/gist.test.ts` test "subsequent pin issues GET + PATCH with merged + deduped records" passes. |
| AC7 — Unpin removes the record via read-modify-write | Steps 7, 11 | `site/tests/gist.test.ts` test "unpin issues GET + PATCH whose PATCH omits the (type, slug) record" passes. |
| AC8 — `/my-pins/` renders pinned items when signed in | Steps 5, 13 | Manual smoke (DoD #18): pin two items of different types → `/my-pins/` shows two sections with one card each. `dist/my-pins/index.html` is non-empty post-build. |
| AC9 — `/my-pins/` anonymous state | Step 13 | Manual smoke: visit `/my-pins/` with no token → "Sign in to see your pins" panel; no JS errors. |
| AC10 — `/my-pins/` handles stale references | Steps 5, 13 | `site/tests/my-pins` integration test (or manual smoke with a fixture pin pointing at a nonexistent slug) shows dimmed "no longer available — [unpin]" row. |
| AC11 — Submission form happy path opens GitHub's editor | Step 14 | Manual smoke (DoD #18): fill form anonymously → click Submit → new tab opens at `github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=…&value=…` with content pre-filled. |
| AC12 — Submission URL-length fallback triggers correctly | Step 8 | `site/tests/submission.test.ts` test "URL > 7000 chars → clipboard branch taken, navigation URL omits ?value=" passes; "URL ≤ 7000 chars → direct-redirect branch taken" also passes. |
| AC13 — Submission form validation: invalid `install_command` | Step 8 (validation logic), Step 14 (UI surface) | `site/tests/submission.test.ts` test "install_command without allowed prefix → validation error returned, no navigation" passes; manual smoke shows inline error + disabled Submit. |
| AC14 — Submission form validation: invalid `skill_id` | Step 4 (slug), Step 8, Step 14 | `site/tests/submission.test.ts` test "skill_id 'Skill_ID!' → regex error" passes. |
| AC15 — Submission form slug collision pre-check | Step 8, Step 14 | `site/tests/submission.test.ts` tests for 200/404/429 paths against the contents endpoint pass; manual smoke confirms disabled-Submit when slug already exists in repo. |
| AC16 — CI validator passes on a valid PR | Steps 9, 15 | `pipeline/tests/validators/skill.test.ts` "valid fixture returns valid:true, no errors"; fixture PR (real or simulated) shows green check. |
| AC17 — CI validator fails on missing required field | Steps 9, 15 | `pipeline/tests/validators/skill.test.ts` "missing install_command → error names file + field"; fixture PR shows red check with annotation. |
| AC18 — CI validator fails on invalid enum | Steps 9, 15 | `pipeline/tests/validators/skill.test.ts` "category: nonsense → enum error" passes. |
| AC19 — CI validator fails on bad `install_command` prefix | Steps 9, 15 | `pipeline/tests/validators/skill.test.ts` "install_command: 'rm -rf /' → prefix-mismatch error" passes. |
| AC20 — CI validator rate-limit tolerance | Step 9 | `pipeline/tests/validators/skill.test.ts` "external_link HEAD 429 → warning logged, validator exits 0" passes. |
| AC21 — Gist JSON schema conformance | Step 7 | `site/tests/gist.test.ts` test "every write conforms to {schema_version:1, favourites:[…]} with type ∈ enum, slug non-empty, pinned_at YYYY-MM-DD" passes. |
| AC22 — Gist schema versioning tolerance | Step 7 | `site/tests/gist.test.ts` test "legacy gist without schema_version → treated as v1, warns once; writer always emits schema_version:1" passes. |
| AC23 — Token only sent to `api.github.com` | Step 6 | `site/tests/auth.test.ts` fetch interceptor asserts every `Authorization: token …` request hostname is `api.github.com`. |
| AC24 — SCOPE.md updated | Step 19 | grep on `SCOPE.md` confirms: "Per-user personalization" no longer under out-of-scope; "Community contributions" no longer under deferred; MVP-IN table gains 2 new rows; demo-ability checklist gains 2 new rows; `Last updated` bumped. |
| AC25 — DECISIONS.md appended | Step 20 | `DECISIONS.md` contains a new dated 2026-05-18 entry titled per F-P23 with status `accepted`. |
| AC26 — Skills schema includes 7 new fields | Step 1 | grep `install_command, skill_id, origin, category, status, maintainer, requires` in `site/src/content.config.ts`; `cd site && astro check` exits 0. |
| AC27 — `config/maintainers.json` exists | Step 2 | file exists; `team_aliases` is a string array with ≥ 1 entry. |
| AC28 — Gist contract document exists | Step 16 | `docs/reference/gist-contract.md` exists; contains all required sections (localStorage keys, gist filename, "unlisted (not private)", schema + example, read-modify-write, dedup, versioning, privacy callout, Claude-side MUST-follow callout). |
| AC29 — project-design.md updated | Step 17 | new top-level personalization architecture section exists; referenced from TOC. |
| AC30 — project-functions.md updated | Step 18 | new `## Personalization & contributions` block exists with F-P1..F-P25 descriptions. |
| AC31 — No version-control side effects | Step 23 (terminal check) + working rule | `git status` between phases shows only expected file changes; no rogue commits, branches, or pushes. Verifier's report confirms. |

**All 31 ACs covered: YES.** Each AC has at least one covering step; verifiable evidence is specified for every row. The plan is COMPLETE on this gate.

## 8. Risks and mitigations

| # | Risk | Mitigation |
|---|------|-----------|
| **PR-1** | Starlight 0.39's `SocialIcons` override API may not expose the right hook for a click handler (the slot may be SSR-only). | Step 10 includes a small inline `<script>` block that hydrates client-side and wires up the modal trigger. If the slot proves unusable, Phase 5 Designer falls back to `PageFrame`-with-`header`-slot per the investigation's secondary option. Worst case, a 30-min design spike during Phase 5. |
| **PR-2** | Schema extension (Step 1) breaks site build immediately because future seeded `skills/*.md` files lack the 7 new fields. | The `skills/` directory is currently `.gitkeep`-only — there are no files to fail validation. The schema extension is safe to land first. The first PR adding a real skill file will be enforced by both the site schema and the CI validator. |
| **PR-3** | Slug duplication between `site/src/lib/slug.ts` and `pipeline/src/slug.ts` drifts. | Step 4 ships a drift test asserting byte-for-byte parity on a ≥10-row fixture table. Step 21 logs the dedup follow-up. Test fires on every site CI run (once site has a CI). |
| **PR-4** | Two-tab race overwrites pins (gist last-write-wins). | Documented in `gist-contract.md` (Step 16) as "accepted for MVP". Read-modify-write per pin minimises the window. OQ3 records the future remediation path if real users hit it. |
| **PR-5** | `clipboard.writeText` rejects in non-secure contexts (e.g. some intranet HTTP previews). | Step 8's submission module catches the rejection and renders a `<textarea readonly>` + "Copy" button as the manual fallback. Tested in `submission.test.ts`. |
| **PR-6** | URL length crosses the 7000-char cutoff for unusually long skill bodies. | Same path as PR-5 — fallback already covered. AC12 test exercises both branches. |
| **PR-7** | CI validator on PRs from forks runs with the fork's security context; if a fork user manipulates the workflow file, secrets could leak. | Workflow uses `pull_request` (NOT `pull_request_target`) per R7. `permissions: contents: read` only. No repo secrets. No write capabilities. |
| **PR-8** | `npm install` for new deps (`vitest` on site side, `tsx` for the build script) may surface deprecation warnings. | NF-P13 forbids new deprecated direct deps. The Dependency Validator (Phase 8) gates on this. If a warning appears, swap to an alternative dep (e.g. `tsm` or native Node 22 `--experimental-strip-types`) before merge. |
| **PR-9** | `external_link` HEAD requests in the validator can hit 429 from RSS sources and slow CI to a crawl. | Validator implements a 10-second timeout per link + 429 tolerance (AC20). For a typical skill PR (1 file × 1 link), worst-case extra latency is ~10s. |
| **PR-10** | Two coders both edit `site/astro.config.mjs` in parallel (Step 10 + Step 14 sidebar entry). | Wave C parallel-execution map calls this out. Either one coder owns both edits in a single commit, OR Step 10 lands first and Step 14 amends. |

## 9. Implementation-time decisions deferred to Designer (Phase 5)

The Coders MUST NOT invent the following — they belong to Phase 5 (`project-design.md`):

1. **Exact error-class hierarchy** for `auth.ts`, `gist.ts`, `submission.ts` (e.g., a shared `NbgAiHubAuthError` base? Or flat per-module classes?). Codebase scan §3.8 establishes the convention (named classes extending `Error`), but the taxonomy is the Designer's call.
2. **Exact Zod refinement chain** for the 7 new skill fields — including the `install_command` `.refine()` error message text, the `skill_id` regex error text, and whether `requires` defaults to `[]` or stays optional-undefined.
3. **Build-time pin index JSON shape** — Designer chooses between `[{slug, title, audience, topics}]` (minimal) vs a richer per-record shape (e.g., add `internal`, `external_link`, `last_reviewed`). Step 5 implements whatever Designer specifies.
4. **Canonical key order** for the submission serialiser's YAML frontmatter output — must match an explicit ordering the Designer publishes, so the CI validator's "file matches `skills/<slug>.md` where `<slug> === skill_id`" check is deterministic.
5. **Sign-in modal copy** — the investigation's §5 draft is a starting point; Designer finalises the wording per the *"what I wish I knew a year ago"* tone.
6. **`PinButton.astro` visual contract** — icon set (Starlight ships none), filled/outline states, toast positioning. Designer specifies CSS class names using `var(--sl-color-*)` tokens (per codebase scan note 7).
7. **`/submit-skill/` form layout** — sectioning of the 17 fields, live slug preview placement, error-message presentation, anonymous-flow privacy callout copy.
8. **Sidebar placement of "My Pins" and "Submit a skill"** — Designer chooses ordering in `astro.config.mjs` (codebase scan §I.10 proposes "My Pins" after "Glossary"; "Submit a skill" placement is open).
9. **Status: deprecated banner UX** for skill cards / per-item pages (A14 — proposed banner, Designer finalises shape).
10. **`origin` / `category` / `requires` enum/freetext final labels** if user-confirmation at the assumption-gate altered the refined-request defaults (A8, A9, A11).
11. **Whether to introduce `successor_skill_id` field** on the skill schema (OQ1 default: add as optional).
12. **`docs/tools/<name>.md` XML format** — if `docs/tools/` is empty today, Designer establishes the template before Step 22.
13. **F-P-PIN-1 and F-P-SUB-1 promotion** — whether to add these new F-codes to `project-functions.md` (Step 18) or fold them into F-P1..F-P25.
14. **CSP meta-tag wording** — A7 stipulates `connect-src 'self' https://api.github.com`; Designer confirms exact `<meta http-equiv>` placement.

---

## 10. Constraints reiterated (load-bearing)

- **TypeScript strict + `noUncheckedIndexedAccess`** in both workspaces (NF-P1).
- **No fallback config** — every required config value (e.g., `config/maintainers.json` when validator runs) must throw a named, descriptive exception on absence (NF-P2). Site side has no required build-time auth config (PAT paste has no `client_id`).
- **All tool implementations are TypeScript** (NF-P3, global CLAUDE.md). The CI validator is a tool; it ships with a `docs/tools/skill-validator.md` entry.
- **Anonymous build path unchanged** (NF-P4) — `npm run build` produces a fully-functional static site that works without any GitHub API calls at view time.
- **No runtime AI on the site** (NF-P5).
- **Dev port unchanged** at 4321 (NF-P6).
- **Singular naming** for any schema-like artifact (NF-P7).
- **No VCS side effects during implementation** (NF-P8, AC31).
- **`astro check` clean + `npm run build` clean + `pipeline npm test` clean + lint clean + no new deprecated deps** (NF-P9, NF-P10, NF-P11, NF-P12, NF-P13).
- **Re-read SCOPE.md + DECISIONS.md before scope changes** (project CLAUDE.md working rule).

---

**End of plan-003. Hand off to Phase 5 (Designer) for the deferred decisions listed in §9, then to Phase 6 (Coders) for wave-by-wave execution.**
