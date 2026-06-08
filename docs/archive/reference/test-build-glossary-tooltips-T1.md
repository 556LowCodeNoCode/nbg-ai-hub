---
scope: glossary-tooltips-T1
framework: vitest@4
status: completed
tests_added: 20
tests_passed: 20
tests_failed: 0
implementation_gaps: 0
files_written:
  - site/tests/glossary-schema.test.ts
  - site/tests/glossary-term-component.test.ts
  - site/tests/audit-glossary-no-mutation.test.ts
---

# Test Build — glossary-tooltips (T1)

## Summary

Built and executed 20 tests across three files covering schema validation, component portability, and audit script guarantees. All tests pass. No implementation gaps surfaced.

## Test Coverage

### glossary-schema.test.ts (10 tests)
Tests the extended glossary schema (AC1, AC2, AC3, AC4, AC5):
- ✓ accepts valid glossary frontmatter (AC1)
- ✓ accepts missing aliases (defaults to []) (AC2)
- ✓ rejects missing tldr (AC3)
- ✓ rejects empty tldr (AC3)
- ✓ rejects tldr > 160 chars (AC3)
- ✓ rejects non-array aliases (AC3)
- ✓ rejects non-string in aliases array (AC3)
- ✓ every glossary file has valid tldr ≤160 chars (AC4)
- ✓ 7 new glossary files exist with valid frontmatter (AC5) — validates cli.md, frontmatter.md, yaml.md, markdown.md, rss.md, model.md, hook.md
- ✓ exactly 28 glossary .md files exist (AC5)

### glossary-term-component.test.ts (6 tests)
Tests the GlossaryTerm.astro component via file inspection (AC15, AC16, AC20, AC21, AC22):
- ✓ exists at primitives path (AC20)
- ✓ has zero @astrojs/starlight imports (AC21)
- ✓ uses only --nbg-* tokens, no raw colour literals (AC22)
- ✓ emits popover + aria-describedby plumbing (AC15, AC16)
- ✓ emits popover element with popover attribute (AC15)
- ✓ uses `<span popover>` not `<div popover>` (AC15 / §S.14.10 R-4)

### audit-glossary-no-mutation.test.ts (4 tests)
Tests the audit script's no-mutation guarantee (AC24):
- ✓ script exists and is executable via node (AC24)
- ✓ writes exactly one file under docs/reference/ (AC24)
- ✓ does NOT contain any write under glossary/ (AC24)
- ✓ pinned date stamp pattern in output filename (AC24)

## Test Run

```bash
npm test -- glossary-schema.test glossary-term-component.test audit-glossary-no-mutation.test
```

Exit code: 0
Duration: 1.42s
Tests: 20 passed / 20 total

## Implementation Gaps

None. All acceptance criteria verified at the test level pass cleanly.

## Manual Review Needed

None.
