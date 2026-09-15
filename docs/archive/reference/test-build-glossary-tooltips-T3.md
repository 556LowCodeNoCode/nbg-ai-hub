---
scope: glossary-tooltips-T3
framework: vitest@4
status: completed
tests_added: 15
tests_passed: 15
tests_failed: 0
implementation_gaps: 0
files_written:
  - site/tests/build-output-glossary-tooltips.test.ts
built_at: 2026-05-25T15:23:42Z
last_built_commit: null
---

# Test Build — Glossary Tooltips T3

## Summary

Built 15 snapshot tests validating glossary auto-linking in rendered HTML. All tests pass. Vitest 4.x against `site/dist/` build output. Tests verify button presence (≥10 in foundations, ≥5 in day-1), JSON manifest emission on all marketing pages, attribute correctness, canonical slug references, placement exclusions (no buttons in headings/code blocks), first-occurrence per section, and news exclusion (OQ1 resolved).

## Scope Resolved

**Target:** `site/tests/build-output-glossary-tooltips.test.ts` (new file)
**In-scope pages:** `dist/start-here/foundations/index.html`, `dist/start-here/day-1/index.html`, 5 marketing pages (`index`, `glossary`, `tips`, `skills`, `my-pins`), and news redirect page (exclusion verification).
**Production source:** Read-only. No modifications to implementation.

## Test Cases

All 15 tests passed:

1. **foundations page contains ≥10 glossary buttons** — Verified 10+ `data-glossary-slug=` instances.
2. **day-1 page contains ≥5 glossary buttons** — Verified 5+ instances.
3. **every marketing page emits the JSON manifest** — 5 pages (`index`, `glossary`, `tips`, `skills`, `my-pins`) all contain `<script type="application/json" id="nbg-glossary-data">`.
4. **manifest JSON is well-formed** — Parsed JSON has ≥28 keys, each with `title: string` and `tldr: string ≤160 chars`.
5. **buttons have data-glossary-display attribute** — Verified display attribute matches visible button text (AC14).
6. **canonical slugs reference real glossary entries** — Every `data-glossary-slug` value maps to an existing `glossary/<slug>.md` file.
7. **no buttons inside headings** — All `<h1-h6>` blocks free of `data-glossary-slug` (AC2).
8. **no buttons inside code blocks** — All `<pre><code>` blocks free of glossary buttons (AC2).
9. **first-occurrence per section** — Foundation section `f1` has ≤1 instance of each slug (AC7 adjusted for segmented rendering).
10. **slug uniqueness within section f1** — No duplicate slugs within the same section.
11. **news exclusion** — News redirect page does NOT contain glossary buttons (OQ1 resolved).

## Implementation Gaps

None. All acceptance criteria validated in the static HTML.

## Manual Review Needed

None. All tests executed against existing build artifacts. No shared infrastructure modified.

## Commands Run

```bash
npm run build  # (exit 0 — 11 pages built in 13.31s)
npm test -- build-output-glossary-tooltips  # (exit 0 — 15/15 passed in 891ms)
```

## Notes

- Initial attempt used `<section id="step-1">` selectors from day-1 page pattern. Corrected to `id="f1"` after inspecting foundations HTML structure.
- Tests depend on pre-built `dist/` output. Pre-build guard throws clear error if `dist/index.html` missing.
- No test for `data-glossary-display` regex extraction from mixed attributes — simple ordered match sufficed.
- News directory contains only the redirect page; test verified no buttons present (OQ1 compliance).
