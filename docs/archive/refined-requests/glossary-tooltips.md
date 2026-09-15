---
request: glossary-tooltips
category: development (cross-cutting site feature + content)
target_workspace: site/ (+ glossary/, scripts/)
date: 2026-05-25
parent_workflow: beginner-foundations (loose follow-on; the glossary expansion landed there made the tooltip surface viable)
status: refined
---

# Refined Request: Glossary Auto-Linking + Hover Tooltips

## Category
Development (cross-cutting site feature + content backfill)

## Objective
Make the glossary load-bearing across the NbgAiHub site by auto-linking glossary terms (and their aliases) on first occurrence within each content page, and rendering a short hover/focus/tap tooltip with a "Read more" link to the full entry. Build-time only — no runtime AI, no client search backend. The feature must enforce a 160-char `tldr` on every glossary entry as a hard build requirement (no silent fallbacks).

## Scope

**In scope:**
- Schema extension to `glossary` collection: required `tldr` (≤160 chars, plain text) and optional `aliases` array.
- Backfill of `tldr` + `aliases` across the existing 21 glossary entries.
- 6 new mandatory glossary entries: `cli`, `frontmatter`, `yaml`, `markdown`, `rss`, `model` — each with full frontmatter (10 base keys + `tldr` + optional `aliases`) and body copy.
- Custom remark plugin loaded via `site/astro.config.mjs#markdown.remarkPlugins` that:
  - Loads glossary slugs + aliases once at build start.
  - Walks each markdown AST, matches terms case-insensitively with word-boundary awareness, preserves source casing for display.
  - Replaces the first occurrence per page only.
  - Skips fenced code blocks, inline code, headings (h1–h6), existing markdown links, the glossary entry's own page (i.e. `currentSlug === term.slug`), and Starlight `<aside>` callouts.
  - Wraps matches with the `<GlossaryTerm slug="…" display="…"/>` component.
- `GlossaryTerm.astro` primitive under `site/src/components/primitives/`:
  - Focusable `<button>` carrying the HTML `popover` attribute.
  - Tooltip surface uses existing semantic tokens (no new colours).
  - Triggers on hover, focus, click/tap; ESC dismisses; `aria-describedby` wired to popover id.
  - Honors `prefers-reduced-motion: reduce` (no transition/animation).
  - Zero `@astrojs/starlight` imports — AC36/AC37 portability gate.
- Audit script that scans content for jargon (capitalised acronyms ≥3 occurrences, backticked terms not in glossary, recurring nouns) and writes a markdown report for human triage. Does **not** auto-add terms.
- Tests in `site/tests/` (Vitest 4.x) covering schema validation, word-boundary matching, first-occurrence behavior, skip rules, build-time snapshot.
- Visual verification of 5 pages via headless Chrome / Puppeteer.
- `docs/reference/integration-verification-glossary-tooltips.md` capturing the verification evidence.
- DECISIONS.md entry dated 2026-05-25; SCOPE.md updated in the same edit if scope shifts; Issues - Pending Items.md for any unresolved gaps.
- `node scripts/sync-doc-counts.mjs` run after the content additions.

**Out of scope:**
- Plugin / terminal (`/hub-*`) changes — the hub plugin keeps its current glossary rendering.
- Multi-occurrence linking on the same page (explicit first-occurrence-only design).
- Touch-target redesign for mobile beyond what the popover natively gives.
- Semantic search / autocomplete over glossary.
- Auto-adding audit-discovered terms — report only, human triage gates adoption.
- Greek-language content.
- Theming changes — uses existing semantic tokens only.
- Glossary entries beyond the 6 mandatory additions in this pass.

## Requirements

1. **Schema extension** — `site/src/content.config.ts` glossary collection adds:
   - `tldr: z.string().min(1).max(160)` — required, plain text, no markdown.
   - `aliases: z.array(z.string()).default([])` — optional, defaults to empty array.
   No other glossary fields change.
