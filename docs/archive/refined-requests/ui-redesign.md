# Refined Request: NbgAiHub UI Redesign — Sleek, Captivating, Apple-Influenced

## Category
Development (front-end design system + site redesign)

## Objective
Replace the current Starlight-default look of the NbgAiHub site with a bespoke, dark-mode-first visual system inspired by Linear / Vercel / Stripe (Apple-influenced but web-native). Keep Starlight as the underlying framework. Build a portable design-token layer plus bespoke layouts for every marketing surface, and apply a deep theme override to the MDX content detail pages so the whole site reads as one editorial product — not as a docs framework. The redesign must preserve every existing capability (Pagefind search, sidebar nav, mobile drawer, dark-mode toggle, personalization features, all 127 site tests) and be structured so that an eventual escalation to a non-Starlight stack does not throw away the work.

## Scope

### In scope
- A documented **design-token layer** (CSS custom properties) covering colors, typography scale, spacing scale, radii, shadow elevation, motion durations/easings, and z-index — defined in a single discoverable file, consumable by both Starlight-themed pages and bespoke pages, and **portable** (does not depend on Starlight internals beyond defining `--sl-*` overrides for compatibility).
- **Bespoke marketing layouts** (Astro components or shared layout primitives) using Starlight's `splash` template for these surfaces, each redesigned to abandon the centered-template look:
  - `/` (homepage — currently `site/src/content/docs/index.mdx`)
  - `/start-here/day-1/`
  - `/start-here/week-1/`
  - `/skills/`
  - `/news/`
  - `/tips/`
  - `/glossary/`
  - `/reference/`
  - `/contribute/`
  - `/my-pins/`
  - `/submit-skill/`
- **Theme override for content detail pages** that still use Starlight's default chrome (`/news/[slug].astro` and any future MDX-rendered detail routes): typography, link styling, code blocks, callouts, cards, table of contents, sidebar.
- **Component-level redesign** of the existing visual components:
  - `HomeHero.astro` (replace template hero pattern)
  - `NewsPanel.astro`, `NewsList.astro` (card hierarchy, not uniform grid)
  - `SkillCard.astro`
  - `AudienceBadge.astro` (replace flat `#0a7 / #e60 / #08c`)
  - `ConfidenceChip.astro`
  - `AudienceFilter.astro` (visual-only restyle; behavior unchanged)
  - `PinButton.astro` (style only; logic unchanged)
  - `SocialIconsOverride.astro` (sign-in chip restyle to match new system)
  - `SignInModal.astro` (visual-only restyle)
- **Motion and depth system**: scroll-triggered reveals, hover micro-interactions, subtle gradient washes, layered shadows — all gated by `prefers-reduced-motion`.
- **Typography system**: a chosen display + body + monospace stack with a documented size and weight scale.
- **Update of `docs/design/project-design.md`** with a new section documenting the design system, token names, and theming approach.

### Out of scope
- Production hosting decision (still deferred per `SCOPE.md`).
- Content edits to any markdown file under `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/` — the redesign is structural and visual only.
- Changes to `pipeline/` or `plugin/` workspaces — site only.
- Externally sourced photography or stock illustration. Imagery is limited to what can be produced with CSS, SVG, hand-written vector primitives, or build-time generated assets.
- Changes to any of the 8 `site/src/lib/` modules — they are infrastructure, not presentation.
- Changes to content collection schemas (`site/src/content.config.ts`).
- Changes to the build-pin-index script or the `_data/<type>-index.json` contract.
- Changes to the `astro.config.mjs` sidebar structure (entries, ordering). Visual styling of the sidebar is in scope; structure is not.
- Replacing Starlight (Option 2). This spec is for Option 1 only; Option 2 is the escalation lever after Phase 6.
- Adding new content collections or pages beyond what already exists.

## Requirements

### R1 — Design-token layer
1. A new file at `site/src/styles/tokens.css` (or equivalent, e.g. split into `tokens/colors.css`, `tokens/type.css`, etc., aggregated by `tokens.css`) MUST define CSS custom properties for:
   - **Color**: surface/background scale (at least 6 steps from `--color-bg-0` deepest to `--color-bg-5` lightest), text scale (primary/secondary/muted/inverse), brand/accent (at least 3 steps for hover/active states), audience semantic colors (beginner/advanced/both), confidence semantic colors (low/medium/high), focus ring, success/warning/danger.
   - **Typography**: font-family tokens (`--font-display`, `--font-body`, `--font-mono`), a numeric size scale (at least 8 steps from caption to display), weight tokens, line-height tokens, letter-spacing tokens.
   - **Spacing**: an 8-pt-based scale (at least 10 steps, e.g. `--space-0`/`--space-1`/.../`--space-9`).
   - **Radii**: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`.
   - **Shadow / elevation**: at least 4 elevation steps `--shadow-1`..`--shadow-4` plus a focus-ring shadow.
   - **Motion**: duration tokens (at least fast/base/slow) and easing tokens (at least standard, accelerate, decelerate, spring-ish).
   - **Z-index**: a named scale (`--z-base`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`).
