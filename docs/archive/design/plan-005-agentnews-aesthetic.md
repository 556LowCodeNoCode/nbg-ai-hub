---
plan: 005-agentnews-aesthetic
parent_request: docs/refined-requests/agentnews-aesthetic-match.md
investigation: docs/reference/investigation-agentnews-aesthetic.md
codebase_scan: docs/reference/codebase-scan-agentnews-aesthetic.md
baseline_commit: 36b8758
target_workspace: site/
build_command: cd site && npm run build
test_command: cd site && npm test
check_command: cd site && npm run check
dev_server: cd site && npm run dev -- --port 4321
status: ready-for-execution
---

# Plan 005 — AgentNews aesthetic match

This plan retunes the NbgAiHub Astro/Starlight site to visually match `https://biks2013.github.io/AgentNews/`. The work is grounded in `docs/reference/investigation-agentnews-aesthetic.md`, which captured the AgentNews design system from its inline 13.6 KB `<style>` block and homepage HTML.

The plan is sequenced into six phases. Phase 1 is foundational; Phases 2 and 5 can run in parallel after Phase 1 lands; Phases 3 and 4 run in waves after Phase 2.

## Sequencing overview

```
Phase 1 — Token re-anchor (FOUNDATION)
   │
   ├──► Phase 2 — Layout CSS + content-page theme
   │       │
   │       ├──► Phase 3 — Component restyle (parallel)
   │       │      │
   │       │      └──► Phase 4 — Page rewrites (parallel)
   │       │              │
   │       │              └──► Phase 6 — Docs + tests
   │       │
   │       └──► (Phase 4 also depends on Phase 2 for layout CSS classes)
   │
   └──► Phase 5 — Font loading + Astro config (parallel with Phase 2)
```

---

## Phase 1 — Token re-anchor (Foundation; serial)

**Goal:** land the new palette, type scale, radii, shadows, container, and breakpoints in the three token files. Aliases preserve Starlight bridging.

**Files modified (3):**
- `site/src/styles/tokens/primitives.css` — retune values, ADD new tokens (teal ramp, serif font var, additional font-size steps, container max, breakpoint values, new tracking/leading tokens)
- `site/src/styles/tokens/semantic.css` — rewrite light/dark blocks per investigation §8
- `site/src/styles/tokens/aliases.css` — re-anchor 13+ `--sl-color-*` bridges per investigation §8

**Files NOT modified:** `layers.css`, `legacy.css`, `index.css`, `motion.css`, `content-chrome.css`, `content-prose.css`. (`content-prose.css` font-family swap is in Phase 5; the cascade still works pre-swap because system fallback chains are preserved.)

**Verification:**
- `cd site && npm run check` exits 0
- `grep -c '^\s*--' site/src/styles/tokens/primitives.css` ≥ 60 (AC2 floor preserved)
- `grep -c "data-theme=" site/src/styles/tokens/semantic.css` ≥ 2 (AC3)
- `grep -cE "--sl-color-(black|white|gray-[1-6]|text|text-accent|text-invert|accent|accent-high|accent-low|backdrop-overlay)" site/src/styles/tokens/aliases.css` ≥ 13 (AC4)
- `cd site && npm test` ≥ 215 passing (AC27)

**Output checkpoint:** committable. Site builds. Components consuming `--nbg-*` tokens render with new palette automatically.

---

## Phase 2 — Layout CSS + content-page theme update (depends on Phase 1)

**Goal:** introduce the AgentNews layout class names (`.site-header`, `.brand`, `.nav`, `.search-trigger`, `.theme-toggle`, `.hero`, `.section`, `.section__head`, `.feature`, `.card`, `.tag`, `.eyebrow`, `.dates`, `.empty`, `.wrap`) as a single CSS file, and patch content-prose to swap font-family without overriding tokens.