2. **Build-fail-loud** — a glossary entry missing `tldr` (or with `tldr.length > 160`) MUST cause `npm run build` to exit non-zero with a clear Zod validation error. No silent fallback string is ever rendered.
3. **Existing 21 entries backfilled** — every file under `glossary/` has a non-empty `tldr` ≤160 chars; entries with obvious plural/abbreviation aliases have `aliases` populated per the contract:
   - `pull-request` → `["PR", "PRs"]`
   - `repository` → `["repo", "repos"]`
   - `hook` → `["hooks"]`
   - `skill` → `["skills"]`
   - `plugin` → `["plugins"]`
   - `large-language-model` → `["LLM", "LLMs"]`
   - (other aliases at author's discretion, e.g. `claudemd` → `["CLAUDE.md"]`)
4. **6 new mandatory glossary entries** — `glossary/cli.md`, `glossary/frontmatter.md`, `glossary/yaml.md`, `glossary/markdown.md`, `glossary/rss.md`, `glossary/model.md`. Each has the 10 base keys + `tldr` + optional `aliases` + full body copy in project tone.
5. **Remark plugin** lives under `site/src/lib/remark-glossary.ts` (or equivalent path inside `site/`), is loaded by `site/astro.config.mjs#markdown.remarkPlugins`, and:
   - Loads glossary slug + alias index once at plugin initialization (build start).
   - Walks the markdown AST and matches whole-word, case-insensitive occurrences of any slug or alias.
   - Replaces only the **first** match per file per term (tracked in plugin state keyed by file path).
   - Replaces with an MDX/HTML node that renders `<GlossaryTerm slug="<canonical-slug>" display="<source-text>"/>`.
   - Skips matches inside: fenced code blocks (` ``` `), inline code (`` ` ``), heading nodes (h1–h6), existing link nodes, MDX/Starlight `<aside>` directive blocks.
   - Skips matches when the current file IS the glossary entry for that term (passed in as `currentSlug` or derived from `file.path`).
6. **Word-boundary correctness** — matching must NOT trigger inside other words:
   - `cli` does not match inside `click`, `clipped`, `command-line` (hyphen counts as boundary).
   - `agent` does not match inside `agents` UNLESS `agents` is an explicit alias.
   - Numeric / alphanumeric adjacency does not count as boundary (so `agent2` does not match).
7. **Case-insensitive matching, casing-preserving display** — `PR`, `pr`, `Pr` all match the `PR` alias; the rendered link displays whatever the source markdown wrote.
8. **`GlossaryTerm.astro`** lives at `site/src/components/primitives/GlossaryTerm.astro` and:
   - Renders a focusable `<button type="button">` with attributes `popovertarget="gloss-<id>"`, `aria-describedby="gloss-<id>"`.
   - Renders a sibling `<div id="gloss-<id>" popover>` containing the term title, `tldr`, and a "Read more →" link to `/glossary#<slug>`.
   - Wires hover (CSS) + focus (CSS `:focus-visible`) + click/tap (native `popover` attribute) all to the same popover.
   - Listens for `Escape` to dismiss (native popover behavior + explicit JS belt-and-braces).
   - Imports nothing from `@astrojs/starlight` — verified by a test that greps the file content.
   - Uses only existing tokens from `site/src/styles/tokens/semantic.css` (and primitives.css aliases). If a new surface variant is needed, it is added as a semantic alias in `semantic.css`, not as a new colour.
9. **Reduced-motion** — when `@media (prefers-reduced-motion: reduce)` matches, no opacity/transform transition runs; popover open/close is instantaneous.
10. **Audit script** — lives at `scripts/audit-glossary-candidates.mjs` (or `site/scripts/…`), runs as `node scripts/audit-glossary-candidates.mjs`, scans `glossary/`, `tips/`, `skills/`, `journeys/`, `news/published/`, `site/src/pages/`, `site/src/content/docs/` for:
    - Capitalised acronyms (`/\b[A-Z]{2,}s?\b/`) appearing ≥3 times across the corpus and not already covered by a glossary slug or alias.
    - Backticked terms (`` /`([^`]+)`/ ``) appearing ≥3 times and not already covered.
    - Frequent multi-occurrence nouns (best-effort heuristic — script may use a simple ≥5-occurrence filter on lowercase tokens with stop-word exclusion).
    Output: a markdown report at `docs/reference/glossary-audit-2026-05-25.md` with one section per category, each entry showing term + count + sample file/line. **The script must NOT modify any glossary file.**
11. **Tests** — new test files under `site/tests/`:
    - `glossary-schema.test.ts` — Zod accepts valid; rejects missing/oversize `tldr`; accepts default `aliases: []`.
    - `remark-glossary-word-boundary.test.ts` — positive + negative word-boundary cases per AC6.
    - `remark-glossary-first-occurrence.test.ts` — only the first match per file is wrapped; subsequent matches pass through.
    - `remark-glossary-skip-rules.test.ts` — fenced code, inline code, headings h1–h6, existing links, self-page, asides are all skipped.
    - `glossary-term-component.test.ts` — renders focusable button with popover wiring and `aria-describedby`; renders the `Read more →` link; component file contains zero `@astrojs/starlight` import statements.
    - `build-output-glossary-tooltips.test.ts` (or extension of existing `build-output.test.ts`) — after a build, at least one tip page, one skill page, one journey page contains a `<button popovertarget="gloss-…">` element.
12. **Visual verification** — headless-Chrome script captures screenshots of 5 pages with a glossary term hovered/focused: `/`, one tip page (e.g. `/tips/<slug>/`), one skill page (e.g. `/skills/<slug>/`), one journey page (`/start-here/foundations/` or `/start-here/day-1/`), `/glossary/`. Screenshots embedded in `docs/reference/integration-verification-glossary-tooltips.md`.
13. **DECISIONS.md** — append a dated 2026-05-25 entry capturing: (a) build-time vs runtime decision, (b) first-occurrence-only design, (c) HTML `popover` over headless-UI libraries, (d) primitive placement under `site/src/components/primitives/` for AC36/AC37 portability, (e) `tldr` as hard build requirement (no fallback).
14. **SCOPE.md** — if any scope item shifts (e.g. glossary count moves from 21 to 27), update the relevant section + bump *Last updated* in the same edit.
15. **Issues - Pending Items.md** — register any gaps surfaced during the work (e.g. audit-report follow-ups, deferred mobile UX refinements).
16. **`sync-doc-counts.mjs`** — run after content additions; AUTO blocks in CLAUDE.md and SCOPE.md reflect 27 glossary entries (21 existing + 6 new) and the new site test count.

## Constraints

- **Tech stack locked:** Astro 6.3.5 + Starlight 0.39.2. Build-time remark/rehype pipeline. No runtime JS framework beyond Astro's hydration model.
- **Plugin loading:** must integrate via `markdown.remarkPlugins` per Astro 6 docs; no monkey-patching of Starlight internals.
- **Token system:** uses tokens from `site/src/styles/tokens/semantic.css` (`--nbg-color-surface-*`, `--nbg-color-border-*`, `--nbg-radius-*`, `--nbg-shadow-*`, etc.). No new colour primitives.
- **Portability gate (AC36/AC37):** `GlossaryTerm.astro` must be a primitive — zero `@astrojs/starlight` imports. Other components are unaffected.
- **No fallback values for missing config:** per global CLAUDE.md — missing `tldr` MUST throw a Zod validation error and fail the build, never substitute an empty string.
- **No human-day estimates** anywhere in the deliverable docs.
- **No git operations** unless explicitly asked by the user.
- **Port discipline:** dev server may need to fall back from `4321` per CLAUDE.md ports rule (band 4322–4329).
- **Visual verification mandatory** — headless-Chrome screenshots required after one failed iteration per global CLAUDE.md.
- **Doc-drift hook** at `.claude/settings.local.json` enforces same-edit updates to DECISIONS.md / SCOPE.md / Issues - Pending Items.md when source files change.

## Acceptance Criteria

**AC1 — Schema: `tldr` required.** `site/src/content.config.ts` glossary collection has `tldr: z.string().min(1).max(160)`. Evidence: file diff + `glossary-schema.test.ts` includes a positive case (valid frontmatter) and a negative case (missing `tldr` → Zod parse throws).

**AC2 — Schema: `aliases` optional.** Glossary collection has `aliases: z.array(z.string()).default([])`. Evidence: file diff + `glossary-schema.test.ts` asserts a frontmatter without `aliases` parses to `aliases: []` and a frontmatter with `["PR","PRs"]` parses through unchanged.

**AC3 — Build fails loud on missing `tldr`.** Temporarily removing `tldr` from any glossary entry and running `cd site && npm run build` exits non-zero with a Zod error citing the field. Evidence: documented manual repro in `integration-verification-glossary-tooltips.md` with the exact error output.

**AC4 — All 21 existing entries have `tldr`.** Every file under `glossary/` (21 at start; 27 after AC5) parses cleanly through the extended schema. Evidence: `npm run build` succeeds; `grep -L '^tldr:' glossary/*.md | wc -l` returns `0`.

**AC5 — 6 new mandatory entries exist.** Files `glossary/cli.md`, `glossary/frontmatter.md`, `glossary/yaml.md`, `glossary/markdown.md`, `glossary/rss.md`, `glossary/model.md` exist with complete frontmatter (10 base keys + `tldr` ≤160 chars + optional `aliases`) and non-empty body. Evidence: `ls glossary/{cli,frontmatter,yaml,markdown,rss,model}.md` returns 6 files; `npm run build` parses all six.

**AC6 — Word-boundary matching.** Remark plugin tests assert:
- `cli` matches `"use the cli"` → wrapped.
- `cli` does NOT match `"click"` or `"command-line"` → not wrapped.
- `agent` matches `"an agent does X"` → wrapped.
- `agent` does NOT match `"agents are"` UNLESS `agents` is in the alias list.
- Numeric adjacency: `"agent2"` does NOT match.
Evidence: `remark-glossary-word-boundary.test.ts` includes all of the above as named test cases that pass.

**AC7 — First occurrence per page only.** Given input markdown containing the same term three times, only the first textual occurrence is wrapped. Evidence: `remark-glossary-first-occurrence.test.ts` named case "wraps only the first of three occurrences" passes.

**AC8 — Skip: fenced code blocks.** Term inside ```` ```…``` ```` is NOT wrapped. Evidence: `remark-glossary-skip-rules.test.ts` case "skips fenced code blocks".

**AC9 — Skip: inline code.** Term inside `` `…` `` is NOT wrapped. Evidence: same test file, case "skips inline code".

**AC10 — Skip: headings h1–h6.** Term inside any heading is NOT wrapped. Evidence: same test file, case "skips headings h1 through h6" iterating over six levels.

**AC11 — Skip: existing links.** Term inside `[text](url)` is NOT wrapped. Evidence: same test file, case "skips existing markdown links".

**AC12 — Skip: self-page.** When the file being processed is `glossary/agent.md`, the term "agent" is NOT wrapped in its own body. Evidence: same test file, case "skips term on its own glossary page".

**AC13 — Skip: aside/callouts.** Term inside a Starlight `:::note` / `:::tip` / `:::caution` / `:::danger` block is NOT wrapped. Evidence: same test file, case "skips Starlight aside callouts".

**AC14 — Case-insensitive match, case-preserved display.** Input `"a Pull Request landed"` (with `pull-request` alias `["PR","PRs"]`, primary slug match) wraps the term and the rendered display attribute is `"Pull Request"` verbatim. Evidence: test case asserts the `display` prop matches source casing.

**AC15 — Component uses HTML popover.** `site/src/components/primitives/GlossaryTerm.astro` renders `<button … popovertarget="gloss-<id>">` and `<div id="gloss-<id>" popover>…</div>`. Evidence: `glossary-term-component.test.ts` greps the rendered HTML for both attributes.

**AC16 — `aria-describedby` wired.** The button has `aria-describedby="gloss-<id>"` matching the popover id. Evidence: `glossary-term-component.test.ts` asserts the attribute pair.

**AC17 — ESC dismisses.** Native `popover` semantics + an explicit `keydown` handler ensure the popover closes on ESC. Evidence: visual-verification report includes a manual ESC-press observation note; component file contains the `keydown` listener block.

**AC18 — Hover / focus / click all trigger.** CSS `:hover` opens the popover, `:focus-visible` opens it, native popover click toggles it. Evidence: visual-verification report shows screenshots of (a) hover-triggered popover, (b) keyboard-focus-triggered popover, (c) click/tap-triggered popover — on the same term across the 5 sampled pages.

**AC19 — Reduced-motion respected.** Inside `@media (prefers-reduced-motion: reduce)`, no transition/animation runs. Evidence: CSS file contains the media query; visual-verification report includes a screenshot taken with reduced-motion forced via DevTools showing the popover appears with no animation.

**AC20 — Primitive placement.** `site/src/components/primitives/GlossaryTerm.astro` exists. Evidence: `ls site/src/components/primitives/GlossaryTerm.astro`.

**AC21 — Zero Starlight imports (AC36/AC37 gate).** The file contains zero `from '@astrojs/starlight…'` import lines. Evidence: `grep -c "@astrojs/starlight" site/src/components/primitives/GlossaryTerm.astro` returns `0`; covered by `glossary-term-component.test.ts`.

**AC22 — Uses existing semantic tokens.** All colours/spacing/radius/shadow in the component reference `--nbg-*` semantic tokens defined in `site/src/styles/tokens/semantic.css` (or aliases). No raw hex/rgb/hsl literals. Evidence: regex check in `glossary-term-component.test.ts` confirms no raw colour literals.

**AC23 — Audit script produces report.** Running `node scripts/audit-glossary-candidates.mjs` produces `docs/reference/glossary-audit-2026-05-25.md` with sections for acronyms, backticked terms, and recurring nouns. Evidence: file exists; manual review shows non-empty sections.

**AC24 — Audit does NOT auto-add.** Audit script writes only to `docs/reference/glossary-audit-*.md`. Evidence: `git status` after running shows no changes under `glossary/`.

**AC25 — DECISIONS.md entry dated 2026-05-25.** `DECISIONS.md` contains a new entry dated 2026-05-25 covering the 5 key calls listed in Requirements §13. Evidence: `grep -A 1 "2026-05-25" DECISIONS.md` shows the new entry.

**AC26 — `sync-doc-counts.mjs` run.** `CLAUDE.md` "Content counts" and `SCOPE.md` "Content at a glance" show Glossary = 27. Evidence: `node scripts/sync-doc-counts.mjs --check` exits zero (no drift).

**AC27 — Vitest coverage green.** `cd site && npm test` runs all existing tests + the new tests added in AC1–AC22. Reported test count ≥ 215 + new tests (target ~225+). Evidence: `npm test` final line "Test Files X passed, Tests Y passed" with no failures.

**AC28 — Build green.** `cd site && npm run build` exits zero. Evidence: terminal log appended to `integration-verification-glossary-tooltips.md`.

**AC29 — `astro check` clean.** `cd site && npm run check` reports zero errors (Zod 4 deprecation hints from pending item #2 remain acceptable warnings only). Evidence: terminal log appended.

**AC30 — Visual verification: 5 pages.** Headless screenshots captured for `/`, one tip page, one skill page, one journey page, `/glossary/`. Each screenshot shows at least one glossary term rendered with the popover trigger styling. Evidence: 5 PNGs in `docs/reference/integration-verification-glossary-tooltips.md` (or `/tmp/nbg_uat/glossary/`).

**AC31 — Visual verification: 6 behaviors observed.** Report enumerates these 6 verified behaviors with screenshot evidence: (1) hover opens popover, (2) keyboard focus opens popover, (3) click/tap toggles popover, (4) ESC closes popover, (5) reduced-motion shows no transition, (6) "Read more →" link navigates to `/glossary#<slug>`. Evidence: 6 numbered sections in the verification doc.

## Assumptions

- **A1** — Astro 6.3.5's markdown pipeline accepts custom remark plugins via `markdown.remarkPlugins` and Starlight 0.39 does not override this hook. (Basis: Astro 6 docs + Starlight 0.39 changelog showed no removal; same surface area used elsewhere in the codebase to wire custom plugins.)
- **A2** — The HTML `popover` attribute is supported by headless Chromium (used for verification). (Basis: Chromium 114+ supports it; Chrome stable is past that.)
- **A3** — "First occurrence" means the first textual match in document-order AST traversal (depth-first, in source order). (Basis: the natural reading-order interpretation.)
- **A4** — Matching is case-insensitive; the rendered display preserves source casing verbatim. Aliases match by the same word-boundary + case-insensitive rule as primary slugs. (Basis: contract section §5 of the raw request; standard auto-link library behaviour.)
- **A5** — "Glossary entry's own page" means the current file's slug (e.g. `agent` from `glossary/agent.md`) matches the term's canonical slug. The plugin receives `file.path` from remark and derives `currentSlug`. If the build can't derive a slug (non-glossary file), self-page skipping is a no-op. (Basis: idiomatic remark plugin API.)
- **A6** — The dev server is pinned to `4321` and may need to fall back per the global ports rule. Visual verification scripts should `lsof -i :4321` first and bump within the band if occupied. (Basis: CLAUDE.md `## Ports`.)
- **A7** — The audit script's "recurring nouns" heuristic is best-effort. A simple lowercase-token count with a stop-word list is sufficient; we don't need NLP-grade tokenisation. (Basis: the audit feeds human triage, not auto-add.)
- **A8** — News articles under `news/published/` are in scope of auto-linking (they're rendered by the site as content pages). However, since `/news/` is hard-redirected externally, the auto-linked HTML is generated but never user-visible. We still run the plugin over them for consistency, accepting that the work is dormant until news ever surfaces again on the site. (Basis: pending item #14 — orphan data; symmetry of the plugin contract.)
- **A9** — `<aside>` skip applies to Starlight's MDX `:::tip` / `:::note` / `:::caution` / `:::danger` directives, which the markdown AST surfaces as containerDirective nodes with `name in {note, tip, caution, danger}`. (Basis: Starlight's asides plugin is built on `remark-directive`.)
- **A10** — The remark plugin runs before Starlight's own markdown transforms, so wrapping nodes as MDX/JSX elements is safe. If Starlight's pipeline reorders things, the plugin can emit raw HTML nodes (`type: 'html'`) as a fallback. (Basis: standard remark ordering; minor risk noted.)

## Open Questions — RESOLVED 2026-05-25

- **OQ1** — Run remark plugin over `news/published/`? → **NO**. Plugin explicitly excludes news. **Assumption A8 superseded.** A skip-news test asserts no `<GlossaryTerm>` wrappings appear in news rendered HTML. The plugin filters out files whose path matches `news/published/`.
- **OQ2** — Audit script output naming? → **Date-stamped**. Output path: `docs/reference/glossary-audit-YYYY-MM-DD.md`. Today's run lands at `docs/reference/glossary-audit-2026-05-25.md`.
- **OQ3** — Popover surface contents? → **Minimal**: title + tldr + "Read more →". No audience badge. Detail page is one click away if needed.

## Defect surfaced during planning — `hook` glossary entry

The Requirements §3 alias example `hook → ["hooks"]` references a `hook.md` that does not exist in `glossary/`. Since "hooks" was explicitly listed in the original user request as a term newcomers don't know, this is a missing-content defect rather than a contract error. **The mandatory-new-terms count is therefore bumped from 6 to 7**:

- `glossary/cli.md`
- `glossary/frontmatter.md`
- `glossary/yaml.md`
- `glossary/markdown.md`
- `glossary/rss.md`
- `glossary/model.md`
- **`glossary/hook.md`** *(added 2026-05-25 — close gap in newcomer vocabulary)*

Glossary count after Phase A: **21 existing + 7 new = 28** (NOT 27 as previously stated). AC5 and AC26 updated accordingly:

- **AC5 (revised)** — 7 new mandatory entries exist (cli, frontmatter, yaml, markdown, rss, model, hook).
- **AC26 (revised)** — CLAUDE.md + SCOPE.md content-count blocks show Glossary = 28.

## Original Request

```
Implement glossary auto-linking + hover tooltips across all content surfaces on the NbgAiHub site (Astro 6 + Starlight 0.39, workspace at `site/`).

## Feature

Make the glossary load-bearing by auto-linking glossary terms inline across tips, skills, journeys, news, and the homepage. When a reader hovers (or focuses, or taps) a linked term, a small popover shows a short definition with a "Read more →" link to the full glossary entry.

## Design contract — already settled, do not relitigate

1. Build-time auto-linking via a remark/rehype plugin loaded in `site/astro.config.mjs`. Plugin walks each markdown AST, matches glossary slugs (case-insensitive, word-boundary aware), wraps matches with `<GlossaryTerm slug="…"/>`. Plugin loads the glossary slug + alias list once at build start.
2. First occurrence per page only — track matched slugs per file in plugin state.
3. Skip rules — do NOT auto-link inside: fenced code blocks, inline code, headings (h1–h6), existing markdown links, the glossary entry's own page. Default also: skip inside Starlight `<aside>` callouts.
4. Tooltip uses a short form. Extend the glossary content collection schema (`site/src/content.config.ts`) with required `tldr: z.string().max(160)` — plain text, no markdown. Backfill all 21 existing glossary entries + new additions.
5. Aliases. Extend glossary schema with `aliases: z.array(z.string()).default([])`. Examples: pull-request→["PR","PRs"]; repository→["repo","repos"]; hook→["hooks"]; skill→["skills"]; plugin→["plugins"]; large-language-model→["LLM","LLMs"]. Case-insensitive matching; preserves source casing for display.
6. Tooltip component uses the HTML `popover` attribute on a focusable `<button>` — works on hover, focus, click/tap. ESC dismisses. `aria-describedby` wired to popover id. Reduced-motion respected.
7. Web UI only — no plugin/terminal changes.

## Glossary expansion

21 terms exist today. 6 mandatory additions: cli, frontmatter, yaml, markdown, rss, model. Each requires: title, slug, audience, tldr (≤160), full body, aliases.

Plus a separate audit pass — scan content for jargon (capitalised acronyms ≥3 occurrences, backticked terms not in glossary, recurring nouns) and produce a markdown report for triage. Do NOT auto-add audit-discovered terms.

## Constraints

- DECISIONS.md entry dated 2026-05-25 capturing key calls.
- SCOPE.md updated in same edit if scope shifts.
- Issues - Pending Items.md for unresolved gaps.
- No fallback values for missing config — missing tldr must FAIL the build, not silently render empty.
- Visual verification mandatory via headless Chrome / Puppeteer.
- Tests in site/tests/ using Vitest 4.x.
- AC36/AC37 portability gate — GlossaryTerm lives under site/src/components/primitives/ with zero @astrojs/starlight imports.
- Counts sync via `node scripts/sync-doc-counts.mjs` after content additions.
- No git commits unless explicitly asked.
- No human-day estimates anywhere.

## Phasing

Phase A: schema + content (no UI)
Phase B: remark plugin + GlossaryTerm component + wiring
Phase C: audit pass + report (user triages)
Phase D: visual verification + integration-verification doc

## Key file paths

- glossary/ — 21 MDs (6 in-flight uncommitted: claude-vs-chatgpt-vs-gemini, hallucination, large-language-model, prompt, token, tool-use)
- site/src/content.config.ts — collection schemas
- site/astro.config.mjs — markdown.remarkPlugins
- site/src/components/primitives/ — destination for GlossaryTerm.astro
- site/src/styles/tokens/semantic.css — popover surface tokens
- site/tests/ — Vitest 4.x test files
- scripts/sync-doc-counts.mjs — AUTO-block sync
- DECISIONS.md, SCOPE.md, Issues - Pending Items.md — project state files
```

## Definition of Done

A complete Phase A → B → C → D pass with all of the following demonstrably true:

1. **Phase A — schema + content:**
   - `site/src/content.config.ts` extended with `tldr` (required, ≤160) and `aliases` (optional array).
   - All 21 existing glossary entries backfilled with `tldr` + alias data per AC3 contract.
   - 6 new entries (`cli`, `frontmatter`, `yaml`, `markdown`, `rss`, `model`) authored with full frontmatter + body.
   - `node scripts/sync-doc-counts.mjs` run; AUTO blocks updated (Glossary 21 → 27).
2. **Phase B — plugin + component + wiring:**
   - Remark plugin authored, loaded via `site/astro.config.mjs#markdown.remarkPlugins`.
   - `site/src/components/primitives/GlossaryTerm.astro` authored with popover semantics, aria-describedby, ESC dismiss, reduced-motion handling.
   - Zero `@astrojs/starlight` imports in `GlossaryTerm.astro`.
   - Only existing semantic tokens used.
3. **Phase C — audit:**
   - `scripts/audit-glossary-candidates.mjs` authored and run.
   - `docs/reference/glossary-audit-2026-05-25.md` produced for human triage.
   - No glossary file modified by the audit run.
4. **Phase D — verification:**
   - `cd site && npm test` green — existing 215 site tests + new tests (target ~225+), all passing.
   - `cd site && npm run build` green.
   - `cd site && npm run check` clean (existing Zod 4 deprecation hints acceptable; nothing new introduced).
   - Headless-Chrome screenshots of 5 pages captured.
   - `docs/reference/integration-verification-glossary-tooltips.md` written, embedding the 5 screenshots and enumerating the 6 verified behaviors per AC31.
5. **Project state files updated:**
   - `DECISIONS.md` — new 2026-05-25 entry per AC25.
   - `SCOPE.md` — Content-at-a-glance count refreshed (auto via sync-doc-counts); narrative updated if any scope shifted.
   - `Issues - Pending Items.md` — any unresolved gaps registered (likely candidates: audit-report follow-up items; OQ1–OQ3 if any go unanswered).
6. **No git commits performed unless explicitly requested by the user.**
7. **No human-day estimates appear anywhere in the deliverables.**
