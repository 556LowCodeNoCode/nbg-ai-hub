---
plan: plan-006-glossary-tooltips
date: 2026-05-25
status: ready-for-design
parent_spec: docs/refined-requests/glossary-tooltips.md
target_workspace: site/ (+ glossary/, scripts/)
phases: A → B → C → D
---

# Plan 006 — Glossary Auto-Linking + Hover Tooltips

This plan sequences the work for the LOCKED design contract in `docs/refined-requests/glossary-tooltips.md`. Sequencing only — interfaces, component props, plugin function signatures, and Zod refinements are Phase 5 (Designer)'s job. Shipping order: A → B → C → D, with explicit parallel groups within each phase.

---

## AC Coverage Table

Every AC1–AC31 from the refined spec maps to at least one task. Evidence column states the artifact at verification time.

| AC | Phase | Task(s) | Evidence at verification time |
|---|---|---|---|
| AC1 — Schema: `tldr` required | A | A-1 | `site/src/content.config.ts` diff shows `tldr: z.string().min(1).max(160)` on glossary schema; `site/tests/glossary-schema.test.ts` positive case "accepts valid tldr" + negative case "rejects missing tldr" both pass |
| AC2 — Schema: `aliases` optional | A | A-1 | Same file diff shows `aliases: z.array(z.string()).default([])`; `glossary-schema.test.ts` case "defaults to empty array when omitted" + case "round-trips PR/PRs aliases" both pass |
| AC3 — Build fails loud on missing `tldr` | A, D | A-1, D-3 | Manual repro documented in `docs/reference/integration-verification-glossary-tooltips.md` showing Zod error after removing a `tldr` field and running `cd site && npm run build` |
| AC4 — All 21 existing entries backfilled | A | A-2a, A-2b, A-2c (parallel) | `npm run build` succeeds; `bash -c "grep -L '^tldr:' /Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/*.md \| wc -l"` returns `0` |
| AC5 — 6 new mandatory entries exist | A | A-3a, A-3b, A-3c (parallel) | `ls /Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/{cli,frontmatter,yaml,markdown,rss,model}.md` returns 6 files; build parses all six |
| AC6 — Word-boundary matching | B | B-2 | `site/tests/remark-glossary-word-boundary.test.ts` includes 5 named cases (cli/click, cli/command-line, agent/agents-without-alias, agent/agents-with-alias, agent2/no-match) — all pass |
| AC7 — First occurrence only | B | B-2 | `site/tests/remark-glossary-first-occurrence.test.ts` case "wraps only the first of three occurrences" passes |
| AC8 — Skip fenced code | B | B-2 | `site/tests/remark-glossary-skip-rules.test.ts` case "skips fenced code blocks" passes |
| AC9 — Skip inline code | B | B-2 | Same file, case "skips inline code" passes |
| AC10 — Skip headings h1–h6 | B | B-2 | Same file, case "skips headings h1 through h6" iterates 6 levels, passes |
| AC11 — Skip existing links | B | B-2 | Same file, case "skips existing markdown links" passes |
| AC12 — Skip self-page | B | B-2 | Same file, case "skips term on its own glossary page" passes |
| AC13 — Skip aside/callouts | B | B-2 | Same file, case "skips Starlight aside callouts" (`:::note` `:::tip` `:::caution` `:::danger`) passes |
| AC14 — Case-insensitive, casing-preserved | B | B-2 | `remark-glossary-word-boundary.test.ts` case "preserves source casing in display attribute" asserts `display` prop equals source verbatim |
| AC15 — Component uses HTML popover | B | B-3 | `site/tests/glossary-term-component.test.ts` greps rendered HTML for `popovertarget="gloss-` and `<div id="gloss-` + `popover` attribute |
| AC16 — `aria-describedby` wired | B | B-3 | Same test asserts button has `aria-describedby="gloss-<id>"` matching popover id |
| AC17 — ESC dismisses | B, D | B-3, D-3 | `GlossaryTerm.astro` contains a `keydown` listener block (grep evidence); D-3 visual verification report records manual ESC observation |
| AC18 — Hover / focus / click all trigger | B, D | B-3, D-3 | D-3 visual report contains three screenshots per AC18 (hover, focus-visible, click/tap) |
| AC19 — Reduced-motion respected | B, D | B-3, D-3 | CSS in `GlossaryTerm.astro` contains `@media (prefers-reduced-motion: reduce)` block; D-3 screenshot taken with DevTools `Emulation.setEmulatedMedia` forcing reduce shows no transition |
| AC20 — Primitive placement | B | B-3 | `ls /Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/primitives/GlossaryTerm.astro` returns the file |
| AC21 — Zero Starlight imports | B | B-3 | `bash -c "grep -c '@astrojs/starlight' /Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/primitives/GlossaryTerm.astro"` returns `0`; `glossary-term-component.test.ts` case "primitive has zero @astrojs/starlight imports" passes |
| AC22 — Uses existing semantic tokens | B | B-3 | `glossary-term-component.test.ts` regex check `/#[0-9a-f]{3,8}\b\|rgb\(\|hsl\(/i` matches zero hits in the component file |
| AC23 — Audit script produces report | C | C-1, C-2 | `docs/reference/glossary-audit-2026-05-25.md` exists with three sections (acronyms, backticked, recurring nouns), non-empty |
| AC24 — Audit does NOT auto-add | C | C-1 | After running the audit, `git status` shows zero changes under `glossary/`; covered by `site/tests/audit-glossary-no-mutation.test.ts` (snapshot-stat the glossary dir before/after a programmatic invocation) |
| AC25 — DECISIONS.md entry dated 2026-05-25 | D | D-4 | `bash -c "grep -A 6 '2026-05-25.*Glossary tooltips' /Users/suzy/ClaudeCode/Projects/NbgAiHub/DECISIONS.md"` shows the new entry covering the 5 calls (build-time vs runtime, first-occurrence-only, HTML popover, primitive placement, tldr-as-hard-requirement) |
| AC26 — `sync-doc-counts.mjs` run | A, D | A-4, D-4 | `node /Users/suzy/ClaudeCode/Projects/NbgAiHub/scripts/sync-doc-counts.mjs --check` exits zero; AUTO blocks in CLAUDE.md + SCOPE.md show Glossary = 27 |
| AC27 — Vitest green | D | D-1 | `cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test` reports all files passing, test count ≥ 215 + new (target ~225+) |
| AC28 — Build green | D | D-1 | `cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm run build` exits zero; terminal log appended to verification doc |
| AC29 — `astro check` clean | D | D-1 | `cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm run check` reports zero errors (Zod 4 deprecation warnings from pending item #2 remain acceptable) |
| AC30 — Visual verification: 5 pages | D | D-2, D-3 | 5 PNGs captured under `/tmp/nbg_uat/glossary/` for `/`, one tip page, one skill page, one journey page (`/start-here/foundations/`), `/glossary/` — embedded in `docs/reference/integration-verification-glossary-tooltips.md` |
| AC31 — Visual verification: 6 behaviors | D | D-3 | Verification doc has 6 numbered sections: hover, focus, click/tap, ESC, reduced-motion, Read-more link navigation — each with screenshot evidence |

**Self-check:** every AC has at least one covering task. No "covered by general testing" entries.

---

## Independent Units for Parallel Coding

Two tasks are independent only if they modify disjoint file sets. Groups below can be dispatched to parallel coder agents in Phase 6.

**Phase A parallel group (after A-1 lands):**
- Unit A.P1 — Backfill batch 1: `A-2a` (modifies 7 glossary MDs only)
- Unit A.P2 — Backfill batch 2: `A-2b` (modifies 7 different glossary MDs only)
- Unit A.P3 — Backfill batch 3: `A-2c` (modifies 7 different glossary MDs only)
- Unit A.P4 — New entry batch 1: `A-3a` (creates `cli.md`, `frontmatter.md`)
- Unit A.P5 — New entry batch 2: `A-3b` (creates `yaml.md`, `markdown.md`)
- Unit A.P6 — New entry batch 3: `A-3c` (creates `rss.md`, `model.md`)

All 6 units run in parallel — disjoint file sets.

**Phase B parallel group:**
- Unit B.P1 — Plugin file `B-1` + plugin tests `B-2` (touches `site/src/lib/remark-glossary.ts` + `site/tests/remark-glossary-*.test.ts`)
- Unit B.P2 — Component file `B-3` + component test (touches `site/src/components/primitives/GlossaryTerm.astro` + `site/tests/glossary-term-component.test.ts`)

Run in parallel — disjoint files. B-4 (wiring in `astro.config.mjs`) runs after both land.

**Phase C: single unit** (`scripts/audit-glossary-candidates.mjs` + its test) — no parallel split needed.

**Phase D: serial** (D-1 → D-2 → D-3 → D-4). Build/test gating is sequential by nature.

---

## Phase A — Schema + Content

**Objective:** Land the schema extension and all content (21 backfilled + 6 new), then sync counts. No UI code in this phase.

**Verification command for phase exit:**
```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm run build && npm test -- glossary-schema
node /Users/suzy/ClaudeCode/Projects/NbgAiHub/scripts/sync-doc-counts.mjs --check
bash -c "ls /Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/*.md | wc -l"  # must return 27
bash -c "grep -L '^tldr:' /Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/*.md | wc -l"  # must return 0
```

### Tasks

| ID | Description | Files touched (full paths) | Parallel tag | Blocked by | Verification |
|---|---|---|---|---|---|
| **A-1** | Extend the glossary Zod schema with required `tldr` (≤160) and optional `aliases` (default `[]`). Also extend `baseShape` only if Designer decides — preferred placement is on the `glossary` collection block alone so other collections are unaffected. Add schema test file covering positive case, missing-`tldr` rejection, oversize-`tldr` rejection, default-aliases case, round-trip-aliases case. **No fallback default for missing `tldr`** — Zod throws. | `site/src/content.config.ts`, `site/tests/glossary-schema.test.ts` (new) | A.SEQ (gates A-2/A-3) | — | `cd site && npm test -- glossary-schema` green |
| **A-2a** | Backfill `tldr` + applicable `aliases` for 7 entries: `agent.md`, `branch.md`, `build-time-vs-runtime.md`, `claude-code.md`, `claude-vs-chatgpt-vs-gemini.md`, `claudemd.md` (→ `aliases: ["CLAUDE.md"]`), `commit.md`. | 7 MDs under `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/` | PAR-A.1 | A-1 | All 7 files parse through extended schema; `npm run build` green |
| **A-2b** | Backfill 7 entries: `context-window.md`, `gh.md`, `gsd.md`, `hallucination.md`, `issue.md`, `large-language-model.md` (→ `aliases: ["LLM","LLMs"]`), `mcp.md`. | 7 MDs under `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/` | PAR-A.2 | A-1 | Same as A-2a |
| **A-2c** | Backfill 7 entries: `plugin.md` (→ `aliases: ["plugins"]`), `prompt.md`, `pull-request.md` (→ `aliases: ["PR","PRs"]`), `repository.md` (→ `aliases: ["repo","repos"]`), `skill.md` (→ `aliases: ["skills"]`), `token.md`, `tool-use.md`. **Also add `hook` to whichever batch is convenient; current inventory does not contain `hook.md` — if missing, register a follow-up in Issues - Pending Items.md rather than inventing one.** | 7 MDs under `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/` | PAR-A.3 | A-1 | Same as A-2a |
| **A-3a** | Author 2 new entries: `cli.md`, `frontmatter.md`. Full frontmatter (10 base keys + `tldr` + `aliases`) + body copy in project tone. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/cli.md` (new), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/frontmatter.md` (new) | PAR-A.4 | A-1 | Files exist; build parses both |
| **A-3b** | Author 2 new entries: `yaml.md`, `markdown.md`. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/yaml.md` (new), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/markdown.md` (new) | PAR-A.5 | A-1 | Files exist; build parses both |
| **A-3c** | Author 2 new entries: `rss.md`, `model.md`. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/rss.md` (new), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/model.md` (new) | PAR-A.6 | A-1 | Files exist; build parses both |
| **A-4** | Run `node scripts/sync-doc-counts.mjs`. Confirm AUTO blocks in CLAUDE.md + SCOPE.md flip to Glossary = 27. Do not hand-edit the AUTO blocks. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/CLAUDE.md`, `/Users/suzy/ClaudeCode/Projects/NbgAiHub/SCOPE.md` (auto-blocks only) | A.SEQ (last) | A-2a, A-2b, A-2c, A-3a, A-3b, A-3c | `node scripts/sync-doc-counts.mjs --check` exits zero |

---

## Phase B — Remark Plugin + Component + Wiring

**Objective:** Stand up the auto-linking plugin and the popover primitive, then wire the plugin into Astro's markdown pipeline.

**Verification command for phase exit:**
```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test -- remark-glossary glossary-term-component
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm run build
bash -c "grep -c '@astrojs/starlight' /Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/primitives/GlossaryTerm.astro"  # 0
```

### Tasks

| ID | Description | Files touched (full paths) | Parallel tag | Blocked by | Verification |
|---|---|---|---|---|---|
| **B-1** | Author the remark plugin: load glossary slug + alias index once at init; walk AST; first-occurrence-per-file tracking keyed by `file.path`; emit either MDX JSX node `<GlossaryTerm .../>` or HTML node fallback (per A10). **Explicitly skip `news/published/`** — derive from `file.path` containing `/news/published/`, return early. Skip rules: fenced code, inline code, heading h1–h6, existing link, self-page (`currentSlug === term.slug` derived from `file.path` when path is under `glossary/`), Starlight aside containerDirectives (`name in {note,tip,caution,danger}`). No fallback for missing glossary index — throw at init if the collection load fails. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/lib/remark-glossary.ts` (new) | PAR-B.1 (with B-2) | Phase A complete (needs schema + content available) | TypeScript compiles; module exports a plugin factory consumable by `markdown.remarkPlugins` |
| **B-2** | Author plugin tests covering all skip rules + word-boundary + first-occurrence + case-preservation + news-skip. Five test files per refined spec §11. Include explicit case "skips files under news/published/". | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/remark-glossary-word-boundary.test.ts` (new), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/remark-glossary-first-occurrence.test.ts` (new), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/remark-glossary-skip-rules.test.ts` (new), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/remark-glossary-news-skip.test.ts` (new) | PAR-B.1 (with B-1) | A-1 (for schema shape only); B-1 (for plugin import) | `npm test -- remark-glossary` green |
| **B-3** | Author the `GlossaryTerm` primitive: focusable `<button popovertarget="gloss-<id>">` + sibling `<div id="gloss-<id>" popover>`, `aria-describedby` wired, ESC keydown listener (belt-and-braces over native popover), only existing `--nbg-*` semantic tokens, `@media (prefers-reduced-motion: reduce)` block, zero `@astrojs/starlight` imports. Component test asserts: popover wiring, aria-describedby, zero Starlight imports, no raw hex/rgb/hsl colour literals, Read-more link target = `/glossary#<slug>`. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/primitives/GlossaryTerm.astro` (new), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/glossary-term-component.test.ts` (new) | PAR-B.2 | — (no runtime dependency on plugin) | `npm test -- glossary-term-component` green; grep checks pass |
| **B-4** | Wire the plugin into `markdown.remarkPlugins` in `astro.config.mjs`. Add an inline comment pointing at `docs/refined-requests/glossary-tooltips.md` and DECISIONS 2026-05-25. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/astro.config.mjs` | B.SEQ (last) | B-1, B-3 | `npm run build` produces HTML containing at least one `popovertarget="gloss-` attribute in a tip/skill/journey page output |

---

## Phase C — Audit Pass

**Objective:** Stand up the content-jargon scanner and produce one dated report for human triage. The script is read-only over `glossary/` content.

**Verification command for phase exit:**
```bash
node /Users/suzy/ClaudeCode/Projects/NbgAiHub/scripts/audit-glossary-candidates.mjs
test -f /Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/glossary-audit-2026-05-25.md
bash -c "cd /Users/suzy/ClaudeCode/Projects/NbgAiHub && git status --porcelain glossary/"  # zero output
```

### Tasks

| ID | Description | Files touched (full paths) | Parallel tag | Blocked by | Verification |
|---|---|---|---|---|---|
| **C-1** | Author the audit script: scan `glossary/`, `tips/`, `skills/`, `journeys/`, `news/published/`, `site/src/pages/`, `site/src/content/docs/`. Three categories: capitalised acronyms `/\b[A-Z]{2,}s?\b/` with ≥3 occurrences across corpus AND not already a slug/alias; backticked terms `` /`([^`]+)`/ `` with ≥3 occurrences AND not already a slug/alias; recurring lowercase nouns with ≥5 occurrences (apply a built-in stop-word list). Output: `docs/reference/glossary-audit-2026-05-25.md` with three sections, each row showing term + count + sample `file:line`. **Script must NOT write to `glossary/`** — emit a hard assertion if it ever tries (defensive check on output path). | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/scripts/audit-glossary-candidates.mjs` (new) | C.1 | Phase A complete (so slug/alias index includes the 6 new + 21 backfilled) | Running it once produces the report file |
| **C-2** | Add a no-mutation test: snapshot `git status --porcelain glossary/` before invoking the audit module programmatically, run it against a tmpdir corpus, snapshot again, assert no glossary files mutated. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/audit-glossary-no-mutation.test.ts` (new) | C.1 (same unit) | C-1 | `npm test -- audit-glossary-no-mutation` green |
| **C-3** | Run the audit and commit the resulting report file. Inspect for sanity (non-empty sections). Do not act on the report in this plan — register a follow-up Issues item to triage the findings later. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/glossary-audit-2026-05-25.md` (new — script output), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/Issues - Pending Items.md` (follow-up entry) | C.SEQ (last) | C-1, C-2 | Report file exists; Issues item appended |

---

## Phase D — Visual Verification + Integration Verification Doc

**Objective:** Prove the feature works end-to-end with headless Chrome and write the verification report. This phase is serial — build/test gating is sequential.

**Verification command for phase exit:**
```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test && npm run build && npm run check
test -f /Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/integration-verification-glossary-tooltips.md
ls /tmp/nbg_uat/glossary/ | wc -l  # ≥ 5 PNGs
```

### Tasks

| ID | Description | Files touched (full paths) | Parallel tag | Blocked by | Verification |
|---|---|---|---|---|---|
| **D-1** | Run the full test/build/check trio (`npm test`, `npm run build`, `npm run check`). Resolve any regressions. Append terminal logs to the integration verification doc. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/integration-verification-glossary-tooltips.md` (new) | D.SEQ.1 | Phase B + Phase C complete | All three commands exit zero |
| **D-2** | Boot the dev server (`cd site && npm run dev`; respect port-discipline — `lsof -i :4321` first, bump in band 4322–4329 if occupied). Add the `build-output.test.ts` extension or new file asserting at least one tip page, one skill page, one journey page contain `popovertarget="gloss-` in the build output. | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/build-output.test.ts` (extend) **or** `/Users/suzy/ClaudeCode/Projects/NbgAiHub/site/tests/build-output-glossary-tooltips.test.ts` (new) | D.SEQ.2 | D-1 | `npm test -- build-output` green |
| **D-3** | Headless-Chrome verification across 5 pages: `/`, one tip page, one skill page, `/start-here/foundations/`, `/glossary/`. For each: screenshot the page; locate a `popovertarget="gloss-"` button; record hover-open, focus-open, click/tap-open, ESC-dismiss, reduced-motion (force via `Emulation.setEmulatedMedia`), and Read-more navigation. Save PNGs to `/tmp/nbg_uat/glossary/` and embed in the verification doc with the 6 numbered behaviour sections. Use Puppeteer or headless Chrome flag per global CLAUDE.md `## Visual verification for UI work` ladder. | `/tmp/nbg_uat/glossary/*.png` (new), `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/integration-verification-glossary-tooltips.md` (extend) | D.SEQ.3 | D-2 | Doc contains 5 page screenshots + 6 behaviour sections |
| **D-4** | Append the 2026-05-25 entry to `DECISIONS.md` (5 calls per spec §13). Update `SCOPE.md` narrative if any scope shifted (likely: glossary count narrative + new "glossary tooltips" line in the latest-updated paragraph). Re-run `node scripts/sync-doc-counts.mjs` to flip AUTO blocks. Append any unresolved gaps to `Issues - Pending Items.md` (audit follow-ups, OQ1–OQ3 if anything stays open). | `/Users/suzy/ClaudeCode/Projects/NbgAiHub/DECISIONS.md`, `/Users/suzy/ClaudeCode/Projects/NbgAiHub/SCOPE.md`, `/Users/suzy/ClaudeCode/Projects/NbgAiHub/Issues - Pending Items.md`, `/Users/suzy/ClaudeCode/Projects/NbgAiHub/CLAUDE.md` (AUTO block only) | D.SEQ.4 | D-3 | `grep '2026-05-25' DECISIONS.md` shows new entry; sync-doc-counts `--check` exits zero |

