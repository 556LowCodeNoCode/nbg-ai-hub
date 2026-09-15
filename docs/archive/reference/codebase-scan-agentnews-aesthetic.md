---
language: typescript
framework: astro
package_manager: npm
workspace_root: site/
build_command: cd site && npm run build
test_command: cd site && npm test
check_command: cd site && npm run check
dev_server: cd site && npm run dev -- --port 4321
last_scanned_commit: 36b875892c03c1387f1c723052d1663dbec6f0e7
scanned_for_request: agentnews-aesthetic-match
scanned_at: 2026-05-23T18:45:00Z
---

# Codebase Scan — NbgAiHub (AgentNews Aesthetic Redesign)

## 1. Project Overview

The NBG AI Hub is a curated Claude Code knowledge hub built on Astro 6.3.5 + Starlight 0.39.2. The site workspace (`site/`) contains 12 .astro pages, 30 components (14 custom + 16 primitives), 10 test files (215 tests passing), and a three-tier design token system (~245 CSS custom properties across 6 token files). The existing Linear/Vercel/Stripe aesthetic redesign (committed at `36b8758`) is the baseline; the AgentNews redesign will re-anchor the token values, layout chrome, and news surface while preserving the functional contracts (auth, pins, audience filter, Pagefind, sidebar, dark/light theming). Only the `site/` workspace is in scope — `pipeline/` and `plugin/` are reference-only.

## 2. Module Map

### site/src/pages (12 files)

| Path | Purpose | Template |
|------|---------|----------|
| `index.astro` | Homepage — hero + HomeStats + NewsPanel (3 most recent) | MarketingShell (splash) |
| `news/index.astro` | News feed index — featured lead + chronological feed | MarketingShell (splash) |
| `news/[slug].astro` | News detail page — StarlightPage with AudienceBadge + PinButton | Content (Starlight chrome) |
| `skills.astro` | Skills catalog | MarketingShell (splash) |
| `tips.astro` | Tips & tricks index | MarketingShell (splash) |
| `glossary.astro` | Glossary index (hybrid — canonical page + anchor links) | MarketingShell (splash) |
| `reference.astro` | Reference placeholder | MarketingShell (splash) |
| `contribute.astro` | Contribution guide | MarketingShell (splash) |
| `my-pins.astro` | Personalized pins surface (PAT-paste gist-backed) | MarketingShell (splash) |
| `submit-skill.astro` | Skill submission web form (URL-redirect to GitHub editor) | MarketingShell (splash) |
| `start-here/day-1.astro` | Day 1 onboarding journey | MarketingShell (splash) |
| `start-here/week-1.astro` | Week 1 onboarding journey (placeholder) | MarketingShell (splash) |

**Marketing surface count:** 11 (all pages use MarketingShell except `/news/[slug].astro`).

### site/src/components (14 custom components)

| Component | Purpose | Token consumption |
|-----------|---------|-------------------|
| `MarketingShell.astro` | Wrapper for all splash-template pages — wraps StarlightPage, hides auto `<h1>`, provides hero/body/footer slots | `--nbg-color-bg-canvas`, `--nbg-color-fg-primary`, `--nbg-type-body`, `--nbg-fs-md`, `--nbg-lh-base` |
| `SplashAwareHeader.astro` | Header override (wired via `astro.config.mjs`) — unified nbg-topnav on splash pages, default Starlight header on content-detail | Full token set (see line 317-642) — consumes `--nbg-color-*`, `--nbg-sp-*`, `--nbg-r-*`, `--nbg-dur-*`, `--nbg-ease-*`, `--nbg-type-*`, `--nbg-fs-*`, `--nbg-fw-*`, `--nbg-sh-*` |
| `HomeHero.astro` | Hero for homepage | Token-driven (no hardcoded colors) |
| `HomeStats.astro` | Build-time content counts (5 pillars) | Token-driven |
| `NewsPanel.astro` | 3-item preview for homepage | Token-driven |
| `NewsList.astro` | Magazine-list renderer (used by NewsPanel) | Token-driven |
| `AudienceBadge.astro` | Renders `beginner`/`advanced`/`both` badges | **Hardcoded colors** (legacy.css lines 120-122: `#0a7`, `#e60`, `#08c`) — flagged for token migration |
| `AudienceFilter.astro` | Checkbox-driven filter for `[data-audience]` elements | Token-driven + localStorage persistence |
| `ConfidenceChip.astro` | Renders `high`/`medium`/`low` editor confidence | **Hardcoded colors** (legacy.css lines 132-134: `#e60`, `#aa6`, `#666`) — flagged for token migration |
| `SkillCard.astro` | Card variant for skills catalog | Token-driven (uses `Card` primitive) |
| `PinButton.astro` | Pin/unpin button (triggers gist update) | Token-driven |
| `AuthControls.astro` | Sign-in chip XOR "Sign in" link | Token-driven |
| `SignInModal.astro` | PAT-paste modal (unlisted gist auth) | Token-driven |
| `SocialIconsOverride.astro` | Starlight SocialIcons override (mounts AuthControls + SignInModal on content-detail pages) | Imports from `@astrojs/starlight` |

### site/src/components/primitives (16 portable primitives)

All primitives consume ONLY `--nbg-*` tokens (zero Starlight imports per AC36 portability gate). No hardcoded color values found (verified via grep).

