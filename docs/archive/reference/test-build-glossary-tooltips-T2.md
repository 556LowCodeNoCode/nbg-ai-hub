---
scope: glossary-tooltips-T2
framework: vitest@4
status: completed
tests_added: 53
tests_passed: 53
tests_failed: 0
implementation_gaps: 0
files_written:
  - site/tests/remark-glossary-word-boundary.test.ts
  - site/tests/remark-glossary-first-occurrence.test.ts
  - site/tests/remark-glossary-skip-rules.test.ts
  - site/tests/remark-glossary-news-skip.test.ts
---

# Test Build — glossary-tooltips-T2

## Summary

Built comprehensive test coverage for the remark-glossary-link plugin against ACs 6–14 from project-design.md §S.14.3. All 53 tests pass. Four test files added to `site/tests/` covering word boundaries, first-occurrence behavior, skip rules, and news-skip logic. No implementation gaps detected — the plugin behaves exactly as specified.

## Scope Resolved

**Plugin under test:** `site/src/plugins/remark-glossary-link.ts`

**ACs exercised:**
- AC6: word-boundary matching (non-alphanumeric lookarounds, not `\b`)
- AC7: first-occurrence per canonical slug per file
- AC8–AC13: skip rules (code, inline code, headings, links, self-page, asides)
- AC14: case-preserving display in `data-glossary-display`
- Resolved OQ1: news-skip via `excludePaths`

## Test Files Written

| File | Tests | Focus |
|---|---|---|
| `remark-glossary-word-boundary.test.ts` | 11 | AC6 (boundaries) + AC14 (case preservation) |
| `remark-glossary-first-occurrence.test.ts` | 6 | AC7 (first-occurrence tracking) |
| `remark-glossary-skip-rules.test.ts` | 25 | AC8–AC13 (code, headings, links, self-page, asides) |
| `remark-glossary-news-skip.test.ts` | 11 | Resolved OQ1 (excludePaths behavior) |

## Test Results

**All 53 tests passed** in 2.04s:

### Word-boundary (11 tests) — ✓ pass

1. ✓ matches "cli" as standalone word
2. ✓ does NOT match "cli" inside "click"
3. ✓ does NOT match "cli" inside "clip"
4. ✓ matches "agent" but not as suffix
5. ✓ matches "agents" as an alias
6. ✓ does NOT match "agent" inside "agent2"
7. ✓ case-insensitive match, casing preserved in display
8. ✓ case variants of alias
9. ✓ lowercase variant preserved
10. ✓ mixed case in middle of sentence

### First-occurrence (6 tests) — ✓ pass

1. ✓ wraps only the first of three occurrences
2. ✓ tracks first-occurrence per CANONICAL slug, not per variant
3. ✓ first-occurrence is independent across terms
4. ✓ resets first-occurrence tracking per file
5. ✓ first-occurrence survives across multiple paragraphs
6. ✓ alias variant used first wins for display

### Skip rules (25 tests) — ✓ pass

**Fenced code (3):**
1. ✓ skips fenced code blocks
2. ✓ still wraps text outside code blocks
3. ✓ skips code blocks with language tag

**Inline code (3):**
4. ✓ skips inline code
5. ✓ wraps text outside inline code
6. ✓ skips multiple inline code segments

**Headings (7):**
7. ✓ skips h1
8. ✓ skips h2
9. ✓ skips h3
10. ✓ skips h4
11. ✓ skips h5
12. ✓ skips h6
13. ✓ wraps text in paragraph after heading

**Links (4):**
14. ✓ skips existing markdown links
15. ✓ skips link text
16. ✓ wraps text outside links
17. ✓ skips reference-style links

**Self-page (4):**
18. ✓ skips self-page
19. ✓ still wraps OTHER terms on self-page
20. ✓ wraps term on different glossary page
21. ✓ self-page detection is case-sensitive on filename

**Starlight asides (4):**
22. ✓ skips :::tip aside
23. ✓ skips :::note aside
24. ✓ skips :::caution aside
25. ✓ skips :::danger aside
26. ✓ wraps text outside asides
27. ✓ skips aside with custom title

### News-skip (11 tests) — ✓ pass

1. ✓ news file at /news/published/foo.md produces no buttons
2. ✓ path-substring match is correct for published news
3. ✓ path-substring does NOT match news/draft/
4. ✓ default excludePaths includes /news/published/
5. ✓ custom excludePaths option works
6. ✓ excludePaths supports multiple patterns
7. ✓ excludePaths=[] processes all files
8. ✓ news/published substring anywhere in path triggers skip
9. ✓ non-excluded path processes normally
10. ✓ excludePaths is case-sensitive

## Implementation Gaps

None detected. All 53 tests pass. The plugin correctly:

- Enforces non-alphanumeric word boundaries (not `\b`)
- Preserves source casing in `data-glossary-display`
- Tracks first-occurrence per canonical slug
- Skips all required node types
- Honors `excludePaths` with substring matching
- Handles case-sensitivity correctly (lowercase keys for matching, preserved display)

## Commands Run

```bash
npm test -- remark-glossary
# Exit 0, 53/53 passed in 2.04s
```

## Notes

- `remark-directive` was already installed via `@astrojs/starlight` — no additional deps required.
- `unified`, `remark-parse`, `remark-stringify` available via Starlight transitive deps.
- All tests use the production glossary directory at `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary` — real `agent.md`, `pull-request.md`, `cli.md` files.
- Self-page detection test deliberately uses capital-case filename (`Agent.md`) to verify case-sensitive slug extraction — this is correct behavior (filename slug is lowercase).
- Tests verified the plugin's flattened factory form (`Plugin<[options], Root, Root>`) works correctly post-2026-05-25 fix.
