---
doc: authoring-glossary-terms
audience: project contributors + Claude sessions
last_updated: 2026-05-25
related:
  - docs/design/project-design.md §S.14 (design contract)
  - DECISIONS.md 2026-05-25 — Glossary tooltips
  - Issues - Pending Items.md #15 (forward pattern for new createMarkdownProcessor sites)
---

# Authoring a new glossary term

The minimum-friction workflow for adding a term to `glossary/` and confirming it auto-links across the site.

This doc is the single source of truth for the workflow. The design contract lives at `docs/design/project-design.md` §S.14 — refer there for *why* each rule exists.

## TL;DR

1. Drop a `glossary/<slug>.md` with full frontmatter (10 base keys + `tldr` + `aliases`).
2. Run `node scripts/sync-doc-counts.mjs`.
3. Restart the dev server (the remark plugin loads the glossary index once at startup).
4. `cd site && npm run build` + grep `dist/**/*.html` for `data-glossary-slug="<slug>"`.

## Step 1 — Author the file

Path: `glossary/<slug>.md`. Slug must be **kebab-case, lowercase**, matches the filename, becomes the URL anchor (`/glossary/#<slug>`), and is the canonical matcher key.

Template:

```yaml
---
type: glossary
title: Your Term Name              # human-readable, sentence case
audience: beginner                 # beginner | advanced | both
topics: [foundations, claude-code] # 1-4 strings — used by filters and search
internal: false                    # always false for public hub content
authored: "2026-05-25"             # ISO date (YYYY-MM-DD), quoted
last_reviewed: "2026-05-25"        # same as authored on first write
external_link: null                # URL or null
deeper_link: null                  # URL or null
ai_summary: |
  Two or three sentences for the AI-summary surface, the catalog card,
  and any future search ranking. Self-contained, no markdown.
tldr: One sentence, ≤160 chars, plain text. This is what shows in the hover popup.
aliases: ["plural", "alt spelling"]
---

# Body in project tone — markdown.

Same shape as the existing entries. Plainspoken, opinionated, no marketing voice.
Assume a smart colleague new to Claude Code. One to three paragraphs, plus an
optional bullet list or table. Final paragraph can link to a deeper external
resource if one exists.
```

### Hard rules (Zod will reject otherwise)

- `tldr` length **≤ 160 chars** including spaces, **plain text only** — no backticks, no asterisks, no `[links](…)`, no HTML.
- `tldr` is **required** — no fallback. A missing or empty `tldr` fails `npm run build` with a clear Zod error.
- `aliases` is an **array of non-empty strings** (`z.string().min(1)`). Empty array `[]` is fine; empty-string elements are rejected.
- All 10 base keys (`type`, `title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`) must be present.
- Body must not be empty — at least one paragraph after the closing `---`.

## Step 2 — Choose aliases carefully

The plugin matches **case-insensitively with word-boundary awareness**. So:

| Slug case in `glossary/` | What auto-matches without an alias | What needs an explicit alias |
|---|---|---|
| `cli` | "CLI", "cli", "Cli", "CLI?" (boundary chars allowed on either side) | "command-line interface" — different spelling entirely |
| `agent` | "Agent", "AGENT" | "agents" — plural is a different token |
| `claude-code` | "claude-code" (hyphenated form) | **"Claude Code"** (spaced form is a different token; very common in prose) |
| `mcp` | "MCP", "mcp", "Mcp" | "Model Context Protocol" if you want it to link |
| `large-language-model` | "large-language-model" | "LLM", "LLMs" — virtually no one writes the hyphenated form in prose |

Examples from the locked alias contract (consult these for style):

- `pull-request` → `["PR", "PRs", "pull request", "pull requests"]`
- `repository` → `["repo", "repos", "repositories"]`
- `hook` → `["hooks"]`
- `claudemd` → `["CLAUDE.md"]`
- `context-window` → `["context window", "context windows"]`

Word-boundary rule (verbatim from §S.14.3): boundaries are whitespace, ASCII punctuation excluding `-` and `'`, and start/end of string. Alphanumeric + underscore are NOT boundaries. So `cli` matches `the cli today` but NOT `click` or `cli2`. Hyphen IS a boundary, so `cli` would match `the-cli-thing` if that appeared.

## Step 3 — Sync the doc counts

```bash
node scripts/sync-doc-counts.mjs
```

