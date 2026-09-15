---
language: typescript
framework: astro+starlight
package_manager: npm
build_command: cd site && npm run build
test_command: cd site && npm test
lint_command: cd site && npm run check
entry_points:
  - site/astro.config.mjs
  - site/src/content.config.ts
  - site/src/content/docs/index.mdx
last_scanned_commit: 8073a5f22dc296a9ce3b266eef52e110485e3d59
scanned_for_request: ui-redesign.md
scanned_at: 2026-05-19T08:22:37Z
---

# Codebase Scan — NbgAiHub Site Workspace (UI Redesign)

## 1. Project Overview

**Workspace:** `site/` — Astro 6.3.5 + Starlight 0.39.2 static site serving the NbgAiHub knowledge hub. TypeScript-first, ESM-only, Node 22. Build via `tsx scripts/build-pin-index.ts && astro check && astro build`. Tests via Vitest 4.1.6 (127 passing). Dev server on port 4321. Pagefind search integrated by Starlight (20 HTML files indexed). Personalization via PAT-paste sign-in + unlisted GitHub gist. No backend — build-time + client-side only.

**Out-of-scope sibling workspaces:** `pipeline/` (RSS triage, 133 tests) and `plugin/` (Claude Code plugin, 130 tests) exist but are NOT part of this UI redesign.

## 2. Module Map

All paths relative to `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site`.

### Content Collections (`../` siblings to site)
- `../news/published/` → News items (8 published; triage pipeline writes here; content-detail surface)
- `../skills/` → Skills catalog (9 entries; CI-validated 17-key schema)
- `../tips/` → Tips & Tricks (12 entries)
- `../glossary/` → Glossary terms (15 entries; rendered as hybrid page + anchor links)
- `../journeys/` → Onboarding journeys (1 entry: day-1.md with 6 full steps)

### Site Source (`src/`)
- `src/content.config.ts` — 5 Zod collection schemas (news 13 keys, skills 17 keys, tips/glossary/journeys 10 keys); glob loaders; **CONTRACT — must remain unchanged per refined spec**
- `src/content/docs/` — Starlight's docs collection; only `index.mdx` exists (homepage; `template: splash`)
- `src/components/` — 10 Astro components (details in §3)
- `src/lib/` — 8 TypeScript modules; **CONTRACT modules, not redesign targets** (details in §3)
- `src/pages/` — 11 Astro pages (11 marketing surfaces per refined spec A5)
- `src/styles/custom.css` — 133-line CSS file; **full replacement target per refined spec** (currently: home hero, news/skill card grids `repeat(auto-fill, minmax(18rem, 1fr))`, flat audience badges `#0a7 / #e60 / #08c`, flat confidence chips `#e60 / #aa6 / #666`, `.audience-hidden` toggle)

### Scripts & Config
- `astro.config.mjs` — Starlight config (sidebar 11 entries, `customCss: ['./src/styles/custom.css']`, SocialIcons slot override for sign-in chip, port 4321)
- `scripts/build-pin-index.ts` — Pre-build script emitting 5 JSON files to `public/_data/<type>-index.json`; **stays unchanged per refined spec A18**
- `vitest.config.ts` — Vitest 4.x node-env, `tests/**/*.test.ts` pattern
- `tests/` — 7 test files, 127 tests (auth 15, api-fetch 6, gist 18, submission 26, pin-store 10, build-pin-index 5, slug 47)

### Build Artifacts (gitignored)
- `public/_data/` — 5 JSON pin-index files (news, skill, tip, glossary, journey-step); build-emitted, consumed by `/my-pins/` hydration
- `public/pagefind/` — Pagefind search index (built by Starlight during `astro build`; 20 HTML files indexed per latest build)

## 3. Component & Module Inventory

### Components (`src/components/`) — Redesign Targets

All 10 components will be visually redesigned. Listed by line count (ascending):

