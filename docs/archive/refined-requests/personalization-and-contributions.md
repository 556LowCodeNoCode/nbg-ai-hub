# Refined Request: Personalization (Favourites) and Community Contributions for NbgAiHub

> **Post-pivot TL;DR (2026-05-18).** Favourites are backed by a per-user GitHub gist; the user authenticates by **pasting a classic Personal Access Token (PAT) with the `gist` scope only** (no OAuth App, no Device Flow, no Cloudflare Worker — see the investigation doc for the CORS-driven pivot). Skill submissions are **anonymous** and never call write APIs from the browser — the form serialises the markdown and redirects to `github.com/.../new/main/skills?filename=...&value=...`, letting GitHub's native UI handle fork/branch/PR mechanics. The CI validator on `skills/*.md` PRs is unchanged.

## Category

Development (frontend feature + GitHub-as-backend integration + CI validator). Touches the existing `site/` workspace and adds a `.github/workflows/` validator. Reverses two SCOPE.md decisions.

## Objective

Add per-user personalization and a low-friction skill-submission flow to NbgAiHub, both backed by GitHub (no servers, no proxies). Personalization = each signed-in user (signed in = "has pasted a valid PAT with `gist` scope into the site") can pin/unpin any hub content item (news, skill, tip, glossary term, journey step) from the website, stored in an unlisted GitHub gist they own; the future Claude-side `/hub-*` skill will read/write the same gist so state syncs across surfaces. Community contributions = anyone (no auth required) can submit a new Skills-catalog entry via a guided web form that serialises the markdown and redirects to GitHub's native new-file URL, where GitHub's own UI runs the fork/branch/PR flow. A CI validator enforces frontmatter discipline on every `skills/*.md` PR. Anonymous browsing must remain unbroken throughout. This phase delivers the web side and the documented gist data contract — the Claude-side `/hub-*` skill itself is out of scope here.

## Scope

### In scope

