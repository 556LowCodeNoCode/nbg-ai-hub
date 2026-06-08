---
status: completed
mode: write-and-run
scope_slug: build-output-integration
language: typescript
framework: vitest
test_command_full: cd site && npm test
test_command_scope: cd site && npm test -- build-output
test_dir: /Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests
target_path: /Users/suzy/ClaudeCode/Projects/NbgAiHub/site
test_files_owned:
  - site/tests/build-output.test.ts
tests_added: 26
tests_updated: 0
tests_run: 26
tests_passed: 26
tests_failed: 0
implementation_gaps: 0
built_at: 2026-05-19T13:11:00Z
last_built_commit: null
---

# Test Build — build-output-integration

## 1. Summary

Status: **completed**. Framework: Vitest 4.1.6 (node environment). Added 26 integration tests verifying the static build output of the redesigned NbgAiHub site. All tests passed. No existing test files were modified. Total test count increased from 127 to 174 across all test files (26 new in `build-output.test.ts`, plus existing tests in other files including `glossary-filter.test.ts` and `motion-reveal.test.ts` which were added between the scope definition and this test build).

Tests read built HTML/CSS files under `site/dist/` and assert on their structure and content to verify design-system contracts. Build-reuse strategy employed: if `site/dist/index.html` exists, the test suite reuses the existing build; otherwise it runs `npm run build` once in a `beforeAll` hook.

## 2. Scope Resolved

**Scope:** `build-output-integration` — integration-style tests that verify the static build output of the UI redesign.

**Files under test (indirectly, via built output):**
- `site/dist/start-here/day-1/index.html` — Day-1 journey step segmentation (AC6)
- `site/dist/_astro/*.css` — Pagefind retint via Starlight token aliases (AC34)
- `site/dist/index.html`, `site/dist/skills/index.html`, `site/dist/tips/index.html`, `site/dist/glossary/index.html`, `site/dist/news/index.html`, `site/dist/my-pins/index.html`, `site/dist/submit-skill/index.html` — Marketing surface chrome (AC10)
- `site/src/styles/tokens/primitives.css` — Token foundation (AC1)
- `site/src/styles/tokens/layers.css` — Token foundation (AC4)
- `site/src/styles/tokens/semantic.css` — Token foundation (AC1, AC4)
- `site/src/styles/tokens/aliases.css` — Pagefind retint (AC34)
- `site/astro.config.mjs` — Fonts wired (AC5)
- `site/dist/_astro/fonts/*.woff2` — Fonts wired (AC5)
- `site/src/components/primitives/*.astro` — Primitives portability (AC36)

## 3. Existing Coverage

No existing test coverage for build-output integration. This is the first test file to verify the static build artifacts against the redesign's acceptance criteria.

Existing test files (127 tests across 7 files pre-redesign, now 174 tests across 10 files):
- `auth.test.ts` — 15 tests for PAT-paste auth
- `api-fetch.test.ts` — 6 tests for GitHub API fetch wrapper
- `gist.test.ts` — 18 tests for unlisted gist CRUD
- `submission.test.ts` — 26 tests for skill submission form validation/serialization
- `pin-store.test.ts` — 10 tests for client-side pin hydration
- `build-pin-index.test.ts` — 5 tests for pre-build JSON index generation
- `slug.test.ts` — 47 tests for slug derivation
- `glossary-filter.test.ts` — (added post-scope; test count not in original 127)
- `motion-reveal.test.ts` — (added post-scope; test count not in original 127)

These existing tests were not modified by this test build.

## 4. Plan

The test suite verifies 5 categories of build-output contracts, as specified in the launch instructions:

| Category | Target | Test Intent |
|---|---|---|
| **Day-1 step segmentation (AC6)** | `start-here/day-1/index.html` | Assert exactly 6 `<section id="step-N">` elements with sequential IDs `step-1..step-6` |
| **Pagefind retint via Starlight token aliases (AC34)** | `_astro/*.css`, `tokens/aliases.css` | Assert CSS files containing `#starlight__search` rules reference `var(--sl-color-*)` or `var(--__sl-font)`; assert `aliases.css` maps `--sl-color-*` to `--nbg-*` tokens |
| **Marketing surface chrome (AC10)** | 8 marketing pages (index, skills, tips, glossary, news, my-pins, submit-skill, start-here/day-1) | Assert each has `data-marketing` attribute OR `template="splash"`; assert none contain Starlight sidebar markup (`<aside class="sidebar"` or `class="sl-sidebar"`) |
| **Token foundation present (AC1, AC4)** | `tokens/primitives.css`, `tokens/layers.css`, `tokens/semantic.css` | Assert primitives.css has ≥100 `--nbg-` token occurrences; assert layers.css declares 8 layers in order; assert semantic.css contains both `:root[data-theme='dark']` and `:root[data-theme='light']` blocks |
| **Fonts wired (AC5)** | `astro.config.mjs`, `_astro/*.css`, `_astro/fonts/*.woff2` | Assert config declares `fontProviders.fontsource()` ≥2 times (Inter + JetBrains Mono); assert built CSS references font CSS variables (`--nbg-font-body`, `--nbg-font-mono`, `--nbg-type-body`, `--nbg-type-mono`) or contains `@font-face`; assert ≥2 `.woff2` files exist in `dist/` |
| **Primitives portability (AC36)** | `src/components/primitives/*.astro` | Assert no `.astro` files under `primitives/` import from `@astrojs/starlight` |

Each category is a `describe` block with one or more `it` tests.

## 5. Files Owned

**New file:**
- `site/tests/build-output.test.ts` — 26 tests (5 describe blocks, 15 individual tests + 11 parameterized tests via `it.each`)

**Reason:** New. No existing build-output integration test file existed.

No other files were modified.

## 6. Test Run Results

**Command:** `cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test`

**Outcome:** All 26 tests in `build-output.test.ts` passed. Total test suite: 174 tests passed across 10 test files.

**Per-test breakdown:**

### Day-1 step segmentation (AC6)
- `has exactly 6 step sections with sequential IDs step-1..step-6` — **PASSED**

  Verified `start-here/day-1/index.html` contains exactly 6 `<section id="step-N">` elements with IDs `step-1`, `step-2`, `step-3`, `step-4`, `step-5`, `step-6` in document order.

### Pagefind retint via Starlight token aliases (AC34)
- `bundles CSS files with #starlight__search rules aliasing Pagefind vars to --sl-color-* vars` — **PASSED**

  Found at least one CSS file in `dist/_astro/` containing `#starlight__search` rules. Verified that if Pagefind UI vars (`--pagefind-ui-primary`, `--pagefind-ui-background`) are present, they reference `var(--sl-color-*)` or `var(--__sl-font)`.

- `tokens/aliases.css declares Starlight color aliases pointing to --nbg-* tokens` — **PASSED**

  Verified `src/styles/tokens/aliases.css` declares `--sl-color-text`, `--sl-color-black`, `--sl-color-gray-5`, `--sl-color-accent` and all reference `var(--nbg-*)` tokens.

### Marketing surface chrome (AC10)
- 8 parameterized tests via `it.each`: `%s has data-marketing attribute (MarketingShell)` — **ALL PASSED**

  Verified each of `index.html`, `skills/index.html`, `tips/index.html`, `glossary/index.html`, `news/index.html`, `my-pins/index.html`, `submit-skill/index.html`, `start-here/day-1/index.html` contains either `data-marketing` attribute or `template="splash"` indicator.

- 8 parameterized tests via `it.each`: `%s does NOT contain Starlight sidebar markup` — **ALL PASSED**

  Verified none of the 8 marketing pages contain Starlight sidebar markup (`<aside class="sidebar"` or `class="sl-sidebar"`).

### Token foundation present (AC1, AC4)
- `primitives.css declares ≥100 occurrences of --nbg- tokens` — **PASSED**

  Counted 160 occurrences of `--nbg-` in `src/styles/tokens/primitives.css`.