| Component | Lines | Purpose | Props | Pages Consuming | Redesign Scope |
|---|---|---|---|---|
| `AudienceBadge.astro` | 12 | Renders audience pill (`beginner` \| `advanced` \| `both`) | `audience: 'beginner' \| 'advanced' \| 'both'` | `/news/`, `/skills/`, `/tips/`, `/news/[slug]` | **Visual restyle** — replace flat `#0a7 / #e60 / #08c` with tokenized semantic colors; WCAG AA contrast in dark + light modes (R4.1, AC89) |
| `ConfidenceChip.astro` | 15 | Renders editor confidence on news cards | `confidence: 'high' \| 'medium' \| 'low'` | `/news/`, `/news/[slug]`, `NewsPanel`, `NewsList` | **Visual restyle** — replace flat `#e60 / #aa6 / #666` with tokenized treatment (R4.2) |
| `HomeHero.astro` | 38 | Homepage hero with title/tagline/2 CTAs | `title?`, `tagline?`, `ctaPrimary?: {label, href}`, `ctaSecondary?: {label, href}` | `/` (index.mdx) | **Replace/refactor** — current centered single-column with 2 buttons; redesign must be asymmetric, ≥ 80vh, `font-size ≥ 4rem` desktop, add editorial element beyond title/tagline/CTAs (R4.4, AC5) |
| `SkillCard.astro` | 41 | Card for skill entry | `entry: CollectionEntry<'skills'>` | `/skills/` | **Visual hierarchy** — currently uniform cards in `18rem` grid; redesign must have featured/lead card style OR non-uniform grid placement OR clear typographic weight differences (R4.5, AC8) |
| `NewsList.astro` | 46 | Full news list for `/news/` | None (calls `getRecentNews()`) | `/news/` (index) | **Visual hierarchy** — latest item gets lead treatment (larger thumbnail/copy, distinct from rest); card style redesigned (R4.5, AC9) |
| `NewsPanel.astro` | 54 | Top-N news cards for homepage | `limit?: number` (default 5) | `/` (index.mdx) | **Visual hierarchy** — same as NewsList; integrates with redesigned HomeHero on splash page |
| `AudienceFilter.astro` | 78 | Three-checkbox filter + vanilla JS persistence | `scope?: string` (default `[data-audience]`) | `/news/`, `/skills/`, `/tips/` | **Visual-only restyle** — current basic checkboxes; MAY be restyled as segmented control / pill toggle visually, but underlying `<input type="checkbox">` elements remain real; `localStorage.nbgaihub.audience` behavior unchanged; `.audience-hidden` toggle stays (R4.6, AC35) |
| `SocialIconsOverride.astro` | 219 | Starlight header slot override hosting sign-in chip | None (component slot replacement) | All pages (Starlight header) | **Visual restyle** — sign-in chip to match new design system; modal trigger unchanged (R4.7) |
| `PinButton.astro` | 330 | Per-item pin/unpin button (5 types) | `type: PinType`, `slug: string` | `/news/`, `/skills/`, `/tips/`, `/glossary/`, `/news/[slug]`, `/my-pins/` | **Visual restyle** — style only; logic/ARIA/event contracts untouched (R4.7) |
| `SignInModal.astro` | 335 | Global PAT-paste sign-in dialog | None (event-driven modal) | All pages (mounted by SocialIconsOverride) | **Visual restyle** — visual only; validation/auth flow unchanged (R4.7) |

**Styling pattern observed:** Most components have scoped `<style>` blocks (HomeHero exception — no scoped styles, relies on `custom.css`). No `<style is:global>` usage detected. All components use `class="not-content"` or equivalent to opt out of Starlight's prose styling.

### Lib Modules (`src/lib/`) — CONTRACT (Do Not Modify)

All 8 modules are **infrastructure, not presentation** — the redesign consumes their public APIs but must not modify them (refined spec out-of-scope).

| Module | Public API Summary | Purpose |
|---|---|---|
| `api-fetch.ts` | `apiFetch(endpoint, token?, opts?)`, 4 custom Error types (`NetworkError`, `NotFoundError`, `RateLimitedError`, `TokenInvalidError`) | GitHub API fetch wrapper with error narrowing |
| `auth.ts` | `readToken()`, `readUser()`, `signIn(token)`, `signOut()`, `subscribe(fn)`, types: `GitHubUser`, `AuthState`, `AuthSubscriber` | PAT-paste auth; localStorage-backed (`nbgaihub.gh_token`, `nbgaihub.gh_user`, `nbgaihub.gist_id`); pub-sub for state changes |
| `gist.ts` | `findOrCreateFavoritesGist(token)`, `addFavorite(gistId, token, entry)`, `removeFavorite(gistId, token, entry)`, types: `FavoriteEntry`, `FavoritesDocument`; const: `FAVORITES_FILENAME = 'nbgaihub-favorites.json'` | Unlisted gist CRUD for user pins; shape: `{schema_version: 1, favourites: FavoriteEntry[]}` |
| `news.ts` | `getRecentNews(limit?: number)` | Wrapper around `getCollection('news')` with authored-date sort (desc) |
| `pin-store.ts` | `loadPinIndexForType(type)`, `hydrateUserPins(favourites)`, `groupPinsByType(pins)`, types: `PinIndexItem`, `PinIndexFile`, `HydratedPin`, `GroupedPins`, `PinIndexNotFoundError` | Client-side join of gist favourites + build-time JSON indices from `public/_data/` |
| `skill-types.ts` | 17-key `SkillFrontmatter` interface, `SkillForm`, `ValidationIssue`, enums: `SkillOrigin`, `SkillCategory`, `SkillStatus`, `Audience` | Shared types for skill submission; mirrors CI validator contract |
| `slug.ts` | `slugify(title: string)`, const: `SLUG_MAX_LENGTH = 60` | Slug derivation (ASCII-only, word-boundary truncation); parity tested against pipeline's slugify (47 tests) |
| `submission.ts` | `validateSkillForm(form)`, `serializeSkillToMarkdown(form)`, `buildEditorUrl(slug, markdown)`, `checkSlugCollision(slug)`, `copyToClipboard(text)`, const: `MAX_EDITOR_URL_LENGTH = 7000` | Submit-skill form validation/serialization/GitHub-editor-redirect logic |