2. The token file MUST be loaded via Starlight's `customCss` array in `astro.config.mjs` (alongside the existing `custom.css`, which can be retained, replaced, or absorbed).
3. Tokens MUST also re-map the relevant `--sl-color-*`, `--sl-font-*`, etc. variables that Starlight reads internally, so Starlight-rendered pages inherit the new palette without a parallel theme.
4. Both **dark mode (default)** and **light mode** values MUST be defined; mode switching uses Starlight's existing `data-theme` attribute mechanism.

### R2 — Marketing-surface bespoke layouts
For each of the 11 marketing surfaces listed in scope, the redesigned page MUST:
1. Use Starlight's `template: splash` (homepage already does; others currently render via `StarlightPage` and must be moved off the default doc chrome or wrap their content in a custom layout that suppresses sidebar/TOC, OR use a custom Astro layout that imports only what's needed from `@astrojs/starlight/components`).
2. Have its own opinionated composition — no two surfaces look identical. Specifically:
   - No surface uses a centered single-column "title + tagline + 2 buttons" hero.
   - No surface uses a uniform `grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr))` card grid as its primary content layout. (Asymmetric grids, editorial hierarchy with one "featured" item, alternating wide/narrow, or staggered/masonry-ish layouts are all acceptable.)
3. Render at full viewport width on desktop where appropriate (the splash template allows this); content max-widths are chosen per surface, not inherited from the default doc layout.
4. Preserve all current functional behavior: AudienceFilter on `/news/` and `/skills/` still filters; PinButton still pins; sign-in flow still triggers `nbgaihub:open-signin-modal`; My Pins still hydrates from the user's gist; Submit Skill form still validates and serializes.

### R3 — Content-detail theme override
1. `/news/[slug]/` pages (and any future MDX-rendered content using Starlight's default doc layout) MUST receive a theme override via the token layer that yields:
   - Body type that matches the marketing surfaces (same font stack, same scale).
   - Heading hierarchy with expressive display weights for `h1` and `h2`.
   - Restyled callouts (`:::note`, `:::tip`, `:::caution`, `:::danger`) using new tokens.
   - Restyled code blocks (background, syntax theme that matches the dark surface palette; light-mode equivalent).
   - Restyled tables, blockquotes, inline `<code>`, links, list markers.
   - Restyled in-page table of contents (right rail) and previous/next page footer.
   - Restyled sidebar nav with new typography, spacing, and active-state indicator (no longer the default Starlight pill).
2. The override MUST NOT break Starlight's sidebar/TOC/mobile-drawer behavior. Specifically: the mobile nav drawer must still open from the same trigger, the dark-mode toggle in the header must still work, and Pagefind search must still trigger from the existing Starlight search affordance.

### R4 — Component restyles
1. `AudienceBadge.astro` MUST replace the flat `#0a7 / #e60 / #08c` with tokenized semantic colors (e.g. tinted-background + accented-foreground pattern, or outline-with-dot pattern — the implementer chooses), and MUST meet WCAG AA contrast for the text/icon against the chosen background in both dark and light modes.
2. `ConfidenceChip.astro` MUST be restyled using tokens; flat `#e60 / #aa6 / #666` are gone.
3. `.topic-chip` MUST be restyled — current gray pill background `var(--sl-color-gray-6)` is replaced with tokenized treatment that reads as a deliberate tag, not a placeholder.
4. `HomeHero.astro` MUST be replaced or refactored such that:
   - It is not a centered single column.
   - It does not use exactly the two-CTA-button pattern in the centered form (it MAY have CTAs, but they must be visually integrated into a richer composition).
   - It introduces at least one editorial element beyond title/tagline/CTAs (e.g. a live-data callout pulling latest news count, a typographic showcase of the tagline, an SVG/CSS visual element, an asymmetric layout pairing copy with a content preview, etc.).
5. `SkillCard.astro` and the news-card markup in `NewsPanel.astro` MUST have visual hierarchy: a featured/lead card style differing from the rest, OR a non-uniform grid placement, OR clear typographic weight differences between primary and secondary cards.
6. `AudienceFilter.astro` is restyled visually only — the existing checkbox behavior, `localStorage` key (`nbgaihub.audience`), and `audience-hidden` toggle MUST keep working unchanged. (The current form-with-three-checkboxes pattern MAY be replaced with a segmented control / pill toggle visually, as long as the underlying inputs remain real `<input type="checkbox">` elements for accessibility and the script in `AudienceFilter.astro` continues to function. If the implementer chooses to swap to radio-like behavior, the script must be updated and the test suite covered.)
7. `PinButton.astro` and `SignInModal.astro` MUST be restyled with new tokens but their behavior, ARIA attributes, and event contracts are untouched.

### R5 — Motion and depth
1. At least 2 marketing surfaces MUST have a scroll-triggered reveal element (fade-in, slide-in, or parallax) triggered when the element crosses 50% of the viewport.
2. At least 1 marketing surface MUST have a depth/parallax or layered-gradient element creating perceived depth (without skeuomorphism).
3. Interactive elements (buttons, cards, links, chips) MUST have a hover micro-interaction (transform, shadow elevation change, or color shift) using motion duration tokens.
4. All motion MUST be disabled (or reduced to instant opacity changes) when `@media (prefers-reduced-motion: reduce)` matches.
5. No motion library dependency is required (CSS transitions + `IntersectionObserver` suffice). If one is added, it MUST be a small, actively maintained package (no deprecated deps) and MUST be justified in the implementation plan.

### R6 — Typography
1. A display font MUST be introduced for headlines (h1/h2 on marketing surfaces). The font MUST be either (a) self-hosted via Astro static asset pipeline, OR (b) a system font stack that yields the desired character (e.g. variable system serif/sans), OR (c) a single carefully chosen web font loaded via `font-display: swap` and preloaded.
2. A monospace token MUST be defined and used for: code, keyboard shortcuts (`<kbd>`-like elements), audience badges where appropriate, source labels in news cards (`item.data.source`).
3. The largest desktop headline (e.g. homepage hero `h1`) MUST be at least `4rem` (`64px`) at the desktop breakpoint.
4. Line-height MUST be tightened for display sizes (`<= 1.1`) and relaxed for body (`>= 1.55`).

### R7 — Accessibility
1. Keyboard navigation MUST work for every interactive element on every marketing surface. Tab order is logical; no positive `tabindex` values are introduced.
2. `:focus-visible` styles MUST be present and visually distinct on all focusable elements; they MUST use the focus-ring token from R1.
3. All text/foreground combinations MUST meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text) in both dark and light modes. This is automatically verifiable via axe-core or pa11y CLI.
4. ARIA roles, labels, and landmarks MUST be preserved on all redesigned components (existing `aria-label`, `aria-describedby`, `role="alert"`, `aria-required` etc. attributes stay).
5. `prefers-reduced-motion: reduce` MUST be honored (see R5.4).
6. Interactive controls retain semantic HTML (`<button>` for actions, `<a>` for navigation, real `<input>` elements for form fields).

