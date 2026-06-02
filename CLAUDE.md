# NbgAiHub — Project instructions

A curated Claude Code knowledge hub for bank colleagues, framed around *"what I wish I knew a year ago."* Skills catalog, tips & tricks, curated news, onboarding journeys, glossary — accessible both as a web UI (host TBD) and as a `/hub-*` skill inside Claude Code.

**Repo:** `github.com/556LowCodeNoCode/NbgAiHub` (**public**, 556LowCodeNoCode org).
**Constraint:** repo lives on GitHub.com under the 556LowCodeNoCode org (not on bank-managed infrastructure) — bank-confidential content should still go through compliance review before being stored here.

## Project state files

@SCOPE.md

- **SCOPE.md** — current MVP scope, deferred items, explicit out-of-scope, open questions. Mutable; always reflects current truth. Auto-imported above.
- **DECISIONS.md** — append-only decision log. Consult before re-opening a settled question.
- **Issues - Pending Items.md** — per global rules.
- **SECRETS.md** — required GitHub Action secrets + one-time repo setup. Used by operators, not Claude.

## Repo layout

```
.
├── CLAUDE.md                  ← (this file)
├── SCOPE.md                   ← mutable scope (auto-imported)
├── DECISIONS.md               ← append-only history
├── SECRETS.md                 ← operator setup checklist
├── Issues - Pending Items.md  ← per global rules
├── config/
│   ├── rss-sources.json       ← data-driven feed list (currently 5: 2 Reddit + HN + Wired + Verge)
│   └── maintainers.json       ← team_aliases allowlist consumed by the skill-validator tool
├── news/
│   ├── incoming/              ← Action writes triaged items here, PR opens for review
│   └── published/             ← editor moves approved items here (permanent archive)
├── glossary/                  ← terms catalog (count in AUTO block below); auto-linked across content via the remark-glossary-link plugin (see §S.14). Authoring: docs/reference/authoring-glossary-terms.md.
├── skills/                    ← entries cataloguing 556LowCodeNoCode/Skills marketplace (extended 17-key schema lives in site/src/content.config.ts)
├── tips/                      ← entries (prompting, control keys, context, compliance)
├── journeys/                  ← day-1.md (full 6-step walkthrough) + foundations.md (newcomer onboarding); week-1.md + by-role TBD
├── usecases/                  ← 12 beginner-friendly worked examples across 10 business units (Retail, Contact center, Compliance ×2, Mortgages, Operations, HR, Risk, Data, Accounting, Process improvement, Operations multilingual). Same `## Step N — Title` body shape as journeys/. Mac/Windows divergent commands wrapped in `<div data-os="mac">` / `<div data-os="windows">` blocks consumed by the OS toggle on the detail page. Per-OS visibility rules in `site/src/pages/use-cases/[slug].astro` MUST be wrapped in `:global()` because the divs come from `set:html` markdown content and don't carry the Astro scope hash.
├── pipeline/                  ← TypeScript workspace for the RSS Action + skill validator
│   ├── package.json           ← Node 22, ESM, vitest 4.x, @rowanmanning/feed-parser
│   ├── src/                   ← 15 RSS modules + src/validators/ (skill, cli, config)
│   │   └── validators/        ← skill-validator tool (see docs/tools/skill-validator.md)
│   └── tests/                 ← 15 test files, 112 tests (101 RSS + 11 validator)
├── site/                      ← Astro 6 + Starlight 0.39 web UI workspace
│   ├── package.json           ← Node 22, ESM, astro ^6, @astrojs/starlight ^0.39, vitest 4.x
│   ├── astro.config.mjs       ← sidebar 11 entries (My Pins + Submit a Skill added), SocialIcons override, dev port 4321
│   ├── vitest.config.ts       ← Vitest 4.x node-env, tests/**/*.test.ts pattern
│   ├── src/content.config.ts  ← 5 content collections; skills schema extended with 7 new fields
│   ├── src/components/        ← 12 .astro components — restyled 10 originals + new MarketingShell + new HomeStats
│   ├── src/components/primitives/  ← 16 portable primitives — Container, Section, Stack, Cluster, Grid, Split, Card, Button, Badge, Chip, Kbd, Eyebrow, Lede, Display, MotionReveal, StepIndicator (AC36 portability gate: zero @astrojs/starlight imports)
│   ├── src/styles/tokens/     ← design system — primitives.css (135 tokens), semantic.css (38 × 2 themes), aliases.css (16 --sl-color-* × 2 themes), layers.css (8-layer cascade), legacy.css (absorbed custom.css), index.css (aggregator)
│   ├── src/styles/            ← content-prose.css + content-chrome.css (Starlight chrome theme override) + motion.css (view-transitions + reduced-motion)
│   ├── src/scripts/           ← motion.ts (IntersectionObserver reveal utility — 50 LOC) + glossary-filter.ts
│   ├── src/lib/               ← 8 TS modules: news, slug, auth, api-fetch, gist, submission, skill-types, pin-store
│   ├── src/pages/             ← /news, /skills, /tips, /glossary, /reference,
│   │                            /contribute, /start-here/day-1, /start-here/week-1,
│   │                            /my-pins, /submit-skill (the personalization pages)
│   ├── src/content/docs/      ← index.mdx (homepage, template:splash)
│   ├── scripts/               ← build-pin-index.ts (pre-build step emitting public/_data/<type>-index.json)
│   ├── public/_data/          ← build-emitted JSON indices (5 files, one per content type)
│   ├── src/plugins/           ← remark-glossary-link.ts — build-time auto-linker for glossary terms (§S.14.3). Single-layer unified Plugin, plain HTML output, news-skip via excludePaths
│   └── tests/                 ← 19 test files, 320 tests (11 baseline + 8 added 2026-05-25 for glossary-tooltips: schema, component-portability, audit-no-mutation, plugin word-boundary, first-occurrence, skip-rules, news-skip, build-output snapshot)
├── plugin/                   ← Claude Code plugin workspace — eleven /hub-* commands
│   ├── package.json           ← Node 22, ESM, vitest 4.x, esbuild ^0.25 (deps: gray-matter, js-yaml, open)
│   ├── tsconfig.json          ← strict TS (mirror of pipeline/)
│   ├── esbuild.config.mjs     ← bundles src/<cmd>.ts → dist/<cmd>.mjs with packages: "external"
│   ├── config.json            ← URL config (devMode flag), search weights, refresh cache path
│   ├── .claude-plugin/        ← Claude Code spec dir
│   │   └── plugin.json        ← plugin manifest (name/description/author; NO commands array, NO version)
│   ├── commands/              ← 11 markdown command shells, filesystem-discovered by Claude Code
│   ├── src/                   ← 11 entry scripts (hub.ts, hub-search.ts, …) + lib/ (13 shared modules)
│   ├── snapshot/              ← bundled content snapshot (built by scripts/build-snapshot.mjs)
│   ├── scripts/build-snapshot.mjs ← mirrors repo's glossary/tips/skills/news/journeys into snapshot/
│   ├── dist/                  ← esbuild output (gitignored except .gitkeep)
│   └── tests/                 ← 13 test files, 130 tests (12 lib + manifest + e2e entry-script smoke)
├── .claude-plugin/            ← repo-root marketplace manifest for /plugin marketplace add 556LowCodeNoCode/NbgAiHub
│   └── marketplace.json       ← lists nbg-ai-hub with source: "./plugin"
├── .github/workflows/
│   ├── rss-triage.yml         ← daily cron 05:00 UTC = 08:00 Athens (DST) + workflow_dispatch
│   └── validate-skill-submission.yml ← PR-on-skills/**/*.md → CI validator → GH Actions annotations
└── docs/
    ├── design/                ← project-design.md (§1-S.12 + §P.1-P.13 personalization + §H.1-H.13 hub plugin), plan-001/002/003 (RSS / site / hub plugin)
    ├── reference/             ← code-review, dep-validation, integration-verification, test-build,
    │                            codebase-scans, investigations, gist-contract.md (incl. hub-plugin set)
    ├── refined-requests/      ← refined specs (rss-pipeline, astro-starlight-site, personalization-and-contributions, hub-plugin)
    └── tools/                 ← per-tool docs per global CLAUDE.md convention (skill-validator.md)