This regenerates the `<!-- AUTO:counts -->` blocks in `CLAUDE.md` and `SCOPE.md`. CI fails the PR if the counts drift, so don't skip this.

## Step 4 — Restart the dev server

**Load-bearing step.** The remark plugin reads the entire `glossary/` directory **once** at plugin-factory time (build/dev startup). Mid-session file additions are NOT picked up by HMR — the plugin's in-memory index is built before HMR exists.

```bash
# In the terminal running `npm run dev`, hit Ctrl+C, then:
cd site && npm run dev -- --port 4321
```

(Same on production: every `npm run build` re-reads the directory.)

## Step 5 — Verify the term is auto-linking

Three checks, in increasing thoroughness:

### Eyeball
Open `http://localhost:4321/start-here/foundations/` (the densest reading surface — 33 buttons today). If your term appears in the foundations body, hover it. The popover should anchor at the term's bottom-right.

### Grep the built HTML
```bash
cd site && npm run build
grep -l 'data-glossary-slug="<your-slug>"' dist/**/*.html
```

Returns the list of pages that contain at least one button for your term. If empty: either no current page mentions the term in prose, or the term occurs only inside skipped contexts (code, headings, links, asides, the entry's own page, or `news/published/`).

### Inspect the manifest
On any page, View Source and search for `id="nbg-glossary-data"`. The inlined JSON should contain `"<your-slug>": {"title": "…", "tldr": "…"}`. If yes, the build is aware of the term; auto-linking only fails to fire if no page's prose contains a matching token.

## How auto-linking reaches every surface — two paths, one index

Two complementary code paths share **one** glossary index (built once at server start, memoised per absolute directory). Adding a term + restarting the dev server feeds both paths automatically.

| Path | Runs on | Mechanism |
|---|---|---|
| **Path A — `remark-glossary-link` plugin** | Markdown bodies rendered through Astro's markdown pipeline (`<Content />`) or an explicit `createMarkdownProcessor()` | The plugin walks mdast nodes and rewrites text nodes containing variant matches into raw `<button>` HTML triggers. Wired globally in `site/astro.config.mjs` (`markdown.remarkPlugins`) and re-wired manually in the three pages that segment markdown by hand (`glossary.astro`, `start-here/foundations.astro`, `start-here/day-1.astro`) per §S.14.5. |
| **Path B — `linkGlossaryTerms()` helper** | Plain frontmatter strings rendered directly in JSX (`ai_summary`, hero ledes, static prose) — anything that bypasses the markdown pipeline | `site/src/lib/glossary-link-string.ts` imports the plugin's named `getGlossaryIndex()` export and emits the **exact same** `<button class="nbg-glossary-trigger" data-glossary-slug>` HTML. Wired into `index.astro`, `skills.astro`, `tips.astro`, `contribute.astro`, plus the hero ledes / empty-state copy / cross-link cards on `start-here/foundations.astro` and `start-here/day-1.astro`. Use `<p set:html={linkGlossaryTerms(str)} />` or `<Fragment set:html={...} />` inside an existing element. |

Both paths share `getGlossaryIndex(glossaryDir)` (named export from the plugin file), which is memoised per absolute-resolved directory. **Single source of truth, single restart point.**

**Will auto-link on:**
- Journey pages (`/start-here/foundations/`, `/start-here/day-1/`) — segmented step bodies (Path A) + hero lede / cross-link cards / empty-state copy (Path B)
- Glossary catalog (`/glossary/`) — per-entry body via Path A with self-page skip preserved
- Catalog pages (`/skills/`, `/tips/`) — frontmatter `ai_summary` strings on each card + hero ledes (Path B)
- Homepage (`/`) — hero lede + both router-card bodies + skill / tip card summaries (Path B)
- `/contribute/` — featured-path summary + each card summary (Path B)
- Any future tip / skill per-slug page that uses `<Content />` from the project's markdown pipeline OR explicitly wires the plugin into a manual `createMarkdownProcessor()`

**Won't auto-link on:**
- `news/published/` — explicit `excludePaths` skip per the 2026-05-25 nav rework (news redirects externally)
- Code blocks, inline code, headings (h1–h6), existing markdown links, Starlight `:::tip` / `:::note` / `:::caution` / `:::danger` asides — always skipped by Path A's design (Path B operates on short plain strings where these contexts don't arise)
- The term's own glossary page — the `agent` entry's body won't link "agent" to itself (`§S.14.7` self-page skip)
- The **same term repeated** in the same markdown unit / same helper call — only the **first occurrence** wraps; subsequent mentions are plain text by design (matches Wikipedia convention; prevents visual noise)

