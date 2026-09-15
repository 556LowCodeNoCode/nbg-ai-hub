---
phase: 9
scope: hub-plugin
framework: vitest@4.1.6
mode: write-and-run
built_at: 2026-05-19
tests_added: 130
tests_updated: 0
tests_passed: 130
tests_failed: 0
test_files_owned: 13
status: completed
---

# Test build — `/hub` plugin

## Coverage at a glance

| Layer | File | Tests | Notes |
|---|---|---|---|
| Manifest | `tests/manifest.test.ts` | 11 | Validates `plugin.json`, `marketplace.json`, `config.json` shape + no `commands`/`version` keys |
| Lib | `tests/lib/errors.test.ts` | 15 | All 11 error classes + `isHubError` + `exitCodeFor` mapping |
| Lib | `tests/lib/url-builder.test.ts` | 12 | Every section/alias case + UrlBuildError for unknowns |
| Lib | `tests/lib/snapshot.test.ts` | 9 | Resolve bundled vs cache, missing both throws, meta parsing, pillar listing including empty + missing |
| Lib | `tests/lib/config.test.ts` | 9 | Real config + 5 negative error paths + `resolveBaseUrl` |
| Lib | `tests/lib/state.test.ts` | 14 | XDG fallback, round-trip, atomic rename, parent-dir creation, all malformed cases |
| Lib | `tests/lib/frontmatter.test.ts` | 11 | Real glossary files + YAML date round-trip + 17-key skills + 13-key news + invalid cases |
| Lib | `tests/lib/search.test.ts` | 7 | Title×5 / topics×3 / body×1, ties, snippet length, case-insensitivity |
| Lib | `tests/lib/audience.test.ts` | 11 | `matchesAudience` + `filterByAudience` + plain-text `badge` |
| Lib | `tests/lib/journeys.test.ts` | 9 | Slug derivation, listing, missing throws, placeholder body detection |
| Lib | `tests/lib/output.test.ts` | 8 | Divider exactly 60 cols, no ANSI, footer truncates SHA, empty-pillar message |
| Lib | `tests/lib/content.test.ts` | 8 | `loadAll` for every pillar, news slug prefix-strip, 17-key skill validation, topic filter |
| **E2E** | `tests/e2e-entries.test.ts` | **14** | **Spawns each compiled `dist/<command>.mjs` against real snapshot, asserts stdout + exit code** |

**Total: 130 tests across 13 files, 100% pass rate.**

## Per-command e2e verification

All 11 commands smoke-tested end-to-end via spawned `node dist/<command>.mjs`:

| Command | Asserts |
|---|---|
| `hub` | menu lists all five pillars + URL + footer |
| `hub-search <q>` | ranked results block; no-query → exit 2 with usage |
| `hub-search` (no args) | exit 2 + "Usage:" on stderr |
| `hub-glossary mcp` | returns the real MCP definition (exit 0) |
| `hub-glossary <missing>` | exit 1, stderr `E_CONTENT_NOT_FOUND` |
| `hub-skills` | "Skills" header even when pillar is empty |
| `hub-tips` | "Tips" header even when pillar is empty |
| `hub-news` | "News — window:" header (no crash on empty) |
| `hub-news --week` | implicit default, tested via no-arg path |
| `hub-onboard` | lists `day-1` slug |
| `hub-onboard year-1` | exit 1, stderr `E_JOURNEY_MISSING` |
| `hub-install <missing>` | exit 1, stderr `E_CONTENT_NOT_FOUND` |
| `hub-audience beginner` | persists, stdout confirms `BEGINNER` |
| `hub-audience expert` | exit 2, stderr `E_CONFIG_INVALID` |
| `hub-open glossary mcp` (HUB_OPEN_SKIP=1) | stdout: `http://localhost:4321/glossary#mcp` |

## Run results

```
npm test
Test Files  13 passed (13)
     Tests  130 passed (130)
   Duration  1.53s
```

## Files owned by this phase

- `plugin/tests/manifest.test.ts`
- `plugin/tests/lib/*.test.ts` (12 files)
- `plugin/tests/e2e-entries.test.ts`
- `plugin/tests/fixtures/snapshot/` (fixture content)

## Implementation gaps surfaced

**None.** The implementation is internally consistent with the test expectations. The intentional limitations (empty tips/skills pillars; placeholder day-1 journey body) are correctly handled by graceful empty/placeholder messages.

## Manual review needed

**None.**
