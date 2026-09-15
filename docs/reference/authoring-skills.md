---
doc: authoring-skills
audience: project contributors + Claude sessions
last_updated: 2026-09-15
related:
  - skills/ (the pillar this guide governs)
  - site/src/content.config.ts (the 17-key schema — shape validation)
  - pipeline/src/validators/skill.ts (CI validator — semantic rules)
  - docs/tools/skill-validator.md
  - docs/reference/authoring-tips.md (sister guide, same beginner test)
---

# Authoring a new skill entry

The standing rule for adding an entry under `skills/`. Written 2026-09-15, when the pillar went from 6 internal entries to 15 and started cataloguing skills we don't maintain.

## What a skill entry is — and isn't

**It is a decision page.** The reader is asking one question: *should I install this?* Everything on the page serves that question — what it does, when to reach for it, what it costs, what surprises you after you install it.

**It is not the skill's manual.** The upstream README is the manual, and it is better maintained than any copy we make. Link to it. Do not restate it.

If you find yourself documenting the skill's own options, stop — you are writing the wrong document.

## The beginner test

Same as [authoring a tip](./authoring-tips.md). After reading, can a colleague who installed Claude Code yesterday answer:

1. **What does this do?**
2. **When would I reach for it?** (`when_to_use` carries this, but the body should make it concrete)
3. **What do I type?** (the install block is generated from frontmatter — make sure the commands are right)

## Verify before you publish — non-negotiable

Skills are catalogued from write-ups, and write-ups are wrong at a rate that will embarrass you. In the 2026-09-15 sweep, roughly a quarter of source claims failed verification, including a repo attributed to an author who never published it.

**Open the actual repository. Read the actual `SKILL.md`.** Specifically:

| Claim | How to verify |
|---|---|
| The repo exists and is maintained | `gh api repos/<owner>/<repo> --jq '{stargazers_count,pushed_at,archived,license}'` |
| It installs as a plugin at all | It needs `.claude-plugin/marketplace.json`. No manifest, no `/plugin install` — and our schema has nowhere to put it |
| The exact install command | Read `marketplace.json` for the **marketplace** `name` and the **plugin** `name`. The command is `/plugin install <plugin>@<marketplace>` — and these two are frequently not the repo name |
| Whether a `marketplace_command` is needed at all | If the plugin is listed in `anthropics/claude-plugins-official`, it is **not** — that marketplace ships configured. Check with `claude plugin marketplace list` |
| What the skill actually does | Read the `description` in its `SKILL.md` frontmatter, not the blog post |
| Whether it's user- or model-invoked | `disable-model-invocation: true` in frontmatter means it is a slash command you type; without it, Claude fires it on its own |
| Licence | Check the repo licence **and** any `LICENSE.txt` inside the skill folder — they differ. Anthropic's document skills are source-available, not open source, while the rest of that repo is Apache-2.0 |
| Counts and version numbers | Don't publish them. Sources contradict each other and the skill ships new types between our reviews |

**If you cannot verify a claim, omit it.** Do not hedge it into the page. Log it in `Issues - Pending Items.md` instead.

## `origin` — what the three values mean here

The enum is frozen in `content.config.ts`; this is the agreed reading:

| Value | Means | Renders as |
|---|---|---|
| `internal` | Authored by the NBG AI team | *Built at NBG* (gold left border) |
| `external` | Published and maintained by **Anthropic** | *Official — from Anthropic* |
| `community` | Any other third party — an individual or an outside org | *From the community* |

The split between `external` and `community` is a trust signal, not a technicality: a bank colleague deciding whether to install something should be able to see at a glance whether the vendor of the tool wrote it or a stranger did.

**Every value must have a group in `site/src/pages/skills.astro`.** Before 2026-09-15 `external` had none, so any entry using it would have validated cleanly and then silently vanished from the listing page. If you add an enum value, add the group in the same commit.

## Frontmatter that trips people up

- **`install_command`** — must start with `/plugin marketplace add ` or `/plugin install `. Both the Zod schema and the CI validator enforce it.
- **`maintainer`** — must match `/^@[a-zA-Z0-9-]+$/` or be a team alias from `config/maintainers.json`. Accented characters fail; use the GitHub handle.
- **`when_to_use`** — 220 characters, and the listing page strips a leading "Use this when" before rendering, so write it to read naturally either way.
- **`worked_scenario`** — 600 characters. Make it a story with a *before*: "without the skill X happens, with it Y happens". An abstract capability statement wastes the field.
- **`time_saved`** — 60 characters, and it must be honest. "~30-60 min per document" is useful; "10x faster" is marketing.
- **`access_request`** — 800 characters of markdown, rendered as step 1 of the install block. It is the right home for a licence caveat.
- **`title`** — the detail page splits on ` — ` and renders the first segment as the "Use it" command with a `/` prefix. If the skill is model-invoked and has no slash command, say so explicitly in the body.

## Tone

Same as everywhere else in this repo: *what I wish I knew a year ago*. Opinionated, plainspoken, no marketing voice.

Two things that keep entries honest:

- **Say what it costs.** Slower, token-hungry, needs a setup step, writes files into your working directory — a beginner who hits an unmentioned cost stops trusting the catalog.
- **Cross-link, don't restate.** If a tip already covers the underlying idea, link it. `/handoff` links to the handoff tip rather than re-teaching the concept.

## After you add or remove an entry

```bash
node scripts/sync-doc-counts.mjs      # AUTO blocks in CLAUDE.md + SCOPE.md; CI fails without it
cd site && npm run build && npx vitest run
node plugin/scripts/build-snapshot.mjs && cd plugin && npx vitest run
```

Then append a DECISIONS.md entry and rewrite the SCOPE.md header paragraph.
