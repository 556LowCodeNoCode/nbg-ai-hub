---
language: TypeScript
framework: Astro
package_manager: npm
build_command: npm run build
test_command: npm test
lint_command: null
entry_points:
  - site/src/pages/index.astro
  - site/src/pages/start-here/foundations.astro
  - site/src/pages/start-here/day-1.astro
  - site/src/pages/skills.astro
  - site/src/pages/tips.astro
  - site/src/pages/glossary.astro
  - site/src/pages/my-pins.astro
last_scanned_commit: 235aa5160e05a7ed37224f3b3d580af2e70c4a99
scanned_for_request: uat-analysis-colleagues-2026-05-26.md
scanned_at: 2026-05-26T19:45:00Z
---

# Codebase Scan — NbgAiHub (UAT Analysis 2026-05-26)

## 1. Project Overview

Astro 6.3.5 + Starlight 0.39.2 static site for a Claude Code knowledge hub at NBG. TypeScript monorepo with three workspaces: `site/` (Astro frontend), `pipeline/` (RSS triage), `plugin/` (Claude Code hub commands). This scan is narrowed to the surfaces validated by the UAT analysis from five bank colleagues — homepage, Foundations page, Day 1 journey, Skills/Tips listings, Glossary + tooltips, My Pins personalization, and the underlying design system.

Build: `site/package.json` scripts run `tsx scripts/build-pin-index.ts` → `astro check` → `astro build` → `node scripts/rewrite-base-paths.mjs`. Dev server pinned to port 4321. Deployed to GitHub Pages at `https://chomovazuzana.github.io/NbgAiHub/` with base path `/NbgAiHub` injected via `PUBLIC_BASE` env var.

## 2. Module Map

### Top-level source layout

```
site/src/
├── pages/              → 7 .astro pages (index, foundations, day-1, skills, tips, glossary, my-pins)
├── components/         → 33 .astro components (12 page-level + 16 primitives + 5 overrides)
├── plugins/            → 1 remark plugin (remark-glossary-link.ts — build-time auto-linker)
├── styles/             → 5 token CSS files + 4 surface CSS files
│   └── tokens/         → primitives.css (299L), semantic.css (278L), aliases.css (91L), layers.css (19L), legacy.css (167L)
├── lib/                → 8 TS modules (auth, gist, api-fetch, glossary-link-string, news, slug, skill-types, pin-store)
├── content/            → 5 Astro collections (glossary 36 entries, tips 14, skills 6, journeys 2, news published 54)
└── scripts/            → build-pin-index.ts (pre-build step), rewrite-base-paths.mjs (postbuild base-prefix)
```

**Key directories per UAT theme:**

1. **Homepage hero + router cards** → `site/src/pages/index.astro` (500L, two-door traffic router — Newcomer vs Experienced)
2. **Foundations long-scroll** → `site/src/pages/start-here/foundations.astro` (100L split + resource-list render)
3. **Day 1 journey** → `journeys/day-1.md` (markdown source, 98L) + `site/src/pages/start-here/day-1.astro` (renderer)
4. **Skills/Tips listings** → `site/src/pages/skills.astro` + `tips.astro` (single-column grouped rows), shared `site/src/styles/listing-rows.css`
5. **Glossary tooltips** → `site/src/plugins/remark-glossary-link.ts` (build-time auto-linker, 465L) + `site/src/components/primitives/GlossaryTerm.astro` (runtime registry + popover wiring, ≤270L)
6. **My Pins** → `site/src/pages/my-pins.astro` (anonymous panel + signed-in grid), `site/src/lib/auth.ts` + `gist.ts`
7. **Design tokens** → `site/src/styles/tokens/` (5 files, 874L total: primitives → semantic → aliases → layers cascade)
8. **Sign-in modal** → `site/src/components/SignInModal.astro` (2-step PAT-paste flow, redesigned 2026-05-25)
9. **Header** → `site/src/components/SplashAwareHeader.astro` (unified nav on splash pages, default Starlight chrome on content-detail)

## 3. Conventions

Sample files: `site/src/pages/index.astro` (homepage), `site/src/plugins/remark-glossary-link.ts` (remark plugin), `site/src/pages/my-pins.astro` (personalization)

