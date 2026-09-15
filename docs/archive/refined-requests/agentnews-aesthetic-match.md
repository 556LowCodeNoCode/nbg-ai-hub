# Refined Request: AgentNews Aesthetic Match — Site-Wide Visual Realignment + News Surface Replacement

## Category
Development (front-end re-skin + content-surface replacement on top of an already-shipped design system)

## Objective
Re-align the NBG AI Hub's site-wide aesthetic to visually match `github.com/BikS2013/AgentNews` — a full-bleed, sleek, screen-filling editorial feel — and replace the current `/news/` index with a new AgentNews-styled news surface that lives inside the hub. The redesign starts from the already-committed Linear/Vercel/Stripe baseline (commit `36b8758`) and adapts the existing three-tier token system, primitives, MarketingShell, and content-page chrome override to the AgentNews visual language. Functional contracts (auth, pins, submit-skill, audience filter, Pagefind, sidebar, dark/light theming) are preserved; only the visual layer is re-anchored.

## Scope

### In scope
- **Aesthetic re-anchor of the design tokens.** `site/src/styles/tokens/primitives.css`, `semantic.css`, `aliases.css`, and any layered overrides under `site/src/styles/tokens/` are re-tuned so palette, type scale, spacing rhythm, radii, shadow weight, and motion timings reproduce the AgentNews look. Token *names* survive; *values* are re-anchored. `--sl-color-*` aliases are kept in sync so Pagefind + Starlight chrome retint automatically.
- **Full-bleed layout discipline across the whole site.** The `MarketingShell.astro` shell and its inner `Container` / `Section` primitives are extended (or re-tuned) so every marketing surface fills the viewport from edge to edge at desktop, with no inherited "narrow centered doc column" feel. The sticky top nav (`nbg-topnav`), hero, content rows, and footer all conform to a single AgentNews-style chrome.
- **Site-wide propagation of the new aesthetic.** The 11 marketing surfaces from the prior redesign — `/`, `/start-here/day-1/`, `/start-here/week-1/`, `/skills/`, `/news/`, `/tips/`, `/glossary/`, `/reference/`, `/contribute/`, `/my-pins/`, `/submit-skill/` — all visually conform to AgentNews. No surface escapes the re-skin.
- **Replacement of the `/news/` index surface with an AgentNews-styled news page.** The current chronological `MarketingShell` + featured-lead + magazine-list layout at `site/src/pages/news/index.astro` is replaced (in-place — same route) with an AgentNews-style news feed. The detail route `/news/[slug].astro` is restyled to share the new aesthetic but keeps the Starlight content chrome (per the existing marketing-vs-content split documented in §S.13 and refined-request `ui-redesign.md` A5).
- **Content-detail page (`/news/[slug]/`) chrome override re-tuning.** The existing `content-prose.css` + `content-chrome.css` deep theme override is re-tuned against the new tokens. Pagefind, sidebar nav, and the right-rail TOC continue to function.
- **Motion + reveal language re-tuning.** `MotionReveal` (currently neutralised to a no-op per Issues item #5) is reactivated *if and only if* AgentNews uses scroll-reveal motion at a comparable intensity. The reduced-motion floor stays. Hover/focus micro-interactions on cards, chips, buttons are re-tuned.
- **Documentation update.** `docs/design/project-design.md` §S.13 is updated in-place: the aesthetic anchor reference changes from "Linear / Vercel / Stripe" to "AgentNews (`github.com/BikS2013/AgentNews`)" with a short rationale and a pointer to this refined request. `SCOPE.md` "Design system" line in the latest dated block is updated to match.
- **Investigation artifact under `docs/reference/`.** Before any code change, a short investigation note (`docs/reference/investigation-agentnews-aesthetic.md`) captures the concrete visual properties observed on AgentNews (palette hex/HSL, type scale, spacing rhythm, layout chrome, card pattern, motion, dark/light handling) — this becomes the source-of-truth pin against which AC tests are written.

### Out of scope
- **Replacing Astro / Starlight.** The stack stays Astro 6.3.5 + Starlight 0.39.2 (per project CLAUDE.md Ports + integration constraints). This is a re-skin on the existing rails, not a re-platform.
- **Importing AgentNews code wholesale.** AgentNews is studied for visual properties only. We do not copy its components, build scripts, or content models into this repo.
- **Changing the news content model.** The `news` content collection schema in `site/src/content.config.ts` is unchanged. The RSS pipeline at `pipeline/` is untouched. Existing `news/published/*.md` items render under the new visual chrome.
- **Changing the sidebar structure** in `astro.config.mjs`. Entry list, labels, and ordering stay; only visual styling changes.
- **Changing any `site/src/lib/` module** (`auth.ts`, `api-fetch.ts`, `gist.ts`, `news.ts`, `pin-store.ts`, `skill-types.ts`, `slug.ts`, `submission.ts`). All 8 modules are contract.
- **Changing the `site/public/_data/<type>-index.json` shape** or the `scripts/build-pin-index.ts` script that emits it.
- **Production hosting choice.** Still deferred per `SCOPE.md`.
- **Content edits** in `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`. The redesign is structural/visual only. Re-anchored copy in `index.astro`, `contribute.astro`, `reference.astro`, `week-1.astro` is allowed because that copy is page-chrome, not curated content.
- **Pipeline workspace** (`pipeline/`) and **plugin workspace** (`plugin/`) — site only.
- **Adding new content collections, new pages, or new routes** beyond what already exists.
- **External image sourcing.** Visual richness is delivered via CSS, SVG, hand-rolled vector primitives, gradients, and Astro Fonts API typography. No stock photography is introduced.

## Requirements

### R1 — Visual property capture (investigation prerequisite)
1. Before any code change, fetch `https://github.com/BikS2013/AgentNews` (README, any screenshots, any live demo URL embedded in the repo) and any sibling deployed reference. Capture the observed visual properties as structured data in `docs/reference/investigation-agentnews-aesthetic.md`:
   - **Palette**: background scale (deepest to lightest), foreground text scale, accent colour(s) with hover/active steps, semantic colours if any (success/warning/error), border colour(s). Each captured as a hex or HSL triple plus a one-line role description.
   - **Typography**: display font face, body font face, mono font face (with fallbacks). Size scale (capture at least 6 steps). Weight usage per element class (display headlines, section eyebrows, body, captions, code). Letter-spacing on display vs body. Line-height on display vs body.
   - **Spacing rhythm**: base unit (4px / 8px), section vertical rhythm at desktop, card padding, gap between cards in the news grid/list.
   - **Layout chrome**: nav-bar height, presence/absence of left sidebar, content max-width (or full-bleed-with-padding), section gutters at mobile vs desktop.
   - **News card pattern**: card structure (image / no-image, eyebrow / no-eyebrow, title weight + size, source/date treatment, badges or tags, footer affordances), hover state.
   - **Motion**: presence/absence of scroll-reveal, hover micro-interactions, view-transitions between pages, motion duration and easing if observable.
   - **Dark/light handling**: which is default, whether both are supported, how the theme toggle is presented.
2. The investigation artifact MUST cite source paths (`README.md`, `app/page.tsx`, screenshot file names, deployed URL) so the design choices are traceable.

### R2 — Token re-anchor
1. `site/src/styles/tokens/primitives.css` is re-tuned: at minimum the slate/violet/emerald/amber/rose/sky ramps are replaced by ramps that match the AgentNews palette (names may change if cleaner, but the set of token *roles* — neutral, accent, audience-beginner, audience-advanced, audience-both, success/warning/danger, info — stays equivalent so existing components keep compiling).
2. `site/src/styles/tokens/semantic.css` is re-tuned: surface, foreground, accent, audience, confidence, status, and focus tokens are rebound to the new primitives. Dark and light blocks both updated.
3. `site/src/styles/tokens/aliases.css` re-tunes the `--sl-color-*` alias map so Starlight chrome (sidebar, search modal, in-page TOC, breadcrumb) retints automatically. Pagefind UI retints via the same chain (per `docs/research/pagefind-ui-variant-in-starlight-0-39.md`).
4. The token count floor of ≥ 60 declarations (AC1 from prior redesign) is preserved.
5. Token *names* (`--nbg-c-*`, `--nbg-fs-*`, `--nbg-sp-*`, etc.) MUST NOT be renamed — too many primitives + components depend on them. Only values change. If a new token role is needed (e.g., `--nbg-c-graphite-*` for a darker neutral than slate), it is *added*, not substituted.

### R3 — Full-bleed layout discipline
1. `Container.astro` gains (or its `width="full"` variant is tightened so) a true edge-to-edge desktop layout exists with token-driven horizontal padding only. No `max-width` constraint applies when `width="full"`.
2. `MarketingShell.astro` adopts a full-bleed chrome by default for AgentNews-styled surfaces: the sticky top nav sits flush against the viewport edges; the hero region fills viewport width; content rows extend to the gutters with only the chosen padding token between edge and content.
3. At desktop ≥ 1440px viewport, the homepage, the news page, and at least the skills page render with zero horizontal scrollbars AND with `<body>` / outer container computing to `width = 100vw` (or `100% of the root inline-size`) — verifiable via Playwright `getBoundingClientRect()` assertion.
4. Mobile (≤ 640px) keeps comfortable inner padding; full-bleed is a desktop-and-up affordance.
5. The Starlight default narrow doc gutter is hidden / suppressed on all 11 marketing surfaces; only content-detail pages (`/news/[slug]/`) keep Starlight chrome.

### R4 — News surface replacement (`/news/`)
1. `site/src/pages/news/index.astro` is rewritten to match the AgentNews news layout (specific layout shape determined by R1 capture — e.g., a tile grid, a stacked card list with leading image-area placeholder, or a magazine-style hero + feed; whichever AgentNews uses).
2. The same `news` content collection (`getCollection('news')` / `getRecentNews()`) feeds the new layout. No schema change.
3. Existing functional contracts on the news index are preserved:
   - `AudienceFilter` continues to toggle `.audience-hidden` on `[data-audience]` items and persists to `localStorage.nbgaihub.audience`.
   - `ConfidenceChip` (now via `Badge`) still surfaces `editor_confidence`.
   - `PinButton` on each card still pins to the user's gist.
4. The news detail route `/news/[slug].astro` is restyled (via `content-prose.css` + `content-chrome.css` re-tune) but its routing, content rendering, sidebar, TOC, and Pagefind-indexability stay unchanged.
5. If R1 capture shows AgentNews uses an image-led card pattern and the `news` schema has no `hero_image` field, the news cards either (a) use an attractive token-driven gradient/typographic block in place of the image (no schema change), or (b) the request is escalated as an open question — but the redesign does NOT silently introduce a fallback image (per global rule "never substitute defaults silently").

### R5 — Site-wide aesthetic propagation
1. Each of the 11 marketing surfaces is reviewed and updated so it reads as AgentNews-derived:
   - Eyebrows, displays, ledes use the new type rhythm.
   - Cards (`Card variant="feature" | "content" | "link" | "stat"`) inherit the new shadow weight, radius, border-treatment, hover behaviour.
   - Buttons (`Button variant="primary" | "secondary" | "ghost"`) inherit the new accent + neutral palettes.
   - Badges, Chips, Kbd inherit the new palette + radius.
2. No legacy `#0a7 / #e60 / #08c / #aa6 / #666` flat colours remain in any component or page file.
3. No surface uses a centered single-column hero with two CTAs (the rule from the previous redesign still applies — AgentNews aesthetic does not regress to that pattern).
4. The 11-entry sidebar visual treatment is re-tuned: active-state indicator, hover, spacing, type all match AgentNews's navigation chrome.

### R6 — Content-detail theme override re-tune
1. `site/src/styles/content-prose.css` and `site/src/styles/content-chrome.css` are re-tuned so `/news/[slug]/` body type, links, code blocks, inline `<code>`, blockquotes, tables, callouts, and the right-rail TOC match AgentNews body chrome.
2. The Starlight sidebar on content pages keeps the 11 entries from `astro.config.mjs` and renders with the new visual treatment.
3. Pagefind search modal remains styled via `--sl-color-*` aliases (per existing R-2 reconciliation in plan-004) — no direct Pagefind UI overrides.

### R7 — Motion + depth
1. If R1 capture shows AgentNews uses scroll-reveal motion: re-activate `MotionReveal.astro` (currently a no-op per Issues #5) with the durations and easings observed on AgentNews. Defense-in-depth reduced-motion respect is preserved.
2. If R1 capture shows AgentNews uses parallax or layered-gradient depth: apply equivalent token-driven gradient washes on home hero + news hero. Otherwise omit.
3. Interactive elements (buttons, cards, links, chips) retain a hover micro-interaction. Duration tokens are re-tuned to match observed AgentNews timings (typically 150–250ms).
4. `prefers-reduced-motion: reduce` collapses all motion to instant per the existing `primitives.css` block at lines 251–258.

### R8 — Typography
1. If AgentNews uses a different display or body font than Inter (Variable) — e.g., Geist, Söhne, Untitled Sans, Mona Sans, or a system stack — the Astro Fonts API config in `astro.config.mjs` is updated. If the font is unavailable through Fontsource, a documented fallback (system stack OR a justified alternative free-license font on Fontsource) is used. Never substitute a font silently — the choice is documented in the investigation artifact.
2. Mono stays JetBrains Mono unless AgentNews uses a distinctly different mono.
3. Display headline size at desktop is re-tuned to match AgentNews's largest observable headline (the existing AC5 floor of ≥ 4rem stays — if AgentNews is larger, we go larger).
4. Line-height for display ≤ 1.15, body ≥ 1.5.

### R9 — Accessibility floor
1. Keyboard navigation works on every interactive element on every surface.
2. `:focus-visible` styles use the focus-ring token and are visually distinct against the new palette.
3. WCAG AA contrast (4.5:1 normal text, 3:1 large text) holds in both dark and light modes after re-anchoring. An axe-core or pa11y audit reports zero contrast violations on home, /skills, /news, /my-pins, /submit-skill, and one news detail page.
4. All existing ARIA attributes on `PinButton`, `SignInModal`, `AudienceFilter`, `my-pins.astro`, `submit-skill.astro`, `SocialIconsOverride.astro`, `AuthControls.astro`, `SplashAwareHeader.astro` are preserved bit-for-bit.
5. `prefers-reduced-motion: reduce` is honoured (see R7.4).
6. Touch targets on mobile remain ≥ 44×44 CSS pixels.

### R10 — Responsive
1. Mobile (≤ 640px): single-column layouts; sidebar collapses into the existing mobile drawer; no horizontal scroll; comfortable inner padding.
2. Tablet (641–1024px): two-column-friendly layouts on news/skills/tips.
3. Desktop (≥ 1025px): full editorial AgentNews layouts; full-bleed where the design calls for it.

### R11 — Dark + light handling
1. The default theme (dark vs light) matches AgentNews. If AgentNews is light-default, Starlight's `data-theme` initial-state mechanism is reconfigured. If AgentNews supports only one mode, the other is still kept *functional* in this hub (no broken contrasts) but visually deprioritised; this trade-off is documented in §S.13.
2. Both modes pass R9.3 contrast.

### R12 — Non-regression
1. `cd site && npm run build` exits 0 with no new deprecation warnings.
2. `cd site && npm test` reports ≥ 215 tests passing, 0 failing. (Current count per `SCOPE.md` is `215/215`.) If tests assert old DOM/CSS structure that changes, they are updated to assert the equivalent post-redesign behaviour. No tests are deleted.
3. `cd site && npm run check` (`astro sync && astro check`) reports zero errors.
4. Pagefind full-text search opens from the header on a content page and returns results for a known query.
5. The 11-entry sidebar from `astro.config.mjs` is preserved.
6. The mobile nav drawer still opens on small screens.
7. The dark/light theme toggle still works site-wide.
8. `localStorage.nbgaihub.audience` filter persistence continues to work.
9. PAT-paste sign-in completes end-to-end (modal opens, token validates, header chip updates).
10. `/submit-skill/` form validates, builds the GitHub-editor URL, and redirects (or copies to clipboard for ≥ 7000-char payloads).
11. `/my-pins/` hydrates from the user's gist after sign-in.
12. `site/public/_data/<type>-index.json` files are still emitted by the build-pin-index script.

### R13 — Portability (post-Phase-6 escalation hedge survives)
1. The token layer continues to define `--nbg-*` first, then alias `--sl-*` second. AgentNews colours land on `--nbg-*` tokens; Starlight tokens stay downstream.
2. New layout primitives (if any) live under `site/src/components/primitives/` and import nothing from `@astrojs/starlight/*`.
3. `MarketingShell.astro` and `SocialIconsOverride.astro` remain the only files (besides aliases.css) that import from `@astrojs/starlight/*`. If the re-skin requires an additional Starlight surface override, it is added to the documented allow-list in §S.13.
4. If the re-skin requires functional changes to `SplashAwareHeader.astro` or `AuthControls.astro`, those changes preserve the existing event contracts (`nbgaihub:open-signin-modal`, `data-nbg-signin-*`).

### R14 — Documentation
1. `docs/design/project-design.md` §S.13 is updated (in-place — supersede prior content; do NOT delete §S.13.1–§S.13.x history blocks if they are append-only):
   - Aesthetic anchor changes from "Linear / Vercel / Stripe" to "AgentNews".
   - The investigation artifact (`docs/reference/investigation-agentnews-aesthetic.md`) is referenced.
   - Any new token roles, new primitive components, or new chrome rules are documented.
2. `SCOPE.md` "Last updated" header for the next dated block reflects the aesthetic shift; the "Design system" sub-section pointer at the bottom of the file is updated.
3. Each new or substantively rewritten component carries the standard header comment block (purpose, related design section, key contract).
4. An integration-verification report at `docs/reference/integration-verification-agentnews-aesthetic.md` is produced at the end, citing per-AC evidence (test name, file:line, observed behaviour, screenshot paths).

## Constraints

### Technical
- **Framework**: Astro 6.3.5 + Starlight 0.39.2 — no upgrade.
- **Node**: 22.
- **Test runner**: vitest 4.x.
- **TypeScript-first** for any new logic modules; `.astro` files retain their existing `<script>` patterns.
- **Dev port stays 4321** per `CLAUDE.md` Ports section.
- **No backend.** Build-time + client-side only.
- **No new runtime dependencies** unless explicitly justified in the implementation plan and confirmed non-deprecated.
- **No external image sourcing.** Visuals are CSS, SVG, hand-rolled vector primitives, or build-emitted assets.
- **One body + one display + one mono** font ceiling. Display MAY reuse the body family at a different optical-size axis (current pattern in `primitives.css`).

### Process
- **Tone of any rewritten copy**: project tone — "what I wish I knew a year ago", opinionated, plainspoken, no marketing voice, no AI-slop hedging.
- **No version control operations** beyond the implementation itself unless explicitly requested.
- **`Issues - Pending Items.md`** is updated for any defect/inconsistency surfaced during implementation.
- **Never silently substitute fallback values for missing configuration** (per global rule). If a font, image-area, or token is genuinely absent in AgentNews and the spec has no defined alternative, the implementer raises it in the integration-verification report rather than guessing.
- **Pending item #5** (MotionReveal neutralised) — if R7.1 reactivates it, that pending item is closed; otherwise it stays open.
- **Pending item #12** (SignInModal duplicate IDs on content-detail pages) — out of scope for this redesign; do not regress it but do not block on fixing it.

### Resource
- Implementation budget assumed: a single front-end pass starting from commit `36b8758` and ending at a user-evaluation gate at `localhost:4321`.

## Acceptance Criteria

### Investigation
- **AC1** `docs/reference/investigation-agentnews-aesthetic.md` exists, was authored before any code change in this workflow, and contains all seven property-capture sections from R1.1 (palette, typography, spacing, layout chrome, news card pattern, motion, dark/light handling). Each section cites source paths or URLs. Verification: file exists, `grep -c '^## ' docs/reference/investigation-agentnews-aesthetic.md` ≥ 7.

### Token re-anchor
- **AC2** `site/src/styles/tokens/primitives.css` declares ≥ 60 CSS custom properties (existing floor preserved) AND at least three primitive ramps have values differing from the pre-commit-36b8758 baseline. Verification: `grep -c '^\s*--' site/src/styles/tokens/primitives.css` ≥ 60; `git diff 36b8758 -- site/src/styles/tokens/primitives.css` shows non-trivial value changes on at least three ramps.
- **AC3** `site/src/styles/tokens/semantic.css` declares both `:root[data-theme='dark']` and `:root[data-theme='light']` (or equivalent `:root` + override) blocks with overrides for every semantic colour token. Verification: `grep -c "data-theme=" site/src/styles/tokens/semantic.css` ≥ 2.
- **AC4** `site/src/styles/tokens/aliases.css` continues to alias ≥ 13 `--sl-color-*` tokens onto `--nbg-*` tokens. Verification: `grep -cE "--sl-color-(black|white|gray-[1-6]|text|text-accent|text-invert|accent|accent-high|accent-low|backdrop-overlay)" site/src/styles/tokens/aliases.css` ≥ 13.
- **AC5** Zero legacy flat colours (`#0a7`, `#e60`, `#08c`, `#aa6`, `#666`) remain in any `.astro` or `.css` file under `site/src/`. Verification: `grep -rE "#0a7|#e60|#08c|#aa6|#666" site/src/` returns zero matches.

### Full-bleed layout
- **AC6** At desktop viewport ≥ 1440px, `http://localhost:4321/`'s outermost `<main>` (or marketing-shell root element) computed `getBoundingClientRect().width` equals the viewport inner width (allowing ±2px sub-pixel rounding). No horizontal scroll on `<html>`/`<body>`. Verification: Playwright assertion captured in integration-verification.
- **AC7** Same check passes on `http://localhost:4321/news/` and on `http://localhost:4321/skills/`. Verification: Playwright assertion on both routes.
- **AC8** On mobile viewport ≤ 640px, inner horizontal padding on home + news + skills is ≥ 16px on each side and ≤ 24px (touch comfort). Verification: Playwright computed-style assertion.
- **AC9** The Starlight default narrow doc gutter is NOT visible on any of the 11 marketing surfaces. Verification: visiting each surface, computed `max-width` on the surface root is `none` OR ≥ the viewport width minus the chosen padding. No `max-width: 70ch` or `max-width: var(--sl-content-width)` in effect on marketing surfaces.

### News surface replacement
- **AC10** `site/src/pages/news/index.astro` exists and renders an AgentNews-styled feed. Its layout shape matches the structure captured in `investigation-agentnews-aesthetic.md` §5 (e.g., if AgentNews uses a tile grid, the page renders a tile grid; if a stacked feed, a stacked feed). Verification: DOM-structure assertion that the page contains the expected outer-layout element (e.g., a CSS grid with N columns, or an `<ol>`/`<ul>` feed) AND that ≥ 1 visual property (card padding, card radius, hover state) matches the captured value within tolerance.
- **AC11** All current `news/published/*.md` items render on the new index. Item count rendered equals `getRecentNews()` length. Verification: `getCollection('news')` length matches DOM node count.
- **AC12** `AudienceFilter` on `/news/` continues to toggle `.audience-hidden` on `[data-audience]` cards. Verification: Playwright click + class-presence assertion.
- **AC13** Each rendered news card has a `PinButton` and clicking it triggers the existing pin flow (sign-in modal if anonymous; gist update if signed-in). Verification: Playwright probe; event listener assertion.
- **AC14** The news detail route `/news/[slug].astro` continues to render published items individually with the re-tuned content chrome. Verification: visit any slug, confirm body type / link / code / TOC styles match the new tokens.

### Site-wide propagation
- **AC15** Each of the 11 marketing surfaces visually conforms to the new aesthetic. A reviewer opens each at `localhost:4321` and confirms the surface uses the new palette, type, spacing, and chrome. Verification: visual-review checklist in integration-verification report (one row per surface) with screenshot evidence.
- **AC16** Each `Card`, `Button`, `Badge`, `Chip`, `Eyebrow`, `Lede`, `Display` primitive consumes the re-anchored tokens (no hardcoded colours other than CSS keyword `transparent` / `currentColor`). Verification: `grep -rE "#[0-9a-fA-F]{3,6}|rgb\(|hsl\(" site/src/components/primitives/` returns zero matches (or matches only inside header comment blocks).

### Content-detail theme override
- **AC17** `/news/[slug]/` renders body type, links, code blocks, blockquotes, tables, and the right-rail TOC using the new tokens. Verification: Playwright computed-style assertion on a representative slug.
- **AC18** Starlight sidebar on `/news/[slug]/` shows the 11 entries with the new visual treatment; the active-state indicator is no longer the default Starlight pill. Verification: DOM/computed-style check.

### Motion + accessibility
- **AC19** `prefers-reduced-motion: reduce` is honoured: forcing the media query in DevTools collapses all CSS transitions to ≤ 0.01s and skips scroll-reveals. Verification: Playwright emulation + computed-style check.
- **AC20** Keyboard navigation through the homepage reaches every interactive element in logical order, and `:focus-visible` shows a token-driven outline on each. Verification: Playwright `keyboard.press('Tab')` walk + screenshot.
- **AC21** axe-core or pa11y on home, /skills, /news, /my-pins, /submit-skill, and one news detail page reports zero contrast violations in both dark and light modes. Verification: audit log committed under `docs/reference/`.

### Dark + light
- **AC22** The default page-load theme matches the one selected per R11.1 (typically AgentNews's default). Verification: open any page with no stored theme preference; computed `data-theme` on `<html>` matches the documented default.
- **AC23** Toggling to the non-default mode re-renders every page with the corresponding token values applied; no element becomes invisible or low-contrast. Verification: per-page screenshot at both themes.

### Responsive
- **AC24** At mobile (≤ 640px), the home hero is readable without horizontal scroll AND all touch targets on home/news/submit-skill are ≥ 44×44 CSS pixels. Verification: Playwright `boundingBox()` per target + screenshot.
- **AC25** At tablet (641–1024px) and desktop (≥ 1025px), each surface uses the new editorial layout. Verification: per-breakpoint screenshots.

### Behavioural non-regression
- **AC26** `cd site && npm run build` exits 0 with no new deprecation warnings introduced by this redesign. Verification: stdout + exit-code in integration-verification report.
- **AC27** `cd site && npm test` reports ≥ 215 tests passing, 0 failing. Verification: vitest run log.
- **AC28** `cd site && npm run check` reports zero errors. Verification: stdout in report.
- **AC29** Pagefind search opens on a content page, returns results for a known query (e.g., a published-news title), and clicking a result navigates correctly. Verification: Playwright probe.
- **AC30** All 11 sidebar entries from `astro.config.mjs` are reachable from a doc page. Verification: per-entry navigation probe.
- **AC31** PAT-paste sign-in opens the modal, validates a token, and updates the header chip. Verification: Playwright happy-path probe.
- **AC32** AudienceFilter toggling persists to `localStorage.nbgaihub.audience` and applies `.audience-hidden`. Verification: Playwright + localStorage check.
- **AC33** `/submit-skill/` form validates a known-bad input and a known-good input, builds the GitHub-editor URL, and redirects. Verification: Playwright probe; URL inspection.
- **AC34** `/my-pins/` hydrates the signed-in panel from the gist (after pin → reload). Verification: Playwright end-to-end probe.
- **AC35** `site/public/_data/skill-index.json` (and the other four `<type>-index.json` files) are emitted by the build. Verification: `ls site/public/_data/*.json` shows 5 files post-build.

### Portability
- **AC36** Only `MarketingShell.astro`, `SocialIconsOverride.astro`, `SplashAwareHeader.astro`, and `tokens/aliases.css` (plus any new file documented in §S.13's allow-list) import from `@astrojs/starlight/*`. Verification: `grep -lrE "from ['\"]@astrojs/starlight" site/src/components/ site/src/styles/` matches only the allow-listed files.
- **AC37** No file under `site/src/components/primitives/` imports from `@astrojs/starlight/*`. Verification: `grep -rE "@astrojs/starlight" site/src/components/primitives/` returns zero matches.

### Documentation
- **AC38** `docs/design/project-design.md` §S.13 reflects the AgentNews anchor and references the investigation artifact. Verification: `grep -c "AgentNews\\|agentnews" docs/design/project-design.md` ≥ 3.
- **AC39** `SCOPE.md` "Design system" pointer line is updated to mention the AgentNews aesthetic. Verification: `grep -c "AgentNews\\|agentnews" SCOPE.md` ≥ 1.
- **AC40** `docs/reference/integration-verification-agentnews-aesthetic.md` exists and contains one row per AC above with concrete evidence. Verification: file exists; `grep -c "^- \\*\\*AC" docs/reference/integration-verification-agentnews-aesthetic.md` ≥ 40.

## Assumptions

These are inferred from project context and the four locked decisions provided by the orchestrator. They are surfaced so they can be challenged before any code change.

- **A1 — Baseline is commit `36b8758`** (the Linear/Vercel/Stripe redesign, committed as the new baseline). **LOCKED.** This re-skin work begins from that commit; the existing token system, primitives, MarketingShell, and content-page chrome override are *re-tuned*, not torn down.
- **A2 — News scope: REPLACE in-place.** **LOCKED.** The route `/news/` stays; its `index.astro` is rewritten. No redirect, no separate AgentNews app, no new route. The detail route `/news/[slug].astro` keeps its routing; only its visual chrome is re-tuned.
- **A3 — Visual scope: SITE-WIDE.** **LOCKED.** The whole hub adopts the AgentNews aesthetic. All 11 marketing surfaces + the content-detail chrome are re-skinned. The news page is the visual proving ground but the change is everywhere.
- **A4 — Stack: Astro 6 + Starlight 0.39 + TypeScript.** **LOCKED.** No re-platform; no Astro/Starlight version bump within this workflow.
- **A5 — Aesthetic source of truth: `github.com/BikS2013/AgentNews`.** The investigation artifact (R1, AC1) is the pinned reference. If AgentNews is updated after this workflow runs, that's a follow-up — this workflow targets the current state of the repo at the time of investigation.
- **A6 — "Full-bleed" means** the marketing surfaces extend edge-to-edge at desktop with only token-driven horizontal padding for content, and the sticky top nav (`nbg-topnav`) sits flush against the viewport edges. Mobile keeps comfortable inner padding.
- **A7 — Dark mode default vs. light mode default** is determined by R1 capture. If AgentNews is dark-default (likely for an AI-news site in that family), nothing changes; if light-default, Starlight's initial-theme is reconfigured and §S.13 documents the trade-off.
- **A8 — Token names survive; values change.** Components and pages MUST keep compiling without import-path or prop-name churn. New token roles can be *added* (e.g., a darker neutral or a different accent), but existing ones MUST NOT be renamed.
- **A9 — `news` schema unchanged.** The 13-key news frontmatter is the contract. If AgentNews's card pattern needs an image but the news schema has no `hero_image`, the cards either use a token-driven typographic/gradient placeholder OR the issue is escalated. No silent default insertion.
- **A10 — `MotionReveal` reactivation is conditional.** Pending item #5 neutralised it. If R1 shows AgentNews uses scroll-reveals at an intensity comparable to the original spec, MotionReveal is re-armed with safer geometry (final-state opacity guard so it never hides content if observer fails). Otherwise it stays a no-op.
- **A11 — Pagefind UI styling stays inherited.** Pagefind's search modal retints via `--sl-color-*` aliases — no direct Pagefind overrides. This is per the existing research doc and `R-2` reconciliation in plan-004.
- **A12 — Other surfaces (`/my-pins`, `/submit-skill`, `/glossary`, etc.) keep their behaviour.** Visual re-skin only. The PAT-paste sign-in flow, the gist-backed pins, the live validator on submit-skill, the 17-rule frontmatter contract, the `<input type="checkbox">` real-checkbox elements behind AudienceFilter — all unchanged.
- **A13 — Browser support floor**: modern evergreen browsers (Chrome / Safari / Firefox / Edge current + one back).
- **A14 — Accessibility floor**: WCAG AA contrast in both modes; `prefers-reduced-motion: reduce` honoured; `:focus-visible` outlines token-driven; all ARIA attributes preserved bit-for-bit.
- **A15 — Mobile breakpoints**: documented project breakpoints (`--nbg-bp-sm: 40rem`, `--nbg-bp-md: 64rem`, `--nbg-bp-lg: 80rem`, `--nbg-bp-xl: 96rem`) remain. If AgentNews uses materially different breakpoints (e.g., a 768 / 1024 / 1440 ladder), tokens are re-tuned but the *count* of breakpoints stays four.
- **A16 — Content collections schema unchanged.** No edits to `site/src/content.config.ts`.
- **A17 — `lib/` modules untouched** (all 8). They are the data + behaviour contract the new visuals consume.
- **A18 — `scripts/build-pin-index.ts` untouched.**
- **A19 — Issue #12 (SignInModal duplicate IDs on content-detail) is not regressed but also not fixed here.** Out of scope.
- **A20 — Tone of any rewritten in-page copy** stays project tone (`what I wish I knew a year ago`). Marketing-voice strings are not introduced even if AgentNews's tone is more promotional.
- **A21 — One-pass implementation budget.** Investigation → design → implementation → review → test → integration-verification, in that order, ending at a user-evaluation gate at `localhost:4321`.
- **A22 — Imagery policy**: no external stock photography; visual richness via CSS, SVG, gradients, type. If AgentNews uses lots of imagery, the hub approximates the *visual weight* via gradients/typographic blocks, not by sourcing images.
- **A23 — Sidebar structure unchanged.** Visual treatment is in scope; structure is not.

## Definition of Done

This redesign is mergeable when **all** of the following hold:

1. **Investigation captured.** `docs/reference/investigation-agentnews-aesthetic.md` exists with all seven R1.1 sections populated and cited. **AC1.**
2. **Build green.** `cd site && npm run build` exits 0, no new deprecation warnings. **AC26.**
3. **Tests green.** `cd site && npm test` reports ≥ 215 passing, 0 failing. Updated tests preserve coverage intent; new tests MAY be added. **AC27.**
4. **Typecheck green.** `cd site && npm run check` reports zero errors. **AC28.**
5. **Lint clean.** Whatever lint runs (`astro check`, `tsc --noEmit`, any prettier/eslint configured) reports zero new errors.
6. **No new deprecated dependencies.** `npm ls` / `npm outdated` review on `site/` shows no newly added deprecated package.
7. **Design tokens re-anchored.** `site/src/styles/tokens/primitives.css` shows non-trivial value changes on ≥ 3 ramps. `semantic.css` and `aliases.css` updated in lockstep. Token count floor ≥ 60 preserved. **AC2, AC3, AC4, AC5.**
8. **Full-bleed layout proven.** Home, /news, /skills all render edge-to-edge at desktop ≥ 1440px with no horizontal scrollbars, computed root width matching viewport. **AC6, AC7, AC8, AC9.**
9. **News surface replaced.** `site/src/pages/news/index.astro` renders the AgentNews-styled layout, all published items appear, AudienceFilter + PinButton + ConfidenceChip work. **AC10, AC11, AC12, AC13, AC14.**
10. **All 11 marketing surfaces visually conform** to the new aesthetic with screenshot evidence per surface. **AC15.**
11. **Content-detail chrome re-tuned.** `/news/[slug]/` shows the new typography, code, callout, TOC, sidebar treatments. Pagefind still works. **AC17, AC18, AC29.**
12. **Accessibility audit clean.** axe-core or pa11y on the six target pages reports zero contrast violations in both modes. ARIA attributes preserved. Reduced-motion honoured. **AC19, AC20, AC21.**
13. **Dark + light both functional.** Default theme matches R11.1; the non-default mode also passes contrast. **AC22, AC23.**
14. **Responsive coverage proven** at mobile / tablet / desktop on every marketing surface. **AC24, AC25.**
15. **All existing functional flows verified.** Pagefind, AudienceFilter persistence, PinButton + SignInModal end-to-end, `/my-pins/` hydration, `/submit-skill/` validate-and-redirect, dark/light toggle, mobile drawer, `_data/<type>-index.json` emission — all green. **AC29–AC35.**
16. **Portability preserved.** Starlight imports stay in the documented allow-list. Primitives import zero Starlight. **AC36, AC37.**
17. **Documentation updated.** `docs/design/project-design.md` §S.13 reflects AgentNews as the anchor. `SCOPE.md` updated. `docs/reference/integration-verification-agentnews-aesthetic.md` cites per-AC evidence. **AC38, AC39, AC40.**
18. **Real visual check at `localhost:4321`.** A tester opens the dev server, walks every marketing surface and a representative news detail page, confirms each visually matches the AgentNews aesthetic captured in the investigation artifact, and signs off. This is the final gate.
19. **No issues left dangling.** Any defects found and not fixed are registered in `Issues - Pending Items.md` with context. Pending #5 (MotionReveal) is closed if reactivated, otherwise stays open. Pending #12 (SignInModal duplicate IDs) stays open (out of scope but not regressed).

## Open Questions

These were not resolved during refinement. Each carries a default resolution; downstream phases either accept the default or surface the choice for explicit confirmation.

- **Q1 — Does AgentNews ship a live deployed reference URL (Vercel / Netlify / GH Pages preview)?** Default: investigate via R1; if a live URL is found, screenshot it; if not, work from README screenshots + source files only.
- **Q2 — Does AgentNews use an image-led news card pattern?** Default: capture during R1. If yes and the news schema has no `hero_image` field, the implementation uses token-driven typographic/gradient placeholders rather than introducing a schema change. The trade-off is documented in §S.13.
- **Q3 — Does AgentNews use a different font family than Inter + JetBrains Mono?** Default: capture during R1. If yes and the font is available through Fontsource (e.g., Geist, Manrope, Mona Sans, IBM Plex), swap via `astro.config.mjs` `fonts: [...]`. If the font requires a paid licence or is unavailable, fall back to the closest free Fontsource equivalent and document.
- **Q4 — Is AgentNews dark-default or light-default?** Default: capture during R1. Update Starlight's initial-theme handling if needed.
- **Q5 — Does AgentNews use scroll-reveal motion?** Default: capture during R1. Reactivate `MotionReveal.astro` only if yes; otherwise leave it as a no-op (per pending #5).

## Original Request

> My colleague made this project: https://github.com/BikS2013/AgentNews
> I really love the aesthetics of his generated news page. I want us to update the aesthetics of our NBG AI Hub to match the AgentNews news page visually — because the news page will become part of the AI Hub. So we may replace the news pages as we have them right now on the AI Hub, and redirect users to a new AgentNews-style news page. I want the new AI Hub site to look so sleek and fit nicely to the full screen, just like it does on the AgentNews page.

**Orchestrator-locked decisions added to the raw request:**
- Baseline: the Linear/Vercel/Stripe redesign is committed as the new baseline at commit `36b8758`.
- News scope: REPLACE the current `/news/` index with an AgentNews-aesthetic news page in-place.
- Visual scope: SITE-WIDE aesthetic match — the whole hub adopts the AgentNews look.
- Tech stack: stays Astro 6 + Starlight 0.39 + TypeScript.
- Source of truth for the aesthetic: `https://github.com/BikS2013/AgentNews` — to be fetched and studied via WebFetch / browsing as the very first step (R1, AC1).
