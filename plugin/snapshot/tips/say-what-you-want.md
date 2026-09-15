---
type: tip
title: Say what you want, not what you don't — and stop shouting
audience: beginner
topics: [prompting]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Two phrasing habits that quietly damage prompts — framing instructions as prohibitions ("do NOT use tables") and emphatic shouting ("CRITICAL - you must ALWAYS"). Both work less well than plainly describing the outcome you want.
---

Two small phrasing habits, both natural, both counterproductive.

## 1. Describe the target, not the ban

Negative instructions make Claude think about the thing you're trying to avoid, and leave it guessing at what you actually wanted. Positive framing names the destination.

| Instead of | Write |
|---|---|
| "Do NOT use markdown tables" | "Write it as flowing paragraphs" |
| "Don't be verbose" | "Keep it under 150 words" |
| "Never touch the database files" | "Only edit files under `src/ui/`" |
| "Don't just summarise the meeting" | "List the decisions made and who owns each one" |

Notice what happens in each rewrite: the prohibition was vague about the goal, and the positive version is specific about it. That's not a coincidence — writing the positive form *forces* you to decide what you want, which is usually the real work.

Prohibitions still have their place for genuine hard limits ("don't push to main"). Just don't let them do the job of describing the outcome.

## 2. Stop shouting

This pattern is everywhere:

> **CRITICAL:** You MUST ALWAYS check the schema first. NEVER skip this step. This is EXTREMELY IMPORTANT.

Caps and emphatic words are cheap to type, so they spread across a prompt until everything is critical — and when everything is critical, nothing is. They also make the tone anxious in a way that doesn't help the output.

Plain instruction does the same job:

> Check the schema before writing the query.

If something genuinely is a hard constraint, say so once, plainly, and say *why*:

> Don't run anything against production — this connection string points at live customer data.

The reason does more work than the capitals. "Never do X" is a rule to be weighed against other rules. "Don't do X because it touches live customer data" is a reason that survives contact with a situation you didn't anticipate.
