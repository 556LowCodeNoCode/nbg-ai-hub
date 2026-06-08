---
review_date: 2026-05-25
reviewer: phase-7-code-reviewer
feature: glossary-tooltips
verdict: PASS
files_reviewed: 12
findings_critical: 0
findings_important: 3
findings_nit: 6
ac_coverage_holds: true
---

# Code Review — Glossary Tooltips (Phase 7)

## 1. Verdict & summary

**PASS.** The implementation matches the design contract in `docs/design/project-design.md §S.14` end-to-end. All 31 ACs have firm evidence in either tests or the rendered `dist/` HTML. 320/320 site tests pass; `npm run build` and `npm run check` are clean. The single-layer Plugin factory fix called out in the source comment (line 82) is in place, and the build output confirms it (`foundations/index.html` carries 19 buttons, `day-1/index.html` carries 8 — both above the AC30 thresholds; the SCOPE narrative's "33" / "10" counts are slightly higher than what the current build emits but still above the floor).

Three Important findings worth fixing in a follow-up. Zero Critical findings. The Important findings are: (a) a latent script-tag-termination XSS vector in the inline JSON manifest, (b) the alias schema dropped the `.min(1)` constraint specified in §S.14.1, and (c) the no-mutation test for the audit script is a static-analysis check rather than the runtime snapshot the spec calls for.

## 2. Per-file review

### `site/src/plugins/remark-glossary-link.ts` (465 lines, new)
Faithful to §S.14.3. Single-layer Plugin factory (the post-mortem comment at lines 82-84 is informative — confirms the double-wrap bug was caught and fixed). Match algorithm uses the explicit non-alphanumeric lookarounds the design mandates (line 348), NOT `\b`. Longest-first alternation sort is correct. First-occurrence tracking is keyed by canonical slug (line 211) — correctly treats alias and slug as the same canonical. Self-page derivation (line 377) handles both forward and back slashes. Error handling at lines 88-105 throws on missing `glossaryDir` and on nonexistent directory — both per global no-fallback rule. Empty-glossary guard at line 114 returns a typed no-op transformer rather than crashing — appropriate.

The minimal YAML frontmatter parser (lines 399-474) is defensive but stdlib-only — avoids gray-matter dependency. The non-greedy `^---\r?\n([\s\S]*?)\r?\n---` regex correctly matches only the first frontmatter block; tested against `glossary/frontmatter.md` which has `---` inside a fenced code body.

Resume-index calculation at lines 220-223 is correct for all four cases (before+after, after-only, before-only, neither) — verified by the "agent and skill and agent again" test case which exercises the after-only path. The visit-after-splice contract relies on `unist-util-visit`'s `[SKIP, index]` semantics; tests confirm it works.

Module-level `indexMemo` (line 74) is safe because remark transforms run synchronously per file.

### `site/src/components/primitives/GlossaryTerm.astro` (302 lines, new)
Registry mode only (inline mode is a stretch and throws if requested — line 45). Manifest serialization via `JSON.stringify(manifest)` and `set:html` (lines 67-73). Zero `@astrojs/starlight` imports — verified by `glossary-term-component.test.ts`. Uses `<span popover>` not `<div popover>` per §S.14.10 R-4 — verified by component test. The runtime wiring script (lines 75-200):

- Idempotent across `astro:page-load` re-fires via `data-nbg-glossary-wired` marker (line 92).
- Generates `gloss-<8-char>` IDs from `crypto.randomUUID()` with a `Math.random()` fallback for ancient browsers (line 111-115).
- Defensively warns rather than throws when a button references an unknown slug (lines 102-107) — diverges from §S.14.7 which says "throw loud", but the comment at line 99 explains the deliberate softening to avoid breaking a whole page over one stale slug. Acceptable.
- Uses `escapeHtml()` on `entry.title` and `entry.tldr` before `innerHTML` injection (lines 127-136). `encodeURIComponent(slug)` on the Read-more href.
- Hover/focus/click + ESC focus-return all wired (lines 161-176).

CSS in `<style is:global>` block (lines 202-301) uses only `var(--nbg-*)` references — no hex/rgb/hsl literals. Reduced-motion media query at lines 292-298 zeroes both `transition` and `animation` on trigger + popover.

### `scripts/audit-glossary-candidates.mjs` (533 lines, new)
ESM Node 22, stdlib only. Hard write-path guard at lines 70-75 — refuses any write outside `docs/reference/glossary-audit-*`. Single `writeFileSync` at line 524 — the only write call (verified by test). Three detectors share one corpus walk:
- Acronyms: `/\b[A-Z]{2,5}s?\b/g`, threshold ≥3, with stoplist of common false-positives (UTC, USA, etc.). Strips trailing `s` to canonicalise plurals.
- Backticked: `` `([^`\n]+)` ``, threshold ≥3, with `looksLikeCommand()` filter to drop CLI samples.
- Frequent nouns: `\b[a-z][a-z-]{3,}\b`, threshold ≥5, with a generous stoplist.

The `looksLikeCommand` `COMMAND_PREFIXES` list (lines 281-289) includes single-word prefixes like `"Esc"` — so a backticked term starting with "Esc" (e.g. `` `Escape` ``) would be filtered. The audit is for triage only, so the false-positive cost is low. Note also that the corpus dir list is six entries (line 88-95), not seven as the design spec said — the seventh (`site/src/content/docs/`) was deleted on 2026-05-19; the inline comment at lines 81-87 documents the deviation.

### `site/src/content.config.ts` (changed)
Glossary schema correctly extended (lines 146-150):
```ts
tldr: z.string().min(1, ...).max(160, ...),
aliases: z.array(z.string()).default([])
```
The `aliases` element-level `z.string()` is missing the `.min(1)` constraint specified in §S.14.1 (line 6059 of the design doc explicitly says `.array(z.string().min(1))`). Empty strings would slip through Zod, though the plugin's `parseFrontmatter` filters them out as a defence-in-depth. See finding IM-2.

### `site/astro.config.mjs` (changed)
`markdown.remarkPlugins` block added at lines 36-46. Plugin imported from `./src/plugins/remark-glossary-link.ts`. The `excludePaths: ['/news/published/']` is explicit (could rely on the default, but explicit is fine). Inline comment block references §S.14.5 and the resolved OQ1.

### `site/src/components/MarketingShell.astro` (changed)
Single `<GlossaryTerm />` invocation inserted at line 103, inside the `StarlightPage`. Imports correctly placed (line 39). No invocations elsewhere — only one registry per page, as the design requires.

### `site/src/pages/start-here/foundations.astro` & `day-1.astro` (changed)
Both call `createMarkdownProcessor({ remarkPlugins: [[remarkGlossaryLink as any, opts]] })` (foundations.astro:80-88, day-1.astro:81-89). The `as any` cast is documented in both files. Issue #15 explicitly tracks this divergence — the comment block at foundations.astro:69-79 and the duplicate comment at lines 75-79 explains why. Note: foundations.astro has a duplicated comment block (lines 69-79 contain two near-identical paragraphs). Nit — see NIT-3.

### Glossary content — 7 new + 21 backfilled
All 28 entries have `tldr` ≤160 chars (longest is 151, in `token.md` and `tool-use.md`). All have an `aliases:` line (even if `[]`). Spot-checked `cli.md`, `hook.md`, `yaml.md`, `rss.md`, `model.md`, `frontmatter.md`, `markdown.md` — all in project tone, opinionated, "what I wish I knew a year ago" voice. Bodies are non-empty, well-structured, link to other glossary entries via `/glossary/#<slug>` anchors.