## Adding a new term — does it really show up everywhere?

Yes, provided you restart the dev server. Concretely, when you drop `glossary/<slug>.md`:

1. The plugin's factory re-reads `glossary/` at next dev-server startup → Path A picks up the new term on every markdown body
2. `linkGlossaryTerms()`'s memoised cache is cleared too (process-scoped) → Path B picks up the new term on every frontmatter / static prose string it's wired to
3. The auto-link styling + tooltip behavior is identical because both paths emit the same `<button data-glossary-slug>` HTML

If you author a new content surface (e.g. a new page that renders frontmatter strings in JSX) and the term doesn't link there, that surface hasn't been wired into Path B yet — add `import { linkGlossaryTerms } from '../lib/glossary-link-string';` and wrap each plain string with `<p set:html={linkGlossaryTerms(str)} />`.

## Common pitfalls

| Symptom | Most likely cause | Fix |
|---|---|---|
| Build fails with Zod error citing your file | Missing or oversize `tldr`, missing required key | Read the error message — Zod names the offending field |
| Term added but doesn't link anywhere | You didn't restart the dev server | Ctrl+C and `npm run dev` again |
| Term doesn't link on a specific new page | That page uses `createMarkdownProcessor()` and was added after this feature shipped | Pass the plugin explicitly into that processor — see `Issues - Pending Items.md` #15 + `§S.14.5` "Implementation discovery" |
| "agents" doesn't link but "agent" does | You forgot to add "agents" to the alias list on `agent.md` | Add `aliases: ["agents"]` to the entry |
| Term links but to the wrong slug | Alias conflict — two entries claim the same alias | Plugin warns on conflict and alphabetically-first-wins. Pick which entry should own the alias and remove from the loser |
| `npm run check` fails after a content change | Schema rejection (most likely `tldr` ≤160 violation) OR a YAML parse error | Re-read frontmatter syntax — `tldr` and `aliases` go between `---` markers; arrays use `["a", "b"]` inline form |

## The "Claude says it, Claude writes it" workflow

If you're working with a Claude session and want it to add the term for you:

1. Say "add a glossary term for X" (one or two sentences of intent if X is ambiguous).
2. Claude drafts the frontmatter + body in project tone.
3. Claude writes `glossary/<slug>.md`.
4. Claude runs `node scripts/sync-doc-counts.mjs`.
5. Claude restarts the dev server (kill the running background server and start a new one on port 4321 per the CLAUDE.md ports rule).
6. Claude runs `npm run build` and greps `dist/**/*.html` for the new slug — reports back which pages now carry the new button.

Default preference is **just write** (read the diff, ask for revision). Optionally ask Claude to "show the draft first" before writing.

## Where this workflow can break long-term

- If anyone adds a third dev-server-restart-required dependency (e.g. an audit cache, a precomputed search index) on top of the glossary index, the "restart to refresh" rule becomes harder to remember. Document any such addition here.
- If the `tldr` cap moves above 160 chars, update §S.14.1, the schema, this doc, and the existing 28 entries that may want to grow.
- If Astro 6 or a future version changes how content-collection `render(entry)` interacts with `markdown.remarkPlugins`, the per-page wiring sites in `§S.14.5` may be retirable. Re-test on every Astro major upgrade.

## Related docs

- `docs/archive/design/project-design.md` §S.14 — full design contract (10 subsections)
- `docs/archive/design/plan-006-glossary-tooltips.md` — phased plan + AC coverage table
- `docs/archive/refined-requests/glossary-tooltips.md` — 31 acceptance criteria
- `docs/archive/reference/integration-verification-glossary-tooltips.md` — visual verification + screenshots
- `docs/archive/reference/code-review-glossary-tooltips.md` — Phase 7 PASS verdict + the IM-1/IM-2 finding history
- `docs/archive/reference/glossary-audit-2026-05-25.md` — sample output of the candidate-jargon audit
- `DECISIONS.md` 2026-05-25 — the glossary-tooltips decision entry + post-review follow-ons
- `Issues - Pending Items.md` #15 — forward pattern for adding new `createMarkdownProcessor` wiring sites