### R8 — Responsive design
The site MUST render correctly at three documented breakpoints:
1. **Mobile**: viewport width ≤ 640px. Single-column layouts; sidebar collapses into Starlight's mobile drawer; the homepage hero is readable without horizontal scroll; touch targets are ≥ 44×44 CSS pixels.
2. **Tablet**: 641px–1024px. Two-column-friendly layouts where appropriate; sidebar may collapse or remain visible per Starlight's existing behavior.
3. **Desktop**: > 1024px. Full editorial layouts; max-width caps applied per-surface (not a uniform `max-width: 70ch` everywhere).
The breakpoint values MUST be defined as media-query custom properties or documented constants in `tokens.css` so they are reusable.

### R9 — Dark mode and light mode
1. Dark mode MUST remain the default (`data-theme="dark"` matches current behavior).
2. Light mode MUST be functional (no broken contrasts, no invisible elements) when the user toggles via Starlight's header toggle.
3. Both modes MUST pass R7.3 (contrast).
4. Token definitions MUST distinguish dark and light values for every color token (not just inverted lightness).

### R10 — Non-regression
1. `cd site && npm run build` MUST succeed with zero errors.
2. `cd site && npm test` (or the project's test runner — vitest 4.x) MUST report **at least 127 tests passing** with zero failures. Tests that asserted old DOM structure MAY be updated to reflect the new structure; if updated, the equivalent assertion (same coverage intent) MUST remain.
3. Pagefind full-text search MUST keep working on at least the content detail pages it currently covers (news detail, plus any Starlight-rendered content). The Pagefind UI invocation in the header MUST still open the search modal.
4. The Starlight sidebar in `astro.config.mjs` MUST keep all 11 entries (Home, My Pins, Start Here {Day 1, Week 1}, News, Skills, Tips & Tricks, Glossary, Reference, Contribute {How to contribute, Submit a Skill}) and they MUST all be reachable from the sidebar on doc pages.
5. The mobile nav drawer MUST still open on small screens.
6. The dark-mode toggle in Starlight's header MUST still flip themes.
7. `localStorage.nbgaihub.audience` filter persistence MUST continue working.
8. The PAT-paste sign-in flow MUST still complete end-to-end (modal opens on event, token validates, header chip updates).
9. The submit-skill form's live validation MUST still flag errors and the submit redirect to GitHub's editor MUST still build the correct URL.
10. `site/public/_data/<type>-index.json` files MUST still be emitted by the build-pin-index script.

### R11 — Portability (post-Phase-6 escalation hedge)
1. The token layer MUST NOT use Starlight-specific variable names as the **source** of truth. Define `--color-*`, `--font-*`, etc. first, then map `--sl-color-*` to them — not the other way around.
2. Bespoke marketing layouts MUST use plain Astro components and the design tokens; they MUST NOT depend on Starlight-internal components beyond optional use of `<StarlightPage>` for chrome compatibility.
3. Custom components MUST live under `site/src/components/` and import only from `site/src/lib/` and `site/src/styles/` plus `astro:content` — not from `@astrojs/starlight/internal/*` or undocumented paths.
4. Where Starlight UI primitives (sidebar, search, header) are styled via override, the override MUST be done through CSS custom properties + class targeting in `custom.css`/`tokens.css`, not by forking Starlight's component source.

### R12 — Documentation
1. `docs/design/project-design.md` MUST gain a new section (e.g. §S.13 "Design system") documenting:
   - The token taxonomy (categories + naming convention).
   - Font choices and their license/source.
   - The motion philosophy and reduced-motion behavior.
   - The split between marketing surfaces and content surfaces.
   - The portability strategy (R11).
2. Each new component or layout primitive added MUST have a header comment block matching the existing project style (purpose, related design section, key contract).

## Constraints

### Technical
- **Framework**: Astro 6.3.5 + Starlight 0.39.2 (no upgrade in this workflow).
- **Node**: 22 (per existing `.nvmrc`).
- **Test runner**: vitest 4.x (existing).
- **Search**: Pagefind (existing).
- **No new deprecated dependencies.** Any new package must be currently maintained.
- **TypeScript-first** for any new logic modules; `.astro` files retain their existing `<script>` patterns.
- **Dev port stays 4321** (per `CLAUDE.md` Ports section).
- **No backend.** All site behavior is build-time + client-side; no new server endpoints.

### Process
- **Tone of copy**: every visible string written or rewritten as part of this redesign MUST follow the project tone — "what I wish I knew a year ago," opinionated, plainspoken, no marketing voice, no AI-slop hedging.
- **No version control operations** beyond the implementation itself unless explicitly requested in the same turn.
- **`Issues - Pending Items.md` tracking**: any issue/inconsistency surfaced during implementation is registered there.
- **Singular table names** rule does not apply here (no DB), but is noted for context.
- **Never silently substitute fallback values for missing configuration** (e.g., if a font fails to load, render with the documented fallback stack — do not inject a magic default into the token file).

### Resource
- No external image sourcing. Visuals are CSS, SVG, or build-emitted.
- One font (if web-loaded) is the ceiling; prefer system stacks or variable fonts to keep bundle weight low.
- Implementation budget assumed: a single front-end pass that ends at the Phase 6 evaluation gate. If the user escalates to Option 2 after Phase 6, the token layer and components remain reusable.

## Acceptance Criteria

### Design-system tokens
- **AC1** A file at `site/src/styles/tokens.css` (or aggregated equivalent) exists and defines, at minimum: 6 background steps, 4 text steps, 3 accent steps, audience semantic colors (beginner/advanced/both, dark+light), confidence colors (low/medium/high, dark+light), success/warning/danger, focus-ring; 8 typography size tokens; weights; 10 spacing tokens; 4 radii; 4 elevation shadows; 3 duration + 4 easing motion tokens; 5 z-index tokens. Verification: `grep -c '^\s*--' site/src/styles/tokens.css` returns ≥ 60.
- **AC2** `astro.config.mjs` `customCss` array references `tokens.css` (directly or via an aggregator). Verification: read `site/astro.config.mjs` and confirm.
- **AC3** Both dark and light values are present. Verification: the file contains either `[data-theme='light']` / `[data-theme='dark']` blocks or `:root` + `:root[data-theme='light']` blocks with overrides for every color token.
- **AC4** Starlight `--sl-*` variables are remapped to the new tokens (not the other way around). Verification: `tokens.css` defines `--color-*` first and assigns `--sl-color-*: var(--color-*)` later in the cascade.

### Per-surface (marketing)
- **AC5 — Homepage `/`** At desktop breakpoint (≥ 1025px), the page hero (a) spans ≥ 80vh height, (b) uses an asymmetric or full-bleed composition (verifiable via computed `grid-template-columns` or `flex` layout != "1fr centered"), (c) has the headline rendered at computed `font-size ≥ 4rem` (≥ 64px) using the display font token, (d) is NOT a centered single column with two buttons. Verification: Playwright screenshot + DOM/computed-style assertion.
- **AC6 — `/start-here/day-1/`** Renders the Day 1 journey content with a redesigned chapter/step layout (each of the 6 steps visually distinct from a default `<ol>`), with a sticky or anchored step indicator on desktop and a collapsible/accordion or vertical-progress affordance on mobile. Verification: Playwright DOM check confirms each of the 6 steps is wrapped in a `<section>` or `<article>` with a step indicator and is independently linkable via `#step-N` anchor.
- **AC7 — `/start-here/week-1/`** Renders an opinionated "coming soon" surface that does not read as a blank stub: it includes (a) the explicit "what's coming" framing in project tone, (b) deep-links to existing surfaces (Skills, Tips, Day 1), (c) visual treatment consistent with the rest of the system. No centered "Coming soon" tagline+button pattern.
- **AC8 — `/skills/`** Card grid abandons `repeat(auto-fill, minmax(18rem, 1fr))` for an editorial layout with at least 2 visually distinct card sizes/weights OR an explicit featured-lead-skill region. AudienceFilter still works (verifiable by toggling a checkbox in Playwright and asserting `.audience-hidden` is applied to non-matching cards). All 9 skill entries render.
- **AC9 — `/news/`** News list uses the redesigned card style; the latest item gets visual lead treatment (larger thumbnail or copy block, distinct from the rest). AudienceFilter and ConfidenceChip remain functional. All current `news/published/*.md` items render.
- **AC10 — `/tips/`** Tips render in a redesigned layout (e.g., grouped by topic or audience with sectional headers, or a magazine-style list with pull-quotes); not a uniform card grid identical to skills.
- **AC11 — `/glossary/`** Glossary renders with at least: (a) a search/filter input or letter-anchored index, (b) restyled term entries (term + definition pair) that read editorially (not as a definition list with default browser styling), (c) deep-link anchors that work. (Search/filter MAY be the existing Pagefind UI if already covering the page; otherwise an in-page filter is added.)
- **AC12 — `/reference/`** Even if content is currently sparse, the page is restyled to match the system and presents the reference content (or a structured placeholder) in the new typographic style; no naked default Starlight doc chrome.
- **AC13 — `/contribute/`** Restyled to match the system; the existing copy is preserved or rewritten in project tone; the in-page CTA to Submit a Skill is visually integrated.
- **AC14 — `/my-pins/`** Three states (loading, anonymous, signed-in) are visually distinguishable. The five pin-type sections (skills, tips, news, journey-step, glossary) are styled as distinct cards/lists, not generic `<ul>`s. The privacy callout is styled as an editorial aside, not a default blockquote. Sign-in flow still triggers `nbgaihub:open-signin-modal`.
- **AC15 — `/submit-skill/`** The form is redesigned with section-based progress (fieldsets visually distinguished), inline validation styled with token-driven success/error/warning colors, the slug collision indicator visually integrated, and the submit affordance redesigned. Behavior unchanged (slug derivation, live validation, URL-build-then-redirect, ≥7000-char clipboard fallback).

### Theme override (content detail pages)
- **AC16** `/news/[slug]/` pages render with the new typography, link, code-block, and callout styles. Verification: visit any published news slug, screenshot, and confirm body font, link color, and code-block background match the token system.
- **AC17** Starlight sidebar on content pages shows the 11 entries from `astro.config.mjs` with the new visual treatment (typography, spacing, active-state indicator); the active-state indicator is no longer Starlight's default pill.
- **AC18** Starlight's in-page table of contents (right rail on desktop) is restyled with token typography and spacing.
- **AC19** Callouts (`:::note`, `:::tip`, `:::caution`, `:::danger`) render with new tokenized colors and iconography (icons MAY be the Starlight defaults or replaced — implementer's choice).

### Accessibility
- **AC20** Keyboard navigation: every interactive element on each marketing surface is reachable via Tab in logical order, and an `:focus-visible` outline using the focus-ring token is visible on each. Verification: Playwright keyboard-walks each page and screenshots focused states; or a manual axe-core run.
- **AC21** Color contrast: an axe-core or pa11y audit on each marketing surface and on a representative content-detail page reports zero contrast violations in both dark and light modes.
- **AC22** `prefers-reduced-motion: reduce` is honored: when the media query is forced via DevTools/Playwright, scroll-triggered reveals collapse to instant or are skipped, and CSS transitions on interactive elements drop to ≤ 0.01s. Verification: Playwright emulation + computed-style check.
- **AC23** All existing ARIA attributes on `PinButton`, `SignInModal`, `AudienceFilter`, `my-pins.astro`, `submit-skill.astro`, and `SocialIconsOverride.astro` are preserved bit-for-bit (verifiable via grep of the relevant attribute names pre- and post-redesign).

### Dark mode / light mode
- **AC24** Dark mode is the default page-load theme (no flicker to light). Verification: open any page with no stored theme preference; computed `data-theme` on `<html>` is `"dark"`.
- **AC25** Toggling to light mode via Starlight's header toggle re-renders every page with the light token values applied and no element becomes invisible or low-contrast.

### Responsive
- **AC26** At mobile breakpoint (≤ 640px), the homepage hero renders without horizontal scroll, the sidebar is collapsed into Starlight's mobile drawer, and all touch targets on the home, news, and submit-skill pages are ≥ 44×44 CSS pixels.
- **AC27** At tablet (641–1024px), card grids on skills/news/tips adapt to a 1- or 2-column layout (verifiable by computed `grid-template-columns`).
- **AC28** At desktop (> 1024px), each marketing surface uses its full editorial layout; the centered narrow-column doc layout is not the default on marketing pages.

### Non-regression
- **AC29** `cd site && npm run build` exits with code 0 and no warnings about deprecations introduced by this redesign.
- **AC30** `cd site && npm test` reports ≥ 127 tests passing, 0 failing. Updated tests preserve equivalent coverage; new tests MAY be added.
- **AC31** Pagefind search opens from the Starlight header on a content page, returns results for a known query (e.g., the title of a published news item), and clicking a result navigates to the item.
- **AC32** All 11 sidebar entries from `astro.config.mjs` are reachable from a doc page and navigate to the correct route.
- **AC33** The dark-mode toggle in Starlight's header flips themes site-wide on every redesigned page.
- **AC34** Sign-in modal opens on Sign-in button click on `/my-pins/` and on the header chip; entering a valid PAT moves the user to signed-in state (visible chip with avatar + login).
- **AC35** AudienceFilter on `/news/` and `/skills/` toggles `.audience-hidden` on matching `[data-audience]` elements and persists choice to `localStorage.nbgaihub.audience`.

### Portability
- **AC36** A grep of the bespoke marketing surface files reveals no imports from `@astrojs/starlight/internal/*` or undocumented Starlight component paths. `<StarlightPage>` imports are allowed; deeper internals are not.
- **AC37** Removing the Starlight `customCss` entry temporarily and loading `tokens.css` standalone in a blank Astro page renders the tokens correctly (smoke test for token independence). This need not be wired as a CI test, but the implementer demonstrates it once during review.

### Definition-of-Done evidence
- **AC38** A screenshots/ folder or inline image set is captured during review showing each marketing surface at mobile, tablet, and desktop breakpoints in dark mode, plus one of them in light mode. Saved alongside this refined-request file (e.g. under `docs/refined-requests/ui-redesign-evidence/`).
- **AC39** A short evaluation script is documented inside this file (or in the same evidence folder) telling the user the exact steps to validate the redesign at `localhost:4321` — which pages to open, which interactions to try, which test commands to run.

## Assumptions

These were inferred from the context provided by the orchestrator and from the project documentation. They are listed so the user can challenge any of them before downstream phases run.

- **A1 — Approach is locked to Option 1 (keep Starlight).** The escalation gate to Option 2 happens after Phase 6 evaluation at `localhost:4321`. The spec therefore optimizes for portability (R11, AC36–AC37) so an escalation isn't wasted.
- **A2 — Aesthetic anchor.** "Apple-like" is interpreted as the **Linear / Vercel / Stripe** family of websites — Apple-influenced restraint, dark-mode-first, monospace accents, subtle gradients, motion-on-scroll, expressive typography, depth through shadow/color. Not skeuomorphic; not glassmorphic-as-default.
- **A3 — Display font choice.** Default proposal: **Inter** (variable, open license) for body + UI, **Geist** or **Inter Display** weights for display headlines, **JetBrains Mono** for monospace. All can be self-hosted or system-stack-fallbacked. If the user prefers a different anchor (e.g. **Söhne**, **Untitled Sans**, **EB Garamond + Geist**, etc.), the implementer adjusts during planning. The spec allows the implementer to choose during the design phase; the constraint is "one variable display + one body + one mono."
- **A4 — No motion library.** CSS transitions + `IntersectionObserver` are assumed sufficient. If the implementer wants `motion` (formerly framer-motion) or `gsap`, they justify it in the implementation plan and add it as a non-deprecated dep. No JS animation framework is mandated.
- **A5 — Marketing vs. content split.** "Marketing surfaces" = the 11 routes listed in scope (homepage, start-here pages, all pillar landing pages, my-pins, submit-skill, contribute, reference). "Content surfaces" = MDX-rendered detail pages such as `/news/[slug]`. The Day 1 journey page is treated as a **marketing surface** even though it renders content from a collection, because it is the canonical onboarding entry.
- **A6 — AudienceFilter UI.** The current basic three-checkbox toggle is in scope for **visual** redesign (per R4.6). Behavior is kept identical (three independent checkboxes persisting to `localStorage.nbgaihub.audience`). The implementer MAY restyle to look like a segmented control or filter chip group, but the underlying `<input type="checkbox">` elements remain real and the existing script continues to function. A pivot to radio-button-style "pick one of three" is NOT assumed; if the user wants that, raise it explicitly — it changes both behavior and test coverage.
- **A7 — `custom.css` 100-line cap is lifted.** Per orchestrator context, the cap from original design A6 no longer applies. The redesign produces a real design system; the existing `custom.css` MAY be absorbed into the new token files or retained for backward compatibility.
- **A8 — Hero imagery.** No external images are sourced. The homepage hero's "richer composition" (R4.4) is satisfied by typography + CSS/SVG visuals + a live data preview (e.g., latest news count or a small typographic showcase) — not stock photography.
- **A9 — Reduced-motion fallback.** When `prefers-reduced-motion: reduce` matches, scroll-triggered reveals are **skipped** (final state rendered immediately) rather than reduced to a shorter animation. This is the most accessible interpretation.
- **A10 — Pagefind UI styling.** Pagefind's search modal styling is **not** required to be deeply restyled in this workflow. Tokens propagate so the modal inherits the new accent/contrast, but the modal's structural design is left as-is (Pagefind UI styling is a deeper bespoke effort and is out of scope unless explicitly added later).
- **A11 — Glossary in-page search.** If Pagefind doesn't currently index the glossary page in a useful way, a small in-page filter input (vanilla JS, no new deps) is added. The implementer confirms during planning.
- **A12 — Light mode is best-effort.** Dark mode is the design target. Light mode passes contrast and works structurally, but the editorial lead is dark mode. If a trade-off arises, dark mode wins.
- **A13 — Test updates are permitted.** The 127 existing site tests are mostly unit tests of `lib/` modules and behavior — not DOM-structure snapshots. Where a test asserts a DOM shape that changes (e.g., a class name in `submit-skill.astro` form structure), the test is updated with an equivalent assertion. The count stays ≥ 127.
- **A14 — Sidebar structure unchanged.** The 11-entry sidebar in `astro.config.mjs` is preserved exactly. Visual styling of sidebar entries is in scope; entry labels, links, and ordering are not.
- **A15 — Out-of-scope items remain out-of-scope.** Specifically: production hosting, content edits, pipeline/plugin changes, and external imagery. These were already deferred per `SCOPE.md`.
- **A16 — Browser support floor.** Modern evergreen browsers (Chrome/Safari/Firefox/Edge current and one back). No IE, no legacy Safari fallbacks beyond what Astro/Starlight already ship.
- **A17 — Existing `lib/` modules are untouched.** All 8 modules (`auth.ts`, `api-fetch.ts`, `gist.ts`, `news.ts`, `pin-store.ts`, `skill-types.ts`, `slug.ts`, `submission.ts`) remain unchanged. Their public APIs are the contract the new components consume.
- **A18 — `build-pin-index.ts` unchanged.** The pre-build script and the `_data/<type>-index.json` shape are infrastructure, not design.

## Open Questions

These were not resolved during refinement and are surfaced so downstream phases can address them — but the orchestrator confirmed clarifying questions are not to be asked. Each has a default resolution noted.

- **Q1 — Specific font selection.** Default: Inter (body/UI) + Inter Display (or Inter at heavier weights) for headlines + JetBrains Mono. Resolved during the design phase by the implementer unless the user pushes back.
- **Q2 — Should the homepage include a live data element (e.g., "127 tests passing · 9 skills · 12 tips · 15 glossary terms" pulled from the AUTO blocks)?** Default: yes — fits the editorial tone and adds dynamism. If undesired, drop.
- **Q3 — Should AudienceFilter behavior change (multi-select checkboxes vs. single-select segmented control)?** Default: keep multi-select (A6). Behavior change is a separate request.
- **Q4 — Should the glossary get a dedicated alphabetical index / search box?** Default: yes (AC11 + A11). Small, no new deps.
- **Q5 — Should the legacy `custom.css` be deleted or absorbed?** Default: absorb into `tokens.css` + new `components.css` files; delete the standalone after migration.

## Definition of Done

This redesign is mergeable when **all** of the following hold:

1. **Build green.** `cd site && npm run build` exits with code 0, no new warnings about deprecations or removed APIs introduced by this redesign.
2. **Tests green.** `cd site && npm test` reports **≥ 127 passing, 0 failing**. Updated tests preserve coverage intent; new tests MAY be added.
3. **Lint clean.** Whatever lint runs in the project (Astro check, TypeScript `tsc --noEmit`, any prettier/eslint configured) reports zero new errors. (If the project has no formal lint task on `site/`, the `astro check` output is the bar.)
4. **No new deprecated dependencies.** A `npm ls` or `npm outdated` review on `site/` shows no newly added package marked deprecated.
5. **Design tokens documented.** `site/src/styles/tokens.css` (and any aggregated companions) exists and is loaded via `astro.config.mjs`. The token taxonomy is documented in `docs/design/project-design.md` (new §S.13 or equivalent).
6. **All 11 marketing surfaces ported.** Homepage, start-here/day-1, start-here/week-1, skills, news (index), tips, glossary, reference, contribute, my-pins, submit-skill all use the new bespoke layouts and satisfy their per-surface ACs.
7. **Content theme override applied.** `/news/[slug]/` and other Starlight-default-chrome pages reflect the new typography, code blocks, callouts, sidebar, and TOC styling.
8. **Accessibility audit clean.** axe-core or pa11y run on the homepage, `/skills/`, `/news/`, `/my-pins/`, `/submit-skill/`, and one news detail page reports zero contrast or ARIA violations in both dark and light modes.
9. **Reduced-motion honored.** Forcing `prefers-reduced-motion: reduce` (DevTools or Playwright emulation) collapses or skips all motion; no animation continues to run.
10. **Existing functional flows verified.** End-to-end:
    - Pagefind search returns results and navigates correctly.
    - AudienceFilter persists to `localStorage.nbgaihub.audience` and toggles cards.
    - PinButton + SignInModal complete an end-to-end pin on `/skills/` after PAT-paste sign-in.
    - `/my-pins/` hydrates the signed-in panel from the gist.
    - `/submit-skill/` validates, builds a URL, and redirects to GitHub's editor (or copies to clipboard for oversize payloads).
    - Dark-mode toggle flips themes site-wide.
    - Mobile drawer opens on small screens.
11. **Documentation updated.** `docs/design/project-design.md` has a new design-system section. Any new component or layout file carries the standard header comment block.
12. **Evidence captured.** Screenshots (or a recorded evaluation script) of each marketing surface at mobile/tablet/desktop in dark mode (plus one in light mode) are saved under `docs/refined-requests/ui-redesign-evidence/` so the user can validate offline before opening `localhost:4321`.
13. **Validation script documented.** A short ordered checklist appended to this refined-request file (or co-located in the evidence folder) tells the user exactly which pages to open at `localhost:4321`, which interactions to try, and which commands to run for the Phase-6 evaluation gate.
14. **No issues left dangling.** Any defects or inconsistencies found and not fixed during this workflow are registered in `Issues - Pending Items.md` with their context. The orchestrator's "anti-patterns observed" list is fully addressed (centered hero gone, uniform 18rem card grid gone, flat-color audience badges replaced, monospace accents introduced, expressive type system in place, motion + depth + scroll moments present).

## Validation script (for the Phase-6 evaluation gate)

To be filled in concretely by the implementer at the end of Phase 6, but the skeleton is:

1. `cd site && npm install` (if dependencies were added).
2. `cd site && npm run build` — confirm green.
3. `cd site && npm test` — confirm ≥ 127 passing.
4. `cd site && npm run dev -- --port 4321` (or `4322`+ if occupied per CLAUDE.md port rules).
5. Open `http://localhost:4321/` — confirm AC5 (homepage hero ≥ 80vh, asymmetric, headline ≥ 4rem desktop, not centered-two-button).
6. Walk every marketing surface in the order they appear in the sidebar — confirm each looks editorially distinct and matches its per-surface AC.
7. Open `/news/<a-published-slug>/` — confirm AC16–AC19 (content-detail theme override applied).
8. Resize to mobile (≤ 640px) via DevTools — confirm AC26.
9. Toggle light mode via Starlight's header — confirm AC25.
10. Tab through the homepage — confirm AC20 (focus rings visible).
11. Trigger Pagefind from the header on a content page — confirm AC31.
12. Sign in via the header → PAT paste → confirm chip appears.
13. Pin one skill, navigate to `/my-pins/` — confirm AC14 hydration.
14. Submit a (test) skill form → confirm GitHub editor opens with content pre-filled.
15. Force `prefers-reduced-motion: reduce` in DevTools — confirm AC22.

If steps 5–15 all pass and the user is satisfied, the workflow is complete. If the user is not satisfied, the escalation to Option 2 (replace Starlight entirely) is triggered.

## Original Request

> UI improvements needed — think of it as a sleek, clean, captivating Apple-like site. The current UI is outdated and not satisfactory.
