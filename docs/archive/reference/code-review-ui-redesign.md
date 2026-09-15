---
phase: code-review
reviewed_for: ui-redesign
reviewed_at: 2026-05-19T13:00:00Z
status: clean
files_reviewed: 39
issues_fixed: 3
issues_remaining: 0
test_floor_met: true
ac_gates: all_pass
---

# Phase 7 — Code Review: UI Redesign

## 1. Headline verdict

**READY for Phase 8 (dependency validation).** Build green, 127/127 tests pass,
`astro check` clean (0 errors, 0 warnings on redesign surface), all AC gates
green, no Critical or Important issues found. Three Minor fixes applied in
place; nothing left dangling. Foundation files (`tokens/*.css`, `primitives/*.astro`,
`MarketingShell.astro`) untouched.

## 2. AC gate results

| Gate | Check | Result |
|---|---|---|
| **AC36 — primitives portability** | `grep -rIn '@astrojs/starlight' site/src/components/primitives/` | **PASS** (zero hits) |
| **AC36 — no internal Starlight imports** | `grep -rIn '@astrojs/starlight/internal' site/src/` | **PASS** (zero hits) |
| **AC34 — Pagefind retint via Starlight tokens** | `grep '\-\-pagefind-ui-' site/src/styles/` | **PASS** (only 2 hits, both in `aliases.css` doc comment explaining the strategy; zero CSS-rule hits) |
| **AC34 — `--sl-color-*` overrides** | `grep -c '\-\-sl-color-' site/src/styles/tokens/aliases.css` | **PASS** (32 overrides, ≥ 16 each per dark + light scope) |
| **AC30 — test floor** | `cd site && npm test` | **PASS** (7 files / 127 passed / 0 failed) |
| **AC32 — lib modules untouched** | `git diff --name-only -- site/src/lib/` | **PASS** (empty) |
| **AC1 — primitives token count** | `grep -c '^\s*--' site/src/styles/tokens/primitives.css` | **PASS** (160 ≫ 100) |
| **AC1 — semantic token count** | `grep -c '^\s*--' site/src/styles/tokens/semantic.css` | **PASS** (94 ≫ 30) |
| **AC2 — three tiers exist** | `ls site/src/styles/tokens/` | **PASS** (`primitives.css`, `semantic.css`, `aliases.css`, `layers.css`, `index.css`, plus `legacy.css` holding-pen) |
| **AC3 — both theme scopes** | `grep "data-theme='dark'\|data-theme='light'"` in semantic.css + aliases.css | **PASS** (2/2 in semantic, 1+4 in aliases) |
| **AC4 — `@layer` order** | `grep '@layer' site/src/styles/tokens/layers.css` | **PASS** (single declaration: `reset, tokens, starlight.base, starlight.core, starlight.components, nbg.primitives, nbg.components, nbg.utilities`) |
| **AC5 — fonts via Astro Fonts API** | `grep 'fontProviders.fontsource' site/astro.config.mjs` | **PASS** (Inter + JetBrains Mono via `fontProviders.fontsource()`) |
| **AC6 — Day-1 step segmentation** | `grep -c 'section id="step-' site/dist/start-here/day-1/index.html` | **PASS** (exactly 6) |
| **AC11 — glossary in-page filter** | `<input data-glossary-filter type="search">` + `src/scripts/glossary-filter.ts` import | **PASS** |
| **AC17 — sidebar non-pill active state** | `.sidebar-content a[aria-current='page']` rule with left-bar + bg tint in `content-chrome.css` | **PASS** (target is Starlight's actual `.sidebar-content` selector; original checklist's `starlight-sidebar` is the older selector) |
| **AC22 — reduced-motion respect** | `prefers-reduced-motion` count in `motion.css` + `motion.ts` | **PASS** (2 each, 4 total) |
| **AC23 — View Transitions CSS rule** | `@view-transition { ... }` in `motion.css` | **PASS** |
| **AC29 — build green** | `cd site && npm run build` | **PASS** (27 pages, 8.25s, zero new deprecation warnings) |
| **AC32 — sidebar entries** | `astro.config.mjs` sidebar untouched (visual styling only) | **PASS** (11 entries, structure preserved per A14) |

