# NbgAiHub — Scope

**Last updated:** 2026-06-17 — **"Sandbox ↗" external link added** to the header nav (between News and My Pins), the homepage hero "Jump straight in" pill grid, and the footer Start column — all three pointing at <https://claude-code-sandbox.azurewebsites.net/>. Pill grid switched from `repeat(4, 1fr)` to `repeat(3, 1fr)` so the 5-pill set wraps to two rows without crowding "Tips & Tricks". Sourced from PR #8 (chrishham fork, marked CONFLICTING) — applied by hand. 246/246 site tests pass. Previous session (2026-06-16): **Copy-to-clipboard buttons added to use-case prompts and terminal blocks.** Every `<blockquote>` (prompts) and `<pre>` (terminal commands) inside a use-case step gains a delicate icon-only copy button — teal on the tinted prompt surface, cream on the dark terminal surface, opacity 0.45 → 1 on hover, no border or background. Clicking copies `textContent` via `navigator.clipboard.writeText` (with `document.execCommand` fallback); icon flips to a check for ~1.4s. Compliance-style callouts in the intro are intentionally skipped (script scopes itself to `.usecase-section__body`). Pre-icon sits just left of the existing "TERMINAL" pseudo-label so the terminal chrome is preserved. 246/246 site tests pass; verified visually in light + dark themes. Previous session (2026-06-11): **Use-case pillar upgraded after a full E2E execution audit of all 12 walkthroughs.** Every existing page gained: a "make Claude prove it" verification subsection (use-case-specific prompt that grep-verifies quotes / recomputes sums / runs logic on a test DB), a final "Level up" step (one-paste prompt producing a self-contained interactive HTML artifact — dashboard, diff viewer, tone studio, .ics calendar files, persistent-checkbox checklist, execution-mode runbook…), and a standardised `~/Desktop/claude-lab/<name>` workspace convention (`mkdir -p`). Three new use cases: `policy-quiz-builder` (compliance), `csv-to-chart` (data, gateway), `complaints-pipeline` (intermediate capstone — CLAUDE.md-as-program chaining heatmap + replies + dashboard + email; "do the Monday pack"). Two new tips capture the cross-cutting patterns (`make-claude-prove-it`, `level-up-to-interactive`). Gallery: fixed stale finale ("all six" → fifteen), three-rung-ladder lede, capstone chip on intermediate cards; stale "twelve" counts fixed on foundations/day-1. Word-count targets for synthetic sources replaced with structure+tension specs; complaint-heatmap fixes: flag/permission-prompt contradiction in Step 3, date range now a true Mon–Sun week. Per user decision, `--dangerously-skip-permissions` teaching stays as-is. Counts: use cases 12→15, tips 28→30 (synced; plugin snapshot rebuilt). Live: https://556lowcodenocode.github.io/NbgAiHub/.

<!-- Previous 2026-06-02 header rewritten per CLAUDE.md doc-hygiene ("rewrite, never append"). Its content is preserved in git history and partially in DECISIONS 2026-06-02 entries. -->

> Per-session narrative lives in **DECISIONS.md** (append-only). This header is a snapshot of *current* state — not history. When something changes, bump the date and rewrite this single paragraph; do not append "Prior" blocks.

## Vision

A curated Claude Code knowledge hub for bank colleagues — a one-stop shop combining skills catalog, tips & tricks, curated news, onboarding journeys, and a shared vocabulary. Tone: *"what I wish I knew a year ago."* The hub compresses newcomers' time-to-confidence, leveraging the ~6 months of head start the AI unit has over the rest of the organization on Claude Code.

## Audience

- **Primary:** Bank colleagues new to Claude Code (joining over the next 6–12 months)
- **Secondary:** Existing intermediate users hunting for tips, news, or new skills

## Repo & hosting