**Import pattern:** Components import from `../lib/<module>.js` (ESM `.js` extension even though source is `.ts`). Vitest runs on `.ts` sources; Astro/Vite build transpiles to ESM.

## 4. Page Inventory — Marketing vs Content Split

Per refined spec A5, the site has **11 marketing surfaces** (bespoke layouts, redesign targets) and **1 content-detail surface** (Starlight default chrome, theme override target).

### Marketing Surfaces (11) — Bespoke Layout Redesign

All currently render via `<StarlightPage>` wrapper except `/` (already `template: splash`). Redesign must use splash template or custom layout suppressing sidebar/TOC.

| Route | File | Current Renders-Via | Data Sources | Components Embedded | Redesign Scope |
|---|---|---|---|---|
| `/` | `src/content/docs/index.mdx` | `template: splash` | `<HomeHero>`, `<NewsPanel limit={5}>` | HomeHero, NewsPanel (→ AudienceBadge, ConfidenceChip, PinButton) | AC5 — Asymmetric hero ≥80vh, headline ≥4rem desktop, editorial element beyond title/tagline/CTAs |
| `/start-here/day-1/` | `src/pages/start-here/day-1.astro` | `<StarlightPage>` | `getEntry('journeys', 'day-1')` + `render()` | None (renders MDX content) | AC6 — Redesigned chapter/step layout (6 steps visually distinct), sticky step indicator desktop, collapsible/accordion mobile, `#step-N` anchors |
| `/start-here/week-1/` | `src/pages/start-here/week-1.astro` | `<StarlightPage>` | Static placeholder | None | AC7 — Opinionated "coming soon" (no centered stub), deep-links to Skills/Tips/Day 1, tone-consistent |
| `/skills/` | `src/pages/skills.astro` | `<StarlightPage>` | `getCollection('skills')` (9 entries) | AudienceFilter, SkillCard (9×) | AC8 — Abandon `18rem` uniform grid for editorial layout with ≥2 visually distinct card sizes OR featured-lead region; AudienceFilter still works |
| `/news/` | `src/pages/news/index.astro` | `<StarlightPage>` | `NewsList` → `getRecentNews()` (8 published) | AudienceFilter, NewsList (→ AudienceBadge, ConfidenceChip, PinButton) | AC9 — Latest item lead treatment (larger/distinct); AudienceFilter + ConfidenceChip functional |
| `/tips/` | `src/pages/tips.astro` | `<StarlightPage>` | `getCollection('tips')` (12 entries) | AudienceFilter, inline card markup (mirrors SkillCard structure) | AC10 — Redesigned layout (grouped by topic/audience OR magazine-style with pull-quotes); not uniform grid identical to skills |
| `/glossary/` | `src/pages/glossary.astro` | `<StarlightPage>` | `getCollection('glossary')` (15 entries) + `render()` each | PinButton (15×) | AC11 — Search/filter input OR letter-anchored index; restyled term+definition pairs (not default `<dl>`); deep-link anchors work |
| `/reference/` | `src/pages/reference.astro` | `<StarlightPage>` | Static content | None | AC12 — Restyled to match system (currently sparse content; no naked default Starlight chrome) |
| `/contribute/` | `src/pages/contribute.astro` | `<StarlightPage>` | Static content | None | AC13 — Restyled; copy preserved/rewritten in project tone; CTA to Submit a Skill visually integrated |
| `/my-pins/` | `src/pages/my-pins.astro` | `<StarlightPage>` | Client-side hydration via `auth.ts` + `pin-store.ts` | Client script only (no Astro components in page shell beyond modal trigger) | AC14 — Three states (loading, anonymous, signed-in) visually distinct; 5 pin-type sections styled as cards/lists (not generic `<ul>`); privacy callout styled as editorial aside |
| `/submit-skill/` | `src/pages/submit-skill.astro` | `<StarlightPage>` | Client-side form + `submission.ts` | Client script only | AC15 — Form redesigned (section-based progress, fieldsets visually distinguished); inline validation styled with token-driven colors; slug collision indicator integrated; submit affordance redesigned; behavior unchanged (slug derivation, live validation, URL-build-then-redirect, ≥7000-char clipboard fallback) |

**Pattern observed:** All 11 marketing pages use `<StarlightPage frontmatter={{ title }}>` wrapper (except `/` which uses `template: splash` directly). Content wrapped in `.not-content` class to bypass Starlight prose styles where needed.

### Content-Detail Surface (1) — Theme Override Target

| Route | File | Current Renders-Via | Data Sources | Components Embedded | Redesign Scope |
|---|---|---|---|---|
| `/news/[slug]/` | `src/pages/news/[slug].astro` | `<StarlightPage>` (default doc chrome) | `getCollection('news')` → `getStaticPaths()` + `render()` | AudienceBadge, ConfidenceChip, PinButton | AC16–AC19 — Theme override via token layer: body type matches marketing, heading hierarchy expressive, restyled callouts/code/tables/blockquotes/links, restyled sidebar/TOC, active-state indicator not default pill; Pagefind search must keep working (AC31, AC34) |

