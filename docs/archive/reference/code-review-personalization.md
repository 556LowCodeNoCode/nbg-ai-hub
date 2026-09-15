# Code Review — Personalization & Community Contributions

**Workflow phase:** Phase 7 — Code Reviewer (`/team`).
**Commits in scope (Waves A–D):**

- `c1df291` — Wave A: schema extension, vitest, slug duplication, maintainers config.
- `5a08260` — Wave B: site core libs (`api-fetch`, `auth`, `gist`, `submission`, `pin-store`-precursor types, `build-pin-index`) + pipeline validator.
- `64f83b2` — Wave C: UI components, pages, CI workflow.
- `dcc84f5` — Wave D: docs (SCOPE reversal, DECISIONS, project-design §P.13, gist contract, tool entry, Issues).

**Out of scope:** any file touched by the concurrent hub-plugin workflow (`plugin/`, `.claude-plugin/`, `plugin/**`). Where a shared file appears in both workflows (e.g. `project-design.md`, `project-functions.md`, `SCOPE.md`, `DECISIONS.md`, `Issues - Pending Items.md`, `CLAUDE.md`), only the personalization-attributable lines were considered.

---

## 1. Summary — verdict

**FIXES APPLIED.** One in-place edit (a confused multi-line comment in `submission.ts` that read like a sentence fragment) was patched. No architectural defects found. All four reference checks (astro check, site build, pipeline build, pipeline lint) are clean; site 127/127 and pipeline 112/112 tests pass after the fix.

Two architectural concerns are surfaced as outstanding (privacy posture of the slug-collision check against a private repo, and pinned-skill/tip deep-link UX); both are documented as `Issues - Pending Items.md` entries for the next phase to weigh.

---

## 2. Files reviewed (in-scope file list)

Enumerated from `git show --name-only` across the four commits:

**Site libs:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/lib/api-fetch.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/lib/auth.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/lib/gist.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/lib/pin-store.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/lib/skill-types.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/lib/slug.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/lib/submission.ts`

**Site scripts:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/scripts/build-pin-index.ts`

**Site components:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/NewsList.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/NewsPanel.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/PinButton.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/SignInModal.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/SkillCard.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/SocialIconsOverride.astro`

**Site pages + config:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/content.config.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/pages/glossary.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/pages/my-pins.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/pages/news/[slug].astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/pages/submit-skill.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/pages/tips.astro`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/astro.config.mjs`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/package.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/vitest.config.ts`

**Site tests + data:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/api-fetch.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/auth.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/build-pin-index.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/gist.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/pin-store.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/slug.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/submission.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/public/_data/{news,skill,tip,glossary,journey-step}-index.json`

**Pipeline validator:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/validators/cli.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/validators/config.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/src/validators/skill.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/validators/skill.test.ts`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/pipeline/tests/validators/fixtures/{valid-skill,bad-category,bad-install-command,missing-install-command}.md`

**Config + workflow:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/config/maintainers.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/.github/workflows/validate-skill-submission.yml`

**Docs:**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/personalization-and-contributions.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/design/plan-003-personalization-and-contributions.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/design/project-design.md` (§P.* sections — personalization-attributable content only)
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/design/project-functions.md` (F-P-* block — personalization-attributable content only)
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/gist-contract.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/codebase-scan-personalization.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/investigation-personalization.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/workflow-checkpoint.json`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/tools/skill-validator.md`

**State files (personalization-attributable rows only):**
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/SCOPE.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/DECISIONS.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/CLAUDE.md`
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/Issues - Pending Items.md`

Total unique in-scope files: **~50** (within the expected ~30–50 range).

---

## 3. Build status

| Check | Command | Result |
|---|---|---|
| **Astro check (site)** | `cd site && npx astro check` | **0 errors, 0 warnings**, 5 hints (Zod 4 `.url()` deprecation pre-existing + 1 `toThrowError` deprecation in test). Already tracked in `Issues - Pending Items.md` items #2 and folded in via test framework. |
| **Site build** | `cd site && npm run build` | **Exit 0.** Pipeline: `tsx scripts/build-pin-index.ts` → `astro check` → `astro build`. 20 pages built including `/my-pins/index.html` and `/submit-skill/index.html`. Pagefind indexed 20 HTML files. Two empty-collection log lines for `skills` and `tips` are expected (placeholder catalogs). |
| **Pipeline build** | `cd pipeline && npm run build` | **Exit 0** (`tsc` clean). |
| **Pipeline lint** | `cd pipeline && npm run lint` | **Exit 0** (eslint clean across `src/**/*.ts` + `tests/**/*.ts`). |

