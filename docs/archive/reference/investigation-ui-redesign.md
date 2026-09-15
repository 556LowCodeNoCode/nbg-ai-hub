# Investigation: NbgAiHub UI Redesign — Execution Approaches Inside Option 1

## Executive Summary

The user has already committed to **Option 1 hybrid**: keep Starlight, build a portable design-token layer, use Starlight's `splash` template (and one custom `.astro` layout shim) for all 11 marketing surfaces, and apply a deep theme override on Starlight-chrome content pages via `--sl-*` re-mapping. This investigation does not re-litigate that decision. It picks the **execution approach inside Option 1** across 10 decision axes and produces a single coherent recommendation that the team can plan against in Phase 4.

Headline picks, axis by axis:

1. **Design-system construction** — **Pure CSS custom properties + Cascade Layers**, three-tier token architecture (primitives → semantic → component), no utility framework. Tailwind/UnoCSS would be a net negative for a 11-page docs-shaped site whose hardest constraint is portability to a non-Starlight stack.
2. **Starlight customization vector** — **Hybrid: `template: splash` + one thin shared `MarketingShell.astro` wrapper** for all 11 marketing surfaces, the existing `SocialIcons` slot override stays as-is, and a single content-page CSS override block (no Starlight component overrides for the content side).
3. **Motion strategy** — **No motion library**. CSS transitions + a tiny shared `IntersectionObserver` utility (~20 lines) + Astro's `<ClientRouter />` for view-transitions-on-navigation. Reach for a library only if the team needs gestures or layout animations later (they don't, for this redesign).
4. **Typography & font loading** — **Inter Variable (body/UI) + Inter Variable at display weights (headlines) + JetBrains Mono Variable**, all self-hosted via Astro 6's built-in Fonts API with the `fontsource` provider. Drop Geist as the display anchor — Inter Display weights satisfy the brief at zero additional bundle cost and zero second-font-loading concern.
5. **Pagefind integration** — **Lean on Pagefind's native `--pf-*` CSS variables**; declare a `data-pf-theme="dark"` mapping inside `tokens.css` that aliases `--pf-*` to the new tokens. No custom search component; no calling Pagefind's JS API directly. This is the cheapest way to meet A10.
6. **Component vocabulary** — **Hand-roll** all design-system primitives (Container, Section, Stack, Cluster, Card variants, Button, Badge, Chip, Kbd, Eyebrow, Lede, OrnamentalRule, MotionReveal). Adopting bejamas/ui or WebcoreUI would couple the project to Tailwind v4 or another vendor's token names — directly against R11 portability.
7. **Dark-mode-first execution** — **`[data-theme="dark"]` / `[data-theme="light"]` attribute-scoped tokens** (works natively with Starlight's existing toggle). `light-dark()` is supported everywhere relevant in 2026 but offers no decisive advantage here because Starlight's toggle already drives an attribute — and `light-dark()` would force more churn at the `--sl-*` re-mapping layer.
8. **View Transitions API** — **Adopt via Astro's `<ClientRouter />`** for cross-page navigation; do not use it as a replacement for scroll-reveal motion. View Transitions answer the "Apple-like flow between pages" feel cleanly; scroll reveals answer a different prompt (in-viewport emphasis on long surfaces) and the two are complementary, not redundant.
9. **Glossary in-page search** — **Hand-roll a ~30-line vanilla-JS filter input**. Pagefind would over-fetch and the dropdown UX clashes with editorial layout; a build-time anchor index doesn't satisfy filter-as-you-type.
10. **Homepage live data element** — **Read content collections directly via `getCollection()` at build time** in the homepage's frontmatter. The `public/_data/*.json` files exist for client-side hydration of `/my-pins/`, not for build-time aggregation; parsing `SCOPE.md` AUTO blocks is wrong-layer.

The decisions across these 10 axes form a coherent recommendation: **a flat, dependency-light, token-centric redesign that keeps Starlight in place but treats every Starlight surface as a styling target — not a layout authority**. Portability (R11, AC36–AC37) is preserved end-to-end: removing Starlight after Phase 6 means rewriting `MarketingShell.astro` (~50 lines) and dropping the `--sl-*` alias block from `tokens.css`. Everything else moves verbatim.

## Context

**What was investigated:** the 10 decision axes inside the already-committed Option 1 hybrid approach.

**Why now:** Phase 2 produced the refined request (39 ACs, 18 assumptions). Phase 3a (this document) eliminates ambiguity in *how* the implementation will be built so Phase 4 can plan against a single concrete path. The investigation deliberately does not re-open Option 1 vs Option 2 — that decision is gated on Phase 6 user evaluation.

**Key constraints driving evaluation:**

- **Portability** (R11, AC36–AC37): tokens defined as `--color-*` first, mapped to `--sl-*` second. Bespoke layouts must import only from `astro:content`, `site/src/lib/`, and `site/src/styles/` — no `@astrojs/starlight/internal/*`.
- **Test floor**: ≥127 site tests passing post-redesign (current count is the floor, not the ceiling).
- **Zero new deprecated deps**; one font ceiling if web-loaded; no external imagery.
- **Browser floor**: evergreen Chrome/Safari/Firefox/Edge + one back (A16). All 2026-era modern CSS features assumed available.
- **Test runner**: Vitest 4.x node-env, 7 test files. None of these are DOM snapshots — they're unit tests of `lib/` modules, all of which the redesign leaves untouched. Updating test selectors will be required only for cosmetic class-name changes; coverage intent stays.
- **No backend.** All behavior is build-time SSG + client islands.

**Reference docs read in full:**

- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/ui-redesign.md` — 39 ACs, 18 assumptions, 5 open questions.
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/codebase-scan-ui-redesign.md` — 10 components, 11 marketing pages, 1 content surface, 7 test files.
- `/Users/suzy/ClaudeCode/Projects/NbgAiHub/CLAUDE.md` + `SCOPE.md` — project conventions, port discipline, current state.

---

## Axis 1 — Design-System Construction Approach

### Options Identified

**Option 1A — Pure CSS custom properties + Cascade Layers (three-tier tokens)**
- **Description:** Define primitive tokens (`--color-slate-900`, `--space-4`, `--radius-md`), semantic tokens that reference primitives (`--surface-default`, `--text-primary`), and component tokens that reference semantic (`--button-bg-primary`). Layer ordering enforced via `@layer reset, tokens, base, components, utilities;`. Remap `--sl-color-*` etc. as the last step.
- **Strengths:** Zero new dependency. Survives a Starlight rip-and-replace verbatim — the `@layer` declaration and primitives travel; only the `--sl-*` alias block gets dropped. Native browser support (Cascade Layers shipped to all evergreen browsers in 2022). Three-tier discipline is the dominant 2026 production pattern. Direct match for R1 and R11.
- **Weaknesses:** Hand-writes ~250 lines of token CSS up front. No utility-class velocity for one-off layout work — though for an editorial-design redesign, "one-off layout" is rare; most components want bespoke composition anyway.
- **Effort/Complexity:** Medium (token enumeration is the time sink; the architecture itself is trivial).
- **Risk:** Low.
- **Best suited when:** Portability is a hard constraint, the page count is small, and the aesthetic is bespoke editorial rather than utility-driven.

**Option 1B — Add Tailwind CSS v4 via `@astrojs/starlight-tailwind`**
- **Description:** Install Tailwind v4, use Starlight's first-party Tailwind bridge, define tokens via `@theme` in `global.css`.
- **Strengths:** Faster prototyping of one-off layouts. Tailwind v4's `@theme` block is itself a CSS-custom-property emitter, so portability isn't completely destroyed. Strong ecosystem (bejamas/ui components, shadcn-style copy-and-own).
- **Weaknesses:** Tailwind's Preflight reset conflicts with Starlight's base styles unless the bridge order is exactly right (documented gotcha). Setting `--sl-color-accent` in CSS while also defining `--color-accent-*` in `@theme` creates **two sources of truth** for the same token — directly violates R11.1. Adds a non-trivial dependency to a project whose escalation path is "throw out Starlight" — and Tailwind's churn (v3→v4 was a major migration) means it's also a future-maintenance liability. The 11-page surface area doesn't repay Tailwind's onboarding cost.
- **Effort/Complexity:** High (mixing Tailwind tokens with Starlight tokens is the documented hard part).
- **Risk:** Medium-High — the two-sources-of-truth failure mode is a real one.
- **Best suited when:** Page count is in the dozens or you need rapid one-off layout iteration across many surfaces.

**Option 1C — UnoCSS or Vanilla Extract (utility / type-safe alternatives)**
- **Description:** Lighter-weight utility framework (UnoCSS) or TypeScript-typed CSS-in-JS (Vanilla Extract).
- **Strengths:** UnoCSS is ~5× smaller than Tailwind at runtime; Vanilla Extract gives compile-time CSS with TypeScript types.
- **Weaknesses:** Adds a build-time dependency that the project doesn't currently have. No Starlight bridge equivalent. Adds escape-hatch complexity (Option 2 escalation has to migrate off it). Adds churn risk.
- **Effort/Complexity:** Medium-High.
- **Risk:** Medium.
- **Best suited when:** Team has prior experience with the chosen utility framework; this redesign would not.

### Recommendation

**Option 1A — Pure CSS custom properties + Cascade Layers**, three-tier token architecture.

Justification:
- The refined spec already names "CSS custom properties + Cascade Layers" as the default expectation. The investigation confirms this is genuinely the best choice, not just the default.
- The 11-marketing-page surface area is too small to repay Tailwind's onboarding cost or its two-sources-of-truth risk against R11.
- Cascade Layers + `@layer tokens` give exactly the override predictability the redesign needs when remapping `--sl-*` variables (Starlight's defaults sit in an unlayered cascade; layered tokens always win, and the existing Starlight team-recommended pattern of just defining `:root { --sl-color-* }` continues to work as a fallback).
- Three-tier (primitives → semantic → component) gives Phase 4 a clear structure for the 60+ tokens AC1 requires.

When this recommendation would change: only if the team commits to Tailwind for the rest of the project (not just this redesign). It is not a fit for "try Tailwind for one feature."

---

## Axis 2 — Starlight Customization Vector for Marketing Surfaces

### Options Identified

**Option 2A — `template: splash` + bespoke component blocks (current homepage pattern)**
- **Description:** Each marketing page becomes a `.astro` file that sets `frontmatter.template = 'splash'` (or uses `<StarlightPage frontmatter={{ template: 'splash' }}>`) and composes hand-written sections inside. The current homepage (`src/content/docs/index.mdx`) already follows this pattern.
- **Strengths:** Native Starlight feature — no escape-hatch tricks. Page still indexed by Pagefind. Header, footer, and theme toggle still work without re-wiring. Mobile drawer still opens. Sidebar can be left visible or hidden via additional config. **Minimum disturbance to R10 non-regression.**
- **Weaknesses:** Splash template keeps Starlight's header, footer, and theme-provider wrapper — you don't get a fully blank canvas. Some Starlight default styles still cascade in, requiring explicit unsetting where they conflict.
- **Effort/Complexity:** Low.
- **Risk:** Low.

**Option 2B — Full custom Astro layouts that bypass Starlight's layout component entirely**
- **Description:** Marketing pages become bare `.astro` routes that don't use `<StarlightPage>`, instead importing only `<ClientRouter />` (or similar) and rendering directly into `<html><body>`. Sidebar disappears, Pagefind disappears, theme toggle disappears — implementer rebuilds whatever they want to keep.
- **Strengths:** Maximum visual freedom. Fully bespoke.
- **Weaknesses:** Loses Starlight chrome on those pages — which means losing the sidebar, the header search affordance, and the dark-mode toggle unless re-implemented. **Direct conflict with AC32 (all 11 sidebar entries reachable from a doc page)** because there's no shared header doing the routing. Direct conflict with AC31 (Pagefind opens from header on a content page). Implementer has to either accept "marketing pages have no header" — confusing UX — or reproduce Starlight's header by hand. Reproducing the header is exactly the work Option 2 (replace Starlight entirely) does; doing it inside Option 1 is wasted effort.
- **Effort/Complexity:** High.
- **Risk:** High — likely test-suite regressions, likely UX inconsistency.

**Option 2C — Component slot overrides at depth (replace Header, ThemeProvider, etc.)**
- **Description:** Use Starlight's `components` config to swap out `<Header>`, `<Sidebar>`, `<TableOfContents>`, etc., each replaced by a custom Astro component.
- **Strengths:** Surgical control over each piece of Starlight chrome. Token-driven styling still works.
- **Weaknesses:** Layout component overrides come with significant complexity (per Starlight docs — they explicitly recommend overriding lower-level components when possible). You take on the full prop contract of every overridden Starlight component, and Starlight version bumps can break those contracts. The refined spec only requires *visual* override, not behavioral replacement. Overkill.
- **Effort/Complexity:** High.
- **Risk:** Medium-High (Starlight's `<PageFrame>` / `<TwoColumnContent>` have named slots that must be transferred — easy to miss).

**Option 2D — Hybrid: `template: splash` + one shared `MarketingShell.astro` wrapper + retain existing `SocialIcons` slot override only**
- **Description:** Build one `MarketingShell.astro` Astro component (~80 lines) that wraps each marketing page's content. It sets `<StarlightPage frontmatter={{ template: 'splash', title, hero }}>` or equivalent, opens a tokenized `<main data-marketing>` region with a `data-surface="news"` style hook, and slots in the page's body. The existing `SocialIcons` slot override (sign-in chip) stays. No other Starlight slots are overridden.
- **Strengths:** Combines Option 2A's safety with the reusability the 11-page surface needs. The 11 pages then become ~30-line files that compose tokenized primitives inside `<MarketingShell>`. Tests that target `<main>` or page-level selectors are stable. Portability stays intact because `MarketingShell` itself imports only from `astro:content`, `src/lib`, and `src/styles`.
- **Weaknesses:** Still inherits some Starlight default styles via cascade — but tokens + cascade layers handle those. Adds one new shared layout component to maintain.
- **Effort/Complexity:** Low-Medium.
- **Risk:** Low.

### Recommendation

**Option 2D — Hybrid: `template: splash` + `MarketingShell.astro` + existing `SocialIcons` override only.**

Justification:
- Option 2D is the only path that satisfies R2 (bespoke layouts), R10 (non-regression), R11 (portability), and AC31/AC32 (search + sidebar must keep working) simultaneously.
- Building one shared shell avoids 11-times-duplicated layout boilerplate while keeping each surface free to compose its own internal sections.
- Test rewriting cost: minimal. The 127 existing site tests are mostly unit tests of `lib/` modules (104 of 127 are pure unit tests with no DOM); the remaining ~23 (PinButton, modal, build-pin-index integration) target behavior, not DOM structure. Updating class-name assertions in the few that do is a 30-minute job.
- What 2D gives up vs 2B: a fully blank header on marketing pages. The refined spec doesn't ask for that, and AC31/AC32 actively forbid it.
- What 2D gives up vs 2C: surgical replacement of `<Sidebar>` etc. The refined spec only asks for **visual** restyling of the sidebar (AC17 — "new visual treatment"), which CSS-only overrides cover.

When this recommendation would change: if the user, after Phase 6, says "the splash template's residual Starlight chrome is a visual blocker" — that's an Option 2 escalation signal, not a fix within Option 1.

---

## Axis 3 — Motion Strategy

### Options Identified

**Option 3A — Pure CSS transitions + vanilla `IntersectionObserver`**
- **Description:** All hover/focus micro-interactions in CSS (`transition: transform 200ms var(--ease-standard)`). Scroll reveals via a single shared `<script>` (`site/src/scripts/motion-reveal.ts`, ~20 lines) that grabs all `[data-reveal]` elements and toggles a class when they cross the viewport threshold.
- **Strengths:** Zero new dependency. Zero bundle cost. Tiny code surface. Trivial to disable under `prefers-reduced-motion: reduce`. Compositor-thread CSS transitions are the smoothest interaction primitive available.
- **Weaknesses:** No layout animations (e.g., FLIP). No gesture handling. No declarative `whileInView` syntax (verbose-er at the call site). For a 11-page site without gestures or layout animations, none of this is relevant.
- **Effort/Complexity:** Low.
- **Risk:** Low.

**Option 3B — Motion (formerly framer-motion) / `motion/react`**
- **Description:** Install `motion`, use `whileInView` for reveals, `useScroll`/`useTransform` for scroll-linked parallax.
- **Strengths:** Declarative API. Pooled IntersectionObserver under the hood. Native `ScrollTimeline` integration where available.
- **Weaknesses:** ~32–85 KB minified added to a site with no React (Motion's primary export is React-flavored — `motion/react`). Requires React or Solid as a render target. The refined spec assumes vanilla Astro + Astro client-island scripts. Bringing in React just to drive reveals is wrong-shaped. There is also `@motionone/dom` (the framework-agnostic flavor) at ~10 KB, but at that point you're paying 10 KB for what 20 lines of vanilla JS provides.
- **Effort/Complexity:** Medium.
- **Risk:** Medium (introduces a runtime dependency the project doesn't currently have).

**Option 3C — Astro's `<ClientRouter />` for page transitions only**
- **Description:** Add `<ClientRouter />` once in the shared `MarketingShell.astro`. Cross-page navigation gets View Transition API animation (fade by default, customizable via `transition:name` / `transition:animate` directives). No motion library installed. This is complementary to 3A — not a replacement.
- **Strengths:** Zero new dependency (it's part of `astro`). Hardware-accelerated. Falls back gracefully on older browsers (Firefox <144 simulates). Honors `prefers-reduced-motion` automatically. Gives the "Apple-like flow between pages" feel directly.
- **Weaknesses:** Adds a small client-side router runtime (single-page-app-style routing). Scripts on pages need to re-initialize on navigation events — a known consideration. The existing client scripts in `PinButton.astro`, `SocialIconsOverride.astro`, `SignInModal.astro`, `my-pins.astro`, `submit-skill.astro`, `AudienceFilter.astro` all use `DOMContentLoaded` or top-level execution and would need to listen for `astro:page-load` instead (or be wrapped in a `document.addEventListener('astro:page-load', initFn)` pattern).
- **Effort/Complexity:** Medium (script re-initialization is the work).
- **Risk:** Medium — touches every client-side script in the codebase. **This is the largest hidden cost in this investigation.**

**Option 3D — Native CSS `@view-transition` at-rule (cross-document, no JS)**
- **Description:** Add `@view-transition { navigation: auto; }` to global CSS. Browser handles the rest, no JS router.
- **Strengths:** Truly zero JS. Cross-document. Works in Chrome 111+, Safari 18+, and Firefox 144+ (shipped Sept 2025).
- **Weaknesses:** Less control than `<ClientRouter />`. `transition:persist` does not work cross-document (audio players, persistent state survive navigation). No fallback simulation for older browsers — they just get full page reloads, which is fine but feels different. Sign-in modal state and PinButton optimistic UI would reset across navigations.
- **Effort/Complexity:** Very Low.
- **Risk:** Low — but the redesign would not get cross-page state preservation, which the existing sign-in chip relies on (it doesn't currently use SPA navigation, so this is not a regression).

### Recommendation

**Hybrid: 3A (CSS transitions + vanilla IntersectionObserver, ~20 lines) for in-page motion, plus 3D (native `@view-transition`) for cross-page navigation. Defer 3C unless the script re-init cost is shown to be cheap during planning.**

Justification:
- 3A is the right answer for in-page motion. Scroll reveals on this site are ~5–10 elements total across 11 pages; a 20-line IntersectionObserver utility with `data-reveal` markup is dramatically simpler than installing a library.
- 3D (native `@view-transition`) gives the cross-page polish without touching any existing script. **This is the cheapest win in the whole investigation.** Browser support is universal across the project's evergreen floor.
- 3C (`<ClientRouter />`) is tempting but pays for its bundle size with disruption to 5 client-side scripts. Recommend keeping it in reserve for Phase 6 evaluation; if the user wants stronger inter-page transitions and the script-init cost turns out to be small, swap in.
- All three options respect `prefers-reduced-motion: reduce` natively. AC22 is satisfied by any combination.

When this recommendation would change: if scroll reveals creep past ~15 elements and need orchestration (staggered reveal, parallax with scrub), reach for `@motionone/dom` (~10 KB, framework-agnostic). Not now.

---

## Axis 4 — Typography & Font Loading

### Options Identified

**Option 4A — Inter (body/UI) + Inter Display weights (headlines) + JetBrains Mono Variable, self-hosted via Astro Fonts API**
- **Description:** One typeface family (Inter), one mono (JetBrains Mono). Self-hosted via Astro 6's built-in Fonts API with `fontsource` provider. Variable axes exposed: `wght` 100–900, `slnt` (Inter), `opsz` if available. `font-display: swap`. Preload only the headline-weight subset for above-the-fold.
- **Strengths:** Inter is the de facto neutral, dark-mode-friendly UI workhorse — used by Linear, GitHub, MUI, dozens of dev tools. It has a "Display" optical-size axis available in Inter Variable that handles headlines without needing a second font file. JetBrains Mono is the mature, no-license-issue mono baseline. **One font family + one mono = strictly within the refined spec's "one variable display + one body + one mono" ceiling, while using only two `.woff2` files total** (one Inter variable, one JetBrains Mono variable).
- **Weaknesses:** Inter is well-loved but less distinctive than Geist. "Linear/Vercel uses Geist, why don't we?" is the obvious pushback — answered below.
- **Effort/Complexity:** Low.
- **Risk:** Low.

**Option 4B — Geist Sans + Geist Mono via `@fontsource-variable/geist-sans` + `@fontsource-variable/geist-mono`**
- **Description:** Geist for body and headlines, Geist Mono for code.
- **Strengths:** Distinctive Vercel/Linear-aesthetic anchor. Geist has stylistic sets (`ss02`, `ss03`, `ss04`) that change tone — Swiss, rounded, sharp. Genuine character. Variable, OFL-licensed.
- **Weaknesses:** Geist's geometry is more opinionated; less neutral for long-form reading. Two font families = two `.woff2` files at minimum. Stylistic sets only work via NPM/Fontsource, not Google Fonts — fine for self-hosting, just a discoverability footnote. Geist's text glyph design is slightly heavier than Inter, which can be a small contrast risk in dark mode for long-form (AC21 contrast requirement).
- **Effort/Complexity:** Low.
- **Risk:** Low-Medium (contrast risk on body copy in dark mode — addressable with token tuning).

**Option 4C — Söhne / Untitled Sans / a paid foundry display + free body**
- **Description:** A paid display font for distinctiveness.
- **Strengths:** Distinctive.
- **Weaknesses:** Paid. Refined spec is explicit: "Söhne (paid — out)". Eliminated.
- **Effort/Complexity:** N/A.
- **Risk:** N/A.

**Option 4D — System font stack only (no web font)**
- **Description:** `font-family: ui-sans-serif, -apple-system, system-ui, ...` for body and display.
- **Strengths:** Zero bytes. Zero FOIT/FOUT. Matches the device's native UI feel — which is itself Apple-like on macOS/iOS.
- **Weaknesses:** No control over typography across platforms. Windows users get Segoe, macOS users get SF Pro, Linux users get whatever — three different visual identities. The brief is "Apple-like" but also "Linear/Vercel/Stripe" — and those sites use web fonts precisely to defeat platform drift.
- **Effort/Complexity:** Very Low.
- **Risk:** Low-Medium — accepts platform inconsistency.

### Recommendation

**Option 4A — Inter Variable + JetBrains Mono Variable**, self-hosted via Astro Fonts API.

Justification:
- Inter Variable + the `opsz` axis gives expressive display headlines (R6.1, AC5: ≥4rem desktop is comfortable at Inter's heaviest weight with letter-spacing tightening) without needing a second font file.
- "One variable display + one body + one mono" — Inter satisfies *both* display and body slots via a single variable file. JetBrains Mono fills the third. Total cost: 2 woff2 files (~100 KB total, gzipped much less).
- Geist (4B) is the close runner-up and would not be a wrong choice. The argument for Inter over Geist is **lower risk** (neutral body; less contrast risk for long-form news articles in dark mode) and **lower bundle** (single family). If the user explicitly wants the Vercel-aesthetic flavor, swap Inter for Geist — the decision is reversible and the implementation cost is identical.
- Astro Fonts API gets fallback metric-matching for free (auto-generated metric-matched fallbacks prevent CLS during font load) — solves a real layout-shift problem that hand-rolled `@font-face` declarations don't.

**Exact stack to wire in Phase 4:**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  experimental: {
    fonts: [
      {
        name: 'Inter',
        cssVariable: '--font-body',
        provider: 'fontsource',
        weights: ['100 900'],          // variable, full range
        styles: ['normal', 'italic'],
        fallbacks: ['system-ui', 'sans-serif'],
      },
      {
        name: 'JetBrains Mono',
        cssVariable: '--font-mono',
        provider: 'fontsource',
        weights: ['400 700'],
        styles: ['normal'],
        fallbacks: ['ui-monospace', 'monospace'],
      },
    ],
  },
  integrations: [starlight({ /* ... */ })],
});
```

Then `--font-display` aliases to `--font-body` in `tokens.css` — the Display effect is achieved with weight + tracking, not a separate family.

When this recommendation would change: if the user, on first preview, says "this still looks too neutral, I want the Vercel flavor" — swap Inter for Geist Sans + Geist Mono. Same architecture, one config change.

---

## Axis 5 — Pagefind Integration After Redesign

### Options Identified

**Option 5A — CSS-only override via Pagefind's native `--pf-*` variables**
- **Description:** Pagefind's modern Component UI exposes ~25 CSS custom properties (`--pf-text`, `--pf-background`, `--pf-border`, `--pf-shadow-sm/md/lg`, `--pf-outline-focus`, etc.). Add a block to `tokens.css` aliasing each `--pf-*` to a project token. Dark mode handled via `data-pf-theme="dark"` attribute or via `prefers-color-scheme` block.
- **Strengths:** Zero JS. Zero new component. Native Pagefind extension point — won't break on Pagefind upgrades. Fits R11 portability (the `--pf-*` block is also dropped along with `--sl-*` if Starlight leaves; Pagefind continues to work as a standalone search). Directly satisfies A10's "tokens propagate, deep restyling out of scope."
- **Weaknesses:** Doesn't restyle the modal's structural layout (button positions, result-list density). A10 explicitly says this is out of scope, so this isn't a real weakness.
- **Effort/Complexity:** Low.
- **Risk:** Low.

**Option 5B — Custom Astro search component that calls Pagefind's JS API directly**
- **Description:** Write a custom `<HubSearch>` component that imports `/pagefind/pagefind.js` at runtime, runs queries, renders results in the project's own card style.
- **Strengths:** Full control over UX.
- **Weaknesses:** Replaces the entire Starlight header search affordance, which depends on Starlight's own component override mechanism. A10 explicitly excludes this. Adds significant ongoing maintenance: Pagefind's JS API can change between versions.
- **Effort/Complexity:** High.
- **Risk:** Medium.

**Option 5C — Use older legacy `pagefind-ui.css` `!important` overrides**
- **Description:** Target `.pagefind-ui__*` classes with `!important` rules to force colors.
- **Strengths:** Works on Pagefind's legacy UI.
- **Weaknesses:** `!important` is a maintenance liability. The community gotcha thread shows users hitting this specifically because Pagefind's CSS is aggressive. Modern Pagefind Component UI uses the `--pf-*` variable surface (5A) — preferring the legacy path is backwards.
- **Effort/Complexity:** Medium.
- **Risk:** Medium.

### Recommendation

**Option 5A — `--pf-*` variable aliasing in `tokens.css`**.

Justification:
- A10 is explicit that deep modal restyling is out of scope and token propagation is in scope. 5A is the literal minimum-viable implementation of that line.
- It composes cleanly with Starlight: Starlight wires Pagefind by default; the user sees a search affordance in the header (AC31 satisfied unchanged); the modal opens with project-tokenized colors via CSS variables.
- Dark mode: write a `[data-theme="dark"] :where(pagefind-searchbox, pagefind-ui) { --pf-background: var(--surface-elevated); ... }` block. Mirror for light. Both branches drop in cleanly.

When this recommendation would change: if the user, post-Phase-6, says "the search modal feels alien" — that's a follow-on scope item, not part of this redesign.

---

## Axis 6 — Pre-Built Component Vocabulary for the Design System

### Options Identified

**Option 6A — Hand-roll all primitives**
- **Description:** Write Container, Section, Stack, Cluster, Card (feature/content/link/stat variants), Button (3 variants), Badge, Chip, Kbd, OrnamentalRule, Display, Lede, Eyebrow, MotionReveal as plain `.astro` components in `site/src/components/primitives/`. Each is ~15–60 lines.
- **Strengths:** Zero new dependency. Full control. Token-only — every component uses `--color-*`, `--space-*`, `--font-*` and nothing else. Portable verbatim under R11.
- **Weaknesses:** Up-front writing effort.
- **Effort/Complexity:** Medium.
- **Risk:** Low.

**Option 6B — Adopt bejamas/ui (Astro-native, Tailwind v4-based, copy-and-own)**
- **Description:** Copy bejamas/ui components into `site/src/components/`. Replace their Tailwind classes with token references.
- **Strengths:** Production-tested starting point. shadcn-style philosophy: components live in your codebase, no black-box dep.
- **Weaknesses:** Coupled to Tailwind v4. Removing Tailwind means rewriting every adopted component. Replacing Tailwind classes with hand-rolled CSS during adoption negates most of the speedup. Adds an aesthetic that isn't this project's.
- **Effort/Complexity:** Medium-High (the de-Tailwinding is the cost).
- **Risk:** Medium.

**Option 6C — Adopt WebcoreUI or daisyUI**
- **Description:** Install WebcoreUI (NPM) or daisyUI (Tailwind plugin) and consume their components.
- **Strengths:** Fast to start.
- **Weaknesses:** Adds a runtime dependency or a Tailwind dependency. Their token systems are not the project's. R11 portability suffers.
- **Effort/Complexity:** Low to start, High to maintain.
- **Risk:** Medium-High.

**Option 6D — Use Starlight's own slot-overridable components as primitives**
- **Description:** Lean on `<StarlightPage>`, `<Card>`, `<LinkCard>`, etc. that Starlight ships.
- **Strengths:** Already in the dependency tree.
- **Weaknesses:** They are not styled the way the redesign wants. Restyling them via CSS overrides hits the same "scoped styles can't be overridden via customCss" gotcha that Starlight's docs flag. Imports like `@astrojs/starlight/components/Card.astro` are not in the supported public override surface — using them risks R11 portability and AC36.
- **Effort/Complexity:** Low to start, High to debug.
- **Risk:** Medium-High.

### Recommendation

**Option 6A — Hand-roll all primitives.**

Justification:
- The component vocabulary the redesign needs is small (~13 primitives) and tightly coupled to the token system. Hand-writing them in 1–2 days yields exact-fit components that survive a Starlight exit verbatim.
- All adoptable libraries (6B, 6C) introduce a different token vocabulary, requiring re-mapping work that approximates the cost of hand-writing.
- Starlight's own components (6D) are not in the supported override surface (`@astrojs/starlight/internal/*` is forbidden by AC36) and have the documented "scoped styles win" override gotcha.
- The hand-rolled set should live in `site/src/components/primitives/` so it is **conceptually separate from existing components**. The existing 10 components (HomeHero, PinButton, etc.) become **consumers** of primitives, not primitives themselves. After Phase 4, `Card.astro` is a primitive, `NewsCard.astro` is a consumer that wraps it.

Specific component list to write (Phase 4 will refine):

| Primitive | LOC estimate | Purpose |
|---|---|---|
| `Container.astro` | 15 | Width-capped wrapper with side padding |
| `Section.astro` | 30 | Full-bleed section with vertical rhythm tokens, optional gradient wash |
| `Stack.astro` | 15 | Vertical rhythm with `--gap` prop |
| `Cluster.astro` | 15 | Horizontal flex layout for chip rows, CTA rows |
| `Card.astro` | 60 | Variants: `feature`, `content`, `link`, `stat` |
| `Button.astro` | 50 | Variants: `primary`, `secondary`, `ghost`; sizes |
| `Badge.astro` | 25 | Semantic colored badge (replaces audience badge) |
| `Chip.astro` | 25 | Tag chip (replaces `.topic-chip`) |
| `Kbd.astro` | 15 | Keyboard shortcut display |
| `Eyebrow.astro` | 15 | Pre-heading label (monospace, uppercase) |
| `Lede.astro` | 15 | First-paragraph display treatment |
| `OrnamentalRule.astro` | 20 | Decorative section divider |
| `Display.astro` | 25 | Display heading with optical-size tightening |
| `MotionReveal.astro` | 30 | `[data-reveal]` wrapper for IntersectionObserver script |

Total: ~360 LOC across 14 files. Plus `motion-reveal.ts` (~25 LOC).

---

## Axis 7 — Dark-Mode-First Execution

### Options Identified

**Option 7A — `[data-theme="dark"]` / `[data-theme="light"]` attribute-scoped tokens**
- **Description:** Define `:root { /* dark values */ }` and `:root[data-theme="light"] { /* light overrides */ }`. Starlight's existing toggle flips the attribute on `<html>`.
- **Strengths:** Works with Starlight's existing toggle natively. Zero JavaScript change. Easy to scope; easy to debug.
- **Weaknesses:** Duplicates the token list once for dark and once for light. As the system grows, drift between branches is a known maintenance risk.
- **Effort/Complexity:** Low.
- **Risk:** Low.

**Option 7B — `light-dark()` function for adaptive tokens**
- **Description:** `--surface-default: light-dark(#fff, #0f0f0f);` — one declaration, browser picks based on `color-scheme`.
- **Strengths:** Half the token volume. No drift between branches. Cleaner.
- **Weaknesses:** Requires `color-scheme: light dark` on `:root` to engage. Starlight's toggle writes `data-theme` — not `color-scheme`. To make `light-dark()` respond to the toggle, you have to either (a) add JavaScript that writes `color-scheme: dark` / `color-scheme: light` based on the toggle, or (b) use the Dave Rupert pattern (toggle sets `color-scheme` via a variable). Either way: extra work to bridge between Starlight's toggle and the function. Browser support is fine in 2026; the friction is integration, not capability.
- **Effort/Complexity:** Medium (the toggle bridge).
- **Risk:** Low-Medium.

**Option 7C — `color-mix()` for derived tokens (e.g., hover states from base colors)**
- **Description:** Define base tokens; derive hover/active states via `color-mix(in oklch, var(--accent), white 10%)`.
- **Strengths:** Half the hover-state tokens.
- **Weaknesses:** Reads less clearly than explicit token names. Useful as a utility within 7A or 7B, not as an alternative to either.
- **Effort/Complexity:** Low.
- **Risk:** Low.

### Recommendation

**Option 7A (attribute-scoped tokens) as the primary mechanism, with `color-mix()` (7C) used selectively for hover/active derivations.**

Justification:
- 7A is what Starlight's toggle already does for `--sl-*` variables. Adopting the same pattern means **zero JS changes to the toggle** and matches how every Starlight tutorial demonstrates customization.
- 7B (`light-dark()`) is cleaner in theory but requires bridging between Starlight's toggle and `color-scheme` — net friction with no payoff at the 60-token scale this project operates at. If the token list grows past ~200, revisit.
- 7C (`color-mix`) is useful at the component-token tier (e.g., `--button-bg-hover: color-mix(in oklch, var(--button-bg), white 8%);`). Apply where it reduces token sprawl without sacrificing clarity.

The duplication risk that motivates 7B is largely a non-issue at this project's scale and team size — the contrast-audit gate (AC21) catches drift before it ships.

---

## Axis 8 — View Transitions API in Astro

### Options Identified

**Option 8A — Skip view transitions entirely**
- **Description:** Pages navigate via full reload.
- **Strengths:** Simplest. No script changes.
- **Weaknesses:** No "Apple-like flow between pages" — leaves a gap against the aesthetic anchor.
- **Effort/Complexity:** Zero.
- **Risk:** Zero.

**Option 8B — Native `@view-transition` at-rule (cross-document, no Astro router)**
- **Description:** Add `@view-transition { navigation: auto; }` to global CSS. Browser handles the cross-document fade.
- **Strengths:** Zero JS. Zero Astro-router footprint. Works in all evergreen browsers from Firefox 144 onward (Sept 2025). Falls back to a normal navigation in older browsers — no broken UX.
- **Weaknesses:** No `transition:persist` (audio/video continuity). No `transition:name` element morphing across pages. For this redesign, neither is needed.
- **Effort/Complexity:** Very Low.
- **Risk:** Low.

**Option 8C — `<ClientRouter />` (Astro's enhanced client-side router)**
- **Description:** Add `<ClientRouter />` to `MarketingShell.astro`. SPA-style navigation with view transitions everywhere, plus `transition:persist` for SignInModal/SocialIconsOverride header chip state.
- **Strengths:** Better control. Element morphing via `transition:name`. Persistent header chip across navigations (auth state stays mounted).
- **Weaknesses:** Forces every client script in the codebase to listen for `astro:page-load` instead of `DOMContentLoaded`. Touches 5 files (PinButton, SocialIconsOverride, SignInModal, my-pins, submit-skill, AudienceFilter). Bundle size: small but non-zero. Will require test updates in PinButton/SignInModal/auth tests if any of them assume `DOMContentLoaded`-only mount.
- **Effort/Complexity:** Medium.
- **Risk:** Medium.

### Recommendation

**Option 8B — Native `@view-transition` at-rule.** Defer 8C to a follow-on.

Justification:
- 8B is the highest-value-per-effort change in this entire investigation. One line in global CSS. Works in all browsers that fall within the project's evergreen floor (A16). Falls back gracefully.
- The persistent-element story (header chip surviving navigation) is a nice-to-have but not in any AC. If user evaluation in Phase 6 says "the auth chip flicker on navigation is jarring," that's the trigger to escalate to 8C — at which point the script-re-init work is justified.
- 8B does not replace scroll-reveal motion (Axis 3). View Transitions answer cross-page; scroll reveals answer in-page emphasis. They are complementary.

When this recommendation would change: if the auth-chip flicker is a Phase 6 blocker, escalate to 8C. Don't pre-pay that complexity now.

---

## Axis 9 — Glossary In-Page Search

### Options Identified

**Option 9A — Hand-rolled vanilla-JS filter input**
- **Description:** ~30-line script: input event handler reads `value`, iterates `[data-term]` nodes, toggles `hidden`. Optional debounce. No dependency.
- **Strengths:** Trivial. Token-styled input. Composes with `prefers-reduced-motion`. Composable with the existing AudienceFilter pattern.
- **Weaknesses:** Doesn't do fuzzy matching out of the box (not needed for 15 terms).
- **Effort/Complexity:** Very Low.
- **Risk:** Low.

**Option 9B — Pagefind on the glossary page**
- **Description:** Embed Pagefind UI configured to scope to `/glossary/`.
- **Strengths:** Reuses existing search infrastructure.
- **Weaknesses:** Pagefind's UX is a modal dropdown — clashes with editorial in-page search. Configuring Pagefind to scope to a single page section is doable but adds work; over-engineered for 15 terms.
- **Effort/Complexity:** Medium.
- **Risk:** Low.

**Option 9C — Build-time alphabetical anchor index**
- **Description:** Pre-emit a sticky alphabetical `<nav>` listing A–Z anchors. Clicking jumps to first term.
- **Strengths:** No JS. Editorial.
- **Weaknesses:** Doesn't satisfy filter-as-you-type. AC11 says "search/filter input **or** letter-anchored index" — letter index alone could satisfy AC11 literally. But spirit-wise, "filter input" is the more useful UX for a vocabulary lookup.
- **Effort/Complexity:** Low.
- **Risk:** Low.

### Recommendation

**Option 9A — Hand-rolled vanilla-JS filter input.** Add an alphabetical sidebar (9C) as a complementary navigation aid, not a search replacement.

Justification:
- 15 glossary terms is far below the threshold where you'd want Pagefind. Linear-scan-on-keypress is instant.
- The hand-rolled script follows the same pattern as `AudienceFilter.astro` — there's a known, tested template in the codebase.
- Adding 9C alongside 9A gives both filter-as-you-type *and* the editorial letter-jumping affordance. Both are cheap; together they're more useful than either alone.

---

## Axis 10 — Homepage Live Data Element

### Options Identified

**Option 10A — Read content collections directly via `getCollection()` in the homepage frontmatter**
- **Description:** In `src/content/docs/index.mdx` (or the new `index.astro` if migrating), call `getCollection('news')`, `getCollection('skills')`, etc., compute counts, render them inline.
- **Strengths:** Build-time. Zero runtime cost. Reads from the same source of truth as the rest of the site. No new code path. Pattern is the dominant 2026 Astro idiom.
- **Weaknesses:** Counts are baked at build time — not "live" in the runtime sense. Build runs are frequent enough (every content PR) that staleness is rarely noticeable.
- **Effort/Complexity:** Very Low.
- **Risk:** Very Low.

**Option 10B — Read `site/public/_data/*-index.json` files at SSG time via `fs.readFile`**
- **Description:** Import the build-emitted JSON pin indices in the homepage frontmatter and count items.
- **Strengths:** Reuses an existing artifact.
- **Weaknesses:** The pin indices exist *for client-side hydration* of `/my-pins/`. Reading them at SSG time is wrong-layer — the homepage would depend on the pre-build script having run, which is a build-order coupling. They also don't carry the full content count if the script ever changes its filter logic. Wrong tool.
- **Effort/Complexity:** Low.
- **Risk:** Medium (build-order coupling).

**Option 10C — Parse `SCOPE.md` AUTO blocks for counts**
- **Description:** Read `SCOPE.md`, regex out the content-counts table, render.
- **Strengths:** Reads from the human-readable source.
- **Weaknesses:** `SCOPE.md` is a project document, not a programmatic API. The AUTO blocks are maintained by a sync script that may or may not be in a clean state at build time. Parsing markdown to drive UI is wrong-layer.
- **Effort/Complexity:** Low.
- **Risk:** Medium.

### Recommendation

**Option 10A — `getCollection()` in frontmatter.**

Justification:
- 10A is the canonical Astro pattern. Direct, build-time, zero coupling.
- The implementation is ~5 lines: `const newsCount = (await getCollection('news')).length; const skillsCount = ...;` Done.
- Q2's default ("yes, show a small live stats element") is satisfied with no new infrastructure.

Example sketch (Phase 4 will finalize):

```js
// site/src/components/HomeStats.astro
---
import { getCollection } from 'astro:content';
const [news, skills, tips, glossary] = await Promise.all([
  getCollection('news'),
  getCollection('skills'),
  getCollection('tips'),
  getCollection('glossary'),
]);
const stats = [
  { label: 'skills', count: skills.length },
  { label: 'tips', count: tips.length },
  { label: 'news items', count: news.length },
  { label: 'glossary terms', count: glossary.length },
];
---
<dl class="home-stats">
  {stats.map((s) => (
    <div class="home-stats__row">
      <dt>{s.label}</dt>
      <dd>{s.count}</dd>
    </div>
  ))}
</dl>
```

---

## Comparison Matrix

The 10 axes compared on the criteria that matter most for this redesign:

| Axis | Recommendation | Portability (R11) | Effort | Risk | Bundle/Perf |
|---|---|---|---|---|---|
| 1. Tokens | Pure CSS custom props + Cascade Layers | High | Medium | Low | Zero JS |
| 2. Starlight vector | `template: splash` + `MarketingShell.astro` + `SocialIcons` only | High | Low-Medium | Low | None added |
| 3. Motion | CSS + ~20-line IntersectionObserver + native @view-transition | High | Low | Low | Zero new deps |
| 4. Typography | Inter Variable + JetBrains Mono via Astro Fonts API | High | Low | Low | ~100 KB woff2 |
| 5. Pagefind | `--pf-*` variable aliasing in tokens.css | High | Low | Low | Zero new code |
| 6. Components | Hand-roll ~13 primitives in `components/primitives/` | High | Medium | Low | Zero new deps |
| 7. Dark mode | `[data-theme]`-scoped tokens + selective `color-mix()` | High | Low | Low | Zero JS |
| 8. View Transitions | Native `@view-transition` at-rule only | High | Very Low | Low | 1 CSS line |
| 9. Glossary search | Hand-rolled ~30-line vanilla filter + letter sidebar | High | Very Low | Low | Zero new deps |
| 10. Homepage stats | `getCollection()` in frontmatter | High | Very Low | Very Low | Zero added |

**Aggregate scorecard:**

- **Total new runtime dependencies introduced:** 0 (font packages are build-time only).
- **Total new client-side JavaScript:** ~50 LOC (motion-reveal.ts + glossary filter script).
- **Total LOC for hand-rolled primitives:** ~360 LOC across 14 files.
- **Token-layer LOC estimate:** ~250 LOC for `tokens.css` aggregator + split tier files.
- **Test rewrites expected:** ≤5 of 127 (none of the 8 `lib/` modules change, so 104 unit tests stay verbatim; ≤5 DOM-shape assertions need refresh).
- **Portability rating across all 10 axes:** every axis is "High" — Option 2 (replace Starlight) means deleting (a) the `--sl-*` alias block in tokens.css, (b) the `--pf-*` alias block (if escaping Pagefind too), (c) `MarketingShell.astro` (~80 LOC), and (d) `SocialIconsOverride.astro` (~219 LOC, already an isolated component). Total Option 2 escalation cost: ~400 LOC rewrite. Compare to the full redesign cost of ~1500 LOC. **About 73% of the work survives an Option 2 escalation.** AC36–AC37 satisfied.

---

## Recommendation

The recommended execution path for the NbgAiHub UI redesign inside Option 1 hybrid is a **flat, dependency-light, token-centric build** that uses Starlight as a styling target rather than a layout authority. The 10-axis recommendation is internally consistent: each pick refuses to introduce a runtime dependency that the project doesn't already have, and each pick prioritizes portability so that an Option 2 escalation after Phase 6 throws away the smallest possible amount of work.

The decisive factors:

1. **Portability is binding.** The Phase 6 escalation gate is the strongest constraint in the refined spec. Every utility framework, every component library, every motion library, every CSS-in-JS option fails the portability test in some way. Pure CSS custom properties + hand-rolled primitives is the only architecture that survives an Option 2 rewrite at low cost.

2. **Page count is small.** 11 marketing pages and 1 content-detail surface. Adopting Tailwind to "go fast" on 11 pages doesn't pay back the onboarding cost.

3. **The "Apple-like flow" requirement is solved cheaply.** Native `@view-transition` (1 CSS line) plus CSS hover transitions plus 20 lines of IntersectionObserver delivers the aesthetic without a motion library. The remaining "Apple-like" character lives in typography + spacing + restraint, not motion gimmicks.

4. **Inter Variable + JetBrains Mono is the safest typography path.** Geist Sans is a defensible alternative (especially if the user explicitly wants a Vercel-flavored aesthetic), but Inter's neutral character is lower-risk for long-form reading and lower-bundle (single family covers both body and display via the `opsz` axis).

5. **Hand-roll 13 primitives.** ~360 LOC of pure `.astro` + tokens. The cost is two days of writing; the payoff is exact-fit components that travel verbatim out of Starlight.

Conditions under which the recommendation would change:

- **Switch typography from Inter to Geist** if first preview reads as too neutral. One config change.
- **Escalate to `<ClientRouter />` (Axis 8C)** if Phase 6 user evaluation flags the header-chip flicker as a problem. Adds ~1 day of script-init refactor across 5 files.
- **Switch tokens to `light-dark()`-based** if the token list grows past ~200 (likely past MVP scope; not now).
- **Switch from `template: splash` + `MarketingShell` to full custom layouts (Axis 2B)** only if the user, after Phase 6, says "the splash residue is a visual blocker" — at which point Option 2 is the cleaner escalation than chasing Option 2B within Option 1.

Caveats and prerequisites:

- The Astro Fonts API is officially experimental as of Astro 6 (per the Astro docs page footer reference to `experimental.fonts`). It is widely used in production and the API surface is stable, but the team should verify the import path during Phase 4 setup. If the experimental flag is undesirable, fall back to direct `@fontsource-variable/inter` imports in the shared `MarketingShell.astro` — same outcome, slightly more manual.
- The `--pf-*` variable surface is Pagefind's **modern Component UI**, not the legacy `pagefind-ui.css`. Starlight 0.39 may ship the legacy UI. Phase 4 should verify which Pagefind UI variant Starlight 0.39 is wiring; if it's still legacy, Phase 4 either (a) accepts the `--pf-*` aliasing won't apply and the modal stays mostly Starlight-default-tokenized via cascade, or (b) wires the modern Component UI explicitly. This is the only meaningful uncertainty in the investigation and is flagged below as Phase 3b research.

---

## Technical Research Guidance

This section assesses which decisions need deeper technical research in Phase 3b before Phase 4 can plan. The investigation answered most axes to confident planning depth. Two topics remain insufficiently detailed.

**Research needed: Yes**

### Topic 1: pagefind-ui-variant-in-starlight-0-39

- **Why this research is needed:** Axis 5's recommendation (`--pf-*` variable aliasing) assumes Starlight 0.39 ships Pagefind's modern Component UI (which exposes the `--pf-*` surface). If Starlight 0.39 actually wires the legacy `pagefind-ui` flavor (`.pagefind-ui__*` classes), the recommended override mechanism doesn't apply and the team needs a different path (legacy class targeting with `!important`, or a custom search component). This single fact determines whether AC31 + A10 cost 5 lines of CSS or 50.
- **Focus areas:**
  1. Which Pagefind UI variant does `@astrojs/starlight@0.39.2` instantiate by default? Inspect `node_modules/@astrojs/starlight` or its build output.
  2. What does the rendered DOM look like after `astro build` — `<pagefind-searchbox>` Web Component (modern) or `<div class="pagefind-ui">` (legacy)?
  3. If legacy, is there a Starlight config to swap to the modern Component UI without forking?
  4. If neither, what's the minimum-cost CSS override path that still meets A10's "tokens propagate, don't redesign the modal" line?
- **Depth level:** Shallow (1–2 hours, one inspection of bundled assets, one DevTools session against a built site).

### Topic 2: astro-fonts-api-experimental-stability

- **Why this research is needed:** Axis 4's recommendation uses Astro 6's built-in Fonts API (`experimental.fonts`). The "experimental" namespace means API drift is possible. The investigation found strong adoption evidence but did not verify the API shape in Astro 6.3.5 specifically (the project's pinned version). If the API is gated behind a flag that doesn't exist in 6.3.5, or if the recommended `provider: 'fontsource'` shape changed between minor versions, Phase 4 needs to know up front and may need to fall back to direct `@fontsource-variable/inter` NPM imports inside `MarketingShell.astro`.
- **Focus areas:**
  1. Is `experimental.fonts` present and stable in Astro 6.3.5?
  2. What is the exact config shape — `fonts: [{ ... }]` array? Property names: `cssVariable`, `provider`, `weights`, `styles`, `fallbacks`?
  3. Does the `<Font />` component live at `astro:assets` or another path in 6.3.5?
  4. If experimental, what's the fallback path: direct `@fontsource-variable/inter` import in `MarketingShell.astro`'s `<style>` block, or a separate `fonts.css` in `customCss`?
- **Depth level:** Shallow-Moderate (2–3 hours, read the Astro 6.3.5 changelog + experimental.fonts section, build a 5-line smoke test in a scratch project).

The remaining 8 axes were investigated to confident-planning depth and do not need further research:

- Cascade Layers: dominant 2026 pattern, all evergreen browsers since 2022; no open questions.
- Starlight slot overrides: documented in detail (override surface, `<slot />` pattern, type imports); no open questions.
- View Transitions: `@view-transition` at-rule shipped to Firefox 144 (Sept 2025), confirmed cross-document support; no open questions.
- Variable font self-hosting: NPM/Fontsource pattern well-documented even if Astro Fonts API path is unverified (Topic 2 above covers the contingency).
- Scroll-driven motion patterns without a library: IntersectionObserver API stable since 2017; ~20-line implementation pattern well-established.
- CSS Cascade Layers for token systems: covered in detail in Axis 1.
- Hand-rolling Astro primitives: no library research needed; the pattern is plain `.astro` files.
- `getCollection()` at build time: canonical Astro pattern; no open questions.

---

## Implementation Considerations

Practical notes for Phase 4 planning:

- **Token-layer file structure** — recommend splitting into `tokens/colors.css`, `tokens/type.css`, `tokens/space.css`, `tokens/motion.css`, `tokens/elevation.css`, aggregated by `tokens.css` (per R1.1 option). One `customCss: ['./src/styles/tokens.css']` entry; the aggregator `@import`s the others. Cascade layer declared in the aggregator: `@layer reset, tokens, base, components, utilities;`. The `--sl-*` alias block lives in `tokens.css` after the `@layer tokens { ... }` block so it overrides any Starlight default that bypassed the layer.

- **Component co-location** — hand-rolled primitives go in `site/src/components/primitives/`. Existing 10 components stay in `site/src/components/` but get refactored to *consume* primitives. The visual redesign of `HomeHero.astro` becomes `HomeHero.astro` using `<Container>`, `<Stack>`, `<Display>`, `<Lede>`, `<Cluster>`, `<Button>` primitives. Behavior contracts stay.

- **MarketingShell.astro contract** — the shared layout shim takes `title`, `description`, optional `hero` (Astro slot), and a default slot for page body. Internally it renders `<StarlightPage frontmatter={{ template: 'splash', title, description }}>` and wraps the body in `<main data-surface>`. Page files become ~30-line consumers. Day-1 journey gets a slightly richer variant (`MarketingShell` with `progressIndicator` prop).

- **Content-detail theme override** — single CSS block targeting `[data-theme]` on `<html>` plus Starlight's content-region selectors. Lives in `tokens.css` after the alias block. Targets: `.sl-markdown-content h1/h2/h3`, code blocks, callouts (`starlight-aside`), TOC (`starlight-toc`), sidebar entries (`sl-link-card`, etc.). Verify selectors against the rendered DOM during Phase 4.

- **Migration order suggestion** — (a) tokens.css + alias block + Astro Fonts API wiring, (b) primitives + MarketingShell, (c) homepage as proof, (d) remaining 10 marketing surfaces, (e) content-detail override, (f) component restyles (existing 10), (g) motion + view transitions, (h) glossary filter, (i) accessibility pass + contrast audit, (j) screenshot evidence + validation script.

- **Issues - Pending Items.md candidates discovered during investigation** — none. The investigation surfaced no pre-existing defects in the codebase that would block Phase 4. (One mild aesthetic flag: the existing `custom.css` is 133 lines, exceeding the original 100-line cap. Per A7, that cap is lifted. No issue logged.)

- **Test floor watch** — 127 tests passing today, 127 is the floor. The redesign should not touch any `lib/` module, so 104 of 127 stay verbatim. The remaining 23 (PinButton, SignInModal, my-pins integration via build-pin-index) may need DOM-selector refreshes when their wrapping components get tokenized. Plan for ~5 test updates; budget zero test deletions.

- **Reduced-motion respect** — apply at the token level: `:root { --duration-base: 200ms; } @media (prefers-reduced-motion: reduce) { :root { --duration-base: 0.01ms; } }`. Every component that uses `--duration-*` then auto-honors the preference. MotionReveal also early-returns from IntersectionObserver setup if `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

- **Dark-mode default flicker (AC24)** — Starlight's ThemeProvider already runs an inline `<head>` script that sets `data-theme` before paint. Don't touch this. The redesign's dark-as-default works automatically as long as no localStorage key forces light.

---

## References

| # | Source | URL | What was learned |
|---|---|---|---|
| 1 | Starlight — CSS & Styling | https://starlight.astro.build/guides/css-and-tailwind/ | `customCss` array contract; `--sl-*` override pattern; dark-mode selector is `:root[data-theme='dark']`; warning against mixing Tailwind tokens with Starlight tokens. |
| 2 | Starlight — Overrides Reference | https://starlight.astro.build/reference/overrides/ | Full list of overridable components (Header, ThemeProvider, SocialIcons, Sidebar, TableOfContents, etc.). Pattern for accessing `starlightRoute`. Caution about layout-component overrides. |
| 3 | Starlight — Overriding Components Guide | https://starlight.astro.build/guides/overriding-components/ | The `<Default><slot /></Default>` re-export pattern; type-safe Props import. |
| 4 | Starlight — Pages Guide | https://starlight.astro.build/guides/pages/ | `template: splash` frontmatter; `<StarlightPage>` for custom pages; sidebar limitation for custom-page routes. |
| 5 | Astro — View Transitions Guide | https://docs.astro.build/en/guides/view-transitions/ | `@view-transition` at-rule; `<ClientRouter />`; `transition:persist` limitation cross-document; `astro:page-load` event for re-init. |
| 6 | Astro — Zero-JavaScript View Transitions | https://astro.build/blog/future-of-astro-zero-js-view-transitions/ | Native `@view-transition` pattern for cross-document; Firefox 144 (Sept 2025) reached parity; ClientRouter remains useful for backwards compatibility. |
| 7 | Astro — Custom Fonts Guide | https://docs.astro.build/en/guides/fonts/ | Astro Fonts API config shape; `fontsource` provider; `weights: ["100 900"]` for variable; `<Font cssVariable=>` component; auto-generated metric-matched fallbacks. |
| 8 | Fontsource — Geist | https://fontsource.org/fonts/geist | Geist variable font availability via `@fontsource-variable/geist-sans` / `@fontsource-variable/geist-mono`; OpenType stylistic sets (`ss02`, `ss03`, `ss04`) only available via NPM not Google Fonts. |
| 9 | Fontsource — `@fontsource-variable/inter` | https://www.npmjs.com/package/@fontsource-variable/inter | Inter variable NPM package; default `wght` axis import or specific `wght.css` / `wght-italic.css` imports. |
| 10 | Pagefind — CSS Variables | https://pagefind.app/docs/css-variables/ | Modern Pagefind Component UI `--pf-*` variable surface (~25 properties); `data-pf-theme="dark"` attribute; does not auto-respect `prefers-color-scheme`. |
| 11 | CSS-Tricks — Cascade Layers Guide | https://css-tricks.com/css-cascade-layers/ | `@layer` declaration pattern; layer-order independence from specificity; production-pattern example `@layer vendor, tokens, reset, atoms, ...`. |
| 12 | Dave Rupert — Inverted themes with light-dark() | https://daverupert.com/2026/04/inverted-light-dark/ | `color-scheme` + `light-dark()` integration; pattern for inverting via attribute without re-defining variables. |
| 13 | Medium (Alexander Burgos) — CSS light-dark() function | https://medium.com/@alexdev82/css-light-dark-dark-mode-in-one-function-no-media-queries-5549410a63bc | `light-dark()` browser support since May 2024; single-stylesheet dual-mode delivery (~0.5 KB gzip for 500 variables). |
| 14 | Muz.li — Dark Mode Design Systems guide | https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/ | Three-tier token architecture (primitives → semantic → component); dark-mode contrast checking discipline. |
| 15 | LogRocket — Best React Animation Libraries 2026 | https://blog.logrocket.com/best-react-animation-libraries/ | Motion (formerly framer-motion) bundle size ~32 KB; AOS ~8–13 KB; native CSS scroll-driven animations performance ceiling. |
| 16 | Motion docs — React scroll animations | https://motion.dev/docs/react-scroll-animations | `whileInView` API; pooled IntersectionObserver under the hood; native ScrollTimeline fallback. |
| 17 | bejamas/ui announcement | https://bejamas.com/blog/introducing-bejamas-ui-an-astro-native-component-library | Astro-native, Tailwind v4-based, shadcn-style copy-and-own; closest Astro alternative to shadcn/ui; explicit zero-JS positioning. |
| 18 | Astro UXDS — Design Tokens | https://www.astrouxds.com/design-tokens/getting-started/ | Token-hierarchy discipline (Reference → System → Component); recommendation against direct component-token consumption from outside the owning component. |
| 19 | Astro Docs — Content collections | https://docs.astro.build/en/guides/content-collections/ | `getCollection()` build-time pattern; loader contract; pre-rendered SSG idiom. |
| 20 | Astro — Live Content Collections deep dive | https://astro.build/blog/live-content-collections-deep-dive/ | `getLiveCollection()` for request-time data; distinguishes build-time vs live; recommendation to stay with build-time for Markdown/MDX sources. |

---

## Original Request

The user's brief is captured in full at `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/ui-redesign.md`. Original-original prompt (preserved at the end of that file):

> "UI improvements needed — think of it as a sleek, clean, captivating Apple-like site. The current UI is outdated and not satisfactory."

This investigation refines that brief into 10 executable axis-by-axis decisions inside the already-committed Option 1 hybrid (keep Starlight + bespoke layouts + deep theme override). Two Phase-3b research topics are flagged for verification before Phase 4 planning begins.

## Technical Research Guidance

Research needed: Yes

- **Topic 1: pagefind-ui-variant-in-starlight-0-39** — verify which Pagefind UI flavor Starlight 0.39.2 ships (modern Component UI with `--pf-*` variables vs legacy `pagefind-ui` with `.pagefind-ui__*` classes). Determines whether Axis 5's CSS-variable override path applies. Depth: shallow (1–2 hours, DevTools inspection of a built site).
- **Topic 2: astro-fonts-api-experimental-stability** — verify `experimental.fonts` API shape and stability in Astro 6.3.5 specifically. Determines whether Axis 4's Astro Fonts API wiring applies or whether to fall back to direct `@fontsource-variable/*` NPM imports. Depth: shallow-moderate (2–3 hours, changelog review + smoke test).