**Starlight chrome elements to override (via CSS custom properties + class targeting):**
- Sidebar nav (`--sl-*` vars)
- In-page TOC (right rail desktop)
- Callouts (`:::note`, `:::tip`, `:::caution`, `:::danger`)
- Code blocks (background, syntax theme)
- Tables, blockquotes, inline `<code>`, links, list markers
- Previous/next page footer
- Mobile nav drawer trigger (behavior unchanged, visual restyled)
- Dark-mode toggle in header (behavior unchanged)
- Pagefind search modal trigger (behavior unchanged, modal styling best-effort per A10)

## 5. Existing Starlight Integration Surface

**Critical files for token layer:**

| File | Current State | Redesign Contract |
|---|---|---|
| `astro.config.mjs` | Sidebar 11 entries (structure frozen per AC32); `customCss: ['./src/styles/custom.css']`; SocialIcons slot override | Add `tokens.css` to `customCss` array; sidebar structure unchanged (R3.2, AC32) |
| `src/styles/custom.css` | 133 lines; defines `.home-hero`, `.news-card-grid`, `.card-grid`, `.audience-badge`, `.confidence-chip`, `.topic-chip`, `.audience-filter`, `.audience-hidden`, `.empty-state` | **Replace/absorb** — new design system supersedes this (refined spec Q5: absorb into `tokens.css` + new `components.css` files; delete standalone after migration) |
| `src/content.config.ts` | 5 collection schemas (news 13 keys, skills 17 keys, tips/glossary/journeys 10 keys); Zod 4 deprecations noted in SCOPE.md (cosmetic refactor deferred) | **Unchanged** — per refined spec out-of-scope; schemas are contract |
| `src/content/docs/index.mdx` | Homepage; `template: splash`; embeds `<HomeHero>` + `<NewsPanel>` | Template stays `splash`; components redesigned (AC5) |

**Starlight sidebar definition (11 entries, frozen per AC32):**

```javascript
sidebar: [
  { label: 'Home', link: '/' },
  { label: 'My Pins', link: '/my-pins/' },
  {
    label: 'Start Here',
    collapsed: false,
    items: [
      { label: 'Day 1', link: '/start-here/day-1/' },
      { label: 'Week 1 (coming soon)', link: '/start-here/week-1/' },
    ],
  },
  { label: 'News', link: '/news/' },
  { label: 'Skills', link: '/skills/' },
  { label: 'Tips & Tricks', link: '/tips/' },
  { label: 'Glossary', link: '/glossary/' },
  { label: 'Reference', link: '/reference/' },
  {
    label: 'Contribute',
    collapsed: false,
    items: [
      { label: 'How to contribute', link: '/contribute/' },
      { label: 'Submit a Skill', link: '/submit-skill/' },
    ],
  },
]
```

**Starlight's `customCss` mechanism:** Files listed in `customCss` array are injected after Starlight's default theme. The redesign's `tokens.css` must:
1. Define custom properties `--color-*`, `--font-*`, etc. first (source of truth)
2. Remap `--sl-color-*`, `--sl-font-*` to the new tokens (not the other way around) — portability per R11.1, AC36–AC37
3. Support both dark (`data-theme="dark"`) and light (`data-theme="light"`) via attribute selectors or `:root` + override blocks (R1.4, R9, AC3, AC24–AC25)

## 6. Test Inventory

**Total:** 7 test files, 127 tests passing (exact count per refined spec requirement floor).

| Test File | Tests | Coverage |
|---|---|---|
| `tests/auth.test.ts` | 15 | `auth.ts` — `readToken`, `readUser`, `signIn`, `signOut`, pub-sub, error handling |
| `tests/api-fetch.test.ts` | 6 | `api-fetch.ts` — error narrowing (`NetworkError`, `NotFoundError`, `RateLimitedError`, `TokenInvalidError`) |
| `tests/gist.test.ts` | 18 | `gist.ts` — `findOrCreateFavoritesGist`, `addFavorite`, `removeFavorite`, schema validation |
| `tests/submission.test.ts` | 26 | `submission.ts` — 17-rule skill form validation (mirrors CI validator), serialization, URL-build, clipboard fallback |
| `tests/pin-store.test.ts` | 10 | `pin-store.ts` — JSON index loading, hydration, grouping, stale-reference handling |
| `tests/build-pin-index.test.ts` | 5 | `scripts/build-pin-index.ts` — emits 5 JSON files (news, skill, tip, glossary, journey-step) with correct shape |
| `tests/slug.test.ts` | 47 | `slug.ts` — parity with pipeline's `slugify` (47 fixtures: ASCII-only, separator collapse, truncation, edge cases) |

**Test count verification:** Refined spec AC30 requires ≥127 passing after redesign. Current count is exactly 127 — the floor, not a ceiling. Updated tests must preserve coverage intent; new tests MAY be added.