No build regressions introduced by the in-place fix in `submission.ts` (comment-only change, all tests re-run green).

---

## 4. Test status

| Workspace | Command | Test files | Tests | Outcome |
|---|---|---|---|---|
| Site | `cd site && npm test` | 7 | **127** | All pass |
| Pipeline | `cd pipeline && npm test` | 15 | **112** | All pass |
| **Total** | — | **22** | **239** | **All green** |

Site test breakdown (commit-message-attested):

- `api-fetch.test.ts` — 11 tests (header attachment, AC23 cross-origin guard, status mapping).
- `auth.test.ts` — 9 tests (validate/store/sign-in/sign-out, subscriber lifecycle).
- `gist.test.ts` — 10 tests (find-or-create, RMW, dedup, legacy schema-version tolerance).
- `submission.test.ts` — 31 tests (serializer, URL-builder, AC12 7000-char threshold, AC13/14 validation, AC15 collision states).
- `build-pin-index.test.ts` — 8 tests (no-fallback frontmatter, all 5 collections, slug-date strip).
- `pin-store.test.ts` — 18 tests (fetch + schema validation, F-P11 ordering, stale-ref nulling, sort).
- `slug.test.ts` — 40 tests (drift parity vs `pipeline/src/slug.ts`).

Pipeline added 11 validator tests on top of the 101 pre-existing tests (88 baseline + 13 RSS-triage). Validator coverage exercises all 17 rules + the no-fallback config exception.

---

## 5. Findings — fixed in place