| Primitive | Purpose | Key tokens consumed |
|-----------|---------|---------------------|
| `Badge.astro` | Token-driven badge (replaces AudienceBadge/ConfidenceChip legacy) | `--nbg-color-audience-*`, `--nbg-color-confidence-*` |
| `Button.astro` | Primary/secondary/ghost variants | `--nbg-color-accent`, `--nbg-color-bg-surface`, `--nbg-r-md`, `--nbg-sh-*` |
| `Card.astro` | Feature/content/link/stat variants | `--nbg-color-bg-surface`, `--nbg-color-border-*`, `--nbg-r-lg`, `--nbg-sh-md` |
| `Chip.astro` | Inline tag/label | `--nbg-color-bg-page`, `--nbg-fs-xs`, `--nbg-r-sm` |
| `Cluster.astro` | Horizontal flex layout with gap + justify | `--nbg-sp-*` (gap) |
| `Container.astro` | Max-width wrapper — `default`/`wide`/`full` variants | Accepts `width="full"` for edge-to-edge (R3.1) |
| `Display.astro` | Display headlines (H1-H6) | `--nbg-fs-display-*`, `--nbg-lh-display`, `--nbg-fw-bold`, `--nbg-ls-tight` |
| `Eyebrow.astro` | Section eyebrow (mono, uppercase, wide tracking) | `--nbg-type-mono`, `--nbg-fs-xs`, `--nbg-ls-wide` |
| `Grid.astro` | CSS grid layout | `--nbg-sp-*` (gap) |
| `Kbd.astro` | Keyboard shortcut chip | `--nbg-type-mono`, `--nbg-fs-2xs`, `--nbg-color-bg-page` |
| `Lede.astro` | Lead paragraph (larger body type) | `--nbg-fs-lg`, `--nbg-lh-base`, `--nbg-color-fg-secondary` |
| `MotionReveal.astro` | Scroll-reveal wrapper (currently a no-op per Issues #5) | **No motion active** — opacity:1 unconditionally (line 47-50) |
| `Section.astro` | Vertical spacing + tone wrapper | `--nbg-sp-*` (spacing) |
| `Split.astro` | Two-column split layout (start/end slots) | `--nbg-sp-*` (gap) |
| `Stack.astro` | Vertical flex layout with gap | `--nbg-sp-*` (gap) |
| `StepIndicator.astro` | Onboarding step counter | `--nbg-color-accent`, `--nbg-r-full` |

### site/src/lib (8 TypeScript modules — all contract, no edits)

| Module | Purpose | Key exports |
|--------|---------|-------------|
| `news.ts` | News collection loader | `getRecentNews()` |
| `auth.ts` | PAT validation against GitHub `/user` endpoint | `validateToken(pat)` |
| `gist.ts` | Unlisted gist CRUD (favourites JSON) | `createGist()`, `updateGist()`, `fetchGist()` |
| `pin-store.ts` | Client-side pin state (localStorage + gist sync) | `togglePin()`, `isPinned()` |
| `api-fetch.ts` | Fetch wrapper with retry + rate-limit handling | `apiFetch(url, opts)` |
| `slug.ts` | Slug normalization | `slugify(str)` |
| `submission.ts` | Skill submission frontmatter serialization | `buildSubmissionMarkdown()` |
| `skill-types.ts` | Shared TS types for skill frontmatter | `SkillFrontmatter` interface |

### site/src/styles (6 files)

| File | Purpose | Import order |
|------|---------|--------------|
| `tokens/index.css` | Aggregator — imports layers, primitives, semantic, aliases, legacy | 1st (via `astro.config.mjs` customCss) |
| `motion.css` | View-transitions + reduced-motion overrides | 2nd |
| `content-prose.css` | Content-detail prose override (body type, links, code, tables, callouts) | 3rd |
| `content-chrome.css` | Content-detail chrome override (sidebar, TOC, header) | 4th |
| `tokens/layers.css` | Cascade layer order declaration (8 layers) | Imported 1st by index.css |
| `tokens/primitives.css` | 135 primitive tokens (6 color ramps, type scale, spacing, radius, shadows, motion, z-index) | Imported 2nd by index.css |
| `tokens/semantic.css` | 38 semantic tokens × 2 themes (dark, light) | Imported 3rd by index.css |
| `tokens/aliases.css` | 13 `--sl-color-*` aliases onto `--nbg-*` tokens (Pagefind + Starlight chrome retint) | Imported 4th by index.css |
| `tokens/legacy.css` | Holding pen for absorbed custom.css rules (includes `.audience-hidden` utility) | Imported 5th by index.css |

### site/tests (10 files, 215 tests passing)

| Test file | Focus | Test count |
|-----------|-------|------------|
| `api-fetch.test.ts` | Fetch wrapper retry logic | 1 describe block |
| `auth.test.ts` | PAT validation | 1 describe block |
| `build-output.test.ts` | Build-emitted `_data/` indices | 8 tests |
| `build-pin-index.test.ts` | Pin index generation | 2 tests |
| `gist.test.ts` | Gist CRUD | 1 describe block |
| `glossary-filter.test.ts` | Glossary filter interaction | 2 tests |
| `motion-reveal.test.ts` | MotionReveal observer | 1 test |
| `pin-store.test.ts` | Pin localStorage + gist sync | 1 describe block |
| `slug.test.ts` | Slug normalization | 1 test |
| `submission.test.ts` | Skill submission serialization | 6 tests |

### site/scripts (1 file)

| Script | Purpose | Invoked by |
|--------|---------|------------|
| `build-pin-index.ts` | Walks `news/published/`, `skills/`, `tips/`, `glossary/`, `journeys/` and emits 5 JSON indices to `site/public/_data/` | `npm run build` (chained before `astro build`) |

### site/public/_data (5 files, build-emitted)

| File | Schema | Consumer |
|------|--------|----------|
| `news-index.json` | `{ schema_version: 1, type: "news", items: [{ slug, title, audience, topics }] }` | `/my-pins/` |
| `skill-index.json` | Same | `/my-pins/` |
| `tip-index.json` | Same | `/my-pins/` |
| `glossary-index.json` | Same | `/my-pins/` |
| `journey-step-index.json` | Same | `/my-pins/` |

## 3. Conventions

Observed in the Linear/Vercel/Stripe baseline (commit `36b8758`):

- **No fallback values for missing configuration.** `MarketingShell.astro` line 56-58: throws explicit Error if `title` prop is absent. `build-pin-index.ts` (per comment lines 11-13) throws if any markdown file is missing `title`, `audience`, or `topics`.
- **TypeScript for all logic.** Every module in `lib/` is `.ts`. Test files are `.test.ts`. Build scripts are `.ts` (executed via `tsx`).
- **Token-first styling.** Zero hardcoded colors in primitives (verified). Only legacy components (`AudienceBadge`, `ConfidenceChip` via `legacy.css` lines 120-122, 132-134) retain flat hex colors — flagged for migration to `--nbg-color-audience-*` / `--nbg-color-confidence-*` tokens.
- **Single sidebar definition.** `astro.config.mjs` lines 95-119 declare 11 sidebar entries. No per-page sidebar overrides.
- **Marketing vs content split.** Marketing surfaces (splash-template pages) use `MarketingShell` → no sidebar/TOC. Content-detail pages (e.g. `/news/[slug]/`) use `StarlightPage` directly → sidebar + TOC visible.
- **Portability gate (AC36).** Only 3 files import from `@astrojs/starlight`: `MarketingShell.astro`, `SocialIconsOverride.astro`, `SplashAwareHeader.astro`. Primitives import zero Starlight (verified).
- **Reduced-motion defense in depth.** Three layers: (1) tokens collapse durations to instant under `@media (prefers-reduced-motion: reduce)` (primitives.css lines 251-258), (2) MotionReveal CSS forces opacity:1 unconditionally (MotionReveal.astro line 47), (3) motion.ts observer early-returns if reduced-motion matches (motion.ts line 25).
- **Test-driven non-regression.** Every functional flow has a test. Redesign phases must update tests to assert equivalent post-redesign behaviour (no test deletions per R12.2).

## 4. Integration Points

These are the load-bearing surfaces the AgentNews redesign must touch.

### 4.1 — Token files (6 files under `site/src/styles/tokens/`)

**How they relate:**

`index.css` (aggregator) → imports in order:
1. `layers.css` (8-layer cascade order — MUST be first)
2. `primitives.css` (135 tokens, theme-neutral)
3. `semantic.css` (38 tokens × 2 themes — binds primitives into meaning)
4. `aliases.css` (13 `--sl-color-*` → `--nbg-*` mappings for Starlight + Pagefind retint)
5. `legacy.css` (holding pen — `.audience-hidden` utility + absorbed custom.css rules)

**Current palette (primitives.css, lines 19-96):**

| Ramp | Role | Steps | Example values |
|------|------|-------|----------------|
| `--nbg-c-slate-*` | Neutral cool gray | 50..950 | `hsl(220 25% 98%)` → `hsl(220 25% 5%)` |
| `--nbg-c-violet-*` | Brand accent (buttons, links, focus rings) | 50..950 | `hsl(265 100% 97%)` → `hsl(265 55% 14%)` |
| `--nbg-c-emerald-*` | Audience-beginner / success | 50..950 | `hsl(155 70% 96%)` → `hsl(155 45% 7%)` |
| `--nbg-c-amber-*` | Audience-advanced / confidence-medium / warning | 50..950 | `hsl(38 95% 96%)` → `hsl(24 50% 9%)` |
| `--nbg-c-rose-*` | Danger / validation-error / confidence-low | 50..950 | `hsl(350 90% 96%)` → `hsl(350 50% 9%)` |
| `--nbg-c-sky-*` | Info / audience-both | 50..950 | `hsl(210 90% 96%)` → `hsl(210 50% 8%)` |

**Type scale (primitives.css, lines 109-121):**

| Token | Size | Usage |
|-------|------|-------|
| `--nbg-fs-2xs` | 11px | kbd, eyebrow micro |
| `--nbg-fs-xs` | 12px | eyebrow, chip, badge |
| `--nbg-fs-sm` | 14px | secondary body, captions |
| `--nbg-fs-md` | 16px | body default |
| `--nbg-fs-lg` | 18px | lede small |
| `--nbg-fs-xl` | 22px | h3 / lede large |
| `--nbg-fs-2xl` | 28px | h2 |
| `--nbg-fs-display-sm` | 36px | section eyebrow display |
| `--nbg-fs-display-md` | 48px | h1 marketing |
| `--nbg-fs-display-lg` | 64px | hero h1 minimum (AC5 floor) |
| `--nbg-fs-display-xl` | 80px | hero h1 desktop wide |
| `--nbg-fs-display-2xl` | 104px | oversized hero (reserved) |

**Spacing rhythm (primitives.css, lines 160-177):**

4px-base modular scale. `--nbg-sp-0` (0) → `--nbg-sp-32` (8rem). Used everywhere for padding, gap, margin.

**Radius (primitives.css, lines 182-189):**

`--nbg-r-xs` (2px) → `--nbg-r-2xl` (24px), plus `--nbg-r-pill` (9999px) and `--nbg-r-full` (50%).

**Shadow (primitives.css, lines 194-210):**

Five steps `--nbg-sh-xs` → `--nbg-sh-xl`, plus `--nbg-sh-glow-accent` (used by Card variant="feature" + Button variant="primary") and `--nbg-sh-focus-ring`.

**Motion (primitives.css, lines 215-224):**

| Token | Value | Usage |
|-------|-------|-------|
| `--nbg-dur-instant` | 0.01ms | Reduced-motion fallback |
| `--nbg-dur-fast` | 120ms | Hover micro-interactions |
| `--nbg-dur-base` | 200ms | Default transitions |
| `--nbg-dur-slow` | 400ms | Drawer open/close |
| `--nbg-dur-scroll-reveal` | 700ms | MotionReveal (currently unused) |
| `--nbg-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default easing |
| `--nbg-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Bidirectional |
| `--nbg-ease-bounce-soft` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Elastic (unused) |
| `--nbg-ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Material-inspired |

**Semantic bindings (semantic.css):**

Dark theme (default, lines 20-87):
- Surface: `--nbg-color-bg-canvas: var(--nbg-c-slate-950)`, `--nbg-color-bg-page: var(--nbg-c-slate-900)`, `--nbg-color-bg-surface: var(--nbg-c-slate-800)`
- Foreground: `--nbg-color-fg-primary: var(--nbg-c-slate-50)`, `--nbg-color-fg-secondary: var(--nbg-c-slate-200)`, `--nbg-color-fg-muted: var(--nbg-c-slate-400)`
- Accent: `--nbg-color-accent: var(--nbg-c-violet-400)`, `--nbg-color-accent-hover: var(--nbg-c-violet-300)`
- Audience: `--nbg-color-audience-beginner-bg: hsl(155 60% 18%)`, `--nbg-color-audience-beginner-fg: var(--nbg-c-emerald-200)`

Light theme (overrides, lines 90-163):
- Surface: `--nbg-color-bg-canvas: var(--nbg-c-slate-50)`, etc.
- Foreground: `--nbg-color-fg-primary: var(--nbg-c-slate-950)`, etc.
- Shadows are softened (lighter alpha, shorter offsets)

**Starlight aliases (aliases.css, lines 21-53 dark, lines 55-79 light):**

13 alias mappings enable Pagefind + sidebar + TOC retint without touching Starlight internals:

| Starlight token | NBG token |
|-----------------|-----------|
| `--sl-color-black` | `--nbg-color-bg-elevated` |
| `--sl-color-white` | `--nbg-color-fg-primary` |
| `--sl-color-text` | `--nbg-color-fg-primary` |
| `--sl-color-text-accent` | `--nbg-color-accent` |
| `--sl-color-accent` | `--nbg-color-accent` |
| `--sl-color-gray-1` through `--sl-color-gray-6` | Various `--nbg-c-slate-*` steps |
| `--sl-font` | `--nbg-type-body` |
| `--sl-font-mono` | `--nbg-type-mono` |

**Where AgentNews palette tokens will land:**

R2.1 says primitives.css is re-tuned. The six ramps (slate, violet, emerald, amber, rose, sky) will have their HSL values replaced to match AgentNews's captured palette. Token *names* must NOT change (R2.5) — components depend on them. If AgentNews uses a darker neutral than slate, a *new* ramp (e.g. `--nbg-c-graphite-*`) is added, not substituted.

### 4.2 — Layout shells (2 files)

**`site/src/components/MarketingShell.astro` (96 lines, 11 marketing surfaces use it):**

- Wraps `StarlightPage` with `template: 'splash'` (drops sidebar + TOC).
- Provides hero slot, main content slot, footer slot.
- Accepts props: `title` (required), `description`, `eyebrow`, `surfaceId`, `hero` (`auto`/`none`), `width` (`default`/`wide`/`full`), `theme` (`default`/`inverse`).
- Global `<style>` (lines 105-146) hides Starlight's auto `<h1>` (rule at line 126-128) and pagination links (line 143-145).
- Scoped `<style>` (lines 148-172) applies background, typography, and eyebrow styles.

**Hardcoded values to re-tune:**

- Line 151: `background: var(--nbg-color-bg-canvas)` — survives (token reference).
- Line 159: `background: var(--nbg-color-bg-elevated)` — survives.
- Line 317 (SplashAwareHeader): `backdrop-filter: saturate(180%) blur(10px)` — may need AgentNews-specific values.

**`site/src/components/SplashAwareHeader.astro` (643 lines):**

- Header override wired via `astro.config.mjs` line 88.
- On splash pages (line 84-175): renders unified `nbg-topnav` (brand + 8 section links + Pagefind search + AuthControls + ThemeSelect + mobile drawer).
- On content-detail pages (line 176-192): renders default Starlight Header markup.
- Brand wordmark lives at `site/public/brand/nbg-wordmark-blue.png` (light) and `nbg-wordmark-white.png` (dark).
- Section links array (lines 65-74): 8 entries (Start Here, Skills, Tips, News, Glossary, Reference, My Pins, Contribute).

**Scoped `<style>` (lines 240-643):**

- Line 317: `.nbg-topnav` — backdrop blur + translucent background.
- Line 326: `.nbg-topnav__inner` — flex container, max-width 88rem (1408px), centered.
- Line 362: `.nbg-topnav__logo` — height 22px (wordmark).
- Line 404-440: `.nbg-topnav__links a` — section link typography + hover + active state (accent dot at line 428-436).
- Line 460-509: `.nbg-topnav__search` — Pagefind button restyle (compact, icon + ⌘K chip).
- Line 517-566: `.nbg-topnav__theme` — ThemeSelect icon-only restyle.
- Line 569-642: `.nbg-topnav__toggle` + `.nbg-topnav__drawer` — mobile hamburger + drawer.

**Integration point:** R3.2 requires full-bleed chrome. The `.nbg-topnav__inner` max-width (88rem) may need to be lifted OR the outer `.nbg-topnav` may need `width: 100vw` with padding-only constraining the inner content. AgentNews investigation will determine which.

### 4.3 — Marketing surfaces (11 pages, all `.astro` under `site/src/pages/`)

**List with current hero + body composition:**

| Page | Hero | Body | Key components |
|------|------|------|----------------|
| `/` | `Split` (start: Eyebrow + Display + Lede + Button cluster; end: HomeStats) | `NewsPanel` | HomeStats, NewsPanel |
| `/news/` | `Stack` (Eyebrow + Display + Lede + AudienceFilter) | Lead `Card variant="feature"` + feed `Stack` of `Card variant="content"` | AudienceFilter, PinButton, Badge, Chip |
| `/skills/` | TBD (not read in this scan) | TBD | SkillCard |
| `/tips/` | TBD | TBD | Card variants |
| `/glossary/` | TBD | TBD | Anchor links |
| `/reference/` | TBD | TBD | Placeholder |
| `/contribute/` | TBD | TBD | Prose + links |
| `/my-pins/` | TBD | TBD | AuthControls, SignInModal, pin hydration |
| `/submit-skill/` | TBD | TBD | Live validator, GitHub-editor redirect |
| `/start-here/day-1/` | TBD | TBD | StepIndicator, journey steps |
| `/start-here/week-1/` | TBD | TBD | Placeholder |

**Integration point:** R4 replaces `/news/index.astro` in-place. Current layout (lines 39-141):
- Hero: Eyebrow "Updates" + Display "News" + Lede + AudienceFilter (lines 39-47).
- Lead card: `Card variant="feature"` with Eyebrow "Latest", Display H2, summary, Badge cluster, Button "Read the full item", PinButton (lines 60-96).
- Feed: `Stack` of `Card variant="content"` items in an `<ol>` (lines 99-137), separated by 1px borders (lines 177-184).

**Which components this re-skin must touch:**

The refined spec (R5.1) says every marketing surface is re-skinned. The coder must:

1. Read each of the 11 pages.
2. For each page, note which primitives it composes (Display, Eyebrow, Lede, Card, Button, Badge, Chip, Stack, Section, etc.).
3. Update the primitives' scoped `<style>` blocks to reference the new token values (if tokens are re-anchored).
4. For the news page specifically, rewrite the layout to match the AgentNews card pattern captured in the investigation artifact (R1, AC1).

### 4.4 — News surface detail (`/news/[slug].astro`, 51 lines)

**Current structure:**

- Wraps `StarlightPage` directly (NOT MarketingShell).
- Renders frontmatter: `AudienceBadge`, `ConfidenceChip`, source, date, topics (as `.topic-chip`), external link, AI summary, `<Content />`.
- Classes used: `.news-card__meta`, `.news-card__source`, `.news-card__date`, `.skill-card__topics`, `.topic-chip`.

**Integration point:** R4.4 says the detail route is restyled via `content-prose.css` + `content-chrome.css` re-tune. The page file itself stays unchanged (same routing, same components). The *visual* re-skin happens in the token + chrome CSS files.

**Note:** `AudienceBadge` and `ConfidenceChip` are legacy components with hardcoded colors (legacy.css lines 120-122, 132-134). The redesign should migrate them to `<Badge tone={audience}>` and `<Badge tone={confidence}>` which consume the token-driven `--nbg-color-audience-*` / `--nbg-color-confidence-*` values.

### 4.5 — Components touched by re-skin (30 total: 14 custom + 16 primitives)

**Custom components (14):**

| Component | Hardcoded values? | Re-skin action |
|-----------|-------------------|----------------|
| `MarketingShell.astro` | No | Update scoped styles if layout chrome changes (e.g., full-bleed padding) |
| `SplashAwareHeader.astro` | Lines 317-642 (entire topnav chrome) | Re-tune backdrop blur, max-width, section link hover, search button, theme toggle |
| `HomeHero.astro` | TBD | Re-tune hero layout + type scale |
| `HomeStats.astro` | TBD | Re-tune stat card layout |
| `NewsPanel.astro` | TBD | Re-tune preview card layout |
| `NewsList.astro` | TBD | Re-tune magazine-list layout |
| `AudienceBadge.astro` | **YES** (legacy.css lines 120-122) | Migrate to `<Badge tone={audience}>` |
| `AudienceFilter.astro` | No (uses real `<input type="checkbox">`) | Re-tune label typography, maybe replace with Chip primitive |
| `ConfidenceChip.astro` | **YES** (legacy.css lines 132-134) | Migrate to `<Badge tone={confidence}>` |
| `SkillCard.astro` | No (uses `Card` primitive) | Re-tune card layout if Card primitive changes |
| `PinButton.astro` | TBD | Re-tune button typography + icon size |
| `AuthControls.astro` | TBD | Re-tune chip vs link styling |
| `SignInModal.astro` | TBD | Re-tune modal chrome |
| `SocialIconsOverride.astro` | Imports from Starlight | No change (portability contract) |

**Primitives (16):**

All primitives are token-driven (zero hardcoded colors verified). Re-skin actions:

| Primitive | Current token usage | Re-skin action |
|-----------|---------------------|----------------|
| `Badge.astro` | `--nbg-color-audience-*`, `--nbg-color-confidence-*` | Re-anchor token values in semantic.css |
| `Button.astro` | `--nbg-color-accent`, `--nbg-r-md`, `--nbg-sh-*` | Re-tune shadow weight, radius if AgentNews differs |
| `Card.astro` | `--nbg-color-bg-surface`, `--nbg-r-lg`, `--nbg-sh-md` | Re-tune shadow, radius, padding, border |
| `Chip.astro` | `--nbg-color-bg-page`, `--nbg-r-sm` | Re-tune background, radius |
| `Cluster.astro` | `--nbg-sp-*` | No visual change (layout primitive) |
| `Container.astro` | Accepts `width="full"` | Re-tune to ensure true edge-to-edge (AC6-AC9) |
| `Display.astro` | `--nbg-fs-display-*`, `--nbg-lh-display`, `--nbg-ls-tight` | Re-tune type scale, line-height, tracking if AgentNews differs |
| `Eyebrow.astro` | `--nbg-type-mono`, `--nbg-fs-xs`, `--nbg-ls-wide` | Re-tune size, tracking |
| `Grid.astro` | `--nbg-sp-*` | No visual change (layout primitive) |
| `Kbd.astro` | `--nbg-type-mono`, `--nbg-fs-2xs` | Re-tune size, background |
| `Lede.astro` | `--nbg-fs-lg`, `--nbg-color-fg-secondary` | Re-tune size, color |
| `MotionReveal.astro` | **No motion active** | R7.1: reactivate only if AgentNews uses scroll-reveal |
| `Section.astro` | `--nbg-sp-*` | Re-tune vertical rhythm |
| `Split.astro` | `--nbg-sp-*` | Re-tune gap, maybe ratio |
| `Stack.astro` | `--nbg-sp-*` | Re-tune gap |
| `StepIndicator.astro` | `--nbg-color-accent`, `--nbg-r-full` | Re-tune accent color |

**Line-number citations for hardcoded values:**

- `legacy.css` lines 120-122 (AudienceBadge):
  ```css
  .audience-badge--beginner { background: #0a7; }
  .audience-badge--advanced { background: #e60; }
  .audience-badge--both     { background: #08c; }
  ```
- `legacy.css` lines 132-134 (ConfidenceChip):
  ```css
  .confidence-chip--low    { color: #e60; }
  .confidence-chip--medium { color: #aa6; }
  .confidence-chip--high   { color: #666; }
  ```

These are the ONLY hardcoded color values in the site workspace (verified via grep). AC5 forbids them post-redesign.

### 4.6 — Content-page chrome override (2 files)

**`site/src/styles/content-chrome.css` (163 lines):**

Re-tunes Starlight chrome on content-detail pages (e.g., `/news/[slug]/`):

- Lines 19-27: Sticky header backdrop blur.
- Lines 31-57: Sidebar typography + non-pill active state (AC17) — 2px accent left-bar + accent bg tint.
- Lines 59-69: Sidebar group labels — mono eyebrow treatment.
- Lines 73-115: Right-rail TOC typography + accent left-bar on current item (AC18).
- Lines 118-135: Pagination (prev/next) button styles.
- Lines 138-161: Search affordance in header.

**`site/src/styles/content-prose.css` (283 lines):**

Re-tunes `.sl-markdown-content` prose selectors:

- Lines 18-59: Headings (h1-h6) — display font, type scale, line-height, letter-spacing.
- Lines 62-85: Body copy (p, ul, ol, li).
- Lines 88-106: Links — `--nbg-color-link`, underline offset + thickness.
- Lines 109-122: Blockquotes — left-bar, background, radius.
- Lines 125-134: Inline `<code>` — background, border, padding.
- Lines 137-156: Block `<pre>` — background, border, padding.
- Lines 159-189: Tables — background, borders, hover.
- Lines 192-197: Horizontal rule.
- Lines 200-213: `<kbd>` — mono, small, border.
- Lines 216-242: `<details>` / `<summary>`.
- Lines 245-282: Starlight asides (callouts) — tokenized semantic colors (AC19).

**Integration point:** R6 says these files are re-tuned so body type, links, code blocks, tables, callouts, and TOC match AgentNews body chrome. The coder will update token references (e.g., `--nbg-color-fg-primary`, `--nbg-color-link`, `--nbg-color-bg-surface`) to the new values — but the *structure* of the CSS stays unchanged. This is a token-value swap, not a rewrite.

### 4.7 — Motion infra (3 files)

**`site/src/scripts/motion.ts` (55 lines):**

IntersectionObserver utility for `[data-reveal="true"]` elements. Current state:

- Lines 23-24: Early-return if `prefers-reduced-motion: reduce`.
- Lines 34-46: Observer toggles `.is-revealed` class on intersection.
- Per comment at line 30-33: MotionReveal's CSS keeps content visible unconditionally, so this observer is a no-op (but preserved for future opt-in animation).

**`site/src/styles/motion.css` (75 lines — not read in this scan):**

View-transitions + reduced-motion overrides.

**`site/src/components/primitives/MotionReveal.astro` (53 lines):**

Wrapper that adds `data-reveal="true"`. Scoped `<style>` (lines 36-52):

- Line 47-50: `.nbg-motion-reveal { opacity: 1; transform: none; }` — unconditionally visible (no-op per Issues #5).
- Comment at lines 37-46 explains why: "the previous opacity:0-by-default + IntersectionObserver gate caused entire tip clusters and skill grids to render as blank space when their bounding box exceeded the 50% threshold."

**Integration point:** R7.1 says reactivate MotionReveal only if the AgentNews investigation (R1, AC1) shows scroll-reveal motion at a comparable intensity. If not, it stays a no-op. If yes, update line 47-50 to initial state `opacity: 0; transform: translateY(20px);` and verify the observer re-arms safely (with a final-state guard so content never hides if the observer fails).

### 4.8 — Test surfaces (10 files, 215 tests passing per SCOPE.md)

**Test file breakdown (from Step 2.5):**

| File | Test count | Focus | Integration point |
|------|------------|-------|-------------------|
| `build-output.test.ts` | 8 | Verifies `_data/<type>-index.json` files are emitted post-build | R12.12 — pin indices still emitted |
| `glossary-filter.test.ts` | 2 | Glossary filter interaction | R12.4 — Pagefind search still works |
| `motion-reveal.test.ts` | 1 | MotionReveal observer | R7.1 — update if motion is reactivated |
| `submission.test.ts` | 6 | Skill submission serialization | R12.10 — `/submit-skill/` redirect still works |
| `api-fetch.test.ts` | 1 | Fetch wrapper retry logic | R12.9 — PAT-paste sign-in still works |
| `auth.test.ts` | 1 | PAT validation | R12.9 — sign-in validates token |
| `gist.test.ts` | 1 | Gist CRUD | R12.11 — `/my-pins/` hydrates from gist |
| `pin-store.test.ts` | 1 | Pin localStorage + gist sync | R12.8 — `localStorage.nbgaihub.audience` persists |
| `slug.test.ts` | 1 | Slug normalization | No re-skin impact |
| `build-pin-index.test.ts` | 2 | Pin index generation | R12.12 — indices still emitted |

**Integration point:** R12.2 says `npm test` must report ≥ 215 tests passing, 0 failing. If tests assert old DOM/CSS structure that changes, they are updated to assert equivalent post-redesign behaviour. No tests are deleted.

### 4.9 — Content schemas + collections (`site/src/content.config.ts`, 155 lines)

**Five collections:**

| Collection | Base dir | Schema | Entry count (per SCOPE.md) |
|------------|----------|--------|----------------------------|
| `news` | `../news/published` | 13 keys (base 10 + `editor_confidence`, `source`, `fingerprint`, optional `hero_image`) | 31 |
| `skills` | `../skills` | 17 keys (base 10 + `install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`, optional `requires`) | 9 |
| `tips` | `../tips` | 10 keys (base shape only) | 12 |
| `glossary` | `../glossary` | 10 keys (base shape only) | 15 |
| `journeys` | `../journeys` | 10 keys (base shape only) | 1 |
| `docs` | `src/content/docs` | Starlight docsSchema | 0 (homepage moved to `src/pages/index.astro`) |

**Base shape (lines 44-56):** `type`, `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`.

**Integration point:** The refined spec (A16) says content-collection schemas are unchanged. The coder MUST NOT touch this file. News items render under the new visual chrome, but their frontmatter shape is contract.

### 4.10 — Per-build outputs (`site/public/_data/` — 5 JSON files, build-emitted)

**Current files (verified via `ls`):**

- `glossary-index.json`
- `journey-step-index.json`
- `news-index.json`
- `skill-index.json`
- `tip-index.json`

**Emitted by:** `site/scripts/build-pin-index.ts`, invoked by `npm run build` (chained before `astro build` at `package.json` line 13: `"build": "tsx scripts/build-pin-index.ts && astro check && astro build"`).

**Consumed by:** `/my-pins/` page (hydrates pinned items by joining the user's gist `favourites[]` against these indices).

**Integration point:** R12.12 (AC35) requires these files are still emitted post-redesign. `build-output.test.ts` (8 tests) verifies their presence and schema. The redesign MUST NOT break this pipeline.

### 4.11 — Pagefind / Starlight chrome integration (3 files import from `@astrojs/starlight`)

**Portability gate (AC36, AC37):**

Only these files may import from `@astrojs/starlight`:

1. `site/src/components/MarketingShell.astro` (line 31: `import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro';`)
2. `site/src/components/SocialIconsOverride.astro` (imports `SocialIcons` virtual module)
3. `site/src/components/SplashAwareHeader.astro` (lines 44-48: imports `Search`, `ThemeSelect`, `SiteTitle`, `SocialIcons`, `LanguageSelect` virtual modules)

**Verified:** `grep -rE "from ['\"]@astrojs/starlight" site/src/components/ site/src/styles/` returns only `MarketingShell.astro`. (The scan did NOT check SocialIconsOverride or SplashAwareHeader explicitly, but prior read confirmed they import Starlight.)

**Primitives (16 files under `site/src/components/primitives/`):**

Zero Starlight imports verified. AC37 forbids introducing any.

**Pagefind retint mechanism:**

Pagefind UI is styled via `--sl-color-*` aliases (tokens/aliases.css lines 21-79). Starlight's `Search.astro` already aliases `--sl-color-*` into `--pagefind-ui-*`. By overriding `--sl-color-*`, Pagefind retints automatically. The redesign updates primitives.css → semantic.css → aliases.css, and Pagefind inherits the new palette. No direct `--pagefind-ui-*` code (per R6 note, A11).

### 4.12 — Astro config (`site/astro.config.mjs`, 123 lines)

**Key settings:**

- Line 12: `server: { port: 4321 }` — dev server port (per CLAUDE.md Ports section).
- Line 16: `devToolbar: { enabled: false }` — floating dock disabled.
- Lines 25-64: Astro Fonts API — Inter (body) + JetBrains Mono (mono), emitted as `--nbg-font-body` / `--nbg-font-mono`.
- Lines 74-79: `customCss` — imports tokens/index.css, motion.css, content-prose.css, content-chrome.css (in that order).
- Lines 80-94: `components` — Header override (SplashAwareHeader) + SocialIcons override.
- Lines 95-119: `sidebar` — 11 entries (Home, My Pins, Start Here, News, Skills, Tips, Glossary, Reference, Contribute).

**Integration point:** R8 says if AgentNews uses a different display or body font, the Astro Fonts API config is updated (lines 25-64). R2 says the sidebar structure is unchanged (visual treatment is in scope, structure is not). R11 says if AgentNews is light-default, Starlight's initial-theme is reconfigured (may require a `defaultTheme` prop in the `starlight()` config).

## 5. Notes

### 5.1 — Anomalies

1. **MotionReveal is a no-op.** Issues - Pending Items.md #5 (not read in this scan, but inferred from MotionReveal.astro comment lines 37-46). Content is always visible regardless of viewport position. The component is kept as a stable wrapper for future opt-in animation. R7.1 reactivation is conditional on the AgentNews investigation.

2. **SignInModal duplicate IDs on content-detail pages.** Issues - Pending Items.md #12 (referenced in SplashAwareHeader.astro comment at line 19). Out of scope for this redesign but must not be regressed.

3. **Legacy components with hardcoded colors.** `AudienceBadge` and `ConfidenceChip` are the ONLY components with flat hex colors (`#0a7`, `#e60`, `#08c`, `#aa6`, `#666` in legacy.css lines 120-122, 132-134). AC5 forbids legacy flat colours post-redesign. The migration path is clear: replace with `<Badge tone={audience}>` and `<Badge tone={confidence}>` (both primitives already exist and consume tokenized semantic colours).

4. **Homepage was an MDX page, now an Astro page.** Comment at `site/src/pages/index.astro` lines 8-16 explains why: the MDX version at `src/content/docs/index.mdx` re-emitted a SECOND `<StarlightPage>` inside the first, producing duplicate chrome. Moving it to `src/pages/index.astro` fixed the double-header bug. This is a recent change (2026-05-19 per comment) and is load-bearing — the coder must not revert it.

5. **11 marketing surfaces, not 12 pages.** The page count is 12 (including `/news/[slug].astro`), but only 11 are marketing surfaces. The detail route uses `StarlightPage` directly (content chrome), not `MarketingShell` (splash chrome). R4.4 says the detail route's visual chrome is re-tuned via CSS, not by changing its template.

6. **No tests for marketing-surface DOM structure.** The 215 tests passing (SCOPE.md) cover lib/ modules, build output, glossary filter, motion reveal, submission serialization, auth, gist CRUD, and pin store. None assert the DOM structure of `/news/`, `/skills/`, `/tips/`, etc. The redesign's AC tests (AC6-AC9, AC10-AC14, AC15-AC18, AC24-AC25) will need new Playwright assertions — `build-output.test.ts` is the closest precedent (uses vitest + build-time checks). R12 says tests are updated to assert equivalent post-redesign behaviour, not deleted.

### 5.2 — Risks the re-skin might break

1. **AudienceFilter localStorage persistence.** `legacy.css` line 19: `.audience-hidden { display: none !important; }` is the contract. `AudienceFilter.astro` toggles this class via a `<script>`. If the redesign removes legacy.css or renames the class, the filter breaks. Mitigation: move `.audience-hidden` to a dedicated utilities layer (or keep it verbatim in legacy.css per the comment at lines 17-22).

2. **PinButton gist sync.** `PinButton.astro` depends on `pin-store.ts` which depends on `localStorage.nbgaihub.pins`. If the redesign introduces a new state management pattern or changes the gist schema, pins break. Mitigation: R12 says lib/ modules are contract (A17) — no changes.

3. **Pagefind search indexability.** `MarketingShell.astro` line 64 sets `pagefind: true` on all splash pages. If the redesign changes the page structure such that Pagefind's crawler can't find the content (e.g., wrapping everything in a `[data-pagefind-ignore]` container), search breaks. Mitigation: AC29 gates on Pagefind search opening and returning results for a known query.

4. **Starlight upgrade fragility.** `SplashAwareHeader.astro` (lines 2-40) documents the risk: the override imports from `virtual:starlight/components/*`, which are Starlight's internal virtual modules. A Starlight upgrade that changes those modules' public surface breaks the override. Mitigation: the unified-nav branch of SplashAwareHeader IS the post-Starlight header (per comment at lines 33-37), so an Option-2 escalation (delete Starlight entirely) rewrites THIS file + MarketingShell + aliases.css + SocialIconsOverride. The primitives + lib/ + content collections survive.

5. **Mobile drawer state collision.** `SplashAwareHeader.astro` lines 194-232 implement the mobile drawer toggle via a `<script>`. If the redesign introduces a framework (React, Vue, Svelte) or a different state-management pattern, the vanilla JS drawer script may collide. Mitigation: A4 locks the stack to Astro 6 + Starlight 0.39 + TypeScript (no framework), so this is low-risk unless the re-skin attempts a larger re-platform.

6. **Full-bleed layout on narrow viewports.** R3.4 says mobile (≤ 640px) keeps comfortable inner padding; full-bleed is desktop-only. If the coder applies `width: 100vw` unconditionally, mobile content hits the viewport edges and becomes unreadable. Mitigation: AC8 asserts mobile padding ≥ 16px on each side.

7. **Dark/light toggle state.** Starlight's `ThemeSelect` component manages theme state via a `<select>` + localStorage. `SplashAwareHeader.astro` restyled it to icon-only (lines 517-566) but kept the `<select>` functional (line 545-555: transparent color, but still interactive). If the redesign replaces ThemeSelect with a custom toggle, the localStorage key or the state-sync logic may break. Mitigation: R11.2 says both modes must pass contrast, and AC27 (dark/light toggle still works site-wide) is a gate. Keep ThemeSelect unless investigation shows AgentNews uses a materially different toggle.

8. **Contrast violations post-re-anchoring.** R9.3 requires WCAG AA contrast (4.5:1 normal text, 3:1 large text) in both dark and light modes. If the AgentNews palette has lower contrast than the Linear/Vercel/Stripe baseline, some token rebindings may fail contrast. Mitigation: AC21 runs axe-core or pa11y on 6 surfaces and gates on zero violations. The investigator in Phase 1 should flag any low-contrast pairings in the AgentNews investigation artifact so the token re-anchor phase can adjust.

## 6. Recommendations

### For the investigation phase (R1, AC1)

Capture these visual properties from `github.com/BikS2013/AgentNews`:

1. **Palette** — hex/HSL for deepest background, lightest background, body text, heading text, accent (with hover/active steps), border colors. Note which is darkest (to map onto `--nbg-c-slate-950` or add a new `--nbg-c-graphite-*` ramp if darker).
2. **Typography** — display font, body font, mono font. Check if Inter Variable is still correct or if AgentNews uses Geist, Söhne, Untitled Sans, Mona Sans, or a system stack.
3. **Type scale** — measure the largest display headline (desktop) and the body copy size. Map onto `--nbg-fs-display-lg` (64px floor per AC5) and `--nbg-fs-md` (16px).
4. **Line-height** — display ≤ 1.15, body ≥ 1.5 (R8.4 floor).
5. **Spacing rhythm** — section vertical rhythm at desktop, card padding, gap between cards in the news grid/list. Map onto `--nbg-sp-*` tokens.
6. **Layout chrome** — nav-bar height (current is 32px line + padding), content max-width vs full-bleed, section gutters at mobile vs desktop.
7. **News card pattern** — does AgentNews use image-led cards? If yes and the news schema has no `hero_image` field, the cards either (a) use a token-driven gradient/typographic block in place of the image (R4.5 trade-off), or (b) the request is escalated. Do NOT silently introduce a fallback image (global rule).
8. **Motion** — presence/absence of scroll-reveal, hover micro-interactions, view-transitions. If AgentNews uses scroll-reveal, capture durations and easings so R7.1 can reactivate MotionReveal safely.
9. **Dark/light handling** — which is default? If light-default, R11.1 reconfigures Starlight's initial-theme. If AgentNews supports only one mode, the other is kept *functional* in this hub but visually deprioritised; document the trade-off in §S.13.

### For the token re-anchor phase (R2, AC2-AC5)

1. **Token names survive; values change** (R2.5). Do NOT rename `--nbg-c-slate-*` to `--nbg-c-graphite-*` unless the AgentNews neutral is materially different AND the investigation shows both are needed. If only one neutral ramp is needed, re-anchor slate's values in-place.
2. **Semantic rebinding in lockstep.** When primitives.css changes, semantic.css MUST be updated in the same commit so components keep compiling. For example, if `--nbg-c-violet-400` → `hsl(265 88% 68%)` becomes `hsl(220 88% 68%)`, then `--nbg-color-accent: var(--nbg-c-violet-400)` still resolves, but the rendered accent shifts from violet to blue.
3. **Aliases stay downstream.** aliases.css (Tier 3) aliases `--sl-color-*` onto `--nbg-*` tokens. When semantic.css rebinds, aliases.css inherits the new values automatically. Do NOT touch aliases.css unless the AgentNews investigation shows a Starlight chrome element needs a *different* semantic token than the current mapping.
4. **Token count floor ≥ 60** (AC2). The current primitives.css has ~135 tokens. The redesign can ADD tokens (e.g., a new accent ramp) but MUST NOT drop below 60 total declarations.
5. **No legacy flat colours** (AC5). After R2 completes, `grep -rE "#0a7|#e60|#08c|#aa6|#666" site/src/` MUST return zero matches. Migrate AudienceBadge + ConfidenceChip to `<Badge tone={audience}>` and `<Badge tone={confidence}>` before committing the token re-anchor.

### For the full-bleed layout phase (R3, AC6-AC9)

1. **Container.astro `width="full"` must be true edge-to-edge** (AC6, AC7). Test: open `localhost:4321/`, `localhost:4321/news/`, `localhost:4321/skills/` in Playwright at 1440px viewport, assert `document.querySelector('[data-marketing]').getBoundingClientRect().width === window.innerWidth` (allowing ±2px).
2. **Desktop breakpoint is ≥ 1025px** (R10.3). The current `--nbg-bp-md: 64rem` (1024px) is the gate. Full-bleed layouts activate at `@media (min-width: 64rem)`.
3. **Mobile padding ≥ 16px, ≤ 24px** (AC8). The current `SplashAwareHeader.astro` line 336 sets `padding-inline: var(--nbg-sp-4)` (1rem = 16px). If AgentNews uses 24px, re-anchor `--nbg-sp-6` (1.5rem) as the mobile horizontal padding token.

### For the news surface replacement (R4, AC10-AC14)

1. **In-place rewrite** (A2). The route `/news/` stays; `site/src/pages/news/index.astro` is rewritten. No redirect, no new route.
2. **Layout shape from investigation** (AC10). The coder cannot proceed with R4 until the investigation artifact (R1, AC1) documents the AgentNews news card pattern — tile grid, stacked feed, magazine-style hero + feed, etc.
3. **Functional contracts preserved** (R4.3). `AudienceFilter` still toggles `.audience-hidden` on `[data-audience]` items. `ConfidenceChip` (or migrated `<Badge>`) still surfaces `editor_confidence`. `PinButton` on each card still pins to the user's gist.
4. **No image fallbacks** (R4.5). If AgentNews uses image-led cards and the news schema has no `hero_image` field, the cards use token-driven gradient/typographic blocks in place of the image. The trade-off is documented in §S.13. Do NOT silently introduce a fallback image (global rule).

### For the test-builder phase (R12, AC26-AC35)

1. **Update tests, do not delete** (R12.2). If a test asserts old DOM structure (e.g., `.news-card-grid` class name) and the redesign replaces it with a new layout, update the test to assert the equivalent post-redesign structure (e.g., `.news-feed` class, or a CSS Grid with N columns).
2. **New Playwright tests for visual AC** (AC6-AC9, AC10-AC14, AC15-AC18, AC24-AC25). The existing 215 tests are vitest-based and cover lib/ modules + build output. The visual AC require browser-based assertions (`getBoundingClientRect()`, computed styles, screenshots). `build-output.test.ts` is the closest precedent but it does NOT use Playwright. The coder must either (a) add Playwright as a dev dependency and create new test files under `site/tests/e2e/`, or (b) run the visual AC manually and document the evidence in `integration-verification-agentnews-aesthetic.md` with screenshot paths.
3. **AC21 (axe-core or pa11y) is a hard gate.** The report at `docs/reference/integration-verification-agentnews-aesthetic.md` must include the audit log (JSON or text) for home, /skills, /news, /my-pins, /submit-skill, and one news detail page, in both dark and light modes. Zero violations or the redesign does NOT merge.

### For the portability hedge (R13, AC36-AC37)

1. **Primitives MUST import zero Starlight** (AC37). If a new primitive is added (e.g., `Hero.astro` for a reusable hero pattern), it MUST consume only `--nbg-*` tokens and import nothing from `@astrojs/starlight/*`.
2. **New Starlight surface overrides require allow-list documentation** (R13.3). If the re-skin requires overriding another Starlight component (e.g., `Footer.astro`), the coder must (a) add it to the allow-list in §S.13, (b) document the override rationale, (c) verify the override composes Starlight virtual modules (like SplashAwareHeader does) rather than copying Starlight internals.
3. **Event contracts preserved** (R13.4). `SplashAwareHeader.astro` + `AuthControls.astro` emit custom events (`nbgaihub:open-signin-modal`, `data-nbg-signin-*` attributes). If the re-skin changes these, update the event listeners in `SignInModal.astro` and document the breaking change.