- **Authentication on the site** via **PAT paste UX** (no OAuth App, no Device Flow, no Cloudflare Worker). The "Sign in" affordance opens a modal that:
  1. Explains plainly: *"To pin items across devices, paste a GitHub Personal Access Token with the `gist` scope. NbgAiHub uses it only to read/write your own favourites gist."*
  2. Links to `https://github.com/settings/tokens/new?scopes=gist&description=NbgAiHub` (this URL pre-fills the scope checkbox and the token name on GitHub's token-creation page).
  3. Accepts the pasted token in a password-style input.
  4. Validates the token by issuing `GET https://api.github.com/user` with `Authorization: token <pasted>`. **200** → store; **401** → surface "invalid or expired token" error and keep the modal open.
  Successful validation stores the token in `localStorage` under the single declared key `nbgaihub.gh_token`. The user's login handle (from the validate response) is cached at `nbgaihub.gh_user` for header rendering. Sign-out clears `nbgaihub.gh_token`, `nbgaihub.gh_user`, and `nbgaihub.gist_id`.
- **Favourites store** = one **unlisted gist per user**, owned by the user (not by the project repo), named exactly `nbgaihub-favorites.json`. Created lazily on the user's first pin. Content shape (canonical, wrapped per A12 below):

  ```json
  {
    "schema_version": 1,
    "favourites": [
      {"type":"skill","slug":"create-api","pinned_at":"2026-05-18"},
      {"type":"tip","slug":"esc-esc","pinned_at":"2026-05-18"}
    ]
  }
  ```

  Where `type ∈ {news, skill, tip, glossary, journey-step}` (mirrors `content.config.ts` `type` literals) and `slug` is the URL slug used by the site routes for that content item.
- **Pin / unpin UI** on every content item (cards in catalog pages + per-item pages where applicable). Replaced with a "Sign in to pin" affordance when anonymous (modal-triggered — see A10).
- **"My Pins" page** at `/my-pins/` listing the signed-in user's pinned items grouped by `type` (one section per content type, items sorted by `pinned_at` descending). Anonymous visitors see a sign-in prompt instead.
- **Skill submission form** at `/submit-skill/` — **anonymous-accessible** (no PAT required to use the form). Form fields map 1:1 to the canonical Skill frontmatter (see Skill frontmatter schema below) plus a markdown body field. On submit:
  1. Client serializes the markdown: a YAML frontmatter block (delimited by `---` lines) followed by the body.
  2. Client URL-encodes the serialised markdown.
  3. Client opens (in the same tab or a new tab — see A24) the URL `https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=<urlencoded-content>`.
  4. GitHub's own UI renders with the file pre-filled. The visitor reviews, clicks "Propose new file" (anonymous → fork-and-PR flow on their account) or "Commit new file" (collaborators with write access). GitHub handles all fork/branch/PR mechanics. **The hub never calls any GitHub write API for submissions.**
  5. **URL length guard.** If the URL-encoded content would push the full URL past **7000 characters** (conservative cutoff below the ~8KB Chrome/Firefox practical limit per R3-pivot below), the form switches to a fallback: copy the serialised markdown to the user's clipboard via `navigator.clipboard.writeText()`, then redirect to `https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md` (no `value=`), with on-screen instructions "Your submission was copied to the clipboard — paste it into the editor on the next screen."
  6. **Slug collision pre-check.** Before submit, the form attempts `GET https://api.github.com/repos/chomovazuzana/NbgAiHub/contents/skills/<slug>.md` (unauthenticated). 200 → "A skill with this slug already exists — pick a different title"; 404 → OK; 403/429 → "Rate-limited; skipping collision check" warning, allow submit anyway.
- **Skill frontmatter schema extension.** The Skills collection schema in `site/src/content.config.ts` gains the following required fields on top of the existing 10-key base shape:
  - `install_command` (string, required) — must start with `/plugin marketplace add ` or `/plugin install ` (allowlist, no arbitrary shell).
  - `skill_id` (string, required) — canonical slash-command name; pattern `^[a-z0-9-]+$`.
  - `origin` (enum, required) — one of `internal`, `community`, `external` *(exact labels open — see Assumption A8)*.
  - `category` (enum, required) — one of `workflow`, `code`, `docs`, `integration`, `productivity`, `testing`, `other` *(open — see Assumption A9)*.
  - `status` (enum, required) — one of `active`, `experimental`, `deprecated`.
  - `maintainer` (string, required) — either a GitHub handle (`@foo`) or a value from a known-teams allowlist file at `config/maintainers.json`.
  - `requires` (string[], optional) — free-text strings, e.g. `["Node 20+", "Azure OpenAI key"]` *(open: free-text vs controlled vocabulary — see Assumption A10)*.
- **CI validator** at `.github/workflows/validate-skill-submission.yml` invoking a TypeScript validator under `pipeline/src/validators/`. Runs on `pull_request` events that touch `skills/**/*.md`. Validation rules:
  1. All required frontmatter fields present and non-empty.
  2. Enum values valid for `audience`, `origin`, `category`, `status`.
  3. `external_link` is reachable (HEAD returns 2xx or 3xx within 10s timeout; skipped — not failed — on HTTP 429 rate-limit response, with a logged warning).
  4. `install_command` starts with `/plugin marketplace add ` or `/plugin install ` (literal prefix match).
  5. `skill_id` matches `^[a-z0-9-]+$`.
  6. `maintainer` is a GitHub handle (`^@[A-Za-z0-9][A-Za-z0-9-]{0,38}$`) **or** appears verbatim in `config/maintainers.json`.
  7. `authored` and `last_reviewed` are valid `YYYY-MM-DD` dates (already covered by the Zod schema; re-validated by the CI tool defensively).
  8. The file path matches `skills/<slug>.md` where `<slug> === skill_id`.
- **Documented gist data contract** at `docs/reference/gist-contract.md`: the JSON shape, key names, ordering, the `localStorage` token key, the gist filename, idempotency guarantees, the read-modify-write protocol (R4 in the investigation), and the explicit "unlisted, not private" wording (R2). Sufficient for the future Claude-side `/hub-*` skill to implement the same store via `gh api gists/...` without further design work.
- **SCOPE.md reversal + DECISIONS.md entry.** Move "Per-user personalization or bookmarking" out of "Out of scope — NO" and "Community contributions (PRs from outside the team)" out of "Deferred — LATER" into the MVP-IN table. Append a new dated DECISIONS.md entry recording the reversal and the architectural choices (PAT paste + gist + URL-redirect submissions).
- **project-design.md update** — new section describing the personalization architecture (PAT paste, gist contract, "My Pins" page, URL-redirect submission flow, validator).
- **project-functions.md update** — new functional contract block (F-numbers) for this feature set.

### Out of scope (this workflow)

- **The Claude-side `/hub-*` skill itself.** This phase delivers the data contract and the web-side reader/writer. Implementing the skill consumer is a separate workstream.
- **Aggregated team-wide stats** ("most pinned", "trending skills"). Privacy implications + requires a different storage model. Deferred.
- **Backend search / personalised recommendations.** No server, no embeddings index. Deferred.
- **OAuth App / Device Flow / Cloudflare Worker proxy.** Explicitly removed by the 2026-05-18 pivot (see investigation doc R1).
- **Pinning UX for non-content pages** (e.g., `/reference`, `/contribute`, the homepage). Only the five content collections.
- **Editing / deleting existing skills via web form.** Submission is *new entries only*; edits remain a manual PR.
- **Branding / theming of the sign-in screen** beyond the inline PAT-paste copy.
- **Multi-account support** (signing in as more than one GitHub identity simultaneously).
- **Server-side rate limiting, abuse mitigation, anti-spam.** GitHub's own per-token API limits are the only ceiling.
- **Pin order persistence beyond `pinned_at` sort.** No drag-to-reorder, no manual sort.
- **Pinning gating by `audience` or `internal` flag.** All visible content is pinnable.
- **In-browser markdown preview** for the submission form (deferred per A16).

## Requirements

### Functional

1. **F-P1 — PAT-paste sign-in.** A "Sign in" button is present in the site header (rendered via Starlight `SocialIcons` slot override per R6 from the investigation). Clicking it opens a modal explaining the PAT scope (`gist` only) and providing a deep-link to `https://github.com/settings/tokens/new?scopes=gist&description=NbgAiHub`. The modal contains a password-style input for the token plus a "Validate & sign in" button.
2. **F-P2 — Token validation.** On submit, the site issues `GET https://api.github.com/user` with `Authorization: token <pasted>`. **200** → extract `login`, store the token at `nbgaihub.gh_token` and the handle at `nbgaihub.gh_user`, close the modal, re-render the UI. **401** → surface "invalid or expired token" inline in the modal; do not store. **Other 4xx/5xx** → surface the status + message; do not store.
3. **F-P3 — Token storage.** Tokens live in `localStorage` only, under `nbgaihub.gh_token`. No cookies. No session storage. Never sent to any origin other than `https://api.github.com`. The token has no expiry per GitHub PAT semantics (unless the user set one); revocation is user-mediated at `https://github.com/settings/tokens`.
4. **F-P4 — Auth state propagation.** A small client-side auth module (e.g. `site/src/lib/auth.ts`) exposes `getToken()`, `getUser()`, `signIn(token: string)`, `signOut()`, and a `subscribe(callback)` for components to react to login/logout. Components that render auth-conditional UI must use this module; no direct `localStorage` reads scattered across components.
5. **F-P5 — Sign-out.** A "Sign out" affordance is visible when authenticated. Clicking it removes `nbgaihub.gh_token`, `nbgaihub.gh_user`, and `nbgaihub.gist_id` from `localStorage` and triggers a UI re-render so pin buttons revert to "Sign in to pin". The gist itself is **not** deleted (the user owns it; they can delete it manually on github.com).
6. **F-P6 — Anonymous browsing parity.** Every page that exists today must continue to render identically for an anonymous visitor (no auth required for browsing news, skills, tips, glossary, journeys, audience filter, search). The only anonymous-visible difference: pin buttons show "Sign in to pin" with a click handler that opens the sign-in modal. The submission form at `/submit-skill/` is also anonymous-accessible.
7. **F-P7 — Pin button UX.** On every content card and on per-item pages where applicable, render a pin button. When signed in: button shows pinned/unpinned state. When clicked, optimistically toggles UI state, then performs the read-modify-write gist update (see F-P9). On failure, reverts UI and surfaces a user-visible toast/alert with the error message.
8. **F-P8 — Lazy gist creation.** On the user's first pin, the site issues `GET /gists` with the user's token and scans for a gist whose `files` map contains the key `nbgaihub-favorites.json`. If absent, it issues `POST /gists` to create a new unlisted gist (`public: false`) with that file containing the initial wrapped JSON document. The gist `id` is cached in `localStorage` under `nbgaihub.gist_id` for subsequent reads/writes.
9. **F-P9 — Gist read-modify-write protocol.** Every pin/unpin operation:
   1. `GET /gists/<id>` — fetch current state.
   2. Parse `files['nbgaihub-favorites.json'].content` as JSON, validate `schema_version === 1`, work on the `favourites` array.
   3. Apply the operation (add deduped on `(type, slug)`; remove by `(type, slug)`).
   4. `PATCH /gists/<id>` with the full new content.
   This is two API calls per write but is the only safe protocol given GitHub's lack of optimistic concurrency on gists (R4). If the cached `nbgaihub.gist_id` is stale (404), re-run the discovery step (F-P8).
10. **F-P10 — Pin payload shape.** Each pin record is exactly `{"type": <type-literal>, "slug": <string>, "pinned_at": <YYYY-MM-DD>}`. No additional fields. Records are deduplicated by `(type, slug)`. Order is insertion order; new pins append.
11. **F-P11 — "My Pins" page.** `site/src/pages/my-pins.astro` renders a shell; a client-side script fetches the gist, joins each pin record's `(type, slug)` against a pre-baked client-side index (`public/_data/<type>-index.json` per A21), and renders one section per content type (order: skill, tip, news, journey-step, glossary). When anonymous, shows a "Sign in to see your pins" panel. Gist records whose `(type, slug)` no longer exist in the index render as a dimmed "Pinned item no longer available — [unpin]" row.
12. **F-P12 — Submission form page.** `site/src/pages/submit-skill.astro` renders a multi-section form for all required Skill frontmatter fields plus a markdown body `<textarea>`. **Anonymous-accessible** — no PAT required. Client-side validation enforces the same rules as the CI validator (frontmatter completeness, `install_command` prefix, `skill_id` regex, enum values). Submit button is disabled until all required fields are valid.
13. **F-P13 — Submission: serialise markdown.** On valid form submission, the client assembles the file content as a YAML frontmatter block (opened and closed by `---` lines, fields in a stable canonical order) followed by the body, ending in a single trailing newline.
14. **F-P14 — Submission: URL-redirect flow (happy path).** The serialised content is URL-encoded (`encodeURIComponent`). The client computes the target URL `https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=<urlencoded-content>`. If the resulting URL length is **≤ 7000 characters**, navigate to it directly (the form opens it via `window.location.assign(url)` or by setting `<a target="_blank">` href and triggering a click — see A24).
15. **F-P15 — Submission: clipboard fallback for oversize payloads.** If the URL would exceed **7000 characters**, the client:
   1. Calls `navigator.clipboard.writeText(serialised)`; on rejection (e.g. permissions denied), shows the serialised text in a `<textarea readonly>` with a "Copy" button and an explanation.
   2. Navigates to `https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md` (no `value=`).
   3. Surfaces an on-screen instruction: "Your submission was copied to the clipboard — paste it into the editor on the next screen, then click 'Propose new file'."
16. **F-P16 — Submission: slug collision pre-check.** Before serialising, attempt `GET https://api.github.com/repos/chomovazuzana/NbgAiHub/contents/skills/<slug>.md` (no auth header). **200** → block submit with "A skill with this slug already exists — pick a different title"; **404** → OK; **403/429/network error** → log a non-blocking warning and allow submit anyway. The slug is derived client-side from the title via the same kebab-case + 60-char rule used by `pipeline/src/slug.ts` (see A23).
17. **F-P17 — Skill schema extension.** `site/src/content.config.ts` is updated so the `skills` collection schema layers the 7 new fields (`install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`, `requires`) on top of the existing 10-key base shape. Build must remain green.
18. **F-P18 — CI validator workflow.** `.github/workflows/validate-skill-submission.yml` runs on `pull_request` (opened, synchronize, reopened) when `paths: ['skills/**/*.md']`. The job invokes a TypeScript validator (entry point `pipeline/src/validators/skill.ts`) over every changed `skills/*.md` file. Failures are reported via GitHub Checks UI with `::error file=...` annotations naming file path + field + specific rule. Uses default `GITHUB_TOKEN`; never writes to the repo.
19. **F-P19 — Maintainer allowlist file.** `config/maintainers.json` is created with shape `{"team_aliases": ["@nbg-ai-team", ...]}`. A maintainer value passes validation if it matches the GitHub-handle regex **or** appears in this allowlist verbatim. File starts with at least one initial alias.
20. **F-P20 — Gist contract document.** `docs/reference/gist-contract.md` documents: localStorage keys (`nbgaihub.gh_token`, `nbgaihub.gh_user`, `nbgaihub.gist_id`), gist filename, **unlisted (not private) visibility** per R2, JSON schema with example, read-modify-write protocol, dedup rule, idempotency guarantees, error modes, the explicit "Claude-side skill MUST follow this same contract" callout, and the privacy callout from F-P21.
21. **F-P21 — Privacy posture documented.** The gist contract document and the `/my-pins/` page footer must state plainly: *"Your pins live in an unlisted gist on your own GitHub account — unlisted means anyone with the URL can read it, but the URL is a 32-char hex id and is never shared by NbgAiHub. The site uses your `gist`-scoped token only to read/write that one file. NbgAiHub does not see or store your pins. To fully revoke access, delete the token at github.com/settings/tokens."*
22. **F-P22 — SCOPE.md reversal.** Two existing SCOPE.md entries change category:
   - "Per-user personalization or bookmarking" → moved into "MVP scope — IN".
   - "Community contributions (PRs from outside the team)" → moved into "MVP scope — IN".
   - The MVP scope table gains two new rows with their initial status; the demo-ability checklist gains a row for "Signed-in user can pin and see pins on /my-pins/" and "Anonymous visitor can submit a skill via /submit-skill/ and reach GitHub's editor with the content pre-filled".
23. **F-P23 — DECISIONS.md entry.** Append a new dated 2026-05-18 entry titled (proposed) *"Personalization + community contributions: PAT-scoped gist + URL-redirect submissions (no OAuth App, no proxy)"*. Captures: the SCOPE reversals; the architectural choice of **PAT paste over Device Flow** (driven by R1 CORS finding); the choice of unlisted user-owned gist; the choice of URL-redirect submissions over browser-side fork/PR API calls; the explicit privacy posture; the alternatives considered (OAuth App + Cloudflare Worker — rejected; Browser-side write APIs — rejected).
24. **F-P24 — project-design.md update.** Add new sections describing: PAT-validate sequence, gist read-modify-write sequence, `/my-pins/` page wiring, URL-redirect submission flow with clipboard fallback, validator workflow architecture. Update existing skill schema section to reflect the 7 new fields.
25. **F-P25 — project-functions.md update.** Append a new `## Personalization & contributions (plan-NNN-personalization)` block listing F-P1..F-P25 functional contracts (with descriptions, not just titles).

### Non-functional

26. **NF-P1 — TypeScript strict** across all new code. `"strict": true`, `"noUncheckedIndexedAccess": true` (matches existing site config).
27. **NF-P2 — No fallback config.** Per global CLAUDE.md, missing required configuration (e.g. missing `config/maintainers.json` when validator runs) must throw a named, descriptive exception. **Note:** the PAT-paste architecture has no required build-time auth config — there is no `client_id` env var to forget. Submissions and slug collision checks point at a hardcoded repo path (`chomovazuzana/NbgAiHub/main/skills`), which may itself be promoted to a config in a future phase but is acceptable as a constant for MVP.
28. **NF-P3 — Tool implementations are TypeScript.** Per global CLAUDE.md, the CI validator is implemented in TypeScript. If a reusable `docs/tools/<name>.md` tool entry is created, it documents the tool per project conventions.
29. **NF-P4 — Anonymous build path unchanged.** `npm run build` continues to produce a fully-functional static site that works without any GitHub API calls at view time. Authenticated features and the submission form are entirely client-side overlays.
30. **NF-P5 — No runtime AI on the site** (per existing DECISIONS.md). All new features are inert with respect to AI inference.
31. **NF-P6 — Dev port unchanged** (4321 per project CLAUDE.md `## Ports`).
32. **NF-P7 — Singular naming.** Per global CLAUDE.md, any new schema-like artifact uses singular naming where it represents a single entity. Plural reserved for collections.
33. **NF-P8 — No version-control side effects** during implementation (per global CLAUDE.md).
34. **NF-P9 — `astro check` clean.** All new schema changes and `.astro` components must keep `cd site && astro check` exiting 0.
35. **NF-P10 — `npm run build` clean.** All new code must keep `cd site && npm run build` exiting 0 with `dist/` containing `/my-pins/index.html`, `/submit-skill/index.html`.
36. **NF-P11 — Tests.** Each new functional unit (auth module, gist client, submission serialiser + URL builder + clipboard fallback, validator) must have unit-test coverage proving its contract. Reuse Vitest (already in `pipeline/`). Component-level tests for `.astro` files remain out of scope per refined-request astro-starlight-site A9, except for the validator and pure-TS modules.
37. **NF-P12 — Lint clean.** Project lint rules must pass on all new files.
38. **NF-P13 — No new deprecated direct deps.** `npm install` for any newly-added dependencies must not surface deprecation warnings.

## Constraints

- **Global CLAUDE.md** rules apply: no fallback config, TypeScript for tools, singular naming, no VCS ops without instruction, Issues - Pending Items.md updated.
- **Project CLAUDE.md** rules apply: re-read SCOPE.md and DECISIONS.md before touching scope; append (never edit) DECISIONS.md; update SCOPE.md in the same edit as the change; *"what I wish I knew a year ago"* tone for all hand-authored content.
- **Astro 6 + Starlight 0.39** are pinned. No version bumps as a side effect of this work.
- **Node 22 / ESM** per existing site workspace conventions.
- **The repo is `chomovazuzana/NbgAiHub` (private)**. PAT-scoped gist reads/writes against `api.github.com` work browser-direct (CORS is supported there). Submissions go via GitHub's own UI, so cross-fork PRs into a private repo work natively for any user who can see the repo.
- **No server, no serverless, no proxy.** Everything happens in the static site against `https://api.github.com` directly, plus a redirect to `github.com/.../new/...` for submissions. The PAT-paste UX is the load-bearing reason this is possible (no OAuth handshake = no CORS-blocked endpoints).
- **`docs/tools/` convention.** If a reusable tool is created (e.g. the validator), it gets a `docs/tools/<name>.md` entry per global CLAUDE.md.
- **CI validator runs against PRs from forks.** `pull_request` (not `pull_request_target`) runs in the fork's security context with read-only `GITHUB_TOKEN` and no repo secrets. Per R7 in the investigation.
- **No changes to the existing RSS pipeline behaviour.** The validator may live in the `pipeline/` workspace for code-sharing convenience, but must not be invoked by `.github/workflows/rss-triage.yml`.
- **The five existing content collections** (`news`, `skill`, `tip`, `glossary`, `journey-step`) are canonical — no new collection types introduced.

## Acceptance Criteria

Each criterion is falsifiable. A verifier produces concrete evidence (test name, file:line, observed HTTP response, built artifact contents) demonstrating pass/fail.

- **AC1 — PAT-paste sign-in completes end-to-end.** Evidence: documented manual test or integration test: open modal, paste a valid classic PAT with `gist` scope, click validate. Site receives 200 from `GET /user`, stores `nbgaihub.gh_token` and `nbgaihub.gh_user`, closes the modal, header shows the user's login. Failing variant: invalid token → modal stays open with a named "invalid or expired token" error.
- **AC2 — Token persistence across page reloads.** Evidence: after AC1, reload the page; the header shows the signed-in state without re-prompting. `nbgaihub.gh_token` still present.
- **AC3 — Sign-out clears all auth state.** Evidence: clicking "Sign out" removes `nbgaihub.gh_token`, `nbgaihub.gh_user`, and `nbgaihub.gist_id` from `localStorage`. Header reverts to "Sign in".
- **AC4 — Anonymous browsing unchanged.** Evidence: every existing page returns 200 and renders without JS errors when no token is present. Pin buttons either render with "Sign in to pin" affordance or are hidden — neither causes a layout shift, console error, or 4xx/5xx.
- **AC5 — Pinning first item creates an unlisted gist.** Evidence: with a freshly-authenticated test account that has no `nbgaihub-favorites.json` gist, clicking pin issues `POST /gists` with `public: false` and the wrapped JSON shape (`schema_version: 1`, `favourites: [<record>]`). Gist id is cached at `nbgaihub.gist_id`.
- **AC6 — Subsequent pin uses read-modify-write.** Evidence: the second pin issues `GET /gists/<id>` then `PATCH /gists/<id>` (two calls, not one POST). The PATCH body's content contains both records, deduplicated by `(type, slug)`.
- **AC7 — Unpin removes the record via read-modify-write.** Evidence: a `GET` + `PATCH` pair; the PATCH content omits the targeted `(type, slug)` record.
- **AC8 — `/my-pins/` renders pinned items when signed in.** Evidence: with two pinned items of different types, the page renders two sections, each containing one card. Cards route to the source content page.
- **AC9 — `/my-pins/` anonymous state.** Evidence: visiting `/my-pins/` with no token shows the "Sign in to see your pins" panel. No JS errors. No 4xx/5xx.
- **AC10 — `/my-pins/` handles stale references.** Evidence: a gist record pointing at a `(type, slug)` not present in the build-time index renders a dimmed "Pinned item no longer available — [unpin]" row.
- **AC11 — Submission form happy path opens GitHub's editor.** Evidence: signed-out (anonymous) user fills all required fields; click Submit. Browser navigates to `https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=...` and the GitHub editor renders with the filename and content pre-filled. Manual verification: clicking "Propose new file" on GitHub completes the fork/branch/PR flow.
- **AC12 — Submission form: URL-length fallback triggers correctly.** Evidence: a unit test with a body padded past the 7000-char URL threshold confirms the client takes the clipboard-fallback branch — `navigator.clipboard.writeText` is called and the navigation URL omits `?value=`. A second test under 7000 chars confirms the direct-redirect branch is taken.
- **AC13 — Submission form validation: invalid `install_command`.** Evidence: entering an `install_command` that does not start with `/plugin marketplace add ` or `/plugin install ` surfaces an inline error and disables Submit. No navigation occurs.
- **AC14 — Submission form validation: invalid `skill_id`.** Evidence: `Skill_ID!` surfaces a regex-mismatch error inline and disables Submit.
- **AC15 — Submission form slug collision pre-check.** Evidence: with a slug that exists in the repo (`GET .../contents/skills/<slug>.md` returns 200), Submit is disabled with a "slug exists" message. With a free slug (404), Submit is enabled. Under simulated 403/429 from the API, Submit remains enabled with a non-blocking warning.
- **AC16 — CI validator passes on a valid `skills/*.md` PR.** Evidence: a fixture PR containing a well-formed `skills/example.md` triggers the workflow which exits 0. GitHub Checks UI shows green.
- **AC17 — CI validator fails on missing required field.** Evidence: fixture PR with `skills/bad.md` missing `install_command` exits non-zero with an error naming `bad.md` and `install_command`. Reproducible via unit test.
- **AC18 — CI validator fails on invalid enum.** Evidence: a fixture with `category: nonsense` causes exit non-zero with a named-file-and-field error.
- **AC19 — CI validator fails on bad `install_command` prefix.** Evidence: a fixture with `install_command: rm -rf /` exits non-zero with a "must start with `/plugin marketplace add ` or `/plugin install `" error.
- **AC20 — CI validator rate-limit tolerance.** Evidence: a unit test where `external_link` HEAD returns 429 results in the validator logging a warning and exiting 0.
- **AC21 — Gist JSON schema conformance.** Evidence: every write parses as `{schema_version: 1, favourites: [...]}` whose every element matches `{type, slug, pinned_at}` with `type` in the 5-literal enum, `slug` non-empty, `pinned_at` in YYYY-MM-DD. Unit test against the gist client.
- **AC22 — Gist schema versioning tolerance.** Evidence: the reader treats absence of `schema_version` on legacy reads as `version 1` (logging a one-time warning); the writer always emits `schema_version: 1`.
- **AC23 — Token is only sent to api.github.com.** Evidence: a `fetch` interceptor / unit test asserts every request carrying `Authorization: token ...` has hostname `api.github.com`. No PAT ever sent to GitHub's `github.com` host (submission redirects don't carry the token), and no third-party origin ever receives it.
- **AC24 — SCOPE.md updated.** Evidence: SCOPE.md no longer contains "Per-user personalization or bookmarking" under "Out of scope — NO". The MVP scope table gains rows for "Per-user favourites (PAT + unlisted-gist-backed)" and "Skill submission web form (URL-redirect to GitHub editor)". Demo-ability checklist contains the new rows.
- **AC25 — DECISIONS.md appended.** Evidence: a new dated 2026-05-18 entry describes the SCOPE reversal and the architectural choices (PAT paste over Device Flow, URL-redirect submissions over browser-side write APIs, unlisted gist, no proxy/server). Status: accepted.
- **AC26 — Skill schema in `content.config.ts` includes the 7 new fields.** Evidence: grep `install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`, `requires` in `site/src/content.config.ts`. `astro check` exits 0.
- **AC27 — `config/maintainers.json` exists with the documented shape.** Evidence: file exists; `team_aliases` is a string array; at least one initial alias seeded.
- **AC28 — Gist contract document exists.** Evidence: `docs/reference/gist-contract.md` is present and contains all required sections (localStorage keys, gist filename, **unlisted (not private) language**, schema with example, read-modify-write protocol, dedup, versioning, privacy callout, Claude-side-skill MUST-follow callout).
- **AC29 — project-design.md updated.** Evidence: file gains a new top-level section for the personalization architecture, referenced from the table of contents.
- **AC30 — project-functions.md updated.** Evidence: file gains a new `## Personalization & contributions` block listing F-P1..F-P25 with descriptions.
- **AC31 — No version-control side effects during implementation.** Evidence: `git status` between phases shows only expected file changes; no rogue commits, branches, or pushes.