**Test framework:** Vitest 4.1.6 in node environment (`vitest.config.ts` sets `environment: 'node'`). Pattern: `tests/**/*.test.ts`.

## 7. Pre-Build Pipeline

**Script:** `site/scripts/build-pin-index.ts` (run via `tsx` before `astro build`).

**Purpose:** Walk 5 content collections (`../news/published`, `../skills`, `../tips`, `../glossary`, `../journeys`), extract frontmatter (`title`, `audience`, `topics`), emit one JSON file per type to `site/public/_data/`.

**Output shape (per type):**

```json
{
  "schema_version": 1,
  "type": "news",
  "items": [
    {
      "slug": "foo-bar",
      "title": "Foo Bar",
      "audience": "beginner",
      "topics": ["prompting", "tips"]
    }
  ]
}
```

**Files emitted:** `news-index.json`, `skill-index.json`, `tip-index.json`, `glossary-index.json`, `journey-step-index.json` (all 5 present in `public/_data/` after build).

**Consumed by:** `/my-pins/` client script (`pin-store.ts` `loadPinIndexForType()` fetches from `/_data/<type>-index.json`); also consumed by hub plugin's `/hub-pins` command (out-of-scope for site redesign).

**Redesign contract:** **Unchanged per refined spec A18** — shape and dependencies stay. Redesigned `/my-pins/` page reads these JSON files as-is.

## 8. Pagefind Integration

**Source:** Starlight 0.39.2 integrates Pagefind by default (no explicit config in `astro.config.mjs`).

**Build output:** Latest build log shows:

```
11:22:10 [starlight:pagefind] Building search index with Pagefind...
11:22:10 [starlight:pagefind] Found 20 HTML files.
11:22:10 [starlight:pagefind] Finished building search index in 57ms.
```

**Assets:** `public/pagefind/` directory (gitignored; built at `astro build` time; contains Pagefind UI bundle + search index).

**Trigger:** Starlight header's search affordance (magnifying glass icon, kbd shortcut `Cmd+K`/`Ctrl+K`) opens Pagefind modal.

**Indexed pages:** All Starlight-rendered pages (11 marketing pages + `/news/[slug]/` detail pages). Homepage (`template: splash`) is also indexed.

**Redesign contract:** Pagefind must keep working per AC31, AC34. Search modal trigger in header remains (behavior unchanged); modal styling is **best-effort** per refined spec A10 — tokens propagate so modal inherits new accent/contrast, but deep modal restyling is out-of-scope (Pagefind UI styling is a separate effort).

**Configuration discovered:** No custom Pagefind config in `astro.config.mjs` → Starlight's defaults apply (all pages except 404 are indexed, default UI English, default highlight/excerpt settings).

## 9. CSS/Style Surface Audit

**Primary stylesheet:** `src/styles/custom.css` (133 lines) — **full replacement target**.

**Current styling vocabulary:**

| Selector | Purpose | Replacement Strategy |
|---|---|---|
| `.home-hero`, `.home-hero__tagline`, `.home-hero__cta-row`, `.home-hero__cta`, `.home-hero__cta--primary`, `.home-hero__cta--secondary` | Homepage hero layout + CTA buttons | New HomeHero component with token-driven asymmetric layout (AC5) |
| `.news-card-grid`, `.card-grid` | Uniform `repeat(auto-fill, minmax(18rem, 1fr))` grids | **Abandon per refined spec R2.2** — replace with editorial layouts (featured/lead, asymmetric, staggered) |
| `.news-card`, `.skill-card`, `.news-card h3`, `.skill-card h3`, `.news-card__meta`, `.skill-card__topics` | Card structure + typography | Redesigned card hierarchy with tokenized spacing/type/shadow (R4.5, AC8–AC9) |
| `.topic-chip` | Gray pill `var(--sl-color-gray-6)` | Tokenized tag treatment (R4.3) |
| `.audience-badge`, `.audience-badge--beginner`, `.audience-badge--advanced`, `.audience-badge--both` | Flat `#0a7 / #e60 / #08c` pills | Tokenized semantic colors with WCAG AA contrast (R4.1, AC89) |
| `.confidence-chip`, `.confidence-chip--low`, `.confidence-chip--medium`, `.confidence-chip--high` | Flat `#e60 / #aa6 / #666` outlined | Tokenized treatment (R4.2) |
| `.audience-filter`, `.audience-filter label` | Three-checkbox filter layout | Visual restyle (may become segmented control visually; `<input>` elements remain) (R4.6) |
| `.audience-hidden` | `display: none !important` | **Keep as-is** — AudienceFilter script toggles this class; behavior unchanged (AC35) |
| `.empty-state` | Placeholder for zero-item states | Restyled with token-driven border/spacing |

**Inline `<style>` blocks (scoped):** Found in 5 files (all components/pages, no global styles):