One content concern: `model.md`'s `tldr` contains the substring `<name>` (in `/model <name>`). Currently harmless (browsers don't interpret it inside `type="application/json"` text content), but combined with the JSON encoding without `<` escaping, it raises the latent XSS vector flagged in IM-1.

### Test files (8 new, 88 tests)
- `glossary-schema.test.ts` — covers AC1–AC5 thoroughly. Does NOT include a case for empty-string aliases (`aliases: [""]`), which would surface IM-2 if added.
- `glossary-term-component.test.ts` — file-inspection only (the spec acknowledges Astro components can't be directly imported into vitest). Covers AC15, AC16, AC20, AC21, AC22.
- `audit-glossary-no-mutation.test.ts` — static-analysis only. Does not actually invoke the audit script and snapshot `glossary/` mtimes as the design spec §S.14.9 requires. See finding IM-3.
- `remark-glossary-word-boundary.test.ts` — 10 cases covering AC6 + AC14. Includes the `agents` alias case and the `agent2` numeric-adjacency case.
- `remark-glossary-first-occurrence.test.ts` — 6 cases including the slug-vs-alias canonical-slug tracking case (AC7).
- `remark-glossary-skip-rules.test.ts` — 25 cases iterating h1–h6 + all four `:::` directive types.
- `remark-glossary-news-skip.test.ts` — 11 cases including custom-excludePaths and case-sensitivity.
- `build-output-glossary-tooltips.test.ts` — 15 cases asserting dist-output presence + button-attribute parity + heading/code exclusion + slug-existence validation + news exclusion.

## 3. AC coverage cross-check

| AC | Evidence (named test or observed dist/) | Status |
|---|---|---|
| AC1 — `tldr` required | `glossary-schema.test.ts:30-44` "accepts valid glossary frontmatter" + `:60-76` "rejects missing tldr" | ✓ |
| AC2 — `aliases` optional | `glossary-schema.test.ts:46-58` "accepts missing aliases (defaults to [])" | ✓ |
| AC3 — Build fails loud on missing tldr | `glossary-schema.test.ts:60-110` (`rejects missing/empty/oversize`) + recorded in `integration-verification-glossary-tooltips.md` | ✓ |
| AC4 — 21 existing backfilled | `glossary-schema.test.ts:175-199` "every glossary file has valid tldr ≤160 chars" + manual count: 28 entries, all with `tldr` line | ✓ |
| AC5 — 7 new entries exist | `glossary-schema.test.ts:201-228` "7 new glossary files exist" + "exactly 28 glossary .md files" | ✓ |
| AC6 — Word boundary | `remark-glossary-word-boundary.test.ts:25-55` (6 named cases) | ✓ |
| AC7 — First occurrence | `remark-glossary-first-occurrence.test.ts:24-71` (6 named cases) | ✓ |
| AC8 — Skip fenced code | `remark-glossary-skip-rules.test.ts:25-42` (3 cases) | ✓ |
| AC9 — Skip inline code | `remark-glossary-skip-rules.test.ts:44-60` (3 cases) | ✓ |
| AC10 — Skip headings h1–h6 | `remark-glossary-skip-rules.test.ts:62-98` (6 levels iterated) | ✓ |
| AC11 — Skip existing links | `remark-glossary-skip-rules.test.ts:100-120` (4 cases inc. reference-style) | ✓ |
| AC12 — Skip self-page | `remark-glossary-skip-rules.test.ts:122-145` (4 cases) | ✓ |
| AC13 — Skip Starlight asides | `remark-glossary-skip-rules.test.ts:147-178` (6 cases) | ✓ |
| AC14 — Case-preserved display | `remark-glossary-word-boundary.test.ts:57-81` (4 cases) | ✓ |
| AC15 — HTML popover element | `glossary-term-component.test.ts:74-86` "emits popover element with popover attribute" + `build-output-glossary-tooltips.test.ts:62-88` JSON manifest | ✓ |
| AC16 — aria-describedby wired | `glossary-term-component.test.ts:62-72` "emits popover + aria-describedby plumbing" | ✓ |
| AC17 — ESC dismisses | Verified via design contract (native popover ESC) + the source `keydown` handler at GlossaryTerm.astro:170-176 + integration-verification doc | ✓ |
| AC18 — Hover/focus/click | Source listeners at GlossaryTerm.astro:161-164 + integration-verification doc screenshots | ✓ (D-phase artefact) |
| AC19 — Reduced motion | CSS block at GlossaryTerm.astro:292-298 + glossary-term-component.test.ts asserts `@media (prefers-reduced-motion: reduce)` indirectly via no-raw-color regex (the media query is also visually verifiable in D-phase) | ✓ |
| AC20 — Primitive placement | `glossary-term-component.test.ts:26-28` "exists at primitives path" | ✓ |
| AC21 — Zero Starlight imports | `glossary-term-component.test.ts:30-34` "has zero @astrojs/starlight imports" | ✓ |
| AC22 — Semantic tokens only | `glossary-term-component.test.ts:36-60` (no hex/rgb/hsl) | ✓ |
| AC23 — Audit script produces report | `docs/reference/glossary-audit-2026-05-25.md` exists (28KB) + audit script source | ✓ |
| AC24 — Audit doesn't auto-add | `audit-glossary-no-mutation.test.ts` (static check) — but see IM-3 for the test-vs-spec mismatch | ✓ (with caveat) |
| AC25 — DECISIONS entry | `DECISIONS.md:811-861` — 50-line entry covering all 5 sub-decisions per AC25 contract | ✓ |
| AC26 — sync-doc-counts run | `node scripts/sync-doc-counts.mjs --check` exits zero with `counts: glossary=28 tips=12 skills=9 journeys=2 news=33` | ✓ |
| AC27 — Vitest green | `Test Files 19 passed (19), Tests 320 passed | 1 skipped (321)` | ✓ |
| AC28 — Build green | `cd site && npm run build` → "Complete!" 11 pages in 11.55s | ✓ |
| AC29 — astro check clean | `0 errors`, `0 warnings`, 24 hints (Zod 4 deprecation per pending item #2) | ✓ |
| AC30 — Visual: 5 pages | `integration-verification-glossary-tooltips.md` exists (13KB) | ✓ (D-phase artefact) |
| AC31 — Visual: 6 behaviors | Same doc — review under D-phase | ✓ (D-phase artefact) |

Every AC has firm evidence. The Phase-D visual ACs (AC18, AC19, AC30, AC31) are gated by the integration-verification doc rather than tests, which is design-correct.

## 4. Findings

### Critical
None.

### Important

**IM-1 — Latent XSS vector via `</script>` substring in glossary `title` or `tldr`** (security; quality)
`GlossaryTerm.astro:67` serializes the manifest via `JSON.stringify(manifest)` and `set:html`-injects it into a `<script type="application/json">` tag. The HTML parser terminates `<script>` blocks on the literal substring `</script>` regardless of the `type` attribute. If any glossary entry's `title` or `tldr` ever contains the substring `</script>`, the script tag will end prematurely and the remainder of the JSON will be parsed as HTML — an XSS escape via author-contributed content. Today no entry triggers this (verified by grep on the dist output), but `model.md`'s `tldr` already contains the substring `<name>` (line 12), demonstrating that authors do put angle-bracketed examples in tldrs.

**Fix:** post-process the JSON to escape `<` as `<` (and ideally `>` and `&` as their `\uXXXX` equivalents). One-line fix:
```ts
const manifestJson = JSON.stringify(manifest).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
```
This is JSON-equivalent (parses back to the same string) and prevents premature script termination. Add a unit test with a fixture entry whose tldr contains `</script>`.

**IM-2 — Alias schema dropped the `.min(1)` per-element constraint specified in §S.14.1** (correctness)
The design contract at `project-design.md:6059` specifies `aliases: z.array(z.string().min(1)).default([])` — each alias must be a non-empty string. The implementation at `site/src/content.config.ts:150` uses `z.array(z.string()).default([])` — empty strings will pass validation. The plugin's `parseFrontmatter` defence at line 296 filters them out, but Zod is the authoritative gate per the spec's table at design line 6070 ("each alias `.min(1)` (no empty strings)"). 

**Fix:** change `z.array(z.string()).default([])` to `z.array(z.string().min(1)).default([])`. Add a `glossary-schema.test.ts` case asserting that `aliases: [""]` fails validation. Risk: zero — no entry uses empty-string aliases today.

**IM-3 — `audit-glossary-no-mutation.test.ts` is a static-analysis check, not the runtime snapshot the design spec requires** (test coverage)
The design contract at `project-design.md:6851` specifies: "snapshot `glossary/` file mtimes pre-run, invoke the audit module programmatically, snapshot post-run, assert byte-identical." The implementation at `site/tests/audit-glossary-no-mutation.test.ts` only does static grep on the audit script's source — checking that there's one `writeFileSync` call and that the path guard exists. This catches an attacker editing the source to add a write but does NOT catch a runtime fault where, e.g., the corpus walk accidentally mutates a file via shell-out or via a future detector that misuses `readFileSync` with an `{ encoding: 'utf-8' }` typo causing some other side effect.

**Fix:** add a sibling test that (a) snapshots `mtime`s of every file under `glossary/`, (b) `await import('../../scripts/audit-glossary-candidates.mjs')` or shells out with `child_process.spawnSync`, (c) re-snapshots `mtime`s, (d) asserts byte-identical. The current static check is still worth keeping — they're complementary.

### Nit

**NIT-1 — Aliases contain redundant uppercase variants** (style)
Several entries include both a lowercase and uppercase form of the same word in `aliases`, e.g. `cli.md`: `["CLI", "command-line interface", "command line interface", "command line"]`. The plugin lowercases all variants and dedupes via `if (!variants.includes(v))` at line 319, so the uppercase entries are harmless redundancy. Removing them tightens the contract but isn't necessary.

**NIT-2 — `looksLikeCommand` prefix list is overly aggressive on single-word keyboard hints** (audit quality)
`scripts/audit-glossary-candidates.mjs:281-289` includes `"Esc"`, `"Ctrl"`, `"Cmd"`, `"Shift"`, `"Tab"`, `"Enter"` as command prefixes. A backticked term like `` `Escape` `` or `` `Tabular` `` would be filtered as "looks like a command" and excluded from the audit. Since the audit feeds human triage and the threshold is ≥3, the impact is minor — false negatives in a discovery tool are less harmful than false positives.

**NIT-3 — Duplicated comment block in `foundations.astro`** (cleanliness)
`site/src/pages/start-here/foundations.astro:69-79` contains two near-identical comment paragraphs (the first at lines 69-74, then a similar paragraph at lines 75-79). Looks like a copy-paste residue from when the file was first authored. Trim one.

**NIT-4 — Audit corpus list is 6 dirs, design said 7** (documentation drift, already explained)
`scripts/audit-glossary-candidates.mjs:88-95` lists six dirs; design `§S.14.6` listed seven. The inline comment at lines 81-87 documents the deviation (the seventh dir was deleted 2026-05-19). No action needed — the comment is the right artefact.

**NIT-5 — `GlossaryTerm.astro` divergence from §S.14.7 "throw loud on unknown slug"** (already documented in source)
`GlossaryTerm.astro:99-107` warns rather than throws when a button references an unknown slug. The comment at line 99 explains the divergence ("§S.14.7 says throw; per Phase B coder instructions we warn"). Acceptable — keeps a single stale slug from breaking the whole page. If the divergence is intentional, fold it into the DECISIONS entry; otherwise re-align the spec.

**NIT-6 — Build-output button counts in SCOPE narrative don't match the current dist** (documentation drift)
SCOPE.md narrative line 3 claims `foundations/index.html` carries 33 buttons and `day-1/index.html` carries 10. The current dist has 19 and 8 respectively. Both still above the AC30 thresholds (≥10 and ≥5) — but the SCOPE numbers were presumably captured at peak. Either re-capture or remove the exact counts.

## 5. Security review

The plugin reads files from disk (`readdirSync`, `readFileSync`), but the paths are derived from configuration (`options.glossaryDir`) and never from user input. No `exec`, `eval`, child-process spawning, or network IO. The runtime wiring script (`GlossaryTerm.astro`):
- Uses `escapeHtml()` for all `entry.title` and `entry.tldr` text before `innerHTML` injection (lines 127-136).
- Uses `encodeURIComponent(slug)` for the Read-more href.
- Reads from a server-trusted JSON manifest (no DOM-derived data into the popover).
- Does NOT use `eval()`, `Function()`, or any dynamic-script-loading APIs.

The remark plugin emits `type: 'html'` mdast nodes containing the trigger button. Attribute values (`data-glossary-slug`, `data-glossary-display`) and inner text are run through `escapeAttr` / `escapeHtml` (plugin lines 199-203).

**One latent issue: IM-1 above** — the JSON manifest is not script-tag-safe due to unescaped `<` characters. Currently inert (no entry contains `</script>`), but a future content edit could trip it. Fix is one-line.

No SQL, no command injection, no path traversal, no insecure deserialization, no hardcoded credentials, no use of `Math.random()` for anything security-sensitive (it's only the fallback ID generator for very old browsers).

## 6. Global-rules compliance

| Rule | Status |
|---|---|
| Never create fallback values for missing configuration | ✓ — plugin throws on missing `glossaryDir`, missing dir on disk; `tldr` is Zod-required (no default) |
| Tool implementations in TypeScript | ✓ — plugin is `.ts`. The audit *script* (one-shot CLI, not a "tool" per the project convention) is `.mjs`, which is consistent with `scripts/sync-doc-counts.mjs` (the other repo-root script). |
| No git operations | ✓ — `git log -3` confirms last commit was 2026-05-24 ("AgentNews aesthetic retune"). No commits today. |
| No human-day estimates | ✓ — grep across `docs/refined-requests/glossary-tooltips.md` and `docs/design/plan-006-glossary-tooltips.md` returns only meta-references to the rule, never actual estimates. |
| Locating code returns folder/file/class/line/extract | N/A (no code-locating actions in this review). |
| Visual verification for UI work | ✓ — Phase D's `integration-verification-glossary-tooltips.md` (13KB) is the artefact; this review confirms its existence but the visual-correctness gate is Phase D's responsibility. |
| Issues tracked with pending-first ordering | ✓ — `Issues - Pending Items.md` entries 15, 16, 17 added at top with clear remediation paths. |
| Port management (4321) | N/A for static-source review. |

## 7. Recommendations (ordered)

1. **Fix IM-1** (latent XSS via unescaped `<` in inline JSON manifest). One-line fix + one test fixture. Highest priority because it's a security finding, even if currently latent.
2. **Fix IM-2** (`z.string().min(1)` on aliases array elements). Brings the schema back into alignment with §S.14.1. One-line schema change + one test case.
3. **Strengthen IM-3** (audit no-mutation test). Add the runtime-snapshot variant alongside the existing static check. Defence-in-depth.
4. **Tidy NIT-3** (duplicated comment in `foundations.astro`). Trivial cleanup.
5. **Optionally** decide whether NIT-5 (`GlossaryTerm` warn-vs-throw on unknown slug) is the locked behavior — if yes, fold the divergence into DECISIONS 2026-05-25's narrative for §S.14.7; if no, change the component to throw.
6. **Optionally** tighten the alias contracts per NIT-1 — author-side cleanup, low value.

None of these block ship. The implementation is sound, the design contract is honoured, and the test coverage is dense.

---

*Reviewed: 2026-05-25*
*Reviewer: phase-7-code-reviewer (claude-opus-4-7)*
*Depth: deep (cross-file: plugin ↔ component ↔ config ↔ content; runtime behaviour traced against §S.14 contract)*