## Assumptions

Surface every implicit decision so it can be challenged at the assumption gate before execution begins.

- **A1 — Token type: classic PAT with `gist` scope only.** Fine-grained PATs cannot reliably access gists at the time of writing (May 2026; confirmed via GitHub Docs in the investigation doc). The sign-in modal must say "Classic personal access token" explicitly and link to the `?scopes=gist&description=NbgAiHub` URL that pre-fills the classic-token form. Risk: GitHub may add fine-grained gist support later — that would only widen the user's options, not break anything.
- **A2 — Token scope is exactly `gist`.** Not `repo`. Not `public_repo`. Not `read:user`. Only `gist`. This is dramatically narrower than the OAuth App's `repo` scope would have granted. The site's only validity test is "does `GET /user` return 200" — we do not probe other capabilities.
- **A3 — URL-encoded new-file flow uses GitHub's `filename` and `value` query parameters.** These are GitHub's documented (de-facto) parameters on the `/<owner>/<repo>/new/<branch>/<path>` URL — `filename` sets the new file's name, `value` pre-fills its content. Both must be `encodeURIComponent`-encoded. See investigation doc Option C section.
- **A4 — URL length practical limit = 7000 chars (conservative).** Chrome and Firefox tolerate ~8KB URLs in practice; we use 7000 to keep margin for browser headers and GitHub's own routing. Above 7000, fall back to clipboard-copy + bare-URL navigation. See investigation doc.
- **A5 — Clipboard fallback degrades gracefully.** `navigator.clipboard.writeText()` requires a secure context (HTTPS or localhost) and may reject under permission denial. The form must catch the rejection and surface a readonly `<textarea>` with a "Copy" button as the manual fallback.
- **A6 — Validator code lives in the `pipeline/` workspace** under `pipeline/src/validators/skill.ts`. Reuses existing Node 22 + Vitest + TS-strict tooling. Alternative `tools/` workspace rejected for MVP — too much scaffolding overhead.
- **A7 — PAT is stored in `localStorage` only**, never sent to any origin other than `https://api.github.com`. CSP meta tag locks `connect-src` to `'self' https://api.github.com`. No third-party scripts on the site (recorded in DECISIONS.md as a project rule per R3 in investigation).
- **A8 — Schema micro-decision: `origin` enum labels.** **PROPOSED:** `internal`, `community`, `external`. **Alternatives:** `bank-internal`, `nbg-team`, `third-party`. The proposed values are shorter, more generic, and don't bake bank affiliation into the data model. Action: user confirms at assumption-gate.
- **A9 — Schema micro-decision: `category` enum labels.** **PROPOSED:** `workflow`, `code`, `docs`, `integration`, `productivity`, `testing`, `other`. Action: user confirms at assumption-gate.
- **A10 — Anonymous users see pin buttons replaced with a "Sign in to pin" CTA** that opens the modal, rather than hiding the button entirely. Rationale: advertises the feature; nudges sign-in. The submission form is anonymous-accessible — different UX from pinning.
- **A11 — Schema micro-decision: `requires` as free-text vs controlled vocabulary.** **PROPOSED:** free-text string array. Rationale: dependencies are open-ended. Action: user confirms.
- **A12 — Gist schema versioning.** The gist's JSON document is wrapped as `{"schema_version": 1, "favourites": [...]}`. Action: user confirms wrapped shape at assumption-gate.
- **A13 — `pinned_at` precision is calendar-day (YYYY-MM-DD)**, matching `authored` / `last_reviewed` conventions. Same-day ordering is by insertion order.
- **A14 — Schema micro-decision: how `status: deprecated` displays on the site.** **PROPOSED:** a banner across the skill card and per-item page. Action: user confirms.
- **A15 — Sign-in / sign-out UI lives in the Starlight `SocialIcons` slot override**, NOT in `Header`. Per R6 in the investigation: Starlight docs warn against `Header` override; `SocialIcons` is the documented natural fit for top-right header content.
- **A16 — Submission form does not preview the rendered Markdown.** Plain inputs + `<textarea>` for body. Rendering markdown in-browser adds a dep and is non-essential.
- **A17 — Slug is computed client-side** from the title via the same kebab-case + 60-char rule as `pipeline/src/slug.ts` (duplicated per A23). The form shows the computed slug live.
- **A18 — The validator does not verify file path matches slug for edits to existing files.** Feature only supports adding new skills via the form.
- **A19 — "Most pinned" / aggregate views are explicitly omitted** to keep gists unlinked. Documented in F-P21.
- **A20 — No anonymous-side telemetry.** No sign-in attempts, pin events, or submission attempts recorded. GitHub API call logs are the only audit trail.
- **A21 — Build-time pin index** at `public/_data/<type>-index.json` per a standalone `scripts/build-pin-index.ts` invoked pre-`astro build`. Avoids needing a runtime API.
- **A22 — No `git push` from the validator workflow.** Only reads PR diff and posts check annotations.
- **A23 — Reuse of `pipeline/src/slug.ts`.** Duplicated into `site/src/lib/slug.ts` with a vitest drift test on the site side, per established precedent (refined-request astro-starlight-site A4). Tracked in Issues - Pending Items.md.
- **A24 — Submission navigation strategy.** **PROPOSED:** open the GitHub editor URL in a new tab (`window.open(url, '_blank')`) rather than navigating away from the form. Rationale: preserves the form state in case the user wants to retry, and matches how external links are usually opened. Alternative: `window.location.assign(url)` for same-tab. Action: user confirms at assumption-gate.
- **A25 — All new client-side code is ESM-only, written in TypeScript**, transpiled by Astro's bundler.
- **A26 — `Issues - Pending Items.md` known follow-ups to be added during this work:**
  - "If PAT-paste UX proves clunky, consider migrating to OAuth App + Cloudflare Worker proxy later" (softer follow-up — explicitly NOT a blocker).
  - "If/when team-wide aggregate stats become desirable, design an opt-in aggregation that respects gist unlinkedness" (low priority).
  - "Consider extracting a shared schema package between site and pipeline to retire schema duplication" (carries over from astro-starlight-site A4).