- **Repo:** `github.com/556LowCodeNoCode/NbgAiHub` (556LowCodeNoCode org)
- **Visibility:** **public** (required for free-tier Pages; was private under personal account, flipped public 2026-05-26, transferred to org 2026-05-29)
- **Hosting:** **LIVE** at <https://556lowcodenocode.github.io/NbgAiHub/> as of 2026-05-26. GitHub Pages under `556LowCodeNoCode` with `build_type: workflow` (Actions deploy). Repo flipped public for free-tier Pages. `base` env-driven via `process.env.PUBLIC_BASE` in `site/astro.config.mjs`; `.github/workflows/deploy-pages.yml` sets `PUBLIC_BASE: /NbgAiHub` at build time; postbuild `site/scripts/rewrite-base-paths.mjs` prefixes known top-level routes that Astro doesn't auto-prefix. `SplashAwareHeader.astro` also uses `import.meta.env.BASE_URL` for the brand `<a href>` and the two NBG wordmark `<img src>` (raw-string attrs aren't covered by Astro's base-aware bundling). See DECISIONS 2026-05-26 (afternoon) entry for the full deploy session, including the Starlight unlayered-cascade learning (now Issue #20) that surfaced as three visual regressions on live and was fixed via `!important` on critical typography + search-trigger properties.
- **Content rule:** since repo is private, team-internal content is permissible — but the repo lives under a *personal* account, not bank-managed infrastructure. Bank-confidential material should still go through compliance review before being stored here.
- **Migration path:** transfer to team org and switch to GitHub Team if the project graduates from personal bootstrap.

## Content at a glance

Canonical counts — regenerated by `node scripts/sync-doc-counts.mjs`. Do not edit between the markers; the docs-drift CI job will fail if these go stale.

<!-- AUTO:counts -->
| Pillar | Files |
|---|---|
| Glossary | 45 |
| Tips | 30 |
| Skills | 6 |
| Use Cases | 15 |
| Journeys | 2 |
| Newsletters | 1 |
| News (published) | 0 |
<!-- /AUTO:counts -->

Test counts (regenerated by `node scripts/sync-doc-counts.mjs --with-tests`):

<!-- AUTO:tests -->
| Workspace | Tests passing |
|---|---|
| pipeline/ | 205/205 |
| site/ | — |
| plugin/ | — |
<!-- /AUTO:tests -->

## The hub at a glance

**Five user-facing pillars** (each consumed differently; all share one content shape):

| # | Pillar | What it offers | Consumption pattern | Status |
|---|---|---|---|---|
| 1 | **Skills catalog** | Discovery layer over installable plugins (internal + external) | Browse → install via plugin marketplace | **✅ 9 entries cataloguing `556LowCodeNoCode/Skills` marketplace** (team, claudemd, deploy, uat-panel, frontend-design, database-schema-designer, commit-work, jira, gsd) |
| 2 | **Tips & Tricks** | Patterns, prompts, gotchas, workflow recipes | Read & apply manually | **✅ 14 entries** — prompting fundamentals, control keys, context discipline, compliance, permission modes, briefing template |
| 3 | **News** | _(Removed 2026-06-08.)_ Sidebar "News ↗" now points at external `the-agent-daily.org`. Internal `/news` rendering, the 61 archived items, `NewsPanel`/`NewsList`, `news.ts` collection, and `hub-news` plugin command all deleted in the cleanup pass. RSS triage code in `pipeline/src/` stays paused but in-tree, so re-activation is a config flip. | _(Pillar count is now 4 in practice; row kept for historical reference.)_ | n/a |
| 4 | **Curated journeys** | Day 1, Week 1, by-role onboarding paths | Follow step-by-step | **✅ Day-1 full 6 steps** (install → first session → control keys → CLAUDE.md → skills marketplace → tomorrow); Week-1 + by-role still TBD |
| 5 | **Glossary + Reference** | Term definitions (hybrid page + anchor links) + cheatsheet | Lookup as needed | **✅ 36 glossary terms** (full catalog; canonical count in the auto-synced table above. Project-wide beginner-friendly `tldr` rewrite landed 2026-05-25 evening); reference page deleted in 2026-05-25 nav rework |

**Cross-cutting substrate** (the same plumbing serves all five pillars):

- **GitHub repo as CMS** — markdown + frontmatter, PR workflow for everything ✅
- **Astro Starlight web UI** — **✅ built; Astro 6.3.5 + Starlight 0.39.2; 10 pages render; serving at `localhost:4321`; production hosting deferred**
- **Hub-as-skill plugin** — **✅ shipped 2026-05-19**; one command (`/plugin marketplace add 556LowCodeNoCode/NbgAiHub`) installs the hub into Claude Code; eleven `/hub-*` commands; bundled markdown snapshot; per-user state at `${CLAUDE_PLUGIN_DATA}/state.json`
- **Shared content shape** — 13-key frontmatter schema for news (added `editor_confidence`); 10-key base for skills/tips/glossary/journeys ✅
- **AI strategy** — build-time RSS triage via Azure OpenAI; runtime AI lives in the user's Claude session via the skill; **no AI on the website**
- **Complementary to the Onboarding guide** at `556lowcodenocode.github.io/Onboarding` — the hub deep-links into it, does not duplicate it