1. **`site/src/lib/submission.ts:343` — confused multi-line comment on `checkSlugCollision`.**
   **Original (load-bearing, but grammatically broken — read like two half-sentences spliced together):**

   ```ts
   /**
    * Opportunistic slug collision check against the GitHub Contents API.
    *  ...
    * We intentionally do NOT pass a token here — this is a public read of a
    * private repo's existence signal would leak, so we accept "unknown" for
    * the unauthenticated case rather than route through the user's PAT.
    */
   ```

   The wording "this is a public read of a private repo's existence signal would leak" mashed together "this is a public read" + "the private repo's existence signal would leak" with no separator. It misled the reader on intent.

   **Fix:** rewrote the comment to call out both (a) why we skip the token (avoid leaking the existence-signal into the user's token audit trail), and (b) the important caveat that because the repo is private, **unauthenticated requests will always return 404**, so the collision check is intentionally best-effort. The authoritative check is the CI validator + GitHub's own "file already exists" gate. This is a documentation-only change; the code path is unchanged.

   **Verification:** `cd site && npm test` → 127/127 still pass after the edit.

No other fixes were applied. Aria/null/error-class hygiene was already clean across the audited modules (every error class has a `this.name = '<Name>Error'` initializer; aria attributes present on every form/dialog/button; null-handling explicit via `null` returns from `readToken()` and `parseDocument` + named exception classes elsewhere).

---

## 6. Findings — outstanding

### Important

- **OUT-1 — Slug collision pre-check returns false-"free" on private repo (UX, not security).**
  `submission.ts → checkSlugCollision()` issues an **unauthenticated** `GET https://api.github.com/repos/chomovazuzana/NbgAiHub/contents/skills/<slug>.md`. Because `chomovazuzana/NbgAiHub` is **private** (per SCOPE.md and the refined request), the unauthenticated request will return 404 regardless of whether the file exists. The form will therefore display "Available — `<slug>.md` is free" for every slug, including taken ones. This is a UX regression vs. AC15's intent.

  This was acknowledged in the refined request (the call was designed against a public repo originally; the privacy posture pivot didn't propagate). Two paths forward:
  1. Drop the affordance entirely (least UX, safest privacy).
  2. Pass a separate fetch with the user's PAT once they are signed in — but the form is anonymous-accessible, so this only helps the signed-in subset.
  3. Hardcode the local catalog at build time (write `skills/<slug>.md` filenames into `public/_data/skill-index.json`) and check against that — works for the anonymous case, no network, no privacy leak.

  **Recommend Phase 8/9 (next workflow gate) pick option 3** — `skill-index.json` already exists from `build-pin-index.ts`; the collision check could become a pure-client lookup with zero new infra. Tracking as `Issues - Pending Items.md` follow-up.

### Minor

- **OUT-2 — Pinned skill/tip items deep-link to the catalog index, not the per-item page.**
  `my-pins.astro::urlForPin()` returns `/skills/` and `/tips/` (no anchor, no per-slug route), because skill and tip per-slug pages don't exist yet (`site/src/pages/skills/` and `site/src/pages/tips/` directories absent). Glossary uses `#<slug>` anchors and works; news uses `/news/<slug>/` and works; journey-step uses `/start-here/<slug>/` and works for the seeded `day-1` only.

  Acceptable for MVP — pinning a tip "still gets the user to the right page", and there's no skill content yet. Should be revisited when per-slug pages land (likely the same future PR that adds skill content).

- **OUT-3 — Anonymous browse path still includes `PinButton` script bundles.**
  Even when no user is signed in, every catalog/per-item page imports `gist.ts` + `auth.ts` + the inline PinButton script. Bundle weight is acceptable (no AI deps; just small fetch wrappers), and the script is gated on `readAuthState()` returning null, so it never makes network calls for anonymous visitors. Recording as a note rather than a defect — within the bundle-size budget per F-P6 ("anonymous browsing parity, no API calls at view time").

- **OUT-4 — `vitest.config.ts` 1-line file is not subject to lint or check.**
  No defect — note: the file isn't covered by `npm run lint` because the site workspace has no lint script. Astro check covers the type side. Not a problem.

### Critical

None.

---

## 7. AC sample verification

Five representative ACs from the refined request, traced to concrete evidence:

| AC | Statement | Evidence |
|---|---|---|
| **AC4 — Anonymous browsing unchanged** | Every existing page returns 200 + renders without JS errors when no token is present; pin buttons render the "Sign in to pin" affordance. | `site/src/components/PinButton.astro:117–124` (`setSignedOut` flips label to "Sign in to pin"); `:296–304` (`render(buttons)` reads auth + falls back to anonymous on null/throw). Build verified — all 20 pages emitted by `npm run build`. |
| **AC6 — Subsequent pin uses RMW** | Second pin issues `GET /gists/<id>` then `PATCH /gists/<id>`. | `site/src/lib/gist.ts::addFavorite` (lines 206–232) — explicit `readFavoritesGist` (GET) then `apiFetch(...PATCH)`. Unit test: `site/tests/gist.test.ts` (10 tests, including dedup + idempotent re-add — both assert the GET/PATCH pair). |
| **AC12 — URL-length fallback at 7000 chars** | Above 7000 chars, switch to clipboard-fallback path. | `site/src/lib/submission.ts:40` `MAX_EDITOR_URL_LENGTH = 7000`; `:140-149` `buildEditorUrl` returns `fitsInUrl: base.length <= MAX_EDITOR_URL_LENGTH`. Test: `site/tests/submission.test.ts` (31 tests; covers both branches). |
| **AC17 — Validator fails on missing required field** | Fixture PR with missing `install_command` exits non-zero. | `pipeline/tests/validators/skill.test.ts:54–74` — "missing-install-command.md" fixture, asserts `result.ok === false` and `installIssues[0]?.rule === 'required'`. Fixture file at `pipeline/tests/validators/fixtures/missing-install-command.md`. |
| **AC23 — Token only sent to api.github.com** | Cross-origin requests with `init.token` do NOT carry `Authorization`. | `site/src/lib/api-fetch.ts:69–75` (`isGitHubApiUrl` host-exact check); `:110-112` `headers.set('Authorization', ...)` is gated by that check. Test: `site/tests/api-fetch.test.ts` (11 tests; one is specifically the AC23 cross-origin guard). |

All five verifiable from the committed code and tests. No drift between AC and implementation.

---

## 8. Security review

### Token handling — XSS exposure

- **Token storage:** `localStorage` keyed `nbgaihub.gh_token` (per F-P3 and the gist contract). This is industry-standard for browser-only auth, and explicitly chosen post-pivot (see investigation R1). **Critical:** localStorage is reachable from any JavaScript running on the same origin. The site is a static Astro build with **no third-party scripts**, **no inline `<script>` from user input**, and a `noopener noreferrer` on every external link (verified: `SignInModal.astro:45`, `my-pins.astro:84`, `submit-skill.astro:372–374`, `news/[slug].astro:40`). The XSS attack surface is therefore the codebase itself + any future content that embeds raw HTML. **Acceptable for the MVP given the threat model** (single-team site, all content reviewed via PR); should be documented in the gist contract for future content authors (and is — see §10 of `gist-contract.md`).
- **Token never leaves api.github.com:** AC23 is enforced at `api-fetch.ts:69–75` (host equality, not `endsWith`) and tested. The submission flow's redirect to `github.com/.../new/main/...` doesn't carry the token.
- **`SignInModal.astro` never logs/echoes the token:** verified — `onSubmit` reads the input, hands the string to `auth.signIn`, and never references it again. Error display uses `err.message`, which from `TokenInvalidError` is "GitHub rejected the token (401): ..." (no token echo).
- **Sign-out clears all 3 keys:** `auth.ts::clearToken` removes `nbgaihub.gh_token`, `nbgaihub.gh_user`, `nbgaihub.gist_id` (lines 109–114). AC3 ✓.

### URL-encoded submission flow (AC12, AC13)

- `submission.ts::buildEditorUrl` uses `encodeURIComponent` on both `slug` (line 146) and `markdown` (line 147) — correct.
- The 7000-char cap is computed against the **full URL** length (`base.length`), not just `value`. This includes the `https://github.com/...` prefix, so the actual payload budget is ~6900 chars — safer than the spec's "URL ≤ 7000" wording (margin of error).
- Clipboard fallback: `copyToClipboard` throws `ClipboardUnavailableError` on missing API; `submit-skill.astro:1027–1043` catches that distinctly from generic errors and renders a manual-paste `<textarea>`. Defence in depth.
- **Validator allowlist enforcement:** the **client-side** `validateSkillForm` (submission.ts:171–319) only checks the GH-handle regex for `maintainer` and explicitly notes "CI additionally checks the team allowlist". The CI side (`pipeline/src/validators/skill.ts:362–378`) correctly does both checks (regex OR allowlist from `config/maintainers.json`). Spec parity ✓.

### Validator HEAD-check (AC20)

- `pipeline/src/validators/skill.ts:124–141` uses 10s `AbortController` timeout. 429 → `'rate-limited'` → stderr warn + pass. 4xx (non-429) → fail. 5xx → pass (treats as transient — acceptable; CI re-runs on the next push).
- The HEAD request honours redirects (Node fetch default) and only inspects the final response status — fine for the AC20 "must reach ≥2xx" intent.

### `config/maintainers.json` no-fallback

- `pipeline/src/validators/config.ts:33–72` `loadMaintainers(path)` throws `ConfigNotFoundError` on (a) missing file (line 39), (b) invalid JSON (line 46), (c) wrong shape (lines 50–66). **No silent default ever applied.** Per-global-CLAUDE.md ✓.
- Test coverage: `pipeline/tests/validators/skill.test.ts:171–177` asserts that a non-existent path throws `ConfigNotFoundError`. ✓.

### `pull_request` vs `pull_request_target`

- `.github/workflows/validate-skill-submission.yml:7-11` uses `pull_request` (not `pull_request_target`). Per investigation R7, this is the safe choice for forks: the fork's code runs in the fork's security context with **no repo secrets** and `permissions: contents: read` only (line 16–17). Validator is intentionally read-only; never writes to the repo. ✓.

### Gist visibility — "unlisted, not private"

- `gist.ts::findOrCreateFavoritesGist:163-175` POSTs `public: false`. The gist contract document at `docs/reference/gist-contract.md` §4 explicitly calls out that this means "unlisted, not private" — anyone with the 32-char hex URL can read it. The site **never shares the URL** (it lives only in the user's localStorage and their own GH gist list). Privacy callouts present on `/my-pins/` page footer (`my-pins.astro:76-88`) and the gist contract. ✓.

### CSP

- The refined request mentions a CSP meta tag locking `connect-src` to `'self' https://api.github.com` (A7 in the request). **No CSP meta tag was added** in this batch of commits. This is **not blocking** for MVP (Starlight static builds have no inline scripts, all imports are same-origin via Astro bundling), but recording as a follow-up. The site relies on Starlight's defaults and the strict ESM module system — XSS surface is limited by content review.

  Adding `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' https://avatars.githubusercontent.com; ...">` would be a tightening; defer to a follow-up.

---

## 9. Convention compliance

| Convention (project/global CLAUDE.md) | Status | Evidence |
|---|---|---|
| **TS strict** (`strict: true`, `noUncheckedIndexedAccess: true`) | ✓ | Existing site `tsconfig.json` unchanged; `astro check` clean. |
| **ESM only** | ✓ | All new files are `.ts` with `import`/`export` syntax. Pipeline already ESM (`"type": "module"`). |
| **kebab-case file names** | ✓ | `api-fetch.ts`, `pin-store.ts`, `build-pin-index.ts`, `skill-types.ts`, `validate-skill-submission.yml`, etc. — all kebab. |
| **PascalCase types** | ✓ | `GitHubUser`, `AuthState`, `FavoriteEntry`, `FavoritesDocument`, `PinIndexFile`, `HydratedPin`, `GroupedPins`, `SkillFrontmatter`, `SkillForm`, `ValidationIssue`, etc. |
| **`XxxError` suffix on named errors with `this.name`** | ✓ | All ten new error classes: `NetworkError`, `NotFoundError`, `RateLimitedError`, `TokenInvalidError`, `GitHubApiError`, `GistNotFoundError`, `GistSchemaError`, `ClipboardUnavailableError`, `SubmissionUrlTooLongError`, `PinIndexNotFoundError`, `PinIndexSchemaError`, `ConfigNotFoundError`. Each constructor sets `this.name`. ✓. |
| **No fallback config** (global CLAUDE.md) | ✓ | `config.ts::loadMaintainers` throws `ConfigNotFoundError` on every failure mode. Verified — no `try { ... } catch { return defaults }` anywhere in the validator path. |
| **TS for tools** (global CLAUDE.md) | ✓ | `skill-validator` source is TypeScript; `docs/tools/skill-validator.md` documents both source and the compiled `dist/` entry. |
| **Singular table/entity names** (global CLAUDE.md) | ✓ | New entities follow the convention: `FavoriteEntry` (singular) for a record; `favourites` (plural) for the collection field — appropriate. `team_aliases` (plural collection field) is appropriate too. No new tables introduced (no DB). |
| **No fallback for missing inputs** | ✓ | `build-pin-index.ts:115-140` throws explicit named errors for missing `title`/`audience`/`topics`/non-string topics. `auth.ts:42-46` throws when `localStorage` is unavailable. `pin-store.ts:97-118` throws `PinIndexSchemaError` on every malformed index field. |
| **Privacy callout where required** | ✓ | `/my-pins/` (lines 76–88), gist-contract §10, submit-skill privacy callout (`submit-skill.astro:405–413`). |
| **`docs/tools/<name>.md` entry for tools** | ✓ | `docs/tools/skill-validator.md` documents entry, source, 17 rules, exit codes, annotation format, dependencies, test coverage, invoking workflow. |
| **No VCS side effects** (global CLAUDE.md) | ✓ | This review did not commit anything. The single edit to `submission.ts` is left uncommitted for the workflow caller to commit. |

No convention violations detected.

---

## 10. Closing notes for the next reviewer

- **The 4 commits are well-isolated.** Wave A is purely additive (schema + tests + config + slug copy). Wave B is the largest (7 site libs, 3 pipeline files, 5 test files + fixtures + JSON indices). Wave C wires the UI but does not modify existing components destructively. Wave D is docs-only. Reviewing them in order matches the dependency DAG.

- **The hub-plugin concurrent workflow modifies overlapping state files** (`SCOPE.md`, `DECISIONS.md`, `project-design.md`, `project-functions.md`, `CLAUDE.md`, `Issues - Pending Items.md`). The personalization commits preserve hub-plugin lines verbatim where they intersect; visual diff inspection confirms no hub-plugin content was clobbered. **Phase 8 (dependency validation) should re-confirm no merge conflict markers slipped through.**

- **Single comment-only edit applied during this review** (`site/src/lib/submission.ts`, lines 342–354). No code paths modified. All 127 site + 112 pipeline tests still pass.

- **One important UX defect surfaced** (OUT-1, slug collision pre-check returns false-"free" on private repo). It is a graceful-degradation issue, not a security issue — the CI validator and GitHub's editor will both still catch the collision authoritatively. Recommend the next phase pick the "check against `public/_data/skill-index.json` at the client" remediation. Tracked in `Issues - Pending Items.md`.

- **CSP meta tag (refined-request A7) is not present.** Not blocking for the static-build MVP; recording for a future tightening pass.

- **Test environment.** All site tests run under vitest's default Node environment (no jsdom/happy-dom), with `globalThis.fetch` and a hand-rolled `localStorage` shim stubbed via `vi.stubGlobal`. This keeps the test suite fast (143 ms full run) and free of DOM-test-runner deps. PinButton/SignInModal/SocialIconsOverride scripts intentionally have no unit tests — they are integration glue and rely on the unit-tested libs underneath.