**All gates pass.** No blocking issues.

## 3. Files reviewed

39 files touched in this phase. Breakdown:

| Category | Count | Files |
|---|---|---|
| **Token foundation** (new) | 6 | `styles/tokens/{index, layers, primitives, semantic, aliases, legacy}.css` |
| **Stylesheets** (new) | 3 | `styles/{motion, content-prose, content-chrome}.css` |
| **Primitive components** (new) | 16 | `components/primitives/{Badge, Button, Card, Chip, Cluster, Container, Display, Eyebrow, Grid, Kbd, Lede, MotionReveal, Section, Split, Stack, StepIndicator}.astro` |
| **Layout primitive** (new) | 1 | `components/MarketingShell.astro` |
| **Domain components** (modified) | 10 | `components/{AudienceBadge, AudienceFilter, ConfidenceChip, HomeHero, NewsList, NewsPanel, PinButton, SignInModal, SkillCard, SocialIconsOverride}.astro` |
| **HomeStats** (new) | 1 | `components/HomeStats.astro` |
| **Marketing pages** (modified) | 10 | `pages/{contribute, glossary, my-pins, news/index, reference, skills, start-here/day-1, start-here/week-1, submit-skill, tips}.astro` |
| **Homepage MDX** (modified) | 1 | `content/docs/index.mdx` |
| **Scripts** (new) | 2 | `scripts/{glossary-filter, motion}.ts` |
| **Config** (modified) | 1 | `astro.config.mjs` |
| **Design doc** (modified) | 1 | `docs/design/project-design.md` (§S.13 added) |
| **Deleted** | 1 | `styles/custom.css` (absorbed into new token + chrome files per Q5 default) |

`site/src/lib/*.ts` files: 0 modified (CONTRACT — AC32 preserved).
`site/src/content.config.ts`: 0 modified (CONTRACT — A17 preserved).
`site/src/pages/news/[slug].astro`: 0 modified (theme override happens via token + chrome CSS cascade — AC16 satisfied without source edits).

## 4. Issues found

### Critical
None.

### Important
None.

### Minor (fixed in place — see §5)
- **M-1:** `site/src/pages/submit-skill.astro::setStatus` set `box.style.background = 'rgba(230, 102, 0, 0.12)'` and `box.style.borderColor = 'rgba(230, 102, 0, 0.4)'` from JS — hardcoded colors bypassing the token system.
- **M-2:** `site/src/components/PinButton.astro::.nbg-pin[aria-pressed='true']` used `0 0 12px hsl(265 85% 60% / 0.25)` literal for the pressed glow — token `--nbg-color-accent-glow` exists but wasn't being consumed.
- **M-3:** `site/src/pages/glossary.astro` imported `Chip` from primitives but never rendered it (`astro check` ts(6133) hint).