---

## Cross-Phase Dependency Arrows

```
A-1 ──┬──> A-2a ──┐
      ├──> A-2b ──┤
      ├──> A-2c ──┤
      ├──> A-3a ──┤
      ├──> A-3b ──┤
      └──> A-3c ──┴──> A-4 ──┬──> B-1 ──┐
                             │          ├──> B-4 ──> D-1 ──> D-2 ──> D-3 ──> D-4
                             ├──> B-2 ──┤
                             └──> B-3 ──┘
                             │
                             └──> C-1 ──> C-2 ──> C-3 ────────────────────> D-1
```

Notes:
- B-3 is technically not blocked by Phase A (the component file alone doesn't read glossary content), but its component test asserts `Read more →` link shape `/glossary#<slug>` — which is design-contract-stable. Keep B-3 inside Phase B for grouping.
- C-1 is blocked by Phase A so the audit's slug/alias index includes the final 27-entry inventory.

---

## Risks + Mitigations

| Risk | Mitigation |
|---|---|
| **R1 — Starlight reorders remark plugins.** Astro 6 + Starlight 0.39's markdown pipeline composes plugins; ordering can shift such that the glossary plugin runs after Starlight's directive/aside expansion (mutating node shapes) or after link normalisation (making "skip existing links" miss already-rewritten nodes). | (a) Designer specifies the plugin runs against text-leaf nodes and uses upstream container detection rather than relying on raw markdown shape; (b) plugin tests in B-2 include a `:::note` fixture that exercises the real Starlight directive shape (`containerDirective` with `name: 'note'`), not a hand-rolled approximation; (c) fallback per spec A10 — emit `type: 'html'` nodes instead of MDX JSX if MDX transform drops them. The B-1 acceptance is "produces a `popovertarget=` attribute in the final HTML", not "produces a JSX node" — decouples us from pipeline ordering. |
| **R2 — `<GlossaryTerm>` JSX node dropped by Astro/MDX transform.** If the plugin emits MDX JSX nodes but Starlight's markdown processor strips unknown component refs, the wrapped term disappears. | Test B-2's "round-trip through Astro build" case is the canonical signal — assert against the final `dist/` HTML, not the intermediate AST. If JSX survives → keep JSX path. If not → flip plugin to emit `type: 'html'` raw nodes producing equivalent button+popover markup. Both paths satisfy the AC contract. Designer must spec both code paths so executor can ship whichever works. |
| **R3 — `popover` attribute behaves differently across browsers.** The verification target is headless Chromium only (per AC30/AC31 scope). Firefox/Safari behaviour is out of scope for this plan. | (a) Explicit scope statement in `integration-verification-glossary-tooltips.md`: "Verified on headless Chromium. Firefox/Safari deferred to a follow-up pass." (b) Component CSS uses hover + focus-visible as belt-and-braces so a missing popover attribute would still render a usable affordance. (c) Register a Pending Item in Phase D-4 for "Cross-browser glossary popover verification" if any user feedback surfaces. |
| **R4 — Word-boundary regex with acronyms.** "LLM" must match "LLM" and "LLMs" (when LLMs is an alias) but NOT inside "ALLOWED". "cli" must NOT match inside "click". Naive `\b` matchers fail on hyphen boundaries ("command-line"). | (a) B-2 tests include named cases for all four pitfalls (LLM-in-ALLOWED-negative, LLMs-as-alias-positive, cli-in-click-negative, cli-in-command-line-negative). (b) Designer specifies the exact boundary regex (preferred shape: lookarounds asserting non-word-or-hyphen on both sides, or two-pass tokenisation). (c) Aliases are matched as explicit alternation entries — if `LLMs` is not in the alias list, it is not matched, and adding it is a content-side decision (Phase A) not a plugin-side decision. |
| **R5 — Doc-drift hook misfires.** The `.claude/settings.local.json` Stop hook flags PRs that change source but not DECISIONS/SCOPE/Issues. Phase D-4 covers this — but if any intermediate phase commits source without touching state files, the hook fires. | Sequence per the plan: state-file updates land in Phase D-4 alongside the verification report. If an intermediate commit is needed (e.g. mid-Phase A), include a one-liner in `Issues - Pending Items.md` as a placeholder so the hook stays quiet. |
| **R6 — Build-time-only contract slips into runtime.** A future contributor might import `GlossaryTerm` at runtime or wire client-side JS that re-scans the DOM. | Component is `.astro` (no client hydration). The keydown ESC listener is the only client-side code — keep it ≤10 LOC, inline in the component. No `client:load` / `client:idle` directives. B-3 component test asserts no `client:*` directive appears in any usage. |

---

## Out of Scope (explicit)

This plan does NOT:

1. Auto-add audit-discovered terms — C-3 produces a triage report only; adoption is a separate future pass.
2. Modify the `/hub-*` plugin (`plugin/` workspace). Web UI only — per locked OQ.
3. Change news scope. News stays externally redirected; the auto-linker explicitly skips `news/published/` per resolved decision.
4. Add new design tokens. All popover surfacing uses existing `--nbg-*` semantic tokens. If Designer finds a missing semantic alias, the fix is to add an alias in `semantic.css` — never a new colour primitive.
5. Cover Firefox / Safari browser behaviour. Verification scope is headless Chromium per AC30/AC31.
6. Add multi-occurrence linking on the same page (first-occurrence-only is locked).
7. Add audience-badge / topic-tag chrome to the popover surface (resolved OQ3 — minimal: title + tldr + Read more).
8. Touch the `news/published/` files or the news redirect.
9. Perform git commits. Per global CLAUDE.md, no version control operations unless explicitly requested.
10. Introduce human-day estimates in any deliverable.

---

## Phase-Exit Verification (verifier copy-paste)

### Phase A exit
```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test -- glossary-schema && npm run build
node /Users/suzy/ClaudeCode/Projects/NbgAiHub/scripts/sync-doc-counts.mjs --check
bash -c "ls /Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/*.md | wc -l"   # 27
bash -c "grep -L '^tldr:' /Users/suzy/ClaudeCode/Projects/NbgAiHub/glossary/*.md | wc -l"   # 0
```

### Phase B exit
```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test -- remark-glossary glossary-term-component && npm run build
bash -c "grep -c '@astrojs/starlight' /Users/suzy/ClaudeCode/Projects/NbgAiHub/site/src/components/primitives/GlossaryTerm.astro"   # 0
bash -c "grep -r 'popovertarget=\"gloss-' /Users/suzy/ClaudeCode/Projects/NbgAiHub/site/dist/ | head -1"   # non-empty
```

### Phase C exit
```bash
node /Users/suzy/ClaudeCode/Projects/NbgAiHub/scripts/audit-glossary-candidates.mjs
test -f /Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/glossary-audit-2026-05-25.md && echo OK
bash -c "cd /Users/suzy/ClaudeCode/Projects/NbgAiHub && git status --porcelain glossary/"   # empty
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test -- audit-glossary-no-mutation
```

### Phase D exit
```bash
cd /Users/suzy/ClaudeCode/Projects/NbgAiHub/site && npm test && npm run build && npm run check
test -f /Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/integration-verification-glossary-tooltips.md
bash -c "ls /tmp/nbg_uat/glossary/*.png | wc -l"   # >= 5
bash -c "grep '2026-05-25' /Users/suzy/ClaudeCode/Projects/NbgAiHub/DECISIONS.md | head -1"   # non-empty
```