**Files created (1):**
- `site/src/styles/agentnews-layout.css` — new file holding the AgentNews layout class rules (lifted from `docs/research/agentnews-source/home-inline-styles.css` lines 67-424), with each rule rewritten to consume `--nbg-*` tokens. Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }` for AC19.

**Files modified (3):**
- `site/src/styles/tokens/index.css` — import the new layout file after `aliases.css`
- `site/src/styles/content-prose.css` — swap `font-family` declarations to `var(--nbg-font-sans)` / `var(--nbg-font-serif)` / `var(--nbg-font-mono)` (tokens land in Phase 1)
- `site/src/styles/content-chrome.css` — verify no overrides need updating (re-anchored aliases propagate through Starlight chrome automatically)

**Verification:**
- `cd site && npm run check` exits 0
- `cd site && npm run build` exits 0
- `grep -c "^\." site/src/styles/agentnews-layout.css` ≥ 14 (the 14 main classes)
- Manual: open `localhost:4321/` — old marketing-shell markup should look mismatched (intentional pre-Phase-3 state), tokens are visibly retuned.

---

## Phase 3 — Component restyle (parallel waves; depends on Phases 1+2)

**Goal:** restyle the 14 custom components to consume new tokens and adopt AgentNews class names. Primitives (16 files) are inspected for hardcoded values and zero-Starlight-imports compliance (AC36/AC37); only those that hardcode are touched.

This phase runs as **two parallel waves**. Within each wave, files are independent and can be edited in parallel.

### Wave A — Shell + nav components (parallel: 4 agents)

1. `site/src/components/MarketingShell.astro` — rewrite the shell to use `.site-header` / `.brand` / `.nav` / `.header-actions` / `.site-footer` / `.footer-grid` structure. Keep the slot API stable (`title`, `description`).
2. `site/src/components/SplashAwareHeader.astro` — simplify (~643 → ~300 lines). Strip the Linear/Vercel/Stripe-specific overlay; render the AgentNews header markup. Keep the mobile-drawer JS path.
3. `site/src/components/AuthControls.astro` — restyle the PAT-paste affordance to use `.tag` / `.theme-toggle`-style 36×36 button pattern. Keep behaviour bit-for-bit.
4. `site/src/components/SignInModal.astro` — restyle modal surface to use `var(--nbg-surface)` / `var(--nbg-shadow-md)` / `var(--nbg-radius-lg)`. Behaviour unchanged.

### Wave B — Card + meta components (parallel: 6 agents)

5. `site/src/components/HomeHero.astro` — rewrite to AgentNews hero shape (`.hero > .wrap > .hero__intro` grid 2fr/1fr).
6. `site/src/components/HomeStats.astro` — replace the existing stat grid with a `.section` containing a `.feature`-style "By the numbers" title and 3 `.card` blocks each with a numeric `.card__title`. Or drop entirely if Phase 4's home rewrite folds the counts inline (see Phase 4 §1).
7. `site/src/components/NewsList.astro` — replace markup with `<div class="grid-3"><article class="card">…</article>…</div>` per `card` schema from investigation §4. Each card hosts `card__art`, `card__body > card__meta + dates + card__title`.
8. `site/src/components/NewsPanel.astro` — converted to `.section` wrapper composing NewsList; keep the `featured` lead-story logic as `.feature` markup when on the homepage.
9. `site/src/components/SkillCard.astro` — restyle to `.card` shape (typographic — no image art block; use a gradient placeholder for visual rhythm).
10. `site/src/components/AudienceBadge.astro` and `site/src/components/ConfidenceChip.astro` — both adopt `.tag` class with variant flag. Remove legacy hex colours (AC5).
11. `site/src/components/PinButton.astro` — restyle pin button to `.theme-toggle`-style 36×36 square; keep gist-update behaviour.

### Wave C — Primitives audit (parallel: single agent, audit-only)

12. Audit `site/src/components/primitives/*` (16 files):
    - `grep -rE "#[0-9a-fA-F]{3,6}|rgb\(|hsl\(" site/src/components/primitives/` — every match must be in a header comment OR a token consumer like `var(--nbg-…)`. Anything else gets fixed to consume a token.
    - `grep -rE "@astrojs/starlight" site/src/components/primitives/` — must be zero matches (AC37).
    - If any primitive needs a new variant to match AgentNews (e.g., `Card` gains `variant="agentnews-feed"`), add it minimally.

**Verification per wave:**
- `cd site && npm run check` exits 0 after each wave
- `git diff --name-only` confirms only the in-scope files changed
- `grep -rE "@astrojs/starlight" site/src/components/primitives/` → 0 matches (AC37)
- `grep -rE "#0a7|#e60|#08c|#aa6|#666" site/src/` → 0 matches (AC5)

---

## Phase 4 — Page rewrites (parallel; depends on Phases 1+2+3)

**Goal:** rewrite the body of each of the 11 marketing surfaces to use the AgentNews layout pattern per investigation §11. Slot APIs unchanged (e.g., still wrap in `<MarketingShell>`); only the inner markup changes.

Pages are independent (no shared imports beyond shell + components) and can run as **parallel agents**.

### Pages (one agent each — 11 parallel):

1. `site/src/pages/index.astro` (home) — Hero + `<section class="section">` per content pillar (News / Skills / Tips / Start here). Feature pick: most-recent published news item. Each section uses `<div class="grid-3">` with `<article class="card">` children.

2. `site/src/pages/news/index.astro` — Hero (compact) + 3 `<section class="section">` blocks: AI-News, Deep Dives, Articles. Section discriminator imported from new `lib/news-sections.ts`. The most-recent Articles item becomes the `.feature` lead. AudienceFilter + PinButton + ConfidenceChip wired per existing API.

3. `site/src/pages/skills.astro` — Hero + single `.section` "Skills" with `.grid-3` of `SkillCard.astro` (which Phase 3 restyled to `.card` shape).

4. `site/src/pages/tips.astro` — Hero + single `.section` "Tips" with `.grid-3` of typographic tip cards (no art block; gradient placeholder).

5. `site/src/pages/glossary.astro` — Hero + glossary-filter input + single `.section` with `.grid-3` of term entries as typographic `.card`. Keep the existing `glossary-filter.ts` script wiring.

6. `site/src/pages/reference.astro` — Hero (compact) + single `.section` of reference link cards. Currently placeholder — keep placeholder content but render with new chrome.

7. `site/src/pages/contribute.astro` — Hero + single `.section` with prose-styled body (markdown-like rules inside a `.empty`-style outlined panel).

8. `site/src/pages/my-pins.astro` — Hero + per-type `.section` blocks (pinned-news, pinned-skills, pinned-tips, pinned-glossary). Stale-pin rows use `.empty` styling.

9. `site/src/pages/submit-skill.astro` — Hero + single `.section` containing the existing 4-step form. Form inputs retuned to `surface-2 / hairline` aesthetic.

10. `site/src/pages/start-here/day-1.astro` — Hero + `.section` per step (6 sections) with `.feature`-style two-column layouts alternating left/right.

11. `site/src/pages/start-here/week-1.astro` — Hero + 5 `.section` blocks (one per day) with `.grid-3` of task cards inside each.

### New helper file (1):

- `site/src/lib/news-sections.ts` — exports `getSectionForNewsEntry(entry: CollectionEntry<'news'>): "ai-news" | "deep-dives" | "articles"` mapping per investigation §9. Plus `groupNewsBySection(entries): Record<Section, Entry[]>` helper. Pure function; testable.

**Verification per page:**
- `cd site && npm run build` exits 0 after each batch
- `cd site && npm run check` exits 0
- Manual: visit each page at `localhost:4321/<path>` — no horizontal scroll, hero renders Newsreader serif, sections show mono uppercase H2 with `.count`, cards in `.grid-3`.

---

## Phase 5 — Font loading + Astro config (parallel with Phase 2)

**Goal:** load IBM Plex Sans / IBM Plex Mono / Newsreader via the existing Astro experimental font integration; preserve sidebar 11 entries.

**Files modified (1):**
- `site/astro.config.mjs` — extend `experimental.fonts` array (or add it if not present) to include three families with the weights/axes listed in investigation §10. Mark `display: 'swap'`. Preload `IBM Plex Sans 400` and `Newsreader 500`. Do not touch sidebar, do not touch port (4321).

**Verification:**
- `cd site && npm run build` exits 0
- Font files appear in `site/dist/_astro/` (or wherever Astro emits them)
- DevTools Network tab on home shows preloaded fonts firing before first paint
- `astro.config.mjs` `sidebar` array unchanged (still 11 entries)

---

## Phase 6 — Docs + tests + manifest (depends on all prior phases)

**Goal:** documentation drift cleanup, tests updated/added, integration-verification scaffold seeded.

**Files modified (4):**
1. `docs/design/project-design.md` §S.13 — append a new sub-section "AgentNews aesthetic anchor (2026-05-23)" describing the retune. Reference `docs/reference/investigation-agentnews-aesthetic.md`. Must mention "AgentNews" ≥ 3 times for AC38.
2. `SCOPE.md` — update the "Design system" pointer line to mention AgentNews. Must mention "AgentNews" ≥ 1 time for AC39. Update "Last updated" line.
3. `Issues - Pending Items.md` — close pending #5 (MotionReveal) with rationale "kept no-op; aesthetic target uses no scroll-reveals". Add no new items unless a residual gap is found.
4. `docs/reference/integration-verification-agentnews-aesthetic.md` — Phase 10 will populate this; create a stub scaffold here with one row per AC1-AC40 reserved for evidence.

**Files created (1):**
- `site/tests/agentnews-aesthetic.test.ts` — node-env vitest with DOM-string assertions on the new page bodies. Covers: news-section discriminator, full-bleed marker presence (root max-width absence), `.site-header` markup presence, theme-toggle button presence. Aim for ≥ 8 new tests.

**Files NOT modified:**
- `site/src/content.config.ts` (A16)
- `site/src/lib/*.ts` except the new `news-sections.ts` (A17)
- `site/scripts/build-pin-index.ts` (A18)
- `pipeline/**` (out of scope)
- `plugin/**` (out of scope)

**Verification:**
- `cd site && npm test` reports ≥ 215 passing + ≥ 8 new (target: ≥ 223)
- `cd site && npm run check` exits 0
- `cd site && npm run build` exits 0
- `grep -c "AgentNews\|agentnews" docs/design/project-design.md` ≥ 3 (AC38)
- `grep -c "AgentNews\|agentnews" SCOPE.md` ≥ 1 (AC39)

---

## AC Coverage table

Every AC from the refined spec maps to ≥ 1 plan phase + named verification evidence.

| AC   | Covered by phase(s) | Evidence at verification time                                                                 |
|------|---------------------|-----------------------------------------------------------------------------------------------|
| AC1  | (Phase 3a done)     | `docs/reference/investigation-agentnews-aesthetic.md` exists; `grep -c '^## '` ≥ 7            |
| AC2  | Phase 1             | `grep -c '^\s*--' site/src/styles/tokens/primitives.css` ≥ 60; `git diff 36b8758 -- primitives.css` non-trivial |
| AC3  | Phase 1             | `grep -c "data-theme=" site/src/styles/tokens/semantic.css` ≥ 2                               |
| AC4  | Phase 1             | `grep -cE "--sl-color-(...)"` aliases.css ≥ 13                                                |
| AC5  | Phase 1+3           | `grep -rE "#0a7\|#e60\|#08c\|#aa6\|#666" site/src/` → 0                                       |
| AC6  | Phase 2+4           | Playwright: `getBoundingClientRect().width === innerWidth ± 2` on `localhost:4321/`           |
| AC7  | Phase 2+4           | Same on `/news/` and `/skills/`                                                               |
| AC8  | Phase 2+4           | Mobile (≤640px) inner padding ≥ 16px ≤ 24px via computed-style                                |
| AC9  | Phase 2+4           | No `max-width: 70ch` / `var(--sl-content-width)` on marketing-surface roots                   |
| AC10 | Phase 4 (#2)        | DOM structure assertion: `<section id="ai-news">` etc., with `.grid-3 .card`                  |
| AC11 | Phase 4 (#2)        | `getCollection('news').length === document.querySelectorAll('.card').length`                  |
| AC12 | Phase 3 (#10)+4(#2) | Playwright click on AudienceFilter → `.audience-hidden` toggles                               |
| AC13 | Phase 3 (#11)+4(#2) | Playwright click on PinButton → SignInModal opens (anonymous path)                            |
| AC14 | Phase 1+2           | Visit a `news/[slug]/` route; computed styles read new tokens                                 |
| AC15 | Phase 4 (all 11)    | Visual review checklist in integration-verification report                                    |
| AC16 | Phase 3 (Wave C)    | `grep -rE "#[0-9a-fA-F]{3,6}\|rgb\(\|hsl\(" site/src/components/primitives/` → 0 (or comments only) |
| AC17 | Phase 1+2           | Playwright computed-style on `/news/[slug]/` body/links/code/tables                           |
| AC18 | Phase 1             | DOM check: Starlight sidebar reflects `--sl-color-*` re-anchor                                |
| AC19 | Phase 2             | Reduced-motion media query → `transition-duration ≤ 0.01s`                                    |
| AC20 | Phase 3+4           | Playwright Tab walk; `:focus-visible` outline computed style                                  |
| AC21 | Phase 6             | axe-core / pa11y audit log in `docs/reference/`; 0 contrast violations                        |
| AC22 | Phase 1+5           | No stored theme → `html[data-theme]` default matches AgentNews default (light)                |
| AC23 | Phase 1+5           | Toggle → re-paint; per-page screenshot pair                                                   |
| AC24 | Phase 2+4           | Mobile screenshot + Playwright `boundingBox()` on touch targets ≥ 44×44                       |
| AC25 | Phase 2+4           | Per-breakpoint screenshots in integration-verification                                        |
| AC26 | Phase 1-6           | `cd site && npm run build` exit code 0; no new deprecation warnings                           |
| AC27 | Phase 6             | `cd site && npm test` ≥ 215 passing                                                           |
| AC28 | All phases          | `cd site && npm run check` exit code 0                                                        |
| AC29 | Phase 1             | Playwright: Pagefind opens, returns results                                                   |
| AC30 | (passthrough)       | Sidebar in `astro.config.mjs` unchanged; per-entry navigation probe                           |
| AC31 | Phase 3 (#3-#4)     | Playwright: PAT-paste sign-in happy path                                                      |
| AC32 | Phase 3 (#10)       | Playwright + localStorage check on AudienceFilter                                             |
| AC33 | Phase 4 (#9)        | Playwright: known-bad + known-good submit-skill form                                          |
| AC34 | Phase 4 (#8)        | Playwright end-to-end: pin → reload → `/my-pins/` hydrates                                    |
| AC35 | Phase 4 (#1)        | `ls site/public/_data/*.json` → 5 files post-build                                            |
| AC36 | Phase 2+3           | `grep -lrE "from ['\"]@astrojs/starlight" site/src/components/ site/src/styles/` → allow-list only |
| AC37 | Phase 3 (Wave C)    | `grep -rE "@astrojs/starlight" site/src/components/primitives/` → 0                           |
| AC38 | Phase 6             | `grep -c "AgentNews\|agentnews" docs/design/project-design.md` ≥ 3                            |
| AC39 | Phase 6             | `grep -c "AgentNews\|agentnews" SCOPE.md` ≥ 1                                                 |
| AC40 | Phase 6 (stub) → Phase 10 (populate) | `docs/reference/integration-verification-agentnews-aesthetic.md` exists; ≥ 40 AC rows |

**Coverage check: every AC1–AC40 has at least one covering plan step with named evidence. Plan is complete.**

---

## Risks & mitigations (carried from investigation §13)

1. **AudienceFilter** — preserve class names; covered by existing tests.
2. **Pagefind** — re-paint only; smoke test in both modes after Phase 1.
3. **Theme-toggle / Starlight ThemeSelect collision** — share `data-theme` attribute + `starlight-theme` localStorage key.
4. **`-webkit-backdrop-filter` Firefox** — opaque fallback readable.
5. **14.5px font** — accept browser rounding.
6. **Newsreader opsz** — Astro font integration handles `axes: { opsz: ['6','72'] }`.
7. **Mobile drawer** — keep JS path; restyle only.
8. **HomeStats removal** — re-fold counts into a `.section` in home rewrite.
9. **MarketingShell signature** — preserve slot API.

## Estimated LOC delta

| Phase | Files | Insertions | Deletions |
|-------|-------|------------|-----------|
| 1     | 3     | ~150       | ~180      |
| 2     | 4 (+1 new) | ~480  | ~30       |
| 3     | 14    | ~600       | ~900      |
| 4     | 11 (+1 new helper) | ~900 | ~700  |
| 5     | 1     | ~40        | ~10       |
| 6     | 4 (+1 new test) | ~250 | ~30      |
|-------|-------|------------|-----------|
| **Total** | **38** | **~2420** | **~1850** |

Net delta: **+~570 LOC** (mostly the new layout CSS file and the integration-verification scaffold).

---

## Execution order (orchestrator hand-off)

For Phase 6 of the team workflow:

- **Wave 1 (serial, foundation):** Phase 1 (3 files)
- **Wave 2 (parallel, 2 agents):** Phase 2 + Phase 5
- **Wave 3 (parallel, ~4 agents):** Phase 3 Wave A
- **Wave 4 (parallel, ~6 agents):** Phase 3 Wave B + Wave C (audit-only)
- **Wave 5 (parallel, ~11 agents):** Phase 4
- **Wave 6 (serial):** Phase 6 (docs + tests + verification stub)

This sequencing keeps the foundation stable while maximising parallel work. Each wave commits a working build before the next begins; if any wave breaks the build, only that wave is rolled back.