- `src/components/PinButton.astro` — scoped button styles (borders, focus-visible, hover, aria-pressed states)
- `src/components/SocialIconsOverride.astro` — scoped sign-in chip + avatar styles
- `src/components/SignInModal.astro` — scoped modal dialog + form layout
- `src/pages/my-pins.astro` — scoped panel/list/button styles
- `src/pages/submit-skill.astro` — scoped form fieldset/section/validation-error styles

**No `<style is:global>` usage detected** — all scoped or in `custom.css`.

**Pattern:** Components use `.not-content` class to opt out of Starlight's prose styles (observed in HomeHero, NewsPanel, AudienceFilter).

## 10. Conventions Detected

**Sampled files:** `src/lib/auth.ts` (85 lines, most-imported lib module — 8 imports across components/pages), `src/content/docs/index.mdx` (18 lines, largest entry point), `tests/submission.test.ts` (largest test file, 26 tests).

**Conventions:**

1. **Import style** — Named imports from relative paths with `.js` extension (ESM): `import { readToken, subscribe } from '../lib/auth.js'`. No default exports in lib modules.
2. **Error handling** — Custom Error subclasses for domain failures (`TokenInvalidError`, `GistNotFoundError`, `PinIndexNotFoundError`). Never silent fallbacks (per global CLAUDE.md rule — if required config/data missing, throw descriptive Error naming file/field).
3. **Config loading** — No env vars, no config files in site workspace. Port 4321 hardcoded in `astro.config.mjs` per CLAUDE.md Ports section (CLI flag `--port` is escape hatch). PAT token stored in `localStorage` (`nbgaihub.gh_token`).
4. **Logging** — No logging library. Build errors print to console. Client-side errors surface via `role="alert"` elements in UI (e.g., SignInModal's `data-nbg-signin-error`).
5. **Code-style markers** — Semicolons omitted (TypeScript ASI). Trailing commas in multi-line arrays/objects. Naming: `camelCase` for functions/variables, `PascalCase` for types/interfaces/components, `kebab-case` for file names/slugs, `SCREAMING_SNAKE_CASE` for constants (`TOKEN_KEY`, `SLUG_MAX_LENGTH`). Single quotes for strings (except TSX/JSX attributes use double quotes).
6. **TypeScript strictness** — `tsconfig.json` sets `strict: true`. All lib modules are strongly typed; no `any` without comment justification.
7. **ESM-only** — `package.json` `"type": "module"`. All imports use `.js` extension (ESM convention even though source is `.ts`). No CommonJS.
8. **Node 22** — `package.json` `"engines": {"node": ">=22"}`. Matches `.nvmrc` in repo root.
9. **Data attributes for client scripts** — Components use `data-*` attributes to mark interactive elements for client scripts (e.g., `data-nbg-signin-dialog`, `data-pin-type`, `data-audience`). Observed pattern: `data-<component-namespace>-<role>`.
10. **`.not-content` class** — Components rendering outside Starlight's prose container use this class to opt out of typography/spacing overrides (HomeHero, NewsPanel, AudienceFilter).

**Files cite design doc:** Many components/modules have header comments referencing `project-design.md` sections (e.g., `HomeHero.astro` → `§S.3.1`, `PinButton.astro` → `§P.4.4`). Refined spec R12.2 requires new components to follow this pattern.

## 11. Marketing vs Content Surfaces — Explicit Mapping

Per refined spec A5, the split:

| Route | Marketing or Content | File | Current Renders-Via | Splash Template Usage | Redesign |
|---|---|---|---|---|
| `/` | Marketing | `src/content/docs/index.mdx` | `template: splash` | **Yes — already using** | Bespoke layout (AC5) |
| `/start-here/day-1/` | Marketing | `src/pages/start-here/day-1.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC6) |
| `/start-here/week-1/` | Marketing | `src/pages/start-here/week-1.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC7) |
| `/skills/` | Marketing | `src/pages/skills.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC8) |
| `/news/` | Marketing | `src/pages/news/index.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC9) |
| `/tips/` | Marketing | `src/pages/tips.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC10) |
| `/glossary/` | Marketing | `src/pages/glossary.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC11) |
| `/reference/` | Marketing | `src/pages/reference.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC12) |
| `/contribute/` | Marketing | `src/pages/contribute.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC13) |
| `/my-pins/` | Marketing | `src/pages/my-pins.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC14) |
| `/submit-skill/` | Marketing | `src/pages/submit-skill.astro` | `<StarlightPage>` | No (convert to splash or custom layout) | Bespoke layout (AC15) |
| `/news/[slug]/` | Content | `src/pages/news/[slug].astro` | `<StarlightPage>` (default doc chrome) | No (stays Starlight default) | Theme override (AC16–AC19) |

**Implementer note:** 10 of 11 marketing surfaces currently use `<StarlightPage>` wrapper with default doc chrome (sidebar + TOC visible). Refined spec R2.1 requires moving these to `template: splash` OR wrapping content in custom layout suppressing sidebar/TOC. Splash template path: set `frontmatter.template = 'splash'` in `<StarlightPage>` (same pattern as `index.mdx`).

## 12. Tooling Versions (Exact)

| Package | Version | Notes |
|---|---|---|
| `astro` | 6.3.5 | No upgrade in workflow (frozen per constraint) |
| `@astrojs/starlight` | 0.39.2 | No upgrade in workflow (frozen per constraint) |
| `vitest` | 4.1.6 | Test runner (127 tests) |
| `typescript` | 5.9.3 | `strict: true` |
| `sharp` | 0.34.5 | Image optimization (Astro dep) |
| `@astrojs/check` | 0.9.0 | TypeScript check (`astro check`) |
| `tsx` | 4.19.0 | Pre-build script runner (`scripts/build-pin-index.ts`) |
| `gray-matter` | 4.0.3 | Frontmatter parser (build script dep) |
| `yaml` | 2.8.3 | YAML serializer (submission.ts uses `stringify()`) |
| `node` | ≥22 | Per `package.json` engines + `.nvmrc` |

**Deprecation warnings:** SCOPE.md notes Zod 4 deprecations in `src/content.config.ts` (`z.string().url()` → `z.url()`) — cosmetic refactor deferred, not blocking. `npm ls` shows no deprecated packages in `site/node_modules/`.

**No lockfile analysis required** — no new deps planned per refined spec constraint.

## 13. Integration Points (Request-Driven Narrowing)

**Request keywords extracted:** UI redesign, design tokens, marketing surfaces, splash template, Starlight theme override, typography, motion, accessibility, dark mode, light mode, responsive, Pagefind, audience filter, sidebar, TOC, components (HomeHero, NewsPanel, SkillCard, AudienceBadge, ConfidenceChip, PinButton, SignInModal), pages (homepage, skills, news, tips, glossary, reference, contribute, my-pins, submit-skill, start-here/day-1, start-here/week-1).

### In-Scope: Files the Redesign Will Touch

**New files to create:**

- `site/src/styles/tokens.css` (or split: `tokens/colors.css`, `tokens/type.css`, etc.) — design token layer (R1, AC1–AC4)
- Possibly: `site/src/styles/components.css` — component-specific overrides absorbing `custom.css` (per Q5)
- Possibly: new layout components under `site/src/components/` (e.g., `MarketingSurface.astro`, `StepIndicator.astro`) if implementer creates shared layout primitives

**Files to modify (visual redesign):**

- `site/astro.config.mjs` (line 18) — add `tokens.css` to `customCss` array
- `site/src/styles/custom.css` — **replace/absorb** (133 lines → token-driven system)
- `site/src/content/docs/index.mdx` — already `template: splash`; update `<HomeHero>` + `<NewsPanel>` calls if props change
- All 10 components under `site/src/components/*.astro` — visual redesign (preserve behavior/ARIA/props)
- All 11 pages under `site/src/pages/*.astro` — bespoke layout migration (convert from `<StarlightPage>` default to splash or custom layout)

**Files to update (tests):**

- Any test asserting old DOM structure (e.g., class names, CSS selectors) — update to equivalent assertion (coverage intent preserved)
- Possibly add new tests for token layer, responsive breakpoints, contrast validation (not required but allowed per AC30)

**Files to document:**

- `docs/design/project-design.md` — add new §S.13 "Design system" (R12.1)
- New component header comments where components are added/refactored (R12.2)

**Line-range highlights for implementer:**

- `astro.config.mjs:18` — `customCss: ['./src/styles/custom.css']` → add `'./src/styles/tokens.css'`
- `src/styles/custom.css:1-133` — entire file is replacement target
- `src/content/docs/index.mdx:10-17` — `<HomeHero>` + `<NewsPanel>` — may need prop updates if new design needs more control
- `src/components/HomeHero.astro:1-39` — current centered single-column; **replace/refactor** (AC5)
- `src/components/AudienceBadge.astro:11` — `.audience-badge--beginner { background: #0a7; }` (inline replacement with token var)
- `src/components/ConfidenceChip.astro:13` — `.confidence-chip--low { color: #e60; }` (inline replacement with token var)
- `src/components/SkillCard.astro:18-41` — uniform card structure; add featured/lead variant logic
- `src/components/NewsPanel.astro:26` — `.news-card-grid` class; replace with asymmetric grid
- `src/components/NewsList.astro:18` — same `.news-card-grid`; ensure lead item gets distinct style
- `src/components/AudienceFilter.astro:12-21` — basic checkboxes; restyle visually (keep `<input type="checkbox">` elements real)
- `src/pages/start-here/day-1.astro:1-14` — renders journey markdown; redesign must add step indicator + anchor links
- `src/pages/skills.astro:24` — `.card-grid` with uniform `18rem` minmax; replace with editorial layout
- `src/pages/news/index.astro:12` — `<AudienceFilter>` + `<NewsList>`; ensure lead treatment visible
- `src/pages/tips.astro:24-46` — inline card markup; redesign for magazine-style or grouped layout
- `src/pages/glossary.astro:32-44` — alphabetical TOC + term sections; add search/filter if Pagefind doesn't cover
- `src/pages/my-pins.astro:31-88` — three states (loading, anonymous, signed-in); restyle panels/lists/buttons
- `src/pages/submit-skill.astro:32-end` — form fieldsets; restyle with tokenized colors, section-based progress
- `src/pages/news/[slug].astro:20-50` — content detail; theme override applies here (sidebar, TOC, callouts, code blocks)

### Out-of-Scope: Modules NOT Touched by Redesign

**Lib modules (all 8):**

- `src/lib/auth.ts` — unchanged (contract)
- `src/lib/api-fetch.ts` — unchanged (contract)
- `src/lib/gist.ts` — unchanged (contract)
- `src/lib/news.ts` — unchanged (contract)
- `src/lib/pin-store.ts` — unchanged (contract)
- `src/lib/skill-types.ts` — unchanged (contract)
- `src/lib/slug.ts` — unchanged (contract)
- `src/lib/submission.ts` — unchanged (contract)

**Content collections schemas:**

- `src/content.config.ts` — unchanged (per refined spec out-of-scope)

**Pre-build script:**

- `scripts/build-pin-index.ts` — unchanged (per A18)

**Config files:**

- `vitest.config.ts` — unchanged
- `tsconfig.json` — unchanged
- `package.json` — unchanged (no new deps; existing scripts stay)

**Sidebar structure:**

- `astro.config.mjs:24-48` (sidebar array) — frozen (per AC32); only visual styling of rendered sidebar changes

**Sibling workspaces:**

- `../pipeline/` — out-of-scope (RSS triage)
- `../plugin/` — out-of-scope (hub commands)
- `../news/`, `../skills/`, `../tips/`, `../glossary/`, `../journeys/` — content edits out-of-scope (per refined spec); structure unchanged

### New Integration Points (Libraries/Patterns Not Yet in Codebase)

**Fonts:**

- Refined spec A3 proposes **Inter** (variable, open license) for body+UI, **Geist** or **Inter Display** for headlines, **JetBrains Mono** for monospace. Implementer chooses during design phase; must self-host or system-stack per R6.1. If web-loaded, use `font-display: swap` + preload.
- **Landing location:** `site/public/fonts/` (if self-hosted) OR system font stack in `tokens.css` (if system)

**Motion library (optional):**

- Refined spec A4 assumes CSS transitions + `IntersectionObserver` suffice (no new dep). If implementer wants `motion` (framer-motion fork) or `gsap`, justify in plan and add as non-deprecated dep. **Not mandated.**
- **Landing location:** `site/src/lib/motion.ts` (if added) OR inline `<script>` blocks in components (if vanilla JS)

**Accessibility audit tooling (optional):**

- axe-core or pa11y CLI for contrast validation (AC21). Not wired in CI currently; may be added as dev dep for manual audits.
- **Landing location:** `site/package.json` devDependencies (if added)

## 14. Notes

**Anomalies flagged for follow-up:**

1. **No formal lint script** — `package.json` has `"check": "astro sync && astro check"` (TypeScript check) but no ESLint/Prettier. Refined spec AC29 uses `astro check` + `npm run build` as lint bar. If implementer wants to add linting, add it as optional enhancement (not blocking).

2. **Custom.css already exceeds original 100-line cap** — 133 lines vs. A6's ≤100 line constraint. Orchestrator context notes this cap is lifted per A7; redesign produces real design system.

3. **Pagefind modal styling is best-effort** — Refined spec A10 acknowledges deep Pagefind UI restyling is out-of-scope. Tokens propagate so modal inherits accent/contrast, but structural redesign of modal is deferred.

4. **Zod 4 deprecations in content.config.ts** — SCOPE.md notes `z.string().url()` → `z.url()` migration deferred. Not blocking; cosmetic refactor.

5. **No existing splash-template usage to learn from** — Only `/` (index.mdx) uses `template: splash` currently. Implementer must discover Starlight's splash template capabilities (full-bleed sections, custom component slots) or build custom layout suppressing sidebar/TOC.

6. **Test count is exactly the floor (127)** — Refined spec AC30 requires ≥127 passing; current count is 127. Any test breakage during redesign must be offset by fixing or adding tests. Count cannot drop below 127.

7. **Day-1 journey has 6 steps** — AC6 requires step indicator + anchors (`#step-N`). Current `journeys/day-1.md` renders as prose; redesign must parse/structure the 6 steps (may require markdown parsing or hand-coded step markup).

8. **Week-1 page is stub** — AC7 requires opinionated "coming soon" surface with deep-links. Current page is 12 lines of placeholder. Redesign must flesh out.

9. **No hero image extraction from news RSS** — Refined spec A8 notes no external images; `hero_image` field reserved in schema (optional) for forward compat. Not used currently; redesign must use CSS/SVG/typography for visuals.

10. **Glossary lacks search** — AC11 + A11 require search/filter input OR letter-anchored index if Pagefind doesn't cover glossary page usefully. Implementer must verify Pagefind coverage and add in-page filter if needed (vanilla JS, no deps).