- **Import style:** named imports dominant (`import { getCollection } from 'astro:content'`), Astro components use default exports. Plugins use named exports for the factory + helper functions. No namespace imports (`import * as X`) observed.
- **Error handling:** explicit throws for missing config (per global rule: no silent fallbacks). Example: `remark-glossary-link.ts:88-92` throws if `options.glossaryDir` is absent; `GlossaryTerm.astro:56-59` throws if glossary collection is empty. No try/catch wrappers on build-time code — Astro's top-level error boundary handles.
- **Config loading:** env vars via `import.meta.env.BASE_URL` (`SplashAwareHeader.astro:89`), `process.env.PUBLIC_BASE` (`astro.config.mjs:22`). No `.env` file in repo. GitHub Actions secrets passed as workflow env vars (see `.github/workflows/deploy-pages.yml`).
- **Logging:** `console.warn` for non-fatal issues (glossary-plugin stale slug, GlossaryTerm manifest parse failure). No structured logging lib. Build-time errors throw and halt.
- **Code style:** TypeScript strict mode (`site/tsconfig.json`), trailing commas enforced, semicolons present, camelCase variables, PascalCase components. Data attributes prefixed `data-nbg-*` (project namespace). CSS classes prefixed `.nbg-*` or follow AgentNews convention (`.hero`, `.section`, `.wrap`, `.card`).

**AgentNews aesthetic anchor (2026-05-24 retune):** surfaces use `.hero`, `.section`, `.wrap`, `.grid-3`, `.card`, `.feature` class API from `site/src/styles/agentnews-layout.css` (560L). Tokens: 14-color palette (slate + teal accent), IBM Plex Sans/Mono + Newsreader serif. Light theme default. See `docs/design/plan-005-agentnews-aesthetic.md`.

## 4. Integration Points

### 4.1 Homepage / Landing (UAT Theme 1)

**Files:**
- `site/src/pages/index.astro` — two-door traffic router (Newcomer card → Foundations + Day 1; Experienced card → 4-pill row Skills/Tips/Glossary/News)
- `site/src/components/MarketingShell.astro` — wrapper injecting GlossaryTerm registry + primitives on splash pages
- `site/src/styles/agentnews-layout.css` — `.hero hero--router` class API

**Integration concern (Maria/Dimitris: "overwhelms a beginner"):**
- Hero title line 62-64: `What I wish I knew sooner about <em>Claude Code</em>`
- `hero__what` callout line 69-75: "New here? Claude Code is a terminal-based AI assistant…" — full-width intro panel explaining what Claude Code is
- Router grid line 78-133: 2-column cards. Newcomer card carries compass icon, teal halo, "Start with Foundations" + "Day 1 setup" buttons. Experienced card is muted, 4-pill row.
- Below-the-fold Skills + Tips feeds line 137-193 each show top 6 entries as grid-3 cards

**Render path:** `index.astro` → `<MarketingShell>` (width='full', hero='none') → raw AgentNews HTML classes. No Container/Section primitives — fully custom markup.

**Related issues:**
- Issue #20 (Starlight unlayered CSS) — affects search trigger + h3 sizing on deploy. Fixed via `!important` on specific properties in `content-prose.css` + `SplashAwareHeader.astro`.

### 4.2 Foundations Page (UAT Theme 2)

**Files:**
- `site/src/pages/start-here/foundations.astro` (renderer, 100L split)
- `journeys/foundations.md` (markdown source, segmented on `## Step N — Title`)
- `site/src/plugins/remark-glossary-link.ts` — passed explicitly into `createMarkdownProcessor()` line 81-89 because manual processor bypasses Astro's project-level `markdown.remarkPlugins`

**Integration concern (Natasa: "long scroll, no progressive disclosure"):**
- Split-steps function line 42-66: segments markdown body on `## Step N — Title` headings into separate `ParsedStep[]`
- Each step rendered separately via `processor.render(step.bodyMd)` line 90-95 → yields one HTML block per step
- Curated resources list at line 98 onward: hand-picked YouTube/article links matched to step numbers, rendered after each step body
- Reader-mode: page uses `<MarketingShell mode="reader">` which emits CSS rules in `agentnews-layout.css` to drop per-section borders, single mono eyebrow per step, single serif step-title weight