## Open Questions

These were not resolved during refinement and should be confirmed at the assumption-gate (Phase 2) or surface as Investigation deliverables.

- **OQ1 — Successor link on deprecated skills.** When `status: deprecated`, should the schema accept an optional `successor_skill_id` field? Aligns with A14's "banner with link" UX. **Default if unresolved:** add `successor_skill_id?: string` (optional, regex `^[a-z0-9-]+$`).
- **OQ2 — Multiple gists named `nbgaihub-favorites.json`.** If a user manually creates a second gist with the same filename, which wins? **Default:** the first one returned by `GET /gists` (= most recently updated). Documented in gist contract.
- **OQ3 — Rate-limit behaviour for the gist write path.** GitHub's per-user authenticated limit is 5000 req/hr. On 429, the site should show a "Rate-limited — try again in a few minutes" toast.
- **OQ4 — Behaviour when user revokes the PAT while the site is open.** The next API call will 401. The site should detect 401 globally, clear `nbgaihub.gh_token`, and prompt re-paste.
- **OQ5 — "Edit existing skill" flow.** Should the form support editing existing skills (would need a different URL pattern targeting `/<owner>/<repo>/edit/main/skills/<slug>.md` and a slug-selector UI)? **Deferred / out of scope** for this phase per the brief. Tracked as a future enhancement.
- **OQ6 — Per-user "Hide internal pins from public view" toggle.** Currently the gist is unlisted, so the URL itself is the access gate. Document the non-issue explicitly in the gist contract.