## MVP scope — IN

| Item | Status |
|---|---|
| **One curated Day 1 journey** — 6-step path: install → first session → control keys (incl. `Esc Esc`) → CLAUDE.md (global + project) → skills & team marketplace → where to go next | **✅ SHIPPED 2026-05-19** — `journeys/day-1.md` populated with full 6-step walkthrough; `site/src/pages/start-here/day-1.astro` rewritten to render the journey collection entry via `getEntry('journeys', 'day-1')`; same content also feeds `/hub-onboard day-1` |
| **~10 Tips & Tricks entries** | **✅ 14 SHIPPED** — original 12 on 2026-05-19 (prompting fundamentals (6 rules + bad-vs-good openers), correction phrasing, control keys (Esc), context discipline (`/compact` `/clear`), review-before-accept, Azure-OpenAI compliance); +2 on 2026-05-25 (permission modes / Shift+Tab; the 5-line briefing template) |
| **~5 Skills catalog entries** — internal + external, description + install link | **✅ 9 SHIPPED 2026-05-19** — team, claudemd, deploy, uat-panel, frontend-design, database-schema-designer, commit-work, jira, gsd (all cataloguing `556LowCodeNoCode/Skills` marketplace) |
| **~10 Glossary terms** — CLAUDE.md, MCP, skill, plugin, agent, hook, GSD, build-time vs runtime, etc. | **✅ 36 SHIPPED** — original 5 + ~30 added across 2026-05-19/24/25 (foundations, GitHub vocabulary, AI basics, authoring formats, slash-command, github). Full project-wide beginner-friendly `tldr` rewrite landed 2026-05-25 evening. Canonical count in the auto-synced "Content at a glance" table above. |
| **RSS curation pipeline** — daily GH Action: fetch feeds → Azure OpenAI triage → `/news/incoming` → PR → editorial review → promote to `/news/published` | **⏸ PAUSED 2026-06-08** — `schedule:` block removed from `rss-triage.yml`; `workflow_dispatch:` retained for on-demand runs. `config/rss-sources.json` trimmed to Reddit-only with both feeds `enabled: false`; HN / Wired / Verge removed. Built artefacts intact: 93/93 tests, `pipeline/src/` (triage, dedup, reddit-filter, retention) untouched. Workflow's two commit steps now run `node scripts/sync-doc-counts.mjs` and stage `SCOPE.md` / `CLAUDE.md` alongside the news files — permanent fix for the recurring `docs-drift` failure rooted in cron updating `news/published/` without regenerating the AUTO blocks. Spec: `docs/archive/refined-requests/rss-pipeline.md`. Verification: `docs/archive/reference/integration-verification-rss-pipeline.md`. Original auto-promote + 7-day retention design lives in DECISIONS 2026-05-19. Re-activation: restore `schedule:` block + flip Reddit `enabled: true`. |
| **Astro Starlight static site** with beginner/advanced filter | **✅ BUILT** — Astro 6.3.5 + Starlight 0.39.2, 10 pages (Home, Start Here→Day 1/Week 1, News, Skills, Tips, Glossary, Reference, Contribute, 404), 7 components (HomeHero, NewsPanel, NewsList, AudienceBadge, SkillCard, AudienceFilter + bonus ConfidenceChip), Pagefind search, dark theme default. Spec: `docs/archive/refined-requests/astro-starlight-site.md`. Verification: `docs/archive/reference/integration-verification-astro-site.md`. Hosting open. |
| **Hub-as-skill plugin** — eleven `/hub-*` commands (`/hub`, `/hub-search`, `/hub-news`, `/hub-tips`, `/hub-skills`, `/hub-glossary`, `/hub-onboard <journey>`, `/hub-install <skill-id>`, `/hub-audience <b|a|both>`, `/hub-refresh`, `/hub-open [section] [subsection]`) | **✅ BUILT & OPERATIONAL (2026-05-19)** — TypeScript workspace at `plugin/` sibling to `pipeline/` and `site/`. **130/130 tests pass** (12 lib test files + manifest + end-to-end entry-script smoke), typecheck + lint clean, esbuild produces 11 ESM entries in `dist/`, bundled snapshot of repo content via `npm run build:snapshot`. Marketplace at repo-root `.claude-plugin/marketplace.json`, plugin manifest at `plugin/.claude-plugin/plugin.json`. Spec: `docs/archive/refined-requests/hub-plugin.md`. Plan: `docs/archive/design/plan-003-hub-plugin.md`. Verification: `docs/archive/reference/integration-verification-hub-plugin.md`. |
| **Hybrid glossary** — canonical `/glossary` page + inline anchor links | **✅ page renders with 5 anchored terms; pattern proven** |
| **Public/private gating** — `internal: true|false` frontmatter | schema defined; in use by pipeline + site |
| **Per-user favourites (PAT-paste + unlisted-gist-backed)** — sign in by pasting a `gist`-scope PAT; pin any content item; favourites stored in the user's own unlisted GitHub gist `nbgaihub-favorites.json`; `/my-pins/` page renders pinned items; same gist consumable by future Claude-side `/hub-*` skill | **✅ BUILT (2026-05-19)** in commits `c1df291`, `5a08260`, `64f83b2`. 127/127 site tests pass. See `docs/archive/refined-requests/personalization-and-contributions.md`, plan `docs/archive/design/plan-003-personalization-and-contributions.md`, gist contract `docs/reference/gist-contract.md`. |
| ~~Skill submission web form~~ | **❌ REMOVED 2026-05-25 (late-night UAT)** — `/submit-skill/` page + `/contribute/` page deleted; PAT-paste form read as a phishing flow to non-devs. Skill submissions now flow through the normal repo PR path. CI validator at `pipeline/src/validators/skill.ts` is retained (still wired to `skills/**/*.md` PR checks). |