```

## Content counts (canonical — auto-synced)

<!-- AUTO:counts -->
| Pillar | Files |
|---|---|
| Glossary | 45 |
| Tips | 27 |
| Skills | 6 |
| Use Cases | 12 |
| Journeys | 2 |
| News (published) | 59 |
<!-- /AUTO:counts -->

The repo-layout tree above is *informational* — counts cited there may go briefly stale between content additions. The AUTO block here is the source of truth, regenerated by `node scripts/sync-doc-counts.mjs` and CI-enforced by `.github/workflows/docs-drift.yml`.

## Working rules for this project

- **Before any architectural discussion or scope change**, re-read SCOPE.md and check DECISIONS.md for prior calls on the topic.
- **When we converge on a decision**, append a new dated entry to DECISIONS.md. Never edit prior entries — supersede with a new entry instead.
- **When scope changes**, update SCOPE.md (the relevant section + rewrite *Last updated* — see Doc hygiene below) in the same edit.
- **When you add/remove content** in `glossary/`, `tips/`, `skills/`, `journeys/`, or `news/published/`: run `node scripts/sync-doc-counts.mjs` before committing. CI will fail the PR if you forget.
- **Doc-drift guard is enforced by a Stop hook** at `.claude/settings.local.json`. At the end of each Claude turn, it runs `git diff --name-only HEAD`; if any source/config file changed but none of `DECISIONS.md` / `SCOPE.md` / `Issues - Pending Items.md` changed, it emits a UI warning. Silent when there's nothing to flag. Per-developer override (gitignored). Run `/hooks` to inspect, edit, or disable.
- **Tone for all content authored under this project:** *"what I wish I knew a year ago"* — opinionated, plainspoken, no AI-slop hedging, no marketing voice. Assume the reader is a smart colleague new to Claude Code.
- **When authoring or editing a tip** (`tips/*.md`): apply the beginner test from `docs/reference/authoring-tips.md` — *what is it / when do I reach for it / what do I do next*. For any tip that touches config or syntax (hooks, slash commands, subagents, settings.json, CLI installs), include an "ask Claude to do it for you" cue alongside the worked snippet. Reviewers must ask "does a beginner know what to do after reading this?" before merging.

## Doc hygiene — keep state files short

These four files (`SCOPE.md`, `DECISIONS.md`, `Issues - Pending Items.md`, `CLAUDE.md`) load into every Claude session. Bloat hurts performance — Claude Code warns past ~40k chars per file. Treat each entry like a commit message, not a journal.

- **SCOPE.md** — *snapshot of current truth, not history.* Each session: **rewrite** the `**Last updated:**` line; never append "Prior 2026-MM-DD (…)" blocks. Past sessions live in DECISIONS.md. Target the whole file ≤20k chars.
- **DECISIONS.md** — *append-only, but tight.* Each entry: dated header + 1-line trigger + bulleted decisions (one line each) + 1-line why + 1-line references (commits / docs / Issues). **No** file-by-file diff narratives, **no** verification screenshots transcribed as prose, **no** "Open items" (those go in Issues). If an entry would naturally be longer, link out to `docs/design/` or `docs/reference/`. Target ≤20 lines per entry.
- **Issues - Pending Items.md** — *terse triage list, not analysis docs.* Each item: 1-line problem + 1-line cause + 1-line forward fix (3-4 lines max). Long-form post-mortems go to `docs/reference/`. Completed items collapse to a one-line archive section at the bottom.
- **CLAUDE.md** — *wiring + standing rules only.* If any section grows past ~5 lines, extract to a doc and link.

**When you find yourself wanting to write a multi-paragraph entry,** stop. Write the file-by-file detail into `docs/reference/<topic>-2026-MM-DD.md` and link to it from a 5-line DECISIONS entry. The audit trail lives in git + linked docs, not inline.

**Periodic audit:** operator runs `/audit-state-docs` (`.claude/commands/audit-state-docs.md`) to scan all four files for size, AUTO-block drift, dead refs, stale Issues, and oversized DECISIONS entries — reports findings, applies fixes after confirmation. Run weekly, before sharing the repo, or after a heavy session.

## Naming

Final name: **NbgAiHub**. Repo: `github.com/556LowCodeNoCode/NbgAiHub`.

## Ports

- **Astro Starlight dev server: `4321`** (in use — `cd site && npm run dev`). Fallback band 4322–4329 per global port rules.
- No other dev servers planned for MVP. The plugin's `/hub-open` *probes* localhost:4321 (no server of its own) when `devMode: true`.

## Project tools

Per global CLAUDE.md `docs/tools/<name>.md` convention — reusable TypeScript capabilities documented for future invocation:

- **`skill-validator`** — CI validator enforcing the 17-rule skill frontmatter contract on `skills/**/*.md` PRs. Source: `pipeline/src/validators/{skill,cli,config}.ts`. Doc: `docs/tools/skill-validator.md`.

## Design system

Per docs/design/project-design.md §S.13 — the UI redesign that landed 2026-05-19. Three-tier token system (~245 declarations), 16 portable primitives under `site/src/components/primitives/`, single `MarketingShell.astro` wrapping splash-template pages, deep theme override for content detail pages via `--sl-color-*` aliases. Aesthetic anchor: Linear / Vercel / Stripe. See plan-004-ui-redesign.md for the phased breakdown and §S.13 for the full token + component contract.

## Starlight cascade gotcha — read before styling any prose page

Starlight (and `agentnews-layout.css`) ship CSS **unlayered** — their rules beat our `@layer nbg.components` rules in production, even though they "win" locally because Vite orders CSS differently in dev. Symptom: visual regressions appear only on the deployed Pages site (https://556lowcodenocode.github.io/NbgAiHub/). Default posture for new components: `!important` on every layout/spacing/typography property that must win, avoid the `.section` and `.wrap` class names (already claimed by agentnews with `!important` rules baked in). Full incident log + fix pattern: `docs/reference/starlight-cascade-gotcha.md`.

## Glossary auto-link + tooltips

Per docs/design/project-design.md §S.14 — landed 2026-05-25. Build-time remark plugin (`site/src/plugins/remark-glossary-link.ts`) walks every markdown AST and wraps the first occurrence of each glossary term (or alias) with a `<button data-glossary-slug="…">` HTML node. A single `<GlossaryTerm />` primitive injected by `MarketingShell.astro` inlines the JSON manifest + a small client-side wiring script that hydrates each button into an HTML `popover` (hover, focus, click, ESC; anchored at the trigger's bottom-right with viewport-edge clamping). 17th primitive (joins the 16 existing). Schema extension: required `tldr` (≤160, plain text) + optional `aliases` (default `[]`). Three pages explicitly wire the plugin into `createMarkdownProcessor()` because Astro's content-collection `render()` path bypasses the project `markdown.remarkPlugins`: `site/src/pages/start-here/foundations.astro`, `start-here/day-1.astro`, `glossary.astro`. **To author a new term, follow `docs/reference/authoring-glossary-terms.md`.**
