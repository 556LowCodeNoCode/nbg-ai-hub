# Decision log

Append-only. Each entry permanent. When a decision is superseded, add a new entry — never edit prior ones.

Per CLAUDE.md doc-hygiene: each entry ≤20 lines, structured as Decision (bullets) / Why (1-2 lines) / References. Long-form analyses live in `docs/reference/<topic>-YYYY-MM-DD.md` and `docs/design/`.

---

## 2026-06-08 (night) — Search modal centering fix + missing `starlight.reset` layer

**Trigger:** User reported the just-shipped re-skinned modal anchored at the top-left of the viewport with chunky text instead of centered. CDP cascade trace on the live deploy showed Starlight's own `@media dialog { margin: 4rem auto auto }` rule was being beaten by an unlayered-looking `* { margin: 0 }`.

**Root cause:** Starlight 0.39 ships its reset in `@layer starlight.reset` (`node_modules/@astrojs/starlight/style/reset.css:1`), but our `site/src/styles/tokens/layers.css` `@layer` declaration listed only `reset, tokens, starlight.base, starlight.core, starlight.components, nbg.*` — no `starlight.reset`. Per CSS spec, undeclared layers are pushed to the END of cascade, which made `* { margin: 0 }` the highest-priority layer and silently broke the dialog centering (margin: 0 wins, dialog renders top-left full-height).

