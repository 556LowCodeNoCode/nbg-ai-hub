---
type: tip
title: What a real CLAUDE.md looks like (worked example)
audience: beginner
topics: [context, fundamentals]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-06-02"
external_link: null
deeper_link: https://code.claude.com/docs/en/best-practices
ai_summary: A worked example of a project-level CLAUDE.md, distilled from Anthropic's official guidance, Karpathy's viral behavioral rules, HumanLayer's "under 60 lines" guide, and the awesome-claude-md curated index. Each section is annotated with why it earns its slot.
---

`CLAUDE.md` is the first file Claude reads at the start of every session. Think of it as the briefing you'd give a smart colleague who joined the project this morning — what the project is, the conventions that matter, the rules that are non-obvious from the code. Keep it short. Anthropic's own example is a dozen lines; HumanLayer keep their root file under sixty. Past that, important rules start getting filtered out and the document stops being load-bearing.

Here's a real (lightly fictionalised) example from a small internal API project — upgraded from the bare minimum to something genuinely load-bearing:

```markdown
# project: customer-segments-api

A small Node 22 + TypeScript service that scores retail customers by
spending pattern. Backed by Postgres. Lives behind the internal API
gateway — never exposed to the public internet.

## How this project runs

- `npm run dev` — local dev server on port 3010
- `npm test` — vitest, all suites
- `npm run lint` — eslint + prettier, fixes most things automatically
- **Before you say "done", run `npm test && npm run lint` and paste the
  output. Don't claim success on a green build you didn't run.**

## Conventions that aren't obvious from the code

- Customer IDs (`cust_*`) are PII. **Never log them in plain text.**
  Use `redactCustId()` from `src/lib/log.ts`.
- All money values are integer minor units (cents/lepta), never float.
- Database tables are singular (`Customer`, not `Customers`).
  Plural is reserved for join tables (`CustomerTransactions`).
- Migrations in `db/migrations/` are additive only.
  **Never edit a migration after it has been applied to staging.**

## Where things live

- API routes: `src/routes/`
- Business logic: `src/services/`
- Postgres queries: `src/db/` (one file per table)
- Tests: alongside the source as `*.test.ts`

## How to work on this project

- State your plan in one or two sentences before editing. If you're
  unsure between two approaches, ask — don't pick silently.
- Touch only what the task requires. Don't refactor adjacent code
  "while you're in there".
- Match the existing style of the file you're in, not your own preferences.

See @README.md for product context. Personal overrides live in
@CLAUDE.local.md (gitignored).
```

That's it — about forty lines. The art isn't what you add, it's what you cut.

## What's in there, and why

**The one-paragraph opener.** Names the stack, the boundary, and the trust posture in three sentences. Without it Claude defaults to generic Node patterns and won't know "internal-only" is a hard constraint. (Anthropic's guidance: include "architectural decisions specific to your project"; exclude long history.)

**The commands block.** Anthropic's own include-list opens with *"Bash commands Claude can't guess"* — port numbers, the actual test runner, the lint command. The line about pasting verification output before declaring done is the Karpathy "goal-driven execution" rule compressed to one sentence: define a check, loop until it passes, show the evidence.

**The conventions block.** Four rules, all of them things a smart new engineer would never guess and would get wrong every time without being told: a PII rule (Claude can't infer that `cust_*` is sensitive), a money-representation rule, the singular-table convention, and a negative rule on migrations. The community consensus is that **negative rules carry more weight than positive ones** — without them Claude picks the most common pattern it knows, which probably isn't yours.

**The "where things live" map.** HumanLayer's *WHAT* category: a map of the codebase so Claude doesn't have to grep around to find where a new route belongs. Saves three turns per session, every session.

**The behavioural section.** The compressed essence of Karpathy's viral four-rule file: think before coding, surgical changes, match existing style. The full Karpathy file is excellent — you can append it under a `## Behavioural guidelines` header if you want more. We kept three lines instead of forty so the document stays scannable.

**The `@` imports at the bottom.** Anthropic's progressive-disclosure pattern: `@README.md` loads the README contents only when relevant; `@CLAUDE.local.md` is the gitignored slot for personal preferences that shouldn't pollute the team's shared file.

## What's deliberately *not* in this file

The project's history. The architecture diagram. Prose about why we chose Postgres. The full README. Anthropic's own guidance is explicit: "If Claude already does something correctly without the instruction, delete it or convert it to a hook." When in doubt, ask: *would removing this line cause Claude to make a mistake?* If not, drop it.

## Sources

The five sources this example is distilled from — worth reading if you want to go deeper:

- [Anthropic — Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) — the official include/exclude table for CLAUDE.md.
- [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) — the viral four-rule behavioural file (110k+ stars), distilled from Karpathy's public observations on agentic coding.
- [HumanLayer — Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — the WHAT / WHY / HOW framework and the "under sixty lines" argument.
- [josix/awesome-claude-md](https://github.com/josix/awesome-claude-md) — curated collection of real-world CLAUDE.md files from public projects, with analyses of what each one does well.
- [dev.to — CLAUDE.md best practices, from basic to adaptive](https://dev.to/cleverhoods/claudemd-best-practices-from-basic-to-adaptive-9lm) — the L0–L5 maturity framework for thinking about where your file currently sits and where it might want to go.
