# NbgAiHub — Project instructions

A curated Claude Code knowledge hub for bank colleagues, framed around *"what I wish I knew a year ago."* Skills catalog, tips & tricks, curated news, onboarding journeys, glossary — accessible both as a web UI (host TBD) and as a `/hub-*` skill inside Claude Code.

**Repo:** `github.com/chomovazuzana/NbgAiHub` (**private**, personal account, bootstrap mode).
**Constraint:** repo lives on a personal account — bank-confidential content should go through compliance review before being stored here, even though the repo is not world-readable.

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
│   └── rss-sources.json       ← data-driven feed list (currently 5: 2 Reddit + HN + Wired + Verge)
├── news/
│   ├── incoming/              ← Action writes triaged items here, PR opens for review
│   └── published/             ← editor moves approved items here (permanent archive)
├── glossary/                  ← 5 seeded terms (claudemd, mcp, skill, plugin, agent)
├── skills/                    ← .gitkeep — catalog content TBD
├── tips/                      ← .gitkeep — content TBD
├── journeys/                  ← day-1.md placeholder (6-step content TBD)
├── pipeline/                  ← TypeScript workspace for the RSS Action
│   ├── package.json           ← Node 22, ESM, vitest 4.x, @rowanmanning/feed-parser
│   ├── src/                   ← 15 modules: env, azure-client, fetch, parse, dedup,
│   │                            triage, slug, frontmatter, write, pr, etc.
│   └── tests/                 ← 14 test files, 93 tests (after editor_confidence tightening)
├── site/                      ← Astro 6 + Starlight 0.39 web UI workspace
│   ├── package.json           ← Node 22, ESM, astro ^6, @astrojs/starlight ^0.39
│   ├── astro.config.mjs       ← sidebar 9 entries, dev port 4321
│   ├── src/content.config.ts  ← 5 content collections via Astro 5 glob() loader
│   ├── src/components/        ← 7 .astro components (Hero, NewsPanel, NewsList,
│   │                            AudienceBadge, SkillCard, AudienceFilter, ConfidenceChip)
│   ├── src/pages/             ← /news, /skills, /tips, /glossary, /reference,
│   │                            /contribute, /start-here/day-1, /start-here/week-1
│   └── src/content/docs/      ← index.mdx (homepage, template:splash)
├── .github/workflows/
│   └── rss-triage.yml         ← daily cron 05:00 UTC = 08:00 Athens (DST) + workflow_dispatch
└── docs/
    ├── design/                ← project-design.md (§1-S.12), plan-001 (RSS), plan-002 (site)
    ├── reference/             ← code-review, dep-validation, integration-verification (RSS + site),
    │                            codebase-scans, investigations
    └── refined-requests/      ← refined specs (rss-pipeline.md, astro-starlight-site.md)
```

## Working rules for this project

- **Before any architectural discussion or scope change**, re-read SCOPE.md and check DECISIONS.md for prior calls on the topic.
- **When we converge on a decision**, append a new dated entry to DECISIONS.md. Never edit prior entries — supersede with a new entry instead.
- **When scope changes**, update SCOPE.md (the relevant section + bump *Last updated*) in the same edit.
- **Tone for all content authored under this project:** *"what I wish I knew a year ago"* — opinionated, plainspoken, no AI-slop hedging, no marketing voice. Assume the reader is a smart colleague new to Claude Code.

## Naming

Final name: **NbgAiHub**. Repo: `github.com/chomovazuzana/NbgAiHub`.

## Ports

- **Astro Starlight dev server: `4321`** (in use — `cd site && npm run dev`). Fallback band 4322–4329 per global port rules.
- No other dev servers planned for MVP.

## Project tools

Per global CLAUDE.md `docs/tools/<name>.md` convention — reusable TypeScript capabilities documented for future invocation:

- **`skill-validator`** — CI validator enforcing the 17-rule skill frontmatter contract on `skills/**/*.md` PRs. Source: `pipeline/src/validators/{skill,cli,config}.ts`. Doc: `docs/tools/skill-validator.md`.