**Decision:**
- `tokens/layers.css`: insert `starlight.reset` near the start of the layer order (`reset, starlight.reset, tokens, …`). Anchors Starlight's universal reset at the lowest-priority slot where it belongs — proper fix, also de-risks any other Starlight layout rules that were silently losing.
- `site/src/styles/search-modal.css`: defensive `!important` on `margin`, `width`, `max-width`, `height`, `min-height`, `max-height` inside the `@media (min-width: 50rem) site-search dialog { … }` block. Keeps the modal centered even if a similar reset is reintroduced later upstream.
- Tightened the modal density: `--pagefind-ui-scale` overridden to `0.7` (default `0.8` was chunky inside the 40rem max-width). Dropped my hardcoded `font-size: 1rem !important` overrides on `.pagefind-ui__search-input` and `.pagefind-ui__result-title` — let Pagefind's `calc(Npx * scale)` drive sizing.
- Capped `max-width` at `36rem` (was Starlight's `40rem`) — tighter feel.
- Verified at 1920×1080 prod build via Puppeteer: dialog renders at `rect.x=672, y=64, w=576, h=952` → properly centered with 4rem top margin.

**Why:** the universal reset shadowing case is exactly the Starlight cascade gotcha (`docs/reference/starlight-cascade-gotcha.md`), just with a new mechanism — *layer name missing from declaration*, rather than *unlayered ships vs. layered*. Same defensive pattern (`!important` on properties that must win), plus the broader fix (declare the layer in the right slot).

**Refs:** `site/src/styles/tokens/layers.css` (layer order + new comment block documenting why `starlight.reset` must be declared); `site/src/styles/search-modal.css` (centering `!important` + scale 0.7 + max-width 36rem + size overrides dropped). No test changes.

---

## 2026-06-08 (late evening) — Pagefind search modal re-skin

**Trigger:** Screenshot from user — Starlight's built-in search modal shipped Pagefind UI's generic defaults (harsh black focus border on input, system-font result tiles, yellow `<mark>`, generic chrome) — visually inconsistent with the rest of the hub.

**Decision:**
- New `site/src/styles/search-modal.css` wired into `astro.config.mjs` `customCss` after `content-chrome.css`.
- Variable remap on `#starlight__search` (inherits cleanly into Pagefind's `.svelte-XXX` rules — no specificity fight): `--pagefind-ui-primary` → `--nbg-accent`, `--pagefind-ui-text` → `--nbg-ink`, `--pagefind-ui-background` → `--nbg-surface`, `--pagefind-ui-border` → `--nbg-border`, `--pagefind-ui-tag` → `--nbg-surface-2`, `--pagefind-ui-font` → `--nbg-ff-body`, `--pagefind-ui-border-radius` → `--nbg-r-md`.
- Direct `!important` overrides (Pagefind UI ships unlayered, per `docs/reference/starlight-cascade-gotcha.md`): input focus ring (teal `border-color` + 3px teal-22% `box-shadow`, replaces browser-default black outline, matches `.glossary-filter-input`); message → mono uppercase eyebrow; result rows → hairline dividers + row-tint hover; `<mark>` → teal-22% color-mix; tag pills + "Load more" → Chip/Button primitive aesthetic; dialog → `--nbg-r-lg` radius, `--nbg-sh-xl` shadow, hairline border, blurred ink-tinted backdrop.
- Verified on prod build (`npm run build && npm run preview`) via Puppeteer screenshots — both light + dark themes match hub aesthetic.

**Why:** the search dialog is one of the highest-touched surfaces (⌘K), and the harsh black focus border + generic type stood out as obviously not-on-brand. Variable-first keeps Pagefind upgrades painless; `!important` is reserved for the handful of Svelte-scoped selectors that can't be reached otherwise.

**Refs:** new `site/src/styles/search-modal.css`; modified `site/astro.config.mjs` (customCss array) + `CLAUDE.md` (repo-layout tree). No test changes; site build clean.

---

## 2026-06-08 (evening) — T1 archive sweep + SignInModal Step 01 hierarchy fix

**Trigger:** Post-push survey found ~24 phase reports still in `docs/reference/` that PR B missed (same archive logic, just overlooked). Separately, user flagged SignInModal Step 01 as confusing — the realistic-looking GitHub mock sat above the CTA, so users tried clicking the mock instead of the "Open GitHub token page" button buried below it.

**Decision — T1 archive sweep:**
- `docs/reference/` trimmed from 32 files (456KB) → 4 live operational docs (48KB): kept `authoring-glossary-terms.md`, `authoring-tips.md`, `gist-contract.md`, `starlight-cascade-gotcha.md`.
- Moved 27 phase reports to `docs/archive/reference/`: all `code-review-*`, `dependency-validation-*`, `integration-verification-*`, `test-build-*`, plus `glossary-audit-2026-05-25.md`.
- `docs/research/` (120KB) → `docs/archive/research/`: astro-fonts API research, pagefind UI variant, agentnews-source bundle.
- In-tree path refs updated: SCOPE.md, CLAUDE.md tree, `authoring-glossary-terms.md`, `site/astro.config.mjs`, `site/src/styles/tokens/aliases.css`, `site/src/styles/agentnews-layout.css`, `site/tests/build-output.test.ts`. DECISIONS historical entries left untouched.
- `scripts/audit-glossary-candidates.mjs` path-guard left at `docs/reference/glossary-audit-*` — that's where NEW audits write; only the old 2026-05-25 audit was archived.

**Decision — SignInModal Step 01 redesign:**
- Reorder: title → hint → CTA → preview-label → mock figure. CTA now reads first; mock now reads as reference.
- New `<p class="nbg-signin__preview-label">` reading "HERE'S WHAT YOU'LL SEE ON GITHUB" — small caps, muted, 0.6875rem — sits between CTA and mock so the reader understands the mock is recognition material, not action surface.
- Step title reworded: "Create a token on GitHub" → "Get a token from GitHub" (action verb clearer).
- Vertical spacing between CTA and mock: 1.5rem (was 0.85rem).
- Visual treatment now mirrors Step 02's clean badge + title + hint + actionable pattern.
- Verified locally via puppeteer screenshot at `localhost:4321/my-pins/`.

**Issue #25 dropped** — `agentnews-layout.css` does not contain dead news-card rules. Verified: zero `.news-*` / `.story-*` selectors; the file's news mentions are source-attribution comments only. False alarm in my earlier flag.

**Why:** the working tree was carrying 370KB of frozen phase reports + 120KB of frozen research that git already preserves — same archive logic as PR B, just incomplete. SignInModal Step 01 hierarchy was inverting the reading order — the mock has been shown to confuse non-developers attempting to interact with it (UAT T13 V1, Issue #23). Reorder makes the CTA the dominant element and demotes the mock to reference.

**Refs:** site 246/246 + plugin 122/122 tests green. `docs/reference/` now 4 files; archive grew to ~7.7MB. SignInModal change in `site/src/components/SignInModal.astro` step-01 markup + new `.nbg-signin__preview-label` CSS block.

---

## 2026-06-08 (afternoon) — Repo cleanup: News pillar fully removed + planning-doc archive

**Trigger:** After the morning's news-cron pause, opened a "what could we remove?" conversation. Top finding: the sidebar already routed "News ↗" externally (`the-agent-daily.org`), so the internal `/news` rendering was silently orphaned. Two-PR cleanup proposed and approved.

**Decision — PR A (decommission internal news rendering + submission orphans):**
- Deleted site UI: `NewsPanel.astro`, `NewsList.astro`, `news.ts`, `news-sections.ts`, `submission.ts`, all 61 `news/published/*.md` + `news/incoming/` + empty `news/` dir, `public/_data/news-index.json`. Removed `news` Zod collection from `content.config.ts`; `HomeStats.astro` swapped `news` count → `usecases` (preserves 2×2 layout).
- Dropped `'news'` from `PinType` union across `gist.ts`, `pin-store.ts`, `PinButton.astro`, `my-pins.astro`, `build-pin-index.ts`. Legacy `type='news'` gist entries will fail isPinType narrowing and render as stale "no longer available" rows.
- Hub plugin: deleted `hub-news.ts` + command + dist + tests fixture + `snapshot/news/`. Stripped `news` from `hub.ts` menu, `hub-search.ts` aggregator, lib `Pillar` type, `loadAll`, `frontmatter.ts` `NewsFrontmatter` + checker, `url-builder.ts` known sections (also dropped `reference` + `contribute` while there). Build-snapshot script no longer mirrors news.
- Test updates: deleted `tests/agentnews-aesthetic.test.ts` (depended on `news-sections.ts`), `tests/remark-glossary-news-skip.test.ts`, `tests/submission.test.ts`; trimmed news cases from `pin-store.test.ts` / `gist.test.ts` / `build-pin-index.test.ts` / plugin `e2e-entries.test.ts` / plugin `url-builder.test.ts` / plugin `snapshot.test.ts` / plugin `content.test.ts` / plugin `frontmatter.test.ts`. Plugin tests went 130 → 122; site tests 320 → 246.
- Stale JSDoc fixed in `MarketingShell.astro` (removed `/news`, `/reference`, `/contribute`, `/submit-skill` from the wrapped-routes list) and `Card.astro` (removed `NewsPanel/NewsList` from consumers).

**Decision — PR B (planning-doc archive):**
- Created `docs/archive/{design,refined-requests,reference,uat}/`.
- `git mv` moved: `docs/design/*` (9 files, 1.5MB), `docs/refined-requests/*` (9 files, 584KB), `docs/reference/codebase-scan-*.md` + `investigation-*.md` (~250KB), four root-level `UAT-*.md` artefacts (May 25–27), `docs/reference/uat/` glossary screenshots, the lone refined-request + codebase-scan UAT docs.
- In-tree refs updated to new archive paths: SCOPE.md (5 refs), CLAUDE.md (3 refs + full repo-layout tree rewrite), `docs/tools/skill-validator.md` (4 refs), `glossary/yaml.md` (1 ref). DECISIONS historical entries left untouched (append-only rule).

**Why:** the docs-drift email storm prompted "if we're not using this, why are we maintaining it?" The news pillar's silent orphan state (sidebar bypassed it, cron stopped writing it, but rendering/tests/snapshot mirrored it daily) was the textbook cost: every test run validated dead code paths, every build mirrored 252KB into the plugin snapshot, every PR risked a cascade of news-aware breakage. Planning docs gave similar tax: 7.7MB of `docs/` dominated by shipped-and-frozen specs that git already preserves. Archive (not delete) keeps history one `git mv` away while halving working-tree weight.

**Refs:** site + plugin both build clean; 246 + 122 tests green. Tree: `docs/archive/{design,refined-requests,reference,uat}/`. AUTO blocks regenerated (news=0). Tier-2 candidates (full `pipeline/` workspace, hub plugin install adoption, `/my-pins/` adoption) deferred pending real-world usage signal.

---

## 2026-06-08 (morning) — News pipeline paused + docs-drift permanent fix

**Trigger:** Recurring GitHub Actions email `[556LowCodeNoCode/NbgAiHub] docs-drift workflow run — All jobs have failed`. Run `27135240867` exit log: `DRIFT: SCOPE.md AUTO block would be regenerated / DRIFT: CLAUDE.md AUTO block would be regenerated / counts: glossary=45 tips=28 skills=6 usecases=12 journeys=2 news=61`. Root cause: `rss-triage.yml` was adding/pruning `news/published/*.md` daily but committing without re-running `scripts/sync-doc-counts.mjs`, so the AUTO block (claiming `news=59`) and disk reality (`news=61`) drifted on every cron run. User decision: pause the whole news pipeline rather than keep nursing it, since we aren't actively using it.

**Decision:**
- Removed `schedule:` block from `.github/workflows/rss-triage.yml`; `workflow_dispatch:` retained so a manual operator can still kick off a run on demand. Cron rationale and 22:00-UTC slot preserved as a YAML comment for the future re-activator.
- `config/rss-sources.json` trimmed to two Reddit entries (`r/ClaudeAI`, `r/ClaudeCode`), both `enabled: false`. HN / Wired / Verge entries deleted entirely. Reddit kept (per user) so re-activation is two `enabled: true` flips, not a config rebuild.
- Permanent docs-drift fix: both commit steps in `rss-triage.yml` (auto-promote-to-main + editorial-PR) now run `node scripts/sync-doc-counts.mjs` before `git add` and stage `SCOPE.md` / `CLAUDE.md` alongside the news files. If anyone ever restores the cron, drift can't reintroduce itself.
- Regenerated AUTO blocks now: news 59 → 61. `--check` passes clean.
- Pipeline code (`pipeline/src/` triage, dedup, reddit-filter, retention) and the 61 existing `news/published/*.md` items untouched — site still renders the archive at `/news/`.

**Why:** keeping the news pipeline running while we don't use the output was costing us a noisy CI failure every day. Pausing the cron stops the noise; keeping the workflow + code + Reddit config in tree means resuming is a small, well-typed change instead of an archeology dig. The sync-step inside the commit recipes makes "drift" a closed problem regardless of when re-activation lands.

**Refs:** `.github/workflows/rss-triage.yml` (schedule block removed, sync-doc-counts step added × 2), `config/rss-sources.json` (HN/Wired/Verge dropped, Reddit disabled), `SCOPE.md` (Last updated rewritten, News pillar + RSS pipeline + open-question rows marked paused), `CLAUDE.md` (repo-layout tree lines for `rss-sources.json` + `rss-triage.yml`), `scripts/sync-doc-counts.mjs` AUTO blocks. Failing CI run: `27135240867`.

---

## 2026-06-02 (tips cascade fix + first workflow tip) — Section-head margins pinned; new `team-or-gsd` lede

**Trigger:** Published /tips/ sat the sticky preview pane ~58px below the first row even though the same code aligned gap=0 locally. Puppeteer comparison of local vs prod DOM showed Starlight's prose cascade (`content-prose.css .sl-markdown-content h2/p/ul { margin-block: ... }`) was injecting different margins on the cluster heading + lede + list in the two environments depending on Vite's CSS load order. Same root cause as `docs/reference/starlight-cascade-gotcha.md`. Separately, the user asked for a first-position workflow tip introducing the two heavy-hitter skills (`/team` vs `gsd-*`).

**Decision:**
- `!important` on four section-head rules in `listing-rows.css` so heading geometry is identical in local + prod: `.listing-section__title { margin: 0 !important }`, `.listing-section__lede { margin: 0 !important }`, `.listing-section__head { margin-bottom: 1.5rem !important }`, `.listing-list { margin: 0 !important }`. After the fix, first listing row lands at 104px from `.tips-shell` top in both envs.
- Pane `margin-top` dropped from 10.75rem → 6.5rem in `tip-preview.css` so pane top = 104px = first row top. Local gap verified 0 via puppeteer; prod will follow once the deploy lands.
- New tip `tips/workflow-1-team-or-gsd.md` (audience `both`, topics `[workflow]`). Numeric `-1-` filename prefix sorts before `workflow-at-…` (`'1' < 'a'`) so it lands first in the cluster without schema/template changes. Body: one-line lede + `/team` section (feature-sized, ten phases, one sitting) + `gsd-*` section (multi-week, persistent `.planning/`, pause-resume) + one-sentence picker. Bumps tips 27 → 28; `sync-doc-counts.mjs` ran.

**Why:** Starlight unlayered cascade was the documented root cause for local-vs-prod drift; the canonical fix is `!important` on the affected properties (not layer reordering). The new tip seeds Workflow with the answer to "which orchestrator do I pick" that newcomers ask first.

**Refs:** `site/src/styles/listing-rows.css` (section-head rules), `site/src/styles/tip-preview.css` (pane margin-top 6.5rem), `tips/workflow-1-team-or-gsd.md`, `docs/reference/starlight-cascade-gotcha.md`.

---

## 2026-06-02 (tips preview pane) — Two-column shell with sticky tip preview

**Trigger:** /tips/ hover-preview was a floating 820px popover that covered ~3 list rows below the hovered one. Sidebar-pattern fallback (narrowed to 440px, anchored top-right) still overlapped the row's right portion. User asked for a stable 2-column layout with the preview permanently in the right column.

**Decision:**
- Below the hero + filter bar, /tips/ now runs as a `display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 2.5rem` shell (`.tips-shell` in `tip-preview.css`). Left column carries the existing cluster/orphan listing sections; right column is a sticky `<aside id="tip-preview-pane">`.
- Pane has two child states: `[data-tip-preview-placeholder]` ("Hover a tip on the left to read the full text…") and `[data-tip-preview-content]` (populated on row hover, cleared on row+pane leave). Hovering the pane itself keeps content open so users can scroll long bodies.
- Floating-popover JS deleted (positioning math, viewport-edge clamping, scroll-hides). Replaced with `showRow` / `restorePlaceholder` against the sticky pane.
- Sticky offset: `top: calc(var(--sl-nav-height) + 4rem)` so the pane sits ~1rem below the sticky filter bar. Initial-flow `margin-top: 10.75rem` so the pane's top edge starts level with the first listing row (cluster heading + lede live above on the left only) — verified gap=0 via puppeteer across vw 1280–1920.
- Responsive collapse: below 1100px viewport or on coarse-pointer, the grid collapses to single column and `.tip-preview--pane { display: none }`. Title click-through becomes the sole affordance there.

**Why:** floating popover was the source — any X-coordinate change still overlapped the list. Stable two-column layout gives the preview its own permanent real estate so hover updates a known location instead of summoning a modal. Click-through to the detail page is preserved as the commit affordance.

**Refs:** `site/src/pages/tips.astro` (`.tips-shell` markup + sticky-pane JS), `site/src/styles/tip-preview.css` (`.tip-preview--pane`, `.tips-shell` grid + 1100px collapse).

---

## 2026-06-02 (tips taxonomy) — Closed topic enum + filter click-target fix

**Trigger:** /tips/ chip strip showed 14 topic chips including `Advanced` and `Basics` — both duplicated the SHOW/audience axis — plus six singletons (`safety`, `permissions`, `corrections`, `integrations`, `examples`, `data-residency`) and the half-catalog tag `fundamentals`. Separately, sticky-bar audience chips routed clicks to the wrong radio.

**Decision:**
- Canonical tip topics pinned to five (`prompting`, `workflow`, `context`, `control`, `safety`) via Zod enum in `site/src/content.config.ts`; build fails on any other value. Mirrors the five cluster headings on /tips/.
- Re-tagged 24 of 27 tips. Audience-coded labels and singletons folded into the canonical five; `audience: beginner|advanced|both` remains the sole audience axis.
- `TOPIC_EXCLUDE` set in `tips.astro` deleted (dead now that the schema bounds the values). Cluster `match` synonyms (`compliance`/`data-residency`/`commands`/`integrations`/`memory`/`claudemd`) also removed for the same reason.
- Sticky-bar CSS: dropped `.audience-filter__option` from the `display: contents` flatten list — the contents element broke `position: relative` anchoring for the radio inside, stretching the invisible click target across the page. Excluded → each option keeps its own `inline-flex` box; radio hitbox matches the visible chip.
- Skills featured panel slimmed: lede shrunk to one line, "New to Claude Code?" demoted to a quiet single-line link row (no boxed background), trailing "Built at NBG cluster below…" paragraph removed.

**Why:** topic axis duplicating audience axis was the symptom the user surfaced; closed enum is the only way to keep new tips from drifting back. Filter click bug was a `display: contents` foot-gun specific to the option-wraps-absolute-radio pattern.

**Refs:** `site/src/content.config.ts:172-189`, `site/src/pages/tips.astro:128-141`, `site/src/styles/listing-rows.css:81-100`, `docs/reference/authoring-tips.md` topic-vocabulary table.

---

## 2026-05-29 — Repo migration to 556LowCodeNoCode/NbgAiHub

**Trigger:** repo graduated from the personal `chomovazuzana` account into the team org. User transferred ownership directly; this work captures every in-repo identity reference so Pages republishes cleanly and `/plugin marketplace add` resolves under the new owner.

**Decision:**
- **Live code + config (commit `2c03a0c`)** — repo URL `chomovazuzana/NbgAiHub` → `556LowCodeNoCode/NbgAiHub` and Pages host `chomovazuzana.github.io` → `556lowcodenocode.github.io` across 10 files: `site/astro.config.mjs` (site URL + comment), `.github/workflows/deploy-pages.yml` (URL comment; `PUBLIC_BASE=/NbgAiHub` unchanged since repo name stays), `site/src/lib/submission.ts` (GitHub web-editor URL + Contents-API endpoint), `site/src/pages/about.astro` (`REPO_URL` constant), `plugin/config.json` (`productionUrl` + `repoUrl`), `plugin/src/hub-onboard.ts` (contribute link), `plugin/README.md` (install command), `plugin/.claude-plugin/plugin.json` (`author.url`), `.claude-plugin/marketplace.json` (`owner.url`), `pipeline/src/fetch.ts` (User-Agent `+URL`).
- **Tests + fixtures (commit `4e777a9`)** — mirrored URL changes in 4 files: `pipeline/tests/validators/fixtures/{valid-skill,bad-category}.md` (install_command), `site/tests/submission.test.ts` (form default), `plugin/tests/manifest.test.ts` (author.url assertion). pipeline 205/205, site 310 + 1 unrelated skip, plugin manifest 11/11. Pre-existing `hub-open` e2e failure stayed red (depends on local dev server + `devMode:true`; tracked as Issue #3).
- **State docs (this commit)** — CLAUDE.md (5 refs incl. visibility "private" → "public", "personal account" → "556LowCodeNoCode org"), SCOPE.md (Last-updated line, repo+hosting block, hub-plugin install command, demo-checklist install commands, open-question marketplace path), `Issues - Pending Items.md` (#3 site URL, #5 install command), SECRETS.md (Reddit-app About URL on line 52). DECISIONS.md prior entries untouched. Historical docs under `docs/refined-requests/`, `docs/design/`, `docs/reference/`, and `UAT-*.md` left as-is — they're dated reports of what was true at the time.
- **Site-internal redirects** — only redirect in `site/astro.config.mjs` is `/news/` → external AgentNews; not migration-related.
- **Old repo** — transferred (not deleted), so GitHub's automatic redirect from `chomovazuzana/NbgAiHub` → `556LowCodeNoCode/NbgAiHub` handles legacy `git remote` URLs. No redirect-stub repo needed.
- **Secrets** — operator-managed; not touched in code. The four `AZURE_OPENAI_*` (and optional `REDDIT_CLIENT_*`) secrets must be present on the new repo under the same names; operator handles that out-of-band.

**Why:** repo is no longer "personal-account bootstrap mode" — bank-relevant content now lives where the team owns it, and the `/plugin marketplace add 556LowCodeNoCode/NbgAiHub` install path matches the org-owned reality. Site needs to keep working without a hosting handover; the only thing that changes for visitors is the URL.

**Refs:** commits `2c03a0c` (runtime), `4e777a9` (tests), this commit (docs). Issues #3 (devMode flip — now genuinely actionable) and #5 (manual marketplace-install verify against the new org) gain urgency from this entry.

---

## 2026-05-29 (use-cases v4) — Self-sufficient, skip-permissions default, OS picker in Step 1, CLAUDE.md teaching

**Trigger:** all 12 use cases assumed real bank-system artefacts (CSV exports, real memos, Teams transcripts, supplier PDFs). A newbie following them without access would stall on Step 1. User also flagged that the small hero OS toggle was being overlooked, and that CLAUDE.md — the most powerful concept in Claude Code — was missing from every use case.

**Decision:**
- **Source files are now Claude-generated.** Every use case that previously assumed a real CSV/PDF/DOCX now opens with a "Step 2 — ask Claude to invent a realistic synthetic [thing]" — 40-row complaints CSV, 15-page credit memo with page markers, 80-line Teams transcript with realistic mess, 6 invoices in 6 different layouts, Greek complaint with idiom-rich tone, 10-page synthetic EBA paper, etc. The real-data swap-in is a one-line note: "once you trust the loop, swap your real export into the same filename". 10 of 12 needed surgery; `mortgage-calculator` and `sql-from-question` were already self-sufficient. Verified each end-to-end in `/tmp/nbg-usecase-tests/` — outputs are realistic and the loops work.
- **`claude --dangerously-skip-permissions` is the project default** for use cases. Documented once per file in Step 1 with an opt-out line ("if you'd rather see every prompt for your first run, just type `claude`"). 11 standalone `claude` invocations + 16 "Claude asks permission. Say yes." phrases swept; all 12 files normalised.
- **OS picker relocated from the hero to a prominent panel at the top of Step 1's prose column** (`.step1-os-picker` — accent-bordered card, eyebrow + lede + segmented pair). Hero now ends at the step-overview cards. Same `<html data-os-prefer>` wiring — the existing inline script already binds every `.os-toggle__btn` on the page, so future inline placements get the binding free. Removed the now-stale "Pick your OS at the top of this page" sentence from every use case's Step 1.
- **Option B for WSL `~/Desktop` reality.** Kept `~/Desktop` everywhere; added a short paragraph inside each Step 1 Windows div explaining that in WSL `~/Desktop` is `/home/<linux-user>/Desktop`, not the Windows desktop, and giving `explorer.exe .` as the one-line bridge. Honours WSL's actual model rather than papering over it.
- **CLAUDE.md teaching added to all 12 use cases** at the final step as a "make it stick" reveal — pattern: introduce CLAUDE.md as *"the magic filename Claude Code reads automatically every time you start `claude` in a folder containing it"*, show what stable rules to put in it (risk-flag definitions, output format, banned phrases, schema, etc.), show how next week's run shrinks to a one-liner. `complaint-heatmap` (the first use case by order) is the **only** one that also introduces the *global* `~/.claude/CLAUDE.md` for cross-cutting rules (NBG context, redaction defaults, regulatory hedging) — three-line starter included. The other 11 cover project-level only to avoid bloat.
- **Starlight unlayered cascade strike again.** The OS picker's second button was rendering 8px lower than the first — Starlight ships an unlayered `* + *` rule that adds `margin-top: 16px` to adjacent siblings and beats our `@layer nbg.components` rules. Fix: `margin: 0 !important` on `.os-toggle__btn` with an inline pointer to `feedback_starlight_unlayered` memory so the next person hitting this doesn't re-discover it. Same pattern surfaced when both pills were sized differently — added `min-width: 7.25rem` + `justify-content: center` so the segmented pair looks like a true pair regardless of label length, plus `width/height: 18px` on the SVGs so the Apple and Windows glyphs occupy identical optical area.

**Why:** the prior use-case pillar shipped fine for a literate reader, but the new walkthroughs make zero-system-access training viable (HR/onboarding scenarios where the bank colleague hasn't been granted any system yet), and CLAUDE.md is the *single highest-leverage concept* in Claude Code — the use cases couldn't ship without teaching it. The skip-permissions flag is the difference between "this is annoying" and "this is fast" once the user trusts the loop.

**Refs:** `usecases/*.md` (12 files), `site/src/pages/use-cases/[slug].astro` (picker relocation + `.step1-os-picker` styles + button alignment fix). End-to-end verification artefacts live at `/tmp/nbg-usecase-tests/` (one folder per use case, source + output, all loops produced sensible artefacts; `sql-from-question` Step 4 caught a real Postgres typing bug in the first-pass query — the verification step worked as designed). Picker alignment verified by pixel measurement via puppeteer — both buttons at `y=1212.4`, icons centred at `y=1233.0`. The `:global()` cascade fix from the prior entry continues to load-bear here for the per-OS `[data-os="…"]` visibility rules.

---

## 2026-05-29 (follow-up 2) — Tips listing: whole-row click + hover-preview popover

**Trigger:** detail-page-only nav left ~80% of the row real estate inert. User asked for whole-row click + a hover popup with the body so readers can scan in place.

**Decision:**
- **Whole row clickable** — `.listing-row__title-link::after` is a stretched overlay (`position: absolute; inset: 0; z-index: 1`) covering the full `.listing-row` rectangle. Pin button gets `position: relative; z-index: 2` to stay independently clickable; decorative pills get `pointer-events: none` so clicks pass through to the overlay.
- **Hover popover** — one shared `<aside id="tip-preview-popover">`; each row carries a hidden `<script type="text/x-tip-body">` with the pre-rendered body. On 300ms-delayed hover, an inline script clones the body into the popover, sets a title header, and positions: prefer right-of-row, fallback left, fallback below — all clamped to viewport. Dismisses on Esc, mouseleave, scroll, resize. Disabled on `(hover: none), (pointer: coarse)` — touch users tap to navigate.
- **Body pre-render path** — small in-file markdown→HTML pass (paragraphs, h2-h4, ul/ol, blockquote, fenced code, inline code/bold/links). Skipped the project remark-glossary-link plugin for the popover: triggers don't fire inside the popover anyway, and the path keeps build-time cost flat.
- **Hang lesson** — first attempt used `<template set:html>` containers + an inline `<style is:global>` block in `tips.astro`. Astro's static-entrypoints phase hung indefinitely. Fix: `<script type="text/x-tip-body" set:html>` + extracted `site/src/styles/tip-preview.css`. Builds clean in 2-3s.
- **Headless puppeteer verification** — hover shows popover (title + body); click on row body navigates to detail; click on pin stays in place.

**Why:** the detail page reads well but most readers scan. A hover preview lets the catalog stay browsable while exposing the full content; the stretched link makes every row pixel a click target.

**Refs:** `site/src/pages/tips.astro` (markdown pre-render + popover aside + script), `site/src/styles/tip-preview.css` (popover styles), `site/src/styles/listing-rows.css` (stretched-link mechanic). Skip-pattern noted: avoid `<template set:html>` in Astro pages with many entries — it hangs the static-entrypoints build.

---

## 2026-05-29 (follow-up) — Tip detail pages: bodies now actually render on the site

**Trigger:** mid-session check — the /tips listing rendered only `ai_summary` blurbs and there was no per-slug detail route. The 6 tip-body edits from the preceding entry were invisible to a site reader.

**Decision:**
- Built `site/src/pages/tips/[slug].astro` — slim single-column reading layout (hero crumb + serif title + ai_summary lede + audience badge, then body, then a "Next tip" card). Wires `createMarkdownProcessor` with `remark-glossary-link` so tip bodies get glossary auto-linking. **Fourth page now needs explicit remark wiring** per §S.14 (joins glossary / foundations / day-1).
- `site/src/pages/tips.astro` row titles wrapped in `<a href="/tips/{slug}/">`. Added `.listing-row__title-link` to `site/src/styles/listing-rows.css` — inherits color, no underline, accent-coloured hover.
- Sibling navigation uses alphabetical slug order (no `order` field on tips); first tip is reused as the "next" of the last one (wrap behaviour).
- Verified: all 27 tip detail pages return HTTP 200 from the dev server; the 6 edited tips render the new beginner cues; `npx astro check` clean (0 errors).

**Why:** content quality work is wasted if it doesn't surface. The /tips page was a catalog without click-through — bodies shipped only via the plugin snapshot. Detail pages close the loop so the markdown bodies (the load-bearing content) actually reach site readers.

**Refs:** `site/src/pages/tips/[slug].astro` (new), `site/src/pages/tips.astro` (row-title link wrap), `site/src/styles/listing-rows.css` (`.listing-row__title-link`), Issue: §S.14 page list now four entries.

---

## 2026-05-29 — Tips beginner-test pass + standing authoring rule

**Trigger:** read of all 27 tips through a beginner's eyes — config/syntax tips (hooks, slash commands, subagents) explained the format without telling a newcomer they could ask Claude to write it for them.

**Decision:**
- Adopted a three-question beginner test as the gate for every tip: *what is it / when do I reach for it / what do I do next*.
- For tips touching configuration or file format, **require an "ask Claude to do it for you" cue** with a sample one-line prompt alongside the worked snippet.
- Edited 6 tips: `workflow-hooks-vs-claudemd`, `workflow-slash-commands`, `workflow-subagents`, `workflow-claudemd-iterate`, `workflow-cli-tools`, `prompt-describe-business-value`. The other 21 passed unchanged (most prompting tips already had Bad/Good examples; control-keys like Esc are atomic).
- Created standing-rule doc `docs/reference/authoring-tips.md` (mirrors the `authoring-glossary-terms.md` pattern) — codifies the test, the cue template, when to include a worked example, and the per-tip workflow checklist.
- Wired into `CLAUDE.md § Working rules` as a one-line pointer so reviewers apply the test before merging tips.
- No tip count change → no AUTO sync needed.

**Why:** the hub's audience is bank colleagues who came to Claude Code precisely to *not* memorise config formats. A tip that teaches the JSON schema without telling them they can describe-the-outcome and let Claude wire it up misses the point of the assistant they're holding.

**Refs:** `docs/reference/authoring-tips.md`, 6 edited files under `tips/`, `CLAUDE.md` § Working rules, SCOPE.md *Last updated* 2026-05-29.

---

## 2026-05-29 — Use Cases v3 follow-up: `:global()` scope fixes for filter chips + OS toggle

**Decision:**
- **Topic-filter chip styles on `/use-cases/` were inert.** Cause: `.topic-filter__chip` etc. live in `TopicFilter.astro`'s component-scoped `<style>` block, which only emits the `:where(.astro-XXXX)` hash for elements TopicFilter itself renders. The gallery page inlines the same class names without rendering the component, so the chip styles never applied — rendered as default `<button>` text + a thin grey border. Fix: re-declared `.topic-filter`, `.topic-filter__label`, `.topic-filter__group`, `.topic-filter__chip` (+hover/pressed/focus), and `.topic-filter__clear` inside `site/src/pages/use-cases/index.astro`'s `<style>` block wrapped in `:global()` so Astro doesn't scope them away. Values mirror TopicFilter exactly with token fallbacks; both files stay visually identical to /tips and /skills.
- **OS toggle didn't actually swap visible commands.** Cause: same scoping bug at a different layer — the per-OS visibility rules (`html[data-os-prefer='mac'] [data-os='windows'] { display: none }`) were emitted with this-page's hash, but the `<div data-os="mac">` / `<div data-os="windows">` blocks come from `set:html` markdown content and don't carry the hash. Fix: wrapped all three visibility rules + the visual-cue rules (left rule, surface tint, `:last-child` margin, inner `pre` spacing) in `:global()` inside `[slug].astro`. Verified end-to-end with Puppeteer: on load `mac → block / windows → none`; after Windows click `mac → none / windows → block`. localStorage persistence across pages works.

**Why:** Astro scopes every selector in a non-`is:global` `<style>` block by appending a hash class to elements the component renders. Anything coming from `set:html` (markdown bodies, raw HTML strings) doesn't get the hash, so the selectors silently never match. Both bugs traced to the same trap. Standing rule for the project now lives in `CLAUDE.md` repo-layout line for `usecases/`: any selector targeting markdown-rendered HTML on this page needs `:global()`.

**Refs:** `site/src/pages/use-cases/index.astro` (chip styles), `site/src/pages/use-cases/[slug].astro` (OS visibility), `CLAUDE.md` (usecases layout line). Verified live with Puppeteer + headless screenshots.

---

## 2026-05-29 — Tips: overhaul (UX rethink, content expansion 18→27, "Survival keys" → "Control keys")

**Decision:**
- **Filter UX rethink** — unified AudienceFilter + TopicFilter into one chip vocabulary (label-above-chips column layout, accent-teal active state regardless of chip count). Replaced `T1 / 4` mono section heads with serif `.listing-section__title` + quiet lede (Foundations vocabulary). Filters dispatch `nbg:filters-changed`; a per-page coordinator hides empty cluster sections (`.is-empty`) and reveals a "No tips match" aside with one-click Clear. Hero→content gap tightened ~88px → ~40px via `.hero--stack:has(.hero__filter)`. Double-hairline between sections fixed by dropping redundant `border-top` (the agentnews `.section { border-bottom }` already separates them).
- **Compact row variant** (`.listing-list--compact`, tips-only) — dropped redundant `TIP · CLUSTER` eyebrow, shrank title 1.35rem → 1.0625rem, clamped summary to 2 lines, tightened padding to 0.7rem. Row height 161px → 90px. Two Starlight unlayered-cascade gotchas patched in-place with `!important` (per the standing rule in CLAUDE.md). Skills layout untouched.
- **"Survival keys" → "Control keys"** retired across the site. Reason: bank colleagues new to Claude Code read "survival" as alarmist; "control" is plain and accurate. Touched tip frontmatter (`survival` → `control`), tip titles, Day 1 Step 6 + TOC label, about page, README, CLAUDE.md repo layout, SCOPE.md, plugin tests + fixture.
- **Content expansion 18 → 27** — deleted `prompt-context-first.md` (overlap absorbed into bad-vs-good-openers). Authored 10 new tips covering plan-first workflow, CLAUDE.md-as-living-memory (Boris Cherny's golden rule), session focus, `claude --continue`, custom `.claude/commands/`, `@`/`!` shortcuts, gh/az CLIs, subagents (advanced), hooks-vs-CLAUDE.md (advanced), think-harder + `/effort`. Added a 5th "Workflow & commands" cluster.
- **Cluster matcher correctness** — replaced regex substring tests with exact-string topic membership. The old `/model/i` was matching `"trust-model"` and pulling always-review-changes into Prompting cluster.
- **Topic-chip cleanup** — bundled two redundant pairs in tip frontmatter (`trust-model` ⊂ Safety on same tip; `llm-strategy` ⊂ Data-residency on same tip). 16 chips → 14, no information loss.

**Why:** Mid-session user feedback caught filter inconsistencies + visual noise (oversized cards, double borders, gigantic gaps), "survival" as alarmist for the bank-newcomer audience, and catalog gaps the research surfaced — plan-first workflow, custom commands, hooks vs instructions, subagents, resume sessions, thinking triggers.

**Refs:** `site/src/components/{Audience,Topic}Filter.astro`, `site/src/pages/tips.astro`, `site/src/styles/listing-rows.css`, `tips/*.md` (10 new, 1 deleted, several refined), `journeys/day-1.md`, `site/src/pages/{about,start-here/day-1}.astro`, `plugin/tests/{lib/journeys.test.ts,fixtures/snapshot/journeys/day-1.md}`, `plugin/snapshot/` (rebuilt). Sources for catalog research: Anthropic docs, Boris Cherny's published workflow, awesome-claude-code, dev.to / builder.io / kentgigger guides. Site tests: 310/310.

---

## 2026-05-28 (night) — Use Cases pillar v3: homepage refs, OS toggle, terminal-styled snippets, AudienceFilter parity

**Decision:**
- **Homepage Use Cases references** — added a third CTA "→ Try a Use Case" to the "Start with Foundations" router card (alongside Foundations + Day 1 setup), promoted Use Cases to the first pill in "Jump straight in", added it to the footer "Start" column. The newcomer card now flexes to wrap three buttons on narrow viewports.
- **OS toggle on use-case detail pages** — small segmented pair ("YOUR OS · macOS · Windows") rendered in the hero intro. Click switches the page's `<html data-os-prefer>` attribute and persists it to `localStorage.nbgaihub.os-prefer`. CSS rules then hide `[data-os="mac"]` or `[data-os="windows"]` blocks based on the attribute. macOS is the default. The toggle script is inline + runs as early as possible to keep first-paint flicker minimal.
- **OS-tagged blocks across all 12 markdown files** — every "Open the Terminal app" line now wraps the OS-specific instruction in `<div data-os="mac">` / `<div data-os="windows">` containers. Windows variant points readers at the WSL install in Day 1 if they don't have Ubuntu. mortgage-calculator Step 4 (open-the-file fallback) also got the OS split.
- **Terminal-styled `pre` blocks** — Shell-command snippets in use-case bodies now render as a fake terminal window: dark teal (`#052329`) background, light cream text, three coloured dots (red/yellow/green) top-left, a "TERMINAL" mono label top-right. Shiki's per-token inline styles overridden with `!important` so the palette reads consistently regardless of light/dark page theme. Inline `code` (not inside a pre) keeps the original subtle teal-on-grey pill.
- **AudienceFilter added to gallery** — page now stacks two filters in the hero matching the Tips/Skills pattern exactly: SHOW (Everything / For beginners / For experienced) above FILTER BY UNIT (multi-select chips). Cards carry `data-audience`; new coordinator script ANDs the audience-filter `audience-hidden` class with our `unit-hidden` class and listens for `nbg:filters-changed` events.

**Why:** User feedback identified four gaps after the v2 ship — main page didn't reference the new pillar, the gallery filter had a SHOW row missing relative to /tips, terminal-instruction code blocks read as "code" not "command", and Mac/Windows divergent commands forced every reader to mentally filter for their OS every time. All four addressed in one round.

**Refs:** `site/src/pages/index.astro` (3 edits), `site/src/pages/use-cases/index.astro` (AudienceFilter import + filter coordinator), `site/src/pages/use-cases/[slug].astro` (OS toggle + terminal pre styling), 12 `usecases/*.md` files. Astro check: 0 errors / 0 warnings.

---

## 2026-05-28 (late evening) — Use Cases pillar v2: 12 use cases, explicit file-creation steps, filter UI matches Tips/Skills

**Decision:**
- **Pillar doubled to 12** — 6 new use cases authored covering Risk (credit-memo-tldr), Data (sql-from-question), Accounting (invoice-data-extract), HR (onboarding-checklist), Operations multilingual (document-translator), Process improvement (runbook-from-interview). Together with the original 6 the pillar now spans Retail · Contact center · Compliance · Mortgages · Operations · Process improvement · HR · Risk · Data · Accounting.
- **Schema enum extended** — `business_unit` in `site/src/content.config.ts` adds `hr`, `risk`, `data`, `accounting`. `BUSINESS_UNIT_LABELS` map mirrored in both `index.astro` and `[slug].astro`.
- **All 12 use cases rewritten for zero-prior-knowledge file creation.** Every step that creates a file now starts with the explicit Terminal walkthrough — open Terminal app → `mkdir ~/Desktop/folder` → `cd` → `claude` — and then asks Claude to write the markdown/text file with inline content. Reason: feedback from user — readers don't know how to "create a new MD" by hand; assuming they know `nano`/`touch`/TextEdit broke the trust chain.
- **Filter UI overhauled to match Tips/Skills.** Dropped the bespoke `.unit-filter` markup + the "All" chip (the all-state is implicit when zero chips are pressed — same as TopicFilter on /tips). Now uses `.topic-filter` markup + classes, so chip styling, "Clear" link semantics, label-above-chips column layout, and accent-teal pressed state all inherit from `listing-rows.css`. Inline script ports TopicFilter's multi-select OR logic onto `data-business-unit` cards.
- **Hero filter breathing room** — `.hero--stack .hero__filter` margin-top bumped 1.5rem → 2.5rem so the filter doesn't feel crammed against the lede.
- **Splash-page nav** (`SplashAwareHeader.astro`) gained the Use Cases entry between Day 1 and Tips (the earlier `astro.config.mjs` sidebar entry only renders on content-detail pages).

**Why:** Earlier round shipped 6 use cases but skipped the "how do I make a file" gap and used a bespoke filter that didn't match the rest of the site. User feedback caught both — fix is a content rewrite + a small filter swap, not a redesign.

**Refs:** 12 files in `usecases/`. Schema: `site/src/content.config.ts`. Pages: `site/src/pages/use-cases/index.astro` + `[slug].astro`. Splash nav: `site/src/components/SplashAwareHeader.astro`. Astro check: 0 errors / 0 warnings.

---

## 2026-05-28 (evening) — Use Cases pillar: a 6-card gallery + per-case walkthroughs

**Decision:**
- New `usecases` content collection in `site/src/content.config.ts` — `baseShape('usecase')` + 6 use-case-specific fields (`business_unit` enum, `time_estimate`, `difficulty`, `order`, `outcome`, `inputs[]`). Markdown body uses the same `## Step N — Title` segmentation as journeys/day-1.md and journeys/foundations.md so the existing splitter pattern fits unchanged.
- Six beginner-friendly worked examples authored under `usecases/`: complaint-heatmap (Contact center), empathic-reply (Retail), policy-diff (Compliance), mortgage-calculator (Mortgages), minute-taker (Operations), regulator-brief (Compliance). Each is ~15–30 min, has a clear input + outcome, includes an explicit compliance/synthetic-data check, and ends with a "save the prompt as a template" Step 5 so the second run takes seconds.
- Gallery page `site/src/pages/use-cases/index.astro` — 2-column card grid, business-unit chip filter (vocabulary matches /tips), finale card pointing at /tips + /skills.
- Detail page `site/src/pages/use-cases/[slug].astro` — Day-1-style 2-column docs (240px sticky TOC + scrollable steps), hero with outcome + inputs side-by-side cards, next-use-case CTA at bottom.
- Sidebar adds "Use Cases" between Day 1 and Tips. Day 1's bottom "Next →" card switched from Tips to Use Cases as primary (Tips demoted to secondary). Foundations hero adds a third skip-link ("→ already installed? Try a Use Case") and the bottom "Next →" card adds a "Or jump to Use Cases" secondary CTA.

**Why:** Foundations + Day 1 left newcomers with mental models + a working install but no concrete first thing to do. Use Cases closes that loop with bank-relevant beginner examples — the same shape used by docs/design/project-design.md's "compress time-to-confidence" goal.

**Refs:** new files under `usecases/`, `site/src/pages/use-cases/`. Schema: `site/src/content.config.ts`. Sidebar: `site/astro.config.mjs`. Cross-refs: `site/src/pages/start-here/foundations.astro`, `site/src/pages/start-here/day-1.astro`.

---

## 2026-05-27 (overnight, follow-up) — Day 1 Step 4: add GitHub commit/push subsection

**Decision:** Added a new "Want to share your work? Push it to GitHub" subsection at the end of Step 4. Explains the local-vs-shared pivot, points back to `gh auth login` from Step 3, gives the two prompts ("create a GitHub repo for this folder and push it" / "commit and push"), and provides the two-word commit/push definitions. Also tweaked the Step 5 "Without `CLAUDE.md`" bullet ("two completely different reports" → "different reports every time you run it") per UAT.

**Why:** Day 1 was teaching first-session usage but leaving readers stranded at the local-folder boundary — no bridge to "now share it with your team". The new subsection closes that loop using only the `gh` tooling they already set up in Step 3 (no MCP, no extra setup).

**Refs:** current commit. Tests: site 310/310. Live: <https://chomovazuzana.github.io/NbgAiHub/start-here/day-1/#d4>.

---

## 2026-05-27 (overnight) — Day 1 public-safe content overhaul + CLAUDE.md before/after figure + Starlight `article + article` round 3

**Decision:**
- `journeys/day-1.md` rewritten to 6 ordered steps: Open terminal · Install Claude Code · GitHub account · First session · Write `CLAUDE.md` · Survival keys. All NBG-internal references scrubbed — no @nbg.gr, no clouddevops contact, no procurement-code flow, no hardcoded org/repo. Provider step lists all four Claude Code backends neutrally with placeholder env-var shape for Vertex/Bedrock.
- Step 4 happy path is now `mkdir ~/claude-playground && claude` (clone-from-GitHub demoted to the alternative); explicit don't-run-`claude`-in-`$HOME` warning added.
- Step 5 introduces a side-by-side **before/after figure** above the prose (left "Without CLAUDE.md" = three distinct grey report glyphs; right "With CLAUDE.md" = three identical accent-teal glyphs; same `loans.xlsx` + "analyse + report" pill in both). Story below restructured to bullets. Dropped `/claudemd` skill mention + "keep it under two pages" line; added "if it gets bigger, reference other docs". `claude --continue` caveat woven into the "no save button in Claude Code" framing.
- Mac terminal list reordered: **cmux** (new — purpose-built for AI coding agents, [cmux.com](https://cmux.com/)) → Ghostty → Warp → **iTerm2** (now last). Mac screenshot shortcut spelled exactly as user dictated: `⌘C` capture / `control V` paste.
- `journeys/foundations.md`: removed the "You don't need Claude Code to do your job" intro paragraph; CLAUDE.md bullet now links to `/start-here/day-1/#d5`.
- `glossary/wsl.md`: bank-specific framing ("bank Windows laptop" / "bank-managed machines") → generic "managed laptop"; added Microsoft + Git for Windows + Windows Terminal inline links.
- Body links on both pages (`.day-section__body` + `.foundation-step__body`): explicit `:global(a)` rule — accent colour + always-visible 1px underline (thickens to 2px on hover/focus). Stops links looking like normal text until hover.
- `site/src/pages/start-here/day-1.astro`: `tocLabels` reordered for the new step order; top-card grid bumped 5 → 6 columns mirroring Foundations' 75rem/48rem/30rem breakpoints; dummy `<TerminalDemo>` blocks + unused frame consts removed (no more "Stylised preview" callouts on Day 1).
- **Starlight `article + article` gotcha — round 3:** the figure's two `<article>` panels were Y-misaligned by 16px (probe confirmed `marginTop: 16px` on the 2nd panel). Same root cause Foundations already documented on `.foundation-compare__col` (DECISIONS 2026-05-21): Starlight ships an unlayered `article + article` rule injecting `margin-top: 16px` on subsequent siblings. Same fix applied — `margin: 0 !important` on `.claudemd-panel`, with a comment pointing back to Foundations so the pattern is discoverable. Post-fix probe: both panels pixel-identical (`top: 254`, `bottom: 683`, `height: 429`, `marginTop: 0`).
- `site/tests/build-output.test.ts`: drifted `Day-1 step segmentation` regex fixed — was asserting `id="step-N"`, page emits `id="dN"` since ff67a4a.
- Closed `Issues - Pending Items.md` #21 (Day 1 TerminalDemo mocks are gone).

**Why:** Day 1 was the most-trafficked page still leaking NBG-internal references (specific repo paths, "bank email", "bank-issued authenticator") — unsafe for the now-public Pages deploy. Rewriting to the 6-step ordered flow + scrubbing the NBG-isms makes the page safe for the live URL. The before/after figure visualises CLAUDE.md's value faster than prose ever could.

**Refs:** current commit. Tests: site 310/310 (1 skipped). Live: <https://chomovazuzana.github.io/NbgAiHub/start-here/day-1/>. Issue #20 (broader `@layer starlight` workaround) still deferred — round 3 is another datapoint for prioritising it.

---

## 2026-05-27 (late evening) — Day 1 docs-style layout + Starlight cascade hardening, round 2

**Decision:**
- Day 1 rewritten to the Foundations docs-style layout: 240px sticky TOC sidebar | scrollable main column with 48rem justified prose, clean title-only section heads, accent "Next → Tips" card at the bottom. Top 5-card `.journey-overview` kept (UAT preference).
- Foundations grew the matching 6-card top overview; one IntersectionObserver drives both the sidebar TOC `data-active` and the top-card `data-current` highlights in sync.
- `journeys/day-1.md`: removed the stale `> **2026-05-27 — sequence change**` blockquote.
- `!important` baked onto every body-prose `:global(<tag>)` rule (p, blockquote, h3, code, pre, table, strong) AND every layout/spacing property (`.day-layout`/`.foundation-layout` padding-block + grid, `.day-section__head`/`.foundation-section__head` margin-bottom, `.day-main`/`.foundation-main` gap, etc.). Intro sections renamed from `.section` → `.day-intro-section` / `.foundation-intro-section` to dodge `agentnews-layout.css`'s `.section { padding-block: 0 !important }` rule entirely.
- New canonical reference: `docs/reference/starlight-cascade-gotcha.md` — incident log + default posture + diagnosis ladder. Linked from CLAUDE.md new "Starlight cascade gotcha" section. Memory file `feedback_starlight_unlayered.md` updated with the layout-rule corollary.

**Why:** Round-1 cascade fix (Issue #20 / DECISIONS 2026-05-26) covered `:global(<tag>)` typography but not structural spacing; deploy showed layout-padding + section-head margin collapse before any local probe surfaced them. Documenting once, exhaustively, breaks the cycle of rediscovery.

**Refs:** commits `ff67a4a`, `facf572`, plus the current commit. Live: <https://chomovazuzana.github.io/NbgAiHub/start-here/day-1/> + `/foundations/`. Issue #20 retained (wider fix — wrapping Starlight CSS in `@layer starlight` via PostCSS — still deferred).

---

## 2026-05-27 (evening) — Homepage demo swapped from mock to real recording

**Decision:**
- `site/src/pages/index.astro` "What a session looks like" section: dropped the `TerminalDemo` mock + `homeDemoFrames` const; replaced with an autoplaying, looping `<video>` of a real Sonnet-4.6 `claude` CLI session (create dummy loans CSV → analyse → write report.md), framed in a macOS-style chrome.
- Recording produced via VHS driving the actual `claude` CLI in a fresh `~/Desktop/Claude Demo/real/` folder. Tape, source MP4, and the loans.csv/report.md it generated all live at `~/Desktop/Claude Demo/`.
- Post-processing chain on source: `ffmpeg` drawbox masks (3 boxes, Catppuccin-Mocha-base fill) to hide the welcome banner's "Welcome back \<name>" and "\<email>'s Organization" lines through the full scroll-out (t<12.2 stable + t=12.0–12.8 wide cover for the scroll transition) → `setpts=PTS/1.4` speedup → 6 s of idle-air cut between the first response completing and the second prompt starting.
- Final asset: `site/public/demo/claude-session.mp4` (696 K, 26.4 s, h264 +faststart). Path resolved via `import.meta.env.BASE_URL` so local dev (`/demo/...`) and Pages (`/NbgAiHub/demo/...`) both work.
- `TerminalDemo.astro` component kept (still used on `/start-here/day-1`).

**Why:** Mock terminal frames reading as a placeholder; a real recording is more credible to newcomers and matches the "no scripting" positioning. Cuts/masks remove PII and dead air without re-recording.

**Refs:** commit pending. Live URL after push: <https://chomovazuzana.github.io/NbgAiHub/>.

---

## 2026-05-26 (afternoon) — Site published to GitHub Pages + Starlight unlayered-cascade learning

**Decision:**
- Repo flipped public via `gh repo edit --visibility public`; Pages enabled with `build_type: workflow` via `gh api`. Live at <https://chomovazuzana.github.io/NbgAiHub/>. Closes Issue #18.
- Brand link + logo `src` made base-aware via `import.meta.env.BASE_URL` in `SplashAwareHeader.astro` (Astro doesn't auto-prefix raw `<a>` and `<img>` attributes).
- Topnav inner container centered via `margin-inline: auto` on `.nbg-topnav__inner` in `MarketingShell.astro`.
- 3 visual regressions on live (search trigger size, my-pins h3 size, `⌘K` hint reappearing) all traced to one root cause: **Starlight ships CSS unlayered, beats `@layer nbg.components` in production CSS order**. Fixed with `!important` on the specific properties + fully-global `:global(...)` selectors. New Issue #20; project memory `feedback_starlight_unlayered.md`.
- `TokenInvalidError` now auto-signs-out (in `my-pins.astro` + `PinButton.astro`) instead of dumping 401 JSON.

**Why:** Free Pages requires public repo. The unlayered-cascade behaviour is in the CSS spec (unlayered rules win over any `@layer` block); local dev order masked it.

**Refs:** commits `954b5dd`, `bf5b320`, `55e74e0`, `e8116eb`, `8b76942`. Tests: site 310/310, pipeline 205/205.

---

## 2026-05-26 — Listing-page parity pass + sign-in modal redesign + violet→teal focus-ring fix

**Decision:**
- Tips + Skills redesigned as structural twins of Foundations: `.hero hero--stack` title, inline filter (no own chrome), parallel section grouping. Shared row CSS in new `site/src/styles/listing-rows.css`.
- Hover-revealed pin icon on every listing row (`opacity: 0` at rest, `1` on row hover); click while signed-out dispatches `nbgaihub:open-signin-modal`. `PinButton` gains `iconOnly` prop.
- `SignInModal` redesigned end-to-end: centered via explicit `position: fixed; transform: translate(-50%, -50%)`; serif italic title; teal `01`/`02` numbered step cards; primary CTA "Sign in" (was "Validate & sign in"). All `data-nbg-signin-*` hooks preserved.
- Focus-ring token fixed site-wide: `--nbg-sh-focus-ring` overridden in `tokens/semantic.css` (light + dark) with `var(--nbg-bg)` + `var(--nbg-accent)`. Primitive in `tokens/primitives.css` still violet (Issue #19, semantic override wins).

**Why:** Operator review flagged listings felt off vs Foundations, modal pinned top-left, purple focus rings sitewide.

**Refs:** site 310/310 tests after rebuild; doc counts unchanged.

---

## 2026-05-25 (late-night) — UAT-driven UX overhaul

**Decision (UAT-feedback-2026-05-25.md, 16 of 17 ops-approved fixes):**
- Tip + Skill detail pages: solved by redesigning listings as single-column rich-row lists with `#tip-<slug>` / `#skill-<slug>` anchors. No new per-item routes.
- `AudienceFilter`: 3-checkbox → single-select segmented (Everything / For beginners / For experienced). LocalStorage array auto-migrates to string.
- Glossary: uniformity via renderer (IN ONE LINE / IN DETAIL / LEARN MORE zones around each entry's body) — no 36-file content rewrite.
- My Pins: 2-column layout (CTA panel + 4-card FAQ aside, `01`/`02`/`03`/`04`).
- `/submit-skill/` + `/contribute/` pages **deleted** (PAT-paste form read as phishing to non-devs). CI validator retained for direct-PR contributions. All `556lowcodenocode.github.io/Onboarding` references purged from 65 content files (`deeper_link: null`).
- `PinButton.setSignedOut()` hides the button entirely (no per-card "Sign in to pin" nag).
- Shiki dual-theme `{ light: 'github-light', dark: 'github-dark' }`; `pre.astro-code` bg overridden to `var(--nbg-c-teal-900)` for on-brand dark teal code blocks.
- Homepage: "New here?" intro panel, compass/lightning router icons, trailing-period H1 tic dropped, entry counts removed, truncated previews fixed (`line-clamp` removed), footer rewritten without repo link.
- `⌘K` hint hidden; theme toggle gets `title`/`aria-label`. Mobile hero clamp lowered to `1.75rem` min.

**Why:** Demo-day prep for colleague review; UAT pass surfaced ergonomic + tone gaps.

**Refs:** 310/310 tests after 3 stale-assertion updates. Operator declared demo-ready.

---

## 2026-05-25 (late-evening) — Micro-port from Crist + Onboarding guide

**Decision:** 4 surgical additions from external Claude Code references; 10+ candidates rejected for duplicating the Onboarding guide.
- `glossary/context-window.md` body: glass-of-water metaphor (every prompt/file/output pours in; full glass → oldest spills).
- `glossary/claudemd.md` body: "great long-term memory but amnesia about this morning" framing.
- New `tips/permission-modes.md` — Shift+Tab cycle (default / auto-accept-edits / plan).
- New `tips/prompt-briefing-template.md` — Role/Goal/Task/Constraints/Context, targets non-code work (existing `prompt-bad-vs-good-openers.md` is dev-shaped).

**Why:** Strengthens existing weak lines (vague "working memory" → vivid metaphor) and fills real gaps (no permission-modes coverage, no generic non-code briefing template).

**Refs:** Tip count 12 → 14. AUTO blocks regenerated.

---

## 2026-05-25 (evening) — Day 1 UX redesign + project-wide glossary tldr rewrite

**Decision:**
- Day 1 hero retitled "Where to start. Practically"; added 5-step chip-row overview under lede (inline IntersectionObserver active-state).
- Per-step `01`–`05` pill badge as primary visual landmark (mono "Step N / 5" eyebrow stays as global progress counter).
- Bottom CTA grid-3 → grid-2 (drop Skills card per operator direction).
- **All 36 glossary `tldr` rewritten in plainspoken beginner language.** Jargon-as-explanation ("statistical engine", "USB-C for AI integrations") swapped for analogies + concrete examples. Voice rule going forward: tldrs explain *to* beginners, not *between* experts.
- 2 new entries: `glossary/github.md` (the platform; distinct from `gh` CLI), `glossary/slash-command.md` (with `aliases: ["slash command", "slash commands"]` — hyphenated slug needs spaced variants).

**Why:** Operator flagged GitHub tooltip "filing cabinet…" as too dense for beginners — canary for systemic tldr-audience mismatch.

**Refs:** Glossary 34 → 36. Astro content-store cache gotcha hit again (Issue #17 — `rm -rf site/.astro` + restart needed).

---

## 2026-05-25 — Content-page reader mode, listing-page glossary auto-linking, MyPins redesign

**Decision:**
- New `mode="reader"` prop on `<MarketingShell>` → `data-mode="reader"` driving 5 quiet-rhythm CSS rules in `agentnews-layout.css`. New `.hero--stack` modifier. Applied to Foundations + Day 1.
- Glossary auto-linking extended to plain-text strings via new `site/src/lib/glossary-link-string.ts` helper. Shares the plugin's `getGlossaryIndex()`; emits identical button HTML. Wired into JSX-rendered card summaries + hero ledes (0 → 7-11 links per page).
- 2 new glossary terms: HTTP, API. Day 1 page cleaned (pullquote removed, Week 1 references + page deleted, "Where next" with Glossary card replacing Week 1).
- `/my-pins/` rebuilt as unified card pinboard (filter chips, real empty state, per-card unpin); fixed two Starlight-cascade bugs via Puppeteer + CDP `CSS.getMatchedStylesForNode`.
- `/glossary/` sticky rail actually sticky; `scroll-margin-top: 13rem` so hash anchors land below rail.
- Nested glossary tooltips ("hover inside hover") via build-time pre-linked `tldrHtml` + lazy nested `wire(pop)` on first show. Previous eager-recursive approach locked the page (hundreds of popovers + listeners).
- Local-dev `base: '/NbgAiHub'` removed from `astro.config.mjs` (broke local nav). Env-driven re-add later (Issue #18, since closed 2026-05-26).

**Why:** Listings showed terms in plain text while bodies linked them; my-pins felt like a barebones admin list; tooltips were terminal nodes that broke the navigation graph.

**Refs:** Visual-verification rule landed in global `~/.claude/CLAUDE.md` after the second blind-iteration Starlight margin bug.

---

## 2026-05-25 — Publish site to GitHub Pages (config landed)

**Decision:** Host static Astro build on Pages at `chomovazuzana.github.io/NbgAiHub/`. Configured `site` + `base: '/NbgAiHub'` + `trailingSlash: 'always'`. Added postbuild `site/scripts/rewrite-base-paths.mjs` for the 9 top-level routes. Pages workflow at `.github/workflows/deploy-pages.yml`.

**Why:** Free hosting matching the GitHub-as-CMS architecture; no new vendor.

**Constraint:** free Pages requires public repo — paths (a) flip public, (b) Pro $4/mo, (c) host elsewhere. Resolved 2026-05-26 (afternoon) — went public.

---

## 2026-05-25 — Navigation rework: two-door landing, News external

**Decision:**
- Sidebar flattened to one entry per pillar: Home · Foundations · Day 1 · Skills · Tips & Tricks · Glossary · News ↗ · My Pins (was 13 across 3 groups).
- `/news/` hard-redirects to `https://biks2013.github.io/AgentNews/` via `astro.config.mjs#redirects`. `site/src/pages/news/` deleted. Branding rule: "News" everywhere in UI, never "AgentNews".
- `/reference/` deleted (14 entries were redundant with Tips/Glossary or `status: "planned"`).
- `/contribute/`, `/submit-skill/`, `/start-here/week-1/` left as orphan routes (Issue #14).
- Landing page rewritten as two-door router: Newcomer card (teal-soft, Foundations + Day 1) vs Experienced card (4-pill row: Skills / Tips / Glossary / News ↗).

**Why:** User feedback "well-hidden information across subpages"; two-door makes the audience split explicit.

**Refs:** 232 site tests passing. Surfaced the Starlight `.sl-markdown-content` sibling-margin gotcha — `:not(a, ...) + :not(a, ...) { margin-top }` adding phantom 16px. Override `.router-grid > * + * { margin-top: 0 }`. Drove the new global "Visual verification" rule.

---

## 2026-05-25 — Glossary auto-link + hover tooltips (build-time, first-occurrence-only)

**Decision:**
- Custom remark plugin `site/src/plugins/remark-glossary-link.ts` walks markdown AST at build time. Wraps first occurrence per page of each glossary term (or alias) in `<button data-glossary-slug="…">`. Skip rules: code fences, inline code, headings, existing links, Starlight asides, own glossary page, `/news/published/`.
- Primitive `GlossaryTerm.astro` (17th, AC36/AC37 portable — zero Starlight imports) injects per-page JSON manifest + wiring script. Hydrates buttons into HTML `<span popover="auto">` tooltips: title + tldr + "Read more →". Hover/focus/click/ESC.
- Schema extension: required `tldr` (≤160, plain text, no fallback) + optional `aliases: string[]` (default `[]`).
- 7 new glossary terms backfilled: cli, frontmatter, yaml, markdown, rss, model, **hook** (caught mid-flight). Glossary 21 → 28.
- Three pages explicitly wire the plugin into `createMarkdownProcessor()` because Astro's content-collection `render()` bypasses project `markdown.remarkPlugins`: `foundations.astro`, `day-1.astro`, `glossary.astro` (Issue #15).
- Post-review follow-ons same session: XSS-safe JSON manifest escape (`<`/`>`/U+2028/U+2029); `alias.min(1)` schema tightening; popover positioning anchored at trigger bottom-right with viewport-edge clamping + scroll/resize repositioning.

**Why:** Make glossary load-bearing across all surfaces. Build-time linking is single-source-of-truth (no author burden, no rot on slug rename).

**Refs:** `docs/design/project-design.md` §S.14; `docs/design/plan-006-glossary-tooltips.md`; `docs/refined-requests/glossary-tooltips.md`; `docs/reference/authoring-glossary-terms.md`.

---

## 2026-05-21 — Reddit OAuth path parked; Reddit feeds reverted to `.rss`

**Decision:** Reddit feeds revert to `type: "rss"` + `www.reddit.com/r/<sub>/.rss`. OAuth + engagement-filter + JSON-parser code stays as dormant ready-to-reactivate scaffolding (`pipeline/src/{reddit-auth,parse-reddit,reddit-filter}.ts` + `readRedditCreds` + `fetchFeedXml.authToken`).

**Why:** Reddit blocks unauthenticated JSON from GH Actions IPs (403). Reddit's script-app creation form rejected captcha submissions across browser attempts (likely extensions / low-trust-account / network filtering). Not a code-side problem.

**Trade-off:** Engagement floor (drop stickies, `score>=50`, `num_comments>=10`) is **not active** — Atom has no engagement fields. 22:00 UTC cron shift **stays** (independent). Reactivation path: retry app creation on different browser/network, add `REDDIT_CLIENT_*` secrets, flip 2 entries in `config/rss-sources.json` (`type` + URL). No code change.

**Supersedes:** the same-day "Reddit feeds switch to JSON endpoint + engagement floor" and "Reddit access via Application-Only OAuth" entries (decisions still valid as dormant code; current runtime config differs).

**Refs:** Issue #13. Pipeline 205/205 tests still pass (dormant code paths covered, never entered).

---

## 2026-05-19 — Rolling 7-day retention for `news/published/`

**Decision:** Each daily pipeline run prunes any `news/published/<YYYY-MM-DD>-*.md` with date prefix strictly older than `today - 7 days` (UTC). Pruning lands in the same commit as the day's new items via new `pipeline/src/retention.ts` (`RETENTION_DAYS = 7` hardcoded, no fallback). Workflow gates direct-push branch on new `had_changes` step output.

**Why:** Bounded repo size + freshness for an ephemeral pillar.

**Refs:** Pipeline tests 145 → 161.

---

## 2026-05-19 — Unconditional auto-promote (reverses earlier same-day variant C)

**Decision:** Drop `editor_confidence` half of the auto-promote gate. Flip all feeds to `auto_promote_eligible: true`. Every relevant triaged item writes direct to `news/published/`; workflow pushes to `main` with no PR. `auto_promote_eligible` retained as per-feed kill switch.

**Why:** Daily-PR-review friction outweighs the cost of occasional off-topic Reddit posts. Cross-feed title dedup is now the load-bearing quality control.

**Supersedes:** earlier same-day "Auto-promotion of high-confidence professional-source news items" (variant C). Infrastructure (per-feed flag, 3-mode workflow branching, PR body splitting) stays in place; only policy values changed.

**Refs:** Pipeline tests 145 still pass.

---

## 2026-05-19 — Personalization + community contributions: PAT-scoped gist + URL-redirect submissions

**Decision:**
- Favourites: paste a `gist`-scope PAT into a sign-in modal; favourites live in user's unlisted gist `nbgaihub-favorites.json` (shape `{schema_version: 1, favourites: [{type, slug, pinned_at}]}`, last-write-wins read-modify-write).
- Skill submissions: GitHub `new file` URL redirect (`github.com/<owner>/<repo>/new/main/skills?filename=&value=`), not browser-side write APIs. CI validator catches malformed entries at PR time.

**Why:** Original Device Flow + OAuth App design blocked by CORS on GitHub's OAuth handshake endpoints. Cloudflare Worker proxy was the recommended fix; rejected to keep the project zero-infrastructure. PAT-paste reuses GitHub's existing token UI; `gist` scope narrower than `repo`. Gist is **unlisted not private** — 32-char hex URL is unguessable but not auth-protected (documented in user-facing privacy callout).

**Reverses:** SCOPE.md "Per-user personalization or bookmarking" (was Out of Scope) and "Community contributions" (was Deferred). Now MVP-IN.

**Refs:** `docs/refined-requests/personalization-and-contributions.md`; `docs/design/plan-003-personalization-and-contributions.md`; `docs/reference/gist-contract.md`. Commits `c1df291`, `5a08260`, `64f83b2`.

---

## 2026-05-19 — Hub plugin (plan-003) shipped

**Decision:** `/hub` plugin operational. Eleven `/hub-*` commands ship in `plugin/` sibling to `pipeline/` and `site/`. Marketplace at repo-root `.claude-plugin/marketplace.json` (`source: "./plugin"`); plugin manifest at `plugin/.claude-plugin/plugin.json`.

**Architectural calls (non-negotiable):**
- Commands filesystem-discovered from `plugin/commands/*.md` (no `commands` array in manifest).
- Per-user state at `${CLAUDE_PLUGIN_DATA}/state.json` (fallback `$XDG_DATA_HOME/claude-code/plugins/nbg-ai-hub/state.json`). State CANNOT live in repo.
- `/hub-open devMode: true` until production deploy (flip to `false` post-Pages — Issue #3).
- `/hub-refresh` via `git pull --ff-only --depth 1` into `~/.cache/nbg-ai-hub/snapshot/`. Reuses user's git auth.
- TS-guard frontmatter validation (not Zod) keeps bundle small. Search: pure TS, title×5 + topics×3 + body×1.

**Refs:** 130/130 tests; `docs/refined-requests/hub-plugin.md`; `docs/design/plan-003-hub-plugin.md`.

---

## 2026-05-19 — UI redesign: Linear/Vercel/Stripe aesthetic + Option 1 hybrid (theme Starlight, don't replace)

**Decision:** Keep Starlight; deeply theme via three-tier CSS custom-property tokens (~245 declarations). Bespoke layouts for 11 marketing surfaces via `MarketingShell.astro` wrapping Starlight's `splash` template. Content-detail pages keep Starlight chrome with `--sl-color-*` aliases. 16 primitives under `site/src/components/primitives/` are Starlight-free (AC36 portability gate — verified by grep for zero `@astrojs/starlight` imports).

**Why:** Option 2 (replace Starlight) reserved as escalation if Option 1 unsatisfying. Portability hedge means Option 2 only needs to rebuild MarketingShell, not the design system. Pure CSS custom props + Cascade Layers cover the design ceiling without adding Tailwind/UnoCSS.

**Refs:** 39/39 ACs MET, 14/14 DoD met, 174/174 tests. `docs/design/project-design.md §S.13`; `docs/design/plan-004-ui-redesign.md`.

---

## 2026-05-19 — Unified header via Starlight `Header` override + auth-state CSS fix

**Decision:**
- Override Starlight's `Header` with `SplashAwareHeader.astro`. On splash pages: one unified `<nav class="nbg-topnav">` with brand + section links + Search + `<AuthControls />` + ThemeSelect + mobile drawer + `<SignInModal />` mount. On non-splash: default Starlight Header markup.
- New `AuthControls.astro` extracted from `SocialIconsOverride`. CSS rule `.nbg-auth__signin[hidden], .nbg-auth__chip[hidden] { display: none !important }` to defeat author `display: inline-flex` beating `[hidden]` UA default.

**Why:** Before override, MarketingShell rendered nav INSIDE Starlight's content slot → two stacked navs, "NbgAiHub" twice, auth-state showed Sign in + signed-in chip simultaneously.

**Supersedes:** 2026-05-14 §S.13.14.3 "Header override rejected as fragile". New override is narrow (one conditional, no behavioral wrappers); fragility cost < two-stacked-navs cost.

**Refs:** 215/215 tests.

---

## 2026-05-18 — Foundational architecture (settled architecture, see code for ground truth)

- **Triangle architecture.** Single GitHub repo holds markdown source of truth. Astro Starlight builds static web UI. Claude Code plugin reads same content for `/hub-*` commands. Markdown native to both Claude Code and contributors.
- **Curated RSS, not auto-aggregated.** GitHub Action fetches feeds daily; manual PR promotion to `/news/published`. (Later relaxed 2026-05-19 to unconditional auto-promote — see entry above.)
- **Astro Starlight as SSG.** Cloudflare/Tauri/Biome reference users; built-in tag filtering, sidebar, dark mode, search, MDX.
- **Skill is the differentiator; web UI is table stakes.** Internal portals die unbookmarked; skill lives inside Claude Code.
- **Project docs pattern.** SCOPE.md (mutable) + DECISIONS.md (append-only) + project CLAUDE.md (wiring).
- **Onboarding guide is complementary, not duplicative.** Hub deep-links into `556lowcodenocode.github.io/Onboarding`; doesn't absorb or rewrite it.
- **Five user-facing pillars + cross-cutting substrate.** Skills · Tips & Tricks · News · Curated journeys · Glossary+Reference. (Reference removed 2026-05-25.)
- **Shared content shape across all pillars** — one frontmatter schema (`type`, `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`).
- **Tips & Tricks distinct from Skills.** Tips = *read and apply manually*; Skills = *install once and invoke*.
- **Hub ships as its own Claude Code skill plugin.** One command bootstraps a colleague (`/plugin marketplace add chomovazuzana/NbgAiHub`).
- **Hybrid glossary.** Canonical `/glossary` page with anchors; inline links from elsewhere. No definitions duplicated. (Auto-link layer added 2026-05-25.)
- **AI strategy: build-time + Claude skill, not web runtime.** RSS triage via Azure OpenAI; runtime AI is the user's Claude session via `/hub-*`. No chatbot on the website.
- **Reframe "marketplace" → "hub" / "field manual"** (early framing call).

---

## 2026-05-18 — Repo: `chomovazuzana/NbgAiHub`, PRIVATE (supersedes prior public decision)

**Decision:** Repo on personal account `chomovazuzana`, single-repo, **private**. Naming + location + structure of the prior public-repo decision stand; only visibility flips.

**Implications:**
- Pages on a private repo on personal account requires Pro ($4/mo). Hosting was open until 2026-05-26 when repo went public for free-tier Pages.
- Bank-internal content technically permissible, but bank-confidential material still needs compliance review (personal account ≠ bank-managed infrastructure).
- Contributors added as individual collaborators (no public fork-and-PR).

**Resolved:** Hosting question closed 2026-05-26 — repo went public + Pages enabled.

---

## 2026-05-18 — Tooling pins (settled, see package.json for truth)

- **RSS library:** `@rowanmanning/feed-parser ^2.x`. `rss-parser` was effectively unmaintained (~3y no release, ~20 open '24 bug reports, no maintainer response). Tested against ~40 real-world feeds; typed `INVALID_FEED` errors; cleaner fetch/parse seam for testing.
- **Test framework:** Vitest ^4.1.6 (upgraded from 2.1.9 to clear 5 moderate-severity dev-tree CVEs).
- **Astro 6 + Starlight 0.39.** Astro 6 stable 2026-03-10; Starlight 0.38+ dropped Astro 5 support; 0.39 requires Astro 6. Greenfield workspace, zero migration cost.

---

## 2026-05-18 — RSS pipeline triage tightening (cumulative; superseded in parts)

Three rounds of prompt tightening across 2026-05-18 are captured here as the settled current state.

**Decision (current `pipeline/src/triage.ts` SYSTEM_PROMPT):**
- **Source-aware system prompt** with per-source-group rules (not per individual feed).
- **Two source groups.** Reddit group (r/ClaudeAI + r/ClaudeCode): 4 ACCEPT categories — tips/tricks, field reports, platform news, professional/enterprise use. Major tech/AI news group (HN/Wired/Verge): ACCEPT major model launches, capability breakthroughs, strategic moves, regulatory/policy with concrete impact, safety/security incidents, new developer-facing platforms; REJECT consumer gadget, AI-as-keyword content, paywalled previews, Claude-name false positives.
- **Cross-cutting rules:** English only; substance threshold; no retired-model content; **when in doubt, reject**; title-scannability (TITLE must be self-describing).
- **6 Reddit REJECT categories** added in round 2: celebratory personal projects, tool/extension announcements, personal setup stories, cost-tracking/spending, Reddit subculture jargon, feedback-solicitation. 11 anchored REJECT examples from actual flagged titles.
- **`editor_confidence` field** (high/medium/low) on every triage response, propagated to frontmatter (13 keys total) + PR body. Confidence prompt tuned to spread distribution (RESERVE high for stake-your-reputation; LOW when guessing; when in doubt go LOWER).

**Refs:** Tests grew 88 → 93 → ~120+ as rounds added.

---

## 2026-05-18 — RSS cron 22:00 UTC

**Decision:** Daily cron at `0 22 * * *` UTC = 00:00 Athens winter / 01:00 Athens DST.

**History:** Originally pinned 05:00 UTC for ~08:00 Athens. Shifted to 22:00 UTC on 2026-05-21 so previous-day Reddit posts have time to accumulate engagement before the cut. Cron shift stayed when Reddit OAuth path was parked.

---

## 2026-05-18 — Final feed list

**Decision (current `config/rss-sources.json`, 5 feeds):**
- **Reddit group:** r/ClaudeAI, r/ClaudeCode (both `type: "rss"`)
- **Major tech/AI news group:** Hacker News frontpage (unfiltered), Wired AI tag feed, The Verge full firehose

**Dropped (by direction 2026-05-18):** Anthropic news (feed 404 — deleted by Anthropic), Claude Code GitHub releases (`releases.atom`), Simon Willison's blog. Easy to re-add; documented for visibility.

**Trade-off:** Verge firehose + unfiltered HN roughly double daily item count (~120-180/day @ ~$0.001/item → ~$0.10-0.20/day Azure cost). Acceptable.

---

## 2026-05-18 — Operational milestones

- **RSS pipeline verified operational end-to-end.** Workflow run `26047997638`, 2m46s success, PR #1 with 43 items across 4 of 5 feeds. All 4 Azure secrets + GH Actions PR toggle wired. DoD #12 satisfied.
- **Astro Starlight site verified operational locally.** `npm run dev` → 200 on localhost:4321. Astro v6.3.5 + Starlight v0.39.2. AC1-AC20 all MET per `docs/reference/integration-verification-astro-site.md`. Production hosting was open until 2026-05-26.

---

## 2026-06-02 — Skills page rework around real `NBG-AI/claude-tools` upstream

**Trigger:** Existing `/skills/` rows weren't clickable, install commands pointed at the fictional `556LowCodeNoCode/Skills` marketplace, `database-schema-designer` and `frontend-design` were misattributed, and there was no surfacing of the actual NBG internal plugin library.

- **Skills rendered like tips.** Every row wraps title in `<a href="/skills/[slug]/">` (with `.listing-row--linked` stretched ::after); new `site/src/pages/skills/[slug].astro` mirrors `tips/[slug].astro` shape, renders body + 4-step install block (Access → Marketplace → Install → Use) in a sticky right-rail.
- **Featured panel for `NBG-AI/claude-tools`** at the top of the listing — gold accent border + 3-cell grid (Access TBD / Marketplace add / Install template). Internal-origin rows below carry a gold left-border tying them visually to the panel. No "start here" framing — explicit "for engineers actively working on NBG software" + quiet redirect for newcomers to Foundations / Tips / Use cases.
- **Schema additions** to skills collection (both optional, backward-compatible): `marketplace_command` (the `/plugin marketplace add ...` prerequisite), `access_request` (markdown body for the access panel).
- **Content corrections:** `frontend-design` repointed to `anthropics/skills` (Anthropic's official); `gsd` repointed to `gsd-build/get-shit-done` (canonical upstream, dropped the open-gsd governance narrative); `database-schema-designer.md` deleted; new `create-sandbox.md` distilled from the actual SKILL.md at `NBG-AI/claude-tools/plugins/create-sandbox` — an 8-capability lifecycle for building TypeScript API sandboxes from C# source or Postman collections, audience `advanced`.
- **Tip rewrite:** `claudemd-worked-example` distilled from five sources (Anthropic official best-practices, forrestchang/andrej-karpathy-skills, HumanLayer's writing-a-good-claude-md, josix/awesome-claude-md, dev.to maturity-levels piece) with per-section annotation explaining why each block earns its slot.
- **Listing-page cleanups:** dropped `S1/2` chip on cluster headers (now uses serif title + lede vocabulary matching `/tips/`); cells in the featured grid now bottom-align (flex column + `margin-top: auto`) and start at the same y (explicit `margin: 0` override defeats Starlight's unlayered `:not(*) + :not(*) { margin-top: 1rem }`); row prose spans full card width via absolute-positioned meta on `#internal` / `#community` sections.

**Why:** Newcomer guidance pointed at fictional install paths; the actual internal upstream wasn't surfaced; row bodies were never readable on the site. Visit motion is now: scan listing → click → read full body → see structured install steps.

**References:** Commits in this push; `skills/create-sandbox.md`, `skills/{frontend-design,gsd}.md`, `tips/claudemd-worked-example.md`, `site/src/pages/skills.astro`, `site/src/pages/skills/[slug].astro`, `site/src/content.config.ts`.

---

## 2026-06-02 (round 2) — Sticky filter strip + use-case card footer

**Trigger:** User asked for a sticky filter bar on /skills, /tips, /use-cases so the chips stay reachable while scrolling, and for the use-case duration chip to move so the pin overlay had a clear top-right.

- **Sticky filter strip** — extracted `<div class="hero__filter">` out of each page's `<section class="hero">` and wrapped it in a sibling `<section class="listing-filter-bar">`. Outer section handles `position: sticky; top: var(--sl-nav-height, 4rem)` + background + soft drop shadow when stuck; inner `.hero__filter` keeps its existing chip layout/styling so no parent-selector breakage. `sticky` at `top: 0` slid the bar UNDER Starlight's `position: fixed` `<header>` — pinning at the nav height fixed it.
- **Sentinel-based stuck detection** — `site/src/scripts/sticky-filter-bar.ts` inserts a 1px probe just above each bar and flips `data-stuck="true"` via IntersectionObserver when the probe leaves the viewport. Drives the drop-shadow CSS variant.
- **Use-case card footer** — `__time` chip moved from the head row to a new `__footer` flex row that holds CTA + time-estimate side by side (space-between). Top-right corner clear for the pin overlay.
- **Use-case filter bug** — moving the filter out of the hero exposed a latent bug: `.usecase-card-wrap { display: block !important }` (set to override the default list-item display) defeated the JS's `style.display = 'none'` so chip clicks toggled `aria-pressed` but cards stayed visible. Fixed by switching the JS to toggle a `data-filtered-out` attribute, with a matching `.usecase-card-wrap[data-filtered-out] { display: none !important }` rule.
- **Polish** — bumped the inner `.hero__filter` gap to 1rem inside `.listing-filter-bar` so the SHOW row and FILTER BY TOPIC row breathe; was reading squished on tips/skills.

**Why:** Filter chips were silently scrolling off-screen on long listings; pin overlay was colliding with the duration chip; use-case unit-filter looked like it worked (chips highlighted) but wasn't actually filtering — a worse UX than no filter at all.

**References:** `site/src/scripts/sticky-filter-bar.ts` (new); `site/src/styles/listing-rows.css` (`.listing-filter-bar` block); `site/src/pages/{skills,tips}.astro`, `site/src/pages/use-cases/index.astro`.

---

## 2026-06-02 (round 3) — Filter strip: inline label-then-chips + shorter labels

**Trigger:** Sticky filter strip from round 2 stacked SHOW on one row and FILTER BY TOPIC on another, eating vertical space; topic chips wrapped inside their group instead of flowing alongside the audience chips.

- **Inline single-flow layout.** Inner `.topic-filter`, `.audience-filter`, their `__group` wrappers, and `.audience-filter__option` (which holds the radio + chip) all get `display: contents !important`. Chips and labels bubble up as direct flex items of the outer `.hero__filter`, which is `flex-direction: row; flex-wrap: wrap`. Result: `SHOW [chips] TOPIC [chips]` flows as one continuous wrap-row, instead of label-trapped-with-its-chips on separate rows.
- **Cascade trap.** The chip-vocabulary block I added in the production-hardening commit also set `display: inline-flex !important` on the `__group` — a later same-layer `!important` declaration that defeated the earlier `display: contents`. Removed the conflict and left a comment so a future drive-by edit doesn't re-introduce it.
- **Shorter labels.** `For beginners` → `Beginners`, `For experienced` → `Experienced` (AudienceFilter); `Filter by topic` → `Topic` (TopicFilter); `Filter by unit` → `Unit` (use-cases inline). The compact labels free enough horizontal space that on tips (14 topic chips) the audience cluster + the TOPIC label + the first ~8 chips now fit on row 1 — the remaining chips wrap once into row 2 instead of three-rowing.
- **Production cascade chip-size hotfix (still part of this batch).** The chip vocabulary (padding, font, pill border, active-state teal fill) lives in `listing-rows.css` with `!important` so it beats Starlight's unlayered button defaults on the deployed build. Without it, tips/skills shipped oversized chips on Pages even though local dev rendered correctly.

**Why:** Vertical real estate matters in a sticky strip — the more the bar consumes, the less content below it the user sees while scrolling. The inline flow also reads as "one filter control" instead of two stacked widgets.

**References:** `site/src/styles/listing-rows.css` (`.listing-filter-bar` block); `site/src/components/AudienceFilter.astro`, `site/src/components/TopicFilter.astro`; `site/src/pages/use-cases/index.astro`.

---

## 2026-06-02 (round 4) — Use-case card polish + unit-filter inline

**Trigger:** Three follow-ups landed in the same pass — clock icon was missing from the use-case time chip (the chip's flex+gap CSS implied an icon but the SVG was never wired), `UNIT` filter rendered as a stacked column on use-cases while tips/skills had flipped to the inline `LABEL [chips]` flow, and the user wanted the time chip flush-right at rest and only nudged left when the pin overlay needed the room.

- **Clock icon restored** on `.usecase-card__time` — same 11×11 lucide-style clock SVG that `.listing-pill--time` already uses on `/skills/` rows. The chip's `display: inline-flex; gap: 0.3rem` was always designed for an icon, just never had one in the JSX.
- **Use-cases inline UNIT filter** — deleted the page-scoped `:global(.hero__filter .topic-filter*) { flex-direction: column !important }` overrides (and the redundant chip-vocabulary mirror) that pre-dated the sticky-strip refactor. They were defeating the shared `display: contents` chain that bubbles chips up to the bar's flex row.
- **Slide-on-hover head padding** — at rest, `.usecase-card__head` has `padding-right: 0` so the time chip sits flush against the card's right edge (cleanest balance with the eyebrow on the left). On `:hover` / `:focus-within` / `:has(.nbg-pin[aria-pressed='true'])`, padding-right transitions to `2.25rem` so the chip slides left and the pin overlay slots in beside it. `@media (hover: none)` keeps the padding reserved permanently since touch has no real hover state and the pin is always shown.

**Why:** Round-2 had moved the time chip to the footer to dodge the pin collision, but the head row read empty at rest with just the eyebrow. Flush-right time + slide-on-hover gives a balanced rest layout AND clean hover affordance — best of both.

**References:** `site/src/pages/use-cases/index.astro` (head row markup + `.usecase-card__head` / `.usecase-card__cta` CSS).