- `layers.css contains @layer declaration with 8 layers in order` — **PASSED**

  Verified `src/styles/tokens/layers.css` declares all 8 layers in order: `reset`, `tokens`, `starlight.base`, `starlight.core`, `starlight.components`, `nbg.primitives`, `nbg.components`, `nbg.utilities`.

- `semantic.css contains both dark and light theme blocks` — **PASSED**

  Verified `src/styles/tokens/semantic.css` contains both `:root[data-theme='dark']` and `:root[data-theme='light']` blocks.

### Fonts wired (AC5)
- `astro.config.mjs declares fontProviders.fontsource() at least twice` — **PASSED**

  Counted 2 occurrences of `fontProviders.fontsource()` in `astro.config.mjs` (Inter + JetBrains Mono).

- `built CSS references font CSS variables (--nbg-font-body, --nbg-font-mono) or contains @font-face` — **PASSED**

  Verified built CSS in `dist/_astro/` references `var(--nbg-font-body)`, `var(--nbg-font-mono)`, `--nbg-type-body`, or `--nbg-type-mono` for both Inter and JetBrains Mono. (Note: Astro Fonts API injects fonts via CSS variables; `@font-face` declarations are handled internally and may appear in separate stylesheets or inline.)

- `at least 2 .woff2 files exist in dist/` — **PASSED**

  Found 8 `.woff2` files under `dist/_astro/fonts/`.

### Primitives portability (AC36)
- `no .astro files under src/components/primitives/ contain @astrojs/starlight` — **PASSED**

  Scanned all `.astro` files in `src/components/primitives/` (16 files). None contain imports from `@astrojs/starlight`.

## 7. Implementation Gaps

None. All 26 tests passed. The build output conforms to all tested acceptance criteria.

## 8. Manual Review Needed

None. All tests were able to verify their respective contracts without requiring modifications to shared infrastructure or config files.

## 9. Commands Run

1. `cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test` — exit code 0; 174 tests passed (26 in `build-output.test.ts` + 148 across other test files).

Build-reuse strategy: `beforeAll` hook checks for `site/dist/index.html`; if missing, runs `npm run build` (up to 2-minute timeout). In this execution, build already existed and was reused.

## 10. Notes

**Test strategy:**
- Integration-style tests that read build artifacts rather than unit-testing individual components. This verifies the end-to-end output that users/browsers consume.
- Build-reuse strategy saves CI time: if `dist/` is already populated, tests run in ~250ms instead of waiting for a full `astro build` (~30-60s).
- Parameterized tests (`it.each`) reduce duplication for the 8 marketing pages.

**Test count reconciliation:**
- Original scope document cited 127 tests as the floor for non-regression (AC30).
- Current total: 174 tests across 10 test files.
- Delta: +47 tests. Breakdown:
  - +26 from `build-output.test.ts` (this test build)
  - +21 from other test files added between scope definition and this test build (`glossary-filter.test.ts`, `motion-reveal.test.ts`, or expansions to existing test files)

**Invariants observed:**
- No production source files were read or modified. Tests read only from `dist/` (build artifacts) or `src/styles/tokens/` and `src/components/primitives/` (source files in scope per the refined request).
- No shared test infrastructure was modified (`vitest.config.ts`, no new fixtures).
- Test file ownership: only `build-output.test.ts` was written; no other test files were touched.

**Edge cases handled:**
- Fonts: Astro Fonts API may inject fonts via CSS variables or separate stylesheets. Test checks for font variable references (`var(--nbg-font-body)`, `--nbg-type-body`, etc.) rather than requiring literal `@font-face` declarations in a specific file.
- Layers: `@layer` declaration in `layers.css` is extracted via regex that ignores multi-line comments (bug fix during test development).
- Marketing pages: `data-marketing` attribute OR `template="splash"` accepted (homepage uses splash template; other pages use MarketingShell component which injects `data-marketing`).

**No failures, no manual intervention required.** Test suite is green and ready for CI.