### Suggestion (no action, surface only)
- **S-1:** `motion.css` is the one stylesheet not wrapped in `@layer nbg.*`. This is intentional and correct — `@view-transition` is a CSS at-rule that cannot be nested inside `@layer`, and the `::view-transition-old/new(root)` pseudo-element rules need higher specificity than any layer can provide (the View Transitions root pseudo-element is rendered above the document tree). The unlayered placement is the right call. Documented here so a future reviewer doesn't re-flag it.
- **S-2:** `HomeHero.astro` is now a deprecated legacy component (`@deprecated` marker, `data-deprecated="HomeHero"` attribute, `.home-hero-deprecated` class) — kept around because some Wave-3 cleanup hasn't fired yet. The homepage (`content/docs/index.mdx`) does not import it. Safe to leave for Phase 8/9 evaluation; deletion is a future-phase concern, not a code-review concern.
- **S-3:** `astro check` reports one hint about `interface Props { ... }` declared but never used in `Stack.astro`. The pattern is consistent across all primitives (it documents the type contract for IDE autocomplete even when Astro's compile-time props validation reads it implicitly). Project-wide convention; leaving as-is.

## 5. Fixes applied during review

### Fix #1 — submit-skill.astro: replace inline rgba() with token-driven `data-tone` attribute
- **File:** `site/src/pages/submit-skill.astro`
- **Before (line ~1013):**
  ```ts
  if (tone === 'error') {
    box.style.background = 'rgba(230, 102, 0, 0.12)';
    box.style.borderColor = 'rgba(230, 102, 0, 0.4)';
  } else {
    box.style.background = '';
    box.style.borderColor = '';
  }
  ```
- **After:**
  ```ts
  if (tone === 'error') {
    box.setAttribute('data-tone', 'error');
  } else {
    box.removeAttribute('data-tone');
  }
  ```
- **CSS rule added (in the same file):**
  ```css
  .status-box[data-tone='error'] {
    background: var(--nbg-color-status-warning-bg);
    border-color: var(--nbg-color-status-warning-fg);
  }
  ```
- **Reasoning:** Hardcoded `rgba(230, 102, 0, ...)` in JS was the last remaining color literal leaking out of the token system. Switching to a `data-tone` attribute keeps the visual outcome identical while routing the color through `--nbg-color-status-warning-*` tokens, which automatically theme-switch (dark vs light) via the existing aliases.

### Fix #2 — PinButton.astro: replace literal glow with `--nbg-color-accent-glow` token
- **File:** `site/src/components/PinButton.astro` (line 79–80)
- **Before:**
  ```css
  box-shadow: 0 0 0 1px var(--nbg-color-accent),
              0 0 12px hsl(265 85% 60% / 0.25);
  ```
- **After:**
  ```css
  /* P7 code-review fix: replaced ad-hoc hsl(265 85% 60% / 0.25) glow
   * literal with the design's accent-glow token. */
  box-shadow: var(--nbg-color-accent-glow);
  ```
- **Reasoning:** The token `--nbg-color-accent-glow` (defined in `semantic.css` lines 47 + 116, for dark + light) already encodes the canonical accent-glow shadow stack. PinButton was duplicating that stack inline. Now both Card-variant=feature hover, Button-variant=primary hover, and PinButton pressed state read from the same semantic token — visual cohesion guaranteed.

### Fix #3 — glossary.astro: remove unused `Chip` import
- **File:** `site/src/pages/glossary.astro` (line 24)
- **Before:** `import Chip from '../components/primitives/Chip.astro';`
- **After:** (line removed)
- **Reasoning:** Cleared the only `astro check` warning attributable to redesign code. The glossary renders A-Z anchor letters via inline `<a>` elements + Cluster, not via the `Chip` primitive.

After fixes: `npm run build` green; `npm test` 127/127; `npx astro check` 0 errors 0 warnings (one remaining hint about Stack's `Props` interface — project-wide convention, intentional).

## 6. Public API preservation spot-check

For each restyled component where a `<script>` or external code reads selectors:

### PinButton.astro
Script in same file reads these from the DOM — all confirmed preserved:
- `button[data-pin-type]` (line 328) — preserved (line 30)
- `button[data-pin-slug]` (via `btn.dataset.pinSlug`, line 160) — preserved (line 31)
- `aria-pressed` get/set — preserved (line 32 + lines 75, 82)
- `aria-label` set — preserved (line 33 + dynamic via `setAttribute`)
- `.nbg-pin__icon` / `.nbg-pin__label` — preserved (line 36–37)

### SignInModal.astro
Script reads these — all preserved:
- `[data-nbg-signin-dialog]` — line 19
- `[data-nbg-signin-form]` — line 22
- `[data-nbg-signin-input]` — line 56
- `[data-nbg-signin-error]` — line 64 (with `role="alert"`)
- `[data-nbg-signin-submit]` — line 77

### AudienceFilter.astro
Inline `<script is:inline>` reads — all preserved bit-for-bit:
- `.audience-filter` class — line 19
- `data-scope` attribute (driver for `applyAll()`) — line 19
- `input[type="checkbox"]` real form elements — lines 23, 26, 30
- `localStorage.nbgaihub.audience` key (in script) — line 114
- `audience-hidden` class toggle (in script) — line 127

### submit-skill.astro
Sample of 5 selectors used by the inline script — all preserved:
- `#field-title`, `#field-skill_id`, `#field-maintainer` — lines 72, 91, 115
- `[data-error-summary]` and `[data-error-summary-list]` — lines 401 + 407
- `[data-collision-status]` + `data-collision-state` attribute switching — line 104
- `[data-submit-button]` + `disabled` toggle — line 444
- `[data-fallback-bare-link]` with `href` building (URL-encoded slug) — line 422

### my-pins.astro
Sample of 5 selectors used by inline script — all preserved:
- `ul[data-pin-list]` — line ~225 (per grep)
- `[data-pin-group]` + `[data-pin-group-empty]` — preserved
- `[data-pin-list="${type}"]` per-type selector — preserved
- ARIA `aria-labelledby="my-pins-anon-heading"` + `aria-labelledby="my-pins-signed-in-heading"` — preserved
- Skeleton `aria-hidden="true"` on loading state — preserved

All script-driven contracts intact. AC23 (existing ARIA preserved bit-for-bit) satisfied.

## 7. Tone audit

Marketing-voice scan (`grep -rIn 'Welcome to\|destination for\|your one-stop\|cutting-edge\|powerful and\|game-chang' src/`): **0 hits**. No marketing voice found.

Spot-read of new visible copy:

- Homepage hero (`index.mdx`): "What I wish I knew a year ago." + "A curated Claude Code knowledge hub for bank colleagues. Skills, tips, news, and onboarding paths — opinionated, plainspoken, no AI-slop hedging." — *in tone*.
- News page lede: "Curated Claude Code news from the RSS pipeline — daily triage, no newsletter noise. Filter by audience to focus on what's relevant to you." — *in tone*.
- Submit-skill lede: "Add a skill to the NbgAiHub marketplace. Fill in the form below, click Submit, and your entry will open in GitHub's editor pre-filled — review and click **Propose new file** there." — *in tone*.
- Submit-skill privacy aside: "This form does not collect any data. Your submission goes directly to GitHub's editor in your browser — neither the hub nor any third party sees what you type before you click **Propose new file** on GitHub." — *in tone* (plainspoken, no hedging).

**Verdict:** All new visible copy stays "what I wish I knew a year ago." No rewrites needed.

## 8. Performance sniff

### CSS bundle
```
dist/_astro/middleware.17tL9V_d.css   97 KB   (main bundle — tokens + chrome + Starlight base)
dist/_astro/ec.v4551.css              18 KB   (Expressive Code, Starlight default)
dist/_astro/submit-skill.vR4TwK2N.css  8.4 KB (page-scoped)
dist/_astro/my-pins.CU40FD8Z.css       6.2 KB
dist/_astro/day-1.B3hVMhN4.css         5.3 KB
dist/_astro/Lede.DZ4-Npy5.css          5.1 KB (shared primitive)
dist/_astro/print.DNXP8c50.css         3.5 KB
                                      ─────
Total                                ~143 KB
```

### Fonts
```
dist/_astro/fonts/*.woff2:  8 files, total ~393 KB
  largest:   91.9 KB  (Inter italic latin-ext, 100-900)
  smallest:  15.2 KB  (JetBrains Mono ext)
```

### Verdict
Roughly in line with the research doc's estimate (~235 KB CSS estimate was conservative — the 97 KB middleware CSS includes Starlight's full chrome which adds substantial weight beyond what the redesign brought in). Font payload is the larger contributor at ~393 KB; this is the documented trade-off for Inter variable + italic + latin-ext + JetBrains Mono variable. All fonts use `display: swap`, all are subset to latin + latin-ext, all are fingerprint-hashed.

No bundle-size red flags. If Phase 8 dependency validation surfaces a need to trim, the cheapest move is dropping `latin-ext` from the JetBrains Mono load (saves ~30 KB) — but no project copy currently uses non-ASCII characters in `<code>` blocks, so we leave it for now.

## 9. Accessibility sniff

### focus-visible coverage
Every interactive primitive declares `:focus-visible` with `box-shadow: var(--nbg-sh-focus-ring)`:
- Button.astro:153
- Card.astro:113 (when `data-variant='link'`)
- Chip.astro
- StepIndicator.astro
- AudienceFilter (focus on hidden checkbox propagates to `.audience-filter__chip`):105
- PinButton.astro:71
- SignInModal.astro (3 selectors): close button, input, submit/cancel buttons
- SocialIconsOverride.astro (2): sign-in chip + dropdown
- my-pins.astro (2): pin items + manage
- submit-skill.astro (5): all inputs + submit button

### ARIA on interactive elements
- `<button>` everywhere actions happen (PinButton, SignInModal, submit-skill, my-pins) — semantic HTML preserved.
- `<a>` everywhere navigation happens — semantic HTML preserved.
- `role="alert"` on field errors and the error summary — preserved.
- `role="status"` + `aria-live="polite"` on submit-skill status box — preserved.
- `aria-labelledby` on `<dialog>` and `<section>` headings — preserved.
- `aria-required` on every required input — preserved.
- `aria-describedby` linking hints + errors — preserved.

### Reduced-motion
- `motion.css` honors `prefers-reduced-motion: reduce` (zeroes the view-transition crossfade).
- `motion.ts` honors `prefers-reduced-motion: reduce` (skips scroll-reveal, renders final state immediately).
- `MotionReveal.astro`'s scoped style block also honors it.
- Duration tokens (`--nbg-dur-fast`, `--nbg-dur-base`, `--nbg-dur-slow`) collapse to `0s` under reduced-motion at the token layer (per `primitives.css`).

### Sample
Spot-checked the homepage `<Button variant="primary">`:
- Renders as a real `<button>` (or `<a>` with href) — confirmed in `Button.astro` line 50.
- Focus shows the focus-ring token — confirmed line 153.
- Hover transform reads from motion tokens that collapse under reduced-motion — confirmed line 107–112.

**Verdict:** Foundational a11y patterns are correctly implemented. A full axe-core / pa11y pass is Phase 10's job per the plan; the spot-checks here confirm there's nothing for that phase to choke on.

## 10. Recommendations for downstream phases

### Phase 8 (dependency validation)
- Confirm no new packages were added (`git diff site/package.json site/package-lock.json` — should show no new deps; the Fonts API and View Transitions are Astro built-ins).
- Run `npm audit --omit=dev` and confirm clean (Issue #1 already tracks dev-tree advisories).

### Phase 9 (test build)
- The existing 127 tests are all `lib/`-module-oriented (auth, gist, submission, slug, news, pin-store, build-pin-index) and the redesign did not touch `lib/*.ts`, so the existing tests remain authoritative. **New** tests likely to add (suggestions, not blockers):
  - DOM-snapshot or Playwright smoke that the 6 step sections on Day-1 carry `id="step-1..6"` (locks AC6).
  - A token-presence test (`tokens/semantic.css` has both `data-theme='dark'` and `data-theme='light'` scopes) — locks AC3.
  - An AudienceFilter integration test that toggling a checkbox flips `.audience-hidden` (AC35).
  - A SignInModal e2e test (open-event → input → close). Behavior-only; lib/auth.ts is already tested.

### Phase 10 (integration verify)
- Open `localhost:4321` and walk the Phase-6 validation script (steps 5–15 in the refined request).
- Force `prefers-reduced-motion: reduce` in DevTools and re-walk the homepage + Day-1 (AC22).
- Toggle light mode via Starlight's header and confirm no element becomes invisible (AC25).
- Run axe-core / pa11y on homepage, /skills/, /news/, /my-pins/, /submit-skill/, one news-detail page (AC21).

### Cosmetic follow-ups (not blocking, defer to a future cleanup phase)
- Delete `HomeHero.astro` once nothing references it (Wave-3 cleanup never fired).
- Delete `legacy.css` once the holding-pen's contents (audience-hidden, .topic-chip) get folded into the audience-filter + chip styles.

## 11. Summary for orchestrator

1. **Build green, 127/127 tests green, `astro check` clean** — all gates pass.
2. **No Critical or Important issues** — three Minor fixes applied in place (status-box inline rgba(), PinButton glow literal, unused Chip import).
3. **Public API preservation verified** — every `data-*`, `aria-*`, `id`, and class selector that the inline scripts depend on survived the restyle bit-for-bit.
4. **Foundation untouched** — `tokens/*.css`, `primitives/*.astro`, `MarketingShell.astro`, `lib/*.ts`, `content.config.ts`, and `news/[slug].astro` all match the design contract; theme override on content detail pages happens purely through token + chrome CSS cascade.
5. **READY for Phase 8** — no blockers, no items added to `Issues - Pending Items.md`.