## Deferred — LATER

- Week 1 / by-role curated journeys (backend dev, data scientist, ML engineer, etc.)
- Full-text or semantic search across content (currently Pagefind covers full-text; semantic deferred)
- Greek-language content
- Authentication / SSO for gated content
- Analytics on what newcomers click
- Expanded news sources beyond the initial five
- Hero image extraction for news items (RSS thumbnail + og:image fallback) — `hero_image` field reserved in site schema (optional) for forward compat
- War stories / post-mortem pillar (6th pillar candidate)
- Migration to team org if/when bank-specific gated content becomes needed
- Site production hosting (Pro Pages / Vercel / Netlify / Cloudflare)
- Cosmetic refactor of Zod 4 deprecations in `site/src/content.config.ts` (`z.string().url()` → `z.url()`)

## Out of scope — NO

- Live chat or forum
- Hosting user-generated content
- Marketing-style branding
- Live chatbot widget on the website (the Claude skill IS the chatbot)
- Client-side embeddings or semantic search backend
- Bank-confidential content in this repo (structural constraint of personal account)

## Open questions

For full RSS pipeline context, see refined request: `docs/archive/refined-requests/rss-pipeline.md`. For the site, see `docs/archive/refined-requests/astro-starlight-site.md`.

- ~~**Hosting:** GitHub Pages via Pro, Vercel/Netlify/Cloudflare free tier, or defer hosting until MVP content exists?~~ — **RESOLVED 2026-05-26.** Live at <https://556lowcodenocode.github.io/NbgAiHub/> on GitHub Pages free tier; repo public.
- **Proof-of-life user:** which specific newcomer joining in the next 4–8 weeks anchors the MVP deadline?
- **Skill distribution:** standalone marketplace at `556LowCodeNoCode/NbgAiHub` or also list in `556LowCodeNoCode/Skills`?
- **RSS source list — PAUSED 2026-06-08.** `config/rss-sources.json` now lists only the two Reddit feeds (`r/ClaudeAI`, `r/ClaudeCode`) and both carry `enabled: false`. HN / Wired / Verge entries deleted. The source-group routing in `pipeline/src/triage.ts` SYSTEM_PROMPT and the Reddit-OAuth engagement-filter scaffolding remain in tree, ready for the day someone flips Reddit back on. Historical context for the deferred decisions in this section (which sources to include, engagement thresholds, cadence):
  - **Reddit group** (`type: "rss"` — reverted from `reddit-json` per DECISIONS 2026-05-21 third entry; engagement filter scaffolding lives in the repo ready to reactivate if OAuth becomes available later):
    1. r/ClaudeAI — `https://www.reddit.com/r/ClaudeAI/.rss`
    2. r/ClaudeCode — `https://www.reddit.com/r/ClaudeCode/.rss`
  - **Major tech/AI news group** (`type: "rss"`; professional news + breakthrough AI only; no engagement floor — these are editorial sources):
    3. Hacker News frontpage — `https://hnrss.org/frontpage` *(unfiltered; replaced earlier Claude-keyword variant on 2026-05-18)*
    4. Wired AI — `https://www.wired.com/feed/tag/ai/latest/rss`
    5. The Verge — `https://www.theverge.com/rss/index.xml` *(full firehose; LLM filters the non-AI noise)*
  - **Dropped feeds** (2026-05-18, by user direction): Anthropic news (RSS feed deleted by Anthropic — returned 404), Claude Code GitHub releases (`releases.atom`), Simon Willison's blog. The latter two are easy to re-add if signal loss is felt.