**Glossary auto-linking:** 33 buttons in `foundations/index.html` per build-output test. First-occurrence-per-step (Issue #16 — not strict per-page because each step is a separate processor call, but deemed acceptable per "reader lands on a specific step out of context" rationale).

### 4.3 Day 1 Page (UAT Theme 3)

**Files:**
- `journeys/day-1.md` — markdown source, 5 steps (was 6 in old version — marketplace step removed per commit 571620d)
- `site/src/pages/start-here/day-1.astro` — same segment-splitting pattern as foundations.astro

**Integration concerns:**
1. **Maria: "Step 2 says clone a repo before Step 5 introduces GitHub"** → line 30-38 of `day-1.md`: Step 2 opens with "cd into a real project folder (one of the team's repos — clone one if you don't have one yet)". Step 5 line 72-98 is titled "Get a GitHub account" and explains what GitHub is. Sequencing mismatch confirmed.
2. **Maria: `--dangerously-skip-permissions` framing** → line 33-37: "Yes, the flag name is alarming. It just means 'don't ask permission for every single read or shell command' — you'll still review every code change before Claude applies it." Explanation is present but Maria flagged the name still scares people.
3. **Dimitris: Mac vs Windows imbalance** → Step 1 line 20-24: macOS gets 4 terminal options + "default Terminal.app is also OK"; Windows gets "use WSL. PowerShell works in a pinch but WSL is what the team uses." Windows phrasing reads as second-class.
4. **Dimitris: bash `cd` used without explanation** → Step 2 line 31: "`cd` into a real project folder" — assumes the reader knows what `cd` means.

**Glossary auto-linking:** 10 buttons in `day-1/index.html` per build-output test.

**GitHub account explanation (Step 5):** line 76-86 explains what GitHub is, why the team uses it (shared filing cabinet, review surface, collective memory), and how Claude Code reads from it. Framing is beginner-friendly ("Don't be intimidated. Signing up takes five minutes.").

### 4.4 Skills Listing + Tips Listing (UAT Theme 4)

**Files:**
- `site/src/pages/skills.astro` — single-column grouped by `origin` (Internal / Community), shared `.listing-row` CSS
- `site/src/pages/tips.astro` — single-column grouped by `topics` cluster (Prompting / Survival keys / Context discipline / Compliance)
- `site/src/styles/listing-rows.css` — shared row styles (extracted 2026-05-26 after discovering Astro's `<style is:global>` doesn't reach sibling pages)
- `site/src/components/AudienceFilter.astro` — single-select segmented control (Everything / For beginners / For experienced). Redesigned 2026-05-25 from 3-checkbox to 3-radio.
- `site/src/components/PinButton.astro` — hover-revealed pin icon top-right on each row (opacity:0 at rest, opacity:1 on `.listing-row:hover`)

**Integration concerns:**
1. **Mina: "wants categorical filters beyond audience"** — current filter is single-select audience only (line 28-43 `AudienceFilter.astro`). No filters for `topics`, `origin`, `skill_id`, or any other frontmatter dimension.
2. **Mina: "grid view"** — both pages are single-column `.listing-row` flows. No grid option present.
3. **Natasa: "section leads / where next after tips"** — Tips page line 98-128 renders cluster headers with eyebrow + label + blurb (e.g. "T1 / 4 — Prompting — How to ask — phrasing, structure, what to include."). No "Where next" CTA block at the bottom of either page.

**Audience filter storage:** line 132-152 of `AudienceFilter.astro` — `readSelection()` hardcoded to return `'all'`, `writeSelection()` is a no-op. Filter state is per-visit, not persisted. Legacy localStorage entry cleared on first run. Per operator: "everything to be default on skills and tips."

**PinButton hover-reveal:** `listing-rows.css` lines apply `opacity: 0` at rest, `opacity: 1` on `.listing-row:hover`. Clicking while signed-out dispatches `nbgaihub:open-signin-modal` → redesigned SignInModal opens (2026-05-25 UAT fix). `iconOnly` prop added to PinButton so listing rows can hide the button when signed-out instead of showing a per-card "Sign in to pin" nag (UAT rule: no text nag, just a quiet icon under the cursor).

### 4.5 Glossary + Tooltips (UAT Theme 5)

**Files:**
- `site/src/plugins/remark-glossary-link.ts` — build-time plugin walks markdown AST, wraps first occurrence per slug per file with `<button data-glossary-slug="…">`
- `site/src/components/primitives/GlossaryTerm.astro` — runtime registry injects JSON manifest + wiring script that creates `<span popover="auto">` sibling for each button, attaches hover (80ms debounce) + focus + click handlers
- `site/src/pages/glossary.astro` — catalog page, manually calls `createMarkdownProcessor()` per entry to apply auto-linking (fixed Issue #17 same session it surfaced)
- `site/src/lib/glossary-link-string.ts` — JSX-string helper, shares `getGlossaryIndex()` so plain-text card summaries get auto-linked too

**Integration concerns:**
1. **Natasa + Maria: "tooltip chaos / endless explainer chains"** → nested tooltips are wired recursively. Each `tldr` is pre-linked at build time via `linkGlossaryTerms(entry.data.tldr)` line 72 of `GlossaryTerm.astro`. The popover wiring script line 99 finds `[data-glossary-slug]:not([data-nbg-glossary-wired])` inside each popover's HTML and calls `wire(pop)` on first `.showPopover()` (lazy nested hydration). **Potential explosion:** if glossary entry A's tldr mentions term B, and B's tldr mentions term C, and C's tldr mentions A, the recursive wiring generates hundreds of popovers + scroll listeners — the "800 tooltips opening" complaint surfaces here.

**Skip rules (plugin line 100-150 range):** fenced code, inline code, headings h1-h6, existing links, Starlight asides (`:::tip` / `:::note` / `:::caution` / `:::danger`), the term's own glossary page (`currentSlug` derived from `file.path`), and any file path matching `excludePaths` (defaults to `['/news/published/']`).

**Word-boundary matching:** plugin uses explicit non-alphanumeric lookarounds (`(?<![a-zA-Z0-9-])` / `(?![a-zA-Z0-9-])`) instead of `\b` to handle hyphenated terms correctly (e.g. "pull-request" doesn't match inside "pull-requests-are").

**GlossaryTerm popover surface (line 143-180 of primitive):** `<span popover="auto" role="tooltip" class="nbg-glossary-popover">` contains `<strong>` title, `<span>` tldr (pre-linked HTML via `set:html`), and `<a>` "Read more →" deep-link to `/glossary/#<slug>`. Uses only `--nbg-*` semantic tokens (AC36/AC37 portability gate — zero `@astrojs/starlight` imports).

**Glossary page catalog:** 74 buttons on `/glossary/` per build-output test. Self-skip verified (e.g. `agent` entry links `model`/`claude-code`/`context-window`/`prompt`/`token` but not "agent").

**Schema extension (2026-05-25):** `tldr: z.string().min(1).max(160)` required plain text, `aliases: z.array(z.string()).default([])` optional. All 36 glossary entries backfilled. Locked alias contract includes `pull-request` → `["PR", "PRs", "pull request"]`, `repository` → `["repo", "repos"]`, `claude-code` → `["Claude Code"]` (hyphenated slug, spaced phrase).

**Project-wide beginner-friendly tldr rewrite (2026-05-25 evening):** all 36 entries rewritten in plainer language. Jargon-as-explanation swapped for everyday analogies and concrete examples. Voice rule: tldrs explain *to* beginners, not *between* experts.

### 4.6 News Surface (UAT Theme 6)

**Files:**
- `site/astro.config.mjs` line 36-38: `redirects: { '/news/': 'https://biks2013.github.io/AgentNews/' }`
- `site/src/components/SplashAwareHeader.astro` line 73: `{ label: 'News ↗', href: 'https://biks2013.github.io/AgentNews/', external: true }`

**Integration concern (Natasa: "the About page is the same as the landing page"):**
- News is no longer a local page — hard-redirected to external AgentNews site per 2026-05-25 nav rework
- `site/src/pages/news/` directory deleted
- `news/published/` data still accumulates in repo (RSS pipeline still runs daily, 7-day retention prunes old items) but no UI surface on this site reads it
- Hub plugin's `/hub-news` still consumes `news/published/` via the bundled `plugin/snapshot/` mirror

**Redirect mechanics:** Astro emits a meta-refresh + JS fallback HTML page at `/news/` in the static build. User clicking "News ↗" in nav or sidebar routes to `https://biks2013.github.io/AgentNews/` (colleague-curated feed).

### 4.7 My Pins (UAT Theme 7)

**Files:**
- `site/src/pages/my-pins.astro` — SSR two static panels (anonymous + signed-in skeleton) + client-side hydration
- `site/src/components/SignInModal.astro` — 2-step PAT-paste flow, redesigned 2026-05-25 late-night
- `site/src/components/PinButton.astro` — per-row pin toggle, dispatches `nbgaihub:open-signin-modal` when signed-out
- `site/src/lib/auth.ts` — `signIn(token)` validates PAT via `GET /user`, stores in localStorage, dispatches `nbgaihub:auth-changed`
- `site/src/lib/gist.ts` — unlisted-gist CRUD (`loadFavourites()`, `saveFavourites()`, `addFavourite()`, `removeFavourite()`)
- `site/scripts/build-pin-index.ts` — pre-build step emits `public/_data/<type>-index.json` (5 files, one per content type)

**Integration concerns:**
1. **Natasa: "my pins don't work"** — no known broken case documented. Issue #12 tracks duplicate SignInModal render on content-detail pages (desktop header + mobile drawer footer both mount `<SignInModal />`), but the wired dialog still functions (only the first instance is wired, dialog top-layer renders above everything).
2. **Mina: feedback on sign-in flow** — modal redesigned 2026-05-25 late-night per UAT image #17/#18. Centered via explicit `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0` (line 23 overrides in SignInModal styles). Title rewritten as serif italic match of homepage hero: "Pin what you want to come *back to*." Two-step layout with bordered step cards + teal numbered chips (`01`/`02`). Primary CTA simplified to "Sign in" (was "Validate & sign in").

**Anonymous panel redesign (2026-05-26 morning):** 2-column grid (LEFT = eyebrow + serif heading + lede + primary teal CTA + "No GitHub account?" footnote; RIGHT = "First time? Here's what's going on" aside with 4 FAQ mini-cards numbered `01`-`04`). Vertical hairline divider between columns. Collapses to single column under 880px. Old big-bordered-card explainer dropped.

**Signed-in panel:** client script line 150+ reads `getAuthToken()` from localStorage, calls `loadFavourites()` from gist, joins against each `<type>-index.json` via `fetch('/_data/<type>-index.json')`, renders one grid per type. Stale references (gist contains a slug no longer in the index) render as dimmed "no longer available — unpin" rows.

**Gist contract:** unlisted gist named `nbgaihub-favorites.json`, structure `{ favourites: Array<{ type, id }> }`. See `docs/reference/gist-contract.md`.

**PAT-paste UX (Issue #11):** `/submit-skill/` slug-collision pre-check returned false-"free" against private repo because the unauthenticated `GET https://api.github.com/repos/chomovazuzana/NbgAiHub/contents/skills/<slug>.md` always 404s. Submit-skill page removed 2026-05-25 late-night UAT, but the issue doc remains as a reminder that anonymous GH API calls don't work against private repos.

### 4.8 Design Tokens / Cascade (UAT Theme 8)

**Files:**
- `site/src/styles/tokens/primitives.css` (299L) — 135 primitive tokens (`--nbg-c-*`, `--nbg-sp-*`, `--nbg-r-*`, `--nbg-fs-*`, `--nbg-fw-*`, `--nbg-ff-*`, `--nbg-dur-*`, `--nbg-ease-*`)
- `site/src/styles/tokens/semantic.css` (278L) — 38 semantic tokens × 2 themes (`--nbg-bg`, `--nbg-surface`, `--nbg-ink`, `--nbg-muted`, `--nbg-accent`, `--nbg-border`, `--nbg-sh-*`, `--nbg-color-*`)
- `site/src/styles/tokens/aliases.css` (91L) — 16 `--sl-color-*` aliases × 2 themes mapping NBG tokens into Starlight chrome (so Starlight inherits the AgentNews aesthetic)
- `site/src/styles/tokens/layers.css` (19L) — 8-layer cascade (`@layer nbg.reset, nbg.tokens, nbg.primitives, nbg.components, nbg.utilities, starlight.theme, starlight.components, starlight.utilities`)
- `site/src/styles/tokens/legacy.css` (167L) — absorbed `custom.css` from earlier design passes

**Integration concerns:**
1. **Issue #20 (Starlight unlayered CSS)** — discovered 2026-05-26 during deploy. Starlight CSS ships without `@layer` wrappers, so its rules are unlayered and beat `@layer nbg.components` in production CSS load order per spec (unlayered beats layered). Vite dev CSS load order happened to put NBG rules later, so local won the tiebreak. Production reverses order → Starlight wins. **Symptoms:** search trigger 40px/16px instead of 32px/13px; my-pins h3 at 29px instead of 22px; `⌘K` hint reappearing. **Fix:** `!important` on specific properties (font-size, height, padding, border) in `content-prose.css` h1..h6 + fully-global `:global(...)` selectors in `SplashAwareHeader.astro` search-trigger overrides. **Forward fix path:** wrap Starlight's CSS imports in `@layer starlight.X { @import ... }` via Vite plugin or PostCSS step.
2. **Issue #19 (focus-ring violet leftover)** — `--nbg-sh-focus-ring` in `primitives.css:243-244` still hard-coded to `var(--nbg-c-violet-500)` left over from pre-AgentNews palette. Semantic overrides in `semantic.css` win in production (`0 0 0 2px var(--nbg-bg), 0 0 0 4px var(--nbg-accent)`), so production is teal everywhere. **Leftover:** the primitive is a footgun — if anyone resets `--nbg-sh-focus-ring` they'll get violet back. Cleanup is a one-line edit.

**Cascade order:** `index.css` imports in order: `layers.css` (declares layer stack) → `primitives.css` → `semantic.css` → `aliases.css` → `legacy.css`. Astro's `customCss` in `astro.config.mjs:133` injects `tokens/index.css` first, then `motion.css`, `content-prose.css`, `content-chrome.css`.

**AgentNews token set (2026-05-24 retune):** 14-token palette (slate + teal accent), IBM Plex Sans/Mono + Newsreader serif, light theme default. Flat semantic set (`--nbg-bg`, `--nbg-surface`, `--nbg-surface-2`, `--nbg-bg-2`, `--nbg-border`, `--nbg-ink`, `--nbg-muted`, `--nbg-accent`, `--nbg-accent-soft`, `--nbg-r-md`, `--nbg-r-lg`). No nested `color-mix()` expressions in the current palette (those were dropped in the pre-AgentNews simplification).

### 4.9 Content Vocabulary (UAT Theme 9)

**Dimitris: "GitHub/Docker/Postgres unexplained"; Maria: "bash `cd` used without explanation"**

**Glossary coverage (36 entries):**
- GitHub-related: `github`, `repository`, `pull-request`, `commit`, `branch`, `gh` (CLI), `hook`, `frontmatter`, `yaml`, `markdown`
- AI/LLM basics: `agent`, `model`, `prompt`, `token`, `context-window`, `large-language-model`, `api`, `http`
- Claude Code specifics: `claude-code`, `claudemd`, `skill`, `plugin`, `slash-command`, `mcp`, `cli`
- Authoring formats: `rss`, `markdown`, `yaml`, `frontmatter`

**NOT in glossary:** Docker, Postgres, bash, `cd`, terminal, shell, WSL, command-line, `ghp_*` (PAT token format).

**Where tech terms are introduced without glossary links:**
1. `journeys/day-1.md` line 20-24: "cmux, Ghostty, iTerm2, Warp" (macOS terminals), "WSL (Windows Subsystem for Linux)" — WSL abbreviation expanded, no further explanation.
2. `journeys/day-1.md` line 31: "`cd` into a real project folder" — assumes reader knows what `cd` means.
3. `journeys/day-1.md` line 33: "`claude --dangerously-skip-permissions`" — flag name explained, bash invocation not.
4. `journeys/foundations.md` (not read in this scan, but Dimitris cited it): Docker/Postgres likely mentioned in Step 4-6 without explanation.

**Glossary auto-linking active on:** homepage card summaries (via `linkGlossaryTerms()` in `glossary-link-string.ts`), Foundations page (33 buttons), Day 1 page (10 buttons), Skills/Tips ledes (inline in the `hero__lede` paragraph).

**Glossary NOT active on:** News (excluded per `excludePaths: ['/news/published/']`), but News surface is now a redirect so moot.

### 4.10 NBG Logo Flicker (UAT Theme 10)

**Maria: "logo flashes/disappears on home-tab clicks"**

**Files:**
- `site/src/components/SplashAwareHeader.astro` line 100-116 — brand link + two `<img>` tags (light + dark wordmarks)
- Deploy session commit `954b5dd` made the brand `<a href>` and logo `<img src>` base-aware via `import.meta.env.BASE_URL`

**Current state:**
```astro
const base = import.meta.env.BASE_URL;

<a class="nbg-topnav__brand" href={base} aria-label="NBG AI Hub home">
  <img
    class="nbg-topnav__logo nbg-topnav__logo--light"
    src={`${base}brand/nbg-wordmark-blue.png`}
    alt=""
    width="1338"
    height="302"
    decoding="async"
  />
  <img
    class="nbg-topnav__logo nbg-topnav__logo--dark"
    src={`${base}brand/nbg-wordmark-white.png`}
    alt=""
    width="1338"
    height="302"
    decoding="async"
  />
  <span class="nbg-topnav__brand-text">NBG AI Hub</span>
</a>
```

**Theme-aware visibility:** CSS rules (in `SplashAwareHeader.astro` scoped styles, line 200+ range) toggle `.nbg-topnav__logo--light` vs `--dark` via `html[data-theme="light"]` / `html[data-theme="dark"]` selectors. Theme flips on user toggle → CSS swap → one logo fades out, other fades in.

**Potential flicker cause:** if `html[data-theme]` attribute is unset at initial render (Starlight's `ThemeProvider.astro` sets it on `DOMContentLoaded`), both logos might render briefly before the theme script runs. Or if Astro view-transitions fire while the theme is mid-swap, the logo state could stutter.

**No explicit issue tracking this** — Maria's feedback is the first mention. Not in `Issues - Pending Items.md`.

## 5. Notes

1. **Starlight unlayered-cascade gotcha is the #1 local-vs-deploy visual-drift cause** (Issue #20). Any new mismatch between `localhost:4321` and the live Pages deploy should be diagnosed with Chrome DevTools Protocol `CSS.getMatchedStylesForNode` and fixed with `!important` on the property that needs to win. Forward improvement: wrap Starlight's CSS in `@layer starlight.X` via PostCSS.

2. **Glossary tooltip recursive-wiring is a potential performance trap.** Pre-linking every `tldr` enables "hover inside hover" (API tooltip pops when you hover "APIs" inside the agent tooltip), but if three terms cross-reference each other, the lazy nested `wire(pop)` call can generate hundreds of popovers. No explicit throttle or depth limit in the current wiring script (line 99-180 of `GlossaryTerm.astro`). The "800 tooltips opening" UAT complaint likely surfaces here.

3. **My Pins has no known broken case documented,** but Natasa reported "pins don't work" in the UAT. Issue #12 tracks duplicate SignInModal render on content-detail pages (the wired dialog still functions, but the duplicate is invalid HTML). No evidence in the code that pin *data* (gist CRUD, localStorage PAT, index join) is broken. The UX confusion might be sign-in flow friction (modal wording, PAT creation steps) rather than technical breakage.

4. **News surface is now a redirect, but the RSS pipeline still runs daily.** `news/published/` accumulates 54 items (7-day retention prunes old), but no UI on the site reads them. The hub plugin's `/hub-news` is the only consumer. The operator accepted steady-state Azure OpenAI token cost for the invisible feed. If the UAT analysis surfaces "the News link takes me away from the site," that's by design per 2026-05-25 nav rework.

5. **AudienceFilter no longer persists across pages** (2026-05-26 morning change). Every visit to `/skills` or `/tips` starts fresh at "Everything", regardless of what was selected on a previous visit. Per operator: "everything to be default on skills and tips." Legacy localStorage entry cleared on first run.

6. **Glossary beginner-friendly rewrite (2026-05-25 evening) is the most recent content pass.** All 36 tldrs rewritten in plainer language. Jargon-as-explanation swapped for everyday analogies. Voice rule: tldrs explain *to* beginners, not *between* experts. This pass is post-UAT-feedback-capture (UAT doc dated 2026-05-26, glossary rewrite dated evening 2026-05-25), so the colleagues saw the old jargon-heavy tldrs. The rewrite might address some of their "tooltip chaos" concerns.

7. **Day 1 journey Step 5 (GitHub account) is the longest step** (26 lines vs 5-10 for other steps). Explains what GitHub is, why the team uses it, and how to sign up. The operator invested in this explanation per the "non-technical bank colleagues" audience — this is the step that addresses Dimitris's "GitHub unexplained" concern, but it comes *after* Step 2 already told the user to "clone one of the team's repos."

8. **Missing test coverage for the UAT-flagged surfaces.** Site test suite is 310/310 passing (per SCOPE.md 2026-05-26 update), but the count doesn't break down which surfaces are covered. The `site/tests/` directory wasn't scanned in this pass (request-driven narrowing focused on source files). If the Phase 3a investigator needs to know which components *don't* have tests, a follow-up scan of `site/tests/` against the 33 components would surface the gaps.

