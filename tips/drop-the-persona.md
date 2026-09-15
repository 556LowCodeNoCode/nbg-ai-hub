---
type: tip
title: Drop the persona — "You are a senior engineer…" adds nothing
audience: beginner
topics: [prompting]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Role-play preambles were useful for older, weaker models and are now dead weight. Replace the persona with three things that actually help — where to look, what "done" means, and how Claude should check itself.
---

Most prompt templates you'll find online open like this:

> You are a world-class senior software engineer with 20 years of experience in enterprise banking systems. You are meticulous, detail-oriented and never make mistakes.

Delete all of it. It does nothing.

Persona preambles were a genuine technique when models were weaker and needed to be steered into a register. Current models don't need telling they're competent — and the words cost you tokens and attention that could carry real instruction.

## What to write instead

Three things do the work the persona was pretending to do:

1. **Where to look.** Point at the files, folders, or documents that matter. This is the single biggest quality lever in any prompt.
2. **What "done" looks like.** Length, format, scope. Without it you'll get four pages when you wanted four bullets.
3. **How to check itself.** "Then verify each figure against the source and show me the check."

Bad:

> You are an expert financial analyst. Analyse our complaints data and give me your professional assessment.

Good:

> Read `complaints-q3.csv`. Group the complaints by product line and tell me which three moved most versus Q2 in `complaints-q2.csv`. Under 200 words, one table. Then recompute the totals from the raw rows and show me they match.

The second one is longer, but every extra word is doing something. The first is longer than it looks and none of it is.

## The one exception

Telling Claude about **your** context is not a persona and is genuinely useful:

> I'm a business analyst, not a developer — explain anything technical in plain terms.

That's information it doesn't have. "You are a brilliant engineer" is information it doesn't need.
