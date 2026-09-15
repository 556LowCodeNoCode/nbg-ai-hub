---
type: tip
title: Write CLAUDE.md rules for the agent, not for a human
audience: beginner
topics: [context]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: >-
  A rule like 'keep the database code organised sensibly' means nothing to Claude;
  'all SQL lives in database/' is actionable. The difference between a CLAUDE.md that
  works and one that gets ignored is almost always specificity — plus pruning the
  rules that have quietly gone stale.
---

Most CLAUDE.md files are written the way you'd brief a colleague. Colleagues fill in the gaps from experience. Claude fills them in from guesswork.

| Written for a human | Written for the agent |
|---|---|
| "Keep the database code organised sensibly" | "All SQL lives in `database/`. One file per table." |
| "Follow our naming conventions" | "Table names are singular: `Customer`, not `Customers`." |
| "Write reasonable tests" | "Every new function in `src/` gets a test in `tests/` with the same filename." |
| "Don't break the build" | "Run `npm run build` before telling me you're done." |

Every left-hand entry sounds like a rule and does nothing. Every right-hand entry can be checked — which is exactly what makes it followable.

The test: **could someone who has never seen your project tell whether the rule was obeyed?** If not, it isn't a rule yet, it's a sentiment.

## Rules go stale, and stale rules are worse than none

Codebases move. The folder gets renamed, the library gets replaced, the convention changes — and the CLAUDE.md line describing the old world stays exactly where it was, being read with total confidence at the start of every session.

This is a common and quiet cause of "why is Claude doing that?". It's doing what your file told it, and your file is describing a project that no longer exists.

Re-read the file every so often. Or don't, and ask instead:

> Read `CLAUDE.md` and check each rule against the actual codebase. Which rules refer to files, folders, or tools that don't exist any more?

That's a two-minute job for Claude and a genuinely tedious one for you.

## The deletion test

For every paragraph, ask: **if I deleted this, would Claude behave differently?**

If the answer is no, it's costing you tokens and attention for nothing. Out. This catches the generic material that accumulates in every CLAUDE.md — explanations of what good code looks like, general principles, notes on how to write a commit message. Claude already knows all of that. Your file is for what's true about *your* project and nowhere else.

A short, specific, current file beats a long, thoughtful, half-stale one. See the project-hygiene tip for the rest of the picture.