- **Editorial cadence:** PAUSED 2026-06-08 — daily cron removed; `workflow_dispatch:` only. Prior live cadence was **22:00 UTC = 00:00 Europe/Athens (winter) / 01:00 Athens (DST)** (shifted from 05:00 UTC on 2026-05-21 so the previous day's Reddit posts had time to accumulate `score` / `num_comments` and clear the engagement floor). When re-enabling, restore the `schedule:` block at `.github/workflows/rss-triage.yml` — one-line YAML change. Weekly summary PR or twice-weekly cron remain open alternatives at that point.
- **News storage model:** per-item permanent (current — files accumulate forever) vs rolling N-day window vs hybrid (storage permanent + UI filters)? Currently per-item permanent; site reads via glob loader and renders chronologically.
- **News item hero image:** add `hero_image` frontmatter field, extracted from RSS thumbnail + og:image fallback? Deferred but small to implement. Site schema already accepts `hero_image` as optional (forward compat).

## Demo-ability checklist (manager review)

- [x] **Site renders locally** — `cd site && npm run dev` → `http://localhost:4321` returns 200; homepage shows hero + tagline; all 9 sidebar entries clickable
- [x] **Day 1 journey page populated with all 6 steps + deep-links into the Onboarding guide** *(2026-05-19 — `journeys/day-1.md` + `site/src/pages/start-here/day-1.astro` renders from the collection)*
- [x] **At least 1 skill entry, 1 tip visible** *(2026-05-19 — 9 skills + 12 tips shipped)*
- [x] **At least 5 glossary terms visible** *(15/10 seeded — 2026-05-19)*
- [x] At least 1 news item visible *(43 items in PR #1 on 2026-05-18; need PR merge to surface in `news/published/`)*
- [x] **Beginner/Advanced/Both filter wired** *(AudienceFilter component built, `localStorage.nbgaihub.audience` persistence; visible no-op until news populated)*
- [x] **`/hub` commands work from a fresh Claude Code install** *(eleven commands ship in `plugin/`; install via `/plugin marketplace add 556LowCodeNoCode/NbgAiHub`; smoke-tested end-to-end on 2026-05-19)*
- [x] **One full end-to-end RSS pipeline run completed** *(run `26047997638`, 2m46s, PR #1, then PR #2/#3 with tightened triage)*
- [x] **Hub installable as a plugin (`/plugin marketplace add 556LowCodeNoCode/NbgAiHub`) in one command** *(marketplace.json points at `./plugin`; plugin.json declares `nbg-ai-hub`)*
- [x] **SCOPE.md + DECISIONS.md tell the story of how we got here** *(this file + 20+ DECISIONS entries through 2026-05-18)*
- [x] **Signed-in user can pin and see pins on `/my-pins/`** *(verified in build — PAT-paste flow validates against `GET /user`; first pin lazily creates unlisted gist `nbgaihub-favorites.json`; `/my-pins/` joins gist `favourites[]` against build-time `<type>-index.json`; stale references render as dimmed "no longer available — unpin" rows)*
- [ ] ~~Anonymous visitor can submit a skill via `/submit-skill/`~~ — *page removed 2026-05-25 (late-night UAT). Contributions flow through the normal repo PR path; CI validator at `pipeline/src/validators/skill.ts` still gates submissions on PR.*
- [x] **UI redesign shipped — Apple-influenced Linear/Vercel/Stripe aesthetic** *(2026-05-19 — see docs/archive/reference/integration-verification-ui-redesign.md for the 39/39 AC verification report; user evaluation at localhost:4321 is the final gate before commit/escalation decision)*