## Definition of Done

The work is mergeable when all of the following are true. (Sequence here intentionally matches `/team` workflow phases.)

1. **AC1..AC31 all pass with documented evidence** (test names, file:line refs, observed HTTP responses, built artifact contents). Phase 10 integration-verification report covers every AC.
2. **`cd site && npm run build` exits 0**, producing `dist/` containing `/my-pins/index.html`, `/submit-skill/index.html`, and non-empty `dist/_data/<type>-index.json` for each of the 5 content types.
3. **`cd site && astro check` exits 0** with the new schema and new pages.
4. **`cd pipeline && npm test` exits 0** with all new validator tests passing alongside the existing 93 tests.
5. **`.github/workflows/validate-skill-submission.yml` exists** and is exercised by at least one PR fixture (real or simulated) covering both green and red paths.
6. **Lint is clean** on all new files.
7. **No new deprecated direct dependencies** introduced by `npm install` in either workspace.
8. **No fallback values for missing configuration** anywhere in the new code (per global CLAUDE.md). Where a config value is absent, an explicit named exception is thrown.
9. **`config/maintainers.json` is created** with the documented shape and at least one initial entry.
10. **`docs/reference/gist-contract.md` is created** with all sections per F-P20, including the "unlisted, not private" language and the PAT scope documentation.
11. **`docs/design/project-design.md` is updated** with the personalization architecture section.
12. **`docs/design/project-functions.md` is updated** with F-P1..F-P25 functional contracts.
13. **`SCOPE.md` is updated** to reflect the two reversals: "Per-user personalization or bookmarking" and "Community contributions" are moved from out-of-scope/deferred into MVP-IN. Demo-ability checklist gains the relevant rows. *Last updated* timestamp bumped.
14. **`DECISIONS.md` has the new appended entry** dated 2026-05-18 documenting the SCOPE reversal and the post-pivot architectural choices (PAT paste + unlisted gist + URL-redirect submissions; explicit rejection of OAuth App + Worker + browser-side write APIs).
15. **`Issues - Pending Items.md` reflects current state** — the three follow-up items from A26 added, plus any newly-discovered issues during implementation.
16. **CLAUDE.md is updated** if any reusable tool is added (per global CLAUDE.md: `docs/tools/<name>.md` entry). The CI validator is a reusable tool and earns this entry.
17. **No version-control side effects** beyond the final user-authorized commit/push pair.
18. **Manual end-to-end smoke test** documented: paste PAT → header shows handle → pin two items of different types → reload → see pins → visit `/my-pins/` → unpin one → submit a new skill via the form (anonymous works) → land on GitHub's editor with content pre-filled → click "Propose new file" → CI runs and passes.
19. **Privacy callout is visible** on `/my-pins/`, on `/submit-skill/` (different wording — anonymous submission flow), and in the gist contract document.
20. **Anonymous-user smoke test** documented: open every existing page in a fresh browser with no `localStorage`; all return 200; no JS console errors; pin buttons render the "Sign in to pin" CTA; the submission form is fully usable without any auth.
21. **User documentation explains PAT generation** — where (`github.com/settings/tokens/new?scopes=gist&description=NbgAiHub`), what scope (`gist` only, classic PAT), and why (read/write your own favourites gist; nothing else). Lives in the sign-in modal copy and is mirrored in `docs/reference/gist-contract.md`.

## Original Request

> I want to properly explore, plan and execute the whole topic of personalization for the NbgAiHub. Personalization means:
> (a) Users can pin pages or skills from the hub to their favourites — on the website AND inside the Claude Code `/hub-*` skill, with state syncing across both surfaces.
> (b) Anyone with repo access can easily enrich the Skills marketplace catalogue by adding entries that reference other repos / skills — via a low-friction web form on the hub, not just by editing markdown by hand.
> Both share the same architectural foundation: GitHub as the backend (no servers), via GitHub OAuth Device Flow + private gist per user for favourites, plus token-scoped PR creation for the submission form.

> **2026-05-18 architectural pivot.** The investigator's R1 finding — GitHub's OAuth handshake endpoints don't send CORS headers — would have required a Cloudflare Worker proxy to keep the original "no servers" promise. After exploring alternatives, the user chose **Option C**: PAT-paste for favourites (narrower scope: `gist` only, vs the OAuth App's `repo`), and URL-redirect submissions that hand off the fork/branch/PR mechanics to GitHub's own UI. This refined request reflects Option C end-to-end.
